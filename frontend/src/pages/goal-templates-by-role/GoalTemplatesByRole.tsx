import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Target,
  Flag,
  Weight,
  Tag,
  FileText,
  RefreshCw,
} from "lucide-react";
import { isManagerOrAbove } from "../../utils/roleHelpers";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";
// ...existing code... (select UI removed; role filter uses button group now)
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
import { apiFetch } from "../../utils/api";
import type {
  GoalTemplateHeaderWithTemplates,
  GoalTemplateHeader,
  Role,
} from "../../types/goalTemplateHeader";
import {
  getHeadersByRole,
  getAllHeaders,
  deleteTemplateHeader,
} from "../../api/goalTemplateHeaders";
import CreateHeaderModal from "../../components/modals/CreateHeaderModal";
import EditHeaderModal from "../../components/modals/EditHeaderModal";

const GoalTemplatesByRole = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [headers, setHeaders] = useState<GoalTemplateHeaderWithTemplates[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedHeaderId, setSelectedHeaderId] = useState<number | null>(null);
  const [expandedHeaders, setExpandedHeaders] = useState<Set<number>>(
    new Set()
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingHeader, setEditingHeader] = useState<GoalTemplateHeader | null>(
    null
  );

  // Load roles on mount
  useEffect(() => {
    loadRoles();
  }, []);

  // Load headers when role changes
  useEffect(() => {
    if (selectedRoleId) {
      // clear header selection when role changes
      setSelectedHeaderId(null);
      loadHeadersForRole(selectedRoleId);
    } else {
      loadAllHeaders();
    }
  }, [selectedRoleId]);

  const loadRoles = async () => {
    try {
      const result = await apiFetch<Role[]>("/api/roles/");
      if (result.ok && result.data) {
        setRoles(result.data);
      }
    } catch (error) {
      console.error("Failed to load roles:", error);
      toast.error("Failed to load roles");
    }
  };

  const loadHeadersForRole = async (roleId: number) => {
    setLoading(true);
    try {
      const result = await getHeadersByRole(roleId);
      if (result.ok && result.data) {
        setHeaders(result.data);
      } else {
        toast.error("Failed to load headers");
      }
    } catch (error) {
      console.error("Failed to load headers:", error);
      toast.error("Failed to load headers");
    } finally {
      setLoading(false);
    }
  };

  const loadAllHeaders = async () => {
    setLoading(true);
    try {
      const result = await getAllHeaders();
      if (result.ok && result.data) {
        setHeaders(result.data);
      } else {
        toast.error("Failed to load headers");
      }
    } catch (error) {
      console.error("Failed to load headers:", error);
      toast.error("Failed to load headers");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHeader = async (headerId: number) => {
    // Close dialog immediately before async operation
    setDeleteConfirmId(null);

    try {
      const result = await deleteTemplateHeader(headerId);
      if (result.ok) {
        toast.success("Header deleted successfully");
        // Reload headers
        if (selectedRoleId) {
          loadHeadersForRole(selectedRoleId);
        } else {
          loadAllHeaders();
        }
      } else {
        toast.error(result.error || "Failed to delete header");
      }
    } catch (error) {
      console.error("Failed to delete header:", error);
      toast.error("Failed to delete header");
    }
  };

  const toggleHeaderExpanded = (headerId: number) => {
    setExpandedHeaders((prev) => {
      const next = new Set(prev);
      if (next.has(headerId)) {
        next.delete(headerId);
      } else {
        next.add(headerId);
      }
      return next;
    });
  };

  const getRoleName = (roleId: number) => {
    return roles.find((r) => r.id === roleId)?.role_name || "Unknown";
  };

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

  if (!isManagerOrAbove(user?.role?.id, user?.role?.role_name || "")) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="p-6">
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none bg-background sticky top-0 z-40 border-b border-border/50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate(-1)}
                variant={BUTTON_STYLES.BACK.variant}
                size={BUTTON_STYLES.BACK.size}
                className={BUTTON_STYLES.BACK.className}
                title="Go back"
                aria-label="Go back"
              >
                <ArrowLeft className={ICON_SIZES.DEFAULT} />
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Goal Templates by Role
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage goal template collections for different roles
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  if (selectedRoleId) {
                    loadHeadersForRole(selectedRoleId);
                  } else {
                    loadAllHeaders();
                  }
                }}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw
                  className={`${ICON_SIZES.DEFAULT} ${
                    loading ? "animate-spin" : ""
                  }`}
                />
              </Button>
              <Button
                onClick={() => setCreateModalOpen(true)}
                variant={BUTTON_STYLES.CREATE.variant}
                className={BUTTON_STYLES.CREATE.className}
              >
                <Plus className={ICON_SIZES.DEFAULT} />
                <span className="hidden sm:inline ml-2">Create Header</span>
              </Button>
            </div>
          </div>

          {/* Role Filter */}
          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm font-medium">Filter by Role:</label>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={selectedRoleId === null ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedRoleId(null)}
              >
                All Roles
              </Button>
              {roles.map((role) => (
                <Button
                  key={role.id}
                  variant={selectedRoleId === role.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  {role.role_name}
                </Button>
              ))}
            </div>
          </div>

          {/* Header quick-list for selected role */}
          {selectedRoleId && headers.length > 0 && (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {headers.map((h) => (
                <Card
                  key={h.header_id}
                  className={`p-3 min-w-[220px] cursor-pointer ${
                    selectedHeaderId === h.header_id
                      ? "ring-2 ring-blue-400"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedHeaderId(h.header_id);
                    // expand selected header in the main list
                    setExpandedHeaders(
                      (prev) => new Set([...Array.from(prev), h.header_id])
                    );
                  }}
                >
                  <div className="text-sm font-semibold">{h.title}</div>
                  {h.description && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {h.description}
                    </div>
                  )}
                </Card>
              ))}
              {selectedHeaderId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedHeaderId(null)}
                >
                  Clear Header
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && headers.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : headers.length === 0 ? (
          <Card className="p-8 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No headers found</h3>
            <p className="text-muted-foreground mb-4">
              {selectedRoleId
                ? "No template headers exist for this role yet."
                : "No template headers exist yet."}
            </p>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className={ICON_SIZES.DEFAULT} />
              Create First Header
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {(selectedHeaderId
              ? headers.filter((h) => h.header_id === selectedHeaderId)
              : headers
            ).map((header) => (
              <Card key={header.header_id} className="overflow-hidden">
                <Collapsible
                  open={expandedHeaders.has(header.header_id)}
                  onOpenChange={() => toggleHeaderExpanded(header.header_id)}
                >
                  <CollapsibleTrigger className="w-full">
                    <CardContent className="p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">
                              {header.title}
                            </h3>
                            <Badge variant="outline" className="flex-shrink-0">
                              {getRoleName(header.role_id)}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="flex-shrink-0 bg-purple-50 text-purple-700 border-purple-200"
                            >
                              {header.goal_templates.length} templates
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="flex-shrink-0 bg-blue-50 text-blue-700 border-blue-200"
                            >
                              <Weight className="h-3 w-3 mr-1" />
                              {header.total_default_weightage}% total
                            </Badge>
                          </div>
                          {header.description && (
                            <p className="text-sm text-muted-foreground">
                              {header.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingHeader(header);
                              setEditModalOpen(true);
                            }}
                          >
                            <Edit className={ICON_SIZES.DEFAULT} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(header.header_id);
                            }}
                          >
                            <Trash2 className={ICON_SIZES.DEFAULT} />
                          </Button>
                          {expandedHeaders.has(header.header_id) ? (
                            <ChevronUp className={ICON_SIZES.DEFAULT} />
                          ) : (
                            <ChevronDown className={ICON_SIZES.DEFAULT} />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-3 border-t pt-3">
                      {header.goal_templates.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No templates in this header yet.
                        </p>
                      ) : (
                        header.goal_templates.map((template) => (
                          <Card
                            key={template.temp_id}
                            className="p-4 bg-accent/20"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Target className="h-4 w-4 text-primary flex-shrink-0" />
                                  <h4 className="font-semibold">
                                    {template.temp_title}
                                  </h4>
                                  <Badge
                                    variant="secondary"
                                    className={`flex-shrink-0 ${getImportanceBadgeColor(
                                      template.temp_importance
                                    )}`}
                                  >
                                    <Flag className="h-3 w-3 mr-1" />
                                    {template.temp_importance}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className="flex-shrink-0 bg-purple-50 text-purple-700 border-purple-200"
                                  >
                                    <Weight className="h-3 w-3 mr-1" />
                                    {template.temp_weightage}%
                                  </Badge>
                                </div>

                                <p className="text-sm text-muted-foreground mb-2">
                                  {template.temp_description}
                                </p>

                                <div className="flex items-start gap-2 mb-2">
                                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium">
                                      Performance Factors:
                                    </span>{" "}
                                    {template.temp_performance_factor}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  {template.categories?.map((cat) => (
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    navigate("/goal-templates");
                                  }}
                                  title="Edit in Goal Templates page"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          navigate("/goal-templates");
                        }}
                      >
                        <Plus className={ICON_SIZES.DEFAULT} />
                        Manage Templates
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Header Modal */}
      <CreateHeaderModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          if (selectedRoleId) {
            loadHeadersForRole(selectedRoleId);
          } else {
            loadAllHeaders();
          }
        }}
        rolesFromParent={roles}
      />

      {/* Edit Header Modal */}
      <EditHeaderModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingHeader(null);
        }}
        onSuccess={() => {
          if (selectedRoleId) {
            loadHeadersForRole(selectedRoleId);
          } else {
            loadAllHeaders();
          }
        }}
        header={editingHeader}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template Header?</DialogTitle>
            <DialogDescription>
              This will permanently delete this header and ALL templates within
              it. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirmId && handleDeleteHeader(deleteConfirmId)
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoalTemplatesByRole;
