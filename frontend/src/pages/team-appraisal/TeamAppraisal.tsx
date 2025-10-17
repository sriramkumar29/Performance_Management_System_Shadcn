import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import CreateAppraisalButton from "../../features/appraisal/CreateAppraisalButton";
import EditAppraisalButton from "../../features/appraisal/EditAppraisalButton";
import DeleteAppraisalButton from "../../features/appraisal/DeleteAppraisalButton";
import { Button } from "../../components/ui/button";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";
import { Badge } from "../../components/ui/badge";
import { AppraisalCard } from "../../components/AppraisalCard";
import { AppraisalCardSkeletonList } from "../../components/AppraisalCardSkeleton";
import {
  FiltersSkeleton,
  PaginationSkeleton,
} from "../../components/FiltersSkeleton";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Activity,
  ArrowRight,
  ArrowLeft,
  Users,
  RefreshCw,
} from "lucide-react";
import PeriodFilter, { type Period } from "../../components/PeriodFilter";

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
};

type Employee = {
  emp_id: number;
  emp_name: string;
  emp_roles?: string;
  emp_reporting_manager_id?: number | null;
};
type AppraisalType = { id: number; name: string };
type AppraisalTypeRange = {
  id: number;
  appraisal_type_id: number;
  range_name: string;
};

const TeamAppraisal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [types, setTypes] = useState<AppraisalType[]>([]);
  const [ranges, setRanges] = useState<AppraisalTypeRange[]>([]);
  // Modal removed; navigation will be used instead
  const [period, setPeriod] = useState<Period>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return {
      label: "This Year",
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  });

  const loadAppraisals = async () => {
    if (!user?.emp_id) return;
    setLoading(true);
    const [aAppraiser, aReviewerActive, aReviewerCompleted, e, t, r] =
      await Promise.all([
        apiFetch<Appraisal[]>(
          `/api/appraisals/?appraiser_id=${encodeURIComponent(user.emp_id)}`
        ),
        apiFetch<Appraisal[]>(
          `/api/appraisals/?reviewer_id=${encodeURIComponent(
            user.emp_id
          )}&status=${encodeURIComponent("Reviewer Evaluation")}`
        ),
        apiFetch<Appraisal[]>(
          `/api/appraisals/?reviewer_id=${encodeURIComponent(
            user.emp_id
          )}&status=${encodeURIComponent("Complete")}`
        ),
        apiFetch<Employee[]>(`/api/employees/`),
        apiFetch<AppraisalType[]>(`/api/appraisal-types/`),
        apiFetch<AppraisalTypeRange[]>(`/api/appraisal-types/ranges`),
      ]);
    if (
      (aAppraiser.ok && aAppraiser.data) ||
      (aReviewerActive.ok && aReviewerActive.data) ||
      (aReviewerCompleted.ok && aReviewerCompleted.data)
    ) {
      const listA = aAppraiser.data || [];
      const listRActive = aReviewerActive.data || [];
      const listRCompleted = aReviewerCompleted.data || [];
      const map = new Map<number, Appraisal>();
      for (const item of [...listA, ...listRActive, ...listRCompleted]) {
        map.set(item.appraisal_id, item);
      }
      setAppraisals(Array.from(map.values()));
    }
    if (e.ok && e.data) setEmployees(e.data);
    if (t.ok && t.data) setTypes(t.data);
    if (r.ok && r.data) setRanges(r.data);
    setLoading(false);
  };

  useEffect(() => {
    loadAppraisals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.emp_id]);

  const empNameById = useMemo(() => {
    const map = new Map(employees.map((e) => [e.emp_id, e.emp_name]));
    return (id: number) => map.get(id) || `Emp #${id}`;
  }, [employees]);
  const typeNameById = useMemo(() => {
    const map = new Map(types.map((t) => [t.id, t.name]));
    return (id: number) => map.get(id) || `Type #${id}`;
  }, [types]);
  const rangeNameById = useMemo(() => {
    const map = new Map(ranges.map((r) => [r.id, r.range_name]));
    return (id: number | null | undefined) => (id ? map.get(id) || "" : "");
  }, [ranges]);
  const displayStatus = (s: string) =>
    s === "Submitted" ? "Waiting Acknowledgement" : s;

  // Helper function to get progress percentage based on status
  const getStatusProgress = (status: string): number => {
    const progressMap: Record<string, number> = {
      Draft: 0,
      Submitted: 20,
      "Appraisee Self Assessment": 40,
      "Appraiser Evaluation": 60,
      "Reviewer Evaluation": 80,
      Complete: 100,
    };
    return progressMap[status] || 0;
  };

  const appraisalsInPeriod = useMemo(() => {
    if (!period.startDate || !period.endDate) return appraisals;
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    return appraisals.filter(
      (a) => new Date(a.end_date) >= start && new Date(a.start_date) <= end
    );
  }, [appraisals, period]);

  const drafts = appraisalsInPeriod.filter(
    (a) => a.status === "Draft" && a.appraiser_id === (user?.emp_id || -1)
  );

  // Active for appraiser: all non-draft, non-complete appraisals they're conducting
  // This includes Submitted, Self Assessment, Appraiser Evaluation, AND Reviewer Evaluation
  const activeAsAppraiser = appraisalsInPeriod.filter(
    (a) =>
      a.appraiser_id === (user?.emp_id || -1) &&
      a.status !== "Draft" &&
      a.status !== "Complete"
  );

  // Active for reviewer: all non-draft, non-complete appraisals assigned to them
  // Reviewers should see appraisals throughout the entire process to track progress
  // (but not already counted as appraiser to avoid duplicates)
  const activeAsReviewer = appraisalsInPeriod.filter(
    (a) =>
      a.reviewer_id === (user?.emp_id || -1) &&
      a.status !== "Draft" &&
      a.status !== "Complete" &&
      a.appraiser_id !== (user?.emp_id || -1) // Avoid duplicates
  );

  const active = [...activeAsAppraiser, ...activeAsReviewer];

  const completedTeam = appraisalsInPeriod.filter(
    (a) =>
      a.status === "Complete" &&
      (a.appraiser_id === (user?.emp_id || -1) ||
        a.reviewer_id === (user?.emp_id || -1))
  );

  // Overdue appraisals: end_date has passed and status is not Complete
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison
  const overdueTeam = appraisalsInPeriod.filter((a) => {
    const endDate = new Date(a.end_date);
    endDate.setHours(0, 0, 0, 0);
    return (
      endDate < today &&
      a.status !== "Complete" &&
      (a.appraiser_id === (user?.emp_id || -1) ||
        a.reviewer_id === (user?.emp_id || -1))
    );
  });

  // All appraisals for this user (appraiser or reviewer)
  const allTeam = appraisalsInPeriod.filter(
    (a) =>
      a.appraiser_id === (user?.emp_id || -1) ||
      a.reviewer_id === (user?.emp_id || -1)
  );

  // Number of direct reports (team members)
  const directReportsCount = useMemo(
    () =>
      employees.filter(
        (e) => e.emp_reporting_manager_id === (user?.emp_id || -1)
      ).length,
    [employees, user?.emp_id]
  );

  // Search filters
  const [searchName, setSearchName] = useState("");
  const [searchTypeId, setSearchTypeId] = useState<string>("all");

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  // After navigation, list will refresh on mount/useEffect; modal close handler removed

  // Pagination (5 per page) for each section
  const ITEMS_PER_PAGE = 5;
  const [teamPage, setTeamPage] = useState(1);

  // Combined appraisals including drafts - persist tab state in URL
  type TeamTab = "All" | "Active" | "Completed" | "Draft" | "Overdue";
  const getInitialTab = (): TeamTab => {
    const tab = searchParams.get("tab");
    if (
      tab === "Completed" ||
      tab === "Draft" ||
      tab === "Overdue" ||
      tab === "All"
    )
      return tab as TeamTab;
    return "Active";
  };

  const [teamFilterWithDraft, setTeamFilterWithDraft] =
    useState<TeamTab>(getInitialTab);

  // Update URL when tab changes
  const handleTabChange = (newTab: TeamTab) => {
    setTeamFilterWithDraft(newTab);
    setSearchParams({ tab: newTab });
  };

  const filteredTeamWithDraft = useMemo(() => {
    switch (teamFilterWithDraft) {
      case "All":
        return allTeam;
      case "Active":
        return active;
      case "Completed":
        return completedTeam;
      case "Draft":
        return drafts;
      case "Overdue":
        return overdueTeam;
      default:
        return active;
    }
  }, [
    teamFilterWithDraft,
    allTeam,
    active,
    completedTeam,
    drafts,
    overdueTeam,
  ]);

  const filteredTeamSearchWithDraft = useMemo(() => {
    const name = searchName.trim().toLowerCase();
    return filteredTeamWithDraft.filter((a) => {
      const matchName = name
        ? empNameById(a.appraisee_id).toLowerCase().includes(name)
        : true;
      const matchType =
        searchTypeId === "all"
          ? true
          : a.appraisal_type_id === Number(searchTypeId);
      return matchName && matchType;
    });
  }, [filteredTeamWithDraft, searchName, searchTypeId, empNameById]);

  const teamTotalPages = Math.max(
    1,
    Math.ceil(filteredTeamSearchWithDraft.length / ITEMS_PER_PAGE)
  );

  const teamPaged = useMemo(
    () =>
      filteredTeamSearchWithDraft.slice(
        (teamPage - 1) * ITEMS_PER_PAGE,
        teamPage * ITEMS_PER_PAGE
      ),
    [filteredTeamSearchWithDraft, teamPage]
  );

  // Reset to first page when data changes
  useEffect(() => {
    setTeamPage(1);
  }, [
    filteredTeamSearchWithDraft.length,
    teamFilterWithDraft,
    searchName,
    searchTypeId,
  ]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="space-y-3 text-foreground">
      {/* Top bar: filters on the left, actions on the right (responsive) */}
      <div className="w-full">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          {/* Left: Search + Filters (will wrap on small screens) */}
          <div className="flex-1">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full md:w-1/2 lg:w-2/6 min-w-0">
                <Label className="mb-1 block">Search</Label>
                <Input
                  placeholder="Search employee name"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </div>
              <div className="w-full md:w-40 flex-none">
                <Label className="mb-1 block">Type</Label>
                <Select
                  value={searchTypeId}
                  onValueChange={(v) => setSearchTypeId(v)}
                >
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

          {/* Right: Action buttons */}
          <div className="flex items-center gap-3 md:ml-4">
            <Button
              variant={BUTTON_STYLES.GHOST_ICON.variant}
              size={BUTTON_STYLES.GHOST_ICON.size}
              onClick={() => {
                setSearchName("");
                setSearchTypeId("all");
                setPeriod(() => {
                  const y = new Date().getFullYear();
                  const start = new Date(y, 0, 1).toISOString().slice(0, 10);
                  const end = new Date(y, 11, 31).toISOString().slice(0, 10);
                  return { label: "This Year", startDate: start, endDate: end };
                });
              }}
              className="border border-border rounded-md p-2"
              title="Reset filters"
              aria-label="Reset filters"
            >
              <RefreshCw className={ICON_SIZES.DEFAULT} />
            </Button>
            <CreateAppraisalButton />
          </div>
        </div>
      </div>

      {/* All/Active/Completed/Draft/Overdue buttons with Pagination */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={teamFilterWithDraft === "All" ? "default" : "outline"}
            onClick={() => handleTabChange("All")}
            className={
              teamFilterWithDraft === "All"
                ? "bg-primary text-primary-foreground"
                : ""
            }
          >
            All
            <Badge
              variant="secondary"
              className="ml-2 bg-slate-100 text-slate-700 border-0 font-semibold"
            >
              {allTeam.length}
            </Badge>
          </Button>
          <Button
            variant={teamFilterWithDraft === "Active" ? "default" : "outline"}
            onClick={() => handleTabChange("Active")}
            className={
              teamFilterWithDraft === "Active"
                ? "bg-primary text-primary-foreground"
                : ""
            }
          >
            Active
            <Badge
              variant="secondary"
              className="ml-2 bg-slate-100 text-slate-700 border-0 font-semibold"
            >
              {active.length}
            </Badge>
          </Button>
          <Button
            variant={
              teamFilterWithDraft === "Completed" ? "default" : "outline"
            }
            onClick={() => handleTabChange("Completed")}
            className={
              teamFilterWithDraft === "Completed"
                ? "bg-primary text-primary-foreground"
                : ""
            }
          >
            Completed
            <Badge
              variant="secondary"
              className="ml-2 bg-slate-100 text-slate-700 border-0 font-semibold"
            >
              {completedTeam.length}
            </Badge>
          </Button>
          <Button
            variant={teamFilterWithDraft === "Draft" ? "default" : "outline"}
            onClick={() => handleTabChange("Draft")}
            className={
              teamFilterWithDraft === "Draft"
                ? "bg-primary text-primary-foreground"
                : ""
            }
          >
            Draft
            <Badge
              variant="secondary"
              className="ml-2 bg-slate-100 text-slate-700 border-0 font-semibold"
            >
              {drafts.length}
            </Badge>
          </Button>
          <Button
            variant={teamFilterWithDraft === "Overdue" ? "default" : "outline"}
            onClick={() => handleTabChange("Overdue")}
            className={
              teamFilterWithDraft === "Overdue"
                ? "bg-primary text-primary-foreground"
                : ""
            }
          >
            Overdue
            <Badge
              variant="secondary"
              className="ml-2 bg-slate-100 text-slate-700 border-0 font-semibold"
            >
              {overdueTeam.length}
            </Badge>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {/* Team Members Badge */}
          <Badge
            variant="outline"
            className="px-3 py-1.5 text-sm font-medium border-emerald-200 bg-emerald-50 text-emerald-700"
          >
            <Users className="h-4 w-4 mr-1.5" />
            Team Members: {directReportsCount}
          </Badge>
          {filteredTeamSearchWithDraft.length > 0 && (
            <div
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-1.5 py-1 shadow-sm backdrop-blur flex-shrink-0 whitespace-nowrap"
              aria-live="polite"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTeamPage((p) => Math.max(1, p - 1))}
                disabled={teamPage <= 1}
                title="Previous page"
                aria-label="Previous page"
                className="rounded-full hover:bg-primary/10"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="hidden sm:inline px-2 text-xs font-medium text-muted-foreground">
                Page {teamPage} <span className="mx-1">/</span> {teamTotalPages}
              </span>
              <span className="sr-only sm:hidden">
                Page {teamPage} of {teamTotalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setTeamPage((p) => Math.min(teamTotalPages, p + 1))
                }
                disabled={teamPage >= teamTotalPages}
                title="Next page"
                aria-label="Next page"
                className="rounded-full hover:bg-primary/10"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Appraisal Cards */}
      {loading ? (
        <>
          <FiltersSkeleton />
          <AppraisalCardSkeletonList count={5} />
          <PaginationSkeleton />
        </>
      ) : (
        <div className="space-y-4">
          {filteredTeamSearchWithDraft.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 icon-team-appraisals" />
              <p>No items</p>
            </div>
          ) : (
            teamPaged.map((a) => {
              // determine border color based on status
              let borderLeftColor = "#3b82f6"; // default (info)
              if (a.status === "Complete") borderLeftColor = "#10b981"; // green
              else if (a.status === "Draft") borderLeftColor = "#f97316"; // orange

              const actionButtons = (
                <>
                  {a.status === "Draft" && (
                    <div className="flex items-center gap-3">
                      <EditAppraisalButton
                        appraisalId={a.appraisal_id}
                        onSuccess={loadAppraisals}
                        className="min-w-[80px]"
                      />
                      <DeleteAppraisalButton
                        appraisalId={a.appraisal_id}
                        appraisalTitle={`for ${empNameById(
                          a.appraisee_id
                        )} - ${typeNameById(a.appraisal_type_id)}`}
                        onSuccess={loadAppraisals}
                        className="min-w-[80px]"
                      />
                    </div>
                  )}
                  {a.status === "Appraiser Evaluation" &&
                    a.appraiser_id === (user?.emp_id || -1) && (
                      <Button
                        onClick={() =>
                          navigate(`/appraiser-evaluation/${a.appraisal_id}`)
                        }
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        aria-label="Evaluate appraisal"
                        title="Evaluate appraisal"
                      >
                        <span className="hidden sm:inline">Evaluate</span>
                        <ArrowRight className="h-4 w-4 sm:ml-2" />
                      </Button>
                    )}
                  {a.status === "Reviewer Evaluation" &&
                    a.reviewer_id === (user?.emp_id || -1) && (
                      <Button
                        onClick={() =>
                          navigate(`/reviewer-evaluation/${a.appraisal_id}`)
                        }
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        aria-label="Review appraisal"
                        title="Review appraisal"
                      >
                        <span className="hidden sm:inline">Review</span>
                        <ArrowRight className="h-4 w-4 sm:ml-2" />
                      </Button>
                    )}
                  {a.status === "Complete" && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(
                          `/appraisal/${a.appraisal_id}?from=team-appraisal&tab=${teamFilterWithDraft}`
                        )
                      }
                      className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/40"
                      aria-label="View appraisal"
                      title="View appraisal"
                    >
                      <span className="hidden sm:inline">View</span>
                      <ArrowRight className="h-4 w-4 sm:ml-2" />
                    </Button>
                  )}
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
  );
};

export default TeamAppraisal;
