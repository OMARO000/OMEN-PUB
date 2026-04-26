# OMEN-SPEC.md

---

## PART I — PUBLIC REPOSITORY SPECIFICATION

---

# OMEN — Reference Specification for Omaro Browser Build
**Extracted from public codebase · April 2026**

---

## 1. System Overview

OMEN is a structured, permanent ledger of documented corporate misconduct. It records what corporations have demonstrably done — regulatory penalties, enforcement actions, broken public commitments, labor violations, privacy breaches, antitrust findings — and makes those records searchable, linkable, and machine-readable.

The core value proposition demonstrated by the code is not a news aggregator or opinion platform. It is a **citation-grade database of facts already established by government bodies** (SEC, FTC, DOJ, NLRB, EPA, courts), organized by company, categorized, severity-tagged, and timestamped. Every record has a confidence score, a routing decision, sourcing metadata, and a plain-English dual-tone rendering alongside the formal regulatory text.

Three overlapping user types are served:

1. **The public** — reads the ledger for free; no account required. Sees violation counts, categories, fines, sourcing.
2. **Subscribers** ($2/month) — track specific companies, get personal exposure dashboards, vote on alternatives, submit contributions for reward.
3. **API clients** — developers, journalists, NGOs, researchers who access the data programmatically with a declared use case.

A fourth actor is implicit throughout: **the AI research pipeline** (private repo) which populates the database by researching companies and producing structured `RawBlock` records that enter a staging queue for review before promotion to the public ledger.

The public repo adds the web application layer: every route, every rendered page, the API gateway, the EDGAR financial integration, the contributor reward system, and the full design system.

---

## 2. Analysis Logic Specification

### 2.1 Violation Block Confidence Scoring

**What it does:** Determines whether an AI-researched violation record is trustworthy enough to auto-publish, requires human review, or should be rejected outright.

**Inputs:**
- `confidenceScore` — a float from 0.0 to 1.0
- `confidenceRouting` — one of: `AUTO_APPROVED`, `QUICK_REVIEW`, `REJECTED`

**Logic (inferred from field semantics and routing enum):**
- The AI research agent (private repo) computes a confidence score by evaluating source quality, cross-verification, government source confirmation, date cross-checking, and amount verification.
- If score ≥ threshold (likely ~0.93 based on UI code using `confPct >= 93` as the "auto-approved" display cutoff): block enters `AUTO_APPROVED` routing and can be promoted to the public `blocks` table without human review.
- If score is mid-range: block routes to `QUICK_REVIEW`, entering `staged_blocks` pending manual approval.
- If score is low: `REJECTED` routing; block is logged but not surfaced.

**Output:** A staged block record with routing decision visible in the admin verify interface.

---

### 2.2 Source Credibility Scoring

**What it does:** Assigns a credibility score (0–100) to each source attached to a violation block.

**Inputs per source:**
- `domain` — the source's registered domain
- `sourceType` — one of: `SEC_FILING`, `COURT_RECORD`, `REGULATORY_DECISION`, `GOVERNMENT_DOCUMENT`
- `domainConfidenceBoost` — integer boost contributed by this source to the block's overall confidence
- `credibilityBase` — baseline score from the sources registry table (default: 50)

**Logic:**
- Each source domain has a pre-registered credibility baseline (0–100) in the `sources` table.
- Government/regulatory sources score highest. SEC filings, court records, and regulatory decisions are the only accepted source types.
- The `domainConfidenceBoost` field on each `RawSource` in a block's `sourcesJson` represents how much this source contributes to raising the block's confidence score.
- The credibility bar displayed in `EvidenceBlock.tsx` renders: filled blocks = `floor(score / 10)`, empty blocks = remainder to 10. Color: ≤40 = red (ugly), ≤70 = amber (broken-promise), >70 = silver (accent).

**Output:** Per-source credibility integer surfaced in the UI with a visual bar.

---

### 2.3 Broken Promise Detection

**What it does:** Flags when a violation contradicts a company's prior public commitment.

**Inputs:**
- `brokenPromiseJson` — optional JSON field on a block containing: `priorViolationExists`, `priorCommitmentExists`, `promiseSource`, `promiseArchiveUrl`, `contradictionDocumented`

**Logic:**
- Set by the AI research agent (private repo) at block creation time.
- If `priorViolationExists` is true: the company has a prior recorded violation in the same category.
- If `priorCommitmentExists` is true: the company made a prior documented public commitment that this violation contradicts.
- The block's `violationTag` is set to `BROKEN_PROMISE` when this check is positive.
- The block detail page renders a distinct section for this, colored with `var(--tag-broken-promise)` (#d4af37), showing which conditions triggered it and the source of the prior promise.

**Output:** Optional section on block detail page; influences violationTag assignment.

---

### 2.4 User Exposure Calculation

**What it does:** For an authenticated user, computes a rollup of all violations recorded against companies they have elected to track.

**Inputs:**
- `accountNumber` — from session cookie `omen_session`
- User's `companiesTracked` — JSON array of ticker strings stored on the `users` row

**Logic (step by step):**
1. Look up the user by account number. If not found, return all-zero result.
2. Parse `companiesTracked` JSON array. If empty, return all-zero result.
3. Query the `companies` table for all rows whose `ticker` is in the tracked list.
4. Query the `blocks` table for all blocks whose `companyId` is in the resolved company ID list.
5. For each block, increment:
   - `byCategory[block.category]`
   - `bySeverity[block.violationTag]`
   - `totalFines` by `block.amount` (treating null as 0)
   - Per-company accumulator: `violationCount` and `totalFines`
6. Sort companies by `violationCount` descending.
7. Return: `totalViolations`, `totalFines`, `byCategory` map, `bySeverity` map, per-company breakdown array, and the raw `trackedTickers` list.

**Output:** `ExposureResult` object — used by the dashboard page to render personal exposure metrics.

---

### 2.5 Alternative Ranking (OCA)

**What it does:** Produces a ranked list of crowdsourced ethical alternatives to corporate products, penalizing any alternative whose own name appears in the OMEN violation ledger.

**Inputs:**
- Array of approved `alternatives` records from the database

**Logic:**
1. For each unique alternative name, query the `companies` table for any company whose name fuzzy-matches the alternative name (SQL LIKE `%name%`).
2. For each matched company, check if any `blocks` exist for that company.
3. If a company with violations is found whose name overlaps with an alternative's name: apply a penalty of −20 points to that alternative's score.
4. For each alternative, compute a base score: `upvotes − downvotes`.
5. Add bonus: +10 if `openSource = true`, +5 if `selfHostable = true`.
6. Apply violation penalty if triggered: −20.
7. Sort all alternatives by final score descending.

**Output:** Ranked array of `RankedAlternative` objects with computed `score` field.

---

### 2.6 API Pattern Detection

**What it does:** Flags API clients who are querying a single company at abnormally high frequency, which may indicate surveillance, competitive intelligence, or defense research.

**Inputs:**
- `apiKey` — the requesting client's key
- `company` — the ticker or company name being queried

**Logic:**
1. After every successful API response where a company was queried, run a background check.
2. Count the number of `api_audit_logs` rows for this `apiKey` + `company` combination where `createdAt` is within the last 30 days.
3. If count > 50: emit a console warning with the key prefix and count.
4. Insert a sentinel row into `api_audit_logs` with `endpoint = '/__pattern_flag__'`, `useCase = 'SYSTEM_FLAG'`, and `query = 'pattern_detected:N_queries_30d'`.

**Output:** No API response change — purely a logging/alerting side effect. The sentinel record is detectable in admin audit log queries.

---

### 2.7 API Technicality Detection

**What it does:** Flags search queries that appear to be seeking procedural loopholes rather than factual records.

**Inputs:**
- `q` — free-text search query string

**Logic:**
1. Lowercase the query.
2. Check whether it contains any of: `'procedural'`, `'jurisdiction'`, `'statute of limitations'`, `'appeal'`, `'dismissal'`.
3. If any keyword matches: return `true`.

**Output:** A `technicality_flag: boolean` field included in the API response's top-level payload. The flag is informational — it does not block the query. The console logs a warning with the key prefix.

---

### 2.8 API Rate Limiting

**What it does:** Enforces per-minute request quotas by API tier.

**Inputs:**
- `apiKey` — the requesting client's key
- `tier` — the client's tier: `STARTER`, `PROFESSIONAL`, `ENTERPRISE`, or `RESTRICTED`

**Logic:**
1. Look up the in-memory store for this `apiKey`.
2. If no entry exists, or the existing entry's `resetAt` timestamp is in the past: create a fresh entry with `count = 1` and `resetAt = now + 60000ms`. Return `allowed: true, remaining: limit - 1`.
3. If entry exists and `count >= limit`: return `allowed: false, remaining: 0`.
4. Otherwise increment `count` and return `allowed: true, remaining: limit - count`.

**Tier limits (requests/minute):**
- STARTER: 10
- PROFESSIONAL: 50
- ENTERPRISE: 500
- RESTRICTED: 5

**Note:** This is in-memory only — resets on cold start. No Redis or distributed store.

---

### 2.9 API Response Watermarking

**What it does:** Embeds client identity into every API response, making re-exported data traceable back to its requester.

**Inputs:**
- `data` — the response payload
- `client` — the authenticated `ApiClient` record

**Logic:**
1. Wrap the data in an envelope object.
2. Attach a `_omen` metadata block containing:
   - `exportedBy` — client's registered name
   - `exportDate` — ISO 8601 timestamp of this response
   - `intendedUse` — the client's declared use case from their registration
   - `watermark` — format: `OMEN-{first 8 chars of apiKey}-{unix timestamp ms}`
   - `terms` — fixed string: "Data from OMEN Ledger. Use restricted to declared use case."

**Output:** Every API response is a `{ data: T, _omen: {...} }` envelope. The inner data is identical to what would be returned without watermarking.

---

### 2.10 Use Case Enforcement

**What it does:** Blocks API access for use cases that indicate adversarial intent toward the ledger's subjects.

**Blocked use cases (hardcoded):**
- `'representing-defendant'` — legal defense of a company in the ledger
- `'reputation-management'` — PR/crisis management on behalf of tracked companies

**Logic:** Applied at the search endpoint before any database query. If `use_case` parameter matches either blocked value exactly, return 403 immediately and log the attempt. The `use_case` parameter is also required — omitting it returns 400.

---

### 2.11 EDGAR Company Search

**What it does:** Maps a free-text company name query to an SEC CIK number for financial data retrieval.

**Inputs:**
- `company` — free-text string (e.g., "Apple" or "Alphabet Inc")

**Logic:**
1. **Primary path:** Fetch `https://www.sec.gov/files/company_tickers.json` — a complete index of ~10,000+ public companies with CIK, ticker, and title.
2. For each entry: compute a word overlap score = (number of query words found in company title) ÷ (total query words). Both sides are lowercased and split on non-word characters.
3. Filter to entries with score > 0. Sort descending by score.
4. Deduplicate by CIK (using a Set, preserving highest-scored entry per CIK).
5. Return top 20 matches with name, CIK (zero-padded to 10 digits), ticker, and score.
6. **Fallback** (if primary returns no results or fails): Query `https://efts.sec.gov/LATEST/search-index?q="company"&forms=10-K`.
7. For each hit: extract `display_names[0]` or `entity_name`. Parse display name by splitting on 2+ spaces followed by `(`, extract ticker via regex `\([A-Z]{1,5}\)\s+\(CIK`. Apply same word overlap scoring.
8. Deduplicate by CIK. Return top 20.

**Output:** `{ source: 'tickers'|'fulltext'|'none', matches: [{ name, cik, ticker, score }] }`

---

### 2.12 CEO Pay Ratio Extraction

**What it does:** Extracts the CEO-to-median-employee pay ratio from a company's most recent DEF 14A proxy filing.

**Inputs:**
- `cik` — the company's SEC CIK number

**Logic:**
1. Fetch `https://data.sec.gov/submissions/CIK{paddedCik}.json` to get the company's filing history.
2. Scan `filings.recent.form[]` for the first entry with form type `"DEF 14A"`. Record its `accessionNumber`, `primaryDocument`, and `filingDate`.
3. Construct the filing URL: `https://www.sec.gov/Archives/edgar/data/{numericCik}/{accessionNoHyphens}/{primaryDoc}`
4. Fetch the document. Strip all HTML tags. Collapse multiple whitespace to single spaces. Result is `docText`.
5. Run four extraction strategies in sequence, returning immediately on first success:

   **Strategy 1 — Ratio pattern:** Scan for patterns like "312 to 1", "312:1", "312-to-1". Extract all matching integers. Validate 1 < n < 10000. Return the maximum found.

   **Strategy 2 — Times/multiple pattern:** Scan for patterns like "CEO... 312 times" or "312 times the median". Same validation and max selection.

   **Strategy 3 — Calculated from dollars:** Extract all dollar amounts following "median annual total compensation" and all dollar amounts following "chief executive". Handle million/billion suffixes. If both sets have matches: compute `ceil(max_ceo / min_median)`. Validate 1 < ratio < 10000.

   **Strategy 4 — Claude API:** Find the index of "pay ratio", "CEO pay", or "median employee" in the text. Extract a 1000-character window centered on that location (100 chars before, 900 after). Send to `claude-sonnet-4-20250514` with a system prompt instructing it to return only a number or "NOT_FOUND". Parse response as integer.

6. If all strategies fail: return `{ ratio: null, method: 'not_found' }`.

**Output:** `{ ratio: number|null, method: 'regex_ratio'|'regex_times'|'calculated'|'claude'|'not_found', filingUrl, filingDate, rawText }`

---

### 2.13 HAI Pillar Mapping

**What it does:** Maps a violation block's category and severity tag to implicated HAI Standard ethical pillars.

**Inputs:**
- `category` — one of: PRI, LAB, ETH, ENV, ANT
- `tag` — one of: UGLY, BAD, GOOD, BROKEN_PROMISE, QUESTIONABLE
- `regulatoryBasis` — free text string

**Logic:**
```
if category = PRI → implicate pillars: VII (Privacy), II (Human Agency)
if category = LAB → implicate: IX (Human Dignity)
if category = ETH → implicate: I (Transparency)
if category = ENV or ANT → implicate: VIII (Societal Harm)
if tag = UGLY or BROKEN_PROMISE → add: IV (Accountability)
if tag = BROKEN_PROMISE and category = ETH → add: VI (Non-Deception)
if regulatoryBasis contains 'disclosure', 'reporting', or 'transparency' → add: I (Transparency) if not already present
Deduplicate using Set
```

**Output:** Array of pillar IDs (Roman numerals as strings). Rendered as cards on block detail page only when array is non-empty.

---

### 2.14 Violation Categorization Logic (v1 API)

**What it does:** Filters violation records by compound criteria for API consumers.

**Inputs:**
- `q` — text search against `title` and `formalSummary` fields (SQL LIKE)
- `company` — ticker string, resolved to `companyId` before filtering
- `category` — exact match on `blocks.category`
- `severity` — exact match on `blocks.violationTag`
- `page` / `limit` — pagination (max 100 per page)
- `use_case` — required, not blank, not blocked

**Logic:** All conditions are ANDed. Pagination is performed in-memory (full result set fetched, then sliced). Total count includes all matching records regardless of page.

**Output:** `{ results: Block[], pagination: { page, limit, total, pages }, technicality_flag: boolean }`

---

### 2.15 Financial Facts Parsing (EDGAR XBRL)

**What it does:** Extracts key financial metrics from SEC EDGAR's structured XBRL company facts endpoint.

**Inputs:**
- `cik` — company CIK, padded to 10 digits

**Logic:** Fetches `https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json`. This endpoint returns all reported XBRL facts. The financials page (`app/financials/page.tsx`) parses:

- **Revenue:** looks for `us-gaap/RevenueFromContractWithCustomerExcludingAssessedTax`, then `us-gaap/Revenues`, then `us-gaap/SalesRevenueNet`. Finds most recent annual (`10-K` form) USD filing. Builds a history array of up to 5 years.
- **Net income:** `us-gaap/NetIncomeLoss` — most recent annual value.
- **R&D spend:** `us-gaap/ResearchAndDevelopmentExpense`
- **Stock buybacks:** `us-gaap/PaymentsForRepurchaseOfCommonStock`
- **Tax expense:** `us-gaap/IncomeTaxExpense`
- **Pre-tax income:** `us-gaap/IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest`
- **Effective tax rate:** `taxExpense / preTaxIncome * 100`
- **Profit margin:** `netIncome / revenue * 100`

**Output:** `CompanyFacts` object with all metrics (null where not found), plus metadata fields `name`, `cik`, `ticker`, `filedAt`, `industry`.

---

### 2.16 Account Number Generation

**What it does:** Creates a new anonymous account identifier.

**Logic:**
1. Generate 4 groups of 4 digits.
2. Each group: random integer 0–9999, zero-padded to 4 digits.
3. Join with hyphens: `XXXX-XXXX-XXXX-XXXX`.

The format means ~10^16 possible values. No email, name, or identity is associated. The account number is the only credential.

**Rate limit:** 5 per IP per hour (in-memory, resets on cold start).

---

## 3. Data Models

### 3.1 Block (Approved Violation Record)

The core unit of the ledger. Lives in `blocks` table. Every field below is also present on `staged_blocks`.

| Field | Type | Required | Semantics |
|---|---|---|---|
| `blockId` | string | ✓ | Format: `OM-YYYY-CAT-TICKER-###`. Globally unique content identifier. Used for IPFS addressing and URLs. |
| `companyId` | integer FK | ✓ | References `companies.id` |
| `category` | enum | ✓ | `PRI` (Privacy), `LAB` (Labor), `ETH` (Ethics), `ENV` (Environment), `ANT` (Antitrust) |
| `violationTag` | enum | ✓ | `GOOD`, `BAD`, `UGLY`, `BROKEN_PROMISE`, `QUESTIONABLE` |
| `title` | string | ✓ | Short human-readable title |
| `formalSummary` | string | ✓ | Regulatory/legal language describing the violation |
| `regulatoryBasis` | string | ✓ | The specific law, rule, or regulation violated |
| `enforcementDetails` | string | ✓ | What enforcement action was taken |
| `jurisdiction` | string | ✓ | Geographic/regulatory jurisdiction |
| `conversationalWhatHappened` | string | ✓ | Plain English: what occurred |
| `conversationalWhyItMatters` | string | ✓ | Plain English: why the public should care |
| `conversationalCompanyResponse` | string | ✓ | Plain English: how the company responded |
| `amount` | real | optional | Dollar amount of fine/penalty |
| `amountCurrency` | string | optional | ISO currency code, default USD |
| `affectedIndividuals` | integer | optional | Number of people impacted |
| `sourcesJson` | JSON string | ✓ (default `[]`) | Array of `RawSource` objects |
| `sourceDisclaimersJson` | JSON string | ✓ (default `[]`) | Array of disclaimer strings |
| `primarySourceUrl` | string | optional | Single canonical source URL |
| `verificationJson` | JSON string | ✓ (default `{}`) | `BlockVerification` object |
| `confidenceScore` | real | ✓ | 0.0–1.0. Agent-assigned confidence. |
| `confidenceRouting` | enum | ✓ | `AUTO_APPROVED`, `QUICK_REVIEW`, `REJECTED` |
| `brokenPromiseJson` | JSON string | optional | `BrokenPromiseCheck` object |
| `ipfsCid` | string | optional | IPFS content identifier for permanent archive |
| `violationDate` | string | optional | `YYYY-MM-DD` format |
| `researchedAt` | string | ✓ | ISO datetime string when agent researched |
| `recordedAt` | timestamp | optional | When block entered the system |
| `createdAt` | timestamp | ✓ | Auto-set |

**`RawSource` object (in `sourcesJson`):**
```
{
  name: string,                   // Human-readable source name
  url: string,                    // Direct URL to source
  domainConfidenceBoost: number,  // Integer contribution to block confidence
  accessedDate: string            // ISO date string
}
```

**`BlockVerification` object (in `verificationJson`):**
```
{
  governmentSourceConfirmed: boolean,
  amountVerified: boolean | null,
  dateCrossChecked: boolean,
  archiveLinksCaptured: boolean
}
```

**`BrokenPromiseCheck` object (in `brokenPromiseJson`):**
```
{
  priorViolationExists: boolean,
  priorCommitmentExists: boolean,
  promiseSource?: string,
  promiseArchiveUrl?: string,
  contradictionDocumented?: boolean
}
```

---

### 3.2 Staged Block

Identical to Block, plus:

| Field | Type | Required | Semantics |
|---|---|---|---|
| `submittedBy` | integer FK | optional | References `users.id` |
| `reviewStatus` | enum | ✓ | `pending`, `approved`, `rejected` |
| `reviewedBy` | integer FK | optional | References `users.id` |
| `reviewNotes` | string | optional | Admin notes on the review decision |

No `recordedAt` or `ipfsCid` — these are assigned on promotion to `blocks`.

---

### 3.3 Company

| Field | Type | Required | Semantics |
|---|---|---|---|
| `id` | integer PK | ✓ | Auto |
| `name` | string | ✓ | Full legal name |
| `slug` | string | ✓ unique | URL-safe lowercase identifier |
| `ticker` | string | ✓ unique | Stock ticker, uppercase |
| `tier` | integer | optional | 1–5 severity tier assigned by OMEN |
| `description` | string | optional | Company description |
| `website` | string | optional | Homepage URL |

---

### 3.4 User (Account)

| Field | Type | Required | Semantics |
|---|---|---|---|
| `id` | integer PK | ✓ | Auto |
| `accountNumber` | string | ✓ unique | `XXXX-XXXX-XXXX-XXXX` format |
| `role` | enum | ✓ | `contributor`, `reviewer`, `admin` |
| `isPaid` | boolean | ✓ | Stripe subscription active |
| `paidAt` | timestamp | optional | When subscription activated |
| `subscriptionId` | string | optional | Stripe subscription ID |
| `companiesTracked` | JSON string | ✓ | Array of ticker strings e.g. `["META","GOOGL"]` |
| `bonusBalance` | real | ✓ | USD balance from approved contributions |
| `createdAt` | timestamp | ✓ | Auto |

---

### 3.5 Alternative (OCA Entry)

| Field | Type | Required | Semantics |
|---|---|---|---|
| `id` | integer PK | ✓ | Auto |
| `name` | string | ✓ | Product/service name |
| `category` | enum | ✓ | `Email`, `Cloud`, `Social`, `Messaging`, `Browser`, `Search`, `OS`, `VPN`, `Finance`, `Other` |
| `websiteUrl` | string | optional | URL |
| `replaces` | string | optional | What mainstream product it replaces (max 100) |
| `whyBetter` | string | optional | Justification (max 500) |
| `openSource` | boolean | ✓ | Open source flag |
| `selfHostable` | boolean | ✓ | Can be self-hosted |
| `upvotes` | integer | ✓ | Aggregate vote count |
| `downvotes` | integer | ✓ | Aggregate vote count |
| `status` | enum | ✓ | `pending`, `approved`, `rejected` |
| `rejectionReason` | string | optional | Admin rejection note |
| `submittedBy` | string | optional | Account number of submitter |

---

### 3.6 Contribution (Data Co-op)

| Field | Type | Required | Semantics |
|---|---|---|---|
| `accountNumber` | string | ✓ | Submitter's account |
| `type` | enum | ✓ | `BREACH_REPORT`, `POLICY_CHANGE`, `COURT_DOCUMENT`, `TRANSLATION`, `OCA_CONTRIBUTION` |
| `title` | string | ✓ | max 300 |
| `description` | string | ✓ | 10–5000 chars |
| `fileUrl` | string | optional | Uploaded document URL |
| `companyTicker` | string | optional | Related company |
| `blockId` | string | optional | Related block ID |
| `status` | enum | ✓ | `pending`, `approved`, `rejected`, `paid` |
| `rewardAmount` | real | optional | USD amount admin assigned |
| `rejectionReason` | string | optional | |
| `reviewedAt` | timestamp | optional | |

---

### 3.7 API Client

| Field | Type | Required | Semantics |
|---|---|---|---|
| `apiKey` | string | ✓ unique | Bearer token |
| `clientName` | string | ✓ | Registered name |
| `email` | string | ✓ | Contact email |
| `useCase` | string | ✓ | Declared intended use (free text) |
| `tier` | enum | ✓ | `STARTER`, `PROFESSIONAL`, `ENTERPRISE`, `RESTRICTED` |
| `isActive` | boolean | ✓ | Suspension flag |

---

### 3.8 Source Registry

| Field | Type | Semantics |
|---|---|---|
| `name` | string | Human-readable name |
| `domain` | string | Registered domain e.g. `sec.gov` |
| `sourceType` | enum | `SEC_FILING`, `COURT_RECORD`, `REGULATORY_DECISION`, `GOVERNMENT_DOCUMENT` |
| `credibilityBase` | integer | 0–100 base score |
| `isApproved` | boolean | Whether this domain is in the approved list |
| `isBlocklisted` | boolean | Whether this domain is blocked |

---

### 3.9 Legal Attack

| Field | Type | Semantics |
|---|---|---|
| `companyId` | FK | Which company filed the attack |
| `title` | string | Name of the legal action |
| `description` | string | Description |
| `status` | enum | `active`, `resolved`, `dismissed` |
| `filedAt` | timestamp | Date filed |

---

### 3.10 Contribution Payment (Withdrawal)

| Field | Type | Semantics |
|---|---|---|
| `accountNumber` | string | Requester |
| `amount` | real | USD amount requested |
| `payoutMethod` | enum | `MONERO`, `USDC`, `FIAT` |
| `payoutAddress` | string | Wallet address or bank detail |
| `status` | enum | `pending`, `processing`, `completed`, `failed` |

---

### 3.11 Reward Schedule

Defined in `lib/contributions/rewards.ts`. Mid-range formula: `(min + max) / 2` rounded.

| Type | Low | Medium | High |
|---|---|---|---|
| BREACH_REPORT | $5–15 | $15–40 | $40–100 |
| POLICY_CHANGE | $2–8 | $8–20 | $20–50 |
| COURT_DOCUMENT | $10–25 | $25–60 | $60–150 |
| TRANSLATION | $5–15 | $15–35 | $35–80 |
| OCA_CONTRIBUTION | $1–5 | $5–15 | $15–30 |

---

## 4. API Shapes

### Internal (consumer-facing v1)

All v1 endpoints require `Authorization: Bearer {apiKey}` header. All responses are watermarked envelopes: `{ data: T, _omen: { exportedBy, exportDate, intendedUse, watermark, terms } }`.

---

**`GET /api/v1/companies/:ticker`**
- **Tier:** STARTER+
- **Input:** ticker in URL path
- **Output:** `{ name, ticker, slug, website, description, violationCount, violationCountByCategory, totalFines, mostRecentViolation, severityBreakdown }` — aggregated from all blocks for that company
- **Failures:** 401 (bad key), 403 (suspended), 404 (company not in ledger), 429 (rate limit)

---

**`GET /api/v1/violations/search`**
- **Tier:** STARTER+
- **Inputs:** `q`, `company`, `category`, `severity`, `use_case` (required), `page`, `limit` (max 100)
- **Output:** `{ results: Block[], pagination: {...}, technicality_flag: boolean }`
- **Failures:** 400 (missing use_case), 403 (blocked use_case), 429 (rate limit)

---

**`GET /api/v1/violations/:id`**
- **Tier:** STARTER+
- **Input:** `blockId` in URL path
- **Output:** Single block record with company metadata
- **Failures:** 404 (block not found)

---

**`GET /api/v1/summarize`**
- **Tier:** PROFESSIONAL, ENTERPRISE only
- **Inputs:** `ticker` (required), `category` (optional filter)
- **Output:** `{ company, category, totalViolations, totalFines, byCategory, bySeverity, jurisdictions[], regulatoryBases[], violations[] }`

---

**`GET /api/v1/compare`**
- **Tier:** PROFESSIONAL, ENTERPRISE only
- **Inputs:** `tickers` — comma-separated, 2–5 values
- **Output:** `{ comparison: [{ ticker, name, violationCount, totalFines, byCategory, bySeverity }] }` — one entry per found company

---

### Internal (session-based dashboard)

All require `omen_session` cookie set by verify-account endpoint.

**`GET /api/dashboard/exposure`** → returns `ExposureResult`

**`POST /api/dashboard/track-company`** → body `{ ticker, action: 'add'|'remove' }` → updates user's `companiesTracked` JSON array

**`GET /api/dashboard/balance`** → returns `{ balance: number }`

**`GET /api/dashboard/companies/search?q=`** → returns matching companies for onboarding search

**`GET /api/dashboard/companies/top`** → returns top 50 companies by block count

---

### Auth endpoints

**`POST /api/auth/generate-account`** → returns `{ accountNumber: string }` — creates user row, rate limited 5/IP/hr

**`GET /api/auth/verify-account`** → reads `omen_session` cookie, returns `{ valid: boolean, isPaid: boolean, accountNumber: string }` or 401

**`POST /api/auth/verify-account`** → body `{ accountNumber }` → validates format and existence, sets httpOnly `omen_session` cookie on success

---

### EDGAR proxy endpoints

**`GET /api/edgar/search?company=`** → returns `{ source, matches: [{ name, cik, ticker, score }] }`

**`GET /api/edgar/facts?cik=`** → proxies EDGAR XBRL JSON, returns raw companyfacts object

**`GET /api/edgar/proxy?cik=`** → returns `{ ratio, method, filingUrl, filingDate, rawText }`

**`GET /api/violations-summary?name=&ticker=`** → returns `{ found, company, summary: { totalViolations, totalFines, violationsByCategory, tagCounts, mostRecentViolation, recentViolations[] } }`

---

### OCA endpoints

**`GET /api/oca/list?category=&sort=`** → returns ranked alternatives, requires paid session

**`POST /api/oca/submit`** → body validated by `ocaSubmitSchema`, requires paid session

**`POST /api/oca/vote`** → body `{ alternativeId, vote: 'up'|'down' }`, requires paid session

---

### Contribution endpoints

**`GET /api/contributions/list`** → session-authenticated user's contributions

**`POST /api/contributions/submit`** → validated by `contributionSubmitSchema`

**`POST /api/contributions/withdraw`** → validated by `withdrawSchema`, calls `processPayout()`

---

### Stripe endpoints

**`POST /api/stripe/create-checkout`** → creates Stripe checkout session, returns `{ url }`

**`POST /api/stripe/webhook`** → `checkout.session.completed` → sets user `isPaid = true`, stores `subscriptionId`

---

## 5. Design Tokens

### Colors

| Token | Value | Usage |
|---|---|---|
| `--omen-bg` | `#0b0b0c` (dark) / `#EDEDEA` (light) | Page background |
| `--omen-text` | `rgba(255,255,255,0.92)` (dark) / `#111110` (light) | Primary text |
| `--omen-border` | `rgba(255,255,255,0.08)` (dark) / `rgba(0,0,0,0.12)` (light) | Dividers, card borders |
| `--omen-muted` | `rgba(255,255,255,0.35)` (dark) / `#666660` (light) | Secondary text, labels |
| `--omen-surface` | `#111111` (dark) / `#e2e2de` (light) | Cards, input backgrounds |
| `--omen-sidebar` | `#0e0e0f` (dark) / `#e2e2de` (light) | Left sidebar, footer |
| `--omen-accent` | `#B0B0B0` (dark) / `#2a2a28` (light) | Interactive elements, links, borders on nav buttons |
| `--tag-ugly` | `#E05C5C` | UGLY violation tag (red) |
| `--tag-broken-promise` | `#d4af37` | BROKEN_PROMISE tag (gold) |
| `--tag-bad` | `#cd853f` | BAD tag (amber) |
| `--tag-questionable` | `#708090` | QUESTIONABLE tag (slate) |
| `--tag-good` | `#B0B0B0` | GOOD tag (silver, same as accent) |

**Category colors (inline, not CSS vars):**
- PRI: `#7eb8d4` (steel blue)
- LAB: `#d4a76a` (warm amber)
- ETH: `#c47eb8` (muted purple)
- ENV: `#7eb87e` (soft green)
- ANT: `#d47e7e` (muted red)

### Typography

- **Font stack:** `var(--font-ibm-plex-mono), ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace`
- **Loaded via Next.js:** IBM Plex Mono, weights 400 and 700
- **CSS variable:** `--font-ibm-plex-mono`
- No proportional fonts used anywhere. The entire product is monospace.

### Scale

- **Left sidebar width:** 360px (inline style on layout div)
- **Right sidebar width:** `--sidebar-width: 220px`
- **Header height:** `--header-height: 49px` (used only for mobile positioning)
- **Container max-width:** 720px with `margin: 0 auto; padding: 0 2rem`
- **Financials page max-width:** 900px

### Borders and Radii

- Standard border: `1px solid var(--omen-border)`
- Nav link buttons: `1px solid var(--omen-accent)` — no border-radius (sharp corners)
- Auth buttons (sidebar): `border-radius: 4px`
- Toggle buttons: `border-radius: 4px`
- Screensaver: no radius
- No `border-radius` used anywhere on content cards or record displays — all sharp corners

### Spacing

No spacing scale defined via tokens. Spacing is inline throughout in `rem` and `px` values:
- Section gaps: `2rem`, `2.5rem`, `3rem`
- Small gaps: `0.4rem`, `0.5rem`, `0.6rem`, `0.75rem`
- Padding on cards: `0.75rem 1.25rem` (financials boxes), `1rem` (sidebar)
- Auth button padding: `8px 12px`
- Nav button padding: `0.5rem 0.75rem`

### Animations

- `@media (prefers-reduced-motion: reduce)` — all animations/transitions set to `0.01ms` duration
- Screensaver eye blink: `transition: opacity 0.15s ease`
- Blink interval: 3000ms, blink duration: 200ms
- No other explicit animation values

---

## 6. Component Inventory

| Component | File | Description | Props / State | Analysis logic? |
|---|---|---|---|---|
| `RootLayout` | `app/layout.tsx` | Shell: left sidebar (logo, nav, auth buttons, theme toggle), main content slot, right sidebar, footer | `children` | No |
| `Sidebar` | `app/components/Sidebar.tsx` | Right panel: company search with debounce, violation type checkboxes, tier checkboxes | State: `isOpen`, `search`, `results`, `violationFilters`, `tierFilters` | No (filtering not yet wired to ledger) |
| `ThemeProvider` | `app/components/ThemeProvider.tsx` | React context for dark/light toggle with localStorage persistence | Context: `theme`, `toggle` | No |
| `ThemeToggle` | `app/components/ThemeToggle.tsx` | `[ DARK ]` / `[ LIGHT ]` button pair | Reads `useTheme()` context | No |
| `Screensaver` | `app/components/Screensaver.tsx` | Full-screen eye SVG overlay after 7min idle | State: `active`, `eyeOpen` | No |
| `InstallPrompt` | `app/components/InstallPrompt.tsx` | PWA install prompt banner | Internal state | No |
| `EvidenceBlock` | `app/components/EvidenceBlock.tsx` | Single source entry with credibility bar | Props: `sourceUrl`, `sourceType`, `title`, `documentDate`, `credibilityScore`, `archivedUrl`, `isLast` | **Yes** — credibility bar calculation, credibility color thresholds |
| `HomePage` | `app/page.tsx` | Landing page: mission, HAI Standard section, START HERE, violation classification | Server component, no state | No |
| `LedgerPage` | `app/ledger/page.tsx` | Public ledger: all blocks with category/tag display | Server component | No |
| `CompanyPage` | `app/ledger/[company]/page.tsx` | Company detail: all blocks for one company, stats | Server component | No |
| `BlockDetailPage` | `app/ledger/block/[id]/page.tsx` | Full block record: dual-tone display, sources, verification, broken promise, HAI pillars | Server component | **Yes** — HAI pillar mapping (`getRelevantPillars`), confidence routing display logic |
| `FinancialsPage` | `app/financials/page.tsx` | EDGAR financial report generator with state machine | State machine: `search`→`confirm`→`loading`→`report`/`notfound` | **Yes** — XBRL parsing, CEO ratio display, peer comparison, word overlap scoring |
| `DashboardPage` | `app/dashboard/page.tsx` | Personal exposure dashboard | Client: `exposure`, `isPaid`, `loading` | No (exposure calculated server-side) |
| `SignupPage` | `app/dashboard/signup/page.tsx` | Account generation flow | Client state: `accountNumber`, `loading`, `copied`, `confirmed` | No |
| `LoginPage` | `app/dashboard/login/page.tsx` | Account number entry | Client state: `accountNumber`, `error`, `loading` | No |
| `OcaPage` | `app/oca/page.tsx` | Alternatives directory with voting | Client: category filter, sort, vote state | No |
| `TransparencyPage` | `app/transparency/page.tsx` | Transparency report (static) | Server component | No |
| `LegalBattlesPage` | `app/legal-battles/page.tsx` | Legal attacks tracker | Server component | No |
| `ApiDocsPage` | `app/api-docs/page.tsx` | API documentation | Static server component | No |

---

## 7. Key Architectural Decisions

### Decisions to preserve:

**Dual-tone block rendering.** Every violation record has two presentations: formal regulatory language and plain English. This is not a UI choice — it is a structural principle in the data model (`formalSummary` + `conversationalWhatHappened/WhyItMatters/CompanyResponse`). A browser implementation should maintain this distinction.

**Separation of staged and approved tables.** The schema has `blocks` (public, approved) and `staged_blocks` (AI output, pending review). This staging gate is architecturally important — it prevents unverified AI output from entering the public record. The browser equivalent should preserve this gate even if the review mechanism differs.

**Content-addressed block IDs.** The `OM-YYYY-CAT-TICKER-###` format combined with IPFS pinning creates permanent, linkable, archivable records. The block ID is the canonical reference. This is a design principle, not an implementation detail.

**Mandatory source typing.** Only four source types are accepted: SEC filings, court records, regulatory decisions, government documents. This constraint prevents opinion, reporting, or hearsay from entering the ledger. The browser should enforce this at whatever equivalent input boundary exists.

**Watermarked API responses.** Every API export embeds who requested it, when, and for what declared purpose. This is accountability infrastructure, not just metadata.

**Use case blocking at the API layer.** The `representing-defendant` and `reputation-management` blocks are hardcoded and cannot be overridden by tier. This is a mission-critical constraint.

**Cookie-based auth with no email.** The Mullvad-style `XXXX-XXXX-XXXX-XXXX` account number stored in an httpOnly `omen_session` cookie is intentional. Zero PII collection. The browser should preserve this pattern.

---

### Decisions to reconsider in a fresh implementation:

**SQLite as the primary database.** The `CLAUDE.md` acknowledges this is temporary ("migrating to PostgreSQL/Supabase later"). The rate limiting, session management, and pattern detection are all in-memory and not distributed. SQLite is unsuitable for any production scale. The browser build should start on Postgres.

**In-memory rate limiting.** Both the account generation limiter and the API rate limiter use `Map` with no persistence. Every cold start resets all counters. A Redis-backed store is required for production.

**Full-table scans for search.** The `LIKE '%query%'` pattern on `blocks.title` and `blocks.formalSummary` does not use indexes. At any meaningful data size this will be slow. Full-text search (PostgreSQL's `tsvector`, Meilisearch, or similar) should be planned from the start in the browser build.

**Pagination in application memory.** Both the v1 search API and several other list endpoints fetch full result sets and slice in JavaScript. This is a correctness issue (total count is wrong if results aren't paged in DB) and a performance cliff.

**`(block as any)` casts throughout the block detail page.** The `ipfsCid` field is accessed via type cast because it was added after the initial schema without a type update. This signals technical debt in the type layer.

**`stageBlock` does not fully map `RawBlock` fields.** The `stageBlock` function in `lib/agent/stageBlock.ts` inserts a `StagedBlockInput` (which has only `companyId`, `title`, `content`, `violationTag`, `sourceUrl`) into a table that expects many more fields. The function passes `input as any` — meaning the actual DB insert likely fails or produces incomplete records for non-trivial blocks. This is a significant bug that will only surface at runtime. The block staging pipeline in the private repo should be cross-referenced against the actual schema before relying on it.

**The right sidebar filter UI is disconnected.** `Sidebar.tsx` renders violation type and tier checkboxes but the state (`violationFilters`, `tierFilters`) is never passed anywhere. The filters are visible but non-functional. They are not wired to the ledger page.

**`EvidenceBlock` is defined but never used.** The component exists and has a well-designed API, but `BlockDetailPage` renders sources with its own inline loop. Either the component or the inline rendering should be standardized.

---

## 8. What Transfers To The Browser

### Highest-value transfers:

**The data model.** The full block schema — especially the dual-tone structure, the `RawSource` format with `domainConfidenceBoost`, the `BlockVerification` object, and the `BrokenPromiseCheck` structure — is the intellectual core of the system. A browser can consume and display this model without modification. Design your local storage or backend schema around these exact fields.

**The analysis logic as standalone functions.** Every function in Section 2 above is extractable and portable:
- `calculateExposure()` maps directly to "what violations exist in the browser history of sites the user visits"
- `rankAlternatives()` with the violation-penalty heuristic is directly applicable
- `getRelevantPillars()` for HAI mapping transfers verbatim
- The CEO pay ratio extraction (4-strategy pipeline) is a standalone algorithm with no web-app dependencies

**The category and severity taxonomy.** `PRI/LAB/ETH/ENV/ANT` × `GOOD/BAD/UGLY/BROKEN_PROMISE/QUESTIONABLE` is the classification system the browser will use to label corporate behavior in real-time as users visit sites. This taxonomy should be adopted unchanged.

**The source credibility model.** The concept of domain-level credibility scores, source types restricted to official government sources, and `domainConfidenceBoost` per citation is directly applicable to browser-side confidence scoring of what the AI agent finds.

**The confidence routing logic.** AUTO_APPROVED / QUICK_REVIEW / REJECTED thresholds (approximately 93% confidence for auto-approval) should carry forward as the mechanism for deciding what gets surfaced immediately vs. flagged for review.

**The API safeguard stack.** Rate limiting, use-case declaration, watermarking, technicality detection, pattern detection — this entire layer is browser-portable if the browser exposes an API for third-party access to its analysis data.

**The design token set.** The monospace aesthetic, the silver/charcoal palette, the tag color system, the sharp-corner archival aesthetic — these are production-ready and should be adopted as the browser's UI language for OMEN panels and overlays.

**The OCA ranking algorithm.** The idea that an alternative's score is penalized if that alternative is itself in the violation ledger is a meaningful integrity check. Transfer this.

**The reward structure.** The five contribution types and their reward ranges represent considered pricing for data labor. The browser's equivalent contributor economy should use this as a baseline.

---

### Does not transfer (web-app-specific):

**Next.js App Router structure.** All routing, server components, and API route handlers are Next.js-specific. The browser will not have a Next.js backend.

**Drizzle ORM and SQLite.** The browser will need a different persistence layer — likely a combination of local encrypted storage for cached data and a remote sync endpoint.

**Stripe integration.** Payment infrastructure is web-specific. The browser's subscription model (if any) will differ.

**The EDGAR financial integration.** The `/api/edgar/*` routes proxy to SEC APIs with SSL bypass logic for development. This is a financial reporting feature built for the web app's "Financials" page — it's not directly applicable to real-time browser activity monitoring. The concept of pulling financial context for companies the user encounters is valuable, but the EDGAR-specific implementation is web-only.

**Session cookie authentication.** `omen_session` cookies are a web concept. The browser extension will need a different auth/identity model — likely a local key store tied to the browser profile.

**The admin panel.** Admin moderation UI and API are web-only.

**The PWA / service worker.** `InstallPrompt.tsx`, `manifest.json`, and `sw.js` are web-app concerns.

**The screensaver.** Idle detection via `mousedown/mousemove/keydown` events is a web page concept. A browser extension has its own idle APIs.

---

## 9. Open Questions

**What is the actual block ID format?** The schema comment says `OM-YYYY-CAT-TICKER-###` but no code in the public repo generates this ID. It is produced by the AI agent in the private repo. The public repo consumes it but never validates the format. A new engineer would not know what `###` represents, whether it's sequential per company or global, or how it handles collisions.

**Where is the AI research prompt?** `lib/agent/researchAgent.ts` calls `loadPrompt()` from `lib/agent/parseCompanies.ts`. The prompt content is a trade secret, stored in the private repo. The public repo has a stub. This means the agent pipeline cannot be run from the public repo alone.

**How does staging actually work?** `stageBlock()` in the public repo inserts a `StagedBlockInput` (5 fields) into `staged_blocks` (30+ fields). The function passes `input as any`. This either works because the private agent calls a different staging function, or it partially fails silently. The actual staging mechanism is unclear.

**What does "QUESTIONABLE" mean exactly?** The tag exists in the enum and is used in display code, but the research agent instructions (private) presumably define when it's applied vs. `BAD`. The public schema has no documentation distinguishing `BAD` from `QUESTIONABLE` beyond the home page string "Under investigation or alleged."

**Are blocks in `blocks` or `staged_blocks` surfaced on the ledger?** Every public-facing page (`ledger/page.tsx`, `ledger/[company]/page.tsx`, `ledger/block/[id]/page.tsx`) queries `stagedBlocks`, not `blocks`. The `blocks` table (approved, post-review) is queried only by the v1 API endpoints. This is significant: the public ledger shows staged content, while the paying API clients get reviewed content. This may be intentional but is not documented.

**The Sidebar filters are non-functional.** `violationFilters` and `tierFilters` state in `Sidebar.tsx` are never passed to any parent or exposed via context. A new engineer would assume they're wired to the ledger — they're not. This is a prominent UI affordance with no backend.

**What happens after the confirmation step in Financials?** The financials page state machine goes `search → confirm → loading → report`. The `generateReport()` function fires CEO pay ratio and peer comparison requests in background. There is no cancel, error recovery, or timeout for these background fetches beyond setting `proxyResult` to a not-found state. If both network calls hang, the UI shows "loading..." indefinitely.

**How are companies added to the database?** The private repo has a `parseCompanies.ts` that presumably reads `companies.txt`. But the public repo's `ensureCompany()` function creates companies with `ticker` set to `slug.toUpperCase()` — meaning the ticker field is derived from the slug, not read from a canonical source. If a company is created via `ensureCompany()`, its ticker is whatever string was used as the slug, uppercased. Whether this matches the actual stock ticker is not guaranteed.

**Is IPFS actually used?** The `lib/ipfs.ts` file exists and `@pinata/sdk` is installed. The schema has `ipfsCid` fields on blocks. But no route in the public repo pins anything to IPFS. The pinning presumably happens in the private research pipeline. The public repo only reads and displays existing CIDs.

**What does tier 1–5 mean for companies?** The `companies.tier` field is an integer 1–5. The sidebar has tier filter checkboxes. The ledger page displays tier. But no code in the public repo assigns tiers or defines what each tier represents. It is presumably assigned by the private pipeline based on criteria not visible here.

**Why does `proxy.ts` export `proxy` instead of `middleware`?** The `CLAUDE.md` says "Next.js 16 renamed `middleware.ts` to `proxy.ts`." This is incorrect — Next.js 16 does not rename middleware files. The actual convention is still `middleware.ts` at the root. The renamed file with a renamed export may mean this middleware is not actually active in the Next.js request pipeline.

---

The research pipeline's own specification is kept in the private repository.
