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

## 握手 (連線)

Gateway → 用戶端 (連線前挑戰)：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

用戶端 → Gateway：

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

Gateway → 用戶端：

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

`server`、`features`、`snapshot` 和 `policy` 都是架構
(`src/gateway/protocol/schema/frames.ts`) 所要求的。`canvasHostUrl` 是可選的。`auth`
會在可用時回報協商的角色/範圍，並且當閘道發出裝置權杖時會包含 `deviceToken`。

當未發出裝置權杖時，`hello-ok.auth` 仍可回報協商的權限：

```json
{
  "auth": {
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

當發出裝置權杖時，`hello-ok` 也包含：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

在受信任的啟動移交期間，`hello-ok.auth` 可能還會在 `deviceTokens` 中包含額外的
受限角色項目：

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

對於內建的節點/操作員啟動流程，主要節點權杖保持
`scopes: []` 狀態，且任何移交的操作員權杖保持受限於啟動
操作員允許清單 (`operator.approvals`、`operator.read`、
`operator.talk.secrets`、`operator.write`)。啟動範圍檢查保持
角色前綴：操作員項目僅滿足操作員請求，而非操作員
角色仍需要在其自身角色前綴下的範圍。

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

## 幀結構

- **請求**：`{type:"req", id, method, params}`
- **回應**：`{type:"res", id, ok, payload|error}`
- **事件**：`{type:"event", event, payload, seq?, stateVersion?}`

具有副作用的方法需要 **等冪性金鑰** (請參閱架構)。

## 角色 + 範圍

### 角色

- `operator` = 控制平面用戶端 (CLI/UI/自動化)。
- `node` = 功能主機 (camera/screen/canvas/system.run)。

### 範圍 (操作員)

常見範圍：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`
- `operator.talk.secrets`

`talk.config` 搭配 `includeSecrets: true` 需要 `operator.talk.secrets`
（或 `operator.admin`）。

外掛程式註冊的 Gateway RPC 方法可以請求自己的操作員範圍，但
保留的核心管理員前綴（`config.*`、`exec.approvals.*`、`wizard.*`、
`update.*`）始終解析為 `operator.admin`。

方法範圍只是第一道關卡。透過
`chat.send` 到達的部分斜線指令會在之上套用更嚴格的指令層級檢查。例如，持久的
`/config set` 和 `/config unset` 寫入需要 `operator.admin`。

`node.pair.approve` 在基礎方法範圍之上還有一個額外的審批時間範圍檢查：

- 無指令請求：`operator.pairing`
- 帶有非執行節點指令的請求：`operator.pairing` + `operator.write`
- 包含 `system.run`、`system.run.prepare` 或 `system.which` 的請求：
  `operator.pairing` + `operator.admin`

### Caps/commands/permissions (node)

節點會在連線時宣告能力聲明：

- `caps`：高層級能力類別。
- `commands`：用於調用的指令允許清單。
- `permissions`：細粒度切換（例如 `screen.record`、`camera.capture`）。

Gateway 將這些視為**聲明**並執行伺服器端允許清單。

## Presence

- `system-presence` 傳回以裝置身分為鍵的項目。
- Presence 項目包含 `deviceId`、`roles` 和 `scopes`，因此即使裝置同時作為 **operator** 和 **node** 連線，UI 也能為每個裝置顯示單一行。

## Common RPC method families

此頁面並非產生的完整傾印，但公開的 WS 表面比上述握手/身份驗證範例更廣泛。這些是 Gateway 目前公開的主要方法系列。

`hello-ok.features.methods` 是一個保守的探索列表，它是根據 `src/gateway/server-methods-list.ts` 以及已載入的外掛/通道方法匯出構建的。將其視為功能探索，而不是在 `src/gateway/server-methods/*.ts` 中實施的每個可呼叫輔助程式的生成傾印。

### 系統與身分

- `health` 會傳回已快取或新探測的閘道健康狀態快照。
- `status` 會傳回 `/status` 風格的閘道摘要；敏感欄位僅包含在具備 admin 範圍的操作員客戶端中。
- `gateway.identity.get` 會傳回中繼和配對流程所使用的閘道裝置身分。
- `system-presence` 會傳回已連線的操作員/節點裝置的目前狀態快照。
- `system-event` 會附加系統事件，並且可以更新/廣播狀態上下文。
- `last-heartbeat` 會傳回最新持續化保存的心跳事件。
- `set-heartbeats` 會切換閘道上的心跳處理。

### 模型與使用情況

- `models.list` 會傳回執行時期允許的模型目錄。
- `usage.status` 會傳回提供者使用時段/剩餘配額摘要。
- `usage.cost` 會傳回特定日期範圍的彙總成本使用摘要。
- `doctor.memory.status` 會傳回作用中預設代理程式工作區的向量記憶/嵌入就緒狀態。
- `sessions.usage` 會傳回每個工作階段的使用摘要。
- `sessions.usage.timeseries` 會傳回單一工作階段的時間序列使用量。
- `sessions.usage.logs` 會傳回單一工作階段的使用記錄項目。

### 通道與登入輔助程式

- `channels.status` 會傳回內建 + 綁定的通道/外掛狀態摘要。
- `channels.logout` 會登出特定通道/帳戶（前提是該通道支援登出）。
- `web.login.start` 會針對目前支援 QR code 的網頁通道提供者啟動 QR/網頁登入流程。
- `web.login.wait` 會等待該 QR/網頁登入流程完成，並在成功時啟動通道。
- `push.test` 會傳送測試 APNs 推播通知至已註冊的 iOS 節點。
- `voicewake.get` 會傳回已儲存的喚醒詞觸發器。
- `voicewake.set` 更新喚醒詞觸發器並廣播變更。

### 訊息與日誌

- `send` 是用於在聊天執行器之外發送特定頻道/帳號/執行緒目標的直接出站傳遞 RPC。
- `logs.tail` 返回已設定的閘道檔案日誌尾部，並包含遊標/限制和最大位元組控制。

### Talk 與 TTS

- `talk.config` 返回有效的 Talk 設定負載；`includeSecrets` 需要 `operator.talk.secrets` (或 `operator.admin`)。
- `talk.mode` 設定/廣播 WebChat/Control UI 用戶端的目前 Talk 模式狀態。
- `talk.speak` 透過作用中的 Talk 語音提供者合成語音。
- `tts.status` 返回 TTS 啟用狀態、作用中提供者、備用提供者以及提供者設定狀態。
- `tts.providers` 返回可見的 TTS 提供者清單。
- `tts.enable` 和 `tts.disable` 切換 TTS 偏好設定狀態。
- `tts.setProvider` 更新首選的 TTS 提供者。
- `tts.convert` 執行單次文字轉語音轉換。

### 秘密、設定、更新與精靈

- `secrets.reload` 重新解析作用中的 SecretRef，並僅在完全成功時交換執行時秘密狀態。
- `secrets.resolve` 解析特定指令/目標組合的指令目標秘密指派。
- `config.get` 返回目前的設定快照與雜湊值。
- `config.set` 寫入已驗證的設定負載。
- `config.patch` 合併部分設定更新。
- `config.apply` 驗證並取代完整的設定負載。
- `config.schema` 返回由控制 UI 和 CLI 工具使用的即時配置架構承載：schema、`uiHints`、版本和生成元數據，包括當運行時可以加載時的外掛程式 + 通道架構元數據。該架構包括欄位 `title` / `description` 元數據，這些元數據衍生自 UI 使用的相同標籤和說明文字，包括巢狀物件、萬用字元、陣列項目，以及當存在相符欄位文件時的 `anyOf` / `oneOf` / `allOf` 組合分支。
- `config.schema.lookup` 返回單個配置路徑的路徑範圍查找承載：正規化路徑、淺層架構節點、相符的提示 + `hintPath`，以及用於 UI/CLI 向下鑽取的直接子摘要。
  - 查找架構節點保留使用者面向的文件和常見驗證欄位：
    `title`、`description`、`type`、`enum`、`const`、`format`、`pattern`，
    數值/字串/陣列/物件邊界，以及布林旗標，例如
    `additionalProperties`、`deprecated`、`readOnly`、`writeOnly`。
  - 子摘要公開 `key`、正規化的 `path`、`type`、`required`、
    `hasChildren`，以及相符的 `hint` / `hintPath`。
- `update.run` 執行閘道更新流程，並僅在更新本身成功時安排重新啟動。
- `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 通過 WS RPC 公開入門嚮導。

### 現有的主要系列

#### 代理程式和工作區輔助工具

- `agents.list` 返回已配置的代理程式項目。
- `agents.create`、`agents.update` 和 `agents.delete` 管理代理記錄和工作區連接。
- `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理為代理公開的引導工作區檔案。
- `agent.identity.get` 返回代理或會話的有效助理身分。
- `agent.wait` 等待執行完成並在可用時返回終端快照。

#### 會話控制

- `sessions.list` 返回當前會話索引。
- `sessions.subscribe` 和 `sessions.unsubscribe` 切換當前 WS 用戶端的會話變更事件訂閱。
- `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 切換單個會話的逐字稿/訊息事件訂閱。
- `sessions.preview` 返回特定會話金鑰的有限逐字稿預覽。
- `sessions.resolve` 解析或規範化會話目標。
- `sessions.create` 建立新的會話條目。
- `sessions.send` 將訊息發送到現有會話中。
- `sessions.steer` 是作用中會話的中斷並引導變體。
- `sessions.abort` 中止會話的作用中工作。
- `sessions.patch` 更新會話元資料/覆寫。
- `sessions.reset`、`sessions.delete` 和 `sessions.compact` 執行會話維護。
- `sessions.get` 返回完整的已儲存會話列。
- 聊天執行仍然使用 `chat.history`、`chat.send`、`chat.abort` 和 `chat.inject`。
- `chat.history` 會針對 UI 客戶端進行顯示正規化處理：內聯指令標籤會從可見文字中移除，純文字工具呼叫 XML 承載（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截斷的工具呼叫區塊）以及洩漏的 ASCII/全形模型控制權杖會被移除，純靜音權杖的助理列（例如精確的 `NO_REPLY` / `no_reply`）會被省略，且過大的列可以用預留位置取代。

#### 裝置配對與裝置權杖

- `device.pair.list` 會傳回待處理與已核准的配對裝置。
- `device.pair.approve`、`device.pair.reject` 和 `device.pair.remove` 會管理裝置配對記錄。
- `device.token.rotate` 會在已核准的角色與範圍界限內輪換配對裝置的權杖。
- `device.token.revoke` 會撤銷配對裝置的權杖。

#### 節點配對、呼叫與待處理工作

- `node.pair.request`、`node.pair.list`、`node.pair.approve`、`node.pair.reject` 和 `node.pair.verify` 涵蓋了節點配對與啟動程序驗證。
- `node.list` 和 `node.describe` 會傳回已知/已連線的節點狀態。
- `node.rename` 會更新配對節點的標籤。
- `node.invoke` 會將指令轉送至已連線的節點。
- `node.invoke.result` 會傳回呼叫請求的結果。
- `node.event` 會將源自節點的事件帶回到閘道中。
- `node.canvas.capability.refresh` 會重新整理限定範圍的 canvas 能力權杖。
- `node.pending.pull` 和 `node.pending.ack` 是已連線節點的佇列 API。
- `node.pending.enqueue` 和 `node.pending.drain` 會管理離線/已斷線節點的耐用待處理工作。

#### 核准系列

- `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和
  `exec.approval.resolve` 涵蓋一次性執行核准請求以及待處理
  核准查詢/重播。
- `exec.approval.waitDecision` 等待一個待處理的執行核准並返回
  最終決定（或在逾時時返回 `null`）。
- `exec.approvals.get` 和 `exec.approvals.set` 管理閘道執行核准
  策略快照。
- `exec.approvals.node.get` 和 `exec.approvals.node.set` 透過節點中繼指令管理節點本機執行
  核准策略。
- `plugin.approval.request`、`plugin.approval.list`、
  `plugin.approval.waitDecision` 和 `plugin.approval.resolve` 涵蓋
  外掛程式定義的核准流程。

#### 其他主要系列

- 自動化：
  - `wake` 排定立即或下一次心跳的喚醒文字插入
  - `cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、
    `cron.run`、`cron.runs`
- 技能/工具：`commands.list`、`skills.*`、`tools.catalog`、`tools.effective`

### 常見事件系列

- `chat`：UI 聊天更新，例如 `chat.inject` 以及其他僅限文字記錄的聊天
  事件。
- `session.message` 和 `session.tool`：已訂閱工作階段的文字記錄/事件串流更新。
- `sessions.changed`：工作階段索引或中繼資料已變更。
- `presence`：系統狀態快照更新。
- `tick`：定期保活/存活事件。
- `health`：閘道健康狀態快照更新。
- `heartbeat`：心跳事件串流更新。
- `cron`：cron 執行/工作變更事件。
- `shutdown`：閘道關閉通知。
- `node.pair.requested` / `node.pair.resolved`：節點配對生命週期。
- `node.invoke.request`：節點調用請求廣播。
- `device.pair.requested` / `device.pair.resolved`：配對裝置生命週期。
- `voicewake.changed`：喚醒詞觸發配置已更改。
- `exec.approval.requested` / `exec.approval.resolved`：執行核准
  生命週期。
- `plugin.approval.requested` / `plugin.approval.resolved`：外掛核准
  生命週期。

### 節點輔助方法

- 節點可以呼叫 `skills.bins` 來獲取目前的技能可執行檔列表，
  以進行自動允許檢查。

### 操作員輔助方法

- 操作員可以呼叫 `commands.list` (`operator.read`) 來獲取代理的
  執行時期指令清單。
  - `agentId` 是可選的；省略它以讀取預設代理工作區。
  - `scope` 控制主要 `name` 的目標介面：
    - `text` 返回主要文字指令權杖，不包含開頭的 `/`
    - `native` 和預設的 `both` 路徑在可用時返回
      具備提供者感知的原生名稱
  - `textAliases` 攜帶精確的斜線別名，例如 `/model` 和 `/m`。
  - `nativeName` 在存在時攜帶具備提供者感知的原生指令名稱。
  - `provider` 是可選的，僅影響原生命名和原生外掛
    指令的可用性。
  - `includeArgs=false` 省略回應中的序列化參數元數據。
- 操作員可以呼叫 `tools.catalog` (`operator.read`) 來獲取代理的
  執行時期工具目錄。回應包括分組的工具和來源元數據：
  - `source`： `core` 或 `plugin`
  - `pluginId`：外掛擁有者（當 `source="plugin"` 時）
  - `optional`：外掛工具是否為可選
- 操作員可以呼叫 `tools.effective` (`operator.read`) 來擷取會話的執行期有效工具清單。
  - `sessionKey` 是必填的。
  - 閘道是從伺服器端的會話衍生出受信任的執行期上下文，而不是接受呼叫者提供的驗證或傳遞上下文。
  - 回應是範圍限定於會話的，並反映目前對話可以立即使用的內容，包括核心、外掛和通道工具。
- 操作員可以呼叫 `skills.status` (`operator.read`) 來擷取代理程式的可見技能清單。
  - `agentId` 是選填的；省略它以讀取預設的代理程式工作區。
  - 回應包含資格、缺少的需求、配置檢查，以及經過清理的安裝選項，而不會暴露原始秘密值。
- 操作員可以呼叫 `skills.search` 和 `skills.detail` (`operator.read`) 以取得 ClawHub 探索中繼資料。
- 操作員可以透過兩種模式呼叫 `skills.install` (`operator.admin`)：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 將技能資料夾安裝到預設的代理程式工作區 `skills/` 目錄中。
  - 閘道安裝程式模式：`{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }`
    在閘道主機上執行宣告的 `metadata.openclaw.install` 動作。
- 操作員可以透過兩種模式呼叫 `skills.update` (`operator.admin`)：
  - ClawHub 模式會更新預設代理程式工作區中的一個追蹤 slug 或所有已追蹤的 ClawHub 安裝。
  - 配置模式會修補 `skills.entries.<skillKey>` 值，例如 `enabled`、
    `apiKey` 和 `env`。

## 執行批准

- 當執行請求需要批准時，閘道會廣播 `exec.approval.requested`。
- 操作員用戶端透過呼叫 `exec.approval.resolve` 來解決 (需要 `operator.approvals` 範圍)。
- 對於 `host=node`，`exec.approval.request` 必須包含 `systemRunPlan`（標準 `argv`/`cwd`/`rawCommand`/session 中繼資料）。缺少 `systemRunPlan` 的請求會被拒絕。
- 核准後，轉發的 `node.invoke system.run` 呼叫會重複使用該標準
  `systemRunPlan` 作為權威 command/cwd/session 上下文。
- 如果呼叫者在準備和最終核准的 `system.run` 轉發之間變異了 `command`、`rawCommand`、`cwd`、`agentId` 或
  `sessionKey`，閘道會拒絕該次執行，而不是信任變異後的承載。

## Agent 遞送後援

- `agent` 請求可以包含 `deliver=true` 以要求 outbound 遞送。
- `bestEffortDeliver=false` 保持嚴格行為：未解析或僅限內部的遞送目標會回傳 `INVALID_REQUEST`。
- 當無法解析外部可遞送路由時（例如內部/webchat 會話或模糊的多通道配置），`bestEffortDeliver=true` 允許後援至僅限會話的執行。

## 版本控制

- `PROTOCOL_VERSION` 位於 `src/gateway/protocol/schema/protocol-schemas.ts` 中。
- 用戶端發送 `minProtocol` + `maxProtocol`；伺服器會拒絕不符的版本。
- Schemas + models 從 TypeBox 定義生成：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### 用戶端常數

`src/gateway/client.ts` 中的參考用戶端使用這些預設值。這些值在 protocol v3 中保持穩定，並且是第三方用戶端的預期基準。

| 常數                                      | 預設                                                  | 來源                                                       |
| ----------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| `PROTOCOL_VERSION`                        | `3`                                                   | `src/gateway/protocol/schema/protocol-schemas.ts`          |
| 請求逾時（每個 RPC）                      | `30_000` 毫秒                                         | `src/gateway/client.ts` (`requestTimeoutMs`)               |
| Preauth / connect-challenge 逾時          | `10_000` ms                                           | `src/gateway/handshake-timeouts.ts` (clamp `250`–`10_000`) |
| Initial reconnect backoff                 | `1_000` ms                                            | `src/gateway/client.ts` (`backoffMs`)                      |
| Max reconnect backoff                     | `30_000` ms                                           | `src/gateway/client.ts` (`scheduleReconnect`)              |
| Fast-retry clamp after device-token close | `250` ms                                              | `src/gateway/client.ts`                                    |
| Force-stop grace before `terminate()`     | `250` ms                                              | `FORCE_STOP_TERMINATE_GRACE_MS`                            |
| `stopAndWait()` default timeout           | `1_000` ms                                            | `STOP_AND_WAIT_TIMEOUT_MS`                                 |
| Default tick interval (pre `hello-ok`)    | `30_000` ms                                           | `src/gateway/client.ts`                                    |
| Tick-timeout close                        | code `4000` when silence exceeds `tickIntervalMs * 2` | `src/gateway/client.ts`                                    |
| `MAX_PAYLOAD_BYTES`                       | `25 * 1024 * 1024` (25 MB)                            | `src/gateway/server-constants.ts`                          |

The server advertises the effective `policy.tickIntervalMs`, `policy.maxPayload`,
and `policy.maxBufferedBytes` in `hello-ok`; clients should honor those values
rather than the pre-handshake defaults.

## Auth

- Shared-secret gateway auth uses `connect.params.auth.token` or
  `connect.params.auth.password`, depending on the configured auth mode.
- Identity-bearing modes such as Tailscale Serve
  (`gateway.auth.allowTailscale: true`) or non-loopback
  `gateway.auth.mode: "trusted-proxy"` satisfy the connect auth check from
  request headers instead of `connect.params.auth.*`.
- Private-ingress `gateway.auth.mode: "none"` skips shared-secret connect auth
  entirely; do not expose that mode on public/untrusted ingress.
- After pairing, the Gateway issues a **device token** scoped to the connection
  role + scopes. It is returned in `hello-ok.auth.deviceToken` and should be
  persisted by the client for future connects.
- 客戶端應在任何成功連接後保存主要 `hello-ok.auth.deviceToken`。
- 使用該 **已儲存** 裝置令牌重新連接時，也應重複使用為該令牌儲存的已批准範圍集合。這可保留已授予的讀取/探測/狀態存取權，並避免將重新連接無聲地收窄為較窄的隱含僅限管理員範圍。
- 客戶端連接驗證組裝（`selectConnectAuth` 於
  `src/gateway/client.ts`）：
  - `auth.password` 是正交的，並且在設定時總是會被轉發。
  - `auth.token` 按優先順序填充：首先是明確的共享令牌，
    然後是明確的 `deviceToken`，接著是儲存的每裝置令牌（以
    `deviceId` + `role` 為鍵）。
  - 僅當上述未解析出 `auth.token` 時才發送
    `auth.bootstrapToken`。共享令牌或任何解析出的裝置令牌會將其抑制。
  - 在一次性 `AUTH_TOKEN_MISMATCH` 重試時自動升級已儲存的裝置令牌僅限於 **受信任的端點** —
    迴路，或是具有釘選 `tlsFingerprint` 的 `wss://`。未釘選的公用 `wss://`
    不符合資格。
- 額外的 `hello-ok.auth.deviceTokens` 項目是引導交遞令牌。
  僅當連接在受信任的傳輸（例如 `wss://` 或迴路/本機配對）上使用引導驗證時才儲存它們。
- 如果客戶端提供 **明確的** `deviceToken` 或明確的 `scopes`，該
  呼叫者請求的範圍集合將保持權威；僅當客戶端重複使用儲存的每裝置令牌時，才會重複使用快取的範圍。
- 裝置令牌可以透過 `device.token.rotate` 和
  `device.token.revoke` 輪換/撤銷（需要 `operator.pairing` 範圍）。
- 令牌簽發/輪換始終受限於記錄在該裝置配對條目中的已批准角色集合；輪換令牌無法將裝置擴展為配對批准從未授予的角色。
- 對於配對裝置權杖階段，除非呼叫者也擁有 `operator.admin`，否則裝置管理為自行限定範圍：非管理員呼叫者只能移除/撤銷/輪換其**自己**的裝置項目。
- `device.token.rotate` 也會根據呼叫者目前的階段範圍，檢查請求的操作員範圍集合。非管理員呼叫者無法將權杖輪換成比其目前持有範圍更廣泛的操作員範圍集合。
- 驗證失敗包括 `error.details.code` 加上復原提示：
  - `error.details.canRetryWithDeviceToken` (布林值)
  - `error.details.recommendedNextStep` (`retry_with_device_token`、`update_auth_configuration`、`update_auth_credentials`、`wait_then_retry`、`review_auth_configuration`)
- 對於 `AUTH_TOKEN_MISMATCH` 的客戶端行為：
  - 受信任的客戶端可以使用快取的每裝置權杖嘗試一次有限的重試。
  - 如果該重試失敗，客戶端應停止自動重新連線迴圈並提供操作員操作指引。

## 裝置身分 + 配對

- 節點應包含從金鑰對指紋衍生的穩定裝置身分 (`device.id`)。
- 閘道會發出每個裝置 + 角色的權杖。
- 除非啟用了本機自動核准，否則新的裝置 ID 需要配對核准。
- 配對自動核准以直接的本機迴路連線為中心。
- OpenClaw 也有一個狹窄的後端/容器本機自我連線路徑，用於受信任的共享金鑰輔助流程。
- 相同主機的 tailnet 或 LAN 連線在配對時仍被視為遠端連線，並需要核准。
- 所有 WS 客戶端必須在 `connect` 期間包含 `device` 身分 (操作員 + 節點)。
  控制 UI 只能在這些模式下省略它：
  - `gateway.controlUi.allowInsecureAuth=true` 用於僅限本機主機的不安全 HTTP 相容性。
  - 成功的 `gateway.auth.mode: "trusted-proxy"` 操作員控制 UI 驗證。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (緊急情況，嚴重的安全性降級)。
- 所有連線必須簽署伺服器提供的 `connect.challenge` nonce。

### 裝置驗證移轉診斷

對於仍使用預挑戰簽名行為的舊版客戶端，`connect` 現在會在 `error.details.code` 下返回帶有穩定 `error.details.reason` 的 `DEVICE_AUTH_*` 詳細代碼。

常見遷移失敗：

| 訊息                        | details.code                     | details.reason           | 含義                                            |
| --------------------------- | -------------------------------- | ------------------------ | ----------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客戶端省略了 `device.nonce`（或發送了空白值）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客戶端使用了過時/錯誤的 nonce 進行簽名。        |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 簽名負載與 v2 負載不匹配。                      |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 簽名時間戳超出允許的偏差範圍。                  |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 與公鑰指紋不匹配。                  |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公鑰格式/正規化失敗。                           |

遷移目標：

- 始終等待 `connect.challenge`。
- 對包含伺服器 nonce 的 v2 負載進行簽名。
- 在 `connect.params.device.nonce` 中發送相同的 nonce。
- 首選的簽名負載是 `v3`，它除了綁定 device/client/role/scopes/token/nonce 欄位外，還綁定了 `platform` 和 `deviceFamily`。
- 舊版 `v2` 簽名為了兼容性仍被接受，但在重新連接時，配對設備元數據固定仍控制指令策略。

## TLS + 固定

- WS 連接支援 TLS。
- 客戶端可以選擇固定閘道憑證指紋（請參閱 `gateway.tls` 配置以及 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 範圍

此協議暴露了 **完整的 gateway API**（狀態、頻道、模型、聊天、代理、會話、節點、審批等）。確切的介面由 `src/gateway/protocol/schema.ts` 中的 TypeBox schemas 定義。
