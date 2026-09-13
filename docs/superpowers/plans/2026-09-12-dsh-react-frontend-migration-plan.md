# DSH React 前端独立迁移实施计划

## 目标与原则

将 `D:\ai-workspace\Uniya` 从现有 Vue 原型安全替换为独立的 React + TypeScript
前端，并通过 5200 端口代理连接 DSH 3080。官方 DSH 源码只读，页面行为和视觉以
`D:\ai-workspace\deepseek-harness` 为唯一标准。

实施过程遵循以下约束：

- 先建立可构建的 React 基线，再移除 Vue 文件；
- 先稳定 adapter 和领域模型，再迁移依赖它们的页面；
- 历史消息与实时事件共用同一投影器；
- 组件不得直接解析 DSH payload；
- 每个阶段都执行 typecheck、测试和 production build；
- 每个阶段都确认 DSH 仓库没有产生改动。

## 阶段 0：基线与源映射

1. 记录 Uniya 当前文件清单、依赖和可运行状态。
2. 使用命令级 `safe.directory` 读取 DSH Git 状态，不修改全局 Git 配置。
3. 建立官方源码映射表：源文件、Uniya 目标文件、依赖、迁移状态和偏差说明。
4. 标记可直接迁移的纯 React primitives，以及必须解耦 Cordis 的功能组件。
5. 保存后端基线状态，用于最终零改动核对。

交付物：`docs/migration/source-map.md`、后端基线记录。

## 阶段 1：React/Vite 基础替换

1. 将依赖切换为 React 18、React DOM、Vite React 插件和测试工具。
2. 替换 `main.ts`、`App.vue` 和 Vue 配置，建立 `main.tsx`、`App.tsx`。
3. 保留并校正 Vite 5200 → 3080 的 HTTP、WebSocket 和鉴权代理。
4. 迁移官方 `base.css`、主题变量、字体和全局 reset。
5. 建立 CSS Modules、SVG/静态资源和测试类型声明。
6. React 基线构建通过后，删除无引用的 `.vue` 文件和 Vue 依赖。

验证：空壳页面启动、typecheck、unit test、production build。

## 阶段 2：领域模型与 DSH Adapter

建立 `src/dsh-adapter`：

1. `transport/http.ts`：RPC envelope、取消、超时、cookie 和标准错误。
2. `transport/events.ts`：mux/host 事件流、关闭、重连和连接状态。
3. `transport/auth.ts`：token-cookie 交换和敏感值清理。
4. `api/*`：workspace、session、llm、settings、credentials、skills、presets、
   goals、jobs、subagents、todos、files、deliverables、logs。
5. `types/*`：原始 wire 类型，仅允许 adapter 引用。
6. `mappers/*`：DTO 到领域模型的运行时检查与转换。
7. `capabilities/*`：方法可用性和版本能力矩阵。
8. `errors/*`：HTTP/RPC/协议/认证/冲突错误模型。

建立 `src/domain`：Workspace、Session、MessageBlock、ConversationNode、ToolCall、
SettingsSection、CredentialState、Model、Capability 等稳定类型。

验证：RPC 序列化、错误映射、能力检测、凭据无泄漏测试。

## 阶段 3：事件投影与状态管理

1. 迁移官方 conversation-node 的事件语义，而非 Cordis 注册容器。
2. 建立统一 projector，输入历史记录或实时事件，输出相同 ConversationNode。
3. 实现 chunk 合并、source sequence 去重、tool call/result 配对和回合边界。
4. 支持 text、reasoning、image、tool、command、compaction、retry、error、
   max-token、turn-tail、navigation 和 unknown 节点。
5. 建立 React store/context，分别管理连接、工作区、会话、conversation、设置和 UI。
6. 确保原始 payload 不进入普通组件 props。

验证：历史/实时快照等价、乱序/重复/缺失结果、停止和失败状态测试。

## 阶段 4：官方基础组件与 Markdown

1. 从官方 `ui-primitives` 迁移按钮、输入框、菜单、Modal、Tooltip、Toast、
   Disclosure、ConnectionIndicator、图标与品牌组件。
2. 迁移 Markdown parse/render/incremental 管线。
3. 接入 GFM、数学公式、Shiki 高亮、复制反馈、URL 安全过滤和文件引用。
4. 迁移 Terminal、Diff、Read、Search、Web、JSON 等展示 primitive。
5. 保留官方 CSS Modules 和 data-state 语义。

验证：Markdown fixture、流式未闭合 Markdown、代码、公式、表格、CJK 强调、
危险 URL 与原始 HTML测试。

## 阶段 5：主框架、侧栏和会话骨架

1. 迁移 AppFrame、列宽、折叠与响应式行为。
2. 迁移 DeepSeek/Harness 品牌头部和官方图标。
3. 迁移工作区与会话侧栏、搜索、筛选、新会话和设置入口。
4. 迁移顶部标题、模式、对话/轨迹 tabs 和 Session log。
5. 迁移输入器、附件、权限模式、模型选择、发送和停止按钮。
6. 接入真实 workspace/session API 与连接状态。

验证：主工作台几何、键盘操作、空状态、加载、重连和会话切换。

## 阶段 6：完整会话渲染

1. 迁移 ChatView、MessageItem、AssistantMarkdown、ReasoningRow 和节点座位。
2. 迁移消息操作、回合导航、统计、使用量和停止标记。
3. 迁移上下文注入、系统提示、重试、压缩、错误和未知节点。
4. 迁移图片附件、文件引用和产物入口。
5. 保证长会话滚动、加载更早消息和流式自动跟随符合官方行为。

验证：使用同一真实会话与官方页面逐项对照。

## 阶段 7：工具注册与工具卡片

1. 建立独立的 tool renderer registry，替代 Cordis slot 注册。
2. 迁移通用 ToolRow、ToolDetails、ToolCallTree 和 fallback。
3. 迁移 Shell/PowerShell、Read、Read Image、Write、Edit/Replace、Grep、Glob、
   Web、Todo、Question、Code Dispatch/子代理的 model 与 view。
4. 支持 pending、running、success、failed、blocked、folded 等状态。
5. 未知工具显示安全摘要和可展开原始结构。

验证：官方 fixture 和真实 smoke-test 会话的所有工具行。

## 阶段 8：轨迹与辅助面板

1. 迁移轨迹视图和事件详情。
2. 接入 Goals、Jobs、Subagents、Todo、Skills 和 Presets。
3. 接入 deliverables、produced files 和 Session log。
4. 迁移审批、用户问题和需要交互的过程面板。

验证：可用功能真实操作；后端不支持的能力根据 capability 局部降级。

## 阶段 9：设置、模型、插件和凭据

1. 迁移设置壳、导航、通用设置和语言设置。
2. 迁移模型/提供商配置和模型发现。
3. 迁移插件配置卡，包括 Bash、Web Search、Agent Loop 和子代理模型。
4. 迁移 Agent Presets、Skills 目录相关操作。
5. 迁移 credential describe/set/unset；输入提交后立即清空。
6. 实现 settings revision 冲突、重载和重试。

验证：设置持久化、409 冲突、凭据只写、日志与存储敏感值扫描。

## 阶段 10：整体验收与文档

1. 启动相同 DSH 3080，分别打开官方页面和 5200 独立页面。
2. 按源映射表核对布局、交互、消息、工具、轨迹和设置。
3. 执行 typecheck、全部测试、production build 和浏览器关键路径测试。
4. 检查控制台、网络请求、WebSocket 重连和长会话性能。
5. 再次核对 DSH Git 状态与基线，确认零文件改动。
6. 编写 `docs/adapter/README.md`，说明 adapter 目录、数据流、能力检测、
   版本升级方式和新增 API/事件映射步骤。
7. 更新项目 README，记录启动方式、5200 代理、鉴权和验证方式。

## Vue 原型废弃策略

Vue 原型不作为迁移来源。React 基线通过构建后，删除其 `.vue` 组件、Vue 插件、
Vue 类型检查器和专属样式；已有 DSH transport 只能作为协议核对材料，正式实现进入
`src/dsh-adapter`。设计文档和有用的运行说明保留，过时文档明确标记为 superseded。

## 完成门槛

- 5200 可独立连接 3080，并完成官方鉴权和实时事件流；
- 设计规范列出的前端功能已迁移或按 capability 明确降级；
- 官方文本、Markdown、工具和状态样式没有被纯文本简化；
- adapter 测试、类型检查、构建和关键浏览器流程通过；
- `docs/adapter/README.md` 可让维护者独立定位和升级协议映射；
- DSH 后端仓库与基线相比没有任何改动。
