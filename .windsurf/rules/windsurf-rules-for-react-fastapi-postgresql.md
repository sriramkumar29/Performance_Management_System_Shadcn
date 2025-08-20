---
trigger: always_on
---

#Windsurf AI Rules: React + TypeScript (Vite), FastAPI, PostgreSQL, Tailwind CSS, psycopg2

##Code Style & Structure

- Use functional, declarative programming (avoid classes).
- Separate concerns: UI, state, business logic, and API interactions.
- Follow DRY principles; extract reusable utilities and components.
- Prefer RORO pattern: Receive an Object, Return an Object.
- Use feature-based folder structure on both frontend and backend.
- write responsive design.

---

##Project Structure

### Frontend (`vite + react`)

```
src/
  components/
  pages/
  hooks/
  context/
  utils/
  types/
  assets/
```

### Backend (`fastapi`)

```
app/
  routers/
  services/
  models/
  schemas/
  db/
  core/
  middleware/
```

---

##Naming Conventions

- camelCase for variables/functions (TS).
- PascalCase for React components/types/interfaces.
- snake_case for Python variables, files, and database objects.
- UPPER_CASE for constants and environment variables.
- Folder names: lowercase with dashes (e.g., `user-profile`).

---

##Syntax & Formatting

- Format TypeScript using Prettier.
- Format Python using Black or Ruff.
- Use optional chaining (`?.`) and nullish coalescing (`??`) in TypeScript.
- Use one-liners for simple `if` statements.
- Avoid excessive nesting; use early returns.

---

##TypeScript Best Practices

- Enable strict mode in `tsconfig.json`.
- Use `interface` for props and models; use `type` for unions.
- Avoid `any`; use specific types or `unknown`.
- Use readonly and utility types (`Partial`, `Pick`, `Record`) when applicable.
- Always type props, API responses, and hooks.

---

### Styling & UI

- Use Tailwind CSS for styling.
- Use Shadcn UI for components.
- Use utility-first styling throughout the app.
- Use responsive design with `sm:`, `md:`, `lg:`, etc.
- Use `@apply` sparingly for reused classes.
- Keep classNames readable; break long chains into multiple lines if needed.

---

##FastAPI Guidelines

- Use `async def` for all route handlers.
- Organize routes by feature using routers (e.g., `user_router`, `auth_router`).
- Use `Depends()` for services and dependency injection.
- Validate all inputs and outputs using Pydantic v2 `BaseModel`.
- Prefer lifespan context managers over `@app.on_event`.
- Always check for an virtual environment before creating an new one.

---

##PostgreSQL Guidelines

- Use SQLAlchemy 2.0 (sync or async).
- Use snake_case for table and column names.
- Index foreign keys and frequently queried columns.
- Avoid raw SQL unless necessary; parameterize all queries.

---

##API Design

- Use RESTful route naming (`/users/{id}/posts`, `/orders/{order_id}`).
- Return typed responses using Pydantic models.
- Implement pagination and filtering in list endpoints.
- Use `status_code` and raise `HTTPException` for errors.
- Automatically document APIs using FastAPI’s OpenAPI.

---

##Performance Optimization

- Lazy load routes/components in React with `React.lazy` + `Suspense`.
- Use `useMemo`, `useCallback` to prevent re-renders.
- Optimize images using `vite-imagetools` or external CDN.
- Use async DB calls and avoid blocking I/O in FastAPI.
- Add indexes for common queries in PostgreSQL.

---

##Security

- Sanitize user inputs both client and server-side.
- Use HTTPS in production with secure cookies & CSRF tokens.
- Restrict CORS in FastAPI.
- Store secrets in `.env`, and never commit `.env`.
- Escape all raw SQL or use parameterized queries.
- Use `react-helmet` or meta headers to protect frontend.

---

##Internationalization (i18n)

- Use `react-i18next` with JSON-based translation files.
- Parse `Accept-Language` header in FastAPI for locale-aware responses.
- Support RTL layouts and dynamic font switching.
- Ensure all text is scaleable and not hardcoded.

---

##State Management (Frontend)

- Use `useState` and `useReducer` for local state.
- Use `React Context` for lightweight global state.
- Use `Zustand` or `React Query` for async/server state.
- Avoid overusing Redux unless necessary.

---

##Error Handling

- Use `ErrorBoundary` in React for global error catching.
- Use try-catch in async functions.
- Return typed `HTTPException` from FastAPI with helpful messages.
- Log errors using services like Sentry or LogRocket.
- Display fallback UI or toast notifications on failure.

---

##API Integration (Frontend)

- Use `fetch` or `axios` wrapped in a `useApi` hook.
- Use `AbortController` to cancel unused requests.
- Handle loading, success, and error states explicitly.
- Centralize API base URL and endpoints in one config file.

---

##Dev & Deployment

- Use `.env.local`, `.env.production` for Vite environments.
- Set up CORS and secure headers properly.
- Deploy via Vercel (frontend) and Railway/Fly.io/Render (backend).
- Use Nginx or Caddy as a reverse proxy in production.

---

##Accessibility

- Use semantic HTML (`<button>`, `<label>`, `<input>`).
- Add `aria-*` attributes and `role` when needed.
- Ensure all interactive elements are keyboard-navigable.
- Respect system theme (light/dark) and font scaling.

---

##Documentation

- Auto-generate API docs with FastAPI’s Swagger UI.
- Comment all public functions and exports in TypeScript.
- Maintain a `README.md` with setup instructions and `.env` variables.
- Use `Typedoc` (optional) for frontend type documentation.

---

##Key Rules Summary

1. Use **Vite** for fast builds, HMR, and optimized output.
2. Use **FastAPI + Pydantic** for declarative, typed APIs.
3. Manage global state wisely: minimal context, prefer API cache layers.
4. Follow **utility-first** styling with Tailwind CSS.
5. Enforce **code quality** via Prettier, Ruff, and Black.
6. Follow **responsive, accessible, and secure** design patterns.
7. Monitor performance and UX with appropriate dev tools.
8. Use **OpenAPI** and **typed errors** for a stable developer experience.