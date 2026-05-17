---
summary: "QA 栈概述：qa-lab、qa-渠道、仓库支持的场景、实时传输通道、传输适配器以及报告。"
read_when:
  - Understanding how the QA stack fits together
  - Extending qa-lab, qa-channel, or a transport adapter
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "QA 概述"
---

私有 QA 栈旨在以比单一单元测试更现实、以渠道为形态的方式来演练 OpenClaw。

当前组件：

- `extensions/qa-channel`：具有私信、渠道、线程、
  反应、编辑和删除界面的合成消息渠道。
- `extensions/qa-lab`：调试器 UI 和 QA 总线，用于观察记录、
  注入入站消息并导出 Markdown 报告。
- `extensions/qa-matrix`，未来的运行器插件：实时传输适配器，
  用于在子 QA 网关中驱动真实的渠道。
- `qa/`：用于启动任务和基线 QA
  场景的仓库支持种子资产。
- [Mantis](/zh/concepts/mantis)：针对需要真实传输、浏览器截图、虚拟机状态和 PR 证据的错误进行实时验证之前和之后的验证。

## 命令界面

每个 QA 流程都在 `pnpm openclaw qa <subcommand>` 下运行。许多都有 `pnpm qa:*` 脚本别名；支持这两种形式。

| 命令                                                | 用途                                                                                                                                                                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `qa run`                                            | 打包的 QA 自检；写入 Markdown 报告。                                                                                                                                                                                                                   |
| `qa suite`                                          | 针对 QA 网关通道运行基于仓库的情景。别名：`pnpm openclaw qa suite --runner multipass` 用于一次性 Linux 虚拟机。                                                                                                                                        |
| `qa coverage`                                       | 打印 markdown 情景覆盖清单（`--json` 用于机器输出）。                                                                                                                                                                                                  |
| `qa parity-report`                                  | 比较两个 `qa-suite-summary.json` 文件并编写代理对等报告。                                                                                                                                                                                              |
| `qa character-eval`                                 | 在多个实时模型上运行角色 QA 场景并生成评估报告。请参阅 [Reporting](#reporting)。                                                                                                                                                                       |
| `qa manual`                                         | 针对所选提供商/模型通道运行一次性提示。                                                                                                                                                                                                                |
| `qa ui`                                             | 启动 QA 调试器 UI 和本地 QA 总线（别名：`pnpm qa:lab:ui`）。                                                                                                                                                                                           |
| `qa docker-build-image`                             | 构建预制的 QA Docker 镜像。                                                                                                                                                                                                                            |
| `qa docker-scaffold`                                | 为 QA 仪表板 + 网关通道编写 docker-compose 脚手架。                                                                                                                                                                                                    |
| `qa up`                                             | 构建 QA 站点，启动 Docker 支持的堆栈，打印 URL（别名：`pnpm qa:lab:up`；`:fast` 变体添加 `--use-prebuilt-image --bind-ui-dist --skip-ui-build`）。                                                                                                     |
| `qa aimock`                                         | 仅启动 AIMock 提供商 服务器。                                                                                                                                                                                                                          |
| `qa mock-openai`                                    | 仅启动感知场景的 `mock-openai` 提供商服务器。                                                                                                                                                                                                          |
| `qa credentials doctor` / `add` / `list` / `remove` | 管理共享的 Convex 凭证池。                                                                                                                                                                                                                             |
| `qa matrix`                                         | 针对一次性 Tuwunel 主服务器的实时传输通道。请参阅 [Matrix QA](Matrix/en/concepts/qa-matrix)。                                                                                                                                                          |
| `qa telegram`                                       | 针对真实的私有 Telegram 群组的实时传输通道。                                                                                                                                                                                                           |
| `qa discord`                                        | 针对真实的私有 Discord 频道的实时传输通道。                                                                                                                                                                                                            |
| `qa slack`                                          | 针对真实的私有 Slack 渠道的实时传输通道。                                                                                                                                                                                                              |
| `qa mantis`                                         | 针对实时传输错误的验证前后运行器，包含 Discord 状态反应证据、Crabbox 桌面/浏览器冒烟测试和 Slack-in-VNC 冒烟测试。请参阅 [Mantis](DiscordSlack/en/concepts/mantisSlack) 和 [Mantis Slack Desktop Runbook](/zh/concepts/mantis-slack-desktop-runbook)。 |

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

`qa:lab:up:fast`Docker 将 Docker 服务保留在预构建的镜像上，并将 `extensions/qa-lab/web/dist` 挂载到 `qa-lab` 容器中。`qa:lab:watch` 会在更改时重新构建该 bundle，当 QA Lab 资产哈希值更改时，浏览器会自动重新加载。

如需运行本地 OpenTelemetry 追踪冒烟测试，请执行：

```bash
pnpm qa:otel:smoke
```

该脚本启动一个本地 OTLP/HTTP 追踪接收器，运行启用了 `diagnostics-otel` 插件的 `otel-trace-smoke` QA 场景，然后解码导出的 protobuf 跨度并断言关键发布形态：`openclaw.run`、`openclaw.harness.run`、`openclaw.model.call`、`openclaw.context.assembled` 和 `openclaw.message.delivery` 必须存在；模型调用在成功的轮次中不得导出 `StreamAbandoned`；原始诊断 ID 和 `openclaw.content.*` 属性必须不出现在追踪中。它会在 QA 套件工件旁边写入 `otel-smoke-summary.json`。

Observability QA 保持仅限源代码检出。npm tarball 故意省略了 QA Lab，因此打包 Docker 发布流水线不运行 `qa` 命令。更改诊断插桩时，请使用已构建的源代码检出中的 `pnpm qa:otel:smoke`。

如需运行传输真实的 Matrix 冒烟测试流水线，请执行：

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

此通道的完整 CLI 参考、配置文件/场景目录、环境变量和产物布局位于 [Matrix QA](/zh/concepts/qa-matrix) 中。概而言之：它在 Docker 中配置一个一次性的 Tuwunel 家庭服务器，注册临时的驱动/SUT/观察者用户，在限定于该传输的子 QA 网关中运行真实的 Matrix 插件（无 `qa-channel`），然后在 `.artifacts/qa-e2e/matrix-<timestamp>/` 下写入 Markdown 报告、JSON 摘要、observed-events 产物和组合输出日志。

这些场景涵盖了单元测试无法端到端验证的传输行为：提及拦截、允许机器人策略、允许列表、顶级和线程回复、私信路由、反应处理、入站编辑抑制、重启重放去重、主服务器中断恢复、审批元数据传递、媒体处理以及 Matrix E2EE 启动/恢复/验证流程。E2EE CLI 配置文件还会在检查网关回复之前，通过同一个一次性主服务器驱动 MatrixCLI`openclaw matrix encryption setup` 和验证命令。

Discord 还有仅适用于 Mantis 的 bug 复现可选加入场景。使用
Discord`--scenario discord-status-reactions-tool-only` 获取明确的反应状态时间线，或者使用 `--scenario discord-thread-reply-filepath-attachment`Discord 创建一个
真实的 Discord 线程并验证 `message.thread-reply` 是否保留了
`filePath`DiscordDiscord 附件。这些场景不在默认的实时 Discord 路线中，因为它们是前/后复现探测，而非广泛的冒烟覆盖。
线程-附件 Mantis 工作流还可以添加一个已登录的 Discord Web
见证视频，只要在 QA 环境中配置了 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` 或
`MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64`Discord。该查看器配置文件仅用于视觉捕获；通过/失败
决策仍来自 Discord REST oracle。

CI 在 `.github/workflows/qa-live-transports-convex.yml`Matrix 中使用相同的命令界面。预定的和默认的手动运行会使用具有实时前沿凭据、`--fast` 和 `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS=3000` 的快速 Matrix 概要文件。手动 `matrix_profile=all` 会分散到五个概要文件分片中，以便详尽的目录可以并行运行，同时每个分片保留一个构件目录。

对于传输真实的 Telegram、Discord 和 Slack 冒烟通道：

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
pnpm openclaw qa slack
```

它们针对一个预先存在的真实渠道，该渠道有两个机器人（驱动程序 + SUT）。所需的环境变量、场景列表、输出构件和 Convex 凭据池记录在下面的 [Telegram, Discord, 和 Slack QA 参考](TelegramDiscordSlack#telegram-discord-and-slack-qa-reference) 中。

若要使用 VNC 救援功能进行完整的 Slack 桌面虚拟机运行，请运行：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

该命令租用一台 Crabbox 桌面/浏览器机器，在虚拟机内运行 Slack 实时通道，在 VNC 浏览器中打开 Slack Web，捕获桌面，并在视频捕获可用时将 `slack-qa/`、`slack-desktop-smoke.png` 和 `slack-desktop-smoke.mp4` 复制回 Mantis 工件目录。Crabbox 桌面/浏览器租约预先提供了捕获工具和浏览器/原生构建辅助包，因此该场景应仅在旧租约上安装后备项。Mantis 在 `mantis-slack-desktop-smoke-report.md` 中报告总计时和各阶段计时，因此慢速运行可以显示时间消耗在租约预热、凭据获取、远程设置还是工件复制上。在通过 VNC 手动登录 Slack Web 后重用 `--lease-id <cbx_...>`；重用的租约还能保持 Crabbox 的 pnpm 存储缓存热度。默认 `--hydrate-mode source` 从源代码检出进行验证并在虚拟机内运行安装/构建。仅当重用的远程工作区已具有 `node_modules` 和已构建的 `dist/` 时，才使用 `--hydrate-mode prehydrated`；该模式跳过昂贵的安装/构建步骤，并在工作区未就绪时以失败告终。使用 `--gateway-setup` 时，Mantis 会在虚拟机内的端口 `38973` 上保留一个持久的 OpenClaw Slack 网关运行；如果不使用该选项，该命令将运行常规的机器人对机器人 Slack QA 通道，并在捕获工件后退出。

操作员检查清单、GitHub 工作流调度命令、证据注释契约、水合模式决策表、计时解读以及故障处理步骤均位于 [Mantis Slack 桌面运行手册](/zh/concepts/mantis-slack-desktop-runbook) 中。

对于代理/CV 风格的桌面任务，请运行：

```bash
pnpm openclaw qa mantis visual-task \
  --browser-url https://example.net \
  --expect-text "Example Domain" \
  --vision-model openai/gpt-5.4
```

`visual-task` 租赁或复用 Crabbox 桌面/浏览器机器，启动
`crabbox record --while`，通过嵌套的 `visual-driver` 驱动可见浏览器，捕获 `visual-task.png`，当选择 `--vision-mode image-describe` 时，针对截图运行 `openclaw infer image describe`，
并写入 `visual-task.mp4`、`mantis-visual-task-summary.json`、
`mantis-visual-task-driver-result.json` 和 `mantis-visual-task-report.md`。
当设置了 `--expect-text` 时，视觉提示会要求结构化的 JSON 裁决，并且仅当模型报告积极的可见证据时才通过；仅仅引用目标文本的负面响应将导致断言失败。
使用 `--vision-mode metadata` 进行无模型的冒烟测试，在不调用图像理解提供商的情况下证明桌面、浏览器、截图和视频管道。录制是 `visual-task` 的必需产物；如果 Crabbox 没有录制任何非空的 `visual-task.mp4`，即使视觉驱动通过，任务也会失败。失败时，Mantis 会保留 VNC 的租约，除非任务已经通过且未设置 `--keep-lease`。

在使用池化的实时凭据之前，请运行：

```bash
pnpm openclaw qa credentials doctor
```

该诊断程序会检查 Convex broker 环境，验证端点设置，并在存在维护者密钥时验证 admin/list 的可达性。它仅报告密钥的已设置/缺失状态。

## 实时传输覆盖范围

实时传输通道共享一个契约，而不是各自发明自己的场景列表形状。`qa-channel` 是广泛的综合产品行为套件，不属于实时传输覆盖范围 Matrix 的一部分。

| 通道     | 金丝雀 | 提及门控 | Bot 对 Bot | 允许列表阻止 | 顶级回复 | 重启恢复 | 线程跟进 | 线程隔离 | 反应观察 | Help 命令 | 原生命令注册 |
| -------- | ------ | -------- | ---------- | ------------ | -------- | -------- | -------- | -------- | -------- | --------- | ------------ |
| Matrix   | x      | x        | x          | x            | x        | x        | x        | x        | x        |           |              |
| Telegram | x      | x        | x          |              |          |          |          |          |          | x         |              |
| Discord  | x      | x        | x          |              |          |          |          |          |          |           | x            |
| Slack    | x      | x        | x          | x            | x        | x        | x        | x        |          |           |              |

这使得 `qa-channel` 保持为广泛的产品行为套件，同时 Matrix、Telegram 和未来的实时传输共享一个明确的传输契约清单。

对于不将 Linux 引入 QA 路径的一次性 Docker VM 通道，请运行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

这将启动一个新的 Multipass 虚拟机，安装依赖项，在虚拟机内构建 OpenClaw，运行 `qa suite`，然后将常规 QA 报告和摘要复制回主机上的 `.artifacts/qa-e2e/...`。
它复用与主机上 `qa suite` 相同的场景选择行为。
默认情况下，主机和 Multipass 套件运行会使用隔离的 gateway 工作进程并行执行多个选定的场景。`qa-channel` 默认并发数为 4，上限由选定的场景数量决定。使用 `--concurrency <count>` 调整工作进程数量，或使用 `--concurrency 1` 进行串行执行。
当任何场景失败时，该命令以非零状态退出。当您希望在不导致失败退出码的情况下获取产物时，请使用 `--allow-failures`。
Live 运行会转发对虚拟机而言实用的受支持 QA 认证输入：基于环境的提供商密钥、QA live 提供商配置路径，以及（如果存在）`CODEX_HOME`。请将 `--output-dir` 保持在仓库根目录下，以便虚拟机可以通过挂载的工作区写回数据。

## Telegram、Discord 和 Slack QA 参考

Matrix 有一个[专用页面](/zh/concepts/qa-matrix)，因为其场景数量较多且具有 Docker 支持的主服务器置备。Telegram、Discord 和 Slack 规模较小——每个仅有少量场景，没有配置系统，针对预先存在的真实频道——因此它们的参考文档位于此处。

### 共享 CLI 标志

这些通道通过 `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` 注册并接受相同的标志：

| 标志                                  | 默认值                                                          | 描述                                                                          |
| ------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `--scenario <id>`                     | -                                                               | 仅运行此场景。可重复。                                                        |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord,slack}-<timestamp>` | 写入报告/摘要/观察到的消息和输出日志的位置。相对路径针对 `--repo-root` 解析。 |
| `--repo-root <path>`                  | `process.cwd()`                                                 | 从中立的当前工作目录调用时的存储库根目录。                                    |
| `--sut-account <id>`                  | `sut`                                                           | QA 网关配置内的临时帐户 ID。                                                  |
| `--provider-mode <mode>`              | `live-frontier`                                                 | `mock-openai` 或 `live-frontier`（旧版 `live-openai` 仍然有效）。             |
| `--model <ref>` / `--alt-model <ref>` | 提供商默认值                                                    | 主要/备用模型引用。                                                           |
| `--fast`                              | 关                                                              | 支持时使用提供商快速模式。                                                    |
| `--credential-source <env\|convex>`   | `env`                                                           | 请参阅 [Convex 凭证池](#convex-credential-pool)。                             |
| `--credential-role <maintainer\|ci>`  | 在 CI 中使用 `ci`，否则使用 `maintainer`                        | 当 `--credential-source convex` 时使用的角色。                                |

任何场景失败时，每个 lane 都会以非零代码退出。`--allow-failures` 会写入产物而不设置失败的退出代码。

### Telegram QA

```bash
pnpm openclaw qa telegram
```

针对一个真实的 Telegram 私有群组，使用两个不同的机器人（驱动程序 + SUT）。SUT 机器人必须具有 Telegram 用户名；当两个机器人在 `@BotFather` 中都启用了 **Bot-to-Bot Communication Mode** 时，机器人之间的观察效果最佳。

当使用 `--credential-source env` 时所需的 env：

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` - 数字聊天 id（字符串）。
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

可选：

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` 在观察到的消息构件中保留消息正文（默认为遮盖）。

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

隐式默认集始终涵盖金丝雀、提及门控、原生命令回复、命令寻址以及机器人对机器人的群组回复。`mock-openai` 默认值还包括确定性回复链和最终消息流检查。`telegram-current-session-status-tool` 仍需选择加入，因为它仅在紧接金丝雀之后进行线程处理时才稳定，而不是在任意原生命令回复之后。使用 `pnpm openclaw qa telegram --list-scenarios --provider-mode mock-openai` 打印当前的默认/可选拆分及回归引用。

输出产物：

- `telegram-qa-report.md`
- `telegram-qa-summary.json` - 包括从金丝雀开始的每次回复的 RTT（驱动程序发送 → 观察到的 SUT 回复）。
- `telegram-qa-observed-messages.json` - 除非 `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`，否则正文会被编辑。

### Discord QA

```bash
pnpm openclaw qa discord
```

针对一个真实的私有 Discord 公会频道，使用两个机器人：一个由测试框架控制的驱动程序机器人，和一个由子 OpenClaw 网关通过捆绑的 Discord 插件启动的 SUT 机器人。验证频道提及相关处理、SUT 机器人是否已向 Discord 注册了原生 `/help` 命令，以及选择性加入的 Mantis 证据场景。

当 `--credential-source env` 时所需的 env：

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID`Discord - 必须匹配 Discord 返回的 SUT 机器人用户 ID（否则通道会快速失败）。

可选：

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` 在观察到的消息构建产物中保留消息正文。
- `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID` 为 `discord-voice-autojoin` 选择语音/舞台渠道；如果没有它，场景将选择 SUT 机器人看到的第一个可见语音/舞台渠道。

场景 (`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`)：

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-voice-autojoin` - 可选语音场景。独立运行，启用 `channels.discord.voice.autoJoin`DiscordDiscord，并验证被测机器人当前的 Discord 语音状态是否为目标语音/舞台渠道。Convex Discord 凭据可能包含可选的 `voiceChannelId`；否则运行程序会发现公会中第一个可见的语音/舞台渠道。
- `discord-status-reactions-tool-only` - 可选 Mantis 场景。独立运行，因为它将被测系统切换为仅工具的常开公会回复模式（使用 `messages.statusReactions.enabled=true`），然后捕获 REST 反应时间线以及 HTML/PNG 视觉构件。Mantis 前/后报告还将保留场景提供的 MP4 构件，分别为 `baseline.mp4` 和 `candidate.mp4`。

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
- `discord-qa-observed-messages.json` - 除非 `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`，否则正文会被编辑。
- 当状态反应场景运行时，`discord-qa-reaction-timelines.json` 和 `discord-status-reactions-tool-only-timeline.png`。

### Slack QA

```bash
pnpm openclaw qa slack
```

针对一个真实的私有 Slack 渠道，使用两个不同的机器人：一个由测试工具控制的驱动机器人，和一个由子 OpenClaw 网关通过捆绑的 Slack 插件启动的 SUT 机器人。

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
- `slack-qa-observed-messages.json` - 除非设置了 `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1`，否则正文内容已编辑。

#### 设置 Slack 工作区

该通道需要一个工作区中的两个不同的 Slack 应用，以及一个两个机器人都加入的渠道：

- `channelId` - 两个机器人都已被邀请加入的渠道（渠道）的 `Cxxxxxxxxxx` ID。请使用专用渠道；该车道（lane）在每次运行时都会发布消息。
- `driverBotToken` - **Driver** 应用的机器人令牌（`xoxb-...`）。
- `sutBotToken` - **SUT** 应用的机器人令牌 (`xoxb-...`)，该应用必须是与驱动程序不同的 Slack 应用，以便其机器人用户 ID 唯一。
- `sutAppToken` - 具有 `connections:write` 的 SUT 应用的应用级令牌 (`xapp-...`)，由 Socket Mode 使用，以便 SUT 应用可以接收事件。

相比重用生产环境工作区，更推荐使用专门用于 QA 的 Slack 工作区。

下面的 SUT 清单有意将捆绑的 Slack 插件的生产安装 (`extensions/slack/src/setup-shared.ts:10`) 限制为实时 Slack QA 套件所涵盖的权限和事件。有关用户看到的生产渠道设置，请参阅 [Slack 渠道快速设置](/zh/channels/slack#quick-setup)；QA 驱动程序/SUT 对有意分开，因为该通道需要一个工作区中的两个不同的机器人用户 ID。

**1. 创建 Driver 应用**

转到 [api.slack.com/apps](https://api.slack.com/apps) → _Create New App_ → _From a manifest_ → 选择 QA 工作区，粘贴以下清单，然后 _Install to Workspace_：

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

复制 _Bot User OAuth Token_ (`xoxb-...`) - 它将变为 `driverBotToken`。驱动程序只需要发布消息并识别自己；不需要事件，不需要 Socket 模式。

**2. 创建 SUT 应用**

在同一工作区中重复 _Create New App → From a manifest_。此 QA 应用有意使用了捆绑的 Slack 插件的生产清单的一个更窄的版本 (`extensions/slack/src/setup-shared.ts:10`)：省略了反应作用域和事件，因为实况 Slack QA 套件尚未涵盖反应处理。

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

- _Install to Workspace_ → 复制 _Bot User OAuth Token_ → 该值将成为 `sutBotToken`。
- _Basic Information → App-Level Tokens → Generate Token and Scopes_ → 添加作用域 `connections:write` → 保存 → 复制 `xapp-...` 值 → 该值将成为 `sutAppToken`。

通过在每个令牌上调用 `auth.test` 来验证这两个机器人具有不同的用户 ID。运行时通过用户 ID 区分驱动程序和 SUT；对两者重复使用同一个应用程序将立即导致提及门控失败。

**3. 创建渠道**

在 QA 工作区中，创建一个渠道（例如 `#openclaw-qa`）并从渠道内部邀请这两个机器人：

```
/invite @OpenClaw QA Driver
/invite @OpenClaw QA SUT
```

从 _渠道信息 → 关于 → 渠道 ID_ 复制 `Cxxxxxxxxxx` ID - 它将成为 `channelId`。公开渠道可以正常工作；如果您使用私有渠道，两个应用程序都已经具有 `groups:history`，因此测试工具的历史记录读取仍然会成功。

**4. 注册凭证**

有两种选择。使用环境变量进行单机调试（设置四个 `OPENCLAW_QA_SLACK_*` 变量并传递 `--credential-source env`），或者填充共享的 Convex 池，以便 CI 和其他维护者可以租用它们。

对于 Convex 池，请将这四个字段写入一个 JSON 文件：

```json
{
  "channelId": "Cxxxxxxxxxx",
  "driverBotToken": "xoxb-...",
  "sutBotToken": "xoxb-...",
  "sutAppToken": "xapp-..."
}
```

在 shell 中导出 `OPENCLAW_QA_CONVEX_SITE_URL` 和 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 后，注册并验证：

```bash
pnpm openclaw qa credentials add \
  --kind slack \
  --payload-file slack-creds.json \
  --note "QA Slack pool seed"

pnpm openclaw qa credentials list --kind slack --status all --json
```

预期 `count: 1`、`status: "active"`，没有 `lease` 字段。

**5. 端到端验证**

在本地运行 lane 以确认两个机器人可以通过代理相互通信：

```bash
pnpm openclaw qa slack \
  --credential-source convex \
  --credential-role maintainer \
  --output-dir .artifacts/qa-e2e/slack-local
```

一次成功的运行可以在 30 秒内完成，并且 `slack-qa-report.md` 显示 `slack-canary` 和 `slack-mention-gating` 的状态均为 `pass`。如果通道挂起约 90 秒并以 `Convex credential pool exhausted for kind "slack"` 退出，则说明池为空或每一行都被租用了——`qa credentials list --kind slack --status all --json` 会告诉你具体是哪种情况。

### Convex 凭证池

Telegram、Discord、Slack 和 WhatsApp 通道可以从共享的 Convex 池中租用凭据，而不是读取上述环境变量。传递 `--credential-source convex`（或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）；QA Lab 会获取一个独占租约，在运行期间对其进行心跳检测，并在关闭时释放它。池的种类包括 `"telegram"`、`"discord"`、`"slack"` 和 `"whatsapp"`。

代理在 `admin/add` 上验证的负载结构：

- Telegram (`kind: "telegram"`): `{ groupId: string, driverToken: string, sutToken: string }` - `groupId` 必须是数字聊天 ID 字符串。
- Telegram 真实用户 (`kind: "telegram-user"`): `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }` - 由 TDLib CLI 驱动程序和 Telegram Desktop 视觉见证者共同使用的独占一次性账户租约。
- Discord (`kind: "discord"`): `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`。
- WhatsApp (`kind: "whatsapp"`): `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }` - 电话号码必须是不同的 E.164 字符串。

对于视觉上的真实用户 Telegram 证明，首选持有的 Crabbox 会话：

```bash
pnpm qa:telegram-user:crabbox -- start --tdlib-url http://artifacts.openclaw.ai/tdlib-v1.8.0-linux-x64.tgz --output-dir .artifacts/qa-e2e/telegram-user-crabbox/pr-review
pnpm qa:telegram-user:crabbox -- send --session .artifacts/qa-e2e/telegram-user-crabbox/pr-review/session.json --text /status
pnpm qa:telegram-user:crabbox -- finish --session .artifacts/qa-e2e/telegram-user-crabbox/pr-review/session.json
```

`start` 持有一个独占的 Convex `telegram-user` 租约，供 TDLib CLI
驱动器和 Telegram Desktop 目击者使用，启动桌面录制，并保持
Crabbox 处于活动状态，以便执行任意代理驱动的复现步骤。代理可以使用 `send`、
`run`、`screenshot` 和 `status`，直到满意为止，然后 `finish`
在释放凭据之前收集截图、视频、动作修剪的视频/GIF、TDLib 探测输出
和日志。`publish --会话 <file> --pr

<number>` comments only the motion GIF by default; `--full-artifacts` 是获取
日志和 JSON 输出的显式选择加入选项。默认的 `probe` 命令仍然是
快速 `/status` 冒烟测试的单命令缩写。

当 PR 需要确定性的视觉差异时，请使用 `--mock-response-file <path>`：当 Telegram 格式化程序或交付层发生变化时，可以在 `main` 和 PR 分支上运行相同的模拟模型回复。捕获默认值是针对 PR 评论调整的：标准 Crabbox 类，24fps 桌面录制，24fps 动态 GIF，以及 1920px 预览宽度。Before/after 评论应发布一个仅包含预期 GIF 的干净捆绑包。

Slack 车道也可以使用该池。Slack 载荷形状检查目前位于 Slack QA 运行器中，而不是代理中；使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`，并使用像 `Cxxxxxxxxxx` 这样的 Slack 渠道 ID。有关应用和范围配置，请参阅 [Setting up the Slack workspace](#setting-up-the-slack-workspace)。

操作环境变量和 Convex 代理端点协定位于 [Testing → Shared Telegram credentials via Convex](/zh/help/testing#shared-telegram-credentials-via-convex-v1) 中（该部分名称早于多渠道池；租约语义在各类型之间共享）。

## Repo-backed seeds

Seed 资产位于 `qa/` 中：

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

这些内容有意保留在 git 中，以便 QA 计划对人员和代理都可见。

`qa-lab` 应保持为通用的 markdown 运行器。每个场景 markdown 文件是一次测试运行的真实来源，并且应定义：

- 场景元数据
- 可选的类别、能力、车道和风险元数据
- 文档和代码引用
- 可选的插件要求
- 可选的 Gateway(网关) 配置补丁
- 可执行的 `qa-flow`

支持 `qa-flow`Gateway(网关) 的可重用运行时表面可以保持通用性和横切性。例如，markdown 场景可以将传输端的辅助程序与浏览器端的辅助程序结合起来，通过 Gateway `browser.request` 缝隙驱动嵌入式控制 UI，而无需添加特殊情况运行程序。

场景文件应按产品功能而非源码树文件夹进行分组。移动文件时请保持场景 ID 稳定；使用 `docsRefs` 和 `codeRefs` 以便于实现追溯。

基准列表应保持足够广泛的覆盖范围，包括：

- 私信和渠道聊天
- 线索行为
- 消息操作生命周期
- cron 回调
- 记忆召回
- 模型切换
- 子代理移交
- 代码库阅读和文档阅读
- 一个小型的构建任务，例如 Lobster Invaders

## 提供商模拟通道

`qa suite` 有两个本地提供商模拟通道：

- `mock-openai` 是场景感知的 OpenClaw 模拟。它仍然是基于代码库的 QA 和一致性门的默认确定性模拟通道。
- `aimock` 启动一个由 AIMock 支持的提供商服务器，用于实验性协议、fixture、记录/重放和混沌覆盖。它是增量的，不会替代 `mock-openai` 场景调度器。

Provider-lane 的实现位于 `extensions/qa-lab/src/providers/` 下。每个提供商拥有其默认值、本地服务器启动、网关模型配置、auth-profile 暂存需求以及实时/模拟功能标志。共享套件和网关代码应通过提供商注册表进行路由，而不是根据提供商名称进行分支判断。

## 传输适配器

`qa-lab` 拥有用于 markdown QA 场景的通用传输接口。`qa-channel` 是该接口上的第一个适配器，但设计目标更为广泛：未来的真实或合成通道应接入同一个套件运行器，而不是添加特定于传输的 QA 运行器。

在架构层面，划分如下：

- `qa-lab` 负责通用场景执行、工作线程并发、产物写入和报告。
- 传输适配器负责网关配置、就绪状态、入站和出站观测、传输操作以及规范化的传输状态。
- `qa/scenarios/` 下的 Markdown 场景文件定义了测试运行；`qa-lab` 提供了执行它们的可重用运行时接口。

### 添加渠道

向 Markdown QA 系统添加渠道只需两件事：

1. 该渠道的传输适配器。
2. 一个用于验证渠道契约的场景包。

当共享的 `qa-lab` 主机可以拥有该流程时，请勿添加新的顶级 QA 命令根。

`qa-lab` 拥有共享主机机制：

- `openclaw qa` 命令根
- 套件启动和拆卸
- 工作进程并发
- 产物写入
- 报告生成
- 场景执行
- 较旧 `qa-channel` 场景的兼容别名

Runner 插件拥有传输协议：

- `openclaw qa <runner>` 如何挂载在共享 `qa` 根目录下
- 如何针对该传输配置网关
- 如何检查就绪状态
- 如何注入入站事件
- 如何观察出站消息
- 如何公开脚本和规范化的传输状态
- 如何执行传输支持的操作
- 如何处理特定于传输的重置或清理

采用新渠道的最低标准：

1. 将 `qa-lab` 保持为共享 `qa` 根目录的所有者。
2. 在共享 `qa-lab` 主机接缝上实现传输运行器。
3. 将特定于传输的机制保留在运行器插件或渠道线束内部。
4. 将运行器作为 `openclaw qa <runner>` 挂载，而不是注册一个竞争的根命令。运行器插件应该在 `openclaw.plugin.json` 中声明 `qaRunners`，并从 `runtime-api.ts` 导出匹配的 `qaRunnerCliRegistrations` 数组。保持 `runtime-api.ts` 轻量；延迟 CLI 和运行器执行应保持在单独的入口点之后。
5. 在主题化 `qa/scenarios/` 目录下编写或改编 Markdown 场景。
6. 对新场景使用通用场景辅助程序。
7. 除非仓库正在进行有意的迁移，否则保持现有的兼容性别名正常工作。

决策规则是严格的：

- 如果行为可以在 `qa-lab` 中表达一次，请将其放在 `qa-lab` 中。
- 如果行为依赖于某个渠道传输，请将其保留在该运行器插件或插件线束中。
- 如果场景需要多个渠道都可以使用的新功能，请在 `suite.ts` 中添加一个通用辅助函数，而不是特定于渠道的分支。
- 如果某个行为仅对一种传输有意义，请保持该场景特定于该传输，并在场景契约中明确说明。

### 场景辅助函数名称

新场景首选的通用辅助函数：

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

兼容性别名仍可用于现有场景 —— `waitForQaChannelReady`、`waitForOutboundMessage`、`waitForNoOutbound`、`formatConversationTranscript`、`resetBus` —— 但新场景的编写应使用通用名称。这些别名存在是为了避免一次性迁移（flag-day migration），而非作为未来的模型。

## 报告

`qa-lab` 从观测到的总线时间线导出 Markdown 协议报告。
该报告应回答：

- 什么成功了
- 什么失败了
- 什么仍然受阻
- 哪些后续场景值得添加

要获取可用场景的清单——在估算后续工作规模或连接新传输时很有用——请运行 `pnpm openclaw qa coverage`（添加 `--json` 以获取机器可读的输出）。

对于字符和风格检查，请在多个实时模型引用上运行相同的场景，并编写一份判定性的 Markdown 报告：

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

该命令运行本地 QA 网关子进程，而不是 Docker。角色评估场景应通过 `SOUL.md` 设置角色，然后运行普通用户轮次，例如聊天、工作区帮助和小型文件任务。不应告知候选模型它正在接受评估。该命令保留每个完整的记录，记录基本的运行统计信息，然后在支持的情况下以快速模式要求具有 `xhigh` 推理的评判模型按自然度、氛围和幽默感对运行进行排名。在比较提供商时使用 `--blind-judge-models`：评判提示仍然会获得每条记录和运行状态，但候选引用会被替换为中性标签，如 `candidate-01`；报告在解析后将排名映射回真实引用。候选运行默认为 `high` 思考，对于 GPT-5.5 使用 `medium`，对于支持它的较旧的 OpenAI 评估引用使用 `xhigh`。使用 `--model provider/model,thinking=<level>` 内联覆盖特定候选。`--thinking <level>` 仍然设置全局后备，并且保留较旧的 `--model-thinking <provider/model=level>` 形式以保持兼容性。OpenAI 候选引用默认为快速模式，因此在提供商支持的地方会使用优先处理。当单个候选或评判需要覆盖时，添加 `,fast`、`,no-fast` 或 `,fast=false` 内联。仅当您想强制每个候选模型都开启快速模式时才传递 `--fast`。候选和评判的持续时间会记录在报告中用于基准分析，但评判提示明确说明不要按速度排名。候选和评判模型运行都默认并发为 16。当提供商限制或本地网关压力导致运行太嘈杂时，降低 `--concurrency` 或 `--judge-concurrency`。当没有传递候选 `--model` 时，角色评估默认为 `openai/gpt-5.5`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-6`、`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、`moonshot/kimi-k2.5` 和 `google/gemini-3.1-pro-preview`（当没有传递 `--model` 时）。当没有传递 `--judge-model` 时，评判默认为 `openai/gpt-5.5,thinking=xhigh,fast` 和 `anthropic/claude-opus-4-6,thinking=high`。

## 相关文档

- [Matrix QA](Matrix/en/concepts/qa-matrix)
- [QA Channel](/zh/channels/qa-channel)
- [测试](/zh/help/testing)
- [仪表板](/zh/web/dashboard)
