import { useEffect, useState } from "react";
import { apiFetch } from "../../utils/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import {
  X,
  Download,
  Weight,
  Flag,
  Tag,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { Checkbox } from "../../components/ui/checkbox";
import { toast } from "sonner";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import type {
  GoalTemplateHeaderWithTemplates,
  HeaderSelection,
} from "../../types/goalTemplateHeader";
import type { ApplicationRole } from "../../types/applicationRole";
import { getAllHeaders } from "../../api/goalTemplateHeaders";
import { getAllApplicationRoles } from "../../api/applicationRoles";

interface ImportFromTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onGoalAdded: (goal: AppraisalGoal) => void;
  onGoalsAdded?: (goals: AppraisalGoal[]) => void;
  appraisalId?: number;
  remainingWeightage?: number;
  defaultApplicationRoleId?: number;
}

interface Category {
  id: number;
  name: string;
}

interface AppraisalGoal {
  id: number;
  appraisal_id: number;
  goal_id: number;
  goal: {
    goal_id: number;
    goal_template_id?: number;
    goal_title: string;
    goal_description: string;
    goal_performance_factor: string;
    goal_importance: string;
    goal_weightage: number;
    category_id: number;
    category: Category;
  };
}

const ImportFromTemplateModal = ({
  open,
  onClose,
  onGoalAdded,
  onGoalsAdded,
  appraisalId: _appraisalId,
  remainingWeightage = 100,
  defaultApplicationRoleId,
}: ImportFromTemplateModalProps) => {
  const [loading, setLoading] = useState(false);
  const [applicationRoles, setApplicationRoles] = useState<ApplicationRole[]>(
    []
  );
  const [selectedAppRoleId, setSelectedAppRoleId] = useState<number | null>(
    null
  );
  const [headers, setHeaders] = useState<GoalTemplateHeaderWithTemplates[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<
    Record<number, HeaderSelection>
  >({});
  const [filter, setFilter] = useState("");
  const [goalTypeFilter, setGoalTypeFilter] = useState<string>("All");
  const [expandedHeaders, setExpandedHeaders] = useState<
    Record<number, boolean>
  >({});

  useEffect(() => {
    if (open) {
      setSelectedHeaders({});
      setExpandedHeaders({});
      void loadApplicationRoles();

      // Auto-select default application role if provided
      if (defaultApplicationRoleId) {
        setSelectedAppRoleId(defaultApplicationRoleId);
      }
    } else {
      setSelectedHeaders({});
      setExpandedHeaders({});
      setFilter("");
      setGoalTypeFilter("All");
    }
  }, [open, defaultApplicationRoleId]);

  useEffect(() => {
    if (selectedAppRoleId) {
      void loadHeadersForApplicationRole(selectedAppRoleId);
    } else {
      setHeaders([]);
    }
  }, [selectedAppRoleId]);

  const loadApplicationRoles = async () => {
    try {
      const res = await getAllApplicationRoles();
      if (res.ok && res.data) {
        setApplicationRoles(res.data);
      }
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to load application roles";
      console.error("Failed to load application roles:", errorMessage);
    }
  };

  const loadHeadersForApplicationRole = async (appRoleId: number) => {
    setLoading(true);
    try {
      // Load all three types: organization, self, and shared
      // Pass application_role_id parameter to backend for filtering
      const [orgResult, selfResult, sharedResult] = await Promise.all([
        getAllHeaders(0, 100, "organization", undefined, appRoleId),
        getAllHeaders(0, 100, "self", undefined, appRoleId),
        getAllHeaders(0, 100, "shared", undefined, appRoleId),
      ]);

      const combinedHeaders: GoalTemplateHeaderWithTemplates[] = [];

      // Collect organization headers for this application role
      if (orgResult.ok && orgResult.data) {
        console.log(
          `Organization: ${orgResult.data.length} total for application role ${appRoleId}`
        );
        combinedHeaders.push(...orgResult.data);
      }

      // Collect self headers for this application role
      if (selfResult.ok && selfResult.data) {
        console.log(
          `Self: ${selfResult.data.length} total for application role ${appRoleId}`
        );
        combinedHeaders.push(...selfResult.data);
      }

      // Collect shared headers - backend already filters by application_role_id
      if (sharedResult.ok && sharedResult.data) {
        const sharedForRole = sharedResult.data.map((h) => ({
          ...h,
          _isSharedWithMe: true, // Internal flag to identify shared headers
        }));
        console.log(
          `Shared: ${sharedResult.data.length} total, ${sharedForRole.length} for application role ${appRoleId}`
        );
        combinedHeaders.push(...(sharedForRole as any));
      }

      // Remove duplicates by header_id (shouldn't happen, but just in case)
      const uniqueHeaders = Array.from(
        new Map(combinedHeaders.map((h) => [h.header_id, h])).values()
      );

      console.log(
        `Total combined headers for application role ${appRoleId}: ${uniqueHeaders.length}`
      );
      console.log(
        "Headers:",
        uniqueHeaders.map((h) => ({
          id: h.header_id,
          title: h.title,
          type: h.goal_template_type,
          application_role_id: h.application_role_id,
          isShared: (h as any)._isSharedWithMe,
        }))
      );

      setHeaders(uniqueHeaders);

      if (!orgResult.ok || !selfResult.ok || !sharedResult.ok) {
        const errors = [orgResult, selfResult, sharedResult]
          .filter((r) => !r.ok)
          .map((r) => r.error)
          .join(", ");
        if (errors) {
          toast.error("Some templates failed to load", {
            description: errors,
          });
        }
      }
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to load templates";
      console.error("Failed to load templates:", errorMessage);
      toast.error("Failed to load templates", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const closeAndReset = () => {
    setSelectedHeaders({});
    setExpandedHeaders({});
    setSelectedAppRoleId(null);
    setFilter("");
    onClose();
  };

  const toggleHeaderSelection = (headerId: number) => {
    setSelectedHeaders((prev) => {
      const curr = prev[headerId];
      if (curr?.checked) {
        // Uncheck
        const updated = { ...prev };
        delete updated[headerId];
        return updated;
      } else {
        // Check (no adjustable weightage - use template weights)
        return {
          ...prev,
          [headerId]: {
            header_id: headerId,
            checked: true,
          },
        };
      }
    });
  };

  // Note: Removed adjustable header weightage. Templates will keep their own weight.

  const toggleHeaderExpanded = (headerId: number) => {
    setExpandedHeaders((prev) => ({
      ...prev,
      [headerId]: !prev[headerId],
    }));
  };

  const handleImport = () => {
    const selectedHeaderIds = Object.keys(selectedHeaders)
      .map(Number)
      .filter((id) => selectedHeaders[id].checked);

    if (selectedHeaderIds.length === 0) {
      toast.error("No templates selected", {
        description: "Select at least one template header to import.",
      });
      return;
    }

    // totalSelectedWeightage is computed outside for UI display; no per-import validation required.

    // Allow importing even if totalSelectedWeightage exceeds remainingWeightage.
    // Business rule: user explicitly asked to permit imports > 100% (do not block).

    // Create goals using each template's own weightage
    const allGoals: AppraisalGoal[] = [];

    selectedHeaderIds.forEach((headerId) => {
      const header = headers.find((h) => h.header_id === headerId);
      if (!header || !header.goal_templates.length) return;

      // Use template.temp_weightage directly
      header.goal_templates.forEach((template) => {
        const adjustedWeightage = template.temp_weightage;

        // Build pseudo AppraisalGoal
        const tempId = Date.now() + Math.floor(Math.random() * 10000);
        const categoryIds = template.categories?.map((c) => c.id) ?? [];
        const firstCategory = template.categories?.[0];

        if (!categoryIds.length || !firstCategory) {
          console.warn(
            `Template "${template.temp_title}" has no category, skipping`
          );
          return;
        }

        const pseudo: AppraisalGoal = {
          id: tempId,
          appraisal_id: 0,
          goal_id: tempId,
          goal: {
            goal_id: tempId,
            goal_template_id: template.temp_id,
            goal_title: template.temp_title,
            goal_description: template.temp_description,
            goal_performance_factor: template.temp_performance_factor,
            goal_importance: template.temp_importance,
            goal_weightage: adjustedWeightage,
            category_id: firstCategory.id,
            category: { id: firstCategory.id, name: firstCategory.name },
          },
        };

        // Attach multi-category support
        (pseudo as any).goal.category_ids = categoryIds;
        (pseudo as any).goal.categories =
          template.categories?.map((c) => ({
            id: c.id,
            name: c.name,
          })) || [];

        allGoals.push(pseudo);
      });
    });

    if (allGoals.length === 0) {
      toast.error("No goals to import", {
        description: "Selected headers have no templates",
      });
      return;
    }

    // Use batch import if available
    if (onGoalsAdded) {
      onGoalsAdded(allGoals);
    } else {
      for (const goal of allGoals) onGoalAdded(goal);
    }

    toast.success("Imported successfully", {
      description: `Imported ${allGoals.length} goal${
        allGoals.length > 1 ? "s" : ""
      } from ${selectedHeaderIds.length} template${
        selectedHeaderIds.length > 1 ? "s" : ""
      }`,
    });
    closeAndReset();
  };

  const visibleHeaders = headers.filter((h) => {
    // Text filter
    const matchesText =
      !filter.trim() ||
      h.title.toLowerCase().includes(filter.toLowerCase()) ||
      h.description?.toLowerCase().includes(filter.toLowerCase()) ||
      h.goal_templates.some((t) =>
        t.temp_title.toLowerCase().includes(filter.toLowerCase())
      );

    if (!matchesText) return false;

    // Goal type filter: All | Organization | Self | Shared
    if (goalTypeFilter === "All") return true;

    // Check if this header was loaded from the "shared" endpoint
    const isSharedWithMe = (h as any)._isSharedWithMe === true;

    // Priority order for classification:
    // 1. If _isSharedWithMe flag is true, it's a "Shared" template
    // 2. Else, use goal_template_type to determine if it's "Self" or "Organization"

    if (goalTypeFilter === "Shared") {
      // Only show headers that were loaded from shared endpoint
      return isSharedWithMe;
    }

    if (goalTypeFilter === "Self") {
      // Self headers: NOT from shared endpoint AND goal_template_type is Self
      return (
        !isSharedWithMe &&
        String(h.goal_template_type || "").toLowerCase() === "self"
      );
    }

    if (goalTypeFilter === "Organization") {
      // Organization headers: NOT from shared endpoint AND goal_template_type is Organization
      return (
        !isSharedWithMe &&
        String(h.goal_template_type || "").toLowerCase() === "organization"
      );
    }

    return false;
  });

  const totalSelectedWeightage = Object.keys(selectedHeaders)
    .map(Number)
    .filter((id) => selectedHeaders[id].checked)
    .reduce((sum, id) => {
      const header = headers.find((h) => h.header_id === id);
      if (!header) return sum;
      return (
        sum +
        header.goal_templates.reduce((s, t) => s + (t.temp_weightage || 0), 0)
      );
    }, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) closeAndReset();
      }}
    >
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-blue-600 flex-shrink-0">
              <Download className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground">
                Import Goals from Template
              </DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Select template headers to import all goals as a set with
                proportional weightage
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {/* Search, Role Filter & Goal Type Filter (search moved first) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label
                htmlFor="search"
                className="text-xs sm:text-sm font-medium"
              >
                Search Templates
              </Label>
              <Input
                id="search"
                placeholder="Filter by title or description..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-10"
                disabled={!selectedAppRoleId}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="role-filter"
                className="text-xs sm:text-sm font-medium flex items-center gap-1 h-4"
              >
                <Filter className="h-3 w-3" />
                Filter by Application Role
              </Label>
              <Select
                value={selectedAppRoleId?.toString() || ""}
                onValueChange={(val) =>
                  setSelectedAppRoleId(val ? Number(val) : null)
                }
              >
                <SelectTrigger id="role-filter" className="h-10">
                  <SelectValue placeholder="Select an application role..." />
                </SelectTrigger>
                <SelectContent>
                  {applicationRoles.map((appRole) => (
                    <SelectItem
                      key={appRole.app_role_id}
                      value={appRole.app_role_id.toString()}
                    >
                      {appRole.app_role_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="goal-type-filter"
                className="text-xs sm:text-sm font-medium"
              >
                Goal Type
              </Label>
              <Select
                value={goalTypeFilter}
                onValueChange={(val) => setGoalTypeFilter(val || "All")}
              >
                <SelectTrigger id="goal-type-filter" className="h-10">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Templates</SelectItem>
                  <SelectItem value="Organization">Organization Templates</SelectItem>
                  <SelectItem value="Self">Self Templates</SelectItem>
                  <SelectItem value="Shared">Shared Templates</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Weightage Summary: only show when user has selected at least one header */}
          {totalSelectedWeightage > 0 ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2">
                <Weight className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Selected</span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-lg font-bold ${
                    totalSelectedWeightage > remainingWeightage
                      ? "text-red-600"
                      : "text-primary"
                  }`}
                >
                  {totalSelectedWeightage}%
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
              Select one or more template headers to see remaining weightage
            </div>
          )}

          {/* Headers List */}
          <div className="space-y-3">
            {!selectedAppRoleId ? (
              <div className="p-8 text-center border border-dashed border-border/50 rounded-lg">
                <Filter className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Please select an application role to view template headers
                </p>
              </div>
            ) : loading ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Loading templates...
                </p>
              </div>
            ) : visibleHeaders.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {filter
                    ? "No templates match your search"
                    : "No template headers found for this application role"}
                </p>
              </div>
            ) : (
              visibleHeaders.map((header) => {
                const isSelected =
                  selectedHeaders[header.header_id]?.checked || false;
                const isExpanded = expandedHeaders[header.header_id] || false;

                return (
                  <Collapsible
                    key={header.header_id}
                    open={isExpanded}
                    onOpenChange={() => toggleHeaderExpanded(header.header_id)}
                  >
                    <div
                      className={`rounded-lg border ${
                        isSelected
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/50 bg-card/50"
                      } transition-all cursor-pointer hover:border-primary/30`}
                      onClick={() => toggleHeaderSelection(header.header_id)}
                    >
                      {/* Header Card */}
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() =>
                              toggleHeaderSelection(header.header_id)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 flex-shrink-0"
                          />

                          <div className="flex-1 min-w-0 space-y-3">
                            {/* Header Info */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-base text-foreground">
                                  {header.title}
                                </h3>
                                {header.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {header.description}
                                  </p>
                                )}
                              </div>

                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex-shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </div>

                            {/* Header Metadata */}
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Badge classification:
                                  1. If _isSharedWithMe flag is true: show "Shared" badge (shared with user)
                                  2. Else if goal_template_type is "Self": show "Self" badge (user created)
                                  3. Else: show "Organization" badge (organization template) */}
                              {(header as any)._isSharedWithMe ? (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                                >
                                  Shared
                                </Badge>
                              ) : String(
                                  header.goal_template_type || ""
                                ).toLowerCase() === "self" ? (
                                <Badge
                                  variant="outline"
                                  className="text-xs whitespace-nowrap bg-emerald-50 text-emerald-700 border-emerald-200"
                                >
                                  Self
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-xs whitespace-nowrap bg-sky-50 text-sky-700 border-sky-200"
                                >
                                  Organization
                                </Badge>
                              )}

                              <Badge variant="secondary" className="text-xs">
                                {header.goal_templates.length} template
                                {header.goal_templates.length !== 1 ? "s" : ""}
                              </Badge>

                              <Badge
                                variant="outline"
                                className="bg-purple-50 text-purple-700 border-purple-200 text-xs"
                              >
                                <Weight className="h-3 w-3 mr-1" />
                                Weightage:{" "}
                                {header.goal_templates.reduce(
                                  (s, t) => s + (t.temp_weightage || 0),
                                  0
                                )}
                                %
                              </Badge>
                            </div>

                            {/* Weight adjustment removed - templates keep their own weights */}
                          </div>
                        </div>
                      </div>

                      {/* Templates Preview (Collapsible) */}
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-2 border-t border-border/50 pt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Templates in this header:
                          </p>
                          {header.goal_templates.map((template) => {
                            const adjustedWeightage = template.temp_weightage;

                            return (
                              <div
                                key={template.temp_id}
                                className="p-3 rounded-md bg-card border border-border/30"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm text-foreground">
                                      {template.temp_title}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {template.temp_description}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
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

                                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                                    <Badge
                                      variant="secondary"
                                      className="bg-rose-100 text-rose-700 border-rose-300 text-xs"
                                    >
                                      <Flag className="h-3 w-3 mr-1" />
                                      {template.temp_importance}
                                    </Badge>
                                    <Badge
                                      variant="default"
                                      className="bg-purple-50 text-purple-700 border-purple-200 text-xs"
                                    >
                                      <Weight className="h-3 w-3 mr-1" />
                                      {isSelected &&
                                      adjustedWeightage !==
                                        template.temp_weightage ? (
                                        <>
                                          <span className="line-through opacity-50 mr-1">
                                            {template.temp_weightage}%
                                          </span>
                                          {adjustedWeightage}%
                                        </>
                                      ) : (
                                        `${template.temp_weightage}%`
                                      )}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-border/50 bg-card/30">
          <Button
            variant={BUTTON_STYLES.CANCEL.variant}
            onClick={closeAndReset}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <X className={`${ICON_SIZES.DEFAULT} sm:mr-2`} />
            <span>Cancel</span>
          </Button>
          <Button
            variant={BUTTON_STYLES.SUBMIT.variant}
            onClick={handleImport}
            disabled={
              loading ||
              Object.keys(selectedHeaders).filter(
                (id) => selectedHeaders[Number(id)].checked
              ).length === 0
            }
            className={`w-full sm:w-auto ${BUTTON_STYLES.SUBMIT.className}`}
          >
            <Download className={`${ICON_SIZES.DEFAULT} sm:mr-2`} />
            <span>Import Selected</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportFromTemplateModal;
