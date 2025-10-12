import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import ManagerRoute from "./routes/ManagerRoute";
import Login from "./pages/auth/Login";
import MyAppraisal from "./pages/my-appraisal/MyAppraisal";
import TeamAppraisal from "./pages/team-appraisal/TeamAppraisal";
import SelfAssessment from "./pages/self-assessment/SelfAssessmentNew";
import AppraiserEvaluation from "./pages/appraiser-evaluation/AppraiserEvaluationNew";
import ReviewerEvaluation from "./pages/reviewer-evaluation/ReviewerEvaluationNew";
import AppraisalView from "./pages/appraisal-view/AppraisalViewNew";
import CreateAppraisal from "./pages/appraisal-create/CreateAppraisal";
import GoalTemplates from "./pages/goal-templates/GoalTemplates";

const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
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
        </Route>

        {/* Fallback to My Appraisal */}
        <Route path="*" element={<Navigate to="/my-appraisal" replace />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
