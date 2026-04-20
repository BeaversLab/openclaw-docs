---
title: "Runway"
summary: "在 OpenClaw 中設定 Runway 影片生成"
read_when:
  - You want to use Runway video generation in OpenClaw
  - You need the Runway API key/env setup
  - You want to make Runway the default video provider
---

# Runway

OpenClaw 附帶了一個捆綁的 `runway` 提供者，用於託管視訊生成。

| 屬性      | 值                                                    |
| --------- | ----------------------------------------------------- |
| 提供者 ID | `runway`                                              |
| 驗證      | `RUNWAYML_API_SECRET` (標準) 或 `RUNWAY_API_KEY`      |
| API       | Runway 基於任務的視訊生成 (`GET /v1/tasks/{id}` 輪詢) |

## 快速入門

<Steps>
  <Step title="設定 API 金鑰">```bash openclaw onboard --auth-choice runway-api-key ```</Step>
  <Step title="將 Runway 設為預設的影片提供者">```bash openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5" ```</Step>
  <Step title="產生影片">請代理程式產生影片。系統將自動使用 Runway。</Step>
</Steps>

## 支援的模式

| 模式         | 模型            | 參考輸入           |
| ------------ | --------------- | ------------------ |
| 文字生成影片 | `gen4.5` (預設) | 無                 |
| 圖片生成影片 | `gen4.5`        | 1 張本地或遠端圖片 |
| 影片生成影片 | `gen4_aleph`    | 1 個本地或遠端影片 |

<Note>支援透過 data URI 來參照本地圖片和影片。純文字執行目前公開了 `16:9` 和 `9:16` 長寬比。</Note>

<Warning>影片生成影片目前特別需要 `runway/gen4_aleph`。</Warning>

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

## 進階說明

<AccordionGroup>
  <Accordion title="環境變數別名">
    OpenClaw 可識別 `RUNWAYML_API_SECRET` (標準) 和 `RUNWAY_API_KEY`。
    這兩個變數皆可用來認證 Runway 提供者。
  </Accordion>

  <Accordion title="任務輪詢">
    Runway 使用以任務為基礎的 API。提交生成請求後，OpenClaw
    會輪詢 `GET /v1/tasks/{id}` 直到影片準備就緒。無需針對
    輪詢行為進行額外設定。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="影片生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用工具參數、提供者選擇以及非同步行為。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/configuration-reference#agent-defaults" icon="gear">
    代理程式的預設設定，包括影片生成模型。
  </Card>
</CardGroup>
