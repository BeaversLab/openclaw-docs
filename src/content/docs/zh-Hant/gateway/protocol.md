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

內建的 QR/設定代碼啟動僅適用於節點。當擁有者批准待處理的節點請求後，`hello-ok.auth` 將包含主要節點 token：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "node",
    "scopes": []
  }
}
```

內建的設定代碼流程不包含額外的 `deviceTokens` 項目，也不會交出操作員 token。客戶端作者應將可選的 `hello-ok.auth.deviceTokens` 欄位視為舊版/自訂啟動擴充資料：僅在受信任的傳輸上出現時才加以保存，且不要為內建的配對要求此欄位。

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

如需完整的操作員範圍模型、批准時檢查以及共用金鑰語意，請參閱 [Operator scopes](/zh-Hant/gateway/operator-scopes)。

### 角色

- `operator` = 控制平面客戶端 (CLI/UI/自動化)。
- `node` = 功能主機 (camera/screen/canvas/system.run)。

### 權限（操作員）

常見權限：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`
- `operator.talk.secrets`

具有 `includeSecrets: true` 的 `talk.config` 需要 `operator.talk.secrets`
(或 `operator.admin`)。

外掛註冊的 gateway RPC 方法可以請求自己的操作員範圍，但保留的核心管理員前綴 (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) 總是解析為 `operator.admin`。

方法範圍僅是第一道關卡。透過 `chat.send` 到達的一些斜線指令會在之上套用更嚴格的指令層級檢查。例如，持久化的 `/config set` 和 `/config unset` 寫入需要 `operator.admin`。

`node.pair.approve` 在基本方法範圍之上也有額外的批准時範圍檢查：

- 無指令請求：`operator.pairing`
- 帶有非 exec 節點指令的請求：`operator.pairing` + `operator.write`
- 包含 `system.run`、`system.run.prepare` 或 `system.which` 的請求：
  `operator.pairing` + `operator.admin`

### Caps/commands/permissions (node)

節點會在連線時宣告能力聲明：

- `caps`：高層級能力類別，例如 `camera`、`canvas`、`screen`、
  `location`、`voice` 和 `talk`。
- `commands`：用於 invoke 的指令允許清單。
- `permissions`：細粒度切換（例如 `screen.record`、`camera.capture`）。

Gateway 將這些視為 **聲明** 並強制執行伺服器端允許清單。

## Presence

- `system-presence` 傳回以裝置身分為鍵的項目。
- Presence 項目包含 `deviceId`、`roles` 和 `scopes`，因此即使裝置同時以 **operator** 和 **node** 身分連線，UI 也能針對每個裝置顯示單一行。
- `node.list` 包含選用的 `lastSeenAtMs` 和 `lastSeenReason` 欄位。已連線的節點會將其目前的連線時間回報為 `lastSeenAtMs`，並附上原因 `connect`；配對的節點也可以在受信任節點事件更新其配對元資料時，回報持久的背景 Presence。

### 節點背景在線事件

節點可以使用 `event: "node.presence.alive"` 呼叫 `node.event`，以記錄配對節點在背景喚醒期間曾處於活躍狀態，而不將其標記為已連線。

```json
{
  "event": "node.presence.alive",
  "payloadJSON": "{\"trigger\":\"silent_push\",\"sentAtMs\":1737264000000,\"displayName\":\"Peter's iPhone\",\"version\":\"2026.4.28\",\"platform\":\"iOS 18.4.0\",\"deviceFamily\":\"iPhone\",\"modelIdentifier\":\"iPhone17,1\",\"pushTransport\":\"relay\"}"
}
```

`trigger` 是一個封閉式列舉：`background`、`silent_push`、`bg_app_refresh`、
`significant_location`、`manual` 或 `connect`。未知的觸發字串會在持久化之前由閘道正規化為
`background`。此事件僅針對已驗證的節點裝置階段持久存在；無裝置或未配對的階段會傳回 `handled: false`。

成功的閘道會傳回結構化結果：

```json
{
  "ok": true,
  "event": "node.presence.alive",
  "handled": true,
  "reason": "persisted"
}
```

較舊的閘道可能仍會針對 `node.event` 傳回 `{ "ok": true }`；客戶端應將其視為已確認的 RPC，而非持久的 Presence 持久化。

## 廣播事件範圍

伺服器推送的 WebSocket 廣播事件會受到範圍限制，因此僅限配對範圍或僅限節點的會話不會被動接收會話內容。

- **Chat、agent 和 tool-result 框架**（包括串流的 `agent` 事件和工具呼叫結果）至少需要 `operator.read`。沒有 `operator.read` 的 Session 會完全跳過這些框架。
- **外掛定義的 `plugin.*` 廣播** 會根據外掛註冊方式，限制為 `operator.write` 或 `operator.admin`。
- **狀態與傳輸事件**（`heartbeat`、`presence`、`tick`、連線/斷線生命週期等）保持不受限制，以便每個已驗證的 Session 都能觀察到傳輸健康狀態。
- **未知的廣播事件系列** 預設受範圍限制（預設拒絕），除非已註冊的處理程序明確放寬限制。

每個客戶端連接都會維護自己的每個客戶端序列號，因此即使不同的客戶端看到經過範圍過濾的事件流子集不同，廣播也能在該 socket 上保持單調排序。

## 常見的 RPC 方法系列

公開的 WS 表面比上述握手/認證範例更廣泛。這不是生成的傾印——`hello-ok.features.methods` 是從 `src/gateway/server-methods-list.ts` 以及載入的外掛/通道方法匯出建立的保守探索清單。請將其視為功能探索，而非 `src/gateway/server-methods/*.ts` 的完整列舉。

<AccordionGroup>
  <Accordion title="系統與身分">
    - `health` 傳回快取或新探測的閘道健康狀態快照。
    - `diagnostics.stability` 傳回最近的受限診斷穩定性記錄器。它保留操作元數據，例如事件名稱、計數、位元組大小、記憶體讀數、佇列/會話狀態、通道/外掛程式名稱和會話 ID。它不保留聊天文字、Webhook 內文、工具輸出、原始請求或回應內文、權杖、Cookie 或秘密值。需要操作員讀取權限。
    - `status` 傳回 `/status` 風格的閘道摘要；敏感欄位僅包含在具有管理員範圍的操作員用戶端中。
    - `gateway.identity.get` 傳回中繼與配對流程所使用的閘道裝置身分。
    - `system-presence` 傳回已連線操作員/節點裝置的目前狀態快照。
    - `system-event` 新增系統事件並可更新/廣播狀態上下文。
    - `last-heartbeat` 傳回最新保存的心跳事件。
    - `set-heartbeats` 切換閘道上的心跳處理。

  </Accordion>

  <Accordion title="Models and usage">
    - `models.list` 返回運行時允許的模型目錄。傳遞 `{ "view": "configured" }` 以取得適用於選擇器大小的已配置模型（`agents.defaults.models` 優先，然後是 `models.providers.*.models`），或傳遞 `{ "view": "all" }` 以取得完整目錄。
    - `usage.status` 返回提供者使用量視窗/剩餘配額摘要。
    - `usage.cost` 返回指定日期範圍的匯總成本使用量摘要。
    - `doctor.memory.status` 返回作用中預設代理工作區的向量記憶體/快取嵌入準備情況。僅當呼叫者明確想要即時嵌入提供者連線測試時，才傳遞 `{ "probe": true }` 或 `{ "deep": true }`。
    - `doctor.memory.remHarness` 返回一個有限的、唯讀的 REM 系統預覽，供遠端控制平面客戶端使用。它可能包含工作區路徑、記憶片段、渲染的基礎 Markdown 以及深度提升候選項，因此呼叫者需要 `operator.read`。
    - `sessions.usage` 返回每個工作階段的使用量摘要。
    - `sessions.usage.timeseries` 返回單一工作階段的時間序列使用量。
    - `sessions.usage.logs` 返回單一工作階段的使用量記錄條目。

  </Accordion>

  <Accordion title="Channels and login helpers">
    - `channels.status` 返回內建 + 捆綁的頻道/外掛狀態摘要。
    - `channels.logout` 登出支援登出功能的特定頻道/帳戶。
    - `web.login.start` 為當前支援 QR 的網頁頻道提供者啟動 QR/網頁登入流程。
    - `web.login.wait` 等待該 QR/網頁登入流程完成，並在成功時啟動該頻道。
    - `push.test` 向已註冊的 iOS 節點發送測試 APNs 推送通知。
    - `voicewake.get` 返回儲存的喚醒詞觸發器。
    - `voicewake.set` 更新喚醒詞觸發器並廣播變更。

  </Accordion>

  <Accordion title="訊息與日誌">
    - `send` 是在聊天運行器之外，針對頻道/帳戶/執行緒目標傳送的直接出站傳送 RPC。
    - `logs.tail` 返回已配置的 gateway 檔案日誌尾部，並包含游標/限制和最大位元組控制。

  </Accordion>

  <Accordion title="Talk and TTS">
    - `talk.catalog` 傳回用於語音、串流轉錄即時語音的唯讀 Talk 提供者目錄。它包含提供者 ID、標籤、設定狀態、公開的模型/語音 ID、標準模式、傳輸、brain 策略，以及即時音訊/能力標記，但不傳回提供者金鑰或修改全域設定。
    - `talk.config` 傳回有效的 Talk 設定負載；`includeSecrets` 需要 `operator.talk.secrets`（或 `operator.admin`）。
    - `talk.session.create` 為 `realtime/gateway-relay`、`transcription/gateway-relay` 或 `stt-tts/managed-room` 建立 Gateway 擁有的 Talk 工作階段。對於 `stt-tts/managed-room`，傳遞 `sessionKey` 的 `operator.write` 呼叫端也必須傳遞 `spawnedBy` 以取得範圍工作階段金鑰的可見性；無範圍 `sessionKey` 建立和 `brain: "direct-tools"` 需要 `operator.admin`。
    - `talk.session.join` 驗證受管理房間工作階段權杖，視需要發出 `session.ready` 或 `session.replaced` 事件，並傳回房間/工作階段中繼資料以及最近的 Talk 事件，但不包含明文權杖或儲存的權杖雜湊。
    - `talk.session.appendAudio` 將 base64 PCM 輸入音訊附加到 Gateway 擁有的即時轉送和轉錄工作階段。
    - `talk.session.startTurn`、`talk.session.endTurn` 和 `talk.session.cancelTurn` 驅動受管理房間的輪次生命週期，並在狀態清除前拒絕過期的輪次。
    - `talk.session.cancelOutput` 停止助理音訊輸出，主要用於 Gateway 轉送工作階段中的 VAD 閘控插話。
    - `talk.session.submitToolResult` 完成由 Gateway 擁有的即時轉送工作階段發出的提供者工具呼叫。當最終結果隨後到來時，請傳遞 `options: { willContinue: true }` 作為暫時性工具輸出；或者當工具結果應滿足提供者呼叫而不啟動另一個即時助理回應時，請傳遞 `options: { suppressResponse: true }`。
    - `talk.session.close` 關閉 Gateway 擁有的轉送、轉錄或受管理房間工作階段，並發出終端 Talk 事件。
    - `talk.mode` 設定/廣播 WebChat/Control UI 用戶端的目前 Talk 模式狀態。
    - `talk.client.create` 使用 `webrtc` 或 `provider-websocket` 建立用戶端擁有的即時提供者工作階段，同時 Gateway 擁有設定、憑證、指示和工具政策。
    - `talk.client.toolCall` 讓用戶端擁有的即時傳輸將提供者工具呼叫轉發到 Gateway 政策。第一個支援的工具是 `openclaw_agent_consult`；用戶端會收到一個 run id，並在提交提供者特定的工具結果之前等待正常的聊天生命週期事件。
    - `talk.event` 是即時、轉錄、STT/TTS、受管理房間、電話會議和會議配接器的單一 Talk 事件通道。
    - `talk.speak` 透過作用中的 Talk 語音提供者合成語音。
    - `tts.status` 傳回 TTS 啟用狀態、作用中的提供者、備用提供者和提供者設定狀態。
    - `tts.providers` 傳回可見的 TTS 提供者清單。
    - `tts.enable` 和 `tts.disable` 切換 TTS 偏好設定狀態。
    - `tts.setProvider` 更新首選的 TTS 提供者。
    - `tts.convert` 執行單次文字轉語音轉換。

  </Accordion>

  <Accordion title="Secrets, config, update, and wizard">
    - `secrets.reload` 重新解析現有的 SecretRefs，並僅在完全成功時交換執行時期密鑰狀態。
    - `secrets.resolve` 解析特定指令/目標集的指令目標密鑰指派。
    - `config.get` 傳回目前的設定快照與雜湊值。
    - `config.set` 寫入已驗證的設定負載。
    - `config.patch` 合併部分設定更新。
    - `config.apply` 驗證並替換完整的設定負載。
    - `config.schema` 傳回控制 UI 與 CLI 工具所使用的即時設定 schema 負載：schema、`uiHints`、版本與生成元數據，包括執行時期可載入時的外掛程式與通道 schema 元數據。Schema 包含欄位 `title` / `description` 元數據，該元數據衍生自 UI 使用的相同標籤與說明文字，包括巢狀物件、萬用字元、陣列項目，以及當存在匹配欄位文件時的 `anyOf` / `oneOf` / `allOf` 組合分支。
    - `config.schema.lookup` 傳回單一設定路徑的路徑範圍查詢負載：正規化路徑、淺層 schema 節點、匹配提示 + `hintPath`，以及供 UI/CLI 使用的直接子項摘要。查詢 schema 節點會保留使用者導向文件與通用驗證欄位（`title`、`description`、`type`、`enum`、`const`、`format`、`pattern`、數值/字串/陣列/物件邊界，以及旗標如 `additionalProperties`、`deprecated`、`readOnly`、`writeOnly`）。子項摘要會公開 `key`、正規化 `path`、`type`、`required`、`hasChildren`，以及匹配的 `hint` / `hintPath`。
    - `update.run` 執行閘道更新流程，並僅在更新本身成功時排程重新啟動；擁有工作階段的呼叫者可以包含 `continuationMessage`，以便啟動透過重新啟動接續佇列回復一次後續代理程式週期。來自控制平面的套件管理員更新會使用分離的受控服務移交，而不是替換即時閘道內的套件樹。已啟動的移交會傳回 `ok: true`，包含 `result.reason: "managed-service-handoff-started"` 與 `handoff.status: "started"`；無法使用或失敗的移交會傳回 `ok: false`，包含 `managed-service-handoff-unavailable` 或 `managed-service-handoff-failed`，並在需要手動 shell 更新時加上 `handoff.command`。在已啟動的移交期間，重新啟動哨兵可能會簡短回報 `stats.reason: "restart-health-pending"`；接續作業會延遲，直到 CLI 驗證已重新啟動的閘道並寫入最終的 `ok` 哨兵。
    - `update.status` 傳回最新的快取更新重新啟動哨兵，包括可用時的重新啟動後執行版本。
    - `wizard.start`、`wizard.next`、`wizard.status` 與 `wizard.cancel` 透過 WS RPC 公開入門嚮導。

  </Accordion>

  <Accordion title="Agent and workspace helpers">
    - `agents.list` 返回已配置的代理項目，包括有效的模型和運行時元數據。
    - `agents.create`、`agents.update` 和 `agents.delete` 管理代理記錄和工作區連線。
    - `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理為代理公開的啟動工作區檔案。
    - `tasks.list`、`tasks.get` 和 `tasks.cancel` 向 SDK 和操作員客戶端公開 Gateway 任務帳本。
    - `artifacts.list`、`artifacts.get` 和 `artifacts.download` 公開針對特定 `sessionKey`、`runId` 或 `taskId` 範圍從文字記錄衍生的摘要和下載。執行和任務查詢會在伺服器端解析擁有的會話，並僅返回具有匹配來源的文字記錄媒體；不安全或本機 URL 來源會返回不支援的下載，而不是從伺服器端獲取。
    - `environments.list` 和 `environments.status` 向 SDK 客戶端公開唯讀的 Gateway 本地和節點環境探索。
    - `agent.identity.get` 返回代理或會話的有效助理身分。
    - `agent.wait` 等待執行完成並在可用時返回終端快照。

  </Accordion>

  <Accordion title="Session control">
    - `sessions.list` 會傳回目前的 session index，當配置了 agent runtime 後端時，包含逐行的 `agentRuntime` metadata。
    - `sessions.subscribe` 和 `sessions.unsubscribe` 切換目前 WS 用戶端的 session 變更事件訂閱。
    - `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 切換單一 session 的 transcript/message 事件訂閱。
    - `sessions.preview` 會傳回特定 session keys 的有限 transcript 預覽。
    - `sessions.describe` 會傳回特定 session key 的單一 Gateway session 資料列。
    - `sessions.resolve` 會解析或正規化 session 目標。
    - `sessions.create` 會建立新的 session 項目。
    - `sessions.send` 會將訊息傳送到既有的 session。
    - `sessions.steer` 是作用中 session 的中斷與導向變體。
    - `sessions.abort` 會中止 session 的進行中工作。呼叫者可以傳遞 `key` 加上選用的 `runId`，或者僅傳遞 `runId` 以針對 Gateway 可解析為 session 的進行中執行。
    - `sessions.patch` 會更新 session metadata/overrides 並回報解析出的正規模型以及有效的 `agentRuntime`。
    - `sessions.reset`、`sessions.delete` 和 `sessions.compact` 執行 session 維護作業。
    - `sessions.get` 會傳回完整的已儲存 session 資料列。
    - Chat 執行仍使用 `chat.history`、`chat.send`、`chat.abort` 和 `chat.inject`。`chat.history` 已針對 UI 用戶端進行顯示正規化：內聯指令標籤會從可見文字中移除，純文字 tool-call XML payloads（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截斷的 tool-call 區塊）以及外洩的 ASCII/全形模型控制 token 會被移除，精確的 `NO_REPLY` / `no_reply` 等純靜音 token 助理資料列會被省略，過大的資料列可以被預留位置取代。

  </Accordion>

  <Accordion title="裝置配對與裝置權杖">
    - `device.pair.list` 會傳回待處理和已批准的配對裝置。
    - `device.pair.approve`、`device.pair.reject` 和 `device.pair.remove` 管理裝置配對記錄。
    - `device.token.rotate` 會在已批准的角色和呼叫者範圍界限內輪替配對裝置權杖。
    - `device.token.revoke` 會在已批准的角色和呼叫者範圍界限內撤銷配對裝置權杖。

  </Accordion>

  <Accordion title="節點配對、呼叫與待處理工作">
    - `node.pair.request`、`node.pair.list`、`node.pair.approve`、`node.pair.reject`、`node.pair.remove` 和 `node.pair.verify` 涵蓋節點配對和啟動驗證。
    - `node.list` 和 `node.describe` 會傳回已知/已連線的節點狀態。
    - `node.rename` 會更新配對節點標籤。
    - `node.invoke` 會將指令轉發至已連線的節點。
    - `node.invoke.result` 會傳回呼叫請求的結果。
    - `node.event` 會將節點發起的事件傳回閘道。
    - `node.pending.pull` 和 `node.pending.ack` 是已連線節點的佇列 API。
    - `node.pending.enqueue` 和 `node.pending.drain` 管理離線/未連線節點的持久待處理工作。

  </Accordion>

  <Accordion title="Approval families">
    - `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和 `exec.approval.resolve` 涵蓋一次性執行審核請求以及待處理審核的查詢/重放。
    - `exec.approval.waitDecision` 等待一個待處理的執行審核並傳回最終決策（或在逾時時傳回 `null`）。
    - `exec.approvals.get` 和 `exec.approvals.set` 管理閘道執行審核原則快照。
    - `exec.approvals.node.get` 和 `exec.approvals.node.set` 透過節點中繼指令管理節點本機執行審核原則。
    - `plugin.approval.request`、`plugin.approval.list`、`plugin.approval.waitDecision` 和 `plugin.approval.resolve` 涵蓋外掛程式定義的審核流程。

  </Accordion>

  <Accordion title="Automation, skills, and tools">
    - 自動化：`wake` 排程立即或下次心跳的喚醒文字插入；`cron.get`、`cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、`cron.run` 和 `cron.runs` 管理排程工作。
    - `cron.run` 仍是用於手動執行的入列式 RPC。需要完成語意的客戶端應讀取傳回的 `runId` 並輪詢 `cron.runs`。
    - `cron.runs` 接受可選的非空 `runId` 篩選器，以便客戶端可以追蹤一個佇列中的手動執行，而不會與相同工作的其他歷史記錄項目發生競爭。
    - 技能與工具：`commands.list`、`skills.*`、`tools.catalog`、`tools.effective`、`tools.invoke`。

  </Accordion>
</AccordionGroup>

### 常見事件系列

- `chat`: UI 聊天更新，例如 `chat.inject` 和其他僅限文字記錄的聊天事件。在協議 v4 中，delta 負載攜帶 `deltaText`；`message` 保持為累積的助手快照。非前綴替換設定 `replace=true` 並使用 `deltaText` 作為替換文字。
- `session.message`、`session.operation` 和 `session.tool`：已訂閱會話的文字記錄、進行中的會話操作和事件串流更新。
- `sessions.changed`：會話索引或元資料已變更。
- `presence`：系統在場快照更新。
- `tick`：週期性保持活動 / 存活事件。
- `health`：閘道健康快照更新。
- `heartbeat`：心跳事件串流更新。
- `cron`：cron 執行/工作變更事件。
- `shutdown`：閘道關機通知。
- `node.pair.requested` / `node.pair.resolved`：節點配對生命週期。
- `node.invoke.request`：節點調用請求廣播。
- `device.pair.requested` / `device.pair.resolved`：配對裝置生命週期。
- `voicewake.changed`：喚醒詞觸發設定已變更。
- `exec.approval.requested` / `exec.approval.resolved`：執行核准生命週期。
- `plugin.approval.requested` / `plugin.approval.resolved`：外掛程式核准生命週期。

### 節點輔助方法

- 節點可以呼叫 `skills.bins` 以獲取目前的技能可執行檔清單，用於自動允許檢查。

### 任務分類帳 RPC

操作員用戶端可以透過任務分類帳 RPC 檢查並取消閘道背景任務記錄。這些方法會回傳經過清理的任務摘要，而非原始
執行時狀態。

- `tasks.list` 需要 `operator.read`。
  - 參數：可選的 `status`（`"queued"`、`"running"`、`"completed"`、
    `"failed"`、`"cancelled"` 或 `"timed_out"`）或這些狀態的陣列，
    可選的 `agentId`、可選的 `sessionKey`、從 `1` 到
    `500` 的可選 `limit`，以及可選的字串 `cursor`。
  - 結果：`{ "tasks": TaskSummary[], "nextCursor"?: string }`。
- `tasks.get` 需要 `operator.read`。
  - 參數：`{ "taskId": string }`。
  - 結果：`{ "task": TaskSummary }`。
  - 遺失的任務 id 會回傳閘道找不到的錯誤格式。
- `tasks.cancel` 需要 `operator.write`。
  - 參數：`{ "taskId": string, "reason"?: string }`。
  - 結果：
    `{ "found": boolean, "cancelled": boolean, "reason"?: string, "task"?: TaskSummary }`。
  - `found` 回報分類帳是否具有符合的任務。`cancelled`
    回報執行時期是否接受或記錄取消。

`TaskSummary` 包含 `id`、`status` 以及可選的中繼資料，例如 `kind`、
`runtime`、`title`、`agentId`、`sessionKey`、`childSessionKey`、`ownerKey`、
`runId`、`taskId`、`flowId`、`parentTaskId`、`sourceId`、時間戳記、進度、
終端摘要，以及經過清理的錯誤文字。

### 操作員輔助方法

- 操作員可以呼叫 `commands.list`（`operator.read`）來取得代理程式的
  執行時期指令清單。
  - `agentId` 是可選的；省略它以讀取預設的代理程式工作區。
  - `scope` 控制主要 `name` 的目標介面：
    - `text` 會傳回不包含前導 `/` 的主要文字指令權杖
    - 當可用時，`native` 和預設的 `both` 路徑會傳回供應商感知的原生名稱
  - `textAliases` 攜帶精確的斜線別名，例如 `/model` 和 `/m`。
  - 當存在時，`nativeName` 攜帶供應商感知的原生命令名稱。
  - `provider` 是選用的，且僅影響原生命名以及原生外掛程式命令的可用性。
  - `includeArgs=false` 會從回應中省略序列化的引數中繼資料。
- 操作者可以呼叫 `tools.catalog` (`operator.read`) 來取得代理程式的執行階段工具目錄。回應包含分組的工具和來源中繼資料：
  - `source`：`core` 或 `plugin`
  - `pluginId`：當 `source="plugin"` 時的外掛程式擁有者
  - `optional`：外掛程式工具是否為選用
- 操作者可以呼叫 `tools.effective` (`operator.read`) 來取得工作階段的執行階段有效工具清單。
  - `sessionKey` 是必需的。
  - 閘道是從伺服器端的工作階段衍生受信任的執行時期內容，而不是接受呼叫者提供的驗證或傳遞內容。
  - 回應的作用範圍限定於工作階段，並反映目前主動對話可使用的內容，包括核心、插件和頻道工具。
- 操作者可以呼叫 `tools.invoke` (`operator.write`) 透過與 `/tools/invoke` 相同的閘道原則路徑來叫用其中一個可用的工具。
  - `name` 是必需的。`args`、`sessionKey`、`agentId`、`confirm` 和 `idempotencyKey` 則是選用的。
  - 如果同時存在 `sessionKey` 和 `agentId`，解析出的工作階段代理程式必須符合 `agentId`。
  - 回應是面向 SDK 的封包，其中包含 `ok`、`toolName`、選用的 `output` 和具類型的 `error` 欄位。核准或原則拒絕會在載荷中傳回 `ok:false`，而不是繞過閘道工具原則管線。
- 操作員可以呼叫 `skills.status` (`operator.read`) 來取得代理程式的可見技能清單。
  - `agentId` 是可選的；省略它以讀取預設的代理程式工作區。
  - 回應包含資格、缺少的需求、設定檢查和經過清理的安裝選項，而不會暴露原始祕密值。
- 操作員可以呼叫 `skills.search` 和 `skills.detail` (`operator.read`) 以取得 ClawHub 探索中繼資料。
- 操作員可以呼叫 `skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit` (`operator.admin`) 以在安裝私有技能封存之前進行暫存。這是一個針對受信任用戶端的獨立管理員上傳路徑，而非一般的 ClawHub 技能安裝流程，且預設為停用，除非啟用了 `skills.install.allowUploadedArchives`。
  - `skills.upload.begin({ kind: "skill-archive", slug, sizeBytes, sha256?, force?, idempotencyKey? })` 會建立一個綁定至該 slug 和 force 值的上傳。
  - `skills.upload.chunk({ uploadId, offset, dataBase64 })` 會在精確的解碼偏移位置附加位元組。
  - `skills.upload.commit({ uploadId, sha256? })` 會驗證最終大小和 SHA-256。Commit 僅完成上傳；它不會安裝該技能。
  - 上傳的技能封存是包含 `SKILL.md` 根目錄的 zip 封存。封存的內部目錄名稱從不會選擇安裝目標。
- 操作員可以以三種模式呼叫 `skills.install` (`operator.admin`)：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 會將技能資料夾安裝到預設代理程式工作區的 `skills/` 目錄中。
  - 上傳模式：`{ source: "upload", uploadId, slug, force?, sha256?, timeoutMs? }` 會將已認可的上傳安裝到預設代理程式工作區的 `skills/<slug>` 目錄中。Slug 和 force 值必須與原始 `skills.upload.begin` 要求相符。除非啟用了 `skills.install.allowUploadedArchives`，否則此模式會被拒絕。此設定不會影響 ClawHub 安裝。
  - Gateway 安裝程式模式：`{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }` 會在 Gateway 主機上執行宣告的 `metadata.openclaw.install` 動作。
- 操作員可以以兩種模式呼叫 `skills.update` (`operator.admin`)：
  - ClawHub 模式會更新預設代理工作區中的一個追蹤 slug 或所有追蹤的 ClawHub 安裝。
  - 配置模式修補 `skills.entries.<skillKey>` 值，例如 `enabled`、
    `apiKey` 和 `env`。

### `models.list` 檢視

`models.list` 接受一個可選的 `view` 參數：

- 省略或 `"default"`：目前的執行時行為。如果配置了 `agents.defaults.models`，回應為允許的目錄，包括 `provider/*` 項目的動態發現模型。否則回應為完整的 Gateway 目錄。
- `"configured"`：選擇器大小的行為。如果配置了 `agents.defaults.models`，它仍然優先，包括 `provider/*` 項目的提供者範圍發現。如果沒有允許清單，回應使用明確的 `models.providers.*.models` 項目，僅在不存在配置的模型列時退回到完整目錄。
- `"all"`：完整的 Gateway 目錄，繞過 `agents.defaults.models`。將其用於診斷和發現 UI，而非正常的模型選擇器。

## 執行核准

- 當執行請求需要批准時，gateway 會廣播 `exec.approval.requested`。
- 操作員客戶端透過呼叫 `exec.approval.resolve` 來解決（需要 `operator.approvals` 範圍）。
- 對於 `host=node`，`exec.approval.request` 必須包含 `systemRunPlan`（標準的 `argv`/`cwd`/`rawCommand`/session 中繼資料）。缺少 `systemRunPlan` 的請求會被拒絕。
- 批准後，轉發的 `node.invoke system.run` 呼叫會重複使用該標準的
  `systemRunPlan` 作為權威的 command/cwd/session 語境。
- 如果呼叫者在準備與最終批准的 `system.run` 轉發之間變異了 `command`、`rawCommand`、`cwd`、`agentId` 或
  `sessionKey`，gateway 會拒絕該執行，而不是信任變異後的 payload。

## 代理傳遞後備

- `agent` 請求可以包含 `deliver=true` 以請求輸出投遞。
- `bestEffortDeliver=false` 保持嚴格行為：未解析或僅限內部的投遞目標會返回 `INVALID_REQUEST`。
- 當無法解析外部可投遞路由時（例如內部/網路聊天會話或模糊的多通道配置），`bestEffortDeliver=true` 允許回退到僅限會話的執行。
- 當請求投遞時，最終的 `agent` 結果可能包含 `result.deliveryStatus`，使用與 [`openclaw agent --json --deliver`](/zh-Hant/cli/agent#json-delivery-status) 中記錄的 `sent`、`suppressed`、`partial_failed` 和 `failed` 狀態相同的狀態。

## 版本控制

- `PROTOCOL_VERSION` 存在於 `src/gateway/protocol/version.ts` 中。
- 客戶端發送 `minProtocol` + `maxProtocol`；伺服器會拒絕不包含其當前協議的範圍。目前的客戶端和伺服器需要協議 v4。
- Schema + 模型是從 TypeBox 定義生成的：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### 客戶端常數

`src/gateway/client.ts` 中的參考客戶端使用這些預設值。這些值在協議 v4 中保持穩定，並且是第三方客戶端的預期基準。

| 常數                                  | 預設值                                                  | 來源                                                                            |
| ------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `PROTOCOL_VERSION`                    | `4`                                                     | `src/gateway/protocol/version.ts`                                               |
| `MIN_CLIENT_PROTOCOL_VERSION`         | `4`                                                     | `src/gateway/protocol/version.ts`                                               |
| 請求逾時（每個 RPC）                  | `30_000` 毫秒                                           | `src/gateway/client.ts` (`requestTimeoutMs`)                                    |
| 預先授權 / 連接挑戰逾時               | `15_000` 毫秒                                           | `src/gateway/handshake-timeouts.ts`（配置/環境可以提高配對的伺服器/客戶端預算） |
| 初始重新連線退避                      | `1_000` 毫秒                                            | `src/gateway/client.ts` (`backoffMs`)                                           |
| 最大重新連線退避                      | `30_000` 毫秒                                           | `src/gateway/client.ts` (`scheduleReconnect`)                                   |
| 裝置權杖關閉後的快速重試限制          | `250` 毫秒                                              | `src/gateway/client.ts`                                                         |
| 在 `terminate()` 之前的強制停止寬限期 | `250` 毫秒                                              | `FORCE_STOP_TERMINATE_GRACE_MS`                                                 |
| `stopAndWait()` 預設逾時              | `1_000` 毫秒                                            | `STOP_AND_WAIT_TIMEOUT_MS`                                                      |
| 預設 tick 間隔（pre `hello-ok`）      | `30_000` 毫秒                                           | `src/gateway/client.ts`                                                         |
| Tick 逾時關閉                         | 當靜默時間超過 `tickIntervalMs * 2` 時回傳程式碼 `4000` | `src/gateway/client.ts`                                                         |
| `MAX_PAYLOAD_BYTES`                   | `25 * 1024 * 1024` (25 MB)                              | `src/gateway/server-constants.ts`                                               |

伺服器會在 `hello-ok` 中公告有效的 `policy.tickIntervalMs`、`policy.maxPayload`
與 `policy.maxBufferedBytes`；客戶端應遵守這些數值，
而非握手前的預設值。

## 認證

- 共享金鑰的 Gateway 驗證會根據設定的驗證模式使用 `connect.params.auth.token` 或
  `connect.params.auth.password`。
- 承載身分的模式，例如 Tailscale Serve
  (`gateway.auth.allowTailscale: true`) 或非 loopback
  `gateway.auth.mode: "trusted-proxy"`，會改從請求標頭滿足連線驗證檢查，
  而非使用 `connect.params.auth.*`。
- Private-ingress `gateway.auth.mode: "none"` 會完全跳過共享金鑰的連線驗證；
  請勿在公開或不受信任的入口上公開該模式。
- 配對後，Gateway 會發出一個範圍限定於連線
  角色 + scopes 的 **裝置權杖 (device token)**。它會在 `hello-ok.auth.deviceToken` 中回傳，並且應由
  客戶端保存以供未來連線使用。
- 客戶端應在每次
  成功連線後保存主要的 `hello-ok.auth.deviceToken`。
- 使用該 **已儲存** 的裝置權杖重新連線時，也應重複使用為該權杖儲存的已批准範圍集合。
  這樣可保留已授予的讀取/探測/狀態存取權，並避免無聲地將重新連線收窄為較狹隘的隱含僅限管理員範圍。
- 客戶端連線驗證組裝（`selectConnectAuth` 位於
  `src/gateway/client.ts`）：
  - `auth.password` 是正交的，當設定時一律會被轉送。
  - `auth.token` 會按優先順序填入：優先使用明確的共享權杖，
    然後是明確的 `deviceToken`，接著是儲存的每裝置權杖（以
    `deviceId` + `role` 作為鍵值）。
  - 僅當上述方法均未解析出 `auth.token` 時，才會發送 `auth.bootstrapToken`。共享令牌或任何已解析的裝置令牌將抑制其發送。
  - 在一次性 `AUTH_TOKEN_MISMATCH` 重試上，對儲存的裝置令牌進行自動提升僅限於**受信任的端點**——回環地址，或具有固定 `tlsFingerprint` 的 `wss://`。未進行固定的公用 `wss://` 不符合條件。
- 內建的設置代碼啟動僅返回主要節點 `hello-ok.auth.deviceToken`；客戶端不得期望在 `hello-ok.auth.deviceTokens` 中有額外的操作員令牌。
- 當內建設置代碼啟動正在等待批准時，`PAIRING_REQUIRED` 詳細資訊包括 `recommendedNextStep: "wait_then_retry"`、`retryable: true` 和 `pauseReconnect: false`。客戶端應使用相同的啟動令牌保持重新連接，直到請求被批准或令牌變得無效。
- 如果較舊或自定義的受信任啟動流程包含可選的 `hello-ok.auth.deviceTokens` 條目，僅當連接在受信任的傳輸（例如 `wss://` 或回環/本機配對）上使用了啟動身份驗證時，才會保存這些條目。
- 如果客戶端提供了**明確的** `deviceToken` 或明確的 `scopes`，該呼叫者請求的範圍集將保持權威性；僅當客戶端正在重用儲存的每裝置令牌時，才會重用快取的範圍。
- 裝置令牌可以透過 `device.token.rotate` 和 `device.token.revoke` 輪換/撤銷（需要 `operator.pairing` 範圍）。
- `device.token.rotate` 返回輪換元資料。它僅對已使用該裝置令牌進行身份驗證的同裝置呼叫回顧替換持有人令牌，因此僅令牌客戶端可以在重新連接之前保存其替換令牌。共享/管理員輪換不會回顧持有人令牌。
- 令牌的簽發、輪換和撤銷仍受限於記錄在該裝置配對條目中的批准角色集；令牌變更無法擴展或針對配對批准從未授予的裝置角色。
- 對於配對裝置 token 工作階段，除非呼叫者也具有 `operator.admin`，否則裝置管理範圍僅限自身：非管理員呼叫者只能移除/撤銷/輪換其**自己**的裝置項目。
- `device.token.rotate` 和 `device.token.revoke` 也會根據呼叫者目前的工作階段範圍檢查目標操作員 token 範圍集合。非管理員呼叫者無法輪換或撤銷比其目前持有範圍更廣的操作員 token。
- 驗證失敗包含 `error.details.code` 以及修復提示：
  - `error.details.canRetryWithDeviceToken` (布林值)
  - `error.details.recommendedNextStep` (`retry_with_device_token`、`update_auth_configuration`、`update_auth_credentials`、`wait_then_retry`、`review_auth_configuration`)
- 針對 `AUTH_TOKEN_MISMATCH` 的客戶端行為：
  - 受信任的客戶端可以使用快取的每裝置 token 嘗試一次有限的重新連線。
  - 如果該重試失敗，客戶端應停止自動重新連線迴圈，並向操作員顯示操作指引。
- `AUTH_SCOPE_MISMATCH` 表示裝置 token 已被識別，但不涵蓋請求的角色/範圍。客戶端不應將此顯示為錯誤的 token；應提示操作員重新配對或批准更窄/更廣的範圍合約。

## 裝置身分 + 配對

- 節點應包含源自金鑰對指紋的穩定裝置身分 (`device.id`)。
- 閘道會針對每個裝置與角色發行 token。
- 除非啟用了本機自動核准，否則新的裝置 ID 需要配對核准。
- 配對自動核准以直接本機回送連線為中心。
- OpenClaw 也具有一個狹窄的後端/容器本機自我連線路徑，用於受信任的共享金鑰輔助流程。
- 相同主機的 tailnet 或 LAN 連線在配對時仍會被視為遠端連線，並需要核准。
- WS 客戶端通常會在 `connect` 期間 (操作員 + 節點) 包含 `device` 身分。唯一無裝置的操作員例外是明確的信任路徑：
  - `gateway.controlUi.allowInsecureAuth=true` 用於僅限本機主機的不安全 HTTP 相容性。
  - 成功的 `gateway.auth.mode: "trusted-proxy"` 操作員控制 UI 驗證。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (緊急破窗，嚴重的安全性降級)。
  - 使用共享的 gateway token/password 進行驗證的直接回送 `gateway-client` 後端 RPC。
- 所有連線必須對伺服器提供的 `connect.challenge` nonce 進行簽署。

### 裝置驗證遷移診斷

對於仍使用預先挑戰簽署行為的舊版客戶端，`connect` 現在會在 `error.details.code` 下傳回具有穩定 `error.details.reason` 的 `DEVICE_AUTH_*` 詳細代碼。

常見的遷移失敗：

| 訊息                        | details.code                     | details.reason           | 含義                                        |
| --------------------------- | -------------------------------- | ------------------------ | ------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客戶端省略了 `device.nonce`（或發送空白）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客戶端使用了過時/錯誤的 nonce 進行簽署。    |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 簽署內容與 v2 payload 不符。                |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 簽署的時間戳記超出允許的偏移範圍。          |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 與公鑰指紋不符。                |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公鑰格式/正規化失敗。                       |

遷移目標：

- 始終等待 `connect.challenge`。
- 簽署包含伺服器 nonce 的 v2 payload。
- 在 `connect.params.device.nonce` 中發送相同的 nonce。
- 首選的簽署內容是 `v3`，它除了裝置/客戶端/角色/範圍/token/nonce 欄位外，還綁定了 `platform` 和 `deviceFamily`。
- 舊版 `v2` 簽署為了相容性仍被接受，但在重新連線時，配對裝置的中繼資料固定仍控制指令策略。

## TLS + 憑證固定

- WS 連線支援 TLS。
- 用戶端可選擇性固定閘道憑證指紋（請參閱 `gateway.tls`
  配置加上 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 範圍

此通訊協定公開了**完整的閘道 API**（狀態、頻道、模型、聊天、
代理、工作階段、節點、審核等）。確切的介面由 `src/gateway/protocol/schema.ts` 中的 TypeBox 綱要定義。

## 相關

- [橋接協定](/zh-Hant/gateway/bridge-protocol)
- [閘道操作手冊](/zh-Hant/gateway)
