import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";
import { useData } from "../../contexts/DataContext";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import PeriodFilter, { type Period } from "../../components/PeriodFilter";
import AcknowledgeAppraisalModal from "../../features/appraisal/AcknowledgeAppraisalModal";
import { AppraisalCard } from "../../components/AppraisalCard";
import { AppraisalCardSkeletonList } from "../../components/AppraisalCardSkeleton";
import {
  FiltersSkeleton,
  PaginationSkeleton,
} from "../../components/FiltersSkeleton";
import { CheckCircle2, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { Label } from "../../components/ui/label";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import type { AppraisalType } from "../../contexts/DataContext";

type Appraisal = {
  appraisal_id: number;
  appraisal_setting_id?: number | null;
  appraisee_id: number;
  appraiser_id: number;
  reviewer_id: number;
  appraisal_type_id: number;
  appraisal_type_range_id?: number | null;
  start_date: string;
  end_date: string;
  status: string;
  appraiser_overall_comments?: string | null;
  appraiser_overall_rating?: number | null;
  reviewer_overall_comments?: string | null;
  reviewer_overall_rating?: number | null;
  created_at?: string;
  updated_at?: string;
  appraisal_type?: AppraisalType; // Include the embedded appraisal type data
};

type AppraisalGoal = {
  id: number;
  goal?: { goal_weightage?: number };
  self_rating?: number | null;
  appraiser_rating?: number | null;
};

type AppraisalWithGoals = Appraisal & {
  appraisal_goals: AppraisalGoal[];
};

type FilterType = "Active" | "Completed" | "All";

// Helper function for appraisal filtering by period and type
const useAppraisalFiltering = (
  appraisals: Appraisal[],
  period: Period,
  searchTypeId: string,
  searchName: string,
  typeNameById: (id: number, appraisal?: Appraisal) => string
) => {
  const appraisalsInPeriod = useMemo(() => {
    if (!period.startDate || !period.endDate) return appraisals;

    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    return appraisals.filter(
      (a) => new Date(a.end_date) >= start && new Date(a.start_date) <= end
    );
  }, [appraisals, period]);

  const myActives = useMemo(
    () =>
      appraisalsInPeriod.filter(
        (a) => a.status !== "Draft" && a.status !== "Complete"
      ),
    [appraisalsInPeriod]
  );

  const myCompleted = useMemo(
    () => appraisalsInPeriod.filter((a) => a.status === "Complete"),
    [appraisalsInPeriod]
  );

  const combinedMine = useMemo(
    () =>
      [...myActives, ...myCompleted].sort(
        (a, b) =>
          new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
      ),
    [myActives, myCompleted]
  );

  const filteredMineSearch = useMemo(() => {
    const q = searchName.trim().toLowerCase();
    return combinedMine.filter((a) => {
      const matchType =
        searchTypeId === "all"
          ? true
          : a.appraisal_type_id === Number(searchTypeId);
      const matchQuery = q
        ? typeNameById(a.appraisal_type_id, a).toLowerCase().includes(q)
        : true;
      return matchType && matchQuery;
    });
  }, [combinedMine, searchTypeId, searchName, typeNameById]);

  return {
    appraisalsInPeriod,
    myActives,
    myCompleted,
    combinedMine,
    filteredMineSearch,
  };
};

// Helper function to select the most relevant appraisal for overview
const useSelectedAppraisal = (appraisals: Appraisal[], period: Period) => {
  return useMemo(() => {
    const now = new Date();
    const activeStatuses = new Set(["Submitted", "Appraisee Self Assessment"]);

    // Find upcoming active appraisals
    const upcomingActive = appraisals.filter((a) => {
      const end = new Date(a.end_date);
      return activeStatuses.has(a.status) && end >= now;
    });

    // Return soonest active if available
    const activeSoonest = [...upcomingActive].sort(
      (a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
    )[0];
    if (activeSoonest) return activeSoonest;

    // Fallback: most recent in period among allowed statuses
    const inPeriod =
      period.startDate && period.endDate
        ? appraisals.filter(
            (a) =>
              new Date(a.end_date) >= new Date(period.startDate!) &&
              new Date(a.start_date) <= new Date(period.endDate!)
          )
        : appraisals;

    const allowedForOverview = inPeriod.filter(
      (a) =>
        a.status === "Submitted" ||
        a.status === "Appraisee Self Assessment" ||
        a.status === "Complete"
    );

    const latest = [...allowedForOverview].sort(
      (a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
    )[0];

    return latest || null;
  }, [appraisals, period]);
};

// Helper component for pagination controls
const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => (
  <div
    className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-1.5 py-1 shadow-sm backdrop-blur flex-shrink-0 whitespace-nowrap"
    aria-live="polite"
  >
    <Button
      variant={BUTTON_STYLES.PAGINATION.variant}
      size={BUTTON_STYLES.PAGINATION.size}
      onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      disabled={currentPage <= 1}
      title="Previous page"
      aria-label="Previous page"
      className={BUTTON_STYLES.PAGINATION.className}
    >
      <ArrowLeft className={ICON_SIZES.DEFAULT} />
    </Button>
    <span className="hidden sm:inline px-2 text-xs font-medium text-muted-foreground">
      Page {currentPage} <span className="mx-1">/</span> {totalPages}
    </span>
    <span className="sr-only sm:hidden">
      Page {currentPage} of {totalPages}
    </span>
    <Button
      variant={BUTTON_STYLES.PAGINATION.variant}
      size={BUTTON_STYLES.PAGINATION.size}
      onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      disabled={currentPage >= totalPages}
      title="Next page"
      aria-label="Next page"
      className={BUTTON_STYLES.PAGINATION.className}
    >
      <ArrowRight className={ICON_SIZES.DEFAULT} />
    </Button>
  </div>
);

// Helper function for self assessment navigation
const useSelfAssessmentHandler = (
  setActionError: (error: string | null) => void,
  navigate: (path: string) => void,
  setAcknowledgeModalOpen: (open: boolean) => void,
  setAcknowledgeAppraisalId: (id: number) => void
) => {
  return async (a: Appraisal) => {
    try {
      // If status is Submitted, show acknowledgement modal first
      if (a.status === "Submitted") {
        setAcknowledgeAppraisalId(a.appraisal_id);
        setAcknowledgeModalOpen(true);
        return;
      }
      // If already in Appraisee Self Assessment, navigate directly
      setActionError(null);
      navigate(`/self-assessment/${a.appraisal_id}`);
    } catch (e: any) {
      console.error("Failed to start self assessment:", e);
      setActionError("Unable to start self assessment");
    }
  };
};

// Helper component for appraisal action buttons
const AppraisalActionButtons = ({
  appraisal,
  onSelfAssessment,
  navigate,
  currentUserId,
}: {
  appraisal: Appraisal;
  onSelfAssessment: (a: Appraisal) => void;
  navigate: (path: string) => void;
  currentUserId: number;
}) => {
  const isAppraisee = appraisal.appraisee_id === currentUserId;
  const isAppraiser = appraisal.appraiser_id === currentUserId;
  const isReviewer = appraisal.reviewer_id === currentUserId;

  // Appraisee actions: Self Assessment
  if (
    isAppraisee &&
    (appraisal.status === "Submitted" ||
      appraisal.status === "Appraisee Self Assessment")
  ) {
    const buttonText =
      appraisal.status === "Submitted"
        ? "Acknowledge & Start"
        : "Continue Self Assessment";

    return (
      <Button
        onClick={() => onSelfAssessment(appraisal)}
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
        aria-label={buttonText}
        title={buttonText}
      >
        <span className="hidden sm:inline">{buttonText}</span>
        <ArrowRight className="h-4 w-4 sm:ml-2" />
      </Button>
    );
  }

  // Appraiser actions: Evaluate
  if (isAppraiser && appraisal.status === "Appraiser Evaluation") {
    return (
      <Button
        onClick={() =>
          navigate(`/appraiser-evaluation/${appraisal.appraisal_id}`)
        }
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
        aria-label="Evaluate appraisal"
        title="Evaluate appraisal"
      >
        <span className="hidden sm:inline">Evaluate</span>
        <ArrowRight className="h-4 w-4 sm:ml-2" />
      </Button>
    );
  }

  // Reviewer actions: Evaluate
  if (isReviewer && appraisal.status === "Reviewer Evaluation") {
    return (
      <Button
        onClick={() =>
          navigate(`/reviewer-evaluation/${appraisal.appraisal_id}`)
        }
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
        aria-label="Review appraisal"
        title="Review appraisal"
      >
        <span className="hidden sm:inline">Review</span>
        <ArrowRight className="h-4 w-4 sm:ml-2" />
      </Button>
    );
  }

  // Appraisee can view their self assessment during Appraiser/Reviewer Evaluation
  if (
    isAppraisee &&
    (appraisal.status === "Appraiser Evaluation" ||
      appraisal.status === "Reviewer Evaluation")
  ) {
    return (
      <Button
        variant={BUTTON_STYLES.VIEW.variant}
        onClick={() =>
          navigate(`/self-assessment/${appraisal.appraisal_id}?readonly=true`)
        }
        className={BUTTON_STYLES.VIEW.className}
        aria-label="View self assessment"
        title="View self assessment"
      >
        <span className="hidden sm:inline">View</span>
        <ArrowRight className={`${ICON_SIZES.DEFAULT} sm:ml-2`} />
      </Button>
    );
  }

  // All roles: View completed appraisals
  if (appraisal.status === "Complete") {
    return (
      <Button
        variant={BUTTON_STYLES.VIEW.variant}
        onClick={() => navigate(`/appraisal/${appraisal.appraisal_id}`)}
        className={BUTTON_STYLES.VIEW.className}
        aria-label="View appraisal"
        title="View appraisal"
      >
        <span className="hidden sm:inline">View</span>
        <ArrowRight className={`${ICON_SIZES.DEFAULT} sm:ml-2`} />
      </Button>
    );
  }

  // No view button for appraiser/reviewer before Complete status
  return null;
};

const MyAppraisal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    employees,
    appraisalTypes: types,
    appraisalRanges: ranges,
  } = useData();
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [appraisalsLoading, setAppraisalsLoading] = useState(false);
  const [appraisalsError, setAppraisalsError] = useState<string | null>(null);
  const [detailsById, setDetailsById] = useState<
    Record<number, AppraisalWithGoals | undefined>
  >({});
  const [period, setPeriod] = useState<Period>(() => {
    const y = new Date().getFullYear();
    const start = new Date(y, 0, 1).toISOString().slice(0, 10);
    const end = new Date(y, 11, 31).toISOString().slice(0, 10);
    return { label: "This Year", startDate: start, endDate: end };
  });
  const [actionError, setActionError] = useState<string | null>(null);
  // Acknowledgement modal state
  const [acknowledgeModalOpen, setAcknowledgeModalOpen] = useState(false);
  const [acknowledgeAppraisalId, setAcknowledgeAppraisalId] =
    useState<number>(0);
  // Pagination (5 per page)
  const ITEMS_PER_PAGE = 5;
  const [myPage, setMyPage] = useState(1);
  // Filter for combined list
  const [myFilter, setMyFilter] = useState<FilterType>("Active");
  // Type filter and search
  const [searchTypeId, setSearchTypeId] = useState<string>("all");
  const [searchName, setSearchName] = useState("");

  useEffect(() => {
    if (!user?.emp_id) return;

    const loadAppraisals = async () => {
      setAppraisalsLoading(true);
      setAppraisalsError(null);

      // Fetch only appraisals where user is the appraisee (their own appraisals)
      const res = await apiFetch<Appraisal[]>(
        `/api/appraisals/?appraisee_id=${encodeURIComponent(user.emp_id)}`
      );

      if (res.ok && res.data) {
        setAppraisals(res.data);
      } else {
        setAppraisalsError(res.error || "Failed to fetch appraisals");
      }

      setAppraisalsLoading(false);
    };
    loadAppraisals();
  }, [user?.emp_id]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  // Helper to get employee name
  const empNameById = useMemo(() => {
    const map = new Map(employees.map((e) => [e.emp_id, e.emp_name]));
    return (id: number) => map.get(id) || "Unknown";
  }, [employees]);

  // Helper to get range name
  const rangeNameById = useMemo(() => {
    const map = new Map(ranges.map((r) => [r.id, r.range_name]));
    return (id: number | null | undefined) => (id ? map.get(id) || "" : "");
  }, [ranges]);

  // Get appraisal status progress
  const getStatusProgress = (status: string): number => {
    const statusMap: Record<string, number> = {
      Draft: 0,
      Submitted: 20,
      "Appraisee Self Assessment": 40,
      "Appraiser Evaluation": 60,
      "Reviewer Evaluation": 80,
      Complete: 100,
    };
    return statusMap[status] || 0;
  };

  // Handle acknowledge action
  const handleAcknowledge = async (appraisalId: number) => {
    try {
      const res = await apiFetch(`/api/appraisals/${appraisalId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "Appraisee Self Assessment" }),
      });
      if (res.ok) {
        // Refresh appraisals - fetch only where user is appraisee
        const refreshRes = await apiFetch<Appraisal[]>(
          `/api/appraisals/?appraisee_id=${encodeURIComponent(
            user?.emp_id || ""
          )}`
        );

        if (refreshRes.ok && refreshRes.data) {
          setAppraisals(refreshRes.data);
        }
        setActionError(null);
      } else {
        setActionError(res.error || "Failed to acknowledge appraisal");
      }
    } catch (error) {
      console.error("Error acknowledging appraisal:", error);
      setActionError("Unable to acknowledge appraisal");
    }
  };

  const typeNameById = useMemo(() => {
    const map = new Map(types.map((t) => [t.id, t.name]));
    return (id: number, appraisal?: Appraisal) => {
      // If appraisal has embedded appraisal_type data, use it
      if (appraisal?.appraisal_type?.name) {
        return appraisal.appraisal_type.name;
      }
      // Otherwise fall back to lookup map
      return map.get(id) || `Type #${id}`;
    };
  }, [types]);
  const displayStatus = (status: string) =>
    status === "Submitted" ? "Waiting Acknowledgement" : status;
  const selectedAppraisal = useSelectedAppraisal(appraisals || [], period);

  const { myActives, myCompleted, combinedMine } = useAppraisalFiltering(
    appraisals,
    period,
    searchTypeId,
    searchName,
    typeNameById
  );

  const { filteredMineSearch } = useMemo(() => {
    const filteredByTab = (() => {
      switch (myFilter) {
        case "Active":
          return myActives;
        case "Completed":
          return myCompleted;
        default:
          return combinedMine;
      }
    })();

    const q = searchName.trim().toLowerCase();
    const filteredBySearch = filteredByTab.filter((a) => {
      const matchType =
        searchTypeId === "all"
          ? true
          : a.appraisal_type_id === Number(searchTypeId);
      const matchQuery = q
        ? typeNameById(a.appraisal_type_id, a).toLowerCase().includes(q)
        : true;
      return matchType && matchQuery;
    });

    return {
      filteredMineSearch: filteredBySearch,
    };
  }, [
    myFilter,
    myActives,
    myCompleted,
    combinedMine,
    searchTypeId,
    searchName,
    typeNameById,
  ]);

  const listTotalPages = Math.max(
    1,
    Math.ceil(filteredMineSearch.length / ITEMS_PER_PAGE)
  );

  const listPaged = useMemo(
    () =>
      filteredMineSearch.slice(
        (myPage - 1) * ITEMS_PER_PAGE,
        myPage * ITEMS_PER_PAGE
      ),
    [filteredMineSearch, myPage]
  );

  useEffect(() => {
    setMyPage(1);
  }, [filteredMineSearch.length, myFilter, searchTypeId, searchName]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!selectedAppraisal || detailsById[selectedAppraisal.appraisal_id])
      return;

    const loadDetails = async () => {
      const res = await apiFetch<AppraisalWithGoals>(
        `/api/appraisals/${encodeURIComponent(selectedAppraisal.appraisal_id)}`
      );
      if (res.ok && res.data) {
        setDetailsById((prev) => ({
          ...prev,
          [selectedAppraisal.appraisal_id]: res.data!,
        }));
      }
    };
    loadDetails();
  }, [selectedAppraisal?.appraisal_id, detailsById]);

  const startOrContinueSelfAssessment = useSelfAssessmentHandler(
    setActionError,
    navigate,
    setAcknowledgeModalOpen,
    setAcknowledgeAppraisalId
  );

  const handleAcknowledgeSuccess = () => {
    // Reload appraisals after acknowledgement
    if (!user?.emp_id) return;
    const loadAppraisals = async () => {
      const res = await apiFetch<Appraisal[]>(
        `/api/appraisals/?appraisee_id=${encodeURIComponent(user.emp_id)}`
      );
      if (res.ok && res.data) {
        setAppraisals(res.data);
      }
    };
    loadAppraisals();
    // Navigate to self-assessment page
    navigate(`/self-assessment/${acknowledgeAppraisalId}`);
  };

  return (
    <>
      <AcknowledgeAppraisalModal
        open={acknowledgeModalOpen}
        onClose={() => setAcknowledgeModalOpen(false)}
        appraisalId={acknowledgeAppraisalId}
        onAcknowledge={handleAcknowledgeSuccess}
      />
      <div className="space-y-6 text-foreground">
        {/* Filter Components - Always visible at the top */}
        <div className="w-full">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full md:flex-1 min-w-0">
              <Label className="mb-1 block">Search</Label>
              <Input
                placeholder="Search appraisal type"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
            <div className="w-full md:w-40 flex-none">
              <Label className="mb-1 block">Type</Label>
              <Select value={searchTypeId} onValueChange={setSearchTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:basis-full xl:flex-1 min-w-0">
              <PeriodFilter
                defaultPreset="This Year"
                value={period}
                onChange={setPeriod}
              />
            </div>
          </div>
        </div>

        {/* Active/Completed buttons with Pagination */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant={
                myFilter === "Active"
                  ? BUTTON_STYLES.TAB_ACTIVE.variant
                  : BUTTON_STYLES.TAB_INACTIVE.variant
              }
              onClick={() => setMyFilter("Active")}
              className={
                myFilter === "Active"
                  ? BUTTON_STYLES.TAB_ACTIVE.className
                  : BUTTON_STYLES.TAB_INACTIVE.className
              }
            >
              Active
              <Badge
                variant="secondary"
                className="ml-2 bg-background/20 text-current border-0"
              >
                {myActives.length}
              </Badge>
            </Button>
            <Button
              variant={
                myFilter === "Completed"
                  ? BUTTON_STYLES.TAB_ACTIVE.variant
                  : BUTTON_STYLES.TAB_INACTIVE.variant
              }
              onClick={() => setMyFilter("Completed")}
              className={
                myFilter === "Completed"
                  ? BUTTON_STYLES.TAB_ACTIVE.className
                  : BUTTON_STYLES.TAB_INACTIVE.className
              }
            >
              Completed
              <Badge
                variant="secondary"
                className="ml-2 bg-background/20 text-current border-0"
              >
                {myCompleted.length}
              </Badge>
            </Button>
          </div>
          {filteredMineSearch.length > 0 && (
            <PaginationControls
              currentPage={myPage}
              totalPages={listTotalPages}
              onPageChange={setMyPage}
            />
          )}
        </div>

        {/* Error Messages */}
        {actionError && (
          <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-md border border-destructive/20">
            {actionError}
          </div>
        )}
        {appraisalsError && (
          <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-md border border-destructive/20">
            {appraisalsError}
          </div>
        )}

        {/* Appraisal Cards */}
        {appraisalsLoading ? (
          <>
            <FiltersSkeleton />
            <AppraisalCardSkeletonList count={5} />
            <PaginationSkeleton />
          </>
        ) : (
          <div className="space-y-4">
            {filteredMineSearch.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 icon-my-appraisals" />
                <p>No items</p>
              </div>
            ) : (
              listPaged.map((a: any) => {
                const borderLeftColor =
                  a.status === "Complete"
                    ? "#10b981"
                    : a.status === "Submitted"
                    ? "#f59e0b"
                    : "#3b82f6";

                const actionButtons = (
                  <>
                    {a.status === "Submitted" &&
                      a.appraisee_id === (user?.emp_id || 0) && (
                        <Button
                          onClick={() => handleAcknowledge(a.appraisal_id)}
                          variant="outline"
                          size="sm"
                          className="border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                    <AppraisalActionButtons
                      appraisal={a}
                      onSelfAssessment={startOrContinueSelfAssessment}
                      navigate={navigate}
                      currentUserId={user?.emp_id || 0}
                    />
                  </>
                );

                return (
                  <AppraisalCard
                    key={a.appraisal_id}
                    appraisal={a}
                    empNameById={empNameById}
                    typeNameById={typeNameById}
                    rangeNameById={rangeNameById}
                    formatDate={formatDate}
                    displayStatus={displayStatus}
                    getStatusProgress={getStatusProgress}
                    borderLeftColor={borderLeftColor}
                    actionButtons={actionButtons}
                  />
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default MyAppraisal;
