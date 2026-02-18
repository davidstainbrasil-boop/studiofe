'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  pending: '#94a3b8',
  queued: '#fbbf24',
  processing: '#3b82f6',
  completed: '#22c55e',
  failed: '#ef4444',
  cancelled: '#6b7280',
};

const BAR_COLOR = 'hsl(var(--primary))';

interface ProjectsByDayChartProps {
  data: Array<{ date: string; count: number }>;
}

export function ProjectsByDayChart({ data }: ProjectsByDayChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        Nenhum dado disponível para o período.
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formatted} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '12px',
          }}
          labelFormatter={(label) => `Data: ${label}`}
          formatter={(value) => [`${value} projetos`, 'Projetos']}
        />
        <Bar
          dataKey="count"
          fill={BAR_COLOR}
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface RendersByStatusChartProps {
  data: Array<{ status: string; count: number }>;
}

export function RendersByStatusChart({ data }: RendersByStatusChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        Nenhum render registrado.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="count"
          nameKey="status"
          label={({ name, value }) => `${name}: ${value}`}
        >
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={STATUS_COLORS[entry.status] || '#94a3b8'}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '12px',
          }}
          formatter={(value, name) => [`${value} renders`, name]}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: '12px' }}
          formatter={(value: string) => (
            <span className="text-foreground">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
