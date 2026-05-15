---
summary: "macOS app flow for controlling a remote OpenClaw gateway over SSH"
read_when:
  - Setting up or debugging remote mac control
title: "远程控制"
---

此流程允许 macOS 应用充当在另一台主机（桌面/服务器）上运行的 OpenClaw 网关的完整远程控制。这是该应用的 **Remote over SSH**（远程运行）功能。所有功能——健康检查、语音唤醒转发和 Web 聊天——都重复使用来自 _设置 → 通用_ 的同一远程 SSH 配置。

## 模式

- **本地（本机）**：所有操作均在笔记本电脑上运行。不涉及 SSH。
- **Remote over SSH（默认）**：OpenClaw 命令在远程主机上执行。mac 应用会使用 OpenClaw`-o BatchMode` 加上您选择的身份/密钥以及本地端口转发来打开 SSH 连接。
- **Remote direct (ws/wss)**：无 SSH 隧道。mac 应用直接连接到网关 URL（例如，通过 Tailscale Serve 或公共 HTTPS 反向代理）。

## 远程传输

远程模式支持两种传输方式：

- **SSH 隧道**（默认）：使用 `ssh -N -L ...` 将网关端口转发到 localhost。由于隧道是环回的，网关将把节点的 IP 视为 `127.0.0.1`。
- **直连 (ws/wss)**：直接连接到网关 URL。网关看到的是真实的客户端 IP。

在 SSH 隧道模式下，发现的 LAN/tailnet 主机名将保存为
`gateway.remote.sshTarget`。应用会在本地
隧道端点上保持 `gateway.remote.url`，例如 `ws://127.0.0.1:18789`CLI，因此 CLI、Web 聊天和
本地节点主机服务都使用相同的安全环回传输。

远程模式下的浏览器自动化由 CLI 节点主机管理，而非由
原生 macOS 应用节点管理。应用会在可能的情况下启动已安装的节点主机服务；如果您需要从该 Mac 进行浏览器控制，请使用
CLImacOS`openclaw node install ...` 和 `openclaw node start` 安装/启动它（或在
前台运行 `openclaw node run ...`），然后定位到该支持浏览器的
节点。

## 远程主机上的先决条件

1. 安装 Node + pnpm 并构建/安装 OpenClaw CLI (OpenClawCLI`pnpm install && pnpm build && pnpm link --global`)。
2. 确保 `openclaw` 在非交互式 shell 的 PATH 中（如有需要，可将其符号链接到 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 开启使用密钥认证的 SSH。我们建议使用 **Tailscale** IP 地址，以便在局域网外也能稳定连接。

## macOS 应用设置

1. 打开 _设置 → 通用_。
2. 在 **OpenClaw 运行** 下，选择 **Remote over SSH（通过 SSH 远程运行）** 并设置：
   - **传输方式**：**SSH 隧道** 或 **直连 (ws/wss)**。
   - **SSH 目标**：`user@host` （可选 `:port`）。
     - 如果 Gateway(网关) 位于同一局域网内并广播了 Bonjour，请从发现列表中选择它以自动填充此字段。
   - **Gateway(网关) URL**（仅限直连模式）：Gateway(网关)`wss://gateway.example.ts.net` （本地或局域网使用 `ws://...`）。
   - **身份文件**（高级）：您的密钥路径。
   - **项目根目录**（高级）：用于命令的远程检出路径。
   - **CLI 路径**（高级）：可运行的 CLI`openclaw` 入口点/二进制文件的可选路径（广播时会自动填充）。
3. 点击 **测试远程连接**。成功表示远程 `openclaw status --json`CLICLI 运行正常。失败通常意味着 PATH/CLI 问题；退出代码 127 表示远程未找到 CLI。
4. 健康检查和 WebChat 现在将通过此 SSH 隧道自动运行。

## Web Chat

- **SSH 隧道**：Web Chat 通过转发的 WebSocket 控制端口（默认为 18789）连接到 Gateway(网关)。
- **直连 (ws/wss)**：Web Chat 直接连接到配置的 Gateway(网关) URL。
- 不再有单独的 WebChat HTTP 服务器。

## 权限

- 远程主机需要与本地相同的 TCC 批准（自动化、辅助功能、屏幕录制、麦克风、语音识别、通知）。在该机器上运行新手引导 以一次性授予这些权限。
- 节点通过 `node.list` / `node.describe` 广播其权限状态，以便代理知道哪些功能可用。

## 安全说明

- 优先在远程主机上使用回环绑定，并通过 SSH 或 Tailscale 进行连接。
- SSH 隧道使用严格的主机密钥检查；请先信任主机密钥，以确保它存在于 `~/.ssh/known_hosts` 中。
- 如果您将 Gateway(网关) 绑定到非回环接口，则要求有效的 Gateway(网关) 身份验证：令牌、密码或具有 Gateway(网关)Gateway(网关)`gateway.auth.mode: "trusted-proxy"` 的感知身份的反向代理。
- 请参阅 [安全](/zh/gateway/securityTailscale) 和 [Tailscale](/zh/gateway/tailscale)。

## WhatsApp 登录流程（远程）

- 在 **远程主机** 上运行 `openclaw channels login --verbose`WhatsApp。使用手机上的 WhatsApp 扫描二维码。
- 如果身份验证过期，请在该主机上重新运行登录。健康检查将显示连接问题。

## 故障排除

- **exit 127 / not found**：对于非登录 Shell，`openclaw` 不在 PATH 中。将其添加到 `/etc/paths`、您的 Shell 配置文件 (rc) 或符号链接到 `/usr/local/bin`/`/opt/homebrew/bin`。
- **Health probe failed**：检查 SSH 可达性、PATH 以及 Baileys 是否已登录 (Baileys`openclaw status --json`)。
- **Web Chat 卡住**：确认 Gateway(网关) 正在远程主机上运行，并且转发的端口与 Gateway(网关) WS 端口匹配；UI 需要健康的 WS 连接。
- **Node IP 显示 127.0.0.1**：这是 SSH 隧道的预期行为。如果您希望 Gateway(网关) 看到真实的客户端 IP，请将 **Transport** 切换为 **Direct (ws/wss)**。
- **仪表盘工作但 Mac 功能离线**：这意味着应用程序的操作员/控制连接正常，但伴随节点连接未连接或缺少其命令接口。打开菜单栏设备部分并检查 Mac 是否为 `paired · disconnected`。对于 `wss://*.ts.net`TailscalemacOSTailscale Tailscale Serve 端点，应用程序会在证书轮换后检测过时的旧版 TLS 叶证书固定，并在 macOS 信任新证书时清除过时的固定，然后自动重试。如果证书不受系统信任或者主机不是 Tailscale Serve 名称，请检查证书或切换到 **Remote over SSH**。
- **语音唤醒**：触发短语在远程模式下会自动转发；无需单独的转发器。

## 通知声音

使用带有 `openclaw` 和 `node.invoke` 的脚本为每个通知选择声音，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

应用中已不再有全局的“默认声音”开关；调用者需针对每个请求选择一种声音（或不选择）。

## 相关

- [macOS 应用](macOS/en/platforms/macos)
- [远程访问](/zh/gateway/remote)
