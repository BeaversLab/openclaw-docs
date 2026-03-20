---
summary: "用于 `openclaw agent` 的 CLI 参考（通过 Gateway 发送一个 agent 轮次）"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "agent"
---

# `openclaw agent`

通过 Gateway 运行一个 agent 轮次（对于嵌入式请使用 `--local`）。
使用 `--agent <id>` 直接定位已配置的 agent。

相关：

- Agent send 工具：[Agent send](/zh/tools/agent-send)

## 示例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## 注意

- 当此命令触发 `models.json` 重新生成时，SecretRef 管理的提供商凭据将作为非机密标记（例如环境变量名称、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`）持久化，而不是解析后的机密明文。
- 标记写入具有源权威性：OpenClaw 从活动的源配置快照中持久化标记，而不是从解析后的运行时机密值中持久化。

import zh from "/components/footer/zh.mdx";

<zh />
