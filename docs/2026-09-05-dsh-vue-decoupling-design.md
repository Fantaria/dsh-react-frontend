# DSH 官方前端 Vue 解耦设计（已废弃）

> 此方案已由 `docs/superpowers/specs/2026-09-12-dsh-react-frontend-migration-design.md`
> 取代，不再作为实现依据。

## 目标

在不修改 `D:\ai-workspace\deepseek-harness` 任何文件的前提下，将其浏览器端的连接协议、状态模型、组件结构、视觉变量和操作流程忠实移植到 `D:\ai-workspace\Uniya` 的 Vue 3 + TypeScript 工程。

## 唯一事实来源

- 接口与鉴权：`packages/client/connection`、`packages/api/gateway`、`packages/api/session-controller`、`packages/api/workspace-controller`。
- 页面结构：`packages/client/ui-layout`、`ui-sidebar`、`ui-workspace`、`ui-conversation`。
- 对话表现：`packages/client/ui-chat`、`ui-tool`、`ui-approval`、`ui-user-questions`。
- 视觉规范：`packages/client/ui-theme`、`packages/client/web/src/base.css`、各官方 CSS Module。
- `D:\ai-workspace\dsh-frontend` 不参与接口或 UI 决策。

## 架构

Uniya 只包含浏览器客户端：Vite 在 5200 提供页面，并将 `/api`（HTTP 与 WebSocket）代理至 3080。`/dsh-auth` 只代理 DSH 官方根路径 token-cookie 交换。

浏览器 transport 使用官方当前协议：`POST /api/<namespace>/<method>`、`ClientRequest` envelope 与 `/api/remote.mux`。Workspace、Session Control、Session Follow、Remote Events 分别保持独立流和生命周期。Vue store 只投影官方状态，不产生后端业务状态。

## 组件映射

- `AppFrame.vue` ← `ui-layout/AppFrame.tsx`
- `SidebarRoot.vue` ← `ui-sidebar/SidebarRoot.tsx`
- `WorkspaceBrowser.vue` ← `ui-workspace/WorkspacePicker.tsx` 与 rows
- `ConversationRoot.vue` ← `ui-conversation/skeleton/ConversationRoot.tsx`
- `ChatView.vue` ← `ui-chat/chat/ChatView.tsx`
- `ToolRow.vue` ← `ui-tool/tool/components/ToolRow.tsx`
- `InputBar.vue` ← `ui-conversation/skeleton/InputBar.tsx`

Cordis slots 在 Vue 中映射为固定组件座位；不复制后端 Cordis 运行时，也不重新设计页面。

## 错误与兼容边界

只支持当前本地 DSH 源码版本。若 3080 来自旧版或全局安装版本，显示明确的版本不匹配提示，不静默切换到旧点式 RPC。401 进入官方 token 兑换流程；404 明确指出运行后端与源码不一致。

## 验证

- DSH 仓库前后 `git status --short` 必须一致。
- Vue SFC 解析、TypeScript 类型检查、Vite production build。
- 代理配置确认 5200 → 3080，HTTP/WS 均开启。
- 与官方布局核对：三列框架、侧栏宽度/折叠、标题与标签、对话宽度、用户气泡、工具行、底部输入栏。
