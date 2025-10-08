import { useEffect, useMemo, useState } from "react";
import { apiFetch, api } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import PeriodFilter, { type Period } from "../../components/PeriodFilter";
import {
  Calendar,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  User,
  UserCheck,
  CheckCircle,
  Clock,
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

type AppraisalType = { id: number; name: string; has_range?: boolean };

type AppraisalTypeRange = {
  id: number;
  appraisal_type_id: number;
  range_name: string;
  min_score: number;
  max_score: number;
};

type Employee = {
  emp_id: number;
  emp_name: string;
  emp_email?: string;
  emp_roles?: string;
};

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
      const result = await api.get<AppraisalType[]>("/appraisal-types/");
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
        variant="outline"
        onClick={() =>
          navigate(`/self-assessment/${appraisal.appraisal_id}?readonly=true`)
        }
        className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/40"
        aria-label="View self assessment"
        title="View self assessment"
      >
        <span className="hidden sm:inline">View</span>
        <ArrowRight className="h-4 w-4 sm:ml-2" />
      </Button>
    );
  }

  // All roles: View completed appraisals
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

  // No view button for appraiser/reviewer before Complete status
  return null;
};

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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [ranges, setRanges] = useState<AppraisalTypeRange[]>([]);
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
  const [myFilter, setMyFilter] = useState<FilterType>("Active");
  // Type filter and search
  const [searchTypeId, setSearchTypeId] = useState<string>("all");
  const [searchName, setSearchName] = useState("");

  // Load employees and ranges
  useEffect(() => {
    const loadData = async () => {
      const [empRes, rangeRes] = await Promise.all([
        apiFetch<Employee[]>("/api/employees/"),
        apiFetch<AppraisalTypeRange[]>("/api/appraisal-types/ranges"),
      ]);
      if (empRes.ok && empRes.data) setEmployees(empRes.data);
      if (rangeRes.ok && rangeRes.data) setRanges(rangeRes.data);
    };
    loadData();
  }, []);

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

  return (
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
            variant={myFilter === "Active" ? "default" : "outline"}
            onClick={() => setMyFilter("Active")}
            className={
              myFilter === "Active" ? "bg-primary text-primary-foreground" : ""
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
            variant={myFilter === "Completed" ? "default" : "outline"}
            onClick={() => setMyFilter("Completed")}
            className={
              myFilter === "Completed"
                ? "bg-primary text-primary-foreground"
                : ""
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
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-40 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMineSearch.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 icon-my-appraisals" />
              <p>No items</p>
            </div>
          ) : (
            listPaged.map((a: any) => (
              <Card
                key={a.appraisal_id}
                className="shadow-soft hover:shadow-md transition-all border-l-4"
                style={{
                  borderLeftColor:
                    a.status === "Complete"
                      ? "#10b981"
                      : a.status === "Submitted"
                      ? "#f59e0b"
                      : "#3b82f6",
                }}
              >
                <CardContent className="p-5 sm:p-6">
                  {/* Header Section */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {typeNameById(a.appraisal_type_id, a)}
                        </h3>
                        {rangeNameById(a.appraisal_type_range_id) && (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200"
                          >
                            {rangeNameById(a.appraisal_type_range_id)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Due: {formatDate(a.end_date)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                    </div>
                  </div>

                  {/* People Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 bg-primary/10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">
                          Appraiser
                        </p>
                        <p className="text-sm font-medium truncate">
                          {empNameById(a.appraiser_id)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 bg-purple-100">
                        <AvatarFallback className="bg-purple-100 text-purple-700">
                          <UserCheck className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">
                          Reviewer
                        </p>
                        <p className="text-sm font-medium truncate">
                          {empNameById(a.reviewer_id)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status Progress Section - Step Indicator */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {displayStatus(a.status)}
                      </span>
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

                          return (
                            <div
                              key={idx}
                              className="flex flex-col items-center relative z-10 flex-1"
                            >
                              <div
                                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                                  isCompleted
                                    ? "bg-primary text-primary-foreground"
                                    : isCurrent
                                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                                    : "bg-muted text-muted-foreground border-2 border-muted-foreground/20"
                                }`}
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
                                className={`text-[9px] sm:text-[11px] mt-1.5 text-center leading-tight max-w-[70px] sm:max-w-none ${
                                  isCompleted || isCurrent
                                    ? "text-foreground font-medium"
                                    : "text-muted-foreground"
                                }`}
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
                            width: `${
                              (getStatusProgress(a.status) / 100) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MyAppraisal;
