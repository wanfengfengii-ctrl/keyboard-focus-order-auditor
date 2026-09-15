import { useState } from 'react';
import { parseOrderDocument } from './lib/validate';
import { computeActualOrder } from './lib/order';

type Result =
  | { kind: 'idle' }
  | { kind: 'invalid' }
  | { kind: 'valid'; actual: string[]; matches: boolean };

export default function App() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<Result>({ kind: 'idle' });

  const handleVerify = () => {
    const parsed = parseOrderDocument(text);
    if (!parsed.ok) {
      // 任一检查失败：仅显示“文档无效”，并清空旧结果。
      setResult({ kind: 'invalid' });
      return;
    }
    const actual = computeActualOrder(parsed.doc.elements);
    const expected = parsed.doc.expectedOrder;
    const matches =
      actual.length === expected.length &&
      actual.every((id, index) => id === expected[index]);
    setResult({ kind: 'valid', actual, matches });
  };

  return (
    <main className="container">
      <h1>键盘顺序核验</h1>
      <p className="hint">
        粘贴包含 <code>elements</code> 与 <code>expectedOrder</code> 的 JSON
        文档，点击“核验”查看实际序列与结论。
      </p>

      <label htmlFor="json-input">JSON 文档</label>
      <textarea
        id="json-input"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={14}
        spellCheck={false}
        placeholder='{"elements":[{"id":"a","tabindex":0,"disabled":false,"hidden":false}],"expectedOrder":["a"]}'
      />
      <button type="button" onClick={handleVerify}>
        核验
      </button>

      <section aria-live="polite" className="result">
        {result.kind === 'invalid' && (
          <p role="alert" className="invalid" data-testid="invalid-message">
            文档无效
          </p>
        )}
        {result.kind === 'valid' && (
          <>
            <h2>实际序列</h2>
            {result.actual.length > 0 ? (
              <ol data-testid="actual-order">
                {result.actual.map((id) => (
                  <li key={id}>
                    <code>{id}</code>
                  </li>
                ))}
              </ol>
            ) : (
              <p data-testid="actual-order">（空）</p>
            )}
            <p
              data-testid="conclusion"
              className={result.matches ? 'match' : 'mismatch'}
            >
              {result.matches ? '一致' : '不一致'}
            </p>
          </>
        )}
      </section>
    </main>
  );
}
