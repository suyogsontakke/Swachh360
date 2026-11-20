import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  MessageSquareText,
  PlusCircle,
  Search,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ComplaintDetailModal } from '../common/ComplaintDetailModal';
import {
  formatShortDate,
  PriorityText,
  SafeImage,
  StatusText,
} from '../common/StatusIndicators';
import { AppShell, NavItem } from '../layout/AppShell';
import { SmsNotificationsPanel } from '../shared/SmsNotificationsPanel';
import { WardMapView } from '../shared/WardMapView';
import { ReportIssueForm } from './ReportIssueForm';

type CitizenPage = 'dashboard' | 'report' | 'my-complaints' | 'sms-alerts' | 'map';

export const CitizenPortal: React.FC = () => {
  const { currentUser, complaints, smsLogs } = useApp();
  const [activePage, setActivePage] = useState<CitizenPage>('dashboard');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const myComplaints = useMemo(() => {
    if (!currentUser) return [];
    return complaints.filter(
      (c) => c.citizenEmail.toLowerCase() === currentUser.email.toLowerCase()
    );
  }, [complaints, currentUser]);

  const stats = useMemo(() => {
    const total = myComplaints.length;
    const resolved = myComplaints.filter((c) => c.status === 'Resolved').length;
    const pending = total - resolved;
    const awaitingVerify = myComplaints.filter((c) => c.status === 'Completed').length;
    return { total, pending, resolved, awaitingVerify };
  }, [myComplaints]);

  const filteredMyComplaints = useMemo(() => {
    return myComplaints.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.id.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.wardName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [myComplaints, statusFilter, searchQuery]);

  const citizenSmsCount = useMemo(() => {
    if (!currentUser) return 0;
    return smsLogs.filter(
      (log) =>
        log.recipientPhone === currentUser.phone ||
        log.recipientName.toLowerCase() === currentUser.name.toLowerCase()
    ).length;
  }, [smsLogs, currentUser]);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'report', label: 'Report Issue', Icon: PlusCircle },
    { id: 'my-complaints', label: 'My Complaints', Icon: ClipboardList, count: myComplaints.length },
    { id: 'sms-alerts', label: 'SMS Alerts', Icon: MessageSquareText, count: citizenSmsCount },
    { id: 'map', label: 'Ward Map', Icon: MapPin },
  ];

  return (
    <AppShell
      portalTitle="Citizen Portal"
      navItems={navItems}
      activePage={activePage}
      onSelectPage={(id) => setActivePage(id as CitizenPage)}
      primaryAction={
        activePage !== 'report'
          ? {
              label: 'Report Sanitation Issue',
              Icon: PlusCircle,
              onClick: () => setActivePage('report'),
            }
          : undefined
      }
    >
      {activePage === 'dashboard' && (
        <div className="space-y-6">
          {/* Welcome & Quick Action Banner */}
          <section className="bg-white border border-[#E2E8F0] rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#52677A]">
                {currentUser?.wardLabel ?? 'Ward 14 — Indora East'} · Citizen Services
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-[#142B45] mt-1">
                Welcome back, {currentUser?.name}
              </h2>
              <p className="text-sm text-[#52677A] mt-1 max-w-2xl">
                Report overflowing waste, blocked drains, or missed collection routes directly to
                your municipal ward supervisor and track photo-verified resolution.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActivePage('report')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#27AE75] hover:bg-[#1E8E5E] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              Report New Issue
            </button>
          </section>

          {/* Citizen KPI Strip */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
              <p className="text-xs font-medium text-[#52677A]">Total Complaints Submitted</p>
              <p className="text-3xl font-bold font-mono tabular-nums text-[#142B45] mt-2">
                {stats.total}
              </p>
              <p className="text-xs text-[#52677A] mt-1">
                Includes demonstration records &amp; new submissions
              </p>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
              <p className="text-xs font-medium text-[#52677A]">Pending / Active Complaints</p>
              <p className="text-3xl font-bold font-mono tabular-nums text-amber-700 mt-2">
                {stats.pending}
              </p>
              <p className="text-xs text-[#52677A] mt-1">
                {stats.awaitingVerify > 0
                  ? `${stats.awaitingVerify} cleaned · awaiting supervisor verification`
                  : 'Tracked across supervisor & crew workflow'}
              </p>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
              <p className="text-xs font-medium text-[#52677A]">Resolved &amp; Verified</p>
              <p className="text-3xl font-bold font-mono tabular-nums text-[#1E8E5E] mt-2">
                {stats.resolved}
              </p>
              <p className="text-xs text-[#52677A] mt-1">
                Before &amp; after photo evidence archived
              </p>
            </div>
          </section>

          {/* Recent Complaint Activity */}
          <section className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#142B45]">Recent Complaint Activity</h3>
                <p className="text-xs text-[#52677A] mt-0.5">
                  Click any complaint to view its full status timeline and resolution photos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePage('my-complaints')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4262] hover:text-[#27AE75] whitespace-nowrap"
              >
                View All ({myComplaints.length})
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {myComplaints.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-semibold text-[#142B45]">No complaints submitted yet</p>
                <p className="text-xs text-[#52677A] mt-1">
                  Submit your first sanitation issue to see live tracking updates here.
                </p>
                <button
                  type="button"
                  onClick={() => setActivePage('report')}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#27AE75] hover:bg-[#1E8E5E] rounded-md"
                >
                  Report Sanitation Issue
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E2E8F0]">
                {myComplaints.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedComplaintId(item.id)}
                    className="px-6 py-4 hover:bg-[#F8FAFC] cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <SafeImage
                        src={item.afterPhotoUrl ?? item.beforePhotoUrl}
                        alt={item.category}
                        className="w-14 h-14 rounded-md object-cover border border-[#E2E8F0] shrink-0"
                        emptyLabel="No Photo"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#52677A]">
                          <span className="font-mono font-semibold text-[#142B45] tabular-nums">
                            {item.id}
                          </span>
                          <span>·</span>
                          <span>{item.wardName}</span>
                          <span>·</span>
                          <span className="font-mono tabular-nums">
                            {formatShortDate(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#172B3A] mt-0.5 truncate">
                          {item.category} — {item.location}
                        </p>
                        <p className="text-xs text-[#52677A] mt-0.5 truncate">
                          Latest update: {item.timeline[item.timeline.length - 1]?.summary}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <StatusText status={item.status} />
                      <span className="text-xs font-semibold text-[#1D4262]">Details →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {activePage === 'report' && (
        <ReportIssueForm
          onViewMyComplaints={(highlightId) => {
            setActivePage('my-complaints');
            if (highlightId) setSelectedComplaintId(highlightId);
          }}
        />
      )}

      {activePage === 'my-complaints' && (
        <div className="space-y-5">
          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#52677A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Complaint ID, location, or category..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-md focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#142B45]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F4F7FA] rounded-md">
              {['ALL', 'Submitted', 'Assigned', 'In Progress', 'Completed', 'Resolved'].map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-white text-[#142B45] shadow-sm font-semibold'
                        : 'text-[#52677A] hover:text-[#142B45]'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st === 'Completed' ? 'Pending Verify' : st}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Complaints Table */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
            {filteredMyComplaints.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-sm font-semibold text-[#142B45]">
                  No matching complaints found
                </p>
                <p className="text-xs text-[#52677A] mt-1">
                  Try clearing your filters or submit a new sanitation issue.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('ALL');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-[#142B45] border border-[#CBD5E1] rounded-md hover:bg-[#F4F7FA]"
                  >
                    Clear Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePage('report')}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-[#27AE75] hover:bg-[#1E8E5E] rounded-md"
                  >
                    Report New Issue
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-[#52677A]">
                      <th className="py-3 px-4">Complaint ID</th>
                      <th className="py-3 px-4">Category &amp; Location</th>
                      <th className="py-3 px-4">Ward</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs">
                    {filteredMyComplaints.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedComplaintId(c.id)}
                        className="hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-semibold text-[#142B45] whitespace-nowrap tabular-nums">
                          {c.id}
                        </td>
                        <td className="py-3.5 px-4 min-w-[220px]">
                          <p className="font-semibold text-[#172B3A]">{c.category}</p>
                          <p className="text-[#52677A] mt-0.5 truncate max-w-xs">{c.location}</p>
                        </td>
                        <td className="py-3.5 px-4 text-[#52677A] whitespace-nowrap">
                          {c.wardName}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-[#52677A] whitespace-nowrap">
                          {formatShortDate(c.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <PriorityText priority={c.priority} />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusText status={c.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="font-semibold text-[#1D4262] hover:text-[#27AE75]">
                            {c.afterPhotoUrl ? 'Before & After →' : 'Track →'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activePage === 'sms-alerts' && (
        <SmsNotificationsPanel
          scope="citizen"
          onSelectComplaint={(id) => setSelectedComplaintId(id)}
        />
      )}

      {activePage === 'map' && (
        <WardMapView onSelectComplaint={(id) => setSelectedComplaintId(id)} />
      )}

      <ComplaintDetailModal
        complaintId={selectedComplaintId}
        onClose={() => setSelectedComplaintId(null)}
        mode="citizen"
      />
    </AppShell>
  );
};
