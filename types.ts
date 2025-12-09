
export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface AIResponse {
  text: string;
  sources: GroundingChunk[];
}

export interface NewsItem {
  id: string;
  title: string;
  status: 'Active' | 'Passed' | 'Proposed' | 'Discussion' | 'Unknown';
  date: string;
  category: 'Work' | 'Student' | 'Family' | 'Asylum' | 'General';
  summary: string;
  details: string;
  impact: string;
  nextSteps: string;
  timeline: string;
  searchKeywords: string;
  sourceUrl: string;
}

export interface PetitionItem {
  id: string;
  title: string;
  summary: string;
  signatures: string;
  status: string;
}

export interface SponsorHistoryEvent {
  date: string;
  status: 'Granted' | 'Suspended' | 'Revoked' | 'Reinstated' | 'Expired' | 'Surrendered' | 'Audit' | 'Other';
  details: string;
}

export interface SponsorCheckResult {
  companyName: string;
  town: string;
  rating: string; // e.g., "Grade A"
  routes: string[]; // e.g., ["Skilled Worker", "Global Business Mobility"]
  status: 'Licensed' | 'Not Found' | 'Suspended' | 'Revoked' | 'Expired' | 'Surrendered' | 'Unknown';
  natureOfBusiness?: string;
  dateGranted?: string;
  sponsorType?: string;
  notes: string;
  history: SponsorHistoryEvent[];
}

export interface SponsorNewsItem {
  title: string;
  date: string;
  summary: string;
  changeType: 'added' | 'revoked' | 'info';
  sourceUrl?: string;
}

export enum Tab {
  NEWS = 'NEWS',
  PETITIONS = 'PETITIONS',
  SIMPLIFIER = 'SIMPLIFIER',
  SPONSORS = 'SPONSORS'
}

export interface ChartDataPoint {
  name: string;
  value: number;
}