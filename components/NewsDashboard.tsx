import React, { useEffect, useState, useMemo } from 'react';
import { fetchLatestUpdates } from '../services/geminiService';
import { AIResponse, NewsItem } from '../types';
import { 
  RefreshCw, ExternalLink, Filter, 
  Briefcase, GraduationCap, Heart, Globe, AlertCircle, CheckCircle2, Clock, Megaphone, CalendarDays, Zap, ArrowRight, Activity, X, GitCommitVertical, FileText, Link as LinkIcon
} from 'lucide-react';

export const NewsDashboard: React.FC = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<AIResponse['sources']>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);

  const normalizeCategory = (cat: string): NewsItem['category'] => {
    if (!cat) return 'General';
    const c = cat.toLowerCase();
    if (c.includes('work') || c.includes('skilled') || c.includes('salary') || c.includes('occupation')) return 'Work';
    if (c.includes('student') || c.includes('graduate') || c.includes('university') || c.includes('study')) return 'Student';
    if (c.includes('family') || c.includes('spouse') || c.includes('partner') || c.includes('dependent')) return 'Family';
    if (c.includes('asylum') || c.includes('rwanda') || c.includes('boat') || c.includes('refugee')) return 'Asylum';
    return 'General';
  };

  const cleanUrl = (url: string): string => {
    if (!url) return '';
    
    // 1. Try to extract from Markdown [Link](url)
    const mdMatch = url.match(/\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
    if (mdMatch && mdMatch[1]) {
        return mdMatch[1];
    }

    // 2. Find url-like string. 
    // Matches: http://..., https://..., www...., or domains ending in gov.uk/parliament.uk
    // Explicitly allow subdomains like assets.publishing.service.gov.uk
    const match = url.match(/(https?:\/\/[^\s\)]+|www\.[^\s\)]+|[a-zA-Z0-9-]+\.(?:[a-zA-Z0-9-]+\.)?(gov\.uk|parliament\.uk|legislation\.gov\.uk)[^\s\)]*)/i);
    if (!match) return '';
    
    let link = match[0];
    
    // 3. Cleanup trailing punctuation that often gets caught (e.g., period at end of sentence)
    link = link.replace(/[.,;:\>\]\}\)\"']+$/, '');

    // 4. Ensure protocol
    if (!link.startsWith('http')) {
        link = 'https://' + link;
    }
    
    return link;
  };

  const isOfficialUrl = (url: string) => {
    if (!url) return false;
    try {
      const urlToCheck = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(urlToCheck);
      const hostname = urlObj.hostname.toLowerCase();
      
      const officialDomains = [
          '.gov.uk', 
          'gov.uk', 
          '.parliament.uk', 
          'parliament.uk', 
          'legislation.gov.uk',
          'nationalarchives.gov.uk'
      ];

      const isOfficial = officialDomains.some(d => hostname.endsWith(d) || hostname === d);

      // Filter out generic homepages to ensure we have a deep link
      const isGenericHomepage = urlObj.pathname === '/' || urlObj.pathname === '';

      return isOfficial && !isGenericHomepage;
    } catch {
      return false;
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLatestUpdates();
      setSources(result.sources || []);
      
      const parsedItems: NewsItem[] = [];
      const blocks = result.text.split('|START|').slice(1);
      
      blocks.forEach((block, index) => {
        const cleanBlock = block.split('|END|')[0];
        const lines = cleanBlock.split('\n').map(l => l.trim()).filter(Boolean);
        const item: any = {};
        let currentKey = '';

        lines.forEach(line => {
            const keyMatch = line.match(/^[\*]*\s*(TITLE|STATUS|DATE|CATEGORY|SUMMARY|DETAILS|TIMELINE|IMPACT|NEXT_STEPS|SEARCH_KEYWORDS|SOURCE_URL)[\*]*\s*:\s*(.*)/i);
            if (keyMatch) {
                const key = keyMatch[1].toUpperCase();
                const value = keyMatch[2];
                item[key] = value;
                currentKey = key;
            } else if (currentKey) {
                item[currentKey] += ' ' + line;
            }
        });

        if (item['TITLE']) {
          parsedItems.push({
            id: `news-${index}`,
            title: item['TITLE'].replace(/\*\*/g, ''),
            status: item['STATUS'] as any || 'Discussion',
            date: item['DATE'] || 'Recent',
            category: normalizeCategory(item['CATEGORY'] || 'General'),
            summary: item['SUMMARY'] || 'No details provided.',
            details: item['DETAILS'] || item['SUMMARY'] || 'No detailed analysis available.',
            impact: item['IMPACT'] || 'See details.',
            nextSteps: item['NEXT_STEPS'] || 'Check official sources.',
            timeline: item['TIMELINE'] || '',
            searchKeywords: item['SEARCH_KEYWORDS'] || item['TITLE'],
            sourceUrl: cleanUrl(item['SOURCE_URL']),
          });
        }
      });
      
      setNewsItems(parsedItems);

      if (parsedItems.length === 0 && result.text.length > 0) {
        setNewsItems([{
            id: 'fallback',
            title: 'General Update Summary',
            status: 'Discussion',
            date: 'Today',
            category: 'General',
            summary: result.text.slice(0, 300) + '... (Could not parse structured data)',
            details: result.text,
            impact: 'Various groups affected.',
            nextSteps: 'Check official sources for timeline.',
            timeline: 'Today: Update released',
            searchKeywords: 'UK Immigration update',
            sourceUrl: 'https://www.gov.uk/browse/visas-immigration'
        }]);
      }

    } catch (err) {
      setError("Unable to retrieve the latest news. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') return newsItems;
    return newsItems.filter(item => item.category === selectedCategory);
  }, [newsItems, selectedCategory]);

  const officialSources = useMemo(() => {
      return sources.filter(s => s.web?.uri && isOfficialUrl(s.web.uri));
  }, [sources]);

  // REDIRECT BUTTON STRATEGY
  // 1. Direct Deep Link: If AI provided a specific valid URL, use it.
  // 2. Smart Match: Check if any Grounding Source title matches our News Item title.
  // 3. Category Redirect: Fallback to the specific Gov.uk section page (Work, Student, etc).
  // This ensures we NEVER show a 'Search' button, but always a direct 'Redirect' to relevant official content.
  const getPrimaryLink = (item: NewsItem) => {
    // 1. Direct Link from Text
    if (item.sourceUrl && isOfficialUrl(item.sourceUrl) && item.sourceUrl.length > 20) {
        return { 
          url: item.sourceUrl, 
          label: "View Official Source"
        };
    }
    
    // 2. Smart Match from Grounding Sources
    // Try to find a source that shares keywords with the item title
    const bestMatch = officialSources.find(source => {
        if (!source.web?.title) return false;
        const sourceWords = source.web.title.toLowerCase().split(' ');
        const titleWords = item.title.toLowerCase().split(' ');
        // If 3+ words match, it's likely the same document
        const intersection = sourceWords.filter(element => titleWords.includes(element));
        return intersection.length >= 3;
    });

    if (bestMatch && bestMatch.web?.uri) {
        return {
            url: bestMatch.web.uri,
            label: "View Verified Source"
        };
    }

    // 3. Category Fallback (Redirect to Section)
    let categoryUrl = 'https://www.gov.uk/browse/visas-immigration';
    switch (item.category) {
        case 'Work': categoryUrl = 'https://www.gov.uk/browse/visas-immigration/work-visas'; break;
        case 'Student': categoryUrl = 'https://www.gov.uk/browse/visas-immigration/student-visas'; break;
        case 'Family': categoryUrl = 'https://www.gov.uk/browse/visas-immigration/family-visas'; break;
        case 'Asylum': categoryUrl = 'https://www.gov.uk/browse/visas-immigration/asylum'; break;
    }

    return { 
        url: categoryUrl, 
        label: "View Section on Gov.uk" 
    };
  };

  const StatusBadge = ({ status, large = false }: { status: string; large?: boolean }) => {
    const styles: Record<string, string> = {
      'Active': 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100',
      'Passed': 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-100',
      'Proposed': 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-100',
      'Discussion': 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-100',
      'Unknown': 'bg-slate-50 text-slate-600 border-slate-200 ring-slate-100',
    };
    
    const icons: Record<string, any> = {
      'Active': CheckCircle2,
      'Passed': CheckCircle2,
      'Proposed': Activity,
      'Discussion': Megaphone,
    };

    const normalizedStatus = Object.keys(styles).find(k => k.toLowerCase() === status.toLowerCase()) || 'Unknown';
    const Icon = icons[normalizedStatus] || AlertCircle;
    const styleClass = styles[normalizedStatus];

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider border ring-1 ${styleClass} ${large ? 'px-4 py-1.5 text-xs' : 'px-3 py-1 text-[11px]'}`}>
        <Icon className={large ? "w-4 h-4" : "w-3.5 h-3.5"} />
        {status}
      </span>
    );
  };

  const CategoryIcon = ({ category }: { category: string }) => {
    const iconClass = "w-4 h-4";
    switch (category) {
      case 'Work': return <Briefcase className={`${iconClass} text-blue-500`} />;
      case 'Student': return <GraduationCap className={`${iconClass} text-pink-500`} />;
      case 'Family': return <Heart className={`${iconClass} text-rose-500`} />;
      case 'Asylum': return <Globe className={`${iconClass} text-emerald-500`} />;
      default: return <Zap className={`${iconClass} text-amber-500`} />;
    }
  };

  const categories = ['All', 'Work', 'Student', 'Family', 'Asylum', 'General'];

  // Helper to parse timeline string into array
  const parseTimeline = (timelineStr: string) => {
    if (!timelineStr) return [];
    return timelineStr.split(';').map(t => {
        const parts = t.split(':');
        return {
          date: parts[0]?.trim(),
          event: parts.slice(1).join(':').trim()
        };
    }).filter(t => t.date && t.event);
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Recent Updates</h2>
          <p className="text-slate-500 mt-3 text-lg font-light max-w-2xl">
            Real-time feed of parliamentary activity and Home Office rule changes.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button 
              onClick={loadData} 
              disabled={loading}
              className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span className="font-medium">Refresh Feed</span>
            </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-100 pb-2 sticky top-20 z-30 bg-[#F8FAFC]/95 backdrop-blur-sm py-2 -mx-2 px-2">
        {categories.map(cat => (
            <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                ${selectedCategory === cat 
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 translate-y-[-1px]' 
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-800'}`}
            >
                {cat !== 'All' && <CategoryIcon category={cat} />}
                {cat}
            </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 mb-8 text-red-700 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-72 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm animate-pulse flex flex-col gap-4">
                        <div className="h-6 w-1/3 bg-slate-100 rounded-full"></div>
                        <div className="h-8 w-3/4 bg-slate-100 rounded-lg"></div>
                        <div className="h-20 w-full bg-slate-100 rounded-lg"></div>
                    </div>
                ))}
            </div>
            <div className="lg:col-span-4 xl:col-span-3 h-96 bg-slate-200/50 rounded-2xl animate-pulse"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Feed */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-300">
                        <Filter className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900">No updates found</h3>
                        <p className="text-slate-400">There are no recent updates for this category.</p>
                        {selectedCategory !== 'All' && (
                            <button 
                                onClick={() => setSelectedCategory('All')}
                                className="mt-4 text-blue-600 text-sm font-semibold hover:underline"
                            >
                                View All Updates
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {filteredItems.map((item) => (
                        <article 
                            key={item.id} 
                            onClick={() => setSelectedItem(item)}
                            className="group bg-white rounded-2xl p-6 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] border border-slate-200/60 hover:border-blue-500/30 transition-all duration-300 relative overflow-hidden flex flex-col h-full cursor-pointer"
                        >
                            {/* Decorative top border */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent group-hover:via-blue-500 transition-all duration-500"></div>
                            
                            {/* Card Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all`}>
                                        <CategoryIcon category={item.category} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.category}</span>
                                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {item.date}
                                        </span>
                                    </div>
                                </div>
                                <div className="group-hover:scale-105 transition-transform">
                                    <StatusBadge status={item.status} />
                                </div>
                            </div>

                            {/* Title & Summary */}
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3 leading-tight group-hover:text-blue-700 transition-colors break-words">
                                {item.title}
                            </h3>
                            <p className="text-slate-600 leading-relaxed text-[15px] mb-6 border-l-2 border-slate-100 pl-4 flex-grow">
                                {item.summary}
                            </p>
                            
                            {/* Actionable Footer Grid */}
                            <div className="grid sm:grid-cols-2 gap-4 mt-auto">
                                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Impact</h4>
                                    </div>
                                    <p className="text-sm font-medium text-slate-800 leading-snug">{item.impact}</p>
                                </div>
                                <div className="bg-blue-50/30 rounded-xl p-4 border border-blue-100/50 hover:bg-blue-50/50 transition-colors">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                                        <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide">Timeline</h4>
                                    </div>
                                    <p className="text-sm font-medium text-slate-800 leading-snug">{item.nextSteps}</p>
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-blue-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                View full timeline & analysis <ArrowRight className="w-4 h-4" />
                            </div>
                        </article>
                    ))}
                    </div>
                )}
            </div>

            {/* Sidebar Sources */}
            <aside className="lg:col-span-4 xl:col-span-3">
                <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 sm:p-8 sticky top-28 shadow-2xl ring-1 ring-white/10">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            Verified Sources
                        </h3>
                    </div>
                    
                    <p className="text-xs text-slate-400 mb-6 leading-relaxed border-b border-slate-800 pb-4">
                        We ground our AI in data exclusively from Gov.uk, the House of Commons Library, and official Hansard records.
                    </p>
                    
                    <div className="space-y-3">
                        {officialSources.length > 0 ? (
                            officialSources.slice(0, 8).map((source, idx) => (
                            <a 
                                key={idx}
                                href={source.web?.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-blue-600/20 transition-all border border-slate-700/50 hover:border-blue-500/50 group"
                            >
                                <div className="mt-1 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500 transition-colors border border-slate-700">
                                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-200 group-hover:text-white line-clamp-2 leading-snug">
                                        {source.web?.title}
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-1 truncate uppercase tracking-wider">{new URL(source.web?.uri || 'https://gov.uk').hostname}</p>
                                </div>
                            </a>
                        ))) : (
                            <div className="text-slate-500 text-sm p-4 text-center border border-slate-800 rounded-xl border-dashed">
                                No verified official sources linked to this search.
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </div>
      )}

      {/* Detail Modal - Fixed positioning to ensure it's always centered in viewport */}
      {selectedItem && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" 
                onClick={() => setSelectedItem(null)}
            ></div>

            {/* Modal Container */}
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
                <button 
                    onClick={() => setSelectedItem(null)}
                    className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-20"
                >
                    <X className="w-5 h-5 text-slate-600" />
                </button>
                
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-8 sm:p-10 pb-6 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <StatusBadge status={selectedItem.status} large />
                            <span className="text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                                <Clock className="w-4 h-4" /> {selectedItem.date}
                            </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                            {selectedItem.title}
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 p-8 sm:p-10">
                        {/* Main Content (2 cols) */}
                        <div className="md:col-span-2 space-y-8">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-blue-600" /> Analysis & Context
                                </h4>
                                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed text-lg">
                                    <p>{selectedItem.details}</p>
                                </div>
                            </div>

                            {/* Impact Cards */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                                    <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-2">Who is affected?</h4>
                                    <p className="text-amber-800 font-medium text-sm leading-relaxed">{selectedItem.impact}</p>
                                </div>
                                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                                    <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-2">What happens next?</h4>
                                    <p className="text-blue-800 font-medium text-sm leading-relaxed">{selectedItem.nextSteps}</p>
                                </div>
                            </div>

                            {/* External Links */}
                            <div className="border-t border-slate-100 pt-8">
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Official Sources</h4>
                                
                                {(() => {
                                    const primary = getPrimaryLink(selectedItem);
                                    return (
                                        <div className="mb-6">
                                            <a 
                                                href={primary.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-transform hover:-translate-y-0.5 shadow-lg shadow-slate-900/20 w-full"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                {primary.label}
                                            </a>
                                            <p className="text-xs text-slate-400 mt-2 text-center">
                                                Direct link to official Gov.uk content.
                                            </p>
                                        </div>
                                    );
                                })()}

                                {/* Supplementary Sources */}
                                <div className="space-y-3">
                                    {officialSources.slice(0, 4).map((source, idx) => (
                                        <a 
                                            key={idx}
                                            href={source.web?.uri}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                                    <LinkIcon className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 truncate group-hover:text-blue-700">{source.web?.title}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">{source.web?.uri}</p>
                                                </div>
                                            </div>
                                            <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Timeline Sidebar (1 col) */}
                        <div className="md:col-span-1 border-l border-slate-100 md:pl-8">
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                                <GitCommitVertical className="w-4 h-4 text-purple-600" /> Policy Timeline
                            </h4>
                            
                            <div className="relative space-y-8">
                                {/* Vertical Line */}
                                <div className="absolute top-2 left-[5px] bottom-2 w-0.5 bg-slate-100"></div>

                                {/* Render extracted timeline events */}
                                {parseTimeline(selectedItem.timeline).map((event, idx, arr) => (
                                    <div key={idx} className="relative pl-6 group">
                                        <div className={`absolute left-[-4px] top-1.5 w-2.5 h-2.5 rounded-full border-2 
                                            ${idx === arr.length - 1 && event.event.toLowerCase().includes('next') 
                                                ? 'border-slate-300 bg-white' 
                                                : 'border-purple-600 bg-purple-600 ring-4 ring-purple-50'
                                            }`}></div>
                                        <span className="text-xs font-bold text-purple-600 block mb-0.5">{event.date}</span>
                                        <p className="text-sm font-medium text-slate-700 leading-snug">{event.event}</p>
                                    </div>
                                ))}

                                {/* If no timeline parsed, show fallback using date/next steps */}
                                {parseTimeline(selectedItem.timeline).length === 0 && (
                                    <>
                                        <div className="relative pl-6">
                                            <div className="absolute left-[-4px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-slate-300 bg-slate-300"></div>
                                            <span className="text-xs font-bold text-slate-400 block mb-0.5">Previous</span>
                                            <p className="text-sm font-medium text-slate-500 leading-snug">History unavailable</p>
                                        </div>
                                        <div className="relative pl-6">
                                            <div className="absolute left-[-4px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-purple-600 bg-purple-600 ring-4 ring-purple-50"></div>
                                            <span className="text-xs font-bold text-purple-600 block mb-0.5">{selectedItem.date}</span>
                                            <p className="text-sm font-medium text-slate-700 leading-snug">Initial update received</p>
                                        </div>
                                        <div className="relative pl-6">
                                            <div className="absolute left-[-4px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-slate-300 bg-white"></div>
                                            <span className="text-xs font-bold text-slate-400 block mb-0.5">Next Step</span>
                                            <p className="text-sm font-medium text-slate-500 leading-snug">{selectedItem.nextSteps}</p>
                                        </div>
                                    </>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
