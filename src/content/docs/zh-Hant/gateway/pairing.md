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
- **傳輸**：Gateway WS 端點轉發請求但不決定成員資格。（已移除舊版 TCP 橋接支援。）

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
- `node.pair.list` — 列出待處理與已配對的節點 (`operator.pairing`)。
- `node.pair.approve` — 批准待處理請求（發行 token）。
- `node.pair.reject` — 拒絕待處理請求。
- `node.pair.verify` — 驗證 `{ nodeId, token }`。

備註：

- `node.pair.request` 對每個節點是冪等的：重複呼叫會回傳相同的待處理請求。
- 對同一待處理節點的重複請求也會重新整理儲存的節點
  中繼資料，以及最新的允許清單宣告指令快照，以供操作員檢視。
- 批准操作**總是**會產生新的 token；`node.pair.request` 絕不會回傳任何 token。
- 請求可能包含 `silent: true` 作為自動批准流程的提示。
- `node.pair.approve` 使用待處理請求中宣告的指令來強制執行額外的批准範圍：
  - 無指令請求：`operator.pairing`
  - 非 exec 指令請求：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which` 請求：
    `operator.pairing` + `operator.admin`

重要：

- 節點配對是一個信任/身分流程加上 token 發行。
- 它**不會**鎖定每個節點的即時節點指令介面。
- 即時節點指令來自節點在連線時所宣告的內容，並在套用 gateway 的全域節點指令政策 (`gateway.nodes.allowCommands` / `denyCommands`) 後生效。
- 個別節點的 `system.run` allow/ask 政策存在於節點的 `exec.approvals.node.*` 中，而非配對記錄裡。

## 節點指令閘道 (2026.3.31+)

<Warning>**重大變更**：自 `2026.3.31` 起，節點指令在批准節點配對前會停用。僅憑裝置配對已不足以公開已宣告的節點指令。</Warning>

當節點首次連線時，會自動請求配對。在配對請求獲批准之前，來自該節點的所有待處理節點指令都會被過濾且不會執行。一旦透過配對批准建立信任，該節點宣告的指令即會依正常指令政策提供使用。

這意味著：

- 先前僅依賴裝置配對來公開命令的節點，現在必須完成節點配對。
- 在配對獲准前排隊的命令會被捨棄，而不會延後。

## 節點事件信任邊界 (2026.3.31+)

<Warning>**重大變更：** 節點發起的執行現在會停留在縮減的信任表面上。</Warning>

節點發起的摘要及相關工作階段事件會被限制在預期的信任表面上。先前依賴更廣泛主機或工作階段工具存取的通知驅動或節點觸發流程，可能需要進行調整。此強化措施確保節點事件無法提升至超出節點信任邊界所允許的主機層級工具存取權。

## 自動核准 (macOS 應用程式)

macOS 應用程式可以選擇在下列情況下嘗試 **無聲核准**：

- 請求被標記為 `silent`，且
- 應用程式可以使用相同使用者驗證與 Gateway 主機的 SSH 連線。

如果無聲核准失敗，它會回退到正常的「核准/拒絕」提示。

## 儲存 (本機，私有)

配對狀態儲存在 Gateway 狀態目錄下 (預設為 `~/.openclaw`)：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

如果您覆寫 `OPENCLAW_STATE_DIR`，`nodes/` 資料夾會隨之移動。

安全性備註：

- 權杖是機密；請將 `paired.json` 視為敏感資料。
- 輪替權杖需要重新核准 (或刪除節點項目)。

## 傳輸行為

- 傳輸層是 **無狀態** 的；它不會儲存成員資格。
- 如果 Gateway 離線或配對已停用，節點將無法配對。
- 如果 Gateway 處於遠端模式，配對仍會對遠端 Gateway 的存放區進行。
