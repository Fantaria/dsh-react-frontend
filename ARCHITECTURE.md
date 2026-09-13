# DeepSeek Harness 独立前端架构说明

## 项目定位

本项目是一套面向 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness) 的独立 Web 前端实现。

项目基于 DeepSeek Harness 的架构思想与公开接口进行设计，将原本与 DSH Web 运行环境结合的用户界面整理为可独立启动的 **React + TypeScript** 前端，并通过协议适配层连接官方 DSH 后端。

本项目不重新实现 Agent Runtime，不接管模型调用、工具执行、工作区管理或会话持久化。所有核心能力仍由官方 DeepSeek Harness 提供；本项目负责浏览器端的界面呈现、交互组织和协议接入。

简而言之：

> 官方 DSH 负责 Agent 与运行时，本项目负责一套可独立维护和调整的 Web 前端。

## 与官方 DeepSeek Harness 的关系

DeepSeek Harness 是 DeepSeek AI 开源的 Agent Harness，其核心理念是“一切皆插件（Everything is a Plugin）”，并通过模块化服务组合完成模型、工具、工作区、会话和 Web UI 等能力。

本项目遵循这一设计方向，但不修改官方 DSH 后端：

- DSH 后端按照官方方式安装和启动；
- 工作区、会话和配置仍由 DSH 自身管理；
- 模型请求、Agent 循环和工具调用仍在 DSH 内执行；
- 本项目不维护 DSH 数据库，也不复制 `.dsh` 会话数据；
- 前端通过 DSH 提供的 Remote API 和实时事件通道工作；
- DSH 官方仓库可以独立升级，本项目通过 Adapter 处理接口兼容。

官方项目地址：<https://github.com/deepseek-ai/deepseek-harness>

## 为什么进行前后端解耦

官方 Web UI 需要同时服务于 DSH 的通用产品形态，而不同项目可能需要完全不同的页面布局、导航结构和业务入口。

独立前端的目的不是改变 DSH 的业务逻辑，而是建立清晰的界面扩展边界：

1. **页面可调整**：可以修改工作台布局、侧栏、对话区和辅助面板，而不触碰 Agent 后端。
2. **协议可维护**：DSH 接口变化集中在 Adapter 中处理，避免协议字段散落在 React 组件里。
3. **组件可替换**：消息、工具卡片、设置页和工作区视图可以按使用场景分别替换。
4. **后端保持纯净**：无需修改、打补丁或派生维护官方 DSH 后端源码。
5. **场景更灵活**：同一套 DSH 能力可以接入不同的产品界面、内部工作台或垂直应用。

## 总体架构

```text
┌─────────────────────────────────────────────────────────────┐
│                React + TypeScript Web Frontend              │
│                                                             │
│  页面框架  │  会话视图  │  Markdown  │  工具卡片  │  设置页  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Stable Domain Models
┌──────────────────────────────▼──────────────────────────────┐
│                       DSH Adapter                           │
│                                                             │
│  Typed API  │  Event Projector  │  Error Model  │  Auth    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / Event Stream
┌──────────────────────────────▼──────────────────────────────┐
│              Official DeepSeek Harness Backend             │
│                                                             │
│ Session │ Workspace │ Agent Loop │ Models │ Tools │ Storage │
└─────────────────────────────────────────────────────────────┘
```

开发环境中，Vite 前端默认监听 `5200` 端口，并将 DSH 请求代理到默认的 `3080` 端口。浏览器始终访问同源的前端地址，由 Vite 完成 HTTP、鉴权和事件请求转发。

## 前端分层

### 1. 表现层

表现层使用 React 与 TypeScript 实现，包括：

- 主工作台和响应式页面框架；
- 工作区与会话导航；
- 对话消息、思考过程和运行状态；
- Markdown、代码、表格、数学公式和图片；
- 工具调用行及其结果详情；
- 模型、权限、设置和凭据界面；
- 会话轨迹与诊断信息。

表现层只消费稳定的领域对象，不直接解释 DSH 原始事件，也不直接拼装 Remote RPC 请求。

### 2. 状态与领域层

状态层负责连接状态、工作区、会话、模型目录、历史事件和实时事件。领域类型用于隔离页面组件与 DSH wire payload，例如：

- `Workspace`
- `Session`
- `ModelCatalog`
- `ConversationNode`
- `ConversationBlock`
- `CredentialInfo`
- `SettingsNamespace`

这样可以在不重写页面组件的情况下调整底层接口映射。

### 3. DSH Adapter

`src/dsh-adapter` 是本项目最重要的解耦层，也是所有 DSH 协议调用的唯一入口。

Adapter 负责：

- 构造和解析 DSH Remote RPC envelope；
- 管理 HTTP、鉴权 Cookie 和实时事件连接；
- 将 DSH 错误转换为统一前端错误；
- 将历史事件和实时事件投影为同一种会话节点；
- 配对工具调用与工具结果；
- 去除已结算流式片段产生的重复文本；
- 对可选接口进行局部能力降级；
- 隔离不同 DSH 版本之间的字段变化。

页面组件原则上不得直接调用 `/api/*`。当官方接口发生变化时，应优先修改 Adapter 与对应测试，而不是在多个页面中添加临时兼容逻辑。

详细接口设计参见 [`docs/adapter/README.md`](docs/adapter/README.md)。

## 数据与会话边界

本项目不建立自己的 DSH 会话数据库。

```text
用户操作
   ↓
React 页面
   ↓
DSH Adapter
   ↓
官方 DSH Session / Workspace / Settings API
   ↓
官方 DSH 存储与 Agent Runtime
```

因此：

- 刷新或更换前端不会迁移、覆盖或删除 DSH 会话数据；
- 会话是否持久化、保存在哪里以及如何升级，由 DSH 官方实现决定；
- 前端不应绕过 Remote API 直接读写 DSH 内部文件；
- 凭据读取接口只显示是否已配置，不返回密钥明文；
- 密钥输入只沿浏览器到 DSH 凭据服务的方向传递。

## 页面布局与场景适配

前后端解耦后，可以在保持 DSH 核心能力不变的情况下调整前端：

- 更换主导航、侧栏或多面板布局；
- 为代码开发、内容生产、数据分析等场景设计不同工作区；
- 根据设备尺寸提供桌面端或移动端界面；
- 针对特定工具提供专用结果卡片；
- 增加项目级入口，同时继续复用 DSH 会话和工具执行能力。

这些变化只发生在前端表现层，不应改变 DSH 的会话语义、工具协议和存储结构。

## 插件与扩展设计

本项目保留“可替换、可注册、可降级”的扩展思路：

- 工具展示组件可以根据工具名称注册专用 renderer；
- 未注册工具使用通用工具卡片安全展示；
- 设置和功能区域可以按模块独立增加；
- 可选后端能力不可用时，只降级对应区域，不阻断基础会话；
- DSH 升级或更换插件组合时，通过 Adapter 更新能力映射。

需要特别说明：独立 React 前端并不等同于官方 Cordis Web 插件宿主，不能假定所有 DSH 前端插件无需适配即可直接加载。若要接入某个官方或社区插件，需要确认它提供的 Remote 接口、事件类型和前端挂载方式，并在 Adapter 或前端注册表中完成对应适配。

这个边界可以避免将“插件自由替换”误解为修改官方后端，也能让扩展行为保持明确、可测试和可维护。

## 兼容与升级原则

DeepSeek Harness 仍处于开发者预览阶段，官方明确提示可能出现破坏兼容性的更新。因此本项目遵循以下升级流程：

1. 只读检查新版本官方 Remote/controller 类型和 Web UI 调用方式；
2. 核对 HTTP envelope、接口名称和事件字段；
3. 更新 Adapter wire types、API client 和事件 projector；
4. 为变化增加单元测试；
5. 使用同一真实会话对照历史与实时结果；
6. 执行类型检查、测试、生产构建和浏览器验证；
7. 确认官方 DSH 后端仓库没有被本项目修改。

## 非官方声明与版权说明

本项目是社区独立前端实现，并非 DeepSeek AI 官方项目，也不代表官方授权、合作、认证或背书。

DeepSeek、DeepSeek Harness、DSH 及其相关名称、标识和官方源码的权利归相应权利人所有。DeepSeek Harness 官方仓库当前以 MIT License 开源；使用或分发来源于官方项目的代码时，应遵守其许可证并保留相应版权和许可声明：

- 官方仓库：<https://github.com/deepseek-ai/deepseek-harness>
- 官方许可证：<https://github.com/deepseek-ai/deepseek-harness/blob/master/LICENSE>

本项目仅提供 React + TypeScript 前端抽离、界面组织与 DSH 接口适配，不提供、修改或重新发布 DeepSeek Harness 后端。使用者需要自行安装官方 DSH，并自行遵守官方项目及各第三方依赖的许可证。

本节仅用于说明项目来源和技术边界，不构成法律意见。

## 设计总结

本项目的核心并不是创建另一套 Agent 后端，而是在官方 DeepSeek Harness 之上建立一个清晰、独立、可维护的 Web 前端边界：

- 后端能力来自官方 DSH；
- 前端采用 React + TypeScript 独立运行；
- Adapter 负责协议兼容；
- 页面布局可以按场景调整；
- 工具和功能组件可以按需扩展或替换；
- 后端源码、会话存储和 Agent 执行逻辑保持官方原有设计。

这种结构既保留了 DeepSeek Harness 的模块化与插件化思想，也为不同产品场景提供了更自由的前端实现空间。
