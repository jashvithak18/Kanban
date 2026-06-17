import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie
} from 'recharts';

export default function ProgressDashboard({ tasks = [] }) {
  const total = tasks.length;
  const todoCount = tasks.filter((t) => t.column === 'todo').length;
  const inprogressCount = tasks.filter((t) => t.column === 'inprogress').length;
  const doneCount = tasks.filter((t) => t.column === 'done').length;

  const barData = [
    { name: 'To Do', value: todoCount, color: 'var(--todo-accent)' },
    { name: 'In Progress', value: inprogressCount, color: 'var(--inprogress-accent)' },
    { name: 'Done', value: doneCount, color: 'var(--done-accent)' }
  ];

  const donePercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const pieData = [
    { name: 'Done', value: doneCount },
    { name: 'Remaining', value: total === 0 ? 1 : total - doneCount }
  ];

  // Priority counts
  const lowCount = tasks.filter((t) => t.priority === 'low').length;
  const mediumCount = tasks.filter((t) => t.priority === 'medium').length;
  const highCount = tasks.filter((t) => t.priority === 'high').length;

  const lowPct = total > 0 ? (lowCount / total) * 100 : 0;
  const medPct = total > 0 ? (mediumCount / total) * 100 : 0;
  const highPct = total > 0 ? (highCount / total) * 100 : 0;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = total > 0 ? ((data.value / total) * 100).toFixed(0) : 0;
      return (
        <div style={{
          background: '#1E1B4B',
          color: '#FFFFFF',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}>
          <p style={{ fontWeight: 600 }}>{data.name}: {data.value}</p>
          <p style={{ opacity: 0.8 }}>{pct}% of total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="glass-panel" style={{
      padding: '24px',
      marginTop: '32px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '24px',
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(124, 58, 237, 0.08)'
    }}>
      {/* Bar Chart: Column Counts */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '260px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text)' }}>Task Distribution</h3>
        <div style={{ flexGrow: 1, width: '100%', height: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'Space Grotesk' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124, 58, 237, 0.05)' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={600}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart: Completion Rate */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '260px', alignItems: 'center', position: 'relative' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text)', alignSelf: 'flex-start' }}>Completion Rate</h3>
        <div style={{ position: 'relative', width: '100%', height: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                startAngle={90}
                endAngle={-270}
                paddingAngle={0}
                dataKey="value"
                animationDuration={600}
              >
                <Cell fill="var(--done-accent)" />
                <Cell fill="var(--surface2)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -30%)',
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              fontFamily: 'Syne',
              color: 'var(--text)'
            }}>
              {donePercent}%
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Done
            </div>
          </div>
        </div>
      </div>

      {/* Priority Breakdown & Info Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text)' }}>Priority Breakdown</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Priority Stacked Bar */}
          <div style={{
            display: 'flex',
            height: '16px',
            borderRadius: '9999px',
            overflow: 'hidden',
            backgroundColor: 'var(--surface2)',
            width: '100%'
          }}>
            {total > 0 ? (
              <>
                {lowCount > 0 && <div style={{ width: `${lowPct}%`, backgroundColor: 'var(--accent4)' }} title={`Low Priority: ${lowCount}`} />}
                {mediumCount > 0 && <div style={{ width: `${medPct}%`, backgroundColor: 'var(--accent5)' }} title={`Medium Priority: ${mediumCount}`} />}
                {highCount > 0 && <div style={{ width: `${highPct}%`, backgroundColor: 'var(--accent2)' }} title={`High Priority: ${highCount}`} />}
              </>
            ) : (
              <div style={{ width: '100%', backgroundColor: 'var(--surface2)' }} />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', background: 'var(--bg)' }}>
              <div style={{ color: 'var(--accent4)', fontWeight: 700, fontSize: '1.2rem' }}>{lowCount}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Low</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', background: 'var(--bg)' }}>
              <div style={{ color: 'var(--accent5)', fontWeight: 700, fontSize: '1.2rem' }}>{mediumCount}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Medium</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', background: 'var(--bg)' }}>
              <div style={{ color: 'var(--accent2)', fontWeight: 700, fontSize: '1.2rem' }}>{highCount}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>High</div>
            </div>
          </div>

          <div style={{
            marginTop: '8px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            textAlign: 'center'
          }}>
            Total Task Volume: <strong>{total}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
