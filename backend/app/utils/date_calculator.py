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
    """
    if current_year is None:
        current_year = datetime.now().year
    
    type_name = appraisal_type.name.lower()
    range_name = appraisal_range.name.lower() if appraisal_range else ""

    # Mapping for multi-range appraisal types
    RANGE_MAPS = {
        "tri": {
            "1st": (1, 1, 4, 30),
            "2nd": (5, 1, 8, 31),
            "3rd": (9, 1, 12, 31),
        },
        "half": {
            "1st": (1, 1, 6, 30),
            "2nd": (7, 1, 12, 31),
        },
        "semi": {
            "1st": (1, 1, 6, 30),
            "2nd": (7, 1, 12, 31),
        },
        "quarter": {
            "1st": (1, 1, 3, 31),
            "2nd": (4, 1, 6, 30),
            "3rd": (7, 1, 9, 30),
            "4th": (10, 1, 12, 31),
        }
    }

    # Normalize range names (support "first", "second", etc.)
    RANGE_ALIASES = {
        "first": "1st",
        "second": "2nd",
        "third": "3rd",
        "fourth": "4th"
    }
    if range_name in RANGE_ALIASES:
        range_name = RANGE_ALIASES[range_name]

    # Handle types with specific ranges
    for key in RANGE_MAPS:
        if key in type_name:
            if not range_name:
                raise ValueError(f"Appraisal type '{appraisal_type.name}' requires a range")
            if range_name not in RANGE_MAPS[key]:
                raise ValueError(f"Invalid range '{range_name}' for {key}-yearly appraisal")
            start_month, start_day, end_month, end_day = RANGE_MAPS[key][range_name]
            return date(current_year, start_month, start_day), date(current_year, end_month, end_day)

    # Handle types without ranges
    if any(k in type_name for k in ("annual", "project")):
        return date(current_year, 1, 1), date(current_year, 12, 31)

    raise ValueError(f"Unknown appraisal type '{appraisal_type.name}'")
