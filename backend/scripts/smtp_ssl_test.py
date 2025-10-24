import sys
from pathlib import Path
import os

# ensure backend root on path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))

# load env
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
import socket, ssl, smtplib

host = settings.SMTP_HOST or 'smtp.sendgrid.net'
port_ssl = 465
print("SMTP settings:")
print("  host:", host)
print("  configured port:", settings.SMTP_PORT)
print("  use_tls:", settings.SMTP_USE_TLS)
print("  debug:", getattr(settings, 'EMAIL_SMTP_DEBUG', False))

# Resolve
try:
    addrs = socket.getaddrinfo(host, port_ssl, proto=socket.IPPROTO_TCP)
    ips = sorted({a[4][0] for a in addrs})
    print('\nResolved IPs for', host, ':', ips)
except Exception as e:
    print('\nDNS resolution failed:', type(e).__name__, e)

# TCP connect to 465
try:
    with socket.create_connection((host, port_ssl), timeout=8) as sock:
        print(f"\nTCP connect to {host}:{port_ssl} succeeded")
except Exception as e:
    print(f"\nTCP connect to {host}:{port_ssl} failed:", type(e).__name__, e)

# Attempt SMTP_SSL handshake and login
username = settings.SMTP_USERNAME
password_present = bool(settings.SMTP_PASSWORD)
print('\nAttempting SMTP_SSL handshake and login (password not printed)')
try:
    ctx = ssl.create_default_context()
    server = smtplib.SMTP_SSL(host, port_ssl, timeout=10, context=ctx)
    if getattr(settings, 'EMAIL_SMTP_DEBUG', False):
        server.set_debuglevel(1)
    # attempt EHLO
    server.ehlo()
    # attempt login if creds present
    if username and password_present:
        try:
            server.login(username, os.environ.get('SMTP_PASSWORD'))
            print('Login successful')
        except Exception as e:
            print('Login failed:', type(e).__name__, e)
    else:
        print('No SMTP credentials to attempt login')
    server.quit()
except Exception as e:
    print('SMTP_SSL attempt failed:', type(e).__name__, e)
    import traceback; traceback.print_exc()
