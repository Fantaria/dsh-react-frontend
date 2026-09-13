# 官方源码迁移映射

| 官方区域 | 独立前端目标 | 解耦策略 |
|---|---|---|
| `apps/web`、`packages/client/web` | `src/main.tsx`、`src/App.tsx` | React/Vite 独立启动 |
| `packages/client/ui-layout` | `features/shell` | 保留双栏、顶部栏与导航语义 |
| `packages/client/ui-workspace` | `features/shell/Sidebar.tsx` | 通过 adapter 获取工作区和会话 |
| `ui-chat`、`ui-conversation` | `features/chat`、`Conversation.tsx` | 消息布局、回合和输入器 |
| 官方 Markdown/代码展示 | `Markdown.tsx`、`CodeBlock.tsx` | GFM、数学、表格、代码与安全链接 |
| `packages/client/ui-tool` | `ToolRow.tsx` | 工具事件在 projector 内配对 |
| `packages/client/ui-settings*` | `SettingsDialog.tsx` | 设置/凭据 Remote；可选能力局部降级 |
| `packages/api/*-controller`、`api/remotes` | `src/dsh-adapter` | 只读核对方法、payload 与事件类型 |

视觉标识保留 DeepSeek/Harness；旧 Vue 原型及 Uniya 品牌不再作为迁移来源。
