---
summary: "CLICLI 参考文档，用于 `openclaw doctor` （健康检查 + 引导式修复）"
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

## 为什么要使用它

`openclaw doctor`OpenClaw 是 OpenClaw 的健康检查界面。当网关、
渠道、插件、技能、模型路由、本地状态或配置迁移
未按预期运行，且您希望使用一个命令来解释问题所在时，请使用它。

Doctor 有三种模式：

| 模式 | 命令                     | 行为                                                     |
| ---- | ------------------------ | -------------------------------------------------------- |
| 检查 | `openclaw doctor`        | 面向人类的检查和引导式提示。                             |
| 修复 | `openclaw doctor --fix`  | 应用支持的修复，除非非交互式修复是安全的，否则使用提示。 |
| Lint | `openclaw doctor --lint` | 用于 CI、预检和审查门的只读结构化发现结果。              |

当自动化需要稳定结果时，请首选 `--lint`。当人工
操作员有意让 doctor 编辑配置或状态时，请首选 `--fix`。

## 示例

```bash
openclaw doctor
openclaw doctor --lint
openclaw doctor --lint --json
openclaw doctor --lint --severity-min warning
openclaw doctor --deep
openclaw doctor --fix
openclaw doctor --fix --non-interactive
openclaw doctor --generate-gateway-token
```

对于特定于渠道的权限，请使用渠道探针而不是 `doctor`：

```bash
openclaw channels capabilities --channel discord --target channel:<channel-id>
openclaw channels status --probe
```

定向 Discord 功能探针报告机器人有效的渠道权限；状态探针审计已配置的 Discord 渠道和语音自动加入目标。

## 选项

- `--no-workspace-suggestions`：禁用工作区内存/搜索建议
- `--yes`：接受默认值而不提示
- `--repair`：不经提示应用推荐的非服务修复；网关服务安装和重写仍然需要交互式确认或显式网关命令
- `--fix`：`--repair` 的别名
- `--force`：应用激进修复，包括在需要时覆盖自定义服务配置
- `--non-interactive`：无提示运行；仅限安全迁移和非服务修复
- `--generate-gateway-token`：生成并配置 Gateway(网关) 令牌
- `--deep`Gateway(网关)：扫描系统服务以查找额外的 Gateway(网关) 安装，并报告最近的 Gateway(网关) 管理器重启交接
- `--lint`：以只读模式运行现代化的健康检查并输出诊断结果
- `--json`：配合 `--lint` 使用，输出 JSON 格式的结果而非人类可读的输出
- `--severity-min <level>`：配合 `--lint` 使用，丢弃低于 `info`、`warning` 或 `error` 的结果
- `--skip <id>`：配合 `--lint` 使用，跳过指定的检查 ID；重复此操作可跳过多个
- `--only <id>`：配合 `--lint` 使用，仅运行指定的检查 ID；重复此操作可运行一小部分选定的集合

## Lint 模式

`openclaw doctor --lint` 是用于 doctor 检查的只读自动化姿态。
它使用结构化健康检查路径，不提示，也不修复
或重写配置/状态。当你想要机器可读的结果而不是引导式修复提示时，请在 CI、预检脚本和审查工作流中使用它。
Lint 输出选项（如 `--json`、`--severity-min`、`--only` 和 `--skip`）
仅在 `--lint` 下被接受。

```bash
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --only core/doctor/gateway-config --json
```

人类可读的输出是精简的：

```text
doctor --lint: ran 6 check(s), 1 finding(s)
  [warning] core/doctor/gateway-config gateway.mode - gateway.mode is unset; gateway start will be blocked.
    fix: Run `openclaw configure` and set Gateway mode (local/remote), or `openclaw config set gateway.mode local`.
```

JSON 输出是 lint 运行的脚本接口：

```json
{
  "ok": false,
  "checksRun": 5,
  "checksSkipped": 0,
  "findings": [
    {
      "checkId": "core/doctor/gateway-config",
      "severity": "warning",
      "message": "gateway.mode is unset; gateway start will be blocked.",
      "path": "gateway.mode",
      "fixHint": "Run `openclaw configure` and set Gateway mode (local/remote), or `openclaw config set gateway.mode local`."
    }
  ]
}
```

退出行为：

- `0`：没有达到或超过所选严重性阈值的结果
- `1`：至少有一个结果达到所选阈值
- `2`：在生成 lint 结果之前发生命令/运行时故障

`--severity-min` 同时控制可见结果和退出阈值。例如，
即使存在较低严重性的 `info` 或 `warning` 结果，
`openclaw doctor --lint --severity-min error` 也可以不打印任何结果并以 `0` 退出。

## 结构化健康检查

现代 doctor 检查使用一种小型的结构化契约：

```ts
detect(ctx, scope?) -> HealthFinding[]
repair?(ctx, findings) -> HealthRepairResult
```

`detect()` 驱动 `doctor --lint`。`repair()` 是可选的，仅被 `doctor --fix` / `doctor --repair` 考虑。尚未迁移到此形状的检查将继续使用传统的 doctor 贡献流程。

这种拆分是故意的：`detect()` 负责诊断，而 `repair()` 负责报告其更改或将要更改的内容。Repair 上下文可以携带 `dryRun`/`diff` 请求，repair 结果可以返回用于配置/文件编辑的结构化 `diffs`，以及用于服务、进程、包、状态或其他副作用的 `effects`。这使得转换后的检查能够朝着 `doctor --fix --dry-run` 和差异报告的方向发展，而无需将变更规划移入 `detect()`。

`repair()` 通过 `status:
"repaired" | "skipped" | "failed"`. Omitted status means `repaired` 报告其是否尝试了请求的修复，因此简单的修复检查只需返回更改即可。当 repair 返回 `skipped` 或 `failed` 时，doctor 会报告原因并且不对该检查运行验证。

在成功的结构化修复之后，doctor 会以修复后的发现为范围重新运行 `detect()`。检查可以使用选定的发现、路径或 `ocPath` 值进行集中验证。如果发现仍然存在，doctor 会报告修复警告，而不是将更改视为静默完成。

一个发现包括：

| 字段              | 用途                                                |
| ----------------- | --------------------------------------------------- |
| `checkId`         | 用于 skip/only 过滤器和 CI 允许列表的稳定 ID。      |
| `severity`        | `info`、`warning` 或 `error`。                      |
| `message`         | 人类可读的问题陈述。                                |
| `path`            | 可用时的配置、文件或逻辑路径。                      |
| `line` / `column` | 可用时的源位置。                                    |
| `ocPath`          | 当检查可以指向特定 `oc://` 地址时，提供该精确地址。 |
| `fixHint`         | 建议的操作员操作或修复摘要。                        |

此版本在结构化健康路径上注册了现代化的核心 doctor 检查。`openclaw/plugin-sdk/health` 子路径为捆绑的后续使用者公开了相同的约定，但插件支持的检查仅在其所属包在活动命令路径中注册它们后才会运行。

## 检查选择

当工作流程需要集中的关卡时，请使用 `--only` 和 `--skip`：

```bash
openclaw doctor --lint --only core/doctor/gateway-config --json
openclaw doctor --lint --skip core/doctor/skills-readiness
```

`--only` 和 `--skip` 接受完整的检查 ID 并且可以重复使用。如果未注册 `--only` ID，则该 ID 不会运行任何检查；使用命令的 `checksRun` 和 `checksSkipped` 字段来验证集中关卡是否选择了您预期的检查。

备注：

- 在 Nix 模式 (`OPENCLAW_NIX_MODE=1`) 下，只读 doctor 检查仍然有效，但 `doctor --fix`、`doctor --repair`、`doctor --yes` 和 `doctor --generate-gateway-token` 已被禁用，因为 `openclaw.json` 是不可变的。请改为编辑此安装的 Nix 源；对于 nix-openclaw，请使用以代理优先的[快速开始](https://github.com/openclaw/nix-openclaw#quick-start)。
- 交互式提示（如钥匙串/OAuth 修复）仅在 stdin 是 TTY 且未设置 `--non-interactive` 时运行。无头运行（cron、Telegram、无终端）将跳过提示。
- 性能：非交互式 `doctor` 运行会跳过急切的插件加载，以便无头健康检查保持快速。交互式 doctor 会话仍会加载传统健康和修复流程所需的插件界面。
- `--lint` 比 `--non-interactive` 更严格：它始终是只读的，从不提示，也从不应用安全迁移。当您希望 doctor 进行更改时，请运行 `doctor --fix` 或 `doctor --repair`。
- `--fix`（`--repair` 的别名）会将备份写入 `~/.openclaw/openclaw.json.bak` 并丢弃未知的配置键，列出每一项删除。
- 现代化的健康检查可以为 `doctor --fix` 暴露 `repair()` 路径；未暴露路径的检查继续通过现有的 doctor 修复流程。
- `doctor --fix --non-interactive` 会报告缺失或过时的 Gateway 服务定义，但在更新修复模式之外不会安装或重写它们。对于缺失的服务，运行 `openclaw gateway install`；或者当您有意要替换启动器时，运行 `openclaw gateway install --force`。
- 状态完整性检查现在可以检测会话目录中的孤立转录文件。将它们归档为 `.deleted.<timestamp>` 需要交互式确认；`--fix`、`--yes` 和无头运行会将其保留在原位。
- Doctor 还会扫描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中的旧版 cron 作业格式，并可以在调度程序必须在运行时自动规范化它们之前就地重写它们。
- Doctor 会报告带有显式 `payload.model` 覆盖的 cron 作业，包括提供商命名空间计数以及与 `agents.defaults.model` 的不匹配情况，以便在身份验证或计费调查中可以看到未继承默认 模型 的计划作业。
- 在 Linux 上，当用户的 crontab 仍在运行旧版 `~/.openclaw/bin/ensure-whatsapp.sh` 时，doctor 会发出警告；该脚本不再维护，并且当 cron 缺少 systemd user-bus 环境时，可能会记录错误的 WhatsApp Gateway 故障。
- 当启用 WhatsApp 时，doctor 会检查 Gateway(网关) 事件循环是否出现降级，且本地 `openclaw-tui` 客户端仍在运行。`doctor --fix` 仅停止已验证的本地 TUI 客户端，因此 WhatsApp 回复不会排在过时的 TUI 刷新循环之后。
- Doctor 将主模型、回退、心跳/子代理/压缩覆盖、钩子、渠道模型覆盖和过时的会话路由锁定中的旧版 `openai-codex/*` 模型引用重写为规范的 `openai/*` 引用。`--fix` 将 Codex 意图移动到提供商/模型范围的 `agentRuntime.id: "codex"` 条目上，保留会话身份验证配置文件锁定（如 `openai-codex:...`），移除过时的整个代理/会话运行时锁定，并在 Codex 身份验证路由上保留修复后的 OpenAI 代理引用，而不是直接使用 OpenAI API 密钥进行身份验证。
- Doctor 清除由旧版 OpenClaw 创建的旧版插件依赖暂存状态，并为声明 `openclaw` 为对等依赖的托管 npm 插件重新链接主机的 `openclaw` 包。它还会修复配置中引用的缺失的可下载插件，例如 `plugins.entries`、配置的渠道、配置的提供商/搜索设置或配置的代理运行时。在包更新期间，doctor 会跳过包管理器插件修复，直到包交换完成；如果配置的插件仍需要恢复，请随后重新运行 `openclaw doctor --fix`。如果下载失败，doctor 会报告安装错误并保留配置的插件条目以供下次修复尝试。
- Doctor 通过从 `plugins.allow`/`plugins.deny`/`plugins.entries` 中删除缺失的插件 ID 来修复过时的插件配置，并在插件发现正常时，删除匹配的悬空渠道配置、心跳目标和渠道模型覆盖。
- Doctor 通过禁用受影响的 `plugins.entries.<id>` 条目并删除其无效的 `config` 负载来隔离无效的插件配置。Gateway(网关) 启动时已经仅跳过该错误插件，以便其他插件和渠道可以继续运行。
- 当另一个管理器拥有网关生命周期时，请设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。Doctor 仍会报告网关/服务的健康状况并应用非服务修复，但会跳过服务安装/启动/重启/引导和旧版服务清理。
- 在 Linux 上，doctor 会忽略不活跃的额外类网关 systemd 单元，并且在修复期间不会为正在运行的 systemd 网关服务重写命令/入口点元数据。如果您有意要替换当前的启动器，请先停止该服务或使用 `openclaw gateway install --force`。
- Doctor 会自动将旧的扁平 Talk 配置（`talk.voiceId`、`talk.modelId` 及同类配置）迁移到 `talk.provider` + `talk.providers.<provider>` 中。
- 重复运行 `doctor --fix` 不再报告/应用 Talk 规范化，当唯一差异是对象键顺序时。
- Doctor 包含内存搜索就绪检查，并在缺少嵌入凭证时推荐使用 `openclaw configure --section model`。
- 当未配置命令所有者时，Doctor 会发出警告。命令所有者是允许运行仅限所有者的命令并批准危险操作的人工操作员账户。 配对仅允许某人与机器人对话；如果您在首次所有者引导存在之前批准了发送者，请显式设置 `commands.ownerAllowFrom`。
- 当配置了 Codex 模式代理且操作员的 Codex 主目录中存在个人 Codex CLI 资产时，Doctor 会发出警告。本地 Codex 应用服务器启动使用隔离的每代理主目录，因此请使用 `openclaw migrate codex --dry-run` 来清点应有意识提升的资产。
- Doctor 会移除已退役的 `plugins.entries.codex.config.codexDynamicToolsProfile`；Codex 应用服务器始终将 Codex 原生工作区工具保持为原生状态。
- 当允许默认代理使用的技能因缺少 bin、环境变量、配置或 OS 要求而在当前运行时环境中不可用时，Doctor 会发出警告。`doctor --fix` 可以使用 `skills.entries.<skill>.enabled=false` 禁用那些不可用的技能；当您希望保持技能处于活动状态时，请改为安装/配置缺失的要求。
- 如果启用了沙箱模式但 Docker 不可用，doctor 会报告高信号警告并提供修复建议 (Docker`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`)。
- 如果存在旧版沙箱注册表文件 (`~/.openclaw/sandbox/containers.json` 或 `~/.openclaw/sandbox/browsers.json`)，doctor 会报告它们；`openclaw doctor --fix` 会将有效条目迁移到分片注册表目录，并将无效的旧版文件隔离。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理，但在当前命令路径中不可用，doctor 会报告只读警告且不会写入明文回退凭据。
- 如果在修复路径中渠道 SecretRef 检查失败，doctor 会继续运行并报告警告，而不是提前退出。
- 在状态目录迁移后，如果已启用的默认 Telegram 或 Discord 账户依赖环境变量回退，且 TelegramDiscord`TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN` 对 doctor 进程不可用，doctor 会发出警告。
- Telegram Telegram`allowFrom` 用户名自动解析 (`doctor --fix`Telegram) 需要在当前命令路径中有可解析的 Telegram token。如果 token 检查不可用，doctor 会报告警告并在该次通过中跳过自动解析。

## macOS：macOS`launchctl` 环境变量覆盖

如果您之前运行过 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (或 `...PASSWORD`)，该值将覆盖您的配置文件，并可能导致持续的“未授权”错误。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## 相关

- [CLI 参考](CLI/en/cli)
- [Gateway 诊断](<Gateway(网关)/en/gateway/doctor>)
