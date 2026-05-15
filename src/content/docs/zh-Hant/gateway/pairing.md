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
4. 獲得批准時，Gateway 會發出一個**新令牌**（令牌在重新配對時會輪替）。
5. 節點使用該令牌重新連接，此時即為「已配對」狀態。

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

- `node.pair.requested` - 當建立新的待處理請求時發出。
- `node.pair.resolved` - 當請求被批准/拒絕/過期時發出。

方法：

- `node.pair.request` - 建立或重用待處理請求。
- `node.pair.list` - 列出待處理和已配對的節點 (`operator.pairing`)。
- `node.pair.approve` - 批准待處理請求（發出令牌）。
- `node.pair.reject` - 拒絕待處理請求。
- `node.pair.remove` - 移除過時的已配對節點條目。
- `node.pair.verify` - 驗證 `{ nodeId, token }`。

備註：

- `node.pair.request` 對於每個節點是冪等的：重複呼叫會傳回相同的待處理請求。
- 對同一待處理節點的重複請求也會重新整理儲存的節點
  中繼資料，以及最新的允許清單宣告指令快照，以供操作員檢視。
- 核准 **永遠** 會產生一個新的 token；`node.pair.request` 永遠不會傳回任何 token。
- 操作員範圍層級和批准時的檢查已總結於
  [Operator scopes](/zh-Hant/gateway/operator-scopes)。
- 請求可能包含 `silent: true` 作為自動核准流程的提示。
- `node.pair.approve` 使用待處理請求中宣告的指令來執行
  額外的批准範圍：
  - 無指令請求：`operator.pairing`
  - 非執行指令請求：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which` 請求：
    `operator.pairing` + `operator.admin`

<Warning>
節點配對是一個信任與身分流程加上令牌發行。它**不**會針對每個節點固定即時節點指令介面。

- 即時節點指令來自節點在連線時所宣告的內容，且需在套用 Gateway 的全域節點指令原則 (`gateway.nodes.allowCommands` 和 `denyCommands`) 之後。
- 針對單一節點的 `system.run` 允許與詢問原則存在於節點的 `exec.approvals.node.*` 中，而非配對記錄裡。

</Warning>

## 節點指令閘道 (2026.3.31+)

<Warning>**重大變更：** 自 `2026.3.31` 起，節點指令將在節點配對獲得批准前停用。僅靠裝置配對已不足以公開宣告的節點指令。</Warning>

當節點首次連接時，會自動請求配對。在配對請求獲得批准之前，來自該節點的所有待處理節點命令都會被過濾，且不會執行。一旦通過配對批准建立了信任，該節點聲明的命令即會變為可用，但仍需遵守正常的命令策略。

這意味著：

- 先前僅依賴裝置配對來公開命令的節點，現在必須完成節點配對。
- 在配對批准前排入佇列的命令會被捨棄，而非延遲。

## 節點事件信任邊界 (2026.3.31+)

<Warning>**重大變更：** 節點發起的執行現保持在縮減的信任表面上。</Warning>

節點發起的摘要及相關會話事件僅限於預期的信任表面。先前依賴更廣泛的主機或會話工具存取的通知驅動或節點觸發流程，可能需要調整。此強化措施確保節點事件無法升級為超出節點信任邊界允許範圍的主機級工具存取權。

持久化的節點存在狀態更新遵循相同的身分邊界。僅接受來自已驗證節點裝置會話的 `node.presence.alive` 事件，並且僅當裝置/節點身分已配對時才會更新配對元資料。自行宣告的 `client.id` 值不足以寫入最後一次看見的狀態。

## 自動批准 (macOS 應用程式)

macOS 應用程式可以在下列情況下嘗試 **靜默批准**：

- 請求已標記為 `silent`，且
- 應用程式能夠使用相同的使用者驗證到閘道主機的 SSH 連線。

如果靜默批准失敗，它會回退到正常的「批准/拒絕」提示。

## 受信任 CIDR 裝置自動批准

`role: node` 的 WS 裝置配對預設仍為手動。對於閘道已信任網路路徑的私人節點網路，操作員可以選擇加入並指定明確的 CIDR 或確切 IP：

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
- 不存在全面的 LAN 或私人網路自動批准模式。
- 只有未請求範圍的全新 `role: node` 裝置配對才符合資格。
- 操作員、瀏覽器、Control UI 和 WebChat 用戶端仍保持手動。
- 角色、範圍、元資料和公開金鑰升級仍保持手動。
- 相同主機的回送受信任代理標頭路徑不符合資格，因為該路徑可以被本機呼叫者偽造。

## 元數據升級自動核准

當已配對的裝置重新連線且僅涉及非敏感元數據變更（例如，顯示名稱或客戶端平台提示）時，OpenClaw 會將其視為 `metadata-upgrade`。靜默自動核准的範圍很窄：僅適用於已證明擁有本機或共用憑證的受信任非瀏覽器本機重新連線，包括在 OS 版本元數據變更後的相同主機原生應用程式重新連線。瀏覽器/控制 UI 客戶端和遠端客戶端仍使用明確的重新核准流程。範圍升級（從讀取到寫入/管理員）和公開金鑰變更**不**符合元數據升級自動核准的資格——它們仍保持為明確的重新核准請求。

## QR 配對輔助工具

`/pair qr` 將配對載荷渲染為結構化媒體，以便行動裝置和瀏覽器客戶端可以直接掃描它。

刪除裝置也會清除該裝置 ID 的任何過期擱置配對請求，因此 `nodes pending` 在撤銷後不會顯示孤立的行。

## 本地性和轉發標頭

只有當原始 socket 和任何上游代理證據一致時，Gateway 配對才會將連線視為回送。如果請求到達回送但攜帶指向非本地來源的 `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` 標頭，則該轉發標頭證據將使回送本地性聲明無效。然後，配對路徑需要明確核准，而不是將請求靜默視為相同主機連線。有關操作員認證的等效規則，請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth)。

## 儲存（本地，私有）

配對狀態儲存在 Gateway 狀態目錄下（預設為 `~/.openclaw`）：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

如果您覆寫 `OPENCLAW_STATE_DIR`，則 `nodes/` 資料夾會隨之移動。

安全說明：

- Token 是機密；請將 `paired.json` 視為敏感資訊。
- 輪換 Token 需要重新核准（或刪除節點條目）。

## 傳輸行為

- 傳輸層是**無狀態**的；它不存儲成員資格。
- 如果閘道離線或配對已停用，節點將無法配對。
- 如果閘道處於遠端模式，配對仍會針對遠端閘道的存儲進行。

## 相關

- [頻道配對](/zh-Hant/channels/pairing)
- [節點](/zh-Hant/nodes)
- [裝置 CLI](/zh-Hant/cli/devices)
