import sys
from pathlib import Path
import os
from email.message import EmailMessage

# Ensure backend package imports work
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))

# Load env
env_path = root / ".env.development"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip(); v = v.strip().strip('"').strip("'")
            if k not in os.environ:
                os.environ[k] = v

from app.core.config import settings
import smtplib, ssl

print("Using SMTP host:", settings.SMTP_HOST, "port:", settings.SMTP_PORT)

send_to = os.environ.get('TEST_RECIPIENT') or settings.EMAIL_FROM
subject = "Test email from Performance Management System"
body_text = "This is a test email sent by gmail_send_test.py"

msg = EmailMessage()
msg['Subject'] = subject
msg['From'] = settings.EMAIL_FROM
msg['To'] = send_to
msg.set_content(body_text)

try:
    timeout = getattr(settings, 'SMTP_TIMEOUT', 20)
    ctx = ssl.create_default_context()
    print('Connecting and starting TLS...')
    server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=timeout)
    server.set_debuglevel(1)
    server.ehlo()
    server.starttls(context=ctx)
    server.ehlo()
    username = settings.SMTP_USERNAME
    pwd = os.environ.get('SMTP_PASSWORD')
    if username and pwd:
        print('Logging in...')
        server.login(username, pwd)
    else:
        print('No SMTP credentials found in environment')
    print('Sending test email to', send_to)
    server.send_message(msg)
    server.quit()
    print('Email sent successfully')
except Exception as e:
    import traceback
    print('Failed to send email:', type(e).__name__, e)
    traceback.print_exc()
