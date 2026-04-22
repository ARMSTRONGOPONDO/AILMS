export function buildFallbackReview(
  assignment: any,
  submissionText: string,
  extractedFileText: string
) {
  const combined = [submissionText, extractedFileText].filter(Boolean).join('\n\n').trim();
  const words = combined ? combined.split(/\s+/).filter(Boolean).length : 0;
  const kpis = assignment?.gradingKPIs?.length ? assignment.gradingKPIs : [
    { label: 'Content Accuracy', description: 'Factual correctness', weight: 40 },
    { label: 'Depth of Analysis', description: 'Detail and explanation', weight: 30 },
    { label: 'Clarity of Writing', description: 'Clear and coherent prose', weight: 30 }
  ];

  const lengthScore = words >= 250 ? 85 : words >= 120 ? 72 : words >= 60 ? 58 : 40;
  const hasNumbers = /\d/.test(combined);
  const hasMathOps = /[\+\-\*\/=]/.test(combined);

  const kpiBreakdown = kpis.map((k: any) => {
    let score = lengthScore;
    const label = String(k.label || '').toLowerCase();
    if (label.includes('accuracy') && (hasNumbers || hasMathOps)) score += 8;
    if (label.includes('clarity') && combined.includes('.')) score += 5;
    if (label.includes('analysis') && words > 100) score += 7;
    score = Math.max(35, Math.min(92, score));
    return {
      kpiLabel: k.label,
      score,
      comment: `Automated fallback review based on structure and rubric signal detection for "${k.label}".`
    };
  });

  const weighted = kpiBreakdown.reduce((sum: number, k: any, i: number) => {
    const weight = Number(kpis[i]?.weight || 0);
    return sum + (k.score * weight);
  }, 0) / 100;
  const overallScore = Math.round(Math.max(0, Math.min(100, weighted || lengthScore)));
  const passingScore = Number(assignment?.passingScore ?? 50);

  return {
    overallScore,
    isPassing: overallScore >= passingScore,
    remarks: `AI fallback review generated because the primary model was unavailable or rate-limited. Your submission has ${words} words and was scored against the configured rubric signals. Expand explanation depth and show clearer step-by-step reasoning to improve your score.`,
    strengths: [
      words >= 80 ? 'Submission provides sufficient content for rubric-based review.' : 'Submission is concise and focused.',
      hasNumbers || hasMathOps ? 'Includes quantitative or calculation-oriented content.' : 'Addresses the task in plain language.',
      'Organized into readable sentence-level structure.'
    ],
    weaknesses: [
      words < 120 ? 'Add more detail to explain your reasoning and steps.' : 'Provide deeper justification for each key point.',
      'Include clearer evidence tied to each rubric criterion.'
    ],
    kpiBreakdown
  };
}
