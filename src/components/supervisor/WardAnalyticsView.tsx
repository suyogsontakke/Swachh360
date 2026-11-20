import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { NAGPUR_WARDS } from '../../data/seedData';
import { useApp } from '../../context/AppContext';
import { computeRecurringHotspots } from '../../services/aiAssistant';

const CATEGORY_COLORS = ['#142B45', '#1D4262', '#27AE75', '#D97706', '#64748B'];

export const WardAnalyticsView: React.FC = () => {
  const { complaints, workers } = useApp();

  // 1. Resolution Statistics
  const resolutionStats = useMemo(() => {
    const total = complaints.length;
    const resolved = complaints.filter((c) => c.status === 'Resolved').length;
    const pendingVerify = complaints.filter((c) => c.status === 'Completed').length;
    const criticalOpen = complaints.filter(
      (c) => c.priority === 'Critical' && c.status !== 'Resolved'
    ).length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Calculate average resolution duration in hours for resolved records
    const durations = complaints
      .filter((c) => c.status === 'Resolved' && c.resolvedAt)
      .map((c) => {
        const start = new Date(c.createdAt).getTime();
        const end = new Date(c.resolvedAt!).getTime();
        return Math.max(1, (end - start) / (1000 * 60 * 60));
      });
    const avgHours =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    return { total, resolved, pendingVerify, criticalOpen, resolutionRate, avgHours };
  }, [complaints]);

  // 2. Complaints by Ward
  const wardChartData = useMemo(() => {
    return NAGPUR_WARDS.map((w) => {
      const inWard = complaints.filter((c) => c.wardId === w.id);
      const resolved = inWard.filter((c) => c.status === 'Resolved').length;
      const open = inWard.length - resolved;
      return {
        ward: w.code,
        fullName: `${w.code} — ${w.name}`,
        Open: open,
        Resolved: resolved,
        Total: inWard.length,
      };
    });
  }, [complaints]);

  // 3. Complaints by Category
  const categoryChartData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of complaints) {
      counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, value]) => ({
        name,
        value,
        pct: complaints.length > 0 ? Math.round((value / complaints.length) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [complaints]);

  // 4. Weekly Complaint Trends (last 7 days dynamically computed from live data)
  const weeklyTrendData = useMemo(() => {
    const days: Array<{ dateKey: string; label: string; Submitted: number; Resolved: number }> = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit' });
      days.push({ dateKey, label, Submitted: 0, Resolved: 0 });
    }

    for (const c of complaints) {
      const createdKey = c.createdAt.slice(0, 10);
      const subDay = days.find((d) => d.dateKey === createdKey);
      if (subDay) subDay.Submitted += 1;

      if (c.resolvedAt) {
        const resKey = c.resolvedAt.slice(0, 10);
        const resDay = days.find((d) => d.dateKey === resKey);
        if (resDay) resDay.Resolved += 1;
      }
    }
    return days;
  }, [complaints]);

  // 5. Worker Performance & Load
  const workerLoad = useMemo(() => {
    return workers.map((w) => {
      const assigned = complaints.filter((c) => c.assignedWorkerId === w.id);
      const resolved = assigned.filter((c) => c.status === 'Resolved').length;
      const pendingVerify = assigned.filter((c) => c.status === 'Completed').length;
      const active = assigned.filter(
        (c) => c.status === 'Assigned' || c.status === 'In Progress'
      ).length;
      return {
        ...w,
        total: assigned.length,
        active,
        pendingVerify,
        resolved,
      };
    });
  }, [complaints, workers]);

  // 6. Recurring Hotspots
  const hotspots = useMemo(() => computeRecurringHotspots(complaints), [complaints]);

  return (
    <div className="space-y-6">
      {/* Resolution KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
          <p className="text-xs font-medium text-[#52677A]">Verification &amp; Resolution Rate</p>
          <p className="text-3xl font-bold font-mono tabular-nums text-[#1E8E5E] mt-2">
            {resolutionStats.resolutionRate}%
          </p>
          <p className="text-xs text-[#52677A] mt-1 font-mono tabular-nums">
            {resolutionStats.resolved} of {resolutionStats.total} tickets verified closed
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
          <p className="text-xs font-medium text-[#52677A]">Avg. Resolution Turnaround</p>
          <p className="text-3xl font-bold font-mono tabular-nums text-[#142B45] mt-2">
            {resolutionStats.avgHours}h
          </p>
          <p className="text-xs text-[#52677A] mt-1">
            Submission to supervisor sign-off
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
          <p className="text-xs font-medium text-[#52677A]">Awaiting Photo Verification</p>
          <p className="text-3xl font-bold font-mono tabular-nums text-teal-700 mt-2">
            {resolutionStats.pendingVerify}
          </p>
          <p className="text-xs text-[#52677A] mt-1">
            Worker completed · ready for review
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
          <p className="text-xs font-medium text-[#52677A]">Open Critical Priority</p>
          <p className="text-3xl font-bold font-mono tabular-nums text-red-700 mt-2">
            {resolutionStats.criticalOpen}
          </p>
          <p className="text-xs text-[#52677A] mt-1">
            High public-health urgency tickets
          </p>
        </div>
      </section>

      {/* Charts Row 1: Complaints by Ward + Weekly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Complaints by Ward */}
        <section className="bg-white border border-[#E2E8F0] rounded-lg p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#142B45]">Complaints by Ward (Nagpur Demo)</h3>
            <p className="text-xs text-[#52677A] mt-0.5">
              Live breakdown of active vs. verified resolved sanitation reports
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wardChartData} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="ward"
                  tick={{ fontSize: 11, fill: '#52677A' }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#52677A' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="Open" stackId="a" fill="#1D4262" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Resolved" stackId="a" fill="#27AE75" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center gap-5 text-xs text-[#52677A]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#1D4262]" />
              Open / Active
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#27AE75]" />
              Resolved &amp; Verified
            </span>
          </div>
        </section>

        {/* Weekly Complaint Trends */}
        <section className="bg-white border border-[#E2E8F0] rounded-lg p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#142B45]">7-Day Complaint Trend</h3>
            <p className="text-xs text-[#52677A] mt-0.5">
              Daily incoming reports vs. supervisor-verified closures
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={weeklyTrendData}
                margin={{ top: 8, right: 12, left: -16, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#52677A' }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#52677A' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Submitted"
                  stroke="#142B45"
                  fill="#142B45"
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Resolved"
                  stroke="#27AE75"
                  fill="#27AE75"
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center gap-5 text-xs text-[#52677A]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#142B45]" />
              Complaints Submitted
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#27AE75]" />
              Verified Resolved
            </span>
          </div>
        </section>
      </div>

      {/* Row 2: Complaints by Category + Crew Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Donut + Table */}
        <section className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-lg p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#142B45]">Complaints by Category</h3>
            <p className="text-xs text-[#52677A] mt-0.5">
              Distribution across municipal sanitation issue classifications
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="space-y-2.5 text-xs">
              {categoryChartData.map((item, idx) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0] last:border-b-0 last:pb-0"
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                    />
                    <span className="text-[#172B3A] truncate">{item.name}</span>
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-[#142B45] shrink-0">
                    {item.value} ({item.pct}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Field Crew Workload */}
        <section className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-lg p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#142B45]">Sanitation Crew Workload</h3>
            <p className="text-xs text-[#52677A] mt-0.5">
              Live assignment balance across Zone 4 &amp; 5 field workers
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[11px] font-semibold text-[#52677A]">
                  <th className="py-2 pr-3">Worker &amp; Crew</th>
                  <th className="py-2 px-2 text-right">Active</th>
                  <th className="py-2 px-2 text-right">Pending Verify</th>
                  <th className="py-2 pl-2 text-right">Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {workerLoad.map((w) => (
                  <tr key={w.id}>
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-[#142B45]">{w.name}</p>
                      <p className="text-[11px] font-mono text-[#52677A]">
                        {w.crewCode} · {w.shift}
                      </p>
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums font-semibold text-amber-700">
                      {w.active}
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums font-semibold text-teal-700">
                      {w.pendingVerify}
                    </td>
                    <td className="py-3 pl-2 text-right font-mono tabular-nums font-semibold text-[#1E8E5E]">
                      {w.resolved}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Row 3: Recurring Sanitation Hotspots */}
      <section className="bg-white border border-[#E2E8F0] rounded-lg p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#142B45]">
            Recurring Sanitation Hotspots (Computed from Live Records)
          </h3>
          <p className="text-xs text-[#52677A] mt-0.5">
            Priority wards requiring preventive desilting or additional bin collection rounds
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[11px] font-semibold text-[#52677A]">
                <th className="py-2.5 pr-4">Ward</th>
                <th className="py-2.5 px-3 text-right">Total Reports</th>
                <th className="py-2.5 px-3 text-right">Open Queue</th>
                <th className="py-2.5 px-3">Dominant Category</th>
                <th className="py-2.5 px-3">Risk Level</th>
                <th className="py-2.5 pl-3">Preventive Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs">
              {hotspots.map((h) => (
                <tr key={h.wardId} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 pr-4 font-semibold text-[#142B45] whitespace-nowrap">
                    {h.wardName}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-[#172B3A]">
                    {h.totalReports}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-amber-700">
                    {h.openReports}
                  </td>
                  <td className="py-3 px-3 text-[#172B3A] whitespace-nowrap">
                    {h.dominantCategory}
                  </td>
                  <td
                    className={`py-3 px-3 font-semibold whitespace-nowrap ${
                      h.riskLevel === 'Recurring Critical'
                        ? 'text-red-700'
                        : h.riskLevel === 'High'
                        ? 'text-amber-700'
                        : 'text-[#1D4262]'
                    }`}
                  >
                    {h.riskLevel}
                  </td>
                  <td className="py-3 pl-3 text-[#52677A] min-w-[240px]">{h.recommendedAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
