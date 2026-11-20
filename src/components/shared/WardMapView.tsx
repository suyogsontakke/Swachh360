import React, { useMemo, useState } from 'react';
import { ExternalLink, Info, MapPin } from 'lucide-react';
import { NAGPUR_WARDS } from '../../data/seedData';
import { useApp } from '../../context/AppContext';
import { Complaint, ComplaintStatus } from '../../types';
import { formatShortDate, PriorityText, StatusText } from '../common/StatusIndicators';

interface WardMapViewProps {
  onSelectComplaint: (complaintId: string) => void;
}

const STATUS_MARKER_COLORS: Record<ComplaintStatus, string> = {
  Submitted: '#DC2626',
  Assigned: '#1D4262',
  'In Progress': '#D97706',
  Completed: '#0F766E',
  Resolved: '#27AE75',
};

export const WardMapView: React.FC<WardMapViewProps> = ({ onSelectComplaint }) => {
  const { complaints } = useApp();
  const [selectedWardId, setSelectedWardId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (selectedWardId !== 'ALL' && c.wardId !== selectedWardId) return false;
      if (selectedStatus !== 'ALL' && c.status !== selectedStatus) return false;
      return true;
    });
  }, [complaints, selectedWardId, selectedStatus]);

  const focusedComplaint: Complaint | undefined = useMemo(
    () => filteredComplaints.find((c) => c.id === focusedId) ?? filteredComplaints[0],
    [filteredComplaints, focusedId]
  );

  const wardCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of complaints) {
      if (c.status !== 'Resolved') {
        map.set(c.wardId, (map.get(c.wardId) ?? 0) + 1);
      }
    }
    return map;
  }, [complaints]);

  return (
    <div className="space-y-6">
      {/* Transparent Map Scope Notice */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 text-xs text-[#52677A]">
          <Info className="w-4 h-4 text-[#1D4262] shrink-0 mt-0.5" />
          <span>
            <strong className="text-[#142B45]">
              Schematic Nagpur Ward Map (Demonstration Coordinates):
            </strong>{' '}
            Interactive ward schematic plotting live application complaints. Ready for Google Maps
            or municipal GIS tiles when an API key is configured.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            value={selectedWardId}
            onChange={(e) => setSelectedWardId(e.target.value)}
            aria-label="Filter map by ward"
            className="px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-[#172B3A]"
          >
            <option value="ALL">All 8 Demo Wards</option>
            {NAGPUR_WARDS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter map by status"
            className="px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-[#172B3A]"
          >
            <option value="ALL">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Pending Verification</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Map Canvas + Location List Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Schematic Interactive Ward Map */}
        <div className="xl:col-span-7 bg-white border border-[#E2E8F0] rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-[#142B45]">
                Nagpur Urban Sanitation Zones (Schematic)
              </h2>
              <p className="text-xs text-[#52677A] mt-0.5">
                Click any ward sector or complaint marker to inspect details
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-[#52677A]">
              Showing {filteredComplaints.length} of {complaints.length} records
            </span>
          </div>

          <div className="relative w-full aspect-[4/3] bg-[#EDF2F7] rounded-md border border-[#CBD5E1] overflow-hidden">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full select-none"
              role="img"
              aria-label="Schematic map of 8 Nagpur demonstration wards with sanitation complaint markers"
            >
              {/* Subtle municipal grid */}
              <defs>
                <pattern id="civicGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path
                    d="M 10 0 L 0 0 0 10"
                    fill="none"
                    stroke="#CBD5E1"
                    strokeWidth="0.25"
                  />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#civicGrid)" />

              {/* Schematic arterial roads & Nag River drain corridor */}
              <path
                d="M 4 50 Q 32 45, 55 52 T 96 47"
                fill="none"
                stroke="#93C5FD"
                strokeWidth="1.4"
                strokeDasharray="2 1.2"
              />
              <path
                d="M 43 4 L 46 96"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="1.2"
              />
              <path
                d="M 6 38 L 96 40"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="1"
              />

              {/* Ward Polygons */}
              {NAGPUR_WARDS.map((ward) => {
                const isSelected = selectedWardId === ward.id;
                const openInWard = wardCounts.get(ward.id) ?? 0;
                return (
                  <g
                    key={ward.id}
                    onClick={() =>
                      setSelectedWardId((prev) => (prev === ward.id ? 'ALL' : ward.id))
                    }
                    className="cursor-pointer"
                  >
                    <polygon
                      points={ward.polygonPoints}
                      fill={isSelected ? '#142B45' : '#FFFFFF'}
                      fillOpacity={isSelected ? 0.14 : 0.78}
                      stroke={isSelected ? '#142B45' : '#94A3B8'}
                      strokeWidth={isSelected ? 0.75 : 0.45}
                    />
                    <text
                      x={ward.mapCenter.x}
                      y={ward.mapCenter.y - 3.5}
                      textAnchor="middle"
                      fontSize="2.7"
                      fontWeight="700"
                      fill="#142B45"
                    >
                      {ward.code}
                    </text>
                    <text
                      x={ward.mapCenter.x}
                      y={ward.mapCenter.y - 0.5}
                      textAnchor="middle"
                      fontSize="2.0"
                      fill="#52677A"
                    >
                      {ward.name}
                    </text>
                    {openInWard > 0 && (
                      <text
                        x={ward.mapCenter.x}
                        y={ward.mapCenter.y + 11}
                        textAnchor="middle"
                        fontSize="1.85"
                        fill="#1D4262"
                      >
                        {openInWard} open
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Complaint Markers */}
              {filteredComplaints.map((c) => {
                const isFocused = focusedComplaint?.id === c.id;
                const color = STATUS_MARKER_COLORS[c.status];
                return (
                  <g
                    key={c.id}
                    transform={`translate(${c.coordinates.x}, ${c.coordinates.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedId(c.id);
                    }}
                    className="cursor-pointer"
                  >
                    {isFocused && (
                      <circle
                        r="3.8"
                        fill={color}
                        fillOpacity="0.22"
                        stroke={color}
                        strokeWidth="0.45"
                      />
                    )}
                    <circle
                      r={isFocused ? '2.1' : '1.65'}
                      fill={color}
                      stroke="#FFFFFF"
                      strokeWidth="0.55"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Accessible Color + Label Legend */}
          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs text-[#52677A]">
            <div className="flex flex-wrap items-center gap-4">
              {(Object.entries(STATUS_MARKER_COLORS) as Array<[ComplaintStatus, string]>).map(
                ([status, hex]) => (
                  <span key={status} className="inline-flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: hex }}
                    />
                    <span>{status === 'Completed' ? 'Pending Verify' : status}</span>
                  </span>
                )
              )}
            </div>
            <span className="text-[11px]">Dashed blue line: Schematic drainage corridor</span>
          </div>

          {/* Selected Marker Quick Card */}
          {focusedComplaint && (
            <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#52677A]">
                  <span className="font-mono font-semibold text-[#142B45]">
                    {focusedComplaint.id}
                  </span>
                  <span>·</span>
                  <span>{focusedComplaint.wardName}</span>
                  <span>·</span>
                  <StatusText status={focusedComplaint.status} compact />
                </div>
                <p className="text-sm font-semibold text-[#172B3A] mt-1 truncate">
                  {focusedComplaint.category} — {focusedComplaint.location}
                </p>
                <p className="text-xs font-mono text-[#52677A] mt-0.5 tabular-nums">
                  {focusedComplaint.coordinates.approxLat}, {focusedComplaint.coordinates.approxLng}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectComplaint(focusedComplaint.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#142B45] hover:bg-[#1D4262] rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                Inspect Ticket
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Synchronized Location Directory */}
        <div className="xl:col-span-5 bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-base font-bold text-[#142B45]">Location Directory</h2>
            <span className="text-xs font-mono tabular-nums text-[#52677A]">
              {filteredComplaints.length} locations
            </span>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <MapPin className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#142B45]">
                No complaints match this filter
              </p>
              <p className="text-xs text-[#52677A] mt-1">
                Reset the ward or status filter to view all plotted locations.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedWardId('ALL');
                  setSelectedStatus('ALL');
                }}
                className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-[#142B45] border border-[#CBD5E1] rounded-md hover:bg-[#F4F7FA]"
              >
                Reset Map Filters
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#E2E8F0] max-h-[560px] overflow-y-auto">
              {filteredComplaints.map((c) => {
                const active = focusedComplaint?.id === c.id;
                return (
                  <li
                    key={c.id}
                    onClick={() => setFocusedId(c.id)}
                    className={`px-5 py-3.5 cursor-pointer transition-colors ${
                      active ? 'bg-[#F4F7FA]' : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-semibold text-[#142B45] tabular-nums">
                        {c.id}
                      </span>
                      <StatusText status={c.status} compact />
                    </div>
                    <p className="text-sm font-semibold text-[#172B3A] mt-1">{c.location}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 text-xs text-[#52677A]">
                      <span>
                        {c.category} · {c.wardName}
                      </span>
                      <div className="flex items-center gap-3">
                        <PriorityText priority={c.priority} />
                        <span className="font-mono tabular-nums">
                          {formatShortDate(c.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectComplaint(c.id);
                        }}
                        className="text-xs font-semibold text-[#1D4262] hover:text-[#27AE75] transition-colors"
                      >
                        Open full details →
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
