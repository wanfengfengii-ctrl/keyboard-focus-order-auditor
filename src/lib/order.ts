import type { ElementItem } from './validate';

/**
 * 按浏览器 Tab 顺序规则推导实际序列：
 * 1. 排除 disabled、hidden 或 tabindex < 0 的元素；
 * 2. tabindex > 0 的元素按数值升序，同值保持 DOM 原顺序（稳定排序）；
 * 3. tabindex === 0 的元素随后，保持 DOM 原顺序。
 */
export function computeActualOrder(elements: ElementItem[]): string[] {
  const focusable = elements.filter((el) => !el.disabled && !el.hidden && el.tabindex >= 0);
  const positive = focusable.filter((el) => el.tabindex > 0);
  // Array.prototype.sort 自 ES2019 起保证稳定，同值元素保持原顺序。
  positive.sort((a, b) => a.tabindex - b.tabindex);
  const zero = focusable.filter((el) => el.tabindex === 0);
  return [...positive, ...zero].map((el) => el.id);
}
