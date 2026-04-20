---
summary: "CLI 參考資料 for `openclaw status` (diagnostics, probes, usage snapshots)"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable “all” status for debugging
title: "status"
---

# `openclaw status`

頻道 + 工作階段的診斷。

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

備註：

- `--deep` 執行即時探測（WhatsApp Web + Telegram + Discord + Slack + Signal）。
- `--usage` 將標準化的供應商使用視窗列印為 `X% left`。
- MiniMax 的原始 `usage_percent` / `usagePercent` 欄位代表剩餘配額，因此 OpenClaw 會在顯示前將其反轉；如果存在基於計數的欄位則優先採用。`model_remains` 回應偏好聊天模型條目，需要時從時間戳記衍生視窗標籤，並在計劃標籤中包含模型名稱。
- 當目前工作階段快照稀疏時，`/status` 可以從最新的對話使用記錄中回填 token 和快取計數器。現有的非零即時值仍優先於對話回退值。
- 當即時工作階段條目缺少時，對話回退還可以恢復作用中的執行時期模型標籤。如果該對話模型與所選模型不同，狀態將根據恢復的執行時期模型而非所選模型來解析上下文視窗。
- 對於提示詞大小的計算，當工作階段元資料缺失或較小時，對話回退會偏好較大的提示詞導向總計，因此自訂供應商工作階段不會降至 `0` token 顯示。
- 當配置多個代理程式時，輸出包含每個代理程式的工作階段儲存。
- 概述包含 Gateway + 節點主機服務安裝/執行狀態（如果可用）。
- 概述包含更新頻道 + git SHA（適用於原始碼簽出）。
- 更新資訊會顯示在概述中；如果有可用的更新，狀態會列印提示以執行 `openclaw update`（請參閱[更新](/zh-Hant/install/updating)）。
- 唯讀狀態表面（`status`、`status --json`、`status --all`）會在可能時為其目標配置路徑解析支援的 SecretRef。
- 如果配置了支援的頻道 SecretRef 但在目前指令路徑中無法使用，狀態將保持唯讀並報告降級輸出，而不是崩潰。人類輸出會顯示諸如「在此指令路徑中無法使用配置的 token」之類的警告，而 JSON 輸出則包含 `secretDiagnostics`。
- 當指令本機 SecretRef 解析成功時，status 偏好已解析的快照，並從最終輸出中清除暫時性的「secret unavailable」通道標記。
- `status --all` 包含 Secrets 概述列以及診斷章節，該章節摘要說明秘密診斷（為了可讀性而截斷），而不會停止報告生成。
