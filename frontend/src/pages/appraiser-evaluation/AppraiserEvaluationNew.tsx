import { useParams } from "react-router-dom";
import AppraisalWorkflow from "../../components/AppraisalWorkflow";

const AppraiserEvaluation = () => {
  const { id } = useParams();

  if (!id) {
    return <div>Appraisal ID not found</div>;
  }

  return <AppraisalWorkflow appraisalId={id} mode="appraiser-evaluation" />;
};

export default AppraiserEvaluation;
