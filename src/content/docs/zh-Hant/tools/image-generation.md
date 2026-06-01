---
summary: "透過 image_generate 跨 OpenAI、Google、fal、MiniMax、ComfyUI、DeepInfra、OpenRouter、LiteLLM、xAI、Vydra 生成及編輯圖片"
read_when:
  - Generating or editing images via the agent
  - Configuring image-generation providers and models
  - Understanding the image_generate tool parameters
title: "圖片生成"
sidebarTitle: "圖片生成"
---

`image_generate` 工具讓代理程式使用您設定的提供者來建立和編輯圖片。在聊天對話中，圖片生成會非同步執行：OpenClaw 會記錄一個背景任務，立即傳回任務 ID，並在提供者完成時喚醒代理程式。完成代理程式必須透過 `message` 工具傳送生成的圖片。如果請求者的對話不活躍或其主動喚醒失敗，且仍有部分生成的圖片未透過訊息工具傳遞，OpenClaw 會傳送一個僅包含缺失圖片的冪等直接回退。

<Note>此工具僅在至少有一個圖片生成提供者可用時才會出現。如果您在代理程式的工具中看不到 `image_generate`，請設定 `agents.defaults.imageGenerationModel`、設定提供者 API 金鑰，或使用 OpenAI Codex OAuth 登入。</Note>

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
    `openai-codex` OAuth 設定檔時，OpenClaw 會透過該 OAuth 設定檔
    路由圖片請求，而不是先嘗試 `OPENAI_API_KEY`。明確的
    `models.providers.openai` 設定（API 金鑰、自訂/Azure 基礎 URL）會選回
    直接 OpenAI Images API 路由。

  </Step>
  <Step title="要求代理">
    _「生成一張友善的機器人吉祥物圖片。」_

    代理會自動呼叫 `image_generate`。不需要工具允許清單（allow-listing）——當有提供者可用時，此工具預設為啟用。該工具會傳回一個背景任務 ID，然後完成代理會在準備好時透過 `message` 工具傳送生成的附件。

  </Step>
</Steps>

<Warning>對於諸如 LocalAI 等 OpenAI 相容的 LAN 端點，請保留自訂的 `models.providers.openai.baseUrl` 並透過 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` 明確選擇加入。私人 和內部圖片端點預設仍會被封鎖。</Warning>

## 常見路由

| 目標                                    | 模型參照                                           | 認證                                   |
| --------------------------------------- | -------------------------------------------------- | -------------------------------------- |
| 透過 API 計費進行 OpenAI 圖片生成       | `openai/gpt-image-2`                               | `OPENAI_API_KEY`                       |
| 使用 Codex 訂閱驗證進行 OpenAI 影像生成 | `openai/gpt-image-2`                               | OpenAI Codex OAuth                     |
| OpenAI 透明背景 PNG/WebP                | `openai/gpt-image-1.5`                             | `OPENAI_API_KEY` 或 OpenAI Codex OAuth |
| DeepInfra 圖片生成                      | `deepinfra/black-forest-labs/FLUX-1-schnell`       | `DEEPINFRA_API_KEY`                    |
| fal Krea 2 表達/風格導向生成            | `fal/krea/v2/medium/text-to-image`                 | `FAL_KEY`                              |
| OpenRouter 圖片生成                     | `openrouter/google/gemini-3.1-flash-image-preview` | `OPENROUTER_API_KEY`                   |
| LiteLLM 圖片生成                        | `litellm/gpt-image-2`                              | `LITELLM_API_KEY`                      |
| Google Gemini 圖片生成                  | `google/gemini-3.1-flash-image-preview`            | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`   |

同一個 `image_generate` 工具處理文字轉圖片和參考圖片
編輯。對於單一參考請使用 `image`，或對於多個參考使用 `images`。
對於 fal 上的 Krea 2 模型，這些參考會作為風格參考
發送，而不是編輯輸入。
當提供者支援時，提供者支援的輸出提示（如 `quality`、`outputFormat` 和
`background`）會被轉發，當提供者不支援時則會回報為已忽略。內建的透明背景支援是
OpenAI 專屬的；如果他們的
後端輸出 PNG alpha 通道，其他提供者可能仍會保留它。

## 支援的提供者

| 提供者     | 預設模型                                | 編輯支援                     | 驗證                                                  |
| ---------- | --------------------------------------- | ---------------------------- | ----------------------------------------------------- |
| ComfyUI    | `workflow`                              | 是（1 張圖片，工作流程設定） | `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` 用於雲端     |
| DeepInfra  | `black-forest-labs/FLUX-1-schnell`      | 是（1 張圖片）               | `DEEPINFRA_API_KEY`                                   |
| fal        | `fal-ai/flux/dev`                       | 是（模型特定限制）           | `FAL_KEY`                                             |
| Google     | `gemini-3.1-flash-image-preview`        | 是                           | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                  |
| LiteLLM    | `gpt-image-2`                           | 是（最多 5 張輸入圖片）      | `LITELLM_API_KEY`                                     |
| MiniMax    | `image-01`                              | 是（主體參考）               | `MINIMAX_API_KEY` 或 MiniMax OAuth (`minimax-portal`) |
| OpenAI     | `gpt-image-2`                           | 是（最多 4 張圖片）          | `OPENAI_API_KEY` 或 OpenAI Codex OAuth                |
| OpenRouter | `google/gemini-3.1-flash-image-preview` | 是（最多 5 張輸入圖片）      | `OPENROUTER_API_KEY`                                  |
| Vydra      | `grok-imagine`                          | 否                           | `VYDRA_API_KEY`                                       |
| xAI        | `grok-imagine-image`                    | 是（最多 5 張圖片）          | `XAI_API_KEY`                                         |

使用 `action: "list"` 來檢查執行時可用的供應商與模型：

```text
/tool image_generate action=list
```

使用 `action: "status"` 來檢查目前工作階段的活躍圖像生成任務：

```text
/tool image_generate action=status
```

## 供應商功能

| 功能              | ComfyUI              | DeepInfra | fal                                            | Google        | MiniMax              | OpenAI        | Vydra | xAI           |
| ----------------- | -------------------- | --------- | ---------------------------------------------- | ------------- | -------------------- | ------------- | ----- | ------------- |
| 生成（最大數量）  | 工作流程定義         | 4         | 4                                              | 4             | 9                    | 4             | 1     | 4             |
| 編輯 / 參考       | 1 張圖片（工作流程） | 1 張圖片  | Flux: 1; GPT: 10; Krea style refs: 10; NB2: 14 | 最多 5 張圖片 | 1 張圖片（主體參考） | 最多 5 張圖片 | -     | 最多 5 張圖片 |
| 尺寸控制          | -                    | ✓         | ✓                                              | ✓             | -                    | 最高 4K       | -     | -             |
| 長寬比            | -                    | -         | ✓                                              | ✓             | ✓                    | -             | -     | ✓             |
| 解析度 (1K/2K/4K) | -                    | -         | ✓                                              | ✓             | -                    | -             | -     | 1K, 2K        |

## 工具參數

<ParamField path="prompt" type="string" required>
  圖像生成提示詞。`action: "generate"` 必填。
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  使用 `"status"` 檢查作用中階段任務，或使用 `"list"` 在執行時檢查 可用的提供者和模型。
</ParamField>
<ParamField path="model" type="string">
  提供者/模型覆寫（例如 `openai/gpt-image-2`）。使用 `openai/gpt-image-1.5` 以取得透明的 OpenAI 背景。
</ParamField>
<ParamField path="image" type="string">
  編輯模式的單一參考圖片路徑或 URL。
</ParamField>
<ParamField path="images" type="string[]">
  編輯模式或樣式參考模型的參考圖片（透過共用工具最多 10 張；提供者特定的限制仍然適用）。
</ParamField>
<ParamField path="size" type="string">
  尺寸提示：`1024x1024`、`1536x1024`、`1024x1536`、`2048x2048`、`3840x2160`。
</ParamField>
<ParamField path="aspectRatio" type="string">
  長寬比：`1:1`、`2:3`、`3:2`、`2.35:1`、`3:4`、`4:3`、`4:5`、 `5:4`、`9:16`、`16:9`、`21:9`、`4:1`、`1:4`、`8:1`、`1:8`。提供者 會驗證其模型特定的子集。
</ParamField>
<ParamField path="resolution" type='"1K" | "2K" | "4K"'>
  解析度提示。
</ParamField>
<ParamField path="quality" type='"low" | "medium" | "high" | "auto"'>
  當提供者支援時的品質提示。
</ParamField>
<ParamField path="outputFormat" type='"png" | "jpeg" | "webp"'>
  當提供者支援時的輸出格式提示。
</ParamField>
<ParamField path="background" type='"transparent" | "opaque" | "auto"'>
  當提供者支援時的背景提示。對於支援透明度的提供者，請將 `transparent` 與 `outputFormat: "png"` 或 `"webp"` 搭配使用。
</ParamField>
<ParamField path="count" type="number">
  要生成的圖片數量 (1-4)。
</ParamField>
<ParamField path="timeoutMs" type="number">
  選用的提供者請求逾時時間（毫秒）。當 Codex 透過動態工具呼叫 `image_generate` 時，此單次呼叫值仍會覆寫 設定的預設值，並上限為 600000 毫秒。
</ParamField>
<ParamField path="filename" type="string">
  輸出檔名提示。
</ParamField>
<ParamField path="openai" type="object">
  僅限 OpenAI 的提示：`background`、`moderation`、`outputCompression` 和 `user`。
</ParamField>
<ParamField path="fal.creativity" type='"raw" | "low" | "medium" | "high"'>
  fal Krea 2 創意控制。預設為 `medium`。
</ParamField>

<Note>並非所有提供者都支援所有參數。當後備提供者支援的幾何選項接近而非完全符合請求時，OpenClaw 會在提交前重新對應至最接近的支援尺寸、長寬比或解析度。對於未宣告支援的提供者，不支援的輸出提示將會被捨棄，並回報在工具結果中。工具結果會回報套用的設定；`details.normalization` 捕獲任何從請求到套用的轉譯。</Note>

## 設定

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

### 提供者選擇順序

OpenClaw 會依此順序嘗試提供者：

1. 工具呼叫中的 **`model` 參數**（如果代理程式指定了一個）。
2. 來自設定的 **`imageGenerationModel.primary`**。
3. 依順序排列的 **`imageGenerationModel.fallbacks`**。
4. **自動偵測** - 僅限具備認證支援的提供者預設值：
   - 首先是目前的預設提供者；
   - 其餘已註冊的圖像生成提供者依提供者 ID 順序排列。

如果提供者失敗（認證錯誤、速率限制等），會自動嘗試下一個設定的候選者。如果全部失敗，錯誤會包含每次嘗試的詳細資訊。

<AccordionGroup>
  <Accordion title="每次呼叫的模型覆寫是精確的">每次呼叫的 `model` 覆寫僅嘗試該提供者/模型，而不會繼續嘗試設定的主要/後備或自動偵測的提供者。</Accordion>
  <Accordion title="自動偵測具備認證感知能力">只有當 OpenClaw 實際上能對該提供者進行驗證時，提供者預設值才會進入候選清單。設定 `agents.defaults.mediaGenerationAutoProviderFallback: false` 以僅使用 明確的 `model`、`primary` 和 `fallbacks` 項目。</Accordion>
  <Accordion title="Timeouts">
    針對緩慢的影像後端設定 `agents.defaults.imageGenerationModel.timeoutMs`。每次呼叫的 `timeoutMs` 工具參數會覆寫設定的預設值，而設定的預設值會覆寫外掛撰寫的提供者預設值。Google 和 OpenRouter 託管的影像提供者使用 180 秒的預設值；xAI 和 Azure OpenAI 影像生成使用 600 秒。Codex 動態工具呼叫使用 120 秒的 `image_generate` 橋接預設值，且在設定時遵守相同的逾時預算，以 OpenClaw 的 600000
    毫秒動態工具橋接最大值為上限。
  </Accordion>
  <Accordion title="Inspect at runtime">使用 `action: "list"` 來檢查目前註冊的提供者、其預設模型以及 auth env-var 提示。</Accordion>
</AccordionGroup>

### 影像編輯

OpenAI、OpenRouter、Google、DeepInfra、fal、MiniMax、ComfyUI 和 xAI 支援編輯參考影像。fal 上的 Krea 2 模型使用相同的 `image` / `images` 欄位作為風格參考，而非編輯輸入。請傳入參考影像路徑或 URL：

```text
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

OpenAI、OpenRouter、Google 和 xAI 透過 `images` 參數支援最多 5 張參考影像。fal 支援 1 張用於 Flux 影像轉影像的參考影像，GPT Image 2 編輯最多 10 張，Krea 2 最多 10 個風格參考，Nano Banana 2 編輯最多 14 張。MiniMax 和 ComfyUI 支援 1 張。

## 提供者深度解析

<AccordionGroup>
  <Accordion title="OpenAI gpt-image-2 (和 gpt-image-1.5)">
    OpenAI 圖像生成預設為 `openai/gpt-image-2`。如果已設定
    `openai-codex` OAuth 設定檔，OpenClaw 會重複使用
    Codex 訂閱聊天模型所使用的相同 OAuth 設定檔，並透過 Codex Responses 後端
    傳送圖像請求。舊版 Codex 基礎 URL（例如 `https://chatgpt.com/backend-api`）會
    規範化為 `https://chatgpt.com/backend-api/codex` 以用於圖像請求。針對該請求，
    OpenClaw **不會** 無聲回退至 `OPENAI_API_KEY` ——
    若要強制直接路由至 OpenAI Images API，請使用 API 金鑰、自訂基礎 URL
    或 Azure 端點明確設定 `models.providers.openai`。

    仍可明確選取 `openai/gpt-image-1.5`、`openai/gpt-image-1` 和
    `openai/gpt-image-1-mini` 模型。使用
    `gpt-image-1.5` 以取得透明背景的 PNG/WebP 輸出；目前的
    `gpt-image-2` API 會拒絕 `background: "transparent"`。

    `gpt-image-2` 支援透過相同的 `image_generate` 工具
    進行文字轉圖像生成與參考圖像編輯。
    OpenClaw 會將 `prompt`、`count`、`size`、`quality`、`outputFormat`
    和參考圖像轉發給 OpenAI。OpenAI **不會** 直接接收
    `aspectRatio` 或 `resolution`；若可能，OpenClaw
    會將其對應至支援的 `size`，否則工具會將其回報為
    已忽略的覆寫。

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
    支援透明度的 OpenAI 圖像模型。OpenClaw 會將預設的
    `gpt-image-2` 透明背景請求路由至 `gpt-image-1.5`。
    `openai.outputCompression` 適用於 JPEG/WebP 輸出，對於
    PNG 輸出則予以忽略。

    頂層 `background` 提示與供應商無關，且當選取
    OpenAI 供應商時，目前會對應至相同的 OpenAI `background` 請求欄位。
    未宣告背景支援的供應商會在 `ignoredOverrides` 中回傳該提示，
    而非接收不支援的參數。

    若要透過 Azure OpenAI 部署路由 OpenAI 圖像生成
    而非 `api.openai.com`，請參閱
    [Azure OpenAI endpoints](/zh-Hant/providers/openai#azure-openai-endpoints)。

  </Accordion>
  <Accordion title="OpenRouter 影像模型">
    OpenRouter 影像生成使用相同的 `OPENROUTER_API_KEY` 並透過
    OpenRouter 的聊天完成影像 API 進行路由。請使用
    `openrouter/` 前綴選擇 OpenRouter 影像模型：

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
    相容 Gemini 的 `aspectRatio` / `resolution` 提示轉發給 OpenRouter。
    目前的內建 OpenRouter 影像模型捷徑包括
    `google/gemini-3.1-flash-image-preview`、
    `google/gemini-3-pro-image-preview` 和 `openai/gpt-5.4-image-2`。請使用
    `action: "list"` 查看您設定的外掛提供了哪些功能。

  </Accordion>
  <Accordion title="fal Krea 2">
    fal 上的 Krea 2 模型使用 fal 的原生 Krea schema，而不是 Flux 使用的通用
    `image_size` schema。OpenClaw 會傳送：

    - 用於長寬比提示的 `aspect_ratio`
    - `creativity`，預設為 `medium`
    - 當提供 `image` 或 `images` 時的 `image_style_references`

    選擇 Krea 2 Medium 以獲得更快的表現力插圖，選擇 Krea 2 Large
    以獲得較慢但更精細的照片寫實質感外觀：

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "fal/krea/v2/medium/text-to-image",
          },
        },
      },
    }
    ```

    Krea 2 目前每次請求會傳回一張影像。Krea 建議優先使用 `aspectRatio`；
    OpenClaw 會將 `size` 對應到最接近支援的 Krea 長寬比，並對於
    Krea 拒絕 `resolution` 而非將其捨棄。當您想要原生的 Krea 創意等級時，請使用 `fal.creativity`：

    ```json
    {
      "model": "fal/krea/v2/medium/text-to-image",
      "prompt": "A cyber zine portrait with risograph texture",
      "aspectRatio": "9:16",
      "fal": {
        "creativity": "high"
      }
    }
    ```

  </Accordion>
  <Accordion title="MiniMax 雙重驗證">
    MiniMax 影像生成可透過兩種內建的 MiniMax 驗證途徑使用：

    - 用於 API 金鑰設定的 `minimax/image-01`
    - 用於 OAuth 設定的 `minimax-portal/image-01`

  </Accordion>
  <Accordion title="xAI grok-imagine-image">
    內建的 xAI 供應商對於僅提示詞請求使用 `/v1/images/generations`，而在存在 `image` 或 `images` 時使用 `/v1/images/edits`。

    - 模型：`xai/grok-imagine-image`、`xai/grok-imagine-image-quality`
    - 數量：最多 4 張
    - 參考：一個 `image` 或最多五個 `images`
    - 寬高比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
    - 解析度：`1K`、`2K`
    - 輸出：作為 OpenClaw 管理的圖片附件返回

    OpenClaw 故意不公開 xAI 原生的 `quality`、`mask`、`user` 或額外的僅原生寬高比，直到這些控制項存在於共用的跨供應商 `image_generate` 合約中。

  </Accordion>
</AccordionGroup>

## 範例

<Tabs>
  <Tab title="Generate (4K landscape)">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="A clean editorial poster for OpenClaw image generation" size=3840x2160 count=1
```
  </Tab>
  <Tab title="Generate (transparent PNG)">
```text
/tool image_generate action=generate model=openai/gpt-image-1.5 prompt="A simple red circle sticker on a transparent background" outputFormat=png background=transparent
```

等效 CLI：

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

  </Tab>
  <Tab title="Generate (two square)">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Two visual directions for a calm productivity app icon" size=1024x1024 count=2
```
  </Tab>
  <Tab title="Edit (one reference)">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Keep the subject, replace the background with a bright studio setup" image=/path/to/reference.png size=1024x1536
```
  </Tab>
  <Tab title="Edit (multiple references)">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Combine the character identity from the first image with the color palette from the second" images='["/path/to/character.png","/path/to/palette.jpg"]' size=1536x1024
```
  </Tab>
  <Tab title="Krea style references">
```text
/tool image_generate action=generate model=fal/krea/v2/medium/text-to-image prompt="An expressive editorial portrait using this color palette and print texture" images='["/path/to/palette.png","/path/to/texture.jpg"]' aspectRatio=9:16 fal='{"creativity":"high"}'
```
  </Tab>
</Tabs>

`openclaw infer image edit` 上也提供相同的 `--output-format` 和 `--background` 標誌；`--openai-background` 仍作為 OpenAI 專用的別名。OpenAI 以外的打包提供者目前未宣告明確的背景控制，因此會將 `background: "transparent"` 回報為已忽略。

## 相關

- [工具概覽](/zh-Hant/tools) - 所有可用的代理工具
- [ComfyUI](/zh-Hant/providers/comfy) - 本地 ComfyUI 和 Comfy Cloud 工作流程設定
- [fal](/zh-Hant/providers/fal) - fal 圖像和影片提供者設定
- [Google (Gemini)](/zh-Hant/providers/google) - Gemini 圖像提供者設定
- [MiniMax](/zh-Hant/providers/minimax) - MiniMax 圖像提供者設定
- [OpenAI](/zh-Hant/providers/openai) - OpenAI Images 提供者設定
- [Vydra](/zh-Hant/providers/vydra) - Vydra 圖像、影片和語音設定
- [xAI](/zh-Hant/providers/xai) - Grok 圖像、影片、搜尋、程式碼執行和 TTS 設定
- [組態參考](/zh-Hant/gateway/config-agents#agent-defaults) - `imageGenerationModel` 組態
- [模型](/zh-Hant/concepts/models) - 模型組態和故障轉移
