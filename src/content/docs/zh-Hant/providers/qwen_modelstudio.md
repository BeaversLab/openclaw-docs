---
title: "Qwen / Model Studio"
summary: "Alibaba Cloud Model Studio 設定（Standard 按量付費與 Coding Plan，雙區域端點）"
read_when:
  - You want to use Qwen (Alibaba Cloud Model Studio) with OpenClaw
  - You need the API key env var for Model Studio
  - You want to use the Standard (pay-as-you-go) or Coding Plan endpoint
---

# Qwen / Model Studio (Alibaba Cloud)

Model Studio 提供者允許存取 Alibaba Cloud 模型，包括 Qwen
以及託管在平台上的第三方模型。支援兩種計費方案：
**Standard**（按量付費）和 **Coding Plan**（訂閱制）。

- Provider: `modelstudio`
- Auth: `MODELSTUDIO_API_KEY`
- API: OpenAI 相容

## 快速開始

### Standard (按量付費)

```bash
# China endpoint
openclaw onboard --auth-choice modelstudio-standard-api-key-cn

# Global/Intl endpoint
openclaw onboard --auth-choice modelstudio-standard-api-key
```

### Coding Plan (訂閱制)

```bash
# China endpoint
openclaw onboard --auth-choice modelstudio-api-key-cn

# Global/Intl endpoint
openclaw onboard --auth-choice modelstudio-api-key
```

完成入門後，設定預設模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "modelstudio/qwen3.5-plus" },
    },
  },
}
```

## 方案類型與端點

| 方案                | 區域 | Auth 選擇                         | 端點                                             |
| ------------------- | ---- | --------------------------------- | ------------------------------------------------ |
| Standard (按量付費) | 中國 | `modelstudio-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| 標準版（按量付費）  | 全球 | `modelstudio-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| 編程方案（訂閱制）  | 中國 | `modelstudio-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| 編程方案（訂閱制）  | 全球 | `modelstudio-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

提供商會根據您的認證選擇自動選擇端點。您可以在配置中通過自定義 `baseUrl` 進行覆蓋。

## 獲取您的 API 金鑰

- **中國**: [bailian.console.aliyun.com](https://bailian.console.aliyun.com/)
- **全球/國際**: [modelstudio.console.alibabacloud.com](https://modelstudio.console.alibabacloud.com/)

## 可用模型

- **qwen3.5-plus**（預設）— Qwen 3.5 Plus
- **qwen3-coder-plus**、**qwen3-coder-next** — Qwen 編碼模型
- **GLM-5** — 通過阿里雲提供的 GLM 模型
- **Kimi K2.5** — 通過阿里雲提供的 Moonshot AI
- **MiniMax-M2.5** — 通過阿里雲提供的 MiniMax

部分模型（qwen3.5-plus、kimi-k2.5）支援圖片輸入。上下文視窗範圍從 200K 到 1M tokens。

## 環境注意事項

如果 Gateway 作為守護程式（launchd/systemd）運行，請確保
`MODELSTUDIO_API_KEY` 對該程式可用（例如，在
`~/.openclaw/.env` 中或透過 `env.shellEnv`）。
