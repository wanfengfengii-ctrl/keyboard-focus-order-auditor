# 键盘顺序核验（tab-order-verifier）

离线单页 React 应用：无障碍验收员粘贴视觉稿导出的 JSON 文档，页面按浏览器
Tab 顺序规则推导实际序列，并与稿面 `expectedOrder` 逐项比对，给出
“一致 / 不一致”结论。无任何外部资源依赖，构建产物为纯静态文件。

## 启动

### Docker（推荐）

```bash
docker compose up --build web        # 默认 http://localhost:8080
WEB_PORT=9000 docker compose up web  # WEB_PORT 覆盖宿主端口
```

一次性验收服务（启动 web、运行 Vitest + Playwright 全部测试后退出）：

```bash
docker compose run --rm verify
# 或：docker compose up --build verify（web 会随依赖一并启动）
```

### 本地开发

```bash
npm install
npm run dev          # 开发服务器
npm run test:unit    # Vitest：校验与排序边界
npm run test:e2e     # Playwright：粘贴 → 结论主链路（自动构建并预览）
npm run verify       # 单元 + 端到端全量验收
```

## 输入约束

粘贴的 JSON 必须满足以下全部条件，任一不满足即视为**文档无效**：

- 根对象**必须且仅含** `elements` 与 `expectedOrder` 两个字段。
- `elements` 为数组，按 DOM 先后排列；每项**必须且仅含**四个字段：
  - `id`：非空字符串，且在 `elements` 内唯一；
  - `tabindex`：整数（可为负整数）；
  - `disabled`、`hidden`：布尔值。
- `expectedOrder` 为数组，每项为字符串、互不重复，且必须引用
  `elements` 中已声明的 `id`（允许只覆盖部分元素）。

任一语法、字段、类型、唯一性或引用检查失败时，页面仅显示“文档无效”，
并清空上一次的结果。

合法输入示例：

```json
{
  "elements": [
    { "id": "username", "tabindex": 0, "disabled": false, "hidden": false },
    { "id": "submit", "tabindex": 2, "disabled": false, "hidden": false },
    { "id": "cancel", "tabindex": 1, "disabled": false, "hidden": false },
    { "id": "legacy", "tabindex": 0, "disabled": true, "hidden": false }
  ],
  "expectedOrder": ["cancel", "submit", "username"]
}
```

## 核验规则

1. **排除**：剔除 `disabled`、`hidden` 或 `tabindex < 0` 的元素。
2. **排序**：`tabindex > 0` 的元素按数值升序，同值保持 DOM 原顺序；
   随后接 `tabindex === 0` 的元素，保持 DOM 原顺序。
3. **展示**：页面列出完整实际序列。
4. **判定**：仅当实际序列与 `expectedOrder` 逐项完全相同（长度一致且
   每个位置的 id 相同）时显示“一致”，否则显示“不一致”。

## 目录结构

```
src/lib/validate.ts   # JSON 解析与全部合法性检查
src/lib/order.ts      # Tab 顺序推导
src/App.tsx           # 页面与结论展示
tests/unit/           # Vitest：校验与排序边界
tests/e2e/            # Playwright：粘贴到结论主链路
Dockerfile            # 静态 Web 应用（nginx）
Dockerfile.verify     # 一次性验收容器
docker-compose.yml    # web（WEB_PORT 可覆盖）+ verify
```
