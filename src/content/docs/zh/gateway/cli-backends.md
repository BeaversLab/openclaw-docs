---
summary: "CLICLICLI 后端：带有可选 MCP 工具桥接的本地 AI CLI 回退"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "CLICLI 后端"
---

当 API 提供商宕机、限流或暂时出现异常行为时，OpenClaw 可以将 **本地 AI CLIs** 作为 **纯文本回退方案**运行。这是一种刻意的保守设计：

- **OpenClaw 工具不会直接注入**，但具有 OpenClaw`bundleMcp: true` 的后端
  可以通过回环 MCP 桥接接收网关工具。
- 针对支持该功能的 CLIs 提供 **JSONL 流式传输**。
- **支持会话**（以便后续对话保持连贯）。
- **如果 CLI 接受图片路径，图片可以透传**。

这被设计为一个**安全网**，而非主要路径。当你想要“始终可用”的文本响应而不依赖外部 API 时使用它。

如果您想要一个包含 ACP 会话控制、后台任务、
线程/对话绑定和持久化外部编码会话的完整 harness 运行时，请
改用 [ACP Agents](/zh/tools/acp-agentsCLI)。CLI 后端不是 ACP。

<Tip>正在构建新的后端插件？请使用 [CLI 后端插件](CLI/en/plugins/cli-backend-plugins)。此页面专供 配置和操作已注册后端的用户使用。</Tip>

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

如果您在网关主机上使用捆绑的 CLI 后端作为
**主要消息提供商**，当您的配置
在模型引用中或在 CLIOpenClaw`agents.defaults.cliBackends` 下明确引用该后端时，
OpenClow 现在会自动加载拥有该后端的捆绑插件。

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

- 如果您使用 `agents.defaults.models`CLI（允许列表），则必须也将您的 CLI 后端模型包含在内。
- 如果主提供商失败（身份验证、速率限制、超时），OpenClaw 将
  接下来尝试 CLI 后端。

## 配置概览

所有 CLI 后端都位于：

```
agents.defaults.cliBackends
```

每个条目以一个 **提供商 id**（例如 `claude-cli`、`my-cli`）作为键。
提供商 id 将成为您模型引用的左侧部分：

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

1. **选择后端**基于提供商前缀（`claude-cli/...`）。
2. 使用相同的 OpenClaw 提示 + 工作区上下文**构建系统提示**。
3. **执行 CLI** 并带有会话 id（如果支持），以便历史记录保持一致。
   捆绑的 CLI`claude-cli`OpenClaw 后端会在每个
   OpenClaw 会话中保持一个 Claude stdio 进程存活，并通过 stream- stdin 发送后续轮次。
4. **解析输出**（JSON 或纯文本）并返回最终文本。
5. **按后端持久化会话 ID**，以便后续回复重用同一个 CLI 会话。

<Note>捆绑的 Anthropic `claude-cli` 后端再次受到支持。Anthropic 员工 告诉我们，OpenClaw 风格的 Claude CLI 使用再次被允许，因此 OpenClaw 将 `claude -p` 使用视为对此集成经过批准，除非 Anthropic 发布 新政策。</Note>

捆绑的 Anthropic `claude-cli` 后端更喜欢 Claude Code 的原生技能
解析器来解析 OpenClaw 技能。当当前技能快照包含至少
一个具有具体化路径的已选技能时，OpenClaw 会传递一个带有 `--plugin-dir` 的临时 Claude
Code 插件，并从附加的系统提示中省略重复的 OpenClaw 技能目录。
如果快照没有具体化的插件
技能，OpenClaw 会保留提示目录作为后备。技能 env/API 密钥
覆盖仍然由 OpenClaw 应用于该运行的子进程环境。

Claude CLI 也有其自己的非交互式权限模式。OpenClaw 将其
映射到现有的 exec 策略，而不是添加特定于 Claude 的策略配置。
对于 OpenClaw 托管的 Claude 实时会话，有效的 OpenClaw exec 策略是
权威的：YOLO (`tools.exec.security: "full"` 和
`tools.exec.ask: "off"`) 使用
`--permission-mode bypassPermissions` 启动 Claude，而限制性的有效 exec 策略
使用 `--permission-mode default` 启动 Claude。每个代理的
`agents.list[].tools.exec` 设置会覆盖该代理的全局 `tools.exec`。
原始 Claude 后端参数可能仍包含 `--permission-mode`，但实时
Claude 启动会将该标志标准化以匹配有效的 OpenClaw exec 策略。

内置的 Anthropic Anthropic`claude-cli`OpenClaw 后端还将 OpenClaw `/think` 级别映射到 Claude Code 原生的 `--effort` 标志（针对非“关闭”级别）。`minimal` 和
`low` 映射为 `low`，`adaptive` 和 `medium` 映射为 `medium`，而 `high`、
`xhigh` 和 `max`CLI 则直接映射。其他 CLI 后端需要其所属插件声明等效的 argv 映射器，`/think`CLI 才能影响生成的 CLI。

OpenClaw 要使用内置的 OpenClaw`claude-cli` 后端之前，Claude Code 本身必须
先在同一主机上登录：

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

仅当 `claude`
二进制文件尚不在 `PATH` 上时，才使用 `agents.defaults.cliBackends.claude-cli.command`。

## 会话

- 如果 CLI 支持会话，请设置 CLI`sessionArg`（例如 `--session-id`）或
  `sessionArgs`（占位符 `{sessionId}`），以便在需要将 ID
  插入到多个标志时使用。
- 如果 CLI 使用带有不同标志的 **恢复子命令**，请设置
  CLI`resumeArgs`（恢复时替换 `args`）以及可选的 `resumeOutput`
  （用于非 JSON 恢复）。
- `sessionMode`：
  - `always`：始终发送会话 ID（如果未存储则发送新的 UUID）。
  - `existing`：仅当之前存储过会话 ID 时才发送。
  - `none`：从不发送会话 ID。
- `claude-cli` 默认为 `liveSession: "claude-stdio"`、`output: "jsonl"`
  和 `input: "stdin"`，因此后续轮次会在其处于活动状态时重用实时 Claude 进程。Warm stdio 现在是默认设置，包括省略传输字段的自定义配置。如果 Gateway(网关) 重启或空闲进程
  退出，OpenClaw 会从存储的 Claude 会话 ID 恢复。恢复前，存储的会话
  ID 会根据现有的可读项目脚本进行验证，因此虚设绑定会被 `reason=transcript-missing` 清除，
  而不是在 `--resume` 下静默启动一个新的 Claude CLI 会话。
- Claude 实时会话保持有界的 JSONL 输出保护。默认每轮最多允许
  8 MiB 和 20,000 行原始 JSONL 行。重度使用工具的 Claude 轮次可以通过
  `agents.defaults.cliBackends.claude-cli.reliability.outputLimits.maxTurnRawChars`
  和 `maxTurnLines` 为每个后端提高这些限制；OpenClaw 会将这些设置限制在 64 MiB 和 100,000
  行。
- 存储的 CLI 会话是提供商拥有的连续性。隐式的每日会话
  重置不会中断它们；`/reset` 和显式的 `session.reset` 策略仍然
  会。
- 新的 CLI 会话通常仅从 OpenClaw 的压缩摘要
  以及压缩后的尾部重新播种。为了恢复在压缩之前失效的短会话，
  后端可以通过 `reseedFromRawTranscriptWhenUncompacted: true` 选择加入。OpenClaw 仍然保持原始
  脚本重新播种的边界，并将其限制在安全的失效情况，例如缺少
  CLI 脚本、系统提示/MCP 更改或会话过期的重试；身份验证
  配置文件或凭据纪元的更改绝不会重新播种原始脚本历史。

序列化说明：

- `serialize: true` 保持同通道运行的有序性。
- 大多数 CLI 在一个提供商车道上进行序列化。
- 当所选的身份验证身份发生更改时，OpenClaw 会放弃存储的 CLI 会话重用，包括更改的身份验证配置文件 ID、静态 API 密钥、静态令牌，或当 CLI 公开时的 OAuth 帐户身份。OAuth 访问和刷新令牌轮换不会切断存储的 CLI 会话。如果 CLI 不公开稳定的 OAuth 帐户 ID，OpenClaw 会让该 CLI 强制执行恢复权限。

## 来自 claude-cli 会话的回退前奏

当 `claude-cli` 尝试在 [`agents.defaults.model.fallbacks`](/zh/concepts/model-failoverCLI) 中故障转移到非 OpenClaw 候选项时，OpenClaw 会使用从 Claude Code 位于 `~/.claude/projects/`OpenClaw 的本地 JSONL 转录中提取的上下文前导，为下一次尝试提供种子。如果没有此种子，备用 提供商将冷启动，因为对于 `claude-cli` 运行，OpenClaw 自身的 会话转录是空的。

- 前导优先使用最新的 `/compact` 摘要或 `compact_boundary` 标记，然后追加最新的边界后轮次，直至达到字符预算。边界前的轮次会被丢弃，因为摘要已经代表了它们。
- 工具块会被合并以压缩 `(tool call: name)` 和 `(tool result: …)` 提示，从而诚实地控制提示预算。如果摘要溢出，则会被标记为 `(truncated)`。
- 同一 提供商的 `claude-cli` 到 `claude-cli` 故障转移依赖于 Claude 自身的 `--resume` 并跳过前导。
- 种子重用现有的 Claude 会话文件路径验证，因此无法读取任意路径。

## 图像（透传）

如果您的 CLI 接受图像路径，请设置 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 会将 base64 图像写入临时文件。如果设置了 OpenClaw`imageArg`，这些路径将作为 CLI 参数传递。如果缺少 `imageArg`OpenClaw，OpenClaw 会将文件路径追加到提示（路径注入），这对于可以从普通路径自动加载本地文件的 CLI 来说已经足够了。

## 输入 / 输出

- `output: "json"`（默认）尝试解析 JSON 并提取文本和 会话 ID。
- 对于 Gemini CLIOpenClaw JSON 输出，当 `usage` 缺失或为空时，OpenClaw 会从 `response` 读取回复文本，并从 `stats` 读取使用情况。
- `output: "jsonl"` 解析 JSONL 流并提取最终的代理消息以及 会话 标识符（如果存在）。
- `output: "text"` 将 stdout 视为最终响应。

输入模式：

- `input: "arg"`CLI（默认）将提示词作为最后一个 CLI 参数传递。
- `input: "stdin"` 通过 stdin 发送提示词。
- 如果提示词非常长并且设置了 `maxPromptArgChars`，则使用 stdin。

## 默认值（插件所有）

捆绑的 CLI 后端默认值归其所属插件所有。例如，Anthropic 拥有 CLIAnthropic`claude-cli`，Google 拥有 `google-gemini-cli`OpenAI。OpenAI Codex 智能体运行通过 `openai/*`OpenClaw 使用 Codex 应用服务器线束；OpenClaw 不再注册捆绑的 `codex-cli` 后端。

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

前提条件：必须安装本地 Gemini CLI 并且作为 CLI`gemini` 在 `PATH`（`brew install gemini-cli` 或 `npm install -g @google/gemini-cli`）上可用。

Gemini CLI JSON 说明：

- 回复文本从 JSON `response` 字段中读取。
- 当 `usage` 缺失或为空时，使用情况回退到 `stats`。
- `stats.cached`OpenClaw 被规范化为 OpenClaw `cacheRead`。
- 如果缺少 `stats.input`OpenClaw，OpenClaw 会从 `stats.input_tokens - stats.cached` 推导输入 token。

仅在需要时覆盖（通常为绝对 `command` 路径）。

## 插件拥有的默认值

CLI 后端默认设置现在是插件界面的一部分：

- 插件通过 `api.registerCliBackend(...)` 注册它们。
- 后端 `id` 会成为模型引用中的提供商前缀。
- `agents.defaults.cliBackends.<id>` 中的用户配置仍然会覆盖插件的默认值。
- 特定于后端的配置清理工作通过可选的 `normalizeConfig` 钩子由插件负责。

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

`input`CLI 重写传递给 CLI 的系统提示词和用户提示词。`output`OpenClaw 在 OpenClaw 处理其自己的控制标记和渠道交付之前，重写流式传输的助手增量和解析后的最终文本。

对于发出 Claude Code stream- 兼容 JSONL 的 CLI，请在该后端的配置中设置 `jsonlDialect: "claude-stream-json"`。

## 原生压缩所有权

某些 CLI 后端运行一个代理来压缩其**自己的**对话记录，因此 OpenClaw 必须不对它们运行其保护摘要器 - 这样做会与后端自己的压缩机制冲突，并可能导致此回合严重失败。

`claude-cli` 没有工具端点 - Claude Code 在内部进行压缩 - 因此它声明 `ownsNativeCompaction: true`OpenClaw，并且 OpenClaw 从压缩路径返回一个空操作。像 Codex 这样的原生工具会话仍然继续路由到它们的工具压缩端点。

由于后端拥有压缩权，为了防止 OpenClaw 的保护机制在 claude-cli 会话上触发而设置 `contextTokens: 1_000_000`OpenClaw 的旧权宜之计**不再需要** - 退出选项取代了它。

```typescript
api.registerCliBackend({ id: "my-cli", ownsNativeCompaction: true /* ... */ });
```

仅为真正拥有其压缩权的后端声明 `ownsNativeCompaction`：它必须在接近其上下文窗口时可靠地限制其自己的对话记录，并持久化一个可恢复的会话（例如 `--resume` / `--session-id`）；否则，延迟的会话可能会超出预算。匹配 `agentHarnessId` 的会话仍然路由到工具端点。

## 捆绑 MCP 覆盖层

CLI 后端**不**直接接收 OpenClaw 工具调用，但后端可以通过 CLIOpenClaw`bundleMcp: true` 选择加入生成的 MCP 配置覆盖层。

当前的捆绑行为：

- `claude-cli`：生成的严格 MCP 配置文件
- `google-gemini-cli`：生成的 Gemini 系统设置文件

当启用捆绑 MCP 时，OpenClaw：

- 生成一个回环 HTTP MCP 服务器，向 CLI 进程暴露网关工具
- 使用每个会话的令牌（`OPENCLAW_MCP_TOKEN`）对桥接进行身份验证
- 将工具访问范围限定在当前会话、账户和渠道上下文
- 为当前工作区加载已启用的捆绑 MCP 服务器
- 将它们与任何现有的后端 MCP 配置/设置形状合并
- 使用来自所属扩展的后端拥有的集成模式重写启动配置

如果未启用任何 MCP 服务器，当后端选择加入捆绑 MCP 时，OpenClaw 仍会注入严格配置，以保持后台运行的隔离性。

会话范围的捆绑 MCP 运行时会被缓存以在会话内重用，然后在空闲 `mcp.sessionIdleTtlMs` 毫秒后回收（默认 10 分钟；设置 `0` 可禁用）。一次性嵌入式运行（如身份验证探测、slug 生成和运行结束时的活动内存回忆请求清理）会进行清理，以确保 stdio 子进程和可流式 HTTP/SSE 流不会在运行结束后继续存在。

## 重种历史上限

当从先前的 OpenClaw 记录为新的 CLI 会话进行重种时（例如在 CLIOpenClaw`session_expired` 重试后），渲染的 `<conversation_history>` 块会被限制，以防止重种提示膨胀。默认值为 `12288` 个字符（约 3000 个 token）。

Claude CLI 后端会自动使用从解析出的 Claude 上下文层级派生的较大上限。标准的 200K token Claude 运行保留较大的记录片段，而 1M token Claude 运行保留的片段更大，而其他 CLI 后端则保持保守的默认值。

- 该上限仅控制重种提示的先前历史块。实时会话输出限制在 `reliability.outputLimits` 下单独调整（参见 [会话](#sessions)）。

## 局限性

- **无直接 OpenClaw 工具调用。** OpenClaw 不会将工具调用注入到
  CLI 后端协议中。后端只有在选择加入
  OpenClawOpenClawCLI`bundleMcp: true` 时，才能看到 Gateway 工具。
- **流式传输取决于后端。** 某些后端流式传输 JSONL；其他后端则缓冲
  直到退出。
- **结构化输出**取决于 CLI 的 JSON 格式。

## 故障排查

- **找不到 CLI**：将 CLI`command` 设置为完整路径。
- **模型名称错误**：使用 `modelAliases` 映射 `provider/model`CLI → CLI 模型。
- **无会话连续性**：确保已设置 `sessionArg` 且 `sessionMode` 未
  设置为 `none`。
- **忽略图片**：设置 `imageArg`CLI（并验证 CLI 是否支持文件路径）。

## 相关内容

- [Gateway 操作手册](<Gateway(网关)/en/gateway>)
- [本地模型](/zh/gateway/local-models)
