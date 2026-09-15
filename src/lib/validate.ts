import { parseJson } from './json';

export interface ElementItem {
  id: string;
  /** 整数；超出 Number 安全整数范围时为 BigInt，保证精确可比。 */
  tabindex: number | bigint;
  disabled: boolean;
  hidden: boolean;
}

export interface OrderDocument {
  elements: ElementItem[];
  expectedOrder: string[];
}

export type ParseResult = { ok: true; doc: OrderDocument } | { ok: false };

const ROOT_KEYS = ['elements', 'expectedOrder'] as const;
const ELEMENT_KEYS = ['id', 'tabindex', 'disabled', 'hidden'] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return (
    actual.length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

/**
 * 解析并校验粘贴的 JSON 文本。
 * 任一语法、字段、类型、唯一性或引用检查失败都返回 { ok: false }，
 * 不携带错误细节——页面只需据此显示“文档无效”。
 */
export function parseOrderDocument(text: string): ParseResult {
  let data: unknown;
  try {
    data = parseJson(text);
  } catch {
    return { ok: false };
  }

  if (!isPlainObject(data) || !hasExactKeys(data, ROOT_KEYS)) {
    return { ok: false };
  }

  const { elements, expectedOrder } = data;

  if (!Array.isArray(elements)) {
    return { ok: false };
  }

  const ids = new Set<string>();
  for (const item of elements) {
    if (!isPlainObject(item) || !hasExactKeys(item, ELEMENT_KEYS)) {
      return { ok: false };
    }
    const { id, tabindex, disabled, hidden } = item;
    if (typeof id !== 'string' || id.length === 0 || ids.has(id)) {
      return { ok: false };
    }
    const isIntegerTabindex =
      typeof tabindex === 'bigint' ||
      (typeof tabindex === 'number' && Number.isInteger(tabindex));
    if (!isIntegerTabindex) {
      return { ok: false };
    }
    if (typeof disabled !== 'boolean' || typeof hidden !== 'boolean') {
      return { ok: false };
    }
    ids.add(id);
  }

  if (!Array.isArray(expectedOrder)) {
    return { ok: false };
  }
  const expectedIds = new Set<string>();
  for (const item of expectedOrder) {
    if (typeof item !== 'string' || expectedIds.has(item) || !ids.has(item)) {
      return { ok: false };
    }
    expectedIds.add(item);
  }

  return {
    ok: true,
    doc: {
      elements: elements as unknown as ElementItem[],
      expectedOrder: expectedOrder as string[],
    },
  };
}
