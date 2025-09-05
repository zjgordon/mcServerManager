import React from 'react';
import { render, screen, waitFor, vi } from '../../../test';
import DataVisualization from '../data-visualization';

const mockData = [
  { label: 'January', value: 100, color: '#3b82f6' },
  { label: 'February', value: 150, color: '#ef4444' },
  { label: 'March', value: 200, color: '#10b981' },
  { label: 'April', value: 175, color: '#f59e0b' },
  { label: 'May', value: 225, color: '#8b5cf6' },
];

const mockTimeSeriesData = [
  { timestamp: '2024-01-01T00:00:00Z', value: 100 },
  { timestamp: '2024-01-01T01:00:00Z', value: 120 },
  { timestamp: '2024-01-01T02:00:00Z', value: 110 },
  { timestamp: '2024-01-01T03:00:00Z', value: 130 },
  { timestamp: '2024-01-01T04:00:00Z', value: 140 },
];

describe('DataVisualization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bar chart correctly', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        title="Monthly Data"
        xAxisLabel="Month"
        yAxisLabel="Value"
      />
    );

    expect(screen.getByText('Monthly Data')).toBeInTheDocument();
    expect(screen.getByText('Month')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('renders line chart correctly', () => {
    render(
      <DataVisualization
        type="line"
        data={mockTimeSeriesData}
        title="Time Series Data"
        xAxisLabel="Time"
        yAxisLabel="Value"
      />
    );

    expect(screen.getByText('Time Series Data')).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('renders pie chart correctly', () => {
    render(
      <DataVisualization
        type="pie"
        data={mockData}
        title="Data Distribution"
      />
    );

    expect(screen.getByText('Data Distribution')).toBeInTheDocument();
  });

  it('renders area chart correctly', () => {
    render(
      <DataVisualization
        type="area"
        data={mockTimeSeriesData}
        title="Area Chart"
        xAxisLabel="Time"
        yAxisLabel="Value"
      />
    );

    expect(screen.getByText('Area Chart')).toBeInTheDocument();
  });

  it('renders scatter plot correctly', () => {
    render(
      <DataVisualization
        type="scatter"
        data={mockData}
        title="Scatter Plot"
        xAxisLabel="X Value"
        yAxisLabel="Y Value"
      />
    );

    expect(screen.getByText('Scatter Plot')).toBeInTheDocument();
  });

  it('renders histogram correctly', () => {
    render(
      <DataVisualization
        type="histogram"
        data={mockData}
        title="Data Distribution"
        xAxisLabel="Value"
        yAxisLabel="Frequency"
      />
    );

    expect(screen.getByText('Data Distribution')).toBeInTheDocument();
  });

  it('renders gauge chart correctly', () => {
    render(
      <DataVisualization
        type="gauge"
        data={[{ value: 75, max: 100, label: 'Progress' }]}
        title="Progress Gauge"
      />
    );

    expect(screen.getByText('Progress Gauge')).toBeInTheDocument();
  });

  it('renders heatmap correctly', () => {
    const heatmapData = [
      { x: 'A', y: '1', value: 10 },
      { x: 'B', y: '1', value: 20 },
      { x: 'A', y: '2', value: 30 },
      { x: 'B', y: '2', value: 40 },
    ];

    render(
      <DataVisualization
        type="heatmap"
        data={heatmapData}
        title="Heatmap"
        xAxisLabel="X"
        yAxisLabel="Y"
      />
    );

    expect(screen.getByText('Heatmap')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <DataVisualization
        type="bar"
        data={[]}
        loading
        title="Loading Chart"
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(
      <DataVisualization
        type="bar"
        data={[]}
        error="Failed to load data"
        title="Error Chart"
      />
    );

    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(
      <DataVisualization
        type="bar"
        data={[]}
        title="Empty Chart"
      />
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('handles different chart sizes', () => {
    const { rerender } = render(
      <DataVisualization
        type="bar"
        data={mockData}
        size="sm"
        title="Small Chart"
      />
    );
    expect(screen.getByText('Small Chart')).toHaveClass('chart-sm');

    rerender(
      <DataVisualization
        type="bar"
        data={mockData}
        size="md"
        title="Medium Chart"
      />
    );
    expect(screen.getByText('Medium Chart')).toHaveClass('chart-md');

    rerender(
      <DataVisualization
        type="bar"
        data={mockData}
        size="lg"
        title="Large Chart"
      />
    );
    expect(screen.getByText('Large Chart')).toHaveClass('chart-lg');
  });

  it('handles different chart themes', () => {
    const { rerender } = render(
      <DataVisualization
        type="bar"
        data={mockData}
        theme="light"
        title="Light Chart"
      />
    );
    expect(screen.getByText('Light Chart')).toHaveClass('chart-light');

    rerender(
      <DataVisualization
        type="bar"
        data={mockData}
        theme="dark"
        title="Dark Chart"
      />
    );
    expect(screen.getByText('Dark Chart')).toHaveClass('chart-dark');
  });

  it('shows chart legend when enabled', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        showLegend
        title="Chart with Legend"
      />
    );

    expect(screen.getByText('January')).toBeInTheDocument();
    expect(screen.getByText('February')).toBeInTheDocument();
    expect(screen.getByText('March')).toBeInTheDocument();
  });

  it('hides chart legend when disabled', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        showLegend={false}
        title="Chart without Legend"
      />
    );

    expect(screen.queryByText('January')).not.toBeInTheDocument();
  });

  it('shows grid lines when enabled', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        showGrid
        title="Chart with Grid"
      />
    );

    expect(screen.getByText('Chart with Grid')).toHaveClass('chart-grid');
  });

  it('hides grid lines when disabled', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        showGrid={false}
        title="Chart without Grid"
      />
    );

    expect(screen.getByText('Chart without Grid')).not.toHaveClass('chart-grid');
  });

  it('shows data labels when enabled', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        showDataLabels
        title="Chart with Data Labels"
      />
    );

    expect(screen.getByText('Chart with Data Labels')).toHaveClass('chart-data-labels');
  });

  it('hides data labels when disabled', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        showDataLabels={false}
        title="Chart without Data Labels"
      />
    );

    expect(screen.getByText('Chart without Data Labels')).not.toHaveClass('chart-data-labels');
  });

  it('handles custom colors', () => {
    const customColors = ['#ff0000', '#00ff00', '#0000ff'];
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        colors={customColors}
        title="Chart with Custom Colors"
      />
    );

    expect(screen.getByText('Chart with Custom Colors')).toBeInTheDocument();
  });

  it('handles custom dimensions', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        width={800}
        height={600}
        title="Chart with Custom Dimensions"
      />
    );

    expect(screen.getByText('Chart with Custom Dimensions')).toBeInTheDocument();
  });

  it('handles animation when enabled', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        animated
        title="Animated Chart"
      />
    );

    expect(screen.getByText('Animated Chart')).toHaveClass('chart-animated');
  });

  it('disables animation when disabled', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        animated={false}
        title="Static Chart"
      />
    );

    expect(screen.getByText('Static Chart')).not.toHaveClass('chart-animated');
  });

  it('handles interactive features', () => {
    const handleDataPointClick = vi.fn();
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        interactive
        onDataPointClick={handleDataPointClick}
        title="Interactive Chart"
      />
    );

    expect(screen.getByText('Interactive Chart')).toHaveClass('chart-interactive');
  });

  it('handles tooltip when enabled', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        showTooltip
        title="Chart with Tooltip"
      />
    );

    expect(screen.getByText('Chart with Tooltip')).toHaveClass('chart-tooltip');
  });

  it('hides tooltip when disabled', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        showTooltip={false}
        title="Chart without Tooltip"
      />
    );

    expect(screen.getByText('Chart without Tooltip')).not.toHaveClass('chart-tooltip');
  });

  it('handles zoom functionality', () => {
    render(
      <DataVisualization
        type="line"
        data={mockTimeSeriesData}
        zoomable
        title="Zoomable Chart"
      />
    );

    expect(screen.getByText('Zoomable Chart')).toHaveClass('chart-zoomable');
  });

  it('handles pan functionality', () => {
    render(
      <DataVisualization
        type="line"
        data={mockTimeSeriesData}
        pannable
        title="Pannable Chart"
      />
    );

    expect(screen.getByText('Pannable Chart')).toHaveClass('chart-pannable');
  });

  it('handles export functionality', () => {
    const handleExport = vi.fn();
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        exportable
        onExport={handleExport}
        title="Exportable Chart"
      />
    );

    expect(screen.getByText('Exportable Chart')).toHaveClass('chart-exportable');
  });

  it('handles different export formats', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        exportFormats={['png', 'svg', 'pdf']}
        title="Multi-format Export Chart"
      />
    );

    expect(screen.getByText('Multi-format Export Chart')).toBeInTheDocument();
  });

  it('handles custom axis configuration', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        xAxisConfig={{ min: 0, max: 300, step: 50 }}
        yAxisConfig={{ min: 0, max: 250, step: 25 }}
        title="Chart with Custom Axes"
      />
    );

    expect(screen.getByText('Chart with Custom Axes')).toBeInTheDocument();
  });

  it('handles custom tooltip content', () => {
    const customTooltip = (data: any) => `Custom: ${data.value}`;
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        tooltipContent={customTooltip}
        title="Chart with Custom Tooltip"
      />
    );

    expect(screen.getByText('Chart with Custom Tooltip')).toBeInTheDocument();
  });

  it('handles real-time data updates', () => {
    const { rerender } = render(
      <DataVisualization
        type="line"
        data={mockTimeSeriesData}
        title="Real-time Chart"
      />
    );

    expect(screen.getByText('Real-time Chart')).toBeInTheDocument();

    const updatedData = [...mockTimeSeriesData, { timestamp: '2024-01-01T05:00:00Z', value: 150 }];
    rerender(
      <DataVisualization
        type="line"
        data={updatedData}
        title="Real-time Chart"
      />
    );

    expect(screen.getByText('Real-time Chart')).toBeInTheDocument();
  });

  it('handles data filtering', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        filterable
        title="Filterable Chart"
      />
    );

    expect(screen.getByText('Filterable Chart')).toHaveClass('chart-filterable');
  });

  it('handles data sorting', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        sortable
        title="Sortable Chart"
      />
    );

    expect(screen.getByText('Sortable Chart')).toHaveClass('chart-sortable');
  });

  it('handles responsive design', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        responsive
        title="Responsive Chart"
      />
    );

    expect(screen.getByText('Responsive Chart')).toHaveClass('chart-responsive');
  });

  it('handles accessibility features', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        accessible
        title="Accessible Chart"
        ariaLabel="Monthly data visualization"
      />
    );

    expect(screen.getByText('Accessible Chart')).toBeInTheDocument();
    expect(screen.getByLabelText('Monthly data visualization')).toBeInTheDocument();
  });

  it('handles custom styling', () => {
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        className="custom-chart"
        style={{ backgroundColor: 'red' }}
        title="Custom Styled Chart"
      />
    );

    const chart = screen.getByText('Custom Styled Chart');
    expect(chart).toHaveClass('custom-chart');
    expect(chart).toHaveStyle('background-color: red');
  });

  it('handles chart refresh', () => {
    const handleRefresh = vi.fn();
    render(
      <DataVisualization
        type="bar"
        data={mockData}
        onRefresh={handleRefresh}
        title="Refreshable Chart"
      />
    );

    expect(screen.getByText('Refreshable Chart')).toBeInTheDocument();
  });

  it('handles chart configuration changes', () => {
    const { rerender } = render(
      <DataVisualization
        type="bar"
        data={mockData}
        title="Configurable Chart"
      />
    );

    expect(screen.getByText('Configurable Chart')).toBeInTheDocument();

    rerender(
      <DataVisualization
        type="line"
        data={mockTimeSeriesData}
        title="Configurable Chart"
      />
    );

    expect(screen.getByText('Configurable Chart')).toBeInTheDocument();
  });

  it('handles large datasets', () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      label: `Item ${i}`,
      value: Math.random() * 100,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    }));

    render(
      <DataVisualization
        type="bar"
        data={largeDataset}
        title="Large Dataset Chart"
      />
    );

    expect(screen.getByText('Large Dataset Chart')).toBeInTheDocument();
  });

  it('handles empty datasets gracefully', () => {
    render(
      <DataVisualization
        type="bar"
        data={[]}
        title="Empty Dataset Chart"
      />
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('handles malformed data gracefully', () => {
    const malformedData = [
      { label: 'Valid', value: 100 },
      { label: 'Invalid', value: null },
      { label: 'Another Valid', value: 200 },
    ];

    render(
      <DataVisualization
        type="bar"
        data={malformedData}
        title="Malformed Data Chart"
      />
    );

    expect(screen.getByText('Malformed Data Chart')).toBeInTheDocument();
  });
});
