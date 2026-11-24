import { useEffect, useState } from 'react';
import { ChevronDown, History, Info } from 'lucide-react';

export default function Scientific({ toast }: any) {
  const [expr, setExpr] = useState('');
  const [answer, setAnswer] = useState('');
  const [rad, setRad] = useState(false);
  const [hist, setHist] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('mech-calc-history') || '[]')
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9.]$/.test(e.key)) {
        act(e.key);
        return;
      }
      const m: Record<string, string> = {
        '+': '+',
        '-': '−',
        '*': '×',
        '/': '÷',
        '%': '%',
        Enter: '=',
        Backspace: 'DEL',
        Escape: 'AC',
        '(': '(',
        ')': ')',
      };
      if (m[e.key]) {
        e.preventDefault();
        act(m[e.key]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expr, answer, rad]);

  const safeCalc = (s: string): string => {
    if (!/^[0-9+\-*/().%\s^πe]+$/.test(s)) {
      throw Error('Use numbers and operators only');
    }
    const x = s
      .replace(/π/g, 'Math.PI')
      .replace(/\be\b/g, 'Math.E')
      .replace(/\^/g, '**');

    const parse = (str: string): number => {
      const tokens = str.match(/(?:Math\.PI|Math\.E|\d*\.?\d+(?:e[+-]?\d+)?|\*\*|[()+\-*/%])/gi);
      if (!tokens || tokens.join('').replace(/Math\.PI|Math\.E/g, '').length !== str.replace(/Math\.PI|Math\.E/g, '').length) {
        throw Error('Invalid expression');
      }
      let pos = 0;

      function atom(): number {
        const t = tokens![pos++];
        if (t === '(') {
          const n = sum();
          if (tokens![pos++] !== ')') throw Error('Missing )');
          return n;
        }
        if (t === '-') return -atom();
        if (t === '+') return atom();
        if (t === 'Math.PI') return Math.PI;
        if (t === 'Math.E') return Math.E;
        const n = Number(t);
        if (!Number.isFinite(n)) throw Error('Invalid number');
        return n;
      }

      function power(): number {
        let n = atom();
        if (tokens![pos] === '**') {
          pos++;
          n = n ** power();
        }
        return n;
      }

      function prod(): number {
        let n = power();
        while (['*', '/', '%'].includes(tokens![pos])) {
          const op = tokens![pos++];
          const b = power();
          n = op === '*' ? n * b : op === '/' ? n / b : n % b;
        }
        return n;
      }

      function sum(): number {
        let n = prod();
        while (tokens![pos] === '+' || tokens![pos] === '-') {
          const op = tokens![pos++];
          const b = prod();
          n = op === '+' ? n + b : n - b;
        }
        return n;
      }

      const n = sum();
      if (pos !== tokens.length || !Number.isFinite(n)) throw Error('Invalid result');
      return n;
    };

    return parse(x)
      .toPrecision(12)
      .replace(/\.0+$|(?<=\.[0-9]*?)0+$/, '');
  };

  const act = (k: string) => {
    if (k === 'AC') {
      setExpr('');
      setAnswer('');
      return;
    }
    if (k === 'DEL') {
      setExpr(expr.slice(0, -1));
      return;
    }
    if (k === '=') {
      if (!expr.trim()) return;
      try {
        const a = safeCalc(expr);
        setAnswer(a);
        const next = [`${expr} = ${a}`, ...hist].slice(0, 12);
        setHist(next);
        localStorage.setItem('mech-calc-history', JSON.stringify(next));
      } catch {
        setAnswer('Error');
      }
      return;
    }

    // Handlers for Ans button
    if (k === 'Ans') {
      if (answer && answer !== 'Error') {
        setExpr(expr + answer);
      }
      return;
    }

    // Ignore inactive modifier keys so they don't break the formula
    if (['SHIFT', 'ALPHA', 'MODE', '2nd', 'CALC', '∫dx', 'Logᵧ', 'RCL', 'ENG', 'S⇔D', 'M+'].includes(k)) {
      toast(`${k} is a reference function.`);
      return;
    }

    // Unary functions (sin, cos, tan, sqrt, etc.)
    const unaryFunctions = [
      'sin', 'cos', 'tan', 'sin⁻¹', 'cos⁻¹', 'tan⁻¹',
      '√', '∛', 'ln', 'log', '10ˣ', 'eˣ', 'x²', 'x³', '1/x', 'FACT', '|x|',
    ];

    if (unaryFunctions.includes(k)) {
      try {
        let baseVal: number;
        if (answer && answer !== 'Error') {
          baseVal = Number(answer);
        } else if (expr) {
          // If expression has operators, evaluate it first
          try {
            baseVal = Number(safeCalc(expr));
          } catch {
            baseVal = Number(expr);
          }
        } else {
          baseVal = 0;
        }

        if (!Number.isFinite(baseVal)) throw Error('Invalid input');

        const angle = rad ? baseVal : (baseVal * Math.PI) / 180;
        let r: number;

        switch (k) {
          case 'sin': r = Math.sin(angle); break;
          case 'cos': r = Math.cos(angle); break;
          case 'tan': r = Math.tan(angle); break;
          case 'sin⁻¹': r = rad ? Math.asin(baseVal) : (Math.asin(baseVal) * 180) / Math.PI; break;
          case 'cos⁻¹': r = rad ? Math.acos(baseVal) : (Math.acos(baseVal) * 180) / Math.PI; break;
          case 'tan⁻¹': r = rad ? Math.atan(baseVal) : (Math.atan(baseVal) * 180) / Math.PI; break;
          case '√': r = Math.sqrt(baseVal); break;
          case '∛': r = Math.cbrt(baseVal); break;
          case 'ln': r = Math.log(baseVal); break;
          case 'log': r = Math.log10(baseVal); break;
          case '10ˣ': r = 10 ** baseVal; break;
          case 'eˣ': r = Math.exp(baseVal); break;
          case 'x²': r = baseVal * baseVal; break;
          case 'x³': r = baseVal ** 3; break;
          case '1/x': r = 1 / baseVal; break;
          case '|x|': r = Math.abs(baseVal); break;
          case 'FACT':
            if (baseVal < 0 || baseVal > 170 || !Number.isInteger(baseVal)) r = NaN;
            else r = Array.from({ length: baseVal }, (_, i) => i + 1).reduce((a, b) => a * b, 1);
            break;
          default: r = NaN;
        }

        const formatted = Number(r.toPrecision(10));
        setExpr(String(formatted));
        setAnswer(String(formatted));
      } catch {
        setAnswer('Error');
      }
      return;
    }

    setExpr(expr + k);
    setAnswer('');
  };

  const keys = [
    'SHIFT', 'ALPHA', 'MODE', '2nd', 'DEG/RAD', 'CALC', '∫dx', 'x⁻¹', 'Logᵧ', '(', ')',
    '√', '∛', 'x²', 'x³', 'xʸ', '10ˣ', 'eˣ', 'log', 'ln',
    'sin⁻¹', 'cos⁻¹', 'tan⁻¹', 'sin', 'cos', 'tan', 'FACT', '|x|', '1/x', 'RCL', 'ENG', 'S⇔D', 'M+',
    '7', '8', '9', 'DEL', 'AC',
    '4', '5', '6', '×', '÷',
    '1', '2', '3', '+', '−',
    '0', '.', 'Exp', 'Ans', '=',
  ];

  return (
    <div className="content page-content">
      <div className="page-heading">
        <div className="eyebrow">ENGINEERING UTILITIES</div>
        <h1>Scientific Calculator</h1>
        <p>Precise calculations, from everyday arithmetic to advanced functions.</p>
      </div>

      <div className="calculator-layout">
        <section className="panel sci-panel">
          <div className="calc-head">
            <div>
              <span className="status-dot" /> CALCULATOR <span className="calc-type">SCIENTIFIC</span>
            </div>
            <button className="mode-toggle" onClick={() => setRad(!rad)}>
              {rad ? 'RAD' : 'DEG'} <ChevronDown size={13} />
            </button>
          </div>

          <div className="calc-screen">
            <div>{expr || '0'}</div>
            <strong>{answer || ' '}</strong>
          </div>

          <div className="calc-buttons">
            {keys.map((k) => (
              <button
                key={k}
                className={`${
                  ['='].includes(k)
                    ? 'equals'
                    : ['AC', 'DEL'].includes(k)
                    ? 'clear'
                    : ['sin', 'cos', 'tan', '√', 'ln', 'log', 'x²', 'xʸ', 'π'].includes(k)
                    ? 'function'
                    : ['÷', '×', '−', '+', '%'].includes(k)
                    ? 'operator'
                    : ''
                }`}
                onClick={() =>
                  act(
                    k === '÷'
                      ? '/'
                      : k === '×'
                      ? '*'
                      : k === '−'
                      ? '-'
                      : k === 'xʸ'
                      ? '^'
                      : k === 'x⁻¹'
                      ? '1/x'
                      : k
                  )
                }
              >
                {k}
              </button>
            ))}
          </div>

          <p className="calc-foot">
            <span>
              <kbd>Enter</kbd> calculate
            </span>
            <span>
              <kbd>Esc</kbd> clear
            </span>
            <button onClick={() => toast('Type numbers and operators to calculate.')}>
              ⌘ keyboard shortcuts
            </button>
          </p>
        </section>

        <aside className="panel history-panel">
          <div className="section-title">
            <h3>Calculation history</h3>
            <History size={16} />
          </div>
          <p>Your recent calculations in this session.</p>
          {hist.length ? (
            hist.map((h, i) => (
              <div className="history-line" key={i}>
                <span>{h.split(' = ')[0]}</span>
                <b>= {h.split(' = ')[1]}</b>
              </div>
            ))
          ) : (
            <div className="history-empty">
              <History size={24} />
              <span>No calculations yet</span>
              <small>Your results will appear here.</small>
            </div>
          )}
          <div className="note-box">
            <Info size={15} />
            <span>
              Expressions are parsed safely. Trigonometric mode can be switched between degrees and radians.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
