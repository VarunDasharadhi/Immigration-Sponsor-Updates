import React, { useState } from 'react';
import { Newspaper, ScrollText, BookOpen, Menu, X, ShieldCheck, ArrowRight, ChevronRight, Building2 } from 'lucide-react';
import { Tab } from './types';
import { NewsDashboard } from './components/NewsDashboard';
import { PetitionTracker } from './components/PetitionTracker';
import { SimplifierTool } from './components/SimplifierTool';
import { SponsorChecker } from './components/SponsorChecker';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.NEWS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case Tab.NEWS:
        return <NewsDashboard />;
      case Tab.PETITIONS:
        return <PetitionTracker />;
      case Tab.SIMPLIFIER:
        return <SimplifierTool />;
      case Tab.SPONSORS:
        return <SponsorChecker />;
      default:
        return <NewsDashboard />;
    }
  };

  const NavItem = ({ tab, icon: Icon, label }: { tab: Tab; icon: any; label: string }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        setMobileMenuOpen(false);
      }}
      className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 text-sm font-medium whitespace-nowrap group
        ${activeTab === tab 
          ? 'text-blue-700 bg-blue-50 shadow-sm ring-1 ring-blue-200' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
    >
      <Icon className={`w-4 h-4 transition-colors ${activeTab === tab ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
      {label}
      {activeTab === tab && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full mb-1.5 opacity-0"></span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-18 sm:h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setActiveTab(Tab.NEWS)}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-indigo-800 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/10 group-hover:scale-105 transition-transform duration-300">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">UK Immigration</h1>
              <span className="text-sm font-medium text-blue-600 tracking-wide">COMPASS</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2 bg-white/50 p-1.5 rounded-full border border-slate-200/60 shadow-sm">
            <NavItem tab={Tab.NEWS} icon={Newspaper} label="News & Updates" />
            <NavItem tab={Tab.SPONSORS} icon={Building2} label="Employers" />
            <NavItem tab={Tab.PETITIONS} icon={ScrollText} label="Petitions" />
            <NavItem tab={Tab.SIMPLIFIER} icon={BookOpen} label="Jargon Buster" />
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white p-4 flex flex-col gap-2 shadow-xl absolute w-full z-40 animate-in slide-in-from-top-2">
            <NavItem tab={Tab.NEWS} icon={Newspaper} label="News & Updates" />
            <NavItem tab={Tab.SPONSORS} icon={Building2} label="Employers" />
            <NavItem tab={Tab.PETITIONS} icon={ScrollText} label="Petitions" />
            <NavItem tab={Tab.SIMPLIFIER} icon={BookOpen} label="Jargon Buster" />
          </div>
        )}
      </header>

      {/* Hero Section (Only shows on News Tab) */}
      {activeTab === Tab.NEWS && (
        <div className="relative overflow-hidden bg-slate-900 pb-20 z-0">
            {/* Abstract Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0 100 C 20 0 50 0 100 100 Z" fill="url(#grad1)" />
                    <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{stopColor:'#3b82f6', stopOpacity:1}} />
                            <stop offset="100%" style={{stopColor:'#0f172a', stopOpacity:1}} />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
            
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-20 md:py-24 relative z-10">
                <div className="max-w-4xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-bold tracking-wider mb-8 backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        LIVE PARLIAMENTARY TRACKER
                    </div>
                    {/* Increased leading and padding to fix overlapping and clipping issues */}
                    <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight mb-8 text-white leading-[1.3] md:leading-[1.2] pb-4">
                        Clarity in a changing <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 inline-block pb-2">Immigration System.</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-300 mb-10 leading-relaxed max-w-3xl font-light">
                        We monitor government bills, visa rule changes, and MP debates 24/7. 
                        Our AI translates legal jargon into plain English, so you know exactly where you stand.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <button 
                            onClick={() => document.getElementById('feed-start')?.scrollIntoView({behavior: 'smooth'})}
                            className="group bg-blue-600 hover:bg-blue-500 text-white pl-8 pr-6 py-4 rounded-xl font-semibold transition-all shadow-xl shadow-blue-900/20 hover:shadow-blue-600/30 hover:-translate-y-0.5 flex items-center gap-3"
                        >
                            Explore Updates 
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Main Content - Increased z-index to 10 to ensure it sits ABOVE the hero section (z-0) */}
      {/* This ensures Modals inside Main are not overlapped by Hero text artifacts */}
      <main className="flex-grow relative z-10" id="feed-start">
        <div className="h-8 bg-gradient-to-b from-slate-100 to-transparent opacity-50 pointer-events-none"></div>
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-12 mt-auto relative z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2 pr-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <ShieldCheck className="text-white w-4 h-4" />
                    </div>
                    <span className="text-lg font-bold text-slate-900">UK Immigration Compass</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed max-w-md">
                    We believe information is a right. By combining official data streams with advanced AI, 
                    we empower applicants, students, and families to navigate the UK's complex immigration landscape with confidence.
                </p>
            </div>
            <div>
                <h4 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-wider">Official Resources</h4>
                <ul className="space-y-3 text-sm text-slate-600">
                    <li><a href="https://www.gov.uk/browse/visas-immigration" className="hover:text-blue-600 transition flex items-center gap-2"><ArrowRight className="w-3 h-3 text-slate-300" /> Gov.uk Visas</a></li>
                    <li><a href="https://petition.parliament.uk/" className="hover:text-blue-600 transition flex items-center gap-2"><ArrowRight className="w-3 h-3 text-slate-300" /> Parliament Petitions</a></li>
                    <li><a href="https://hansard.parliament.uk/" className="hover:text-blue-600 transition flex items-center gap-2"><ArrowRight className="w-3 h-3 text-slate-300" /> Hansard Records</a></li>
                </ul>
            </div>
            <div>
                <h4 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-wider">Legal & Data</h4>
                <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-slate-300" /> Data Refresh: Daily</li>
                    <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-slate-300" /> Privacy Policy</li>
                    <li className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-slate-300" /> Terms of Service</li>
                </ul>
            </div>
        </div>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} UK Immigration Compass. Powered by Google Gemini AI.</p>
          <div className="bg-amber-50 border border-amber-100 text-amber-900/70 px-4 py-2 rounded-lg text-xs font-medium max-w-xl text-center md:text-right">
             Disclaimer: This is an AI-assisted information tool, not legal advice. Always verify with a qualified solicitor.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;