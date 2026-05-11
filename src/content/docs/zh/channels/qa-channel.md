---
summary: "用于确定性 OpenClaw QA 场景的合成 Slack 类渠道插件"
title: "QA 渠道"
read_when:
  - You are wiring the synthetic QA transport into a local or CI test run
  - You need the bundled qa-channel config surface
  - You are iterating on end-to-end QA automation
---

`qa-channel` 是用于自动化 OpenClaw QA 的捆绑合成消息传输。它不是生产渠道——它的存在是为了使用与真实传输相同的渠道插件边界，同时保持状态确定性且完全可检查。

## 功能

- Slack 类目标语法：
  - `dm:<user>`
  - `channel:<room>`
  - `thread:<room>/<thread>`
- 基于 HTTP 的合成总线，用于入站消息注入、出站记录捕获、线程创建、反应、编辑、删除以及搜索/读取操作。
- 主机端自检运行器，将 Markdown 报告写入 `.artifacts/qa-e2e/`。

## 配置

```json
{
  "channels": {
    "qa-channel": {
      "baseUrl": "http://127.0.0.1:43123",
      "botUserId": "openclaw",
      "botDisplayName": "OpenClaw QA",
      "allowFrom": ["*"],
      "pollTimeoutMs": 1000
    }
  }
}
```

账户密钥：

- `enabled` — 此账户的主开关。
- `name` — 可选的显示标签。
- `baseUrl` — 合成总线 URL。
- `botUserId` — 目标语法中使用的 Matrix 风格机器人用户 ID。
- `botDisplayName` — 出站消息的显示名称。
- `pollTimeoutMs` — 长轮询等待窗口。100 到 30000 之间的整数。
- `allowFrom` — 发送方允许列表（用户 ID 或 `"*"`）。
- `defaultTo` — 未提供时的后备目标。
- `actions.messages` / `actions.reactions` / `actions.search` / `actions.threads` — 每个操作的工具门控。

顶层的多账户密钥：

- `accounts` — 按账户 ID 键控的命名每账户覆盖记录。
- `defaultAccount` — 配置多个账户时的首选账户 ID。

## 运行器

主机端自检（在 `.artifacts/qa-e2e/` 下写入 Markdown 报告）：

```bash
pnpm qa:e2e
```

这将通过 `qa-lab` 路由，启动仓库内的 QA 总线，引导捆绑的 `qa-channel` 运行时切片，并运行确定性自检。

完整的仓库支持场景套件：

```bash
pnpm openclaw qa suite
```

针对 QA 网道并行运行场景。有关场景、配置文件和提供商模式，请参阅 [QA 概述](/zh/concepts/qa-e2e-automation)。

由 Docker 支持的 QA 站点（网关 + QA Lab 调试器 UI 位于同一堆栈中）：

```bash
pnpm qa:lab:up
```

构建 QA 站点，启动由 Docker 支持的网关 + QA Lab 堆栈，并打印 QA Lab URL。之后您可以选择场景，选择模型网道，启动单个运行，并实时查看结果。QA Lab 调试器与已发布的 Control UI 包是分开的。

## 相关

- [QA 概述](/zh/concepts/qa-e2e-automation) — 整体堆栈、传输适配器、场景编写
- [Matrix QA](/zh/concepts/qa-matrix) — 驱动真实渠道的实时传输运行器示例
- [配对](/zh/channels/pairing)
- [组](/zh/channels/groups)
- [渠道概述](/zh/channels)
