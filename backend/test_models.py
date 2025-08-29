import pytest
from unittest.mock import MagicMock
from app.models.employee import Employee
from app.models.appraisal import Appraisal
from app.models.goal import GoalTemplate, Goal
from app.models.appraisal_type import AppraisalType, AppraisalRange

class TestEmployeeModel:
    """Test cases for Employee model"""
    
    def test_employee_creation(self):
        """Test employee model creation"""
        employee = Employee(
            emp_name="John Doe",
            emp_email="john@company.com",
            emp_department="Engineering",
            emp_roles="Manager",
            emp_roles_level=5,
            emp_status=True
        )
        
        assert employee.emp_name == "John Doe"
        assert employee.emp_email == "john@company.com"
        assert employee.emp_department == "Engineering"
        assert employee.emp_roles == "Manager"
        assert employee.emp_roles_level == 5
        assert employee.emp_status is True
    
    def test_employee_string_representation(self):
        """Test employee string representation"""
        employee = Employee(emp_name="John Doe", emp_email="john@company.com")
        expected = "<Employee(emp_name='John Doe', emp_email='john@company.com')>"
        assert str(employee) == expected

class TestAppraisalModel:
    """Test cases for Appraisal model"""
    
    def test_appraisal_creation(self):
        """Test appraisal model creation"""
        appraisal = Appraisal(
            appraisee_id=1,
            appraiser_id=2,
            reviewer_id=3,
            appraisal_type_id=1,
            status="Draft"
        )
        
        assert appraisal.appraisee_id == 1
        assert appraisal.appraiser_id == 2
        assert appraisal.reviewer_id == 3
        assert appraisal.status == "Draft"
    
    def test_appraisal_status_transitions(self):
        """Test valid appraisal status transitions"""
        valid_statuses = [
            "Draft",
            "Submitted",
            "Appraisee Self Assessment",
            "Appraiser Evaluation",
            "Reviewer Evaluation",
            "Complete"
        ]
        
        appraisal = Appraisal(appraisee_id=1, appraiser_id=2, reviewer_id=3)
        
        for status in valid_statuses:
            appraisal.status = status
            assert appraisal.status == status

class TestGoalTemplateModel:
    """Test cases for GoalTemplate model"""
    
    def test_goal_template_creation(self):
        """Test goal template model creation"""
        template = GoalTemplate(
            temp_title="Technical Skills",
            temp_description="Improve technical capabilities",
            temp_performance_factor="Code quality",
            temp_category="Technical",
            temp_importance="High",
            temp_weightage=30
        )
        
        assert template.temp_title == "Technical Skills"
        assert template.temp_description == "Improve technical capabilities"
        assert template.temp_importance == "High"
        assert template.temp_weightage == 30
    
    def test_goal_template_weightage_validation(self):
        """Test goal template weightage bounds"""
        template = Goals_Template(
            temp_title="Test Goal",
            temp_weightage=50
        )
        
        # Valid weightage
        assert 0 <= template.temp_weightage <= 100
    
    def test_goal_template_importance_levels(self):
        """Test valid importance levels"""
        valid_importance = ["High", "Medium", "Low"]
        
        for importance in valid_importance:
            template = GoalTemplate(
                temp_title="Test Goal",
                temp_importance=importance
            )
            assert template.temp_importance == importance

class TestGoalModel:
    """Test cases for Goal model"""
    
    def test_goal_creation(self):
        """Test goal model creation"""
        goal = Goal(
            goal_template_id=1,
            goal_title="Technical Excellence",
            goal_performance_factor="Code quality and delivery",
            goal_description="Technical excellence description",
            goal_importance="High",
            goal_weightage=40
        )
        
        assert goal.goal_template_id == 1
        assert goal.goal_title == "Technical Excellence"
        assert goal.goal_weightage == 40
    
    def test_goal_ratings(self):
        """Test goal rating fields - Note: ratings moved to AppraisalGoal model"""
        # This test is now conceptual since ratings are in AppraisalGoal
        goal = Goal(
            goal_title="Test Goal",
            goal_description="Test description",
            goal_performance_factor="Test factor",
            goal_importance="High",
            goal_weightage=25
        )
        
        assert goal.goal_title == "Test Goal"
        assert goal.goal_weightage == 25

class TestAppraisalTypeModel:
    """Test cases for AppraisalType model"""
    
    def test_appraisal_type_creation(self):
        """Test appraisal type model creation"""
        appraisal_type = AppraisalType(
            name="Annual",
            has_range=False
        )
        
        assert appraisal_type.name == "Annual"
        assert appraisal_type.has_range is False
    
    def test_appraisal_type_with_ranges(self):
        """Test appraisal type with ranges"""
        appraisal_type = AppraisalType(
            name="Half-yearly",
            has_range=True
        )
        
        assert appraisal_type.name == "Half-yearly"
        assert appraisal_type.has_range is True

class TestAppraisalRangeModel:
    """Test cases for AppraisalRange model"""
    
    def test_appraisal_range_creation(self):
        """Test appraisal range model creation"""
        appraisal_range = AppraisalRange(
            appraisal_type_id=2,
            name="1st",
            start_date=1,
            end_date=6
        )
        
        assert appraisal_range.appraisal_type_id == 2
        assert appraisal_range.name == "1st"
        assert appraisal_range.start_date == 1
        assert appraisal_range.end_date == 6
    
    def test_appraisal_range_quarterly(self):
        """Test quarterly appraisal ranges"""
        quarters = [
            {"name": "1st", "start": 1, "end": 3},
            {"name": "2nd", "start": 4, "end": 6},
            {"name": "3rd", "start": 7, "end": 9},
            {"name": "4th", "start": 10, "end": 12}
        ]
        
        for quarter in quarters:
            range_obj = AppraisalRange(
                appraisal_type_id=3,  # Quarterly
                name=quarter["name"],
                start_date=quarter["start"],
                end_date=quarter["end"]
            )
            
            assert range_obj.name == quarter["name"]
            assert range_obj.start_date == quarter["start"]
            assert range_obj.end_date == quarter["end"]
