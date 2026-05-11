---
summary: "Gateway WebSocket 協定：握手、幀、版本控制"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "Gateway 協定"
---

Gateway WS 協定是 OpenClaw 的**單一控制平面 + 節點傳輸**。所有客戶端（CLI、網頁 UI、macOS 應用程式、iOS/Android 節點、無頭節點）都透過 WebSocket 連線，並在握手時宣告其**角色** + **範圍**。

## 傳輸

- WebSocket，具有 JSON 載荷的文字幀。
- 第一個幀**必須**是 `connect` 請求。
- 連線前幀上限為 64 KiB。成功握手後，客戶端應遵循 `hello-ok.policy.maxPayload` 和 `hello-ok.policy.maxBufferedBytes` 限制。啟用診斷後，過大的入站幀和緩慢的出站緩衝區會在 Gateway 關閉或丟棄受影響的幀之前發出 `payload.large` 事件。這些事件會保留大小、限制、介面和安全原因代碼。它們不會保留訊息主體、附件內容、原始幀主體、權杖、Cookie 或秘密值。

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
    "auth": {
      "role": "operator",
      "scopes": ["operator.read", "operator.write"]
    },
    "policy": {
      "maxPayload": 26214400,
      "maxBufferedBytes": 52428800,
      "tickIntervalMs": 15000
    }
  }
}
```

`server`、`features`、`snapshot` 和 `policy` 都是 Schema (`src/gateway/protocol/schema/frames.ts`) 所要求的。`auth` 也是必需的，並回報協商的角色/範圍。`canvasHostUrl` 則是選用的。

當未發裝置權杖時，`hello-ok.auth` 會回報不包含權杖欄位的協商權限：

```json
{
  "auth": {
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

受信任的同行程後端客戶端（`client.id: "gateway-client"`、`client.mode: "backend"`）在使用共用 Gateway 權杖/密碼進行驗證時，可以在直接回送連線上省略 `device`。此路徑保留給內部控制平面 RPC，並防止過時的 CLI/裝置配對基準阻擋本機後端工作，例如子代理程式會話更新。遠端客戶端、瀏覽器來源客戶端、節點客戶端，以及明確的裝置權杖/裝置身分客戶端仍使用正常的配對和範圍升級檢查。

當發裝置權杖時，`hello-ok` 也會包含：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

在受信任的引導程序交接期間，`hello-ok.auth` 也可能會在 `deviceTokens` 中包含額外的受限角色條目：

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

對於內建的 node/operator bootstrap 流程，主要 node token 保持為
`scopes: []`，且任何移交的 operator token 保持受限於 bootstrap
operator allowlist (`operator.approvals`, `operator.read`,
`operator.talk.secrets`, `operator.write`)。Bootstrap scope 檢查保持
role-prefixed：operator 條目僅滿足 operator 請求，且 non-operator
roles 仍需要在其自己的 role 前綴下的 scopes。

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

- **Request**: `{type:"req", id, method, params}`
- **Response**: `{type:"res", id, ok, payload|error}`
- **Event**: `{type:"event", event, payload, seq?, stateVersion?}`

具有副作用的方法需要 **冪等金鑰** (idempotency keys) (請參閱架構)。

## 角色 + 範圍

### 角色

- `operator` = control plane client (CLI/UI/automation)。
- `node` = capability host (camera/screen/canvas/system.run)。

### 範圍（操作員）

常見範圍：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`
- `operator.talk.secrets`

`talk.config` 搭配 `includeSecrets: true` 需要 `operator.talk.secrets`
(或 `operator.admin`)。

Plugin-registered gateway RPC methods 可以請求自己的 operator scope，但
保留的核心管理員前綴 (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) 總是解析為 `operator.admin`。

Method scope 只是第一道關卡。透過 `chat.send` 存取的某些斜線指令會在頂層應用更嚴格的指令層級檢查。例如，持久化
`/config set` 和 `/config unset` 寫入需要 `operator.admin`。

`node.pair.approve` 在基礎 method scope 之上還有一個額外的 approval-time scope 檢查：

- 無指令請求：`operator.pairing`
- 包含非執行 node 指令的請求：`operator.pairing` + `operator.write`
- 包含 `system.run`、`system.run.prepare` 或 `system.which` 的請求：
  `operator.pairing` + `operator.admin`

### 功能/指令/權限（節點）

節點會在連接時宣告功能宣告：

- `caps`：高層級能力類別。
- `commands`：用於 invoke 的指令允許清單。
- `permissions`：細粒度切換（例如 `screen.record`、`camera.capture`）。

閘道將這些視為 **宣告**，並強制執行伺服器端允許清單。

## 線上狀態

- `system-presence` 返回以裝置身分為鍵的項目。
- Presence 項目包含 `deviceId`、`roles` 和 `scopes`，以便即使裝置同時作為 **operator** 和 **node** 連接，UI 也能每個裝置顯示單一行。

## 廣播事件範圍

伺服器推送的 WebSocket 廣播事件受到範圍限制，因此配對範圍或僅限節點的工作階段不會被動接收工作階段內容。

- **聊天、代理和工具結果框架**（包括串流 `agent` 事件和工具呼叫結果）至少需要 `operator.read`。沒有 `operator.read` 的會話會完全跳過這些框架。
- **外掛定義的 `plugin.*` 廣播**會根據外掛的註冊方式限制為 `operator.write` 或 `operator.admin`。
- **狀態和傳輸事件**（`heartbeat`、`presence`、`tick`、連接/斷線生命週期等）保持不受限制，以便每個已驗證的會話都能觀察傳輸的健康狀況。
- **未知的廣播事件系列**預設受到範圍限制（預設攔截），除非註冊的處理程序明確放寬限制。

每個客戶端連線都會保留自己的每個客戶端序號，以便即使在不同的客戶端看到不同範圍過濾的事件流子集時，廣播仍能在該 socket 上保持單調順序。

## 常見 RPC 方法系列

公開的 WS 表面比上述握手/身份驗證示例更廣泛。這不是生成的轉儲——`hello-ok.features.methods` 是一個保守的發現清單，由 `src/gateway/server-methods-list.ts` 以及已載入的外掛/通道方法匯出構建。將其視為功能發現，而不是 `src/gateway/server-methods/*.ts` 的完整列舉。

<AccordionGroup>
  <Accordion title="系統與身分">
    - `health` 回傳快取或新探測的閘道健康狀態快照。
    - `diagnostics.stability` 回傳近期的有界診斷穩定性記錄器。它保留操作元數據，例如事件名稱、計數、位元組大小、記憶體讀數、佇列/會話狀態、頻道/外掛名稱和會話 ID。它不保留聊天文字、Webhook 內文、工具輸出、原始請求或回應內文、Token、Cookie 或機密值。需要操作員讀取權限。
    - `status` 回傳 `/status` 風格的閘道摘要；敏感欄位僅包含在具有管理員範圍的操作員用戶端中。
    - `gateway.identity.get` 回傳中繼和配對流程所使用的閘道裝置身分。
    - `system-presence` 回傳已連線操作員/節點裝置的目前狀態快照。
    - `system-event` 附加系統事件並可更新/廣播狀態上下文。
    - `last-heartbeat` 回傳最新持久化的心跳事件。
    - `set-heartbeats` 切換閘道上的心跳處理。
  </Accordion>

  <Accordion title="模型與使用狀況">
    - `models.list` 回傳執行時期允許的模型目錄。
    - `usage.status` 回傳提供者使用量視窗/剩餘配額摘要。
    - `usage.cost` 回傳日期範圍的彙總成本使用量摘要。
    - `doctor.memory.status` 回傳作用中預設代理工作區的向量記憶體 / 快取嵌入就緒狀態。僅當呼叫者明確想要即時嵌入提供者 Ping 時，才傳遞 `{ "probe": true }` 或 `{ "deep": true }`。
    - `sessions.usage` 回傳每個會話的使用量摘要。
    - `sessions.usage.timeseries` 回傳單一會話的時間序列使用量。
    - `sessions.usage.logs` 回傳單一會話的使用量記錄項目。
  </Accordion>

<Accordion title="頻道與登入協助工具">
  - `channels.status` 傳回內建 + 捆綁的頻道/外掛狀態摘要。 - `channels.logout` 登出支援登出的特定頻道/帳戶。 - `web.login.start` 為當前支援 QR 的網路頻道提供者啟動 QR/網路登入流程。 - `web.login.wait` 等待該 QR/網路登入流程完成，並在成功時啟動頻道。 - `push.test` 傳送測試 APNs 推播至已註冊的 iOS 節點。 - `voicewake.get` 傳回已儲存的喚醒詞觸發器。 - `voicewake.set` 更新喚醒詞觸發器並廣播變更。
</Accordion>

<Accordion title="訊息與日誌">- `send` 是用於聊天執行器外部的頻道/帳戶/執行緒目標傳送的直接出站傳遞 RPC。 - `logs.tail` 傳回具有游標/限制和最大位元組控制的已設定閘道檔案日誌尾端。</Accordion>

<Accordion title="Talk 與 TTS">
  - `talk.config` 傳回有效的 Talk 設定負載；`includeSecrets` 需要 `operator.talk.secrets` (或 `operator.admin`)。 - `talk.mode` 設定/廣播 WebChat/Control UI 客戶端的當前 Talk 模式狀態。 - `talk.speak` 透過作用中的 Talk 語音提供者合成語音。 - `tts.status` 傳回 TTS 啟用狀態、作用中提供者、後備提供者以及提供者設定狀態。 - `tts.providers` 傳回可見的 TTS 提供者清單。 - `tts.enable` 和 `tts.disable`
  切換 TTS 偏好設定狀態。 - `tts.setProvider` 更新首選的 TTS 提供者。 - `tts.convert` 執行一次性文字轉語音轉換。
</Accordion>

<Accordion title="機密、設定、更新與精靈">
  - `secrets.reload` 重新解析作用中的 SecretRefs，並僅在完全成功時交換執行時期的機密狀態。 - `secrets.resolve` 解析特定指令/目標集的指令目標機密指派。 - `config.get` 傳回目前的設定快照與雜湊值。 - `config.set` 寫入已驗證的設定承載。 - `config.patch` 合併部分設定更新。 - `config.apply` 驗證並替換完整的設定承載。 - `config.schema` 傳回 Control UI 與 CLI
  工具所使用的即時設定綱要承載：schema、`uiHints`、版本與生成元資料，當執行時期能載入時，包含外掛與頻道綱要元資料。綱要包含欄位 `title` / `description` 元資料，衍生自 UI 使用的相同標籤與說明文字，包括巢狀物件、萬用字元、陣列項目，以及 `anyOf` / `oneOf` / `allOf` 組合分支（當存在相符的欄位文件時）。 - `config.schema.lookup` 傳回單一設定路徑的路徑範圍查詢承載：正規化路徑、淺層綱要節點、相符提示 +
  `hintPath`，以及 UI/CLI 鑽取的直接子項摘要。查詢綱要節點保留使用者導向文件與常見驗證欄位（`title`、`description`、`type`、`enum`、`const`、`format`、`pattern`、數值/字串/陣列/物件邊界，以及標記如 `additionalProperties`、`deprecated`、`readOnly`、`writeOnly`）。子項摘要公開 `key`、正規化 `path`、`type`、`required`、`hasChildren`，以及相符的 `hint` / `hintPath`。 - `update.run`
  執行閘道更新流程，並僅在更新本身成功時排程重新啟動。 - `update.status` 傳回最新的快取更新重新啟動標記，包括可用時重新啟動後的執行版本。 - `wizard.start`、`wizard.next`、`wizard.status` 與 `wizard.cancel` 透過 WS RPC 公開入門精靈。
</Accordion>

<Accordion title="Agent and workspace helpers">- `agents.list` 返回已配置的代理條目。 - `agents.create`、`agents.update` 和 `agents.delete` 管理代理記錄和工作區連線。 - `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理為代理公開的引導工作區檔案。 - `agent.identity.get` 返回代理或會話的有效助手身分。 - `agent.wait` 等待執行完成，並在可用時返回終端機快照。</Accordion>

<Accordion title="工作階段控制">
  - `sessions.list` 回傳目前的工作階段索引。 - `sessions.subscribe` 和 `sessions.unsubscribe` 切換目前 WS 用戶端的工作階段變更事件訂閱。 - `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 切換單一工作階段的文字記錄/訊息事件訂閱。 - `sessions.preview` 回傳特定工作階段金鑰的有限文字記錄預覽。 - `sessions.resolve` 解析或正規化工作階段目標。 - `sessions.create` 建立新的工作階段項目。 -
  `sessions.send` 將訊息傳送至現有的工作階段。 - `sessions.steer` 是針對作用中工作階段的中斷與引導變體。 - `sessions.abort` 中止工作階段的作用中工作。 - `sessions.patch` 更新工作階段中繼資料/覆寫值。 - `sessions.reset`、`sessions.delete` 和 `sessions.compact` 執行工作階段維護。 - `sessions.get` 回傳完整的已儲存工作階段資料列。 - 聊天執行仍使用 `chat.history`、`chat.send`、`chat.abort` 和
  `chat.inject`。`chat.history` 已針對 UI 用戶端進行顯示正規化：行內指令標籤會從可見文字中移除，純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截斷的工具呼叫區塊）以及外洩的 ASCII/全型模型控制權杖會被移除，純靜音權杖助理資料列（如完全一致的 `NO_REPLY` /
  `no_reply`）會被省略，而過大的資料列可以被取代為預留位置。
</Accordion>

<Accordion title="裝置配對與裝置權杖">- `device.pair.list` 會傳回待審核與已核准的配對裝置。 - `device.pair.approve`、`device.pair.reject` 與 `device.pair.remove` 用於管理裝置配對紀錄。 - `device.token.rotate` 會在其已核准的角色與呼叫者範圍界限內輪替配對裝置的權杖。 - `device.token.revoke` 會在其已核准的角色與呼叫者範圍界限內撤銷配對裝置的權杖。</Accordion>

<Accordion title="節點配對、叫用與待處理工作">
  - `node.pair.request`、`node.pair.list`、`node.pair.approve`、`node.pair.reject`、`node.pair.remove` 與 `node.pair.verify` 涵蓋了節點配對與啟動程序驗證。 - `node.list` 與 `node.describe` 會傳回已知/已連線的節點狀態。 - `node.rename` 會更新已配對節點的標籤。 - `node.invoke` 會將指令轉送至已連線的節點。 - `node.invoke.result` 會傳回叫用請求的結果。 - `node.event` 會將源自節點的事件帶回至閘道。 -
  `node.canvas.capability.refresh` 會重新整理範圍化的畫布能力權杖。 - `node.pending.pull` 與 `node.pending.ack` 為已連線節點的佇列 API。 - `node.pending.enqueue` 與 `node.pending.drain` 用於管理離線/已斷線節點的持續性待處理工作。
</Accordion>

<Accordion title="核准系列">
  - `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和 `exec.approval.resolve` 涵蓋一次性執行核准請求以及待處理核准查詢/重播。 - `exec.approval.waitDecision` 等待一個待處理的執行核准並傳回最終決定（或逾時時傳回 `null`）。 - `exec.approvals.get` 和 `exec.approvals.set` 管理閘道執行核准原則快照。 - `exec.approvals.node.get` 和 `exec.approvals.node.set`
  透過節點中繼指令管理節點本機執行核准原則。 - `plugin.approval.request`、`plugin.approval.list`、`plugin.approval.waitDecision` 和 `plugin.approval.resolve` 涵蓋外掛程式定義的核准流程。
</Accordion>

  <Accordion title="自動化、技能和工具">
    - 自動化：`wake` 排定立即或下次心跳喚醒文字注入；`cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、`cron.run` 和 `cron.runs` 管理排程工作。
    - 技能和工具：`commands.list`、`skills.*`、`tools.catalog` 和 `tools.effective`。
  </Accordion>
</AccordionGroup>

### 常見事件系列

- `chat`：UI 聊天更新，例如 `chat.inject` 和其他僅限文字記錄的聊天
  事件。
- `session.message` 和 `session.tool`：已訂閱工作階段的
  文字記錄/事件串流更新。
- `sessions.changed`：工作階段索引或中繼資料已變更。
- `presence`：系統狀態快照更新。
- `tick`：定期保活/存活事件。
- `health`：閘道健康狀況快照更新。
- `heartbeat`：心跳事件串流更新。
- `cron`: cron 執行/工作變更事件。
- `shutdown`: 閘道關閉通知。
- `node.pair.requested` / `node.pair.resolved`: 節點配對生命週期。
- `node.invoke.request`: 節點調用請求廣播。
- `device.pair.requested` / `device.pair.resolved`: 已配對裝置生命週期。
- `voicewake.changed`: 喚醒詞觸發配置已變更。
- `exec.approval.requested` / `exec.approval.resolved`: 執行核准
  生命週期。
- `plugin.approval.requested` / `plugin.approval.resolved`: 外掛程式核准
  生命週期。

### 節點輔助方法

- 節點可以呼叫 `skills.bins` 來擷取目前的技能可執行檔清單
  以進行自動允許檢查。

### 操作員輔助方法

- 操作員可以呼叫 `commands.list` (`operator.read`) 來擷取代理程式的執行階段
  指令清單。
  - `agentId` 是選用的；省略它以讀取預設代理程式工作區。
  - `scope` 控制主要 `name` 的目標介面：
    - `text` 會傳回不帶前導 `/` 的主要文字指令 Token
    - `native` 和預設的 `both` 路徑會在可用時傳回
      具備提供者感知的原生名稱
  - `textAliases` 携帶精確的斜線別名，例如 `/model` 和 `/m`。
  - `nativeName` 在存在時攜帶具備提供者感知的原生指令名稱。
  - `provider` 是選用的，且僅影響原生命名以及原生外掛程式
    指令的可用性。
  - `includeArgs=false` 會從回應中省略序列化的引數中繼資料。
- 操作員可以呼叫 `tools.catalog` (`operator.read`) 來擷取代理程式的執行階段
  工具目錄。回應包括分組的工具和來源中繼資料：
  - `source`: `core` 或 `plugin`
  - `pluginId`：插件所有者，當 `source="plugin"`
  - `optional`：插件工具是否為可選
- 操作員可以呼叫 `tools.effective` (`operator.read`) 來擷取工作階段的有效執行時期工具清單。
  - `sessionKey` 為必要項。
  - 閘道會從伺服器端的工作階段推導受信任的執行時期內容，而不是接受呼叫者提供的驗證或傳遞內容。
  - 回應是以工作階段為範圍，並反映目前主動對話可以使用的內容，包括核心、外掛程式和頻道工具。
- 操作員可以呼叫 `skills.status` (`operator.read`) 來擷取代理程式的可見技能清單。
  - `agentId` 為選用項；省略它以讀取預設代理程式工作區。
  - 回應包含資格、缺失需求、設定檢查，以及經過清理的安裝選項，而不會公開原始的秘密值。
- 操作員可以呼叫 `skills.search` 和 `skills.detail` (`operator.read`) 以取得 ClawHub 探索中繼資料。
- 操作員可以透過兩種模式呼叫 `skills.install` (`operator.admin`)：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 將技能資料夾安裝到預設代理程式工作區的 `skills/` 目錄中。
  - 閘道安裝程式模式：`{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }` 在閘道主機上執行宣告的 `metadata.openclaw.install` 動作。
- 操作員可以透過兩種模式呼叫 `skills.update` (`operator.admin`)：
  - ClawHub 模式會更新預設代理程式工作區中的一個已追蹤 slug 或所有已追蹤的 ClawHub 安裝。
  - 設定模式會修補 `skills.entries.<skillKey>` 值，例如 `enabled`、`apiKey` 和 `env`。

## 執行核准

- 當執行請求需要核准時，閘道會廣播 `exec.approval.requested`。
- 操作員用戶端透過呼叫 `exec.approval.resolve` (需要 `operator.approvals` 範圍) 來解決。
- 對於 `host=node`，`exec.approval.request` 必須包含 `systemRunPlan`（規範的 `argv`/`cwd`/`rawCommand`/session metadata）。缺少 `systemRunPlan` 的請求會被拒絕。
- 批准後，轉發的 `node.invoke system.run` 呼叫會重複使用該規範的
  `systemRunPlan` 作為權威的 command/cwd/session 上下文。
- 如果呼叫者在 prepare 和最終批准的 `system.run` 轉發之間變更了 `command`、`rawCommand`、`cwd`、`agentId` 或
  `sessionKey`，閘道會拒絕該執行，而不是信任變更後的 payload。

## Agent 遞送後備機制

- `agent` 請求可以包含 `deliver=true` 以請求出站遞送。
- `bestEffortDeliver=false` 保持嚴格行為：未解析或僅限內部的遞送目標會傳回 `INVALID_REQUEST`。
- 當無法解析外部可遞送路由時（例如內部/webchat 會話或不明確的多通道配置），`bestEffortDeliver=true` 允許後備至僅限會話的執行。

## 版本控制

- `PROTOCOL_VERSION` 存在於 `src/gateway/protocol/schema/protocol-schemas.ts` 中。
- 用戶端發送 `minProtocol` + `maxProtocol`；伺服器會拒絕不匹配的請求。
- Schema + 模型是從 TypeBox 定義生成的：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### 用戶端常數

`src/gateway/client.ts` 中的參考用戶端使用這些預設值。這些值在 protocol v3 中保持穩定，並且是第三方用戶端的預期基線。

| 常數                                      | 預設值                                                | 來源                                                       |
| ----------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| `PROTOCOL_VERSION`                        | `3`                                                   | `src/gateway/protocol/schema/protocol-schemas.ts`          |
| 請求逾時（每個 RPC）                      | `30_000` ms                                           | `src/gateway/client.ts` (`requestTimeoutMs`)               |
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
- 客戶端應在任何成功連線後保存主要的 `hello-ok.auth.deviceToken`。
- 使用該**已儲存**的裝置權杖重新連線時，應該也會重複使用為該權杖儲存的已核准範圍集合。這會保留已授予的讀取/探測/狀態存取權限，並避免將重新連線靜默地收窄為較窄的隱含僅限管理員範圍。
- 客戶端連線認證組裝（`selectConnectAuth` 於
  `src/gateway/client.ts` 中）：
  - `auth.password` 是正交的，設定時一律會被轉發。
  - `auth.token` 按優先順序填入：首先是明確的共用權杖，
    然後是明確的 `deviceToken`，接著是儲存的每個裝置權杖（以
    `deviceId` + `role` 作為鍵值）。
  - 僅當上述皆未解析出
    `auth.token` 時，才會發送 `auth.bootstrapToken`。共用權杖或任何已解析的裝置權杖會將其抑制。
  - 在一次性
    `AUTH_TOKEN_MISMATCH` 重試上自動提升儲存的裝置權杖僅限於**受信任的端點** —
    迴路，或是具有釘選 `tlsFingerprint` 的 `wss://`。未釘選的公開 `wss://`
    不符合資格。
- 額外的 `hello-ok.auth.deviceTokens` 項目是引導交移權杖。
  僅當連線在受信任的傳輸（例如 `wss://` 或迴路/本機配對）上使用引導認證時，才應保存它們。
- 如果客戶端提供**明確的** `deviceToken` 或明確的 `scopes`，該
  呼叫者請求的範圍集合仍保持權威性；僅當客戶端重複使用儲存的每個裝置權杖時，才會重複使用快取的範圍。
- 可以透過 `device.token.rotate` 和
  `device.token.revoke` 旋轉/撤銷裝置權杖（需要 `operator.pairing` 範圍）。
- `device.token.rotate` 會傳回旋轉中繼資料。它僅對已使用該裝置權杖通過驗證的相同裝置呼叫回傳替換持有人權杖，因此僅具權杖的客戶端可以在重新連線前保存其替換權杖。共用/管理員旋轉不會回傳持有人權杖。
- 權杖的發行、輪換和撤銷受限於該裝置配對條目中記錄的已批准角色集合；權杖變更無法擴展或鎖定配對批准從未授予的裝置角色。
- 對於已配對裝置的權杖會話，除非呼叫者也具有 `operator.admin`，否則裝置管理範圍僅限自身：非管理員呼叫者只能移除/撤銷/輪換其**自己**的裝置條目。
- `device.token.rotate` 和 `device.token.revoke` 也會根據呼叫者的目前會話範圍，檢查目標操作員權杖範圍集合。非管理員呼叫者無法輪換或撤銷比其目前持有的權杖範圍更廣的操作員權杖。
- 驗證失敗包含 `error.details.code` 以及恢復提示：
  - `error.details.canRetryWithDeviceToken` (布林值)
  - `error.details.recommendedNextStep` (`retry_with_device_token`、`update_auth_configuration`、`update_auth_credentials`、`wait_then_retry`、`review_auth_configuration`)
- 對於 `AUTH_TOKEN_MISMATCH` 的客戶端行為：
  - 受信任的客戶端可以使用快取的每裝置權杖嘗試一次受限的重試。
  - 如果該重試失敗，客戶端應停止自動重新連線迴圈，並顯示操作員操作指引。

## 裝置身分 + 配對

- 節點應包含從金鑰對指紋衍生的穩定裝置身分 (`device.id`)。
- 閘道會依據裝置 + 角別發行權杖。
- 除非啟用了本機自動批准，否則新的裝置 ID 需要配對批准。
- 配對自動批准以直接的本機回送連線為中心。
- OpenClaw 也有一個狹窄的後端/容器本地自連線路徑，用於受信任的共用金鑰輔助流程。
- 同主機的 tailnet 或 LAN 連線在配對方面仍被視為遠端連線，並且需要批准。
- WS 客戶端通常會在 `connect` (操作員 + 節點) 期間包含 `device` 身分。唯一無裝置的操作員例外情況是明確的信任路徑：
  - `gateway.controlUi.allowInsecureAuth=true` 用於僅限本機主機的不安全 HTTP 相容性。
  - 成功的 `gateway.auth.mode: "trusted-proxy"` 操作員控制 UI 驗證。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (緊急存取，嚴重的安全性降級)。
  - direct-loopback `gateway-client` 後端 RPC，使用共用的
    gateway token/password 進行驗證。
- 所有連線必須對伺服器提供的 `connect.challenge` nonce 進行簽署。

### 裝置驗證遷移診斷

對於仍使用 pre-challenge 簽署行為的舊版客戶端，`connect` 現在會在 `error.details.code` 下傳回
`DEVICE_AUTH_*` 詳細代碼，並附帶穩定的 `error.details.reason`。

常見遷移失敗：

| 訊息                        | details.code                     | details.reason           | 含義                                         |
| --------------------------- | -------------------------------- | ------------------------ | -------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客戶端未提供 `device.nonce` (或傳送空白值)。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客戶端使用了過時/錯誤的 nonce 進行簽署。     |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 簽署內容不符合 v2 payload。                  |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 簽署的時間戳超出允許的誤差範圍。             |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 與公開金鑰指紋不符。             |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公開金鑰格式/正規化失敗。                    |

遷移目標：

- 務必等待 `connect.challenge`。
- 對包含伺服器 nonce 的 v2 payload 進行簽署。
- 在 `connect.params.device.nonce` 中傳送相同的 nonce。
- 偏好使用的簽署內容為 `v3`，除了 device/client/role/scopes/token/nonce 欄位外，它還綁定了 `platform` 和 `deviceFamily`。
- 舊版 `v2` 簽名為了相容性仍被接受，但在重新連線時，配對裝置的中繼資料固定仍控制指令政策。

## TLS + pinning

- WS 連線支援 TLS。
- 客戶端可以選擇性地固定網關憑證指紋（請參閱 `gateway.tls`
  配置加上 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 範圍

此協定公開了**完整的網關 API**（狀態、頻道、模型、聊天、
代理、工作階段、節點、核准等）。確切的介面由 `src/gateway/protocol/schema.ts` 中的 TypeBox 綱要定義。

## 相關

- [橋接協定](/zh-Hant/gateway/bridge-protocol)
- [網關手冊](/zh-Hant/gateway)
