import { z } from 'zod';
import { VIOLATION_TAGS } from '@/db/schema';

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
