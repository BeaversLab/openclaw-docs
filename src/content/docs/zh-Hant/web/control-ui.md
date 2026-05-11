---
summary: "Gateway 的瀏覽器型控制介面 (聊天、節點、設定)"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "控制介面"
sidebarTitle: "控制介面"
---

Control UI 是一個由 Gateway 提供的輕量級 **Vite + Lit** 單頁應用程式：

- 預設值： `http://<host>:18789/`
- 可選前綴：設定 `gateway.controlUi.basePath` (例如 `/openclaw`)

它會在相同連接埠上**直接與 Gateway WebSocket 通訊**。

## 快速開啟（本機）

如果 Gateway 正在同一台電腦上執行，請開啟：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (或 [http://localhost:18789/](http://localhost:18789/))

如果頁面載入失敗，請先啟動 Gateway： `openclaw gateway`。

驗證資訊會在 WebSocket 交握期間透過以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 當 `gateway.auth.allowTailscale: true` 時傳送 Tailscale Serve 身分標頭
- 當 `gateway.auth.mode: "trusted-proxy"` 時傳送 trusted-proxy 身分標頭

儀表板設定面板會為目前的瀏覽器分頁階段和選定的 Gateway URL 保留一個權杖；密碼不會被保存。上線流程通常會在首次連線時產生一個用於共享金鑰驗證的 Gateway 權杖，但當 `gateway.auth.mode` 是 `"password"` 時，密碼驗證也可以使用。

## 裝置配對（首次連線）

當您從新的瀏覽器或裝置連線到控制介面時，Gateway 通常需要 **一次性配對核准**。這是防止未經授權存取的安全措施。

**您會看到的畫面：**「disconnected (1008): pairing required」（已中斷連線 (1008)：需要配對）

<Steps>
  <Step title="列出待處理請求">
    ```bash
    openclaw devices list
    ```
  </Step>
  <Step title="依請求 ID 核准">
    ```bash
    openclaw devices approve <requestId>
    ```
  </Step>
</Steps>

如果瀏覽器以變更後的驗證詳細資訊 (角色/範圍/公開金鑰) 重試配對，先前的待處理請求將被取代，並建立一個新的 `requestId`。請在核准前重新執行 `openclaw devices list`。

如果瀏覽器已經配對，並且您將其從讀取權限變更為寫入/管理員權限，這會被視為核准升級，而不是靜默重新連線。OpenClaw 會保持舊的核准有效，阻檔更廣泛的重新連線，並要求您明確核准新的範圍集。

一旦核准，該裝置會被記住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤銷它，否則不需要重新核准。關於權杖輪替和撤銷，請參閱 [Devices CLI](/zh-Hant/cli/devices)。

<Note>
  - 直接的本機回環瀏覽器連線 (`127.0.0.1` / `localhost`) 會自動獲得核准。 - 當 `gateway.auth.allowTailscale: true`、Tailscale 身份驗證通過，且瀏覽器呈現其裝置身份時，Tailscale Serve 可以跳過 Control UI 操作員工作階段的配對往返。 - 直接的 Tailnet 綁定、LAN 瀏覽器連線，以及沒有裝置身份的瀏覽器設定檔仍然需要明確核准。 - 每個瀏覽器設定檔都會產生唯一的裝置
  ID，因此切換瀏覽器或清除瀏覽器資料將需要重新配對。
</Note>

## 個人身份 (瀏覽器本機)

Control UI 支援針對每個瀏覽器的個人身份 (顯示名稱和大頭照)，附加到外傳訊息上以便在共用工作階段中進行歸屬標記。它儲存在瀏覽器儲存空間中，範圍僅限於目前的瀏覽器設定檔，並且不會同步到其他裝置，也不會在伺服器端持久保存，僅保留您實際發送訊息上的正常逐字稿作者中繼資料。清除網站資料或切換瀏覽器會將其重設為空白。

相同的瀏覽器本機模式也適用於助理大頭照覆寫。上傳的助理大頭照只會在本機瀏覽器上覆蓋閘道解析的身份，絕不會透過 `config.patch` 進行往返。共用的 `ui.assistant.avatar` 設定欄位仍然可供直接寫入該欄位的非 UI 用戶端使用 (例如腳本化閘道或自訂儀表板)。

## 執行時期設定端點

Control UI 會從 `/__openclaw/control-ui-config.json` 擷取其執行時期設定。該端點受到與 HTTP 表面其餘部分相同的閘道驗證保護：未經驗證的瀏覽器無法擷取它，而成功的擷取需要已有效的閘道權杖/密碼、Tailscale Serve 身份或受信任 Proxy 身份。

## 語言支援

Control UI 可以在初次載入時根據您的瀏覽器語言地區自動進行在地化。若要稍後變更，請前往 **Overview -> Gateway Access -> Language**。語言地區選擇器位於 Gateway Access 卡片中，而非在 Appearance 下。

- 支援的語言地區：`en`、`zh-CN`、`zh-TW`、`pt-BR`、`de`、`es`、`ja-JP`、`ko`、`fr`、`tr`、`uk`、`id`、`pl`、`th`
- 非英文翻譯會在瀏覽器中以延遲載入的方式載入。
- 選取的語言地區會儲存在瀏覽器儲存空間中，並在下次造訪時重複使用。
- 遺漏的翻譯鍵會回退至英文。

## 外觀主題

外觀面板保留了內建的 Claw、Knot 和 Dash 主題，加上一個瀏覽器本地的 tweakcn 匯入位置。若要匯入主題，請開啟 [tweakcn themes](https://tweakcn.com/themes)，選擇或建立主題，點擊 **分享**，然後將複製的主題連結貼上到外觀中。匯入工具也接受 `https://tweakcn.com/r/themes/<id>` 註冊表 URL、編輯器 URL（如 `https://tweakcn.com/editor/theme?theme=amethyst-haze`）、相對 `/themes/<id>` 路徑、原始主題 ID，以及預設主題名稱（如 `amethyst-haze`）。

匯入的主題僅儲存在目前的瀏覽器設定檔中。它們不會寫入 Gateway 設定，也不會在裝置間同步。取代匯入的主題會更新該本地位置；如果匯入的主題目前已被選取，清除它會將使用中主題切換回 Claw。

## 功能介紹（目前）

<AccordionGroup>
  <Accordion title="聊天與對話">
    - 透過 Gateway WS 與模型聊天 (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)。 - 透過瀏覽器即時會話進行對話。OpenAI 使用直接 WebRTC，Google Live 使用透過 WebSocket 的受限一次性瀏覽器權杖，而僅限後端的即時語音外掛程式則使用 Gateway 中繼傳輸。中繼將提供者憑證保留在 Gateway 上，同時瀏覽器透過 `talk.realtime.relay*` RPC 串流麥克風 PCM，並將 `openclaw_agent_consult` 工具呼叫傳回透過
    `chat.send` 以用於較大的已設定 OpenClaw 模型。 - 在聊天中串流工具呼叫 + 即時工具輸出卡片 (代理程式事件)。
  </Accordion>
  <Accordion title="通道、執行個體、會話、夢境">
    - 通道：內建加上捆綁/外部外掛程式通道狀態、QR 登入，以及各通道設定 (`channels.status`, `web.login.*`, `config.patch`)。 - 執行個體：出席清單 + 重新整理 (`system-presence`)。 - 會話：清單 + 各會話模型/思考/快速/詳細/追蹤/推理覆寫 (`sessions.list`, `sessions.patch`)。 - 夢境：作夢狀態、啟用/停用切換，以及夢境日記閱讀器 (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`)。
  </Accordion>
  <Accordion title="Cron、技能、節點、執行核准">- Cron 工作：清單/新增/編輯/執行/啟用/停用 + 執行歷程 (`cron.*`)。 - 技能：狀態、啟用/停用、安裝、API 金鑰更新 (`skills.*`)。 - 節點：清單 + 功能 (`node.list`)。 - 執行核准：編輯 gateway 或節點允許清單 + 詢問 `exec host=gateway/node` 的原則 (`exec.approvals.*`)。</Accordion>
  <Accordion title="Config">
    - 查看/編輯 `~/.openclaw/openclaw.json` (`config.get`, `config.set`)。 - 套用 + 驗證後重啟 (`config.apply`) 並喚醒最後一個作用中工作階段。 - 寫入包含 base-hash 防護，以防止覆寫並行編輯。 - 寫入 (`config.set`/`config.apply`/`config.patch`) 會預先解析送出設定負載中的參照；未解析的作用中送出參照會在寫入前被拒絕。 - Schema + 表單渲染 (`config.schema` / `config.schema.lookup`，包括欄位 `title` /
    `description`、匹配的 UI 提示、直接子摘要、巢狀物件/萬用字元/陣列/組合節點上的文件元數據，以及可用的插件 + 頻道 schema)；當快照具有安全的原始來回行程時，才能使用原始 JSON 編輯器。 - 如果快照無法安全地進行原始文字來回行程，Control UI 會強制使用表單模式，並停用該快照的原始模式。 - 原始 JSON 編輯器「重設為已儲存」會保留原始編寫的形狀 (格式、註解、`$include`
    版面配置)，而不是重新渲染扁平化的快照，因此當快照可以安全來回行程時，外部編輯在重設後會被保留。 - 結構化的 SecretRef 物件值會在表單文字輸入中呈現為唯讀，以防止意外將物件損毀為字串。
  </Accordion>
  <Accordion title="Debug, logs, update">- Debug：狀態/健康/模型快照 + 事件日誌 + 手動 RPC 呼叫 (`status`, `health`, `models.list`)。 - Logs：含篩選/匯出 (`logs.tail`) 的閘道檔案日誌即時追蹤。 - Update：執行套件/git 更新 + 重啟 (`update.run`) 並提供重啟報告，然後在重新連線後輪詢 `update.status` 以驗證執行中的閘道版本。</Accordion>
  <Accordion title="Cron jobs panel notes">
    - 對於隔離作業，傳遞預設為公告摘要。如果您希望僅在內部執行，可以切換為無。 - 當選擇公告時，會出現頻道/目標欄位。 - Webhook 模式使用 `delivery.mode = "webhook"` 並將 `delivery.to` 設定為有效的 HTTP(S) webhook URL。 - 對於主會話作業，可使用 webhook 和無傳遞模式。 - 進階編輯控制項包括執行後刪除、清除代理覆寫、cron 精確/交錯選項、代理模型/思維覆寫，以及盡力傳遞切換。 -
    表單驗證為內嵌並顯示欄位級錯誤；無效值會停用儲存按鈕直到修正為止。 - 設定 `cron.webhookToken` 以發送專用的 bearer token，如果省略，則 webhook 將在沒有 auth 標頭的情況下發送。 - 已棄用的後備方案：儲存的具有 `notify: true` 的舊版作業在遷移之前仍可使用 `cron.webhook`。
  </Accordion>
</AccordionGroup>

## 聊天行為

<AccordionGroup>
  <Accordion title="Send and history semantics">
    - `chat.send` 是 **非阻塞** 的：它會立即以 `{ runId, status: "started" }` 確認，回應則透過 `chat` 事件串流。
    - 聊天上傳接受圖片和非影片檔案。圖片保留原生圖片路徑；其他檔案則儲存為管理媒體，並在歷史記錄中顯示為附件連結。
    - 使用相同的 `idempotencyKey` 重新傳送，執行時會回傳 `{ status: "in_flight" }`，完成後則回傳 `{ status: "ok" }`。
    - 為了 UI 安全，`chat.history` 回應的大小會受到限制。當文字記錄項目過大時，Gateway 可能會截斷長文字欄位、省略繁重的中繼資料區塊，並以預留位置 (`[chat.history omitted: message too large]`) 取代過大的訊息。
    - 助理/生成的圖片會保存為管理媒體參考，並透過已驗證的 Gateway 媒體 URL 傳回，因此重新載入時不依賴原始 base64 圖片內容保留在聊天歷史記錄回應中。
    - `chat.history` 也會從可見的助理文字中移除僅供顯示的內聯指令標籤 (例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`)、純文字工具呼叫 XML 內容 (包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截斷的工具呼叫區塊)，以及外洩的 ASCII/全形模型控制權杖，並且會省略整個可見文字僅為確切靜音權杖 `NO_REPLY` / `no_reply` 的助理項目。
    - 在進行中的傳送和最終歷史記錄重新整理期間，如果 `chat.history` 暫時回傳較舊的快照，聊天視圖會讓本地樂觀的使用者/助理訊息保持可見；一旦 Gateway 歷史記錄趕上進度，正準的文字記錄會取代那些本地訊息。
    - `chat.inject` 會在會話文字記錄中附加助理備註，並廣播 `chat` 事件以進行僅 UI 的更新 (無代理執行，無通道傳遞)。
    - 聊天標頭的模型與思考選擇器會透過 `sessions.patch` 立即修補使用中的會話；它們是持續的會話覆寫，而非僅適用於單次傳送的選項。
    - 當最新的 Gateway 會話使用量報告顯示高度上下文壓力時，聊天編輯區域會顯示上下文通知，並在建議的壓縮等級下顯示一個壓縮按鈕，用於執行標準的會話壓縮程序。過時的權杖快照會隱藏，直到 Gateway 再次回報最新的使用量。
  </Accordion>
  <Accordion title="Talk mode (browser realtime)">
    Talk mode uses a registered realtime voice provider. Configure OpenAI with `talk.provider: "openai"` plus `talk.providers.openai.apiKey`, or configure Google with `talk.provider: "google"` plus `talk.providers.google.apiKey`; Voice Call realtime provider config can still be reused as the fallback. The browser never receives a standard provider API key. OpenAI receives an ephemeral Realtime client secret for WebRTC. Google Live receives a one-use constrained Live API auth token for a browser WebSocket session, with instructions and tool declarations locked into the token by the Gateway. Providers that only expose a backend realtime bridge run through the Gateway relay transport, so credentials and vendor sockets stay server-side while browser audio moves through authenticated Gateway RPCs. The Realtime session prompt is assembled by the Gateway; `talk.realtime.session` does not accept caller-provided instruction overrides.

    In the Chat composer, the Talk control is the waves button next to the microphone dictation button. When Talk starts, the composer status row shows `Connecting Talk...`, then `Talk live` while audio is connected, or `Asking OpenClaw...` while a realtime tool call is consulting the configured larger model through `chat.send`.

    Maintainer live smoke: `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` verifies the OpenAI browser WebRTC SDP exchange, Google Live constrained-token browser WebSocket setup, and the Gateway relay browser adapter with fake microphone media. The command prints provider status only and does not log secrets.

  </Accordion>
  <Accordion title="停止與中止">
    - 點擊 **Stop**（呼叫 `chat.abort`）。
    - 當執行正在進行時，一般的後續追問會進入佇列。在佇列訊息上點擊 **Steer**，將該後續追問注入到正在進行的輪次中。
    - 輸入 `/stop`（或獨立的中止指令，如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`）以帶外中止。
    - `chat.abort` 支援 `{ sessionKey }`（無 `runId`）以中止該工作階段所有正在進行的執行。
  </Accordion>
  <Accordion title="中止部分內容的保留">
    - 當執行被中止時，部分助理文字仍可在 UI 中顯示。
    - 當存在緩衝輸出時，Gateway 會將中止的部分助理文字持久化到對話紀錄中。
    - 持久化的項目包含中止元數據，因此對話紀錄的消費者可以區分中止的部分內容與正常完成輸出。
  </Accordion>
</AccordionGroup>

## PWA 安裝與 Web 推送

Control UI 附帶一個 `manifest.webmanifest` 和一個 service worker，因此現代瀏覽器可以將其安裝為獨立的 PWA。Web Push 允許 Gateway 即使在分頁或瀏覽器視窗未開啟時，也能透過通知喚醒已安裝的 PWA。

| 表面                                               | 功能說明                                                        |
| -------------------------------------------------- | --------------------------------------------------------------- |
| `ui/public/manifest.webmanifest`                   | PWA 資訊清單。一旦瀏覽器可以存取，就會提供「Install app」選項。 |
| `ui/public/sw.js`                                  | 處理 `push` 事件與通知點擊的 Service Worker。                   |
| `push/vapid-keys.json`（位於 OpenClaw 狀態目錄下） | 自動生成的 VAPID 金鑰對，用於簽署 Web Push 負載。               |
| `push/web-push-subscriptions.json`                 | 持久化的瀏覽器訂閱端點。                                        |

當您想要鎖定金鑰時（用於多主機部署、機密輪替或測試），可以透過 Gateway 程序上的環境變數覆寫 VAPID 金鑰對：

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT`（預設為 `mailto:openclaw@localhost`）

Control UI 使用這些具有範圍限制的 Gateway 方法來註冊和測試瀏覽器訂閱：

- `push.web.vapidPublicKey` — 取得使用中的 VAPID 公鑰。
- `push.web.subscribe` — 註冊 `endpoint` 以及 `keys.p256dh`/`keys.auth`。
- `push.web.unsubscribe` — 移除已註冊的端點。
- `push.web.test` — 發送測試通知至呼叫者的訂閱。

<Note>Web Push 獨立於 iOS APNS 服務路徑（請參閱 [Configuration](/zh-Hant/gateway/configuration) 以取得基於服務的推送），以及現有的 `push.test` 方法，後者是以原生行動裝置配對為目標。</Note>

## 託管內嵌

助理訊息可以使用 `[embed ...]` 簡碼在行內呈現託管的網頁內容。iframe 沙盒原則由 `gateway.controlUi.embedSandbox` 控制：

<Tabs>
  <Tab title="strict">停用託管內嵌中的腳本執行。</Tab>
  <Tab title="scripts (default)">允許互動式內嵌，同時保持來源隔離；這是預設值，通常足以應付獨立的瀏覽器遊戲/小工具。</Tab>
  <Tab title="trusted">在 `allow-scripts` 之上新增 `allow-same-origin`，適用於刻意需要更強權限的同站文件。</Tab>
</Tabs>

範例：

```json5
{
  gateway: {
    controlUi: {
      embedSandbox: "scripts",
    },
  },
}
```

<Warning>僅當內嵌文件確實需要同源行為時才使用 `trusted`。對於大多數由代理程式產生的遊戲和互動式畫布，`scripts` 是更安全的選擇。</Warning>

絕對外部 `http(s)` 內嵌 URL 預設保持封鎖。如果您刻意希望 `[embed url="https://..."]` 載入第三方頁面，請設定 `gateway.controlUi.allowExternalEmbedUrls: true`。

## Tailnet 存取（推薦）

<Tabs>
  <Tab title="整合 Tailscale Serve（首選）">
    讓 Gateway 保持在 loopback 並讓 Tailscale Serve 以 HTTPS 代理它：

    ```bash
    openclaw gateway --tailscale serve
    ```

    開啟：

    - `https://<magicdns>/` （或您設定的 `gateway.controlUi.basePath` ）

    預設情況下，當 `gateway.auth.allowTailscale` 為 `true` 時，Control UI/WebSocket Serve 請求可以透過 Tailscale 身分標頭（ `tailscale-user-login` ）進行驗證。OpenClaw 透過 `tailscale whois` 解析 `x-forwarded-for` 位址並將其與標頭進行比對來驗證身分，並且僅在請求帶有 Tailscale 的 `x-forwarded-*` 標頭且命中 loopback 時才接受這些請求。對於具有瀏覽器裝置身分的 Control UI 操作員工作階段，此驗證過的 Serve 路徑也會跳過裝置配對往返；無裝置瀏覽器和 node 角色連線仍然遵循正常的裝置檢查。如果您想針對 Serve 流量也要求明確的共用金鑰憑證，請設定 `gateway.auth.allowTailscale: false`。然後使用 `gateway.auth.mode: "token"` 或 `"password"`。

    對於該非同步 Serve 身分路徑，相同客戶端 IP 和驗證範圍的失敗驗證嘗試會在速率限制寫入之前序列化。因此，來自同一個瀏覽器的並發錯誤重試可能會在第二次請求時顯示 `retry later`，而不是兩個單純的不匹配並行競爭。

    <Warning>
    無 Token 的 Serve 驗證假設閘道主機是受信任的。如果該主機上可能執行不受信任的本機程式碼，請要求 token/密碼驗證。
    </Warning>

  </Tab>
  <Tab title="綁定至 tailnet + token">
    ```bash
    openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
    ```

    然後開啟：

    - `http://<tailscale-ip>:18789/` （或您設定的 `gateway.controlUi.basePath` ）

    將相符的共用金鑰貼上至 UI 設定中（作為 `connect.params.auth.token` 或 `connect.params.auth.password` 發送）。

  </Tab>
</Tabs>

## 不安全的 HTTP

如果您透過純 HTTP (`http://<lan-ip>` 或 `http://<tailscale-ip>`) 開啟儀表板，瀏覽器將在 **非安全上下文** 中運作並阻擋 WebCrypto。根據預設，OpenClaw 會 **阻擋** 沒有裝置身分的控制 UI 連線。

記載的例外情況：

- 僅限 localhost 的不安全 HTTP 與 `gateway.controlUi.allowInsecureAuth=true` 相容
- 透過 `gateway.auth.mode: "trusted-proxy"` 成功的操作員控制 UI 驗證
- 應急玻璃 `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**建議的修正方式：** 使用 HTTPS (Tailscale Serve) 或在本機開啟 UI：

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (在閘道主機上)

<AccordionGroup>
  <Accordion title="Insecure-auth toggle behavior">
    ```json5
    {
      gateway: {
        controlUi: { allowInsecureAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    `allowInsecureAuth` 僅是一個本機相容性切換開關：

    - 它允許 localhost 控制 UI 會話在非安全 HTTP 上下文中無需裝置身分即可繼續。
    - 它不會繞過配對檢查。
    - 它不會放寬遠端 (非 localhost) 裝置身分要求。

  </Accordion>
  <Accordion title="Break-glass only">
    ```json5
    {
      gateway: {
        controlUi: { dangerouslyDisableDeviceAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    <Warning>
    `dangerouslyDisableDeviceAuth` 會停用控制 UI 裝置身分檢查，這是嚴重的安全性降級。請在緊急使用後迅速還原。
    </Warning>

  </Accordion>
  <Accordion title="Trusted-proxy note">
    - 成功的信任代理程式驗證可以允許沒有裝置身分的 **操作員** 控制 UI 會話。
    - 這 **不會** 延伸到節點角色 的控制 UI 會話。
    - 同主機迴路反向代理程式仍然不滿足信任代理程式驗證；請參閱 [Trusted proxy auth](/zh-Hant/gateway/trusted-proxy-auth)。
  </Accordion>
</AccordionGroup>

關於 HTTPS 設定指引，請參閱 [Tailscale](/zh-Hant/gateway/tailscale)。

## 內容安全策略

控制 UI 隨附嚴格的 `img-src` 政策：僅允許**同源**資產、`data:` URL 以及本機產生的 `blob:` URL。瀏覽器會拒絕遠端 `http(s)` 和相對協議的圖片 URL，且不會發出網路請求。

實務上的含義如下：

- 透過相對路徑（例如 `/avatars/<id>`）提供的頭像和圖片仍然會呈現，包括 UI 擷取並轉換為本機 `blob:` URL 的已驗證頭像路由。
- 內嵌 `data:image/...` URL 仍然會呈現（適用於通訊協定內的載荷）。
- 由控制 UI 建立的本機 `blob:` URL 仍然會呈現。
- 頻道中繼資料發出的遠端頭像 URL 會在控制 UI 的頭像輔助程式中被剔除，並替換為內建的標誌/徽章，因此受到入侵或惡意的頻道無法強制從操作員的瀏覽器擷取任意的遠端圖片。

您不需要變更任何設定即可獲得此行為 — 它永遠啟用且不可設定。

## 頭像路由驗證

當設定閘道驗證時，控制 UI 的頭像端點需要與 API 其餘部分相同的閘道權杖：

- `GET /avatar/<agentId>` 僅向已驗證的呼叫者傳回頭像圖片。`GET /avatar/<agentId>?meta=1` 在相同的規則下傳回頭像中繼資料。
- 對任一路徑的未經驗證請求都會被拒絕（與同層級的 assistant-media 路徑相符）。這可以防止頭像路徑在受防護的主機上洩漏代理程式的身分。
- 控制 UI 本身在擷取頭像時會將閘道權杖作為持有人標頭轉發，並使用已驗證的 blob URL，以便圖片仍能在儀表板中呈現。

如果您停用閘道驗證（不建議在共享主機上使用），頭像路徑也會變成未經驗證，與閘道的其餘部分一致。

## 建置 UI

閘道從 `dist/control-ui` 提供靜態檔案。請使用以下指令建置：

```bash
pnpm ui:build
```

可選的絕對基礎路徑（當您需要固定的資產 URL 時）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用於本機開發（獨立的開發伺服器）：

```bash
pnpm ui:dev
```

然後將 UI 指向您的閘道 WS URL（例如 `ws://127.0.0.1:18789`）。

## 除錯/測試：開發伺服器 + 遠端閘道

控制 UI 是靜態檔案；WebSocket 目標是可配置的，且可以與 HTTP 來源不同。當您希望在本機使用 Vite 開發伺服器但 Gateway 運行在其他地方時，這非常方便。

<Steps>
  <Step title="啟動 UI 開發伺服器">
    ```bash
    pnpm ui:dev
    ```
  </Step>
  <Step title="使用 gatewayUrl 開啟">
    ```text
    http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
    ```

    可選的一次性授權（如果需要）：

    ```text
    http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="注意事項">
    - `gatewayUrl` 會在載入後儲存在 localStorage 中，並從 URL 中移除。
    - `token` 應盡可能透過 URL 片段（`#token=...`）傳遞。片段不會傳送到伺服器，這可避免請求日誌和 Referer 洩漏。舊版 `?token=` 查詢參數為了相容性仍會被匯入一次，但僅作為後備方案，並且會在啟動後立即移除。
    - `password` 僅保存在記憶體中。
    - 當設定 `gatewayUrl` 時，UI 不會回退到設定或環境憑證。請明確提供 `token`（或 `password`）。缺少明確的憑證會導致錯誤。
    - 當 Gateway 位於 TLS（Tailscale Serve、HTTPS 代理等）之後時，請使用 `wss://`。
    - `gatewayUrl` 僅在頂層視窗（非嵌入式）中被接受，以防止點擊劫持。
    - 非回環控制 UI 部署必須明確設定 `gateway.controlUi.allowedOrigins`（完整來源）。這包括遠端開發設定。
    - Gateway 啟動時可能會根據有效的執行時期綁定和連接埠植入本機來源，例如 `http://localhost:<port>` 和 `http://127.0.0.1:<port>`，但遠端瀏覽器來源仍需要明確的條目。
    - 除了嚴密控制的本地測試外，請勿使用 `gateway.controlUi.allowedOrigins: ["*"]`。這表示允許任何瀏覽器來源，而不是「匹配我正在使用的任何主機」。
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用 Host 標頭來源回退模式，但這是一種危險的安全模式。
  </Accordion>
</AccordionGroup>

範例：

```json5
{
  gateway: {
    controlUi: {
      allowedOrigins: ["http://localhost:5173"],
    },
  },
}
```

遠端存取設定詳細資訊：[Remote access](/zh-Hant/gateway/remote)。

## 相關

- [Dashboard](/zh-Hant/web/dashboard) — 閘道儀表板
- [Health Checks](/zh-Hant/gateway/health) — 閘道健康監控
- [TUI](/zh-Hant/web/tui) — 終端機使用者介面
- [WebChat](/zh-Hant/web/webchat) — 基於瀏覽器的聊天介面
