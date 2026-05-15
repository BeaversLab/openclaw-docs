---
summary: "入站圖片/音訊/視訊理解（可選），具備供應商 + CLI 備援機制"
read_when:
  - Designing or refactoring media understanding
  - Tuning inbound audio/video/image preprocessing
title: "媒體理解"
sidebarTitle: "媒體理解"
---

OpenClaw 可以在回覆管線運行前**總結傳入媒體**（圖像/音訊/視訊）。它會自動偵測何時有可用的本機工具或提供者金鑰，並且可以被停用或自訂。如果理解功能關閉，模型仍會照常接收原始檔案/URL。

特定供應商的媒體行為由供應商外掛程式註冊，而 OpenClaw 核心擁有共用的 `tools.media` 設定、後備順序以及回覆管線整合。

## 目標

- 選用：將傳入媒體預先消化為簡短文字，以加快路由並改善指令解析。
- 保留傳送給模型的原始媒體（始終如此）。
- 支援 **供應商 API** 和 **CLI 備援機制**。
- 允許多個模型並按順序備援（錯誤/大小/逾時）。

## 高階行為

<Steps>
  <Step title="收集附件">
    收集傳入附件 (`MediaPaths`, `MediaUrls`, `MediaTypes`)。
  </Step>
  <Step title="依功能選擇">
    針對每個啟用的功能（圖像/音訊/視訊），依據原則選擇附件（預設：**第一個**）。
  </Step>
  <Step title="選擇模型">
    選擇第一個符合資格的模型項目（大小 + 功能 + 驗證）。
  </Step>
  <Step title="失敗時後援">
    如果模型失敗或媒體過大，**後援至下一個項目**。
  </Step>
  <Step title="套用成功區塊">
    成功時：

    - `Body` 變成 `[Image]`、`[Audio]` 或 `[Video]` 區塊。
    - 音訊設定 `{{Transcript}}`；指令解析使用標題文字（如果有的話），否則使用逐字稿。
    - 標題會保留為區塊內的 `User text:`。

  </Step>
</Steps>

如果理解失敗或被停用，**回覆流程會繼續**，並使用原始內文和附件。

## 設定概覽

`tools.media` 支援**共用模型**以及各功能的覆寫：

<AccordionGroup>
  <Accordion title="頂層鍵">
    - `tools.media.models`：共享模型清單（使用 `capabilities` 進行閘道控制）。
    - `tools.media.image` / `tools.media.audio` / `tools.media.video`：
      - 預設值（`prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`）
      - 提供者覆寫（`baseUrl`、`headers`、`providerOptions`）
      - 透過 `tools.media.audio.providerOptions.deepgram` 設定的 Deepgram 音訊選項
      - 音訊逐字稿回顯控制（`echoTranscript`，預設為 `false`；`echoFormat`）
      - 可選的 **各功能 `models` 清單**（優先於共享模型）
      - `attachments` 政策（`mode`、`maxAttachments`、`prefer`）
      - `scope`（可選的依頻道/chatType/會話金鑰閘道控制）
    - `tools.media.concurrency`：最大並行功能執行次數（預設為 **2**）。

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

每個 `models[]` 條目可以是 **provider** 或 **CLI**：

<Tabs>
  <Tab title="Provider entry">
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
  <Tab title="CLI entry">
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
    - `{{OutputBase}}`（暫存檔案基底路徑，無副檔名）

  </Tab>
</Tabs>

## 預設值與限制

建議的預設值：

- `maxChars`：影像/影片設為 **500**（簡短、便於指令操作）
- `maxChars`：音訊設為 **unset**（完整轉錄，除非您設定限制）
- `maxBytes`：
  - image：**10MB**
  - audio：**20MB**
  - video：**50MB**

<AccordionGroup>
  <Accordion title="規則">
    - 如果媒體超過 `maxBytes`，該模型將被跳過，並嘗試**下一個模型**。
    - 小於 **1024 位元組** 的音訊檔案會被視為空白或損壞，並在供應商/CLI 轉錄前跳過；傳入的回覆內容會收到一個確定性的佔位符轉錄文本，以便代理知道該註記太小。
    - 如果模型傳回超過 `maxChars`，輸出將被截斷。
    - `prompt` 預設為簡單的「描述 {media}」加上 `maxChars` 指引（僅限圖片/影片）。
    - 如果使用中的主要圖片模型原生已支援視覺功能，OpenClaw 會跳過 `[Image]` 摘要區塊，並改將原始圖片傳入模型。
    - 如果 Gateway/WebChat 主要模型僅支援文字，圖片附件將被保留為卸載的 `media://inbound/*` 參照，以便圖片/PDF 工具或設定的圖片模型仍能檢查它們，而不會遺失附件。
    - 明確的 `openclaw infer image describe --model <provider/model>` 請求則不同：它們會直接執行該具備圖片功能的供應商/模型，包括 Ollama 參照，例如 `ollama/qwen2.5vl:7b`。
    - 如果 `<capability>.enabled: true` 但未設定任何模型，當其供應商支援該功能時，OpenClaw 會嘗試**使用中的回覆模型**。

  </Accordion>
</AccordionGroup>

### 自動偵測媒體理解（預設）

如果未將 `tools.media.<capability>.enabled` 設定為 `false` 且您尚未設定模型，OpenClaw 將依以下順序自動偵測並**在第一個可行的選項處停止**：

<Steps>
  <Step title="目前回覆模型">
    當其提供者支援該功能時的目前回覆模型。
  </Step>
  <Step title="agents.defaults.imageModel">
    `agents.defaults.imageModel` 主要/後備參照（僅限圖片）。
    偏好 `provider/model` 參照。僅當符合項唯一時，裸參照才會從已設定的圖片功能供應商模型項目中進行限定。
  </Step>
  <Step title="本機 CLI（僅限音訊）">
    本機 CLI（若已安裝）：

    - `sherpa-onnx-offline`（需要帶有 encoder/decoder/joiner/tokens 的 `SHERPA_ONNX_MODEL_DIR`）
    - `whisper-cli`（`whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或隨附的 tiny 模型）
    - `whisper`（Python CLI；自動下載模型）

  </Step>
  <Step title="Gemini CLI">
    `gemini` 使用 `read_many_files`。
  </Step>
  <Step title="Provider auth">
    - 支援該功能的已配置 `models.providers.*` 條目會在內建的備用順序之前嘗試。
    - 即使不是內建的供應商外掛，具有圖像處理能力的模型之僅圖像配置提供者也會自動註冊以進行媒體理解。
    - Ollama 圖像理解在明確選取時可用，例如透過 `agents.defaults.imageModel` 或 `openclaw infer image describe --model ollama/<vision-model>`。

    內建備用順序：

    - 音訊：OpenAI → Groq → xAI → Deepgram → Google → SenseAudio → ElevenLabs → Mistral
    - 圖像：OpenAI → Anthropic → Google → MiniMax → MiniMax Portal → Z.AI
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

<Note>二進位檔案偵測在 macOS/Linux/Windows 上為盡力而為；請確保 CLI 位於 `PATH` 上（我們會展開 `~`），或使用完整指令路徑設定明確的 CLI 模型。</Note>

### Proxy environment support (provider models)

當啟用基於供應商的 **audio** 和 **video** 媒體理解時，OpenClaw 尊重供應商 HTTP 呼叫的標準輸出代理環境變數：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `ALL_PROXY`
- `https_proxy`
- `http_proxy`
- `all_proxy`

如果未設定代理環境變數，媒體理解會使用直接出口。如果代理值格式錯誤，OpenClaw 會記錄警告並回退至直接擷取。

## Capabilities (optional)

如果您設定 `capabilities`，該條目僅針對那些媒體類型執行。對於共享列表，OpenClaw 可以推斷預設值：

- `openai`、`anthropic`、`minimax`：**image**
- `minimax-portal`：**image**
- `moonshot`：**image + video**
- `openrouter`：**image**
- `google` (Gemini API)：**image + audio + video**
- `qwen`：**image + video**
- `mistral`：**audio**
- `zai`：**image**
- `groq`：**audio**
- `xai`：**audio**
- `deepgram`：**audio**
- 任何具有圖像處理能力的 `models.providers.<id>.models[]` 目錄：**image**

對於 CLI 條目，**請明確設定 `capabilities`** 以避免意外的匹配。如果您省略 `capabilities`，該條目將符合其所處的列表。

## 供應商支援矩陣 (OpenClaw 整合)

| 功能 | 供應商整合                                                                                                                   | 備註                                                                                                                                                                                                 |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 圖片 | OpenAI、OpenAI Codex OAuth、Codex app-server、OpenRouter、Anthropic、Google、MiniMax、Moonshot、Qwen、Z.AI、config providers | 供應商插件註冊圖片支援；`openai-codex/*` 使用 OAuth 供應商管道；`codex/*` 使用受限的 Codex 應用伺服器輪次；MiniMax 和 MiniMax OAuth 兩者皆使用 `MiniMax-VL-01`；具備圖片功能的配置供應商會自動註冊。 |
| 音訊 | OpenAI、Groq、xAI、Deepgram、Google、SenseAudio、ElevenLabs、Mistral                                                         | 供應商轉錄 (Whisper/Groq/xAI/Deepgram/Gemini/SenseAudio/Scribe/Voxtral)。                                                                                                                            |
| 影片 | Google、Qwen、Moonshot                                                                                                       | 透過供應商插件實現供應商影片理解；Qwen 影片理解使用標準 DashScope 端點。                                                                                                                             |

<Note>
**MiniMax 說明**

- `minimax` 和 `minimax-portal` 的圖片理解來自於插件擁有的 `MiniMax-VL-01` 媒體供應商。
- 捆綁的 MiniMax 文字目錄仍以僅限文字開始；明確的 `models.providers.minimax` 條目會具象化具備圖片功能的 M2.7 聊天參照。

</Note>

## 模型選擇指南

- 當品質和安全性很重要時，請優先選擇每個媒體功能可用的最新一代最強模型。
- 對於處理不受信任輸入的啟用工具的代理程式，請避免使用較舊或較弱的媒體模型。
- 為了確保可用性，每個功能至少保留一個備選方案（品質模型 + 更快/更便宜的模型）。
- 當供應商 API 無法使用時，CLI 後援機制（`whisper-cli`、`whisper`、`gemini`）非常有用。
- `parakeet-mlx` 說明：使用 `--output-dir` 時，當輸出格式為 `txt`（或未指定）時，OpenClaw 會讀取 `<output-dir>/<media-basename>.txt`；非 `txt` 格式會後援至標準輸出。

## 附件政策

針對特定功能的 `attachments` 控制處理哪些附件：

<ParamField path="mode" type='"first" | "all"' default="first">
  是否處理第一個選定的附件或全部附件。
</ParamField>
<ParamField path="maxAttachments" type="number" default="1">
  限制處理的數量。
</ParamField>
<ParamField path="prefer" type='"first" | "last" | "path" | "url"'>
  候選附件之間的選擇偏好。
</ParamField>

當 `mode: "all"` 時，輸出會被標記為 `[Image 1/2]`、`[Audio 2/2]` 等。

<AccordionGroup>
  <Accordion title="檔案附件提取行為">
    - 提取出的檔案文字會在附加至媒體提示詞之前，被封裝為**不受信的外部內容**。
    - 插入的區塊會使用明確的邊界標記，例如 `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` / `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>`，並包含一條 `Source: External` 元資料行。
    - 此附件提取路徑故意省略了冗長的 `SECURITY NOTICE:` 橫幅，以避免膨脹媒體提示詞；但邊界標記和元資料仍然保留。
    - 如果檔案沒有可提取的文字，OpenClaw 會插入 `[No extractable text]`。
    - 如果 PDF 在此路徑中回退到頁面轉譯圖像，媒體提示詞將保留佔位符 `[PDF content rendered to images; images not forwarded to model]`，因為此附件提取步驟轉發的是文字區塊，而非轉譯後的 PDF 圖像。

  </Accordion>
</AccordionGroup>

## 設定範例

<Tabs>
  <Tab title="共用模型 + 覆蓋">
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
  <Tab title="僅音訊 + 影片">
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
  <Tab title="僅圖片">
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
  <Tab title="多模態單一條目">
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

當執行媒體理解時，`/status` 包含一條簡短的摘要行：

```
📎 Media: image ok (openai/gpt-5.4) · audio skipped (maxBytes)
```

這顯示了各項功能的結果，以及適用時選擇的供應商/模型。

## 備註

- 理解為 **盡力而為**。錯誤不會阻擋回覆。
- 即使停用理解功能，附件仍會傳遞給模型。
- 使用 `scope` 來限制執行理解的位置（例如僅限私人訊息）。

## 相關

- [設定](/zh-Hant/gateway/configuration)
- [圖片與媒體支援](/zh-Hant/nodes/images)
