---
doc-schema-version: 1
summary: "OpenClawOpenClaw 工具、技能和插件概述：代理可以调用什么以及如何扩展它们"
read_when:
  - You want to understand what tools OpenClaw provides
  - You are deciding between built-in tools, skills, and plugins
  - You need the right docs entry point for tool policy, automation, or agent coordination
title: "概述"
---

使用此页面选择合适的功能界面。**工具**是可调用的操作，**技能**教代理如何工作，而**插件**添加运行时功能，例如工具、提供商、渠道、钩子和打包的技能。

这是一个概览和路由页面。有关详尽的工具策略、默认设置、组成员资格、提供商限制和配置字段，请使用 [Tools and custom providers](/zh/gateway/config-tools)。

## 从这里开始

对于大多数智能体，请先从内置工具类别入手，然后仅在智能体应看到更少工具或需要显式主机访问权限时调整策略。

| 如果您需要……                 | 首先使用此功能                              | 然后阅读                                                                                                               |
| ---------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 让智能体使用现有功能执行操作 | [内置工具](#built-in-tool-categories)       | [工具类别](#built-in-tool-categories)                                                                                  |
| 控制智能体可以调用的内容     | [工具策略](#configure-access-and-approvals) | [工具和自定义提供商](/zh/gateway/config-tools)                                                                         |
| 教代理一个工作流             | [Skills](#choose-tools-skills-or-plugins)   | [Skills](/zh/tools/skills)、[Creating skills](/zh/tools/creating-skills) 和 [Skill Workshop](/zh/tools/skill-workshop) |
| 添加新的集成或运行时界面     | [Plugins](#extend-capabilities)             | [Plugins](/zh/tools/plugin) 和 [Build plugins](/zh/plugins/building-plugins)                                           |
| 稍后或后台运行工作           | [Automation](/zh/automation)                | [Automation overview](/zh/automation)                                                                                  |
| 协调多个代理或进程           | [Sub-agents](/zh/tools/subagents)           | [ACP agents](/zh/tools/acp-agents) 和 [Agent send](/zh/tools/agent-send)                                               |
| 搜索大型 OpenClaw 工具目录   | [Tool Search](/zh/tools/tool-search)        | [Tool Search](/zh/tools/tool-search)                                                                                   |

## 选择工具、技能或插件

<Steps>
  <Step title="当代理需要执行操作时，请使用工具">
    工具是代理可以调用的类型化函数，例如 `exec`、`browser`、
    `web_search`、`message` 或 `image_generate`。当代理
    需要读取数据、更改文件、发送消息、调用提供商或操作
    其他系统时，请使用工具。可见工具作为结构化函数
    定义发送到模型。

    模型只能看到在活动配置文件、允许/拒绝
    策略、提供商限制、沙箱状态、渠道权限和
    插件可用性筛选后剩余的工具。

  </Step>

  <Step title="当 Agent 需要指令时使用 Skill">
    Skill 是加载到 Agent 提示词中的 `SKILL.md` 指令包。当 Agent 已拥有所需工具，但需要可重复的工作流、评审标准、命令序列或操作约束时，请使用 Skill。

    Skills 可以位于工作区、共享技能目录、托管 OpenClaw 技能根目录或插件包中。

    [Skills](/zh/tools/skills) | [Skill Workshop](/zh/tools/skill-workshop) | [Creating skills](/zh/tools/creating-skills) | [Skills config](/zh/tools/skills-config)

  </Step>

  <Step title="当 OpenClaw 需要新功能时使用插件">
    插件可以添加工具、Skills、渠道、模型提供商、语音、实时语音、媒体生成、Web 搜索、Web 获取、钩子以及其他运行时功能。当该功能包含代码、凭据、生命周期钩子、清单元数据或可安装包时，请使用插件。现有插件可以从 ClawHub、npm、git、本地目录或归档文件中安装。

    [Install and configure plugins](/zh/tools/plugin) | [Build plugins](/zh/plugins/building-plugins) | [Plugin SDK](/zh/plugins/sdk-overview)

  </Step>
</Steps>

## 内置工具类别

该表列出了代表性工具，以便您了解相关功能。它并非完整的策略参考。有关确切的分组、默认值以及允许/拒绝语义，请参阅[工具和自定义提供商](/zh/gateway/config-tools)。

| 类别                 | 当代理需要...时使用                                      | 代表性工具                                                           | 下一步阅读                                                                                                                                             |
| -------------------- | -------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 运行时               | 运行命令、管理进程或使用提供商支持的 Python 分析         | `exec`, `process`, `code_execution`                                  | [Exec](%%PH:LINK_TARGET:80:ff6093e8%)、[代码执行](/zh/tools/exec/en/tools/code-execution)                                                              |
| 文件                 | 读取和更改工作区文件                                     | `read`, `write`, `edit`, `apply_patch`                               | [应用补丁](/zh/tools/apply-patch)                                                                                                                      |
| 网页                 | 搜索网络、搜索 X 帖子或获取可读的页面内容                | `web_search`、`x_search`、`web_fetch`                                | [Web 工具](%%PH:LINK_TARGET:83:5a05a47b%)、[Web 获取](/zh/tools/web/en/tools/web-fetch)                                                                |
| 浏览器               | 操作浏览器会话                                           | `browser`                                                            | [浏览器](/zh/tools/browser)                                                                                                                            |
| 消息传递和渠道       | 发送回复或渠道操作                                       | `message`                                                            | [Agent 发送](/zh/tools/agent-send)                                                                                                                     |
| 会话和代理           | 检查会话、委托工作、引导另一次运行或报告状态             | `sessions_*`、`subagents`、`agents_list`、`session_status`、`goal`   | [目标](%%PH:LINK_TARGET:87:af408bd8%)、[子代理](%%PH:LINK_TARGET:88:3706b151%)、[会话工具](/zh/tools/goal/en/tools/subagents/en/concepts/session-tool) |
| 自动化               | 安排工作或响应后台事件                                   | `cron`、`heartbeat_respond`                                          | [自动化](/zh/automation)                                                                                                                               |
| Gateway(网关) 和节点 | 检查 Gateway(网关) 状态或已配对的目标设备                | `gateway`、`nodes`                                                   | [Gateway(网关)配置](%%PH:LINK_TARGET:91:680a3dd4%)、[节点](<Gateway(网关)/en/gateway/configuration/en/nodes>)                                          |
| 媒体                 | 分析、生成或播放媒体                                     | `image`、`image_generate`、`music_generate`、`video_generate`、`tts` | [媒体概览](/zh/tools/media-overview)                                                                                                                   |
| 大型 OpenClaw 目录   | 搜索并调用许多符合条件的工具，而无需将每个架构发送给模型 | `tool_search_code`，`tool_search`，`tool_describe`                   | [工具搜索](/zh/tools/tool-search)                                                                                                                      |

<Note>工具搜索是一项实验性的 OpenClaw 代理界面。Codex harness 运行使用 Codex 原生代码模式、原生工具搜索、延迟动态工具和嵌套工具调用， 而不是 `tools.toolSearch`。</Note>

## 插件提供的工具

插件可以注册其他工具。插件作者通过 `api.registerTool(...)` 和清单的 `contracts.tools` 连接工具；有关合同详细信息，请参阅[插件 SDK](/zh/plugins/sdk-overview) 和[插件清单](/zh/plugins/manifest)。

常见的插件提供的工具包括：

- [Diffs](/zh/tools/diffs) 用于渲染文件和 Markdown 差异
- [LLM Task](LLM/en/tools/llm-task) 用于仅限 JSON 的工作流步骤
- [Lobster](Lobster/en/tools/lobster) 用于具有可恢复审批的类型化工作流
- [Tokenjuice](/zh/tools/tokenjuice) 用于压缩嘈杂的 `exec` 和 `bash` 工具输出
- [工具搜索](/zh/tools/tool-search) 用于发现和调用大型工具目录，而无需将每个架构放入提示中
- [Canvas](Canvas/en/plugins/reference/canvasCanvas) 用于节点 Canvas 控制和 A2UI 渲染

## 配置访问和批准

工具策略在模型调用之前执行。如果策略移除了某个工具，模型在该轮对话中将不会收到该工具的架构。运行可能会因为全局配置、每个代理的配置、渠道策略、提供商限制、沙箱规则、渠道/运行时策略或插件可用性而丢失工具。

- [工具和自定义提供商](/zh/gateway/config-tools) 记录了工具配置文件、允许/拒绝列表、提供商特定限制、循环检测以及提供商支持的工具设置。
- [Exec approvals](/zh/tools/exec-approvals) 文档介绍了主机命令批准策略。
- [Elevated exec](/zh/tools/elevated) 文档介绍了在沙箱之外进行受控执行的相关内容。
- [沙箱 vs 工具 policy vs elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) 解释了哪一层控制文件和进程访问。
- [Per-agent sandbox and 工具 restrictions](/zh/tools/multi-agent-sandbox-tools)
  文档介绍了委托运行的代理特定限制。

## 扩展能力

根据您需要 OpenClaw 执行的任务选择扩展路径：

- 使用 [Plugins](/zh/tools/plugin) 安装或管理现有插件。
- 使用 [Build plugins](/zh/plugins/building-plugins) 构建新的集成、提供商、渠道、工具或 Hook。
- 使用 [Skills](/zh/tools/skills) 和
  [Creating skills](/zh/tools/creating-skills) 添加或调整可重用的代理指令。
- 当需要实现合约时，请使用 [Plugin SDK](/zh/plugins/sdk-overview) 和 [Plugin manifest](/zh/plugins/manifest)。

## 工具缺失故障排除

如果模型无法看到或调用工具，请从当前轮次的有效策略开始：

1. 在 [Tools and custom providers](/zh/gateway/config-tools) 中检查活动配置文件、`tools.allow` 和 `tools.deny`。
2. 在 [Tools and custom providers](/zh/gateway/config-tools) 中检查特定于提供商的限制，并确认所选的 [模型 提供商](/zh/concepts/model-providers) 支持该工具形状。
3. 使用 [沙箱 vs 工具 policy vs elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) 和 [Elevated exec](/zh/tools/elevated) 检查渠道权限、沙箱状态和提升访问权限。
4. 在 [Plugins](/zh/tools/plugin) 中检查所属插件是否已安装并启用。
5. 对于委托运行，请在 [Per-agent sandbox and 工具 restrictions](/zh/tools/multi-agent-sandbox-tools) 中检查每个代理的限制。
6. 对于大型 OpenClaw 目录，请确认运行使用的是直接工具暴露还是
   [Tool Search](/zh/tools/tool-search)。

## 相关

- [Automation](/zh/automation)，用于 cron、任务、心跳、承诺、Hook、常设订单和 Task Flow
- [Agents](/zh/concepts/agent)，用于代理模型、会话、内存和多代理协调
- 有关规范工具策略参考，请参阅[工具和自定义提供商](/zh/gateway/config-tools)
- 有关插件安装和管理，请参阅[插件](/zh/tools/plugin)
- 有关插件作者参考，请参阅[插件 SDK](/zh/plugins/sdk-overview)
- 有关技能加载顺序、控制和配置，请参阅[技能](/zh/tools/skills)
- 有关生成和审核的技能创建，请参阅[技能工作坊](/zh/tools/skill-workshop)
- 有关紧凑的 OpenClaw 工具目录发现，请参阅[工具搜索](/zh/tools/tool-searchOpenClaw)
