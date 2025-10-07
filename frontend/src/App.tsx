// This component is no longer used as the main app component.
// Navigation has been moved to the navbar and routing is handled by AppRouter.
// This file is kept for backward compatibility but redirects are handled in AppRouter.

function App() {
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Redirecting to My Appraisal...</p>
    </div>
  );
}

export default App;
