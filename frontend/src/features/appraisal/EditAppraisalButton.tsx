import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Edit } from "lucide-react";

interface EditAppraisalButtonProps {
  appraisalId: number;
  onSuccess?: () => void; // Kept for backward compatibility but not used
  variant?: "default" | "outline" | "ghost" | "elevated";
  className?: string;
}

const EditAppraisalButton = ({
  appraisalId,
  variant = "outline",
  className = "",
}: EditAppraisalButtonProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/appraisal/edit/${appraisalId}`);
  };

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      className={className}
      aria-label="Edit draft appraisal"
      title="Edit draft appraisal"
    >
      <Edit className="h-4 w-4 mr-1" />
      <span className="hidden sm:inline">Edit</span>
    </Button>
  );
};

export default EditAppraisalButton;
