import pytest
from datetime import date, datetime
from unittest.mock import patch
from app.utils.date_calculator import calculate_appraisal_dates
from types import SimpleNamespace


def make_type(name: str):
    return SimpleNamespace(name=name)


def make_range(name: str):
    return SimpleNamespace(name=name)

class TestDateCalculator:
    """Test cases for date calculation utility"""
    
    def test_calculate_annual_dates(self):
        """Test annual appraisal date calculation"""
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime(2025, 6, 15)
            mock_datetime.date = date
            
            start_date, end_date = calculate_appraisal_dates(make_type("Annual"), None)
            
            assert start_date == date(2025, 1, 1)
            assert end_date == date(2025, 12, 31)
    
    def test_calculate_half_yearly_first_range(self):
        """Test half-yearly first range date calculation"""
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime(2025, 3, 15)
            mock_datetime.date = date
            
            start_date, end_date = calculate_appraisal_dates(make_type("Half-yearly"), make_range("1st"))
            
            assert start_date == date(2025, 1, 1)
            assert end_date == date(2025, 6, 30)
    
    def test_calculate_half_yearly_second_range(self):
        """Test half-yearly second range date calculation"""
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime(2025, 9, 15)
            mock_datetime.date = date
            
            start_date, end_date = calculate_appraisal_dates(make_type("Half-yearly"), make_range("2nd"))
            
            assert start_date == date(2025, 7, 1)
            assert end_date == date(2025, 12, 31)
    
    def test_calculate_quarterly_dates(self):
        """Test quarterly appraisal date calculation"""
        quarterly_ranges = [
            ("1st", date(2025, 1, 1), date(2025, 3, 31)),
            ("2nd", date(2025, 4, 1), date(2025, 6, 30)),
            ("3rd", date(2025, 7, 1), date(2025, 9, 30)),
            ("4th", date(2025, 10, 1), date(2025, 12, 31))
        ]
        
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime(2025, 6, 15)
            mock_datetime.date = date
            
            for range_name, expected_start, expected_end in quarterly_ranges:
                start_date, end_date = calculate_appraisal_dates(make_type("Quarterly"), make_range(range_name))
                assert start_date == expected_start
                assert end_date == expected_end
    
    def test_calculate_tri_annual_dates(self):
        """Test tri-annual appraisal date calculation"""
        tri_annual_ranges = [
            ("1st", date(2025, 1, 1), date(2025, 4, 30)),
            ("2nd", date(2025, 5, 1), date(2025, 8, 31)),
            ("3rd", date(2025, 9, 1), date(2025, 12, 31))
        ]
        
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime(2025, 6, 15)
            mock_datetime.date = date
            
            for range_name, expected_start, expected_end in tri_annual_ranges:
                start_date, end_date = calculate_appraisal_dates(make_type("Tri-annual"), make_range(range_name))
                assert start_date == expected_start
                assert end_date == expected_end
    
    def test_calculate_project_end_dates(self):
        """Test project-end appraisal date calculation"""
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime(2025, 6, 15)
            mock_datetime.date = date
            
            # Project-end should use current date as reference
            start_date, end_date = calculate_appraisal_dates(make_type("Project-end"), None)
            
            # Assuming project-end spans 3 months from current date
            assert start_date <= date(2025, 6, 15)
            assert end_date >= date(2025, 6, 15)
    
    def test_calculate_probation_dates(self):
        """Test annual-probation appraisal date calculation"""
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime(2025, 6, 15)
            mock_datetime.date = date
            
            start_date, end_date = calculate_appraisal_dates(make_type("Annual-Probation"), None)
            
            # Probation period typically 6 months
            assert start_date <= date(2025, 6, 15)
            assert end_date >= date(2025, 6, 15)
    
    def test_invalid_appraisal_type(self):
        """Test handling of invalid appraisal type"""
        with pytest.raises(ValueError):
            calculate_appraisal_dates(make_type("Invalid-Type"), None)
            calculate_appraisal_dates(make_type("Invalid-Type"), make_range("1st"))
            calculate_appraisal_dates(make_type("Invalid-Type"), make_range("2nd"))
            calculate_appraisal_dates(make_type("Invalid-Type"), make_range("3rd"))
            calculate_appraisal_dates(make_type("Invalid-Type"), make_range("4th"))
            calculate_appraisal_dates(make_type("Invalid-Type"), make_range("1st"), 2025)
            calculate_appraisal_dates(make_type("Invalid-Type"), make_range("2nd"), 2025)
            calculate_appraisal_dates(make_type("Invalid-Type"), make_range("3rd"), 2025)
            calculate_appraisal_dates(make_type("Invalid-Type"), make_range("4th"), 2025)
    
    def test_year_boundary_calculation(self):
        """Test date calculation at year boundaries"""
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime(2023, 12, 31)
            mock_datetime.date = date
            
            start_date, end_date = calculate_appraisal_dates(make_type("Annual"), None)
            
            assert start_date == date(2023, 1, 1)
            assert end_date == date(2023, 12, 31)
