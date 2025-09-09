/**
 * Test data fixtures for E2E testing
 * TypeScript version to avoid JSON import issues
 */

export const testUsers = {
  employee: {
    email: "test.employee@company.com",
    password: "test123",
    name: "John Employee",
    role: "employee"
  },
  manager: {
    email: "test.manager@company.com", 
    password: "test123",
    name: "Jane Manager",
    role: "manager"
  },
  hr: {
    email: "test.hr@company.com",
    password: "test123", 
    name: "Alice HR",
    role: "hr"
  }
};

export const appraisalTemplates = {
  quarterlyReview: {
    title: "Q3 2025 Performance Review",
    description: "Quarterly performance assessment focusing on key achievements and development areas",
    goals: [
      {
        title: "Project Delivery Excellence",
        description: "Successfully deliver assigned projects on time and within scope",
        weightage: 40,
        category: "performance"
      },
      {
        title: "Team Collaboration",
        description: "Effectively collaborate with team members and stakeholders",
        weightage: 30,
        category: "behavior"
      },
      {
        title: "Skill Development",
        description: "Actively pursue learning and professional development opportunities",
        weightage: 30,
        category: "development"
      }
    ]
  },
  annualReview: {
    title: "Annual Performance Review 2025",
    description: "Comprehensive annual review covering all aspects of performance",
    goals: [
      {
        title: "Strategic Objectives Achievement",
        description: "Meet or exceed strategic objectives set at the beginning of the year",
        weightage: 50,
        category: "performance"
      },
      {
        title: "Leadership and Mentoring",
        description: "Demonstrate leadership qualities and mentor junior team members",
        weightage: 25,
        category: "leadership"
      },
      {
        title: "Innovation and Process Improvement",
        description: "Contribute to innovation and process improvements within the team",
        weightage: 25,
        category: "innovation"
      }
    ]
  },
  probationaryReview: {
    title: "Probationary Period Review",
    description: "Assessment of performance during probationary period",
    goals: [
      {
        title: "Role Understanding and Execution",
        description: "Demonstrate clear understanding of role responsibilities and execute effectively",
        weightage: 60,
        category: "performance"
      },
      {
        title: "Cultural Fit and Integration",
        description: "Show alignment with company culture and integrate well with the team",
        weightage: 40,
        category: "behavior"
      }
    ]
  }
};

export const goalCategories = [
  "performance",
  "behavior", 
  "development",
  "leadership",
  "innovation",
  "communication",
  "technical",
  "customer_service"
];

export const statusTransitions = {
  validSequence: [
    "draft",
    "submitted", 
    "appraisee_self_assessment",
    "appraiser_evaluation",
    "reviewer_evaluation", 
    "complete"
  ],
  validTransitions: {
    "draft": ["submitted"],
    "submitted": ["appraisee_self_assessment"],
    "appraisee_self_assessment": ["appraiser_evaluation"], 
    "appraiser_evaluation": ["reviewer_evaluation"],
    "reviewer_evaluation": ["complete"]
  }
};

export const evaluationData = {
  selfAssessmentTemplate: {
    goals: {
      "1": {
        self_comment: "Successfully completed all assigned tasks with high quality output",
        self_rating: 4
      },
      "2": {
        self_comment: "Actively collaborated with team members on cross-functional projects",
        self_rating: 5
      },
      "3": {
        self_comment: "Completed certification in new technology stack",
        self_rating: 4
      }
    }
  },
  appraisalEvaluationTemplate: {
    goals: {
      "1": {
        appraiser_comment: "Excellent project delivery with attention to detail",
        appraiser_rating: 4
      },
      "2": {
        appraiser_comment: "Strong collaboration skills demonstrated throughout the quarter",
        appraiser_rating: 5
      },
      "3": {
        appraiser_comment: "Good progress on skill development initiatives",
        appraiser_rating: 4
      }
    },
    appraiser_overall_rating: 4,
    appraiser_overall_comments: "Overall strong performance with consistent delivery and positive attitude"
  }
};

export const invalidWeightageScenarios = [
  {
    name: "Under 100% weightage",
    goals: [
      { title: "Goal 1", weightage: 30, category: "performance" },
      { title: "Goal 2", weightage: 40, category: "behavior" }
    ],
    expectedTotal: 70,
    expectedError: "Goal weightage must total 100%. Current total: 70%"
  },
  {
    name: "Over 100% weightage",
    goals: [
      { title: "Goal 1", weightage: 60, category: "performance" },
      { title: "Goal 2", weightage: 50, category: "behavior" }
    ],
    expectedTotal: 110,
    expectedError: "Goal weightage must total 100%. Current total: 110%"
  }
];

export default {
  testUsers,
  appraisalTemplates,
  goalCategories,
  statusTransitions,
  evaluationData,
  invalidWeightageScenarios
};
