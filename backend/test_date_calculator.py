import pytest
from datetime import date, datetime
from unittest.mock import patch
from app.utils.date_calculator import calculate_appraisal_dates

class TestDateCalculator:
    """Test cases for date calculation utility"""
    
    def test_calculate_annual_dates(self):
        """Test annual appraisal date calculation"""
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime(2024, 6, 15)
            mock_datetime.date = date
            
            start_date, end_date = calculate_appraisal_dates("Annual", None)
            
            assert start_date == date(2024, 1, 1)
            assert end_date == date(2024, 12, 31)
    
    def test_calculate_half_yearly_first_range(self):
        """Test half-yearly first range date calculation"""
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime(2024, 3, 15)
            mock_datetime.date = date
            
            start_date, end_date = calculate_appraisal_dates("Half-yearly", "1st")
            
            assert start_date == date(2024, 1, 1)
            assert end_date == date(2024, 6, 30)
    
    def test_calculate_half_yearly_second_range(self):
        """Test half-yearly second range date calculation"""
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime(2024, 9, 15)
            mock_datetime.date = date
            
            start_date, end_date = calculate_appraisal_dates("Half-yearly", "2nd")
            
            assert start_date == date(2024, 7, 1)
            assert end_date == date(2024, 12, 31)
    
    def test_calculate_quarterly_dates(self):
        """Test quarterly appraisal date calculation"""
        quarterly_ranges = [
            ("1st", date(2024, 1, 1), date(2024, 3, 31)),
            ("2nd", date(2024, 4, 1), date(2024, 6, 30)),
            ("3rd", date(2024, 7, 1), date(2024, 9, 30)),
            ("4th", date(2024, 10, 1), date(2024, 12, 31))
        ]
        
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime(2024, 6, 15)
            mock_datetime.date = date
            
            for range_name, expected_start, expected_end in quarterly_ranges:
                start_date, end_date = calculate_appraisal_dates("Quarterly", range_name)
                assert start_date == expected_start
                assert end_date == expected_end
    
    def test_calculate_tri_annual_dates(self):
        """Test tri-annual appraisal date calculation"""
        tri_annual_ranges = [
            ("1st", date(2024, 1, 1), date(2024, 4, 30)),
            ("2nd", date(2024, 5, 1), date(2024, 8, 31)),
            ("3rd", date(2024, 9, 1), date(2024, 12, 31))
        ]
        
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime(2024, 6, 15)
            mock_datetime.date = date
            
            for range_name, expected_start, expected_end in tri_annual_ranges:
                start_date, end_date = calculate_appraisal_dates("Tri-annual", range_name)
                assert start_date == expected_start
                assert end_date == expected_end
    
    def test_calculate_project_end_dates(self):
        """Test project-end appraisal date calculation"""
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime(2024, 6, 15)
            mock_datetime.date = date
            
            # Project-end should use current date as reference
            start_date, end_date = calculate_appraisal_dates("Project-end", None)
            
            # Assuming project-end spans 3 months from current date
            assert start_date <= date(2024, 6, 15)
            assert end_date >= date(2024, 6, 15)
    
    def test_calculate_probation_dates(self):
        """Test annual-probation appraisal date calculation"""
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime(2024, 6, 15)
            mock_datetime.date = date
            
            start_date, end_date = calculate_appraisal_dates("Annual-Probation", None)
            
            # Probation period typically 6 months
            assert start_date <= date(2024, 6, 15)
            assert end_date >= date(2024, 6, 15)
    
    def test_invalid_appraisal_type(self):
        """Test handling of invalid appraisal type"""
        with pytest.raises(ValueError):
            calculate_appraisal_dates("Invalid-Type", None)
    
    def test_leap_year_handling(self):
        """Test date calculation in leap year"""
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime(2024, 2, 15)  # 2024 is leap year
            mock_datetime.date = date
            
            start_date, end_date = calculate_appraisal_dates("Annual", None)
            
            assert start_date == date(2024, 1, 1)
            assert end_date == date(2024, 12, 31)
    
    def test_year_boundary_calculation(self):
        """Test date calculation at year boundaries"""
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value = datetime(2023, 12, 31)
            mock_datetime.date = date
            
            start_date, end_date = calculate_appraisal_dates("Annual", None)
            
            assert start_date == date(2023, 1, 1)
            assert end_date == date(2023, 12, 31)
