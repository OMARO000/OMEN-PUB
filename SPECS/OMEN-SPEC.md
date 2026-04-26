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

---

## PART II — PRIVATE REPOSITORY SPECIFICATION

---

# OMEN Private Repository — Reference Specification for Omaro Browser
**Prepared from:** /Users/trentonroberts/Documents/OMEN/omen-private
**Source files analyzed:** AI_RESEARCH_PROMPT.md (v3.0, 2026-03-01), companies.txt (646 entries), README.md, OMEN_OFFICIAL_ROADMAP_v4.docx (binary, unread)
**Date of analysis:** 2026-04-20

Sensitivity note: AI_RESEARCH_PROMPT.md is self-described as a trade secret of OMARO Public Benefit Corporation and carries an explicit instruction: "Do not commit to any public repository. Store in: omen-private repo OR .env.local as AI_RESEARCH_PROMPT variable." Every section of this specification that derives from that file should be treated as confidential. The companies.txt file and any logic derived from the confidence scoring formula, routing thresholds, source approval list, or BROKEN_PROMISE detection protocol falls in the same category.

## 1. System Overview

OMEN (the name is never expanded in the codebase) is a corporate accountability documentation system operated by OMARO Public Benefit Corporation. Its purpose is to produce a large-scale, machine-generated database of verified corporate violations — legal, regulatory, labor, environmental, and ethical — across 646 global companies.

The problem it solves: Public information about corporate misconduct is scattered across hundreds of government databases, court systems, and regulatory agencies in multiple jurisdictions and languages. Researching any single company's enforcement history across all five violation categories requires navigating the FTC, SEC, DOJ, EPA, NLRB, EEOC, CFPB, OSHA, PACER, Irish DPC, UK ICO, French CNIL, EU Commission, and more — simultaneously. OMEN automates this cross-jurisdictional research at scale, standardizes the output into a consistent schema, assigns confidence scores, and routes records for either automated publication or human review.

Who it serves: The end consumers of OMEN data are users of the Omaro Browser — people who want to understand the accountability record of a company they are researching, purchasing from, working for, or investing in.

Core value proposition as demonstrated by the code: OMEN produces court-grade, primary-source-only violation records that can be automatically verified for credibility. Every record traces to a government enforcement action, court filing, or regulatory decision — never a news article or secondary source alone. This is the fundamental differentiator: the system is architecturally incapable of publishing a violation that cannot be attributed to an official primary source. The confidence scoring formula mechanically rejects records without government source confirmation regardless of what other evidence exists. This isn't a policy preference — it's enforced at the routing layer: government_source_confirmed: false → hard kill, no routing to review, record discarded.

What this repo is not: There is no application code in this repository. No frontend, no backend, no API server, no database schema, no build tooling. The repository is a specification and data repository. The "logic" is entirely expressed as natural language instructions to an AI agent (the research prompt), a data file (companies.txt), and a binary roadmap document. A browser implementation will need to be built from scratch using this as a specification.

## 2. Analysis Logic Specification

This section documents every processing, scoring, and routing function in the system. These are expressed as natural language rules in the AI research prompt. Each subsection is complete enough for reimplementation on any stack.

### 2.1 Per-Company Research Protocol

Input: A company record (name, ticker, tier).
Process: Execute all 10 research steps across all 5 violation categories (PRI, LAB, ANT, ETH, ENV) in sequence. Never pre-limit which categories to research based on the company's industry.

The 10 research steps, in order:

1. Pull the company's SEC filings (10-K, 10-Q, 8-K) — specifically the "Legal Proceedings" section. This covers self-reported violations across all categories.
2. Search the FTC enforcement database by company name and all known subsidiaries.
3. Search the GDPR Enforcement Tracker by company name.
4. Search OSHA, DOL, and EPA databases by company name (covers LAB and ENV primarily).
5. Search PACER federal court dockets for major federal cases across all categories.
6. Search the relevant national Data Protection Authority (DPA) website — Irish DPC for Meta/Google/TikTok, UK ICO for UK-based operations, French CNIL for French companies, etc.
7. Search NLRB and EEOC for labor and discrimination cases specifically.
8. Search DOJ press releases and State Attorney General offices for antitrust and ethics cases.
9. Search for confirmed data breaches — but only where an enforcement action exists (FTC complaint, State AG action, or SEC 8-K). Never cite a breach database directly as a primary source.
10. Search the Wayback Machine specifically to verify any BROKEN_PROMISE detection — historical policy pages, prior commitments, consent decree compliance.

Output: Zero or more violation blocks per company, each requiring at least one approved primary source before creation. If no violations found in any category: document as "No confirmed violations found as of [date]. Quarterly review scheduled."

Critical constraint: The source must be found FIRST, before a block is created. Never create a block and then search for a source to justify it.

### 2.2 Violation Block Creation

Input: A confirmed violation with at least one 5-star primary source.
Process:

1. Assign a Block ID in the format OM-[YEAR]-[CATEGORY]-[TICKER]-[###]. Year is the year of the violation (not the research date). Numbers are sequential per company per year per category, zero-padded to 3 digits.
2. Classify into exactly one of five violation categories: PRI, LAB, ANT, ETH, ENV.
3. Run tag assignment logic (see §2.3).
4. Run confidence scoring (see §2.4).
5. Run confidence routing (see §2.5).
6. For any violation tagged or potentially tagged BROKEN_PROMISE, run the BROKEN_PROMISE detection protocol (see §2.6).
7. Produce both the formal text section and the conversational text section (see §3.1 for schema).
8. If confidence routing is REJECTED, discard entirely — do not save.

### 2.3 Violation Tag Assignment

Every block receives exactly one of five tags. Assignment is deterministic based on criteria, not editorial judgment.

**UGLY** — Assign if ANY ONE of these is true:

- Fine or penalty is ≥ $1,000,000,000 (USD or EUR equivalent)
- The violation resulted in documented physical harm or death
- The violation involved children's data or child safety failures
- Criminal charges were filed against the company or its executives
- The violation affected more than 100,000,000 individuals

**BROKEN_PROMISE** — Assign if ANY ONE of these is true:

- Company previously committed to fixing the same issue (same category, same violation type)
- Company made a public statement directly contradicted by this violation (e.g., "we do not sell data" → caught selling data)
- The violation occurred after a consent decree, settlement agreement, or regulatory commitment on the same issue
- The company's own published policy explicitly prohibits the behavior documented in the violation

**BAD** — Default tag. Assign when:

- Standard regulatory fines
- First-time violations in this category for this company
- Data breaches without aggravating factors
- General non-compliance

**QUESTIONABLE** — Assign if ANY ONE of these is true:

- Under active investigation with no final ruling issued
- Regulatory inquiry opened but no formal enforcement action taken
- Company has filed appeal and original ruling is suspended or under review
- Confidence score falls between 60–79%
- Multiple conflicting reports from primary sources with no resolution
- Warning or advisory issued but no formal fine
- Proposed fine announced but not finalized
- Class action filed but not certified or settled

Additional constraints for QUESTIONABLE:

- Never state amounts as confirmed if they are proposed — use "proposed" or "pending"
- Never say "violated" — use "alleged," "under investigation," or "accused of"
- Every QUESTIONABLE block must include a status disclaimer in both formal and conversational sections
- QUESTIONABLE is not a fallback for weak evidence — if no 5-star source exists at all, discard entirely
- Expected to represent approximately 10–15% of total blocks

**GOOD** — Assign only when ALL FOUR of these are true simultaneously:

- Company took voluntary, proactive action (not forced by regulators)
- The action meaningfully improved privacy, labor, ethics, or environmental practices
- The action is documented and verifiable (not just a press release or promise)
- No concurrent violations in the same category undermine the positive action

GOOD is intentionally rare. All four criteria must be met.

Priority ordering when multiple tags could apply: UGLY and BROKEN_PROMISE take precedence over BAD. QUESTIONABLE can coexist with UGLY or BROKEN_PROMISE only when confidence is 60–79% and the qualifying criteria for UGLY/BROKEN_PROMISE are definitively met by available evidence.

### 2.4 Confidence Scoring

Input: A proposed violation block with one or more sources.
Output: A confidence score integer from 0–100.

**Step 1:** Start with BASE_SCORE = 50.

**Step 2:** For each source, apply domain confidence boost:

| Domain Pattern | Boost |
|---|---|
| .gov (any US government domain) | +10 |
| sec.gov specifically | +15 (supersedes the +10) |
| .gov with /enforcement/ or /decisions/ path | +15 (supersedes the +10) |
| .uscourts.gov (PACER) | +12 |
| .europa.eu (EU Commission, CJEU) | +10 |
| dataprotection.ie, cnil.fr, ico.org.uk, or other national DPA domains | +12 |
| web.archive.org | +8 (only for BROKEN_PROMISE archiving, never as violation source) |
| Company's own SEC filing (10-K, 10-Q, 8-K from sec.gov/cgi-bin/browse-edgar) | +10 |
| Major news outlet (Reuters, AP, Bloomberg) with embedded link to a primary source | +3 |
| News outlet without an embedded primary source link | +0 |
| enforcementtracker.com | +0 (discovery tool only — never appears in sources array) |
| Any blocked domain | −100 (auto-reject) |

**Step 3:** Apply per-record adjustments:

- Source contains exact dollar/euro fine amount: +5
- Source contains a specific date: +5
- Source contains a case number or docket number: +5
- Multiple independent sources confirm the same facts: +3
- Any facts conflict between sources: −10
- Only one source found for the entire block: −20
- Source is older than 30 days with no corroborating source: −15

**Step 4:** Clamp to range:

FINAL_SCORE = min(100, max(0, calculated_score))

**Step 5:** Hard kill check:
If government_source_confirmed is false AND no source from the 29 approved sources directly documents the violation → discard entirely. Do not adjust the threshold. Do not route to review.

### 2.5 Confidence-Based Routing

Input: A completed block with final confidence score.
Output: Routing decision and action.

| Score Range | Routing Label | Action |
|---|---|---|
| 93–100 | AUTO_APPROVED | Staged for IPFS upload — no human review required |
| 80–92 | QUICK_REVIEW | Human reviewer examines within 48 hours |
| 60–79 | QUICK_REVIEW + auto-tag QUESTIONABLE | Unless UGLY or BROKEN_PROMISE criteria are definitively met |
| 0–59 | REJECTED | Block discarded entirely — not saved, not queued |

Hard kill rule: If government_source_confirmed: false AND no approved source directly documents the violation → REJECTED immediately, regardless of score calculation. No exceptions, no appeals, no threshold adjustments.

### 2.6 BROKEN_PROMISE Detection Protocol

This runs for every block that may qualify for the BROKEN_PROMISE tag. It is a 3-step sequential check.

**Step 1 — Check for prior violations:**
Has this company been documented in OMEN for the same category AND same violation type before?

- Yes → proceed to Step 2
- No → apply standard tag assignment, skip remaining steps

**Step 2 — Check for prior commitments:**
Search for any of:

- Consent decrees (FTC, DOJ) in the same category
- Settlement agreements in the same issue area
- Public commitments made in response to prior enforcement (company blog posts, press releases, investor communications)
- Explicit policy language on the company's website that prohibits the behavior

Use the Wayback Machine to verify that prior policy pages or commitment posts actually existed at the claimed date. Capture the archive URL.

**Step 3 — Compare promise vs. reality:**
If a prior commitment exists AND the current violation directly contradicts it:

- Assign BROKEN_PROMISE tag
- Document the original promise with: exact date, source URL, exact quote
- Document the current violation with: enforcement decision, date, authority
- Show the contradiction explicitly in both Formal section and Conversational section

The broken_promise_check object in the JSON output must include: prior_violation_exists, prior_commitment_exists, promise_source (text of quote + date), promise_archive_url (Wayback Machine URL), contradiction_documented (boolean).

### 2.7 Source Validation

Input: A URL or source citation.
Output: Approved or rejected.

**Approved sources (29 total):**
- US Federal: FTC, SEC/EDGAR, DOJ, EPA/ECHO, DOL/WHD, OSHA, CFPB, NLRB, EEOC
- US Courts/Legal: PACER/federal courts, State AG offices, State court records
- EU/UK: GDPR Enforcement Tracker (discovery only — never in sources array), Irish DPC, French CNIL, German BfDI, UK ICO, CJEU, EU Commission Competition
- Asia-Pacific: Japan PPC, South Korea PIPC, Singapore PDPC, Australia OAIC, Australia ACCC
- Global: Wayback Machine (BROKEN_PROMISE archiving only — never as violation source), Company SEC filings, State environmental agencies

**Rejected sources (blocked list):**
Yelp, Google Maps/Reviews, Facebook posts, Twitter/X posts, Reddit posts/comments, Wikipedia, YouTube comments, TikTok videos, non-expert blog posts, competitor press releases, anonymous forums (4chan, HackerNews comments), Glassdoor reviews, LinkedIn posts, Quora answers, non-journalist Medium articles, AI-generated content or summaries.

**Specific exclusions worth noting** (these are called out explicitly in the prompt because they are plausible-seeming but disqualified):

- CourtListener.com — third-party PACER aggregator, not approved; cite PACER directly
- classaction.org, topclassactions.com, any plaintiff law firm site — find the underlying court record
- Have I Been Pwned — find the FTC complaint, State AG action, or SEC 8-K instead
- ILO (International Labour Organization) — no enforcement authority, no binding decisions
- UN Global Compact — same reason
- enforcementtracker.com — discovery tool only, never citable

**Rejection response format:**
When a source is rejected, the agent outputs a structured JSON object containing: rejected_source (URL), source_type (blocked category), reason (standard language citing OMEN's court-grade credibility standard), suggestion (instruction to find the underlying enforcement action or court filing).

### 2.8 Ticker Uniqueness Resolution

Input: A company name and proposed ticker.
Output: A unique ticker guaranteed not to conflict with any other company in the 646-company universe.

**Resolution algorithm (applied in order):**

1. Original/primary company keeps the base ticker unchanged.
2. If conflict detected for a second company, append the 2-letter country code: SPOT → SPSE (Spotify Sweden vs. Spotify US).
3. If still conflicts after step 2, append a category code: MERC-ENV.
4. If still conflicts after step 3, append a sequential number: SPOT-SE-1, SPOT-SE-2.

**Pre-resolved conflicts (canonical — use these):**

- Spotify Sweden (parent company) → SPSE; Spotify US operations → SPOT
- Mercedes-Benz → MBENZ; Mercari → MERC

**Companies with multiple tiers (deduplication — research under PRIMARY ticker only):**
Palantir (PLTR, not PLTRS), Clearview AI (CLRV, not CLRVS), Shell (SHEL, not SHELE), BP (BP, not BPE), Tesla (TSLA, not TSLAA), Uber (UBER, not UBERT), Lyft (LYFT, not LYFTT), Airbnb (ABNB, not ABNBH), Netflix (NFLX, not NFLXS), Rumble (RUMB, not RUMBS), Discord (DISC, not DISCS), Twitter/X (TWTR, not TWTRS), Reddit (RDDT, not RDDTS), Pinterest (PINS, not PINSS), Snapchat (SNAP, not SNAPM), Slack (SLCK, not SLCKM), Zoom (ZOOM, not ZOOMM), Booking.com (BOOK, not BOOKT), Deliveroo (DELV, not DELVF).

Exception — research BOTH separately: Klarna EU (KLRN) and Klarna US (KLRNU) are treated as separate entities because they operate under different regulatory regimes. Spotify Sweden (SPSE) and Spotify US (SPOT) are researched separately for the same reason.

### 2.9 Error Handling

| Error Condition | Action |
|---|---|
| Source URL returns 404 | Search for archived version on Wayback Machine; if found, cite archive URL |
| Source URL returns 403 | Note as "Source access restricted" in the block; search for alternative approved source |
| Conflicting information between sources | Document both versions in the block; flag for human review; apply −10 confidence penalty |
| No violations found in a category | Move on — do not document absence as a violation |
| No violations found in ANY category | Document as "No confirmed violations found as of [date]. Quarterly review scheduled." |

### 2.10 Rate Limiting

This governs API call behavior during research execution:

- Maximum 20 API calls per minute
- 5-second delay between web searches
- Companies are batched in groups of 10 with a 60-second cooldown between batches

### 2.11 Geographic Scope and Time Scope

**Geographic priority order:**

1. US enforcement (FTC, SEC, DOJ, EPA, DOL, OSHA, CFPB, NLRB, EEOC, State AGs)
2. EU enforcement (GDPR DPAs, European Commission, CJEU)
3. UK enforcement (ICO, CMA)
4. Asia-Pacific (Japan PPC, Korea PIPC, Singapore PDPC, Australia OAIC)
5. Other jurisdictions (where approved primary sources exist)

**Time scope:**

- Primary focus: 2018–present (the GDPR era and modern enforcement period)
- Pre-2018 included if: UGLY-tier violation, or directly relevant to BROKEN_PROMISE detection
- BROKEN_PROMISE: the original promise can be any date; the violation that breaks it must be 2015 or later

## 3. Data Models

This repository contains no database schema files. All data models are defined through the JSON schema embedded in AI_RESEARCH_PROMPT.md and through the dual-tone output format specification. What follows is field-by-field documentation.

### 3.1 Violation Block (ViolationBlock)

The primary data entity in the entire system. Every documented violation produces exactly one ViolationBlock.

```
block_id              string    required    e.g. "OM-2023-PRI-META-001"
                                           Format: OM-[YEAR]-[CAT]-[TICKER]-[###]
                                           Year = year of violation, not research year
                                           Numbers sequential per company per year per category, zero-padded to 3 digits
company_ticker        string    required    Unique ticker from company list; must be deduplication-resolved
company_name          string    required    Full legal entity name, not brand name
date                  string    required    ISO 8601 date of enforcement action or violation: "YYYY-MM-DD"
jurisdiction          string    required    Country/region + specific authority
                                           e.g. "EU - Irish Data Protection Commission"
category              enum      required    One of: PRI | LAB | ANT | ETH | ENV
violation_tag         enum      required    One of: UGLY | BROKEN_PROMISE | BAD | QUESTIONABLE | GOOD
amount                number    optional    Exact fine/penalty amount as number (no rounding, no abbreviation)
                                           null if no monetary penalty
amount_currency       string    optional    ISO 4217 currency code: "USD", "EUR", "GBP", etc.
                                           null if amount is null
affected_individuals  number    optional    Exact count of affected people if known
                                           null if undisclosed or not applicable
formal_summary        string    required    2–4 sentences. Formal, neutral legal language.
                                           States: what happened, who enforced, what the outcome was.
                                           No adjectives beyond factual descriptors.
regulatory_basis      string    required    Specific law or regulation violated
                                           e.g. "GDPR Article 6(1) — Lawfulness of processing"
enforcement_details   string    required    Authority name, decision date, case/docket number if available,
                                           appeal status if applicable
conversational_what_happened    string  required  2–3 sentences in active voice, plain English.
                                                  Legal jargon explained in parentheses.
                                                  Accessible to non-legal audience.
conversational_why_it_matters   string  required  1–2 sentences on real-world impact on actual people.
                                                  Concrete, not abstract.
conversational_company_response string  required  Official response, defense, or appeal status.
                                                  If none found: "No public response found."
sources               array     required    1–3 source objects (see Source model below)
                                           At least one must be from the 29 approved sources
source_disclaimers    array     optional    Array of strings — any disclaimers from the source itself
                                           e.g. ["Irish DPC: Decision is subject to appeal."]
verification          object    required    See Verification model below
confidence_score      integer   required    0–100, calculated per §2.4
confidence_routing    enum      required    AUTO_APPROVED | QUICK_REVIEW | REJECTED
broken_promise_check  object    optional    See BrokenPromiseCheck model below
                                           Required when violation_tag is BROKEN_PROMISE
researched_at         string    required    ISO 8601 datetime of research: "YYYY-MM-DDThh:mm:ssZ"
researcher            string    required    Identifier of the research agent
                                           e.g. "OMEN_AI_AGENT_v3"
```

### 3.2 Source

Embedded in the sources array of ViolationBlock (1–3 items).

```
name                  string    required    Human-readable name of the source
                                           e.g. "Irish DPC Press Release"
url                   string    required    Exact URL — never a homepage, always the specific page
domain_confidence_boost integer required   The boost value applied from the domain table in §2.4
                                           Informs auditors how the source contributed to the score
accessed_date         string    required    ISO 8601 date the URL was accessed: "YYYY-MM-DD"
```

Constraints: enforcementtracker.com never appears in a sources array (discovery tool only). web.archive.org only appears in sources if used for BROKEN_PROMISE archive verification, never as a primary violation source.

### 3.3 Verification

Embedded in every ViolationBlock.

```
government_source_confirmed   boolean   required    True if at least one source is from an official
                                                    government or regulatory body
amount_verified               boolean|"N/A"  required  True if fine amount is confirmed in official docs;
                                                        "N/A" if no monetary penalty
date_cross_checked            boolean   required    True if the violation date is confirmed across
                                                    multiple sources
archive_links_captured        boolean   required    True if Wayback Machine archive URLs were captured
                                                    for any policy pages used in BROKEN_PROMISE detection
```

Hard kill trigger: government_source_confirmed: false → block is discarded entirely (see §2.5).

### 3.4 BrokenPromiseCheck

Optional object in ViolationBlock, required when violation_tag is BROKEN_PROMISE.

```
prior_violation_exists        boolean   required    True if this company has a prior OMEN block
                                                    in the same category + violation type
prior_commitment_exists       boolean   required    True if a verifiable prior commitment was found
promise_source                string    required    The original commitment: date, source, exact quote
                                                    e.g. "Meta blog post, 2018-04-04: 'We do not and
                                                    will not sell your personal data'"
promise_archive_url           string    optional    Wayback Machine URL of the archived commitment page
contradiction_documented      boolean   required    True when both the promise and the current violation
                                                    are explicitly compared in both block sections
```

### 3.5 Company Record

Defined in companies.txt. Each record represents one of 646 research targets.

Format in companies.txt: TICKER | Company Name | Tier | Category Tags

```
ticker                string    required    Unique identifier, deduplication-resolved per §2.8
company_name          string    required    Common name including parent/subsidiary context
                                           e.g. "Meta (Facebook, Instagram, WhatsApp)"
tier                  integer   required    1–20, indicating research priority and company type
                                           (see Tier table in §2.0 of the research protocol)
category_tags         array     present in companies.txt only — NOT in AI_RESEARCH_PROMPT.md
                                           This field is intentionally absent from the research agent
                                           context because pre-labeling creates research bias.
                                           See §7 for discussion of this intentional asymmetry.
```

**Tier definitions:**

| Tier | Label | Count |
|---|---|---|
| 1 | Mega Violators | 75 |
| 2 | AI & Emerging Tech | 60 |
| 3 | E-Commerce & Retail Tech | 50 |
| 4 | Fintech & Banking | 50 |
| 5 | Social Media & Messaging | 40 |
| 6 | Healthcare & Biotech | 30 |
| 7 | Education Tech | 25 |
| 8 | Dating & Adult Services | 20 |
| 9 | Transportation & Mobility | 30 |
| 10 | Travel & Hospitality | 30 |
| 11 | Entertainment & Streaming | 35 |
| 12 | Advertising & Marketing Tech | 30 |
| 13 | Analytics & Data Brokers | 25 |
| 14 | Telecom & ISPs | 25 |
| 15 | Insurance | 20 |
| 16 | Pharmaceuticals & Healthcare Corps | 25 |
| 17 | Food, Agriculture & Consumer Goods | 25 |
| 18 | Defense & Government Contractors | 15 |
| 19 | Energy & Mining | 20 |
| 20 | Real Estate Tech & Surveillance | 20 |

### 3.6 Rejection Record

Produced when a proposed violation is discarded.

```json
{
  "rejected_source": "[URL]",
  "source_type": "[blocked category]",
  "reason": "OMEN maintains court-grade credibility. [Source type] does not meet our 5-star evidentiary standard. Only government enforcement decisions, court filings, official regulatory databases, and verified breach records are accepted.",
  "suggestion": "Search for official enforcement action or court filing that substantiates this claim."
}
```

## 4. API Shapes

This repository contains no API server, endpoints, or function signatures — it is a specification repository. The following documents the logical input/output boundaries implied by the system's design, which a browser implementation must instantiate concretely.

### 4.1 Research Agent Invocation

**Caller provides:**

- A company record: ticker, name, tier
- The full AI_RESEARCH_PROMPT.md (as system context or injected prompt variable)
- Access to the 29 approved sources (via web search tools)

**Agent returns:**

- Zero or more ViolationBlock objects in JSON schema (see §3.1)
- Zero or more Rejection Record objects for any discarded violations
- A "no violations found" record if all categories return nothing

**Failure modes:**

- Source URL 404 → agent attempts Wayback Machine archive lookup; if not found, records source as unavailable
- Source URL 403 → records as access-restricted; continues with other sources
- Conflicting primary sources → documents both versions; flags for human review; applies −10 confidence penalty
- Only blocked sources available → hard discard; no block created

### 4.2 Confidence Scoring Function

**Input:**

```
sources: Source[]           — array of source objects with domain patterns
facts: {
  has_exact_amount: boolean
  has_specific_date: boolean
  has_case_number: boolean
  sources_agree: boolean
  sources_conflict: boolean
  only_one_source: boolean
  oldest_source_days_ago: number
}
```

**Output:**

```
confidence_score: integer   — 0–100
```

Failure mode: If any source is on the blocklist → return 0 (blocked domain −100 pushes to floor). If government_source_confirmed is false → return 0 regardless of calculated score.

### 4.3 Tag Assignment Function

Input: A violation record with all facts filled in.
Output: violation_tag: "UGLY" | "BROKEN_PROMISE" | "BAD" | "QUESTIONABLE" | "GOOD"

Failure mode: None — every violation must receive exactly one tag. If none of the special tag criteria are met, BAD is the guaranteed default.

### 4.4 Routing Function

Input: confidence_score: integer, government_source_confirmed: boolean
Output: routing: "AUTO_APPROVED" | "QUICK_REVIEW" | "REJECTED"

Logic:

```
if government_source_confirmed == false → REJECTED (hard kill)
if confidence_score >= 93 → AUTO_APPROVED
if confidence_score >= 60 → QUICK_REVIEW
if confidence_score < 60 → REJECTED
```

Note: QUICK_REVIEW blocks with score 60–79 also receive an automatic QUESTIONABLE tag assignment, unless UGLY or BROKEN_PROMISE criteria are definitively met.

### 4.5 IPFS Staging

AUTO_APPROVED blocks are staged for IPFS upload. The prompt references this but does not specify the IPFS implementation. A browser build must design this integration from scratch. The only known requirement: AUTO_APPROVED is the trigger condition.

### 4.6 Human Review Queue

QUICK_REVIEW blocks enter a human review queue with a 48-hour SLA. No implementation details are specified in this repository. A browser build must design the review interface.

### 4.7 Source Validation Function

Input: A URL string
Output: {valid: boolean, domain_confidence_boost: integer, reason?: string}

Logic:

- Check if the domain is on the blocked list → {valid: false, domain_confidence_boost: -100, reason: "blocked domain"}
- Check domain against the approved sources table → return the matching boost value
- If domain is enforcementtracker.com → {valid: true, domain_confidence_boost: 0} but with a flag that it must never appear in the sources array of a block (discovery tool only)
- If domain is web.archive.org → {valid: true, domain_confidence_boost: 8} but only for BROKEN_PROMISE archiving; invalid as a violation source

## 5. Design Tokens

There is no frontend code in this repository. However, the violation tag color system is explicitly defined in AI_RESEARCH_PROMPT.md and represents the canonical visual language of the system. These five colors are the only design tokens in this codebase.

```
--color-tag-ugly:              #8B0000   /* Deep Red */
--color-tag-broken-promise:    #D4AF37   /* Amber */
--color-tag-bad:               #CD853F   /* Muted Orange / Peru */
--color-tag-questionable:      #708090   /* Steel Grey / Slate Grey */
--color-tag-good:              #228B22   /* Forest Green */
```

No typography, spacing, border radius, shadow, or animation values are defined anywhere in this repository. These must be designed from scratch for the browser implementation.

## 6. Component Inventory

There are no UI components in this repository. No React, no HTML, no CSS, no templating engine. The repository is pre-frontend — it defines what the data looks like and how it is produced, but not how it is displayed.

For the browser build, components will need to be designed from scratch. The data model implies the following display surfaces, each of which will need a component:

**ViolationBlock display** — The dual-tone block format (formal + conversational) suggests two distinct view modes for the same record. The toggle between "legal/formal" and "plain English" is a first-class UX decision, not an afterthought.

**Tag badge** — Five tags with five explicit colors. This is the most visually prominent element in the system. The color definitions above are canonical.

**Source citation** — 1–3 sources per block, each with a name, URL, domain confidence boost, and accessed date.

**Confidence indicator** — A 0–100 score plus one of three routing labels. Whether this is exposed to end users or kept internal is an open design question.

**Verification checklist** — Four binary fields (government source confirmed, amount verified, date cross-checked, archive links captured).

**BROKEN_PROMISE expansion** — When broken_promise_check is populated, the UI must be able to show the original promise alongside the current violation as a comparison.

**Company profile** — Aggregates all ViolationBlocks for one company. Must support filtering by category, tag, jurisdiction, and year.

No components contain analysis logic because there are no components. For the browser build, the architectural recommendation is to keep all analysis logic (scoring, tagging, routing) server-side or in a dedicated service layer, keeping UI components purely presentational.

## 7. Key Architectural Decisions

### Decisions to preserve

**1. Primary-source-only as an architectural invariant, not a policy preference.**
The system is structurally incapable of publishing a block without a government source because the routing function discards records at the code level when government_source_confirmed is false. This is not enforced by editorial review — it is a hard computational check. A browser implementation must preserve this property. If users can submit violation claims through a UI, those claims must pass the same hard-kill check before entering any review queue.

**2. Dual-tone output is mandatory, not optional.**
Every block has both a formal section and a conversational section with identical facts. This is not a display preference — it is a data requirement. The underlying JSON stores both representations separately (formal_summary and conversational_what_happened are distinct fields). A browser implementation should store both at write time, not generate one from the other at render time.

**3. Category pre-labeling is intentionally absent from the research context.**
The research prompt does not include category labels for companies (even though companies.txt does). The explicit stated reason is that pre-labeling creates research bias. This decision has already been tested and validated in v3.0 — it is the current canonical approach. A browser implementation that displays "suggested categories" on company profile pages should be careful not to feed those suggestions back into the research pipeline.

**4. The Wayback Machine is scoped to one function only.**
web.archive.org is approved for exactly one purpose: documenting what a company previously promised (for BROKEN_PROMISE detection). It is explicitly disqualified as a primary source for violations. This scoping is precise and intentional. Any implementation that uses Wayback Machine for anything else risks inflating confidence scores on archival-only evidence.

**5. QUESTIONABLE is not a weak-evidence catch-all.**
There is explicit documentation in the prompt that QUESTIONABLE must not be used to publish records with insufficient primary sources. The distinction is: QUESTIONABLE = procedurally unresolved (investigation pending, appeal filed) ≠ evidentially weak. Weak-evidence records are REJECTED. A browser UI that shows QUESTIONABLE records should make the "under active investigation" status the primary explanatory frame, not a disclaimer.

**6. Exact fine amounts — no rounding.**
The prompt explicitly prohibits rounding fine amounts. Every amount in the system is the exact figure from the official document. A browser implementation must store amounts as numbers (not formatted strings) and apply formatting at display time. Storing "$1.2B" instead of 1200000000 would corrupt the original precision.

### Decisions to reconsider

**1. The company list is embedded in the research prompt.**
In v3.0, all 646 companies are listed inside AI_RESEARCH_PROMPT.md, making the prompt ~49KB. This creates a tight coupling between the company universe and the agent instructions. A browser build should extract the company list into a proper database/API and inject it dynamically, allowing the company universe to expand without modifying core agent instructions.

**2. companies.txt and AI_RESEARCH_PROMPT.md are out of sync.**
companies.txt has a stale header ("500 companies across 13 tiers"), unresolved ticker conflicts (SPOT duplicate, MERC instead of MBENZ, BARCU/BARC collision), and a category tags column that directly contradicts the research agent's design principle. This suggests companies.txt is a legacy artifact that was never fully reconciled with v3.0 of the prompt. A browser implementation should have exactly one canonical company registry.

**3. Version string is in the prompt file header.**
The prompt begins with a version and date comment. A browser implementation should track prompt versions in the data layer, not embedded in the prompt text.

**4. IPFS integration is undefined.**
The routing logic says AUTO_APPROVED blocks are "staged for IPFS upload," but no implementation exists for this. This is either a forward-looking design intention or a planned feature. A browser build needs to make a concrete decision: use IPFS as the canonical content-addressed store, use a traditional database, or use both.

**5. The 48-hour human review SLA has no implementation backing.**
The QUICK_REVIEW tier creates an implicit product requirement (human review within 48 hours) with no tooling, interface, notification system, or escalation path defined. A browser build must design this workflow.

## 8. What Transfers To The Browser

### High-value transfers

**The violation block schema (§3.1) transfers completely.**
The JSON schema for ViolationBlock is the core data contract of the entire system. Every field, every constraint, every semantic meaning. The dual-tone structure (formal + conversational), the confidence score, the verification checklist, the broken promise check object — these should be implemented exactly as specified. This is the most important thing to carry forward.

**The confidence scoring formula (§2.4) transfers completely.**
The domain-based boost table, the per-record adjustments, the clamping formula, and especially the hard-kill rule (government_source_confirmed: false → REJECTED regardless of score) should be implemented as a deterministic function. No subjective overrides. This is the mathematical backbone of OMEN's credibility.

**The tag system with its five colors (§2.3, §5) transfers completely.**
UGLY / BROKEN_PROMISE / BAD / QUESTIONABLE / GOOD with their specific color values are the primary visual vocabulary of the system. The assignment logic (deterministic criteria, not editorial judgment) should be implemented as a pure function. The tag colors are the only design tokens that exist in this codebase — they are canonical.

**The BROKEN_PROMISE detection protocol (§2.6) transfers completely.**
This is sophisticated and unique — the three-step check (prior violations, prior commitments via Wayback Machine, explicit contradiction documentation) is high intellectual value. The specific requirement that both the promise text and the current violation must appear together in the block (not just as metadata) means BROKEN_PROMISE is a presentation format as well as a data tag.

**The 21 MUST-NEVER rules (§2.4, §2.7) transfer as validation constraints.**
These are not guidelines — they are invariants. Every one can be implemented as a validation rule in the browser's block creation pipeline. Particularly: the specific list of sources that are plausible-seeming but explicitly disqualified (CourtListener, classaction.org, Have I Been Pwned, ILO, UN Global Compact, enforcementtracker.com in sources array) should be implemented as a blocklist in source validation.

**The 29 approved sources with their domain confidence boosts transfer completely.**
This is proprietary — the specific boost values (+12 for national DPAs, +15 for .gov/enforcement/ paths, etc.) represent calibrated trust weights. Implement as a lookup table with the exact values defined here.

**The violation category taxonomy (PRI/LAB/ANT/ETH/ENV) transfers completely.**
These five categories cover the full scope of corporate accountability research as defined by this system. Their definitions (what each covers) are clear enough for implementation.

**The geographic priority order and time scope (§2.11) transfers completely.**
The 5-jurisdiction research hierarchy and the 2018–present time emphasis should inform how the browser's search and display logic prioritizes data.

**The 646-company universe in 20 tiers transfers as a database.**
Rather than embedded text, implement as a structured company database with tier, name, ticker, and eventually violation count as a computed field. The tier structure is a priority framework — Tier 1 mega violators get deeper research and should display more prominently.

### What is web-app-specific and does not transfer directly

The natural language research prompt itself does not transfer to the browser as a UI artifact. It is the instruction set for an AI agent. The browser will consume the output of agents running this prompt — it does not run the prompt. The browser's job is to store, display, and search ViolationBlocks, not to produce them.

Rate limiting (§2.10) is a backend/agent concern. The 20 API calls/minute, 5-second delays, and 60-second batch cooldowns are constraints on the research agent's behavior, not the browser's. The browser does not perform live research — it reads from a pre-populated database.

The human review queue (48-hour SLA) is an internal operations concern for OMARO staff, not a user-facing browser feature. The browser should be able to show a QUICK_REVIEW block's status, but the review workflow itself is an internal tool.

The "researcher" field (OMEN_AI_AGENT_v3) is an internal provenance field. Whether this is exposed to browser users or kept as internal metadata is a product decision.

## 9. Open Questions

**Q1: What does the Omaro Browser actually do with this data?**
The research prompt and company list define what OMEN produces. Neither document explains how the Omaro Browser surfaces it. Is it a search engine for violations? A company profile page? A browser extension that annotates sites in real time? A newsfeed? The most natural interpretation from the data structure (company + violations + categories) is a company profile system, but this is not stated anywhere in the repo.

**Q2: What is the relationship between the 646-company list and user-facing features?**
The tier structure implies research priority, but it is unclear whether tiers are exposed to users, or whether any company outside the 646 can have a profile.

**Q3: The companies.txt category tags contradict the research agent's design principle.**
The research prompt explicitly says "The company list in this document does NOT include a categories column. This is intentional. Category pre-labeling creates research bias." Yet companies.txt has a full category tags column for every company. This file was updated in the most recent commit to expand from 500 to 646 entries. Is companies.txt a deprecated artifact, or is it used by a separate system (e.g., the browser's company database) where category pre-labeling does not cause the same bias problem? This should be resolved before building.

**Q4: The IPFS integration is undefined.**
AUTO_APPROVED blocks are "staged for IPFS upload" — but there is no implementation, no IPFS node configuration, no content addressing scheme defined. Is IPFS the primary content store, a redundant archive, or a future feature?

**Q5: The 48-hour human review SLA has no tooling.**
QUICK_REVIEW creates ~3,000+ blocks (roughly 30–40% of the projected 10,000 total) requiring human review. With 48-hour SLA and no tooling defined, this is a significant operational gap.

**Q6: How does the browser handle updates to blocks?**
Regulatory appeals, overturned decisions, settlements, and new enforcement actions can change a violation's status over time. The data model has no updated_at, no superseded_by, no status_change_history. Either this is planned but not specified, or blocks are treated as immutable point-in-time records with new blocks added rather than existing ones modified.

**Q7: companies.txt has unresolved ticker conflicts.**
SPOT appears twice (lines 19 and 64 — both for Spotify). MERC is used for Mercedes-Benz (should be MBENZ per the prompt). BARCU/BARC has a potential collision (Barclays EU at line 84 and Barclays US at line 270 both use BARC in companies.txt, though the prompt lists them as BARC and BARCU). LINE appears in both Tier 1 and Tier 5 with the same ticker. These must be resolved before building the company database.

**Q8: What happens to blocks for companies that are acquired or cease to exist?**
FTX collapsed. Credit Suisse was acquired. Postmates was shut down. BlockFi went bankrupt. Several companies in the list no longer exist as independent entities. The data model has no handling for corporate dissolution, merger, or acquisition — all of which affect ongoing liability and enforcement history.

**Q9: The research prompt is in a markdown file — is that the production storage format?**
The prompt ends with: "Store in: omen-private repo OR .env.local as AI_RESEARCH_PROMPT variable." The .env.local option suggests this is also intended to be an environment variable injected into an application runtime. Whether the file and the env var are kept in sync, and which one is authoritative, is unclear.

**Q10: What is the versioning strategy for the research prompt?**
The file is AI_RESEARCH_PROMPT.md v3.0, superseding v1 and v2. But there is no v1 or v2 in this repository. If the prompt is updated (new sources approved, scoring weights adjusted, new categories added), existing blocks produced under older prompt versions will have been scored and routed under different rules. There is no prompt_version field in the ViolationBlock schema to track which rule set produced a given block.

**Q11: How does the browser handle QUESTIONABLE blocks that resolve?**
QUESTIONABLE blocks are expected to represent 10–15% of total records. When an investigation concludes and a fine is issued, the block's tag and confidence score need to change. But the data model has no transition mechanism — nothing in the schema supports "this QUESTIONABLE block was resolved into this BAD block on this date."

**Q12: The OMEN_OFFICIAL_ROADMAP_v4.docx file is binary and unread.**
This is a 41KB Word document that may contain significant context for the browser build — timeline, feature scope, team assignments, or architectural decisions. It was not analyzed in this specification.

---

End of specification. Total source files analyzed: 3 readable files (AI_RESEARCH_PROMPT.md, companies.txt, README.md) + 1 unread binary (OMEN_OFFICIAL_ROADMAP_v4.docx). This specification is derived entirely from primary source inspection — no assumptions made about functionality not evidenced in the files.
