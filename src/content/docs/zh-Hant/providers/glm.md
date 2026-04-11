---
summary: "GLM 模型系列總覽 + 如何在 OpenClaw 中使用它"
read_when:
  - You want GLM models in OpenClaw
  - You need the model naming convention and setup
title: "GLM 模型"
---

# GLM 模型

GLM 是一個透過 Z.AI 平台提供的 **模型系列**（不是公司）。在 OpenClaw 中，GLM
模型是透過 `zai` 提供者和類似 `zai/glm-5` 的模型 ID 存取的。

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
  agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
}
```

`zai-api-key` 讓 OpenClaw 從金鑰偵測相符的 Z.AI 端點，並自動套用正確的基礎 URL。當您想要強制使用特定的編碼方案或一般 API 表面時，請使用明確的區域選項。

## 目前內建的 GLM 模型

OpenClaw 目前使用這些 GLM 參考來初始化內建的 `zai` 提供者：

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

- GLM 版本和可用性可能會變動；請參閱 Z.AI 文件以取得最新資訊。
- 預設綁定模型參考為 `zai/glm-5.1`。
- 如需提供者詳細資訊，請參閱 [/providers/zai](/en/providers/zai)。
