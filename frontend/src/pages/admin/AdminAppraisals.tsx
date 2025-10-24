import { useEffect, useState } from "react";
import { api } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import AppraisalDialog from "../../components/admin/AppraisalDialog";
import { fetchEmployees } from "../appraisal-create/helpers/dataHelpers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { getStatusBadgeVariant } from "../../utils/appraisalUtils";
import { Edit, RefreshCw, Plus } from "lucide-react";
import CategoryModal from "../../components/modals/CategoryModal";

interface Appraisal {
  appraisal_id: number;
  status: string;
  appraisee_id: number;
  appraiser_id?: number;
  reviewer_id?: number;
  start_date?: string;
  end_date?: string;
  appraisal_type_id?: number;
  appraisal_type_name?: string;
  appraisee_name?: string;
  appraiser_name?: string;
  reviewer_name?: string;
}

const AdminAppraisals = () => {
  const { user } = useAuth();
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [typesList, setTypesList] = useState<{ id: number; name: string }[]>(
    []
  );
  const [selectedType, setSelectedType] = useState<string | "all">("all");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppraisal, setSelectedAppraisal] = useState<Appraisal | null>(
    null
  );
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      // Fetch appraisals and employees in parallel
      const [appraisalsRes, employees, typesRes] = await Promise.all([
        api.get<Appraisal[]>(`/appraisals/?limit=200`),
        fetchEmployees(),
        api.get<{ id: number; name: string }[]>(`/appraisal-types/`),
      ]);

      if (appraisalsRes.ok && appraisalsRes.data) {
        // Store employees for dropdown use
        setEmployees(employees);
        // store types list for filter
        if (typesRes && typesRes.ok && typesRes.data)
          setTypesList(typesRes.data);

        // Create a map of employee IDs to names
        const employeeMap = new Map(
          employees.map((emp: any) => [emp.emp_id, emp.emp_name])
        );

        // Create a map for appraisal types (if fetched)
        const typeMap = new Map<number, string>();
        if (typesRes && typesRes.ok && typesRes.data) {
          for (const t of typesRes.data) typeMap.set(t.id, t.name);
        }

        // Enrich appraisals with employee names, type name and filter out draft status
        const enrichedAppraisals = appraisalsRes.data
          .filter((appraisal) => appraisal.status.toLowerCase() !== "draft")
          .map((appraisal) => ({
            ...appraisal,
            appraisee_name:
              employeeMap.get(appraisal.appraisee_id) ||
              `ID: ${appraisal.appraisee_id}`,
            appraiser_name: appraisal.appraiser_id
              ? employeeMap.get(appraisal.appraiser_id) ||
                `ID: ${appraisal.appraiser_id}`
              : undefined,
            reviewer_name: appraisal.reviewer_id
              ? employeeMap.get(appraisal.reviewer_id) ||
                `ID: ${appraisal.reviewer_id}`
              : undefined,
            // Prefer embedded appraisal_type.name when available, otherwise lookup
            appraisal_type_name:
              (appraisal as any)?.appraisal_type?.name ||
              (appraisal.appraisal_type_id
                ? typeMap.get(appraisal.appraisal_type_id) ||
                  `Type #${appraisal.appraisal_type_id}`
                : undefined),
          }));

        setAppraisals(enrichedAppraisals);
      }
    } catch (e) {
      console.error("Failed to load appraisals:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (appraisal: Appraisal) => {
    setSelectedAppraisal(appraisal);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const statuses = Array.from(new Set(appraisals.map((a) => a.status)));

  const filtered = appraisals.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (selectedType !== "all") {
      if (a.appraisal_type_id == null) return false;
      if (String(a.appraisal_type_id) !== String(selectedType)) return false;
    }
    if (query) {
      const q = query.toLowerCase();
      return (
        String(a.appraisal_id).includes(q) ||
        String(a.appraisee_id).includes(q) ||
        String(a.appraiser_id || "").includes(q) ||
        String(a.reviewer_id || "").includes(q) ||
        a.status.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleReset = () => {
    setQuery("");
    setStatusFilter("all");
  };

  if (!user) return null;

  return (
    <div className="space-y-3 text-foreground">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by ID, appraisee, appraiser, or reviewer..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="w-48">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-56">
          <Select
            value={selectedType}
            onValueChange={(v) => setSelectedType(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {typesList.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => setShowCategoryModal(true)}>
            <Plus className="h-4 w-4" />
            Categories
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            title="Reset filters"
            aria-label="Reset filters"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="rounded-md border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Appraisee</TableHead>
                <TableHead>Appraiser</TableHead>
                <TableHead>Appraisal Type</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground"
                  >
                    No appraisals found with "Submit" or "Submitted" status
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((a) => (
                  <TableRow
                    key={a.appraisal_id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-medium">
                      #{a.appraisal_id}
                    </TableCell>
                    <TableCell>
                      {a.appraisee_name || `ID: ${a.appraisee_id}`}
                    </TableCell>
                    <TableCell>{a.appraiser_name || "—"}</TableCell>
                    <TableCell>
                      {a.appraisal_type_name ||
                        (a.appraisal_type_id
                          ? `Type #${a.appraisal_type_id}`
                          : "—")}
                    </TableCell>
                    <TableCell>{a.reviewer_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(a.status)}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {a.start_date
                        ? new Date(a.start_date).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {a.end_date
                        ? new Date(a.end_date).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => handleEdit(a)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AppraisalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => {
          load();
        }}
        appraisal={selectedAppraisal}
        mode={dialogMode}
        employees={employees}
      />

      <CategoryModal
        open={showCategoryModal}
        onOpenChange={(o: boolean) => setShowCategoryModal(o)}
        onCreated={() => load()}
      />
    </div>
  );
};

export default AdminAppraisals;
