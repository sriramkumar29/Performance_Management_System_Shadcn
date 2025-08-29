import { http, HttpResponse } from 'msw'

const API_BASE = '/api'

// Mock data
const mockEmployees = [
  {
    emp_id: 1,
    emp_name: 'John Doe',
    emp_email: 'john.doe@company.com',
    emp_roles: 'Manager',
    emp_roles_level: 4,
    emp_department: 'Engineering'
  },
  {
    emp_id: 2,
    emp_name: 'Jane Smith',
    emp_email: 'jane.smith@company.com',
    emp_roles: 'Developer',
    emp_roles_level: 3,
    emp_department: 'Engineering'
  },
  {
    emp_id: 3,
    emp_name: 'Bob Wilson',
    emp_email: 'bob.wilson@company.com',
    emp_roles: 'VP',
    emp_roles_level: 6,
    emp_department: 'Engineering'
  }
]

const mockAppraisalTypes = [
  { id: 1, name: 'Annual', has_range: false },
  { id: 2, name: 'Half-yearly', has_range: true },
  { id: 3, name: 'Quarterly', has_range: true },
  { id: 4, name: 'Tri-annual', has_range: true }
]

const mockRanges = [
  { id: 1, name: '1st', appraisal_type_id: 2 },
  { id: 2, name: '2nd', appraisal_type_id: 2 },
  { id: 3, name: '1st', appraisal_type_id: 3 },
  { id: 4, name: '2nd', appraisal_type_id: 3 },
  { id: 5, name: '3rd', appraisal_type_id: 3 },
  { id: 6, name: '4th', appraisal_type_id: 3 }
]

// Mock data for categories
const mockCategories = [
  { id: 1, name: 'Category 1' },
  { id: 2, name: 'Category 2' },
]

export const handlers = [
  // Categories endpoint
  http.get(`${API_BASE}/goals/categories`, () => {
    return HttpResponse.json(mockCategories)
  }),

  // Auth endpoints
  http.post(`${API_BASE}/employees/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    
    if (body.email === 'test@company.com' && body.password === 'password123') {
      return HttpResponse.json({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token'
      })
    }
    
    return HttpResponse.json(
      { detail: 'Invalid credentials' },
      { status: 401 }
    )
  }),

  http.post(`${API_BASE}/employees/refresh`, async ({ request }) => {
    const body = await request.json() as { refresh_token: string }
    
    if (body.refresh_token === 'mock-refresh-token') {
      return HttpResponse.json({
        access_token: 'new-mock-access-token',
        refresh_token: 'new-mock-refresh-token'
      })
    }
    
    return HttpResponse.json(
      { detail: 'Invalid refresh token' },
      { status: 401 }
    )
  }),

  http.get(`${API_BASE}/employees/by-email`, ({ request }) => {
    const url = new URL(request.url)
    const email = url.searchParams.get('email')
    
    const employee = mockEmployees.find(emp => emp.emp_email === email)
    
    if (employee) {
      return HttpResponse.json(employee)
    }
    
    return HttpResponse.json(
      { detail: 'Employee not found' },
      { status: 404 }
    )
  }),

  // Employees endpoint
  http.get(`${API_BASE}/employees`, () => {
    return HttpResponse.json(mockEmployees)
  }),

  // Appraisal types
  http.get(`${API_BASE}/appraisal-types`, () => {
    return HttpResponse.json(mockAppraisalTypes)
  }),

  // Appraisal ranges
  http.get(`${API_BASE}/appraisal-types/ranges`, ({ request }) => {
    const url = new URL(request.url)
    const typeId = url.searchParams.get('appraisal_type_id')
    
    if (typeId) {
      const ranges = mockRanges.filter(r => r.appraisal_type_id === Number(typeId))
      return HttpResponse.json(ranges)
    }
    
    return HttpResponse.json([])
  }),

  // Appraisals
  http.post(`${API_BASE}/appraisals`, async ({ request }) => {
    const body = await request.json() as any
    
    return HttpResponse.json({
      appraisal_id: 123,
      ...body,
      status: 'Draft'
    })
  }),

  http.get(`${API_BASE}/appraisals/:id`, ({ params }) => {
    const { id } = params
    
    return HttpResponse.json({
      appraisal_id: Number(id),
      appraisee_id: 2,
      appraiser_id: 1,
      reviewer_id: 3,
      appraisal_type_id: 1,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'Draft',
      appraisal_goals: []
    })
  }),

  http.put(`${API_BASE}/appraisals/:id`, async ({ request, params }) => {
    const { id } = params
    const body = await request.json() as any
    
    return HttpResponse.json({
      appraisal_id: Number(id),
      ...body
    })
  }),

  http.put(`${API_BASE}/appraisals/:id/status`, async ({ request, params }) => {
    const { id } = params
    const body = await request.json() as { status: string }
    
    return HttpResponse.json({
      appraisal_id: Number(id),
      status: body.status
    })
  }),

  // Goals
  http.post(`${API_BASE}/goals`, async ({ request }) => {
    const body = await request.json() as any
    
    return HttpResponse.json({
      goal_id: Math.floor(Math.random() * 1000) + 1,
      ...body
    })
  }),

  http.put(`${API_BASE}/goals/:id`, async ({ request, params }) => {
    const { id } = params
    const body = await request.json() as any
    
    return HttpResponse.json({
      goal_id: Number(id),
      ...body
    })
  }),

  http.delete(`${API_BASE}/goals/:id`, () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // Appraisal goals
  http.post(`${API_BASE}/appraisals/:appraisalId/goals/:goalId`, ({ params }) => {
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000) + 1,
      appraisal_id: Number(params.appraisalId),
      goal_id: Number(params.goalId)
    })
  }),

  http.delete(`${API_BASE}/appraisals/:appraisalId/goals/:goalId`, () => {
    return new HttpResponse(null, { status: 204 })
  })
]
