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
  <Step title="Set the API key">```bash openclaw onboard --auth-choice runway-api-key ```</Step>
  <Step title="Set Runway as the default video provider">```bash openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5" ```</Step>
  <Step title="生成視訊">要求代理生成一個視訊。系統將自動使用 Runway。</Step>
</Steps>

## 支援的模式

| 模式         | 模型            | 參考輸入           |
| ------------ | --------------- | ------------------ |
| 文字生成視訊 | `gen4.5` (預設) | 無                 |
| 圖片生成視訊 | `gen4.5`        | 1 張本機或遠端圖片 |
| 視訊生成視訊 | `gen4_aleph`    | 1 個本機或遠端視訊 |

<Note>透過 data URI 支援本機圖片和視訊參考。目前純文字執行 僅公開 `16:9` 和 `9:16` 長寬比。</Note>

<Warning>目前視訊生成視訊特別需要 `runway/gen4_aleph`。</Warning>

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
    OpenClaw 同時識別 `RUNWAYML_API_SECRET` (標準) 和 `RUNWAY_API_KEY`。
    任一變數皆可用於驗證 Runway 提供者。
  </Accordion>

  <Accordion title="任務輪詢">
    Runway 使用基於任務的 API。提交生成請求後，OpenClaw
    會輪詢 `GET /v1/tasks/{id}` 直到視訊準備就緒。輪詢行為
    無需額外設定。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="視訊生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的工具參數、提供者選擇以及非同步行為。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/configuration-reference#agent-defaults" icon="gear">
    代理預設設定，包括視訊生成模型。
  </Card>
</CardGroup>
