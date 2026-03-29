---
summary: "Clawnet 重構：統一網路協定、角色、驗證、核准、身分"
read_when:
  - Planning a unified network protocol for nodes + operator clients
  - Reworking approvals, pairing, TLS, and presence across devices
title: "Clawnet 重構"
---

# Clawnet 重構（協定 + 驗證統一）

## 你好

嗨 Peter —— 很好的方向；這將帶來更簡單的 UX 和更強的安全性。

## 目的

針對以下內容的單一、嚴謹的文件：

- 目前狀態：協定、流程、信任邊界。
- 痛點：核准、多躍點路由、UI 重複。
- 提議的新狀態：單一協定、限定範圍的角色、統一的驗證/配對、TLS 釘選。
- 身分模型：穩定的 ID + 可愛的代碼。
- 遷移計畫、風險、開放問題。

## 目標（來自討論）

- 適用於所有客戶端（mac app、CLI、iOS、Android、無頭節點）的單一協定。
- 每個網路參與者都已驗證 + 配對。
- 角色清晰度：節點 vs 操作員。
- 中央核准路由傳送至使用者所在位置。
- 對所有遠端流量進行 TLS 加密 + 可選的釘選。
- 最少的程式碼重複。
- 單一機器應僅出現一次（無 UI/節點重複項目）。

## 非目標（明確列出）

- 移除能力區隔（仍然需要最小權限原則）。
- 在不檢查範圍的情況下暴露完整的閘道控制平面。
- 使驗證依賴於人類可讀的標籤（代碼仍保持非安全性）。

---

# 目前狀態

## 兩種協定

### 1) Gateway WebSocket（控制平面）

- 完整的 API 介面：設定、頻道、模型、工作階段、代理執行、日誌、節點等。
- 預設綁定：loopback。透過 SSH/Tailscale 進行遠端存取。
- 驗證：透過 `connect` 進行 token/密碼驗證。
- 無 TLS 釘選（依賴 loopback/tunnel）。
- 程式碼：
  - `src/gateway/server/ws-connection/message-handler.ts`
  - `src/gateway/client.ts`
  - `docs/gateway/protocol.md`

### 2) Bridge（節點傳輸）

- 狹隘的允許清單介面、節點身分 + 配對。
- TCP 上的 JSONL；可選的 TLS + 憑證指紋釘選。
- TLS 在探索 TXT 中廣告指紋。
- 程式碼：
  - `src/infra/bridge/server/connection.ts`
  - `src/gateway/server-bridge.ts`
  - `src/node-host/bridge-client.ts`
  - `docs/gateway/bridge-protocol.md`

## 目前控制平面客戶端

- CLI → Gateway WS 透過 `callGateway` (`src/gateway/call.ts`)。
- macOS app UI → Gateway WS (`GatewayConnection`)。
- Web Control UI → Gateway WS。
- ACP → Gateway WS。
- 瀏覽器控制使用其自己的 HTTP 控制伺服器。

## 目前的節點

- 處於節點模式的 macOS 應用程式會連線到 Gateway bridge (`MacNodeBridgeSession`)。
- iOS/Android 應用程式連線到 Gateway bridge。
- 配對 + 每個節點的 token 儲存在 gateway 上。

## 目前的審核流程

- Agent 透過 Gateway 使用 `system.run`。
- Gateway 透過 bridge 叫用節點。
- 節點執行階段決定是否核准。
- UI 提示由 mac 應用程式顯示 (當 node == mac 應用程式時)。
- 節點傳回 `invoke-res` 給 Gateway。
- 多躍點，UI 綁定到節點主機。

## 目前的存在狀態與身分識別

- 來自 WS 用戶端的 Gateway 存在項目。
- 來自 bridge 的節點存在項目。
- mac 應用程式可以針對同一台機器顯示兩個項目 (UI + node)。
- 節點身分儲存在配對儲存中；UI 身分分開。

---

# 問題 / 痛點

- 需要維護兩個通訊協定堆疊 (WS + Bridge)。
- 遠端節點上的審核：提示會顯示在節點主機上，而不是使用者所在的位置。
- TLS pinning 僅存在於 bridge；WS 依賴 SSH/Tailscale。
- 身分重複：同一台機器顯示為多個執行個體。
- 角色不明確：UI + node + CLI 功能未清楚區分。

---

# 提議的新狀態

## 一個通訊協定，兩種角色

單一 WS 通訊協定，帶有角色 + 範圍。

- **角色：node** (能力主機)
- **角色：operator** (控制平面)
- 操作員的選用 **範圍**：
  - `operator.read` (狀態 + 檢視)
  - `operator.write` (agent 執行、傳送)
  - `operator.admin` (組態、通道、模型)

### 角色行為

**節點**

- 可以註冊能力 (`caps`、`commands`、權限)。
- 可以接收 `invoke` 指令 (`system.run`、`camera.*`、`canvas.*`、`screen.record` 等)。
- 可以傳送事件：`voice.transcript`、`agent.request`、`chat.subscribe`。
- 無法呼叫組態/模型/通道/工作階段/agent 控制平面 API。

**操作員**

- 完整的控制平面 API，受範圍限制。
- 接收所有審核。
- 不直接執行 OS 動作；路由到節點。

### 關鍵規則

角色是每個連線，而非每個裝置。裝置可能會分別開啟兩種角色。

---

# 統一驗證 + 配對

## 客戶端身分

每個客戶端提供：

- `deviceId` （穩定，從裝置金鑰衍生）。
- `displayName` （人類可讓名稱）。
- `role` + `scope` + `caps` + `commands`。

## 配對流程（統一）

- 客戶端以未驗證身分連線。
- 閘道為該 `deviceId` 建立配對請求。
- 操作員收到提示；批准或拒絕。
- 閘道發佈綁定至以下內容的憑證：
  - 裝置公鑰
  - 角色
  - 範圍
  - 功能/指令
- 客戶端保存權杖，以已驗證身分重新連線。

## 裝置綁定驗證（避免持有人權杖重放）

首選：裝置金鑰對。

- 裝置僅產生一次金鑰對。
- `deviceId = fingerprint(publicKey)`。
- 閘道發送 nonce；裝置簽署；閘道驗證。
- 權杖是發佈給公鑰（擁有證明），而不是字串。

替代方案：

- mTLS（用戶端憑證）：最強，但運維複雜度較高。
- 短期持有人權杖僅作為臨時階段（輪換並提前撤銷）。

## 靜默批准（SSH 啟發式）

精確定義以避免弱點。優先選擇其中之一：

- **僅限本地**：當客戶端透過 loopback/Unix socket 連線時自動配對。
- **透過 SSH 挑戰**：閘道發送 nonce；客戶端透過擷取證明 SSH 存取權。
- **實體存在視窗**：在閘道主機 UI 上進行本地批准後，允許在短時間內（例如 10 分鐘）自動配對。

始終記錄並記錄自動批准。

---

# 無處不在的 TLS（開發 + 生產）

## 重複使用現有的橋接器 TLS

使用目前的 TLS 執行時期 + 指紋鎖定：

- `src/infra/bridge/server/tls.ts`
- `src/node-host/bridge-client.ts` 中的指紋驗證邏輯

## 應用於 WS

- WS 伺服器支援使用相同憑證/金鑰 + 指紋的 TLS。
- WS 用戶端可以鎖定指紋（選用）。
- 探索服務會為所有端點廣播 TLS + 指紋。
  - 探索服務僅提供定位提示；絕不作為信任根。

## 原因

- 減少對 SSH/Tailscale 用於機密性的依賴。
- 預設確保遠端行動連線的安全性。

---

# 批准重新設計（集中式）

## 目前

批准發生在節點主機上（mac app node runtime）。提示出現在節點執行的地方。

## 提議

批准由**閘道託管**，UI 傳送到操作員用戶端。

### 新流程

1. Gateway 接收 `system.run` 意圖（代理程式）。
2. Gateway 建立批准記錄：`approval.requested`。
3. 操作員 UI 顯示提示。
4. 批准決定發送至 gateway：`approval.resolve`。
5. 若獲批准，Gateway 會叫用節點指令。
6. 節點執行並傳回 `invoke-res`。

### 批准語意（強化）

- 廣播給所有操作員；只有作用中的 UI 會顯示強制回應視窗（其餘則顯示通知）。
- 首個解決方案優先；gateway 會拒絕後續的解決方案，因為已定案。
- 預設逾時：N 秒後拒絕（例如 60 秒），並記錄原因。
- 解決方案需要 `operator.approvals` 範圍。

## 優點

- 提示會出現在用戶所在位置（mac/phone）。
- 遠端節點的批准方式一致。
- 節點執行時期保持無介面；不依賴 UI。

---

# 角色清晰範例

## iPhone 應用程式

- 適用於麥克風、相機、語音聊天、位置、按壓對談的 **節點角色**。
- 選用的 **operator.read** 用於狀態與聊天檢視。
- 僅在明確啟用時才有選用的 **operator.write/admin**。

## macOS 應用程式

- 預設為操作員角色（控制 UI）。
- 啟用「Mac 節點」時為節點角色（system.run、螢幕、相機）。
- 兩種連線使用相同的 deviceId → 合併 UI 項目。

## CLI

- 始終為操作員角色。
- 範圍衍生自子指令：
  - `status`, `logs` → read
  - `agent`, `message` → write
  - `config`, `channels` → admin
  - approvals + pairing → `operator.approvals` / `operator.pairing`

---

# 身分識別 + Slugs

## 穩定 ID

授權所需；永不變更。
偏好：

- 金鑰對指紋（公鑰雜湊）。

## 可愛的 slug（龍蝦主題）

僅供人類閱讀的標籤。

- 例如：`scarlet-claw`, `saltwave`, `mantis-pinch`。
- 儲存在 gateway 登錄中，可編輯。
- 衝突處理：`-2`, `-3`。

## UI 分組

跨角色使用相同的 `deviceId` → 單一「實例」資料列：

- 徽章：`operator`, `node`。
- 顯示功能 + 上次出現時間。

---

# 移轉策略

## 階段 0：文件 + 對齊

- 發布此文件。
- 盤點所有通訊協定呼叫 + 審核流程。

## 階段 1：為 WS 新增角色/範圍

- 使用 `role`、`scope`、`deviceId` 擴展 `connect` 參數。
- 為節點角色新增允許清單閘控。

## 階段 2：橋接相容性

- 保持橋接運作中。
- 並行新增 WS 節點支援。
- 透過配置標誌對功能進行閘控。

## 階段 3：集中式審核

- 在 WS 中新增審核請求 + 解決事件。
- 更新 Mac 應用程式 UI 以進行提示 + 回應。
- 節點執行時停止提示 UI。

## 階段 4：TLS 統一

- 使用橋接 TLS 執行時為 WS 新增 TLS 配置。
- 為用戶端新增固定。

## 階段 5：棄用橋接

- 將 iOS/Android/mac 節點遷移至 WS。
- 保留橋接作為後備方案；穩定後移除。

## 階段 6：裝置綁定驗證

- 要求所有非本機連線使用金鑰身分識別。
- 新增撤銷 + 輪換 UI。

---

# 安全性備註

- 角色/允許清單在閘道邊界強制執行。
- 沒有任何用戶端能在未具備操作員範圍的情況下存取「完整」API。
- 所有連線都需要配對。
- TLS + 固定可降低行動裝置的中間人攻擊風險。
- SSH 靜默審核是為了便利性；但仍會被記錄且可撤銷。
- 探索功能絕不會作為信任錨點。
- 能力聲明會根據平台/類型，由伺服器允許清單進行驗證。

# 串流 + 大型酬載 (節點媒體)

WS 控制平面適合小型訊息，但節點也會執行：

- 相機片段
- 螢幕錄製
- 音訊串流

選項：

1. WS 二進位框架 + 分塊 + 背壓規則。
2. 獨立的串流端點 (仍具 TLS + 驗證)。
3. 保留橋接較長時間以處理大量媒體的指令，最後遷移。

在實作之前選擇其中一種，以避免偏離。

# 能力 + 指令政策

- 節點回報的能力/指令被視為**聲明**。
- 閘道強制執行各平台的允許清單。
- 任何新指令都需要操作員審核或明確變更允許清單。
- 使用時間戳記稽核變更。

# 稽核 + 速率限制

- 記錄：配對請求、審核/拒絕、權杖簽發/輪換/撤銷。
- 對配對垃圾訊息和審核提示進行速率限制。

# 通訊協定衛生

- 明確的通訊協定版本 + 錯誤碼。
- 重新連線規則 + 心跳政策。
- 上線 TTL 和最後上線時間語意。

---

# 未決問題

1. 單一裝置同時執行兩種角色：權杖模型
   - 建議每個角色使用獨立的權杖 (節點與操作員)。
   - 相同的 deviceId；不同的範圍；更清晰的撤銷。

2. 操作員範圍的細粒度
   - 讀取/寫入/管理員 + 審批 + 配對（最小可行性）。
   - 後續考慮針對每個功能的範圍。

3. 令牌輪換 + 撤銷 UX
   - 角色變更時自動輪換。
   - 透過 deviceId + 角色進行撤銷的 UI。

4. 發現
   - 擴展目前的 Bonjour TXT 以包含 WS TLS 指紋 + 角色提示。
   - 僅將其視為定位器提示。

5. 跨網路審批
   - 廣播給所有操作員客戶端；使用中的 UI 顯示模態視窗。
   - 先回應者優先；閘道強制執行原子性。

---

# 摘要 (TL;DR)

- 目前：WS 控制平面 + Bridge 節點傳輸。
- 痛點：審批 + 重複 + 兩個堆疊。
- 提議：一個具有明確角色 + 範圍的 WS 協定，統一的配對 + TLS 釘選，由閘道託管的審批，穩定的裝置 ID + 可愛的 slug。
- 結果：更簡單的 UX，更強的安全性，更少的重複，更好的行動路由。
