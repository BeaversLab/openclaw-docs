---
summary: "OpenClaw 中的阿里模型工作室 Wan 視訊生成"
title: "阿里的模型工作室"
read_when:
  - You want to use Alibaba Wan video generation in OpenClaw
  - You need Model Studio or DashScope API key setup for video generation
---

OpenClaw 隨附了針對阿里模型工作室 / DashScope 上 Wan 模型的內建 `alibaba` 視訊生成供應商。

- 供應商：`alibaba`
- 推薦認證方式：`MODELSTUDIO_API_KEY`
- 也接受：`DASHSCOPE_API_KEY`, `QWEN_API_KEY`
- API：DashScope / Model Studio 非同步視訊生成

## 開始使用

<Steps>
  <Step title="設定 API 金鑰">
    ```bash
    openclaw onboard --auth-choice qwen-standard-api-key
    ```
  </Step>
  <Step title="設定預設視訊模型">
    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "alibaba/wan2.6-t2v",
          },
        },
      },
    }
    ```
  </Step>
  <Step title="驗證供應商是否可用">
    ```bash
    openclaw models list --provider alibaba
    ```
  </Step>
</Steps>

<Note>任何接受的認證金鑰 (`MODELSTUDIO_API_KEY`, `DASHSCOPE_API_KEY`, `QWEN_API_KEY`) 均可使用。`qwen-standard-api-key` 入門選項會設定共用的 DashScope 憑證。</Note>

## 內建的 Wan 模型

隨附的 `alibaba` 供應商目前註冊了以下模型：

| 模型參照                   | 模式                |
| -------------------------- | ------------------- |
| `alibaba/wan2.6-t2v`       | 文字生成視訊        |
| `alibaba/wan2.6-i2v`       | 圖片生成視訊        |
| `alibaba/wan2.6-r2v`       | 參照生成視訊        |
| `alibaba/wan2.6-r2v-flash` | 參照生成視訊 (快速) |
| `alibaba/wan2.7-r2v`       | 參照生成視訊        |

## 目前限制

| 參數          | 限制                                                      |
| ------------- | --------------------------------------------------------- |
| 輸出視訊      | 每次請求最多 **1** 個                                     |
| 輸入圖片      | 最多 **1** 張                                             |
| 輸入視訊      | 最多 **4** 個                                             |
| 持續時間      | 最長 **10 秒**                                            |
| 支援的控制項  | `size`, `aspectRatio`, `resolution`, `audio`, `watermark` |
| 參照圖片/視訊 | 僅限遠端 `http(s)` URL                                    |

<Warning>參照圖片/視訊模式目前需要 **遠端 http(s) URL**。不支援本地檔案路徑作為參照輸入。</Warning>

## 進階配置

<AccordionGroup>
  <Accordion title="與 Qwen 的關聯">
    隨附的 `qwen` 提供者也使用阿里託管的 DashScope 端點進行
    Wan 影片生成。使用：

    - `qwen/...` 當您想要標準的 Qwen 提供者介面時
    - `alibaba/...` 當您想要直接的廠商擁有的 Wan 影片介面時

    詳情請參閱 [Qwen provider docs](/zh-Hant/providers/qwen)。

  </Accordion>

  <Accordion title="驗證金鑰優先順序">
    OpenClaw 會依照以下順序檢查驗證金鑰：

    1. `MODELSTUDIO_API_KEY` (優先)
    2. `DASHSCOPE_API_KEY`
    3. `QWEN_API_KEY`

    以上任何一個皆可用於驗證 `alibaba` 提供者。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="影片生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的影片工具參數與提供者選擇。
  </Card>
  <Card title="Qwen" href="/zh-Hant/providers/qwen" icon="microchip">
    Qwen 提供者設定與 DashScope 整合。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/config-agents#agent-defaults" icon="gear">
    Agent 預設值與模型設定。
  </Card>
</CardGroup>
