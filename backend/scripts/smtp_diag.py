import sys
from pathlib import Path

# Ensure the backend folder is on sys.path so `app` package can be imported when running this script
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))
import os

# Load env file (backend/.env.development) into environment so Settings can read required variables
env_path = root / ".env.development"
if env_path.exists():
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                # don't overwrite existing env vars
                if k not in os.environ:
                    os.environ[k] = v
    except Exception as e:
        print("Warning: failed to load env file:", e)

from app.core.config import settings
import socket, ssl, smtplib

print("SMTP settings seen by the app:")
print("  SMTP_HOST:", settings.SMTP_HOST)
print("  SMTP_PORT:", settings.SMTP_PORT)
print("  SMTP_USE_TLS:", settings.SMTP_USE_TLS)
print("  EMAIL_SMTP_DEBUG:", getattr(settings, 'EMAIL_SMTP_DEBUG', False))

host = settings.SMTP_HOST or 'smtp.sendgrid.net'
port = settings.SMTP_PORT or 587
print(f"Using host={host} port={port}")

# Resolve hostname
try:
    addrs = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
    ips = sorted({a[4][0] for a in addrs})
    print('\nResolved IPs for', host, ':', ips)
except Exception as e:
    print('\nHostname resolution failed:', type(e).__name__, e)

# Try to fetch certificate via implicit SSL (port 465) with short timeout
try:
    print("Fetching cert on port 465...")
    ctx = ssl.create_default_context()
    with socket.create_connection((host, 465), timeout=5) as sock:
        with ctx.wrap_socket(sock, server_hostname=host) as ssock:
            cert = ssock.getpeercert()
            print('\nCertificate (via implicit SSL on port 465):')
            subj = cert.get('subject')
            print('  subject:', subj)
            san = cert.get('subjectAltName')
            print('  subjectAltName:', san)
            issuer = cert.get('issuer')
            print('  issuer:', issuer)
except Exception as e:
    print('\nFailed to fetch cert on port 465:', type(e).__name__, e)

# Try STARTTLS on configured port and capture SSL errors
try:
    print(f"\nAttempting SMTP STARTTLS to {host}:{port} with strict verification...")
    ctx = ssl.create_default_context()
    s = smtplib.SMTP(host, port, timeout=5)
    s.set_debuglevel(1)
    s.ehlo()
    s.starttls(context=ctx)
    s.ehlo()
    print('STARTTLS succeeded (no verification error)')
    s.quit()
except Exception as e:
    print('STARTTLS attempt failed:', type(e).__name__, e)
    import traceback
    traceback.print_exc()
