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

test('非法文档：仅显示文档无效并清空旧结果', async ({ page }) => {
  await pasteAndVerify(page, matchingDoc);
  await expect(page.getByTestId('conclusion')).toHaveText('一致');

  await pasteAndVerify(page, '{ not valid json');
  await expect(page.getByTestId('invalid-message')).toHaveText('文档无效');
  await expect(page.getByTestId('actual-order')).toHaveCount(0);
  await expect(page.getByTestId('conclusion')).toHaveCount(0);
});

test('引用未知 id 的文档同样无效', async ({ page }) => {
  await pasteAndVerify(page, { ...matchingDoc, expectedOrder: ['nobody'] });
  await expect(page.getByTestId('invalid-message')).toHaveText('文档无效');
  await expect(page.getByTestId('actual-order')).toHaveCount(0);
});
