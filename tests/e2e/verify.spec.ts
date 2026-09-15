import { expect, test, type Page } from '@playwright/test';

// 覆盖排除（disabled/hidden/负 tabindex）、正 tabindex 升序、0 值殿后的完整场景。
const matchingDoc = {
  elements: [
    { id: 'username', tabindex: 0, disabled: false, hidden: false },
    { id: 'submit', tabindex: 2, disabled: false, hidden: false },
    { id: 'cancel', tabindex: 1, disabled: false, hidden: false },
    { id: 'legacy', tabindex: 0, disabled: true, hidden: false },
    { id: 'draft', tabindex: -1, disabled: false, hidden: false },
    { id: 'ghost', tabindex: 0, disabled: false, hidden: true },
  ],
  expectedOrder: ['cancel', 'submit', 'username'],
};

async function pasteAndVerify(page: Page, doc: unknown) {
  await page
    .getByLabel('JSON 文档')
    .fill(typeof doc === 'string' ? doc : JSON.stringify(doc));
  await page.getByRole('button', { name: '核验' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('合法文档且顺序一致：展示完整实际序列并判定一致', async ({ page }) => {
  await pasteAndVerify(page, matchingDoc);
  await expect(page.getByTestId('actual-order').locator('li')).toHaveText([
    'cancel',
    'submit',
    'username',
  ]);
  await expect(page.getByTestId('conclusion')).toHaveText('一致');
  // 一致时不渲染差异导航。
  await expect(page.getByTestId('diff-nav')).toHaveCount(0);
});

test('合法文档但顺序不符：判定不一致', async ({ page }) => {
  await pasteAndVerify(page, {
    ...matchingDoc,
    expectedOrder: ['username', 'cancel', 'submit'],
  });
  await expect(page.getByTestId('actual-order').locator('li')).toHaveText([
    'cancel',
    'submit',
    'username',
  ]);
  await expect(page.getByTestId('conclusion')).toHaveText('不一致');
});

test('不一致时按位置展示差异详情，首尾按钮分别不可用', async ({ page }) => {
  await pasteAndVerify(page, {
    ...matchingDoc,
    expectedOrder: ['username', 'cancel', 'submit'],
  });

  const detail = page.getByTestId('diff-detail');
  const prev = page.getByTestId('diff-prev');
  const next = page.getByTestId('diff-next');

  // 核验后定位在第一处差异（位置 1，1/3）。
  await expect(detail).toContainText('第 1 处差异');
  await expect(detail).toContainText('（1/3）');
  await expect(page.getByTestId('diff-expected')).toHaveText('username');
  await expect(page.getByTestId('diff-actual')).toHaveText('cancel');
  await expect(prev).toBeDisabled();
  await expect(next).toBeEnabled();

  // 下一处：位置 2。
  await next.click();
  await expect(detail).toContainText('第 2 处差异');
  await expect(detail).toContainText('（2/3）');
  await expect(page.getByTestId('diff-expected')).toHaveText('cancel');
  await expect(page.getByTestId('diff-actual')).toHaveText('submit');
  await expect(prev).toBeEnabled();
  await expect(next).toBeEnabled();

  // 末处：下一处不可用。
  await next.click();
  await expect(detail).toContainText('第 3 处差异');
  await expect(detail).toContainText('（3/3）');
  await expect(page.getByTestId('diff-expected')).toHaveText('submit');
  await expect(page.getByTestId('diff-actual')).toHaveText('username');
  await expect(next).toBeDisabled();

  // 上一处回到第二处。
  await prev.click();
  await expect(detail).toContainText('（2/3）');
  await expect(next).toBeEnabled();
});

test('长度差：期望侧缺项显示无对应元素', async ({ page }) => {
  // expectedOrder 只覆盖部分元素时，实际序列更长：位置 2、3 的期望侧缺项。
  await pasteAndVerify(page, { ...matchingDoc, expectedOrder: ['cancel'] });
  await expect(page.getByTestId('conclusion')).toHaveText('不一致');
  await expect(page.getByTestId('diff-detail')).toContainText('第 2 处差异');
  await expect(page.getByTestId('diff-expected')).toHaveText('无对应元素');
  await expect(page.getByTestId('diff-actual')).toHaveText('submit');

  await page.getByTestId('diff-next').click();
  await expect(page.getByTestId('diff-expected')).toHaveText('无对应元素');
  await expect(page.getByTestId('diff-actual')).toHaveText('username');
  await expect(page.getByTestId('diff-next')).toBeDisabled();
});

test('长度差：实际侧缺项显示无对应元素', async ({ page }) => {
  // 期望引用被排除的 legacy：实际序列更短，仅位置 4 不一致，实际侧缺项。
  await pasteAndVerify(page, {
    ...matchingDoc,
    expectedOrder: ['cancel', 'submit', 'username', 'legacy'],
  });
  await expect(page.getByTestId('conclusion')).toHaveText('不一致');
  // 只有一处差异（位置 4），首尾按钮均不可用。
  await expect(page.getByTestId('diff-detail')).toContainText('第 4 处差异');
  await expect(page.getByTestId('diff-detail')).toContainText('（1/1）');
  await expect(page.getByTestId('diff-expected')).toHaveText('legacy');
  await expect(page.getByTestId('diff-actual')).toHaveText('无对应元素');
  await expect(page.getByTestId('diff-prev')).toBeDisabled();
  await expect(page.getByTestId('diff-next')).toBeDisabled();
});

test('重新核验合法文档时差异导航回到第一处', async ({ page }) => {
  await pasteAndVerify(page, {
    ...matchingDoc,
    expectedOrder: ['username', 'cancel', 'submit'],
  });
  await page.getByTestId('diff-next').click();
  await expect(page.getByTestId('diff-detail')).toContainText('（2/3）');

  // 换成另一份不一致文档（实际更长，差异从位置 2 开始）。
  await pasteAndVerify(page, { ...matchingDoc, expectedOrder: ['cancel'] });
  await expect(page.getByTestId('diff-detail')).toContainText('第 2 处差异');
  await expect(page.getByTestId('diff-detail')).toContainText('（1/2）');
  await expect(page.getByTestId('diff-prev')).toBeDisabled();
  await expect(page.getByTestId('diff-expected')).toHaveText('无对应元素');
  await expect(page.getByTestId('diff-actual')).toHaveText('submit');
});

test('不一致核验 → 切换差异 → 非法文档清空全部旧结果', async ({ page }) => {
  await pasteAndVerify(page, {
    ...matchingDoc,
    expectedOrder: ['username', 'cancel', 'submit'],
  });
  await expect(page.getByTestId('conclusion')).toHaveText('不一致');
  await page.getByTestId('diff-next').click();
  await expect(page.getByTestId('diff-detail')).toContainText('（2/3）');

  // 改为非法文档后：只剩“文档无效”，旧序列、结论与差异详情一并清空。
  await pasteAndVerify(page, '{ not valid json');
  await expect(page.getByTestId('invalid-message')).toHaveText('文档无效');
  await expect(page.getByTestId('actual-order')).toHaveCount(0);
  await expect(page.getByTestId('conclusion')).toHaveCount(0);
  await expect(page.getByTestId('diff-nav')).toHaveCount(0);
});

test('非法文档：仅显示文档无效并清空旧结果', async ({ page }) => {
  await pasteAndVerify(page, matchingDoc);
  await expect(page.getByTestId('conclusion')).toHaveText('一致');

  await pasteAndVerify(page, '{ not valid json');
  await expect(page.getByTestId('invalid-message')).toHaveText('文档无效');
  await expect(page.getByTestId('actual-order')).toHaveCount(0);
  await expect(page.getByTestId('conclusion')).toHaveCount(0);
  await expect(page.getByTestId('diff-nav')).toHaveCount(0);
});

test('引用未知 id 的文档同样无效', async ({ page }) => {
  await pasteAndVerify(page, { ...matchingDoc, expectedOrder: ['nobody'] });
  await expect(page.getByTestId('invalid-message')).toHaveText('文档无效');
  await expect(page.getByTestId('actual-order')).toHaveCount(0);
});

test('超出安全范围的大整数 tabindex 按精确值排序', async ({ page }) => {
  // 9007199254740992 与 9007199254740993 在双精度浮点下相等，
  // 页面必须区分二者并给出升序结果。
  const raw = `{
    "elements": [
      { "id": "b", "tabindex": 9007199254740993, "disabled": false, "hidden": false },
      { "id": "a", "tabindex": 9007199254740992, "disabled": false, "hidden": false },
      { "id": "z", "tabindex": 0, "disabled": false, "hidden": false }
    ],
    "expectedOrder": ["a", "b", "z"]
  }`;
  await pasteAndVerify(page, raw);
  await expect(page.getByTestId('actual-order').locator('li')).toHaveText(['a', 'b', 'z']);
  await expect(page.getByTestId('conclusion')).toHaveText('一致');
});
