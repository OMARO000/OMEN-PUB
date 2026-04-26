CREATE TABLE "alternative_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"alternative_id" integer NOT NULL,
	"account_number" text NOT NULL,
	"vote" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alternatives" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"website_url" text,
	"replaces" text,
	"why_better" text,
	"open_source" boolean DEFAULT false NOT NULL,
	"self_hostable" boolean DEFAULT false NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"submitted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"properties" text,
	"user_id" integer,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key" text NOT NULL,
	"endpoint" text NOT NULL,
	"company" text,
	"query" text,
	"ip_address" text,
	"use_case" text,
	"status_code" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key" text NOT NULL,
	"client_name" text NOT NULL,
	"email" text NOT NULL,
	"use_case" text NOT NULL,
	"tier" text DEFAULT 'STARTER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_clients_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"block_id" text NOT NULL,
	"company_id" integer NOT NULL,
	"category" text NOT NULL,
	"violation_tag" text NOT NULL,
	"title" text NOT NULL,
	"formal_summary" text NOT NULL,
	"regulatory_basis" text NOT NULL,
	"enforcement_details" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"conversational_what_happened" text NOT NULL,
	"conversational_why_it_matters" text NOT NULL,
	"conversational_company_response" text NOT NULL,
	"amount" real,
	"amount_currency" text,
	"affected_individuals" integer,
	"sources_json" text DEFAULT '[]' NOT NULL,
	"source_disclaimers_json" text DEFAULT '[]' NOT NULL,
	"primary_source_url" text,
	"verification_json" text DEFAULT '{}' NOT NULL,
	"confidence_score" real NOT NULL,
	"confidence_routing" text NOT NULL,
	"broken_promise_json" text,
	"ipfs_cid" text,
	"violation_date" text,
	"researched_at" text NOT NULL,
	"recorded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocks_block_id_unique" UNIQUE("block_id")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"ticker" text NOT NULL,
	"tier" integer,
	"description" text,
	"website" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug"),
	CONSTRAINT "companies_ticker_unique" UNIQUE("ticker")
);
--> statement-breakpoint
CREATE TABLE "company_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"policy_url" text,
	"effective_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contribution_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_number" text NOT NULL,
	"amount" real NOT NULL,
	"payout_method" text NOT NULL,
	"payout_address" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "contributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_number" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"file_url" text,
	"company_ticker" text,
	"block_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reward_amount" real,
	"rejection_reason" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"block_id" integer,
	"title" text NOT NULL,
	"file_url" text NOT NULL,
	"mime_type" text,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"block_id" integer,
	"content" text NOT NULL,
	"feedback_type" text DEFAULT 'general' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_attacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"filed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"source_type" text NOT NULL,
	"credibility_base" integer DEFAULT 50 NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"is_blocklisted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staged_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"block_id" text NOT NULL,
	"company_id" integer NOT NULL,
	"category" text NOT NULL,
	"violation_tag" text NOT NULL,
	"title" text NOT NULL,
	"formal_summary" text NOT NULL,
	"regulatory_basis" text NOT NULL,
	"enforcement_details" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"conversational_what_happened" text NOT NULL,
	"conversational_why_it_matters" text NOT NULL,
	"conversational_company_response" text NOT NULL,
	"amount" real,
	"amount_currency" text,
	"affected_individuals" integer,
	"sources_json" text DEFAULT '[]' NOT NULL,
	"source_disclaimers_json" text DEFAULT '[]' NOT NULL,
	"primary_source_url" text,
	"verification_json" text DEFAULT '{}' NOT NULL,
	"confidence_score" real NOT NULL,
	"confidence_routing" text NOT NULL,
	"broken_promise_json" text,
	"submitted_by" integer,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" integer,
	"review_notes" text,
	"violation_date" text,
	"researched_at" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staged_blocks_block_id_unique" UNIQUE("block_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_number" text NOT NULL,
	"role" text DEFAULT 'contributor' NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone,
	"subscription_id" text,
	"companies_tracked" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bonus_balance" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_account_number_unique" UNIQUE("account_number")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"block_id" integer,
	"value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alternative_votes" ADD CONSTRAINT "alternative_votes_alternative_id_alternatives_id_fk" FOREIGN KEY ("alternative_id") REFERENCES "public"."alternatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_policies" ADD CONSTRAINT "company_policies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_attacks" ADD CONSTRAINT "legal_attacks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staged_blocks" ADD CONSTRAINT "staged_blocks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staged_blocks" ADD CONSTRAINT "staged_blocks_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staged_blocks" ADD CONSTRAINT "staged_blocks_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE no action ON UPDATE no action;