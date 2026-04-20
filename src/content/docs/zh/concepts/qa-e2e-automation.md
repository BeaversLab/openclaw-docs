---
summary: "用于 qa-lab、qa-渠道、seeded scenarios 和 protocol reports 的私有 QA 自动化形态"
read_when:
  - Extending qa-lab or qa-channel
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "QA E2E Automation"
---

# QA E2E 自动化

私有 QA 栈旨在以比单一单元测试更现实、更像渠道的方式来测试 OpenClaw。

当前组件：

- `extensions/qa-channel`：包含私信、渠道、thread、reaction、edit 和 delete 表面的综合消息渠道。
- `extensions/qa-lab`：用于观察 transcript、注入入站消息和导出 Markdown 报告的调试器 UI 和 QA 总线。
- `qa/`：用于启动任务和基准 QA 场景的代码库支持的 seed 资产。

当前的 QA 操作员流是一个双面板 QA 站点：

- 左侧：带有代理的 Gateway(网关) 仪表板（控制 UI）。
- 右侧：QA Lab，显示类似 Slack 的记录和场景计划。

运行命令：

```bash
pnpm qa:lab:up
```

这将构建 QA 站点，启动基于 Docker 支持的网关通道，并暴露
QA 实验室页面，操作员或自动化循环可以在该页面为智能体分配 QA
任务，观察真实的渠道行为，并记录成功、失败或
受阻的情况。

为了在不每次重新构建 Docker 镜像的情况下更快地迭代 QA 实验室 UI，
请使用绑定挂载的 QA 实验室包启动堆栈：

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` 使 Docker 服务保持在预构建的镜像上，并将 `extensions/qa-lab/web/dist` 挂载到 `qa-lab` 容器中。`qa:lab:watch`
会在更改时重新构建该包，当 QA Lab 资产哈希更改时，浏览器会自动重新加载。

对于传输真实的 Matrix smoke lane，请运行：

```bash
pnpm openclaw qa matrix
```

该通道在 Docker 中配置一个一次性的 Tuwunel 主服务器，注册临时的驱动程序、SUT 和观察者用户，创建一个私有房间，然后在 QA 网关节点中运行真实的 Matrix 插件。实时传输通道保持子配置的范围限定于被测传输，因此 Matrix 在子配置中没有 `qa-channel` 即可运行。它将结构化的报告工件和合并的 stdout/stderr 日志写入所选的 Matrix QA 输出目录。要捕获外层 `scripts/run-node.mjs` 构建/启动器的输出，请将 `OPENCLAW_RUN_NODE_OUTPUT_LOG=<path>` 设置为仓库本地的日志文件。

对于传输真实的 Telegram smoke lane，请运行：

```bash
pnpm openclaw qa telegram
```

该通道以一个真实的私有 Telegram 组为目标，而不是配置一次性服务器。它需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`，加上同一私有组中的两个不同的机器人。SUT 机器人必须有一个 Telegram 用户名，并且当两个机器人在 `@BotFather` 中都启用了 Bot-to-Bot 通信模式时，机器人对机器人的观察效果最佳。

实时传输 lanes 现在共享一个更小的契约，而不是各自发明自己的场景列表形态：

`qa-channel` 仍然是广泛的产品行为综合套件，不是实时传输覆盖范围 Telegram 的一部分。

| Lane     | Canary | 提及控制 | Allowlist block | 顶级回复 | 重启恢复 | Thread 后续跟进 | Thread 隔离 | 反应观察 | Help command |
| -------- | ------ | -------- | --------------- | -------- | -------- | --------------- | ----------- | -------- | ------------ |
| Matrix   | x      | x        | x               | x        | x        | x               | x           | x        |              |
| Telegram | x      |          |                 |          |          |                 |             |          | x            |

这使 `qa-channel` 保持为广泛的产品行为套件，而 Matrix、Telegram 和未来的实时传输共享一个明确的传输合约检查清单。

对于不将 Linux 引入 QA 路径的一次性 Docker VM 车道，请运行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

这会启动一个新的 Multipass 客户机，安装依赖项，在客户机内构建 OpenClaw，运行 `qa suite`，然后将正常的 QA 报告和摘要复制回主机上的 `.artifacts/qa-e2e/...`。它重用与主机上的 `qa suite` 相同的场景选择行为。主机和 Multipass 套件运行默认使用隔离的网关工作程序并行执行多个选定的场景，最多 64 个工作程序或选定的场景数量。使用 `--concurrency <count>` 调整工作程序数量，或使用 `--concurrency 1` 进行串行执行。实时运行转发适合客户机的受支持的 QA 认证输入：基于环境的提供商密钥、QA 实时提供商配置路径，以及（如果存在）`CODEX_HOME`。将 `--output-dir` 保持在仓库根目录下，以便客户机可以通过挂载的工作空间写回数据。

## Repo-backed seeds

Seed assets 位于 `qa/`：

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

这些有意放在 git 中，以便人员和代理都能看到 QA 计划。

`qa-lab` 应保持为一个通用的 markdown 运行器。每个场景 markdown 文件
是一次测试运行的单一事实来源，并应定义：

- 场景元数据
- 可选的 category、capability、lane 和 risk 元数据
- 文档和代码引用
- 可选的插件要求
- 可选的 Gateway 配置补丁
- 可执行的 `qa-flow`

支持 `qa-flow` 的可重用运行时表面允许保持通用
和横切性。例如，markdown 场景可以将传输端
helper 与驱动嵌入式 Control UI 的浏览器端 helper 结合起来，通过
Gateway `browser.request` 接缝，而无需添加特殊情况运行器。

场景文件应按产品功能而不是源代码树
文件夹分组。当文件移动时，保持场景 ID 稳定；使用 `docsRefs` 和 `codeRefs`
进行实现可追溯性。

基线列表应保持足够广泛以覆盖：

- 私信和渠道聊天
- 线程行为
- 消息操作生命周期
- cron 回调
- 记忆回忆
- 模型切换
- 子代理交接
- 读取仓库和读取文档
- 一个小型构建任务，例如 Lobster Invaders

## Provider 模拟车道

`qa suite` 有两个本地 Provider 模拟车道：

- `mock-openai` 是具有场景感知能力的 OpenClaw 模拟。它仍然是仓库支持的 QA
  和奇偶性校门的默认确定性模拟车道。
- `aimock` 启动一个由 AIMock 支持的 Provider 服务器，用于实验性协议、
  夹具、录制/重放和混沌覆盖。它是附加性的，不会
  替换 `mock-openai` 场景调度器。

Provider-lane 实现位于 `extensions/qa-lab/src/providers/` 下。
每个 Provider 拥有其默认值、本地服务器启动、Gateway 模型配置、
身份配置文件暂存需求以及实时/模拟功能标志。共享套件和
Gateway 代码应通过 Provider 注册表路由，而不是根据
Provider 名称进行分支。

## 传输适配器

`qa-lab` 拥有用于 markdown QA 场景的通用传输接缝。
`qa-channel` 是该接缝上的第一个适配器，但设计目标更广泛：
未来的真实或合成渠道应插入到同一个套件运行器中，
而不是添加特定于传输的 QA 运行器。

在架构层面，划分为：

- `qa-lab` 拥有通用场景执行、工作程序并发、产物写入和报告。
- 传输适配器拥有网关配置、就绪状态、入站和出站观察、传输操作以及标准化传输状态。
- `qa/scenarios/` 下的 markdown 场景文件定义了测试运行；`qa-lab` 提供了执行它们的可重用运行时界面。

针对维护者的新渠道适配器采用指南位于
[Testing](/zh/help/testing#adding-a-channel-to-qa)。

## 报告

`qa-lab` 从观察到的总线时间线导出 Markdown 协议报告。
该报告应回答：

- 什么起作用了
- 什么失败了
- 什么保持受阻
- 哪些后续场景值得添加

对于性格和风格检查，在多个实时模型引用上运行相同的场景
并编写一份评判性 Markdown 报告：

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.4,thinking=xhigh \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-6,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.4,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-6,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

该命令运行本地 QA 网关子进程，而不是 Docker。角色评估场景应通过 `SOUL.md` 设置人格，然后运行普通的用户轮次，如聊天、工作区帮助和小型文件任务。不应告知候选模型它正在接受评估。该命令保留每个完整的转录，记录基本的运行统计，然后要求评审模型在快速模式下通过 `xhigh` 推理，按照自然度、氛围和幽默感对运行进行排名。比较提供商时请使用 `--blind-judge-models`：评审提示词仍然会获取每个转录和运行状态，但候选引用会被中性标签（如 `candidate-01`）所取代；解析后的报告会将排名映射回真实的引用。候选运行默认为 `high` 思考，对于支持的 OpenAI 模型则使用 `xhigh`。可以使用 `--model provider/model,thinking=<level>` 在内联方式中覆盖特定候选。`--thinking <level>` 仍然会设置全局回退值，并保留了较旧的 `--model-thinking <provider/model=level>` 形式以保持兼容性。OpenAI 候选引用默认为快速模式，因此在提供商支持的地方会使用优先处理。当单个候选或评审需要覆盖时，请内联添加 `,fast`、`,no-fast` 或 `,fast=false`。仅在您希望为每个候选模型强制开启快速模式时才传递 `--fast`。候选和评审的持续时间会记录在报告中以进行基准分析，但评审提示词明确指出不要按速度排名。候选和评审模型运行的默认并发数均为 16。当提供商限制或本地网关压力导致运行过于嘈杂时，请降低 `--concurrency` 或 `--judge-concurrency`。当未传递候选 `--model` 时，角色评估默认为 `openai/gpt-5.4`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-6`、`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、`moonshot/kimi-k2.5` 和 `google/gemini-3.1-pro-preview`（当未传递 `--model` 时）。当未传递 `--judge-model` 时，评审默认为 `openai/gpt-5.4,thinking=xhigh,fast` 和 `anthropic/claude-opus-4-6,thinking=high`。

## 相关文档

- [测试](/zh/help/testing)
- [QA 频道](/zh/channels/qa-channel)
- [仪表板](/zh/web/dashboard)
