import { useState } from "react";
import { Button } from "../../components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "../../utils/api";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";

interface DeleteAppraisalButtonProps {
  appraisalId: number;
  appraisalTitle?: string;
  onSuccess?: () => void;
  className?: string;
}

const DeleteAppraisalButton = ({
  appraisalId,
  appraisalTitle,
  onSuccess,
  className = "",
}: DeleteAppraisalButtonProps) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await apiFetch(`/api/appraisals/${appraisalId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(res.error || "Failed to delete appraisal");
      }
      toast.success("Appraisal deleted");
      onSuccess?.();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={BUTTON_STYLES.DELETE.variant}
          size={BUTTON_STYLES.DELETE.size}
          disabled={deleting}
          className={`${BUTTON_STYLES.DELETE.className} ${className}`}
          aria-label={deleting ? "Deleting…" : "Delete appraisal"}
          title={deleting ? "Deleting…" : "Delete appraisal"}
        >
          <Trash2 className={ICON_SIZES.DEFAULT} aria-hidden="true" />
          <span className="hidden sm:inline sm:ml-2">
            {deleting ? "Deleting…" : "Delete"}
          </span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="shadow-large">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">
            Delete appraisal?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            This action cannot be undone. This will permanently delete the draft
            appraisal{appraisalTitle ? ` "${appraisalTitle}"` : ""}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="hover:shadow-soft transition-shadow">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="hover:shadow-glow transition-shadow bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirm delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAppraisalButton;
