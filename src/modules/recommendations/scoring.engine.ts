import type { Candidate } from '../candidates/candidate.model.js';
import type { Job, RequiredSkill } from '../jobs/job.model.js';
import {
  DEFAULT_SCORING_WEIGHTS,
  type DimensionScore,
  type ScoreBreakdown,
  type ScoringWeights,
} from './recommendation.types.js';

export interface ScoreResult {
  isExcluded: boolean;
  exclusionReason?: string;
  overallScore: number;
  breakdown: {
    skills: string;
    experience: string;
    location: string;
    salary: string;
  };
  scoreBreakdown: ScoreBreakdown;
}

/**
 * Normalizes user-provided or default scoring weights so they sum to 100.
 */
export function normalizeWeights(weights?: Partial<ScoringWeights>): ScoringWeights {
  const merged: ScoringWeights = {
    skills: weights?.skills ?? DEFAULT_SCORING_WEIGHTS.skills,
    experience: weights?.experience ?? DEFAULT_SCORING_WEIGHTS.experience,
    location: weights?.location ?? DEFAULT_SCORING_WEIGHTS.location,
    salary: weights?.salary ?? DEFAULT_SCORING_WEIGHTS.salary,
  };

  const total = merged.skills + merged.experience + merged.location + merged.salary;
  if (total <= 0) {
    return { ...DEFAULT_SCORING_WEIGHTS };
  }

  return {
    skills: (merged.skills / total) * 100,
    experience: (merged.experience / total) * 100,
    location: (merged.location / total) * 100,
    salary: (merged.salary / total) * 100,
  };
}

/**
 * Calculates skill match score with hard-filter enforcement for must-have skills.
 */
export function calculateSkillScore(
  candidateSkills: string[],
  jobSkills: RequiredSkill[],
  weight: number
): { isExcluded: boolean; dimensionScore: DimensionScore; exclusionReason?: string } {
  const candidateSkillSet = new Set(
    candidateSkills.map((s) => s.trim().toLowerCase())
  );

  const mustHaves = jobSkills.filter((s) => s.mustHave);
  const niceToHaves = jobSkills.filter((s) => !s.mustHave);

  // Hard filter: Check if any must-have skill is missing
  const missingMustHaves = mustHaves.filter(
    (s) => !candidateSkillSet.has(s.name.trim().toLowerCase())
  );

  if (missingMustHaves.length > 0) {
    const missingNames = missingMustHaves.map((s) => s.name).join(', ');
    return {
      isExcluded: true,
      exclusionReason: `Missing must-have skill(s): ${missingNames}`,
      dimensionScore: {
        score: 0,
        max: round(weight),
        formatted: `0/${round(weight)}`,
        details: `Excluded due to missing must-have: ${missingNames}`,
      },
    };
  }

  // If no skills are required on the job posting, grant full skill points
  if (jobSkills.length === 0) {
    const roundedMax = round(weight);
    return {
      isExcluded: false,
      dimensionScore: {
        score: roundedMax,
        max: roundedMax,
        formatted: `${roundedMax}/${roundedMax}`,
        details: 'No specific skills required',
      },
    };
  }

  // Weight must-haves with weight 2 and nice-to-haves with weight 1
  const MUST_HAVE_WEIGHT = 2;
  const NICE_TO_HAVE_WEIGHT = 1;

  const matchedNiceToHaves = niceToHaves.filter((s) =>
    candidateSkillSet.has(s.name.trim().toLowerCase())
  );

  const totalPotentialPoints =
    mustHaves.length * MUST_HAVE_WEIGHT + niceToHaves.length * NICE_TO_HAVE_WEIGHT;
  const earnedPoints =
    mustHaves.length * MUST_HAVE_WEIGHT + matchedNiceToHaves.length * NICE_TO_HAVE_WEIGHT;

  const rawScore = totalPotentialPoints > 0
    ? (earnedPoints / totalPotentialPoints) * weight
    : weight;

  const finalScore = round(Math.min(rawScore, weight));
  const roundedMax = round(weight);

  return {
    isExcluded: false,
    dimensionScore: {
      score: finalScore,
      max: roundedMax,
      formatted: `${finalScore}/${roundedMax}`,
      details: `Matched ${mustHaves.length}/${mustHaves.length} must-haves, ${matchedNiceToHaves.length}/${niceToHaves.length} nice-to-haves`,
    },
  };
}

/**
 * Calculates experience score with proportional penalty for under-qualified candidates.
 */
export function calculateExperienceScore(
  candidateExp: number,
  minYearsExp: number,
  weight: number
): DimensionScore {
  const roundedMax = round(weight);

  if (minYearsExp <= 0 || candidateExp >= minYearsExp) {
    return {
      score: roundedMax,
      max: roundedMax,
      formatted: `${roundedMax}/${roundedMax}`,
      details: `${candidateExp} years experience meets or exceeds minimum requirement of ${minYearsExp} years`,
    };
  }

  // Proportional penalty for candidate below minimum experience
  const ratio = Math.max(0, candidateExp / minYearsExp);
  const score = round(ratio * weight);

  return {
    score,
    max: roundedMax,
    formatted: `${score}/${roundedMax}`,
    details: `${candidateExp} years experience is below required ${minYearsExp} years (${round(ratio * 100)}% of requirement)`,
  };
}

/**
 * Calculates location score: Exact match (full) > Remote Allowed (2/3) > Mismatch (0).
 */
export function calculateLocationScore(
  candidateLocation: string,
  jobLocation: string,
  remoteAllowed: boolean,
  weight: number
): DimensionScore {
  const roundedMax = round(weight);
  const cLoc = candidateLocation.trim().toLowerCase();
  const jLoc = jobLocation.trim().toLowerCase();

  // Exact location match or either is explicitly Remote
  if (cLoc === jLoc || jLoc === 'remote' || cLoc === 'remote') {
    return {
      score: roundedMax,
      max: roundedMax,
      formatted: `${roundedMax}/${roundedMax}`,
      details: `Location match (${candidateLocation})`,
    };
  }

  // Different location but remote is allowed
  if (remoteAllowed) {
    const remoteScore = round((2 / 3) * weight);
    return {
      score: remoteScore,
      max: roundedMax,
      formatted: `${remoteScore}/${roundedMax}`,
      details: `Location differs (${candidateLocation} vs ${jobLocation}), but remote is allowed`,
    };
  }

  // Mismatch and remote not allowed
  return {
    score: 0,
    max: roundedMax,
    formatted: `0/${roundedMax}`,
    details: `Location mismatch (${candidateLocation} vs ${jobLocation}) and on-site required`,
  };
}

/**
 * Calculates salary score based on expected salary vs job salary range.
 */
export function calculateSalaryScore(
  expectedSalary: number,
  salaryMin: number,
  salaryMax: number,
  weight: number
): DimensionScore {
  const roundedMax = round(weight);

  // Job pays at or above candidate expectation
  if (expectedSalary <= salaryMin) {
    return {
      score: roundedMax,
      max: roundedMax,
      formatted: `${roundedMax}/${roundedMax}`,
      details: `Job minimum ($${salaryMin.toLocaleString()}) meets/exceeds expectation ($${expectedSalary.toLocaleString()})`,
    };
  }

  // Expectation falls inside job salary range
  if (expectedSalary <= salaryMax) {
    const surplusRatio = (salaryMax - expectedSalary) / (salaryMax - salaryMin || 1);
    const scoreFraction = 0.7 + 0.3 * surplusRatio;
    const score = round(scoreFraction * weight);

    return {
      score,
      max: roundedMax,
      formatted: `${score}/${roundedMax}`,
      details: `Expectation ($${expectedSalary.toLocaleString()}) within range ($${salaryMin.toLocaleString()} - $${salaryMax.toLocaleString()})`,
    };
  }

  // Candidate expects more than job max budget
  const gapRatio = (expectedSalary - salaryMax) / expectedSalary;
  if (gapRatio >= 0.3) {
    return {
      score: 0,
      max: roundedMax,
      formatted: `0/${roundedMax}`,
      details: `Expectation ($${expectedSalary.toLocaleString()}) significantly exceeds maximum budget ($${salaryMax.toLocaleString()})`,
    };
  }

  // Moderate penalty for small expectation excess
  const score = round(weight * 0.5 * Math.pow(1 - gapRatio / 0.3, 2));
  return {
    score,
    max: roundedMax,
    formatted: `${score}/${roundedMax}`,
    details: `Expectation ($${expectedSalary.toLocaleString()}) slightly exceeds maximum budget ($${salaryMax.toLocaleString()})`,
  };
}

/**
 * Evaluates a single Job against a Candidate and produces a score breakdown.
 * Returns null if the job is excluded by hard filter.
 */
export function scoreJobForCandidate(
  candidate: Candidate,
  job: Job,
  customWeights?: Partial<ScoringWeights>
): ScoreResult | null {
  const weights = normalizeWeights(customWeights);

  const skillResult = calculateSkillScore(
    candidate.skills,
    job.required_skills,
    weights.skills
  );

  if (skillResult.isExcluded) {
    return null;
  }

  const experienceResult = calculateExperienceScore(
    Number(candidate.years_of_experience),
    Number(job.min_years_experience),
    weights.experience
  );

  const locationResult = calculateLocationScore(
    candidate.location,
    job.location,
    job.remote_allowed,
    weights.location
  );

  const salaryResult = calculateSalaryScore(
    candidate.expected_salary,
    job.salary_min,
    job.salary_max,
    weights.salary
  );

  const rawOverall =
    skillResult.dimensionScore.score +
    experienceResult.score +
    locationResult.score +
    salaryResult.score;

  const overallScore = round(Math.min(100, Math.max(0, rawOverall)));

  return {
    isExcluded: false,
    overallScore,
    breakdown: {
      skills: skillResult.dimensionScore.formatted,
      experience: experienceResult.formatted,
      location: locationResult.formatted,
      salary: salaryResult.formatted,
    },
    scoreBreakdown: {
      skills: skillResult.dimensionScore,
      experience: experienceResult,
      location: locationResult,
      salary: salaryResult,
    },
  };
}

function round(val: number): number {
  return Math.round(val * 10) / 10;
}
