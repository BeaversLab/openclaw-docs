---
summary: "CLI 后端：通过本地 AI CLI 实现纯文本回退"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Claude Code CLI or other local AI CLIs and want to reuse them
  - You need a text-only, tool-free path that still supports sessions and images
title: "CLI 后端"
---

# CLI 后端（回退运行时）

当 API 提供商宕机、速率受限或暂时出现异常时，OpenClaw 可以将 **本地 AI CLI** 作为 **纯文本回退** 方案运行。这采用了有意保守的策略：

- **工具已禁用**（无工具调用）。
- **文本输入 → 文本输出**（可靠）。
- **支持会话**（因此后续轮次保持连贯）。
- **可以传递图像**，如果 CLI 接受图像路径。

这被设计为一张**安全网**，而不是主要路径。当你想要“始终有效”的文本响应而不依赖外部 API 时使用它。

## 新手友好的快速入门

您可以在无需任何配置的情况下使用 Claude Code CLI（捆绑的 Anthropic 插件会注册一个默认后端）：

```bash
openclaw agent --message "hi" --model claude-cli/opus-4.6
```

Codex CLI 也可以开箱即用（通过捆绑的 OpenAI 插件）：

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
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
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
        fallbacks: ["claude-cli/opus-4.6", "claude-cli/opus-4.5"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "claude-cli/opus-4.6": {},
        "claude-cli/opus-4.5": {},
      },
    },
  },
}
```

注意：

- 如果您使用 `agents.defaults.models`（允许列表），则必须包含 `claude-cli/...`。
- 如果主提供商失败（身份验证、速率限制、超时），OpenClaw 将
  接下来尝试 CLI 后端。

## 配置概述

所有 CLI 后端均位于以下位置：

```
agents.defaults.cliBackends
```

每个条目均由**提供商 ID**（例如 `claude-cli`、`my-cli`）作为键。
提供商 ID 将成为您的 CLI 引用的左侧：

```
<provider>/<model>
```

### 配置示例

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          input: "arg",
          modelArg: "--model",
          modelAliases: {
            "claude-opus-4-6": "opus",
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

1. **根据提供商前缀 (`claude-cli/...`) 选择后端**。
2. **使用相同的 OpenClaw 提示 + 工作区上下文构建系统提示**。
3. **执行 CLI** 时带有会话 ID（如果支持），以便历史记录保持一致。
4. **解析输出**（JSON 或纯文本）并返回最终文本。
5. **按后端持久化会话 ID**，以便后续回复重用同一 CLI 会话。

## 会话

- 如果 CLI 支持会话，请设置 `sessionArg`（例如 `--session-id`）或
  `sessionArgs`（占位符 `{sessionId}`），以便在需要将 ID 插入
  到多个标志时使用。
- 如果 CLI 使用带有不同标志的**恢复子命令**，请设置
  `resumeArgs`（在恢复时替换 `args`）并可选地设置 `resumeOutput`
  （用于非 JSON 恢复）。
- `sessionMode`：
  - `always`：始终发送会话 ID（如果未存储则发送新的 UUID）。
  - `existing`：仅在之前存储过会话 ID 时才发送。
  - `none`：从不发送会话 ID。

## 图片（透传）

如果您的 CLI 接受图片路径，请设置 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 会将 base64 图像写入临时文件。如果设置了 `imageArg`，这些路径将作为 CLI 参数传递。如果缺少 `imageArg`，OpenClaw 会将文件路径附加到提示词中（路径注入），这对于能够从普通路径自动加载本地文件的 CLI 来说已经足够（Claude Code CLI 的行为）。

## 输入 / 输出

- `output: "json"`（默认）尝试解析 JSON 并提取文本 + 会话 ID。
- `output: "jsonl"` 解析 JSONL 流（Codex CLI `--json`）并在存在时提取最后一条代理消息以及 `thread_id`。
- `output: "text"` 将 stdout 视为最终响应。

输入模式：

- `input: "arg"`（默认）将提示词作为最后一个 CLI 参数传递。
- `input: "stdin"` 通过 stdin 发送提示词。
- 如果提示词非常长且设置了 `maxPromptArgChars`，则使用 stdin。

## 默认值（插件所有）

捆绑的 Anthropic 插件为 `claude-cli` 注册了一个默认值：

- `command: "claude"`
- `args: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions"]`
- `resumeArgs: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions", "--resume", "{sessionId}"]`
- `modelArg: "--model"`
- `systemPromptArg: "--append-system-prompt"`
- `sessionArg: "--session-id"`
- `systemPromptWhen: "first"`
- `sessionMode: "always"`

捆绑的 OpenAI 插件也为 `codex-cli` 注册了一个默认值：

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

捆绑的 Google 插件也为 `google-gemini-cli` 注册了一个默认值：

- `command: "gemini"`
- `args: ["--prompt", "--output-format", "json"]`
- `resumeArgs: ["--resume", "{sessionId}", "--prompt", "--output-format", "json"]`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

仅在需要时覆盖（常见情况：绝对 `command` 路径）。

## 插件拥有的默认值

CLI 后端默认值现在是插件接口的一部分：

- 插件使用 `api.registerCliBackend(...)` 注册它们。
- 后端 `id` 成为模型引用中的提供商前缀。
- `agents.defaults.cliBackends.<id>` 中的用户配置仍然会覆盖插件默认值。
- 特定于后端的配置清理通过可选的 `normalizeConfig` 钩子保持由插件拥有。

## 局限性

- **无 OpenClaw 工具**（CLI 后端从不接收工具调用）。某些 CLI 可能仍会运行它们自己的代理工具。
- **无流式传输**（CLI 输出被收集后返回）。
- **结构化输出**取决于 CLI 的 JSON 格式。
- **Codex CLI 会话**通过文本输出恢复（无 JSONL），这比初始 `--json` 运行的结构化程度低。OpenClaw 会话仍然正常工作。

## 故障排除

- **找不到 CLI**：将 `command` 设置为完整路径。
- **模型名称错误**：使用 `modelAliases` 映射 `provider/model` → CLI 模型。
- **无会话连续性**：确保设置了 `sessionArg` 并且 `sessionMode` 不为 `none`（Codex CLI 目前无法通过 JSON 输出恢复）。
- **图像被忽略**：设置 `imageArg`（并验证 CLI 支持文件路径）。
