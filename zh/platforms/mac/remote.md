---
title: "远程控制"
summary: "通过 SSH 远程控制 OpenClaw gateway 的 macOS 应用流程"
read_when:
  - 设置或调试远程 mac 控制
---

# 远程 OpenClaw（macOS ⇄ 远程主机）

该流程让 macOS 应用作为远程主机（桌面/服务器）上运行的 OpenClaw gateway 的完整控制端。
这是应用的 **Remote over SSH**（远程运行）功能。所有功能——健康检查、Voice Wake 转发与 Web Chat——
都复用 _Settings → General_ 中的同一份远程 SSH 配置。

## 模式

- **Local（本机）**：所有内容在本机运行，不使用 SSH。
- **Remote over SSH（默认）**：OpenClaw 命令在远程主机执行。mac 应用使用 `-o BatchMode`、你选择的身份/密钥，并建立本地端口转发。
- **Remote direct（ws/wss）**：无 SSH 隧道。mac 应用直接连接 gateway URL（例如通过 Tailscale Serve 或公共 HTTPS 反向代理）。

## 远程传输方式

远程模式支持两种传输：

- **SSH 隧道**（默认）：使用 `ssh -N -L ...` 将 gateway 端口转发到本地。由于隧道是 loopback，gateway 看到的节点 IP 为 `127.0.0.1`。
- **Direct（ws/wss）**：直接连接 gateway URL，gateway 可看到真实客户端 IP。

## 远程主机前置条件

1. 安装 Node + pnpm，并构建/安装 OpenClaw CLI（`pnpm install && pnpm build && pnpm link --global`）。
2. 确保 `openclaw` 在非交互 shell 的 PATH 中（必要时软链到 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 开启带密钥认证的 SSH。推荐使用 **Tailscale** IP 以便在非局域网下稳定访问。

## macOS 应用设置

1. 打开 _Settings → General_。
2. 在 **OpenClaw runs** 下选择 **Remote over SSH** 并设置：
   - **Transport**：**SSH tunnel** 或 **Direct (ws/wss)**。
   - **SSH target**：`user@host`（可选 `:port`）。
     - 若 gateway 与你在同一 LAN 且通过 Bonjour 广播，可从发现列表选择以自动填充。
   - **Gateway URL**（仅 Direct）：`wss://gateway.example.ts.net`（本地/LAN 可用 `ws://...`）。
   - **Identity file**（高级）：你的密钥路径。
   - **Project root**（高级）：远程命令使用的仓库路径。
   - **CLI path**（高级）：可运行的 `openclaw` 入口/二进制路径（广播时会自动填充）。
3. 点击 **Test remote**。成功表示远程 `openclaw status --json` 可正常运行。失败通常是 PATH/CLI 问题；exit 127 表示远程找不到 CLI。
4. 健康检查与 Web Chat 将自动通过该 SSH 隧道运行。

## Web Chat

- **SSH 隧道**：Web Chat 通过转发后的 WebSocket 控制端口连接（默认 18789）。
- **Direct（ws/wss）**：Web Chat 直接连接配置的 gateway URL。
- 不再有单独的 WebChat HTTP 服务器。

## 权限

- 远程主机需要与本地相同的 TCC 授权（Automation、Accessibility、Screen Recording、Microphone、Speech Recognition、Notifications）。在该机器上运行 onboarding 一次即可。
- 节点通过 `node.list` / `node.describe` 广播权限状态，以便代理了解可用能力。

## 安全说明

- 远程主机优先使用 loopback bind，并通过 SSH 或 Tailscale 连接。
- 如果 Gateway 绑定到非 loopback 接口，请启用 token/password 认证。
- 参见 [Security](/zh/gateway/security) 与 [Tailscale](/zh/gateway/tailscale)。

## WhatsApp 登录流程（远程）

- 在 **远程主机** 上运行 `openclaw channels login --verbose`。用手机 WhatsApp 扫码。
- 授权过期后需在该主机上重新登录。健康检查会显示链接问题。

## 故障排查

- **exit 127 / not found**：`openclaw` 不在非登录 shell 的 PATH 中。添加到 `/etc/paths`、你的 shell rc，或软链到 `/usr/local/bin`/`/opt/homebrew/bin`。
- **Health probe failed**：检查 SSH 可达性、PATH，以及 Baileys 是否登录（`openclaw status --json`）。
- **Web Chat 卡住**：确认远程主机上的 gateway 正在运行，且转发端口与 gateway WS 端口一致；UI 需要健康的 WS 连接。
- **Node IP 显示 127.0.0.1**：这是 SSH 隧道的预期行为。若希望 gateway 看到真实客户端 IP，请将 **Transport** 切换为 **Direct (ws/wss)**。
- **Voice Wake**：远程模式下触发短语会自动转发，无需单独转发器。

## 通知声音

可通过 `openclaw` 与 `node.invoke` 的脚本为每条通知选择声音，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

应用不再提供全局“默认声音”开关；调用方可为每次请求选择声音（或不选）。
