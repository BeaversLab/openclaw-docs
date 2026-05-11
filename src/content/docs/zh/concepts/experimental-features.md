---
summary: "OpenClaw 中的实验性标志的含义以及当前记录了哪些标志"
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

| 表面           | 键                                                        | 在以下情况下使用                                                              | 更多信息                                                                       |
| -------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 本地模型运行时 | `agents.defaults.experimental.localModelLean`             | 较小或较严格的本地后端无法处理 OpenClaw 的完整默认工具表面                    | [本地模型](/zh/gateway/local-models)                                           |
| 内存搜索       | `agents.defaults.memorySearch.experimental.sessionMemory` | 您希望 `memory_search` 索引先前的会话记录并接受额外的存储/索引成本            | [内存配置参考](/zh/reference/memory-config#session-memory-search-experimental) |
| 结构化规划工具 | `tools.experimental.planTool`                             | 您希望在兼容的运行时和 UI 中公开结构化 `update_plan` 工具，用于多步骤工作跟踪 | [Gateway(网关) 配置参考](/zh/gateway/config-tools#toolsexperimental)           |

## 本地模型精简模式

`agents.defaults.experimental.localModelLean: true` 是针对较弱本地模型设置的泄压阀。它会裁剪繁重的默认工具，例如 `browser`、`cron` 和 `message`，从而使提示形状更小，对于小上下文或更严格的 OpenAI 兼容后端来说也不那么脆弱。

这故意设计为**非**正常路径。如果您的后端能够干净利落地处理完整运行时，请保持关闭状态。

## 实验性并不意味着隐藏

如果某个功能是实验性的，OpenClaw 应该在文档和配置路径中明确说明。它**不应该**做的是将预览行为偷偷塞进一个看起来很稳定的默认旋钮，并假装这是正常的。这就是配置界面变得混乱的原因。

## 相关

- [功能](/zh/concepts/features)
- [发布渠道](/zh/install/development-channels)
