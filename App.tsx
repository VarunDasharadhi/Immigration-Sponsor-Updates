import React, { useState, useMemo, useCallback, FC } from 'react';
import {
  Newspaper,
  ScrollText,
  BookOpen,
  Menu,
  X,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { Tab } from './types';
import { NewsDashboard } from './components/NewsDashboard';
import { PetitionTracker } from './components/PetitionTracker';
import { SimplifierTool } from './components/SimplifierTool';
import { SponsorChecker } from './components/SponsorChecker';
import { ErrorBoundary } from './components/ErrorBoundary';

// ===================================================
// CONSTANTS & CONFIGURATION
// ===================================================

interface NavItemConfig {
  tab: Tab;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  ariaLabel: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    tab: Tab.NEWS,
    icon: Newspaper,
    label: 'News & Updates',
    ariaLabel: 'View latest immigration news and updates',
  },
  {
    tab: Tab.SPONSORS,
    icon: Building2,
    label: 'Employers',
    ariaLabel: 'Check sponsor company status',
  },
  {
    tab: Tab.PETITIONS,
    icon: ScrollText,
    label: 'Petitions',
    ariaLabel: 'View active parliament petitions',
  },
  {
    tab: Tab.SIMPLIFIER,
    icon: BookOpen,
    label: 'Jargon Buster',
    ariaLabel: 'Simplify legal immigration text',
  },
];

const CONTENT_MAP: Record<Tab, React.ComponentType> = {
  [Tab.NEWS]: NewsDashboard,
  [Tab.PETITIONS]: PetitionTracker,
  [Tab.SIMPLIFIER]: SimplifierTool,
  [Tab.SPONSORS]: SponsorChecker,
};

// ===================================================
// SUB-COMPONENTS
// ===================================================

interface NavItemProps {
  config: NavItemConfig;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: FC<NavItemProps> = ({ config, isActive, onClick }) => {
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      aria-label={config.ariaLabel}
      aria-current={isActive ? 'page' : undefined}
      className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 text-sm font-medium whitespace-nowrap group
        ${
          isActive
            ? 'text-blue-700 bg-blue-50 shadow-sm ring-1 ring-blue-200'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
    >
      <Icon
        className={`w-4 h-4 transition-colors ${
          isActive
            ? 'text-blue-600'
            : 'text-slate-400 group-hover:text-slate-600'
        }`}
      />
      {config.label}
      {isActive && (
        <span
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full mb-1.5"
          aria-hidden="true"
        />
      )}
    </button>
  );
};

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  mobileMenuOpen: boolean;
  onMobileMenuToggle: (open: boolean) => void;
}

const Header: FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  mobileMenuOpen,
  onMobileMenuToggle,
}) => {
  const handleNavClick = useCallback(
    (tab: Tab) => {
      onTabChange(tab);
      onMobileMenuToggle(false);
    },
    [onTabChange, onMobileMenuToggle]
  );

  return (
    <header
      className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60"
      role="banner"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-18 sm:h-20 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => handleNavClick(Tab.NEWS)}
          className="flex items-center gap-3 cursor-pointer group hover:opacity-80 transition-opacity"
          aria-label="Go to home"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-indigo-800 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/10 group-hover:scale-105 transition-transform duration-300">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
              UK Immigration
            </h1>
            <span className="text-sm font-medium text-blue-600 tracking-wide">
              COMPASS
            </span>
          </div>
        </button>

        {/* Desktop Nav */}
        <nav
          className="hidden md:flex items-center gap-2 bg-white/50 p-1.5 rounded-full border border-slate-200/60 shadow-sm"
          role="navigation"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.tab}
              config={item}
              isActive={activeTab === item.tab}
              onClick={() => handleNavClick(item.tab)}
            />
          ))}
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          onClick={() => onMobileMenuToggle(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <nav
          className="md:hidden border-t border-slate-100 bg-white p-4 flex flex-col gap-2 shadow-xl absolute w-full z-40 animate-in slide-in-from-top-2"
          role="navigation"
          aria-label="Mobile navigation"
        >
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.tab}
              config={item}
              isActive={activeTab === item.tab}
              onClick={() => handleNavClick(item.tab)}
            />
          ))}
        </nav>
      )}
    </header>
  );
};

interface HeroSectionProps {
  onExploreClick: () => void;
}

const HeroSection: FC<HeroSectionProps> = ({ onExploreClick }) => {
  return (
    <section
      className="relative overflow-hidden bg-slate-900 pb-20 z-0"
      aria-label="Hero section"
    >
      {/* Abstract Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <svg
          className="h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 100 C 20 0 50 0 100 100 Z" fill="url(#grad1)" />
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
              <stop
                offset="100%"
                style={{ stopColor: '#0f172a', stopOpacity: 1 }}
              />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div
        className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-20 md:py-24 relative z-10">
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-bold tracking-wider mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            LIVE PARLIAMENTARY TRACKER
          </div>

          {/* Heading */}
          <h2 className="text-4xl md:text-7xl font-extrabold tracking-tight mb-8 text-white leading-[1.3] md:leading-[1.2] pb-4">
            Clarity in a changing <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 inline-block pb-2">
              Immigration System.
            </span>
          </h2>

          {/* Description */}
          <p className="text-xl md:text-2xl text-slate-300 mb-10 leading-relaxed max-w-3xl font-light">
            We monitor government bills, visa rule changes, and MP debates 24/7.
            Our AI translates legal jargon into plain English, so you know exactly
            where you stand.
          </p>

          {/* CTA Button */}
          <button
            onClick={onExploreClick}
            className="group bg-blue-600 hover:bg-blue-500 text-white pl-8 pr-6 py-4 rounded-xl font-semibold transition-all shadow-xl shadow-blue-900/20 hover:shadow-blue-600/30 hover:-translate-y-0.5 flex items-center gap-3"
            aria-label="Explore updates section"
          >
            Explore Updates
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};

interface FooterLinkProps {
  href: string;
  label: string;
}

const FooterLink: FC<FooterLinkProps> = ({ href, label }) => (
  <li>
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-blue-600 transition flex items-center gap-2"
    >
      <ArrowRight className="w-3 h-3 text-slate-300" />
      {label}
    </a>
  </li>
);

const Footer: FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="bg-white border-t border-slate-200 pt-16 pb-12 mt-auto relative z-10"
      role="contentinfo"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 grid md:grid-cols-4 gap-12 mb-12">
        {/* Brand Section */}
        <div className="md:col-span-2 pr-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-white w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-slate-900">
              UK Immigration Compass
            </span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed max-w-md">
            We believe information is a right. By combining official data streams
            with advanced AI, we empower applicants, students, and families to
            navigate the UK's complex immigration landscape with confidence.
          </p>
        </div>

        {/* Resources Section */}
        <div>
          <h3 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-wider">
            Official Resources
          </h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <FooterLink
              href="https://www.gov.uk/browse/visas-immigration"
              label="Gov.uk Visas"
            />
            <FooterLink
              href="https://petition.parliament.uk/"
              label="Parliament Petitions"
            />
            <FooterLink
              href="https://hansard.parliament.uk/"
              label="Hansard Records"
            />
          </ul>
        </div>

        {/* Legal Section */}
        <div>
          <h3 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-wider">
            Legal & Data
          </h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <ArrowRight className="w-3 h-3 text-slate-300" /> Data Refresh:
              Daily
            </li>
            <li className="flex items-center gap-2">
              <ArrowRight className="w-3 h-3 text-slate-300" /> Privacy Policy
            </li>
            <li className="flex items-center gap-2">
              <ArrowRight className="w-3 h-3 text-slate-300" /> Terms of Service
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-slate-400">
          © {currentYear} UK Immigration Compass. Powered by AI.
        </p>
        <div className="bg-amber-50 border border-amber-100 text-amber-900/70 px-4 py-2 rounded-lg text-xs font-medium max-w-xl text-center md:text-right">
          Disclaimer: This is an AI-assisted information tool, not legal advice.
          Always verify with a qualified solicitor.
        </div>
      </div>
    </footer>
  );
};

// ===================================================
// MAIN APP COMPONENT
// ===================================================

const App: FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.NEWS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const ContentComponent = useMemo(() => {
    return CONTENT_MAP[activeTab] || NewsDashboard;
  }, [activeTab]);

  const handleExploreClick = useCallback(() => {
    const feedElement = document.getElementById('feed-start');
    feedElement?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900"
      role="application"
    >
      {/* Navigation */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuToggle={setMobileMenuOpen}
      />

      {/* Hero Section (Only shows on News Tab) */}
      {activeTab === Tab.NEWS && (
        <HeroSection onExploreClick={handleExploreClick} />
      )}

      {/* Main Content */}
      <main className="flex-grow relative z-10" id="feed-start">
        <div className="h-8 bg-gradient-to-b from-slate-100 to-transparent opacity-50 pointer-events-none" />
        <ErrorBoundary>
          <ContentComponent />
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default App;