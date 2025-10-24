"""Non-interactive helper to create an employee via the running API using provided credentials.

This script is intended to be run from the project `backend` folder.
It uses hardcoded values below (dev/testing only). Change as needed.
"""
import requests
import sys

API_BASE = "http://localhost:7000/api"

# Admin credentials you provided
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "passwordadmin"

# New user to create (Admin)
NEW_EMP = {
    "emp_name": "new.admin",
    "emp_email": "new.admin@example.com",
    "emp_department": "Engineering",
    "role_id": 5,
    "emp_reporting_manager_id": None,
    "emp_status": True,
    "password": "newadmin"
}


def main():
    print(f"Logging in as {ADMIN_EMAIL}...")
    r = requests.post(f"{API_BASE}/employees/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    print("Login status:", r.status_code)
    if r.status_code != 200:
        print("Login response:", r.status_code, r.text)
        sys.exit(1)

    tokens = r.json()
    token = tokens.get("access_token")
    if not token:
        print("No access token returned; aborting.")
        sys.exit(1)

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print(f"Creating employee {NEW_EMP['emp_email']} (role_id={NEW_EMP['role_id']})...")
    r2 = requests.post(f"{API_BASE}/employees/", json=NEW_EMP, headers=headers)
    print("Create status:", r2.status_code)
    try:
        print(r2.json())
    except Exception:
        print(r2.text)

if __name__ == '__main__':
    main()
