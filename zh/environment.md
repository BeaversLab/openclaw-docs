---
summary: "OpenClaw 从何处加载环境变量及其优先级顺序"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "环境变量"
---

# 环境变量

OpenClaw 从多个来源提取环境变量。规则是**绝不覆盖现有值**。

## 优先级（从高到低）

1. **进程环境**（Gateway 进程从父 shell/守护进程已获取的环境）。
2. **当前工作目录中的 `.env`**（dotenv 默认设置；不覆盖）。
3. **位于 `~/.openclaw/.env` 的全局 `.env`**（即 `$OPENCLAW_STATE_DIR/.env`；不覆盖）。
4. **`~/.openclaw/openclaw.json` 中的 Config `env` 块**（仅在缺失时应用）。
5. **可选的登录 shell 导入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），仅针对缺失的预期键应用。

如果配置文件完全缺失，将跳过第 4 步；但如果启用，shell 导入仍会运行。

## Config `env` 块

设置内联环境变量的两种等效方式（均为非覆盖式）：

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

## Shell 环境导入

`env.shellEnv` 运行您的登录 shell 并仅导入**缺失的**预期键：

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

等效的环境变量：

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

有关详细信息，请参阅[配置：环境变量替换](/zh/en/gateway/configuration#env-var-substitution-in-config)。

## 相关

- [Gateway 配置](/zh/en/gateway/configuration)
- [常见问题：环境变量与 .env 加载](/zh/en/help/faq#env-vars-and-env-loading)
- [模型概述](/zh/en/concepts/models)

import zh from '/components/footer/zh.mdx';

<zh />
