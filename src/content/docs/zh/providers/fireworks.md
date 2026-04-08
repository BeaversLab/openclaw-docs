---
summary: "Fireworks 设置（身份验证 + 模型选择）"
read_when:
  - You want to use Fireworks with OpenClaw
  - You need the Fireworks API key env var or default model id
---

# Fireworks

[Fireworks](https://fireworks.ai) 通过与 OpenAI 兼容的 API 公开源权重模型和路由模型。OpenClaw 现在包含一个捆绑的 Fireworks 提供商插件。

- 提供商：`fireworks`
- 身份验证：`FIREWORKS_API_KEY`
- API：与 OpenAI 兼容的聊天/补全接口
- 基础 URL：`https://api.fireworks.ai/inference/v1`
- 默认模型：`fireworks/accounts/fireworks/routers/kimi-k2p5-turbo`

## 快速开始

通过新手引导设置 Fireworks 身份验证：

```bash
openclaw onboard --auth-choice fireworks-api-key
```

这会将您的 Fireworks 密钥存储在 OpenClaw 配置中，并将 Fire Pass 入门模型设置为默认模型。

## 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY" \
  --skip-health \
  --accept-risk
```

## 环境说明

如果 Gateway(网关) 在您的交互式 Shell 之外运行，请确保 `FIREWORKS_API_KEY`
对该进程也可用。仅位于 `~/.profile` 中的密钥将无助于
launchd/systemd 守护进程，除非该环境也被导入到那里。

## 内置目录

| 模型引用                                               | 名称                        | 输入       | 上下文  | 最大输出 | 说明                           |
| ------------------------------------------------------ | --------------------------- | ---------- | ------- | -------- | ------------------------------ |
| `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` | Kimi K2.5 Turbo (Fire Pass) | 文本、图像 | 256,000 | 256,000  | Fireworks 上默认捆绑的入门模型 |

## 自定义 Fireworks 模型 ID

OpenClaw 也接受动态 Fireworks 模型 ID。使用 Fireworks 显示的确切模型或路由器 ID，并加上 `fireworks/` 前缀。

示例：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "fireworks/accounts/fireworks/routers/kimi-k2p5-turbo",
      },
    },
  },
}
```

如果 Fireworks 发布了较新的模型，例如最新的 Qwen 或 Gemma 版本，您可以直接使用其 Fireworks 模型 ID 切换到该模型，而无需等待捆绑目录的更新。
