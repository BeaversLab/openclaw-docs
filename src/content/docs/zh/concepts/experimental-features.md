---
title: "实验性功能"
summary: "OpenClaw 中的实验性标志的含义以及当前记录了哪些标志"
read_when:
  - You see an `.experimental` config key and want to know whether it is stable
  - You want to try preview runtime features without confusing them with normal defaults
  - You want one place to find the currently documented experimental flags
---

# 实验性功能

OpenClaw 中的实验性功能是**可选加入的预览功能**。它们之所以位于显式标志之后，是因为在值得成为稳定的默认设置或长期存在的公共契约之前，它们仍需要实际应用中的检验。

请以不同于普通配置的方式对待它们：

- 除非相关文档告知您尝试某一功能，否则保持**默认关闭**。
- 预期其**形状和行为**的变化速度将快于稳定配置。
- 当已经存在稳定路径时，请优先选择稳定路径。
- 如果您正在大范围推广 OpenClaw，请先在较小的环境中测试实验性标志，然后再将其纳入共享基线。

## 当前记录的标志

| Surface        | Key                                                       | 使用场景                                                                              | 更多                                                                            |
| -------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 本地模型运行时 | `agents.defaults.experimental.localModelLean`             | 较小或较严格的本地后端无法处理 OpenClaw 的完整默认工具 Surface                        | [本地模型](/en/gateway/local-models)                                            |
| 记忆搜索       | `agents.defaults.memorySearch.experimental.sessionMemory` | 您希望 `memory_search` 索引之前的会话记录并接受额外的存储/索引成本                    | [内存配置参考](/en/reference/memory-config#session-memory-search-experimental)  |
| 结构化规划工具 | `tools.experimental.planTool`                             | 您希望结构化 `update_plan` 工具暴露出来，以便在兼容的运行时和 UI 中进行多步骤工作跟踪 | [Gateway(网关) 配置参考](/en/gateway/configuration-reference#toolsexperimental) |

## 本地模型精简模式

`agents.defaults.experimental.localModelLean: true` 是针对较弱本地模型设置的减压阀。它会修剪像
`browser`、`cron` 和 `message` 这样的重量级默认工具，从而使提示形状更小，对于小上下文或更严格的 OpenAI 兼容后端来说也不那么脆弱。

这有意**不是**正常的路径。如果您的后端可以干净利落地处理完整的运行时，请保持关闭状态。

## 实验性并不意味着隐藏

如果某个功能是实验性的，OpenClaw 应该在文档和配置路径中明确说明。它**不应该**做的是将预览行为偷偷混入看起来稳定的默认旋钮，并假装那是正常的。这正是配置界面变得混乱的原因。
