import React from 'react';
import { render, screen, fireEvent, waitFor, userEvent, vi } from '../../../test';
import EnhancedCard from '../enhanced-card';

describe('EnhancedCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders card with default props', () => {
    render(<EnhancedCard>Card content</EnhancedCard>);

    const card = screen.getByText('Card content');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('card');
  });

  it('renders card with different variants', () => {
    const { rerender } = render(<EnhancedCard variant="default">Default</EnhancedCard>);
    expect(screen.getByText('Default')).toHaveClass('card-default');

    rerender(<EnhancedCard variant="outlined">Outlined</EnhancedCard>);
    expect(screen.getByText('Outlined')).toHaveClass('card-outlined');

    rerender(<EnhancedCard variant="elevated">Elevated</EnhancedCard>);
    expect(screen.getByText('Elevated')).toHaveClass('card-elevated');

    rerender(<EnhancedCard variant="filled">Filled</EnhancedCard>);
    expect(screen.getByText('Filled')).toHaveClass('card-filled');
  });

  it('renders card with different sizes', () => {
    const { rerender } = render(<EnhancedCard size="sm">Small</EnhancedCard>);
    expect(screen.getByText('Small')).toHaveClass('card-sm');

    rerender(<EnhancedCard size="md">Medium</EnhancedCard>);
    expect(screen.getByText('Medium')).toHaveClass('card-md');

    rerender(<EnhancedCard size="lg">Large</EnhancedCard>);
    expect(screen.getByText('Large')).toHaveClass('card-lg');
  });

  it('shows card header when provided', () => {
    render(
      <EnhancedCard header="Card Header">
        Card content
      </EnhancedCard>
    );

    expect(screen.getByText('Card Header')).toBeInTheDocument();
    expect(screen.getByText('Card Header')).toHaveClass('card-header');
  });

  it('shows card footer when provided', () => {
    render(
      <EnhancedCard footer="Card Footer">
        Card content
      </EnhancedCard>
    );

    expect(screen.getByText('Card Footer')).toBeInTheDocument();
    expect(screen.getByText('Card Footer')).toHaveClass('card-footer');
  });

  it('shows card title when provided', () => {
    render(
      <EnhancedCard title="Card Title">
        Card content
      </EnhancedCard>
    );

    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card Title')).toHaveClass('card-title');
  });

  it('shows card subtitle when provided', () => {
    render(
      <EnhancedCard title="Card Title" subtitle="Card Subtitle">
        Card content
      </EnhancedCard>
    );

    expect(screen.getByText('Card Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Card Subtitle')).toHaveClass('card-subtitle');
  });

  it('shows card actions when provided', () => {
    const actions = (
      <div>
        <button>Action 1</button>
        <button>Action 2</button>
      </div>
    );

    render(
      <EnhancedCard actions={actions}>
        Card content
      </EnhancedCard>
    );

    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
  });

  it('handles click events when clickable', () => {
    const handleClick = vi.fn();
    render(
      <EnhancedCard clickable onClick={handleClick}>
        Clickable card
      </EnhancedCard>
    );

    const card = screen.getByText('Clickable card');
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows hover effects when hoverable', () => {
    render(<EnhancedCard hoverable>Hoverable card</EnhancedCard>);

    const card = screen.getByText('Hoverable card');
    expect(card).toHaveClass('card-hoverable');
  });

  it('shows loading state', () => {
    render(<EnhancedCard loading>Loading card</EnhancedCard>);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<EnhancedCard error="Error message">Error card</EnhancedCard>);

    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Error card')).toHaveClass('card-error');
  });

  it('shows success state', () => {
    render(<EnhancedCard success>Success card</EnhancedCard>);

    expect(screen.getByText('Success card')).toHaveClass('card-success');
  });

  it('shows warning state', () => {
    render(<EnhancedCard warning>Warning card</EnhancedCard>);

    expect(screen.getByText('Warning card')).toHaveClass('card-warning');
  });

  it('shows info state', () => {
    render(<EnhancedCard info>Info card</EnhancedCard>);

    expect(screen.getByText('Info card')).toHaveClass('card-info');
  });

  it('handles collapsible content', async () => {
    const user = userEvent.setup();
    render(
      <EnhancedCard collapsible>
        <div>Collapsible content</div>
      </EnhancedCard>
    );

    const toggleButton = screen.getByLabelText('Toggle card content');
    expect(toggleButton).toBeInTheDocument();

    await user.click(toggleButton);
    expect(screen.queryByText('Collapsible content')).not.toBeInTheDocument();

    await user.click(toggleButton);
    expect(screen.getByText('Collapsible content')).toBeInTheDocument();
  });

  it('starts expanded when collapsible and expanded', () => {
    render(
      <EnhancedCard collapsible expanded>
        <div>Expanded content</div>
      </EnhancedCard>
    );

    expect(screen.getByText('Expanded content')).toBeInTheDocument();
  });

  it('starts collapsed when collapsible and not expanded', () => {
    render(
      <EnhancedCard collapsible expanded={false}>
        <div>Collapsed content</div>
      </EnhancedCard>
    );

    expect(screen.queryByText('Collapsed content')).not.toBeInTheDocument();
  });

  it('handles expand/collapse callbacks', async () => {
    const user = userEvent.setup();
    const handleExpand = vi.fn();
    const handleCollapse = vi.fn();
    
    render(
      <EnhancedCard 
        collapsible 
        onExpand={handleExpand} 
        onCollapse={handleCollapse}
      >
        <div>Content</div>
      </EnhancedCard>
    );

    const toggleButton = screen.getByLabelText('Toggle card content');
    
    await user.click(toggleButton);
    expect(handleCollapse).toHaveBeenCalledTimes(1);

    await user.click(toggleButton);
    expect(handleExpand).toHaveBeenCalledTimes(1);
  });

  it('shows card image when provided', () => {
    render(
      <EnhancedCard 
        image="https://example.com/image.jpg"
        imageAlt="Card image"
      >
        Card with image
      </EnhancedCard>
    );

    const image = screen.getByAltText('Card image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('shows card badge when provided', () => {
    render(
      <EnhancedCard badge="New">
        Card with badge
      </EnhancedCard>
    );

    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('New')).toHaveClass('card-badge');
  });

  it('shows card status when provided', () => {
    render(
      <EnhancedCard status="active">
        Card with status
      </EnhancedCard>
    );

    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('active')).toHaveClass('card-status');
  });

  it('applies custom className', () => {
    render(<EnhancedCard className="custom-class">Custom card</EnhancedCard>);

    const card = screen.getByText('Custom card');
    expect(card).toHaveClass('custom-class');
  });

  it('applies custom styles', () => {
    render(<EnhancedCard style={{ backgroundColor: 'red' }}>Styled card</EnhancedCard>);

    const card = screen.getByText('Styled card');
    expect(card).toHaveStyle('background-color: red');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<EnhancedCard ref={ref}>Ref card</EnhancedCard>);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveTextContent('Ref card');
  });

  it('handles keyboard events when clickable', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <EnhancedCard clickable onClick={handleClick}>
        Keyboard card
      </EnhancedCard>
    );

    const card = screen.getByText('Keyboard card');
    card.focus();

    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);

    await user.keyboard(' ');
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('shows focus outline when clickable and focused', () => {
    render(<EnhancedCard clickable>Focusable card</EnhancedCard>);

    const card = screen.getByText('Focusable card');
    fireEvent.focus(card);

    expect(card).toHaveClass('card-focused');
  });

  it('handles mouse events', () => {
    const handleMouseEnter = vi.fn();
    const handleMouseLeave = vi.fn();
    render(
      <EnhancedCard onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        Mouse card
      </EnhancedCard>
    );

    const card = screen.getByText('Mouse card');
    fireEvent.mouseEnter(card);
    expect(handleMouseEnter).toHaveBeenCalledTimes(1);

    fireEvent.mouseLeave(card);
    expect(handleMouseLeave).toHaveBeenCalledTimes(1);
  });

  it('shows different card states', () => {
    const { rerender } = render(<EnhancedCard>Normal</EnhancedCard>);
    expect(screen.getByText('Normal')).not.toHaveClass('card-loading');

    rerender(<EnhancedCard loading>Loading</EnhancedCard>);
    expect(screen.getByText('Loading')).toHaveClass('card-loading');

    rerender(<EnhancedCard disabled>Disabled</EnhancedCard>);
    expect(screen.getByText('Disabled')).toHaveClass('card-disabled');
  });

  it('handles custom data attributes', () => {
    render(<EnhancedCard data-testid="custom-card" data-custom="value">Custom</EnhancedCard>);

    const card = screen.getByTestId('custom-card');
    expect(card).toHaveAttribute('data-custom', 'value');
  });

  it('shows animation classes when animated', () => {
    render(<EnhancedCard animated>Animated</EnhancedCard>);

    const card = screen.getByText('Animated');
    expect(card).toHaveClass('card-animated');
  });

  it('handles full width', () => {
    render(<EnhancedCard fullWidth>Full Width</EnhancedCard>);

    const card = screen.getByText('Full Width');
    expect(card).toHaveClass('card-full-width');
  });

  it('shows card with all props combined', () => {
    const actions = <button>Action</button>;
    render(
      <EnhancedCard
        variant="elevated"
        size="lg"
        title="Complete Card"
        subtitle="With all features"
        header="Header"
        footer="Footer"
        actions={actions}
        badge="New"
        status="active"
        hoverable
        clickable
        animated
      >
        Complete card content
      </EnhancedCard>
    );

    expect(screen.getByText('Complete Card')).toBeInTheDocument();
    expect(screen.getByText('With all features')).toBeInTheDocument();
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('Complete card content')).toBeInTheDocument();
  });

  it('handles empty content gracefully', () => {
    render(<EnhancedCard></EnhancedCard>);

    const card = screen.getByRole('region');
    expect(card).toBeEmptyDOMElement();
  });

  it('shows accessibility attributes', () => {
    render(
      <EnhancedCard 
        aria-label="Custom card"
        aria-describedby="description"
        role="region"
      >
        Accessible card
      </EnhancedCard>
    );

    const card = screen.getByRole('region');
    expect(card).toHaveAttribute('aria-label', 'Custom card');
    expect(card).toHaveAttribute('aria-describedby', 'description');
  });

  it('handles long content', () => {
    const longContent = 'This is a very long content that should wrap properly within the card boundaries and not overflow';
    render(<EnhancedCard>{longContent}</EnhancedCard>);

    const card = screen.getByText(longContent);
    expect(card).toHaveTextContent(longContent);
  });

  it('shows loading spinner when loading', () => {
    render(<EnhancedCard loading>Loading card</EnhancedCard>);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('disables interactions when disabled', () => {
    const handleClick = vi.fn();
    render(
      <EnhancedCard clickable disabled onClick={handleClick}>
        Disabled card
      </EnhancedCard>
    );

    const card = screen.getByText('Disabled card');
    fireEvent.click(card);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows different card layouts', () => {
    const { rerender } = render(<EnhancedCard layout="vertical">Vertical</EnhancedCard>);
    expect(screen.getByText('Vertical')).toHaveClass('card-vertical');

    rerender(<EnhancedCard layout="horizontal">Horizontal</EnhancedCard>);
    expect(screen.getByText('Horizontal')).toHaveClass('card-horizontal');
  });
});
