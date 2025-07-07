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
  const chartConfig = {
    [dataKey]: {
      label: title,
      color: `hsl(var(${color}))`,
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
            data={data}
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
                if (typeof value === 'number' && yAxisFormatter) {
                  return yAxisFormatter(value)
                }
                if (typeof value === 'number') {
                  return value.toLocaleString('en-US');
                }
                return value;
              }} />}
            />
            <Line
              dataKey={dataKey}
              type="monotone"
              stroke={`hsl(var(${color}))`}
              strokeWidth={3}
              dot={false}
            />
          </RechartsLineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
