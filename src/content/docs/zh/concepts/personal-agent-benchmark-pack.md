---
summary: "用于隐私保护型个人助手工作流检查的本地 QA 渠道场景。"
read_when:
  - Running local personal agent reliability checks
  - Extending the repo-backed QA scenario catalog
  - Verifying reminder, reply, memory, redaction, and safe tool followthrough behavior
title: "Personal agent benchmark pack"
---

Personal Agent Benchmark Pack 是一个用于本地个人助手工作流的小型基于仓库的 QA 场景包。它不是一个通用模型基准测试，也不需要新的运行器。该包复用了 [QA 概述](/zh/concepts/qa-e2e-automation) 中描述的私有 QA 栈、合成 [QA 渠道](/zh/channels/qa-channel) 以及现有的 `qa/scenarios` markdown 目录。

第一个包有意设计得很窄：

- 通过本地 cron 传递的虚假个人提醒
- 通过 `qa-channel` 进行的虚假私信和线程回复路由
- 从临时 QA 工作区内存文件中虚假调用偏好设置
- 虚假机密无回显检查
- 简短的批准式轮次后的安全读取支持的工具后续执行

## 场景

机器可读的包元数据位于
`extensions/qa-lab/src/scenario-packs.ts` 中。使用
`--pack personal-agent` 运行该包：

```bash
OPENCLAW_ENABLE_PRIVATE_QA_CLI=1 pnpm openclaw qa suite \
  --provider-mode mock-openai \
  --pack personal-agent \
  --concurrency 1
```

`--pack` 与重复的 `--scenario` 标志是叠加的。显式指定的场景首先运行，然后包场景按 `QA_PERSONAL_AGENT_SCENARIO_IDS` 顺序运行，并移除重复项。

该包专为配合 `mock-openai` 或其他本地 QA 提供商通道的 `qa-channel` 而设计。它不应指向实时聊天服务或真实的个人账户。

## 隐私模型

这些场景仅使用虚假用户、虚假偏好、虚假机密以及套件创建的临时 QA 网关工作区。它们不得读取或写入真实的 OpenClaw 用户内存、会话、凭据、启动代理、全局配置或实时网关状态。

产物保留在现有 QA 套件的产物目录下，应被视为测试输出。编辑检查使用虚假标记，因此可以安全地检查失败情况并将其归档到问题中。

## 扩展包

在 `qa/scenarios/personal/` 下添加新案例，然后将场景 ID 添加到 `QA_PERSONAL_AGENT_SCENARIO_IDS`。保持每个案例在 `mock-openai` 中小规模、本地化且具有确定性，并专注于一种个人助手行为。

良好的后续候选方向：

- 批准拒绝的正确性
- 多步骤任务分类账断言
- 已编辑轨迹导出检查
- 仅限本地的插件工作流检查

在场景目录拥有足够的稳定案例来证明该层面的合理性之前，请避免添加新的运行器、插件、依赖项、实时传输或模型评判器。
