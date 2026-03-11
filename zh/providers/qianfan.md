---
summary: "使用千帆的统一 API 在 OpenClaw 中访问多种模型"
read_when:
  - "You want a single API key for many LLMs"
  - "You need Baidu Qianfan setup guidance"
title: "千帆"
---

# 千帆提供商指南

千帆是百度的 MaaS 平台，提供 **统一 API**，通过单一端点和 API 密钥将请求路由到多个模型。它与 OpenAI 兼容，因此大多数 OpenAI SDK 可以通过切换基础 URL 来使用。

## 前置条件

1. 具有千帆 API 访问权限的百度云账户
2. 从千帆控制台获取的 API 密钥
3. 在您的系统上安装了 OpenClaw

## Getting Your API Key

1. 访问[千帆控制台](https://console.bce.baidu.com/qianfan/ais/console/apiKey)
2. 创建新应用或选择现有应用
3. 生成 API 密钥（格式：`bce-v3/ALTAK-...`）
4. 复制 API 密钥以在 OpenClaw 中使用

## CLI setup

```bash
openclaw onboard --auth-choice qianfan-api-key
```

## 相关文档

- [OpenClaw 配置](/zh/gateway/configuration)
- [模型提供商](/zh/concepts/model-providers)
- [Agent 设置](/zh/concepts/agent)
- [千帆 API 文档](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)
