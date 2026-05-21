---
summary: "透過 image_generate 跨越 OpenAI、Google、fal、MiniMax、ComfyUI、DeepInfra、OpenRouter、LiteLLM、xAI、Vydra 生成與編輯圖片"
read_when:
  - Generating or editing images via the agent
  - Configuring image-generation providers and models
  - Understanding the image_generate tool parameters
title: "圖片生成"
sidebarTitle: "圖片生成"
---

`image_generate` 工具讓代理程式能夠使用您設定的提供者建立與編輯圖片。在聊天階段中，圖片生成會非同步執行：OpenClaw 會記錄一個背景工作、立即傳回工作 ID，並在提供者完成時喚醒代理程式。完成代理程式必須透過 `message` 工具傳送已生成的圖片；OpenClaw 不會自動發送私人的最終回覆作為備援方案。

<Note>此工具僅在至少有一個圖片生成提供者可用時才會出現。如果您在代理程式的工具中看不到 `image_generate`，請設定 `agents.defaults.imageGenerationModel`、設置提供者 API 金鑰，或使用 OpenAI Codex OAuth 登入。</Note>

## 快速入門

<Steps>
  <Step title="設定驗證">
    為至少一個提供者設定 API 金鑰（例如 `OPENAI_API_KEY`、
    `GEMINI_API_KEY`、`OPENROUTER_API_KEY`）或使用 OpenAI Codex OAuth 登入。
  </Step>
  <Step title="選擇預設模型（選用）">
    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "openai/gpt-image-2",
            timeoutMs: 180_000,
          },
        },
      },
    }
    ```

    Codex OAuth 使用相同的 `openai/gpt-image-2` 模型參照。當設定
    `openai-codex` OAuth 設定檔時，OpenClaw 會透過該 OAuth 設定檔傳送圖片
    要求，而不是先嘗試
    `OPENAI_API_KEY`。明確的 `models.providers.openai` 設定（API 金鑰、
    自訂/Azure 基礎 URL）會選回直接使用 OpenAI Images API
    路由。

  </Step>
  <Step title="Ask the agent">
    _"生成一張友善的機器人吉祥物圖片。"_

    代理會自動呼叫 `image_generate`。不需要工具允許清單——當有提供者可用時，它預設為啟用。此工具會傳回一個背景任務 ID，然後完成代理會在準備好時透過 `message` 工具傳送生成的附件。

  </Step>
</Steps>

<Warning>對於 LocalAI 等相容 OpenAI 的 LAN 端點，請保留自訂的 `models.providers.openai.baseUrl` 並透過 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` 明確啟用。私人 與內部圖片端點預設仍會被封鎖。</Warning>

## 常見路由

| 目標                                    | 模型參照                                           | 認證                                   |
| --------------------------------------- | -------------------------------------------------- | -------------------------------------- |
| 透過 API 計費進行 OpenAI 圖片生成       | `openai/gpt-image-2`                               | `OPENAI_API_KEY`                       |
| 使用 Codex 訂閱驗證進行 OpenAI 影像生成 | `openai/gpt-image-2`                               | OpenAI Codex OAuth                     |
| OpenAI 透明背景 PNG/WebP                | `openai/gpt-image-1.5`                             | `OPENAI_API_KEY` 或 OpenAI Codex OAuth |
| DeepInfra 圖片生成                      | `deepinfra/black-forest-labs/FLUX-1-schnell`       | `DEEPINFRA_API_KEY`                    |
| OpenRouter 圖片生成                     | `openrouter/google/gemini-3.1-flash-image-preview` | `OPENROUTER_API_KEY`                   |
| LiteLLM 圖片生成                        | `litellm/gpt-image-2`                              | `LITELLM_API_KEY`                      |
| Google Gemini 圖片生成                  | `google/gemini-3.1-flash-image-preview`            | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`   |

同一個 `image_generate` 工具可處理文字轉圖片與參考圖片編輯。使用 `image` 處理單一參考，或使用 `images` 處理多個參考。
提供者支援的輸出提示（如 `quality`、`outputFormat` 與
`background`）會在可用時被轉發；若提供者不支援則回報為忽略。內建的透明背景支援是
OpenAI 專屬功能；若其他提供者的後端能輸出，可能仍會保留 PNG alpha 通道。

## 支援的提供者

| 提供者     | 預設模型                                | 編輯支援                       | 驗證                                                  |
| ---------- | --------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| ComfyUI    | `workflow`                              | 是（1 張圖片，由工作流程設定） | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` 用於雲端     |
| DeepInfra  | `black-forest-labs/FLUX-1-schnell`      | 是（1 張圖片）                 | `DEEPINFRA_API_KEY`                                   |
| fal        | `fal-ai/flux/dev`                       | 是（特定模型的限制）           | `FAL_KEY`                                             |
| Google     | `gemini-3.1-flash-image-preview`        | 是                             | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                  |
| LiteLLM    | `gpt-image-2`                           | 是（最多 5 張輸入圖片）        | `LITELLM_API_KEY`                                     |
| MiniMax    | `image-01`                              | 是（主題參考）                 | `MINIMAX_API_KEY` 或 MiniMax OAuth (`minimax-portal`) |
| OpenAI     | `gpt-image-2`                           | 是（最多 4 張圖片）            | `OPENAI_API_KEY` 或 OpenAI Codex OAuth                |
| OpenRouter | `google/gemini-3.1-flash-image-preview` | 是（最多 5 張輸入圖片）        | `OPENROUTER_API_KEY`                                  |
| Vydra      | `grok-imagine`                          | 否                             | `VYDRA_API_KEY`                                       |
| xAI        | `grok-imagine-image`                    | 是（最多 5 張圖片）            | `XAI_API_KEY`                                         |

使用 `action: "list"` 在執行時檢查可用的提供者和模型：

```text
/tool image_generate action=list
```

使用 `action: "status"` 檢查目前工作階段的作用中圖像生成任務：

```text
/tool image_generate action=status
```

## 提供者功能

| 功能              | ComfyUI             | DeepInfra | fal                       | Google        | MiniMax             | OpenAI        | Vydra | xAI           |
| ----------------- | ------------------- | --------- | ------------------------- | ------------- | ------------------- | ------------- | ----- | ------------- |
| 生成 (最大數量)   | 工作流程定義        | 4         | 4                         | 4             | 9                   | 4             | 1     | 4             |
| 編輯 / 參考       | 1 張圖片 (工作流程) | 1 張圖片  | Flux: 1; GPT: 10; NB2: 14 | 最多 5 張圖片 | 1 張圖片 (主體參考) | 最多 5 張圖片 | -     | 最多 5 張圖片 |
| 尺寸控制          | -                   | ✓         | ✓                         | ✓             | -                   | 最高 4K       | -     | -             |
| 長寬比            | -                   | -         | ✓                         | ✓             | ✓                   | -             | -     | ✓             |
| 解析度 (1K/2K/4K) | -                   | -         | ✓                         | ✓             | -                   | -             | -     | 1K, 2K        |

## 工具參數

<ParamField path="prompt" type="string" required>
  圖像生成提示詞。對於 `action: "generate"` 是必需的。
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  使用 `"status"` 檢查活動會話任務，或使用 `"list"` 在運行時檢查 可用的供應商和模型。
</ParamField>
<ParamField path="model" type="string">
  供應商/模型覆蓋（例如 `openai/gpt-image-2`）。對於透明 OpenAI 背景，使用 `openai/gpt-image-1.5`。
</ParamField>
<ParamField path="image" type="string">
  用於編輯模式的單個參考圖像路徑或 URL。
</ParamField>
<ParamField path="images" type="string[]">
  用於編輯模式的多個參考圖像（支援的供應商上最多 5 個）。
</ParamField>
<ParamField path="size" type="string">
  尺寸提示：`1024x1024`、`1536x1024`、`1024x1536`、`2048x2048`、`3840x2160`。
</ParamField>
<ParamField path="aspectRatio" type="string">
  長寬比：`1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`4:5`、`5:4`、`9:16`、`16:9`、`21:9`。
</ParamField>
<ParamField path="resolution" type='"1K" | "2K" | "4K"'>
  解析度提示。
</ParamField>
<ParamField path="quality" type='"low" | "medium" | "high" | "auto"'>
  當供應商支援時的品質提示。
</ParamField>
<ParamField path="outputFormat" type='"png" | "jpeg" | "webp"'>
  當供應商支援時的輸出格式提示。
</ParamField>
<ParamField path="background" type='"transparent" | "opaque" | "auto"'>
  當供應商支援時的背景提示。對於具備透明度能力的供應商，將 `transparent` 與 `outputFormat: "png"` 或 `"webp"` 一起使用。
</ParamField>
<ParamField path="count" type="number">
  要生成的圖像數量（1-4）。
</ParamField>
<ParamField path="timeoutMs" type="number">
  可選的供應商請求逾時時間（毫秒）。當 Codex 通過動態工具呼叫 `image_generate` 時，此每次呼叫的值仍會覆蓋 已配置的預設值，並且上限為 600000 毫秒。
</ParamField>
<ParamField path="filename" type="string">
  輸出檔名提示。
</ParamField>
<ParamField path="openai" type="object">
  僅限 OpenAI 的提示：`background`、`moderation`、`outputCompression` 和 `user`。
</ParamField>

<Note>並非所有提供商都支援所有參數。當備援提供商支援接近的幾何選項而非精確請求的選項時，OpenClaw 會在提交前重新映射至最接近的支援尺寸、長寬比或解析度。對於未宣告支援的提供商，將捨棄不支援的輸出提示，並在工具結果中回報。工具結果會回報套用的設定；`details.normalization` 會擷取任何從請求到套用的轉換。</Note>

## 配置

### 模型選擇

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
        timeoutMs: 180_000,
        fallbacks: ["openrouter/google/gemini-3.1-flash-image-preview", "google/gemini-3.1-flash-image-preview", "fal/fal-ai/flux/dev"],
      },
    },
  },
}
```

### 提供商選擇順序

OpenClaw 會依照以下順序嘗試提供商：

1. 來自工具呼叫的 **`model` 參數**（如果代理指定了其中一個）。
2. 來自配置的 **`imageGenerationModel.primary`**。
3. 依順序排列的 **`imageGenerationModel.fallbacks`**。
4. **自動偵測** - 僅限具備支援的預設提供商：
   - 首先是目前的預設提供商；
   - 其餘已註冊的影像生成提供商，依提供商 ID 排序。

如果提供商失敗（驗證錯誤、速率限制等），將自動嘗試下一個設定的候選者。如果全部失敗，錯誤會包含每次嘗試的詳細資訊。

<AccordionGroup>
  <Accordion title="單次呼叫模型覆寫是精確的">單次呼叫 `model` 覆寫僅會嘗試該提供商/模型，且不會繼續嘗試設定的主要/備援或自動偵測的提供商。</Accordion>
  <Accordion title="自動偵測具有驗證感知能力">只有當 OpenClaw 實際上可以驗證該提供商時，該提供商預設才會進入候選清單。設定 `agents.defaults.mediaGenerationAutoProviderFallback: false` 以僅使用 明確的 `model`、`primary` 和 `fallbacks` 項目。</Accordion>
  <Accordion title="Timeouts">
    針對緩慢的圖片後端設定 `agents.defaults.imageGenerationModel.timeoutMs`。每次呼叫的 `timeoutMs` 工具參數會覆寫設定的預設值。Google、OpenRouter 和 xAI 託管的圖片提供者使用 180 秒的預設值；Azure OpenAI 圖片生成則使用 600 秒。Codex 動態工具呼叫使用 120 秒的 `image_generate` 橋接器預設值，並在設定時遵循相同的逾時預算，且受限於 OpenClaw 的 600000 毫秒動態工具橋接器上限。
  </Accordion>
  <Accordion title="Inspect at runtime">使用 `action: "list"` 來檢查目前註冊的提供者、其預設模型以及認證環境變數提示。</Accordion>
</AccordionGroup>

### 圖像編輯

OpenAI、OpenRouter、Google、DeepInfra、fal、MiniMax、ComfyUI 和 xAI 支援編輯參考圖像。請傳入參考圖像路徑或 URL：

```text
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

OpenAI、OpenRouter、Google 和 xAI 透過 `images` 參數支援最多 5 張參考圖片。fal 對於 Flux 影像轉影像支援 1 張參考圖片，對 GPT Image 2 編輯最多支援 10 張，對 Nano Banana 2 編輯最多支援 14 張。MiniMax 和 ComfyUI 支援 1 張。

## 提供者深度探討

<AccordionGroup>
  <Accordion title="OpenAI gpt-image-2 (以及 gpt-image-1.5)">
    OpenAI 影像生成預設使用 `openai/gpt-image-2`。如果設定了
    `openai-codex` OAuth 設定檔，OpenClaw 會重複使用
    與 Codex 訂閱聊天模型相同的 OAuth 設定檔，並透過 Codex Responses 後端
    發送影像請求。舊版 Codex 基礎 URL（例如 `https://chatgpt.com/backend-api`）會在影像請求時
    標準化為 `https://chatgpt.com/backend-api/codex`。OpenClaw **不會** 針對該請求
    靜默回退到 `OPENAI_API_KEY` —— 若要強制使用直接的 OpenAI Images API 路由，
    請使用 API 金鑰、自訂基礎 URL 或 Azure 端點明確設定
    `models.providers.openai`。

    `openai/gpt-image-1.5`、`openai/gpt-image-1` 和
    `openai/gpt-image-1-mini` 模型仍然可以明確選取。使用
    `gpt-image-1.5` 以取得透明背景的 PNG/WebP 輸出；目前的
    `gpt-image-2` API 會拒絕 `background: "transparent"`。

    `gpt-image-2` 透過相同的 `image_generate` 工具支援
    文字轉影像生成和參考影像編輯。OpenClaw 會將
    `prompt`、`count`、`size`、`quality`、`outputFormat`
    和參考影像轉發至 OpenAI。OpenAI **不會** 直接收到
    `aspectRatio` 或 `resolution`；可能的話，OpenClaw 會將這些
    對應到支援的 `size`，否則工具會將其回報為已忽略的覆寫。

    OpenAI 特定選項位於 `openai` 物件下：

    ```json
    {
      "quality": "low",
      "outputFormat": "jpeg",
      "openai": {
        "background": "opaque",
        "moderation": "low",
        "outputCompression": 60,
        "user": "end-user-42"
      }
    }
    ```

    `openai.background` 接受 `transparent`、`opaque` 或 `auto`；
    透明輸出需要 `outputFormat` `png` 或 `webp` 以及
    支援透明的 OpenAI 影像模型。OpenClaw 會將預設
    `gpt-image-2` 的透明背景請求路由至 `gpt-image-1.5`。
    `openai.outputCompression` 適用於 JPEG/WebP 輸出。

    頂層 `background` 提示與提供者無關，且當選取 OpenAI 提供者時，
    目前會對應到相同的 OpenAI `background` 請求欄位。
    未宣告背景支援的提供者會在 `ignoredOverrides` 中傳回它，而不是
    接收不支援的參數。

    若要透過 Azure OpenAI 部署路由 OpenAI 影像生成
    而非 `api.openai.com`，請參閱
    [Azure OpenAI endpoints](/zh-Hant/providers/openai#azure-openai-endpoints)。

  </Accordion>
  <Accordion title="OpenRouter 影像模型">
    OpenRouter 影像生成使用相同的 `OPENROUTER_API_KEY` 並
    透過 OpenRouter 的聊天補全影像 API 路由。使用
    `openrouter/` 前綴選擇
    OpenRouter 影像模型：

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "openrouter/google/gemini-3.1-flash-image-preview",
          },
        },
      },
    }
    ```

    OpenClaw 會將 `prompt`、`count`、參考影像以及
    Gemini 相容的 `aspectRatio` / `resolution` 提示轉發給 OpenRouter。
    目前的內建 OpenRouter 影像模型捷徑包括
    `google/gemini-3.1-flash-image-preview`、
    `google/gemini-3-pro-image-preview` 和 `openai/gpt-5.4-image-2`。使用
    `action: "list"` 查看您設定的外掛程式提供了什麼。

  </Accordion>
  <Accordion title="MiniMax 雙重驗證">
    MiniMax 影像生成可透過兩個內建的 MiniMax
    驗證路徑使用：

    - `minimax/image-01` 用於 API 金鑰設定
    - `minimax-portal/image-01` 用於 OAuth 設定

  </Accordion>
  <Accordion title="xAI grok-imagine-image">
    隨附的 xAI 提供商對於僅提示詞請求使用 `/v1/images/generations`，並在存在 `image` 或 `images` 時使用 `/v1/images/edits`。

    - 模型：`xai/grok-imagine-image`、`xai/grok-imagine-image-quality`
    - 數量：最多 4 張
    - 參考圖：一個 `image` 或最多五個 `images`
    - 寬高比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
    - 解析度：`1K`、`2K`
    - 輸出：以 OpenClaw 管理的圖片附件形式傳回

    OpenClaw 故意不公開 xAI 原生的 `quality`、`mask`、
    `user` 或額外的原生專用寬高比，直到這些控制項存在於共享的跨提供商 `image_generate` 契約中。

  </Accordion>
</AccordionGroup>

## 範例

<Tabs>
  <Tab title="生成 (4K 橫向)">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="A clean editorial poster for OpenClaw image generation" size=3840x2160 count=1
```
  </Tab>
  <Tab title="生成 (透明 PNG)">
```text
/tool image_generate action=generate model=openai/gpt-image-1.5 prompt="A simple red circle sticker on a transparent background" outputFormat=png background=transparent
```

等效的指令列介面 (CLI)：

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

  </Tab>
  <Tab title="生成 (兩張正方形)">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Two visual directions for a calm productivity app icon" size=1024x1024 count=2
```
  </Tab>
  <Tab title="編輯 (一張參考圖)">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Keep the subject, replace the background with a bright studio setup" image=/path/to/reference.png size=1024x1536
```
  </Tab>
  <Tab title="編輯 (多張參考圖)">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Combine the character identity from the first image with the color palette from the second" images='["/path/to/character.png","/path/to/palette.jpg"]' size=1536x1024
```
  </Tab>
</Tabs>

同樣的 `--output-format` 和 `--background` 標誌可用於 `openclaw infer image edit`；`--openai-background` 仍為 OpenAI 專用別名。除了 OpenAI 之外的隨附提供商目前不宣告明確的背景控制，因此對於這些提供商，`background: "transparent"` 會被回報為已忽略。

## 相關

- [工具概覽](/zh-Hant/tools) - 所有可用的代理程式工具
- [ComfyUI](/zh-Hant/providers/comfy) - 本地 ComfyUI 和 Comfy Cloud 工作流程設定
- [fal](/zh-Hant/providers/fal) - fal 圖片和影片提供商設定
- [Google (Gemini)](/zh-Hant/providers/google) - Gemini 圖片提供商設定
- [MiniMax](/zh-Hant/providers/minimax) - MiniMax 圖片提供商設定
- [OpenAI](/zh-Hant/providers/openai) - OpenAI Images 提供商設定
- [Vydra](/zh-Hant/providers/vydra) - Vydra 圖片、影片和語音設定
- [xAI](/zh-Hant/providers/xai) - Grok 圖片、影片、搜尋、程式碼執行和 TTS 設定
- [設定參考](/zh-Hant/gateway/config-agents#agent-defaults) - `imageGenerationModel` 設定
- [模型](/zh-Hant/concepts/models) - 模型設定與故障轉移
