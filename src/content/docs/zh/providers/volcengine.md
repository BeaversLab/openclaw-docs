---
title: "Volcengine (Doubao)"
summary: "Volcano Engine setup (Doubao models, general + coding endpoints)"
read_when:
  - You want to use Volcano Engine or Doubao models with OpenClaw
  - You need the Volcengine API key setup
---

# Volcengine (Doubao)

Volcengine 提供商允许访问托管在 Volcano Engine 上的 Doubao 模型和第三方模型，并为通用和编码工作负载提供单独的端点。

- 提供商：`volcengine`（通用）+ `volcengine-plan`（编码）
- 身份验证：`VOLCANO_ENGINE_API_KEY`
- API：与 API 兼容

## 快速开始

1. 设置 API 密钥：

```bash
openclaw onboard --auth-choice volcengine-api-key
```

2. 设置默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "volcengine-plan/ark-code-latest" },
    },
  },
}
```

## 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice volcengine-api-key \
  --volcengine-api-key "$VOLCANO_ENGINE_API_KEY"
```

## 提供商和端点

| 提供商            | 端点                                      | 使用场景 |
| ----------------- | ----------------------------------------- | -------- |
| `volcengine`      | `ark.cn-beijing.volces.com/api/v3`        | 通用模型 |
| `volcengine-plan` | `ark.cn-beijing.volces.com/api/coding/v3` | 编码模型 |

两个提供商均通过单个 API 密钥进行配置。设置时会自动注册两者。

## 可用模型

通用提供商 (`volcengine`)：

| 模型参考                                     | 名称                            | 输入       | 上下文  |
| -------------------------------------------- | ------------------------------- | ---------- | ------- |
| `volcengine/doubao-seed-1-8-251228`          | Doubao Seed 1.8                 | 文本、图像 | 256,000 |
| `volcengine/doubao-seed-code-preview-251028` | doubao-seed-code-preview-251028 | 文本、图像 | 256,000 |
| `volcengine/kimi-k2-5-260127`                | Kimi K2.5                       | 文本、图像 | 256,000 |
| `volcengine/glm-4-7-251222`                  | GLM 4.7                         | 文本、图像 | 200,000 |
| `volcengine/deepseek-v3-2-251201`            | DeepSeek V3.2                   | 文本、图像 | 128,000 |

编码提供商 (`volcengine-plan`)：

| 模型参考                                          | 名称                     | 输入 | 上下文  |
| ------------------------------------------------- | ------------------------ | ---- | ------- |
| `volcengine-plan/ark-code-latest`                 | Ark Coding Plan          | 文本 | 256,000 |
| `volcengine-plan/doubao-seed-code`                | Doubao Seed Code         | 文本 | 256,000 |
| `volcengine-plan/glm-4.7`                         | GLM 4.7 Coding           | 文本 | 200,000 |
| `volcengine-plan/kimi-k2-thinking`                | Kimi K2 Thinking         | 文本 | 256,000 |
| `volcengine-plan/kimi-k2.5`                       | Kimi K2.5 Coding         | 文本 | 256,000 |
| `volcengine-plan/doubao-seed-code-preview-251028` | Doubao Seed Code Preview | 文本 | 256,000 |

`openclaw onboard --auth-choice volcengine-api-key` 目前将
`volcengine-plan/ark-code-latest` 设置为默认模型，同时注册
通用 `volcengine` 目录。

在新手引导/配置模型选择期间，Volcengine 认证选项优先
显示 `volcengine/*` 和 `volcengine-plan/*` 行。如果这些模型尚未
加载，OpenClaw 将回退到未过滤的目录，而不是显示
空的提供商范围选择器。

## 环境说明

如果 Gateway(网关) 作为守护进程运行，请确保
`VOLCANO_ENGINE_API_KEY` 对该进程可用（例如，在
`~/.openclaw/.env` 中或通过 `env.shellEnv`）。
