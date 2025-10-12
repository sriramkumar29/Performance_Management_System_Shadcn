import { useEffect, useState } from "react";
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
  Plus,
  Trash2,
  Edit,
  FileText,
  TrendingUp,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";

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

/**
 * Helper to check if user is a manager or above (Director or CEO).
 */
function isManagerOrAbove(
  roles: string | string[] | undefined,
  level: number | undefined
): boolean {
  if (!roles || level === undefined) return false;
  const arr = Array.isArray(roles) ? roles : [roles];
  return arr.includes("Manager") || (level !== undefined && level >= 3);
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

  const visible = templates.filter((t) => {
    // Text search filter
    const matchesSearch =
      !filter.trim() ||
      t.temp_title.toLowerCase().includes(filter.toLowerCase()) ||
      t.temp_description.toLowerCase().includes(filter.toLowerCase()) ||
      t.temp_performance_factor.toLowerCase().includes(filter.toLowerCase()) ||
      t.categories?.some((c) =>
        c.name.toLowerCase().includes(filter.toLowerCase())
      );

    // Importance filter
    const matchesImportance =
      importanceFilter === "all" || t.temp_importance === importanceFilter;

    // Category filter
    const matchesCategory =
      categoryFilter === "all" ||
      t.categories?.some((c) => c.name === categoryFilter);

    return matchesSearch && matchesImportance && matchesCategory;
  });

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
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Manage Goal Templates
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading ? "Loading…" : `${visible.length} template(s)`}
            </p>
          </div>
        </div>
        {isManagerOrAbove(user?.emp_roles, user?.emp_roles_level) && (
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
            {visible.map((t) => (
              <Card
                key={t.temp_id}
                className="shadow-soft hover-lift border-0 glass-effect transition-all relative"
                data-testid="template-item"
              >
                <CardContent className="p-6">
                  {/* Title Section with Icon */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">
                          Template Title
                        </p>
                        <h3 className="text-xl font-bold text-foreground mb-2">
                          {t.temp_title}
                        </h3>
                        {/* Categories */}
                        {t.categories && t.categories.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {t.categories.map((c) => (
                              <Badge
                                key={c.id}
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-300 font-medium"
                              >
                                {c.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons - positioned absolutely */}
                    {isManagerOrAbove(
                      user?.emp_roles,
                      user?.emp_roles_level
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
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size={BUTTON_STYLES.DELETE.size}
                              variant={BUTTON_STYLES.DELETE.variant}
                              disabled={deletingId === t.temp_id}
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
                                {deletingId === t.temp_id
                                  ? "Deleting…"
                                  : "Delete"}
                              </span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="shadow-large">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl">
                                Delete template?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-base">
                                This action cannot be undone. This will
                                permanently delete the goal template "
                                {t.temp_title}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel className="hover:shadow-soft transition-shadow">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async () => {
                                  try {
                                    setDeletingId(t.temp_id);
                                    const res = await apiFetch(
                                      `/api/goals/templates/${t.temp_id}`,
                                      { method: "DELETE" }
                                    );
                                    if (!res.ok)
                                      throw new Error(
                                        res.error || "Failed to delete template"
                                      );
                                    toast.success("Template deleted");
                                    await loadTemplates();
                                  } catch (e: any) {
                                    toast.error(e?.message || "Delete failed");
                                  } finally {
                                    setDeletingId(null);
                                  }
                                }}
                                className="hover:shadow-glow transition-shadow"
                              >
                                Confirm delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>

                  {/* Description Section with Icon */}
                  <div className="flex items-start gap-3 mb-4 pl-0">
                    <div className="p-2 bg-emerald-50 rounded-lg shrink-0">
                      <FileText className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide mb-1">
                        Description
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t.temp_description}
                      </p>
                    </div>
                  </div>

                  {/* Importance and Performance Factor - Side by Side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border-t pt-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-rose-50 rounded-lg shrink-0">
                        <TrendingUp className="h-5 w-5 text-rose-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-rose-600 font-semibold uppercase tracking-wide mb-1">
                          Importance
                        </p>
                        <Badge className="bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-100 font-semibold text-sm">
                          {t.temp_importance}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                        <TrendingUp className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wide mb-1">
                          Performance Factor
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {t.temp_performance_factor}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
