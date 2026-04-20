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

该 lane 在 Docker 中配置一次性的 Tuwunel homeserver，注册临时 driver、SUT 和 observer 用户，创建一个私有房间，然后在 QA gateway child 中运行真实的 Matrix 插件。实时传输 lane 将 child config 限制在被测传输的范围内，因此 Matrix 在 child config 中不包含 `qa-channel`。

对于传输真实的 Telegram smoke lane，请运行：

```bash
pnpm openclaw qa telegram
```

该 lane 以一个真实的私有 Telegram 群组为目标，而不是配置一次性的服务器。它需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、
`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和
`OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`，加上同一私有群组中的两个不同的 bot。SUT bot 必须拥有 Telegram 用户名，并且当两个 bot 都在 `@BotFather` 中启用 Bot-to-Bot Communication Mode 时，bot-to-bot 观察效果最佳。

实时传输 lanes 现在共享一个更小的契约，而不是各自发明自己的场景列表形态：

`qa-channel` 仍然是广泛的综合产品行为套件，不是实时传输覆盖范围矩阵的一部分。

| Lane     | Canary | 提及控制 | Allowlist block | 顶级回复 | 重启恢复 | Thread 后续跟进 | Thread 隔离 | 反应观察 | Help command |
| -------- | ------ | -------- | --------------- | -------- | -------- | --------------- | ----------- | -------- | ------------ |
| Matrix   | x      | x        | x               | x        | x        | x               | x           | x        |              |
| Telegram | x      |          |                 |          |          |                 |             |          | x            |

这使得 `qa-channel` 仍然作为广泛的产品行为套件，而 Matrix、Telegram 和未来的实时传输共用一个明确的传输合同检查清单。

对于不将 Linux 引入 QA 路径的一次性 Docker VM 车道，请运行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

这会启动一个新的 Multipass 客户机，安装依赖项，在客户机内部构建 OpenClaw，运行 `qa suite`，然后将正常的 QA 报告和摘要复制回主机上的 `.artifacts/qa-e2e/...`。
它重用与主机上 `qa suite` 相同的场景选择行为。
主机和 Multipass 套件运行默认通过隔离的 gateway workers 并行执行多个选定的场景，最多 64 个 workers 或选定的场景数量。使用 `--concurrency <count>` 调整 worker 数量，或使用 `--concurrency 1` 进行串行执行。
实时运行会转发客户机实用的受支持 QA 认证输入：基于 env 的 提供商 keys、QA 实时 提供商 配置路径，以及存在时的 `CODEX_HOME`。将 `--output-dir` 保留在 repo 根目录下，以便客户机可以通过挂载的工作空间写回数据。

## Repo-backed seeds

Seed 资产位于 `qa/`：

- `qa/scenarios/index.md`
- `qa/scenarios/*.md`

这些有意放在 git 中，以便人员和代理都能看到 QA 计划。

`qa-lab` 应保持为通用的 markdown 运行器。每个场景 markdown 文件是一次测试运行的单一事实来源，并应定义：

- 场景元数据
- 文档和代码引用
- 可选的插件要求
- 可选的 Gateway 配置补丁
- 可执行的 `qa-flow`

支持 `qa-flow` 的可重用运行时表面允许保持通用和横切性。例如，markdown 场景可以结合传输端辅助程序和浏览器端辅助程序，通过 Gateway(网关) `browser.request` 缝隙驱动嵌入式控制 UI，而无需添加特殊情况运行程序。

基线列表应保持足够广泛以覆盖：

- 私信和渠道聊天
- 线程行为
- 消息操作生命周期
- cron 回调
- 记忆回想
- 模型切换
- 子代理交接
- 仓库读取和文档读取
- 一个小的构建任务，例如 Lobster Invaders

## 传输适配器

`qa-lab` 拥有用于 markdown QA 场景的通用传输缝隙。`qa-channel` 是该缝隙上的第一个适配器，但设计目标更广泛：未来的真实或合成渠道应插入同一套件运行程序，而不是添加特定于传输的 QA 运行程序。

在架构层面，划分如下：

- `qa-lab` 负责通用场景执行、工作线程并发、工件写入和报告。
- 传输适配器负责 Gateway 配置、就绪状态、入站和出站观察、传输操作以及规范化的传输状态。
- `qa/scenarios/` 下的 markdown 场景文件定义测试运行；`qa-lab` 提供执行它们的可重用运行时表面。

针对新渠道适配器的维护者采用指南位于 [Testing](/en/help/testing#adding-a-channel-to-qa)。

## 报告

`qa-lab` 从观察到的总线时间轴导出 Markdown 协议报告。该报告应回答：

- 什么有效
- 什么失败
- 什么仍然受阻
- 哪些后续场景值得添加

对于角色和风格检查，请在多个实时模型引用上运行相同场景并编写评估后的 Markdown 报告：

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

该命令运行本地 QA 网关子进程，而不是 Docker。角色评估
场景应通过 `SOUL.md` 设置人设，然后运行普通用户轮次
例如聊天、工作区帮助和小型文件任务。不应告知候选模型
它正在接受评估。该命令保留每个完整的
对话记录，记录基本运行统计数据，然后让快速模式下的评判模型通过
`xhigh` 推理按自然度、氛围和幽默感对运行进行排名。
在比较提供商时使用 `--blind-judge-models`：评判提示词仍然会获取
每份对话记录和运行状态，但候选引用将被中性
标签（如 `candidate-01`）替换；报告在
解析后将排名映射回真实引用。
候选运行默认为 `high` 思考，对于支持的 OpenAI 模型
则使用 `xhigh`。可以通过
`--model provider/model,thinking=<level>` 内联覆盖特定的候选设置。`--thinking <level>` 仍然设置
全局后备值，并且保留了较旧的 `--model-thinking <provider/model=level>` 形式
以保持兼容性。
OpenAI 候选引用默认为快速模式，因此在提供商
支持的地方会使用优先处理。当
单个候选或评判需要覆盖时，请内联添加 `,fast`、`,no-fast` 或 `,fast=false`。仅当您想要
为每个候选模型强制开启快速模式时，才传递 `--fast`。候选和评判的持续时间
会记录在报告中以进行基准分析，但评判提示词明确表示
不要按速度排名。
候选和评判模型运行均默认并发度为 16。当提供商限制或本地网关
压力导致运行过于嘈杂时，请降低
`--concurrency` 或 `--judge-concurrency`。
当未传递候选 `--model` 时，角色评估默认为
`openai/gpt-5.4`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-6`、
`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、
`moonshot/kimi-k2.5` 以及
`google/gemini-3.1-pro-preview`（当未传递 `--model` 时）。
当未传递 `--judge-model` 时，评判默认为
`openai/gpt-5.4,thinking=xhigh,fast` 和
`anthropic/claude-opus-4-6,thinking=high`。

## 相关文档

- [测试](/en/help/testing)
- [QA 频道](/en/channels/qa-channel)
- [仪表板](/en/web/dashboard)
