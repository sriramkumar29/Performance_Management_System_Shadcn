import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import Login from './pages/auth/Login'
import App from './App'
import SelfAssessment from './pages/self-assessment/SelfAssessment'
import AppraiserEvaluation from './pages/appraiser-evaluation/AppraiserEvaluation'
import ReviewerEvaluation from './pages/reviewer-evaluation/ReviewerEvaluation'
import AppraisalView from './pages/appraisal-view/AppraisalView'
import CreateAppraisal from './pages/appraisal-create/CreateAppraisal'
import GoalTemplates from './pages/goal-templates/GoalTemplates'
import EditGoalTemplate from './pages/goal-templates/EditGoalTemplate'

const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<App />} />
        <Route path="/self-assessment/:id" element={<SelfAssessment />} />
        <Route path="/appraiser-evaluation/:id" element={<AppraiserEvaluation />} />
        <Route path="/reviewer-evaluation/:id" element={<ReviewerEvaluation />} />
        <Route path="/appraisal/:id" element={<AppraisalView />} />
        <Route path="/appraisal/create" element={<CreateAppraisal />} />
        <Route path="/appraisal/edit/:id" element={<CreateAppraisal />} />
        <Route path="/goal-templates" element={<GoalTemplates />} />
        <Route path="/goal-templates/new" element={<EditGoalTemplate />} />
        <Route path="/goal-templates/:id/edit" element={<EditGoalTemplate />} />
        {/* Fallback to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </BrowserRouter>
)

export default AppRouter
