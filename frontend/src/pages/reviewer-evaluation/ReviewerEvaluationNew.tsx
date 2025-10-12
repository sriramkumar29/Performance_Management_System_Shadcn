import { useParams } from "react-router-dom";
import AppraisalWorkflow from "../../components/AppraisalWorkflow";

const ReviewerEvaluation = () => {
  const { id } = useParams();

  if (!id) {
    return <div>Appraisal ID not found</div>;
  }

  return <AppraisalWorkflow appraisalId={id} mode="reviewer-evaluation" />;
};

export default ReviewerEvaluation;
