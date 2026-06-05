export enum Tab {
  NEWS = 'NEWS',
  PETITIONS = 'PETITIONS',
  SIMPLIFIER = 'SIMPLIFIER',
  SPONSORS = 'SPONSORS',
}

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
  status: string;
  date: string;
  category: string;
  summary: string;
  details: string;
  impact: string;
  nextSteps: string;
  timeline: string;
  searchKeywords: string;
  sourceUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface PetitionItem {
  id: string;
  title: string;
  summary: string;
  signatures: string | number;
  status: string;
  url?: string;
  isActive: boolean;
}

export interface SponsorHistoryEvent {
  date: string;
  status: string;
  details: string;
}

export interface SponsorCheckResult {
  companyName: string;
  town: string;
  rating: string;
  routes: string[];
  status: string;
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
  changeType: 'added' | 'revoked' | 'info' | string;
}
