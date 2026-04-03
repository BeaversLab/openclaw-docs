---
title: "Qwen / Model Studio"
summary: "阿里云 Model Studio 设置（Standard 按量付费和 Coding Plan，双区域端点）"
read_when:
  - You want to use Qwen (Alibaba Cloud Model Studio) with OpenClaw
  - You need the API key env var for Model Studio
  - You want to use the Standard (pay-as-you-go) or Coding Plan endpoint
---

# Qwen / Model Studio (阿里云)

Model Studio 提供商提供对阿里云模型的访问，包括 Qwen 和托管在该平台上的第三方模型。支持两种计费计划：**Standard**（按量付费）和 **Coding Plan**（订阅）。

- 提供商： `modelstudio`
- 认证： `MODELSTUDIO_API_KEY`
- API：兼容 OpenAI

## 快速开始

### Standard（按量付费）

```bash
# China endpoint
openclaw onboard --auth-choice modelstudio-standard-api-key-cn

# Global/Intl endpoint
openclaw onboard --auth-choice modelstudio-standard-api-key
```

### Coding Plan（订阅）

```bash
# China endpoint
openclaw onboard --auth-choice modelstudio-api-key-cn

# Global/Intl endpoint
openclaw onboard --auth-choice modelstudio-api-key
```

完成新手引导后，设置默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "modelstudio/qwen3.5-plus" },
    },
  },
}
```

## 计划类型和端点

| 计划                 | 区域 | 认证选项                          | 端点                                             |
| -------------------- | ---- | --------------------------------- | ------------------------------------------------ |
| Standard（按量付费） | 中国 | `modelstudio-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| Standard（按量付费） | 全球 | `modelstudio-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Coding Plan（订阅）  | 中国 | `modelstudio-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Coding Plan（订阅）  | 全球 | `modelstudio-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

该提供商会根据您的认证选项自动选择端点。您可以在配置中使用自定义 `baseUrl` 进行覆盖。

## 获取您的 API 密钥

- **中国**：[bailian.console.aliyun.com](https://bailian.console.aliyun.com/)
- **全球/国际**：[modelstudio.console.alibabacloud.com](https://modelstudio.console.alibabacloud.com/)

## 可用模型

- **qwen3.5-plus**（默认） — Qwen 3.5 Plus
- **qwen3-coder-plus**，**qwen3-coder-next** — Qwen 编码模型
- **GLM-5** — 通过阿里云的 GLM 模型
- **Kimi K2.5** — 通过阿里云的 Moonshot AI
- **MiniMax-M2.7** — MiniMax 通过阿里云

某些模型（qwen3.5-plus、kimi-k2.5）支持图像输入。上下文窗口范围从 200K 到 1M tokens。

## 环境说明

如果 Gateway(网关) 作为守护进程运行，请确保
`MODELSTUDIO_API_KEY` 对该进程可用（例如，在
`~/.openclaw/.env` 中或通过 `env.shellEnv`）。
