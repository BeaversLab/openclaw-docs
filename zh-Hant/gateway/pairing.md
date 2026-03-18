---
summary: "適用於 iOS 和其他遠端節點的 Gateway 擁有的節點配對 (選項 B)"
read_when:
  - Implementing node pairing approvals without macOS UI
  - Adding CLI flows for approving remote nodes
  - Extending gateway protocol with node management
title: "Gateway 擁有的配對"
---

# Gateway 擁有的配對 (選項 B)

在 Gateway 擁有的配對中，**Gateway** 是允許哪些節點加入的唯一事實來源。UI (macOS 應用程式、未來的客戶端) 只是批准或拒絕待處理請求的前端。

**重要提示：** WS 節點在 `connect` 期間使用 **裝置配對** (角色 `node`)。
`node.pair.*` 是一個單獨的配對存儲，並且 **不** 會阻擋 WS 握手。
只有明確調用 `node.pair.*` 的客戶端才會使用此流程。

## 概念

- **待處理請求**：節點請求加入；需要批准。
- **已配對節點**：已獲批准並發佈了驗證權杖 的節點。
- **傳輸**：Gateway WS 端點轉發請求但不決定成員資格。(舊版 TCP 橋接支援已被棄用/移除。)

## 配對運作方式

1. 節點連接到 Gateway WS 並請求配對。
2. Gateway 存儲一個 **待處理請求** 並發出 `node.pair.requested`。
3. 您批准或拒絕該請求 (CLI 或 UI)。
4. 批准後，Gateway 會發佈一個 **新權杖** (重新配對時會輪替權杖)。
5. 節點使用該權杖重新連接，現在處於「已配對」狀態。

待處理請求會在 **5 分鐘** 後自動過期。

## CLI 工作流程 (適用於無介面環境)

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` 顯示已配對/已連接的節點及其功能。

## API 表面

事件：

- `node.pair.requested` — 當建立新的待處理請求時發出。
- `node.pair.resolved` — 當請求被批准/拒絕/過期時發出。

方法：

- `node.pair.request` — 建立或重用待處理請求。
- `node.pair.list` — 列出待處理和已配對的節點。
- `node.pair.approve` — 批准待處理請求 (發佈權杖)。
- `node.pair.reject` — 拒絕待處理請求。
- `node.pair.verify` — 驗證 `{ nodeId, token }`。

備註：

- `node.pair.request` 對於每個節點是等冪的：重複調用返回相同的
  待處理請求。
- 核准**總是**會產生一個新的 token；絕不會從 `node.pair.request` 返回任何 token。
- 請求可以包含 `silent: true` 作為自動核准流程的提示。

## 自動核准 (macOS 應用程式)

在以下情況下，macOS 應用程式可以選擇嘗試**無聲核准**：

- 請求已標記為 `silent`，且
- 應用程式可以使用相同使用者驗證到閘道主機的 SSH 連線。

如果無聲核准失敗，它會回退到正常的「核准/拒絕」提示。

## 儲存 (本機、私有)

配對狀態儲存在閘道狀態目錄下 (預設為 `~/.openclaw`)：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

如果您覆寫 `OPENCLAW_STATE_DIR`，`nodes/` 資料夾也會跟著移動。

安全注意事項：

- Token 是機密資訊；請將 `paired.json` 視為敏感資料處理。
- 輪換 token 需要重新核准 (或刪除節點項目)。

## 傳輸行為

- 傳輸是**無狀態** 的；它不儲存成員資格。
- 如果閘道離線或已停用配對，節點將無法配對。
- 如果閘道處於遠端模式，配對仍然是針對遠端閘道的儲存空間進行。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
