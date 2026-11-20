import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Download,
  MapPin,
  MessageSquareText,
  Search,
  Sparkles,
} from 'lucide-react';
import { COMPLAINT_CATEGORIES, NAGPUR_WARDS } from '../../data/seedData';
import { useApp } from '../../context/AppContext';
import { exportComplaintsToCsv } from '../../services/repository';
import { ComplaintDetailModal } from '../common/ComplaintDetailModal';
import {
  formatShortDate,
  PriorityText,
  SafeImage,
  StatusText,
} from '../common/StatusIndicators';
import { AppShell, NavItem } from '../layout/AppShell';
import { AiAssistanceView } from '../shared/AiAssistanceView';
import { SmsNotificationsPanel } from '../shared/SmsNotificationsPanel';
import { WardMapView } from '../shared/WardMapView';
import { WardAnalyticsView } from './WardAnalyticsView';

type SupervisorPage = 'complaints' | 'analytics' | 'map' | 'sms-logs' | 'ai-assist';

export const SupervisorPortal: React.FC = () => {
  const { complaints, smsLogs, pushToast } = useApp();
  const [activePage, setActivePage] = useState<SupervisorPage>('complaints');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [wardFilter, setWardFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const summary = useMemo(() => {
    const total = complaints.length;
    const pending = complaints.filter(
      (c) => c.status === 'Submitted' || c.status === 'Assigned'
    ).length;
    const unassigned = complaints.filter((c) => c.status === 'Submitted').length;
    const inProgress = complaints.filter(
      (c) => c.status === 'In Progress' || c.status === 'Completed'
    ).length;
    const awaitingVerification = complaints.filter((c) => c.status === 'Completed').length;
    const resolved = complaints.filter((c) => c.status === 'Resolved').length;
    return { total, pending, unassigned, inProgress, awaitingVerification, resolved };
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false;
      if (wardFilter !== 'ALL' && c.wardId !== wardFilter) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && c.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.id.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.wardName.toLowerCase().includes(q) ||
          c.citizenName.toLowerCase().includes(q) ||
          (c.assignedWorkerName ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [complaints, categoryFilter, wardFilter, statusFilter, priorityFilter, searchQuery]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    categoryFilter !== 'ALL' ||
    wardFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('ALL');
    setWardFilter('ALL');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
  };

  const navItems: NavItem[] = [
    {
      id: 'complaints',
      label: 'Complaint Management',
      Icon: ClipboardList,
      count: summary.unassigned + summary.awaitingVerification,
    },
    { id: 'analytics', label: 'Ward Analytics', Icon: BarChart3 },
    { id: 'map', label: 'Ward Map', Icon: MapPin },
    { id: 'sms-logs', label: 'SMS Logs', Icon: MessageSquareText, count: smsLogs.length },
    { id: 'ai-assist', label: 'AI Assistance', Icon: Sparkles },
  ];

  const handleExport = () => {
    exportComplaintsToCsv(filteredComplaints);
    pushToast(`Exported ${filteredComplaints.length} complaint records to CSV.`, 'info');
  };

  return (
    <AppShell
      portalTitle="Municipal Supervisor"
      navItems={navItems}
      activePage={activePage}
      onSelectPage={(id) => setActivePage(id as SupervisorPage)}
      primaryAction={{
        label: 'Export CSV',
        Icon: Download,
        onClick: handleExport,
      }}
    >
      {activePage === 'complaints' && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={resetFilters}
              className="text-left bg-white border border-[#E2E8F0] hover:border-[#142B45]/40 rounded-lg p-5 transition-colors"
            >
              <p className="text-xs font-medium text-[#52677A]">Total Complaints</p>
              <p className="text-3xl font-bold font-mono tabular-nums text-[#142B45] mt-2">
                {summary.total}
              </p>
              <p className="text-xs text-[#52677A] mt-1">All Nagpur demonstration wards</p>
            </button>

            <button
              type="button"
              onClick={() => {
                resetFilters();
                setStatusFilter('Submitted');
              }}
              className="text-left bg-white border border-[#E2E8F0] hover:border-[#142B45]/40 rounded-lg p-5 transition-colors"
            >
              <p className="text-xs font-medium text-[#52677A]">Pending Complaints</p>
              <p className="text-3xl font-bold font-mono tabular-nums text-red-700 mt-2">
                {summary.pending}
              </p>
              <p className="text-xs text-[#52677A] mt-1 font-mono tabular-nums">
                {summary.unassigned} unassigned · {summary.pending - summary.unassigned} assigned
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                resetFilters();
                setStatusFilter(summary.awaitingVerification > 0 ? 'Completed' : 'In Progress');
              }}
              className="text-left bg-white border border-[#E2E8F0] hover:border-[#142B45]/40 rounded-lg p-5 transition-colors"
            >
              <p className="text-xs font-medium text-[#52677A]">In Progress</p>
              <p className="text-3xl font-bold font-mono tabular-nums text-amber-700 mt-2">
                {summary.inProgress}
              </p>
              <p className="text-xs text-[#52677A] mt-1 font-mono tabular-nums">
                {summary.awaitingVerification} awaiting photo verification
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                resetFilters();
                setStatusFilter('Resolved');
              }}
              className="text-left bg-white border border-[#E2E8F0] hover:border-[#142B45]/40 rounded-lg p-5 transition-colors"
            >
              <p className="text-xs font-medium text-[#52677A]">Resolved Complaints</p>
              <p className="text-3xl font-bold font-mono tabular-nums text-[#1E8E5E] mt-2">
                {summary.resolved}
              </p>
              <p className="text-xs text-[#52677A] mt-1">Verified with after-cleaning proof</p>
            </button>
          </section>

          {/* Actionable Banner for Worker-Completed Tasks Awaiting Verification */}
          {summary.awaitingVerification > 0 && statusFilter !== 'Completed' && (
            <div className="bg-white border border-[#27AE75]/45 rounded-lg px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <ClipboardCheck className="w-5 h-5 text-[#1E8E5E] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-[#142B45]">
                    {summary.awaitingVerification} field{' '}
                    {summary.awaitingVerification === 1 ? 'task is' : 'tasks are'} completed and
                    ready for supervisor photo verification
                  </p>
                  <p className="text-[#52677A] mt-0.5">
                    Inspect before-and-after evidence photographs to mark tickets Resolved.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetFilters();
                  setStatusFilter('Completed');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#27AE75] hover:bg-[#1E8E5E] rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                Review Verification Queue
              </button>
            </div>
          )}

          {/* Search & Multi-Facet Filter Bar */}
          <section className="bg-white border border-[#E2E8F0] rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-4 relative">
                <Search className="w-4 h-4 text-[#52677A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ID, location, citizen, or worker..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-md focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#142B45]"
                />
              </div>

              <div className="lg:col-span-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter by category"
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-[#172B3A]"
                >
                  <option value="ALL">All Categories</option>
                  {COMPLAINT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={wardFilter}
                  onChange={(e) => setWardFilter(e.target.value)}
                  aria-label="Filter by ward"
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-[#172B3A]"
                >
                  <option value="ALL">All Wards</option>
                  {NAGPUR_WARDS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} — {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-[#172B3A]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Submitted">Submitted (Unassigned)</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed (Verify)</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  aria-label="Filter by priority"
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-[#172B3A]"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#52677A]">
              <span className="font-mono tabular-nums">
                Showing {filteredComplaints.length} of {complaints.length} complaints
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="font-semibold text-[#1D4262] hover:text-[#27AE75]"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </section>

          {/* Complaint Management Data Table */}
          <section className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
            {filteredComplaints.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-sm font-semibold text-[#142B45]">
                  No complaints match your current filters
                </p>
                <p className="text-xs text-[#52677A] mt-1">
                  Adjust or clear filters to inspect all ward sanitation records.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-[#142B45] border border-[#CBD5E1] rounded-md hover:bg-[#F4F7FA]"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-[#52677A]">
                      <th className="py-3 px-4">ID &amp; Date</th>
                      <th className="py-3 px-4">Issue &amp; Location</th>
                      <th className="py-3 px-4">Ward</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Assigned Worker</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs">
                    {filteredComplaints.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedComplaintId(c.id)}
                        className="hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-mono font-semibold text-[#142B45] tabular-nums">
                            {c.id}
                          </p>
                          <p className="text-[11px] font-mono tabular-nums text-[#52677A] mt-0.5">
                            {formatShortDate(c.createdAt)}
                            {!c.isDemoData && ' · Live'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 min-w-[240px]">
                          <div className="flex items-center gap-3">
                            <SafeImage
                              src={c.beforePhotoUrl}
                              alt={c.category}
                              className="w-10 h-10 rounded object-cover border border-[#E2E8F0] shrink-0"
                              emptyLabel="—"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-[#172B3A] truncate">{c.category}</p>
                              <p className="text-[#52677A] truncate max-w-[260px] mt-0.5">
                                {c.location}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#52677A] whitespace-nowrap">
                          {c.wardName}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <PriorityText priority={c.priority} />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {c.assignedWorkerName ? (
                            <span className="font-medium text-[#172B3A]">
                              {c.assignedWorkerName}
                            </span>
                          ) : (
                            <span className="text-red-700 font-medium">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusText status={c.status} compact />
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedComplaintId(c.id);
                            }}
                            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                              c.status === 'Completed'
                                ? 'bg-[#27AE75] text-white hover:bg-[#1E8E5E]'
                                : c.status === 'Submitted'
                                ? 'bg-[#142B45] text-white hover:bg-[#1D4262]'
                                : 'text-[#1D4262] border border-[#CBD5E1] bg-white hover:bg-[#F4F7FA]'
                            }`}
                          >
                            {c.status === 'Completed'
                              ? 'Verify Photo'
                              : c.status === 'Submitted'
                              ? 'Assign'
                              : 'Manage'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {activePage === 'analytics' && <WardAnalyticsView />}

      {activePage === 'map' && (
        <WardMapView onSelectComplaint={(id) => setSelectedComplaintId(id)} />
      )}

      {activePage === 'sms-logs' && (
        <SmsNotificationsPanel
          scope="all"
          onSelectComplaint={(id) => setSelectedComplaintId(id)}
        />
      )}

      {activePage === 'ai-assist' && (
        <AiAssistanceView onSelectComplaint={(id) => setSelectedComplaintId(id)} />
      )}

      <ComplaintDetailModal
        complaintId={selectedComplaintId}
        onClose={() => setSelectedComplaintId(null)}
        mode="supervisor"
      />
    </AppShell>
  );
};
