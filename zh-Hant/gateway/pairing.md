---
summary: "適用於 iOS 和其他遠端節點的 Gateway 擁有的節點配對（選項 B）"
read_when:
  - Implementing node pairing approvals without macOS UI
  - Adding CLI flows for approving remote nodes
  - Extending gateway protocol with node management
title: "Gateway 擁有的配對"
---

# Gateway 擁有的配對（選項 B）

在 Gateway 擁有的配對中，**Gateway** 是決定哪些節點被允許加入的唯一來源。UI（macOS 應用程式、未來的客戶端）只是批准或拒絕待處理請求的前端。

**重要提示：** WS 節點在 `connect` 期間使用 **裝置配對**（角色 `node`）。
`node.pair.*` 是一個獨立的配對存儲，並且**不**會阻擋 WS 握手。
只有明確呼叫 `node.pair.*` 的客戶端才會使用此流程。

## 概念

- **待處理請求**：節點請求加入；需要批准。
- **已配對節點**：已獲批准並持有已發行驗證令牌的節點。
- **傳輸**：Gateway WS 端點會轉發請求，但不決定成員資格。（舊版 TCP 橋接器支援已被棄用/移除。）

## 配對運作方式

1. 節點連線至 Gateway WS 並請求配對。
2. Gateway 會儲存**待處理請求** 並發出 `node.pair.requested`。
3. 您批准或拒絕請求（CLI 或 UI）。
4. 獲批准後，Gateway 會發出**新的權杖**（重新配對時會輪換權杖）。
5. 節點會使用權杖重新連線，現已「配對」。

待處理請求會在 **5 分鐘** 後自動過期。

## CLI 工作流程（適用於無介面環境）

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` 會顯示已配對/已連線的節點及其功能。

## API 表面（閘道通訊協定）

事件：

- `node.pair.requested` — 建立新的待處理請求時發出。
- `node.pair.resolved` — 請求被批准/拒絕/過期時發出。

方法：

- `node.pair.request` — 建立或重用待處理請求。
- `node.pair.list` — 列出待處理與已配對的節點。
- `node.pair.approve` — 批准待處理請求（發出 token）。
- `node.pair.reject` — 拒絕待處理請求。
- `node.pair.verify` — 驗證 `{ nodeId, token }`。

備註：

- `node.pair.request` 對每個節點是等冪的：重複呼叫會傳回相同的
  待處理請求。
- 批准**總是**會產生新的 token；`node.pair.request` 絕不會傳回任何 token。
- 請求可以包含 `silent: true` 作為自動批准流程的提示。

## 自動批准（macOS 應用程式）

當下列情況時，macOS 應用程式可以選擇嘗試**靜默批准**：

- 請求被標記為 `silent`，且
- 應用程式能使用相同的使用者驗證到閘道主機的 SSH 連線。

如果靜默審批失敗，它會退回到正常的「批准/拒絕」提示。

## 儲存（本地、私有）

配對狀態儲存在 Gateway 狀態目錄下（預設 `~/.openclaw`）：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

如果您覆寫 `OPENCLAW_STATE_DIR`，`nodes/` 資料夾也會隨之移動。

安全性說明：

- Token 是機密；請將 `paired.json` 視為敏感資料。
- 輪替 Token 需要重新審批（或刪除節點條目）。

## 傳輸行為

- 傳輸層是 **無狀態** 的；它不儲存成員資格。
- 如果 Gateway 離線或配對被停用，節點無法進行配對。
- 如果 Gateway 處於遠端模式，配對仍然會對遠端 Gateway 的儲存庫進行。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
