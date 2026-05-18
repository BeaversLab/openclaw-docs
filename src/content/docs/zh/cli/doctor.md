---
summary: "`openclaw doctor`CLICLI 参考（健康检查 + 指导修复）"
read_when:
  - You have connectivity/auth issues and want guided fixes
  - You updated and want a sanity check
title: "Doctor"
---

# `openclaw doctor`

针对网关和通道的健康检查 + 快速修复。

相关内容：

- 故障排除：[故障排除](/zh/gateway/troubleshooting)
- 安全审计：[安全](/zh/gateway/security)

## 示例

```bash
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep
openclaw doctor --repair --non-interactive
openclaw doctor --generate-gateway-token
```

对于特定渠道的权限，请使用渠道探针而不是 `doctor`：

```bash
openclaw channels capabilities --channel discord --target channel:<channel-id>
openclaw channels status --probe
```

针对 Discord 功能的探针会报告机器人的有效渠道权限；状态探针会审计已配置的 Discord 渠道和语音自动加入目标。

## 选项

- `--no-workspace-suggestions`：禁用工作区内存/搜索建议
- `--yes`：接受默认值而不提示
- `--repair`：应用推荐的非服务修复而不提示；Gateway 服务安装和重写仍需要交互式确认或显式的 Gateway 命令
- `--fix`：`--repair` 的别名
- `--force`：应用激进的修复，包括在需要时覆盖自定义服务配置
- `--non-interactive`：无提示运行；仅限安全迁移和非服务修复
- `--generate-gateway-token`：生成并配置 Gateway 令牌
- `--deep`Gateway(网关)：扫描系统服务以查找额外的 Gateway 安装，并报告最近的 Gateway(网关) 监管器重启交接

备注：

- 在 Nix 模式 (Nix`OPENCLAW_NIX_MODE=1`) 下，只读的 doctor 检查仍然有效，但由于 `openclaw.json`Nix 是不可变的，因此 `doctor --fix`、`doctor --repair`、`doctor --yes` 和 `doctor --generate-gateway-token` 被禁用。请改为编辑此安装的 Nix 源；对于 nix-openclaw，请使用以代理优先的 [快速开始](https://github.com/openclaw/nix-openclaw#quick-start)。
- 交互式提示（如钥匙串/OAuth 修复）仅在 stdin 是 TTY 且 OAuth`--non-interactive` **未**设置时运行。无头运行（cron、Telegram、无终端）将跳过提示。
- 性能：非交互式 `doctor` 运行会跳过插件急切加载，以便无头运行的健康检查保持快速。当检查需要插件的贡献时，交互式会话仍会完全加载插件。
- `--fix`（`--repair` 的别名）会将备份写入 `~/.openclaw/openclaw.json.bak` 并删除未知的配置键，列出每个删除项。
- `doctor --fix --non-interactive` 会报告缺失或过时的网关服务定义，但在更新修复模式之外不会安装或重写它们。对于缺失的服务，请运行 `openclaw gateway install`；如果您有意要替换启动器，请运行 `openclaw gateway install --force`。
- 状态完整性检查现在会检测会话目录中的孤立脚本文件。将它们归档为 `.deleted.<timestamp>` 需要交互式确认；`--fix`、`--yes` 和无头运行将使它们保留原位。
- Doctor 还会扫描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中的旧版 cron 作业格式，并可以在调度程序必须在运行时自动规范化它们之前就地重写它们。
- Doctor 会报告具有显式 `payload.model` 覆盖的 cron 作业，包括提供商命名空间计数以及与 `agents.defaults.model` 的不匹配情况，以便在身份验证或计费调查期间能看到未继承默认模型的计划作业。
- 在 Linux 上，如果用户的 crontab 仍在运行旧版 Linux`~/.openclaw/bin/ensure-whatsapp.sh`WhatsApp，doctor 会发出警告；该脚本已不再维护，并且当 cron 缺少 systemd 用户总线环境时，可能会记录错误的 WhatsApp 网关中断。
- 启用 WhatsApp 时，doctor 会检查是否存在本地 WhatsAppGateway(网关)`openclaw-tui` 客户端仍在运行的 Gateway 事件循环降级情况。`doctor --fix`TUIWhatsAppTUI 仅停止已验证的本地 TUI 客户端，以免 WhatsApp 回复被排在过时的 TUI 刷新循环之后。
- Doctor 会将主要模型、回退、心跳/子代理/压缩覆盖、钩子、渠道模型覆盖和过时的会话路由引脚中的旧版 `openai-codex/*` 模型引用重写为规范 `openai/*` 引用。`--fix` 会将 Codex 意图移至提供商/模型范围的 `agentRuntime.id: "codex"` 条目上，保留会话身份验证配置文件引脚（如 `openai-codex:...`OpenAIOpenAIAPI），移除过时的整体代理/会话运行时引脚，并保留 Codex 身份验证路由上修复后的 OpenAI 代理引用，而不是直接的 OpenAI API 密钥身份验证。
- Doctor 会清除由旧版 OpenClaw 创建的旧版插件依赖暂存状态，并为将其声明为对等依赖项的受管 npm 插件重新链接主机 OpenClaw`openclaw`npm 包。它还会修复配置中引用的缺失的可下载插件，例如 `plugins.entries`、配置的渠道、配置的提供商/搜索设置或配置的代理运行时。在包更新期间，doctor 会跳过包管理器插件的修复，直到包交换完成；如果配置的插件仍需要恢复，请在之后重新运行 `openclaw doctor --fix`。如果下载失败，doctor 会报告安装错误并保留配置的插件条目以供下次修复尝试。
- Doctor 通过从 `plugins.allow`/`plugins.deny`/`plugins.entries` 中移除缺失的插件 ID 来修复过时的插件配置，并在插件发现正常时移除匹配的悬空渠道配置、心跳目标和渠道模型覆盖。
- Doctor 通过禁用受影响的 `plugins.entries.<id>` 条目并移除其无效的 `config`Gateway(网关) 负载来隔离无效的插件配置。Gateway 启动时已经跳过该错误的插件，以便其他插件和渠道可以继续运行。
- 当另一个监管者拥有 Gateway 生命周期时，请设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。Doctor 仍会报告 Gateway/服务的运行状况并应用非服务修复，但会跳过服务安装/启动/重启/引导和旧版服务清理。
- 在 Linux 上，doctor 会忽略不活动的额外类 Gateway systemd 单元，并且在修复期间不会为正在运行的 systemd Gateway 服务重写 command/entrypoint 元数据。首先停止该服务，或者当您有意要替换活动的启动器时使用 Linux`openclaw gateway install --force`。
- Doctor 会自动将旧的扁平 Talk 配置（`talk.voiceId`、`talk.modelId` 等）迁移到 `talk.provider` + `talk.providers.<provider>`。
- 重复运行 `doctor --fix` 不再报告/应用 Talk 规范化，当唯一区别是对象键顺序时。
- Doctor 包含内存搜索就绪检查，并在缺少嵌入凭据时推荐 `openclaw configure --section model`。
- 当未配置命令所有者时，Doctor 会发出警告。命令所有者是允许运行仅限所有者的命令并批准危险操作的人工操作员帐户。私信配对仅允许某人与机器人对话；如果在首次所有者引导存在之前您批准了发送者，请显式设置 `commands.ownerAllowFrom`。
- 当配置了 Codex 模式的代理且操作员的 Codex 主目录中存在个人 Codex CLI 资产时，Doctor 会发出警告。本地 Codex 应用服务器启动使用隔离的按代理主目录，因此请使用 CLI`openclaw migrate codex --dry-run` 来列出应有意识地提升的资产。
- Doctor 会移除已弃用的 `plugins.entries.codex.config.codexDynamicToolsProfile`；Codex 应用服务器始终保持 Codex 原生工作区工具的原生性。
- 当由于缺少二进制文件、环境变量、配置或操作系统要求，导致允许默认代理使用的技能在当前运行时环境中不可用时，Doctor 会发出警告。`doctor --fix` 可以使用 `skills.entries.<skill>.enabled=false` 禁用这些不可用的技能；如果您想保持技能处于活动状态，请改为安装/配置缺少的要求。
- 如果启用了沙盒模式但 Docker 不可用，doctor 会报告高信号警告并提供补救措施（Docker`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果存在旧的沙盒注册表文件（`~/.openclaw/sandbox/containers.json` 或 `~/.openclaw/sandbox/browsers.json`），doctor 会报告它们；`openclaw doctor --fix` 会将有效条目迁移到分片注册表目录，并将无效的旧文件隔离。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理且在当前命令路径中不可用，doctor 会报告只读警告，并且不会写入纯文本回退凭据。
- 如果在修复路径中渠道 SecretRef 检查失败，doctor 会继续运行并报告警告，而不是提前退出。
- 在状态目录迁移后，当启用的默认 Telegram 或 Discord 账户依赖于 env 回退且 TelegramDiscord`TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN` 对 doctor 进程不可用时，doctor 会发出警告。
- Telegram Telegram`allowFrom` 用户名自动解析 (`doctor --fix`Telegram) 需要在当前命令路径中有可解析的 Telegram token。如果 token 检查不可用，doctor 将报告警告并跳过该轮次的自动解析。

## macOS: macOS`launchctl` env overrides

如果您之前运行过 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (或 `...PASSWORD`)，该值将覆盖您的配置文件，并可能导致持续的“unauthorized”错误。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## 相关

- [CLI reference](CLI/en/cli)
- [Gateway doctor](<Gateway(网关)/en/gateway/doctor>)
