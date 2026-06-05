import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import { SponsorCheckResult, SponsorNewsItem } from '../types';
import { Search, Building2, AlertTriangle, CheckCircle, XCircle, ShieldAlert, Loader2, ExternalLink, RefreshCcw, AlertCircle, Clock, ChevronRight } from 'lucide-react';

export const SponsorChecker: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SponsorCheckResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [news, setNews] = useState<SponsorNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    const loadNews = async () => {
      try {
        const news = await apiClient.fetchSponsorNews();
        setNews(Array.isArray(news) ? news : []);
        setNewsLoading(false);
      } catch (err) {
        console.error('Error loading news:', err);
        setNews([]);
        setNewsLoading(false);
      }
    };
    loadNews();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setResult(null);
    setSearchError(null);

    try {
      const data = await apiClient.checkSponsor(searchTerm) as SponsorCheckResult;
      setResult(data);
    } catch (err) {
      console.error(err);
      setSearchError("Couldn't check that company. Please try again.");
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
              {searchError && (
                <div className="flex items-center gap-2 text-red-600 text-sm font-medium mt-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {searchError}
                </div>
              )}
            </form>
          </div>

          {/* Result Display */}
          {result && (
            <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-lg">
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
                    <span>License Status: {result.status}</span>
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
                    <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Rating</span>
                    <span className="font-semibold text-slate-900">{result.rating}</span>
                  </div>
                </div>

                {/* Details row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Sponsor Type</span>
                    <span className="font-semibold text-slate-900 text-sm">{result.sponsorType || 'Unknown'}</span>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Date Granted</span>
                    <span className="font-semibold text-slate-900 text-sm">{result.dateGranted || 'Unknown'}</span>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Routes</span>
                    <span className="font-semibold text-slate-900 text-sm">{result.routes?.length ? result.routes.join(', ') : 'Unknown'}</span>
                  </div>
                </div>

                {/* Nature of Business */}
                <div className="mb-8">
                  <h4 className="text-sm font-bold text-slate-900 mb-3">Nature of business</h4>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium">
                    {result.natureOfBusiness || 'Information unavailable'}
                  </div>
                </div>

                {/* Licence History */}
                {result.history && result.history.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      Licence History
                    </h4>
                    <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
                      {result.history.map((event, i) => {
                        const isGranted = /granted|licensed|added/i.test(event.status);
                        const isRevoked = /revoked|suspended|enforcement/i.test(event.status);
                        const dotColor = isGranted ? 'bg-emerald-500' : isRevoked ? 'bg-red-500' : 'bg-amber-400';
                        const textColor = isGranted ? 'text-emerald-700' : isRevoked ? 'text-red-600' : 'text-amber-700';
                        const bgColor = isGranted ? 'bg-emerald-50 border-emerald-100' : isRevoked ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100';
                        return (
                          <div key={i} className="relative">
                            <div className={`absolute -left-[21px] top-3 w-3 h-3 rounded-full border-2 border-white ${dotColor}`} />
                            <div className={`p-4 rounded-xl border ${bgColor}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <ChevronRight className={`w-3.5 h-3.5 ${textColor}`} />
                                <span className={`text-xs font-bold uppercase tracking-wider ${textColor}`}>{event.status}</span>
                                <span className="text-xs text-slate-400 ml-auto">{event.date}</span>
                              </div>
                              <p className="text-sm text-slate-700">{event.details}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes (for non-licensed / revoked companies) */}
                {result.notes && result.status !== 'Licensed' && (
                  <div className="mb-8 p-4 rounded-xl border border-amber-100 bg-amber-50 text-sm text-amber-800">
                    <span className="font-bold block mb-1">Additional information</span>
                    {result.notes}
                  </div>
                )}

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

            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent hover:scrollbar-thumb-slate-500 transition-colors">
              {newsLoading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                    <div className="h-12 bg-slate-800 rounded w-full"></div>
                  </div>
                ))
              ) : news.length > 0 ? (
                news.map((item, idx) => (
                  <div key={idx} className="group border-b border-slate-700 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {item.date || 'Recent'}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-100 group-hover:text-white transition-colors">
                      {item.title || item.summary}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">{item.summary || ''}</p>
                  </div>
                ))
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
