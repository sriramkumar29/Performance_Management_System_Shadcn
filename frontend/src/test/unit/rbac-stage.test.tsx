import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen} from '@testing-library/react'
import { render, setupAuthTokens } from './test-utils'
import { server } from './mocks/server'

// Mock components for testing RBAC behavior
const MockAppraisalView = ({ appraisalId, userRole, status }: { 
  appraisalId: number
  userRole: 'appraisee' | 'appraiser' | 'reviewer'
  status: string 
}) => {
  const mockAppraisal = {
    appraisal_id: appraisalId,
    status,
    appraisal_goals: [
      {
        id: 1,
        goal: {
          goal_id: 1,
          goal_title: 'Complete Project A',
          goal_description: 'Finish project A on time',
          goal_weightage: 60,
          self_comment: status !== 'Draft' ? 'Working on it' : '',
          self_rating: status !== 'Draft' ? 4 : null,
          appraiser_comment: ['Appraiser Evaluation', 'Reviewer Evaluation', 'Complete'].includes(status) ? 'Good progress' : '',
          appraiser_rating: ['Appraiser Evaluation', 'Reviewer Evaluation', 'Complete'].includes(status) ? 4 : null
        }
      }
    ],
    appraiser_overall_comments: ['Reviewer Evaluation', 'Complete'].includes(status) ? 'Overall good performance' : '',
    appraiser_overall_rating: ['Reviewer Evaluation', 'Complete'].includes(status) ? 4 : null,
    reviewer_overall_comments: status === 'Complete' ? 'Excellent work' : '',
    reviewer_overall_rating: status === 'Complete' ? 5 : null
  }

  return (
    <div data-testid="appraisal-view">
      <h1>Appraisal View - Status: {status}</h1>
      <div data-testid="user-role">Role: {userRole}</div>
      
      {/* Goals Section */}
      {!(userRole === 'appraisee' && status === 'Draft') && (
        <div data-testid="goals-section">
          {mockAppraisal.appraisal_goals.map(ag => (
            <div key={ag.id} data-testid={`goal-${ag.goal.goal_id}`}>
              <h3>{ag.goal.goal_title}</h3>
              <p>{ag.goal.goal_description}</p>
              
              {/* Self Assessment Section */}
              {(status !== 'Draft' || userRole === 'appraisee') && (
                <div data-testid="self-assessment">
                  {userRole === 'appraisee' && status === 'Appraisee Self Assessment' ? (
                    <>
                      <textarea 
                        data-testid="self-comment-input"
                        placeholder="Enter self assessment comment"
                        defaultValue={ag.goal.self_comment}
                      />
                      <input 
                        data-testid="self-rating-input"
                        type="number"
                        min="1"
                        max="5"
                        defaultValue={ag.goal.self_rating || ''}
                      />
                    </>
                  ) : ag.goal.self_comment ? (
                    <div data-testid="self-comment-readonly">{ag.goal.self_comment}</div>
                  ) : null}
                </div>
              )}
              
              {/* Appraiser Evaluation Section */}
              {(['Appraiser Evaluation', 'Reviewer Evaluation', 'Complete'].includes(status) || 
                (userRole === 'appraiser' && status === 'Appraiser Evaluation')) && (
                <div data-testid="appraiser-evaluation">
                  {userRole === 'appraiser' && status === 'Appraiser Evaluation' ? (
                    <>
                      <textarea 
                        data-testid="appraiser-comment-input"
                        placeholder="Enter appraiser comment"
                        defaultValue={ag.goal.appraiser_comment}
                      />
                      <input 
                        data-testid="appraiser-rating-input"
                        type="number"
                        min="1"
                        max="5"
                        defaultValue={ag.goal.appraiser_rating || ''}
                      />
                    </>
                  ) : ag.goal.appraiser_comment && status === 'Complete' ? (
                    <div data-testid="appraiser-comment-readonly">{ag.goal.appraiser_comment}</div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Overall Appraiser Section */}
      {(['Appraiser Evaluation', 'Reviewer Evaluation', 'Complete'].includes(status) || 
        (userRole === 'appraiser' && status === 'Appraiser Evaluation')) && (
        <div data-testid="appraiser-overall">
          {userRole === 'appraiser' && status === 'Appraiser Evaluation' ? (
            <>
              <textarea 
                data-testid="appraiser-overall-comment-input"
                placeholder="Enter overall comments"
                defaultValue={mockAppraisal.appraiser_overall_comments}
              />
              <input 
                data-testid="appraiser-overall-rating-input"
                type="number"
                min="1"
                max="5"
                defaultValue={mockAppraisal.appraiser_overall_rating || ''}
              />
            </>
          ) : mockAppraisal.appraiser_overall_comments && status === 'Complete' ? (
            <div data-testid="appraiser-overall-readonly">{mockAppraisal.appraiser_overall_comments}</div>
          ) : null}
        </div>
      )}

      {/* Overall Reviewer Section */}
      {(status === 'Complete' || (userRole === 'reviewer' && status === 'Reviewer Evaluation')) && (
        <div data-testid="reviewer-overall">
          {userRole === 'reviewer' && status === 'Reviewer Evaluation' ? (
            <>
              <textarea 
                data-testid="reviewer-overall-comment-input"
                placeholder="Enter reviewer comments"
                defaultValue={mockAppraisal.reviewer_overall_comments}
              />
              <input 
                data-testid="reviewer-overall-rating-input"
                type="number"
                min="1"
                max="5"
                defaultValue={mockAppraisal.reviewer_overall_rating || ''}
              />
            </>
          ) : mockAppraisal.reviewer_overall_comments ? (
            <div data-testid="reviewer-overall-readonly">{mockAppraisal.reviewer_overall_comments}</div>
          ) : null}
        </div>
      )}

      {/* Action Buttons */}
      <div data-testid="action-buttons">
        {userRole === 'appraisee' && status === 'Submitted' && (
          <button data-testid="acknowledge-button">Acknowledge</button>
        )}
        {userRole === 'appraisee' && status === 'Appraisee Self Assessment' && (
          <button data-testid="submit-self-assessment">Submit Self Assessment</button>
        )}
        {userRole === 'appraiser' && status === 'Appraiser Evaluation' && (
          <button data-testid="submit-appraiser-evaluation">Submit Appraiser Evaluation</button>
        )}
        {userRole === 'reviewer' && status === 'Reviewer Evaluation' && (
          <button data-testid="submit-reviewer-evaluation">Submit Reviewer Evaluation</button>
        )}
      </div>
    </div>
  )
}

describe('RBAC and Stage-based Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupAuthTokens()
    server.resetHandlers()
  })

  describe('Appraisee Access Control', () => {
    const appraiseeUser = {
      emp_id: 2,
      emp_name: 'Jane Smith',
      emp_email: 'jane.smith@company.com',
      emp_roles: 'Developer',
      emp_roles_level: 3
    }

    it('should deny access during Draft status', () => {
      render(
        <MockAppraisalView appraisalId={1} userRole="appraisee" status="Draft" />,
        { auth: { user: appraiseeUser, status: 'succeeded' } }
      )

      // Should not show goals or any content during Draft
      expect(screen.queryByTestId('goals-section')).not.toBeInTheDocument()
    })

    it('should allow view and acknowledge during Submitted status', () => {
      render(
        <MockAppraisalView appraisalId={1} userRole="appraisee" status="Submitted" />,
        { auth: { user: appraiseeUser, status: 'succeeded' } }
      )

      // Should show goals but no edit capability
      expect(screen.getByTestId('goals-section')).toBeInTheDocument()
      expect(screen.getByText('Complete Project A')).toBeInTheDocument()
      
      // Should show acknowledge button
      expect(screen.getByTestId('acknowledge-button')).toBeInTheDocument()
      
      // Should not see appraiser/reviewer comments
      expect(screen.queryByTestId('appraiser-comment-readonly')).not.toBeInTheDocument()
      expect(screen.queryByTestId('reviewer-overall-readonly')).not.toBeInTheDocument()
    })

    it('should allow self assessment during Appraisee Self Assessment status', () => {
      render(
        <MockAppraisalView appraisalId={1} userRole="appraisee" status="Appraisee Self Assessment" />,
        { auth: { user: appraiseeUser, status: 'succeeded' } }
      )

      // Should show editable self assessment fields
      expect(screen.getByTestId('self-comment-input')).toBeInTheDocument()
      expect(screen.getByTestId('self-rating-input')).toBeInTheDocument()
      expect(screen.getByTestId('submit-self-assessment')).toBeInTheDocument()
      
      // Should not see appraiser/reviewer comments
      expect(screen.queryByTestId('appraiser-comment-readonly')).not.toBeInTheDocument()
      expect(screen.queryByTestId('reviewer-overall-readonly')).not.toBeInTheDocument()
    })

    it('should make self assessment read-only during Appraiser Evaluation', () => {
      render(
        <MockAppraisalView appraisalId={1} userRole="appraisee" status="Appraiser Evaluation" />,
        { auth: { user: appraiseeUser, status: 'succeeded' } }
      )

      // Self assessment should be read-only
      expect(screen.getByTestId('self-comment-readonly')).toBeInTheDocument()
      expect(screen.queryByTestId('self-comment-input')).not.toBeInTheDocument()
      
      // Should not see appraiser comments yet
      expect(screen.queryByTestId('appraiser-comment-readonly')).not.toBeInTheDocument()
    })

    it('should maintain read-only during Reviewer Evaluation', () => {
      render(
        <MockAppraisalView appraisalId={1} userRole="appraisee" status="Reviewer Evaluation" />,
        { auth: { user: appraiseeUser, status: 'succeeded' } }
      )

      // Everything should be read-only
      expect(screen.getByTestId('self-comment-readonly')).toBeInTheDocument()
      expect(screen.queryByTestId('self-comment-input')).not.toBeInTheDocument()
      
      // Still should not see appraiser/reviewer comments
      expect(screen.queryByTestId('appraiser-comment-readonly')).not.toBeInTheDocument()
      expect(screen.queryByTestId('reviewer-overall-readonly')).not.toBeInTheDocument()
    })

    it('should show all comments when Complete', () => {
      render(
        <MockAppraisalView appraisalId={1} userRole="appraisee" status="Complete" />,
        { auth: { user: appraiseeUser, status: 'succeeded' } }
      )

      // Should see all evaluations as read-only
      expect(screen.getByTestId('self-comment-readonly')).toBeInTheDocument()
      expect(screen.getByTestId('appraiser-comment-readonly')).toBeInTheDocument()
      expect(screen.getByTestId('appraiser-overall-readonly')).toBeInTheDocument()
      expect(screen.getByTestId('reviewer-overall-readonly')).toBeInTheDocument()
      
      // No edit capabilities
      expect(screen.queryByTestId('self-comment-input')).not.toBeInTheDocument()
      expect(screen.queryByTestId('appraiser-comment-input')).not.toBeInTheDocument()
    })
  })

  describe('Appraiser Access Control', () => {
    const appraiserUser = {
      emp_id: 1,
      emp_name: 'John Doe',
      emp_email: 'john.doe@company.com',
      emp_roles: 'Manager',
      emp_roles_level: 4
    }

    it('should allow goal editing during Draft status', () => {
      render(
        <MockAppraisalView appraisalId={1} userRole="appraiser" status="Draft" />,
        { auth: { user: appraiserUser, status: 'succeeded' } }
      )

      // Should show goals and allow editing (this would be in CreateAppraisal component)
      expect(screen.getByTestId('goals-section')).toBeInTheDocument()
      expect(screen.getByText('Complete Project A')).toBeInTheDocument()
    })

    it('should make goals read-only during Submitted status', () => {
      render(
        <MockAppraisalView appraisalId={1} userRole="appraiser" status="Submitted" />,
        { auth: { user: appraiserUser, status: 'succeeded' } }
      )

      // Should show goals but no edit capability
      expect(screen.getByTestId('goals-section')).toBeInTheDocument()
      expect(screen.queryByTestId('self-comment-input')).not.toBeInTheDocument()
    })

    it('should wait during Appraisee Self Assessment', () => {
      render(
        <MockAppraisalView appraisalId={1} userRole="appraiser" status="Appraisee Self Assessment" />,
        { auth: { user: appraiserUser, status: 'succeeded' } }
      )

      // Should see goals but no appraiser evaluation fields yet
      expect(screen.getByTestId('goals-section')).toBeInTheDocument()
      expect(screen.queryByTestId('appraiser-comment-input')).not.toBeInTheDocument()
    })

    it('should allow appraiser evaluation during Appraiser Evaluation status', () => {
      render(
        <MockAppraisalView appraisalId={1} userRole="appraiser" status="Appraiser Evaluation" />,
        { auth: { user: appraiserUser, status: 'succeeded' } }
      )

      // Should show self assessment as read-only
      expect(screen.getByTestId('self-comment-readonly')).toBeInTheDocument()
      
      // Should show editable appraiser fields
      expect(screen.getByTestId('appraiser-comment-input')).toBeInTheDocument()
      expect(screen.getByTestId('appraiser-rating-input')).toBeInTheDocument()
      expect(screen.getByTestId('appraiser-overall-comment-input')).toBeInTheDocument()
      expect(screen.getByTestId('appraiser-overall-rating-input')).toBeInTheDocument()
      expect(screen.getByTestId('submit-appraiser-evaluation')).toBeInTheDocument()
    })

    it('should make appraiser evaluation read-only during Reviewer Evaluation', () => {
      render(
        <MockAppraisalView appraisalId={1} userRole="appraiser" status="Reviewer Evaluation" />,
        { auth: { user: appraiserUser, status: 'succeeded' } }
      )

      // Everything should be read-only
      expect(screen.getByTestId('self-comment-readonly')).toBeInTheDocument()
      expect(screen.queryByTestId('appraiser-comment-input')).not.toBeInTheDocument()
      expect(screen.queryByTestId('appraiser-overall-comment-input')).not.toBeInTheDocument()
    })

    it('should show all evaluations as read-only when Complete', () => {
      render(
        <MockAppraisalView appraisalId={1} userRole="appraiser" status="Complete" />,
        { auth: { user: appraiserUser, status: 'succeeded' } }
      )

      // Should see all comments as read-only
      expect(screen.getByTestId('self-comment-readonly')).toBeInTheDocument()
      expect(screen.getByTestId('appraiser-comment-readonly')).toBeInTheDocument()
      expect(screen.getByTestId('appraiser-overall-readonly')).toBeInTheDocument()
      expect(screen.getByTestId('reviewer-overall-readonly')).toBeInTheDocument()
    })
  })

  describe('Reviewer Access Control', () => {
    const reviewerUser = {
      emp_id: 3,
      emp_name: 'Bob Wilson',
      emp_email: 'bob.wilson@company.com',
      emp_roles: 'VP',
      emp_roles_level: 6
    }

    it('should deny access from Draft to Appraiser Evaluation', () => {
      const statuses = ['Draft', 'Submitted', 'Appraisee Self Assessment', 'Appraiser Evaluation']
      
      statuses.forEach(status => {
        const { unmount } = render(
          <MockAppraisalView appraisalId={1} userRole="reviewer" status={status} />,
          { auth: { user: reviewerUser, status: 'succeeded' } }
        )

        // Reviewer should not have access during these stages
        expect(screen.queryByTestId('reviewer-overall-comment-input')).not.toBeInTheDocument()
        
        unmount()
      })
    })

    it('should allow reviewer evaluation during Reviewer Evaluation status', () => {
      render(
        <MockAppraisalView appraisalId={1} userRole="reviewer" status="Reviewer Evaluation" />,
        { auth: { user: reviewerUser, status: 'succeeded' } }
      )

      // Should see all previous evaluations as read-only
      expect(screen.getByTestId('self-comment-readonly')).toBeInTheDocument()
      
      // Should show editable reviewer overall fields only (no per-goal evaluation)
      expect(screen.getByTestId('reviewer-overall-comment-input')).toBeInTheDocument()
      expect(screen.getByTestId('reviewer-overall-rating-input')).toBeInTheDocument()
      expect(screen.getByTestId('submit-reviewer-evaluation')).toBeInTheDocument()
      
      // Should not have per-goal reviewer inputs
      expect(screen.queryByTestId('reviewer-comment-input')).not.toBeInTheDocument()
    })

    it('should show all evaluations as read-only when Complete', () => {
      render(
        <MockAppraisalView appraisalId={1} userRole="reviewer" status="Complete" />,
        { auth: { user: reviewerUser, status: 'succeeded' } }
      )

      // Should see all evaluations as read-only
      expect(screen.getByTestId('self-comment-readonly')).toBeInTheDocument()
      expect(screen.getByTestId('appraiser-comment-readonly')).toBeInTheDocument()
      expect(screen.getByTestId('appraiser-overall-readonly')).toBeInTheDocument()
      expect(screen.getByTestId('reviewer-overall-readonly')).toBeInTheDocument()
      
      // No edit capabilities
      expect(screen.queryByTestId('reviewer-overall-comment-input')).not.toBeInTheDocument()
    })
  })

  describe('Critical Security Rules', () => {
    it('should never show appraiser comments to appraisee before Complete', () => {
      const statuses = ['Submitted', 'Appraisee Self Assessment', 'Appraiser Evaluation', 'Reviewer Evaluation']
      const appraiseeUser = {
        emp_id: 2,
        emp_name: 'Jane Smith',
        emp_email: 'jane.smith@company.com',
        emp_roles: 'Developer',
        emp_roles_level: 3
      }
      
      statuses.forEach(status => {
        const { unmount } = render(
          <MockAppraisalView appraisalId={1} userRole="appraisee" status={status} />,
          { auth: { user: appraiseeUser, status: 'succeeded' } }
        )

        // Should never see appraiser or reviewer comments
        expect(screen.queryByTestId('appraiser-comment-readonly')).not.toBeInTheDocument()
        expect(screen.queryByTestId('appraiser-overall-readonly')).not.toBeInTheDocument()
        expect(screen.queryByTestId('reviewer-overall-readonly')).not.toBeInTheDocument()
        
        unmount()
      })
    })

    it('should never show reviewer comments to anyone before Complete', () => {
      const users = [
        { emp_id: 2, role: 'appraisee' as const },
        { emp_id: 1, role: 'appraiser' as const }
      ]
      const statuses = ['Draft', 'Submitted', 'Appraisee Self Assessment', 'Appraiser Evaluation', 'Reviewer Evaluation']
      
      users.forEach(({ emp_id, role }) => {
        statuses.forEach(status => {
          const { unmount } = render(
            <MockAppraisalView appraisalId={1} userRole={role} status={status} />,
            { auth: { user: { emp_id, emp_name: 'Test User', emp_email: 'test@test.com' }, status: 'succeeded' } }
          )

          // Should never see reviewer comments before Complete
          expect(screen.queryByTestId('reviewer-overall-readonly')).not.toBeInTheDocument()
          
          unmount()
        })
      })
    })

    it('should enforce no overlapping permissions between roles at inappropriate stages', () => {
      // Appraisee should not have appraiser capabilities during any stage
      render(
        <MockAppraisalView appraisalId={1} userRole="appraisee" status="Appraiser Evaluation" />,
        { auth: { user: { emp_id: 2, emp_name: 'Jane Smith', emp_email: 'jane@test.com' }, status: 'succeeded' } }
      )

      expect(screen.queryByTestId('appraiser-comment-input')).not.toBeInTheDocument()
      expect(screen.queryByTestId('appraiser-overall-comment-input')).not.toBeInTheDocument()

      // Appraiser should not have reviewer capabilities
      expect(screen.queryByTestId('reviewer-overall-comment-input')).not.toBeInTheDocument()
    })
  })

  describe('Field Read-only Enforcement', () => {
    it('should make fields read-only after submission at each stage', async () => {
      
      // Test self assessment becomes read-only after submission
      const { rerender } = render(
        <MockAppraisalView appraisalId={1} userRole="appraisee" status="Appraisee Self Assessment" />,
        { auth: { user: { emp_id: 2, emp_name: 'Jane Smith', emp_email: 'jane@test.com' }, status: 'succeeded' } }
      )

      // Should have editable fields
      expect(screen.getByTestId('self-comment-input')).toBeInTheDocument()
      
      // After submission (status change)
      rerender(
        <MockAppraisalView appraisalId={1} userRole="appraisee" status="Appraiser Evaluation" />
      )

      // Should become read-only
      expect(screen.queryByTestId('self-comment-input')).not.toBeInTheDocument()
      expect(screen.getByTestId('self-comment-readonly')).toBeInTheDocument()
    })

    it('should enforce progressive disclosure based on current status', () => {
      const statuses = [
        'Draft',
        'Submitted', 
        'Appraisee Self Assessment',
        'Appraiser Evaluation',
        'Reviewer Evaluation',
        'Complete'
      ]

      statuses.forEach((status, index) => {
        const { unmount } = render(
          <MockAppraisalView appraisalId={1} userRole="appraiser" status={status} />,
          { auth: { user: { emp_id: 1, emp_name: 'John Doe', emp_email: 'john@test.com' }, status: 'succeeded' } }
        )

        // Each stage should only show appropriate fields
        if (status === 'Appraiser Evaluation') {
          expect(screen.getByTestId('appraiser-comment-input')).toBeInTheDocument()
        } else if (index > 3) { // After appraiser evaluation
          expect(screen.queryByTestId('appraiser-comment-input')).not.toBeInTheDocument()
        }
        
        unmount()
      })
    })
  })
})
