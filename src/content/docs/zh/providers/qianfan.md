---
summary: "使用千帆统一的 API 在 OpenClaw 中访问许多模型"
read_when:
  - You want a single API key for many LLMs
  - You need Baidu Qianfan setup guidance
title: "千帆"
---

# 千帆服务提供商指南

千帆是百度的 MaaS 平台，提供 **统一 API**，将请求路由到单个端点和 API 密钥背后的许多模型。它与 OpenAI 兼容，因此大多数 OpenAI SDK 只需切换基础 URL 即可工作。

## 先决条件

1. 具有千帆 API 访问权限的百度云账户
2. 来自千帆控制台的 API 密钥
3. 系统上已安装 OpenClaw

## 获取您的 API 密钥

1. 访问[千帆控制台](https://console.bce.baidu.com/qianfan/ais/console/apiKey)
2. 创建新应用程序或选择现有应用程序
3. 生成一个 API 密钥（格式：`bce-v3/ALTAK-...`）
4. 复制 API 密钥以供 OpenClaw 使用

## CLI 设置

```bash
openclaw onboard --auth-choice qianfan-api-key
```

## 配置片段

```json5
{
  env: { QIANFAN_API_KEY: "bce-v3/ALTAK-..." },
  agents: {
    defaults: {
      model: { primary: "qianfan/deepseek-v3.2" },
      models: {
        "qianfan/deepseek-v3.2": { alias: "QIANFAN" },
      },
    },
  },
  models: {
    providers: {
      qianfan: {
        baseUrl: "https://qianfan.baidubce.com/v2",
        api: "openai-completions",
        models: [
          {
            id: "deepseek-v3.2",
            name: "DEEPSEEK V3.2",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 98304,
            maxTokens: 32768,
          },
          {
            id: "ernie-5.0-thinking-preview",
            name: "ERNIE-5.0-Thinking-Preview",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 119000,
            maxTokens: 64000,
          },
        ],
      },
    },
  },
}
```

## 注意

- 默认捆绑的模型引用：`qianfan/deepseek-v3.2`
- 默认基础 URL：`https://qianfan.baidubce.com/v2`
- 捆绑目录当前包括 `deepseek-v3.2` 和 `ernie-5.0-thinking-preview`
- 仅当您需要自定义基础 URL 或模型元数据时，才添加或覆盖 `models.providers.qianfan`
- 千帆通过 OpenAI 兼容的传输路径运行，而不是通过原生 OpenAI 请求整形

## 相关文档

- [OpenClaw 配置](/en/gateway/configuration)
- [模型提供商](/en/concepts/model-providers)
- [Agent 设置](/en/concepts/agent)
- [千帆 API 文档](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)
