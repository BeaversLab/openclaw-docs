---
summary: "针对 qa-lab、qa-渠道、种子场景和协议报告的私有 QA 自动化形态"
read_when:
  - Extending qa-lab or qa-channel
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "QA E2E 自动化"
---

# QA E2E 自动化

私有 QA 栈旨在以比单一单元测试更现实、更像渠道的方式来测试 OpenClaw。

当前组件：

- `extensions/qa-channel`：包含私信、渠道、线程、反应、编辑和删除表面的综合消息渠道。
- `extensions/qa-lab`：用于观察记录、注入入站消息和导出 Markdown 报告的调试器 UI 和 QA 总线。
- `qa/`：用于启动任务和基准 QA 场景的基于代码库的种子资源。

长期目标是一个双窗格 QA 站点：

- 左侧：带有代理的 Gateway(网关) 仪表板（控制 UI）。
- 右侧：QA Lab，显示类似 Slack 的记录和场景计划。

这使得操作员或自动化循环能够赋予代理一个 QA 任务，观察真实的渠道行为，并记录哪些有效、失败或受阻。

## 基于代码库的种子

种子资源位于 `qa/` 中：

- `qa/QA_KICKOFF_TASK.md`
- `qa/seed-scenarios.json`

这些有意放在 git 中，以便人类和代理都可以看到 QA 计划。基准列表应保持足够广泛，以涵盖：

- 私信和渠道聊天
- 线程行为
- 消息操作生命周期
- cron 回调
- 记忆回想
- 模型切换
- 子代理交接
- 读取代码库和文档
- 一个小型构建任务，例如 Lobster 入侵者

## 报告

`qa-lab` 从观察到的总线时间线导出 Markdown 协议报告。该报告应回答：

- 什么有效
- 什么失败
- 什么仍然受阻
- 值得添加哪些后续场景

## 相关文档

- [测试](/en/help/testing)
- [QA 渠道](/en/channels/qa-channel)
- [仪表板](/en/web/dashboard)
