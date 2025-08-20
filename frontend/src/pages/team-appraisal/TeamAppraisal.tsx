import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../utils/api";
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
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import {
  Users,
  FileEdit,
  Activity,
  CheckCircle2,
  Calendar,
  UserRound,
  ArrowRight,
  ArrowLeft,
  Edit,
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

type Employee = { emp_id: number; emp_name: string; emp_roles?: string };
type AppraisalType = { id: number; name: string };

const TeamAppraisal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [types, setTypes] = useState<AppraisalType[]>([]);
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
      const [aAppraiser, aReviewerActive, aReviewerCompleted, e, t] =
        await Promise.all([
          apiFetch<Appraisal[]>(
            `/api/appraisals?appraiser_id=${encodeURIComponent(user.emp_id)}`
          ),
          apiFetch<Appraisal[]>(
            `/api/appraisals?reviewer_id=${encodeURIComponent(
              user.emp_id
            )}&status=${encodeURIComponent("Reviewer Evaluation")}`
          ),
          apiFetch<Appraisal[]>(
            `/api/appraisals?reviewer_id=${encodeURIComponent(
              user.emp_id
            )}&status=${encodeURIComponent("Complete")}`
          ),
          apiFetch<Employee[]>(`/api/employees`),
          apiFetch<AppraisalType[]>(`/api/appraisal-types`),
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
        [...listA, ...listRActive, ...listRCompleted].forEach((item) =>
          map.set(item.appraisal_id, item)
        );
        setAppraisals(Array.from(map.values()));
      }
      if (e.ok && e.data) setEmployees(e.data);
      if (t.ok && t.data) setTypes(t.data);
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
  const displayStatus = (s: string) =>
    s === "Submitted" ? "Waiting Acknowledgement" : s;

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
  // Active for appraiser: statuses they can act on
  const appraiserActiveStatuses = new Set<string>([
    "Submitted",
    "Appraisee Self Assessment",
    "Appraiser Evaluation",
  ]);
  const activeAsAppraiser = appraisalsInPeriod.filter(
    (a) =>
      a.appraiser_id === (user?.emp_id || -1) &&
      appraiserActiveStatuses.has(a.status)
  );
  // Active for reviewer: only items in Reviewer Evaluation assigned to them
  const activeAsReviewer = appraisalsInPeriod.filter(
    (a) =>
      a.reviewer_id === (user?.emp_id || -1) &&
      a.status === "Reviewer Evaluation"
  );
  const active = [...activeAsAppraiser, ...activeAsReviewer];
  const completedTeam = appraisalsInPeriod.filter(
    (a) =>
      a.status === "Complete" &&
      (a.appraiser_id === (user?.emp_id || -1) ||
        a.reviewer_id === (user?.emp_id || -1))
  );

  const uniqueTeamCount = useMemo(
    () => new Set(appraisalsInPeriod.map((a) => a.appraisee_id)).size,
    [appraisalsInPeriod]
  );

  // Combined list (Active + Completed) with filter controls
  const combinedTeam = useMemo(
    () =>
      [...active, ...completedTeam].sort(
        (a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
      ),
    [active, completedTeam]
  );
  const [teamFilter, setTeamFilter] = useState<"Active" | "Completed" | "All">(
    "Active"
  );
  const filteredTeam = useMemo(() => {
    switch (teamFilter) {
      case "Active":
        return active;
      case "Completed":
        return completedTeam;
      default:
        return combinedTeam;
    }
  }, [teamFilter, active, completedTeam, combinedTeam]);

  // Search filters
  const [searchName, setSearchName] = useState("");
  const [searchTypeId, setSearchTypeId] = useState<string>("all");
  const filteredTeamSearch = useMemo(() => {
    const name = searchName.trim().toLowerCase();
    return filteredTeam.filter((a) => {
      const matchName = name
        ? empNameById(a.appraisee_id).toLowerCase().includes(name)
        : true;
      const matchType = searchTypeId === "all"
        ? true
        : a.appraisal_type_id === Number(searchTypeId);
      return matchName && matchType;
    });
  }, [filteredTeam, searchName, searchTypeId, empNameById]);

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

  // After navigation, list will refresh on mount/useEffect; modal close handler removed

  // Pagination (5 per page) for each section
  const ITEMS_PER_PAGE = 5;
  const [draftsPage, setDraftsPage] = useState(1);
  const [teamPage, setTeamPage] = useState(1);

  const draftsTotalPages = Math.max(
    1,
    Math.ceil(drafts.length / ITEMS_PER_PAGE)
  );
  const teamTotalPages = Math.max(1, Math.ceil(filteredTeamSearch.length / ITEMS_PER_PAGE));

  const draftsPaged = useMemo(
    () =>
      drafts.slice(
        (draftsPage - 1) * ITEMS_PER_PAGE,
        draftsPage * ITEMS_PER_PAGE
      ),
    [drafts, draftsPage]
  );
  const teamPaged = useMemo(
    () =>
      filteredTeamSearch.slice(
        (teamPage - 1) * ITEMS_PER_PAGE,
        teamPage * ITEMS_PER_PAGE
      ),
    [filteredTeamSearch, teamPage]
  );

  // Reset to first page when data changes
  useEffect(() => {
    setDraftsPage(1);
  }, [drafts.length]);
  useEffect(() => {
    setTeamPage(1);
  }, [filteredTeamSearch.length, teamFilter, searchName, searchTypeId]);

  return (
    <div className="space-y-6 text-neutral-800">
      {/* Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="transition-all duration-200 hover:shadow-md lg:col-span-1">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900">
              {uniqueTeamCount}
            </div>
            <p className="text-xs text-neutral-500">
              Direct reports in appraisals
            </p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileEdit className="h-4 w-4 text-orange-600" />
              Drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900">
              {drafts.length}
            </div>
            <p className="text-xs text-neutral-500">Editable appraisals</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-900">
              {active.length}
            </div>
            <p className="text-xs text-neutral-500">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        {/* Left: search */}
        <div className="sm:flex-1">
          <Input
            placeholder="Search employee name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>
        {/* Right: type + period */}
        <div className="flex items-end gap-3 sm:w-auto">
          <div className="w-full sm:w-40">
            <Select value={searchTypeId} onValueChange={(v) => setSearchTypeId(v)}>
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
          <div className="w-full sm:w-[540px]">
            <PeriodFilter
              defaultPreset="This Year"
              value={period}
              onChange={setPeriod}
            />
          </div>
        </div>
      </div>

      {/* Sections grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Draft Appraisals */}
        <Card className="transition-all duration-200 hover:shadow-md lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-orange-600" />
              Drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Pager */}
            {drafts.length > 0 && (
              <div className="flex items-center justify-end gap-2 mb-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDraftsPage((p) => Math.max(1, p - 1))}
                  disabled={draftsPage <= 1}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-neutral-600">
                  Page {draftsPage} of {draftsTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setDraftsPage((p) => Math.min(draftsTotalPages, p + 1))
                  }
                  disabled={draftsPage >= draftsTotalPages}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-neutral-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {drafts.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    <FileEdit className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
                    <p>No drafts</p>
                  </div>
                ) : (
                  draftsPaged.map((a) => (
                    <div
                      key={a.appraisal_id}
                      className="rounded-lg border border-neutral-200 bg-white p-3 sm:p-4 text-sm transition-all duration-200 hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-orange-100 text-orange-600">
                              <UserRound className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <div className="font-medium text-neutral-900">
                              {empNameById(a.appraisee_id)} •{" "}
                              {typeNameById(a.appraisal_type_id)}
                            </div>
                            <div className="text-sm text-neutral-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(a.start_date)} –{" "}
                              {formatDate(a.end_date)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">
                            {displayStatus(a.status)}
                          </Badge>
                          <Button
                            variant="outline"
                            onClick={() => handleEditDraft(a.appraisal_id)}
                            className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/40"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Team Appraisals (Active + Completed with filter) */}
        <Card className="transition-all duration-200 hover:shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Team Appraisals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex items-center justify-between mb-3 gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant={teamFilter === "Active" ? "default" : "outline"}
                  onClick={() => setTeamFilter("Active")}
                  className={teamFilter === "Active" ? "bg-primary text-primary-foreground" : ""}
                >
                  Active
                </Button>
                <Button
                  variant={teamFilter === "Completed" ? "default" : "outline"}
                  onClick={() => setTeamFilter("Completed")}
                  className={teamFilter === "Completed" ? "bg-primary text-primary-foreground" : ""}
                >
                  Completed
                </Button>
                <Button
                  variant={teamFilter === "All" ? "default" : "outline"}
                  onClick={() => setTeamFilter("All")}
                  className={teamFilter === "All" ? "bg-primary text-primary-foreground" : ""}
                >
                  All
                </Button>
              </div>
              {filteredTeamSearch.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTeamPage((p) => Math.max(1, p - 1))}
                    disabled={teamPage <= 1}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-neutral-600">
                    Page {teamPage} of {teamTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTeamPage((p) => Math.min(teamTotalPages, p + 1))}
                    disabled={teamPage >= teamTotalPages}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-neutral-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTeamSearch.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
                    <p>No items</p>
                  </div>
                ) : (
                  teamPaged.map((a) => (
                    <div
                      key={a.appraisal_id}
                      className="rounded-lg border border-neutral-200 bg-white p-3 sm:p-4 text-sm transition-all duration-200 hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className={a.status === "Complete" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}>
                              <UserRound className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <div className="font-medium text-neutral-900">
                              {empNameById(a.appraisee_id)} • {typeNameById(a.appraisal_type_id)}
                            </div>
                            <div className="text-sm text-neutral-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(a.start_date)} – {formatDate(a.end_date)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {a.status === "Complete" ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                              Completed
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                              {displayStatus(a.status)}
                            </Badge>
                          )}
                          {a.status === "Appraiser Evaluation" && (
                            <Button
                              onClick={() =>
                                navigate(`/appraiser-evaluation/${a.appraisal_id}`)
                              }
                              className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                              Evaluate
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          )}
                          {a.status === "Reviewer Evaluation" && a.reviewer_id === (user?.emp_id || -1) && (
                            <Button
                              onClick={() =>
                                navigate(`/reviewer-evaluation/${a.appraisal_id}`)
                              }
                              className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                              Evaluate
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          )}
                          {a.status === "Complete" && (
                            <Button
                              variant="outline"
                              onClick={() => navigate(`/appraisal/${a.appraisal_id}`)}
                              className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/40"
                            >
                              View
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal removed; editing handled by routing */}
    </div>
  );
};

export default TeamAppraisal;
