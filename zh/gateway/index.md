---
summary: "Gateway 服务运行手册、生命周期与运维"
read_when:
  - 运行或调试 gateway 进程
title: "Gateway 运维手册"
---

# Gateway 服务 runbook

最后更新：2025-12-09

## 它是什么

- 始终在线的进程，拥有单一 Baileys/Telegram 连接与控制/事件平面。
- 取代旧 `gateway` 命令。CLI 入口：`openclaw gateway`。
- 运行直到被停止；遇到致命错误时以非 0 退出以便 supervisor 重启。

## 如何运行（本地）

```bash
openclaw gateway --port 18789
# 输出到 stdio 的完整 debug/trace 日志：
openclaw gateway --port 18789 --verbose
# 端口被占用时，终止监听后再启动：
openclaw gateway --force
# 开发循环（TS 变更自动重载）：
pnpm gateway:watch
```

- Config 热重载监听 `~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）。
  - 默认模式：`gateway.reload.mode="hybrid"`（安全变更热应用，关键变更重启）。
  - 必要时通过 **SIGUSR1** 触发进程内重启。
  - 用 `gateway.reload.mode="off"` 禁用。
- WebSocket 控制平面默认绑定 `127.0.0.1:<port>`（默认 18789）。
- 同一端口也提供 HTTP（Control UI、hooks、A2UI）。单端口复用。
  - OpenAI Chat Completions（HTTP）：[`/v1/chat/completions`](/zh/gateway/openai-http-api)。
  - OpenResponses（HTTP）：[`/v1/responses`](/zh/gateway/openresponses-http-api)。
  - Tools Invoke（HTTP）：[`/tools/invoke`](/zh/gateway/tools-invoke-http-api)。
- 默认在 `canvasHost.port` 启动 Canvas 文件服务（默认 `18793`），从 `~/.openclaw/workspace/canvas` 提供 `http://<gateway-host>:18793/__openclaw__/canvas/`。可用 `canvasHost.enabled=false` 或 `OPENCLAW_SKIP_CANVAS_HOST=1` 禁用。
- 日志写入 stdout；用 launchd/systemd 保活并轮转日志。
- 排障时用 `--verbose` 将日志文件中的调试日志（握手、req/res、events）镜像到 stdio。
- `--force` 使用 `lsof` 查找端口监听，发送 SIGTERM，记录杀掉的进程后启动 gateway（若缺少 `lsof` 则快速失败）。
- 在 supervisor（launchd/systemd/mac app 子进程）下运行时，停止/重启通常发送 **SIGTERM**；旧版本可能显示为 `pnpm` `ELIFECYCLE` 退出码 **143**（SIGTERM），这是正常关闭而非崩溃。
- **SIGUSR1** 会在授权时触发进程内重启（gateway 工具/config apply/update，或启用 `commands.restart` 的手动重启）。
- 默认需要 gateway 认证：设置 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）或 `gateway.auth.password`。客户端需在 `connect.params.auth.token/password` 中发送，除非使用 Tailscale Serve 身份。
- 向导现在默认生成 token，即使是 loopback。
- 端口优先级：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > 默认 `18789`。

## 远程访问

- 首选 Tailscale/VPN；否则使用 SSH 隧道：
  ```bash
  ssh -N -L 18789:127.0.0.1:18789 user@host
  ```
- 客户端通过隧道连接 `ws://127.0.0.1:18789`。
- 若配置了 token，客户端即使通过隧道也必须在 `connect.params.auth.token` 中携带。

## 多个 Gateway（同一主机）

通常不需要：一个 Gateway 可服务多个消息渠道与 agents。仅在冗余或严格隔离（例如救援 bot）时使用多个 Gateway。

支持方式：隔离 state + config 并使用唯一端口。完整指南见 [多 Gateway](/zh/gateway/multiple-gateways)。

服务名支持 profile：

- macOS：`bot.molt.<profile>`（旧 `com.openclaw.*` 可能仍存在）
- Linux：`openclaw-gateway-<profile>.service`
- Windows：`OpenClaw Gateway (<profile>)`

安装元数据写入服务配置：

- `OPENCLAW_SERVICE_MARKER=openclaw`
- `OPENCLAW_SERVICE_KIND=gateway`
- `OPENCLAW_SERVICE_VERSION=<version>`

救援 bot 模式：保持第二个 Gateway 使用独立 profile、state dir、workspace 与基础端口间隔。完整指南： [Rescue-bot guide](/zh/gateway/multiple-gateways#rescue-bot-guide)。

### Dev profile（`--dev`）

快速通道：运行完全隔离的 dev 实例（config/state/workspace），不影响主环境。

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
# 然后指向 dev 实例：
openclaw --dev status
openclaw --dev health
```

默认值（可通过 env/flags/config 覆盖）：

- `OPENCLAW_STATE_DIR=~/.openclaw-dev`
- `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
- `OPENCLAW_GATEWAY_PORT=19001`（Gateway WS + HTTP）
- 浏览器控制服务端口 = `19003`（派生：`gateway.port+2`，仅 loopback）
- `canvasHost.port=19005`（派生：`gateway.port+4`）
- 当你在 `--dev` 下运行 `setup`/`onboard` 时，`agents.defaults.workspace` 默认变为 `~/.openclaw/workspace-dev`。

派生端口（经验规则）：

- 基础端口 = `gateway.port`（或 `OPENCLAW_GATEWAY_PORT` / `--port`）
- 浏览器控制服务端口 = 基础 + 2（仅 loopback）
- `canvasHost.port = base + 4`（或 `OPENCLAW_CANVAS_HOST_PORT` / config 覆盖）
- 浏览器 profile 的 CDP 端口从 `browser.controlPort + 9 .. + 108` 自动分配（按 profile 持久化）。

每个实例检查清单：

- 唯一 `gateway.port`
- 唯一 `OPENCLAW_CONFIG_PATH`
- 唯一 `OPENCLAW_STATE_DIR`
- 唯一 `agents.defaults.workspace`
- 分离 WhatsApp 号码（若使用 WA）

按 profile 安装服务：

```bash
openclaw --profile main gateway install
openclaw --profile rescue gateway install
```

示例：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw gateway --port 19001
OPENCLAW_CONFIG_PATH=~/.openclaw/b.json OPENCLAW_STATE_DIR=~/.openclaw-b openclaw gateway --port 19002
```

## 协议（运营视角）

- 完整文档： [Gateway 协议](/zh/gateway/protocol) 与 [桥接 protocol（旧）](/zh/gateway/bridge-protocol)。
- 客户端首帧必须是 `req {type:"req", id, method:"connect", params:{minProtocol,maxProtocol,client:{id,displayName?,version,platform,deviceFamily?,modelIdentifier?,mode,instanceId?}, caps, auth?, locale?, userAgent? } }`。
- Gateway 回复 `res {type:"res", id, ok:true, payload:hello-ok }`（或 `ok:false` + error 后关闭）。
- 握手后：
  - Requests: `{type:"req", id, method, params}` → `{type:"res", id, ok, payload|error}`
  - Events: `{type:"event", event, payload, seq?, stateVersion?}`
- 结构化 presence 条目：`{host, ip, version, platform?, deviceFamily?, modelIdentifier?, mode, lastInputSeconds?, ts, reason?, tags?[], instanceId? }`（对 WS 客户端，`instanceId` 来自 `connect.client.instanceId`）。
- `agent` 响应是两阶段：先 `res` ack `{runId,status:"accepted"}`，运行结束后再返回最终 `res` `{runId,status:"ok"|"error",summary}`；流式输出以 `event:"agent"` 发送。

## 方法（初始集合）

- `health` — 完整健康快照（与 `openclaw health --json` 同形）。
- `status` — 简短摘要。
- `system-presence` — 当前 presence 列表。
- `system-event` — 发送 presence/system 注记（结构化）。
- `send` — 通过活动渠道发送消息。
- `agent` — 运行 agent 回合（在同连接上流式事件）。
- `node.list` — 列出已配对 + 当前连接的 nodes（包含 `caps`、`deviceFamily`、`modelIdentifier`、`paired`、`connected` 与声明的 `commands`）。
- `node.describe` — 描述 node（能力 + 支持的 `node.invoke` 命令；适用于已配对与当前连接的未配对 node）。
- `node.invoke` — 调用 node 命令（例如 `canvas.*`、`camera.*`）。
- `node.pair.*` — 配对生命周期（`request`、`list`、`approve`、`reject`、`verify`）。

另见：[Presence](/zh/concepts/presence) 了解 presence 的生成/去重以及稳定 `client.instanceId` 的重要性。

## 事件

- `agent` — agent 运行中的工具/输出事件（带 seq）。
- `presence` — presence 更新（带 stateVersion 的增量），推送给所有连接客户端。
- `tick` — 周期性 keepalive/no-op。
- `shutdown` — Gateway 即将退出；payload 含 `reason` 与可选 `restartExpectedMs`。客户端应重连。

## WebChat 集成

- WebChat 是原生 SwiftUI UI，直接通过 Gateway WebSocket 获取历史、发送/中止与事件。
- 远程使用走同一 SSH/Tailscale 隧道；若配置了 gateway token，客户端在 `connect` 中携带。
- macOS app 通过单一 WS 连接；初始快照注入 presence，并监听 `presence` 事件更新 UI。

## Typing 与校验

- 服务器用 AJV 对每个入站 frame 进行 JSON Schema 校验（从协议定义生成）。
- 客户端（TS/Swift）消费生成的类型（TS 直接使用；Swift 通过仓库生成器）。
- 协议定义是事实来源；重生成 schema/models：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`

## 连接快照

- `hello-ok` 包含 `snapshot`（`presence`、`health`、`stateVersion`、`uptimeMs`）以及 `policy {maxPayload,maxBufferedBytes,tickIntervalMs}`，使客户端无需额外请求即可立即渲染。
- `health`/`system-presence` 仍可用于手动刷新，但并非连接时必需。

## 错误码（res.error 形态）

- 错误使用 `{ code, message, details?, retryable?, retryAfterMs? }`。
- 标准码：
  - `NOT_LINKED` — WhatsApp 未认证。
  - `AGENT_TIMEOUT` — agent 未在截止时间内响应。
  - `INVALID_REQUEST` — schema/参数校验失败。
  - `UNAVAILABLE` — Gateway 正在关闭或依赖不可用。

## Keepalive 行为

- 周期性发送 `tick`（或 WS ping/pong）以保持客户端知道 Gateway 存活。
- send/agent 的 ack 仍是独立响应；不要让 tick 承担该职责。

## 重放 / 缺口

- 事件不会重放。客户端检测到 seq 缺口后应刷新（`health` + `system-presence`）再继续。WebChat 与 macOS 客户端现会在缺口时自动刷新。

## 监督（macOS 示例）

- 使用 launchd 保活：
  - Program：`openclaw` 路径
  - Arguments：`gateway`
  - KeepAlive: true
  - StandardOut/Err：文件路径或 `syslog`
- 失败时 launchd 自动重启；致命配置错误应持续退出以提醒运营者。
- LaunchAgents 按用户生效且需登录；无头部署使用自定义 LaunchDaemon（不随包发布）。
  - `openclaw gateway install` 写入 `~/Library/LaunchAgents/bot.molt.gateway.plist`
    （或 `bot.molt.<profile>.plist`；旧 `com.openclaw.*` 会清理）。
  - `openclaw doctor` 会审计 LaunchAgent 配置并可更新到当前默认值。

## Gateway 服务管理（CLI）

使用 Gateway CLI 进行安装/启动/停止/重启/状态：

```bash
openclaw gateway status
openclaw gateway install
openclaw gateway stop
openclaw gateway restart
openclaw logs --follow
```

注：

- `gateway status` 默认通过服务解析出的端口/配置探测 Gateway RPC（可用 `--url` 覆盖）。
- `gateway status --deep` 额外扫描系统级配置（LaunchDaemons/system units）。
- `gateway status --no-probe` 跳过 RPC 探测（网络异常时有用）。
- `gateway status --json` 对脚本稳定。
- `gateway status` 分开报告**supervisor 运行状态**（launchd/systemd 运行）与**RPC 可达性**（WS connect + status RPC）。
- `gateway status` 会打印 config 路径与探测目标，避免“localhost vs LAN bind”混淆及 profile 不匹配。
- `gateway status` 在服务看起来运行但端口关闭时包含最后一行 gateway 错误。
- `logs` 通过 RPC 跟踪 Gateway 文件日志（无需手动 `tail`/`grep`）。
- 若检测到其他 gateway-like 服务，CLI 会告警，除非它们是 OpenClaw profile 服务。
  我们仍推荐多数场景**每台机器一个 gateway**；冗余或救援 bot 使用隔离 profile/端口。见 [多 Gateway](/zh/gateway/multiple-gateways)。
  - 清理：`openclaw gateway uninstall`（当前服务）与 `openclaw doctor`（旧迁移）。
- `gateway install` 在已安装时为 no-op；使用 `openclaw gateway install --force` 重新安装（profile/env/path 变更）。

Bundled mac app：

- OpenClaw.app 可打包 Node-based gateway relay 并安装 per-user LaunchAgent，标签为
  `bot.molt.gateway`（或 `bot.molt.<profile>`；旧 `com.openclaw.*` 标签仍可干净卸载）。
- 需要干净停止时，使用 `openclaw gateway stop`（或 `launchctl bootout gui/$UID/bot.molt.gateway`）。
- 重启使用 `openclaw gateway restart`（或 `launchctl kickstart -k gui/$UID/bot.molt.gateway`）。
  - `launchctl` 仅在已安装 LaunchAgent 时可用；否则先用 `openclaw gateway install`。
  - 运行具名 profile 时将标签替换为 `bot.molt.<profile>`。

## 监督（systemd 用户单元）

OpenClaw 在 Linux/WSL2 默认安装 **systemd 用户服务**。单用户机器推荐用户服务（环境更简单、按用户配置）。多用户或常驻服务器建议使用**系统服务**（无需 linger、共享 supervision）。

`openclaw gateway install` 写入用户单元。`openclaw doctor` 会审计单元并更新为推荐默认值。

创建 `~/.config/systemd/user/openclaw-gateway[-<profile>].service`：

```
[Unit]
Description=OpenClaw Gateway (profile: <profile>, v<version>)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
Environment=OPENCLAW_GATEWAY_TOKEN=
WorkingDirectory=/home/youruser

[Install]
WantedBy=default.target
```

启用 linger（需要，确保用户服务在注销/空闲后存活）：

```
sudo loginctl enable-linger youruser
```

Onboarding 会在 Linux/WSL2 上执行此操作（可能提示 sudo；写入 `/var/lib/systemd/linger`）。
然后启用服务：

```
systemctl --user enable --now openclaw-gateway[-<profile>].service
```

**替代方案（系统服务）**：常驻或多用户服务器可安装 systemd **system** 单元（无需 linger）。创建 `/etc/systemd/system/openclaw-gateway[-<profile>].service`（复制上面的单元，改 `WantedBy=multi-user.target`，设置 `User=` + `WorkingDirectory=`），然后：

```
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

## Windows（WSL2）

Windows 安装应使用 **WSL2** 并遵循上面的 Linux systemd 章节。

## 运行检查

- 存活性：打开 WS 并发送 `req:connect` → 期望 `res` 且 `payload.type="hello-ok"`（含 snapshot）。
- 就绪性：调用 `health` → 期望 `ok: true` 且在适用时 `linkChannel` 已链接。
- 调试：订阅 `tick` 与 `presence` 事件；确保 `status` 显示链接/认证年龄；presence 条目显示 Gateway 主机与连接客户端。

## 安全保证

- 默认每台主机一个 Gateway；若运行多个 profile，隔离端口/状态并指向正确实例。
- 不回退到直接 Baileys 连接；Gateway 不可用时发送会快速失败。
- 非 connect 首帧或错误 JSON 会被拒绝并关闭 socket。
- 优雅关闭：关闭前发送 `shutdown` 事件；客户端需处理 close + 重连。

## CLI 辅助

- `openclaw gateway health|status` — 通过 Gateway WS 请求 health/status。
- `openclaw message send --target <num> --message "hi" [--media ...]` — 通过 Gateway 发送（WhatsApp 可幂等）。
- `openclaw agent --message "hi" --to <num>` — 运行 agent 回合（默认等待最终响应）。
- `openclaw gateway call <method> --params '{"k":"v"}'` — 调试用原始方法调用器。
- `openclaw gateway stop|restart` — 停止/重启受监督的 gateway 服务（launchd/systemd）。
- Gateway 辅助子命令假定 `--url` 上已有运行的 gateway；不再自动启动。

## 迁移指引

- 弃用 `openclaw gateway` 的旧 TCP 控制端口。
- 更新客户端以使用 WS 协议（强制 connect + 结构化 presence）。
