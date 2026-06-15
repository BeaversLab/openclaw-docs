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

一旦獲批准，該裝置將被記住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤銷它，否則不需要重新批准。請參閱 [Devices CLI](/zh-Hant/cli/devices) 以了解 token 輪換和撤銷。

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

外觀」面板保留了內建的 Claw、Knot 和 Dash 主題，外加一個瀏覽器本地的 tweakcn 匯入插槽。若要匯入主題，請開啟 [tweakcn editor](https://tweakcn.com/editor/theme)，選擇或建立主題，點擊 **Share**，然後將複製的主題連結貼上到外觀設定中。匯入工具也接受 `https://tweakcn.com/r/themes/<id>` registry URL、像是 `https://tweakcn.com/editor/theme?theme=amethyst-haze` 的編輯器 URL、相對 `/themes/<id>` 路徑、原始主題 ID，以及諸如 `amethyst-haze` 的預設主題名稱。

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
    - MCP 擁有專用的設定頁面，用於已設定的伺服器、啟用狀態、OAuth/過濾器/平行摘要、常見操作員指令，以及範圍限定 `mcp` 設定編輯器。
    - 套用 + 驗證並重新啟動 (`config.apply`) 並喚醒最後一個作用中的工作階段。
    - 寫入包含雜湊基底防護，以防止覆寫並行編輯。
    - 寫入 (`config.set`/`config.apply`/`config.patch`) 會對提交設定負載中的參照進行有效 SecretRef 的預檢解析；未解析的有效提交參照會在寫入前被拒絕。
    - 表單儲存會捨棄無法從已儲存設定中還原的過時編輯占位符，同時保留仍對應至已儲存密碼的編輯值。
    - 綱要 + 表單呈現 (`config.schema` / `config.schema.lookup`，包括欄位 `title` / `description`、相符的 UI 提示、直接子項摘要、巢狀物件/萬用字元/陣列/組合節點上的文件元資料，以及在可用時的外掛程式 + 頻道綱要)；當快照具有安全的原始往返時，才會提供原始 JSON 編輯器。
    - 如果快照無法安全地往返原始文字，Control UI 會強制使用表單模式，並停用該快照的原始模式。
    - 原始 JSON 編輯器的「重設為已儲存」會保留原始撰寫的形狀 (格式、註解、`$include` 版面配置)，而不是重新呈現扁平化的快照，因此當快照可以安全地往返時，外部編輯會在重設後保留下來。
    - 結構化的 SecretRef 物件值會在表單文字輸入中呈現為唯讀，以防止意外將物件轉換為字串的損毀。

  </Accordion>
  <Accordion title="Debug, logs, update">
    - Debug：狀態/健康/模型快照 + 事件日誌 + 手動 RPC 呼叫 (`status`, `health`, `models.list`)。
    - 事件日誌包含 Control UI 重新整理/RPC 時序、緩慢的聊天/配置渲染時序，以及當瀏覽器暴露這些 PerformanceObserver 進入類型時，針對長動畫影格或長任務的瀏覽器響應性項目。
    - Logs：帶有篩選/匯出功能的閘道檔案日誌即時 tail (`logs.tail`)。
    - Update：執行套件/git 更新 + 重新啟動 (`update.run`) 並提供重新啟動報告，然後在重新連線後輪詢 `update.status` 以驗證執行中的閘道版本。

  </Accordion>
  <Accordion title="Cron jobs panel notes">
    - 對於隔離作業，傳送預設為公告摘要。如果您僅需要內部執行，可以切換為 none。
    - 當選擇公告時，會出現頻道/目標欄位。
    - Webhook 模式使用 `delivery.mode = "webhook"`，並將 `delivery.to` 設定為有效的 HTTP(S) webhook URL。
    - 對於主階段作業，可使用 webhook 和 none 傳送模式。
    - 進階編輯控制項包括執行後刪除、清除代理覆寫、cron 精確/交錯選項、代理模型/思考覆寫，以及盡力傳送切換開關。
    - 表單驗證為行內顯示欄位層級錯誤；無效值會停用儲存按鈕，直到修正為止。
    - 設定 `cron.webhookToken` 以傳送專屬的 bearer token，如果省略，則 webhook 將在沒有 auth 標頭的情況下傳送。
    - 已棄用的後備方案：執行 `openclaw doctor --fix` 以使用 `notify: true` 將儲存的舊版作業從 `cron.webhook` 遷移至明確的每個作業 webhook 或完成傳送。

  </Accordion>
</AccordionGroup>

## MCP 頁面

專用的 MCP 頁面是 `mcp.servers` 下 OpenClaw 管理之 MCP 伺服器的操作員檢視。它不會自行啟動 MCP 傳輸；使用它來檢查和編輯已儲存的配置，然後在您需要即時伺服器驗證時使用 `openclaw mcp doctor --probe`。

典型工作流程：

1. 從側邊欄開啟 **MCP**。
2. 檢查摘要卡片，以查看總數、已啟用、OAuth 和已篩選的伺服器計數。
3. 檢閱每一個伺服器列的傳輸、啟用狀態、驗證、篩選器、逾時設定和指令提示。
4. 切換啟用狀態，當伺服器應保持設定但不在執行階段探索中出現時。
5. 編輯範圍設定 `mcp` 區段，以設定伺服器定義、標頭、TLS/mTLS 路徑、OAuth 中繼資料、工具篩選器和 Codex 投影中繼資料。
6. 使用 **Save** 進行設定寫入，或在執行中的 Gateway 應套用變更後的設定時，使用 **Save & Publish**。
7. 當編輯的程序需要靜態診斷、即時驗證或清除快取的執行階段時，請從終端機執行 `openclaw mcp status --verbose`、`openclaw mcp doctor --probe` 或 `openclaw mcp reload`。

頁面在呈現前會對包含憑證的 URL 值進行編修，並在指令片段中對伺服器名稱加上引號，以便複製的指令在遇到空格或 shell 中繼字元時仍能正常運作。完整的 CLI 和設定參考資料位於 [MCP](/zh-Hant/cli/mcp)。

## 活動分頁

活動分頁是針對即時工具活動的暫時性瀏覽器本機觀察器。它源自與驅動 Chat 工具卡片相同的 Gateway `session.tool` / 工具事件串流；它不會新增其他的 Gateway 事件系列、端點、持久活動存放區、計量摘要或外部觀察者串流。

活動項目僅保留經過清理的摘要以及編修過、截斷的輸出預覽。工具引數值不會儲存在活動狀態中；UI 會顯示引數已隱藏，並僅記錄引數欄位的數量。記憶體內清單會跟隨目前的瀏覽器分頁，在 Control UI 內的導航中保留，並在頁面重新載入、切換工作階段或按下 **Clear** 時重設。

## Chat 行為

<AccordionGroup>
  <Accordion title="Send and history semantics">
    - `chat.send` 為**非阻塞**：它會立即以 `{ runId, status: "started" }` 確認，並透過 `chat` 事件串流傳回回應。
    - 聊天上傳功能接受圖片及非影片檔案。圖片會保留原始圖片路徑；其他檔案則會儲存為受控媒體，並在歷史紀錄中顯示為附件連結。
    - 使用相同的 `idempotencyKey` 重新傳送時，執行中會傳回 `{ status: "in_flight" }`，完成後則傳回 `{ status: "ok" }`。
    - 為確保 UI 安全，`chat.history` 回應會有大小限制。當文字記錄條目過大時，Gateway 可能會截斷長文字欄位、省略龐大的中繼資料區塊，並以預留位置（`[chat.history omitted: message too large]`）取代過大的訊息。
    - 當可見的助理訊息在 `chat.history` 中被截斷時，側邊閱讀器可以透過 `chat.message.get` 按需擷取完整且經過顯示正規化的文字記錄條目，方式是 `sessionKey`，視需要啟用 `agentId`，以及文字記錄 `messageId`。如果 Gateway 仍無法傳回更多內容，閱讀器會顯示明確的「不可用」狀態，而不是無聲地重複截斷的預覽。
    - 助理/生成的圖片會保存為受控媒體參考，並透過已驗證的 Gateway 媒體 URL 提供服務，因此重新整理頁面不需依賴原始 base64 圖片資料保留在聊天歷史紀錄回應中。
    - 當呈現 `chat.history` 時，Control UI 會從可見的助理文字中移除僅供顯示用的內聯指令標籤（例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、純文字工具呼叫 XML 資料（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和被截斷的工具呼叫區塊），以及外洩的 ASCII/全形模型控制權杖，並且會省略那些整體可見文字僅為靜音權杖 `NO_REPLY` / `no_reply` 或心跳確認權杖 `HEARTBEAT_OK` 的助理條目。
    - 在主動傳送及最終歷史紀錄重新整理期間，如果 `chat.history` 暫時傳回較舊的快照，聊天檢視畫面會讓本機的樂觀使用者/助理訊息保持可見；一旦 Gateway 歷史紀錄趕上進度，標準的文字記錄將會取代這些本機訊息。
    - 即時 `chat` 事件代表傳遞狀態，而 `chat.history` 則是從持久的工作階段文字記錄重建。工具最終事件發生後，Control UI 會重新載入歷史紀錄，並僅合併一小段樂觀尾部；文字記錄邊界已記載於 [WebChat](/zh-Hant/web/webchat) 中。
    - `chat.inject` 會將助理備註附加至工作階段文字記錄，並廣播 `chat` 事件以進行僅限 UI 的更新（不執行代理程式，不進行通道傳遞）。
    - 聊天標頭在工作階段選擇器之前顯示代理程式篩選器，而工作階段選擇器的範圍則由選取的代理程式決定。切換代理程式時，僅會顯示與該代理程式相關的工作階段；若該代理程式尚未儲存任何儀表板工作階段，則會回退至該代理程式的主要工作階段。
    - 在桌面寬度下，聊天控制項會保持在一個緊湊的列中，並在向下捲動文字記錄時折疊；向上捲動、回到頂部或到達底部時會還原控制項。
    - 連續重複的純文字訊息會以一個帶有計數徽章的氣泡呈現。攜帶圖片、附件、工具輸出或畫布預覽的訊息則保持不折疊。
    - 聊天標頭的模型和思考選擇器會立即透過 `sessions.patch` 修改使用中的工作階段；這些是持久的工作階段覆寫，而非僅限單次傳送的選項。
    - 如果您在傳送訊息時，同一工作階段的模型選擇器變更尚在儲存中，撰寫器會先等待該工作階段修改完成再呼叫 `chat.send`，以確保傳送時使用選取的模型。
    - 在 Control UI 中輸入 `/new` 會建立並切換至與「新聊天」相同的全新儀表板工作階段，除非已設定 `session.dmScope: "main"` 且目前的父項是代理程式的主要工作階段；在這種情況下，它會就地重設主要工作階段。輸入 `/reset` 則會保留 Gateway 對目前工作階段的明確就地重設。
    - 聊天模型選擇器會請求 Gateway 設定的模型檢視。如果存在 `agents.defaults.models`，該允許清單會驅動選擇器，包括讓供應商範圍目錄保持動態的 `provider/*` 項目。否則，選擇器會顯示明確的 `models.providers.*.models` 項目以及具有可用驗證的供應商。完整目錄仍可透過偵錯 `models.list` RPC 搭配 `view: "all"` 取得。
    - 當最新的 Gateway 工作階段使用報告包含目前的內容權杖時，聊天撰寫區域會顯示一個緊湊的內容使用量指示器。當內容壓力過高時，它會切換為警告樣式；在建議的壓縮等級時，會顯示一個執行標準工作階段壓縮路徑的緊湊按鈕。過時的權杖快照會隱藏，直到 Gateway 再次回報最新的使用量為止。

  </Accordion>
  <Accordion title="Talk mode (browser realtime)">
    Talk mode uses a registered realtime voice provider. Configure OpenAI with `talk.realtime.provider: "openai"` plus either `talk.realtime.providers.openai.apiKey`, `OPENAI_API_KEY`, or an `openai` OAuth profile; configure Google with `talk.realtime.provider: "google"` plus `talk.realtime.providers.google.apiKey`. For hosted GPT realtime models, OpenClaw prefers the `openai` OAuth profile before `OPENAI_API_KEY`; an explicit OpenAI realtime `apiKey` remains the advanced override. The browser never receives a standard provider API key. OpenAI receives an ephemeral Realtime client secret for WebRTC. Google Live receives a one-use constrained Live API auth token for a browser WebSocket session, with instructions and tool declarations locked into the token by the Gateway. Providers that only expose a backend realtime bridge run through the Gateway relay transport, so credentials and vendor sockets stay server-side while browser audio moves through authenticated Gateway RPCs. The Realtime session prompt is assembled by the Gateway; `talk.client.create` does not accept caller-provided instruction overrides.

    The Chat composer includes a Talk options button next to the Talk start/stop button. The options apply to the next Talk session and can override provider, transport, model, voice, reasoning effort, VAD threshold, silence duration, and prefix padding. When an option is blank, the Gateway uses configured defaults where available or the provider default. Selecting Gateway relay forces the backend relay path; selecting WebRTC keeps the session client-owned and fails instead of silently falling back to relay if the provider cannot create a browser session.

    In the Chat composer, the Talk control is the waves button next to the microphone dictation button. When Talk starts, the composer status row shows `Connecting Talk...`, then `Talk live` while audio is connected, or `Asking OpenClaw...` while a realtime tool call is consulting the configured larger model through `talk.client.toolCall`.

    Maintainer live smoke: `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` verifies the OpenAI backend WebSocket bridge, OpenAI browser WebRTC SDP exchange, Google Live constrained-token browser WebSocket setup, and the Gateway relay browser adapter with fake microphone media. The command prints provider status only and does not log secrets.

  </Accordion>
  <Accordion title="停止與中止">
    - 點擊 **Stop**（呼叫 `chat.abort`）。
    - 當執行處於活動狀態時，一般的後續追問會進入佇列。點擊已排訊息上的 **Steer**，可將該後續追問注入到目前執行中。
    - 輸入 `/stop`（或獨立中止詞組如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`）以進行頻外中止。
    - `chat.abort` 支援 `{ sessionKey }`（無 `runId`）以中止該工作階段的所有活動執行。

  </Accordion>
  <Accordion title="中止部分的保留">
    - 當執行中止時，部分助理文字仍可能顯示在 UI 中。
    - 當有緩衝輸出時，Gateway 會將中止的部分助理文字保存到轉錄歷史中。
    - 已保存的項目包含中止元數據，因此轉錄內容的使用者可以區分中止部分與正常完成輸出。

  </Accordion>
</AccordionGroup>

## PWA 安裝與網頁推播

Control UI 附帶 `manifest.webmanifest` 和 service worker，因此現代瀏覽器可以將其安裝為獨立的 PWA。Web Push 讓 Gateway 即使在分頁或瀏覽器視窗未開啟時，也能透過通知喚醒已安裝的 PWA。

如果在 OpenClaw 更新後頁面立即顯示 **Protocol mismatch**，請先使用 `openclaw dashboard` 重新開啟儀表板並硬重新整理頁面。如果仍然失敗，請清除儀表板來源的網站資料或在私人瀏覽視窗中測試；舊的分頁或瀏覽器 service worker 快取可能會繼續執行更新前的 Control UI 套件，與較新的 Gateway 不相容。

| Surface                                          | 功能說明                                                    |
| ------------------------------------------------ | ----------------------------------------------------------- |
| `ui/public/manifest.webmanifest`                 | PWA manifest。一旦可存取，瀏覽器會提供「Install app」選項。 |
| `ui/public/sw.js`                                | 處理 `push` 事件和通知點擊的 service worker。               |
| `push/vapid-keys.json`（在 OpenClaw 狀態目錄下） | 用於簽署 Web Push 載荷的自動產生 VAPID 金鑰對。             |
| `push/web-push-subscriptions.json`               | 已保存的瀏覽器訂閱端點。                                    |

當您想要固定金鑰（用於多主機部署、金鑰輪換或測試）時，透過 Gateway 程序上的環境變數覆寫 VAPID 金鑰對：

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT` (預設為 `https://openclaw.ai`)

Control UI 使用這些受範圍限制的 Gateway 方法來註冊和測試瀏覽器訂閱：

- `push.web.vapidPublicKey` — 取得使用中的 VAPID 公鑰。
- `push.web.subscribe` — 註冊一個 `endpoint` 以及 `keys.p256dh`/`keys.auth`。
- `push.web.unsubscribe` — 移除已註冊的端點。
- `push.web.test` — 傳送測試通知給呼叫者的訂閱。

<Note>Web Push 獨立於 iOS APNS 中繼路徑（請參閱[設定](/zh-Hant/gateway/configuration)了解中繼支援的推播）以及現有的 `push.test` 方法，後者鎖定原生行動裝置配對。</Note>

## 託管嵌入

Assistant 訊息可以使用 `[embed ...]` 簡碼在行內呈現託管的網頁內容。iframe 沙盒原則由 `gateway.controlUi.embedSandbox` 控制：

<Tabs>
  <Tab title="strict">停用託管嵌入內的腳本執行。</Tab>
  <Tab title="scripts (default)">允許互動式嵌入，同時保持來源隔離；這是預設值，通常足以滿足獨立的瀏覽器遊戲/小工具。</Tab>
  <Tab title="trusted">在 `allow-scripts` 之上新增 `allow-same-origin`，供刻意需要更強權限的同站文件使用。</Tab>
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

<Warning>僅當嵌入文件確實需要同來源行為時才使用 `trusted`。對於大多數 Agent 產生的遊戲和互動式畫布，`scripts` 是較安全的選擇。</Warning>

絕對外部 `http(s)` 嵌入 URL 預設保持封鎖狀態。如果您有意讓 `[embed url="https://..."]` 載入第三方頁面，請設定 `gateway.controlUi.allowExternalEmbedUrls: true`。

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

該值在到達瀏覽器之前會經過驗證。支援的值包括純長度和百分比，例如 `960px` 或 `82%`，以及受限的 `min(...)`、`max(...)`、`clamp(...)`、`calc(...)` 和 `fit-content(...)` 寬度表達式。

## Tailnet 存取（推薦）

<Tabs>
  <Tab title="整合 Tailscale Serve（推薦）">
    將 Gateway 保持在 loopback 並讓 Tailscale Serve 使用 HTTPS 代理它：

    ```bash
    openclaw gateway --tailscale serve
    ```

    開啟：

    - `https://<magicdns>/` （或您設定的 `gateway.controlUi.basePath`）

    根據預設，當 `gateway.auth.allowTailscale` 為 `true` 時，Control UI/WebSocket Serve 請求可以透過 Tailscale 身分標頭 (`tailscale-user-login`) 進行驗證。OpenClaw 透過使用 `tailscale whois` 解析 `x-forwarded-for` 位址並將其與標頭比對來驗證身分，且僅當請求透過 Tailscale 的 `x-forwarded-*` 標頭到達 loopback 時才接受這些請求。對於具有瀏覽器裝置身分的 Control UI 操作員工作階段，此經過驗證的 Serve 路徑也會跳過裝置配對往返；無裝置瀏覽器和節點角色連線仍會遵循正常的裝置檢查。如果您想即使對於 Serve 流量也要求明確的共享金鑰認證，請設定 `gateway.auth.allowTailscale: false`。然後使用 `gateway.auth.mode: "token"` 或 `"password"`。

    對於該非同步 Serve 身分路徑，相同用戶端 IP 和認證範圍的失敗驗證嘗試會在速率限制寫入之前序列化。因此，來自同一瀏覽器的並發錯誤重試可能會在第二次請求時顯示 `retry later`，而不是兩個並行競爭的純不匹配錯誤。

    <Warning>
    無 Token 的 Serve 驗證假設 gateway 主機是受信任的。如果該主機上可能執行不受信任的本機程式碼，請要求 token/密碼驗證。
    </Warning>

  </Tab>
  <Tab title="綁定至 tailnet + token">
    ```bash
    openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
    ```

    然後開啟：

    - `http://<tailscale-ip>:18789/` （或您設定的 `gateway.controlUi.basePath`）

    將相符的共享金鑰貼上到 UI 設定中（作為 `connect.params.auth.token` 或 `connect.params.auth.password` 發送）。

  </Tab>
</Tabs>

## 不安全的 HTTP

如果您透過純 HTTP (`http://<lan-ip>` 或 `http://<tailscale-ip>`) 開啟儀表板，瀏覽器會在**非安全上下文**中執行並封鎖 WebCrypto。根據預設，OpenClaw 會**封鎖**沒有裝置身分識別的 Control UI 連線。

記載的例外情況：

- 僅限 localhost 的不安全 HTTP 與 `gateway.controlUi.allowInsecureAuth=true` 的相容性
- 透過 `gateway.auth.mode: "trusted-proxy"` 成功進行操作員 Control UI 身分驗證
- 緊急破窗 `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**建議的修正方式：**使用 HTTPS (Tailscale Serve) 或在本機開啟 UI：

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

    - 它允許 localhost Control UI 工作階段在非安全的 HTTP 上下文中，於沒有裝置身分識別的情況下繼續。
    - 它不會略過配對檢查。
    - 它不會放寬遠端 (非 localhost) 的裝置身分識別要求。

  </Accordion>
  <Accordion title="僅限緊急破窗">
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
    `dangerouslyDisableDeviceAuth` 會停用 Control UI 裝置身分識別檢查，並會造成嚴重的安全性降級。緊急使用後請迅速還原。
    </Warning>

  </Accordion>
  <Accordion title="受信任代理伺服器備註">
    - 成功的受信任代理伺服器驗證可以在沒有裝置身分識別的情況下允許**操作員** Control UI 工作階段。
    - 這**不會**擴及節點角色 Control UI 工作階段。
    - 同主機回環反向代理伺服器仍然不滿足受信任代理伺服器驗證；請參閱 [Trusted proxy auth](/zh-Hant/gateway/trusted-proxy-auth)。

  </Accordion>
</AccordionGroup>

請參閱 [Tailscale](/zh-Hant/gateway/tailscale) 以取得 HTTPS 設定指引。

## 內容安全原則

Control UI 隨附嚴格的 `img-src` 政策：僅允許 **同源** (same-origin) 資源、`data:` URL 和本機產生的 `blob:` URL。遠端 `http(s)` 和相對協議圖片 URL 會被瀏覽器拒絕，且不會發出網路擷取請求。

這在實務上代表：

- 在相對路徑下提供的化身和圖片（例如 `/avatars/<id>`）仍會正常顯示，包括 UI 擷取並轉換為本機 `blob:` URL 的已驗證化身路由。
- 內聯 `data:image/...` URL 仍會正常顯示（適用於協議內的載荷）。
- 由 Control UI 建立的本機 `blob:` URL 仍會正常顯示。
- 由通道中繼資料發出的遠端化身 URL 會在 Control UI 的化身輔助器中被移除，並替換為內建的標誌/徽章，因此遭入侵或惡意的通道無法強制操作員瀏覽器擷取任意的遠端圖片。

您不需要進行任何變更即可獲得此行為 — 它始終開啟且無法設定。

## 化身路由驗證

當設定 Gateway 驗證時，Control UI 的化身端點與其餘 API 一樣需要相同的 Gateway 權杖：

- `GET /avatar/<agentId>` 僅向已驗證的呼叫者傳回化身圖片。`GET /avatar/<agentId>?meta=1` 在相同的規則下傳回化身中繼資料。
- 對任一路由的未驗證請求會被拒絕（與同層級的 assistant-media 路由相符）。這可防止化身路由在其他受保護的主機上洩漏代理程式身分。
- Control UI 本身在擷取化身時會將 Gateway 權杖作為持有人 (bearer) 標頭轉發，並使用已驗證的 blob URL，以便圖片仍能在儀表板中顯示。

如果您停用 Gateway 驗證（不建議在共用主機上使用），化身路由也會變成未驗證，與 Gateway 其餘部分一致。

## 助理媒體路由驗證

當設定 Gateway 驗證時，助理的本機媒體預覽會使用兩步驟路由：

- `GET /__openclaw__/assistant-media?meta=1&source=<path>` 需要標準的 Control UI 操作員驗證。瀏覽器在檢查可用性時會將 Gateway 權杖作為持有人 (bearer) 標頭傳送。
- 成功的元資料回應包含一個針對該確切來源路徑的短期 `mediaTicket`。
- 瀏覽器渲染的圖片、音訊、影片和文件 URL 使用 `mediaTicket=<ticket>` 而非使用中的閘道權杖或密碼。此票證很快就會過期，且無法用來授權其他來源。

這讓一般的媒體渲染能與瀏覽器原生媒體元素相容，而無須將可重複使用的閘道憑證放入可見的媒體 URL 中。

## 建置 UI

閘道從 `dist/control-ui` 提供靜態檔案。使用以下指令進行建置：

```bash
pnpm ui:build
```

選用的絕對基礎路徑（當您需要固定的資產 URL 時）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用於本地開發（獨立的開發伺服器）：

```bash
pnpm ui:dev
```

然後將 UI 指向您的閘道 WS URL（例如 `ws://127.0.0.1:18789`）。

## 空白的 Control UI 頁面

如果瀏覽器載入了空白的儀表板，且 DevTools 未顯示有用的錯誤訊息，可能是擴充功能或早期內容腳本阻止了 JavaScript 模組應用程式的評估。靜態頁面包含一個純 HTML 復原面板，當啟動後未註冊 `<openclaw-app>` 時會顯示該面板。

在變更瀏覽器環境後，請使用面板的 **再試一次** 動作，或在執行這些檢查後手動重新載入：

- 停用會注入所有頁面的擴充功能，尤其是具有 `<all_urls>` 內容腳本的擴充功能。
- 請嘗試使用無痕視窗、乾淨的瀏覽器設定檔，或另一個瀏覽器。
- 保持閘道運作，並在變更瀏覽器後驗證相同的儀表板 URL。

## 除錯/測試：開發伺服器 + 遠端閘道

Control UI 是靜態檔案；WebSocket 目標是可設定的，且可以與 HTTP 來源不同。當您希望在本地使用 Vite 開發伺服器但閘道在其他地方執行時，這非常方便。

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
  <Accordion title="註解">
    - `gatewayUrl` 在載入後會儲存在 localStorage 中，並從 URL 中移除。
    - 如果您透過 `gatewayUrl` 傳遞完整的 `ws://` 或 `wss://` 端點，請對 `gatewayUrl` 值進行 URL 編碼，以便瀏覽器正確解析查詢字串。
    - 應盡可能透過 URL 片段（`#token=...`）傳遞 `token`。片段不會傳送到伺服器，這可避免請求日誌和 Referer 洩漏。舊版的 `?token=` 查詢參數為了相容性仍會匯入一次，但僅作為後備手段，並會在啟動後立即移除。
    - `password` 僅儲存在記憶體中。
    - 當設定 `gatewayUrl` 時，UI 不會後退至組態或環境認證。請明確提供 `token`（或 `password`）。缺少明確的認證是一種錯誤。
    - 當 Gateway 位於 TLS（Tailscale Serve、HTTPS 代理等）後方時，請使用 `wss://`。
    - 為了防止點擊劫持，`gatewayUrl` 僅在頂層視窗（非嵌入式）中被接受。
    - 公開非 loopback 的 Control UI 部署必須明確設定 `gateway.controlUi.allowedOrigins`（完整來源）。來自 loopback、RFC1918/link-local、`.local`、`.ts.net` 或 Tailscale CGNAT 主機的私密同來源 LAN/Tailnet 載入，可在未啟用 Host-header 後備的情況下被接受。
    - Gateway 啟動時可能會根據有效的執行時期綁定和連接埠，植入本地來源，例如 `http://localhost:<port>` 和 `http://127.0.0.1:<port>`，但遠端瀏覽器來源仍需要明確的項目。
    - 請勿使用 `gateway.controlUi.allowedOrigins: ["*"]`，除非用於嚴密控制的本地測試。這表示允許任何瀏覽器來源，而不是「符合我正在使用的任何主機」。
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用 Host-header 來源後備模式，但這是一種危險的安全性模式。

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

遠端存取設定詳細資訊：[遠端存取](/zh-Hant/gateway/remote)。

## 相關

- [Dashboard](/zh-Hant/web/dashboard) — 閘道儀表板
- [Health Checks](/zh-Hant/gateway/health) — 閘道健康監控
- [TUI](/zh-Hant/web/tui) — 終端機使用者介面
- [WebChat](/zh-Hant/web/webchat) — 基於瀏覽器的聊天介面
