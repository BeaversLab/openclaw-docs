---
summary: "使用共用提供者（包含工作流程支援的外掛程式）生成音樂"
read_when:
  - Generating music or audio via the agent
  - Configuring music generation providers and models
  - Understanding the music_generate tool parameters
title: "音樂生成"
---

# 音樂生成

`music_generate` 工具讓代理程式能夠透過共用的音樂生成功能，使用已設定的提供者（例如 Google、MiniMax 和已設定工作流程的 ComfyUI）來建立音樂或音訊。

對於由共用提供者支援的代理程式工作階段，OpenClaw 會將音樂生成作為背景任務啟動，在工作帳本中追蹤它，然後當音軌準備就緒時再次喚醒代理程式，以便代理程式可以將完成的音訊發布回原始頻道。

<Note>內建的共用工具僅在至少有一個音樂生成提供者可用時才會出現。如果您在代理程式的工具中看不到 `music_generate`，請設定 `agents.defaults.musicGenerationModel` 或設定提供者 API 金鑰。</Note>

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

代理程式會自動呼叫 `music_generate`。不需要工具允許清單。

對於沒有工作階段支援代理程式執行的直接同步上下文，內建工具仍會回退至內聯生成，並在工具結果中傳回最終的媒體路徑。

提示範例：

```text
Generate a cinematic piano track with soft strings and no vocals.
```

```text
Generate an energetic chiptune loop about launching a rocket at sunrise.
```

### 工作流程驅動的 Comfy 生成

隨附的 `comfy` 外掛程式透過音樂生成提供者註冊表插入共用的 `music_generate` 工具。

1. 使用工作流程 JSON 和提示/輸出節點來設定
   `models.providers.comfy.music`。
2. 如果您使用 Comfy Cloud，請設定 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY`。
3. 向代理程式要求音樂或直接呼叫該工具。

範例：

```text
/tool music_generate prompt="Warm ambient synth loop with soft tape texture"
```

## 隨附的共用提供者支援

| 提供者  | 預設模型               | 參考輸入       | 支援的控制項                                              | API 金鑰                               |
| ------- | ---------------------- | -------------- | --------------------------------------------------------- | -------------------------------------- |
| ComfyUI | `workflow`             | 最多 1 張圖片  | 工作流程定義的音樂或音訊                                  | `COMFY_API_KEY`、`COMFY_CLOUD_API_KEY` |
| Google  | `lyria-3-clip-preview` | 最多 10 張圖片 | `lyrics`, `instrumental`, `format`                        | `GEMINI_API_KEY`, `GOOGLE_API_KEY`     |
| MiniMax | `music-2.5+`           | 無             | `lyrics`, `instrumental`, `durationSeconds`, `format=mp3` | `MINIMAX_API_KEY`                      |

使用 `action: "list"` 在執行時檢查可用的共享提供者和模型：

```text
/tool music_generate action=list
```

使用 `action: "status"` 檢查目前的工作階段支援音樂任務：

```text
/tool music_generate action=status
```

直接生成範例：

```text
/tool music_generate prompt="Dreamy lo-fi hip hop with vinyl texture and gentle rain" instrumental=true
```

## 內建工具參數

| 參數              | 類型     | 描述                                                                              |
| ----------------- | -------- | --------------------------------------------------------------------------------- |
| `prompt`          | 字串     | 音樂生成提示（`action: "generate"` 必填）                                         |
| `action`          | 字串     | `"generate"`（預設值）、`"status"` 用於目前工作階段任務，或 `"list"` 以檢查提供者 |
| `model`           | 字串     | 提供者/模型覆寫，例如 `google/lyria-3-pro-preview` 或 `comfy/workflow`            |
| `lyrics`          | 字串     | 當提供者支援明確的歌詞輸入時，可選的歌詞                                          |
| `instrumental`    | 布林值   | 當提供者支援時，要求僅輸出器樂                                                    |
| `image`           | 字串     | 單一參考圖片路徑或 URL                                                            |
| `images`          | string[] | 多張參考圖片（最多 10 張）                                                        |
| `durationSeconds` | 數字     | 當提供者支援持續時間提示時，以秒為單位的目標持續時間                              |
| `format`          | 字串     | 當提供者支援時，輸出格式提示（`mp3` 或 `wav`）                                    |
| `filename`        | 字串     | 輸出檔名提示                                                                      |

並非所有提供者都支援所有參數。OpenClaw 仍會在提交前驗證輸入計數等硬性限制，但當選定的提供者或模型無法支援時，不支援的選用提示將會被忽略並顯示警告。

## 共享提供者支援路徑的非同步行為

- Session-backed agent runs: `music_generate` 建立背景任務、立即傳回 started/task 回應，並稍後在後續的 agent 訊息中發布完成的曲目。
- Duplicate prevention: 當該背景任務仍為 `queued` 或 `running` 時，同一 session 中稍後的 `music_generate` 呼叫會傳回任務狀態，而非啟動另一次生成。
- Status lookup: 使用 `action: "status"` 來檢查使用中 session-backed 音樂任務，而不啟動新任務。
- Task tracking: 使用 `openclaw tasks list` 或 `openclaw tasks show <taskId>` 來檢查生成任務的已排隊、執行中與終結狀態。
- Completion wake: OpenClaw 會將內部完成事件注入回同一個 session，讓模型能自行撰寫面向使用者的後續回應。
- Prompt hint: 當音樂任務正在進行時，同一 session 中稍後的使用者/手動輪次會收到一個小型執行階段提示，以避免模型盲目再次呼叫 `music_generate`。
- No-session fallback: 沒有真實 agent session 的 direct/local 內容仍會以 inline 方式執行，並在同一輪次中傳回最終音訊結果。

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
3. `musicGenerationModel.fallbacks` in order
4. Auto-detection using auth-backed provider defaults only:
   - current default provider first
   - remaining registered music-generation providers in provider-id order

If a provider fails, the next candidate is tried automatically. If all fail, the
error includes details from each attempt.

## Provider notes

- Google uses Lyria 3 batch generation. The current bundled flow supports
  prompt, optional lyrics text, and optional reference images.
- MiniMax uses the batch `music_generation` endpoint. The current bundled flow
  supports prompt, optional lyrics, instrumental mode, duration steering, and
  mp3 output.
- ComfyUI support is workflow-driven and depends on the configured graph plus
  node mapping for prompt/output fields.

## Choosing the right path

- 當您需要模型選擇、提供者容錯移轉以及內建的異步任務/狀態流程時，請使用共用的提供者支援路徑。
- 當您需要自訂工作流程圖或屬於共用套件音樂功能之外的提供者時，請使用外掛程式路徑，例如 ComfyUI。
- 如果您正在偵錯 ComfyUI 特定的行為，請參閱 [ComfyUI](/en/providers/comfy)。如果您正在偵錯共用提供者行為，請從 [Google (Gemini)](/en/providers/google) 或 [MiniMax](/en/providers/minimax) 開始。

## 即時測試

選擇加入共用的套件提供者的即時涵蓋範圍：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

選擇加入套件的 ComfyUI 音樂路徑的即時涵蓋範圍：

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

當設定相關章節時，Comfy 即時檔案也涵蓋了 comfy 圖像和視訊工作流程。

## 相關

- [背景任務](/en/automation/tasks) - 分離的 `music_generate` 執行的任務追蹤
- [設定參考](/en/gateway/configuration-reference#agent-defaults) - `musicGenerationModel` 設定
- [ComfyUI](/en/providers/comfy)
- [Google (Gemini)](/en/providers/google)
- [MiniMax](/en/providers/minimax)
- [模型](/en/concepts/models) - 模型設定與容錯移轉
- [工具總覽](/en/tools)
