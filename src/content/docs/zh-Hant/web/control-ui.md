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

一旦批准，該裝置會被記住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤銷它，否則不需要重新批准。關於令牌輪換和撤銷，請參閱 [Devices CLI](/zh-Hant/cli/devices)。

透過 `openclaw_gateway` 介接器連線的 Paperclip 代理程式使用相同的首次執行核准流程。在初始連線嘗試後，執行 `openclaw devices approve --latest` 以預覽擱置中的請求，然後重新執行列印出的 `openclaw devices approve <requestId>` 指令以核准它。針對遠端閘道，請傳遞明確的 `--url` 和 `--token` 值。為了在重啟之間保持核准穩定，請在 Paperclip 中設定持續性 `adapterConfig.devicePrivateKeyPem`，而不是讓它每次執行時都產生新的暫時性裝置身分。

<Note>
- 直接的本地迴路瀏覽器連線 (`127.0.0.1` / `localhost`) 會自動核准。
- 當 `gateway.auth.allowTailscale: true`、Tailscale 身分驗證，且瀏覽器呈現其裝置身分時，Tailscale Serve 可以跳過 Control UI 操作者會話的配對往返過程。
- 直接的 Tailnet 繫結、區域網路瀏覽器連線，以及沒有裝置身分的瀏覽器設定檔仍需要明確核准。
- 每個瀏覽器設定檔都會產生一個唯一的裝置 ID，因此切換瀏覽器或清除瀏覽器資料將需要重新配對。

</Note>

## 個人身分 (瀏覽器本地)

Control UI 支援每個瀏覽器的個人身分 (顯示名稱和大頭貼)，附加於外送訊息以便在共用會話中進行歸因。它儲存在瀏覽器儲存空間中，範圍限於目前的瀏覽器設定檔，並且不會同步到其他裝置，也不會在伺服器端持久保存，超過您實際發送訊息上的正常逐字稿作者中繼資料。清除網站資料或切換瀏覽器會將其重設為空白。

相同的瀏覽器本機模式也適用於助理化身覆寫。上傳的助理化身僅在本地瀏覽器上覆蓋閘道解析的身分，且絕不會透過 `config.patch` 來回傳輸。共享的 `ui.assistant.avatar` 設定欄位仍可供直接寫入該欄位的非 UI 用戶端使用（例如腳本化閘道或自訂儀表板）。

## 執行時設定端點

控制 UI 從 `/__openclaw/control-ui-config.json` 取得其執行時設定。該端點受到與其餘 HTTP 介面相同的閘道身份驗證保護：未經驗證的瀏覽器無法取得它，而成功的取取需要已有效的閘道 Token/密碼、Tailscale Serve 身分，或受信任的 Proxy 身分。

## 語言支援

控制 UI 可以在首次載入時根據您的瀏覽器語言設定進行本地化。若要稍後覆寫，請開啟 **Overview -> Gateway Access -> Language**。語言選擇器位於 Gateway Access 卡片中，而非 Appearance 下。

- 支援的語言代碼： `en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `ar`, `it`, `tr`, `uk`, `id`, `pl`, `th`, `vi`, `nl`, `fa`
- 非英文翻譯會在瀏覽器中以懶載入方式載入。
- 選取的語言會儲存在瀏覽器儲存空間中，並在未來造訪時重複使用。
- 缺少的翻譯鍵會回退至英文。

文件翻譯是針對相同的非英文語言集合生成的，但文件網站內建的 Mintlify 語言選擇器僅限於 Mintlify 接受的語言代碼。泰文 (`th`) 和波斯文 (`fa`) 的文件仍會在發行庫中生成；在 Mintlify 支援這些代碼之前，它們可能不會出現在該選擇器中。

## 外觀主題

Appearance 面板保留了內建的 Claw、Knot 和 Dash 主題，以及一個瀏覽器本地的 tweakcn 匯入插槽。若要匯入主題，請開啟 [tweakcn editor](https://tweakcn.com/editor/theme)，選擇或建立主題，點擊 **Share**，然後將複製的主題連結貼上到 Appearance 中。匯入工具也接受 `https://tweakcn.com/r/themes/<id>` registry URL、編輯器 URL（如 `https://tweakcn.com/editor/theme?theme=amethyst-haze`）、相對 `/themes/<id>` 路徑、原始主題 ID，以及預設主題名稱（如 `amethyst-haze`）。

Appearance 還包含一個瀏覽器本地的 Text size（文字大小）設定。該設定與其他 Control UI 偏好設定一起儲存，適用於聊天文字、編輯器文字、工具卡片和聊天側邊欄，並確保文字輸入框至少為 16px，以便在聚焦時 Mobile Safari 不會自動縮放。

匯入的主題僅儲存在目前的瀏覽器設定檔中。它們不會寫入 gateway config，也不會跨裝置同步。替換匯入的主題會更新該本地插槽；清除它則會將現用主題切換回 Claw（如果之前選取的是匯入的主題）。

## 它能做什麼（目前）

<AccordionGroup>
  <Accordion title="聊天與對話">
    - 透過 Gateway WS 與模型聊天 (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)。
    - 聊天記錄重新整理會請求一個受限的近視窗，並對每則訊息設有文字上限，因此大型會話不會強制瀏覽器在聊天變得可用之前先渲染完整的逐字稿內容。
    - 透過瀏覽器即時會語音對話。OpenAI 使用直接 WebRTC，Google Live 使用透過 WebSocket 的受限一次性瀏覽器權杖，而僅後端的即時語音外掛則使用 Gateway 中繼傳輸。客戶端擁有的提供者會語音以 `talk.client.create` 開頭；Gateway 中繼會語音以 `talk.session.create` 開頭。此中繼會將提供者憑證保留在 Gateway 上，同時瀏覽器透過 `talk.session.appendAudio` 串流麥克風 PCM，並透過 `talk.client.toolCall` 轉發 `openclaw_agent_consult` 提供者工具呼叫，以進行 Gateway 原則檢查及使用較大型的設定 OpenClaw 模型，並透過 `talk.client.steer` 或 `talk.session.steer` 路由 active-run 語音指引。
    - 在聊天中串流工具呼叫 + 即時工具輸出卡片 (agent 事件)。

  </Accordion>
  <Accordion title="Channels, instances, sessions, dreams">
    - Channels：內建加上捆綁/外掛頻道的狀態、QR 登入，以及各頻道設定（`channels.status`、`web.login.*`、`config.patch`）。
    - 頻道探測重新整理會在緩慢的提供者檢查完成時，讓先前的快照保持可見，且當探測或稽核超出其 UI 預算時，部分快照會被標示。
    - Instances：在場列表 + 重新整理（`system-presence`）。
    - Sessions：預設列出已設定代理的作業階段，從過期的未設定代理作業階段金鑰退回，並套用各作業階段的模型/思考/快速/詳細/追蹤/推理覆寫（`sessions.list`、`sessions.patch`）。
    - Dreams：做夢狀態、啟用/停用切換開關，以及夢境日誌閱讀器（`doctor.memory.status`、`doctor.memory.dreamDiary`、`config.patch`）。

  </Accordion>
  <Accordion title="Cron, skills, nodes, exec approvals">
    - Cron jobs：列表/新增/編輯/執行/啟用/停用 + 執行歷史（`cron.*`）。
    - Skills：狀態、啟用/停用、安裝、API 金鑰更新（`skills.*`）。
    - Nodes：列表 + 權限（`node.list`）。
    - Exec approvals：編輯閘道或節點允許清單 + 詢問 `exec host=gateway/node` 的策略（`exec.approvals.*`）。

  </Accordion>
  <Accordion title="Config">
    - 檢視/編輯 `~/.openclaw/openclaw.json` (`config.get`, `config.set`)。
    - 應用 + 驗證後重啟 (`config.apply`) 並喚醒上次使用中的工作階段。
    - 寫入操作包含 base-hash 防護，以防止覆蓋並行編輯。
    - 寫入操作 (`config.set`/`config.apply`/`config.patch`) 會對提交的設定承載中的參照進行預檢作用中 SecretRef 解析；未解析的作用中已提交參照會在寫入前被拒絕。
    - 表單儲存會捨棄無法從已儲存設定還原的過期編修占位符，同時保留仍對應到已儲存密碼的編修值。
    - 結構描述 + 表單呈現 (`config.schema` / `config.schema.lookup`，包括欄位 `title` / `description`、相符的 UI 提示、直接子項摘要、巢狀物件/萬用字元/陣列/組合節點上的文件中繼資料，以及可用的外掛 + 頻道結構描述)；僅當快照能安全地進行原始來回轉換時，才提供原始 JSON 編輯器。
    - 如果快照無法安全地進行原始文字來回轉換，Control UI 會強制使用表單模式，並針對該快照停用原始模式。
    - 原始 JSON 編輯器的「重設為已儲存」會保留原始撰寫的形狀 (格式、註解、`$include` 版面配置)，而不是重新呈現扁平化的快照，因此當快照能安全地進行來回轉換時，外部編輯在重設後仍會保留。
    - 結構化的 SecretRef 物件值在表單文字輸入中會以唯讀方式呈現，以防止意外將物件轉換成字串而損毀資料。

  </Accordion>
  <Accordion title="Debug, logs, update">
    - Debug：狀態/健康/模型快照 + 事件日誌 + 手動 RPC 呼叫 (`status`, `health`, `models.list`)。
    - 事件日誌包含 Control UI 重新整理/RPC 時序、緩慢聊天/設定檔渲染時序，以及當瀏覽器公開這些 PerformanceObserver 項目類型時，針對長動畫幀或長任務的瀏覽器回應性項目。
    - Logs：具有篩選/匯出功能的 gateway 檔案日誌即時追蹤 (`logs.tail`)。
    - Update：執行套件/git 更新 + 重新啟動 (`update.run`)，並附帶重新啟動報告，然後在重新連線後輪詢 `update.status` 以驗證正在執行的 gateway 版本。

  </Accordion>
  <Accordion title="Cron jobs panel notes">
    - 對於隔離作業，傳遞預設為公告摘要。如果您希望僅內部執行，可以切換為 none。
    - 當選擇公告時，會出現頻道/目標欄位。
    - Webhook 模式使用 `delivery.mode = "webhook"`，並將 `delivery.to` 設定為有效的 HTTP(S) webhook URL。
    - 對於主階段作業，提供 webhook 和 none 傳遞模式。
    - 進階編輯控制項包括執行後刪除、清除代理程式覆寫、cron 精確/錯開選項、代理程式模型/思考覆寫，以及盡力而為傳遞切換開關。
    - 表單驗證與欄位層級錯誤內聯顯示；無效值會停用儲存按鈕，直到修正為止。
    - 設定 `cron.webhookToken` 以發送專用 bearer token，如果省略，則 webhook 將在不帶 auth 標頭的情況下發送。
    - 已棄用的後備方案：具有 `notify: true` 的儲存舊版作業在遷移之前仍可使用 `cron.webhook`。

  </Accordion>
</AccordionGroup>

## 聊天行為

<AccordionGroup>
  <Accordion title="傳送與歷史記錄語意">
    - `chat.send` 是 **非阻塞** 的：它會立即使用 `{ runId, status: "started" }` 進行確認，並透過 `chat` 事件串流回應。
    - 聊天上傳功能接受圖片與非影片檔案。圖片會保留原生圖片路徑；其他檔案則會作為受控媒體 儲存，並在歷史記錄中顯示為附件連結。
    - 使用相同的 `idempotencyKey` 重新傳送時，執行中會回傳 `{ status: "in_flight" }`，完成後則回傳 `{ status: "ok" }`。
    - 為了 UI 安全性，`chat.history` 回應的大小會受到限制。當對話條目過大時，Gateway 可能會截斷長文字欄位、省略龐大的中繼資料區塊，並用預留位置 (`[chat.history omitted: message too large]`) 取代過大的訊息。
    - 助理/生成的圖片會保存為受控媒體參照，並透過已驗證的 Gateway 媒體 URL 回傳，因此重新載入時不會依賴保留在聊天歷史記錄回應中的原始 base64 圖片資料。
    - 當轉譯 `chat.history` 時，Control UI 會從可見的助理文字中移除僅供顯示用的內聯指令標籤 (例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`)、純文字工具呼叫 XML 載荷 (包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及被截斷的工具呼叫區塊) 以及外洩的 ASCII/全形模型控制權杖，並且會省略其整個可見文字僅為確切的靜音權杖 `NO_REPLY` / `no_reply` 或心跳確認權杖 `HEARTBEAT_OK` 的助理條目。
    - 在主動傳送和最終歷史記錄重新整理期間，如果 `chat.history` 短暫回傳較舊的快照，聊天檢視會保持本地樂觀的使用者/助理訊息可見；一旦 Gateway 歷史記錄趕上，正準的對話記錄會取代那些本地訊息。
    - 即時 `chat` 事件代表傳遞狀態，而 `chat.history` 則是從持續性的會話對話記錄重建而來。在工具最終 事件之後，Control UI 會重新載入歷史記錄並僅合併一小段樂觀的尾部；對話記錄邊界記載於 [WebChat](/zh-Hant/web/webchat) 中。
    - `chat.inject` 會將助理註記附加至會話對話記錄，並廣播 `chat` 事件以進行僅限 UI 的更新 (無 agent 執行，無頻道傳遞)。
    - 聊天標頭會在會話選擇器之前顯示 agent 篩選器，且會話選擇器的範圍會受限於選定的 agent。切換 agent 時僅會顯示與該 agent 連結的會話，若尚未儲存的儀表板會話，則會退回至該 agent 的主要會話。
    - 在桌面寬度下，聊天控制項會維持在單一緊湊列中，並在向下捲動對話記錄時收合；向上捲動、回到頂部或抵達底部時會恢復控制項。
    - 連續的重複純文字訊息會轉譯為一個帶有計數徽章的氣泡。攜帶圖片、附件、工具輸出或畫布預覽的訊息則保持不收合。
    - 聊天標頭的模型與思考 選擇器會立即透過 `sessions.patch` 修補 使用中的會話；這些是持續性的會話覆寫，而非僅限單次回合的傳送選項。
    - 如果在相同會話的模型選擇器變更尚在儲存時傳送訊息，編輯器會在呼叫 `chat.send` 之前等待該會話修補完成，以確保傳送使用的是選定的模型。
    - 在 Control UI 中輸入 `/new` 會建立並切換至與「新聊天」相同的新鮮儀表板會話，但在配置了 `session.dmScope: "main"` 且目前的父項是 agent 的主要會話時除外；在這種情況下，它會就地重設主要會話。輸入 `/reset` 則會保留 Gateway 對目前會話的明確就地重設。
    - 聊天模型選擇器會請求 Gateway 的設定模型檢視。如果存在 `agents.defaults.models`，該允許清單會驅動選擇器，包括能讓供應商範圍目錄保持動態的 `provider/*` 項目。否則，選擇器會顯示明確的 `models.providers.*.models` 項目加上具有可用驗證的供應商。完整目錄可透過帶有 `view: "all"` 的偵錯 `models.list` RPC 取得。
    - 當最新的 Gateway 會話使用報告包含目前的內容權杖時，聊天編輯區域會顯示一個精簡的內容使用量指示器。在高內容壓力下會切換為警告樣式，並在達到建議的壓縮 級別時，顯示一個執行正常會話壓縮路徑的精簡按鈕。過期的權杖快照會隱藏，直到 Gateway 再次回報最新的使用量為止。

  </Accordion>
  <Accordion title="Talk mode (browser realtime)">
    Talk mode uses a registered realtime voice provider. Configure OpenAI with `talk.realtime.provider: "openai"` plus either `talk.realtime.providers.openai.apiKey`, `OPENAI_API_KEY`, or an `openai-codex` OAuth profile; configure Google with `talk.realtime.provider: "google"` plus `talk.realtime.providers.google.apiKey`. The browser never receives a standard provider API key. OpenAI receives an ephemeral Realtime client secret for WebRTC. Google Live receives a one-use constrained Live API auth token for a browser WebSocket session, with instructions and tool declarations locked into the token by the Gateway. Providers that only expose a backend realtime bridge run through the Gateway relay transport, so credentials and vendor sockets stay server-side while browser audio moves through authenticated Gateway RPCs. The Realtime session prompt is assembled by the Gateway; `talk.client.create` does not accept caller-provided instruction overrides.

    The Chat composer includes a Talk options button next to the Talk start/stop button. The options apply to the next Talk session and can override provider, transport, model, voice, reasoning effort, VAD threshold, silence duration, and prefix padding. When an option is blank, the Gateway uses configured defaults where available or the provider default. Selecting Gateway relay forces the backend relay path; selecting WebRTC keeps the session client-owned and fails instead of silently falling back to relay if the provider cannot create a browser session.

    In the Chat composer, the Talk control is the waves button next to the microphone dictation button. When Talk starts, the composer status row shows `Connecting Talk...`, then `Talk live` while audio is connected, or `Asking OpenClaw...` while a realtime tool call is consulting the configured larger model through `talk.client.toolCall`.

    Maintainer live smoke: `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` verifies the OpenAI backend WebSocket bridge, OpenAI browser WebRTC SDP exchange, Google Live constrained-token browser WebSocket setup, and the Gateway relay browser adapter with fake microphone media. The command prints provider status only and does not log secrets.

  </Accordion>
  <Accordion title="停止與中止">
    - 按一下 **Stop** (呼叫 `chat.abort`)。
    - 當運作正在進行時，一般的後續追問會進入佇列。在佇列訊息上按一下 **Steer** 以將該後續追問注入至正在進行的輪次中。
    - 輸入 `/stop` (或獨立的中止片語，如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`) 以進行頻外中止。
    - `chat.abort` 支援 `{ sessionKey }` (無 `runId`) 以中止該工作階段所有正在進行的運作。

  </Accordion>
  <Accordion title="中止部分保留">
    - 當運作中止時，部分助手文字仍可顯示在 UI 中。
    - 當存在緩衝輸出時，Gateway 會將中止的部分助手文字保存至對話紀錄歷史中。
    - 保存的項目包含中止中繼資料，以便對話紀錄取用者能區分中止的部分與一般完成輸出。

  </Accordion>
</AccordionGroup>

## PWA 安裝與 Web 推送

Control UI 隨附 `manifest.webmanifest` 與 service worker，因此現代瀏覽器可以將其安裝為獨立的 PWA。Web Push 讓 Gateway 即使在分頁或瀏覽器視窗未開啟時，也能透過通知喚醒已安裝的 PWA。

如果在 OpenClaw 更新後頁面立即顯示 **Protocol mismatch**，請先使用 `openclaw dashboard` 重新開啟儀表板並強制重新整理頁面。如果仍然失敗，請清除儀表板來源的網站資料，或在瀏覽器隱私視窗中測試；舊的分頁或瀏覽器 service worker 快取可能會讓更新前的 Control UI 套件繼續對較新的 Gateway 執行。

| 介面                                              | 作用                                                         |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `ui/public/manifest.webmanifest`                  | PWA 資訊清單。一旦可存取，瀏覽器會提供「安裝應用程式」選項。 |
| `ui/public/sw.js`                                 | 處理 `push` 事件與通知點擊的 Service worker。                |
| `push/vapid-keys.json` (位於 OpenClaw 狀態目錄下) | 用於簽署 Web Push 載荷的自動產生 VAPID 金鑰對。              |
| `push/web-push-subscriptions.json`                | 已保存的瀏覽器訂閱端點。                                     |

當您想要固定金鑰（用於多主機部署、金鑰輪替或測試）時，透過 Gateway 程序上的環境變數覆寫 VAPID 金鑰對：

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT`（預設為 `https://openclaw.ai`）

Control UI 使用這些受範圍限制的 Gateway 方法來註冊和測試瀏覽器訂閱：

- `push.web.vapidPublicKey` — 取得使用中的 VAPID 公開金鑰。
- `push.web.subscribe` — 註冊 `endpoint` 以及 `keys.p256dh`/`keys.auth`。
- `push.web.unsubscribe` — 移除已註冊的端點。
- `push.web.test` — 發送測試通知給呼叫者的訂閱。

<Note>Web Push 獨立於 iOS APNS 中繼路徑（請參閱 [Configuration](/zh-Hant/gateway/configuration) 以了解基於中繼的推播），以及現有的 `push.test` 方法，後者以原生行動裝置配對為目標。</Note>

## 託管嵌入

Assistant 訊息可以使用 `[embed ...]` 簡碼在行內呈現託管網頁內容。iframe sandbox 原則由 `gateway.controlUi.embedSandbox` 控制：

<Tabs>
  <Tab title="strict">停用託管嵌入內的腳本執行。</Tab>
  <Tab title="scripts (default)">在保持來源隔離的同時允許互動式嵌入；這是預設值，通常足以應付自包含的瀏覽器遊戲/小工具。</Tab>
  <Tab title="trusted">在 `allow-scripts` 之上新增 `allow-same-origin`，適用於有意需要更強權限的同站文件。</Tab>
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

<Warning>僅當嵌入文件確實需要同來源行為時才使用 `trusted`。對於大多數由 agent 產生的遊戲和互動式畫布，`scripts` 是較安全的選擇。</Warning>

絕對外部 `http(s)` 嵌入 URL 預設保持封鎖。如果您故意要讓 `[embed url="https://..."]` 載入第三方頁面，請設定 `gateway.controlUi.allowExternalEmbedUrls: true`。

## Chat 訊息寬度

群組的 Chat 訊息使用可讀的預設最大寬度。寬螢幕部署環境可以透過設定 `gateway.controlUi.chatMessageMaxWidth` 來覆寫它，而無需修改打包的 CSS：

```json5
{
  gateway: {
    controlUi: {
      chatMessageMaxWidth: "min(1280px, 82%)",
    },
  },
}
```

該值會在傳送到瀏覽器之前進行驗證。支援的值包括純長度和百分比，例如 `960px` 或 `82%`，以及受限的 `min(...)`、`max(...)`、`clamp(...)`、`calc(...)` 和 `fit-content(...)` 寬度表達式。

## Tailnet 存取（推薦）

<Tabs>
  <Tab title="整合式 Tailscale Serve（首選）">
    將 Gateway 保留在 loopback 上，並讓 Tailscale Serve 以 HTTPS 代理它：

    ```bash
    openclaw gateway --tailscale serve
    ```

    開啟：

    - `https://<magicdns>/` （或您設定的 `gateway.controlUi.basePath` ）

    預設情況下，當 `gateway.auth.allowTailscale` 為 `true` 時，Control UI/WebSocket Serve 要求可以透過 Tailscale identity headers (`tailscale-user-login`) 進行驗證。OpenClaw 透過使用 `tailscale whois` 解析 `x-forwarded-for` 位址並將其與標頭匹配來驗證身份，並且僅在請求透過 Tailscale 的 `x-forwarded-*` 標頭到達 loopback 時才接受這些請求。對於具有瀏覽器設備身份的 Control UI 操作員工作階段，此經過驗證的 Serve 路徑也會跳過設備配對的來回行程；無設備的瀏覽器和節點角色連線仍遵循正常的設備檢查。如果您希望即使是 Serve 流量也需要明確的共用金鑰憑證，請設定 `gateway.auth.allowTailscale: false`。然後使用 `gateway.auth.mode: "token"` 或 `"password"`。

    對於該非同步 Serve 身份路徑，相同客戶端 IP 和驗證範圍的失敗驗證嘗試會在速率限制寫入之前進行序列化。因此，來自同一瀏覽器的並發錯誤重試可能會在第二次請求時顯示 `retry later`，而不是兩個並行競爭的單純不符。

    <Warning>
    無 Token 的 Serve 驗證假設 Gateway 主機是受信任的。如果不受信任的本機程式碼可能在那台主機上執行，則要求 token/密碼驗證。
    </Warning>

  </Tab>
  <Tab title="綁定至 tailnet + token">
    ```bash
    openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
    ```

    然後開啟：

    - `http://<tailscale-ip>:18789/` （或您設定的 `gateway.controlUi.basePath` ）

    將匹配的共用金鑰貼上到 UI 設定中（作為 `connect.params.auth.token` 或 `connect.params.auth.password` 發送）。

  </Tab>
</Tabs>

## 不安全的 HTTP

如果您透過純 HTTP (`http://<lan-ip>` 或 `http://<tailscale-ip>`) 開啟儀表板，瀏覽器將在 **非安全上下文** 中運作並阻擋 WebCrypto。根據預設，如果沒有裝置身分，OpenClaw 會 **阻擋** Control UI 的連線。

文件記載的例外情況：

- 僅限 localhost 的非安全 HTTP 相容性，搭配 `gateway.controlUi.allowInsecureAuth=true`
- 透過 `gateway.auth.mode: "trusted-proxy"` 成功完成操作員 Control UI 身分驗證
- 破glass `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**建議的修復方法：** 使用 HTTPS (Tailscale Serve) 或在本機開啟 UI：

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (在 gateway 主機上)

<AccordionGroup>
  <Accordion title="非安全身分驗證切換行為">
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

    - 它允許 localhost Control UI 工作階段在非安全 HTTP 上下文中無需裝置身分即可繼續。
    - 它不會略過配對檢查。
    - 它不會放寬遠端 (非 localhost) 的裝置身分要求。

  </Accordion>
  <Accordion title="僅限 Break-glass">
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
    `dangerouslyDisableDeviceAuth` 會停用 Control UI 裝置身分檢查，這會造成嚴重的安全性降級。在緊急使用後請盡快還原。
    </Warning>

  </Accordion>
  <Accordion title="Trusted-proxy 備註">
    - 成功的 trusted-proxy 身分驗證可允許不含裝置身分的 **操作員** Control UI 工作階段。
    - 這 **不會** 延伸至 node-role Control UI 工作階段。
    - 同主機的 loopback reverse proxy 仍然不滿足 trusted-proxy 身分驗證；請參閱 [Trusted proxy auth](/zh-Hant/gateway/trusted-proxy-auth)。

  </Accordion>
</AccordionGroup>

關於 HTTPS 設定指引，請參閱 [Tailscale](/zh-Hant/gateway/tailscale)。

## 內容安全政策

Control UI 附帶嚴格的 `img-src` 策略：僅允許**同源**資產、`data:` URL 和本地產生的 `blob:` URL。瀏覽器會拒絕遠端 `http(s)` 和協議相對圖片 URL，且不會發出網路請求。

實務上的意義如下：

- 以相對路徑（例如 `/avatars/<id>`）提供的頭像和圖片仍然會呈現，包括 UI 擷取並轉換為本地 `blob:` URL 的已驗證頭像路由。
- 內聯 `data:image/...` URL 仍然會呈現（適用於通訊協定內的酬載）。
- 由 Control UI 建立的本地 `blob:` URL 仍然會呈現。
- 由頻道中繼資料發出的遠端頭像 URL 會在 Control UI 的頭像輔助程式中被移除，並替換為內建的 Logo/標誌，因此遭到入侵或惡意的頻道無法強制操作員瀏覽器擷取任意的遠端圖片。

您不需要變更任何設定即可獲得此行為 — 它始終開啟且無法設定。

## 頭像路由驗證

當設定 gateway auth 時，Control UI 的頭像端點需要與其餘 API 相同的 gateway token：

- `GET /avatar/<agentId>` 僅向已驗證的呼叫者傳回頭像圖片。`GET /avatar/<agentId>?meta=1` 根據相同規則傳回頭像中繼資料。
- 對這兩個路由的未經驗證請求都會被拒絕（與同層級的 assistant-media 路由相符）。這可防止頭像路由在受保護的主機上洩漏代理程式身份。
- Control UI 本身在擷取頭像時會將 gateway token 當作 bearer header 轉發，並使用已驗證的 blob URL，讓圖片仍能在儀表板中呈現。

如果您停用 gateway auth（在共用主機上不建議），頭像路由也會變成未經驗證，與 gateway 的其餘部分一致。

## 助理媒體路由驗證

當設定 gateway auth 時，助理本地媒體預覽使用兩階段路由：

- `GET /__openclaw__/assistant-media?meta=1&source=<path>` 需要一般的 Control UI 操作員驗證。瀏覽器在檢查可用性時會將 gateway token 當作 bearer header 傳送。
- 成功的元資料回應包含一個針對該特定來源路徑範圍的短期 `mediaTicket`。
- 瀏覽器呈現的圖片、音訊、視訊和文件 URL 使用 `mediaTicket=<ticket>`，而不是使用中的 Gateway 權杖或密碼。票證會很快過期，且無法授權不同的來源。

這使正常的媒體呈現能與瀏覽器原生媒體元素相容，而不會在可見的媒體 URL 中放入可重複使用的 Gateway 憑證。

## 建置 UI

Gateway 從 `dist/control-ui` 提供靜態檔案。請使用以下指令建置：

```bash
pnpm ui:build
```

選用的絕對基礎路徑 (當您想要固定的資產 URL 時)：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用於本地開發 (獨立的開發伺服器)：

```bash
pnpm ui:dev
```

然後將 UI 指向您的 Gateway WS URL (例如 `ws://127.0.0.1:18789`)。

## 空白的 Control UI 頁面

如果瀏覽器載入空白的儀表板，且開發者工具 沒有顯示有用的錯誤訊息，可能是擴充功能或早期的內容腳本 阻止了 JavaScript 模組應用程式的執行。靜態頁面包含一個純 HTML 復原面板，當 `<openclaw-app>` 在啟動後未註冊時會顯示該面板。

變更瀏覽器環境後，請使用面板的 **再試一次** 動作，或在執行這些檢查後手動重新整理：

- 停用會注入到所有頁面的擴充功能，尤其是具有 `<all_urls>` 內容腳本的擴充功能。
- 嘗試使用無痕視窗、乾淨的瀏覽器設定檔，或另一個瀏覽器。
- 保持 Gateway 運作，並在變更瀏覽器後驗證相同的儀表板 URL。

## 除錯/測試：開發伺服器 + 遠端 Gateway

Control UI 是靜態檔案；WebSocket 目標是可設定的，且可以與 HTTP 來源不同。當您想要在本地使用 Vite 開發伺服器，但 Gateway 在其他地方運行時，這非常方便。

<Steps>
  <Step title="啟動 UI 開發伺服器">
    ```bash
    pnpm ui:dev
    ```
  </Step>
  <Step title="使用 gatewayUrl 開啟">
    ```text
    http://localhost:5173/?gatewayUrl=ws%3A%2F%2F<gateway-host>%3A18789
    ```

    選用的一次性身份驗證 (如果需要)：

    ```text
    http://localhost:5173/?gatewayUrl=wss%3A%2F%2F<gateway-host>%3A18789#token=<gateway-token>
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Notes">
    - `gatewayUrl` 會在載入後儲存在 localStorage 中，並從 URL 中移除。
    - 如果您透過 `gatewayUrl` 傳遞完整的 `ws://` 或 `wss://` 端點，請對 `gatewayUrl` 值進行 URL 編碼，以便瀏覽器正確解析查詢字串。
    - 應盡可能透過 URL 片段 (`#token=...`) 傳遞 `token`。片段不會傳送到伺服器，這可避免請求日誌和 Referer 洩漏。為了相容性，舊版 `?token=` 查詢參數仍會被匯入一次，但僅作為備案，並且會在啟動後立即被移除。
    - `password` 僅保存在記憶體中。
    - 當設定 `gatewayUrl` 時，UI 不會回退到設定或環境認證。請明確提供 `token` (或 `password`)。缺少明確的認證是一種錯誤。
    - 當 Gateway 位於 TLS (Tailscale Serve、HTTPS Proxy 等) 後方時，請使用 `wss://`。
    - 為了防止點擊劫持，`gatewayUrl` 僅在頂層視窗 (非嵌入式) 中被接受。
    - 公開的非 loopback Control UI 部署必須明確設定 `gateway.controlUi.allowedOrigins` (完整來源)。來自 loopback、RFC1918/link-local、`.local`、`.ts.net` 或 Tailscale CGNAT 主機的私人同來源 LAN/Tailnet 載入，在未啟用 Host-header 情況下也被接受。
    - Gateway 啟動時可能會根據有效的執行時期綁定和連接埠產生本機來源，例如 `http://localhost:<port>` 和 `http://127.0.0.1:<port>`，但遠端瀏覽器來源仍需要明確的條目。
    - 除了嚴密控制的本機測試外，請勿使用 `gateway.controlUi.allowedOrigins: ["*"]`。這表示允許任何瀏覽器來源，而不是「符合我正在使用的任何主機」。
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用 Host-header 來源備援模式，但這是一個危險的安全性模式。

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

- [儀表板](/zh-Hant/web/dashboard) — 閘道儀表板
- [健康檢查](/zh-Hant/gateway/health) — 閘道健康監控
- [TUI](/zh-Hant/web/tui) — 終端機使用者介面
- [WebChat](/zh-Hant/web/webchat) — 基於瀏覽器的聊天介面
