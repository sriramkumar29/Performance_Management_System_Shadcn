import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import ManagerRoute from "./routes/ManagerRoute";
import AdminRoute from "./routes/AdminRoute";
import Login from "./pages/auth/Login";
import ResetPassword from "./pages/auth/ResetPassword";
import ForgotPassword from "./pages/auth/ForgotPassword";
import MicrosoftCallback from "./pages/auth/MicrosoftCallback";
import MyAppraisal from "./pages/my-appraisal/MyAppraisal";
import TeamAppraisal from "./pages/team-appraisal/TeamAppraisal";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAppraisals from "./pages/admin/AdminAppraisals";
import SelfAssessment from "./pages/self-assessment/SelfAssessmentNew";
import AppraiserEvaluation from "./pages/appraiser-evaluation/AppraiserEvaluationNew";
import ReviewerEvaluation from "./pages/reviewer-evaluation/ReviewerEvaluationNew";
import AppraisalView from "./pages/appraisal-view/AppraisalViewNew";
import CreateAppraisal from "./pages/appraisal-create/CreateAppraisal";
import GoalTemplates from "./pages/goal-templates/GoalTemplates";
import GoalTemplatesByRole from "./pages/goal-templates-by-role/GoalTemplatesByRole";
import CreateHeaderWithTemplates from "./pages/goal-templates/CreateHeaderWithTemplates";
import CreateAppraisalModal from "./features/appraisal/CreateAppraisalModal";

// Route wrapper that provides the modal's required props.
const CreateAppraisalModalRoute = () => {
  const navigate = useNavigate();
  const handleClose = () => navigate("/team-appraisal");
  return <CreateAppraisalModal open={true} onClose={handleClose} />;
};

const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<MicrosoftCallback />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/my-appraisal" replace />} />
        <Route path="/my-appraisal" element={<MyAppraisal />} />
        <Route path="/self-assessment/:id" element={<SelfAssessment />} />
        <Route
          path="/appraiser-evaluation/:id"
          element={<AppraiserEvaluation />}
        />
        <Route
          path="/reviewer-evaluation/:id"
          element={<ReviewerEvaluation />}
        />
        <Route path="/appraisal/:id" element={<AppraisalView />} />

        {/* Manager-only routes */}
        <Route element={<ManagerRoute />}>
          <Route path="/team-appraisal" element={<TeamAppraisal />} />
          <Route path="/appraisal/create" element={<CreateAppraisal />} />
          <Route path="/appraisal/edit/:id" element={<CreateAppraisal />} />
          <Route path="/goal-templates" element={<GoalTemplates />} />
          <Route
            path="/goal-templates/new-header"
            element={<CreateHeaderWithTemplates />}
          />
          <Route
            path="/goal-templates-by-role"
            element={<GoalTemplatesByRole />}
          />
          <Route
            path="/appraisal/createmodal"
            element={<CreateAppraisalModalRoute />}
          />
        </Route>

        {/* Admin-only routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/appraisals" element={<AdminAppraisals />} />
        </Route>

        {/* Fallback to My Appraisal */}
        <Route path="*" element={<Navigate to="/my-appraisal" replace />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
