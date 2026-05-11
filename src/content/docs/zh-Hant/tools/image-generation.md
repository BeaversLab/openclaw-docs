---
summary: "透過 image_generate 跨 OpenAI、Google、fal、MiniMax、ComfyUI、OpenRouter、LiteLLM、xAI、Vydra 生成與編輯圖片"
read_when:
  - Generating or editing images via the agent
  - Configuring image-generation providers and models
  - Understanding the image_generate tool parameters
title: "圖片生成"
sidebarTitle: "圖片生成"
---

`image_generate` 工具可讓代理程式使用您設定的提供者來建立與編輯圖片。生成的圖片會自動以媒體附件的形式傳送於代理程式的回覆中。

<Note>該工具僅在至少有一個圖片生成提供者可用時才會出現。如果您在代理程式的工具中看不到 `image_generate`，請設定 `agents.defaults.imageGenerationModel`，設定提供者 API 金鑰，或使用 OpenAI Codex OAuth 登入。</Note>

## 快速入門

<Steps>
  <Step title="設定認證">
    為至少一個提供者設定 API 金鑰（例如 `OPENAI_API_KEY`、
    `GEMINI_API_KEY`、`OPENROUTER_API_KEY`），或使用 OpenAI Codex OAuth 登入。
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
    了 `openai-codex` OAuth 設定檔時，OpenClaw 會透過該 OAuth 設定檔
    路由圖片請求，而不是先嘗試
    `OPENAI_API_KEY`。明確的 `models.providers.openai` 設定（API 金鑰、
    自訂/Azure 基礎 URL）會選擇回到直接的 OpenAI Images API
    路由。

  </Step>
  <Step title="要求代理程式">
    _"生成一張友善機器人吉祥物的圖片。"_

    代理程式會自動呼叫 `image_generate`。無需將工具加入允許清單 — 當提供者可用時，此功能預設為啟用。

  </Step>
</Steps>

<Warning>對於 LocalAI 等相容 OpenAI 的 LAN 端點，請保留自訂 `models.providers.openai.baseUrl` 並透過 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` 明確選擇加入。私人和 內部圖片端點預設維持封鎖狀態。</Warning>

## 常見路由

| 目標                                    | 模型參照                                           | 認證                                   |
| --------------------------------------- | -------------------------------------------------- | -------------------------------------- |
| 透過 API 計費進行 OpenAI 圖片生成       | `openai/gpt-image-2`                               | `OPENAI_API_KEY`                       |
| 使用 Codex 訂閱驗證進行 OpenAI 影像生成 | `openai/gpt-image-2`                               | OpenAI Codex OAuth                     |
| OpenAI 透明背景 PNG/WebP                | `openai/gpt-image-1.5`                             | `OPENAI_API_KEY` 或 OpenAI Codex OAuth |
| OpenRouter 影像生成                     | `openrouter/google/gemini-3.1-flash-image-preview` | `OPENROUTER_API_KEY`                   |
| LiteLLM 影像生成                        | `litellm/gpt-image-2`                              | `LITELLM_API_KEY`                      |
| Google Gemini 影像生成                  | `google/gemini-3.1-flash-image-preview`            | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`   |

同一個 `image_generate` 工具處理文字轉圖片和參考圖片
編輯。對於單一參考請使用 `image`，或多個參考則使用 `images`。
供應商支援的輸出提示（如 `quality`、`outputFormat` 和
`background`）會在可用時轉發，並在供應商不支援時回報為已忽略。
內建的透明背景支援是 OpenAI 專有的；如果其他供應商的後端輸出 alpha 通
道，仍可能保留 PNG alpha。

## 支援的供應商

| 供應商     | 預設模型                                | 編輯支援                     | 驗證                                                  |
| ---------- | --------------------------------------- | ---------------------------- | ----------------------------------------------------- |
| ComfyUI    | `workflow`                              | 是（1 張圖片，工作流程配置） | 雲端使用 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY`     |
| fal        | `fal-ai/flux/dev`                       | 是                           | `FAL_KEY`                                             |
| Google     | `gemini-3.1-flash-image-preview`        | 是                           | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                  |
| LiteLLM    | `gpt-image-2`                           | 是（最多 5 張輸入圖片）      | `LITELLM_API_KEY`                                     |
| MiniMax    | `image-01`                              | 是（主體參考）               | `MINIMAX_API_KEY` 或 MiniMax OAuth (`minimax-portal`) |
| OpenAI     | `gpt-image-2`                           | 是（最多 4 張圖片）          | `OPENAI_API_KEY` 或 OpenAI Codex OAuth                |
| OpenRouter | `google/gemini-3.1-flash-image-preview` | 是（最多 5 張輸入圖片）      | `OPENROUTER_API_KEY`                                  |
| Vydra      | `grok-imagine`                          | 否                           | `VYDRA_API_KEY`                                       |
| xAI        | `grok-imagine-image`                    | 是 (最多 5 張圖片)           | `XAI_API_KEY`                                         |

使用 `action: "list"` 在執行時檢查可用的提供者和模型：

```text
/tool image_generate action=list
```

## 提供者功能

| 功能              | ComfyUI           | fal          | Google        | MiniMax             | OpenAI        | Vydra | xAI           |
| ----------------- | ----------------- | ------------ | ------------- | ------------------- | ------------- | ----- | ------------- |
| 生成 (最大數量)   | 工作流定義        | 4            | 4             | 9                   | 4             | 1     | 4             |
| 編輯 / 參考       | 1 張圖片 (工作流) | 1 張圖片     | 最多 5 張圖片 | 1 張圖片 (主體參考) | 最多 5 張圖片 | —     | 最多 5 張圖片 |
| 尺寸控制          | —                 | ✓            | ✓             | —                   | 最高 4K       | —     | —             |
| 長寬比            | —                 | ✓ (僅限生成) | ✓             | ✓                   | —             | —     | ✓             |
| 解析度 (1K/2K/4K) | —                 | ✓            | ✓             | —                   | —             | —     | 1K, 2K        |

## 工具參數

<ParamField path="prompt" type="string" required>
  影像生成提示。`action: "generate"` 必填。
</ParamField>
<ParamField path="action" type='"generate" | "list"' default="generate">
  使用 `"list"` 在執行時檢查可用的提供者與模型。
</ParamField>
<ParamField path="model" type="string">
  提供者/模型覆寫（例如 `openai/gpt-image-2`）。使用 `openai/gpt-image-1.5` 以取得透明的 OpenAI 背景。
</ParamField>
<ParamField path="image" type="string">
  編輯模式的單一參考影像路徑或 URL。
</ParamField>
<ParamField path="images" type="string[]">
  編輯模式的多個參考影像（支援的提供者最多 5 個）。
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
  提供者支援時的品質提示。
</ParamField>
<ParamField path="outputFormat" type='"png" | "jpeg" | "webp"'>
  提供者支援時的輸出格式提示。
</ParamField>
<ParamField path="background" type='"transparent" | "opaque" | "auto"'>
  提供者支援時的背景提示。對支援透明度的提供者，請將 `transparent` 與 `outputFormat: "png"` 或 `"webp"` 搭配使用。
</ParamField>
<ParamField path="count" type="number">
  要產生的影像數量 (1–4)。
</ParamField>
<ParamField path="timeoutMs" type="number">
  選用性提供者請求逾時（毫秒）。
</ParamField>
<ParamField path="filename" type="string">
  輸出檔名提示。
</ParamField>
<ParamField path="openai" type="object">
  僅限 OpenAI 的提示：`background`、`moderation`、`outputCompression` 和 `user`。
</ParamField>

<Note>並非所有供應商都支援所有參數。當備援供應商支援的幾何選項與精確請求的選項相近時，OpenClaw 會在提交前重新對應至最接近的支援尺寸、寬高比或解析度。對於未宣告支援的供應商，不支援的輸出提示會被捨棄，並在工具結果中回報。工具結果會回報套用的設定；`details.normalization` 會擷取任何從請求到套用的轉換。</Note>

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

### 供應商選擇順序

OpenClaw 會依照以下順序嘗試供應商：

1. 來自工具呼叫的 **`model` 參數**（如果代理程式指定了參數）。
2. 來自設定的 **`imageGenerationModel.primary`**。
3. 依序排列的 **`imageGenerationModel.fallbacks`**。
4. **自動偵測** — 僅限具備驗證支援的供應商預設值：
   - 首先使用目前的預設供應商；
   - 其餘已註冊的影像生成供應商，依供應商 ID 順序排列。

如果供應商失敗（驗證錯誤、速率限制等），系統會自動嘗試下一個設定的候選項。如果全部失敗，錯誤訊息會包含每次嘗試的詳細資訊。

<AccordionGroup>
  <Accordion title="單次呼叫的模型覆寫是精確的">單次呼叫的 `model` 覆寫僅會嘗試該供應商/模型，不會繼續嘗試設定的主要/備援或自動偵測的供應商。</Accordion>
  <Accordion title="自動偵測具備驗證感知能力">只有當 OpenClaw 實際上能對該供應商進行驗證時，供應商預設值才會進入候選清單。設定 `agents.defaults.mediaGenerationAutoProviderFallback: false` 以僅使用 明確的 `model`、`primary` 和 `fallbacks` 項目。</Accordion>
  <Accordion title="逾時">為緩慢的影像後端設定 `agents.defaults.imageGenerationModel.timeoutMs`。單次呼叫的 `timeoutMs` 工具參數會覆寫設定的預設值。</Accordion>
  <Accordion title="Inspect at runtime">使用 `action: "list"` 來檢視目前註冊的提供者、 其預設模型以及 auth env-var 提示。</Accordion>
</AccordionGroup>

### 圖片編輯

OpenAI、OpenRouter、Google、fal、MiniMax、ComfyUI 和 xAI 支援編輯
參考圖片。傳入參考圖片路徑或 URL：

```text
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

OpenAI、OpenRouter、Google 和 xAI 透過
`images` 參數支援最多 5 張參考圖片。fal、MiniMax 和 ComfyUI 支援 1 張。

## 提供者深度解析

<AccordionGroup>
  <Accordion title="OpenAI gpt-image-2 (及 gpt-image-1.5)">
    OpenAI 影像生成預設為 `openai/gpt-image-2`。如果設定了
    `openai-codex` OAuth 設定檔，OpenClaw 會重複使用 Codex 訂閱聊天模型所使用的同一個
    OAuth 設定檔，並透過 Codex Responses 後端傳送
    影像請求。舊版 Codex 基礎
    URL（例如 `https://chatgpt.com/backend-api`）會針對
    影像請求規範化為
    `https://chatgpt.com/backend-api/codex`。OpenClaw
    對於該請求**不會**無聲地回退到 `OPENAI_API_KEY` —
    若要強制直接路由至 OpenAI Images API，請使用 API 金鑰、自訂基礎 URL
    或 Azure 端點明確設定
    `models.providers.openai`。

    `openai/gpt-image-1.5`、`openai/gpt-image-1` 和
    `openai/gpt-image-1-mini` 模型仍然可以明確選取。請使用
    `gpt-image-1.5` 來取得透明背景的 PNG/WebP 輸出；目前的
    `gpt-image-2` API 會拒絕 `background: "transparent"`。

    `gpt-image-2` 透過同一個 `image_generate` 工具支援文字轉影像生成
    和參考影像編輯。
    OpenClaw 會將 `prompt`、`count`、`size`、`quality`、`outputFormat`
    和參考影像轉發給 OpenAI。OpenAI **不會**直接接收
    `aspectRatio` 或 `resolution`；只要有可能，OpenClaw 會將
    其對應到支援的 `size`，否則工具會將其回報為
    已忽略的覆寫值。

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
    具備透明功能的 OpenAI 影像模型。OpenClaw 會將預設
    `gpt-image-2` 透明背景請求路由至 `gpt-image-1.5`。
    `openai.outputCompression` 適用於 JPEG/WebP 輸出。

    頂層 `background` 提示與供應商無關，當選取
    OpenAI 供應商時，目前會對應到相同的 OpenAI `background` 請求欄位。
    未宣告背景支援的供應商會在 `ignoredOverrides` 中傳回該提示，
    而非接收不支援的參數。

    若要透過 Azure OpenAI 部署
    而非 `api.openai.com` 路由 OpenAI 影像生成，請參閱
    [Azure OpenAI endpoints](/zh-Hant/providers/openai#azure-openai-endpoints)。

  </Accordion>
  <Accordion title="OpenRouter 影像模型">
    OpenRouter 影像生成使用相同的 `OPENROUTER_API_KEY` 並
    透過 OpenRouter 的聊天完成影像 API 路由。使用 `openrouter/` 前綴選擇
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

    OpenClaw 會將 `prompt`、`count`、參考影像，以及
    Gemini 相容的 `aspectRatio` / `resolution` 提示轉發至 OpenRouter。
    目前內建的 OpenRouter 影像模型捷徑包括
    `google/gemini-3.1-flash-image-preview`、
    `google/gemini-3-pro-image-preview` 和 `openai/gpt-5.4-image-2`。請使用
    `action: "list"` 來查看您設定的外掛程式提供了什麼。

  </Accordion>
  <Accordion title="MiniMax 雙重驗證">
    MiniMax 影像生成可透過兩種內建的 MiniMax
    驗證路徑使用：

    - `minimax/image-01` 用於 API 金鑰設定
    - `minimax-portal/image-01` 用於 OAuth 設定

  </Accordion>
  <Accordion title="xAI grok-imagine-image">
    內建的 xAI 提供者對僅提示詞請求使用 `/v1/images/generations`，並在存在 `image` 或 `images` 時使用 `/v1/images/edits`。

    - 模型：`xai/grok-imagine-image`、`xai/grok-imagine-image-pro`
    - 數量：最多 4
    - 參考圖片：一張 `image` 或最多五張 `images`
    - 長寬比：`1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`2:3`、`3:2`
    - 解析度：`1K`、`2K`
    - 輸出：以 OpenClaw 管理的圖片附件形式回傳

    OpenClaw 故意不公開 xAI 原生的 `quality`、`mask`、
    `user` 或額外的僅限原生長寬比，直到共用跨提供者 `image_generate` 合約中存在這些控制項為止。

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
</Tabs>

`--output-format` 和 `--background` 標誌也可用於
`openclaw infer image edit`；`--openai-background` 仍保留為
OpenAI 專用的別名。除了 OpenAI 以外的內建提供者目前尚未宣告明確的背景控制，因此針對它們會將 `background: "transparent"` 回報為已忽略。

## 相關

- [工具概述](/zh-Hant/tools) — 所有可用的 Agent 工具
- [ComfyUI](/zh-Hant/providers/comfy) — 本地端 ComfyUI 和 Comfy Cloud 工作流程設定
- [fal](/zh-Hant/providers/fal) — fal 影像和視訊提供者設定
- [Google (Gemini)](/zh-Hant/providers/google) — Gemini 影像提供者設定
- [MiniMax](/zh-Hant/providers/minimax) — MiniMax 影像提供者設定
- [OpenAI](/zh-Hant/providers/openai) — OpenAI Images 提供者設定
- [Vydra](/zh-Hant/providers/vydra) — Vydra 影像、視訊和語音設定
- [xAI](/zh-Hant/providers/xai) — Grok 影像、視訊、搜尋、程式碼執行和 TTS 設定
- [設定參考](/zh-Hant/gateway/config-agents#agent-defaults) — `imageGenerationModel` 設定
- [模型](/zh-Hant/concepts/models) — 模型設定和容錯移轉
