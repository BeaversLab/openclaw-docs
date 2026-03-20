---
summary: "Clawnet refactor: unify network protocol, roles, auth, approvals, identity"
read_when:
  - 規劃適用於節點和操作員客戶端的統一網路協定
  - 重新調整跨裝置的核准、配對、TLS 和在線狀態
title: "Clawnet Refactor"
---

# Clawnet 重構（協定 + 身份驗證統一）

## 嗨

嗨 Peter — 很棒的方向；這能帶來更簡單的 UX 和更強的安全性。

## 目的

一份單一、嚴謹的文件，內容涵蓋：

- 目前狀態：協定、流程、信任邊界。
- 痛點：核准、多跳路由、UI 重複。
- 提議的新狀態：單一協定、限定範圍的角色、統一的身份驗證/配對、TLS 釘選。
- 身分模型：穩定的 ID + 可愛的 slug。
- 遷移計畫、風險、未解決的問題。

## 目標（來自討論）

- 適用於所有客戶端的單一協定（mac app、CLI、iOS、Android、無頭節點）。
- 每個網路參與者都經過身份驗證與配對。
- 角色清晰度：節點 vs 操作員。
- 中央核准路由傳遞至使用者所在的位置。
- 所有遠端流量均採用 TLS 加密與可選的釘選。
- 極少的程式碼重複。
- 單一機器應該只顯示一次（無 UI/節點重複項目）。

## 非目標（明確列出）

- 移除權限分離（仍需遵守最小權限原則）。
- 在未檢查範圍的情況下暴露完整的閘道控制平面。
- 讓身份驗證依賴人類可讀的標籤（slug 仍不具安全性）。

---

# 目前狀態（現狀）

## 兩種協定

### 1) Gateway WebSocket（控制平面）

- 完整的 API 表面：config、channels、models、sessions、agent runs、logs、nodes 等等。
- 預設綁定：loopback。透過 SSH/Tailscale 進行遠端存取。
- 身份驗證：透過 `connect` 的 token/password。
- 無 TLS 釘選（依賴 loopback/tunnel）。
- 程式碼：
  - `src/gateway/server/ws-connection/message-handler.ts`
  - `src/gateway/client.ts`
  - `docs/gateway/protocol.md`

### 2) Bridge（節點傳輸）

- 狹窄的允�清單表面、節點身分 + 配對。
- TCP 上的 JSONL；可選的 TLS + 憑證指紋釘選。
- TLS 在發現 TXT 中廣播指紋。
- 程式碼：
  - `src/infra/bridge/server/connection.ts`
  - `src/gateway/server-bridge.ts`
  - `src/node-host/bridge-client.ts`
  - `docs/gateway/bridge-protocol.md`

## 目前的控制平面客戶端

- CLI → Gateway WS 透過 `callGateway` (`src/gateway/call.ts`)。
- macOS app UI → Gateway WS (`GatewayConnection`)。
- Web Control UI → Gateway WS。
- ACP → Gateway WS。
- 瀏覽器控制使用自己的 HTTP 控制伺服器。

## 當前的節點

- 處於節點模式的 macOS 應用程式連接到 Gateway bridge (`MacNodeBridgeSession`)。
- iOS/Android 應用程式連接到 Gateway bridge。
- 配對 + 每個節點的 token 儲存在 gateway 上。

## 當前的核准流程 (exec)

- Agent 通過 Gateway 使用 `system.run`。
- Gateway 通過 bridge 呼叫節點。
- 節點運行時決定核准。
- 由 mac 應用程式顯示 UI 提示 (當 node == mac app 時)。
- 節點將 `invoke-res` 返回給 Gateway。
- 多跳，UI 綁定到節點主機。

## 當前的在線狀態 + 身份

- 來自 WS 客戶端的 Gateway 在線狀態條目。
- 來自 bridge 的節點在線狀態條目。
- mac 應用程式可以為同一台機器顯示兩個條目 (UI + node)。
- 節點身份儲存在配對存儲中；UI 身份分開。

---

# 問題 / 痛點

- 需要維護兩個協議堆疊 (WS + Bridge)。
- 遠端節點上的核准：提示出現在節點主機上，而不是用戶所在的位置。
- TLS 僅釘選存在於 bridge；WS 依賴 SSH/Tailscale。
- 身份重複：同一台機器顯示為多個實例。
- 角色不明確：UI + node + CLI 功能未清楚區分。

---

# 建議的新狀態 (Clawnet)

## 一種協議，兩種角色

具有角色 + 範圍的單一 WS 協議。

- **角色：node** (功能主機)
- **角色：operator** (控制平面)
- Operator 的可選 **範圍**：
  - `operator.read` (狀態 + 檢視)
  - `operator.write` (agent 執行，發送)
  - `operator.admin` (配置，頻道，模型)

### 角色行為

**Node**

- 可以註冊功能 (`caps`，`commands`，權限)。
- 可以接收 `invoke` 指令 (`system.run`，`camera.*`，`canvas.*`，`screen.record` 等)。
- 可以發送事件：`voice.transcript`，`agent.request`，`chat.subscribe`。
- 無法呼叫 config/models/channels/sessions/agent 控制平面 API。

**Operator**

- 完整的控制平面 API，受範圍限制。
- 接收所有核准。
- 不直接執行 OS 操作；路由到節點。

### 關鍵規則

角色是按連接區分的，而不是按設備區分的。一個設備可以分別打開這兩種角色。

---

# 統一驗證 + 配對

## 客戶端身分

每個客戶端提供：

- `deviceId`（穩定，從裝置金鑰衍生）。
- `displayName`（人類可讓名稱）。
- `role` + `scope` + `caps` + `commands`。

## 配對流程（統一）

- 客戶端以未驗證狀態連線。
- 閘道為該 `deviceId` 建立一個**配對請求**。
- 操作員收到提示；批准/拒絕。
- 閘道發行綁定至以下項目的憑證：
  - 裝置公開金鑰
  - 角色
  - 範圍
  - 功能/指令
- 客戶端保存權杖，以已驗證狀態重新連線。

## 裝置綁定驗證（避免持有人權杖重放）

偏好方式：裝置金鑰對。

- 裝置生成一次金鑰對。
- `deviceId = fingerprint(publicKey)`。
- 閘道傳送 nonce；裝置簽署；閘道驗證。
- 權杖發行給公開金鑰（擁有證明），而非字串。

替代方案：

- mTLS（客戶端憑證）：最強，但運維複雜度較高。
- 短期持有人權杖僅作為過渡階段（輪換 + 儘早撤銷）。

## 靜默批准（SSH 啟發式）

精確定義以避免成為弱點。偏好其中之一：

- **僅限本機**：當客戶端透過 loopback/Unix socket 連線時自動配對。
- **透過 SSH 挑戰**：閘道發行 nonce；客戶端透過擷取證明 SSH 存取權。
- **實體存在視窗**：在閘道主機 UI 上進行本機批准後，允許在短時間內（例如 10 分鐘）自動配對。

始終記錄並保存自動批准的紀錄。

---

# 到處皆使用 TLS（開發 + 生產）

## 重複使用現有的 bridge TLS

使用目前的 TLS 執行環境 + 指紋固定：

- `src/infra/bridge/server/tls.ts`
- `src/node-host/bridge-client.ts` 中的指紋驗證邏輯

## 套用至 WS

- WS 伺服器支援使用相同憑證/金鑰 + 指紋的 TLS。
- WS 客戶端可以固定指紋（選用）。
- 探索服務會為所有端點廣播 TLS + 指紋。
  - 探索服務僅提供定位提示；絕非信任根。

## 原因

- 減少對 SSH/Tailscale 用於機密性的依賴。
- 讓遠端行動裝置連線預設為安全。

---

# 批准機制重新設計（集中化）

## 目前

批准發生在節點主機（Mac 應用程式節點執行環境）。提示顯示在節點執行的地方。

## 提議

批准由**閘道託管**，UI 傳送至操作員客戶端。

### 新流程

1. Gateway 接收 `system.run` 意圖（代理）。
2. Gateway 建立審核記錄：`approval.requested`。
3. 操作員 UI 顯示提示。
4. 審核決定發送至 gateway：`approval.resolve`。
5. 若獲批准，Gateway 會叫用節點指令。
6. 節點執行並傳回 `invoke-res`。

### 審核語意（強化）

- 廣播至所有操作員；僅使用中的 UI 顯示強制回應視窗（其他則顯示通知）。
- 首次解決方案優先；gateway 會拒絕後續的解決方案，視為已解決。
- 預設逾時：N 秒後拒絕（例如 60 秒），並記錄原因。
- 解決方案需要 `operator.approvals` 範圍。

## 優點

- 提示會出現在使用者所在的位置（mac/手機）。
- 遠端節點的審核流程一致。
- 節點執行時保持無介面；不依賴 UI。

---

# 角色清晰度範例

## iPhone 應用程式

- **節點角色**適用於：麥克風、相機、語音聊天、位置、按鍵通話。
- 選用 **operator.read** 以檢視狀態和聊天。
- 僅在明確啟用時才使用選用 **operator.write/admin**。

## macOS 應用程式

- 預設為操作員角色（控制 UI）。
- 啟用「Mac 節點」時為節點角色（system.run、螢幕、相機）。
- 兩個連線使用相同的 deviceId → 合併 UI 項目。

## CLI

- 始終為操作員角色。
- 範圍衍生自子指令：
  - `status`、`logs` → 讀取
  - `agent`、`message` → 寫入
  - `config`、`channels` → 管理員
  - 審核 + 配對 → `operator.approvals` / `operator.pairing`

---

# 身分識別 + slugs

## 穩定 ID

驗證必備；永不變更。
偏好：

- 金鑰對指紋（公開金鑰雜湊）。

## 可愛的 slug（龍蝦主題）

僅供人類閱讀的標籤。

- 範例：`scarlet-claw`、`saltwave`、`mantis-pinch`。
- 儲存在登錄表中，可編輯。
- 衝突處理：`-2`、`-3`。

## UI 分組

角色間使用相同的 `deviceId` → 單一「執行個體」列：

- 徽章：`operator`、`node`。
- 顯示功能 + 上次在線時間。

---

# 遷移策略

## 第 0 階段：文件 + 對齊

- 發布此文件。
- 盤點所有通訊協定呼叫 + 審核流程。

## Phase 1: Add roles/scopes to WS

- Extend `connect` params with `role`, `scope`, `deviceId`.
- Add allowlist gating for node role.

## Phase 2: Bridge compatibility

- Keep bridge running.
- Add WS node support in parallel.
- Gate features behind config flag.

## Phase 3: Central approvals

- Add approval request + resolve events in WS.
- Update mac app UI to prompt + respond.
- Node runtime stops prompting UI.

## Phase 4: TLS unification

- Add TLS config for WS using bridge TLS runtime.
- Add pinning to clients.

## Phase 5: Deprecate bridge

- Migrate iOS/Android/mac node to WS.
- Keep bridge as fallback; remove once stable.

## Phase 6: Device‑bound auth

- Require key‑based identity for all non‑local connections.
- Add revocation + rotation UI.

---

# Security notes

- Role/allowlist enforced at gateway boundary.
- No client gets “full” API without operator scope.
- Pairing required for _all_ connections.
- TLS + pinning reduces MITM risk for mobile.
- SSH silent approval is a convenience; still recorded + revocable.
- Discovery is never a trust anchor.
- Capability claims are verified against server allowlists by platform/type.

# Streaming + large payloads (node media)

WS control plane is fine for small messages, but nodes also do:

- camera clips
- screen recordings
- audio streams

Options:

1. WS binary frames + chunking + backpressure rules.
2. Separate streaming endpoint (still TLS + auth).
3. Keep bridge longer for media‑heavy commands, migrate last.

Pick one before implementation to avoid drift.

# Capability + command policy

- Node‑reported caps/commands are treated as **claims**.
- Gateway enforces per‑platform allowlists.
- Any new command requires operator approval or explicit allowlist change.
- Audit changes with timestamps.

# Audit + rate limiting

- Log: pairing requests, approvals/denials, token issuance/rotation/revocation.
- Rate‑limit pairing spam and approval prompts.

# Protocol hygiene

- Explicit protocol version + error codes.
- Reconnect rules + heartbeat policy.
- Presence TTL and last‑seen semantics.

---

# Open questions

1. Single device running both roles: token model
   - Recommend separate tokens per role (node vs operator).
   - 相同的 deviceId；不同的範圍；更清晰的撤銷。

2. 操作員範圍粒度
   - 讀取/寫入/管理員 + 審批 + 配對（最小可行性）。
   - 稍後考慮基於功能的範圍。

3. 權杖輪換與撤銷體驗
   - 角色變更時自動輪換。
   - 透過 deviceId + 角色進行撤銷的 UI。

4. 探索
   - 擴展目前的 Bonjour TXT 以包含 WS TLS 指紋 + 角色提示。
   - 僅作為定位器提示處理。

5. 跨網路審批
   - 廣播給所有操作員客戶端；作用中的 UI 顯示模態框。
   - 首個回應優先；閘道強制執行原子性。

---

# 總結 (TL;DR)

- 目前：WS 控制平面 + Bridge 節點傳輸。
- 痛點：審批 + 重複 + 兩個技術堆疊。
- 提案：具備明確角色 + 範圍的單一 WS 協定，統一的配對 + TLS 固定，由閘道託管的審批，穩定的裝置 ID + 簡易標識。
- 成果：更簡單的 UX、更強的安全性、更少的重複、更好的行動路由。

import en from "/components/footer/en.mdx";

<en />
