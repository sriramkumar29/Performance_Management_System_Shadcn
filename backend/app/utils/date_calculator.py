from datetime import date, datetime
from typing import Tuple, Optional
from app.models.appraisal_type import AppraisalType, AppraisalRange

# Import logging components
from app.utils.logger import get_logger, sanitize_log_data, build_log_context, log_execution_time

# Initialize logger for date calculator module
logger = get_logger(__name__)

@log_execution_time()
def calculate_appraisal_dates(
    appraisal_type: AppraisalType, 
    appraisal_range: Optional[AppraisalRange] = None,
    current_year: Optional[int] = None
) -> Tuple[date, date]:
    """
    Calculate start and end dates for an appraisal based on type and range.
    """
    context = build_log_context()
    
    try:
        if current_year is None:
            current_year = datetime.now().year
        
        type_name = appraisal_type.name.lower()
        range_name = appraisal_range.name.lower() if appraisal_range else ""
        
        logger.debug(f"{context}DATE_CALC_START: Calculating appraisal dates - Type: {sanitize_log_data(appraisal_type.name)}, Range: {sanitize_log_data(range_name)}, Year: {current_year}")

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
            original_range = range_name
            range_name = RANGE_ALIASES[range_name]
            logger.debug(f"{context}DATE_CALC_ALIAS: Normalized range name - {original_range} -> {range_name}")

        # Handle types with specific ranges
        for key in RANGE_MAPS:
            if key in type_name:
                logger.debug(f"{context}DATE_CALC_TYPE: Processing {key}-yearly appraisal type")
                
                if not range_name:
                    logger.error(f"{context}DATE_CALC_ERROR: Range required for type '{appraisal_type.name}' but not provided")
                    raise ValueError(f"Appraisal type '{appraisal_type.name}' requires a range")
                
                if range_name not in RANGE_MAPS[key]:
                    logger.error(f"{context}DATE_CALC_ERROR: Invalid range '{range_name}' for {key}-yearly appraisal - Valid: {list(RANGE_MAPS[key].keys())}")
                    raise ValueError(f"Invalid range '{range_name}' for {key}-yearly appraisal")
                
                start_month, start_day, end_month, end_day = RANGE_MAPS[key][range_name]
                start_date = date(current_year, start_month, start_day)
                end_date = date(current_year, end_month, end_day)
                
                logger.info(f"{context}DATE_CALC_SUCCESS: Calculated dates for {key}-yearly appraisal - Start: {start_date}, End: {end_date}")
                return start_date, end_date

        # Handle types without ranges
        if any(k in type_name for k in ("annual", "project")):
            logger.debug(f"{context}DATE_CALC_TYPE: Processing {type_name} appraisal type (full year)")
            start_date = date(current_year, 1, 1)
            end_date = date(current_year, 12, 31)
            
            logger.info(f"{context}DATE_CALC_SUCCESS: Calculated full year dates - Start: {start_date}, End: {end_date}")
            return start_date, end_date

        logger.error(f"{context}DATE_CALC_ERROR: Unknown appraisal type '{appraisal_type.name}'")
        raise ValueError(f"Unknown appraisal type '{appraisal_type.name}'")
        
    except Exception as e:
        logger.error(f"{context}DATE_CALC_EXCEPTION: Error calculating appraisal dates - {str(e)}")
        raise
