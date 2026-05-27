---
summary: "QA 堆栈概述：qa-lab、qa-渠道、基于仓库的场景、实时传输通道、传输适配器和报告。"
read_when:
  - Understanding how the QA stack fits together
  - Extending qa-lab, qa-channel, or a transport adapter
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "QA 概述"
---

私有 QA 栈旨在以比单一单元测试更现实、以渠道为形态的方式来演练 OpenClaw。

当前组件：

- `extensions/qa-channel`：综合消息渠道，包含私信、渠道、线程、反应、编辑和删除界面。
- `extensions/qa-lab`：用于观察记录、注入入站消息和导出 Markdown 报告的调试器 UI 和 QA 总线。
- `extensions/qa-matrix`，未来的运行器插件：实时传输适配器，用于在子 QA 网关内驱动真实渠道。
- `qa/`：用于启动任务和基准 QA 场景的基于仓库的种子资产。
- [Mantis](/zh/concepts/mantis)：针对需要真实传输、浏览器截图、VM 状态和 PR 证据的错误进行实时验证前后的检查。

## 命令界面

每个 QA 流都在 `pnpm openclaw qa <subcommand>` 下运行。许多都有 `pnpm qa:*` 脚本别名；两种形式均受支持。

| 命令                                                | 用途                                                                                                                                                                                                                                    |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | 打包的 QA 自检；写入 Markdown 报告。                                                                                                                                                                                                    |
| `qa suite`                                          | 针对 QA 网关通道运行基于仓库的场景。别名：`pnpm openclaw qa suite --runner multipass` 用于一次性 Linux 虚拟机。                                                                                                                         |
| `qa coverage`                                       | 打印 markdown 场景覆盖清单（`--json` 用于机器输出）。                                                                                                                                                                                   |
| `qa parity-report`                                  | 比较两个 `qa-suite-summary.json` 文件并编写代理对等报告，或使用 `--runtime-axis --token-efficiency` 根据一个运行时对摘要编写 Codex-vs-Pi 运行时对等性和令牌效率报告。                                                                   |
| `qa character-eval`                                 | 在多个实时模型上运行角色 QA 场景并生成评判报告。请参阅[报告](#reporting)。                                                                                                                                                              |
| `qa manual`                                         | 针对所选提供商/模型通道运行一次性提示。                                                                                                                                                                                                 |
| `qa ui`                                             | 启动 QA 调试器 UI 和本地 QA 总线（别名：`pnpm qa:lab:ui`）。                                                                                                                                                                            |
| `qa docker-build-image`                             | 构建预制的 QA Docker 镜像。                                                                                                                                                                                                             |
| `qa docker-scaffold`                                | 为 QA 仪表板 + 网关通道编写 docker-compose 脚手架。                                                                                                                                                                                     |
| `qa up`                                             | 构建 QA 站点，启动基于 Docker 的堆栈，并打印 URL（别名：`pnpm qa:lab:up`；`:fast` 变体添加了 `--use-prebuilt-image --bind-ui-dist --skip-ui-build`）。                                                                                  |
| `qa aimock`                                         | 仅启动 AIMock 提供商 服务器。                                                                                                                                                                                                           |
| `qa mock-openai`                                    | 仅启动支持场景的 `mock-openai` 提供商 服务器。                                                                                                                                                                                          |
| `qa credentials doctor` / `add` / `list` / `remove` | 管理共享的 Convex 凭证池。                                                                                                                                                                                                              |
| `qa matrix`                                         | 针对一次性 Tuwunel 主服务器的实时传输通道。请参阅 [Matrix QA](/zh/concepts/qa-matrix)。                                                                                                                                                 |
| `qa telegram`                                       | 针对真实的私有 Telegram 群组的实时传输通道。                                                                                                                                                                                            |
| `qa discord`                                        | 针对真实的私有 Discord 频道的实时传输通道。                                                                                                                                                                                             |
| `qa slack`                                          | 针对真实的私有 Slack 渠道的实时传输通道。                                                                                                                                                                                               |
| `qa mantis`                                         | 用于实时传输错误的验证前后运行器，包含 Discord 状态反应证据、Crabbox 桌面/浏览器冒烟测试以及 Slack-in-VNC 冒烟测试。请参阅 [Mantis](/zh/concepts/mantis) 和 [Mantis Slack Desktop Runbook](/zh/concepts/mantis-slack-desktop-runbook)。 |

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

`qa:lab:up:fast` 将 Docker 服务保留在预构建的镜像上，并将 `extensions/qa-lab/web/dist` 挂载到 `qa-lab` 容器中。`qa:lab:watch` 会在更改时重新构建该包，当 QA Lab 资源哈希更改时，浏览器会自动重新加载。

要进行本地 OpenTelemetry 信号冒烟测试，请运行：

```bash
pnpm qa:otel:smoke
```

该脚本启动一个本地 OTLP/HTTP 接收器，运行启用了 `diagnostics-otel` 插件的 `otel-trace-smoke` QA 场景，然后断言导出了追踪、指标和日志。它解码导出的 protobuf 追踪跨度，并检查对发布至关重要的结构：必须存在 `openclaw.run`、`openclaw.harness.run`、`openclaw.model.call`、`openclaw.context.assembled` 和 `openclaw.message.delivery`；模型调用在成功的轮次中不得导出 `StreamAbandoned`；原始诊断 ID 和 `openclaw.content.*` 属性必须排除在追踪之外。原始 OTLP 载荷不得包含提示标记、响应标记或 QA 会话密钥。它会在 QA 套件产物旁边写入 `otel-smoke-summary.json`。

要运行受保护的 Prometheus 抓取冒烟测试，请运行：

```bash
pnpm qa:prometheus:smoke
```

该别名运行启用了 `diagnostics-prometheus` 的 `docker-prometheus-smoke` QA 场景，验证未经身份验证的抓取会被拒绝，然后检查经过身份验证的抓取包含对发布至关重要的指标系列，且不包含提示内容、响应内容、原始诊断标识符、身份验证令牌或本地路径。

要连续运行两个可观测性冒烟测试，请使用：

```bash
pnpm qa:observability:smoke
```

可观测性 QA 仅限于源代码检出。npm tarball 故意省略了 QA Lab，因此打包 Docker 发布流水线不会运行 `qa` 命令。在更改诊断工具时，请从已构建的源代码检出中使用 `pnpm qa:otel:smoke`、`pnpm qa:prometheus:smoke` 或 `pnpm qa:observability:smoke`。

要运行传输真实的 Matrix 冒烟测试流水线，请运行：

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

此通道的完整 CLI 参考、配置文件/场景目录、环境变量和工件布局位于 [Matrix QA](CLIMatrix/en/concepts/qa-matrixDockerMatrix)。概览：它在 Docker 中配置一个一次性的 Tuwunel 家庭服务器，注册临时的驱动程序/SUT/观察者用户，在限定于该传输的子 QA 网关内运行真实的 Matrix 插件（无 `qa-channel`），然后在 `.artifacts/qa-e2e/matrix-<timestamp>/` 下写入 Markdown 报告、JSON 摘要、观察事件工件和组合输出日志。

这些场景覆盖了单元测试无法端到端证明的传输行为：提及门控、允许机器人策略、允许列表、顶级和线程回复、私信路由、反应处理、入站编辑抑制、重启重放去重、家庭服务器中断恢复、批准元数据传递、媒体处理以及 Matrix E2EE 引导/恢复/验证流程。E2EE CLI 配置文件还在检查网关回复之前，通过同一次性家庭服务器驱动 MatrixCLI`openclaw matrix encryption setup` 和验证命令。

Discord 也有仅限 Mantis 的用于错误复现的可选场景。使用 Discord`--scenario discord-status-reactions-tool-only` 获取显式状态反应时间线，或使用 `--scenario discord-thread-reply-filepath-attachment`Discord 创建真实的 Discord 线程并验证 `message.thread-reply` 是否保留了 `filePath`DiscordDiscord 附件。这些场景不包含在默认的实时 Discord 通道中，因为它们是复现探测的前后检查，而非广泛的冒烟测试覆盖。当 QA 环境中配置了 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` 或 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64`Discord 时，线程附件 Mantis 工作流还可以添加已登录的 Discord Web 见证视频。该查看器配置文件仅用于视觉捕获；通过/失败决定仍来自 Discord REST 预言机。

CI 在 `.github/workflows/qa-live-transports-convex.yml` 中使用相同的命令界面。预定和默认手动运行使用具有实时前沿凭据的快速 Matrix 配置文件 Matrix、`--fast` 和 `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS=3000`。手动 `matrix_profile=all` 会分散到五个配置文件分片中，以便详尽的目录可以并行运行，同时每个分片保留一个构件目录。

对于传输真实的 Telegram、Discord 和 Slack 冒烟通道：

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
pnpm openclaw qa slack
```

它们以预先存在的真实渠道为目标，该渠道包含两个机器人（驱动程序 + SUT）。所需的环境变量、场景列表、输出构件和 Convex 凭据池记录在下方的 [Telegram、Discord 和 Slack QA 参考](#telegram-discord-and-slack-qa-reference) 中。

要进行带有 VNC 救援功能的完整 Slack 桌面 VM 运行，请运行：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

该命令租用一台 Crabbox 桌面/浏览器机器，在虚拟机内运行 Slack 实时通道，
在 VNC 浏览器中打开 Slack Web，捕获桌面，并在视频捕获可用时将 `slack-qa/`、`slack-desktop-smoke.png` 和 `slack-desktop-smoke.mp4`
复制回 Mantis 工件目录。Crabbox 桌面/浏览器租约预先提供了捕获工具和浏览器/原生构建辅助包，因此场景应仅在较旧的租约上安装后备项。Mantis 在 `mantis-slack-desktop-smoke-report.md` 中报告总时间和各阶段时间，因此慢速运行可以显示时间是否花费在租约预热、凭证获取、远程设置或工件复制上。通过 VNC 手动登录 Slack Web 后，复用 `--lease-id <cbx_...>`；复用的租约还能保持 Crabbox 的 pnpm 存储缓存处于热状态。默认 `--hydrate-mode source` 从源代码检出进行验证，并在虚拟机内运行安装/构建。仅当复用的远程工作空间已经拥有 `node_modules` 和已构建的 `dist/` 时，才使用 `--hydrate-mode prehydrated`；该模式跳过昂贵的安装/构建步骤，并在工作空间未就绪时以失败告终。使用 `--gateway-setup` 时，Mantis 会在虚拟机内的端口 `38973` 上保留一个持久的 OpenClaw Slack 网关运行；如果不使用它，该命令将运行正常的机器人对机器人 Slack QA 通道，并在捕获工件后退出。

要使用桌面证据证明原生 Slack 审批 UI，请运行 Mantis 审批检查点模式：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --approval-checkpoints \
  --credential-source convex \
  --credential-role maintainer
```

此模式与 `--gateway-setup` 互斥。它运行 Slack 审批场景，拒绝非审批场景 ID，在每个待定和已解决的审批状态处等待，将观察到的 Slack API 消息渲染为 `approval-checkpoints/<scenario>-pending.png` 和 `approval-checkpoints/<scenario>-resolved.png`，然后如果任何检查点、消息证据、确认或渲染的屏幕截图缺失或为空，则失败。冷 CI 租约仍可能在 `slack-desktop-smoke.png` 中显示 Slack 登录；审批检查点图像是该通道的视觉证明。

操作员检查清单、GitHub 工作流调度命令、证据注释契约、hydration 模式决策表、计时解释和失败处理步骤位于 [Mantis Slack Desktop Runbook](/zh/concepts/mantis-slack-desktop-runbook) 中。

对于代理/CV 风格的桌面任务，请运行：

```bash
pnpm openclaw qa mantis visual-task \
  --browser-url https://example.net \
  --expect-text "Example Domain" \
  --vision-model openai/gpt-5.5
```

`visual-task` 租用或重用 Crabbox 桌面/浏览器机器，启动 `crabbox record --while`，通过嵌套的 `visual-driver` 驱动可见浏览器，捕获 `visual-task.png`，在选择 `--vision-mode image-describe` 时针对屏幕截图运行 `openclaw infer image describe`，并写入 `visual-task.mp4`、`mantis-visual-task-summary.json`、`mantis-visual-task-driver-result.json` 和 `mantis-visual-task-report.md`。当设置 `--expect-text` 时，视觉提示会询问结构化的 JSON 判定结果，并且仅在模型报告肯定的可见证据时才通过；仅引用目标文本的否定响应将导致断言失败。使用 `--vision-mode metadata` 进行无模型的冒烟测试，在不调用图像理解提供商的情况下验证桌面、浏览器、屏幕截图和视频管道。录制是 `visual-task` 的必需产物；如果 Crabbox 未录制任何非空的 `visual-task.mp4`，即使视觉驱动程序通过，任务也会失败。失败时，Mantis 会保留用于 VNC 的租约，除非任务已经通过且未设置 `--keep-lease`。

在使用共享的实时凭据之前，请运行：

```bash
pnpm openclaw qa credentials doctor
```

The doctor 会检查 Convex broker 环境变量，验证端点设置，并在存在维护者密钥时验证 admin/list 的可达性。它仅报告密钥的设置/缺失状态。

## 实时传输覆盖范围

实时传输通道共享一个合约，而不是各自发明自己的场景列表形状。`qa-channel` 是广泛的综合产品行为套件，不属于实时传输覆盖范围矩阵。

| 通道     | Canary | 提及门控 | Bot-to-bot | 允许列表阻止 | 顶层回复 | 重启恢复 | Thread follow-up | Thread isolation | Reaction observation | Help command | Native command registration |
| -------- | ------ | -------- | ---------- | ------------ | -------- | -------- | ---------------- | ---------------- | -------------------- | ------------ | --------------------------- |
| Matrix   | x      | x        | x          | x            | x        | x        | x                | x                | x                    |              |                             |
| Telegram | x      | x        | x          |              |          |          |                  |                  |                      | x            |                             |
| Discord  | x      | x        | x          |              |          |          |                  |                  |                      |              | x                           |
| Slack    | x      | x        | x          | x            | x        | x        | x                | x                |                      |              |                             |

这将 `qa-channel` 保留为广泛的产品行为套件，而 Matrix、Telegram 和未来的实时传输共享一个明确的传输合约检查清单。

对于不将 Linux 引入 QA 路径的一次性 Docker VM 通道，请运行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

这会启动一个新的 Multipass 客户机，安装依赖项，在客户机内部构建 OpenClaw，运行 `qa suite`，然后将常规 QA 报告和摘要复制回主机上的 `.artifacts/qa-e2e/...` 中。它复用了与主机上 `qa suite` 相同的场景选择行为。默认情况下，主机和 Multipass 套件运行会通过隔离的 gateway worker 并行执行多个选定的场景。`qa-channel` 默认并发数为 4，并受所选场景数量的限制。使用 `--concurrency <count>` 调整 worker 数量，或使用 `--concurrency 1` 进行串行执行。使用 `--pack personal-agent` 运行个人助手基准测试包。包选择器通过重复的 `--scenario` 标志进行累加：显式场景先运行，然后按包顺序运行包场景并去除重复项。当自定义 QA 运行器已提供 OpenTelemetry 收集器设置并希望同时选择 OpenTelemetry 和 Prometheus 诊断冒烟测试场景时，请使用 `--pack observability`。当任何场景失败时，该命令以非零状态退出。当你需要生成产物而不希望退出代码表示失败时，请使用 `--allow-failures`。实时运行会转发对客户机实用的受支持 QA 认证输入：基于环境变量的提供商密钥、QA live 提供商配置路径，以及（如果存在）`CODEX_HOME`。请将 `--output-dir` 保留在代码库根目录下，以便客户机可以通过挂载的工作区写回数据。

## Telegram、Discord 和 Slack QA 参考

Matrix 拥有[专属页面](/zh/concepts/qa-matrix)，因为其场景数量以及基于 Docker 的主服务器配置。Telegram、Discord 和 Slack 较小——每个只有少量场景，没有配置文件系统，针对的是预先存在的真实频道——因此它们的参考内容位于此处。

### 共享 CLI 标志

这些通道通过 `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` 注册并接受相同的标志：

| 标志                                  | 默认值                                                          | 描述                                                                          |
| ------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `--scenario <id>`                     | -                                                               | 仅运行此场景。可重复。                                                        |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord,slack}-<timestamp>` | 写入报告/摘要/观察到的消息和输出日志的位置。相对路径基于 `--repo-root` 解析。 |
| `--repo-root <path>`                  | `process.cwd()`                                                 | 从中性 cwd 调用时的存储库根目录。                                             |
| `--sut-account <id>`                  | `sut`                                                           | QA 网关配置内的临时帐户 ID。                                                  |
| `--provider-mode <mode>`              | `live-frontier`                                                 | `mock-openai` 或 `live-frontier`（旧版 `live-openai` 仍然有效）。             |
| `--model <ref>` / `--alt-model <ref>` | 提供商默认值                                                    | 主要/备用 模型 引用。                                                         |
| `--fast`                              | 关闭                                                            | 提供商快速模式（如果支持）。                                                  |
| `--credential-source <env\|convex>`   | `env`                                                           | 请参阅 [Convex 凭证池](#convex-credential-pool)。                             |
| `--credential-role <maintainer\|ci>`  | 在 CI 中为 `ci`，否则为 `maintainer`                            | 当 `--credential-source convex` 时使用的角色。                                |

每个车道在任何失败场景下均以非零退出。`--allow-failures` 写入产物而不设置失败的退出代码。

### Telegram QA

```bash
pnpm openclaw qa telegram
```

针对一个真实的私有 Telegram 群组，该群组有两个不同的机器人（驱动程序 + SUT）。SUT 机器人必须具有 Telegram 用户名；当两个机器人在 TelegramTelegram`@BotFather` 中都启用了 **机器人对机器人通信模式** 时，机器人对机器人观察效果最佳。

当 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` - 数字聊天 ID（字符串）。
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

可选：

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` 将消息正文保留在观察到的消息产物中（默认为编辑）。

场景 (`extensions/qa-lab/src/live-transports/telegram/telegram-live.runtime.ts`)：

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

隐式默认集始终涵盖 canary、提及门控、原生命令回复、命令寻址以及机器人到机器人的群组回复。`mock-openai` 默认值还包括确定性回复链和最终消息流式传输检查。`telegram-current-session-status-tool` 仍然是可选加入的，因为它仅在紧跟 canary 之后进行线程处理时才稳定，而不是在任意原生命令回复之后。使用 `pnpm openclaw qa telegram --list-scenarios --provider-mode mock-openai` 打印当前的默认/可选拆分以及回归引用。

输出产物：

- `telegram-qa-report.md`
- `telegram-qa-summary.json` - 包括从 canary 开始的每次回复的 RTT（驱动程序发送 → 观察到的 SUT 回复）。
- `telegram-qa-observed-messages.json` - 除非设置 `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`，否则正文已编辑。

软件包 RTT 比较使用相同的 Telegram 凭证合约，同时将其 RTT 示例控制保留在 RTT 测试线束路径上：

```bash
pnpm rtt openclaw@beta \
  --credential-source convex \
  --credential-role maintainer \
  --samples 20 \
  --sample-timeout-ms 30000
```

当设置 `--credential-source convex` 时，RTT Docker 包装器会租用一个 `kind: "telegram"` 凭证，将租用的群组/驱动程序/SUT 机器人环境导出到已安装软件包的运行中，发送租约心跳，并在关闭时释放它。`--samples` 和 `--sample-timeout-ms` 仍然馈送 `OPENCLAW_NPM_TELEGRAM_WARM_SAMPLES` 和 `OPENCLAW_NPM_TELEGRAM_SAMPLE_TIMEOUT_MS`，因此 `result.json` 在基于环境的 RTT 运行和基于 Convex 的 RTT 运行之间仍然具有可比性。

### Discord QA

```bash
pnpm openclaw qa discord
```

针对一个真实的私有 Discord 频道，该频道有两个机器人：一个由测试工具控制的驱动机器人，和一个由子 OpenClaw 网关通过捆绑的 Discord 插件启动的 SUT 机器人。验证频道提及处理，即 SUT 机器人已向 Discord 注册了原生的 DiscordOpenClawDiscord`/help`Discord 命令，以及选择加入的 Mantis 证据场景。

运行 `--credential-source env` 时所需的环境变量：

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID`Discord - 必须与 Discord 返回的 SUT 机器人用户 ID 匹配（否则跑道会快速失败）。

可选：

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` 将消息正文保留在已观察消息的产物中。
- `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID` 选择 `discord-voice-autojoin` 的语音/舞台频道；如果没有设置，场景将选择 SUT 机器人看到的第一个语音/舞台频道。

场景 (`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`)：

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-voice-autojoin` - 选择加入的语音场景。独立运行，启用 `channels.discord.voice.autoJoin`DiscordDiscord，并验证 SUT 机器人当前的 Discord 语音状态是否为目标语音/舞台频道。Convex Discord 凭据可能包含可选的 `voiceChannelId`；否则运行程序将在服务器中发现第一个可见的语音/舞台频道。
- `discord-status-reactions-tool-only` - 选择加入的 Mantis 场景。独立运行，因为它通过 `messages.statusReactions.enabled=true` 将 SUT 切换为始终开启、仅工具模式的服务器回复，然后捕获 REST 反应时间轴以及 HTML/PNG 视觉产物。Mantis 前/后报告还会将场景提供的 MP4 产物保存为 `baseline.mp4` 和 `candidate.mp4`。

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

输出产物：

- `discord-qa-report.md`
- `discord-qa-summary.json`
- `discord-qa-observed-messages.json` - 正文已编辑，除非 `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`。
- 当状态反应场景运行时 `discord-qa-reaction-timelines.json` 和 `discord-status-reactions-tool-only-timeline.png`。

### Slack QA

```bash
pnpm openclaw qa slack
```

针对一个真实的私有 Slack 渠道，使用两个不同的机器人：一个由测试工具控制的驱动机器人，和一个由子 OpenClaw 网关通过捆绑的 Slack 插件启动的被测机器人。

当 `--credential-source env` 时需要的环境变量：

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`

可选：

- `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1` 在观察到的消息构件中保留消息正文。
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` 为 Mantis 启用可视化审批
  检查点。运行器会写入 `<scenario>.pending.json` 和
  `<scenario>.resolved.json`，然后等待匹配的 `.ack.json` 文件。
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_TIMEOUT_MS` 覆盖检查点
  确认超时。默认值为 `120000`。

场景 (`extensions/qa-lab/src/live-transports/slack/slack-live.runtime.ts`)：

- `slack-canary`
- `slack-mention-gating`
- `slack-allowlist-block`
- `slack-top-level-reply-shape`
- `slack-restart-resume`
- `slack-thread-follow-up`
- `slack-thread-isolation`
- `slack-approval-exec-native` - 可选的原生 Slack 执行审批场景。
  通过网关请求执行审批，验证 Slack 消息具有
  原生审批按钮，进行解决，并验证已解决的 Slack 更新。
- `slack-approval-plugin-native` - 可选的原生 Slack 插件审批场景。
  同时启用执行和插件审批转发，以便插件事件
  不会因执行审批路由而被抑制，然后验证相同的待处理/已解决
  原生 Slack UI 路径。

输出构件：

- `slack-qa-report.md`
- `slack-qa-summary.json`
- `slack-qa-observed-messages.json` - 正文已编辑，除非 `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1`。
- `approval-checkpoints/` - 仅当 Mantis 设置
  `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` 时；包含检查点 JSON、
  确认 JSON 以及待处理/已解决的截图。

#### 设置 Slack 工作区

该通道需要一个工作区中的两个不同的 Slack 应用，以及两个机器人都加入的渠道：

- `channelId` - 两个机器人都受邀加入的渠道的 `Cxxxxxxxxxx` id。使用专用渠道；该通道在每次运行时都会发帖。
- `driverBotToken` - **驱动程序** 应用的机器人令牌 (`xoxb-...`)。
- `sutBotToken` - **SUT** 应用的机器人令牌 (`xoxb-...`)，它必须是与驱动程序分开的 Slack 应用，以便其机器人用户 id 保持唯一。
- `sutAppToken` - 具有 `connections:write` 的 SUT 应用的应用级令牌 (`xapp-...`)，由 Socket Mode 使用，以便 SUT 应用可以接收事件。

比起重用生产工作区，首选专门用于 QA 的 Slack 工作区。

下面的 SUT 清单有意将捆绑的 Slack 插件的生产安装 (`extensions/slack/src/setup-shared.ts:10`) 限制为实时 Slack QA 套件所涵盖的权限和事件。关于用户看到的生产渠道设置，请参阅 [Slack 渠道 quick setup](/zh/channels/slack#quick-setup)；QA 驱动程序/SUT 对是有意分开的，因为该通道需要一个工作区中的两个不同的机器人用户 id。

**1. 创建驱动程序应用**

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

复制 _Bot User OAuth Token_ (`xoxb-...`) - 即成为 `driverBotToken`。驱动程序只需要发布消息并标识自己；不需要事件，也不需要 Socket Mode。

**2. 创建 SUT 应用**

在同一工作区中重复 _Create New App → From a manifest_。此 QA 应用有意使用捆绑的 Slack 插件的生产清单的一个更窄版本 (`extensions/slack/src/setup-shared.ts:10`)：省略了反应作用域和事件，因为实时 Slack QA 套件尚未涵盖反应处理。

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

- _Install to Workspace_ → 复制 _Bot User OAuth Token_ → 该值变为 `sutBotToken`。
- _Basic Information → App-Level Tokens → Generate Token and Scopes_ → 添加作用域 `connections:write` → 保存 → 复制 `xapp-...` 值 → 该值变为 `sutAppToken`。

通过在每个令牌上调用 `auth.test` 来验证这两个机器人具有不同的用户 ID。运行时通过用户 ID 区分驱动程序和 SUT；为两者复用同一个应用将立即导致提及门控失败。

**3. 创建渠道**

在 QA 工作区中，创建一个渠道（例如 `#openclaw-qa`）并从渠道内部邀请这两个机器人：

```
/invite @OpenClaw QA Driver
/invite @OpenClaw QA SUT
```

从 _channel info → About → Channel ID_ 复制 `Cxxxxxxxxxx` id - 该值变为 `channelId`。公开渠道即可；如果您使用私有渠道，两个应用都已经拥有 `groups:history`，因此测试线束的历史记录读取仍然会成功。

**4. 注册凭据**

有两种选项。使用环境变量进行单机调试（设置四个 `OPENCLAW_QA_SLACK_*` 变量并传递 `--credential-source env`），或者填充共享的 Convex 池，以便 CI 和其他维护者可以租用它们。

对于 Convex 池，将这四个字段写入一个 JSON 文件：

```json
{
  "channelId": "Cxxxxxxxxxx",
  "driverBotToken": "xoxb-...",
  "sutBotToken": "xoxb-...",
  "sutAppToken": "xapp-..."
}
```

在您的 shell 中导出 `OPENCLAW_QA_CONVEX_SITE_URL` 和 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 后，注册并验证：

```bash
pnpm openclaw qa credentials add \
  --kind slack \
  --payload-file slack-creds.json \
  --note "QA Slack pool seed"

pnpm openclaw qa credentials list --kind slack --status all --json
```

预期会有 `count: 1`、`status: "active"`，没有 `lease` 字段。

**5. 端到端验证**

在本地运行通道以确认两个机器人可以通过代理相互通信：

```bash
pnpm openclaw qa slack \
  --credential-source convex \
  --credential-role maintainer \
  --output-dir .artifacts/qa-e2e/slack-local
```

一次顺利的运行在 30 秒内即可完成，并且 `slack-qa-report.md` 显示 `slack-canary` 和 `slack-mention-gating` 的状态均为 `pass`。如果 lane 卡住约 90 秒并以 `Convex credential pool exhausted for kind "slack"` 退出，则可能是池为空或每一行都被租用——`qa credentials list --kind slack --status all --json` 会告诉你是哪种情况。

### Convex 凭证池

Telegram、Discord、Slack 和 WhatsApp lane 可以从共享的 Convex 池中租用凭证，而不是读取上述环境变量。传递 `--credential-source convex`（或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）；QA Lab 会获取一个独占租约，在运行期间对其发送心跳，并在关闭时释放它。池类型包括 `"telegram"`、`"discord"`、`"slack"` 和 `"whatsapp"`。

代理在 `admin/add` 上验证的负载形状：

- Telegram (`kind: "telegram"`)：`{ groupId: string, driverToken: string, sutToken: string }` - `groupId` 必须是数字聊天 ID 字符串。
- Telegram 真实用户 (`kind: "telegram-user"`)：`{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }` - 仅限 Mantis Telegram Desktop 凭证。通用 QA Lab lane 不得获取此类凭证。
- Discord (`kind: "discord"`)：`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`。
- WhatsApp (`kind: "whatsapp"`)：`{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }` - 电话号码必须是不同的 E.164 字符串。

Mantis Telegram Desktop 凭证工作流为 TDLib CLI 驱动程序和 Telegram Desktop 见证持有一个独占的 Convex
`telegram-user` 租约，然后在发布凭证后将其释放。

当 PR 需要确定性的视觉差异时，在 Telegram 格式化程序或传递层发生变化期间，Mantis 可以在 `main`Telegram 和 PR head 上使用相同的模型模拟回复。捕获默认值针对 PR 评论进行了调整：标准 Crabbox 类、24fps 桌面录制、24fps 动态 GIF 和 1920px 预览宽度。Before/after 评论应发布一个仅包含预期 GIF 的清晰包。

Slack 渠道也可以使用该池。Slack 载荷形状检查目前位于 Slack QA 运行器中，而不是代理中；请使用 SlackSlackSlack`{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`Slack，并提供类似 `Cxxxxxxxxxx`Slack 的 Slack 渠道 ID。有关应用程序和范围设置，请参阅 [Setting up the Slack workspace](#setting-up-the-slack-workspace)。

操作环境变量和 Convex 代理端点合约位于 [Testing → Shared Telegram credentials via Convex](Telegram/en/help/testing#shared-telegram-credentials-via-convex-v1) 中（该部分名称早于多渠道池；租约语义在各类别中共享）。

## Repo-backed seeds

Seed 资产位于 `qa/` 中：

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

这些内容故意放在 git 中，以便人员和代理都能看到 QA 计划。

`qa-lab` 应保持为通用的 markdown 运行器。每个场景 markdown 文件是一次测试运行的单一事实来源，应定义：

- 场景元数据
- 可选的 category、capability、lane 和 risk 元数据
- 文档和代码引用
- 可选的插件要求
- 可选的 Gateway 配置补丁
- 可执行的 `qa-flow`

支持 `qa-flow`Gateway(网关) 的可重用运行时表面允许保持通用和跨领域。例如，markdown 场景可以将传输端辅助程序与浏览器端辅助程序结合起来，通过 Gateway `browser.request` 接缝驱动嵌入式控制 UI，而无需添加特殊情况运行器。

场景文件应按产品能力而非源代码树文件夹进行分组。当文件移动时，请保持场景 ID 的稳定性；使用 `docsRefs` 和 `codeRefs` 以便于实现的追溯。

基准列表应保持足够广泛，以涵盖：

- 私信和渠道聊天
- 线索行为
- 消息操作生命周期
- cron 回调
- 记忆回顾
- 模型切换
- 子代理交接
- 读取仓库和读取文档
- 一项小型构建任务，例如 Lobster Invaders

## 提供商模拟通道

`qa suite` 有两个本地提供商模拟通道：

- `mock-openai` 是具备场景感知能力的 OpenClaw 模拟。它仍然是基于仓库的 QA 和对等门的默认确定性模拟通道。
- `aimock` 启动一个由 AIMock 支持的提供商服务器，用于实验性协议、装置、记录/重放和混沌覆盖。它是补充性的，不会替换 `mock-openai` 场景分发器。

提供商通道的实现位于 `extensions/qa-lab/src/providers/` 之下。每个提供商拥有其默认值、本地服务器启动、网关模型配置、身份配置文件暂存需求以及实时/模拟功能标志。共享套件和网关代码应通过提供商注册表进行路由，而不是根据提供商名称进行分支判断。

## 传输适配器

`qa-lab` 拥有用于 Markdown QA 场景的通用传输接缝。`qa-channel` 是该接缝上的第一个适配器，但设计目标更广泛：未来的真实或合成渠道应接入同一个套件运行器，而不是添加特定于传输的 QA 运行器。

在架构层面，划分如下：

- `qa-lab` 负责通用场景执行、工作器并发、产物写入和报告。
- 传输适配器负责网关配置、就绪状态、入站和出站观察、传输操作以及规范化的传输状态。
- `qa/scenarios/` 下的 Markdown 场景文件定义了测试运行；`qa-lab` 提供了执行它们的可重用运行时接口。

### 添加渠道

向 Markdown QA 系统添加渠道恰好需要两件事：

1. 用于渠道的传输适配器。
2. 用于演练渠道契约的场景包。

当共享 `qa-lab` 主机可以拥有该流程时，不要添加新的顶级 QA 命令根节点。

`qa-lab` 拥有共享主机机制：

- `openclaw qa` 命令根节点
- 套件启动和拆除
- 工作线程并发
- 产物写入
- 报告生成
- 场景执行
- 旧版 `qa-channel` 场景的兼容性别名

运行器插件拥有传输契约：

- `openclaw qa <runner>` 如何挂载在共享 `qa` 根节点下
- 如何为该传输配置网关
- 如何检查就绪状态
- 如何注入入站事件
- 如何观察出站消息
- 如何公开脚本和标准化传输状态
- 如何执行传输支持的操作
- 如何处理传输特定的重置或清理

采用新渠道的最低门槛：

1. 保持 `qa-lab` 作为共享 `qa` 根节点的拥有者。
2. 在共享 `qa-lab` 主机接缝上实现传输运行器。
3. 将传输特定的机制保留在运行器插件或渠道线束内部。
4. 将运行器挂载为 `openclaw qa <runner>`，而不是注册竞争的根命令。运行器插件应在 `openclaw.plugin.json` 中声明 `qaRunners`，并从 `runtime-api.ts` 导出匹配的 `qaRunnerCliRegistrations` 数组。保持 `runtime-api.ts` 轻量；延迟 CLI 和运行器执行应保留在单独的入口点之后。
5. 在主题化 `qa/scenarios/` 目录下编写或调整 markdown 场景。
6. 对新场景使用通用场景辅助函数。
7. 除非仓库正在进行有意迁移，否则请保持现有兼容性别名正常工作。

决策规则是严格的：

- 如果行为可以在 `qa-lab` 中表达一次，则将其放在 `qa-lab` 中。
- 如果行为依赖于单个渠道传输，请将其保留在该运行器插件或插件线束中。
- 如果某个场景需要多个渠道都能使用的新功能，请在 `suite.ts` 中添加一个通用辅助程序，而不是特定于渠道的分支。
- 如果某个行为仅对一种传输方式有意义，请保持该场景特定于该传输方式，并在场景协议中明确说明。

### 场景辅助程序名称

新场景首选的通用辅助程序：

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

兼容性别名仍可用于现有场景 - `waitForQaChannelReady`、`waitForOutboundMessage`、`waitForNoOutbound`、`formatConversationTranscript`、`resetBus` - 但新场景的编写应使用通用名称。这些别名的存在是为了避免一次性迁移，而非作为未来的模型。

## 报告

`qa-lab` 从观察到的总线时间线导出 Markdown 协议报告。
该报告应回答：

- 什么起作用了
- 什么失败了
- 什么保持受阻状态
- 值得添加哪些后续场景

要获取可用场景的清单（在估算后续工作量或连接新传输时很有用），请运行 `pnpm openclaw qa coverage`（添加 `--json` 以获取机器可读的输出）。

对于角色和风格检查，请在多个实时模型引用上运行相同的场景并编写一份评估的 Markdown 报告：

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.5,thinking=medium,fast \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-7,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.5,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-7,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

该命令运行本地 QA 网关子进程，而不是 Docker。角色评估场景应通过 Docker`SOUL.md` 设置角色，然后运行普通的用户回合，例如聊天、工作区帮助和小文件任务。不应告知候选模型它正在接受评估。该命令会保留每个完整的对话记录，记录基本的运行统计信息，然后请求审判模型在支持的情况下使用带有 `xhigh` 推理的快速模式，根据自然度、氛围和幽默感对运行进行排名。在比较提供商时使用 `--blind-judge-models`：审判提示词仍然会获取每个对话记录和运行状态，但候选引用会被替换为诸如 `candidate-01` 之类的中性标签；报告会在解析后将排名映射回真实的引用。候选运行默认使用 `high` 思维，GPT-5.5 使用 `medium`，支持它的旧版 OpenAI 评估引用使用 `xhigh`OpenAI。使用 `--model provider/model,thinking=<level>` 内联覆盖特定的候选模型。`--thinking <level>` 仍然设置全局回退，保留较旧的 `--model-thinking <provider/model=level>`OpenAI 形式以保持兼容性。OpenAI 候选引用默认使用快速模式，因此只要提供商支持，就会使用优先处理。当单个候选模型或审判模型需要覆盖时，内联添加 `,fast`、`,no-fast` 或 `,fast=false`。仅当您想强制为每个候选模型开启快速模式时，才传递 `--fast`。候选和审判的持续时间会记录在报告中以进行基准分析，但审判提示词明确说明不要按速度排名。候选和审判模型运行默认并发数均为 16。当提供商限制或本地网关压力导致运行过于嘈杂时，降低 `--concurrency` 或 `--judge-concurrency`。当没有传递候选 `--model` 时，角色评估默认使用 `openai/gpt-5.5`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-7`、`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、`moonshot/kimi-k2.5` 和 `google/gemini-3.1-pro-preview`（当没有传递 `--model` 时）。当没有传递 `--judge-model` 时，审判模型默认使用 `openai/gpt-5.5,thinking=xhigh,fast` 和 `anthropic/claude-opus-4-7,thinking=high`。

## 相关文档

- [Matrix QA](/zh/concepts/qa-matrix)
- [个人智能体基准包](/zh/concepts/personal-agent-benchmark-pack)
- [QA 频道](/zh/channels/qa-channel)
- [测试](/zh/help/testing)
- [仪表板](/zh/web/dashboard)
