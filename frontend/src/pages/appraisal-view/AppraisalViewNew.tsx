import { useParams } from "react-router-dom";
import AppraisalWorkflow from "../../components/AppraisalWorkflow";

const AppraisalView = () => {
  const { id } = useParams();

  if (!id) {
    return <div>Appraisal ID not found</div>;
  }

  return (
    <AppraisalWorkflow
      appraisalId={id}
      mode="appraisal-view"
      isReadOnly={true}
    />
  );
};

export default AppraisalView;
