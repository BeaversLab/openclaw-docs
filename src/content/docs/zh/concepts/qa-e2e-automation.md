---
summary: "QA 栈概览：qa-lab、qa-渠道、基于仓库的场景、实时传输通道、传输适配器和报告。"
read_when:
  - Understanding how the QA stack fits together
  - Extending qa-lab, qa-channel, or a transport adapter
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "QA 概览"
---

私有 QA 栈旨在以比单一单元测试更现实、以渠道为形态的方式来演练 OpenClaw。

当前组件：

- `extensions/qa-channel`：合成消息渠道，包含私信、渠道、线程、反应、编辑和删除接口。
- `extensions/qa-lab`：调试器 UI 和 QA 总线，用于观察对话记录、注入入站消息以及导出 Markdown 报告。
- `extensions/qa-matrix`，未来的运行器插件：实时传输适配器，用于在子 QA 网关中驱动真实渠道。
- `qa/`：基于仓库的种子资产，用于启动任务和基准 QA 场景。
- [Mantis](/zh/concepts/mantis)：针对需要真实传输、浏览器截图、虚拟机状态和 PR 证据的错误进行前后实时验证。

## 命令界面

每个 QA 流都在 `pnpm openclaw qa <subcommand>` 下运行。许多都有 `pnpm qa:*` 脚本别名；支持这两种形式。

| 命令                                                | 用途                                                                                                                                                                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | 打包的 QA 自检；写入 Markdown 报告。                                                                                                                                                                                                        |
| `qa suite`                                          | 针对 QA 网关通道运行基于仓库的场景。别名：`pnpm openclaw qa suite --runner multipass` 用于一次性 Linux 虚拟机。                                                                                                                             |
| `qa coverage`                                       | 打印 Markdown 场景覆盖率清单（`--json` 用于机器输出）。                                                                                                                                                                                     |
| `qa parity-report`                                  | 比较两个 `qa-suite-summary.json` 文件并写入智能对等报告。                                                                                                                                                                                   |
| `qa character-eval`                                 | 跨多个实时模型运行角色 QA 场景并生成评判报告。请参阅 [报告](#reporting)。                                                                                                                                                                   |
| `qa manual`                                         | 针对所选提供商/模型通道运行一次性提示。                                                                                                                                                                                                     |
| `qa ui`                                             | 启动 QA 调试器 UI 和本地 QA 总线（别名：`pnpm qa:lab:ui`）。                                                                                                                                                                                |
| `qa docker-build-image`                             | 构建预制的 QA Docker 镜像。                                                                                                                                                                                                                 |
| `qa docker-scaffold`                                | 为 QA 仪表板 + 网关通道编写 docker-compose 脚手架。                                                                                                                                                                                         |
| `qa up`                                             | 构建 QA 站点，启动 Docker 支持的栈，打印 URL（别名：`pnpm qa:lab:up`；`:fast` 变体添加 `--use-prebuilt-image --bind-ui-dist --skip-ui-build`）。                                                                                            |
| `qa aimock`                                         | 仅启动 AIMock 提供商 服务器。                                                                                                                                                                                                               |
| `qa mock-openai`                                    | 仅启动支持场景的 `mock-openai` 提供商服务器。                                                                                                                                                                                               |
| `qa credentials doctor` / `add` / `list` / `remove` | 管理共享的 Convex 凭证池。                                                                                                                                                                                                                  |
| `qa matrix`                                         | 针对一次性 Tuwunel 主服务器 的实时传输通道。请参阅 [Matrix QA](/zh/concepts/qa-matrix)。                                                                                                                                                    |
| `qa telegram`                                       | 针对真实的私有 Telegram 群组的实时传输通道。                                                                                                                                                                                                |
| `qa discord`                                        | 针对真实的私有 Discord 频道的实时传输通道。                                                                                                                                                                                                 |
| `qa slack`                                          | 针对真实的私有 Slack 渠道的实时传输通道。                                                                                                                                                                                                   |
| `qa mantis`                                         | 用于实时传输错误的验证前后 运行程序，包含 Discord 状态反应证据、Crabbox 桌面/浏览器冒烟测试 以及 Slack-in-VNC 冒烟测试。请参阅 [Mantis](/zh/concepts/mantis) 和 [Mantis Slack Desktop Runbook](/zh/concepts/mantis-slack-desktop-runbook)。 |

## Operator flow

当前的 QA operator flow 是一个双面板的 QA 站点：

- 左侧：带有代理的 Gateway(网关) 仪表板（控制 UI）。
- 右侧：QA Lab，显示类似 Slack 的记录和场景计划。

运行方式如下：

```bash
pnpm qa:lab:up
```

这将构建 QA 站点，启动 Docker 支持的 Gateway 通道，并公开 QA Lab 页面，操作员或自动化循环可以在该页面为代理分配 QA 任务，观察真实的渠道行为，并记录哪些操作有效、失败或受阻。

为了更快地迭代 QA Lab UI 而无需每次都重新构建 Docker 镜像，请使用绑定挂载的 QA Lab 包启动堆栈：

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` 将 Docker 服务保留在预构建的镜像上，并将
`extensions/qa-lab/web/dist` 挂载到 `qa-lab` 容器中。`qa:lab:watch`
会在更改时重新构建该捆绑包，并且当 QA Lab
资源哈希更改时，浏览器会自动重新加载。

如需运行本地 OpenTelemetry 追踪冒烟测试，请执行：

```bash
pnpm qa:otel:smoke
```

该脚本启动一个本地 OTLP/HTTP 追踪接收器，运行启用了
`diagnostics-otel` 插件的 `otel-trace-smoke` QA 场景，然后
解码导出的 protobuf 跨度并断言关键发布形态：
`openclaw.run`、`openclaw.harness.run`、`openclaw.model.call`、
`openclaw.context.assembled` 和 `openclaw.message.delivery` 必须存在；
模型调用在成功的轮次中不得导出 `StreamAbandoned`；原始诊断 ID 和
`openclaw.content.*` 属性必须排除在追踪之外。它会将
`otel-smoke-summary.json` 写入 QA 套件工件旁边。

可观测性 QA 仅限源代码检出。npm 压缩包故意省略了
QA Lab，因此软件包 Docker 发布通道不运行 `qa` 命令。在更改诊断
检测时，请从已构建的源代码检出中使用
`pnpm qa:otel:smoke`。

如需运行传输真实的 Matrix 冒烟测试流水线，请执行：

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

此通道的完整 CLI 参考、配置文件/场景目录、环境变量以及产物布局位于 [Matrix QA](CLIMatrix/en/concepts/qa-matrixDockerMatrix)。概览：它会在 Docker 中配置一个一次性的 Tuwunel homeserver，注册临时的 driver/SUT/observer 用户，在该传输范围内的子 QA 网关中运行真实的 Matrix 插件（不包含 `qa-channel`），然后在 `.artifacts/qa-e2e/matrix-<timestamp>/` 下写入 Markdown 报告、JSON 摘要、observed-events 产物以及组合的输出日志。

这些场景涵盖了单元测试无法端到端证明的传输行为：提及门控、允许机器人策略、允许列表、顶级和线程回复、私信 路由、表情符号处理、入站编辑抑制、重启重放去重、homeserver 中断恢复、审批元数据传递、媒体处理以及 Matrix E2EE 启动/恢复/验证流程。E2EE CLI 配置文件还会在检查网关回复之前，通过同一个一次性 homeserver 驱动 MatrixCLI`openclaw matrix encryption setup` 和验证命令。

Discord 还具有 Mantis 专用的可选加入（opt-in）场景，用于错误复现。请使用 Discord`--scenario discord-status-reactions-tool-only` 获取显式状态反应时间轴，或使用 `--scenario discord-thread-reply-filepath-attachment`Discord 创建真实的 Discord 线程并验证 `message.thread-reply` 是否保留了 `filePath`DiscordDiscord 附件。这些场景不包含在默认的实时 Discord 通道中，因为它们是复现前后探测，而非广泛的冒烟测试覆盖。当 QA 环境中配置了 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` 或 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64`Discord 时，线程-附件 Mantis 工作流还可以添加已登录的 Discord Web 目击视频。该查看器配置文件仅用于视觉捕获；通过/失败决策仍来自 Discord REST 预言机。

CI 在 `.github/workflows/qa-live-transports-convex.yml` 中使用相同的命令界面。预定和默认的手动运行会使用实时前沿凭证、`--fast` 和 `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS=3000` 执行快速 Matrix 配置文件。手动 `matrix_profile=all` 会扩散到五个配置文件分片，以便详尽的目录可以并行运行，同时为每个分片保留一个构件目录。

对于传输真实的 Telegram、Discord 和 Slack 冒烟通道：

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
pnpm openclaw qa slack
```

它们针对一个预先存在的真实渠道，其中包含两个机器人（driver + SUT）。所需的环境变量、场景列表、输出构件和 Convex 凭证池记录在下方的 [Telegram、Discord 和 Slack QA 参考](#telegram-discord-and-slack-qa-reference) 中。

若要使用 VNC 救援功能进行完整的 Slack 桌面虚拟机运行，请运行：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

该命令租用一台 Crabbox 桌面/浏览器机器，在虚拟机内运行 Slack 实时通道，
在 VNC 浏览器中打开 Slack Web，捕获桌面，并在有视频捕获时将
SlackSlack`slack-qa/`、`slack-desktop-smoke.png` 和 `slack-desktop-smoke.mp4`
复制回 Mantis 工件目录。Crabbox 桌面/浏览器租约预先提供了捕获工具和
浏览器/原生构建辅助包，因此场景应仅在较旧的租约上安装备用项。
Mantis 在 `mantis-slack-desktop-smoke-report.md` 中报告总体和各阶段的计时，因此运行缓慢时
可以显示时间是用于租约预热、凭据获取、远程设置还是工件复制。
在通过 VNC 手动登录 Slack Web 后重用 `--lease-id <cbx_...>`Slack；重用的租约
还可以保持 Crabbox 的 pnpm 存储缓存处于热状态。默认的
`--hydrate-mode source` 从源代码检出进行验证并在虚拟机内运行安装/构建。
仅当重用的远程工作空间已具有 `node_modules` 和已构建的
`dist/` 时，才使用 `--hydrate-mode prehydrated`；该模式
跳过昂贵的安装/构建步骤，并在工作空间未就绪时关闭失败。
使用 `--gateway-setup`OpenClawSlack 时，Mantis 会在虚拟机内保留一个在端口
`38973`Slack 上运行的持久 OpenClaw Slack 网关；
如果不使用它，该命令将运行正常的机器人到机器人 Slack QA 通道，并在捕获
工件后退出。

操作员检查清单、GitHub 工作流调度命令、证据注释约定、
水合模式决策表、计时解释和故障处理步骤位于
[Mantis Slack Desktop Runbook](GitHubSlack/en/concepts/mantis-slack-desktop-runbook) 中。

对于代理/CV 风格的桌面任务，请运行：

```bash
pnpm openclaw qa mantis visual-task \
  --browser-url https://example.net \
  --expect-text "Example Domain" \
  --vision-model openai/gpt-5.4
```

`visual-task` 租赁或复用一台 Crabbox 桌面/浏览器机器，启动
`crabbox record --while`，通过嵌套的 `visual-driver` 驱动可见浏览器，捕获
`visual-task.png`，并在选择 `--vision-mode image-describe` 时针对截图运行
`openclaw infer image describe`，并写入 `visual-task.mp4`、
`mantis-visual-task-summary.json`、`mantis-visual-task-driver-result.json` 和
`mantis-visual-task-report.md`。
当设置 `--expect-text` 时，视觉提示会要求结构化的 JSON
判定，并且只有在模型报告肯定的可见证据时才通过；仅引用目标文本的否定响应会使断言失败。
使用 `--vision-mode metadata` 进行无模型冒烟测试，在不调用图像理解
提供商的情况下证明桌面、浏览器、截图和视频管道。录像是 `visual-task` 的必需产物；如果 Crabbox 没有录制
任何非空的 `visual-task.mp4`，即使视觉驱动程序通过，任务也会失败。失败时，除非任务已经通过
且未设置 `--keep-lease`，否则 Mantis 会保留 VNC 的租约。

在使用池化的实时凭据之前，请运行：

```bash
pnpm openclaw qa credentials doctor
```

该诊断程序会检查 Convex broker 环境，验证端点设置，并在存在维护者密钥时验证 admin/list 的可达性。它仅报告密钥的已设置/缺失状态。

## 实时传输覆盖范围

实时传输通道共享一个合约，而不是各自发明自己的场景列表形状。`qa-channel` 是广泛的综合产品行为套件，不属于实时传输覆盖范围矩阵的一部分。

| 通道     | 金丝雀 | 提及门控 | Bot 对 Bot | 允许列表阻止 | 顶级回复 | 重启恢复 | 线程跟进 | 线程隔离 | 反应观察 | Help 命令 | 原生命令注册 |
| -------- | ------ | -------- | ---------- | ------------ | -------- | -------- | -------- | -------- | -------- | --------- | ------------ |
| Matrix   | x      | x        | x          | x            | x        | x        | x        | x        | x        |           |              |
| Telegram | x      | x        | x          |              |          |          |          |          |          | x         |              |
| Discord  | x      | x        | x          |              |          |          |          |          |          |           | x            |
| Slack    | x      | x        | x          | x            | x        | x        | x        | x        |          |           |              |

这使得 `qa-channel` 仍作为广泛的产品行为套件，而 Matrix、
Telegram 和未来的实时传输共享一个明确的传输合约
检查清单。

对于不将 Linux 引入 QA 路径的一次性 Docker VM 通道，请运行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

这将启动一个新的 Multipass 虚拟机，安装依赖项，在虚拟机内部构建 OpenClaw，运行 `qa suite`，然后将常规 QA 报告和摘要复制回主机上的 `.artifacts/qa-e2e/...` 中。
它复用主机上 `qa suite` 的相同场景选择行为。
默认情况下，主机和 Multipass 套件运行使用隔离的 gateway 工作进程并行执行多个选定的场景。`qa-channel` 默认并发数为 4，上限为选定场景的数量。使用 `--concurrency <count>` 来调整工作进程数量，或使用 `--concurrency 1` 进行串行执行。
使用 `--pack personal-agent` 运行个人助理基准测试包。包选择器通过重复的 `--scenario` 标志进行累加：显式场景首先运行，然后按包顺序运行包场景，并移除重复项。
当任何场景失败时，该命令以非零状态退出。如果您希望在获取产物时没有失败的退出代码，请使用 `--allow-failures`。
实时运行会转发对虚拟机切实可行的受支持的 QA 认证输入：基于环境的提供商 密钥、QA 实时提供商配置路径，以及（如果存在）`CODEX_HOME`。请将 `--output-dir` 保持在代码库根目录下，以便虚拟机可以通过挂载的工作区写回数据。

## Telegram、Discord 和 Slack QA 参考

由于场景数量和 Matrix 支持的主机置备，Docker 拥有一个[专用页面](/zh/concepts/qa-matrix)。Telegram、Discord 和 Slack 规模较小——每个只有少数几个场景，没有配置文件系统，针对预先存在的真实频道——因此它们的参考文档位于此处。

### 共享 CLI 标志

这些通道通过 `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` 注册并接受相同的标志：

| 标志                                  | 默认值                                                          | 描述                                                                          |
| ------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `--scenario <id>`                     | -                                                               | 仅运行此场景。可重复。                                                        |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord,slack}-<timestamp>` | 写入报告/摘要/观察到的消息和输出日志的位置。相对路径根据 `--repo-root` 解析。 |
| `--repo-root <path>`                  | `process.cwd()`                                                 | 从中立的当前工作目录调用时的存储库根目录。                                    |
| `--sut-account <id>`                  | `sut`                                                           | QA 网关配置内的临时帐户 ID。                                                  |
| `--provider-mode <mode>`              | `live-frontier`                                                 | `mock-openai` 或 `live-frontier`（旧版 `live-openai` 仍然有效）。             |
| `--model <ref>` / `--alt-model <ref>` | 提供商默认值                                                    | 主要/备用模型引用。                                                           |
| `--fast`                              | 关                                                              | 支持时使用提供商快速模式。                                                    |
| `--credential-source <env\|convex>`   | `env`                                                           | 参见 [Convex 凭证池](#convex-credential-pool)。                               |
| `--credential-role <maintainer\|ci>`  | 在 CI 中使用 `ci`，否则使用 `maintainer`                        | 运行 `--credential-source convex` 时使用的角色。                              |

任何场景失败时，每个车道均以非零状态退出。`--allow-failures` 会写入产物而不设置失败的退出代码。

### Telegram QA

```bash
pnpm openclaw qa telegram
```

针对一个真实的私有 Telegram 群组，使用两个不同的机器人（驱动程序 + SUT）。SUT 机器人必须拥有 Telegram 用户名；当两个机器人在 `@BotFather` 中都启用了**机器人到机器人通信模式**时，机器人对机器人的观察效果最佳。

运行 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` - 数字聊天 ID（字符串）。
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

可选：

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` 会在观察消息的产物中保留消息正文（默认为编辑）。

场景（`extensions/qa-lab/src/live-transports/telegram/telegram-live.runtime.ts`）：

- `telegram-canary`
- `telegram-mention-gating`
- `telegram-mentioned-message-reply`
- `telegram-help-command`
- `telegram-commands-command`
- `telegram-tools-compact-command`
- `telegram-whoami-command`
- `telegram-status-command`
- `telegram-repeated-command-authorization`
- `telegram-other-bot-command-gating`
- `telegram-context-command`
- `telegram-current-session-status-tool`
- `telegram-reply-chain-exact-marker`
- `telegram-stream-final-single-message`
- `telegram-long-final-reuses-preview`
- `telegram-long-final-three-chunks`

隐式默认集始终覆盖 canary、提及门控、原生命令回复、命令寻址以及机器人到机器人的群组回复。`mock-openai` 默认值还包括确定性回复链和最终消息流检查。`telegram-current-session-status-tool` 仍为可选项，因为它仅在紧跟 canary 之后时才稳定，而在任意原生命令回复之后则不然。使用 `pnpm openclaw qa telegram --list-scenarios --provider-mode mock-openai` 打印当前默认/可选拆分及回归参考。

输出产物：

- `telegram-qa-report.md`
- `telegram-qa-summary.json` - 包括从 canary 开始的每次往返时间（RTT）（驱动程序发送 → 观察到的 SUT 回复）。
- `telegram-qa-observed-messages.json` - 除非 `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`，否则内容会被编辑。

包 RTT 比较使用相同的 Telegram 凭证合约，同时将其 RTT 样本控制保留在 RTT 工具路径上：

```bash
pnpm rtt openclaw@beta \
  --credential-source convex \
  --credential-role maintainer \
  --samples 20 \
  --sample-timeout-ms 30000
```

当设置了 `--credential-source convex` 时，RTT Docker 包装器会租用 `kind: "telegram"` 凭证，将租用的群组/驱动程序/SUT 机器人环境导出到已安装包运行中，保持租用心跳，并在关闭时释放它。`--samples` 和 `--sample-timeout-ms` 仍然馈送 `OPENCLAW_NPM_TELEGRAM_WARM_SAMPLES` 和 `OPENCLAW_NPM_TELEGRAM_SAMPLE_TIMEOUT_MS`，因此 `result.json` 在环境支持和 Convex 支持的 RTT 运行之间仍然具有可比性。

### Discord QA

```bash
pnpm openclaw qa discord
```

针对一个真实的私有 Discord 公会频道，该频道有两个机器人：一个由工具控制的驱动程序机器人，和一个通过捆绑的 OpenClaw 插件由子 Discord 网关启动的 SUT 机器人。验证频道提及处理，验证 SUT 机器人已向 Discord 注册了原生 `/help` 命令，以及可选的 Mantis 证据场景。

当 `--credential-source env` 时所需的环境：

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` - 必须与 Discord 返回的 SUT 机器人用户 ID 匹配（否则通道会快速失败）。

可选：

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` 将消息正文保留在 observed-message 工件中。
- `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID` 选择 `discord-voice-autojoin` 的语音/频道渠道；如果没有它，场景将选择 SUT 机器人的第一个可见语音/频道渠道。

场景 (`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`)：

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-voice-autojoin` - 可选加入的语音场景。独立运行，启用 `channels.discord.voice.autoJoin`，并验证 SUT 机器人当前的 Discord 语音状态是否为目标语音/频道渠道。Convex Discord 凭证可能包含可选的 `voiceChannelId`；否则运行程序将在公会中发现第一个可见的语音/频道渠道。
- `discord-status-reactions-tool-only` - 可选加入的 Mantis 场景。独立运行，因为它使用 `messages.statusReactions.enabled=true` 将 SUT 切换到仅限工具的常驻公会回复模式，然后捕获 REST 反应时间轴以及 HTML/PNG 视觉工件。Mantis 前后报告还将场景提供的 MP4 工件保留为 `baseline.mp4` 和 `candidate.mp4`。

显式运行 Discord 语音自动加入场景：

```bash
pnpm openclaw qa discord \
  --scenario discord-voice-autojoin \
  --provider-mode mock-openai
```

显式运行 Mantis 状态反应场景：

```bash
pnpm openclaw qa discord \
  --scenario discord-status-reactions-tool-only \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --fast
```

输出工件：

- `discord-qa-report.md`
- `discord-qa-summary.json`
- `discord-qa-observed-messages.json` - 除非设置了 `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`，否则正文将被编辑。
- 当状态反应场景运行时，会出现 `discord-qa-reaction-timelines.json` 和 `discord-status-reactions-tool-only-timeline.png`。

### Slack QA

```bash
pnpm openclaw qa slack
```

以一个真实的私有 Slack 渠道为目标，该渠道有两个不同的机器人：一个由测试框架控制的驱动程序机器人，和一个由子 OpenClaw 网关通过捆绑的 Slack 插件启动的 SUT 机器人。

当 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`

可选：

- `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1` 将消息正文保留在 observed-message 构件中。

场景 (`extensions/qa-lab/src/live-transports/slack/slack-live.runtime.ts:39`)：

- `slack-canary`
- `slack-mention-gating`
- `slack-allowlist-block`
- `slack-top-level-reply-shape`
- `slack-restart-resume`
- `slack-thread-follow-up`
- `slack-thread-isolation`

输出构件：

- `slack-qa-report.md`
- `slack-qa-summary.json`
- `slack-qa-observed-messages.json` - 正文已编辑，除非使用 `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1`。

#### 设置 Slack 工作区

该通道需要一个工作区中的两个不同的 Slack 应用，加上两个机器人都是其成员的渠道：

- `channelId` - 两个机器人都已被邀请加入的渠道的 `Cxxxxxxxxxx` id。请使用专用渠道；该通道会在每次运行时发布消息。
- `driverBotToken` - **Driver** 应用的机器人令牌 (`xoxb-...`)。
- `sutBotToken` - **SUT** 应用的机器人令牌 (`xoxb-...`)，它必须是与驱动程序不同的 Slack 应用，以便其机器人用户 id 不同。
- `sutAppToken` - 具有 `connections:write` 的 SUT 应用的应用级令牌 (`xapp-...`)，由 Socket Mode 使用，以便 SUT 应用可以接收事件。

与重用生产工作区相比，最好使用专用于 QA 的 Slack 工作区。

下面的 SUT 清单有意将捆绑的 Slack 插件的生产安装 (`extensions/slack/src/setup-shared.ts:10`) 缩小到实时 Slack QA 套件所涵盖的权限和事件。有关用户看到的生产渠道设置，请参阅 [Slack 渠道快速设置](/zh/channels/slack#quick-setup)；QA Driver/SUT 对是有意分开的，因为该通道需要一个工作区中的两个不同的机器人用户 id。

**1. 创建 Driver 应用**

前往 [api.slack.com/apps](https://api.slack.com/apps) → _Create New App_ → _From a manifest_ → 选择 QA 工作区，粘贴以下清单，然后 _Install to Workspace_：

```json
{
  "display_information": {
    "name": "OpenClaw QA Driver",
    "description": "Test driver bot for OpenClaw QA Slack live lane"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw QA Driver",
      "always_online": true
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": ["chat:write", "channels:history", "groups:history", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": false
  }
}
```

复制 _Bot User OAuth Token_ (OAuth`xoxb-...`) - 它将成为 `driverBotToken`。驱动程序只需要发布消息并表明身份；不需要事件，也不需要 Socket 模式。

**2. 创建 SUT 应用**

在同一工作区中重复 _Create New App → From a manifest_。此 QA 应用有意使用捆绑 Slack 插件的生产清单的 narrower 版本 (Slack`extensions/slack/src/setup-shared.ts:10`Slack)：省略了反应范围和事件，因为实时 Slack QA 套件尚未涵盖反应处理。

```json
{
  "display_information": {
    "name": "OpenClaw QA SUT",
    "description": "OpenClaw QA SUT connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw QA SUT",
      "always_online": true
    },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "usergroups:read", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_home_opened", "app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed"]
    }
  }
}
```

Slack 创建应用后，在其设置页面上做两件事：

- _Install to Workspace_ → 复制 _Bot User OAuth Token_ → 它将成为 OAuth`sutBotToken`。
- _Basic Information → App-Level Tokens → Generate Token and Scopes_ → 添加 scope `connections:write` → 保存 → 复制 `xapp-...` 值 → 它将成为 `sutAppToken`。

通过在每个令牌上调用 `auth.test` 来验证这两个机器人具有不同的用户 ID。运行时通过用户 ID 区分驱动程序和 SUT；对两者重复使用同一个应用将立即导致提及门控失败。

**3. 创建渠道**

在 QA 工作区中，创建一个渠道（例如 `#openclaw-qa`）并从渠道内部邀请这两个机器人：

```
/invite @OpenClaw QA Driver
/invite @OpenClaw QA SUT
```

从 _channel info → About → Channel ID_ 复制 `Cxxxxxxxxxx` id - 它将成为 `channelId`。公共渠道可以工作；如果您使用私有渠道，两个应用程序都已经具有 `groups:history`，因此线束的历史读取仍然会成功。

**4. 注册凭据**

两个选项。使用 环境变量 进行单机调试（设置四个 `OPENCLAW_QA_SLACK_*` 变量并传递 `--credential-source env`），或者为共享的 Convex 池播种，以便 CI 和其他维护者可以租用它们。

对于 Convex 池，将这四个字段写入 JSON 文件：

```json
{
  "channelId": "Cxxxxxxxxxx",
  "driverBotToken": "xoxb-...",
  "sutBotToken": "xoxb-...",
  "sutAppToken": "xapp-..."
}
```

在您的 shell 中导出了 `OPENCLAW_QA_CONVEX_SITE_URL` 和 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 后，注册并验证：

```bash
pnpm openclaw qa credentials add \
  --kind slack \
  --payload-file slack-creds.json \
  --note "QA Slack pool seed"

pnpm openclaw qa credentials list --kind slack --status all --json
```

期望 `count: 1`，`status: "active"`，没有 `lease` 字段。

**5. 验证端到端**

在本地运行该 lane 以确认两个机器人都可以通过代理相互通信：

```bash
pnpm openclaw qa slack \
  --credential-source convex \
  --credential-role maintainer \
  --output-dir .artifacts/qa-e2e/slack-local
```

一次成功的运行会在 30 秒内完成，并且 `slack-qa-report.md` 显示 `slack-canary` 和 `slack-mention-gating` 的状态均为 `pass`。如果该 lane 挂起约 90 秒并以 `Convex credential pool exhausted for kind "slack"` 退出，则说明池为空或每一行都已被租用 - `qa credentials list --kind slack --status all --json` 会告诉你具体是哪种情况。

### Convex 凭证池

Telegram、Discord、Slack 和 WhatsApp lane 可以从共享的 Convex 池租用凭证，而不是读取上述环境变量。传递 `--credential-source convex`（或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）；QA Lab 会获取一个独占租约，在运行期间保持心跳，并在关闭时释放它。池的种类包括 `"telegram"`、`"discord"`、`"slack"` 和 `"whatsapp"`。

代理在 `admin/add` 上验证的负载结构：

- Telegram (`kind: "telegram"`): `{ groupId: string, driverToken: string, sutToken: string }` - `groupId` 必须是数字聊天 ID 字符串。
- Telegram 真实用户 (`kind: "telegram-user"`): `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }` - 一个由 TDLib CLI 驱动程序和 Telegram 桌面版视觉见证共同使用的独占一次性账户租约。
- Discord (`kind: "discord"`): `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`。
- WhatsApp (`kind: "whatsapp"`): `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }` - 电话号码必须是不同的 E.164 字符串。

对于视觉化的 Telegram 真实用户证明，首选持有的 Crabbox 会话：

```bash
pnpm qa:telegram-user:crabbox -- start --tdlib-url http://artifacts.openclaw.ai/tdlib-v1.8.0-linux-x64.tgz --output-dir .artifacts/qa-e2e/telegram-user-crabbox/pr-review
pnpm qa:telegram-user:crabbox -- send --session .artifacts/qa-e2e/telegram-user-crabbox/pr-review/session.json --text /status
pnpm qa:telegram-user:crabbox -- finish --session .artifacts/qa-e2e/telegram-user-crabbox/pr-review/session.json
```

`start` 持有一个独占的 Convex `telegram-user`CLITelegram 租约，用于 TDLib CLI 驱动程序和 Telegram Desktop 见证进程，启动桌面录制，并保持 Crabbox 处于活动状态以执行任意的代理驱动的复现步骤。代理可以使用 `send`、`run`、`screenshot` 和 `status`，直到它们满意为止，然后 `finish` 在释放凭据之前收集截图、视频、运动修剪过的视频/GIF、TDLib 探测输出和日志。`publish --会话 <file> --pr

<number>` comments only the motion GIF by default; `--full-artifacts` 是日志和 JSON 输出的显式选择加入选项。默认的 `probe` 命令仍然是用于快速 `/status` 冒烟测试的单命令简写形式。

当 PR 需要确定性的视觉差异时，请使用 `--mock-response-file <path>`：可以在 `main`Telegram 和 PR 头部运行相同的模拟模型回复，同时 Telegram 格式化程序或交付层发生变化。捕获默认值针对 PR 评论进行了调整：标准 Crabbox 类、24fps 桌面录制、24fps 动态 GIF 和 1920px 预览宽度。修改前/修改后的评论应发布一个仅包含预期 GIF 的干净包。

Slack 车道也可以使用该池。Slack 负载形状检查目前位于 Slack QA 运行器而不是代理中；使用 SlackSlackSlack`{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`Slack，并使用像 `Cxxxxxxxxxx`Slack 这样的 Slack 渠道 id。有关应用程序和范围设置，请参阅 [设置 Slack 工作区](#setting-up-the-slack-workspace)。

操作环境变量和 Convex 代理端点契约位于 [Testing → Shared Telegram credentials via Convex](Telegram/en/help/testing#shared-telegram-credentials-via-convex-v1)（该部分名称早于多渠道池；租约语义在各种类型之间共享）。

## 基于仓库的种子

种子资产位于 `qa/`：

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

这些有意放在 git 中，以便 QA 计划对人类和代理都可见。

`qa-lab` 应保持为通用的 markdown 运行器。每个场景 markdown 文件是一次测试运行的单一事实来源，并应定义：

- 场景元数据
- 可选的 category、capability、lane 和 risk 元数据
- 文档和代码引用
- 可选的插件要求
- 可选的 gateway 配置补丁
- 可执行的 `qa-flow`

支持 `qa-flow`Gateway(网关) 的可重用运行时表面允许保持通用和跨领域。例如，markdown 场景可以将传输端的辅助程序与浏览器端的辅助程序结合起来，通过 Gateway(网关) `browser.request` 接缝驱动嵌入式 Control UI，而无需添加特殊的运行器。

场景文件应按产品功能而非源树文件夹分组。当文件移动时，保持场景 ID 稳定；使用 `docsRefs` 和 `codeRefs` 进行实现可追溯性。

基准列表应保持足够广泛以涵盖：

- 私信和渠道聊天
- 主题行为
- 消息操作生命周期
- cron 回调
- 记忆召回
- 模型切换
- 子代理交接
- 仓库读取和文档读取
- 一个小型构建任务，例如 Lobster Invaders

## 提供商模拟车道

`qa suite` 有两个本地提供商模拟车道：

- `mock-openai`OpenClaw 是感知场景的 OpenClaw 模拟。它仍然是基于仓库的 QA 和一致性门的默认确定性模拟车道。
- `aimock` 启动一个由 AIMock 支持的提供商服务器，用于实验性协议、fixture、录制/重放和混沌覆盖。它是增量的，不会替换 `mock-openai` 场景调度程序。

提供商车道实现位于 `extensions/qa-lab/src/providers/` 下。每个提供商拥有其默认值、本地服务器启动、gateway 模型配置、auth-profile 暂存需求以及实时/模拟功能标志。共享套件和 gateway 代码应通过提供商注册中心进行路由，而不是根据提供商名称进行分支。

## 传输适配器

`qa-lab` 拥有一个用于 Markdown QA 场景的通用传输接口。 `qa-channel` 是该接口上的第一个适配器，但设计目标更为广泛：未来的真实或合成渠道应接入同一套套件运行器，而不是添加特定于传输的 QA 运行器。

在架构层面，划分如下：

- `qa-lab` 负责通用场景执行、工作线程并发、产物写入和报告。
- 传输适配器负责网关配置、就绪状态、入站和出站观察、传输操作以及规范化传输状态。
- `qa/scenarios/` 下的 Markdown 场景文件定义了测试运行； `qa-lab` 提供了执行它们的可重用运行时界面。

### 添加渠道

向 Markdown QA 系统添加渠道恰好需要两样东西：

1. 该渠道的传输适配器。
2. 用于演练渠道契约的场景包。

当共享的 `qa-lab` 宿主可以拥有该流程时，请不要添加新的顶级 QA 命令根目录。

`qa-lab` 拥有共享宿主机制：

- `openclaw qa` 命令根目录
- 套件启动和拆除
- 工作线程并发
- 产物写入
- 报告生成
- 场景执行
- 针对旧版 `qa-channel` 场景的兼容性别名

运行器插件拥有传输契约：

- `openclaw qa <runner>` 如何挂载在共享的 `qa` 根目录之下
- 如何为该传输配置网关
- 如何检查就绪状态
- 如何注入入站事件
- 如何观察出站消息
- 如何公开脚本记录和规范化的传输状态
- 如何执行基于传输的操作
- 如何处理特定于传输的重置或清理

新渠道的最低采用门槛：

1. 保持 `qa-lab` 作为共享 `qa` 根目录的所有者。
2. 在共享的 `qa-lab` 宿主接口上实现传输运行器。
3. 将特定于传输的机制保留在运行器插件或渠道套件中。
4. 将运行器挂载为 `openclaw qa <runner>`，而不是注册一个冲突的根命令。运行器插件应在 `openclaw.plugin.json` 中声明 `qaRunners`，并从 `runtime-api.ts` 导出匹配的 `qaRunnerCliRegistrations` 数组。保持 `runtime-api.ts` 轻量；惰性 CLI 和运行器执行应位于独立的入口点之后。
5. 在主题化的 `qa/scenarios/` 目录下编写或改编 Markdown 场景。
6. 为新场景使用通用场景辅助函数。
7. 除非仓库正在进行有意的迁移，否则请保持现有的兼容性别名正常工作。

决策规则很严格：

- 如果行为可以在 `qa-lab` 中表达一次，请将其放在 `qa-lab` 中。
- 如果行为依赖于某一渠道传输，请将其保留在该运行器插件或插件线束中。
- 如果场景需要多个渠道都能使用的新功能，请添加通用辅助函数，而不是在 `suite.ts` 中添加特定于渠道的分支。
- 如果行为仅对一种传输有意义，请保持场景特定于该传输，并在场景契约中明确说明。

### 场景辅助函数名称

新场景的首选通用辅助函数：

- `waitForTransportReady`
- `waitForChannelReady`
- `injectInboundMessage`
- `injectOutboundMessage`
- `waitForTransportOutboundMessage`
- `waitForChannelOutboundMessage`
- `waitForNoTransportOutbound`
- `getTransportSnapshot`
- `readTransportMessage`
- `readTransportTranscript`
- `formatTransportTranscript`
- `resetTransport`

兼容性别名仍可用于现有场景——`waitForQaChannelReady`、`waitForOutboundMessage`、`waitForNoOutbound`、`formatConversationTranscript`、`resetBus`——但新场景的编写应使用通用名称。这些别名存在是为了避免一次性迁移，而非作为未来的模型。

## 报告

`qa-lab` 从观察到的总线时间线导出 Markdown 协议报告。
该报告应回答：

- 哪些部分有效
- 失败内容
- 保持阻塞的内容
- 值得添加的后续场景

要获取可用场景清单——这在评估后续工作规模或接入新传输时很有用——请运行 `pnpm openclaw qa coverage`（添加 `--json` 以获取机器可读的输出）。

针对角色和风格检查，请在多个实时模型引用上运行同一场景，并编写一份评估后的 Markdown 报告：

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.5,thinking=medium,fast \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-6,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.5,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-6,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

该命令运行本地 QA 网关子进程，而不是 Docker。角色评估场景应通过 `SOUL.md` 设置角色，然后运行普通用户轮次，例如聊天、工作区帮助和小型文件任务。不应告知候选模型它正在接受评估。该命令会保留每个完整的转录记录，记录基本的运行统计数据，然后要求裁判模型在支持的条件下以带有 `xhigh` 推理的快速模式，根据自然度、氛围和幽默感对运行进行排名。在比较提供商时使用 `--blind-judge-models`：裁判提示词仍会获取每个转录记录和运行状态，但候选引用会被中性标签（如 `candidate-01`）替换；解析后的报告会将排名映射回真实的引用。候选运行默认为 `high` 思考模式，其中 GPT-5.5 使用 `medium`，支持它的旧版 OpenAI 评估引用使用 `xhigh`。使用 `--model provider/model,thinking=<level>` 内联覆盖特定候选。`--thinking <level>` 仍然设置全局回退，并保留较旧的 `--model-thinking <provider/model=level>` 形式以保持兼容性。OpenAI 候选引用默认为快速模式，因此在提供商支持的情况下使用优先处理。当单个候选或裁判需要覆盖时，请内联添加 `,fast`、`,no-fast` 或 `,fast=false`。仅当您希望强制所有候选模型开启快速模式时才传递 `--fast`。候选和裁判的持续时间会记录在报告中以进行基准分析，但裁判提示词明确表示不要按速度排名。候选和裁判模型运行默认并发度均为 16。当提供商限制或本地网关压力导致运行过于嘈杂时，降低 `--concurrency` 或 `--judge-concurrency`。当未传递候选 `--model` 时，角色评估默认为 `openai/gpt-5.5`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-6`、`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、`moonshot/kimi-k2.5` 和 `google/gemini-3.1-pro-preview`（当未传递 `--model` 时）。当未传递 `--judge-model` 时，裁判默认为 `openai/gpt-5.5,thinking=xhigh,fast` 和 `anthropic/claude-opus-4-6,thinking=high`。

## 相关文档

- [Matrix QA](Matrix/en/concepts/qa-matrix)
- [个人代理基准包](/zh/concepts/personal-agent-benchmark-pack)
- [QA Channel](/zh/channels/qa-channel)
- [测试](/zh/help/testing)
- [仪表板](/zh/web/dashboard)
