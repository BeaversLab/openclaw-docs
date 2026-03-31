---
summary: "透過阿里雲 Model Studio 使用 Qwen 模型"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "Qwen"
---

# Qwen

<Warning>

**Qwen OAuth 已移除。** 使用 `portal.qwen.ai` 端點的免費層 OAuth 整合
(`qwen-portal`) 已不再提供。
請參閱 [Issue #49557](https://github.com/openclaw/openclaw/issues/49557) 瞭解
背景資訊。

</Warning>

## 建議：Model Studio (阿里雲 Coding 方案)

使用 [Model Studio](/en/providers/modelstudio) 以取得官方支援的 Qwen 模型
(Qwen 3.5 Plus、GLM-4.7、Kimi K2.5、MiniMax M2.5 等) 的存取權限。

```bash
# Global endpoint
openclaw onboard --auth-choice modelstudio-api-key

# China endpoint
openclaw onboard --auth-choice modelstudio-api-key-cn
```

請參閱 [Model Studio](/en/providers/modelstudio) 以取得完整的設定詳細資料。
