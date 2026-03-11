---
summary: "OpenClaw 从何处加载环境变量以及优先级顺序"
read_when:
  - "You need to know which env vars are loaded, and in what order"
  - "You are debugging missing API keys in the Gateway"
  - "You are documenting provider auth or deployment environments"
title: "环境变量"
---

# 环境变量

OpenClaw 从多个源提取环境变量。规则是**永远不覆盖现有值**。

## 优先级（从高到低）

1. **进程环境**（Gateway 进程已从父 shell/守护进程获得的内容）。
2. **当前工作目录中的 `.env`**（dotenv 默认值；不覆盖）。
3. **`~/.openclaw/.env` 处的全局 `.env`**（又称 `$OPENCLAW_STATE_DIR/.env`；不覆盖）。
4. **`~/.openclaw/openclaw.json` 中的配置 `env` 块**（仅在缺失时应用）。
5. **可选的登录 shell 导入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），仅应用于缺失的预期密钥。

如果配置文件完全缺失，则跳过步骤 4；如果启用，shell 导入仍会运行。

## 配置 `env` 块

设置内联环境变量的两种等效方式（都是非覆盖的）：

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

`env.shellEnv` 运行您的登录 shell 并仅导入**缺失的**预期密钥：

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

## 运行时注入的环境变量

OpenClaw 还将上下文标记注入到生成的子进程中：

- `OPENCLAW_SHELL=exec`：为通过 `exec` 工具运行的命令设置。
- `OPENCLAW_SHELL=acp`：为 ACP 运行时后端进程生成设置（例如 `acpx`）。
- `OPENCLAW_SHELL=acp-client`：为 `openclaw acp client` 在生成 ACP 桥接进程时设置。
- `OPENCLAW_SHELL=tui-local`：为本地 TUI `!` shell 命令设置。

这些是运行时标记（不是必需的用户配置）。它们可以在 shell/profile 逻辑中
使用以应用特定于上下文的规则。

## UI 环境变量

- `OPENCLAW_THEME=light`：当您的终端具有浅色背景时，强制使用浅色 TUI 调色板。
- `OPENCLAW_THEME=dark`：强制使用深色 TUI 调色板。
- `COLORFGBG`：如果您的终端导出它，OpenClaw 使用背景颜色提示自动选择 TUI 调色板。

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

请参阅 [Configuration: Env var substitution](/zh/gateway/configuration#env-var-substitution-in-config) 了解完整详情。

## 密钥引用与 `${ENV}` 字符串

OpenClaw 支持两种环境驱动的模式：

- 配置值中的 `${VAR}` 字符串替换。
- SecretRef 对象（`{ source: "env", provider: "default", id: "VAR" }`），用于支持密钥引用的字段。

两者都在激活时从进程环境解析。SecretRef 详情记录在 [Secrets Management](/zh/gateway/secrets) 中。

## 路径相关的环境变量

| Variable               | Purpose                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`        | 覆盖用于所有内部路径解析的主目录（`~/.openclaw/`、代理目录、会话、凭据）。当作为专用服务用户运行 OpenClaw 时很有用。 |
| `OPENCLAW_STATE_DIR`   | 覆盖状态目录（默认 `~/.openclaw`）。                                                                                                                            |
| `OPENCLAW_CONFIG_PATH` | 覆盖配置文件路径（默认 `~/.openclaw/openclaw.json`）。                                                                                                             |

## 日志记录

| Variable             | Purpose                                                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL` | 覆盖文件和控制台的日志级别（例如 `debug`、`trace`）。优先于配置中的 `logging.level` 和 `logging.consoleLevel`。无效值将被忽略并显示警告。 |

### `OPENCLAW_HOME`

设置后，`OPENCLAW_HOME` 将替换系统主目录（`$HOME` / `os.homedir()`）以进行所有内部路径解析。这为无头服务帐户启用了完整的文件系统隔离。

**优先级：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**示例**（macOS LaunchDaemon）：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/kira</string>
</dict>
```

`OPENCLAW_HOME` 也可以设置为波浪号路径（例如 `~/svc`），它会在使用前使用 `$HOME` 展开。

## 相关

- [Gateway configuration](/zh/gateway/configuration)
- [FAQ: env vars and .env loading](/zh/help/faq#env-vars-and-env-loading)
- [Models overview](/zh/concepts/models)
