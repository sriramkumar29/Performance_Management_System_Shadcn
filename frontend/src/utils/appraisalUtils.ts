export type BadgeVariant =
    | "default"
    | "secondary"
    | "outline"
    | "destructive"
    | "success"
    | "warning"
    | "info"
    | "muted";

export function normalizeStatus(s?: string) {
    return (s || "").toLowerCase().trim();
}

export function getStatusBadgeVariant(status?: string): BadgeVariant {
    const s = normalizeStatus(status);
    if (s === "complete") return "success";
    if (s === "submitted" || s === "submit") return "secondary";
    if (s === "appraisee self assessment") return "info";
    if (s === "appraiser evaluation") return "warning";
    if (s === "reviewer evaluation") return "outline";
    if (s === "draft") return "muted";
    return "secondary";
}

export function getAppraisalTypeName(appraisal: any, typeMap?: Map<number, string>) {
    if (!appraisal) return undefined;
    if (appraisal.appraisal_type && appraisal.appraisal_type.name) return appraisal.appraisal_type.name;
    const id = appraisal.appraisal_type_id ?? appraisal.appraisal_type?.id;
    if (typeof id === "number" && typeMap) return typeMap.get(id) || undefined;
    return undefined;
}
