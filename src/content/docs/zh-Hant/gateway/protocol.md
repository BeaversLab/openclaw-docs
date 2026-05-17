---
summary: "Gateway WebSocket protocol: handshake, frames, versioning"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "Gateway protocol"
---

Gateway WS 協定是 OpenClaw 的**單一控制平面 + 節點傳輸**。所有客戶端（CLI、網頁 UI、macOS 應用程式、iOS/Android 節點、無頭節點）都透過 WebSocket 連線，並在握手時宣告其**角色** + **範圍**。

## 傳輸

- WebSocket，具有 JSON 載荷的文字幀。
- 第一個幀**必須**是 `connect` 請求。
- 連線前的幀大小上限為 64 KiB。成功交握後，客戶端應遵循 `hello-ok.policy.maxPayload` 和 `hello-ok.policy.maxBufferedBytes` 限制。啟用診斷時，過大的入站幀和緩慢的出站緩衝區會在 Gateway 關閉或丟棄受影響的幀之前發出 `payload.large` 事件。這些事件包含大小、限制、介面和安全原因代碼。它們不包含訊息主體、附件內容、原始幀主體、令牌、Cookie 或秘密值。

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
    "maxProtocol": 4,
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
    "protocol": 4,
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

當 Gateway 尚在完成啟動 Sidecar 時，`connect` 請求可能會傳回一個可重試的 `UNAVAILABLE` 錯誤，並將 `details.reason` 設定為 `"startup-sidecars"` 和 `retryAfterMs`。客戶端應在其整體連線預算內重試該回應，而不是將其作為終端交握失敗呈現。

`server`、`features`、`snapshot` 和 `policy` 均為 Schema (`src/gateway/protocol/schema/frames.ts`) 所必需。`auth` 也是必需的，並回報協商的角色/範圍。`pluginSurfaceUrls` 是可選的，並將插件介面名稱（例如 `canvas`）對應到有範圍的託管 URL。

有範圍的插件介面 URL 可能會過期。節點可以呼叫 `node.pluginSurface.refresh` 並帶有 `{ "surface": "canvas" }` 以在 `pluginSurfaceUrls` 中接收新條目。實驗性的 Canvas 插件重構不支援已棄用的 `canvasHostUrl`、`canvasCapability` 或 `node.canvas.capability.refresh` 相容路徑；目前的原生客戶端和 Gateway 必須使用插件介面。

當未發出裝置令牌時，`hello-ok.auth` 會回報不含令牌欄位的協商權限：

```json
{
  "auth": {
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

受信任的同進程後端客戶端（`client.id: "gateway-client"`、
`client.mode: "backend"`）在直接回送連線上使用共用 Gateway token/密碼進行驗證時，可以省略 `device`。此路徑保留給內部控制平面 RPC 使用，並防止過時的 CLI/裝置配對基準阻擋本機後端工作（例如子代理程式會話更新）。遠端客戶端、瀏覽器來源客戶端、節點客戶端以及明確的裝置 token/裝置身分客戶端仍使用正常的配對和權限升級檢查。

當發出裝置 token 時，`hello-ok` 也包含：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

在受信任的引導交握期間，`hello-ok.auth` 也可能包含 `deviceTokens` 中的額外有界角色項目：

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

對於內建的節點/操作員引導流程，主要節點 token 保持 `scopes: []`，任何移交的操作員 token 則保持受限於引導操作員允許清單（`operator.approvals`、`operator.read`、
`operator.talk.secrets`、`operator.write`）。引導權限檢查保持以角色為前綴：操作員項目僅滿足操作員請求，而非操作員角色仍需要在其自身角色前綴下的權限。

### 節點範例

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 4,
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

## 訊框

- **請求**：`{type:"req", id, method, params}`
- **回應**：`{type:"res", id, ok, payload|error}`
- **事件**：`{type:"event", event, payload, seq?, stateVersion?}`

具有副作用的方法需要 **等冪鍵**（請參閱架構）。

## 角色 + 權限

有關完整的操作員範圍模型、核准時間檢查和共用秘密語義，請參閱[操作員範圍](/zh-Hant/gateway/operator-scopes)。

### 角色

- `operator` = 控制平面客戶端（CLI/UI/自動化）。
- `node` = 功能主機（相機/螢幕/畫布/system.run）。

### 權限（操作員）

常見權限：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`
- `operator.talk.secrets`

`talk.config` 搭配 `includeSecrets: true` 需要 `operator.talk.secrets`
（或 `operator.admin`）。

外掛程式註冊的 Gateway RPC 方法可以請求自己的 operator scope，但
保留的核心管理員前綴（`config.*`、`exec.approvals.*`、`wizard.*`、
`update.*`）總是解析為 `operator.admin`。

Method scope 僅是第一道關卡。透過 `chat.send` 到達的某些斜線指令會在
之上套用更嚴格的指令層級檢查。例如，持續性
`/config set` 和 `/config unset` 寫入需要 `operator.admin`。

`node.pair.approve` 在基礎 method scope 之上，也有額外的核准時段 scope 檢查：

- 無指令請求：`operator.pairing`
- 具有非執行節點指令的請求：`operator.pairing` + `operator.write`
- 包含 `system.run`、`system.run.prepare` 或 `system.which` 的請求：
  `operator.pairing` + `operator.admin`

### Caps/commands/permissions (node)

節點會在連線時宣告能力聲明：

- `caps`：高層級能力類別，例如 `camera`、`canvas`、`screen`、
  `location`、`voice` 和 `talk`。
- `commands`：用於呼叫的指令允許清單。
- `permissions`：細緻開關（例如 `screen.record`、`camera.capture`）。

Gateway 將這些視為 **聲明** 並強制執行伺服器端允許清單。

## Presence

- `system-presence` 會傳回以裝置身分為鍵值的項目。
- Presence 項目包含 `deviceId`、`roles` 和 `scopes`，因此 UI 即使在裝置同時以
  **operator** 和 **node** 連線時，也能顯示每個裝置單一列。
- `node.list` 包含可選的 `lastSeenAtMs` 和 `lastSeenReason` 欄位。已連線的節點將其目前的連線時間報告為 `lastSeenAtMs`，原因為 `connect`；配對節點也可以在受信任節點事件更新其配對元資料時，報告持久化的背景在線狀態。

### 節點背景在線事件

節點可以呼叫 `node.event` 並使用 `event: "node.presence.alive"` 來記錄配對節點在喚醒期間處於在線狀態，而不將其標記為已連線。

```json
{
  "event": "node.presence.alive",
  "payloadJSON": "{\"trigger\":\"silent_push\",\"sentAtMs\":1737264000000,\"displayName\":\"Peter's iPhone\",\"version\":\"2026.4.28\",\"platform\":\"iOS 18.4.0\",\"deviceFamily\":\"iPhone\",\"modelIdentifier\":\"iPhone17,1\",\"pushTransport\":\"relay\"}"
}
```

`trigger` 是一個封閉枚舉：`background`、`silent_push`、`bg_app_refresh`、`significant_location`、`manual` 或 `connect`。未知的觸發字串會在持久化之前由閘道正規化為 `background`。該事件僅對已驗證的節點裝置會話持久化；無裝置或未配對的會話將傳回 `handled: false`。

成功的閘道會傳回結構化結果：

```json
{
  "ok": true,
  "event": "node.presence.alive",
  "handled": true,
  "reason": "persisted"
}
```

較舊的閘道對於 `node.event` 可能仍傳回 `{ "ok": true }`；客戶端應將其視為已確認的 RPC，而非持久的在線狀態持久化。

## 廣播事件範圍

伺服器推送的 WebSocket 廣播事件會受到範圍限制，因此僅限配對範圍或僅限節點的會話不會被動接收會話內容。

- **聊天、代理和工具結果幀**（包括串流的 `agent` 事件和工具呼叫結果）至少需要 `operator.read`。沒有 `operator.read` 的會話將完全跳過這些幀。
- **外掛定義的 `plugin.*` 廣播** 會限制為 `operator.write` 或 `operator.admin`，具體取決於外掛註冊它們的方式。
- **狀態和傳輸事件**（`heartbeat`、`presence`、`tick`、連線/斷線生命週期等）保持不受限制，以便每個已驗證的會話都能觀察到傳輸健康狀況。
- **未知的廣播事件系列** 預設受範圍限制（預設拒絕），除非已註冊的處理程序明確放寬限制。

每個客戶端連接都會維護自己的每個客戶端序列號，因此即使不同的客戶端看到經過範圍過濾的事件流子集不同，廣播也能在該 socket 上保持單調排序。

## 常見的 RPC 方法系列

公開的 WS 表面比上述握手/身份驗證範例更廣泛。這不是生成的傾印 —— `hello-ok.features.methods` 是一個從 `src/gateway/server-methods-list.ts` 建構的保守發現列表，加上已載入的外掛/通道方法匯出。請將其視為功能發現，而不是 `src/gateway/server-methods/*.ts` 的完整枚舉。

<AccordionGroup>
  <Accordion title="系統與身分">
    - `health` 傳回快取或新探測的閘道健康狀態快照。
    - `diagnostics.stability` 傳回最近有界的診斷穩定性記錄器。它保留操作元資料，例如事件名稱、計數、位元組大小、記憶體讀數、佇列/會話狀態、通道/外掛名稱和會話 ID。它不保留聊天文字、Webhook 內文、工具輸出、原始請求或回應內文、權杖、Cookie 或秘密值。需要操作員讀取範圍。
    - `status` 傳回 `/status` 風格的閘道摘要；敏感欄位僅包含在具有管理員範圍的操作員客戶端中。
    - `gateway.identity.get` 傳回中繼和配對流程所使用的閘道裝置身分。
    - `system-presence` 傳回已連線操作員/節點裝置的目前目前狀態快照。
    - `system-event` 附加系統事件並可以更新/廣播目前狀態上下文。
    - `last-heartbeat` 傳回最新持續化的心跳事件。
    - `set-heartbeats` 切換閘道上的心跳處理。

  </Accordion>

  <Accordion title="模型與使用情況">
    - `models.list` 返回執行時允許的模型目錄。傳遞 `{ "view": "configured" }` 以獲取選擇器大小的已配置模型（先 `agents.defaults.models`，然後 `models.providers.*.models`），或傳遞 `{ "view": "all" }` 以獲取完整目錄。
    - `usage.status` 返回提供者使用視窗/剩餘配額摘要。
    - `usage.cost` 返回日期範圍內的匯總成本使用摘要。
    - `doctor.memory.status` 返回活動預設代理工作區的向量記憶 / 快取嵌入就緒狀態。僅當呼叫者明確需要即時嵌入提供者 ping 時，才傳遞 `{ "probe": true }` 或 `{ "deep": true }`。
    - `doctor.memory.remHarness` 返回一個有限、唯讀的 REM 隨從預覽，供遠端控制平面客戶端使用。它可能包含工作區路徑、記憶片段、呈現的接地 Markdown 和深度提升候選項，因此呼叫者需要 `operator.read`。
    - `sessions.usage` 返回每個會話的使用摘要。
    - `sessions.usage.timeseries` 返回一個會話的時間序列使用量。
    - `sessions.usage.logs` 返回一個會話的使用日誌條目。

  </Accordion>

  <Accordion title="頻道與登入輔助程式">
    - `channels.status` 返回內建 + 捆綁的頻道/外掛狀態摘要。
    - `channels.logout` 登出特定的頻道/帳戶（該頻道支援登出）。
    - `web.login.start` 為目前支援 QR 的網頁頻道提供者啟動 QR/網頁登入流程。
    - `web.login.wait` 等待該 QR/網頁登入流程完成，並在成功時啟動頻道。
    - `push.test` 向已註冊的 iOS 節點發送測試 APNs 推送。
    - `voicewake.get` 返回儲存的喚醒詞觸發器。
    - `voicewake.set` 更新喚醒詞觸發器並廣播變更。

  </Accordion>

  <Accordion title="訊息傳遞與日誌">
    - `send` 是用於在聊天執行器之外，直接向頻道/帳號/執行緒目標發送的出站傳遞 RPC。
    - `logs.tail` 會傳回已設定的閘道檔案日誌尾部，並包含游標/限制與最大位元組控制。

  </Accordion>

  <Accordion title="Talk and TTS">
    - `talk.catalog` 傳回語音、串流轉錄及即時語音的唯讀 Talk 提供者目錄。其中包含提供者 ID、標籤、已配置的狀態、公開的模型/語音 ID、標準模式、傳輸方式、Brain 策略，以及即時音訊/能力旗標，但不會傳回提供者機密或修改全域設定。
    - `talk.config` 傳回有效的 Talk 設定負載；`includeSecrets` 需要 `operator.talk.secrets`（或 `operator.admin`）。
    - `talk.session.create` 為 `realtime/gateway-relay`、`transcription/gateway-relay` 或 `stt-tts/managed-room` 建立一個由 Gateway 擁有的 Talk 工作階段。`brain: "direct-tools"` 需要 `operator.admin`。
    - `talk.session.join` 驗證受管理房間的工作階段權杖，視需要發出 `session.ready` 或 `session.replaced` 事件，並傳回房間/工作階段中繼資料以及最近的 Talk 事件，但不包含明文權杖或儲存的權杖雜湊。
    - `talk.session.appendAudio` 將 base64 PCM 輸入音訊附加至 Gateway 擁有的即時轉送與轉錄工作階段。
    - `talk.session.startTurn`、`talk.session.endTurn` 和 `talk.session.cancelTurn` 驅動受管理房間的輪次生命週期，並在狀態清除前拒絕過期的輪次。
    - `talk.session.cancelOutput` 停止助理音訊輸出，主要用於 Gateway 轉送工作階段中由 VAD 閘控的插話。
    - `talk.session.submitToolResult` 完成由 Gateway 擁有的即時轉送工作階段所發出的提供者工具呼叫。當最終結果將隨後到來時，傳遞 `options: { willContinue: true }` 作為暫時性工具輸出；或者當工具結果應滿足提供者呼叫而不啟動另一個即時助理回應時，傳遞 `options: { suppressResponse: true }`。
    - `talk.session.close` 關閉由 Gateway 擁有的轉送、轉錄或受管理房間工作階段，並發出終端 Talk 事件。
    - `talk.mode` 設定/廣播 WebChat/Control UI 用戶端的目前 Talk 模式狀態。
    - `talk.client.create` 使用 `webrtc` 或 `provider-websocket` 建立一個由用戶端擁有的即時提供者工作階段，同時由 Gateway 擁有設定、憑證、指示和工具原則。
    - `talk.client.toolCall` 讓由用戶端擁有的即時傳輸能將提供者工具呼叫轉發至 Gateway 原則。第一個支援的工具是 `openclaw_agent_consult`；用戶端會收到一個執行 ID，並在提交提供者特定的工具結果之前等待正常的聊天生命週期事件。
    - `talk.event` 是針對即時、轉錄、STT/TTS、受管理房間、電話語音及會議配接器的單一 Talk 事件通道。
    - `talk.speak` 透過使用中的 Talk 語音提供者合成語音。
    - `tts.status` 傳回 TTS 啟用狀態、使用中的提供者、備援提供者及提供者設定狀態。
    - `tts.providers` 傳回可見的 TTS 提供者清單。
    - `tts.enable` 和 `tts.disable` 切換 TTS 偏好設定狀態。
    - `tts.setProvider` 更新首選的 TTS 提供者。
    - `tts.convert` 執行一次性文字轉語音轉換。

  </Accordion>

  <Accordion title="Secrets, config, update, and wizard">
    - `secrets.reload` 重新解析作用中的 SecretRef，並僅在完全成功時交換運行時密鑰狀態。
    - `secrets.resolve` 解析特定指令/目標集的指令目標密鑰分配。
    - `config.get` 傳回目前的設定快照和雜湊值。
    - `config.set` 寫入經驗證的設定負載。
    - `config.patch` 合併部分設定更新。
    - `config.apply` 驗證並取代完整的設定負載。
    - `config.schema` 傳回控制 UI 和 CLI 工具使用的即時設定架構負載：架構、`uiHints`、版本和產生中繼資料，包括當運行時可以載入時的外掛程式 + 通道架構中繼資料。該架構包含從 UI 使用的相同標籤和說明文字衍生的欄位 `title` / `description` 中繼資料，包括當存在相符欄位文件時的巢狀物件、萬用字元、陣列項目和 `anyOf` / `oneOf` / `allOf` 組合分支。
    - `config.schema.lookup` 傳回一個設定路徑的路徑範圍查詢負載：正規化路徑、淺層架構節點、相符的提示 + `hintPath`，以及用於 UI/CLI 鑽取的立即子項摘要。查詢架構節點保留使用者導向文件和常見驗證欄位（`title`、`description`、`type`、`enum`、`const`、`format`、`pattern`、數值/字串/陣列/物件邊界，以及諸如 `additionalProperties`、`deprecated`、`readOnly`、`writeOnly` 等旗標）。子項摘要公開 `key`、正規化 `path`、`type`、`required`、`hasChildren`，以及相符的 `hint` / `hintPath`。
    - `update.run` 執行閘道更新流程，並僅在更新本身成功時排程重新啟動；具有會話的呼叫者可以包含 `continuationMessage`，以便啟動透過重新啟動延續佇列繼續一個後續代理程式回合。套件管理員更新會在套件交換後強制執行非延遲、無冷卻的更新重新啟動，以便舊的閘道程序不會繼續從被取代的 `dist` 樹狀結構延遲載入。
    - `update.status` 傳回最新的快取更新重新啟動標記，包括可用時的重新啟動後運行版本。
    - `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 透過 WS RPC 公開上架精靈。

  </Accordion>

  <Accordion title="Agent and workspace helpers">
    - `agents.list` 返回已配置的代理條目，包括有效的模型和運行時元數據。
    - `agents.create`、`agents.update` 和 `agents.delete` 管理代理記錄和工作區連線。
    - `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理為代理暴露的引導工作區文件。
    - `tasks.list`、`tasks.get` 和 `tasks.cancel` 向 SDK 和操作員客戶端暴露 Gateway 任務帳本。
    - `artifacts.list`、`artifacts.get` 和 `artifacts.download` 針對明確的 `sessionKey`、`runId` 或 `taskId` 範圍，暴露源自記錄的摘要和下載內容。運行和任務查詢會在服務端解析所屬會話，且僅返回具有匹配來源的記錄媒體；不安全或本機 URL 來源將返回不支援的下載，而不是在服務端獲取。
    - `environments.list` 和 `environments.status` 向 SDK 客戶端暴露唯讀的 Gateway 本地和節點環境發現功能。
    - `agent.identity.get` 返回代理或會話的有效助手身份。
    - `agent.wait` 等待運行完成，並在可用時返回終端快照。

  </Accordion>

  <Accordion title="Session control">
    - `sessions.list` 返回目前的工作階段索引，當配置了 Agent 執行期後端時，包含每列 `agentRuntime` 中繼資料。
    - `sessions.subscribe` 和 `sessions.unsubscribe` 切換目前 WS 用戶端的工作階段變更事件訂閱。
    - `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 切換單一工作階段的逐字稿/訊息事件訂閱。
    - `sessions.preview` 返回特定工作階段鍵值的有限逐字稿預覽。
    - `sessions.describe` 返回特定工作階段鍵值的一個 Gateway 工作階段列。
    - `sessions.resolve` 解析或正規化工作階段目標。
    - `sessions.create` 建立新的工作階段項目。
    - `sessions.send` 將訊息傳送至現有工作階段。
    - `sessions.steer` 是針對使用中工作階段的中斷與引導變體。
    - `sessions.abort` 中止工作階段的進行中工作。呼叫者可以傳遞 `key` 加上選用的 `runId`，或僅傳遞 `runId` 以供 Gateway 解析為工作階段的進行中執行。
    - `sessions.patch` 更新工作階段中繼資料/覆蓋設定，並回報已解析的正規模型加上有效 `agentRuntime`。
    - `sessions.reset`、`sessions.delete` 和 `sessions.compact` 執行工作階段維護。
    - `sessions.get` 返回完整的已儲存工作階段列。
    - Chat 執行仍使用 `chat.history`、`chat.send`、`chat.abort` 和 `chat.inject`。`chat.history` 對於 UI 用戶端已經過顯示正規化處理：可見文字會移除內嵌指令標籤、純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截斷的工具呼叫區塊）以及洩漏的 ASCII/全形模型控制權杖會被移除，純靜音權杖助理列（如精確的 `NO_REPLY` / `no_reply`）會被省略，且過大的列可以由預留位置取代。

  </Accordion>

  <Accordion title="裝置配對與裝置權杖">
    - `device.pair.list` 會傳回待審核與已核准的配對裝置。
    - `device.pair.approve`、`device.pair.reject` 與 `device.pair.remove` 管理裝置配對記錄。
    - `device.token.rotate` 在已核准的角色與呼叫者範圍界限內輪替配對裝置權杖。
    - `device.token.revoke` 在已核准的角色與呼叫者範圍界限內撤銷配對裝置權杖。

  </Accordion>

  <Accordion title="節點配對、叫用與待處理工作">
    - `node.pair.request`、`node.pair.list`、`node.pair.approve`、`node.pair.reject`、`node.pair.remove` 與 `node.pair.verify` 涵蓋節點配對與啟動驗證。
    - `node.list` 與 `node.describe` 傳回已知/已連線的節點狀態。
    - `node.rename` 更新配對節點標籤。
    - `node.invoke` 將指令轉送至已連線的節點。
    - `node.invoke.result` 傳回叫用請求的結果。
    - `node.event` 將節點產生的事件帶回閘道。
    - `node.pending.pull` 與 `node.pending.ack` 是已連線節點的佇列 API。
    - `node.pending.enqueue` 與 `node.pending.drain` 管理離線/未連線節點的持續性待處理工作。

  </Accordion>

  <Accordion title="Approval families">
    - `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和 `exec.approval.resolve` 涵蓋一次性執行審批請求以及待審批查詢/重放。
    - `exec.approval.waitDecision` 等待一個待處理的執行審批並傳回最終決策（或在逾時時傳回 `null`）。
    - `exec.approvals.get` 和 `exec.approvals.set` 管理閘道執行審批策略快照。
    - `exec.approvals.node.get` 和 `exec.approvals.node.set` 透過節點中繼指令管理節點本地的執行審批策略。
    - `plugin.approval.request`、`plugin.approval.list`、`plugin.approval.waitDecision` 和 `plugin.approval.resolve` 涵蓋外掛程式定義的審批流程。

  </Accordion>

  <Accordion title="自動化、技能和工具">
    - 自動化：`wake` 排程立即或下次心跳喚醒的文字注入；`cron.get`、`cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、`cron.run`、`cron.runs` 管理排程工作。
    - 技能和工具：`commands.list`、`skills.*`、`tools.catalog`、`tools.effective`、`tools.invoke`。

  </Accordion>
</AccordionGroup>

### 常見事件系列

- `chat`：UI 聊天更新，例如 `chat.inject` 和其他僅限逐字稿的聊天事件。在協議 v4 中，差異承載攜帶 `deltaText`；`message` 仍然
  是累積的助理快照。非前綴替換設定 `replace=true`
  並使用 `deltaText` 作為替換文字。
- `session.message` 和 `session.tool`：已訂閱會話的逐字稿/事件串流更新。
- `sessions.changed`：會話索引或元資料已變更。
- `presence`：系統在線狀態快照更新。
- `tick`：週期性保活/存活事件。
- `health`：閘道健康快照更新。
- `heartbeat`：心跳事件串流更新。
- `cron`：cron 執行/工作變更事件。
- `shutdown`：閘道關機通知。
- `node.pair.requested` / `node.pair.resolved`：節點配對生命週期。
- `node.invoke.request`：節點叫用請求廣播。
- `device.pair.requested` / `device.pair.resolved`：配對裝置生命週期。
- `voicewake.changed`：喚醒詞觸發設定已變更。
- `exec.approval.requested` / `exec.approval.resolved`: 執行核准
  生命週期。
- `plugin.approval.requested` / `plugin.approval.resolved`: 外掛程式核准
  生命週期。

### 節點輔助方法

- 節點可以呼叫 `skills.bins` 以取得目前的技能可執行檔清單
  用於自動允許檢查。

### 任務分類帳 RPC

操作員用戶端可以透過任務分類帳 RPC 檢查並取消閘道背景任務記錄。這些方法會回傳經過清理的任務摘要，而非原始
執行時狀態。

- `tasks.list` 需要 `operator.read`。
  - 參數：可選的 `status` (`"queued"`、`"running"`、`"completed"`、
    `"failed"`、`"cancelled"` 或 `"timed_out"`) 或這些狀態的陣列、
    可選的 `agentId`、可選的 `sessionKey`、從 `1` 到
    `500` 的可選 `limit`，以及可選字串 `cursor`。
  - 結果：`{ "tasks": TaskSummary[], "nextCursor"?: string }`。
- `tasks.get` 需要 `operator.read`。
  - 參數：`{ "taskId": string }`。
  - 結果：`{ "task": TaskSummary }`。
  - 遺失的任務 id 會回傳閘道找不到的錯誤格式。
- `tasks.cancel` 需要 `operator.write`。
  - 參數：`{ "taskId": string, "reason"?: string }`。
  - 結果：
    `{ "found": boolean, "cancelled": boolean, "reason"?: string, "task"?: TaskSummary }`。
  - `found` 回報分類帳是否有相符的任務。`cancelled`
    回報執行時期是否接受或記錄取消。

`TaskSummary` 包含 `id`、`status` 以及可選的中繼資料，例如 `kind`、
`runtime`、`title`、`agentId`、`sessionKey`、`childSessionKey`、`ownerKey`、
`runId`、`taskId`、`flowId`、`parentTaskId`、`sourceId`、時間戳記、進度、
最終摘要，以及經過清理的錯誤文字。

### 操作員輔助方法

- 操作員可以呼叫 `commands.list` (`operator.read`) 以取得代理程式的執行時期指令清單。
  - `agentId` 是選用的；省略它以讀取預設的代理程式工作區。
  - `scope` 控制主要 `name` 的目標介面：
    - `text` 會傳回不帶前導 `/` 的主要文字指令符記
    - `native` 和預設的 `both` 路徑會在可用時傳回供應商感知的原生名稱
  - `textAliases` 携帶精確的斜線別名，例如 `/model` 和 `/m`。
  - 當存在供應商感知的原生指令名稱時，`nativeName` 會攜帶該名稱。
  - `provider` 是選用的，且僅影響原生命名以及原生外掛程式指令的可用性。
  - `includeArgs=false` 會從回應中省略序列化的引數中繼資料。
- 操作員可以呼叫 `tools.catalog` (`operator.read`) 以取得代理程式的執行時期工具目錄。回應包含分組的工具和出處中繼資料：
  - `source`：`core` 或 `plugin`
  - `pluginId`：外掛程式擁有者（當 `source="plugin"` 時）
  - `optional`：外掛程式工具是否為選用
- 操作員可以呼叫 `tools.effective` (`operator.read`) 以取得工作階段的執行時期有效工具清單。
  - `sessionKey` 是必填的。
  - 閘道是從伺服器端的工作階段衍生受信任的執行時期內容，而不是接受呼叫者提供的驗證或傳遞內容。
  - 回應的作用範圍限定於工作階段，並反映目前主動對話可使用的內容，包括核心、插件和頻道工具。
- 操作員可以呼叫 `tools.invoke` (`operator.write`) 以透過與 `/tools/invoke` 相同的閘道原則路徑來叫用其中一個可用工具。
  - `name` 是必填的。`args`、`sessionKey`、`agentId`、`confirm` 和 `idempotencyKey` 則是選用的。
  - 如果同時存在 `sessionKey` 和 `agentId`，解析出的會話代理必須匹配
    `agentId`。
  - 回應是一個面向 SDK 的封包，包含 `ok`、`toolName`、可選的 `output` 以及類型化的
    `error` 欄位。批准或策略拒絕會在負載中回傳 `ok:false`，而不是繞過閘道工具策略管道。
- 操作員可以呼叫 `skills.status` (`operator.read`) 來取得代理的可見
  技能清單。
  - `agentId` 是可選的；省略它以讀取預設代理工作區。
  - 回應包含資格、缺少的需求、設定檢查和經過清理的安裝選項，而不會暴露原始祕密值。
- 操作員可以呼叫 `skills.search` 和 `skills.detail` (`operator.read`) 以取得
  ClawHub 探索中繼資料。
- 操作員可以呼叫 `skills.upload.begin`、`skills.upload.chunk` 和
  `skills.upload.commit` (`operator.admin`) 以在安裝私人技能封存之前進行暫存。這是一個供受信任客戶端使用的獨立管理員上傳路徑，
  並非一般的 ClawHub 技能安裝流程，且除非啟用
  `skills.install.allowUploadedArchives`，否則預設為停用。
  - `skills.upload.begin({ kind: "skill-archive", slug, sizeBytes, sha256?, force?, idempotencyKey? })`
    建立一個綁定到該 slug 和 force 值的上傳。
  - `skills.upload.chunk({ uploadId, offset, dataBase64 })` 在
    確切的解碼偏移處附加位元組。
  - `skills.upload.commit({ uploadId, sha256? })` 驗證最終大小和
    SHA-256。提交僅完成上傳；它不會安裝技能。
  - 上傳的技能封存是包含 `SKILL.md` 根目錄的 zip 封存。
    封存的內部目錄名稱從不選擇安裝目標。
- 操作員可以以三種模式呼叫 `skills.install` (`operator.admin`)：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 將
    技能資料夾安裝到預設代理工作區 `skills/` 目錄中。
  - 上傳模式：`{ source: "upload", uploadId, slug, force?, sha256?, timeoutMs? }`
    將已認可的上傳安裝至預設 agent 工作區 `skills/<slug>`
    目錄。slug 與 force 值必須與原始
    `skills.upload.begin` 請求相符。除非啟用
    `skills.install.allowUploadedArchives`，否則將拒絕此模式。此設定不會
    影響 ClawHub 安裝。
  - Gateway 安裝程式模式：`{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }`
    在 gateway 主機上執行已宣告的 `metadata.openclaw.install` 動作。
- 操作員可以兩種模式呼叫 `skills.update` (`operator.admin`)：
  - ClawHub 模式會更新預設代理工作區中的一個追蹤 slug 或所有追蹤的 ClawHub 安裝。
  - Config 模式會修補 `skills.entries.<skillKey>` 值，例如 `enabled`、
    `apiKey` 與 `env`。

### `models.list` 檢視

`models.list` 接受選用的 `view` 參數：

- 省略或 `"default"`：目前的執行時期行為。若已設定 `agents.defaults.models`，回應為允許的目錄，包含 `provider/*` 項目的動態探索模型。否則回應為完整的 Gateway 目錄。
- `"configured"`：選擇器大小的行為。若已設定 `agents.defaults.models`，它仍然優先，包含 `provider/*` 項目的供應商範圍探索。若無允許清單，回應使用明確的 `models.providers.*.models` 項目，僅在不存在已設定的模型資料列時才回退至完整目錄。
- `"all"`：完整的 Gateway 目錄，略過 `agents.defaults.models`。將此用於診斷與探索 UI，而非一般的模型選擇器。

## 執行核准

- 當 exec 請求需要核准時，gateway 會廣播 `exec.approval.requested`。
- 操作員客戶端透過呼叫 `exec.approval.resolve` 進行解析（需要 `operator.approvals` 範圍）。
- 對於 `host=node`，`exec.approval.request` 必須包含 `systemRunPlan`（標準的 `argv`/`cwd`/`rawCommand`/session 中繼資料）。缺少 `systemRunPlan` 的請求將被拒絕。
- 批准後，轉發的 `node.invoke system.run` 呼叫會重用該標準
  `systemRunPlan` 作為授權的 command/cwd/session 語境。
- 如果呼叫者在 prepare 和最終批准的 `system.run` 轉發之間變更了 `command`、`rawCommand`、`cwd`、`agentId` 或
  `sessionKey`，閘道會拒絕該執行，而不是信任已變更的 payload。

## 代理傳遞後備

- `agent` 請求可以包含 `deliver=true` 以要求傳出傳遞。
- `bestEffortDeliver=false` 保持嚴格行為：未解析或僅內部傳遞目標會傳回 `INVALID_REQUEST`。
- 當無法解析外部可傳遞路由時（例如內部/webchat 會話或不明確的多通道配置），`bestEffortDeliver=true` 允許退回到僅會話執行。
- 最終 `agent` 結果在要求傳遞時可能包含 `result.deliveryStatus`，使用與 [`openclaw agent --json --deliver`](/zh-Hant/cli/agent#json-delivery-status) 中記錄的相同 `sent`、`suppressed`、`partial_failed` 和 `failed`
  狀態。

## 版本控制

- `PROTOCOL_VERSION` 位於 `src/gateway/protocol/version.ts` 中。
- 客戶端發送 `minProtocol` + `maxProtocol`；伺服器會拒絕不包含其目前協定版本的範圍。目前的客戶端和伺服器需要協定 v4。
- Schema + 模型是從 TypeBox 定義生成的：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### 客戶端常數

`src/gateway/client.ts` 中的參考客戶端使用這些預設值。這些值在協議 v4 中保持穩定，並且是第三方客戶端的預期基準。

| 常數                              | 預設值                                            | 來源                                                                             |
| --------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `PROTOCOL_VERSION`                | `4`                                               | `src/gateway/protocol/version.ts`                                                |
| `MIN_CLIENT_PROTOCOL_VERSION`     | `4`                                               | `src/gateway/protocol/version.ts`                                                |
| 請求逾時（每個 RPC）              | `30_000` ms                                       | `src/gateway/client.ts` (`requestTimeoutMs`)                                     |
| 預先授權 / 連接挑戰逾時           | `15_000` ms                                       | `src/gateway/handshake-timeouts.ts` (config/env 可以提高配對的伺服器/客戶端預算) |
| 初始重新連線退避                  | `1_000` ms                                        | `src/gateway/client.ts` (`backoffMs`)                                            |
| 最大重新連線退避                  | `30_000` ms                                       | `src/gateway/client.ts` (`scheduleReconnect`)                                    |
| 裝置權杖關閉後的快速重試限制      | `250` ms                                          | `src/gateway/client.ts`                                                          |
| `terminate()` 前的強制停止寬限期  | `250` ms                                          | `FORCE_STOP_TERMINATE_GRACE_MS`                                                  |
| `stopAndWait()` 預設逾時          | `1_000` ms                                        | `STOP_AND_WAIT_TIMEOUT_MS`                                                       |
| 預設 tick 間隔（`hello-ok` 之前） | `30_000` ms                                       | `src/gateway/client.ts`                                                          |
| Tick 逾時關閉                     | 當靜默超過 `tickIntervalMs * 2` 時回應代碼 `4000` | `src/gateway/client.ts`                                                          |
| `MAX_PAYLOAD_BYTES`               | `25 * 1024 * 1024` (25 MB)                        | `src/gateway/server-constants.ts`                                                |

伺服器在 `hello-ok` 中通告有效的 `policy.tickIntervalMs`、`policy.maxPayload` 和 `policy.maxBufferedBytes`；客戶端應遵守這些值，而不是交握前的預設值。

## 認證

- 共用密鑰閘道認證根據設定的認證模式使用 `connect.params.auth.token` 或 `connect.params.auth.password`。
- 承載身分的模式，例如 Tailscale Serve
  (`gateway.auth.allowTailscale: true`) 或非回環
  `gateway.auth.mode: "trusted-proxy"`，透過請求標頭而非 `connect.params.auth.*` 滿足連線認證檢查。
- Private-ingress `gateway.auth.mode: "none"` 完全跳過共享金鑰連線認證；
  請勿在公開或不受信任的入口上公開該模式。
- 配對後，Gateway 會發出一個範圍限定於連線角色 + 範圍的 **裝置權杖**。
  它會在 `hello-ok.auth.deviceToken` 中返回，客戶端應將其保存以供未來連線使用。
- 客戶端應在任何成功連線後保存主要的 `hello-ok.auth.deviceToken`。
- 使用該 **已儲存** 的裝置權杖重新連線時，也應重複使用為該權杖儲存的已批准範圍集合。
  這樣可保留已授予的讀取/探測/狀態存取權，並避免無聲地將重新連線收窄為較狹隘的隱含僅限管理員範圍。
- 客戶端連線認證組裝 (`selectConnectAuth` 位於
  `src/gateway/client.ts`)：
  - `auth.password` 是正交的，且設定時總是會被轉發。
  - `auth.token` 按優先順序填入：首先是明確的共享權杖，
    然後是明確的 `deviceToken`，接著是儲存的每裝置權杖 (以
    `deviceId` + `role` 為鍵)。
  - `auth.bootstrapToken` 僅在上述均未解析出
    `auth.token` 時發送。共享權杖或任何已解析的裝置權杖會將其抑制。
  - 在一次性 `AUTH_TOKEN_MISMATCH` 重試時自動提升儲存的裝置權杖，僅限於 **受信任的端點** —
    即回環，或是具有固定 `tlsFingerprint` 的 `wss://`。不具固定的公開 `wss://`
    不符合資格。
- 額外的 `hello-ok.auth.deviceTokens` 項目是啟動移交權杖。
  僅當連線在受信任的傳輸 (如 `wss://` 或回環/本機配對) 上使用啟動認證時，才儲存它們。
- 如果用戶端提供 **明確的** `deviceToken` 或明確的 `scopes`，該呼叫者請求的範圍集將保持權威；只有在用戶端重用儲存的每個設備權杖時，才會重用快取的範圍。
- 設備權杖可以透過 `device.token.rotate` 和 `device.token.revoke` 進行輪替/撤銷（需要 `operator.pairing` 範圍）。
- `device.token.rotate` 會返回輪替元數據。它僅在已使用該設備權杖進行驗證的相同設備呼叫中回傳替換的持有人權杖，以便僅使用權杖的用戶端可以在重新連線之前保存其替換權杖。共用/管理員輪替不會回傳持有人權杖。
- 權杖的發行、輪替和撤銷始終受限於該設備配對條目中記錄的已批准角色集；權杖變更無法擴充或以配對批准從未授予的設備角色為目標。
- 對於已配對設備權杖會話，除非呼叫者也具有 `operator.admin`，否則設備管理為自範圍：非管理員呼叫者只能移除/撤銷/輪替他們 **自己** 的設備條目。
- `device.token.rotate` 和 `device.token.revoke` 也會根據呼叫者目前的會話範圍檢查目標操作員權杖範圍集。非管理員呼叫者無法輪替或撤銷比其目前持有的範圍更廣的操作員權杖。
- 驗證失敗包含 `error.details.code` 以及復原提示：
  - `error.details.canRetryWithDeviceToken` (布林值)
  - `error.details.recommendedNextStep` (`retry_with_device_token`、`update_auth_configuration`、`update_auth_credentials`、`wait_then_retry`、`review_auth_configuration`)
- 針對 `AUTH_TOKEN_MISMATCH` 的用戶端行為：
  - 受信任的用戶端可以使用快取的每個設備權杖嘗試一次有限的重試。
  - 如果該重試失敗，用戶端應停止自動重新連線迴圈，並顯示操作員操作指導。
- `AUTH_SCOPE_MISMATCH` 表示設備權杖已被識別，但未涵蓋請求的角色/範圍。用戶端不應將此顯示為錯誤的權杖；應提示操作員重新配對或批准更窄/更廣的範圍合約。

## 設備身分識別 + 配對

- 節點應包含穩定的裝置身分（`device.id`），該身分衍生自
  金鑰對指紋。
- 閘道會針對每個裝置與角色發出 Token。
- 除非啟用了本機自動核准，否則新的裝置 ID 需要配對核准。

- 配對自動核准以直接的本機回環連線為中心。
- OpenClaw 還有一個狹窄的後端/容器本機自我連線路徑，用於
  受信任的共享祕密輔助流程。
- 同主機的 tailnet 或 LAN 連線在配對時仍被視為遠端連線，
  並需要核准。
- WS 用戶端通常在 `connect` 期間（操作員 +
  節點）包含 `device` 身分。唯一的無裝置操作員例外情況是明確信任路徑：
  - `gateway.controlUi.allowInsecureAuth=true` 僅用於僅限本機主機的不安全 HTTP 相容性。
  - 成功的 `gateway.auth.mode: "trusted-proxy"` 操作員控制 UI 驗證。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true`（緊急破門，嚴重的安全性降級）。
  - 直接回環 `gateway-client` 後端 RPC，使用共享的
    閘道 Token/密碼進行驗證。
- 所有連線必須對伺服器提供的 `connect.challenge` nonce 進行簽署。

### 裝置驗證移轉診斷

對於仍使用挑戰前簽署行為的舊版用戶端，`connect` 現在會
在 `error.details.code` 下傳回 `DEVICE_AUTH_*` 詳細程式碼，並帶有穩定的 `error.details.reason`。

常見的移轉失敗：

| 訊息                        | details.code                     | details.reason           | 含義                                            |
| --------------------------- | -------------------------------- | ------------------------ | ----------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 用戶端遺漏了 `device.nonce`（或傳送了空白值）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 用戶端使用了過時/錯誤的 nonce 進行簽署。        |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 簽署內容與 v2 內容不符。                        |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 簽署時間戳超出允許的誤差範圍。                  |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 與公開金鑰指紋不符。                |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公開金鑰格式/正規化失敗。                       |

遷移目標：

- 務必等待 `connect.challenge`。
- 簽署包含伺服器 nonce 的 v2 載荷。
- 在 `connect.params.device.nonce` 中發送相同的 nonce。
- 偏好的簽名載荷為 `v3`，其除了裝置/用戶端/角色/範圍/令牌/nonce 欄位外，還綁定了 `platform` 和 `deviceFamily`。
- 舊版 `v2` 簽名為了相容性仍被接受，但在重新連線時，配對裝置元資料固定仍然控制指令策略。

## TLS + 固定

- WS 連線支援 TLS。
- 用戶端可以選擇固定閘道憑證指紋（請參閱 `gateway.tls` 配置以及 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 範圍

此協定公開了 **完整的閘道 API**（狀態、頻道、模型、聊天、代理、工作階段、節點、審核等）。其確切介面由 `src/gateway/protocol/schema.ts` 中的 TypeBox 綱要定義。

## 相關

- [橋接協定](/zh-Hant/gateway/bridge-protocol)
- [閘道手冊](/zh-Hant/gateway)
