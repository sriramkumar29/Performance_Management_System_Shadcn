# Performance Management System - Angular Frontend

This is the Angular 18 version of the Performance Management System frontend, migrated from React.

## Tech Stack

- **Framework**: Angular 18 (LTS)
- **Build Tool**: Angular CLI with Webpack/esbuild
- **Styling**: Tailwind CSS
- **Component Library**: Angular Material
- **Routing**: Angular Router
- **State Management**: NgRx
- **Forms**: Angular Reactive Forms
- **HTTP**: Angular HttpClient
- **Icons**: Angular Material Icons
- **Theming**: Custom CSS Variables with Angular Material

## Project Structure

```
src/
├── app/
│   ├── core/                 # Singleton services, guards, interceptors
│   │   ├── services/         # Auth, Theme services
│   │   ├── guards/           # Route guards
│   │   └── interceptors/     # HTTP interceptors
│   ├── shared/               # Shared components, directives, pipes
│   │   └── components/       # Reusable UI components
│   ├── features/             # Feature modules
│   │   ├── auth/             # Authentication feature
│   │   ├── dashboard/        # Dashboard feature
│   │   ├── appraisal/        # Appraisal management
│   │   └── goal-templates/   # Goal template management
│   ├── store/                # NgRx store
│   │   └── auth/             # Auth state management
│   └── app.component.ts      # Root component
├── environments/             # Environment configurations
└── styles.scss              # Global styles
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Angular CLI

### Installation

1. Navigate to the frontend-angular directory:
```bash
cd frontend-angular
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:4200`.

### Build for Production

```bash
npm run build
```

## Features Implemented

### ✅ Core Infrastructure
- Angular 18 project setup with standalone components
- Tailwind CSS integration with custom theme
- Angular Material UI components
- NgRx state management
- HTTP interceptors for authentication
- Route guards for protected routes
- Theme service with dark/light mode support

### ✅ Authentication
- Login component with reactive forms
- JWT token management
- Role-based access control
- Auth state management with NgRx

### ✅ Navigation
- Responsive navbar with user menu
- Theme toggle component
- Protected routing structure

### ✅ Dashboard
- Role-based dashboard with quick actions
- Navigation cards for different features
- Responsive design

### 🚧 In Progress
- Appraisal management components
- Goal template management
- Advanced UI components library

## Environment Configuration

Update the environment files with your API endpoints:

- `src/environments/environment.ts` - Development
- `src/environments/environment.prod.ts` - Production

## Migration Status

This Angular application is being migrated from the existing React frontend. The following components are ready for migration:

1. **My Appraisals** - View and manage personal appraisals
2. **Team Appraisals** - Manage team member appraisals
3. **Create Appraisal** - Create new performance appraisals
4. **Goal Templates** - Manage reusable goal templates

## Development Guidelines

- Use standalone components for better tree-shaking
- Follow Angular style guide conventions
- Use OnPush change detection for performance
- Implement proper error handling and loading states
- Maintain responsive design with Tailwind CSS
- Use Angular Material components consistently
- Follow the established folder structure

## Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run unit tests
- `npm run lint` - Run ESLint

## Contributing

1. Follow the established project structure
2. Use TypeScript strictly
3. Implement proper error handling
4. Add unit tests for new components
5. Follow the design system established in the React version
6. Ensure responsive design compatibility
