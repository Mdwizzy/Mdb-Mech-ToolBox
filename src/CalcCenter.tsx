import { useEffect, useState } from 'react';
import { Activity, Calculator, Copy, Info, Search } from 'lucide-react';
import { calculations, getCalcIndexFromPage } from './data/calculations';
import { recordUsage, supabase } from './lib/supabase';

const logicIds = ['pump_hydraulic_power','pressure_from_force','pipe_flow_rate','darcy_weisbach','reynolds_number','shaft_power','thermal_expansion','heat_duty','lmtd','bearing_life'];

export default function CalcCenter({ page, toast }: any) {
  const [selected, setSelected] = useState(() => getCalcIndexFromPage(page));
  const [filter, setFilter] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [managed, setManaged] = useState<any[] | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let current = true;
    supabase.from('calculators').select('*').eq('status','published').order('name').then(({data}) => {
      if (current && data?.length) setManaged(data);
    });
    return () => { current = false; };
  }, []);

  const available = managed?.map((row) => {
    const logicIndex = logicIds.indexOf(row.logic_id);
    const base = calculations[logicIndex];
    if (!base) return null;
    const fields = Array.isArray(row.inputs) && row.inputs.length ? row.inputs.map((field:any)=>({name:String(field.name||'Input'),unit:String(field.unit||'—'),initial:Number(field.initial)||0})) : base.fields;
    return {...base,...row,fields,logicIndex,unit:row.output?.unit||base.unit,group:row.category||base.group,name:row.name||base.name,description:row.description||base.description,formula:row.formula_display||base.formula,assumptions:row.assumptions||base.assumptions};
  }).filter(Boolean) as any[] | undefined;
  const items = available?.length ? available : calculations;
  const itemKey = items.map((item:any)=>item.logicIndex??calculations.indexOf(item)).join('|');

  // Sync state whenever the page route changes
  useEffect(() => {
    const preferred = getCalcIndexFromPage(page);
    const managedIndex = items.findIndex((item:any)=>item.logicIndex===preferred);
    setSelected(managedIndex>=0?managedIndex:Math.min(preferred,items.length-1));
    setResult(null);
    setError('');
  }, [page, itemKey]);

  const calc:any = items[selected] || items[0];

  const input = (i: number) =>
    values[`${selected}-${i}`] ?? String(calc.fields[i].initial);

  const choose = (i: number) => {
    setSelected(i);
    setResult(null);
    setError('');
  };

  const visible = items
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => (c.name + ' ' + c.group).toLowerCase().includes(filter.toLowerCase()));

  const calculate = () => {
    const rawInputs = calc.fields.map((_:any, i:number) => (input(i) ?? '').trim());

    if (rawInputs.some((s:string) => s === '' || isNaN(Number(s)))) {
      setError('Please enter a valid numeric value for each input field.');
      setResult(null);
      return;
    }

    const v = rawInputs.map(Number);

    // Run per-calculator validation rules
    if (calc.validate) {
      const valError = calc.validate(v);
      if (valError) {
        setError(valError);
        setResult(null);
        return;
      }
    }

    const n = calc.run(v);
    if (!Number.isFinite(n)) {
      setError('This input combination does not produce a finite engineering result.');
      setResult(null);
      return;
    }

    setError('');
    setResult(n);
    void recordUsage('calculator',calc.slug||calc.name);
  };

  return (
    <div className="content page-content calc-page">
      <div className="page-heading">
        <div className="eyebrow">MECHANICAL ENGINEERING · CALCULATION DESK</div>
        <h1>Mechanical Calculators</h1>
        <p>A focused set of practical calculations with clear inputs, equations, results and assumptions.</p>
      </div>

      <div className="calc-center-layout">
        <aside className="panel calc-tool-list">
          <label className="table-search">
            <Search size={15} />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Find a calculator…"
              aria-label="Filter calculators"
            />
          </label>
          <div className="calc-items">
            {visible.map(({ c, i }) => (
              <button
                key={c.name}
                className={selected === i ? 'calc-tool-active' : ''}
                onClick={() => choose(i)}
              >
                <span>{String(i + 1).padStart(2, '0')}</span>
                <b>{c.name}</b>
              </button>
            ))}
          </div>
          <div className="calc-count">
            <Activity size={14} /> {items.length} mechanical calculators
          </div>
        </aside>

        <section className="panel calculation-panel calc-center-panel">
          <div className="panel-top">
            <div>
              <span className="calc-category">{calc.group}</span>
              <h2>{calc.name}</h2>
              <p>{calc.description}</p>
            </div>
            <span className="tool-icon blue">
              <Calculator size={18} />
            </span>
          </div>

          {calc.verification_status&&<div className={`calc-verification-label ${calc.verification_status==='verified'?'verified':'unverified'}`}>{calc.verification_status==='verified'?'Verified calculation':'Not yet verified'}{calc.verified_at&&<small> · checked {new Date(calc.verified_at).toLocaleDateString()}</small>}</div>}

          <div className="calc-input-grid">
            {calc.fields.map((f:any, i:number) => (
              <label key={f.name}>
                {f.name}
                <div className="input-unit">
                  <input
                    type="number"
                    step="any"
                    value={input(i)}
                    onChange={(e) => {
                      setValues({ ...values, [`${selected}-${i}`]: e.target.value });
                      setResult(null);
                      setError('');
                    }}
                  />
                  <span>{f.unit}</span>
                </div>
              </label>
            ))}
          </div>

          <button className="primary-btn" onClick={calculate}>
            <Calculator size={16} /> Calculate result
          </button>

          <div className="calc-explainer">
            <span>FORMULA</span>
            <b>{calc.formula}</b>
            <p>{calc.assumptions}</p>
          </div>

          {error && (
            <div className="calc-inline-error" role="alert">
              {error}
            </div>
          )}

          {result !== null && (
            <div className="calc-result-strip">
              <div>
                <span>CALCULATED RESULT</span>
                <strong>{result.toLocaleString('en-US', { maximumSignificantDigits: 7 })}</strong>
                <small>{calc.unit}</small>
              </div>
              <button
                className="secondary-btn"
                onClick={() => {
                  navigator.clipboard?.writeText(`${result} ${calc.unit}`);
                  toast('Result copied');
                }}
              >
                <Copy size={14} /> Copy result
              </button>
            </div>
          )}

          <div className="calc-assumption">
            <Info size={15} />
            <span>
              Preliminary estimate. Confirm units, boundary conditions, equipment documentation and applicable project requirements before design or operation.
            </span>
          </div>
        </section>
      </div>

      <div className="calc-picks">
        <div className="section-head">
          <div>
            <div className="section-title">
              <h2>Essential mechanical calculations</h2>
            </div>
            <p>Select a calculation to start.</p>
          </div>
        </div>
        <div className="calc-pick-grid">
          {items.map((c:any, i:number) => (
            <button className="calc-pick" key={c.name} onClick={() => choose(i)}>
              <small>{c.group}</small>
              <b>{c.name}</b>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
