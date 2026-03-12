---
summary: "用于通过 SSH 控制远程 OpenClaw 网关的 macOS 应用流程"
read_when:
  - Setting up or debugging remote mac control
title: "远程控制"
---

# 远程 OpenClaw (macOS ⇄ 远程主机)

此流程允许 macOS 应用充当运行在另一台主机（桌面/服务器）上的 OpenClaw 网关的完整远程控制器。这是该应用的 **通过 SSH 远程** (remote run) 功能。所有功能——健康检查、语音唤醒转发 和 Web Chat——都复用 _Settings → General_ 中的同一远程 SSH 配置。

## 模式

- **本地 (此 Mac)**：所有内容均在笔记本电脑上运行。不涉及 SSH。
- **通过 SSH 远程 (默认)**：OpenClaw 命令在远程主机上执行。mac 应用会使用 `-o BatchMode` 以及您选择的身份/密钥 和本地端口转发 打开一个 SSH 连接。
- **远程直连 (ws/wss)**：无 SSH 隧道。mac 应用直接连接到网关 URL（例如，通过 Tailscale Serve 或公共 HTTPS 反向代理）。

## 远程传输

远程模式支持两种传输方式：

- **SSH 隧道** (默认)：使用 `ssh -N -L ...` 将网关端口转发到本地主机 (localhost)。由于隧道是回环的，网关看到的节点 IP 将为 `127.0.0.1`。
- **直连 (ws/wss)**：直接连接到网关 URL。网关看到的是真实的客户端 IP。

## 远程主机上的先决条件

1. 安装 Node + pnpm 并构建/安装 OpenClaw CLI (`pnpm install && pnpm build && pnpm link --global`)。
2. 确保 `openclaw` 在非交互式 shell 的 PATH 中（如有需要，可符号链接 到 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 开启带有密钥认证的 SSH。我们建议使用 **Tailscale** IP 以确保局域网外的稳定访问。

## macOS 应用设置

1. 打开 _Settings → General_。
2. 在 **OpenClaw runs** 下，选择 **Remote over SSH** 并设置：
   - **传输方式**：**SSH 隧道** 或 **直连 (ws/wss)**。
   - **SSH 目标**：`user@host` (可选 `:port`)。
     - 如果网关在同一局域网内并广播了 Bonjour，可以从发现列表中选择它以自动填充此字段。
   - **网关 URL** (仅限直连)：`wss://gateway.example.ts.net` (本地/LAN 使用 `ws://...`)。
   - **身份文件** (高级)：您的密钥路径。
   - **项目根目录** (高级)：用于命令的远程检出路径。
   - **CLI 路径** (高级)：可运行的 `openclaw` 入口点/二进制文件的可选路径 (广播时自动填充)。
3. 点击 **测试远程 (Test remote)**。成功表示远程 `openclaw status --json` 运行正常。失败通常意味着 PATH/CLI 问题；退出码 127 表示远程未找到 CLI。
4. 健康检查和 Web 聊天现在将通过此 SSH 隧道自动运行。

## Web 聊天

- **SSH 隧道**：Web 聊天通过转发的 WebSocket 控制端口 (默认 18789) 连接到网关。
- **直连 (ws/wss)**：Web 聊天直接连接到配置的网关 URL。
- 不再有单独的 WebChat HTTP 服务器。

## 权限

- 远程主机需要与本地相同的 TCC 批准 (自动化、辅助功能、屏幕录制、麦克风、语音识别、通知)。在该机器上运行入职流程 以一次性授予权限。
- 节点通过 `node.list` / `node.describe` 广播其权限状态，以便代理知道有哪些可用功能。

## 安全说明

- 首选在远程主机上使用环回绑定，并通过 SSH 或 Tailscale 连接。
- SSH 隧道使用严格的主机密钥检查；请先信任主机密钥，使其存在于 `~/.ssh/known_hosts` 中。
- 如果将网关绑定到非环回接口，则要求令牌/密码认证。
- 参见 [安全](/zh/en/gateway/security) 和 [Tailscale](/zh/en/gateway/tailscale)。

## WhatsApp 登录流程 (远程)

- **在远程主机上** 运行 `openclaw channels login --verbose`。使用手机上的 WhatsApp 扫描二维码。
- 如果认证过期，请在那个主机上重新运行登录。健康检查将显示连接问题。

## 故障排除

- **exit 127 / not found**: `openclaw` 不在非登录 shell 的 PATH 中。请将其添加到 `/etc/paths`、您的 shell rc 文件，或软链接到 `/usr/local/bin`/`/opt/homebrew/bin`。
- **Health probe failed**: 请检查 SSH 连通性、PATH 以及 Baileys 是否已登录 (`openclaw status --json`)。
- **Web Chat stuck**: 请确认网关正在远程主机上运行，且转发的端口与网关 WS 端口匹配；UI 需要一个健康的 WS 连接。
- **Node IP shows 127.0.0.1**: 这是 SSH 隧道的预期行为。如果您希望网关看到真实的客户端 IP，请将 **Transport** 切换为 **Direct (ws/wss)**。
- **Voice Wake**: 触发短语在远程模式下会自动转发；无需单独的转发器。

## 通知声音

使用脚本中的 `openclaw` 和 `node.invoke` 为每个通知选择声音，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

应用中不再有全局的“默认声音”开关；调用者需根据每个请求选择声音（或不选）。
