import { apiFetch } from "../../../utils/api";
import dayjs, { type Dayjs } from "dayjs";

type AppraisalStatus =
  | "Draft"
  | "Submitted"
  | "Appraisee Self Assessment"
  | "Appraiser Evaluation"
  | "Reviewer Evaluation"
  | "Complete";

interface AppraisalFormValues {
  appraisee_id: number;
  reviewer_id: number;
  appraisal_type_id: number;
  appraisal_type_range_id?: number;
  period?: [Dayjs, Dayjs];
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
    category: {
      id: number;
      name: string;
    };
  };
}

export interface DraftAppraisal {
  appraisal_id: number;
  appraisee_name: string;
  reviewer_name: string;
  appraisal_type_name: string;
  appraisal_range_name?: string;
  start_date?: string;
  end_date?: string;
  goals_count: number;
  total_weightage: number;
  created_at: string;
  updated_at: string;
}

// Helper function to check for existing draft appraisals with matching criteria
export const checkForDraftAppraisal = async (
  appraisee_id: number,
  reviewer_id: number,
  appraisal_type_id: number,
  appraiser_id: number, // Current logged-in user ID
  appraisal_type_range_id?: number
): Promise<DraftAppraisal | null> => {
  try {
    const params = new URLSearchParams({
      status_filter: "Draft",
      appraisee_id: appraisee_id.toString(),
      reviewer_id: reviewer_id.toString(),
      appraisal_type_id: appraisal_type_id.toString(),
      appraiser_id: appraiser_id.toString(), // Filter by current user
    });

    const res = await apiFetch<any[]>(`/api/appraisals/?${params.toString()}`);

    if (!res.ok || !res.data || res.data.length === 0) {
      return null;
    }

    // Find matching draft (if range is provided, match it too)
    const matchingDraft = res.data.find((appraisal: any) => {
      const rangeMatches = appraisal_type_range_id
        ? appraisal.appraisal_type_range_id === appraisal_type_range_id
        : true;
      return rangeMatches;
    });

    if (!matchingDraft) {
      return null;
    }

    // Fetch full details including goals using the specific appraisal endpoint
    const detailRes = await apiFetch<any>(`/api/appraisals/${matchingDraft.appraisal_id}`);

    if (!detailRes.ok || !detailRes.data) {
      console.error("Failed to fetch draft details");
      // Fall back to basic data
      return {
        appraisal_id: matchingDraft.appraisal_id,
        appraisee_name: "", // Will be filled by component
        reviewer_name: "", // Will be filled by component
        appraisal_type_name: matchingDraft.appraisal_type?.name || "Unknown",
        appraisal_range_name: matchingDraft.appraisal_type_range?.name,
        start_date: matchingDraft.start_date,
        end_date: matchingDraft.end_date,
        goals_count: 0,
        total_weightage: 0,
        created_at: matchingDraft.created_at,
        updated_at: matchingDraft.updated_at,
      };
    }

    const fullDraft = detailRes.data;
    console.log("Full draft details:", fullDraft);

    // Calculate total weightage from goals
    const goalsCount = Array.isArray(fullDraft.appraisal_goals) ? fullDraft.appraisal_goals.length : 0;
    const totalWeightage = Array.isArray(fullDraft.appraisal_goals)
      ? fullDraft.appraisal_goals.reduce((sum: number, appraisalGoal: any) => {
        return sum + (appraisalGoal.goal?.goal_weightage || 0);
      }, 0)
      : 0;

    // Transform to our DraftAppraisal interface
    // Note: Employee names will be populated by the component using the employees list
    return {
      appraisal_id: fullDraft.appraisal_id,
      appraisee_name: "", // Will be filled by component
      reviewer_name: "", // Will be filled by component
      appraisal_type_name: fullDraft.appraisal_type?.name || "Unknown",
      appraisal_range_name: fullDraft.appraisal_type_range?.name,
      start_date: fullDraft.start_date,
      end_date: fullDraft.end_date,
      goals_count: goalsCount,
      total_weightage: totalWeightage,
      created_at: fullDraft.created_at,
      updated_at: fullDraft.updated_at,
    };
  } catch (error) {
    console.error("Error checking for draft appraisal:", error);
    return null;
  }
};

// Helper function to load appraisal data
export const loadAppraisal = async (id: number) => {
  const res = await apiFetch(`/api/appraisals/${id}`);
  if (!res.ok || !res.data) {
    throw new Error(res.error || "Failed to load appraisal");
  }

  const data = res.data as any;
  return {
    appraisalId: data.appraisal_id ?? id,
    status: data.status as AppraisalStatus,
    goals: Array.isArray(data.appraisal_goals) ? data.appraisal_goals : [],
    typeId: data.appraisal_type_id as number,
    formValues: {
      appraisee_id: data.appraisee_id,
      reviewer_id: data.reviewer_id,
      appraisal_type_id: data.appraisal_type_id,
      appraisal_type_range_id: data.appraisal_type_range_id ?? undefined,
      period: [dayjs(data.start_date), dayjs(data.end_date)] as [Dayjs, Dayjs],
    }
  };
};

// Helper function to sync goal changes
export const syncGoalChanges = async (
  appraisalId: number,
  goalChanges: {
    added: AppraisalGoal[];
    removed: number[];
    updated: AppraisalGoal[];
  },
  originalGoals: AppraisalGoal[]
) => {
  const { added, removed, updated } = goalChanges;

  // Remove goals first
  for (const goalId of removed) {
    const removeRes = await apiFetch(
      `/api/appraisals/${appraisalId}/goals/${goalId}`,
      { method: "DELETE" }
    );
    if (!removeRes.ok) {
      throw new Error(removeRes.error || `Failed to remove goal ${goalId}`);
    }
  }

  // Add new goals
  for (const goalData of added) {
    const alreadyOnServer = originalGoals.some(
      (g) => g.goal.goal_id === goalData.goal.goal_id
    );
    if (alreadyOnServer) continue;

    const createGoalRes = await apiFetch("/api/goals/", {
      method: "POST",
      body: JSON.stringify({
        goal_template_id: goalData.goal.goal_template_id,
        goal_title: goalData.goal.goal_title,
        goal_description: goalData.goal.goal_description,
        goal_performance_factor: goalData.goal.goal_performance_factor,
        goal_importance: goalData.goal.goal_importance,
        goal_weightage: goalData.goal.goal_weightage,
        // send new category_ids array when available, otherwise fall back to legacy category_id
        ...(goalData.goal as any).category_ids ? { category_ids: (goalData.goal as any).category_ids } : { category_id: goalData.goal.category_id },
      }),
    });

    if (!createGoalRes.ok || !createGoalRes.data) {
      throw new Error(createGoalRes.error || "Failed to create goal");
    }

    const createdGoalId = (createGoalRes.data as any).goal_id;
    const attachRes = await apiFetch(
      `/api/appraisals/${appraisalId}/goals/${createdGoalId}`,
      { method: "POST" }
    );

    if (!attachRes.ok) {
      // Cleanup created goal if attachment fails
      await apiFetch(`/api/goals/${createdGoalId}`, { method: "DELETE" }).catch(() => { });
      throw new Error(attachRes.error || "Failed to attach goal to appraisal");
    }
  }

  // Update existing goals
  for (const goalData of updated) {
    const updateRes = await apiFetch(`/api/goals/${goalData.goal.goal_id}`, {
      method: "PUT",
      body: JSON.stringify({
        goal_title: goalData.goal.goal_title,
        goal_description: goalData.goal.goal_description,
        goal_performance_factor: goalData.goal.goal_performance_factor,
        goal_importance: goalData.goal.goal_importance,
        goal_weightage: goalData.goal.goal_weightage,
        ...(goalData.goal as any).category_ids ? { category_ids: (goalData.goal as any).category_ids } : { category_id: goalData.goal.category_id },
      }),
    });

    if (!updateRes.ok) {
      throw new Error(updateRes.error || `Failed to update goal ${goalData.goal.goal_id}`);
    }
  }
};

// Helper function to create or update appraisal
export const saveAppraisal = async (
  formValues: AppraisalFormValues,
  appraiserEmpId: number,
  appraisalId?: number
) => {
  const body = {
    appraisee_id: formValues.appraisee_id,
    appraiser_id: appraiserEmpId,
    reviewer_id: formValues.reviewer_id,
    appraisal_type_id: formValues.appraisal_type_id,
    appraisal_type_range_id: formValues.appraisal_type_range_id ?? null,
    start_date: formValues.period?.[0]?.format("YYYY-MM-DD"),
    end_date: formValues.period?.[1]?.format("YYYY-MM-DD"),
    status: "Draft" as AppraisalStatus,
  };

  if (appraisalId) {
    // Update existing appraisal
    const res = await apiFetch(`/api/appraisals/${appraisalId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(res.error || "Could not save changes");
    }

    return appraisalId;
  } else {
    // Create new appraisal
    const res = await apiFetch("/api/appraisals/", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.data) {
      throw new Error(res.error || "Could not save draft");
    }

    return (res.data as any).appraisal_id ?? (res.data as any).id;
  }
};

// Helper function to submit appraisal for acknowledgement
export const submitAppraisal = async (appraisalId: number) => {
  const res = await apiFetch(`/api/appraisals/${appraisalId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: "Submitted" }),
  });

  if (!res.ok) {
    throw new Error(res.error || "Could not submit for acknowledgement");
  }
};