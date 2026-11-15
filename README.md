# `bgm-rank` Admin Console (`admin`)

本地运行的高密度新番匹配审核与发布工作台（Local-First SPA），严格遵循 [`../api/docs/admin-frontend-design.md`](../api/docs/admin-frontend-design.md) 构建。

## 技术栈

- **Vite 6** + **React 19** + **TypeScript 5.8**
- **@tanstack/react-query v5**（乐观更新、0ms 焦点推进、请求自动取消）
- **Tailwind CSS v4** + **cmdk** + **react-resizable-panels** + **sonner**
- **@phosphor-icons/react**（Swiss Grid 暗色优先视觉系统，支持深/浅色切换）

## 快速启动

```bash
pnpm install
pnpm dev      # 默认启动于 http://localhost:5173
pnpm build    # 类型检查并构建生产静态资源
```

## 核心功能

1. **Local / Prod 双环境护栏**：顶栏一键切换本地开发后端 (`http://localhost:3000`) 与生产环境后端（默认 `https://api.rinshankaiho.fun`），切换至 Prod 时顶部展示 `2px` 红色警示边，Token 独立持久化于浏览器 `localStorage`。
2. **三大正交工作视图**（`Alt+1` / `Alt+2` / `Alt+3`）：
   - **Triage Inbox**：左侧紧凑待审队列 + 右上四行对齐解剖台（标题共有字高亮、日期差告警、平台互斥检测、跨季/同季多对一共享 `bgm_id` 提示条）+ 右中 LLM 候选切换与内嵌 Bangumi 搜索/智能粘贴 + 右下三向分流动作栏（收录 / 6 类排除原因 / 跨季移番）。
   - **Included Preview**：与公网同源的本季排行榜实时预览、多对一 `MAL IDs` 聚合展开解绑、手动补入 `mal_id`、单行重刷 Bangumi 评分。
   - **All Season Items**：全量多维过滤（`Status` / `Source` / `Dup in Season` / `Date Mismatch` / `Korean LLM`）、`Shift` 连续多选、一键批量打回 `pending` 并通过 SSE 流重跑 LLM。
3. **Zero-Mouse 全键盘流**：`j/k` 上下移动、`1-5` 切换候选、`Enter` 确认收录、`x` 排除、`m` 跨季移番、`/` 搜索粘贴、`o/b` 打开外链、`Ctrl/Cmd+K` 全局命令面板、`?` 快捷键参考。
