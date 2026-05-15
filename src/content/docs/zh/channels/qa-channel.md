---
summary: "用于确定性 OpenClaw QA 场景的合成 Slack 类渠道插件"
title: "QA 渠道"
read_when:
  - You are wiring the synthetic QA transport into a local or CI test run
  - You need the bundled qa-channel config surface
  - You are iterating on end-to-end QA automation
---

`qa-channel`OpenClaw 是一个用于自动化 OpenClaw QA 的内置合成消息传输。它不是一个生产渠道——它的存在是为了在与真实传输使用的相同渠道插件边界上进行操作，同时保持状态的确定性和完全可检查性。

## 功能

- Slack 类目标语法：
  - `dm:<user>`
  - `channel:<room>`
  - `group:<room>`
  - `thread:<room>/<thread>`
- 共享的 `channel:` 和 `group:`DiscordSlackTelegram 会话作为群组/渠道房间轮次呈现给代理，因此它们执行与 Discord、Slack、Telegram 和类似传输使用的相同的可见回复和消息工具路由策略。
- 用于入站消息注入、出站记录捕获、线程创建、反应、编辑、删除以及搜索/读取操作的 HTTP 支持的合成总线。
- 主机端自检运行器，用于将 Markdown 报告写入 `.artifacts/qa-e2e/`。

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

- `enabled` - 此账户的主开关。
- `name` - 可选的显示标签。
- `baseUrl` - 合成总线 URL。
- `botUserId`Matrix - 目标语法中使用的 Matrix 风格的机器人用户 ID。
- `botDisplayName` - 出站消息的显示名称。
- `pollTimeoutMs` - 长轮询等待窗口。介于 100 和 30000 之间的整数。
- `allowFrom` - 发送者白名单（用户 ID 或 `"*"`）。直接消息和
  白名单群组策略都使用这些合成发送者 ID。
- `groupPolicy` - 共享房间策略：`"open"`（默认）、`"allowlist"` 或
  `"disabled"`。
- `groupAllowFrom` - 可选的共享房间发送者白名单。当在
  `"allowlist"` 下省略时，QA 渠道回退到 `allowFrom`。
- `groups.<room>.requireMention` - 在特定的群组/渠道房间中回复之前需要机器人提及。`groups."*"` 设置默认值。
- `defaultTo` - 未提供目标时的回退目标。
- `actions.messages` / `actions.reactions` / `actions.search` / `actions.threads` - 每个操作的工具门控。

顶层的多账户密钥：

- `accounts` - 按账户 ID 键入的命名按账户覆盖记录。
- `defaultAccount` - 当配置了多个账户时的首选账户 ID。

## 运行器

主机端自检（在 `.artifacts/qa-e2e/` 下写入 Markdown 报告）：

```bash
pnpm qa:e2e
```

这会通过 `qa-lab` 路由，启动仓库内 QA 总线，引导捆绑的 `qa-channel` 运行时切片，并运行确定性自检。

完整的仓库支持场景套件：

```bash
pnpm openclaw qa suite
```

针对 QA 网通道道并行运行场景。有关场景、配置文件和提供商模式，请参阅 [QA 概述](/zh/concepts/qa-e2e-automation)。

Docker 支持的 QA 站点（一个堆栈中的网关 + QA Lab 调试器 UI）：

```bash
pnpm qa:lab:up
```

构建 QA 站点，启动 Docker 支持的网关 + QA Lab 堆栈，并打印 QA Lab URL。从那里你可以选择场景，选择模型通道，启动单独的运行，并实时观看结果。QA Lab 调试器与已发布的 Control UI 捆绑包是分开的。

## 相关

- [QA 概述](/zh/concepts/qa-e2e-automation) - 整体堆栈、传输适配器、场景创作
- [Matrix QA](/zh/concepts/qa-matrix) - 驱动真实渠道的实时传输运行器示例
- [配对](/zh/channels/pairing)
- [群组](/zh/channels/groups)
- [渠道概述](/zh/channels)
