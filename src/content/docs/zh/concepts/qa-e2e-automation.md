---
summary: "QA 栈概述：qa-lab、qa-渠道、仓库支持的场景、实时传输通道、传输适配器和报告。"
read_when:
  - Understanding how the QA stack fits together
  - Extending qa-lab, qa-channel, or a transport adapter
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "QA 概述"
---

私有 QA 栈旨在以比单一单元测试更现实、以渠道为形态的方式来演练 OpenClaw。

当前组件：

- `extensions/qa-channel`：具有私信、渠道、主题、反应、编辑和删除界面的综合消息渠道。
- `extensions/qa-lab`：用于观察记录、注入入站消息和导出 Markdown 报告的调试器 UI 和 QA 总线。
- `extensions/qa-matrix`，未来的运行器插件：在子 QA 网关内部驱动真实渠道的实时传输适配器。
- `qa/`：用于启动任务和基准 QA 场景的仓库支持种子资产。
- [Mantis](/zh/concepts/mantis)：针对需要真实传输、浏览器屏幕截图、VM 状态和 PR 证据的错误的实时验证前后检查。

## 命令界面

每个 QA 流程都在 `pnpm openclaw qa <subcommand>` 下运行。许多都有 `pnpm qa:*` 脚本别名；这两种形式都支持。

| 命令                                                | 用途                                                                                                                                                                                                                                    |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | 打包的 QA 自检；写入 Markdown 报告。                                                                                                                                                                                                    |
| `qa suite`                                          | 针对 QA 网关通道运行仓库支持的场景。别名：`pnpm openclaw qa suite --runner multipass` 用于一次性 Linux 虚拟机。                                                                                                                         |
| `qa coverage`                                       | 打印 markdown 场景覆盖率清单（`--json` 用于机器输出）。                                                                                                                                                                                 |
| `qa parity-report`                                  | 比较两个 `qa-suite-summary.json` 文件并编写代理奇偶校验报告，或使用 `--runtime-axis --token-efficiency` 从一个运行时对摘要编写 Codex 与 OpenClaw 运行时奇偶校验和令牌效率报告。                                                         |
| `qa character-eval`                                 | 在多个实时模型上运行角色 QA 场景并生成评判报告。参见[报告](#reporting)。                                                                                                                                                                |
| `qa manual`                                         | 针对所选提供商/模型通道运行一次性提示。                                                                                                                                                                                                 |
| `qa ui`                                             | 启动 QA 调试器 UI 和本地 QA 总线（别名：`pnpm qa:lab:ui`）。                                                                                                                                                                            |
| `qa docker-build-image`                             | 构建预制的 QA Docker 镜像。                                                                                                                                                                                                             |
| `qa docker-scaffold`                                | 为 QA 仪表板 + 网关通道编写 docker-compose 脚手架。                                                                                                                                                                                     |
| `qa up`                                             | 构建 QA 站点，启动 Docker 支持的堆栈，打印 URL（别名：`pnpm qa:lab:up`；`:fast` 变体添加 `--use-prebuilt-image --bind-ui-dist --skip-ui-build`）。                                                                                      |
| `qa aimock`                                         | 仅启动 AIMock 提供商 服务器。                                                                                                                                                                                                           |
| `qa mock-openai`                                    | 仅启动场景感知的 `mock-openai` 提供商 服务器。                                                                                                                                                                                          |
| `qa credentials doctor` / `add` / `list` / `remove` | 管理共享的 Convex 凭证池。                                                                                                                                                                                                              |
| `qa matrix`                                         | 针对一次性 Tuwunel 主服务器的实时传输通道。参见 [Matrix QA](/zh/concepts/qa-matrix)。                                                                                                                                                   |
| `qa telegram`                                       | 针对真实的私有 Telegram 群组的实时传输通道。                                                                                                                                                                                            |
| `qa discord`                                        | 针对真实的私有 Discord 频道的实时传输通道。                                                                                                                                                                                             |
| `qa slack`                                          | 针对真实的私有 Slack 渠道的实时传输通道。                                                                                                                                                                                               |
| `qa mantis`                                         | 针对实时传输错误的验证前后运行程序，包含 Discord 状态反应证据、Crabbox 桌面/浏览器冒烟测试以及 Slack-in-VNC 冒烟测试。参见 [Mantis](/zh/concepts/mantis) 和 [Mantis Slack Desktop Runbook](/zh/concepts/mantis-slack-desktop-runbook)。 |

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

`qa:lab:up:fast` 将 Docker 服务保持在预构建的镜像上，并将 `extensions/qa-lab/web/dist` 挂载到 `qa-lab` 容器中。`qa:lab:watch` 会在更改时重建该捆绑包，当 QA Lab 资产哈希更改时浏览器会自动重新加载。

要进行本地 OpenTelemetry 信号冒烟测试，请运行：

```bash
pnpm qa:otel:smoke
```

该脚本启动一个本地 OTLP/HTTP 接收器，运行启用了 `diagnostics-otel` 插件的 `otel-trace-smoke` QA 场景，然后断言 traces、metrics 和 logs 已被导出。它会解码导出的 protobuf trace 跨度并检查关键的发布形状：`openclaw.run`、`openclaw.harness.run`、一个最新的 GenAI 语义约定模型调用跨度、`openclaw.context.assembled` 和 `openclaw.message.delivery` 必须存在。该冒烟测试强制 `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`，因此模型调用跨度必须使用 `{gen_ai.operation.name} {gen_ai.request.model}` 名称；成功的轮次中模型调用不得导出 `StreamAbandoned`；原始诊断 ID 和 `openclaw.content.*` 属性必须不出现在 trace 中。原始 OTLP 载荷不得包含提示哨兵、响应哨兵或 QA 会话密钥。它会在 QA 套件产物旁边写入 `otel-smoke-summary.json`。

要运行基于 Collector 的 OpenTelemetry 冒烟测试，请执行：

```bash
pnpm qa:otel:collector-smoke
```

该通道将一个真实的 OpenTelemetry Collector Docker 容器置于同一个本地接收器之前。当更改端点连线、Collector 兼容性或进程内接收器可能掩盖的 OTLP 导出行为时，请使用它。

要运行受保护的 Prometheus 抓取冒烟测试，请执行：

```bash
pnpm qa:prometheus:smoke
```

该别名运行启用了 `diagnostics-prometheus` 的 `docker-prometheus-smoke` QA 场景，验证未认证的抓取被拒绝，然后检查已认证的抓取包含关键的指标系列，但不包含提示内容、响应内容、原始诊断标识符、身份验证令牌或本地路径。

要连续运行两个可观测性冒烟测试，请使用：

```bash
pnpm qa:observability:smoke
```

要使用基于 Collector 的 OpenTelemetry 通道以及受保护的 Prometheus 抓取冒烟测试，请使用：

```bash
pnpm qa:observability:collector-smoke
```

可观测性 QA 仅限源代码检出。npm tarball 故意省略了 QA Lab，因此打包 Docker 发布通道不运行 `qa` 命令。在更改诊断工具时，请从已构建的源代码检出中使用 `pnpm qa:otel:smoke`、`pnpm qa:prometheus:smoke` 或 `pnpm qa:observability:smoke`。

要运行传输真实的 Matrix 冒烟测试通道，请执行：

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

此通道的完整 CLI 参考、配置文件/场景目录、环境变量以及构件布局位于 [Matrix QA](CLIMatrix/en/concepts/qa-matrixDockerMatrix)。概览：它在 Docker 中配置一次性的 Tuwunel 主服务器，注册临时的驱动/SUT/观察者用户，在限定于该传输的子 QA 网关中运行真实的 Matrix 插件（无 `qa-channel`），然后在 `.artifacts/qa-e2e/matrix-<timestamp>/` 下写入 Markdown 报告、JSON 摘要、观察事件构件和组合输出日志。

这些场景覆盖了单元测试无法端到端证明的传输行为：提及 gating、允许机器人策略、允许列表、顶级和线程回复、私信路由、反应处理、入站编辑抑制、重启重放去重、主服务器中断恢复、批准元数据传递、媒体处理以及 Matrix E2EE 启动/恢复/验证流程。E2EE CLI 配置文件还会在检查网关回复之前，通过同一次性主服务器驱动 MatrixCLI`openclaw matrix encryption setup` 和验证命令。

Discord 也有仅限 Mantis 的可选加入场景，用于错误复现。使用
Discord`--scenario discord-status-reactions-tool-only` 查看明确的状态反应
时间线，或使用 `--scenario discord-thread-reply-filepath-attachment`Discord 创建一个
真实的 Discord 线程并验证 `message.thread-reply` 是否保留了
`filePath`DiscordDiscord 附件。这些场景不属于默认的实时 Discord 通道，
因为它们是复现前/后探测，而非广泛的冒烟覆盖。
线程附件 Mantis 工作流还可以在 QA
环境中配置了 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` 或
`MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64`Discord 时添加已登录的 Discord Web
见证视频。该查看者配置文件仅用于视觉捕获；通过/失败
决定仍来自 Discord REST oracle。

CI 在 `.github/workflows/qa-live-transports-convex.yml`Matrix 中使用相同的命令界面。预定和默认的手动运行使用实时 frontier 凭据、`--fast` 和 `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS=3000` 执行快速的 Matrix 配置文件。手动 `matrix_profile=all` 扩展到五个配置文件分片，以便详尽的目录可以并行运行，同时每个分片保留一个构件目录。

对于传输真实的 Telegram、Discord 和 Slack 冒烟通道：

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
pnpm openclaw qa slack
```

它们以预先存在的真实渠道为目标，该渠道有两个机器人（驱动程序 + SUT）。所需的环境变量、场景列表、输出构件和 Convex 凭据池记录在下文的 [Telegram、Discord 和 Slack QA 参考](TelegramDiscordSlack#telegram-discord-and-slack-qa-reference) 中。

要运行带有 VNC 救援功能的完整 Slack 桌面 VM，请运行：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

该命令会租用一台 Crabbox 桌面/浏览器机器，在虚拟机内运行 Slack 实时通道，在 VNC 浏览器中打开 Slack Web，捕获桌面，并在视频捕获可用时将 SlackSlack`slack-qa/`、`slack-desktop-smoke.png` 和 `slack-desktop-smoke.mp4` 复制回 Mantis 工件目录。Crabbox 桌面/浏览器租用预先提供了捕获工具和浏览器/原生构建辅助包，因此该场景应该只在较旧的租用上安装后备项。Mantis 会在 `mantis-slack-desktop-smoke-report.md` 中报告总时长和各阶段时长，因此缓慢的运行会显示时间消耗在了租用预热、凭据获取、远程设置还是工件复制上。通过 VNC 手动登录 Slack Web 后，重用 `--lease-id <cbx_...>`Slack；重用的租用还能保持 Crabbox 的 pnpm 存储缓存热度。默认的 `--hydrate-mode source` 会从源代码检出进行验证，并在虚拟机内运行安装/构建。仅当重用的远程工作区已经拥有 `node_modules` 和已构建的 `dist/` 时，才使用 `--hydrate-mode prehydrated`；该模式会跳过昂贵的安装/构建步骤，并在工作区未准备就绪时以失败告终。使用 `--gateway-setup`OpenClawSlack 时，Mantis 会在虚拟机内的端口 `38973`Slack 上保留一个持久的 OpenClaw Slack 网关运行；如果不使用它，该命令将运行常规的 bot-to-bot Slack QA 通道，并在捕获工件后退出。

要使用桌面证据证明原生 Slack 批准 UI，请运行 Mantis 批准检查点模式：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --approval-checkpoints \
  --credential-source convex \
  --credential-role maintainer
```

此模式与 `--gateway-setup`SlackSlackAPI 互斥。它运行 Slack 批准场景，拒绝非批准场景 ID，在每个待处理和已解决的批准状态处等待，将观察到的 Slack API 消息渲染为 `approval-checkpoints/<scenario>-pending.png` 和 `approval-checkpoints/<scenario>-resolved.png`Slack，然后如果任何检查点、消息证据、确认或渲染的截图缺失或为空，则失败。冷 CI 租约可能仍会在 `slack-desktop-smoke.png` 中显示 Slack 登录；批准检查点图像是该通道的视觉证明。

操作员检查清单、GitHub 工作流调度命令、证据注释契约、hydration-mode 决策表、计时解释和故障处理步骤位于 [Mantis Slack Desktop Runbook](GitHubSlack/en/concepts/mantis-slack-desktop-runbook) 中。

对于 agent/CV 风格的桌面任务，请运行：

```bash
pnpm openclaw qa mantis visual-task \
  --browser-url https://example.net \
  --expect-text "Example Domain" \
  --vision-model openai/gpt-5.5
```

`visual-task` 租用或重用 Crabbox 桌面/浏览器机器，启动 `crabbox record --while`，通过嵌套的 `visual-driver` 驱动可见浏览器，捕获 `visual-task.png`，在选择 `--vision-mode image-describe` 时针对截图运行 `openclaw infer image describe`，并写入 `visual-task.mp4`、`mantis-visual-task-summary.json`、`mantis-visual-task-driver-result.json` 和 `mantis-visual-task-report.md`。当设置 `--expect-text` 时，视觉提示会要求结构化的 JSON 判定，并且仅在模型报告积极的可见证据时才通过；仅引用目标文本的否定响应会使断言失败。使用 `--vision-mode metadata` 进行无模型的冒烟测试，在不调用图像理解提供商的情况下证明桌面、浏览器、截图和视频管道。录制是 `visual-task` 的必需产物；如果 Crabbox 没有录制任何非空的 `visual-task.mp4`，即使视觉驱动程序通过，任务也会失败。失败时，Mantis 会保留 VNC 的租约，除非任务已经通过且未设置 `--keep-lease`。

在使用池化实时凭证之前，请运行：

```bash
pnpm openclaw qa credentials doctor
```

Doctor 会检查 Convex broker 环境，验证端点设置，并在存在维护者密钥时验证 admin/list 的可达性。它仅报告密钥的已设置/缺失状态。

## 实时传输覆盖范围

实时传输通道共享一个合约，而不是各自发明自己的场景列表形状。`qa-channel` 是广泛的综合产品行为套件，不属于实时传输覆盖范围矩阵的一部分。

| 通道     | Canary | 提及门控 | Bot-to-bot | 允许列表块 | 顶级回复 | 重启恢复 | 线程跟进 | 线程隔离 | 表情反应观察 | 帮助命令 | 原生命令注册 |
| -------- | ------ | -------- | ---------- | ---------- | -------- | -------- | -------- | -------- | ------------ | -------- | ------------ |
| Matrix   | x      | x        | x          | x          | x        | x        | x        | x        | x            |          |              |
| Telegram | x      | x        | x          |            |          |          |          |          |              | x        |              |
| Discord  | x      | x        | x          |            |          |          |          |          |              |          | x            |
| Slack    | x      | x        | x          | x          | x        | x        | x        | x        |              |          |              |

这使得 `qa-channel` 仍作为广泛的产品行为套件，而 Matrix、Telegram 以及未来的实时传输则共享一个明确的传输合约检查清单。

对于不将 Linux 引入 QA 路径的一次性 Docker VM 通道，请运行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

这会启动一个新的 Multipass 虚拟机，安装依赖，在虚拟机内构建 OpenClaw，然后运行 `qa suite`，并将常规 QA 报告和摘要复制回主机上的 `.artifacts/qa-e2e/...`。
它复用了与主机上 `qa suite` 相同的场景选择行为。
默认情况下，主机和 Multipass 套件运行会并行执行多个选定的场景，并使用隔离的 gateway worker。`qa-channel` 默认并发为 4，受选定场景数量的限制。使用 `--concurrency <count>` 来调整 worker 数量，或者使用 `--concurrency 1` 进行串行执行。
使用 `--pack personal-agent` 来运行个人助手基准测试包。包选择器是累加的，通过重复的 `--scenario` 标志：首先运行显式场景，然后按包顺序运行包场景并移除重复项。
当自定义 QA 运行器已经提供了 OpenTelemetry 收集器设置，并希望同时选择 OpenTelemetry 和 Prometheus 诊断冒烟场景时，请使用 `--pack observability`。
当任何场景失败时，该命令以非零状态退出。当你想要输出产物而不希望退出代码表示失败时，请使用 `--allow-failures`。
实时运行会转发对虚拟机实用的受支持 QA 认证输入：基于环境的提供商密钥、QA 实时提供商配置路径，以及（如果存在）`CODEX_HOME`。请将 `--output-dir` 保留在仓库根目录下，以便虚拟机可以通过挂载的工作区写回数据。

## Telegram、Discord 和 Slack QA 参考

由于场景数量和基于 Matrix 的主服务器配置，Docker 拥有一个[专用页面](/zh/concepts/qa-matrix)。Telegram、Discord 和 Slack 较小——每个只有少量场景，没有配置系统，针对预先存在的真实频道——因此它们的参考信息位于此处。

### 共享 CLI 标志

这些通道通过 `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` 注册，并接受相同的标志：

| 标志                                  | 默认值                                                          | 描述                                                                            |
| ------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `--scenario <id>`                     | -                                                               | 仅运行此场景。可重复。                                                          |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord,slack}-<timestamp>` | 写入报告/摘要/观察到的消息和输出日志的位置。相对路径相对于 `--repo-root` 解析。 |
| `--repo-root <path>`                  | `process.cwd()`                                                 | 从中性工作目录调用时的仓库根目录。                                              |
| `--sut-account <id>`                  | `sut`                                                           | QA 网关配置中的临时账户 ID。                                                    |
| `--provider-mode <mode>`              | `live-frontier`                                                 | `mock-openai` 或 `live-frontier`（旧版 `live-openai` 仍然有效）。               |
| `--model <ref>` / `--alt-model <ref>` | 提供商默认                                                      | 主要/备用模型引用。                                                             |
| `--fast`                              | 关闭                                                            | 在支持的情况下启用提供商快速模式。                                              |
| `--credential-source <env\|convex>`   | `env`                                                           | 参见 [Convex 凭证池](#convex-credential-pool)。                                 |
| `--credential-role <maintainer\|ci>`  | CI 中为 `ci`，否则为 `maintainer`                               | 使用 `--credential-source convex` 时的角色。                                    |

每个通道在任何场景失败时均以非零退出。`--allow-failures` 会写入产物，但不会设置失败的退出代码。

### Telegram QA

```bash
pnpm openclaw qa telegram
```

针对一个真实的私有 Telegram 群组，使用两个不同的机器人（驱动程序 + SUT）。SUT 机器人必须具有 Telegram 用户名；当两个机器人都在 `@BotFather` 中启用**机器人到机器人通信模式**时，机器人到机器人的观察效果最佳。

`--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` - 数字聊天 ID（字符串）。
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

可选：

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` 会在观察到的消息产物中保留消息正文（默认为编辑删除）。

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

隐式默认集始终包括 canary、提及门控、原生命令回复、命令寻址以及机器人对机器人的群组回复。`mock-openai` 默认值还包括确定性回复链和最终消息流式传输检查。`telegram-current-session-status-tool` 仍然需要选择加入，因为仅在紧接 canary 之后线程化时才稳定，而不是在任意原生命令回复之后。使用 `pnpm openclaw qa telegram --list-scenarios --provider-mode mock-openai` 打印当前的默认/可选拆分以及回归引用。

输出产物：

- `telegram-qa-report.md`
- `telegram-qa-summary.json` - 包括从 canary 开始的每次回复 RTT（驱动程序发送 → 观察到的 SUT 回复）。
- `telegram-qa-observed-messages.json` - 除非设置 `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`，否则正文会被编辑。

软件包 RTT 比较使用相同的 Telegram 凭证合约，同时将其 RTT 示例控件保留在 RTT 约束路径上：

```bash
pnpm rtt openclaw@beta \
  --credential-source convex \
  --credential-role maintainer \
  --samples 20 \
  --sample-timeout-ms 30000
```

当设置 `--credential-source convex` 时，RTT Docker 包装器会租用一个 `kind: "telegram"` 凭证，将租用的群组/驱动程序/SUT 机器人环境导出到已安装软件包的运行中，对租用进行心跳检测，并在关闭时释放它。`--samples` 和 `--sample-timeout-ms` 仍然馈送 `OPENCLAW_NPM_TELEGRAM_WARM_SAMPLES` 和 `OPENCLAW_NPM_TELEGRAM_SAMPLE_TIMEOUT_MS`，因此 `result.json` 在环境支持和 Convex 支持的 RTT 运行之间保持可比性。

### Discord QA

```bash
pnpm openclaw qa discord
```

针对一个真实的私有 Discord 公会 OpenClaw 以及两个机器人：一个由测试装置控制的驱动机器人，和一个由子 Discord 网关通过捆绑的 Discord 插件启动的被测系统 (SUT) 机器人。验证 Discord 提及处理，SUT 机器人是否已向 Discord 注册了原生 `/help` 命令，以及可选的 Mantis 证据场景。

运行 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` - 必须与 Discord 返回的 SUT 机器人用户 ID 匹配（否则流水线会快速失败）。

可选：

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` 在观察到的消息构件中保留消息正文。
- `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID` 为 `discord-voice-autojoin` 选择语音/舞台 ；如果没有它，场景将选择 SUT 机器人可见的第一个语音/舞台 。

场景 (`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`)：

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-voice-autojoin` - 可选的语音场景。单独运行，启用 `channels.discord.voice.autoJoin`，并验证 SUT 机器人的当前 Discord 语音状态是目标语音/舞台 。Convex Discord 凭据可能包含可选的 `voiceChannelId`；否则运行器会发现公会中第一个可见的语音/舞台 。
- `discord-status-reactions-tool-only` - 可选的 Mantis 场景。单独运行，因为它使用 `messages.statusReactions.enabled=true` 将 SUT 切换到始终开启、仅 公会回复模式，然后捕获 REST 反应时间线以及 HTML/PNG 视觉构件。Mantis 前/后报告还将保留场景提供的 MP4 构件，作为 `baseline.mp4` 和 `candidate.mp4`。

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
  --model openai/gpt-5.5 \
  --alt-model openai/gpt-5.5 \
  --fast
```

输出构件：

- `discord-qa-report.md`
- `discord-qa-summary.json`
- `discord-qa-observed-messages.json` - 除非 `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`，否则正文将被编辑。
- 当状态反应场景运行时，`discord-qa-reaction-timelines.json` 和 `discord-status-reactions-tool-only-timeline.png`。

### Slack QA

```bash
pnpm openclaw qa slack
```

以一个真实的私有 Slack 渠道为目标，该渠道有两个不同的机器人：一个是由测试工具控制的驱动程序机器人，另一个是由子 OpenClaw 网关通过捆绑的 Slack 插件启动的被测系统（SUT）机器人。

当 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`

可选：

- `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1` 在观察到的消息构件中保留消息正文。
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` 为 Mantis 启用视觉批准检查点。运行器写入 `<scenario>.pending.json` 和
  `<scenario>.resolved.json`，然后等待匹配的 `.ack.json` 文件。
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_TIMEOUT_MS` 覆盖检查点确认超时。默认值为 `120000`。

场景（`extensions/qa-lab/src/live-transports/slack/slack-live.runtime.ts`）：

- `slack-canary`
- `slack-mention-gating`
- `slack-allowlist-block`
- `slack-top-level-reply-shape`
- `slack-restart-resume`
- `slack-thread-follow-up`
- `slack-thread-isolation`
- `slack-approval-exec-native` - 选择加入的原生 Slack 执行批准场景。
  通过网关请求执行批准，验证 Slack 消息是否具有
  原生批准按钮，对其进行解析，并验证已解析的 Slack 更新。
- `slack-approval-plugin-native` - 选择加入的原生 Slack 插件批准场景。
  同时启用执行和插件批准转发，以便插件事件不会
  被执行批准路由抑制，然后验证相同的待处理/已解析
  原生 Slack UI 路径。

输出构件：

- `slack-qa-report.md`
- `slack-qa-summary.json`
- `slack-qa-observed-messages.json` - 除非设置 `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1`，否则正文已编辑。
- `approval-checkpoints/` - 仅当 Mantis 设置了 `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` 时；包含检查点 JSON、确认 JSON 以及待处理/已解决的截图。

#### 设置 Slack 工作区

此通道需要一个工作区中的两个不同的 Slack 应用，外加两个机器人都是其成员的一个渠道：

- `channelId` - 两个机器人都受邀加入的渠道的 `Cxxxxxxxxxx` ID。使用专用渠道；该通道每次运行时都会发布消息。
- `driverBotToken` - **Driver** 应用的机器人令牌（`xoxb-...`）。
- `sutBotToken` - **SUT** 应用的机器人令牌（`xoxb-...`），它必须是一个与驱动程序分离的 Slack 应用，以便其机器人用户 ID 保持不同。
- `sutAppToken` - 具有 `connections:write` 的 SUT 应用的应用级令牌（`xapp-...`），由 Socket Mode 使用，以便 SUT 应用可以接收事件。

相比重用生产工作区，更推荐使用专用于 QA 的 Slack 工作区。

下面的 SUT 清单有意将捆绑的 Slack 插件的生产安装（`extensions/slack/src/setup-shared.ts:10`）范围缩小到实时 Slack QA 套件所涵盖的权限和事件。有关用户看到的生产渠道设置，请参阅 [Slack 渠道 quick setup](/zh/channels/slack#quick-setup)；QA Driver/SUT 对是有意分离的，因为该通道需要一个工作区中的两个不同的机器人用户 ID。

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

复制 _Bot User OAuth Token_（`xoxb-...`）——它将成为 `driverBotToken`。驱动程序只需要发布消息并表明身份；不需要事件，不需要 Socket Mode。

**2. 创建 SUT 应用**

在同一工作区中重复 _Create New App → From a manifest_。此 QA 应用有意使用了随附的 Slack 插件的生产环境清单的较窄版本（`extensions/slack/src/setup-shared.ts:10`）：省略了反应范围和事件，因为实时 Slack QA 套件尚未涵盖反应处理。

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

- _Install to Workspace_ → 复制 _Bot User OAuth Token_ → 这将成为 `sutBotToken`。
- _Basic Information → App-Level Tokens → Generate Token and Scopes_ → 添加范围 `connections:write` → 保存 → 复制 `xapp-...` 值 → 这将成为 `sutAppToken`。

通过对每个令牌调用 `auth.test` 来验证这两个机器人具有不同的用户 ID。运行时通过用户 ID 区分驱动程序和 SUT；为两者重复使用一个应用将立即导致提及限制失败。

**3. 创建渠道**

在 QA 工作区中，创建一个渠道（例如 `#openclaw-qa`）并从渠道内部邀请这两个机器人：

```
/invite @OpenClaw QA Driver
/invite @OpenClaw QA SUT
```

从 _channel info → About → Channel ID_ 复制 `Cxxxxxxxxxx` ID - 这将成为 `channelId`。公开渠道即可；如果您使用私有渠道，两个应用都已拥有 `groups:history`，因此测试线束的历史记录读取仍将成功。

**4. 注册凭据**

两种选择。使用环境变量进行单机调试（设置四个 `OPENCLAW_QA_SLACK_*` 变量并传递 `--credential-source env`），或者填充共享的 Convex 池，以便 CI 和其他维护者可以租用它们。

对于 Convex 池，将四个字段写入 JSON 文件：

```json
{
  "channelId": "Cxxxxxxxxxx",
  "driverBotToken": "xoxb-...",
  "sutBotToken": "xoxb-...",
  "sutAppToken": "xapp-..."
}
```

在 Shell 中导出 `OPENCLAW_QA_CONVEX_SITE_URL` 和 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 后，注册并验证：

```bash
pnpm openclaw qa credentials add \
  --kind slack \
  --payload-file slack-creds.json \
  --note "QA Slack pool seed"

pnpm openclaw qa credentials list --kind slack --status all --json
```

期望得到 `count: 1`、`status: "active"`，没有 `lease` 字段。

**5. 端到端验证**

在本地运行通道以确认两个机器人可以通过代理相互通信：

```bash
pnpm openclaw qa slack \
  --credential-source convex \
  --credential-role maintainer \
  --output-dir .artifacts/qa-e2e/slack-local
```

绿色运行在 30 秒内完成，并且 `slack-qa-report.md` 显示 `slack-canary` 和 `slack-mention-gating` 的状态均为 `pass`。如果通道挂起约 90 秒并以 `Convex credential pool exhausted for kind "slack"` 退出，则说明池为空或所有行均已被租用——`qa credentials list --kind slack --status all --json` 会告诉您具体是哪种情况。

### WhatsApp QA

```bash
pnpm openclaw qa whatsapp
```

针对两个专用的 WhatsApp Web 账户：一个由控制工具控制的驱动程序账户，以及一个通过捆绑的 OpenClaw 插件由子 WhatsApp 网关启动的 SUT 账户。

当 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_WHATSAPP_DRIVER_PHONE_E164`
- `OPENCLAW_QA_WHATSAPP_SUT_PHONE_E164`
- `OPENCLAW_QA_WHATSAPP_DRIVER_AUTH_ARCHIVE_BASE64`
- `OPENCLAW_QA_WHATSAPP_SUT_AUTH_ARCHIVE_BASE64`

可选：

- `OPENCLAW_QA_WHATSAPP_GROUP_JID` 启用 `whatsapp-mention-gating`。
- `OPENCLAW_QA_WHATSAPP_CAPTURE_CONTENT=1` 将消息正文保留在
  observed-message 构件中。

场景 (`extensions/qa-lab/src/live-transports/whatsapp/whatsapp-live.runtime.ts`)：

- `whatsapp-canary`
- `whatsapp-pairing-block`
- `whatsapp-mention-gating`
- `whatsapp-approval-exec-native` - 选择加入的原生 WhatsApp 批准执行
  场景。通过网关请求执行批准，验证
  WhatsApp 消息具有原生反应批准功能，将其解决，并
  验证已解决的 WhatsApp 后续操作。
- `whatsapp-approval-plugin-native` - 选择加入的原生 WhatsApp 插件批准
  场景。同时启用执行和插件批准转发，然后验证
  相同的待处理/已解决原生 WhatsApp 路径。

输出构件：

- `whatsapp-qa-report.md`
- `whatsapp-qa-summary.json`
- `whatsapp-qa-observed-messages.json` - 除非 `OPENCLAW_QA_WHATSAPP_CAPTURE_CONTENT=1`，否则正文将被编辑。

### Convex 凭证池

Telegram、Discord、Slack 和 WhatsApp 通道可以从共享的 Convex 池中租用凭据，而不是读取上述环境变量。传递 `--credential-source convex`（或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）；QA Lab 会获取一个独占租约，在运行期间对其进行心跳检测，并在关闭时释放它。池类型包括 `"telegram"`、`"discord"`、`"slack"` 和 `"whatsapp"`。

代理在 `admin/add` 上验证的有效负载形状：

- Telegram (`kind: "telegram"`)：`{ groupId: string, driverToken: string, sutToken: string }` - `groupId` 必须是数字聊天 ID 字符串。
- Telegram 真实用户 (`kind: "telegram-user"`)：`{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }` - 仅限 Mantis Telegram Desktop proof。通用 QA Lab 通道不得获取此类型。
- Discord (`kind: "discord"`)：`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`。
- WhatsApp (`kind: "whatsapp"`)：`{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }` - 电话号码必须是不同的 E.164 字符串。

Mantis Telegram Desktop proof 工作流程为 TDLib CLI 驱动程序和 Telegram Desktop witness 持有一个独占的 Convex `telegram-user` 租约，然后在发布 proof 后将其释放。

当 PR 需要确定性的视觉差异时，Mantis 可以在 Telegram 格式化程序或传递层更改期间，在 `main` 和 PR head 上使用相同的 mock 模型回复。捕获默认值已针对 PR 评论进行了调整：标准 Crabbox 类、24fps 桌面录制、24fps 动态 GIF 和 1920px 预览宽度。Before/after 评论应发布仅包含预期 GIF 的干净包。

Slack 车道也可以使用该池。Slack 负载形状检查目前位于 Slack QA 运行器中，而不是代理中；使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`，并使用类似 `Cxxxxxxxxxx` 的 Slack 渠道 ID。有关应用和范围设置，请参阅 [设置 Slack 工作区](#setting-up-the-slack-workspace)。

操作环境变量和 Convex 代理端点契约位于 [测试 → 通过 Convex 共享 Telegram 凭证](/zh/help/testing#shared-telegram-credentials-via-convex-v1) 中（该部分名称早于多渠道池；租约语义在各类别之间共享）。

## 基于仓库的种子

种子资源位于 `qa/`：

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

这些内容有意放在 git 中，以便 QA 计划对人类和代理都可见。

`qa-lab` 应保持为通用的 markdown 运行器。每个场景 markdown 文件是
一次测试运行的单一事实来源，并应定义：

- 场景元数据
- 可选的类别、能力、车道和风险元数据
- 文档和代码引用
- 可选的插件要求
- 可选的 gateway 配置补丁
- 可执行的 `qa-flow`

支持 `qa-flow` 的可重用运行时表面允许保持通用
和横切关注。例如，markdown 场景可以结合传输端
帮助程序和浏览器端帮助程序，后者通过
Gateway(网关) `browser.request` 接缝驱动嵌入式控制 UI，而
无需添加特殊情况运行器。

场景文件应按产品能力分组，而不是源树
文件夹。文件移动时保持场景 ID 稳定；使用 `docsRefs` 和 `codeRefs`
用于实现可追溯性。

基准列表应保持足够广泛以涵盖：

- 私信和渠道聊天
- 线程行为
- 消息操作生命周期
- cron 回调
- 记忆回忆
- 模型切换
- 子代理交接
- 读取仓库和读取文档
- 一个小型的构建任务，例如 Lobster Invaders

## 提供者模拟车道

`qa suite` 拥有两个本地提供商模拟通道：

- `mock-openai` 是场景感知的 OpenClaw 模拟。它仍然是基于仓库的 QA 和一致性门的默认确定性模拟通道。
- `aimock` 会启动一个由 AIMock 支持的提供商服务器，用于实验性协议、fixture、录制/回放和混沌覆盖。它是增补性的，不会替代 `mock-openai` 场景调度器。

提供商通道实现位于 `extensions/qa-lab/src/providers/` 下。每个提供商拥有其默认设置、本地服务器启动、网关模型配置、身份配置文件暂存需求以及实时/模拟功能标志。共享套件和网关代码应通过提供商注册表进行路由，而不是根据提供商名称进行分支判断。

## 传输适配器

`qa-lab` 拥有用于 Markdown QA 场景的通用传输接口。`qa-channel` 是该接口上的第一个适配器，但设计目标更广泛：未来的真实或合成渠道应接入同一个套件运行器，而不是添加特定于传输的 QA 运行器。

在架构层面，划分如下：

- `qa-lab` 负责通用场景执行、工作线程并发、构件写入和报告生成。
- 传输适配器负责网关配置、就绪状态、入站和出站观察、传输操作以及规范化的传输状态。
- `qa/scenarios/` 下的 Markdown 场景文件定义测试运行；`qa-lab` 提供执行这些文件的可重用运行时接口。

### 添加渠道

向 Markdown QA 系统添加渠道恰好需要两件事：

1. 该渠道的传输适配器。
2. 一个测试渠道契约的场景包。

当共享的 `qa-lab` 宿主可以拥有该流程时，不要添加新的顶级 QA 命令根。

`qa-lab` 拥有共享宿主机制：

- `openclaw qa` 命令根
- 套件启动和拆除
- 工作线程并发
- 构件写入
- 报告生成
- 场景执行
- 针对旧版 `qa-channel` 场景的兼容性别名

运行器插件拥有传输契约：

- `openclaw qa <runner>` 如何挂载在共享 `qa` 根目录下
- 如何为该传输配置网关
- 如何检查就绪状态
- 如何注入入站事件
- 如何观察出站消息
- 如何公开脚本记录和规范化的传输状态
- 如何执行由传输支持的操作
- 如何处理特定于传输的重置或清理

采用新渠道的最低门槛：

1. 保持 `qa-lab` 作为共享 `qa` 根目录的所有者。
2. 在共享 `qa-lab` 主机接缝上实现传输运行程序。
3. 将特定于传输的机制保留在运行程序插件或渠道工具中。
4. 将运行程序挂载为 `openclaw qa <runner>`，而不是注册竞争的根命令。运行程序插件应在 `openclaw.plugin.json` 中声明 `qaRunners`，并从 `runtime-api.ts` 导出匹配的 `qaRunnerCliRegistrations` 数组。保持 `runtime-api.ts` 轻量；延迟 CLI 和运行程序执行应留在单独的入口点之后。
5. 在主题 `qa/scenarios/` 目录下编写或改编 Markdown 场景。
6. 对新场景使用通用场景辅助程序。
7. 除非仓库正在进行有意的迁移，否则保持现有的兼容性别名正常工作。

决策规则很严格：

- 如果行为可以在 `qa-lab` 中表达一次，请将其放在 `qa-lab` 中。
- 如果行为依赖于某个渠道传输，请将其保留在该运行程序插件或插件工具中。
- 如果场景需要多个渠道可以使用的新功能，请添加通用辅助程序，而不是在 `suite.ts` 中添加特定于渠道的分支。
- 如果行为仅对一种传输有意义，请保持场景特定于该传输，并在场景契约中明确说明这一点。

### 场景辅助程序名称

新场景的首选通用辅助程序：

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

现有场景的兼容性别名仍然可用—— `waitForQaChannelReady` 、 `waitForOutboundMessage` 、 `waitForNoOutbound` 、 `formatConversationTranscript` 、 `resetBus` ——但新场景的编写应使用通用名称。这些别名的存在是为了避免“大爆炸”式迁移，而不是作为未来的模型。

## 报告

`qa-lab` 从观察到的总线时间线导出 Markdown 协议报告。
该报告应回答：

- 什么起作用了
- 什么失败了
- 什么仍然受阻
- 哪些后续场景值得添加

若要获取可用场景的清单——这在估算后续工作范围或连接新传输时很有用——请运行 `pnpm openclaw qa coverage`（添加 `--json` 以获取机器可读的输出）。
当针对涉及的行为或文件路径选择特定的验证时，请运行 `pnpm openclaw qa coverage --match <query>`。
匹配报告会搜索场景元数据、文档引用、代码引用、覆盖率 ID、插件和提供商要求，然后打印匹配的 `qa suite --scenario ...` 目标。
请将其视为一种发现辅助工具，而不是闸机的替代品；所选场景仍需要针对被测行为具备正确的提供商模式、实时传输、Multipass、Testbox 或发布通道。

对于字符和风格检查，请在多个实时模型引用上运行同一场景，并编写一份经评估的 Markdown 报告：

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.5,thinking=medium,fast \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-8,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.5,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-8,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

该命令运行本地 QA 网关子进程，而不是 Docker。角色评估场景应通过 `SOUL.md` 设置角色，然后运行普通用户轮次，例如聊天、工作区帮助和小文件任务。不应告诉候选模型它正在接受评估。该命令会保留每个完整的对话记录，记录基本的运行统计数据，然后询问处于快速模式的评判模型，并在支持的情况下使用 `xhigh` 推理，根据自然度、氛围和幽默感对运行进行排名。在比较提供商时请使用 `--blind-judge-models`：评判提示词仍然会获取每个对话记录和运行状态，但候选引用会被中性标签（例如 `candidate-01`）替换；解析后，报告会将排名映射回真实引用。候选运行默认使用 `high` 思维，对于 GPT-5.5 使用 `medium`，对于支持它的较旧 OpenAI 评估引用使用 `xhigh`。可以使用 `--model provider/model,thinking=<level>` 内联覆盖特定候选。`--thinking <level>` 仍然设置全局回退，并保留旧的 `--model-thinking <provider/model=level>` 形式以保持兼容性。OpenAI 候选引用默认使用快速模式，因此在提供商支持的地方使用优先处理。当单个候选或评判需要覆盖时，请内联添加 `,fast`、`,no-fast` 或 `,fast=false`。仅当您希望强制每个候选模型开启快速模式时才传递 `--fast`。候选和评判的持续时间会记录在报告中用于基准分析，但评判提示词明确说明不要按速度排名。候选和评判模型运行默认并发数均为 16。当提供商限制或本地网关压力导致运行过于嘈杂时，请降低 `--concurrency` 或 `--judge-concurrency`。当未传递候选 `--model` 时，角色评估默认为 `openai/gpt-5.5`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-8`、`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、`moonshot/kimi-k2.5` 和 `google/gemini-3.1-pro-preview`（当未传递 `--model` 时）。当未传递 `--judge-model` 时，评判默认为 `openai/gpt-5.5,thinking=xhigh,fast` 和 `anthropic/claude-opus-4-8,thinking=high`。

## 相关文档

- [Matrix QA](Matrix/en/concepts/qa-matrix)
- [个人代理基准包](/zh/concepts/personal-agent-benchmark-pack)
- [QA Channel](/zh/channels/qa-channel)
- [测试](/zh/help/testing)
- [仪表板](/zh/web/dashboard)
