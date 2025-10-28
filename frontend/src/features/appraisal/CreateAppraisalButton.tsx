import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import { Plus, LayoutGrid } from "lucide-react";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";
import { isManagerOrAbove } from "../../utils/roleHelpers";

const CreateAppraisalButton = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Only show button for managers or above (roleHelpers excludes Admin)
  if (!isManagerOrAbove(user?.role_id, user?.role?.role_name)) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        onClick={() => navigate("/appraisal/create")}
        variant={BUTTON_STYLES.CREATE.variant}
        size={BUTTON_STYLES.CREATE.size}
        className={BUTTON_STYLES.CREATE.className}
        aria-label="Create appraisal"
        title="Create appraisal"
      >
        <Plus className={ICON_SIZES.DEFAULT} />
        <span className="hidden sm:inline sm:ml-2">Create Appraisal</span>
      </Button>

      <Button
        type="button"
        variant={BUTTON_STYLES.VIEW.variant}
        onClick={() => navigate("/goal-templates")}
        title="Manage goal templates"
        aria-label="Manage goal templates"
      >
        <LayoutGrid className={ICON_SIZES.DEFAULT} />
        <span className="hidden sm:inline sm:ml-2">Manage Templates</span>
      </Button>
    </div>
  );
};

export default CreateAppraisalButton;
