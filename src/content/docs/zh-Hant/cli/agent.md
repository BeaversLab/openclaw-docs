---
summary: "CLI 參考資料，用於 `openclaw agent`（透過 Gateway 傳送一個 agent 輪次）"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "agent"
---

# `openclaw agent`

透過 Gateway 執行 agent 輪次（針對嵌入式使用 `--local`）。
使用 `--agent <id>` 直接將目標設為已設定的 agent。

相關連結：

- Agent 傳送工具：[Agent send](/zh-Hant/tools/agent-send)

## 範例

```exec
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## 備註

- 當此指令觸發 `models.json` 重新生成時，由 SecretRef 管理的提供者憑證會以非秘密標記（例如環境變數名稱、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`）持久化，而不是已解析的秘密明文。
- Marker 寫入是以來源為準的：OpenClaw 會保留來自目前來源設定快照的 markers，而不是來自解析後的執行時期密鑰值。
