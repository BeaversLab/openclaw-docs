---
summary: "使用 Qianfan 的统一 API 访问 OpenClaw 中的许多模型"
read_when:
  - 您想要一个适用于许多 LLM 的单一 API 密钥
  - 您需要百度 Qianfan 设置指南
title: "Qianfan"
---

# Qianfan 提供商指南

Qianfan 是百度的 MaaS 平台，提供统一 API，可在单个端点和 API 密钥后将请求路由到许多模型。它与 OpenAI 兼容，因此大多数 OpenAI SDK 可以通过切换基本 URL 来工作。

## 先决条件

1. 具有 Qianfan API 访问权限的百度云账户
2. 来自 Qianfan 控制台的 API 密钥
3. 您的系统上已安装 OpenClaw

## 获取您的 API 密钥

1. 访问 [Qianfan 控制台](https://console.bce.baidu.com/qianfan/ais/console/apiKey)
2. 创建新应用程序或选择现有应用程序
3. 生成 API 密钥（格式：`bce-v3/ALTAK-...`）
4. 复制 API 密钥以便与 OpenClaw 一起使用

## CLI 设置

```bash
openclaw onboard --auth-choice qianfan-api-key
```

## 相关文档

- [OpenClaw 配置](/zh/gateway/configuration)
- [模型提供商](/zh/concepts/model-providers)
- [Agent 设置](/zh/concepts/agent)
- [Qianfan API 文档](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)

import en from "/components/footer/en.mdx";

<en />
