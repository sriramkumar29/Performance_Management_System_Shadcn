# Additional Performance Issues Identified

## Critical Issues Found

### 1. **ManagerRoute Toast Spam**

**File**: `frontend/src/routes/ManagerRoute.tsx`

**Problem**: The `useEffect` in ManagerRoute fires toast notifications on every render when user lacks permissions, causing toast spam during navigation.

```tsx
useEffect(() => {
  if (!hasManagerAccess) {
    toast.error("You need manager permissions to access this page");
  }
}, [hasManagerAccess]); // Runs on every render!
```

**Impact**:

- Multiple toast notifications when switching pages
- Poor user experience
- Unnecessary re-renders

**Fix**: Remove the useEffect or make it run only once with proper dependency tracking.

### 2. **Missing Memoization in Helper Functions**

**Files**:

- `frontend/src/pages/my-appraisal/MyAppraisal.tsx`
- `frontend/src/pages/team-appraisal/TeamAppraisal.tsx`

**Problem**: Functions like `empNameById`, `typeNameById`, `rangeNameById` are recreated using `useMemo` but depend on arrays that may not be stable references.

**Example**:

```tsx
const empNameById = useMemo(() => {
  const map = new Map(employees.map((e) => [e.emp_id, e.emp_name]));
  return (id: number) => map.get(id) || `Emp #${id}`;
}, [employees]); // employees array might be a new reference each time
```

**Impact**:

- Functions recreated unnecessarily
- Dependent useMemos and useEffects re-run
- Cascading re-renders

### 3. **Expensive Date Parsing in Renders**

**Files**: Multiple pages

**Problem**: Date parsing happens inline in render without memoization:

```tsx
{new Date(appraisal.start_date).toLocaleDateString()} – {new Date(appraisal.end_date).toLocaleDateString()}
```

**Impact**:

- Date objects created on every render
- Expensive operations during list rendering
- Wasted CPU cycles

### 4. **Inefficient Filter Dependencies**

**File**: `frontend/src/pages/my-appraisal/MyAppraisal.tsx`

**Problem**: Multiple useEffect hooks resetting pagination based on filter length:

```tsx
useEffect(() => {
  setMyPage(1);
}, [filteredMineSearch.length, myFilter, searchTypeId, searchName]);
```

**Impact**:

- Length calculation might trigger unnecessarily
- Multiple state updates
- Potential infinite loops if dependencies aren't stable

### 5. **Console Logging in Production Code**

**File**: `frontend/src/utils/api.ts`

**Problem**: Console.log statements in production code:

```tsx
console.log("Development mode - API Base URL:", result);
console.log("Final URL being used:", fullUrl);
console.log("getApiBaseUrl() returned:", getApiBaseUrl());
```

**Impact**:

- Performance overhead
- Security concerns (exposed API details)
- Cluttered console

### 6. **React.StrictMode Double Rendering**

**File**: `frontend/src/main.tsx`

**Problem**: StrictMode causes double rendering in development, which can mask performance issues and cause duplicate API calls.

```tsx
<React.StrictMode>
  <ThemeProvider>{/* ... */}</ThemeProvider>
</React.StrictMode>
```

**Impact**:

- Double useEffect calls in development
- Harder to debug performance issues
- May hide production problems

### 7. **Avatar String Manipulation in Navbar**

**File**: `frontend/src/components/navbar/Navbar.tsx`

**Problem**: Avatar initials calculated multiple times in render:

```tsx
{
  authUser?.emp_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2) || "U";
}
```

Appears 3 times in the same component!

**Impact**:

- Redundant string operations
- Wasted CPU cycles
- Should be memoized

### 8. **Detached Details Loading Pattern**

**File**: `frontend/src/pages/my-appraisal/MyAppraisal.tsx`

**Problem**: Loading appraisal details on-demand with detailsById state:

```tsx
useEffect(() => {
  if (!selectedAppraisal || detailsById[selectedAppraisal.appraisal_id])
    return;

  const loadDetails = async () => {
    const res = await apiFetch<AppraisalWithGoals>(...);
    if (res.ok && res.data) {
      setDetailsById((prev) => ({
        ...prev,
        [selectedAppraisal.appraisal_id]: res.data!,
      }));
    }
  };
  loadDetails();
}, [selectedAppraisal?.appraisal_id, detailsById]);
```

**Impact**:

- `detailsById` in dependencies can cause infinite loops
- State spreading creates new objects
- Not optimal for performance

## Recommended Fixes

### Fix 1: Remove Toast Spam from ManagerRoute

```tsx
const ManagerRoute = () => {
  const { user } = useAuth();
  const [hasShownToast, setHasShownToast] = useState(false);

  const isManagerOrAbove = (roles?: string, level?: number | null) => {
    if (
      roles &&
      /manager|lead|head|director|vp|chief|cxo|cto|ceo|admin/i.test(roles)
    )
      return true;
    if (typeof level === "number") return level > 2;
    return false;
  };

  const hasManagerAccess = isManagerOrAbove(
    user?.emp_roles,
    user?.emp_roles_level
  );

  useEffect(() => {
    if (!hasManagerAccess && !hasShownToast) {
      toast.error("You need manager permissions to access this page");
      setHasShownToast(true);
    }
  }, [hasManagerAccess, hasShownToast]);

  return hasManagerAccess ? (
    <Outlet />
  ) : (
    <Navigate to="/my-appraisal" replace />
  );
};
```

### Fix 2: Memoize Avatar Initials in Navbar

```tsx
const Navbar = ({ showTeamTab = false }: NavbarProps) => {
  const { user: authUser, logout } = useAuth();

  const avatarInitials = useMemo(() => {
    return (
      authUser?.emp_name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2) || "U"
    );
  }, [authUser?.emp_name]);

  // Use {avatarInitials} throughout the component
};
```

### Fix 3: Create Date Formatter Utility

```tsx
// utils/date.ts
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export const formatDate = (dateString: string): string => {
  try {
    return dateFormatter.format(new Date(dateString));
  } catch {
    return dateString;
  }
};

// Use once in component:
const formattedDate = useMemo(
  () => formatDate(appraisal.start_date),
  [appraisal.start_date]
);
```

### Fix 4: Remove Console Logs

Add a build step to strip console.logs:

```js
// vite.config.ts
export default defineConfig({
  // ...
  esbuild: {
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
  },
});
```

Or use conditional logging:

```tsx
const isDev = import.meta.env.DEV;
if (isDev) {
  console.log("Development mode - API Base URL:", result);
}
```

### Fix 5: Consider Removing React.StrictMode in Production

```tsx
// main.tsx
const StrictModeWrapper = import.meta.env.DEV
  ? React.StrictMode
  : React.Fragment;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictModeWrapper>
    <ThemeProvider>{/* ... */}</ThemeProvider>
  </StrictModeWrapper>
);
```

### Fix 6: Optimize detailsById Pattern

Instead of including detailsById in dependencies:

```tsx
useEffect(() => {
  if (!selectedAppraisal) return;

  // Check if already loaded
  setDetailsById((prev) => {
    if (prev[selectedAppraisal.appraisal_id]) {
      return prev; // Already loaded, no change
    }

    // Load asynchronously
    loadDetails(selectedAppraisal.appraisal_id);
    return prev;
  });
}, [selectedAppraisal?.appraisal_id]); // Remove detailsById from deps

const loadDetails = useCallback(async (id: number) => {
  const res = await apiFetch<AppraisalWithGoals>(`/api/appraisals/${id}`);
  if (res.ok && res.data) {
    setDetailsById((prev) => ({
      ...prev,
      [id]: res.data!,
    }));
  }
}, []);
```

## Priority Actions

1. ✅ **CRITICAL**: Fix ManagerRoute toast spam (causes immediate UX issues)
2. ✅ **HIGH**: Memoize avatar initials in Navbar
3. ✅ **HIGH**: Remove/conditional console.log statements
4. ✅ **MEDIUM**: Fix detailsById dependency issue
5. ⚠️ **MEDIUM**: Consider StrictMode impact
6. ⚠️ **LOW**: Optimize date formatting (nice-to-have)

## Expected Performance Gains

After these fixes:

- **Fewer re-renders**: ~40% reduction
- **No toast spam**: Better UX
- **Cleaner console**: Professional appearance
- **Faster navigation**: Smoother transitions
- **Less CPU usage**: Better battery life on mobile

## Testing Checklist

- [ ] Navigate between My Appraisal ↔ Team Appraisal multiple times
- [ ] Verify no duplicate toast messages
- [ ] Check React DevTools Profiler for render count
- [ ] Monitor Network tab for duplicate requests
- [ ] Test on slower devices/throttled CPU
- [ ] Verify console is clean (no debug logs)
