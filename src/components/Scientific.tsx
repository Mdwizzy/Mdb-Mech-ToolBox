import { useEffect, useRef, useState } from 'react';
import { Copy, History, Info, RotateCcw, Trash2 } from 'lucide-react';

interface ScientificProps {
  toast: (msg: string) => void;
}

// Clean floating point output and avoid precision artifacts like 0.30000000000000004
function cleanNumber(n: number): string {
  if (!Number.isFinite(n)) return 'Error';
  if (Math.abs(n) < 1e-14) return '0';
  const prec = parseFloat(n.toPrecision(12));
  return String(prec);
}

// Safe mathematical expression evaluator
function evaluateMath(raw: string, isRad = false, ansVal = 0): string {
  if (!raw || !raw.trim()) return '';

  let s = raw.trim();

  // Strip trailing operators/spaces for live preview
  s = s.replace(/[\s+\−\-×\*\÷\/^%]+$/, '');
  if (!s.trim()) return '';

  // Standardize symbols
  s = s
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/Ans/gi, ` (${ansVal}) `)
    .replace(/π/g, ' Math.PI ')
    .replace(/\bpi\b/gi, ' Math.PI ')
    .replace(/\be\b/g, ' Math.E ');

  // Auto-close missing parentheses
  let openParen = 0;
  for (const c of s) {
    if (c === '(') openParen++;
    if (c === ')') openParen--;
  }
  while (openParen > 0) {
    s += ')';
    openParen--;
  }

  // Tokenize safely
  const tokenRegex =
    /(sin⁻¹|cos⁻¹|tan⁻¹|asin|acos|atan|sinh|cosh|tanh|sin|cos|tan|sqrt|cbrt|√|∛|ln|log|abs|Math\.PI|Math\.E|\d*\.?\d+(?:e[+-]?\d+)?|\*\*|\^|[()+\-*/%!])/gi;
  const tokens: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(s)) !== null) {
    tokens.push(m[0]);
  }

  if (tokens.length === 0) return '';

  let pos = 0;
  const peek = () => tokens[pos];
  const get = () => tokens[pos++];

  function fact(n: number): number {
    if (n < 0 || n > 170 || !Number.isInteger(n)) return NaN;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  function factor(): number {
    const t = get();
    if (!t) throw new Error('Incomplete');

    if (t === '+') return factor();
    if (t === '-') return -factor();

    if (t === '(') {
      const val = expr();
      if (get() !== ')') throw new Error('Expected )');
      return postfix(val);
    }

    if (t === 'Math.PI') return postfix(Math.PI);
    if (t === 'Math.E') return postfix(Math.E);

    const fn = t.toLowerCase();
    if (
      [
        'sin',
        'cos',
        'tan',
        'asin',
        'acos',
        'atan',
        'sin⁻¹',
        'cos⁻¹',
        'tan⁻¹',
        'sinh',
        'cosh',
        'tanh',
        'sqrt',
        '√',
        'cbrt',
        '∛',
        'ln',
        'log',
        'abs',
      ].includes(fn)
    ) {
      let arg: number;
      if (peek() === '(') {
        get();
        arg = expr();
        if (peek() === ')') get();
      } else {
        arg = factor();
      }

      let res = 0;
      const angle = isRad ? arg : (arg * Math.PI) / 180;
      switch (fn) {
        case 'sin':
          res = Math.sin(angle);
          if (!isRad && Math.abs(arg % 180) === 0) res = 0;
          break;
        case 'cos':
          res = Math.cos(angle);
          if (!isRad && Math.abs((arg - 90) % 180) === 0) res = 0;
          break;
        case 'tan':
          if (!isRad && Math.abs((arg - 90) % 180) === 0) return NaN;
          res = Math.tan(angle);
          if (!isRad && Math.abs(arg % 180) === 0) res = 0;
          break;
        case 'asin':
        case 'sin⁻¹':
          res = isRad ? Math.asin(arg) : (Math.asin(arg) * 180) / Math.PI;
          break;
        case 'acos':
        case 'cos⁻¹':
          res = isRad ? Math.acos(arg) : (Math.acos(arg) * 180) / Math.PI;
          break;
        case 'atan':
        case 'tan⁻¹':
          res = isRad ? Math.atan(arg) : (Math.atan(arg) * 180) / Math.PI;
          break;
        case 'sinh':
          res = Math.sinh(arg);
          break;
        case 'cosh':
          res = Math.cosh(arg);
          break;
        case 'tanh':
          res = Math.tanh(arg);
          break;
        case 'sqrt':
        case '√':
          res = Math.sqrt(arg);
          break;
        case 'cbrt':
        case '∛':
          res = Math.cbrt(arg);
          break;
        case 'ln':
          res = Math.log(arg);
          break;
        case 'log':
          res = Math.log10(arg);
          break;
        case 'abs':
          res = Math.abs(arg);
          break;
      }
      return postfix(res);
    }

    const n = Number(t);
    if (Number.isFinite(n)) return postfix(n);

    throw new Error('Invalid token: ' + t);
  }

  function postfix(val: number): number {
    while (pos < tokens.length) {
      if (peek() === '!') {
        get();
        val = fact(val);
      } else if (peek() === '%') {
        get();
        val = val / 100;
      } else {
        break;
      }
    }
    return val;
  }

  function power(): number {
    const left = factor();
    if (peek() === '^' || peek() === '**') {
      get();
      const right = power();
      return Math.pow(left, right);
    }
    return left;
  }

  function term(): number {
    let left = power();
    while (pos < tokens.length && (peek() === '*' || peek() === '/')) {
      const op = get();
      const right = power();
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }

  function expr(): number {
    let left = term();
    while (pos < tokens.length && (peek() === '+' || peek() === '-')) {
      const op = get();
      const right = term();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  try {
    const result = expr();
    return cleanNumber(result);
  } catch {
    return '';
  }
}

// Negate the trailing operand/number in the expression
function toggleLastNumberSign(s: string): string {
  if (!s || !s.trim()) return '-';
  const match = s.match(/(.*?)([-+]?\d*\.?\d+)\s*$/);
  if (!match) return s + '-';
  const prefix = match[1];
  const num = match[2];
  if (num.startsWith('-')) {
    return prefix + num.slice(1);
  } else if (num.startsWith('+')) {
    return prefix + '-' + num.slice(1);
  } else {
    return prefix + '-' + num;
  }
}

export default function Scientific({ toast }: ScientificProps) {
  const [expr, setExpr] = useState('');
  const [answer, setAnswer] = useState('');
  const [lastFormula, setLastFormula] = useState('');
  const [justCalculated, setJustCalculated] = useState(false);
  const [rad, setRad] = useState(false);
  const [is2nd, setIs2nd] = useState(false);
  const [memory, setMemory] = useState<number>(0);
  const [lastAnsNum, setLastAnsNum] = useState<number>(0);
  const [hist, setHist] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('mech-calc-history') || '[]')
  );

  const screenExprRef = useRef<HTMLDivElement>(null);

  // Auto-scroll expression display to the end as user types
  useEffect(() => {
    if (screenExprRef.current) {
      screenExprRef.current.scrollLeft = screenExprRef.current.scrollWidth;
    }
  }, [expr]);

  // Live calculation preview: evaluates as an operation is being performed before '=' is pressed
  const livePreview = !justCalculated && expr.trim() ? evaluateMath(expr, rad, lastAnsNum) : '';

  // Core Keypad Action Handler
  const act = (key: string) => {
    // 1. Chaining right after an evaluation ('=' pressed)
    if (justCalculated) {
      // Retain answer when continuing with an operator
      if (['+', '−', '×', '÷', '^', '%'].includes(key)) {
        const base = answer && answer !== 'Error' ? answer : '0';
        setExpr(base + ' ' + key + ' ');
        setLastFormula(lastFormula || expr + ' = ' + base);
        setJustCalculated(false);
        return;
      }

      // Retain answer when continuing with a power / root / function
      if (key === 'x²') {
        const base = answer && answer !== 'Error' ? answer : '0';
        setExpr(base + '^2');
        setJustCalculated(false);
        return;
      }
      if (key === 'x³') {
        const base = answer && answer !== 'Error' ? answer : '0';
        setExpr(base + '^3');
        setJustCalculated(false);
        return;
      }
      if (key === 'xʸ') {
        const base = answer && answer !== 'Error' ? answer : '0';
        setExpr(base + '^');
        setJustCalculated(false);
        return;
      }
      if (key === '√') {
        const base = answer && answer !== 'Error' ? answer : '0';
        setExpr('√(' + base + ')');
        setJustCalculated(false);
        return;
      }
      if (key === '∛') {
        const base = answer && answer !== 'Error' ? answer : '0';
        setExpr('∛(' + base + ')');
        setJustCalculated(false);
        return;
      }
      if (key === '1/x') {
        const base = answer && answer !== 'Error' ? answer : '0';
        setExpr('1/(' + base + ')');
        setJustCalculated(false);
        return;
      }
      if (key === 'n!') {
        const base = answer && answer !== 'Error' ? answer : '0';
        setExpr(base + '!');
        setJustCalculated(false);
        return;
      }
      if (key === '±') {
        const base = answer && answer !== 'Error' ? answer : '0';
        const toggled = base.startsWith('-') ? base.slice(1) : '-' + base;
        setExpr(toggled);
        setAnswer(toggled);
        setLastAnsNum(Number(toggled));
        setJustCalculated(true);
        return;
      }
      if (key === 'DEL') {
        const next = answer.slice(0, -1) || '0';
        setExpr(next);
        setJustCalculated(false);
        return;
      }
      if (key === 'AC') {
        setExpr('');
        setAnswer('');
        setLastFormula('');
        setJustCalculated(false);
        return;
      }

      // If user types a new number or opens a parenthesis, start fresh calculation
      setLastFormula(expr + ' = ' + answer);
      setJustCalculated(false);
      if (/^[0-9.]$/.test(key)) {
        setExpr(key);
        return;
      }
      setExpr('');
    }

    // 2. Normal typing mode
    if (key === 'AC') {
      setExpr('');
      setAnswer('');
      setLastFormula('');
      setJustCalculated(false);
      return;
    }

    if (key === 'DEL') {
      setExpr((prev) => prev.slice(0, -1));
      return;
    }

    if (key === '=') {
      if (!expr.trim()) return;
      const res = evaluateMath(expr, rad, lastAnsNum);
      if (res && res !== 'Error') {
        setAnswer(res);
        setLastAnsNum(Number(res));
        setLastFormula(expr);
        setExpr(res);
        setJustCalculated(true);

        // Update calculation history
        const item = `${expr} = ${res}`;
        const next = [item, ...hist.filter((x) => x !== item)].slice(0, 20);
        setHist(next);
        localStorage.setItem('mech-calc-history', JSON.stringify(next));
      } else {
        setAnswer('Error');
      }
      return;
    }

    if (key === 'Ans') {
      setExpr((prev) => prev + (lastAnsNum !== 0 ? String(lastAnsNum) : 'Ans'));
      return;
    }

    if (key === '±') {
      setExpr((prev) => toggleLastNumberSign(prev));
      return;
    }

    // Functions with open parentheses
    if (
      [
        'sin',
        'cos',
        'tan',
        'sin⁻¹',
        'cos⁻¹',
        'tan⁻¹',
        'sinh',
        'cosh',
        'tanh',
        'ln',
        'log',
        '√',
        '∛',
        'abs',
      ].includes(key)
    ) {
      setExpr((prev) => prev + key + '(');
      return;
    }

    if (key === '10ˣ') {
      setExpr((prev) => prev + '10^(');
      return;
    }
    if (key === 'eˣ') {
      setExpr((prev) => prev + 'e^(');
      return;
    }
    if (key === 'x²') {
      setExpr((prev) => prev + '^2');
      return;
    }
    if (key === 'x³') {
      setExpr((prev) => prev + '^3');
      return;
    }
    if (key === 'xʸ') {
      setExpr((prev) => prev + '^');
      return;
    }
    if (key === '1/x') {
      setExpr((prev) => prev + '1/(');
      return;
    }
    if (key === 'n!') {
      setExpr((prev) => prev + '!');
      return;
    }

    // Arithmetic operators: format with clean spacing
    if (['+', '−', '×', '÷', '%'].includes(key)) {
      setExpr((prev) => {
        const trimmed = prev.trimEnd();
        if (/[\+\−\×\÷\^]$/.test(trimmed)) {
          return trimmed.slice(0, -1) + key + ' ';
        }
        return prev + ' ' + key + ' ';
      });
      return;
    }

    // Digits and symbols
    setExpr((prev) => prev + key);
  };

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore if user is inside an input or textarea
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        return;
      }

      if (/^[0-9.]$/.test(e.key)) {
        act(e.key);
        return;
      }
      const map: Record<string, string> = {
        '+': '+',
        '-': '−',
        '*': '×',
        '/': '÷',
        '%': '%',
        '^': 'xʸ',
        Enter: '=',
        '=': '=',
        Backspace: 'DEL',
        Escape: 'AC',
        '(': '(',
        ')': ')',
      };
      if (map[e.key]) {
        e.preventDefault();
        act(map[e.key]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expr, answer, justCalculated, rad, lastAnsNum, lastFormula]);

  // Memory handlers
  const handleMemory = (op: 'MC' | 'MR' | 'M+' | 'M-') => {
    const currentVal = Number(answer || livePreview || expr || 0);
    switch (op) {
      case 'MC':
        setMemory(0);
        toast('Memory cleared (MC = 0)');
        break;
      case 'MR':
        setExpr((prev) => prev + (memory !== 0 ? String(memory) : '0'));
        toast(`Memory recalled (${memory})`);
        break;
      case 'M+':
        setMemory((prev) => {
          const next = cleanNumber(prev + (Number.isFinite(currentVal) ? currentVal : 0));
          toast(`Added to memory (M = ${next})`);
          return Number(next);
        });
        break;
      case 'M-':
        setMemory((prev) => {
          const next = cleanNumber(prev - (Number.isFinite(currentVal) ? currentVal : 0));
          toast(`Subtracted from memory (M = ${next})`);
          return Number(next);
        });
        break;
    }
  };

  // Copy current result to clipboard
  const copyResult = () => {
    const val = justCalculated ? answer : livePreview || expr;
    if (val && val !== 'Error') {
      navigator.clipboard?.writeText(val);
      toast(`Copied ${val} to clipboard`);
    } else {
      toast('Nothing to copy');
    }
  };

  // Keypad row definitions:
  // 1. Scientific rows (5 columns wide)
  const sciRow1 = is2nd
    ? [
        { label: 'sin⁻¹', val: 'sin⁻¹' },
        { label: 'cos⁻¹', val: 'cos⁻¹' },
        { label: 'tan⁻¹', val: 'tan⁻¹' },
        { label: 'eˣ', val: 'eˣ' },
        { label: '10ˣ', val: '10ˣ' },
      ]
    : [
        { label: 'sin', val: 'sin' },
        { label: 'cos', val: 'cos' },
        { label: 'tan', val: 'tan' },
        { label: 'ln', val: 'ln' },
        { label: 'log', val: 'log' },
      ];

  const sciRow2 = is2nd
    ? [
        { label: '∛', val: '∛' },
        { label: 'x³', val: 'x³' },
        { label: 'xʸ', val: 'xʸ' },
        { label: '(', val: '(' },
        { label: ')', val: ')' },
      ]
    : [
        { label: '√', val: '√' },
        { label: 'x²', val: 'x²' },
        { label: 'xʸ', val: 'xʸ' },
        { label: '(', val: '(' },
        { label: ')', val: ')' },
      ];

  const sciRow3 = is2nd
    ? [
        { label: 'π', val: 'π' },
        { label: 'e', val: 'e' },
        { label: '|x|', val: 'abs' },
        { label: 'n!', val: 'n!' },
        { label: '%', val: '%' },
      ]
    : [
        { label: 'π', val: 'π' },
        { label: 'e', val: 'e' },
        { label: '1/x', val: '1/x' },
        { label: 'n!', val: 'n!' },
        { label: '%', val: '%' },
      ];

  // 2. Primary Number & Operation keypad (5 columns wide)
  // Left 3 columns = NUMBERS
  // Right 2 columns = OPERATIONS, DEL, AC
  const primaryRows = [
    // Row 1: Left numbers (7, 8, 9) | Right operations (DEL, AC)
    [
      { label: '7', val: '7', type: 'num' },
      { label: '8', val: '8', type: 'num' },
      { label: '9', val: '9', type: 'num' },
      { label: 'DEL', val: 'DEL', type: 'clear' },
      { label: 'AC', val: 'AC', type: 'clear' },
    ],
    // Row 2: Left numbers (4, 5, 6) | Right operations (×, ÷)
    [
      { label: '4', val: '4', type: 'num' },
      { label: '5', val: '5', type: 'num' },
      { label: '6', val: '6', type: 'num' },
      { label: '×', val: '×', type: 'op' },
      { label: '÷', val: '÷', type: 'op' },
    ],
    // Row 3: Left numbers (1, 2, 3) | Right operations (+, −)
    [
      { label: '1', val: '1', type: 'num' },
      { label: '2', val: '2', type: 'num' },
      { label: '3', val: '3', type: 'num' },
      { label: '+', val: '+', type: 'op' },
      { label: '−', val: '−', type: 'op' },
    ],
    // Row 4: Left numbers (±, 0, .) | Right actions (Ans, =)
    [
      { label: '±', val: '±', type: 'num' },
      { label: '0', val: '0', type: 'num' },
      { label: '.', val: '.', type: 'num' },
      { label: 'Ans', val: 'Ans', type: 'ans' },
      { label: '=', val: '=', type: 'eq' },
    ],
  ];

  return (
    <div className="content page-content">
      <div className="page-heading">
        <div className="eyebrow">ENGINEERING UTILITIES</div>
        <h1>Scientific Calculator</h1>
        <p>Advanced engineering calculator with real-time evaluation and chained computation.</p>
      </div>

      <div className="calculator-layout">
        <section className="panel sci-panel">
          {/* Top Header / Mode Bar */}
          <div className="calc-head-adv">
            <div className="calc-branding">
              <span className="status-dot" />
              <span>SCIENTIFIC</span>
              <span className="calc-badge-mode">{rad ? 'RADIAN' : 'DEGREE'}</span>
            </div>

            <div className="calc-toolbar-actions">
              <button
                className={`calc-tool-chip ${rad ? 'active' : ''}`}
                onClick={() => setRad(!rad)}
                title="Toggle Angle Mode (DEG/RAD)"
              >
                {rad ? 'RAD' : 'DEG'}
              </button>
              <button
                className={`calc-tool-chip ${is2nd ? 'active' : ''}`}
                onClick={() => setIs2nd(!is2nd)}
                title="Secondary Functions (Inverse / Hyperbolic)"
              >
                2nd
              </button>
              <div className="mem-group">
                <button
                  className="calc-mem-btn"
                  onClick={() => handleMemory('MC')}
                  title="Memory Clear"
                >
                  MC
                </button>
                <button
                  className="calc-mem-btn"
                  onClick={() => handleMemory('MR')}
                  title="Memory Recall"
                >
                  MR
                </button>
                <button
                  className="calc-mem-btn"
                  onClick={() => handleMemory('M+')}
                  title="Memory Add"
                >
                  M+
                </button>
                <button
                  className="calc-mem-btn"
                  onClick={() => handleMemory('M-')}
                  title="Memory Subtract"
                >
                  M-
                </button>
              </div>
              <button
                className="calc-tool-chip copy-icon-btn"
                onClick={copyResult}
                title="Copy result"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>

          {/* Calculator Screen with Live Evaluation */}
          <div className="calc-screen-adv">
            <div className="calc-screen-topline">
              <div className="calc-screen-badges">
                <span className="badge-deg-rad">{rad ? 'RAD' : 'DEG'}</span>
                {is2nd && <span className="badge-active-pill">2nd</span>}
                {memory !== 0 && (
                  <span className="badge-mem-pill" title={`Stored Memory: ${memory}`}>
                    M = {cleanNumber(memory)}
                  </span>
                )}
              </div>
              <div className="calc-screen-history-prev">
                {justCalculated ? lastFormula + ' =' : ''}
              </div>
            </div>

            {/* Expression line */}
            <div className="calc-screen-expression" ref={screenExprRef} title={expr || '0'}>
              {expr || '0'}
            </div>

            {/* Live Result Line: shows value as operation is typed, bold on '=' */}
            <div className="calc-screen-live-result">
              <span className="calc-live-glyph">
                {justCalculated ? '' : livePreview ? '=' : ''}
              </span>
              <strong className={justCalculated ? 'calc-final-bold' : 'calc-preview-dim'}>
                {justCalculated ? answer || '0' : livePreview || ' '}
              </strong>
            </div>
          </div>

          {/* Scientific Functions Grid (5 columns) */}
          <div className="calc-sci-block">
            <div className="calc-grid-5">
              {sciRow1.map((btn) => (
                <button
                  key={btn.label}
                  className="calc-btn-adv calc-fn-key"
                  onClick={() => act(btn.val)}
                >
                  {btn.label}
                </button>
              ))}
              {sciRow2.map((btn) => (
                <button
                  key={btn.label}
                  className="calc-btn-adv calc-fn-key"
                  onClick={() => act(btn.val)}
                >
                  {btn.label}
                </button>
              ))}
              {sciRow3.map((btn) => (
                <button
                  key={btn.label}
                  className="calc-btn-adv calc-fn-key"
                  onClick={() => act(btn.val)}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Keypad: Numbers on the Left, Operations / DEL / AC on the Right */}
          <div className="calc-main-block">
            <div className="calc-keypad-grid-5">
              {primaryRows.map((row, rIdx) =>
                row.map((btn) => {
                  let cls = 'calc-btn-adv ';
                  if (btn.type === 'num') cls += 'calc-num-key';
                  else if (btn.type === 'op') cls += 'calc-op-key';
                  else if (btn.type === 'clear') cls += 'calc-clear-key';
                  else if (btn.type === 'ans') cls += 'calc-ans-key';
                  else if (btn.type === 'eq') cls += 'calc-eq-key';

                  return (
                    <button key={`${rIdx}-${btn.label}`} className={cls} onClick={() => act(btn.val)}>
                      {btn.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Shortcuts Info */}
          <div className="calc-foot-adv">
            <span>
              <kbd>Enter</kbd> or <kbd>=</kbd> calculate
            </span>
            <span>
              <kbd>Esc</kbd> AC
            </span>
            <span>
              <kbd>⌫</kbd> DEL
            </span>
            <span>Chained operations retain answer</span>
          </div>
        </section>

        {/* Calculation History Sidebar */}
        <aside className="panel history-panel">
          <div className="section-title">
            <h3>Calculation history</h3>
            <div className="history-actions-row">
              {hist.length > 0 && (
                <button
                  className="icon-subtle-btn"
                  onClick={() => {
                    setHist([]);
                    localStorage.removeItem('mech-calc-history');
                    toast('History cleared');
                  }}
                  title="Clear history"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <History size={16} />
            </div>
          </div>
          <p>Recent calculations in this session.</p>

          <div className="history-scroll-list">
            {hist.length ? (
              hist.map((h, i) => {
                const parts = h.split(' = ');
                return (
                  <button
                    className="history-entry-btn"
                    key={i}
                    onClick={() => {
                      if (parts[1]) {
                        setExpr(parts[1]);
                        setAnswer(parts[1]);
                        setLastFormula(parts[0]);
                        setJustCalculated(true);
                        setLastAnsNum(Number(parts[1]));
                        toast(`Loaded ${parts[1]}`);
                      }
                    }}
                    title="Click to load into calculator"
                  >
                    <span className="history-formula">{parts[0]}</span>
                    <b className="history-answer">= {parts[1]}</b>
                  </button>
                );
              })
            ) : (
              <div className="history-empty">
                <History size={24} />
                <span>No calculations yet</span>
                <small>Calculations will appear here.</small>
              </div>
            )}
          </div>

          <div className="note-box">
            <Info size={15} />
            <span>
              Live evaluation previews output before pressing <kbd>=</kbd>. Chained operations
              automatically apply to your previous answer.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
