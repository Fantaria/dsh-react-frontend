# DSH Adapter 设计

`src/dsh-adapter` 是页面与 DeepSeek Harness 后端之间唯一的协议边界。React 页面只消费稳定领域对象；DSH 升级后若端点或事件字段变化，只修改本目录及其测试。

## 数据流

```text
React → stores/dsh-store.ts → adapter/api → transport/http.ts → Vite /api → DSH :3080
DSH :3080 → events.{mux,host} → transport/events.ts → store → projector → ConversationNode → UI
```

## 目录职责

- `transport/http.ts`：Remote RPC envelope、Cookie、HTTP/协议/业务错误。
- `transport/events.ts`：mux/host 事件流、重连、取消和资源释放。
- `api/client.ts`：工作区、会话、模型和发送消息的类型化调用。
- `api/auth.ts`：启动令牌换取 HttpOnly Cookie；令牌不进入 store 或本地存储。
- `api/settings.ts`：设置、凭据与可选插件清单；凭据明文只有写入方向。
- `types/`：DSH wire DTO，普通组件不得引用。
- `projectors/conversation.ts`：历史和实时事件统一投影，负责 chunk 合并、工具配对与状态节点。
- `errors/`：传输、Remote 和 envelope 错误的统一模型。

## 当前接入端点

| 分组 | 端点 | 作用 |
|---|---|---|
| Host | `host.describe`、`host.pickDirectory` | 连接验证与原生目录选择 |
| Workspace | `workspace.list`、`workspace.create` | 工作区读取与登记 |
| Session | `session.list/create/history` | 会话列表、创建与事件历史 |
| Session | `session.models/selectModel` | 模型目录与切换 |
| Session | `session.prompt/cancel/rename` | 消息、停止与标题 |
| Settings | `settings.describe/update/replace` | 脱敏设置及带 revision 的写入 |
| Credentials | `credentials.describe/set/unset` | 凭据状态与只写密钥操作 |
| Optional | `pluginInventory.list` | 部署提供时显示插件；404 时局部降级 |
| Stream | `/api/events.mux`、`/api/events.host` | 会话、任务、工作区和状态更新 |

## 关键映射规则

- `session.history.events` 外层 `{ event }` 在进入 store 前解包。
- assistant 内容中的 `tool-call` 不直接渲染；`tool/call` 生成唯一工具行。
- `tool/result` 通过 `data.message.content[].toolCallId` 关联，后备为 `message.source.callId`。
- `assistant/message.sourceEventSeqs` 压掉已结算的流式 chunk，避免重复文本。
- 未识别事件保留在轨迹页，不伪造成普通消息。

## DSH 升级流程

1. 只读检查官方 controller/remote 类型和前端调用点。
2. 脱敏记录 envelope 与字段结构，禁止输出凭据明文。
3. 先更新 `types/`、`api/` 和 projector，不在 React 组件内加协议判断。
4. 补充测试，验证历史与实时投影一致。
5. 运行 typecheck、test、build 和真实 3080 浏览器检查。

设置写入携带 `expectedRevision`。DSH 返回 `settings/conflict` 时不会覆盖并发修改；重新打开设置读取新 revision 后再编辑。
