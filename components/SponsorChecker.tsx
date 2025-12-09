// SponsorChecker.tsx (UPDATED TO USE SECURE API PROXY)

import React, { useState, useEffect } from 'react';
// REMOVED: import { checkSponsorStatus, fetchSponsorNews } from '../services/geminiService';
import { SponsorCheckResult, SponsorNewsItem } from '../types';
import { Search, Building2, MapPin, Award, Briefcase, AlertTriangle, CheckCircle, XCircle, ArrowRight, ShieldAlert, Loader2, History, AlertOctagon, FileX, ExternalLink, PlusCircle, MinusCircle, Calendar, RefreshCcw } from 'lucide-react';

// --- NEW PROXY FUNCTIONS ---

// Function to fetch sponsor news from the backend API
const fetchSponsorNewsProxy = async (): Promise<SponsorNewsItem[]> => {
    try {
        const response = await fetch('/api/sponsor-news');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error("Failed to fetch sponsor news via API:", error);
        return []; // Return empty array on failure
    }
}

// Function to check sponsor status from the backend API
const checkSponsorStatusProxy = async (companyName: string): Promise<SponsorCheckResult> => {
    // Note: Using encodeURIComponent for safe URL construction
    const url = `/api/sponsor-status?companyName=${encodeURIComponent(companyName)}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            // Even if the status is 500, we try to parse JSON if the API returns a structured error
            const errorBody = await response.json().catch(() => ({ notes: `Server error (${response.status})` }));
            throw new Error(errorBody.notes || `Failed to fetch status: ${response.statusText}`);
        }
        return response.json();
    } catch (error: any) {
        console.error("Failed to check sponsor status via API:", error);
        
        // Return a graceful error object
        return {
            companyName: companyName,
            town: 'Unknown',
            rating: 'Unknown',
            routes: [],
            status: 'Unknown',
            natureOfBusiness: 'Unknown',
            dateGranted: 'Unknown',
            sponsorType: 'Unknown',
            notes: error.message || 'Unable to verify at this time. System might be busy.',
            history: []
        };
    }
}

// --- COMPONENT START ---

export const SponsorChecker: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SponsorCheckResult | null>(null);
  const [news, setNews] = useState<SponsorNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    const loadNews = async () => {
        // Using the new proxy function
        const updates = await fetchSponsorNewsProxy();
        setNews(updates);
        setNewsLoading(false);
    };
    loadNews();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    setResult(null);
    
    try {
        // Using the new proxy function
        const data = await checkSponsorStatusProxy(searchTerm);
        setResult(data);
    } catch (err) {
        // The proxy function handles the error state internally and returns a structured object, 
        // so no need for the large fallback result block here unless the fetch itself fails to complete.
        // We will keep the default error handling within the proxy for cleaner separation.
    } finally {
        setLoading(false);
    }
  };

  const getLinks = (name: string) => {
    const cleanName = name || '';
    return {
        company: [
            { label: 'Search company on Google.co.uk', url: `https://www.google.co.uk/search?q=${encodeURIComponent(cleanName)}` },
            { label: 'Search company on Facebook.com', url: `https://www.facebook.com/search/top?q=${encodeURIComponent(cleanName)}` },
            { label: 'Search company on LinkedIn.com', url: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(cleanName)}` },
            { label: 'Search company on Bing.com', url: `https://www.bing.com/search?q=${encodeURIComponent(cleanName)}` },
            { label: 'Search company on GOV.uk', url: `https://www.gov.uk/search/all?keywords=${encodeURIComponent(cleanName)}` },
        ],
        roles: [
            { label: 'Search open roles on Google.co.uk', url: `https://www.google.co.uk/search?q=${encodeURIComponent(cleanName + ' jobs')}` },
            { label: 'Search open roles on Bing.com', url: `https://www.bing.com/search?q=${encodeURIComponent(cleanName + ' jobs')}` },
            { label: 'Search open roles on Facebook.com', url: `https://www.facebook.com/search/top?q=${encodeURIComponent(cleanName + ' jobs')}` },
            { label: 'Search open roles on GOV.uk', url: `https://findajob.dwp.gov.uk/search?q=${encodeURIComponent(cleanName)}` },
            { label: 'Search open roles on LinkedIn.com', url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(cleanName)}` },
            { label: 'Search open roles on Reed.co.uk', url: `https://www.reed.co.uk/jobs/${encodeURIComponent(cleanName.replace(/\s+/g, '-'))}-jobs` },
            { label: 'Search open roles on Totaljobs.com', url: `https://www.totaljobs.com/jobs/${encodeURIComponent(cleanName.replace(/\s+/g, '-'))}` },
            { label: 'Search open roles on Uk.indeed.com', url: `https://uk.indeed.com/jobs?q=${encodeURIComponent(cleanName)}` },
        ]
    };
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-50 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
          Sponsor Checker & Updates
        </h2>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Verify if an employer holds a valid UK Sponsor License and track the latest Home Office compliance news.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Search & Result */}
        <div className="lg:col-span-2 space-y-8">
            {/* Search Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Search className="w-5 h-5 text-indigo-500" />
                    Check an Employer
                </h3>
                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Company Name</label>
                        <input 
                            type="text" 
                            className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium text-slate-800"
                            placeholder="e.g. Acme Solutions Ltd"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading || !searchTerm}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify License Status'}
                    </button>
                </form>
            </div>

            {/* Result Display */}
            {result && (
                <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-500">
                    
                    {/* Status Banner */}
                    <div className="p-8 pb-4 text-center">
                         <h3 className="text-2xl font-bold text-slate-900 mb-6">{result.companyName} ({result.town})</h3>
                         
                         {result.status === 'Licensed' ? (
                            <div className="flex items-center justify-center gap-2 p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-bold">
                                <CheckCircle className="w-5 h-5" />
                                <span>Active Sponsor License</span>
                            </div>
                         ) : result.status === 'Unknown' ? (
                            <div className="flex items-center justify-center gap-2 p-4 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 font-bold">
                                <AlertTriangle className="w-5 h-5" />
                                <span>{result.notes || 'Status Unknown'}</span>
                            </div>
                         ) : (
                            <div className="flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-bold">
                                <XCircle className="w-5 h-5" />
                                <span>
                                    {result.status === 'Not Found' ? 'Licence not found or removed' : 
                                     result.status === 'Surrendered' ? 'Licence has been surrendered' :
                                     `Licence has been ${result.status.toLowerCase()}`}
                                </span>
                            </div>
                         )}
                    </div>

                    <div className="p-8 pt-4">
                        {/* Status Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-slate-200 rounded-xl overflow-hidden mb-8">
                            <div className="p-4 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200">
                                <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Company</span>
                                <span className="font-semibold text-slate-900">{result.companyName}</span>
                            </div>
                            <div className="p-4 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200">
                                <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Location</span>
                                <span className="font-semibold text-slate-900">{result.town}</span>
                            </div>
                            <div className="p-4 bg-slate-50">
                                <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Licence Tiers</span>
                                {result.status === 'Licensed' ? (
                                    <span className="font-semibold text-emerald-600">{result.rating} ({result.routes.length} Routes)</span>
                                ) : (
                                    <span className="font-semibold text-slate-500 text-sm">
                                        {result.status === 'Unknown' ? 'Unknown' : 'Licence has expired or removed'}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* New License Metadata Row (Grant Date & Type) */}
                        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 mb-8 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-sm">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-indigo-500" />
                                <span className="text-slate-500 font-medium">License Granted:</span>
                                <span className="font-bold text-slate-900">{result.dateGranted || 'Date not available'}</span>
                            </div>
                            <div className="hidden sm:block text-slate-200">|</div>
                            <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-indigo-500" />
                                <span className="text-slate-500 font-medium">Sponsor Type:</span>
                                <span className="font-bold text-slate-900">{result.sponsorType || 'Worker'}</span>
                            </div>
                        </div>

                        {/* Nature of Business */}
                        <div className="mb-8">
                            <h4 className="text-sm font-bold text-slate-900 mb-3">Nature of business</h4>
                            <div className="p-4 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium">
                                • {result.natureOfBusiness || "Information unavailable"}
                            </div>
                        </div>

                        {/* Search Information Links */}
                        <div className="mb-8">
                            <h4 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                                Search information about "{result.companyName}" company
                            </h4>
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Company Details Links */}
                                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Search company details:</h5>
                                    <div className="space-y-3">
                                        {getLinks(result.companyName).company.map((link, i) => (
                                            <a key={i} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline hover:text-blue-800">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                {link.label}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                                {/* Open Roles Links */}
                                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Search open roles:</h5>
                                    <div className="space-y-3">
                                        {getLinks(result.companyName).roles.map((link, i) => (
                                            <a key={i} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline hover:text-blue-800">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                {link.label}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* History Table Style */}
                        {result.history && result.history.length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">History</h4>
                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                    <div className="grid grid-cols-12 bg-slate-50 p-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                        <div className="col-span-3">Date</div>
                                        <div className="col-span-6">Event</div>
                                        <div className="col-span-3">Status</div>
                                    </div>
                                    {result.history.map((event, idx) => {
                                        const isNegative = event.status.match(/Revoked|Suspended|Expired|Surrendered/i);
                                        const isPositive = event.status.match(/Granted|Reinstated/i);
                                        
                                        return (
                                            <div key={idx} className="grid grid-cols-12 p-4 border-b border-slate-100 last:border-0 items-center bg-white hover:bg-slate-50 transition-colors">
                                                <div className="col-span-3 flex items-center gap-3">
                                                    {isNegative ? (
                                                        <MinusCircle className="w-5 h-5 text-red-500 fill-red-50" />
                                                    ) : isPositive ? (
                                                        <PlusCircle className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full bg-slate-200"></div>
                                                    )}
                                                    <span className="text-sm font-semibold text-slate-700">{event.date}</span>
                                                </div>
                                                <div className="col-span-6 text-sm text-slate-600 pr-4">
                                                    {event.details}
                                                </div>
                                                <div className="col-span-3 text-sm text-slate-500">
                                                     {isNegative ? 'Licence has expired or removed' : 
                                                      isPositive ? 'Active Sponsor License' : event.status}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        {(!result.history || result.history.length === 0) && (
                            <div className="border-t border-slate-100 pt-6 text-center">
                                <p className="text-sm text-slate-400">No regulatory actions or historical changes found.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Right Column: Recently Added & Revoked Sponsors */}
        <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white h-full relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
             
             <div className="relative z-10">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <RefreshCcw className="w-5 h-5 text-indigo-400" />
                    Recently Added & Revoked
                </h3>
                
                <div className="space-y-6">
                    {newsLoading ? (
                        [1,2,3].map(i => (
                            <div key={i} className="animate-pulse space-y-2">
                                <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                                <div className="h-12 bg-slate-800 rounded w-full"></div>
                            </div>
                        ))
                    ) : news.length > 0 ? (
                        news.map((item, idx) => {
                             const isRevoked = item.changeType === 'revoked';
                             const isAdded = item.changeType === 'added';
                             
                             return (
                                <div key={idx} className="group border-b border-slate-700 pb-4 last:border-0 last:pb-0">
                                    <div className="flex items-center justify-between mb-1">
                                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                            {item.date}
                                        </span>
                                        {isAdded && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/20">
                                                <PlusCircle className="w-3 h-3" /> Added
                                            </span>
                                        )}
                                        {isRevoked && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold uppercase border border-red-500/20">
                                                <MinusCircle className="w-3 h-3" /> Revoked
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="font-semibold text-slate-100 group-hover:text-white transition-colors">
                                    {item.title}
                                </h4>
                                <p className="text-xs text-slate-400 mt-1">{item.summary}</p>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center p-4">
                            <ShieldAlert className="w-6 h-6 mx-auto text-slate-600 mb-2" />
                            <p className="text-sm text-slate-500">No recent compliance updates found.</p>
                        </div>
                    )}
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};
// Exporting for App.tsx (no change needed here)
// export default SponsorChecker;
