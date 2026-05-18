---
summary: "OpenClawOpenAI通过 ds4 运行 OpenClaw，这是一个本地 DeepSeek V4 Flash OpenAI 兼容服务器"
read_when:
  - You want to run OpenClaw against antirez/ds4
  - You want a local DeepSeek V4 Flash backend with tool calls
  - You need the OpenClaw config for ds4-server
title: "ds4"
---

[ds4](https://github.com/antirez/ds4) 通过本地 Metal 后端提供 DeepSeek V4 Flash，并具有兼容 OpenAI 的 `/v1` API。OpenClaw 通过通用 `openai-completions` 提供商 家族连接到 ds4。

ds4 不是一个捆绑的 OpenClaw 提供商插件。在 `models.providers.ds4` 下配置它，然后选择 `ds4/deepseek-v4-flash`。

- 提供商 ID：`ds4`
- 插件：无
- API：兼容 OpenAI 的聊天补全 (`openai-completions`)
- 建议的基础 URL：`http://127.0.0.1:18000/v1`
- 模型 ID：`deepseek-v4-flash`
- 工具调用：通过 OpenAI 风格的 `tools` 和 `tool_calls` 支持
- 推理：DeepSeek 风格的 `thinking` 和 `reasoning_effort`

## 要求

- 支持 Metal 的 macOS。
- 一个可用的 ds4 检出副本，包含 `ds4-server` 和 DeepSeek V4 Flash GGUF 文件。
- 足够的内存以支持您选择的上下文。较大的 `--ctx` 值会在服务器启动时分配更多
  KV 内存。

<Warning>OpenClaw agent turns include 工具 schemas and workspace context. A tiny context such as OpenClaw`--ctx 4096` can pass direct curl tests but fail full agent runs with `500 prompt exceeds context`. Use at least `--ctx 32768` for agent and 工具 smoke tests. Use `--ctx 393216` only when you have enough memory and want ds4 Think Max behavior.</Warning>

## 快速开始

<Steps>
  <Step title="启动 ds4-server">
    将 `<DS4_DIR>` 替换为您的 ds4 检出路径。

    ```bash
    <DS4_DIR>/ds4-server \
      --model <DS4_DIR>/ds4flash.gguf \
      --host 127.0.0.1 \
      --port 18000 \
      --ctx 32768 \
      --tokens 128
    ```

  </Step>
  <Step title="OpenAI验证 OpenAI 兼容端点">
    ```bash
    curl http://127.0.0.1:18000/v1/models
    ```

    响应应包含 `deepseek-v4-flash`。

  </Step>
  <Step title="OpenClaw添加 OpenClaw 提供商配置">
    添加 [Full config](#full-config) 中的配置，然后运行一次性模型
    检查：

    ```bash
    openclaw infer model run \
      --local \
      --model ds4/deepseek-v4-flash \
      --thinking off \
      --prompt "Reply with exactly: openclaw-ds4-ok" \
      --json
    ```

  </Step>
</Steps>

## 完整配置

当 ds4 已在 `127.0.0.1:18000` 上运行时，使用此配置。

```json5
{
  agents: {
    defaults: {
      model: { primary: "ds4/deepseek-v4-flash" },
      models: {
        "ds4/deepseek-v4-flash": {
          alias: "DS4 local",
        },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      ds4: {
        baseUrl: "http://127.0.0.1:18000/v1",
        apiKey: "ds4-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "deepseek-v4-flash",
            name: "DeepSeek V4 Flash (ds4)",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 32768,
            maxTokens: 128,
            compat: {
              supportsUsageInStreaming: true,
              supportsReasoningEffort: true,
              maxTokensField: "max_tokens",
              supportsStrictMode: false,
              thinkingFormat: "deepseek",
              supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
            },
          },
        ],
      },
    },
  },
}
```

请保持 `contextWindow` 与 `ds4-server --ctx` 值对齐。请保持 `maxTokens` 与 `--tokens` 对齐，除非您有意让 OpenClaw 请求的输出少于服务器默认值。

## 按需启动

OpenClaw 仅在选择 OpenClaw`ds4/...` 模型时才能启动 ds4。请将
`localService` 添加到同一个提供商条目中：

```json5
{
  models: {
    providers: {
      ds4: {
        baseUrl: "http://127.0.0.1:18000/v1",
        apiKey: "ds4-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "<DS4_DIR>/ds4-server",
          args: ["--model", "<DS4_DIR>/ds4flash.gguf", "--host", "127.0.0.1", "--port", "18000", "--ctx", "32768", "--tokens", "128"],
          cwd: "<DS4_DIR>",
          healthUrl: "http://127.0.0.1:18000/v1/models",
          readyTimeoutMs: 300000,
          idleStopMs: 0,
        },
        models: [
          {
            id: "deepseek-v4-flash",
            name: "DeepSeek V4 Flash (ds4)",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 32768,
            maxTokens: 128,
            compat: {
              supportsUsageInStreaming: true,
              supportsReasoningEffort: true,
              maxTokensField: "max_tokens",
              supportsStrictMode: false,
              thinkingFormat: "deepseek",
              supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
            },
          },
        ],
      },
    },
  },
}
```

`command` 必须是绝对可执行文件路径。不使用 Shell 查找和 `~` 扩展。
有关每个
`localService` 字段的信息，请参阅 [Local 模型 services](/zh/gateway/local-model-services)。

## Think Max

仅当同时满足以下两个条件时，ds4 才会应用 Think Max：

- `ds4-server` 以 `--ctx 393216` 或更高版本开头。
- 请求使用了 `reasoning_effort: "max"` 或等效的 ds4 effort 字段。

如果您运行该大上下文，请同时更新服务器标志和 OpenClaw 模型元数据：

```json5
{
  contextWindow: 393216,
  maxTokens: 384000,
  compat: {
    supportsUsageInStreaming: true,
    supportsReasoningEffort: true,
    maxTokensField: "max_tokens",
    supportsStrictMode: false,
    thinkingFormat: "deepseek",
    supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "max"],
  },
}
```

## 测试

首先进行直接的 HTTP 检查：

```bash
curl http://127.0.0.1:18000/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"deepseek-v4-flash","messages":[{"role":"user","content":"Reply with exactly: ds4-ok"}],"max_tokens":16,"stream":false,"thinking":{"type":"disabled"}}'
```

然后测试 OpenClaw 模型路由：

```bash
openclaw infer model run \
  --local \
  --model ds4/deepseek-v4-flash \
  --thinking off \
  --prompt "Reply with exactly: openclaw-ds4-ok" \
  --json
```

要进行完整的代理和工具调用冒烟测试，请使用至少 32768 的上下文：

```bash
openclaw agent \
  --local \
  --session-id ds4-tool-smoke \
  --model ds4/deepseek-v4-flash \
  --thinking off \
  --message "Use the shell command pwd once, then reply exactly: tool-ok <output>" \
  --json \
  --timeout 240
```

预期结果：

- `executionTrace.winnerProvider` 是 `ds4`
- `executionTrace.winnerModel` 是 `deepseek-v4-flash`
- `toolSummary.calls` 至少为 `1`
- `finalAssistantVisibleText` 以 `tool-ok` 开头

## 故障排除

<AccordionGroup>
  <Accordion title="curl /v1/models 无法连接">
    ds4 未运行或未绑定到 `baseUrl` 中的主机和端口。启动
    `ds4-server`，然后重试：

    ```bash
    curl http://127.0.0.1:18000/v1/models
    ```

  </Accordion>

<Accordion title="500 prompt exceeds context">为 OpenClaw 轮次配置的 `--ctx`OpenClaw 太小。请提高 `ds4-server --ctx`，然后更新 `models.providers.ds4.models[].contextWindow` 以使其匹配。与直接的单条消息 curl 请求相比，使用工具的完整代理轮次需要更多的上下文。</Accordion>

<Accordion title="Think Max 不会激活">ds4 仅在 `--ctx` 至少为 `393216` 且请求 要求 `reasoning_effort: "max"` 时才使用 Think Max。较小的上下文将回退到高 推理模式。</Accordion>

  <Accordion title="The first request is slow">
    ds4 具有冷 Metal 驻留和模型预热阶段。当 OpenClaw 按需启动服务器时，请使用
    `localService.readyTimeoutMs: 300000`。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="本地模型服务" href="/zh/gateway/local-model-services" icon="play">
    在模型请求之前按需启动本地模型服务器。
  </Card>
  <Card title="本地模型" href="/zh/gateway/local-models" icon="server">
    选择并操作本地模型后端。
  </Card>
  <Card title="模型提供商" href="/zh/concepts/model-providers" icon="layers">
    配置提供商引用、身份验证和故障转移。
  </Card>
  <Card title="DeepSeek" href="/zh/providers/deepseek" icon="brain">
    原生 DeepSeek 提供商行为和思维控制。
  </Card>
</CardGroup>
