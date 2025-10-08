import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import CreateAppraisalButton from "../../features/appraisal/CreateAppraisalButton";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
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
  Calendar,
  UserRound,
  ArrowRight,
  ArrowLeft,
  Edit,
  Users,
  User,
  UserCheck,
  CheckCircle,
  Clock,
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

  useEffect(() => {
    const load = async () => {
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
    load();
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

  const handleEditDraft = (appraisalId: number) => {
    navigate(`/appraisal/edit/${appraisalId}`);
  };

  const getAvatarClassName = (status: string) => {
    if (status === "Draft") return "bg-orange-50 text-orange-600";
    if (status === "Complete") return "bg-muted text-foreground";
    return "bg-primary/10 text-primary";
  };

  // After navigation, list will refresh on mount/useEffect; modal close handler removed

  // Pagination (5 per page) for each section
  const ITEMS_PER_PAGE = 5;
  const [teamPage, setTeamPage] = useState(1);

  // Combined appraisals including drafts
  const [teamFilterWithDraft, setTeamFilterWithDraft] = useState<
    "Active" | "Completed" | "Draft"
  >("Active");

  const filteredTeamWithDraft = useMemo(() => {
    switch (teamFilterWithDraft) {
      case "Active":
        return active;
      case "Completed":
        return completedTeam;
      case "Draft":
        return drafts;
      default:
        return active;
    }
  }, [teamFilterWithDraft, active, completedTeam, drafts]);

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

  return (
    <div className="space-y-6 text-foreground">
      {/* Create Appraisal and Manage Templates buttons */}
      <div className="flex justify-end">
        <CreateAppraisalButton />
      </div>

      {/* Filter Components - Always visible at the top */}
      <div className="w-full">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full md:flex-1 min-w-0">
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

      {/* Active/Completed/Draft buttons with Pagination */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant={teamFilterWithDraft === "Active" ? "default" : "outline"}
            onClick={() => setTeamFilterWithDraft("Active")}
            className={
              teamFilterWithDraft === "Active"
                ? "bg-primary text-primary-foreground"
                : ""
            }
          >
            Active
            <Badge
              variant="secondary"
              className="ml-2 bg-background/20 text-current border-0"
            >
              {active.length}
            </Badge>
          </Button>
          <Button
            variant={
              teamFilterWithDraft === "Completed" ? "default" : "outline"
            }
            onClick={() => setTeamFilterWithDraft("Completed")}
            className={
              teamFilterWithDraft === "Completed"
                ? "bg-primary text-primary-foreground"
                : ""
            }
          >
            Completed
            <Badge
              variant="secondary"
              className="ml-2 bg-background/20 text-current border-0"
            >
              {completedTeam.length}
            </Badge>
          </Button>
          <Button
            variant={teamFilterWithDraft === "Draft" ? "default" : "outline"}
            onClick={() => setTeamFilterWithDraft("Draft")}
            className={
              teamFilterWithDraft === "Draft"
                ? "bg-primary text-primary-foreground"
                : ""
            }
          >
            Draft
            <Badge
              variant="secondary"
              className="ml-2 bg-background/20 text-current border-0"
            >
              {drafts.length}
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
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-40 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTeamSearchWithDraft.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 icon-team-appraisals" />
              <p>No items</p>
            </div>
          ) : (
            teamPaged.map((a) => (
              <Card
                key={a.appraisal_id}
                className="shadow-soft hover:shadow-md transition-all border-l-4"
                style={{
                  borderLeftColor:
                    a.status === "Complete"
                      ? "#10b981"
                      : a.status === "Draft"
                      ? "#f97316"
                      : "#3b82f6",
                }}
              >
                <CardContent className="p-5 sm:p-6">
                  {/* Header Section */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback
                            className={getAvatarClassName(a.status)}
                          >
                            <UserRound className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            {empNameById(a.appraisee_id)}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-muted-foreground">
                              {typeNameById(a.appraisal_type_id)}
                            </span>
                            {rangeNameById(a.appraisal_type_range_id) && (
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200"
                              >
                                {rangeNameById(a.appraisal_type_range_id)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground ml-13">
                        <Calendar className="h-4 w-4" />
                        <span>Due: {formatDate(a.end_date)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.status === "Draft" && (
                        <Button
                          variant="outline"
                          onClick={() => handleEditDraft(a.appraisal_id)}
                          className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/40"
                          aria-label="Edit draft appraisal"
                          title="Edit draft appraisal"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                      )}
                      {a.status === "Appraiser Evaluation" &&
                        a.appraiser_id === (user?.emp_id || -1) && (
                          <Button
                            onClick={() =>
                              navigate(
                                `/appraiser-evaluation/${a.appraisal_id}`
                              )
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
                      {/* Only show View button for Complete status */}
                      {a.status === "Complete" && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            navigate(`/appraisal/${a.appraisal_id}`)
                          }
                          className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/40"
                          aria-label="View appraisal"
                          title="View appraisal"
                        >
                          <span className="hidden sm:inline">View</span>
                          <ArrowRight className="h-4 w-4 sm:ml-2" />
                        </Button>
                      )}
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

export default TeamAppraisal;
