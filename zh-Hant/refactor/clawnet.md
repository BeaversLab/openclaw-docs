---
summary: "Clawnet 重構：統一網路協議、角色、身份驗證、核准和身分"
read_when:
  - Planning a unified network protocol for nodes + operator clients
  - Reworking approvals, pairing, TLS, and presence across devices
title: "Clawnet 重構"
---

# Clawnet 重構（協議 + 身份驗證統一）

## 你好

嗨 Peter — 很棒的方向；這將帶來更簡單的 UX + 更強的安全性。

## 目的

一份單一且嚴謹的文件，用於說明：

- 目前狀態：協議、流程、信任邊界。
- 痛點：核准、多躍路由、UI 重複。
- 提議的新狀態：一種協議、限定範圍的角色、統一的身份驗證/配對、TLS 鎖定。
- 身分模型：穩定的 ID + 可愛的別名 (slug)。
- 遷移計畫、風險、未解決問題。

## 目標（來自討論）

- 適用於所有客戶端（Mac 應用程式、CLI、iOS、Android、無頭節點）的單一協議。
- 每個網路參與者都經過身份驗證 + 配對。
- 角色清晰度：節點 vs 操作員。
- 集中式核准會路由到使用者所在的位置。
- 所有遠端流量皆採用 TLS 加密 + 可選的 TLS 鎖定。
- 最少的程式碼重複。
- 單一機器應只出現一次（無 UI/節點重複項目）。

## 非目標（明確排除）

- 移除功能區隔（仍需最小權限原則）。
- 在不檢查範圍的情況下暴露完整的閘道控制平面。
- 讓身份驗證依賴人類可讀標籤（別名仍不具安全性）。

---

# 目前狀態（現況）

## 兩種協議

### 1) Gateway WebSocket（控制平面）

- 完整的 API 表面：設定、通道、模型、工作階段、Agent 執行、日誌、節點等。
- 預設綁定：loopback。透過 SSH/Tailscale 進行遠端存取。
- 身份驗證：透過 `connect` 使用 token/密碼。
- 無 TLS 鎖定（依賴 loopback/通道）。
- 程式碼：
  - `src/gateway/server/ws-connection/message-handler.ts`
  - `src/gateway/client.ts`
  - `docs/gateway/protocol.md`

### 2) Bridge（節點傳輸）

- 狹小的允許清單表面，節點身分 + 配對。
- 透過 TCP 傳輸的 JSONL；可選的 TLS + 憑證指紋鎖定。
- TLS 會在發現 TXT 記錄中宣傳指紋。
- 程式碼：
  - `src/infra/bridge/server/connection.ts`
  - `src/gateway/server-bridge.ts`
  - `src/node-host/bridge-client.ts`
  - `docs/gateway/bridge-protocol.md`

## 目前的控制平面客戶端

- CLI → 透過 `callGateway` (`src/gateway/call.ts`) 連接至 Gateway WS。
- macOS 應用程式 UI → 透過 `GatewayConnection` 連接至 Gateway WS。
- Web Control UI → Gateway WS。
- ACP → Gateway WS。
- 瀏覽器控制使用其專屬的 HTTP 控制伺服器。

## 目前的節點

- 處於節點模式的 macOS 應用程式會連接到 Gateway bridge (`MacNodeBridgeSession`)。
- iOS/Android 應用程式連接到 Gateway bridge。
- 配對 + 每個節點的 token 儲存在 gateway 上。

## 目前的審核流程

- Agent 透過 Gateway 使用 `system.run`。
- Gateway 透過 bridge 呼叫節點。
- 節點執行時決定審核。
- 由 mac 應用程式顯示 UI 提示 (當 node == mac 應用程式時)。
- 節點將 `invoke-res` 傳回給 Gateway。
- 多重跳躍，UI 綁定於節點主機。

## 目前的存在狀態與身分

- 來自 WS 客戶端的 Gateway 存在條目。
- 來自 bridge 的節點存在條目。
- mac 應用程式可能會為同一台機器顯示兩個條目 (UI + node)。
- 節點身分儲存在配對儲存庫中；UI 身分分開。

---

# 問題 / 痛點

- 需要維護兩個協定堆疊 (WS + Bridge)。
- 遠端節點上的審核：提示顯示在節點主機上，而非使用者所在位置。
- TLS pinning 僅存在於 bridge；WS 依賴 SSH/Tailscale。
- 身分重複：同一台機器顯示為多個執行個體。
- 角色不明確：UI + node + CLI 功能未清楚區分。

---

# 提議的新狀態

## 一個協定，兩個角色

單一 WS 協定，具備 role + scope。

- **角色：node** (功能主機)
- **角色：operator** (控制平面)
- operator 的選用 **scope**：
  - `operator.read` (狀態 + 檢視)
  - `operator.write` (agent 執行，傳送)
  - `operator.admin` (設定、頻道、模型)

### 角色行為

**Node**

- 可以註冊功能 (`caps`、`commands`、權限)。
- 可以接收 `invoke` 指令 (`system.run`、`camera.*`、`canvas.*`、`screen.record` 等)。
- 可以傳送事件：`voice.transcript`、`agent.request`、`chat.subscribe`。
- 無法呼叫 config/models/channels/sessions/agent 控制平面 API。

**Operator**

- 完整的控制平面 API，由 scope 限制。
- 接收所有審核。
- 不直接執行 OS 動作；路由至節點。

### 關鍵規則

角色是針對每個連線，而非每個裝置。裝置可能分別開啟這兩種角色。

---

# 統一驗證 + 配對

## 客戶端身份

每個客戶端提供：

- `deviceId` (穩定，衍生自裝置金鑰)。
- `displayName` (人類可讓名稱)。
- `role` + `scope` + `caps` + `commands`。

## 配對流程 (統一)

- 客戶端以未驗證身分連線。
- Gateway 針對該 `deviceId` 建立 **配對請求**。
- 操作員收到提示；批准/拒絕。
- Gateway 發行綁定至以下項目的憑證：
  - 裝置公開金鑰
  - 角色
  - 範圍
  - 能力/指令
- 客戶端保存權杖，以驗證身分重新連線。

## 裝置綁定驗證 (避免 bearer token 重放)

首選：裝置金鑰對。

- 裝置僅生成一次金鑰對。
- `deviceId = fingerprint(publicKey)`。
- Gateway 發送 nonce；裝置簽署；Gateway 驗證。
- 權杖發行給公開金鑰 (proof‑of‑possession)，而非字串。

替代方案：

- mTLS (用戶端憑證)：最強，但營運複雜度較高。
- 短期 bearer token 僅作為過渡階段 (輪替 + 提早撤銷)。

## 無聲批准 (SSH 啟發式)

精確定義以避免成為弱點。優先選擇其中之一：

- **僅限本機**：當客戶端透過 loopback/Unix socket 連線時自動配對。
- **透過 SSH 挑戰**：Gateway 發行 nonce；客戶端透過取得來證明 SSH 存取權。
- **實體在場時段**：在 Gateway 主機 UI 上進行本機批准後，允許在短時間內 (例如 10 分鐘) 自動配對。

始終記錄並保存自動批准記錄。

---

# 全面 TLS (開發 + 生產)

## 重複使用現有 bridge TLS

使用目前的 TLS 執行時期 + 指紋鎖定：

- `src/infra/bridge/server/tls.ts`
- `src/node-host/bridge-client.ts` 中的指紋驗證邏輯

## 套用至 WS

- WS 伺服器支援使用相同憑證/金鑰 + 指紋的 TLS。
- WS 用戶端可鎖定指紋 (選用)。
- 探索服務廣告所有端點的 TLS + 指紋。
  - 探索服務僅提供定位提示；絕不作為信任根。

## 為什麼

- 減少對 SSH/Tailscale 用於機密性的依賴。
- 讓遠端行動裝置連線預設即安全。

---

# 批准機制重新設計 (集中化)

## 目前

批准發生在節點主機 (mac app 節點執行時期)。提示會出現在節點執行的地方。

## 提議

批准由 **Gateway 託管**，UI 傳送至操作員用戶端。

### 新流程

1. Gateway 接收 `system.run` 意圖（agent）。
2. Gateway 建立批准記錄：`approval.requested`。
3. 操作員 UI 顯示提示。
4. 批准決定發送至 gateway：`approval.resolve`。
5. 若獲批准，Gateway 會叫用節點指令。
6. 節點執行並傳回 `invoke-res`。

### 批准語意（強化）

- 廣播給所有操作員；只有作用中的 UI 會顯示對話方塊（其餘顯示通知）。
- 首次解決方案優先；gateway 會拒絕後續的解決方案，因為已解決。
- 預設逾時：N 秒後拒絕（例如 60 秒），並記錄原因。
- 解決方案需要 `operator.approvals` 範圍。

## 效益

- 提示會顯示在使用者所在的位置（mac/手機）。
- 對遠端節點的批准一致性。
- 節點執行階段保持無介面；不依賴 UI。

---

# 角色範例

## iPhone app

- 用於：麥克風、相機、語音聊天、位置、按下對講的 **節點角色**。
- 選用的 **operator.read** 用於狀態和聊天檢視。
- 僅在明確啟用時才有選用的 **operator.write/admin**。

## macOS app

- 預設為操作員角色（控制 UI）。
- 啟用「Mac 節點」時為節點角色（system.run、畫面、相機）。
- 兩個連線使用相同的 deviceId → 合併的 UI 項目。

## CLI

- 始終為操作員角色。
- 範圍由子指令衍生：
  - `status`, `logs` → read
  - `agent`, `message` → write
  - `config`, `channels` → admin
  - approvals + pairing → `operator.approvals` / `operator.pairing`

---

# 身分 + slugs

## 穩定 ID

驗證所需；從不改變。
偏好：

- 金鑰指紋（公開金鑰雜湊）。

## 可愛的 slug（龍蝦主題）

僅供人類閱讀的標籤。

- 例如：`scarlet-claw`, `saltwave`, `mantis-pinch`。
- 儲存在 gateway 註冊表中，可編輯。
- 衝突處理：`-2`, `-3`。

## UI 分組

角色之間相同的 `deviceId` → 單一「執行個體」列：

- 徽章：`operator`, `node`。
- 顯示功能 + 上次出現時間。

---

# 移轉策略

## 階段 0：文件 + 對齊

- 發布此文件。
- 盤點所有協定呼叫 + 審核流程。

## 階段 1：在 WS 中新增角色/範圍

- 擴充 `connect` 參數，加入 `role`、`scope`、`deviceId`。
- 針對節點角色新增允許清單閘控。

## 階段 2：橋接器相容性

- 讓橋接器持續運作。
- 並行新增 WS 節點支援。
- 使用配置標誌來控管功能。

## 階段 3：中央審核

- 在 WS 中新增審核請求 + 解析事件。
- 更新 Mac 應用程式 UI 以進行提示與回應。
- 節點執行時停止提示 UI。

## 階段 4：TLS 統一

- 使用橋接器 TLS 執行時，為 WS 新增 TLS 配置。
- 新增釘選至用戶端。

## 階段 5：棄用橋接器

- 將 iOS/Android/mac 節點遷移至 WS。
- 將橋接器保留為備援；穩定後移除。

## 階段 6：裝置綁定驗證

- 要求所有非本機連線使用金鑰身分。
- 新增撤銷 + 輪換 UI。

---

# 安全性備註

- 在閘道邊界執行角色/允許清單。
- 沒有運維人員範圍的用戶端無法取得「完整」API。
- *所有*連線都需要配對。
- TLS + 釘選可降低行動裝置的中間人 (MITM) 風險。
- SSH 靜默審核是為了便利；仍會記錄且可撤銷。
- 探索絕不是信任錨點。
- 根據平台/類型，對伺服器允許清單驗證能力宣告。

# 串流 + 大型載荷 (節點媒體)

WS 控制平面適合小型訊息，但節點也會執行：

- 相機片段
- 螢幕錄製
- 音訊串流

選項：

1. WS 二進位框架 + 分塊 + 背壓規則。
2. 獨立串流端點 (仍需 TLS + 驗證)。
3. 針對媒體繁重指令延長橋接器使用時間，最後遷移。

實作前選擇其中一個，以避免分歧。

# 能力 + 指令政策

- 節點回報的能力/指令視為 **宣告**。
- 閘道執行各平台的允許清單。
- 任何新指令都需要運維人員審核或明確變更允許清單。
- 使用時間戳記稽核變更。

# 稽核 + 速率限制

- 記錄：配對請求、核准/拒絕、權杖核發/輪換/撤銷。
- 對配對垃圾訊息和審核提示進行速率限制。

# 協定衛生

- 明確的協定版本 + 錯誤代碼。
- 重新連線規則 + 心跳政策。
- Presence TTL 和上次可見語意。

---

# 未解決問題

1. 單一裝置執行兩種角色：權杖模型
   - 建議每個角色使用個別權杖 (節點 vs 運維人員)。
   - 相同的 deviceId；不同的作用域；更清晰的撤销。

2. 操作者作用域粒度
   - 讀取/寫入/管理員 + 批准 + 配對（最小可行）。
   - 考慮未來針對特定功能的作用域。

3. 令牌輪換 + 撤销 UX
   - 角色變更時自動輪換。
   - 透過 deviceId + 角色進行撤銷的 UI。

4. 探索
   - 擴展目前的 Bonjour TXT 以包含 WS TLS 指紋 + 角色提示。
   - 僅視為定位器提示。

5. 跨網絡批准
   - 廣播給所有操作者客戶端；作用中的 UI 顯示模態視窗。
   - 先回覆者獲勝；閘道執行原子性。

---

# 總結 (TL;DR)

- 目前：WS 控制平面 + Bridge 節點傳輸。
- 痛點：批准 + 重複 + 兩個堆疊。
- 提案：一個具有明確角色 + 作用域的 WS 協議，統一的配對 + TLS 釘選，由閘道託管的批准，穩定的裝置 ID + 可愛的 slugs。
- 結果：更簡單的 UX，更強的安全性，更少的重複，更好的移動路由。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
