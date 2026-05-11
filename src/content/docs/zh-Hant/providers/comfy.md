---
summary: "在 OpenClaw 中設定 ComfyUI 工作流程圖像、影片和音樂生成"
title: "ComfyUI"
read_when:
  - You want to use local ComfyUI workflows with OpenClaw
  - You want to use Comfy Cloud with image, video, or music workflows
  - You need the bundled comfy plugin config keys
---

OpenClaw 隨附一個用於驅動工作流程 ComfyUI 執行捆綁的 `comfy` 外掛程式。該外掛程式完全由工作流程驅動，因此 OpenClaw 不會嘗試將通用的 `size`、`aspectRatio`、`resolution`、`durationSeconds` 或 TTS 風格的控制對應到您的圖表中。

| 屬性     | 詳情                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| 提供者   | `comfy`                                                                            |
| 模型     | `comfy/workflow`                                                                   |
| 共享介面 | `image_generate`、`video_generate`、`music_generate`                               |
| 驗證     | 本地 ComfyUI 無需驗證；Comfy Cloud 則需要 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY` |
| API      | ComfyUI `/prompt` / `/history` / `/view` 和 Comfy Cloud `/api/*`                   |

## 支援內容

- 從工作流程 JSON 生成圖像
- 使用 1 張上傳的參考圖像進行圖像編輯
- 從工作流程 JSON 生成影片
- 使用 1 張上傳的參考圖像生成影片
- 透過共享的 `music_generate` 工具生成音樂或音訊
- 從設定的節點或所有符合條件的輸出節點下載輸出

## 快速入門

選擇在您自己的機器上運行 ComfyUI 或使用 Comfy Cloud。

<Tabs>
  <Tab title="Local">
    **最適合：** 在您的機器或區域網路上執行您自己的 ComfyUI 實例。

    <Steps>
      <Step title="在本機啟動 ComfyUI">
        請確保您的本機 ComfyUI 實例正在執行（預設為 `http://127.0.0.1:8188`）。
      </Step>
      <Step title="準備您的工作流程 JSON">
        匯出或建立一個 ComfyUI 工作流程 JSON 檔案。請記下提示詞輸入節點以及您希望 OpenClaw 讀取的輸出節點的節點 ID。
      </Step>
      <Step title="設定提供者">
        設定 `mode: "local"` 並指向您的工作流程檔案。以下是一個最基本的圖像範例：

        ```json5
        {
          plugins: {
            entries: {
              comfy: {
                config: {
                  mode: "local",
                  baseUrl: "http://127.0.0.1:8188",
                  image: {
                    workflowPath: "./workflows/flux-api.json",
                    promptNodeId: "6",
                    outputNodeId: "9",
                  },
                },
              },
            },
          },
        }
        ```
      </Step>
      <Step title="設定預設模型">
        將 OpenClaw 指向您所設定功能的 `comfy/workflow` 模型：

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
      </Step>
      <Step title="驗證">
        ```bash
        openclaw models list --provider comfy
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Comfy Cloud">
    **最適合：** 在 Comfy Cloud 上執行工作流程，無需管理本機 GPU 資源。

    <Steps>
      <Step title="取得 API 金鑰">
        在 [comfy.org](https://comfy.org) 註冊，並從您的帳號儀表板生成 API 金鑰。
      </Step>
      <Step title="設定 API 金鑰">
        透過以下任一方法提供您的金鑰：

        ```bash
        # Environment variable (preferred)
        export COMFY_API_KEY="your-key"

        # Alternative environment variable
        export COMFY_CLOUD_API_KEY="your-key"

        # Or inline in config
        openclaw config set plugins.entries.comfy.config.apiKey "your-key"
        ```
      </Step>
      <Step title="準備您的工作流程 JSON">
        匯出或建立 ComfyUI 工作流程 JSON 檔案。請記下提示詞輸入節點和輸出節點的節點 ID。
      </Step>
      <Step title="設定提供者">
        設定 `mode: "cloud"` 並指向您的工作流程檔案：

        ```json5
        {
          plugins: {
            entries: {
              comfy: {
                config: {
                  mode: "cloud",
                  image: {
                    workflowPath: "./workflows/flux-api.json",
                    promptNodeId: "6",
                    outputNodeId: "9",
                  },
                },
              },
            },
          },
        }
        ```

        <Tip>
        雲端模式預設將 `baseUrl` 設為 `https://cloud.comfy.org`。只有在您使用自訂雲端端點時才需要設定 `baseUrl`。
        </Tip>
      </Step>
      <Step title="設定預設模型">
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
      </Step>
      <Step title="驗證">
        ```bash
        openclaw models list --provider comfy
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 設定

Comfy 支援共用的頂層連線設定，以及各功能區段的工作流程 (`image`、`video`、`music`)：

```json5
{
  plugins: {
    entries: {
      comfy: {
        config: {
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
  },
}
```

### 共用金鑰

| 金鑰                  | 類型                   | 說明                                                                            |
| --------------------- | ---------------------- | ------------------------------------------------------------------------------- |
| `mode`                | `"local"` 或 `"cloud"` | 連線模式。                                                                      |
| `baseUrl`             | 字串                   | 本機預設為 `http://127.0.0.1:8188`，雲端則預設為 `https://cloud.comfy.org`。    |
| `apiKey`              | 字串                   | 可選的內聯金鑰，是 `COMFY_API_KEY` / `COMFY_CLOUD_API_KEY` 環境變數的替代方案。 |
| `allowPrivateNetwork` | 布林值                 | 允許在雲端模式下使用私有/LAN `baseUrl`。                                        |

### 各功能金鑰

這些金鑰適用於 `image`、`video` 或 `music` 區段內：

| 金鑰                         | 必填 | 預設     | 說明                                                          |
| ---------------------------- | ---- | -------- | ------------------------------------------------------------- |
| `workflow` 或 `workflowPath` | 是   | --       | ComfyUI 工作流程 JSON 檔案的路徑。                            |
| `promptNodeId`               | 是   | --       | 接收文字提示的節點 ID。                                       |
| `promptInputName`            | 否   | `"text"` | 提示節點上的輸入名稱。                                        |
| `outputNodeId`               | 否   | --       | 要從中讀取輸出的節點 ID。如果省略，則使用所有符合的輸出節點。 |
| `pollIntervalMs`             | 否   | --       | 輪詢任務完成的間隔（毫秒）。                                  |
| `timeoutMs`                  | 否   | --       | 工作流程執行的逾時時間（毫秒）。                              |

`image` 和 `video` 區段也支援：

| 金鑰                  | 必填                 | 預設      | 說明                        |
| --------------------- | -------------------- | --------- | --------------------------- |
| `inputImageNodeId`    | 是（傳遞參考圖片時） | --        | 接收上傳參考圖片的節點 ID。 |
| `inputImageInputName` | 否                   | `"image"` | 圖片節點上的輸入名稱。      |

## 工作流程詳情

<AccordionGroup>
  <Accordion title="圖片工作流程">
    將預設圖片模型設定為 `comfy/workflow`：

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

    **參考圖片編輯範例：**

    若要使用上傳的參考圖片啟用圖片編輯，請將 `inputImageNodeId` 加入您的圖片設定：

    ```json5
    {
      plugins: {
        entries: {
          comfy: {
            config: {
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
      },
    }
    ```

  </Accordion>

  <Accordion title="影片工作流程">
    將預設影片模型設定為 `comfy/workflow`：

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

    Comfy 影片工作流程透過設定的圖表支援文字生成影片與圖片生成影片。

    <Note>
    OpenClaw 不會將輸入影片傳遞至 Comfy 工作流程。僅支援文字提示和單一參考圖片作為輸入。
    </Note>

  </Accordion>

  <Accordion title="音樂工作流程">
    內建外掛為工作流程定義的音訊或音樂輸出註冊了一個音樂生成提供者，透過共享的 `music_generate` 工具公開：

    ```text
    /tool music_generate prompt="Warm ambient synth loop with soft tape texture"
    ```

    使用 `music` 設定區段指向您的音樂工作流程 JSON 和輸出節點。

  </Accordion>

  <Accordion title="向後相容性">
    現有的頂層影像設定（不包含巢狀的 `image` 區段）仍然有效：

    ```json5
    {
      plugins: {
        entries: {
          comfy: {
            config: {
              workflowPath: "./workflows/flux-api.json",
              promptNodeId: "6",
              outputNodeId: "9",
            },
          },
        },
      },
    }
    ```

    OpenClaw 將該舊版結構視為影像工作流程設定。您不需要立即遷移，但建議新設定使用巢狀的 `image` / `video` / `music` 區段。

    <Tip>
    如果您僅使用影像生成，舊版扁平設定與新的巢狀 `image` 區段在功能上是等效的。
    </Tip>

  </Accordion>

  <Accordion title="即時測試">
    內建外掛具備可選用的即時覆蓋範圍：

    ```bash
    OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
    ```

    除非已設定符合的 Comfy 工作流程區段，否則即時測試會跳過個別的影像、視訊或音樂案例。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="影像生成" href="/zh-Hant/tools/image-generation" icon="image">
    影像生成工具的設定與用法。
  </Card>
  <Card title="視訊生成" href="/zh-Hant/tools/video-generation" icon="video">
    視訊生成工具的設定與用法。
  </Card>
  <Card title="音樂生成" href="/zh-Hant/tools/music-generation" icon="music">
    音樂與音訊生成工具的設定。
  </Card>
  <Card title="提供商目錄" href="/zh-Hant/providers/index" icon="layers">
    所有提供商和模型參考的概覽。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/config-agents#agent-defaults" icon="gear">
    完整的設定參考，包括代理預設值。
  </Card>
</CardGroup>
