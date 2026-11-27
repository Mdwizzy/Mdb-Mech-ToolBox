import {
  Activity,
  Bookmark,
  Calculator,
  ChevronRight,
  Clock3,
  Droplets,
  Gauge,
  Grid2X2,
  History,
  Info,
  MoreHorizontal,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import FeaturedAdminContent from './FeaturedAdminContent';

export default function Dashboard({
  tools,
  categories,
  favorites,
  recent,
  query,
  filtered,
  open,
  toggleFav,
}: any) {
  return (
    <div className="content dashboard">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> YOUR ENGINEERING WORKSPACE
          </div>
          <h1>
            Welcome to Mechanical
            <br />
            Engineering Toolbox<span>.</span>
          </h1>
          <p>
            Your all-in-one companion for mechanical calculations, engineering conversions,
            <br className="desktop-only" /> technical references and mechanical knowledge.
          </p>
        </div>

        <div className="welcome-art">
          <div className="orbit o1" />
          <div className="orbit o2" />
          <div className="art-center">
            <Wrench size={34} />
          </div>
          <span className="art-chip chip-a">
            <Activity size={15} /> 24.6 <small>kW</small>
          </span>
          <span className="art-chip chip-b">
            <Gauge size={15} /> 4.82 <small>bar</small>
          </span>
          <span className="art-chip chip-c">
            <Droplets size={15} /> 36.2 <small>m³/h</small>
          </span>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat">
          <div className="stat-icon blue-bg">
            <Grid2X2 size={17} />
          </div>
          <div>
            <b>48</b>
            <span>Engineering tools</span>
          </div>
          <i>+8 this month</i>
        </div>
        <div className="stat">
          <div className="stat-icon orange-bg">
            <Bookmark size={17} />
          </div>
          <div>
            <b>{favorites.length.toString().padStart(2, '0')}</b>
            <span>Saved favorites</span>
          </div>
        </div>
        <div className="stat">
          <div className="stat-icon green-bg">
            <History size={17} />
          </div>
          <div>
            <b>{recent.length.toString().padStart(2, '0')}</b>
            <span>Recently used</span>
          </div>
        </div>
        <div className="stat">
          <div className="stat-icon violet-bg">
            <ShieldCheck size={17} />
          </div>
          <div>
            <b>SI</b>
            <span>Unit system</span>
          </div>
          <button onClick={() => open('Unit Converter')}>Change</button>
        </div>
      </div>

      <section className="section tools-section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <h2>{query ? 'Search results' : 'Quick access'}</h2>
              <span className="count">{query ? filtered.length : '10'}</span>
            </div>
            <p>{query ? 'Tools matching your search' : 'Your most-used tools, ready when you are.'}</p>
          </div>
          <button className="text-action" onClick={() => open('Calculators')}>
            View all tools <ChevronRight size={16} />
          </button>
        </div>
        <div className="tool-grid">
          {(query ? filtered : tools).map((t: any) => (
            <ToolCard
              key={t.name}
              tool={t}
              open={open}
              favorite={favorites.includes(t.name)}
              toggleFav={toggleFav}
            />
          ))}
        </div>
      </section>

      {!query && <FeaturedAdminContent open={open} />}

      <div className="lower-grid">
        <section className="section category-section">
          <div className="section-head">
            <div>
              <div className="section-title">
                <h2>Explore by category</h2>
              </div>
              <p>Find the right tool for the job.</p>
            </div>
            <button className="subtle-icon">
              <MoreHorizontal size={19} />
            </button>
          </div>
          <div className="category-grid">
            {categories.map(([name, key, Icon]: any, i: number) => (
              <button
                className="category-item"
                key={name}
                onClick={() =>
                  open(
                    key === 'Conversions'
                      ? 'Unit Converter'
                      : key === 'References'
                      ? 'Material Properties'
                      : key === 'Workshop'
                      ? 'Fasteners & Spanner'
                      : key === 'Calculators'
                      ? 'Scientific Calculator'
                      : key === 'Knowledge'
                      ? 'Knowledge Base'
                      : key === 'Maintenance'
                      ? 'Maintenance thinking & RCA'
                      : key === 'Mechanical'
                      ? 'Calculators'
                      : name
                  )
                }
              >
                <span className={`category-icon ci-${i}`}>
                  <Icon size={17} />
                </span>
                <span>{name}</span>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </section>

        <div className="right-stack">
          <section className="section recent-section">
            <div className="section-head">
              <div>
                <div className="section-title">
                  <h2>Recently used</h2>
                </div>
                <p>Pick up where you left off.</p>
              </div>
              <Clock3 size={17} className="muted-icon" />
            </div>
            {recent.length ? (
              recent.slice(0, 3).map((n: string, i: number) => (
                <button className="recent-item" key={n} onClick={() => open(n)}>
                  <span className={`recent-icon ri-${i}`}>
                    <Calculator size={16} />
                  </span>
                  <span>
                    <b>{n}</b>
                    <small>Opened recently</small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))
            ) : (
              <div className="empty-recent">Your recent tools will show up here.</div>
            )}
          </section>

          <section className="tip-card">
            <span>
              <Info size={15} /> ENGINEERING NOTE
            </span>
            <p>
              Always verify calculations against applicable standards and manufacturer data before use in critical design.
            </p>
            <button onClick={() => open('Knowledge Base')}>
              Learn more <ChevronRight size={14} />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function ToolCard({ tool, open, favorite, toggleFav }: any) {
  const Icon = tool.icon;
  return (
    <article className="tool-card">
      <button
        className="favorite-btn"
        title="Toggle favorite"
        onClick={(e) => {
          e.stopPropagation();
          toggleFav(tool.name);
        }}
      >
        {favorite ? <Bookmark size={15} fill="currentColor" /> : <Bookmark size={15} />}
      </button>
      <button className="tool-main" onClick={() => open(tool.name)}>
        <span className={`tool-icon ${tool.color}`}>
          <Icon size={19} />
        </span>
        <span className="tool-tag">{tool.category}</span>
        <b>{tool.name}</b>
        <p>{tool.description}</p>
        <span className="tool-open">
          Open tool <ChevronRight size={14} />
        </span>
      </button>
    </article>
  );
}
