---
summary: "適用於 iOS 和其他遠端節點的閘道擁有配對（選項 B）"
read_when:
  - Implementing node pairing approvals without macOS UI
  - Adding CLI flows for approving remote nodes
  - Extending gateway protocol with node management
title: "閘道擁有配對"
---

# 閘道擁有配對（選項 B）

在閘道擁有配對中，**閘道**是判斷允許哪些節點加入的來源事實。UI（macOS 應用程式、未來的客戶端）只是用來批准或拒絕待處理請求的前端介面。

**重要提示：** WS 節點在 `connect` 期間使用 **裝置配對**（角色 `node`）。
`node.pair.*` 是一個獨立的配對存儲，並**不**對 WS 握手進行閘道控制。
只有明確呼叫 `node.pair.*` 的客戶端才會使用此流程。

## 概念

- **待處理請求**：節點請求加入；需要批准。
- **已配對節點**：已獲批准並發有驗證權杖的節點。
- **傳輸**：閘道 WS 端點轉發請求但不決定成員資格。（舊版 TCP 橋接支援已棄用/移除。）

## 配對運作方式

1. 節點連線至閘道 WS 並請求配對。
2. 閘道儲存**待處理請求**並發出 `node.pair.requested`。
3. 您批准或拒絕請求（CLI 或 UI）。
4. 批准後，閘道會發出**新權杖**（權杖會在重新配對時輪替）。
5. 節點使用權杖重新連線，此時即為「已配對」。

待處理請求會在 **5 分鐘** 後自動過期。

## CLI 工作流程（無頭友善）

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` 顯示已配對/已連線的節點及其功能。

## API 表面（閘道通訊協定）

事件：

- `node.pair.requested` — 建立新的待處理請求時發出。
- `node.pair.resolved` — 當請求被批准/拒絕/過期時發出。

方法：

- `node.pair.request` — 建立或重複使用待處理請求。
- `node.pair.list` — 列出待處理及已配對的節點。
- `node.pair.approve` — 批准待處理請求（發出權杖）。
- `node.pair.reject` — 拒絕待處理請求。
- `node.pair.verify` — 驗證 `{ nodeId, token }`。

備註：

- `node.pair.request` 對於每個節點是等冪的：重複呼叫會傳回相同的
  待處理請求。
- 核准**總是**會產生一個新的令牌；永遠不會從
  `node.pair.request` 回傳任何令牌。
- 請求可以包含 `silent: true` 作為自動核准流程的提示。

## 自動核准（macOS 應用程式）

macOS 應用程式可以選擇在以下情況嘗試 **靜音核准**：

- 請求被標記為 `silent`，並且
- 應用程式可以使用相同使用者驗證到 Gateway 主機的 SSH 連線。

如果靜音核准失敗，它將回退到正常的「核准/拒絕」提示。

## 儲存（本機、私有）

配對狀態儲存在 Gateway 狀態目錄下（預設為 `~/.openclaw`）：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

如果您覆寫 `OPENCLAW_STATE_DIR`，`nodes/` 資料夾會隨之移動。

安全性注意事項：

- 令牌是機密資訊；請將 `paired.json` 視為敏感資料。
- 輪替令牌需要重新核准（或刪除節點條目）。

## 傳輸行為

- 傳輸層是 **無狀態的**；它不儲存成員資格。
- 如果 Gateway 離線或配對已停用，節點將無法配對。
- 如果 Gateway 處於遠端模式，配對仍會對遠端 Gateway 的儲存庫進行。
