# Data Directory

This directory contains seed data, sample data, and data-related files for the Performance Management System.

## 📁 Directory Structure

```
data/
├── README.md                   # This index file
├── seed/                       # Database seed data scripts
│   ├── seed_appraisal_types.py
│   ├── seed_categories_simple.py
│   ├── seed_data.py
│   ├── seed_goal_templates.py
│   └── seed_test_data.py
└── samples/                    # Sample data files
    └── dataLookup.sql
```

## 📋 Data Categories

### 🌱 Seed Data (`seed/`)

Database initialization and seeding scripts for:

- **seed_appraisal_types.py**: Appraisal type configurations
- **seed_categories_simple.py**: Goal category definitions
- **seed_data.py**: Core application data
- **seed_goal_templates.py**: Goal template configurations
- **seed_test_data.py**: Test environment data

### 📊 Sample Data (`samples/`)

- **dataLookup.sql**: Sample SQL queries and data lookups

## 🚀 Usage

### Running Seed Scripts

```bash
cd backend
python seed_data.py                 # Core data
python seed_appraisal_types.py      # Appraisal types
python seed_goal_templates.py       # Goal templates
python seed_test_data.py            # Test data
```

### Database Setup

1. Ensure database connection is configured
2. Run seed scripts in order of dependencies
3. Verify data integrity after seeding

## ⚠️ Important Notes

- Always backup database before running seed scripts
- Test seed scripts in development environment first
- Some scripts may require specific environment variables
- Check database constraints before running bulk operations

## 🔄 Data Flow

```
seed_data.py → seed_appraisal_types.py → seed_goal_templates.py → seed_test_data.py
```
