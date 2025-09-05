import React, { useState, useRef, useEffect, useMemo } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { useAnimation, animationPresets, useReducedMotion } from '../../utils/animations';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BarChart3, 
  PieChart, 
  Activity,
  Zap,
  Cpu,
  HardDrive,
  Wifi,
  Users,
  Server
} from 'lucide-react';

// Data visualization variants
const dataVizVariants = cva(
  'relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm',
  {
    variants: {
      variant: {
        default: 'p-6',
        compact: 'p-4',
        minimal: 'p-2',
        minecraft: 'p-6 border-minecraft-brown bg-gradient-to-br from-minecraft-green/10 to-minecraft-blue/10',
      },
      size: {
        sm: 'h-32',
        default: 'h-48',
        lg: 'h-64',
        xl: 'h-80',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface DataPoint {
  label: string;
  value: number;
  color?: string;
  icon?: React.ReactNode;
  metadata?: Record<string, any>;
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  label?: string;
}

export interface ChartProps extends VariantProps<typeof dataVizVariants> {
  title?: string;
  description?: string;
  data: DataPoint[] | TimeSeriesData[];
  type: 'bar' | 'line' | 'pie' | 'area' | 'gauge' | 'sparkline';
  animated?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
  showAxes?: boolean;
  colorScheme?: 'default' | 'minecraft' | 'monochrome' | 'rainbow';
  maxValue?: number;
  minValue?: number;
  unit?: string;
  className?: string;
  onDataPointClick?: (dataPoint: DataPoint | TimeSeriesData) => void;
  onHover?: (dataPoint: DataPoint | TimeSeriesData) => void;
}

// Color schemes
const colorSchemes = {
  default: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
  minecraft: ['#7CB342', '#F44336', '#2196F3', '#FFEB3B', '#8D6E63', '#9E9E9E'],
  monochrome: ['#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6'],
  rainbow: ['#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FF00', '#00FF80', '#00FFFF', '#0080FF', '#0000FF', '#8000FF'],
};

// Bar Chart Component
const BarChart: React.FC<ChartProps> = ({
  data,
  animated = true,
  showGrid = true,
  showAxes = true,
  colorScheme = 'default',
  maxValue,
  onDataPointClick,
  onHover,
  ...props
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const reducedMotion = useReducedMotion();

  const colors = colorSchemes[colorScheme];
  const maxVal = maxValue || Math.max(...data.map(d => d.value));
  const minVal = Math.min(...data.map(d => d.value));

  const handleBarClick = (index: number) => {
    onDataPointClick?.(data[index]);
  };

  const handleBarHover = (index: number) => {
    setHoveredIndex(index);
    onHover?.(data[index]);
  };

  return (
    <div className={cn(dataVizVariants(props))}>
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {showGrid && (
          <g className="opacity-20">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
              <line
                key={index}
                x1="40"
                y1={40 + ratio * 120}
                x2="380"
                y2={40 + ratio * 120}
                stroke="currentColor"
                strokeWidth="1"
              />
            ))}
          </g>
        )}

        {/* Axes */}
        {showAxes && (
          <>
            <line x1="40" y1="40" x2="40" y2="160" stroke="currentColor" strokeWidth="2" />
            <line x1="40" y1="160" x2="380" y2="160" stroke="currentColor" strokeWidth="2" />
          </>
        )}

        {/* Bars */}
        {data.map((item, index) => {
          const height = ((item.value - minVal) / (maxVal - minVal)) * 120;
          const x = 60 + (index * 320) / data.length;
          const width = Math.max(20, 320 / data.length - 10);
          const y = 160 - height;
          const color = colors[index % colors.length];

          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={color}
                className={cn(
                  'transition-all duration-300 cursor-pointer',
                  hoveredIndex === index && 'opacity-80',
                  !reducedMotion && animated && 'animate-slide-in-up'
                )}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
                onClick={() => handleBarClick(index)}
                onMouseEnter={() => handleBarHover(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              
              {/* Value label */}
              <text
                x={x + width / 2}
                y={y - 5}
                textAnchor="middle"
                className="text-xs fill-current"
              >
                {item.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Line Chart Component
const LineChart: React.FC<ChartProps> = ({
  data,
  animated = true,
  showGrid = true,
  showAxes = true,
  colorScheme = 'default',
  maxValue,
  onDataPointClick,
  onHover,
  ...props
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const reducedMotion = useReducedMotion();

  const colors = colorSchemes[colorScheme];
  const maxVal = maxValue || Math.max(...data.map(d => d.value));
  const minVal = Math.min(...data.map(d => d.value));

  // Generate path for line
  const pathData = data.map((item, index) => {
    const x = 60 + (index * 320) / (data.length - 1);
    const y = 160 - ((item.value - minVal) / (maxVal - minVal)) * 120;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const handlePointClick = (index: number) => {
    onDataPointClick?.(data[index]);
  };

  const handlePointHover = (index: number) => {
    setHoveredIndex(index);
    onHover?.(data[index]);
  };

  return (
    <div className={cn(dataVizVariants(props))}>
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {showGrid && (
          <g className="opacity-20">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
              <line
                key={index}
                x1="40"
                y1={40 + ratio * 120}
                x2="380"
                y2={40 + ratio * 120}
                stroke="currentColor"
                strokeWidth="1"
              />
            ))}
          </g>
        )}

        {/* Axes */}
        {showAxes && (
          <>
            <line x1="40" y1="40" x2="40" y2="160" stroke="currentColor" strokeWidth="2" />
            <line x1="40" y1="160" x2="380" y2="160" stroke="currentColor" strokeWidth="2" />
          </>
        )}

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={colors[0]}
          strokeWidth="2"
          className={cn(
            'transition-all duration-500',
            !reducedMotion && animated && 'animate-fade-in'
          )}
        />

        {/* Data points */}
        {data.map((item, index) => {
          const x = 60 + (index * 320) / (data.length - 1);
          const y = 160 - ((item.value - minVal) / (maxVal - minVal)) * 120;
          const color = colors[0];

          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={hoveredIndex === index ? 6 : 4}
              fill={color}
              className={cn(
                'transition-all duration-200 cursor-pointer',
                hoveredIndex === index && 'opacity-80',
                !reducedMotion && animated && 'animate-scale-in'
              )}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
              onClick={() => handlePointClick(index)}
              onMouseEnter={() => handlePointHover(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          );
        })}
      </svg>
    </div>
  );
};

// Pie Chart Component
const PieChart: React.FC<ChartProps> = ({
  data,
  animated = true,
  showLegend = true,
  onDataPointClick,
  onHover,
  ...props
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const reducedMotion = useReducedMotion();

  const colors = colorSchemes.default;
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Generate pie slices
  const slices = data.map((item, index) => {
    const percentage = item.value / total;
    const startAngle = data.slice(0, index).reduce((sum, prevItem) => sum + (prevItem.value / total) * 360, 0);
    const endAngle = startAngle + percentage * 360;

    // Convert angles to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Calculate path for pie slice
    const radius = 60;
    const centerX = 100;
    const centerY = 100;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArcFlag = percentage > 0.5 ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    return {
      pathData,
      percentage,
      color: colors[index % colors.length],
      label: item.label,
      value: item.value,
    };
  });

  const handleSliceClick = (index: number) => {
    onDataPointClick?.(data[index]);
  };

  const handleSliceHover = (index: number) => {
    setHoveredIndex(index);
    onHover?.(data[index]);
  };

  return (
    <div className={cn(dataVizVariants(props))}>
      <div className="flex items-center justify-center h-full">
        <svg
          ref={svgRef}
          className="w-48 h-48"
          viewBox="0 0 200 200"
          preserveAspectRatio="xMidYMid meet"
        >
          {slices.map((slice, index) => (
            <g key={index}>
              <path
                d={slice.pathData}
                fill={slice.color}
                className={cn(
                  'transition-all duration-300 cursor-pointer',
                  hoveredIndex === index && 'opacity-80',
                  !reducedMotion && animated && 'animate-scale-in'
                )}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
                onClick={() => handleSliceClick(index)}
                onMouseEnter={() => handleSliceHover(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="grid grid-cols-2 gap-2">
            {slices.map((slice, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-xs"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate">{slice.label}</span>
                <span className="text-muted-foreground">({slice.value})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Gauge Chart Component
const GaugeChart: React.FC<ChartProps> = ({
  data,
  maxValue = 100,
  unit = '%',
  animated = true,
  onDataPointClick,
  ...props
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const reducedMotion = useReducedMotion();

  const value = data[0]?.value || 0;
  const percentage = (value / maxValue) * 100;
  const angle = (percentage / 100) * 180; // Half circle

  const handleClick = () => {
    onDataPointClick?.(data[0]);
  };

  return (
    <div className={cn(dataVizVariants(props))}>
      <div className="flex flex-col items-center justify-center h-full">
        <svg
          ref={svgRef}
          className="w-32 h-32"
          viewBox="0 0 200 120"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="opacity-20"
          />
          
          {/* Value arc */}
          <path
            d={`M 20 100 A 80 80 0 0 1 ${180 - (180 - 20) * (1 - percentage / 100)} 100`}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className={cn(
              'transition-all duration-1000',
              !reducedMotion && animated && 'animate-progress'
            )}
            style={{
              strokeDasharray: `${angle * 1.4} 282.7`,
              strokeDashoffset: 0,
            }}
          />
        </svg>

        <div className="text-center mt-4">
          <div className="text-2xl font-bold">{value}{unit}</div>
          <div className="text-sm text-muted-foreground">{data[0]?.label}</div>
        </div>
      </div>
    </div>
  );
};

// Sparkline Component
const Sparkline: React.FC<ChartProps> = ({
  data,
  animated = true,
  onDataPointClick,
  ...props
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const reducedMotion = useReducedMotion();

  const maxVal = Math.max(...data.map(d => d.value));
  const minVal = Math.min(...data.map(d => d.value));

  // Generate path for sparkline
  const pathData = data.map((item, index) => {
    const x = (index * 100) / (data.length - 1);
    const y = 100 - ((item.value - minVal) / (maxVal - minVal)) * 80;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className={cn(dataVizVariants({ ...props, size: 'sm' }))}>
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d={pathData}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn(
            'transition-all duration-500',
            !reducedMotion && animated && 'animate-fade-in'
          )}
        />
      </svg>
    </div>
  );
};

// Main Data Visualization Component
const DataVisualization: React.FC<ChartProps> = ({
  type,
  ...props
}) => {
  switch (type) {
    case 'bar':
      return <BarChart {...props} />;
    case 'line':
      return <LineChart {...props} />;
    case 'pie':
      return <PieChart {...props} />;
    case 'gauge':
      return <GaugeChart {...props} />;
    case 'sparkline':
      return <Sparkline {...props} />;
    default:
      return <BarChart {...props} />;
  }
};

export { 
  DataVisualization, 
  BarChart, 
  LineChart, 
  PieChart, 
  GaugeChart, 
  Sparkline,
  dataVizVariants 
};
