---
summary: "OpenClaw 读取环境变量的位置与优先级"
read_when:
  - 需要知道加载哪些 env vars 以及顺序
  - 排查 Gateway 缺少 API keys
  - 记录 provider 认证或部署环境
title: "环境变量"
---
# 环境变量

OpenClaw 从多个来源读取环境变量。规则是**绝不覆盖已有值**。

## 优先级（高 → 低）

1) **进程环境**（Gateway 进程从父 shell/daemon 继承的环境）。
2) **当前工作目录的 `.env`**（dotenv 默认行为；不覆盖已有）。
3) **全局 `.env`**：`~/.openclaw/.env`（即 `$OPENCLAW_STATE_DIR/.env`；不覆盖）。
4) **配置 `env` block**（`~/.openclaw/openclaw.json`，仅在缺失时应用）。
5) **可选登录 shell 导入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），仅为缺失的预期 key 导入。

如果配置文件完全缺失，步骤 4 会跳过；若启用 shell import，仍会执行。

## 配置 `env` block

两种等价方式设置内联 env vars（均不覆盖）：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-..."
    }
  }
}
```

## Shell env 导入

`env.shellEnv` 会运行登录 shell 并仅导入**缺失**的预期 key：

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000
    }
  }
}
```

等价环境变量：
- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## 配置中的 env 变量替换

可在配置字符串值中使用 `${VAR_NAME}` 引用 env vars：

```json5
{
  models: {
    providers: {
      "vercel-gateway": {
        apiKey: "${VERCEL_GATEWAY_API_KEY}"
      }
    }
  }
}
```

详见 [Configuration: Env var substitution](/zh/gateway/configuration#env-var-substitution-in-config)。

## 相关

- [Gateway configuration](/zh/gateway/configuration)
- [FAQ: env vars and .env loading](/zh/help/faq#env-vars-and-env-loading)
- [Models overview](/zh/concepts/models)
