---
summary: "OpenClawOpenClaw 从何处加载环境变量及其优先级顺序"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "环境变量"
---

OpenClaw 从多个来源获取环境变量。规则是 **绝不覆盖现有值**。

## 优先级（从高到低）

1. **进程环境**（即 Gateway(网关) 进程已从父 shell/daemon 获取的环境）。
2. **当前工作目录中的 `.env`**（dotenv 默认值；不会覆盖）。
3. `~/.openclaw/.env` 处的**全局 `.env`**（也称为 `$OPENCLAW_STATE_DIR/.env`；不会覆盖）。
4. `~/.openclaw/openclaw.json` 中的**Config `env` 块**（仅在缺失时应用）。
5. **可选的 login-shell 导入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），仅针对缺失的预期键名应用。

在使用默认状态目录的全新 Ubuntu 安装上，OpenClaw 还将 OpenClaw`~/.config/openclaw/gateway.env` 视为全局 `.env`OpenClaw 之后的兼容性后备。如果两个文件都存在且内容不一致，OpenClaw 将保留 `~/.openclaw/.env` 并打印警告。

如果完全缺少配置文件，则跳过第 4 步；但如果启用了 shell 导入，它仍会运行。

## Config `env` 块

设置内联环境变量的两种等效方法（两者均不覆盖）：

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

配置 `env` 块仅接受字面字符串值。它不会展开
`file:...` 值；例如，`XAI_API_KEY: "file:secrets/xai-api-key.txt"`
将按该确切字符串传递给提供商。

对于基于文件的提供商密钥，请在支持该功能的凭据字段上使用 SecretRef：

```json5
{
  secrets: {
    providers: {
      xai_key_file: {
        source: "file",
        path: "~/.openclaw/secrets/xai-api-key.txt",
        mode: "singleValue",
      },
    },
  },
  models: {
    providers: {
      xai: {
        apiKey: { source: "file", provider: "xai_key_file", id: "value" },
      },
    },
  },
}
```

请参阅[密钥管理](/zh/gateway/secrets)和[SecretRef 凭据界面](/zh/reference/secretref-credential-surface)以了解受支持的字段。

## Shell env 导入

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

## 运行时注入的环境变量

OpenClaw 还会将上下文标记注入到生成的子进程中：

- `OPENCLAW_SHELL=exec`：为通过 `exec` 工具运行的命令设置。
- `OPENCLAW_SHELL=acp`：为 ACP 运行时后端进程生成设置（例如 `acpx`）。
- `OPENCLAW_SHELL=acp-client`：在生成 ACP 网桥进程时为 `openclaw acp client` 设置。
- `OPENCLAW_SHELL=tui-local`TUI：为本地 TUI `!` Shell 命令设置。
- `OPENCLAW_CLI=1`CLI：为由 CLI 入口点生成的子进程设置。

这些是运行时标记（非必需的用户配置）。它们可以在 shell/profile 逻辑中使用，以应用特定于上下文的规则。

## UI 环境变量

- `OPENCLAW_THEME=light`TUI：当您的终端具有浅色背景时，强制使用浅色 TUI 调色板。
- `OPENCLAW_THEME=dark`TUI：强制使用深色 TUI 调色板。
- `COLORFGBG`OpenClawTUI：如果您的终端导出了它，OpenClaw 将使用背景颜色提示来自动选择 TUI 调色板。

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

有关详细信息，请参阅[配置：环境变量替换](/zh/gateway/configuration-reference#env-var-substitution)。

## 密钥引用与 `${ENV}` 字符串

OpenClaw 支持两种由环境驱动的模式：

- 配置值中的 `${VAR}` 字符串替换。
- 用于支持密钥引用的字段的 SecretRef 对象 (`{ source: "env", provider: "default", id: "VAR" }`)。

两者均在激活时从进程环境解析。SecretRef 的详细信息记录在[密钥管理](/zh/gateway/secrets)中。
配置 `env` 块本身不解析 SecretRef 或 `file:...`
简写值。

## 路径相关的环境变量

| 变量                     | 用途                                                                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`          | 覆盖用于内部 OpenClaw 路径默认值的主目录（OpenClaw`~/.openclaw/`OpenClaw、代理目录、会话、凭据、安装程序引导以及默认开发签出）。当作为专用服务用户运行 OpenClaw 时非常有用。 |
| `OPENCLAW_STATE_DIR`     | 覆盖状态目录（默认 `~/.openclaw`）。                                                                                                                                         |
| `OPENCLAW_CONFIG_PATH`   | 覆盖配置文件路径（默认 `~/.openclaw/openclaw.json`）。                                                                                                                       |
| `OPENCLAW_INCLUDE_ROOTS` | 目录路径列表，`$include` 指令可在其中解析配置目录之外的文件（默认：无 —— `$include` 被限制在配置目录内）。支持波浪号展开。                                                   |

## 日志记录

| 变量                             | 用途                                                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL`             | 覆盖文件和控制台的日志级别（例如 `debug`、`trace`）。优先级高于配置中的 `logging.level` 和 `logging.consoleLevel`。无效值将被忽略并发出警告。 |
| `OPENCLAW_DEBUG_MODEL_TRANSPORT` | 在 `info` 级别发出针对性的模型请求/响应计时诊断信息，而无需启用全局调试日志。                                                                 |
| `OPENCLAW_DEBUG_MODEL_PAYLOAD`   | 模型负载诊断：`summary`、`tools` 或 `full-redacted`。`full-redacted` 会受到限制和编辑，但可能包含提示词/消息文本。                            |
| `OPENCLAW_DEBUG_SSE`             | 流式传输诊断：`events` 用于首次/完成计时，`peek` 用于包含前五个经过编辑的 SSE 事件。                                                          |
| `OPENCLAW_DEBUG_CODE_MODE`       | 代码模式模型层诊断，包括提供商工具隐藏以及仅执行/等待强制执行。                                                                               |

### `OPENCLAW_HOME`

设置后，`OPENCLAW_HOME` 将替换内部 OpenClaw 路径默认值的系统主目录（`$HOME` / `os.homedir()`OpenClaw）。这包括默认状态目录、配置路径、代理目录、凭据、安装程序新手引导工作区以及 `openclaw update --channel dev` 使用的默认开发检出目录。

**优先级：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > Android 上的 Termux `PREFIX`Android 主目录后备 > `os.homedir()`

**示例** (macOS LaunchDaemon)：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` 也可以设置为波浪号路径（例如 `~/svc`），该路径会在使用前通过相同的操作系统主目录回退链进行扩展。

显式路径变量（如 `OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH` 和 `OPENCLAW_GIT_DIR`）仍然具有优先权。操作系统账户任务，例如 shell 启动文件检测、包管理器设置和主机 `~` 扩展，可能仍会使用实际的系统主目录。

## nvm 用户：web_fetch TLS 失败

如果 Node.js 是通过 **nvm**（而非系统包管理器）安装的，则内置的 `fetch()` 使用 nvm 捆绑的 CA 存储库，该存储库可能缺少现代根 CA（例如 Let's Encrypt 的 ISRG Root X1/X2、DigiCert Global Root G2 等）。这会导致 `web_fetch` 在大多数 HTTPS 站点上因 `"fetch failed"` 而失败。

在 Linux 上，OpenClaw 会自动检测 nvm 并在实际的启动环境中应用修复：

- `openclaw gateway install` 将 `NODE_EXTRA_CA_CERTS` 写入 systemd 服务环境
- `openclaw` CLI 入口点会在 Node 启动前重新执行自身，并设置 `NODE_EXTRA_CA_CERTS`

**手动修复（适用于旧版本或直接 `node ...` 启动）：**

在启动 OpenClaw 之前导出该变量：

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

不要依赖仅将此变量写入 `~/.openclaw/.env`；Node 在进程启动时会读取 `NODE_EXTRA_CA_CERTS`。

## 旧版环境变量

OpenClaw 仅读取 `OPENCLAW_*` 环境变量。早期版本中的旧版 `CLAWDBOT_*` 和 `MOLTBOT_*` 前缀将被静默忽略。

如果在启动时 Gateway 进程上仍然设置了任何旧值，OpenClaw 将发出一个单一的 Node 弃用警告 (Gateway(网关)OpenClaw`OPENCLAW_LEGACY_ENV_VARS`)，其中列出了检测到的前缀和总数。请通过用 `OPENCLAW_` 替换旧前缀来重命名每个值（例如 `CLAWDBOT_GATEWAY_TOKEN` → `OPENCLAW_GATEWAY_TOKEN`）；旧名称将不再生效。

## 相关

- [Gateway 配置](<Gateway(网关)/en/gateway/configuration>)
- [常见问题：环境变量和 .env 加载](/zh/help/faq#env-vars-and-env-loading)
- [模型概述](/zh/concepts/models)
