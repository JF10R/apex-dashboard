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

  const chartData = mergeHistoryData(seriesA.data, seriesB.data, keyA, keyB);

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
              tickFormatter={yAxisFormatter}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              domain={['auto', 'auto']}
            />
             <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" formatter={(value, name, props) => {
                // name will be keyA or keyB
                const formattedValue = typeof value === 'number'
                  ? (yAxisFormatter ? yAxisFormatter(value) : value.toLocaleString('en-US'))
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
