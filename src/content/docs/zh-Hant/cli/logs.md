---
summary: "CLI 參考資料：`openclaw logs` (透過 RPC 追蹤 Gateway 日誌)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "記錄"
---

# `openclaw logs`

透過 RPC 追蹤 Gateway 檔案日誌 (適用於遠端模式)。

相關主題：

- 日誌概述：[日誌記錄](/zh-Hant/logging)
- Gateway CLI：[gateway](/zh-Hant/cli/gateway)

## 選項

- `--limit <n>`：要傳回的日誌行數上限（預設值 `200`）
- `--max-bytes <n>`：要從日誌檔案讀取的最大位元組數（預設值 `250000`）
- `--follow`：持續追蹤日誌串流
- `--interval <ms>`：持續追蹤時的輪詢間隔（預設值 `1000`）
- `--json`：輸出以行分隔的 JSON 事件
- `--plain`：純文字輸出，不含樣式格式
- `--no-color`：停用 ANSI 顏色
- `--local-time`：以您的當地時區顯示時間戳記

## 共用的 Gateway RPC 選項

`openclaw logs` 也接受標準的 Gateway 客戶端旗標：

- `--url <url>`：Gateway WebSocket URL
- `--token <token>`：Gateway 權杖
- `--timeout <ms>`：逾時時間，單位為毫秒（預設值 `30000`）
- `--expect-final`：當 Gateway 呼叫由 agent 支援時，等待最終回應

當您傳遞 `--url` 時，CLI 不會自動套用設定檔或環境認證。如果目標 Gateway 需要驗證，請明確包含 `--token`。

## 範例

```bash
openclaw logs
openclaw logs --follow
openclaw logs --follow --interval 2000
openclaw logs --limit 500 --max-bytes 500000
openclaw logs --json
openclaw logs --plain
openclaw logs --no-color
openclaw logs --limit 500
openclaw logs --local-time
openclaw logs --follow --local-time
openclaw logs --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

## 備註

- 使用 `--local-time` 以您的當地時區顯示時間戳記。
- 如果隱式本地回環 Gateway 要求配對、在連接期間關閉，或者在 `logs.tail` 回應之前超時，`openclaw logs` 將自動回退到已配置的 Gateway 檔案日誌。明確的 `--url` 目標不會使用此回退機制。
- 在隱式本地 Gateway RPC 失敗後，`openclaw logs --follow` 不會跟隨配置的檔案後援路徑。在 Linux 上，如果可用，它會依 PID 使用作用中的使用者系統 systemd Gateway 日誌，並列印出選取的日誌來源；否則它會持續重試即時 Gateway，而不是追蹤可能過時的並存檔案。
- 使用 `--follow` 時，暫時性的 gateway 中斷（WebSocket 關閉、逾時、連線中斷）會觸發自動重新連線，並採用指數退避機制（最多重試 8 次，每次嘗試間隔上限為 30 秒）。每次重試時都會向 stderr 列印警告，並且當輪詢成功時會列印一次 `[logs] gateway reconnected` 通知。在 `--json` 模式下，重試警告和重新連線轉換都會以 `{"type":"notice"}` 記錄的形式發出到 stderr。無法復原的錯誤（驗證失敗、設定錯誤）仍會立即結束程式。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [Gateway 日誌記錄](/zh-Hant/gateway/logging)
