import { useParams, useSearchParams } from "react-router-dom";
import AppraisalWorkflow from "../../components/AppraisalWorkflow";

const SelfAssessment = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isReadOnly = searchParams.get("readonly") === "true";

  if (!id) {
    return <div>Appraisal ID not found</div>;
  }

  return (
    <AppraisalWorkflow
      appraisalId={id}
      mode="self-assessment"
      isReadOnly={isReadOnly}
    />
  );
};

export default SelfAssessment;
