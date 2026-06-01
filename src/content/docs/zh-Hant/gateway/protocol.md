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

`server`、`features`、`snapshot` 和 `policy` 都是架構
(`packages/gateway-protocol/src/schema/frames.ts`) 所要求的。`auth` 也是必需的，並回報
協商的角色/範圍。`pluginSurfaceUrls` 是可選的，將外掛介面名稱，例如
`canvas`，對應到有範圍的託管 URL。

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
        "scopes": ["operator.approvals", "operator.read", "operator.talk.secrets", "operator.write"]
      }
    ]
  }
}
```

操作員移交是刻意設有界限的，以便 QR 入門可以在不授予 `operator.admin` 或 `operator.pairing` 的情況下啟動
行動操作員迴圈。它確實包含 `operator.talk.secrets`，以便原生客戶端可以在啟動後讀取其所需的 Talk
設定。更廣泛的管理員和配對範圍需要單獨的已批准操作員配對或權杖流程。僅當連線在受信任的傳輸（例如 `wss://`）
或迴路/本機配對上使用啟動驗證時，客戶端才應保存
`hello-ok.auth.deviceTokens`。

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

如需完整的操作員範圍模型、批准時檢查以及共用秘密語意，請參閱 [操作員範圍](/zh-Hant/gateway/operator-scopes)。

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

  <Accordion title="模型與使用">
    - `models.list` 返回執行時允許的模型目錄。傳遞 `{ "view": "configured" }` 以取得選擇器大小的已配置模型（`agents.defaults.models` 優先，然後是 `models.providers.*.models`），或傳遞 `{ "view": "all" }` 以取得完整目錄。
    - `usage.status` 返回供應商使用視窗/剩餘配額摘要。
    - `usage.cost` 返回指定日期範圍的彙總成本使用摘要。
      傳遞 `agentId` 以查詢單一代理，或傳遞 `agentScope: "all"` 以彙總已配置的代理。
    - `doctor.memory.status` 返回作用中預設代理工作區的向量記憶體 / 快取嵌入就緒狀態。僅當呼叫者明確需要即時嵌入供應商 Pong 時，才傳遞 `{ "probe": true }` 或 `{ "deep": true }`。
    - `doctor.memory.remHarness` 返回遠端控制平面客戶端的有限唯讀 REM 擴充功能預覽。它可能包含工作區路徑、記憶體片段、渲染的落地 Markdown 以及深度推廣候選項，因此呼叫者需要 `operator.read`。
    - `sessions.usage` 返回各階段的使用摘要。傳遞 `agentId` 以查詢單一
      代理，或傳遞 `agentScope: "all"` 以一併列出已配置的代理。
    - `sessions.usage.timeseries` 返回單一階段的時間序列使用量。
    - `sessions.usage.logs` 返回單一階段的使用日誌項目。

  </Accordion>

  <Accordion title="頻道與登入輔助程式">
    - `channels.status` 傳回內建 + 捆綁的頻道/外掛狀態摘要。
    - `channels.logout` 登出特定的頻道/帳戶（在該頻道支援登出的情況下）。
    - `web.login.start` 為當前支援 QR 的網頁頻道提供者啟動 QR/網頁登入流程。
    - `web.login.wait` 等待該 QR/網頁登入流程完成，並在成功時啟動該頻道。
    - `push.test` 傳送測試 APNs 推播通知至已註冊的 iOS 節點。
    - `voicewake.get` 傳回已儲存的喚醒詞觸發器。
    - `voicewake.set` 更新喚醒詞觸發器並廣播該變更。

  </Accordion>

  <Accordion title="訊息與日誌">
    - `send` 是用於聊天執行器之外針對頻道/帳戶/執行緒目標傳送的直接出站遞送 RPC。
    - `logs.tail` 傳回已設定的閘道檔案日誌尾部，並包含游標/限制和最大位元組控制。

  </Accordion>

  <Accordion title="語音對話與 TTS">
    - `talk.catalog` 傳回用於語音、串流轉錄和即時語音的唯讀 Talk 提供者目錄。它包含提供者 ID、標籤、已配置狀態、公開的模型/語音 ID、標準模式、傳輸、策略以及即時音訊/能力標誌，而不會傳回提供者密鑰或修改全域配置。
    - `talk.config` 傳回有效的 Talk 配置載荷；`includeSecrets` 需要 `operator.talk.secrets`（或 `operator.admin`）。
    - `talk.session.create` 為 `realtime/gateway-relay`、`transcription/gateway-relay` 或 `stt-tts/managed-room` 建立 Gateway 擁有的 Talk 工作階段。對於 `stt-tts/managed-room`，傳遞 `sessionKey` 的 `operator.write` 呼叫端也必須傳遞 `spawnedBy` 以取得限定範圍的工作階段金鑰可見性；未限定範圍的 `sessionKey` 建立和 `brain: "direct-tools"` 需要 `operator.admin`。
    - `talk.session.join` 驗證受管理房間工作階段權杖，視需要發出 `session.ready` 或 `session.replaced` 事件，並傳回房間/工作階段元資料以及最近的 Talk 事件，而不包含明文權杖或已儲存權杖雜湊。
    - `talk.session.appendAudio` 將 base64 PCM 輸入音訊附加到 Gateway 擁有的即時中繼和轉錄工作階段。
    - `talk.session.startTurn`、`talk.session.endTurn` 和 `talk.session.cancelTurn` 驅動受管理房間的輪次生命週期，並在狀態清除之前拒絕過期的輪次。
    - `talk.session.cancelOutput` 停止助理音訊輸出，主要用於 Gateway 中繼工作階段中的 VAD 閘控插話。
    - `talk.session.submitToolResult` 完成 Gateway 擁有的即時中繼工作階段發出的提供者工具呼叫。當後續會有最終結果時，傳遞 `options: { willContinue: true }` 以取得臨時工具輸出；或者當工具結果應滿足提供者呼叫而不啟動另一個即時助理回應時，傳遞 `options: { suppressResponse: true }`。
    - `talk.session.steer` 將執行中的語音控制發送到 Gateway 擁有的代理支援 Talk 工作階段。它接受 `{ sessionId, text, mode? }`，其中 `mode` 是 `status`、`steer`、`cancel` 或 `followup`；若省略模式，則從口語文字中進行分類。
    - `talk.session.close` 關閉 Gateway 擁有的中繼、轉錄或受管理房間工作階段，並發出終端 Talk 事件。
    - `talk.mode` 為 WebChat/Control UI 客戶端設定/廣播目前的 Talk 模式狀態。
    - `talk.client.create` 使用 `webrtc` 或 `provider-websocket` 建立客戶端擁有的即時提供者工作階段，同時 Gateway 擁有配置、憑證、指令和工具原則。
    - `talk.client.toolCall` 允許客戶端擁有的即時傳輸將提供者工具呼叫轉發到 Gateway 原則。第一個支援的工具是 `openclaw_agent_consult`；客戶端會收到執行 ID，並在提交提供者特定工具結果之前等待正常的聊天生命週期事件。
    - `talk.client.steer` 為客戶端擁有的即時傳輸發送執行中的語音控制。Gateway 從 `sessionKey` 解析主動內嵌執行，並傳回結構化的已接受/已拒絕結果，而不是無聲地丟棄導引。
    - `talk.event` 是即時、轉錄、STT/TTS、受管理房間、電話和會議配接器的單一 Talk 事件通道。
    - `talk.speak` 透過主動 Talk 語音提供者合成語音。
    - `tts.status` 傳回 TTS 啟用狀態、主動提供者、後備提供者和提供者配置狀態。
    - `tts.providers` 傳回可見的 TTS 提供者清單。
    - `tts.enable` 和 `tts.disable` 切換 TTS 偏好設定狀態。
    - `tts.setProvider` 更新首選的 TTS 提供者。
    - `tts.convert` 執行一次性文字轉語音轉換。

  </Accordion>

  <Accordion title="密鑰、設定、更新和精靈">
    - `secrets.reload` 重新解析作用中的 SecretRefs，並僅在完全成功時交換執行時期密鑰狀態。
    - `secrets.resolve` 解析特定指令/目標集的指令目標密鑰分配。
    - `config.get` 傳回目前的設定快照和雜湊。
    - `config.set` 寫入已驗證的設定內容。
    - `config.patch` 合併部分設定更新。
    - `config.apply` 驗證並取代完整的設定內容。
    - `config.schema` 傳回控制 UI 和 CLI 工具使用的即時設定架構內容：架構、`uiHints`、版本和生成元數據，當執行時期可以載入時，還包含外掛程式 + 通道架構元數據。此架構包含從 UI 使用的相同標籤和說明文字衍生的欄位 `title` / `description` 元數據，包括巢狀物件、萬用字元、陣列項目，以及當存在相符欄位文件時的 `anyOf` / `oneOf` / `allOf` 組合分支。
    - `config.schema.lookup` 針對單一設定路徑傳回路徑範圍查詢內容：正規化路徑、淺層架構節點、相符提示 + `hintPath`、選用 `reloadKind`，以及用於 UI/CLI 鑽取的即時子項摘要。`reloadKind` 是 `restart`、`hot` 或 `none` 之一，並反映所請求路徑的 Gateway 設定重新載入規劃器。查詢架構節點保留使用者導向文件和常見驗證欄位 (`title`、`description`、`type`、`enum`、`const`、`format`、`pattern`、數值/字串/陣列/物件邊界，以及像 `additionalProperties`、`deprecated`、`readOnly`、`writeOnly` 的旗標)。子項摘要公開 `key`、正規化 `path`、`type`、`required`、`hasChildren`、選用 `reloadKind`，以及相符的 `hint` / `hintPath`。
    - `update.run` 執行 Gateway 更新流程，並僅在更新本身成功時排程重新啟動；具有會話的呼叫者可以包含 `continuationMessage`，以便啟動透過重新啟動延續佇列恢復一個後續代理回合。來自控制平面的套件管理員更新會使用分離的受控服務移交，而不是替換即時 Gateway 內部的套件樹。已啟動的移交會傳回 `ok: true` 以及 `result.reason: "managed-service-handoff-started"` 和 `handoff.status: "started"`；無法使用或失敗的移交會傳回 `ok: false` 以及 `managed-service-handoff-unavailable` 或 `managed-service-handoff-failed`，加上需要手動 shell 更新時的 `handoff.command`。在已啟動的移交期間，重新啟動哨兵可能會簡要回報 `stats.reason: "restart-health-pending"`；延續作業會延遲，直到 CLI 驗證已重新啟動的 Gateway 並寫入最終的 `ok` 哨兵。
    - `update.status` 傳回最新的快取更新重新啟動哨兵，包括可用時重新啟動後的執行版本。
    - `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 透過 WS RPC 公開入門精靈。

  </Accordion>

  <Accordion title="Agent and workspace helpers">
    - `agents.list` 返回已配置的代理條目，包括有效的模型和運行時元資料。
    - `agents.create`、`agents.update` 和 `agents.delete` 管理代理記錄和工作區接線。
    - `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理為代理公開的引導工作區檔案。
    - `tasks.list`、`tasks.get` 和 `tasks.cancel` 向 SDK 和操作員用戶端公開 Gateway 任務帳本。
    - `artifacts.list`、`artifacts.get` 和 `artifacts.download` 為明確的 `sessionKey`、`runId` 或 `taskId` 範圍公開源自文字記錄的工件摘要和下載。執行和任務查詢會在伺服器端解析擁有者會話，且僅返回具有匹配出處的文字記錄媒體；不安全或本機 URL 來源會返回不支援的下載，而不是在伺服器端提取。
    - `environments.list` 和 `environments.status` 向 SDK 用戶端公開唯讀的 Gateway 本地和節點環境發現。
    - `agent.identity.get` 返回代理或會話的有效助理身分。
    - `agent.wait` 等待執行完成並在可用時返回終端快照。

  </Accordion>

  <Accordion title="Session control">
    - `sessions.list` 傳回目前的 session 索引，當配置了 agent runtime 後端時，包含逐行的 `agentRuntime` 中繼資料。
    - `sessions.subscribe` 和 `sessions.unsubscribe` 切換目前 WS 用戶端的 session 變更事件訂閱。
    - `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 切換單一 session 的逐字稿/訊息事件訂閱。
    - `sessions.preview` 傳回特定 session 金鑰的有限逐字稿預覽。
    - `sessions.describe` 傳回精確 session 金鑰的單一 Gateway session 列。
    - `sessions.resolve` 解析或規範化 session 目標。
    - `sessions.create` 建立新的 session 項目。
    - `sessions.send` 將訊息傳送至現有的 session。
    - `sessions.steer` 是作用中 session 的中斷並引導變體。
    - `sessions.abort` 中止 session 的進行中工作。呼叫者可以傳遞 `key` 加上選用的 `runId`，或者僅傳遞 `runId` 給 Gateway 可解析為 session 的進行中執行。
    - `sessions.patch` 更新 session 中繼資料/覆寫值，並回報解析的規範模型加上有效的 `agentRuntime`。
    - `sessions.reset`、`sessions.delete` 和 `sessions.compact` 執行 session 維護。
    - `sessions.get` 傳回完整的已儲存 session 列。
    - Chat 執行仍使用 `chat.history`、`chat.send`、`chat.abort` 和 `chat.inject`。`chat.history` 已針對 UI 用戶端進行顯示正規化：可見文字中的內聯指令標籤會被移除、純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截斷的工具呼叫區塊）以及外洩的 ASCII/全形模型控制權杖會被移除、純靜音權杖助手列（例如精確的 `NO_REPLY` / `no_reply`）會被省略，且過大的列可以被替換為預留位置。

  </Accordion>

  <Accordion title="裝置配對與裝置權杖">
    - `device.pair.list` 傳回待審核與已核准的配對裝置。
    - `device.pair.approve`、`device.pair.reject` 和 `device.pair.remove` 管理裝置配對紀錄。
    - `device.token.rotate` 在其核准的角色與呼叫者範圍限制內輪替已配對裝置的權杖。
    - `device.token.revoke` 在其核准的角色與呼叫者範圍限制內撤銷已配對裝置的權杖。

  </Accordion>

  <Accordion title="節點配對、叫用與待處理工作">
    - `node.pair.request`、`node.pair.list`、`node.pair.approve`、`node.pair.reject`、`node.pair.remove` 和 `node.pair.verify` 涵蓋節點配對與啟動程序驗證。
    - `node.list` 和 `node.describe` 傳回已知/已連線的節點狀態。
    - `node.rename` 更新已配對節點的標籤。
    - `node.invoke` 將指令轉發至已連線的節點。
    - `node.invoke.result` 傳回叫用請求的結果。
    - `node.event` 將節點起源的事件帶回到閘道。
    - `node.pending.pull` 和 `node.pending.ack` 是已連線節點的佇列 API。
    - `node.pending.enqueue` 和 `node.pending.drain` 管理離線/已斷線節點的持久化待處理工作。

  </Accordion>

  <Accordion title="審核系列">
    - `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和 `exec.approval.resolve` 涵蓋一次性執行審核請求以及待處理審核的查詢/重放。
    - `exec.approval.waitDecision` 等待一個待處理的執行審核並返回最終決定（或在逾時時返回 `null`）。
    - `exec.approvals.get` 和 `exec.approvals.set` 管理閘道執行審核策略快照。
    - `exec.approvals.node.get` 和 `exec.approvals.node.set` 透過節點中繼指令管理節點本地的執行審核策略。
    - `plugin.approval.request`、`plugin.approval.list`、`plugin.approval.waitDecision` 和 `plugin.approval.resolve` 涵蓋外掛定義的審核流程。

  </Accordion>

  <Accordion title="自動化、技能與工具">
    - 自動化：`wake` 排定立即或下一次心跳的喚醒文字注入；`cron.get`、`cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、`cron.run` 和 `cron.runs` 管理排程工作。
    - `cron.run` 對於手動執行仍是一種入列式的 RPC。需要完成語意的客戶端應讀取返回的 `runId` 並輪詢 `cron.runs`。
    - `cron.runs` 接受可選的非空 `runId` 篩選器，讓客戶端能追蹤一個佇列中的手動執行，而不會與相同任務的其他歷史記錄項目產生競爭。
    - 技能與工具：`commands.list`、`skills.*`、`tools.catalog`、`tools.effective`、`tools.invoke`。

  </Accordion>
</AccordionGroup>

### 常見事件系列

- `chat`：UI 聊天更新，例如 `chat.inject` 以及其他僅限文字記錄的聊天事件。在協議 v4 中，delta 載荷攜帶 `deltaText`；`message` 保持為累積的助理快照。非前綴替換會設定 `replace=true` 並使用 `deltaText` 作為替換文字。
- `session.message`、`session.operation` 和 `session.tool`：針對已訂閱會話的文字記錄、進行中的會話操作以及事件流更新。
- `sessions.changed`：會話索引或元資料已變更。
- `presence`：系統在線狀態快照更新。
- `tick`：週期性保活 / 存活事件。
- `health`：閘道健康狀態快照更新。
- `heartbeat`：心跳事件流更新。
- `cron`：cron 執行/任務變更事件。
- `shutdown`：閘道關機通知。
- `node.pair.requested` / `node.pair.resolved`：節點配對生命週期。
- `node.invoke.request`：節點調用請求廣播。
- `device.pair.requested` / `device.pair.resolved`：配對裝置生命週期。
- `voicewake.changed`：喚醒詞觸發配置已變更。
- `exec.approval.requested` / `exec.approval.resolved`：exec 核准
  生命週期。
- `plugin.approval.requested` / `plugin.approval.resolved`：外掛程式核准
  生命週期。

### 節點輔助方法

- 節點可以呼叫 `skills.bins` 來取得目前的技能可執行檔清單以進行自動允許檢查。

### 任務分類帳 RPC

操作員用戶端可以透過任務分類帳 RPC 檢查並取消閘道背景任務記錄。這些方法會回傳經過清理的任務摘要，而非原始
執行時狀態。

- `tasks.list` 需要 `operator.read`。
  - 參數：可選的 `status` (`"queued"`、`"running"`、`"completed"`、
    `"failed"`、`"cancelled"` 或 `"timed_out"`) 或這些狀態的陣列，
    可選的 `agentId`，可選的 `sessionKey`，從 `1` 到
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
  - `found` 回報帳本是否有相符的工作。`cancelled`
    回報執行時期是否接受或記錄取消。

`TaskSummary` 包含 `id`、`status` 以及可選的中繼資料，例如 `kind`、
`runtime`、`title`、`agentId`、`sessionKey`、`childSessionKey`、`ownerKey`、
`runId`、`taskId`、`flowId`、`parentTaskId`、`sourceId`、時間戳記、進度、
終端摘要和清理過的錯誤文字。

### 操作員輔助方法

- 操作員可以呼叫 `commands.list` (`operator.read`) 以取得代理程式
  的執行時期指令清單。
  - `agentId` 是可選的；省略它以讀取預設的代理程式工作區。
  - `scope` 控制主要 `name` 的目標介面：
    - `text` 回傳不帶前導 `/` 的主要文字指令 token
    - `native` 和預設的 `both` 路徑在可用時會返回供應商感知的原生名稱
  - `textAliases` 攜帶精確的斜線別名，例如 `/model` 和 `/m`。
  - `nativeName` 攜帶供應商感知的原生命令名稱（如果存在）。
  - `provider` 是可選的，且僅影響原生命名以及原生外掛命令的可用性。
  - `includeArgs=false` 會從回應中省略序列化的引數中繼資料。
- 操作員可以呼叫 `tools.catalog` (`operator.read`) 來取得代理的執行階段工具目錄。回應包含分組的工具和來源中繼資料：
  - `source`：`core` 或 `plugin`
  - `pluginId`：外掛擁有者（當 `source="plugin"` 時）
  - `optional`：外掛工具是否為可選
- 操作員可以呼叫 `tools.effective` (`operator.read`) 來取得會話的執行階段有效工具清單。
  - `sessionKey` 是必需的。
  - 閘道是從伺服器端的工作階段衍生受信任的執行時期內容，而不是接受呼叫者提供的驗證或傳遞內容。
  - 回應是作用中清單的會話範圍伺服器衍生投影，包含核心、外掛、通道以及已探索的 MCP 伺服器工具。
  - `tools.effective` 對於 MCP 是唯讀的：它可以透過最終工具政策投影一個熱會話 MCP 目錄，但它不會建立 MCP 執行時、連線傳輸或發出 `tools/list`。如果不存在相符的熱目錄，回應可能會包含諸如 `mcp-not-yet-connected`、`mcp-not-yet-listed` 或 `mcp-stale-catalog` 的通知。
  - 有效工具項目使用 `source="core"`、`source="plugin"`、`source="channel"` 或 `source="mcp"`。
- 操作員可以呼叫 `tools.invoke` (`operator.write`) 透過與 `/tools/invoke` 相同的閘道政策路徑來叫用一個可用工具。
  - `name` 是必需的。`args`、`sessionKey`、`agentId`、`confirm` 和
    `idempotencyKey` 是可選的。
  - 如果同時存在 `sessionKey` 和 `agentId`，解析出的會話代理必須匹配
    `agentId`。
  - 回應是一個面向 SDK 的封包，包含 `ok`、`toolName`、可選的 `output` 以及類型化
    `error` 欄位。批准或策略拒絕會在載荷中返回 `ok:false`，而不是
    繞過閘道工具策略管線。
- 操作員可以呼叫 `skills.status` (`operator.read`) 來取得代理
  的可見技能清單。
  - `agentId` 是可選的；省略它以讀取預設代理工作區。
  - 回應包括資格、缺失需求、配置檢查以及
    經過清理的安裝選項，而不會暴露原始秘密值。
- 操作員可以呼叫 `skills.search` 和 `skills.detail` (`operator.read`) 以取得
  ClawHub 探索元資料。
- 操作員可以呼叫 `skills.upload.begin`、`skills.upload.chunk` 和
  `skills.upload.commit` (`operator.admin`) 以在安裝之前暫存私有技能
  封存。這是一條針對受信任用戶端的獨立管理員上傳路徑，
  而非正常的 ClawHub 技能安裝流程，且預設為停用，除非
  `skills.install.allowUploadedArchives` 已啟用。
  - `skills.upload.begin({ kind: "skill-archive", slug, sizeBytes, sha256?, force?, idempotencyKey? })`
    建立一個綁定至該 slug 和 force 值的上傳。
  - `skills.upload.chunk({ uploadId, offset, dataBase64 })` 在
    確切解碼偏移量處附加位元組。
  - `skills.upload.commit({ uploadId, sha256? })` 會驗證最終大小和
    SHA-256。提交僅完成上傳；它不會安裝技能。
  - 上傳的技能封存是包含 `SKILL.md` 根目錄的 zip 封存。
    封存的內部目錄名稱從不選擇安裝目標。
- 操作員可以三種模式呼叫 `skills.install` (`operator.admin`)：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 會將
    技能資料夾安裝到預設的代理工作區 `skills/` 目錄中。
  - 上傳模式：`{ source: "upload", uploadId, slug, force?, sha256?, timeoutMs? }`
    會將已提交的上傳內容安裝到預設的代理工作區 `skills/<slug>`
    目錄中。Slug 和 force 值必須與原始
    `skills.upload.begin` 請求相符。除非啟用
    `skills.install.allowUploadedArchives`，否則此模式會被拒絕。此設定不會
    影響 ClawHub 安裝。
  - 閘道安裝程式模式：`{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }`
    會在閘道主機上執行宣告的 `metadata.openclaw.install` 動作。
- 操作員可以兩種模式呼叫 `skills.update` (`operator.admin`)：
  - ClawHub 模式會更新預設代理工作區中的一個追蹤 slug 或所有已追蹤的 ClawHub 安裝。
  - 設定模式會修補 `skills.entries.<skillKey>` 值，例如 `enabled`、
    `apiKey` 和 `env`。

### `models.list` 檢視

`models.list` 接受一個可選的 `view` 參數：

- 省略或 `"default"`：目前的執行時行為。如果設定了 `agents.defaults.models`，回應為允許的目錄，包括動態探索到的 `provider/*` 項目模型。否則，回應為完整的閘道目錄。
- `"configured"`：選擇器大小的行為。如果設定了 `agents.defaults.models`，它仍然優先適用，包括針對 `provider/*` 項目的提供者範圍探索。如果沒有允許清單，回應會使用明確的 `models.providers.*.models` 項目，僅在不存在設定的模型資料列時才回退到完整目錄。
- `"all"`：完整的閘道目錄，繞過 `agents.defaults.models`。將此用於診斷和探索 UI，而非正常的模型選擇器。

## 執行核准

- 當執行請求需要核准時，閘道會廣播 `exec.approval.requested`。
- 操作員客戶端透過呼叫 `exec.approval.resolve` 來解決 (需要 `operator.approvals` 範圍)。
- 對於 `host=node`，`exec.approval.request` 必須包含 `systemRunPlan`（標準 `argv`/`cwd`/`rawCommand`/session 中繼資料）。缺少 `systemRunPlan` 的請求會被拒絕。
- 獲得批准後，轉發的 `node.invoke system.run` 呼叫會重複使用該標準
  `systemRunPlan` 作為授權的 command/cwd/session 上下文。
- 如果呼叫者在準備階段與最終批准的 `system.run` 轉發之間變更了 `command`、`rawCommand`、`cwd`、`agentId` 或
  `sessionKey`，閘道會拒絕該執行，而不是信任變更後的 payload。

## Agent 傳送遞補

- `agent` 請求可以包含 `deliver=true` 以要求 outbound 傳送。
- `bestEffortDeliver=false` 保持嚴格行為：未解析或僅限內部的傳送目標會傳回 `INVALID_REQUEST`。
- 當無法解析任何外部可傳送路由時（例如內部/webchat session 或模糊的多通道配置），`bestEffortDeliver=true` 允許遞補至僅限 session 的執行。
- 當有要求傳送時，最終的 `agent` 結果可能包含 `result.deliveryStatus`，使用與 [`openclaw agent --json --deliver`](/zh-Hant/cli/agent#json-delivery-status) 文件中相同的 `sent`、`suppressed`、`partial_failed` 和 `failed`
  狀態。

## 版本控制

- `PROTOCOL_VERSION` 位於 `packages/gateway-protocol/src/version.ts` 中。
- 客戶端會傳送 `minProtocol` + `maxProtocol`；伺服器會拒絕不包含其目前協定版本的範圍。目前的客戶端和伺服器需要協定 v4。
- Schema + 模型是從 TypeBox 定義生成的：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### 客戶端常數

`src/gateway/client.ts` 中的參考客戶端使用這些預設值。這些值在 protocol v4 中是穩定的，並且是第三方客戶端的預期基線。

| 常數                               | 預設值                                          | 來源                                                                             |
| ---------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------- |
| `PROTOCOL_VERSION`                 | `4`                                             | `packages/gateway-protocol/src/version.ts`                                       |
| `MIN_CLIENT_PROTOCOL_VERSION`      | `4`                                             | `packages/gateway-protocol/src/version.ts`                                       |
| 請求逾時 (每個 RPC)                | `30_000` ms                                     | `src/gateway/client.ts` (`requestTimeoutMs`)                                     |
| 預先驗證 / 連線挑戰逾時            | `15_000` ms                                     | `src/gateway/handshake-timeouts.ts` (config/env 可以提高配對的伺服器/客戶端預算) |
| 初始重新連線退避                   | `1_000` ms                                      | `src/gateway/client.ts` (`backoffMs`)                                            |
| 最大重新連線退避                   | `30_000` ms                                     | `src/gateway/client.ts` (`scheduleReconnect`)                                    |
| 裝置權杖關閉後的快速重試限制       | `250` ms                                        | `src/gateway/client.ts`                                                          |
| `terminate()` 之前的強制停止寬限期 | `250` ms                                        | `FORCE_STOP_TERMINATE_GRACE_MS`                                                  |
| `stopAndWait()` 預設逾時           | `1_000` ms                                      | `STOP_AND_WAIT_TIMEOUT_MS`                                                       |
| 預設 tick 間隔 (`hello-ok` 之前)   | `30_000` ms                                     | `src/gateway/client.ts`                                                          |
| Tick-逾時關閉                      | 當靜默超過 `tickIntervalMs * 2` 時傳送碼 `4000` | `src/gateway/client.ts`                                                          |
| `MAX_PAYLOAD_BYTES`                | `25 * 1024 * 1024` (25 MB)                      | `src/gateway/server-constants.ts`                                                |

伺服器在 `hello-ok` 中公告有效的 `policy.tickIntervalMs`、`policy.maxPayload` 和
`policy.maxBufferedBytes`；客戶端應遵守這些值，而不是握手前的預設值。

## 驗證

- 共用金鑰 gateway 驗證使用 `connect.params.auth.token` 或
  `connect.params.auth.password`，具體取決於配置的驗證模式。
- 承載身分的模式，例如 Tailscale Serve
  (`gateway.auth.allowTailscale: true`) 或非迴路
  `gateway.auth.mode: "trusted-proxy"`，會從請求標頭滿足連線授權檢查，
  而非透過 `connect.params.auth.*`。
- 私有入口 `gateway.auth.mode: "none"` 會完全跳過共用金鑰連線授權；
  請勿在公開或不受信任的入口上公開該模式。
- 配對後，Gateway 會發出一個範圍限定於連線
  角色 + 範圍的 **裝置權杖**。它會在 `hello-ok.auth.deviceToken` 中返回，
  客戶端應將其保存以供未來連線使用。
- 客戶端應在任何成功連線後
  保存主要的 `hello-ok.auth.deviceToken`。
- 使用該 **已儲存** 的裝置權杖重新連線時，也應重複使用為該權杖儲存
  的已批准範圍集。這保留了已授予的讀取/探測/狀態存取權，
  並避免將重新連線靜默收斂為
  狹窄的隱含僅限管理員範圍。
- 客戶端連線授權組裝 (`selectConnectAuth` 於
  `src/gateway/client.ts` 中)：
  - `auth.password` 是正交的，且設定後總是會被轉發。
  - `auth.token` 會依優先順序填入：首先是明確的共用權杖，
    然後是明確的 `deviceToken`，接著是儲存的每裝置權杖 (依
    `deviceId` + `role` 鍵入)。
  - 僅當上述均未解析出
    `auth.token` 時才會發送 `auth.bootstrapToken`。共用權杖或任何已解析的裝置權杖會將其抑制。
  - 在一次性 `AUTH_TOKEN_MISMATCH` 重試上自動提升已儲存裝置權杖的機制僅限於
    **受信任的端點** — 迴路，或具有固定 `tlsFingerprint` 的
    `wss://`。未固定的公開 `wss://`
    不符合資格。
- 內建的設定碼啟動程序會在 `hello-ok.auth.deviceTokens` 中返回主要節點
  `hello-ok.auth.deviceToken` 以及一個有界操作員權杖，用於受信任的行動裝置交接。
  該操作員權杖包含用於原生 Talk 設定讀取的 `operator.talk.secrets`，
  並排除 `operator.admin` 和 `operator.pairing`。
- 當非基線設置程式碼啟動正在等待核准時，`PAIRING_REQUIRED`
  詳細資訊包括 `recommendedNextStep: "wait_then_retry"`、`retryable: true`
  和 `pauseReconnect: false`。客戶端應繼續使用相同的
  啟動權杖重新連線，直到請求被核准或權杖失效為止。
- 僅當連線在 `wss://` 或迴路/本機配對等受信任傳輸上使用啟動驗證時，才應持久化 `hello-ok.auth.deviceTokens`。
- 如果客戶端提供**明確的** `deviceToken` 或明確的 `scopes`，該呼叫者請求的作用域集合將保持權威；僅當客戶端重複使用儲存的每個裝置權杖時，才會重複使用快取的作用域。
- 裝置權杖可以透過 `device.token.rotate` 和
  `device.token.revoke` 進行輪替/撤銷（需要 `operator.pairing` 作用域）。輪替或
  撤銷節點或其他非操作者角色也需要 `operator.admin`。
- `device.token.rotate` 會傳回輪替中繼資料。它僅針對已透過該裝置權杖驗證的相同裝置呼叫回傳取代持有者權杖，以便僅使用權杖的客戶端可以在重新連線前持久化其取代權杖。共用/管理員輪替不會回傳持有者權杖。
- 權杖的核發、輪替和撤銷僅限於記錄在該裝置配對條目中已核准的角色集合；權杖變更無法擴充或以配對核准從未授予的裝置角色為目標。
- 對於已配對裝置權杖階段，除非呼叫者也具有 `operator.admin`，否則裝置管理僅限於自身作用域：非管理員呼叫者只能管理其**自身**裝置條目的操作者權杖。節點和其他非操作者權杖管理僅限管理員，即使是對於呼叫者自己的裝置也是如此。
- `device.token.rotate` 和 `device.token.revoke` 也會檢查目標操作者
  權杖作用域集合與呼叫者目前階段作用域的對應情況。非管理員呼叫者
  無法輪替或撤銷比其目前持有的範圍更廣的操作者權杖。
- 驗證失敗包括 `error.details.code` 以及復原提示：
  - `error.details.canRetryWithDeviceToken` (布林值)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- `AUTH_TOKEN_MISMATCH` 的客戶端行為：
  - 受信任的客戶端可以使用快取的每裝置權杖嘗試一次有界重試。
  - 如果該重試失敗，客戶端應停止自動重新連線迴圈，並向操作員顯示操作指引。
- `AUTH_SCOPE_MISMATCH` 表示識別了裝置權杖，但未涵蓋請求的角色/範圍。客戶端不應將此顯示為無效權杖；應提示操作員重新配對或批准更窄/更廣的範圍合約。

## 裝置身分識別 + 配對

- 節點應包含從金鑰對指紋衍生的穩定裝置身分識別 (`device.id`)。
- 閘道會發出每裝置 + 角色的權杖。
- 除非啟用了本機自動核准，否則新裝置 ID 需要配對核准。
- 配對自動核准是以直接本機回送連線為中心。
- OpenClaw 也針對受信任的共用金鑰輔助流程，提供了一個狹隘的後端/容器本機自連線路徑。
- 同主機 tailnet 或 LAN 連線在配對時仍被視為遠端連線，並需要核准。
- WS 客戶端通常會在 `connect` 期間包含 `device` 身分識別 (操作員 + 節點)。唯一的無裝置操作員例外情況是明確的信任路徑：
  - `gateway.controlUi.allowInsecureAuth=true` 用於僅限本機主機的不安全 HTTP 相容性。
  - 成功的 `gateway.auth.mode: "trusted-proxy"` 操作員控制 UI 驗證。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (緊急存取，嚴重的安全性降級)。
  - 使用共用閘道權杖/密碼進行驗證的直接回送 `gateway-client` 後端 RPC。
- 省略裝置身分會對範圍產生影響。當控制 UI 連線缺乏裝置身分時，`shouldClearUnboundScopesForMissingDeviceIdentity`
  會將自我宣告的範圍清除為空集合，適用於 token、密碼和 trusted-proxy 認證。該連線在明確的信任路徑上被允許，但受範圍限制的方法會失敗。例外情況是使用 `allowInsecureAuth` 的本機控制 UI token/密碼階段，它們會保留範圍。對於其他情況，
  僅將 `gateway.controlUi.dangerouslyDisableDeviceAuth=true` 設定為
  緊急情況下的範圍保留路徑。
- 所有連線必須對伺服器提供的 `connect.challenge` nonce 進行簽署。

### 裝置認證遷移診斷

對於仍使用挑戰前簽署行為的舊版客戶端，`connect` 現在會在 `error.details.code` 下傳回
`DEVICE_AUTH_*` 詳細代碼，並附帶穩定的 `error.details.reason`。

常見的遷移失敗：

| 訊息                        | details.code                     | details.reason           | 含義                                            |
| --------------------------- | -------------------------------- | ------------------------ | ----------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客戶端省略了 `device.nonce`（或傳送了空白值）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客戶端使用了過時/錯誤的 nonce 進行簽署。        |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 簽署載荷與 v2 載荷不符。                        |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 簽署的時間戳超出允許的偏差範圍。                |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 與公鑰指紋不符。                    |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公鑰格式/正規化失敗。                           |

遷移目標：

- 始終等待 `connect.challenge`。
- 對包含伺服器 nonce 的 v2 載荷進行簽署。
- 在 `connect.params.device.nonce` 中傳送相同的 nonce。
- 首選的簽名 Payload 是 `v3`，除了 device/client/role/scopes/token/nonce 欄位外，它還綁定了 `platform` 和 `deviceFamily`。
- 為了相容性，舊版 `v2` 簽名仍被接受，但在重新連線時，配對裝置的元資料固定仍然控制著指令政策。

## TLS + 憑證固定

- WS 連線支援 TLS。
- 客戶端可選擇固定閘道憑證指紋（請參閱 `gateway.tls` 配置加上 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 範圍

此協定公開了**完整的閘道 API**（狀態、頻道、模型、聊天、代理、會話、節點、審核等）。確切的介面定義於 `packages/gateway-protocol/src/schema.ts` 中的 TypeBox schemas。

## 相關連結

- [Bridge 協定](/zh-Hant/gateway/bridge-protocol)
- [Gateway 手冊](/zh-Hant/gateway)
