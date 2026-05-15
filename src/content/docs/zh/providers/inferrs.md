---
summary: "通过 inferrs 运行 OpenClaw（OpenAI 兼容的本地服务器）"
read_when:
  - You want to run OpenClaw against a local inferrs server
  - You are serving Gemma or another model through inferrs
  - You need the exact OpenClaw compat flags for inferrs
title: "Inferrs"
---

[inferrs](https://github.com/ericcurtin/inferrs) 可以在兼容 OpenAI 的 `/v1` API 后端提供本地模型。OpenClaw 通过通用 `openai-completions` 路径与 `inferrs` 配合使用。

| 属性           | 值                                                                |
| -------------- | ----------------------------------------------------------------- |
| 提供商 ID      | `inferrs`（自定义；在 `models.providers.inferrs` 下配置）         |
| 插件           | 无 —— `inferrs` 不是内置的 OpenClaw 提供商插件                    |
| 认证环境变量   | 可选。如果您的 inferrs 服务器没有认证，可以使用任意值             |
| API            | 兼容 OpenAI (`openai-completions`)                                |
| 建议的基础 URL | `http://127.0.0.1:8080/v1`（或您的 inferrs 服务器所在的任何位置） |

<Note>目前最好将 `inferrs` 视为自定义的自托管兼容 OpenAI 的后端，而不是专用的 OpenClaw 提供商插件。您通过 `models.providers.inferrs` 配置它，而不是通过新手引导选择标志。如果您需要具有自动发现功能的真正内置插件，请参阅 [SGLang](/zh/providers/sglang) 或 [vLLM](/zh/providers/vllm)。</Note>

## 入门指南

<Steps>
  <Step title="使用模型启动 inferrs">```bash inferrs serve google/gemma-4-E2B-it \ --host 127.0.0.1 \ --port 8080 \ --device metal ```</Step>
  <Step title="验证服务器是否可达">```bash curl http://127.0.0.1:8080/health curl http://127.0.0.1:8080/v1/models ```</Step>
  <Step title="添加 OpenClaw 提供商条目">添加一个显式的提供商条目，并将您的默认模型指向它。请参阅下面的完整配置示例。</Step>
</Steps>

## 完整配置示例

此示例在本地 `inferrs` 服务器上使用 Gemma 4。

```json5
{
  agents: {
    defaults: {
      model: { primary: "inferrs/google/gemma-4-E2B-it" },
      models: {
        "inferrs/google/gemma-4-E2B-it": {
          alias: "Gemma 4 (inferrs)",
        },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      inferrs: {
        baseUrl: "http://127.0.0.1:8080/v1",
        apiKey: "inferrs-local",
        api: "openai-completions",
        models: [
          {
            id: "google/gemma-4-E2B-it",
            name: "Gemma 4 E2B (inferrs)",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131072,
            maxTokens: 4096,
            compat: {
              requiresStringContent: true,
            },
          },
        ],
      },
    },
  },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="为什么 requiresStringContent 很重要">
    某些 `inferrs` Chat Completions 路由仅接受字符串
    `messages[].content`OpenClaw，而不接受结构化的 content-part 数组。

    <Warning>
    如果 OpenClaw 运行失败并出现类似以下错误：

    ```text
    messages[1].content: invalid type: sequence, expected a string
    ```

    请在您的模型条目中设置 `compat.requiresStringContent: true`。
    </Warning>

    ```json5
    compat: {
      requiresStringContent: true
    }
    ```OpenClaw

    OpenClaw 会在发送请求之前将纯文本内容部分扁平化为纯字符串。

  </Accordion>

  <Accordion title="Gemma 和 工具-schema 注意事项">
    某些当前的 `inferrs` + Gemma 组合接受小型的直接
    `/v1/chat/completions`OpenClaw 请求，但在完整的 OpenClaw agent-runtime
    轮次中仍然会失败。

    如果发生这种情况，请先尝试以下操作：

    ```json5
    compat: {
      requiresStringContent: true,
      supportsTools: false
    }
    ```OpenClawOpenClaw

    这将禁用 OpenClaw 针对该模型的工具 schema 表面，并可以减少对严格的本地后端的提示词压力。

    如果小型直接请求仍然有效，但正常的 OpenClaw agent 轮次继续在 `inferrs`OpenClaw 内部崩溃，则剩余的问题通常是上游模型/服务器的行为，而不是 OpenClaw 的传输层问题。

  </Accordion>

  <Accordion title="手动冒烟测试">
    配置完成后，测试这两层：

    ```bash
    curl http://127.0.0.1:8080/v1/chat/completions \
      -H 'content-type: application/json' \
      -d '{"model":"google/gemma-4-E2B-it","messages":[{"role":"user","content":"What is 2 + 2?"}],"stream":false}'
    ```

    ```bash
    openclaw infer model run \
      --model inferrs/google/gemma-4-E2B-it \
      --prompt "What is 2 + 2? Reply with one short sentence." \
      --json
    ```

    如果第一个命令有效但第二个失败，请检查下面的故障排除部分。

  </Accordion>

  <Accordion title="代理模式行为">
    `inferrs`OpenAI 被视为代理模式的 OpenAI 兼容 `/v1`OpenAIOpenAI 后端，而非
    原生 OpenAI 端点。

    - 原生 OpenAI 专用的请求塑造在此不适用
    - 没有 `service_tier`，没有 Responses `store`OpenAIOpenClaw，没有提示缓存提示，也没有
      OpenAI 推理兼容的负载塑造
    - 隐藏的 OpenClaw 归属标头（`originator`、`version`、`User-Agent`）
      不会注入到自定义的 `inferrs` 基础 URL 中

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="curl /v1/models 失败">
    `inferrs` 未运行、无法访问或未绑定到预期的
    主机/端口。请确保服务器已启动，并正在监听您
    配置的地址。
  </Accordion>

<Accordion title="messages[].content 预期为字符串">在模型条目中设置 `compat.requiresStringContent: true`。详情请参阅上面的 `requiresStringContent` 部分。</Accordion>

<Accordion title="直接的 /v1/chat/completions 调用通过，但 openclaw infer 模型 run 失败">尝试设置 `compat.supportsTools: false` 以禁用工具架构表面。 请参阅上面的 Gemma 工具架构注意事项。</Accordion>

  <Accordion title="inferrs 在较大的代理轮次中仍然崩溃"OpenClaw>
    如果 OpenClaw 不再出现架构错误，但 `inferrs` 在较大的
    代理轮次中仍然崩溃，请将其视为上游 `inferrs` 或模型的限制。请减少
    提示压力或切换到不同的本地后端或模型。
  </Accordion>
</AccordionGroup>

<Tip>如需一般帮助，请参阅[故障排除](/zh/help/troubleshooting)和[常见问题](/zh/help/faq)。</Tip>

## 相关内容

<CardGroup cols={2}>
  <Card title="Local models" href="/zh/gateway/local-models" icon="server" OpenClaw>
    针对本地模型服务器运行 OpenClaw。
  </Card>
  <Card title="Gateway(网关)Gateway 故障排除" href="/zh/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" icon="wrench" OpenAI>
    调试通过探测但未通过代理运行的本地 OpenAI 兼容后端。
  </Card>
  <Card title="Model selection" href="/zh/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为的概述。
  </Card>
</CardGroup>
