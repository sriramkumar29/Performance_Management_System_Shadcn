import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  User,
  UserCheck,
  CheckCircle,
  Clock,
  UserCircle,
  FileText,
  Calendar,
  TrendingUp,
} from "lucide-react";

type Appraisal = {
  appraisal_id: number;
  appraisee_id: number;
  appraiser_id: number;
  reviewer_id: number;
  appraisal_type_id: number;
  appraisal_type_range_id?: number | null;
  start_date: string;
  end_date: string;
  status: string;
  [key: string]: any;
};

interface AppraisalCardProps {
  appraisal: Appraisal;
  empNameById: (id: number) => string;
  typeNameById: (id: number, appraisal?: Appraisal) => string;
  rangeNameById: (id?: number | null) => string | undefined;
  formatDate: (iso: string) => string;
  /** Optional: legacy helper to format/display status text; kept for backward-compatibility */
  displayStatus?: (status: string) => string;
  getStatusProgress: (status: string) => number;
  borderLeftColor: string;
  actionButtons?: React.ReactNode;
}
export function AppraisalCard(props: Readonly<AppraisalCardProps>) {
  const {
    appraisal: a,
    empNameById,
    typeNameById,
    rangeNameById,
    formatDate,
    getStatusProgress,
    borderLeftColor,
    actionButtons,
  } = props;
  // Calculate days remaining or show completed status
  const isCompleted = a.status === "Complete";
  const today = new Date();
  const endDate = new Date(a.end_date);
  const daysRemaining = Math.ceil(
    (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isOverdue = daysRemaining < 0 && !isCompleted;
  const plural = daysRemaining !== 1 ? "s" : "";

  // Determine badge display based on status
  let badgeContent: React.ReactNode;
  let badgeVariant: "default" | "destructive" | "secondary" = "secondary";
  let badgeClassName =
    "px-3 py-1 rounded-full text-sm font-semibold text-foreground";

  if (isCompleted) {
    badgeVariant = "default";
    badgeClassName =
      "px-3 py-1 rounded-full text-sm font-semibold bg-green-600 text-white hover:bg-green-700";
    badgeContent = "Completed";
  } else if (isOverdue) {
    badgeVariant = "destructive";
    badgeClassName = "px-3 py-1 rounded-full text-sm font-semibold";
    badgeContent = "Overdue";
  } else {
    // Highlight the number with a different color for active appraisals
    badgeContent = (
      <>
        <span className="text-primary font-bold text-base">
          {daysRemaining}
        </span>{" "}
        <span>day{plural} remaining</span>
      </>
    );
  }

  return (
    <Card
      key={a.appraisal_id}
      className="shadow-soft hover:shadow-md transition-all border-l-4 relative"
      style={{ borderLeftColor }}
    >
      <CardContent className="p-5 sm:p-6">
        {/* Header Section */}
        <div className="flex flex-col gap-1 mb-6">
          <div className="flex-1 space-y-3">
            {/* Line 1: Names - Evenly Spaced Across Full Width */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Appraisee */}
              <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                <Avatar className="h-8 w-8 bg-blue-50">
                  <AvatarFallback className="bg-blue-50 text-blue-600">
                    <UserCircle className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-primary font-medium">Appraisee</p>
                  <p className="text-base font-semibold text-foreground">
                    {empNameById(a.appraisee_id)}
                  </p>
                </div>
              </div>

              {/* Appraiser */}
              <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                <Avatar className="h-8 w-8 bg-primary/10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-primary font-medium">Appraiser</p>
                  <p className="text-base font-semibold text-foreground">
                    {empNameById(a.appraiser_id)}
                  </p>
                </div>
              </div>

              {/* Reviewer */}
              <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                <Avatar className="h-8 w-8 bg-purple-100">
                  <AvatarFallback className="bg-purple-100 text-purple-700">
                    <UserCheck className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-primary font-medium">Reviewer</p>
                  <p className="text-base font-semibold text-foreground">
                    {empNameById(a.reviewer_id)}
                  </p>
                </div>
              </div>
            </div>

            {/* Line 2: Type, Period, Status - With Icons and Evenly Spaced */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Appraisal Type */}
              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                <Avatar className="h-8 w-8 bg-emerald-50">
                  <AvatarFallback className="bg-emerald-50 text-emerald-600">
                    <FileText className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-primary font-medium">
                    Appraisal Type
                  </p>
                  <p className="text-base font-semibold text-foreground">
                    {typeNameById(a.appraisal_type_id, a)}
                  </p>
                </div>
              </div>

              {/* Appraisal Period */}
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <Avatar className="h-8 w-8 bg-amber-50">
                  <AvatarFallback className="bg-amber-50 text-amber-600">
                    <Calendar className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-primary font-medium">
                    Appraisal Period
                  </p>
                  <p className="text-base font-semibold text-foreground">
                    {formatDate(a.start_date)} - {formatDate(a.end_date)}
                  </p>
                </div>
              </div>

              {/* Status with Badges */}
              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                <Avatar className="h-8 w-8 bg-rose-50">
                  <AvatarFallback className="bg-rose-50 text-rose-600">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-primary font-medium">Due</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={badgeVariant} className={badgeClassName}>
                      {badgeContent}
                    </Badge>
                    {rangeNameById(a.appraisal_type_range_id) && (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200 text-sm font-medium px-2 py-1"
                      >
                        {rangeNameById(a.appraisal_type_range_id)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons - positioned absolutely to not affect content layout */}
          {actionButtons && (
            <div className="absolute top-5 right-5 sm:top-6 sm:right-6">
              {actionButtons}
            </div>
          )}
        </div>

        {/* Status Progress Section - Step Indicator */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Status</span>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              {[
                {
                  label: "Submitted",
                  status: "Submitted",
                  progress: 20,
                },
                {
                  label: "Self Assessment",
                  status: "Appraisee Self Assessment",
                  progress: 40,
                },
                {
                  label: "Appraiser Evaluation",
                  status: "Appraiser Evaluation",
                  progress: 60,
                },
                {
                  label: "Reviewer Evaluation",
                  status: "Reviewer Evaluation",
                  progress: 80,
                },
                {
                  label: "Complete",
                  status: "Complete",
                  progress: 100,
                },
              ].map((step, idx) => {
                const currentProgress = getStatusProgress(a.status);
                const isCompleted = currentProgress > step.progress;
                const isCurrent = a.status === step.status;

                let circleClass = "";
                if (isCompleted) {
                  circleClass = "bg-primary text-primary-foreground";
                } else if (isCurrent) {
                  circleClass =
                    "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2";
                } else {
                  circleClass =
                    "bg-muted text-muted-foreground border-2 border-muted-foreground/20";
                }

                const labelClass =
                  isCompleted || isCurrent
                    ? "text-foreground font-medium"
                    : "text-muted-foreground";

                return (
                  <div
                    key={`${a.appraisal_id}-step-${idx}`}
                    className="flex flex-col items-center relative z-10 flex-1"
                  >
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${circleClass}`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <span className="text-[10px] sm:text-xs">
                          {idx + 1}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[9px] sm:text-[11px] mt-1.5 text-center leading-tight max-w-[70px] sm:max-w-none ${labelClass}`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Connecting Lines */}
            <div className="absolute top-4 sm:top-5 left-0 right-0 h-[2px] bg-muted -z-0 mx-4 sm:mx-5">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{
                  width: `${getStatusProgress(a.status)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
