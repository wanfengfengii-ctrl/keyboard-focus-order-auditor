import { describe, expect, it } from 'vitest';
import { parseOrderDocument } from '../../src/lib/validate';

const validDoc = {
  elements: [
    { id: 'a', tabindex: 0, disabled: false, hidden: false },
    { id: 'b', tabindex: 1, disabled: false, hidden: false },
  ],
  expectedOrder: ['b', 'a'],
};

function parse(value: unknown) {
  return parseOrderDocument(typeof value === 'string' ? value : JSON.stringify(value));
}

function docWith(elements: unknown[], expectedOrder: unknown[] = []) {
  return { elements, expectedOrder };
}

describe('parseOrderDocument', () => {
  it('接受合法文档并原样返回', () => {
    const result = parse(validDoc);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.elements).toHaveLength(2);
      expect(result.doc.expectedOrder).toEqual(['b', 'a']);
    }
  });

  it('拒绝 JSON 语法错误', () => {
    expect(parse('{ invalid').ok).toBe(false);
    expect(parse('').ok).toBe(false);
    expect(parse('   ').ok).toBe(false);
  });

  it('拒绝非对象根节点', () => {
    expect(parse('[]').ok).toBe(false);
    expect(parse('"text"').ok).toBe(false);
    expect(parse('42').ok).toBe(false);
    expect(parse('null').ok).toBe(false);
  });

  it('根对象必须且仅含 elements 与 expectedOrder', () => {
    expect(parse({ ...validDoc, extra: 1 }).ok).toBe(false);
    expect(parse({ elements: validDoc.elements }).ok).toBe(false);
    expect(parse({ expectedOrder: validDoc.expectedOrder }).ok).toBe(false);
    expect(parse({}).ok).toBe(false);
  });

  it('elements 必须是数组', () => {
    expect(parse({ ...validDoc, elements: {} }).ok).toBe(false);
    expect(parse({ ...validDoc, elements: 'a' }).ok).toBe(false);
  });

  it('元素必须且仅含 id、tabindex、disabled、hidden 四个字段', () => {
    expect(
      parse(docWith([{ id: 'a', tabindex: 0, disabled: false }], ['a'])).ok,
    ).toBe(false);
    expect(
      parse(
        docWith(
          [{ id: 'a', tabindex: 0, disabled: false, hidden: false, name: 'x' }],
          ['a'],
        ),
      ).ok,
    ).toBe(false);
    expect(parse(docWith(['not-an-object'])).ok).toBe(false);
    expect(parse(docWith([null])).ok).toBe(false);
  });

  it('id 必须是非空字符串且唯一', () => {
    expect(
      parse(docWith([{ id: '', tabindex: 0, disabled: false, hidden: false }])).ok,
    ).toBe(false);
    expect(
      parse(docWith([{ id: 7, tabindex: 0, disabled: false, hidden: false }])).ok,
    ).toBe(false);
    expect(
      parse(
        docWith([
          { id: 'a', tabindex: 0, disabled: false, hidden: false },
          { id: 'a', tabindex: 1, disabled: false, hidden: false },
        ]),
      ).ok,
    ).toBe(false);
  });

  it('tabindex 必须是整数（含负整数），拒绝小数与非数值', () => {
    expect(
      parse(docWith([{ id: 'a', tabindex: 1.5, disabled: false, hidden: false }])).ok,
    ).toBe(false);
    expect(
      parse(docWith([{ id: 'a', tabindex: '0', disabled: false, hidden: false }])).ok,
    ).toBe(false);
    expect(
      parse(docWith([{ id: 'a', tabindex: -3, disabled: false, hidden: false }])).ok,
    ).toBe(true);
  });

  it('接受超出安全范围的大整数 tabindex 并保持精确值', () => {
    const text =
      '{"elements":[' +
      '{"id":"a","tabindex":9007199254740993,"disabled":false,"hidden":false},' +
      '{"id":"b","tabindex":-9007199254740993,"disabled":false,"hidden":false}' +
      '],"expectedOrder":["a","b"]}';
    const result = parseOrderDocument(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.elements[0].tabindex).toBe(9007199254740993n);
      expect(result.doc.elements[1].tabindex).toBe(-9007199254740993n);
    }
  });

  it('disabled 与 hidden 必须是布尔值', () => {
    expect(
      parse(docWith([{ id: 'a', tabindex: 0, disabled: 0, hidden: false }])).ok,
    ).toBe(false);
    expect(
      parse(docWith([{ id: 'a', tabindex: 0, disabled: false, hidden: 'no' }])).ok,
    ).toBe(false);
  });

  it('expectedOrder 必须是数组', () => {
    expect(parse({ ...validDoc, expectedOrder: 'a' }).ok).toBe(false);
    expect(parse({ ...validDoc, expectedOrder: null }).ok).toBe(false);
  });

  it('expectedOrder 不允许重复项', () => {
    expect(parse({ ...validDoc, expectedOrder: ['a', 'a'] }).ok).toBe(false);
  });

  it('expectedOrder 每项必须是引用 elements 的字符串', () => {
    expect(parse({ ...validDoc, expectedOrder: ['ghost'] }).ok).toBe(false);
    expect(parse({ ...validDoc, expectedOrder: [1] }).ok).toBe(false);
    expect(parse({ ...validDoc, expectedOrder: [null] }).ok).toBe(false);
  });

  it('允许空 elements 与空 expectedOrder', () => {
    expect(parse(docWith([], [])).ok).toBe(true);
  });

  it('expectedOrder 可以是 elements 的子集', () => {
    expect(parse({ ...validDoc, expectedOrder: ['a'] }).ok).toBe(true);
  });
});
