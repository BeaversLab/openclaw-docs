---
summary: "GLM 模型系列概覽及如何在 OpenClaw 中使用"
read_when:
  - You want GLM models in OpenClaw
  - You need the model naming convention and setup
title: "GLM (智譜)"
---

GLM 是透過 [Z.AI](https://z.ai) 平台提供的模型系列（非公司）。在 OpenClaw 中，GLM 模型是透過內建的 `zai` 提供者來存取，參考格式如 `zai/glm-5.1`。

| 屬性         | 值                                                                          |
| ------------ | --------------------------------------------------------------------------- |
| 提供者 ID    | `zai`                                                                       |
| 外掛程式     | 內建，`enabledByDefault: true`                                              |
| 認證環境變數 | `ZAI_API_KEY` 或 `Z_AI_API_KEY`                                             |
| 入門選項     | `zai-api-key`、`zai-coding-global`、`zai-coding-cn`、`zai-global`、`zai-cn` |
| API          | OpenAI 相容                                                                 |
| 預設基礎 URL | `https://api.z.ai/api/paas/v4`                                              |
| 建議的預設值 | `zai/glm-5.1`                                                               |
| 預設影像模型 | `zai/glm-4.6v`                                                              |

## 開始使用

<Steps>
  <Step title="選擇認證路由並執行入門">
    選擇符合您 Z.AI 方案與區域的入門選項。通用的 `zai-api-key` 選項會根據金鑰格式自動偵測對應的端點；當您想要強制使用特定的 Coding Plan 或一般 API 表面時，請使用明確的區域選項。

    | 認證選項         | 最適用於                                            |
    | ------------------- | --------------------------------------------------- |
    | `zai-api-key`       | 具有端點自動偵測功能的通用 API 金鑰        |
    | `zai-coding-global` | Coding Plan 使用者 (全球)                          |
    | `zai-coding-cn`     | Coding Plan 使用者 (中國區域)                    |
    | `zai-global`        | 一般 API (全球)                                |
    | `zai-cn`            | 一般 API (中國區域)                          |

    <CodeGroup>

```bash Auto-detect
openclaw onboard --auth-choice zai-api-key
```

```bash Coding Plan (global)
openclaw onboard --auth-choice zai-coding-global
```

```bash Coding Plan (China)
openclaw onboard --auth-choice zai-coding-cn
```

```bash General API (global)
openclaw onboard --auth-choice zai-global
```

```bash General API (China)
openclaw onboard --auth-choice zai-cn
```

    </CodeGroup>

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

<Tip>`zai-api-key` 讓 OpenClaw 從金鑰形狀偵測匹配的 Z.AI 端點，並自動套用正確的基礎 URL。當您想要鎖定特定編碼方案或一般 API 介面時，請使用明確的區域選項。</Tip>

## 內建目錄

內建的 `zai` 提供者預設了 13 個 GLM 模型參照。除非另有標註，否則所有條目都支援推理；`glm-5v-turbo` 和 `glm-4.6v` 除文字外也接受圖片輸入。

| 模型參照             | 備註                                  |
| -------------------- | ------------------------------------- |
| `zai/glm-5.1`        | 預設模型。推理、僅文字、202k 上下文。 |
| `zai/glm-5`          | 推理、僅文字、202k 上下文。           |
| `zai/glm-5-turbo`    | 推理、僅文字、202k 上下文。           |
| `zai/glm-5v-turbo`   | 推理、文字與圖片、202k 上下文。       |
| `zai/glm-4.7`        | 推理、僅文字、204k 上下文。           |
| `zai/glm-4.7-flash`  | 推理、僅文字、200k 上下文。           |
| `zai/glm-4.7-flashx` | 推理、僅文字。                        |
| `zai/glm-4.6`        | 推理、僅文字。                        |
| `zai/glm-4.6v`       | 推理、文字與圖片。預設圖片模型。      |
| `zai/glm-4.5`        | 推理、僅文字。                        |
| `zai/glm-4.5-air`    | 推理、僅文字。                        |
| `zai/glm-4.5-flash`  | 推理、僅文字。                        |
| `zai/glm-4.5v`       | 推理、文字與圖片。                    |

<Note>GLM 版本與可用性可能會變更。執行 `openclaw models list --provider zai` 以查看您安裝版本已知的目錄列，並查看 Z.AI 的文件以了解新增或已棄用的模型。</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="端點自動檢測">
    當您使用 `zai-api-key` auth 選項時，OpenClaw 會檢查金鑰形狀以判斷正確的 Z.AI 基礎 URL。明確的區域選項（`zai-coding-global`、`zai-coding-cn`、`zai-global`、`zai-cn`）會覆寫自動檢測並直接鎖定端點。
  </Accordion>

  <Accordion title="提供者詳細資訊">
    GLM 模型由 `zai` runtime provider 提供。如需完整的提供者設定、區域端點及其他功能，請參閱 [Z.AI provider page](/zh-Hant/providers/zai)。
  </Accordion>
</AccordionGroup>

## 相關

<CardGroup cols={2}>
  <Card title="Z.AI provider" href="/zh-Hant/providers/zai" icon="server">
    完整的 Z.AI provider 設定與區域端點。
  </Card>
  <Card title="Model providers" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照以及容錯移轉行為。
  </Card>
  <Card title="Thinking modes" href="/zh-Hant/tools/thinking" icon="brain">
    具備推理能力的 GLM 系列的 `/think` 層級。
  </Card>
  <Card title="Models FAQ" href="/zh-Hant/help/faq-models" icon="circle-question">
    Auth profiles、切換模型以及解決「no profile」錯誤。
  </Card>
</CardGroup>
