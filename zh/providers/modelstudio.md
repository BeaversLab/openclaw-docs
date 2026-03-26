---
title: "Model Studio"
summary: "Alibaba Cloud Model Studio 设置 (Coding Plan, 双区域端点)"
read_when:
  - You want to use Alibaba Cloud Model Studio with OpenClaw
  - You need the API key env var for Model Studio
---

# Model Studio (阿里云)

Model Studio 提供商提供对阿里云 Coding Plan 模型的访问，包括托管在该平台上的 Qwen 模型和第三方模型。

- 提供商：`modelstudio`
- 认证：`MODELSTUDIO_API_KEY`
- API：与 API 兼容

## 快速开始

1. 设置 API 密钥：

```bash
openclaw onboard --auth-choice modelstudio-api-key
```

2. 设置默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "modelstudio/qwen3.5-plus" },
    },
  },
}
```

## 区域端点

Model Studio 根据区域设有两个端点：

| 区域      | 端点                                 |
| --------- | ------------------------------------ |
| 中国 (CN) | `coding.dashscope.aliyuncs.com`      |
| 全球      | `coding-intl.dashscope.aliyuncs.com` |

提供商会根据认证选择自动选择（全球用 `modelstudio-api-key`，中国用 `modelstudio-api-key-cn`）。您可以在配置中使用自定义 `baseUrl` 进行覆盖。

## 可用模型

- **qwen3.5-plus** (默认) - Qwen 3.5 Plus
- **qwen3-max** - Qwen 3 Max
- **qwen3-coder** 系列 - Qwen 编程模型
- **GLM-5**、**GLM-4.7** - 通过阿里云提供的 GLM 模型
- **Kimi K2.5** - 通过阿里云提供的 Moonshot AI
- **MiniMax-M2.5** - 通过阿里云提供的 MiniMax

大多数模型支持图像输入。上下文窗口范围从 200K 到 1M token。

## 环境说明

如果 Gateway(网关) 作为守护进程 (launchd/systemd) 运行，请确保 `MODELSTUDIO_API_KEY` 对该进程可用（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

import zh from "/components/footer/zh.mdx";

<zh />
