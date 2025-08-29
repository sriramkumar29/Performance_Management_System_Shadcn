import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import CreateAppraisalButton from './CreateAppraisalButton'

const renderCreateAppraisalButton = () => {
  return render(
    <BrowserRouter>
      <CreateAppraisalButton />
    </BrowserRouter>
  )
}

describe('CreateAppraisalButton', () => {
  it('should render create appraisal button', () => {
    renderCreateAppraisalButton()
    
    expect(screen.getByText('Create New Appraisal')).toBeInTheDocument()
  })

  it('should navigate to create appraisal page when clicked', () => {
    renderCreateAppraisalButton()
    
    const button = screen.getByText('Create New Appraisal')
    fireEvent.click(button)
    
    expect(window.location.pathname).toBe('/appraisal/create')
  })

  it('should have proper styling classes', () => {
    renderCreateAppraisalButton()
    
    const button = screen.getByText('Create New Appraisal')
    expect(button).toHaveClass('btn-primary')
  })
})
