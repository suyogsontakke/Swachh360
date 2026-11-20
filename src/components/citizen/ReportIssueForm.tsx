import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  ImagePlus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { COMPLAINT_CATEGORIES, NAGPUR_WARDS, SAMPLE_PHOTOS } from '../../data/seedData';
import { useApp } from '../../context/AppContext';
import { analyzeComplaintRuleBased } from '../../services/aiAssistant';
import { storageService } from '../../services/repository';
import { Complaint, ComplaintCategory } from '../../types';
import { PriorityText, SafeImage } from '../common/StatusIndicators';

interface ReportIssueFormProps {
  onViewMyComplaints: (highlightId?: string) => void;
}

export const ReportIssueForm: React.FC<ReportIssueFormProps> = ({ onViewMyComplaints }) => {
  const { complaints, submitComplaint, loginAsRole, currentUser } = useApp();

  const [category, setCategory] = useState<ComplaintCategory>('Garbage Overflow');
  const [wardId, setWardId] = useState<string>(currentUser?.wardId ?? 'W-14');
  const [location, setLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedRecord, setSubmittedRecord] = useState<Complaint | null>(null);

  const selectedWard = useMemo(
    () => NAGPUR_WARDS.find((w) => w.id === wardId) ?? NAGPUR_WARDS[0],
    [wardId]
  );

  const ruleSuggestion = useMemo(
    () => analyzeComplaintRuleBased(description, location, wardId, complaints),
    [description, location, wardId, complaints]
  );

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    setErrors((prev) => ({ ...prev, photo: '' }));
    try {
      const compressed = await storageService.processPhotoFile(file);
      setPhotoUrl(compressed);
      setPhotoFileName(file.name);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        photo: err instanceof Error ? err.message : 'Unable to process image.',
      }));
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!location.trim() || location.trim().length < 5) {
      nextErrors.location = 'Please enter a specific street, lane, or landmark (min. 5 characters).';
    }
    if (!description.trim() || description.trim().length < 15) {
      nextErrors.description =
        'Please describe the sanitation issue clearly (min. 15 characters) so crews bring the right tools.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const created = submitComplaint({
      category,
      wardId,
      location,
      description,
      beforePhotoUrl: photoUrl || undefined,
      priority: ruleSuggestion.recommendedPriority,
    });

    if (created) {
      setSubmittedRecord(created);
    }
  };

  const handleResetForm = () => {
    setSubmittedRecord(null);
    setLocation('');
    setDescription('');
    setPhotoUrl('');
    setPhotoFileName('');
    setErrors({});
  };

  if (submittedRecord) {
    return (
      <div className="max-w-2xl mx-auto bg-white border border-[#E2E8F0] rounded-lg p-6 sm:p-8">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#27AE75]/15 text-[#1E8E5E] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#1E8E5E]">Submission Confirmed</p>
            <h2 className="text-xl font-bold text-[#142B45] mt-0.5">
              Sanitation Complaint Registered
            </h2>
            <p className="text-sm text-[#52677A] mt-1">
              Your report has been saved to the municipal ledger and is immediately visible on the
              Supervisor Dashboard for worker dispatch.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-[#52677A]">Unique Complaint ID</p>
            <p className="font-mono text-sm font-bold text-[#142B45] mt-0.5 tabular-nums">
              {submittedRecord.id}
            </p>
          </div>
          <div>
            <p className="text-[#52677A]">Initial Status</p>
            <p className="text-sm font-semibold text-[#142B45] mt-0.5">{submittedRecord.status}</p>
          </div>
          <div>
            <p className="text-[#52677A]">Category</p>
            <p className="text-sm font-medium text-[#172B3A] mt-0.5">{submittedRecord.category}</p>
          </div>
          <div>
            <p className="text-[#52677A]">Ward &amp; Location</p>
            <p className="text-sm font-medium text-[#172B3A] mt-0.5">
              {submittedRecord.wardName} · {submittedRecord.location}
            </p>
          </div>
        </div>

        {submittedRecord.beforePhotoUrl && (
          <div className="mt-5">
            <p className="text-xs text-[#52677A] mb-1.5">Attached Site Evidence</p>
            <SafeImage
              src={submittedRecord.beforePhotoUrl}
              alt="Submitted complaint photograph"
              className="w-full h-48 object-cover rounded-md border border-[#E2E8F0]"
            />
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-[#E2E8F0] flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onViewMyComplaints(submittedRecord.id)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#142B45] hover:bg-[#1D4262] rounded-md transition-colors"
          >
            <FileCheck2 className="w-4 h-4" />
            Track in My Complaints
          </button>
          <button
            type="button"
            onClick={handleResetForm}
            className="px-4 py-2.5 text-xs font-semibold text-[#142B45] bg-white border border-[#CBD5E1] hover:bg-[#F4F7FA] rounded-md transition-colors"
          >
            Report Another Issue
          </button>
          <button
            type="button"
            onClick={() => loginAsRole('supervisor')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#1E8E5E] hover:text-[#142B45] ml-auto transition-colors"
          >
            Switch to Supervisor Portal
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Main Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="xl:col-span-8 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-6"
      >
        <div className="pb-4 border-b border-[#E2E8F0]">
          <h2 className="text-lg font-bold text-[#142B45]">Report a Sanitation Issue</h2>
          <p className="text-xs text-[#52677A] mt-1">
            Provide clear location details and a site photograph to accelerate ward crew dispatch.
          </p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-[#142B45] mb-2">
            1. Complaint Category <span className="text-red-600">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {COMPLAINT_CATEGORIES.map((cat) => {
              const selected = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`text-left px-3.5 py-2.5 rounded-md border text-xs font-medium transition-colors ${
                    selected
                      ? 'border-[#142B45] bg-[#142B45] text-white'
                      : 'border-[#CBD5E1] bg-white text-[#172B3A] hover:border-[#142B45]/50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ward & Specific Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ward-select" className="block text-xs font-semibold text-[#142B45] mb-1.5">
              2. Municipal Ward (Nagpur Demo) <span className="text-red-600">*</span>
            </label>
            <select
              id="ward-select"
              value={wardId}
              onChange={(e) => setWardId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-md text-[#172B3A] focus:outline-none focus:ring-2 focus:ring-[#142B45]"
            >
              {NAGPUR_WARDS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#52677A] mt-1">
              {selectedWard.zone} · {selectedWard.densityClass}
            </p>
          </div>

          <div>
            <label htmlFor="location-input" className="block text-xs font-semibold text-[#142B45] mb-1.5">
              3. Exact Street / Landmark <span className="text-red-600">*</span>
            </label>
            <input
              id="location-input"
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                if (errors.location) setErrors((prev) => ({ ...prev, location: '' }));
              }}
              placeholder="e.g., Near Indora Community Water Tank, Lane 3"
              className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-md text-[#172B3A] focus:outline-none focus:ring-2 focus:ring-[#142B45] ${
                errors.location ? 'border-red-500' : 'border-[#CBD5E1]'
              }`}
            />
            {errors.location && (
              <p className="text-xs text-red-700 mt-1" role="alert">
                {errors.location}
              </p>
            )}
          </div>
        </div>

        {/* Quick Landmark Fillers for Selected Ward */}
        <div>
          <p className="text-[11px] text-[#52677A] mb-1.5">
            Quick landmarks in {selectedWard.code} ({selectedWard.name}):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedWard.sampleLandmarks.map((lm) => (
              <button
                key={lm}
                type="button"
                onClick={() => {
                  setLocation(lm);
                  setErrors((prev) => ({ ...prev, location: '' }));
                }}
                className="px-2.5 py-1 text-xs bg-[#F4F7FA] hover:bg-[#E2E8F0] text-[#1D4262] rounded transition-colors"
              >
                + {lm}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="desc-input" className="text-xs font-semibold text-[#142B45]">
              4. Complaint Description <span className="text-red-600">*</span>
            </label>
            <span className="text-[11px] font-mono tabular-nums text-[#52677A]">
              {description.trim().length} chars
            </span>
          </div>
          <textarea
            id="desc-input"
            rows={4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
            }}
            placeholder="Describe severity, how many days the issue has persisted, and nearby schools, water tanks, or busy lanes..."
            className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-md text-[#172B3A] focus:outline-none focus:ring-2 focus:ring-[#142B45] ${
              errors.description ? 'border-red-500' : 'border-[#CBD5E1]'
            }`}
          />
          {errors.description && (
            <p className="text-xs text-red-700 mt-1" role="alert">
              {errors.description}
            </p>
          )}
        </div>

        {/* Photo Upload with Preview */}
        <div>
          <label className="block text-xs font-semibold text-[#142B45] mb-1.5">
            5. Site Evidence Photograph (Recommended)
          </label>

          {photoUrl ? (
            <div className="space-y-2">
              <div className="relative rounded-md overflow-hidden border border-[#E2E8F0]">
                <SafeImage
                  src={photoUrl}
                  alt="Complaint evidence preview"
                  className="w-full h-56 object-cover"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-[#52677A]">
                <span className="truncate font-mono">{photoFileName || 'Attached photo'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoUrl('');
                    setPhotoFileName('');
                  }}
                  className="inline-flex items-center gap-1 text-red-700 hover:text-red-800 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Photo
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-[#CBD5E1] rounded-lg p-5 bg-[#F8FAFC] text-center space-y-3">
              <ImagePlus className="w-7 h-7 text-[#52677A] mx-auto" />
              <div>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D4262] hover:bg-[#142B45] rounded-md cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingPhoto ? 'Processing image...' : 'Upload Photograph'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-[#52677A] mt-2">
                  JPG, PNG, or WebP up to 10 MB · Compressed automatically for fast sync
                </p>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0]">
                <p className="text-[11px] text-[#52677A] mb-2">
                  Testing on desktop? Attach a demonstration field photo:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl(SAMPLE_PHOTOS.garbageBefore);
                      setPhotoFileName('demo_garbage_overflow.jpg');
                    }}
                    className="px-2.5 py-1 text-xs bg-white border border-[#CBD5E1] hover:bg-[#F4F7FA] text-[#142B45] rounded"
                  >
                    Use Garbage Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl(SAMPLE_PHOTOS.drainBefore);
                      setPhotoFileName('demo_blocked_drain.jpg');
                    }}
                    className="px-2.5 py-1 text-xs bg-white border border-[#CBD5E1] hover:bg-[#F4F7FA] text-[#142B45] rounded"
                  >
                    Use Blocked Drain Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl(SAMPLE_PHOTOS.binOverflow);
                      setPhotoFileName('demo_public_bin.jpg');
                    }}
                    className="px-2.5 py-1 text-xs bg-white border border-[#CBD5E1] hover:bg-[#F4F7FA] text-[#142B45] rounded"
                  >
                    Use Public Bin Photo
                  </button>
                </div>
              </div>
            </div>
          )}
          {errors.photo && (
            <p className="text-xs text-red-700 mt-1" role="alert">
              {errors.photo}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-[#52677A]">
            Initial status will be set to <strong className="text-[#142B45]">Submitted</strong> and
            routed to Zone 4 &amp; 5 Supervisor.
          </p>
          <button
            type="submit"
            disabled={isUploadingPhoto}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#27AE75] hover:bg-[#1E8E5E] disabled:opacity-50 rounded-md transition-colors whitespace-nowrap"
          >
            Submit Complaint
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Side Rule-Based Civic Assistant */}
      <aside className="xl:col-span-4 bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#27AE75] shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-[#142B45]">Smart Report Assistant</h3>
              <p className="text-[11px] text-[#52677A]">Rule-Based Prototype · Gemini-Ready</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <p className="text-[#52677A]">Suggested Category</p>
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="font-semibold text-[#142B45]">
                {ruleSuggestion.suggestedCategory}
              </span>
              {ruleSuggestion.suggestedCategory !== category && description.trim().length >= 8 && (
                <button
                  type="button"
                  onClick={() => setCategory(ruleSuggestion.suggestedCategory)}
                  className="text-xs font-semibold text-[#27AE75] hover:text-[#1E8E5E] whitespace-nowrap"
                >
                  Apply Suggestion
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#52677A] mt-0.5">
              Match confidence: {ruleSuggestion.categoryConfidence}
              {ruleSuggestion.matchedKeywords.length > 0 &&
                ` (${ruleSuggestion.matchedKeywords.slice(0, 3).join(', ')})`}
            </p>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0]">
            <p className="text-[#52677A] mb-1">Recommended Priority</p>
            <PriorityText priority={ruleSuggestion.recommendedPriority} />
            <p className="text-[11px] text-[#52677A] mt-1 leading-relaxed">
              {ruleSuggestion.priorityReason}
            </p>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0]">
            <p className="text-[#52677A] font-medium mb-1.5">Duplicate Check ({selectedWard.code})</p>
            {ruleSuggestion.possibleDuplicates.length === 0 ? (
              <p className="text-[11px] text-[#1E8E5E]">
                No overlapping open complaints detected for this ward &amp; landmark.
              </p>
            ) : (
              <ul className="space-y-2">
                {ruleSuggestion.possibleDuplicates.map((dup) => (
                  <li
                    key={dup.complaintId}
                    className="p-2.5 rounded-md bg-amber-50/70 border border-amber-200 text-[11px]"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-mono">{dup.complaintId}</span>
                      <span>· {dup.status}</span>
                    </div>
                    <p className="text-amber-900 mt-0.5">{dup.location}</p>
                    <p className="text-amber-800/80 mt-0.5">{dup.similarityReason}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <p className="pt-3 border-t border-[#E2E8F0] text-[11px] text-[#52677A] leading-relaxed">
          {ruleSuggestion.engineNotice}
        </p>
      </aside>
    </div>
  );
};
