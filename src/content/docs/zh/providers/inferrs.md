---
summary: "通过 inferrs（OpenAI 兼容的本地服务器）运行 OpenClaw"
read_when:
  - You want to run OpenClaw against a local inferrs server
  - You are serving Gemma or another model through inferrs
  - You need the exact OpenClaw compat flags for inferrs
title: "inferrs"
---

# inferrs

[inferrs](https://github.com/ericcurtin/inferrs) 可以在 OpenAI 兼容的 `/v1` API 后端提供本地模型。OpenClaw 通过通用的 `openai-completions` 路径与 `inferrs` 协同工作。

`inferrs` 目前最好被视为一个自定义的自托管 OpenAI 兼容后端，而不是一个专用的 OpenClaw 提供商插件。

## 快速开始

1. 使用模型启动 `inferrs`。

示例：

```bash
inferrs serve google/gemma-4-E2B-it \
  --host 127.0.0.1 \
  --port 8080 \
  --device metal
```

2. 验证服务器是否可达。

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/v1/models
```

3. 添加一个显式的 OpenClaw 提供商条目，并将你的默认模型指向它。

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

## 为什么 `requiresStringContent` 很重要

某些 `inferrs` 聊天补全路由仅接受字符串 `messages[].content`，而不接受结构化内容部分数组。

如果 OpenClaw 运行失败并出现如下错误：

```text
messages[1].content: invalid type: sequence, expected a string
```

设置：

```json5
compat: {
  requiresStringContent: true
}
```

OpenClaw 将在发送请求之前将纯文本内容部分展平为普通字符串。

## Gemma 和工具架构说明

某些当前的 `inferrs` + Gemma 组合接受小型直接 `/v1/chat/completions` 请求，但在完整的 OpenClaw 代理运行轮次中仍然失败。

如果发生这种情况，请首先尝试此操作：

```json5
compat: {
  requiresStringContent: true,
  supportsTools: false
}
```

这会禁用 OpenClaw 针对该模型的工具架构表面，并可以减少对更严格的本地后端的提示压力。

如果微小的直接请求仍然有效，但正常的 OpenClaw 代理轮次继续在 `inferrs` 内部崩溃，那么剩余的问题通常是上游模型/服务器行为，而不是 OpenClaw 的传输层。

## 手动冒烟测试

配置完成后，测试这两个层级：

```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"google/gemma-4-E2B-it","messages":[{"role":"user","content":"What is 2 + 2?"}],"stream":false}'

openclaw infer model run \
  --model inferrs/google/gemma-4-E2B-it \
  --prompt "What is 2 + 2? Reply with one short sentence." \
  --json
```

如果第一个命令有效但第二个失败，请使用下面的故障排除说明。

## 故障排除

- `curl /v1/models` 失败：`inferrs` 未运行、不可达或未绑定到预期的主机/端口。
- `messages[].content ... expected a string`：设置 `compat.requiresStringContent: true`。
- 直接的小型 `/v1/chat/completions` 调用通过，但 `openclaw infer model run`
  失败：请尝试 `compat.supportsTools: false`。
- OpenClaw 不再出现架构错误，但 `inferrs` 在较大的
  代理轮次中仍然崩溃：将其视为上游 `inferrs` 或模型限制，并降低
  提示词压力或切换本地后端/模型。

## 代理风格的行为

`inferrs` 被视为代理风格的 OpenAI 兼容 `/v1` 后端，而不是
原生 OpenAI 端点。

- 原生的仅限 OpenAI 的请求塑形在此处不适用
- 没有 `service_tier`，没有响应 `store`，没有提示词缓存提示，并且没有
  OpenAI 推理兼容的负载塑形
- 隐藏的 OpenClaw 归属头（`originator`，`version`，`User-Agent`）
  不会在自定义 `inferrs` 基本 URL 上注入

## 另请参阅

- [本地模型](/en/gateway/local-models)
- [Gateway(网关) 故障排除](/en/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail)
- [模型提供商](/en/concepts/model-providers)
