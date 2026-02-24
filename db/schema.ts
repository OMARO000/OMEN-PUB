import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// ViolationTag
// ---------------------------------------------------------------------------

export const VIOLATION_TAGS = ['GOOD', 'BAD', 'UGLY', 'BROKEN_PROMISE'] as const;
export type ViolationTag = (typeof VIOLATION_TAGS)[number];

// ---------------------------------------------------------------------------
// companies
// ---------------------------------------------------------------------------

export const companies = sqliteTable('companies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  website: text('website'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountNumber: text('account_number').notNull().unique(),
  role: text('role', { enum: ['contributor', 'reviewer', 'admin'] }).notNull().default('contributor'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// blocks
// ---------------------------------------------------------------------------

export const blocks = sqliteTable('blocks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  violationTag: text('violation_tag').$type<ViolationTag>().notNull(),
  sourceUrl: text('source_url'),
  recordedAt: integer('recorded_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// staged_blocks
// ---------------------------------------------------------------------------

export const stagedBlocks = sqliteTable('staged_blocks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  violationTag: text('violation_tag').$type<ViolationTag>().notNull(),
  sourceUrl: text('source_url'),
  submittedBy: integer('submitted_by').references(() => users.id),
  reviewStatus: text('review_status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// company_policies
// ---------------------------------------------------------------------------

export const companyPolicies = sqliteTable('company_policies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  policyUrl: text('policy_url'),
  effectiveDate: integer('effective_date', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// alternatives
// ---------------------------------------------------------------------------

export const alternatives = sqliteTable('alternatives', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  url: text('url'),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// votes
// ---------------------------------------------------------------------------

export const votes = sqliteTable('votes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  blockId: integer('block_id').references(() => blocks.id),
  alternativeId: integer('alternative_id').references(() => alternatives.id),
  value: integer('value').notNull(), // +1 or -1
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// api_clients
// ---------------------------------------------------------------------------

export const apiClients = sqliteTable('api_clients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(),
  scopes: text('scopes').notNull().default('read'), // space-separated
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
});

// ---------------------------------------------------------------------------
// api_audit_logs
// ---------------------------------------------------------------------------

export const apiAuditLogs = sqliteTable('api_audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').references(() => apiClients.id),
  endpoint: text('endpoint').notNull(),
  method: text('method').notNull(),
  statusCode: integer('status_code').notNull(),
  ipHash: text('ip_hash'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// legal_attacks
// ---------------------------------------------------------------------------

export const legalAttacks = sqliteTable('legal_attacks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').references(() => companies.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status', { enum: ['active', 'resolved', 'dismissed'] }).notNull().default('active'),
  filedAt: integer('filed_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// contributions
// ---------------------------------------------------------------------------

export const contributions = sqliteTable('contributions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status', { enum: ['pending', 'completed', 'failed', 'refunded'] }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// contribution_payments
// ---------------------------------------------------------------------------

export const contributionPayments = sqliteTable('contribution_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contributionId: integer('contribution_id').notNull().references(() => contributions.id),
  processor: text('processor').notNull(), // e.g. 'stripe', 'btcpay'
  transactionId: text('transaction_id'),
  status: text('status', { enum: ['pending', 'succeeded', 'failed'] }).notNull().default('pending'),
  processedAt: integer('processed_at', { mode: 'timestamp_ms' }),
});

// ---------------------------------------------------------------------------
// documents
// ---------------------------------------------------------------------------

export const documents = sqliteTable('documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  blockId: integer('block_id').references(() => blocks.id),
  title: text('title').notNull(),
  fileUrl: text('file_url').notNull(),
  mimeType: text('mime_type'),
  contentHash: text('content_hash'), // SHA-256 for integrity
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// feedback
// ---------------------------------------------------------------------------

export const feedback = sqliteTable('feedback', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  blockId: integer('block_id').references(() => blocks.id),
  content: text('content').notNull(),
  feedbackType: text('feedback_type', { enum: ['correction', 'addition', 'dispute', 'general'] }).notNull().default('general'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// analytics_events
// ---------------------------------------------------------------------------

export const analyticsEvents = sqliteTable('analytics_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  event: text('event').notNull(),
  properties: text('properties'), // JSON string
  userId: integer('user_id').references(() => users.id),
  ipHash: text('ip_hash'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const companiesRelations = relations(companies, ({ many }) => ({
  blocks: many(blocks),
  stagedBlocks: many(stagedBlocks),
  companyPolicies: many(companyPolicies),
  alternatives: many(alternatives),
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
}));

export const companyPoliciesRelations = relations(companyPolicies, ({ one }) => ({
  company: one(companies, { fields: [companyPolicies.companyId], references: [companies.id] }),
}));

export const alternativesRelations = relations(alternatives, ({ one, many }) => ({
  company: one(companies, { fields: [alternatives.companyId], references: [companies.id] }),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  user: one(users, { fields: [votes.userId], references: [users.id] }),
  block: one(blocks, { fields: [votes.blockId], references: [blocks.id] }),
  alternative: one(alternatives, { fields: [votes.alternativeId], references: [alternatives.id] }),
}));

export const apiClientsRelations = relations(apiClients, ({ many }) => ({
  auditLogs: many(apiAuditLogs),
}));

export const apiAuditLogsRelations = relations(apiAuditLogs, ({ one }) => ({
  client: one(apiClients, { fields: [apiAuditLogs.clientId], references: [apiClients.id] }),
}));

export const legalAttacksRelations = relations(legalAttacks, ({ one }) => ({
  company: one(companies, { fields: [legalAttacks.companyId], references: [companies.id] }),
}));

export const contributionsRelations = relations(contributions, ({ one, many }) => ({
  user: one(users, { fields: [contributions.userId], references: [users.id] }),
  payments: many(contributionPayments),
}));

export const contributionPaymentsRelations = relations(contributionPayments, ({ one }) => ({
  contribution: one(contributions, { fields: [contributionPayments.contributionId], references: [contributions.id] }),
}));

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
