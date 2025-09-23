import { useEffect, useMemo, useState } from "react";
import { apiFetch, api } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import PeriodFilter, { type Period } from "../../components/PeriodFilter";
import {
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Filter,
  ChevronDown,
} from "lucide-react";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Input } from "../../components/ui/input";

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

type AppraisalType = { id: number; name: string; has_range?: boolean };
type FilterType = "Active" | "Completed" | "All";

// Helper function to load appraisal types
const useAppraisalTypes = () => {
  const [types, setTypes] = useState<AppraisalType[]>([]);
  const [typesStatus, setTypesStatus] = useState<
    "idle" | "loading" | "succeeded" | "failed"
  >("idle");

  useEffect(() => {
    let cancelled = false;
    const loadTypes = async () => {
      setTypesStatus("loading");
      const result = await api.get<AppraisalType[]>("/appraisal-types");
      if (cancelled) return;

      if (result.ok) {
        setTypes(result.data || []);
        setTypesStatus("succeeded");
      } else {
        setTypesStatus("failed");
      }
    };

    if (typesStatus === "idle") {
      loadTypes();
    }

    return () => {
      cancelled = true;
    };
  }, [typesStatus]);

  return { types, typesStatus };
};

// Helper function to calculate completion percentage
const calculateCompletionPct = (
  selectedAppraisal: Appraisal | null,
  detailsById: Record<number, AppraisalWithGoals | undefined>
): number | null => {
  if (!selectedAppraisal) return null;
  const details = detailsById[selectedAppraisal.appraisal_id];
  if (!details) return null;
  const goals = details.appraisal_goals || [];
  if (!goals.length) return 0;

  const total = goals.reduce(
    (acc, g) => acc + (g.goal?.goal_weightage ?? 0),
    0
  );
  if (total <= 0) return 0;

  const status = selectedAppraisal.status;
  const useAppraiser =
    status === "Appraiser Evaluation" ||
    status === "Reviewer Evaluation" ||
    status === "Complete";

  const completed = goals.reduce((acc, g) => {
    let done: boolean;
    if (useAppraiser) {
      done = g.appraiser_rating != null;
    } else if (status === "Appraisee Self Assessment") {
      done = g.self_rating != null;
    } else {
      done = false;
    }
    return acc + (done ? g.goal?.goal_weightage ?? 0 : 0);
  }, 0);

  return Math.round((completed / total) * 100);
};

// Helper function for appraisal filtering by period and type
const useAppraisalFiltering = (
  appraisals: Appraisal[],
  period: Period,
  searchTypeId: string,
  searchName: string,
  typeNameById: (id: number) => string
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
        (a) =>
          a.status === "Submitted" || a.status === "Appraisee Self Assessment"
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
        ? typeNameById(a.appraisal_type_id).toLowerCase().includes(q)
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
      variant="ghost"
      size="icon"
      onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      disabled={currentPage <= 1}
      title="Previous page"
      aria-label="Previous page"
      className="rounded-full hover:bg-primary/10"
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
    <span className="hidden sm:inline px-2 text-xs font-medium text-muted-foreground">
      Page {currentPage} <span className="mx-1">/</span> {totalPages}
    </span>
    <span className="sr-only sm:hidden">
      Page {currentPage} of {totalPages}
    </span>
    <Button
      variant="ghost"
      size="icon"
      onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      disabled={currentPage >= totalPages}
      title="Next page"
      aria-label="Next page"
      className="rounded-full hover:bg-primary/10"
    >
      <ArrowRight className="h-4 w-4" />
    </Button>
  </div>
);

// Helper function for self assessment navigation
const useSelfAssessmentHandler = (
  setActionError: (error: string | null) => void,
  navigate: (path: string) => void
) => {
  return async (a: Appraisal) => {
    try {
      // If status is Submitted, move to Appraisee Self Assessment first
      if (a.status === "Submitted") {
        const res = await apiFetch(`/api/appraisals/${a.appraisal_id}/status`, {
          method: "PUT",
          body: JSON.stringify({ status: "Appraisee Self Assessment" }),
        });
        if (!res.ok) {
          setActionError(res.error || "Failed to start self assessment");
          return;
        }
      }
      setActionError(null);
      navigate(`/self-assessment/${a.appraisal_id}`);
    } catch (e: any) {
      console.error("Failed to start self assessment:", e);
      setActionError("Unable to start self assessment");
    }
  };
};

// Helper component for appraisal status badge
const AppraisalStatusBadge = ({
  status,
  displayStatus,
}: {
  status: string;
  displayStatus: (s: string) => string;
}) => {
  if (status === "Complete") {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        Completed
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={
        status === "Submitted"
          ? "bg-yellow-100 text-yellow-800 border-yellow-200"
          : "bg-blue-100 text-blue-800 border-blue-200"
      }
    >
      {displayStatus(status)}
    </Badge>
  );
};

// Helper component for appraisal action buttons
const AppraisalActionButtons = ({
  appraisal,
  onSelfAssessment,
  navigate,
}: {
  appraisal: Appraisal;
  onSelfAssessment: (a: Appraisal) => void;
  navigate: (path: string) => void;
}) => {
  if (
    appraisal.status === "Submitted" ||
    appraisal.status === "Appraisee Self Assessment"
  ) {
    const buttonText =
      appraisal.status === "Submitted"
        ? "Take Self Assessment"
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

  if (appraisal.status === "Complete") {
    return (
      <Button
        variant="outline"
        onClick={() => navigate(`/appraisal/${appraisal.appraisal_id}`)}
        className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/40"
        aria-label="View appraisal"
        title="View appraisal"
      >
        <span className="hidden sm:inline">View</span>
        <ArrowRight className="h-4 w-4 sm:ml-2" />
      </Button>
    );
  }

  return null;
};

// Helper component for filters section
const AppraisalFilters = ({
  showFilters,
  searchName,
  onSearchNameChange,
  searchTypeId,
  onSearchTypeIdChange,
  types,
  period,
  onPeriodChange,
}: {
  showFilters: boolean;
  searchName: string;
  onSearchNameChange: (value: string) => void;
  searchTypeId: string;
  onSearchTypeIdChange: (value: string) => void;
  types: AppraisalType[];
  period: Period;
  onPeriodChange: (period: Period) => void;
}) => {
  if (!showFilters) return null;

  return (
    <div id="my-filters" className="w-full">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full md:flex-1 min-w-0">
          <Label className="mb-1 block">Search</Label>
          <Input
            placeholder="Search appraisal type"
            value={searchName}
            onChange={(e) => onSearchNameChange(e.target.value)}
          />
        </div>
        <div className="w-full md:w-40 flex-none">
          <Label className="mb-1 block">Type</Label>
          <Select value={searchTypeId} onValueChange={onSearchTypeIdChange}>
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
            onChange={onPeriodChange}
          />
        </div>
      </div>
    </div>
  );
};

// Helper component for tab filter buttons
const TabFilterButtons = ({
  currentFilter,
  onFilterChange,
}: {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}) => (
  <div className="flex items-center gap-2">
    {(["Active", "Completed", "All"] as const).map((filter) => (
      <Button
        key={filter}
        variant={currentFilter === filter ? "default" : "outline"}
        onClick={() => onFilterChange(filter)}
        className={
          currentFilter === filter ? "bg-primary text-primary-foreground" : ""
        }
      >
        {filter}
      </Button>
    ))}
  </div>
);

const MyAppraisal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { types } = useAppraisalTypes();
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
  // Pagination (5 per page)
  const ITEMS_PER_PAGE = 5;
  const [myPage, setMyPage] = useState(1);
  // Filter for combined list
  const [myFilter, setMyFilter] = useState<FilterType>("All");
  // Show/hide advanced filters and type filter
  const [showFilters, setShowFilters] = useState(false);
  const [searchTypeId, setSearchTypeId] = useState<string>("all");
  const [searchName, setSearchName] = useState("");

  useEffect(() => {
    if (!user?.emp_id) return;

    const loadAppraisals = async () => {
      setAppraisalsLoading(true);
      setAppraisalsError(null);
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

  const typeNameById = useMemo(() => {
    const map = new Map(types.map((t) => [t.id, t.name]));
    return (id: number) => map.get(id) || `Type #${id}`;
  }, [types]);
  const displayStatus = (status: string) =>
    status === "Submitted" ? "Waiting Acknowledgement" : status;
  const selectedAppraisal = useSelectedAppraisal(appraisals || [], period);
  const dueDateStr = selectedAppraisal
    ? formatDate(selectedAppraisal.end_date)
    : "—";

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
        ? typeNameById(a.appraisal_type_id).toLowerCase().includes(q)
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
    navigate
  );

  const completionPct = calculateCompletionPct(selectedAppraisal, detailsById);
  return (
    <div className="space-y-6 text-foreground">
      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 icon-appraisal-type" />
              Appraisal Type
            </CardTitle>
          </CardHeader>
          <CardContent className="text-left">
            <div className="text-2xl font-bold text-foreground">
              {selectedAppraisal
                ? typeNameById(selectedAppraisal.appraisal_type_id)
                : "—"}
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 icon-due-date" />
              Due Date
            </CardTitle>
          </CardHeader>
          <CardContent className="text-left">
            <div className="text-2xl font-bold text-foreground">
              {dueDateStr}
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 icon-overall-progress" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="text-left">
            {completionPct == null ? (
              <div className="text-2xl font-bold text-muted-foreground">—</div>
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-foreground">
                  {completionPct}%
                </div>
                <Progress value={completionPct} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sections grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* My Appraisals (Active + Completed with filter) */}
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 min-w-0 flex-nowrap">
              <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2 min-w-0 flex-1 truncate">
                <CheckCircle2 className="h-5 w-5 icon-my-appraisals" />
                My Appraisals
              </CardTitle>
              <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap flex-nowrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters((v) => !v)}
                  aria-expanded={showFilters}
                  aria-controls="my-filters"
                  title="Toggle filters"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline sm:ml-2">Filters</span>
                  <ChevronDown
                    className={
                      (showFilters ? "rotate-180 " : "") +
                      "h-4 w-4 ml-2 transition-transform"
                    }
                  />
                </Button>
                {filteredMineSearch.length > 0 && (
                  <PaginationControls
                    currentPage={myPage}
                    totalPages={listTotalPages}
                    onPageChange={setMyPage}
                  />
                )}
              </div>
            </div>
            <AppraisalFilters
              showFilters={showFilters}
              searchName={searchName}
              onSearchNameChange={setSearchName}
              searchTypeId={searchTypeId}
              onSearchTypeIdChange={setSearchTypeId}
              types={types}
              period={period}
              onPeriodChange={setPeriod}
            />
          </CardHeader>
          <CardContent>
            {actionError && (
              <div className="text-sm text-destructive mb-4 p-3 bg-destructive/10 rounded-md border border-destructive/20">
                {actionError}
              </div>
            )}
            {appraisalsError && (
              <div className="text-sm text-destructive mb-4 p-3 bg-destructive/10 rounded-md border border-destructive/20">
                {appraisalsError}
              </div>
            )}
            {appraisalsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-muted rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <TabFilterButtons
                    currentFilter={myFilter}
                    onFilterChange={setMyFilter}
                  />
                </div>
                <div className="space-y-3">
                  {filteredMineSearch.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 icon-my-appraisals" />
                      <p>No items</p>
                    </div>
                  ) : (
                    listPaged.map((a: any) => (
                      <div
                        key={a.appraisal_id}
                        className="rounded-lg border border-border bg-card p-3 sm:p-4 text-sm transition-all duration-200 hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">
                              {typeNameById(a.appraisal_type_id)}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3 icon-due-date" />
                              {formatDate(a.start_date)} –{" "}
                              {formatDate(a.end_date)}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <AppraisalStatusBadge
                              status={a.status}
                              displayStatus={displayStatus}
                            />
                            <AppraisalActionButtons
                              appraisal={a}
                              onSelfAssessment={startOrContinueSelfAssessment}
                              navigate={navigate}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyAppraisal;
