---
summary: "Google Meet 外掛程式：透過 Chrome 或 Twilio 加入指定的 Meet URL，預設使用即時語音"
read_when:
  - You want an OpenClaw agent to join a Google Meet call
  - You want an OpenClaw agent to create a new Google Meet call
  - You are configuring Chrome, Chrome node, or Twilio as a Google Meet transport
title: "Google Meet 外掛程式"
---

OpenClaw 的 Google Meet 參與者支援 — 該外掛程式設計上為顯式操作：

- 它只會加入明確指定的 `https://meet.google.com/...` URL。
- 它可以透過 Google Meet API 建立新的 Meet 空間，然後加入
  傳回的 URL。
- `realtime` 語音是預設模式。
- 當需要更深層的推理或工具時，即時語音可以回呼至完整的 OpenClaw Agent。
- Agent 可以透過 `mode` 選擇加入行為：使用 `realtime` 進行
  即時聆聽/對話，或使用 `transcribe` 在沒有
  即時語音橋接器的情況下加入/控制瀏覽器。
- 身份驗證始於個人 Google OAuth 或已登入的 Chrome 設定檔。
- 沒有自動同意公告。
- 預設的 Chrome 音訊後端是 `BlackHole 2ch`。
- Chrome 可以在本機或配對的節點主機上執行。
- Twilio 接受撥入號碼以及可選的 PIN 或 DTMF 序列。
- CLI 指令是 `googlemeet`；`meet` 則保留用於更廣泛的 Agent
  電信會議工作流程。

## 快速入門

安裝本機音訊相依元件並設定後端即時語音
提供者。OpenAI 是預設值；Google Gemini Live 也可與
`realtime.provider: "google"` 搭配運作：

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# or
export GEMINI_API_KEY=...
```

`blackhole-2ch` 會安裝 `BlackHole 2ch` 虛擬音訊裝置。Homebrew 的
安裝程式需要重新開機，macOS 才會顯示該裝置：

```bash
sudo reboot
```

重新開機後，驗證這兩個部分：

```bash
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

啟用外掛程式：

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {},
      },
    },
  },
}
```

檢查設定：

```bash
openclaw googlemeet setup
```

設定輸出旨在供代理程式讀取。它會報告 Chrome 設定檔、音訊橋接器、節點固定、延遲即時簡介，以及當配置了 Twilio 委派時，`voice-call` 外掛程式和 Twilio 憑證是否已就緒。在要求代理程式加入之前，請將任何 `ok: false` 檢查視為阻礙。請使用 `openclaw googlemeet setup --json` 來進行腳本或機器可讀輸出。請使用 `--transport chrome`、`--transport chrome-node` 或 `--transport twilio`，在代理程式嘗試之前對特定傳輸進行預檢。

加入會議：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij
```

或者讓代理程式透過 `google_meet` 工具加入：

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "realtime"
}
```

建立新會議並加入：

```bash
openclaw googlemeet create --transport chrome-node --mode realtime
```

僅建立 URL 而不加入：

```bash
openclaw googlemeet create --no-join
```

`googlemeet create` 有兩種途徑：

- API 建立：當配置了 Google Meet OAuth 憑證時使用。這是最確定的途徑，且不依賴瀏覽器 UI 狀態。
- 瀏覽器後備方案：當缺少 OAuth 憑證時使用。OpenClaw 使用固定的 Chrome 節點，開啟 `https://meet.google.com/new`，等待 Google 重新導向至真實的會議代碼 URL，然後返回該 URL。此途徑要求節點上的 OpenClaw Chrome 設定檔必須已登入 Google。瀏覽器自動化會處理 Meet 自己的首次執行麥克風提示；該提示不被視為 Google 登入失敗。加入和建立流程也會在開啟新分頁之前嘗試重複使用現有的 Meet 分頁。比對會忽略無害的 URL 查詢字串，例如 `authuser`，因此代理程式重試應會聚焦於已開啟的會議，而不是建立第二個 Chrome 分頁。

指令/工具輸出包含一個 `source` 欄位 (`api` 或 `browser`)，以便代理程式說明使用了哪種途徑。`create` 預設會加入新會議並返回 `joined: true` 以及加入階段。若僅要產生 URL，請在 CLI 上使用 `create --no-join` 或將 `"join": false` 傳遞給工具。

或者告訴代理：「建立一個 Google Meet，使用即時語音加入，並將連結發送給我。」代理應該呼叫 `google_meet` 並帶有 `action: "create"`，然後分享傳回的 `meetingUri`。

```json
{
  "action": "create",
  "transport": "chrome-node",
  "mode": "realtime"
}
```

對於僅觀察/瀏覽器控制的加入，請設定 `"mode": "transcribe"`。這不會啟動雙工即時模型橋接器，因此它不會在會議中說話。

在即時工作階段期間，`google_meet` 狀態包含瀏覽器和音訊橋接器的健康狀況，例如 `inCall`、`manualActionRequired`、`providerConnected`、`realtimeReady`、`audioInputActive`、`audioOutputActive`、最後輸入/輸出時間戳記、位元組計數器以及橋接器關閉狀態。如果出現安全的 Meet 頁面提示，瀏覽器自動化會在可能時處理它。登入、主機准許以及瀏覽器/作業系統權限提示會被回報為需要手動操作，並附上原因和訊息供代理轉達。

本機 Chrome 透過已登入的 OpenClaw 瀏覽器設定檔加入。在 Meet 中，為 OpenClaw 使用的麥克風/揚聲器路徑選擇 `BlackHole 2ch`。為了乾淨的雙工音訊，請使用個別的虛擬裝置或 Loopback 風格的圖表；單一 BlackHole 裝置足以進行初步的冒煙測試，但可能會產生回音。

### 本機閘道 + Parallels Chrome

您**並不**需要僅為了讓 VM 擁有 Chrome，就在 macOS VM 中安裝完整的 OpenClaw Gateway 或模型 API 金鑰。在本機執行 Gateway 和代理，然後在 VM 中執行節點主機。在 VM 中啟用內建的外掛程式一次，以便節點通告 Chrome 指令：

什麼在哪裡執行：

- Gateway 主機：OpenClaw Gateway、代理工作區、模型/API 金鑰、即時提供者以及 Google Meet 外掛程式設定。
- Parallels macOS VM：OpenClaw CLI/節點主機、Google Chrome、SoX、BlackHole 2ch，以及已登入 Google 的 Chrome 設定檔。
- VM 中不需要：Gateway 服務、代理設定、OpenAI/GPT 金鑰或模型提供者設定。

安裝 VM 相關依賴項：

```bash
brew install blackhole-2ch sox
```

安裝 BlackHole 後重新啟動 VM，以便 macOS 公開 `BlackHole 2ch`：

```bash
sudo reboot
```

重新啟動後，驗證 VM 可以看到音訊裝置和 SoX 指令：

```bash
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

在 VM 中安裝或更新 OpenClaw，然後在那裡啟用內建的外掛程式：

```bash
openclaw plugins enable google-meet
```

在 VM 中啟動節點主機：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name parallels-macos
```

如果 `<gateway-host>` 是區域網路 IP 且您未使用 TLS，除非您為該受信任的私人網路選擇加入，否則節點會拒絕純文字 WebSocket：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

在將節點安裝為 LaunchAgent 時，使用相同的環境變數：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install --host <gateway-lan-ip> --port 18789 --display-name parallels-macos --force
openclaw node restart
```

`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 是進程環境，而不是 `openclaw.json` 設定。當安裝指令中存在 `openclaw node install` 時，它會將其儲存在 LaunchAgent 環境中。

從 Gateway 主機核准該節點：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

確認 Gateway 能看到該節點，並且該節點同時廣告 `googlemeet.chrome` 和瀏覽器功能/`browser.proxy`：

```bash
openclaw nodes status
```

在 Gateway 主機上透過該節點路由 Meet：

```json5
{
  gateway: {
    nodes: {
      allowCommands: ["googlemeet.chrome", "browser.proxy"],
    },
  },
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          defaultTransport: "chrome-node",
          chrome: {
            guestName: "OpenClaw Agent",
            autoJoin: true,
            reuseExistingTab: true,
          },
          chromeNode: {
            node: "parallels-macos",
          },
        },
      },
    },
  },
}
```

現在從 Gateway 主機正常加入：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij
```

或要求 agent 使用 `google_meet` 工具搭配 `transport: "chrome-node"`。

如需執行單一指令的煙霧測試，該測試會建立或重複使用會話、說出已知短語並列印會話健康狀態：

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij
```

在加入期間，OpenClaw 瀏覽器自動化會填寫訪客名稱、點擊「加入/請求加入」，並在出現提示時接受 Meet 首次執行的「使用麥克風」選擇。在僅瀏覽器的會議建立期間，如果 Meet 未顯示使用麥克風按鈕，它也可以在不使用麥克風的情況下繼續通過相同的提示。如果瀏覽器設定檔未登入、Meet 正在等待主持人准許、Chrome 需要麥克風/相機權限，或 Meet 卡在自動化無法解決的提示上，加入/測試語音結果會回報 `manualActionRequired: true` 並附帶 `manualActionReason` 和 `manualActionMessage`。Agent 應停止重試加入，回報該確切訊息加上目前的 `browserUrl`/`browserTitle`，並且僅在手動瀏覽器操作完成後重試。

如果省略 `chromeNode.node`，OpenClaw 僅在只有一個連線的節點同時廣告 `googlemeet.chrome` 和瀏覽器控制時才會自動選取。如果連線了多個有能力的節點，請將 `chromeNode.node` 設定為節點 ID、顯示名稱或遠端 IP。

常見失敗檢查：

- `Configured Google Meet node ... is not usable: offline`：釘選的節點為 Gateway 所知但無法使用。Agent 應將該節點視為診斷狀態，而非可用的 Chrome 主機，並回報設定阻斷因素，而不是回退到另一個傳輸，除非使用者有此要求。
- `No connected Google Meet-capable node`：在 VM 中啟動 `openclaw node run`，批准配對，並確保 `openclaw plugins enable google-meet` 和 `openclaw plugins enable browser` 已在 VM 中執行。同時確認 Gateway 主機透過 `gateway.nodes.allowCommands: ["googlemeet.chrome", "browser.proxy"]` 允許這兩個節點指令。
- `BlackHole 2ch audio device not found`：在受檢查的主機上安裝 `blackhole-2ch`，並在使用本機 Chrome 音效前重新啟動。
- `BlackHole 2ch audio device not found on the node`：在 VM 中安裝 `blackhole-2ch` 並重新啟動 VM。
- Chrome 開啟但無法加入：登入 VM 內的瀏覽器設定檔，或保持 `chrome.guestName` 設定以供來賓加入。來賓自動加入透過節點瀏覽器代理使用 OpenClaw 瀏覽器自動化；請確保節點瀏覽器設定指向您想要的設定檔，例如 `browser.defaultProfile: "user"` 或具名的現有工作階段設定檔。
- 重複的 Meet 分頁：保持 `chrome.reuseExistingTab: true` 啟用。OpenClaw 在開啟新分頁之前會針對相同的 Meet URL 啟用現有分頁，且瀏覽器會議建立會重複使用進行中的 `https://meet.google.com/new` 或 Google 帳號提示分頁，然後再開啟另一個分頁。
- 沒有聲音：在 Meet 中，將麥克風/揚聲器路由傳遞至 OpenClaw 使用的虛擬音效裝置路徑；使用分開的虛擬裝置或 Loopback 樣式的路由以獲得乾淨的全雙工音效。

## 安裝說明

Chrome 即時預設值使用兩個外部工具：

- `sox`：指令列音效公用程式。此外掛程式針對預設的 24 kHz PCM16 音訊橋接器使用明確的 CoreAudio 裝置指令。
- `blackhole-2ch`：macOS 虛擬音效驅動程式。它會建立 Chrome/Meet 可以路由傳遞經過的 `BlackHole 2ch` 音效裝置。

OpenClaw 不打包也不重新分發這兩個套件。文件要求使用者透過 Homebrew 將它們安裝為主機相依項。SoX 授權為 `LGPL-2.0-only AND GPL-2.0-only`；BlackHole 則為 GPL-3.0。如果您建構的安裝程式或設備將 BlackHole 與 OpenClaw 打包在一起，請檢閱 BlackHole 的上游授權條款或向 Existential Audio 取得單獨的授權。

## 傳輸

### Chrome

Chrome 傳輸透過 OpenClaw 瀏覽器控制開啟 Meet URL，並以已登入的 OpenClaw 瀏覽器設定檔加入。在 macOS 上，此外掛程式會在啟動前檢查 `BlackHole 2ch`。如果有設定，它也會在開啟 Chrome 之前執行音訊橋接器健康檢查指令和啟動指令。當 Chrome/音訊位於 Gateway 主機上時，請使用 `chrome`；當 Chrome/音訊位於配對節點（如 Parallels macOS VM）上時，請使用 `chrome-node`。對於本機 Chrome，請選擇具有 `browser.defaultProfile` 的設定檔；`chrome.browserProfile` 會傳遞給 `chrome-node` 主機。

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome-node
```

透過本機 OpenClaw 音訊橋接器路由 Chrome 麥克風和喇叭音訊。如果未安裝 `BlackHole 2ch`，加入將會因設定錯誤而失敗，而不是在沒有音訊路徑的情況下無聲加入。

### Twilio

Twilio 傳輸是一個委派給 Voice Call 外掛程式的嚴格撥號計畫。它不會從 Meet 頁面解析電話號碼。

當無法使用 Chrome 參與，或者您需要電話撥入備援時，請使用此選項。Google Meet 必須為會議公開電話撥入號碼和 PIN；OpenClaw 不會從 Meet 頁面探索這些資訊。

在 Gateway 主機上啟用 Voice Call 外掛程式，而不是在 Chrome 節點上：

```json5
{
  plugins: {
    allow: ["google-meet", "voice-call"],
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          defaultTransport: "chrome-node",
          // or set "twilio" if Twilio should be the default
        },
      },
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
        },
      },
    },
  },
}
```

透過環境變數或設定檔提供 Twilio 憑證。使用環境變數可將機密資訊保留在 `openclaw.json` 之外：

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
```

啟用 `voice-call` 後重新啟動或重新載入 Gateway；外掛程式設定變更不會出現在正在執行的 Gateway 程序中，直到它重新載入。

然後驗證：

```bash
openclaw config validate
openclaw plugins list | grep -E 'google-meet|voice-call'
openclaw googlemeet setup
```

當 Twilio 委派連線完成後，`googlemeet setup` 將包含成功的 `twilio-voice-call-plugin` 和 `twilio-voice-call-credentials` 檢查。

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

當會議需要自訂序列時，請使用 `--dtmf-sequence`：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

## OAuth 和預檢

建立 Meet 連結時 OAuth 為選用項，因為 `googlemeet create` 可以回退至瀏覽器自動化。當您需要官方 API 建立、空間解析或 Meet Media API 預檢檢查時，請設定 OAuth。

Google Meet API 存取使用使用者 OAuth：建立 Google Cloud OAuth 用戶端、請求所需範圍、授權 Google 帳戶，然後將產生的更新令牌儲存在 Google Meet 外掛程式設定中或提供 `OPENCLAW_GOOGLE_MEET_*` 環境變數。

OAuth 不會取代 Chrome 加入路徑。當您使用瀏覽器參與時，Chrome 和 Chrome-node 傳輸仍會透過已登入的 Chrome 設定檔、BlackHole/SoX 和已連接的節點加入。OAuth 僅用於官方 Google Meet API 路徑：建立會議空間、解析空間以及執行 Meet Media API 預檢檢查。

### 建立 Google 憑證

在 Google Cloud Console 中：

1. 建立或選取 Google Cloud 專案。
2. 為該專案啟用 **Google Meet REST API**。
3. 設定 OAuth 同意畫面。
   - 對於 Google Workspace 組織，**Internal**（內部）最簡單。
   - **External**（外部）適用於個人/測試設定；當應用程式處於「測試」狀態時，將每個會授權該應用程式的 Google 帳戶新增為測試使用者。
4. 新增 OpenClaw 請求的範圍：
   - `https://www.googleapis.com/auth/meetings.space.created`
   - `https://www.googleapis.com/auth/meetings.space.readonly`
   - `https://www.googleapis.com/auth/meetings.conference.media.readonly`
5. 建立 OAuth 用戶端 ID。
   - 應用程式類型：**Web 應用程式**。
   - 已授權的重新導向 URI：

     ```text
     http://localhost:8085/oauth2callback
     ```

6. 複製用戶端 ID 和用戶端密鑰。

Google Meet `spaces.create` 需要 `meetings.space.created`。
`meetings.space.readonly` 讓 OpenClaw 將 Meet URL/代碼解析為空間。
`meetings.conference.media.readonly` 用於 Meet Media API 預檢和媒體工作；Google 可能會要求註冊開發人員預覽版才能實際使用 Media API。
如果您只需要基於瀏覽器的 Chrome 加入，請完全跳過 OAuth。

### 取得更新令牌

設定 `oauth.clientId` 並選擇性地設定 `oauth.clientSecret`，或將其作為環境變數傳遞，然後執行：

```bash
openclaw googlemeet auth login --json
```

該指令會列印出包含更新令牌的 `oauth` 設定區塊。它使用 PKCE、在 `http://localhost:8085/oauth2callback` 上的 localhost 回呼，以及使用 `--manual` 的手動複製/貼上流程。

範例：

```bash
OPENCLAW_GOOGLE_MEET_CLIENT_ID="your-client-id" \
OPENCLAW_GOOGLE_MEET_CLIENT_SECRET="your-client-secret" \
openclaw googlemeet auth login --json
```

當瀏覽器無法連線到本地端回呼時，請使用手動模式：

```bash
OPENCLAW_GOOGLE_MEET_CLIENT_ID="your-client-id" \
OPENCLAW_GOOGLE_MEET_CLIENT_SECRET="your-client-secret" \
openclaw googlemeet auth login --json --manual
```

JSON 輸出包含：

```json
{
  "oauth": {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "refreshToken": "refresh-token",
    "accessToken": "access-token",
    "expiresAt": 1770000000000
  },
  "scope": "..."
}
```

將 `oauth` 物件儲存在 Google Meet 外掛程式設定下：

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          oauth: {
            clientId: "your-client-id",
            clientSecret: "your-client-secret",
            refreshToken: "refresh-token",
          },
        },
      },
    },
  },
}
```

當您不希望重新整理權杖出現在設定中時，建議使用環境變數。如果設定和環境變數值同時存在，外掛程式會優先解析設定，然後才是環境變數備援。

OAuth 同意內容包括 Meet 空間建立、Meet 空間讀取權限以及 Meet 會議媒體讀取權限。如果您在支援建立會議之前已進行驗證，請重新執行 `openclaw googlemeet auth login --json`，以便重新整理權杖具有 `meetings.space.created` 範圍。

### 使用 doctor 驗證 OAuth

當您想要進行快速且不洩漏機密的健康檢查時，請執行 OAuth doctor：

```bash
openclaw googlemeet doctor --oauth --json
```

這不會載入 Chrome 執行時或需要已連線的 Chrome 節點。它會檢查 OAuth 設定是否存在，以及重新整理權杖是否能產生存取權杖。JSON 報告僅包含狀態欄位，例如 `ok`、`configured`、`tokenSource`、`expiresAt` 和檢查訊息；它不會列印存取權杖、重新整理權杖或用戶端密鑰。

常見結果：

| 檢查                 | 意義                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| `oauth-config`       | `oauth.clientId` 加上 `oauth.refreshToken`，或快取的存取權杖已存在。 |
| `oauth-token`        | 快取的存取權杖仍然有效，或重新整理權杖已產生新的存取權杖。           |
| `meet-spaces-get`    | 選用的 `--meeting` 檢查已解析現有的 Meet 空間。                      |
| `meet-spaces-create` | 選用的 `--create-space` 檢查已建立新的 Meet 空間。                   |

若要同時證明 Google Meet API 已啟用以及具有 `spaces.create` 範圍，請執行具有副作用的建立檢查：

```bash
openclaw googlemeet doctor --oauth --create-space --json
openclaw googlemeet create --no-join --json
```

`--create-space` 會建立一個可拋棄的 Meet URL。當您需要確認 Google Cloud 專案已啟用 Meet API 且授權帳戶具有 `meetings.space.created` 範圍時，請使用它。

若要證明對現有會議空間的讀取權限：

```bash
openclaw googlemeet doctor --oauth --meeting https://meet.google.com/abc-defg-hij --json
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

`doctor --oauth --meeting` 和 `resolve-space` 證明對授權的 Google 帳戶可以存取的現有空間具有讀取權限。來自這些檢查的 `403` 通常表示 Google Meet REST API 已停用、同意的更新令牌缺少所需的範圍，或是 Google 帳戶無法存取該 Meet 空間。更新令牌錯誤表示重新執行 `openclaw googlemeet auth login
--` and store the new `oauth` 區塊。

瀏覽器後備機制不需要 OAuth 憑證。在該模式下，Google 驗證來自所選節點上已登入的 Chrome 設定檔，而非來自 OpenClaw 設定。

這些環境變數被接受作為後備選項：

- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` 或 `GOOGLE_MEET_CLIENT_ID`
- `OPENCLAW_GOOGLE_MEET_CLIENT_SECRET` 或 `GOOGLE_MEET_CLIENT_SECRET`
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` 或 `GOOGLE_MEET_REFRESH_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` 或 `GOOGLE_MEET_ACCESS_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` 或
  `GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT`
- `OPENCLAW_GOOGLE_MEET_DEFAULT_MEETING` 或 `GOOGLE_MEET_DEFAULT_MEETING`
- `OPENCLAW_GOOGLE_MEET_PREVIEW_ACK` 或 `GOOGLE_MEET_PREVIEW_ACK`

透過 `spaces.get` 解析 Meet URL、代碼或 `spaces/{id}`：

```bash
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

在媒體工作之前執行 preflight：

```bash
openclaw googlemeet preflight --meeting https://meet.google.com/abc-defg-hij
```

在 Meet 建立會議記錄之後，列出會議成品和出席情況：

```bash
openclaw googlemeet artifacts --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet attendance --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet export --meeting https://meet.google.com/abc-defg-hij --output ./meet-export
```

使用 `--meeting` 時，`artifacts` 和 `attendance` 預設會使用最新的會議記錄。當您想要該會議的所有保留記錄時，請傳遞 `--all-conference-records`。

行事曆查詢可以在讀取 Meet 成品之前，從 Google 日曆解析會議 URL：

```bash
openclaw googlemeet latest --today
openclaw googlemeet calendar-events --today --json
openclaw googlemeet artifacts --event "Weekly sync"
openclaw googlemeet attendance --today --format csv --output attendance.csv
```

`--today` 會搜尋今天的 `primary` 日曆中包含 Google Meet 連結的日曆活動。使用 `--event <query>` 來搜尋符合的活動文字，並使用 `--calendar <id>` 來指定非主要日曆。日曆查閱需要一次新的 OAuth 登入，其中必須包含日曆活動唯讀權限。`calendar-events` 會預覽符合的 Meet 活動，並標記出 `latest`、`artifacts`、`attendance` 或 `export` 將選擇的活動。

如果您已經知道會議記錄 ID，請直接指定它：

```bash
openclaw googlemeet latest --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 --json
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 --json
```

撰寫一份易讀的報告：

```bash
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 \
  --format markdown --output meet-artifacts.md
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 \
  --format markdown --output meet-attendance.md
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 \
  --format csv --output meet-attendance.csv
openclaw googlemeet export --conference-record conferenceRecords/abc123 \
  --include-doc-bodies --zip --output meet-export
openclaw googlemeet export --conference-record conferenceRecords/abc123 \
  --include-doc-bodies --dry-run
```

`artifacts` 會傳回會議記錄中繼資料，以及當 Google 對該會議公開時的參與者、錄製、逐字稿、結構化逐字稿條目和智慧筆記資源中繼資料。使用 `--no-transcript-entries` 以在大型會議中略過條目查閱。`attendance` 會將參與者展開為參與者會話資料列，其中包含首次/最後看到時間、總會話持續時間、遲到/早退標記，以及依登入使用者或顯示名稱合併的重複參與者資源。傳遞 `--no-merge-duplicates` 以將原始參與者資源分開，傳遞 `--late-after-minutes` 以調整遲到偵測，並傳遞 `--early-before-minutes` 以調整早退偵測。

`export` 會寫入一個包含 `summary.md`、`attendance.csv`、
`transcript.md`、`artifacts.json`、`attendance.json` 和 `manifest.json` 的資料夾。
`manifest.json` 記錄了所選的輸入、匯出選項、會議記錄、
輸出檔案、計數、Token 來源、使用時的 Calendar 事件，以及任何
部分擷取警告。傳遞 `--zip` 以在資料夾旁邊
同時寫入可移植的壓縮檔。傳遞 `--include-doc-bodies` 以透過 Google Drive `files.export` 匯出連結的文字記錄和
智慧筆記 Google Docs 文字；這需要包含
Drive Meet 唯讀範圍的全新 OAuth 登入。如果沒有
`--include-doc-bodies`，匯出僅包含 Meet 中繼資料和結構化文字記錄
條目。如果 Google 傳回部分構件失敗，例如智慧筆記
列表、文字記錄條目或 Drive 文件主體錯誤，摘要和
資訊清單會保留警告，而不是讓整個匯出失敗。
使用 `--dry-run` 來擷取相同的構件/出席資料並列印
資訊清單 JSON，而不建立資料夾或 ZIP。這在撰寫
大型匯出之前，或者當代理程式只需要計數、選定記錄和
警告時很有用。

代理程式也可以透過 `google_meet` 工具建立相同的套件：

```json
{
  "action": "export",
  "conferenceRecord": "conferenceRecords/abc123",
  "includeDocumentBodies": true,
  "outputDir": "meet-export",
  "zip": true
}
```

設定 `"dryRun": true` 以僅傳回匯出資訊清單並跳過檔案寫入。

針對真實的保留會議執行受防護的即時測試：

```bash
OPENCLAW_LIVE_TEST=1 \
OPENCLAW_GOOGLE_MEET_LIVE_MEETING=https://meet.google.com/abc-defg-hij \
pnpm test:live -- extensions/google-meet/google-meet.live.test.ts
```

即時測試環境：

- `OPENCLAW_LIVE_TEST=1` 啟用受防護的即時測試。
- `OPENCLAW_GOOGLE_MEET_LIVE_MEETING` 指向保留的 Meet URL、代碼或
  `spaces/{id}`。
- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` 或 `GOOGLE_MEET_CLIENT_ID` 提供 OAuth
  客戶端 ID。
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` 或 `GOOGLE_MEET_REFRESH_TOKEN` 提供
  更新 Token。
- 選用：`OPENCLAW_GOOGLE_MEET_CLIENT_SECRET`、
  `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` 和
  `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` 使用相同的備用名稱，
  但不含 `OPENCLAW_` 前綴。

基礎產品/出席即時冒煙測試需要
`https://www.googleapis.com/auth/meetings.space.readonly` 和
`https://www.googleapis.com/auth/meetings.conference.media.readonly`。行事曆
查詢需要 `https://www.googleapis.com/auth/calendar.events.readonly`。雲端硬碟
文件主體匯出需要
`https://www.googleapis.com/auth/drive.meet.readonly`。

建立一個全新的 Meet 空間：

```bash
openclaw googlemeet create
```

此指令會列印新的 `meeting uri`、來源和加入會話。使用 OAuth
憑證時，它會使用官方的 Google Meet API。若無 OAuth
憑證，它會使用釘選 Chrome 節點的已登入瀏覽器設定檔作為後備方案。Agent 可以
使用帶有 `action: "create"` 的 `google_meet` 工具，在單一步驟中建立並加入。若僅要建立 URL，請傳遞 `"join": false`。

來自瀏覽器後備機制的 JSON 輸出範例：

```json
{
  "source": "browser",
  "meetingUri": "https://meet.google.com/abc-defg-hij",
  "joined": true,
  "browser": {
    "nodeId": "ba0f4e4bc...",
    "targetId": "tab-1"
  },
  "join": {
    "session": {
      "id": "meet_...",
      "url": "https://meet.google.com/abc-defg-hij"
    }
  }
}
```

如果瀏覽器後備機制在建立 URL 之前遇到 Google 登入或 Meet 權限阻擋，Gateway 方法會傳回失敗的回應，且
`google_meet` 工具會傳回結構化詳細資料，而非純文字字串：

```json
{
  "source": "browser",
  "error": "google-login-required: Sign in to Google in the OpenClaw browser profile, then retry meeting creation.",
  "manualActionRequired": true,
  "manualActionReason": "google-login-required",
  "manualActionMessage": "Sign in to Google in the OpenClaw browser profile, then retry meeting creation.",
  "browser": {
    "nodeId": "ba0f4e4bc...",
    "targetId": "tab-1",
    "browserUrl": "https://accounts.google.com/signin",
    "browserTitle": "Sign in - Google Accounts"
  }
}
```

當 Agent 看到 `manualActionRequired: true` 時，它應回報
`manualActionMessage` 以及瀏覽器節點/分頁內容，並停止開啟新的
Meet 分頁，直到操作員完成瀏覽器步驟。

來自 API 建立的 JSON 輸出範例：

```json
{
  "source": "api",
  "meetingUri": "https://meet.google.com/abc-defg-hij",
  "joined": true,
  "space": {
    "name": "spaces/abc-defg-hij",
    "meetingCode": "abc-defg-hij",
    "meetingUri": "https://meet.google.com/abc-defg-hij"
  },
  "join": {
    "session": {
      "id": "meet_...",
      "url": "https://meet.google.com/abc-defg-hij"
    }
  }
}
```

建立 Meet 預設會加入。Chrome 或 Chrome-node 傳輸仍
需要已登入的 Google Chrome 設定檔才能透過瀏覽器加入。如果
設定檔已登出，OpenClaw 會回報 `manualActionRequired: true` 或
瀏覽器後備錯誤，並要求操作員在重試前完成 Google 登入。

僅在確認您的 Cloud
專案、OAuth 主體和會議參與者均已註冊 Google
Workspace 開發人員預覽計畫 (Meet media APIs) 後，才設定 `preview.enrollmentAcknowledged: true`。

## Config

一般 Chrome 即時路徑只需要啟用外掛程式、BlackHole、SoX
和後端即時語音提供者金鑰。OpenAI 是預設值；設定
`realtime.provider: "google"` 以使用 Google Gemini Live：

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# or
export GEMINI_API_KEY=...
```

在 `plugins.entries.google-meet.config` 下設定外掛程式設定：

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {},
      },
    },
  },
}
```

預設值：

- `defaultTransport: "chrome"`
- `defaultMode: "realtime"`
- `chromeNode.node`：`chrome-node` 的選用節點 ID/名稱/IP
- `chrome.audioBackend: "blackhole-2ch"`
- `chrome.guestName: "OpenClaw Agent"`：未登入 Meet 客人畫面上使用的名稱
- `chrome.autoJoin: true`：透過 `chrome-node` 上的 OpenClaw 瀏覽器自動化，盡力填寫客人名稱並點擊立即加入
- `chrome.reuseExistingTab: true`：啟動現有的 Meet 分頁，而不是開啟重複項
- `chrome.waitForInCallMs: 20000`：在觸發即時簡介之前，等待 Meet 分頁回報通話中狀態
- `chrome.audioFormat: "pcm16-24khz"`：指令對音訊格式。僅針對仍輸出電話音訊的舊版/自訂指令對使用 `"g711-ulaw-8khz"`。
- `chrome.audioInputCommand`：從 CoreAudio `BlackHole 2ch` 讀取並以 `chrome.audioFormat` 寫入音訊的 SoX 指令
- `chrome.audioOutputCommand`：從 CoreAudio `BlackHole 2ch` 寫入並讀取 `chrome.audioFormat` 音訊的 SoX 指令
- `realtime.provider: "openai"`
- `realtime.toolPolicy: "safe-read-only"`
- `realtime.instructions`：簡短的口語回覆，並以 `openclaw_agent_consult` 提供更深入的答案
- `realtime.introMessage`：即時橋接器連線時的簡短口語就緒檢查；將其設定為 `""` 以靜音加入
- `realtime.agentId`：用於 `openclaw_agent_consult` 的選用 OpenClaw 代理程式 ID；預設為 `main`

選用覆寫項：

```json5
{
  defaults: {
    meeting: "https://meet.google.com/abc-defg-hij",
  },
  browser: {
    defaultProfile: "openclaw",
  },
  chrome: {
    guestName: "OpenClaw Agent",
    waitForInCallMs: 30000,
  },
  chromeNode: {
    node: "parallels-macos",
  },
  realtime: {
    provider: "google",
    agentId: "jay",
    toolPolicy: "owner",
    introMessage: "Say exactly: I'm here.",
    providers: {
      google: {
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        voice: "Kore",
      },
    },
  },
}
```

僅限 Twilio 的設定：

```json5
{
  defaultTransport: "twilio",
  twilio: {
    defaultDialInNumber: "+15551234567",
    defaultPin: "123456",
  },
  voiceCall: {
    gatewayUrl: "ws://127.0.0.1:18789",
  },
}
```

`voiceCall.enabled` 預設為 `true`；使用 Twilio 傳輸時，它會將實際的 PSTN 通話和 DTMF 委派給語音通話外掛程式。如果未啟用 `voice-call`，Google Meet 仍然可以驗證並記錄撥號計畫，但無法撥打 Twilio 通話。

## 工具

代理程式可以使用 `google_meet` 工具：

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "realtime"
}
```

當 Chrome 在 Gateway 主機上執行時，請使用 `transport: "chrome"`。當 Chrome 在配對節點（如 Parallels VM）上執行時，請使用 `transport: "chrome-node"`。在這兩種情況下，即時模型和 `openclaw_agent_consult` 都在 Gateway 主機上執行，因此模型憑證會保留在該處。

使用 `action: "status"` 列出作用中的會話或檢查會話 ID。使用
`action: "speak"` 搭配 `sessionId` 和 `message` 讓即時代理
立即說話。使用 `action: "test_speech"` 建立或重複使用會話，
觸發已知短語，並在 Chrome 主機能夠回報時傳回
`inCall` 健康狀態。使用 `action: "leave"` 標記會話已結束。

`status` 包含 Chrome 的健康狀態（如果有）：

- `inCall`：Chrome 似乎已進入 Meet 通話
- `micMuted`：盡力的 Meet 麥克風狀態
- `manualActionRequired` / `manualActionReason` / `manualActionMessage`：
  瀏覽器設定檔需要手動登入、Meet 主機准入、權限，
  或修復瀏覽器控制，語音功能才能運作
- `providerConnected` / `realtimeReady`：即時語音橋接器狀態
- `lastInputAt` / `lastOutputAt`：從橋接器收到或傳送的最後音訊

```json
{
  "action": "speak",
  "sessionId": "meet_...",
  "message": "Say exactly: I'm here and listening."
}
```

## 即時代理諮詢

Chrome 即時模式已針對即時語音迴路進行最佳化。即時語音提供者
會聽取會議音訊，並透過設定的音訊橋接器說話。
當即時模型需要更深入的推理、最新資訊或一般的
OpenClaw 工具時，它可以呼叫 `openclaw_agent_consult`。

諮詢工具會在背景執行標準的 OpenClaw 代理，並使用最近的
會議逐字稿內容，向即時語音會話傳回簡明的口語答案。
然後，語音模型可以將該答案說回會議中。
它使用與語音通話相同的共用即時諮詢工具。

根據預設，諮詢會對 `main` 代理執行。
當 Meet 通道應諮詢專用的 OpenClaw 代理工作區、模型預設值、
工具政策、記憶體和會議記錄時，請設定 `realtime.agentId`。

`realtime.toolPolicy` 控制諮詢執行：

- `safe-read-only`：暴露諮詢工具並將常規代理限制為
  `read`、`web_search`、`web_fetch`、`x_search`、`memory_search` 和
  `memory_get`。
- `owner`：暴露諮詢工具並允許常規代理使用正常的
  代理工具策略。
- `none`：不向即時語音模型暴露諮詢工具。

諮詢會話密鑰的範圍是每個 Meet 會話，因此後續的諮詢呼叫
可以在同一會議期間重用先前的諮詢上下文。

若要在 Chrome 完全加入通話後強制進行口語就緒檢查：

```bash
openclaw googlemeet speak meet_... "Say exactly: I'm here and listening."
```

對於完整的加入並發音冒煙測試：

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "Say exactly: I'm here and listening."
```

## 即時測試檢查清單

在將會議交給無人值守的代理之前，請使用此順序：

```bash
openclaw googlemeet setup
openclaw nodes status
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "Say exactly: Google Meet speech test complete."
```

預期的 Chrome 節點狀態：

- `googlemeet setup` 全為綠色。
- 當 Chrome 節點是
  預設傳輸或節點被固定時，`googlemeet setup` 包含 `chrome-node-connected`。
- `nodes status` 顯示所選節點已連線。
- 所選節點同時廣播 `googlemeet.chrome` 和 `browser.proxy`。
- Meet 分頁加入通話，且 `test-speech` 傳回帶有
  `inCall: true` 的 Chrome 健康狀態。

對於遠端 Chrome 主機（例如 Parallels macOS VM），這是在更新 Gateway 或 VM 後
最短的安全檢查：

```bash
openclaw googlemeet setup
openclaw nodes status --connected
openclaw nodes invoke \
  --node parallels-macos \
  --command googlemeet.chrome \
  --params '{"action":"setup"}'
```

這證明了 Gateway 外掛程式已載入，VM 節點已使用目前權杖連線，
並且在代理開啟真實會議分頁之前，Meet 音訊橋接器可用。

對於 Twilio 冒煙測試，請使用暴露電話撥入詳細資訊的會議：

```bash
openclaw googlemeet setup
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

預期的 Twilio 狀態：

- `googlemeet setup` 包含綠色的 `twilio-voice-call-plugin` 和
  `twilio-voice-call-credentials` 檢查。
- 在 Gateway 重新載入後，`voicecall` 可在 CLI 中使用。
- 傳回的會話具有 `transport: "twilio"` 和 `twilio.voiceCallId`。
- `googlemeet leave <sessionId>` 掛起委派的語音通話。

## 故障排除

### 代理無法看見 Google Meet 工具

確認外掛程式已在 Gateway 設定中啟用，然後重新載入 Gateway：

```bash
openclaw plugins list | grep google-meet
openclaw googlemeet setup
```

如果您剛剛編輯了 `plugins.entries.google-meet`，請重新啟動或重新載入 Gateway。
執行中的代理程式只能看到目前 Gateway 程序註冊的外掛工具。

### 沒有已連接的支援 Google Meet 節點

在節點主機上，執行：

```bash
openclaw plugins enable google-meet
openclaw plugins enable browser
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

在 Gateway 主機上，核准節點並驗證指令：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

節點必須已連接並列出 `googlemeet.chrome` 以及 `browser.proxy`。
Gateway 設定必須允許那些節點指令：

```json5
{
  gateway: {
    nodes: {
      allowCommands: ["browser.proxy", "googlemeet.chrome"],
    },
  },
}
```

如果 `googlemeet setup` 失敗 `chrome-node-connected` 或 Gateway 記錄檔回報
`gateway token mismatch`，請使用目前的 Gateway
金鑶重新安裝或重新啟動節點。對於 LAN Gateway，這通常意味著：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install \
  --host <gateway-lan-ip> \
  --port 18789 \
  --display-name parallels-macos \
  --force
```

然後重新載入節點服務並重新執行：

```bash
openclaw googlemeet setup
openclaw nodes status --connected
```

### 瀏覽器已開啟但代理程式無法加入

執行 `googlemeet test-speech` 並檢查傳回的 Chrome 健康狀態。如果它
回報 `manualActionRequired: true`，請向操作員顯示 `manualActionMessage`
並停止重試，直到瀏覽器操作完成。

常見的手動操作：

- 登入 Chrome 設定檔。
- 從 Meet 主機帳戶允許訪客進入。
- 當 Chrome 的原生權限提示出現時，授予 Chrome 麥克風/相機權限。
- 關閉或修復卡住的 Meet 權限對話框。

不要僅因為 Meet 顯示「您要讓會議中的人聽到您的聲音嗎？」就回報「未登入」。那是 Meet 的音訊選擇插頁；當可用時，OpenClaw 會透過瀏覽器自動化點擊 **使用麥克風**，並持續等待真正的會議狀態。對於僅建立 URL 的瀏覽器備援方案，OpenClaw 可能會點擊 **不使用麥克風繼續**，因為建立 URL 不需要即時音訊路徑。

### 會議建立失敗

當設定 OAuth 憑證時，`googlemeet create` 首先會使用 Google Meet API 的 `spaces.create` 端點。
如果沒有 OAuth 憑證，它會備援到釘選的 Chrome 節點瀏覽器。請確認：

- 對於 API 建立：已設定 `oauth.clientId` 和 `oauth.refreshToken`，
  或存在相符的 `OPENCLAW_GOOGLE_MEET_*` 環境變數。
- 對於 API 建立：重新整理權杖 (refresh token) 是在加入建立支援後產生的。舊的權杖可能缺少 `meetings.space.created` 範圍；請重新執行 `openclaw googlemeet auth login --json` 並更新外掛程式設定。
- 對於瀏覽器備援：`defaultTransport: "chrome-node"` 和 `chromeNode.node` 指向一個具備 `browser.proxy` 和 `googlemeet.chrome` 的已連線節點。
- 對於瀏覽器備援：該節點上的 OpenClaw Chrome 設定檔已登入 Google，且可以開啟 `https://meet.google.com/new`。
- 對於瀏覽器備援：重試會在開啟新分頁之前重用現有的 `https://meet.google.com/new` 或 Google 帳號提示分頁。如果代理程式逾時，請重試工具呼叫，而不是手動開啟另一個 Meet 分頁。
- 對於瀏覽器備援：如果工具回傳 `manualActionRequired: true`，請使用回傳的 `browser.nodeId`、`browser.targetId`、`browserUrl` 和 `manualActionMessage` 來引導操作員。在完成該動作之前，請勿在迴圈中重試。
- 對於瀏覽器備援：如果 Meet 顯示「您是否要在會議中讓其他人聽到您的聲音？」，請保持分頁開啟。OpenClaw 應透過瀏覽器自動化點擊 **使用麥克風**，或者對於僅建立備援，點擊 **不使用麥克風繼續**，並繼續等待產生的 Meet URL。如果無法做到，錯誤訊息應提及 `meet-audio-choice-required`，而非 `google-login-required`。

### 代理程式已加入但無法說話

檢查即時路徑：

```bash
openclaw googlemeet setup
openclaw googlemeet doctor
```

使用 `mode: "realtime"` 進行監聽/雙向通話。`mode: "transcribe"` 故意不啟動雙工即時語音橋接器。

同時驗證：

- Gateway 主機上有可用的即時提供者金鑰，例如 `OPENAI_API_KEY` 或 `GEMINI_API_KEY`。
- Chrome 主機上可見 `BlackHole 2ch`。
- Chrome 主機上存在 `sox`。
- Meet 麥克風和揚聲器已路由透過 OpenClaw 使用的虛擬音訊路徑。

`googlemeet doctor [session-id]` 會列印工作階段、節點、通話中狀態、
手動操作原因、即時供應商連線、`realtimeReady`、音訊
輸入/輸出活動、最後音訊時間戳記、位元組計數器以及瀏覽器 URL。
當您需要原始 JSON 時，請使用 `googlemeet status [session-id]`。當您需要在不
洩露 Token 的情況下驗證 Google Meet OAuth 重新整理時，請使用 `googlemeet doctor --oauth`；
當您同時需要 Google Meet API 證明時，請新增 `--meeting` 或 `--create-space`。

如果代理逾時，且您可以看到 Meet 分頁已經開啟，請檢查該分頁
而不要開啟另一個分頁：

```bash
openclaw googlemeet recover-tab
openclaw googlemeet recover-tab https://meet.google.com/abc-defg-hij
```

對等的工具動作是 `recover_current_tab`。它會聚焦並檢查所選
傳輸的現有 Meet 分頁。對於 `chrome`，它會透過 Gateway
使用本機瀏覽器控制；對於 `chrome-node`，它會使用已設定
的 Chrome 節點。它不會開啟新分頁或建立新工作階段；它會回報
目前的阻礙因素，例如登入、准許、權限或音訊選擇狀態。
CLI 指令會與已設定的 Gateway 通訊，因此 Gateway 必須正在執行；
`chrome-node` 也需要 Chrome 節點已連線。

### Twilio 設定檢查失敗

當 `voice-call` 未被允許或未啟用時，
`twilio-voice-call-plugin` 會失敗。
將其新增到 `plugins.allow`，啟用 `plugins.entries.voice-call`，然後重新載入
Gateway。

當 Twilio 後端缺少帳戶
SID、驗證 Token 或來電者號碼時，`twilio-voice-call-credentials` 會失敗。請在 Gateway 主機上設定這些項目：

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
```

然後重新啟動或重新載入 Gateway 並執行：

```bash
openclaw googlemeet setup
openclaw voicecall setup
openclaw voicecall smoke
```

`voicecall smoke` 預設僅檢查就緒狀態。若要對特定號碼進行試執行：

```bash
openclaw voicecall smoke --to "+15555550123"
```

僅在您有意撥打即時外撥通知
電話時，才新增 `--yes`：

```bash
openclaw voicecall smoke --to "+15555550123" --yes
```

### Twilio 通話已啟動但從未進入會議

確認 Meet 事件公開了電話撥入詳細資訊。傳入確切的撥入
號碼和 PIN 或自訂 DTMF 序列：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

如果供應商需要在輸入 PIN 之前暫停，請在 `--dtmf-sequence` 中使用前導 `w` 或逗號。

## 備註

Google Meet 的官方媒體 API 是以接收為導向的，因此要在 Meet 通話中發言仍需要參與者路徑。此外掛程式讓該邊界保持可見：Chrome 處理瀏覽器參與和本地音訊路由；Twilio 處理電話撥入參與。

Chrome 即時模式需要以下其一：

- `chrome.audioInputCommand` 加上 `chrome.audioOutputCommand`：OpenClaw 擁有即時模型橋接器，並在 `chrome.audioFormat` 中將這些命令與所選的即時語音提供者之間的音訊進行傳輸。預設的 Chrome 路徑是 24 kHz PCM16；8 kHz G.711 mu-law 仍可用於舊版命令對。
- `chrome.audioBridgeCommand`：外部橋接命令擁有整個本地音訊路徑，並且必須在啟動或驗證其守護程序後退出。

為了獲得乾淨的全雙工音訊，請將 Meet 輸出和 Meet 麥克風透過分開的虛擬裝置或 Loopback 風格的虛擬裝置圖進行路由。單一共享的 BlackHole 裝置可以將其他參與者的聲音回傳到通話中。

`googlemeet speak` 會觸發 Chrome 會話的現用即時音訊橋接器。`googlemeet leave` 會停止該橋接器。對於透過 Voice Call 外掛程式委派的 Twilio 會話，`leave` 也會掛斷底層的語音通話。

## 相關

- [Voice call plugin](/zh-Hant/plugins/voice-call)
- [Talk mode](/zh-Hant/nodes/talk)
- [Building plugins](/zh-Hant/plugins/building-plugins)
