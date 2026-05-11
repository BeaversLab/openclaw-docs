---
summary: "透過 music_generate 跨 Google Lyria、MiniMax 和 ComfyUI 工作流程產生音樂"
read_when:
  - Generating music or audio via the agent
  - Configuring music-generation providers and models
  - Understanding the music_generate tool parameters
title: "音樂生成"
sidebarTitle: "音樂生成"
---

`music_generate` 工具讓代理透過共用的音樂生成功能及設定的供應商（目前包括 Google、MiniMax 和工作流程設定的 ComfyUI）來建立音樂或音訊。

對於具會話支援的代理執行，OpenClaw 會將音樂生成作為背景任務啟動，在任務分類帳中追蹤，然後在曲目準備好時再次喚醒代理，以便代理可以將完成的音訊貼回原始頻道。

<Note>內建的共用工具僅在至少有一個音樂生成供應商可用時才會出現。如果您在代理的工具中看不到 `music_generate`，請設定 `agents.defaults.musicGenerationModel` 或設定供應商 API 金鑰。</Note>

## 快速入門

<Tabs>
  <Tab title="共用供應商支援">
    <Steps>
      <Step title="設定驗證">
        為至少一個供應商設定 API 金鑰 — 例如
        `GEMINI_API_KEY` 或 `MINIMAX_API_KEY`。
      </Step>
      <Step title="選擇預設模型（選用）">
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
      <Step title="要求代理">
        _「產生一首關於在霓虹城市夜駕的愉快合成器流行曲目。」_

        代理會自動呼叫 `music_generate`。無需工具允許清單。
      </Step>
    </Steps>

    對於不具會話支援代理執行的直接同步內容，
    內建工具仍會回退為內嵌生成，並在工具結果中
    傳回最終媒體路徑。

  </Tab>
  <Tab title="ComfyUI workflow">
    <Steps>
      <Step title="設定工作流程">
        使用工作流程 JSON 與 prompt/output 節點設定 `plugins.entries.comfy.config.music`。
      </Step>
      <Step title="雲端驗證 (選用)">
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

| 提供商  | 預設模型               | 參考輸入       | 支援的控制項                                              | 驗證                                   |
| ------- | ---------------------- | -------------- | --------------------------------------------------------- | -------------------------------------- |
| ComfyUI | `workflow`             | 最多 1 張圖片  | 工作流程定義的音樂或音訊                                  | `COMFY_API_KEY`、`COMFY_CLOUD_API_KEY` |
| Google  | `lyria-3-clip-preview` | 最多 10 張圖片 | `lyrics`、`instrumental`、`format`                        | `GEMINI_API_KEY`、`GOOGLE_API_KEY`     |
| MiniMax | `music-2.6`            | 無             | `lyrics`、`instrumental`、`durationSeconds`、`format=mp3` | `MINIMAX_API_KEY` 或 MiniMax OAuth     |

### 功能矩陣

由 `music_generate`、合約測試以及共用即時 sweep 使用的明確模式合約：

| 提供商  | `generate` | `edit` | 編輯限制  | 共用即時通道                                                     |
| ------- | :--------: | :----: | --------- | ---------------------------------------------------------------- |
| ComfyUI |     ✓      |   ✓    | 1 張圖片  | 不在共用 sweep 中；由 `extensions/comfy/comfy.live.test.ts` 涵蓋 |
| Google  |     ✓      |   ✓    | 10 張圖片 | `generate`、`edit`                                               |
| MiniMax |     ✓      |   —    | 無        | `generate`                                                       |

使用 `action: "list"` 在執行時檢查可用的共用提供商和模型：

```text
/tool music_generate action=list
```

使用 `action: "status"` 檢查使用中受工作階段支援的音樂工作：

```text
/tool music_generate action=status
```

直接生成範例：

```text
/tool music_generate prompt="Dreamy lo-fi hip hop with vinyl texture and gentle rain" instrumental=true
```

## 工具參數

<ParamField path="prompt" type="string" required>
  音樂生成提示詞。`action: "generate"` 所必需。
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` 返回當前會話任務；`"list"` 檢查提供者。
</ParamField>
<ParamField path="model" type="string">
  提供者/模型覆寫（例如 `google/lyria-3-pro-preview`、 `comfy/workflow`）。
</ParamField>
<ParamField path="lyrics" type="string">
  當提供者支援明確歌詞輸入時可選的歌詞。
</ParamField>
<ParamField path="instrumental" type="boolean">
  當提供者支援時，要求僅輸出器樂。
</ParamField>
<ParamField path="image" type="string">
  單一參考圖片路徑或 URL。
</ParamField>
<ParamField path="images" type="string[]">
  多個參考圖片（支援的提供者最多 10 張）。
</ParamField>
<ParamField path="durationSeconds" type="number">
  當提供者支援持續時間提示時的目標持續時間（秒）。
</ParamField>
<ParamField path="format" type='"mp3" | "wav"'>
  當提供者支援時的輸出格式提示。
</ParamField>
<ParamField path="filename" type="string">
  輸出檔名提示。
</ParamField>
<ParamField path="timeoutMs" type="number">
  選用的提供者請求逾時（毫秒）。
</ParamField>

<Note>並非所有提供者都支援所有參數。在提交之前，OpenClaw 仍會驗證輸入計數等硬性限制。當提供者支援持續時間但使用的最大值小於請求值時，OpenClaw 會將其限制為最接近的支援持續時間。當選定的提供者或模型無法遵守真正不支援的選用提示時，這些提示將被忽略並發出警告。工具結果會回報套用的設定；`details.normalization` 會擷取任何請求到套用的對應關係。</Note>

## 非同步行為

基於會話的音樂生成作為背景任務執行：

- **背景任務：** `music_generate` 建立一個背景任務，立即
  回傳已開始/任務的回應，並在後續的代理訊息中
  發布完成的音軌。
- **重複防護：** 當任務為 `queued` 或 `running` 時，
  同一會話中後續的 `music_generate` 呼叫將回傳任務狀態而非
  開始另一個生成作業。請使用 `action: "status"` 進行明確檢查。
- **狀態查詢：** `openclaw tasks list` 或 `openclaw tasks show <taskId>`
  會檢查佇列中、執行中及終結狀態。
- **完成喚醒：** OpenClaw 將內部的完成事件注入回
  同一會話，以便模型能自行撰寫給使用者看的
  後續回應。
- **提示提示：** 當音樂任務正在進行時，同一會話中後續的使用者/手動
  輪次會收到一個小型執行時提示，讓模型不會
  盲目地再次呼叫 `music_generate`。
- **無會話備援：** 沒有真實代理會話的直接/本機上下文會
  同步執行，並在同一輪中回傳最終的音訊結果。

### 任務生命週期

| 狀態        | 含義                                                              |
| ----------- | ----------------------------------------------------------------- |
| `queued`    | 任務已建立，等待供應商接受。                                      |
| `running`   | 供應商正在處理（通常為 30 秒到 3 分鐘，視供應商和持續時間而定）。 |
| `succeeded` | 音軌已就緒；代理喚醒並將其發布至對話中。                          |
| `failed`    | 供應商錯誤或逾時；代理會喚醒並附帶錯誤詳情。                      |

從 CLI 檢查狀態：

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

## 設定

### 模型選擇

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
        fallbacks: ["minimax/music-2.6"],
      },
    },
  },
}
```

### 供應商選擇順序

OpenClaw 依以下順序嘗試供應商：

1. 工具呼叫中的 `model` 參數（如果代理指定了一個）。
2. 設定中的 `musicGenerationModel.primary`。
3. 依序 `musicGenerationModel.fallbacks`。
4. 僅使用支援驗證的供應商預設值進行自動偵測：
   - 目前的預設供應商優先；
   - 其餘已註冊的音樂生成供應商依供應商 ID 順序。

如果供應商失敗，會自動嘗試下一個候選者。如果全部
失敗，錯誤訊息會包含每次嘗試的詳情。

設定 `agents.defaults.mediaGenerationAutoProviderFallback: false` 以僅使用
明確的 `model`、`primary` 和 `fallbacks` 項目。

## 供應商注意事項

<AccordionGroup>
  <Accordion title="ComfyUI">由工作流程驅動，並且依賴於針對提示/輸出欄位設定的圖譜和節點對應。 隨附的 `comfy` 插件透過音樂生成供應商註冊表 插入共享的 `music_generate` 工具中。</Accordion>
  <Accordion title="Google (Lyria 3)">使用 Lyria 3 批次生成。目前的隨附流程支援 提示、選用歌詞文字和選用參考圖片。</Accordion>
  <Accordion title="MiniMax">使用批次 `music_generation` 端點。支援提示、選用 歌詞、純音樂模式、持續時間引導以及透過 `minimax` API 金鑰驗證或 `minimax-portal` OAuth 進行的 MP3 輸出。</Accordion>
</AccordionGroup>

## 選擇正確的路徑

- **共享供應商支援** 當您需要模型選擇、供應商
  容錯移轉以及內建的非同步任務/狀態流程時。
- **插件路徑 (ComfyUI)** 當您需要自訂工作流程圖譜或
  不屬於共享隨附音樂功能的供應商時。

如果您正在除錯 ComfyUI 特定行為，請參閱
[ComfyUI](/zh-Hant/providers/comfy)。如果您正在除錯共享供應商
行為，請從 [Google (Gemini)](/zh-Hant/providers/google) 或
[MiniMax](/zh-Hant/providers/minimax) 開始。

## 供應商功能模式

共享音樂生成合約支援明確的模式宣告：

- `generate` 用於僅提示生成。
- `edit` 當請求包含一或多個參考圖片時。

新的供應商實作應優先使用明確的模式區塊：

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

舊版扁平欄位（如 `maxInputImages`、`supportsLyrics` 和
`supportsFormat`）**不**足以宣佈支援編輯。供應商應明確宣告
`generate` 和 `edit`，以便即時測試、合約測試
及共享的 `music_generate` 工具能確定性驗證模式支援。

## 即時測試

選用共享打包供應商的即時覆蓋範圍：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

Repo 包裝器：

```bash
pnpm test:live:media music
```

此即時檔案會從 `~/.profile` 載入缺失的供應商環境變數，預設優先使用
live/env API 金鑰而非儲存的驗證設定檔，並在供應商啟用編輯
模式時執行 `generate` 和已宣告的 `edit` 覆蓋範圍。
目前的覆蓋範圍：

- `google`：`generate` 加上 `edit`
- `minimax`：僅 `generate`
- `comfy`：個別的 Comfy 即時覆蓋範圍，非共享供應商掃描

選用打包 ComfyUI 音樂路徑的即時覆蓋範圍：

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

當配置了相關章節時，Comfy 即時檔案也會涵蓋 comfy 圖片與影片工作流程。

## 相關

- [背景任務](/zh-Hant/automation/tasks) — 針對分離式 `music_generate` 執行的任務追蹤
- [ComfyUI](/zh-Hant/providers/comfy)
- [組態參考](/zh-Hant/gateway/config-agents#agent-defaults) — `musicGenerationModel` 組態
- [Google (Gemini)](/zh-Hant/providers/google)
- [MiniMax](/zh-Hant/providers/minimax)
- [模型](/zh-Hant/concepts/models) — 模型組態與故障轉移
- [工具概覽](/zh-Hant/tools)
