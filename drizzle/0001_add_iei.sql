ALTER TABLE "companies" ALTER COLUMN "ticker" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "iei" text;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_iei_unique" UNIQUE("iei");