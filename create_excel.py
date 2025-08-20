import pandas as pd

# Define data for each sheet
data = {
    "employees": [
        [1, "Alice Johnson", "alice@example.com", "Engineering", "Manager", 5, None, True],
        [2, "Bob Smith", "bob@example.com", "Engineering", "Team Lead", 4, 1, True],
        [3, "Carol Davis", "carol@example.com", "HR", "Developer", 3, 2, True],
        [4, "David Lee", "david@example.com", "Marketing", "Intern", 1, 2, True],
    ],
    "appraisal_types": [
        [1, "Annual", True],
        [2, "Half-yearly", True],
        [3, "Project-end", False],
    ],
    "appraisal_ranges": [
        [1, 1, "Full", 0, 12],
        [2, 2, "H1", 0, 6],
        [3, 2, "H2", 6, 12],
    ],
    "appraisals": [
        [1, None, 3, 2, 1, 1, 1, "2024-01-01", "2024-12-31", "Draft", None, None, None, None],
        [2, None, 4, 2, 1, 2, 2, "2024-01-01", "2024-06-30", "Draft", None, None, None, None],
    ],
    "categories": [
        [1, "Communication"],
        [2, "Leadership"],
        [3, "Technical"],
    ],
    "goals_template": [
        [1, "Improve Coding Skills", "Enhance backend development", "Technical Skills", "High", 40],
        [2, "Lead Team Meetings", "Organize and run team meets", "Leadership", "Medium", 30],
    ],
    "goal_template_categories": [
        [1, "Technical"],
        [2, "Leadership"],
    ],
    "goals": [
        [1, 1, "Complete API Module", "Build REST APIs in FastAPI", "Technical Skills", "Technical", "High", 40],
        [2, 2, "Conduct Sprint Reviews", "Host sprint review calls", "Leadership", "Leadership", "Medium", 30],
    ],
    "appraisal_goals": [
        [1, 1, 1, None, None, None, None],
        [2, 1, 2, None, None, None, None],
        [3, 2, 1, None, None, None, None],
    ]
}

# Column names for each sheet
columns = {
    "employees": ["emp_id", "emp_name", "emp_email", "emp_department", "emp_roles", "emp_roles_level", "emp_reporting_manager_id", "emp_status"],
    "appraisal_types": ["id", "name", "has_range"],
    "appraisal_ranges": ["id", "appraisal_type_id", "name", "start_month_offset", "end_month_offset"],
    "appraisals": ["appraisal_id", "appraisal_setting_id", "appraisee_id", "appraiser_id", "reviewer_id", "appraisal_type_id", "appraisal_type_range_id", "start_date", "end_date", "status", "appraiser_overall_comments", "appraiser_overall_rating", "reviewer_overall_comments", "reviewer_overall_rating"],
    "categories": ["id", "name"],
    "goals_template": ["temp_id", "temp_title", "temp_description", "temp_performance_factor", "temp_importance", "temp_weightage"],
    "goal_template_categories": ["template_id", "category"],
    "goals": ["goal_id", "goal_template_id", "goal_title", "goal_description", "goal_performance_factor", "goal_category", "goal_importance", "goal_weightage"],
    "appraisal_goals": ["id", "appraisal_id", "goal_id", "self_comment", "self_rating", "appraiser_comment", "appraiser_rating"],
}

# Create Excel
with pd.ExcelWriter("sample_data.xlsx") as writer:
    for sheet, rows in data.items():
        df = pd.DataFrame(rows, columns=columns[sheet])
        df.to_excel(writer, sheet_name=sheet, index=False)

print("sample_data.xlsx created.")
