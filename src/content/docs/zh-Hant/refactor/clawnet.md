---
summary: "Clawnet 重構：統一網路協定、角色、認證、批准、身份"
read_when:
  - Planning a unified network protocol for nodes + operator clients
  - Reworking approvals, pairing, TLS, and presence across devices
title: "Clawnet 重構"
---

# Clawnet 重構（協定 + 認證統一）

## 你好

嗨 Peter — 方向很棒；這能帶來更簡單的 UX + 更強的安全性。

## 目的

一份單一、嚴謹的文件用於：

- 當前狀態：協定、流程、信任邊界。
- 痛點：批准、多跳路由、UI 重複。
- 提議的新狀態：一個協定、限定範圍的角色、統一的認證/配對、TLS 釘選。
- 身份模型：穩定的 ID + 可愛的短名稱。
- 遷移計畫、風險、未解決的問題。

## 目標（來自討論）

- 適用於所有客戶端（mac 應用、CLI、iOS、Android、無頭節點）的單一協定。
- 每個網路參與者都經過認證 + 配對。
- 角色清晰度：節點與運營商。
- 中央批准路由傳送到用戶所在的位置。
- 所有遠端流量皆使用 TLS 加密 + 可選的憑證固定（pinning）。
- 最小化程式碼重複。
- 單一機器應僅顯示一次（無 UI/node 重複項目）。

## 非目標（明確排除）

- 移除能力分離（仍需遵循最小權限原則）。
- 在不進行範圍檢查的情況下公開完整的閘道控制平面。
- 讓認證依賴人類可讀的標籤（slug 保持非安全性用途）。

---

# 現行狀態（as‑is）

## 兩種協定

### 1) Gateway WebSocket（控制平面）

- 完整的 API 表面：設定、頻道、模型、工作階段、代理執行、記錄、節點等。
- 預設綁定：loopback。透過 SSH/Tailscale 進行遠端存取。
- 認證：透過 `connect` 進行 token/密碼驗證。
- 無 TLS 固定（依賴 loopback/通道）。
- 程式碼：
  - `src/gateway/server/ws-connection/message-handler.ts`
  - `src/gateway/client.ts`
  - `docs/gateway/protocol.md`

### 2) Bridge（節點傳輸）

- 狹隘的允許清單表面、節點身分識別 + 配對。
- TCP 上的 JSONL；可選 TLS + 憑證指紋鎖定。
- TLS 在探索 TXT 中廣告指紋。
- 代碼：
  - `src/infra/bridge/server/connection.ts`
  - `src/gateway/server-bridge.ts`
  - `src/node-host/bridge-client.ts`
  - `docs/gateway/bridge-protocol.md`

## 目前的控制平面客戶端

- CLI → 透過 `callGateway` 連接至 Gateway WS (`src/gateway/call.ts`)。
- macOS 應用程式 UI → Gateway WS (`GatewayConnection`)。
- Web Control UI → Gateway WS。
- ACP → Gateway WS。
- 瀏覽器控制使用自己的 HTTP 控制伺服器。

## 目前的節點

- 節點模式下的 macOS 應用程式連接至 Gateway bridge (`MacNodeBridgeSession`)。
- iOS/Android 應用程式連接至 Gateway bridge。
- 配對 + 每節點 token 儲存在 gateway 上。

## 目前的審核流程

- Agent 透過 Gateway 使用 `system.run`。
- Gateway 透過 bridge 呼叫節點。
- 節點執行環境決定審核。
- 由 Mac 應用程式顯示的 UI 提示（當 node == mac app 時）。
- 節點向 Gateway 傳回 `invoke-res`。
- 多跳，UI 繫結至節點主機。

## 目前的狀態 + 身份識別

- 來自 WS 客戶端的 Gateway 狀態條目。
- 來自 bridge 的節點狀態條目。
- Mac 應用程式可以為同一台機器顯示兩個條目（UI + 節點）。
- 節點身分識別儲存在配對儲存庫中；UI 身分識別分開。

---

# 問題 / 痛點

- 需要維護兩個協定堆疊（WS + Bridge）。
- 遠端節點上的核准：提示顯示在節點主機上，而不是使用者所在的位置。
- TLS pinning 僅存在於 bridge；WS 依賴 SSH/Tailscale。
- 身分識別重複：同一台機器顯示為多個實例。
- 角色不明確：UI + 節點 + CLI 功能未清楚區分。

---

# 提議的新狀態（Clawnet）

## 一種協定，兩種角色

單一 WS 協定，帶有角色 + 範圍。

- **角色：節點**（功能主機）
- **角色：操作員**（控制平面）
- 操作員的選用 **範圍**：
  - `operator.read` (狀態 + 檢視)
  - `operator.write` (代理程式執行，發送)
  - `operator.admin` (設定、頻道、模型)

### 角色行為

**節點**

- 可以註冊功能 (`caps`、`commands`、權限)。
- 可以接收 `invoke` 指令 (`system.run`、`camera.*`、`canvas.*`、`screen.record` 等)。
- 可以傳送事件：`voice.transcript`、`agent.request`、`chat.subscribe`。
- 無法呼叫 config/models/channels/sessions/agent 控制平面 API。

**操作員**

- 完整的控制平面 API，由範圍限制存取。
- 接收所有核准請求。
- 不直接執行 OS 動作；路由至節點。

### 關鍵規則

角色是連線層級的，而非裝置層級。裝置可以分別開啟兩種角色。

---

# 統一驗證 + 配對

## 客戶端身分

每個客戶端提供：

- `deviceId` （穩定，從裝置金鑰衍生）。
- `displayName` （人類可讓名稱）。
- `role` + `scope` + `caps` + `commands`。

## 配對流程（統一）

- 客戶端以未驗證狀態連線。
- Gateway 為該 `deviceId` 建立一個 **配對請求**。
- 操作員收到提示；批准/拒絕。
- Gateway 發行綁定至以下項目的憑證：
  - 裝置公開金鑰
  - 角色
  - 範圍
  - 能力/指令
- 客戶端保存權杖，以驗證身分重新連線。

## 裝置綁定驗證（避免 bearer token 重放）

首選：裝置金鑰對。

- 裝置產生一次金鑰對。
- `deviceId = fingerprint(publicKey)`。
- Gateway 發送 nonce；裝置簽署；gateway 驗證。
- Token 發行給公鑰（proof‑of‑possession），而非字串。

替代方案：

- mTLS (用戶端憑證)：最強，但營運複雜度較高。
- 短期 bearer token 僅作為暫時階段（輪替 + 提早撤銷）。

## 靜默核准 (SSH heuristic)

精確定義以避免成為弱點。偏好其中一種：

- **僅限本機**：當用戶端透過 loopback/Unix socket 連線時自動配對。
- **透過 SSH 挑戰**：gateway 發出 nonce；用戶端透過擷取它來證明 SSH。
- **實體在場視窗**：在 gateway 主機 UI 上進行本機核准後，允許在短時間內（例如 10 分鐘）自動配對。

總是記錄 + 存檔自動核准。

---

# TLS 無所不在 (開發 + 生產)

## 重複使用現有的 bridge TLS

使用目前的 TLS 執行時 + 指紋鎖定：

- `src/infra/bridge/server/tls.ts`
- 指紋驗證邏輯位於 `src/node-host/bridge-client.ts`

## 應用於 WS

- WS 伺服器支援使用相同憑證/金鑰 + 指紋的 TLS。
- WS 用戶端可以釘選指紋（可選）。
- 探索服務會為所有端點廣播 TLS + 指紋。
  - 探索服務僅提供定位提示；絕不作為信任根。

## 原因

- 減少對 SSH/Tailscale 以實現機密性的依賴。
- 讓遠端行動連線預設即為安全。

---

# 批准機制重新設計（集中化）

## 目前

批准發生在節點主機上（Mac 應用程式節點執行時期）。提示會顯示在節點執行的地方。

## 提案

批准由 **gateway‑hosted**（閘道託管），UI 傳送給操作員用戶端。

### 新流程

1. 閘道接收 `system.run` 意圖（代理程式）。
2. 閘道建立批准記錄：`approval.requested`。
3. 操作員 UI 會顯示提示。
4. 批准決定發送至閘道：`approval.resolve`。
5. 若已批准，閘道會叫用節點指令。
6. 節點執行並返回 `invoke-res`。

### 批准語意（強化）

- 廣播給所有操作員；只有啟用的 UI 會顯示模態視窗（其他的會收到通知）。
- 第一次解決方案生效；閘道會拒絕後續的解決方案，因為已經解決了。
- 預設逾時：在 N 秒後拒絕（例如 60 秒），並記錄原因。
- 解決方案需要 `operator.approvals` 範圍。

## 優點

- 提示會出現在用戶所在的位置 (mac/手機)。
- 遠端節點的審核流程一致。
- 節點執行環境保持無介面；不依賴 UI。

---

# 角色清晰範例

## iPhone 應用程式

- **節點角色**用於：麥克風、相機、語音聊天、位置、按住通話。
- 選用的 **operator.read** 用於狀態和聊天檢視。
- 僅在明確啟用時才具備選用的 **operator.write/admin**。

## macOS 應用程式

- 預設為操作員角色 (控制 UI)。
- 啟用「Mac 節點」時為節點角色 (system.run、螢幕、相機)。
- 兩個連線使用相同的 deviceId → 合併 UI 項目。

## CLI

- 始終為操作員角色。
- 範圍由子指令衍生：
  - `status`, `logs` → read
  - `agent`, `message` → write
  - `config`, `channels` → admin
  - approvals + pairing → `operator.approvals` / `operator.pairing`

---

# Identity + slugs

## Stable ID

Required for auth; never changes.
Preferred:

- Keypair fingerprint (public key hash).

## Cute slug (lobster‑themed)

Human label only.

- Example: `scarlet-claw`, `saltwave`, `mantis-pinch`.
- Stored in gateway registry, editable.
- Collision handling: `-2`, `-3`.

## UI grouping

Same `deviceId` across roles → single “Instance” row:

- Badge: `operator`, `node`.
- 顯示功能 + 上次線上時間。

---

# 遷移策略

## 階段 0：文件記錄 + 對齊

- 發布此文件。
- 盤點所有協定呼叫 + 核准流程。

## 階段 1：將角色/範圍新增至 WS

- 使用 `role`、`scope`、`deviceId` 擴充 `connect` 參數。
- 新增節點角色的允許清單閘道。

## 階段 2：橋接器相容性

- 保持橋接器執行。
- 並行新增 WS 節點支援。
- 在設定標誌後方對功能進行閘道控制。

## 階段 3：中央核准

- 在 WS 中新增核准請求 + 解析事件。
- 更新 Mac 應用程式 UI 以進行提示 + 回應。
- 節點執行時停止提示 UI。

## 階段 4：TLS 統一

- 使用橋接器 TLS 執行時為 WS 新增 TLS 設定。
- 將固定憑證新增至用戶端。

## 階段 5：棄用橋接器

- 將 iOS/Android/mac 節點遷移至 WS。
- 將橋接器作為後備方案；穩定後移除。

## 階段 6：裝置綁定驗證

- 所有非本機連線都需要基於金鑰的身分識別。
- 新增撤銷 + 輪換 UI。

---

# 安全性備註

- 在閘道邊界強制執行角色/允許清單。
- 沒有操作員範圍的客戶端無法獲得「完整」API 存取權。
- *所有*連線都需要配對。
- TLS + 憑證固定可降低行動裝置的 MITM 風險。
- SSH 無聲核准是一種便利措施；仍然會被記錄且可撤銷。
- 探索絕不會是信任錨點。
- 功能宣告會根據平台/類型，依照伺服器允許清單進行驗證。

# 串流 + 大型承載（節點媒體）

WS 控制平面適合用於小型訊息，但節點也會執行：

- 相機剪輯
- 螢幕錄製
- 音訊串流

選項：

1. WS 二進位框架 + 分塊 + 背壓規則。
2. 獨立的串流端點（仍使用 TLS + 驗證）。
3. 為了媒體重型命令更長時間保留 bridge，最後再遷移。

在實作之前選擇一個，以避免分歧。

# 功能 + 指令原則

- 節點回報的能力/命令被視為 **聲明 (claims)**。
- 閘道執行各平台允許清單。
- 任何新命令都需要操作員批准或明確變更允許清單。
- 使用時間戳記審計變更。

# 審計 + 速率限制

- 記錄：配對請求、批准/拒絕、Token 發行/輪替/撤銷。
- 對配對垃圾訊息和批准提示進行速率限制。

# 協定衛生

- 明確的協定版本與錯誤碼。
- 重新連線規則 + 心跳政策。
- 在線 TTL 與最後上線語意。

---

# 未解決的問題

1. 單一裝置同時執行兩種角色：Token 模式
   - 建議每個角色使用不同的 Token (節點 vs 操作員)。
   - 相同的 deviceId；不同的範圍；更明確的撤銷。

2. 操作員範圍的粒度
   - read/write/admin + approvals + pairing (最小可行性)。
   - 稍後考慮針對特定功能的範圍。

3. Token 輪替 + 撤銷 UX
   - 角色變更時自動輪替。
   - 依 deviceId + role 撤銷的 UI。

4. 探索
   - 擴展目前的 Bonjour TXT 以包含 WS TLS 指紋與角色提示。
   - 僅將其視為定位提示。

5. 跨網路核准
   - 廣播給所有操作員客戶端；啟用的 UI 會顯示模態視窗。
   - 首次回應者獲勝；閘道會強制執行原子性。

---

# 摘要 (TL;DR)

- 目前：WS 控制平面 + Bridge 節點傳輸。
- 痛點：核准 + 重複 + 兩個堆疊。
- 提案：一個具備明確角色與範圍的 WS 協定，統一的配對與 TLS 鎖定，閘道託管的核准，穩定的裝置 ID 與易記代稱。
- 結果：更簡單的 UX、更強的安全性、更少的重複、更好的行動路由。
