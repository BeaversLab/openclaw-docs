---
summary: "配置 Moonshot K2 与 Kimi Coding（独立的提供商 + 密钥）"
read_when:
  - You want Moonshot K2 (Moonshot Open Platform) vs Kimi Coding setup
  - You need to understand separate endpoints, keys, and model refs
  - You want copy/paste config for either provider
title: "Moonshot AI"
---

# Moonshot AI (Kimi)

Moonshot 提供了具有 OpenAI 兼容端点的 Kimi API。配置提供商并将默认模型设置为 `moonshot/kimi-k2.5`，或者使用带有 `kimi/kimi-code` 的 Kimi Coding。

<Warning>Moonshot 和 Kimi Coding 是**独立的提供商**。密钥不可互换，端点不同，且模型引用也不同（`moonshot/...` 对比 `kimi/...`）。</Warning>

## 内置模型目录

[//]: # "moonshot-kimi-k2-ids:start"

| 模型引用                          | 名称                   | 推理 | 输入       | 上下文  | 最大输出 |
| --------------------------------- | ---------------------- | ---- | ---------- | ------- | -------- |
| `moonshot/kimi-k2.5`              | Kimi K2.5              | 否   | 文本、图像 | 262,144 | 262,144  |
| `moonshot/kimi-k2-thinking`       | Kimi K2 Thinking       | 是   | 文本       | 262,144 | 262,144  |
| `moonshot/kimi-k2-thinking-turbo` | Kimi K2 Thinking Turbo | 是   | 文本       | 262,144 | 262,144  |
| `moonshot/kimi-k2-turbo`          | Kimi K2 Turbo          | 否   | 文本       | 256,000 | 16,384   |

[//]: # "moonshot-kimi-k2-ids:end"

## 入门指南

选择您的提供商并按照设置步骤操作。

<Tabs>
  <Tab title="Moonshot API">
    **适用于：** 通过 Moonshot 开放平台访问的 Kimi K2 模型。

    <Steps>
      <Step title="选择您的端点区域">
        | 认证方式            | 端点                       | 区域        |
        | ---------------------- | ------------------------------ | ------------- |
        | `moonshot-api-key`     | `https://api.moonshot.ai/v1`   | 国际 |
        | `moonshot-api-key-cn`  | `https://api.moonshot.cn/v1`   | 中国         |
      </Step>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice moonshot-api-key
        ```

        或者针对中国端点：

        ```bash
        openclaw onboard --auth-choice moonshot-api-key-cn
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "moonshot/kimi-k2.5" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型可用">
        ```bash
        openclaw models list --provider moonshot
        ```
      </Step>
    </Steps>

    ### 配置示例

    ```json5
    {
      env: { MOONSHOT_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "moonshot/kimi-k2.5" },
          models: {
            // moonshot-kimi-k2-aliases:start
            "moonshot/kimi-k2.5": { alias: "Kimi K2.5" },
            "moonshot/kimi-k2-thinking": { alias: "Kimi K2 Thinking" },
            "moonshot/kimi-k2-thinking-turbo": { alias: "Kimi K2 Thinking Turbo" },
            "moonshot/kimi-k2-turbo": { alias: "Kimi K2 Turbo" },
            // moonshot-kimi-k2-aliases:end
          },
        },
      },
      models: {
        mode: "merge",
        providers: {
          moonshot: {
            baseUrl: "https://api.moonshot.ai/v1",
            apiKey: "${MOONSHOT_API_KEY}",
            api: "openai-completions",
            models: [
              // moonshot-kimi-k2-models:start
              {
                id: "kimi-k2.5",
                name: "Kimi K2.5",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2-thinking",
                name: "Kimi K2 Thinking",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2-thinking-turbo",
                name: "Kimi K2 Thinking Turbo",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2-turbo",
                name: "Kimi K2 Turbo",
                reasoning: false,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 256000,
                maxTokens: 16384,
              },
              // moonshot-kimi-k2-models:end
            ],
          },
        },
      },
    }
    ```

  </Tab>

  <Tab title="Kimi Coding">
    **最适用于：** 通过 Kimi Coding 端点处理代码相关任务。

    <Note>
    Kimi Coding 使用与 Moonshot (`moonshot/...`) 不同的 API 密钥和提供商前缀 (`kimi/...`)。旧版模型引用 `kimi/k2p5` 作为兼容 ID 仍然可被接受。
    </Note>

    <Steps>
      <Step title="Run 新手引导">
        ```bash
        openclaw onboard --auth-choice kimi-code-api-key
        ```
      </Step>
      <Step title="Set a default 模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "kimi/kimi-code" },
            },
          },
        }
        ```
      </Step>
      <Step title="Verify the 模型 is available">
        ```bash
        openclaw models list --provider kimi
        ```
      </Step>
    </Steps>

    ### 配置示例

    ```json5
    {
      env: { KIMI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "kimi/kimi-code" },
          models: {
            "kimi/kimi-code": { alias: "Kimi" },
          },
        },
      },
    }
    ```

  </Tab>
</Tabs>

## Kimi 网页搜索

OpenClaw 还提供 **Kimi** 作为 `web_search` 提供商，由 Moonshot 网页搜索支持。

<Steps>
  <Step title="Run interactive web search setup">
    ```bash
    openclaw configure --section web
    ```

    在网页搜索部分选择 **Kimi** 以存储
    `plugins.entries.moonshot.config.webSearch.*`。

  </Step>
  <Step title="Configure the web search region and 模型">
    交互式设置会提示输入：

    | 设置             | 选项                                                              |
    | ------------------- | -------------------------------------------------------------------- |
    | API 区域          | `https://api.moonshot.ai/v1` (国际) 或 `https://api.moonshot.cn/v1` (中国) |
    | 网页搜索模型    | 默认为 `kimi-k2.5`                                             |

  </Step>
</Steps>

配置位于 `plugins.entries.moonshot.config.webSearch` 下：

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // or use KIMI_API_KEY / MOONSHOT_API_KEY
            baseUrl: "https://api.moonshot.ai/v1",
            model: "kimi-k2.5",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "kimi",
      },
    },
  },
}
```

## 高级

<AccordionGroup>
  <Accordion title="Native thinking mode">
    Moonshot Kimi 支持二元原生思考模式：

    - `thinking: { type: "enabled" }`
    - `thinking: { type: "disabled" }`

    通过 `agents.defaults.models.<provider/model>.params` 针对每个模型进行配置：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "moonshot/kimi-k2.5": {
              params: {
                thinking: { type: "disabled" },
              },
            },
          },
        },
      },
    }
    ```

    OpenClaw 还映射了 Moonshot 的运行时 `/think` 级别：

    | `/think` level       | Moonshot behavior          |
    | -------------------- | -------------------------- |
    | `/think off`         | `thinking.type=disabled`   |
    | Any non-off level    | `thinking.type=enabled`    |

    <Warning>
    当启用 Moonshot 思考模式时，`tool_choice` 必须为 `auto` 或 `none`。OpenClaw 会将不兼容的 `tool_choice` 值标准化为 `auto` 以确保兼容性。
    </Warning>

  </Accordion>

<Accordion title="Streaming usage compatibility">原生 Moonshot 端点（`https://api.moonshot.ai/v1` 和 `https://api.moonshot.cn/v1`）宣传了共享 `openai-completions` 传输上的流式使用兼容性。OpenClaw 识别端点能力，因此针对同一原生 Moonshot 主机的兼容自定义提供商 ID 会继承相同的流式使用行为。</Accordion>

  <Accordion title="Endpoint and 模型 ref reference">
    | 提供商   | 模型引用前缀 | 端点                      | 认证环境变量        |
    | ---------- | ---------------- | ----------------------------- | ------------------- |
    | Moonshot   | `moonshot/`      | `https://api.moonshot.ai/v1`  | `MOONSHOT_API_KEY`  |
    | Moonshot CN| `moonshot/`      | `https://api.moonshot.cn/v1`  | `MOONSHOT_API_KEY`  |
    | Kimi Coding| `kimi/`          | Kimi Coding endpoint          | `KIMI_API_KEY`      |
    | Web search | N/A              | Same as Moonshot API region   | `KIMI_API_KEY` or `MOONSHOT_API_KEY` |

    - Kimi web search uses `KIMI_API_KEY` or `MOONSHOT_API_KEY`, and defaults to `https://api.moonshot.ai/v1` with 模型 `kimi-k2.5`.
    - Override pricing and context metadata in `models.providers` if needed.
    - If Moonshot publishes different context limits for a 模型, adjust `contextWindow` accordingly.

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Model selection" href="/en/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="Web search" href="/en/tools/web-search" icon="magnifying-glass">
    配置网络搜索提供商，包括 Kimi。
  </Card>
  <Card title="Configuration reference" href="/en/gateway/configuration-reference" icon="gear">
    提供商、模型和插件的完整配置架构。
  </Card>
  <Card title="Moonshot Open Platform" href="https://platform.moonshot.ai" icon="globe">
    Moonshot API 密钥管理和文档。
  </Card>
</CardGroup>
