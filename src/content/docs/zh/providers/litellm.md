---
summary: "通过 LiteLLM 代理运行 OpenClaw，以统一模型访问并跟踪成本"
title: "LiteLLM"
read_when:
  - You want to route OpenClaw through a LiteLLM proxy
  - You need cost tracking, logging, or model routing through LiteLLM
---

[LiteLLM](https://litellm.ai) 是一个开源 LLM 网关，为 100 多个模型提供商提供统一的 API。通过 LiteLLM 路由 OpenClaw，以获得集中的成本跟踪、日志记录，以及无需更改 OpenClaw 配置即可切换后端的灵活性。

<Tip>
**为什么将 LiteLLM 与 OpenClaw 结合使用？**

- **成本跟踪** — 精确查看 OpenClaw 在所有模型上的支出
- **模型路由** — 在 Claude、GPT-4、Gemini、Bedrock 之间切换，无需更改配置
- **虚拟密钥** — 为 OpenClaw 创建具有支出限制的密钥
- **日志记录** — 完整的请求/响应日志，便于调试
- **故障转移** — 如果主提供商宕机，自动故障转移

</Tip>

## 快速开始

<Tabs>
  <Tab title="新手引导（推荐）">
    **最适用于：** 快速搭建可用的 LiteLLM。

    <Steps>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice litellm-api-key
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="手动设置">
    **最适用于：** 对安装和配置进行完全控制。

    <Steps>
      <Step title="启动 LiteLLM 代理">
        ```bash
        pip install 'litellm[proxy]'
        litellm --model claude-opus-4-6
        ```
      </Step>
      <Step title="将 OpenClaw 指向 LiteLLM">
        ```bash
        export LITELLM_API_KEY="your-litellm-key"

        openclaw
        ```

        就是这样。OpenClaw 现在通过 LiteLLM 进行路由。
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 配置

### 环境变量

```bash
export LITELLM_API_KEY="sk-litellm-key"
```

### 配置文件

```json5
{
  models: {
    providers: {
      litellm: {
        baseUrl: "http://localhost:4000",
        apiKey: "${LITELLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "claude-opus-4-6",
            name: "Claude Opus 4.6",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 200000,
            maxTokens: 64000,
          },
          {
            id: "gpt-4o",
            name: "GPT-4o",
            reasoning: false,
            input: ["text", "image"],
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "litellm/claude-opus-4-6" },
    },
  },
}
```

## 高级配置

### 图像生成

LiteLLM 还可以通过 OpenAI 兼容的 `/images/generations` 和 `/images/edits` 路由支持 `image_generate` 工具。在 `agents.defaults.imageGenerationModel` 下配置 LiteLLM 图像模型：

```json5
{
  models: {
    providers: {
      litellm: {
        baseUrl: "http://localhost:4000",
        apiKey: "${LITELLM_API_KEY}",
      },
    },
  },
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "litellm/gpt-image-2",
        timeoutMs: 180_000,
      },
    },
  },
}
```

诸如 `http://localhost:4000` 之类的 LiteLLM 回环 URL 无需全局私有网络覆盖即可工作。对于 LAN 托管代理，请设置 `models.providers.litellm.request.allowPrivateNetwork: true`，因为 API 密钥将发送到配置的代理主机。

<AccordionGroup>
  <Accordion title="Virtual keys">
    为 OpenClaw 创建一个具有支出限制的专用密钥：

    ```bash
    curl -X POST "http://localhost:4000/key/generate" \
      -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "key_alias": "openclaw",
        "max_budget": 50.00,
        "budget_duration": "monthly"
      }'
    ```

    将生成的密钥用作 `LITELLM_API_KEY`。

  </Accordion>

  <Accordion title="Model routing">
    LiteLLM 可以将模型请求路由到不同的后端。在您的 LiteLLM `config.yaml` 中进行配置：

    ```yaml
    model_list:
      - model_name: claude-opus-4-6
        litellm_params:
          model: claude-opus-4-6
          api_key: os.environ/ANTHROPIC_API_KEY

      - model_name: gpt-4o
        litellm_params:
          model: gpt-4o
          api_key: os.environ/OPENAI_API_KEY
    ```

    OpenClaw 继续请求 `claude-opus-4-6` —— LiteLLM 会处理路由。

  </Accordion>

  <Accordion title="Viewing usage">
    查看 LiteLLM 的仪表板或 API：

    ```bash
    # Key info
    curl "http://localhost:4000/key/info" \
      -H "Authorization: Bearer sk-litellm-key"

    # Spend logs
    curl "http://localhost:4000/spend/logs" \
      -H "Authorization: Bearer $LITELLM_MASTER_KEY"
    ```

  </Accordion>

  <Accordion title="Proxy behavior notes">
    - LiteLLM 默认运行在 `http://localhost:4000` 上
    - OpenClaw 通过 LiteLLM 的代理式 OpenAI 兼容 `/v1`
      端点进行连接
    - 原生仅限 OpenAI 的请求整形不适用于通过 LiteLLM 的连接：
      没有 `service_tier`，没有 Responses `store`，没有提示缓存提示（prompt-cache hints），也没有
      OpenAI 推理兼容的负载整形
    - 隐藏的 OpenClaw 归属标头（`originator`、`version`、`User-Agent`）
      不会注入到自定义的 LiteLLM 基础 URL 中
  </Accordion>
</AccordionGroup>

<Note>有关常规提供商配置和故障转移行为，请参阅 [Model Providers](/zh/concepts/model-providers)。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="LiteLLM Docs" href="https://docs.litellm.ai" icon="book">
    官方 LiteLLM 文档和 API 参考。
  </Card>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为的概述。
  </Card>
  <Card title="配置" href="/zh/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
  <Card title="模型选择" href="/zh/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
</CardGroup>
