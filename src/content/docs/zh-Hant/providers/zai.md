---
summary: "使用 Z.AI (GLM 模型) 與 OpenClaw"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

# Z.AI

Z.AI 是 **GLM** 模型的 API 平台。它提供 GLM 的 REST API，並使用 API 金鑰進行驗證。在 Z.AI 控制台中建立您的 API 金鑰。OpenClaw 使用 `zai` 提供者搭配 Z.AI API 金鑰。

## CLI 設定

```bash
# Generic API-key setup with endpoint auto-detection
openclaw onboard --auth-choice zai-api-key

# Coding Plan Global, recommended for Coding Plan users
openclaw onboard --auth-choice zai-coding-global

# Coding Plan CN (China region), recommended for Coding Plan users
openclaw onboard --auth-choice zai-coding-cn

# General API
openclaw onboard --auth-choice zai-global

# General API CN (China region)
openclaw onboard --auth-choice zai-cn
```

## 設定片段

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5" } } },
}
```

`zai-api-key` 讓 OpenClaw 從金鑰中偵測相符的 Z.AI 端點並自動套用正確的基礎 URL。當您想要強制使用特定的編碼方案（Coding Plan）或一般 API 介面時，請使用明確的區域選項。

## 內建的 GLM 目錄

OpenClaw 目前為內建的 `zai` 提供者植入以下內容：

- `glm-5.1`
- `glm-5`
- `glm-5-turbo`
- `glm-5v-turbo`
- `glm-4.7`
- `glm-4.7-flash`
- `glm-4.7-flashx`
- `glm-4.6`
- `glm-4.6v`
- `glm-4.5`
- `glm-4.5-air`
- `glm-4.5-flash`
- `glm-4.5v`

## 備註

- GLM 模型可作為 `zai/<model>` 使用（例如：`zai/glm-5`）。
- 預設內建模型參照：`zai/glm-5`
- 未知的 `glm-5*` ID 在符合當前 GLM-5 系列形狀時，仍會透過從 `glm-4.7` 樣板合成提供者擁有的元數據，在內建提供者路徑上進行正向解析。
- `tool_stream` 針對 Z.AI 工具呼叫串流預設為啟用。將 `agents.defaults.models["zai/<model>"].params.tool_stream` 設為 `false` 即可停用。
- 請參閱 [/providers/glm](/en/providers/glm) 以了解模型系列概覽。
- Z.AI 使用您的 API 金鑰進行 Bearer 認證。
