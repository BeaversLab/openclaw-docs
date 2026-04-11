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
- `extensions/qa-lab`：调试器 UI 和 QA 总线，用于观察记录、注入入站消息并导出 Markdown 报告。
- `qa/`：用于启动任务和基准 QA 场景的基于代码库的种子资源。

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

`qa:lab:up:fast` 将 Docker 服务保留在预构建的镜像上，并将
`extensions/qa-lab/web/dist` 绑定挂载到 `qa-lab` 容器中。`qa:lab:watch`
会在更改时重新构建该包，当 QA 实验室
资源哈希值更改时，浏览器会自动重新加载。

## 基于代码库的种子

种子资源位于 `qa/`：

- `qa/scenarios/index.md`
- `qa/scenarios/*.md`

这些内容有意放在 git 中，以便人员和智能体都能看到 QA 计划。基准列表应保持足够的广度以涵盖：

- 私信和渠道聊天
- 线程行为
- 消息操作生命周期
- cron 回调
- 记忆回忆
- 模型切换
- 子智能体移交
- 读取代码库和文档
- 一个小型构建任务，例如 Lobster 入侵者

## 报告

`qa-lab` 从观察到的总线时间线导出 Markdown 协议报告。
该报告应回答：

- 什么成功了
- 什么失败了
- 什么仍然受阻
- 哪些后续场景值得添加

## 相关文档

- [测试](/en/help/testing)
- [QA 渠道](/en/channels/qa-channel)
- [仪表板](/en/web/dashboard)
