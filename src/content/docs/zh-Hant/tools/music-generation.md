---
summary: "透過 ComfyUI、fal、Google Lyria、MiniMax 和 OpenRouter 工作流程，使用 music_generate 生成音樂"
read_when:
  - Generating music or audio via the agent
  - Configuring music-generation providers and models
  - Understanding the music_generate tool parameters
title: "音樂生成"
sidebarTitle: "音樂生成"
---

`music_generate` 工具允許代理透過已設定的提供者（目前包括 ComfyUI、fal、Google、MiniMax 和 OpenRouter）使用共享的音樂生成功能來建立音樂或音訊。

對於具有會話支援的代理程式執行，OpenClaw 會將音樂生成啟動為
背景任務，在任務帳本中追蹤它，然後在音軌準備就緒時再次喚醒代理程式，
以便代理程式可以通知用戶並附加完成的音訊。完成代理程式遵循會話的正常可見回覆
模式：配置時自動傳送最終回覆，或當會話需要訊息工具時使用 `message(action="send")`。
如果請求者的會話處於非活動狀態或其主動喚醒失敗，並且某些生成的音訊仍然從
完成回覆中缺失，OpenClaw 會發送一個僅包含缺失音訊的冪等直接後備。

<Note>內建共享工具僅在至少有一個音樂生成供應商可用時才會出現。如果您在代理程式的 工具中看不到 `music_generate`，請配置 `agents.defaults.musicGenerationModel` 或設置 供應商 API 金鑰。</Note>

## 快速入門

<Tabs>
  <Tab title="Shared provider-backed">
    <Steps>
      <Step title="Configure auth">
        為至少一個供應商設置 API 金鑰 — 例如
        `GEMINI_API_KEY` 或 `MINIMAX_API_KEY`。
      </Step>
      <Step title="Pick a default model (optional)">
        ```json5
        {
          agents: {
            defaults: {
              musicGenerationModel: {
                primary: "google/lyria-3-clip-preview",
              },
            },
          },
        }
        ```
      </Step>
      <Step title="Ask the agent">
        _「生成一首關於夜間駕駛穿過
        霓虹城市的歡快合成器流行音軌。」_

        代理程式會自動呼叫 `music_generate`。不需要工具
        允許清單。
      </Step>
    </Steps>

    對於沒有會話支援代理程式執行的直接同步上下文，
    內建工具仍然會後退到內聯生成並在工具結果中返回
    最終媒體路徑。

  </Tab>
  <Tab title="ComfyUI 工作流程">
    <Steps>
      <Step title="設定工作流程">
        使用工作流程 JSON 和提示/輸出節點設定 `plugins.entries.comfy.config.music`。
      </Step>
      <Step title="雲端驗證（選用）">
        對於 Comfy Cloud，請設定 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY`。
      </Step>
      <Step title="呼叫工具">
        ```text
        /tool music_generate prompt="Warm ambient synth loop with soft tape texture"
        ```
      </Step>
    </Steps>
  </Tab>
</Tabs>

提示詞範例：

```text
Generate a cinematic piano track with soft strings and no vocals.
```

```text
Generate an energetic chiptune loop about launching a rocket at sunrise.
```

## 支援的提供商

| 提供商     | 預設模型                     | 參考輸入       | 支援的控制項                                          | 驗證                                   |
| ---------- | ---------------------------- | -------------- | ----------------------------------------------------- | -------------------------------------- |
| ComfyUI    | `workflow`                   | 最多 1 張圖片  | 工作流程定義的音樂或音訊                              | `COMFY_API_KEY`, `COMFY_CLOUD_API_KEY` |
| fal        | `fal-ai/minimax-music/v2.6`  | 無             | `lyrics`, `instrumental`, `durationSeconds`, `format` | `FAL_KEY` 或 `FAL_API_KEY`             |
| Google     | `lyria-3-clip-preview`       | 最多 10 張圖片 | `lyrics`, `instrumental`, `format`                    | `GEMINI_API_KEY`, `GOOGLE_API_KEY`     |
| MiniMax    | `music-2.6`                  | 無             | `lyrics`, `instrumental`, `format=mp3`                | `MINIMAX_API_KEY` 或 MiniMax OAuth     |
| OpenRouter | `google/lyria-3-pro-preview` | 最多 1 張圖片  | `lyrics`, `instrumental`, `durationSeconds`, `format` | `OPENROUTER_API_KEY`                   |

### 功能矩陣

`music_generate`、合約測試和共用即時 sweep 所使用的明確模式合約：

| 提供者     | `generate` | `edit` | 編輯限制  | 共享即時通道                                                     |
| ---------- | :--------: | :----: | --------- | ---------------------------------------------------------------- |
| ComfyUI    |     ✓      |   ✓    | 1 張圖片  | 不在共用 sweep 中；由 `extensions/comfy/comfy.live.test.ts` 涵蓋 |
| fal        |     ✓      |   —    | 無        | `generate`                                                       |
| Google     |     ✓      |   ✓    | 10 張圖片 | `generate`, `edit`                                               |
| MiniMax    |     ✓      |   —    | 無        | `generate`                                                       |
| OpenRouter |     ✓      |   ✓    | 1 張圖片  | `generate`, `edit`                                               |

使用 `action: "list"` 在執行時檢查可用的共用提供者和模型：

```text
/tool music_generate action=list
```

使用 `action: "status"` 檢查作用中的會話支援音樂工作：

```text
/tool music_generate action=status
```

直接生成範例：

```text
/tool music_generate prompt="Dreamy lo-fi hip hop with vinyl texture and gentle rain" instrumental=true
```

## 工具參數

<ParamField path="prompt" type="string" required>
  音樂生成提示詞。`action: "generate"` 必填。
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` 傳回目前的 session 任務；`"list"` 檢查供應商。
</ParamField>
<ParamField path="model" type="string">
  供應商/模型覆寫（例如 `google/lyria-3-pro-preview`, `comfy/workflow`）。
</ParamField>
<ParamField path="lyrics" type="string">
  當供應商支援明確歌詞輸入時，可選的歌詞。
</ParamField>
<ParamField path="instrumental" type="boolean">
  當供應商支援時，請求僅器樂輸出。
</ParamField>
<ParamField path="image" type="string">
  單一參考圖片路徑或 URL。
</ParamField>
<ParamField path="images" type="string[]">
  多個參考圖片（支援的供應商最多 10 張）。
</ParamField>
<ParamField path="durationSeconds" type="number">
  當供應商支援持續時間提示時，目標持續時間（秒）。
</ParamField>
<ParamField path="format" type='"mp3" | "wav"'>
  當供應商支援時，輸出格式提示。
</ParamField>
<ParamField path="filename" type="string">
  輸出檔名提示。
</ParamField>

<Note>並非所有供應商都支援所有參數。OpenClaw 仍會在提交前驗證輸入計數等硬性限制。當供應商支援持續時間但使用的最大值低於請求值時，OpenClaw 會調整為最接近的支援持續時間。當選定的供應商或模型無法滿足真正不支援的可選提示時，這些提示將被忽略並顯示警告。工具結果會回報套用的設定；`details.normalization` 會擷取任何從請求到套用的對應關係。</Note>

提供者請求逾時僅屬於操作員配置。當配置了 `agents.defaults.musicGenerationModel.timeoutMs` 時，OpenClaw 會使用它，將低於 120000ms 的數值提升至 120000ms，否則預設將提供者請求設為 300000ms。

## 非同步行為

支援會話的音樂生成作為背景任務執行：

- **背景任務：** `music_generate` 會建立一個背景任務，立即回傳已啟動/任務回應，並在後續的代理程式訊息中發布完成的音軌。
- **重複防護：** 當任務處於 `queued` 或 `running` 狀態時，同一工作階段中後續的 `music_generate` 呼叫會回傳任務狀態，而不是啟動另一項生成作業。請使用 `action: "status"` 進行明確檢查。
- **狀態查詢：** `openclaw tasks list` 或 `openclaw tasks show <taskId>`
  會檢查已排隊、執行中和最終狀態。
- **完成喚醒：** OpenClaw 將內部完成事件重新注入
  回同一個會話，以便模型可以自行撰寫面向使用者的後續訊息。
- **提示詞提示：** 當音樂任務正在進行時，同一工作階段中後續的使用者/手動輪次會收到一個小型執行階段提示，讓模型不會盲目地再次呼叫 `music_generate`。
- **無會話後備：** 沒有真實代理程式會話的直接/本機內容會以內嵌方式執行，並在同一輪次中傳回最終的音訊結果。

### 任務生命週期

| 狀態        | 含義                                                              |
| ----------- | ----------------------------------------------------------------- |
| `queued`    | 任務已建立，等待提供者接受。                                      |
| `running`   | 提供者正在處理（通常為 30 秒到 3 分鐘，視提供者和持續時間而定）。 |
| `succeeded` | 曲目已就緒；代理程式喚醒並將其發布到對話中。                      |
| `failed`    | 提供者錯誤或逾時；代理程式會喚醒並附帶錯誤詳情。                  |

從 CLI 檢查狀態：

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

## 組態

### 模型選擇

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
        fallbacks: ["fal/fal-ai/minimax-music/v2.6", "minimax/music-2.6"],
      },
    },
  },
}
```

### 提供者選擇順序

OpenClaw 會依此順序嘗試提供者：

1. 來自工具呼叫的 `model` 參數（如果代理程式指定了該參數）。
2. 來自配置的 `musicGenerationModel.primary`。
3. 依序排列的 `musicGenerationModel.fallbacks`。
4. 僅使用基於驗證的提供者預設值進行自動偵測：
   - 首先是目前的預設提供者；
   - 其餘已註冊的音樂生成提供者，依提供者 ID 順序排列。

如果提供者失敗，會自動嘗試下一個候選者。如果全部失敗，錯誤訊息會包含每次嘗試的詳細資訊。

設定 `agents.defaults.mediaGenerationAutoProviderFallback: false` 以僅使用
明確的 `model`、`primary` 和 `fallbacks` 項目。

## 提供者說明

<AccordionGroup>
  <Accordion title="ComfyUI">由工作流程驅動，並取決於針對提示詞/輸出欄位所設定的圖表與節點對應。 內建的 `comfy` 外掛程式透過音樂生成提供者 註冊表接入共用的 `music_generate` 工具。</Accordion>
  <Accordion title="fal">透過共用的提供者驗證路徑使用 fal 模型端點。 內建的提供者預設為 `fal-ai/minimax-music/v2.6`，並公開 `fal-ai/ace-step/prompt-to-audio` 和 `fal-ai/stable-audio-25/text-to-audio` 以用於提示詞轉音訊請求。</Accordion>
  <Accordion title="Google (Lyria 3)">使用 Lyria 3 批次生成。目前的隨附流程支援提示、可選的歌詞文字以及可選的參考圖片。</Accordion>
  <Accordion title="MiniMax">使用批次 `music_generation` 端點。支援透過 `minimax` API 金鑰驗證或 `minimax-portal` OAuth 進行提示、可選 歌詞、純音樂模式和 mp3 輸出。</Accordion>
  <Accordion title="OpenRouter">使用已啟用串流的 OpenRouter 聊天補全音訊輸出。 捆綁的提供者預設為 `google/lyria-3-pro-preview`，並公開 `openrouter/google/lyria-3-clip-preview`。</Accordion>
</AccordionGroup>

## 選擇正確的路徑

- **共用提供者支援**，當您需要模型選擇、提供者故障轉移以及內建的異步任務/狀態流程時。
- **外掛程式路徑 (ComfyUI)**，當您需要自訂工作流程圖表或不屬於共用捆綁音樂功能的提供者時。

如果您正在調試 ComfyUI 特定的行為，請參閱
[ComfyUI](/zh-Hant/providers/comfy)。如果您正在調試共享提供者
行為，請從 [fal](/zh-Hant/providers/fal)、[Google (Gemini)](/zh-Hant/providers/google)、
[MiniMax](/zh-Hant/providers/minimax) 或 [OpenRouter](/zh-Hant/providers/openrouter) 開始。

## 提供者功能模式

共用音樂生成合約支援明確的模式宣告：

- `generate` 用於僅提示生成。
- 當請求包含一或多張參考圖片時，`edit`。

新的提供者實作應偏好明確的模式區塊：

```typescript
capabilities: {
  generate: {
    maxTracks: 1,
    supportsLyrics: true,
    supportsFormat: true,
  },
  edit: {
    enabled: true,
    maxTracks: 1,
    maxInputImages: 1,
    supportsFormat: true,
  },
}
```

舊的平面欄位，例如 `maxInputImages`、`supportsLyrics` 和
`supportsFormat`，並**不**足以宣傳編輯支援能力。提供者
應明確宣告 `generate` 和 `edit`，以便即時測試、合約
測試和共享的 `music_generate` 工具能確定性驗證模式支援。

## 即時測試

選用共用捆綁提供者的即時覆蓋範圍：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

Repo 包裝器：

```bash
pnpm test:live:media music
```

此即時檔案預設會優先使用已匯出的提供者環境變數，而非已儲存的驗證
設定檔，並在提供者啟用編輯模式時執行 `generate` 和已宣告的 `edit` 覆蓋範圍。目前的覆蓋範圍：

- `google`：`generate` 加上 `edit`
- `fal`：僅限 `generate`
- `minimax`：僅限 `generate`
- `openrouter`：`generate` 加上 `edit`
- `comfy`: 分別涵蓋 Comfy live，而非共享供應商總覽

選用隨附的 ComfyUI 音樂路徑的即時涵蓋範圍：

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

當配置了相關章節時，Comfy 即時檔案也涵蓋 comfy 影像與影片工作流程。

## 相關

- [背景任務](/zh-Hant/automation/tasks) — 針對分離式 `music_generate` 執行的任務追蹤
- [ComfyUI](/zh-Hant/providers/comfy)
- [設定參考](/zh-Hant/gateway/config-agents#agent-defaults) — `musicGenerationModel` 設定
- [Google (Gemini)](/zh-Hant/providers/google)
- [MiniMax](/zh-Hant/providers/minimax)
- [模型](/zh-Hant/concepts/models) — 模型設定與故障轉移
- [工具總覽](/zh-Hant/tools)
