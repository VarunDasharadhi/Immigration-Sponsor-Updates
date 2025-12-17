import { GoogleGenAI } from "@google/genai";
import { AIResponse, SponsorCheckResult, SponsorNewsItem } from "../types";

// Initialize the client
// The API key is injected via process.env.API_KEY
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper for exponential backoff retry
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 2000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Check for 429 (Resource Exhausted / Quota Exceeded)
    if (retries > 0 && (error?.status === 429 || error?.error?.code === 429 || error?.message?.includes('429'))) {
      console.warn(`Quota exceeded. Retrying in ${delay}ms... (Attempts left: ${retries})`);
      await wait(delay);
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Fetches the latest immigration news using Google Search Grounding.
 * Uses a strict formatting prompt to allow the frontend to parse into cards.
 */
export const fetchLatestUpdates = async (): Promise<AIResponse> => {
  try {
    const modelId = "gemini-3-flash-preview"; 
    const prompt = `
      Search for the most recent official changes, House of Commons debates, MP statements, and Home Office announcements regarding UK immigration from the last 30 - 60 days.
      
      STRICT SEARCH CONSTRAINT:
      You must restrict your knowledge and search results to OFFICIAL GOVERNMENT SOURCES.
      Primary search queries should use "site:gov.uk" or "site:parliament.uk".
      Do NOT include information that is only found on news sites (BBC, Guardian, etc.) unless you can verify it on a government site.

      SPECIFIC TOPICS:
      Check for: "Skilled Worker Indefinite Leave to Remain (ILR) extension", "5-year route changes", "Settlement updates", "Salary threshold changes".

      CRITICAL INSTRUCTION: You must act as a comprehensive data extractor.
      I need atleast 8-10 distinct updates to populate a dashboard.
      
      DIVERSITY RULE: You MUST try to find at least 1-2 updates for EACH of the following categories:
      1. Work (Skilled worker, salary thresholds, shortage lists, ILR/Settlement)
      2. Student (Graduate visa, university dependents)
      3. Family (Spouse visa, income requirements)
      4. Asylum (Rwanda, small boats, safe countries)

      For EACH update, you MUST use the following exact format blocks. 
      
      IMPORTANT FORMATTING RULES:
      1. Do NOT use markdown bolding (asterisks) for the keys (e.g. use "TITLE:", not "**TITLE**:").
      2. Keep the content for each field on the same line if possible (except DETAILS which can be a paragraph).
      3. Use the separators |START| and |END| for each item.
      4. Do not number the items.

      Format:
      |START|
      TITLE: [Short, punchy headline]
      STATUS: [Choose exactly one: Active, Passed, Proposed, Discussion]
      DATE: [Current stage date, e.g., "Debated 12th Oct" or "Effective 4th April"]
      CATEGORY: [Choose exactly one: Work, Student, Family, Asylum, General]
      SUMMARY: [2 clear sentences explaining the change. Include specific numbers (e.g., £38,700) if relevant.]
      DETAILS: [A deeper explanation (approx 80-100 words). Explain WHY this is happening, the context, controversy, or specific debate points. Be informative and neutral.]
      TIMELINE: [A chronological list of key dates. Format: "Date: Event; Date: Event".]
      IMPACT: [1 sentence explaining exactly who is affected]
      NEXT_STEPS: [Specific future date or event. E.g., "Parliament debate scheduled for [Date]"]
      SOURCE_URL: [Paste the EXACT direct deep link to the Gov.uk or Parliament.uk document. MUST contain '.gov.uk' or '.parliament.uk'. Do NOT use the generic homepage 'https://www.gov.uk'. If no specific deep link is found, leave this field EMPTY.]
      SEARCH_KEYWORDS: [Provide the exact search query to find this on Gov.uk if the link fails. E.g., "Statement of Changes HC 590 skilled worker salary"]
      |END|

      If there are no confirmed dates for Next Steps, state "Awaiting government timeline".
    `;

    const response = await retry(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // New Gemini 3 feature: helps model reason through legal dates
        thinkingConfig: { thinkingLevel: "medium" }
      },
    }));

    const text = response.text || "No updates found.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return {
      text,
      sources: chunks,
    };
  } catch (error) {
    console.error("Error fetching updates:", error);
    throw new Error("Failed to fetch latest updates. Please try again.");
  }
};

/**
 * Fetches trending petitions using Google Search Grounding.
 */
export const fetchPetitions = async (): Promise<AIResponse> => {
  try {
    const modelId = "gemini-3-flash-preview";
    const prompt = `
      Search for currently active and trending UK Parliament petitions (site:petition.parliament.uk) 
      specifically related to immigration, visas, international students, and foreign workers.
      
      Identify the top 4-6 most active petitions.
      
      For EACH petition, you MUST use the following EXACT format with delimiters.
      
      Format:
      |PETITION_START|
      TITLE: [Specific Petition Name]
      SUMMARY: [1 clear sentence explaining what it asks for]
      SIGNATURES: [The number of signatures, e.g. "45,200" or "102,000". If unknown, estimate based on 'trending' status or put "Trending"]
      STATUS: [e.g. "Open", "Waiting for Response", "Debated in Parliament", "Closed"]
      |PETITION_END|
      
      Do not include intro/outro text. Just the blocks.
    `;

    const response = await retry(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingLevel: "medium" }
      },
    }));

    const text = response.text || "No petitions found.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return {
      text,
      sources: chunks,
    };
  } catch (error) {
    console.error("Error fetching petitions:", error);
    throw new Error("Failed to fetch petitions.");
  }
};

/**
 * Simplifies complex legal text into plain English.
 */
export const simplifyLegalText = async (complexText: string): Promise<string> => {
  try {
    const modelId = "gemini-2.5-flash";
    const prompt = `
      You are an expert translator of "Legalese" to "Plain English".
      Rewrite the following text so that a non-native English speaker or someone without a law degree can easily understand it.
      Keep the meaning accurate but change the tone to be helpful and clear.
      
      Text to simplify:
      "${complexText}"
    `;

    const response = await retry(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
    }));

    return response.text || "Could not simplify text.";
  } catch (error) {
    console.error("Error simplifying text:", error);
    throw new Error("Failed to simplify text.");
  }
};

/**
 * Checks the status of a specific sponsor company using Gov.uk data.
 */
export const checkSponsorStatus = async (companyName: string): Promise<SponsorCheckResult> => {
  try {
    const modelId = "gemini-3-flash-preview";
    const prompt = `
      Perform a live Google Search for the "Register of licensed sponsors: workers" and "Register of licensed sponsors: students" on GOV.UK.
      Target company: "${companyName}".
      
      STATUS DETERMINATION LOGIC (Check in this order):
      1. **REVOKED/SUSPENDED**: Search specifically for news: "${companyName} sponsor license revoked" or "suspended". If official reports exist -> "Revoked" or "Suspended".
      2. **LICENSED**: Is the company listed in the *most recent* search snippets from the gov.uk register? -> "Licensed".
      3. **SURRENDERED**: If the company appears in *older* cached lists or news but is NOT in the current register -> "Surrendered" (or "Revoked" if context suggests enforcement).
      4. **NOT FOUND**: If no record exists -> "Not Found".

      EXTRA DETAILS:
      - **Nature of Business**: Try to find the industry sector or Companies House description (e.g., "Information technology consultancy activities") from the search snippets.
      - **History**: Extract specific dates if available (e.g. "Added to register Jan 2023", "License suspended May 2024").
      - **Date Granted**: Look for the date the company was first added to the register. If unknown, estimate from first appearance or state "Unknown".
      - **Sponsor Type**: Determine if they are a "Worker", "Temporary Worker", "Student" sponsor, or "Worker & Temporary Worker".
      - **Town**: Extract the town/city from the register entry if available.

      Return the result in JSON format ONLY. Do not use Markdown code blocks.
      Schema:
      {
        "companyName": "Official Name Found",
        "town": "Town/City",
        "rating": "Grade A" or "Grade B" or "Unknown",
        "routes": ["Route 1", "Route 2"],
        "status": "Licensed" or "Not Found" or "Suspended" or "Revoked" or "Expired" or "Surrendered",
        "natureOfBusiness": "Industry or Sector description (or 'Unknown')",
        "dateGranted": "YYYY-MM-DD or 'Unknown'",
        "sponsorType": "Worker, Temporary Worker, etc.",
        "notes": "Brief explanation",
        "history": [
           { "date": "YYYY-MM or approximate", "status": "Granted/Suspended/Revoked/Reinstated/Audit/Surrendered", "details": "Event description" }
        ]
      }
    `;

    const response = await retry(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        // responseMimeType: "application/json", // Removed because it conflicts with tools: googleSearch
        tools: [{ googleSearch: {} }],
      },
    }));

    // Manually parse the JSON response, handling potential markdown blocks
    let text = response.text || "{}";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Attempt to sanitize if the model adds extra text outside JSON
    const jsonStartIndex = text.indexOf('{');
    const jsonEndIndex = text.lastIndexOf('}');
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        text = text.substring(jsonStartIndex, jsonEndIndex + 1);
    }
    
    const json = JSON.parse(text);
    return {
        companyName: json.companyName || companyName, // Fallback to input name if empty
        town: json.town || "Unknown",
        rating: json.rating || "Unknown",
        routes: json.routes || [],
        status: json.status || "Unknown",
        natureOfBusiness: json.natureOfBusiness || "Unknown",
        dateGranted: json.dateGranted || "Unknown",
        sponsorType: json.sponsorType || "Worker",
        notes: json.notes || "",
        history: json.history || []
    };
  } catch (error: any) {
    console.error("Error checking sponsor:", error);
    
    let errorMessage = "Could not verify status at this time.";
    // Check for 429
    if (error?.status === 429 || error?.error?.code === 429 || error?.message?.includes('429')) {
        errorMessage = "System is busy (High Traffic). Please try again in 30 seconds.";
    }

    // Return a graceful error object rather than throwing
    return {
        companyName: companyName,
        town: "Unknown",
        rating: "Unknown",
        routes: [],
        status: "Unknown",
        natureOfBusiness: "Unknown",
        dateGranted: "Unknown",
        sponsorType: "Unknown",
        notes: errorMessage,
        history: []
    };
  }
};

/**
 * Fetches recently added and revoked sponsors.
 */
export const fetchSponsorNews = async (): Promise<SponsorNewsItem[]> => {
  try {
    const modelId = "gemini-2.5-flash";
    const prompt = `
      Search for "recently added to UK sponsor register" and "UK sponsor license revoked companies" for the last 30-60 days.
      
      I need a list of companies that have either been:
      1. ADDED to the register recently.
      2. REMOVED or REVOKED from the register recently.

      Try to find specific company names from news reports, legal bulletins, or register update logs.
      If exact names are scarce, find general updates (e.g. "150 companies removed").

      Format each item as:
      |NEWS_START|
      COMPANY: [Company Name]
      DATE: [Date of action]
      TYPE: [ADDED or REVOKED or INFO]
      DETAILS: [Brief detail, e.g. "License revoked due to compliance issues" or "Added to Skilled Worker route"]
      |NEWS_END|
      
      Return 5-6 items.
    `;

    const response = await retry(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    }));

    const items: SponsorNewsItem[] = [];
    const blocks = (response.text || "").split('|NEWS_START|').slice(1);
    
    blocks.forEach(block => {
        const clean = block.split('|NEWS_END|')[0];
        const titleMatch = clean.match(/COMPANY:\s*(.*)/);
        const dateMatch = clean.match(/DATE:\s*(.*)/);
        const typeMatch = clean.match(/TYPE:\s*(.*)/);
        const detailsMatch = clean.match(/DETAILS:\s*(.*)/);
        
        if (titleMatch) {
            let typeStr = (typeMatch ? typeMatch[1].trim().toUpperCase() : 'INFO');
            let changeType: 'added' | 'revoked' | 'info' = 'info';
            
            if (typeStr.includes('ADDED')) changeType = 'added';
            else if (typeStr.includes('REVOKED') || typeStr.includes('REMOVED')) changeType = 'revoked';

            items.push({
                title: titleMatch[1].trim(),
                date: dateMatch ? dateMatch[1].trim() : 'Recent',
                summary: detailsMatch ? detailsMatch[1].trim() : '',
                changeType: changeType
            });
        }
    });

    return items;
  } catch (error) {
    console.error("Error fetching sponsor news:", error);
    return [];
  }
};
