---
summary: "Gateway WebSocket 協定：交握、幀、版本控制"
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
- 第一個幀**必須**是 `connect` 請求。

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
  "payload": { "type": "hello-ok", "protocol": 3, "policy": { "tickIntervalMs": 15000 } }
}
```

當裝置權杖發出時，`hello-ok` 也包含：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

在受信任的啟動交握過程中，`hello-ok.auth` 可能還包含額外的
有界角色條目於 `deviceTokens`：

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
`scopes: []`，任何移交的操作員權杖保持受限於啟動
操作員允許清單（`operator.approvals`、`operator.read`、
`operator.talk.secrets`、`operator.write`）。啟動範圍檢查保持
角色前綴：操作員條目僅滿足操作員請求，而非操作員
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

具有副作用的方法需要 **冪等金鑰**（請參閱架構）。

## 角色 + 範圍

### 角色

- `operator` = 控制平面客戶端（CLI/UI/自動化）。
- `node` = 功能主機（相機/螢幕/canvas/system.run）。

### 範圍（操作員）

常見範圍：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`
- `operator.talk.secrets`

帶有 `includeSecrets: true` 的 `talk.config` 需要 `operator.talk.secrets`
（或 `operator.admin`）。

外掛程式註冊的閘道 RPC 方法可以請求自己的操作員範圍，但
保留的核心管理員前綴（`config.*`、`exec.approvals.*`、`wizard.*`、
`update.*`）始終解析為 `operator.admin`。

方法範圍只是第一道門檻。透過 `chat.send` 存取的某些斜線指令會在之上套用更嚴格的指令層級檢查。例如，持久 `/config set` 和 `/config unset` 寫入需要 `operator.admin`。

`node.pair.approve` 在基礎方法範圍之上，還有一個額外的核准時範圍檢查：

- 無指令請求：`operator.pairing`
- 包含非執行節點指令的請求：`operator.pairing` + `operator.write`
- 包含 `system.run`、`system.run.prepare` 或 `system.which` 的請求：
  `operator.pairing` + `operator.admin`

### 功能/指令/權限 (節點)

節點在連接時聲明功能聲明：

- `caps`：高層級功能類別。
- `commands`：用於調用的允許列表。
- `permissions`：細粒度切換 (例如 `screen.record`、`camera.capture`)。

Gateway 將這些視為**聲明** 並執行服務器端允許列表。

## 在線狀態

- `system-presence` 返回以裝置身分為鍵的條目。
- 在線狀態條目包含 `deviceId`、`roles` 和 `scopes`，以便即使裝置同時作為 **operator** 和 **node** 連接，UI 也能每個裝置顯示一行。

## 常見 RPC 方法系列

此頁面不是生成的完整傾印，但公共 WS 表面比上述握手/身份驗證示例更廣泛。這些是 Gateway 目前公開的主要方法系列。

`hello-ok.features.methods` 是一個保守的發現列表，由 `src/gateway/server-methods-list.ts` 加上已載入的外掛/通道方法導出構建而成。
將其視為功能發現，而不是在 `src/gateway/server-methods/*.ts` 中實現的每個可調用輔助函數的生成傾印。

### 系統和身分

- `health` 返回快取或新探測的 gateway 健康快照。
- `status` 傳回 `/status` 風格的 gateway 摘要；敏感欄位僅包含於具有 admin 範圍的操作員用戶端。
- `gateway.identity.get` 傳回中繼與配對流程所使用的 gateway 裝置身分。
- `system-presence` 傳回已連線操作員/節點裝置的目前 presence 快照。
- `system-event` 新增系統事件並可更新/廣播 presence 內容。
- `last-heartbeat` 傳回最新保存的心跳事件。
- `set-heartbeats` 切換 gateway 上的心跳處理。

### 模型與使用量

- `models.list` 傳回執行時期允許的模型目錄。
- `usage.status` 傳回提供者使用量視窗/剩餘配額摘要。
- `usage.cost` 傳回指定日期範圍的彙總成本使用量摘要。
- `doctor.memory.status` 傳回使用中預設代理程式工作區的向量記憶體/嵌入就緒狀態。
- `sessions.usage` 傳回各個階段的使用量摘要。
- `sessions.usage.timeseries` 傳回單一階段的時間序列使用量。
- `sessions.usage.logs` 傳回單一階段的使用量記錄項目。

### 頻道與登入輔助程式

- `channels.status` 傳回內建 + 捆綁的頻道/外掛狀態摘要。
- `channels.logout` 登出支援登出的特定頻道/帳戶。
- `web.login.start` 啟動目前支援 QR 的網頁頻道提供者之 QR/網頁登入流程。
- `web.login.wait` 等待該 QR/網頁登入流程完成，並在成功時啟動頻道。
- `push.test` 傳送測試 APNs 推播至已註冊的 iOS 節點。
- `voicewake.get` 傳回已儲存的喚醒詞觸發器。
- `voicewake.set` 更新喚醒詞觸發器並廣播變更。

### 訊息與記錄

- `send` 是用於聊天執行器之外，針對頻道/帳戶/執行緒目標傳送的直接出站傳送 RPC。
- `logs.tail` 傳回已設定的 gateway 檔案記錄尾部，並提供游標/限制與最大位元組控制。

### 對話與文字轉語音

- `talk.config` 傳回有效的 Talk 設定載荷；`includeSecrets` 需要 `operator.talk.secrets`（或 `operator.admin`）。
- `talk.mode` 設定/廣播 WebChat/Control UI 客戶端的目前 Talk 模式狀態。
- `talk.speak` 透過啟用的 Talk 語音提供者合成語音。
- `tts.status` 傳回 TTS 啟用狀態、啟用的提供者、備用提供者，以及提供者設定狀態。
- `tts.providers` 傳回可見的 TTS 提供者清單。
- `tts.enable` 和 `tts.disable` 切換 TTS 偏好設定狀態。
- `tts.setProvider` 更新偏好的 TTS 提供者。
- `tts.convert` 執行單次文字轉語音轉換。

### 機密、設定、更新和精靈

- `secrets.reload` 重新解析啟用的 SecretRefs，並僅在完全成功時交換執行時期機密狀態。
- `secrets.resolve` 解析特定指令/目標集合的指令目標機密指派。
- `config.get` 傳回目前的設定快照和雜湊。
- `config.set` 寫入已驗證的設定載荷。
- `config.patch` 合併部分設定更新。
- `config.apply` 驗證並取代完整的設定載荷。
- `config.schema` 傳回 Control UI 和 CLI 工具使用的即時設定架構載荷：架構、`uiHints`、版本和產生中繼資料，包括當執行時期能夠載入時的外掛程式 + 通道架構中繼資料。架構包含欄位 `title` / `description` 中繼資料，衍生自 UI 使用的相同標籤和說明文字，包括巢狀物件、萬用字元、陣列項目，以及當存在相符欄位文件時的 `anyOf` / `oneOf` / `allOf` 組合分支。
- `config.schema.lookup` 返回單一配置路徑的路徑範圍查找有效負載：
  正規化路徑、淺層架構節點、匹配的提示 + `hintPath`，以及
  用於 UI/CLI 鑽取的即時子摘要。
  - 查找架構節點包含面向使用者的文件和常見驗證欄位：
    `title`、`description`、`type`、`enum`、`const`、`format`、`pattern`，
    數值/字串/陣列/物件邊界，以及布林標記，例如
    `additionalProperties`、`deprecated`、`readOnly`、`writeOnly`。
  - 子摘要公開 `key`、正規化 `path`、`type`、`required`、
    `hasChildren`，以及匹配的 `hint` / `hintPath`。
- `update.run` 執行閘道更新流程，並且僅在更新本身成功時排程重新啟動。
- `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 透過 WS RPC 公開
  入門嚮導。

### 現有的主要系列

#### 代理程式和工作區輔助工具

- `agents.list` 返回已配置的代理程式項目。
- `agents.create`、`agents.update` 和 `agents.delete` 管理代理程式記錄和
  工作區連線。
- `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理
  為代理程式公開的引導工作區檔案。
- `agent.identity.get` 返回代理程式或工作階段的實際助理身分。
- `agent.wait` 等待執行完成，並在可用時返回終端快照。

#### 工作階段控制

- `sessions.list` 返回當前的工作階段索引。
- `sessions.subscribe` 和 `sessions.unsubscribe` 切換目前 WS 客戶端的階段變更事件
  訂閱。
- `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 切換
  單一階段的文字紀錄/訊息事件訂閱。
- `sessions.preview` 傳回特定階段
  金鑰的有限文字紀錄預覽。
- `sessions.resolve` 解析或正規化階段目標。
- `sessions.create` 建立新的階段項目。
- `sessions.send` 傳送訊息至現有階段。
- `sessions.steer` 是作用中階段的中斷並引導變體。
- `sessions.abort` 中止階段的進行中工作。
- `sessions.patch` 更新階段元資料/覆寫。
- `sessions.reset`、`sessions.delete` 和 `sessions.compact` 執行階段
  維護。
- `sessions.get` 傳回完整的已儲存階段列。
- 聊天執行仍使用 `chat.history`、`chat.send`、`chat.abort` 和
  `chat.inject`。
- `chat.history` 已針對 UI 客戶端進行顯示正規化：內聯指令標籤會
  從可見文字中移除，純文字工具呼叫 XML 載荷（包括
  `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、
  `<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和
  截斷的工具呼叫區塊）以及洩漏的 ASCII/全形模型控制權杖
  會被移除，純靜音權杖助手列（例如精確的 `NO_REPLY` /
  `no_reply`）會被省略，且過大的列可被取代為預留位置。

#### 裝置配對與裝置權杖

- `device.pair.list` 傳回待處理和已核准的配對裝置。
- `device.pair.approve`、`device.pair.reject` 和 `device.pair.remove` 管理
  裝置配對記錄。
- `device.token.rotate` 在其已核准的角色
  和範圍界限內輪替配對裝置權杖。
- `device.token.revoke` 吊銷配對裝置權杖。

#### 節點配對、調用及待處理工作

- `node.pair.request`、`node.pair.list`、`node.pair.approve`、
  `node.pair.reject` 和 `node.pair.verify` 涵蓋節點配對與引導
  驗證。
- `node.list` 和 `node.describe` 回傳已知/已連接的節點狀態。
- `node.rename` 更新已配對節點的標籤。
- `node.invoke` 將指令轉發至已連接的節點。
- `node.invoke.result` 回傳調用請求的結果。
- `node.event` 將源自節點的事件帶回閘道。
- `node.canvas.capability.refresh` 重新整理範圍限定 canvas 能力權杖。
- `node.pending.pull` 和 `node.pending.ack` 是已連接節點的佇列 API。
- `node.pending.enqueue` 和 `node.pending.drain` 管理離線/已中斷連線節點的
  持久化待處理工作。

#### 審核系列

- `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和
  `exec.approval.resolve` 涵蓋一次性執行核准請求以及待處理
  核准的查找/重播。
- `exec.approval.waitDecision` 等待一個待處理的執行核准並返回
  最終決定（或在超時時返回 `null`）。
- `exec.approvals.get` 和 `exec.approvals.set` 管理閘道器執行核准
  原則快照。
- `exec.approvals.node.get` 和 `exec.approvals.node.set` 透過節點中繼命令管理節點本地的執行
  核准原則。
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

- `chat`：UI 聊天更新，例如 `chat.inject` 以及其他僅限文字記錄的聊天事件。
- `session.message` 和 `session.tool`：已訂閱會話的文字記錄/事件流更新。
- `sessions.changed`：會話索引或中繼資料已變更。
- `presence`：系統在場狀態快照更新。
- `tick`：週期性保持活躍 / 存活事件。
- `health`：閘道健康狀態快照更新。
- `heartbeat`：心跳事件流更新。
- `cron`：Cron 執行/工作變更事件。
- `shutdown`：閘道關機通知。
- `node.pair.requested` / `node.pair.resolved`：節點配對生命週期。
- `node.invoke.request`：節點調用請求廣播。
- `device.pair.requested` / `device.pair.resolved`：配對裝置生命週期。
- `voicewake.changed`：喚醒詞觸發配置已變更。
- `exec.approval.requested` / `exec.approval.resolved`：執行核准生命週期。
- `plugin.approval.requested` / `plugin.approval.resolved`：外掛程式核准生命週期。

### 節點輔助方法

- 節點可以呼叫 `skills.bins` 來擷取目前的技能可執行檔清單，以進行自動允許檢查。

### 操作員輔助方法

- 操作員可以呼叫 `commands.list` (`operator.read`) 來擷取代理程式的執行階段指令清單。
  - `agentId` 是選用的；省略它以讀取預設的代理程式工作區。
  - `scope` 控制主要 `name` 的目標介面：
    - `text` 會傳回不帶有前置 `/` 的主要文字指令符記
    - `native` 和預設的 `both` 路徑會在可用時傳回具備提供者感知的原生名稱
  - `textAliases` 攜帶精確的斜線別名，例如 `/model` 和 `/m`。
  - `nativeName` 攜帶感知提供者的原生指令名稱（如果存在）。
  - `provider` 是可選的，並且僅影響原生命名以及原生外掛
    指令的可用性。
  - `includeArgs=false` 省略回應中的序列化參數元資料。
- 操作者可以呼叫 `tools.catalog` (`operator.read`) 來取得代理程式的
  執行時期工具目錄。回應包含分組的工具和來源元資料：
  - `source`：`core` 或 `plugin`
  - `pluginId`：當 `source="plugin"` 時的外掛擁有者
  - `optional`：外掛工具是否為可選
- 操作者可以呼叫 `tools.effective` (`operator.read`) 來取得會話的
  執行時期有效工具清單。
  - `sessionKey` 是必需的。
  - 閘道是從伺服器端的會話推導可信的執行時期上下文，而不是接受
    呼叫者提供的驗證或交付上下文。
  - 回應是會話範圍的，反映了活躍對話目前可以使用的內容，
    包括核心、外掛和頻道工具。
- 操作者可以呼叫 `skills.status` (`operator.read`) 來取得代理程式的
  可見技能清單。
  - `agentId` 是可選的；省略它以讀取預設的代理程式工作區。
  - 回應包含資格、缺失的需求、配置檢查和
    經過清理的安裝選項，而不會暴露原始的秘密值。
- 操作者可以呼叫 `skills.search` 和 `skills.detail` (`operator.read`) 來取得
  ClawHub 探索元資料。
- 操作者可以以兩種模式呼叫 `skills.install` (`operator.admin`)：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 將
    技能資料夾安裝到預設代理程式工作區的 `skills/` 目錄中。
  - Gateway installer mode: `{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }`
    runs a declared `metadata.openclaw.install` action on the gateway host.
- Operators may call `skills.update` (`operator.admin`) in two modes:
  - ClawHub mode updates one tracked slug or all tracked ClawHub installs in
    the default agent workspace.
  - Config mode patches `skills.entries.<skillKey>` values such as `enabled`,
    `apiKey`, and `env`.

## Exec approvals

- When an exec request needs approval, the gateway broadcasts `exec.approval.requested`.
- Operator clients resolve by calling `exec.approval.resolve` (requires `operator.approvals` scope).
- For `host=node`, `exec.approval.request` must include `systemRunPlan` (canonical `argv`/`cwd`/`rawCommand`/session metadata). Requests missing `systemRunPlan` are rejected.
- After approval, forwarded `node.invoke system.run` calls reuse that canonical
  `systemRunPlan` as the authoritative command/cwd/session context.
- If a caller mutates `command`, `rawCommand`, `cwd`, `agentId`, or
  `sessionKey` between prepare and the final approved `system.run` forward, the
  gateway rejects the run instead of trusting the mutated payload.

## Agent delivery fallback

- `agent` requests can include `deliver=true` to request outbound delivery.
- `bestEffortDeliver=false` keeps strict behavior: unresolved or internal-only delivery targets return `INVALID_REQUEST`.
- `bestEffortDeliver=true` allows fallback to session-only execution when no external deliverable route can be resolved (for example internal/webchat sessions or ambiguous multi-channel configs).

## Versioning

- `PROTOCOL_VERSION` lives in `src/gateway/protocol/schema.ts`.
- 客戶端發送 `minProtocol` + `maxProtocol`；伺服器會拒絕不匹配的請求。
- Schemas + 模型是從 TypeBox 定義生成的：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## 認證

- 共用密鑰 Gateway 認證使用 `connect.params.auth.token` 或
  `connect.params.auth.password`，具體取決於設定的認證模式。
- 承載身分的模式，如 Tailscale Serve
  (`gateway.auth.allowTailscale: true`) 或非 loopback
  `gateway.auth.mode: "trusted-proxy"`，透過
  請求標頭滿足連線認證檢查，而不是 `connect.params.auth.*`。
- 私有入口 `gateway.auth.mode: "none"` 完全跳過共用密鑰連線認證；
  請勿在公開/不受信任的入口上暴露該模式。
- 配對後，Gateway 會發布限定範圍為連線
  角色 + 範圍的 **裝置權杖 (device token)**。它在 `hello-ok.auth.deviceToken` 中返回，客戶端應將其
  持久化以供未來連線使用。
- 客戶端應在任何成功連線後保存主要 `hello-ok.auth.deviceToken`。
- 使用該 **已儲存** 的裝置權杖重新連線也應重複使用該權杖的已儲存核准範圍集。這保留了
  已授予的讀取/探測/狀態存取權，並避免將重新連線無聲地折疊為
  更窄的隱含僅限管理員範圍。
- 正常連線認證優先順序是明確的共用權杖/密碼優先，然後是
  明確的 `deviceToken`，然後是已儲存的每裝置權杖，最後是啟動權杖。
- 額外的 `hello-ok.auth.deviceTokens` 項目是啟動移交權杖。
  僅當連線在信任的傳輸（例如 `wss://` 或 loopback/本機配對）上使用啟動認證時才保存它們。
- 如果客戶端提供 **明確的** `deviceToken` 或明確的 `scopes`，該
  呼叫者請求的範圍集將保持權威；僅當
  客戶端重複使用已儲存的每裝置權杖時才重複使用快取的範圍。
- 可以透過 `device.token.rotate` 和
  `device.token.revoke` 輪換/撤銷裝置權杖（需要 `operator.pairing` 範圍）。
- Token issuance/rotation stays bounded to the approved role set recorded in
  that device's pairing entry; rotating a token cannot expand the device into a
  role that pairing approval never granted.
- For paired-device token sessions, device management is self-scoped unless the
  caller also has `operator.admin`: non-admin callers can remove/revoke/rotate
  only their **own** device entry.
- `device.token.rotate` also checks the requested operator scope set against the
  caller's current session scopes. Non-admin callers cannot rotate a token into
  a broader operator scope set than they already hold.
- Auth failures include `error.details.code` plus recovery hints:
  - `error.details.canRetryWithDeviceToken` (boolean)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- Client behavior for `AUTH_TOKEN_MISMATCH`:
  - Trusted clients may attempt one bounded retry with a cached per-device token.
  - If that retry fails, clients should stop automatic reconnect loops and surface operator action guidance.

## Device identity + pairing

- Nodes should include a stable device identity (`device.id`) derived from a
  keypair fingerprint.
- Gateways issue tokens per device + role.
- Pairing approvals are required for new device IDs unless local auto-approval
  is enabled.
- Pairing auto-approval is centered on direct local loopback connects.
- OpenClaw also has a narrow backend/container-local self-connect path for
  trusted shared-secret helper flows.
- Same-host tailnet or LAN connects are still treated as remote for pairing and
  require approval.
- All WS clients must include `device` identity during `connect` (operator + node).
  Control UI can omit it only in these modes:
  - `gateway.controlUi.allowInsecureAuth=true` for localhost-only insecure HTTP compatibility.
  - successful `gateway.auth.mode: "trusted-proxy"` operator Control UI auth.
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (break-glass, severe security downgrade).
- All connections must sign the server-provided `connect.challenge` nonce.

### 裝置驗證移轉診斷

對於仍使用挑戰前簽署行為的舊版客戶端，`connect` 現在會在 `error.details.code` 下傳回 `DEVICE_AUTH_*` 詳細代碼，並附帶穩定的 `error.details.reason`。

常見移轉失敗：

| 訊息                        | details.code                     | details.reason           | 含義                                        |
| --------------------------- | -------------------------------- | ------------------------ | ------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客戶端省略了 `device.nonce`（或傳送空白）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客戶端使用了過時/錯誤的 nonce 進行簽署。    |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 簽署內容與 v2 內容不符。                    |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 簽署的時間戳記超出允許的偏差範圍。          |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 與公開金鑰指紋不符。            |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公開金鑰格式/正規化失敗。                   |

移轉目標：

- 請務必等待 `connect.challenge`。
- 對包含伺服器 nonce 的 v2 內容進行簽署。
- 在 `connect.params.device.nonce` 中傳送相同的 nonce。
- 偏好的簽署內容為 `v3`，除了裝置/客戶端/角色/範圍/權杖/nonce 欄位外，它還綁定了 `platform` 和 `deviceFamily`。
- 為了相容性，舊版 `v2` 簽署仍被接受，但配對裝置的中繼資料固定仍然控制重新連線時的指令策略。

## TLS + 憑證固定

- WS 連線支援 TLS。
- 客戶端可以選擇固定閘道憑證指紋（請參閱 `gateway.tls` 組態加上 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 範圍

此協議公開了**完整的閘道 API**（狀態、頻道、模型、聊天、代理、會話、節點、審核等）。其具體內容由 `src/gateway/protocol/schema.ts` 中的 TypeBox 結構定義。
