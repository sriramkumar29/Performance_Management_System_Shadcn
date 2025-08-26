# React to Angular Migration Guide

## Overview

This document provides a comprehensive guide for migrating the Performance Management System frontend from **React 19.1.1 + TypeScript + Vite** to **Angular 18** (latest stable version as of 2024).

---

## Current React Stack Analysis

### **Current Architecture**

- **Framework**: React 19.1.1 with TypeScript
- **Build Tool**: Vite 7.1.0
- **Styling**: Tailwind CSS 4.1.11
- **Component Library**: Radix UI (Shadcn UI)
- **Routing**: React Router DOM 7.8.0
- **State Management**: Context API (AuthContext, ThemeContext)
- **Icons**: Lucide React
- **Theming**: next-themes
- **Utilities**: clsx, tailwind-merge, class-variance-authority

### **Current Project Structure**

```
src/
├── components/
│   ├── ui/                 # Shadcn UI components
│   ├── navbar/
│   └── shared components
├── pages/                  # Route components
│   ├── appraisal-create/
│   ├── appraisal-view/
│   ├── auth/
│   └── ...
├── contexts/              # React Context providers
├── features/              # Feature-specific components
├── hooks/                 # Custom React hooks
├── utils/                 # Utility functions
└── routes/                # Route definitions
```

---

## Target Angular 18 Stack

### **Recommended Angular Architecture**

- **Framework**: Angular 18 (LTS)
- **Build Tool**: Angular CLI with Webpack/esbuild
- **Styling**: Tailwind CSS (compatible with Angular)
- **Component Library**: Angular Material or PrimeNG
- **Routing**: Angular Router
- **State Management**: NgRx (or Angular Signals)
- **Forms**: Angular Reactive Forms
- **HTTP**: Angular HttpClient
- **Icons**: Angular Material Icons or Lucide Angular
- **Theming**: Angular Material Theming or Custom CSS Variables

### **Target Project Structure**

```
src/
├── app/
│   ├── core/              # Singleton services, guards
│   ├── shared/            # Shared components, directives, pipes
│   ├── features/          # Feature modules
│   │   ├── appraisal/
│   │   ├── auth/
│   │   └── goal-templates/
│   ├── layouts/           # Layout components
│   └── app.component.ts
├── assets/                # Static assets
└── environments/          # Environment configurations
```

---

## Phase-by-Phase Migration Strategy

### **Phase 1: Project Setup & Core Infrastructure**

#### Step 1: Create New Angular Project

```bash
# Install Angular CLI globally
npm install -g @angular/cli@18

# Create new Angular project
ng new performance-management-angular --routing --style=scss --strict

# Navigate to project
cd performance-management-angular
```

#### Step 2: Install Dependencies

```bash
# Core UI libraries
ng add @angular/material
ng add @ngrx/store
ng add @ngrx/effects

# Tailwind CSS setup
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init

# Additional utilities
npm install dayjs clsx
npm install lucide-angular
```

#### Step 3: Configure Tailwind CSS

```typescript
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        // Migrate your current theme colors
      },
    },
  },
  plugins: [],
};
```

#### Step 4: Setup Angular Material with Custom Theme

```scss
// styles.scss
@use "@angular/material" as mat;
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";

// Define custom theme
$primary-palette: mat.define-palette(mat.$blue-palette);
$accent-palette: mat.define-palette(mat.$pink-palette);
$theme: mat.define-light-theme(
  (
    color: (
      primary: $primary-palette,
      accent: $accent-palette,
    ),
  )
);

@include mat.all-component-themes($theme);
```

### **Phase 2: Core Services Migration**

#### Step 1: Migrate AuthContext to Angular Service

```typescript
// src/app/core/services/auth.service.ts
@Injectable({ providedIn: "root" })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredUser();
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>("/api/auth/login", credentials).pipe(
      tap((response) => {
        localStorage.setItem("token", response.token);
        this.currentUserSubject.next(response.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem("token");
    this.currentUserSubject.next(null);
    this.router.navigate(["/login"]);
  }

  private loadStoredUser(): void {
    const token = localStorage.getItem("token");
    if (token) {
      // Validate and load user
    }
  }
}
```

#### Step 2: Create HTTP Interceptor for Authentication

```typescript
// src/app/core/interceptors/auth.interceptor.ts
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const token = localStorage.getItem("token");

    if (token) {
      const authReq = req.clone({
        headers: req.headers.set("Authorization", `Bearer ${token}`),
      });
      return next.handle(authReq);
    }

    return next.handle(req);
  }
}
```

#### Step 3: Implement Route Guards

```typescript
// src/app/core/guards/auth.guard.ts
@Injectable({ providedIn: "root" })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map((user) => {
        if (user) return true;
        this.router.navigate(["/login"]);
        return false;
      })
    );
  }
}
```

### **Phase 3: Component Migration**

#### Step 1: Create Angular Component Structure

```typescript
// src/app/shared/components/navbar/navbar.component.ts
@Component({
  selector: "app-navbar",
  template: `
    <mat-toolbar color="primary" class="bg-background border-b border-border">
      <span class="text-gradient font-bold text-lg"
        >Performance Management</span
      >
      <span class="flex-1"></span>
      <app-theme-toggle></app-theme-toggle>
      <button mat-button (click)="logout()" class="ml-4">
        <mat-icon>logout</mat-icon>
        Logout
      </button>
    </mat-toolbar>
  `,
  styleUrls: ["./navbar.component.scss"],
})
export class NavbarComponent {
  constructor(private authService: AuthService) {}

  logout(): void {
    this.authService.logout();
  }
}
```

#### Step 2: Migrate React Hooks to Angular Patterns

```typescript
// React Hook Pattern
const [loading, setLoading] = useState(false);
const [data, setData] = useState([]);

// Angular Service Pattern
@Injectable()
export class AppraisalService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private dataSubject = new BehaviorSubject<Appraisal[]>([]);

  loading$ = this.loadingSubject.asObservable();
  data$ = this.dataSubject.asObservable();

  fetchAppraisals(): void {
    this.loadingSubject.next(true);
    this.http
      .get<Appraisal[]>("/api/appraisals")
      .pipe(finalize(() => this.loadingSubject.next(false)))
      .subscribe((data) => this.dataSubject.next(data));
  }
}
```

#### Step 3: Create Reusable UI Components

```typescript
// src/app/shared/components/button/button.component.ts
@Component({
  selector: "app-button",
  template: `
    <button
      [class]="buttonClasses"
      [disabled]="disabled || loading"
      (click)="onClick.emit($event)"
    >
      <mat-icon *ngIf="loading" class="animate-spin mr-2">refresh</mat-icon>
      <mat-icon *ngIf="icon && !loading" class="mr-2">{{ icon }}</mat-icon>
      <ng-content></ng-content>
    </button>
  `,
})
export class ButtonComponent {
  @Input() variant: "primary" | "secondary" | "outline" = "primary";
  @Input() size: "sm" | "md" | "lg" = "md";
  @Input() disabled = false;
  @Input() loading = false;
  @Input() icon?: string;
  @Output() onClick = new EventEmitter<Event>();

  get buttonClasses(): string {
    return clsx(
      "inline-flex items-center justify-center rounded-md font-medium transition-colors",
      {
        "bg-primary text-primary-foreground hover:bg-primary/90":
          this.variant === "primary",
        "bg-secondary text-secondary-foreground hover:bg-secondary/80":
          this.variant === "secondary",
        "border border-input bg-background hover:bg-accent":
          this.variant === "outline",
        "h-8 px-3 text-sm": this.size === "sm",
        "h-10 px-4": this.size === "md",
        "h-12 px-6": this.size === "lg",
        "opacity-50 cursor-not-allowed": this.disabled || this.loading,
      }
    );
  }
}
```

### **Phase 4: Routing Migration**

#### Step 1: Setup Angular Router

```typescript
// src/app/app-routing.module.ts
const routes: Routes = [
  { path: "", redirectTo: "/dashboard", pathMatch: "full" },
  { path: "login", component: LoginComponent },
  {
    path: "dashboard",
    component: DashboardComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "appraisals",
    loadChildren: () =>
      import("./features/appraisal/appraisal.module").then(
        (m) => m.AppraisalModule
      ),
    canActivate: [AuthGuard],
  },
  {
    path: "goal-templates",
    loadChildren: () =>
      import("./features/goal-templates/goal-templates.module").then(
        (m) => m.GoalTemplatesModule
      ),
    canActivate: [AuthGuard],
  },
];
```

#### Step 2: Feature Module Structure

```typescript
// src/app/features/appraisal/appraisal-routing.module.ts
const routes: Routes = [
  { path: "", component: AppraisalListComponent },
  { path: "create", component: CreateAppraisalComponent },
  { path: ":id", component: AppraisalViewComponent },
  { path: ":id/edit", component: EditAppraisalComponent },
];
```

### **Phase 5: State Management Migration**

#### Step 1: Setup NgRx Store

```typescript
// src/app/store/app.state.ts
export interface AppState {
  auth: AuthState;
  appraisals: AppraisalState;
  themes: ThemeState;
}

// src/app/store/auth/auth.reducer.ts
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
};

export const authReducer = createReducer(
  initialState,
  on(AuthActions.login, (state) => ({ ...state, loading: true, error: null })),
  on(AuthActions.loginSuccess, (state, { user }) => ({
    ...state,
    user,
    loading: false,
  })),
  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false,
  }))
);
```

#### Step 2: Create Effects for API Calls

```typescript
// src/app/store/auth/auth.effects.ts
@Injectable()
export class AuthEffects {
  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      switchMap(({ credentials }) =>
        this.authService.login(credentials).pipe(
          map((response) => AuthActions.loginSuccess({ user: response.user })),
          catchError((error) =>
            of(AuthActions.loginFailure({ error: error.message }))
          )
        )
      )
    )
  );

  constructor(private actions$: Actions, private authService: AuthService) {}
}
```

### **Phase 6: Form Migration**

#### Step 1: Migrate React Hook Form to Angular Reactive Forms

```typescript
// React Hook Form Pattern
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm();

// Angular Reactive Forms Pattern
@Component({
  template: `
    <form [formGroup]="appraisalForm" (ngSubmit)="onSubmit()">
      <mat-form-field>
        <mat-label>Appraisal Type</mat-label>
        <mat-select formControlName="appraisalType">
          <mat-option *ngFor="let type of appraisalTypes" [value]="type.id">
            {{ type.name }}
          </mat-option>
        </mat-select>
        <mat-error
          *ngIf="appraisalForm.get('appraisalType')?.hasError('required')"
        >
          Appraisal type is required
        </mat-error>
      </mat-form-field>
    </form>
  `,
})
export class CreateAppraisalComponent {
  appraisalForm = this.fb.group({
    appraisalType: ["", Validators.required],
    appraisee: ["", Validators.required],
    startDate: ["", Validators.required],
    endDate: ["", Validators.required],
  });

  constructor(private fb: FormBuilder) {}

  onSubmit(): void {
    if (this.appraisalForm.valid) {
      // Submit form
    }
  }
}
```

### **Phase 7: Theme Migration**

#### Step 1: Implement Angular Theme Service

```typescript
// src/app/core/services/theme.service.ts
@Injectable({ providedIn: "root" })
export class ThemeService {
  private darkMode = new BehaviorSubject<boolean>(false);
  darkMode$ = this.darkMode.asObservable();

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.initializeTheme();
  }

  toggleTheme(): void {
    const isDark = !this.darkMode.value;
    this.darkMode.next(isDark);
    this.updateTheme(isDark);
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const isDark = savedTheme === "dark" || (!savedTheme && prefersDark);
    this.darkMode.next(isDark);
    this.updateTheme(isDark);
  }

  private updateTheme(isDark: boolean): void {
    const theme = isDark ? "dark" : "light";
    this.document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }
}
```

---

## Component Mapping Guide

### **React → Angular Component Equivalents**

| React Pattern                                      | Angular Equivalent                  |
| -------------------------------------------------- | ----------------------------------- |
| `useState`                                         | `BehaviorSubject` or `signal()`     |
| `useEffect`                                        | `ngOnInit()`, `ngOnDestroy()`       |
| `useContext`                                       | Service injection                   |
| `useMemo`                                          | `computed()` or pipe with operators |
| `useCallback`                                      | Class methods                       |
| React Router `<Link>`                              | `routerLink` directive              |
| React Router `useNavigate`                         | `Router.navigate()`                 |
| `className={clsx()}`                               | `[class]` binding with function     |
| Conditional rendering `{condition && <Component>}` | `*ngIf="condition"`                 |
| List rendering `{items.map()}`                     | `*ngFor="let item of items"`        |
| Event handlers `onClick={handler}`                 | `(click)="handler()"`               |

### **UI Library Migration**

| Radix UI / Shadcn | Angular Material Equivalent        |
| ----------------- | ---------------------------------- |
| `<Button>`        | `<button mat-button>`              |
| `<Dialog>`        | `<mat-dialog>`                     |
| `<Select>`        | `<mat-select>`                     |
| `<Tabs>`          | `<mat-tab-group>`                  |
| `<Progress>`      | `<mat-progress-bar>`               |
| `<Avatar>`        | Custom component with `<mat-icon>` |
| `<Toast>`         | `MatSnackBar` service              |
| `<Dropdown>`      | `<mat-menu>`                       |

---

## Migration Timeline & Effort Estimation

### **Phase 1: Setup & Infrastructure** (1-2 weeks)

- Project setup and tooling configuration
- Core services and interceptors
- Basic routing structure

### **Phase 2: Authentication & Core Services** (1 week)

- Auth service migration
- HTTP interceptors
- Route guards

### **Phase 3: UI Components Migration** (2-3 weeks)

- Shared components library
- Theme system implementation
- Form components

### **Phase 4: Feature Components** (3-4 weeks)

- Appraisal management pages
- Goal template management
- User dashboard

### **Phase 5: State Management** (1-2 weeks)

- NgRx store setup
- Actions, reducers, effects
- Component integration

### **Phase 6: Testing & Polish** (1-2 weeks)

- Unit tests
- E2E tests
- Performance optimization
- Bug fixes

**Total Estimated Timeline: 9-14 weeks**

---

## Best Practices & Recommendations

### **Architecture Principles**

1. **Feature-based Module Structure**: Organize by business features
2. **Lazy Loading**: Load feature modules on demand
3. **Dependency Injection**: Use Angular's DI system effectively
4. **Reactive Programming**: Leverage RxJS for data flow
5. **Type Safety**: Maintain strict TypeScript configuration

### **Performance Considerations**

1. **OnPush Change Detection**: Use for better performance
2. **Track By Functions**: Optimize `*ngFor` rendering
3. **Async Pipe**: Prevent memory leaks
4. **Tree Shaking**: Remove unused code
5. **Bundle Analysis**: Monitor bundle size

### **Code Quality**

1. **Angular Style Guide**: Follow official conventions
2. **ESLint & Prettier**: Maintain code consistency
3. **Unit Testing**: Use Jasmine/Jest + Angular Testing Library
4. **E2E Testing**: Use Cypress or Playwright

---

## Risk Assessment & Mitigation

### **High Risk Areas**

1. **Complex State Logic**: Carefully migrate Context patterns to NgRx
2. **Custom Hooks**: Require complete redesign as services
3. **Third-party Libraries**: Ensure Angular compatibility
4. **Performance**: Monitor for regression during migration

### **Mitigation Strategies**

1. **Incremental Migration**: Migrate one feature at a time
2. **Parallel Development**: Run both versions temporarily
3. **Automated Testing**: Maintain test coverage throughout
4. **Feature Parity**: Ensure no functionality is lost

---

## Deployment & DevOps Changes

### **Build Process**

```bash
# Development
ng serve

# Production build
ng build --configuration production

# Docker configuration update needed
# Update CI/CD pipelines for Angular CLI
```

### **Environment Configuration**

```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: "https://api.yourdomain.com",
  version: "2.0.0",
};
```

---

## Conclusion

This migration from React to Angular 18 will provide:

- **Better Enterprise Support**: Angular's opinionated structure
- **Improved Type Safety**: Enhanced TypeScript integration
- **Mature Ecosystem**: Comprehensive tooling and libraries
- **Long-term Stability**: Regular LTS releases

**Next Steps:**

1. Review and approve this migration plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Establish testing and QA processes
5. Plan gradual rollout strategy

---

## Additional Resources

- [Angular 18 Documentation](https://angular.io/docs)
- [Angular Material Components](https://material.angular.io/)
- [NgRx State Management](https://ngrx.io/)
- [Angular Style Guide](https://angular.io/guide/styleguide)
- [Migration Tools](https://angular.io/guide/updating)
