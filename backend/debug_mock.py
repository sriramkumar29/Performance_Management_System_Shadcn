#!/usr/bin/env python3
"""
Debug mock behavior
"""
from unittest.mock import MagicMock

def _make_result(all=None, first=None, scalar=None):
    """Helper to create a mock database result that supports result.scalars().all() / .first() and result.scalar()"""
    result = MagicMock()
    scalars = MagicMock()
    if all is not None:
        scalars.all.return_value = all
    if first is not None:
        scalars.first.return_value = first
    result.scalars.return_value = scalars
    if scalar is not None:
        result.scalar.return_value = scalar
    return result

# Test the mock
result = _make_result(first=None)
print('Result:', result)
print('Scalars:', result.scalars())
print('First:', result.scalars().first())
print('Type of first:', type(result.scalars().first()))
print('Is None:', result.scalars().first() is None)

# Test what happens when we access emp_password on None
employee = result.scalars().first()
print('Employee:', employee)
if employee:
    print('Employee password:', employee.emp_password)
else:
    print('Employee is None, no password access')