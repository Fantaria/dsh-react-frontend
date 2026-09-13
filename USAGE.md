# 安装与运行

本项目是独立的 React + TypeScript 前端，需要连接单独运行的
[DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness)
后端。本仓库不包含 DSH 后端、模型服务或会话数据库。

## 运行结构

建议将两个仓库放在同一个父目录下：

```text
workspace/
├── deepseek-harness/     # 官方 DSH 后端与运行时
└── dsh-frontend/         # 本项目
```

两个项目分别安装依赖并在两个终端中运行：

```text
浏览器 http://127.0.0.1:5200
              │
              │ Vite HTTP / WebSocket 代理
              ▼
DSH 后端 http://127.0.0.1:3080
```

## 环境要求

- Git
- Node.js `^22.19.0` 或 `>=24.0.0`
- pnpm `11.7.0`

Node.js 与 pnpm 版本要求来自当前 DSH 源码。DSH 仍处于开发者预览阶段，
后续版本可能调整环境要求，升级时应以
[DSH 官方 README](https://github.com/deepseek-ai/deepseek-harness#run-from-source)
为准。

检查本地环境：

```sh
git --version
node --version
pnpm --version
```

未安装 pnpm 时，可以通过 Corepack 启用指定版本：

```sh
corepack enable
corepack prepare pnpm@11.7.0 --activate
```

如果当前 Node.js 环境不提供 Corepack，也可以使用 npm：

```sh
npm install --global pnpm@11.7.0
```

## 1. 克隆两个仓库

先创建一个用于存放两个项目的目录。

### Windows PowerShell

```powershell
New-Item -ItemType Directory -Path dsh-workspace
Set-Location dsh-workspace

git clone https://github.com/deepseek-ai/deepseek-harness.git
git clone FRONTEND_REPOSITORY_URL dsh-frontend
```

### macOS / Linux

```sh
mkdir dsh-workspace
cd dsh-workspace

git clone https://github.com/deepseek-ai/deepseek-harness.git
git clone FRONTEND_REPOSITORY_URL dsh-frontend
```

`FRONTEND_REPOSITORY_URL` 表示本仓库发布后的 HTTPS 或 SSH 克隆地址。

## 2. 安装并构建 DSH

进入官方 DSH 仓库：

```sh
cd deepseek-harness
pnpm install
pnpm run build
```

`pnpm run build` 会生成 DSH 启动所需的后端与客户端产物。即使本项目不使用
DSH 官方页面，从源码运行 DSH 时仍应完成官方要求的完整构建。

## 3. 启动 DSH 后端

在 `deepseek-harness` 目录运行：

```sh
pnpm dsh web --no-open
```

DSH 默认监听：

```text
http://127.0.0.1:3080
```

`--no-open` 用于阻止 DSH 自动打开官方 Web 页面。该终端需要保持运行。

DSH 启动时可能输出带访问令牌的启动地址。访问令牌属于本地敏感信息，不应写入
源码、环境文件、截图或 Git 提交。

## 4. 安装前端依赖

打开第二个终端，进入前端仓库。

从 `deepseek-harness` 目录返回父目录时，可以运行：

```sh
cd ../dsh-frontend
```

安装前端依赖：

```sh
pnpm install --node-linker=hoisted
```

`pnpm-lock.yaml` 已记录依赖版本，应保留并提交该文件，以确保安装结果稳定。

## 5. 配置后端地址

默认配置已经指向 `http://127.0.0.1:3080`，正常情况下无需创建额外环境文件。

当 DSH 使用其他地址或端口时，复制环境变量示例文件。

### Windows PowerShell

```powershell
Copy-Item .env.example .env.local
```

### macOS / Linux

```sh
cp .env.example .env.local
```

然后修改 `.env.local`：

```dotenv
DSH_BACKEND_URL=http://127.0.0.1:3080
```

修改环境变量后需要重新启动 Vite。

## 6. 启动前端

在 `dsh-frontend` 目录运行：

```sh
pnpm dev
```

Vite 固定监听：

```text
http://127.0.0.1:5200
```

浏览器只访问 `5200` 端口。开发服务器会完成以下转发：

| 前端路径 | DSH 目标 | 作用 |
| --- | --- | --- |
| `/api` | `http://127.0.0.1:3080/api` | Remote API 与实时事件连接 |
| `/dsh-auth` | `http://127.0.0.1:3080/` | 访问令牌与 HttpOnly Cookie 交换 |

不要直接将浏览器请求改为跨域访问 `3080`。同源代理同时承担鉴权 Cookie、HTTP
请求和 WebSocket 转发。

## 7. 完成首次连接

打开：

```text
http://127.0.0.1:5200
```

如果页面显示 DSH 访问令牌输入框，将 DSH 启动终端所输出启动地址中的令牌填入。
前端通过 `/dsh-auth` 将令牌交换为 DSH 的 HttpOnly 会话 Cookie；令牌不会写入
前端持久化状态。

连接完成后，按照以下顺序初始化：

1. 打开“设置 → 模型”，配置模型提供方与 API 密钥；
2. 添加并选择一个 DSH 主机上的工作区目录；
3. 创建会话；
4. 发送消息并检查实时回复与工具调用结果。

工作区路径由 DSH 后端解释，因此必须是 DSH 运行主机上实际存在的绝对路径，
不是浏览器所在设备的文件路径。

## 快速启动 DSH

不需要修改或调试 DSH 源码时，可以使用官方发布包代替源码构建：

```sh
npx @deepseek-ai/dsh web --no-open
```

前端仍按前述方式执行 `pnpm install --node-linker=hoisted` 和 `pnpm dev`。

由于 DSH 处于快速迭代阶段，发布包与本前端 Adapter 可能出现协议版本差异。
发生接口 `404` 或版本不匹配时，应优先使用与本前端开发时一致的 DSH 源码版本。

## 项目验证

在前端目录执行：

```sh
pnpm run typecheck
pnpm test
pnpm run build
```

这些命令分别执行 TypeScript 类型检查、自动化测试和生产构建。

完整联调还应确认：

- `3080` 的 DSH 进程保持运行；
- `5200` 页面显示已连接状态；
- 工作区可以加载；
- 会话可以创建和恢复；
- 消息可以发送并持续接收实时事件；
- 工具调用、Markdown 和代码内容可以正确显示；
- 设置与凭据请求由 DSH 后端处理。

## 常见问题

### `Port 5200 is already in use`

Vite 配置启用了 `strictPort`，不会自动切换到其他端口。先确认占用进程。

Windows PowerShell：

```powershell
Get-NetTCPConnection -LocalPort 5200 -ErrorAction SilentlyContinue |
  Select-Object LocalAddress, LocalPort, State, OwningProcess
```

macOS / Linux：

```sh
lsof -i :5200
```

确认进程不再需要后再将其关闭，然后重新运行 `pnpm dev`。

### 页面显示无法连接 DSH

依次检查：

1. DSH 终端是否仍在运行；
2. DSH 是否监听 `127.0.0.1:3080`；
3. `.env.local` 中的 `DSH_BACKEND_URL` 是否正确；
4. 修改环境变量后是否重启了 Vite；
5. 防火墙或代理软件是否拦截本地 HTTP/WebSocket 连接。

### 页面要求访问令牌或返回 `401`

重新查看 DSH 启动终端输出，使用当前进程生成的访问令牌完成连接。DSH 重启后，
旧令牌或旧 Cookie 可能不再有效。

### 会话、模型或设置接口返回 `404`

这通常表示 DSH 后端版本与当前前端 Adapter 不兼容。不要通过修改官方 DSH 后端
来迁就前端，应核对 DSH 版本并在本项目的 `src/dsh-adapter` 中处理协议变化。

Adapter 的接口范围与升级方式见
[`docs/adapter/README.md`](docs/adapter/README.md)。

### 工作区目录不可用

检查路径是否满足以下条件：

- 使用绝对路径；
- 路径存在于 DSH 运行主机；
- 启动 DSH 的系统账户具有访问权限；
- Windows 路径使用正确的盘符，例如 `D:\projects\example`。

## 生产部署说明

`pnpm run build` 只负责生成 `dist` 静态资源。部署静态资源时，还需要在 Web
服务器或网关中复现开发环境的代理规则：

- `/api` 转发到 DSH，并支持 WebSocket；
- `/dsh-auth` 转发到 DSH 根路径；
- 保持 Cookie 和同源访问语义；
- 不在前端静态文件中写入访问令牌或 API 密钥。

生产部署方式取决于实际网络、TLS 和访问控制环境，本仓库不包含 DSH 后端部署。

## 相关文档

- [架构说明](ARCHITECTURE.md)
- [DSH Adapter 说明](docs/adapter/README.md)
- [DeepSeek Harness 官方仓库](https://github.com/deepseek-ai/deepseek-harness)
- [DeepSeek Harness Web UI 指南](https://deepseek-harness.github.io/deepseek-harness/user/guide/)
