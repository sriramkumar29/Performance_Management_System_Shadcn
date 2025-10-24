"""
Simple email utility using smtplib. Respects settings.EMAIL_ENABLED and will not raise on failures.
"""
from __future__ import annotations
import smtplib
import ssl
from email.message import EmailMessage
import logging
from typing import Optional
from app.core.config import settings
from app.utils.logger import build_log_context
from concurrent.futures import ThreadPoolExecutor
try:
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    _jinja_available = True
except Exception:
    _jinja_available = False

import asyncio
from typing import Dict
from datetime import datetime
from app.utils.sendgrid_api import send_via_sendgrid_api

logger = logging.getLogger(__name__)

# Jinja2 environment for rendering HTML templates
if _jinja_available:
    env = Environment(
        loader=FileSystemLoader(searchpath="app/templates"),
        autoescape=select_autoescape(["html", "xml"])
    )
else:
    env = None

# Small thread pool for blocking SMTP sends
_executor = ThreadPoolExecutor(max_workers=2)


def send_email_sync(subject: str, body: str, to: str, from_addr: Optional[str] = None) -> bool:
    """Send an email synchronously using smtplib. Returns True on success, False otherwise.

    This function is intentionally forgiving: it logs errors but does not raise to avoid
    breaking business flows (e.g., appraisal creation) if email fails.
    """
    context = build_log_context()

    if not settings.EMAIL_ENABLED:
        logger.info(f"{context}EMAIL_SKIPPED: Email system disabled in settings (to={to})")
        return False

    from_addr = from_addr or settings.EMAIL_FROM

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    msg.set_content(body)

    try:
        if settings.SMTP_USE_TLS:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)

        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)

        server.send_message(msg)
        server.quit()
        logger.info(f"{context}EMAIL_SENT: Email sent to {to} (subject={subject})")
        return True

    except Exception as e:
        logger.error(f"{context}EMAIL_ERROR: Failed to send email to {to} - {str(e)}")
        return False


def render_template(template_name: str, context: Dict) -> str:
    """Render an HTML template from the templates folder."""
    if _jinja_available and env is not None:
        template = env.get_template(template_name)
        # Provide a callable `now` so templates can use `now().year` safely
        merged = dict(context or {})
        if "now" not in merged:
            merged["now"] = datetime.utcnow
        return template.render(**merged)
    # Fallback: simple manual HTML rendering
    name = context.get('appraisee_name', '')
    appraisal_id = context.get('appraisal_id', '')
    start_date = context.get('start_date', '')
    end_date = context.get('end_date', '')
    appraisal_url = context.get('appraisal_url', '')
    html = f"""
    <html><body>
      <p>Hello {name},</p>
      <p>An appraisal has been created for you:</p>
      <ul>
        <li><strong>Appraisal ID:</strong> {appraisal_id}</li>
        <li><strong>Start Date:</strong> {start_date}</li>
        <li><strong>End Date:</strong> {end_date}</li>
      </ul>
      {f'<p><a href="{appraisal_url}">View Appraisal</a></p>' if appraisal_url else ''}
      <p>Regards,<br/>Performance Management System</p>
    </body></html>
    """
    return html


def _blocking_send(subject: str, html_body: str, to: str, from_addr: Optional[str]) -> bool:
    """Blocking helper to send HTML email (used inside thread executor)."""
    # Build message with both plain and html
    text = """An HTML email was sent. Please view in an HTML-capable client."""
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr or settings.EMAIL_FROM
    msg["To"] = to
    msg.set_content(text)
    msg.add_alternative(html_body, subtype="html")

    # Use configured timeout
    timeout = getattr(settings, "SMTP_TIMEOUT", 20)
    try:
        # Try STARTTLS path first (common: port 587)
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=timeout)
        # optional SMTP protocol debug
        if getattr(settings, "EMAIL_SMTP_DEBUG", False):
            server.set_debuglevel(1)

        # EHLO before STARTTLS
        try:
            server.ehlo()
        except Exception:
            # not fatal, proceed
            pass

        if settings.SMTP_USE_TLS:
            ctx = ssl.create_default_context()
            server.starttls(context=ctx)
            try:
                server.ehlo()
            except Exception:
                pass

        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)

        server.send_message(msg)
        server.quit()
        logger.info(f"EMAIL_SENT: HTML email sent to {to} (subject={subject})")
        return True

    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"EMAIL_ERROR: Authentication failed sending HTML email to {to} - {e.__class__.__name__}: {e}")
        return False

    except smtplib.SMTPServerDisconnected as e:
        # try implicit SSL as a fallback (port 465)
        logger.warning(f"EMAIL_WARN: Server disconnected during STARTTLS/auth for {to}, attempting SMTP_SSL fallback - {e}")
        try:
            ssl_ctx = ssl.create_default_context()
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, 465, timeout=timeout, context=ssl_ctx)
            if getattr(settings, "EMAIL_SMTP_DEBUG", False):
                server.set_debuglevel(1)
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            logger.info(f"EMAIL_SENT: HTML email sent via SMTP_SSL to {to} (subject={subject})")
            return True
        except Exception as e2:
            logger.error(f"EMAIL_ERROR: SMTP_SSL fallback failed for {to} - {e2.__class__.__name__}: {e2}")
            # Try SendGrid Web API as a last resort (if configured)
            try:
                sent = send_via_sendgrid_api(subject, html_body, to, from_addr or settings.EMAIL_FROM)
                if sent:
                    return True
            except Exception as e3:
                logger.error(f"EMAIL_ERROR: SendGrid API fallback also failed for {to} - {e3.__class__.__name__}: {e3}")
            return False

    except Exception as e:
        logger.error(f"EMAIL_ERROR: Failed to send HTML email to {to} - {e.__class__.__name__}: {e}")
        # If this looks like a provider-level error, attempt SendGrid Web API fallback
        try:
            sent = send_via_sendgrid_api(subject, html_body, to, from_addr or settings.EMAIL_FROM)
            if sent:
                return True
        except Exception as e_api:
            logger.error(f"EMAIL_ERROR: SendGrid API fallback failed for {to} - {e_api.__class__.__name__}: {e_api}")
        return False


async def send_email_background(subject: str, template_name: str, context: Dict, to: str, from_addr: Optional[str] = None) -> None:
    """Asynchronously render and send an email using a thread executor so it doesn't block the event loop.

    This function schedules the blocking SMTP send in a thread pool. It logs outcomes but does not raise.
    """
    if not settings.EMAIL_ENABLED:
        logger.info(f"EMAIL_SKIPPED: Email system disabled in settings (to={to})")
        return

    html_body = render_template(template_name, context)

    loop = asyncio.get_running_loop()
    try:
        result = await loop.run_in_executor(_executor, _blocking_send, subject, html_body, to, from_addr or settings.EMAIL_FROM)
        if result:
            logger.info(f"EMAIL_BACKGROUND_SUCCESS: Email scheduled and sent to {to}")
        else:
            logger.warning(f"EMAIL_BACKGROUND_FAIL: Email scheduled but failed for {to}")

    except Exception as e:
        logger.error(f"EMAIL_BACKGROUND_ERROR: Unexpected failure sending email to {to} - {str(e)}")
