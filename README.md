# Performance Management System

A comprehensive performance management application built with FastAPI backend and React frontend.

## 📁 Project Structure

```
Performance_Management_System/
├── README.md                       # This file
├── backend/                        # FastAPI backend application
├── frontend/                       # React frontend application
├── docs/                          # 📚 Documentation
│   ├── api/                       # API documentation
│   ├── testing/                   # Testing documentation
│   └── reports/                   # Progress reports
├── data/                          # 🗄️ Data files
│   ├── seed/                      # Database seed scripts
│   └── samples/                   # Sample data files
├── resources/                     # 📎 Resource files
│   ├── documents/                 # Word documents (.docx)
│   └── spreadsheets/             # Excel files (.xlsx)
├── run_backend_tests.ps1          # Backend test runner
├── run_frontend_tests.ps1         # Frontend test runner
└── Other configuration files...
```

## 🚀 Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Testing

```powershell
# Backend tests
.\run_backend_tests.ps1 all

# Frontend tests
.\run_frontend_tests.ps1 all
```

## 📚 Documentation

- **[API Documentation](docs/api/)** - REST API specifications and improvements
- **[Testing Guide](docs/testing/)** - Comprehensive testing documentation
- **[Progress Reports](docs/reports/)** - Development progress and status

## 🗄️ Data & Resources

- **[Seed Data](data/seed/)** - Database initialization scripts
- **[Sample Data](data/samples/)** - Test and reference data
- **[Documents](resources/documents/)** - Word documents and specifications
- **[Spreadsheets](resources/spreadsheets/)** - Excel files and data analysis

## 🛠️ Development

This project follows modern development practices with:

- Organized test structure (unit, integration, e2e)
- Comprehensive documentation
- Automated testing scripts
- Clean separation of concerns
- RESTful API design principles

For detailed information, see the respective documentation in the `docs/` directory.
