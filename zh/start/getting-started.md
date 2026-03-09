---
summary: "初学者指南：从零到第一次成功聊天（向导、认证、频道、配对）"
read_when:
  - "First time setup from zero"
  - "You want the fastest path from install → onboarding → first message"
title: "快速入门"
---

# 快速入门

目标：从 **零** → **第一次成功的聊天**（使用合理的默认配置）尽可能快速地完成。

最快的聊天方式：打开控制 UI（无需设置频道）。运行 `openclaw dashboard`
并在浏览器中聊天，或在网关主机上打开 `http://127.0.0.1:18789/`。
文档：[仪表板](/zh/web/dashboard) 和 [控制 UI](/zh/web/control-ui)。

推荐路径：使用 **CLI 入门向导**（`openclaw onboard`）。它将设置：

- 模型/认证（推荐 OAuth）
- 网关设置
- 频道（WhatsApp/Telegram/Discord/Mattermost（插件）/...）
- 配对默认值（安全私信）
- 工作空间引导 + 技能
- 可选的后台服务

如果您需要更深入的参考页面，请跳转到：[向导](/zh/start/wizard)、[设置](/zh/start/setup)、[配对](/zh/start/pairing)、[安全](/zh/gateway/security)。

沙箱说明：`agents.defaults.sandbox.mode: "non-main"` 使用 `session.mainKey`（默认 `"main"`），
因此群组/频道会话会被隔离。如果您希望主代理始终
在主机上运行，请设置显式的每个代理覆盖：

```json
{
  "routing": {
    "agents": {
      "main": {
        "workspace": "~/.openclaw/workspace",
        "sandbox": { "mode": "off" }
      }
    }
  }
}
```

## 0) 前置要求

- Node `>=22`
- `pnpm`（可选；如果从源码构建则推荐）
- **推荐：** 用于网络搜索的 Brave Search API 密钥。最简单的方法：
  `openclaw configure --section web`（存储 `tools.web.search.apiKey`）。
  参见 [网络工具](/zh/tools/web)。

macOS：如果您计划构建应用程序，请安装 Xcode / CLT。仅使用 CLI + 网关的话，Node 就足够了。
Windows：使用 **WSL2**（推荐 Ubuntu）。强烈推荐 WSL2；原生 Windows 未经过测试，问题更多，且工具兼容性较差。先安装 WSL2，然后在 WSL 中运行 Linux 步骤。参见 [Windows (/en/platforms/windows)](/zh/platforms/windows)。

## 1) Install the CLI (recommended)

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

安装程序选项（安装方法、非交互式、从 GitHub）：[安装](/zh/install)。

Windows (PowerShell)：

```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

替代方法（全局安装）：

```bash
npm install -g openclaw@latest
```

```bash
pnpm add -g openclaw@latest
```

## 2) 运行入门向导（并安装服务）

```bash
openclaw onboard --install-daemon
```

您需要选择：

- **本地 vs 远程**网关
- **认证**：OpenAI Code (Codex) 订阅（OAuth）或 API 密钥。对于 Anthropic，我们推荐使用 API 密钥；也支持 `claude setup-token`。
- **提供商**：WhatsApp QR 登录、Telegram/Discord 机器人令牌、Mattermost 插件令牌等。
- **守护进程**：后台安装（launchd/systemd；WSL2 使用 systemd）
  - **运行时**：Node（推荐；WhatsApp/Telegram 必需）。**不推荐**使用 Bun。
- **网关令牌**：向导默认生成一个（即使在环回上）并将其存储在 `gateway.auth.token` 中。

向导文档：[向导](/zh/start/wizard)

### 认证：配置位置（重要）

- **推荐的 Anthropic 方式：** 设置 API 密钥（向导可以存储它供服务使用）。如果您想重用 Claude Code 凭据，也支持 `claude setup-token`。

- OAuth 凭据（旧版导入）：`~/.openclaw/credentials/oauth.json`
- 认证配置文件（OAuth + API 密钥）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`

无头/服务器提示：先在普通机器上进行 OAuth，然后将 `oauth.json` 复制到网关主机。

## 3) 启动网关

如果您在入门期间安装了服务，网关应该已经在运行：

```bash
openclaw gateway status
```

手动运行（前台）：

```bash
openclaw gateway --port 18789 --verbose
```

仪表板（本地环回）：`http://127.0.0.1:18789/`
如果配置了令牌，将其粘贴到控制 UI 设置中（存储为 `connect.params.auth.token`）。

⚠️ **Bun 警告（WhatsApp + Telegram）：** Bun 在这些
频道上存在已知问题。如果您使用 WhatsApp 或 Telegram，请使用 **Node** 运行网关。

## 3.5) 快速验证（2 分钟）

```bash
openclaw status
openclaw health
openclaw security audit --deep
```

## 4) 配对 + 连接您的第一个聊天界面

### WhatsApp（QR 登录）

```bash
openclaw channels login
```

通过 WhatsApp → 设置 → 已关联的设备进行扫描。

WhatsApp 文档：[WhatsApp](/zh/channels/whatsapp)

### Telegram / Discord / 其他

向导可以为您编写令牌/配置。如果您更喜欢手动配置，请从以下开始：

- Telegram：[Telegram](/zh/channels/telegram)
- Discord：[Discord](/zh/channels/discord)
- Mattermost（插件）：[Mattermost](/zh/channels/mattermost)

**Telegram 私信提示：** 您的第一条私信将返回一个配对代码。批准它（见下一步），否则机器人不会响应。

## 5) 私信安全（配对批准）

默认策略：未知的私信会获得一个短代码，在批准之前不会处理消息。
如果您的第一条私信没有回复，请批准配对：

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <code>
```

配对文档：[配对](/zh/start/pairing)

## 从源码（开发）

如果您正在开发 OpenClaw 本身，请从源码运行：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
openclaw onboard --install-daemon
```

如果您还没有全局安装，请通过仓库中的 `pnpm openclaw ...` 运行入门步骤。
`pnpm build` 也捆绑了 A2UI 资产；如果您只需要运行该步骤，请使用 `pnpm canvas:a2ui:bundle`。

网关（来自此仓库）：

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## 7) 端到端验证

在新的终端中，发送测试消息：

```bash
openclaw message send --target +15555550123 --message "Hello from OpenClaw"
```

如果 `openclaw health` 显示”未配置认证”，请返回向导并设置 OAuth/密钥认证——没有它代理将无法响应。

提示：`openclaw status --all` 是最好的可粘贴的只读调试报告。
健康探测：`openclaw health`（或 `openclaw status --deep`）向运行的网关请求健康快照。

## 后续步骤（可选，但很棒）

- macOS 菜单栏应用 + 语音唤醒：[macOS 应用](/zh/platforms/macos)
- iOS/Android 节点（Canvas/相机/语音）：[节点](/zh/nodes)
- 远程访问（SSH 隧道 / Tailscale Serve）：[远程访问](/zh/gateway/remote) 和 [Tailscale](/zh/gateway/tailscale)
- 始终开启 / VPN 设置：[远程访问](/zh/gateway/remote)、[exe.dev](/zh/platforms/exe-dev)、[Hetzner](/zh/platforms/hetzner)、[macOS 远程](/zh/platforms/mac/remote)
