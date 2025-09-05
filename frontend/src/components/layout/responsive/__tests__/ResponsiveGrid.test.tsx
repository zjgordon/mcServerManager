import React from 'react';
import { render, screen } from '@testing-library/react';
import ResponsiveGrid from '../ResponsiveGrid';

describe('ResponsiveGrid', () => {
  it('renders children correctly', () => {
    render(
      <ResponsiveGrid>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </ResponsiveGrid>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });

  it('applies default grid classes', () => {
    const { container } = render(
      <ResponsiveGrid>
        <div>Child</div>
      </ResponsiveGrid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4', 'gap-4');
  });

  it('applies custom column configuration', () => {
    const { container } = render(
      <ResponsiveGrid cols={{ default: 2, sm: 3, md: 4, lg: 6 }}>
        <div>Child</div>
      </ResponsiveGrid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveClass('grid', 'grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-4', 'lg:grid-cols-6');
  });

  it('applies custom gap size', () => {
    const { container } = render(
      <ResponsiveGrid gap="lg">
        <div>Child</div>
      </ResponsiveGrid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveClass('gap-6');
  });

  it('applies custom className', () => {
    const { container } = render(
      <ResponsiveGrid className="custom-class">
        <div>Child</div>
      </ResponsiveGrid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveClass('custom-class');
  });

  it('uses auto-fit when enabled', () => {
    const { container } = render(
      <ResponsiveGrid autoFit minWidth="200px">
        <div>Child</div>
      </ResponsiveGrid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveClass('grid-cols-[repeat(auto-fit,minmax(200px,1fr))]');
  });

  it('applies custom minWidth for auto-fit', () => {
    const { container } = render(
      <ResponsiveGrid autoFit minWidth="300px">
        <div>Child</div>
      </ResponsiveGrid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveClass('grid-cols-[repeat(auto-fit,minmax(300px,1fr))]');
  });

  it('handles empty children', () => {
    const { container } = render(<ResponsiveGrid />);
    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toBeInTheDocument();
    expect(gridElement.children).toHaveLength(0);
  });

  it('handles multiple children', () => {
    render(
      <ResponsiveGrid>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <div data-testid="child-3">Child 3</div>
        <div data-testid="child-4">Child 4</div>
      </ResponsiveGrid>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
    expect(screen.getByTestId('child-4')).toBeInTheDocument();
  });

  it('applies all gap sizes correctly', () => {
    const gapSizes = ['sm', 'md', 'lg', 'xl'] as const;
    
    gapSizes.forEach(gap => {
      const { container } = render(
        <ResponsiveGrid gap={gap}>
          <div>Child</div>
        </ResponsiveGrid>
      );

      const gridElement = container.firstChild as HTMLElement;
      const expectedGapClass = gap === 'sm' ? 'gap-2' : 
                              gap === 'md' ? 'gap-4' : 
                              gap === 'lg' ? 'gap-6' : 'gap-8';
      expect(gridElement).toHaveClass(expectedGapClass);
    });
  });

  it('handles partial column configuration', () => {
    const { container } = render(
      <ResponsiveGrid cols={{ default: 1, lg: 3 }}>
        <div>Child</div>
      </ResponsiveGrid>
    );

    const gridElement = container.firstChild as HTMLElement;
    expect(gridElement).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-3');
    expect(gridElement).not.toHaveClass('sm:grid-cols-2', 'md:grid-cols-3');
  });
});
