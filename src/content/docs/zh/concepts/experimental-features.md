---
summary: "OpenClawOpenClaw 中的实验性标志的含义以及当前记录了哪些标志"
title: "实验性功能"
read_when:
  - You see an `.experimental` config key and want to know whether it is stable
  - You want to try preview runtime features without confusing them with normal defaults
  - You want one place to find the currently documented experimental flags
---

OpenClaw 中的实验性功能是**可选加入的预览功能**。它们之所以位于显式标志之后，是因为在它们有资格成为稳定的默认设置或长期存在的公共契约之前，仍需要现实世界的验证。

请以不同于正常配置的方式对待它们：

- 除非相关文档告诉您尝试使用，否则请保持它们**默认关闭**。
- 预期其**形状和行为的变化**速度会比稳定配置快。
- 当已经存在稳定的路径时，优先选择它。
- 如果您正在广泛推广 OpenClaw，请在将实验性标志纳入共享基线之前，先在较小的环境中进行测试。

## 当前记录的标志

| 表面           | 键                                                                                         | 在以下情况下使用                                                                                               | 更多信息                                                                             |
| -------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 本地模型运行时 | `agents.defaults.experimental.localModelLean`、`agents.list[].experimental.localModelLean` | 较小或较严格的本地后端无法处理 OpenClaw 的完整默认工具表面                                                     | [本地模型](/zh/gateway/local-models)                                                 |
| 内存搜索       | `agents.defaults.memorySearch.experimental.sessionMemory`                                  | 您希望 `memory_search` 索引先前的会话记录并接受额外的存储/索引开销                                             | [内存配置参考](/zh/reference/memory-config#session-memory-search-experimental)       |
| Codex 控制工具 | `plugins.entries.codex.config.appServer.experimental.sandboxExecServer`                    | 您希望原生的 Codex 应用服务器 0.132.0 或更新版本，将后端执行服务器定为由 OpenClaw 沙盒支持，而不是禁用代码模式 | [Codex 控制工具参考](/zh/plugins/codex-harness-reference#sandboxed-native-execution) |
| 结构化规划工具 | `tools.experimental.planTool`                                                              | 您希望在兼容的运行时和 UI 中公开结构化的 `update_plan` 工具，用于多步骤工作跟踪                                | [Gateway(网关) 配置参考](<Gateway(网关)/en/gateway/config-tools#toolsexperimental>)  |

## 本地模型精简模式

`agents.defaults.experimental.localModelLean: true`OpenClaw 是针对较弱本地模型设置的一个减压阀。开启后，OpenClaw 会在每一轮从代理的工具表面中移除三个默认工具 —— `browser`、`cron` 和 `message`。其他一切保持不变。使用 `agents.list[].experimental.localModelLean` 可为单个配置的代理启用或禁用此行为。

### 为什么是这三个工具

在默认的 OpenClaw 运行时中，这三个工具拥有最长的描述和最多的参数形式。在小上下文或更严格的 OpenAI 兼容后端上，这正是以下情况之间的差异所在：

- 工具架构能整洁地放入提示词中，还是挤占对话历史的空间。
- 模型能选择正确的工具，还是因为外观相似的架构太多而发出格式错误的工具调用。
- Chat Completions 适配器保持在服务器的结构化输出限制内，还是因工具调用负载过大而触发 400 错误。

移除它们不会在后台静默改变 OpenClaw 的行为 —— 它只是让工具列表变短了。模型仍然可以使用 OpenClaw`read`、`write`、`edit`、`exec`、`apply_patch`、网络搜索/获取（已配置时）、内存以及会话/代理工具。

### 何时开启它

当您已经证明模型可以与 Gateway(网关) 通信，但完整的 Agent 轮次表现异常时，请启用精简模式。典型的信号链如下：

1. `openclaw infer model run --gateway --model <ref> --prompt "Reply with exactly: pong"` 成功。
2. 正常的 Agent 轮次失败，表现为工具调用格式错误、提示词过大或模型忽略其工具。
3. 切换 `localModelLean: true` 可消除该故障。

### 何时应保持关闭

如果您的后端能够干净利落地处理完整的默认运行时，请保持此项关闭。精简模式是一种变通方案，而非默认设置。它的存在是因为某些本地环境需要较小的工具接口才能正常运行；托管模型和资源充足的本地设备则不需要。

精简模式也不能替代 `tools.profile`、`tools.allow`/`tools.deny` 或模型 `compat.supportsTools: false` 逃生舱。如果您需要为特定 Agent 永久使用更窄的工具接口，请优先使用这些稳定的控制项，而不是实验性标志。

### 启用

```json5
{
  agents: {
    defaults: {
      experimental: {
        localModelLean: true,
      },
    },
  },
}
```

仅针对单个 Agent：

```json5
{
  agents: {
    list: [
      {
        id: "local",
        model: "lmstudio/gemma-4-e4b-it",
        experimental: {
          localModelLean: true,
        },
      },
    ],
  },
}
```

更改标志后重启 Gateway(网关)，然后使用以下命令确认精简后的工具列表：

```bash
openclaw status --deep
```

深度状态输出列出了活动的 Agent 工具；当精简模式开启时，`browser`、`cron` 和 `message` 应该不存在。

## 实验性并不意味着隐藏

如果某个功能是实验性的，OpenClaw 应该在文档和配置路径本身中明确说明。它**不应该**做的是将预览行为偷偷塞进看起来稳定的默认控制项中，并假装这是正常的。这正是配置界面变得混乱的原因。

## 相关

- [功能](/zh/concepts/features)
- [发布渠道](/zh/install/development-channels)
