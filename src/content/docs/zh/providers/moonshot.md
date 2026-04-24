---
summary: "配置 Moonshot K2 与 Kimi Coding（不同的提供商 + 密钥）"
read_when:
  - You want Moonshot K2 (Moonshot Open Platform) vs Kimi Coding setup
  - You need to understand separate endpoints, keys, and model refs
  - You want copy/paste config for either provider
title: "Moonshot AI"
---

# Moonshot AI (Kimi)

Moonshot 提供具有 OpenAI 兼容端点的 Kimi API。配置提供商并将默认模型设置为 `moonshot/kimi-k2.6`，或将 Kimi Coding 与 `kimi/kimi-code` 配合使用。

<Warning>Moonshot 和 Kimi Coding 是**不同的提供商**。密钥不可互换，端点不同，模型引用也不同（`moonshot/...` vs `kimi/...`）。</Warning>

## 内置模型目录

[//]: # "moonshot-kimi-k2-ids:start"

| 模型引用                          | 名称                   | 推理 | 输入       | 上下文  | 最大输出 |
| --------------------------------- | ---------------------- | ---- | ---------- | ------- | -------- |
| `moonshot/kimi-k2.6`              | Kimi K2.6              | 否   | 文本、图像 | 262,144 | 262,144  |
| `moonshot/kimi-k2.5`              | Kimi K2.5              | 否   | 文本、图像 | 262,144 | 262,144  |
| `moonshot/kimi-k2-thinking`       | Kimi K2 Thinking       | 是   | 文本       | 262,144 | 262,144  |
| `moonshot/kimi-k2-thinking-turbo` | Kimi K2 Thinking Turbo | 是   | 文本       | 262,144 | 262,144  |
| `moonshot/kimi-k2-turbo`          | Kimi K2 Turbo          | 否   | 文本       | 256,000 | 16,384   |

[//]: # "moonshot-kimi-k2-ids:end"

当前 Moonshot 托管的 K2 模型的捆绑成本估算使用 Moonshot
发布的按量付费费率：Kimi K2.6 缓存命中为 $0.16/MTok，
输入为 $0.95/MTok，输出为 $4.00/MTok；Kimi K2.5 缓存命中为 $0.10/MTok，
输入为 $0.60/MTok，输出为 $3.00/MTok。除非您在配置中覆盖它们，否则其他旧版目录条目保留
零成本占位符。

## 入门指南

选择您的提供商并按照设置步骤操作。

<Tabs>
  <Tab title="Moonshot API">
    **最适用于：** 通过 Moonshot 开放平台使用 Kimi K2 模型。

    <Steps>
      <Step title="选择您的端点区域">
        | 认证选择             | 端点                             | 区域          |
        | ---------------------- | ------------------------------ | ------------- |
        | `moonshot-api-key`     | `https://api.moonshot.ai/v1`   | 国际           |
        | `moonshot-api-key-cn`  | `https://api.moonshot.cn/v1`   | 中国           |
      </Step>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice moonshot-api-key
        ```

        或者对于中国端点：

        ```bash
        openclaw onboard --auth-choice moonshot-api-key-cn
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "moonshot/kimi-k2.6" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型可用性">
        ```bash
        openclaw models list --provider moonshot
        ```
      </Step>
      <Step title="运行实时冒烟测试">
        当您想要在不影响正常会话的情况下验证模型访问权限和成本跟踪时，请使用独立的状态目录：

        ```bash
        OPENCLAW_CONFIG_PATH=/tmp/openclaw-kimi/openclaw.json \
        OPENCLAW_STATE_DIR=/tmp/openclaw-kimi \
        openclaw agent --local \
          --session-id live-kimi-cost \
          --message 'Reply exactly: KIMI_LIVE_OK' \
          --thinking off \
          --json
        ```

        JSON 响应应报告 `provider: "moonshot"` 和
        `model: "kimi-k2.6"`。当 Moonshot 返回使用情况元数据时，助手会话条目会在 `usage.cost` 下存储规范化令牌使用情况和估算成本。
      </Step>
    </Steps>

    ### 配置示例

    ```json5
    {
      env: { MOONSHOT_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "moonshot/kimi-k2.6" },
          models: {
            // moonshot-kimi-k2-aliases:start
            "moonshot/kimi-k2.6": { alias: "Kimi K2.6" },
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
                id: "kimi-k2.6",
                name: "Kimi K2.6",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0.95, output: 4, cacheRead: 0.16, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2.5",
                name: "Kimi K2.5",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0.6, output: 3, cacheRead: 0.1, cacheWrite: 0 },
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
    **最适合：** 通过 Kimi Coding 端点进行代码为主的任务。

    <Note>
    Kimi Coding 使用不同的 API 密钥和提供商前缀 (`kimi/...`)，这与 Moonshot (`moonshot/...`) 不同。旧的模型引用 `kimi/k2p5` 作为兼容 ID 仍被接受。
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

OpenClaw 还提供了作为 `web_search` 提供商的 **Kimi**，由 Moonshot 网络搜索支持。

<Steps>
  <Step title="运行交互式网络搜索设置">
    ```bash
    openclaw configure --section web
    ```

    在网络搜索部分选择 **Kimi** 以存储
    `plugins.entries.moonshot.config.webSearch.*`。

  </Step>
  <Step title="配置网络搜索区域和模型">
    交互式设置会提示输入：

    | 设置             | 选项                                                              |
    | ------------------- | -------------------------------------------------------------------- |
    | API 区域          | `https://api.moonshot.ai/v1` (国际) 或 `https://api.moonshot.cn/v1` (中国) |
    | 网络搜索模型    | 默认为 `kimi-k2.6`                                             |

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
            model: "kimi-k2.6",
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
    Moonshot Kimi 支持二进制原生思维模式：

    - `thinking: { type: "enabled" }`
    - `thinking: { type: "disabled" }`

    通过 `agents.defaults.models.<provider/model>.params` 为每个模型进行配置：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "moonshot/kimi-k2.6": {
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

    | `/think` 级别       | Moonshot 行为          |
    | -------------------- | -------------------------- |
    | `/think off`         | `thinking.type=disabled`   |
    | 任何非关闭级别    | `thinking.type=enabled`    |

    <Warning>
    当启用 Moonshot 思维模式时，`tool_choice` 必须为 `auto` 或 `none`。为了兼容性，OpenClaw 会将不兼容的 `tool_choice` 值标准化为 `auto`。
    </Warning>

    Kimi K2.6 还接受一个可选的 `thinking.keep` 字段，用于控制
    `reasoning_content` 的多轮保留。将其设置为 `"all"` 以在多轮对话中保留完整
    推理过程；省略它（或将其保留为 `null`）以使用服务器
    默认策略。OpenClaw 仅会为
    `moonshot/kimi-k2.6` 转发 `thinking.keep`，并会将其从其他模型中移除。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "moonshot/kimi-k2.6": {
              params: {
                thinking: { type: "enabled", keep: "all" },
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="工具调用 ID 清理">
    Moonshot Kimi 在 OpenAI 兼容传输上提供类似 `functions.<name>:<index>` 形状的原生 tool_call id。OpenClaw 不再对 Moonshot 的这些 id 进行严格清理，因此通过 Kimi K2.6 的多轮 Agent 流程可以在服务层将混淆后的 id 与原始工具定义匹配时，在 2-3 轮工具调用之后继续工作。

    如果自定义 OpenAI 兼容提供商需要以前的行为，请在提供商条目上设置 `sanitizeToolCallIds: true`。该标志位于共享的 `openai-compatible` 重放系列中；Moonshot 默认设置为选择退出。

    ```json5
    {
      models: {
        providers: {
          "my-kimi-proxy": {
            api: "openai-completions",
            sanitizeToolCallIds: true,
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="流式使用兼容性">
    原生 Moonshot 端点（`https://api.moonshot.ai/v1` 和
    `https://api.moonshot.cn/v1`）在共享的 `openai-completions` 传输上宣传流式使用兼容性。OpenClaw 密钥关闭了端点功能，因此针对相同原生 Moonshot 主机的兼容自定义提供商 ID 会继承相同的流式使用行为。

    随附 K2.6 定价，包含输入、输出和缓存读取令牌的流式使用也会转换为本地估算的美元成本，用于 `/status`、`/usage full`、`/usage cost` 和基于记录的会话计费。

  </Accordion>

  <Accordion title="Endpoint and 模型 ref reference">
    | Provider   | Model ref prefix | Endpoint                      | Auth 环境变量        |
    | ---------- | ---------------- | ----------------------------- | ------------------- |
    | Moonshot   | `moonshot/`      | `https://api.moonshot.ai/v1`  | `MOONSHOT_API_KEY`  |
    | Moonshot CN| `moonshot/`      | `https://api.moonshot.cn/v1`  | `MOONSHOT_API_KEY`  |
    | Kimi Coding| `kimi/`          | Kimi Coding endpoint          | `KIMI_API_KEY`      |
    | Web search | N/A              | Same as Moonshot API region   | `KIMI_API_KEY` or `MOONSHOT_API_KEY` |

    - Kimi web search uses `KIMI_API_KEY` or `MOONSHOT_API_KEY`, and defaults to `https://api.moonshot.ai/v1` with 模型 `kimi-k2.6`.
    - Override pricing and context metadata in `models.providers` if needed.
    - If Moonshot publishes different context limits for a 模型, adjust `contextWindow` accordingly.

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="网络搜索" href="/zh/tools/web" icon="magnifying-glass">
    配置网络搜索提供商，包括 Kimi。
  </Card>
  <Card title="配置参考" href="/zh/gateway/configuration-reference" icon="gear">
    提供商、模型和插件的完整配置架构。
  </Card>
  <Card title="Moonshot 开放平台" href="https://platform.moonshot.ai" icon="globe">
    Moonshot API 密钥管理和文档。
  </Card>
</CardGroup>
