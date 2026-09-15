import type { ElementItem } from './validate';

/**
 * 按浏览器 Tab 顺序规则推导实际序列：
 * 1. 排除 disabled、hidden 或 tabindex < 0 的元素；
 * 2. tabindex > 0 的元素按数值升序，同值保持 DOM 原顺序（稳定排序）；
 * 3. tabindex === 0 的元素随后，保持 DOM 原顺序。
 *
 * tabindex 统一归一为 BigInt 比较，超出安全整数范围的大整数按精确值排序。
 */
export function computeActualOrder(elements: ElementItem[]): string[] {
  const entries = elements
    .filter((el) => !el.disabled && !el.hidden)
    .map((el) => ({ id: el.id, tab: toBigInt(el.tabindex) }))
    .filter((entry) => entry.tab >= 0n);

  const positive = entries.filter((entry) => entry.tab > 0n);
  // Array.prototype.sort 自 ES2019 起保证稳定，同值元素保持原顺序。
  positive.sort((a, b) => (a.tab < b.tab ? -1 : a.tab > b.tab ? 1 : 0));

  const zero = entries.filter((entry) => entry.tab === 0n);
  return [...positive, ...zero].map((entry) => entry.id);
}

function toBigInt(tabindex: number | bigint): bigint {
  // number 必经校验为整数，BigInt() 转换无损。
  return typeof tabindex === 'bigint' ? tabindex : BigInt(tabindex);
}
