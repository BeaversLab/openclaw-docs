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

这些有意放在 git 中，以便 QA 计划对人类和代理都可见。基准列表应保持足够宽泛以涵盖：

- 私信和渠道聊天
- thread 行为
- 消息操作生命周期
- cron 回调
- memory 回忆
- 模型切换
- subagent 交接
- repo-reading 和 docs-reading
- 一个小型的构建任务，例如 Lobster Invaders

## 报告

`qa-lab` 从观察到的总线时间线导出 Markdown 协议报告。
报告应回答：

- 什么起作用了
- 什么失败了
- 什么仍然受阻
- 哪些后续场景值得添加

对于角色和风格检查，请在多个实时模型引用上运行相同的场景，并编写一份评判性的 Markdown 报告：

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

该命令运行本地 QA 网关子进程，而不是 Docker。角色评估场景应通过 `SOUL.md` 设置角色，然后运行普通用户轮次，例如聊天、工作区帮助和小型文件任务。不应告诉候选模型它正在接受评估。该命令保留每个完整的转录本，记录基本的运行统计数据，然后使用带有 `xhigh` 推理的快速模式下的判断模型，根据自然度、氛围和幽默感对运行进行排名。在比较提供商时使用 `--blind-judge-models`：判断提示词仍然会获取每个转录本和运行状态，但候选引用被替换为中性标签，例如 `candidate-01`；报告在解析后将排名映射回真实引用。候选运行默认使用 `high` 思考，对于支持的 OpenAI 模型则使用 `xhigh`。使用 `--model provider/model,thinking=<level>` 内联覆盖特定的候选。`--thinking <level>` 仍然设置全局回退，并且为了兼容性保留了旧的 `--model-thinking <provider/model=level>` 形式。OpenAI 候选引用默认使用快速模式，因此在提供商支持的地方会使用优先处理。当单个候选或判断需要覆盖时，请内联添加 `,fast`、`,no-fast` 或 `,fast=false`。仅当您想为每个候选模型强制开启快速模式时才传递 `--fast`。候选和判断的持续时间会记录在报告中以进行基准分析，但判断提示词明确说明不要按速度排名。候选和判断模型运行都默认并发数为 16。当提供商限制或本地网关压力导致运行过于嘈杂时，请降低 `--concurrency` 或 `--judge-concurrency`。当未传递候选 `--model` 时，角色评估默认为 `openai/gpt-5.4`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-6`、`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、`moonshot/kimi-k2.5` 和 `google/gemini-3.1-pro-preview`，当未传递 `--model` 时。当未传递 `--judge-model` 时，判断默认为 `openai/gpt-5.4,thinking=xhigh,fast` 和 `anthropic/claude-opus-4-6,thinking=high`。

## 相关文档

- [测试](/en/help/testing)
- [QA 渠道](/en/channels/qa-channel)
- [仪表板](/en/web/dashboard)
