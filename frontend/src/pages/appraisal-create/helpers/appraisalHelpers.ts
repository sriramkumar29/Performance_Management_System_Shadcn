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
        category_id: goalData.goal.category_id,
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
      await apiFetch(`/api/goals/${createdGoalId}`, { method: "DELETE" }).catch(() => {});
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
        category_id: goalData.goal.category_id,
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

  if (!appraisalId) {
    // Create new appraisal
    const res = await apiFetch("/api/appraisals/", {
      method: "POST",
      body: JSON.stringify(body),
    });
    
    if (!res.ok || !res.data) {
      throw new Error(res.error || "Could not save draft");
    }
    
    return (res.data as any).appraisal_id ?? (res.data as any).id;
  } else {
    // Update existing appraisal
    const res = await apiFetch(`/api/appraisals/${appraisalId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      throw new Error(res.error || "Could not save changes");
    }
    
    return appraisalId;
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