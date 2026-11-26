import { useEffect, useState } from 'react';
import { Bookmark, Copy, Search } from 'lucide-react';
import { formulas } from '../data/formulas';

export default function FormulaLibrary({ toast, favs, toggleFav, initialQuery }: any) {
  const [q, setQ] = useState(initialQuery || '');
  const [cat, setCat] = useState('All formulas');

  useEffect(() => {
    if (initialQuery !== undefined) {
      setQ(initialQuery);
    }
  }, [initialQuery]);

  const cats = [
    'All formulas',
    'Fluid mechanics',
    'Dynamics',
    'Pumps',
    'Thermodynamics',
    'Machine design',
    'Fundamentals',
  ];

  const rows = formulas.filter(
    (f) =>
      (cat === 'All formulas' || f[2] === cat) &&
      f.join(' ').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="content page-content">
      <div className="page-heading">
        <div className="eyebrow">ENGINEERING REFERENCE</div>
        <h1>Formula Library</h1>
        <p>Core mechanical engineering equations, clearly explained.</p>
      </div>

      <div className="panel formula-panel">
        <div className="formula-tools">
          <div className="dimension-tabs">
            {cats.map((c) => (
              <button
                key={c}
                className={cat === c ? 'selected' : ''}
                onClick={() => setCat(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="table-search">
            <Search size={15} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search formulas..."
            />
          </div>
        </div>

        <div className="formula-grid">
          {rows.map((f) => (
            <article className="formula-card" key={f[0]}>
              <div className="formula-card-head">
                <span>{f[2]}</span>
                <button
                  onClick={() => toggleFav(f[0] + ' formula')}
                  title="Bookmark formula"
                >
                  {favs.includes(f[0] + ' formula') ? (
                    <Bookmark size={16} fill="currentColor" />
                  ) : (
                    <Bookmark size={16} />
                  )}
                </button>
              </div>
              <h3>{f[0]}</h3>
              <div className="equation">{f[1]}</div>
              <p>{f[3]}</p>
              <div className="formula-actions">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(f[1]);
                    toast('Formula copied');
                  }}
                >
                  <Copy size={14} /> Copy formula
                </button>
                <span>SI units</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
