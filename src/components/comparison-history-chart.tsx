'use client';

import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as RechartsLineChart, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { HistoryPoint } from '@/lib/mock-data';
import { mergeHistoryData } from '@/lib/utils';

interface ComparisonHistoryChartProps {
  seriesA: { name: string; data: HistoryPoint[]; color: string; };
  seriesB: { name: string; data: HistoryPoint[]; color: string; };
  title: string;
  description: string;
  yAxisFormatter?: (value: number) => string;
}

export function ComparisonHistoryChart({ seriesA, seriesB, title, description, yAxisFormatter }: ComparisonHistoryChartProps) {
  const keyA = `${seriesA.name.replace(/\s+/g, '')}Value`;
  const keyB = `${seriesB.name.replace(/\s+/g, '')}Value`;

  // Filter out invalid data (-1 values) for both series
  const filteredSeriesA = seriesA.data.filter(point => 
    point.value !== -1 && 
    !isNaN(point.value) && 
    isFinite(point.value) && 
    point.value > 0
  );

  const filteredSeriesB = seriesB.data.filter(point => 
    point.value !== -1 && 
    !isNaN(point.value) && 
    isFinite(point.value) && 
    point.value > 0
  );

  // Special handling for Safety Rating to show license classes
  const isSafetyRating = title.toLowerCase().includes('safety');
  
  // Custom formatter for Safety Rating
  function formatSafetyRating(value: number): string {
    if (value < 2.0) return `R ${value.toFixed(2)}`;
    if (value < 3.0) return `D ${value.toFixed(2)}`;
    if (value < 4.0) return `C ${value.toFixed(2)}`;
    if (value < 5.0) return `B ${value.toFixed(2)}`;
    return `A ${value.toFixed(2)}`;
  }

  const chartData = mergeHistoryData(filteredSeriesA, filteredSeriesB, keyA, keyB);

  const chartConfig = {
    [keyA]: {
      label: seriesA.name,
      color: `hsl(var(${seriesA.color}))`,
    },
    [keyB]: {
      label: seriesB.name,
      color: `hsl(var(${seriesB.color}))`,
    },
  } satisfies ChartConfig;

  // Custom Y-axis formatter for Safety Rating
  const customYAxisFormatter = isSafetyRating ? formatSafetyRating : yAxisFormatter;

  // If no valid data, show empty state
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            No valid data available for comparison
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
            data={chartData}
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
              domain={['dataMin', 'dataMax']}
            />
             <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" formatter={(value, name, props) => {
                // name will be keyA or keyB
                const formattedValue = typeof value === 'number'
                  ? (isSafetyRating ? formatSafetyRating(value) : (yAxisFormatter ? yAxisFormatter(value) : value.toLocaleString('en-US')))
                  : value;

                const label = name === keyA ? chartConfig[keyA].label : chartConfig[keyB].label;
                return (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: name === keyA ? chartConfig[keyA].color : chartConfig[keyB].color}} />
                    <span>{label}: <strong>{formattedValue}</strong></span>
                  </div>
                )
              }} />}
            />
            <Legend />
            <Line
              dataKey={keyA}
              name={seriesA.name}
              type="monotone"
              stroke={chartConfig[keyA].color}
              strokeWidth={3}
              dot={false}
            />
            <Line
              dataKey={keyB}
              name={seriesB.name}
              type="monotone"
              stroke={chartConfig[keyB].color}
              strokeWidth={3}
              dot={false}
            />
          </RechartsLineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
