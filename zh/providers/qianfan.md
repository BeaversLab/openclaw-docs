---
summary: "使用千帆的统一 API 在 OpenClaw 中访问多种模型"
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

1. 访问 [千帆控制台](https://console.bce.baidu.com/qianfan/ais/console/apiKey)
2. 创建新应用程序或选择现有应用程序
3. 生成一个 API 密钥（格式：`bce-v3/ALTAK-...`）
4. 复制 API 密钥以供 OpenClaw 使用

## CLI 设置

```bash
openclaw onboard --auth-choice qianfan-api-key
```

## 相关文档

- [OpenClaw 配置](/en/gateway/configuration)
- [模型提供商](/en/concepts/model-providers)
- [代理设置](/en/concepts/agent)
- [千帆 API 文档](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)

import zh from '/components/footer/zh.mdx';

<zh />
