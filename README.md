# DeepSeek Harness · 独立 React 前端

这是从 DeepSeek Harness 官方界面与 Remote 协议迁移出的 React + TypeScript
独立客户端。它不包含业务后端，也不读取或维护 `.dsh` 数据；工作区、会话、模型、
事件、设置和凭据均交由原 DSH 后端处理。

## 启动

先按 DSH 官方方式启动后端（默认 `127.0.0.1:3080`），再启动本项目：

```powershell
pnpm install --node-linker=hoisted
pnpm dev
```

访问 `http://127.0.0.1:5200`。Vite 将 `/api`（含 WebSocket）代理至 3080，并将 `/dsh-auth` 转发到 DSH 根路径完成访问令牌 Cookie 交换。

若后端地址不同，可复制 `.env.example` 为 `.env.local` 并设置 `DSH_BACKEND_URL`。

完整的环境准备、双仓库启动、鉴权、验证和故障排查流程见
[`USAGE.md`](USAGE.md)。

## 验证

```powershell
pnpm run typecheck
pnpm test
pnpm run build
```

Adapter 的结构、端点和升级方法见 `docs/adapter/README.md`。

项目定位、前后端边界、扩展方式及版权声明见 [`ARCHITECTURE.md`](ARCHITECTURE.md)。

## 不变约束

- 不修改官方 DeepSeek Harness 后端源码。
- 不复制、替代或维护 DSH 的数据库与 `.dsh` 会话存储。
- 页面组件不直接调用 `/api` 或解析 wire payload；协议差异集中在 `src/dsh-adapter`。
