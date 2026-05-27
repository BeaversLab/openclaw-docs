---
summary: "支援進行入站圖片/音訊/影片理解（選用），並提供供應商與 CLI 的備援機制"
read_when:
  - Designing or refactoring media understanding
  - Tuning inbound audio/video/image preprocessing
title: "媒體理解"
sidebarTitle: "媒體理解"
---

OpenClaw 可以在回覆管線運行前**總結傳入媒體**（圖像/音訊/視訊）。它會自動偵測何時有可用的本機工具或提供者金鑰，並且可以被停用或自訂。如果理解功能關閉，模型仍會照常接收原始檔案/URL。

特定供應商的媒體行為由供應商外掛程式註冊，而 OpenClaw 核心則擁有共用的 `tools.media` 設定、備援順序以及回覆管線整合。

## 目標

- 選用：將傳入媒體預先消化為簡短文字，以加快路由並改善指令解析。
- 保留傳送給模型的原始媒體（始終如此）。
- 支援 **供應商 API** 和 **CLI 備援機制**。
- 允許多個模型並按順序備援（錯誤/大小/逾時）。

## 高階行為

<Steps>
  <Step title="收集附件">
    收集入站附件 (`MediaPaths`, `MediaUrls`, `MediaTypes`)。
  </Step>
  <Step title="依功能選擇">
    針對每個啟用的功能 (圖片/音訊/影片)，根據原則選擇附件 (預設：**第一個**)。
  </Step>
  <Step title="選擇模型">
    選擇第一個符合資格的模型項目 (大小 + 功能 + 驗證)。
  </Step>
  <Step title="失敗時備援">
    如果模型失敗或媒體過大，**備援至下一個項目**。
  </Step>
  <Step title="套用成功區塊">
    成功時：

    - `Body` 會變成 `[Image]`、`[Audio]` 或 `[Video]` 區塊。
    - 音訊會設定 `{{Transcript}}`；指令解析會使用字幕文字 (若有)，否則使用逐字稿。
    - 字幕會以 `User text:` 格式保留在區塊內。

  </Step>
</Steps>

如果理解失敗或被停用，**回覆流程會繼續**，並使用原始內文和附件。

## 設定概覽

`tools.media` 支援 **共用模型** 以及針對各功能的覆寫設定：

<AccordionGroup>
  <Accordion title="頂層鍵">
    - `tools.media.models`: 共用模型清單（使用 `capabilities` 進行控管）。
    - `tools.media.image` / `tools.media.audio` / `tools.media.video`:
      - 預設值（`prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`）
      - 提供者覆寫（`baseUrl`、`headers`、`providerOptions`）
      - 透過 `tools.media.audio.providerOptions.deepgram` 設定的 Deepgram 音訊選項
      - 音訊逐字稿回顯控制（`echoTranscript`，預設為 `false`；`echoFormat`）
      - 可選的 **per-capability `models` 清單**（優先於共用模型）
      - `attachments` 原則（`mode`、`maxAttachments`、`prefer`）
      - `scope`（可選擇透過 channel/chatType/session key 進行控管）
    - `tools.media.concurrency`: 最大並行功能執行次數（預設 **2**）。

  </Accordion>
</AccordionGroup>

```json5
{
  tools: {
    media: {
      models: [
        /* shared list */
      ],
      image: {
        /* optional overrides */
      },
      audio: {
        /* optional overrides */
        echoTranscript: true,
        echoFormat: '📝 "{transcript}"',
      },
      video: {
        /* optional overrides */
      },
    },
  },
}
```

### 模型條目

每個 `models[]` 項目可以是 **provider** 或 **CLI**：

<Tabs>
  <Tab title="Provider 項目">
    ```json5
    {
      type: "provider", // default if omitted
      provider: "openai",
      model: "gpt-5.5",
      prompt: "Describe the image in <= 500 chars.",
      maxChars: 500,
      maxBytes: 10485760,
      timeoutSeconds: 60,
      capabilities: ["image"], // optional, used for multi-modal entries
      profile: "vision-profile",
      preferredProfile: "vision-fallback",
    }
    ```
  </Tab>
  <Tab title="CLI 項目">
    ```json5
    {
      type: "cli",
      command: "gemini",
      args: [
        "-m",
        "gemini-3-flash",
        "--allowed-tools",
        "read_file",
        "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
      ],
      maxChars: 500,
      maxBytes: 52428800,
      timeoutSeconds: 120,
      capabilities: ["video", "image"],
    }
    ```

    CLI 範本也可以使用：

    - `{{MediaDir}}`（包含媒體檔案的目錄）
    - `{{OutputDir}}`（為此執行建立的暫存目錄）
    - `{{OutputBase}}`（暫存檔案基礎路徑，不含副檔名）

  </Tab>
</Tabs>

### Provider 憑證 (`apiKey`)

Provider 媒體理解使用與一般模型呼叫相同的 provider 驗證解析機制：驗證設定檔、環境變數，然後是
`models.providers.<providerId>.apiKey`。

`tools.media.*.models[]` 條目不接受內聯 `apiKey` 欄位。媒體模型條目中的 `provider` 值（例如 `openai` 或 `moonshot`）必須透過其中一個標準供應商驗證來源提供可用的憑證。

最小範例：

```json5
{
  models: {
    providers: {
      openai: { apiKey: "<OPENAI_API_KEY>" },
      moonshot: { apiKey: "<MOONSHOT_API_KEY>" },
    },
  },
}
```

如需完整的供應商驗證參考資料，包括設定檔、環境變數和自訂基底 URL，請參閱[工具和自訂供應商](/zh-Hant/gateway/config-tools)。

## 預設值與限制

建議的預設值：

- `maxChars`：圖片/影片設定為 **500**（簡短、指令友善）
- `maxChars`：音訊設定為 **unset**（除非您設定限制，否則為完整逐字稿）
- `maxBytes`：
  - image：**10MB**
  - audio：**20MB**
  - video：**50MB**

<AccordionGroup>
  <Accordion title="Rules">
    - 如果媒體超過 `maxBytes`，則會跳過該模型並**嘗試下一個模型**。
    - 小於 **1024 位元組**的音訊檔案會被視為空檔或損壞，並在供應商/CLI 轉錄之前跳過；傳入回覆內容會收到確定性的佔位符逐字稿，以便代理知道該筆記太小。
    - 如果模型返回的內容超過 `maxChars`，輸出將會被截斷。
    - `prompt` 預設為簡單的「描述 {media}」加上 `maxChars` 指引（僅限圖片/影片）。
    - 如果目前使用的主要圖片模型本身就支援視覺功能，OpenClaw 會跳過 `[Image]` 摘要區塊，而是將原始圖片傳入模型。
    - 如果 Gateway/WebChat 主要模型僅支援文字，圖片附件將會保留為卸載的 `media://inbound/*` 參照，以便圖片/PDF 工具或設定的圖片模型仍然可以檢查它們，而不是遺失附件。
    - 明確的 `openclaw infer image describe --model <provider/model>` 請求則不同：它們會直接執行該支援圖片的供應商/模型，包括 Ollama 參照（例如 `ollama/qwen2.5vl:7b`）。
    - 如果 `<capability>.enabled: true` 但未設定任何模型，當其供應商支援該功能時，OpenClaw 會嘗試**目前使用的回覆模型**。

  </Accordion>
</AccordionGroup>

### 自動偵測媒體理解（預設）

如果 `tools.media.<capability>.enabled` **未**設定為 `false` 且您尚未配置模型，OpenClaw 將按此順序自動偵測並**在第一個可行的選項停止**：

<Steps>
  <Step title="作用中的回覆模型">
    當其供應商支援該功能時的作用中回覆模型。
  </Step>
  <Step title="agents.defaults.imageModel">
    `agents.defaults.imageModel` 主要/備用參照（僅圖片）。
    優先使用 `provider/model` 參照。僅當符合項唯一時，裸參照才會從已配置的支援圖片功能的供應商模型條目中進行限定。
  </Step>
  <Step title="本地 CLI（僅音訊）">
    本地 CLI（若已安裝）：

    - `sherpa-onnx-offline`（需要 `SHERPA_ONNX_MODEL_DIR` 搭配 encoder/decoder/joiner/tokens）
    - `whisper-cli`（`whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或隨附的 tiny 模型）
    - `whisper`（Python CLI；自動下載模型）

  </Step>
  <Step title="Gemini CLI">
    使用 `read_many_files` 的 `gemini`。
  </Step>
  <Step title="供應商驗證">
    - 支援該功能的已配置 `models.providers.*` 條目會在隨附的備用順序之前嘗試。
    - 擁有具備圖片功能模型的僅圖片配置供應商，即使不是隨附的供應商外掛程式，也會自動註冊以進行媒體理解。
    - 當明確選取時，例如透過 `agents.defaults.imageModel` 或 `openclaw infer image describe --model ollama/<vision-model>`，即可使用 Ollama 圖片理解。

    隨附的備用順序：

    - 音訊：OpenAI → Groq → xAI → Deepgram → OpenRouter → Google → SenseAudio → ElevenLabs → Mistral
    - 圖片：OpenAI → Anthropic → Google → MiniMax → MiniMax Portal → Z.AI
    - 影片：Google → Qwen → Moonshot

  </Step>
</Steps>

若要停用自動偵測，請設定：

```json5
{
  tools: {
    media: {
      audio: {
        enabled: false,
      },
    },
  },
}
```

<Note>二進位檔案偵測在 macOS/Linux/Windows 上為盡力而為；請確保 CLI 位於 `PATH`（我們會展開 `~`），或是使用完整指令路徑設定明確的 CLI 模型。</Note>

### Proxy 環境支援（提供者模型）

當啟用基於提供者的 **音訊** 和 **視訊** 媒體理解時，OpenClaw 會遵守用於提供者 HTTP 呼叫的標準輸出 Proxy 環境變數：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `ALL_PROXY`
- `https_proxy`
- `http_proxy`
- `all_proxy`

如果未設定任何 Proxy 環境變數，媒體理解將使用直接出口。如果 Proxy 值格式錯誤，OpenClaw 會記錄警告並改回直接擷取。

## 功能（選用）

如果您設定了 `capabilities`，該條目僅會針對這些媒體類型執行。對於共用清單，OpenClaw 可以推斷預設值：

- `openai`, `anthropic`, `minimax`: **圖片**
- `minimax-portal`: **圖片**
- `moonshot`: **圖片 + 視訊**
- `openrouter`: **圖片 + 音訊**
- `google` (Gemini API): **圖片 + 音訊 + 視訊**
- `qwen`: **圖片 + 視訊**
- `mistral`: **音訊**
- `zai`: **圖片**
- `groq`: **音訊**
- `xai`: **音訊**
- `deepgram`: **音訊**
- 任何具有圖片處理能力模型的 `models.providers.<id>.models[]` 型錄：**圖片**

對於 CLI 條目，**請明確設定 `capabilities`** 以避免意外的匹配。如果您省略 `capabilities`，該條目將適用於其出現的清單。

## 提供者支援矩陣（OpenClaw 整合）

| 功能 | 提供者整合                                                                                                                   | 備註                                                                                                                                                                                       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 圖片 | OpenAI、OpenAI Codex OAuth、Codex app-server、OpenRouter、Anthropic、Google、MiniMax、Moonshot、Qwen、Z.AI、config providers | 廠商插件註冊圖片支援；`openai-codex/*` 使用 OAuth 供應商管道；`codex/*` 使用有限的 Codex 應用伺服器輪次；MiniMax 和 MiniMax OAuth 都使用 `MiniMax-VL-01`；支援圖片的配置供應商會自動註冊。 |
| 音訊 | OpenAI、Groq、xAI、Deepgram、OpenRouter、Google、SenseAudio、ElevenLabs、Mistral                                             | 供應商轉錄 (Whisper/Groq/xAI/Deepgram/OpenRouter STT/Gemini/SenseAudio/Scribe/Voxtral)。                                                                                                   |
| 影片 | Google、Qwen、Moonshot                                                                                                       | 透過廠商插件實現供應商影片理解；Qwen 影片理解使用標準 DashScope 端點。                                                                                                                     |

<Note>
**MiniMax 注意事項**

- `minimax`、`minimax-cn`、`minimax-portal` 和 `minimax-portal-cn` 的圖片理解來自於插件擁有的 `MiniMax-VL-01` 媒體供應商。
- 即使舊版 MiniMax M2.x 聊天元數據聲稱有圖片輸入，自動圖片路由仍會繼續使用 `MiniMax-VL-01`。

</Note>

## 模型選擇指南

- 當品質和安全性至關重要時，請針對每種媒體功能選擇可用的最強最新一代模型。
- 對於處理不受信任輸入的啟用工具代理程式，請避免使用較舊/較弱的媒體模型。
- 為了確保可用性，請為每種功能保留至少一個備選方案（高品質模型 + 更快/更便宜的模型）。
- 當供應商 API 無法使用時，CLI 備選方案 (`whisper-cli`、`whisper`、`gemini`) 會很有用。
- `parakeet-mlx` 注意事項：使用 `--output-dir` 時，當輸出格式為 `txt` (或未指定) 時，OpenClaw 會讀取 `<output-dir>/<media-basename>.txt`；非 `txt` 格式則會回退到 stdout。

## 附件政策

針對每種功能的 `attachments` 控制要處理哪些附件：

<ParamField path="mode" type='"first" | "all"' default="first">
  是否要處理第一個選取的附件或全部附件。
</ParamField>
<ParamField path="maxAttachments" type="number" default="1">
  限制處理的數量。
</ParamField>
<ParamField path="prefer" type='"first" | "last" | "path" | "url"'>
  候選附件之間的選取偏好。
</ParamField>

當 `mode: "all"` 時，輸出會標記為 `[Image 1/2]`、`[Audio 2/2]` 等。

<AccordionGroup>
  <Accordion title="檔案附件提取行為">
    - 提取出的檔案文字會在附加至媒體提示之前被包裝為 **不受信任的外部內容**。
    - 插入的區塊會使用像 `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` / `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>` 這樣的明確邊界標記，並包含一個 `Source: External` 中繼資料行。
    - 此附件提取路徑故意省略了冗長的 `SECURITY NOTICE:` 橫幅，以避免媒體提示過於龐大；邊界標記和中繼資料仍然會保留。
    - 如果檔案沒有可提取的文字，OpenClaw 會插入 `[No extractable text]`。
    - 如果 PDF 在此路徑中回退到渲染頁面影像，媒體提示會保留預留位置 `[PDF content rendered to images; images not forwarded to model]`，因為此附件提取步驟轉發的是文字區塊，而非渲染的 PDF 影像。

  </Accordion>
</AccordionGroup>

## 設定範例

<Tabs>
  <Tab title="共用模型 + 覆寫">
    ```json5
    {
      tools: {
        media: {
          models: [
            { provider: "openai", model: "gpt-5.5", capabilities: ["image"] },
            {
              provider: "google",
              model: "gemini-3-flash-preview",
              capabilities: ["image", "audio", "video"],
            },
            {
              type: "cli",
              command: "gemini",
              args: [
                "-m",
                "gemini-3-flash",
                "--allowed-tools",
                "read_file",
                "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
              ],
              capabilities: ["image", "video"],
            },
          ],
          audio: {
            attachments: { mode: "all", maxAttachments: 2 },
          },
          video: {
            maxChars: 500,
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="僅限音訊 + 影片">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [
              { provider: "openai", model: "gpt-4o-mini-transcribe" },
              {
                type: "cli",
                command: "whisper",
                args: ["--model", "base", "{{MediaPath}}"],
              },
            ],
          },
          video: {
            enabled: true,
            maxChars: 500,
            models: [
              { provider: "google", model: "gemini-3-flash-preview" },
              {
                type: "cli",
                command: "gemini",
                args: [
                  "-m",
                  "gemini-3-flash",
                  "--allowed-tools",
                  "read_file",
                  "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
                ],
              },
            ],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="僅限影像">
    ```json5
    {
      tools: {
        media: {
          image: {
            enabled: true,
            maxBytes: 10485760,
            maxChars: 500,
            models: [
              { provider: "openai", model: "gpt-5.5" },
              { provider: "anthropic", model: "claude-opus-4-6" },
              {
                type: "cli",
                command: "gemini",
                args: [
                  "-m",
                  "gemini-3-flash",
                  "--allowed-tools",
                  "read_file",
                  "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
                ],
              },
            ],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="多模組單一條目">
    ```json5
    {
      tools: {
        media: {
          image: {
            models: [
              {
                provider: "google",
                model: "gemini-3.1-pro-preview",
                capabilities: ["image", "video", "audio"],
              },
            ],
          },
          audio: {
            models: [
              {
                provider: "google",
                model: "gemini-3.1-pro-preview",
                capabilities: ["image", "video", "audio"],
              },
            ],
          },
          video: {
            models: [
              {
                provider: "google",
                model: "gemini-3.1-pro-preview",
                capabilities: ["image", "video", "audio"],
              },
            ],
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

## 狀態輸出

當執行媒體理解時，`/status` 包含簡短摘要行：

```
📎 Media: image ok (openai/gpt-5.4) · audio skipped (maxBytes)
```

這會顯示各功能的結果以及適用時選擇的供應商/模型。

## 註記

- 理解功能屬於**盡力而為**。錯誤不會阻擋回覆。
- 即使停用了理解功能，附件仍會傳遞給模型。
- 使用 `scope` 來限制運行理解的範圍（例如僅限私訊）。

## 相關

- [設定](/zh-Hant/gateway/configuration)
- [圖片與媒體支援](/zh-Hant/nodes/images)
