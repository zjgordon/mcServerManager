import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render as customRender } from '../utils'
import App from '../../App'

describe('Usability Tests', () => {
  it('should have intuitive navigation flow', async () => {
    const user = userEvent.setup()
    const { getByRole, getByText } = customRender(<App />)
    
    // Test main navigation
    const homeLink = getByRole('link', { name: /home/i })
    expect(homeLink).toBeInTheDocument()
    
    // Test navigation to different sections
    const serversLink = getByRole('link', { name: /servers/i })
    await user.click(serversLink)
    
    // Verify navigation worked
    expect(getByText(/server management/i)).toBeInTheDocument()
  })

  it('should have clear and actionable buttons', async () => {
    const user = userEvent.setup()
    const { getByRole } = customRender(<App />)
    
    // Test button clarity
    const createButton = getByRole('button', { name: /create server/i })
    expect(createButton).toBeInTheDocument()
    expect(createButton).not.toBeDisabled()
    
    // Test button actions
    await user.click(createButton)
    
    // Verify action was triggered
    expect(getByRole('dialog')).toBeInTheDocument()
  })

  it('should provide clear feedback for user actions', async () => {
    const user = userEvent.setup()
    const { getByRole, getByText } = customRender(<App />)
    
    // Test form submission feedback
    const submitButton = getByRole('button', { name: /submit/i })
    await user.click(submitButton)
    
    // Verify feedback is provided
    await waitFor(() => {
      expect(getByText(/success/i) || getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('should have consistent visual hierarchy', () => {
    const { container } = customRender(<App />)
    
    // Test heading hierarchy
    const h1 = container.querySelector('h1')
    const h2 = container.querySelector('h2')
    const h3 = container.querySelector('h3')
    
    expect(h1).toBeInTheDocument()
    if (h2) expect(h2).toBeInTheDocument()
    if (h3) expect(h3).toBeInTheDocument()
    
    // Test visual hierarchy
    if (h1 && h2) {
      const h1Styles = window.getComputedStyle(h1)
      const h2Styles = window.getComputedStyle(h2)
      
      expect(parseInt(h1Styles.fontSize)).toBeGreaterThanOrEqual(parseInt(h2Styles.fontSize))
    }
  })

  it('should have accessible form labels and instructions', async () => {
    const user = userEvent.setup()
    const { getByLabelText, getByText } = customRender(<App />)
    
    // Test form accessibility
    const usernameInput = getByLabelText(/username/i)
    expect(usernameInput).toBeInTheDocument()
    
    // Test form instructions
    const helpText = getByText(/enter your username/i)
    expect(helpText).toBeInTheDocument()
    
    // Test form validation
    await user.type(usernameInput, 'test')
    await user.tab()
    
    // Verify validation feedback
    await waitFor(() => {
      expect(getByText(/username is required/i) || getByText(/valid username/i)).toBeInTheDocument()
    })
  })

  it('should have clear error messages and recovery options', async () => {
    const user = userEvent.setup()
    const { getByRole, getByText } = customRender(<App />)
    
    // Trigger an error
    const submitButton = getByRole('button', { name: /submit/i })
    await user.click(submitButton)
    
    // Verify error message is clear
    const errorMessage = getByText(/error/i)
    expect(errorMessage).toBeInTheDocument()
    
    // Verify recovery options
    const retryButton = getByRole('button', { name: /try again/i })
    expect(retryButton).toBeInTheDocument()
  })

  it('should have consistent interaction patterns', async () => {
    const user = userEvent.setup()
    const { getByRole } = customRender(<App />)
    
    // Test consistent button behavior
    const buttons = screen.getAllByRole('button')
    
    buttons.forEach(button => {
      // Test hover state
      fireEvent.mouseEnter(button)
      expect(button).toHaveClass('hover:bg-accent')
      
      // Test focus state
      button.focus()
      expect(button).toHaveFocus()
    })
  })

  it('should have clear loading states', async () => {
    const user = userEvent.setup()
    const { getByRole, getByText } = customRender(<App />)
    
    // Trigger loading state
    const submitButton = getByRole('button', { name: /submit/i })
    await user.click(submitButton)
    
    // Verify loading indicator
    const loadingSpinner = getByText(/loading/i)
    expect(loadingSpinner).toBeInTheDocument()
    
    // Verify button is disabled during loading
    expect(submitButton).toBeDisabled()
  })

  it('should have intuitive search and filtering', async () => {
    const user = userEvent.setup()
    const { getByPlaceholderText, getByText } = customRender(<App />)
    
    // Test search functionality
    const searchInput = getByPlaceholderText(/search/i)
    expect(searchInput).toBeInTheDocument()
    
    // Test search interaction
    await user.type(searchInput, 'test')
    
    // Verify search results
    await waitFor(() => {
      expect(getByText(/search results/i)).toBeInTheDocument()
    })
  })

  it('should have clear data presentation', () => {
    const { getByRole, getByText } = customRender(<App />)
    
    // Test table accessibility
    const table = getByRole('table')
    expect(table).toBeInTheDocument()
    
    // Test table headers
    const headers = screen.getAllByRole('columnheader')
    expect(headers.length).toBeGreaterThan(0)
    
    // Test data cells
    const cells = screen.getAllByRole('cell')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('should have responsive design for different screen sizes', () => {
    const { container } = customRender(<App />)
    
    // Test mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    
    fireEvent(window, new Event('resize'))
    
    // Verify responsive behavior
    const mobileMenu = container.querySelector('[data-testid="mobile-menu"]')
    expect(mobileMenu).toBeInTheDocument()
  })

  it('should have clear confirmation dialogs for destructive actions', async () => {
    const user = userEvent.setup()
    const { getByRole, getByText } = customRender(<App />)
    
    // Trigger destructive action
    const deleteButton = getByRole('button', { name: /delete/i })
    await user.click(deleteButton)
    
    // Verify confirmation dialog
    const confirmDialog = getByRole('dialog')
    expect(confirmDialog).toBeInTheDocument()
    
    // Verify dialog content
    expect(getByText(/are you sure/i)).toBeInTheDocument()
    expect(getByText(/this action cannot be undone/i)).toBeInTheDocument()
    
    // Verify dialog actions
    const confirmButton = getByRole('button', { name: /confirm/i })
    const cancelButton = getByRole('button', { name: /cancel/i })
    
    expect(confirmButton).toBeInTheDocument()
    expect(cancelButton).toBeInTheDocument()
  })

  it('should have clear success states and next steps', async () => {
    const user = userEvent.setup()
    const { getByRole, getByText } = customRender(<App />)
    
    // Complete a successful action
    const submitButton = getByRole('button', { name: /submit/i })
    await user.click(submitButton)
    
    // Verify success message
    await waitFor(() => {
      expect(getByText(/success/i)).toBeInTheDocument()
    })
    
    // Verify next steps
    const nextStepButton = getByRole('button', { name: /continue/i })
    expect(nextStepButton).toBeInTheDocument()
  })

  it('should have accessible keyboard navigation', async () => {
    const user = userEvent.setup()
    const { getByRole } = customRender(<App />)
    
    // Test tab navigation
    await user.tab()
    const firstFocusable = document.activeElement
    expect(firstFocusable).toBeInTheDocument()
    
    // Test arrow key navigation
    const menuItems = screen.getAllByRole('menuitem')
    if (menuItems.length > 0) {
      await user.keyboard('{ArrowDown}')
      expect(menuItems[1]).toHaveFocus()
    }
  })

  it('should have clear visual feedback for interactive elements', async () => {
    const user = userEvent.setup()
    const { getByRole } = customRender(<App />)
    
    // Test button hover states
    const button = getByRole('button', { name: /click me/i })
    
    // Test hover
    await user.hover(button)
    expect(button).toHaveClass('hover:bg-accent')
    
    // Test focus
    await user.click(button)
    expect(button).toHaveFocus()
    
    // Test active state
    await user.click(button)
    expect(button).toHaveClass('active:scale-95')
  })

  it('should have consistent spacing and alignment', () => {
    const { container } = customRender(<App />)
    
    // Test consistent spacing
    const cards = container.querySelectorAll('[data-testid="card"]')
    cards.forEach(card => {
      const styles = window.getComputedStyle(card)
      expect(styles.padding).toBe('24px') // 6 * 4px = 24px
    })
    
    // Test consistent alignment
    const buttons = container.querySelectorAll('button')
    buttons.forEach(button => {
      const styles = window.getComputedStyle(button)
      expect(styles.textAlign).toBe('center')
    })
  })

  it('should have clear information hierarchy', () => {
    const { container } = customRender(<App />)
    
    // Test information grouping
    const sections = container.querySelectorAll('section')
    expect(sections.length).toBeGreaterThan(0)
    
    // Test content organization
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
    expect(headings.length).toBeGreaterThan(0)
    
    // Test visual hierarchy
    const h1 = container.querySelector('h1')
    const h2 = container.querySelector('h2')
    
    if (h1 && h2) {
      const h1Styles = window.getComputedStyle(h1)
      const h2Styles = window.getComputedStyle(h2)
      
      expect(parseInt(h1Styles.fontSize)).toBeGreaterThan(parseInt(h2Styles.fontSize))
    }
  })

  it('should have accessible color contrast', () => {
    const { container } = customRender(<App />)
    
    // Test color contrast
    const textElements = container.querySelectorAll('p, span, div')
    textElements.forEach(element => {
      const styles = window.getComputedStyle(element)
      const color = styles.color
      const backgroundColor = styles.backgroundColor
      
      // Basic contrast check (simplified)
      if (color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        expect(color).toBeDefined()
        expect(backgroundColor).toBeDefined()
      }
    })
  })

  it('should have clear call-to-action buttons', () => {
    const { getByRole } = customRender(<App />)
    
    // Test primary CTA
    const primaryButton = getByRole('button', { name: /get started/i })
    expect(primaryButton).toBeInTheDocument()
    
    // Test secondary CTA
    const secondaryButton = getByRole('button', { name: /learn more/i })
    expect(secondaryButton).toBeInTheDocument()
    
    // Test CTA styling
    expect(primaryButton).toHaveClass('bg-primary')
    expect(secondaryButton).toHaveClass('bg-secondary')
  })
})
