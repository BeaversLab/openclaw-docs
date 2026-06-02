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

如需完整的運算器範圍模型、批准時檢查以及共用密碼語意，請參閱 [Operator scopes](/zh-Hant/gateway/operator-scopes)。

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
    - `models.list` 返回執行時允許的模型目錄。傳入 `{ "view": "configured" }` 以獲取選擇器大小的已配置模型（優先 `agents.defaults.models`，然後 `models.providers.*.models`），或傳入 `{ "view": "all" }` 以獲取完整目錄。
    - `usage.status` 返回提供商使用視窗/剩餘配額摘要。
    - `usage.cost` 返回日期範圍內的彙總成本使用摘要。
      傳入 `agentId` 指定單個代理，或傳入 `agentScope: "all"` 以彙總已配置的代理。
    - `doctor.memory.status` 返回活動預設代理工作區的向量記憶體/快取嵌入就緒狀態。僅當呼叫者明確需要即時嵌入提供商 Ping 時才傳遞 `{ "probe": true }` 或 `{ "deep": true }`。支援 Dreaming 的客戶端也可以傳遞 `{ "agentId": "agent-id" }` 以將 Dreaming 存儲統計資訊範圍限定為選定的代理工作區；省略 `agentId` 將保留預設代理後備並彙總已配置的 Dreaming 工作區。
    - `doctor.memory.dreamDiary`、`doctor.memory.backfillDreamDiary`、`doctor.memory.resetDreamDiary`、`doctor.memory.resetGroundedShortTerm`、`doctor.memory.repairDreamingArtifacts` 和 `doctor.memory.dedupeDreamDiary` 接受可選的 `{ "agentId": "agent-id" }` 參數，用於選定代理的 Dreaming 檢視/操作。當省略 `agentId` 時，它們對已配置的預設代理工作區進行操作。
    - `doctor.memory.remHarness` 返回一個有限的、唯讀的 REM 掛接預覽，用於遠端控制平面客戶端。它可以包含工作區路徑、記憶體片段、呈現的落地 Markdown 和深度推廣候選項，因此呼叫者需要 `operator.read`。
    - `sessions.usage` 返回每個會話的使用摘要。傳入 `agentId` 指定單個
      代理，或傳入 `agentScope: "all"` 以列出已配置的代理。
    - `sessions.usage.timeseries` 返回單個會話的時間序列使用情況。
    - `sessions.usage.logs` 返回單個會話的使用日誌條目。

  </Accordion>

  <Accordion title="通道和登入協助程式">
    - `channels.status` 傳回內建 + 捆綁的通道/外掛狀態摘要。
    - `channels.logout` 登出支援登出的特定通道/帳戶。
    - `web.login.start` 為當前具備 QR 功能的 web 通道提供者啟動 QR/web 登入流程。
    - `web.login.wait` 等待該 QR/web 登入流程完成，並在成功時啟動通道。
    - `push.test` 發送測試 APNs 推播至已註冊的 iOS 節點。
    - `voicewake.get` 傳回已儲存的喚醒詞觸發器。
    - `voicewake.set` 更新喚醒詞觸發器並廣播變更。

  </Accordion>

  <Accordion title="訊息傳遞與日誌">
    - `send` 是用於聊天執行器之外，針對通道/帳戶/執行緒目標傳送的直接出站傳遞 RPC。
    - `logs.tail` 傳回已設定的閘道檔案日誌尾部，並包含遊標/限制與最大位元組控制。

  </Accordion>

  <Accordion title="Talk and TTS">
    - `talk.catalog` 傳回用於語音、串流轉錄即時語音的唯讀 Talk 提供者目錄。它包含提供者 ID、標籤、已設定狀態、公開的模型/語音 ID、標準模式、傳輸、Brain 策略以及即時音訊/能力標誌，而不會傳回提供者密鑰或修改全域設定。
    - `talk.config` 傳回有效的 Talk 設定負載；`includeSecrets` 需要 `operator.talk.secrets` (或 `operator.admin`)。
    - `talk.session.create` 為 `realtime/gateway-relay`、`transcription/gateway-relay` 或 `stt-tts/managed-room` 建立 Gateway 擁有的 Talk 工作階段。對於 `stt-tts/managed-room`，傳遞 `sessionKey` 的 `operator.write` 呼叫者也必須傳遞 `spawnedBy` 以取得有限範圍的工作階段金鑰可見性；未限定範圍的 `sessionKey` 建立和 `brain: "direct-tools"` 需要 `operator.admin`。
    - `talk.session.join` 驗證受管理房間的工作階段權杖，根據需要發出 `session.ready` 或 `session.replaced` 事件，並傳回房間/工作階段中繼資料以及最近的 Talk 事件，而不包含明文權杖或儲存的權杖雜湊。
    - `talk.session.appendAudio` 將 base64 PCM 輸入音訊附加到 Gateway 擁有的即時轉送和轉錄工作階段。
    - `talk.session.startTurn`、`talk.session.endTurn` 和 `talk.session.cancelTurn` 驅動受管理房間的輪次生命週期，並在狀態清除前拒絕過期的輪次。
    - `talk.session.cancelOutput` 停止助理音訊輸出，主要用於 Gateway 轉送工作階段中的 VAD 閘控插話。
    - `talk.session.submitToolResult` 完成 Gateway 擁有的即時轉送工作階段所發出的提供者工具呼叫。當最終結果隨後而至時，請傳遞 `options: { willContinue: true }` 作為臨時工具輸出，或者當工具結果應滿足提供者呼叫而不啟動另一個即時助理回應時，請傳遞 `options: { suppressResponse: true }`。
    - `talk.session.steer` 將執行中語音控制傳送到 Gateway 擁有的代理支援 Talk 工作階段。它接受 `{ sessionId, text, mode? }`，其中 `mode` 是 `status`、`steer`、`cancel` 或 `followup`；省略的模式會從口語文字中分類。
    - `talk.session.close` 關閉 Gateway 擁有的轉送、轉錄或受管理房間工作階段，並發出終端 Talk 事件。
    - `talk.mode` 設定/廣播 WebChat/Control UI 用戶端的目前 Talk 模式狀態。
    - `talk.client.create` 使用 `webrtc` 或 `provider-websocket` 建立用戶端擁有的即時提供者工作階段，同時 Gateway 擁有設定、憑證、指示和工具原則。
    - `talk.client.toolCall` 允許用戶端擁有的即時傳輸將提供者工具呼叫轉發到 Gateway 原則。第一個支援的工具是 `openclaw_agent_consult`；用戶端會收到一個執行 ID，並在提交提供者特定的工具結果之前等待正常的聊天生命週期事件。
    - `talk.client.steer` 為用戶端擁有的即時傳輸傳送執行中語音控制。Gateway 從 `sessionKey` 解析作用中的內嵌執行，並傳回結構化的已接受/已拒絕結果，而不是無聲地捨棄引導。
    - `talk.event` 是即時、轉錄、STT/TTS、受管理房間、電話和會議配接器的單一 Talk 事件通道。
    - `talk.speak` 透過作用中的 Talk 語音提供者合成語音。
    - `tts.status` 傳回 TTS 啟用狀態、作用中提供者、後援提供者和提供者設定狀態。
    - `tts.providers` 傳回可見的 TTS 提供者清單。
    - `tts.enable` 和 `tts.disable` 切換 TTS 偏好設定狀態。
    - `tts.setProvider` 更新偏好的 TTS 提供者。
    - `tts.convert` 執行一次性文字轉語音轉換。

  </Accordion>

  <Accordion title="Secrets, config, update, and wizard">
    - `secrets.reload` 重新解析有效的 SecretRef，並僅在完全成功時交換運行時密鑰狀態。
    - `secrets.resolve` 解析特定指令/目標集的指令目標密鑰分配。
    - `config.get` 返回當前配置快照和雜湊值。
    - `config.set` 寫入已驗證的配置負載。
    - `config.patch` 合併部分配置更新。
    - `config.apply` 驗證並替換完整的配置負載。
    - `config.schema` 返回由控制 UI 和 CLI 工具使用的即時配置架構負載：架構、`uiHints`、版本和生成元數據，包括運行時可以加載時的外掛程式 + 通道架構元數據。該架構包含從 UI 使用的相同標籤和幫助文本派生的欄位 `title` / `description` 元數據，包括巢狀物件、萬用字元、陣列項目，以及當存在匹配欄位文檔時的 `anyOf` / `oneOf` / `allOf` 組合分支。
    - `config.schema.lookup` 返回一個配置路徑的路徑範圍查找負載：標準化路徑、淺層架構節點、匹配的提示 + `hintPath`、可選的 `reloadKind`，以及用於 UI/CLI 鑽取的直接子摘要。`reloadKind` 是 `restart`、`hot` 或 `none` 之一，並反映所請求路徑的 Gateway 配置重新載入計劃器。查找架構節點保留面向用戶的文檔和常見驗證欄位（`title`、`description`、`type`、`enum`、`const`、`format`、`pattern`、數值/字串/陣列/物件邊界，以及諸如 `additionalProperties`、`deprecated`、`readOnly`、`writeOnly` 等標誌）。子摘要公開 `key`、標準化的 `path`、`type`、`required`、`hasChildren`、可選的 `reloadKind`，加上匹配的 `hint` / `hintPath`。
    - `update.run` 執行 Gateway 更新流程，並僅在更新本身成功時排程重新啟動；具有會話的調用者可以包含 `continuationMessage`，以便啟動通過重新啟動繼續佇列恢復一個後續代理週期。來自控制平面的套件管理器更新使用分離的託管服務移交，而不是替換即時 Gateway 內部的套件樹。已啟動的移交返回帶有 `result.reason: "managed-service-handoff-started"` 和 `handoff.status: "started"` 的 `ok: true`；不可用或失敗的移交返回帶有 `managed-service-handoff-unavailable` 或 `managed-service-handoff-failed` 的 `ok: false`，加上需要手動 shell 更新時的 `handoff.command`。在已啟動的移交期間，重新啟動哨兵可能會簡要報告 `stats.reason: "restart-health-pending"`；延續將延遲，直到 CLI 驗證重新啟動的 Gateway 並寫入最終的 `ok` 哨兵。
    - `update.status` 返回最新的快取更新重新啟動哨兵，包括可用時的重新啟動後運行版本。
    - `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 通過 WS RPC 公開入門嚮導。

  </Accordion>

  <Accordion title="Agent and workspace helpers">
    - `agents.list` 傳回已設定的代理程式條目，包括有效的模型和執行時期中繼資料。
    - `agents.create`、`agents.update` 和 `agents.delete` 管理代理程式記錄和工作區連線。
    - `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理為代理程式公開的啟動工作區檔案。
    - `tasks.list`、`tasks.get` 和 `tasks.cancel` 向 SDK 和操作員客戶端公開 Gateway 任務分類帳。
    - `artifacts.list`、`artifacts.get` 和 `artifacts.download` 公開針對明確的 `sessionKey`、`runId` 或 `taskId` 範圍所衍生的文字記錄摘要與下載。執行和任務查詢會在伺服器端解析擁有的會話，並僅傳回具有相符來源的記錄媒體；不安全或本機 URL 來源會傳回不支援的下載，而不是在伺服器端擷取。
    - `environments.list` 和 `environments.status` 向 SDK 客戶端公開唯讀的 Gateway 本地和節點環境探索功能。
    - `agent.identity.get` 傳回代理程式或會話的有效助理身分。
    - `agent.wait` 等待執行完成，並在可用時傳回終端快照。

  </Accordion>

  <Accordion title="會話控制">
    - `sessions.list` 會傳回目前的會話索引，當設定代理程式執行時間後端時，還包含每列 `agentRuntime` 中繼資料。
    - `sessions.subscribe` 和 `sessions.unsubscribe` 切換目前 WS 用戶端的會話變更事件訂閱。
    - `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 切換單一會話的文字紀錄/訊息事件訂閱。
    - `sessions.preview` 傳回特定會話金鑰的有限文字紀錄預覽。
    - `sessions.describe` 傳回指定會話金鑰的單一 Gateway 會話列。
    - `sessions.resolve` 解析或正規化會話目標。
    - `sessions.create` 建立新的會話項目。
    - `sessions.send` 將訊息傳送至現有會話。
    - `sessions.steer` 是作用中會話的中斷並導向變體。
    - `sessions.abort` 中止會話的作用中工作。呼叫者可以傳遞 `key` 加上選用的 `runId`，或是僅傳遞 `runId`，讓 Gateway 解析為會話的作用中執行。
    - `sessions.patch` 更新會話中繼資料/覆寫，並回報已解析的正規模型加上有效的 `agentRuntime`。
    - `sessions.reset`、`sessions.delete` 和 `sessions.compact` 執行會話維護。
    - `sessions.get` 傳回完整的已儲存會話列。
    - 聊天執行仍使用 `chat.history`、`chat.send`、`chat.abort` 和 `chat.inject`。`chat.history` 已針對 UI 用戶端進行顯示正規化：內聯指令標籤會從可見文字中移除，純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>`，以及截斷的工具呼叫區塊）和洩漏的 ASCII/全形模型控制權杖會被移除，純靜音權杖助手列（例如精確的 `NO_REPLY` / `no_reply`）會被省略，而過大的列可以由預留位置取代。
    - `chat.message.get` 是單一可見文字紀錄項目的累加有限完整訊息讀取器。用戶端傳遞 `sessionKey`，當會話選擇為代理程式範圍時則加上選用的 `agentId`，以及先前透過 `chat.history` 呈現的文字紀錄 `messageId`，而當儲存的項目仍存在且未過大時，Gateway 會傳回相同的顯示正規化投影，沒有輕量級歷史截斷上限。

  </Accordion>

  <Accordion title="裝置配對與裝置權杖">
    - `device.pair.list` 會傳回待處理與已核准的配對裝置。
    - `device.pair.approve`、`device.pair.reject` 和 `device.pair.remove` 用於管理裝置配對記錄。
    - `device.token.rotate` 會在其已核准的角色和呼叫者範圍界限內輪替配對裝置的權杖。
    - `device.token.revoke` 會在其已核准的角色和呼叫者範圍界限內撤銷配對裝置的權杖。

  </Accordion>

  <Accordion title="節點配對、調用與待處理工作">
    - `node.pair.request`、`node.pair.list`、`node.pair.approve`、`node.pair.reject`、`node.pair.remove` 和 `node.pair.verify` 涵蓋了節點配對與啟動驗證。
    - `node.list` 和 `node.describe` 會傳回已知/已連接的節點狀態。
    - `node.rename` 會更新配對節點的標籤。
    - `node.invoke` 會將指令轉發給已連接的節點。
    - `node.invoke.result` 會傳回調用請求的結果。
    - `node.event` 會將源自節點的事件帶回到閘道。
    - `node.pending.pull` 和 `node.pending.ack` 是已連接節點的佇列 API。
    - `node.pending.enqueue` 和 `node.pending.drain` 用於管理離線/已中斷連線節點的持久性待處理工作。

  </Accordion>

  <Accordion title="審核家族">
    - `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和 `exec.approval.resolve` 涵蓋一次性執行審核請求以及待處理審核的查詢/重播。
    - `exec.approval.waitDecision` 等待一個待處理的執行審核並傳回最終決定（或在逾時時傳回 `null`）。
    - `exec.approvals.get` 和 `exec.approvals.set` 管理閘道執行審核策略快照。
    - `exec.approvals.node.get` 和 `exec.approvals.node.set` 透過節點中繼指令管理節點本機執行審核策略。
    - `plugin.approval.request`、`plugin.approval.list`、`plugin.approval.waitDecision` 和 `plugin.approval.resolve` 涵蓋外掛程式定義的審核流程。

  </Accordion>

  <Accordion title="自動化、技能和工具">
    - 自動化：`wake` 排定立即或下次心跳喚醒的文字注入；`cron.get`、`cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、`cron.run` 和 `cron.runs` 管理排定的工作。
    - `cron.run` 仍是手動執行的佇列式 RPC。需要完成語意的客戶端應讀取傳回的 `runId` 並輪詢 `cron.runs`。
    - `cron.runs` 接受可選的非空 `runId` 篩選器，因此客戶端可以追蹤一個佇列中的手動執行，而不會與同一工作的其他歷史記錄項目產生競爭。
    - 技能和工具：`commands.list`、`skills.*`、`tools.catalog`、`tools.effective`、`tools.invoke`。

  </Accordion>
</AccordionGroup>

### 常見事件系列

- `chat`: UI 聊天更新，例如 `chat.inject` 以及其他僅限逐字稿的聊天
  事件。在協議 v4 中，增量承載攜帶 `deltaText`；`message` 保持
  為累積的助理快照。非前綴替換會設定 `replace=true`
  並使用 `deltaText` 作為替換文字。
- `session.message`、`session.operation` 和 `session.tool`：已訂閱
  會話的逐字稿、進行中的會話操作和事件串流更新。
- `sessions.changed`：會話索引或中繼資料已變更。
- `presence`：系統在場快照更新。
- `tick`：週期性保活 / 活性事件。
- `health`：閘道健康狀態快照更新。
- `heartbeat`：心跳事件串流更新。
- `cron`： cron 執行/工作變更事件。
- `shutdown`：閘道關閉通知。
- `node.pair.requested` / `node.pair.resolved`：節點配對生命週期。
- `node.invoke.request`：節點調用請求廣播。
- `device.pair.requested` / `device.pair.resolved`：配對裝置生命週期。
- `voicewake.changed`：喚醒詞觸發配置已變更。
- `exec.approval.requested` / `exec.approval.resolved`：執行核准
  生命週期。
- `plugin.approval.requested` / `plugin.approval.resolved`：外掛程式核准
  生命週期。

### 節點輔助方法

- 節點可以呼叫 `skills.bins` 來取得當前的技能可執行檔列表
  以進行自動允許檢查。

### 任務分類帳 RPC

操作員用戶端可以透過任務分類帳 RPC 檢查並取消閘道背景任務記錄。這些方法會回傳經過清理的任務摘要，而非原始
執行時狀態。

- `tasks.list` 需要 `operator.read`。
  - 參數：可選 `status` (`"queued"`、`"running"`、`"completed"`、
    `"failed"`、`"cancelled"` 或 `"timed_out"`) 或這些狀態的陣列，
    可選 `agentId`、可選 `sessionKey`、可選 `limit` 從 `1` 到
    `500`，以及可選字串 `cursor`。
  - 結果：`{ "tasks": TaskSummary[], "nextCursor"?: string }`。
- `tasks.get` 需要 `operator.read`。
  - 參數：`{ "taskId": string }`。
  - 結果：`{ "task": TaskSummary }`。
  - 遺失的任務 id 會回傳閘道找不到的錯誤格式。
- `tasks.cancel` 需要 `operator.write`。
  - 參數：`{ "taskId": string, "reason"?: string }`。
  - 結果：
    `{ "found": boolean, "cancelled": boolean, "reason"?: string, "task"?: TaskSummary }`。
  - `found` 回報帳本是否有符合的任務。`cancelled`
    回報執行時是否接受或記錄取消。

`TaskSummary` 包含 `id`、`status` 和可選元數據，例如 `kind`、
`runtime`、`title`、`agentId`、`sessionKey`、`childSessionKey`、`ownerKey`、
`runId`、`taskId`、`flowId`、`parentTaskId`、`sourceId`、時間戳記、進度、
終端摘要和已清理的錯誤文本。

### 操作員輔助方法

- 操作員可以呼叫 `commands.list` (`operator.read`) 以取得代理程式的
  執行時命令清單。
  - `agentId` 是可選的；省略它以讀取預設代理程式工作區。
  - `scope` 控制主要 `name` 的目標介面：
    - `text` 傳回主要文本命令 token，不含前導 `/`
    - `native` 和預設的 `both` 路徑會在可用時返回供應商感知的原生名稱
  - `textAliases` 攜帶精確的斜線別名，例如 `/model` 和 `/m`。
  - 當存在供應商感知的原生命令名稱時，`nativeName` 會攜帶該名稱。
  - `provider` 是可選的，且僅影響原生命名以及原生外掛程式命令的可用性。
  - `includeArgs=false` 會從回應中省略序列化的參數元資料。
- 操作員可以呼叫 `tools.catalog` (`operator.read`) 來擷取代理程式的執行階段工具目錄。回應包含分組的工具和來源元資料：
  - `source`：`core` 或 `plugin`
  - `pluginId`：當 `source="plugin"` 時為外掛程式擁有者
  - `optional`：外掛程式工具是否為可選
- 操作員可以呼叫 `tools.effective` (`operator.read`) 來擷取工作階段的執行階段有效工具清單。
  - `sessionKey` 是必需的。
  - 閘道是從伺服器端的工作階段衍生受信任的執行時期內容，而不是接受呼叫者提供的驗證或傳遞內容。
  - 回應是作用中清單的會話範圍伺服器衍生投影，包含核心、外掛、通道以及已探索的 MCP 伺服器工具。
  - `tools.effective` 對於 MCP 是唯讀的：它可以透過最終工具策略投影暖工作階段 MCP 目錄，但不會建立 MCP 執行時、連接傳輸或發出 `tools/list`。如果不存在匹配的暖目錄，回應可能包含通知，例如 `mcp-not-yet-connected`、`mcp-not-yet-listed` 或 `mcp-stale-catalog`。
  - 有效的工具項目使用 `source="core"`、`source="plugin"`、`source="channel"` 或 `source="mcp"`。
- 操作員可以呼叫 `tools.invoke` (`operator.write`) 透過與 `/tools/invoke` 相同的閘道策略路徑來叫用一個可用工具。
  - `name` 是必填的。`args`、`sessionKey`、`agentId`、`confirm` 和
    `idempotencyKey` 是選填的。
  - 如果同時存在 `sessionKey` 和 `agentId`，解析出的 session agent 必須符合
    `agentId`。
  - 回應是一個面向 SDK 的封包，包含 `ok`、`toolName`、選填的 `output` 以及具類型的
    `error` 欄位。核准或策略拒絕會在 payload 中回傳 `ok:false`，而不是
    繞過 gateway tool policy pipeline。
- Operators 可以呼叫 `skills.status` (`operator.read`) 以取得
  agent 的可見技能清單。
  - `agentId` 是選填的；省略它以讀取預設 agent 工作區。
  - 回應包括資格、缺失需求、配置檢查以及
    經過清理的安裝選項，而不會暴露原始秘密值。
- Operators 可以呼叫 `skills.search` 和 `skills.detail` (`operator.read`) 以取得
  ClawHub 探索中繼資料。
- Operators 可以呼叫 `skills.upload.begin`、`skills.upload.chunk` 和
  `skills.upload.commit` (`operator.admin`) 以在安裝私人技能封存前進行暫存。這是一個供受信任用戶端使用的獨立管理員上傳路徑，
  並非一般的 ClawHub 技能安裝流程，且預設為停用，除非
  `skills.install.allowUploadedArchives` 已啟用。
  - `skills.upload.begin({ kind: "skill-archive", slug, sizeBytes, sha256?, force?, idempotencyKey? })`
    會建立一個繫結至該 slug 與 force 值的上傳。
  - `skills.upload.chunk({ uploadId, offset, dataBase64 })` 會在
    準確的解碼偏移位置附加位元組。
  - `skills.upload.commit({ uploadId, sha256? })` 會驗證最終大小與
    SHA-256。Commit 僅會完成上傳；它不會安裝該技能。
  - 已上傳的技能封存是包含 `SKILL.md` 根目錄的 zip 封存。
    封存內部的目錄名稱從不決定安裝目標。
- Operators 可以三種模式呼叫 `skills.install` (`operator.admin`)：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 會將
    技能資料夾安裝至預設 agent 工作區的 `skills/` 目錄中。
  - 上傳模式：`{ source: "upload", uploadId, slug, force?, sha256?, timeoutMs? }`
    將已提交的上傳安裝至預設 agent workspace `skills/<slug>`
    目錄。slug 和 force 值必須符合原始
    `skills.upload.begin` 請求。除非啟用
    `skills.install.allowUploadedArchives`，否則會拒絕此模式。此設定不會
    影響 ClawHub 安裝。
  - Gateway 安裝程式模式：`{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }`
    在 gateway 主機上執行宣告的 `metadata.openclaw.install` 動作。
- 操作者可透過兩種模式呼叫 `skills.update` (`operator.admin`)：
  - ClawHub 模式會更新預設代理工作區中的一個追蹤 slug 或所有已追蹤的 ClawHub 安裝。
  - 設定模式會修補 `skills.entries.<skillKey>` 值，例如 `enabled`、
    `apiKey` 和 `env`。

### `models.list` 檢視

`models.list` 接受一個可選的 `view` 參數：

- 省略或 `"default"`：目前的執行時行為。若已設定 `agents.defaults.models`，回應為允許的目錄，包括針對 `provider/*` 項目動態探索的模型。否則回應為完整的 Gateway 目錄。
- `"configured"`：選擇器大小的行為。若已設定 `agents.defaults.models`，它仍優先，包括針對 `provider/*` 項目的提供者範圍探索。若無允許清單，回應會使用明確的 `models.providers.*.models` 項目，僅在沒有已設定的模型資料列時才回退至完整目錄。
- `"all"`：完整的 Gateway 目錄，繞過 `agents.defaults.models`。將此用於診斷和探索 UI，而非一般的模型選擇器。

## 執行核准

- 當 exec 請求需要批准時，gateway 會廣播 `exec.approval.requested`。
- 操作者客戶端透過呼叫 `exec.approval.resolve` 來解決（需要 `operator.approvals` 範圍）。
- 對於 `host=node`，`exec.approval.request` 必須包含 `systemRunPlan`（規範 `argv`/`cwd`/`rawCommand`/session 元資料）。缺少 `systemRunPlan` 的請求會被拒絕。
- 批准後，轉發的 `node.invoke system.run` 呼叫會重複使用該規範
  `systemRunPlan` 作為授權的 command/cwd/session 上下文。
- 如果呼叫者在 prepare 和最終批准的 `system.run` 轉發之間變更了 `command`、`rawCommand`、`cwd`、`agentId` 或
  `sessionKey`，閘道會拒絕該次執行，而不是信任變更後的 payload。

## Agent 傳送遞補

- `agent` 請求可以包含 `deliver=true` 以請求出站傳遞。
- `bestEffortDeliver=false` 保持嚴格行為：未解析或僅限內部的傳遞目標會傳回 `INVALID_REQUEST`。
- 當無法解析外部可傳遞路由時（例如內部/webchat 會話或不明確的多通道配置），`bestEffortDeliver=true` 允許退回到僅限會話的執行。
- 最終的 `agent` 結果在請求傳遞時可能包含 `result.deliveryStatus`，
  使用與 [`openclaw agent --json --deliver`](/zh-Hant/cli/agent#json-delivery-status) 中記錄的相同 `sent`、`suppressed`、`partial_failed` 和 `failed`
  狀態。

## 版本控制

- `PROTOCOL_VERSION` 位於 `packages/gateway-protocol/src/version.ts` 中。
- 用戶端發送 `minProtocol` + `maxProtocol`；伺服器會拒絕不包含
  其目前協定版本的範圍。目前的用戶端和伺服器需要協定 v4。
- Schema + 模型是從 TypeBox 定義生成的：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### 客戶端常數

`src/gateway/client.ts` 中的參考客戶端使用這些預設值。這些值在 protocol v4 中保持穩定，並且是第三方客戶端的預期基準。

| 常數                                  | 預設值                                        | 來源                                                                                       |
| ------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `PROTOCOL_VERSION`                    | `4`                                           | `packages/gateway-protocol/src/version.ts`                                                 |
| `MIN_CLIENT_PROTOCOL_VERSION`         | `4`                                           | `packages/gateway-protocol/src/version.ts`                                                 |
| 請求逾時 (每個 RPC)                   | `30_000` ms                                   | `src/gateway/client.ts` (`requestTimeoutMs`)                                               |
| 預先驗證 / 連線挑戰逾時               | `15_000` ms                                   | `src/gateway/handshake-timeouts.ts` (config/env can raise the paired server/client budget) |
| 初始重新連線退避                      | `1_000` ms                                    | `src/gateway/client.ts` (`backoffMs`)                                                      |
| 最大重新連線退避                      | `30_000` ms                                   | `src/gateway/client.ts` (`scheduleReconnect`)                                              |
| 裝置權杖關閉後的快速重試限制          | `250` ms                                      | `src/gateway/client.ts`                                                                    |
| 在 `terminate()` 之前的強制停止寬限期 | `250` ms                                      | `FORCE_STOP_TERMINATE_GRACE_MS`                                                            |
| `stopAndWait()` 預設逾時              | `1_000` ms                                    | `STOP_AND_WAIT_TIMEOUT_MS`                                                                 |
| 預設 tick 間隔 (pre `hello-ok`)       | `30_000` ms                                   | `src/gateway/client.ts`                                                                    |
| Tick-逾時關閉                         | 當靜默超過 `tickIntervalMs * 2` 時回傳 `4000` | `src/gateway/client.ts`                                                                    |
| `MAX_PAYLOAD_BYTES`                   | `25 * 1024 * 1024` (25 MB)                    | `src/gateway/server-constants.ts`                                                          |

伺服器在 `hello-ok` 中通告有效的 `policy.tickIntervalMs`、`policy.maxPayload` 和 `policy.maxBufferedBytes`；客戶端應該遵守這些值，而不是交握前的預設值。

## 驗證

- 共用金鑰閘道驗證使用 `connect.params.auth.token` 或 `connect.params.auth.password`，具體取決於已配置的驗證模式。
- 承載身分的模式，例如 Tailscale Serve (`gateway.auth.allowTailscale: true`) 或非本地迴路 `gateway.auth.mode: "trusted-proxy"`，會從請求標頭滿足連線驗證檢查，而不是使用 `connect.params.auth.*`。
- Private-ingress `gateway.auth.mode: "none"` 會完全跳過 shared-secret 連線驗證；請勿在公開或不受信任的 ingress 上公開該模式。
- 配對後，Gateway 會發出一個範圍限定於連線 role + scopes 的 **device token**。它會在 `hello-ok.auth.deviceToken` 中返回，客戶端應將其保存以供未來連線使用。
- 客戶端應在任何成功連線後保存主要的 `hello-ok.auth.deviceToken`。
- 使用該 **已儲存** 的裝置權杖重新連線時，也應重複使用為該權杖儲存
  的已批准範圍集。這保留了已授予的讀取/探測/狀態存取權，
  並避免將重新連線靜默收斂為
  狹窄的隱含僅限管理員範圍。
- 客戶端連線驗證組裝（`selectConnectAuth` 於
  `src/gateway/client.ts` 中）：
  - `auth.password` 是正交的，且在設定時總是會被轉發。
  - `auth.token` 按優先順序填入：首先是明確的 shared token，
    然後是明確的 `deviceToken`，最後是儲存的每個裝置 token（以
    `deviceId` + `role` 為鍵值）。
  - 僅當上述方法均未解析出
    `auth.token` 時，才會發送 `auth.bootstrapToken`。如果有 shared token 或任何已解析的裝置 token，則會抑制發送。
  - 在單次 `AUTH_TOKEN_MISMATCH` 重試上自動提升儲存的裝置 token 僅限於 **受信任的端點** —
    loopback，或具有固定 `tlsFingerprint` 的 `wss://`。沒有固定的公開 `wss://`
    不符合資格。
- 內建的 setup-code bootstrap 會在 `hello-ok.auth.deviceTokens` 中傳回主要節點
  `hello-ok.auth.deviceToken` 以及一個有限的 operator token，用於受信任的行動裝置移交。operator token
  包含 `operator.talk.secrets` 用於原生 Talk 配置讀取，並排除
  `operator.admin` 和 `operator.pairing`。
- 當非基準的 setup-code bootstrap 等待核准時，`PAIRING_REQUIRED`
  詳細資訊包括 `recommendedNextStep: "wait_then_retry"`、`retryable: true`
  和 `pauseReconnect: false`。客戶端應繼續使用相同的 bootstrap token 重新連線，直到請求被核准或 token 變得無效。
- 僅當連線在 `wss://` 或 loopback/local 配對等受信任的傳輸上使用啟動授權 時，才持續儲存 `hello-ok.auth.deviceTokens`。
- 如果用戶端提供**明確的** `deviceToken` 或明確的 `scopes`，該呼叫者請求的範圍集將保持權威性；僅當用戶端重用儲存的每裝置權杖時，才會重用快取的範圍。
- 可以透過 `device.token.rotate` 和 `device.token.revoke` 輪替/撤銷裝置權杖（需要 `operator.pairing` 範圍）。輪替或撤銷節點或其他非運算者角色也需要 `operator.admin`。
- `device.token.rotate` 會傳回輪替中繼資料。它僅對已經使用該裝置權杖進行驗證的相同裝置呼叫回應替換的持有人權杖，因此僅使用權杖的用戶端可以在重新連線之前持續儲存其替換權杖。共用/管理員輪替不會回應持有人權杖。
- 權杖的核發、輪替和撤銷僅限於記錄在該裝置配對條目中已核准的角色集合；權杖變更無法擴充或以配對核准從未授予的裝置角色為目標。
- 對於配對裝置權杖階段，裝置管理僅限自身範圍，除非呼叫者也具有 `operator.admin`：非管理員呼叫者只能管理其**自己**裝置條目的運算者權杖。節點和其他非運算者權杖管理僅限管理員，即使對於呼叫者自己的裝置也是如此。
- `device.token.rotate` 和 `device.token.revoke` 也會根據呼叫者的目前階段範圍檢查目標運算者權杖範圍集。非管理員呼叫者無法輪替或撤銷比其目前持有的範圍更廣的運算者權杖。
- 授權失敗包括 `error.details.code` 以及復原提示：
  - `error.details.canRetryWithDeviceToken` (布林值)
  - `error.details.recommendedNextStep` (`retry_with_device_token`、`update_auth_configuration`、`update_auth_credentials`、`wait_then_retry`、`review_auth_configuration`)
- 針對 `AUTH_TOKEN_MISMATCH` 的用戶端行為：
  - 受信任的客戶端可以使用快取的每裝置權杖嘗試一次有界重試。
  - 如果該重試失敗，客戶端應停止自動重新連線迴圈，並向操作員顯示操作指引。
- `AUTH_SCOPE_MISMATCH` 表示識別出裝置權杖，但其未涵蓋請求的角色/範圍。用戶端不應將此顯示為錯誤的權杖；應提示運算者重新配對或批准較窄/較廣的範圍合約。

## 裝置身分識別 + 配對

- 節點應包含穩定的裝置識別身份（`device.id`），其衍生自金鑰對指紋。
- 閘道會發出每裝置 + 角色的權杖。
- 除非啟用了本機自動核准，否則新裝置 ID 需要配對核准。
- 配對自動核准是以直接本機回送連線為中心。
- OpenClaw 也針對受信任的共用金鑰輔助流程，提供了一個狹隘的後端/容器本機自連線路徑。
- 同主機 tailnet 或 LAN 連線在配對時仍被視為遠端連線，並需要核准。
- WS 客戶端通常在 `connect` 期間包含 `device` 識別身份（操作員 + 節點）。唯一無裝置的操作員例外情況屬於明確信任路徑：
  - `gateway.controlUi.allowInsecureAuth=true` 用於僅限本地主機的不安全 HTTP 相容性。
  - 成功的 `gateway.auth.mode: "trusted-proxy"` 操作員 Control UI 認證。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true`（緊急破窗，嚴重的安全性降級）。
  - 使用共用的 gateway token/password 進行驗證的直接迴路 `gateway-client` 後端 RPC。
- 省略裝置識別身份會對範圍產生後果。當 Control UI 連線缺少裝置識別身份時，`shouldClearUnboundScopesForMissingDeviceIdentity` 會將自行宣告的範圍清除為空集合，適用於 token、password 和 trusted-proxy 認證。此連線在明確信任路徑上是被允許的，但受範圍限制的方法會失敗。例外情況是具有 `allowInsecureAuth` 的本機 Control UI token/password 工作階段，這些會保留範圍。對於其他情況，僅將 `gateway.controlUi.dangerouslyDisableDeviceAuth=true` 設定為緊急破窗的範圍保留路徑。
- 所有連線都必須簽署伺服器提供的 `connect.challenge` nonce。

### 裝置認證遷移診斷

對於仍使用預先挑戰簽署行為的舊版客戶端，`connect` 現在會在 `error.details.code` 下傳回具有穩定 `error.details.reason` 的 `DEVICE_AUTH_*` 詳細代碼。

常見的遷移失敗：

| 訊息                        | details.code                     | details.reason           | 含義                                        |
| --------------------------- | -------------------------------- | ------------------------ | ------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客戶端省略了 `device.nonce`（或發送空白）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客戶端使用了過時/錯誤的 nonce 進行簽署。    |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 簽署載荷與 v2 載荷不符。                    |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 簽署的時間戳超出允許的偏差範圍。            |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 與公鑰指紋不符。                |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公鑰格式/正規化失敗。                       |

遷移目標：

- 請務必等待 `connect.challenge`。
- 對包含伺服器 nonce 的 v2 載荷進行簽署。
- 在 `connect.params.device.nonce` 中傳送相同的 nonce。
- 建議的簽署 Payload 是 `v3`，它會綁定 `platform` 和 `deviceFamily`，
  除此之外還包含 device/client/role/scopes/token/nonce 欄位。
- 為了相容性，舊版 `v2` 簽署仍被接受，但在重新連線時，配對裝置的元數據固定（pinning）仍會控制指令政策。

## TLS + 憑證固定

- WS 連線支援 TLS。
- 用戶端可以選擇性地固定（pin）閘道憑證指紋（請參閱 `gateway.tls`
  設定加上 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 範圍

此協定公開了**完整的閘道 API**（狀態、頻道、模型、聊天、
代理、會話、節點、審批等）。確切的介面範圍由 `packages/gateway-protocol/src/schema.ts` 中的 TypeBox schemas 定義。

## 相關連結

- [橋接協定](/zh-Hant/gateway/bridge-protocol)
- [閘道執行手冊](/zh-Hant/gateway)
