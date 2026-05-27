---
summary: "CLI 參考資料 for `openclaw status` (diagnostics, probes, usage snapshots)"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable "all" status for debugging
title: "openclaw status"
---

通道與會話的診斷資訊。

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

備註：

- `--deep` 會執行即時探測（WhatsApp Web + Telegram + Discord + Slack + Signal）。
- 純 `openclaw status` 維持在快速唯讀路徑上，並在跳過記憶體檢查時將記憶體標記為 `not checked` 而非不可用。繁重的安全性稽核、外掛程式相容性和記憶體向量探測則交由 `openclaw status --all`、`openclaw status --deep`、`openclaw security audit` 和 `openclaw memory status --deep` 處理。
- `status --json --all` 會回報由 `plugins.slots.memory` 選取的作用中記憶體外掛程式執行時期的記憶體詳細資訊。自訂記憶體外掛程式可以停用內建 `agents.defaults.memorySearch.enabled` 並仍然回報它們自己的檔案、區塊、向量和 FTS 狀態。
- `--usage` 會將標準化的供應商使用視窗列印為 `X% left`。
- Session 狀態輸出會區分 `Execution:` 和 `Runtime:`。`Execution` 是沙箱路徑（`direct`、`docker/*`），而 `Runtime` 則告訴您 Session 是否正在使用 `OpenClaw Pi Default`、`OpenAI Codex`、CLI 後端，或 ACP 後端（例如 `codex (acp/acpx)`）。關於供應商/模型/執行時的區別，請參閱 [Agent runtimes](/zh-Hant/concepts/agent-runtimes)。
- MiniMax 的原始 `usage_percent` / `usagePercent` 欄位是剩餘配額，因此 OpenClaw 會在顯示前將其反轉；如果存在計數型欄位則優先採用。`model_remains` 回應偏好採用聊天模型條目，並在需要時從時間戳記衍生視窗標籤，以及在方案標籤中包含模型名稱。
- 當目前會話快照稀疏時，`/status` 可以從最新的逐字稿使用紀錄中回填權杖和快取計數器。既有的非零即時值仍優先於逐字稿後援值。
- `/status` 包含精簡的 Gateway 程序運作時間和主機系統運作時間。
- 當即時會話項目缺少主動運行時模型標籤時，文字記錄回退也可以恢復該標籤。如果該文字記錄模型與選定的模型不同，status 會針對恢復的運行時模型（而非選定的模型）來解析內容視窗。
- 當 Session 被釘選到與設定的主要模型不同的模型時，狀態會列印這兩個值、原因（`session override`）以及清除提示（`/model <configured-default>` 或 `/reset`）。設定的主要模型適用於新或未釘選的 Session；現有的釘選 Session 會保留其選擇，直到被清除為止。
- 關於提示詞大小的計算，當 Session 中繼資料遺失或較小時，transcript 回退機制會偏好較大的提示詞導向總計，以免自訂供應商的 Session 顯示為 `0` token。
- 當設定了多個 Agent 時，輸出會包含各個 Agent 的 Session 儲存。
- 概覽會在可用時包含 Gateway + 節點主機服務的安裝/執行時狀態。
- 概覽會包含更新頻道 + git SHA（針對原始碼結帳）。
- 更新資訊會顯示在概覽中；如果有可用更新，狀態會列印提示以執行 `openclaw update`（請參閱 [Updating](/zh-Hant/install/updating)）。
- 模型價格重新整理失敗會顯示為選用的價格警告。這並不代表 Gateway 或 頻道 狀態異常。
- 唯讀狀態介面（`status`、`status --json`、`status --all`）會在可能的情況下，針對其目標設定路徑解析支援的 SecretRefs。
- 如果設定了支援的頻道 SecretRef，但在目前的指令路徑中無法使用，狀態將保持唯讀並回報降級輸出，而不是當機。人類可讀輸出會顯示諸如「此指令路徑中無法使用設定的 token」之類的警告，而 JSON 輸出則包含 `secretDiagnostics`。
- 當指令本機的 SecretRef 解析成功時，status 偏好使用解析後的快照，並從最終輸出中清除暫時性的「secret unavailable」頻道標記。
- `status --all` 包含一個 Secrets 概覽列和一個診斷區塊，該區塊總結 secret 診斷（為了可讀性而截斷）而不停止報告產生。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [Doctor](/zh-Hant/gateway/doctor)
