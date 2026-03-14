---
summary: "OpenClaw 从何处加载环境变量及其优先级顺序"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "环境变量"
---

# 环境变量

OpenClaw 从多个来源获取环境变量。其原则是**绝不覆盖现有值**。

## 优先级（从高到低）

1. **进程环境**（Gateway 网关 进程从父 shell/daemon 继承的环境）。
2. **当前工作目录中的 `.env`**（dotenv 默认设置；不会覆盖现有值）。
3. 位于 `~/.openclaw/.env` 的 **全局 `.env`**（即 `$OPENCLAW_STATE_DIR/.env`；不会覆盖）。
4. `~/.openclaw/openclaw.json` 中的 **配置 `env` 代码块**（仅在缺失时应用）。
5. **可选的登录 Shell 导入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），仅应用于缺失的预期键。

如果配置文件完全缺失，则跳过步骤 4；但如果启用，shell 导入仍会运行。

## 配置 `env` 代码块

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

`env.shellEnv` 运行您的登录 Shell 并仅导入**缺失的**预期键：

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

等效环境变量：

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## Runtime-injected 环境变量

OpenClaw 还会将上下文标记注入到生成的子进程中：

- `OPENCLAW_SHELL=exec`：为通过 `exec` 工具运行的命令设置。
- `OPENCLAW_SHELL=acp`：为 ACP 运行时后端进程生成设置（例如 `acpx`）。
- `OPENCLAW_SHELL=acp-client`：当 `openclaw acp client` 生成 ACP 网桥进程时为其设置。
- `OPENCLAW_SHELL=tui-local`：为本地 TUI `!` Shell 命令设置。

这些是运行时标记（不是必需的用户配置）。它们可以在 shell/profile 逻辑中用于应用特定于上下文的规则。

## UI 环境变量

- `OPENCLAW_THEME=light`：当您的终端拥有浅色背景时，强制使用浅色 TUI 调色板。
- `OPENCLAW_THEME=dark`：强制使用深色 TUI 调色板。
- `COLORFGBG`：如果您的终端导出了此变量，OpenClaw 将使用背景颜色提示自动选择 TUI 调色板。

## Env var substitution in config

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

有关完整详细信息，请参阅[配置：环境变量替换](/zh/en/gateway/configuration#env-var-substitution-in-config)。

## Secret 引用与 `${ENV}` 字符串

OpenClaw 支持两种由环境驱动的模式：

- 配置值中的 `${VAR}` 字符串替换。
- 用于支持密钥引用的字段的 SecretRef 对象（`{ source: "env", provider: "default", id: "VAR" }`）。

两者均在激活时从进程环境中解析。SecretRef 的详细信息记录在[秘密管理](/zh/en/gateway/secrets)中。

## 路径相关的环境变量

| 变量               | 用途                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`        | 覆盖用于所有内部路径解析的主目录（`~/.openclaw/`、代理目录、会话、凭证）。当 OpenClaw 作为专用服务用户运行时非常有用。 |
| `OPENCLAW_STATE_DIR`   | 覆盖状态目录（默认 `~/.openclaw`）。                                                                                                                            |
| `OPENCLAW_CONFIG_PATH` | 覆盖配置文件路径（默认 `~/.openclaw/openclaw.json`）。                                                                                                             |

## 日志记录

| 变量             | 用途                                                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL` | 覆盖文件和控​​制台的日志级别（例如 `debug`、`trace`）。优先级高于配置中的 `logging.level` 和 `logging.consoleLevel`。无效值将被忽略并发出警告。 |

### `OPENCLAW_HOME`

设置后，`OPENCLAW_HOME` 将替换所有内部路径解析的系统主目录（`$HOME` / `os.homedir()`）。这为无头服务帐户实现了完全的文件系统隔离。

**优先级：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**示例** (macOS LaunchDaemon)：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/kira</string>
</dict>
```

`OPENCLAW_HOME` 也可以设置为波浪号路径（例如 `~/svc`），该路径在使用前会使用 `$HOME` 进行展开。

## 相关

- [Gateway 网关 配置](/zh/gateway/configuration)
- [常见问题：环境变量和 .env 加载](/zh/help/faq#env-vars-and-env-loading)
- [模型概述](/zh/concepts/models)

import zh from '/components/footer/zh.mdx';

<zh />
