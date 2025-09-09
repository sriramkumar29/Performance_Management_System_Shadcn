SELECT * FROM employees;

SELECT * FROM appraisals;

SELECT * FROM appraisal_types;

SELECT * FROM appraisal_ranges;

SELECT * FROM categories;

SELECT * FROM goal_template_categories;

SELECT * FROM goals;

SELECT * FROM goals_template;

SELECT * FROM appraisal_goals;

SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public';