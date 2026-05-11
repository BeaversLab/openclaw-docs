---
summary: "在 OpenClaw 中設定 Runway 影片生成"
title: "Runway"
read_when:
  - You want to use Runway video generation in OpenClaw
  - You need the Runway API key/env setup
  - You want to make Runway the default video provider
---

OpenClaw 附帶了一個用於託管影片生成的內建 `runway` 供應商。

| 屬性      | 值                                                    |
| --------- | ----------------------------------------------------- |
| 供應商 ID | `runway`                                              |
| 驗證      | `RUNWAYML_API_SECRET` (標準) 或 `RUNWAY_API_KEY`      |
| API       | Runway 基於任務的影片生成 (`GET /v1/tasks/{id}` 輪詢) |

## 開始使用

<Steps>
  <Step title="設定 API 金鑰">```bash openclaw onboard --auth-choice runway-api-key ```</Step>
  <Step title="將 Runway 設為預設影片供應商">```bash openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5" ```</Step>
  <Step title="生成影片">要求代理程式生成影片。系統將自動使用 Runway。</Step>
</Steps>

## 支援的模式

| 模式         | 模型            | 參考輸入           |
| ------------ | --------------- | ------------------ |
| 文字生成影片 | `gen4.5` (預設) | 無                 |
| 圖片生成影片 | `gen4.5`        | 1 張本機或遠端圖片 |
| 影片生成影片 | `gen4_aleph`    | 1 個本機或遠端影片 |

<Note>透過 data URI 支援本機圖片和影片參考。純文字執行目前公開 `16:9` 和 `9:16` 長寬比。</Note>

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

## 進階設定

<AccordionGroup>
  <Accordion title="環境變數別名">
    OpenClaw 可辨識 `RUNWAYML_API_SECRET` (標準) 和 `RUNWAY_API_KEY`。
    任一變數皆可用於驗證 Runway 供應商。
  </Accordion>

  <Accordion title="任務輪詢">
    Runway 使用基於任務的 API。提交生成請求後，OpenClaw 會輪詢 `GET /v1/tasks/{id}` 直到影片準備就緒。輪詢行為無需額外設定。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="視訊生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用工具參數、提供者選擇和非同步行為。
  </Card>
  <Card title="設定參考" href="/zh-Hant/gateway/config-agents#agent-defaults" icon="gear">
    代理程式預設設定，包括視訊生成模型。
  </Card>
</CardGroup>
