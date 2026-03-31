---
summary: "通过阿里云 Model Studio 使用 Qwen 模型"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "Qwen"
---

# Qwen

<Warning>

**Qwen OAuth 已被移除。** 以前使用 `portal.qwen.ai` 端点的免费版 OAuth 集成
(`qwen-portal`) 不再可用。
请参阅 [Issue #49557](https://github.com/openclaw/openclaw/issues/49557) 了解
背景信息。

</Warning>

## 推荐：Model Studio（阿里云编程计划）

使用 [Model Studio](/en/providers/modelstudio) 获取官方支持的
Qwen 模型（Qwen 3.5 Plus、GLM-4.7、Kimi K2.5、MiniMax M2.5 等）访问权限。

```bash
# Global endpoint
openclaw onboard --auth-choice modelstudio-api-key

# China endpoint
openclaw onboard --auth-choice modelstudio-api-key-cn
```

请参阅 [Model Studio](/en/providers/modelstudio) 了解完整的设置详情。
