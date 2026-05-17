---
summary: "OpenClawOpenAI通过 inferrs 运行 OpenClaw（OpenAI 兼容的本地服务器）"
read_when:
  - You want to run OpenClaw against a local inferrs server
  - You are serving Gemma or another model through inferrs
  - You need the exact OpenClaw compat flags for inferrs
title: "Inferrs"
---

[inferrs](https://github.com/ericcurtin/inferrs) 可以在 OpenAI 兼容的 `/v1` API 后端提供本地模型服务。OpenClaw 通过通用 `openai-completions` 路径与 `inferrs` 配合使用。

| 属性           | 值                                                               |
| -------------- | ---------------------------------------------------------------- |
| 提供商 ID      | `inferrs` （自定义；在 `models.providers.inferrs` 下配置）       |
| 插件           | 无 — `inferrs`OpenClaw 不是内置的 OpenClaw 提供商插件            |
| 认证环境变量   | 可选。如果您的 inferrs 服务器没有认证，可以使用任意值            |
| API            | OpenAI 兼容 (OpenAI`openai-completions`)                         |
| 建议的基础 URL | `http://127.0.0.1:8080/v1` (或您的 inferrs 服务器所在的任何位置) |

<Note>`inferrs`OpenAIOpenClaw 目前最好被视为自定义的自托管 OpenAI 兼容后端，而不是专门的 OpenClaw 提供商插件。你可以通过 `models.providers.inferrs` 对其进行配置，而不是使用新手引导选择标志。如果你需要一个具有自动发现功能的真正的捆绑插件，请参阅 [SGLang](/zh/providers/sglang) 或 [vLLM](/zh/providers/vllm)。</Note>

## 入门指南

<Steps>
  <Step title="启动带有模型的 inferrs">```bash inferrs serve google/gemma-4-E2B-it \ --host 127.0.0.1 \ --port 8080 \ --device metal ```</Step>
  <Step title="验证服务器是否可达">```bash curl http://127.0.0.1:8080/health curl http://127.0.0.1:8080/v1/models ```</Step>
  <Step title="OpenClaw添加 OpenClaw 提供商条目">添加一个显式的提供商条目，并将您的默认模型指向它。请参阅下面的完整配置示例。</Step>
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

## 按需启动

仅当选中了 `inferrs/...` 模型时，Inferrs 也可以由 OpenClaw 启动。将 `localService` 添加到同一个提供商条目中：

```json5
{
  models: {
    providers: {
      inferrs: {
        baseUrl: "http://127.0.0.1:8080/v1",
        apiKey: "inferrs-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "/opt/homebrew/bin/inferrs",
          args: ["serve", "google/gemma-4-E2B-it", "--host", "127.0.0.1", "--port", "8080", "--device", "metal"],
          healthUrl: "http://127.0.0.1:8080/v1/models",
          readyTimeoutMs: 180000,
          idleStopMs: 0,
        },
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

`command` 必须是绝对路径。在 Gateway(网关) 主机上使用 `which inferrs` 并将该
路径放入配置中。有关完整的字段参考，请参阅
[Local 模型 services](/zh/gateway/local-model-services)。

## 高级配置

<AccordionGroup>
  <Accordion title="Why requiresStringContent matters">
    某些 `inferrs` 聊天补全路由仅接受字符串
    `messages[].content`，不接受结构化的内容部分数组。

    <Warning>
    如果 OpenClaw 运行失败并出现如下错误：

    ```text
    messages[1].content: invalid type: sequence, expected a string
    ```

    请在您的模型条目中设置 `compat.requiresStringContent: true`。
    </Warning>

    ```json5
    compat: {
      requiresStringContent: true
    }
    ```

    OpenClaw 将在发送请求之前把纯文本内容部分扁平化为普通字符串。

  </Accordion>

  <Accordion title="Gemma and 工具-schema caveat">
    某些当前的 `inferrs` + Gemma 组合接受小型直接的
    `/v1/chat/completions` 请求，但在完整的 OpenClaw 代理运行时轮次中仍然失败。

    如果发生这种情况，请先尝试此操作：

    ```json5
    compat: {
      requiresStringContent: true,
      supportsTools: false
    }
    ```

    这将为模型禁用 OpenClaw 的工具架构表面，并可以减少对严格的本地后端的提示压力。

    如果微小的直接请求仍然有效，但正常的 OpenClaw 代理轮次继续
    在 `inferrs` 内部崩溃，那么剩余的问题通常来自上游模型/服务器
    行为，而不是 OpenClaw 的传输层。

  </Accordion>

  <Accordion title="Manual smoke test">
    配置完成后，测试这两个层：

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

    如果第一条命令有效但第二条失败，请检查下面的故障排除部分。

  </Accordion>

  <Accordion title="Proxy-style behavior">
    `inferrs`OpenAI 被视为一个代理风格的 OpenAI 兼容 `/v1`OpenAIOpenAI 后端，而不是
    原生的 OpenAI 端点。

    - 原生 OpenAI 专用的请求整形在此处不适用
    - 没有 `service_tier`，没有响应 `store`OpenAIOpenClaw，没有提示缓存提示，也没有
      OpenAI 推理兼容负载整形
    - 隐藏的 OpenClaw 归因标头（`originator`，`version`，`User-Agent`）
      不会在自定义 `inferrs` 基础 URL 上注入

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="curl /v1/models fails">
    `inferrs` 未运行，无法访问，或未绑定到预期的
    主机/端口。请确保服务器已启动并在您配置的地址上监听。
  </Accordion>

<Accordion title="messages[].content expected a string">在模型条目中设置 `compat.requiresStringContent: true`。有关详细信息，请参阅上面的 `requiresStringContent` 部分。</Accordion>

<Accordion title="Direct /v1/chat/completions calls pass but openclaw infer 模型 run fails">尝试设置 `compat.supportsTools: false` 以禁用工具架构表面。 请参阅上面的 Gemma 工具架构说明。</Accordion>

  <Accordion title="inferrs still crashes on larger agent turns"OpenClaw>
    如果 OpenClaw 不再出现架构错误，但 `inferrs` 在较大的
    Agent 轮次中仍然崩溃，请将其视为上游 `inferrs` 或模型的限制。请减少
    提示压力或切换到不同的本地后端或模型。
  </Accordion>
</AccordionGroup>

<Tip>如需一般帮助，请参阅 [故障排除](/zh/help/troubleshooting) 和 [常见问题](/zh/help/faq)。</Tip>

## 相关

<CardGroup cols={2}>
  <Card title="本地模型" href="/zh/gateway/local-models" icon="server">
    针对本地模型服务器运行 OpenClaw。
  </Card>
  <Card title="本地模型服务" href="/zh/gateway/local-model-services" icon="play">
    按需为配置的提供商启动本地模型服务器。
  </Card>
  <Card title="Gateway(网关) 故障排除" href="/zh/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" icon="wrench">
    调试通过探针检查但在代理运行中失败的本地 OpenAI 兼容后端。
  </Card>
  <Card title="模型选择" href="/zh/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为的概述。
  </Card>
</CardGroup>
