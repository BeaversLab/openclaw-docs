---
summary: "macOS app flow for controlling a remote OpenClaw gateway over SSH"
read_when:
  - Setting up or debugging remote mac control
title: "Remote Control"
---

# 远程 OpenClaw (macOS ⇄ 远程主机)

此流程允许 macOS 应用充当在另一台主机（桌面/服务器）上运行的 OpenClaw 网关的完整远程控制。这是该应用的 **Remote over SSH**（远程运行）功能。所有功能——健康检查、Voice Wake 转发和 Web Chat——都重复使用来自 _Settings → General_ 的同一远程 SSH 配置。

## 模式

- **本地 (此 Mac)**：所有内容均在笔记本电脑上运行。不涉及 SSH。
- **Remote over SSH (default)**: OpenClaw 命令在远程主机上执行。macOS 应用会打开一个 SSH 连接，使用 `-o BatchMode` 加上您选择的身份密钥（identity/key）以及本地端口转发。
- **远程直连 (ws/wss)**：无 SSH 隧道。mac 应用直接连接到网关 URL（例如，通过 Tailscale Serve 或公共 HTTPS 反向代理）。

## 远程传输

远程模式支持两种传输方式：

- **SSH 隧道**（默认）：使用 `ssh -N -L ...` 将网关端口转发到 localhost。由于隧道是回环的，网关看到的节点 IP 将是 `127.0.0.1`。
- **直连 (ws/wss)**：直接连接到网关 URL。网关看到的是真实的客户端 IP。

## 远程主机上的先决条件

1. 安装 Node + pnpm 并构建/安装 OpenClaw CLI (`pnpm install && pnpm build && pnpm link --global`)。
2. 确保 `openclaw` 在非交互式 shell 的 PATH 中（如有需要，可将其软链接到 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 开启带有密钥认证的 SSH。我们建议使用 **Tailscale** IP 以确保局域网外的稳定访问。

## macOS 应用设置

1. 打开 _Settings → General_。
2. 在 **OpenClaw runs** 下，选择 **Remote over SSH** 并设置：
   - **传输方式**：**SSH 隧道**或**直连 (ws/wss)**。
   - **SSH 目标**：`user@host`（可选 `:port`）。
     - 如果 Gateway 网关在同一局域网内并通告了 Bonjour，请从已发现的列表中选取它以自动填充此字段。
   - **Gateway(网关) 网关 URL**（仅限直连）：`wss://gateway.example.ts.net`（或用于本地/局域网的 `ws://...`）。
   - **身份文件**（高级）：您的密钥路径。
   - **项目根目录**（高级）：用于命令的远程检出路径。
   - **CLI 路径**（高级）：可运行 `openclaw` 入口点/二进制文件的可选路径（通告时自动填充）。
3. 点击 **Test remote**。成功表示远程 `openclaw status --json` 运行正确。失败通常意味着 PATH/CLI 问题；退出代码 127 表示在远程未找到 CLI。
4. 健康检查和 WebChat 现在将自动通过此 SSH 隧道运行。

## Web Chat

- **SSH 隧道**：Web Chat 通过转发的 WebSocket 控制端口（默认 18789）连接到 Gateway 网关。
- **直连 (ws/wss)**：Web Chat 直接连接到已配置的 Gateway 网关 URL。
- 不再有单独的 WebChat HTTP 服务器。

## 权限

- 远程主机需要与本地相同的 TCC 批准（自动化、辅助功能、屏幕录制、麦克风、语音识别、通知）。在该机器上运行新手引导以一次性授予这些权限。
- 节点通过 `node.list` / `node.describe` 通告其权限状态，以便代理了解可用内容。

## 安全说明

- 首选在远程主机上使用回环绑定，并通过 SSH 或 Tailscale 连接。
- SSH 隧道使用严格的主机密钥检查；请先信任主机密钥，使其存在于 `~/.ssh/known_hosts` 中。
- 如果将 Gateway(网关) 绑定到非环回接口，请要求有效的 Gateway(网关) 身份验证：令牌、密码或带有 `gateway.auth.mode: "trusted-proxy"` 的支持身份识别的反向代理。
- 请参阅 [Security](/zh/gateway/security) 和 [Tailscale](/zh/gateway/tailscale)。

## WhatsApp 登录流程（远程）

- 在**远程主机**上运行 `openclaw channels login --verbose`。使用手机上的 WhatsApp 扫描二维码。
- 如果认证过期，请在该主机上重新运行登录。健康检查会显示链接问题。

## 故障排除

- **退出码 127 / 未找到**：非登录 shell 的 PATH 中没有 `openclaw`。将其添加到 `/etc/paths`、您的 shell rc 或符号链接到 `/usr/local/bin`/`/opt/homebrew/bin`。
- **运行状况探测失败**：检查 SSH 连通性、PATH 以及 Baileys 是否已登录 (`openclaw status --json`)。
- **Web Chat stuck**：确认网关正在远程主机上运行，且转发的端口与网关 WS 端口匹配；UI 需要健康的 WS 连接。
- **Node IP shows 127.0.0.1**：使用 SSH 隧道时的预期情况。如果您希望网关看到真实的客户端 IP，请将 **Transport** 切换为 **Direct (ws/wss)**。
- **Voice Wake**：触发短语在远程模式下会自动转发；无需单独的转发器。

## 通知声音

使用脚本通过 `openclaw` 和 `node.invoke` 为每个通知选择声音，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

应用中不再有全局的“默认声音”开关；调用者在每次请求时选择声音（或无声音）。
