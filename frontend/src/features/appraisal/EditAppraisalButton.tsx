import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Edit } from "lucide-react";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";

interface EditAppraisalButtonProps {
  appraisalId: number;
  onSuccess?: () => void; // Kept for backward compatibility but not used
  className?: string;
}

const EditAppraisalButton = ({
  appraisalId,
  className = "",
}: EditAppraisalButtonProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/appraisal/edit/${appraisalId}`);
  };

  return (
    <Button
      variant={BUTTON_STYLES.EDIT.variant}
      size={BUTTON_STYLES.EDIT.size}
      onClick={handleClick}
      className={`${BUTTON_STYLES.EDIT.className} ${className}`}
      aria-label="Edit draft appraisal"
      title="Edit draft appraisal"
    >
      <Edit className={ICON_SIZES.DEFAULT} />
      <span className="hidden sm:inline sm:ml-2">Edit</span>
    </Button>
  );
};

export default EditAppraisalButton;
