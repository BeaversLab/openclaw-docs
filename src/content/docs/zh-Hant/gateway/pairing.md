---
summary: "Gateway-owned node pairing (Option B) for iOS and other remote nodes"
read_when:
  - Implementing node pairing approvals without macOS UI
  - Adding CLI flows for approving remote nodes
  - Extending gateway protocol with node management
title: "閘道擁有的配對"
---

在 Gateway-owned pairing 中，**Gateway** 是決定哪些節點允許加入的來源事實依據。UI（macOS app、未來的客戶端）只是用於批准或拒絕待處理請求的前端。

**重要提示：** WS 節點在 `connect` 期間使用 **device pairing**（角色 `node`）。
`node.pair.*` 是一個獨立的配對存儲，並**不**阻擋 WS 握手。
只有明確呼叫 `node.pair.*` 的客戶端才會使用此流程。

## 概念

- **待處理請求**：節點請求加入；需要批准。
- **已配對節點**：已批准並持有已發行 auth token 的節點。
- **傳輸**：Gateway WS 端點轉發請求但不決定成員資格。（舊版 TCP 橋接支援已被移除。）

## 配對運作方式

1. 節點連線至 Gateway WS 並請求配對。
2. Gateway 儲存一個 **pending request** 並發出 `node.pair.requested`。
3. 您批准或拒絕該請求（CLI 或 UI）。
4. 批准後，Gateway 會發行一個 **new token**（token 會在重新配對時輪換）。
5. 節點使用該 token 重新連線，現在即為「已配對」。

待處理請求會在 **5 分鐘** 後自動過期。

## CLI 工作流程（無頭友善）

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes remove --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` 顯示已配對/已連線的節點及其功能。

## API 介面（閘道通訊協定）

事件：

- `node.pair.requested` — 當建立新的待處理請求時發出。
- `node.pair.resolved` — 當請求被批准/拒絕/過期時發出。

方法：

- `node.pair.request` — 建立或重複使用待處理請求。
- `node.pair.list` — 列出待處理和已配對的節點（`operator.pairing`）。
- `node.pair.approve` — 批准待處理請求（發行 token）。
- `node.pair.reject` — 拒絕待處理請求。
- `node.pair.remove` — 移除過時的已配對節點項目。
- `node.pair.verify` — 驗證 `{ nodeId, token }`。

備註：

- `node.pair.request` 對於每個節點是冪等的：重複呼叫會傳回相同的待處理請求。
- 對同一待處理節點的重複請求也會重新整理儲存的節點
  中繼資料，以及最新的允許清單宣告指令快照，以供操作員檢視。
- 核准 **永遠** 會產生一個新的 token；`node.pair.request` 永遠不會傳回任何 token。
- 請求可能包含 `silent: true` 作為自動核准流程的提示。
- `node.pair.approve` 使用待處理請求中宣告的指令來強制執行額外的核准範圍：
  - 無指令請求：`operator.pairing`
  - 非執行指令請求：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which` 請求：
    `operator.pairing` + `operator.admin`

<Warning>
節點配對是一個信任與身份流程加上 token 發行。它 **不會** 針對每個節點鎖定即時節點指令表面。

- 即時節點指令來自節點在連線時宣告的內容，並在套用閘道的全域節點指令政策 (`gateway.nodes.allowCommands` 和 `denyCommands`) 之後生效。
- 每個節點的 `system.run` 允許與詢問政策存在於節點上的 `exec.approvals.node.*` 中，而不在配對記錄中。
  </Warning>

## 節點指令閘道 (2026.3.31+)

<Warning>**重大變更：** 從 `2026.3.31` 開始，節點指令將被停用，直到節點配對獲得核准。僅靠裝置配對已不再足以公開已宣告的節點指令。</Warning>

當節點首次連線時，會自動請求配對。在配對請求獲得核准之前，來自該節點的所有待處理節點指令都會被過濾，並且不會執行。一旦透過配對核准建立了信任，節點宣告的指令就會變為可用，但仍受一般指令政策約束。

這意味著：

- 先前僅依賴裝置配對來公開指令的節點，現在必須完成節點配對。
- 在配對核准之前排入佇列的指令會被捨棄，而不是延後執行。

## 節點事件信任邊界 (2026.3.31+)

<Warning>**重大變更：** 節點發起的執行現在保持在縮減的信任表面上。</Warning>

源自節點的摘要與相關會話事件限制在預期的信任表面上。先前依賴更廣泛主機或會話工具存取的通知驅動或節點觸發流程可能需要調整。這項強化措施確保節點事件無法升級超出節點信任邊界所允許的主機層級工具存取權。

## 自動核准（macOS 應用程式）

當符合以下條件時，macOS 應用程式可以選擇嘗試**靜音核准**：

- 請求已標記為 `silent`，且
- 應用程式能使用相同使用者驗證到閘道主機的 SSH 連線。

如果靜音核准失敗，它會回退到正常的「核准/拒絕」提示。

## Trusted-CIDR 裝置自動核准

`role: node` 的 WS 裝置配對預設仍保持手動。對於閘道已信任網路路徑的私有節點網路，操作員可以選擇使用明確的 CIDR 或確切 IP：

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

安全性邊界：

- 當未設定 `gateway.nodes.pairing.autoApproveCidrs` 時停用。
- 不存在全面的 LAN 或私有網路自動核准模式。
- 僅有沒有請求範圍的全新 `role: node` 裝置配對符合資格。
- 操作員、瀏覽器、控制 UI 和 WebChat 客戶端仍保持手動。
- 角色、範圍、中繼資料和公開金鑰升級仍保持手動。
- 相同主機的回送信任代理標頭路徑不符合資格，因為該路徑可能被本機呼叫者偽造。

## 中繼資料升級自動核准

當已配對的裝置重新連線時，若僅有非敏感的中繼資料變更（例如，顯示名稱或客戶端平台提示），OpenClaw 會將其視為 `metadata-upgrade`。靜音自動核准範圍狹窄：它僅適用於已證明擁有本機或共用憑證的信任非瀏覽器本機重新連線，包括 OS 版本中繼資料變更後的相同主機原生應用程式重新連線。瀏覽器/控制 UI 客戶端和遠端客戶端仍使用明確的重新核准流程。範圍升級（從讀取到寫入/管理員）和公開金鑰變更**不**符合中繼資料升級自動核准的資格——它們仍保持為明確的重新核准請求。

## QR 配對輔助工具

`/pair qr` 將配對載荷呈現為結構化媒體，以便行動裝置和瀏覽器客戶端可以直接掃描。

刪除裝置也會一併清除該裝置 ID 的任何過時待處理配對請求，因此 `nodes pending` 在撤銷後不會顯示孤立的資料列。

## 區域性與轉送標頭

僅當原始 socket 和任何上游代理證據一致時，Gateway 配對才會將連線視為 loopback。如果請求在 loopback 上到達，但攜帶指向非本機來源的 `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` 標頭，該轉送標頭證據將使 loopback 區域性主張無效。配對路徑隨後需要明確批准，而不是將請求靜默視為同主機連線。請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth) 以了解操作員認證的等效規則。

## 儲存（本機、私人）

配對狀態儲存在 Gateway 狀態目錄下（預設為 `~/.openclaw`）：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

如果您覆寫 `OPENCLAW_STATE_DIR`，`nodes/` 資料夾也會隨之移動。

安全備註：

- Token 是機密；請將 `paired.json` 視為敏感資料。
- 輪換 Token 需要重新批准（或刪除節點條目）。

## 傳輸行為

- 傳輸層是 **無狀態 (stateless)** 的；它不會儲存成員資格。
- 如果 Gateway 離線或停用配對，節點將無法配對。
- 如果 Gateway 處於遠端模式，配對仍然針對遠端 Gateway 的儲存庫進行。

## 相關

- [通道配對](/zh-Hant/channels/pairing)
- [節點](/zh-Hant/nodes)
- [裝置 CLI](/zh-Hant/cli/devices)
