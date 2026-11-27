import { useState } from 'react';
import { Info, Search } from 'lucide-react';
import { materialHeaders, materials } from '../data/materials';
import PublishedAdminContent from './PublishedAdminContent';

export default function Materials() {
  const [q, setQ] = useState('');

  const filtered = materials.filter((r) =>
    r.join(' ').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="content page-content">
      <div className="page-heading">
        <div className="eyebrow">ENGINEERING REFERENCE</div>
        <h1>Material Properties</h1>
        <p>Typical properties for common engineering materials.</p>
      </div>

      <section className="panel table-panel">
        <div className="panel-top">
          <div>
            <h2>Common materials database</h2>
            <p>Representative values at ambient temperature; grade dependent.</p>
          </div>
          <div className="table-search">
            <Search size={15} />
            <input
              placeholder="Search materials..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {materialHeaders.map((h) => (
                  <th key={h.label}>
                    {h.label} {h.unit && <small>{h.unit}</small>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r[0]}>
                  <td>
                    <b>{r[0]}</b>
                  </td>
                  {r.slice(1).map((val, j) => (
                    <td key={j}>{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-foot">
          <Info size={14} /> Values are approximate typical references, not guaranteed design values. Confirm the material grade, condition and certified data for design work.
        </div>
      </section>
      <PublishedAdminContent table="material_properties" />
    </div>
  );
}
