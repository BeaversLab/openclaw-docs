---
summary: "macOSOpenClaw控制远程 OpenClaw 网关的 macOS 应用流程"
read_when:
  - Setting up or debugging remote mac control
title: "远程控制"
---

此流程允许 macOS 应用充当在另一台主机（桌面/服务器）上运行的 OpenClaw 网关的完整远程控制器。该应用可以直接连接到受信任的 LAN/Tailnet 网关 URL，或者当远程网关仅限本地环回时，管理 SSH 隧道。健康检查、语音唤醒转发和 Web Chat 复用来自“设置 → 通用”的相同远程配置。

## 模式

- **本地（本机）**：所有操作均在笔记本电脑上运行。不涉及 SSH。
- **通过 SSH 远程（默认）**：OpenClaw 命令在远程主机上执行。Mac 应用会打开一个 SSH 连接，使用 OpenClaw`-o BatchMode` 加上您选择的身份/密钥以及本地端口转发。
- **远程直连（ws/wss）**：无需 SSH 隧道。Mac 应用直接连接到网关 URL（例如，通过 LAN、Tailscale、Tailscale Serve 或公共 HTTPS 反向代理）。

## 远程传输

远程模式支持两种传输方式：

- **SSH 隧道**（默认）：使用 `ssh -N -L ...` 将网关端口转发到 localhost。由于隧道是环回的，网关会将节点的 IP 视为 `127.0.0.1`。
- **直连 (ws/wss)**：直接连接到网关 URL。网关看到的是真实的客户端 IP。

在 SSH 隧道模式下，发现的 LAN/tailnet 主机名被保存为
`gateway.remote.sshTarget`。该应用在本地
隧道端点上保持 `gateway.remote.url` 不变，例如 `ws://127.0.0.1:18789`CLI，因此 CLI、Web Chat 和
本地节点宿主服务都使用相同的安全环回传输。
如果本地隧道端口与远程网关端口不同，请将
`gateway.remote.remotePort` 设置为远程主机上的端口。

远程模式下的浏览器自动化由 CLI 节点宿主管理，而不是由
原生 macOS 应用节点管理。该应用会在可能时启动已安装的节点宿主服务；
如果您需要从该 Mac 进行浏览器控制，请使用
CLImacOS`openclaw node install ...` 和 `openclaw node start` 安装/启动它（或在
前台运行 `openclaw node run ...`），然后以该具备浏览器功能的
节点为目标。

## 远程主机上的先决条件

1. 安装 Node + pnpm 并构建/安装 OpenClaw CLI (`pnpm install && pnpm build && pnpm link --global`)。
2. 确保 `openclaw` 位于非交互式 shell 的 PATH 中（如有需要，可将其符号链接到 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 仅限 SSH 传输：开启使用密钥认证的 SSH。我们建议使用 **Tailscale** IP 以确保在局域网外的稳定访问。

## macOS 应用设置

要在不使用欢迎流程的情况下预配置应用：

```bash
openclaw-mac configure-remote \
  --ssh-target user@gateway.local \
  --local-port 18789 \
  --remote-port 18789 \
  --token "$OPENCLAW_GATEWAY_TOKEN"
```

对于在受信任的局域网或 Tailnet 上已可访问的网关，完全跳过 SSH：

```bash
openclaw-mac configure-remote \
  --direct-url ws://192.168.0.202:18789 \
  --token "$OPENCLAW_GATEWAY_TOKEN"
```

这将写入远程配置，标记新手引导已完成，并允许应用在启动时拥有所选传输方式的控制权。

1. 打开 _设置 → 通用_。
2. 在 **OpenClaw 运行** 下，选择 **远程** 并设置：
   - **传输方式**：**SSH 隧道** 或 **直连 (ws/wss)**。
   - **SSH 目标**：`user@host`（可选 `:port`）。
     - 如果网关位于同一局域网并广播 Bonjour，请从发现的列表中选择它以自动填充此字段。
   - **Gateway(网关) URL**（仅限直连）：`wss://gateway.example.ts.net`（对于本地/局域网，则为 `ws://...`）。
   - **身份文件**（高级）：您的密钥路径。
   - **项目根目录**（高级）：用于命令的远程检出路径。
   - **CLI 路径**（高级）：可运行的 `openclaw` 入口点/二进制文件的可选路径（广播时自动填充）。
3. 点击 **测试远程连接**。成功表示远程 `openclaw status --json` 运行正确。失败通常意味着 PATH/CLI 问题；退出代码 127 表示远程未找到 CLI。
4. 健康检查和 Web Chat 现在将自动通过所选传输方式运行。

## Web Chat

- **SSH 隧道**：Web Chat 通过转发的 WebSocket 控制端口（默认 18789）连接到网关。
- **直连 (ws/wss)**：Web Chat 直接连接到配置的网关 URL。
- 不再有单独的 WebChat HTTP 服务器。

## 权限

- 远程主机需要与本地相同的 TCC 批准（自动化、辅助功能、屏幕录制、麦克风、语音识别、通知）。在该机器上运行新手引导以一次性授予权限。
- 节点通过 `node.list` / `node.describe` 广播其权限状态，以便代理知道可用的功能。

## 安全说明

- 优先在远程主机上使用回环绑定，并通过 SSH、Tailscale Serve 或受信任的 Tailnet/LAN 直连 URL 进行连接。
- SSH 隧道使用严格的主机密钥检查；请先信任主机密钥，以便其存在于 `~/.ssh/known_hosts` 中。
- 如果将 Gateway(网关) 绑定到非回环接口，则要求有效的 Gateway(网关) 身份验证：令牌、密码或具有 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。
- 请参阅 [安全](/zh/gateway/security) 和 [Tailscale](/zh/gateway/tailscale)。

## WhatsApp 登录流程（远程）

- 在**远程主机**上运行 `openclaw channels login --verbose`。使用手机上的 WhatsApp 扫描二维码。
- 如果身份验证过期，请在该主机上重新运行登录。健康检查将会暴露链接问题。

## 故障排除

- **exit 127 / not found**：`openclaw` 不在非登录 shell 的 PATH 中。将其添加到 `/etc/paths`、您的 shell rc 或符号链接到 `/usr/local/bin`/`/opt/homebrew/bin`。
- **Health probe failed**：检查 SSH 连通性、PATH，以及 Baileys 是否已登录 (`openclaw status --json`)。
- **Web Chat 卡住**：确认 gateway 正在远程主机上运行，并且转发的端口与 gateway WS 端口匹配；UI 需要健康的 WS 连接。
- **Node IP 显示 127.0.0.1**：使用 SSH 隧道时的预期情况。如果您希望 gateway 看到真实的客户端 IP，请将 **Transport** 切换为 **Direct (ws/wss)**。
- **仪表盘工作但 Mac 功能离线**：这意味着应用程序的 operator/control 连接正常，但 companion node 连接未连接或缺少其命令界面。打开菜单栏设备部分，并检查 Mac 是否 `paired · disconnected`。对于 `wss://*.ts.net` Tailscale Serve 端点，应用程序会在证书轮换后检测到陈旧的旧版 TLS 叶证书固定，并在 macOS 信任新证书时清除陈旧的固定，并自动重试。如果证书不受系统信任或主机不是 Tailscale Serve 名称，请将 `gateway.remote.tlsFingerprint` 设置为预期的证书指纹，检查证书，或切换到 **Remote over SSH**。
- **Voice Wake**：触发短语在远程模式下会自动转发；不需要单独的转发器。

## 通知声音

从脚本中为每个通知使用 `openclaw` 和 `node.invoke` 选择声音，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

应用程序中不再有全局的“默认声音”开关；调用者需为每个请求选择一种声音（或不选）。

## 相关

- [macOS app](/zh/platforms/macos)
- [Remote access](/zh/gateway/remote)
