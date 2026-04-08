---
summary: "CLI 參考資料：`openclaw logs` (透過 RPC 追蹤 Gateway 日誌)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "logs"
---

# `openclaw logs`

透過 RPC 追蹤 Gateway 檔案日誌 (適用於遠端模式)。

相關主題：

- 日誌概覽：[日誌](/en/logging)
- Gateway CLI：[gateway](/en/cli/gateway)

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
- 如果本機回環 Gateway 要求配對，`openclaw logs` 會自動回退至已設定的本機日誌檔。明確的 `--url` 目標不會使用此回退機制。
