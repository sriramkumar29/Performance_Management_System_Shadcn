import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import CreateTemplateModal from "../../components/modals/CreateTemplateModal";
import EditTemplateModal from "../../components/modals/EditTemplateModal";
// getHeadersByRole removed - use getAllHeaders/loadTemplates with filterType instead
import type {
  GoalTemplateHeaderWithTemplates,
  Role,
} from "../../types/goalTemplateHeader";
import { Card, CardContent } from "../../components/ui/card";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Edit,
  FileText,
  Tag,
  Target,
  Weight,
  RefreshCw,
  Copy,
  Share2,
  Building2,
  User,
  Share,
  Flag,
  TrendingUp,
} from "lucide-react";
import { isManagerOrAbove } from "../../utils/roleHelpers";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import EditHeaderModal from "../../components/modals/EditHeaderModal";
import ShareHeaderModal from "../../components/modals/ShareHeaderModal";
import {
  deleteTemplateHeader,
  getAllHeaders,
  cloneHeaderToSelf,
} from "../../api/goalTemplateHeaders";

interface Category {
  id: number;
  name: string;
}

interface GoalTemplate {
  temp_id: number;
  temp_title: string;
  temp_description: string;
  temp_weightage: number;
  temp_importance: string;
  temp_performance_factor: string;
  categories?: Category[];
}

// Pagination controls (shared pattern used in MyAppraisal)
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

/**
 * Helper to check if user is a manager or above using new role system.
 */
// Use centralized role helper for manager-or-above checks (excludes Admin)

const GoalTemplates = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [headers, setHeaders] = useState<GoalTemplateHeaderWithTemplates[]>([]);
  // Cached global headers to allow client-side filtering without refetching
  const [allHeaders, setAllHeaders] = useState<
    GoalTemplateHeaderWithTemplates[]
  >([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<
    "organization" | "self" | "shared" | null
  >("organization");
  // selectedHeaderId removed — quick header access removed
  const [expandedHeaders, setExpandedHeaders] = useState<Set<number>>(
    new Set()
  );
  const [editingHeader, setEditingHeader] =
    useState<GoalTemplateHeaderWithTemplates | null>(null);
  const [editHeaderModalOpen, setEditHeaderModalOpen] = useState(false);
  const [sharingHeader, setSharingHeader] =
    useState<GoalTemplateHeaderWithTemplates | null>(null);
  const [shareHeaderModalOpen, setShareHeaderModalOpen] = useState(false);
  const [deleteHeaderConfirmId, setDeleteHeaderConfirmId] = useState<
    number | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  // importance/category filters removed per request
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [cloningHeaderId, setCloningHeaderId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Helper function to refresh the cache with user-specific data
  const refreshCache = async () => {
    const [orgData, selfData, sharedData] = await Promise.all([
      getAllHeaders(0, 100, "organization"),
      getAllHeaders(0, 100, "self"),
      getAllHeaders(0, 100, "shared"),
    ]);

    const combinedData: GoalTemplateHeaderWithTemplates[] = [];
    if (orgData.ok && orgData.data) combinedData.push(...orgData.data);
    if (selfData.ok && selfData.data) combinedData.push(...selfData.data);
    if (sharedData.ok && sharedData.data) combinedData.push(...sharedData.data);

    const uniqueHeaders = Array.from(
      new Map(combinedData.map((h) => [h.header_id, h])).values()
    );

    setAllHeaders(uniqueHeaders);
    return uniqueHeaders;
  };

  const openConfirmDelete = (id: number) => setConfirmDeleteId(id);
  const closeConfirmDelete = () => setConfirmDeleteId(null);
  const confirmDelete = async () => {
    if (confirmDeleteId == null) return;
    try {
      setDeletingId(confirmDeleteId);
      const res = await apiFetch(`/api/goals/templates/${confirmDeleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(res.error || "Failed to delete template");
      toast.success("Template deleted");
      // Refresh cache and reapply filters
      const updatedCache = await refreshCache();
      let filtered = updatedCache;
      if (selectedRoleId) {
        filtered = filtered.filter((h) => h.role_id === selectedRoleId);
      }
      if (filterType) {
        filtered = filtered.filter((h) =>
          filterType === "shared"
            ? h.is_shared
            : (h.goal_template_type || "").toLowerCase() === filterType
        );
      }
      setHeaders(filtered);
      setTemplates(filtered.flatMap((h) => h.goal_templates || []));
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setDeletingId(null);
      closeConfirmDelete();
    }
  };
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalInitialHeaderId, setCreateModalInitialHeaderId] = useState<
    number | null
  >(null);
  const [createModalInitialRoleId, setCreateModalInitialRoleId] = useState<
    number | null
  >(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(
    null
  );
  const [editModalRemaining, setEditModalRemaining] = useState<
    number | undefined
  >(undefined);
  // create header now handled on separate page

  const loadTemplates = async (
    filterTypeParam?: "organization" | "self" | "shared" | null,
    options?: { suppressLoading?: boolean }
  ): Promise<GoalTemplateHeaderWithTemplates[] | null> => {
    const suppressLoading = options?.suppressLoading ?? false;
    if (!suppressLoading) setLoading(true);
    try {
      // Load headers with optional filtering
      // Pass the component search state as the 'search' parameter so backend will
      // apply search filtering server-side in coordination with pagination and filters.
      const res = await getAllHeaders(
        0,
        100,
        filterTypeParam || undefined,
        filter
      );
      if (res.ok && res.data) {
        // Only cache allHeaders when loading ALL headers (no search filter AND no type filter)
        if (!filter && !filterTypeParam) {
          setAllHeaders(res.data);
        }
        setHeaders(res.data);
        const flattened = res.data.flatMap((h) => h.goal_templates || []);
        setTemplates(flattened as GoalTemplate[]);
        return res.data;
      } else {
        // Fallback to older endpoint if headers endpoint fails
        const fallback = await apiFetch("/api/goals/templates");
        if (!fallback.ok)
          throw new Error(fallback.error || "Failed to load templates");
        setTemplates((fallback.data as GoalTemplate[]) || []);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to load templates");
    } finally {
      if (!suppressLoading) setLoading(false);
    }
    return null;
  };

  const loadRoles = async () => {
    try {
      const res = await apiFetch<Role[]>("/api/roles/");
      if (res.ok && res.data) {
        // Filter out Admin and CEO roles so they don't appear in the role selector
        const filtered = (res.data as Role[]).filter((r) => {
          const name = (r.role_name || "").toLowerCase();
          return !name.includes("admin") && !name.includes("ceo");
        });
        setRoles(filtered);
        return filtered;
      }
    } catch (err) {
      console.error("Failed to load roles", err);
    }
    return [] as Role[];
  };

  // roleCounts removed: we no longer show per-role template counts in the UI.

  const toggleHeaderExpanded = (headerId: number) => {
    setExpandedHeaders((prev) => {
      const next = new Set(prev);
      if (next.has(headerId)) next.delete(headerId);
      else next.add(headerId);
      return next;
    });
  };

  // ...existing code...

  const handleDeleteHeader = async (headerId: number) => {
    try {
      const res = await deleteTemplateHeader(headerId);
      if (res.ok) {
        toast.success("Header deleted successfully");
        // Refresh cache and reapply filters
        const updatedCache = await refreshCache();
        let filtered = updatedCache;
        if (selectedRoleId) {
          filtered = filtered.filter((h) => h.role_id === selectedRoleId);
        }
        if (filterType) {
          filtered = filtered.filter((h) =>
            filterType === "shared"
              ? h.is_shared
              : (h.goal_template_type || "").toLowerCase() === filterType
          );
        }
        setHeaders(filtered);
        setTemplates(filtered.flatMap((h) => h.goal_templates || []));
      } else {
        toast.error(res.error || "Failed to delete header");
      }
    } catch (e) {
      console.error("Failed to delete header", e);
      toast.error("Failed to delete header");
    }
    setDeleteHeaderConfirmId(null);
  };

  const handleCloneHeader = async (headerId: number) => {
    try {
      setCloningHeaderId(headerId);
      const res = await cloneHeaderToSelf(headerId);
      if (res.ok) {
        toast.success("Header cloned to your Self templates");
        // Refresh cache and reapply filters
        const updatedCache = await refreshCache();
        let filtered = updatedCache;
        if (selectedRoleId) {
          filtered = filtered.filter((h) => h.role_id === selectedRoleId);
        }
        if (filterType) {
          filtered = filtered.filter((h) =>
            filterType === "shared"
              ? h.is_shared
              : (h.goal_template_type || "").toLowerCase() === filterType
          );
        }
        setHeaders(filtered);
        setTemplates(filtered.flatMap((h) => h.goal_templates || []));
      } else {
        // Show more specific error messages
        const errorMsg = res.error || "Failed to clone header";
        if (errorMsg.toLowerCase().includes("too many existing copies")) {
          toast.error(
            "Unable to clone: You have too many copies of this header already"
          );
        } else if (
          errorMsg.toLowerCase().includes("duplicate") ||
          errorMsg.toLowerCase().includes("already exists")
        ) {
          toast.error(
            "A copy of this header already exists in your Self templates"
          );
        } else {
          toast.error(errorMsg);
        }
      }
    } catch (e: any) {
      console.error("Failed to clone header", e);
      const errorMsg = e?.message || "Failed to clone header";
      if (errorMsg.toLowerCase().includes("too many existing copies")) {
        toast.error(
          "Unable to clone: You have too many copies of this header already"
        );
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setCloningHeaderId(null);
    }
  };

  const handleCreateSuccess = async () => {
    setShowCreateModal(false);
    // Refresh cache and reapply filters
    const updatedCache = await refreshCache();
    let filtered = updatedCache;
    if (selectedRoleId) {
      filtered = filtered.filter((h) => h.role_id === selectedRoleId);
    }
    if (filterType) {
      filtered = filtered.filter((h) =>
        filterType === "shared"
          ? h.is_shared
          : (h.goal_template_type || "").toLowerCase() === filterType
      );
    }
    setHeaders(filtered);
    setTemplates(filtered.flatMap((h) => h.goal_templates || []));
  };

  const handleEditSuccess = async () => {
    setShowEditModal(false);
    setEditingTemplateId(null);
    // Refresh cache and reapply filters
    const updatedCache = await refreshCache();
    let filtered = updatedCache;
    if (selectedRoleId) {
      filtered = filtered.filter((h) => h.role_id === selectedRoleId);
    }
    if (filterType) {
      filtered = filtered.filter((h) =>
        filterType === "shared"
          ? h.is_shared
          : (h.goal_template_type || "").toLowerCase() === filterType
      );
    }
    setHeaders(filtered);
    setTemplates(filtered.flatMap((h) => h.goal_templates || []));
  };

  const handleEditClick = (templateId: number) => {
    // Compute remaining allowed weight for the template's header (if available)
    let remaining: number | undefined = undefined;
    try {
      const header = allHeaders.find((h) =>
        (h.goal_templates || []).some((t) => t.temp_id === templateId)
      );
      if (header) {
        const templatesInHeader = header.goal_templates || [];
        const total = templatesInHeader.reduce(
          (s, t) => s + (t?.temp_weightage ?? 0),
          0
        );
        const current =
          templatesInHeader.find((t) => t.temp_id === templateId)
            ?.temp_weightage ?? 0;
        remaining = Math.max(0, 100 - (total - current));
      }
    } catch (e) {
      // fallback: undefined remaining
      remaining = undefined;
    }

    setEditModalRemaining(remaining);
    setEditingTemplateId(templateId);
    setShowEditModal(true);
  };

  useEffect(() => {
    // Load roles first. Default the view to 'All Roles' (global flattened templates)
    // so the page doesn't stay in a perpetual loading state when roles exist.
    (async () => {
      setLoading(true);
      try {
        await loadRoles();

        // Load all three types to populate cache with user-specific data
        const [orgData, selfData, sharedData] = await Promise.all([
          getAllHeaders(0, 100, "organization"),
          getAllHeaders(0, 100, "self"),
          getAllHeaders(0, 100, "shared"),
        ]);

        // Combine all data for the cache
        const combinedData: GoalTemplateHeaderWithTemplates[] = [];
        if (orgData.ok && orgData.data) combinedData.push(...orgData.data);
        if (selfData.ok && selfData.data) combinedData.push(...selfData.data);
        if (sharedData.ok && sharedData.data)
          combinedData.push(...sharedData.data);

        // Remove duplicates
        const uniqueHeaders = Array.from(
          new Map(combinedData.map((h) => [h.header_id, h])).values()
        );

        setAllHeaders(uniqueHeaders);

        // Default view: show Organization headers
        if (orgData.ok && orgData.data) {
          setHeaders(orgData.data);
          setTemplates(orgData.data.flatMap((h) => h.goal_templates || []));
        }
      } catch (error) {
        console.error("Failed to load templates:", error);
        toast.error("Failed to load templates");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // whenever roles change, no per-role counts are required anymore; keep dropdown default as 'All Roles'
  useEffect(() => {
    // noop - roles are loaded elsewhere and the dropdown defaults to All Roles
  }, [roles, selectedRoleId]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // category/importance lists removed — we filter only by text search now

  const getImportanceBadgeColor = (importance: string) => {
    switch (importance) {
      case "High":
        return "bg-rose-100 text-rose-700 border-rose-300";
      case "Medium":
        return "bg-amber-100 text-amber-700 border-amber-300";
      case "Low":
        return "bg-green-100 text-green-700 border-green-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();

    // If the search string matches a header title, include all templates from that header
    const headerMatchedTemplateIds = new Set<number>();
    if (q) {
      allHeaders.forEach((h) => {
        // Match header title OR header description
        if (
          (h.title && h.title.toLowerCase().includes(q)) ||
          (h.description && h.description.toLowerCase().includes(q))
        ) {
          (h.goal_templates || []).forEach((t) =>
            headerMatchedTemplateIds.add(t.temp_id)
          );
        }
      });
    }

    return templates.filter((t) => {
      // Text search filter (template fields) or header-title match
      if (q) {
        const matchText =
          t.temp_title.toLowerCase().includes(q) ||
          t.temp_description.toLowerCase().includes(q) ||
          t.temp_performance_factor.toLowerCase().includes(q) ||
          t.categories?.some((c) => c.name.toLowerCase().includes(q));

        if (!matchText && !headerMatchedTemplateIds.has(t.temp_id))
          return false;
      }
      return true;
    });
  }, [templates, filter, allHeaders]);

  // Filter headers by search: include headers whose title or description match the query
  // or headers that contain at least one template that matches the current visible set.
  const filteredHeaders = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return headers;
    return headers.filter((h) => {
      const headerMatch =
        (h.title && h.title.toLowerCase().includes(q)) ||
        (h.description && h.description.toLowerCase().includes(q));
      if (headerMatch) return true;
      const headerTemplates = (h.goal_templates || []).filter((t) =>
        visible.some((v) => v.temp_id === t.temp_id)
      );
      return headerTemplates.length > 0;
    });
  }, [headers, visible, filter]);

  // Pagination (5 per page)
  const ITEMS_PER_PAGE = 5;
  const [page, setPage] = useState(1);

  // Pagination for headers (grouped view)
  const HEADERS_PER_PAGE = 5;
  const [headerPage, setHeaderPage] = useState(1);
  const headerTotalPages = Math.max(
    1,
    Math.ceil(filteredHeaders.length / HEADERS_PER_PAGE)
  );
  const headersPaged = filteredHeaders.slice(
    (headerPage - 1) * HEADERS_PER_PAGE,
    headerPage * HEADERS_PER_PAGE
  );

  const visiblePaged = useMemo(
    () => visible.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [visible, page]
  );

  // Reset to first page when filters or data change
  useEffect(() => {
    setPage(1);
  }, [visible.length, filter]);

  // Reset header page to 1 when headers or filter change
  useEffect(() => {
    setHeaderPage(1);
  }, [headers, filter]);

  // Render the global (All Roles) flattened templates area.
  const renderGlobalList = () => {
    if (visible.length === 0) {
      return (
        <Card className="shadow-soft border-0 glass-effect">
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground text-lg mb-2">
              No templates found
            </div>
            <div className="text-sm text-muted-foreground">
              {filter.trim()
                ? "Try adjusting your search criteria"
                : "Create your first goal template to get started"}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (visible.length === 1) {
      return (
        <Card className="shadow-soft border-0 glass-effect">
          <CardContent className="p-6">
            <div className="text-sm font-semibold mb-2">
              One ungrouped template found
            </div>
            <div className="text-sm text-muted-foreground">
              We detected a single template in the global list. To view
              templates grouped by header, assign this template to a header or
              select a role from the Role dropdown.
            </div>
          </CardContent>
        </Card>
      );
    }

    return visiblePaged.map((t: GoalTemplate) => {
      const parentHeader = allHeaders.find((h) =>
        (h.goal_templates || []).some((ht) => ht.temp_id === t.temp_id)
      );
      const parentIsShared = Boolean(
        parentHeader &&
          (String(parentHeader.goal_template_type).toLowerCase() === "shared" ||
            parentHeader.is_shared)
      );

      return (
        <Card key={t.temp_id} className="p-4 bg-accent/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary flex-shrink-0" />
                <h4 className="font-semibold">{t.temp_title}</h4>
                <Badge
                  variant="secondary"
                  className={`flex-shrink-0 ${getImportanceBadgeColor(
                    t.temp_importance
                  )}`}
                >
                  <Flag className="h-3 w-3 mr-1" />
                  {t.temp_importance}
                </Badge>
                <Badge
                  variant="secondary"
                  className="flex-shrink-0 bg-purple-50 text-purple-700 border-purple-200"
                >
                  <Weight className="h-3 w-3 mr-1" />
                  {t.temp_weightage}%
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-2">
                {t.temp_description}
              </p>

              <div className="flex items-start gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Performance Factors:</span>{" "}
                  {t.temp_performance_factor}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {t.categories?.map((cat) => (
                  <Badge
                    key={cat.id}
                    variant="outline"
                    className="text-xs bg-amber-50 text-amber-600 border-amber-200"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {cat.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-1 flex-shrink-0">
              {isManagerOrAbove(user?.role_id, user?.role?.role_name) && (
                <>
                  {/* Disable/hide edit for templates that belong to Shared headers */}
                  {!parentIsShared && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(t.temp_id)}
                      title="Edit template"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openConfirmDelete(t.temp_id)}
                    title="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      );
    });
  };

  // (PaginationControls is defined at module scope above)

  return (
    <div className="space-y-3 text-foreground">
      {/* Header Section - Direct layout without card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant={BUTTON_STYLES.BACK.variant}
            size={BUTTON_STYLES.BACK.size}
            onClick={() => navigate("/")}
            className={`flex items-center gap-2 ${BUTTON_STYLES.BACK.className}`}
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className={ICON_SIZES.DEFAULT} />
          </Button>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-normal pb-1">
              Manage Goal Templates
            </h1>
            <p className="text-sm">
              {loading ? "Loading…" : `${headers?.length ?? 0} header(s)`}
            </p>
          </div>
        </div>
        {isManagerOrAbove(user?.role_id, user?.role?.role_name) && (
          <div className="flex items-center gap-2">
            {/* <Button
              onClick={() => setShowCreateModal(true)}
              variant={BUTTON_STYLES.CREATE.variant}
              className={`flex items-center gap-2 ${BUTTON_STYLES.CREATE.className}`}
              aria-label="Create Template"
              title="Create Template"
              data-testid="create-template"
            >
              <Plus className={ICON_SIZES.DEFAULT} />
              <span className="hidden sm:inline sm:ml-2">Create Template</span>
            </Button> */}

            {/* Create Header moved into this page */}
            <Button
              onClick={() => navigate("/goal-templates/new-header")}
              variant={BUTTON_STYLES.CREATE.variant}
              className={`ml-2 hidden md:inline-flex items-center gap-2 ${BUTTON_STYLES.CREATE.className}`}
              title="Create Header"
            >
              <Plus className={ICON_SIZES.DEFAULT} />
              Create Template
            </Button>
          </div>
        )}
      </div>

      {/* Search & Filter - Direct layout without card */}
      <div className="w-full space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full md:flex-1 min-w-0">
            <Label className="mb-1 block text-sm font-medium">Search</Label>
            <Input
              id="filter"
              placeholder="Search by title, description"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Role selector (replaces role buttons) */}
          <div className="w-full sm:w-[260px]">
            <Label className="mb-1 block text-sm font-medium">Role</Label>
            <Select
              value={selectedRoleId ? String(selectedRoleId) : "all"}
              onValueChange={async (v) => {
                if (v === "all") {
                  setSelectedRoleId(null);

                  // If Self or Shared filter is active, re-fetch from server
                  // because these are user-specific and can't be filtered locally
                  if (filterType === "self" || filterType === "shared") {
                    const data = await loadTemplates(filterType);
                    if (data) {
                      setHeaders(data);
                      setTemplates(data.flatMap((h) => h.goal_templates || []));
                    }
                  } else {
                    // For Organization or no filter, filter locally from cache
                    let filtered = allHeaders;
                    if (filterType === "organization") {
                      filtered = filtered.filter(
                        (h) =>
                          (h.goal_template_type || "").toLowerCase() ===
                          "organization"
                      );
                    }
                    setHeaders(filtered);
                    setTemplates(
                      filtered.flatMap((h) => h.goal_templates || [])
                    );
                  }
                } else {
                  const id = Number(v);
                  setSelectedRoleId(id);

                  // If Self or Shared filter is active, re-fetch from server
                  // because these are user-specific and can't be filtered locally
                  if (filterType === "self" || filterType === "shared") {
                    const data = await loadTemplates(filterType);
                    if (data) {
                      // Apply role filter to server response
                      const filtered = data.filter((h) => h.role_id === id);
                      setHeaders(filtered);
                      setTemplates(
                        filtered.flatMap((h) => h.goal_templates || [])
                      );
                    }
                  } else {
                    // For Organization or no filter, filter locally from cache
                    let filtered = allHeaders.filter((h) => h.role_id === id);
                    if (filterType === "organization") {
                      filtered = filtered.filter(
                        (h) =>
                          (h.goal_template_type || "").toLowerCase() ===
                          "organization"
                      );
                    }
                    setHeaders(filtered);
                    setTemplates(
                      filtered.flatMap((h) => h.goal_templates || [])
                    );
                  }
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.role_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-auto flex-none flex items-end gap-3">
            <Button
              variant={BUTTON_STYLES.GHOST_ICON.variant}
              size={BUTTON_STYLES.GHOST_ICON.size}
              onClick={() => {
                setFilter("");
                setFilterType("organization");
                setSelectedRoleId(null);
                // Filter locally to show organization headers
                const filtered = allHeaders.filter(
                  (h) =>
                    (h.goal_template_type || "").toLowerCase() ===
                    "organization"
                );
                setHeaders(filtered);
                setTemplates(filtered.flatMap((h) => h.goal_templates || []));
              }}
              className="ml-2 border border-border -mt-5"
              title="Reset filters"
              aria-label="Reset filters"
            >
              <RefreshCw className={ICON_SIZES.DEFAULT} />
            </Button>
          </div>
        </div>

        {/* Filter Type Buttons - Organization, Self, Shared (team-appraisal style) */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="w-full text-sm font-medium mb-1">
              Filter by Type:
            </Label>
            <Button
              variant={filterType === "organization" ? "default" : "outline"}
              size="lg"
              onClick={() => {
                // Always select Organization (do nothing if already selected)
                if (filterType === "organization") return;
                const newFilter = "organization";
                setFilterType(newFilter);

                // Always filter locally from cached data
                let filtered = allHeaders;

                // Apply role filter if selected
                if (selectedRoleId) {
                  filtered = filtered.filter(
                    (h) => h.role_id === selectedRoleId
                  );
                }

                // Apply type filter
                filtered = filtered.filter(
                  (h) =>
                    (h.goal_template_type || "").toLowerCase() === newFilter
                );

                setHeaders(filtered);
                setTemplates(filtered.flatMap((h) => h.goal_templates || []));
              }}
              className={
                filterType === "organization"
                  ? "bg-primary text-primary-foreground flex items-center gap-2 px-3 py-2"
                  : "flex items-center gap-2 px-3 py-2"
              }
            >
              <Building2 className="h-4 w-4" />
              Organization
            </Button>

            <Button
              variant={filterType === "self" ? "default" : "outline"}
              size="lg"
              onClick={async () => {
                // Always select Self (do nothing if already selected)
                if (filterType === "self") return;
                const newFilter = "self";
                setFilterType(newFilter);

                // Self templates are user-specific, so fetch from server
                // The backend will filter by the current user's ID (excludes shared copies)
                // Suppress skeleton loading when switching filter buttons
                const data = await loadTemplates(newFilter, {
                  suppressLoading: true,
                });

                // If a role is selected, apply role filter to the server response
                if (selectedRoleId && data) {
                  const filtered = data.filter(
                    (h) => h.role_id === selectedRoleId
                  );
                  setHeaders(filtered);
                  setTemplates(filtered.flatMap((h) => h.goal_templates || []));
                } else if (data) {
                  // no role selected: show server response as-is
                  setHeaders(data);
                  setTemplates(data.flatMap((h) => h.goal_templates || []));
                }
              }}
              className={
                filterType === "self"
                  ? "bg-primary text-primary-foreground flex items-center gap-2 px-3 py-2"
                  : "flex items-center gap-2 px-3 py-2"
              }
            >
              <User className="h-4 w-4" />
              Self
            </Button>

            <Button
              variant={filterType === "shared" ? "default" : "outline"}
              size="lg"
              onClick={async () => {
                // Always select Shared (do nothing if already selected)
                if (filterType === "shared") return;
                const newFilter = "shared";
                setFilterType(newFilter);

                // Shared templates are editable copies created when someone shared with you
                // Suppress skeleton loading when switching filter buttons
                const data = await loadTemplates(newFilter, {
                  suppressLoading: true,
                });

                // If a role is selected, apply role filter to the server response
                if (selectedRoleId && data) {
                  const filtered = data.filter(
                    (h) => h.role_id === selectedRoleId
                  );
                  setHeaders(filtered);
                  setTemplates(filtered.flatMap((h) => h.goal_templates || []));
                } else if (data) {
                  setHeaders(data);
                  setTemplates(data.flatMap((h) => h.goal_templates || []));
                }
              }}
              className={
                filterType === "shared"
                  ? "bg-primary text-primary-foreground flex items-center gap-2 px-3 py-2"
                  : "flex items-center gap-2 px-3 py-2"
              }
            >
              <Share className="h-4 w-4" />
              Shared
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Header pagination (grouped view) placed to the right of filter buttons */}
            {headers.length > HEADERS_PER_PAGE && (
              <PaginationControls
                currentPage={headerPage}
                totalPages={headerTotalPages}
                onPageChange={setHeaderPage}
              />
            )}
          </div>
        </div>

        {/* Role filter now moved into the Search area as a dropdown */}

        {/* header quick access removed per request */}
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="shadow-soft border-0 glass-effect">
                <CardContent className="p-5 sm:p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-5 w-1/3 rounded" />
                      <div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-5 w-16 rounded-full" />
                    </div>
                    <div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-4 w-full rounded" />
                    <div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-4 w-5/6 rounded" />
                    <div className="flex gap-2">
                      <div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-6 w-16 rounded-full" />
                      <div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-6 w-20 rounded-full" />
                      <div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-6 w-12 rounded-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4" data-testid="template-list">
            {/* If headers exist (either for a selected role or global All Roles), show collapsible headers */}
            {headers.length > 0 ? (
              <div className="space-y-4">
                {headersPaged.map((header) => {
                  // Filter header's templates by the current visible list (which reflects search + filters)
                  const headerTemplates = (header.goal_templates || []).filter(
                    (t) => visible.some((v) => v.temp_id === t.temp_id)
                  );

                  // Compute header flags once per header
                  const headerTypeLower = String(
                    header.goal_template_type || ""
                  ).toLowerCase();
                  const isSharedHeader =
                    headerTypeLower === "shared" || header.is_shared;
                  const isOrganizationHeader =
                    headerTypeLower === "organization";
                  // Only allow editing of organization headers to the creator; other non-shared headers remain editable
                  const canEditHeader =
                    !isSharedHeader &&
                    (!isOrganizationHeader ||
                      header.creator_id === user?.emp_id);
                  // Only allow adding templates to organization headers by the creator; non-organization headers are addable when not shared
                  const canAddHeader =
                    !isSharedHeader &&
                    (!isOrganizationHeader ||
                      header.creator_id === user?.emp_id);

                  // Previously we skipped headers with no matching templates —
                  // show the header even when it has zero templates so users can
                  const totalWeight = headerTemplates.reduce(
                    (s, t) => s + (t?.temp_weightage || 0),
                    0
                  );

                  return (
                    <Card key={header.header_id} className="overflow-hidden">
                      <Collapsible
                        open={expandedHeaders.has(header.header_id)}
                        onOpenChange={() =>
                          toggleHeaderExpanded(header.header_id)
                        }
                      >
                        <CollapsibleTrigger asChild>
                          <CardContent className="w-full p-4 hover:bg-accent/50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold">
                                    {header.title}
                                  </h3>
                                  <Badge
                                    variant="secondary"
                                    className="flex-shrink-0 bg-purple-50 text-purple-700 border-purple-200"
                                  >
                                    {headerTemplates.length} templates
                                  </Badge>
                                  {/* Compact inline weight pill (replaces the separate centered pill) */}
                                  <div
                                    className={`flex items-center gap-2 ml-2 px-3 py-1 rounded-full text-xs font-medium border ${
                                      (totalWeight || 0) > 100
                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                    }`}
                                    title={`Total selected weightage: ${
                                      totalWeight ?? 0
                                    }%`}
                                  >
                                    <Weight className="h-3 w-3" />
                                    <span className="leading-none">
                                      {totalWeight ?? 0}%
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-1">
                                      / 100%
                                    </span>
                                  </div>
                                </div>
                                {/* (moved inline next to title) */}
                                {header.description && (
                                  <p className="text-sm text-muted-foreground text-left">
                                    {header.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Add Goal: only allow when header allows adding (not shared; org headers only to creator) */}
                                {canAddHeader && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Open create template modal pre-selecting this header
                                      setCreateModalInitialHeaderId(
                                        header.header_id
                                      );
                                      setCreateModalInitialRoleId(
                                        header.role_id
                                      );
                                      setShowCreateModal(true);
                                    }}
                                    title="Add Goal"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                )}

                                {/* Header edit: only allow when header is editable and, for organization headers, only the creator */}
                                {canEditHeader && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingHeader(header);
                                      setEditHeaderModalOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                {/* Share button (visible only for Self headers created by current user) */}
                                {header.goal_template_type &&
                                  String(
                                    header.goal_template_type
                                  ).toLowerCase() === "self" &&
                                  header.creator_id === user?.emp_id &&
                                  !(
                                    String(
                                      header.goal_template_type
                                    ).toLowerCase() === "shared" ||
                                    header.is_shared
                                  ) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSharingHeader(header);
                                        setShareHeaderModalOpen(true);
                                      }}
                                      title="Share with others"
                                    >
                                      <Share2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteHeaderConfirmId(header.header_id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                {/* Clone button - visible only for Organization headers */}
                                {header.goal_template_type &&
                                  String(
                                    header.goal_template_type
                                  ).toLowerCase() === "organization" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        await handleCloneHeader(
                                          header.header_id
                                        );
                                      }}
                                      disabled={
                                        cloningHeaderId === header.header_id
                                      }
                                      title={
                                        cloningHeaderId === header.header_id
                                          ? "Cloning…"
                                          : "Clone to customize"
                                      }
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  )}
                                {expandedHeaders.has(header.header_id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-3 border-t pt-3">
                            {headerTemplates.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No templates match your search/filters.
                              </p>
                            ) : (
                              headerTemplates.map((template: GoalTemplate) => (
                                <Card
                                  key={template.temp_id}
                                  className="shadow-soft hover-lift border border-border bg-white/40 dark:bg-transparent glass-effect transition-transform transform hover:-translate-y-1 hover:shadow-xl rounded-xl relative overflow-hidden"
                                >
                                  <CardContent className="p-6">
                                    <div className="space-y-3">
                                      <div className="flex items-start justify-between gap-4 mb-2">
                                        <div className="flex items-start gap-3 flex-1">
                                          <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                                            <Target className="h-6 w-6 text-blue-600" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="mb-2">
                                              <h3 className="text-xl font-bold text-foreground truncate mt-1 leading-normal">
                                                {template.temp_title}
                                              </h3>
                                              <div className="mt-2 flex items-center gap-2">
                                                <Badge className="bg-rose-100 text-rose-700 border-rose-300 font-semibold text-sm flex items-center gap-1">
                                                  <Flag className="h-3 w-3" />
                                                  <span>
                                                    {template.temp_importance}
                                                  </span>
                                                </Badge>
                                                <Badge
                                                  variant="outline"
                                                  className="bg-purple-50 text-purple-700 border-purple-300 font-medium text-sm flex items-center gap-1"
                                                >
                                                  <Weight className="h-3 w-3 text-purple-600" />
                                                  <span>
                                                    {template.temp_weightage}%
                                                  </span>
                                                </Badge>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {isManagerOrAbove(
                                          user?.role_id,
                                          user?.role?.role_name
                                        ) &&
                                          !(
                                            String(
                                              header.goal_template_type
                                            ).toLowerCase() === "shared" ||
                                            header.is_shared
                                          ) && (
                                            <div className="flex gap-2 shrink-0">
                                              <Button
                                                size={BUTTON_STYLES.EDIT.size}
                                                variant={
                                                  BUTTON_STYLES.EDIT.variant
                                                }
                                                onClick={() =>
                                                  handleEditClick(
                                                    template.temp_id
                                                  )
                                                }
                                                className={`flex items-center gap-2 ${BUTTON_STYLES.EDIT.className}`}
                                                aria-label="Edit template"
                                                title="Edit template"
                                              >
                                                <Edit
                                                  className={ICON_SIZES.DEFAULT}
                                                  aria-hidden="true"
                                                />
                                                <span className="hidden sm:inline">
                                                  Edit
                                                </span>
                                              </Button>
                                              <Button
                                                size={BUTTON_STYLES.DELETE.size}
                                                variant={
                                                  BUTTON_STYLES.DELETE.variant
                                                }
                                                disabled={
                                                  deletingId ===
                                                  template.temp_id
                                                }
                                                onClick={() =>
                                                  openConfirmDelete(
                                                    template.temp_id
                                                  )
                                                }
                                                className={`flex items-center gap-2 ${BUTTON_STYLES.DELETE.className}`}
                                                aria-label={
                                                  deletingId ===
                                                  template.temp_id
                                                    ? "Deleting…"
                                                    : "Delete template"
                                                }
                                                title={
                                                  deletingId ===
                                                  template.temp_id
                                                    ? "Deleting…"
                                                    : "Delete template"
                                                }
                                              >
                                                <Trash2
                                                  className={ICON_SIZES.DEFAULT}
                                                  aria-hidden="true"
                                                />
                                                <span className="hidden sm:inline">
                                                  {deletingId ===
                                                  template.temp_id
                                                    ? "Deleting…"
                                                    : "Delete"}
                                                </span>
                                              </Button>
                                            </div>
                                          )}
                                      </div>

                                      {template.categories &&
                                        template.categories.length > 0 && (
                                          <div className="flex items-start gap-3 mt-2 mb-4 pt-0 pl-0">
                                            <div className="p-2 bg-amber-50 rounded-lg shrink-0">
                                              <Tag className="h-4 w-4 text-amber-600" />
                                            </div>
                                            <div className="flex-1">
                                              <p
                                                className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1"
                                                title={`${
                                                  template.categories.length
                                                } categories: ${template.categories
                                                  .map((x) => x.name)
                                                  .join(", ")}`}
                                              >
                                                Category
                                              </p>
                                              <div className="flex flex-wrap gap-2">
                                                {template.categories.map(
                                                  (c: Category) => (
                                                    <Badge
                                                      key={c.id}
                                                      variant="outline"
                                                      className="bg-amber-50 text-amber-700 border-amber-300 font-medium"
                                                      title={c.name}
                                                    >
                                                      {c.name}
                                                    </Badge>
                                                  )
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                      <div className="flex items-start gap-3 mb-4 pl-0">
                                        <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                                          <TrendingUp className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">
                                            Performance Factor
                                          </p>
                                          <p className="text-sm font-semibold text-foreground">
                                            {template.temp_performance_factor}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-start gap-3 mb-4 pl-0">
                                        <div className="p-2 bg-emerald-50 rounded-lg shrink-0">
                                          <FileText className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">
                                            Description
                                          </p>
                                          <p className="text-sm text-foreground leading-relaxed max-h-[4.5rem] overflow-y-auto pr-3 scrollbar-y break-words whitespace-normal overflow-x-hidden">
                                            {template.temp_description}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })}

                <EditHeaderModal
                  open={editHeaderModalOpen}
                  onClose={() => {
                    setEditHeaderModalOpen(false);
                    setEditingHeader(null);
                  }}
                  onSuccess={async () => {
                    // After a successful header edit, reload the headers/templates
                    // to reflect changes. Preserve the current role filter and
                    // the current filterType (organization/self/shared).
                    setEditHeaderModalOpen(false);
                    setEditingHeader(null);

                    const data = await loadTemplates(filterType);
                    if (data) {
                      let filtered = data;
                      if (selectedRoleId) {
                        filtered = filtered.filter(
                          (h) => h.role_id === selectedRoleId
                        );
                      }
                      setHeaders(filtered);
                      setTemplates(
                        filtered.flatMap((h) => h.goal_templates || [])
                      );
                    }
                  }}
                  header={editingHeader as any}
                />

                <ShareHeaderModal
                  open={shareHeaderModalOpen}
                  onOpenChange={(open) => {
                    setShareHeaderModalOpen(open);
                    if (!open) setSharingHeader(null);
                  }}
                  header={sharingHeader as any}
                  onSuccess={async () => {
                    // After sharing, refresh cache to update counts
                    setShareHeaderModalOpen(false);
                    setSharingHeader(null);
                    await refreshCache();
                    // Reapply current filters
                    let filtered = allHeaders;
                    if (selectedRoleId) {
                      filtered = filtered.filter(
                        (h) => h.role_id === selectedRoleId
                      );
                    }
                    if (filterType) {
                      filtered = filtered.filter((h) =>
                        filterType === "shared"
                          ? h.is_shared
                          : (h.goal_template_type || "").toLowerCase() ===
                            filterType
                      );
                    }
                    setHeaders(filtered);
                    setTemplates(
                      filtered.flatMap((h) => h.goal_templates || [])
                    );
                  }}
                />

                <Dialog
                  open={deleteHeaderConfirmId !== null}
                  onOpenChange={() => setDeleteHeaderConfirmId(null)}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Template Header?</DialogTitle>
                      <DialogDescription>
                        This will permanently delete this header and ALL
                        templates within it. This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteHeaderConfirmId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() =>
                          deleteHeaderConfirmId &&
                          handleDeleteHeader(deleteHeaderConfirmId)
                        }
                      >
                        Delete
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Confirm Delete Dialog for individual templates inside headers */}
                <Dialog
                  open={confirmDeleteId !== null}
                  onOpenChange={(o) => {
                    if (!o) closeConfirmDelete();
                  }}
                >
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Delete template?</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. This will permanently
                        delete the goal template "
                        {
                          templates.find((x) => x.temp_id === confirmDeleteId)
                            ?.temp_title
                        }
                        ".
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button
                        variant={BUTTON_STYLES.CANCEL_SECONDARY.variant}
                        onClick={closeConfirmDelete}
                        className={`w-full sm:w-auto ${BUTTON_STYLES.CANCEL_SECONDARY.className}`}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={confirmDelete}
                        disabled={deletingId === confirmDeleteId}
                        variant={BUTTON_STYLES.DELETE.variant}
                        className={`w-full sm:w-auto ${BUTTON_STYLES.DELETE.className}`}
                      >
                        {deletingId === confirmDeleteId
                          ? "Deleting…"
                          : "Confirm delete"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              // All Roles: show regular flattened templates list
              <>
                {renderGlobalList()}
                {/* Confirm Delete Dialog for templates */}
                <Dialog
                  open={confirmDeleteId !== null}
                  onOpenChange={(o) => {
                    if (!o) closeConfirmDelete();
                  }}
                >
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Delete template?</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. This will permanently
                        delete the goal template "
                        {
                          templates.find((x) => x.temp_id === confirmDeleteId)
                            ?.temp_title
                        }
                        ".
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button
                        variant={BUTTON_STYLES.CANCEL_SECONDARY.variant}
                        onClick={closeConfirmDelete}
                        className={`w-full sm:w-auto ${BUTTON_STYLES.CANCEL_SECONDARY.className}`}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={confirmDelete}
                        disabled={deletingId === confirmDeleteId}
                        variant={BUTTON_STYLES.DELETE.variant}
                        className={`w-full sm:w-auto ${BUTTON_STYLES.DELETE.className}`}
                      >
                        {deletingId === confirmDeleteId
                          ? "Deleting…"
                          : "Confirm delete"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        )}
      </div>

      <CreateTemplateModal
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) {
            setCreateModalInitialHeaderId(null);
            setCreateModalInitialRoleId(null);
          }
        }}
        onSuccess={handleCreateSuccess}
        initialHeaderId={createModalInitialHeaderId}
        initialRoleId={createModalInitialRoleId}
      />

      <EditTemplateModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSuccess={handleEditSuccess}
        templateId={editingTemplateId}
        remainingWeight={editModalRemaining}
      />
    </div>
  );
};

export default GoalTemplates;
