---
summary: "`openclaw agent` 的 CLI 參考（透過 Gateway 發送一個 agent 週期）"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "agent"
---

# `openclaw agent`

透過 Gateway 執行 agent 週期（嵌入式請使用 `--local`）。
使用 `--agent <id>` 直接指定已設定的 agent。

相關連結：

- Agent send 工具：[Agent send](/en/tools/agent-send)

## 範例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## 注意事項

- 當此指令觸發 `models.json` 重新生成時，SecretRef 管理的提供者憑證會以非機密標記（例如環境變數名稱、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`）持續儲存，而非已解析的機密明文。
- 標記寫入以來源為準：OpenClaw 持續儲存的是來自作用中來源設定快照的標記，而非來自已解析執行時期機密值的標記。
