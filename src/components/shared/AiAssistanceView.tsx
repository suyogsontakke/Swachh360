import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CopyCheck,
  Image as ImageIcon,
  Info,
  MapPinned,
  Sparkles,
  Upload,
} from 'lucide-react';
import { NAGPUR_WARDS, SAMPLE_PHOTOS } from '../../data/seedData';
import { useApp } from '../../context/AppContext';
import {
  analyzeComplaintRuleBased,
  computeRecurringHotspots,
  simulateImageClassification,
} from '../../services/aiAssistant';
import { storageService } from '../../services/repository';
import { PriorityText, SafeImage, StatusText } from '../common/StatusIndicators';

interface AiAssistanceViewProps {
  onSelectComplaint?: (complaintId: string) => void;
}

export const AiAssistanceView: React.FC<AiAssistanceViewProps> = ({ onSelectComplaint }) => {
  const { complaints } = useApp();

  // 1. Live Rule-Based Triage Sandbox
  const [sampleText, setSampleText] = useState(
    'Stormwater drain behind Indora Primary School has been choked with silt and plastic wrappers for 3 days, causing stagnant water.'
  );
  const [sampleLocation, setSampleLocation] = useState('Behind Indora Primary School Gate');
  const [sampleWardId, setSampleWardId] = useState('W-14');

  const liveTriage = useMemo(
    () => analyzeComplaintRuleBased(sampleText, sampleLocation, sampleWardId, complaints),
    [sampleText, sampleLocation, sampleWardId, complaints]
  );

  // 2. Simulated Image Classification Preview
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string>(SAMPLE_PHOTOS.drainBefore);
  const [previewFileName, setPreviewFileName] = useState<string>('sanitation_drain_before.jpg');
  const [uploadError, setUploadError] = useState<string>('');

  const simulatedVision = useMemo(
    () => simulateImageClassification(previewFileName),
    [previewFileName]
  );

  // 3. Live Duplicate Scan across open complaints
  const duplicatePairs = useMemo(() => {
    const open = complaints.filter((c) => c.status !== 'Resolved');
    const grouped = new Map<string, typeof open>();
    for (const c of open) {
      const key = `${c.wardId}::${c.category}`;
      const arr = grouped.get(key) ?? [];
      arr.push(c);
      grouped.set(key, arr);
    }
    const clusters: Array<{
      wardName: string;
      category: string;
      items: typeof open;
      reason: string;
    }> = [];

    for (const items of grouped.values()) {
      if (items.length >= 2) {
        clusters.push({
          wardName: items[0].wardName,
          category: items[0].category,
          items,
          reason: `${items.length} active complaints in the same ward & category — verify if same physical spot before dual dispatch.`,
        });
      }
    }

    // Also detect same-ward active proximity clusters even across categories
    const byWard = new Map<string, typeof open>();
    for (const c of open) {
      const arr = byWard.get(c.wardId) ?? [];
      arr.push(c);
      byWard.set(c.wardId, arr);
    }
    for (const items of byWard.values()) {
      if (items.length >= 2 && !clusters.some((cl) => cl.wardName === items[0].wardName)) {
        clusters.push({
          wardName: items[0].wardName,
          category: 'Multiple Categories',
          items,
          reason: `${items.length} active open tickets in ${items[0].wardName} — candidate for combined crew routing.`,
        });
      }
    }

    return clusters;
  }, [complaints]);

  // 4. Recurring Hotspots from real application records
  const hotspots = useMemo(() => computeRecurringHotspots(complaints), [complaints]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    try {
      const url = await storageService.processPhotoFile(file);
      setPreviewPhotoUrl(url);
      setPreviewFileName(file.name);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to process image.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Transparent Prototype Architecture Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-[#142B45] text-[#27AE75] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#142B45]">
              Civic Intelligence &amp; Gemini API Readiness Hub
            </h2>
            <p className="text-xs text-[#52677A] mt-1 max-w-3xl leading-relaxed">
              This module demonstrates SWACHH360&apos;s triage, duplicate detection, and hotspot
              identification pipeline. All outputs below currently run using{' '}
              <strong className="text-[#142B45]">
                deterministic rule-based prototype logic and simulated vision previews
              </strong>
              — clearly separated so a server-side Gemini API integration can replace the rules
              adapter without UI rewrites.
            </p>
          </div>
        </div>
      </div>

      {/* Row 1: Category/Priority Advisor + Simulated Image Classification */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rule-Based Category & Priority Advisor */}
        <section className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
            <div>
              <h3 className="text-sm font-bold text-[#142B45]">
                Complaint Category &amp; Priority Recommender
              </h3>
              <p className="text-xs text-[#52677A]">
                Rule-Based Keyword &amp; Risk Engine (Prototype)
              </p>
            </div>
            <span className="text-[11px] font-mono text-[#1D4262]">Rule-Based</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#52677A] mb-1">Ward</label>
                <select
                  value={sampleWardId}
                  onChange={(e) => setSampleWardId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-md"
                >
                  {NAGPUR_WARDS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} — {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#52677A] mb-1">
                  Landmark / Location
                </label>
                <input
                  type="text"
                  value={sampleLocation}
                  onChange={(e) => setSampleLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#52677A] mb-1">
                Test Citizen Complaint Description
              </label>
              <textarea
                rows={3}
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-md focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#142B45]"
              />
            </div>
          </div>

          {/* Live Output */}
          <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#52677A]">Suggested Category</span>
              <span className="font-semibold text-[#142B45]">
                {liveTriage.suggestedCategory} ({liveTriage.categoryConfidence} match)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#52677A]">Recommended Priority</span>
              <PriorityText priority={liveTriage.recommendedPriority} />
            </div>
            <div>
              <span className="text-[#52677A]">Rationale: </span>
              <span className="text-[#172B3A]">{liveTriage.priorityReason}</span>
            </div>
            {liveTriage.matchedKeywords.length > 0 && (
              <div>
                <span className="text-[#52677A]">Matched Signals: </span>
                <span className="font-mono text-[#1D4262]">
                  {liveTriage.matchedKeywords.join(', ')}
                </span>
              </div>
            )}
            {liveTriage.possibleDuplicates.length > 0 && (
              <div className="pt-2 border-t border-[#E2E8F0] text-amber-800">
                <span className="font-semibold">Potential Duplicate Flagged: </span>
                {liveTriage.possibleDuplicates[0].complaintId} —{' '}
                {liveTriage.possibleDuplicates[0].similarityReason}
              </div>
            )}
          </div>
        </section>

        {/* Simulated Sanitation Image Classification */}
        <section className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
            <div>
              <h3 className="text-sm font-bold text-[#142B45]">
                Sanitation Image Classification Preview
              </h3>
              <p className="text-xs text-[#52677A]">
                Simulated Output — Ready for Gemini Vision API
              </p>
            </div>
            <span className="text-[11px] font-mono text-amber-700">Simulated</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div className="space-y-2.5">
              <SafeImage
                src={previewPhotoUrl}
                alt="Field sanitation photo preview"
                className="w-full h-40 object-cover rounded-md border border-[#E2E8F0]"
              />
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewPhotoUrl(SAMPLE_PHOTOS.drainBefore);
                    setPreviewFileName('sample_blocked_drain.jpg');
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium bg-[#F4F7FA] hover:bg-[#E2E8F0] text-[#142B45] rounded"
                >
                  Sample Drain
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewPhotoUrl(SAMPLE_PHOTOS.binOverflow);
                    setPreviewFileName('sample_public_bin_overflow.jpg');
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium bg-[#F4F7FA] hover:bg-[#E2E8F0] text-[#142B45] rounded"
                >
                  Sample Public Bin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewPhotoUrl(SAMPLE_PHOTOS.garbageBefore);
                    setPreviewFileName('sample_garbage_heap.jpg');
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium bg-[#F4F7FA] hover:bg-[#E2E8F0] text-[#142B45] rounded"
                >
                  Sample Garbage
                </button>
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4262] hover:text-[#27AE75] cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Test with local image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {uploadError && <p className="text-xs text-red-700">{uploadError}</p>}
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <p className="text-[#52677A]">Simulated Classification</p>
                <p className="text-sm font-bold text-[#142B45] mt-0.5">
                  {simulatedVision.predictedLabel}
                </p>
              </div>
              <div>
                <p className="text-[#52677A] mb-0.5">Estimated Severity</p>
                <PriorityText priority={simulatedVision.estimatedSeverity} />
              </div>
              <div>
                <p className="text-[#52677A] mb-1">Prototype Signals</p>
                <ul className="space-y-1 text-[#172B3A]">
                  {simulatedVision.detectedIndicators.map((ind) => (
                    <li key={ind}>· {ind}</li>
                  ))}
                </ul>
              </div>
              <div className="pt-2 border-t border-[#E2E8F0]">
                <p className="text-[#52677A]">Suggested Crew Action</p>
                <p className="text-[#172B3A] mt-0.5">{simulatedVision.recommendedCrewAction}</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-3 border-t border-[#E2E8F0] text-[11px] text-[#52677A]">
            <Info className="w-3.5 h-3.5 text-[#1D4262] shrink-0 mt-0.5" />
            <span>{simulatedVision.simulationNotice}</span>
          </div>
        </section>
      </div>

      {/* Row 2: Live Duplicate Detection + Recurring Sanitation Hotspots */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Duplicate Detection Queue */}
        <section className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-lg p-5">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0] mb-4">
            <div className="flex items-center gap-2">
              <CopyCheck className="w-4 h-4 text-[#1D4262]" />
              <h3 className="text-sm font-bold text-[#142B45]">
                Active Overlap &amp; Duplicate Clusters
              </h3>
            </div>
            <span className="text-xs font-mono tabular-nums text-[#52677A]">
              {duplicatePairs.length} found
            </span>
          </div>

          {duplicatePairs.length === 0 ? (
            <p className="text-xs text-[#52677A] py-6 text-center">
              No duplicate active complaint clusters detected across wards.
            </p>
          ) : (
            <div className="space-y-4">
              {duplicatePairs.map((cluster, idx) => (
                <div
                  key={`${cluster.wardName}-${idx}`}
                  className="pb-4 border-b border-[#E2E8F0] last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#142B45]">{cluster.wardName}</span>
                    <span className="text-[#52677A]">{cluster.category}</span>
                  </div>
                  <p className="text-xs text-[#52677A] mt-1">{cluster.reason}</p>
                  <ul className="mt-2 space-y-1.5">
                    {cluster.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => onSelectComplaint?.(item.id)}
                          className="font-mono text-[#1D4262] hover:text-[#27AE75] font-medium truncate text-left"
                        >
                          {item.id} · {item.location}
                        </button>
                        <StatusText status={item.status} compact />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recurring Sanitation Hotspots */}
        <section className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-lg p-5">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0] mb-4">
            <div className="flex items-center gap-2">
              <MapPinned className="w-4 h-4 text-[#27AE75]" />
              <h3 className="text-sm font-bold text-[#142B45]">
                Recurring Sanitation Hotspots (Live Data)
              </h3>
            </div>
            <span className="text-xs text-[#52677A]">Ranked by incident volume</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[11px] font-semibold text-[#52677A]">
                  <th className="py-2 pr-3">Ward</th>
                  <th className="py-2 px-3 text-right">Total</th>
                  <th className="py-2 px-3 text-right">Open</th>
                  <th className="py-2 px-3">Dominant Issue</th>
                  <th className="py-2 pl-3">Recommended Intervention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {hotspots.map((hs) => (
                  <tr key={hs.wardId} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 pr-3 font-semibold text-[#142B45] whitespace-nowrap">
                      {hs.wardName}
                      {hs.riskLevel === 'Recurring Critical' && (
                        <span className="ml-1.5 inline-flex items-center text-red-700 font-medium">
                          <AlertTriangle className="w-3 h-3 mr-0.5" />
                          Hotspot
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-[#172B3A]">
                      {hs.totalReports}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-700 font-semibold">
                      {hs.openReports}
                    </td>
                    <td className="py-3 px-3 text-[#172B3A] whitespace-nowrap">
                      {hs.dominantCategory}
                    </td>
                    <td className="py-3 pl-3 text-[#52677A] min-w-[200px]">
                      {hs.recommendedAction}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center gap-2 text-[11px] text-[#52677A]">
            <ImageIcon className="w-3.5 h-3.5 text-[#1D4262] shrink-0" />
            <span>
              Future Gemini Integration Plan: Combine multimodal vision verification (before/after
              delta scoring) with 30-day ward recurrence forecasting.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
