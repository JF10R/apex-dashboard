'use client';

import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as RechartsLineChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { HistoryPoint } from '@/lib/mock-data';

interface HistoryChartProps {
  data: HistoryPoint[];
  title: string;
  description: string;
  dataKey: "value";
  color: string;
  yAxisFormatter?: (value: number) => string;
}

export function HistoryChart({ data, title, description, dataKey, color, yAxisFormatter }: HistoryChartProps) {
  // Special handling for Safety Rating to show license classes
  const isSafetyRating = title.toLowerCase().includes('safety');
  
  // Filter out invalid data (-1 values) and ensure valid numbers
  // For Safety Rating, allow values >= 0 and <= 4.99, for others require > 0
  const filteredData = data.filter(point => 
    point.value !== -1 && 
    !isNaN(point.value) && 
    isFinite(point.value) && 
    (isSafetyRating ? (point.value >= 0 && point.value <= 4.99) : point.value > 0)
  );

  let processedData = filteredData;
  
  if (isSafetyRating) {
    // Transform Safety Rating values to show license classes
    processedData = filteredData.map(point => ({
      ...point,
      displayValue: formatSafetyRating(point.value)
    }));
  }

  const chartConfig = {
    [dataKey]: {
      label: title,
      color: `hsl(var(${color}))`,
    },
  } satisfies ChartConfig;

  // Custom formatter for Safety Rating
  function formatSafetyRating(value: number): string {
    // Safety Rating ranges from 0.00 to 4.99
    // Just show the numeric value, license class is separate
    return value.toFixed(2);
  }

  // Custom Y-axis formatter for Safety Rating
  const customYAxisFormatter = isSafetyRating ? formatSafetyRating : yAxisFormatter;

  // If no valid data, show empty state
  if (filteredData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            No valid data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <RechartsLineChart
            data={processedData}
            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis
              tickFormatter={customYAxisFormatter}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              domain={isSafetyRating ? [0, 'dataMax'] : ['dataMin', 'dataMax']}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" formatter={(value, name, props) => {
                if (typeof value === 'number' && isSafetyRating) {
                  return formatSafetyRating(value);
                }
                if (typeof value === 'number' && yAxisFormatter) {
                  return yAxisFormatter(value);
                }
                if (typeof value === 'number') {
                  return value.toLocaleString('en-US');
                }
                return value;
              }} />}
            />
            <Line
              dataKey={dataKey}
              type="linear"
              stroke={`hsl(var(${color}))`}
              strokeWidth={2}
              dot={{ fill: `hsl(var(${color}))`, strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: `hsl(var(${color}))`, strokeWidth: 2 }}
            />
          </RechartsLineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
