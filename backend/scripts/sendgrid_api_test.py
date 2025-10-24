import sys
from pathlib import Path
import os

# prep path and load env
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))
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
import httpx

url = "https://api.sendgrid.com/v3/mail/send"
api_key = settings.SMTP_PASSWORD
if not api_key:
    print("No API key configured in settings.SMTP_PASSWORD")
    sys.exit(1)

payload = {
    "personalizations": [{"to": [{"email": "sriramkumar2910@gmail.com"}], "subject": "Test SendGrid API"}],
    "from": {"email": settings.EMAIL_FROM},
    "content": [{"type": "text/plain", "value": "This is a test from the repo fallback."}]
}
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

print('Sending test via SendGrid API...')
try:
    resp = httpx.post(url, json=payload, headers=headers, timeout=10)
    print('Status:', resp.status_code)
    print('Body:', resp.text)
except Exception as e:
    print('HTTP request failed:', type(e).__name__, e)
