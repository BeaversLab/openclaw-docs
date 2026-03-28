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

你可以**无需任何配置**地使用 Claude Code CLI（OpenClaw 附带内置默认设置）：

```bash
openclaw agent --message "hi" --model claude-cli/opus-4.6
```

Codex CLI 也可以开箱即用：

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

## 作为后备使用

将 CLI 后端添加到您的后备列表中，以便其仅在主模型失败时运行：

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

- 如果您使用 `agents.defaults.models`（白名单），则必须包含 `claude-cli/...`。
- 如果主提供商失败（身份验证、速率限制、超时），OpenClaw 将
  尝试 CLI 后端。

## 配置概览

所有 CLI 后端位于：

```
agents.defaults.cliBackends
```

每个条目以一个 **提供商 ID** 为键（例如 `claude-cli`、`my-cli`）。
提供商 ID 会成为模型引用的左侧部分：

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

1. 根据提供商前缀（`claude-cli/...`）**选择一个后端**。
2. **构建系统提示**，使用相同的 OpenClaw 提示 + 工作区上下文。
3. **执行 CLI** 并附带会话 ID（如果支持），以便历史记录保持一致。
4. **解析输出**（JSON 或纯文本）并返回最终文本。
5. **持久化会话 ID** 于每个后端，以便后续对话重用相同的 CLI 会话。

## 会话

- 如果 CLI 支持会话，请设置 `sessionArg`（例如 `--session-id`）或
  `sessionArgs`（占位符 `{sessionId}`），当 ID 需要插入到
  多个标志时。
- 如果 CLI 使用带有不同标志的 **resume 子命令**，请设置 `resumeArgs`（在恢复时替换 `args`）以及可选的 `resumeOutput`（用于非 JSON 恢复）。
- `sessionMode`：
  - `always`：始终发送会话 ID（若未存储则为新 UUID）。
  - `existing`：仅当之前存储过会话 ID 时才发送。
  - `none`：从不发送会话 ID。

## 图像（透传）

如果您的 CLI 接受图片路径，请设置 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 会将 base64 图片写入临时文件。如果设置了 `imageArg`，这些路径将作为 CLI 参数传递。如果缺少 `imageArg`，OpenClaw 会将文件路径附加到提示词中（路径注入），这对于能够从普通路径自动加载本地文件的 CLI（Claude Code CLI 的行为）来说已经足够了。

## 输入 / 输出

- `output: "json"`（默认）尝试解析 JSON 并提取文本和会话 ID。
- `output: "jsonl"` 解析 JSONL 流（Codex CLI CLI `--json`）并提取
  最后一条代理消息以及 `thread_id`（如果存在）。
- `output: "text"` 将 stdout 视为最终响应。

输入模式：

- `input: "arg"`（默认）将提示词作为最后一个 CLI 参数传递。
- `input: "stdin"` 通过 stdin 发送提示。
- 如果提示很长并且设置了 `maxPromptArgChars`，则使用 stdin。

## 默认值（内置）

OpenClaw 为 `claude-cli` 提供了一个默认值：

- `command: "claude"`
- `args: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions"]`
- `resumeArgs: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions", "--resume", "{sessionId}"]`
- `modelArg: "--model"`
- `systemPromptArg: "--append-system-prompt"`
- `sessionArg: "--session-id"`
- `systemPromptWhen: "first"`
- `sessionMode: "always"`

OpenClaw 还为 `codex-cli` 提供了一个默认值：

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

仅在需要时覆盖（常见情况：`command` 的绝对路径）。

## 限制

- **没有 OpenClaw 工具**（CLI 后端从不接收工具调用）。某些 CLI 可能仍会运行它们自己的代理工具。
- **无流式传输**（收集 CLI 输出然后返回）。
- **结构化输出**取决于 CLI 的 JSON 格式。
- **Codex CLI 会话** 通过文本输出恢复（无 JSONL），其结构比最初的 `--json` 运行要低。OpenClaw 会话仍能正常工作。

## 故障排除

- **未找到 CLI**：将 `command` 设置为完整路径。
- **错误的模型名称**：使用 `modelAliases` 将 `provider/model` 映射到 CLI CLI。
- **无会话连续性**：确保设置了 `sessionArg` 且未设置 `sessionMode`
  `none`（Codex CLI 目前无法恢复 JSON 输出）。
- **忽略图像**：设置 `imageArg`（并验证 CLI 是否支持文件路径）。
