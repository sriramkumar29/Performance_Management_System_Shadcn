"""Interactive script to test creating an employee via the running API.

Usage (PowerShell):
  cd backend
  python .\scripts\create_employee_via_api.py

It will prompt for admin email/password (used to obtain a token) and the new employee's details.
By default the script targets http://localhost:7000/api

Note: keep this script for dev/testing only. Do not store real credentials here.
"""
import getpass
import requests
import sys

API_BASE = "http://localhost:7000/api"


def prompt(prompt_text, default=None):
    if default:
        resp = input(f"{prompt_text} [{default}]: ")
        return resp.strip() or default
    return input(f"{prompt_text}: ").strip()


def main():
    print("This script will login as an admin and create a new employee via API.")
    admin_email = prompt("Admin email (used to login)", "admin@example.com")
    admin_password = getpass.getpass("Admin password: ", "passwordadmin")

    # Login
    login_url = f"{API_BASE}/employees/login"
    print(f"Logging in as {admin_email}...")
    r = requests.post(login_url, json={"email": admin_email, "password": admin_password})
    if r.status_code != 200:
        print("Login failed:", r.status_code, r.text)
        sys.exit(1)

    tokens = r.json()
    access_token = tokens.get("access_token")
    if not access_token:
        print("No access token returned; aborting.")
        sys.exit(1)

    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

    # New employee details
    print("\nEnter new employee details (role_id=5 = Admin)")
    emp_name = prompt("Name", "new.admin")
    emp_email = prompt("Email", "new.admin@example.com")
    emp_department = prompt("Department", "Engineering")
    role_id = int(prompt("Role ID", "5"))
    reporting_manager = prompt("Reporting manager ID (optional)", "")
    emp_status = prompt("Active? (true/false)", "true").lower() in ("true", "1", "yes")
    password = getpass.getpass("Password for new user: ", "newadmin")

    payload = {
        "emp_name": emp_name,
        "emp_email": emp_email,
        "emp_department": emp_department,
        "role_id": role_id,
        "emp_reporting_manager_id": int(reporting_manager) if reporting_manager else None,
        "emp_status": emp_status,
        "password": password
    }

    create_url = f"{API_BASE}/employees/"
    print(f"Creating employee {emp_email} with role_id={role_id}...")
    r2 = requests.post(create_url, json=payload, headers=headers)
    print("Status:", r2.status_code)
    try:
        print(r2.json())
    except Exception:
        print(r2.text)


if __name__ == '__main__':
    main()
