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

- **doubao-seed-1-8** - Doubao Seed 1.8（通用，默认）
- **doubao-seed-code-preview** - Doubao 编码模型
- **ark-code-latest** - 编码计划默认
- **Kimi K2.5** - 通过 Volcano Engine 访问 Moonshot AI
- **GLM-4.7** - 通过 Volcano Engine 访问 GLM
- **DeepSeek V3.2** - 通过 Volcano Engine 访问 DeepSeek

大多数模型支持文本 + 图像输入。上下文窗口范围为 128K 至 256K token。

## 环境说明

如果 Gateway(网关) 作为守护进程（launchd/systemd）运行，请确保
`VOLCANO_ENGINE_API_KEY` 对该进程可用（例如，在
`~/.openclaw/.env` 中或通过 `env.shellEnv`）。
