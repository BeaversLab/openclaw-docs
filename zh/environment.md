---
summary: "OpenClaw 从何处加载环境变量及其优先级顺序"
read_when:
  - 您需要知道加载了哪些环境变量，以及以何种顺序加载
  - 您正在调试 Gateway(网关) 中丢失的 API 密钥
  - 您正在记录提供商身份验证或部署环境
title: "环境变量"
---

# 环境变量

OpenClaw 从多个来源拉取环境变量。规则是**绝不覆盖现有值**。

## 优先级（从高到低）

1. **进程环境**（Gateway(网关) 进程已从父 shell/守护进程获取的内容）。
2. **当前工作目录中的 `.env`**（dotenv 默认值；不覆盖）。
3. **位于 `~/.openclaw/.env` 的全局 `.env`**（即 `$OPENCLAW_STATE_DIR/.env`；不覆盖）。
4. `~/.openclaw/openclaw.json` 中的 **Config `env` block**（仅在缺失时应用）。
5. **可选的 login-shell 导入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），仅针对缺失的预期键名应用。

如果配置文件完全缺失，则跳过步骤 4；如果启用，shell 导入仍会运行。

## Config `env` block

设置内联环境变量的两种等效方式（均不覆盖）：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
  },
}
```

## Shell env import

`env.shellEnv` 运行您的登录 shell 并仅导入**缺失的**预期键名：

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

环境变量等效项：

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## 配置中的环境变量替换

您可以使用 `${VAR_NAME}` 语法在配置字符串值中直接引用环境变量：

```json5
{
  models: {
    providers: {
      "vercel-gateway": {
        apiKey: "${VERCEL_GATEWAY_API_KEY}",
      },
    },
  },
}
```

有关完整详细信息，请参阅 [配置：环境变量替换](/zh/gateway/configuration#env-var-substitution-in-config)。

## 相关

- [Gateway(网关) 配置](/zh/gateway/configuration)
- [常见问题：环境变量和 .env 加载](/zh/help/faq#env-vars-and-env-loading)
- [模型概述](/zh/concepts/models)

import en from "/components/footer/en.mdx";

<en />
