---
summary: "关于 OpenClaw 设置、配置和使用的常见问题解答"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常见问题"
---

针对真实场景（本地开发、VPS、多代理、OAuth/API 密钥、模型故障转移）的快速解答和更深入的故障排除。有关运行时诊断，请参阅 [Troubleshooting](OAuthAPI/en/gateway/troubleshooting)。有关完整配置参考，请参阅 [Configuration](/zh/gateway/configuration)。

## 如果出现故障，请先看这 60 秒

1. **快速状态（首要检查）**

   ```bash
   openclaw status
   ```

   快速本地摘要：操作系统 + 更新、Gateway/服务可达性、智能体/会话、提供商配置 + 运行时问题（当 Gateway 可达时）。

2. **可粘贴报告（可安全分享）**

   ```bash
   openclaw status --all
   ```

   带有日志尾部（令牌已编辑）的只读诊断。

3. **守护进程 + 端口状态**

   ```bash
   openclaw gateway status
   ```

   显示监督程序运行时与 RPC 可达性的对比、探测目标 URL 以及服务可能使用的配置。

4. **深度探测**

   ```bash
   openclaw status --deep
   ```

   运行实时网关健康探测，包括支持时的渠道探测
   （需要可访问的网关）。请参阅 [Health](/zh/gateway/health)。

5. **查看最新日志**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 宕机，请回退到：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   文件日志与服务日志是分开的；请参阅 [Logging](/zh/logging) 和 [Troubleshooting](/zh/gateway/troubleshooting)。

6. **运行医生（修复）**

   ```bash
   openclaw doctor
   ```

   修复/迁移配置/状态 + 运行健康检查。请参阅 [Doctor](/zh/gateway/doctor)。

7. **Gateway(网关) 快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   请求正在运行的网关提供完整快照（仅限 WebSocket）。请参阅 [Health](/zh/gateway/health)。

## 快速开始和首次运行设置

首次运行问答 — 安装、入门、身份验证路径、订阅、初始失败 —
位于 [First-run 常见问题](/zh/help/faq-first-run)。

## 什么是 OpenClaw？

<AccordionGroup>
  <Accordion title="用一句话概括，OpenClaw 是什么？">
    OpenClaw 是一个运行在您自有设备上的个人 AI 助手。它会在您常用的消息界面（WhatsApp、Telegram、Slack、Mattermost、Discord、Google Chat、Signal、iMessage、WebChat 以及捆绑的渠道插件（如 QQ Bot））上进行回复，并且还可以在受支持平台上进行语音交互和实时 Canvas 操作。**Gateway(网关)** 是常驻控制平面；而助手本身则是最终产品。
  </Accordion>

  <Accordion title="Value proposition">
    OpenClaw 不仅仅是“一个 Claude 包装器”。它是一个**以本地优先的控制平面**，让您可以在**您自己的硬件**上运行一个
    能干的助手，通过您已经使用的聊天应用访问，具有
    有状态的会话、记忆和工具——而无需将您的工作流控制权交给托管的
    SaaS。

    亮点：

    - **您的设备，您的数据：** 在您想要的任何地方运行 Gateway(网关)（Mac、Linux、VPS）并保持
      工作区 + 会话历史在本地。
    - **真实渠道，而非 Web 沙盒：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/等，
      加上受支持平台上的移动语音和 Canvas。
    - **模型无关：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，具有按代理的路由
      和故障转移。
    - **仅本地选项：** 运行本地模型，因此如果您愿意，**所有数据都可以保留在您的设备上**。
    - **多代理路由：** 按渠道、帐户或任务分离代理，每个都有自己的
      工作区和默认设置。
    - **开源且可扩展：** 检查、扩展和自托管，没有供应商锁定。

    文档：[Gateway(网关)](/zh/gateway)、[渠道](/zh/channels)、[多代理](/zh/concepts/multi-agent)、
    [记忆](/zh/concepts/memory)。

  </Accordion>

  <Accordion title="我刚刚搭建好它——首先应该做什么？">
    不错的入门项目：

    - 构建一个网站（WordPress、Shopify 或一个简单的静态网站）。
    - 原型制作一个移动应用（大纲、屏幕、API 计划）。
    - 整理文件和文件夹（清理、重命名、标记）。
    - 连接 Gmail 并自动化生成摘要或后续跟进。

    它可以处理大型任务，但最好是将它们分成几个阶段，并使用子代理进行并行工作。

  </Accordion>

  <Accordion title="OpenClaw 的五大日常用例是什么？">
    日常的胜利通常表现为：

    - **个人简报：** 您关心的收件箱、日历和新闻摘要。
    - **研究与起草：** 针对邮件或文档的快速研究、摘要和初稿。
    - **提醒与跟进：** 由 cron 或心跳驱动的提示和检查清单。
    - **浏览器自动化：** 填写表单、收集数据以及重复的网页任务。
    - **跨设备协调：** 从手机发送任务，让 Gateway(网关) 在服务器上运行，并在聊天中获取结果。

  </Accordion>

  <Accordion title="OpenClawOpenClaw 可以帮助 SaaS 进行潜在客户开发、外联、广告和博客撰写吗？"OpenClaw>
    对于**研究、资格审核和起草**来说，是的。它可以扫描网站、建立候选名单、
    总结潜在客户情况，并撰写外联或广告文案草稿。

    对于**外联或广告投放**，请保持人工介入。避免发送垃圾邮件，遵守当地法律
    和平台政策，并在发送前进行审核。最安全的模式是让
    OpenClaw 起草，然后由您批准。

    文档：[安全](/zh/gateway/security)。

  </Accordion>

  <Accordion title="与 Claude Code 相比，OpenClaw 在 Web 开发中有哪些优势？"OpenClawOpenClawWhatsAppTelegramTUIWebChatGateway(网关)>
    OpenClaw 是一个 **个人助手** 和协调层，而不是 IDE 的替代品。使用
    Claude Code 或 Codex 在代码库内部进行最快的直接编码循环。当你
    需要持久的记忆、跨设备访问和工具编排时，请使用 OpenClaw。

    优势：

    - **持久化记忆 + 工作空间**，跨会话可用
    - **多平台访问**（WhatsApp、Telegram、TUI、WebChat）
    - **工具编排**（浏览器、文件、调度、钩子）
    - **始终在线的 Gateway**（在 VPS 上运行，从任何地方进行交互）
    - 用于本地浏览器/屏幕/摄像头/执行的 **节点**

    演示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Skills 和自动化

<AccordionGroup>
  <Accordion title="如何在不弄脏仓库的情况下自定义技能？">
    使用托管覆盖而不是编辑仓库副本。将您的更改放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或者通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加一个文件夹）。优先级顺序是 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`，因此托管覆盖仍然胜过捆绑技能，而无需触及 git。如果您需要全局安装该技能但仅对某些代理可见，请将共享副本保留在 `~/.openclaw/skills` 中，并使用 `agents.defaults.skills` 和 `agents.list[].skills` 控制可见性。只有值得上游提交的编辑才应该存在于仓库中并作为 PR 发出。
  </Accordion>

  <Accordion title="我可以从自定义文件夹加载技能吗？">
    是的。通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加额外目录（优先级最低）。默认优先级是 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`。`clawhub` 默认安装到 `./skills` 中，OpenClaw 在下一次会话时将其视为 `<workspace>/skills`。如果该技能只应对特定代理可见，请将其与 `agents.defaults.skills` 或 `agents.list[].skills` 配合使用。
  </Accordion>

  <Accordion title="如何为不同的任务使用不同的模型？">
    目前支持的模式有：

    - **Cron jobs (定时任务)**：隔离的任务可以为每个作业设置 `model` 覆盖。
    - **Sub-agents (子代理)**：将任务路由到具有不同默认模型的独立代理。
    - **On-demand switch (按需切换)**：使用 `/model` 随时切换当前会话的模型。

    请参阅 [Cron jobs](/zh/automation/cron-jobs)、[Multi-Agent Routing](/zh/concepts/multi-agent) 和 [Slash commands](/zh/tools/slash-commands)。

  </Accordion>

  <Accordion title="The bot freezes while doing heavy work. How do I offload that?">
    使用 **sub-agents（子代理）** 处理耗时或并行任务。子代理在它们自己的 会话（会话）中运行，
    返回摘要，并使您的主聊天保持响应。

    让您的机器人“为此任务生成一个子代理”或使用 `/subagents`。
    在聊天中使用 `/status` 查看 Gateway(网关) 正在做什么（以及它是否忙碌）。

    Token 提示：长任务和子代理都会消耗 tokens。如果关注成本，可以通过 `agents.defaults.subagents.model` 为子代理设置更便宜的 模型（模型）。

    文档：[Sub-agents](/zh/tools/subagents)、[Background Tasks](/zh/automation/tasks)。

  </Accordion>

  <Accordion title="DiscordDiscord 上的线程绑定子代理会话是如何工作的？"Discord>
    使用线程绑定。您可以将 Discord 线程绑定到子代理或会话目标，以便该线程中的后续消息保持在绑定的会话上。

    基本流程：

    - 使用 `thread: true` 通过 `sessions_spawn` 生成（可选地使用 `mode: "session"` 进行持续跟进）。
    - 或使用 `/focus <target>` 手动绑定。
    - 使用 `/agents` 检查绑定状态。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自动取消聚焦。
    - 使用 `/unfocus` 分离线程。

    所需配置：

    - 全局默认值：`session.threadBindings.enabled`，`session.threadBindings.idleHours`，`session.threadBindings.maxAgeHours`Discord。
    - Discord 覆盖设置：`channels.discord.threadBindings.enabled`，`channels.discord.threadBindings.idleHours`，`channels.discord.threadBindings.maxAgeHours`。
    - 生成时自动绑定：`channels.discord.threadBindings.spawnSessions` 默认为 `true`；将其设置为 `false` 可禁用线程绑定会话生成。

    文档：[子代理](/zh/tools/subagentsDiscord)，[Discord](/zh/channels/discord)，[配置参考](/zh/gateway/configuration-reference)，[斜杠命令](/zh/tools/slash-commands)。

  </Accordion>

  <Accordion title="子代理已完成，但完成更新发送到了错误的位置或从未发布。我应该检查什么？"OpenClaw>
    首先检查已解析的请求者路由：

    - 完成模式子代理传递优先使用任何绑定的线程或对话路由（如果存在）。
    - 如果完成源仅包含渠道，OpenClaw 会回退到请求者会话的存储路由（`lastChannel` / `lastTo` / `lastAccountId`），以便直接传递仍然可以成功。
    - 如果既没有绑定路由也没有可用的存储路由，直接传递可能会失败，结果会回退到排队会话传递，而不是立即发布到聊天。
    - 无效或过期的目标仍然可能导致强制回退到队列或最终传递失败。
    - 如果子代理的最后一个可见助手回复确是无声令牌 `NO_REPLY` / `no_reply`，或者完全是 `ANNOUNCE_SKIP`OpenClaw，OpenClaw 会有意抑制公告，而不是发布过时的早期进度。
    - 如果子代理在仅进行工具调用后超时，公告可能会将其折叠为一个简短的部分进度摘要，而不是重播原始工具输出。

    调试：

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[子代理](/zh/tools/subagents)、[后台任务](/zh/automation/tasks)、[会话工具](/zh/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒未触发。我应该检查什么？"Gateway(网关)Gateway(网关)>
    Cron 在 Gateway(网关) 进程内运行。如果 Gateway(网关) 未持续运行，
    定时作业将不会执行。

    检查清单：

    - 确认 cron 已启用 (`cron.enabled`) 且未设置 `OPENCLAW_SKIP_CRON`Gateway(网关)。
    - 检查 Gateway(网关) 是否 24/7 运行（无休眠/重启）。
    - 验证作业的时区设置 (`--tz` 与主机时区对比)。

    调试：

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文档：[Cron 作业](/zh/automation/cron-jobs)，[自动化](/zh/automation)。

  </Accordion>

  <Accordion title="Cron 已触发，但没有任何内容发送到渠道。为什么？">
    首先检查交付模式：

    - `--no-deliver` / `delivery.mode: "none"` 意味着不预期会有运行器后备发送。
    - 缺失或无效的公告目标（`channel` / `to`）意味着运行器跳过了出站交付。
    - 渠道认证失败（`unauthorized`， `Forbidden`）意味着运行器尝试交付但凭据阻止了它。
    - 无声隔离结果（仅 `NO_REPLY` / `no_reply`）被视为故意不可交付，因此运行器也会抑制排队的后备交付。

    对于隔离的 cron 作业，当聊天路由可用时，代理仍然可以使用 `message`
    工具直接发送。`--announce` 仅控制代理尚未发送的最终文本的运行器
    后备路径。

    调试：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[Cron jobs](/zh/automation/cron-jobs)，[Background Tasks](/zh/automation/tasks)。

  </Accordion>

  <Accordion title="为什么隔离的 cron 运行会切换模型或重试一次？">
    这通常是实时的模型切换路径，而不是重复调度。

    隔离的 cron 可以持久化运行时模型切换并在当前
    运行抛出 `LiveSessionModelSwitchError` 时重试。重试会保留切换后的
    提供商/模型，并且如果切换带有新的身份验证配置文件覆盖，cron
    也会在重试前持久化该配置。

    相关选择规则：

    - Gmail hook 模型覆盖在适用时优先获胜。
    - 然后是每个作业的 `model`。
    - 然后是任何存储的 cron-会话 模型覆盖。
    - 然后是正常的代理/默认模型选择。

    重试循环是有界的。在初始尝试加上 2 次切换重试后，
    cron 会中止而不是无限循环。

    调试：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[Cron 作业](/zh/automation/cron-jobs)、[cron CLI](/zh/cli/cron)。

  </Accordion>

  <Accordion title="如何在 Linux 上安装 Skills？">
    使用原生 `openclaw skills` 命令或将 Skills 放入您的工作区。macOSLinux 上的 Skills UI 不可用。
    在 [https://clawhub.ai](https://clawhub.ai) 浏览 Skills。

    ```bash
    openclaw skills search "calendar"
    openclaw skills search --limit 20
    openclaw skills install <skill-slug>
    openclaw skills install <skill-slug> --version <version>
    openclaw skills install <skill-slug> --force
    openclaw skills update --all
    openclaw skills list --eligible
    openclaw skills check
    ```

    原生 `openclaw skills install` 会写入当前工作区 `skills/`
    目录。仅当您想要发布或
    同步您自己的 Skills 时，才需要安装单独的 `clawhub` CLI。对于跨 Agent 的共享安装，请将 skill 放在
    `~/.openclaw/skills` 下，并使用 `agents.defaults.skills` 或
    `agents.list[].skills` 如果您想限制哪些 Agent 可以看到它。

  </Accordion>

  <Accordion title="OpenClawOpenClaw 可以按计划运行任务或在后台连续运行吗？"Gateway(网关)>
    是的。使用 Gateway(网关) 调度器：

    - **Cron jobs** 用于定时或周期性任务（重启后仍然保留）。
    - **Heartbeat** 用于“主会话”的定期检查。
    - **Isolated jobs** 用于自主代理，用于发布摘要或投递到聊天。

    文档：[Cron jobs](/zh/automation/cron-jobs)、[Automation](/zh/automation)、
    [Heartbeat](/zh/gateway/heartbeat)。

  </Accordion>

  <Accordion title="macOSLinux我可以从 Linux 运行仅限 Apple macOS 的技能吗？"macOS>
    不能直接运行。macOS 技能受到 `metadata.openclaw.os`Gateway(网关)Linux 以及必需二进制文件的限制，只有当技能在 **Gateway(网关) 主机**上可用时，它们才会出现在系统提示中。在 Linux 上，除非您覆盖限制，否则 `darwin` 专用的技能（如 `apple-notes`、`apple-reminders`、`things-mac`Gateway(网关)Gateway(网关)macOSLinux）将不会加载。

    您有三种受支持的模式：

    **选项 A - 在 Mac 上运行 Gateway（最简单）。**
    在存在 macOS 二进制文件的地方运行 Gateway，然后从 Linux 通过 [remote mode](#gateway-ports-already-running-and-remote-modeTailscaleGateway(网关)macOSmacOSGateway(网关)LinuxmacOSOpenClawmacOS) 或通过 Tailscale 进行连接。由于 Gateway 主机是 macOS，技能会正常加载。

    **选项 B - 使用 macOS 节点（无需 SSH）。**
    在 Linux 上运行 Gateway，配对一个 macOS 节点（菜单栏应用），并在 Mac 上将 **节点运行命令** 设置为“始终询问”或“始终允许”。当节点上存在必需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为可用。代理通过 `nodes`macOSGateway(网关)LinuxCLILinux 工具运行这些技能。如果您选择“始终询问”，在提示中批准“始终允许”会将该命令添加到允许列表中。

    **选项 C - 通过 SSH 代理 macOS 二进制文件（高级）。**
    将 Gateway 保留在 Linux 上，但使所需的 CLI 二进制文件解析为在 Mac 上运行的 SSH 封装程序。然后覆盖技能以允许 Linux，使其保持可用状态。

    1. 为二进制文件创建一个 SSH 封装程序（示例：用于 Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 将封装程序放在 Linux 主机的 `PATH`Linux 上（例如 `~/bin/memo`）。
    3. 覆盖技能元数据（工作区或 `~/.openclaw/skills`Linux）以允许 Linux：

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. 启动一个新的会话，以便刷新技能快照。

  </Accordion>

  <Accordion title="您是否有 Notion 或 HeyGen 集成？">
    目前没有内置。

    选项：

    - **自定义 skill / 插件：** 最适合可靠的 API 访问（Notion/HeyGen 均有 API）。
    - **浏览器自动化：** 无需代码即可工作，但速度较慢且更脆弱。

    如果您希望为每个客户（代理机构工作流）保留上下文，一个简单的模式是：

    - 每个客户一个 Notion 页面（上下文 + 偏好设置 + 活跃工作）。
    - 要求代理在会话开始时获取该页面。

    如果您希望有原生集成，请提交功能请求或构建一个针对这些 API 的 skill。

    安装 skills：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安装会放在活动工作区 `skills/` 目录中。对于跨代理共享的 skills，请将它们放在 `~/.openclaw/skills/<name>/SKILL.md` 中。如果只有部分代理应该看到共享安装，请配置 `agents.defaults.skills` 或 `agents.list[].skills`。有些 skills 需要通过 Homebrew 安装二进制文件；在 Linux 上，这意味着 Linuxbrew（请参阅上面的 Homebrew Linux 常见问题条目）。请参阅 [Skills](/zh/tools/skills)、[Skills config](/zh/tools/skills-config) 和 [ClawHub](/zh/clawhub)。

  </Accordion>

  <Accordion title="OpenClaw如何将我现有的已登录 Chrome 浏览器与 OpenClaw 结合使用？">
    使用内置的 `user` 浏览器配置文件，该文件通过 Chrome DevTools MCP 附加：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果您想要自定义名称，请创建一个显式的 MCP 配置文件：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```Gateway(网关)

    此路径可以使用本地主机浏览器或连接的浏览器节点。如果 Gateway(网关) 运行在其他地方，请在浏览器机器上运行节点主机，或者改用远程 CDP。

    `existing-session` / `user` 的当前限制：

    - 操作由引用驱动，而非由 CSS 选择器驱动
    - 上传需要 `ref` / `inputRef` 并且目前一次仅支持一个文件
    - `responsebody`、PDF 导出、下载拦截和批量操作仍需要托管浏览器或原始 CDP 配置文件

  </Accordion>
</AccordionGroup>

## 沙箱隔离和内存

<AccordionGroup>
  <Accordion title="Is there a dedicated 沙箱隔离 doc?">
    是的。请参阅 [沙箱隔离](/en/gateway/sandboxing)。有关 Docker 特定的设置（Docker 中的完整网关或沙箱映像），请参阅 [Docker](/en/install/docker)。
  </Accordion>

  <Accordion title="DockerDocker 感觉受限 - 如何启用完整功能？">
    默认镜像以安全为优先，并以 `node` 用户身份运行，因此它不包含系统软件包、Homebrew 或捆绑的浏览器。要进行更完整的设置：

    - 使用 `OPENCLAW_HOME_VOLUME` 持久化 `/home/node`，以便缓存能够保留。
    - 使用 `OPENCLAW_DOCKER_APT_PACKAGES`CLI 将系统依赖项构建到镜像中。
    - 通过捆绑的 CLI 安装 Playwright 浏览器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 设置 `PLAYWRIGHT_BROWSERS_PATH`Docker 并确保路径已持久化。

    文档：[Docker](/en/install/docker)，[Browser](/en/tools/browser)。

  </Accordion>

  <Accordion title="Can I keep 私信 personal but make groups public/沙箱隔离 with one agent?">
    可以 - 如果您的私人流量是 **私信 (私信)**，而公共流量是 **群组**。

    使用 `agents.defaults.sandbox.mode: "non-main"`Docker，以便群组/渠道会话（非主密钥）在配置的沙箱后端中运行，而主私信会话保持在宿主机上。如果您不选择后端，Docker 是默认后端。然后通过 `tools.sandbox.tools` 限制沙箱会话中可用的工具。

    设置演练 + 示例配置：[群组：个人私信 + 公共群组](/en/channels/groups#pattern-personal-dms-public-groups-single-agentGateway(网关))

    关键配置参考：[Gateway(网关) configuration](/en/gateway/config-agents#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="如何将主机文件夹绑定到沙箱？">
    将 `agents.defaults.sandbox.docker.binds` 设置为 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全局与每个代理的绑定会合并；当启用 `scope: "shared"` 时，每个代理的绑定会被忽略。对于任何敏感内容，请使用 `:ro`，并记住绑定会绕过沙箱文件系统隔离。

    OpenClaw 会根据规范化路径和通过最深层现有祖先解析的规范路径来验证绑定源。这意味着即使最后一个路径段尚不存在，符号链接父目录逃逸仍会失败关闭，并且在解析符号链接后仍会应用允许根目录检查。

    有关示例和安全说明，请参阅 [沙箱隔离](/en/gateway/sandboxing#custom-bind-mounts) 和 [沙箱 vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。

  </Accordion>

  <Accordion title="How does memory work?"OpenClaw>
    OpenClaw 内存只是代理工作区中的 Markdown 文件：

    - 位于 `memory/YYYY-MM-DD.md` 中的每日笔记
    - 位于 `MEMORY.md`OpenClaw 中的精选长期笔记（仅限主/私有会话）

    OpenClaw 还会运行 **静默预压缩内存刷新**，以提醒模型
    在自动压缩之前写入持久化笔记。这仅在工作区
    可写时运行（只读沙箱会跳过它）。请参阅 [Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="Memory keeps forgetting things. How do I make it stick?">
    让机器人**将事实写入记忆**。长期笔记应保存在 `MEMORY.md` 中，
    短期上下文则放入 `memory/YYYY-MM-DD.md`Gateway(网关)。

    这仍是我们正在改进的领域。提醒模型存储记忆会有所帮助；
    它会知道该怎么做。如果它一直忘记，请验证 Gateway(网关) 在每次运行时是否使用相同的
    工作区。

    文档：[Memory](/en/concepts/memory)，[Agent workspace](/en/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="内存是否会永久保留？有哪些限制？">
    内存文件存储在磁盘上，在您删除之前会一直保留。限制在于您的
    存储空间，而不是模型。**会话上下文**仍然受限于模型的
    上下文窗口，因此长对话可能会压缩或截断。这就是
    存在内存搜索的原因——它只将相关部分拉回上下文中。

    文档：[Memory](/en/concepts/memory)，[Context](/en/concepts/context)。

  </Accordion>

  <Accordion title="OpenAIAPI语义记忆搜索是否需要 OpenAI API 密钥？"OpenAIOAuthOAuthCLIOpenAIAPI>
    仅当您使用 **OpenAI 嵌入**时。Codex OAuth 涵盖聊天/补全功能，并
    **不**授予嵌入访问权限，因此**使用 Codex 登录（OAuth 或
    Codex CLI 登录）**对语义记忆搜索没有帮助。OpenAI 嵌入
    仍然需要真实的 API 密钥（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`OpenClawAPI）。

    如果您没有显式设置提供商，OpenClaw 会在它
    能够解析 API 密钥（身份验证配置文件、`models.providers.*.apiKey`OpenAIOpenAIOpenClaw 或环境变量）时自动选择提供商。
    如果解析到 OpenAI 密钥，它首选 OpenAI，否则如果解析到 Gemini 密钥则首选 Gemini，
    然后是 Voyage，接着是 Mistral。如果没有可用的远程密钥，记忆
    搜索将保持禁用状态，直到您对其进行配置。如果您配置了本地模型路径
    且该路径存在，OpenClaw
    会首选 `local`Ollama。当您显式设置
    `memorySearch.provider = "ollama"` 时，支持 Ollama。

    如果您更愿意保持本地运行，请设置 `memorySearch.provider = "local"`（并可选
    `memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，请设置
    `memorySearch.provider = "gemini"` 并提供 `GEMINI_API_KEY`（或
    `memorySearch.remote.apiKey`OpenAIOllama）。我们支持 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本地**嵌入
    模型 - 有关设置详细信息，请参阅 [Memory](/en/concepts/memory)。

  </Accordion>
</AccordionGroup>

## 文件在磁盘上的位置

<AccordionGroup>
  <Accordion title="与 OpenClaw 一起使用的所有数据都会保存在本地吗？">
    不 - **OpenClaw 的状态是本地的**，但 **外部服务仍然可以看到您发送给它们的内容**。

    - **默认为本地：** 会话、内存文件、配置和工作区位于 Gateway(网关) 主机上
      (`~/.openclaw` + 您的工作区目录)。
    - **必须远程：** 您发送给模型提供商 (Anthropic/OpenAI/等) 的消息会发送到
      它们的 API，而聊天平台 (WhatsApp/Telegram/Slack/等) 会将消息数据存储在它们的
      服务器上。
    - **您可以控制范围：** 使用本地模型可以将提示保留在您的机器上，但渠道
      流量仍然会通过渠道的服务器。

    相关：[Agent workspace](/en/concepts/agent-workspace), [Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClawOpenClaw 将其数据存储在哪里？">
    所有内容都位于 `$OPENCLAW_STATE_DIR` 下（默认：`~/.openclaw`）：

    | 路径                                                            | 用途                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主配置 (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`OAuth                    | 旧版 OAuth 导入（首次使用时复制到 auth profiles）       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json`OAuthAPI | 认证配置（OAuth、API 密钥以及可选的 `keyRef`/`tokenRef`）  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | `file` SecretRef 提供者的可选文件支持的秘密负载 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 旧版兼容文件（已清除静态 `api_key` 条目）      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供者状态（例如 `whatsapp/<accountId>/creds.json`）            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每个代理的状态（agentDir + sessions）                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 对话历史和状态（每个代理）                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 会话元数据（每个代理）                                       |

    旧版单代理路径：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）。

    您的**工作区**（AGENTS.md、内存文件、技能等）是独立的，通过 `agents.defaults.workspace` 配置（默认：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该放在哪里？">
    这些文件位于 **agent workspace（代理工作区）** 中，而不是 `~/.openclaw` 中。

    - **Workspace (per agent，每个代理的工作区)**: `AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md`、`memory/YYYY-MM-DD.md`、可选的 `HEARTBEAT.md`。
      小写根目录 `memory.md` 仅用于遗留修复输入；当这两个文件都存在时，`openclaw doctor --fix`
      可以将其合并到 `MEMORY.md` 中。
    - **State dir (`~/.openclaw`，状态目录)**: 配置、渠道/提供商状态、认证配置文件、会话、日志
      以及共享技能 (`~/.openclaw/skills`)。

    默认工作区是 `~/.openclaw/workspace`，可通过以下方式配置：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```Gateway(网关)

    如果机器人在重启后“忘记”了信息，请确认 Gateway(网关) 在每次启动时使用的是相同的
    工作区（请记住：远程模式使用的是 **Gateway(网关) 主机的**
    工作区，而不是你本地笔记本电脑的工作区）。

    提示：如果你希望持久保存某些行为或偏好，请要求机器人将其 **写入
    AGENTS.md 或 MEMORY.md**，而不是依赖聊天记录。

    参见 [Agent workspace](/en/concepts/agent-workspace) 和 [Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="推荐的备份策略">
    将您的 **agent workspace**（代理工作区）放入一个**私有** git 仓库中，并将其备份到某个私有位置（例如 GitHub 私有仓库）。这样可以捕获内存以及 AGENTS/SOUL/USER
    文件，并允许您稍后恢复助手的“思维”。

    请**不要**提交 `~/.openclaw` 下的任何内容（凭据、会话、令牌或加密密钥载荷）。
    如果您需要完全恢复，请分别备份工作区和状态目录（参见上面的迁移问题）。

    文档：[Agent workspace](/en/concepts/agent-workspace)。

  </Accordion>

<Accordion title="OpenClaw如何完全卸载 OpenClaw？">请参阅专用指南：[Uninstall](/en/install/uninstall)。</Accordion>

  <Accordion title="智能体可以在工作区之外工作吗？">
    是的。工作区是**默认的工作目录（cwd）**和记忆锚点，而不是一个硬性沙箱。
    相对路径在工作区内解析，但除非启用了沙箱隔离，否则绝对路径可以访问
    主机的其他位置。如果您需要隔离，请使用
    [`agents.defaults.sandbox`](/en/gateway/sandboxing) 或针对每个智能体的沙箱设置。如果您
    希望某个仓库成为默认工作目录，请将该智能体的
    `workspace`OpenClaw 指向仓库根目录。OpenClaw 仓库只是源代码；除非您
    故意希望智能体在其中工作，否则请将工作区分开。

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
    会话状态由 **网关主机** 拥有。如果你处于远程模式，你所关心的会话存储位于远程计算机上，而不是你的本地笔记本电脑。请参阅[会话管理](/zh/concepts/session)。
  </Accordion>
</AccordionGroup>

## 配置基础

<AccordionGroup>
  <Accordion title="What format is the config? Where is it?"OpenClaw>
    OpenClaw 从 `$OPENCLAW_CONFIG_PATH` 读取可选的 **JSON5** 配置（默认值：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果文件缺失，它将使用相对安全的默认值（包括默认工作区 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我设置了 gateway.bind: "lan"（或 "tailnet"），现在没有任何监听 / UI 显示未授权'>
    非环回绑定**需要有效的网关认证路径**。实际上这意味着：

    - 共享密钥认证：token 或 password
    - 正确配置的身份感知反向代理后的 `gateway.auth.mode: "trusted-proxy"`

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

    - `gateway.remote.token` / `.password` **不会**单独启用本地网关认证。
    - 仅当未设置 `gateway.auth.*` 时，本地调用路径才能使用 `gateway.remote.*` 作为后备。
    - 对于密码认证，请改设 `gateway.auth.mode: "password"` 加上 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置但未解析，解析将失败关闭（无远程后备掩码）。
    - 共享密钥控制 UI 设置通过 `connect.params.auth.token` 或 `connect.params.auth.password`Tailscale 进行认证（存储在 app/UI 设置中）。诸如 Tailscale Serve 或 `trusted-proxy` 等承载身份的模式则改用请求头。请避免在 URL 中放置共享密钥。
    - 使用 `gateway.auth.mode: "trusted-proxy"` 时，同主机环回反向代理需要显式的 `gateway.auth.trustedProxy.allowLoopback = true` 以及 `gateway.trustedProxies` 中的环回条目。

  </Accordion>

  <Accordion title="为什么我现在在 localhost 上需要一个令牌？"OpenClaw>
    OpenClaw 默认强制执行网关身份验证，包括环回。在正常的默认路径中，这意味着令牌身份验证：如果未配置显式的身份验证路径，网关启动将解析为令牌模式并为该启动生成一个仅运行时的令牌，因此**本地 WS 客户端必须进行身份验证**。当客户端需要跨重启稳定的密钥时，请显式配置 `gateway.auth.token`、`gateway.auth.password`、`OPENCLAW_GATEWAY_TOKEN` 或 `OPENCLAW_GATEWAY_PASSWORD`Gateway(网关)。这会阻止其他本地进程调用 Gateway。

    如果你更喜欢不同的身份验证路径，可以显式选择密码模式（或者，对于具有身份感知能力的反向代理，选择 `trusted-proxy`）。如果你**真的**想要开放环回，请在配置中显式设置 `gateway.auth.mode: "none"`。Doctor 可以随时为你生成令牌：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="更改配置后是否需要重启？"Gateway(网关)>
    Gateway(网关)会监控配置文件并支持热重载：

    - `gateway.reload.mode: "hybrid"`（默认）：热应用安全更改，关键更改则重启
    - `hot`、`restart`、`off` 也受支持

  </Accordion>

  <Accordion title="如何禁用有趣的 CLI 标语？">
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

    - `off`：隐藏标语文本但保留横幅标题/版本行。
    - `default`：每次都使用 `All your chats, one OpenClaw.`。
    - `random`：轮换有趣的/季节性标语（默认行为）。
    - 如果你想要完全没有任何横幅，请设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何启用网络搜索（和网络获取）？">
    `web_fetch` 无需 API 密钥即可工作。`web_search` 取决于您选择的提供商：

    - 基于 APIBrave 的提供商（如 Brave、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Perplexity 和 Tavily）需要其常规的 API 密钥设置。
    - Ollama Web Search 是免密钥的，但它使用您配置的 Ollama 主机并且需要 `ollama signin`。
    - DuckDuckGo 是免密钥的，但它是一个非官方的基于 HTML 的集成。
    - SearXNG 是免密钥/自托管的；请配置 `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`。

    **推荐：** 运行 `openclaw configure --section web` 并选择一个提供商。
    环境变量替代方案：

    - Brave：`BRAVE_API_KEY`
    - Exa：`EXA_API_KEY`
    - Firecrawl：`FIRECRAWL_API_KEY`
    - Gemini：`GEMINI_API_KEY`
    - Grok：`XAI_API_KEY`
    - Kimi：`KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
    - MiniMax Search：`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`
    - Perplexity：`PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`
    - SearXNG：`SEARXNG_BASE_URL`
    - Tavily：`TAVILY_API_KEY`

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
    旧版 `tools.web.search.*` 提供商路径为了兼容性仍会暂时加载，但不应用于新配置。
    Firecrawl 网络获取回退配置位于 `plugins.entries.firecrawl.config.webFetch.*` 下。

    注意事项：

    - 如果您使用允许列表，请添加 `web_search`/`web_fetch`/`x_search` 或 `group:web`。
    - 默认情况下启用 `web_fetch`（除非明确禁用）。
    - 如果省略 `tools.web.fetch.provider`，OpenClaw 会根据可用的凭据自动检测第一个准备就绪的获取回退提供商。目前内置的提供商是 Firecrawl。
    - 守护进程从 `~/.openclaw/.env`（或服务环境）读取环境变量。

    文档：[Web tools](/zh/tools/web)。

  </Accordion>

  <Accordion title="config.apply 擦除了我的配置。如何恢复并避免这种情况？">
    `config.apply` 会替换**整个配置**。如果您发送的是部分对象，所有
    其他内容都会被删除。

    当前的 OpenClaw 会防止许多意外的覆盖：

    - OpenClaw 拥有的配置写入在写入之前会验证完整的变更后配置。
    - 无效或破坏性的 OpenClaw 拥有的写入将被拒绝，并保存为 `openclaw.json.rejected.*`。
    - 如果直接编辑破坏了启动或热重载，Gateway(网关) 将以失败关闭状态运行或跳过重载；它不会重写 `openclaw.json`。
    - `openclaw doctor --fix` 拥有修复功能，可以在保存被拒绝文件为 `openclaw.json.clobbered.*` 的同时恢复最后已知的有效配置。

    恢复：

    - 检查 `openclaw logs --follow` 中是否存在 `Invalid config at`、`Config write rejected:` 或 `config reload skipped (invalid config)`。
    - 在当前活动配置旁边检查最新的 `openclaw.json.clobbered.*` 或 `openclaw.json.rejected.*`。
    - 运行 `openclaw config validate` 和 `openclaw doctor --fix`。
    - 使用 `openclaw config set` 或 `config.patch` 仅复制所需的键值。
    - 如果您没有最后已知的有效配置或被拒绝的有效载荷，请从备份恢复，或重新运行 `openclaw doctor` 并重新配置渠道/模型。
    - 如果这是意外发生的，请提交错误报告并附上您最后已知的配置或任何备份。
    - 本地编码代理通常可以从日志或历史记录中重建有效的配置。

    避免发生：

    - 使用 `openclaw config set` 进行小幅度更改。
    - 使用 `openclaw configure` 进行交互式编辑。
    - 当您不确定确切的路径或字段结构时，请先使用 `config.schema.lookup`；它返回一个浅层模式节点以及用于下钻的直接子级摘要。
    - 使用 `config.patch` 进行部分 RPC 编辑；仅在完全替换配置时保留 `config.apply`。
    - 如果您在代理运行中使用了仅所有者的 `gateway` 工具，它仍将拒绝写入 `tools.exec.ask` / `tools.exec.security`（包括规范化为相同受保护执行路径的旧版 `tools.bash.*` 别名）。

    文档：[Config](/zh/cli/config)、[Configure](/zh/cli/configure)、[Gateway(网关) 故障排除](/zh/gateway/troubleshooting#gateway-rejected-invalid-config)、[Doctor](/zh/gateway/doctor)。

  </Accordion>

  <Accordion title="如何在跨设备的专用工作进程中运行中央Gateway(网关)？">
    常见模式是**一个Gateway(网关)**（例如 Raspberry Pi）加上**节点**和**代理**：

    - **Gateway(网关)（中央）：** 拥有通道（Signal/WhatsApp）、路由和会话。
    - **节点（设备）：** Mac/iOS/Android 作为外设连接并暴露本地工具（`system.run`、`canvas`、`camera`）。
    - **代理（工作进程）：** 针对特殊角色的独立大脑/工作区（例如“Hetzner 运维”、“个人数据”）。
    - **子代理：** 当您需要并行时，从主代理生成后台工作。
    - **TUI：** 连接到Gateway(网关)并切换代理/会话。

    文档：[节点](/zh/nodes)、[远程访问](/zh/gateway/remote)、[多代理路由](/zh/concepts/multi-agent)、[子代理](/zh/tools/subagents)、[TUI](/zh/web/tui)。

  </Accordion>

  <Accordion title="OpenClawOpenClaw 浏览器可以无头模式运行吗？">
    可以的。这是一个配置选项：

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

    默认是 `false` (有头模式)。无头模式在某些网站上更容易触发反机器人检查。参见 [Browser](/zh/tools/browser)。

    无头模式使用**相同的 Chromium 引擎**，适用于大多数自动化操作（表单、点击、抓取、登录）。主要区别如下：

    - 没有可见的浏览器窗口（如果需要视觉内容，请使用截图）。
    - 某些网站对无头模式下的自动化更严格（验证码、反机器人）。
      例如，X/Twitter 经常阻止无头会话。

  </Accordion>

  <Accordion title="Brave如何使用 Brave 进行浏览器控制？">
    将 `browser.executablePath`BraveGateway(网关) 设置为您的 Brave 二进制文件（或任何基于 Chromium 的浏览器）并重启 Gateway(网关)。
    请参阅 [Browser](/zh/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置示例。
  </Accordion>
</AccordionGroup>

## 远程网关和节点

<AccordionGroup>
  <Accordion title="Telegram命令如何在 Telegram、网关和节点之间传播？"TelegramGateway(网关)TelegramGateway(网关)>
    Telegram 消息由 **gateway** 处理。网关运行代理，
    并且仅在需要节点工具时才通过 **Gateway WebSocket** 调用节点：

    Telegram → Gateway → Agent → `node.*`Gateway(网关)TelegramRPC → Node → Gateway → Telegram

    节点看不到入站的提供商流量；它们只接收节点 RPC 调用。

  </Accordion>

  <Accordion title="如果 Gateway(网关) 托管在远程，我的代理如何访问我的计算机？">
    简短回答：**将您的计算机配对为节点**。Gateway(网关) 在其他地方运行，但它可以通过 Gateway(网关) WebSocket 调用您本地计算机上的 `node.*` 工具（屏幕、摄像头、系统）。

    典型设置：

    1. 在常驻主机（VPS/家庭服务器）上运行 Gateway(网关)。
    2. 将 Gateway(网关) 主机和您的计算机置于同一个 tailnet 中。
    3. 确保 Gateway(网关) WS 可访问（tailnet 绑定或 SSH 隧道）。
    4. 在本地打开 macOS 应用程序并以 **Remote over SSH** 模式（或直接 tailnet）连接，以便注册为节点。
    5. 在 Gateway(网关) 上批准节点：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要单独的 TCP 桥接；节点通过 Gateway(网关) WebSocket 连接。

    安全提醒：配对 macOS 节点允许在该机器上进行 `system.run`。仅配对您信任的设备，并查看 [Security](/zh/gateway/security)。

    文档：[Nodes](/zh/nodes)，[Gateway(网关) protocol](/zh/gateway/protocol)，[macOS remote mode](/zh/platforms/mac/remote)，[Security](/zh/gateway/security)。

  </Accordion>

  <Accordion title="TailscaleTailscale 已连接但我没有收到回复。现在怎么办？"Gateway(网关)>
    检查基本信息：

    - Gateway(网关) 正在运行： `openclaw gateway status`Gateway(网关)
    - Gateway(网关) 健康状况： `openclaw status`
    - 频道健康状况： `openclaw channels status`Tailscale

    然后验证认证和路由：

    - 如果你使用 Tailscale Serve，请确保 `gateway.auth.allowTailscale`Tailscale 设置正确。
    - 如果你通过 SSH 隧道连接，请确认本地隧道已启动并指向正确的端口。
    - 确认你的允许列表（私信或群组）包含你的账户。

    文档： [Tailscale](/zh/gateway/tailscale)、[远程访问](/zh/gateway/remote)、[频道](/zh/channels)。

  </Accordion>

  <Accordion title="两个 OpenClaw 实例之间可以互相通信吗（本地 + VPS）？">
    可以。没有内置的“机器人到机器人”桥接器，但您可以通过几种
    可靠的方式进行连接：

    **最简单的方法：** 使用两个机器人都可以访问的普通聊天渠道（Telegram/Slack/WhatsApp）。
    让机器人 A 向机器人 B 发送消息，然后让机器人 B 像往常一样回复。

    **CLI 桥接（通用）：** 运行一个脚本来调用另一个 Gateway(网关)，使用
    `openclaw agent --message ... --deliver`，目标是另一个机器人
    监听的聊天。如果一个机器人在远程 VPS 上，请通过 SSH/CLI 将您的 Gateway(网关) 指向该远程 Tailscale
    （参见 [远程访问](/zh/gateway/remote)）。

    示例模式（从可以访问目标 Gateway(网关) 的机器运行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：添加一个护栏，以便两个机器人不会无限循环（仅限提及、渠道
    允许列表，或“不回复机器人消息”规则）。

    文档：[远程访问](/zh/gateway/remote)，[Agent CLI](/zh/cli/agent)，[Agent send](/zh/tools/agent-send)。

  </Accordion>

  <Accordion title="多个 Agent 是否需要单独的 VPS？">
    不需要。一个 Gateway(网关) 可以托管多个 Agent，每个 Agent 拥有自己的工作区、模型默认设置
    和路由。这是常规的设置方式，比为每个 Agent 运行一个 VPS 更便宜、更简单。

    仅当您需要硬隔离（安全边界）或非常不想共享的不同配置时，才使用单独的 VPS。否则，请保留一个 Gateway(网关) 并
    使用多个 Agent 或子 Agent。

  </Accordion>

  <Accordion title="相比于从 VPS 使用 SSH，在我的个人笔记本电脑上使用节点有什么好处吗？"Gateway(网关)Gateway(网关)macOSLinuxWindowsWSL2Raspberry PiGateway(网关)>
    是的——节点是从远程 Gateway(网关) 连接到笔记本电脑的首选方式，而且它们提供的功能不仅仅是 shell 访问。Gateway(网关) 运行在 macOS/Linux（Windows 通过 WSL2）上，并且非常轻量（小型 VPS 或 Raspberry Pi 级别的盒子即可；4 GB 内存绰绰有余），因此一种常见的设置是使用一台始终在线的主机，再加上您的笔记本电脑作为节点。

    - **无需入站 SSH。** 节点主动连接到 Gateway(网关) 的 WebSocket 并使用设备配对。
    - **更安全的执行控制。** `system.run` 受该笔记本电脑上的节点允许列表/批准限制。
    - **更多设备工具。** 除了 `system.run`Gateway(网关) 之外，节点还暴露 `canvas`、`camera` 和 `screen`。
    - **本地浏览器自动化。** 将 Gateway(网关) 保留在 VPS 上，但通过笔记本电脑上的节点主机在本地运行 Chrome，或者通过 Chrome MCP 连接到主机上的本地 Chrome。

    SSH 用于临时 shell 访问是可以的，但对于持续的代理工作流和设备自动化，节点更为简单。

    文档：[节点](/zh/nodesCLI)、[节点 CLI](/zh/cli/nodes)、[浏览器](/zh/tools/browser)。

  </Accordion>

  <Accordion title="Do nodes run a gateway service?">
    不。每个主机应仅运行**一个网关**，除非您有意运行隔离的配置文件（请参阅 [Multiple gateways](/zh/gateway/multiple-gateways)）。节点是连接到
    网关的外围设备（iOS/Android 节点，或菜单栏应用中的 macOS “节点模式”）。对于无头节点
    主机和 CLI 控制，请参阅 [Node host CLI](/zh/cli/node)。

    对于 `gateway`、`discovery` 和托管插件表面更改，需要完全重启。

  </Accordion>

  <Accordion title="APIRPC有没有应用配置的 API / RPC 方式？">
    有的。

    - `config.schema.lookup`：在写入前检查一个配置子树及其浅层模式节点、匹配的 UI 提示以及直接子项摘要
    - `config.get`：获取当前快照和哈希值
    - `config.patch`：安全的部分更新（大多数 RPC 编辑的首选方式）；尽可能进行热重载，必要时重新启动
    - `config.apply`：验证并替换完整配置；尽可能进行热重载，必要时重新启动
    - 仅限所有者的 `gateway` 运行时工具仍然拒绝重写 `tools.exec.ask` / `tools.exec.security`；旧的 `tools.bash.*` 别名会标准化为相同的受保护执行路径

  </Accordion>

  <Accordion title="首次安装的最低合理配置">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    这将设置您的工作区并限制谁可以触发机器人。

  </Accordion>

  <Accordion title="如何在 VPS 上设置 Tailscale 并从我的 Mac 连接？">
    最少步骤：

    1. **在 VPS 上安装 + 登录**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在你的 Mac 上安装 + 登录**
       - 使用 Tailscale 应用并登录到同一个 tailnet。
    3. **启用 MagicDNS（推荐）**
       - 在 Tailscale 管理控制台中，启用 MagicDNS，以便 VPS 拥有一个稳定的名称。
    4. **使用 tailnet 主机名**
       - SSH：`ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway(网关) WS：`ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果你想在不使用 SSH 的情况下访问控制 UI，请在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    这将保持网关绑定到回环地址，并通过 Tailscale 暴露 HTTPS。参见 [Tailscale](/zh/gateway/tailscale)。

  </Accordion>

  <Accordion title="Gateway(网关)Tailscale如何将 Mac 节点连接到远程 Gateway(网关) (Tailscale Serve)?"Gateway(网关)Gateway(网关)macOSGateway(网关)>
    Serve 暴露了 **Gateway(网关) 控制界面 + WS**。节点通过同一个 Gateway(网关) WS 端点进行连接。

    推荐设置：

    1. **确保 VPS 和 Mac 位于同一个 tailnet 上**。
    2. **在远程模式下使用 macOS 应用**（SSH 目标可以是 tailnet 主机名）。
       该应用将隧道传输 Gateway(网关) 端口并作为节点连接。
    3. **在网关上批准节点**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```Gateway(网关)

    文档：[Gateway(网关) 协议](/en/gateway/protocol)、[设备发现](/en/gateway/discoverymacOS)、[macOS 远程模式](/en/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我应该在第二台笔记本电脑上安装还是只添加一个节点？">
    如果您只需要第二台笔记本电脑上的 **本地工具**（屏幕/摄像头/执行），请将其添加为一个
    **节点**。这样可以保持单一的 Gateway(网关) 并避免重复的配置。本地节点工具目前
    仅支持 macOS，但我们计划将它们扩展到其他操作系统。

    仅当您需要 **强隔离** 或两个完全独立的机器人时，才安装第二个 Gateway(网关)。

    文档：[Nodes](/en/nodes)、[Nodes CLI](/en/cli/nodes)、[Multiple gateways](/en/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 环境变量和 .env 加载

<AccordionGroup>
  <Accordion title="OpenClawOpenClaw 如何加载环境变量？"OpenClaw>
    OpenClaw 从父进程（shell、launchd/systemd、CI 等）读取环境变量，并额外加载：

    - 当前工作目录下的 `.env`
    - `~/.openclaw/.env`（即 `$OPENCLAW_STATE_DIR/.env`）中的全局后备 `.env`

    这两个 `.env` 文件都不会覆盖现有的环境变量。

    您还可以在配置中定义内联环境变量（仅当进程环境中缺失时应用）：

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    有关完整的优先级和来源，请参阅 [/environment](/zh/help/environment)。

  </Accordion>

  <Accordion title="Gateway(网关)我通过服务启动了Gateway(网关)，但我的环境变量消失了。现在该怎么办？">
    两种常见的修复方法：

    1. 将缺失的键名放入 `~/.openclaw/.env` 中，这样即使服务未继承你的 Shell 环境也能加载它们。
    2. 启用 Shell 导入（可选的便捷方式）：

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

    这会运行你的登录 Shell 并仅导入缺失的预期键名（绝不覆盖）。等效的环境变量：
    `OPENCLAW_LOAD_SHELL_ENV=1`，`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我设置了 COPILOT_GITHUB_TOKEN，但模型状态显示 "Shell env: off."（Shell 环境已关闭）。为什么？'>
    `openclaw models status`OpenClawGateway(网关) 报告是否启用了 **shell env import**（Shell 环境导入）。"Shell env: off"（Shell 环境已关闭）
    **并不** 意味着你的环境变量丢失——这只是意味着 OpenClaw 不会自动
    加载你的登录 Shell。

    如果 Gateway(网关) 作为服务运行（launchd/systemd），它将不会继承你的 Shell
    环境。可以通过执行以下操作之一来修复：

    1. 将 token 放入 `~/.openclaw/.env` 中：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或者启用 shell 导入（`env.shellEnv.enabled: true`）。
    3. 或者将其添加到你的配置 `env` 块中（仅在缺失时适用）。

    然后重启 Gateway(网关) 并重新检查：

    ```bash
    openclaw models status
    ```

    Copilot token 读取自 `COPILOT_GITHUB_TOKEN`（也包括 `GH_TOKEN` / `GITHUB_TOKEN`）。
    请参阅 [/concepts/模型-providers](/zh/concepts/model-providers) 和 [/environment](/zh/help/environment)。

  </Accordion>
</AccordionGroup>

## 会话和多个聊天

<AccordionGroup>
  <Accordion title="如何开始一个新的对话？">
    发送 `/new` 或 `/reset` 作为一条独立消息。请参阅 [会话管理](/zh/concepts/session)。
  </Accordion>

  <Accordion title="如果我不发送 /new，会话会自动重置吗？">
    会话可以在 `session.idleMinutes` 后过期，但这在默认情况下是**禁用的**（默认为 **0**）。
    将其设置为正值以启用空闲过期。启用后，空闲期之后的**下一条**消息将为该聊天密钥启动一个新的会话 ID。
    这不会删除对话记录——它只是启动一个新的会话。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="OpenClaw有没有办法组建一个 OpenClaw 实例团队（一个 CEO 和许多代理）？">
    是的，通过**多代理路由**和**子代理**。您可以创建一个协调器
    代理和多个具有各自工作空间和模型的工作代理。

    也就是说，这最好被视为一个**有趣的实验**。它非常消耗 token，而且通常
    比使用一个带有独立会话的机器人效率低。我们构想的典型模型
    是一个您与之交谈的机器人，并通过不同的会话进行并行工作。该
    机器人也可以在需要时生成子代理。

    文档：[多代理路由](/zh/concepts/multi-agent)，[子代理](/zh/tools/subagentsCLI)，[代理 CLI](/zh/cli/agents)。

  </Accordion>

  <Accordion title="为什么上下文在任务中途被截断？我该如何预防？">
    会话上下文受限于模型窗口。长对话、大型工具输出或大量
    文件可能会触发压缩或截断。

    以下措施会有所帮助：

    - 要求机器人总结当前状态并将其写入文件。
    - 在长任务之前使用 `/compact`，并在切换话题时使用 `/new`。
    - 将重要的上下文保存在工作区中，并要求机器人重新读取。
    - 对长时间或并行工作使用子代理，以保持主对话较小。
    - 如果这种情况经常发生，请选择具有更大上下文窗口的模型。

  </Accordion>

  <Accordion title="OpenClaw我如何在保留安装的情况下完全重置 OpenClaw？">
    使用重置命令：

    ```bash
    openclaw reset
    ```

    非交互式完全重置：

    ```bash
    openclaw reset --scope full --yes --non-interactive
    ```

    然后重新运行设置：

    ```bash
    openclaw onboard --install-daemon
    ```CLI

    注意事项：

    - 如果检测到现有配置，新手引导也会提供 **重置** 选项。请参阅 [新手引导 (CLI)](/en/start/wizard)。
    - 如果您使用了配置文件（`--profile` / `OPENCLAW_PROFILE`），请重置每个状态目录（默认为 `~/.openclaw-<profile>`）。
    - 开发重置：`openclaw gateway --dev --reset`（仅限开发；清除开发配置 + 凭证 + 会话 + 工作区）。

  </Accordion>

  <Accordion title='我收到“上下文过大”错误 - 如何重置或压缩？'>
    使用以下方法之一：

    - **压缩**（保留对话但总结较早的轮次）：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 来引导总结。

    - **重置**（为同一聊天键生成新的会话 ID）：

      ```
      /new
      /reset
      ```

    如果问题持续存在：

    - 启用或调整 **会话修剪**（`agents.defaults.contextPruning`）以修剪旧的工具输出。
    - 使用具有更大上下文窗口的模型。

    文档：[压缩](/en/concepts/compaction)、[会话修剪](/en/concepts/session-pruning)、[会话管理](/en/concepts/session)。

  </Accordion>

  <Accordion title='LLM为什么我会看到“LLM request rejected: messages.content.tool_use.input field required”？'>
    这是一个提供商验证错误：模型发出了一个 `tool_use` 块，但缺少必需的
    `input`。这通常意味着会话历史记录已过时或损坏（通常发生在长对话
    或工具/架构更改之后）。

    修复方法：使用 `/new`（独立消息）开始一个新的会话。

  </Accordion>

  <Accordion title="为什么我每 30 分钟会收到心跳消息？">
    心跳默认每 **30m** 运行一次（使用 OAuth 认证时为 **1h**）。您可以调整或禁用它们：

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

    如果 `HEARTBEAT.md` 存在但实际上是空的（只有空行和像 `# Heading` 这样的 markdown
    标题），OpenClaw 会跳过心跳运行以节省 API 调用。
    如果文件丢失，心跳仍会运行，由模型决定做什么。

    每个代理的覆盖设置使用 `agents.list[].heartbeat`。文档：[Heartbeat](/zh/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我是否需要将一个“机器人账号”添加到 WhatsApp 群组？'>
    不需要。OpenClaw 运行在**您自己的账号**上，所以如果您在群组中，OpenClaw 就能看到它。
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
    选项 1（最快方法）：查看日志并在群组中发送一条测试消息：

    ```bash
    openclaw logs --follow --json
    ```

    查找以 `@g.us` 结尾的 `chatId`（或 `from`），例如：
    `1234567890-1234567890@g.us`。

    选项 2（如果已配置/已加入白名单）：从配置中列出群组：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文档：[WhatsApp](/zh/channels/whatsapp)、[目录](/zh/cli/directory)、[日志](/zh/cli/logs)。

  </Accordion>

  <Accordion title="OpenClaw为什么 OpenClaw 不在群组中回复？">
    两个常见原因：

    - 提及门控已开启（默认）。你必须 @提及 机器人（或匹配 `mentionPatterns`）。
    - 你配置了 `channels.whatsapp.groups` 但未配置 `"*"`，且该群组不在允许列表中。

    参见 [群组](/zh/channels/groups) 和 [群组消息](/zh/channels/group-messages)。

  </Accordion>

<Accordion title="Do groups/threads share context with 私信?">默认情况下，直接聊天会合并到主会话中。群组/频道拥有自己的会话密钥，而 Telegram 主题 / Discord 线程则是独立的会话。参见 [Groups](/zh/channels/groups) 和 [Group messages](/zh/channels/group-messages)。</Accordion>

  <Accordion title="我可以创建多少个工作区和代理？">
    没有硬性限制。几十个（甚至几百个）都可以，但请注意以下几点：

    - **磁盘增长：** 会话和对话记录存储在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本：** 代理越多意味着并发的模型使用量越大。
    - **运维开销：** 每个代理的身份验证配置文件、工作区和渠道路由。

    建议：

    - 为每个代理保留一个 **活跃的（active）** 工作区 (`agents.defaults.workspace`)。
    - 如果磁盘增长，请清理旧会话（删除 JSONL 或存储条目）。
    - 使用 `openclaw doctor` 来发现孤立的工作区和配置文件不匹配的情况。

  </Accordion>

  <Accordion title="我可以同时运行多个机器人或聊天（Slack），应该如何设置？">
    是的。使用 **Multi-Agent Routing** 运行多个隔离的代理，并按渠道/账户/对等节点路由传入的消息。Slack 作为一种渠道受到支持，并且可以绑定到特定的代理。

    浏览器访问功能强大但并非“可以做人类能做的任何事情”——反机器人、验证码 (CAPTCHA) 和多因素认证 (MFA) 仍然可以阻止自动化。为了最可靠的浏览器控制，请在主机上使用本地 Chrome MCP，或者在实际运行浏览器的机器上使用 CDP。

    最佳实践设置：

    - 始终开启的 Gateway(网关) 主机 (VPS/Mac mini)。
    - 每个角色一个代理（绑定）。
    - 绑定到这些代理的 Slack 渠道。
    - 根据需要通过 Chrome MCP 或节点使用本地浏览器。

    文档：[Multi-Agent Routing](/zh/concepts/multi-agent)、[Slack](/zh/channels/slack)、
    [Browser](/zh/tools/browser)、[Nodes](/zh/nodes)。

  </Accordion>
</AccordionGroup>

## 模型、故障转移和身份验证配置文件

模型问答 — 默认值、选择、别名、切换、故障转移、认证配置文件 —
位于 [Models 常见问题](/zh/help/faq-models)。

## Gateway(网关)：端口、“正在运行”和远程模式

<AccordionGroup>
  <Accordion title="Gateway(网关)Gateway(网关) 使用哪个端口？">
    `gateway.port` 控制用于 WebSocket + HTTP（控制 UI、hooks 等）的单一多路复用端口。

    优先级：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='为什么 openclaw 网关状态显示“Runtime: running”（运行时：运行中），但“Connectivity probe: failed”（连接探测：失败）？'CLI>
    因为“running”是**监督者**（supervisor）的视图（launchd/systemd/schtasks）。连接探测是 CLI 实际连接到网关 WebSocket 的过程。

    使用 `openclaw gateway status` 并相信以下几行：

    - `Probe target:`（探测实际使用的 URL）
    - `Listening:`（端口上实际绑定的内容）
    - `Last gateway error:`（当进程存活但端口未监听时的常见根本原因）

  </Accordion>

  <Accordion title='为什么 openclaw 网关状态显示的“Config (cli)”和“Config (service)”不同？'>
    您正在编辑一个配置文件，而服务正在运行另一个（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    修复方法：

    ```bash
    openclaw gateway install --force
    ```

    请从您希望服务使用的同一 `--profile` / 环境中运行该命令。

  </Accordion>

  <Accordion title='“另一个网关实例已在监听”是什么意思？'>
    OpenClaw 通过在启动时立即绑定 WebSocket 监听器来强制执行运行时锁（默认 `ws://127.0.0.1:18789`）。如果绑定失败并显示 `EADDRINUSE`，它会抛出 `GatewayLockError`，表明另一个实例已在监听。

    修复方法：停止另一个实例，释放端口，或使用 `openclaw gateway --port <port>` 运行。

  </Accordion>

  <Accordion title="如何在远程模式下运行 OpenClaw（客户端连接到其他地方的 Gateway(网关)）？">
    设置 `gateway.mode: "remote"` 并指向一个远程 WebSocket URL，可以选择使用共享密钥进行远程身份验证：

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

    - 仅当 `gateway.mode` 为 `local` 时（或者您传递了覆盖标志），`openclaw gateway` 才会启动。
    - macOS 应用程序会监视配置文件，并在这些值更改时实时切换模式。
    - `gateway.remote.token` / `.password` 仅是客户端的远程凭据；它们本身不会启用本地网关身份验证。

  </Accordion>

  <Accordion title='控制 UI 显示“未授权”（或不断重新连接）。该怎么办？'>
    您的网关认证路径与 UI 的认证方法不匹配。

    事实（源自代码）：

    - 控制 UI 将令牌保存在 `sessionStorage` 中，用于当前浏览器标签页会话和选定的网关 URL，因此同一标签页的刷新可以继续工作，而无需恢复长期的 localStorage 令牌持久性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，当网关返回重试提示（`canRetryWithDeviceToken=true`，`recommendedNextStep=retry_with_device_token`）时，受信任的客户端可以尝试使用缓存的设备令牌进行一次有限重试。
    - 该缓存令牌重试现在会重用与设备令牌一起存储的缓存批准范围。显式 `deviceToken` / 显式 `scopes` 调用者仍保留其请求的范围集，而不是继承缓存的范围。
    - 在该重试路径之外，连接认证优先级首先是显式共享令牌/密码，然后是显式 `deviceToken`，然后是存储的设备令牌，最后是引导令牌。
    - 内置设置代码引导仅限节点。批准后，它返回一个具有 `scopes: []` 的节点设备令牌，并且不返回移交的操作员令牌。

    修复方法：

    - 最快：`openclaw dashboard`（打印并复制仪表板 URL，尝试打开；如果是无头模式则显示 SSH 提示）。
    - 如果您还没有令牌：`openclaw doctor --generate-gateway-token`。
    - 如果是远程，先建立隧道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/`。
    - 共享密钥模式：设置 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然后在控制 UI 设置中粘贴匹配的密钥。
    - Tailscale Serve 模式：确保 `gateway.auth.allowTailscale` 已启用，并且您打开的是 Serve URL，而不是绕过 Tailscale 身份标头的原始环回/tailnet URL。
    - 受信任代理模式：确保您通过配置的身份感知代理进行连接，而不是原始网关 URL。同主机环回代理也需要 `gateway.auth.trustedProxy.allowLoopback = true`。
    - 如果在一次重试后不匹配仍然存在，请轮换/重新批准配对的设备令牌：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 如果该轮换调用显示被拒绝，请检查两件事：
      - 配对设备会话只能轮换其**自己的**设备，除非它们也有 `operator.admin`
      - 显式 `--scope` 值不能超过调用者当前的操作员范围
    - 仍然卡住？运行 `openclaw status --all` 并按照 [故障排除](/zh/gateway/troubleshooting) 操作。有关身份验证详细信息，请参阅 [仪表板](/zh/web/dashboard)。

  </Accordion>

  <Accordion title="I set gateway.bind tailnet but it cannot bind and nothing listens">
    `tailnet` bind 会从你的网络接口中选择一个 Tailscale IP (100.64.0.0/10)。如果机器不在 Tailscale 上（或者接口处于关闭状态），就没有可供绑定的地址。

    修复方法：

    - 在该主机上启动 Tailscale（使其拥有 100.x 地址），或者
    - 切换到 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是显式的。 `auto` 优先使用环回地址；当你想要仅绑定 tailnet 时，请使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="Can I run multiple Gateways on the same host?">
    通常不行——一个 Gateway(网关) 可以运行多个消息通道和代理。仅在需要冗余（例如：救援机器人）或硬隔离时才使用多个 Gateway。

    可以，但必须隔离：

    - `OPENCLAW_CONFIG_PATH`（每个实例的配置）
    - `OPENCLAW_STATE_DIR`（每个实例的状态）
    - `agents.defaults.workspace`（工作区隔离）
    - `gateway.port`（唯一端口）

    快速设置（推荐）：

    - 每个实例使用 `openclaw --profile <name> ...`（自动创建 `~/.openclaw-<name>`）。
    - 在每个配置文件中设置唯一的 `gateway.port`（或在手动运行时传递 `--port`）。
    - 安装每个配置文件的服务：`openclaw --profile <name> gateway install`。

    配置文件还会给服务名称添加后缀（`ai.openclaw.<profile>`；传统名称 `com.openclaw.*`，`openclaw-gateway-<profile>.service`，`OpenClaw Gateway (<profile>)`）。
    完整指南：[Multiple gateways](/zh/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='“invalid handshake” / 代码 1008 是什么意思？'>
    Gateway(网关) 是一个 **WebSocket 服务器**，它期望接收到的第一条消息必须是 `connect` 帧。如果收到其他任何内容，它会以 **代码 1008**（违反策略）关闭连接。

    常见原因：

    - 您在浏览器中打开了 **HTTP** URL (`http://...`) 而不是使用 WS 客户端。
    - 您使用了错误的端口或路径。
    - 代理或隧道剥离了身份验证标头或发送了非 Gateway(网关) 请求。

    快速修复：

    1. 使用 WS URL：`ws://<host>:18789`（如果使用 HTTPS，则为 `wss://...`）。
    2. 不要在普通的浏览器标签页中打开 WS 端口。
    3. 如果开启了身份验证，请在 `connect` 帧中包含令牌/密码。

    如果您使用的是 CLI 或 TUI，URL 应如下所示：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    协议详情：[Gateway(网关) protocol](/zh/gateway/protocol)。

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

    最快的日志跟踪方式：

    ```bash
    openclaw logs --follow
    ```

    服务/监管日志（当网关通过 launchd/systemd 运行时）：

    - macOS launchd stdout：`~/Library/Logs/openclaw/gateway.log`（配置文件使用 `gateway-<profile>.log`；stderr 被抑制）
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    更多信息请参见 [故障排除](/zh/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Gateway(网关)如何启动/停止/重启 Gateway(网关) 服务？">
    使用 Gateway 辅助脚本：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手动运行 gateway，`openclaw gateway --force`Gateway(网关) 可以回收该端口。请参阅 [Gateway(网关)](/zh/gateway)。

  </Accordion>

  <Accordion title="WindowsOpenClaw我在 Windows 上关闭了终端 - 如何重启 OpenClaw？"WindowsWSL2Gateway(网关)Linux>
    **Windows** 有 **两种安装模式**：

    **1) WSL2 (推荐)：** Gateway 在 Linux 内部运行。

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

    **2) Windows 原生 (不推荐)：** Gateway 直接在 Windows 中运行。

    打开 PowerShell 并运行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你手动运行它（无服务），请使用：

    ```powershell
    openclaw gateway run
    ```WindowsWSL2

    文档：[Windows (WSL2)](/en/platforms/windowsGateway(网关))、[Gateway 服务手册](/en/gateway)。

  </Accordion>

  <Accordion title="Gateway(网关)Gateway(网关)已启动但从未收到回复。我应该检查什么？">
    首先进行快速健康检查：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常见原因：

    - 模型认证未加载到 **gateway host** 上（检查 `models status`WebChatTailscaleGateway(网关)）。
    - 渠道配对/允许列表阻止了回复（检查渠道配置 + 日志）。
    - WebChat/Dashboard 未使用正确的令牌打开。

    如果您是远程访问，请确认隧道/Tailscale 连接已启动，且
    Gateway(网关) WebSocket 可达。

    文档：[渠道](/zh/channels)、[故障排除](/zh/gateway/troubleshooting)、[远程访问](/zh/gateway/remote)。

  </Accordion>

  <Accordion title='“已断开与 Gateway(网关) 的连接：无原因” - 现在怎么办？'Gateway(网关)>
    这通常意味着 UI 失去了 WebSocket 连接。请检查：

    1. Gateway(网关) 是否正在运行？ `openclaw gateway status`Gateway(网关)
    2. Gateway(网关) 状态是否健康？ `openclaw status`
    3. UI 是否拥有正确的令牌 (token)？ `openclaw dashboard`Tailscale
    4. 如果是远程访问，隧道/Tailscale 链接是否已建立？

    然后跟踪日志：

    ```bash
    openclaw logs --follow
    ```

    文档：[Dashboard](/zh/web/dashboard)，[Remote access](/zh/gateway/remote)，[Troubleshooting](/zh/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="TelegramTelegram setMyCommands 失败。我应该检查什么？">
    首先检查日志和渠道状态：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然后对照错误信息：

    - `BOT_COMMANDS_TOO_MUCH`TelegramOpenClawTelegram：Telegram 菜单项过多。OpenClaw 已经会修剪至 Telegram 限制并使用更少的命令重试，但仍需手动删除部分菜单项。请减少插件/技能/自定义命令，或者如果不需要菜单，请禁用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或类似网络错误：如果您使用的是 VPS 或位于代理之后，请确认允许出站 HTTPS 并且 `api.telegram.org`Gateway(网关)Gateway(网关)Telegram 的 DNS 解析正常。

    如果 Gateway(网关) 是远程的，请确保您查看的是 Gateway(网关) 主机上的日志。

    文档：[Telegram](/zh/channels/telegram)、[渠道故障排除](/zh/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUITUI shows no output. What should I check?"Gateway(网关)>
    首先确认 Gateway(网关) 是否可达以及代理能否运行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```TUI

    在 TUI 中，使用 `/status` 查看当前状态。如果您期望在聊天渠道中收到回复，
    请确保已启用投递功能（`/deliver on`TUI）。

    文档：[TUI](/en/web/tui)，[Slash commands](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="Gateway(网关)如何完全停止然后启动 Gateway(网关)？">
    如果你安装了该服务：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```macOSLinuxGateway(网关)

    这会停止/启动 **supervised service**（macOS 上的 launchd，Linux 上的 systemd）。
    当 Gateway(网关) 作为守护进程在后台运行时，请使用此方法。

    如果你是在前台运行，使用 Ctrl-C 停止，然后：

    ```bash
    openclaw gateway run
    ```Gateway(网关)

    文档：[Gateway(网关) service runbook](/en/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: 重启**后台服务**（launchd/systemd）。
    - `openclaw gateway`: 在此终端**会话**的前台运行网关。

    如果您安装了该服务，请使用 gateway 命令。当您想要一次性在前台运行时，请使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="出现故障时获取更多详情的最快方法"Gateway(网关)>
    使用 `--verbose`RPC 启动 Gateway(网关) 以获取更多控制台详细信息。然后检查日志文件中的渠道身份验证、模型路由和 RPC 错误。
  </Accordion>
</AccordionGroup>

## 媒体和附件

<AccordionGroup>
  <Accordion title="我的技能生成了图片/PDF，但没有任何内容被发送">
    来自代理的出站附件必须包含 `MEDIA:<path-or-url>`OpenClaw 行（独占一行）。请参阅 [OpenClaw 助手设置](/en/start/openclaw) 和 [代理发送](/en/tools/agent-sendCLI)。

    CLI 发送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    还要检查：

    - 目标渠道支持出站媒体，且未被允许列表阻止。
    - 文件在提供商的大小限制内（图片会被调整为最大 2048px）。
    - `tools.fs.workspaceOnly=true` 将本地路径发送限制在工作区、temp/media-store 和沙盒验证的文件。
    - `tools.fs.workspaceOnly=false` 允许 `MEDIA:` 发送代理已可读取的主机本地文件，但仅限于媒体和安全文档类型（图片、音频、视频、PDF 和 Office 文档）。纯文本和类似机密的文件仍被阻止。

    请参阅 [图片](/zh/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全与访问控制

<AccordionGroup>
  <Accordion title="OpenClaw将 OpenClaw 暴露给入站私信是否安全？">
    将入站私信视为不受信任的输入。默认设置旨在降低风险：

    - 支持私信的渠道上的默认行为是**配对**（pairing）：
      - 未知发件人会收到一个配对码；机器人不会处理他们的消息。
      - 使用以下命令批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 每个渠道的待处理请求上限为 **3 个**；如果未收到代码，请检查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公开开放私信需要明确选择加入（`dmPolicy: "open"` 和允许列表 `"*"`）。

    运行 `openclaw doctor` 以查找有风险的私信策略。

  </Accordion>

  <Accordion title="提示词注入仅是公共机器人需要关注的问题吗？">
    不。提示词注入针对的是**不受信任的内容**，而不仅仅是谁能向机器人发送私信。
    如果您的助手读取外部内容（网络搜索/抓取、浏览器页面、电子邮件、
    文档、附件、粘贴的日志），该内容可能包含试图
    劫持模型的指令。即使**您是唯一的发送者**，这也可能发生。

    最大的风险在于启用了工具时：模型可能被诱骗
    窃取上下文或代表您调用工具。通过以下方式减少爆炸半径：

    - 使用只读或禁用工具的“阅读器”代理来汇总不受信任的内容
    - 为启用了工具的代理关闭 `web_search` / `web_fetch` / `browser`
    - 同样将解码后的文件/文档文本视为不受信任：OpenResponses
      `input_file` 和媒体附件提取都会将提取的文本包裹在
      明确的外部内容边界标记中，而不是直接传递原始文件文本
    - 使用沙箱隔离和严格的工具允许列表

    详情：[Security](/zh/gateway/security)。

  </Accordion>

  <Accordion title="GitHub我的机器人应该拥有自己的电子邮件、GitHub 账户或电话号码吗？">
    是的，对于大多数设置而言。使用独立的账户和电话号码将机器人隔离，
    可以在出现问题时减小波及范围。这也使得轮换凭据或撤销访问权限变得更容易，
    且不会影响您的个人账户。

    从小处着手。仅授予您实际需要的工具和账户的访问权限，并在必要时
    稍后扩展。

    文档：[安全](/zh/gateway/security)，[配对](/zh/channels/pairing)。

  </Accordion>

  <Accordion title="我可以让它完全自主地控制我的短信吗？这安全吗？">
    我们**不**建议让它对你的个人消息拥有完全的自主权。最安全的模式是：

    - 将私信保持在**配对模式**或严格的允许列表中。
    - 如果你希望它代表你发送消息，请使用**单独的电话号码或帐户**。
    - 让它起草草稿，然后**在发送前进行审批**。

    如果你想要进行实验，请在专用帐户上进行操作并保持其隔离。请参阅
    [安全](/zh/gateway/security)。

  </Accordion>

<Accordion title="我可以在个人助理任务中使用更便宜的模型吗？">是的，**如果**代理仅用于聊天且输入是可信的。较小的层级更容易受到指令劫持，因此对于启用了工具的代理或在读取不可信内容时，请避免使用它们。如果您必须使用较小的模型，请锁定工具并在沙盒内运行。请参阅 [安全](/zh/gateway/security)。</Accordion>

  <Accordion title="Telegram我在 Telegram 中运行了 /start 但没有收到配对代码">
    配对代码**仅**在未知发送者向机器人发送消息且启用了
    `dmPolicy: "pairing"` 时发送。仅凭 `/start` 不会生成代码。

    检查待处理的请求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您希望立即获得访问权限，请将您的发送者 ID 加入白名单，或为该账户设置
    `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsAppWhatsApp: 它会给我的联系人发消息吗？配对是如何工作的？"WhatsAppOpenClaw>
    不会。默认 WhatsApp 私信策略是**配对**。未知发件人只会收到配对代码，且其消息**不会被处理**。OpenClaw 仅回复它收到的聊天或您触发的显式发送。

    使用以下命令批准配对：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待处理请求：

    ```bash
    openclaw pairing list whatsapp
    ```WhatsApp

    向导电话号码提示：它用于设置您的**白名单/所有者**，以便允许您自己的私信。它不用于自动发送。如果您在个人 WhatsApp 号码上运行，请使用该号码并启用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天命令、中止任务和“它不会停止”

<AccordionGroup>
  <Accordion title="如何防止内部系统消息显示在聊天中？">
    大多数内部或工具消息仅当该会话启用了 **verbose**、**trace** 或 **reasoning** 时才会显示。

    在出现该问题的聊天中修复：

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    如果仍然很嘈杂，请在控制 UI 中检查会话设置并将 verbose 设置为 **inherit**（继承）。还要确认您没有在配置中使用了将 `verboseDefault` 设置为 `on` 的机器人配置文件。

    文档：[Thinking and verbose](/en/tools/thinking)、[Security](/en/gateway/security/index#reasoning-and-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在运行的任务？">
    发送以下任意一条内容作为**独立消息**（不要带斜杠）：

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

    斜杠命令概览：参见 [斜杠命令](/en/tools/slash-commands)。

    大多数命令必须作为以 `/` 开头的**独立**消息发送，但少数快捷方式（例如 `/status`）对于允许列表中的发送者也可以内联使用。

  </Accordion>

  <Accordion title='如何从 Telegram 发送 Discord 消息？（“Cross-context messaging denied”）'>
    OpenClaw 默认阻止**跨提供商（cross-提供商）**消息传递。如果工具调用绑定到 Telegram，除非您明确允许，否则它不会发送到 Discord。

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

    编辑配置后重启 Gateway(网关)。

  </Accordion>

  <Accordion title='为什么感觉机器人会“忽略”快速连续发送的消息？'>
    运行中途的提示默认会被引导至当前正在运行的活动中。使用 `/queue` 来选择当前活动的行为：

    - `steer` - 在下一个模型边界引导当前活动
    - `followup` - 将消息排队，并在当前活动结束后逐一运行
    - `collect` - 将兼容的消息排队，并在当前活动结束后回复一次
    - `interrupt` - 中止当前活动并重新开始

    默认模式是 `steer`。您可以为排队模式添加诸如 `debounce:0.5s cap:25 drop:summarize` 之类的选项。请参阅 [命令队列](/zh/concepts/queue) 和 [引导队列](/zh/concepts/queue-steering)。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title="AnthropicAPI使用 API 密钥时 Anthropic 的默认模型是什么？" OpenClaw>
    在 OpenClaw 中，凭据和模型选择是分开的。设置 `ANTHROPIC_API_KEY`AnthropicAPI（或在身份验证配置文件中存储 Anthropic API 密钥）可以启用身份验证，但实际的默认模型是您在 `agents.defaults.model.primary` 中配置的任何模型（例如，`anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`Gateway(网关)Anthropic，这意味着 Gateway
    无法在正在运行的代理的预期 `auth-profiles.json` 中找到 Anthropic 凭据。
  </Accordion>
</AccordionGroup>

---

仍然卡住了？在 [Discord](https://discord.com/invite/clawd) 中提问或开启 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。

## 相关

- [首次运行常见问题](/zh/help/faq-first-run) — 安装、入职、身份验证、订阅、早期故障
- [模型常见问题](/zh/help/faq-models) — 模型选择、故障转移、身份验证配置文件
- [故障排查](/zh/help/troubleshooting) —— 基于症状的分诊
