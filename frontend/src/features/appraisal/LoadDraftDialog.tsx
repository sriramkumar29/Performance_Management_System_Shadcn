import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { FileText, AlertCircle, Weight } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import dayjs from "dayjs";

interface DraftAppraisal {
  appraisal_id: number;
  appraisee_name: string;
  reviewer_name: string;
  appraisal_type_name: string;
  appraisal_range_name?: string;
  start_date?: string;
  end_date?: string;
  goals_count: number;
  total_weightage: number;
  created_at: string;
  updated_at: string;
}

interface LoadDraftDialogProps {
  open: boolean;
  draftAppraisal: DraftAppraisal | null;
  onLoadDraft: () => void;
  onStartFresh: () => void;
}

const LoadDraftDialog = ({
  open,
  draftAppraisal,
  onLoadDraft,
  onStartFresh,
}: LoadDraftDialogProps) => {
  if (!draftAppraisal) return null;

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "N/A";
    return dayjs(dateStr).format("MMM DD, YYYY");
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-semibold">
                Draft Appraisal Found
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                You have an existing draft appraisal with the same details
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Draft Details Card */}
          <div className="p-4 rounded-lg border border-border bg-card/50">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base">Draft Details</h3>
              </div>
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-700"
              >
                Draft
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Appraisee:</span>
                <p className="font-medium mt-0.5">
                  {draftAppraisal.appraisee_name}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Reviewer:</span>
                <p className="font-medium mt-0.5">
                  {draftAppraisal.reviewer_name}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>
                <p className="font-medium mt-0.5">
                  {draftAppraisal.appraisal_type_name}
                </p>
              </div>
              {draftAppraisal.appraisal_range_name && (
                <div>
                  <span className="text-muted-foreground">Range:</span>
                  <p className="font-medium mt-0.5">
                    {draftAppraisal.appraisal_range_name}
                  </p>
                </div>
              )}
              {draftAppraisal.start_date && draftAppraisal.end_date && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Period:</span>
                  <p className="font-medium mt-0.5">
                    {formatDate(draftAppraisal.start_date)} -{" "}
                    {formatDate(draftAppraisal.end_date)}
                  </p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Goals:</span>
                <p className="font-medium mt-0.5">
                  {draftAppraisal.goals_count} goal
                  {draftAppraisal.goals_count === 1 ? "" : "s"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Weightage:</span>
                <p className="font-medium mt-0.5">
                  <Weight className="h-4 w-4 inline mr-1" />
                  {draftAppraisal.total_weightage}%
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <p className="font-medium mt-0.5">
                  {formatDate(draftAppraisal.updated_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Information Message */}
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>What would you like to do?</strong>
              <br />
              <span className="text-blue-700">
                • <strong>Load Draft:</strong> Continue working on your existing
                draft appraisal
                <br />• <strong>Start Fresh:</strong> Create a new appraisal
                (the draft will remain unchanged)
              </span>
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="secondary"
            onClick={onStartFresh}
            className="w-full sm:w-auto"
          >
            Start Fresh
          </Button>
          <Button
            variant="default"
            onClick={onLoadDraft}
            className="w-full sm:w-auto bg-primary"
          >
            <FileText className="h-4 w-4 mr-2" />
            Load Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LoadDraftDialog;
