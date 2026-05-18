---
summary: "Infer-first CLI for provider-backed model, image, audio, TTS, video, web, and embedding workflows"
read_when:
  - Adding or modifying `openclaw infer` commands
  - Designing stable headless capability automation
title: "Inference CLI"
---

`openclaw infer` 是供應商支援推理工作流程的標準無介面介面。

它刻意公開功能系列，而非原始的閘道 RPC 名稱，也非原始的代理程式工具 ID。

## 將 infer 轉化為技能

將此複製並貼上到代理程式：

```text
Read https://docs.openclaw.ai/cli/infer, then create a skill that routes my common workflows to `openclaw infer`.
Focus on model runs, image generation, video generation, audio transcription, TTS, web search, and embeddings.
```

良好的基於 infer 的技能應該：

- 將常見的使用者意圖對應到正確的 infer 子指令
- 包含一些涵蓋其工作流程的標準 infer 範例
- 在範例和建議中優先使用 `openclaw infer ...`
- 避免在技能主體內重新記錄整個 infer 介面

典型的以 infer 為重點的技能涵蓋範圍：

- `openclaw infer model run`
- `openclaw infer image generate`
- `openclaw infer audio transcribe`
- `openclaw infer tts convert`
- `openclaw infer web search`
- `openclaw infer embedding create`

## 為何使用 infer

`openclaw infer` 為 OpenClaw 內部的供應商支援推理任務提供了一致的 CLI。

優點：

- 使用已在 OpenClaw 中設定的提供商和模型，而無需為每個後端連接一次性包裝函式。
- 將模型、影像、音訊轉錄、TTS、影片、網路和嵌入工作流程保持在同一個指令樹下。
- 使用穩定的 `--json` 輸出格式，以便在腳本、自動化和代理驅動的工作流程中使用。
- 當任務本質上是「執行推論」時，優先使用 OpenClaw 的第一方介面。
- 對於大多數 infer 指令，使用正常的本機路徑，而不需要閘道。

對於端到端供應商檢查，一旦較低層級的供應商測試通過，請優先使用 `openclaw infer ...`。它會在發出供應商請求之前，測試已發行的 CLI、設定載入、預設代理解析、配套外掛程式啟用以及共享功能執行時。

## 指令樹

```text
 openclaw infer
  list
  inspect

  model
    run
    list
    inspect
    providers
    auth login
    auth logout
    auth status

  image
    generate
    edit
    describe
    describe-many
    providers

  audio
    transcribe
    providers

  tts
    convert
    voices
    providers
    status
    enable
    disable
    set-provider

  video
    generate
    describe
    providers

  web
    search
    fetch
    providers

  embedding
    create
    providers
```

## 常見任務

此表格將常見的推論任務對應至對應的 infer 指令。

| 任務                 | 指令                                                                                          | 備註                                              |
| -------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 執行文字/模型提示    | `openclaw infer model run --prompt "..." --json`                                              | 預設使用一般的本機路徑                            |
| 在影像上執行模型提示 | `openclaw infer model run --prompt "Describe this" --file ./image.png --model provider/model` | 對多個影像輸入重複 `--file`                       |
| 生成影像             | `openclaw infer image generate --prompt "..." --json`                                         | 從現有檔案開始時使用 `image edit`                 |
| 描述圖片檔案或 URL   | `openclaw infer image describe --file ./image.png --prompt "..." --json`                      | `--model` 必須是具備影像功能的 `<provider/model>` |
| 轉錄音訊             | `openclaw infer audio transcribe --file ./memo.m4a --json`                                    | `--model` 必須是 `<provider/model>`               |
| 合成語音             | `openclaw infer tts convert --text "..." --output ./speech.mp3 --json`                        | `tts status` 是閘道導向的                         |
| 生成影片             | `openclaw infer video generate --prompt "..." --json`                                         | 支援供應商提示，例如 `--resolution`               |
| 描述影片檔案         | `openclaw infer video describe --file ./clip.mp4 --json`                                      | `--model` 必須是 `<provider/model>`               |
| 搜尋網路             | `openclaw infer web search --query "..." --json`                                              |                                                   |
| 擷取網頁             | `openclaw infer web fetch --url https://example.com --json`                                   |                                                   |
| 建立嵌入             | `openclaw infer embedding create --text "..." --json`                                         |                                                   |

## 行為

- `openclaw infer ...` 是這些工作流程的主要 CLI 介面。
- 當輸出將被另一個命令或腳本使用時，請使用 `--json`。
- 當需要特定後端時，請使用 `--provider` 或 `--model provider/model`。
- 使用 `model run --thinking <level>` 傳遞一次性思考/推理層級 (`off`、`minimal`、`low`、`medium`、`high`、`adaptive`、`xhigh` 或 `max`)，同時保持執行原始狀態。
- 對於 `image describe`、`audio transcribe` 和 `video describe`，`--model` 必須使用 `<provider/model>` 格式。
- 對於 `image describe`，`--file` 接受本地路徑和 HTTP(S) 圖片 URL。遠端 URL 使用正常的媒體擷取 SSRF 原則。
- 對於 `image describe`，明確的 `--model` 會直接執行該提供者/模型。該模型在模型目錄或提供者設定中必須具備圖片處理能力。`codex/<model>` 執行受限的 Codex 應用伺服器圖片理解輪次；`openai-codex/<model>` 則使用 OpenAI Codex OAuth 提供者路徑。
- 無狀態執行指令預設為本地。
- 閘道管理的狀態指令預設為閘道。
- 正常的本地路徑不需要閘道在執行中。
- 本地的 `model run` 是精簡的一次性提供者完成。它會解析已設定的代理模型和驗證，但不會啟動聊天代理輪次、載入工具或開啟配套的 MCP 伺服器。
- `model run --file` 接受圖片檔案，偵測其 MIME 類型，並隨提供的提示將其傳送至選定的模型。若有多張圖片，請重複 `--file`。
- `model run --file` 會拒絕非圖片的輸入。請對音訊檔案使用 `infer audio transcribe`，對影片檔案使用 `infer video describe`。
- `model run --gateway` 會使用閘道路由、已儲存的驗證、提供者選擇以及嵌入式執行時，但仍作為原始模型探針執行：它會傳送提供的提示和任何圖片附件，而無先前的工作階段紀錄、bootstrap/AGENTS 上下文、context-engine 組裝、工具或配套的 MCP 伺服器。
- `model run --gateway --model <provider/model>` 需要受信任的操作員閘道憑證，因為此請求要求閘道執行一次性提供者/模型覆寫。
- 本地的 `model run --thinking` 使用精簡的提供者完成路徑；提供者特定層級（例如 `adaptive` 和 `max`）會對應到最接近的可移植簡單完成層級。

## 模型

請使用 `model` 進行提供者支援的文字推斷及模型/提供者檢查。

```bash
openclaw infer model run --prompt "Reply with exactly: smoke-ok" --json
openclaw infer model run --prompt "Summarize this changelog entry" --model openai/gpt-5.4 --json
openclaw infer model run --prompt "Describe this image in one sentence" --file ./photo.jpg --model google/gemini-2.5-flash --json
openclaw infer model run --prompt "Use more reasoning here" --thinking high --json
openclaw infer model providers --json
openclaw infer model inspect --name gpt-5.5 --json
```

使用完整的 `<provider/model>` 參照來對特定提供商進行煙霧測試，而無須
啟動 Gateway 或載入完整的代理工具介面：

```bash
openclaw infer model run --local --model anthropic/claude-sonnet-4-6 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model cerebras/zai-glm-4.7 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model google/gemini-2.5-flash --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model groq/llama-3.1-8b-instant --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model mistral/mistral-medium-3-5 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model mistral/mistral-small-latest --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model openai/gpt-4.1 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model ollama/qwen2.5vl:7b --prompt "Describe this image." --file ./photo.jpg --json
```

備註：

- 本機 `model run` 是針對提供商/模型/身份驗證健康狀況最狹窄的 CLI 煙霧測試，因為對於非 Codex 提供商，它僅將提供的提示傳送至選定的模型。
- 本機 `model run --model <provider/model>` 可以在將該提供商寫入設定之前，使用來自 `models list --all` 的精確捆綁靜態目錄列。仍需要提供商身份驗證；缺少憑證會因為身份驗證錯誤而失敗，而非 `Unknown model`。
- 針對 Mistral Medium 3.5 推理探測，請保持溫度為未設定/預設值。Mistral 會拒絕 `reasoning_effort="high"` 加上 `temperature: 0`；請搭配預設溫度或非零推理模式值（例如 `0.7`）來使用 `mistral/mistral-medium-3-5`。
- `openai-codex/*` 本機探測是狹窄的例外：OpenClaw 會加入最少的系統指令，以便 Codex Responses 傳輸可以填入其所需的 `instructions` 欄位，而不會加入完整的代理情境、工具、記憶體或會話紀錄。
- 本機 `model run --file` 會保持這條精簡路徑，並將圖片內容直接附加至單一使用者訊息。當 MIME 類型被偵測為 `image/*` 時，PNG、JPEG 和 WebP 等常見圖片檔案即可運作；不支援或無法辨識的檔案會在呼叫提供商之前失敗。
- 當您想要直接測試選定的多模態文字模型時，`model run --file` 是最佳選擇。當您想要 OpenClaw 的圖片理解提供商選取和預設圖片模型路由時，請使用 `infer image describe`。
- 選定的模型必須支援圖片輸入；僅限文字的模型可能會在提供商層級拒絕該請求。
- `model run --prompt` 必須包含非空白字元；空白提示會在呼叫本機提供商或 Gateway 之前被拒絕。
- 當提供商未傳回文字輸出時，本機 `model run` 會以非零值退出，因此無法連線的本機提供商和空白完成不會看起來像成功的探測。
- 當您需要測試 Gateway 路由、agent-runtime 設定或 Gateway 管理的提供者狀態，同時保持模型輸入為原始內容時，請使用 `model run --gateway`。當您需要完整的 agent 上下文、工具、記憶和會話紀錄時，請使用 `openclaw agent` 或聊天介面。
- `model auth login`、`model auth logout` 和 `model auth status` 管理已儲存的提供者驗證狀態。

## 圖片

使用 `image` 進行生成、編輯和描述。

```bash
openclaw infer image generate --prompt "friendly lobster illustration" --json
openclaw infer image generate --prompt "cinematic product photo of headphones" --json
openclaw infer image generate --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "simple red circle sticker on a transparent background" --json
openclaw infer image generate --prompt "slow image backend" --timeout-ms 180000 --json
openclaw infer image edit --file ./logo.png --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "keep the logo, remove the background" --json
openclaw infer image edit --file ./poster.png --prompt "make this a vertical story ad" --size 2160x3840 --aspect-ratio 9:16 --resolution 4K --json
openclaw infer image describe --file ./photo.jpg --json
openclaw infer image describe --file https://example.com/photo.png --json
openclaw infer image describe --file ./receipt.jpg --prompt "Extract the merchant, date, and total" --json
openclaw infer image describe-many --file ./before.png --file ./after.png --prompt "Compare the screenshots and list visible UI changes" --json
openclaw infer image describe --file ./ui-screenshot.png --model openai/gpt-4.1-mini --json
openclaw infer image describe --file ./photo.jpg --model ollama/qwen2.5vl:7b --prompt "Describe the image in one sentence" --timeout-ms 300000 --json
```

備註：

- 從現有輸入檔案開始時，請使用 `image edit`。
- 針對支援參考圖片編輯幾何提示的提供者/模型，請將 `--size`、`--aspect-ratio` 或 `--resolution` 與 `image edit` 搭配使用。
- 搭配使用 `--output-format png --background transparent` 與
  `--model openai/gpt-image-1.5` 以取得透明背景的 OpenAI PNG 輸出；
  `--openai-background` 仍可作為 OpenAI 專用的別名。未宣告背景支援的提供者會將該提示回報為已忽略的覆寫。
- 使用 `image providers --json` 來驗證哪些內建的圖片提供者
  是可探索的、已設定的、已選取的，以及每個提供者公開了哪些生成/編輯功能。
- 使用 `image generate --model <provider/model> --json` 作為圖片生成變更
  最狹隘的即時 CLI 測試。範例：

  ```bash
  openclaw infer image providers --json
  openclaw infer image generate \
    --model google/gemini-3.1-flash-image-preview \
    --prompt "Minimal flat test image: one blue square on a white background, no text." \
    --output ./openclaw-infer-image-smoke.png \
    --json
  ```

  JSON 回應會回報 `ok`、`provider`、`model`、`attempts` 以及寫入
  的輸出路徑。當設定 `--output` 時，最終副檔名可能會遵循
  提供者傳回的 MIME 類型。

- 對於 `image describe` 和 `image describe-many`，請使用 `--prompt` 為視覺模型提供特定任務的指令，例如 OCR、比較、UI 檢查或簡潔的標題生成。
- 搭配緩慢的本機視覺模型或冷啟動的 Ollama 使用 `--timeout-ms`。
- 對於 `image describe`，`--model` 必須是具備圖片功能的 `<provider/model>`。
- 對於本機 Ollama 視覺模型，請先下載模型並將 `OLLAMA_API_KEY` 設定為任何預留位置值，例如 `ollama-local`。請參閱 [Ollama](/zh-Hant/providers/ollama#vision-and-image-description)。

## 音訊

使用 `audio` 進行檔案轉錄。

```bash
openclaw infer audio transcribe --file ./memo.m4a --json
openclaw infer audio transcribe --file ./team-sync.m4a --language en --prompt "Focus on names and action items" --json
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

備註：

- `audio transcribe` 是用於檔案轉錄，而非即時會話管理。
- `--model` 必須為 `<provider/model>`。

## TTS

使用 `tts` 進行語音合成和 TTS 提供者狀態管理。

```bash
openclaw infer tts convert --text "hello from openclaw" --output ./hello.mp3 --json
openclaw infer tts convert --text "Your build is complete" --output ./build-complete.mp3 --json
openclaw infer tts providers --json
openclaw infer tts status --json
```

備註：

- `tts status` 預設為 gateway，因為它反映了由 gateway 管理的 TTS 狀態。
- 使用 `tts providers`、`tts voices` 和 `tts set-provider` 來檢查和設定 TTS 行為。

## 影片

使用 `video` 進行生成和描述。

```bash
openclaw infer video generate --prompt "cinematic sunset over the ocean" --json
openclaw infer video generate --prompt "slow drone shot over a forest lake" --resolution 768P --duration 6 --json
openclaw infer video describe --file ./clip.mp4 --json
openclaw infer video describe --file ./clip.mp4 --model openai/gpt-4.1-mini --json
```

備註：

- `video generate` 接受 `--size`、`--aspect-ratio`、`--resolution`、`--duration`、`--audio`、`--watermark` 和 `--timeout-ms`，並將其轉發至影片生成執行時。
- 對於 `video describe`，`--model` 必須為 `<provider/model>`。

## 網頁

使用 `web` 進行搜尋和擷取工作流程。

```bash
openclaw infer web search --query "OpenClaw docs" --json
openclaw infer web search --query "OpenClaw infer web providers" --json
openclaw infer web fetch --url https://docs.openclaw.ai/cli/infer --json
openclaw infer web providers --json
```

備註：

- 使用 `web providers` 來檢查可用、已設定和已選取的提供者。

## 嵌入

使用 `embedding` 進行向量建立和嵌入提供者檢查。

```bash
openclaw infer embedding create --text "friendly lobster" --json
openclaw infer embedding create --text "customer support ticket: delayed shipment" --model openai/text-embedding-3-large --json
openclaw infer embedding providers --json
```

## JSON 輸出

Infer 指令會將 JSON 輸出正規化為共享的封裝格式：

```json
{
  "ok": true,
  "capability": "image.generate",
  "transport": "local",
  "provider": "openai",
  "model": "gpt-image-2",
  "attempts": [],
  "outputs": []
}
```

頂層欄位是穩定的：

- `ok`
- `capability`
- `transport`
- `provider`
- `model`
- `attempts`
- `outputs`
- `error`

對於生成的媒體命令，`outputs` 包含由 OpenClaw 寫入的檔案。請使用
該陣列中的 `path`、`mimeType`、`size` 以及任何媒體特定維度來進行自動化，
而不是解析人類可讀的標準輸出。

## 常見陷阱

```bash
# Bad
openclaw infer media image generate --prompt "friendly lobster"

# Good
openclaw infer image generate --prompt "friendly lobster"
```

```bash
# Bad
openclaw infer audio transcribe --file ./memo.m4a --model whisper-1 --json

# Good
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

## 註記

- `openclaw capability ...` 是 `openclaw infer ...` 的別名。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [模型](/zh-Hant/concepts/models)
