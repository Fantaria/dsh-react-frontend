# DSH React 前端独立迁移设计

## 1. 目标

在不修改 `D:\ai-workspace\deepseek-harness` 任何文件的前提下，在
`D:\ai-workspace\Uniya` 建立独立的 Vite + React + TypeScript 前端，连接现有
DSH 3080 后端，并尽可能完整地迁移 DSH 官方浏览器前端的页面、交互、消息渲染、
工具展示和设置能力。

本设计取代 `docs/2026-09-05-dsh-vue-decoupling-design.md`。项目不再使用 Vue，
也不进行 Uniya 品牌替换；面向用户的 DeepSeek/Harness 名称、图标和官方视觉保持不变。

## 2. 约束与事实来源

- `D:\ai-workspace\deepseek-harness` 是只读事实来源，禁止修改、格式化或生成文件。
- DSH 官方源码是接口、行为、页面结构和视觉效果的唯一规范。
- `D:\ai-workspace\dsh-frontend` 只能用于交叉核对，不作为接口或 UI 决策依据，
  也不直接复制其架构。
- 新前端不建立自己的业务后端和数据库，不复制 DSH 的业务状态。
- 开发服务器使用 5200 端口，将 HTTP、WebSocket 和鉴权请求代理到 3080。
- 凭据保持 DSH 的只写安全语义；前端不得读取、记录或持久化明文密钥。

## 3. 技术路线

采用 Vite + React + TypeScript 原生迁移。优先保留官方组件的 JSX 结构、状态语义、
CSS Modules、设计变量和可访问性行为，但移除其对 DSH 内部 Cordis 容器和 monorepo
私有运行上下文的直接依赖，改为依赖 Uniya 工程内的稳定领域接口。

不采用以下路线：

- 不将官方 React 应用作为 iframe 或微前端整体嵌入。
- 不把官方组件直接绑定到原始 RPC 响应。
- 不把 React 组件翻译为 Vue。
- 不以团队 `dsh-frontend` 的简化接口代替官方协议。

## 4. 总体架构

```text
DSH 3080
   │
   ├─ HTTP / RPC
   └─ WebSocket / event streams
            │
            ▼
src/dsh-adapter
   ├─ transport       网络、鉴权、RPC、WS、重连
   ├─ api             各业务命名空间客户端
   ├─ events          原始事件解码与顺序处理
   ├─ projectors      历史与实时事件统一投影
   ├─ mappers         DSH 数据到领域模型的转换
   ├─ capabilities    版本与能力检测
   └─ types           仅 adapter 可见的协议类型
            │
            ▼
src/domain            稳定的前端领域模型与端口
            │
            ▼
src/stores            会话、工作区、设置和 UI 状态
            │
            ▼
src/features + src/components + src/pages
```

React 组件不得直接调用 `/api`、拼接 DSH RPC 方法名或解析原始事件。所有 DSH
协议变化必须先在 `src/dsh-adapter` 中被吸收，再以稳定领域对象交给页面。

## 5. Adapter 设计

### 5.1 Transport

- `httpTransport`：发送官方 RPC envelope，处理 cookie、token、超时和取消。
- `eventTransport`：管理官方 WebSocket/mux 连接、心跳、退避重连和主动关闭。
- `authTransport`：完成官方 token-cookie 交换，不在 URL、日志或 store 中长期保留 token。
- `remoteError`：将 HTTP、RPC 和连接错误统一为可展示、可诊断的错误类型。

### 5.2 API 模块

按官方命名空间拆分客户端，至少包含：

- workspace
- session 与 session-follow/session-control
- models/llm
- settings
- credentials
- skills
- presets
- goals
- jobs/subagents/todos
- files、deliverables 与 session log

每个 API 模块只暴露语义化方法，不向调用者泄漏 RPC envelope。

### 5.3 Event Projector

历史记录和实时事件必须进入同一投影器。投影器负责：

- 按序列号去重、排序和续接流式 chunk；
- 将用户、助手、推理、图片、工具调用、工具结果和回合状态保留为独立 block；
- 将 call/result 配对，但保留孤立或未知事件以便降级展示；
- 表达 streaming、completed、interrupted、failed 和 compacted 状态；
- 生成 React 渲染层使用的 conversation nodes，而不是纯文本数组。

### 5.4 Capability Detection

启动时检测当前后端版本和可用命名空间。非关键接口缺失时局部禁用并说明原因；
关键协议不兼容时显示明确的版本错误，不静默改用未经验证的旧接口。

## 6. 前端功能范围

### 6.1 主框架

- 官方侧栏、折叠行为、工作区和会话列表；
- 顶部标题、模式提示、对话/轨迹切换及 Session log；
- 官方内容宽度、滚动、空状态和响应式布局；
- 底部输入器、附件入口、权限模式、模型选择和运行状态统计。

### 6.2 会话和工作区

- 工作区发现、添加、选择和状态展示；
- 会话创建、选择、重命名、删除及分页历史；
- 新消息发送、停止、续接、分支和官方支持的消息操作；
- 会话恢复、实时跟随、断线重连和版本冲突提示。

### 6.3 消息渲染

- GFM Markdown：段落、标题、列表、任务列表、引用、链接、图片和表格；
- 行内代码、代码块、语言标签、语法高亮、复制和长代码滚动；
- 数学公式、文件引用、图片附件、未知 JSON block；
- 推理过程、流式增量、停止标记、错误和上下文压缩状态；
- 回合尾部操作、时间、反馈、导航和官方展示的使用量信息。

用户消息保持官方的文字语义；助手消息使用 Markdown 语义渲染。不得再使用统一的
`white-space: pre-wrap` 纯文本方案替代结构化内容。

### 6.4 工具与过程展示

迁移官方工具展示注册机制和通用降级卡片，覆盖当前官方内置的 Shell、PowerShell、
Read、Read Image、Write、Edit/Replace、Grep、Glob、Web、Todo、Question、
Code Dispatch/子代理等工具。每种工具保留调用中、成功、失败、折叠、参数和结果状态。

### 6.5 设置和管理功能

迁移官方设置壳及当前可见配置能力，包括：

- 通用与语言设置；
- 模型/提供商配置；
- 插件配置；
- Bash、Web Search、Agent Loop、子代理模型等插件设置；
- Agent presets、Skills 及官方暴露的目录操作；
- 凭据配置状态、写入和移除。

设置写入必须使用后端 revision/冲突语义。凭据输入提交后立即从组件状态清除，
不得进入 localStorage、调试日志或错误详情。

## 7. 样式与品牌

- 保持 DeepSeek/Harness 官方品牌，不进行 Uniya 替换。
- 优先迁移官方 design tokens、字体层级、间距、边框、阴影、颜色和 CSS Modules。
- 图标优先使用官方前端已有的可复用资源或等价组件，不自行设计新的视觉语言。
- 页面外观以同一后端、同一会话下的官方页面截图和 DOM 行为为验收基准。
- CSS 迁移必须与语义 DOM 和组件状态同步，禁止只复制静态样式。

## 8. 状态边界

- 领域 store 保存工作区、会话、conversation nodes、模型、设置快照和连接状态。
- 临时展开、悬浮和输入焦点等局部状态留在组件内。
- DSH 原始 payload 只存在于 adapter 边界；未知 payload 可通过受控诊断模型保留。
- 后端继续负责持久化、工作区权限、会话执行和业务真相。

## 9. 错误与安全处理

- 接口失败在对应区域显示重试，不让整个应用白屏。
- WebSocket 采用有上限的指数退避，并显示连接、重连和离线状态。
- 未知事件和工具通过通用卡片保留类型与安全摘要。
- 401 进入官方鉴权流程；403、404、409 和协议错误给出不同提示。
- 对外部链接和图片 URL 做协议过滤；Markdown 不执行原始 HTML。
- 工具结果、错误和日志展示遵守官方截断与敏感信息处理方式。

## 10. 测试与验收

### 10.1 自动化验证

- TypeScript strict 类型检查；
- Vite production build；
- adapter 的 RPC envelope、错误映射和 capability 测试；
- event projector 的历史/实时等价、chunk 合并、去重及异常事件测试；
- Markdown、工具卡片、设置冲突和凭据清理的组件测试；
- 关键工作台流程的浏览器测试。

### 10.2 手工对照

使用同一个 3080 DSH 后端和同一会话，并排检查官方页面与迁移页面：

- 页面几何、滚动和交互位置；
- Markdown、代码、表格、公式、推理和图片；
- 各类工具调用及过程状态；
- 会话、工作区、模型、设置和凭据操作；
- 重连、错误、停止、历史加载和空状态。

### 10.3 后端零改动检查

实施前记录 `D:\ai-workspace\deepseek-harness` 的 Git 状态和必要文件哈希；实施完成后
再次核对。任何后端差异都视为验收失败。验证命令也不得在后端目录生成缓存、构建产物
或格式化改动。

## 11. 实施分段

完整范围按依赖顺序交付，但属于同一个迁移项目：

1. React/Vite 基础、官方主题和 adapter transport；
2. 领域模型、工作区/会话 API、事件投影器；
3. 主框架、侧栏、会话与输入器；
4. Markdown、附件、推理和回合状态；
5. 工具注册体系及官方内置工具卡片；
6. 轨迹、Goals、Jobs、Skills、Todo、产物和日志；
7. 设置、插件、模型与凭据；
8. 官方页面并排验收、兼容性收口和文档。

## 12. 完成定义

只有在以下条件全部满足后，才称为完成迁移：

- 独立前端可以通过 5200 代理连接 DSH 3080；
- 本设计范围内的官方可见功能均已接入或明确标注后端不支持；
- 消息和工具不再以简化纯文本替代；
- 关键流程与官方页面完成并排验证；
- adapter 的目录、接口和兼容边界有独立文档；
- `deepseek-harness` 源码及工作树没有被修改。
