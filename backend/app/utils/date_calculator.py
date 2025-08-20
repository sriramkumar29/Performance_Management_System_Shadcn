from datetime import date, datetime
from typing import Tuple, Optional
from app.models.appraisal_type import AppraisalType, AppraisalRange


def calculate_appraisal_dates(
    appraisal_type: AppraisalType, 
    appraisal_range: Optional[AppraisalRange] = None,
    current_year: Optional[int] = None
) -> Tuple[date, date]:
    """
    Calculate start and end dates for an appraisal based on type and range.
    
    Args:
        appraisal_type: The appraisal type (Annual, Quarterly, etc.)
        appraisal_range: The specific range (1st, 2nd, etc.) if applicable
        current_year: Year to calculate dates for (defaults to current year)
    
    Returns:
        Tuple of (start_date, end_date)
    """
    if current_year is None:
        current_year = datetime.now().year
    
    type_name = appraisal_type.name.lower()
    
    # Annual appraisals - full year
    if "annual" in type_name:
        start_date = date(current_year, 1, 1)
        end_date = date(current_year, 12, 31)
        return start_date, end_date
    
    # For types with ranges, we need the range information
    if appraisal_range is None:
        raise ValueError(f"Appraisal type '{appraisal_type.name}' requires a range to be specified")
    
    range_name = appraisal_range.name.lower()
    
    # Half-yearly appraisals
    if "half" in type_name or "semi" in type_name:
        if "1st" in range_name or "first" in range_name:
            start_date = date(current_year, 1, 1)
            end_date = date(current_year, 6, 30)
        elif "2nd" in range_name or "second" in range_name:
            start_date = date(current_year, 7, 1)
            end_date = date(current_year, 12, 31)
        else:
            raise ValueError(f"Invalid range '{range_name}' for half-yearly appraisal")
        return start_date, end_date
    
    # Quarterly appraisals
    if "quarter" in type_name:
        if "1st" in range_name or "first" in range_name:
            start_date = date(current_year, 1, 1)
            end_date = date(current_year, 3, 31)
        elif "2nd" in range_name or "second" in range_name:
            start_date = date(current_year, 4, 1)
            end_date = date(current_year, 6, 30)
        elif "3rd" in range_name or "third" in range_name:
            start_date = date(current_year, 7, 1)
            end_date = date(current_year, 9, 30)
        elif "4th" in range_name or "fourth" in range_name:
            start_date = date(current_year, 10, 1)
            end_date = date(current_year, 12, 31)
        else:
            raise ValueError(f"Invalid range '{range_name}' for quarterly appraisal")
        return start_date, end_date
    
    # Tri-annual appraisals (3 times per year)
    if "tri" in type_name:
        if "1st" in range_name or "first" in range_name:
            start_date = date(current_year, 1, 1)
            end_date = date(current_year, 4, 30)
        elif "2nd" in range_name or "second" in range_name:
            start_date = date(current_year, 5, 1)
            end_date = date(current_year, 8, 31)
        elif "3rd" in range_name or "third" in range_name:
            start_date = date(current_year, 9, 1)
            end_date = date(current_year, 12, 31)
        else:
            raise ValueError(f"Invalid range '{range_name}' for tri-annual appraisal")
        return start_date, end_date
    
    # Project-end appraisals - default to current year but can be customized
    if "project" in type_name:
        # For project-end, we might want to use custom dates
        # Default to full year for now, but this could be made configurable
        start_date = date(current_year, 1, 1)
        end_date = date(current_year, 12, 31)
        return start_date, end_date
    
    # Default fallback - full year
    start_date = date(current_year, 1, 1)
    end_date = date(current_year, 12, 31)
    return start_date, end_date
