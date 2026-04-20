---
title: "Alibaba Model Studio"
summary: "OpenClaw 中的 Alibaba Model Studio Wan 視訊生成"
read_when:
  - You want to use Alibaba Wan video generation in OpenClaw
  - You need Model Studio or DashScope API key setup for video generation
---

# Alibaba Model Studio

OpenClaw 內建了針對 Alibaba Model Studio / DashScope 上 Wan 模型的 `alibaba` 視訊生成供應商。

- 供應商：`alibaba`
- 首選驗證：`MODELSTUDIO_API_KEY`
- 也接受：`DASHSCOPE_API_KEY`、`QWEN_API_KEY`
- API：DashScope / Model Studio 非同步影片生成

## 開始使用

<Steps>
  <Step title="設定 API 金鑰">
    ```bash
    openclaw onboard --auth-choice qwen-standard-api-key
    ```
  </Step>
  <Step title="設定預設影片模型">
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
  <Step title="驗證提供者是否可用">
    ```bash
    openclaw models list --provider alibaba
    ```
  </Step>
</Steps>

<Note>任何接受的驗證金鑰 (`MODELSTUDIO_API_KEY`、`DASHSCOPE_API_KEY`、`QWEN_API_KEY`) 均可使用。`qwen-standard-api-key` 入門選項會設定共享的 DashScope 憑證。</Note>

## 內建 Wan 模型

內建的 `alibaba` 提供者目前註冊了：

| 模型參照                   | 模式                |
| -------------------------- | ------------------- |
| `alibaba/wan2.6-t2v`       | 文字生成影片        |
| `alibaba/wan2.6-i2v`       | 圖片生成影片        |
| `alibaba/wan2.6-r2v`       | 參照生成影片        |
| `alibaba/wan2.6-r2v-flash` | 參照生成影片 (快速) |
| `alibaba/wan2.7-r2v`       | 參照生成影片        |

## 目前限制

| 參數          | 限制                                                      |
| ------------- | --------------------------------------------------------- |
| 輸出影片      | 每個請求最多 **1** 個                                     |
| 輸入圖片      | 最多 **1** 張                                             |
| 輸入影片      | 最多 **4** 個                                             |
| 持續時間      | 最長 **10 秒**                                            |
| 支援的控制項  | `size`、`aspectRatio`、`resolution`、`audio`、`watermark` |
| 參照圖片/影片 | 僅限遠端 `http(s)` 網址                                   |

<Warning>參照圖片/影片模式目前需要 **遠端 http(s) 網址**。參照輸入不支援本機檔案路徑。</Warning>

## 進階設定

<AccordionGroup>
  <Accordion title="與 Qwen 的關係">
    內建的 `qwen` 提供者也使用 Alibaba 託管的 DashScope 端點來進行
    Wan 影片生成。使用：

    - 當您想要標準的 Qwen 提供者介面時，請使用 `qwen/...`
    - 當您想要直接供應商擁有的 Wan 影片介面時，請使用 `alibaba/...`

    詳情請參閱 [Qwen 提供者文件](/zh-Hant/providers/qwen)。

  </Accordion>

  <Accordion title="Auth key priority">
    OpenClaw 會依以下順序檢查驗證金鑰：

    1. `MODELSTUDIO_API_KEY` (優先)
    2. `DASHSCOPE_API_KEY`
    3. `QWEN_API_KEY`

    以上任何一項皆可用於驗證 `alibaba` 提供者。

  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Video generation" href="/zh-Hant/tools/video-generation" icon="video">
    共用的影片工具參數與提供者選擇。
  </Card>
  <Card title="Qwen" href="/zh-Hant/providers/qwen" icon="microchip">
    Qwen 提供者設定與 DashScope 整合。
  </Card>
  <Card title="Configuration reference" href="/zh-Hant/gateway/configuration-reference#agent-defaults" icon="gear">
    Agent 預設值與模型設定。
  </Card>
</CardGroup>
