---
summary: "`openclaw status` 的 CLI 參考（診斷、探測、使用情況快照）"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable “all” status for debugging
title: "狀態"
---

# `openclaw status`

通道與會話的診斷資訊。

```exec
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

備註：

- `--deep` 會執行即時探測（WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal）。
- 當設定了多個代理程式時，輸出內容會包含每個代理程式的會話儲存庫。
- 概覽包含 Gateway + 節點主機服務的安裝/執行狀態（如有）。
- 概覽包含更新通道 + git SHA（針對原始碼簽出）。
- 更新資訊會顯示在概覽中；如果有可用的更新，狀態會列印提示以執行 `openclaw update`（請參閱[更新](/zh-Hant/install/updating)）。
- 唯讀狀態介面（`status`、`status --json`、`status --all`）會在可能時為其目標設定路徑解析支援的 SecretRefs。
- 如果設定了支援的通道 SecretRef 但在目前的指令路徑中無法使用，狀態將保持唯讀並報告降級輸出，而不是崩潰。人類可讀輸出會顯示諸如「configured token unavailable in this command path」（設定的 Token 在此指令路徑中無法使用）的警告，而 JSON 輸出則包含 `secretDiagnostics`。
- 當指令本地的 SecretRef 解析成功時，狀態會優先使用解析後的快照，並從最終輸出中清除暫時性的「secret unavailable」（密鑰不可用）通道標記。
- `status --all` 包含 Secrets 概觀列以及診斷區段，該區段總結密鑰診斷（為了可讀性而截斷），而不會停止報告生成。
