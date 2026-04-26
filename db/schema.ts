import { integer, pgTable, serial, text, real, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const VIOLATION_TAGS = ['GOOD', 'BAD', 'UGLY', 'BROKEN_PROMISE', 'QUESTIONABLE'] as const;
export type ViolationTag = (typeof VIOLATION_TAGS)[number];

export const VIOLATION_CATEGORIES = ['PRI', 'LAB', 'ETH', 'ENV', 'ANT'] as const;
export type ViolationCategory = (typeof VIOLATION_CATEGORIES)[number];

export const VIOLATION_STATUSES = ['ACTIVE', 'RESOLVED', 'DISPUTED'] as const;
export type ViolationStatus = (typeof VIOLATION_STATUSES)[number];

export const SOURCE_TYPES = [
  'SEC_FILING',
  'COURT_RECORD',
  'REGULATORY_DECISION',
  'GOVERNMENT_DOCUMENT',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const CONFIDENCE_ROUTINGS = ['AUTO_APPROVED', 'QUICK_REVIEW', 'REJECTED'] as const;
export type ConfidenceRouting = (typeof CONFIDENCE_ROUTINGS)[number];

export const API_TIERS = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'RESTRICTED'] as const;
export type ApiTier = (typeof API_TIERS)[number];

export const CONTRIBUTION_TYPES = [
  'BREACH_REPORT',
  'POLICY_CHANGE',
  'COURT_DOCUMENT',
  'TRANSLATION',
  'OCA_CONTRIBUTION',
] as const;
export type ContributionType = (typeof CONTRIBUTION_TYPES)[number];

export const PAYOUT_METHODS = ['MONERO', 'USDC', 'FIAT'] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export const OCA_CATEGORIES = [
  'Email', 'Cloud', 'Social', 'Messaging', 'Browser',
  'Search', 'OS', 'VPN', 'Finance', 'Other',
] as const;
export type OcaCategory = (typeof OCA_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// companies
// ---------------------------------------------------------------------------

export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ticker: text('ticker').notNull().unique(),
  tier: integer('tier'),
  description: text('description'),
  website: text('website'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  accountNumber: text('account_number').notNull().unique(),
  role: text('role', { enum: ['contributor', 'reviewer', 'admin'] }).notNull().default('contributor'),
  isPaid: boolean('is_paid').notNull().default(false),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  subscriptionId: text('subscription_id'),
  // JSON array of ticker strings: ["META","GOOGL","AMZN"]
  companiesTracked: jsonb('companies_tracked').notNull().default([]),
  bonusBalance: real('bonus_balance').notNull().default(0.0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// blocks  (approved — promoted from staged_blocks)
// ---------------------------------------------------------------------------

export const blocks = pgTable('blocks', {
  id: serial('id').primaryKey(),
  blockId: text('block_id').notNull().unique(),           // OM-YYYY-CAT-TICKER-###
  companyId: integer('company_id').notNull().references(() => companies.id),
  category: text('category').$type<ViolationCategory>().notNull(),
  violationTag: text('violation_tag').$type<ViolationTag>().notNull(),
  title: text('title').notNull(),
  // Formal fields
  formalSummary: text('formal_summary').notNull(),
  regulatoryBasis: text('regulatory_basis').notNull(),
  enforcementDetails: text('enforcement_details').notNull(),
  jurisdiction: text('jurisdiction').notNull(),
  // Conversational fields
  conversationalWhatHappened: text('conversational_what_happened').notNull(),
  conversationalWhyItMatters: text('conversational_why_it_matters').notNull(),
  conversationalCompanyResponse: text('conversational_company_response').notNull(),
  // Financials
  amount: real('amount'),
  amountCurrency: text('amount_currency'),
  affectedIndividuals: integer('affected_individuals'),
  // Sources (JSON array of RawSource)
  sourcesJson: text('sources_json').notNull().default('[]'),
  sourceDisclaimersJson: text('source_disclaimers_json').notNull().default('[]'),
  primarySourceUrl: text('primary_source_url'),
  // Verification
  verificationJson: text('verification_json').notNull().default('{}'),
  // Confidence
  confidenceScore: real('confidence_score').notNull(),
  confidenceRouting: text('confidence_routing').$type<ConfidenceRouting>().notNull(),
  // Broken promise
  brokenPromiseJson: text('broken_promise_json'),
  // IPFS
  ipfsCid: text('ipfs_cid'),
  // Timestamps
  violationDate: text('violation_date'),                  // YYYY-MM-DD from agent
  researchedAt: text('researched_at').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// staged_blocks  (agent output — pending review)
// ---------------------------------------------------------------------------

export const stagedBlocks = pgTable('staged_blocks', {
  id: serial('id').primaryKey(),
  blockId: text('block_id').notNull().unique(),           // OM-YYYY-CAT-TICKER-###
  companyId: integer('company_id').notNull().references(() => companies.id),
  category: text('category').$type<ViolationCategory>().notNull(),
  violationTag: text('violation_tag').$type<ViolationTag>().notNull(),
  title: text('title').notNull(),
  // Formal fields
  formalSummary: text('formal_summary').notNull(),
  regulatoryBasis: text('regulatory_basis').notNull(),
  enforcementDetails: text('enforcement_details').notNull(),
  jurisdiction: text('jurisdiction').notNull(),
  // Conversational fields
  conversationalWhatHappened: text('conversational_what_happened').notNull(),
  conversationalWhyItMatters: text('conversational_why_it_matters').notNull(),
  conversationalCompanyResponse: text('conversational_company_response').notNull(),
  // Financials
  amount: real('amount'),
  amountCurrency: text('amount_currency'),
  affectedIndividuals: integer('affected_individuals'),
  // Sources
  sourcesJson: text('sources_json').notNull().default('[]'),
  sourceDisclaimersJson: text('source_disclaimers_json').notNull().default('[]'),
  primarySourceUrl: text('primary_source_url'),
  // Verification
  verificationJson: text('verification_json').notNull().default('{}'),
  // Confidence
  confidenceScore: real('confidence_score').notNull(),
  confidenceRouting: text('confidence_routing').$type<ConfidenceRouting>().notNull(),
  // Broken promise
  brokenPromiseJson: text('broken_promise_json'),
  // Review
  submittedBy: integer('submitted_by').references(() => users.id),
  reviewStatus: text('review_status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  reviewNotes: text('review_notes'),
  // Timestamps
  violationDate: text('violation_date'),
  researchedAt: text('researched_at').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// company_policies
// ---------------------------------------------------------------------------

export const companyPolicies = pgTable('company_policies', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  policyUrl: text('policy_url'),
  effectiveDate: timestamp('effective_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// alternatives  (OCA — OMEN Crowdsourced Alternatives)
// ---------------------------------------------------------------------------

export const alternatives = pgTable('alternatives', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').$type<OcaCategory>().notNull(),
  websiteUrl: text('website_url'),
  replaces: text('replaces'),          // "What does it replace?" max 100
  whyBetter: text('why_better'),       // "Why is it better?" max 500
  openSource: boolean('open_source').notNull().default(false),
  selfHostable: boolean('self_hostable').notNull().default(false),
  upvotes: integer('upvotes').notNull().default(0),
  downvotes: integer('downvotes').notNull().default(0),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  rejectionReason: text('rejection_reason'),
  submittedBy: text('submitted_by'),   // accountNumber, plain text
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// alternative_votes  (one vote per account per alternative)
// ---------------------------------------------------------------------------

export const alternativeVotes = pgTable('alternative_votes', {
  id: serial('id').primaryKey(),
  alternativeId: integer('alternative_id').notNull().references(() => alternatives.id),
  accountNumber: text('account_number').notNull(),
  vote: text('vote', { enum: ['up', 'down'] }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// votes  (block votes — legacy, kept for future use)
// ---------------------------------------------------------------------------

export const votes = pgTable('votes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  blockId: integer('block_id').references(() => blocks.id),
  value: integer('value').notNull(), // +1 or -1
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// sources  (approved source registry)
// ---------------------------------------------------------------------------

export const sources = pgTable('sources', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  domain: text('domain').notNull(),
  sourceType: text('source_type').$type<SourceType>().notNull(),
  credibilityBase: integer('credibility_base').notNull().default(50),
  isApproved: boolean('is_approved').notNull().default(false),
  isBlocklisted: boolean('is_blocklisted').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// documents  (file attachments on approved blocks)
// ---------------------------------------------------------------------------

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  blockId: integer('block_id').references(() => blocks.id),
  title: text('title').notNull(),
  fileUrl: text('file_url').notNull(),
  mimeType: text('mime_type'),
  contentHash: text('content_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// feedback
// ---------------------------------------------------------------------------

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  blockId: integer('block_id').references(() => blocks.id),
  content: text('content').notNull(),
  feedbackType: text('feedback_type', { enum: ['correction', 'addition', 'dispute', 'general'] }).notNull().default('general'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// api_clients
// ---------------------------------------------------------------------------

export const apiClients = pgTable('api_clients', {
  id: serial('id').primaryKey(),
  apiKey: text('api_key').notNull().unique(),
  clientName: text('client_name').notNull(),
  email: text('email').notNull(),
  useCase: text('use_case').notNull(),
  tier: text('tier').$type<ApiTier>().notNull().default('STARTER'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// api_audit_logs
// ---------------------------------------------------------------------------

export const apiAuditLogs = pgTable('api_audit_logs', {
  id: serial('id').primaryKey(),
  apiKey: text('api_key').notNull(),
  endpoint: text('endpoint').notNull(),
  company: text('company'),
  query: text('query'),
  ipAddress: text('ip_address'),
  useCase: text('use_case'),
  statusCode: integer('status_code').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// legal_attacks
// ---------------------------------------------------------------------------

export const legalAttacks = pgTable('legal_attacks', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').references(() => companies.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status', { enum: ['active', 'resolved', 'dismissed'] }).notNull().default('active'),
  filedAt: timestamp('filed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// contributions  (Data Co-op — user-submitted data)
// ---------------------------------------------------------------------------

export const contributions = pgTable('contributions', {
  id: serial('id').primaryKey(),
  accountNumber: text('account_number').notNull(),
  type: text('type').$type<ContributionType>().notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  fileUrl: text('file_url'),
  companyTicker: text('company_ticker'),
  blockId: text('block_id'),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'paid'] }).notNull().default('pending'),
  rewardAmount: real('reward_amount'),
  rejectionReason: text('rejection_reason'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// contribution_payments  (withdrawal requests)
// ---------------------------------------------------------------------------

export const contributionPayments = pgTable('contribution_payments', {
  id: serial('id').primaryKey(),
  accountNumber: text('account_number').notNull(),
  amount: real('amount').notNull(),
  payoutMethod: text('payout_method').$type<PayoutMethod>().notNull(),
  payoutAddress: text('payout_address'),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).notNull().default('pending'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  notes: text('notes'),
});

// ---------------------------------------------------------------------------
// analytics_events
// ---------------------------------------------------------------------------

export const analyticsEvents = pgTable('analytics_events', {
  id: serial('id').primaryKey(),
  event: text('event').notNull(),
  properties: text('properties'),
  userId: integer('user_id').references(() => users.id),
  ipHash: text('ip_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const companiesRelations = relations(companies, ({ many }) => ({
  blocks: many(blocks),
  stagedBlocks: many(stagedBlocks),
  companyPolicies: many(companyPolicies),
  legalAttacks: many(legalAttacks),
}));

export const blocksRelations = relations(blocks, ({ one, many }) => ({
  company: one(companies, { fields: [blocks.companyId], references: [companies.id] }),
  votes: many(votes),
  documents: many(documents),
  feedback: many(feedback),
}));

export const stagedBlocksRelations = relations(stagedBlocks, ({ one }) => ({
  company: one(companies, { fields: [stagedBlocks.companyId], references: [companies.id] }),
  submitter: one(users, { fields: [stagedBlocks.submittedBy], references: [users.id] }),
  reviewer: one(users, { fields: [stagedBlocks.reviewedBy], references: [users.id] }),
}));

export const companyPoliciesRelations = relations(companyPolicies, ({ one }) => ({
  company: one(companies, { fields: [companyPolicies.companyId], references: [companies.id] }),
}));

export const alternativesRelations = relations(alternatives, ({ many }) => ({
  alternativeVotes: many(alternativeVotes),
}));

export const alternativeVotesRelations = relations(alternativeVotes, ({ one }) => ({
  alternative: one(alternatives, { fields: [alternativeVotes.alternativeId], references: [alternatives.id] }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  user: one(users, { fields: [votes.userId], references: [users.id] }),
  block: one(blocks, { fields: [votes.blockId], references: [blocks.id] }),
}));

export const apiClientsRelations = relations(apiClients, () => ({}));
export const apiAuditLogsRelations = relations(apiAuditLogs, () => ({}));

export const legalAttacksRelations = relations(legalAttacks, ({ one }) => ({
  company: one(companies, { fields: [legalAttacks.companyId], references: [companies.id] }),
}));

export const contributionsRelations = relations(contributions, () => ({}));
export const contributionPaymentsRelations = relations(contributionPayments, () => ({}));

export const documentsRelations = relations(documents, ({ one }) => ({
  block: one(blocks, { fields: [documents.blockId], references: [blocks.id] }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(users, { fields: [feedback.userId], references: [users.id] }),
  block: one(blocks, { fields: [feedback.blockId], references: [blocks.id] }),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  user: one(users, { fields: [analyticsEvents.userId], references: [users.id] }),
}));

export const sourcesRelations = relations(sources, () => ({}));
