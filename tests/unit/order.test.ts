import { describe, expect, it } from 'vitest';
import { computeActualOrder } from '../../src/lib/order';
import { parseOrderDocument } from '../../src/lib/validate';
import type { ElementItem } from '../../src/lib/validate';

function el(
  id: string,
  tabindex: number | bigint,
  overrides: Partial<ElementItem> = {},
): ElementItem {
  return { id, tabindex, disabled: false, hidden: false, ...overrides };
}

describe('computeActualOrder', () => {
  it('排除 disabled、hidden 与 tabindex < 0 的元素', () => {
    const elements = [
      el('keep', 0),
      el('by-disabled', 0, { disabled: true }),
      el('by-hidden', 0, { hidden: true }),
      el('by-negative', -1),
    ];
    expect(computeActualOrder(elements)).toEqual(['keep']);
  });

  it('正 tabindex 按数值升序，同值保持原顺序', () => {
    const elements = [el('a', 3), el('b', 1), el('c', 3), el('d', 1)];
    expect(computeActualOrder(elements)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('tabindex 为 0 的元素排在正数之后并保持原顺序', () => {
    const elements = [el('z1', 0), el('p5', 5), el('z2', 0), el('p1', 1)];
    expect(computeActualOrder(elements)).toEqual(['p1', 'p5', 'z1', 'z2']);
  });

  it('混合场景：排除与排序同时生效', () => {
    const elements = [
      el('zero-1', 0),
      el('pos-2a', 2),
      el('skip-neg', -5),
      el('pos-1', 1),
      el('skip-disabled', 1, { disabled: true }),
      el('pos-2b', 2),
      el('zero-2', 0),
      el('skip-hidden', 0, { hidden: true }),
    ];
    expect(computeActualOrder(elements)).toEqual([
      'pos-1',
      'pos-2a',
      'pos-2b',
      'zero-1',
      'zero-2',
    ]);
  });

  it('全部被排除时返回空数组', () => {
    const elements = [el('a', -1), el('b', 0, { disabled: true })];
    expect(computeActualOrder(elements)).toEqual([]);
  });

  it('空 elements 返回空数组', () => {
    expect(computeActualOrder([])).toEqual([]);
  });

  it('超出安全范围的大整数按精确值排序，不会被当成相同', () => {
    const elements = [
      el('big-2', 9007199254740993n),
      el('big-1', 9007199254740992n),
      el('small', 1),
    ];
    expect(computeActualOrder(elements)).toEqual(['small', 'big-1', 'big-2']);
  });

  it('number 与 bigint 混合时按数值统一排序', () => {
    const elements = [el('a', 5n), el('b', 2), el('c', 3n), el('d', 0)];
    expect(computeActualOrder(elements)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('回归：JSON 文本中的大整数 tabindex 保持互不相同', () => {
    // 9007199254740992 与 9007199254740993 在 IEEE 754 双精度下相等，
    // 精确解析后必须区分为两个不同的值。
    const text =
      '{"elements":[' +
      '{"id":"b","tabindex":9007199254740993,"disabled":false,"hidden":false},' +
      '{"id":"a","tabindex":9007199254740992,"disabled":false,"hidden":false}' +
      '],"expectedOrder":["a","b"]}';
    const parsed = parseOrderDocument(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(computeActualOrder(parsed.doc.elements)).toEqual(['a', 'b']);
    }
  });
});
