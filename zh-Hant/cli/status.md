---
summary: "`openclaw status` 的 CLI 參考（診斷、探測、使用快照）"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable “all” status for debugging
title: "status"
---

# `openclaw status`

頻道與工作階段的診斷。

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

備註：

- `--deep` 執行即時探測（WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal）。
- 當配置多個代理時，輸出包含各代理的工作階段存放區。
- 概覽在可用時包含 Gateway + 節點主機服務的安裝/執行狀態。
- 概覽包含更新頻道 + git SHA（針對原始碼簽出）。
- 更新資訊會顯示在概覽中；如果有可用的更新，status 會印出提示以執行 `openclaw update`（請參閱[更新](/zh-Hant/install/updating)）。
- 唯讀狀態表面（`status`、`status --json`、`status --all`）會在可能的情況下為其目標設定路徑解析支援的 SecretRefs。
- 如果配置了支援的頻道 SecretRef，但在目前命令路徑中無法使用，status 將保持唯讀並回報降級輸出，而不是崩潰。人類可讀輸出會顯示諸如「在此命令路徑中無法使用配置的權杖」之類的警告，而 JSON 輸出則包含 `secretDiagnostics`。
- 當命令本機 SecretRef 解析成功時，status 優先使用解析後的快照，並從最終輸出中清除暫時性的「secret unavailable」頻道標記。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
