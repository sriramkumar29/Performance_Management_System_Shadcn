"""Small helper to send email via SendGrid Web API as a fallback when SMTP fails.

This module uses the SENDGRID API key stored in settings.SMTP_PASSWORD and a verified
from address in settings.EMAIL_FROM.
"""
from __future__ import annotations
import logging
from typing import Dict, Any
import requests
from app.core.config import settings

logger = logging.getLogger(__name__)


def send_via_sendgrid_api(subject: str, html_body: str, to: str, from_addr: str | None = None) -> bool:
    """Send a single recipient email via SendGrid Web API. Returns True on success.

    This function is forgiving (logs and returns False on failure) to avoid breaking app flows.
    """
    if not settings.EMAIL_ENABLED:
        logger.info("SENDGRID_API_SKIPPED: Email system disabled in settings")
        return False

    api_key = settings.SMTP_PASSWORD
    if not api_key:
        logger.warning("SENDGRID_API_MISSING_KEY: No API key available for SendGrid API send")
        return False

    payload: Dict[str, Any] = {
        "personalizations": [{"to": [{"email": to}], "subject": subject}],
        "from": {"email": from_addr or settings.EMAIL_FROM},
        "content": [{"type": "text/html", "value": html_body}]
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    try:
        resp = requests.post("https://api.sendgrid.com/v3/mail/send", json=payload, headers=headers, timeout=10)
        if 200 <= resp.status_code < 300:
            logger.info(f"SENDGRID_API_SENT: Email sent to {to} via Web API (status={resp.status_code})")
            return True
        else:
            logger.error(f"SENDGRID_API_ERROR: Failed to send to {to} via API - status={resp.status_code} body={resp.text}")
            return False
    except Exception as e:
        logger.error(f"SENDGRID_API_EXCEPTION: Exception sending to {to} via API - {e}")
        return False
