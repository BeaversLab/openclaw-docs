---
title: "macOS 应用"
summary: "OpenClaw macOS 伴侣应用（菜单栏 + gateway broker）"
read_when:
  - 你在实现 macOS app 功能
  - 你在调整 macOS 上的 gateway 生命周期或节点桥接
---
# OpenClaw macOS Companion（菜单栏 + gateway broker）

macOS 应用是 OpenClaw 的**菜单栏伴侣**。它掌管权限，管理/连接本地 Gateway（launchd 或手动），并以节点形式把 macOS 能力暴露给 agent。

## 功能

- 在菜单栏显示原生通知与状态。
- 负责 TCC 弹窗（通知、辅助功能、屏幕录制、麦克风、语音识别、自动化/AppleScript）。
- 运行或连接 Gateway（本地或远程）。
- 暴露 macOS 专用工具（Canvas、Camera、Screen Recording、`system.run`）。
- 在**远程**模式启动本地 node host 服务（launchd），在**本地**模式停止。
- 可选托管 **PeekabooBridge** 用于 UI 自动化。
- 可按需通过 npm/pnpm 安装全局 CLI（`openclaw`）（不推荐用 bun 作为 Gateway 运行时）。

## 本地 vs 远程模式

- **Local**（默认）：如果本地已有 Gateway 则连接；否则通过 `openclaw gateway install` 启用 launchd 服务。
- **Remote**：通过 SSH/Tailscale 连接远程 Gateway，不启动本地进程。
  同时启动本地 **node host 服务**，让远程 Gateway 能访问这台 Mac。
应用不会把 Gateway 作为子进程启动。

## Launchd 控制

应用管理一个用户级 LaunchAgent，label 为 `bot.molt.gateway`
（使用 `--profile`/`OPENCLAW_PROFILE` 时为 `bot.molt.<profile>`；旧的 `com.openclaw.*` 也仍可卸载）。

```bash
launchctl kickstart -k gui/$UID/bot.molt.gateway
launchctl bootout gui/$UID/bot.molt.gateway
```

如使用命名 profile，请将 label 替换为 `bot.molt.<profile>`。

如果 LaunchAgent 尚未安装，可在应用中启用，或运行 `openclaw gateway install`。

## Node 能力（mac）

macOS 应用会以 node 身份呈现。常用命令：

- Canvas：`canvas.present`, `canvas.navigate`, `canvas.eval`, `canvas.snapshot`, `canvas.a2ui.*`
- Camera：`camera.snap`, `camera.clip`
- Screen：`screen.record`
- System：`system.run`, `system.notify`

该 node 会上报一个 `permissions` map，供 agent 判断允许项。

Node 服务 + 应用 IPC：
- 当 headless node host 服务运行（远程模式），它会作为 node 连接到 Gateway WS。
- `system.run` 在 macOS app 内执行（UI/TCC 上下文），通过本地 Unix socket；提示与输出都在应用内。

图示（SCI）：
```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + TCC + system.run)
```

## Exec approvals（system.run）

`system.run` 由 macOS app 的 **Exec approvals** 控制（Settings → Exec approvals）。
安全策略 + 询问 + allowlist 存在本机：

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
      "allowlist": [
        { "pattern": "/opt/homebrew/bin/rg" }
      ]
    }
  }
}
```

注意：
- `allowlist` 条目是解析后的二进制路径的 glob 模式。
- 在提示中选择 “Always Allow” 会把该命令加入 allowlist。
- `system.run` 的环境变量覆盖会被过滤（丢弃 `PATH`、`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`），然后与应用环境合并。

## Deep links

应用注册了 `openclaw://` URL scheme 供本地动作使用。

### `openclaw://agent`

触发 Gateway 的 `agent` 请求。

```bash
open 'openclaw://agent?message=Hello%20from%20deep%20link'
```

Query 参数：
- `message`（必填）
- `sessionKey`（可选）
- `thinking`（可选）
- `deliver` / `to` / `channel`（可选）
- `timeoutSeconds`（可选）
- `key`（可选，unattended mode key）

安全性：
- 没有 `key` 时，应用会提示确认。
- 有有效 `key` 时，会进入 unattended（用于个人自动化）。

## Onboarding flow（典型）

1) 安装并启动 **OpenClaw.app**。
2) 完成权限清单（TCC 弹窗）。
3) 确保处于 **Local** 模式且 Gateway 在运行。
4) 若需终端访问，安装 CLI。

## Build & dev workflow（原生）

- `cd apps/macos && swift build`
- `swift run OpenClaw`（或 Xcode）
- 打包应用：`scripts/package-mac-app.sh`

## Debug gateway connectivity（macOS CLI）

使用 debug CLI 走与 macOS app 相同的 Gateway WebSocket 握手与发现逻辑，无需启动应用。

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

连接选项：
- `--url <ws://host:port>`：覆盖配置
- `--mode <local|remote>`：从配置解析（默认：配置或 local）
- `--probe`：强制重新 health probe
- `--timeout <ms>`：请求超时（默认 `15000`）
- `--json`：结构化输出，便于对比

发现选项：
- `--include-local`：包含原本会被过滤为“local”的 gateways
- `--timeout <ms>`：整体发现窗口（默认 `2000`）
- `--json`：结构化输出，便于对比

提示：可对照 `openclaw gateway discover --json` 查看 macOS app 的发现管线（NWBrowser + tailnet DNS‑SD 兜底）与 Node CLI 基于 `dns-sd` 的发现是否不同。

## Remote connection plumbing（SSH tunnels）

当 macOS app 运行在 **Remote** 模式时，会打开 SSH 隧道，让本地 UI 组件把远程 Gateway 当作 localhost 访问。

### 控制隧道（Gateway WebSocket 端口）
- **目的：**健康检查、状态、Web Chat、配置等控制面调用。
- **本地端口：**Gateway 端口（默认 `18789`），始终固定。
- **远程端口：**远端主机上的同一 Gateway 端口。
- **行为：**不使用随机本地端口；应用会复用已有健康隧道，必要时重启。
- **SSH 形态：**`ssh -N -L <local>:127.0.0.1:<remote>`，带 BatchMode + ExitOnForwardFailure + keepalive。
- **IP 呈现：**SSH 隧道使用 loopback，因此 gateway 看到的 node IP 为 `127.0.0.1`。如需显示真实客户端 IP，请使用 **Direct (ws/wss)** 传输（见 [macOS remote access](/zh/platforms/mac/remote)）。

设置步骤见 [macOS remote access](/zh/platforms/mac/remote)。协议细节见 [Gateway protocol](/zh/gateway/protocol)。

## 相关文档

- [Gateway runbook](/zh/gateway)
- [Gateway (macOS)](/zh/platforms/mac/bundled-gateway)
- [macOS permissions](/zh/platforms/mac/permissions)
- [Canvas](/zh/platforms/mac/canvas)
