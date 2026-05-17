---
summary: "Gateway 的基於瀏覽器控制 UI（聊天、節點、設定）"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "控制 UI"
sidebarTitle: "控制 UI"
---

Control UI 是一個由 Gateway 提供的輕量級 **Vite + Lit** 單頁應用程式：

- 預設：`http://<host>:18789/`
- 可選前綴：設定 `gateway.controlUi.basePath`（例如 `/openclaw`）

它會在相同連接埠上**直接與 Gateway WebSocket 通訊**。

## 快速開啟（本機）

如果 Gateway 正在同一台電腦上執行，請開啟：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (或 [http://localhost:18789/](http://localhost:18789/))

如果頁面無法載入，請先啟動 Gateway：`openclaw gateway`。

驗證資訊會在 WebSocket 交握期間透過以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 當 `gateway.auth.allowTailscale: true` 時的 Tailscale Serve 身份標頭
- 當 `gateway.auth.mode: "trusted-proxy"` 時的 trusted-proxy 身份標頭

儀表板設定面板會為目前的瀏覽器分頁階段和選定的 gateway URL 保留一個 token；密碼不會被持久化。入門通常會在首次連線時產生一個用於 shared-secret auth 的 gateway token，但在 `gateway.auth.mode` 為 `"password"` 時，密碼驗證也可運作。

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

如果瀏覽器以變更的驗證詳細資料（role/scopes/public key）重試配對，先前的待處理請求將被取代，並建立一個新的 `requestId`。請在核准前重新執行 `openclaw devices list`。

如果瀏覽器已經配對，並且您將其從讀取權限變更為寫入/管理員權限，這會被視為核准升級，而不是靜默重新連線。OpenClaw 會保持舊的核准有效，阻檔更廣泛的重新連線，並要求您明確核准新的範圍集。

一旦批准，該裝置將被記住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤銷它，否則不需要重新批准。請參閱 [Devices CLI](/zh-Hant/cli/devices) 以了解令輪換和撤銷。

<Note>
- 直接本地回連瀏覽器連線 (`127.0.0.1` / `localhost`) 會自動核准。
- 當 `gateway.auth.allowTailscale: true`、Tailscale 身份驗證通過，且瀏覽器出示其裝置身份時，Tailscale Serve 可以略過 Control UI 操作員階段的配對往返程序。
- 直接的 Tailnet 繫結、LAN 瀏覽器連線，以及沒有裝置身份的瀏覽器設定檔仍需要明確核准。
- 每個瀏覽器設定檔會產生唯一的裝置 ID，因此切換瀏覽器或清除瀏覽器資料將需要重新配對。

</Note>

## 個人身份 (瀏覽器本機)

Control UI 支援針對每個瀏覽器的個人身份 (顯示名稱和大頭照)，附加到外傳訊息上以便在共用工作階段中進行歸屬標記。它儲存在瀏覽器儲存空間中，範圍僅限於目前的瀏覽器設定檔，並且不會同步到其他裝置，也不會在伺服器端持久保存，僅保留您實際發送訊息上的正常逐字稿作者中繼資料。清除網站資料或切換瀏覽器會將其重設為空白。

同樣的瀏覽器本地模式也適用於助理虛擬人像覆寫。上傳的助理虛擬人像僅會在本地瀏覽器上覆蓋閘道解析的身份，絕不會經由 `config.patch` 進行往返。共用的 `ui.assistant.avatar` 設定欄位仍然可供直接寫入該欄位的非 UI 用戶端使用（例如腳本化閘道或自訂儀表板）。

## 執行時期設定端點

Control UI 從 `/__openclaw/control-ui-config.json` 取得其執行時設定。該端點受到與 HTTP 介面其餘部分相同的閘道驗證保護：未經驗證的瀏覽器無法取得它，而成功取得需要具備已有效的閘道權杖/密碼、Tailscale Serve 身份，或受信任的代理程式身份。

## 語言支援

Control UI 可以在初次載入時根據您的瀏覽器語言地區自動進行在地化。若要稍後變更，請前往 **Overview -> Gateway Access -> Language**。語言地區選擇器位於 Gateway Access 卡片中，而非在 Appearance 下。

- 支援的地區設定：`en`、`zh-CN`、`zh-TW`、`pt-BR`、`de`、`es`、`ja-JP`、`ko`、`fr`、`ar`、`it`、`tr`、`uk`、`id`、`pl`、`th`、`vi`、`nl`、`fa`
- 非英文翻譯會在瀏覽器中以延遲載入的方式載入。
- 選取的語言地區會儲存在瀏覽器儲存空間中，並在下次造訪時重複使用。
- 遺漏的翻譯鍵會回退至英文。

文件翻譯會針對相同的非英文地區設定集產生，但文件網站內建的 Mintlify 語言選擇器僅限於 Mintlify 接受的地區代碼。泰文 (`th`) 和波斯文 (`fa`) 文件仍會在發布庫中產生；它們可能不會出現在該選擇器中，直到 Mintlify 支援這些代碼。

## 外觀主題

「外觀」面板保留了內建的 Claw、Knot 和 Dash 主題，以及一個瀏覽器本地的 tweakcn 匯入槽。若要匯入主題，請開啟 [tweakcn 編輯器](https://tweakcn.com/editor/theme)，選擇或建立主題，按一下 **Share**，然後將複製的主題連結貼上到「外觀」中。匯入工具也接受 `https://tweakcn.com/r/themes/<id>` registry URL、像 `https://tweakcn.com/editor/theme?theme=amethyst-haze` 這樣的編輯器 URL、相對 `/themes/<id>` 路徑、原始主題 ID，以及諸如 `amethyst-haze` 的預設主題名稱。

匯入的主題僅儲存在目前的瀏覽器設定檔中。它們不會寫入 gateway 設定，也不會在裝置間同步。取代匯入的主題會更新該本地插槽；如果選取的是匯入的主題，清除它會將作用中主題切換回 Claw。

## 它可以做什麼（目前）

<AccordionGroup>
  <Accordion title="聊天與對話">
    - 透過 Gateway WS 與模型聊天 (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)。
    - 聊天歷史紀錄重新整理會請求一個有限的最近視窗，並對每則訊息設有文字上限，因此大型會話不會強制瀏覽器在聊天變得可用之前先渲染完整的逐字稿負載。
    - 透過瀏覽器即時會議進行對話。OpenAI 使用直接 WebRTC，Google Live 則使用透過 WebSocket 的受限一次性瀏覽器權杖，而僅限後端的即時語音外掛則使用 Gateway 中繼傳輸。用戶端擁有的提供者會議以 `talk.client.create` 開始；Gateway 中繼會議則以 `talk.session.create` 開始。中繼器會將提供者憑證保留在 Gateway 上，同時瀏覽器透過 `talk.session.appendAudio` 串流麥克風 PCM，並透過 `talk.client.toolCall` 轉發 `openclaw_agent_consult` 提供者工具呼叫，以進行 Gateway 原則設定及更大的已設定 OpenClaw 模型。
    - 在聊天中串流工具呼叫 + 即時工具輸出卡片 (agent 事件)。

  </Accordion>
  <Accordion title="頻道、執行個體、會議、夢境">
    - 頻道：內建以及打包/外部外掛頻道狀態、QR 登入，以及各頻道設定 (`channels.status`, `web.login.*`, `config.patch`)。
    - 頻道探測重新整理會在緩慢的提供者檢查完成時保持先前的快照可見，且當探測或稽核超過其 UI 預算時，會標記部分快照。
    - 執行個體：在線列表 + 重新整理 (`system-presence`)。
    - 會議：預設列出已設定的 agent 會議，從過時的未設定 agent 會議金鑰退回，並套用各會議的模型/思考/快速/詳細/追蹤/推理覆寫 (`sessions.list`, `sessions.patch`)。
    - 夢境：做夢狀態、啟用/停用切換開關，以及夢境日記閱讀器 (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`)。

  </Accordion>
  <Accordion title="Cron, skills, nodes, exec approvals">
    - Cron 排程：列表/新增/編輯/執行/啟用/停用 + 執行歷史記錄 (`cron.*`)。
    - 技能：狀態、啟用/停用、安裝、API 金鑰更新 (`skills.*`)。
    - 節點：列表 + caps (`node.list`)。
    - 執行審核：編輯 Gateway 或節點允許清單 + 詢問 `exec host=gateway/node` 的策略 (`exec.approvals.*`)。

  </Accordion>
  <Accordion title="Config">
    - 檢視/編輯 `~/.openclaw/openclaw.json` (`config.get`, `config.set`)。
    - 應用 + 透過驗證重新啟動 (`config.apply`) 並喚醒最後一個使用中工作階段。
    - 寫入包含 base-hash 防護，以防止覆寫並行編輯。
    - 寫入 (`config.set`/`config.apply`/`config.patch`) 會對提交的設定負載中的參照進行使用中 SecretRef 解析的飛行前檢查；未解析的使用中已提交參照會在寫入前被拒絕。
    - 結構描述 + 表單呈現 (`config.schema` / `config.schema.lookup`，包括欄位 `title` / `description`、相符的 UI 提示、直接子項摘要、巢狀物件/萬用字元/陣列/組合節點上的文件元資料，以及可用的外掛程式 + 頻道結構描述)；只有在快照具有安全的原始往返時，才可使用原始 JSON 編輯器。
    - 如果快照無法安全地往返原始文字，Control UI 會強制使用表單模式，並停用該快照的原始模式。
    - 原始 JSON 編輯器的「重設為已儲存」會保留原始撰寫的形狀 (格式、註解、`$include` 佈局)，而不是重新呈現扁平化的快照，因此當快照可以安全往返時，外部編輯會在重設後保留。
    - 結構化的 SecretRef 物件值會在表單文字輸入中以唯讀方式呈現，以防止意外將物件損毀為字串。

  </Accordion>
  <Accordion title="Debug, logs, update">
    - Debug：狀態/健康/模型快照 + 事件日誌 + 手動 RPC 呼叫（`status`、`health`、`models.list`）。
    - 事件日誌包含 Control UI 重新整理/RPC 時序、緩慢的聊天/設定渲染時序，以及當瀏覽器公開那些 PerformanceObserver 進入類型時，針對長動畫影格或長任務的瀏覽器回應性項目。
    - Logs：具有篩選/匯出功能的 gateway 檔案日誌即時追蹤（`logs.tail`）。
    - Update：執行套件/git 更新 + 重新啟動（`update.run`）並附上重新啟動報告，然後在重新連線後輪詢 `update.status` 以驗證執行中的 gateway 版本。

  </Accordion>
  <Accordion title="Cron jobs panel notes">
    - 對於隔離作業，傳送預設為發布摘要。如果您僅需要內部執行，可以切換為 none。
    - 選擇發布時會出現頻道/目標欄位。
    - Webhook 模式使用 `delivery.mode = "webhook"` 並將 `delivery.to` 設定為有效的 HTTP(S) webhook URL。
    - 對於主工作階段作業，可使用 webhook 和 none 傳送模式。
    - 進階編輯控制項包括執行後刪除、清除代理程式覆寫、cron 精確/交錯選項、代理程式模型/思考覆寫，以及盡力傳送切換開關。
    - 表單驗證與欄位層級錯誤一起內嵌顯示；無效值會停用儲存按鈕，直到修正為止。
    - 設定 `cron.webhookToken` 以傳送專用的 bearer token；如果省略，則傳送不含 auth 標頭的 webhook。
    - 已棄用的後備方案：儲存具有 `notify: true` 的舊版作業在遷移之前仍可使用 `cron.webhook`。

  </Accordion>
</AccordionGroup>

## Chat 行為

<AccordionGroup>
  <Accordion title="Send and history semantics">
    - `chat.send` 是 **非阻塞** 的：它會立即以 `{ runId, status: "started" }` 確認，回應則透過 `chat` 事件串流傳送。
    - 聊天上傳功能接受圖片及非影片檔案。圖片會保留原始路徑；其他檔案則儲存為受控媒體，並在歷史記錄中顯示為附件連結。
    - 使用相同的 `idempotencyKey` 重新傳送，執行中會回傳 `{ status: "in_flight" }`，完成後則回傳 `{ status: "ok" }`。
    - 為了 UI 安全性，`chat.history` 的回應大小會受到限制。當對話記錄項目過大時，Gateway 可能會截斷冗長的文字欄位、省略龐大的中繼資料區塊，並以預留位置 (`[chat.history omitted: message too large]`) 取代過大的訊息。
    - 助理/生成的圖片會保存為受控媒體參考，並透過經過驗證的 Gateway 媒體 URL 提供服務，因此重新載入不會依賴聊天歷史回應中保留的原始 base64 圖片資料。
    - 當渲染 `chat.history` 時，Control UI 會從可見的助理文字中移除僅供顯示的內聯指令標籤 (例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`)、純文字工具呼叫 XML 載荷 (包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及被截斷的工具呼叫區塊)，以及洩漏的 ASCII/全形模型控制權杖，並省略整個可見文字僅為靜音權杖 `NO_REPLY` / `no_reply` 或心跳確認權杖 `HEARTBEAT_OK` 的助理項目。
    - 在進行中的傳送和最終歷史記錄重新整理期間，如果 `chat.history` 短暫回傳較舊的快照，聊天視圖會保持本地樂觀的使用者/助理訊息可見；一旦 Gateway 歷史記錄趕上，正規的對話記錄將會取代那些本地訊息。
    - 即時 `chat` 事件屬於傳遞狀態，而 `chat.history` 則是從持久的會話對話記錄重建。在工具結束事件之後，Control UI 會重新載入歷史記錄並僅合併小量的樂觀尾部；對話記錄邊界記載於 [WebChat](/zh-Hant/web/webchat) 中。
    - `chat.inject` 會將助理備註附加到會話對話記錄，並廣播 `chat` 事件以僅更新 UI (不執行 agent，不進行通道傳遞)。
    - 聊天標頭在會話選擇器之前顯示 agent 篩選器，且會話選擇器的範圍取決於選取的 agent。切換 agent 時僅顯示與該 agent 關聯的會話，且當該 agent 尚無儲存的儀表板會話時，會回退至該 agent 的主要會話。
    - 在桌面寬度下，聊天控制項會保持在一個緊湊的列中，並在向下捲動對話記錄時收合；向上捲動、回到頂部或抵達底部時會恢復控制項。
    - 連續重複的純文字訊息會渲染為一個帶有計數徽章的氣泡。攜帶圖片、附件、工具輸出或畫布預覽的訊息則保持展開。
    - 聊天標頭的模型和思考選擇器會透過 `sessions.patch` 立即修補使用中的會話；它們是持久的會話覆寫，而非僅限單次輪詢的傳送選項。
    - 如果您在相同會話的模型選擇器變更仍在儲存時傳送訊息，編輯器會等待該會話修補完成，再呼叫 `chat.send`，以確保傳送時使用選取的模型。
    - 在 Control UI 中輸入 `/new` 會建立並切換至與 New Chat 相同的全新儀表板會話，除非設定 `session.dmScope: "main"` 且目前父項是 agent 的主要會話；在此情況下，它會就地重設主要會話。輸入 `/reset` 則保留 Gateway 對目前會話的明確就地重設。
    - 聊天模型選擇器會請求 Gateway 設定的模型檢視。如果存在 `agents.defaults.models`，該允許清單會驅動選擇器，包括 `provider/*` 項目，以保持提供者範圍目錄的動態性。否則，選擇器會顯示明確的 `models.providers.*.models` 項目以及具有可用驗證的提供者。完整目錄可透過帶有 `view: "all"` 的偵錯 `models.list` RPC 取得。
    - 當全新的 Gateway 會話使用報告包含目前的內容權杖時，聊天編輯器區域會顯示一個精簡的內容使用量指示器。在高內容壓力下會切換為警告樣式，並在建議的壓縮等級顯示一個精簡按鈕，用於執行正常的會話壓縮路徑。過時的權杖快照會隱藏，直到 Gateway 再次回報最新的使用量。

  </Accordion>
  <Accordion title="Talk mode (browser realtime)">
    Talk mode uses a registered realtime voice provider. Configure OpenAI with `talk.realtime.provider: "openai"` plus either `talk.realtime.providers.openai.apiKey`, `OPENAI_API_KEY`, or an `openai-codex` OAuth profile; configure Google with `talk.realtime.provider: "google"` plus `talk.realtime.providers.google.apiKey`. The browser never receives a standard provider API key. OpenAI receives an ephemeral Realtime client secret for WebRTC. Google Live receives a one-use constrained Live API auth token for a browser WebSocket session, with instructions and tool declarations locked into the token by the Gateway. Providers that only expose a backend realtime bridge run through the Gateway relay transport, so credentials and vendor sockets stay server-side while browser audio moves through authenticated Gateway RPCs. The Realtime session prompt is assembled by the Gateway; `talk.client.create` does not accept caller-provided instruction overrides.

    The Chat composer includes a Talk options button next to the Talk start/stop button. The options apply to the next Talk session and can override provider, transport, model, voice, reasoning effort, VAD threshold, silence duration, and prefix padding. When an option is blank, the Gateway uses configured defaults where available or the provider default. Selecting Gateway relay forces the backend relay path; selecting WebRTC keeps the session client-owned and fails instead of silently falling back to relay if the provider cannot create a browser session.

    In the Chat composer, the Talk control is the waves button next to the microphone dictation button. When Talk starts, the composer status row shows `Connecting Talk...`, then `Talk live` while audio is connected, or `Asking OpenClaw...` while a realtime tool call is consulting the configured larger model through `talk.client.toolCall`.

    Maintainer live smoke: `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` verifies the OpenAI backend WebSocket bridge, OpenAI browser WebRTC SDP exchange, Google Live constrained-token browser WebSocket setup, and the Gateway relay browser adapter with fake microphone media. The command prints provider status only and does not log secrets.

  </Accordion>
  <Accordion title="停止與中止">
    - 點擊 **停止** (呼叫 `chat.abort`)。
    - 當執行處於活動狀態時，一般的後續追問會進入佇列。點擊已佇列訊息上的 **引導** 即可將該後續追問注入至目前的執行輪次中。
    - 輸入 `/stop` (或獨立的中止指令，例如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`) 以進行頻外中止。
    - `chat.abort` 支援 `{ sessionKey }` (無需 `runId`) 以中止該工作階段的所有活動執行。

  </Accordion>
  <Accordion title="中止部分保留">
    - 當執行被中止時，部分助理文字仍可能會顯示在 UI 中。
    - 當存在緩衝輸出時，Gateway 會將中止的部分助理文字持久化至對話紀錄歷史中。
    - 持久化的項目包含中止中繼資料，以便對話紀錄消費者能區分中止的部分內容與正常完成的輸出。

  </Accordion>
</AccordionGroup>

## PWA 安裝與 Web 推送

Control UI 內建 `manifest.webmanifest` 與 Service Worker，因此現代瀏覽器可以將其安裝為獨立的 PWA。Web 推送功能讓 Gateway 即使在分頁或瀏覽器視窗未開啟時，也能透過通知喚醒已安裝的 PWA。

| 層面                                              | 功能說明                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| `ui/public/manifest.webmanifest`                  | PWA 設定檔。一旦該檔案可被存取，瀏覽器便會提供「安裝應用程式」的選項。 |
| `ui/public/sw.js`                                 | 負責處理 `push` 事件與通知點擊的 Service Worker。                      |
| `push/vapid-keys.json` (位於 OpenClaw 狀態目錄下) | 用於簽署 Web 推送訊息載荷的自動生成 VAPID 金鑰對。                     |
| `push/web-push-subscriptions.json`                | 已持久化的瀏覽器訂閱端點。                                             |

當您需要固定金鑰時 (例如用於多主機部署、密鑰輪替或測試)，可以透過 Gateway 程序上的環境變數覆寫 VAPID 金鑰對：

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT` (預設為 `mailto:openclaw@localhost`)

Control UI 使用這些具有範圍限制的 Gateway 方法來註冊與測試瀏覽器訂閱：

- `push.web.vapidPublicKey` — 獲取有效的 VAPID 公鑰。
- `push.web.subscribe` — 註冊一個 `endpoint` 以及 `keys.p256dh`/`keys.auth`。
- `push.web.unsubscribe` — 移除已註冊的端點。
- `push.web.test` — 向呼叫者的訂閱發送測試通知。

<Note>Web Push 與 iOS APNS 中繼路徑（請參閱適用於中繼推播的 [Configuration](/zh-Hant/gateway/configuration)）以及現有的 `push.test` 方法相互獨立，後者針對的是原生行動裝置配對。</Note>

## 託管嵌入

助理訊息可以使用 `[embed ...]` 簡碼在行內呈現託管的網頁內容。iframe sandbox 原則由 `gateway.controlUi.embedSandbox` 控制：

<Tabs>
  <Tab title="strict">停用託管嵌入內的腳本執行。</Tab>
  <Tab title="scripts (default)">在保持來源隔離的同時允許互動式嵌入；這是預設值，通常對於獨立的瀏覽器遊戲/小工具已足夠。</Tab>
  <Tab title="trusted">在 `allow-scripts` 的基礎上，為故意需要更強權限的同站文件增加 `allow-same-origin`。</Tab>
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

<Warning>僅當嵌入文件確實需要同源行為時才使用 `trusted`。對於大多數由代理程式生成的遊戲和互動式畫布，`scripts` 是較安全的選擇。</Warning>

絕對外部 `http(s)` 嵌入 URL 預設保持封鎖。如果您故意希望 `[embed url="https://..."]` 載入第三方頁面，請設定 `gateway.controlUi.allowExternalEmbedUrls: true`。

## 聊天訊息寬度

分組的聊天訊息使用可讀的預設最大寬度。寬螢幕部署環境可以透過設定 `gateway.controlUi.chatMessageMaxWidth` 來覆寫它，而無需修改打包的 CSS：

```json5
{
  gateway: {
    controlUi: {
      chatMessageMaxWidth: "min(1280px, 82%)",
    },
  },
}
```

此值會在傳送到瀏覽器之前進行驗證。支援的值包括純長度和百分比，例如 `960px` 或 `82%`，以及受限制的 `min(...)`、`max(...)`、`clamp(...)`、`calc(...)` 和 `fit-content(...)` 寬度表達式。

## Tailnet 存取（推薦）

<Tabs>
  <Tab title="整合式 Tailscale Serve（首選）">
    將 Gateway 保持在 loopback，並讓 Tailscale Serve 以 HTTPS 代理它：

    ```bash
    openclaw gateway --tailscale serve
    ```

    開啟：

    - `https://<magicdns>/` （或您設定的 `gateway.controlUi.basePath`）

    預設情況下，當 `gateway.auth.allowTailscale` 為 `true` 時，Control UI/WebSocket Serve 請求可以透過 Tailscale 身份標頭（`tailscale-user-login`）進行驗證。OpenClaw 透過使用 `tailscale whois` 解析 `x-forwarded-for` 位址並將其與標頭匹配來驗證身分，並且僅當請求帶有 Tailscale 的 `x-forwarded-*` 標頭命中 loopback 時才接受這些請求。對於具有瀏覽器裝置身分的 Control UI 操作員會話，此經過驗證的 Serve 路徑也會跳過裝置配對來回行程；無裝置的瀏覽器和節點角色連線仍遵循正常的裝置檢查。如果您希望即使對於 Serve 流量也要求明確的共用金鑰憑證，請設定 `gateway.auth.allowTailscale: false`。然後使用 `gateway.auth.mode: "token"` 或 `"password"`。

    對於該非同步 Serve 身分路徑，相同用戶端 IP 和驗證範圍的失敗驗證嘗試會在速率限制寫入之前進行序列化。因此，來自同一瀏覽器的並發錯誤重試可能會在第二次請求時顯示 `retry later`，而不是兩個並行競爭的純粹不匹配。

    <Warning>
    無權杖 Serve 驗證假設 gateway 主機是受信任的。如果該主機上可能執行不受信任的本機程式碼，請要求權杖/密碼驗證。
    </Warning>

  </Tab>
  <Tab title="綁定到 tailnet + token">
    ```bash
    openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
    ```

    然後開啟：

    - `http://<tailscale-ip>:18789/` (或您設定的 `gateway.controlUi.basePath`)

    將相符的共用金鑰貼上到 UI 設定中 (作為 `connect.params.auth.token` 或 `connect.params.auth.password` 傳送)。

  </Tab>
</Tabs>

## 不安全的 HTTP

如果您透過純 HTTP (`http://<lan-ip>` 或 `http://<tailscale-ip>`) 開啟儀表板，瀏覽器將在**非安全內容** 中執行並阻擋 WebCrypto。預設情況下，如果沒有裝置身分，OpenClaw 會**阻擋** 控制台 UI 連線。

記載的例外情況：

- 僅限 localhost 的不安全 HTTP 相容性，配合 `gateway.controlUi.allowInsecureAuth=true`
- 透過 `gateway.auth.mode: "trusted-proxy"` 成功進行操作員控制台 UI 驗證
- 緊急存取 `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**建議的修復方法：** 使用 HTTPS (Tailscale Serve) 或在本機開啟 UI：

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (在閘道主機上)

<AccordionGroup>
  <Accordion title="不安全驗證切換行為">
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

    - 它允許 localhost 控制台 UI 會話在非安全 HTTP 環境下無需裝置身分即可繼續。
    - 它不會略過配對檢查。
    - 它不會放寬遠端 (非 localhost) 裝置身分要求。

  </Accordion>
  <Accordion title="僅限緊急存取">
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
    `dangerouslyDisableDeviceAuth` 會停用控制台 UI 裝置身分檢查，這是一項嚴重的安全性降級。緊急使用後請盡快還原。
    </Warning>

  </Accordion>
  <Accordion title="Trusted-proxy note">
    - 成功的 trusted-proxy 驗證可以在沒有裝置身分的情況下准許 **operator** Control UI 作業階段。
    - 這**不會**延伸至 node-role Control UI 作業階段。
    - 同主機的回送反向代理仍然無法滿足 trusted-proxy 驗證；請參閱 [Trusted proxy auth](/zh-Hant/gateway/trusted-proxy-auth)。

  </Accordion>
</AccordionGroup>

關於 HTTPS 設定指南，請參閱 [Tailscale](/zh-Hant/gateway/tailscale)。

## 內容安全性原則

Control UI 附帶嚴格的 `img-src` 政策：僅允許 **同源** 資源、`data:` URL，以及本地產生的 `blob:` URL。瀏覽器會拒絕遠端 `http(s)` 和相對通訊協定的圖片 URL，並且不會發出網路擷取請求。

實際上的意義如下：

- 在相對路徑下提供的頭像和圖片 (例如 `/avatars/<id>`) 仍然會呈現，包括 UI 擷取並轉換為本地 `blob:` URL 的已驗證頭像路由。
- 內聯 `data:image/...` URL 仍然會呈現 (適用於通訊協定內的載荷)。
- 由 Control UI 建立的本地 `blob:` URL 仍然會呈現。
- 由頻道中繼資料發出的遠端頭像 URL 會在 Control UI 的頭像協助程式中被移除，並替換為內建的標誌/徽章，因此遭入侵或惡意的頻道無法強制操作員瀏覽器擷取任意的遠端圖片。

您不需要變更任何設定即可獲得此行為 — 它始終開啟且不可設定。

## 頭像路由驗證

當設定閘道驗證時，Control UI 的頭像端點需要與其餘 API 相同的閘道權杖：

- `GET /avatar/<agentId>` 僅向已驗證的呼叫者傳回頭像圖片。`GET /avatar/<agentId>?meta=1` 則依相同規則傳回頭像中繼資料。
- 對這兩個路由的未驗證請求將被拒絕 (與同層的 assistant-media 路由一致)。這可以防止頭像路由在受保護的主機上洩漏代理程式身分。
- Control UI 本身在擷取頭像時會將閘道權杖作為持有人標頭 轉發，並使用已驗證的 blob URL，以便圖片仍能在儀表板中呈現。

如果您停用閘道驗證 (不建議在共用主機上使用)，頭像路由也會變成未驗證，與閘道的其餘部分一致。

## Assistant 媒體路由驗證

當設定閘道驗證時，Assistant 本地媒體預覽會使用兩階段路由：

- `GET /__openclaw__/assistant-media?meta=1&source=<path>` 需要正常的控制 UI 操作員驗證。瀏覽器在檢查可用性時會將 gateway token 作為 bearer header 發送。
- 成功的元數據回應會包含一個短期有效的 `mediaTicket`，其範圍僅限於該確切來源路徑。
- 瀏覽器呈現的圖像、音訊、視訊和文件 URL 使用 `mediaTicket=<ticket>`，而不是使用中的 gateway token 或密碼。該票證很快過期，且無法授權不同的來源。

這保持了正常的媒體呈現與瀏覽器原生媒體元素相容，同時不會將可重複使用的 gateway 憑證暴露在可見的媒體 URL 中。

## 建構 UI

Gateway 從 `dist/control-ui` 提供靜態檔案。請使用以下指令建構：

```bash
pnpm ui:build
```

選用的絕對基礎路徑 (當您需要固定的資產 URL 時)：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用於本地開發 (獨立的開發伺服器)：

```bash
pnpm ui:dev
```

然後將 UI 指向您的 Gateway WS URL (例如 `ws://127.0.0.1:18789`)。

## 空白的 Control UI 頁面

如果瀏覽器載入了空白的儀表板且 DevTools 未顯示有用的錯誤，可能是擴充功能或早期的內容腳本阻止了 JavaScript 模組應用程式的執行。靜態頁面包含一個純 HTML 復原面板，當 `<openclaw-app>` 在啟動後未註冊時會顯示該面板。

變更瀏覽器環境後，請使用面板中的 **Try again** 操作，或在進行這些檢查後手動重新載入：

- 停用會注入到所有頁面的擴充功能，尤其是具有 `<all_urls>` 內容腳本的擴充功能。
- 請嘗試使用私密視窗、乾淨的瀏覽器設定檔，或使用另一個瀏覽器。
- 保持 Gateway 運作，並在變更瀏覽器後驗證相同的儀表板 URL。

## 除錯/測試：dev server + 遠端 Gateway

Control UI 是靜態檔案；WebSocket 目標是可設定的，並且可以與 HTTP 來源不同。當您想要在本地使用 Vite dev server 但 Gateway 在其他地方運行時，這非常方便。

<Steps>
  <Step title="Start the UI dev server">
    ```bash
    pnpm ui:dev
    ```
  </Step>
  <Step title="Open with gatewayUrl">
    ```text
    http://localhost:5173/?gatewayUrl=ws%3A%2F%2F<gateway-host>%3A18789
    ```

    選用的一次性驗證（如果需要）：

    ```text
    http://localhost:5173/?gatewayUrl=wss%3A%2F%2F<gateway-host>%3A18789#token=<gateway-token>
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Notes">
    - `gatewayUrl` 在載入後會儲存在 localStorage 中，並從 URL 中移除。
    - 如果您透過 `gatewayUrl` 傳遞完整的 `ws://` 或 `wss://` 端點，請對 `gatewayUrl` 值進行 URL 編碼，以便瀏覽器正確解析查詢字串。
    - 應儘可能透過 URL 片段（`#token=...`）傳遞 `token`。片段不會傳送到伺服器，這可避免請求日誌和 Referer 外洩。為了相容性，舊版 `?token=` 查詢參數仍會匯入一次，但僅作為後備手段，並且會在啟動後立即剝除。
    - `password` 僅保留在記憶體中。
    - 當設定 `gatewayUrl` 時，UI 不會後退至設定或環境認證。請明確提供 `token`（或 `password`）。缺少明確的認證資訊屬於錯誤。
    - 當 Gateway 位於 TLS（Tailscale Serve、HTTPS 代理等）後方時，請使用 `wss://`。
    - 為了防止點擊劫持，`gatewayUrl` 僅在接受頂層視窗（非內嵌）中使用。
    - 非回環 Control UI 部署必須明確設定 `gateway.controlUi.allowedOrigins`（完整來源）。這包括遠端開發設定。
    - Gateway 啟動時可能會根據有效的執行時期綁定和連接埠，植入本機來源（例如 `http://localhost:<port>` 和 `http://127.0.0.1:<port>`），但遠端瀏覽器來源仍需要明確的項目。
    - 除了嚴密控制的本地測試外，請勿使用 `gateway.controlUi.allowedOrigins: ["*"]`。這表示允許任何瀏覽器來源，而不是「符合我正在使用的任何主機」。
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用 Host-header 來源後退模式，但這是一種危險的安全模式。

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

- [Dashboard](/zh-Hant/web/dashboard) — gateway dashboard
- [Health Checks](/zh-Hant/gateway/health) — gateway health monitoring
- [TUI](/zh-Hant/web/tui) — 終端使用者介面
- [WebChat](/zh-Hant/web/webchat) — 基於瀏覽器的聊天介面
