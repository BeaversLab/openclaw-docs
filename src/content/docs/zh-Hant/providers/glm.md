---
summary: "GLM 模型系列概述 + 如何在 OpenClaw 中使用它"
read_when:
  - You want GLM models in OpenClaw
  - You need the model naming convention and setup
title: "GLM (智譜)"
---

# GLM 模型

GLM 是一個可透過 Z.AI 平台使用的**模型系列**（而非公司）。在 OpenClaw 中，GLM 模型是透過 `zai` 提供者和像 `zai/glm-5` 這樣的模型 ID 來存取的。

## 開始使用

<Steps>
  <Step title="Choose an auth route and run onboarding">
    選擇符合您 Z.AI 方案和區域的上手選擇：

    | Auth choice | Best for |
    | ----------- | -------- |
    | `zai-api-key` | Generic API-key setup with endpoint auto-detection |
    | `zai-coding-global` | Coding Plan users (global) |
    | `zai-coding-cn` | Coding Plan users (China region) |
    | `zai-global` | General API (global) |
    | `zai-cn` | General API (China region) |

    ```bash
    # Example: generic auto-detect
    openclaw onboard --auth-choice zai-api-key

    # Example: Coding Plan global
    openclaw onboard --auth-choice zai-coding-global
    ```

  </Step>
  <Step title="Set GLM as the default model">
    ```bash
    openclaw config set agents.defaults.model.primary "zai/glm-5.1"
    ```
  </Step>
  <Step title="Verify models are available">
    ```bash
    openclaw models list --provider zai
    ```
  </Step>
</Steps>

## 配置範例

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
}
```

<Tip>`zai-api-key` 讓 OpenClaw 從金鑰中偵測相符的 Z.AI 端點，並自動套用正確的基礎 URL。當您想要強制使用特定的 Coding Plan 或一般 API 介面時，請使用明確的區域選項。</Tip>

## 內建的 GLM 模型

OpenClaw 目前使用這些 GLM 參考來初始化內建的 `zai` 提供者：

| Model           | Model            |
| --------------- | ---------------- |
| `glm-5.1`       | `glm-4.7`        |
| `glm-5`         | `glm-4.7-flash`  |
| `glm-5-turbo`   | `glm-4.7-flashx` |
| `glm-5v-turbo`  | `glm-4.6`        |
| `glm-4.5`       | `glm-4.6v`       |
| `glm-4.5-air`   |                  |
| `glm-4.5-flash` |                  |
| `glm-4.5v`      |                  |

<Note>預設的內建模組參照是 `zai/glm-5.1`。GLM 版本和可用性 可能會變更；請查看 Z.AI 文件以取得最新資訊。</Note>

## 進階說明

<AccordionGroup>
  <Accordion title="端點自動偵測">
    當您使用 `zai-api-key` 選項時，OpenClaw 會檢查金鑰格式
    以判斷正確的 Z.AI 基礎 URL。明確的區域選項
    (`zai-coding-global`、 `zai-coding-cn`、 `zai-global`、 `zai-cn`) 會覆蓋
    自動偵測並直接鎖定端點。
  </Accordion>

  <Accordion title="提供者詳細資訊">
    GLM 模型由 `zai` 執行時提供者提供。如需完整的提供者
    設定、區域端點及其他功能，請參閱
    [Z.AI provider docs](/zh-Hant/providers/zai)。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Z.AI provider" href="/zh-Hant/providers/zai" icon="server">
    完整的 Z.AI provider 設定和區域端點。
  </Card>
  <Card title="模型選擇" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和容錯移轉行為。
  </Card>
</CardGroup>
