---
summary: "在 OpenClaw 中使用 xAI Grok 模型"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

# xAI

OpenClaw 內建了一個針對 Grok 模型的 `xai` 提供者外掛程式。

## 開始使用

<Steps>
  <Step title="建立 API 金鑰">
    在 [xAI console](https://console.x.ai/) 中建立 API 金鑰。
  </Step>
  <Step title="設定您的 API 金鑰">
    設定 `XAI_API_KEY`，或執行：

    ```bash
    openclaw onboard --auth-choice xai-api-key
    ```

  </Step>
  <Step title="選擇模型">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4" } } },
    }
    ```
  </Step>
</Steps>

<Note>OpenClaw 使用 xAI Responses API 作為內建的 xAI 傳輸層。同一個 `XAI_API_KEY` 也可以驅動支援 Grok 的 `web_search`、一等公民 `x_search` 以及遠端 `code_execution`。 如果您將 xAI 金鑰儲存在 `plugins.entries.xai.config.webSearch.apiKey` 下， 內建的 xAI 模型提供者也會將該金鑰作為後備重複使用。 `code_execution` 微調位於 `plugins.entries.xai.config.codeExecution`。</Note>

## 內建模型目錄

OpenClaw 內建了以下 xAI 模型系列：

| 系列           | 模型 ID                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| Grok 3         | `grok-3`, `grok-3-fast`, `grok-3-mini`, `grok-3-mini-fast`               |
| Grok 4         | `grok-4`, `grok-4-0709`                                                  |
| Grok 4 Fast    | `grok-4-fast`, `grok-4-fast-non-reasoning`                               |
| Grok 4.1 Fast  | `grok-4-1-fast`, `grok-4-1-fast-non-reasoning`                           |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |
| Grok Code      | `grok-code-fast-1`                                                       |

當較新的 `grok-4*` 和 `grok-code-fast*` ID 遵循相同的 API 形狀時，
該外掛程式也會向前解析它們。

<Tip>`grok-4-fast`、`grok-4-1-fast` 和 `grok-4.20-beta-*` 變體是目前內建目錄中 支援影像的 Grok 參照。</Tip>

### Fast-mode 對應

`/fast on` 或 `agents.defaults.models["xai/<model>"].params.fastMode: true`
會將原生 xAI 請求重寫如下：

| 來源模型      | 快速模式目標       |
| ------------- | ------------------ |
| `grok-3`      | `grok-3-fast`      |
| `grok-3-mini` | `grok-3-mini-fast` |
| `grok-4`      | `grok-4-fast`      |
| `grok-4-0709` | `grok-4-fast`      |

### 舊版相容性別名

舊版別名仍然會正規化為內建的標準 ID：

| 舊版別名                  | 標準 ID                               |
| ------------------------- | ------------------------------------- |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## 功能

<AccordionGroup>
  <Accordion title="網路搜尋">
    內建的 `grok` 網路搜尋提供者也使用 `XAI_API_KEY`：

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="影片生成">
    內建的 `xai` 外掛程式透過共用的
    `video_generate` 工具註冊影片生成。

    - 預設影片模型：`xai/grok-imagine-video`
    - 模式：文字生成影片、圖片生成影片，以及遠端影片編輯/擴充流程
    - 支援 `aspectRatio` 和 `resolution`

    <Warning>
    不接受本機影片緩衝區。請使用遠端 `http(s)` URL 作為
    影片參考和編輯輸入。
    </Warning>

    若要使用 xAI 作為預設影片提供者：

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "xai/grok-imagine-video",
          },
        },
      },
    }
    ```

    <Note>
    請參閱 [影片生成](/en/tools/video-generation) 以了解共用工具參數、
    提供者選擇和故障轉移行為。
    </Note>

  </Accordion>

  <Accordion title="x_search 配置">
    內建的 xAI 插件將 `x_search` 公開為一個 OpenClaw 工具，用於透過 Grok 搜尋
    X (前身為 Twitter) 的內容。

    配置路徑: `plugins.entries.xai.config.xSearch`

    | Key                | Type    | Default            | Description                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | —                  | 啟用或停用 x_search           |
    | `model`            | string  | `grok-4-1-fast`    | 用於 x_search 請求的模型     |
    | `inlineCitations`  | boolean | —                  | 在結果中包含內文引註  |
    | `maxTurns`         | number  | —                  | 最大對話輪次           |
    | `timeoutSeconds`   | number  | —                  | 請求逾時時間（秒）           |
    | `cacheTtlMinutes`  | number  | —                  | 快取存活時間（分鐘）        |

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              xSearch: {
                enabled: true,
                model: "grok-4-1-fast",
                inlineCitations: true,
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="程式碼執行配置">
    內建的 xAI 插件將 `code_execution` 公開為一個 OpenClaw 工具，用於
    在 xAI 的沙盒環境中進行遠端程式碼執行。

    配置路徑: `plugins.entries.xai.config.codeExecution`

    | Key               | Type    | Default            | Description                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (if key available) | 啟用或停用程式碼執行  |
    | `model`           | string  | `grok-4-1-fast`    | 用於程式碼執行請求的模型   |
    | `maxTurns`        | number  | —                  | 最大對話輪次               |
    | `timeoutSeconds`  | number  | —                  | 請求逾時時間（秒）               |

    <Note>
    這是遠端 xAI 沙盒執行，而非本機 [`exec`](/en/tools/exec)。
    </Note>

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true,
                model: "grok-4-1-fast",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

<Accordion title="已知限制">- 目前僅支援 API Key 認證。OpenClaw 尚未支援 xAI OAuth 或裝置碼流程。 - 標準 xAI 提供者路徑不支援 `grok-4.20-multi-agent-experimental-beta-0304`，因為它需要與標準 OpenClaw xAI 傳輸不同的上游 API 介面。</Accordion>

  <Accordion title="進階說明">
    - OpenClaw 會在共享的執行路徑上自動套用 xAI 特定的工具架構和工具呼叫相容性修補程式。
    - 原生 xAI 請求預設 `tool_stream: true`。將 `agents.defaults.models["xai/<model>"].params.tool_stream` 設定為 `false` 即可停用。
    - 隨附的 xAI 包裝函式會在傳送原生 xAI 請求之前，移除不支援的嚴格工具架構標記和推論負載金鑰。
    - `web_search`、`x_search` 和 `code_execution` 會以 OpenClaw 工具的形式呈現。OpenClaw 會在每個工具請求內啟用其所需的特定 xAI 內建功能，而不是將所有原生工具附加到每個聊天輪次。
    - `x_search` 和 `code_execution` 是由隨附的 xAI 外掛程式擁有，而非硬式編碼至核心模型執行階段中。
    - `code_execution` 是遠端 xAI 沙箱執行，而非本機 [`exec`](/en/tools/exec)。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="模型選擇" href="/en/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="影片生成" href="/en/tools/video-generation" icon="video">
    共用的影片工具參數和提供者選擇。
  </Card>
  <Card title="所有提供者" href="/en/providers/index" icon="grid-2">
    更廣泛的提供者概覽。
  </Card>
  <Card title="疑難排解" href="/en/help/troubleshooting" icon="wrench">
    常見問題與修復方法。
  </Card>
</CardGroup>
