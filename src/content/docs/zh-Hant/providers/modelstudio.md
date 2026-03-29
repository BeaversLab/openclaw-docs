---
title: "Model Studio"
summary: "Alibaba Cloud Model Studio 設定（Coding Plan，雙區域端點）"
read_when:
  - You want to use Alibaba Cloud Model Studio with OpenClaw
  - You need the API key env var for Model Studio
---

# Model Studio (阿里雲)

Model Studio 提供者可存取阿里雲 Coding Plan 模型，
包括 Qwen 和託管在平台上的第三方模型。

- 提供者： `modelstudio`
- 驗證： `MODELSTUDIO_API_KEY`
- API：與 OpenAI 相容

## 快速開始

1. 設定 API 金鑰：

```bash
openclaw onboard --auth-choice modelstudio-api-key
```

2. 設定預設模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "modelstudio/qwen3.5-plus" },
    },
  },
}
```

## 區域端點

Model Studio 根據區域有兩個端點：

| 區域      | 端點                                 |
| --------- | ------------------------------------ |
| 中國 (CN) | `coding.dashscope.aliyuncs.com`      |
| 全球      | `coding-intl.dashscope.aliyuncs.com` |

此提供者會根據驗證選項自動選擇（全球使用 `modelstudio-api-key`，
中國使用 `modelstudio-api-key-cn`）。您可以在設定中使用自訂
`baseUrl` 覆蓋。

## 可用模型

- **qwen3.5-plus** (預設) - Qwen 3.5 Plus
- **qwen3-max** - Qwen 3 Max
- **qwen3-coder** 系列 - Qwen 程式設計模型
- **GLM-5**、**GLM-4.7** - 透過 Alibaba 提供的 GLM 模型
- **Kimi K2.5** - 透過 Alibaba 提供的 Moonshot AI
- **MiniMax-M2.5** - 透過 Alibaba 提供的 MiniMax

大多數模型支援圖片輸入。內容視窗範圍從 200K 到 1M tokens。

## 環境注意事項

如果 Gateway 作為常駐程式 (launchd/systemd) 執行，請確保
`MODELSTUDIO_API_KEY` 可供該程序使用（例如，在
`~/.openclaw/.env` 中或透過 `env.shellEnv`）。
