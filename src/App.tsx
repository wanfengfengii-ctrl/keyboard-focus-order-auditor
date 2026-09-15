import { useState } from 'react';
import { parseOrderDocument } from './lib/validate';
import {
  compareDocument,
  MISSING_ELEMENT_MARKER,
  type OrderComparison,
} from './lib/diff';

type Result =
  | { kind: 'idle' }
  | { kind: 'invalid' }
  | { kind: 'valid'; comparison: OrderComparison };

export default function App() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<Result>({ kind: 'idle' });
  const [diffIndex, setDiffIndex] = useState(0);

  const handleVerify = () => {
    const parsed = parseOrderDocument(text);
    if (!parsed.ok) {
      // 任一检查失败：仅显示“文档无效”，并清空旧序列、结论与差异详情。
      setResult({ kind: 'invalid' });
      setDiffIndex(0);
      return;
    }
    // 完整序列、结论与差异列表全部由同一份比对结果驱动。
    setResult({ kind: 'valid', comparison: compareDocument(parsed.doc) });
    // 每次（重新）核验合法文档，差异导航都回到第一处。
    setDiffIndex(0);
  };

  const differences =
    result.kind === 'valid' ? result.comparison.differences : [];
  const currentDiff = differences[diffIndex];

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
            {result.comparison.actual.length > 0 ? (
              <ol data-testid="actual-order">
                {result.comparison.actual.map((id) => (
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
              className={result.comparison.matches ? 'match' : 'mismatch'}
            >
              {result.comparison.matches ? '一致' : '不一致'}
            </p>

            {!result.comparison.matches && currentDiff && (
              <div className="diff-nav" data-testid="diff-nav">
                <p className="diff-detail" data-testid="diff-detail">
                  第 {currentDiff.position} 处差异：
                  期望
                  <code data-testid="diff-expected">
                    {currentDiff.expected ?? MISSING_ELEMENT_MARKER}
                  </code>
                  ，实际
                  <code data-testid="diff-actual">
                    {currentDiff.actual ?? MISSING_ELEMENT_MARKER}
                  </code>
                  （{diffIndex + 1}/{differences.length}）
                </p>
                <div className="diff-actions">
                  <button
                    type="button"
                    className="secondary"
                    data-testid="diff-prev"
                    disabled={diffIndex === 0}
                    onClick={() => setDiffIndex((index) => Math.max(0, index - 1))}
                  >
                    上一处
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    data-testid="diff-next"
                    disabled={diffIndex === differences.length - 1}
                    onClick={() =>
                      setDiffIndex((index) =>
                        Math.min(differences.length - 1, index + 1),
                      )
                    }
                  >
                    下一处
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
