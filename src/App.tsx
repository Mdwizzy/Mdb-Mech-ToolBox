import { useEffect, useMemo, useState } from 'react';
import CalcCenter from './CalcCenter';
import FastenerReference from './FastenerReference';
import KnowledgeBase from './KnowledgeBase';
import Dashboard from './components/Dashboard';
import Converter from './components/Converter';
import Scientific from './components/Scientific';
import FormulaLibrary from './components/FormulaLibrary';
import Materials from './components/Materials';
import MdbLogo from './components/MdbLogo';
import { tools, categories, knowledgeTopicNames } from './data/tools';
import { formulas } from './data/formulas';
import {
  ArrowLeftRight,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  Hammer,
  Home,
  Info,
  Layers3,
  Menu,
  Moon,
  MoreHorizontal,
  Search,
  Sun,
  Wrench,
  X,
} from 'lucide-react';

export default function App() {
  const [page, setPage] = useState('Dashboard');
  const [query, setQuery] = useState('');
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [favs, setFavs] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('toolbox-favs') || '[]')
  );
  const [recent, setRecent] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('toolbox-recent') || '[]')
  );
  const [notice, setNotice] = useState('');

  // Auto-dismiss notification toast
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  // Handle drawer escape key
  useEffect(() => {
    if (!mobileNav) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNav(false);
    };
    document.body.classList.add('drawer-open');
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.classList.remove('drawer-open');
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileNav]);

  const open = (name: string) => {
    setPage(name);
    setMobileNav(false);
    const list = [name, ...recent.filter((x) => x !== name)].slice(0, 4);
    setRecent(list);
    localStorage.setItem('toolbox-recent', JSON.stringify(list));
  };

  const toggleFav = (name: string) => {
    const next = favs.includes(name) ? favs.filter((x) => x !== name) : [name, ...favs];
    setFavs(next);
    localStorage.setItem('toolbox-favs', JSON.stringify(next));
  };

  const filtered = useMemo(
    () =>
      tools.filter((t) =>
        (t.name + ' ' + t.category + ' ' + t.description)
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [query]
  );

  const matches = [
    ...tools.map((t) => ({ name: t.name, kind: t.category })),
    ...formulas.map((f) => ({ name: f[0] + ' formula', kind: 'Formula' })),
    ...knowledgeTopicNames.map((name) => ({ name, kind: 'Knowledge' })),
  ]
    .filter((x) => (x.name + ' ' + x.kind).toLowerCase().includes(query.toLowerCase()))
    .slice(0, 7);

  return (
    <div className={dark ? 'app dark' : 'app'}>
      {/* Primary Sidebar */}
      <aside
        id="primary-sidebar"
        aria-label="Primary navigation"
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileNav ? 'mobile-open' : ''}`}
      >
        <div className="brand">
          {collapsed ? (
            <div className="brand-mark" title="MDB Mech Toolbox">
              <MdbLogo markOnly className="brand-mark-svg" />
            </div>
          ) : (
            <div
              className="sidebar-brand-link"
              onClick={() => open('Dashboard')}
              role="button"
              tabIndex={0}
              title="MDB Mech Toolbox - Dashboard"
            >
              <MdbLogo className="sidebar-logo-svg" />
            </div>
          )}
          <button
            className="collapse"
            aria-label={mobileNav ? 'Close navigation' : 'Collapse navigation'}
            onClick={() =>
              window.innerWidth <= 760 ? setMobileNav(false) : setCollapsed(!collapsed)
            }
          >
            {mobileNav ? <X size={17} /> : <ChevronLeft size={17} />}
          </button>
        </div>

        <div className="workspace">
          <div className="workspace-icon">
            <Compass size={17} />
          </div>
          {!collapsed && (
            <>
              <div>
                <small>WORKSPACE</small>
                <b>Engineering tools</b>
              </div>
              <ChevronDown size={15} />
            </>
          )}
        </div>

        <div className="nav-label">{!collapsed && 'MENU'}</div>

        <nav>
          {[
            ['Dashboard', Home],
            ['Unit Converter', ArrowLeftRight],
            ['Calculators', Wrench],
            ['Scientific Calculator', Calculator],
            ['Fasteners & Spanner', Hammer],
            ['Formula Library', BookOpen],
            ['Materials', Layers3],
            ['Knowledge Base', BookOpen],
          ].map(([n, Icon]: any) => (
            <button
              key={n}
              onClick={() => open(n)}
              className={`nav-item ${page === n ? 'active' : ''}`}
              title={collapsed ? n : ''}
            >
              <Icon size={18} />
              {!collapsed && <span>{n}</span>}
              {page === n && !collapsed && <i />}
            </button>
          ))}
        </nav>

        <div className="side-spacer" />

        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setDark(!dark)}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
            {!collapsed && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
          </button>
          <div className="profile">
            <div className="avatar">ME</div>
            {!collapsed && (
              <div>
                <b>Engineer</b>
                <small>Personal workspace</small>
              </div>
            )}
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>

      <button
        className={`mobile-scrim ${mobileNav ? 'visible' : ''}`}
        aria-label="Close navigation"
        tabIndex={mobileNav ? 0 : -1}
        onClick={() => setMobileNav(false)}
      />

      {/* Main Content Area */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu"
              aria-label={mobileNav ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileNav}
              aria-controls="primary-sidebar"
              onClick={() => setMobileNav(!mobileNav)}
            >
              {mobileNav ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div
              className="topbar-brand"
              onClick={() => open('Dashboard')}
              role="button"
              tabIndex={0}
              title="MDB Mech Toolbox - Dashboard"
            >
              <MdbLogo className="topbar-logo-svg" />
            </div>

            <div className="topbar-divider" />

            <div className="crumb">
              <span>Workspace</span>
              <ChevronRight size={14} />
              <b>{page}</b>
            </div>
          </div>

          <div className="top-actions">
            <div className="searchbox">
              <Search size={17} />
              <input
                placeholder="Search tools, formulas, references..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && matches[0] && open(matches[0].name)}
              />
              <kbd>⌘ K</kbd>
              {query && (
                <div className="search-pop">
                  {matches.length ? (
                    matches.map((x, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          open(x.name);
                          setQuery('');
                        }}
                      >
                        <Search size={15} />
                        <span>{x.name}</span>
                        <small>{x.kind}</small>
                      </button>
                    ))
                  ) : (
                    <p>No matches found</p>
                  )}
                </div>
              )}
            </div>
            <button className="icon-btn" title="Help">
              <CircleHelp size={18} />
            </button>
            <div className="avatar top-avatar">ME</div>
          </div>
        </header>

        {/* Page Switcher */}
        {page === 'Dashboard' ? (
          <Dashboard
            tools={tools}
            categories={categories as any}
            favorites={favs}
            recent={recent}
            query={query}
            filtered={filtered}
            open={open}
            toggleFav={toggleFav}
          />
        ) : page === 'Unit Converter' || page === 'Volume Converter' || page === 'Unit Conversions' ? (
          <Converter toast={setNotice} preset={page === 'Volume Converter' ? 'Volume' : undefined} />
        ) : page === 'Scientific Calculator' ? (
          <Scientific toast={setNotice} />
        ) : page === 'Fasteners & Spanner' || page === 'Bolt & Spanner Reference' || page === 'Fasteners & Workshop' ? (
          <FastenerReference />
        ) : page === 'Formula Library' || page === 'Engineering Formula Library' || page.toLowerCase().endsWith('formula') ? (
          <FormulaLibrary
            toast={setNotice}
            favs={favs}
            toggleFav={toggleFav}
            initialQuery={page.toLowerCase().endsWith('formula') ? page.replace(/\s*formula$/i, '') : undefined}
          />
        ) : page === 'Materials' || page === 'Material Properties' || page === 'Materials & Properties' ? (
          <Materials />
        ) : page === 'Knowledge Base' || page === 'Mechanical Knowledge Base' ? (
          <KnowledgeBase />
        ) : page === 'Maintenance Engineering' ? (
          <KnowledgeBase initialTopic="Maintenance thinking & RCA" />
        ) : knowledgeTopicNames.includes(page) ? (
          <KnowledgeBase initialTopic={page} />
        ) : (
          <CalcCenter page={page} toast={setNotice} />
        )}

        <footer>
          <span>
            MECHTOOLBOX <i>·</i> ENGINEERING SUITE
          </span>
          <span>
            For educational and preliminary engineering use <Info size={13} />
          </span>
        </footer>
      </main>

      {notice && (
        <div className="toast">
          <Check size={16} />
          {notice}
        </div>
      )}
    </div>
  );
}
