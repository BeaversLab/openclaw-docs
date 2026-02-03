---
summary: "CLI 后端：本地 AI CLI 的纯文本回退"
read_when:
  - 需要在 API provider 失败时有可靠回退
  - 运行 Claude Code CLI 或其他本地 AI CLI 并希望复用
  - 需要纯文本、无工具但仍支持会话/图片的路径
title: "CLI 后端"
---
# CLI backends（回退运行时）

当 API providers 宕机、限流或短暂异常时，OpenClaw 可运行**本地 AI CLI** 作为**纯文本回退**。此路径刻意保守：

- **禁用工具**（不调用工具）。
- **文本输入 → 文本输出**（可靠）。
- **支持会话**（保证连续对话）。
- **可传递图片**（若 CLI 支持图片路径）。

这是**安全网**而非主路径。适用于想要“总能回复”的文本输出，而不依赖外部 API。

## 新手快速开始

Claude Code CLI 可**零配置**使用（OpenClaw 内置默认）：

```bash
openclaw agent --message "hi" --model claude-cli/opus-4.5
```

Codex CLI 也可直接使用：

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.2-codex
```

若 gateway 运行在 launchd/systemd 且 PATH 很精简，只需提供命令路径：

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude"
        }
      }
    }
  }
}
```

无需 keys 或额外认证配置，前提是 CLI 自身已可运行。

## 作为回退使用

将 CLI backend 加入回退列表，使其仅在主模型失败时运行：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-5",
        fallbacks: [
          "claude-cli/opus-4.5"
        ]
      },
      models: {
        "anthropic/claude-opus-4-5": { alias: "Opus" },
        "claude-cli/opus-4.5": {}
      }
    }
  }
}
```

注：
- 若使用 `agents.defaults.models`（allowlist），必须包含 `claude-cli/...`。
- 主 provider 失败（认证、限流、超时）时，OpenClaw 会转用 CLI backend。

## 配置概览

所有 CLI backends 位于：

```
agents.defaults.cliBackends
```

每个条目以**provider id** 为键（例如 `claude-cli`、`my-cli`）。
该 provider id 作为模型引用左侧：

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
          command: "/opt/homebrew/bin/claude"
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          input: "arg",
          modelArg: "--model",
          modelAliases: {
            "claude-opus-4-5": "opus",
            "claude-sonnet-4-5": "sonnet"
          },
          sessionArg: "--session",
          sessionMode: "existing",
          sessionIdFields: ["session_id", "conversation_id"],
          systemPromptArg: "--system",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          serialize: true
        }
      }
    }
  }
}
```

## 工作原理

1) 基于 provider 前缀选择 backend（`claude-cli/...`）。
2) 使用同一 OpenClaw prompt + workspace 上下文构建 system prompt。
3) 若支持会话，调用 CLI 并传入 session id 以保持历史一致。
4) 解析 CLI 输出（JSON 或文本），返回最终文本。
5) 每个 backend 维持自身的 session id，后续复用同一 CLI 会话。

## 会话

- 若 CLI 支持会话，设置 `sessionArg`（如 `--session-id`）或
  `sessionArgs`（在多个 flag 中插入 `{sessionId}`）。
- 若 CLI 使用**resume 子命令**且 flags 不同，设置
  `resumeArgs`（恢复时替代 `args`）并可选 `resumeOutput`
  （用于非 JSON resume）。
- `sessionMode`：
  - `always`：总是发送 session id（若无则新建 UUID）。
  - `existing`：仅在已存储 session id 时发送。
  - `none`：从不发送 session id。

## 图片（直通）

若 CLI 接受图片路径，设置 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 会将 base64 图片写入临时文件。若设置了 `imageArg`，这些路径会作为 CLI 参数传递。
若缺少 `imageArg`，OpenClaw 会把路径追加到 prompt（路径注入），对能从纯路径自动加载本地文件的 CLI 也足够（Claude Code CLI 行为）。

## 输入 / 输出

- `output: "json"`（默认）解析 JSON 并提取文本 + session id。
- `output: "jsonl"` 解析 JSONL 流（Codex CLI `--json`），提取最后一条 agent 消息与 `thread_id`（若有）。
- `output: "text"` 将 stdout 作为最终响应。

输入模式：
- `input: "arg"`（默认）将 prompt 作为最后一个 CLI 参数。
- `input: "stdin"` 通过 stdin 发送 prompt。
- 若 prompt 很长且设置了 `maxPromptArgChars`，则改用 stdin。

## 默认值（内置）

OpenClaw 内置 `claude-cli` 默认值：

- `command: "claude"`
- `args: ["-p", "--output-format", "json", "--dangerously-skip-permissions"]`
- `resumeArgs: ["-p", "--output-format", "json", "--dangerously-skip-permissions", "--resume", "{sessionId}"]`
- `modelArg: "--model"`
- `systemPromptArg: "--append-system-prompt"`
- `sessionArg: "--session-id"`
- `systemPromptWhen: "first"`
- `sessionMode: "always"`

OpenClaw 也内置 `codex-cli` 默认值：

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

仅在需要时覆盖（常见：`command` 绝对路径）。

## 限制

- **无 OpenClaw 工具**（CLI backend 从不接收工具调用）。部分 CLI 可能仍运行自身 agent 工具。
- **无 streaming**（CLI 输出收集后一次返回）。
- **结构化输出**取决于 CLI 的 JSON 格式。
- **Codex CLI 会话**恢复使用文本输出（无 JSONL），结构性弱于初次 `--json` 运行，但 OpenClaw 会话仍正常。

## 排查

- **找不到 CLI**：将 `command` 设置为完整路径。
- **模型名不匹配**：使用 `modelAliases` 将 `provider/model` 映射到 CLI 模型名。
- **会话不连续**：确保设置 `sessionArg` 且 `sessionMode` 非 `none`（Codex CLI 目前无法以 JSON 输出恢复）。
- **图片被忽略**：设置 `imageArg`（并确认 CLI 支持文件路径）。
