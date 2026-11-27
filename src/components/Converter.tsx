import { useEffect, useState } from 'react';
import { ArrowDownUp, ChevronDown, Copy, Info, X } from 'lucide-react';
import { units } from '../data/units';
import { recordUsage } from '../lib/supabase';

export default function Converter({ toast, preset }: any) {
  const [cat, setCat] = useState(preset || 'Length');
  const [value, setValue] = useState('1');
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(4);

  const data = units[cat] || units.Length;
  const [source, target] = [data.items[from] || data.items[0], data.items[to] || data.items[1]];

  const raw = Number(value);

  // Conversion math
  const kelvin =
    source[1] === '°C'
      ? raw + 273.15
      : source[1] === '°F'
      ? ((raw - 32) * 5) / 9 + 273.15
      : raw;

  const result =
    cat === 'Temperature'
      ? target[1] === '°C'
        ? kelvin - 273.15
        : target[1] === '°F'
        ? ((kelvin - 273.15) * 9) / 5 + 32
        : kelvin
      : (raw * source[2]) / target[2];

  const disp = Number.isFinite(result)
    ? new Intl.NumberFormat('en-US', { maximumSignificantDigits: 9 }).format(result)
    : '—';

  useEffect(() => {
    if (!value || !Number.isFinite(result)) return;
    const timer = window.setTimeout(() => void recordUsage('conversion', cat), 1200);
    return () => window.clearTimeout(timer);
  }, [cat, value, from, to, result]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const getFormulaString = () => {
    if (cat === 'Temperature') {
      const s = source[1];
      const t = target[1];
      if (s === t) return `${t} = ${s}`;
      if (s === '°C' && t === '°F') return '°F = (°C × 9/5) + 32';
      if (s === '°F' && t === '°C') return '°C = (°F − 32) × 5/9';
      if (s === '°C' && t === 'K') return 'K = °C + 273.15';
      if (s === 'K' && t === '°C') return '°C = K − 273.15';
      if (s === '°F' && t === 'K') return 'K = (°F − 32) × 5/9 + 273.15';
      if (s === 'K' && t === '°F') return '°F = (K − 273.15) × 9/5 + 32';
    }
    return `${target[1]} = ${source[1]} × (${source[2]} / ${target[2]})`;
  };

  return (
    <div className="content page-content">
      <div className="page-heading">
        <div className="eyebrow">ENGINEERING UTILITIES</div>
        <h1>Unit Converter</h1>
        <p>Fast, accurate conversions across common engineering units.</p>
      </div>

      <div className="converter-layout">
        <section className="panel converter-panel">
          <div className="panel-top">
            <div>
              <h2>Conversion workspace</h2>
              <p>Choose a dimension and convert instantly.</p>
            </div>
            <span className="live-indicator">
              <i /> LIVE
            </span>
          </div>

          <div className="dimension-tabs">
            {Object.keys(units).map((k) => (
              <button
                key={k}
                className={cat === k ? 'selected' : ''}
                onClick={() => {
                  setCat(k);
                  setFrom(0);
                  setTo(1);
                }}
              >
                {k}
              </button>
            ))}
          </div>

          <div className="convert-fields">
            <div className="convert-field">
              <label>FROM</label>
              <div className="unit-select">
                <select value={from} onChange={(e) => setFrom(+e.target.value)}>
                  {data.items.map((u, i) => (
                    <option value={i} key={u[1]}>
                      {u[0]} ({u[1]})
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} />
              </div>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter a value"
              />
              <small>
                {cat === 'Temperature'
                  ? `${source[1]} to ${target[1]} uses an offset scale`
                  : `1 ${source[1]} = ${(source[2] / target[2]).toPrecision(5)} ${target[1]}`}
              </small>
            </div>

            <button className="swap-btn" onClick={swap} title="Swap units">
              <ArrowDownUp size={18} />
            </button>

            <div className="convert-field">
              <label>TO</label>
              <div className="unit-select">
                <select value={to} onChange={(e) => setTo(+e.target.value)}>
                  {data.items.map((u, i) => (
                    <option value={i} key={u[1]}>
                      {u[0]} ({u[1]})
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} />
              </div>
              <div className="result-box">
                <strong>{disp}</strong>
                <span>{target[1]}</span>
              </div>
              <small>Converted result</small>
            </div>
          </div>

          <div className="conversion-bottom">
            <div>
              <span>CONVERSION FORMULA</span>
              <b>{getFormulaString()}</b>
            </div>
            <div>
              <span>EXAMPLE</span>
              <b>
                {value || 0} {source[1]} = {disp} {target[1]}
              </b>
            </div>
            <button
              className="secondary-btn"
              onClick={() => {
                navigator.clipboard?.writeText(`${disp} ${target[1]}`);
                toast('Result copied to clipboard');
              }}
            >
              <Copy size={15} /> Copy result
            </button>
          </div>

          <div className="converter-actions">
            <button
              className="secondary-btn"
              onClick={() => {
                setValue('1');
                setFrom(0);
                setTo(1);
              }}
            >
              <X size={14} /> Reset
            </button>
            <span>Results are calculated using standard physical conversion factors.</span>
          </div>
        </section>

        <aside className="panel side-panel">
          <h3>Popular conversions</h3>
          <p>Quickly jump into a common conversion.</p>
          {[
            ['Length', 'mm → in', 'Millimetre', 'Inch'],
            ['Pressure', 'bar → psi', 'Bar', 'Pounds per square inch'],
            ['Power', 'kW → hp', 'Kilowatt', 'Horsepower'],
            ['Volume', 'L → US gal', 'Litre', 'US gallon'],
            ['Torque', 'N·m → lb·ft', 'Newton metre', 'Pound-foot'],
          ].map(([c, label, a, b]) => (
            <button
              className="popular-conversion"
              key={label}
              onClick={() => {
                setCat(c);
                const d = units[c];
                setFrom(d.items.findIndex((u) => u[0] === a));
                setTo(d.items.findIndex((u) => u[0] === b));
                setValue('1');
              }}
            >
              <span>{label}</span>
              <small>{c}</small>
            </button>
          ))}
          <div className="note-box">
            <Info size={15} />
            <span>
              Temperature, viscosity and RPM conversions require their own physical relationships; these are available as dedicated conversion types.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
