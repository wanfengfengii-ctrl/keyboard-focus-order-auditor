/**
 * 精确 JSON 解析器：语法行为与 JSON.parse 一致，但整数字面量超出
 * Number 安全整数范围（±2^53−1）时返回 BigInt，保证大整数 tabindex
 * 不因浮点精度丢失而被误判为相同。语法错误抛出 SyntaxError。
 */

export type JsonValue =
  | string
  | number
  | bigint
  | boolean
  | null
  | JsonValue[]
  | JsonObject;

export interface JsonObject {
  [key: string]: JsonValue;
}

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE = BigInt(Number.MIN_SAFE_INTEGER);
// 防御性上限：精确整数位数超过此值时拒绝解析，避免超大指数耗尽内存。
const MAX_EXACT_DIGITS = 1_000_000;

const NUMBER_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/;
const LITERAL_RE = /^(-?)(0|[1-9]\d*)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/;

export function parseJson(text: string): JsonValue {
  return new JsonParser(text).parse();
}

/** 将数字字面量转换为 number；精确整数值超出安全范围时返回 BigInt。 */
export function numberFromLiteral(raw: string): number | bigint {
  const match = LITERAL_RE.exec(raw);
  if (!match) {
    return Number(raw);
  }
  const [, sign, intPart, fracPart = '', expPart] = match;
  const digits = (intPart + fracPart).replace(/^0+/, '') || '0';
  const exponent = (expPart === undefined ? 0 : Number(expPart)) - fracPart.length;
  const exact = exactIntegerValue(sign, digits, exponent);
  if (exact === null) {
    // 非整数：精度无关紧要，后续整数校验会拒绝。
    return Number(raw);
  }
  if (exact >= MIN_SAFE && exact <= MAX_SAFE) {
    return Number(exact);
  }
  return exact;
}

/** 计算 ±digits × 10^exponent 的精确值；结果非整数时返回 null。 */
function exactIntegerValue(sign: string, digits: string, exponent: number): bigint | null {
  if (digits === '0') {
    return 0n;
  }
  let intDigits: string;
  if (exponent >= 0) {
    if (digits.length + exponent > MAX_EXACT_DIGITS) {
      throw new SyntaxError('数字过大，超出可精确表示的范围');
    }
    intDigits = digits + '0'.repeat(exponent);
  } else {
    const cut = digits.length + exponent;
    if (cut <= 0 || /[^0]/.test(digits.slice(cut))) {
      return null;
    }
    intDigits = digits.slice(0, cut);
  }
  return BigInt((sign === '-' ? '-' : '') + intDigits);
}

class JsonParser {
  private pos = 0;

  constructor(private readonly text: string) {}

  parse(): JsonValue {
    const value = this.parseValue();
    this.skipWhitespace();
    if (this.pos !== this.text.length) {
      throw new SyntaxError('JSON 文本存在多余内容');
    }
    return value;
  }

  private current(): string {
    return this.text[this.pos];
  }

  private skipWhitespace(): void {
    let ch = this.text[this.pos];
    while (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      this.pos++;
      ch = this.text[this.pos];
    }
  }

  private parseValue(): JsonValue {
    this.skipWhitespace();
    const ch = this.current();
    if (ch === '{') return this.parseObject();
    if (ch === '[') return this.parseArray();
    if (ch === '"') return this.parseString();
    if (ch === 't') return this.parseKeyword('true', true);
    if (ch === 'f') return this.parseKeyword('false', false);
    if (ch === 'n') return this.parseKeyword('null', null);
    if (ch === '-' || (ch >= '0' && ch <= '9')) return this.parseNumber();
    throw new SyntaxError('JSON 语法错误');
  }

  private parseKeyword(keyword: string, value: JsonValue): JsonValue {
    if (!this.text.startsWith(keyword, this.pos)) {
      throw new SyntaxError('JSON 语法错误');
    }
    this.pos += keyword.length;
    return value;
  }

  private parseObject(): JsonObject {
    this.pos++; // 消耗 {
    // 无原型对象：让 "__proto__" 成为普通自有属性，与 JSON.parse 一致。
    const obj: JsonObject = Object.create(null) as JsonObject;
    this.skipWhitespace();
    if (this.current() === '}') {
      this.pos++;
      return obj;
    }
    for (;;) {
      this.skipWhitespace();
      if (this.current() !== '"') {
        throw new SyntaxError('对象键必须是字符串');
      }
      const key = this.parseString();
      this.skipWhitespace();
      if (this.current() !== ':') {
        throw new SyntaxError('对象键后缺少冒号');
      }
      this.pos++;
      obj[key] = this.parseValue();
      this.skipWhitespace();
      const ch = this.current();
      if (ch === ',') {
        this.pos++;
      } else if (ch === '}') {
        this.pos++;
        return obj;
      } else {
        throw new SyntaxError('对象缺少逗号或右花括号');
      }
    }
  }

  private parseArray(): JsonValue[] {
    this.pos++; // 消耗 [
    const arr: JsonValue[] = [];
    this.skipWhitespace();
    if (this.current() === ']') {
      this.pos++;
      return arr;
    }
    for (;;) {
      arr.push(this.parseValue());
      this.skipWhitespace();
      const ch = this.current();
      if (ch === ',') {
        this.pos++;
      } else if (ch === ']') {
        this.pos++;
        return arr;
      } else {
        throw new SyntaxError('数组缺少逗号或右方括号');
      }
    }
  }

  private parseString(): string {
    this.pos++; // 消耗 "
    let result = '';
    for (;;) {
      if (this.pos >= this.text.length) {
        throw new SyntaxError('字符串未闭合');
      }
      const ch = this.text[this.pos];
      if (ch === '"') {
        this.pos++;
        return result;
      }
      if (ch === '\\') {
        result += this.parseEscape();
        continue;
      }
      if (ch < ' ') {
        throw new SyntaxError('字符串中包含控制字符');
      }
      result += ch;
      this.pos++;
    }
  }

  private parseEscape(): string {
    this.pos++; // 消耗反斜杠
    const esc = this.text[this.pos];
    this.pos++;
    switch (esc) {
      case '"':
        return '"';
      case '\\':
        return '\\';
      case '/':
        return '/';
      case 'b':
        return '\b';
      case 'f':
        return '\f';
      case 'n':
        return '\n';
      case 'r':
        return '\r';
      case 't':
        return '\t';
      case 'u':
        return this.parseUnicodeEscape();
      default:
        throw new SyntaxError('非法转义字符');
    }
  }

  private parseUnicodeEscape(): string {
    const hex = this.text.slice(this.pos, this.pos + 4);
    if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
      throw new SyntaxError('非法 unicode 转义');
    }
    this.pos += 4;
    const high = parseInt(hex, 16);
    if (
      high >= 0xd800 &&
      high <= 0xdbff &&
      this.text[this.pos] === '\\' &&
      this.text[this.pos + 1] === 'u'
    ) {
      const lowHex = this.text.slice(this.pos + 2, this.pos + 6);
      if (/^[0-9a-fA-F]{4}$/.test(lowHex)) {
        const low = parseInt(lowHex, 16);
        if (low >= 0xdc00 && low <= 0xdfff) {
          this.pos += 6;
          return String.fromCodePoint(0x10000 + ((high - 0xd800) << 10) + (low - 0xdc00));
        }
      }
    }
    // 孤立代理：与 JSON.parse 一样原样保留。
    return String.fromCharCode(high);
  }

  private parseNumber(): number | bigint {
    const match = NUMBER_RE.exec(this.text.slice(this.pos));
    if (!match) {
      throw new SyntaxError('数字格式错误');
    }
    this.pos += match[0].length;
    return numberFromLiteral(match[0]);
  }
}
