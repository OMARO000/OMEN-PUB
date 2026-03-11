import type { ViolationTag } from '@/db/schema';

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

export interface Company {
  index: number;
  ticker: string;
  name: string;
  tier: number;
}

// ---------------------------------------------------------------------------
// Block types
// ---------------------------------------------------------------------------

export type ResearchCategory = 'PRI' | 'LAB' | 'ANT' | 'ETH' | 'ENV';

export type ConfidenceRouting = 'AUTO_APPROVED' | 'QUICK_REVIEW' | 'REJECTED';

export interface RawSource {
  name: string;
  url: string;
  domainConfidenceBoost: number;
  accessedDate: string;
}

export interface BlockVerification {
  governmentSourceConfirmed: boolean;
  amountVerified: boolean | null;
  dateCrossChecked: boolean;
  archiveLinksCaptured: boolean;
}

export interface BrokenPromiseCheck {
  priorViolationExists: boolean;
  priorCommitmentExists: boolean;
  promiseSource?: string;
  promiseArchiveUrl?: string;
  contradictionDocumented?: boolean;
}

export interface RawBlock {
  blockId: string;                    // OM-YYYY-CAT-TICKER-###
  companyTicker: string;
  companyName: string;
  date: string;                       // YYYY-MM-DD
  jurisdiction: string;
  category: ResearchCategory;
  violationTag: ViolationTag;
  amount: number | null;
  amountCurrency: string | null;
  affectedIndividuals: number | null;
  formalSummary: string;
  regulatoryBasis: string;
  enforcementDetails: string;
  conversationalWhatHappened: string;
  conversationalWhyItMatters: string;
  conversationalCompanyResponse: string;
  sources: RawSource[];
  sourceDisclaimers: string[];
  verification: BlockVerification;
  confidenceScore: number;
  confidenceRouting: ConfidenceRouting;
  brokenPromiseCheck?: BrokenPromiseCheck;
  researchedAt: string;
  researcher: string;
}

// ---------------------------------------------------------------------------
// Staging
// ---------------------------------------------------------------------------

export interface StagedBlockInput {
  companyId: number;
  title: string;
  content: string;
  violationTag: ViolationTag;
  sourceUrl: string | null;
}

// ---------------------------------------------------------------------------
// Agent run config
// ---------------------------------------------------------------------------

export interface AgentRunConfig {
  batchSize: number;
  delayBetweenRequestsMs: number;
  batchCooldownMs: number;
  maxCompanies?: number;
  startFromIndex?: number;
  dryRun?: boolean;
}

export const DEFAULT_AGENT_CONFIG: AgentRunConfig = {
  batchSize: 10,
  delayBetweenRequestsMs: 5_000,
  batchCooldownMs: 60_000,
};

// ---------------------------------------------------------------------------
// Run results
// ---------------------------------------------------------------------------

export interface BatchResult {
  company: Company;
  blocksFound: number;
  blocksStaged: number;
  errors: string[];
  durationMs: number;
}
