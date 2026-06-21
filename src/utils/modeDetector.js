const HEALTH_KEYWORDS = ['mg', 'vitamin', 'ingredient', 'tablet', 'dose', 'calcium', 'iron', 'medicine', 'drug', 'supplement', 'protein', 'nutrient', 'capsule'];
const LEGAL_KEYWORDS = ['clause', 'agreement', 'contract', 'shall', 'hereby', 'party', 'obligation', 'liability', 'breach', 'plaintiff', 'defendant'];
const ACADEMIC_KEYWORDS = ['formula', 'equation', 'integral', 'theorem', 'variable', 'coefficient', 'function', 'derivative', 'proof', 'algorithm'];

function calculateScores(text) {
  const lowerText = text.toLowerCase();
  
  let healthScore = 0;
  let legalScore = 0;
  let academicScore = 0;
  
  HEALTH_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) healthScore++;
  });
  
  LEGAL_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) legalScore++;
  });
  
  ACADEMIC_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) academicScore++;
  });
  
  return { healthScore, legalScore, academicScore };
}

export function detectMode(text) {
  const scores = calculateScores(text);
  const maxScore = Math.max(scores.healthScore, scores.legalScore, scores.academicScore);
  
  // Confidence check: if highest score < 2, we're not sure
  if (maxScore < 2) {
    return {
      mode: null,
      confidence: 'LOW',
      reason: 'Not enough keywords. Gemini will decide.'
    };
  }
  
  // Enough confidence: determine mode
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
  
  // Default fallback
  return {
    mode: null,
    confidence: 'LOW',
    reason: 'No clear match. Gemini will decide.'
  };
}