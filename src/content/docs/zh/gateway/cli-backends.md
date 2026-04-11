---
summary: "CLI 后端：带有可选 MCP 工具桥接的本地 AI CLI 回退"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Codex CLI or other local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "CLI 后端"
---

# CLI 后端（回退运行时）

当 API 提供商宕机、速率受限或暂时出现异常时，OpenClaw 可以将 **本地 AI CLI** 作为 **纯文本回退** 方案运行。这采用了有意保守的策略：

- **OpenClaw 工具不会直接注入**，但带有 `bundleMcp: true` 的后端
  可以通过回环 MCP 桥接接收网关工具。
- 为支持它的 CLI 提供 **JSONL 流式传输**。
- **支持会话**（因此后续轮次保持连贯）。
- **可以传递图像**，如果 CLI 接受图像路径。

这被设计为一张**安全网**，而不是主要路径。当你想要“始终有效”的文本响应而不依赖外部 API 时使用它。

如果您想要一个包含 ACP 会话控制、后台任务、
线程/对话绑定和持久化外部编码会话的完整工具运行时，请
改用 [ACP Agents](/en/tools/acp-agents)。CLI 后端不是 ACP。

## 适合初学者的快速入门

您可以使用 Codex CLI **无需任何配置**（附带的 OpenAI 插件
会注册一个默认后端）：

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.4
```

如果您的网关在 launchd/systemd 下运行且 PATH 环境变量极简，只需添加
命令路径：

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

就是这样。除了 CLI 本身之外，不需要密钥，也不需要额外的身份验证配置。

如果您在网关主机上将捆绑的 CLI 后端用作**主要消息提供商**，当您的配置在 OpenClaw 引用中或 `agents.defaults.cliBackends` 下明确引用该后端时，OpenClaw 现在会自动加载所属的捆绑插件。

## 将其用作后备

将 CLI 后端添加到您的后备列表中，以便它仅在主 CLI 失败时运行：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["codex-cli/gpt-5.4"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "codex-cli/gpt-5.4": {},
      },
    },
  },
}
```

注意：

- 如果您使用 `agents.defaults.models`（允许列表），则必须也在此处包含您的 CLI 后端模型。
- 如果主提供商失败（身份验证、速率限制、超时），OpenClaw 将
  接下来尝试 CLI 后端。

## 配置概述

所有 CLI 后端均位于以下位置：

```
agents.defaults.cliBackends
```

每个条目以一个 **提供商 id** 为键（例如 `codex-cli`，`my-cli`）。
提供商 id 会成为您的模型引用的左侧部分：

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

1. 根据提供商前缀 (`codex-cli/...`) **选择后端**。
2. **使用相同的 OpenClaw 提示 + 工作区上下文构建系统提示**。
3. **执行 CLI** 时带有会话 ID（如果支持），以便历史记录保持一致。
4. **解析输出**（JSON 或纯文本）并返回最终文本。
5. **按后端持久化会话 ID**，以便后续回复重用同一 CLI 会话。

<Note>附带的 Anthropic `claude-cli` 后端再次受到支持。Anthropic 工作人员 告诉我们，OpenClaw 风格的 Claude CLI 使用再次被允许，因此除非 Anthropic 发布 新政策，否则 OpenClaw 将 `claude -p` 使用视为对此集成的认可。</Note>

## 会话

- 如果 CLI 支持会话，请设置 `sessionArg`（例如 `--session-id`）或
  `sessionArgs`（占位符 `{sessionId}`），以便在需要将 ID
  插入到多个标志时使用。
- 如果 CLI 使用带有不同标志的 **resume 子命令**，请设置
  `resumeArgs`（恢复时替换 `args`）并可选地设置 `resumeOutput`
  （用于非 JSON 恢复）。
- `sessionMode`：
  - `always`：始终发送会话 id（如果没有存储，则发送新的 UUID）。
  - `existing`：仅当之前存储了会话 id 时才发送。
  - `none`：从不发送会话 id。

序列化说明：

- `serialize: true` 保持同通道运行的顺序。
- 大多数 CLI 在单个提供商通道上进行序列化。
- 当后端身份验证状态发生变化时（包括重新登录、令牌轮换或更改的身份配置文件凭据），OpenClaw 会放弃存储的 CLI 会话重用。

## 图像（透传）

如果您的 CLI 接受图像路径，请设置 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 会将 base64 图像写入临时文件。如果设置了 `imageArg`，这些路径将作为 CLI 参数传递。如果缺少 `imageArg`，OpenClaw 会将文件路径附加到提示词中（路径注入），这对于自动从纯路径加载本地文件的 CLI 来说已经足够。

## 输入 / 输出

- `output: "json"`（默认）尝试解析 JSON 并提取文本 + 会话 ID。
- 对于 Gemini CLI JSON 输出，当 `usage` 缺失或为空时，OpenClaw 从 `response` 读取回复文本，并从 `stats` 读取使用情况。
- `output: "jsonl"` 解析 JSONL 流（例如 Codex CLI `--json`）并提取最终的代理消息以及会话标识符（如果存在）。
- `output: "text"` 将 stdout 视为最终响应。

输入模式：

- `input: "arg"`（默认）将提示词作为最后一个 CLI 参数传递。
- `input: "stdin"` 通过 stdin 发送提示词。
- 如果提示词很长并且设置了 `maxPromptArgChars`，则使用 stdin。

## 默认值（插件拥有）

捆绑的 OpenAI 插件还为 `codex-cli` 注册了默认值：

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

捆绑的 Google 插件还为 `google-gemini-cli` 注册了默认值：

- `command: "gemini"`
- `args: ["--output-format", "json", "--prompt", "{prompt}"]`
- `resumeArgs: ["--resume", "{sessionId}", "--output-format", "json", "--prompt", "{prompt}"]`
- `imageArg: "@"`
- `imagePathScope: "workspace"`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

前提条件：本地 Gemini CLI 必须已安装，并且可在 `gemini` 上作为 `PATH` 使用（`brew install gemini-cli` 或 `npm install -g @google/gemini-cli`）。

Gemini CLI JSON 注意事项：

- 回复文本从 JSON `response` 字段读取。
- 当 `usage` 缺失或为空时，使用情况回退到 `stats`。
- `stats.cached` 被规范化为 OpenClaw `cacheRead`。
- 如果缺少 `stats.input`，OpenClaw 会从 `stats.input_tokens - stats.cached` 推导输入 token。

仅在需要时覆盖（常见：绝对 `command` 路径）。

## 插件拥有的默认值

CLI 后端的默认值现在是插件界面的一部分：

- 插件使用 `api.registerCliBackend(...)` 注册它们。
- 后端 `id` 成为模型引用中的提供商前缀。
- `agents.defaults.cliBackends.<id>` 中的用户配置仍然会覆盖插件默认值。
- 特定于后端的配置清理保持由插件拥有，通过可选的 `normalizeConfig` 钩子实现。

## 打包 MCP 覆盖层

CLI 后端并**不**直接接收 OpenClaw 工具调用，但后端可以使用 `bundleMcp: true` 选择加入生成的 MCP 配置覆盖层。

当前的打包行为：

- `claude-cli`：生成的严格 MCP 配置文件
- `codex-cli`：针对 `mcp_servers` 的内联配置覆盖
- `google-gemini-cli`：生成的 Gemini 系统设置文件

当启用打包 MCP 时，OpenClaw：

- 生成一个回环 HTTP MCP 服务器，将网关工具暴露给 CLI 进程
- 使用每会话令牌（`OPENCLAW_MCP_TOKEN`）对网桥进行身份验证
- 将工具访问范围限定在当前会话、账户和渠道上下文内
- 为当前工作区加载已启用的打包 MCP 服务器
- 将它们与任何现有的后端 MCP 配置/设置形状合并
- 使用来自所属扩展的后端拥有的集成模式重写启动配置

如果未启用 MCP 服务器，当后端选择加入打包 MCP 时，OpenClaw 仍然会注入一个严格配置，以保持后台运行隔离。

## 局限性

- **No direct OpenClaw 工具 calls.** OpenClaw does not inject 工具 calls into
  the CLI backend protocol. Backends only see gateway tools when they opt into
  `bundleMcp: true`.
- **Streaming is backend-specific.** Some backends stream JSONL; others buffer
  until exit.
- **Structured outputs** depend on the CLI’s JSON format.
- **Codex CLI sessions** resume via text output (no JSONL), which is less
  structured than the initial `--json` run. OpenClaw sessions still work
  normally.

## 故障排除

- **CLI not found**: set `command` to a full path.
- **Wrong 模型 name**: use `modelAliases` to map `provider/model` → CLI 模型.
- **No 会话 continuity**: ensure `sessionArg` is set and `sessionMode` is not
  `none` (Codex CLI currently cannot resume with JSON output).
- **Images ignored**: set `imageArg` (and verify CLI supports file paths).
