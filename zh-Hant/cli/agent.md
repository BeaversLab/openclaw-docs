---
summary: "CLI 參考指南 for `openclaw agent` (透過 Gateway 傳送一個 agent turn)"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "agent"
---

# `openclaw agent`

透過 Gateway 執行 agent turn (若為 embedded 則使用 `--local`)。
使用 `--agent <id>` 直接指定已設定的 agent。

相關：

- Agent send 工具：[Agent send](/zh-Hant/tools/agent-send)

## 範例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## 備註

- 當此指令觸發 `models.json` 重新生成時，由 SecretRef 管理的提供者憑證會以非秘密標記 (例如環境變數名稱、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`) 形式保存，而非已解析的秘密明文。
- 標記寫入是以來源為授權依據：OpenClaw 會保存來自作用中來源配置快照的標記，而非來自已解析執行時期秘密值的標記。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
