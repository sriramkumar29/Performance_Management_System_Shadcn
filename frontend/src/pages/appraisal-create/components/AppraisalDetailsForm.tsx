import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import {
  Select as UiSelect,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../../components/ui/select";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import dayjs, { type Dayjs } from "dayjs";
import { computePeriod } from "../helpers/dateHelpers";

interface Role {
  id: number;
  role_name: string;
}

interface Employee {
  emp_id: number;
  emp_name: string;
  emp_email: string;
  role_id: number;
  role: Role;
}

interface AppraisalType {
  id: number;
  name: string;
  has_range?: boolean;
}

interface AppraisalRange {
  id: number;
  name: string;
}

interface AppraisalFormValues {
  appraisee_id: number;
  reviewer_id: number;
  appraisal_type_id: number;
  appraisal_type_range_id?: number;
  period?: [Dayjs, Dayjs];
}

interface AppraisalDetailsFormProps {
  formValues: AppraisalFormValues;
  setFormValues: (
    values:
      | AppraisalFormValues
      | ((prev: AppraisalFormValues) => AppraisalFormValues)
  ) => void;
  employees: Employee[];
  eligibleReviewers: Employee[];
  appraisalTypes: AppraisalType[];
  ranges: AppraisalRange[];
  setRanges: (ranges: AppraisalRange[]) => void;
  selectedTypeId: number | null;
  setSelectedTypeId: (id: number | null) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isLocked: boolean;
  disableTypeSelection?: boolean;
  onFetchRanges: (typeId: number) => Promise<AppraisalRange[]>;
}

export const AppraisalDetailsForm = ({
  formValues,
  setFormValues,
  employees,
  eligibleReviewers,
  appraisalTypes,
  ranges,
  setRanges,
  selectedTypeId,
  setSelectedTypeId,
  isCollapsed,
  onToggleCollapse,
  isLocked,
  disableTypeSelection = false,
  onFetchRanges,
}: AppraisalDetailsFormProps) => {
  const selectedEmployee = employees.find(
    (e) => e.emp_id === formValues.appraisee_id
  );
  const selectedReviewer = eligibleReviewers.find(
    (e) => e.emp_id === formValues.reviewer_id
  );

  const handleTypeChange = async (val: string) => {
    const id = Number(val);
    setSelectedTypeId(id);
    const meta = appraisalTypes.find((t) => t.id === id);

    if (meta?.has_range) {
      setFormValues((v) => ({
        ...v,
        appraisal_type_id: id,
        appraisal_type_range_id: undefined,
        period: undefined,
      }));
      const rangesData = await onFetchRanges(id);
      setRanges(rangesData);
    } else {
      setRanges([]);
      const p = computePeriod(meta);
      setFormValues((v) => ({
        ...v,
        appraisal_type_id: id,
        appraisal_type_range_id: undefined,
        period: p,
      }));
    }
  };

  const handleRangeChange = (val: string) => {
    const rangeId = Number(val);
    const tMeta = appraisalTypes.find((t) => t.id === selectedTypeId!);
    const r = ranges.find((rg) => rg.id === rangeId);
    const p = computePeriod(tMeta, r);
    setFormValues((v) => ({
      ...v,
      appraisal_type_range_id: rangeId,
      period: p,
    }));
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={onToggleCollapse}
        aria-expanded={!isCollapsed}
        aria-controls="appraisal-details-content"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onToggleCollapse();
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg">
              Appraisal Details
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Select employee, reviewer, appraisal type and period.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" aria-label="Toggle details">
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent id="appraisal-details-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column: Appraisee and Reviewer */}
            <div className="space-y-6">
              <div className="grid gap-2">
                <Label>Employee (Appraisee)</Label>
                <UiSelect
                  value={
                    formValues.appraisee_id
                      ? String(formValues.appraisee_id)
                      : undefined
                  }
                  onValueChange={(val) => {
                    const empId = Number(val);
                    setFormValues((v) => ({ ...v, appraisee_id: empId }));
                  }}
                  disabled={isLocked}
                >
                  <SelectTrigger aria-label="Employee">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.emp_id} value={String(emp.emp_id)}>
                        {emp.emp_name} ({emp.emp_email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </UiSelect>
                {selectedEmployee && (
                  <p className="text-xs text-muted-foreground">
                    Role: {selectedEmployee.role?.role_name || "N/A"}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Reviewer</Label>
                <UiSelect
                  value={
                    formValues.reviewer_id
                      ? String(formValues.reviewer_id)
                      : undefined
                  }
                  onValueChange={(val) => {
                    const empId = Number(val);
                    setFormValues((v) => ({ ...v, reviewer_id: empId }));
                  }}
                  disabled={isLocked}
                >
                  <SelectTrigger aria-label="Reviewer">
                    <SelectValue placeholder="Select reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleReviewers.map((emp) => (
                      <SelectItem key={emp.emp_id} value={String(emp.emp_id)}>
                        {emp.emp_name} ({emp.emp_email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </UiSelect>
                {selectedReviewer && (
                  <p className="text-xs text-muted-foreground">
                    Role: {selectedReviewer.role?.role_name || "N/A"}
                  </p>
                )}
              </div>
            </div>

            {/* Right column: Appraisal Type, Range and Period */}
            <div className="space-y-6">
              <div className="grid gap-2">
                <Label>Appraisal Type</Label>
                <UiSelect
                  value={selectedTypeId ? String(selectedTypeId) : undefined}
                  onValueChange={handleTypeChange}
                  disabled={isLocked || disableTypeSelection}
                >
                  <SelectTrigger aria-label="Appraisal Type">
                    <SelectValue placeholder="Select appraisal type" />
                  </SelectTrigger>
                  <SelectContent>
                    {appraisalTypes.map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </UiSelect>
                <p className="text-xs text-muted-foreground">
                  Type determines the period automatically. If the type has
                  ranges, choose one next.
                </p>
              </div>

              {(() => {
                const meta = appraisalTypes.find(
                  (t) => t.id === selectedTypeId
                );

                // If the appraisal type has ranges, render the range radios and period inputs
                if (meta?.has_range) {
                  return (
                    <div className="grid gap-2">
                      <Label>Range</Label>
                      <div className="flex flex-col md:flex-row gap-4 items-start">
                        <div className="flex flex-row flex-wrap gap-2 items-center">
                          {ranges.map((range) => (
                            <label
                              key={range.id}
                              className="inline-flex items-center gap-2 p-2 rounded hover:bg-muted"
                            >
                              <input
                                type="radio"
                                name="appraisal-range"
                                value={String(range.id)}
                                checked={
                                  formValues.appraisal_type_range_id ===
                                  range.id
                                }
                                onChange={() =>
                                  handleRangeChange(String(range.id))
                                }
                                disabled={isLocked}
                                aria-label={`Select range ${range.name}`}
                              />
                              <span className="text-sm">{range.name}</span>
                            </label>
                          ))}
                        </div>

                        {/* Period inputs placed next to the radio buttons */}
                        {formValues.period &&
                          formValues.period.length === 2 && (
                            <div className="flex gap-2 items-center">
                              <div className="relative w-[160px]">
                                <Input
                                  id="period-start"
                                  data-testid="period-start"
                                  type="date"
                                  value={
                                    formValues.period[0]?.format(
                                      "YYYY-MM-DD"
                                    ) || ""
                                  }
                                  max={
                                    formValues.period[1]?.format(
                                      "YYYY-MM-DD"
                                    ) || undefined
                                  }
                                  onChange={(e) => {
                                    const newStartDate = e.target.value;
                                    if (newStartDate && formValues.period) {
                                      const startDate = dayjs(newStartDate);
                                      setFormValues((v) => ({
                                        ...v,
                                        period: [startDate, v.period![1]],
                                      }));
                                    }
                                  }}
                                  disabled={isLocked}
                                  readOnly
                                  aria-label="Start date"
                                  placeholder="Start date"
                                />
                              </div>

                              <div className="relative w-[160px]">
                                <Input
                                  id="period-end"
                                  data-testid="period-end"
                                  type="date"
                                  value={
                                    formValues.period[1]?.format(
                                      "YYYY-MM-DD"
                                    ) || ""
                                  }
                                  min={
                                    formValues.period[0]?.format(
                                      "YYYY-MM-DD"
                                    ) || undefined
                                  }
                                  onChange={(e) => {
                                    const newEndDate = e.target.value;
                                    if (newEndDate && formValues.period) {
                                      const endDate = dayjs(newEndDate);
                                      setFormValues((v) => ({
                                        ...v,
                                        period: [v.period![0], endDate],
                                      }));
                                    }
                                  }}
                                  disabled={isLocked}
                                  readOnly
                                  aria-label="End date"
                                  placeholder="End date"
                                />
                              </div>
                            </div>
                          )}
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Period is initially calculated based on the selected
                        type and range, but can be manually adjusted using the
                        calendar pickers.
                      </p>
                    </div>
                  );
                }

                // If the appraisal type does NOT have ranges, show the period inputs directly
                return (
                  <div className="grid gap-2">
                    <Label>Period</Label>
                    {formValues.period && formValues.period.length === 2 ? (
                      <div className="flex gap-2 items-center">
                        <div className="relative w-[160px]">
                          <Input
                            id="period-start"
                            data-testid="period-start"
                            type="date"
                            value={
                              formValues.period[0]?.format("YYYY-MM-DD") || ""
                            }
                            max={
                              formValues.period[1]?.format("YYYY-MM-DD") ||
                              undefined
                            }
                            onChange={(e) => {
                              const newStartDate = e.target.value;
                              if (newStartDate && formValues.period) {
                                const startDate = dayjs(newStartDate);
                                setFormValues((v) => ({
                                  ...v,
                                  period: [startDate, v.period![1]],
                                }));
                              }
                            }}
                            disabled={isLocked}
                            readOnly
                            aria-label="Start date"
                            placeholder="Start date"
                          />
                        </div>

                        <div className="relative w-[160px]">
                          <Input
                            id="period-end"
                            data-testid="period-end"
                            type="date"
                            value={
                              formValues.period[1]?.format("YYYY-MM-DD") || ""
                            }
                            min={
                              formValues.period[0]?.format("YYYY-MM-DD") ||
                              undefined
                            }
                            onChange={(e) => {
                              const newEndDate = e.target.value;
                              if (newEndDate && formValues.period) {
                                const endDate = dayjs(newEndDate);
                                setFormValues((v) => ({
                                  ...v,
                                  period: [v.period![0], endDate],
                                }));
                              }
                            }}
                            disabled={isLocked}
                            readOnly
                            aria-label="End date"
                            placeholder="End date"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Period will be calculated based on the selected type.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
