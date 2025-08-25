import Navbar from './components/navbar/Navbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs'
import MyAppraisal from './pages/my-appraisal/MyAppraisal'
import TeamAppraisal from './pages/team-appraisal/TeamAppraisal'
import { useAuth } from './contexts/AuthContext'
import CreateAppraisalButton from './features/appraisal/CreateAppraisalButton'
import { Toaster } from './components/ui/toaster'

function App() {
  const { user } = useAuth()
  const isManagerOrAbove = (roles?: string, level?: number | null) => {
    // Prefer explicit role names, fallback to hierarchy level if provided
    if (roles && /manager|lead|head|director|vp|chief|cxo|cto|ceo|admin/i.test(roles)) return true
    if (typeof level === 'number') return level > 2
    return false
  }

  const showTeamTab = isManagerOrAbove(user?.emp_roles, user?.emp_roles_level)

  return (
    <>
      <Navbar />
      <main className="px-3 sm:px-6 py-4 sm:py-6">
        <div className="container w-full">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-foreground">
              Performance Management
            </h1>
            <CreateAppraisalButton />
          </div>
          <div className="bg-card rounded-md border border-border p-4 shadow-sm w-full">
            <Tabs defaultValue="my-appraisal" className="w-full">
              <div className="flex justify-center">
                <TabsList>
                  <TabsTrigger value="my-appraisal">My Appraisal</TabsTrigger>
                  {showTeamTab && (
                    <TabsTrigger value="team-appraisal">Team Appraisal</TabsTrigger>
                  )}
                </TabsList>
              </div>
              <TabsContent value="my-appraisal">
                <MyAppraisal />
              </TabsContent>
              {showTeamTab && (
                <TabsContent value="team-appraisal">
                  <TeamAppraisal />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </main>
      <Toaster />
    </>
  )
}

export default App
