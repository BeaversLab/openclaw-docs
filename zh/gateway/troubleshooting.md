---
summary: "常见 OpenClaw 故障的快速故障排除指南"
read_when:
  - "Investigating runtime issues or failures"
title: "故障排除"
---

# 故障排除 🔧

当 OpenClaw 出现问题时，可以按照以下方法进行修复。

如果你只是想要一个快速的分诊配方，请从 FAQ 的[前 60 秒](/zh/help/faq#first-60-seconds-if-somethings-broken)开始。本页将更深入地介绍运行时故障和诊断。

提供商特定的快捷方式：[/channels/troubleshooting](/zh/channels/troubleshooting)

## 状态和诊断

快速分诊命令（按顺序）：

| 命令                            | 它告诉你什么                                                                                      | 何时使用                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `openclaw status`                  | 本地摘要：操作系统 + 更新、Gateway可达性/模式、服务、代理/会话、提供商配置状态 | 首次检查、快速概览                       |
| `openclaw status --all`            | 完整的本地诊断（只读、可粘贴、相对安全）包括日志尾部                                   | 当你需要共享调试报告时             |
| `openclaw status --deep`           | 运行Gateway健康检查（包括提供商探测；需要可访问的Gateway）                         | 当”已配置”并不意味着”正在工作时”          |
| `openclaw gateway probe`           | Gateway发现 + 可达性（本地 + 远程目标）                                              | 当你怀疑探测了错误的Gateway时 |
| `openclaw channels status --probe` | 向运行的Gateway询问频道状态（并可选择探测）                                    | 当Gateway可访问但频道行为异常时  |
| `openclaw gateway status`          | 监督器状态（launchd/systemd/schtasks）、运行时 PID/退出、最后一个Gateway错误                      | 当服务”看起来已加载”但没有任何运行时  |
| `openclaw logs --follow`           | 实时日志（运行时问题的最佳信号）                                                             | 当你需要实际的失败原因时           |

**共享输出：**优先使用 `openclaw status --all`（它会编辑令牌）。如果你粘贴 `openclaw status`，请考虑先设置 `OPENCLAW_SHOW_SECRETS=0`（令牌预览）。

另请参阅：[健康检查](/zh/gateway/health) 和 [日志记录](/zh/logging)。

## 常见问题

### No API key found for provider "anthropic"

这意味着**代理的身份验证存储为空**或缺少 Anthropic 凭据。
身份验证是**每个代理独立的**，因此新代理不会继承主代理的密钥。

修复选项：

- 重新运行入职并为该代理选择 **Anthropic**。
- 或者在**Gateway主机**上粘贴 setup-token：
  ```bash
  openclaw models auth setup-token --provider anthropic
  ```
- 或者将 `auth-profiles.json` 从主代理目录复制到新代理目录。

验证：

```bash
openclaw models status
```

### OAuth 令牌刷新失败（Anthropic Claude 订阅）

这意味着存储的 Anthropic OAuth 令牌已过期且刷新失败。
如果你使用的是 Claude 订阅（没有 API 密钥），最可靠的修复方法是
切换到 **Claude Code setup-token** 并将其粘贴到**Gateway主机**上。

**推荐（setup-token）：**

```bash
# Run on the gateway host (paste the setup-token)
openclaw models auth setup-token --provider anthropic
openclaw models status
```

如果你在其他地方生成了令牌：

```bash
openclaw models auth paste-token --provider anthropic
openclaw models status
```

更多详细信息：[Anthropic](/zh/providers/anthropic) 和 [OAuth](/zh/concepts/oauth)。

### 控制 UI 在 HTTP 上失败（"需要设备身份" / "连接失败"）

如果你通过纯 HTTP 打开仪表板（例如 `http://<lan-ip>:18789/` 或
`http://<tailscale-ip>:18789/`），浏览器将在**非安全上下文**中运行
并阻止 WebCrypto，因此无法生成设备身份。

**修复方法：**

- 优先使用通过 [Tailscale Serve](/zh/gateway/tailscale) 的 HTTPS。
- 或者在Gateway主机上本地打开：`http://127.0.0.1:18789/`。
- 如果你必须使用 HTTP，请启用 `gateway.controlUi.allowInsecureAuth: true` 并
  使用Gateway令牌（仅令牌；无设备身份/配对）。请参阅
  [控制 UI](/zh/web/control-ui#insecure-http)。

### CI 密钥扫描失败

这意味着 `detect-secrets` 发现了基线中尚未包含的新候选者。
请遵循[密钥扫描](/zh/gateway/security#secret-scanning-detect-secrets)。

### 服务已安装但没有任何运行

如果Gateway服务已安装但进程立即退出，服务
可能会显示”已加载”，但没有任何运行。

**检查：**

```bash
openclaw gateway status
openclaw doctor
```

Doctor/service 将显示运行时状态（PID/最后退出）和日志提示。

**日志：**

- 推荐：`openclaw logs --follow`
- 文件日志（始终）：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`（或你配置的 `logging.file`）
- macOS LaunchAgent（如果已安装）：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`
- Linux systemd（如果已安装）：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
- Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

**启用更多日志记录：**

- 提升文件日志详细程度（持久化的 JSONL）：
  ```json
  { "logging": { "level": "debug" } }
  ```
- 提升控制台详细程度（仅 TTY 输出）：
  ```json
  { "logging": { "consoleLevel": "debug", "consoleStyle": "pretty" } }
  ```
- 快速提示：`--verbose` 仅影响**控制台**输出。文件日志仍由 `logging.level` 控制。

有关格式、配置和访问的完整概述，请参阅 [/logging](/zh/logging)。

### "Gateway启动被阻止：设置 gateway.mode=local"

这意味着配置存在但 `gateway.mode` 未设置（或不是 `local`），因此
Gateway拒绝启动。

**修复方法（推荐）：**

- 运行向导并将 Gateway 运行模式设置为 **Local**：
  ```bash
  openclaw configure
  ```
- 或直接设置：
  ```bash
  openclaw config set gateway.mode local
  ```

**如果你打算运行远程 Gateway：**

- 设置远程 URL 并保持 `gateway.mode=remote`：
  ```bash
  openclaw config set gateway.mode remote
  openclaw config set gateway.remote.url "wss://gateway.example.com"
  ```

**仅限临时/开发：**传递 `--allow-unconfigured` 以在不使用
`gateway.mode=local` 的情况下启动Gateway。

**还没有配置文件？**运行 `openclaw setup` 创建初始配置，然后重新运行
Gateway。

### 服务环境（PATH + 运行时）

Gateway服务以**最小化 PATH** 运行，以避免 shell/管理器的冗余：

- macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
- Linux: `/usr/local/bin`, `/usr/bin`, `/bin`

这有意排除了版本管理器（nvm/fnm/volta/asdf）和包
管理器（pnpm/npm），因为服务不会加载你的 shell 初始化。运行时
变量（如 `DISPLAY`）应该位于 `~/.openclaw/.env` 中（由
Gateway早期加载）。
在 `host=gateway` 上运行的 Exec 会将你的登录 shell `PATH` 合并到 exec 环境中，
因此缺少的工具通常意味着你的 shell 初始化未导出它们（或设置
了 `tools.exec.pathPrepend`）。请参阅 [/tools/exec](/zh/tools/exec)。

WhatsApp 和 Telegram 频道需要 **Node**；不支持 Bun。如果你的
服务是使用 Bun 或版本管理的 Node 路径安装的，请运行 `openclaw doctor`
迁移到系统 Node 安装。

### 技能在沙盒中缺少 API 密钥

**症状：**技能可以在主机上工作，但在沙盒中因缺少 API 密钥而失败。

**原因：**沙盒化的 exec 在 Docker 内部运行，并且**不会**继承主机 `process.env`。

**修复方法：**

- 设置 `agents.defaults.sandbox.docker.env`（或每个代理的 `agents.list[].sandbox.docker.env`）
- 或者将密钥烘焙到你的自定义沙盒镜像中
- 然后运行 `openclaw sandbox recreate --agent <id>`（或 `--all`）

### 服务正在运行但端口未监听

如果服务报告**正在运行**但Gateway端口上没有任何监听，
Gateway可能拒绝绑定。

**此处”正在运行”的含义**

- `Runtime: running` 意味着你的监督器（launchd/systemd/schtasks）认为进程是活动的。
- `RPC probe` 意味着 CLI 实际上可以连接到Gateway WebSocket 并调用 `status`。
- 始终信任 `Probe target:` + `Config (service):` 作为”我们实际尝试了什么？”的行。

**检查：**

- `gateway.mode` 对于 `openclaw gateway` 和服务必须是 `local`。
- 如果你设置了 `gateway.mode=remote`，**CLI 默认**为远程 URL。服务可能仍在本地运行，但你的 CLI 可能探测了错误的位置。使用 `openclaw gateway status` 查看服务的解析端口 + 探测目标（或传递 `--url`）。
- `openclaw gateway status` 和 `openclaw doctor` 在服务看起来正在运行但端口关闭时从日志中显示**最后一个Gateway错误**。
- 非环回绑定（`lan`/`tailnet`/`custom`，或环回不可用时的 `auto`）需要身份验证：
  `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- `gateway.remote.token` 仅用于远程 CLI 调用；它**不会**启用本地身份验证。
- `gateway.token` 被忽略；使用 `gateway.auth.token`。

**如果 `openclaw gateway status` 显示配置不匹配**

- `Config (cli): ...` 和 `Config (service): ...` 通常应该匹配。
- 如果不匹配，你几乎肯定正在编辑一个配置，而服务正在运行另一个配置。
- 修复方法：从你希望服务使用的相同 `--profile` / `OPENCLAW_STATE_DIR` 重新运行 `openclaw gateway install --force`。

**如果 `openclaw gateway status` 报告服务配置问题**

- 监督器配置（launchd/systemd/schtasks）缺少当前默认值。
- 修复方法：运行 `openclaw doctor` 更新它（或 `openclaw gateway install --force` 进行完全重写）。

**如果 `Last gateway error:` 提到”拒绝绑定……没有身份验证”**

- 你将 `gateway.bind` 设置为非环回模式（`lan`/`tailnet`/`custom`，或环回不可用时的 `auto`），但没有配置身份验证。
- 修复方法：设置 `gateway.auth.mode` + `gateway.auth.token`（或导出 `OPENCLAW_GATEWAY_TOKEN`）并重启服务。

**如果 `openclaw gateway status` 说 `bind=tailnet` 但未找到 tailnet 接口**

- Gateway尝试绑定到 Tailscale IP (100.64.0.0/10)，但在主机上未检测到任何接口。
- 修复方法：在该机器上启动 Tailscale（或将 `gateway.bind` 更改为 `loopback`/`lan`）。

**如果 `Probe note:` 说探测使用环回**

- 对于 `bind=lan` 这是预期的：Gateway监听 `0.0.0.0`（所有接口），环回仍应在本地连接。
- 对于远程客户端，使用真实的 LAN IP（不是 `0.0.0.0`）加上端口，并确保已配置身份验证。

### 地址已在使用中（端口 18789）

这意味着Gateway端口上已有监听内容。

**检查：**

```bash
openclaw gateway status
```

它将显示监听器和可能的原因（Gateway已在运行、SSH 隧道）。
如果需要，停止服务或选择不同的端口。

### 检测到额外的工作区文件夹

如果你从较旧的安装升级，磁盘上可能仍有 `~/openclaw`。
多个工作区目录可能导致身份验证或状态漂移令人困惑，因为
只有一个工作区处于活动状态。

**修复方法：**保持一个活动工作区并归档/删除其余的工作区。请参阅
[代理工作区](/zh/concepts/agent-workspace#extra-workspace-folders)。

### 主聊天在沙盒工作区中运行

症状：`pwd` 或文件工具显示 `~/.openclaw/sandboxes/...`，即使你
期望的是主机工作区。

**原因：**`agents.defaults.sandbox.mode: "non-main"` 基于 `session.mainKey`（默认 `"main"`）。
群组/频道会话使用自己的密钥，因此它们被视为非主会话并
获得沙盒工作区。

**修复选项：**

- 如果你希望代理使用主机工作区：设置 `agents.list[].sandbox.mode: "off"`。
- 如果你希望在沙盒内访问主机工作区：为该代理设置 `workspaceAccess: "rw"`。

### "代理被中止"

代理在响应过程中被中断。

**原因：**

- 用户发送了 `stop`、`abort`、`esc`、`wait` 或 `exit`
- 超时已超过
- 进程崩溃

**修复方法：**只需发送另一条消息。会话继续。

### "代理在回复之前失败：未知模型：anthropic/claude-haiku-3-5"

OpenClaw 有意拒绝**较旧/不安全的模型**（尤其是那些更容易受到提示注入的模型）。如果看到此错误，则不再支持该模型名称。

**修复方法：**

- 为提供商选择一个**最新**模型并更新你的配置或模型别名。
- 如果你不确定哪些模型可用，请运行 `openclaw models list` 或
  `openclaw models scan` 并选择一个支持的模型。
- 检查Gateway日志以获取详细的失败原因。

另请参阅：[模型 CLI](/zh/cli/models) 和 [模型提供商](/zh/concepts/model-providers)。

### 消息未触发

**检查 1：**发送者是否在白名单中？

```bash
openclaw status
```

在输出中查找 `AllowFrom: ...`。

**检查 2：**对于群组聊天，是否需要提及？

```bash
# The message must match mentionPatterns or explicit mentions; defaults live in channel groups/guilds.
# Multi-agent: `agents.list[].groupChat.mentionPatterns` overrides global patterns.
grep -n "agents\\|groupChat\\|mentionPatterns\\|channels\\.whatsapp\\.groups\\|channels\\.telegram\\.groups\\|channels\\.imessage\\.groups\\|channels\\.discord\\.guilds" \
  "${OPENCLAW_CONFIG_PATH:-$HOME/.openclaw/openclaw.json}"
```

**检查 3：**检查日志

```bash
openclaw logs --follow
# or if you want quick filters:
tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)" | grep "blocked\\|skip\\|unauthorized"
```

### 配对代码未到达

如果 `dmPolicy` 是 `pairing`，未知发送者应该收到一个代码，并且他们的消息在被批准之前将被忽略。

**检查 1：**是否已有待处理的请求在等待？

```bash
openclaw pairing list <channel>
```

待处理的私聊配对请求默认限制为**每个频道 3 个**。如果列表已满，新请求将不会生成代码，直到其中一个被批准或过期。

**检查 2：**请求是否已创建但没有发送回复？

```bash
openclaw logs --follow | grep "pairing request"
```

**检查 3：**确认该频道的 `dmPolicy` 不是 `open`/`allowlist`。

### 图片 + 提及不起作用

已知问题：当你发送仅包含提及（没有其他文本）的图片时，WhatsApp 有时不包含提及元数据。

**解决方法：**在提及时添加一些文本：

- ❌ `@openclaw` + 图片
- ✅ `@openclaw check this` + 图片

### 会话未恢复

**检查 1：**会话文件是否存在？

```bash
ls -la ~/.openclaw/agents/<agentId>/sessions/
```

**检查 2：**重置窗口是否太短？

```json
{
  "session": {
    "reset": {
      "mode": "daily",
      "atHour": 4,
      "idleMinutes": 10080 // 7 days
    }
  }
}
```

**检查 3：**是否有人发送了 `/new`、`/reset` 或重置触发器？

### 代理超时

默认超时为 30 分钟。对于长时间任务：

```json
{
  "reply": {
    "timeoutSeconds": 3600 // 1 hour
  }
}
```

或使用 `process` 工具将长命令后台化。

### WhatsApp 已断开连接

```bash
# Check local status (creds, sessions, queued events)
openclaw status
# Probe the running gateway + channels (WA connect + Telegram + Discord APIs)
openclaw status --deep

# View recent connection events
openclaw logs --limit 200 | grep "connection\\|disconnect\\|logout"
```

**修复方法：**通常在Gateway运行后自动重新连接。如果你卡住了，请重启Gateway进程（无论你如何监督它），或使用详细输出手动运行它：

```bash
openclaw gateway --verbose
```

如果你已登出/取消链接：

```bash
openclaw channels logout
trash "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/credentials" # if logout can't cleanly remove everything
openclaw channels login --verbose       # re-scan QR
```

### 媒体发送失败

**检查 1：**文件路径是否有效？

```bash
ls -la /path/to/your/image.jpg
```

**检查 2：**文件是否太大？

- 图片：最大 6MB
- 音频/视频：最大 16MB
- 文档：最大 100MB

**检查 3：**检查媒体日志

```bash
grep "media\\|fetch\\|download" "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)" | tail -20
```

### 内存使用率高

OpenClaw 在内存中保留对话历史记录。

**修复方法：**定期重启或设置会话限制：

```json
{
  "session": {
    "historyLimit": 100 // Max messages to keep
  }
}
```

## 常见故障排除

### “Gateway无法启动 — 配置无效”

当配置包含未知键、格式错误的值或无效类型时，OpenClaw 现在拒绝启动。
这是为了安全而有意设计的。

使用 Doctor 修复它：

```bash
openclaw doctor
openclaw doctor --fix
```

注意事项：

- `openclaw doctor` 报告每个无效条目。
- `openclaw doctor --fix` 应用迁移/修复并重写配置。
- 像 `openclaw logs`、`openclaw health`、`openclaw status`、`openclaw gateway status` 和 `openclaw gateway probe` 这样的诊断命令即使配置无效也能运行。

### “所有模型都失败” — 我应该先检查什么？

- 为尝试的提供商存在**凭据**（身份验证配置文件 + 环境变量）。
- **模型路由**：确认 `agents.defaults.model.primary` 和回退是你可访问的模型。
- **Gateway日志**在 `/tmp/openclaw/…` 中获取确切的提供商错误。
- **模型状态**：使用 `/model status`（聊天）或 `openclaw models status`（CLI）。

### 我正在使用我的个人 WhatsApp 号码 — 为什么自聊很奇怪？

启用自聊模式并将你自己的号码加入白名单：

```json5
{
  channels: {
    whatsapp: {
      selfChatMode: true,
      dmPolicy: "allowlist",
      allowFrom: ["+15555550123"],
    },
  },
}
```

请参阅 [WhatsApp 设置](/zh/channels/whatsapp)。

### WhatsApp 将我登出了。如何重新进行身份验证？

再次运行登录命令并扫描二维码：

```bash
openclaw channels login
```

### `main` 上的构建错误 — 标准修复路径是什么？

1. `git pull origin main && pnpm install`
2. `openclaw doctor`
3. 检查 GitHub issues 或 Discord
4. 临时解决方法：检出较旧的提交

### npm install 失败（allow-build-scripts / 缺少 tar 或 yargs）。现在怎么办？

如果你从源代码运行，请使用仓库的包管理器：**pnpm**（首选）。
仓库声明 `packageManager: "pnpm@…"`。

典型的恢复方法：

```bash
git status   # ensure you’re in the repo root
pnpm install
pnpm build
openclaw doctor
openclaw gateway restart
```

原因：pnpm 是此仓库配置的包管理器。

### 如何在 git 安装和 npm 安装之间切换？

使用**网站安装程序**并使用标志选择安装方法。它
就地升级并重写Gateway服务以指向新安装。

切换**到 git 安装**：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --no-onboard
```

切换**到 npm 全局**：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

注意事项：

- git 流程仅在仓库干净时才进行 rebase。首先提交或存储更改。
- 切换后，运行：
  ```bash
  openclaw doctor
  openclaw gateway restart
  ```

### Telegram 块流不在工具调用之间拆分文本。为什么？

块流仅发送**已完成的文本块**。你看到单条消息的常见原因：

- `agents.defaults.blockStreamingDefault` 仍然是 `"off"`。
- `channels.telegram.blockStreaming` 设置为 `false`。
- `channels.telegram.streamMode` 是 `partial` 或 `block` **并且草稿流处于活动状态**
  （私聊 + 主题）。在这种情况下，草稿流会禁用块流。
- 你的 `minChars` / 合并设置太高，因此块被合并。
- 模型发出一个大的文本块（没有中间刷新点）。

修复清单：

1. 将块流设置放在 `agents.defaults` 下，而不是根目录。
2. 如果你想要真正的多消息块回复，请设置 `channels.telegram.streamMode: "off"`。
3. 在调试时使用较小的块/合并阈值。

请参阅 [流式传输](/zh/concepts/streaming)。

### Discord 即使有 `requireMention: false` 也不在我的服务器中回复。为什么？

`requireMention` 仅在频道通过白名单**之后**控制提及门控。
默认情况下 `channels.discord.groupPolicy` 是**白名单**，因此必须显式启用服务器。
如果你设置了 `channels.discord.guilds.<guildId>.channels`，则仅允许列出的频道；省略它以允许服务器中的所有频道。

修复清单：

1. 设置 `channels.discord.groupPolicy: "open"` **或**添加服务器白名单条目（以及可选的频道白名单）。
2. 在 `channels.discord.guilds.<guildId>.channels` 中使用**数字频道 ID**。
3. 将 `requireMention: false` 放在 `channels.discord.guilds` **之下**（全局或每个频道）。
   顶级 `channels.discord.requireMention` 不是受支持的键。
4. 确保机器人具有**消息内容意图**和频道权限。
5. 运行 `openclaw channels status --probe` 以获取审计提示。

文档：[Discord](/zh/channels/discord)、[频道故障排除](/zh/channels/troubleshooting)。

### Cloud Code Assist API 错误：无效的工具架构 (400)。现在怎么办？

这几乎总是一个**工具架构兼容性**问题。Cloud Code Assist
端点接受 JSON Schema 的严格子集。OpenClaw 在当前的 `main` 中清理/规范化工具
架构，但修复尚未包含在最后一个版本中（截至
2026 年 1 月 13 日）。

修复清单：

1. **更新 OpenClaw**：
   - 如果你可以从源代码运行，请拉取 `main` 并重启Gateway。
   - 否则，请等待包含架构清理器的下一个版本。
2. 避免使用不支持的关键字，如 `anyOf/oneOf/allOf`、`patternProperties`、
   `additionalProperties`、`minLength`、`maxLength`、`format` 等。
3. 如果你定义自定义工具，请将顶级架构保持为 `type: "object"`，并使用
   `properties` 和简单的枚举。

请参阅 [工具](/zh/tools) 和 [TypeBox 架构](/zh/concepts/typebox)。

## macOS 特定问题

### 授予权限（语音/麦克风）时应用崩溃

当你在隐私提示上点击"允许"时，应用消失或显示"Abort trap 6"：

**修复方法 1：重置 TCC 缓存**

```bash
tccutil reset All bot.molt.mac.debug
```

**修复方法 2：强制使用新 Bundle ID**
如果重置不起作用，请在 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 中更改 `BUNDLE_ID`（例如，添加 `.test` 后缀）并重新构建。这会强制 macOS 将其视为新应用。

### Gateway卡在"正在启动..."

应用程序连接到端口 `18789` 上的本地Gateway。如果一直卡住：

**修复方法 1：停止监督器（首选）**
如果Gateway由 launchd 监督，杀死 PID 只会重新生成它。首先停止监督器：

```bash
openclaw gateway status
openclaw gateway stop
# Or: launchctl bootout gui/$UID/bot.molt.gateway (replace with bot.molt.<profile>; legacy com.openclaw.* still works)
```

**修复方法 2：端口繁忙（查找监听器）**

```bash
lsof -nP -iTCP:18789 -sTCP:LISTEN
```

如果是无监督进程，请首先尝试正常停止，然后升级：

```bash
kill -TERM <PID>
sleep 1
kill -9 <PID> # last resort
```

**修复方法 3：检查 CLI 安装**
确保全局 `openclaw` CLI 已安装并与应用版本匹配：

```bash
openclaw --version
npm install -g openclaw@<version>
```

## 调试模式

获取详细日志记录：

```bash
# Turn on trace logging in config:
#   ${OPENCLAW_CONFIG_PATH:-$HOME/.openclaw/openclaw.json} -> { logging: { level: "trace" } }
#
# Then run verbose commands to mirror debug output to stdout:
openclaw gateway --verbose
openclaw channels login --verbose
```

## 日志位置

| Log                               | Location                                                                                                                                                                                                                                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gateway file logs (structured)    | `/tmp/openclaw/openclaw-YYYY-MM-DD.log` (or `logging.file`)                                                                                                                                                                                                                                                                 |
| Gateway service logs (supervisor) | macOS: `$OPENCLAW_STATE_DIR/logs/gateway.log` + `gateway.err.log` (default: `~/.openclaw/logs/...`; profiles use `~/.openclaw-<profile>/logs/...`)<br />Linux: `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`<br />Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST` |
| Session files                     | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                                                                                                                                                                                                                                                                            |
| Media cache                       | `$OPENCLAW_STATE_DIR/media/`                                                                                                                                                                                                                                                                                                |
| Credentials                       | `$OPENCLAW_STATE_DIR/credentials/`                                                                                                                                                                                                                                                                                          |

## 健康检查

```bash
# Supervisor + probe target + config paths
openclaw gateway status
# Include system-level scans (legacy/extra services, port listeners)
openclaw gateway status --deep

# Is the gateway reachable?
openclaw health --json
# If it fails, rerun with connection details:
openclaw health --verbose

# Is something listening on the default port?
lsof -nP -iTCP:18789 -sTCP:LISTEN

# Recent activity (RPC log tail)
openclaw logs --follow
# Fallback if RPC is down
tail -20 /tmp/openclaw/openclaw-*.log
```

## 重置所有内容

终极选项：

```bash
openclaw gateway stop
# If you installed a service and want a clean install:
# openclaw gateway uninstall

trash "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
openclaw channels login         # re-pair WhatsApp
openclaw gateway restart           # or: openclaw gateway
```

⚠️ 这将丢失所有会话并需要重新配对 WhatsApp。

## 获取帮助

1. 首先检查日志：`/tmp/openclaw/`（默认：`openclaw-YYYY-MM-DD.log`，或你配置的 `logging.file`）
2. 在 GitHub 上搜索现有问题
3. 打开一个新问题，包括：
   - OpenClaw 版本
   - 相关日志片段
   - 重现步骤
   - 你的配置（编辑密钥！）

---

_"你试过关掉再打开吗？"_ — 每个 IT 人员

🦞🔧

### 浏览器未启动（Linux）

如果你看到 `"Failed to start Chrome CDP on port 18800"`：

**最可能的原因：**Ubuntu 上的 Snap 打包 Chromium。

**快速修复方法：**改为安装 Google Chrome：

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
```

然后在配置中设置：

```json
{
  "browser": {
    "executablePath": "/usr/bin/google-chrome-stable"
  }
}
```

**完整指南：**请参阅 [browser-linux-troubleshooting](/zh/tools/browser-linux-troubleshooting)
