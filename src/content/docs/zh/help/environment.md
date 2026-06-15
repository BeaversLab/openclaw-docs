---
summary: "OpenClawOpenClaw 从何处加载环境变量及其优先级顺序"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "环境变量"
---

OpenClaw 从多个来源获取环境变量。规则是**永不覆盖现有值**。
工作区 OpenClaw`.env`OpenClaw 文件是较低信任度的来源：在应用优先级之前，OpenClaw 会忽略工作区 `.env` 中的提供商凭据和受保护的运行时控制。

## 优先级（从高到低）

1. **进程环境**（即 Gateway(网关) 进程已从父 shell/daemon 获取的环境）。
2. **当前工作目录中的 `.env`**（dotenv 默认值；不覆盖；提供商凭据和受保护的运行时控制将被忽略）。
3. 位于 `~/.openclaw/.env` 的**全局 `.env`**（又名 `$OPENCLAW_STATE_DIR/.env`API；推荐用于提供商 API 密钥；不覆盖）。
4. `~/.openclaw/openclaw.json` 中的**配置 `env` 块**（仅在缺失时应用）。
5. **可选的登录 shell 导入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），仅针对缺失的预期键名应用。

在使用默认状态目录的全新 Ubuntu 安装中，OpenClaw 还会在全局 `.env`OpenClaw 之后将 OpenClaw`~/.config/openclaw/gateway.env` 作为兼容性回退方案。如果两个文件都存在且不一致，OpenClaw 将保留 `~/.openclaw/.env` 并打印警告。

如果完全缺少配置文件，则跳过第 4 步；但如果启用了 shell 导入，它仍会运行。

## 提供商凭据和工作区 `.env`

不要将提供商 API 密钥仅保存在工作区 API`.env`OpenClaw 中。OpenClaw 会忽略工作区 `.env` 文件中的提供商凭据环境变量，包括常见密钥，例如 `GEMINI_API_KEY`、`GOOGLE_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`GROQ_API_KEY`、`DEEPSEEK_API_KEY`、`PERPLEXITY_API_KEY`、`BRAVE_API_KEY`、`TAVILY_API_KEY`、`EXA_API_KEY` 和 `FIRECRAWL_API_KEY`。

请使用以下受信任的来源之一来存储提供商凭据：

- Gateway(网关) 进程环境，例如 Shell、launchd/systemd 单元、容器密钥或 CI 密钥。
- 位于 `~/.openclaw/.env` 或 `$OPENCLAW_STATE_DIR/.env` 的全局运行时 dotenv 文件。
- `~/.openclaw/openclaw.json` 中的 config `env` 块。
- 当启用 `env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1` 时，可选的登录 Shell 导入。

如果您之前仅在 workspace `.env` 中存储了提供商密钥，请将其移动到上述受信任的源之一。Workspace `.env` 仍然可以提供不属于凭据、端点重定向、主机覆盖或 `OPENCLAW_*` 运行时控件的普通项目变量。

有关安全基本原理，请参阅 [工作区 `.env` 文件](/zh/gateway/security#workspace-env-files)。

## Config `env` 块

设置内联环境变量的两种等效方式（两者均不覆盖现有值）：

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

Config `env` 块仅接受字面字符串值。它不扩展
`file:...` 值；例如，`XAI_API_KEY: "file:secrets/xai-api-key.txt"`
会按该确切的字符串传递给提供商。

对于基于文件的支持商密钥，请在支持它的凭据字段上使用 SecretRef：

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

有关受支持的字段，请参阅 [密钥管理](/zh/gateway/secrets) 和
[SecretRef 凭证接口](/zh/reference/secretref-credential-surface)。

## Shell env import

`env.shellEnv` 运行您的登录 Shell 并仅导入**缺失的**预期键名：

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

## Exec shell 快照

在非 Windows Gateway 主机上，bash 和 zsh WindowsGateway(网关)`exec` 命令默认使用启动快照。
在 Gateway 进程环境中设置 `OPENCLAW_EXEC_SHELL_SNAPSHOT=0`Gateway(网关) 可禁用此路径。
值 `false`、`no` 和 `off` 也会禁用它。每次调用的 `exec.env` 值无法切换
快照或重定向快照缓存。

## 运行时注入的环境变量

OpenClaw 还会将上下文标记注入到生成的子进程中：

- `OPENCLAW_SHELL=exec`：为通过 `exec` 工具运行的命令设置。
- `OPENCLAW_SHELL=acp`：为 ACP 运行时后端进程生成设置（例如 `acpx`）。
- `OPENCLAW_SHELL=acp-client`：当 `openclaw acp client` 生成 ACP 网桥进程时为其设置。
- `OPENCLAW_SHELL=tui-local`TUI：为本地 TUI `!` shell 命令设置。
- `OPENCLAW_CLI=1`CLI：为由 CLI 入口点生成的子进程设置。

这些是运行时标记（不是必需的用户配置）。它们可以在 shell/profile 逻辑中
使用，以应用特定于上下文的规则。

## UI 环境变量

- `OPENCLAW_THEME=light`TUI：当您的终端具有浅色背景时，强制使用浅色 TUI 调色板。
- `OPENCLAW_THEME=dark`TUI：强制使用深色 TUI 调色板。
- `COLORFGBG`OpenClawTUI：如果您的终端导出了它，OpenClaw 将使用背景颜色提示自动选择 TUI 调色板。

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

有关完整详细信息，请参阅[配置：环境变量替换](/zh/gateway/configuration-reference#env-var-substitution)。

## Secret 引用与 `${ENV}` 字符串

OpenClaw 支持两种由环境变量驱动的模式：

- 配置值中的 `${VAR}` 字符串替换。
- 用于支持 secret 引用字段的 SecretRef 对象 (`{ source: "env", provider: "default", id: "VAR" }`)。

两者均在激活时从进程环境中解析。SecretRef 的详细信息记录在 [Secret 管理](/zh/gateway/secrets) 中。
配置 `env` 块本身不解析 SecretRef 或 `file:...`
简写值。

## 路径相关的环境变量

| 变量                     | 用途                                                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`          | 覆盖用于内部 OpenClaw 路径默认值的主目录 (OpenClaw`~/.openclaw/`OpenClaw、代理目录、会话、凭据、安装程序新手引导和默认开发检出)。当作为专用服务用户运行 OpenClaw 时非常有用。 |
| `OPENCLAW_STATE_DIR`     | 覆盖状态目录（默认 `~/.openclaw`）。                                                                                                                                          |
| `OPENCLAW_CONFIG_PATH`   | 覆盖配置文件路径（默认 `~/.openclaw/openclaw.json`）。                                                                                                                        |
| `OPENCLAW_INCLUDE_ROOTS` | 目录路径列表，其中 `$include` 指令可以解析配置目录之外的文件（默认：无 —— `$include` 仅限于配置目录）。支持波浪号扩展。                                                       |

## 日志记录

| 变量                             | 用途                                                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL`             | 覆盖文件和控制台的日志级别（例如 `debug`、`trace`）。优先级高于配置中的 `logging.level` 和 `logging.consoleLevel`。无效值将被忽略并发出警告。 |
| `OPENCLAW_DEBUG_MODEL_TRANSPORT` | 在 `info` 级别发出针对模型的请求/响应计时诊断信息，而无需启用全局调试日志。                                                                   |
| `OPENCLAW_DEBUG_MODEL_PAYLOAD`   | 模型负载诊断：`summary`、`tools` 或 `full-redacted`。`full-redacted` 已被限制并编辑，但可能包含提示词/消息文本。                              |
| `OPENCLAW_DEBUG_SSE`             | 流式传输诊断：`events` 用于首次/完成计时，`peek` 用于包含前五个已编辑的 SSE 事件。                                                            |
| `OPENCLAW_DEBUG_CODE_MODE`       | 代码模式模型表面诊断，包括提供商工具隐藏以及仅执行/等待强制执行。                                                                             |

### `OPENCLAW_HOME`

设置后，`OPENCLAW_HOME` 将替换系统主目录（`$HOME` / `os.homedir()`OpenClaw）作为 OpenClaw 内部路径的默认值。这包括默认状态目录、配置路径、代理目录、凭据、安装程序新手引导工作区，以及 `openclaw update --channel dev` 使用的默认开发检出目录。

**优先级：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > Termux `PREFIX`Android Android 上的主目录回退 > `os.homedir()`

**示例**（macOS LaunchDaemon）：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` 也可以设置为波浪号路径（例如 `~/svc`），该路径在使用前会使用相同的操作系统主目录回退链进行展开。

显式路径变量（如 `OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH` 和 `OPENCLAW_GIT_DIR`）仍然具有优先权。操作系统账户任务（例如 shell 启动文件检测、包管理器设置和主机 `~` 展开）可能仍会使用真实的系统主目录。

## nvm 用户：web_fetch TLS 失败

如果 Node.js 是通过 **nvm**（而非系统包管理器）安装的，内置的 Node.js`fetch()` 将使用
nvm 捆绑的 CA 存储，该存储可能缺少现代根 CA（例如 Let's Encrypt 的 ISRG Root X1/X2、
DigiCert Global Root G2 等）。这会导致 `web_fetch` 在大多数 HTTPS 站点上失败并报 `"fetch failed"` 错误。

在 Linux 上，OpenClaw 会自动检测 nvm 并在实际的启动环境中应用修复：

- `openclaw gateway install` 将 `NODE_EXTRA_CA_CERTS` 写入 systemd 服务环境
- `openclaw` CLI 入口点会在 Node 启动前重新执行自身并设置 `NODE_EXTRA_CA_CERTS`

**手动修复（针对旧版本或直接 `node ...` 启动）：**

在启动 OpenClaw 之前导出该变量：

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

不要依赖仅将此变量写入 `~/.openclaw/.env`；Node 在进程启动时读取
`NODE_EXTRA_CA_CERTS`。

## 旧版环境变量

OpenClaw 仅读取 `OPENCLAW_*` 环境变量。来自早期版本的旧版
`CLAWDBOT_*` 和 `MOLTBOT_*` 前缀会被静默
忽略。

如果在启动时 Gateway(网关) 进程上仍然设置了任何此类变量，OpenClaw 会发出
一个 Node 弃用警告 (`OPENCLAW_LEGACY_ENV_VARS`)，列出
检测到的前缀和总数。通过将
旧前缀替换为 `OPENCLAW_` 来重命名每个值（例如 `CLAWDBOT_GATEWAY_TOKEN` →
`OPENCLAW_GATEWAY_TOKEN`）；旧名称将不会生效。

## 相关

- [Gateway(网关) 配置](/zh/gateway/configuration)
- [常见问题：环境变量和 .env 加载](/zh/help/faq#env-vars-and-env-loading)
- [模型概述](/zh/concepts/models)
