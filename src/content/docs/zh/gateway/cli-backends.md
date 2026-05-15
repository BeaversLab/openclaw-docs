---
summary: "CLI 后端：支持可选 MCP 工具桥接的本地 AI CLI 回退方案"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Codex CLI or other local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "CLI 后端"
---

当 API 提供商宕机、限流或暂时出现异常行为时，OpenClaw 可以将 **本地 AI CLIs** 作为 **纯文本回退方案**运行。这是一种刻意的保守设计：

- **OpenClaw 工具不会直接注入**，但带有 `bundleMcp: true` 的后端可以通过回环 MCP 桥接接收网关工具。
- 针对支持该功能的 CLIs 提供 **JSONL 流式传输**。
- **支持会话**（以便后续对话保持连贯）。
- **如果 CLI 接受图片路径，图片可以透传**。

这被设计为一个**安全网**，而非主要路径。当你想要“始终可用”的文本响应而不依赖外部 API 时使用它。

如果你想要一个具有 ACP 会话控制、后台任务、线程/对话绑定和持久化外部编码会话的完整工具运行时，请改用 [ACP Agents](/zh/tools/acp-agentsCLI)。CLI 后端不是 ACP。

<Tip>构建新的后端插件？使用 [CLI backend plugins](CLI/en/plugins/cli-backend-plugins)。本页面适用于配置和操作已注册后端的用户。</Tip>

## 新手快速入门

你可以**无需任何配置**使用 Codex CLI（捆绑的 OpenAI 插件注册了一个默认后端）：

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.5
```

如果你的网关在 launchd/systemd 下运行且 PATH 极小，只需添加命令路径：

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
        },
      },
    },
  },
}
```

就是这样。除了 CLI 本身之外，不需要密钥或额外的身份验证配置。

如果你在网关主机上将捆绑的 CLI 后端用作**主要消息提供商**，OpenClaw 现在会在你的配置在模型引用中或 CLIOpenClaw`agents.defaults.cliBackends` 下明确引用该后端时自动加载拥有它的捆绑插件。

## 将其用作后备

将一个 CLI 后端添加到你的后备列表中，以便它仅在主模型失败时运行：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["codex-cli/gpt-5.5"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "codex-cli/gpt-5.5": {},
      },
    },
  },
}
```

注意：

- 如果你使用 `agents.defaults.models`CLI（允许列表），你也必须在那里包含你的 CLI 后端模型。
- 如果主提供商失败（身份验证、速率限制、超时），OpenClaw 将
  接下来尝试 CLI 后端。

## 配置概览

所有 CLI 后端都位于：

```
agents.defaults.cliBackends
```

每个条目都由一个**提供商 id** 键控（例如 `codex-cli`, `my-cli`）。
提供商 id 成为你的模型引用的左侧：

```
<provider>/<model>
```

### 配置示例

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
        },
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

1. 根据提供商前缀 (`codex-cli/...`)**选择后端**。
2. 使用相同的 OpenClaw 提示 + 工作区上下文**构建系统提示**。
3. **执行 CLI** 时带有会话 ID（如果支持），以保持历史记录一致。
   随附的 CLI`claude-cli`OpenClaw 后端会为每个
   OpenClaw 会话保持一个 Claude stdio 进程的活动状态，并通过 stream- stdin 发送后续轮次。
4. **解析输出**（JSON 或纯文本）并返回最终文本。
5. **按后端持久化会话 ID**，以便后续回复重用同一个 CLI 会话。

<Note>随附的 Anthropic Anthropic`claude-cli`AnthropicOpenClawCLIOpenClaw 后端再次受到支持。Anthropic 工作人员 告知我们，OpenClaw 风格的 Claude CLI 使用再次被允许，因此除非 Anthropic 发布 新政策，否则 OpenClaw 将 `claude -p`Anthropic 的使用视为已获准许。</Note>

随附的 OpenAI OpenAI`codex-cli`OpenClaw 后端通过
Codex 的 `model_instructions_file` 配置覆盖 (`-c
model_instructions_file="..."`) 传递 OpenClaw 的系统提示词。Codex 不公开 Claude 风格的
`--append-system-prompt`OpenClawCLI 标志，因此 OpenClaw 会将组合好的提示词写入临时文件，
用于每个新的 Codex CLI 会话。

随附的 Anthropic Anthropic`claude-cli`OpenClawOpenClaw 后端通过两种方式接收 OpenClaw 技能快照：
附加系统提示词中的精简 OpenClaw 技能目录，以及
通过 `--plugin-dir`OpenClawAPIOpenClaw 传递的临时 Claude Code 插件。该插件
仅包含该代理/会话的合格技能，因此 Claude Code 的原生技能
解析器能看到与 OpenClaw 本会在提示词中
宣传的相同的过滤集合。技能环境/API 密钥覆盖仍然由 OpenClaw 应用于
运行的子进程环境。

Claude CLIOpenClaw 也有其自己的非交互式权限模式。OpenClaw 将其映射到现有的 exec 策略，而不是添加 Claude 特定的配置：当有效请求的 exec 策略为 YOLO (`tools.exec.security: "full"` 和 `tools.exec.ask: "off"`OpenClaw) 时，OpenClaw 会添加 `--permission-mode bypassPermissions`。针对每个代理的 `agents.list[].tools.exec` 设置会覆盖该代理的全局 `tools.exec`。要强制使用不同的 Claude 模式，请在 `agents.defaults.cliBackends.claude-cli.args` 和匹配的 `resumeArgs` 下设置显式的原始后端参数，例如 `--permission-mode default` 或 `--permission-mode acceptEdits`。

捆绑的 Anthropic `claude-cli`OpenClaw 后端还将 OpenClaw 的 `/think` 级别映射到 Claude Code 原生的 `--effort` 标志（针对非“关闭”级别）。`minimal` 和 `low` 映射到 `low`，`adaptive` 和 `medium` 映射到 `medium`，而 `high`、`xhigh` 和 `max` 则直接映射。其他 CLI 后端需要其所属插件声明等效的 argv 映射器，然后 `/think` 才能影响生成的 CLI。

在 OpenClaw 可以使用捆绑的 OpenClaw`claude-cli` 后端之前，Claude Code 本身必须已在同一主机上登录：

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

仅当 `claude` 二进制文件尚未位于 `PATH` 上时，才使用 `agents.defaults.cliBackends.claude-cli.command`。

## 会话

- 如果 CLI 支持会话，请设置 `sessionArg` (例如 `--session-id`) 或 `sessionArgs` (占位符 `{sessionId}`)，以便在需要将 ID 插入多个标志时使用。
- 如果 CLI 使用带有不同标志的 **resume 子命令**，请设置
  CLI`resumeArgs`（恢复时替换 `args`）以及可选的 `resumeOutput`
  （用于非 JSON 恢复）。
- `sessionMode`：
  - `always`：始终发送会话 ID（如果未存储，则发送新的 UUID）。
  - `existing`：仅在之前存储过会话 ID 时才发送。
  - `none`：从不发送会话 ID。
- `claude-cli` 默认为 `liveSession: "claude-stdio"`、`output: "jsonl"`
  和 `input: "stdin"`Gateway(网关)OpenClaw，因此在活动状态下，后续轮次会重用活动的 Claude 进程。预热 stdio 现在是默认设置，包括对于省略传输字段的自定义配置。如果 Gateway(网关) 重启或空闲进程
  退出，OpenClaw 将从存储的 Claude 会话 ID 恢复。存储的会话
  ID 在恢复前会根据现有的可读项目记录进行验证，因此
  会使用 `reason=transcript-missing`CLI 清除幽灵绑定，
  而不是在 `--resume` 下静默启动新的 CLI 会话。
- Claude 实时会话保持有界的 JSONL 输出保护。默认设置允许每轮
  最多 8 MiB 和 20,000 行原始 JSONL 行。工具密集的 Claude 轮次可以通过
  `agents.defaults.cliBackends.claude-cli.reliability.outputLimits.maxTurnRawChars`
  和 `maxTurnLines`OpenClaw 在每个后端上调高这些值；OpenClaw 会将这些设置限制为 64 MiB 和 100,000
  行。
- 存储的 CLI 会话是提供商拥有的连续性。隐式的每日会话
  重置不会切断它们；CLI`/reset` 和显式的 `session.reset` 策略仍然
  会。
- 新的 CLI 会话通常仅从 OpenClaw 的压缩摘要加上压缩后的尾部重新播种。为了恢复在压缩之前失效的短会话，后端可以选择加入 CLIOpenClaw`reseedFromRawTranscriptWhenUncompacted: true`OpenClawCLI。OpenClaw 仍然保持原始转录本重新播种的界限，并将其限制在安全的失效情况，例如缺少 CLI 转录本、系统提示/MCP 更改或会话过期的重试；身份配置文件或凭据纪元的更改永远不会重新播种原始转录本历史记录。

序列化说明：

- `serialize: true` 保持同一通道内的运行有序。
- 大多数 CLI 在单个提供商通道上进行序列化。
- 当选定的身份标识发生更改时，OpenClaw 会丢弃已存储的 CLI 会话复用，包括更改的身份配置文件 ID、静态 API 密钥、静态令牌，或当 CLI 暴露时的 OAuth 账户标识。OAuth 访问和刷新令牌轮换不会切断已存储的 CLI 会话。如果 CLI 不暴露稳定的 OAuth 账户 ID，OpenClaw 将允许该 CLI 强制执行恢复权限。

## 来自 claude-cli 会话的回退前导

当 `claude-cli`CLI 尝试故障转移到 [`agents.defaults.model.fallbacks`](/zh/concepts/model-failoverOpenClaw) 中的非 CLI 候选者时，OpenClaw 会使用从 `~/.claude/projects/`OpenClaw 处的 Claude Code 本地 JSONL 转录本中提取的上下文前导来为下一次尝试播种。如果没有此种子，回退提供商将冷启动，因为 OpenClaw 自身的会话转录本对于 `claude-cli` 运行是空的。

- 前导优先使用最新的 `/compact` 摘要或 `compact_boundary` 标记，然后附加最近的后边界轮次，直至达到字符预算。前边界轮次会被丢弃，因为摘要已经代表了它们。
- 工具块被合并为紧凑的 `(tool call: name)` 和
  `(tool result: …)` 提示，以保持提示预算的诚实。如果摘要溢出，
  则标记为 `(truncated)`。
- 同一提供商 `claude-cli` 到 `claude-cli` 的回退依赖于 Claude 自己的
  `--resume` 并跳过前奏。
- 种子重用了现有的 Claude 会话文件路径验证，因此
  无法读取任意路径。

## 图像（透传）

如果您的 CLI 接受图像路径，请设置 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 会将 base64 图像写入临时文件。如果设置了 `imageArg`，这些
路径将作为 CLI 参数传递。如果缺少 `imageArg`，OpenClaw 会将
文件路径附加到提示中（路径注入），这对于能够从
普通路径自动加载本地文件的 CLI 来说已经足够了。

## 输入 / 输出

- `output: "json"`（默认）尝试解析 JSON 并提取文本 + 会话 ID。
- 对于 Gemini CLI JSON 输出，当 `usage` 缺失或为空时，
  OpenClaw 会从 `response` 读取回复文本，并从
  `stats` 读取使用情况。
- `output: "jsonl"` 解析 JSONL 流（例如 Codex CLI `--json`）并提取最终的代理消息以及
  会话标识符（如果存在）。
- `output: "text"` 将 stdout 视为最终响应。

输入模式：

- `input: "arg"`（默认）将提示作为最后一个 CLI 参数传递。
- `input: "stdin"` 通过 stdin 发送提示。
- 如果提示非常长并且设置了 `maxPromptArgChars`，则使用 stdin。

## 默认值（插件拥有）

捆绑的 OpenAI 插件还会为 `codex-cli` 注册一个默认值：

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","-c","sandbox_mode=\"workspace-write\"","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

捆绑的 Google 插件还为 `google-gemini-cli` 注册了一个默认值：

- `command: "gemini"`
- `args: ["--output-format", "json", "--prompt", "{prompt}"]`
- `resumeArgs: ["--resume", "{sessionId}", "--output-format", "json", "--prompt", "{prompt}"]`
- `imageArg: "@"`
- `imagePathScope: "workspace"`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

前提条件：本地 Gemini CLI 必须已安装，并且在 `PATH` 上可用为 `gemini`（`brew install gemini-cli` 或
`npm install -g @google/gemini-cli`）。

Gemini CLI JSON 说明：

- 回复文本是从 JSON `response` 字段中读取的。
- 当 `usage` 缺失或为空时，使用方式回退到 `stats`。
- `stats.cached` 会被规范化为 OpenClaw `cacheRead`。
- 如果缺少 `stats.input`，OpenClaw 会从
  `stats.input_tokens - stats.cached` 推导输入 token。

仅在需要时覆盖（常见做法：绝对 `command` 路径）。

## 插件拥有的默认值

CLI 后端默认值现在是插件界面的一部分：

- 插件使用 `api.registerCliBackend(...)` 注册它们。
- 后端 `id` 成为模型引用中的提供商前缀。
- `agents.defaults.cliBackends.<id>` 中的用户配置仍然会覆盖插件默认值。
- 特定于后端的配置清理通过可选的
  `normalizeConfig` 钩子保持由插件拥有。

需要微小的提示/消息兼容性填充层的插件可以声明
双向文本转换，而无需替换提供商或 CLI 后端：

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

`input` 重写传递给 CLI 的系统提示和用户提示。`output`
在 OpenClaw 处理其自己的控制标记和渠道传递之前，重写流式助手增量和解析后的最终文本。

对于发出兼容 Claude Code stream- 的 JSONL 的 CLI，请在该后端的配置中设置
`jsonlDialect: "claude-stream-json"`。

## 打包 MCP 覆盖层

CLI 后端并**不**直接接收 OpenClaw 工具调用，但后端可以通过 CLIOpenClaw`bundleMcp: true` 选择加入生成的 MCP 配置覆盖层。

当前的打包行为：

- `claude-cli`：生成的严格 MCP 配置文件
- `codex-cli`：针对 `mcp_servers`OpenClaw 的内联配置覆盖；生成的
  OpenClaw 回环服务器标有 Codex 的每服务器工具批准模式，
  因此 MCP 调用不会因本地批准提示而停滞
- `google-gemini-cli`：生成的 Gemini 系统设置文件

当启用打包 MCP 时，OpenClaw：

- 生成一个回环 HTTP MCP 服务器，将网关工具暴露给 CLI 进程
- 使用按会话令牌（`OPENCLAW_MCP_TOKEN`）对桥接进行身份验证
- 将工具访问范围限定在当前会话、账户和渠道上下文
- 为当前工作区加载已启用的打包 MCP 服务器
- 将它们与任何现有的后端 MCP 配置/设置形状合并
- 使用来自所属扩展的后端拥有的集成模式重写启动配置

如果未启用 MCP 服务器，当后端选择加入打包 MCP 时，OpenClaw 仍会注入严格配置，以保持后台运行的隔离性。

会话范围的打包 MCP 运行时会被缓存以在会话内重用，然后在空闲 `mcp.sessionIdleTtlMs` 毫秒（默认 10
分钟；设置 `0` 可禁用）后被回收。一次性嵌入式运行（如身份验证探测、
slug 生成以及运行结束时的主动记忆召回请求清理）会在运行结束时清理，以便 stdio
子进程和可流式 HTTP/SSE 流不会超过运行的生命周期。

## 限制

- **没有直接的 OpenClaw 工具调用。** OpenClaw 不会将工具调用注入到
  CLI 后端协议中。仅当后端选择加入
  OpenClawOpenClawCLI`bundleMcp: true` 时，它们才能看到网关工具。
- **流式传输因后端而异。** 某些后端流式传输 JSONL；其他后端则缓冲
  直到退出。
- **结构化输出**取决于 CLI 的 JSON 格式。
- **Codex CLI 会话**通过文本输出恢复（无 JSONL），这比初始的 `--json` 运行结构化程度更低。OpenClaw 会话仍能正常工作。

## 故障排除

- **找不到 CLI**：将 `command` 设置为完整路径。
- **模型名称错误**：使用 `modelAliases` 将 `provider/model` 映射到 CLI 模型。
- **无会话连续性**：确保已设置 `sessionArg` 且 `sessionMode` 未设置为 `none`（Codex CLI 目前无法通过 JSON 输出恢复）。
- **图像被忽略**：设置 `imageArg`（并验证 CLI 是否支持文件路径）。

## 相关内容

- [Gateway(网关) runbook](/zh/gateway)
- [本地模型](/zh/gateway/local-models)
