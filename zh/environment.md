---
summary: "OpenClaw 从何处加载环境变量及优先级顺序"
read_when:
  - "You need to know which env vars are loaded, and in what order"
  - "You are debugging missing API keys in the Gateway"
  - "You are documenting provider auth or deployment environments"
title: "环境变量"
---

# 环境变量

OpenClaw 从多个来源获取环境变量。规则是**永远不要覆盖现有值**。

## 优先级（从高到低）

1. **进程环境**（Gateway 进程从父 shell/守护进程已获得的环境）。
2. **当前工作目录中的 `.env`**（dotenv 默认值；不覆盖）。
3. **`~/.openclaw/.env` 处的全局 `.env`**（又名 `$OPENCLAW_STATE_DIR/.env`；不覆盖）。
4. **`~/.openclaw/openclaw.json` 中的配置 `env` 块**（仅在缺失时应用）。
5. **可选的登录 shell 导入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），仅应用于缺失的预期键。

如果配置文件完全缺失，则跳过步骤 4；如果启用，shell 导入仍会运行。

## 配置 `env` 块

两种等效的方法来设置内联环境变量（两者都不覆盖）：

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

您可以使用 `${VAR_NAME}` 语法直接在配置字符串值中引用环境变量：

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

参阅[配置：环境变量替换](/zh/gateway/configuration#env-var-substitution-in-config) 了解完整详情。

## 相关

- [Gateway 配置](/zh/gateway/configuration)
- [常见问题：环境变量和 .env 加载](/zh/help/faq#env-vars-and-env-loading)
- [模型概述](/zh/concepts/models)
