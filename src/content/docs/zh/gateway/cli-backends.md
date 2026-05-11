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

这被设计为一张**安全网**，而非主要路径。当你想要“始终可用”的文本响应而不依赖外部 API 时使用它。

如果你想要一个包含 ACP 会话控制、后台任务、线程/对话绑定以及持久化外部编码会话的完整工具集运行时，请改用 [ACP Agents](/zh/tools/acp-agents)。CLI 后端不是 ACP。

## 适合初学者的快速入门

你可以在**无需任何配置**的情况下使用 Codex CLI（捆绑的 OpenAI 插件会注册一个默认后端）：

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.5
```

如果你的网关在 launchd/systemd 下运行且 PATH 极简，只需添加命令路径：

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

就这样。除了 CLI 本身，不需要密钥，也不需要额外的身份验证配置。

如果你在网关主机上将捆绑的 CLI 后端用作**主要消息提供商**，那么当你的配置在模型引用中或 `agents.defaults.cliBackends` 下明确引用该后端时，OpenClaw 现在会自动加载所属的捆绑插件。

## 将其用作回退方案

将 CLI 后端添加到你的回退列表中，以便它仅在主模型失败时运行：

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

注意事项：

- 如果你使用 `agents.defaults.models`（允许列表），你必须也将你的 CLI 后端模型包含在内。
- 如果主提供商失败（身份验证、速率限制、超时），OpenClaw 将
  尝试下一个 CLI 后端。

## 配置概述

所有 CLI 后端均位于以下位置：

```
agents.defaults.cliBackends
```

每个条目都由一个 **提供商 ID**（例如 `codex-cli`、`my-cli`）作为键。
提供商 ID 将成为你的模型引用的左侧部分：

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
          serialize: true,
        },
      },
    },
  },
}
```

## 工作原理

1. 根据提供商前缀（`codex-cli/...`）**选择后端**。
2. **构建系统提示词**，使用相同的 OpenClaw 提示词 + 工作区上下文。
3. **执行 CLI** 并附带会话 ID（如果支持），以保持历史记录一致。
   捆绑的 `claude-cli` 后端为每个 OpenClaw 会话保持一个 Claude stdio 进程活动，并
   通过 stream- stdin 发送后续轮次。
4. **解析输出**（JSON 或纯文本）并返回最终文本。
5. **持久化会话 ID** 针对每个后端，以便后续复用同一个 CLI 会话。

<Note>捆绑的 Anthropic `claude-cli` 后端再次受到支持。Anthropic 工作人员 告诉我们，允许再次使用 OpenClaw 风格的 Claude CLI，因此 OpenClaw 将 `claude -p` 的使用视为此集成的经批准用法，除非 Anthropic 发布 新政策。</Note>

捆绑的 OpenAI `codex-cli` 后端通过
Codex 的 `model_instructions_file` 配置覆盖 (`-c
model_instructions_file="..."`) 传递 OpenClaw 的系统提示词。Codex 不公开类似 Claude 的
`--append-system-prompt` 标志，因此 OpenClaw 会将组装好的提示词写入到一个
临时文件中，用于每个新的 Codex CLI 会话。

捆绑的 Anthropic `claude-cli` 后端通过两种方式接收 OpenClaw 技能快照：
附加系统提示词中紧凑的 OpenClaw 技能目录，以及
通过 `--plugin-dir` 传递的临时 Claude Code 插件。该插件仅包含
该代理/会话的合格技能，因此 Claude Code 的原生技能
解析器看到的过滤后集合与 OpenClaw 原本会在提示词中发布的集合相同。
技能环境变量/API 密钥覆盖仍由 OpenClaw 应用于
运行的子进程环境。

Claude CLI 也有其自己的非交互式权限模式。OpenClaw 将其映射到现有的 exec 策略，而不是添加 Claude 特定的配置：当有效的请求 exec 策略为 YOLO (`tools.exec.security: "full"` 和 `tools.exec.ask: "off"`) 时，OpenClaw 会添加 `--permission-mode bypassPermissions`。针对每个代理的 `agents.list[].tools.exec` 设置会覆盖该代理的全局 `tools.exec`。要强制使用不同的 Claude 模式，请设置明确的原始后端参数，例如在 `agents.defaults.cliBackends.claude-cli.args` 和匹配的 `resumeArgs` 下设置 `--permission-mode default` 或 `--permission-mode acceptEdits`。

在 OpenClaw 可以使用捆绑的 `claude-cli` 后端之前，Claude Code 本身必须已在同一主机上登录：

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

仅当 `claude` 二进制文件尚不在 `PATH` 上时，才使用 `agents.defaults.cliBackends.claude-cli.command`。

## 会话

- 如果 CLI 支持会话，请设置 `sessionArg` (例如 `--session-id`) 或 `sessionArgs` (占位符 `{sessionId}`)，以便在需要将 ID 插入多个标志时使用。
- 如果 CLI 使用带有不同标志的 **resume 子命令**，请设置 `resumeArgs` (在恢复时替换 `args`) 以及可选的 `resumeOutput` (用于非 JSON 恢复)。
- `sessionMode`：
  - `always`：始终发送会话 ID (如果未存储，则为新 UUID)。
  - `existing`：仅在之前存储过会话 ID 时才发送。
  - `none`：从不发送会话 ID。
- `claude-cli` 默认为 `liveSession: "claude-stdio"`、`output: "jsonl"` 和 `input: "stdin"`，因此后续轮次会在其处于活动状态时复用实时的 Claude 进程。Warm stdio 现在是默认设置，包括省略 transport 字段的自定义配置。如果 Gateway(网关) 重启或空闲进程退出，OpenClaw 将从存储的 Claude 会话 id 恢复。在恢复之前，存储的 会话 id 会根据现有的可读项目记录进行验证，因此幻影绑定会使用 `reason=transcript-missing` 清除，而不是在 `--resume` 下静默启动新的 Claude CLI 会话。
- 存储的 CLI 会话 是提供商拥有的连续性。隐式的每日 会话 重置不会中断它们；`/reset` 和显式的 `session.reset` 策略仍然会。

序列化说明：

- `serialize: true` 保持同车道运行的顺序。
- 大多数 CLI 在一个提供商车道上进行序列化。
- 当选定的身份认证标识更改时，包括更改的身份配置文件 id、静态 OpenClaw 密钥、静态令牌，或 CLI 暴露时的 API 帐户标识，OAuth 会停止使用存储的 CLI 会话。OAuth 访问和刷新令牌轮换不会中断存储的 CLI 会话。如果 CLI 不暴露稳定的 OAuth 帐户 id，OpenClaw 会允许该 CLI 强制执行恢复权限。

## 图像（透传）

如果您的 CLI 接受图像路径，请设置 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 会将 base64 图像写入临时文件。如果设置了 `imageArg`，这些路径将作为 CLI 参数传递。如果缺少 `imageArg`，OpenClaw 会将文件路径追加到提示词中（路径注入），这对于能够从普通路径自动加载本地文件的 OpenClaw 来说已经足够了。

## 输入 / 输出

- `output: "json"`（默认）尝试解析 JSON 并提取文本 + 会话 id。
- 对于 Gemini CLI JSON 输出，当 `usage` 缺失或为空时，OpenClaw 从 `response` 读取回复文本，并从 `stats` 读取使用情况。
- `output: "jsonl"` 解析 JSONL 流（例如 Codex CLI `--json`），并在存在时提取最终代理消息以及 会话 标识符。
- `output: "text"` 将 stdout 视为最终响应。

输入模式：

- `input: "arg"` （默认）将提示词作为最后一个 CLI 参数传递。
- `input: "stdin"` 通过 stdin 发送提示词。
- 如果提示词很长并且设置了 `maxPromptArgChars`，则使用 stdin。

## 默认值（插件拥有）

捆绑的 OpenAI 插件还为 `codex-cli` 注册了一个默认值：

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

前提条件：本地 Gemini CLI 必须已安装并可在 `PATH` （`brew install gemini-cli` 或
`npm install -g @google/gemini-cli`）上作为 `gemini` 使用。

Gemini CLI JSON 说明：

- 回复文本从 JSON `response` 字段读取。
- 当 `usage` 缺失或为空时，使用情况回退到 `stats`。
- `stats.cached` 被标准化为 OpenClaw `cacheRead`。
- 如果缺少 `stats.input`，OpenClaw 会从
  `stats.input_tokens - stats.cached` 推导输入 Token。

仅在需要时覆盖（常见：绝对 `command` 路径）。

## 插件拥有的默认值

CLI 后端默认值现在是插件表面的一部分：

- 插件通过 `api.registerCliBackend(...)` 注册它们。
- 后端 `id` 成为模型引用中的提供商前缀。
- `agents.defaults.cliBackends.<id>` 中的用户配置仍然覆盖插件默认值。
- 特定于后端的配置清理通过可选的
  `normalizeConfig` 钩子保持由插件拥有。

需要微小的提示/消息兼容性垫片的插件可以声明双向文本转换，而无需替换提供商或 CLI 后端：

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

`input` 重写给 CLI 传递的系统提示和用户提示。`output`
在 OpenClaw 处理其自己的控制标记和渠道传递之前，重写流式助手增量（deltas）和解析后的最终文本。

对于发出 Claude Code stream- 兼容 JSONL 的 CLI，请在该后端的配置中设置
`jsonlDialect: "claude-stream-json"`。

## 打包 MCP 覆盖层

CLI 后端并**不**直接接收 OpenClaw 工具调用，但后端可以通过 `bundleMcp: true` 选择加入生成的 MCP 配置覆盖层。

当前的打包行为：

- `claude-cli`：生成的严格 MCP 配置文件
- `codex-cli`：用于 `mcp_servers` 的内联配置覆盖；生成的
  OpenClaw 回环服务器标有 Codex 的每服务器工具批准模式，
  因此 MCP 调用不会在本地批准提示上停滞
- `google-gemini-cli`：生成的 Gemini 系统设置文件

当打包 MCP 启用时，OpenClaw：

- 生成一个回环 HTTP MCP 服务器，将网关工具暴露给 CLI 进程
- 使用每个会话的令牌（`OPENCLAW_MCP_TOKEN`）对桥接进行身份验证
- 将工具访问范围限定为当前会话、账户和渠道上下文
- 为当前工作区加载已启用的打包 MCP 服务器
- 将它们与任何现有的后端 MCP 配置/设置结构合并
- 使用来自所属扩展的后端拥有的集成模式重写启动配置

如果未启用 MCP 服务器，当后端选择加入打包 MCP 时，OpenClaw 仍会注入严格配置，以便后台运行保持隔离。

会话范围的打包 MCP 运行时被缓存以在会话内重用，然后在空闲 `mcp.sessionIdleTtlMs` 毫秒后回收（默认 10 分钟；设置 `0` 以禁用）。一次性嵌入式运行（如身份验证探测、slug 生成）和运行结束时的活动记忆召回请求清理，确保 stdio 子进程和可流式 HTTP/SSE 流不会比运行本身更持久。

## 局限性

- **没有直接的 OpenClaw 工具调用。** OpenClaw 不会将工具调用注入到 CLI 后端协议中。后端只有在选择加入 `bundleMcp: true` 时才能看到 Gateway 工具。
- **流式传输取决于后端。** 某些后端流式传输 JSONL；其他则缓冲直到退出。
- **结构化输出**取决于 CLI 的 JSON 格式。
- **Codex CLI 会话**通过文本输出恢复（无 JSONL），这比初始的 `--json` 运行结构化程度更低。OpenClaw 会话仍然正常工作。

## 故障排除

- **未找到 CLI**：将 `command` 设置为完整路径。
- **模型名称错误**：使用 `modelAliases` 将 `provider/model` 映射到 CLI 模型。
- **无会话连续性**：确保设置了 `sessionArg` 并且 `sessionMode` 不是 `none`（Codex CLI 目前无法通过 JSON 输出恢复）。
- **忽略图像**：设置 `imageArg`（并验证 CLI 支持文件路径）。

## 相关

- [Gateway 运行手册](/zh/gateway)
- [本地模型](/zh/gateway/local-models)
