---
summary: "Talk mode：跨本機 STT/TTS 和即時語音的連續語音對話"
read_when:
  - Implementing Talk mode on macOS/iOS/Android
  - Changing voice/TTS/interrupt behavior
title: "Talk 模式"
---

Talk mode 有兩種執行時形態：

- 原生 macOS/iOS/Android Talk 使用本機語音辨識、Gateway 聊天和 `talk.speak` TTS。節點會廣播 `talk` 功能並宣告它們支援的 `talk.*` 指令。
- 瀏覽器 Talk 使用 `talk.client.create` 進行用戶端擁有的 `webrtc` 和 `provider-websocket` 工作階段，或是使用 `talk.session.create` 進行 Gateway 擁有的 `gateway-relay` 工作階段。`managed-room` 是保留給 Gateway 移交和對講機房間使用的。
- Android Talk 可以選擇使用 `talk.realtime.mode: "realtime"` 和 `talk.realtime.transport: "gateway-relay"` 來參與 Gateway 所有的即時轉發會話。否則，它會繼續使用原生語音辨識、Gateway 聊天和 `talk.speak`。
- 僅轉錄客戶端在需要字幕或聽寫而不需要助理語音回應時，會使用 `talk.session.create({ mode: "transcription", transport: "gateway-relay", brain: "none" })`，然後使用 `talk.session.appendAudio`、`talk.session.cancelTurn` 和 `talk.session.close`。

原生 Talk 是一個連續的語音對話迴圈：

1. 聆聽語音
2. 透過啟用的會話將文字記錄發送給模型
3. 等待回應
4. 透過設定的 Talk 提供者 (`talk.speak`) 播放語音

瀏覽器即時 Talk 透過 `talk.client.toolCall` 轉送供應商工具呼叫；瀏覽器客戶端不會直接呼叫 `chat.send` 進行即時諮詢。
當即時諮詢處於活動狀態時，Talk 客戶端可以使用 `talk.client.steer` 或
`talk.session.steer` 將口語輸入分類為 `status`、`steer`、`cancel` 或
`followup`。接受的引導會排入活動的嵌入執行；被拒絕的
引導會傳回結構化的理由，例如 `no_active_run`、`not_streaming`
或 `compacting`。

僅轉錄 Talk 發出與即時和 STT/TTS 會話相同的通用 Talk 事件封包，但使用 `mode: "transcription"` 和 `brain: "none"`。它用於字幕、聽寫和僅觀察的語音擷取；一次性上傳的語音備忘錄仍使用 media/audio 路徑。

## 行為

- 啟用 Talk 模式時**始終顯示覆蓋層**。
- **聆聽 → 思考 → 說話** 階段轉換。
- 在**短暫暫停**（靜音視窗）時，發送當前的文字記錄。
- 回覆會**寫入 WebChat**（與輸入相同）。
- **語音中斷**（預設開啟）：如果使用者在助理說話時開始說話，我們會停止播放並記錄中斷時間戳記以供下一個提示使用。

## 回覆中的語音指令

助理可以在其回覆前加上**單行 JSON** 來控制語音：

```json
{ "voice": "<voice-id>", "once": true }
```

規則：

- 僅限第一個非空行。
- 未知的金鑰會被忽略。
- `once: true` 僅套用於目前的回覆。
- 若沒有 `once`，該語音將成為 Talk 模式的新預設值。
- JSON 行會在 TTS 播放前被移除。

支援的金鑰：

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`, `rate` (WPM), `stability`, `similarity`, `style`, `speakerBoost`
- `seed`, `normalize`, `lang`, `output_format`, `latency_tier`
- `once`

## Config (`~/.openclaw/openclaw.json`)

```json5
{
  talk: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "elevenlabs_voice_id",
        modelId: "eleven_v3",
        outputFormat: "mp3_44100_128",
        apiKey: "elevenlabs_api_key",
      },
      mlx: {
        modelId: "mlx-community/Soprano-80M-bf16",
      },
      system: {},
    },
    speechLocale: "ru-RU",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
    realtime: {
      provider: "openai",
      providers: {
        openai: {
          apiKey: "openai_api_key",
          model: "gpt-realtime-2",
          voice: "cedar",
        },
      },
      instructions: "Speak warmly and keep answers brief.",
      mode: "realtime",
      transport: "webrtc",
      brain: "agent-consult",
    },
  },
}
```

預設值：

- `interruptOnSpeech`: true
- `silenceTimeoutMs`: 若未設定，Talk 會保留傳送轉錄文字前的平台預設暫停視窗 (`700 ms on macOS and Android, 900 ms on iOS`)
- `provider`: 選取活動的 Talk 提供者。針對 macOS 本機播放路徑，請使用 `elevenlabs`、`mlx` 或 `system`。
- `providers.<provider>.voiceId`：如果可使用 API 金鑰，則會回退至 ElevenLabs 的 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`（或第一個 ElevenLabs 語音）。
- `providers.elevenlabs.modelId`：未設定時預設為 `eleven_v3`。
- `providers.mlx.modelId`：未設定時預設為 `mlx-community/Soprano-80M-bf16`。
- `providers.elevenlabs.apiKey`：回退至 `ELEVENLABS_API_KEY`（如果可用，則為 Gateway shell 設定檔）。
- `consultThinkingLevel`：在即時 `openclaw_agent_consult` 呼叫後方執行的完整 OpenClaw 代理程式之選用思考層級覆寫。
- `consultFastMode`：即時 `openclaw_agent_consult` 呼叫的選用快速模式覆寫。
- `realtime.provider`：選取作用中的瀏覽器/伺服器即時語音供應商。對 WebRTC 使用 `openai`，對供應商 WebSocket 使用 `google`，或透過 Gateway 中繼使用僅橋接的供應商。
- `realtime.providers.<provider>` 儲存供應商擁有的即時設定。瀏覽器僅接收暫時性或受限的會話憑證，絕不接收標準 API 金鑰。
- `realtime.providers.openai.voice`：內建的 OpenAI Realtime 語音 ID。目前的 `gpt-realtime-2` 語音為 `alloy`、`ash`、`ballad`、`coral`、`echo`、`sage`、`shimmer`、`verse`、`marin` 和 `cedar`；建議使用 `marin` 和 `cedar` 以獲得最佳品質。
- `realtime.transport`：`webrtc` 和 `provider-websocket` 是瀏覽器即時傳輸。只有當此設定為 `gateway-relay` 時，Android 才會使用即時中繼；否則 Android Talk 會使用其原生的 STT/TTS 迴圈。
- `realtime.brain`：`agent-consult` 透過 Gateway 策略路由即時工具呼叫；`direct-tools` 是舊版直接工具相容性行為；`none` 用於轉錄或外部協調。
- `realtime.consultRouting`：`provider-direct` 在跳過 `openclaw_agent_consult` 時保留提供者的直接回覆；`force-agent-consult` 讓 Gateway 中繼將最終用戶轉錄透過 OpenClaw 路由。
- `realtime.instructions`：將提供者面向的系統指令附加至 OpenClaw 內建的即時提示。使用它來設定語音風格和語氣；OpenClaw 保留預設的 `openclaw_agent_consult` 指引。
- `talk.catalog` 公開每個提供者的有效模式、傳輸、大腦策略、即時音訊格式和能力標誌，以便第一方 Talk 用戶端可以避免不支援的組合。
- 串流轉錄提供者是透過 `talk.catalog.transcription` 發現的。目前的 Gateway 中繼使用語音通話串流提供者設定，直到新增專用的 Talk 轉錄設定介面為止。
- `speechLocale`：iOS/macOS 上裝置端 Talk 語音辨識的可選 BCP 47 地區 ID。保留未設定以使用裝置預設值。
- `outputFormat`：在 macOS/iOS 上預設為 `pcm_44100`，在 Android 上預設為 `pcm_24000`（設定 `mp3_*` 以強制 MP3 串流）

## macOS UI

- 功能表列切換：**Talk**
- 設定分頁：**Talk Mode** 群組（語音 ID + 中斷切換）
- 覆蓋層：
  - **Listening**：雲端隨麥克風音量脈動
  - **Thinking**：下沉動畫
  - **Speaking**：發散環
  - 點擊雲端：停止說話
  - 點擊 X：退出 Talk 模式

## Android UI

- 語音分頁切換：**Talk**
- 手動 **Mic** 和 **Talk** 是互斥的執行時間擷取模式。
- 當應用程式離開前景或用戶離開語音分頁時，手動 Mic 會停止。
- Talk 模式會持續運行，直到切換關閉或 Android 節點中斷連線，並在活動時使用 Android 的麥克風前景服務類型。

## 備註

- 需要語音 + 麥克風權限。
- 原生 Talk 使用主動的 Gateway 會話，並且僅在無法取得回應事件時才會退回到輪詢歷史記錄。
- 瀏覽器即時 Talk 使用 `talk.client.toolCall` 來進行 `openclaw_agent_consult`，而不是將 `chat.send` 暴露給提供者擁有的瀏覽器會話。
- 僅轉錄的 Talk 使用 `talk.session.create`、`talk.session.appendAudio`、`talk.session.cancelTurn` 和 `talk.session.close`；客戶端會訂閱 `talk.event` 以取得部分/最終的轉錄更新。
- Gateway 使用主動的 Talk 提供者透過 `talk.speak` 來處理 Talk 的播放。Android 僅在該 RPC 不可用時才會退回到本機系統 TTS。
- macOS 本機 MLX 播放會在存在時使用內建的 `openclaw-mlx-tts` 協助程式，或者使用 `PATH` 上的可執行檔。在開發期間，設定 `OPENCLAW_MLX_TTS_BIN` 以指向自訂的協助程式二進位檔。
- `eleven_v3` 的 `stability` 會被驗證為 `0.0`、`0.5` 或 `1.0`；其他模型則接受 `0..1`。
- `latency_tier` 在設定時會被驗證為 `0..4`。
- Android 支援 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 輸出格式，用於低延遲的 AudioTrack 串流。

## 相關

- [語音喚醒](/zh-Hant/nodes/voicewake)
- [音訊和語音備註](/zh-Hant/nodes/audio)
- [媒體理解](/zh-Hant/nodes/media-understanding)
