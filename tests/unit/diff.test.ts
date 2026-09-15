import { describe, expect, it } from 'vitest';
import {
  MISSING_ELEMENT_MARKER,
  compareDocument,
  compareOrders,
} from '../../src/lib/diff';
import { parseOrderDocument } from '../../src/lib/validate';

describe('compareOrders', () => {
  it('完全一致时没有差异并判定一致', () => {
    const result = compareOrders(['a', 'b', 'c'], ['a', 'b', 'c']);
    expect(result.matches).toBe(true);
    expect(result.differences).toEqual([]);
    // 完整序列仍由同一结果保留。
    expect(result.expected).toEqual(['a', 'b', 'c']);
    expect(result.actual).toEqual(['a', 'b', 'c']);
  });

  it('位置错位：按位置记录每一处期望与实际，结论为不一致', () => {
    const result = compareOrders(
      ['x', 'y', 'z'],
      ['y', 'x', 'z'],
    );
    expect(result.matches).toBe(false);
    expect(result.differences).toEqual([
      { position: 1, expected: 'x', actual: 'y' },
      { position: 2, expected: 'y', actual: 'x' },
    ]);
  });

  it('实际序列更长：多出的位置期望侧为 null（无对应元素）', () => {
    const result = compareOrders(['a'], ['a', 'b', 'c']);
    expect(result.matches).toBe(false);
    expect(result.differences).toEqual([
      { position: 2, expected: null, actual: 'b' },
      { position: 3, expected: null, actual: 'c' },
    ]);
  });

  it('期望序列更长：多出的位置实际侧为 null（无对应元素）', () => {
    const result = compareOrders(['a', 'b', 'c'], ['a']);
    expect(result.matches).toBe(false);
    expect(result.differences).toEqual([
      { position: 2, expected: 'b', actual: null },
      { position: 3, expected: 'c', actual: null },
    ]);
  });

  it('空实际序列对非空期望：每个位置的实际侧都缺项', () => {
    const result = compareOrders(['a', 'b'], []);
    expect(result.matches).toBe(false);
    expect(result.actual).toEqual([]);
    expect(result.differences).toEqual([
      { position: 1, expected: 'a', actual: null },
      { position: 2, expected: 'b', actual: null },
    ]);
  });

  it('两侧均为空序列时判定一致', () => {
    const result = compareOrders([], []);
    expect(result.matches).toBe(true);
    expect(result.differences).toEqual([]);
  });

  it('差异位置严格递增，重复计算结果稳定', () => {
    const expected = ['a', 'b', 'c', 'd'];
    const actual = ['b', 'a', 'c', 'e'];
    const first = compareOrders(expected, actual);
    const second = compareOrders(expected, actual);
    expect(second).toEqual(first);
    const positions = first.differences.map((diff) => diff.position);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('缺项标记为固定文案，供界面直接展示', () => {
    expect(MISSING_ELEMENT_MARKER).toBe('无对应元素');
  });

  it('与合法两字段文档集成：推导实际序列后按位置比对', () => {
    const text =
      '{"elements":[' +
      '{"id":"username","tabindex":0,"disabled":false,"hidden":false},' +
      '{"id":"submit","tabindex":2,"disabled":false,"hidden":false},' +
      '{"id":"cancel","tabindex":1,"disabled":false,"hidden":false}' +
      '],"expectedOrder":["username","cancel","submit"]}';
    const parsed = parseOrderDocument(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const result = compareDocument(parsed.doc);
      expect(result.actual).toEqual(['cancel', 'submit', 'username']);
      expect(result.matches).toBe(false);
      expect(result.differences).toEqual([
        { position: 1, expected: 'username', actual: 'cancel' },
        { position: 2, expected: 'cancel', actual: 'submit' },
        { position: 3, expected: 'submit', actual: 'username' },
      ]);
    }
  });
});
