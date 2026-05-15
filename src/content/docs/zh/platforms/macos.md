---
summary: "OpenClaw macOS 伴侣应用（菜单栏 + 网关代理）"
read_when:
  - Implementing macOS app features
  - Changing gateway lifecycle or node bridging on macOS
title: "macOS 应用"
---

macOS 应用是 OpenClaw 的**菜单栏伴侣**。它拥有权限，在本地管理/连接到 Gateway（通过 launchd 或手动），并将 macOS 功能作为节点暴露给代理。

## 功能

- 在菜单栏中显示原生通知和状态。
- 拥有 TCC 提示（通知、辅助功能、屏幕录制、麦克风、语音识别、自动化/AppleScript）。
- 运行或连接到 Gateway(网关)（本地或远程）。
- 暴露仅限 macOS 的工具（Canvas、Camera、Screen Recording、macOSCanvas`system.run`）。
- 在**远程**模式下启动本地节点主机服务，并在**本地**模式下停止它。
- 可选地托管 **PeekabooBridge** 用于 UI 自动化。
- 根据请求通过 npm、pnpm 或 bun 安装全局 CLI（`openclaw`）（应用首选 npm，其次是 pnpm，然后是 bun；Node 仍然是推荐的 Gateway(网关) 运行时）。

## 本地与远程模式

- **本地**（默认）：如果存在正在运行的本地 Gateway(网关)，应用将连接到它；否则，它通过 `openclaw gateway install` 启用 launchd 服务。
- **远程**：应用通过 SSH/Tailscale 连接到 Gateway(网关)，并且从不启动本地进程。应用启动本地**节点主机服务**，以便远程 Gateway(网关) 可以访问这台 Mac。应用不会将 Gateway(网关) 作为子进程生成。Gateway(网关)发现现在优先使用 Tailscale MagicDNS 名称而不是原始 tailnet IP，因此当 tailnet IP 更改时，Mac 应用能更可靠地恢复。

## Launchd 控制

该应用管理一个标记为 `ai.openclaw.gateway` 的每用户 LaunchAgent（在使用 `--profile`/`OPENCLAW_PROFILE` 时为 `ai.openclaw.<profile>`；旧的 `com.openclaw.*` 仍会卸载）。

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

运行命名配置文件时，将标签替换为 `ai.openclaw.<profile>`。

如果未安装 LaunchAgent，请从应用中启用它或运行
`openclaw gateway install`。

## 节点功能

macOS 应用将自己呈现为一个节点。常用命令：

- Canvas：`canvas.present`，`canvas.navigate`，`canvas.eval`，`canvas.snapshot`，`canvas.a2ui.*`
- 摄像头：`camera.snap`, `camera.clip`
- 屏幕：`screen.snapshot`, `screen.record`
- 系统：`system.run`, `system.notify`

节点报告 `permissions` 映射，以便代理决定允许执行的操作。

节点服务 + 应用 IPC：

- 当无头节点主机服务运行时（远程模式），它会作为节点连接到 Gateway(网关) WS。
- `system.run` 在 macOS 应用（UI/TCC 上下文）中通过本地 Unix 套接字执行；提示和输出保留在应用内。

图表 (SCI)：

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + TCC + system.run)
```

## 执行批准 (system.run)

`system.run` 由 macOS 应用中的 **执行批准** 控制（设置 → 执行批准）。
安全性 + 询问 + 允许列表本地存储在 Mac 的以下位置：

```
~/.openclaw/exec-approvals.json
```

示例：

```json
{
  "version": 1,
  "defaults": {
    "security": "deny",
    "ask": "on-miss"
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "allowlist": [{ "pattern": "/opt/homebrew/bin/rg" }]
    }
  }
}
```

注意：

- `allowlist` 条目是已解析二进制路径的 glob 模式，或者是通过 PATH 调用的命令的裸命令名称。
- 包含 shell 控制或扩展语法（`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) 的原始 shell 命令文本将被视为允许列表未命中，并需要显式批准（或将 shell 二进制文件加入允许列表）。
- 在提示中选择“始终允许”会将该命令添加到允许列表中。
- `system.run` 环境覆盖项会被过滤（丢弃 `PATH`、`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`），然后与应用的环境合并。
- 对于 Shell 封装器 (`bash|sh|zsh ... -c/-lc`)，请求作用域的环境变量覆盖被缩减为一小部分显式允许列表 (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`)。
- 对于允许列表模式下的“始终允许”决策，已知的调度封装器 (`env`, `nice`, `nohup`, `stdbuf`, `timeout`) 会持久化内部可执行文件路径，而不是封装器路径。如果解包不安全，则不会自动持久化允许列表条目。

## 深度链接

该应用注册了 `openclaw://` URL 方案以用于本地操作。

### `openclaw://agent`

触发 Gateway(网关) `agent` 请求。

```bash
open 'openclaw://agent?message=Hello%20from%20deep%20link'
```

查询参数：

- `message` (必需)
- `sessionKey` (可选)
- `thinking` (可选)
- `deliver` / `to` / `channel` (可选)
- `timeoutSeconds` (可选)
- `key` (可选无人值守模式密钥)

安全性：

- 如果没有 `key`，应用会提示确认。
- 如果没有 `key`，应用会对确认提示实施短消息限制，并忽略 `deliver` / `to` / `channel`。
- 如果拥有有效的 `key`，运行将无人值守（旨在用于个人自动化）。

## 新手引导流程（典型）

1. 安装并启动 **OpenClaw.app**。
2. 完成权限检查清单（TCC 提示）。
3. 确保 **Local** 模式处于活动状态且 Gateway(网关) 正在运行。
4. 如果需要终端访问权限，请安装 CLI。

## 状态目录存放位置 (macOS)

避免将 OpenClaw 状态目录放在 iCloud 或其他云端同步文件夹中。
同步支持的路径可能会增加延迟，并偶尔导致会话和凭据的文件锁定/同步竞争。

最好选择本地非同步的状态路径，例如：

```bash
OPENCLAW_STATE_DIR=~/.openclaw
```

如果 `openclaw doctor` 检测到以下位置的状态：

- `~/Library/Mobile Documents/com~apple~CloudDocs/...`
- `~/Library/CloudStorage/...`

它将发出警告并建议移回本地路径。

## 构建和开发工作流（原生）

- `cd apps/macos && swift build`
- `swift run OpenClaw` (或 Xcode)
- 打包应用：`scripts/package-mac-app.sh`

## 调试网关连接性（macOS CLI）

使用调试 CLI 来测试与 macOS 应用相同的 Gateway WebSocket 握手和设备发现
逻辑，而无需启动应用。

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

连接选项：

- `--url <ws://host:port>`: 覆盖配置
- `--mode <local|remote>`: 从配置解析（默认：config 或 local）
- `--probe`: 强制进行全新的健康探测
- `--timeout <ms>`: 请求超时（默认：`15000`）
- `--json`: 用于差异比较的结构化输出

发现选项：

- `--include-local`：包含将被过滤为“本地”的网关
- `--timeout <ms>`: 整体发现窗口（默认：`2000`）
- `--json`: 用于比较的结构化输出

<Tip>与 `openclaw gateway discover --json` 进行比较，以查看 macOS 应用的发现管道（`local.` 加上配置的广域网域，以及广域网和 Tailscale Serve 回退机制）是否与 Node CLI 基于 `dns-sd` 的发现有所不同。</Tip>

## 远程连接管道（SSH 隧道）

当 macOS 应用在 **Remote**（远程）模式下运行时，它会打开一个 SSH 隧道，以便本地 UI 组件可以与远程 Gateway(网关) 通信，就像它在 localhost 上一样。

### 控制隧道（Gateway(网关) WebSocket 端口）

- **用途：** 健康检查、状态、Web 聊天、配置以及其他控制平面调用。
- **本地端口：** Gateway(网关) 端口（默认 `18789`），始终稳定。
- **远程端口：** 远程主机上的同一个 Gateway(网关) 端口。
- **行为：** 没有随机的本地端口；应用会复用现有的健康隧道，或者在需要时重启它。
- **SSH 形状：** `ssh -N -L <local>:127.0.0.1:<remote>`，带有 BatchMode +
  ExitOnForwardFailure + keepalive 选项。
- **IP 报告：** SSH 隧道使用环回，因此 Gateway 会将节点 IP 视为 `127.0.0.1`。如果您希望显示真实的客户端 IP，请使用 **Direct (ws/wss)** 传输（请参阅 [macOS 远程访问](/zh/platforms/mac/remote)）。

有关设置步骤，请参阅 [macOS 远程访问](/zh/platforms/mac/remote)。有关协议详细信息，请参阅 [Gateway 协议](/zh/gateway/protocol)。

## 相关文档

- [Gateway 运维手册](/zh/gateway)
- [Gateway (macOS)](/zh/platforms/mac/bundled-gateway)
- [macOS 权限](/zh/platforms/mac/permissions)
- [Canvas](/zh/platforms/mac/canvas)
