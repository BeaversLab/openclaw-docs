---
summary: "`openclaw agent` 的 CLI 参考（通过网关发送一个代理轮次）"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "agent"
---

# `openclaw agent`

通过网关运行一个代理轮次（嵌入式请使用 `--local`）。
使用 `--agent <id>` 直接定位到已配置的代理。

相关：

- Agent send 工具：[Agent send](/zh/en/tools/agent-send)

## 示例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## 注意

- 当此命令触发 `models.json` 重新生成时，SecretRef 托管的提供商凭证将作为非机密标记（例如环境变量名称、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`）进行持久化，而不是解析后的机密明文。
- 标记写入具有源权威性：OpenClaw 从活动的源配置快照中持久化标记，而不是从解析后的运行时机密值中持久化。

import zh from '/components/footer/zh.mdx';

<zh />
