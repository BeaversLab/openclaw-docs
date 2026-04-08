---
title: "Runway"
summary: "在 OpenClaw 中設定 Runway 影片生成"
read_when:
  - You want to use Runway video generation in OpenClaw
  - You need the Runway API key/env setup
  - You want to make Runway the default video provider
---

# Runway

OpenClaw 附帶了一個內建的 `runway` 提供者，用於託管影片生成。

- 提供者 ID：`runway`
- 驗證：`RUNWAYML_API_SECRET`（標準）或 `RUNWAY_API_KEY`
- API：Runway 基於任務的影片生成（`GET /v1/tasks/{id}` 輪詢）

## 快速開始

1. 設定 API 金鑰：

```bash
openclaw onboard --auth-choice runway-api-key
```

2. 將 Runway 設為預設影片提供者：

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5"
```

3. 請代理程式生成影片。系統將自動使用 Runway。

## 支援的模式

| 模式       | 模型             | 參考輸入           |
| ---------- | ---------------- | ------------------ |
| 文字生影片 | `gen4.5`（預設） | 無                 |
| 圖片生影片 | `gen4.5`         | 1 張本地或遠端圖片 |
| 影片生影片 | `gen4_aleph`     | 1 個本地或遠端影片 |

- 支援透過 data URI 參考本地圖片和影片。
- 影片生影片目前特別需要 `runway/gen4_aleph`。
- 純文字執行目前支援 `16:9` 和 `9:16` 寬高比。

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

## 相關

- [影片生成](/en/tools/video-generation) -- 共用工具參數、提供者選取和非同步行為
- [設定參考](/en/gateway/configuration-reference#agent-defaults)
