import { useParams, useSearchParams } from "react-router-dom";
import AppraisalWorkflow from "../../components/AppraisalWorkflow";

const AppraisalView = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fromPage = searchParams.get("from");
  const fromTab = searchParams.get("tab");

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
