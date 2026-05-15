---
summary: "在 OpenClaw 中設定 Runway 影片生成"
title: "Runway"
read_when:
  - You want to use Runway video generation in OpenClaw
  - You need the Runway API key/env setup
  - You want to make Runway the default video provider
---

OpenClaw 內建了一個用於託管影片生成的 `runway` 提供者。此外掛程式預設為啟用，並針對 `videoGenerationProviders` 合約註冊 `runway` 提供者。

| 屬性          | 值                                                    |
| ------------- | ----------------------------------------------------- |
| 供應商 ID     | `runway`                                              |
| 外掛程式      | 內建，`enabledByDefault: true`                        |
| Auth 環境變數 | `RUNWAYML_API_SECRET` (標準) 或 `RUNWAY_API_KEY`      |
| 入門旗標      | `--auth-choice runway-api-key`                        |
| 直接 CLI 旗標 | `--runway-api-key <key>`                              |
| API           | Runway 基於任務的影片生成 (`GET /v1/tasks/{id}` 輪詢) |
| 預設模型      | `runway/gen4.5`                                       |

## 開始使用

<Steps>
  <Step title="設定 API 金鑰">```bash openclaw onboard --auth-choice runway-api-key ```</Step>
  <Step title="將 Runway 設為預設影片提供者">```bash openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5" ```</Step>
  <Step title="生成影片">要求代理程式生成影片。Runway 將會自動被使用。</Step>
</Steps>

## 支援的模式和模型

此提供者公開了七個 Runway 模型，分佈在三種模式中。同一個模型 ID 可以服務多種模式 (例如 `gen4.5` 適用於文字轉影片和圖片轉影片)。

| 模式       | 模型                                                                   | 參考輸入           |
| ---------- | ---------------------------------------------------------------------- | ------------------ |
| 文字轉影片 | `gen4.5` (預設)，`veo3.1`，`veo3.1_fast`，`veo3`                       | 無                 |
| 圖片轉影片 | `gen4.5`，`gen4_turbo`，`gen3a_turbo`，`veo3.1`，`veo3.1_fast`，`veo3` | 1 個本機或遠端圖片 |
| 影片轉影片 | `gen4_aleph`                                                           | 1 個本機或遠端影片 |

本機圖片和影片參考可透過 data URIs 來支援。

| 長寬比         | 允許值                                      |
| -------------- | ------------------------------------------- |
| 文字轉影片     | `16:9`，`9:16`                              |
| 圖片和影片編輯 | `1:1`、`16:9`、`9:16`、`3:4`、`4:3`、`21:9` |

<Warning>影片轉影片目前需要 `runway/gen4_aleph`。其他 Runway 模型 ID 會拒絕影片參考輸入。</Warning>

<Note>如果從錯誤的欄位選擇 Runway 模型 ID，在 API 請求離開 OpenClaw 之前會產生明確的錯誤。提供者會在 `extensions/runway/video-generation-provider.ts` 中針對模式的允許清單 (`TEXT_ONLY_MODELS`、`IMAGE_MODELS`、`VIDEO_MODELS`) 驗證 `model`。</Note>

## 設定

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "runway/gen4.5",
      },
    },
  },
}
```

## 進階設定

<AccordionGroup>
  <Accordion title="環境變數別名">
    OpenClaw 能識別 `RUNWAYML_API_SECRET` (標準) 和 `RUNWAY_API_KEY`。
    這兩個變數都可以用來驗證 Runway 提供者。
  </Accordion>

  <Accordion title="任務輪詢">
    Runway 使用基於任務的 API。提交生成請求後，OpenClaw 會
    輪詢 `GET /v1/tasks/{id}` 直到影片準備就緒。不需要
    針對輪詢行為進行額外設定。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="影片生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的工具參數、提供者選擇和異步行為。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/config-agents#agent-defaults" icon="gear">
    Agent 預設設定，包括影片生成模型。
  </Card>
</CardGroup>
