import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Plus,
  FileText,
  TrendingUp,
  Tag,
  Target,
  Flag,
  Weight,
  Edit,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { isManagerOrAbove, isLeadOrAbove } from "../../utils/roleHelpers";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Card, CardContent } from "../../components/ui/card";
import { apiFetch } from "../../utils/api";
import { toast } from "sonner";
import {
  createTemplateHeader,
  getHeaderById,
} from "../../api/goalTemplateHeaders";
import { createTemplateForHeader } from "../../api/goalTemplateHeaders";
import CreateTemplateModal from "../../components/modals/CreateTemplateModal";
import EditTemplateModal from "../../components/modals/EditTemplateModal";
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";

const CreateHeaderWithTemplates = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [roles, setRoles] = useState<{ id: number; role_name: string }[]>([]);
  const [createdHeaderId, setCreatedHeaderId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<
    {
      emp_id: number;
      emp_name?: string;
      first_name?: string;
      last_name?: string;
    }[]
  >([]);
  const [goalTemplateType, setGoalTemplateType] = useState<
    "Organization" | "Self"
  >("Organization");
  const [sharedUsers, setSharedUsers] = useState<number[]>([]);

  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdTemplates, setCreatedTemplates] = useState<any[]>([]);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(
    null
  );
  const [localEditingTemplate, setLocalEditingTemplate] = useState<any | null>(
    null
  );
  const [modalRemaining, setModalRemaining] = useState<number | undefined>(
    undefined
  );

  // Load roles (header is tied to role_id in backend)
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/api/roles/");
        if (res.ok && Array.isArray(res.data)) {
          // Exclude CEO and Admin from role selection
          const filteredRoles = (
            res.data as { id: number; role_name: string }[]
          ).filter((role) => {
            const roleName = role.role_name.toLowerCase();
            return roleName !== "ceo" && roleName !== "admin";
          });
          setRoles(filteredRoles);
        } else {
          setRoles([]);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    // load employees for sharing when the create page mounts
    const loadEmployees = async () => {
      try {
        const r = await apiFetch<
          {
            emp_id: number;
            first_name: string;
            last_name: string;
          }[]
        >("/api/employees/");
        if (r.ok && Array.isArray(r.data)) {
          const filtered = r.data.filter((e) => {
            if (user && e.emp_id === user.emp_id) return false;
            const roleObj = (e as any).role || (e as any).role_info || null;
            const roleId =
              roleObj?.id ?? roleObj?.role_id ?? (e as any).role_id;
            const roleName = roleObj?.role_name ?? (e as any).role_name ?? "";
            if (roleId) return isLeadOrAbove(Number(roleId), roleName);
            return isLeadOrAbove(undefined, roleName);
          });
          setEmployees(filtered as any[]);
        } else if (!r.ok) console.warn("Failed to load employees:", r.error);
      } catch (err) {
        console.error("Failed to load employees for sharing", err);
      }
    };

    loadEmployees();
    // Radix Select will handle portal open/close behavior; no manual click handler
    return;
  }, []);

  // When the template modal closes, refresh the header to show created templates
  useEffect(() => {
    if (!showCreateTemplateModal && createdHeaderId) {
      (async () => {
        try {
          const res = await getHeaderById(createdHeaderId);
          if (res.ok && res.data) {
            // API returns header with its templates in `goal_templates` or similar
            setCreatedTemplates(res.data.goal_templates || []);
          }
        } catch (err) {
          console.error("Failed to fetch header templates:", err);
        }
      })();
    }
  }, [showCreateTemplateModal, createdHeaderId]);

  const ensureHeaderCreated = async () => {
    if (createdHeaderId) return createdHeaderId;
    if (!title.trim()) {
      toast.error("Header title is required");
      return null;
    }
    if (!selectedRoleId) {
      toast.error("Please select a role");
      return null;
    }

    setSaving(true);
    try {
      const payload: any = {
        role_id: Number(selectedRoleId),
        title: title.trim(),
        description: description.trim() || undefined,
        goal_template_type: goalTemplateType,
      };

      if (goalTemplateType === "Self") {
        if (sharedUsers && sharedUsers.length > 0) {
          payload.shared_users_id = sharedUsers;
          payload.is_shared = true;
        } else {
          payload.is_shared = false;
          payload.shared_users_id = null;
        }
      } else {
        payload.is_shared = false;
        payload.shared_users_id = null;
      }

      const res = await createTemplateHeader(payload);
      if (!res.ok || !res.data)
        throw new Error(res.error || "Failed to create header");
      setCreatedHeaderId(res.data.header_id);
      toast.success("Header created — now add templates");
      return res.data.header_id as number;
    } catch (e: any) {
      toast.error(e?.message || "Failed to create header");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleAddTemplateClick = async () => {
    // Prevent adding templates once cumulative weight is already 100%
    const totalWeight = createdTemplates.reduce(
      (s, t) => s + (t?.temp_weightage ?? t?.weightage ?? t?.weight ?? 0),
      0
    );
    if (totalWeight >= 100) {
      toast.error(
        "Total weightage is already 100%. Cannot add more templates."
      );
      return;
    }

    // Do NOT create header now. Open the modal in local mode so template is stored locally
    const remaining = Math.max(0, 100 - totalWeight);
    setModalRemaining(remaining);
    setLocalEditingTemplate(null);
    setShowCreateTemplateModal(true);
  };

  const openConfirmDelete = (id: number) => setConfirmDeleteId(id);
  const closeConfirmDelete = () => setConfirmDeleteId(null);
  const confirmDelete = async () => {
    if (confirmDeleteId == null) return;
    try {
      setDeletingId(confirmDeleteId);
      // If this looks like a locally-created template (negative temp_id or no positive id), remove locally
      if (confirmDeleteId < 0 || !(confirmDeleteId > 0)) {
        setCreatedTemplates((prev) =>
          prev.filter(
            (t) => t.temp_id !== confirmDeleteId && t.id !== confirmDeleteId
          )
        );
        toast.success("Template removed");
      } else {
        const res = await apiFetch(`/api/goals/templates/${confirmDeleteId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(res.error || "Failed to delete template");
        toast.success("Template deleted");
        // Refresh templates for the header if header exists
        if (createdHeaderId) {
          const hdr = await getHeaderById(createdHeaderId);
          if (hdr.ok && hdr.data) {
            setCreatedTemplates(hdr.data.goal_templates || []);
          }
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setDeletingId(null);
      closeConfirmDelete();
    }
  };

  const handleEditClick = (templateId: number) => {
    // compute remaining for server-side edit
    const totalWeight = createdTemplates.reduce(
      (s, t) => s + (t?.temp_weightage ?? t?.weightage ?? t?.weight ?? 0),
      0
    );
    const found = createdTemplates.find(
      (t) => (t.temp_id ?? t.id) === templateId
    );
    const current = found
      ? found.temp_weightage ?? found.weightage ?? found.weight ?? 0
      : 0;
    const remaining = Math.max(0, 100 - (totalWeight - current));
    setModalRemaining(remaining);
    setEditingTemplateId(templateId);
    setShowEditModal(true);
  };

  const handleLocalEditClick = (template: any) => {
    // compute remaining allowing this template's current weight back
    const totalWeight = createdTemplates.reduce(
      (s, t) => s + (t?.temp_weightage ?? t?.weightage ?? t?.weight ?? 0),
      0
    );
    const current =
      template?.temp_weightage ?? template?.weightage ?? template?.weight ?? 0;
    const remaining = Math.max(0, 100 - (totalWeight - current));
    setModalRemaining(remaining);
    setLocalEditingTemplate(template);
    // open the create modal in localMode but prefilled for editing
    setShowCreateTemplateModal(true);
  };

  const handleEditSuccess = async () => {
    setShowEditModal(false);
    setEditingTemplateId(null);
    // Refresh created templates for the header
    if (createdHeaderId) {
      const hdr = await getHeaderById(createdHeaderId);
      if (hdr.ok && hdr.data) {
        setCreatedTemplates(hdr.data.goal_templates || []);
      }
    }
  };

  const handleSaveAndClose = async () => {
    // Ensure header exists on server (create if needed)
    let headerId = createdHeaderId;
    if (!headerId) {
      const hid = await ensureHeaderCreated();
      if (!hid) return;
      headerId = hid;
    }

    // Create any locally-created templates under the header
    if (createdTemplates.length > 0) {
      try {
        const toCreate = createdTemplates.filter(
          (t) => !(t.id || (t.temp_id && t.temp_id > 0))
        );

        for (const t of toCreate) {
          const payload = {
            temp_title: t.temp_title ?? t.title,
            temp_description: t.temp_description ?? t.description,
            temp_performance_factor: t.temp_performance_factor,
            temp_importance: t.temp_importance,
            temp_weightage: t.temp_weightage ?? t.weightage ?? t.weight,
            categories: t.categories ?? [],
          };
          const res = await createTemplateForHeader(
            headerId as number,
            payload
          );
          if (!res.ok)
            throw new Error(res.error || "Failed to create template");
        }

        // Refresh server-saved templates for the header
        const hdr = await getHeaderById(headerId as number);
        if (hdr.ok && hdr.data) {
          setCreatedTemplates(hdr.data.goal_templates || []);
        }
      } catch (e: any) {
        toast.error(e?.message || "Failed to save templates");
        return;
      }
    }

    navigate("/goal-templates");
  };

  const handleBackClick = () => {
    // Detect simple unsaved changes: title/description/role or any created templates
    const hasUnsaved =
      title.trim() !== "" ||
      description.trim() !== "" ||
      !!selectedRoleId ||
      createdTemplates.length > 0;

    if (hasUnsaved) setShowExitDialog(true);
    else navigate(-1);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="flex-none bg-background sticky top-0 z-40 border-b border-border/50">
        <div className="px-1 pt-0.5 pb-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleBackClick}
                variant={BUTTON_STYLES.BACK.variant}
                size={BUTTON_STYLES.BACK.size}
                className={BUTTON_STYLES.BACK.className}
                title="Back"
              >
                <ArrowLeft className={ICON_SIZES.DEFAULT} />
              </Button>
              <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Create Template
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={BUTTON_STYLES.SAVE.variant}
                onClick={handleSaveAndClose}
                disabled={saving}
              >
                <Save className={`${ICON_SIZES.DEFAULT} mr-2`} />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-1 py-2">
          <div className="space-y-2">
            <div className="animate-slide-up">
              <Card>
                <CardContent className="py-2 overflow-visible">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Header Title</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Role</Label>
                      <Select
                        value={selectedRoleId}
                        onValueChange={setSelectedRoleId}
                      >
                        <SelectTrigger className="w-full h-10">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {r.role_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Goal Type</Label>
                      <Select
                        value={goalTemplateType}
                        onValueChange={(v) => {
                          setGoalTemplateType(v as "Organization" | "Self");
                          // clear shared users when switching to Organization
                          if (v === "Organization") setSharedUsers([]);
                        }}
                      >
                        <SelectTrigger className="w-full h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Organization">
                            Organization
                          </SelectItem>
                          <SelectItem value="Self">Self (Private)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {goalTemplateType === "Self" && (
                      <div className="sm:col-span-2">
                        <Label>Share with employees (optional)</Label>
                        <Select value={""} onValueChange={() => {}}>
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                sharedUsers.length > 0
                                  ? `${sharedUsers.length} selected`
                                  : "Select employees to share with"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="p-2">
                              {employees.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  Loading employees...
                                </p>
                              ) : (
                                employees.map((emp) => (
                                  <label
                                    key={emp.emp_id}
                                    className="flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/50 cursor-pointer"
                                  >
                                    <Checkbox
                                      id={`emp-${emp.emp_id}`}
                                      checked={sharedUsers.includes(emp.emp_id)}
                                      onCheckedChange={(checked) => {
                                        if (checked)
                                          setSharedUsers((s) => [
                                            ...s,
                                            emp.emp_id,
                                          ]);
                                        else
                                          setSharedUsers((s) =>
                                            s.filter((id) => id !== emp.emp_id)
                                          );
                                      }}
                                    />
                                    <span className="text-sm">
                                      {emp.emp_name?.trim()
                                        ? emp.emp_name
                                        : `${emp.first_name ?? ""} ${
                                            emp.last_name ?? ""
                                          }`.trim()}
                                    </span>
                                  </label>
                                ))
                              )}
                            </div>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div
              className="animate-slide-up"
              style={{ animationDelay: "100ms" }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold">Templates</h2>
                  <div
                    className={`flex items-center gap-2 ml-2 px-3 py-1 rounded-full text-xs font-medium border ${
                      createdTemplates.reduce(
                        (s, t) =>
                          s +
                          (t?.temp_weightage ?? t?.weightage ?? t?.weight ?? 0),
                        0
                      ) > 100
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                    title={`Total weightage: ${createdTemplates.reduce(
                      (s, t) =>
                        s +
                        (t?.temp_weightage ?? t?.weightage ?? t?.weight ?? 0),
                      0
                    )}%`}
                  >
                    <Weight className="h-3 w-3" />
                    <span className="leading-none">
                      {createdTemplates.reduce(
                        (s, t) =>
                          s +
                          (t?.temp_weightage ?? t?.weightage ?? t?.weight ?? 0),
                        0
                      )}
                      %
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      / 100%
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleAddTemplateClick}
                  variant={BUTTON_STYLES.CREATE.variant}
                  disabled={
                    !title.trim() || !selectedRoleId || !description.trim()
                  }
                  title={
                    !title.trim() || !selectedRoleId || !description.trim()
                      ? "Enter header title, role and description before adding templates"
                      : undefined
                  }
                >
                  <span className="flex items-center gap-2">
                    <Plus className={ICON_SIZES.DEFAULT} />
                    Add Template
                  </span>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Use the Add Template button to open the template modal.
                Templates are created immediately under the header (header will
                be created first if needed).
              </p>

              {createdTemplates.length > 0 && (
                <div className="mt-3 space-y-3">
                  {createdTemplates.map((t: any) => (
                    <Card
                      key={t.temp_id ?? t.id}
                      className="shadow-soft hover-lift border border-border bg-white/40 dark:bg-transparent glass-effect transition-transform transform hover:-translate-y-1 hover:shadow-xl rounded-xl relative overflow-hidden"
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                                <Target className="h-6 w-6 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="mb-2">
                                  <h3 className="text-xl font-bold text-foreground truncate mt-1 leading-normal">
                                    {t.temp_title ?? t.title}
                                  </h3>
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
                                      <span>
                                        {(t.temp_weightage ??
                                          t.weightage ??
                                          t.weight) + "%"}
                                      </span>
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {isManagerOrAbove(
                              user?.role_id,
                              user?.role?.role_name
                            ) && (
                              <div className="flex gap-2 shrink-0">
                                <Button
                                  size={BUTTON_STYLES.EDIT.size}
                                  variant={BUTTON_STYLES.EDIT.variant}
                                  onClick={() => {
                                    // If this is a locally-created template (negative temp_id or no server id),
                                    // open the CreateTemplateModal in edit/localUpdate mode. Otherwise open server edit modal.
                                    const serverId = t.temp_id ?? t.id;
                                    if (serverId && serverId > 0) {
                                      handleEditClick(serverId);
                                    } else {
                                      handleLocalEditClick(t);
                                    }
                                  }}
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
                                  disabled={deletingId === (t.temp_id ?? t.id)}
                                  onClick={() =>
                                    openConfirmDelete(t.temp_id ?? t.id)
                                  }
                                  className={`flex items-center gap-2 ${BUTTON_STYLES.DELETE.className}`}
                                  aria-label={
                                    deletingId === (t.temp_id ?? t.id)
                                      ? "Deleting…"
                                      : "Delete template"
                                  }
                                  title={
                                    deletingId === (t.temp_id ?? t.id)
                                      ? "Deleting…"
                                      : "Delete template"
                                  }
                                >
                                  <Trash2
                                    className={ICON_SIZES.DEFAULT}
                                    aria-hidden="true"
                                  />
                                  <span className="hidden sm:inline">
                                    {deletingId === (t.temp_id ?? t.id)
                                      ? "Deleting…"
                                      : "Delete"}
                                  </span>
                                </Button>
                              </div>
                            )}
                          </div>

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
                                    .map((x: any) =>
                                      typeof x === "string" ? x : x.name
                                    )
                                    .join(", ")}`}
                                >
                                  Category
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {t.categories.map((c: any) => {
                                    const name =
                                      typeof c === "string" ? c : c.name;
                                    const key =
                                      typeof c === "string" ? name : c.id;
                                    return (
                                      <Badge
                                        key={key}
                                        variant="outline"
                                        className="bg-amber-50 text-amber-700 border-amber-300 font-medium"
                                        title={name}
                                      >
                                        {name}
                                      </Badge>
                                    );
                                  })}
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
                                {t.temp_performance_factor}
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
                                {t.temp_description ?? t.description}
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
          </div>
        </div>
      </div>

      <CreateTemplateModal
        open={showCreateTemplateModal}
        onOpenChange={(o) => {
          setShowCreateTemplateModal(o);
          if (!o) setLocalEditingTemplate(null);
        }}
        // localMode: do not POST from modal; return template object via onLocalCreate
        localMode={true}
        onLocalCreate={(tpl) => {
          setCreatedTemplates((prev) => [...prev, tpl]);
        }}
        // If editing a local template, pass it here so modal pre-fills fields
        editTemplate={localEditingTemplate ?? undefined}
        onLocalUpdate={(updated) => {
          setCreatedTemplates((prev) =>
            prev.map((p) => (p.temp_id === updated.temp_id ? updated : p))
          );
          setLocalEditingTemplate(null);
        }}
        remainingWeight={modalRemaining}
        onSuccess={(_createdHeaderId, _createdRoleId) => {
          // If used in non-local mode, parent can handle server-created template
        }}
        initialHeaderId={createdHeaderId ?? undefined}
      />

      <EditTemplateModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSuccess={handleEditSuccess}
        templateId={editingTemplateId}
        remainingWeight={modalRemaining}
      />

      <Dialog
        open={confirmDeleteId !== null}
        onOpenChange={() => setConfirmDeleteId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete template?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              goal template "
              {
                createdTemplates.find(
                  (x) =>
                    x.temp_id === confirmDeleteId || x.id === confirmDeleteId
                )?.temp_title
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
              {deletingId === confirmDeleteId ? "Deleting…" : "Confirm delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Would you like to save before leaving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant={BUTTON_STYLES.CANCEL.variant}
              onClick={() => {
                setShowExitDialog(false);
                navigate(-1);
              }}
              className="w-full sm:w-auto"
            >
              Close Without Saving
            </Button>
            <Button
              onClick={async () => {
                setShowExitDialog(false);
                await handleSaveAndClose();
              }}
              variant={BUTTON_STYLES.SAVE.variant}
              className={`w-full sm:w-auto ${BUTTON_STYLES.SAVE.className}`}
            >
              <Save className={`${ICON_SIZES.DEFAULT} mr-2`} />
              Save & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateHeaderWithTemplates;
