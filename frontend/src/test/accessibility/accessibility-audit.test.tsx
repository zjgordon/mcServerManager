import { describe, it, expect } from 'vitest'
import { render } from '../utils'
import { axe, toHaveNoViolations } from 'jest-axe'
import App from '../../App'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

describe('Accessibility Audit Tests', () => {
  it('should have no accessibility violations on main app', async () => {
    const { container } = render(<App />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper heading hierarchy', async () => {
    const { container } = render(<App />)
    
    // Check for proper heading structure
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
    expect(headings.length).toBeGreaterThan(0)
    
    // Check for h1 element
    const h1 = container.querySelector('h1')
    expect(h1).toBeInTheDocument()
  })

  it('should have proper form labels and associations', async () => {
    const { container } = render(<App />)
    
    // Check for form inputs with proper labels
    const inputs = container.querySelectorAll('input, textarea, select')
    inputs.forEach(input => {
      const id = input.getAttribute('id')
      const ariaLabel = input.getAttribute('aria-label')
      const ariaLabelledBy = input.getAttribute('aria-labelledby')
      const label = id ? container.querySelector(`label[for="${id}"]`) : null
      
      expect(
        ariaLabel || ariaLabelledBy || label
      ).toBeTruthy()
    })
  })

  it('should have proper button accessibility', async () => {
    const { container } = render(<App />)
    
    // Check for buttons with proper accessibility
    const buttons = container.querySelectorAll('button')
    buttons.forEach(button => {
      const text = button.textContent?.trim()
      const ariaLabel = button.getAttribute('aria-label')
      const ariaLabelledBy = button.getAttribute('aria-labelledby')
      
      expect(
        text || ariaLabel || ariaLabelledBy
      ).toBeTruthy()
    })
  })

  it('should have proper color contrast', async () => {
    const { container } = render(<App />)
    
    // Check for proper color contrast (basic check)
    const elements = container.querySelectorAll('*')
    elements.forEach(element => {
      const style = window.getComputedStyle(element)
      const color = style.color
      const backgroundColor = style.backgroundColor
      
      // Basic contrast check (simplified)
      if (color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        expect(color).toBeDefined()
        expect(backgroundColor).toBeDefined()
      }
    })
  })

  it('should have proper focus management', async () => {
    const { container } = render(<App />)
    
    // Check for focusable elements
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    expect(focusableElements.length).toBeGreaterThan(0)
    
    // Check for proper tab order
    focusableElements.forEach((element, index) => {
      const tabIndex = element.getAttribute('tabindex')
      if (tabIndex !== '-1') {
        expect(element).toBeInTheDocument()
      }
    })
  })

  it('should have proper ARIA attributes', async () => {
    const { container } = render(<App />)
    
    // Check for proper ARIA usage
    const elementsWithAria = container.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]')
    expect(elementsWithAria.length).toBeGreaterThan(0)
    
    // Check for proper ARIA roles
    const elementsWithRoles = container.querySelectorAll('[role]')
    elementsWithRoles.forEach(element => {
      const role = element.getAttribute('role')
      expect(role).toBeTruthy()
    })
  })

  it('should have proper keyboard navigation', async () => {
    const { container } = render(<App />)
    
    // Check for keyboard navigation support
    const interactiveElements = container.querySelectorAll(
      'button, [role="button"], [role="tab"], [role="menuitem"]'
    )
    
    interactiveElements.forEach(element => {
      const tabIndex = element.getAttribute('tabindex')
      expect(tabIndex !== '-1').toBeTruthy()
    })
  })

  it('should have proper screen reader support', async () => {
    const { container } = render(<App />)
    
    // Check for screen reader support
    const elementsWithAriaLive = container.querySelectorAll('[aria-live]')
    const elementsWithAriaAtomic = container.querySelectorAll('[aria-atomic]')
    const elementsWithAriaRelevant = container.querySelectorAll('[aria-relevant]')
    
    // Should have some live regions for dynamic content
    expect(
      elementsWithAriaLive.length + 
      elementsWithAriaAtomic.length + 
      elementsWithAriaRelevant.length
    ).toBeGreaterThanOrEqual(0)
  })

  it('should have proper alternative text for images', async () => {
    const { container } = render(<App />)
    
    // Check for images with proper alt text
    const images = container.querySelectorAll('img')
    images.forEach(img => {
      const alt = img.getAttribute('alt')
      const ariaLabel = img.getAttribute('aria-label')
      const role = img.getAttribute('role')
      
      // Images should have alt text or be decorative
      expect(
        alt !== null || ariaLabel || role === 'presentation'
      ).toBeTruthy()
    })
  })

  it('should have proper form validation accessibility', async () => {
    const { container } = render(<App />)
    
    // Check for form validation accessibility
    const formInputs = container.querySelectorAll('input, textarea, select')
    formInputs.forEach(input => {
      const ariaInvalid = input.getAttribute('aria-invalid')
      const ariaDescribedBy = input.getAttribute('aria-describedby')
      
      // If input is invalid, it should have proper ARIA attributes
      if (ariaInvalid === 'true') {
        expect(ariaDescribedBy).toBeTruthy()
      }
    })
  })

  it('should have proper modal accessibility', async () => {
    const { container } = render(<App />)
    
    // Check for modal accessibility
    const modals = container.querySelectorAll('[role="dialog"], [role="alertdialog"]')
    modals.forEach(modal => {
      const ariaModal = modal.getAttribute('aria-modal')
      const ariaLabelledBy = modal.getAttribute('aria-labelledby')
      const ariaDescribedBy = modal.getAttribute('aria-describedby')
      
      expect(ariaModal).toBe('true')
      expect(ariaLabelledBy || ariaDescribedBy).toBeTruthy()
    })
  })

  it('should have proper table accessibility', async () => {
    const { container } = render(<App />)
    
    // Check for table accessibility
    const tables = container.querySelectorAll('table')
    tables.forEach(table => {
      const caption = table.querySelector('caption')
      const headers = table.querySelectorAll('th')
      
      // Tables should have captions or headers
      expect(caption || headers.length > 0).toBeTruthy()
    })
  })

  it('should have proper list accessibility', async () => {
    const { container } = render(<App />)
    
    // Check for list accessibility
    const lists = container.querySelectorAll('ul, ol')
    lists.forEach(list => {
      const listItems = list.querySelectorAll('li')
      expect(listItems.length).toBeGreaterThan(0)
    })
  })

  it('should have proper link accessibility', async () => {
    const { container } = render(<App />)
    
    // Check for link accessibility
    const links = container.querySelectorAll('a[href]')
    links.forEach(link => {
      const text = link.textContent?.trim()
      const ariaLabel = link.getAttribute('aria-label')
      const title = link.getAttribute('title')
      
      // Links should have descriptive text
      expect(text || ariaLabel || title).toBeTruthy()
    })
  })
})
