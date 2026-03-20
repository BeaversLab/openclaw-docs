---
summary: "適用於 iOS 與其他遠端節點的 Gateway 擁有節點配對（選項 B）"
read_when:
  - 實作無需 macOS UI 的節點配對核准
  - 新增用於核准遠端節點的 CLI 流程
  - 透過節點管理擴展 Gateway 協議
title: "Gateway 擁有的配對"
---

# Gateway 擁有的配對（選項 B）

在 Gateway 擁有的配對中，**Gateway** 是決定哪些節點可加入的唯一依據。UI（macOS 應用程式、未來的客戶端）僅是用來核准或拒絕待處理請求的前端介面。

**重要提示：** WS 節點在 `connect` 期間使用 **裝置配對**（角色 `node`）。
`node.pair.*` 是一個獨立的配對儲存庫，並**不**負責把關 WS 握手。
只有明確呼叫 `node.pair.*` 的客戶端會使用此流程。

## 概念

- **待處理請求（Pending request）**：節點請求加入；需要核准。
- **已配對節點（Paired node）**：已核准並獲發驗證權杖的節點。
- **傳輸**：Gateway WS 端點僅轉送請求，不決定成員資格。（舊版 TCP 橋接支援已棄用/移除。）

## 配對運作方式

1. 節點連線至 Gateway WS 並請求配對。
2. Gateway 會儲存一個 **待處理請求** 並發出 `node.pair.requested`。
3. 您核准或拒絕該請求（透過 CLI 或 UI）。
4. 核准後，Gateway 會發出一個 **新權杖**（權杖在重新配對時會輪替）。
5. 節點使用該權杖重新連線，此時即「已配對」。

待處理請求會在 **5 分鐘** 後自動過期。

## CLI 工作流程（適合無介面環境）

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` 顯示已配對/已連線的節點及其功能。

## API 介面（Gateway 協議）

事件：

- `node.pair.requested` — 當建立新的待處理請求時發出。
- `node.pair.resolved` — 當請求被核准/拒絕/過期時發出。

方法：

- `node.pair.request` — 建立或重用待處理請求。
- `node.pair.list` — 列出待處理與已配對的節點。
- `node.pair.approve` — 核准待處理請求（發出權杖）。
- `node.pair.reject` — 拒絕待處理請求。
- `node.pair.verify` — 驗證 `{ nodeId, token }`。

備註：

- `node.pair.request` 對於每個節點是等冪的：重複呼叫會傳回相同的待處理請求。
- 核准**總是**會產生一個新的 token；`node.pair.request` 從不傳回任何 token。
- 請求可以包含 `silent: true` 作為自動核准流程的提示。

## 自動核准 (macOS app)

當以下情況時，macOS app 可以選擇嘗試**靜默核准**：

- 該請求被標記為 `silent`，且
- 該 app 能使用相同的使用者驗證到 Gateway 主機的 SSH 連線。

如果靜默核准失敗，它會回退到正常的「核准/拒絕」提示。

## 儲存 (本機, 私有)

配對狀態儲存在 Gateway 狀態目錄下 (預設為 `~/.openclaw`)：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

如果您覆寫 `OPENCLAW_STATE_DIR`，`nodes/` 資料夾會隨之移動。

安全性注意事項：

- Token 是機密；請將 `paired.json` 視為敏感資料。
- 輪換 token 需要重新核准 (或刪除節點條目)。

## 傳輸行為

- 傳輸是**無狀態**的；它不儲存成員資格。
- 如果 Gateway 離線或停用配對，節點將無法配對。
- 如果 Gateway 處於遠端模式，配對仍會針對遠端 Gateway 的儲存空間進行。

import en from "/components/footer/en.mdx";

<en />
