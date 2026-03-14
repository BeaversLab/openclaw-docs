---
summary: "OpenClaw macOS 伴侣应用（菜单栏 + 网关代理）"
read_when:
  - Implementing macOS app features
  - Changing gateway lifecycle or node bridging on macOS
title: "macOS 应用"
---

# OpenClaw macOS 伴侣（菜单栏 + 网关代理）

该 macOS 应用是 OpenClaw 的**菜单栏伴侣**。它拥有权限，
在本地管理/连接 Gateway 网关（通过 launchd 或手动），并将 macOS
功能作为节点暴露给代理。

## 功能介绍

- 在菜单栏中显示原生通知和状态。
- 拥有 TCC 提示权限（通知、辅助功能、屏幕录制、麦克风、语音识别、自动化/AppleScript）。
- 运行或连接到 Gateway(网关)（本地或远程）。
- 公开 macOS 专用工具（Canvas、Camera、Screen Recording、`system.run`）。
- 在 **remote** 模式（launchd）下启动本地节点主机服务，并在 **local** 模式下停止它。
- 可选择托管 **PeekabooBridge** 以进行 UI 自动化。
- 根据请求通过 npm/pnpm 安装全局 CLI (`openclaw`)（不建议将 bun 用于 Gateway(网关) 运行时）。

## Local vs remote mode

- **Local** (默认)：如果存在正在运行的本地 Gateway(网关)，应用程序将附加到它；否则，它通过 `openclaw gateway install` 启用 launchd 服务。
- **Remote（远程模式）**：该应用通过 SSH/Tailscale 连接到 Gateway(网关)，且从不启动
  本地进程。
  该应用会启动本地 **node host service（节点主机服务）**，以便远程 Gateway(网关) 能够连接到此 Mac。
  该应用不会将 Gateway(网关) 作为子进程生成。

## Launchd control

该应用程序管理一个标记为 `ai.openclaw.gateway` 的每用户 LaunchAgent
（在使用 `--profile`/`OPENCLAW_PROFILE` 时为 `ai.openclaw.<profile>`；传统的 `com.openclaw.*` 仍会卸载）。

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

运行命名配置文件时，请将标签替换为 `ai.openclaw.<profile>`。

如果未安装 LaunchAgent，请从应用程序中启用它或运行
`openclaw gateway install`。

## Node capabilities (mac)

macOS 应用程序将自己展示为一个节点。常用命令：

- Canvas: `canvas.present`, `canvas.navigate`, `canvas.eval`, `canvas.snapshot`, `canvas.a2ui.*`
- Camera：`camera.snap`，`camera.clip`
- Screen：`screen.record`
- System：`system.run`，`system.notify`

节点报告 `permissions` 映射，以便代理可以决定允许的内容。

Node service + app IPC:

- 当无头节点主机服务正在运行（远程模式）时，它作为节点连接到 Gateway(网关) WS。
- `system.run` 在 macOS 应用（UI/TCC 上下文）中通过本地 Unix 套接字执行；提示和输出保留在应用内。

图表 (SCI)：

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + TCC + system.run)
```

## 执行批准 (system.run)

`system.run` 由 macOS 应用中的 **Exec approvals**（设置 → 执行批准）控制。
安全性 + 询问 + 允许列表本地存储在 Mac 上的以下位置：

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

备注：

- `allowlist` 条目是已解析二进制路径的 glob 模式。
- 包含 shell 控制或扩展语法（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`）的原始 shell 命令文本被视为允许列表未命中，需要明确批准（或将 shell 二进制文件加入允许列表）。
- 在提示中选择“始终允许”会将该命令添加到允许列表中。
- `system.run` 环境覆盖项会被过滤（丢弃 `PATH`、`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`），然后与应用的环境合并。
- 对于 shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围的环境覆盖项会缩减为一小部分明确的允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
- 在允许列表模式下，对于“始终允许”的决定，已知的调度包装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）将保留内部可执行文件路径而不是包装器路径。如果解包不安全，则不会自动保留允许列表条目。

## 深层链接

该应用注册了 `openclaw://` URL scheme 用于本地操作。

### `openclaw://agent`

触发 Gateway `agent` 请求。

```bash
open 'openclaw://agent?message=Hello%20from%20deep%20link'
```

查询参数：

- `message`（必需）
- `sessionKey`（可选）
- `thinking`（可选）
- `deliver` / `to` / `channel`（可选）
- `timeoutSeconds`（可选）
- `key`（可选无人值守模式密钥）

安全性：

- 如果没有 `key`，应用会提示确认。
- 如果没有 `key`，应用会对确认提示执行短消息限制，并忽略 `deliver` / `to` / `channel`。
- 使用有效的 `key`，运行将是无人值守的（旨在用于个人自动化）。

## 新手引导流程（典型）

1. 安装并启动 **OpenClaw.app**。
2. 完成权限检查清单（TCC 提示）。
3. 确保 **Local(本地)** 模式处于活动状态且 Gateway(网关) 正在运行。
4. 如果您需要终端访问，请安装 CLI。

## 状态目录位置（macOS）

避免将您的 OpenClaw 状态目录放在 iCloud 或其他云同步文件夹中。
同步支持的路径可能会增加延迟，并偶尔导致会话和凭据出现文件锁定/同步竞争。

最好使用本地非同步状态路径，例如：

```bash
OPENCLAW_STATE_DIR=~/.openclaw
```

如果 `openclaw doctor` 检测到以下位置的状态：

- `~/Library/Mobile Documents/com~apple~CloudDocs/...`
- `~/Library/CloudStorage/...`

它将发出警告并建议移回本地路径。

## 构建与开发工作流（原生）

- `cd apps/macos && swift build`
- `swift run OpenClaw`（或 Xcode）
- 打包应用：`scripts/package-mac-app.sh`

## 调试 Gateway 网关连接（macOS CLI）

使用调试 CLI 来执行与 macOS 应用相同的 Gateway WebSocket 握手和发现逻辑，而无需启动应用。

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

连接选项：

- `--url <ws://host:port>`：覆盖配置
- `--mode <local|remote>`：从配置解析（默认：config 或 local）
- `--probe`：强制进行新的健康探测
- `--timeout <ms>`：请求超时（默认：`15000`）
- `--json`：用于差异比较的结构化输出

设备发现选项：

- `--include-local`：包含将被过滤为“本地”的 gateway
- `--timeout <ms>`：整体设备发现窗口（默认：`2000`）
- `--json`：用于差异比较的结构化输出

提示：与 `openclaw gateway discover --json` 进行比较，以查看
macOS 应用的设备发现管道（NWBrowser + tailnet DNS‑SD 回退）是否与
Node CLI 基于 `dns-sd` 的设备发现不同。

## 远程连接管道（SSH 隧道）

当 macOS 应用在 **Remote**（远程）模式下运行时，它会打开一个 SSH 隧道，以便本地 UI 组件可以与远程 Gateway(网关) 通信，就像它在 localhost 上一样。

### 控制通道（Gateway(网关) WebSocket 端口）

- **用途：** 健康检查、状态、Web Chat、配置和其他控制平面调用。
- **本地端口：**Gateway(网关) 端口（默认 `18789`），始终稳定。
- **远程端口：** 远程主机上相同的 Gateway(网关) 端口。
- **行为：** 没有随机本地端口；应用会重用现有的健康隧道
  或在需要时重新启动它。
- **SSH 形状：** `ssh -N -L <local>:127.0.0.1:<remote>` 配合 BatchMode +
  ExitOnForwardFailure + keepalive 选项。
- **IP 报告：** SSH 隧道使用环回地址，因此 Gateway 网关看到的节点
  IP 为 `127.0.0.1`。如果您希望显示真实的客户端
  IP，请使用 **直接** 传输方式（请参阅 [macOS 远程访问](/en/platforms/mac/remote)）。

有关设置步骤，请参阅 [macOS 远程访问](/en/platforms/mac/remote)。有关协议详细信息，请参阅 [Gateway(网关) 协议](/en/gateway/protocol)。

## 相关文档

- [Gateway(网关) 运行手册](/en/gateway)
- [Gateway (macOS)](/en/platforms/mac/bundled-gateway)
- [macOS 权限](/en/platforms/mac/permissions)
- [Canvas](/en/platforms/mac/canvas)

import zh from '/components/footer/zh.mdx';

<zh />
