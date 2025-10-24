import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import CreateTemplateModal from "../../components/modals/CreateTemplateModal";
import EditTemplateModal from "../../components/modals/EditTemplateModal";
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
  TrendingUp,
  Tag,
  Target,
  Flag,
  Weight,
  RefreshCw,
} from "lucide-react";
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
function isManagerOrAbove(
  roleId: number | undefined,
  roleName: string | undefined
): boolean {
  // Manager or above (role_id >= 3)
  if (roleId && roleId >= 3) return true;
  if (roleName && /manager|ceo|admin/i.test(roleName)) return true;
  return false;
}

const GoalTemplates = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [importanceFilter, setImportanceFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

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
      await loadTemplates();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setDeletingId(null);
      closeConfirmDelete();
    }
  };
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(
    null
  );

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/goals/templates");
      if (!res.ok) throw new Error(res.error || "Failed to load templates");
      setTemplates((res.data as GoalTemplate[]) || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    void loadTemplates();
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setEditingTemplateId(null);
    void loadTemplates();
  };

  const handleEditClick = (templateId: number) => {
    setEditingTemplateId(templateId);
    setShowEditModal(true);
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Get unique values for filters
  const allCategories = Array.from(
    new Set(templates.flatMap((t) => t.categories?.map((c) => c.name) || []))
  ).sort((a, b) => a.localeCompare(b));

  const allImportanceLevels = Array.from(
    new Set(templates.map((t) => t.temp_importance))
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return templates.filter((t) => {
      // Text search filter
      const matchesSearch =
        !q ||
        t.temp_title.toLowerCase().includes(q) ||
        t.temp_description.toLowerCase().includes(q) ||
        t.temp_performance_factor.toLowerCase().includes(q) ||
        t.categories?.some((c) => c.name.toLowerCase().includes(q));

      // Importance filter
      const matchesImportance =
        importanceFilter === "all" || t.temp_importance === importanceFilter;

      // Category filter
      const matchesCategory =
        categoryFilter === "all" ||
        t.categories?.some((c) => c.name === categoryFilter);

      return matchesSearch && matchesImportance && matchesCategory;
    });
  }, [templates, filter, importanceFilter, categoryFilter]);

  // Pagination (5 per page)
  const ITEMS_PER_PAGE = 5;
  const [page, setPage] = useState(1);

  const listTotalPages = Math.max(
    1,
    Math.ceil(visible.length / ITEMS_PER_PAGE)
  );

  const visiblePaged = useMemo(
    () => visible.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [visible, page]
  );

  // Reset to first page when filters or data change
  useEffect(() => {
    setPage(1);
  }, [visible.length, filter, importanceFilter, categoryFilter]);

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
              {loading ? "Loading…" : `${visible.length} template(s)`}
            </p>
          </div>
        </div>
        {isManagerOrAbove(user?.role_id, user?.role?.role_name) && (
          <Button
            onClick={() => setShowCreateModal(true)}
            variant={BUTTON_STYLES.CREATE.variant}
            className={`flex items-center gap-2 ${BUTTON_STYLES.CREATE.className}`}
            aria-label="Create Template"
            title="Create Template"
            data-testid="create-template"
          >
            <Plus className={ICON_SIZES.DEFAULT} />
            <span className="hidden sm:inline sm:ml-2">Create Template</span>
          </Button>
        )}
      </div>

      {/* Search & Filter - Direct layout without card */}
      <div className="w-full">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full md:flex-1 min-w-0">
            <Label className="mb-1 block text-sm font-medium">Search</Label>
            <Input
              id="filter"
              placeholder="Search by title, description, or performance factor..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="w-full sm:w-[200px]">
            <Label className="mb-1 block text-sm font-medium">Importance</Label>
            <Select
              value={importanceFilter}
              onValueChange={setImportanceFilter}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Importance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Importance</SelectItem>
                {allImportanceLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-[200px]">
            <Label className="mb-1 block text-sm font-medium">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {allCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
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
                setImportanceFilter("all");
                setCategoryFilter("all");
              }}
              className="ml-2 border border-border -mt-5"
              title="Reset filters"
              aria-label="Reset filters"
            >
              <RefreshCw className={ICON_SIZES.DEFAULT} />
            </Button>
            {/* Pagination next to refresh */}
            {visible.length > ITEMS_PER_PAGE && (
              <div className="hidden sm:flex items-center">
                <PaginationControls
                  currentPage={page}
                  totalPages={listTotalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        </div>
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
            {visible.length === 0 && (
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
            )}
            {visiblePaged.map((t: GoalTemplate) => (
              <Card
                key={t.temp_id}
                className="shadow-soft hover-lift border border-border bg-white/40 dark:bg-transparent glass-effect transition-transform transform hover:-translate-y-1 hover:shadow-xl rounded-xl relative overflow-hidden"
                data-testid="template-item"
              >
                <CardContent className="p-6">
                  {/* Title Section with Icon */}
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                        <Target className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mb-2">
                          <h3 className="text-xl font-bold text-foreground truncate mt-1 leading-normal">
                            {t.temp_title}
                          </h3>

                          {/* Importance & Weightage (separate section) */}
                          <div className="mt-2 flex items-center gap-2">
                            <Badge className="bg-rose-100 text-rose-700 border-rose-300 font-semibold text-sm flex items-center gap-1">
                              <Flag className="h-3 w-3" />
                              <span>{t.temp_importance}</span>
                            </Badge>
                            <Badge
                              variant="outline"
                              className="bg-purple-50 text-purple-700 border-purple-300 font-medium text-sm flex items-center gap-1"
                            >
                              <Weight className="h-3 w-3 text-purple-600" />
                              <span>{t.temp_weightage}%</span>
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons - positioned absolutely */}
                    {isManagerOrAbove(
                      user?.role_id,
                      user?.role?.role_name
                    ) && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size={BUTTON_STYLES.EDIT.size}
                          variant={BUTTON_STYLES.EDIT.variant}
                          onClick={() => handleEditClick(t.temp_id)}
                          className={`flex items-center gap-2 ${BUTTON_STYLES.EDIT.className}`}
                          aria-label="Edit template"
                          title="Edit template"
                        >
                          <Edit
                            className={ICON_SIZES.DEFAULT}
                            aria-hidden="true"
                          />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button
                          size={BUTTON_STYLES.DELETE.size}
                          variant={BUTTON_STYLES.DELETE.variant}
                          disabled={deletingId === t.temp_id}
                          onClick={() => openConfirmDelete(t.temp_id)}
                          className={`flex items-center gap-2 ${BUTTON_STYLES.DELETE.className}`}
                          aria-label={
                            deletingId === t.temp_id
                              ? "Deleting…"
                              : "Delete template"
                          }
                          title={
                            deletingId === t.temp_id
                              ? "Deleting…"
                              : "Delete template"
                          }
                        >
                          <Trash2
                            className={ICON_SIZES.DEFAULT}
                            aria-hidden="true"
                          />
                          <span className="hidden sm:inline">
                            {deletingId === t.temp_id ? "Deleting…" : "Delete"}
                          </span>
                        </Button>
                      </div>
                    )}
                  </div>
                  {/* Categories start from the left as a full-width row */}
                  {t.categories && t.categories.length > 0 && (
                    <div className="flex items-start gap-3 mt-2 mb-4 pt-0 pl-0">
                      <div className="p-2 bg-amber-50 rounded-lg shrink-0">
                        <Tag className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p
                          className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1"
                          title={`${
                            t.categories.length
                          } categories: ${t.categories
                            .map((x) => x.name)
                            .join(", ")}`}
                        >
                          Category
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {t.categories.map((c: Category) => (
                            <Badge
                              key={c.id}
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-300 font-medium"
                              title={c.name}
                            >
                              {c.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Description Section with Icon */}
                  {/* Performance Factor (moved above description) */}
                  <div className="flex items-start gap-3 mb-4 pl-0">
                    <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                      <TrendingUp className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">
                        Performance Factor
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {t.temp_performance_factor}
                      </p>
                    </div>
                  </div>

                  {/* Description Section with Icon */}
                  <div className="flex items-start gap-3 mb-4 pl-0">
                    <div className="p-2 bg-emerald-50 rounded-lg shrink-0">
                      <FileText className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">
                        Description
                      </p>
                      <p className="text-sm text-foreground leading-relaxed max-h-[4.5rem] overflow-y-auto pr-3 scrollbar-y break-words whitespace-normal overflow-x-hidden">
                        {t.temp_description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Confirm Delete Dialog (single instance) */}
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
                    This action cannot be undone. This will permanently delete
                    the goal template "
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
        )}
      </div>

      <CreateTemplateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreateSuccess}
      />

      <EditTemplateModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSuccess={handleEditSuccess}
        templateId={editingTemplateId}
      />
    </div>
  );
};

export default GoalTemplates;
