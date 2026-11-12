const HEALTH_KEYWORDS = [
  'mg', 'mcg', 'ml', 'vitamin', 'ingredient', 'tablet', 'dose', 'dosage',
  'calcium', 'iron', 'medicine', 'drug', 'supplement', 'protein', 'nutrient',
  'capsule', 'daily value', 'calories', 'sodium', 'prescription', 'pharmacy'
];

const LEGAL_KEYWORDS = [
  'clause', 'agreement', 'contract', 'shall', 'hereby', 'party', 'parties',
  'obligation', 'liability', 'breach', 'plaintiff', 'defendant', 'terms of service',
  'indemnification', 'jurisdiction', 'warranties', 'confidentiality', 'termination'
];

const ACADEMIC_KEYWORDS = [
  'formula', 'equation', 'integral', 'theorem', 'variable', 'coefficient',
  'function', 'derivative', 'proof', 'algorithm', 'hypothesis', 'lemma',
  'matrix', 'probability', 'distribution', 'velocity', 'calculus', 'thermodynamics'
];

/**
 * Escapes regex special characters in a string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Counts occurrences of keywords in text using word boundaries to avoid false substring matches.
 */
function countKeywordMatches(text, keywords) {
  let count = 0;
  for (const keyword of keywords) {
    // Word boundary or common number+unit patterns (e.g., 500mg, 10ml)
    const regex = keyword === 'mg' || keyword === 'mcg' || keyword === 'ml'
      ? new RegExp(`(?:\\b|\\d+)${escapeRegex(keyword)}\\b`, 'gi')
      : new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi');

    const matches = text.match(regex);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

function calculateScores(text) {
  if (!text || typeof text !== 'string') {
    return { healthScore: 0, legalScore: 0, academicScore: 0 };
  }

  const healthScore = countKeywordMatches(text, HEALTH_KEYWORDS);
  const legalScore = countKeywordMatches(text, LEGAL_KEYWORDS);
  const academicScore = countKeywordMatches(text, ACADEMIC_KEYWORDS);

  return { healthScore, legalScore, academicScore };
}

/**
 * Detects the document category (HEALTH, LEGAL, ACADEMIC) from extracted text.
 * @param {string} text - Extracted OCR text.
 * @returns {{mode: 'HEALTH'|'LEGAL'|'ACADEMIC'|null, confidence: 'HIGH'|'LOW', score?: number, reason?: string}}
 */
export function detectMode(text) {
  if (!text || text.trim().length === 0) {
    return {
      mode: null,
      confidence: 'LOW',
      reason: 'Empty text provided.'
    };
  }

  const scores = calculateScores(text);
  const maxScore = Math.max(scores.healthScore, scores.legalScore, scores.academicScore);

  // Confidence check: require at least 2 distinct keyword occurrences
  if (maxScore < 2) {
    return {
      mode: null,
      confidence: 'LOW',
      reason: 'Not enough keywords to determine mode deterministically. AI fallback recommended.'
    };
  }

  if (scores.healthScore > scores.legalScore && scores.healthScore > scores.academicScore) {
    return {
      mode: 'HEALTH',
      confidence: 'HIGH',
      score: scores.healthScore
    };
  }

  if (scores.legalScore > scores.healthScore && scores.legalScore > scores.academicScore) {
    return {
      mode: 'LEGAL',
      confidence: 'HIGH',
      score: scores.legalScore
    };
  }

  if (scores.academicScore > scores.healthScore && scores.academicScore > scores.legalScore) {
    return {
      mode: 'ACADEMIC',
      confidence: 'HIGH',
      score: scores.academicScore
    };
  }

  // Tie or unclear match
  return {
    mode: null,
    confidence: 'LOW',
    reason: 'Score tie or ambiguous match. AI fallback recommended.'
  };
}