ALTER TABLE "blocks" ADD COLUMN "supersedes_block_id" text;--> statement-breakpoint
ALTER TABLE "blocks" ADD COLUMN "superseded_by_block_id" text;--> statement-breakpoint
ALTER TABLE "blocks" ADD COLUMN "prompt_version" text DEFAULT 'OMEN_AGENT_v3.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "blocks" ADD COLUMN "resolution_status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "staged_blocks" ADD COLUMN "supersedes_block_id" text;--> statement-breakpoint
ALTER TABLE "staged_blocks" ADD COLUMN "superseded_by_block_id" text;--> statement-breakpoint
ALTER TABLE "staged_blocks" ADD COLUMN "prompt_version" text DEFAULT 'OMEN_AGENT_v3.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "staged_blocks" ADD COLUMN "resolution_status" text DEFAULT 'active' NOT NULL;