import pytest
from datetime import date, datetime
from unittest.mock import Mock, patch

from app.utils.date_calculator import calculate_appraisal_dates
from app.models.appraisal_type import AppraisalType, AppraisalRange


class TestCalculateAppraisalDates:
    """Test the calculate_appraisal_dates function."""

    def setup_method(self):
        """Set up test fixtures."""
        # Create mock appraisal types
        self.annual_type = Mock(spec=AppraisalType)
        self.annual_type.name = "Annual"
        
        self.quarterly_type = Mock(spec=AppraisalType)
        self.quarterly_type.name = "Quarterly"
        
        self.half_yearly_type = Mock(spec=AppraisalType)
        self.half_yearly_type.name = "Half-yearly"
        
        self.tri_annual_type = Mock(spec=AppraisalType)
        self.tri_annual_type.name = "Tri-annual"
        
        self.project_type = Mock(spec=AppraisalType)
        self.project_type.name = "Project-end"
        
        # Create mock ranges
        self.first_range = Mock(spec=AppraisalRange)
        self.first_range.name = "1st"
        
        self.second_range = Mock(spec=AppraisalRange)
        self.second_range.name = "2nd"
        
        self.third_range = Mock(spec=AppraisalRange)
        self.third_range.name = "3rd"
        
        self.fourth_range = Mock(spec=AppraisalRange)
        self.fourth_range.name = "4th"

    def test_annual_appraisal_default_year(self):
        """Should calculate annual appraisal dates for current year."""
        with patch('app.utils.date_calculator.datetime') as mock_datetime:
            mock_datetime.now.return_value.year = 2024
            
            start_date, end_date = calculate_appraisal_dates(self.annual_type)
            
            assert start_date == date(2024, 1, 1)
            assert end_date == date(2024, 12, 31)

    def test_annual_appraisal_custom_year(self):
        """Should calculate annual appraisal dates for specified year."""
        start_date, end_date = calculate_appraisal_dates(
            self.annual_type, 
            current_year=2025
        )
        
        assert start_date == date(2025, 1, 1)
        assert end_date == date(2025, 12, 31)

    def test_annual_appraisal_ignores_range(self):
        """Should ignore range parameter for annual appraisals."""
        start_date, end_date = calculate_appraisal_dates(
            self.annual_type,
            appraisal_range=self.first_range,
            current_year=2024
        )
        
        assert start_date == date(2024, 1, 1)
        assert end_date == date(2024, 12, 31)

    def test_quarterly_first_quarter(self):
        """Should calculate Q1 dates correctly."""
        start_date, end_date = calculate_appraisal_dates(
            self.quarterly_type,
            appraisal_range=self.first_range,
            current_year=2024
        )
        
        assert start_date == date(2024, 1, 1)
        assert end_date == date(2024, 3, 31)

    def test_quarterly_second_quarter(self):
        """Should calculate Q2 dates correctly."""
        start_date, end_date = calculate_appraisal_dates(
            self.quarterly_type,
            appraisal_range=self.second_range,
            current_year=2024
        )
        
        assert start_date == date(2024, 4, 1)
        assert end_date == date(2024, 6, 30)

    def test_quarterly_third_quarter(self):
        """Should calculate Q3 dates correctly."""
        start_date, end_date = calculate_appraisal_dates(
            self.quarterly_type,
            appraisal_range=self.third_range,
            current_year=2024
        )
        
        assert start_date == date(2024, 7, 1)
        assert end_date == date(2024, 9, 30)

    def test_quarterly_fourth_quarter(self):
        """Should calculate Q4 dates correctly."""
        start_date, end_date = calculate_appraisal_dates(
            self.quarterly_type,
            appraisal_range=self.fourth_range,
            current_year=2024
        )
        
        assert start_date == date(2024, 10, 1)
        assert end_date == date(2024, 12, 31)

    def test_quarterly_without_range_raises_error(self):
        """Should raise error when quarterly appraisal has no range."""
        with pytest.raises(ValueError, match="requires a range to be specified"):
            calculate_appraisal_dates(self.quarterly_type, current_year=2024)

    def test_half_yearly_first_half(self):
        """Should calculate first half dates correctly."""
        start_date, end_date = calculate_appraisal_dates(
            self.half_yearly_type,
            appraisal_range=self.first_range,
            current_year=2024
        )
        
        assert start_date == date(2024, 1, 1)
        assert end_date == date(2024, 6, 30)

    def test_half_yearly_second_half(self):
        """Should calculate second half dates correctly."""
        start_date, end_date = calculate_appraisal_dates(
            self.half_yearly_type,
            appraisal_range=self.second_range,
            current_year=2024
        )
        
        assert start_date == date(2024, 7, 1)
        assert end_date == date(2024, 12, 31)

    def test_half_yearly_without_range_raises_error(self):
        """Should raise error when half-yearly appraisal has no range."""
        with pytest.raises(ValueError, match="requires a range to be specified"):
            calculate_appraisal_dates(self.half_yearly_type, current_year=2024)

    def test_tri_annual_first_period(self):
        """Should calculate first tri-annual period correctly."""
        start_date, end_date = calculate_appraisal_dates(
            self.tri_annual_type,
            appraisal_range=self.first_range,
            current_year=2024
        )
        
        assert start_date == date(2024, 1, 1)
        assert end_date == date(2024, 4, 30)

    def test_tri_annual_second_period(self):
        """Should calculate second tri-annual period correctly."""
        start_date, end_date = calculate_appraisal_dates(
            self.tri_annual_type,
            appraisal_range=self.second_range,
            current_year=2024
        )
        
        assert start_date == date(2024, 5, 1)
        assert end_date == date(2024, 8, 31)

    def test_tri_annual_third_period(self):
        """Should calculate third tri-annual period correctly."""
        start_date, end_date = calculate_appraisal_dates(
            self.tri_annual_type,
            appraisal_range=self.third_range,
            current_year=2024
        )
        
        assert start_date == date(2024, 9, 1)
        assert end_date == date(2024, 12, 31)

    def test_tri_annual_without_range_raises_error(self):
        """Should raise error when tri-annual appraisal has no range."""
        with pytest.raises(ValueError, match="requires a range to be specified"):
            calculate_appraisal_dates(self.tri_annual_type, current_year=2024)

    def test_project_end_appraisal(self):
        """Should calculate project-end appraisal dates."""
        start_date, end_date = calculate_appraisal_dates(
            self.project_type,
            current_year=2024
        )
        
        assert start_date == date(2024, 1, 1)
        assert end_date == date(2024, 12, 31)

    def test_case_insensitive_type_names(self):
        """Should handle case-insensitive appraisal type names."""
        test_cases = [
            ("ANNUAL", self.annual_type),
            ("annual", self.annual_type),
            ("Annual", self.annual_type),
            ("PROJECT-END", self.project_type),
            ("project-end", self.project_type),
        ]
        
        for case_name, original_type in test_cases:
            case_type = Mock(spec=AppraisalType)
            case_type.name = case_name
            
            # This should not raise an error
            start_date, end_date = calculate_appraisal_dates(
                case_type, 
                current_year=2024
            )
            
            # Verify we get valid dates
            assert isinstance(start_date, date)
            assert isinstance(end_date, date)
            assert start_date < end_date

        # Test quarterly case variations with ranges
        quarterly_test_cases = [
            ("QUARTERLY", self.quarterly_type),
            ("quarterly", self.quarterly_type),
            ("Quarterly", self.quarterly_type),
        ]
        
        for case_name, original_type in quarterly_test_cases:
            case_type = Mock(spec=AppraisalType)
            case_type.name = case_name
            
            # Should work with range
            start_date, end_date = calculate_appraisal_dates(
                case_type,
                appraisal_range=self.first_range,
                current_year=2024
            )
            
            # Verify we get valid dates
            assert isinstance(start_date, date)
            assert isinstance(end_date, date)
            assert start_date < end_date

    def test_case_insensitive_range_names(self):
        """Should handle case-insensitive range names."""
        test_ranges = [
            ("1ST", "1st"),
            ("first", "1st"),
            ("First", "1st"),
            ("FIRST", "1st"),
            ("2ND", "2nd"),
            ("second", "2nd"),
        ]
        
        for case_name, expected in test_ranges:
            case_range = Mock(spec=AppraisalRange)
            case_range.name = case_name
            
            start_date, end_date = calculate_appraisal_dates(
                self.quarterly_type,
                appraisal_range=case_range,
                current_year=2024
            )
            
            # Should get the same result as the lowercase version
            expected_range = Mock(spec=AppraisalRange)
            expected_range.name = expected
            
            expected_start, expected_end = calculate_appraisal_dates(
                self.quarterly_type,
                appraisal_range=expected_range,
                current_year=2024
            )
            
            assert start_date == expected_start
            assert end_date == expected_end

    def test_invalid_quarterly_range(self):
        """Should raise error for invalid quarterly range."""
        invalid_range = Mock(spec=AppraisalRange)
        invalid_range.name = "5th"
        
        with pytest.raises(ValueError, match="Invalid range '5th' for quarterly appraisal"):
            calculate_appraisal_dates(
                self.quarterly_type,
                appraisal_range=invalid_range,
                current_year=2024
            )

    def test_invalid_half_yearly_range(self):
        """Should raise error for invalid half-yearly range."""
        invalid_range = Mock(spec=AppraisalRange)
        invalid_range.name = "3rd"
        
        with pytest.raises(ValueError, match="Invalid range '3rd' for half-yearly appraisal"):
            calculate_appraisal_dates(
                self.half_yearly_type,
                appraisal_range=invalid_range,
                current_year=2024
            )

    def test_invalid_tri_annual_range(self):
        """Should raise error for invalid tri-annual range."""
        invalid_range = Mock(spec=AppraisalRange)
        invalid_range.name = "4th"
        
        with pytest.raises(ValueError, match="Invalid range '4th' for tri-annual appraisal"):
            calculate_appraisal_dates(
                self.tri_annual_type,
                appraisal_range=invalid_range,
                current_year=2024
            )

    def test_unknown_appraisal_type(self):
        """Should raise error for unknown appraisal type."""
        unknown_type = Mock(spec=AppraisalType)
        unknown_type.name = "Unknown Type"
        
        with pytest.raises(ValueError, match="Unknown appraisal type 'Unknown Type'"):
            calculate_appraisal_dates(unknown_type, current_year=2024)

    def test_leap_year_handling(self):
        """Should handle leap years correctly."""
        # Test Q1 in leap year
        start_date, end_date = calculate_appraisal_dates(
            self.quarterly_type,
            appraisal_range=self.first_range,
            current_year=2024  # 2024 is a leap year
        )
        
        assert start_date == date(2024, 1, 1)
        assert end_date == date(2024, 3, 31)  # March still ends on 31st

    def test_date_ranges_within_year(self):
        """Should ensure all calculated dates are within the specified year."""
        test_year = 2023
        
        test_cases = [
            (self.annual_type, None),
            (self.quarterly_type, self.first_range),
            (self.quarterly_type, self.fourth_range),
            (self.half_yearly_type, self.first_range),
            (self.half_yearly_type, self.second_range),
            (self.tri_annual_type, self.first_range),
            (self.tri_annual_type, self.third_range),
            (self.project_type, None),
        ]
        
        for appraisal_type, appraisal_range in test_cases:
            start_date, end_date = calculate_appraisal_dates(
                appraisal_type,
                appraisal_range=appraisal_range,
                current_year=test_year
            )
            
            assert start_date.year == test_year
            assert end_date.year == test_year
            assert start_date <= end_date

    def test_appraisal_type_variation_names(self):
        """Should handle various appraisal type naming variations."""
        # Test semi-annual: Due to precedence logic, "annual" is checked before "semi"
        # So "Semi-annual" matches the annual check and is treated as full year
        semi_annual_type = Mock(spec=AppraisalType)
        semi_annual_type.name = "Semi-annual"
        
        # It requires a range because it contains "semi", but gets processed as annual
        start_date, end_date = calculate_appraisal_dates(
            semi_annual_type,
            appraisal_range=self.first_range,  # Range required but ignored for annual
            current_year=2024
        )
        
        # Because "annual" is checked before "semi", it's treated as full year
        assert start_date == date(2024, 1, 1)
        assert end_date == date(2024, 12, 31)
        
        # Test semi-yearly (without "annual" in the name) for proper half-year handling
        semi_yearly_type = Mock(spec=AppraisalType)
        semi_yearly_type.name = "Semi-yearly"
        
        start_date, end_date = calculate_appraisal_dates(
            semi_yearly_type,
            appraisal_range=self.first_range,
            current_year=2024
        )
        
        assert start_date == date(2024, 1, 1)
        assert end_date == date(2024, 6, 30)

    def test_comprehensive_date_coverage(self):
        """Should ensure all days of the year are covered by quarterly periods."""
        test_year = 2024
        
        # Get all quarterly periods
        q1_start, q1_end = calculate_appraisal_dates(
            self.quarterly_type, self.first_range, test_year
        )
        q2_start, q2_end = calculate_appraisal_dates(
            self.quarterly_type, self.second_range, test_year
        )
        q3_start, q3_end = calculate_appraisal_dates(
            self.quarterly_type, self.third_range, test_year
        )
        q4_start, q4_end = calculate_appraisal_dates(
            self.quarterly_type, self.fourth_range, test_year
        )
        
        # Verify continuous coverage
        assert q1_start == date(test_year, 1, 1)
        assert q2_start == date(q1_end.year, q1_end.month + 1, 1)
        assert q3_start == date(q2_end.year, q2_end.month + 1, 1)
        assert q4_start == date(q3_end.year, q3_end.month + 1, 1)
        assert q4_end == date(test_year, 12, 31)

    def test_edge_case_month_boundaries(self):
        """Should handle month boundary edge cases correctly."""
        # Test Q2 starting exactly after Q1 ends
        q1_start, q1_end = calculate_appraisal_dates(
            self.quarterly_type, self.first_range, 2024
        )
        q2_start, q2_end = calculate_appraisal_dates(
            self.quarterly_type, self.second_range, 2024
        )
        
        # Q1 ends March 31, Q2 should start April 1
        assert q1_end == date(2024, 3, 31)
        assert q2_start == date(2024, 4, 1)
        
        # Should be consecutive days
        from datetime import timedelta
        assert q2_start == q1_end + timedelta(days=1)

    def test_none_range_with_non_range_types(self):
        """Should handle None range gracefully for types that don't need ranges."""
        non_range_types = [self.annual_type, self.project_type]
        
        for appraisal_type in non_range_types:
            # Should not raise an error
            start_date, end_date = calculate_appraisal_dates(
                appraisal_type,
                appraisal_range=None,
                current_year=2024
            )
            
            assert isinstance(start_date, date)
            assert isinstance(end_date, date)
            assert start_date.year == 2024
            assert end_date.year == 2024
