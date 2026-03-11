import { z } from 'zod';
import { VIOLATION_TAGS, VIOLATION_CATEGORIES, VIOLATION_STATUSES, SOURCE_TYPES } from '@/db/schema';

// ---------------------------------------------------------------------------
// Block
// ---------------------------------------------------------------------------

export const blockSchema = z.object({
  companyId: z.number().int().positive(),
  title: z.string().min(1, 'Title is required').max(500, 'Title must be 500 characters or fewer'),
  content: z.string().min(1, 'Content is required'),
  violationTag: z.enum(VIOLATION_TAGS),
  sourceUrl: z.url('Must be a valid URL').optional().or(z.literal('')),
  recordedAt: z.iso.datetime({ offset: true }).optional(),
});

export type BlockInput = z.infer<typeof blockSchema>;

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

export const companySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or fewer'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(2000).optional(),
  website: z.url('Must be a valid URL').optional().or(z.literal('')),
});

export type CompanyInput = z.infer<typeof companySchema>;

// ---------------------------------------------------------------------------
// Violation
// ---------------------------------------------------------------------------

export const violationSchema = z.object({
  companyId: z.number().int().positive(),
  category: z.enum(VIOLATION_CATEGORIES),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().min(1, 'Description is required'),
  dateOccurred: z.iso.datetime({ offset: true }).optional(),
  dateDiscovered: z.iso.datetime({ offset: true }).optional(),
  severity: z.number().int().min(1, 'Severity must be at least 1').max(5, 'Severity must be at most 5'),
  status: z.enum(VIOLATION_STATUSES).default('ACTIVE'),
});

export type ViolationInput = z.infer<typeof violationSchema>;

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export const evidenceSchema = z.object({
  violationId: z.number().int().positive(),
  sourceUrl: z.url('Must be a valid URL'),
  sourceType: z.enum(SOURCE_TYPES),
  title: z.string().min(1, 'Title is required').max(500),
  documentDate: z.iso.datetime({ offset: true }).optional(),
  credibilityScore: z
    .number()
    .int()
    .min(0, 'Credibility score must be at least 0')
    .max(100, 'Credibility score must be at most 100')
    .default(50),
  archivedUrl: z.url('Must be a valid URL').optional().or(z.literal('')),
});

export type EvidenceInput = z.infer<typeof evidenceSchema>;

// ---------------------------------------------------------------------------
// Source
// ---------------------------------------------------------------------------

export const sourceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  domain: z
    .string()
    .min(1, 'Domain is required')
    .max(253)
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Must be a valid domain (e.g. reuters.com)'),
  sourceType: z.enum(SOURCE_TYPES),
  credibilityBase: z
    .number()
    .int()
    .min(0, 'Credibility base must be at least 0')
    .max(100, 'Credibility base must be at most 100')
    .default(50),
  isApproved: z.boolean().default(false),
  isBlocklisted: z.boolean().default(false),
});

export type SourceInput = z.infer<typeof sourceSchema>;
