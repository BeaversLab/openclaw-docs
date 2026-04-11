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
- 技能/工具：`skills.*`、`tools.catalog`、`tools.effective`

### 常見事件系列

- `chat`：UI 聊天更新，例如 `chat.inject` 和其他僅限文字記錄的聊天
  事件。
- `session.message` 和 `session.tool`：訂閱會話的文字記錄/事件串流更新。
- `sessions.changed`：會話索引或中繼資料已變更。
- `presence`：系統狀態快照更新。
- `tick`：定期保活/存活事件。
- `health`：閘道器健康狀態快照更新。
- `heartbeat`：心跳事件串流更新。
- `cron`：Cron 執行/工作變更事件。
- `shutdown`：閘道器關機通知。
- `node.pair.requested` / `node.pair.resolved`：節點配對生命週期。
- `node.invoke.request`：節點叫用請求廣播。
- `device.pair.requested` / `device.pair.resolved`：配對設備生命週期。
- `voicewake.changed`：喚醒詞觸發配置已變更。
- `exec.approval.requested` / `exec.approval.resolved`：執行核准
  生命週期。
- `plugin.approval.requested` / `plugin.approval.resolved`：外掛程式核准
  生命週期。

### 節點輔助方法

- 節點可以呼叫 `skills.bins` 以擷取目前的技能可執行檔清單
  以進行自動允許檢查。

### 操作員輔助方法

- 操作員可以呼叫 `tools.catalog` (`operator.read`) 以擷取代理程式的
  執行階段工具目錄。回應包含分組的工具和來源元資料：
  - `source`：`core` 或 `plugin`
  - `pluginId`：當 `source="plugin"` 時的外掛程式擁有者
  - `optional`：外掛程式工具是否為選用
- 操作員可以呼叫 `tools.effective` (`operator.read`) 以擷取作業階段的
  實際執行工具清單。
  - `sessionKey` 是必要的。
  - 閘道是從伺服器端的會話衍生可信的執行階段上下文，而不是接受呼叫者提供的驗證或傳遞上下文。
  - 回應具有工作階段範圍，並反映目前對話可立即使用的內容，包括核心、外掛和頻道工具。
- 操作員可以呼叫 `skills.status` (`operator.read`) 以擷取代理程式的
  可見技能清單。
  - `agentId` 是選用的；省略它以讀取預設代理程式工作區。
  - 回應包含資格、遺漏的需求、設定檢查，以及已清理的安裝選項，但不會暴露原始的秘密值。
- 操作員可以呼叫 `skills.search` 和 `skills.detail` (`operator.read`) 以取得
  ClawHub 探索元資料。
- 操作員可以以兩種模式呼叫 `skills.install` (`operator.admin`)：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 將
    技能資料夾安裝至預設代理程式工作區 `skills/` 目錄中。
  - 閘道安裝程式模式：`{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }`
    在閘道主機上執行宣告的 `metadata.openclaw.install` 動作。
- 操作員可以以兩種模式呼叫 `skills.update` (`operator.admin`)：
  - ClawHub 模式會更新預設代理程式工作區中一個追蹤的 slug 或所有追蹤的 ClawHub 安裝項目。
  - 配置模式會修補 `skills.entries.<skillKey>` 值，例如 `enabled`、
    `apiKey` 和 `env`。

## 執行核准

- 當 exec 請求需要批准時，閘道會廣播 `exec.approval.requested`。
- 操作員客戶端通過呼叫 `exec.approval.resolve` 來解決（需要 `operator.approvals` 範圍）。
- 對於 `host=node`，`exec.approval.request` 必須包含 `systemRunPlan`（規範 `argv`/`cwd`/`rawCommand`/session 中繼資料）。缺少 `systemRunPlan` 的請求將被拒絕。
- 批准後，轉發的 `node.invoke system.run` 呼叫會重用該規範
  `systemRunPlan` 作為授權的 command/cwd/session 上下文。
- 如果呼叫者在準備和最終批准的 `system.run` 轉發之間改變了 `command`、`rawCommand`、`cwd`、`agentId` 或
  `sessionKey`，閘道將拒絕該執行，而不是信任被修改的負載。

## Agent 遞送後備機制

- `agent` 請求可以包含 `deliver=true` 以請求輸出傳遞。
- `bestEffortDeliver=false` 保持嚴格行為：未解析或�限內部的傳遞目標返回 `INVALID_REQUEST`。
- `bestEffortDeliver=true` 允許在無法解析外部可傳遞路由時（例如內部/webchat 會話或不明確的多通道配置）回退到僅限會話的執行。

## 版本控制

- `PROTOCOL_VERSION` 位於 `src/gateway/protocol/schema.ts` 中。
- 客戶端發送 `minProtocol` + `maxProtocol`；伺服器拒絕不匹配的項目。
- Schemas + 模型是從 TypeBox 定義生成的：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## 認證

- 共享金鑰閘道驗證使用 `connect.params.auth.token` 或
  `connect.params.auth.password`，具體取決於配置的驗證模式。
- 帶有身分識別的模式，例如 Tailscale Serve
  (`gateway.auth.allowTailscale: true`) 或非迴路
  `gateway.auth.mode: "trusted-proxy"`，透過
  請求標頭滿足連線驗證檢查，而不是 `connect.params.auth.*`。
- Private-ingress `gateway.auth.mode: "none"` 完全跳過共享密碼連線驗證；請勿在公開/不受信任的入口上公開該模式。
- 配對後，Gateway 會發出範圍限定於連線角色 + 範圍的 **裝置權杖**。它會在 `hello-ok.auth.deviceToken` 中傳回，且客戶端應將其持久化以供未來連線使用。
- 客戶端應在任何成功連線後持久化主要 `hello-ok.auth.deviceToken`。
- 使用該**已儲存**的裝置 Token 重新連線時，應該重複使用為該 Token 已儲存的
  已核准 Scope 集合。這保留了先前已授予的 read/probe/status 存取權限，
  並避免將重新連線無聲地縮減為較窄的隱含 admin-only scope。
- 正常連線驗證優先順序為：首先是明確的共享權杖/密碼，然後是明確的 `deviceToken`，接著是儲存的每裝置權杖，最後是啟動權杖。
- 額外的 `hello-ok.auth.deviceTokens` 項目是啟動移交權杖。僅當連線在受信任傳輸（例如 `wss://` 或迴路/本機配對）上使用啟動驗證時，才將其持久化。
- 如果客戶端提供 **明確的** `deviceToken` 或明確的 `scopes`，該呼叫者請求的範圍集將保持權威；僅當客戶端重用儲存的每裝置權杖時，才會重用快取的範圍。
- 可以透過 `device.token.rotate` 和 `device.token.revoke` 輪替/撤銷裝置權杖（需要 `operator.pairing` 範圍）。
- Token 的發行/輪換僅限於記錄在該裝置配對項目中的已核准角色集；輪換 Token
  無法將裝置擴展至配對核准從未授予的角色。
- 對於已配對裝置權杖工作階段，除非呼叫者也具有 `operator.admin`，否則裝置管理為自我範圍：非管理員呼叫者只能移除/撤銷/輪替 **自己** 的裝置項目。
- `device.token.rotate` 也會根據呼叫者目前的工作階段範圍檢查請求的操作員範圍集。非管理員呼叫者無法將權杖輪替為比其目前持有更廣泛的操作員範圍集。
- 驗證失敗包括 `error.details.code` 加上復原提示：
  - `error.details.canRetryWithDeviceToken` (boolean)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- 客戶端對於 `AUTH_TOKEN_MISMATCH` 的行為：
  - 受信任的客戶端可以使用快取的每裝置 Token 嘗試一次有限的重新嘗試。
  - 如果該重試失敗，客戶端應停止自動重新連線循環並顯示操作員操作指引。

## 裝置身分 + 配對

- 節點應包含從金鑰對指紋衍生的穩定裝置身分 (`device.id`)。
- 閘道會根據每個裝置 + 角色發出令牌。
- 除非啟用了本機自動核准，否則新的裝置 ID 需要配對核准。
- 配對自動核准以直接的本機回送連線為中心。
- OpenClaw 也具有一個狹窄的後端/容器本機自連線路徑，用於受信任的共享金鑰輔助流程。
- 同主機的 tailnet 或 LAN 連線在配對方面仍被視為遠端連線，並需要核准。
- 所有 WS 用戶端必須在 `connect` 期間包含 `device` 身份（操作員 + 節點）。
  控制 UI 僅在以下模式下可以省略它：
  - `gateway.controlUi.allowInsecureAuth=true` 用於僅限本地主機的不安全 HTTP 相容性。
  - 成功的 `gateway.auth.mode: "trusted-proxy"` 操作員控制 UI 身份驗證。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` （應急玻璃，嚴重的安全性降級）。
- 所有連線必須對伺服器提供的 `connect.challenge` nonce 進行簽署。

### 裝置身分驗證遷移診斷

對於仍使用挑戰前簽署行為的舊版用戶端，`connect` 現在會在 `error.details.code` 下返回具有穩定 `error.details.reason` 的 `DEVICE_AUTH_*` 詳細代碼。

常見的遷移失敗：

| 訊息                        | details.code                     | details.reason           | 含義                                             |
| --------------------------- | -------------------------------- | ------------------------ | ------------------------------------------------ |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 用戶端省略了 `device.nonce` （或發送了空白值）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客戶端使用過時/錯誤的 nonce 進行簽署。           |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 簽署內容與 v2 內容不符。                         |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 簽署的時間戳超出允許的誤差範圍。                 |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 與公鑰指紋不匹配。                   |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公開金鑰格式/正規化失敗。                        |

遷移目標：

- 請始終等待 `connect.challenge`。
- 對包含伺服器 nonce 的 v2 負載進行簽署。
- 在 `connect.params.device.nonce` 中發送相同的 nonce。
- 首選的簽署負載是 `v3`，除了 device/client/role/scopes/token/nonce 欄位外，它還綁定了 `platform` 和 `deviceFamily`。
- 舊版 `v2` 簽署為了相容性仍被接受，但在重新連線時，配對裝置的中繼資料固定仍然控制命令政策。

## TLS + 固定

- WS 連線支援 TLS。
- 用戶端可以選擇性固定閘道憑證指紋（請參閱 `gateway.tls` 配置以及 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 範圍

此協議公開了 **完整的閘道 API**（狀態、頻道、模型、聊天、代理、會話、節點、審核等）。其確切的介面由 `src/gateway/protocol/schema.ts` 中的 TypeBox 結構描述定義。
