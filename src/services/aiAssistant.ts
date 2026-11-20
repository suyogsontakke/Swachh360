import {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  HotspotSummary,
  RuleBasedSuggestion,
  SimulatedImageAnalysis,
} from '../types';
import { NAGPUR_WARDS } from '../data/seedData';

const CATEGORY_RULES: Array<{ category: ComplaintCategory; keywords: string[] }> = [
  {
    category: 'Blocked Drain',
    keywords: [
      'drain',
      'nallah',
      'gutter',
      'sewage',
      'choked',
      'clogged',
      'stagnant',
      'culvert',
      'waterlogging',
      'stormwater',
      'silt',
      'manhole',
    ],
  },
  {
    category: 'Overflowing Public Bin',
    keywords: [
      'public bin',
      'dustbin',
      'container',
      'steel bin',
      'dumpster',
      'bin overflow',
      'bin point',
      'bin full',
    ],
  },
  {
    category: 'Uncollected Waste',
    keywords: [
      'uncollected',
      'tipper',
      'skipped',
      'collection vehicle',
      'missed pickup',
      'door-to-door',
      'not collected',
      'days without pickup',
      'van did not come',
    ],
  },
  {
    category: 'Garbage Overflow',
    keywords: [
      'garbage',
      'trash',
      'waste',
      'pile',
      'heap',
      'overflow',
      'litter',
      'dumping',
      'rubbish',
      'stray',
      'smell',
      'foul',
    ],
  },
  {
    category: 'Other Sanitation Issue',
    keywords: ['toilet', 'slab', 'broken', 'carcass', 'hygiene', 'pit', 'sweeping', 'latrine'],
  },
];

const CRITICAL_SIGNALS = [
  'school',
  'anganwadi',
  'hospital',
  'clinic',
  'stagnant',
  'sewage',
  'mosquito',
  'health',
  'flooding',
  'blocking road',
  'manhole',
];

const HIGH_SIGNALS = [
  'days',
  'overflow',
  'foul',
  'smell',
  'stray',
  'market',
  'bazaar',
  'choked',
  'clogged',
  'piled',
];

export function analyzeComplaintRuleBased(
  description: string,
  location: string,
  wardId: string,
  existingComplaints: Complaint[]
): RuleBasedSuggestion {
  const combined = `${description} ${location}`.toLowerCase();
  const scores: Array<{ category: ComplaintCategory; matched: string[] }> = CATEGORY_RULES.map(
    (rule) => {
      const matched = rule.keywords.filter((kw) => combined.includes(kw));
      return { category: rule.category, matched };
    }
  );

  scores.sort((a, b) => b.matched.length - a.matched.length);
  const top = scores[0];

  const suggestedCategory: ComplaintCategory =
    top && top.matched.length > 0 ? top.category : 'Garbage Overflow';
  const categoryConfidence: RuleBasedSuggestion['categoryConfidence'] =
    top && top.matched.length >= 2
      ? 'High'
      : top && top.matched.length === 1
      ? 'Moderate'
      : 'Baseline';

  const matchedCritical = CRITICAL_SIGNALS.filter((s) => combined.includes(s));
  const matchedHigh = HIGH_SIGNALS.filter((s) => combined.includes(s));

  let recommendedPriority: ComplaintPriority = 'Medium';
  let priorityReason = 'Standard civic sanitation priority based on ward baseline.';

  if (matchedCritical.length > 0 || (suggestedCategory === 'Blocked Drain' && matchedHigh.length > 0)) {
    recommendedPriority = 'Critical';
    priorityReason = `Matched high-risk public health keywords (${[
      ...matchedCritical,
      ...matchedHigh.slice(0, 1),
    ].join(', ')}).`;
  } else if (
    matchedHigh.length >= 1 ||
    suggestedCategory === 'Overflowing Public Bin' ||
    suggestedCategory === 'Blocked Drain'
  ) {
    recommendedPriority = 'High';
    priorityReason =
      matchedHigh.length > 0
        ? `Urgency terms detected (${matchedHigh.slice(0, 3).join(', ')}) in high-density ward.`
        : `${suggestedCategory} carries rapid spillover risk in dense lanes.`;
  } else if (description.trim().length > 0 && description.trim().length < 30) {
    recommendedPriority = 'Low';
    priorityReason = 'Brief report with no acute public-health escalation keywords yet.';
  }

  // Duplicate detection against open complaints in same ward
  const locationTokens = location
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !['near', 'lane', 'road', 'ward', 'block'].includes(t));

  const possibleDuplicates = existingComplaints
    .filter((c) => c.wardId === wardId && c.status !== 'Resolved')
    .map((c) => {
      const targetLoc = `${c.location} ${c.description}`.toLowerCase();
      const sharedTokens = locationTokens.filter((token) => targetLoc.includes(token));
      const sameCategory = c.category === suggestedCategory;
      if (sharedTokens.length > 0 || (sameCategory && locationTokens.length === 0)) {
        return {
          complaintId: c.id,
          location: c.location,
          status: c.status,
          similarityReason:
            sharedTokens.length > 0
              ? `Same ward & matching landmark terms (${sharedTokens.slice(0, 2).join(', ')})`
              : `Open ${c.category} complaint already active in ${c.wardName}`,
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, 3);

  return {
    suggestedCategory,
    categoryConfidence,
    matchedKeywords: top?.matched ?? [],
    recommendedPriority,
    priorityReason,
    possibleDuplicates,
    engineNotice:
      'Rule-Based Prototype Logic — Designed for Gemini API structured classification in production.',
  };
}

export function simulateImageClassification(
  fileNameOrHint: string,
  fallbackCategory?: ComplaintCategory
): SimulatedImageAnalysis {
  const lower = fileNameOrHint.toLowerCase();
  if (lower.includes('drain') || lower.includes('nallah') || lower.includes('gutter')) {
    return {
      predictedLabel: 'Blocked Drain',
      estimatedSeverity: 'Critical',
      detectedIndicators: [
        'Surface drainage obstruction pattern (simulated)',
        'Mixed plastic & silt accumulation profile',
        'Stagnation hygiene risk near residential kerb',
      ],
      recommendedCrewAction: 'Dispatch 2-member desilting crew with hook tools and disinfectant.',
      simulationNotice:
        'Simulated Prototype Classification (Rule-Based) — Live computer vision runs when Gemini Vision API is connected.',
    };
  }
  if (lower.includes('bin') || lower.includes('container')) {
    return {
      predictedLabel: 'Overflowing Public Bin',
      estimatedSeverity: 'High',
      detectedIndicators: [
        'Municipal container capacity exceeded (simulated)',
        'Secondary waste bags stacked along base perimeter',
      ],
      recommendedCrewAction: 'Route nearest mini-compactor / tipper pickup and sweep 5m perimeter.',
      simulationNotice:
        'Simulated Prototype Classification (Rule-Based) — Live computer vision runs when Gemini Vision API is connected.',
    };
  }

  const label = fallbackCategory ?? 'Garbage Overflow';
  return {
    predictedLabel: label,
    estimatedSeverity: 'High',
    detectedIndicators: [
      'Uncontained mixed household refuse cluster (simulated)',
      'Roadside footpath encroachment pattern',
    ],
    recommendedCrewAction: 'Assign ward morning tipper crew for manual clearance and lime dusting.',
    simulationNotice:
      'Simulated Prototype Classification (Rule-Based) — Live computer vision runs when Gemini Vision API is connected.',
  };
}

export function computeRecurringHotspots(complaints: Complaint[]): HotspotSummary[] {
  const byWard = new Map<string, Complaint[]>();
  for (const c of complaints) {
    const list = byWard.get(c.wardId) ?? [];
    list.push(c);
    byWard.set(c.wardId, list);
  }

  const summaries: HotspotSummary[] = [];

  for (const ward of NAGPUR_WARDS) {
    const list = byWard.get(ward.id) ?? [];
    if (list.length === 0) continue;

    const openReports = list.filter((c) => c.status !== 'Resolved').length;
    const categoryCount = new Map<ComplaintCategory, number>();
    for (const item of list) {
      categoryCount.set(item.category, (categoryCount.get(item.category) ?? 0) + 1);
    }

    let dominantCategory: ComplaintCategory = 'Garbage Overflow';
    let maxCatCount = 0;
    for (const [cat, count] of categoryCount.entries()) {
      if (count > maxCatCount) {
        maxCatCount = count;
        dominantCategory = cat;
      }
    }

    const riskLevel: HotspotSummary['riskLevel'] =
      list.length >= 3 || openReports >= 2
        ? 'Recurring Critical'
        : openReports >= 1
        ? 'High'
        : 'Elevated';

    const recommendedAction =
      dominantCategory === 'Blocked Drain'
        ? 'Schedule weekly preventive desilting and mesh grate installation.'
        : dominantCategory === 'Overflowing Public Bin'
        ? 'Increase bin pickup frequency to twice daily during peak market hours.'
        : 'Add secondary morning tipper round and place segregation signage.';

    summaries.push({
      wardId: ward.id,
      wardName: `${ward.code} — ${ward.name}`,
      totalReports: list.length,
      openReports,
      dominantCategory,
      riskLevel,
      recommendedAction,
    });
  }

  return summaries.sort((a, b) => b.totalReports - a.totalReports || b.openReports - a.openReports);
}
