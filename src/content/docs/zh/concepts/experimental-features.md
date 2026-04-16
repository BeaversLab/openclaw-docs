---
title: "实验性功能"
summary: "OpenClaw 中实验性标志的含义以及当前已记录的实验性功能"
read_when:
  - You see an `.experimental` config key and want to know whether it is stable
  - You want to try preview runtime features without confusing them with normal defaults
  - You want one place to find the currently documented experimental flags
---

# 实验性功能

OpenClaw 中的实验性功能是**选择性启用的预览接口**。它们被放在显式标志之后，因为它们在成为稳定默认值或长期公共契约之前，仍需要在真实环境中积累更多使用经验。

请将它们与普通配置区别对待：

- 除非相关文档建议启用，否则请保持**默认关闭**。
- 预期其**形态和行为的变化**速度会比稳定配置更快。
- 如果已有稳定路径，请优先使用稳定路径。
- 如果你正在大规模部署 OpenClaw，请在将其纳入共享基线之前，先在较小的环境中测试实验性标志。

## 当前已记录的标志

| 接口           | 键                                                        | 适用场景                                                                        | 更多                                                                           |
| -------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 本地模型运行时 | `agents.defaults.experimental.localModelLean`             | 较小或更严格的本地后端无法承受 OpenClaw 完整的默认工具接口                      | [本地模型](/en/gateway/local-models)                                           |
| 记忆搜索       | `agents.defaults.memorySearch.experimental.sessionMemory` | 你希望 `memory_search` 索引先前的会话记录，并接受额外的存储/索引开销            | [记忆配置参考](/en/reference/memory-config#session-memory-search-experimental) |
| 结构化规划工具 | `tools.experimental.planTool`                             | 你希望在兼容的运行时和 UI 中暴露结构化的 `update_plan` 工具，用于多步骤工作跟踪 | [网关配置参考](/en/gateway/configuration-reference#toolsexperimental)          |

## 本地模型精简模式

`agents.defaults.experimental.localModelLean: true` 是针对较弱本地模型设置的减压阀。它会裁剪 `browser`、`cron` 和 `message` 等重量级默认工具，使提示词形态更小、更不容易出现问题，适合小上下文或更严格的 OpenAI 兼容后端。

这有意地**不是**常规路径。如果你的后端能够干净地处理完整运行时，请保持关闭此选项。

## 实验性不等于隐藏

如果某项功能是实验性的，OpenClaw 应该在文档和配置路径中明确说明。它**不应该**做的是将预览行为偷偷放入看起来稳定的默认开关中，然后假装这是正常的。那样只会让配置接口变得混乱。
