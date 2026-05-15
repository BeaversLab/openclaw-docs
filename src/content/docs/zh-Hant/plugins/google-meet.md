---
summary: "Google Meet 外掛程式：透過 Chrome 或 Twilio 加入指定的 Meet URL，並預設啟用代理程式回傳功能"
read_when:
  - You want an OpenClaw agent to join a Google Meet call
  - You want an OpenClaw agent to create a new Google Meet call
  - You are configuring Chrome, Chrome node, or Twilio as a Google Meet transport
title: "Google Meet 外掛程式"
---

OpenClaw 的 Google Meet 參與者支援 — 該外掛程式設計上為顯式操作：

- 它只會加入指定的 `https://meet.google.com/...` URL。
- 它可以透過 Google Meet API 建立新的 Meet 空間，然後加入
  傳回的 URL。
- `agent` 是預設的回傳模式：即時轉錄會進行聆聽，已設定的 OpenClaw 代理程式會進行回答，而一般的 OpenClaw TTS 會對著 Meet 發言。
- `bidi` 仍然可用作備用的直接即時語音模型模式。
- 代理程式使用 `mode` 來選擇加入行為：使用 `agent` 進行即時聆聽/回傳，使用 `bidi` 進行直接即時語音備援，或使用 `transcribe` 在不使用回傳橋接器的情況下加入/控制瀏覽器。
- 身份驗證始於個人 Google OAuth 或已登入的 Chrome 設定檔。
- 沒有自動同意公告。
- 預設的 Chrome 音訊後端是 `BlackHole 2ch`。
- Chrome 可以在本機或配對的節點主機上執行。
- Twilio 接受撥入號碼以及選用的 PIN 或 DTMF 序列；它無法直接撥打 Meet URL。
- CLI 指令是 `googlemeet`；`meet` 則保留給更廣泛的代理程式電話會議工作流程。

## 快速入門

安裝本機音訊相依元件並設定即時轉錄提供者以及一般的 OpenClaw TTS。OpenAI 是預設的轉錄提供者；Google Gemini Live 也可作為單獨的 `bidi` 語音備援，搭配 `realtime.voiceProvider: "google"` 使用：

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# only needed when realtime.voiceProvider is "google" for bidi mode
export GEMINI_API_KEY=...
```

`blackhole-2ch` 會安裝 `BlackHole 2ch` 虛擬音訊裝置。Homebrew 的安裝程式需要重新開機，macOS 才會顯示該裝置：

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

設定輸出是設計給代理程式閱讀且具有模式感知能力的。它會回報 Chrome 設定檔、節點釘選，以及針對即時 Chrome 加入操作，回報 BlackHole/SoX 音訊橋接器和延遲的即時介紹檢查。對於僅觀察的加入操作，請使用 `--mode transcribe` 檢查相同的傳輸方式；由於該模式不會透過橋接器聆聽或發言，因此會跳過即時音訊先決條件：

```bash
openclaw googlemeet setup --transport chrome-node --mode transcribe
```

當設定好 Twilio 委派時，設定程序也會回報 `voice-call` 外掛程式、Twilio 憑證以及公開 webhook 是否已準備就緒。
在要求代理程式加入之前，請將任何 `ok: false` 檢查視為受檢查傳輸模式和模式的阻礙因素。
請使用 `openclaw googlemeet setup --json` 來取得
腳本或機器可讀的輸出。請使用 `--transport chrome`、
`--transport chrome-node` 或 `--transport twilio` 在代理程式嘗試之前
對特定傳輸進行飛前檢查。

對於 Twilio，當預設傳輸為 Chrome 時，請務必明確地對傳輸進行飛前檢查：

```bash
openclaw googlemeet setup --transport twilio
```

這可以在代理程式嘗試撥打會議之前，偵測出遺漏的 `voice-call` 連線、Twilio 憑證，或無法連線的
webhook。

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
  "mode": "agent"
}
```

在非 macOS 主機上，代理程式使用的 `google_meet` 工具仍可用於
artifact、calendar、setup、transcribe、Twilio 和 `chrome-node` 流程。本機
Chrome 通話回傳動作會在此被封鎖，因為內建的 Chrome 音訊路徑
目前依賴 macOS `BlackHole 2ch`。在 Linux 上，請使用 `mode: "transcribe"`、
Twilio 撥入，或 macOS `chrome-node` 主機來進行 Chrome 通話回傳
參與。

建立新會議並加入：

```bash
openclaw googlemeet create --transport chrome-node --mode agent
```

對於透過 API 建立的會議室，當您希望會議室的「無需敲門」政策明確指定，
而非繼承自 Google 帳號預設值時，請使用 Google Meet `SpaceConfig.accessType`：

```bash
openclaw googlemeet create --access-type OPEN --transport chrome-node --mode agent
```

`OPEN` 允許任何擁有 Meet 網址的人無需敲門即可加入。`TRUSTED` 允許
主機組織的信任使用者、受邀的外部使用者和撥入使用者
無需敲門即可加入。`RESTRICTED` 將無需敲門的加入權限限制為受邀者。這些
設定僅適用於官方 Google Meet API 的建立途徑，因此必須
設定 OAuth 憑證。

如果您在這個選項可用之前已對 Google Meet 進行驗證，請在將
`meetings.space.settings` 範圍新增至您的 Google OAuth 同意畫面後，重新執行
`openclaw googlemeet auth login --json`。

僅建立網址而不加入：

```bash
openclaw googlemeet create --no-join
```

`googlemeet create` 有兩種途徑：

- API 建立：當配置了 Google Meet OAuth 憑證時使用。這是最確定的途徑，不依賴瀏覽器 UI 狀態。
- 瀏覽器後備方案：當缺少 OAuth 憑證時使用。OpenClaw 使用固定的 Chrome 節點，開啟 `https://meet.google.com/new`，等待 Google 重定向到真實的會議代碼 URL，然後返回該 URL。此途徑要求節點上的 OpenClaw Chrome 個人資料必須已登入 Google。瀏覽器自動化會處理 Meet 自己的首次執行麥克風提示；該提示不會被視為 Google 登入失敗。加入和建立流程也會嘗試在開啟新分頁之前重用現有的 Meet 分頁。匹配會忽略無害的 URL 查詢字串，例如 `authuser`，因此代理重試時應聚焦於已開啟的會議，而不是建立第二個 Chrome 分頁。

指令/工具輸出包含一個 `source` 欄位（`api` 或 `browser`），以便代理可以解釋使用了哪種途徑。`create` 預設會加入新會議並返回 `joined: true` 以及加入會話。若僅要產生 URL，請在 CLI 上使用 `create --no-join` 或將 `"join": false` 傳遞給工具。

或者指示代理：「建立一個 Google Meet，使用代理通話回應模式加入，並將連結發送給我。」代理應該使用 `action: "create"` 呼叫 `google_meet`，然後分享返回的 `meetingUri`。

```json
{
  "action": "create",
  "transport": "chrome-node",
  "mode": "agent"
}
```

若要進行僅觀察/瀏覽器控制的加入，請設定 `"mode": "transcribe"`。這不會啟動雙工即時語音橋接器，不需要 BlackHole 或 SoX，也不會在會議中回應。在此模式下，Chrome 加入也會避免 OpenClaw 的麥克風/相機權限授予，並避免 Meet 的 **使用麥克風** 路徑。如果 Meet 顯示音訊選擇插頁，自動化會嘗試無麥克風路徑，否則會回報手動操作而不是開啟本機麥克風。在轉錄模式下，受控的 Chrome 傳輸也會安裝盡力而為的 Meet 字幕觀察器。`googlemeet status --json` 和 `googlemeet doctor` 會顯示 `captioning`、`captionsEnabledAttempted`、`transcriptLines`、`lastCaptionAt`、`lastCaptionSpeaker`、`lastCaptionText` 以及簡短的 `recentTranscript` 尾聲，讓操作員可以判斷瀏覽器是否已加入通話，以及 Meet 字幕是否正在產生文字。
當您需要是/否探測時，請使用 `openclaw googlemeet test-listen <meet-url> --transport chrome-node`：它會以轉錄模式加入，等待新的字幕或逐字稿活動，並傳回 `listenVerified`、`listenTimedOut`、手動操作欄位以及最新的字幕健康狀態。

在即時會話期間，`google_meet` 狀態包括瀏覽器和音訊橋接器的健康狀況，例如 `inCall`、`manualActionRequired`、`providerConnected`、`realtimeReady`、`audioInputActive`、`audioOutputActive`、最後輸入/輸出時間戳記、位元組計數器以及橋接器關閉狀態。如果出現安全的 Meet 頁面提示，瀏覽器自動化會盡可能處理。登入、主持人准許以及瀏覽器/OS 權限提示會回報為帶有原因和訊息的手動操作，供代理轉達。受控的 Chrome 會話僅在瀏覽器健康狀態回報 `inCall: true` 後才會發出開場白或測試短語；否則狀態會回報 `speechReady: false` 並且阻止嘗試發言，而不是假裝代理已在會議中發言。

本機 Chrome 透過已登入的 OpenClaw 瀏覽器設定檔加入。即時模式需要 `BlackHole 2ch` 用於 OpenClaw 使用的麥克風/揚聲器路徑。為了乾淨的全雙工音訊，請使用獨立的虛擬裝置或 Loopback 風格的圖形；單一 BlackHole 裝置足以進行初次冒煙測試，但可能會產生回音。

### 本機閘道 + Parallels Chrome

您**不**需要在 macOS VM 內設置完整的 OpenClaw Gateway 或模型 API 金鑰，僅為了讓 VM 擁有 Chrome。請在本機執行 Gateway 和代理程式，然後在 VM 中執行節點主機。在 VM 上啟用內建外掛程式一次，以便節點宣佈 Chrome 指令：

什麼在哪裡執行：

- Gateway 主機：OpenClaw Gateway、代理程式工作區、模型/API 金鑰、即時提供者以及 Google Meet 外掛程式設定。
- Parallels macOS VM：OpenClaw CLI/節點主機、Google Chrome、SoX、BlackHole 2ch，以及已登入 Google 的 Chrome 設定檔。
- VM 中不需要：Gateway 服務、代理程式設定、OpenAI/GPT 金鑰或模型提供者設定。

安裝 VM 依賴項：

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

在 VM 中安裝或更新 OpenClaw，然後在那裡啟用內建外掛程式：

```bash
openclaw plugins enable google-meet
```

在 VM 中啟動節點主機：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name parallels-macos
```

如果 `<gateway-host>` 是 LAN IP 且您未使用 TLS，除非您選擇加入該受信任的私人網路，否則節點將拒絕純文字 WebSocket：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

將節點安裝為 LaunchAgent 時，請使用相同的環境變數：

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install --host <gateway-lan-ip> --port 18789 --display-name parallels-macos --force
openclaw node restart
```

`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 是程序環境，而非 `openclaw.json` 設定。當安裝指令中存在 `openclaw node install` 時，它會將其儲存在 LaunchAgent 環境中。

從 Gateway 主機批准節點：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

確認 Gateway 能看到該節點，並且它宣佈了 `googlemeet.chrome` 和瀏覽器功能/`browser.proxy`：

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

或要求代理程式使用 `google_meet` 工具搭配 `transport: "chrome-node"`。

若要進行單一指令的冒煙測試，該測試會建立或重複使用會話、說出已知片語並列印會話健康狀態：

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij
```

在即時加入期間，OpenClaw 瀏覽器自動化會填寫訪客名稱，點擊「加入/請求加入」，並在出現該提示時接受 Meet 首次執行的「使用麥克風」選項。在僅觀察加入或僅瀏覽器建立會議期間，當該選項可用時，它會在不使用麥克風的情況下繼續通過相同的提示。如果瀏覽器設定檔未登入、Meet 正在等待主持人許可、Chrome 需要麥克風/相機權限才能進行即時加入，或者 Meet 卡在自動化無法解決的提示上，則加入/測試語音結果會回報 `manualActionRequired: true` 並包含 `manualActionReason` 和 `manualActionMessage`。Agent 應停止重試加入，回報該確切訊息以及目前的 `browserUrl`/`browserTitle`，並且僅在手動瀏覽器操作完成後才重試。

如果省略了 `chromeNode.node`，OpenClaw 僅在恰好有一個連接的節點同時公告支援 `googlemeet.chrome` 和瀏覽器控制時才會自動選擇。如果連接了多個具備能力的節點，請將 `chromeNode.node` 設定為節點 ID、顯示名稱或遠端 IP。

常見失敗檢查：

- `Configured Google Meet node ... is not usable: offline`：釘選的節點為 Gateway 所知但無法使用。Agent 應將該節點視為診斷狀態，而非可用的 Chrome 主機，並報告設定阻礙，而不是回退到其他傳輸，除非用戶要求這樣做。
- `No connected Google Meet-capable node`：在 VM 中啟動 `openclaw node run`，批准配對，並確保 `openclaw plugins enable google-meet` 和 `openclaw plugins enable browser` 已在 VM 中執行。同時確認 Gateway 主機允許使用 `gateway.nodes.allowCommands: ["googlemeet.chrome", "browser.proxy"]` 執行這兩個節點指令。
- `BlackHole 2ch audio device not found`：在受檢查的主機上安裝 `blackhole-2ch`，並在使用本機 Chrome 音訊前重新啟動。
- `BlackHole 2ch audio device not found on the node`：在 VM 中安裝 `blackhole-2ch` 並重新啟動 VM。
- Chrome 已開啟但無法加入：請登入 VM 內的瀏覽器設定檔，或保留 `chrome.guestName` 設定以供訪客加入。訪客自動加入會透過節點瀏覽器代理程式使用 OpenClaw 瀏覽器自動化；請確保節點瀏覽器設定指向您要的設定檔，例如 `browser.defaultProfile: "user"` 或具名 existing-session 設定檔。
- 重複的 Meet 分頁：請保留 `chrome.reuseExistingTab: true` 為啟用狀態。OpenClaw 在開啟新分頁之前，會先啟動相同 Meet URL 的現有分頁，且瀏覽器會議建立會重用進行中的 `https://meet.google.com/new` 或 Google 帳號提示分頁，然後再開啟另一個分頁。
- 沒有聲音：在 Meet 中，請將麥克風/揚聲器路由至 OpenClaw 使用的虛擬音訊裝置路徑；請使用獨立的虛擬裝置或 Loopback 風格的路由，以獲得乾淨的全雙工音訊。

## 安裝說明

Chrome 預設的對談傳回功能使用兩個外部工具：

- `sox`：指令列音訊公用程式。此外掛程式針對預設的 24 kHz PCM16 音訊橋接器使用明確的 CoreAudio 裝置指令。
- `blackhole-2ch`：macOS 虛擬音訊驅動程式。它會建立 Chrome/Meet 可以路由經過的 `BlackHole 2ch` 音訊裝置。

OpenClaw 不會打包或重新發布這兩個套件。文件會要求使用者透過 Homebrew 將其安裝為主機相依性。SoX 的授權為 `LGPL-2.0-only AND GPL-2.0-only`；BlackHole 則為 GPL-3.0。如果您要建置將 BlackHole 與 OpenClaw 打包在一起的安裝程式或設備，請檢閱 BlackHole 的上游授權條款，或向 Existential Audio 取得個別授權。

## 傳輸

### Chrome

Chrome 傳輸會透過 OpenClaw 瀏覽器控制開啟 Meet URL，並以已登入的 OpenClaw 瀏覽器設定檔加入。在 macOS 上，此外掛程式會在啟動前檢查 `BlackHole 2ch`。如果已設定，它也會在開啟 Chrome 之前執行音訊橋接器健康檢查指令和啟動指令。當 Chrome/音訊位於 Gateway 主機上時，請使用 `chrome`；當 Chrome/音訊位於配對節點（例如 Parallels macOS VM）上時，請使用 `chrome-node`。對於本機 Chrome，請選擇具有 `browser.defaultProfile` 的設定檔；`chrome.browserProfile` 會傳遞給 `chrome-node` 主機。

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome-node
```

透過本機 OpenClaw 音訊橋接器路由 Chrome 麥克風和喇叭音訊。如果未安裝 `BlackHole 2ch`，加入將會失敗並顯示設定錯誤，而不是在沒有音訊路徑的情況下無聲加入。

### Twilio

Twilio 傳輸是一個委派給語音通話外掛的嚴格撥號計畫。它不會從 Meet 頁面解析電話號碼。

當無法使用 Chrome 參與，或者您需要電話撥入備援方案時，請使用此選項。Google Meet 必須為會議提供電話撥入號碼和 PIN；OpenClaw 不會從 Meet 頁面發現這些資訊。

請在 Gateway 主機上啟用語音通話外掛，而不是在 Chrome 節點上：

```json5
{
  plugins: {
    allow: ["google-meet", "voice-call", "google"],
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
          inboundPolicy: "allowlist",
          realtime: {
            enabled: true,
            provider: "google",
            instructions: "Join this Google Meet as an OpenClaw agent. Be brief.",
            toolPolicy: "safe-read-only",
            providers: {
              google: {
                silenceDurationMs: 500,
                startSensitivity: "high",
              },
            },
          },
        },
      },
      google: {
        enabled: true,
      },
    },
  },
}
```

透過環境變數或設定檔提供 Twilio 憑證。使用環境變數可將機密資訊排除在 `openclaw.json` 之外：

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
export GEMINI_API_KEY=...
```

如果那是您的即時語音提供者，請改用 `realtime.provider: "openai"` 搭配 OpenAI 提供者外掛和 `OPENAI_API_KEY`。

啟用 `voice-call` 後，請重新啟動或重新載入 Gateway；外掛設定變更不會出現在已經執行的 Gateway 程序中，直到它重新載入。

然後驗證：

```bash
openclaw config validate
openclaw plugins list | grep -E 'google-meet|voice-call'
openclaw googlemeet setup
```

當 Twilio 委派已連線時，`googlemeet setup` 包含成功的 `twilio-voice-call-plugin`、`twilio-voice-call-credentials` 和 `twilio-voice-call-webhook` 檢查。

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

當會話需要自訂序列時，請使用 `--dtmf-sequence`：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

## OAuth 和預檢

對於建立 Meet 連結，OAuth 是可選的，因為 `googlemeet create` 可以回退到瀏覽器自動化。當您需要官方 API 建立、空間解析或 Meet Media API 預檢時，請設定 OAuth。

Google Meet API 存取使用使用者 OAuth：建立一個 Google Cloud OAuth 用戶端，請求所需的範圍，授權一個 Google 帳戶，然後將產生的重新整理權杖儲存在 Google Meet 外掛設定中，或提供 `OPENCLAW_GOOGLE_MEET_*` 環境變數。

OAuth 不會取代 Chrome 加入路徑。當您使用瀏覽器參與時，Chrome 和 Chrome-node 傳輸仍然透過已登入的 Chrome 設定檔、BlackHole/SoX 和連線的節點加入。OAuth 僅用於官方 Google Meet API 路徑：建立會議空間、解析空間以及執行 Meet Media API 預檢。

### 建立 Google 憑證

在 Google Cloud Console 中：

1. 建立或選取一個 Google Cloud 專案。
2. 為該專案啟用 **Google Meet REST API**。
3. 設定 OAuth 同意畫面。
   - **內部** 對於 Google Workspace 組織來說最簡單。
   - **外部** 適用於個人/測試設定；當應用程式處於測試狀態時，
     將每個將授權該應用程式的 Google 帳戶新增為測試使用者。
4. 新增 OpenClaw 請求的範圍：
   - `https://www.googleapis.com/auth/meetings.space.created`
   - `https://www.googleapis.com/auth/meetings.space.readonly`
   - `https://www.googleapis.com/auth/meetings.space.settings`
   - `https://www.googleapis.com/auth/meetings.conference.media.readonly`
5. 建立 OAuth 用戶端 ID。
   - 應用程式類型：**Web 應用程式**。
   - 已授權的重新導向 URI：

     ```text
     http://localhost:8085/oauth2callback
     ```

6. 複製用戶端 ID 和用戶端密鑰。

`meetings.space.created` 是 Google Meet `spaces.create` 所必需的。
`meetings.space.readonly` 讓 OpenClaw 能將 Meet URL/代碼解析為空間。
`meetings.space.settings` 讓 OpenClaw 能在 API 房間建立期間傳遞 `SpaceConfig` 設定，例如
`accessType`。
`meetings.conference.media.readonly` 用於 Meet Media API 預檢和媒體
工作；對於實際的 Media API 使用，Google 可能需要註冊開發者預覽版。
如果您只需要基於瀏覽器的 Chrome 加入，請完全跳過 OAuth。

### 產生刷新令牌

設定 `oauth.clientId` 和可選的 `oauth.clientSecret`，或將它們作為
環境變數傳遞，然後執行：

```bash
openclaw googlemeet auth login --json
```

此指令會列印出一個帶有重新整理令牌的 `oauth` 設定區塊。它使用 PKCE、`http://localhost:8085/oauth2callback` 上的 localhost 回呼，以及透過 `--manual` 進行的手動複製/貼上流程。

範例：

```bash
OPENCLAW_GOOGLE_MEET_CLIENT_ID="your-client-id" \
OPENCLAW_GOOGLE_MEET_CLIENT_SECRET="your-client-secret" \
openclaw googlemeet auth login --json
```

當瀏覽器無法連接到本地回呼時，請使用手動模式：

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

如果您不希望重新整理令牌出現在設定中，請優先使用環境變數。如果同時存在設定和環境變數值，外掛程式會優先解析設定，然後才使用環境變數作為後備。

OAuth 同意範圍包括建立 Meet 空間、讀取 Meet 空間的存取權，以及讀取 Meet 會議媒體的存取權。如果您在支援建立會議的功能存在之前進行了驗證，請重新執行 `openclaw googlemeet auth login --json`，以便重新整理令牌具有 `meetings.space.created` 範圍。

### 使用 doctor 驗證 OAuth

當您想要快速、不洩密的健康檢查時，請執行 OAuth doctor：

```bash
openclaw googlemeet doctor --oauth --json
```

這不會載入 Chrome 執行時，也不需要已連線的 Chrome 節點。它會檢查 OAuth 設定是否存在，以及重新整理權杖是否可以產生存取權杖。JSON 報告僅包含狀態欄位，例如 `ok`、`configured`、`tokenSource`、`expiresAt` 和檢查訊息；它不會列印存取權杖、重新整理權杖或客戶端金鑰。

常見結果：

| 檢查                 | 含義                                                                  |
| -------------------- | --------------------------------------------------------------------- |
| `oauth-config`       | 存在 `oauth.clientId` 加上 `oauth.refreshToken`，或已快取的存取權杖。 |
| `oauth-token`        | 已快取的存取權杖仍然有效，或者重新整理權杖產生了新的存取權杖。        |
| `meet-spaces-get`    | 選用的 `--meeting` 檢查解析了既有的 Meet 空間。                       |
| `meet-spaces-create` | 選用的 `--create-space` 檢查建立了一個新的 Meet 空間。                |

為了證明 Google Meet API 已啟用以及具有 `spaces.create` 範圍，請執行
具有副作用的 create 檢查：

```bash
openclaw googlemeet doctor --oauth --create-space --json
openclaw googlemeet create --no-join --json
```

`--create-space` 會建立一個用完即丟的 Meet URL。當您需要確認
Google Cloud 專案已啟用 Meet API 且授權帳號具有
`meetings.space.created` 範圍時，請使用它。

若要證明對既有會議空間的讀取存取權：

```bash
openclaw googlemeet doctor --oauth --meeting https://meet.google.com/abc-defg-hij --json
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

`doctor --oauth --meeting` 和 `resolve-space` 證明已讀取經授權 Google 帳戶可存取的現有空間。來自這些檢查的 `403` 通常表示 Google Meet REST API 已停用、同意的重新整理權杖缺少所需範圍，或 Google 帳戶無法存取該 Meet 空間。重新整理權杖錯誤表示重新執行 `openclaw googlemeet auth login
--` and store the new `oauth` 區塊。

瀏覽器後援不需要 OAuth 憑證。在該模式下，Google 驗證來自所選節點上已登入的 Chrome 設定檔，而非來自 OpenClaw 設定。

這些環境變數被接受作為後援：

- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` 或 `GOOGLE_MEET_CLIENT_ID`
- `OPENCLAW_GOOGLE_MEET_CLIENT_SECRET` 或 `GOOGLE_MEET_CLIENT_SECRET`
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` 或 `GOOGLE_MEET_REFRESH_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` 或 `GOOGLE_MEET_ACCESS_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` 或
  `GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT`
- `OPENCLAW_GOOGLE_MEET_DEFAULT_MEETING` 或 `GOOGLE_MEET_DEFAULT_MEETING`
- `OPENCLAW_GOOGLE_MEET_PREVIEW_ACK` 或 `GOOGLE_MEET_PREVIEW_ACK`

透過 `spaces.get` 解析 Meet 網址、代碼或 `spaces/{id}`：

```bash
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

在媒體工作之前執行預檢：

```bash
openclaw googlemeet preflight --meeting https://meet.google.com/abc-defg-hij
```

在 Meet 建立會議記錄後，列出會議成果與出席記錄：

```bash
openclaw googlemeet artifacts --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet attendance --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet export --meeting https://meet.google.com/abc-defg-hij --output ./meet-export
```

使用 `--meeting`、`artifacts` 和 `attendance` 時，預設使用最新的會議記錄。
當您想要該會議的所有保留記錄時，請傳入 `--all-conference-records`。

在讀取 Meet 成品之前，日曆查詢可以從 Google Calendar 解析會議 URL：

```bash
openclaw googlemeet latest --today
openclaw googlemeet calendar-events --today --json
openclaw googlemeet artifacts --event "Weekly sync"
openclaw googlemeet attendance --today --format csv --output attendance.csv
```

`--today` 會搜尋今天 `primary` 日曆中包含 Google Meet 連結的日曆活動。使用 `--event <query>` 搜尋相符的活動文字，並使用 `--calendar <id>` 指定非主要日曆。日曆查詢需要新的 OAuth 登入，且包含日曆活動的唯讀範圍。
`calendar-events` 會預覽相符的 Meet 活動，並標記 `latest`、`artifacts`、`attendance` 或 `export` 將選擇的活動。

如果您已經知道會議記錄 ID，請直接對其進行定址：

```bash
openclaw googlemeet latest --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 --json
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 --json
```

當您想在通話結束後關閉房間時，請結束透過 API 建立之空間的現有會議：

```bash
openclaw googlemeet end-active-conference https://meet.google.com/abc-defg-hij
```

這會呼叫 Google Meet `spaces.endActiveConference` 並且需要針對授權帳戶可管理的空間具備 `meetings.space.created` 範圍的 OAuth。
OpenClaw 接受 Meet URL、會議代碼或 `spaces/{id}` 輸入，並在結束活躍的會議之前將其解析為 API 空間資源。
它與 `googlemeet leave` 是分開的：`leave` 會停止 OpenClaw 的本機/會話參與，而 `end-active-conference` 則是要求 Google Meet 結束該空間的活躍會議。

撰寫易讀的報告：

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

當 Google 釋出會議的資料時，`artifacts` 會傳回會議記錄中繼資料以及參與者、錄製、逐字稿、結構化逐字稿條目和智慧筆記資源中繼資料。使用 `--no-transcript-entries` 略過大型會議的條目查詢。`attendance` 會將參與者展開為參與者會話列，包含首次/最後看到時間、總會話持續時間、遲到/早退旗標，以及透過登入使用者或顯示名稱合併的重複參與者資源。傳遞 `--no-merge-duplicates` 以將原始參與者資源分開保留，傳遞 `--late-after-minutes` 以調整遲到偵測，並傳遞 `--early-before-minutes` 以調整早退偵測。

`export` 會寫入一個包含 `summary.md`、`attendance.csv`、
`transcript.md`、`artifacts.json`、`attendance.json` 和 `manifest.json` 的資料夾。
`manifest.json` 會記錄選擇的輸入、匯出選項、會議記錄、
輸出檔案、計數、Token 來源、使用時的日曆事件，以及任何
部分擷取警告。傳遞 `--zip` 以在資料夾旁邊
同時寫入可攜式壓縮檔。傳遞 `--include-doc-bodies` 以透過 Google Drive `files.export` 匯出連結的文字稿和
智慧筆記 Google Docs 文字；這需要一個包含 Drive Meet 唯讀範圍
的全新 OAuth 登入。如果沒有
`--include-doc-bodies`，匯出僅包含 Meet 中繼資料和結構化
文字稿條目。如果 Google 傳回部分元件失敗，例如智慧筆記
清單、文字稿條目或 Drive 文件內文錯誤，摘要和
清單會保留警告而不是讓整個匯出失敗。
使用 `--dry-run` 來擷取相同的元件/出席資料並列印
清單 JSON，而不建立資料夾或 ZIP。這在寫入
大型匯出之前或當 Agent 只需要計數、選定記錄和
警告時很有用。

Agent 也可以透過 `google_meet` 工具建立相同的套件：

```json
{
  "action": "export",
  "conferenceRecord": "conferenceRecords/abc123",
  "includeDocumentBodies": true,
  "outputDir": "meet-export",
  "zip": true
}
```

設定 `"dryRun": true` 以僅傳回匯出清單並跳過檔案寫入。

它們也可以使用明確的存取原則建立支援 API 的會議室：

```json
{
  "action": "create",
  "transport": "chrome-node",
  "mode": "agent",
  "accessType": "OPEN"
}
```

而且它們可以結束已知會議室的進行中會議：

```json
{
  "action": "end_active_conference",
  "meeting": "https://meet.google.com/abc-defg-hij"
}
```

對於先聽後驗證，Agent 在聲稱
會議有用之前應該使用 `test_listen`：

```json
{
  "action": "test_listen",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "timeoutMs": 30000
}
```

針對真實的保留會議執行受防護的即時冒煙測試：

```bash
OPENCLAW_LIVE_TEST=1 \
OPENCLAW_GOOGLE_MEET_LIVE_MEETING=https://meet.google.com/abc-defg-hij \
pnpm test:live -- extensions/google-meet/google-meet.live.test.ts
```

針對有人將使用 Meet 可用字幕發言的會議，執行即時先聽瀏覽器探測：

```bash
openclaw googlemeet setup --transport chrome-node --mode transcribe
openclaw googlemeet test-listen https://meet.google.com/abc-defg-hij --transport chrome-node --timeout-ms 30000
```

即時冒煙測試環境：

- `OPENCLAW_LIVE_TEST=1` 啟用受防護的即時測試。
- `OPENCLAW_GOOGLE_MEET_LIVE_MEETING` 指向保留的 Meet URL、代碼或
  `spaces/{id}`。
- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` 或 `GOOGLE_MEET_CLIENT_ID` 提供 OAuth
  用戶端 ID。
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` 或 `GOOGLE_MEET_REFRESH_TOKEN` 提供
  refresh token。
- 可選：`OPENCLAW_GOOGLE_MEET_CLIENT_SECRET`、
  `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` 和
  `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` 使用相同的後備名稱
  但不含 `OPENCLAW_` 前綴。

基本 artifact/attendance 即時煙霧測試需要
`https://www.googleapis.com/auth/meetings.space.readonly` 和
`https://www.googleapis.com/auth/meetings.conference.media.readonly`。日曆
查找需要 `https://www.googleapis.com/auth/calendar.events.readonly`。Drive
文件主體匯出需要
`https://www.googleapis.com/auth/drive.meet.readonly`。

建立一個新的 Meet 空間：

```bash
openclaw googlemeet create
```

此指令會列印新的 `meeting uri`、來源和加入會話。擁有 OAuth
憑證時，它會使用官方 Google Meet API。若無 OAuth
憑證，則會使用釘選的 Chrome 節點之已登入瀏覽器設定檔作為後備。Agent 可以
使用帶有 `action: "create"` 的 `google_meet` 工具，以單一步驟建立並加入。若僅要建立 URL，請傳入 `"join": false`。

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

如果瀏覽器後備機制在能夠建立 URL 之前遇到 Google 登入或 Meet 權限封鎖，Gateway 方法會傳回失敗回應，且
`google_meet` 工具會傳回結構化詳細資訊而非純文字字串：

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

當 Agent 看到 `manualActionRequired: true` 時，應該回報
`manualActionMessage` 以及瀏覽器節點/分頁內容，並停止開啟新的
Meet 分頁，直到操作員完成瀏覽器步驟為止。

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
專案、OAuth 主體和會議參與者已註冊 Google
Workspace 開發人員預覽計畫以使用 Meet 媒體 API 後，才設定 `preview.enrollmentAcknowledged: true`。

## Config

常見的 Chrome 代理路徑只需要啟用插件、BlackHole、SoX、即時轉錄提供者金鑰，以及設定的 OpenClaw TTS 提供者。
OpenAI 是預設的轉錄提供者；將 `realtime.voiceProvider` 設定為
`"google"` 並將 `realtime.model` 設定為 `bidi`，即可使用 Google Gemini Live 作為 `bidi` 模式
而無需變更預設的代理模式轉錄提供者：

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# or
export GEMINI_API_KEY=...
```

在 `plugins.entries.google-meet.config` 下設定插件配置：

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
- `defaultMode: "agent"`（`"realtime"` 僅作為 `"agent"` 的舊版
  相容性別名被接受；新的工具呼叫應使用 `"agent"`）
- `chromeNode.node`：`chrome-node` 的選用節點 ID/名稱/IP
- `chrome.audioBackend: "blackhole-2ch"`
- `chrome.guestName: "OpenClaw Agent"`：在未登入的 Meet 訪客
  畫面上使用的名稱
- `chrome.autoJoin: true`：透過 `chrome-node` 上的 OpenClaw 瀏覽器自動化，盡力填寫訪客名稱並點擊「立即加入」
- `chrome.reuseExistingTab: true`：啟用現有的 Meet 分頁，而不是
  開啟重複項目
- `chrome.waitForInCallMs: 20000`：在觸發對話簡介之前，等待 Meet 分頁回報
  已在通話中
- `chrome.audioFormat: "pcm16-24khz"`：指令對音訊格式。僅對
  仍輸出電話音訊的舊版/自訂指令對使用 `"g711-ulaw-8khz"`。
- `chrome.audioBufferBytes: 4096`：產生的 Chrome
  指令對音訊指令的 SoX 處理緩衝區。這是 SoX 預設 8192 位元組緩衝區的一半，
  可減少預設管線延遲，同時保留在繁忙主機上提高它的空間。
  低於 SoX 最小值的數值會被限制為 17 位元組。
- `chrome.audioInputCommand`：從 CoreAudio `BlackHole 2ch`
  讀取並以 `chrome.audioFormat` 寫入音訊的 SoX 指令
- `chrome.audioOutputCommand`：以 `chrome.audioFormat`
  讀取音訊並寫入 CoreAudio `BlackHole 2ch` 的 SoX 指令
- `chrome.bargeInInputCommand`：可選的本機麥克風指令，可在助理播放期間寫入帶符號的 16 位元小端序單聲道 PCM，以進行人員插話偵測。這目前適用於 Gateway 託管的 `chrome` 指令對橋接器。
- `chrome.bargeInRmsThreshold: 650`：在 `chrome.bargeInInputCommand` 上視為人員插話的 RMS 層級
- `chrome.bargeInPeakThreshold: 2500`：在 `chrome.bargeInInputCommand` 上視為人員插話的峰值層級
- `chrome.bargeInCooldownMs: 900`：重複清除人員插話之間的最小延遲
- `mode: "agent"`：預設的交談回應模式。參與者的語音由設定的即時轉錄提供者轉錄，在每次會議的子代理程式階段中傳送至設定的 OpenClaw 代理程式，並透過正常的 OpenClaw TTS 執行時期語音播放回傳。
- `mode: "bidi"`：後備直接雙向即時模型模式。即時語音提供者直接回答參與者語音，並可能呼叫 `openclaw_agent_consult` 以取得更深入/工具支援的答案。
- `mode: "transcribe"`：僅觀察模式，不包含交談回應橋接器。
- `realtime.provider: "openai"`：當下列範圍提供者欄位未設定時使用的相容性後援。
- `realtime.transcriptionProvider: "openai"`：由 `agent` 模式用於即時轉錄的提供者 ID。
- `realtime.voiceProvider`：由 `bidi` 模式用於直接即時語音的提供者 ID。將此設定為 `"google"` 以使用 Gemini Live，同時將代理程式模式轉錄保持在 OpenAI 上。
- `realtime.toolPolicy: "safe-read-only"`
- `realtime.instructions`：簡短的口頭回覆，並搭配 `openclaw_agent_consult` 以取得更深入的答案
- `realtime.introMessage`：當即時橋接器連線時的簡短口頭就緒檢查；將其設定為 `""` 以靜音加入
- `realtime.agentId`：`openclaw_agent_consult` 的可選 OpenClaw 代理程式 ID；預設為 `main`

可選的覆寫：

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
    bargeInInputCommand: ["sox", "-q", "-t", "coreaudio", "External Microphone", "-r", "24000", "-c", "1", "-b", "16", "-e", "signed-integer", "-t", "raw", "-"],
  },
  chromeNode: {
    node: "parallels-macos",
  },
  defaultMode: "agent",
  realtime: {
    provider: "openai",
    transcriptionProvider: "openai",
    voiceProvider: "google",
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    agentId: "jay",
    toolPolicy: "owner",
    introMessage: "Say exactly: I'm here.",
    providers: {
      google: {
        voice: "Kore",
      },
    },
  },
}
```

用於代理程式模式監聽和語音播放的 ElevenLabs：

```json5
{
  messages: {
    tts: {
      provider: "elevenlabs",
      providers: {
        elevenlabs: {
          modelId: "eleven_v3",
          voiceId: "pMsXgVXv3BLzUgSXRplE",
        },
      },
    },
  },
  plugins: {
    entries: {
      "google-meet": {
        config: {
          realtime: {
            transcriptionProvider: "elevenlabs",
            providers: {
              elevenlabs: {
                modelId: "scribe_v2_realtime",
                audioFormat: "ulaw_8000",
                sampleRate: 8000,
                commitStrategy: "vad",
              },
            },
          },
        },
      },
    },
  },
}
```

持續的 Meet 語音來自
`messages.tts.providers.elevenlabs.voiceId`。當啟用 TTS 模型
覆寫時，Agent 回覆也可以使用
每次回覆的 `[[tts:voiceId=... model=eleven_v3]]` 指令，但對於會議而言，組態是確定性預設值。
加入時，日誌應顯示 `transcriptionProvider=elevenlabs`，且每個
口語回覆應記錄 `provider=elevenlabs model=eleven_v3 voice=<voiceId>`。

僅限 Twilio 的組態：

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

`voiceCall.enabled` 預設為 `true`；使用 Twilio 傳輸時，它會將
實際的 PSTN 通話、DTMF 和開場問候委派給 Voice Call 外掛程式。Voice Call
會在開啟即時媒體串流之前播放 DTMF 序列，然後使用
儲存的開場文字作為初始即時問候。如果未
啟用 `voice-call`，Google Meet 仍然可以驗證並記錄撥號計畫，但無法
撥打 Twilio 通話。

## 工具

Agent 可以使用 `google_meet` 工具：

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "agent"
}
```

當 Chrome 在 Gateway 主機上執行時，請使用 `transport: "chrome"`。當 Chrome 在配對節點（例如 Parallels
VM）上執行時，請使用 `transport: "chrome-node"`。在這兩種情況下，模型提供者和 `openclaw_agent_consult` 都在
Gateway 主機上執行，因此模型憑證會保留在那裡。使用預設的 `mode: "agent"`
時，即時轉錄提供者會處理聆聽，設定的 OpenClaw
agent 會產生答案，而一般的 OpenClaw TTS 會將其說入 Meet。當您希望即時語音模型直接回答時，請使用
`mode: "bidi"`。
原始 `mode: "realtime"` 作為 `mode: "agent"` 的舊版相容性別名
仍被接受，但在 agent 工具架構中不再顯示。
Agent 模式日誌包括在橋接器
啟動時解析的轉錄提供者/模型，以及每次
合成回覆後的 TTS 提供者、模型、語音、輸出格式和取樣率。

使用 `action: "status"` 列出作用中的會話或檢查會話 ID。使用 `action: "speak"` 搭配 `sessionId` 和 `message` 讓即時代理程式立即說話。使用 `action: "test_speech"` 建立或重用會話、觸發已知片語，並在 Chrome 主機能回報時傳回 `inCall` 健康狀態。`test_speech` 總是強制執行 `mode: "agent"`，如果被要求以 `mode: "transcribe"` 執行則會失敗，因為僅觀察會話刻意無法發出語音。其 `speechOutputVerified` 結果是基於此測試通話期間即時音訊輸出位元組的增加，因此具有較舊音訊的重用會話不算是一次全新的成功語音檢查。使用 `action: "leave"` 將會話標記為已結束。

`status` 在可用時包含 Chrome 健康狀態：

- `inCall`：Chrome 似乎在 Meet 通話中
- `micMuted`：盡力而為的 Meet 麥克風狀態
- `manualActionRequired` / `manualActionReason` / `manualActionMessage`：瀏覽器設定檔需要手動登入、Meet 主機准許、權限或瀏覽器控制修復，語音才能運作
- `speechReady` / `speechBlockedReason` / `speechBlockedMessage`：目前是否允許受控 Chrome 語音。`speechReady: false` 表示 OpenClaw 未將介紹/測試片語傳送到音訊橋接器。
- `providerConnected` / `realtimeReady`：即時語音橋接器狀態
- `lastInputAt` / `lastOutputAt`：從橋接器看到或傳送至橋接器的最後音訊
- `audioOutputRouted` / `audioOutputDeviceLabel`：Meet 分頁的媒體輸出是否主動路由至橋接器使用的 BlackHole 裝置
- `lastSuppressedInputAt` / `suppressedInputBytes`：助理播放作用時會忽略迴路輸入

```json
{
  "action": "speak",
  "sessionId": "meet_...",
  "message": "Say exactly: I'm here and listening."
}
```

## Agent 和 bidi 模式

Chrome `agent` 模式已針對「我的代理程式在會議中」的行為進行最佳化。即時文字轉錄提供者會聽取會議音訊，最終的參與者文字轉錄會透過設定的 OpenClaw 代理程式路由，而答案則透過標準的 OpenClaw TTS 執行時期播出。當您希望即時語音模型直接回答時，請設定 `mode: "bidi"`。在諮詢之前，相鄰的最終文字轉錄片段會被合併，因此一次發言回合不會產生數個陳舊的部分答案。當佇列中的助理音訊仍在播放時，即時輸入也會被抑制，並且在代理程式諮詢之前會忽略近期的類似助理文字轉錄回音，因此 BlackHole 迴授不會導致代理程式回答自己的語音。

| 模式    | 誰決定答案                 | 語音輸出路徑               | 使用時機                             |
| ------- | -------------------------- | -------------------------- | ------------------------------------ |
| `agent` | 已設定的 OpenClaw 代理程式 | 標準 OpenClaw TTS 執行時期 | 您希望「我的代理程式在會議中」的行為 |
| `bidi`  | 即時語音模型               | 即時語音提供者音訊回應     | 您想要最低延遲的對話語音迴圈         |

在 `bidi` 模式下，當即時模型需要更深入的推理、最新資訊或標準 OpenClaw 工具時，它可以呼叫 `openclaw_agent_consult`。

諮詢工具會在幕後使用近期的會議文字轉錄內容執行標準的 OpenClaw 代理程式，並傳回簡明的口語答案。在 `agent` 模式下，OpenClaw 會直接將該答案傳送至 TTS 執行時期；在 `bidi` 模式下，即時語音模型可以將諮詢結果口述回會議中。它使用與語音通話相同的共用諮詢機制。

根據預設，諮詢是針對 `main` 代理程式執行。當 Meet 通道應諮詢專屬的 OpenClaw 代理程式工作區、模型預設值、工具原則、記憶體和會議記錄時，請設定 `realtime.agentId`。

代理程式模式諮詢使用每個會議的 `agent:<id>:subagent:google-meet:<session>`
會議金鑰，因此後續問題會保留會議內容，同時繼承已設定代理程式的標準代理程式原則。

`realtime.toolPolicy` 控制諮詢執行：

- `safe-read-only`: 公開 consult 工具並將常規代理限制為
  `read`、`web_search`、`web_fetch`、`x_search`、`memory_search` 和
  `memory_get`。
- `owner`: 公開 consult 工具並允許常規代理使用正常的
  代理工具原則。
- `none`: 不要向即時語音模型公開 consult 工具。

Consult 會話金鑰的範圍是以 Meet 會話為單位，因此在同一會議中的後續 consult 呼叫
可以重用先前的 consult 上下文。

若要在 Chrome 完全加入通話後強制進行語音就緒檢查：

```bash
openclaw googlemeet speak meet_... "Say exactly: I'm here and listening."
```

針對完整的加入並發聲測試：

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "Say exactly: I'm here and listening."
```

## 即時測試檢查清單

在將會議移交給無人值守的代理之前，請使用此順序：

```bash
openclaw googlemeet setup
openclaw nodes status
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "Say exactly: Google Meet speech test complete."
```

預期的 Chrome 節點狀態：

- `googlemeet setup` 皆為綠色。
- 當 Chrome 節點是
  預設傳輸或釘選了某個節點時，`googlemeet setup` 包含 `chrome-node-connected`。
- `nodes status` 顯示所選節點已連線。
- 所選節點會同時廣播 `googlemeet.chrome` 和 `browser.proxy`。
- Meet 分頁加入通話，且 `test-speech` 傳回帶有
  `inCall: true` 的 Chrome 健康狀態。

對於遠端 Chrome 主機（例如 Parallels macOS VM），這是在更新 Gateway 或 VM 後
最簡短的安全檢查方式：

```bash
openclaw googlemeet setup
openclaw nodes status --connected
openclaw nodes invoke \
  --node parallels-macos \
  --command googlemeet.chrome \
  --params '{"action":"setup"}'
```

這證明了 Gateway 外掛程式已載入、VM 節點已使用目前的權杖連線，
且在代理開啟真實會議分頁之前，Meet 音訊橋接器已可用。

若要進行 Twilio 測試，請使用公開電話撥入詳細資訊的會議：

```bash
openclaw googlemeet setup
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

預期的 Twilio 狀態：

- `googlemeet setup` 包含綠色的 `twilio-voice-call-plugin`、
  `twilio-voice-call-credentials` 和 `twilio-voice-call-webhook` 檢查。
- Gateway 重新載入後，`voicecall` 可在 CLI 中使用。
- 傳回的會話具有 `transport: "twilio"` 和 `twilio.voiceCallId`。
- `openclaw logs --follow` 顯示在即時 TwiML 之前提供的 DTMF TwiML，然後是
  排有初始問候語的即時橋接器。
- `googlemeet leave <sessionId>` 掛起委派的語音通話。

## 疑難排解

### Agent 看不到 Google Meet 工具

請確認外掛程式已在 Gateway 設定中啟用，並重新載入 Gateway：

```bash
openclaw plugins list | grep google-meet
openclaw googlemeet setup
```

如果您剛剛編輯了 `plugins.entries.google-meet`，請重新啟動或重新載入 Gateway。
執行中的 Agent 只能看到由目前 Gateway 程序註冊的外掛工具。

在非 macOS Gateway 主機上，面對 Agent 的 `google_meet` 工具會保持可見，
但在本機 Chrome 語音回傳動作到達音訊橋接器之前會被封鎖。
本機 Chrome 語音回傳音訊目前依賴 macOS `BlackHole 2ch`，因此
Linux Agent 應使用 `mode: "transcribe"`、Tw撥入或 macOS
`chrome-node` 主機，而不是預設的本機 Agent 路徑。

### 沒有已連接的支援 Google Meet 的節點

在節點主機上，執行：

```bash
openclaw plugins enable google-meet
openclaw plugins enable browser
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

在 Gateway 主機上，批准節點並驗證指令：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

節點必須已連接並列出 `googlemeet.chrome` 和 `browser.proxy`。
Gateway 設定必須允許這些節點指令：

```json5
{
  gateway: {
    nodes: {
      allowCommands: ["browser.proxy", "googlemeet.chrome"],
    },
  },
}
```

如果 `googlemeet setup` 失敗 `chrome-node-connected` 或 Gateway 日誌報告
`gateway token mismatch`，請使用目前的 Gateway
token 重新安裝或重新啟動節點。對於 LAN Gateway，這通常意味著：

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

### 瀏覽器已開啟但 Agent 無法加入

針對僅觀察加入執行 `googlemeet test-listen`，或針對即時加入執行 `googlemeet test-speech`，
然後檢查傳回的 Chrome 健康狀態。如果任一探測報告
`manualActionRequired: true`，請向操作員顯示 `manualActionMessage`
並停止重試，直到瀏覽器動作完成。

常見的手動動作：

- 登入 Chrome 設定檔。
- 從 Meet 主機帳戶允許訪客進入。
- 當出現 Chrome 原生權限提示時，授予 Chrome 麥克風/相機權限。
- 關閉或修復卡住的 Meet 權限對話方塊。

不要僅因為 Meet 顯示「您是否要讓會議中的其他人聽到您的聲音？」就回報「未登入」。那是 Meet 的音訊選擇插頁；當可用時，OpenClaw 會透過瀏覽器自動化點擊 **使用麥克風**，並持續等待真正的會議狀態。對於僅限建立的瀏覽器後備方案，OpenClaw 可能會點擊 **不使用麥克風繼續**，因為建立 URL 並不需要即時音訊路徑。

### 會議建立失敗

當設定 OAuth 憑證時，`googlemeet create` 會先使用 Google Meet API 的 `spaces.create` 端點。如果沒有 OAuth 憑證，它會退回到固定的 Chrome 節點瀏覽器。請確認：

- 對於 API 建立：已設定 `oauth.clientId` 和 `oauth.refreshToken`，或存在相符的 `OPENCLAW_GOOGLE_MEET_*` 環境變數。
- 對於 API 建立：重新整理權杖是在新增建立支援後才產生的。較舊的權杖可能缺少 `meetings.space.created` 範圍；請重新執行 `openclaw googlemeet auth login --json` 並更新外掛程式設定。
- 對於瀏覽器後備方案：`defaultTransport: "chrome-node"` 和 `chromeNode.node` 指向一個具備 `browser.proxy` 和 `googlemeet.chrome` 的已連線節點。
- 對於瀏覽器後備方案：該節點上的 OpenClaw Chrome 設定檔已登入 Google，並能開啟 `https://meet.google.com/new`。
- 對於瀏覽器後備方案：重試時會在開啟新分頁之前重複使用現有的 `https://meet.google.com/new` 或 Google 帳號提示分頁。如果代理程式逾時，請重試工具呼叫，而不是手動開啟另一個 Meet 分頁。
- 對於瀏覽器後備方案：如果工具回傳 `manualActionRequired: true`，請使用回傳的 `browser.nodeId`、`browser.targetId`、`browserUrl` 和 `manualActionMessage` 來引導操作員。在該動作完成前，請勿在迴圈中重試。
- 對於瀏覽器後備方案：如果 Meet 顯示「您是否要讓會議中的其他人聽到您的聲音？」，請保持分頁開啟。OpenClaw 應透過瀏覽器自動化點擊 **使用麥克風** 或對於僅建立連線後備方案點擊 **不使用麥克風繼續**，並繼續等待生成的 Meet URL。如果無法執行此操作，錯誤應提及 `meet-audio-choice-required`，而非 `google-login-required`。

### Agent 已加入但無法發言

檢查即時路徑：

```bash
openclaw googlemeet setup
openclaw googlemeet doctor
```

使用 `mode: "agent"` 進行正常的 STT -> OpenClaw agent -> TTS 對話路徑，或使用 `mode: "bidi"` 進行直接即時語音後備方案。`mode: "transcribe"` 故意不啟動對話橋接器。若要進行僅觀察的除錯，請在參與者發言後執行 `openclaw googlemeet status --json <session-id>` 並檢查 `captioning`、`transcriptLines` 和 `lastCaptionText`。如果 `inCall` 為 true 但 `transcriptLines` 保持為 `0`，則 Meet 字幕可能已停用、自安裝觀察器後無人發言、Meet UI 已變更，或會議語言/帳戶無法使用即時字幕。

`googlemeet test-speech` 總是會檢查即時路徑並報告該次呼叫是否觀察到橋接器輸出位元組。如果 `speechOutputVerified` 為 false 且 `speechOutputTimedOut` 為 true，則即時提供者可能已接受該發話，但 OpenClaw 未看到新的輸出位元組到達 Chrome 音訊橋接器。

同時也請驗證：

- Gateway 主機上有可用的即時提供者金鑰，例如 `OPENAI_API_KEY` 或 `GEMINI_API_KEY`。
- Chrome 主機上可看見 `BlackHole 2ch`。
- Chrome 主機上存在 `sox`。
- Meet 麥克風和揚聲器已透過 OpenClaw 使用的虛擬音訊路徑進行路由。對於本機 Chrome 即時加入，`doctor` 應顯示 `meet output routed: yes`。

`googlemeet doctor [session-id]` 會列印會話、節點、通話中狀態、
手動操作原因、即時提供者連線、`realtimeReady`、音訊
輸入/輸出活動、最後音訊時間戳記、位元組計數器，以及瀏覽器 URL。
當您需要原始 JSON 時，請使用 `googlemeet status [session-id] --json`。當您需要在不
暴露 Token 的情況下驗證 Google Meet OAuth 重新整理時，請使用
`googlemeet doctor --oauth`；當您同時需要 Google Meet API 證明時，請新增
`--meeting` 或 `--create-space`。

如果代理逾時且您可以看到已開啟的 Meet 分頁，請檢查該分頁
而不要開啟另一個：

```bash
openclaw googlemeet recover-tab
openclaw googlemeet recover-tab https://meet.google.com/abc-defg-hij
```

對等的工具動作是 `recover_current_tab`。它會聚焦並檢查所選傳輸的
現有 Meet 分頁。使用 `chrome` 時，它會透過 Gateway 使用本機
瀏覽器控制；使用 `chrome-node` 時，它會使用設定的
Chrome 節點。它不會開啟新分頁或建立新會話；它會回報
目前的阻礙因素，例如登入、准許、權限或音訊選擇狀態。
CLI 指令會與設定的 Gateway 通訊，因此 Gateway 必須正在執行；
`chrome-node` 也需要 Chrome 節點已連線。

### Twilio 設定檢查失敗

當 `voice-call` 不被允許或未啟用時，
`twilio-voice-call-plugin` 會失敗。
將其新增至 `plugins.allow`，啟用 `plugins.entries.voice-call`，並重新載入
Gateway。

當 Twilio 後端缺少帳戶
SID、驗證 Token 或來電者號碼時，`twilio-voice-call-credentials` 會失敗。請在 Gateway 主機上設定這些項目：

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
```

當 `voice-call` 沒有公開 webhook
暴露，或當 `publicUrl` 指向回環或私人網路空間時，
`twilio-voice-call-webhook` 會失敗。
將 `plugins.entries.voice-call.config.publicUrl` 設定為公開提供者 URL 或
設定 `voice-call` 隧道/Tailscale 暴露。

Loopback 和私人 URL 對於承載商回調無效。請勿使用
`localhost`、`127.0.0.1`、`0.0.0.0`、`10.x`、`172.16.x`-`172.31.x`、
`192.168.x`、`169.254.x`、`fc00::/7` 或 `fd00::/8` 作為 `publicUrl`。

若要取得穩定的公開 URL：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          fromNumber: "+15550001234",
          publicUrl: "https://voice.example.com/voice/webhook",
        },
      },
    },
  },
}
```

對於本機開發，請使用通道或 Tailscale 暴露代替私人主機 URL：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tunnel: { provider: "ngrok" },
          // or
          tailscale: { mode: "funnel", path: "/voice/webhook" },
        },
      },
    },
  },
}
```

然後重新啟動或重新載入 Gateway 並執行：

```bash
openclaw googlemeet setup --transport twilio
openclaw voicecall setup
openclaw voicecall smoke
```

`voicecall smoke` 預設僅檢查就緒狀態。若要對特定號碼進行試執行：

```bash
openclaw voicecall smoke --to "+15555550123"
```

僅當您有意進行實際的撥出通知通話時，才新增 `--yes`：

```bash
openclaw voicecall smoke --to "+15555550123" --yes
```

### Twilio 通話已啟動但從未進入會議

確認 Meet 事件公開了電話撥入詳細資訊。傳入確切的撥入號碼和 PIN 或自訂 DTMF 序列：

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

如果供應商在輸入 PIN 之前需要暫停，請在 `--dtmf-sequence` 中使用前導 `w` 或逗號。

如果電話通話已建立，但 Meet 名單從未顯示撥入參與者：

- 執行 `openclaw googlemeet doctor <session-id>` 以確認委派的 Twilio
  通話 ID、是否已將 DTMF 排入佇列，以及是否請求了介紹問候語。
- 執行 `openclaw voicecall status --call-id <id>` 並確認通話仍
  為作用中狀態。
- 執行 `openclaw voicecall tail` 並檢查 Twilio webhook 是否正到達 Gateway。
- 執行 `openclaw logs --follow` 並尋找 Twilio Meet 序列：Google
  Meet 委派加入，Voice Call 儲存並提供連線前 DTMF TwiML，
  Voice Call 提供 Twilio 通話的即時 TwiML，然後 Google Meet 使用 `voicecall.speak` 請求介紹語音。
- 重新執行 `openclaw googlemeet setup --transport twilio`；綠色的設定檢查是
  必要的，但並不能證明會議 PIN 序列是正確的。
- 確認撥入號碼屬於與 PIN 相同的 Meet 邀請和區域。
- 如果 Meet 回應緩慢，或在傳送連線前 DTMF 後通話逐字稿仍顯示提示輸入 PIN，請從 12 秒的預設值增加 `voiceCall.dtmfDelayMs`。
- 如果參與者已加入但您聽不到問候語，請檢查 `openclaw logs --follow` 中的 DTMF 後的 `voicecall.speak` 請求，以及媒體流 TTS 播放或 Twilio `<Say>` 備用方案。如果通話文字記錄仍包含「enter the meeting PIN」，表示通話分支尚未加入 Meet 會議室，因此會議參與者將聽不到語音。

如果未收到 webhook，請先偵錯 Voice Call 外掛：提供者必須能夠連接到 `plugins.entries.voice-call.config.publicUrl` 或設定的通道。請參閱 [Voice call troubleshooting](/zh-Hant/plugins/voice-call#troubleshooting)。

## 備註

Google Meet 的官方媒體 API 是以接收為導向，因此要在 Meet 通話中發言仍需要參與者路徑。此外掛讓該邊界保持可見：Chrome 處理瀏覽器參與和本機音訊路由；Twilio 處理電話撥入參與。

Chrome 對講模式需要 `BlackHole 2ch` 加上以下任一項：

- `chrome.audioInputCommand` 加上 `chrome.audioOutputCommand`：OpenClaw 擁有橋接器，並在這些指令與選定的提供者之間以 `chrome.audioFormat` 傳輸音訊。Agent 模式使用即時轉錄加上一般 TTS；bidi 模式使用即時語音提供者。預設的 Chrome 路徑是 24 kHz PCM16 搭配 `chrome.audioBufferBytes: 4096`；8 kHz G.711 mu-law 仍可用於舊版指令對。
- `chrome.audioBridgeCommand`：外部橋接指令擁有整個本機音訊路徑，且必須在啟動或驗證其常駐程式後退出。這僅對 `bidi` 有效，因為 `agent` 模式需要直接的指令對存取權才能進行 TTS。

當代理程式在代理程式模式下呼叫 `google_meet` 工具時，會議顧問會話會在回應參與者語音之前，分岔出呼叫者目前的文字記錄。Meet 會話仍保持分離 (`agent:<agentId>:subagent:google-meet:<sessionId>`)，因此會議後續追蹤不會直接變更呼叫者的文字記錄。

為了獲得乾淨的全雙工音訊，請將 Meet 輸出和 Meet 麥克風路由通過獨立的虛擬裝置或 Loopback 風格的虛擬裝置圖形。單一共享的 BlackHole 裝置可能會將其他參與者的聲音回傳到通話中。

透過指令對配的 Chrome 橋接器，`chrome.bargeInInputCommand` 可以監聽獨立的本地麥克風，並在人類開始說話時清除助理播放內容。即使共享的 BlackHole 迴送輸入在助理播放期間被暫時抑制，這也能讓人類的語音優先於助理的輸出。就像 `chrome.audioInputCommand` 和 `chrome.audioOutputCommand` 一樣，這是一個由操作員配置的本地指令。請使用明確的受信任指令路徑或參數列表，不要將其指向來自不受信任位置的腳本。

`googlemeet speak` 會觸發 Chrome 工作階段的主動對講音訊橋接器。`googlemeet leave` 則會停止該橋接器。對於透過 Voice Call 外掛程式委派的 Twilio 工作階段，`leave` 也會掛斷底層的語音通話。當您想要關閉 API 管理空間中的現行 Google Meet 會議時，請使用 `googlemeet end-active-conference`。

## 相關

- [Voice call plugin](/zh-Hant/plugins/voice-call)
- [Talk mode](/zh-Hant/nodes/talk)
- [Building plugins](/zh-Hant/plugins/building-plugins)
