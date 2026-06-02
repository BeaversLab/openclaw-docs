---
summary: "OpenClaw关于 OpenClaw 设置、配置和使用的常见问题"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常见问题"
---

针对真实环境设置（本地开发、VPS、多代理、OAuth/API 密钥、模型故障转移）的快速解答及更深入的故障排除。有关运行时诊断，请参阅 [Troubleshooting](/zh/gateway/troubleshooting)。有关完整配置参考，请参阅 [Configuration](/zh/gateway/configuration)。

## 如果出现故障，最初的 60 秒

1. **快速状态（首要检查）**

   ```bash
   openclaw status
   ```

   快速本地摘要：操作系统 + 更新、网关/服务可达性、代理/会话、提供商配置 + 运行时问题（当网关可达时）。

2. **可粘贴的报告（可安全分享）**

   ```bash
   openclaw status --all
   ```

   带有日志尾部（已编辑敏感信息）的只读诊断。

3. **守护进程 + 端口状态**

   ```bash
   openclaw gateway status
   ```

   显示监督程序运行时与 RPC 可达性、探测目标 URL，以及服务可能使用的配置。

4. **深度探测**

   ```bash
   openclaw status --deep
   ```

   运行实时网关健康探测，包括支持时的渠道探测
   （需要可访问的网关）。请参阅 [Health](/zh/gateway/health)。

5. **追踪最新日志**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 故障，请回退到：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   文件日志与服务日志是分开的；请参阅 [Logging](/zh/logging) 和 [Troubleshooting](/zh/gateway/troubleshooting)。

6. **运行医生（修复）**

   ```bash
   openclaw doctor
   ```

   修复/迁移配置/状态并运行健康检查。请参阅 [Doctor](/zh/gateway/doctor)。

7. **Gateway(网关) 快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向正在运行的网关请求完整快照（仅限 WS）。请参阅[运行状况](/zh/gateway/health)。

## 快速开始和首次运行设置

首次运行常见问题解答（Q&A）——安装、入门、身份验证路由、订阅、初始失败——
位于[首次运行常见问题解答](/zh/help/faq-first-run)。

## 什么是 OpenClaw？

<AccordionGroup>
  <Accordion title="OpenClawOpenClaw 是什么，用一段话概括？"OpenClawWhatsAppTelegramSlackMattermostDiscordGoogle ChatSignaliMessageWebChatCanvasGateway(网关)>
    OpenClaw 是一个在您自己的设备上运行的个人 AI 助手。它会在您已经使用的消息平台上回复（WhatsApp、Telegram、Slack、Mattermost、Discord、Google Chat、Signal、iMessage、WebChat 以及捆绑的渠道插件，如 QQ Bot），并且还可以在支持的平台上进行语音交互和使用实时 Canvas。**Gateway(网关)** 是常驻的控制平面；而助手才是核心产品。
  </Accordion>

  <Accordion title="Value proposition"OpenClawGateway(网关)LinuxWhatsAppTelegramSlackDiscordSignaliMessageCanvasAnthropicOpenAIMiniMaxOpenRouterGateway(网关)>
    OpenClaw 不仅仅是“一个 Claude 包装器”。它是一个**本地优先的控制平面**，让你在**自己的硬件**上运行一个功能强大的助手，可以从你已经在使用的聊天应用程序访问，具有有状态的会话、记忆和工具——无需将工作流程的控制权交给托管的 SaaS。

    亮点：

    - **你的设备，你的数据：**在你想要的任何地方运行 Gateway(网关)（Mac、Linux、VPS），并将工作区+会话历史保留在本地。
    - **真实渠道，而非网络沙箱：**WhatsApp/Telegram/Slack/Discord/Signal/iMessage/等，以及受支持平台上的移动语音和 Canvas。
    - **模型无关：**使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，具有按代理的路由和故障转移。
    - **仅限本地选项：**运行本地模型，因此如果你愿意，**所有数据都可以保留在你的设备上**。
    - **多代理路由：**按渠道、账户或任务分离代理，每个代理都有自己的工作区和默认设置。
    - **开源且可修改：**检查、扩展和自托管，没有供应商锁定。

    文档：[Gateway(网关)](/zh/gateway)、[渠道](/zh/channels)、[多代理](/zh/concepts/multi-agent)、
    [记忆](/zh/concepts/memory)。

  </Accordion>

  <Accordion title="我刚设置好——首先应该做什么？">
    不错的入门项目：

    - 构建一个网站（WordPress、Shopify 或简单的静态站点）。
    - 制作移动应用原型（大纲、界面、API 计划）。
    - 整理文件和文件夹（清理、命名、打标签）。
    - 连接 Gmail 并自动生成摘要或跟进。

    它可以处理大型任务，但如果你将其拆分为阶段并
    使用子代理进行并行工作，效果最佳。

  </Accordion>

  <Accordion title="OpenClawOpenClaw 的前五大日常用例是什么？"Gateway(网关)>
    日常的成功案例通常包括：

    - **个人简报：** 您关心的收件箱、日历和新闻摘要。
    - **研究和起草：** 快速研究、摘要，以及电子邮件或文档的初稿。
    - **提醒和跟进：** 由 cron 或心跳驱动的提醒和检查清单。
    - **浏览器自动化：** 填写表单、收集数据以及重复执行网络任务。
    - **跨设备协调：** 从手机发送任务，让 Gateway(网关) 在服务器上运行，并在聊天中获取结果。

  </Accordion>

  <Accordion title="OpenClawOpenClaw 可以协助 SaaS 进行潜客挖掘、外联、广告投放和博客撰写吗？"OpenClaw>
    可以用于 **研究、资格审查和起草**。它可以扫描网站、建立候选名单、
    总结潜在客户，并撰写外联或广告文案草稿。

    对于 **外联或广告投放**，请保持人工参与。避免垃圾信息，遵守当地法律和
    平台政策，并在发送前审查所有内容。最安全的模式是让
    OpenClaw 起草，然后由您审批。

    文档：[安全](/zh/gateway/security)。

  </Accordion>

  <Accordion title="与 Claude Code 相比，在 Web 开发方面有哪些优势？"OpenClawOpenClawWhatsAppTelegramTUIWebChatGateway(网关)>
    OpenClaw 是一个**个人助手**和协调层，而不是 IDE 的替代品。使用
    Claude Code 或 Codex 可以在代码库内进行最快的直接编码循环。当你需要持久化内存、跨设备访问和工具编排时，请使用 OpenClaw。

    优势：

    - 跨会话的**持久化内存 + 工作区**
    - **多平台访问**（WhatsApp、Telegram、TUI、WebChat）
    - **工具编排**（浏览器、文件、调度、钩子）
    - **始终在线的 Gateway(网关)**（在 VPS 上运行，从任何地方进行交互）
    - 用于本地浏览器/屏幕/摄像头/执行的 **Nodes**

    展示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Skills 和自动化

<AccordionGroup>
  <Accordion title="如何在不弄脏仓库的情况下自定义技能？">
    使用托管覆盖来代替编辑仓库副本。将您的更改放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或者通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加一个文件夹）。优先级顺序为 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled（捆绑） → `skills.load.extraDirs`，因此托管覆盖仍然胜过捆绑技能，而无需触及 git。如果您需要全局安装该技能但仅对某些代理可见，请将共享副本保留在 `~/.openclaw/skills` 中，并使用 `agents.defaults.skills` 和 `agents.list[].skills` 控制可见性。只有值得提交到上游的编辑才应保留在仓库中并作为 PR 发出。
  </Accordion>

  <Accordion title="我可以从自定义文件夹加载技能吗？">
    可以。通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加额外的目录（优先级最低）。默认优先级为 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled（打包） → `skills.load.extraDirs`。`clawhub` 默认安装到 `./skills`OpenClaw，OpenClaw 在下一次会话时将其视为 `<workspace>/skills`。如果该技能应仅对特定代理可见，请将其与 `agents.defaults.skills` 或 `agents.list[].skills` 搭配使用。
  </Accordion>

  <Accordion title="如何针对不同任务使用不同的模型？">
    目前支持的模式如下：

    - **Cron jobs（定时任务）**：隔离的任务可以针对每个任务设置 `model` 覆盖。
    - **Sub-agents（子代理）**：将任务路由到具有不同默认模型的独立代理。
    - **On-demand switch（按需切换）**：使用 `/model` 随时切换当前会话模型。

    请参阅 [Cron jobs](/zh/automation/cron-jobs)、[Multi-Agent Routing](/zh/concepts/multi-agent) 和 [Slash commands](/zh/tools/slash-commands)。

  </Accordion>

  <Accordion title="机器人在执行繁重任务时卡顿。如何卸载这些任务？">
    对于耗时或并行任务，请使用**子代理**。子代理在自己的会话中运行，
    返回摘要，并保持您的主聊天响应灵敏。

    让您的机器人“为此任务生成一个子代理”或使用 `/subagents`。
    在聊天中使用 `/status` 查看当前 Gateway(网关) 正在做什么（以及它是否忙碌）。

    令牌提示：长任务和子代理都会消耗令牌。如果担心成本，请通过 `agents.defaults.subagents.model` 为子代理设置更便宜的模型。

    文档：[Sub-agents](/zh/tools/subagents), [Background Tasks](/zh/automation/tasks).

  </Accordion>

  <Accordion title="DiscordDiscord 上的线程绑定子代理会话是如何工作的？"Discord>
    使用线程绑定。您可以将 Discord 线程绑定到子代理或会话目标，以便该线程中的后续消息保持在该绑定的会话上。

    基本流程：

    - 使用 `thread: true` 通过 `sessions_spawn` 生成（并可选择使用 `mode: "session"` 进行持续性后续跟进）。
    - 或者使用 `/focus <target>` 手动绑定。
    - 使用 `/agents` 检查绑定状态。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自动取消聚焦。
    - 使用 `/unfocus` 分离线程。

    必需配置：

    - 全局默认值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`Discord。
    - Discord 覆盖：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 生成时自动绑定：`channels.discord.threadBindings.spawnSessions` 默认为 `true`；将其设置为 `false` 可禁用线程绑定会话生成。

    文档：[子代理](/zh/tools/subagentsDiscord)、[Discord](/zh/channels/discord)、[配置参考](/zh/gateway/configuration-reference)、[斜杠命令](/zh/tools/slash-commands)。

  </Accordion>

  <Accordion title="子代理已完成，但完成更新发送到了错误的位置或从未发布。我应该检查什么？"OpenClaw>
    首先检查已解析的请求者路由：

    - 完成模式下的子代理投递在存在绑定的线程或会话路由时，会优先使用这些路由。
    - 如果完成来源仅携带渠道，OpenClaw 将回退到请求者会话的存储路由（`lastChannel` / `lastTo` / `lastAccountId`），以便直接投递仍能成功。
    - 如果既不存在绑定的路由，也不存在可用的存储路由，直接投递可能会失败，结果将回退到队列会话投递，而不是立即发布到聊天。
    - 无效或过时的目标仍可能导致回退到队列或最终投递失败。
    - 如果子代理最后可见的助手回复是完全静默令牌 `NO_REPLY` / `no_reply`，或者完全是 `ANNOUNCE_SKIP`OpenClaw，OpenClaw 将有意抑制公告，而不是发布过时的早期进度。
    - 工具/工具结果输出不会被提升到子代理结果文本中；结果是子代理最新的可见助手回复。

    调试：

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[子代理](/zh/tools/subagents)、[后台任务](/zh/automation/tasks)、[会话工具](/zh/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒没有触发。我应该检查什么？"Gateway(网关)Gateway(网关)>
    Cron 在 Gateway(网关) 进程内运行。如果 Gateway(网关) 没有持续运行，
    计划任务将不会执行。

    检查清单：

    - 确认 cron 已启用 (`cron.enabled`) 并且 `OPENCLAW_SKIP_CRON`Gateway(网关) 未设置。
    - 检查 Gateway(网关) 是否 24/7 运行（无休眠/重启）。
    - 验证任务的时区设置 (`--tz` 与主机时区对比)。

    调试：

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文档：[Cron 任务](/zh/automation/cron-jobs)，[自动化](/zh/automation)。

  </Accordion>

  <Accordion title="Cron 已触发，但没有任何内容发送到渠道。为什么？">
    首先检查投放模式：

    - `--no-deliver` / `delivery.mode: "none"` 意味着不期望 runner 后备发送。
    - 缺失或无效的通告目标 (`channel` / `to`) 意味着 runner 跳过了出站投递。
    - 渠道认证失败 (`unauthorized`, `Forbidden`) 意味着 runner 尝试投递，但凭据阻止了它。
    - 静默隔离结果 (仅 `NO_REPLY` / `no_reply`) 被视为故意不可投递，因此 runner 也会抑制队列中的后备投递。

    对于隔离的 cron 任务，当聊天路由可用时，Agent 仍然可以使用 `message`
    工具直接发送。`--announce` 仅控制 runner
    对于 Agent 尚未发送的最终文本的后备路径。

    调试：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[Cron jobs](/zh/automation/cron-jobs), [Background Tasks](/zh/automation/tasks)。

  </Accordion>

  <Accordion title="为什么独立的 cron 运行会切换模型或重试一次？">
    这通常是实时模型切换路径，而不是重复调度。

    独立的 cron 可以在活动运行抛出 `LiveSessionModelSwitchError` 时持久化运行时模型切换并进行重试。重试会保留切换后的提供商/模型，并且如果切换携带了新的 auth 配置文件覆盖，cron 也会在重试前持久化该配置。

    相关的选择规则：

    - Gmail hook 模型覆盖在适用时优先获胜。
    - 然后是每个作业的 `model`。
    - 然后是任何存储的 cron 会话模型覆盖。
    - 然后是正常的代理/默认模型选择。

    重试循环是有界的。在初始尝试加上 2 次切换重试后，cron 将中止而不是永远循环。

    调试：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[Cron 作业](/zh/automation/cron-jobsCLI)，[cron CLI](/zh/cli/cron)。

  </Accordion>

  <Accordion title="如何在 Linux 上安装 Skills？">
    使用原生 `openclaw skills` 命令或将 Skills 放入您的工作区。macOS Skills UI 在 Linux 上不可用。
    在 [https://clawhub.ai](https://clawhub.ai) 浏览 Skills。

    ```bash
    openclaw skills search "calendar"
    openclaw skills search --limit 20
    openclaw skills install <skill-slug>
    openclaw skills install <skill-slug> --version <version>
    openclaw skills install <skill-slug> --force
    openclaw skills install <skill-slug> --global
    openclaw skills update --all
    openclaw skills update --all --global
    openclaw skills list --eligible
    openclaw skills check
    ```

    原生 `openclaw skills install` 默认写入到活动工作区 `skills/`
    目录。添加 `--global` 以安装到所有本地代理的共享托管
    Skills 目录。仅当您想发布或同步自己的 Skills 时，才安装单独的 `clawhub` CLI。
    如果您想限制哪些代理可以看到共享 Skills，请使用
    `agents.defaults.skills` 或 `agents.list[].skills`。

  </Accordion>

  <Accordion title="OpenClawOpenClaw 可以按计划运行任务或在后台连续运行吗？"Gateway(网关)>
    可以。使用 Gateway 调度器：

    - **Cron jobs**（定时任务）用于计划或周期性任务（重启后依然存在）。
    - **Heartbeat**（心跳）用于“主会话”的定期检查。
    - **Isolated jobs**（隔离作业）用于发布摘要或投递到聊天的自主代理。

    文档：[Cron jobs](/zh/automation/cron-jobs)，[Automation](/zh/automation)，
    [Heartbeat](/zh/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以从 macOS 运行仅限 Apple Linux 的技能吗？">
    不能直接运行。macOS 技能受到 `metadata.openclaw.os` 及所需二进制文件的限制，并且只有在 **Gateway(网关) 主机** 上有资格时，这些技能才会出现在系统提示中。在 Linux 上，除非你覆盖限制条件，否则仅限 `darwin` 的技能（如 `apple-notes`、`apple-reminders`、`things-mac`Gateway(网关)Gateway(网关)macOS）将不会加载。

    你有三种支持的方案：

    **方案 A - 在 Mac 上运行 Gateway（最简单）。**
    在存在 macOS 二进制文件的地方运行 Gateway，然后通过 [远程模式](#gateway-ports-already-running-and-remote-mode) 或 LinuxTailscale 从 Gateway(网关) 连接。由于 Gateway 主机是 macOSmacOSGateway(网关)，技能会正常加载。

    **方案 B - 使用 macOS 节点（无 SSH）。**
    在 Linux 上运行 Gateway，配对一个 macOS 节点（菜单栏应用），并在 Mac 上将 **Node Run Commands** 设置为“Always Ask”或“Always Allow”。当节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为有资格。代理通过 `nodes`macOSGateway(网关) 工具运行这些技能。如果你选择“Always Ask”，在提示中批准“Always Allow”会将该命令添加到允许列表中。

    **方案 C - 通过 SSH 代理 macOS 二进制文件（高级）。**
    将 Gateway 保留在 Linux 上，但将所需的 CLI 二进制文件设置为在 Mac 上运行的 SSH 封装器。然后覆盖技能以允许 Linux，使其保持有资格。

    1. 为二进制文件创建一个 SSH 封装器（示例：用于 Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 将封装器放在 Linux 主机的 `PATH` 上（例如 `~/bin/memo`）。
    3. 覆盖技能元数据（工作区或 `~/.openclaw/skills`）以允许 Linux：

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. 启动一个新的会话，以便刷新技能快照。

  </Accordion>

  <Accordion title="Do you have a Notion or HeyGen integration?">
    目前尚未内置。

    选项：

    - **自定义 Skill / 插件：** 最适合可靠的 API 访问（Notion/HeyGen 都有 API）。
    - **浏览器自动化：** 无需代码即可工作，但速度较慢且较脆弱。

    如果你想为每个客户保留上下文（代理商工作流），一个简单的模式是：

    - 每个客户一个 Notion 页面（上下文 + 偏好设置 + 活跃工作）。
    - 要求代理在会话开始时获取该页面。

    如果你想要原生集成，请提交功能请求或构建一个针对这些 API 的 Skill。

    安装 Skills：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安装会放置在活动工作区 `skills/` 目录中。要在所有本地代理之间共享 Skills，请使用 `openclaw skills install <slug> --global`（或手动将它们放置在 `~/.openclaw/skills/<name>/SKILL.md` 中）。如果只有部分代理应该看到共享安装，请配置 `agents.defaults.skills` 或 `agents.list[].skills`。某些 Skills 需要通过 Homebrew 安装二进制文件；在 Linux 上，这意味着 Linuxbrew（请参阅上面的 Homebrew Linux 常见问题 条目）。请参阅 [Skills](/zh/tools/skills)、[Skills 配置](/zh/tools/skills-config) 和 [ClawHub](/zh/tools/clawhub)。

  </Accordion>

  <Accordion title="如何将我现有的已登录 Chrome 配合 OpenClaw 使用？">
    使用内置的 `user` 浏览器配置文件，它通过 Chrome DevTools MCP 连接：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果你想要自定义名称，请创建一个显式的 MCP 配置文件：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    此路径可以使用本地主机浏览器或已连接的浏览器节点。如果 Gateway(网关) 运行在其他地方，可以在浏览器机器上运行节点主机，或者改用远程 CDP。

    `existing-session` / `user` 的当前限制：

    - 动作是由 ref 驱动的，而不是由 CSS 选择器驱动的
    - 上传需要 `ref` / `inputRef`，并且目前一次只支持一个文件
    - `responsebody`、PDF 导出、下载拦截和批量操作仍然需要托管浏览器或原始 CDP 配置文件

  </Accordion>
</AccordionGroup>

## 沙箱隔离与内存

<AccordionGroup>
  <Accordion title="是否有专门的沙箱隔离文档？">
    是的。请参阅[沙箱隔离](/zh/gateway/sandboxing)。有关DockerDockerDocker特定设置（Docker 中的完整网关或沙箱镜像），请参阅[Docker](/zh/install/docker)。
  </Accordion>

  <Accordion title="DockerDocker 感觉受限 - 如何启用完整功能？">
    默认镜像以安全为重，并以 `node` 用户身份运行，因此它不包含
    系统软件包、Homebrew 或捆绑的浏览器。若要进行更完整的设置：

    - 使用 `OPENCLAW_HOME_VOLUME` 持久化 `/home/node`，以便缓存得以保留。
    - 使用 `OPENCLAW_IMAGE_APT_PACKAGES`CLI 将系统依赖项 baked 到镜像中。
    - 通过捆绑的 CLI 安装 Playwright 浏览器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 设置 `PLAYWRIGHT_BROWSERS_PATH`Docker 并确保该路径被持久化。

    文档：[Docker](/zh/install/docker)、[Browser](/zh/tools/browser)。

  </Accordion>

  <Accordion title="我能否在使用一个代理的情况下，将私信保持为个人模式，而将群组设为公开/沙箱隔离？">
    可以——如果您的私密流量是**私信**，而公开流量是**群组**。

    使用 `agents.defaults.sandbox.mode: "non-main"`Docker，以便群组/渠道会话（非主密钥）在配置的沙箱后端中运行，而主私信会话保留在主机上。如果您不选择后端，Docker 是默认后端。然后通过 `tools.sandbox.tools` 限制沙箱会话中可用的工具。

    设置演练 + 示例配置：[群组：个人私信 + 公开群组](/zh/channels/groups#pattern-personal-dms-public-groups-single-agentGateway(网关))

    关键配置参考：[Gateway(网关) 配置](/zh/gateway/config-agents#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="如何将主机文件夹绑定到沙箱中？">
    将 `agents.defaults.sandbox.docker.binds` 设置为 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全局绑定和每代理绑定会合并；当 `scope: "shared"` 时，每代理绑定会被忽略。对于任何敏感内容，请使用 `:ro`，并请记住绑定会绕过沙箱的文件系统屏障。

    OpenClaw 会根据规范化路径和通过最深层现有祖先解析的规范路径来验证绑定源。这意味着即使最后一个路径段尚不存在，符号链接父目录逃逸仍然会失败关闭，并且在解析符号链接后仍会应用允许根目录的检查。

    有关示例和安全说明，请参阅[沙箱隔离](/zh/gateway/sandboxing#custom-bind-mounts)和[沙箱 vs 工具策略 vs 提权](/zh/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。

  </Accordion>

  <Accordion title="如何运作内存？">
    OpenClaw 内存只是代理工作区中的 Markdown 文件：

    - `memory/YYYY-MM-DD.md` 中的每日笔记
    - `MEMORY.md` 中的精选长期笔记（仅限主/私有会话）

    OpenClaw 还会运行**静默预压缩内存刷新**，以提醒模型
    在自动压缩之前编写持久笔记。这仅在工作区
    可写时运行（只读沙盒会跳过此步骤）。请参阅 [内存](/zh/concepts/memory)。

  </Accordion>

  <Accordion title="Memory keeps forgetting things. How do I make it stick?">
    要求机器人 **将事实写入内存**。长期笔记应放在 `MEMORY.md` 中，
    短期上下文则放入 `memory/YYYY-MM-DD.md`。

    这仍然是我们正在改进的领域。提醒 Gateway(网关) 存储记忆会有所帮助；
    它会知道该做什么。如果它一直忘记，请验证 Gateway(网关) 在每次运行时使用的是
    相同的工作区。

    文档：[Memory](/zh/concepts/memory), [Agent workspace](/zh/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="内存会永久保留吗？有什么限制？">
    内存文件存储在磁盘上，并在您删除之前一直保留。限制在于您的
    存储，而不是模型。**会话上下文**仍然受到模型
    上下文窗口的限制，因此长对话可能会压缩或截断。这就是
    存在内存搜索的原因——它只将相关部分拉回上下文中。

    文档：[内存](/zh/concepts/memory)，[上下文](/zh/concepts/context)。

  </Accordion>

  <Accordion title="OpenAIAPI语义记忆搜索是否需要 OpenAI API 密钥？"OpenAIOAuthOAuthCLIOpenAIAPI>
    仅当您使用 **OpenAI embeddings** 时。Codex OAuth 涵盖聊天/补全，
    并**不**授予 embeddings 访问权限，因此**使用 Codex 登录（OAuth 或
    Codex CLI 登录）** 对语义记忆搜索没有帮助。OpenAI embeddings
    仍需要真实的 API 密钥（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`OpenClawOpenAI）。

    如果您没有明确设置提供商，OpenClaw 将使用 OpenAI embeddings。旧版
    配置中仍然写着 `memorySearch.provider = "auto"`OpenAIOpenAIAPI 的也会解析为 OpenAI。
    如果没有可用的 OpenAI API 密钥，语义记忆搜索将保持不可用，
    直到您配置密钥或明确选择另一个提供商。

    如果您希望保持本地，请设置 `memorySearch.provider = "local"` （并可选地
    设置 `memorySearch.fallback = "none"`）。如果您想要 Gemini embeddings，请设置
    `memorySearch.provider = "gemini"` 并提供 `GEMINI_API_KEY` （或
    `memorySearch.remote.apiKey`OpenAIOpenAIOllamaGitHub）。我们支持 **OpenAI、OpenAI 兼容、Gemini、
    Voyage、Mistral、Bedrock、Ollama、LM Studio、GitHub Copilot、DeepInfra 或本地**
    embedding 模型 - 有关设置详细信息，请参阅 [Memory](/zh/concepts/memory)。

  </Accordion>
</AccordionGroup>

## 文件存储位置

<AccordionGroup>
  <Accordion title="OpenClawOpenClaw 使用的所有数据都会保存在本地吗？"OpenClaw>
    不 - **OpenClaw 的状态是本地的**，但 **外部服务仍然可以看到您发送给它们的内容**。

    - **默认本地：** 会话、内存文件、配置和工作区位于 Gateway(网关) 主机上
      (`~/.openclaw` + 您的工作区目录)。
    - **必要的远程：** 您发送给模型提供商 (Anthropic/OpenAI/等) 的消息会发送到
      它们的 API，聊天平台 (WhatsApp/Telegram/Slack/等) 会在其
      服务器上存储消息数据。
    - **您控制足迹：** 使用本地模型会将提示词保留在您的机器上，但渠道
      流量仍然会通过渠道的服务器。

    相关：[Agent 工作区](/zh/concepts/agent-workspace), [Memory](/zh/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClawOpenClaw 的数据存储在哪里？">
    所有内容都位于 `$OPENCLAW_STATE_DIR` 下（默认：`~/.openclaw`）：

    | 路径                                                             | 用途                                                               |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主配置文件 (JSON5)                                                 |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`OAuth                    | 旧版 OAuth 导入（首次使用时复制到身份验证配置文件中）                 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json`OAuthAPI | 身份验证配置文件（OAuth、API 密钥和可选的 `keyRef`/`tokenRef`） |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | 用于 `file` SecretRef 提供程序的可选文件支持的机密负载 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 旧版兼容性文件（静态 `api_key` 条目已清除）      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供程序状态（例如 `whatsapp/<accountId>/creds.json`）            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每个代理的状态（agentDir + sessions）                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 对话历史和状态（每个代理）                                         |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 会话元数据（每个代理）                                             |

    旧版单代理路径：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）。

    您的 **工作区**（AGENTS.md、内存文件、技能等）是独立的，并通过 `agents.defaults.workspace` 进行配置（默认：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该放在哪里？">
    这些文件位于 **agent workspace（代理工作区）** 中，而不是 `~/.openclaw`。

    - **Workspace (per agent)**: `AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md`、`memory/YYYY-MM-DD.md`，以及可选的 `HEARTBEAT.md`。
      小写的根 `memory.md` 仅用于遗留修复输入；当这两个文件同时存在时，`openclaw doctor --fix`
      可以将其合并到 `MEMORY.md` 中。
    - **State dir (`~/.openclaw`)**: 配置、渠道/提供商状态、认证配置文件、会话、日志
      以及共享技能 (`~/.openclaw/skills`)。

    默认工作区是 `~/.openclaw/workspace`，可通过以下方式配置：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果机器人在重启后“忘记”了之前的设置，请确认 Gateway(网关) 在每次启动时使用的是
    相同的工作区（并且请记住：远程模式使用的是 **gateway host's（网关主机）的**
    工作区，而不是您的本地笔记本电脑）。

    提示：如果您希望保留某种行为或偏好，请让机器人将其**写入
    AGENTS.md 或 MEMORY.md**，而不是依赖聊天记录。

    参见 [Agent workspace](/zh/concepts/agent-workspace) 和 [Memory](/zh/concepts/memory)。

  </Accordion>

  <Accordion title="Recommended backup strategy"GitHub>
    将您的 **agent workspace**（代理工作区）放入一个**私有** git 仓库中，并将其备份到某个**私有**位置（例如 GitHub 私有仓库）。这会捕获 memory + AGENTS/SOUL/USER
    文件，并让您稍后可以恢复助手的“思维”。

    **切勿**提交 `~/.openclaw` 下的任何内容（凭据、会话、令牌或加密密钥载荷）。
    如果您需要完全恢复，请分别备份工作区和状态目录
    （参见上面的迁移问题）。

    文档：[Agent workspace](/zh/concepts/agent-workspace)。

  </Accordion>

<Accordion title="如何完全卸载 OpenClaw？">请参阅专用指南：[卸载](/zh/install/uninstall)。</Accordion>

  <Accordion title="Can agents work outside the workspace?">
    是的。工作区是**默认的工作目录 (cwd)** 和内存锚点，而非严格的沙箱。
    相对路径在工作区内解析，但除非启用了沙箱隔离，否则绝对路径可以访问其他
    主机位置。如果需要隔离，请使用
    [`agents.defaults.sandbox`](/zh/gateway/sandboxing) 或特定于代理的沙箱设置。如果您
    希望将某个仓库作为默认工作目录，请将该代理的
    `workspace`OpenClaw 指向仓库根目录。OpenClaw 仓库只是源代码；请将
    工作区分开，除非您有意让代理在其中工作。

    示例（仓库作为默认 cwd）：

    ```json5
    {
      agents: {
        defaults: {
          workspace: "~/Projects/my-repo",
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Remote mode: where is the 会话 store?">
    会话状态由**网关主机**拥有。如果您处于远程模式，您关心的会话存储位于远程机器上，而不是您的本地笔记本电脑。请参阅[会话管理](/zh/concepts/session)。
  </Accordion>
</AccordionGroup>

## Config basics

<AccordionGroup>
  <Accordion title="What format is the config? Where is it?">
    OpenClaw 从 `$OPENCLAW_CONFIG_PATH` 读取可选的 **JSON5** 配置（默认：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果文件丢失，它将使用相对安全的默认值（包括默认工作区 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我设置了 gateway.bind: "lan"（或 "tailnet"），现在没有任何监听 / UI 显示未授权'>
    非环回绑定**需要有效的网关身份验证路径**。实际上这意味着：

    - 共享密钥身份验证：token 或 password
    - 正确配置的身份感知反向代理背后的 `gateway.auth.mode: "trusted-proxy"`

    ```json5
    {
      gateway: {
        bind: "lan",
        auth: {
          mode: "token",
          token: "replace-me",
        },
      },
    }
    ```

    注意：

    - `gateway.remote.token` / `.password` **不会**自行启用本地网关身份验证。
    - 仅当未设置 `gateway.auth.*` 时，本地调用路径才可以将 `gateway.remote.*` 作为回退选项。
    - 对于密码身份验证，请改用 `gateway.auth.mode: "password"` 加上 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置但未解析，解析将失败关闭（没有远程回退掩盖）。
    - 共享密钥控制 UI 设置通过 `connect.params.auth.token` 或 `connect.params.auth.password`（存储在 app/UI 设置中）进行身份验证。承载身份的模式（如 Tailscale Serve 或 `trusted-proxy`）则改用请求头。请避免将共享密钥放在 URL 中。
    - 使用 `gateway.auth.mode: "trusted-proxy"` 时，同主机环回反向代理需要显式的 `gateway.auth.trustedProxy.allowLoopback = true` 和 `gateway.trustedProxies` 中的环回条目。

  </Accordion>

  <Accordion title="为什么现在在 localhost 上也需要 token？"OpenClaw>
    OpenClaw 默认强制执行网关身份验证，包括环回接口。在正常的默认路径中，这意味着 token 身份验证：如果未配置显式身份验证路径，网关启动将解析为 token 模式并为该启动生成仅限运行时的 token，因此**本地 WS 客户端必须进行身份验证**。当客户端在重启之间需要稳定的密钥时，请显式配置 `gateway.auth.token`、`gateway.auth.password`、`OPENCLAW_GATEWAY_TOKEN` 或 `OPENCLAW_GATEWAY_PASSWORD`Gateway(网关)。这会阻止其他本地进程调用 Gateway(网关)。

    如果你更喜欢其他身份验证路径，可以显式选择密码模式（或者，对于具有身份感知的反向代理，选择 `trusted-proxy`）。如果你**真的**想要开放环回，请在配置中显式设置 `gateway.auth.mode: "none"`。Doctor 可以随时为你生成一个 token：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="修改配置后需要重启吗？"Gateway(网关)>
    Gateway(网关) 会监视配置并支持热重载：

    - `gateway.reload.mode: "hybrid"`（默认）：热应用安全更改，关键更改需重启
    - `hot`、`restart`、`off` 也受支持

  </Accordion>

  <Accordion title="CLI如何禁用有趣的 CLI 标语？">
    在配置中设置 `cli.banner.taglineMode`：

    ```json5
    {
      cli: {
        banner: {
          taglineMode: "off", // random | default | off
        },
      },
    }
    ```

    - `off`：隐藏标语文本，但保留横幅标题/版本行。
    - `default`：每次都使用 `All your chats, one OpenClaw.`。
    - `random`：轮换显示有趣/季节性标语（默认行为）。
    - 如果你完全不想要横幅，请设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何启用网络搜索（和网络抓取）？">
    `web_fetch` 无需 API 密钥即可工作。`web_search` 取决于您选择的
    提供商：

    - 基于 API 的提供商，如 Brave、Exa、Firecrawl、Gemini、Kimi、MiniMax Search、Perplexity 和 Tavily，需要其常规的 API 密钥设置。
    - Grok 可以复用来自模型认证的 xAI OAuth，或者回退到 `XAI_API_KEY` / 插件网络搜索配置。
    - Ollama Web Search 无需密钥，但它使用您配置的 Ollama 主机并且需要 `ollama signin`。
    - DuckDuckGo 无需密钥，但它是一个非官方的基于 HTML 的集成。
    - SearXNG 是免费的/自托管的；请配置 `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`。

    **推荐：** 运行 `openclaw configure --section web` 并选择一个提供商。
    环境变量替代方案：

    - Brave: `BRAVE_API_KEY`
    - Exa: `EXA_API_KEY`
    - Firecrawl: `FIRECRAWL_API_KEY`
    - Gemini: `GEMINI_API_KEY`
    - Grok: xAI OAuth，`XAI_API_KEY`
    - Kimi: `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
    - MiniMax Search: `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`
    - Perplexity: `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`
    - SearXNG: `SEARXNG_BASE_URL`
    - Tavily: `TAVILY_API_KEY`

    ```json5
    {
      plugins: {
        entries: {
          brave: {
            config: {
              webSearch: {
                apiKey: "BRAVE_API_KEY_HERE",
              },
            },
          },
        },
        },
        tools: {
          web: {
            search: {
              enabled: true,
              provider: "brave",
              maxResults: 5,
            },
            fetch: {
              enabled: true,
              provider: "firecrawl", // optional; omit for auto-detect
            },
          },
        },
    }
    ```

    特定于提供商的网络搜索配置现在位于 `plugins.entries.<plugin>.config.webSearch.*` 下。
    旧的 `tools.web.search.*` 提供商路径为了兼容性仍会暂时加载，但不应在新配置中使用。
    Firecrawl 网络抓取回退配置位于 `plugins.entries.firecrawl.config.webFetch.*` 下。

    注意事项：

    - 如果您使用允许列表，请添加 `web_search`/`web_fetch`/`x_search` 或 `group:web`。
    - `web_fetch` 默认启用（除非明确禁用）。
    - 如果省略 `tools.web.fetch.provider`，OpenClaw 将根据可用的凭据自动检测第一个准备就绪的抓取回退提供商。目前内置的提供商是 Firecrawl。
    - 守护进程从 `~/.openclaw/.env`（或服务环境）读取环境变量。

    文档：[Web tools](/zh/tools/web)。

  </Accordion>

  <Accordion title="config.apply 清除了我的配置。我该如何恢复并避免这种情况？">
    `config.apply` 会替换**整个配置**。如果你发送一个部分对象，其他所有内容都会被移除。

    当前的 OpenClaw 可以防止许多意外的覆盖操作：

    - OpenClaw 拥有的配置写入会在写入前验证完整的更改后配置。
    - 无效或破坏性的 OpenClaw 拥有的写入会被拒绝，并保存为 `openclaw.json.rejected.*`。
    - 如果直接编辑破坏了启动或热重载，Gateway(网关) 将失败关闭或跳过重载；它不会重写 `openclaw.json`。
    - `openclaw doctor --fix` 拥有修复功能，可以恢复最后已知的好状态，同时将拒绝的文件保存为 `openclaw.json.clobbered.*`。

    恢复：

    - 检查 `openclaw logs --follow` 中是否有 `Invalid config at`、`Config write rejected:` 或 `config reload skipped (invalid config)`。
    - 检查活动配置旁边最新的 `openclaw.json.clobbered.*` 或 `openclaw.json.rejected.*`。
    - 运行 `openclaw config validate` 和 `openclaw doctor --fix`。
    - 仅使用 `openclaw config set` 或 `config.patch` 复制回预期的键。
    - 如果你没有最后已知的好配置或被拒绝的负载，请从备份恢复，或者重新运行 `openclaw doctor` 并重新配置渠道/模型。
    - 如果这是意外发生的，请提交一个错误，并附上你最后已知的配置或任何备份。
    - 本地编码代理通常可以从日志或历史记录中重建一个可用的配置。

    避免这种情况：

    - 对小改动使用 `openclaw config set`。
    - 对交互式编辑使用 `openclaw configure`。
    - 当你不确定确切的路径或字段形状时，首先使用 `config.schema.lookup`；它返回一个浅层架构节点以及直接子级摘要以便向下钻取。
    - 对部分 RPC 编辑使用 `config.patch`；仅将 `config.apply` 用于完整配置替换。
    - 如果你正在代理运行中使用面向代理的 `gateway` 工具，它仍然会拒绝写入 `tools.exec.ask` / `tools.exec.security`（包括规范化为同一受保护执行路径的传统 `tools.bash.*` 别名）。

    文档：[配置](/zh/cli/config)、[Configure](/zh/cli/configure)、[Gateway(网关) 故障排除](/zh/gateway/troubleshooting#gateway-rejected-invalid-config)、[Doctor](/zh/gateway/doctor)。

  </Accordion>

  <Accordion title="如何在不同设备上运行一个中央 Gateway(网关) 并配备专门的 Worker？">
    常见的模式是 **一个 Gateway(网关)**（例如 Raspberry Pi）加上 **节点** 和 **代理**：

    - **Gateway(网关)（中央）：** 拥有通道（Signal/WhatsApp）、路由和会话。
    - **节点（设备）：** Mac/iOS/Android 作为外设连接并暴露本地工具（`system.run`、`canvas`、`camera`）。
    - **代理（Workers）：** 用于特殊角色的独立大脑/工作空间（例如“Hetzner 运维”、“个人数据”）。
    - **子代理：** 当您需要并行处理时，从主代理生成后台工作。
    - **TUI：** 连接到 Gateway(网关) 并切换代理/会话。

    文档：[节点](/zh/nodes)、[远程访问](/zh/gateway/remote)、[多代理路由](/zh/concepts/multi-agent)、[子代理](/zh/tools/subagents)、[TUI](/zh/web/tui)。

  </Accordion>

  <Accordion title="OpenClawOpenClaw 浏览器可以无头运行吗？">
    是的。这是一个配置选项：

    ```json5
    {
      browser: { headless: true },
      agents: {
        defaults: {
          sandbox: { browser: { headless: true } },
        },
      },
    }
    ```

    默认为 `false` (有头模式)。在某些网站上，无头模式更有可能触发反机器人检查。请参阅 [浏览器](/zh/tools/browser)。

    无头模式使用**相同的 Chromium 引擎**，适用于大多数自动化操作（表单、点击、抓取、登录）。主要区别如下：

    - 没有可见的浏览器窗口（如果您需要可视化内容，请使用截图）。
    - 某些网站对无头模式下的自动化要求更严格（验证码、反机器人）。
      例如，X/Twitter 经常阻止无头会话。

  </Accordion>

  <Accordion title="Brave如何使用 Brave 进行浏览器控制？">
    将 `browser.executablePath`BraveGateway(网关) 设置为您的 Brave 二进制文件（或任何基于 Chromium 的浏览器），然后重启 Gateway(网关)。
    请参阅 [Browser](/zh/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置示例。
  </Accordion>
</AccordionGroup>

## 远程 Gateway(网关) 和节点

<AccordionGroup>
  <Accordion title="Telegram命令如何在 Telegram、gateway 和节点之间传播？"TelegramGateway(网关)TelegramGateway(网关)>
    Telegram 消息由 **gateway** 处理。Gateway 运行代理，
    只有在需要节点工具时才通过 **Gateway(网关) WebSocket** 调用节点：

    Telegram → Gateway(网关) → Agent → `node.*`Gateway(网关)TelegramRPC → Node → Gateway(网关) → Telegram

    节点看不到入站提供商流量；它们只接收节点 RPC 调用。

  </Accordion>

  <Accordion title="Gateway(网关)如果 Gateway(网关) 托管在远程，我的 Agent 如何访问我的计算机？"Gateway(网关)>
    简短回答：**将您的计算机配对为节点**。Gateway(网关) 在其他地方运行，但它可以通过 Gateway(网关) WebSocket 调用您本地计算机上的 `node.*`Gateway(网关)Gateway(网关)Gateway(网关)Gateway(网关)macOSGateway(网关) 工具（屏幕、摄像头、系统）。

    典型设置：

    1. 在常驻主机（VPS/家庭服务器）上运行 Gateway(网关)。
    2. 将 Gateway(网关) 主机和您的计算机置于同一个 tailnet 中。
    3. 确保 Gateway(网关) WS 可访问（tailnet 绑定或 SSH 隧道）。
    4. 在本地打开 macOS 应用并以 **Remote over SSH** 模式（或直接通过 tailnet）连接，以便注册为节点。
    5. 在 Gateway(网关) 上批准该节点：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```Gateway(网关)macOS

    不需要单独的 TCP 网桥；节点通过 Gateway(网关) WebSocket 连接。

    安全提醒：配对 macOS 节点允许在该机器上进行 `system.run`。仅配对您信任的设备，并查看 [Security](/en/gateway/security)。

    文档：[Nodes](/en/nodesGateway(网关))，[Gateway(网关) protocol](/en/gateway/protocolmacOS)，[macOS remote mode](/en/platforms/mac/remote)，[Security](/en/gateway/security)。

  </Accordion>

  <Accordion title="TailscaleTailscale已连接但我没有收到回复。该怎么办？"Gateway(网关)>
    检查基本信息：

    - Gateway(网关)正在运行：`openclaw gateway status`Gateway(网关)
    - Gateway(网关)健康状况：`openclaw status`
    - 通道健康状况：`openclaw channels status`Tailscale

    然后验证身份验证和路由：

    - 如果您使用 Tailscale Serve，请确保 `gateway.auth.allowTailscale`Tailscale 设置正确。
    - 如果您通过 SSH 隧道连接，请确认本地隧道已启动并指向正确的端口。
    - 确认您的允许列表（私信或组）包含您的账户。

    文档：[Tailscale](/en/gateway/tailscale), [远程访问](/en/gateway/remote), [通道](/en/channels)。

  </Accordion>

  <Accordion title="两个 OpenClaw 实例可以互相通信（本地 + VPS）吗？">
    可以。没有内置的“机器人到机器人”桥接器，但您可以通过几种可靠的方式将其连接起来：

    **最简单：** 使用两个机器人都可以访问的普通聊天渠道（Telegram/Slack/WhatsApp）。让机器人 A 向机器人 B 发送消息，然后让机器人 B 像往常一样回复。

    **CLI 桥接（通用）：** 运行一个脚本，使用 `openclaw agent --message ... --deliver` 调用另一个 Gateway(网关)，目标是另一个机器人监听的聊天。如果一个机器人在远程 VPS 上，请通过 SSH/CLI 将您的 Gateway(网关) 指向该远程 Tailscale（参见 [Remote access](/en/gateway/remote)）。

    示例模式（从可以访问目标 Gateway(网关) 的机器运行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：添加护栏，使两个机器人不会无限循环（仅提及、渠道白名单，或“不回复机器人消息”规则）。

    文档：[Remote access](/zh/gateway/remote)、[Agent CLI](/zh/cli/agent)、[Agent send](/zh/tools/agent-send)。

  </Accordion>

  <Accordion title="多个代理是否需要独立的 VPS？">
    不需要。一个 Gateway(网关) 可以托管多个代理，每个代理拥有自己的工作区、模型默认值和路由。这是标准配置，比为每个代理运行一个 VPS 更便宜、更简单。

    仅在需要硬隔离（安全边界）或不想共享差异极大的配置时，才使用独立的 VPS。否则，请保留一个 Gateway(网关) 并使用多个代理或子代理。

  </Accordion>

  <Accordion title="与从 VPS 使用 SSH 相比，在我的个人笔记本电脑上使用节点有什么好处？"Gateway(网关)Gateway(网关)macOSLinuxWindowsWSL2Raspberry PiGateway(网关)>
    是的——节点是从远程 Gateway(网关) 连接到您的笔记本电脑的首选方式，而且它们
    提供的功能远不止 Shell 访问。Gateway(网关) 运行在 macOS/Linux（Windows 通过 WSL2）上，并且
    是轻量级的（一个小型 VPS 或 Raspberry Pi 级别的设备即可；4 GB RAM 已绰绰有余），因此常见的
    设置是一个始终在线的主机加上作为节点的笔记本电脑。

    - **无需入站 SSH。** 节点向外连接到 Gateway(网关) WebSocket 并使用设备配对。
    - **更安全的执行控制。** `system.run` 受该笔记本电脑上的节点允许列表/批准的限制。
    - **更多设备工具。** 除了 `system.run`Gateway(网关) 之外，节点还暴露 `canvas`、`camera` 和 `screen`。
    - **本地浏览器自动化。** 将 Gateway(网关) 保留在 VPS 上，但通过笔记本电脑上的节点主机在本地运行 Chrome，或者通过 Chrome MCP 附加到主机上的本地 Chrome。

    SSH 适用于临时 Shell 访问，但对于持续的代理工作流和
    设备自动化，节点更简单。

    文档：[节点](/zh/nodesCLI)、[节点 CLI](/zh/cli/nodes)、[浏览器](/zh/tools/browser)。

  </Accordion>

  <Accordion title="Do nodes run a gateway service?">
    不行。除非你有意运行独立的配置文件（请参阅 [Multiple gateways](/zh/gateway/multiple-gateways)），否则每台主机应仅运行 **一个网关**。节点是连接到
    网关的外设（iOS/Android 节点，或菜单栏应用中的 macOS “节点模式”）。有关无头节点
    主机和 CLI 控制，请参阅 [Node host CLI](/zh/cli/node)。

    对 `gateway`、`discovery` 和托管插件表面更改需要完全重启。

  </Accordion>

  <Accordion title="APIRPC是否有 API / RPC 方式来应用配置？">
    是的。

    - `config.schema.lookup`：在写入之前，通过其浅层架构节点、匹配的 UI 提示和直接子摘要检查一个配置子树
    - `config.get`：获取当前快照和哈希
    - `config.patch`：安全的部分更新（大多数 RPC 编辑的首选方式）；尽可能热重载，必要时重启
    - `config.apply`：验证并替换完整配置；尽可能热重载，必要时重启
    - 面向代理的 `gateway` 运行时 RPC 仍然拒绝重写 `tools.exec.ask` / `tools.exec.security`；传统的 `tools.bash.*` 别名会规范化为相同的受保护执行路径

  </Accordion>

  <Accordion title="适用于首次安装的最小合理配置">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    这将设置您的工作区并限制谁可以触发机器人。

  </Accordion>

  <Accordion title="Tailscale如何在 VPS 上设置 Tailscale 并从我的 Mac 连接？">
    最低步骤：

    1. **在 VPS 上安装 + 登录**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```TailscaleTailscale

    2. **在你的 Mac 上安装 + 登录**
       - 使用 Tailscale 应用并登录到同一个 tailnet。
    3. **启用 MagicDNS（推荐）**
       - 在 Tailscale 管理控制台中，启用 MagicDNS，以便 VPS 拥有一个稳定的名称。
    4. **使用 tailnet 主机名**
       - SSH：`ssh user@your-vps.tailnet-xxxx.ts.net`Gateway(网关)
       - Gateway WS：`ws://your-vps.tailnet-xxxx.ts.net:18789`Tailscale

    如果你想要在不使用 SSH 的情况下使用 Control UI，请在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```TailscaleTailscale

    这会将 Gateway(网关) 绑定到 loopback 并通过 Tailscale 暴露 HTTPS。参见 [Tailscale](/en/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何将 Mac 节点连接到远程 Gateway(网关)（Tailscale Serve）？">
    Serve 暴露了 **Gateway(网关) 控制界面 + WS**。节点通过同一个 Gateway(网关) WS 端点进行连接。

    推荐的设置方法：

    1. **确保 VPS 和 Mac 位于同一个 tailnet 网络**。
    2. **在 macOS 应用中使用 Remote 模式**（SSH 目标可以是 tailnet 主机名）。
       该应用将建立 Gateway(网关) 端口隧道并作为节点进行连接。
    3. **在网关上批准节点**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文档：[Gateway(网关) 协议](/zh/gateway/protocol)、[设备发现](/zh/gateway/discovery)、[macOS 远程模式](/zh/platforms/mac/remote)。

  </Accordion>

  <Accordion title="Should I install on a second laptop or just add a node?">
    如果你在第二台笔记本电脑上只需要 **local tools** (screen/camera/exec)，请将其作为一个 **node** 添加。这样可以保持单一的 Gateway(网关) 并避免重复配置。Local node tools 目前仅支持 macOS，但我们计划将其扩展到其他操作系统。

    仅当你需要 **hard isolation** 或两个完全独立的机器人时，才安装第二个 Gateway(网关)。

    文档：[Nodes](/zh/nodes), [Nodes CLI](/zh/cli/nodes), [Multiple gateways](/zh/gateway/multiple-gateways).

  </Accordion>
</AccordionGroup>

## 环境变量和 .env 加载

<AccordionGroup>
  <Accordion title="OpenClawOpenClaw 如何加载环境变量？"OpenClaw>
    OpenClaw 从父进程（shell、launchd/systemd、CI 等）读取环境变量，并额外加载：

    - 当前工作目录中的 `.env`
    - 来自 `~/.openclaw/.env`（即 `$OPENCLAW_STATE_DIR/.env`）的全局备用 `.env`

    两个 `.env` 文件都不会覆盖现有的环境变量。
    提供商凭据变量是工作区 `.env` 的一个例外：诸如 `GEMINI_API_KEY`、`XAI_API_KEY` 或 `MISTRAL_API_KEY` 之类的键会从工作区 `.env` 中被忽略，因此应位于进程环境、`~/.openclaw/.env` 或配置 `env` 中。

    您还可以在配置中定义内联环境变量（仅当进程环境中缺失时才应用）：

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    有关完整优先级和来源，请参阅 [/environment](/zh/help/environment)。

  </Accordion>

  <Accordion title="Gateway(网关)我通过服务启动了Gateway(网关)，但我的环境变量消失了。该怎么办？">
    有两种常见的修复方法：

    1. 将缺失的键放在 `~/.openclaw/.env` 中，这样即使服务未继承您的 shell 环境也能获取到它们。
    2. 启用 shell 导入（可选的便捷功能）：

    ```json5
    {
      env: {
        shellEnv: {
          enabled: true,
          timeoutMs: 15000,
        },
      },
    }
    ```

    这会运行您的登录 shell 并仅导入缺失的预期键名（从不覆盖）。等效的环境变量为：
    `OPENCLAW_LOAD_SHELL_ENV=1`，`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我设置了 COPILOT_GITHUB_TOKEN，但模型状态显示 "Shell env: off." 为什么？'>
    `openclaw models status`OpenClawGateway(网关) 报告是否启用了 **shell env import**。"Shell env: off" 并 **不** 意味着您的 环境变量 丢失了——这只是意味着 OpenClaw 不会自动加载您的登录 shell。

    如果 Gateway(网关) 作为服务（launchd/systemd）运行，它将不会继承您的 shell 环境。可以通过以下方式之一进行修复：

    1. 将 token 放入 `~/.openclaw/.env` 中：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或启用 shell 导入（`env.shellEnv.enabled: true`）。
    3. 或将其添加到您的配置 `env` 块中（仅在缺失时适用）。

    然后重启网关并重新检查：

    ```bash
    openclaw models status
    ```

    Copilot token 是从 `COPILOT_GITHUB_TOKEN` 读取的（也包括 `GH_TOKEN` / `GITHUB_TOKEN`）。
    请参阅 [/concepts/模型-providers](/zh/concepts/model-providers) 和 [/environment](/zh/help/environment)。

  </Accordion>
</AccordionGroup>

## 会话和多次对话

<AccordionGroup>
  <Accordion title="如何开始一个新的对话？">
    发送 `/new` 或 `/reset` 作为一条独立消息。请参阅 [会话管理](/zh/concepts/session)。
  </Accordion>

  <Accordion title="如果我不发送 /new，会话会自动重置吗？">
    会话可以在 `session.idleMinutes` 后过期，但这**默认是禁用的**（默认值为 **0**）。
    设置一个正值以启用空闲过期。启用后，空闲期之后的**下一条**消息将为该聊天键启动一个新的会话 ID。
    这不会删除记录——它只是开始一个新的会话。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有没有办法组建一个由 OpenClaw 实例组成的团队（一个 CEO 和许多代理）？">
    是的，通过 **multi-agent routing** 和 **sub-agents**。你可以创建一个协调代理
    和多个工作代理，它们拥有各自的工作空间和模型。

    话虽如此，这最好被视为一个 **有趣的实验**。它非常消耗 token，而且通常
    不如使用一个带有独立会话的机器人高效。我们设想的典型模式
    是你与一个机器人对话，使用不同的会话进行并行工作。该机器人
    也可以在需要时生成 sub-agents。

    文档：[Multi-agent routing](/zh/concepts/multi-agent)、[Sub-agents](/zh/tools/subagents)、[Agents CLI](/zh/cli/agents)。

  </Accordion>

  <Accordion title="为什么上下文在任务中途被截断？如何防止这种情况？">
    会话上下文受到模型窗口的限制。长对话、大型工具输出或大量文件可能会触发压缩或截断。

    有用的方法：

    - 要求机器人总结当前状态并将其写入文件。
    - 在执行长任务之前使用 `/compact`，并在切换主题时使用 `/new`。
    - 将重要上下文保留在工作区中，并要求机器人重新读取。
    - 对长时间或并行任务使用子代理，以保持主对话精简。
    - 如果这种情况经常发生，请选择具有更大上下文窗口的模型。

  </Accordion>

  <Accordion title="OpenClaw如何在不卸载的情况下完全重置 OpenClaw？">
    使用重置命令：

    ```bash
    openclaw reset
    ```

    非交互式完全重置：

    ```bash
    openclaw reset --scope full --yes --non-interactive
    ```

    然后重新运行安装程序：

    ```bash
    openclaw onboard --install-daemon
    ```

    注意：

    - 如果新手引导检测到现有配置，它也会提供 **重置 (Reset)** 选项。请参阅 [新手引导 (CLI)](/zh/start/wizard)。
    - 如果您使用了配置文件 (`--profile` / `OPENCLAW_PROFILE`)，请重置每个状态目录（默认为 `~/.openclaw-<profile>`）。
    - 开发重置：`openclaw gateway --dev --reset`（仅限开发环境；清除开发配置 + 凭证 + 会话 + 工作区）。

  </Accordion>

  <Accordion title='我遇到了“上下文过大”错误——该如何重置或压缩？'>
    使用以下方法之一：

    - **压缩 (Compact)**（保留对话但总结较早的轮次）：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 来引导总结。

    - **重置 (Reset)**（为同一聊天密钥生成新的会话 ID）：

      ```
      /new
      /reset
      ```

    如果这种情况持续发生：

    - 启用或调整 **会话修剪 (会话 pruning)**（`agents.defaults.contextPruning`）以修剪旧的工具输出。
    - 使用具有更大上下文窗口的模型。

    文档：[压缩](/zh/concepts/compaction)、[会话修剪](/zh/concepts/session-pruning)、[会话管理](/zh/concepts/session)。

  </Accordion>

  <Accordion title='LLM为什么我会看到 "LLM request rejected: messages.content.tool_use.input field required"？'>
    这是一个提供商验证错误：模型发出了一个 `tool_use` 块，但缺少必需的
    `input`。这通常意味着会话历史已过时或损坏（常发生在长对话
    或工具/模式更改后）。

    解决方法：使用 `/new`（独立消息）开始一个新的会话。

  </Accordion>

  <Accordion title="为什么我每 30 分钟会收到心跳消息？">
    默认情况下，心跳每 **30 分钟** 运行一次（使用 OAuth 认证时为 **1 小时**）。您可以调整或禁用它们：

    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "2h", // or "0m" to disable
          },
        },
      },
    }
    ```

    如果 `HEARTBEAT.md` 存在但实际上是空的（仅包含空行和 `# Heading` 等 Markdown 标题），OpenClaw 会跳过心跳运行以节省 API 调用。
    如果文件丢失，心跳仍会运行，模型将决定执行什么操作。

    每个代理的覆盖设置使用 `agents.list[].heartbeat`。文档：[Heartbeat](/zh/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我是否需要将“机器人账号”添加到 WhatsApp 群组中？'>
    不需要。OpenClaw 运行在**您自己的账号**上，因此如果您在群组中，OpenClaw 就可以看到它。
    默认情况下，群组回复会被屏蔽，直到您允许发送者 (`groupPolicy: "allowlist"`)。

    如果您希望只有**您**能够触发群组回复：

    ```json5
    {
      channels: {
        whatsapp: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15551234567"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="如何获取 WhatsApp 群组的 JID？">
    选项 1（最快）：查看日志并在群组中发送一条测试消息：

    ```bash
    openclaw logs --follow --json
    ```

    查找以 `@g.us` 结尾的 `chatId`（或 `from`），例如：
    `1234567890-1234567890@g.us`。

    选项 2（如果已配置/列入白名单）：从配置中列出群组：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文档：[WhatsApp](/zh/channels/whatsapp)、[目录](/zh/cli/directory)、[日志](/zh/cli/logs)。

  </Accordion>

  <Accordion title="OpenClaw为什么 OpenClaw 不在群组中回复？">
    两个常见原因：

    - 提及门控已开启（默认）。你必须 @提及机器人（或匹配 `mentionPatterns`）。
    - 你配置了 `channels.whatsapp.groups` 但没有配置 `"*"`，且该群组不在允许列表中。

    请参阅 [群组](/zh/channels/groups) 和 [群组消息](/zh/channels/group-messages)。

  </Accordion>

<Accordion title="群组/线程是否与私信共享上下文？">直接聊天默认折叠到主会话中。群组/频道拥有各自的会话密钥，且 Telegram 主题 / Discord 线程是独立的会话。请参阅 [群组](/zh/channels/groups) 和 [群组消息](/zh/channels/group-messages)。</Accordion>

  <Accordion title="我可以创建多少个工作区和代理？">
    没有硬性限制。几十个（甚至几百个）都可以，但请注意以下几点：

    - **磁盘增长：** 会话和对话记录存储在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本：** 更多代理意味着更多的并发模型使用。
    - **运维开销：** 每个代理的认证配置文件、工作区和渠道路由。

    提示：

    - 每个代理保留一个 **活跃** 工作区 (`agents.defaults.workspace`)。
    - 如果磁盘增长，请清理旧会话（删除 JSONL 或存储条目）。
    - 使用 `openclaw doctor` 来发现孤立的工作区和配置文件不匹配的情况。

  </Accordion>

  <Accordion title="我可以同时运行多个机器人或聊天 (Slack)，应该如何设置？">
    可以。使用 **Multi-Agent Routing（多智能体路由）** 运行多个隔离的智能体，并按渠道/账户/对等方路由入站消息。Slack 作为受支持的渠道，可以绑定到特定的智能体。

    浏览器访问功能强大，但并非“能做人类能做的任何事”——反机器人机制、验证码 (CAPTCHA) 和多因素认证 (MFA) 仍然可以阻止自动化。为了获得最可靠的浏览器控制，请在主机上使用本地 Chrome MCP，或者在实际运行浏览器的机器上使用 CDP。

    最佳实践设置：

    - 常开 Gateway(网关) 主机 (VPS/Mac mini)。
    - 每个角色一个智能体 (bindings/绑定)。
    - 绑定到这些智能体的 Slack 渠道。
    - 必要时通过 Chrome MCP 使用本地浏览器或使用节点。

    文档：[Multi-Agent Routing](/zh/concepts/multi-agent)、[Slack](/zh/channels/slack)、
    [Browser](/zh/tools/browser)、[Nodes](/zh/nodes)。

  </Accordion>
</AccordionGroup>

## 模型、故障转移和身份验证配置文件

模型常见问题解答 —— 默认设置、选择、别名、切换、故障转移、身份验证配置文件 —— 位于 [Models 常见问题](/zh/help/faq-models)。

## Gateway(网关)：端口、“已在运行”和远程模式

<AccordionGroup>
  <Accordion title="Gateway(网关)使用哪个端口？">
    `gateway.port` 控制 WebSocket + HTTP（控制 UI、钩子等）使用的单个多路复用端口。

    优先级：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='为什么 openclaw 网关状态显示“Runtime: running”但“Connectivity probe: failed”？'>
    因为“running”是**监管程序**（supervisor）的视图（launchd/systemd/schtasks）。连接探测是 CLI 实际连接到网关 WebSocket 的过程。

    使用 `openclaw gateway status` 并信任这些行：

    - `Probe target:`（探测实际使用的 URL）
    - `Listening:`（端口上实际绑定的内容）
    - `Last gateway error:`（当进程存活但端口未监听时的常见根本原因）

  </Accordion>

  <Accordion title='为什么 openclaw 网关状态显示的“Config (cli)”和“Config (service)”不同？'>
    您正在编辑一个配置文件，而服务正在运行另一个文件（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    修复方法：

    ```bash
    openclaw gateway install --force
    ```

    请在您希望服务使用的同一 `--profile` / 环境中运行该命令。

  </Accordion>

  <Accordion title='“另一个网关实例已在监听”是什么意思？'>
    OpenClaw 通过在启动时立即绑定 WebSocket 监听器来强制执行运行时锁（默认 `ws://127.0.0.1:18789`）。如果绑定失败并返回 `EADDRINUSE`，它会抛出 `GatewayLockError`，表明另一个实例已在监听。

    修复方法：停止另一个实例，释放端口，或使用 `openclaw gateway --port <port>` 运行。

  </Accordion>

  <Accordion title="如何在远程模式下运行 OpenClaw（客户端连接到其他地方的 Gateway(网关)）？">
    设置 `gateway.mode: "remote"` 并指向一个远程 WebSocket URL，可选择使用共享密钥远程凭据：

    ```json5
    {
      gateway: {
        mode: "remote",
        remote: {
          url: "ws://gateway.tailnet:18789",
          token: "your-token",
          password: "your-password",
        },
      },
    }
    ```

    注意：

    - 仅当 `gateway.mode` 为 `local` 时（或您传递了覆盖标志），`openclaw gateway` 才会启动。
    - macOS 应用程序会监视配置文件，并在这些值更改时实时切换模式。
    - `gateway.remote.token` / `.password` 仅是客户端远程凭据；它们本身不启用本地网关身份验证。

  </Accordion>

  <Accordion title='控制 UI 显示“unauthorized”（或持续重连）。现在该怎么办？'>
    您的网关认证路径与 UI 的认证方法不匹配。

    事实（来自代码）：

    - 控制 UI 将令牌保存在 `sessionStorage` 中，用于当前浏览器标签页会话和选定的网关 URL，因此同一标签页内的刷新可以继续工作，而无需恢复持久的 localStorage 令牌持久性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，当网关返回重试提示（`canRetryWithDeviceToken=true`、`recommendedNextStep=retry_with_device_token`）时，受信任的客户端可以尝试使用缓存的设备令牌进行一次有界重试。
    - 该缓存的令牌重试现在会重用与设备令牌一起存储的已批准的缓存范围。显式 `deviceToken` / 显式 `scopes` 调用者仍然保留其请求的范围集，而不是继承缓存的范围。
    - 在该重试路径之外，连接认证优先级首先是显式共享令牌/密码，然后是显式 `deviceToken`，然后是存储的设备令牌，最后是引导令牌。
    - 内置的 setup-code 引导仅适用于节点。批准后，它返回一个带有 `scopes: []` 的节点设备令牌，并且不返回移交的操作员令牌。

    修复方法：

    - 最快：`openclaw dashboard`（打印 + 复制仪表板 URL，尝试打开；如果是无头模式则显示 SSH 提示）。
    - 如果您还没有令牌：`openclaw doctor --generate-gateway-token`。
    - 如果是远程操作，先建立隧道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/`。
    - 共享密钥模式：设置 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然后在控制 UI 设置中粘贴匹配的密钥。
    - Tailscale Serve 模式：确保 `gateway.auth.allowTailscale` 已启用，并且您打开的是 Serve URL，而不是绕过 Tailscale 身份标头的原始环回/tailnet URL。
    - 受信任代理模式：确保您是通过配置的身份感知代理访问的，而不是原始网关 URL。同主机环回代理也需要 `gateway.auth.trustedProxy.allowLoopback = true`。
    - 如果在一次重试后不匹配仍然存在，请轮换/重新批准配对的设备令牌：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 如果该轮换调用显示被拒绝，请检查两件事：
      - 配对设备会话只能轮换其**自己的**设备，除非它们也拥有 `operator.admin`
      - 显式 `--scope` 值不能超过调用者当前的操作员范围
    - 仍然卡住了？运行 `openclaw status --all` 并按照 [故障排除](/zh/gateway/troubleshooting) 操作。有关认证详细信息，请参阅 [仪表板](/zh/web/dashboard)。

  </Accordion>

  <Accordion title="I set gateway.bind tailnet but it cannot bind and nothing listens">
    `tailnet` bind 从你的网络接口（100.64.0.0/10）中选择一个 Tailscale IP。如果机器不在 Tailscale 上（或者接口已关闭），就没有可绑定的地址。

    修复方法：

    - 在该主机上启动 Tailscale（使其拥有一个 100.x 地址），或者
    - 切换到 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是显式的。`auto` 优先使用 loopback；当你想要仅限 tailnet 的绑定（tailnet-only bind）时，请使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="我可以在同一主机上运行多个 Gateway 吗？">
    通常不行——一个 Gateway(网关) 可以运行多个消息通道和代理。仅在需要冗余（例如：救援机器人）或硬隔离时才使用多个 Gateway。

    可以，但您必须隔离：

    - `OPENCLAW_CONFIG_PATH`（每个实例的配置）
    - `OPENCLAW_STATE_DIR`（每个实例的状态）
    - `agents.defaults.workspace`（工作区隔离）
    - `gateway.port`（唯一端口）

    快速设置（推荐）：

    - 每个实例使用 `openclaw --profile <name> ...`（自动创建 `~/.openclaw-<name>`）。
    - 在每个配置文件中设置唯一的 `gateway.port`（或在手动运行时传递 `--port`）。
    - 安装基于配置文件的服务：`openclaw --profile <name> gateway install`。

    配置文件也会作为服务名称的后缀（`ai.openclaw.<profile>`；旧版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
    完整指南：[多个网关](/zh/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='“无效握手” / 代码 1008 是什么意思？'>
    Gateway(网关) 是一个 **WebSocket 服务器**，它期望收到的第一条消息是 `connect` 帧。如果收到其他任何内容，它将以 **代码 1008**（策略违规）关闭连接。

    常见原因：

    - 您在浏览器中打开了 **HTTP** URL (`http://...`) 而不是使用 WS 客户端。
    - 您使用了错误的端口或路径。
    - 代理或隧道移除了身份验证标头或发送了非 Gateway(网关) 请求。

    快速修复：

    1. 使用 WS URL：`ws://<host>:18789`（如果是 HTTPS 则使用 `wss://...`）。
    2. 不要在普通浏览器标签页中打开 WS 端口。
    3. 如果开启了身份验证，请在 `connect` 帧中包含令牌/密码。

    如果您使用的是 CLI 或 TUI，URL 应如下所示：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    协议详情：[Gateway(网关) 协议](/zh/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 日志记录和调试

<AccordionGroup>
  <Accordion title="日志在哪里？">
    文件日志（结构化）：

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    您可以通过 `logging.file` 设置一个稳定的路径。文件日志级别由 `logging.level` 控制。控制台详细程度由 `--verbose` 和 `logging.consoleLevel` 控制。

    最快的日志追踪方式：

    ```bash
    openclaw logs --follow
    ```macOS

    服务/监督者日志（当网关通过 launchd/systemd 运行时）：

    - macOS launchd stdout：`~/Library/Logs/openclaw/gateway.log`（配置文件使用 `gateway-<profile>.log`Linux；stderr 被抑制）
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`Windows
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    更多信息请参见 [故障排查](/en/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Gateway(网关)如何启动/停止/重启 Gateway(网关) 服务？">
    使用 gateway helpers:

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手动运行 gateway，`openclaw gateway --force`Gateway(网关) 可以回收端口。请参阅 [Gateway(网关)](/zh/gateway)。

  </Accordion>

  <Accordion title="WindowsOpenClaw我在 Windows 上关闭了终端 - 如何重启 OpenClaw？"WindowsWSL2Gateway(网关)Linux>
    有 **两种 Windows 安装模式**：

    **1) WSL2（推荐）：** Gateway(网关) 在 Linux 内部运行。

    打开 PowerShell，进入 WSL，然后重启：

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你从未安装过该服务，请在前台启动它：

    ```bash
    openclaw gateway run
    ```WindowsGateway(网关)Windows

    **2) 原生 Windows（不推荐）：** Gateway(网关) 直接在 Windows 中运行。

    打开 PowerShell 并运行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你手动运行它（无服务），请使用：

    ```powershell
    openclaw gateway run
    ```WindowsWSL2

    文档：[Windows (WSL2)](/en/platforms/windowsGateway(网关)), [Gateway(网关) service runbook](/en/gateway)。

  </Accordion>

  <Accordion title="Gateway(网关)Gateway(网关)已启动，但从未收到回复。我应该检查什么？">
    首先进行快速健康检查：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常见原因：

    - **gateway host**上未加载模型认证（检查 `models status`WebChatTailscaleGateway(网关)）。
    - 渠道配对/允许列表阻止了回复（检查渠道配置 + 日志）。
    - WebChat/Dashboard 在没有正确令牌的情况下打开。

    如果您是远程访问，请确认隧道/Tailscale连接已启动，并且
    Gateway WebSocket 可达。

    文档：[渠道](/zh/channels)、[故障排除](/zh/gateway/troubleshooting)、[远程访问](/zh/gateway/remote)。

  </Accordion>

  <Accordion title='“Disconnected from gateway: no reason” - 接下来该怎么办？'Gateway(网关)>
    这通常意味着 UI 丢失了 WebSocket 连接。请检查：

    1. Gateway(网关) 是否正在运行？ `openclaw gateway status`Gateway(网关)
    2. Gateway(网关) 是否健康？ `openclaw status`
    3. UI 是否拥有正确的令牌？ `openclaw dashboard`Tailscale
    4. 如果是远程访问，隧道/Tailscale 链接是否正常？

    然后查看日志：

    ```bash
    openclaw logs --follow
    ```

    文档：[仪表板](/zh/web/dashboard)、[远程访问](/zh/gateway/remote)、[故障排除](/zh/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="TelegramTelegram setMyCommands 失败。我应该检查什么？">
    首先检查日志和渠道状态：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然后对照错误：

    - `BOT_COMMANDS_TOO_MUCH`TelegramOpenClawTelegram：Telegram 菜单项过多。OpenClaw 已经会将其修剪至 Telegram 限制并使用较少的命令重试，但仍需要删除部分菜单项。减少插件/技能/自定义命令，或者如果您不需要菜单，请禁用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或类似网络错误：如果您在 VPS 上或位于代理之后，请确认允许出站 HTTPS 并且 `api.telegram.org`Gateway(网关)Gateway(网关)Telegram 的 DNS 正常工作。

    如果 Gateway 是远程的，请确保您正在查看 Gateway 主机上的日志。

    文档：[Telegram](/zh/channels/telegram)、[渠道故障排除](/zh/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUITUI 没有输出。我应该检查什么？"Gateway(网关)>
    首先确认 Gateway(网关) 是可达的，并且代理可以运行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```TUI

    在 TUI 中，使用 `/status` 查看当前状态。如果你期望在聊天渠道中收到回复，请确保已启用投递（`/deliver on`TUI）。

    文档：[TUI](/en/web/tui)，[Slash 命令](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="Gateway(网关)如何完全停止然后启动 Gateway(网关)？">
    如果您安装了该服务：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```macOSLinuxGateway(网关)

    这将停止/启动 **受监管的服务**（macOS 上的 launchd，Linux 上的 systemd）。
    当 Gateway(网关) 作为守护进程在后台运行时，请使用此方法。

    如果您在前台运行，请使用 Ctrl-C 停止，然后：

    ```bash
    openclaw gateway run
    ```Gateway(网关)

    文档：[Gateway(网关) 服务手册](/en/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: 重启 **后台服务** (launchd/systemd)。
    - `openclaw gateway`: 在此前台运行网关，用于此终端会话。

    如果您安装了该服务，请使用网关命令。当您想要一次性前台运行时，请使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails"Gateway(网关)>
    使用 `--verbose`RPC 启动 Gateway(网关) 以获取更多控制台详细信息。然后检查日志文件中的渠道认证、模型路由和 RPC 错误。
  </Accordion>
</AccordionGroup>

## 媒体和附件

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    智能体发出的出站附件必须使用结构化媒体字段，例如 `media`、`mediaUrl`、`path` 或 `filePath`。请参阅 [OpenClaw assistant setup](/en/start/openclaw) 和 [Agent send](/en/tools/agent-send)。

    CLI 发送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    还需检查：

    - 目标渠道支持出站媒体且未被允许列表阻止。
    - 文件在提供商的大小限制内（图像会被调整为最大 2048px）。
    - `tools.fs.workspaceOnly=true` 将本地路径发送限制在工作区、temp/media-store 和沙盒验证的文件内。
    - `tools.fs.workspaceOnly=false` 允许结构化本地媒体发送使用智能体已可读取的宿主机本地文件，但仅限于媒体和安全文档类型（图像、音频、视频、PDF 和 Office 文档）。纯文本和类机密文件仍被阻止。

    请参阅 [Images](/zh/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全与访问控制

<AccordionGroup>
  <Accordion title="OpenClaw让 OpenClaw 接收入站私信安全吗？">
    将入站私信视为不受信任的输入。默认设置旨在降低风险：

    - 支持私信的渠道上的默认行为是**配对**（pairing）：
      - 未知发送者会收到一个配对码；机器人不会处理他们的消息。
      - 使用以下命令批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 每个渠道的待处理请求上限为 **3 个**；如果未收到代码，请检查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公开开放私信需要显式选择加入（`dmPolicy: "open"` 和允许列表 `"*"`）。

    运行 `openclaw doctor` 以发现有风险的私信策略。

  </Accordion>

  <Accordion title="提示词注入仅是公开机器人需要关注的问题吗？">
    不。提示词注入关注的是**不受信任的内容**，而不仅仅是谁能给机器人发私信。
    如果你的助手读取外部内容（网络搜索/抓取、浏览器页面、电子邮件、
    文档、附件、粘贴的日志），该内容可能包含试图劫持模型的指令。即使**你是唯一的发送者**，这也可能发生。

    最大的风险在于启用工具时：模型可能会被诱骗泄露上下文或代表你调用工具。通过以下方式减小爆炸半径：

    - 使用只读或禁用工具的“阅读器”智能体来总结不受信任的内容
    - 为启用工具的智能体关闭 `web_search` / `web_fetch` / `browser`
    - 将解码后的文件/文档文本也视为不受信任：OpenResponses
      `input_file` 和媒体附件提取都将提取的文本包裹在显式的外部内容边界标记中，而不是直接传递原始文件文本
    - 沙箱隔离和严格的工具允许列表

    详情：[Security](/zh/gateway/security)。

  </Accordion>

  <Accordion title="OpenClaw由于使用 TypeScript/Node 而不是 Rust/WASM，OpenClaw 是否不够安全？"OpenClawGateway(网关)>
    语言和运行时很重要，但它们不是个人智能体的主要风险。OpenClaw 的实际风险包括 Gateway(网关) 暴露、谁可以向机器人发送消息、提示词注入、工具范围、凭证处理、浏览器访问、exec 访问以及第三方技能或插件的信任问题。

    Rust 和 WASM 可以为某些类别的代码提供更强的隔离，但它们无法解决提示词注入、糟糕的允许列表、公开 Gateway(网关) 暴露、范围过广的工具，或已登录敏感账户的浏览器配置文件问题。应将以下措施视为主要控制手段：

    - 保持 Gateway(网关) 私有或经过身份验证
    - 对私信和群组使用配对和允许列表
    - 拒绝或沙箱隔离不受信任输入的 risky 工具
    - 仅安装受信任的插件和技能
    - 配置更改后运行 `openclaw security audit --deep`

    详情：[Security](/zh/gateway/security)、[沙箱隔离](/zh/gateway/sandboxing)。

  </Accordion>

  <Accordion title="OpenClaw我看到关于暴露的 OpenClaw 实例的报告。我应该检查什么？">
    首先检查您的实际部署：

    ```bash
    openclaw security audit --deep
    openclaw gateway status
    ```Gateway(网关)

    一个更安全的标准是：

    - Gateway(网关) 绑定到 `loopback`，或者仅通过经过身份验证的私有
      访问（例如 tailnet、SSH 隧道、令牌/密码身份验证或正确配置的受信任代理）暴露
    - 私信 处于 `pairing` 或 `allowlist` 模式
    - 群组已列入白名单并设置了提及限制，除非每个成员都受信任
    - 高风险 工具（`exec`、`browser`、`gateway`、`cron`）对于读取不受信任内容的代理
      予以拒绝或严格限制范围
    - 在 工具 执行需要较小爆炸半径的地方启用沙箱隔离

    没有身份验证的公共绑定、带有 工具 的开放私信/群组以及暴露的浏览器
    控制是首先要修复的问题。详情：
    [Security audit checklist](/en/gateway/security#security-audit-checklist)。

  </Accordion>

  <Accordion title="安装 ClawHub 技能和第三方插件是否安全？">
    应将第三方技能和插件视为您选择信任的代码。
    ClawHub 技能页面会在安装前公开扫描状态，而 OpenClaw 插件
    安装/更新流程会运行内置的危险代码检查，但扫描并非
    完整的安全边界。

    更安全的模式：

    - 优先选择受信任的作者和固定版本
    - 在启用技能或插件之前先阅读其内容
    - 保持插件和技能的允许列表尽可能狭窄
    - 在沙盒中使用最少的工具运行不受信任输入的工作流
    - 避免给予第三方代码对文件系统、执行、浏览器或机密信息的广泛访问权限

    详情：[技能](/en/tools/skills)、[插件](/en/tools/plugin)、
    [安全](/en/gateway/security)。

  </Accordion>

  <Accordion title="我的机器人应该有自己的电子邮件、GitHub 账户或电话号码吗？">
    是的，对于大多数设置来说。使用单独的账户和电话号码隔离机器人
    可以在出现问题时减少波及范围。这也使得轮换
    凭据或撤销访问权限变得更加容易，而不会影响您的个人账户。

    从小处着手。仅授予您实际需要的工具和账户的访问权限，并在
    需要时进行扩展。

    文档：[安全性](/en/gateway/security)，[配对](/en/channels/pairing)。

  </Accordion>

  <Accordion title="我可以让它自主控制我的短信吗？这安全吗？">
    我们**不**建议让它完全自主控制您的个人消息。最安全的模式是：

    - 将私信保持在**配对模式**或严格的允许列表中。
    - 如果您希望它代表您发送消息，请使用**独立的号码或帐户**。
    - 让它起草草稿，然后在发送前**进行审批**。

    如果您想尝试，请在专用帐户上进行操作，并保持隔离。请参阅
    [安全](/en/gateway/security)。

  </Accordion>

<Accordion title="我可以为个人助手任务使用更便宜的模型吗？">可以，**如果**代理仅限聊天且输入是受信任的。较低层级的模型更容易受到指令劫持，因此对于启用了工具的代理或在读取不受信任的内容时，请避免使用它们。如果您必须使用较小的模型，请锁定工具并在沙盒内运行。请参阅[安全性](/en/gateway/security)。</Accordion>

  <Accordion title="Telegram我在 Telegram 中运行了 /start 但没有收到配对代码">
    配对代码**仅**在未知发送者向机器人发送消息且
    `dmPolicy: "pairing"` 已启用时发送。仅 `/start` 本身不会生成代码。

    检查待处理的请求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您想立即访问，请将您的发送者 ID 加入白名单或为该账户设置 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsAppWhatsApp：它会给我的联系人发消息吗？配对如何工作？"WhatsAppOpenClaw>
    不会。默认的 WhatsApp 私信策略是 **配对（pairing）**。未知发送者只会收到配对码，且其消息 **不会被处理**。OpenClaw 仅回复收到的聊天或由您触发的显式发送。

    使用以下方式批准配对：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待处理的请求：

    ```bash
    openclaw pairing list whatsapp
    ```WhatsApp

    向导手机号码提示：它用于设置您的 **allowlist/owner**，以便允许您自己的私信。它不用于自动发送。如果您在个人 WhatsApp 号码上运行，请使用该号码并启用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天命令、中止任务和“它无法停止”

<AccordionGroup>
  <Accordion title="如何阻止内部系统消息在聊天中显示？">
    大多数内部或工具消息仅在该会话启用了 **verbose**、**trace** 或 **reasoning** 时才会显示。

    在出现该问题的聊天中修复：

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    如果仍然显得嘈杂，请检查 Control UI 中的会话设置，并将 verbose 设置为 **inherit**。同时确认您没有在配置文件中使用将 `verboseDefault` 设置为 `on` 的机器人配置文件。

    文档：[Thinking and verbose](/en/tools/thinking)，[Security](/en/gateway/security/index#reasoning-and-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在运行的任务？">
    将以下任一内容**作为独立消息发送**（不使用斜杠）：

    ```
    stop
    stop action
    stop current action
    stop run
    stop current run
    stop agent
    stop the agent
    stop openclaw
    openclaw stop
    stop don't do anything
    stop do not do anything
    stop doing anything
    please stop
    stop please
    abort
    esc
    wait
    exit
    interrupt
    ```

    这些是中止触发器（不是斜杠命令）。

    对于后台进程（来自 exec 工具），你可以要求代理运行：

    ```
    process action:kill sessionId:XXX
    ```

    斜杠命令概述：请参阅 [斜杠命令](/en/tools/slash-commands)。

    大多数命令必须作为以 `/` 开头的**独立**消息发送，但少数快捷方式（如 `/status`）对于列入白名单的发送者也可以内联使用。

  </Accordion>

  <Accordion title='如何从 Discord 发送 Telegram 消息？（“拒绝跨上下文消息传递”）'>
    OpenClaw 默认阻止**跨提供商**消息传递。如果工具调用绑定到
    Telegram，除非您明确允许，否则它不会发送到 Discord。

    为代理启用跨提供商消息传递：

    ```json5
    {
      tools: {
        message: {
          crossContext: {
            allowAcrossProviders: true,
            marker: { enabled: true, prefix: "[from {channel}] " },
          },
        },
      },
    }
    ```

    编辑配置后重启网关。

  </Accordion>

  <Accordion title='为什么机器人似乎“忽略”了快速连续的消息？'>
    默认情况下，运行中的提示会被引导至当前的运行中。使用 `/queue` 来选择当前运行的行为：

    - `steer` - 在下一个模型边界处引导当前运行
    - `followup` - 对消息进行排队，并在当前运行结束后逐条运行
    - `collect` - 对兼容的消息进行排队，并在当前运行结束后回复一次
    - `interrupt` - 中止当前运行并重新开始

    默认模式为 `steer`。你可以为排队模式添加诸如 `debounce:0.5s cap:25 drop:summarize` 之类的选项。参见 [Command queue](/zh/concepts/queue) 和 [Steering queue](/zh/concepts/queue-steering)。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title="AnthropicAPIAnthropic API 密钥的默认模型是什么？" OpenClaw>
    在 OpenClaw 中，凭据和模型选择是分开的。设置 `ANTHROPIC_API_KEY`AnthropicAPI（或在身份验证配置文件中存储 Anthropic API 密钥）可以启用身份验证，但实际的默认模型是您在 `agents.defaults.model.primary` 中配置的任何内容（例如，`anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`Gateway(网关)Anthropic，这意味着 Gateway
    无法在正在运行的代理的预期 `auth-profiles.json` 中找到 Anthropic 凭据。
  </Accordion>
</AccordionGroup>

---

还是卡住了？在 [Discord](https://discord.com/invite/clawd) 中提问或开启一个 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。

## 相关

- [首次运行常见问题](/zh/help/faq-first-run) — 安装、入门、认证、订阅、早期故障
- [模型常见问题](/zh/help/faq-models) — 模型选择、故障转移、认证配置文件
- [故障排除](/zh/help/troubleshooting) — 基于症状的分类排查
