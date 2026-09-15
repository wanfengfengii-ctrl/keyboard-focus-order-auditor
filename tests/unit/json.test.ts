import { describe, expect, it } from 'vitest';
import { parseJson } from '../../src/lib/json';

describe('parseJson 与 JSON.parse 行为一致', () => {
  it.each([
    'null',
    'true',
    'false',
    '"text"',
    '"A\\n\\t\\""',
    '"😀"',
    '[1, 2, [3], {"a": null}]',
    '{"a": 1, "b": [true, false, null]}',
    '  { "x" : "y" }  ',
    '1.5',
    '-2.75e2',
  ])('解析 %s', (text) => {
    expect(parseJson(text)).toEqual(JSON.parse(text));
  });

  it('重复键取最后值', () => {
    expect(parseJson('{"a":1,"a":2}')).toEqual({ a: 2 });
  });

  it('__proto__ 作为普通自有属性', () => {
    const value = parseJson('{"__proto__": 1}');
    expect(Object.keys(value as object)).toEqual(['__proto__']);
  });

  it.each([
    '',
    ' ',
    '{',
    '[1,]',
    '{"a":1,}',
    '01',
    '1.',
    '.5',
    '-',
    'tru',
    '"abc',
    "{'a':1}",
    '1 2',
    '{} []',
    'NaN',
    'Infinity',
    '"\\x"',
    '"\t"',
  ])('拒绝 %s', (text) => {
    expect(() => parseJson(text)).toThrow(SyntaxError);
  });
});

describe('大整数精度', () => {
  it('超出安全范围的整数返回 BigInt 精确值', () => {
    expect(parseJson('9007199254740992')).toBe(9007199254740992n);
    expect(parseJson('9007199254740993')).toBe(9007199254740993n);
    expect(parseJson('-9007199254740993')).toBe(-9007199254740993n);
    expect(parseJson('123456789012345678901234567890')).toBe(
      123456789012345678901234567890n,
    );
  });

  it('安全范围内的整数仍是 number', () => {
    expect(parseJson('9007199254740991')).toBe(9007199254740991);
    expect(parseJson('-9007199254740991')).toBe(-9007199254740991);
    expect(parseJson('42')).toBe(42);
    expect(parseJson('-3')).toBe(-3);
  });

  it('指数与小数形式的整数同样保持精确', () => {
    expect(parseJson('1e30')).toBe(10n ** 30n);
    expect(parseJson('1.5e3')).toBe(1500);
    expect(parseJson('2.00')).toBe(2);
    expect(parseJson('100e-2')).toBe(1);
  });

  it('非整数仍是 number', () => {
    expect(parseJson('1.5')).toBe(1.5);
    expect(parseJson('0.001')).toBe(0.001);
    expect(parseJson('-0.5')).toBe(-0.5);
  });

  it('对象字段中的大整数保持精确', () => {
    const value = parseJson('{"tabindex": 9007199254740993}') as {
      tabindex: bigint;
    };
    expect(value.tabindex).toBe(9007199254740993n);
  });
});
