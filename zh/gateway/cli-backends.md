---
summary: "CLI backends: text-only fallback via local AI CLIs"
read_when:
  - 当 API 提供商出现故障时，您需要一个可靠的回退方案
  - 您正在运行 Claude Code CLI 或其他本地 AI CLI，并希望重用它们
  - 您需要一条纯文本、无工具的路径，但仍需支持会话和图像
title: "CLI Backends"
---

# CLI backends (fallback runtime)

当 API 提供商宕机、限速或暂时行为异常时，OpenClaw 可以运行本地 AI CLI 作为纯文本回退方案。这有意采取了保守策略：

- **工具已禁用**（无工具调用）。
- **文本输入 → 文本输出**（可靠）。
- **支持会话**（因此后续对话保持连贯）。
- **图像可以透传**（如果 CLI 接受图像路径）。

这被设计为一张**安全网**，而非主要路径。当您想要“始终有效”的文本响应而不依赖外部 API 时，请使用它。

## Beginner-friendly quick start

您无需任何配置即可使用 Claude Code CLI（OpenClaw 内置了默认配置）：

```bash
openclaw agent --message "hi" --model claude-cli/opus-4.6
```

Codex CLI 也能开箱即用：

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.4
```

如果您的网关在 launchd/systemd 下运行且 PATH 极小，只需添加命令路径：

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

就这样。除 CLI 本身外，无需密钥，也无需额外的身份验证配置。

## Using it as a fallback

将 CLI 后端添加到您的回退列表中，以便仅在主模型失败时运行它：

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

- 如果您使用 `agents.defaults.models` （允许列表），则必须包含 `claude-cli/...`。
- 如果主提供商失败（身份验证、速率限制、超时），OpenClaw 将
  接下来尝试 CLI 后端。

## Configuration overview

所有 CLI 后端均位于：

```
agents.defaults.cliBackends
```

每个条目都由提供商 ID（例如 `claude-cli`、`my-cli`）键控。
提供商 ID 将成为您的模型引用的左侧部分：

```
<provider>/<model>
```

### Example configuration

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
            "claude-opus-4-5": "opus",
            "claude-sonnet-4-5": "sonnet",
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

## How it works

1. **根据提供商前缀（`claude-cli/...`）选择后端。**
2. **使用相同的 OpenClaw 提示词 + 工作区上下文构建系统提示词。**
3. **执行 CLI** 时传入会话 ID（如果支持），以便历史记录保持一致。
4. **解析输出**（JSON 或纯文本）并返回最终文本。
5. **按后端持久化会话 ID**，以便后续对话重用同一 CLI 会话。

## Sessions

- 如果该 CLI 支持 CLI，请设置 `sessionArg`（例如 `--session-id`）或 `sessionArgs`（占位符 `{sessionId}`），以便在需要将 ID 插入到多个标志时使用。
- 如果该 CLI 使用带有不同标志的 **resume 子命令**，请设置 `resumeArgs`（恢复时替换 `args`）并可选择设置 `resumeOutput`（用于非 JSON 恢复）。
- `sessionMode`：
  - `always`：始终发送 CLI ID（如果没有存储则发送新的 UUID）。
  - `existing`：仅当之前存储过 CLI ID 时才发送。
  - `none`：从不发送 CLI ID。

## 图像（透传）

如果您的 CLI 接受图像路径，请设置 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 会将 base64 图像写入临时文件。如果设置了 `imageArg`，这些路径将作为 CLI 参数传递。如果缺少 `imageArg`，OpenClaw 会将文件路径附加到提示词中（路径注入），这对于能够从普通路径自动加载本地文件的 CLI 来说已经足够（Claude Code CLI 的行为）。

## 输入 / 输出

- `output: "json"`（默认）尝试解析 JSON 并提取文本 + CLI ID。
- `output: "jsonl"` 解析 JSONL 流（Codex CLI `--json`）并提取最后一条代理消息以及 `thread_id`（如果存在）。
- `output: "text"` 将 stdout 视为最终响应。

输入模式：

- `input: "arg"`（默认）将提示词作为最后一个 CLI 参数传递。
- `input: "stdin"` 通过 stdin 发送提示词。
- 如果提示词很长并且设置了 `maxPromptArgChars`，则使用 stdin。

## 默认值（内置）

OpenClaw 附带了 `claude-cli` 的默认值：

- `command: "claude"`
- `args: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions"]`
- `resumeArgs: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions", "--resume", "{sessionId}"]`
- `modelArg: "--model"`
- `systemPromptArg: "--append-system-prompt"`
- `sessionArg: "--session-id"`
- `systemPromptWhen: "first"`
- `sessionMode: "always"`

OpenClaw 还附带了 `codex-cli` 的默认值：

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

仅在需要时覆盖（常见：绝对 `command` 路径）。

## 限制

- **无 OpenClaw 工具**（CLI 后端永远不会接收工具调用）。某些 CLI 仍可能运行其自己的代理工具。
- **无流式传输**（CLI 输出会被收集然后返回）。
- **结构化输出**取决于 CLI 的 JSON 格式。
- **Codex CLI 会话**通过文本输出恢复（无 JSONL），其结构化程度低于初始 `--json` 运行。OpenClaw 会话仍可正常工作。

## 故障排除

- **找不到 CLI**：将 `command` 设置为完整路径。
- **模型名称错误**：使用 `modelAliases` 映射 `provider/model` → CLI 模型。
- **无会话连续性**：确保设置了 `sessionArg` 并且 `sessionMode` 未设置为 `none`（Codex CLI 目前无法通过 JSON 输出恢复）。
- **图像被忽略**：设置 `imageArg`（并验证 CLI 是否支持文件路径）。

import zh from "/components/footer/zh.mdx";

<zh />
