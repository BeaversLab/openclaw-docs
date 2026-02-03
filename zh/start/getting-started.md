---
summary: "新手指南：从零到第一条消息（向导、认证、渠道、配对）"
read_when:
  - 第一次从零开始配置
  - 想走最快路径：安装 → 引导 → 第一条消息
title: "快速入门"
---

# 快速开始

目标：以最快速度把 **零** → **第一条可用聊天**（带合理默认配置）。

最快聊天：打开 Control UI（无需设置渠道）。运行 `openclaw dashboard`
并在浏览器里聊天，或在网关主机上打开 `http://127.0.0.1:18789/`。
文档：[Dashboard](/zh/web/dashboard) 和 [Control UI](/zh/web/control-ui)。

推荐路径：使用 **CLI 引导向导**（`openclaw onboard`）。它会设置：
- 模型/认证（推荐 OAuth）
- 网关设置
- 渠道（WhatsApp/Telegram/Discord/Mattermost（插件）/…）
- 配对默认值（安全 DM）
- 工作区初始化 + 技能
- 可选后台服务

如果你想看更深入的参考页，跳转：
[向导](/zh/start/wizard)、[设置](/zh/start/setup)、[配对](/zh/start/pairing)、[安全](/zh/gateway/security)。

沙箱说明：`agents.defaults.sandbox.mode: "non-main"` 会使用 `session.mainKey`（默认是 `"main"`），
因此群聊/渠道会被沙箱隔离。如果你想让主代理始终在宿主机运行，
为单个代理显式覆盖：

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

## 0) 前置条件

- Node `>=22`
- `pnpm`（可选；从源码构建推荐）
- **推荐：** Brave Search API key 用于网页搜索。最简单路径：
  `openclaw configure --section web`（会保存到 `tools.web.search.apiKey`）。
  参见 [Web 工具](/zh/tools/web)。

macOS：如果你要构建应用，请安装 Xcode / CLT。仅使用 CLI + 网关的话，Node 就够了。
Windows：使用 **WSL2**（推荐 Ubuntu）。强烈推荐 WSL2；原生 Windows 未充分测试，问题更多且工具兼容性更差。先安装 WSL2，再在 WSL 内执行 Linux 步骤。参见 [Windows（WSL2）](/zh/platforms/windows)。

## 1) 安装 CLI（推荐）

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

安装器选项（安装方式、非交互、来自 GitHub）：[安装](/zh/install)。

Windows（PowerShell）：

```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

备选（全局安装）：

```bash
npm install -g openclaw@latest
```

```bash
pnpm add -g openclaw@latest
```

## 2) 运行引导向导（并安装服务）

```bash
openclaw onboard --install-daemon
```

你将选择：
- **本地 vs 远程** 网关
- **认证**：OpenAI Code (Codex) 订阅（OAuth）或 API key。Anthropic 推荐 API key；也支持 `claude setup-token`。
- **提供商**：WhatsApp QR 登录、Telegram/Discord bot token、Mattermost (插件) token 等。
- **守护进程**：后台安装（launchd/systemd；WSL2 使用 systemd）
  - **运行时**：Node（推荐；WhatsApp/Telegram 需要）。**不推荐**使用 Bun。
- **网关令牌**：向导默认生成（即便是 loopback）并存储到 `gateway.auth.token`。

向导文档：[向导](/zh/start/wizard)

### 认证：配置位置（重要）

- **Anthropic 推荐路径：** 设置 API key（向导可保存供服务使用）。如果你想复用 Claude Code 凭据，也支持 `claude setup-token`。

- OAuth 凭据（旧版导入）：`~/.openclaw/credentials/oauth.json`
- 认证档案（OAuth + API key）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`

无头/服务器提示：先在普通机器上完成 OAuth，然后把 `oauth.json` 复制到网关主机。

## 3) 启动网关

如果你在引导时安装了服务，网关应该已经在运行：

```bash
openclaw gateway status
```

手动运行（前台）：

```bash
openclaw gateway --port 18789 --verbose
```

Dashboard（本地回环）：`http://127.0.0.1:18789/`
如果配置了 token，请在 Control UI 设置中粘贴（保存为 `connect.params.auth.token`）。

⚠️ **Bun 警告（WhatsApp + Telegram）：** Bun 在这些渠道上有已知问题。
如果使用 WhatsApp 或 Telegram，请用 **Node** 运行网关。

## 3.5) 快速验证（2 分钟）

```bash
openclaw status
openclaw health
openclaw security audit --deep
```

## 4) 配对 + 连接你的第一个聊天入口

### WhatsApp（二维码登录）

```bash
openclaw channels login
```

通过 WhatsApp → 设置 → 已连接设备 扫码。

WhatsApp 文档：[WhatsApp](/zh/channels/whatsapp)

### Telegram / Discord / 其他

向导可以替你写入 token/配置。如果你更喜欢手动配置，先看：
- Telegram：[Telegram](/zh/channels/telegram)
- Discord：[Discord](/zh/channels/discord)
- Mattermost（插件）：[Mattermost](/zh/channels/mattermost)

**Telegram 私聊提示：** 你的第一次私聊会返回一个配对码。请批准它（见下一步），否则机器人不会响应。

## 5) 私聊安全（配对审批）

默认策略：未知私聊会得到短码，消息在批准前不会被处理。
如果你的第一次私聊没有回复，请批准配对：

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <code>
```

配对文档：[配对](/zh/start/pairing)

## 从源码运行（开发）

如果你在开发 OpenClaw 本身，从源码运行：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # 首次运行会自动安装 UI 依赖
pnpm build
openclaw onboard --install-daemon
```

如果还没有全局安装，请在仓库中用 `pnpm openclaw ...` 运行引导步骤。
`pnpm build` 也会打包 A2UI 资源；如果只需要这一步，使用 `pnpm canvas:a2ui:bundle`。

网关（从本仓库）：

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## 7) 端到端验证

在新终端里发送测试消息：

```bash
openclaw message send --target +15555550123 --message "Hello from OpenClaw"
```

如果 `openclaw health` 显示 “no auth configured”，回到向导设置 OAuth/key 认证 —— 没有认证代理无法响应。

提示：`openclaw status --all` 是最佳可粘贴、只读的调试报告。
健康探测：`openclaw health`（或 `openclaw status --deep`）会向运行中的网关请求健康快照。

## 下一步（可选，但很棒）

- macOS 菜单栏应用 + 语音唤醒：[macOS 应用](/zh/platforms/macos)
- iOS/Android 节点（Canvas/摄像头/语音）：[节点](/zh/nodes)
- 远程访问（SSH 隧道 / Tailscale Serve）：[远程访问](/zh/gateway/remote) 和 [Tailscale](/zh/gateway/tailscale)
- 常驻 / VPN 部署：[远程访问](/zh/gateway/remote)、[exe.dev](/zh/platforms/exe-dev)、[Hetzner](/zh/platforms/hetzner)、[macOS 远程](/zh/platforms/mac/remote)
