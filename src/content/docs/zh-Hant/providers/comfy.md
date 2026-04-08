---
title: "ComfyUI"
summary: "在 OpenClaw 中設定 ComfyUI 工作流程圖像、視訊和音樂生成"
read_when:
  - You want to use local ComfyUI workflows with OpenClaw
  - You want to use Comfy Cloud with image, video, or music workflows
  - You need the bundled comfy plugin config keys
---

# ComfyUI

OpenClaw 內建了一個用於驅動 ComfyUI 工作流程的 `comfy` 外掛程式。

- 提供者： `comfy`
- 模型： `comfy/workflow`
- 共用介面： `image_generate`, `video_generate`, `music_generate`
- 驗證：本地 ComfyUI 無需驗證；Comfy Cloud 則需要 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY`
- API：ComfyUI `/prompt` / `/history` / `/view` 和 Comfy Cloud `/api/*`

## 支援項目

- 從工作流程 JSON 生成圖像
- 使用 1 張上傳的參考圖像進行圖像編輯
- 從工作流程 JSON 生成視訊
- 使用 1 張上傳的參考圖像生成視訊
- 透過共用的 `music_generate` 工具生成音樂或音訊
- 從設定的節點或所有符合條件的輸出節點下載輸出

內建的外掛程式是由工作流程驅動的，因此 OpenClaw 不會嘗試將通用的
`size`、`aspectRatio`、`resolution`、`durationSeconds` 或 TTS 風格的控制項
對應到您的圖表中。

## 設定配置

Comfy 支援共用的頂層連線設定以及各功能的工作流程
區段：

```json5
{
  models: {
    providers: {
      comfy: {
        mode: "local",
        baseUrl: "http://127.0.0.1:8188",
        image: {
          workflowPath: "./workflows/flux-api.json",
          promptNodeId: "6",
          outputNodeId: "9",
        },
        video: {
          workflowPath: "./workflows/video-api.json",
          promptNodeId: "12",
          outputNodeId: "21",
        },
        music: {
          workflowPath: "./workflows/music-api.json",
          promptNodeId: "3",
          outputNodeId: "18",
        },
      },
    },
  },
}
```

共用金鑰：

- `mode`： `local` 或 `cloud`
- `baseUrl`：本地預設為 `http://127.0.0.1:8188`，雲端則為 `https://cloud.comfy.org`
- `apiKey`：可選的內聯金鑰，可取代環境變數
- `allowPrivateNetwork`：在雲端模式下允許私人/LAN `baseUrl`

在 `image`、`video` 或 `music` 下的各功能金鑰：

- `workflow` 或 `workflowPath`：必填
- `promptNodeId`：必填
- `promptInputName`：預設為 `text`
- `outputNodeId`：選用
- `pollIntervalMs`：選用
- `timeoutMs`：選用

圖片與影片區段也支援：

- `inputImageNodeId`：當您傳入參考圖片時為必填
- `inputImageInputName`：預設為 `image`

## 向後相容性

既有的頂層圖片設定仍然有效：

```json5
{
  models: {
    providers: {
      comfy: {
        workflowPath: "./workflows/flux-api.json",
        promptNodeId: "6",
        outputNodeId: "9",
      },
    },
  },
}
```

OpenClaw 會將該舊版結構視為圖片工作流程設定。

## 圖片工作流程

設定預設圖片模型：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "comfy/workflow",
      },
    },
  },
}
```

參考圖片編輯範例：

```json5
{
  models: {
    providers: {
      comfy: {
        image: {
          workflowPath: "./workflows/edit-api.json",
          promptNodeId: "6",
          inputImageNodeId: "7",
          inputImageInputName: "image",
          outputNodeId: "9",
        },
      },
    },
  },
}
```

## 影片工作流程

設定預設影片模型：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "comfy/workflow",
      },
    },
  },
}
```

Comfy 影片工作流程目前透過配置的圖表支援文字轉影片與圖片轉影片。
OpenClaw 不會將輸入影片傳入 Comfy 工作流程。

## 音樂工作流程

內建外掛為工作流程定義的音訊或音樂輸出註冊了一個音樂生成提供者，
透過共享的 `music_generate` 工具公開：

```text
/tool music_generate prompt="Warm ambient synth loop with soft tape texture"
```

使用 `music` 設定區段指向您的音訊工作流程 JSON 與輸出
節點。

## Comfy Cloud

使用 `mode: "cloud"` 加上以下其中一項：

- `COMFY_API_KEY`
- `COMFY_CLOUD_API_KEY`
- `models.providers.comfy.apiKey`

雲端模式仍使用相同的 `image`、`video` 與 `music` 工作流程區段。

## 即時測試

內建外掛具有選用的即時覆蓋率：

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

除非已配置相符的 Comfy 工作流程區段，否則即時測試會略過個別的圖片、影片或音樂案例。

## 相關

- [圖片生成](/en/tools/image-generation)
- [影片生成](/en/tools/video-generation)
- [音樂生成](/en/tools/music-generation)
- [提供者目錄](/en/providers/index)
- [設定參考](/en/gateway/configuration-reference#agent-defaults)
