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

- `extensions/qa-channel`：包含私信、渠道、主题、反应、编辑和删除表面的综合消息渠道。
- `extensions/qa-lab`：用于观察对话记录、注入入站消息和导出 Markdown 报告的调试器 UI 和 QA 总线。
- `extensions/qa-matrix`，未来的运行器插件：在子 QA 网关内驱动真实渠道的实时传输适配器。
- `qa/`：用于启动任务和基准 QA 场景的仓库支持的种子资产。

## 命令表面

每个 QA 流程都在 `pnpm openclaw qa <subcommand>` 下运行。许多都有 `pnpm qa:*` 脚本别名；支持这两种形式。

| 命令                                                | 用途                                                                                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | 打包的 QA 自检；写入 Markdown 报告。                                                                                                               |
| `qa suite`                                          | 针对 QA 网关通道运行仓库支持的场景。别名：`pnpm openclaw qa suite --runner multipass` 用于一次性 Linux 虚拟机。                                    |
| `qa coverage`                                       | 打印 markdown 场景覆盖清单（`--json` 用于机器输出）。                                                                                              |
| `qa parity-report`                                  | 比较两个 `qa-suite-summary.json` 文件并写入智能奇偶校验报告。                                                                                      |
| `qa character-eval`                                 | 跨多个实时模型运行角色 QA 场景并生成评估报告。请参阅 [报告](#reporting)。                                                                          |
| `qa manual`                                         | 针对选定的提供商/模型通道运行一次性提示。                                                                                                          |
| `qa ui`                                             | 启动 QA 调试器 UI 和本地 QA 总线（别名：`pnpm qa:lab:ui`）。                                                                                       |
| `qa docker-build-image`                             | 构建预制的 QA Docker 镜像。                                                                                                                        |
| `qa docker-scaffold`                                | 为 QA 仪表板 + 网关通道编写 docker-compose 脚手架。                                                                                                |
| `qa up`                                             | 构建 QA 站点，启动 Docker 支持的堆栈，打印 URL（别名：`pnpm qa:lab:up`；`:fast` 变体添加 `--use-prebuilt-image --bind-ui-dist --skip-ui-build`）。 |
| `qa aimock`                                         | 仅启动 AIMock 提供商服务器。                                                                                                                       |
| `qa mock-openai`                                    | 仅启动支持场景的 `mock-openai` 提供商服务器。                                                                                                      |
| `qa credentials doctor` / `add` / `list` / `remove` | 管理共享的 Convex 凭证池。                                                                                                                         |
| `qa matrix`                                         | 针对一次性 Tuwunel 主服务器的实时传输通道。请参阅 [Matrix QA](/zh/concepts/qa-matrix)。                                                            |
| `qa telegram`                                       | 针对真实私有 Telegram 群组的实时传输通道。                                                                                                         |
| `qa discord`                                        | 针对真实私有 Discord 公会频道的实时传输通道。                                                                                                      |

## 操作员流程

当前的 QA 操作员流程是一个双面板 QA 站点：

- 左侧：带有代理的 Gateway(网关) 仪表板（控制 UI）。
- 右侧：QA Lab，显示类似 Slack 的记录和场景计划。

运行方式如下：

```bash
pnpm qa:lab:up
```

这将构建 QA 站点，启动 Docker 支持的网关通道，并暴露
QA Lab 页面，操作员或自动化循环可以在该页面上为代理分配 QA
任务，观察真实的渠道行为，并记录哪些内容有效、失败或
保持阻塞状态。

为了在不每次重新构建 Docker 镜像的情况下更快地迭代 QA Lab UI，
请使用绑定挂载的 QA Lab 包启动堆栈：

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` 保持 Docker 服务使用预构建的镜像，并将
`extensions/qa-lab/web/dist` 绑定挂载到 `qa-lab` 容器中。`qa:lab:watch`
会在更改时重建该包，当 QA Lab 资源哈希更改时，浏览器会自动重新加载。

要进行本地 OpenTelemetry 跟踪冒烟测试，请运行：

```bash
pnpm qa:otel:smoke
```

该脚本启动一个本地 OTLP/HTTP 追踪接收器，运行启用了 `diagnostics-otel` 插件的 `otel-trace-smoke` QA 场景，然后解码导出的 protobuf 跨度并断言关键发布结构：`openclaw.run`、`openclaw.harness.run`、`openclaw.model.call`、`openclaw.context.assembled` 和 `openclaw.message.delivery` 必须存在；模型调用在成功的轮次中不得导出 `StreamAbandoned`；原始诊断 ID 和 `openclaw.content.*` 属性必须排除在追踪之外。它会在 QA 测试套件工件旁边写入 `otel-smoke-summary.json`。

可观测性 QA 仅限源码检出使用。npm 压缩包故意省略了 QA Lab，因此打包 Docker 发布流水线不会运行 `qa` 命令。在更改诊断检测时，请从已构建的源码检出中使用 `pnpm qa:otel:smoke`。

对于传输真实的 Matrix 冒烟流水线，运行：

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

该流水线的完整 CLI 参考、配置文件/场景目录、环境变量和工件布局位于 [Matrix QA](/zh/concepts/qa-matrix)。概览：它在 Docker 中配置一个一次性的 Tuwunel 主服务器，注册临时的驱动/SUT/观察者用户，在作用域限定为该传输的子 QA 网关内运行真实的 Matrix 插件（无 `qa-channel`），然后在 `.artifacts/qa-e2e/matrix-<timestamp>/` 下写入 Markdown 报告、JSON 摘要、观察事件工件和组合输出日志。

对于传输真实的 Telegram 和 Discord 冒烟流水线：

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
```

两者都针对一个具有两个机器人（驱动 + SUT）的预先存在的真实渠道。所需的环境变量、场景列表、输出工件和 Convex 凭据池记录在下面的 [Telegram 和 Discord QA 参考](#telegram-and-discord-qa-reference) 中。

在使用池化的实时凭据之前，运行：

```bash
pnpm openclaw qa credentials doctor
```

医生检查 Convex 代理环境，验证端点设置，并在存在维护者密钥时验证管理员/列表的可达性。它仅报告密钥的已设置/缺失状态。

## 实时传输覆盖

实时传输通道共享一个约定，而不是各自发明自己的场景列表形状。`qa-channel` 是广泛的产品行为综合套件，不属于实时传输覆盖范围矩阵的一部分。

| 通道     | 金丝雀 | 提及限制 | 允许列表阻止 | 顶级回复 | 重启恢复 | 线程跟进 | 线程隔离 | 反应观察 | 帮助命令 | 原生命令注册 |
| -------- | ------ | -------- | ------------ | -------- | -------- | -------- | -------- | -------- | -------- | ------------ |
| Matrix   | x      | x        | x            | x        | x        | x        | x        | x        |          |              |
| Telegram | x      | x        |              |          |          |          |          |          | x        |              |
| Discord  | x      | x        |              |          |          |          |          |          |          | x            |

这使得 `qa-channel` 保留为广泛的产品行为套件，同时 Matrix、Telegram 和未来的实时传输共享一个明确的传输约定检查清单。

对于一次性 Linux 虚拟机通道，而不在 QA 路径中引入 Docker，请运行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

这将启动一个新的 Multipass 客户机，安装依赖项，在客户机内部构建 OpenClaw，运行 `qa suite`，然后将正常的 QA 报告和摘要复制回主机上的 `.artifacts/qa-e2e/...`。它重用与主机上的 `qa suite` 相同的场景选择行为。默认情况下，主机和 Multipass 套件运行使用隔离的网关工作线程并行执行多个选定的场景。`qa-channel` 默认并发数为 4，受选定场景数量的限制。使用 `--concurrency <count>` 调整工作线程数，或使用 `--concurrency 1` 进行串行执行。当任何场景失败时，命令以非零状态退出。如果您希望在不因失败而退出的情况下获取工件，请使用 `--allow-failures`。实时运行会转发对客户机实用的受支持的 QA 认证输入：基于环境的提供商密钥、QA 实时提供商配置路径，以及 `CODEX_HOME`（如果存在）。请将 `--output-dir` 保留在仓库根目录下，以便客户机可以通过挂载的工作区写回数据。

## Telegram 和 Discord QA 参考

Matrix 有一个[专用页面](/zh/concepts/qa-matrix)，因为它的场景数量和 Docker 支持的主服务器配置。Telegram 和 Discord 较小——各自只有少量场景，没有配置文件系统，针对预先存在的真实通道——所以它们的参考内容位于此处。

### 共享 CLI 标志

两条通道都通过 `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` 注册，并接受相同的标志：

| 标志                                  | 默认值                                                    | 描述                                                                          |
| ------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `--scenario <id>`                     | —                                                         | 仅运行此场景。可重复。                                                        |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord}-<timestamp>` | 报告/摘要/观察到的消息和输出日志的写入位置。相对路径根据 `--repo-root` 解析。 |
| `--repo-root <path>`                  | `process.cwd()`                                           | 从中立的当前工作目录 (cwd) 调用时的仓库根目录。                               |
| `--sut-account <id>`                  | `sut`                                                     | QA 网关配置中的临时帐户 ID。                                                  |
| `--provider-mode <mode>`              | `live-frontier`                                           | `mock-openai` 或 `live-frontier`（旧版 `live-openai` 仍然有效）。             |
| `--model <ref>` / `--alt-model <ref>` | 提供商默认值                                              | 主要/备用模型引用。                                                           |
| `--fast`                              | 关闭                                                      | 在支持的情况下，提供商快速模式。                                              |
| `--credential-source <env\|convex>`   | `env`                                                     | 请参阅 [Convex 凭证池](#convex-credential-pool)。                             |
| `--credential-role <maintainer\|ci>`  | 在 CI 中为 `ci`，否则为 `maintainer`                      | 使用 `--credential-source convex` 时的角色。                                  |

任何场景失败时，两者均以非零退出。`--allow-failures` 写入构件但不设置失败的退出代码。

### Telegram QA

```bash
pnpm openclaw qa telegram
```

针对一个真实的私有 Telegram 群组，使用两个不同的机器人（驱动程序 + SUT）。SUT 机器人必须具有 Telegram 用户名；当两个机器人在 `@BotFather` 中都启用 **Bot-to-Bot Communication Mode** 时，机器人对机器人的观察效果最佳。

`--credential-source env` 时的必需环境变量：

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` — 数字聊天 ID（字符串）。
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

可选：

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` 将消息正文保留在观察到的消息构件中（默认为编辑）。

场景 (`extensions/qa-lab/src/live-transports/telegram/telegram-live.runtime.ts:44`)：

- `telegram-canary`
- `telegram-mention-gating`
- `telegram-mentioned-message-reply`
- `telegram-help-command`
- `telegram-commands-command`
- `telegram-tools-compact-command`
- `telegram-whoami-command`
- `telegram-context-command`

输出产物：

- `telegram-qa-report.md`
- `telegram-qa-summary.json` — 包含每次回复的 RTT（驱动程序发送 → 观察到的 SUT 回复），从 canary 开始。
- `telegram-qa-observed-messages.json` — 正文已被编辑，除非 `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`。

### Discord QA

```bash
pnpm openclaw qa discord
```

针对一个真实的私有 Discord 服务器频道，使用两个机器人：一个由测试工具控制的驱动程序机器人，和一个由子 OpenClaw 网关通过捆绑的 Discord 插件启动的 SUT 机器人。验证频道提及处理以及 SUT 机器人是否已向 Discord 注册了原生 `/help` 命令。

当 `--credential-source env` 时所需的环境：

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` — 必须与 Discord 返回的 SUT 机器人用户 ID 匹配（否则车道会快速失败）。

可选：

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` 在观察到的消息产物中保留消息正文。

场景 (`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`)：

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`

输出产物：

- `discord-qa-report.md`
- `discord-qa-summary.json`
- `discord-qa-observed-messages.json` — 正文已被编辑，除非 `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`。

### Convex 凭证池

Telegram 和 Discord 车道都可以从共享的 Convex 池中租用凭证，而不是读取上述环境变量。传递 `--credential-source convex` （或设置 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`）；QA Lab 获取独占租约，在运行期间对其进行心跳检测，并在关闭时释放它。池种类为 `"telegram"` 和 `"discord"`。

代理在 `admin/add` 上验证的有效负载形状：

- Telegram (`kind: "telegram"`): `{ groupId: string, driverToken: string, sutToken: string }` — `groupId` 必须是数字聊天 ID 字符串。
- Discord (`kind: "discord"`): `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`。

操作环境变量和 Convex 代理端点契约位于 [Testing → Shared Telegram credentials via Convex](/zh/help/testing#shared-telegram-credentials-via-convex-v1)（该部分名称早于 Discord 支持；这两种类型的代理语义是相同的）。

## 仓库支持的种子

种子资产位于 `qa/`：

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

这些是有意放在 git 中的，以便人工和代理都能看到 QA 计划。

`qa-lab` 应保持为一个通用的 markdown 运行器。每个场景 markdown 文件是一次测试运行的单一事实来源，并应定义：

- 场景元数据
- 可选的类别、能力、泳道 和风险元数据
- 文档和代码引用
- 可选的插件要求
- 可选的网关配置补丁
- 可执行的 `qa-flow`

支持 `qa-flow` 的可重用运行时表面允许保持通用和横切性。例如，markdown 场景可以结合传输端辅助程序和浏览器端辅助程序，后者通过 Gateway(网关) `browser.request` 接缝驱动嵌入式控制 UI，而无需添加特殊情况运行器。

场景文件应按产品能力分组，而不是按源代码树文件夹分组。当文件移动时，请保持场景 ID 稳定；使用 `docsRefs` 和 `codeRefs` 进行实现可追溯性。

基线列表应保持足够广泛以覆盖：

- 私信和渠道聊天
- 线程行为
- 消息操作生命周期
- cron 回调
- 记忆回溯
- 模型切换
- 子代理交接
- 仓库读取和文档读取
- 一个小型构建任务，例如 Lobster Invaders

## 提供商模拟泳道

`qa suite` 有两个本地提供商模拟泳道：

- `mock-openai` 是具有场景感知能力的 OpenClaw 模拟。它仍然是仓库支持的 QA 和一致性门的默认确定性模拟泳道。
- `aimock` 启动一个由 AIMock 支持的提供商服务器，用于实验性协议、fixture、录制/回放和混沌覆盖。它是增量的，不替换 `mock-openai` 场景调度器。

Provider-lane 实现位于 `extensions/qa-lab/src/providers/` 下。
每个提供商拥有其默认值、本地服务器启动、网关模型配置、
身份验证配置文件暂存需求以及实时/模拟功能标志。共享套件和
网关代码应通过提供商注册表进行路由，而不是根据
提供商名称进行分支处理。

## 传输适配器

`qa-lab` 拥有用于 markdown QA 场景的通用传输接缝。`qa-channel` 是该接缝上的第一个适配器，但设计目标更广泛：未来的真实或合成渠道应接入同一个套件运行器，而不是添加特定于传输的 QA 运行器。

在架构层面上，划分为：

- `qa-lab` 负责通用场景执行、工作器并发、工件写入和报告。
- 传输适配器负责网关配置、就绪状态、入站和出站观察、传输操作以及规范化的传输状态。
- `qa/scenarios/` 下的 Markdown 场景文件定义测试运行；`qa-lab` 提供执行它们的可重用运行时界面。

### 添加渠道

向 markdown QA 系统添加渠道正好需要两件事：

1. 该渠道的传输适配器。
2. 一个演练渠道合约的场景包。

当共享的 `qa-lab` 宿主可以拥有该流程时，不要添加新的顶层 QA 命令根。

`qa-lab` 拥有共享宿主机制：

- `openclaw qa` 命令根
- 套件启动和拆除
- 工作器并发
- 工件写入
- 报告生成
- 场景执行
- 旧版 `qa-channel` 场景的兼容性别名

运行器插件拥有传输合约：

- `openclaw qa <runner>` 如何挂载在共享 `qa` 根之下
- 如何为该传输配置网关
- 如何检查就绪状态
- 如何注入入站事件
- 如何观察出站消息
- 如何公开转录和规范化的传输状态
- 如何执行传输支持的操作
- 如何处理特定于传输的重置或清理

新渠道的最低采用门槛：

1. 保持 `qa-lab` 作为共享 `qa` 根的所有者。
2. 在共享 `qa-lab` 宿主接缝上实现传输运行器。
3. 将特定于传输的机制保留在运行器插件或渠道线束内。
4. 将运行器挂载为 `openclaw qa <runner>`，而不是注册竞争的根命令。运行器插件应在 `openclaw.plugin.json` 中声明 `qaRunners`，并从 `runtime-api.ts` 导出匹配的 `qaRunnerCliRegistrations` 数组。保持 `runtime-api.ts` 轻量；惰性 CLI 和运行器执行应保留在单独的入口点后面。
5. 在主题化 `qa/scenarios/` 目录下编写或改编 markdown 场景。
6. 对新场景使用通用场景辅助函数。
7. 除非存储库正在进行有意的迁移，否则保持现有的兼容性别名正常工作。

决策规则是严格的：

- 如果行为可以在 `qa-lab` 中表达一次，请将其放在 `qa-lab` 中。
- 如果行为依赖于一个渠道传输，请将其保留在该运行器插件或插件线束中。
- 如果一个场景需要多个渠道都可以使用的新功能，请在 `suite.ts` 中添加通用辅助函数，而不是特定于渠道的分支。
- 如果一个行为仅对一种传输有意义，请保持该场景特定于传输，并在场景合约中明确说明。

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

兼容性别名仍可用于现有场景 —— `waitForQaChannelReady`、`waitForOutboundMessage`、`waitForNoOutbound`、`formatConversationTranscript`、`resetBus` —— 但新场景的创作应使用通用名称。别名旨在避免强制迁移（flag-day migration），而非作为未来的模型。

## 报告

`qa-lab` 从观察到的总线时间线导出 Markdown 协议报告。
该报告应回答：

- 哪些有效
- 哪些失败
- 哪些保持受阻
- 哪些后续场景值得添加

要获取可用场景清单 —— 在评估后续工作规模或连接新传输时很有用 —— 请运行 `pnpm openclaw qa coverage`（添加 `--json` 以获取机器可读输出）。

要进行字符和风格检查，请在多个实时模型引用上运行同一场景，并编写一份评判性 Markdown 报告：

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

该命令运行本地 QA 网关子进程，而不是 Docker。角色评估
场景应通过 `SOUL.md` 设置角色，然后运行普通用户轮次，
例如聊天、工作区帮助和小文件任务。不应告诉候选模型它正在被评估。该命令会保留每个完整的
转录，记录基本的运行统计，然后在支持的情况下，以快速模式询问具有 `xhigh` 推理能力的
评估模型，按自然度、氛围和幽默感对运行进行排名。
在比较提供商时使用 `--blind-judge-models`：评估提示词仍然会获得
每个转录和运行状态，但候选引用会被替换为
中性标签，例如 `candidate-01`；报告会在解析后将
排名映射回真实引用。
候选运行默认使用 `high` 思考，GPT-5.5 使用 `medium`，支持此功能的较旧的 OpenAI 评估引用使用 `xhigh`。
使用 `--model provider/model,thinking=<level>` 内联覆盖特定候选。`--thinking <level>` 仍然设置
全局回退，并保留较旧的 `--model-thinking <provider/model=level>` 形式
以保持兼容性。
OpenAI 候选引用默认为快速模式，因此在提供商支持的地方会使用优先处理。
当单个候选或评估需要覆盖时，内联添加 `,fast`、`,no-fast` 或 `,fast=false`。仅当您想要为每个候选模型
强制开启快速模式时才传递 `--fast`。候选和评估的持续时间
会记录在报告中以进行基准分析，但评估提示词明确指出
不要按速度排名。
候选和评估模型运行均默认并发数为 16。当提供商限制或本地网关
压力导致运行过于嘈杂时，降低
`--concurrency` 或 `--judge-concurrency`。
当未传递候选 `--model` 时，角色评估默认为
`openai/gpt-5.5`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-6`、
`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、
`moonshot/kimi-k2.5` 和
`google/gemini-3.1-pro-preview`（当未传递 `--model` 时）。
当未传递 `--judge-model` 时，评估者默认为
`openai/gpt-5.5,thinking=xhigh,fast` 和
`anthropic/claude-opus-4-6,thinking=high`。

## 相关文档

- [Matrix QA](/zh/concepts/qa-matrix)
- [QA 频道](/zh/channels/qa-channel)
- [测试](/zh/help/testing)
- [仪表板](/zh/web/dashboard)
