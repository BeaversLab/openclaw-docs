---
summary: "Gateway WebSocket 協定：握手、幀、版本控制"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "閘道協定"
---

# Gateway 協定 (WebSocket)

Gateway WS 協定是 OpenClaw 的 **單一控制平面 + 節點傳輸**。
所有客戶端（CLI、網頁 UI、macOS 應用程式、iOS/Android 節點、無頭
節點）透過 WebSocket 連線，並在握手時宣告其 **角色** + **範圍**。

## 傳輸

- WebSocket，具有 JSON 載荷的文字框架。
- 第一個幀 **必須** 是 `connect` 請求。
- 連線前的幀限制為 64 KiB。成功握手後，客戶端應遵循 `hello-ok.policy.maxPayload` 和 `hello-ok.policy.maxBufferedBytes` 的限制。啟用診斷後，超大的入站幀和緩慢的出站緩衝區會在閘道關閉或丟棄受影響的幀之前發出 `payload.large` 事件。這些事件保留大小、限制、介面和安全原因代碼。它們不會保留訊息主體、附件內容、原始幀主體、令牌、Cookie 或秘密值。

## 握手 (連線)

閘道 → 客戶端 (連線前挑戰)：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

客戶端 → 閘道：

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "cli",
      "version": "1.2.3",
      "platform": "macos",
      "mode": "operator"
    },
    "role": "operator",
    "scopes": ["operator.read", "operator.write"],
    "caps": [],
    "commands": [],
    "permissions": {},
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-cli/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

閘道 → 客戶端：

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": {
    "type": "hello-ok",
    "protocol": 3,
    "server": { "version": "…", "connId": "…" },
    "features": { "methods": ["…"], "events": ["…"] },
    "snapshot": { "…": "…" },
    "policy": {
      "maxPayload": 26214400,
      "maxBufferedBytes": 52428800,
      "tickIntervalMs": 15000
    }
  }
}
```

`server`、`features`、`snapshot` 和 `policy` 都是架構 (`src/gateway/protocol/schema/frames.ts`) 所要求的。`canvasHostUrl` 是可選的。`auth` 會在可用時回報協商的角色/範圍，並在閘道核發時包含 `deviceToken`。

當未核發裝置令牌時，`hello-ok.auth` 仍可回報協商的權限：

```json
{
  "auth": {
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

當核發裝置令牌時，`hello-ok` 也包含：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

在受信任的啟動傳遞期間，`hello-ok.auth` 也可能在 `deviceTokens` 中包含額外的有界角色條目：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "node",
    "scopes": [],
    "deviceTokens": [
      {
        "deviceToken": "…",
        "role": "operator",
        "scopes": ["operator.approvals", "operator.read", "operator.talk.secrets", "operator.write"]
      }
    ]
  }
}
```

對於內建的節點/操作員啟動流程，主要節點令牌保持 `scopes: []`，任何傳遞的操作員令牌保持受限於啟動操作員允許清單 (`operator.approvals`、`operator.read`、`operator.talk.secrets`、`operator.write`)。啟動範圍檢查保持角色前綴：操作員條目僅滿足操作員請求，非操作員角色仍需要在其自身角色前綴下的範圍。

### 節點範例

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "ios-node",
      "version": "1.2.3",
      "platform": "ios",
      "mode": "node"
    },
    "role": "node",
    "scopes": [],
    "caps": ["camera", "canvas", "screen", "location", "voice"],
    "commands": ["camera.snap", "canvas.navigate", "screen.record", "location.get"],
    "permissions": { "camera.capture": true, "screen.record": false },
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-ios/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

## 幀處理

- **請求**：`{type:"req", id, method, params}`
- **回應**：`{type:"res", id, ok, payload|error}`
- **事件**：`{type:"event", event, payload, seq?, stateVersion?}`

具有副作用的方法需要 **冪等金鑰** (idempotency keys) (請參閱架構)。

## 角色 + 範圍

### 角色

- `operator` = 控制平面客戶端 (CLI/UI/自動化)。
- `node` = 功能主機（相機/螢幕/畫布/system.run）。

### 範圍（操作員）

常見範圍：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`
- `operator.talk.secrets`

包含 `includeSecrets: true` 的 `talk.config` 需要 `operator.talk.secrets`
（或 `operator.admin`）。

外掛程式註冊的閘道 RPC 方法可以請求其自己的操作員範圍，但
保留的核心管理員前綴（`config.*`、`exec.approvals.*`、`wizard.*`、
`update.*`）始終解析為 `operator.admin`。

方法範圍只是第一道關卡。透過
`chat.send` 存取的某些斜線指令會在頂部套用更嚴格的指令層級檢查。例如，持久性
`/config set` 和 `/config unset` 寫入需要 `operator.admin`。

`node.pair.approve` 在基礎方法範圍之上，還有額外的核准時間範圍檢查：

- 無指令請求：`operator.pairing`
- 具有非執行節點指令的請求：`operator.pairing` + `operator.write`
- 包含 `system.run`、`system.run.prepare` 或 `system.which` 的請求：
  `operator.pairing` + `operator.admin`

### 功能/指令/權限（節點）

節點會在連接時宣告功能宣告：

- `caps`：高階功能類別。
- `commands`：用於調用的指令允許清單。
- `permissions`：細粒度切換（例如 `screen.record`、`camera.capture`）。

閘道將這些視為 **宣告**，並強制執行伺服器端允許清單。

## 線上狀態

- `system-presence` 傳回以裝置身分識別為鍵值的項目。
- Presence 項目包含 `deviceId`、`roles` 和 `scopes`，以便即使裝置同時以 **operator** 和 **node** 連線，UI 也能顯示每個裝置的單一行。

## 廣播事件範圍

伺服器推送的 WebSocket 廣播事件受到範圍限制，因此配對範圍或僅限節點的工作階段不會被動接收工作階段內容。

- **聊天、代理和工具結果框架**（包括串流 `agent` 事件和工具呼叫結果）至少需要 `operator.read`。沒有 `operator.read` 的工作階段會完全跳過這些框架。
- **外掛定義的 `plugin.*` 廣播**限制於 `operator.write` 或 `operator.admin`，具體取決於外掛註冊它們的方式。
- **狀態和傳輸事件**（`heartbeat`、`presence`、`tick`、連線/中斷連線生命週期等）保持不受限制，以便每個已驗證的工作階段都能觀察到傳輸健康狀況。
- **未知的廣播事件系列**預設受到範圍限制（預設攔截），除非註冊的處理程序明確放寬限制。

每個客戶端連線都會保留自己的每個客戶端序號，以便即使在不同的客戶端看到不同範圍過濾的事件流子集時，廣播仍能在該 socket 上保持單調順序。

## 常見 RPC 方法系列

此頁面不是生成的完整傾印，但公共 WS 表面比上述握手/驗證範例更廣泛。這些是 Gateway 目前公開的主要方法系列。

`hello-ok.features.methods` 是一個保守的探索列表，建構自 `src/gateway/server-methods-list.ts` 加上載入的外掛/通道方法匯出。將其視為功能探索，而不是在 `src/gateway/server-methods/*.ts` 中實現的每個可呼叫協助程式的生成傾印。

### 系統與身分識別

- `health` 返回快取或新探測的 gateway 健康狀況快照。
- `diagnostics.stability` 返回最近的受限診斷穩定性
  記錄器。它保留操作元數據，例如事件名稱、計數、位元組
  大小、記憶體讀數、佇列/會話狀態、通道/外掛程式名稱和會話
  ID。它不保留聊天文字、 webhook 主體、工具輸出、原始請求或
  回應主體、權杖、 cookies 或機密值。需要操作員讀取權限。
- `status` 返回 `/status` 風格的閘道摘要；敏感欄位僅
  包含在具有管理員範圍的操作員客戶端中。
- `gateway.identity.get` 返回中繼和
  配對流程所使用的閘道裝置身分識別。
- `system-presence` 返回已連線的
  操作員/節點裝置的目前目前狀態快照。
- `system-event` 附加系統事件，並且可以更新/廣播目前
  狀態上下文。
- `last-heartbeat` 返回最近持久化的心跳事件。
- `set-heartbeats` 切換閘道上是否處理心跳。

### 模型和使用方式

- `models.list` 返回執行時期允許的模型目錄。
- `usage.status` 返回提供者使用視窗/剩餘配額摘要。
- `usage.cost` 返回指定日期範圍內的匯總成本使用摘要。
- `doctor.memory.status` 返回
  作用中預設代理程式工作區的向量記憶體 / 嵌入就緒狀態。
- `sessions.usage` 返回每個會話的使用摘要。
- `sessions.usage.timeseries` 返回單一會話的時間序列使用量。
- `sessions.usage.logs` 返回單一會話的使用日誌項目。

### 通道和登入輔助程式

- `channels.status` 返回內建 + 隨附的通道/外掛程式狀態摘要。
- `channels.logout` 登出特定的通道/帳戶，前提是該通道
  支援登出。
- `web.login.start` 啟動目前支援 QR 碼的網頁
  通道提供者的 QR 碼/網頁登入流程。
- `web.login.wait` 等待該 QR 碼/網頁登入流程完成，並在成功時啟動
  該通道。
- `push.test` 向已註冊的 iOS 節點發送測試 APNs 推送通知。
- `voicewake.get` 返回儲存的喚醒詞觸發器。
- `voicewake.set` 更新喚醒詞觸發器並廣播變更。

### 訊息傳遞與日誌

- `send` 是用於聊天執行器之外的頻道/帳號/執行緒目標發送的直接出站傳遞 RPC。
- `logs.tail` 返回已設定的閘道檔案日誌尾部，具有遊標/限制和最大位元組控制。

### 對話與文字轉語音 (TTS)

- `talk.config` 返回有效的對話設定負載；`includeSecrets` 需要 `operator.talk.secrets` (或 `operator.admin`)。
- `talk.mode` 設定/廣播 WebChat/控制 UI 用戶端的目前對話模式狀態。
- `talk.speak` 透過主動的對話語音提供者合成語音。
- `tts.status` 返回 TTS 啟用狀態、主動提供者、備用提供者和提供者設定狀態。
- `tts.providers` 返回可見的 TTS 提供者清單。
- `tts.enable` 和 `tts.disable` 切換 TTS 偏好設定狀態。
- `tts.setProvider` 更新首選的 TTS 提供者。
- `tts.convert` 執行一次性文字轉語音轉換。

### 機密、設定、更新與精靈

- `secrets.reload` 重新解析主動 SecretRef，並且僅在完全成功時交換執行時機密狀態。
- `secrets.resolve` 解析特定指令/目標集合的指令目標機密分配。
- `config.get` 返回目前的設定快照和雜湊值。
- `config.set` 寫入已驗證的設定負載。
- `config.patch` 合併部分設定更新。
- `config.apply` 驗證並替換完整的設定負載。
- `config.schema` 傳回 Control UI 和 CLI 工具所使用的即時組態設定 payload：schema、`uiHints`、版本和生成元資料，包括執行時可以載入時的外掛程式 + 頻道 schema 元資料。Schema 包含欄位 `title` / `description` 元資料，這些元資料衍生自 UI 所使用的相同標籤和說明文字，包括巢狀物件、萬用字元、陣列項目，以及當存在相符欄位文件時的 `anyOf` / `oneOf` / `allOf` 組合分支。
- `config.schema.lookup` 傳回單一組態路徑的路徑範圍查詢 payload：正規化路徑、淺層 schema 節點、相符的提示 + `hintPath`，以及用於 UI/CLI 鑽取的直接子摘要。
  - 查詢 schema 節點會保留使用者面向的文件和通用驗證欄位：
    `title`、`description`、`type`、`enum`、`const`、`format`、`pattern`、
    數值/字串/陣列/物件邊界，以及布林旗標，例如
    `additionalProperties`、`deprecated`、`readOnly`、`writeOnly`。
  - 子摘要會公開 `key`、正規化 `path`、`type`、`required`、
    `hasChildren`，加上相符的 `hint` / `hintPath`。
- `update.run` 會執行閘道更新流程，並僅在更新本身成功時排程重新啟動。
- `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 透過 WS RPC 公開入門精靈。

### 現有的主要系列

#### 代理程式和工作區輔助工具

- `agents.list` 傳回已設定的代理程式項目。
- `agents.create`、`agents.update` 和 `agents.delete` 管理代理記錄和
  工作區連線。
- `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理為
  代理公開的啟動工作區檔案。
- `agent.identity.get` 返回代理或
  工作階段的有效助理身分。
- `agent.wait` 等待執行完成並在
  可用時返回終端快照。

#### 工作階段控制

- `sessions.list` 返回目前的工作階段索引。
- `sessions.subscribe` 和 `sessions.unsubscribe` 切換目前 WS 客戶端的
  工作階段變更事件訂閱。
- `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 切換
  單一工作階段的轉錄/訊息事件訂閱。
- `sessions.preview` 返回特定工作階段
  金鑰的受限轉錄預覽。
- `sessions.resolve` 解析或正規化工作階段目標。
- `sessions.create` 建立新的工作階段項目。
- `sessions.send` 將訊息傳送到現有的工作階段。
- `sessions.steer` 是活躍工作階段的中斷與引導變體。
- `sessions.abort` 中止工作階段的活躍工作。
- `sessions.patch` 更新工作階段中繼資料/覆寫。
- `sessions.reset`、`sessions.delete` 和 `sessions.compact` 執行工作階段
  維護。
- `sessions.get` 返回完整的已儲存工作階段列。
- 聊天執行仍使用 `chat.history`、`chat.send`、`chat.abort` 和
  `chat.inject`。
- `chat.history` 會針對 UI 用戶端進行顯示正規化：行內指令標籤會從可見文字中移除，純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及被截斷的工具呼叫區塊）與外洩的 ASCII/全形模型控制代幣會被移除，純靜音代幣的助手列（例如精確的 `NO_REPLY` / `no_reply`）會被省略，過大的列則可以替換為預留位置。

#### 裝置配對與裝置代幣

- `device.pair.list` 會傳回待處理與已核准的配對裝置。
- `device.pair.approve`、`device.pair.reject` 和 `device.pair.remove` 用於管理裝置配對紀錄。
- `device.token.rotate` 會在其已核准的角色與範圍界限內輪替配對裝置的代幣。
- `device.token.revoke` 會撤銷配對裝置的代幣。

#### 節點配對、調用與待處理工作

- `node.pair.request`、`node.pair.list`、`node.pair.approve`、`node.pair.reject` 和 `node.pair.verify` 涵蓋了節點配對與啟動程序驗證。
- `node.list` 和 `node.describe` 會傳回已知/已連線的節點狀態。
- `node.rename` 會更新配對節點的標籤。
- `node.invoke` 會將指令轉發至已連線的節點。
- `node.invoke.result` 會傳回調用請求的結果。
- `node.event` 會將源自節點的事件帶回至閘道。
- `node.canvas.capability.refresh` 會重新整理具有範圍的畫布功能代幣。
- `node.pending.pull` 和 `node.pending.ack` 是已連線節點的佇列 API。
- `node.pending.enqueue` 和 `node.pending.drain` 用於管理離線/已中斷連線節點的永久性待處理工作。

#### 審核家族

- `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和
  `exec.approval.resolve` 涵蓋一次性執行核准請求以及待處理
  核准的查詢/重放。
- `exec.approval.waitDecision` 等待一個待處理的執行核准並傳回
  最終決定（或在逾時時傳回 `null`）。
- `exec.approvals.get` 和 `exec.approvals.set` 管理閘道執行核准
  原則快照。
- `exec.approvals.node.get` 和 `exec.approvals.node.set` 透過節點中繼指令管理
  節點本機執行核准原則。
- `plugin.approval.request`、`plugin.approval.list`、
  `plugin.approval.waitDecision` 和 `plugin.approval.resolve` 涵蓋
  外掛程式定義的核准流程。

#### 其他主要系列

- 自動化：
  - `wake` 排定立即或下一次心跳喚醒的文字注入
  - `cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、
    `cron.run`、`cron.runs`
- 技能/工具：`commands.list`、`skills.*`、`tools.catalog`、`tools.effective`

### 常見事件系列

- `chat`：UI 聊天更新，例如 `chat.inject` 和其他僅限文字記錄的聊天
  事件。
- `session.message` 和 `session.tool`：已訂閱工作階段的文字記錄/事件串流更新。
- `sessions.changed`：工作階段索引或元資料已變更。
- `presence`：系統在線狀態快照更新。
- `tick`：週期性 keepalive / 存活事件。
- `health`：閘道健康狀態快照更新。
- `heartbeat`：心跳事件串流更新。
- `cron`： cron 執行/工作變更事件。
- `shutdown`：閘道關機通知。
- `node.pair.requested` / `node.pair.resolved`：節點配對生命週期。
- `node.invoke.request`：節點調用請求廣播。
- `device.pair.requested` / `device.pair.resolved`：配對裝置生命週期。
- `voicewake.changed`：喚醒詞觸發配置已變更。
- `exec.approval.requested` / `exec.approval.resolved`：執行審核
  生命週期。
- `plugin.approval.requested` / `plugin.approval.resolved`：外掛程式審核
  生命週期。

### 節點輔助方法

- 節點可以呼叫 `skills.bins` 以獲取當前的技能可執行檔清單
  以進行自動允許檢查。

### 操作員輔助方法

- 操作員可以呼叫 `commands.list` (`operator.read`) 以獲取代理程式的執行時
  指令清單。
  - `agentId` 是可選的；省略它以讀取預設代理程式工作區。
  - `scope` 控制主要 `name` 的目標介面：
    - `text` 傳回不帶前導 `/` 的主要文字指令令牌
    - `native` 和預設 `both` 路徑在可用時傳回供應商感知的原生名稱
  - `textAliases` 包含精確的斜線別名，例如 `/model` 和 `/m`。
  - `nativeName` 在存在時包含供應商感知的原生命令名稱。
  - `provider` 是可選的，並且僅影響原生命名以及原生外掛程式
    指令的可用性。
  - `includeArgs=false` 從回應中省略序列化引數元資料。
- 操作員可以呼叫 `tools.catalog` (`operator.read`) 以獲取代理程式的執行時
  工具目錄。回應包含分組的工具和來源元資料：
  - `source`：`core` 或 `plugin`
  - `pluginId`：當 `source="plugin"` 時的外掛程式擁有者
  - `optional`：外掛程式工具是否為可選
- 操作員可以呼叫 `tools.effective` (`operator.read`) 來取得目前工作階段的運行時工具清單。
  - `sessionKey` 是必填的。
  - 閘道會從伺服器端的會話中推導受信任的執行時期內容，而不是接受呼叫者提供的驗證或傳遞內容。
  - 回應範圍僅限於該會話，並反映目前對話現在可使用的內容，包括核心、外掛和頻道工具。
- 操作員可以呼叫 `skills.status` (`operator.read`) 來取得代理人的可見技能清單。
  - `agentId` 是選填的；若要讀取預設代理人的工作區，請省略此參數。
  - 回應包含資格、缺少的需求、設定檢查，以及經過清理的安裝選項，而不會暴露原始的秘密值。
- 操作員可以呼叫 `skills.search` 和 `skills.detail` (`operator.read`) 來取得 ClawHub 探索中繼資料。
- 操作員可以透過兩種模式呼叫 `skills.install` (`operator.admin`)：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 將技能資料夾安裝到預設代理人工作區的 `skills/` 目錄中。
  - 閘道安裝程式模式：`{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }`
    會在閘道主機上執行宣告的 `metadata.openclaw.install` 動作。
- 操作員可以透過兩種模式呼叫 `skills.update` (`operator.admin`)：
  - ClawHub 模式會更新預設代理人工作區中一個已追蹤的 slug 或所有已追蹤的 ClawHub 安裝項目。
  - 設定模式會修補 `skills.entries.<skillKey>` 值，例如 `enabled`、
    `apiKey` 和 `env`。

## 執行核准

- 當執行請求需要核准時，閘道會廣播 `exec.approval.requested`。
- 操作員客戶端透過呼叫 `exec.approval.resolve` 來解決 (需要 `operator.approvals` 範圍)。
- 對於 `host=node`，`exec.approval.request` 必須包含 `systemRunPlan` (標準 `argv`/`cwd`/`rawCommand`/會話元數據)。缺少 `systemRunPlan` 的請求將被拒絕。
- 批准後，轉發的 `node.invoke system.run` 呼叫會重複使用該標準 `systemRunPlan` 作為授權命令/cwd/會話上下文。
- 如果呼叫者在準備和最終批准的 `system.run` 轉發之間更改了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，網關將拒絕執行而不是信任被更改的有效負載。

## Agent 傳送回退

- `agent` 請求可以包含 `deliver=true` 以請求出站傳送。
- `bestEffortDeliver=false` 保持嚴格行為：未解析或僅限內部的傳送目標返回 `INVALID_REQUEST`。
- `bestEffortDeliver=true` 允許在無法解析外部可傳送路由時（例如內部/webchat 會話或不明確的多通道配置）回退到僅限會話執行。

## 版本控制

- `PROTOCOL_VERSION` 位於 `src/gateway/protocol/schema/protocol-schemas.ts` 中。
- 客戶端發送 `minProtocol` + `maxProtocol`；伺服器拒絕不匹配的請求。
- Schemas 和模型是從 TypeBox 定義生成的：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### 客戶端常數

`src/gateway/client.ts` 中的參考客戶端使用這些預設值。這些值在 protocol v3 中保持穩定，並且是第三方客戶端的預期基線。

| 常數                             | 預設值                                             | 來源                                                      |
| -------------------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| `PROTOCOL_VERSION`               | `3`                                                | `src/gateway/protocol/schema/protocol-schemas.ts`         |
| 請求逾時 (每個 RPC)              | `30_000` 毫秒                                      | `src/gateway/client.ts` (`requestTimeoutMs`)              |
| 預先驗證 / 連接挑戰逾時          | `10_000` ms                                        | `src/gateway/handshake-timeouts.ts` (限制 `250`–`10_000`) |
| 初始重連退避                     | `1_000` ms                                         | `src/gateway/client.ts` (`backoffMs`)                     |
| 最大重連退避                     | `30_000` ms                                        | `src/gateway/client.ts` (`scheduleReconnect`)             |
| 裝置令牌關閉後的快速重試限制     | `250` ms                                           | `src/gateway/client.ts`                                   |
| `terminate()` 前的強制停止寬限期 | `250` ms                                           | `FORCE_STOP_TERMINATE_GRACE_MS`                           |
| `stopAndWait()` 預設逾時         | `1_000` ms                                         | `STOP_AND_WAIT_TIMEOUT_MS`                                |
| 預設 Tick 間隔 (`hello-ok` 之前) | `30_000` ms                                        | `src/gateway/client.ts`                                   |
| Tick-逾時關閉                    | 當靜默超過 `tickIntervalMs * 2` 時回傳 code `4000` | `src/gateway/client.ts`                                   |
| `MAX_PAYLOAD_BYTES`              | `25 * 1024 * 1024` (25 MB)                         | `src/gateway/server-constants.ts`                         |

伺服器會在 `hello-ok` 中公告有效的 `policy.tickIntervalMs`、`policy.maxPayload`
與 `policy.maxBufferedBytes`；客戶端應遵循這些數值，
而非握手前的預設值。

## 身份驗證

- 共用密鑰閘道驗證會根據設定的驗證模式使用 `connect.params.auth.token` 或
  `connect.params.auth.password`。
- 承載身份的模式，例如 Tailscale Serve
  (`gateway.auth.allowTailscale: true`) 或非本機迴路
  `gateway.auth.mode: "trusted-proxy"`，會從
  請求標頭滿足連線驗證檢查，而非 `connect.params.auth.*`。
- 私人入口 `gateway.auth.mode: "none"` 完全跳過共用密鑰連線驗證；
  請勿在公開/不受信任的入口上公開該模式。
- 配對後，閘道會發出範圍限定於連線
  角色 + 範圍的**裝置令牌**。它會在 `hello-ok.auth.deviceToken` 中傳回，且客戶端
  應將其保存以供未來連線使用。
- 客戶端應在每次成功連線後持久化儲存主要的 `hello-ok.auth.deviceToken`。
- 使用該**已儲存**的裝置權杖重新連線時，亦應重用針對該權杖已儲存的核准範圍集。這能保留已授予的讀取/探測/狀態存取權，並避免將重新連線靜默收窄為隱含的管理員專用範圍。
- 客戶端連線認證組裝 (`selectConnectAuth` 於
  `src/gateway/client.ts` 中):
  - `auth.password` 是正交的，且設定後始終會被轉發。
  - `auth.token` 依優先順序填入：先是明確的共享權杖，
    接著是明確的 `deviceToken`，然後是已儲存的每裝置權杖 (以
    `deviceId` + `role` 作為鍵值)。
  - `auth.bootstrapToken` 僅在上述均未解析出
    `auth.token` 時傳送。共享權杖或任何已解析的裝置權杖會將其抑制。
  - 在一次性 `AUTH_TOKEN_MISMATCH` 重試時，對已儲存裝置權杖的自動升級僅限於**受信任的端點** ——
    也就是回環地址，或是具備釘選 `tlsFingerprint` 的 `wss://`。未進行釘選的公用 `wss://`
    不符合條件。
- 額外的 `hello-ok.auth.deviceTokens` 項目是啟動移交權杖。
  僅當連線在受信任的傳輸 (例如 `wss://` 或回環/本機配對) 上使用啟動認證時，才應持久化儲存這些權杖。
- 如果客戶端提供了**明確的** `deviceToken` 或明確的 `scopes`，該
  呼叫端請求的範圍集將保持權威；僅當客戶端重用已儲存的每裝置權杖時，才會重用快取的範圍。
- 裝置權杖可以透過 `device.token.rotate` 和
  `device.token.revoke` 進行輪替/撤銷 (需要 `operator.pairing` 範圍)。
- 權杖的核發/輪替仍受限於該裝置配對條目中記錄的已核准角色集；輪替權杖無法將裝置擴展至配對核准從未授予的角色。
- 對於配對裝置權杖階段，除非呼叫者也具有 `operator.admin`，否則裝置管理為自範圍：非管理員呼叫者只能移除/撤銷/輪換其**自身**的裝置項目。
- `device.token.rotate` 也會根據呼叫者目前的階段範圍，檢查請求的操作員範圍集合。非管理員呼叫者無法將權杖輪換為比其目前持有的範圍更廣的操作員範圍集合。
- 驗證失敗包含 `error.details.code` 以及恢復提示：
  - `error.details.canRetryWithDeviceToken` (布林值)
  - `error.details.recommendedNextStep` (`retry_with_device_token`、`update_auth_configuration`、`update_auth_credentials`、`wait_then_retry`、`review_auth_configuration`)
- 客戶端對於 `AUTH_TOKEN_MISMATCH` 的行為：
  - 受信任的客戶端可以嘗試使用快取的每裝置權杖進行一次有限的重新嘗試。
  - 如果該重新嘗試失敗，客戶端應停止自動重新連線迴圈，並顯示操作員操作指引。

## 裝置身分識別 + 配對

- 節點應包含衍生自金鑰對指紋的穩定裝置身分識別 (`device.id`)。
- 閘道會根據裝置 + 角色發出權杖。
- 除非啟用了本機自動核准，否則新的裝置 ID 需要配對核准。
- 配對自動核准以直接的本機回送連線為中心。
- OpenClaw 也有一個狹窄的後端/容器本機自我連線路徑，用於受信任的共用金鑰輔助流程。
- 相同主機的 tailnet 或 LAN 連線在配對時仍被視為遠端連線，需要核准。
- 所有 WS 客戶端必須在 `connect` 期間 (操作員 + 節點) 包含 `device` 身分識別。控制 UI 只有在這些模式下可以省略它：
  - `gateway.controlUi.allowInsecureAuth=true`，僅用於本機主機的不安全 HTTP 相容性。
  - 成功的 `gateway.auth.mode: "trusted-proxy"` 操作員控制 UI 驗證。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (破窗，嚴重的安全性降級)。
- 所有連線必須簽署伺服器提供的 `connect.challenge` 隨機數。

### 裝置驗證移轉診斷

對於仍使用 pre-challenge 簽署行為的舊版客戶端，`connect` 現在會在 `error.details.code` 下回傳具有穩定 `error.details.reason` 的 `DEVICE_AUTH_*` 詳細代碼。

常見的遷移失敗：

| 訊息                        | details.code                     | details.reason           | 含義                                          |
| --------------------------- | -------------------------------- | ------------------------ | --------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客戶端省略了 `device.nonce`（或傳送了空值）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客戶端使用了過時/錯誤的 nonce 進行簽署。      |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 簽署的 payload 不符合 v2 payload。            |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 簽署時間戳超出允許的偏移範圍。                |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 與公鑰指紋不符。                  |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公鑰格式/正規化失敗。                         |

遷移目標：

- 務必等待 `connect.challenge`。
- 對包含伺服器 nonce 的 v2 payload 進行簽署。
- 在 `connect.params.device.nonce` 中傳送相同的 nonce。
- 偏好的簽署 payload 是 `v3`，除了 device/client/role/scopes/token/nonce 欄位外，它還綁定了 `platform` 和 `deviceFamily`。
- 舊版 `v2` 簽署為了相容性仍被接受，但在重新連線時，配對裝置的中繼資料固定仍控制指令策略。

## TLS + 固定

- WS 連線支援 TLS。
- 客戶端可以選擇固定閘道憑證指紋（請參閱 `gateway.tls` 組態加上 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 範圍

此協定公開了**完整的閘道 API**（狀態、頻道、模型、聊天、代理、會話、節點、核准等）。其確切表面是由 `src/gateway/protocol/schema.ts` 中的 TypeBox 結構定義的。
