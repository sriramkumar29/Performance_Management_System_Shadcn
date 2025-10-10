import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import CreateTemplateModal from "../../components/modals/CreateTemplateModal";
import EditTemplateModal from "../../components/modals/EditTemplateModal";
import { Card, CardContent } from "../../components/ui/card";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Plus, Search, Trash2, Edit } from "lucide-react";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";
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

  const visible = templates.filter(
    (t) =>
      !filter.trim() ||
      t.temp_title.toLowerCase().includes(filter.toLowerCase()) ||
      t.categories?.some((c) =>
        c.name.toLowerCase().includes(filter.toLowerCase())
      )
  );

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant={BUTTON_STYLES.BACK.variant}
            size={BUTTON_STYLES.BACK.size}
            onClick={() => navigate("/")}
            className={`flex items-center gap-2 ${BUTTON_STYLES.BACK.className}`}
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className={ICON_SIZES.DEFAULT} />
            <span className="hidden sm:inline sm:ml-2">Back</span>
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Manage Goal Templates
          </h1>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      <Card className="mb-6 glass-card shadow-soft">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
            <span className="flex items-center gap-2 text-lg font-semibold">
              <Search className="h-5 w-5" />
              Search Templates
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {loading ? "Loading…" : `${visible.length} template(s) found`}
            </span>
          </div>

          <div>
            <Input
              id="filter"
              placeholder="Search by title or category..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full max-w-md transition-shadow focus:shadow-sm motion-reduce:transition-none"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="shadow-soft">
                <CardContent className="p-6">
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
              <div className="text-center py-12">
                <div className="text-muted-foreground text-lg mb-2">
                  No templates found
                </div>
                <div className="text-sm text-muted-foreground">
                  {filter.trim()
                    ? "Try adjusting your search criteria"
                    : "Create your first goal template to get started"}
                </div>
              </div>
            )}
            {visible.map((t) => (
              <Card
                key={t.temp_id}
                className="hover-lift shadow-soft transition-all"
                data-testid="template-item"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-lg truncate">
                          {t.temp_title}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="text-xs font-semibold shadow-soft"
                        >
                          {t.temp_weightage}% Weight
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                        {t.temp_description}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {t.categories?.map((c) => (
                          <Badge
                            key={c.id}
                            variant="outline"
                            className="text-xs bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700 border-slate-200 hover:scale-105 transition-transform"
                          >
                            {c.name}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>
                          Importance:{" "}
                          <strong className="text-foreground">
                            {t.temp_importance}
                          </strong>
                        </span>
                        <span>
                          Performance Factor:{" "}
                          <strong className="text-foreground">
                            {t.temp_performance_factor}
                          </strong>
                        </span>
                      </div>
                    </div>
                    {isManagerOrAbove(
                      user?.emp_roles,
                      user?.emp_roles_level
                    ) && (
                      <div className="flex gap-2 mt-3 sm:mt-0 self-start sm:self-auto">
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
                          <span className="hidden sm:inline sm:ml-2">Edit</span>
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
                              <span className="hidden sm:inline sm:ml-2">
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
