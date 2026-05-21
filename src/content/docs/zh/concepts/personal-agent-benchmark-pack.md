---
summary: "用于隐私保护型个人助手工作流检查的本地 QA 渠道场景。"
read_when:
  - Running local personal agent reliability checks
  - Extending the repo-backed QA scenario catalog
  - Verifying reminder, reply, memory, redaction, safe tool followthrough, task status, share-safe diagnostics, and proof-backed completion claims
title: "Personal agent benchmark pack"
---

Personal Agent Benchmark Pack 是一个用于本地个人助手工作流的小型基于仓库的 QA 场景包。它不是一个通用模型基准测试，也不需要新的运行器。该包复用了 [QA 概述](/zh/concepts/qa-e2e-automation) 中描述的私有 QA 栈、合成 [QA 渠道](/zh/channels/qa-channel) 以及现有的 `qa/scenarios` markdown 目录。

第一个包有意设计得很窄：

- 通过本地 cron 传递的虚假个人提醒
- 通过 `qa-channel` 进行的虚假私信和线程回复路由
- 从临时 QA 工作区内存文件中虚假调用偏好设置
- 虚假机密无回显检查
- 简短的批准式轮次后的安全读取支持的工具后续执行
- 针对敏感本地读取请求的批准拒绝停止行为
- 基于证明的任务状态报告，将待处理、阻塞和完成状态分开
- 在省略原始个人内容的同时保留有用状态的共享安全诊断产物
- 在存在本地证据之前避免虚假进度的基于证据的完成声明

## 场景

机器可读的数据包元数据位于
`extensions/qa-lab/src/scenario-packs.ts` 中。使用
`--pack personal-agent` 运行数据包：

```bash
OPENCLAW_ENABLE_PRIVATE_QA_CLI=1 pnpm openclaw qa suite \
  --provider-mode mock-openai \
  --pack personal-agent \
  --concurrency 1
```

`--pack` 与重复的 `--scenario` 标志是累加的。显式场景首先运行，然后数据包场景按 `QA_PERSONAL_AGENT_SCENARIO_IDS` 顺序运行，并去除重复项。

该数据包专为带有 `mock-openai` 或其他本地 QA
提供商通道的 `qa-channel` 而设计。不应将其指向实时聊天服务或真实的个人账户。

## 隐私模型

这些场景仅使用虚假用户、虚假偏好、虚假密钥以及由套件创建的临时 QA 网关工作区。它们不得读取或写入真实的 OpenClaw 用户记忆、会话、凭据、启动代理、全局配置或实时网关状态。

产物保留在现有 QA 套件产物目录下，应被视为测试输出。脱敏检查使用虚假标记，因此可以安全地检查失败情况并将其归档到问题中。

## 扩展数据包

在 `qa/scenarios/personal/` 下添加新用例，然后将场景 ID 添加到
`QA_PERSONAL_AGENT_SCENARIO_IDS` 中。保持每个用例小而精、本地化，在 `mock-openai` 中具有确定性，并专注于一种个人助手行为。

良好的后续候选事项：

- 已脱敏的轨迹导出检查
- 仅限本地的插件工作流检查

在场景目录有足够的稳定用例来证明引入该界面合理之前，避免添加新的运行程序、插件、依赖项、实时传输或模型评判器。
