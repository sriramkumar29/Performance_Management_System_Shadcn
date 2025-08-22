import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Plus, LayoutGrid } from 'lucide-react'

const CreateAppraisalButton = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const isManagerOrAbove = (roles?: string, level?: number | null) => {
    // Prefer explicit role names, fallback to hierarchy level if provided
    if (roles && /manager|lead|head|director|vp|chief|cxo|cto|ceo|admin/i.test(roles)) return true
    if (typeof level === 'number') return level > 2
    return false
  }

  // Only show button for managers or above
  if (!isManagerOrAbove(user?.emp_roles, user?.emp_roles_level)) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        onClick={() => navigate('/appraisal/create')}
        size="lg"
        className="bg-primary hover:bg-primary/90 text-primary-foreground border-primary hover:border-primary"
      >
        <Plus className="mr-2 h-4 w-4" />
        Create Appraisal
      </Button>


      <Button
        type="button"
        variant="outline"
        onClick={() => navigate('/goal-templates')}
        title="View and edit existing goal templates"
      >
        <LayoutGrid className="mr-2 h-4 w-4" />
        Manage Templates
      </Button>
    </div>
  )
}

export default CreateAppraisalButton
