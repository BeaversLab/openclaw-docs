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

- `--deep` 會執行即時探測（WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal）。
- 當設定多個代理程式時，輸出內容會包含各代理程式的工作階段儲存。
- 概覽包含 Gateway + 節點主機服務的安裝/執行狀態（如果有的話）。
- 概覽包含更新頻道 + git SHA（適用於原始碼簽出）。
- 更新資訊會顯示在概覽中；如果有可用的更新，status 會印出提示執行 `openclaw update`（請參閱[更新](/en/install/updating)）。
- 唯讀狀態介面（`status`、`status --json`、`status --all`）會在可能的情況下，解析其目標設定路徑支援的 SecretRefs。
- 如果設定了支援的頻道 SecretRef 但在目前的指令路徑中無法使用，status 將保持唯讀並報告降級輸出，而不是直接當機。人類可讀輸出會顯示諸如「configured token unavailable in this command path」的警告，而 JSON 輸出會包含 `secretDiagnostics`。
- 當指令本機的 SecretRef 解析成功時，status 會傾向使用解析後的快照，並從最終輸出中清除暫時性的「secret unavailable」頻道標記。
- `status --all` 包含 Secrets 概覽列和診斷區段，會摘要 secret 診斷（為了可讀性而截斷），而不會停止報告的產生。
