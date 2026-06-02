---
summary: "Gateway 的基於瀏覽器控制 UI（聊天、活動、節點、配置）"
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

一旦批准，該裝置將被記住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤銷它，否則不需要重新批准。請參閱 [Devices CLI](/zh-Hant/cli/devices) 以了解令牌輪換和撤銷。

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

外觀面板保留了內建的 Claw、Knot 和 Dash 主題，以及一個瀏覽器本地的 tweakcn 匯入插槽。若要匯入主題，請開啟 [tweakcn editor](https://tweakcn.com/editor/theme)，選擇或建立主題，點擊 **Share**，並將複製的主題連結貼到外觀中。匯入器也接受 `https://tweakcn.com/r/themes/<id>` 註冊表 URL、編輯器 URL（如 `https://tweakcn.com/editor/theme?theme=amethyst-haze`）、相對 `/themes/<id>` 路徑、原始主題 ID，以及預設主題名稱（如 `amethyst-haze`）。

Appearance 還包含一個瀏覽器本地的 Text size（文字大小）設定。該設定與其他 Control UI 偏好設定一起儲存，適用於聊天文字、編輯器文字、工具卡片和聊天側邊欄，並確保文字輸入框至少為 16px，以便在聚焦時 Mobile Safari 不會自動縮放。

匯入的主題僅儲存在目前的瀏覽器設定檔中。它們不會寫入 gateway config，也不會跨裝置同步。替換匯入的主題會更新該本地插槽；清除它則會將現用主題切換回 Claw（如果之前選取的是匯入的主題）。

## 它能做什麼（目前）

<AccordionGroup>
  <Accordion title="聊天與通話">
    - 透過 Gateway WS 與模型聊天 (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)。
    - 聊天歷史記錄刷新會請求一個有限度的近期視窗，並對每則訊息的文字設有上限，如此一來，大型會議就不會強迫瀏覽器在聊天變得可用之前先渲染完整的逐字稿內容。
    - 透過瀏覽器即時會議進行通話。OpenAI 使用直接 WebRTC，Google Live 則透過 WebSocket 使用受限的一次性瀏覽器權杖，而僅限後端的即時語音外掛則使用 Gateway 中繼傳輸。用戶端擁有的提供者會議以 `talk.client.create` 開始；Gateway 中繼會議以 `talk.session.create` 開始。中繼會將提供者憑證保留在 Gateway 上，同時瀏覽器透過 `talk.session.appendAudio` 串流麥克風 PCM，透過 `talk.client.toolCall` 轉發 `openclaw_agent_consult` 提供者工具呼叫以供 Gateway 原則及較大型的已設定 OpenClaw 模型使用，並透過 `talk.client.steer` 或 `talk.session.steer` 路由執行中語音引導。
    - 在聊天中串流工具呼叫 + 即時工具輸出卡片 (代理程式事件)。
    - 活動分頁，包含來自現有 `session.tool` / 工具事件傳遞的瀏覽器本機、優先編輯摘要。

  </Accordion>
  <Accordion title="Channels, instances, sessions, dreams">
    - Channels：內建加上捆綁/外部外掛頻道狀態、QR 登入，以及各頻道設定 (`channels.status`、`web.login.*`、`config.patch`)。
    - 頻道探測重新整理會在慢速提供者檢查完成時保持先前的快照可見，並在探測或稽核超過其 UI 預算時標記部分快照。
    - Instances：存在列表 + 重新整理 (`system-presence`)。
    - Sessions：預設列出已設定的代理程式工作階段，從過期的未設定代理程式工作階段金鑰回退，並套用各工作階段的 model/thinking/fast/verbose/trace/reasoning 覆寫 (`sessions.list`、`sessions.patch`)。
    - Dreams：做夢狀態、啟用/停用切換，以及 Dream Diary 閱讀器 (`doctor.memory.status`、`doctor.memory.dreamDiary`、`config.patch`)。

  </Accordion>
  <Accordion title="Cron, skills, nodes, exec approvals">
    - Cron jobs：列出/新增/編輯/執行/啟用/停用 + 執行歷史 (`cron.*`)。
    - Skills：狀態、啟用/停用、安裝、API 金鑰更新 (`skills.*`)。
    - Nodes：列表 + caps (`node.list`)。
    - Exec approvals：編輯 gateway 或 node 允許清單 + 詢問 `exec host=gateway/node` 的詢問原則 (`exec.approvals.*`)。

  </Accordion>
  <Accordion title="設定">
    - 檢視/編輯 `~/.openclaw/openclaw.json` (`config.get`, `config.set`)。
    - 套用並在驗證 (`config.apply`) 後重新啟動，並喚醒上次使用的工作階段。
    - 寫入包含 base-hash 防護，以防止覆蓋並行的編輯。
    - 寫入 (`config.set`/`config.apply`/`config.patch`) 會預先對送出的設定負載中的參照進行有效的 SecretRef 解析；未解決的有效送出參照會在寫入前被拒絕。
    - 表單儲存會捨棄無法從已儲存設定還原的過期編修佔位符，同時保留仍對應到已儲存機密的編修值。
    - 綱要 + 表單呈現 (`config.schema` / `config.schema.lookup`，包括欄位 `title` / `description`、相符的 UI 提示、直接子項摘要、巢狀物件/萬用字元/陣列/組合節點上的文件中繼資料，再加上可用的外掛 + 頻道綱要)；僅當快照能安全地進行原始往返時，才提供原始 JSON 編輯器。
    - 如果快照無法安全地進行原始文字往返，Control UI 會強制使用表單模式，並針對該快照停用原始模式。
    - 原始 JSON 編輯器的「重設為已儲存」會保留原始編寫的形狀 (格式、註解、`$include` 版面配置)，而不是重新呈現扁平化的快照，因此當快照能安全地進行往返時，外部編輯在重設後會保留。
    - 結構化的 SecretRef 物件值會在表單文字輸入中呈現為唯讀，以防止意外將物件轉換為字串而毀損。

  </Accordion>
  <Accordion title="Debug, logs, update">
    - Debug：狀態/健康/模型快照 + 事件日誌 + 手動 RPC 呼叫 (`status`, `health`, `models.list`)。
    - 事件日誌包含 Control UI 重新整理/RPC 時間、緩慢的聊天/設定呈現時間，以及當瀏覽器公開這些 PerformanceObserver 進入類型時，針對長動畫幀或長任務的瀏覽器回應性條目。
    - Logs：Gateway 檔案日誌的即時追蹤，具備篩選/匯出功能 (`logs.tail`)。
    - Update：執行套件/git 更新 + 重新啟動 (`update.run`)，並附上重新啟動報告，然後在重新連線後輪詢 `update.status` 以驗證執行中的 Gateway 版本。

  </Accordion>
  <Accordion title="Cron jobs panel notes">
    - 對於隔離工作，傳遞預設為公告摘要。如果您想要僅限內部執行，可以切換為 none。
    - 當選擇公告時，會出現頻道/目標欄位。
    - Webhook 模式使用 `delivery.mode = "webhook"`，並將 `delivery.to` 設定為有效的 HTTP(S) webhook URL。
    - 對於主要階段工作，可使用 webhook 和 none 傳遞模式。
    - 進階編輯控制項包括執行後刪除、清除代理程式覆寫、cron 精確/交錯選項、代理程式模型/思考覆寫，以及盡力而為的傳遞切換開關。
    - 表單驗證與欄位層級錯誤為內嵌顯示；無效值會停用儲存按鈕，直到修正為止。
    - 設定 `cron.webhookToken` 以傳送專用的 bearer token，如果省略，則 webhook 會在不含標頭的情況下傳送。
    - 已棄用的後援：儲存具有 `notify: true` 的舊版工作在遷移前仍可使用 `cron.webhook`。

  </Accordion>
</AccordionGroup>

## 活動分頁

「活動」分頁是一個用於即時工具活動的暫時性瀏覽器本地觀察器。它是從驅動聊天工具卡片的相同 Gateway `session.tool` / 工具事件串流衍生而來；它不會新增另一個 Gateway 事件系列、端點、永久性活動儲存、指標摘要或外部觀察器串流。

活動項目僅保留經過清理的摘要以及已編輯、截斷的輸出預覽。工具參數值不會儲存在活動狀態中；UI 會顯示參數已隱藏，並僅記錄參數欄位的計數。記憶體中的清單會跟隨目前的瀏覽器分頁，在控制 UI 內的導覽中保持不變，並在頁面重新載入、切換工作階段或按一下 **「清除」** 時重設。

## 聊天行為

<AccordionGroup>
  <Accordion title="Send and history semantics">
    - `chat.send` 是 **非阻斷的**：它會立即以 `{ runId, status: "started" }` 確認，回應則透過 `chat` 事件串流傳輸。
    - 聊天上傳功能接受圖片以及非視訊檔案。圖片會保留原始路徑；其他檔案則會作為受控媒體儲存，並在歷史記錄中顯示為附件連結。
    - 使用相同的 `idempotencyKey` 重新傳送，在執行中時會回傳 `{ status: "in_flight" }`，完成後則回傳 `{ status: "ok" }`。
    - 為了 UI 安全性，`chat.history` 回應的大小會受到限制。當逐字稿條目過大時，Gateway 可能會截斷長文字欄位、省略龐大的中繼資料區塊，並以佔位符 (`[chat.history omitted: message too large]`) 取代過大的訊息。
    - 當可見的助理訊息在 `chat.history` 中被截斷時，側邊閱讀器可以透過 `sessionKey` 的 `chat.message.get`，視情況啟用 `agentId`，以及逐字稿 `messageId`，按需取得完整的顯示正規化逐字稿條目。如果 Gateway 仍無法傳回更多內容，閱讀器會顯示明確的不可用狀態，而不是無聲地重複截斷的預覽。
    - 助理/生成的圖片會作為受控媒體參照保存，並透過已驗證的 Gateway 媒體 URL 回傳，因此重新載入時不會依賴保留在聊天歷史記錄回應中的原始 base64 圖片內容。
    - 當呈現 `chat.history` 時，Control UI 會從可見的助理文字中移除僅供顯示的內聯指令標籤 (例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`)、純文字工具呼叫 XML 內容 (包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截斷的工具呼叫區塊)，以及外洩的 ASCII/全形模型控制權杖，並且會省略其所有可見文字僅為確切的靜默權杖 `NO_REPLY` / `no_reply` 或心跳確認權杖 `HEARTBEAT_OK` 的助理條目。
    - 在主動傳送和最終歷史記錄重新整理期間，如果 `chat.history` 短暫回傳較舊的快照，聊天檢視會讓本機的樂觀使用者/助理訊息保持可見；一旦 Gateway 歷史記錄趕上進度，正規的逐字稿就會取代那些本機訊息。
    - 即時 `chat` 事件代表傳遞狀態，而 `chat.history` 則是根據持續性工作階段逐字稿重建。工具最終事件發生後，Control UI 會重新載入歷史記錄，並僅合併少量的樂觀結尾；逐字稿邊界記載於 [WebChat](/zh-Hant/web/webchat) 中。
    - `chat.inject` 會在工作階段逐字稿中附加助理訊息，並廣播 `chat` 事件以進行僅 UI 的更新 (無代理程式執行，無頻道傳遞)。
    - 聊天標題在工作階段選擇器之前顯示代理程式篩選器，且工作階段選擇器的範圍由選定的代理程式決定。切換代理程式僅會顯示與該代理程式關聯的工作階段；若尚未儲存儀表板工作階段，則會還原至該代理程式的主要工作階段。
    - 在桌面寬度下，聊天控制項會保持在同一個緊湊列，並在向下捲動逐字稿時摺疊；向上捲動、回到頂部或觸及底部時會恢復控制項。
    - 連續重複的純文字訊息會顯示為一個帶有計數徽章的氣泡。攜帶圖片、附件、工具輸出或畫布預覽的訊息則不會摺疊。
    - 聊天標頭的模型和思考選擇器會透過 `sessions.patch` 立即修補現用工作階段；它們是持久的工作階段覆寫，而非僅適用於單次傳送的選項。
    - 如果您在相同工作階段的模型選擇器變更仍在儲存時傳送訊息，編輯器會先等待該工作階段修補完成，再呼叫 `chat.send`，以確保傳送時使用選定的模型。
    - 在 Control UI 中輸入 `/new` 會建立並切換到與「新聊天」相同的全新儀表板工作階段，除非已設定 `session.dmScope: "main"` 且目前的父項是代理程式的主要工作階段；在這種情況下，它會就地重設主要工作階段。輸入 `/reset` 則會保留 Gateway 對目前工作階段的明確就地重設。
    - 聊天模型選擇器會請求 Gateway 的設定模型檢視。如果存在 `agents.defaults.models`，該允許清單會驅動選擇器，包括保持提供者範圍目錄動態的 `provider/*` 條目。否則，選擇器會顯示明確的 `models.providers.*.models` 條目加上具有可用驗證的提供者。完整目錄仍可透過帶有 `view: "all"` 的偵錯 `models.list` RPC 取得。
    - 當最新的 Gateway 工作階段使用量報告包含目前的內容權杖時，聊天編輯器區域會顯示一個簡潔的內容使用量指示器。當內容壓力過高時，它會切換為警告樣式，並在達到建議的壓縮層級時，顯示一個執行正常工作階段壓縮路徑的簡潔按鈕。過期的權杖快照會隱藏，直到 Gateway 再次回報最新使用量為止。

  </Accordion>
  <Accordion title="對話模式（瀏覽器即時）">
    對話模式使用已註冊的即時語音供應商。使用 `talk.realtime.provider: "openai"` 加上 `talk.realtime.providers.openai.apiKey`、`OPENAI_API_KEY` 或 `openai` OAuth 設定檔來設定 OpenAI；使用 `talk.realtime.provider: "google"` 加上 `talk.realtime.providers.google.apiKey` 來設定 Google。對於託管的 GPT 即時模型，OpenClaw 優先使用 `openai` OAuth 設定檔而非 `OPENAI_API_KEY`；明確指定的 OpenAI 即時 `apiKey` 則是進階的覆蓋選項。瀏覽器絕不會接收到標準的供應商 API 金鑰。OpenAI 會收到一個用於 WebRTC 的臨時 Realtime 用戶端密鑰。Google Live 會收到一個僅供瀏覽器 WebSocket 工作階段使用一次的受限 Live API 驗證權杖，其中指示和工具宣告由 Gateway 鎖定在權杖中。僅公開後端即時橋接器的供應商會透過 Gateway 中繼傳輸執行，因此憑證和供應商 Socket 會保留在伺服器端，而瀏覽器音訊則透過已驗證的 Gateway RPC 傳輸。即時工作階段提示詞由 Gateway 組裝；`talk.client.create` 不接受呼叫者提供的指示覆寫。

    Chat 編輯器在對話開始/停止按鈕旁邊包含一個對話選項按鈕。這些選項適用於下一個對話工作階段，並可覆寫供應商、傳輸、模型、語音、推理強度、VAD 臨界值、靜音持續時間和前綴填充。當選項為空白時，Gateway 會在可用時使用設定的預設值或供應商預設值。選取 Gateway 中繼會強制使用後端中繼路徑；選取 WebRTC 則保持工作階段由用戶端擁有，如果供應商無法建立瀏覽器工作階段，將會失敗而非靜默地回退到中繼。

    在 Chat 編輯器中，對話控制項是麥克風聽寫按鈕旁邊的波浪按鈕。當對話開始時，編輯器狀態列會顯示 `Connecting Talk...`，然後在音訊連線時顯示 `Talk live`，或當即時工具呼叫透過 `talk.client.toolCall` 諮詢設定的較大模型時顯示 `Asking OpenClaw...`。

    維護者即時測試：`OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` 會驗證 OpenAI 後端 WebSocket 橋接器、OpenAI 瀏覽器 WebRTC SDP 交換、Google Live 受限權杖瀏覽器 WebSocket 設定，以及具有模擬麥克風媒體的 Gateway 中繼瀏覽器適配器。該指令僅列印供應商狀態，不會記錄機密。

  </Accordion>
  <Accordion title="停止與中止">
    - 點擊 **Stop**（呼叫 `chat.abort`）。
    - 當執行正在進行時，一般的後續追問會進入佇列。點擊佇列訊息上的 **Steer** 將該後續追問注入正在執行的輪次中。
    - 輸入 `/stop`（或獨立的中止指令如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`）以從外部中止。
    - `chat.abort` 支援 `{ sessionKey }`（無 `runId`）以中止該工作階段所有正在進行的執行。

  </Accordion>
  <Accordion title="Abort partial retention">
    - 當運作被終止時，部分的助理文字仍可能顯示在 UI 中。
    - 當存在緩衝輸出時，Gateway 會將被終止的部分助理文字保存至對話紀錄中。
    - 保存的項目包含終止元數據，因此對話紀錄的消費者能區分終止的部分文字與正常的完成輸出。

  </Accordion>
</AccordionGroup>

## PWA 安裝與 Web 推播

Control UI 附帶 `manifest.webmanifest` 和 service worker，因此現代瀏覽器可以將其安裝為獨立的 PWA。Web Push 讓 Gateway 即使在分頁或瀏覽器視窗未開啟時，也能透過通知喚醒已安裝的 PWA。

如果在 OpenClaw 更新後頁面立即顯示 **Protocol mismatch**，請先使用 `openclaw dashboard` 重新開啟儀表板並強制重新整理頁面。如果仍然失敗，請清除儀表板來源的網站資料，或在隱私瀏覽視窗中測試；舊的分頁或瀏覽器 service worker 快取可能會繼續執行更新前的 Control UI 套件，與較新的 Gateway 不相容。

| Surface                                         | 功能說明                                                       |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `ui/public/manifest.webmanifest`                | PWA manifest。一旦瀏覽器可存取，便會提供「安裝應用程式」選項。 |
| `ui/public/sw.js`                               | 處理 `push` 事件和通知點擊的 Service worker。                  |
| `push/vapid-keys.json` (在 OpenClaw 狀態目錄下) | 用於簽署 Web 推播載荷的自動產生 VAPID 金鑰對。                 |
| `push/web-push-subscriptions.json`              | 已保存的瀏覽器訂閱端點。                                       |

當您想要釘選金鑰（針對多主機部署、機密輪替或測試）時，透過 Gateway 程序上的環境變數覆寫 VAPID 金鑰對：

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT` (預設為 `https://openclaw.ai`)

Control UI 使用這些受範圍限制的 Gateway 方法來註冊和測試瀏覽器訂閱：

- `push.web.vapidPublicKey` — 取得有效的 VAPID 公鑰。
- `push.web.subscribe` — 註冊 `endpoint` 以及 `keys.p256dh`/`keys.auth`。
- `push.web.unsubscribe` — 移除已註冊的端點。
- `push.web.test` — 發送測試通知給呼叫者的訂閱。

<Note>Web Push 與 iOS APNS 中繼路徑無關（請參閱 [Configuration](/zh-Hant/gateway/configuration) 以了解基於中繊的推送），且獨於既有的 `push.test` 方法，後者針對的是原生行動裝置配對。</Note>

## 託管嵌入式內容

助理訊息可以使用 `[embed ...]` 簡碼內嵌呈現託管的網頁內容。iframe 沙箱策略由 `gateway.controlUi.embedSandbox` 控制：

<Tabs>
  <Tab title="strict">停用託管嵌入式內容中的腳本執行。</Tab>
  <Tab title="scripts (default)">在保持來源隔離的同時允許互動式嵌入式內容；這是預設值，通常足以滿足自給自足的瀏覽器遊戲/小工具。</Tab>
  <Tab title="trusted">針對故意需要更強權限的同站文件，在 `allow-scripts` 之上新增 `allow-same-origin`。</Tab>
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

<Warning>僅當內嵌文件確實需要同源行為時，才使用 `trusted`。對於大多數由代理程式產生的遊戲和互動式畫布，`scripts` 是更安全的選擇。</Warning>

絕對外部 `http(s)` 內嵌 URL 預設保持封鎖狀態。如果您故意想要讓 `[embed url="https://..."]` 載入第三方頁面，請設定 `gateway.controlUi.allowExternalEmbedUrls: true`。

## 聊天訊息寬度

分組的聊天訊息使用可讀的預設最大寬度。寬螢幕部署可以透過設定 `gateway.controlUi.chatMessageMaxWidth` 來覆寫它，而無需修改打包的 CSS：

```json5
{
  gateway: {
    controlUi: {
      chatMessageMaxWidth: "min(1280px, 82%)",
    },
  },
}
```

該值在傳送到瀏覽器之前會經過驗證。支援的值包括純長度和百分比（例如 `960px` 或 `82%`），以及受限的 `min(...)`、`max(...)`、`clamp(...)`、`calc(...)` 和 `fit-content(...)` 寬度表達式。

## Tailnet 存取（推薦）

<Tabs>
  <Tab title="整合式 Tailscale Serve（首選）">
    將 Gateway 保持在 loopback，並讓 Tailscale Serve 透過 HTTPS 進行代理：

    ```bash
    openclaw gateway --tailscale serve
    ```

    開啟：

    - `https://<magicdns>/` （或您設定的 `gateway.controlUi.basePath` ）

    預設情況下，當 `gateway.auth.allowTailscale` 為 `true` 時，Control UI/WebSocket Serve 要求可以透過 Tailscale 身份標頭（ `tailscale-user-login` ）進行驗證。OpenClaw 會透過 `tailscale whois` 解析 `x-forwarded-for` 位址並將其與標頭比對來驗證身分，並且僅在要求到達 loopback 且帶有 Tailscale 的 `x-forwarded-*` 標頭時才接受這些要求。對於具有瀏覽器裝置身分的 Control UI 操作者階段，此經過驗證的 Serve 路徑也會跳過裝置配對往返；無裝置的瀏覽器和節點角色連線仍遵循正常的裝置檢查。如果您想即使對於 Serve 流量也要求明確的共享密鑰憑證，請設定 `gateway.auth.allowTailscale: false` 。然後使用 `gateway.auth.mode: "token"` 或 `"password"` 。

    對於該非同步 Serve 身分路徑，相同客戶端 IP 和驗證範圍的失敗驗證嘗試會在速率限制寫入之前進行序列化。因此，來自同一瀏覽器的並發錯誤重試可能會在第二個要求上顯示 `retry later` ，而不是兩個簡單的不匹配並行競爭。

    <Warning>
    無 Token Serve 驗證假設 gateway 主機是受信任的。如果不受信任的本地程式碼可能在那台主機上執行，請要求 token/密碼驗證。
    </Warning>

  </Tab>
  <Tab title="綁定至 tailnet + token">
    ```bash
    openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
    ```

    然後開啟：

    - `http://<tailscale-ip>:18789/` （或您設定的 `gateway.controlUi.basePath` ）

    將匹配的共享密鑰貼上到 UI 設定中（作為 `connect.params.auth.token` 或 `connect.params.auth.password` 發送）。

  </Tab>
</Tabs>

## 不安全的 HTTP

如果您透過純 HTTP (`http://<lan-ip>` 或 `http://<tailscale-ip>`) 開啟儀表板，瀏覽器將在**不安全的環境**中執行並封鎖 WebCrypto。根據預設，OpenClaw 會**封鎖**沒有裝置身分的 Control UI 連線。

記載的例外情況：

- 僅限 localhost 的不安全 HTTP 相容性，搭配 `gateway.controlUi.allowInsecureAuth=true`
- 操作員透過 `gateway.auth.mode: "trusted-proxy"` 成功進行 Control UI 身分驗證
- 緊急存取 `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**建議的修復方法：** 使用 HTTPS (Tailscale Serve) 或在本地開啟 UI：

- `https://<magicdns>/` (服務)
- `http://127.0.0.1:18789/` (在閘道主機上)

<AccordionGroup>
  <Accordion title="不安全身分驗證切換行為">
    ```json5
    {
      gateway: {
        controlUi: { allowInsecureAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    `allowInsecureAuth` 僅是一個本機相容性切選器：

    - 它允許 localhost Control UI 工作階段在不安全的 HTTP 環境下，無需裝置身分即可繼續進行。
    - 它不會略過配對檢查。
    - 它不會放寬遠端 (非 localhost) 裝置身分的要求。

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
    `dangerouslyDisableDeviceAuth` 會停用 Control UI 裝置身分檢查，這會大幅降低安全性。在緊急使用後請盡快還原。
    </Warning>

  </Accordion>
  <Accordion title="受信任 Proxy 注意事項">
    - 成功的受信任 proxy 身分驗證可以在沒有裝置身分的情況下接受**操作員** Control UI 工作階段。
    - 這**不會**延伸至節點角色的 Control UI 工作階段。
    - 同主機回送反向 Proxy 仍無法滿足受信任 proxy 身分驗證；請參閱 [受信任 proxy 身分驗證](/zh-Hant/gateway/trusted-proxy-auth)。

  </Accordion>
</AccordionGroup>

參閱 [Tailscale](/zh-Hant/gateway/tailscale) 以取得 HTTPS 設定指南。

## 內容安全性原則

Control UI 隨附嚴格的 `img-src` 政策：僅允許**同源**資產、`data:` URL，以及本機產生的 `blob:` URL。遠端 `http(s)` 和相對通訊協定的圖片 URL 會被瀏覽器拒絕，且不會發出網路擷取要求。

實際上的含義：

- 在相對路徑下提供的頭像和圖像（例如 `/avatars/<id>`）仍然會渲染，包括 UI 獲取並轉換為本地 `blob:` URL 的經過身份驗證的頭像路由。
- 內聯 `data:image/...` URL 仍然會渲染（對於協議內內的 payload 很有用）。
- 由 Control UI 創建的本地 `blob:` URL 仍然會渲染。
- 由通道中繼資料發出的遠端頭像 URL 會在 Control UI 的頭像輔助程式中被移除，並替換為內建的標誌/徽章，因此被洩漏或惡意的通道無法強制操作員瀏覽器進行任意的遠端圖像擷取。

您不需要變更任何設定即可獲得此行為 — 它始終開啟且不可配置。

## 頭像路由驗證

當設定 Gateway 驗證時，Control UI 頭像端點需要與 API 其餘部分相同的 Gateway 權杖：

- `GET /avatar/<agentId>` 僅向經過身份驗證的調用者返回頭像圖像。`GET /avatar/<agentId>?meta=1` 根據相同的規則返回頭像元數據。
- 對任一路由的未驗證請求將被拒絕（與同層級的 assistant-media 路由相符）。這可防止頭像路由在其他wise受保護的主機上洩漏代理程式身分。
- Control UI 本身在擷取頭像時會將 Gateway 權杖作為 Bearer 標頭轉發，並使用已驗證的 Blob URL，以便圖像在儀表板中仍然會渲染。

如果您停用 Gateway 驗證（在共用主機上不建議），頭像路由也會變成未驗證，與 Gateway 其餘部分一致。

## 助理媒體路由驗證

當設定 Gateway 驗證時，助理本機媒體預覽會使用兩步驟路由：

- `GET /__openclaw__/assistant-media?meta=1&source=<path>` 需要正常的 Control UI 操作員身份驗證。瀏覽器在檢查可用性時會將網關令牌作為不記名令牌 (bearer header) 發送。
- 成功的元數據響應包含一個針對該確切源路徑的短期 `mediaTicket`。
- 瀏覽器渲染的圖像、音頻、視頻和文檔 URL 使用 `mediaTicket=<ticket>` 而不是活動的網關令牌或密碼。票據很快過期，且無法授權不同的源。

這讓一般的媒體呈現能與瀏覽器原生媒體元素相容，而不會將可重複使用的 Gateway 憑證置於可見的媒體 URL 中。

## 建置 UI

網關從 `dist/control-ui` 提供靜態文件。使用以下命令構建它們：

```bash
pnpm ui:build
```

選用的絕對基礎路徑（當您想要固定的資產 URL 時）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用於本機開發（獨立的開發伺服器）：

```bash
pnpm ui:dev
```

然後將 UI 指向您的網關 WS URL（例如 `ws://127.0.0.1:18789`）。

## 空白的 Control UI 頁面

如果瀏覽器加載了空白的儀表板並且 DevTools 未顯示有用的錯誤，可能是擴充功能或早期的內容腳本阻止了 JavaScript 模組應用的執行。靜態頁面包含一個純 HTML 恢復面板，當 `<openclaw-app>` 在啟動後未註冊時會顯示該面板。

在變更瀏覽器環境後，請使用面板中的 **Try again** (再試一次) 動作，或在進行這些檢查後手動重新載入：

- 停用注入到所有頁面的擴充功能，尤其是具有 `<all_urls>` 內容腳本的擴充功能。
- 嘗試使用私密視窗、乾淨的瀏覽器設定檔或另一個瀏覽器。
- 讓 Gateway 保持執行，並在變更瀏覽器後驗證相同的儀表板 URL。

## 除錯/測試：開發伺服器 + 遠端 Gateway

Control UI 是由靜態檔案組成；WebSocket 目標是可設定的，且可以與 HTTP 來源不同。當您想要在本地執行 Vite 開發伺服器，但在其他地方執行 Gateway 時，這非常方便。

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

    選用的一次性授權（如果需要）：

    ```text
    http://localhost:5173/?gatewayUrl=wss%3A%2F%2F<gateway-host>%3A18789#token=<gateway-token>
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Notes">
    - `gatewayUrl` 會在載入後儲存在 localStorage 中，並從 URL 中移除。
    - 如果您透過 `gatewayUrl` 傳遞完整的 `ws://` 或 `wss://` 端點，請對 `gatewayUrl` 值進行 URL 編碼，以便瀏覽器正確解析查詢字串。
    - 應盡可能透過 URL 片段 (`#token=...`) 傳遞 `token`。片段不會傳送到伺服器，這可以避免請求日誌和 Referer 洩漏。舊版的 `?token=` 查詢參數為了相容性仍會匯入一次，但僅作為後備方案，並會在啟動後立即剝離。
    - `password` 僅保存在記憶體中。
    - 當設定 `gatewayUrl` 時，UI 不會回退至設定或環境憑證。請明確提供 `token` (或 `password`)。缺少明確的憑證是一個錯誤。
    - 當 Gateway 位於 TLS (Tailscale Serve、HTTPS proxy 等) 後方時，請使用 `wss://`。
    - 為防止點擊劫持，`gatewayUrl` 僅在頂層視窗 (非內嵌) 中被接受。
    - 公共非回環 Control UI 部署必須明確設定 `gateway.controlUi.allowedOrigins` (完整來源)。來自回環、RFC1918/link-local、`.local`、`.ts.net` 或 Tailscale CGNAT 主機的私有同源 LAN/Tailnet 載入在未啟用 Host-header 情況下即被接受。
    - Gateway 啟動時可能會根據有效的執行時期綁定和連接埠植入本地來源，例如 `http://localhost:<port>` 和 `http://127.0.0.1:<port>`，但遠端瀏覽器來源仍需明確輸入。
    - 除嚴密控制的本地測試外，請勿使用 `gateway.controlUi.allowedOrigins: ["*"]`。這表示允許任何瀏覽器來源，而不是「符合我正在使用的任何主機」。
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用 Host-header 來源後備模式，但這是一種危險的安全模式。

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
