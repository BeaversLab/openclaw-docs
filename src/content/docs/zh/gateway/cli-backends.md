---
summary: "CLI 后端：支持可选 MCP 工具桥接的本地 AI CLI 回退方案"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "CLI 后端"
---

当 API 提供商宕机、限流或暂时出现异常行为时，OpenClaw 可以将 **本地 AI CLIs** 作为 **纯文本回退方案**运行。这是一种刻意的保守设计：

- **OpenClaw 工具不会直接注入**，但带有 `bundleMcp: true` 的后端可以通过回环 MCP 网桥接收网关工具。
- 针对支持该功能的 CLIs 提供 **JSONL 流式传输**。
- **支持会话**（以便后续对话保持连贯）。
- **如果 CLI 接受图片路径，图片可以透传**。

这被设计为一个**安全网**，而非主要路径。当你想要“始终可用”的文本响应而不依赖外部 API 时使用它。

如果您想要一个包含 ACP 会话控制、后台任务、线程/对话绑定以及持久化外部编码会话的完整 harness 运行时，请改用 [ACP Agents](/zh/tools/acp-agentsCLI)。CLI 后端不是 ACP。

<Tip>正在构建新的后端插件？请使用 [CLI 后端插件](CLI/en/plugins/cli-backend-plugins)。本页面适用于配置和操作已注册后端的用户。</Tip>

## 新手快速入门

您可以在**无需任何配置**的情况下使用 Claude Code CLI（捆绑的 Anthropic 插件会注册一个默认后端）：

```bash
openclaw agent --message "hi" --model claude-cli/claude-sonnet-4-6
```

如果你的网关在 launchd/systemd 下运行且 PATH 极小，只需添加命令路径：

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
      },
    },
  },
}
```

就是这样。除了 CLI 本身之外，不需要密钥或额外的身份验证配置。

如果您在网关主机上使用捆绑的 CLI 后端作为**主要消息提供商**，当您的配置在模型引用中或 `agents.defaults.cliBackends` 下明确引用该后端时，OpenClaw 现在会自动加载拥有该后端的捆绑插件。

## 将其用作后备

将一个 CLI 后端添加到你的后备列表中，以便它仅在主模型失败时运行：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["claude-cli/claude-sonnet-4-6"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "claude-cli/claude-sonnet-4-6": {},
      },
    },
  },
}
```

注意：

- 如果您使用 `agents.defaults.models`（允许列表），您也必须在其中包含您的 CLI 后端模型。
- 如果主提供商失败（身份验证、速率限制、超时），OpenClaw 将
  接下来尝试 CLI 后端。

## 配置概览

所有 CLI 后端都位于：

```
agents.defaults.cliBackends
```

每个条目都由一个**提供商 ID**（例如 `claude-cli`、`my-cli`）作为键。
提供商 ID 会成为您模型引用的左侧部分：

```
<provider>/<model>
```

### 配置示例

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          input: "arg",
          modelArg: "--model",
          modelAliases: {
            "claude-opus-4-6": "opus",
            "claude-sonnet-4-6": "sonnet",
          },
          sessionArg: "--session",
          sessionMode: "existing",
          sessionIdFields: ["session_id", "conversation_id"],
          systemPromptArg: "--system",
          // For CLIs with a dedicated prompt-file flag:
          // systemPromptFileArg: "--system-file",
          // Codex-style CLIs can point at a prompt file instead:
          // systemPromptFileConfigArg: "-c",
          // systemPromptFileConfigKey: "model_instructions_file",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          // Opt in only if this backend may reseed safe invalidated sessions
          // from bounded raw OpenClaw transcript history before compaction.
          reseedFromRawTranscriptWhenUncompacted: true,
          serialize: true,
        },
      },
    },
  },
}
```

## 工作原理

1. 根据提供商前缀（`claude-cli/...`）**选择后端**。
2. 使用相同的 OpenClaw 提示 + 工作区上下文**构建系统提示**。
3. **执行 CLI** 并附带会话 ID（如果支持），以保持历史记录一致。
   捆绑的 `claude-cli` 后端会为每个
   OpenClaw 会话保持一个 Claude stdio 进程处于活动状态，并通过 stream- stdin 发送后续轮次。
4. **解析输出**（JSON 或纯文本）并返回最终文本。
5. **按后端持久化会话 ID**，以便后续回复重用同一个 CLI 会话。

<Note>捆绑的 Anthropic `claude-cli` 后端再次受到支持。Anthropic 工作人员 告知我们，再次允许使用 OpenClaw 风格的 Claude CLI，因此除非 OpenClaw 发布 新政策，否则 Anthropic 将 `claude -p` 的使用视为获得此集成的认可。</Note>

内置的 Anthropic Anthropic`claude-cli`OpenClawOpenClaw 后端倾向于使用 Claude Code 的原生技能解析器来处理 OpenClaw 技能。当当前技能快照包含至少一个具有实体化路径的已选技能时，OpenClaw 会传递一个带有 `--plugin-dir`OpenClawOpenClawAPIOpenClaw 的临时 Claude Code 插件，并从附加的系统提示词中省略重复的 OpenClaw 技能目录。如果快照没有实体化的插件技能，OpenClaw 会保留提示词目录作为后备。技能环境变量/API 密钥覆盖仍由 OpenClaw 应用于该次运行的子进程环境。

Claude CLI 也有自己的非交互式权限模式。OpenClaw 将其映射到现有的执行策略，而不是添加特定于 Claude 的策略配置。对于由 OpenClaw 管理的 Claude 实时会话，有效的 OpenClaw 执行策略具有权威性：YOLO（CLIOpenClawOpenClawOpenClaw`tools.exec.security: "full"` 和 `tools.exec.ask: "off"`）会使用 `--permission-mode bypassPermissions` 启动 Claude，而限制性的有效执行策略会使用 `--permission-mode default` 启动 Claude。每个代理的 `agents.list[].tools.exec` 设置会覆盖该代理的全局 `tools.exec`。原始的 Claude 后端参数可能仍包含 `--permission-mode`OpenClaw，但实时 Claude 启动会将该标志规范化以匹配有效的 OpenClaw 执行策略。

捆绑的 Anthropic `claude-cli` 后端还将 OpenClaw `/think` 级别
映射到 Claude Code 原生的 `--effort` 标志（针对非关闭级别）。`minimal` 和
`low` 映射到 `low`，`adaptive` 和 `medium` 映射到 `medium`，而 `high`、
`xhigh` 和 `max` 直接映射。其他 CLI 后端需要其所属插件
声明等效的 argv 映射器，然后 `/think` 才能影响已生成的 CLI。

在 OpenClaw 可以使用捆绑的 `claude-cli` 后端之前，Claude Code 本身
必须已在同一主机上登录：

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

仅当 `claude` 二进制文件
尚未位于 `PATH` 上时，才使用 `agents.defaults.cliBackends.claude-cli.command`。

## 会话

- 如果 CLI 支持会话，请设置 `sessionArg`（例如 `--session-id`）或
  `sessionArgs`（占位符 `{sessionId}`），以便在需要将 ID
  插入到多个标志时使用。
- 如果 CLI 使用具有不同标志的 **resume 子命令**，请设置
  `resumeArgs`（恢复时替换 `args`），并可选设置 `resumeOutput`
  （用于非 JSON 恢复）。
- `sessionMode`：
  - `always`：始终发送会话 ID（如果未存储，则为新 UUID）。
  - `existing`：仅当之前存储过会话 ID 时才发送。
  - `none`：从不发送会话 ID。
- `claude-cli` 默认为 `liveSession: "claude-stdio"`、`output: "jsonl"`
  和 `input: "stdin"`，因此在活动期间，后续轮次会重用活动的 Claude 进程。
  现在，热 stdio 是默认设置，包括省略传输字段的自定义配置。如果 Gateway(网关) 重启或空闲进程
  退出，OpenClaw 将从存储的 Claude 会话 ID 恢复。存储的会话
  ID 在恢复前会根据现有的可读项目记录进行验证，因此幻影绑定将被 `reason=transcript-missing` 清除，
  而不是在 `--resume` 下静默启动一个新的 Claude CLI 会话。
- Claude 实时会话保持有界的 JSONL 输出保护。默认设置允许每轮
  最多 8 MiB 和 20,000 行原始 JSONL 行。工具繁重的 Claude 轮次可以通过
  `agents.defaults.cliBackends.claude-cli.reliability.outputLimits.maxTurnRawChars`
  和 `maxTurnLines` 为每个后端提高这些限制；OpenClaw 会将这些设置限制在 64 MiB 和 100,000
  行。
- 存储的 CLI 会话是提供商拥有的连续性。隐式的每日会话
  重置不会中断它们；`/reset` 和显式的 `session.reset` 策
  策仍然会中断。
- 新的 CLI 会话通常仅从 OpenClaw 的压缩摘要
  和压缩后的尾部重新播种。为了恢复在压缩之前失效的短会话，
  后端可以通过 `reseedFromRawTranscriptWhenUncompacted: true` 选择加入。OpenClaw 仍然保持原始
  记录重新播种的有界性，并将其限制在安全失效范围内，例如丢失的
  CLI 记录、系统提示/MCP 更改或会话过期的重试；身份验证
  配置文件或凭据时期的更改永远不会重新播种原始记录历史。

序列化说明：

- `serialize: true` 保持同一通道的运行有序。
- 大多数 CLI 在一个提供商车道上进行序列化。
- 当所选的身份验证身份发生更改时，OpenClaw 会放弃存储的 CLI 会话重用，包括更改的身份验证配置文件 ID、静态 API 密钥、静态令牌，或当 CLI 公开时的 OAuth 帐户身份。OAuth 访问和刷新令牌轮换不会切断存储的 CLI 会话。如果 CLI 不公开稳定的 OAuth 帐户 ID，OpenClaw 会让该 CLI 强制执行恢复权限。

## 来自 claude-cli 会话的回退前奏

当 `claude-cli` 尝试在 [`agents.defaults.model.fallbacks`](/zh/concepts/model-failoverCLI) 中故障转移到非 OpenClaw 候选时，OpenClaw 会使用从 Claude Code 位于 `~/.claude/projects/`OpenClaw 的本地 JSONL 转录中提取的上下文前导来为下一次尝试做铺垫。如果没有这个种子，备用提供商将冷启动，因为 OpenClaw 自身的会话转录对于 `claude-cli` 运行来说是空的。

- 前导优先使用最新的 `/compact` 摘要或 `compact_boundary` 标记，然后追加最近的边界后轮次，直到达到字符预算。边界前的轮次会被丢弃，因为摘要已经代表了它们。
- 工具块被合并为紧凑的 `(tool call: name)` 和 `(tool result: …)` 提示，以保持提示预算的诚实。如果摘要溢出，则会标记为 `(truncated)`。
- 相同提供商的 `claude-cli` 到 `claude-cli` 故障转移依赖于 Claude 自己的 `--resume` 并跳过前导。
- 种子重用现有的 Claude 会话文件路径验证，因此无法读取任意路径。

## 图像（透传）

如果您的 CLI 接受图像路径，请设置 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 会将 base64 图像写入临时文件。如果设置了 OpenClaw`imageArg`，这些路径将作为 CLI 参数传递。如果缺少 `imageArg`OpenClaw，OpenClaw 会将文件路径追加到提示（路径注入）中，这对于能够从普通路径自动加载本地文件的 CLI 来说已经足够了。

## 输入 / 输出

- `output: "json"`（默认）尝试解析 JSON 并提取文本 + 会话 ID。
- 对于 Gemini CLIOpenClaw JSON 输出，当 `usage` 缺失或为空时，OpenClaw 会从 `response` 读取回复文本，并从 `stats` 读取使用情况。
- `output: "jsonl"` 解析 JSONL 流并在存在时提取最终的代理消息及会话标识符。
- `output: "text"` 将 stdout 视为最终响应。

输入模式：

- `input: "arg"`CLI （默认）将提示作为最后一个 CLI 参数传递。
- `input: "stdin"` 通过 stdin 发送提示。
- 如果提示非常长且设置了 `maxPromptArgChars`，则使用 stdin。

## 默认值（插件所有）

捆绑的 CLI 后端默认值归其所属插件所有。例如，Anthropic 拥有 CLIAnthropic`claude-cli`，Google 拥有 `google-gemini-cli`OpenAI。OpenAI Codex 代理运行通过 `openai/*`OpenClaw 使用 Codex 应用服务器工具；OpenClaw 不再注册捆绑的 `codex-cli` 后端。

捆绑的 Anthropic 插件为 Anthropic`claude-cli` 注册了一个默认值：

- `command: "claude"`
- `args: ["-p","--output-format","stream-json","--include-partial-messages","--verbose", ...]`
- `output: "jsonl"`
- `input: "stdin"`
- `modelArg: "--model"`
- `sessionMode: "always"`

捆绑的 Google 插件也为 `google-gemini-cli` 注册了一个默认值：

- `command: "gemini"`
- `args: ["--output-format", "json", "--prompt", "{prompt}"]`
- `resumeArgs: ["--resume", "{sessionId}", "--output-format", "json", "--prompt", "{prompt}"]`
- `imageArg: "@"`
- `imagePathScope: "workspace"`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

前提条件：必须安装本地 Gemini CLI 并在 `PATH` （`brew install gemini-cli` 或 `npm install -g @google/gemini-cli`）上作为 CLI`gemini` 可用。

Gemini CLI JSON 说明：

- 回复文本从 JSON `response` 字段读取。
- 当 `usage` 缺失或为空时，使用情况回退到 `stats`。
- `stats.cached`OpenClaw 被规范化为 OpenClaw `cacheRead`。
- 如果缺少 `stats.input`OpenClaw，OpenClaw 会从 `stats.input_tokens - stats.cached` 推导输入令牌。

仅在需要时覆盖（常见：绝对 `command` 路径）。

## 插件拥有的默认值

CLI 后端默认设置现在是插件界面的一部分：

- 插件使用 `api.registerCliBackend(...)` 注册它们。
- 后端 `id` 成为模型引用中的提供商前缀。
- `agents.defaults.cliBackends.<id>` 中的用户配置仍然会覆盖插件默认值。
- 特定于后端的配置清理通过可选的 `normalizeConfig` 钩子保持由插件拥有。

需要微小提示/消息兼容性垫片的插件可以声明双向文本转换，而无需替换提供商或 CLI 后端：

```typescript
api.registerTextTransforms({
  input: [
    { from: /red basket/g, to: "blue basket" },
    { from: /paper ticket/g, to: "digital ticket" },
    { from: /left shelf/g, to: "right shelf" },
  ],
  output: [
    { from: /blue basket/g, to: "red basket" },
    { from: /digital ticket/g, to: "paper ticket" },
    { from: /right shelf/g, to: "left shelf" },
  ],
});
```

`input` 重写传递给模型 CLI 的系统提示词和用户提示词。`output`
在 OpenClaw OpenClaw 处理其自己的控制标记和渠道传递之前，重写流式助手增量和解析后的最终文本。

对于发出兼容 Claude Code stream- 的 JSONL 的 CLI，请在该后端的配置中设置
`jsonlDialect: "claude-stream-json"`。

## 打包 MCP 覆盖层

CLI 后端**不**直接接收 OpenClaw 工具调用，但后端可以选择通过 CLIOpenClaw`bundleMcp: true` 获取生成的 MCP 配置覆盖层。

当前的打包行为：

- `claude-cli`：生成的严格 MCP 配置文件
- `google-gemini-cli`：生成的 Gemini 系统设置文件

当启用打包 MCP 时，OpenClaw 会：

- 生成一个回环 HTTP MCP 服务器，向 CLI 进程公开网关工具
- 使用每个会话的令牌（`OPENCLAW_MCP_TOKEN`）对网桥进行身份验证
- 将工具访问范围限定为当前会话、账户和渠道上下文
- 为当前工作区加载已启用的打包 MCP 服务器
- 将它们与任何现有的后端 MCP 配置/设置形状合并
- 使用来自所属扩展的后端拥有的集成模式重写启动配置

如果未启用 MCP 服务器，当后端选择加入打包 MCP 时，OpenClaw 仍会
注入严格配置，以使后台运行保持隔离。

会话作用域的捆绑 MCP 运行时会被缓存以在会话内重复使用，然后在空闲 `mcp.sessionIdleTtlMs` 毫秒（默认 10 分钟；设置 `0` 以禁用）后被回收。一次性嵌入式运行（如身份验证探测、slug 生成和活动记忆召回请求）会在运行结束时清理，以便 stdio 子进程和可流式 HTTP/SSE 流不会比运行存在得更久。

## 重新播种历史上限

当新的 CLI 会话从先前的 OpenClaw 记录中播种时（例如在 CLIOpenClaw`session_expired` 重试后），渲染的 `<conversation_history>` 块会受到限制，以防止重新播种提示词膨胀。默认为 `12288` 个字符（约 3000 个 token）。

Claude CLI 后端会自动使用根据解析出的 Claude 上下文层级得出的更大上限。标准的 200K token Claude 运行保留更大的记录切片，而 1M token Claude 运行保留更大的切片，而其他 CLI 后端则保持保守的默认值。

- 该上限仅控制重新生成提示词的历史记录块。实时会话输出限制在 `reliability.outputLimits` 下单独调整（请参阅 [会话](#sessions)）。

## 限制

- **无直接的 OpenClaw 工具调用。** OpenClaw 不会将工具调用注入到 CLI 后端协议中。仅当后端选择加入 OpenClawOpenClawCLI`bundleMcp: true` 时，才能看到 Gateway 工具。
- **流式传输取决于后端。** 某些后端流式传输 JSONL；其他后端则会缓冲直到退出。
- **结构化输出**取决于 CLI 的 JSON 格式。

## 故障排除

- **未找到 CLI**：将 CLI`command` 设置为完整路径。
- **模型名称错误**：使用 `modelAliases` 将 `provider/model`CLI 映射到 CLI 模型。
- **无会话连续性**：确保已设置 `sessionArg` 且 `sessionMode` 未设置为 `none`。
- **图片被忽略**：设置 `imageArg`CLI（并验证 CLI 是否支持文件路径）。

## 相关内容

- [Gateway 运维手册](<Gateway(网关)/en/gateway>)
- [本地模型](/zh/gateway/local-models)
