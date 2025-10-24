"""Non-interactive script to create an employee via the local API using built-in urllib.

This avoids external dependencies like 'requests'. It logs in with provided admin creds
and posts a new employee payload.

Edit the ADMIN_* and NEW_USER_* constants below if you want different values.
"""
import json
import urllib.request
import urllib.error
import sys

API_BASE = "http://localhost:7000/api"

# --- CONFIGURE HERE (defaults used) ---
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "passwordadmin"

NEW_USER = {
    "emp_name": "new.admin",
    "emp_email": "new.admin@example.com",
    "emp_department": "Engineering",
    "role_id": 5,
    "emp_reporting_manager_id": None,
    "emp_status": True,
    "password": "newadmin"
}
# --------------------------------------


def post_json(url, payload, headers=None):
    data = json.dumps(payload).encode("utf-8")
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, data=data, headers=hdrs, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            code = resp.getcode()
            try:
                return code, json.loads(body)
            except Exception:
                return code, body
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8")
            return e.code, json.loads(body)
        except Exception:
            return e.code, e.read().decode("utf-8")
    except Exception as e:
        return None, str(e)


def main():
    print(f"Logging in as {ADMIN_EMAIL} to {API_BASE}/employees/login")
    code, resp = post_json(f"{API_BASE}/employees/login", {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    print("Login response code:", code)
    print("Login response:", resp)
    if code != 200:
        print("Login failed, aborting.")
        sys.exit(1)

    access = resp.get("access_token")
    if not access:
        print("No access token returned, aborting.")
        sys.exit(1)

    headers = {"Authorization": f"Bearer {access}"}
    print(f"Creating user {NEW_USER['emp_email']} with role_id={NEW_USER['role_id']}")
    code2, resp2 = post_json(f"{API_BASE}/employees/", NEW_USER, headers=headers)
    print("Create response code:", code2)
    print("Create response:", resp2)


if __name__ == '__main__':
    main()
