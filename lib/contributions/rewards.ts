import type { ContributionType } from '@/db/schema';

export type RewardQuality = 'low' | 'medium' | 'high';

interface RewardRange {
  min: number;
  max: number;
}

export const REWARD_RANGES: Record<ContributionType, Record<RewardQuality, RewardRange>> = {
  BREACH_REPORT: {
    low: { min: 5, max: 15 },
    medium: { min: 15, max: 40 },
    high: { min: 40, max: 100 },
  },
  POLICY_CHANGE: {
    low: { min: 2, max: 8 },
    medium: { min: 8, max: 20 },
    high: { min: 20, max: 50 },
  },
  COURT_DOCUMENT: {
    low: { min: 10, max: 25 },
    medium: { min: 25, max: 60 },
    high: { min: 60, max: 150 },
  },
  TRANSLATION: {
    low: { min: 5, max: 15 },
    medium: { min: 15, max: 35 },
    high: { min: 35, max: 80 },
  },
  OCA_CONTRIBUTION: {
    low: { min: 1, max: 5 },
    medium: { min: 5, max: 15 },
    high: { min: 15, max: 30 },
  },
};

export function calculateReward(type: ContributionType, quality: RewardQuality): number {
  const range = REWARD_RANGES[type][quality];
  // Midpoint of range — admin sets final amount at review
  return Math.round((range.min + range.max) / 2);
}

export function formatRewardRange(type: ContributionType): string {
  const low = REWARD_RANGES[type].low.min;
  const high = REWARD_RANGES[type].high.max;
  return `$${low}–$${high}`;
}

export function getRewardRange(type: ContributionType, quality: RewardQuality): RewardRange {
  return REWARD_RANGES[type][quality];
}
