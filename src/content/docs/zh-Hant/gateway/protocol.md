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

內建的 QR/設定碼啟動是一個全新的移動裝置移交途徑。成功的基準設定碼連線會返回一個主要節點權杖加上一個受限的操作員權杖：

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
        "scopes": ["operator.approvals", "operator.read", "operator.write"]
      }
    ]
  }
}
```

操作員移交是有意受限的，以便 QR 入職可以在未授予 `operator.admin`、`operator.pairing` 或
`operator.talk.secrets` 的情況下啟動移動操作員迴圈。這些範圍需要單獨的已批准操作員配對或權杖流程。只有在連線使用了受信任傳輸（例如 `wss://` 或
迴路/本機配對）上的啟動認證時，客戶端才應該保存 `hello-ok.auth.deviceTokens`。

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

有關完整的操作員範圍模型、批准時間檢查和共享密語語義，請參閱 [操作員範圍](/zh-Hant/gateway/operator-scopes)。

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

帶有 `includeSecrets: true` 的 `talk.config` 需要 `operator.talk.secrets`
（或 `operator.admin`）。

外掛程式註冊的閘道 RPC 方法可以請求自己的操作員範圍，但保留的核心管理前綴（`config.*`、`exec.approvals.*`、`wizard.*`、
`update.*`）始終解析為 `operator.admin`。

方法範圍只是第一道關卡。透過 `chat.send` 到達的某些斜線指令會在其之上套用更嚴格的指令級別檢查。例如，持續性 `/config set` 和 `/config unset` 寫入需要 `operator.admin`。

`node.pair.approve` 除了基本方法範圍外，還有一個額外的批准時間範圍檢查：

- 無指令請求：`operator.pairing`
- 包含非執行節點指令的請求：`operator.pairing` + `operator.write`
- 包含 `system.run`、`system.run.prepare` 或 `system.which` 的請求：
  `operator.pairing` + `operator.admin`

### Caps/commands/permissions (node)

節點會在連線時宣告能力聲明：

- `caps`：高層級功能類別，例如 `camera`、`canvas`、`screen`、
  `location`、`voice` 和 `talk`。
- `commands`：用於調用的指令允許清單。
- `permissions`：細粒度切換（例如 `screen.record`、`camera.capture`）。

Gateway 將這些視為 **聲明** 並強制執行伺服器端允許清單。

## Presence

- `system-presence` 返回以裝置身分為鍵的項目。
- Presence 項目包含 `deviceId`、`roles` 和 `scopes`，以便 UI 即使在裝置同時作為 **operator** 和 **node** 連線時，也能為每個裝置顯示單一行。
- `node.list` 包含可選的 `lastSeenAtMs` 和 `lastSeenReason` 欄位。已連線的節點將其當前連線時間報告為 `lastSeenAtMs` 並帶有原因 `connect`；當受信任節點事件更新其配對元資料時，配對的節點也可以報告持久的背景存在狀態。

### 節點背景在線事件

節點可以呼叫 `node.event` 並使用 `event: "node.presence.alive"` 來記錄配對節點在背景喚醒期間處於存活狀態，而無需將其標記為已連線。

```json
{
  "event": "node.presence.alive",
  "payloadJSON": "{\"trigger\":\"silent_push\",\"sentAtMs\":1737264000000,\"displayName\":\"Peter's iPhone\",\"version\":\"2026.4.28\",\"platform\":\"iOS 18.4.0\",\"deviceFamily\":\"iPhone\",\"modelIdentifier\":\"iPhone17,1\",\"pushTransport\":\"relay\"}"
}
```

`trigger` 是一個封閉式枚舉：`background`、`silent_push`、`bg_app_refresh`、
`significant_location`、`manual` 或 `connect`。未知的觸發字串會在持久化之前由閘道正規化為
`background`。該事件僅對已驗證的節點裝置會話持久化；無裝置或未配對的會話會返回 `handled: false`。

成功的閘道會傳回結構化結果：

```json
{
  "ok": true,
  "event": "node.presence.alive",
  "handled": true,
  "reason": "persisted"
}
```

較舊的 Gateway 可能仍會針對 `node.event` 傳回 `{ "ok": true }`；客戶端應將其視為已確認的 RPC，而非持久的存在狀態儲存。

## 廣播事件範圍

伺服器推送的 WebSocket 廣播事件會受到範圍限制，因此僅限配對範圍或僅限節點的會話不會被動接收會話內容。

- **聊天、代理和工具結果幀**（包括串流 `agent` 事件和工具呼叫結果）至少需要 `operator.read`。沒有 `operator.read` 的作業階段會完全略過這些幀。
- **外掛定義的 `plugin.*` 廣播**會限制為 `operator.write` 或 `operator.admin`，具體取決於外掛如何註冊它們。
- **狀態和傳輸事件**（`heartbeat`、`presence`、`tick`、連線/中斷連線生命週期等）保持無限制，以便每個已驗證的作業階段都能觀察到傳輸的健康狀況。
- **未知的廣播事件系列** 預設受範圍限制（預設拒絕），除非已註冊的處理程序明確放寬限制。

每個客戶端連接都會維護自己的每個客戶端序列號，因此即使不同的客戶端看到經過範圍過濾的事件流子集不同，廣播也能在該 socket 上保持單調排序。

## 常見的 RPC 方法系列

公開 WS 介面比上述握手/驗證範例更廣泛。這並非生成的傾印——`hello-ok.features.methods` 是一份保守的探索清單，建構自 `src/gateway/server-methods-list.ts` 加上已載入的外掛/通道方法匯出。請將其視為功能探索，而非 `src/gateway/server-methods/*.ts` 的完整列舉。

<AccordionGroup>
  <Accordion title="System and identity">
    - `health` 返回快取或新探測的閘道器健康快照。
    - `diagnostics.stability` 返回最近的有限診斷穩定性記錄器。它保留操作元數據，例如事件名稱、計數、位元組大小、內存讀數、佇列/會話狀態、通道/外掛名稱和會話 ID。它不保留聊天文字、Webhook 內文、工具輸出、原始請求或回應內文、Token、Cookie 或機密值。需要操作員讀取權限。
    - `status` 返回 `/status` 風格的閘道器摘要；敏感欄位僅包含在具有管理員範圍的操作員客戶端中。
    - `gateway.identity.get` 返回中繼和配對流程使用的閘道器裝置身分。
    - `system-presence` 返回已連線操作員/節點裝置的目前存在快照。
    - `system-event` 附加系統事件並可以更新/廣播存在上下文。
    - `last-heartbeat` 返回最新持久化的心跳事件。
    - `set-heartbeats` 切換閘道器上的心跳處理。

  </Accordion>

  <Accordion title="Models and usage">
    - `models.list` 返回運行時允許的模型目錄。傳遞 `{ "view": "configured" }` 以獲取選擇器大小的已配置模型（先 `agents.defaults.models`，然後 `models.providers.*.models`），或傳遞 `{ "view": "all" }` 以獲取完整目錄。
    - `usage.status` 返回提供者使用量視窗/剩餘配額摘要。
    - `usage.cost` 返回日期範圍內的彙總成本使用量摘要。
    - `doctor.memory.status` 返回活動預設代理工作區的向量記憶體/快取嵌入就緒狀態。僅當呼叫者明確需要即時嵌入提供者 ping 時，才傳遞 `{ "probe": true }` 或 `{ "deep": true }`。
    - `doctor.memory.remHarness` 返回給遠端控制平面客戶端的有界唯讀 REM 預覽。它可能包含工作區路徑、記憶體片段、渲染的落地 markdown 和深度升級候選項，因此呼叫者需要 `operator.read`。
    - `sessions.usage` 返回每個工作階段的使用量摘要。
    - `sessions.usage.timeseries` 返回單一工作階段的時間序列使用量。
    - `sessions.usage.logs` 返回單一工作階段的使用量記錄條目。

  </Accordion>

  <Accordion title="Channels and login helpers">
    - `channels.status` 返回內建 + 捆綁的頻道/外掛狀態摘要。
    - `channels.logout` 登出支援登出的特定頻道/帳戶。
    - `web.login.start` 為當前支援 QR 的網頁頻道提供者啟動 QR/網頁登入流程。
    - `web.login.wait` 等待該 QR/網頁登入流程完成，並在成功時啟動頻道。
    - `push.test` 向已註冊的 iOS 節點發送測試 APNs 推送。
    - `voicewake.get` 返回儲存的喚醒詞觸發器。
    - `voicewake.set` 更新喚醒詞觸發器並廣播變更。

  </Accordion>

  <Accordion title="Messaging and logs">
    - `send` 是聊天執行器之外，針對頻道/帳號/主題目標發送的直接傳出傳遞 RPC。
    - `logs.tail` 返回已設定的網關檔案日誌尾部，並提供游標/限制和最大位元組控制。

  </Accordion>

  <Accordion title="Talk and TTS">
    - `talk.catalog` 傳回語音、串流轉錄即時語音的唯讀 Talk 提供者目錄。它包含提供者 ID、標籤、已配置的狀態、公開的模型/語音 ID、標準模式、傳輸、腦策略，以及即時音訊/能力旗標，但不會傳回提供者機密或修改全域配置。
    - `talk.config` 傳回有效的 Talk 配置載荷；`includeSecrets` 需要 `operator.talk.secrets` (或 `operator.admin`)。
    - `talk.session.create` 為 `realtime/gateway-relay`、`transcription/gateway-relay` 或 `stt-tts/managed-room` 建立一個 Gateway 擁有的 Talk 會話。對於 `stt-tts/managed-room`，傳遞 `sessionKey` 的 `operator.write` 呼叫者還必須傳遞 `spawnedBy` 以取得限定範圍的會話金鑰可見性；未限定範圍的 `sessionKey` 建立和 `brain: "direct-tools"` 需要 `operator.admin`。
    - `talk.session.join` 驗證受管理房間會話權杖，視需要發出 `session.ready` 或 `session.replaced` 事件，並傳回房間/會該元資料以及最近的 Talk 事件，但不包含明文權杖或儲存的權杖雜湊。
    - `talk.session.appendAudio` 將 base64 PCM 輸入音訊附加到 Gateway 擁有的即時轉送和轉錄會話。
    - `talk.session.startTurn`、`talk.session.endTurn` 和 `talk.session.cancelTurn` 驅動受管理房間的輪次生命週期，並在狀態清除前拒絕過時的輪次。
    - `talk.session.cancelOutput` 停止助手音訊輸出，主要用於 Gateway 轉送會話中的 VAD 閘控插話。
    - `talk.session.submitToolResult` 完成 Gateway 擁有的即時轉送會話發出的提供者工具呼叫。當最終結果隨後到來時，傳遞 `options: { willContinue: true }` 以取得臨時工具輸出；或者當工具結果應滿足提供者呼叫而不啟動另一個即時助手回應時，傳遞 `options: { suppressResponse: true }`。
    - `talk.session.close` 關閉 Gateway 擁有的轉送、轉錄或受管理房間會話，並發出終端 Talk 事件。
    - `talk.mode` 設定/廣播 WebChat/Control UI 用戶端的目前 Talk 模式狀態。
    - `talk.client.create` 使用 `webrtc` 或 `provider-websocket` 建立用戶端擁有的即時提供者會話，同時 Gateway 擁有配置、憑證、指示和工具政策。
    - `talk.client.toolCall` 讓用戶端擁有的即時傳輸將提供者工具呼叫轉發到 Gateway 政策。第一個受支援的工具是 `openclaw_agent_consult`；用戶端會收到一個執行 ID，並在提交提供者特定的工具結果之前等待正常的聊天生命週期事件。
    - `talk.event` 是即時、轉錄、STT/TTS、受管理房間、電話和會議配接器的單一 Talk 事件通道。
    - `talk.speak` 透過作用中的 Talk 語音提供者合成語音。
    - `tts.status` 傳回 TTS 啟用狀態、作用中提供者、後備提供者和提供者配置狀態。
    - `tts.providers` 傳回可見的 TTS 提供者清單。
    - `tts.enable` 和 `tts.disable` 切換 TTS 偏好狀態。
    - `tts.setProvider` 更新首選的 TTS 提供者。
    - `tts.convert` 執行一次性文字轉語音轉換。

  </Accordion>

  <Accordion title="秘密、配置、更新和嚮導">
    - `secrets.reload` 重新解析作用中的 SecretRefs，並僅在完全成功時交換執行時期秘密狀態。
    - `secrets.resolve` 解析特定指令/目標集的指令目標秘密分配。
    - `config.get` 傳回目前的配置快照和雜湊值。
    - `config.set` 寫入經過驗證的配置載荷。
    - `config.patch` 合併部分配置更新。
    - `config.apply` 驗證並取代完整的配置載荷。
    - `config.schema` 傳回 Control UI 和 CLI 工具所使用的即時配置 Schema 載荷：Schema、`uiHints`、版本和生成元數據，包括當執行時期能夠載入時的外掛程式 + 通道 Schema 元數據。Schema 包含從 UI 使用的相同標籤和說明文字衍生的欄位 `title` / `description` 元數據，包括當存在相符欄位文件時的巢狀物件、萬用字元、陣列項目以及 `anyOf` / `oneOf` / `allOf` 組合分支。
    - `config.schema.lookup` 傳回單一配置路徑的路徑範圍查詢載荷：正規化路徑、淺層 Schema 節點、相符提示 + `hintPath`、選用 `reloadKind`，以及用於 UI/CLI 鑽取的直接子項摘要。`reloadKind` 是 `restart`、`hot` 或 `none` 其中之一，並映射所請求路徑的 Gateway 配置重新載入規劃器。查詢 Schema 節點保留面向使用者的文件和常見驗證欄位 (`title`、`description`、`type`、`enum`、`const`、`format`、`pattern`、數值/字串/陣列/物件邊界，以及類似 `additionalProperties`、`deprecated`、`readOnly`、`writeOnly` 的旗標)。子項摘要公開 `key`、正規化 `path`、`type`、`required`、`hasChildren`、選用 `reloadKind`，以及相符的 `hint` / `hintPath`。
    - `update.run` 執行 Gateway 更新流程，並僅在更新本身成功時安排重新啟動；具有會話的呼叫者可以包含 `continuationMessage`，以便啟動透過重新啟動延續佇列恢復一個後續代理程式週期。來自控制平面的套件管理員更新使用分離式受管理服務移交，而不是取代即時 Gateway 內部的套件樹。已啟動的移交會傳回 `ok: true` 以及 `result.reason: "managed-service-handoff-started"` 和 `handoff.status: "started"`；無法使用或失敗的移交會傳回 `ok: false` 以及 `managed-service-handoff-unavailable` 或 `managed-service-handoff-failed`，加上當需要手動 Shell 更新時的 `handoff.command`。在已啟動的移交期間，重新啟動哨兵可能會簡短回報 `stats.reason: "restart-health-pending"`；延續會延遲直到 CLI 驗證已重新啟動的 Gateway 並寫入最終 `ok` 哨兵。
    - `update.status` 傳回最新的快取更新重新啟動哨兵，包括可用時的重新啟動後執行版本。
    - `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 透過 WS RPC 公開入門嚮導。

  </Accordion>

  <Accordion title="Agent and workspace helpers">
    - `agents.list` 返回已配置的代理條目，包括有效的模型和運行時元數據。
    - `agents.create`、`agents.update` 和 `agents.delete` 管理代理記錄和工作區連線。
    - `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理為代理公開的引導工作區檔案。
    - `tasks.list`、`tasks.get` 和 `tasks.cancel` 向 SDK 和操作員用戶端公開 Gateway 任務帳本。
    - `artifacts.list`、`artifacts.get` 和 `artifacts.download` 公開針對顯式 `sessionKey`、`runId` 或 `taskId` 範圍的、源自文字記錄的成品摘要和下載。運行和任務查詢會在伺服器端解析擁有會話，並僅返回具有匹配來源的文字記錄媒體；不安全或本地 URL 來源將返回不支援的下載，而不是從伺服器端獲取。
    - `environments.list` 和 `environments.status` 向 SDK 用戶端公開唯讀的 Gateway 本地和節點環境探索功能。
    - `agent.identity.get` 返回代理或會話的有效助理身分。
    - `agent.wait` 等待運行完成，並在可用時返回終端快照。

  </Accordion>

  <Accordion title="會話控制">
    - `sessions.list` 會傳回目前的會話索引，當配置了 agent runtime 後端時，包含逐列的 `agentRuntime` 中繼資料。
    - `sessions.subscribe` 和 `sessions.unsubscribe` 切換目前 WS 用戶端的會話變更事件訂閱。
    - `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 切換單一會話的逐字稿/訊息事件訂閱。
    - `sessions.preview` 會傳回特定會話金鑰的有限逐字稿預覽。
    - `sessions.describe` 會為精確的會話金鑰傳回一個 Gateway 會話資料列。
    - `sessions.resolve` 會解析或標準化會話目標。
    - `sessions.create` 會建立新的會話項目。
    - `sessions.send` 會將訊息傳送到現有的會話中。
    - `sessions.steer` 是作用中會話的「中斷並引導」變體。
    - `sessions.abort` 會中止會話的進行中工作。呼叫者可以傳遞 `key` 加上選用的 `runId`，或是單獨傳遞 `runId` 以供 Gateway 解析為會話的作用中執行。
    - `sessions.patch` 會更新會話中繼資料/覆寫值，並回報解析出的標準模型以及有效的 `agentRuntime`。
    - `sessions.reset`、`sessions.delete` 和 `sessions.compact` 執行會話維護。
    - `sessions.get` 會傳回完整的已儲存會話資料列。
    - 聊天執行仍然使用 `chat.history`、`chat.send`、`chat.abort` 和 `chat.inject`。`chat.history` 針對 UI 用戶端已進行顯示正規化：內聯指令標籤會從可見文字中移除，純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及截斷的工具呼叫區塊）與外洩的 ASCII/全形模型控制權杖都會被移除，純靜音權杖助手資料列（例如精確的 `NO_REPLY` / `no_reply`）會被省略，過大的資料列可以由預留位置取代。

  </Accordion>

  <Accordion title="裝置配對與裝置權杖">
    - `device.pair.list` 傳回待處理與已核准的配對裝置。
    - `device.pair.approve`、`device.pair.reject` 與 `device.pair.remove` 管理裝置配對記錄。
    - `device.token.rotate` 在已核准的角色與呼叫者範圍界限內輪替配對裝置權杖。
    - `device.token.revoke` 在已核准的角色與呼叫者範圍界限內撤銷配對裝置權杖。

  </Accordion>

  <Accordion title="節點配對、叫用與待處理工作">
    - `node.pair.request`、`node.pair.list`、`node.pair.approve`、`node.pair.reject`、`node.pair.remove` 與 `node.pair.verify` 涵蓋節點配對與啟動驗證。
    - `node.list` 與 `node.describe` 傳回已知/已連線節點狀態。
    - `node.rename` 更新配對節點標籤。
    - `node.invoke` 將指令轉發至已連線節點。
    - `node.invoke.result` 傳回叫用請求的結果。
    - `node.event` 將節點產生的事件帶回閘道。
    - `node.pending.pull` 與 `node.pending.ack` 為已連線節點的佇列 API。
    - `node.pending.enqueue` 與 `node.pending.drain` 管理離線/未連線節點的持續性待處理工作。

  </Accordion>

  <Accordion title="核准系列">
    - `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和 `exec.approval.resolve` 涵蓋一次性執行核准請求以及待處理核准的查詢/重放。
    - `exec.approval.waitDecision` 等待一個待處理的執行核准並傳回最終決定（或在逾時時傳回 `null`）。
    - `exec.approvals.get` 和 `exec.approvals.set` 管理閘道執行原則快照。
    - `exec.approvals.node.get` 和 `exec.approvals.node.set` 透過節點中繼指令管理節點本地的執行核准原則。
    - `plugin.approval.request`、`plugin.approval.list`、`plugin.approval.waitDecision` 和 `plugin.approval.resolve` 涵蓋外掛程式定義的核准流程。

  </Accordion>

  <Accordion title="自動化、技能和工具">
    - 自動化：`wake` 排定立即或下一次心跳喚醒的文字注入；`cron.get`、`cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、`cron.run` 和 `cron.runs` 管理排程工作。
    - `cron.run` 仍是手動執行的佇列式 RPC。需要完成語意的客戶端應讀取傳回的 `runId` 並輪詢 `cron.runs`。
    - `cron.runs` 接受可選的非空 `runId` 篩選器，因此客戶端可以追蹤一個佇列的手動執行，而不會與同一工作的其他歷史記錄項目發生競爭。
    - 技能和工具：`commands.list`、`skills.*`、`tools.catalog`、`tools.effective`、`tools.invoke`。

  </Accordion>
</AccordionGroup>

### 常見事件系列

- `chat`: UI 聊天更新，例如 `chat.inject` 和其他僅限文字記錄的聊天事件。在協議 v4 中，增量負載攜帶 `deltaText`；`message` 保持為累積的助手快照。非前綴替換會設定 `replace=true` 並使用 `deltaText` 作為替換文字。
- `session.message`、`session.operation` 和 `session.tool`: 已訂閱會話的文字記錄、進行中的會話操作以及事件串流更新。
- `sessions.changed`: 會話索引或中繼資料已變更。
- `presence`: 系統在場快照更新。
- `tick`: 定期保持連線 / 存活事件。
- `health`: 閘道健康快照更新。
- `heartbeat`: 心跳事件串流更新。
- `cron`: cron 執行/工作變更事件。
- `shutdown`: 閘道關閉通知。
- `node.pair.requested` / `node.pair.resolved`: 節點配對生命週期。
- `node.invoke.request`: 節點調用請求廣播。
- `device.pair.requested` / `device.pair.resolved`: 已配對裝置生命週期。
- `voicewake.changed`: 喚醒詞觸發設定已變更。
- `exec.approval.requested` / `exec.approval.resolved`: 執行審核
  生命週期。
- `plugin.approval.requested` / `plugin.approval.resolved`: 外掛程式審核
  生命週期。

### 節點輔助方法

- 節點可以呼叫 `skills.bins` 來取得目前的技能可執行檔清單，以進行自動允許檢查。

### 任務分類帳 RPC

操作員用戶端可以透過任務分類帳 RPC 檢查並取消閘道背景任務記錄。這些方法會回傳經過清理的任務摘要，而非原始
執行時狀態。

- `tasks.list` 需要 `operator.read`。
  - Params：可選的 `status` (`"queued"`、`"running"`、`"completed"`、
    `"failed"`、`"cancelled"` 或 `"timed_out"`) 或這些狀態的陣列、
    可選的 `agentId`、可選的 `sessionKey`、從 `1` 到
    `500` 的可選 `limit`，以及可選字串 `cursor`。
  - Result：`{ "tasks": TaskSummary[], "nextCursor"?: string }`。
- `tasks.get` 需要 `operator.read`。
  - Params：`{ "taskId": string }`。
  - Result：`{ "task": TaskSummary }`。
  - 遺失的任務 id 會回傳閘道找不到的錯誤格式。
- `tasks.cancel` 需要 `operator.write`。
  - Params：`{ "taskId": string, "reason"?: string }`。
  - Result：
    `{ "found": boolean, "cancelled": boolean, "reason"?: string, "task"?: TaskSummary }`。
  - `found` 回報帳本是否有符合的任務。`cancelled`
    回報執行時是否接受或記錄取消。

`TaskSummary` 包含 `id`、`status` 和可選的中繼資料，例如 `kind`、
`runtime`、`title`、`agentId`、`sessionKey`、`childSessionKey`、`ownerKey`、
`runId`、`taskId`、`flowId`、`parentTaskId`、`sourceId`、時間戳記、進度、
終端摘要和已清理的錯誤文字。

### 操作員輔助方法

- 操作員可以呼叫 `commands.list` (`operator.read`) 來取得代理的
  執行時命令清單。
  - `agentId` 是可選的；省略它以讀取預設的代理工作區。
  - `scope` 控制主要 `name` 的目標介面：
    - `text` 回傳不帶開頭 `/` 的主要文字命令權杖
    - `native` 和預設的 `both` 路徑會在可用時傳回供應商感知的原生名稱
  - `textAliases` 包含精確的斜線別名，例如 `/model` 和 `/m`。
  - `nativeName` 在存在時會包含供應商感知的原生命令名稱。
  - `provider` 是可選的，且僅影響原生命名以及原生外掛命令的可用性。
  - `includeArgs=false` 會從回應中省略序列化的引數元資料。
- 操作員可以呼叫 `tools.catalog` (`operator.read`) 來取得代理程式的執行時期工具目錄。回應包含分組的工具和來源元資料：
  - `source`：`core` 或 `plugin`
  - `pluginId`：當為 `source="plugin"` 時的外掛擁有者
  - `optional`：外掛工具是否為可選
- 操作員可以呼叫 `tools.effective` (`operator.read`) 來取得工作階段的執行時期有效工具清單。
  - `sessionKey` 是必需的。
  - 閘道是從伺服器端的工作階段衍生受信任的執行時期內容，而不是接受呼叫者提供的驗證或傳遞內容。
  - 回應的作用範圍限定於工作階段，並反映目前主動對話可使用的內容，包括核心、插件和頻道工具。
- 操作員可以呼叫 `tools.invoke` (`operator.write`) 透過與 `/tools/invoke` 相同的閘道原則路徑來叫用一個可用的工具。
  - `name` 是必需的。`args`、`sessionKey`、`agentId`、`confirm` 和 `idempotencyKey` 是可選的。
  - 如果同時存在 `sessionKey` 和 `agentId`，解析出的工作階段代理程式必須符合 `agentId`。
  - 回應是一個 SDK 面向的封套，包含 `ok`、`toolName`、可選的 `output` 和類型化的 `error` 欄位。核准或原則拒絕會在 Payload 中傳回 `ok:false`，而不是繞過閘道工具原則管線。
- 操作員可以呼叫 `skills.status` (`operator.read`) 來取得代理程式的可見技能清單。
  - `agentId` 是選填的；省略它以讀取預設的代理程式工作區。
  - 回應包含資格、缺少的需求、設定檢查和經過清理的安裝選項，而不會暴露原始祕密值。
- 操作員可以呼叫 `skills.search` 和 `skills.detail` (`operator.read`) 以取得 ClawHub 探索中繼資料。
- 操作員可以呼叫 `skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit` (`operator.admin`) 來在安裝私人技能封存前進行暫存。這是一條供受信任用戶端使用的獨立管理員上傳路徑，而非一般的 ClawHub 技能安裝流程，且預設為停用，除非啟用了 `skills.install.allowUploadedArchives`。
  - `skills.upload.begin({ kind: "skill-archive", slug, sizeBytes, sha256?, force?, idempotencyKey? })` 會建立一個綁定至該 slug 和 force 值的上傳。
  - `skills.upload.chunk({ uploadId, offset, dataBase64 })` 會在確切的解碼偏移量附加位元組。
  - `skills.upload.commit({ uploadId, sha256? })` 會驗證最終大小和 SHA-256。Commit 僅完成上傳；它不會安裝技能。
  - 上傳的技能封存是包含 `SKILL.md` 根目錄的 zip 封存。封存內部的目錄名稱從不會選擇安裝目標。
- 操作員可以三種模式呼叫 `skills.install` (`operator.admin`)：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 會將技能資料夾安裝至預設的代理程式工作區 `skills/` 目錄。
  - 上傳模式：`{ source: "upload", uploadId, slug, force?, sha256?, timeoutMs? }` 會將已提交的上傳安裝至預設的代理程式工作區 `skills/<slug>` 目錄。Slug 和 force 值必須符合原始 `skills.upload.begin` 請求。除非啟用了 `skills.install.allowUploadedArchives`，否則會拒絕此模式。此設定不會影響 ClawHub 安裝。
  - Gateway 安裝程式模式：`{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }` 會在 Gateway 主機上執行宣告的 `metadata.openclaw.install` 動作。
- 操作員可以兩種模式呼叫 `skills.update` (`operator.admin`)：
  - ClawHub 模式會更新預設代理工作區中的一個追蹤 slug 或所有追蹤的 ClawHub 安裝。
  - Config mode 會修補 `skills.entries.<skillKey>` 值，例如 `enabled`、
    `apiKey` 和 `env`。

### `models.list` 檢視

`models.list` 接受一個選用的 `view` 參數：

- 省略或 `"default"`：目前的執行時行為。如果已配置 `agents.defaults.models`，回應為允許的目錄，包括 `provider/*` 項目的動態探索模型。否則回應為完整的 Gateway 目錄。
- `"configured"`：選擇器大小的行為。如果已配置 `agents.defaults.models`，它仍然優先適用，包括 `provider/*` 項目的提供者範圍探索。如果沒有允許清單，回應會使用明確的 `models.providers.*.models` 項目，僅在沒有配置的模型列存在時才回退到完整目錄。
- `"all"`：完整的 Gateway 目錄，繞過 `agents.defaults.models`。將此用於診斷和探索 UI，而非正常的模型選擇器。

## 執行核准

- 當執行請求需要核准時，gateway 會廣播 `exec.approval.requested`。
- Operator 用戶端透過呼叫 `exec.approval.resolve` 來解析（需要 `operator.approvals` 範圍）。
- 對於 `host=node`，`exec.approval.request` 必須包含 `systemRunPlan`（標準的 `argv`/`cwd`/`rawCommand`/session 元資料）。缺少 `systemRunPlan` 的請求將被拒絕。
- 核准後，轉發的 `node.invoke system.run` 呼叫會重複使用該標準的
  `systemRunPlan` 作為授權的 command/cwd/session 上下文。
- 如果呼叫者在準備和最終核准的 `system.run` 轉發之間變更了 `command`、`rawCommand`、`cwd`、`agentId` 或
  `sessionKey`，gateway 將拒絕該執行，而不是信任變更後的 payload。

## 代理傳遞後備

- `agent` 請求可以包含 `deliver=true` 以請求出站傳送。
- `bestEffortDeliver=false` 保持嚴格行為：未解析或僅內部的傳送目標會回傳 `INVALID_REQUEST`。
- 當無法解析外部可傳送路由時（例如內部/webchat 會話或不明確的多通道配置），`bestEffortDeliver=true` 允許退回到僅限會話的執行。
- 最終的 `agent` 結果在請求傳送時可能包含 `result.deliveryStatus`，使用與 [`openclaw agent --json --deliver`](/zh-Hant/cli/agent#json-delivery-status) 文件中記錄的相同 `sent`、`suppressed`、`partial_failed` 和 `failed` 狀態。

## 版本控制

- `PROTOCOL_VERSION` 位於 `src/gateway/protocol/version.ts` 中。
- 客戶端發送 `minProtocol` + `maxProtocol`；伺服器會拒絕不包含其目前協議的範圍。目前的客戶端和伺服器需要協議 v4。
- Schema + 模型是從 TypeBox 定義生成的：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### 客戶端常數

`src/gateway/client.ts` 中的參考客戶端使用這些預設值。這些值在協議 v4 中保持穩定，並且是第三方客戶端的預期基準。

| 常數                               | 預設值                                             | 來源                                                                             |
| ---------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| `PROTOCOL_VERSION`                 | `4`                                                | `src/gateway/protocol/version.ts`                                                |
| `MIN_CLIENT_PROTOCOL_VERSION`      | `4`                                                | `src/gateway/protocol/version.ts`                                                |
| 請求逾時（每個 RPC）               | `30_000` ms                                        | `src/gateway/client.ts` (`requestTimeoutMs`)                                     |
| 預先授權 / 連接挑戰逾時            | `15_000` ms                                        | `src/gateway/handshake-timeouts.ts` (config/env 可以提高配對的伺服器/客戶端預算) |
| 初始重新連線退避                   | `1_000` ms                                         | `src/gateway/client.ts` (`backoffMs`)                                            |
| 最大重新連線退避                   | `30_000` ms                                        | `src/gateway/client.ts` (`scheduleReconnect`)                                    |
| 裝置權杖關閉後的快速重試限制       | `250` ms                                           | `src/gateway/client.ts`                                                          |
| `terminate()` 之前的強制停止寬限期 | `250` 毫秒                                         | `FORCE_STOP_TERMINATE_GRACE_MS`                                                  |
| `stopAndWait()` 預設逾時           | `1_000` 毫秒                                       | `STOP_AND_WAIT_TIMEOUT_MS`                                                       |
| 預設 tick 間隔 (pre `hello-ok`)    | `30_000` 毫秒                                      | `src/gateway/client.ts`                                                          |
| Tick 逾時關閉                      | 當靜默超過 `tickIntervalMs * 2` 時回傳 code `4000` | `src/gateway/client.ts`                                                          |
| `MAX_PAYLOAD_BYTES`                | `25 * 1024 * 1024` (25 MB)                         | `src/gateway/server-constants.ts`                                                |

伺服器會在 `hello-ok` 中通告有效的 `policy.tickIntervalMs`、`policy.maxPayload`
與 `policy.maxBufferedBytes`；客戶端應遵守這些值，而非握手前的預設值。

## 認證

- 共用密鑰 Gateway 驗證根據設定的驗證模式使用 `connect.params.auth.token` 或
  `connect.params.auth.password`。
- 承載身分的模式，例如 Tailscale Serve
  (`gateway.auth.allowTailscale: true`) 或非 loopback
  `gateway.auth.mode: "trusted-proxy"`，會從請求標頭而非 `connect.params.auth.*` 滿足連線驗證檢查。
- Private-ingress `gateway.auth.mode: "none"` 完全跳過共用密鑰連線驗證；
  請勿在公開/不受信任的入口上公開該模式。
- 配對後，Gateway 會發出範圍限定於連線角色 + 範圍的 **device token**。它會在 `hello-ok.auth.deviceToken` 中傳回，客戶端應將其持久保存以供未來連線使用。
- 客戶端應在任何成功連線後持久保存主要 `hello-ok.auth.deviceToken`。
- 使用該 **已儲存** 的裝置權杖重新連線時，也應重複使用為該權杖儲存的已批准範圍集合。
  這樣可保留已授予的讀取/探測/狀態存取權，並避免無聲地將重新連線收窄為較狹隘的隱含僅限管理員範圍。
- 客戶端連線驗證組裝 (`selectConnectAuth` 於
  `src/gateway/client.ts` 中)：
  - `auth.password` 是正交的，且設定時總是會被轉發。
  - `auth.token` 依優先順序填入：首先是明確的共用 token，
    然後是明確的 `deviceToken`，再來是儲存的每裝置 token (以
    `deviceId` + `role` 為鍵值)。
  - 僅當上述方法均未解析出 `auth.token` 時，才會發送 `auth.bootstrapToken`。共享權杖或任何已解析的裝置權杖會抑制其發送。
  - 在一次性 `AUTH_TOKEN_MISMATCH` 重試時，儲存的裝置權杖的自動提升僅限於 **受信任的端點** —— 迴路，或具有固定 `tlsFingerprint` 的 `wss://`。未固定 %`wss://` 不符合條件。
- 內建的設置碼啟動流程會回傳主要節點 `hello-ok.auth.deviceToken` 以及在 `hello-ok.auth.deviceTokens` 中的有限操作員權杖，用於受信任的行動裝置移交。該操作員權杖不包含 `operator.admin`、`operator.pairing` 和 `operator.talk.secrets`。
- 當非基線設置碼啟動正在等待批准時，`PAIRING_REQUIRED` 詳細資訊包括 `recommendedNextStep: "wait_then_retry"`、`retryable: true` 和 `pauseReconnect: false`。客戶端應繼續使用相同的啟動權杖重新連線，直到請求被批准或權杖失效為止。
- 僅當連線在受信任的傳輸（如 `wss://` 或迴路/本機配對）上使用啟動驗證時，才應儲存 `hello-ok.auth.deviceTokens`。
- 如果客戶端提供了 **明確的** `deviceToken` 或明確的 `scopes`，該呼叫者請求的範圍集將保持權威性；僅當客戶端重用儲存的每裝置權杖時，才會重用快取的範圍。
- 可以透過 `device.token.rotate` 和 `device.token.revoke` 旋轉/撤銷裝置權杖（需要 `operator.pairing` 範圍）。
- `device.token.rotate` 會回傳旋轉中繼資料。它僅對已使用該裝置權杖進行驗證的同一裝置呼叫回傳替換持有人權杖，以便僅使用權杖的客戶端能在重新連線前儲存其替換權杖。共享/管理員旋轉不會回傳持有人權杖。
- 令牌的簽發、輪換和撤銷仍受限於記錄在該裝置配對條目中的批准角色集；令牌變更無法擴展或針對配對批准從未授予的裝置角色。
- 對於配對裝置權杖會話，除非呼叫者也具有 `operator.admin`，否則裝置管理僅限於自身範圍：非管理員呼叫者只能移除/撤銷/旋轉**自己的**裝置項目。
- `device.token.rotate` 和 `device.token.revoke` 也會檢查目標操作員
  token 的範圍集合，以對照呼叫者的目前 session 範圍。非管理員呼叫者
  無法輪替或撤銷比其所持權限更大的操作員 token。
- 驗證失敗包括 `error.details.code` 以及恢復提示：
  - `error.details.canRetryWithDeviceToken`（布林值）
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- `AUTH_TOKEN_MISMATCH` 的客戶端行為：
  - 受信任的客戶端可以使用快取的每裝置 token 嘗試一次有限的重新連線。
  - 如果該重試失敗，客戶端應停止自動重新連線迴圈，並向操作員顯示操作指引。
- `AUTH_SCOPE_MISMATCH` 表示裝置 token 已被識別但不涵蓋
  請求的角色/範圍。客戶端不應將此顯示為錯誤的 token；
  應提示操作員重新配對或批准較窄/較廣的範圍合約。

## 裝置身分 + 配對

- 節點應包含一個穩定的裝置身分（`device.id`），該身分衍生自
  金鑰對指紋。
- 閘道會針對每個裝置與角色發行 token。
- 除非啟用了本機自動核准，否則新的裝置 ID 需要配對核准。
- 配對自動核准以直接本機回送連線為中心。
- OpenClaw 也具有一個狹窄的後端/容器本機自我連線路徑，用於受信任的共享金鑰輔助流程。
- 相同主機的 tailnet 或 LAN 連線在配對時仍會被視為遠端連線，並需要核准。
- WS 客戶端通常在 `connect` 期間（操作員 +
  節點）包含 `device` 身分。唯一的無裝置操作員例外情況是明確的信任路徑：
  - `gateway.controlUi.allowInsecureAuth=true` 用於僅限本機的不安全 HTTP 相容性。
  - 成功的 `gateway.auth.mode: "trusted-proxy"` 操作員控制 UI 驗證。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true`（緊急情況，嚴重的安全性降級）。
  - 直接回送 `gateway-client` 後端 RPC，使用共用的
    gateway token/password 進行驗證。
- 所有連線必須簽署伺服器提供的 `connect.challenge` nonce。

### 裝置驗證遷移診斷

對於仍使用挑戰前簽署行為的舊版客戶端，`connect` 現在會在 `error.details.code` 下傳回
`DEVICE_AUTH_*` 詳細錯誤代碼，並帶有一個穩定的 `error.details.reason`。

常見的遷移失敗：

| 訊息                        | details.code                     | details.reason           | 含義                                          |
| --------------------------- | -------------------------------- | ------------------------ | --------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客戶端遺漏了 `device.nonce`（或發送了空白）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客戶端使用了過時/錯誤的 nonce 進行簽署。      |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 簽署內容與 v2 payload 不符。                  |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 簽署的時間戳記超出允許的偏移範圍。            |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 與公開金鑰指紋不符。              |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公鑰格式/正規化失敗。                         |

遷移目標：

- 請務必等待 `connect.challenge`。
- 簽署包含伺服器 nonce 的 v2 payload。
- 請在 `connect.params.device.nonce` 中發送相同的 nonce。
- 建議的簽署內容為 `v3`，除了裝置/用戶端/角色/範圍/令牌/nonce 欄位外，它還綁定了 `platform` 和 `deviceFamily`。
- 舊版 `v2` 簽名為了相容性仍被接受，但在重新連線時，配對裝置的中繼資料固定仍控制指令政策。

## TLS + 憑證固定

- WS 連線支援 TLS。
- 用戶端可以選擇性地固定閘道憑證指紋（請參閱 `gateway.tls`
  配置加上 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 範圍

此協定公開了**完整的閘道 API**（狀態、頻道、模型、聊天、
代理程式、工作階段、節點、核准等）。確切的介面由 `src/gateway/protocol/schema.ts` 中的 TypeBox 綱要定義。

## 相關

- [橋接協定](/zh-Hant/gateway/bridge-protocol)
- [閘道執行手冊](/zh-Hant/gateway)
