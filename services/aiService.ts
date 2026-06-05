/**
 * aiService.ts
 * Server-side AI service using OpenRouter (never imported by browser code).
 * Responses are disk-cached and refreshed once per day at local midnight.
 */

import { AIResponse, SponsorCheckResult, SponsorNewsItem } from '../types';
import * as cache from './cache';
import { stripMarkdown } from '../utils/text';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CALL_TIMEOUT_MS = 45_000;

// Lazy getters: resolved at call time, after loadEnvFile() has run
const getApiKey = () => process.env.OPENROUTER_API_KEY || '';
const getBaseModel = () => process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
const getOnlineModel = () => `${getBaseModel()}:online`;

// ─── helpers ────────────────────────────────────────────────────────────────

function parseDelimitedBlocks(text: string, startDelim: string, endDelim: string): string[] {
  return (text || '').split(startDelim).slice(1).map(block => block.split(endDelim)[0]);
}

function extractKeyValues(blockText: string): Record<string, string> {
  const result: Record<string, string> = {};
  blockText.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+):\s*(.*)/);
    if (match) result[match[1].toLowerCase()] = match[2].trim();
  });
  return result;
}

function parseJsonFromText(text: string): any {
  let cleaned = text.trim().replace(/```json/g, '').replace(/```/g, '').trim();
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) cleaned = jsonMatch[0];
  return JSON.parse(cleaned);
}

// ─── OpenRouter call ─────────────────────────────────────────────────────────

interface OrMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

async function callOpenRouter(
  messages: OrMessage[],
  model?: string,
  maxTokens: number = 8192
): Promise<{ text: string; annotations: any[] }> {
  const apiKey = getApiKey();
  const resolvedModel = model ?? getOnlineModel();
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set. Add it to .env.local.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

  try {
    const resp = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:10000',
        'X-Title': 'UK Immigration Compass',
      },
      body: JSON.stringify({ model: resolvedModel, messages, max_tokens: maxTokens }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`OpenRouter ${resp.status}: ${errText}`);
    }

    const json = await resp.json() as any;
    const choice = json.choices?.[0];
    const text: string = choice?.message?.content ?? '';
    const annotations: any[] = choice?.message?.annotations ?? [];
    return { text, annotations };
  } finally {
    clearTimeout(timer);
  }
}

function annotationsToSources(annotations: any[]): { web?: { uri?: string; title?: string } }[] {
  return annotations
    .filter(a => a?.type === 'url_citation' && a?.url_citation?.url)
    .map(a => ({ web: { uri: a.url_citation.url, title: a.url_citation.title ?? '' } }));
}

// ─── mock data (fallback when no API key and no disk cache) ──────────────────

const MOCK: {
  updates: AIResponse;
  petitions: AIResponse;
  sponsorNews: SponsorNewsItem[];
  sponsor: SponsorCheckResult;
} = {
  updates: {
    text: `|START|
TITLE: Skilled Worker Salary Threshold Increase
STATUS: Proposed
DATE: April 2024
CATEGORY: Work
SUMMARY: The Skilled Worker route salary threshold is being reviewed for potential adjustments.
DETAILS: The government has announced plans to review the minimum salary requirements for Skilled Worker visas to reflect current market conditions.
IMPACT: May affect thousands of workers and employers sponsoring international talent.
NEXT_STEPS: Check gov.uk for official announcement on implementation timeline.
TIMELINE: Review to conclude by Q2 2024
SEARCH_KEYWORDS: Skilled Worker, salary threshold, sponsorship
SOURCE_URL: https://www.gov.uk/browse/visas-immigration
|END|
|START|
TITLE: Graduate Route Extension Confirmed
STATUS: Passed
DATE: March 2024
CATEGORY: Student
SUMMARY: UK government extends the post-study work route for graduates.
DETAILS: The Graduate Route allows international students to work in the UK for 2 years after completing their studies.
IMPACT: Benefits thousands of international graduates seeking work experience in the UK.
NEXT_STEPS: International students can apply for the Graduate Route on gov.uk.
TIMELINE: Currently accepting applications
SEARCH_KEYWORDS: Graduate Route, post-study work, international students
SOURCE_URL: https://www.gov.uk/browse/visas-immigration
|END|
|START|
TITLE: Family Visa Minimum Income Threshold Raised to £29,000
STATUS: Passed
DATE: April 2024
CATEGORY: Family
SUMMARY: The minimum income requirement for British citizens sponsoring a partner on a family visa has increased from £18,600 to £29,000.
DETAILS: This change affects all new family visa applications. The government plans to further increase this to £34,500 and eventually £38,700 by early 2025.
IMPACT: British citizens and settled persons bringing partners to the UK face significantly higher financial barriers.
NEXT_STEPS: Affected families should seek immigration advice.
TIMELINE: Effective 11 April 2024; further increases planned for late 2024 and early 2025
SEARCH_KEYWORDS: family visa, minimum income, partner visa, spouse visa
SOURCE_URL: https://www.gov.uk/government/collections/family-migration-guidance
|END|
|START|
TITLE: Care Workers Barred from Bringing Dependents
STATUS: Passed
DATE: March 2024
CATEGORY: Work
SUMMARY: Overseas care workers can no longer bring dependants under the Health and Care Worker visa.
DETAILS: This change aims to reduce net migration. Care workers must now apply under the Skilled Worker route if they wish to bring family members.
IMPACT: Thousands of care workers must choose between working in the UK alone or not at all.
NEXT_STEPS: Employers must update recruitment policies and advise prospective hires accordingly.
TIMELINE: Effective 11 March 2024
SEARCH_KEYWORDS: Health and Care visa, care workers, dependents, social care
SOURCE_URL: https://www.gov.uk/government/collections/health-and-care-worker-visa-guidance
|END|`,
    sources: [],
  },
  petitions: {
    text: `|PETITION_START|
TITLE: Extend Graduate Visa to 3 Years
SUMMARY: Petition to increase the Graduate Route work visa duration to 3 years.
SIGNATURES: 45230
STATUS: Open
|PETITION_END|
|PETITION_START|
TITLE: Review Spouse Visa Income Requirements
SUMMARY: Campaign to lower the £29,000 annual income requirement for spouse visas.
SIGNATURES: 32150
STATUS: Open
|PETITION_END|
|PETITION_START|
TITLE: Allow International Students to Bring Dependents
SUMMARY: Urge the government to reverse the ban on international students bringing family dependents.
SIGNATURES: 78400
STATUS: Open
|PETITION_END|
|PETITION_START|
TITLE: Reduce NHS Immigration Health Surcharge Fees
SUMMARY: Call for a reduction in the annual NHS Immigration Health Surcharge for visa applicants.
SIGNATURES: 28900
STATUS: Open
|PETITION_END|`,
    sources: [],
  },
  sponsorNews: [
    { title: 'CloudTech Solutions', date: '2024-04-20', summary: 'Recently added to Skilled Worker sponsor register', changeType: 'added' },
    { title: 'Global Staff Services', date: '2024-04-15', summary: 'License revoked due to compliance violations', changeType: 'revoked' },
  ],
  sponsor: {
    companyName: 'Example Tech Solutions Ltd',
    town: 'London',
    rating: 'Grade A',
    routes: ['Skilled Worker', 'Temporary Worker'],
    status: 'Licensed',
    natureOfBusiness: 'Information technology consultancy',
    dateGranted: '2022-01-15',
    sponsorType: 'Worker & Temporary Worker',
    notes: 'Mock data — set OPENROUTER_API_KEY for live results',
    history: [],
  },
};

// ─── prompts ─────────────────────────────────────────────────────────────────

const PROMPTS = {
  latestUpdates: `Search for the most recent official changes, House of Commons debates, MP statements, and Home Office announcements regarding UK immigration from the last 30-60 days.

STRICT SEARCH CONSTRAINT: Restrict results to OFFICIAL GOVERNMENT SOURCES (site:gov.uk or site:parliament.uk). Do not include information only found on news sites unless verified on a government site.

SPECIFIC TOPICS: Check for: "Skilled Worker Indefinite Leave to Remain (ILR) extension", "5-year route changes", "Settlement updates", "Salary threshold changes".

Find at least 8-10 distinct updates. Include at least 1-2 per category: Work, Student, Family, Asylum.

For EACH update use this EXACT format:

|START|
TITLE: [Short punchy headline]
STATUS: [Active | Passed | Proposed | Discussion]
DATE: [Stage date, e.g. "Effective 4th April"]
CATEGORY: [Work | Student | Family | Asylum | General]
SUMMARY: [2 clear sentences explaining the change with specific numbers if relevant]
DETAILS: [80-100 words explaining WHY, context, controversy]
TIMELINE: [Chronological key dates: "Date: Event; Date: Event"]
IMPACT: [1 sentence on who is affected]
NEXT_STEPS: [Specific future date or event, or "Awaiting government timeline"]
SOURCE_URL: [Direct deep link to gov.uk or parliament.uk document. Leave EMPTY if no specific link found]
SEARCH_KEYWORDS: [Exact search query to find this on Gov.uk]
|END|`,

  petitions: `Search for currently active and trending UK Parliament petitions (site:petition.parliament.uk) related to immigration, visas, international students, and foreign workers.

Identify the top 4-6 most active petitions.

For EACH use this EXACT format:

|PETITION_START|
TITLE: [Specific Petition Name]
SUMMARY: [1 clear sentence explaining what it asks for]
SIGNATURES: [Number of signatures, e.g. "45,200". If unknown put "Trending"]
STATUS: [Open | Waiting for Response | Debated in Parliament | Closed]
|PETITION_END|

Return only the blocks. No intro or outro text.`,

  simplify: (text: string) => `You are an expert translator of legal jargon to plain English.
Rewrite the following text so that a non-native English speaker or someone without a law degree can easily understand it.
Keep the meaning accurate but change the tone to be helpful and clear.

Text to simplify:
"${text}"

Return only the simplified text, no preamble.`,

  sponsorStatus: (name: string) => `Check if "${name}" holds a UK Sponsor Licence for hiring overseas workers.

Run ALL of these searches:
1. "${name}" site:tarve.co.uk  — tarve.co.uk mirrors the official GOV.UK register in searchable form
2. "${name} UK sponsor licence licensed workers"
3. "${name} LLP sponsor licence", "${name} Ltd sponsor licence", "${name} plc sponsor licence"  — try legal-entity variants
4. "${name} sponsor licence revoked suspended" — check for bad news

The official GOV.UK register is a downloadable CSV (not directly searchable), so tarve.co.uk and similar third-party mirrors are the most reliable way to confirm status.

STATUS LOGIC — apply in this order:
1. REVOKED/SUSPENDED: Clear evidence of enforcement action -> "Revoked" or "Suspended"
2. LICENSED: Found in tarve.co.uk results, a sponsor-register mirror, or the company's own site confirms it -> "Licensed"
3. Well-known major employer (Big 4 accountancy, NHS trust, university, FTSE 100) with no revocation news -> assume "Licensed", note it's unconfirmed
4. SURRENDERED: Was listed historically but no longer appears -> "Surrendered"
5. NOT FOUND: Genuinely no evidence for a small or obscure company -> "Not Found"

Extract: official company name as it appears in the register, town/city, industry, date added, sponsor routes (Skilled Worker / Intra-company Transfer / Temporary Worker / Student).

Return ONLY valid JSON — no markdown, no code fences:
{
  "companyName": "Official Name as in Register",
  "town": "Town/City or Unknown",
  "rating": "Grade A or Grade B or Unknown",
  "routes": ["Skilled Worker"],
  "status": "Licensed or Not Found or Suspended or Revoked or Expired or Surrendered or Unknown",
  "natureOfBusiness": "Industry description or Unknown",
  "dateGranted": "YYYY-MM-DD or Unknown",
  "sponsorType": "Worker, Temporary Worker, Student, etc.",
  "notes": "Brief explanation of sources found",
  "history": [{"date": "YYYY-MM", "status": "Granted/Suspended/Revoked", "details": "Event description"}]
}`,

  sponsorNews: `Search for "recently added to UK sponsor register" and "UK sponsor license revoked companies" from the last 30-60 days.

Find companies that have been ADDED or REMOVED/REVOKED from the register.

Format each item as:
|NEWS_START|
COMPANY: [Company Name]
DATE: [Date of action]
TYPE: [ADDED or REVOKED or INFO]
DETAILS: [Brief detail]
|NEWS_END|

Return 5-6 items. No intro text.`,
};

// ─── refresh functions (always fetch live) ───────────────────────────────────

async function refreshUpdates(): Promise<AIResponse> {
  const { text, annotations } = await callOpenRouter(
    [{ role: 'user', content: PROMPTS.latestUpdates }],
    getOnlineModel(),
    12000
  );
  const result: AIResponse = { text: text || 'No updates found.', sources: annotationsToSources(annotations) };
  cache.set('updates', result);
  console.log('[Cache] Refreshed: updates');
  return result;
}

async function refreshPetitions(): Promise<AIResponse> {
  const { text, annotations } = await callOpenRouter(
    [{ role: 'user', content: PROMPTS.petitions }],
    getOnlineModel(),
    4096
  );
  const result: AIResponse = { text: text || 'No petitions found.', sources: annotationsToSources(annotations) };
  cache.set('petitions', result);
  console.log('[Cache] Refreshed: petitions');
  return result;
}

async function refreshSponsorNews(): Promise<SponsorNewsItem[]> {
  const { text } = await callOpenRouter(
    [{ role: 'user', content: PROMPTS.sponsorNews }],
    getOnlineModel(),
    2048
  );
  const items: SponsorNewsItem[] = [];
  const blocks = parseDelimitedBlocks(text || '', '|NEWS_START|', '|NEWS_END|');
  blocks.forEach(block => {
    const kv = extractKeyValues(block);
    if (!kv.company) return;
    let changeType: 'added' | 'revoked' | 'info' = 'info';
    const t = (kv.type || '').toUpperCase();
    if (t.includes('ADDED')) changeType = 'added';
    else if (t.includes('REVOKED') || t.includes('REMOVED')) changeType = 'revoked';
    items.push({
      title: stripMarkdown(kv.company),
      date: kv.date || 'Recent',
      summary: stripMarkdown(kv.details || ''),
      changeType,
    });
  });
  cache.set('sponsor-news', items);
  console.log('[Cache] Refreshed: sponsor-news');
  return items;
}

// ─── public getters (serve from cache; refresh once if cold) ─────────────────

export async function getUpdates(): Promise<AIResponse> {
  const cached = cache.get('updates');
  if (cached) return cached;
  if (!getApiKey()) return MOCK.updates;
  try {
    return await refreshUpdates();
  } catch (err) {
    console.error('[aiService] refreshUpdates failed:', err);
    return MOCK.updates;
  }
}

export async function getPetitions(): Promise<AIResponse> {
  const cached = cache.get('petitions');
  if (cached) return cached;
  if (!getApiKey()) return MOCK.petitions;
  try {
    return await refreshPetitions();
  } catch (err) {
    console.error('[aiService] refreshPetitions failed:', err);
    return MOCK.petitions;
  }
}

export async function getSponsorNews(): Promise<SponsorNewsItem[]> {
  const cached = cache.get('sponsor-news');
  if (cached) return cached;
  if (!getApiKey()) return MOCK.sponsorNews;
  try {
    return await refreshSponsorNews();
  } catch (err) {
    console.error('[aiService] refreshSponsorNews failed:', err);
    return MOCK.sponsorNews;
  }
}

export async function simplify(complexText: string): Promise<{ simplified: string }> {
  if (!getApiKey()) return { simplified: `Simplified: ${complexText.substring(0, 200)}...` };
  const { text } = await callOpenRouter(
    [{ role: 'user', content: PROMPTS.simplify(complexText) }],
    getBaseModel(),
    4096
  );
  return { simplified: text || 'Could not simplify text.' };
}

export async function checkSponsor(companyName: string): Promise<SponsorCheckResult> {
  const cacheKey = `sponsor:${companyName.toLowerCase().trim()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  if (!getApiKey()) return { ...MOCK.sponsor, companyName, notes: 'Mock data — set OPENROUTER_API_KEY for live results' };

  const { text } = await callOpenRouter(
    [{ role: 'user', content: PROMPTS.sponsorStatus(companyName) }],
    getOnlineModel(),
    2048
  );
  try {
    const json = parseJsonFromText(text || '{}');
    const result: SponsorCheckResult = {
      companyName: stripMarkdown(json.companyName || companyName),
      town: stripMarkdown(json.town || 'Unknown'),
      rating: json.rating || 'Unknown',
      routes: json.routes || [],
      status: json.status || 'Unknown',
      natureOfBusiness: stripMarkdown(json.natureOfBusiness || 'Unknown'),
      dateGranted: json.dateGranted || 'Unknown',
      sponsorType: json.sponsorType || 'Worker',
      notes: stripMarkdown(json.notes || ''),
      history: json.history || [],
    };
    cache.set(cacheKey, result);
    return result;
  } catch {
    return {
      companyName,
      town: 'Unknown',
      rating: 'Unknown',
      routes: [],
      status: 'Unknown',
      natureOfBusiness: 'Unknown',
      dateGranted: 'Unknown',
      sponsorType: 'Unknown',
      notes: 'Could not parse sponsor status from AI response.',
      history: [],
    };
  }
}

// ─── startup + daily scheduling ──────────────────────────────────────────────

function msUntilNextMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

async function runDailyRefresh(): Promise<void> {
  console.log('[Cache] Running daily midnight refresh...');
  await Promise.allSettled([
    refreshUpdates(),
    refreshPetitions(),
    refreshSponsorNews(),
  ]);
  console.log('[Cache] Daily refresh complete');
}

export function initCache(): void {
  cache.load();

  if (!getApiKey()) {
    console.log('[Cache] No API key — skipping warm-up; mock data will be used');
    return;
  }

  // Warm up any feeds not yet cached (non-blocking)
  for (const [key, refreshFn] of [
    ['updates', refreshUpdates],
    ['petitions', refreshPetitions],
    ['sponsor-news', refreshSponsorNews],
  ] as [string, () => Promise<any>][]) {
    if (!cache.has(key)) {
      console.log(`[Cache] Cold start — fetching ${key} in background`);
      refreshFn().catch(err => console.error(`[Cache] Warm-up failed for ${key}:`, err));
    } else {
      console.log(`[Cache] ${key} already cached — serving from disk`);
    }
  }

  // Schedule first run at local midnight, then every 24h
  const msToMidnight = msUntilNextMidnight();
  console.log(`[Cache] Next midnight refresh in ${Math.round(msToMidnight / 60000)} minutes`);
  setTimeout(() => {
    runDailyRefresh();
    setInterval(runDailyRefresh, 24 * 60 * 60 * 1000);
  }, msToMidnight);
}
