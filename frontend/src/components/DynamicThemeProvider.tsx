// This component is no longer needed as we've migrated to Shadcn UI
// Keeping as a pass-through component during migration
interface DynamicThemeProviderProps {
  children: React.ReactNode
}

const DynamicThemeProvider: React.FC<DynamicThemeProviderProps> = ({ children }) => {
  return <>{children}</>
}

export default DynamicThemeProvider
