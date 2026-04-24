---
summary: "CLI 后端：具有可选 MCP 工具桥接的本地 AI CLI 回退机制"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Codex CLI or other local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "CLI 后端"
---

# CLI 后端（回退运行时）

当 API 提供商宕机、速率受限或暂时出现异常时，OpenClaw 可以将 **本地 AI CLI** 作为 **纯文本回退** 方案运行。这采用了有意保守的策略：

- **OpenClaw 工具不会被直接注入**，但是带有 `bundleMcp: true` 的后端
  可以通过回环 MCP 桥接接收网关工具。
- 为支持它的 CLI 提供 **JSONL 流式传输**。
- **支持会话**（因此后续轮次保持连贯）。
- **可以传递图像**，如果 CLI 接受图像路径。

这被设计为一张**安全网**，而不是主要路径。当你想要“始终有效”的文本响应而不依赖外部 API 时使用它。

如果您需要具有 ACP 会话控制、后台任务、线程/对话绑定以及持久化外部编码会话的完整运行时环境，请改用 [ACP Agents](/zh/tools/acp-agents)。CLI 后端不是 ACP。

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

如果您在网关主机上将捆绑的 CLI 后端用作
**主要消息提供商**，OpenClaw 现在会在您的配置
在模型引用中显式引用该后端或在
`agents.defaults.cliBackends` 下引用时自动加载拥有该后端的捆绑插件。

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

- 如果您使用 `agents.defaults.models`（允许列表），您必须在那里也包含您的 CLI 后端模型。
- 如果主提供商失败（身份验证、速率限制、超时），OpenClaw 将
  接下来尝试 CLI 后端。

## 配置概述

所有 CLI 后端均位于以下位置：

```
agents.defaults.cliBackends
```

每个条目都以一个 **提供商 ID**（例如 `codex-cli`，`my-cli`）为键。
提供商 ID 成为您的模型引用的左侧：

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
2. **使用相同的 OpenClaw 提示 + 工作区上下文构建系统提示**。
3. **执行 CLI** 并附带会话 ID（如果支持），以保持历史记录的一致性。
   捆绑的 `claude-cli` 后端为每个
   OpenClaw 会话保持一个 Claude stdio 进程处于活动状态，并通过 stream- stdin 发送后续对话轮次。
4. **解析输出**（JSON 或纯文本）并返回最终文本。
5. **按后端持久化会话 ID**，以便后续回复重用同一 CLI 会话。

<Note>捆绑的 Anthropic `claude-cli` 后端再次受到支持。Anthropic 工作人员 告诉我们，OpenClaw 风格的 Claude CLI 使用再次被允许，因此除非 Anthropic 发布 新政策，否则 OpenClaw 将 `claude -p` 的使用视为此集成所认可。</Note>

捆绑的 OpenAI `codex-cli` 后端通过 Codex 的 `model_instructions_file` 配置覆盖 (`-c
model_instructions_file="..."`) 传递 OpenClaw 的系统提示词。Codex 不公开类似 Claude 的 `--append-system-prompt` 标志，因此 OpenClaw 会将组装好的提示词写入临时文件，以供每个新的 Codex CLI 会话使用。

捆绑的 Anthropic `claude-cli` 后端通过两种方式接收 OpenClaw 技能快照：附加到系统提示词中的紧凑型 OpenClaw 技能目录，以及通过 `--plugin-dir` 传递的临时 Claude Code 插件。该插件仅包含该代理/会话符合条件的技能，因此 Claude Code 的原生技能解析器看到的过滤后集合与 OpenClaw 通常会在提示词中通告的集合相同。技能环境变量/API 密钥覆盖仍由 OpenClaw 应用于该运行的子进程环境。

## 会话

- 如果 CLI 支持会话，请设置 `sessionArg`（例如 `--session-id`）或 `sessionArgs`（占位符 `{sessionId}`），以便在需要将 ID 插入到多个标志时使用。
- 如果 CLI 使用具有不同标志的 **resume subcommand**，请设置 `resumeArgs`（恢复时替换 `args`）以及可选的 `resumeOutput`（用于非 JSON 恢复）。
- `sessionMode`：
  - `always`：始终发送会话 ID（如果未存储则发送新的 UUID）。
  - `existing`：仅在之前存储过会话 ID 时才发送。
  - `none`：从不发送会话 ID。
- `claude-cli` 默认为 `liveSession: "claude-stdio"`、`output: "jsonl"`
  和 `input: "stdin"`，以便后续轮次在活跃状态下重用实时 Claude 进程。
  现在默认使用热 stdio，包括省略传输字段的自定义配置。如果 Gateway(网关) 重启或空闲进程
  退出，OpenClaw 将从存储的 Claude 会话 id 恢复。存储的会话
  id 在恢复前会根据现有的可读项目记录进行验证，因此幻影绑定将使用 `reason=transcript-missing` 清除，
  而不是在 `--resume` 下静默启动一个新的 Claude CLI 会话。
- 存储的 CLI 会话是提供商拥有的连续性。隐式的每日会话重置
  不会切断它们；`/reset` 和显式的 `session.reset` 策略仍然会。

序列化说明：

- `serialize: true` 保持同车道运行的有序性。
- 大多数 CLI 在单个提供商车道上进行序列化。
- 当选定的身份标识发生更改时，OpenClaw 会丢弃存储的 CLI 会话重用，包括更改的身份配置文件 ID、静态 API 密钥、静态令牌，或者当 OAuth 暴露身份时的 CLI 帐户身份。OAuth 访问令牌和刷新令牌的轮换不会切断存储的 CLI 会话。如果 CLI 未暴露稳定的 OAuth 帐户 ID，OpenClaw 将允许该 CLI 强制执行恢复权限。

## 图像（直通）

如果您的 CLI 接受图像路径，请设置 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 会将 base64 图像写入临时文件。如果设置了 `imageArg`，这些路径将作为 CLI 参数传递。如果缺少 `imageArg`，OpenClaw 会将文件路径追加到提示词（路径注入），这对于自动从普通路径加载本地文件的 CLI 来说已经足够了。

## 输入 / 输出

- `output: "json"` （默认）尝试解析 JSON 并提取文本 + 会话 ID。
- 对于 Gemini CLI JSON 输出，当 `usage` 缺失或为空时，OpenClaw 从 `response` 读取回复文本，并从 `stats` 读取使用情况。
- `output: "jsonl"` 解析 JSONL 流（例如 Codex CLI `--json`）并提取最终代理消息以及（如果存在的）会话标识符。
- `output: "text"` 将 stdout 视为最终响应。

输入模式：

- `input: "arg"` （默认）将提示作为最后一个 CLI 参数传递。
- `input: "stdin"` 通过 stdin 发送提示。
- 如果提示非常长且设置了 `maxPromptArgChars`，则使用 stdin。

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

前提条件：必须安装本地 Gemini CLI 并在 `PATH` （`brew install gemini-cli` 或
`npm install -g @google/gemini-cli`）上作为 `gemini` 可用。

Gemini CLI JSON 说明：

- 回复文本从 JSON `response` 字段读取。
- 当 `usage` 缺失或为空时，使用情况回退到 `stats`。
- `stats.cached` 被规范化为 OpenClaw `cacheRead`。
- 如果缺失 `stats.input`，OpenClaw 会从 `stats.input_tokens - stats.cached` 推导输入令牌。

仅在需要时覆盖（常见：绝对 `command` 路径）。

## 插件拥有的默认值

CLI 后端默认值现在是插件界面的一部分：

- 插件通过 `api.registerCliBackend(...)` 注册它们。
- 后端 `id` 成为模型引用中的提供商前缀。
- `agents.defaults.cliBackends.<id>` 中的用户配置仍然会覆盖插件默认值。
- 特定于后端的配置清理通过可选的 `normalizeConfig` 钩子保持由插件拥有。

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

`input` 重写给 CLI 传递的系统提示和用户提示。`output` 在 OpenClaw 处理其自己的控制标记和渠道交付之前，重写流式助手增量和解析后的最终文本。

对于发出 Claude Code stream- 兼容 JSONL 的 CLI，请在该后端的配置上设置 `jsonlDialect: "claude-stream-json"`。

## 打包 MCP 覆盖层

CLI 后端并**不**直接接收 OpenClaw 工具调用，但后端可以通过 `bundleMcp: true` 选择加入生成的 MCP 配置覆盖层。

当前的打包行为：

- `claude-cli`：生成的严格 MCP 配置文件
- `codex-cli`：针对 `mcp_servers` 的内联配置覆盖
- `google-gemini-cli`：生成的 Gemini 系统设置文件

当启用 bundle MCP 时，OpenClaw：

- 启动一个回环 HTTP MCP 服务器，向 CLI 进程暴露网关工具
- 使用每次会话的令牌 (`OPENCLAW_MCP_TOKEN`) 对网桥进行身份验证
- 将工具访问范围限定在当前会话、账户和渠道上下文
- 为当前工作区加载已启用的 bundle-MCP 服务器
- 将其与任何现有的后端 MCP 配置/设置形状合并
- 使用来自所属扩展的后端拥有的集成模式重写启动配置

如果未启用 MCP 服务器，当后端选择加入 bundle MCP 时，OpenClaw 仍会注入一个严格的配置，以便后台运行保持隔离。

## 限制

- **无直接的 OpenClaw 工具调用。** OpenClaw 不会将工具调用注入到 CLI 后端协议中。后端只有在选择加入 `bundleMcp: true` 时才能看到网关工具。
- **流式传输取决于后端。** 某些后端流式传输 JSONL；其他后端则会缓冲直到退出。
- **结构化输出**取决于 CLI 的 JSON 格式。
- **Codex CLI 会话**通过文本输出恢复（无 JSONL），其结构化程度低于初始的 `--json` 运行。OpenClaw 会话仍然正常工作。

## 故障排除

- **找不到 CLI**：将 `command` 设置为完整路径。
- **模型名称错误**：使用 `modelAliases` 将 `provider/model` 映射到 CLI 模型。
- **无会话连续性**：确保已设置 `sessionArg` 且 `sessionMode` 不是 `none`（Codex CLI 目前无法通过 JSON 输出恢复）。
- **图像被忽略**：设置 `imageArg`（并验证 CLI 是否支持文件路径）。
