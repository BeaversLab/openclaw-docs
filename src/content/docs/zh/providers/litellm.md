---
title: "LiteLLM"
summary: "通过 LiteLLM 代理运行 OpenClaw，以实现统一的模型访问和成本跟踪"
read_when:
  - You want to route OpenClaw through a LiteLLM proxy
  - You need cost tracking, logging, or model routing through LiteLLM
---

# LiteLLM

[LiteLLM](https://litellm.ai) 是一个开源的 LLM 网关，为 100 多个模型提供商提供统一的 API。通过 LiteLLM 路由 OpenClaw，即可获得集中的成本跟踪、日志记录，以及在不更改 OpenClaw 配置的情况下切换后端的灵活性。

<Tip>
**为什么在 OpenClaw 中使用 LiteLLM？**

- **成本跟踪** — 精确查看 OpenClaw 在所有模型上的支出
- **模型路由** — 在 Claude、GPT-4、Gemini、Bedrock 之间切换而无需更改配置
- **虚拟密钥** — 为 OpenClaw 创建具有支出限制的密钥
- **日志记录** — 完整的请求/响应日志以便调试
- **故障转移** — 如果主提供商宕机，自动故障转移

</Tip>

## 快速开始

<Tabs>
  <Tab title="新手引导（推荐）">
    **最适用于：** 搭建可用 LiteLLM 环境的最快路径。

    <Steps>
      <Step title="运行新手引导">
        ```bash
        openclaw onboard --auth-choice litellm-api-key
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="手动设置">
    **最适用于：** 完全控制安装和配置。

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

        完成。OpenClaw 现在通过 LiteLLM 进行路由。
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

## 高级主题

<AccordionGroup>
  <Accordion title="虚拟密钥">
    为 OpenClaw 创建具有消费限制的专用密钥：

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

  <Accordion title="模型路由">
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

    OpenClaw 继续请求 `claude-opus-4-6` — LiteLLM 处理路由。

  </Accordion>

  <Accordion title="查看使用情况">
    检查 LiteLLM 的仪表板或 API：

    ```bash
    # Key info
    curl "http://localhost:4000/key/info" \
      -H "Authorization: Bearer sk-litellm-key"

    # Spend logs
    curl "http://localhost:4000/spend/logs" \
      -H "Authorization: Bearer $LITELLM_MASTER_KEY"
    ```

  </Accordion>

  <Accordion title="代理行为说明">
    - LiteLLM 默认运行在 `http://localhost:4000` 上
    - OpenClaw 通过 LiteLLM 的代理风格 OpenAI 兼容 `/v1`
      端点进行连接
    - 原生的仅限 OpenAI 的请求整形不适用于通过 LiteLLM：
      没有 `service_tier`，没有 Responses `store`，没有提示缓存提示，也没有
      OpenAI 推理兼容负载整形
    - 隐藏的 OpenClaw 归因标头 (`originator`, `version`, `User-Agent`)
      不会在自定义 LiteLLM 基础 URL 上注入
  </Accordion>
</AccordionGroup>

<Note>有关常规提供商配置和故障转移行为，请参阅 [模型提供商](/zh/concepts/model-providers)。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="LiteLLM 文档" href="https://docs.litellm.ai" icon="book">
    官方 LiteLLM 文档和 API 参考。
  </Card>
  <Card title="模型提供商" href="/zh/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为的概述。
  </Card>
  <Card title="配置" href="/zh/gateway/configuration" icon="gear">
    完整的配置参考。
  </Card>
  <Card title="模型选择" href="/zh/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
</CardGroup>
