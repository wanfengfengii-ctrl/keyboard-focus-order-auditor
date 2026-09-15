import { computeActualOrder } from './order';
import type { ElementItem } from './validate';

/** 一侧序列长度不足、该位置没有对应元素时使用的展示标记。 */
export const MISSING_ELEMENT_MARKER = '无对应元素';

export interface PositionDifference {
  /** 差异在序列中的位置，从 1 开始。 */
  position: number;
  /** 该位置的期望 id；期望序列长度不足时为 null。 */
  expected: string | null;
  /** 该位置的实际 id；实际序列长度不足时为 null。 */
  actual: string | null;
}

export interface OrderComparison {
  /** 期望序列（原样保留，驱动完整序列展示）。 */
  expected: string[];
  /** 实际序列（原样保留，驱动完整序列展示）。 */
  actual: string[];
  /** 一致 / 不一致结论：当且仅当 differences 为空时为 true。 */
  matches: boolean;
  /** 按位置排列的全部差异，供差异导航逐项复核。 */
  differences: PositionDifference[];
}

/**
 * 差异计算契约：按位置逐项比对期望序列与实际序列。
 * 任一侧因长度不足而缺项时，该侧记为 null（界面展示为“无对应元素”）。
 * 完整序列、“一致 / 不一致”结论与差异列表均由返回的同一结果驱动。
 */
export function compareOrders(expected: string[], actual: string[]): OrderComparison {
  const length = Math.max(expected.length, actual.length);
  const differences: PositionDifference[] = [];
  for (let i = 0; i < length; i++) {
    const expectedId = i < expected.length ? expected[i] : null;
    const actualId = i < actual.length ? actual[i] : null;
    if (expectedId !== actualId) {
      differences.push({ position: i + 1, expected: expectedId, actual: actualId });
    }
  }
  return {
    expected,
    actual,
    matches: differences.length === 0,
    differences,
  };
}

/** 从合法文档推导实际序列，并与 expectedOrder 逐项比对的便捷入口。 */
export function compareDocument(doc: {
  elements: ElementItem[];
  expectedOrder: string[];
}): OrderComparison {
  return compareOrders(doc.expectedOrder, computeActualOrder(doc.elements));
}
