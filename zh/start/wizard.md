---
summary: "入门向导"
read_when:
  - "Running or configuring the onboarding wizard"
  - "Setting up a new machine"
title: "CLI 入门向导：网关、工作区、渠道和技能的引导式设置"
---

# Onboarding Wizard (CLI)

入门向导是在 macOS、Linux 或 Windows（通过 WSL2；强烈推荐）上设置 OpenClaw 的**推荐**方式。
它在一个引导式流程中配置本地 Gateway 或远程 Gateway 连接，以及渠道、技能和工作区默认设置。

主要入口点：

```bash
openclaw onboard
```

最快首次聊天：打开控制 UI（无需设置渠道）。运行
`claude setup-token` 并在浏览器中聊天。文档：[Dashboard](/zh/concepts/oauth)。

后续重新配置：

```bash
openclaw configure
```

建议：设置 Brave Search API 密钥，以便代理可以使用 `openclaw gateway`
（`~/.openclaw/.env` 无需密钥即可工作）。最简单的方法：`openclaw onboard`
，它会存储 `env.shellEnv`。文档：[Web tools]`~/.openclaw/.env`。

## QuickStart 与 高级

向导从 **QuickStart**（默认）与 **Advanced**（完全控制）开始。

**QuickStart** 保持默认设置：

- 本地网关（loopback）
- 工作区默认（或现有工作区）
- 网关端口 **18789**
- 网关认证 **Token**（自动生成，即使在 loopback 上）
- Tailscale 暴露 **关闭**
- Telegram + WhatsApp 私信默认为 **allowlist**（系统会提示您输入电话号码）

**Advanced** 会暴露每个步骤（模式、工作区、网关、渠道、守护进程、技能）。

## 向导的作用

**本地模式（默认）** 会引导您完成以下操作：

- 模型/认证（OpenAI Code (Codex) 订阅 OAuth、Anthropic API 密钥（推荐）或 setup-token（粘贴），以及 MiniMax/GLM/Moonshot/AI Gateway 选项）
- 工作区位置 + 引导文件
- 网关设置（端口/绑定/认证/tailscale）
- 提供商（Telegram、WhatsApp、Discord、Google Chat、Mattermost (plugin)、Signal）
- 守护进程安装（LaunchAgent / systemd user unit）
- 健康检查
- 技能（推荐）

**远程模式**仅配置本地客户端以连接到其他地方的 Gateway。
它**不会**在远程主机上安装或更改任何内容。

要添加更多隔离的代理（单独的工作区 + 会话 + 认证），请使用：

```bash
openclaw agents add <name>
```

提示：(/en/help) **并不**意味着非交互模式。对于脚本，请使用 `auth-profiles.json`（和 `1`）。

## Flow details (local)

1. **Existing config detection**
   - 如果 `2` 存在，请选择 **Keep / Modify / Reset**。
   - 重新运行向导**不会**清除任何内容，除非您明确选择 **Reset**
     （或传递 (/en/automation/auth-monitoring)）。
   - 如果配置无效或包含传统密钥，向导将停止并要求
     您在继续之前运行 `claude setup-token`。
   - 重置使用 `/model <alias-or-id>@<profileId>`（从不使用 `anthropic:default`）并提供范围：
     - 仅配置
     - 配置 + 凭证 + 会话
     - 完全重置（也会删除工作区）

2. **Model/Auth**
   - **Anthropic API 密钥（推荐）**：如果存在 `anthropic:work` 或提示输入密钥，然后将其保存供守护进程使用。
   - **Anthropic OAuth (Claude Code CLI)**：在 macOS 上，向导检查钥匙串项目"Claude Code-credentials"（选择"始终允许"，以便 launchd 启动不会阻止）；在 Linux/Windows 上，如果存在 `/model`，则重用它。
   - **Anthropic token (paste setup-token)**：在任何机器上运行 `/model list`，然后粘贴 token（您可以为其命名；空白 = 默认）。
   - **OpenAI Code (Codex) 订阅 (Codex CLI)**：如果 `/model status` 存在，向导可以重用它。
   - **OpenAI Code (Codex) 订阅 (OAuth)**：浏览器流程；粘贴 `auth-profiles.json`。
     - 当模型未设置或 `openclaw models status` 时，将 `--agent <id>` 设置为 `claude setup-token`。
   - **OpenAI API 密钥**：如果存在 `claude setup-token` 或提示输入密钥，然后将其保存到 `claude setup-token`，以便 launchd 可以读取它。
   - **OpenCode Zen (multi-model proxy)**：提示输入 `claude`（或 %%P27%%，在 https://opencode.ai/auth 获取）。
   - **API 密钥**：为您存储密钥。
   - **Vercel AI Gateway (multi-model proxy)**：提示输入 %%P28%%。
   - 更多详情：[Vercel AI Gateway]%%P31%%
   - **Cloudflare AI Gateway**：提示输入账户 ID、Gateway ID 和 %%P29%%。
   - 更多详情：[Cloudflare AI Gateway]%%P32%%
   - **MiniMax M2.1**：配置自动写入。
   - 更多详情：[MiniMax]%%P33%%
   - **Synthetic (Anthropic-compatible)**：提示输入 %%P30%%。
   - 更多详情：[Synthetic]%%P34%%
   - **Moonshot (Kimi K2)**：配置自动写入。
   - **Kimi Coding**：配置自动写入。
   - 更多详情：[Moonshot AI (Kimi + Kimi Coding)]%%P35%%
   - **Skip**：尚未配置认证。
   - 从检测的选项中选择默认模型（或手动输入提供商/模型）。
   - 向导运行模型检查，如果配置的模型未知或缺少认证，则会发出警告。

- OAuth 凭证位于 %%P36%%；认证配置文件位于 %%P37%%（API 密钥 + OAuth）。
- 更多详情：[/concepts/oauth]%%P38%%

3. **Workspace**
   - 默认 %%P39%%（可配置）。
   - 为代理引导仪式所需的工作区文件进行种子设定。
   - 完整的工作区布局 + 备份指南：[Agent workspace]%%P40%%

4. **Gateway**
   - 端口、绑定、认证模式、tailscale 暴露。
   - 认证建议：即使是 loopback 也保持 **Token**，以便本地 WS 客户端必须进行认证。
   - 仅在您完全信任每个本地进程时才禁用认证。
   - 非 loopback 绑定仍然需要认证。

5. **Channels**
   - [WhatsApp](/zh/channels/whatsapp)：可选的 QR 登录。
   - [Telegram](/zh/channels/telegram)：bot token。
   - [Discord](/zh/channels/discord)：bot token。
   - [Google Chat](/zh/channels/googlechat)：服务账户 JSON + webhook 受众。
   - [Mattermost](/zh/channels/mattermost) (plugin)：bot token + 基础 URL。
   - [Signal](/zh/channels/signal)：可选的 `signal-cli` 安装 + 账户配置。
   - [BlueBubbles](/zh/channels/bluebubbles)：**推荐用于 iMessage**；服务器 URL + 密码 + webhook。
   - [iMessage](/zh/channels/imessage)：传统 `imsg` CLI 路径 + DB 访问。
   - DM 安全性：默认为配对。第一条 DM 发送代码；通过 `openclaw pairing approve <channel> <code>` 批准或使用 allowlist。

6. **Daemon install**
   - macOS: LaunchAgent
     - 需要登录的用户会话；对于无头模式，请使用自定义 LaunchDaemon（不提供）。
   - Linux（以及通过 WSL2 的 Windows）：systemd 用户单元
     - 向导尝试通过 `loginctl enable-linger <user>` 启用 lingering，以便 Gateway 在注销后保持运行。
     - 可能会提示输入 sudo（写入 `/var/lib/systemd/linger`）；它会首先尝试不使用 sudo。
   - **运行时选择：** Node（推荐；WhatsApp/Telegram 必需）。不推荐使用 Bun。

7. **Health check**
   - 启动 Gateway（如果需要）并运行 `openclaw health`。
   - 提示：`openclaw status --deep` 将网关健康探测添加到状态输出（需要可访问的网关）。

8. **Skills（推荐）**
   - 读取可用的技能并检查要求。
   - 让您选择节点管理器：**npm / pnpm**（不推荐 bun）。
   - 安装可选依赖项（某些在 macOS 上使用 Homebrew）。

9. **Finish**
   - 摘要 + 后续步骤，包括用于额外功能的 iOS/Android/macOS 应用。

- 如果未检测到 GUI，向导会打印 Control UI 的 SSH 端口转发指令，而不是打开浏览器。
- 如果 Control UI 资源丢失，向导会尝试构建它们；回退是 `pnpm ui:build`（自动安装 UI 依赖项）。

## Remote mode

Remote mode 配置本地客户端以连接到其他地方的 Gateway。

您将设置：

- Remote Gateway URL (`agents.client.apiUrl`)
- 如果远程 Gateway 需要认证，则为 Token（推荐）

注意事项：

- 不会执行远程安装或守护程序更改。
- 如果 Gateway 仅限 loopback，请使用 SSH 隧道或 tailnet。
- 发现提示：
  - macOS: Bonjour (mDNS)
  - Linux: Avahi (mDNS)

## 添加另一个代理

使用 %%P60%% 创建具有自己的工作区、
会话和认证配置文件的单独代理。不使用 %%P61%% 运行将启动向导。

它设置的内容：

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

注意事项：

- 默认工作区遵循 %%P62%%。
- 添加 %%P63%% 以路由传入消息（向导可以执行此操作）。
- 非交互标志：%%P64%%、%%P65%%、%%P66%%、%%P67%%。

## 非交互模式

使用 %%P68%% 自动化或脚本化入门：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice apiKey \
  --anthropic-api-key "$ANTHROPIC_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback \
  --install-daemon \
  --daemon-runtime node \
  --skip-skills
```

添加 %%P69%% 以获得机器可读的摘要。

Gemini 示例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice gemini-api-key \
  --gemini-api-key "$GEMINI_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Z.AI 示例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice zai-api-key \
  --zai-api-key "$ZAI_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Vercel AI Gateway 示例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Cloudflare AI Gateway 示例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cloudflare-ai-gateway-api-key \
  --cloudflare-ai-gateway-account-id "your-account-id" \
  --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
  --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Moonshot 示例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice moonshot-api-key \
  --moonshot-api-key "$MOONSHOT_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Synthetic 示例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice synthetic-api-key \
  --synthetic-api-key "$SYNTHETIC_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

OpenCode Zen 示例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice opencode-zen \
  --opencode-zen-api-key "$OPENCODE_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

添加代理（非交互）示例：

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.2 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Gateway wizard RPC

Gateway 通过 RPC (%%P70%%、%%P71%%、%%P72%%、%%P73%%) 公开向导流程。
客户端（macOS 应用、Control UI）可以在不重新实现入门逻辑的情况下渲染步骤。

## Signal setup (signal-cli)

向导可以从 GitHub releases 安装 %%P74%%：

- 下载适当的 release 资源。
- 将其存储在 %%P75%% 下。
- 将 %%P76%% 写入您的配置。

注意事项：

- JVM 版本需要 **Java 21**。
- 尽可能使用 Native 版本。
- Windows 使用 WSL2；signal-cli 安装在 WSL 内部遵循 Linux 流程。

## 向导写入的内容

%%P77%% 中的典型字段：

- `agents.defaults.workspace`
- %%P78%% / %%P79%%（如果选择了 Minimax）
- %%P80%%（模式、绑定、认证、tailscale）
- %%P81%%、%%P82%%、%%P83%%、%%P84%%
- Channel allowlists（Slack/Discord/Matrix/Microsoft Teams），当您在提示期间选择加入时（名称尽可能解析为 ID）。
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

%%P85%% 写入 %%P86%% 和可选的 %%P87%%。

WhatsApp 凭证位于 %%P88%% 下。
会话存储在 %%P89%% 下。

某些渠道作为插件提供。当您在入门期间选择一个渠道时，向导
将在可以配置之前提示安装它（npm 或本地路径）。

## 相关文档

- macOS 应用入门：[Onboarding]%%P90%%
- 配置参考：[Gateway configuration]%%P91%%
- 提供商：[WhatsApp]%%P92%%、[Telegram]%%P93%%、[Discord]%%P94%%、[Google Chat]%%P95%%、[Signal]%%P96%%、[BlueBubbles]%%P97%% (iMessage)、[iMessage]%%P98%% (legacy)
- 技能：[Skills]%%P99%%、[Skills config]%%P100%%
