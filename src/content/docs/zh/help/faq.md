---
summary: "关于 OpenClaw 设置、配置和使用的常见问题解答"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常见问题"
---

针对现实环境设置（本地开发、VPS、多智能体、OAuth/API 密钥、模型故障转移）的快速解答及深入故障排除。有关运行时诊断，请参阅 [故障排除](/zh/gateway/troubleshooting)。有关完整的配置参考，请参阅 [配置](/zh/gateway/configuration)。

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

   运行实时 Gateway 健康探测，包括支持时的渠道探测
   （需要可访问的 Gateway）。请参阅 [健康检查](/zh/gateway/health)。

5. **查看最新日志**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 宕机，请回退到：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   文件日志与服务日志是分开的；请参阅 [日志记录](/zh/logging) 和 [故障排除](/zh/gateway/troubleshooting)。

6. **运行医生（修复）**

   ```bash
   openclaw doctor
   ```

   修复/迁移配置/状态 + 运行健康检查。请参阅 [医生](/zh/gateway/doctor)。

7. **Gateway(网关) 快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向运行中的 Gateway 请求完整快照（仅限 WS）。请参阅 [健康检查](/zh/gateway/health)。

## 快速开始和首次运行设置

首次运行问答 — 安装、入门、认证路由、订阅、初始失败 —
位于 [首次运行 常见问题](/zh/help/faq-first-run)。

## 什么是 OpenClaw？

<AccordionGroup>
  <Accordion title="用一句话概括，OpenClaw 是什么？">
    OpenClaw 是一个运行在您自有设备上的个人 AI 助手。它会在您常用的消息界面（WhatsApp、Telegram、Slack、Mattermost、Discord、Google Chat、Signal、iMessage、WebChat 以及捆绑的渠道插件（如 QQ Bot））上进行回复，并且还可以在受支持平台上进行语音交互和实时 Canvas 操作。**Gateway(网关)** 是常驻控制平面；而助手本身则是最终产品。
  </Accordion>

  <Accordion title="价值主张">
    OpenClaw 不仅仅是一个“Claude 的外壳”。它是一个**本地优先的控制平面**，允许您在**自己的硬件**上运行一个功能强大的助手，通过您已使用的聊天应用进行访问，并拥有有状态的会话、记忆和工具——无需将您的工作流程控制权移交给托管的 SaaS。

    亮点：

    - **您的设备，您的数据：** 在您想要的地方运行 Gateway(网关)（Mac、Linux、VPS），并将工作区 + 会话历史保留在本地。
    - **真实的渠道，而非网络沙盒：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，以及在受支持平台上的移动端语音和 Canvas。
    - **模型无关：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，支持按代理路由和故障转移。
    - **仅限本地选项：** 运行本地模型，这样如果您愿意，**所有数据都可以保留在您的设备上**。
    - **多代理路由：** 按渠道、帐户或任务分离代理，每个代理都有自己的工作区和默认设置。
    - **开源且可定制：** 检查、扩展和自托管，没有供应商锁定。

    文档：[Gateway(网关)](/zh/gateway)、[Channels(渠道)](/zh/channels)、[Multi-agent](/zh/concepts/multi-agent)、
    [Memory](/zh/concepts/memory)。

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

  <Accordion title="OpenClaw 能否帮助 SaaS 进行潜在客户开发、外联、广告和博客撰写？">
    在**研究、资格筛选和起草**方面可以。它可以扫描网站、建立候选名单、
    总结潜在客户，并撰写外联或广告文案草稿。

    对于**外联或广告投放**，请保持人工参与。避免垃圾邮件，遵守当地法律和
    平台政策，并在发送前审核所有内容。最安全的模式是让
    OpenClaw 起草，由您批准。

    文档：[安全](/zh/gateway/security)。

  </Accordion>

  <Accordion title="与 Claude Code 相比，在 Web 开发方面有哪些优势？">
    OpenClaw 是一个**个人助手**和协调层，而不是 IDE 的替代品。在代码仓库内部进行最快的直接编码循环时，请使用 Claude Code 或 Codex。当您需要持久的记忆、跨设备访问和工具编排时，请使用 OpenClaw。

    优势：

    - 跨会话的**持久记忆 + 工作空间**
    - **多平台访问** (WhatsApp, Telegram, TUI, WebChat)
    - **工具编排** (浏览器、文件、调度、钩子)
    - **常开 Gateway(网关)** (在 VPS 上运行，从任何地方交互)
    - 用于本地浏览器/屏幕/相机/命令执行的 **Nodes**

    展示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

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

  <Accordion title="如何针对不同的任务使用不同的模型？">
    目前支持的模式有：

    - **Cron jobs（定时任务）**：隔离的任务可以为每个任务设置 `model` 覆盖。
    - **Sub-agents（子代理）**：将任务路由到具有不同默认模型的独立代理。
    - **按需切换**：使用 `/model` 随时切换当前会话模型。

    请参阅 [Cron jobs](/zh/automation/cron-jobs)、[Multi-Agent Routing](/zh/concepts/multi-agent) 和 [Slash commands](/zh/tools/slash-commands)。

  </Accordion>

  <Accordion title="机器人在执行繁重任务时卡住了。我该如何卸载这些任务？">
    使用 **sub-agents（子代理）** 来处理长时间或并行任务。子代理在自己的会话中运行，
    返回摘要，并保持您的主聊天响应及时。

    让您的机器人“为此任务生成一个子代理”或使用 `/subagents`。
    在聊天中使用 `/status` 查看 Gateway(网关) 当前正在做什么（以及它是否忙碌）。

    令牌提示：长任务和子代理都会消耗令牌。如果成本是关注点，请通过 `agents.defaults.subagents.model` 为子代理设置更便宜的模型。

    文档：[Sub-agents](/zh/tools/subagents)、[Background Tasks](/zh/automation/tasks)。

  </Accordion>

  <Accordion title="线程绑定的子代理会话在 Discord 上是如何工作的？">
    使用线程绑定。您可以将 Discord 线程绑定到子代理或会话目标，以便该线程中的后续消息保持在该绑定的会话上。

    基本流程：

    - 使用 `thread: true` 生成 `sessions_spawn`（并可选地使用 `mode: "session"` 进行持续跟进）。
    - 或使用 `/focus <target>` 手动绑定。
    - 使用 `/agents` 检查绑定状态。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自动取消聚焦。
    - 使用 `/unfocus` 分离线程。

    必需的配置：

    - 全局默认值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆盖：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 生成时自动绑定：设置 `channels.discord.threadBindings.spawnSubagentSessions: true`。

    文档：[Sub-agents](/zh/tools/subagents)、[Discord](/zh/channels/discord)、[Configuration Reference](/zh/gateway/configuration-reference)、[Slash commands](/zh/tools/slash-commands)。

  </Accordion>

  <Accordion title="子代理已完成，但完成更新发到了错误的位置或从未发布。我应该检查什么？">
    首先检查已解析的请求者路由：

    - 完成模式子代理传递优先使用任何绑定的线程或会话路由（如果存在）。
    - 如果完成源仅携带渠道，OpenClaw 将回退到请求者会话的存储路由（`lastChannel` / `lastTo` / `lastAccountId`），以便直接传递仍能成功。
    - 如果既不存在绑定路由也不存在可用的存储路由，直接传递可能会失败，结果将回退到排队的会话传递，而不是立即发布到聊天。
    - 无效或过时的目标仍可能强制回退到队列或导致最终传递失败。
    - 如果子级最后可见的助手回复确是无声令牌 `NO_REPLY` / `no_reply`，或者确是 `ANNOUNCE_SKIP`，OpenClaw 会故意抑制公告，而不是发布过时的早期进度。
    - 如果子级仅在进行工具调用后超时，公告可能会将其折叠为简短的部分进度摘要，而不是重播原始工具输出。

    调试：

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[子代理](/zh/tools/subagents)、[后台任务](/zh/automation/tasks)、[会话工具](/zh/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒未触发。我应该检查什么？">
    Cron 在 Gateway(网关) 进程内运行。如果 Gateway(网关) 未持续运行，
    计划作业将不会运行。

    检查清单：

    - 确认已启用 cron（`cron.enabled`）且未设置 `OPENCLAW_SKIP_CRON`。
    - 检查 Gateway(网关) 是否 24/7 运行（无休眠/重启）。
    - 验证作业的时区设置（`--tz` 与主机时区对比）。

    调试：

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文档：[Cron 作业](/zh/automation/cron-jobs)、[自动化与任务](/zh/automation)。

  </Accordion>

  <Accordion title="Cron 已触发，但未向渠道发送任何内容。为什么？">
    首先检查投放模式：

    - `--no-deliver` / `delivery.mode: "none"` 表示不预期有 runner 回退发送。
    - 缺失或无效的公告目标 (`channel` / `to`) 表示 runner 跳过了出站投放。
    - 渠道认证失败 (`unauthorized`, `Forbidden`) 表示 runner 尝试投放但被凭据阻止。
    - 静默的隔离结果 (仅 `NO_REPLY` / `no_reply`) 被视为故意不可投递，因此 runner 也会抑制排队的回退投放。

    对于隔离的 cron 作业，当聊天路由可用时，代理仍然可以使用 `message`
    工具直接发送。`--announce` 仅控制代理尚未发送的最终文本的 runner
    回退路径。

    调试：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[Cron jobs](/zh/automation/cron-jobs), [Background Tasks](/zh/automation/tasks).

  </Accordion>

  <Accordion title="为什么隔离的 cron 运行会切换模型或重试一次？">
    这通常是实时模型切换路径，而不是重复调度。

    隔离的 cron 可以在活动运行抛出 `LiveSessionModelSwitchError` 时持久化运行时模型切换并重试。重试会保持切换后的
    提供商/模型，并且如果切换带有新的身份验证配置文件覆盖，cron
    也会在重试之前将其持久化。

    相关选择规则：

    - Gmail hook 模型覆盖在适用时优先。
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

    文档：[Cron jobs](/zh/automation/cron-jobs), [cron CLI](/zh/cli/cron).

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
    openclaw skills update --all
    openclaw skills list --eligible
    openclaw skills check
    ```

    原生 `openclaw skills install` 会写入到活动工作区 `skills/`
    目录中。仅当您想要发布或同步您自己的 Skills 时，才需安装单独的 `clawhub` CLI。若要在代理之间共享安装，请将 Skill 放在
    `~/.openclaw/skills` 下，并使用 `agents.defaults.skills` 或
    `agents.list[].skills` 如果您想要限制哪些代理可以看到它。

  </Accordion>

  <Accordion title="OpenClaw 可以按计划运行任务或在后台连续运行吗？">
    是的。使用 Gateway(网关) 调度器：

    - **Cron jobs** 用于计划或周期性任务（重启后依然存在）。
    - **Heartbeat** 用于“主会话”的定期检查。
    - **Isolated jobs** 用于自主代理，它们可以发布摘要或投递到聊天中。

    文档：[Cron jobs](/zh/automation/cron-jobs)、[Automation & Tasks](/zh/automation)、
    [Heartbeat](/zh/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以在 Linux 上运行仅限 Apple macOS 的技能吗？">
    不能直接运行。macOS 技能受 `metadata.openclaw.os` 及所需二进制文件的限制，并且只有当它们在 **Gateway(网关) 主机** 上符合条件时，才会出现在系统提示中。在 Linux 上，除非你覆盖这些限制，否则 `darwin` 专用的技能（如 `apple-notes`、`apple-reminders`、`things-mac`）将无法加载。

    你有三种支持的模式：

    **选项 A - 在 Mac 上运行 Gateway（最简单）。**
    在存在 macOS 二进制文件的地方运行 Gateway(网关)，然后从 Linux 通过 [remote mode](#gateway-ports-already-running-and-remote-mode) 或 Tailscale 进行连接。由于 Gateway(网关) 主机是 macOS，技能会正常加载。

    **选项 B - 使用 macOS 节点（无 SSH）。**
    在 Linux 上运行 Gateway(网关)，配对一个 macOS 节点（菜单栏应用），并在 Mac 上将 **Node Run Commands** 设置为 "Always Ask" 或 "Always Allow"。当节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为符合条件。代理通过 `nodes` 工具运行这些技能。如果你选择 "Always Ask"，在提示中批准 "Always Allow" 会将该命令添加到允许列表中。

    **选项 C - 通过 SSH 代理 macOS 二进制文件（高级）。**
    将 Gateway(网关) 保留在 Linux 上，但使所需的 CLI 二进制文件解析为在 Mac 上运行的 SSH 包装器。然后覆盖技能以允许 Linux，使其保持符合条件。

    1. 为二进制文件创建一个 SSH 包装器（例如：用于 Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 将包装器放在 Linux 主机的 `PATH` 上（例如 `~/bin/memo`）。
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

  <Accordion title="您是否有 Notion 或 HeyGen 集成？">
    目前尚未内置。

    选项：

    - **自定义 skill / 插件：** 最适合可靠的 API 访问（Notion/HeyGen 均有 API）。
    - **浏览器自动化：** 无需代码即可工作，但速度较慢且脆弱性更高。

    如果您希望按客户端保留上下文（代理机构工作流），一个简单的模式是：

    - 每个客户端一个 Notion 页面（上下文 + 偏好设置 + 活跃工作）。
    - 在会话开始时要求代理获取该页面。

    如果您需要原生集成，请提交功能请求或构建一个针对这些 API 的 skill。

    安装 skills：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安装位于活动工作区 `skills/` 目录中。对于跨代理共享的 skills，请将其放置在 `~/.openclaw/skills/<name>/SKILL.md` 中。如果只有部分代理应该看到共享安装，请配置 `agents.defaults.skills` 或 `agents.list[].skills`。某些 skills 需要通过 Homebrew 安装二进制文件；在 Linux 上，这意味着 Linuxbrew（请参阅上面的 Homebrew Linux 常见问题条目）。请参阅 [Skills](/zh/tools/skills)、[Skills 配置](/zh/tools/skills-config) 和 [ClawHub](/zh/tools/clawhub)。

  </Accordion>

  <Accordion title="如何将现有的已登录 Chrome 与 OpenClaw 结合使用？">
    使用内置的 `user` 浏览器配置文件，它通过 Chrome DevTools MCP 连接：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果您想要自定义名称，请创建一个显式的 MCP 配置文件：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    此路径可以使用本地主机浏览器或连接的浏览器节点。如果 Gateway 在其他地方运行，请在浏览器计算机上运行节点主机，或者改用远程 CDP。

    对 `existing-session` / `user` 的当前限制：

    - 操作是 ref 驱动的，而不是 CSS 选择器驱动的
    - 上传需要 `ref` / `inputRef` 并且目前一次支持一个文件
    - `responsebody`、PDF 导出、下载拦截和批量操作仍然需要托管浏览器或原始 CDP 配置文件

  </Accordion>
</AccordionGroup>

## 沙箱隔离和内存

<AccordionGroup>
  <Accordion title="是否有专门的沙箱隔离文档？">
    是的。请参阅 [沙箱隔离](/zh/gateway/sandboxing)。有关 Docker 特定的设置（Docker 中的完整 Gateway 或沙箱镜像），请参阅 [Docker](/zh/install/docker)。
  </Accordion>

  <Accordion title="Docker 感觉受限 - 如何启用完整功能？">
    默认镜像以安全为首要考虑，并以 `node` 用户身份运行，因此它不包含系统包、Homebrew 或捆绑的浏览器。如需更完整的设置：

    - 使用 `OPENCLAW_HOME_VOLUME` 持久化 `/home/node`，以便缓存得以保留。
    - 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 将系统依赖项烘焙到镜像中。
    - 通过捆绑的 CLI 安装 Playwright 浏览器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 设置 `PLAYWRIGHT_BROWSERS_PATH` 并确保该路径已持久化。

    文档：[Docker](/zh/install/docker)，[Browser](/zh/tools/browser)。

  </Accordion>

  <Accordion title="我可以保持私信私密，同时让群组公开/使用一个代理进行沙箱隔离吗？">
    可以 - 如果您的私有流量是 **私信**，而公共流量是 **群组**。

    使用 `agents.defaults.sandbox.mode: "non-main"`，以便群组/渠道会话（非主密钥）在配置的沙箱后端中运行，而主私信会话保留在主机上。如果不选择后端，Docker 是默认后端。然后通过 `tools.sandbox.tools` 限制沙箱会话中可用的工具。

    设置演练 + 示例配置：[Groups: personal 私信 + public groups](/zh/channels/groups#pattern-personal-dms-public-groups-single-agent)

    关键配置参考：[Gateway(网关) configuration](/zh/gateway/config-agents#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="如何将主机文件夹挂载到沙箱中？">
    将 `agents.defaults.sandbox.docker.binds` 设置为 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全局 + 每个代理的挂载会合并；当 `scope: "shared"` 时，每个代理的挂载会被忽略。对于任何敏感内容请使用 `:ro`，并记住挂载会绕过沙箱文件系统隔离。

    OpenClaw 会对照规范化路径和通过最深现有祖先解析的规范路径来验证挂载源。这意味着即使最后一个路径段尚不存在，通过父级符号链接的逃脱尝试仍将失败（关闭），并且在解析符号链接后仍会应用允许根目录的检查。

    有关示例和安全说明，请参阅[沙箱隔离](/zh/gateway/sandboxing#custom-bind-mounts)和[沙箱与工具策略与提权](/zh/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。

  </Accordion>

  <Accordion title="内存是如何工作的？">
    OpenClaw 的内存只是代理工作区中的 Markdown 文件：

    - `memory/YYYY-MM-DD.md` 中的每日笔记
    - `MEMORY.md` 中的精选长期笔记（仅限主/私有会话）

    OpenClaw 还会运行**静默预压缩内存刷新**，以提醒模型
    在自动压缩之前写入持久化笔记。这仅在工作区可写时运行
    （只读沙箱会跳过此步骤）。请参阅[内存](/zh/concepts/memory)。

  </Accordion>

  <Accordion title="内存总是记不住事情。如何让它记住？">
    请要求机器人**将事实写入内存**。长期笔记应放入 `MEMORY.md`，
    短期上下文则放入 `memory/YYYY-MM-DD.md`。

    这仍是我们正在改进的领域。提醒模型存储记忆会有所帮助；
    它会知道该怎么做。如果它一直忘记，请验证 Gateway(网关) 在每次运行时是否使用相同的
    工作区。

    文档：[内存](/zh/concepts/memory)、[代理工作区](/zh/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="记忆会永久保存吗？有哪些限制？">
    记忆文件存储在磁盘上，并会一直保存直到您删除它们。限制在于您的
    存储空间，而不是模型。**会话上下文** 仍然受到模型
    上下文窗口的限制，因此长对话可能会压缩或截断。这就是
    存在记忆搜索的原因——它仅将相关部分拉回上下文中。

    文档：[记忆](/zh/concepts/memory)、[上下文](/zh/concepts/context)。

  </Accordion>

  <Accordion title="语义记忆搜索是否需要 OpenAI API 密钥？">
    仅当您使用 **OpenAI 嵌入**时才需要。Codex OAuth 覆盖聊天/补全，
    并**不**授予嵌入访问权限，因此**登录 Codex（OAuth 或
    Codex CLI 登录）**对语义记忆搜索没有帮助。OpenAI 嵌入
    仍然需要真实的 API 密钥（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果您没有显式设置提供商，当 OpenClaw
    可以解析 API 密钥（身份验证配置文件、`models.providers.*.apiKey` 或环境变量）时，它会自动选择提供商。
    如果解析到 OpenAI 密钥，它首选 OpenAI，否则如果解析到 Gemini 密钥则首选 Gemini，然后是 Voyage，接着是 Mistral。如果没有可用的远程密钥，记忆
    搜索将保持禁用状态，直到您对其进行配置。如果您配置了本地模型路径
    并且该路径存在，OpenClaw
    首选 `local`。当您显式设置
    `memorySearch.provider = "ollama"` 时，支持 Ollama。

    如果您宁愿保持本地化，请设置 `memorySearch.provider = "local"`（并可选
    `memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，请设置
    `memorySearch.provider = "gemini"` 并提供 `GEMINI_API_KEY`（或
    `memorySearch.remote.apiKey`）。我们支持 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本地**嵌入
    模型——有关设置详细信息，请参阅[记忆](/zh/concepts/memory)。

  </Accordion>
</AccordionGroup>

## 文件在磁盘上的位置

<AccordionGroup>
  <Accordion title="与 OpenClaw 一起使用的所有数据都会在本地保存吗？">
    不 - **OpenClaw 的状态是本地的**，但 **外部服务仍然能看到你发送给它们的内容**。

    - **默认本地化：** 会话、内存文件、配置和工作区位于 Gateway(网关) 主机上
      (`~/.openclaw` + 你的工作区目录)。
    - **必要的远程化：** 你发送给模型提供商（Anthropic/OpenAI/等）的消息会发送到
      它们的 API，而聊天平台（WhatsApp/Telegram/Slack/等）会在它们的
      服务器上存储消息数据。
    - **你控制数据足迹：** 使用本地模型可以将提示保留在你的机器上，但渠道
      流量仍然会经过渠道的服务器。

    相关：[Agent workspace](/zh/concepts/agent-workspace)，[Memory](/zh/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 将其数据存储在哪里？">
    所有内容都位于 `$OPENCLAW_STATE_DIR` 下（默认为：`~/.openclaw`）：

    | 路径 | 用途 |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json` | 主配置 (JSON5) |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json` | 旧版 OAuth 导入（首次使用时复制到 auth profiles 中） |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 身份配置 (OAuth, API 密钥，以及可选的 `keyRef`/`tokenRef`) |
    | `$OPENCLAW_STATE_DIR/secrets.json` | 用于 `file` SecretRef 提供商的可选文件支持的秘密负载 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json` | 旧版兼容性文件（静态 `api_key` 条目已清理） |
    | `$OPENCLAW_STATE_DIR/credentials/` | 提供商状态（例如 `whatsapp/<accountId>/creds.json`） |
    | `$OPENCLAW_STATE_DIR/agents/` | 每个代理的状态 (agentDir + sessions) |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/` | 对话历史记录与状态（每个代理） |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json` | 会话元数据（每个代理） |

    旧版单代理路径：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）。

    您的 **工作区** (AGENTS.md, memory 文件, skills 等) 是独立的，并通过 `agents.defaults.workspace` 进行配置（默认为：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该放在哪里？">
    这些文件位于 **agent workspace（代理工作区）** 中，而不是 `~/.openclaw` 中。

    - **Workspace (per agent) (工作区，每个代理)**：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md`、`memory/YYYY-MM-DD.md`，以及可选的 `HEARTBEAT.md`。
      小写的根 `memory.md` 仅用于遗留修复输入；当这两个文件都存在时，`openclaw doctor --fix`
      可以将其合并到 `MEMORY.md` 中。
    - **State dir (`~/.openclaw`)**：配置、渠道/提供商状态、认证配置文件、会话、日志，
      以及共享技能 (`~/.openclaw/skills`)。

    默认工作区是 `~/.openclaw/workspace`，可通过以下方式配置：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果机器人在重启后“忘记”了内容，请确认 Gateway(网关) 在每次启动时使用的是
    相同的工作区（请记住：远程模式使用的是 **gateway host's（网关主机）**
    的工作区，而不是您的本地笔记本电脑）。

    提示：如果您想要持久的行为或偏好，请让机器人将其 **写入
    AGENTS.md 或 MEMORY.md**，而不是依赖聊天记录。

    请参阅 [Agent workspace](/zh/concepts/agent-workspace) 和 [Memory](/zh/concepts/memory)。

  </Accordion>

  <Accordion title="推荐的备份策略">
    将您的 **agent workspace（代理工作区）** 放入一个 **私有** git 仓库中，并将其备份到某个
    私密的地方（例如 GitHub 私有仓库）。这将捕获记忆 + AGENTS/SOUL/USER
    文件，并允许您稍后恢复助手的“思维”。

    **切勿** 提交 `~/.openclaw` 下的任何内容（凭据、会话、令牌或加密的秘密载荷）。
    如果您需要完全恢复，请分别备份工作区和状态目录
    （请参阅上面的迁移问题）。

    文档：[Agent workspace](/zh/concepts/agent-workspace)。

  </Accordion>

<Accordion title="如何完全卸载 OpenClaw？">请参阅专用指南：[Uninstall](/zh/install/uninstall)。</Accordion>

  <Accordion title="代理可以在工作区之外工作吗？">
    是的。工作区是**默认的 cwd** 和内存锚点，而不是严格的沙箱。
    相对路径在工作区内解析，但绝对路径可以访问其他
    主机位置，除非启用了沙箱隔离。如果您需要隔离，请使用
    [`agents.defaults.sandbox`](/zh/gateway/sandboxing) 或每个代理的沙箱设置。如果您
    希望将仓库作为默认工作目录，请将该代理的
    `workspace` 指向仓库根目录。OpenClaw 仓库只是源代码；请保持
    工作区分离，除非您有意让代理在其中工作。

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

  <Accordion title="远程模式：会话存储在哪里？">
    会话状态由**网关主机**拥有。如果您处于远程模式，您关心的会话存储位于远程机器上，而不是您的本地笔记本电脑。请参阅[会话管理](/zh/concepts/session)。
  </Accordion>
</AccordionGroup>

## 配置基础

<AccordionGroup>
  <Accordion title="配置是什么格式？它在哪里？">
    OpenClaw 从 `$OPENCLAW_CONFIG_PATH` 读取可选的 **JSON5** 配置（默认：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果文件丢失，它使用相对安全的默认值（包括 `~/.openclaw/workspace` 的默认工作区）。

  </Accordion>

  <Accordion title='我设置了 gateway.bind: "lan"（或 "tailnet"），但现在没有监听任何端口 / UI 显示未授权'>
    非环回绑定 **需要有效的网关认证路径**。实际上这意味着：

    - 共享密钥认证：令牌或密码
    - 正确配置的非环回身份感知反向代理后面的 `gateway.auth.mode: "trusted-proxy"`

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

    注意事项：

    - `gateway.remote.token` / `.password` **不会**自行启用本地网关认证。
    - 仅当未设置 `gateway.auth.*` 时，本地调用路径才可以使用 `gateway.remote.*` 作为回退。
    - 对于密码认证，请改为设置 `gateway.auth.mode: "password"` 加上 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果通过 SecretRef 显式配置了 `gateway.auth.token` / `gateway.auth.password` 且未解析，解析将失败（不进行远程回退掩盖）。
    - 共享密钥控制 UI 设置通过 `connect.params.auth.token` 或 `connect.params.auth.password`（存储在 app/UI 设置中）进行身份验证。诸如 Tailscale Serve 或 `trusted-proxy` 之类的承载身份模式则改用请求头。避免将共享密钥放在 URL 中。
    - 使用 `gateway.auth.mode: "trusted-proxy"` 时，同主机环回反向代理仍然 **不** 满足受信任代理认证。受信任代理必须是配置的非环回源。

  </Accordion>

  <Accordion title="为什么我现在在 localhost 上也需要 token？">
    OpenClaw 默认强制执行网关身份验证，包括回环地址。在正常的默认路径中，这意味着 token 认证：如果没有配置显式的认证路径，网关启动将解析为 token 模式并自动生成一个，将其保存到 `gateway.auth.token`，因此**本地 WS 客户端必须进行身份验证**。这会阻止其他本地进程调用 Gateway(网关)。

    如果你倾向于不同的认证路径，可以显式选择密码模式（或者，对于非回环的具有身份识别能力的反向代理，`trusted-proxy`）。如果你**真的**想要开放回环地址，请在配置中显式设置 `gateway.auth.mode: "none"`。Doctor 可以随时为你生成一个 token：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="更改配置后必须重启吗？">
    Gateway(网关) 会监视配置文件并支持热重载：

    - `gateway.reload.mode: "hybrid"` （默认）：热应用安全更改，针对关键更改则重启
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

    - `off`：隐藏标语文本，但保留横幅标题/版本行。
    - `default`：每次都使用 `All your chats, one OpenClaw.`。
    - `random`：轮换有趣的/季节性标语（默认行为）。
    - 如果你根本不想要横幅，请设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何启用网络搜索（和网络抓取）？">
    `web_fetch` 无需 API 密钥即可工作。`web_search` 取决于您选择的
    提供商:

    - 使用 API 支持的提供商，例如 Brave、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Perplexity 和 Tavily，需要其正常的 API 密钥设置。
    - Ollama Web Search 无需密钥，但它使用您配置的 Ollama 主机并且需要 `ollama signin`。
    - DuckDuckGo 无需密钥，但它是一个非官方的基于 HTML 的集成。
    - SearXNG 无密钥/自托管；请配置 `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`。

    **推荐：** 运行 `openclaw configure --section web` 并选择一个提供商。
    环境变量替代方案：

    - Brave: `BRAVE_API_KEY`
    - Exa: `EXA_API_KEY`
    - Firecrawl: `FIRECRAWL_API_KEY`
    - Gemini: `GEMINI_API_KEY`
    - Grok: `XAI_API_KEY`
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
    旧的 `tools.web.search.*` 提供商路径为了兼容性暂时仍然会加载，但不应在新的配置中使用它们。
    Firecrawl 网络抓取后备配置位于 `plugins.entries.firecrawl.config.webFetch.*` 下。

    注意：

    - 如果您使用允许列表，请添加 `web_search`/`web_fetch`/`x_search` 或 `group:web`。
    - `web_fetch` 默认处于启用状态（除非被明确禁用）。
    - 如果省略了 `tools.web.fetch.provider`，OpenClaw 会根据可用的凭据自动检测第一个准备就绪的抓取后备提供商。目前内置的提供商是 Firecrawl。
    - 守护进程从 `~/.openclaw/.env`（或服务环境）读取环境变量。

    文档: [Web tools](/zh/tools/web)。

  </Accordion>

  <Accordion title="config.apply 清空了我的配置。我该如何恢复并避免这种情况？">
    `config.apply` 会替换**整个配置**。如果你发送一个部分对象，其他所有内容
    都会被移除。

    当前的 OpenClaw 可以防止许多意外的覆盖操作：

    - OpenClaw 拥有的配置写入会在写入前验证完整的变更后配置。
    - 无效或破坏性的 OpenClaw 拥有的写入将被拒绝，并保存为 `openclaw.json.rejected.*`。
    - 如果直接编辑导致启动或热重载失败，Gateway(网关) 将恢复最后已知的良好配置，并将被拒绝的文件保存为 `openclaw.json.clobbered.*`。
    - 主代理在恢复后会收到启动警告，因此不会盲目地再次写入错误的配置。

    恢复方法：

    - 检查 `openclaw logs --follow` 中是否存在 `Config auto-restored from last-known-good`、`Config write rejected:` 或 `config reload restored last-known-good config`。
    - 检查活动配置旁边的最新 `openclaw.json.clobbered.*` 或 `openclaw.json.rejected.*`。
    - 如果恢复的活动配置正常工作，则保留它，然后使用 `openclaw config set` 或 `config.patch` 仅复制回预期的键。
    - 运行 `openclaw config validate` 和 `openclaw doctor`。
    - 如果你没有最后已知的良好配置或被拒绝的有效负载，请从备份还原，或重新运行 `openclaw doctor` 并重新配置通道/模型。
    - 如果这是意外发生的，请提交错误报告，并附上你最后已知的配置或任何备份。
    - 本地编码代理通常可以从日志或历史记录中重建一个可用的配置。

    避免方法：

    - 使用 `openclaw config set` 进行小改动。
    - 使用 `openclaw configure` 进行交互式编辑。
    - 当你不确定确切的路径或字段形状时，请先使用 `config.schema.lookup`；它返回一个浅层模式节点以及用于向下钻取的直接子项摘要。
    - 使用 `config.patch` 进行部分 RPC 编辑；仅将 `config.apply` 用于全配置替换。
    - 如果你正在从代理运行中仅限所有者使用的 `gateway` 工具，它仍将拒绝写入 `tools.exec.ask` / `tools.exec.security`（包括规范化为相同受保护执行路径的传统 `tools.bash.*` 别名）。

    文档：[Config](/zh/cli/config)、[Configure](/zh/cli/configure)、[Gateway(网关) 故障排除](/zh/gateway/troubleshooting#gateway-restored-last-known-good-config)、[Doctor](/zh/gateway/doctor)。

  </Accordion>

  <Accordion title="如何在跨设备的情况下运行一个中央Gateway(网关)并配备专门的workers？">
    常见的模式是**一个Gateway(网关)**（例如 Raspberry Pi）加上**nodes**（节点）和**agents**（代理）：

    - **Gateway(网关) (central):** 拥有频道（Signal/WhatsApp）、路由和会话。
    - **Nodes (devices):** Mac/iOS/Android 作为外设连接并暴露本地工具（`system.run`, `canvas`, `camera`）。
    - **Agents (workers):** 用于特定角色的独立大脑/工作空间（例如 "Hetzner ops"，"Personal data"）。
    - **Sub-agents:** 当您需要并行处理时，从主代理生成后台工作。
    - **TUI:** 连接到 Gateway(网关) 并切换代理/会话。

    文档：[Nodes](/zh/nodes)，[Remote access](/zh/gateway/remote)，[Multi-Agent Routing](/zh/concepts/multi-agent)，[Sub-agents](/zh/tools/subagents)，[TUI](/zh/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 浏览器可以无头模式运行吗？">
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

    默认是 `false` (headful)。无头模式更有可能在某些网站上触发反机器人检查。请参阅 [Browser](/zh/tools/browser)。

    无头模式使用**相同的 Chromium 引擎**，适用于大多数自动化任务（表单、点击、抓取、登录）。主要区别在于：

    - 没有可见的浏览器窗口（如果您需要视觉效果，请使用屏幕截图）。
    - 某些网站对无头模式下的自动化更为严格（CAPTCHAs，反机器人）。
      例如，X/Twitter 经常阻止无头会话。

  </Accordion>

  <Accordion title="如何使用 Brave 进行浏览器控制？">
    将 `browser.executablePath` 设置为您的 Brave 二进制文件（或任何基于 Chromium 的浏览器）并重启 Gateway(网关)。
    请参阅 [Browser](/zh/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置示例。
  </Accordion>
</AccordionGroup>

## 远程网关和节点

<AccordionGroup>
  <Accordion title="命令如何在 Telegram、网关和节点之间传播？">
    Telegram 消息由 **网关** 处理。网关运行代理，并且仅
    在需要节点工具时通过 **Gateway(网关) WebSocket** 调用节点：

    Telegram → Gateway(网关) → Agent → `node.*` → Node → Gateway(网关) → Telegram

    节点看不到入站的提供商流量；它们只接收节点 RPC 调用。

  </Accordion>

  <Accordion title="如果 Gateway(网关) 托管在远程，我的代理如何访问我的计算机？">
    简短回答：**将您的计算机作为节点进行配对**。Gateway(网关) 在其他地方运行，但它可以
    通过 Gateway(网关) WebSocket 调用您本地计算机上的 `node.*` 工具（屏幕、摄像头、系统）。

    典型设置：

    1. 在常在线主机（VPS/家庭服务器）上运行 Gateway(网关)。
    2. 将 Gateway(网关) 主机和您的计算机置于同一个 tailnet 中。
    3. 确保 Gateway(网关) WS 可访问（tailnet 绑定或 SSH 隧道）。
    4. 在本地打开 macOS 应用并以 **Remote over SSH** 模式（或直接 tailnet）连接，
       以便它可以注册为节点。
    5. 在 Gateway(网关) 上批准该节点：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要单独的 TCP 网桥；节点通过 Gateway(网关) WebSocket 连接。

    安全提醒：配对 macOS 节点允许在该机器上进行 `system.run`。仅
    配对您信任的设备，并查看 [Security](/zh/gateway/security)。

    文档：[Nodes](/zh/nodes)、[Gateway(网关) 协议](/zh/gateway/protocol)、[macOS 远程模式](/zh/platforms/mac/remote)、[Security](/zh/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已连接但我收不到回复。怎么办？">
    检查基础信息：

    - Gateway(网关) 正在运行：`openclaw gateway status`
    - Gateway(网关) 健康状况：`openclaw status`
    - 渠道 健康状况：`openclaw channels status`

    然后验证认证和路由：

    - 如果你使用 Tailscale Serve，请确保 `gateway.auth.allowTailscale` 设置正确。
    - 如果你通过 SSH 隧道连接，请确认本地隧道已开启并指向正确的端口。
    - 确认你的允许列表（私信 或群组）包含你的账户。

    文档：[Tailscale](/zh/gateway/tailscale)，[远程访问](/zh/gateway/remote)，[渠道](/zh/channels)。

  </Accordion>

  <Accordion title="两个 OpenClaw 实例可以互相通信吗（本地 + VPS）？">
    可以。没有内置的“机器人对机器人”桥接，但你可以通过几种
    可靠的方式将其连接起来：

    **最简单的方式：** 使用两个机器人都能访问的正常聊天渠道（Telegram/Slack/WhatsApp）。
    让机器人 A 向机器人 B 发送消息，然后让机器人 B 像往常一样回复。

    **CLI 桥接（通用）：** 运行一个脚本，使用
    `openclaw agent --message ... --deliver` 调用另一个 Gateway(网关)，
    目标为另一个机器人监听的聊天。如果一个机器人在远程 VPS 上，请通过 SSH/Tailscale 将你的 CLI 指向该远程 Gateway(网关)
    （参见 [远程访问](/zh/gateway/remote)）。

    示例模式（从可以访问目标 Gateway(网关) 的机器运行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：添加一个护栏，防止两个机器人无限循环（仅提及、渠道
    允许列表，或“不回复机器人消息”规则）。

    文档：[远程访问](/zh/gateway/remote)，[Agent CLI](/zh/cli/agent)，[Agent send](/zh/tools/agent-send)。

  </Accordion>

  <Accordion title="多个 Agent 是否需要单独的 VPS？">
    不需要。一个 Gateway(网关) 可以托管多个 Agent，每个 Agent 拥有自己的工作区、模型默认设置
    和路由。这是常规的设置方式，比为每个 Agent 运行一个 VPS 更便宜、更简单。

    仅当您需要硬隔离（安全边界）或非常不想共享的不同配置时，才使用单独的 VPS。否则，请保留一个 Gateway(网关) 并
    使用多个 Agent 或子 Agent。

  </Accordion>

  <Accordion title="与从 VPS 使用 SSH 相比，在我的个人笔记本电脑上使用 node 有什么好处？">
    有的 - node 是从远程 Gateway(网关) 访问您的笔记本电脑的首选方式，并且它们
    提供的不仅仅是 shell 访问权限。Gateway(网关) 运行在 macOS/Linux 上（Windows 通过 WSL2），并且是轻量级的（一个小型 VPS 或 Raspberry Pi 级别的设备即可；4 GB RAM 就足够了），因此一个常见的
    设置是一个始终开启的主机加上您的笔记本电脑作为 node。

    - **不需要入站 SSH。** Node 连接到 Gateway(网关) 的 WebSocket 并使用设备配对。
    - **更安全的执行控制。** 在该笔记本电脑上，`system.run` 受 node 允许列表/批准的限制。
    - **更多设备工具。** 除了 `system.run` 之外，Node 还暴露 `canvas`、`camera` 和 `screen`。
    - **本地浏览器自动化。** 将 Gateway(网关) 保留在 VPS 上，但通过笔记本电脑上的 node 主机在本地运行 Chrome，或者通过 Chrome MCP 连接到主机上的本地 Chrome。

    SSH 适用于临时 shell 访问，但对于持续的 Agent 工作流和
    设备自动化，node 更简单。

    文档：[Nodes](/zh/nodes), [Nodes CLI](/zh/cli/nodes), [Browser](/zh/tools/browser)。

  </Accordion>

  <Accordion title="节点是否运行网关服务？">
    不会。除非您有意运行隔离的配置文件（请参阅 [多个网关](/zh/gateway/multiple-gateways)），否则每个主机应只运行 **一个网关**。节点是连接
    到网关的外设（iOS/Android 节点，或菜单栏应用程序中的 macOS “节点模式”）。对于无头节点
    主机和 CLI 控制，请参阅 [节点主机 CLI](/zh/cli/node)。

    对 `gateway`、`discovery` 和 `canvasHost` 的更改需要完全重启。

  </Accordion>

  <Accordion title="是否有 API / RPC 方式来应用配置？">
    有的。

    - `config.schema.lookup`：在写入前检查一个配置子树及其浅层模式节点、匹配的 UI 提示和直接子项摘要
    - `config.get`：获取当前快照和哈希值
    - `config.patch`：安全的部分更新（大多数 RPC 编辑的首选方式）；尽可能热重载，必要时重启
    - `config.apply`：验证并替换完整配置；尽可能热重载，必要时重启
    - 仅所有者可用的 `gateway` 运行时工具仍拒绝重写 `tools.exec.ask` / `tools.exec.security`；传统的 `tools.bash.*` 别名会规范化为相同的受保护执行路径

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

  <Accordion title="如何在 VPS 上设置 Tailscale 并从 Mac 连接？">
    最简步骤：

    1. **在 VPS 上安装 + 登录**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在 Mac 上安装 + 登录**
       - 使用 Tailscale 应用并登录到同一个 tailnet。
    3. **启用 MagicDNS（推荐）**
       - 在 Tailscale 管理控制台中，启用 MagicDNS，以便 VPS 拥有一个稳定的名称。
    4. **使用 tailnet 主机名**
       - SSH: `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway(网关) WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果您想要不使用 SSH 的控制 UI，请在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    这会将网关绑定到环回地址，并通过 Tailscale 暴露 HTTPS。请参阅 [Tailscale](/zh/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何将 Mac 节点连接到远程 Gateway(网关) (Tailscale Serve)？">
    Serve 暴露了 **Gateway(网关) 控制界面 + WS**。节点通过同一个 Gateway(网关) WS 端点进行连接。

    推荐设置：

    1. **确保 VPS 和 Mac 位于同一个 tailnet 上**。
    2. **在远程模式下使用 macOS 应用**（SSH 目标可以是 tailnet 主机名）。
       该应用将隧道传输 Gateway(网关) 端口并作为节点连接。
    3. **在网关上批准节点**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文档：[Gateway(网关) 协议](/zh/gateway/protocol)、[设备发现](/zh/gateway/discovery)、[macOS 远程模式](/zh/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我是应该在第二台笔记本电脑上安装，还是只添加一个节点？">
    如果您只需要第二台笔记本电脑上的 **本地工具**（屏幕/摄像头/执行），请将其作为
    **节点** 添加。这样可以保持单一的 Gateway(网关) 并避免重复的配置。本地节点工具目前仅支持 macOS，但我们计划将其扩展到其他操作系统。

    仅当您需要 **硬隔离** 或两个完全独立的机器人时，才安装第二个 Gateway(网关)。

    文档：[节点](/zh/nodes)、[节点 CLI](/zh/cli/nodes)、[多个网关](/zh/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 环境变量和 .env 加载

<AccordionGroup>
  <Accordion title="OpenClaw 如何加载环境变量？">
    OpenClaw 从父进程（shell、launchd/systemd、CI 等）读取环境变量，并额外加载：

    - 当前工作目录下的 `.env`
    - `~/.openclaw/.env`（即 `$OPENCLAW_STATE_DIR/.env`）中的全局回退 `.env`

    两个 `.env` 文件都不会覆盖现有的环境变量。

    您还可以在配置中定义内联环境变量（仅当进程环境中缺失时才应用）：

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    参见 [/environment](/zh/help/environment) 了解完整的优先级和来源。

  </Accordion>

  <Accordion title="我通过服务启动了 Gateway，环境变量消失了。现在怎么办？">
    两个常见的修复方法：

    1. 将缺失的键名放入 `~/.openclaw/.env`，这样即使服务未继承您的 shell 环境，也能被拾取。
    2. 启用 shell 导入（可选的便利功能）：

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

    这将运行您的登录 shell 并仅导入缺失的预期键名（从不覆盖）。等效的环境变量：
    `OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我设置了 COPILOT_GITHUB_TOKEN，但模型状态显示“Shell env: off.”。为什么？'>
    `openclaw models status` 报告是否启用了 **shell env import**。“Shell env: off”
    并**不**意味着缺少您的环境变量——这只是意味着 OpenClaw 不会
    自动加载您的登录 shell。

    如果 Gateway(网关) 作为服务（launchd/systemd）运行，它将不会继承您的 shell
    环境。通过执行以下操作之一来修复：

    1. 将令牌放入 `~/.openclaw/.env` 中：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或启用 shell 导入（`env.shellEnv.enabled: true`）。
    3. 或将其添加到您的配置 `env` 块中（仅在缺失时适用）。

    然后重启网关并重新检查：

    ```bash
    openclaw models status
    ```

    Copilot 令牌是从 `COPILOT_GITHUB_TOKEN` 读取的（也包括 `GH_TOKEN` / `GITHUB_TOKEN`）。
    请参阅 [/concepts/模型-providers](/zh/concepts/model-providers) 和 [/environment](/zh/help/environment)。

  </Accordion>
</AccordionGroup>

## 会话和多个聊天

<AccordionGroup>
  <Accordion title="如何开始一个新的对话？">
    发送 `/new` 或 `/reset` 作为一个独立消息。请参阅 [会话管理](/zh/concepts/session)。
  </Accordion>

  <Accordion title="如果我不发送 /new，会话会自动重置吗？">
    会话可以在 `session.idleMinutes` 后过期，但这在默认情况下是 **禁用的**（默认为 **0**）。
    将其设置为正值以启用空闲过期。启用后，空闲期后的 **下一条**
    消息将为该聊天密钥启动一个新的会话 ID。
    这不会删除记录——它只是开始一个新的会话。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有没有办法组建一个 OpenClaw 实例团队（一个 CEO 和许多代理）？">
    是的，通过 **多代理路由** 和 **子代理**。您可以创建一个协调器
    代理和多个具有各自工作空间和模型的工作代理。

    不过，这最好被视为一个 **有趣的实验**。这会消耗大量 token，而且通常
    比使用一个具有独立会话的机器人效率低。我们构想的典型模型
    是您与一个机器人对话，使用不同的会话进行并行工作。该
    机器人也可以在需要时生成子代理。

    文档：[多代理路由](/zh/concepts/multi-agent)，[子代理](/zh/tools/subagents)，[代理 CLI](/zh/cli/agents)。

  </Accordion>

  <Accordion title="为什么上下文会在任务中途被截断？我该如何防止这种情况？">
    会话上下文受限于模型的上下文窗口。长对话、大型工具输出或许多
    文件可能会触发压缩或截断。

    以下方法有帮助：

    - 要求机器人总结当前状态并将其写入文件。
    - 在长任务之前使用 `/compact`，在切换主题时使用 `/new`。
    - 将重要的上下文保留在工作区中，并要求机器人读回它。
    - 使用子代理进行长时间或并行工作，以保持主聊天较小。
    - 如果这种情况经常发生，请选择一个具有更大上下文窗口的模型。

  </Accordion>

  <Accordion title="如何完全重置 OpenClaw 但保留已安装的程序？">
    使用 reset 命令：

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
    ```

    注意事项：

    - 如果新手引导检测到现有配置，也会提供 **Reset** 选项。请参阅 [新手引导 (CLI)](/zh/start/wizard)。
    - 如果您使用了配置文件（`--profile` / `OPENCLAW_PROFILE`），请重置每个状态目录（默认为 `~/.openclaw-<profile>`）。
    - 开发重置：`openclaw gateway --dev --reset`（仅限开发；清除开发配置 + 凭证 + 会话 + 工作区）。

  </Accordion>

  <Accordion title='遇到“上下文过大”错误 - 如何重置或压缩？'>
    使用以下方法之一：

    - **压缩**（保留对话但总结较早的轮次）：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 来指导总结。

    - **重置**（为同一聊天密钥生成新的会话 ID）：

      ```
      /new
      /reset
      ```

    如果问题持续出现：

    - 启用或调整 **会话修剪**（`agents.defaults.contextPruning`）以删除旧工具输出。
    - 使用上下文窗口更大的模型。

    文档：[压缩](/zh/concepts/compaction)、[会话修剪](/zh/concepts/session-pruning)、[会话管理](/zh/concepts/session)。

  </Accordion>

  <Accordion title='为什么我会看到“LLM 请求被拒绝：需要 messages.content.tool_use.input 字段”？'>
    这是一个提供商验证错误：模型发出了 `tool_use` 块但缺少必需的
    `input`。这通常意味着会话历史已过时或损坏（通常发生在长线程后
    或工具/架构更改之后）。

    修复方法：使用 `/new`（独立消息）开始一个新的会话。

  </Accordion>

  <Accordion title="为什么我每 30 分钟会收到心跳消息？">
    心跳默认每 **30m** 运行一次（使用 OAuth 身份验证时为 **1h**）。调整或禁用它们：

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
    如果文件缺失，心跳仍会运行，由模型决定做什么。

    每个代理的覆盖使用 `agents.list[].heartbeat`。文档：[心跳](/zh/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我是否需要将“机器人帐号”添加到 WhatsApp 群组中？'>
    不需要。OpenClaw 运行在**您自己的帐号**上，所以如果您在群组中，OpenClaw 就可以看到它。
    默认情况下，群组回复会被阻止，直到您允许发件人 (`groupPolicy: "allowlist"`)。

    如果您希望只有**您**自己能够触发群组回复：

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
    选项 1（最快）：追踪日志并在群组中发送测试消息：

    ```bash
    openclaw logs --follow --json
    ```

    查找以 `@g.us` 结尾的 `chatId`（或 `from`），例如：
    `1234567890-1234567890@g.us`。

    选项 2（如果已配置/加入允许列表）：从配置中列出群组：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文档：[WhatsApp](/zh/channels/whatsapp), [Directory](/zh/cli/directory), [Logs](/zh/cli/logs)。

  </Accordion>

  <Accordion title="为什么 OpenClaw 不在群组中回复？">
    两个常见原因：

    - 提及限制已开启（默认）。您必须 @提及机器人（或匹配 `mentionPatterns`）。
    - 您配置了 `channels.whatsapp.groups` 但没有配置 `"*"`，且该群组不在允许列表中。

    请参阅 [Groups](/zh/channels/groups) 和 [Group messages](/zh/channels/group-messages)。

  </Accordion>

<Accordion title="群组/主题是否与私信共享上下文？">默认情况下，直接聊天会合并到主会话中。群组/频道拥有自己的会话密钥，而 Telegram 主题 / Discord 线程是独立的会话。请参阅 [Groups](/zh/channels/groups) 和 [Group messages](/zh/channels/group-messages)。</Accordion>

  <Accordion title="我可以创建多少个工作空间和代理？">
    没有硬性限制。几十个（甚至几百个）都可以，但需要注意：

    - **磁盘增长：** 会话和转录记录存储在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本：** 代理越多意味着并发的模型使用量越多。
    - **运维开销：** 每个代理的身份验证配置文件、工作空间和渠道路由。

    提示：

    - 为每个代理保留一个 **active** 工作空间 (`agents.defaults.workspace`)。
    - 如果磁盘空间增长，请清理旧会话（删除 JSONL 或存储条目）。
    - 使用 `openclaw doctor` 发现孤立的工作空间和配置文件不匹配问题。

  </Accordion>

  <Accordion title="我可以同时运行多个机器人或聊天吗 (Slack)，应该如何设置？">
    是的。使用 **Multi-Agent Routing** 运行多个隔离的代理，并通过渠道/账户/对等方路由传入消息。Slack 作为渠道受支持，可以绑定到特定的代理。

    浏览器访问功能强大，但并不意味着“能做人类能做的任何事”——反机器人、验证码 (CAPTCHA) 和多因素认证 (MFA) 仍然可以阻止自动化。为了获得最可靠的浏览器控制，请在主机上使用本地 Chrome MCP，或者在实际运行浏览器的机器上使用 CDP。

    最佳实践设置：

    - 始终在线的 Gateway(网关) 主机 (VPS/Mac mini)。
    - 每个角色一个代理（绑定）。
    - 绑定到这些代理的 Slack 渠道。
    - 根据需要通过 Chrome MCP 或节点使用本地浏览器。

    文档：[Multi-Agent Routing](/zh/concepts/multi-agent)、[Slack](/zh/channels/slack)、
    [Browser](/zh/tools/browser)、[Nodes](/zh/nodes)。

  </Accordion>
</AccordionGroup>

## 模型、故障转移和身份验证配置文件

模型问答——默认值、选择、别名、切换、故障转移、身份验证配置文件——
位于 [Models 常见问题](/zh/help/faq-models)。

## Gateway(网关)：端口、“正在运行”和远程模式

<AccordionGroup>
  <Accordion title="Gateway(网关) 使用哪个端口？">
    `gateway.port` 控制 WebSocket + HTTP（控制 UI、hooks 等）的单个多路复用端口。

    优先级：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='为什么 openclaw 网关状态显示 "Runtime: running"（运行时：正在运行）但 "Connectivity probe: failed"（连接探测：失败）？'>
    因为 "running" 是**主管程序**（supervisor，如 launchd/systemd/schtasks）的视角。连接探测是 CLI 实际连接到网关 WebSocket 的过程。

    使用 `openclaw gateway status` 并相信这些行：

    - `Probe target:`（探测实际使用的 URL）
    - `Listening:`（端口上实际绑定的内容）
    - `Last gateway error:`（当进程存活但端口未监听时的常见根本原因）

  </Accordion>

  <Accordion title='为什么 openclaw 网关状态显示的 "Config (cli)"（配置）和 "Config (service)"（服务配置）不同？'>
    您正在编辑一个配置文件，而服务正在运行另一个（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    修复方法：

    ```bash
    openclaw gateway install --force
    ```

    从您希望服务使用的同一个 `--profile` / 环境运行该命令。

  </Accordion>

  <Accordion title='"another gateway instance is already listening"（另一个网关实例正在监听）是什么意思？'>
    OpenClaw 通过在启动时立即绑定 WebSocket 监听器来强制执行运行时锁（默认 `ws://127.0.0.1:18789`）。如果绑定失败并出现 `EADDRINUSE`，它将抛出 `GatewayLockError`，表示另一个实例正在监听。

    修复方法：停止另一个实例，释放端口，或使用 `openclaw gateway --port <port>` 运行。

  </Accordion>

  <Accordion title="如何以远程模式运行 OpenClaw（客户端连接到其他地方的 Gateway(网关)）？">
    设置 `gateway.mode: "remote"` 并指向一个远程 WebSocket URL，可选择使用共享密钥的远程凭据：

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

    - `openclaw gateway` 仅在 `gateway.mode` 为 `local` 时启动（或者您传递了覆盖标志）。
    - macOS 应用程序会监视配置文件，并在这些值更改时实时切换模式。
    - `gateway.remote.token` / `.password` 仅用于客户端远程凭据；它们本身不启用本地网关身份验证。

  </Accordion>

  <Accordion title='控制 UI 显示“unauthorized”（或一直重连）。怎么办？'>
    您的网关认证路径与 UI 的认证方法不匹配。

    事实（来自代码）：

    - 控制 UI 将令牌保存在 `sessionStorage` 中，用于当前浏览器标签页会话和选定的网关 URL，因此同标签页刷新可以继续工作，而无需恢复长期的 localStorage 令牌持久性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，当网关返回重试提示（`canRetryWithDeviceToken=true`，`recommendedNextStep=retry_with_device_token`）时，受信任的客户端可以使用缓存的设备令牌尝试一次有界重试。
    - 该缓存令牌重试现在重用了与设备令牌一起存储的缓存批准范围。显式 `deviceToken` / 显式 `scopes` 调用者仍然保留其请求的范围集，而不是继承缓存范围。
    - 在该重试路径之外，连接认证优先级首先是显式共享令牌/密码，然后是显式 `deviceToken`，然后是存储的设备令牌，最后是引导令牌。
    - 引导令牌范围检查带有角色前缀。内置引导操作员白名单仅满足操作员请求；节点或其他非操作员角色仍需要在其自己的角色前缀下拥有范围。

    修复：

    - 最快：`openclaw dashboard`（打印 + 复制仪表板 URL，尝试打开；如果是无头模式则显示 SSH 提示）。
    - 如果您还没有令牌：`openclaw doctor --generate-gateway-token`。
    - 如果是远程，先建立隧道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/`。
    - 共享密钥模式：设置 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然后在控制 UI 设置中粘贴匹配的密钥。
    - Tailscale Serve 模式：确保已启用 `gateway.auth.allowTailscale`，并且您打开的是 Serve URL，而不是绕过 Tailscale 身份标头的原始环回/tailnet URL。
    - 受信任代理模式：确保您通过配置的非环回感知身份代理进行访问，而不是通过同主机环回代理或原始网关 URL。
    - 如果在一次重试后不匹配仍然存在，请轮换/重新批准配对的设备令牌：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 如果该轮换调用显示被拒绝，请检查两件事：
      - 配对设备会话只能轮换其**自己的**设备，除非它们也拥有 `operator.admin`
      - 显式 `--scope` 值不能超过调用者当前的操作员范围
    - 仍然卡住？运行 `openclaw status --all` 并按照[故障排除](/zh/gateway/troubleshooting)操作。有关认证详细信息，请参阅[仪表板](/zh/web/dashboard)。

  </Accordion>

  <Accordion title="I set gateway.bind tailnet but it cannot bind and nothing listens">
    `tailnet` bind 会从你的网络接口中选取一个 Tailscale IP (100.64.0.0/10)。如果机器未接入 Tailscale（或接口已关闭），则无地址可绑定。

    修复方法：

    - 在该主机上启动 Tailscale（使其拥有 100.x 地址），或者
    - 切换到 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是显式的。`auto` 优先使用环回地址；当你想要仅限 tailnet 的绑定时，请使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="Can I run multiple Gateways on the same host?">
    通常不行 - 一个 Gateway 可以运行多个消息通道和代理。仅当你需要冗余（例如：救援机器人）或硬性隔离时，才应使用多个 Gateway。

    可以，但必须隔离：

    - `OPENCLAW_CONFIG_PATH`（每个实例的配置）
    - `OPENCLAW_STATE_DIR`（每个实例的状态）
    - `agents.defaults.workspace`（工作区隔离）
    - `gateway.port`（唯一端口）

    快速设置（推荐）：

    - 每个实例使用 `openclaw --profile <name> ...`（自动创建 `~/.openclaw-<name>`）。
    - 在每个配置文件中设置唯一的 `gateway.port`（或在手动运行时传递 `--port`）。
    - 安装按配置文件区分的服务：`openclaw --profile <name> gateway install`。

    配置文件也会为服务名添加后缀（`ai.openclaw.<profile>`；旧版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
    完整指南：[Multiple gateways](/zh/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='“invalid handshake”/代码 1008 是什么意思？'>
    Gateway(网关) 是一个 **WebSocket 服务器**，它期望收到的第一条消息是
    `connect` 帧。如果收到任何其他内容，它将关闭连接
    并返回 **代码 1008**（策略违规）。

    常见原因：

    - 您在浏览器中打开了 **HTTP** URL (`http://...`)，而不是使用 WS 客户端。
    - 您使用了错误的端口或路径。
    - 代理或隧道剥离了身份验证标头或发送了非 Gateway(网关) 请求。

    快速修复：

    1. 使用 WS URL：`ws://<host>:18789`（如果是 HTTPS，则使用 `wss://...`）。
    2. 不要在普通的浏览器标签页中打开 WS 端口。
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

    您可以通过 `logging.file` 设置一个稳定路径。文件日志级别由 `logging.level` 控制。控制台详细程度由 `--verbose` 和 `logging.consoleLevel` 控制。

    最快的日志跟踪方式：

    ```bash
    openclaw logs --follow
    ```

    服务/监督程序日志（当网关通过 launchd/systemd 运行时）：

    - macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（默认：`~/.openclaw/logs/...`；配置文件使用 `~/.openclaw-<profile>/logs/...`）
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    更多信息请参阅 [故障排除](/zh/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="如何启动/停止/重启 Gateway(网关) 服务？">
    使用网关辅助工具：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手动运行网关，`openclaw gateway --force` 可以回收端口。请参阅 [Gateway(网关)](/zh/gateway)。

  </Accordion>

  <Accordion title="我在 Windows 上关闭了终端 - 如何重启 OpenClaw？">
    有 **两种 Windows 安装模式**：

    **1) WSL2（推荐）：** Gateway(网关) 在 Linux 内部运行。

    打开 PowerShell，进入 WSL，然后重启：

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您从未安装过该服务，请在前台启动它：

    ```bash
    openclaw gateway run
    ```

    **2) 原生 Windows（不推荐）：** Gateway(网关) 直接在 Windows 中运行。

    打开 PowerShell 并运行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手动运行它（无服务），请使用：

    ```powershell
    openclaw gateway run
    ```

    文档：[Windows (WSL2)](/zh/platforms/windows), [Gateway(网关) service runbook](/zh/gateway)。

  </Accordion>

  <Accordion title="Gateway(网关) 已启动但从未收到回复。我应该检查什么？">
    首先进行快速健康扫描：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常见原因：

    - 模型认证未在 **gateway host** 上加载（检查 `models status`）。
    - 渠道配对/允许列表阻止了回复（检查渠道配置 + 日志）。
    - WebChat/Dashboard 已打开但没有正确的令牌。

    如果您是远程访问，请确认隧道/Tailscale 连接已启动，并且
    Gateway(网关) WebSocket 可访问。

    文档：[Channels](/zh/channels), [Troubleshooting](/zh/gateway/troubleshooting), [Remote access](/zh/gateway/remote)。

  </Accordion>

  <Accordion title='"Disconnected from gateway: no reason" - 现在怎么办？'>
    这通常意味着 UI 丢失了 WebSocket 连接。检查：

    1. Gateway(网关) 是否在运行？ `openclaw gateway status`
    2. Gateway(网关) 是否健康？ `openclaw status`
    3. UI 是否有正确的令牌？ `openclaw dashboard`
    4. 如果是远程，隧道/Tailscale 链接是否已启动？

    然后查看日志：

    ```bash
    openclaw logs --follow
    ```

    文档：[Dashboard](/zh/web/dashboard), [Remote access](/zh/gateway/remote), [Troubleshooting](/zh/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失败。我应该检查什么？">
    首先检查日志和渠道状态：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然后对照错误信息：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 菜单条目过多。OpenClaw 已经将其修剪至 Telegram 限制并重试较少的命令，但仍需删除一些菜单条目。减少插件/技能/自定义命令，或者如果您不需要菜单，请禁用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或类似的网络错误：如果您在 VPS 上或代理后面，请确认允许出站 HTTPS 并且 DNS 对 `api.telegram.org` 有效。

    如果 Gateway(网关) 是远程的，请确保您正在查看 Gateway(网关) 主机上的日志。

    文档：[Telegram](/zh/channels/telegram)、[渠道故障排除](/zh/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 无显示。我应该检查什么？">
    首先确认 Gateway(网关) 是可达的且代理可以运行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 查看当前状态。如果您期望在聊天渠道中收到回复，请确保已启用投递（`/deliver on`）。

    文档：[TUI](/zh/web/tui)、[斜杠命令](/zh/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何完全停止然后启动 Gateway(网关)？">
    如果您安装了服务：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    这将停止/启动 **受监管的服务**（macOS 上的 launchd，Linux 上的 systemd）。
    当 Gateway(网关) 作为守护进程在后台运行时使用此方法。

    如果您在前台运行，请使用 Ctrl-C 停止，然后：

    ```bash
    openclaw gateway run
    ```

    文档：[Gateway(网关) 服务手册](/zh/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: 重启 **后台服务** (launchd/systemd)。
    - `openclaw gateway`: 在当前终端会话中以前台方式运行 Gateway。

    如果您安装了服务，请使用 gateway 命令。当您想要一次性前台运行时，请使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    使用 `--verbose` 启动 Gateway(网关) 以获取更多控制台详细信息。然后检查日志文件中的渠道认证、模型路由和 RPC 错误。
  </Accordion>
</AccordionGroup>

## 媒体和附件

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    来自代理的出站附件必须包含一个 `MEDIA:<path-or-url>` 行（单独一行）。请参阅 [OpenClaw assistant setup](/zh/start/openclaw) 和 [Agent send](/zh/tools/agent-send)。

    CLI 发送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    还要检查：

    - 目标渠道支持出站媒体，并且未被允许列表阻止。
    - 文件在提供商的大小限制内（图像会被调整至最大 2048px）。
    - `tools.fs.workspaceOnly=true` 将本地路径发送限制在工作区、temp/media-store 和沙盒验证的文件。
    - `tools.fs.workspaceOnly=false` 允许 `MEDIA:` 发送代理已经可以读取的主机本地文件，但仅限于媒体和安全文档类型（图像、音频、视频、PDF 和 Office 文档）。纯文本和类似机密的文件仍然被阻止。

    请参阅 [Images](/zh/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全与访问控制

<AccordionGroup>
  <Accordion title="将 OpenClaw 暴露给入站私信安全吗？">
    将入站私信视为不受信任的输入。默认设置旨在降低风险：

    - 支持私信的渠道上的默认行为是**配对**（pairing）：
      - 未知发件人会收到配对码；机器人不会处理他们的消息。
      - 使用以下命令批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 待处理的请求限制为**每个渠道 3 个**；如果未收到代码，请检查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公开开放私信需要明确选择加入（`dmPolicy: "open"` 和允许列表 `"*"`）。

    运行 `openclaw doctor` 以发现有风险的私信策略。

  </Accordion>

  <Accordion title="提示词注入仅是公开机器人需要关注的问题吗？">
    不是。提示词注入是关于**不受信任的内容**，而不仅仅是谁能给机器人发私信。
    如果你的助手读取外部内容（网络搜索/获取、浏览器页面、电子邮件、
    文档、附件、粘贴的日志），这些内容可能包含试图劫持模型的指令。即使**你是唯一的发件人**，这也可能发生。

    最大的风险在于启用工具时：模型可能被诱骗泄露上下文或代表你调用工具。通过以下方式减小影响范围：

    - 使用只读或禁用工具的“读取器”代理来总结不受信任的内容
    - 为启用工具的代理关闭 `web_search` / `web_fetch` / `browser`
    - 将解码的文件/文档文本也视为不受信任：OpenResponses
      `input_file` 和媒体附件提取都将提取的文本包装在显式的外部内容边界标记中，而不是传递原始文件文本
    - 沙箱隔离和严格的工具允许列表

    详情：[安全性](/zh/gateway/security)。

  </Accordion>

  <Accordion title="我的机器人应该拥有自己的电子邮件、GitHub 账户或电话号码吗？">
    是的，对于大多数设置来说。使用单独的账户和电话号码隔离机器人可以在出现问题时减少受影响的范围。这也使得轮换凭据或撤销访问权限变得更容易，而不会影响您的个人账户。

    从小处着手。只授予您实际需要的工具和账户的访问权限，如果需要，稍后再进行扩展。

    文档：[安全](/zh/gateway/security)，[配对](/zh/channels/pairing)。

  </Accordion>

  <Accordion title="我可以让它自主处理我的短信，这样安全吗？">
    我们**不**建议让它完全自主控制您的个人消息。最安全的模式是：

    - 将私信保持在**配对模式**或严格的允许列表中。
    - 如果您希望它代表您发送消息，请使用**单独的电话号码或账户**。
    - 让它起草草稿，然后**在发送前批准**。

    如果您想进行实验，请在专用账户上进行并保持隔离。请参阅 [安全](/zh/gateway/security)。

  </Accordion>

<Accordion title="我可以为个人助理任务使用更便宜的模型吗？">可以，**前提是**代理仅用于聊天且输入内容是受信任的。较小的层级更容易受到指令劫持，因此对于启用工具的代理或在读取不受信任的内容时，应避免使用它们。如果您必须使用较小的模型，请锁定工具并在沙箱中运行。请参阅 [安全](/zh/gateway/security)。</Accordion>

  <Accordion title="我在 Telegram 中运行了 /start 但没有收到配对代码">
    配对代码**仅**在未知发件人向机器人发送消息并且启用了 `dmPolicy: "pairing"` 时发送。仅凭 `/start` 本身不会生成代码。

    检查待处理的请求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您希望立即获得访问权限，请将您的发件人 ID 加入允许列表或为该账户设置 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它会给我的联系人发消息吗？配对如何进行？">
    不会。默认的 WhatsApp 私信策略是**配对 (pairing)**。未知发件人只会收到一个配对码，其消息**不会被处理**。OpenClaw 只会回复它收到的聊天或您触发的显式发送。

    使用以下命令批准配对：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待处理的请求：

    ```bash
    openclaw pairing list whatsapp
    ```

    向导手机号码提示：它用于设置您的**允许列表/所有者**，以便允许您自己的私信。它不用于自动发送。如果您在个人 WhatsApp 号码上运行，请使用该号码并启用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天命令、中止任务和“它不会停止”

<AccordionGroup>
  <Accordion title="如何阻止内部系统消息显示在聊天中？">
    大多数内部或工具消息仅在该会话启用了 **verbose**（详细）、**trace**（跟踪）或 **reasoning**（推理）时才会出现。

    在出现该问题的聊天中修复：

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    如果仍然很嘈杂，请检查控制 UI 中的会话设置，并将 verbose 设置为 **inherit**（继承）。还要确认您没有使用在配置中将 `verboseDefault` 设置为 `on` 的机器人配置文件。

    文档：[Thinking and verbose](/zh/tools/thinking)、[Security](/zh/gateway/security#reasoning-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在运行的任务？">
    发送以下任意一条**作为独立消息**（不带斜杠）：

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

    对于后台进程（来自 exec 工具），您可以要求代理运行：

    ```
    process action:kill sessionId:XXX
    ```

    斜杠命令概述：请参阅 [Slash commands](/zh/tools/slash-commands)。

    大多数命令必须作为以 `/` 开头的**独立**消息发送，但少数快捷方式（如 `/status`）对于允许列表中的发件人也可以内联使用。

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

  <Accordion title='为什么机器人似乎会“忽略”快速连续的消息？'>
    队列模式控制新消息如何与正在进行的运行交互。使用 `/queue` 更改模式：

    - `steer` - 新消息重定向当前任务
    - `followup` - 一次运行一条消息
    - `collect` - 批量消息并回复一次（默认）
    - `steer-backlog` - 立即转向，然后处理积压
    - `interrupt` - 中止当前运行并重新开始

    您可以为后续模式添加诸如 `debounce:2s cap:25 drop:summarize` 之类的选项。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title="Anthropic 使用 API 密钥时的默认模型是什么？">
    在 OpenClaw 中，凭据和模型选择是分开的。设置 `ANTHROPIC_API_KEY`（或在身份验证配置文件中存储 Anthropic API 密钥）可以启用身份验证，但实际的默认模型是您在 `agents.defaults.model.primary` 中配置的任何内容（例如，`anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，这意味着 Gateway(网关)无法在正在运行的代理的预期
    `auth-profiles.json` 中找到 Anthropic 凭据。
  </Accordion>
</AccordionGroup>

---

仍然卡住了？请在 [Discord](https://discord.com/invite/clawd) 中提问或打开 [GitHub 讨论](https://github.com/openclaw/openclaw/discussions)。

## 相关

- [首次运行常见问题](/zh/help/faq-first-run) — 安装、入门、身份验证、订阅、早期故障
- [模型常见问题](/zh/help/faq-models) — 模型选择、故障转移、身份验证配置文件
- [故障排除](/zh/help/troubleshooting) — 基于症状的分类
