---
summary: "OpenClaw macOS 伴侣应用（菜单栏 + 网关代理）"
read_when:
  - Implementing macOS app features
  - Changing gateway lifecycle or node bridging on macOS
title: "macOS 应用"
---

# OpenClaw macOS 伴侣（菜单栏 + 网关代理）

该 macOS 应用是 OpenClaw 的**菜单栏伴侣**。它拥有权限，
在本地管理/连接网关（通过 launchd 或手动），并将 macOS
功能作为节点暴露给代理。

## 功能介绍

- 在菜单栏中显示原生通知和状态。
- 拥有 TCC 提示（通知、辅助功能、屏幕录制、麦克风、
  语音识别、自动化/AppleScript）。
- 运行或连接到网关（本地或远程）。
- 提供仅限 macOS 的工具（Canvas、Camera、Screen Recording、`system.run`）。
- 在**远程**模式下启动本地节点主机服务（通过 launchd），并在**本地**模式下停止它。
- 可选择托管用于 UI 自动化的 **PeekabooBridge**。
- 根据请求通过 npm/pnpm 安装全局 CLI（`openclaw`）（不建议将 bun 用于 Gateway 运行时）。

## 本地与远程模式

- **本地**（默认）：如果存在正在运行的本地网关，应用会连接到它；
  否则它通过 `openclaw gateway install` 启用 launchd 服务。
- **远程**：应用通过 SSH/Tailscale 连接到网关，并且永不启动
  本地进程。
  应用会启动本地**节点主机服务**，以便远程网关可以访问此 Mac。
  应用不会将网关作为子进程生成。

## Launchd 控制

该应用管理一个标记为 `ai.openclaw.gateway` 的每用户 LaunchAgent
（或在使用 `--profile`/`OPENCLAW_PROFILE` 时为 `ai.openclaw.<profile>`；旧的 `com.openclaw.*` 仍会被卸载）。

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

运行命名配置文件时，将标签替换为 `ai.openclaw.<profile>`。

如果未安装 LaunchAgent，请从应用中启用它或运行
`openclaw gateway install`。

## 节点功能

macOS 应用将自身呈现为一个节点。常用命令：

- Canvas：`canvas.present`、`canvas.navigate`、`canvas.eval`、`canvas.snapshot`、`canvas.a2ui.*`
- Camera：`camera.snap`、`camera.clip`
- Screen：`screen.record`
- System：`system.run`、`system.notify`

该节点报告一个 `permissions` 映射，以便代理可以决定允许执行的操作。

节点服务 + 应用 IPC：

- 当无头节点主机服务正在运行（远程模式）时，它会作为一个节点连接到 Gateway WS。
- `system.run` 在 macOS 应用（UI/TCC 上下文）中通过本地 Unix 套接字执行；提示和输出保留在应用内。

图表 (SCI)：

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + TCC + system.run)
```

## 执行批准 (system.run)

`system.run` 由 macOS 应用中的**执行批准**（Settings → Exec approvals）控制。
安全性 + 询问 + 允许列表均本地存储在 Mac 上的以下位置：

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

说明：

- `allowlist` 条目是已解析二进制路径的 glob 模式。
- 包含 shell 控制或扩展语法（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`) 的原始 shell 命令文本被视为允许列表未命中，需要显式批准（或将 shell 二进制文件加入允许列表）。
- 在提示中选择“始终允许”会将该命令添加到允许列表中。
- `system.run` 环境覆盖项会被过滤（丢弃 `PATH`、`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`），然后与应用的环境合并。
- 对于 shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围的环境覆盖项将缩减为一小部分显式允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
- 对于允许列表模式下的“始终允许”决策，已知的分发包装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）将持久化内部可执行文件路径而不是包装器路径。如果解包不安全，则不会自动持久化允许列表条目。

## 深度链接

该应用注册了 `openclaw://` URL 方案以用于本地操作。

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

- 如果没有 `key`，应用程序将提示进行确认。
- 如果没有 `key`，应用程序将对确认提示强制执行短消息限制，并忽略 `deliver` / `to` / `channel`。
- 使用有效的 `key`，运行将是无人值守的（旨在用于个人自动化）。

## 入门流程（典型）

1. 安装并启动 **OpenClaw.app**。
2. 完成权限检查清单（TCC 提示）。
3. 确保 **本地** 模式处于活动状态且 Gateway 正在运行。
4. 如果需要终端访问，请安装 CLI。

## 状态目录位置（macOS）

避免将 OpenClaw 状态目录放置在 iCloud 或其他云同步文件夹中。
同步支持的路径可能会增加延迟，并偶尔导致会话和凭据出现文件锁定/同步竞争。

首选本地非同步状态路径，例如：

```bash
OPENCLAW_STATE_DIR=~/.openclaw
```

如果 `openclaw doctor` 检测到以下位置的状态：

- `~/Library/Mobile Documents/com~apple~CloudDocs/...`
- `~/Library/CloudStorage/...`

它将发出警告并建议移回本地路径。

## 构建与开发工作流程（原生）

- `cd apps/macos && swift build`
- `swift run OpenClaw`（或 Xcode）
- 打包应用程序：`scripts/package-mac-app.sh`

## 调试 Gateway 连接性（macOS CLI）

使用调试 CLI 来执行与 macOS 应用程序相同的 Gateway WebSocket 握手和发现
逻辑，而无需启动应用程序。

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

连接选项：

- `--url <ws://host:port>`：覆盖配置
- `--mode <local|remote>`：从配置解析（默认：配置或本地）
- `--probe`：强制进行新的健康探测
- `--timeout <ms>`：请求超时（默认：`15000`）
- `--json`：用于差异比较的结构化输出

发现选项：

- `--include-local`：包含将被过滤为“本地”的 Gateway
- `--timeout <ms>`：总体发现窗口（默认：`2000`）
- `--json`：用于比对的结构化输出

提示：与 `openclaw gateway discover --json` 进行比对，以查看 macOS 应用的发现流程（NWBrowser + tailnet DNS‑SD 回退）是否与基于 Node CLI 的 `dns-sd` 发现有所不同。

## 远程连接管道（SSH 隧道）

当 macOS 应用运行在 **远程** 模式时，它会打开一个 SSH 隧道，以便本地 UI 组件可以与远程 Gateway 通信，就像它在 localhost 上一样。

### 控制隧道（Gateway WebSocket 端口）

- **目的：** 健康检查、状态、Web Chat、配置和其他控制平面调用。
- **本地端口：** Gateway 端口（默认 `18789`），始终稳定。
- **远程端口：** 远程主机上的同一 Gateway 端口。
- **行为：** 没有随机的本地端口；应用会重用现有的健康隧道
  或在需要时重新启动它。
- **SSH 形态：** 带有 BatchMode + 的 `ssh -N -L <local>:127.0.0.1:<remote>`
  ExitOnForwardFailure + keepalive 选项。
- **IP 报告：** SSH 隧道使用环回地址，因此 gateway 会看到节点
  IP 为 `127.0.0.1`。如果希望显示真实的客户端 IP，请使用 **Direct (ws/wss)** 传输（请参阅 [macOS 远程访问](/zh/en/platforms/mac/remote)）。

有关设置步骤，请参阅 [macOS 远程访问](/zh/en/platforms/mac/remote)。有关协议详细信息，请参阅 [Gateway 协议](/zh/en/gateway/protocol)。

## 相关文档

- [Gateway 操作手册](/zh/en/gateway)
- [Gateway (macOS)](/zh/en/platforms/mac/bundled-gateway)
- [macOS 权限](/zh/en/platforms/mac/permissions)
- [Canvas](/zh/en/platforms/mac/canvas)

import zh from '/components/footer/zh.mdx';

<zh />
