---
summary: "Generate music with shared providers, including workflow-backed plugins"
read_when:
  - Generating music or audio via the agent
  - Configuring music generation providers and models
  - Understanding the music_generate tool parameters
title: "Music Generation"
---

# 音樂生成

`music_generate` 工具允許代理程式透過共享音樂生成功能，使用已設定的提供者（如 Google、MiniMax 和工作流程配置的 ComfyUI）來建立音樂或音訊。

對於由共用提供者支援的代理程式工作階段，OpenClaw 會將音樂生成作為背景任務啟動，在工作帳本中追蹤它，然後當音軌準備就緒時再次喚醒代理程式，以便代理程式可以將完成的音訊發布回原始頻道。

<Note>內建共享工具僅在至少有一個音樂生成提供者可用時才會出現。如果您在代理程式的工具中看不到 `music_generate`，請設定 `agents.defaults.musicGenerationModel` 或設定提供者 API 金鑰。</Note>

## 快速入門

### 共用提供者支援的生成

1. 為至少一個提供者設定 API 金鑰，例如 `GEMINI_API_KEY` 或
   `MINIMAX_API_KEY`。
2. 選擇性地設定您偏好的模型：

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

3. 詢問代理程式：_「生成一首關於在霓虹城市夜駕的輕快合成器流行音軌。」_

代理程式會自動呼叫 `music_generate`。不需要將工具加入允許清單。

對於沒有工作階段支援代理程式執行的直接同步上下文，內建工具仍會回退至內聯生成，並在工具結果中傳回最終的媒體路徑。

提示範例：

```text
Generate a cinematic piano track with soft strings and no vocals.
```

```text
Generate an energetic chiptune loop about launching a rocket at sunrise.
```

### 工作流程驅動的 Comfy 生成

隨附的 `comfy` 外掛程式透過音樂生成提供者註冊表連接到共享的 `music_generate` 工具。

1. 使用工作流程 JSON 和提示/輸出節點設定 `models.providers.comfy.music`。
2. 如果您使用 Comfy Cloud，請設定 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY`。
3. 向代理程式要求音樂或直接呼叫該工具。

範例：

```text
/tool music_generate prompt="Warm ambient synth loop with soft tape texture"
```

## 隨附的共用提供者支援

| 提供者  | 預設模型               | 參考輸入       | 支援的控制項                                              | API 金鑰                               |
| ------- | ---------------------- | -------------- | --------------------------------------------------------- | -------------------------------------- |
| ComfyUI | `workflow`             | 最多 1 張圖片  | 工作流程定義的音樂或音訊                                  | `COMFY_API_KEY`, `COMFY_CLOUD_API_KEY` |
| Google  | `lyria-3-clip-preview` | 最多 10 張圖片 | `lyrics`, `instrumental`, `format`                        | `GEMINI_API_KEY`, `GOOGLE_API_KEY`     |
| MiniMax | `music-2.5+`           | 無             | `lyrics`, `instrumental`, `durationSeconds`, `format=mp3` | `MINIMAX_API_KEY`                      |

### 已宣告的功能矩陣

這是 `music_generate`、合約測試和共享即時掃描所使用的明確模式合約。

| 提供者  | `generate` | `edit` | 編輯限制  | 共享即時通道                                                  |
| ------- | ---------- | ------ | --------- | ------------------------------------------------------------- |
| ComfyUI | 是         | 是     | 1 張圖片  | 不在共享掃描中；由 `extensions/comfy/comfy.live.test.ts` 涵蓋 |
| Google  | 是         | 是     | 10 張圖片 | `generate`, `edit`                                            |
| MiniMax | 是         | 否     | 無        | `generate`                                                    |

使用 `action: "list"` 在執行時檢查可用的共享提供者和模型：

```text
/tool music_generate action=list
```

使用 `action: "status"` 檢查作用中工作階段支援的音樂任務：

```text
/tool music_generate action=status
```

直接生成範例：

```text
/tool music_generate prompt="Dreamy lo-fi hip hop with vinyl texture and gentle rain" instrumental=true
```

## 內建工具參數

| 參數              | 類型     | 描述                                                                            |
| ----------------- | -------- | ------------------------------------------------------------------------------- |
| `prompt`          | string   | 音樂生成提示（`action: "generate"` 必填）                                       |
| `action`          | string   | `"generate"`（預設）、`"status"` 用於目前工作階段任務，或 `"list"` 以檢查提供者 |
| `model`           | string   | 提供者/模型覆寫，例如 `google/lyria-3-pro-preview` 或 `comfy/workflow`          |
| `lyrics`          | string   | 當提供者支援明確的歌詞輸入時可選的歌詞                                          |
| `instrumental`    | boolean  | 當提供者支援時請求僅器樂輸出                                                    |
| `image`           | string   | 單一參考圖片路徑或 URL                                                          |
| `images`          | string[] | 多張參考圖片（最多 10 張）                                                      |
| `durationSeconds` | number   | 當提供者支援持續時間提示時的目標持續時間（秒）                                  |
| `format`          | string   | 當提供者支援時的輸出格式提示（`mp3` 或 `wav`）                                  |
| `filename`        | string   | 輸出檔案名稱提示                                                                |

並非所有提供者都支援所有參數。OpenClaw 在提交前仍會驗證硬性限制，例如輸入數量。當提供者支援持續時間但使用的最大值短於請求值時，OpenClaw 會自動限制為最接近支援的持續時間。當選定的提供者或模型無法滿足真正不支援的可選提示時，這些提示將被忽略並顯示警告。

工具結果會回報套用的設定。當 OpenClaw 在提供者備援期間限制持續時間時，傳回的 `durationSeconds` 反映提交值，而 `details.normalization.durationSeconds` 顯示請求到套用的對應關係。

## 共享提供者支援路徑的非同步行為

- 基於會話的代理運行：`music_generate` 建立一個背景任務，立即回傳已啟動/任務響應，並隨後在後續的代理訊息中張貼完成的音軌。
- 重複防範：當該背景任務仍處於 `queued` 或 `running` 狀態時，同一會話中後續的 `music_generate` 呼叫將回傳任務狀態，而不是啟動另一個生成任務。
- 狀態查詢：使用 `action: "status"` 來檢查目前啟動的會話音樂任務，而不啟動新任務。
- 任務追蹤：使用 `openclaw tasks list` 或 `openclaw tasks show <taskId>` 來檢查生成的已排隊、執行中和終結狀態。
- 完成喚醒：OpenClaw 將內部完成事件注入回同一個會話，以便模型可以自行撰寫面向使用者的後續訊息。
- 提示提示：當音樂任務已在執行中時，同一會話中後續的使用者/手動輪次會獲得一個小型的執行時提示，以免模型盲目地再次呼叫 `music_generate`。
- 無會話後援：沒有真實代理會話的直接/本機內容仍然會內聯執行，並在同一輪次中回傳最終的音訊結果。

### 任務生命週期

每個 `music_generate` 請求都會經過四個狀態：

1. **queued（已排隊）** -- 任務已建立，等待提供者接受。
2. **running（執行中）** -- 提供者正在處理（通常為 30 秒至 3 分鐘，視提供者和持續時間而定）。
3. **succeeded（成功）** -- 音軌已就緒；代理喚醒並將其發布到對話中。
4. **failed（失敗）** -- 提供者錯誤或逾時；代理喚醒並附帶錯誤詳情。

從 CLI 檢查狀態：

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

重複防範：如果目前會話的音樂任務已處於 `queued` 或 `running` 狀態，`music_generate` 將回傳現有的任務狀態，而不是啟動新任務。使用 `action: "status"` 來明確檢查而不觸發新的生成。

## Configuration

### Model selection

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
        fallbacks: ["minimax/music-2.5+"],
      },
    },
  },
}
```

### Provider selection order

When generating music, OpenClaw tries providers in this order:

1. `model` parameter from the tool call, if the agent specifies one
2. `musicGenerationModel.primary` from config
3. `musicGenerationModel.fallbacks` 按順序
4. 僅使用基於認證的供應商預設值進行自動偵測：
   - 目前的預設供應商優先
   - 其餘已註冊的音樂生成供應商按供應商 ID 順序

如果某個供應商失敗，系統會自動嘗試下一個候選者。如果全部失敗，錯誤訊息將包含每次嘗試的詳細資訊。

如果您希望音樂生成僅使用顯式的 `model`、`primary` 和 `fallbacks` 項目，請設定 `agents.defaults.mediaGenerationAutoProviderFallback: false`。

## 供應商注意事項

- Google 使用 Lyria 3 批次生成。目前的內建流程支援提示詞、選用歌詞文字和選用參考圖片。
- MiniMax 使用批次 `music_generation` 端點。目前的內建流程支援提示詞、選用歌詞、純音樂模式、持續時間控制和 mp3 輸出。
- ComfyUI 支援由工作流程驅動，並取決於設定的圖表以及用於提示詞/輸出欄位的節點對應。

## 供應商功能模式

共享音樂生成合約現在支援顯式模式宣告：

- `generate` 僅用於提示詞生成
- 當請求包含一或多張參考圖片時使用 `edit`

新的供應商實作應優先使用顯式模式區塊：

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

傳統的扁平欄位（如 `maxInputImages`、`supportsLyrics` 和 `supportsFormat`）不足以宣佈編輯支援。供應商應明確宣告 `generate` 和 `edit`，以便即時測試、合約測試和共享的 `music_generate` 工具能決定性驗證模式支援。

## 選擇正確的路徑

- 當您需要模型選擇、供應商故障轉移以及內建的異步任務/狀態流程時，請使用共享供應商支援路徑。
- 當您需要自訂工作流程圖表或不屬於共享內建音樂功能的供應商時，請使用 ComfyUI 等外掛程式路徑。
- 如果您正在偵錯 ComfyUI 特定的行為，請參閱 [ComfyUI](/zh-Hant/providers/comfy)。如果您正在偵錯共享供應商的行為，請從 [Google (Gemini)](/zh-Hant/providers/google) 或 [MiniMax](/zh-Hant/providers/minimax) 開始。

## 即時測試

針對共享打包提供商的可選即時測試：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

Repo wrapper:

```bash
pnpm test:live:media music
```

此即時檔案會從 `~/.profile` 載入缺失的提供商環境變數，預設偏好使用 live/env API 金鑰而非儲存的設定檔，並且當提供商啟用編輯模式時，會同時執行 `generate` 和已宣告的 `edit` 測試覆蓋。

目前這意味著：

- `google`: `generate` 加上 `edit`
- `minimax`: 僅限 `generate`
- `comfy`: 獨立的 Comfy 即時測試覆蓋，非共享提供商掃描

針對打包 ComfyUI 音樂路徑的可選即時測試：

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

當設定相關章節時，Comfy 即時檔案也會涵蓋 Comfy 的影像和影片工作流程。

## 相關

- [背景任務](/zh-Hant/automation/tasks) - 針對分離式 `music_generate` 執行的任務追蹤
- [設定參考](/zh-Hant/gateway/configuration-reference#agent-defaults) - `musicGenerationModel` 設定
- [ComfyUI](/zh-Hant/providers/comfy)
- [Google (Gemini)](/zh-Hant/providers/google)
- [MiniMax](/zh-Hant/providers/minimax)
- [Models](/zh-Hant/concepts/models) - 模型設定與故障轉移
- [工具概覽](/zh-Hant/tools)
