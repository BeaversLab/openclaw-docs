---
summary: "Where OpenClaw loads 环境变量 and the precedence order"
read_when:
  - You need to know which 环境变量 are loaded, and in what order
  - You are debugging missing API keys in the Gateway(网关)
  - You are documenting 提供商 auth or deployment environments
title: "环境变量"
---

# 环境变量

OpenClaw pulls 环境变量 from multiple sources. The rule is **never override existing values**.

## Precedence (highest → lowest)

1. **Process environment** (what the Gateway(网关) process already has from the parent shell/daemon).
2. **`.env` in the current working directory** (dotenv default; does not override).
3. **Global `.env`** at `~/.openclaw/.env` (aka `$OPENCLAW_STATE_DIR/.env`; does not override).
4. **Config `env` block** in `~/.openclaw/openclaw.json` (applied only if missing).
5. **Optional login-shell import** (`env.shellEnv.enabled` or `OPENCLAW_LOAD_SHELL_ENV=1`), applied only for missing 预期键名.

If the config file is missing entirely, step 4 is skipped; shell import still runs if enabled.

## Config `env` block

Two equivalent ways to set inline 环境变量 (both are non-overriding):

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

`env.shellEnv` runs your login shell and imports only **missing** 预期键名:

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

Env var equivalents:

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## Runtime-injected 环境变量

OpenClaw also injects context markers into spawned child processes:

- `OPENCLAW_SHELL=exec`: set for commands run through the `exec` 工具.
- `OPENCLAW_SHELL=acp`: set for ACP runtime backend process spawns (for example `acpx`).
- `OPENCLAW_SHELL=acp-client`: set for `openclaw acp client` when it spawns the ACP bridge process.
- `OPENCLAW_SHELL=tui-local`: set for local TUI `!` shell commands.

These are runtime markers (not required user config). They can be used in shell/profile logic
to apply context-specific rules.

## UI 环境变量

- `OPENCLAW_THEME=light`：当您的终端具有浅色背景时，强制使用浅色 TUI 调色板。
- `OPENCLAW_THEME=dark`：强制使用深色 TUI 调色板。
- `COLORFGBG`：如果您的终端导出了此变量，OpenClaw 将使用背景颜色提示自动选择 TUI 调色板。

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

有关完整详细信息，请参阅 [配置：环境变量替换](/zh/gateway/configuration#env-var-substitution-in-config)。

## Secret 引用与 `${ENV}` 字符串

OpenClaw 支持两种由环境驱动的模式：

- 配置值中的 `${VAR}` 字符串替换。
- SecretRef 对象 (`{ source: "env", provider: "default", id: "VAR" }`)，用于支持 Secret 引用的字段。

两者均在激活时从进程环境解析。SecretRef 的详细信息记录在 [Secret 管理](/zh/gateway/secrets) 中。

## 路径相关的环境变量

| 变量               | 用途                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`        | 覆盖用于所有内部路径解析的主目录 (`~/.openclaw/`、代理目录、会话、凭据)。在将 OpenClaw 作为专用服务用户运行时非常有用。 |
| `OPENCLAW_STATE_DIR`   | 覆盖状态目录（默认为 `~/.openclaw`）。                                                                                                                            |
| `OPENCLAW_CONFIG_PATH` | 覆盖配置文件路径（默认为 `~/.openclaw/openclaw.json`）。                                                                                                             |

## 日志记录

| 变量             | 用途                                                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL` | 覆盖文件和控制台的日志级别（例如 `debug`、`trace`）。优先级高于配置中的 `logging.level` 和 `logging.consoleLevel`。无效值将被忽略并显示警告。 |

### `OPENCLAW_HOME`

设置后，`OPENCLAW_HOME` 将替换系统主目录 (`$HOME` / `os.homedir()`) 用于所有内部路径解析。这为无头服务帐户启用了完整的文件系统隔离。

**优先级：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**示例**（macOS LaunchDaemon）：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/kira</string>
</dict>
```

`OPENCLAW_HOME` 也可以设置为波浪号路径（例如 `~/svc`），该路径会在使用前通过 `$HOME` 进行扩展。

## 相关

- [Gateway(网关) 配置](/zh/gateway/configuration)
- [常见问题：环境变量和 .env 加载](/zh/help/faq#env-vars-and-env-loading)
- [模型概述](/zh/concepts/models)

import en from "/components/footer/en.mdx";

<en />
