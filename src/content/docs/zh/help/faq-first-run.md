---
summary: "常见问题：快速开始和首次运行设置 — 安装、入门、身份验证、订阅、初始失败"
read_when:
  - New install, onboarding stuck, or first-run errors
  - Choosing auth and provider subscriptions
  - Cannot access docs.openclaw.ai, cannot open dashboard, install stuck
title: "常见问题：首次运行设置"
sidebarTitle: "首次运行常见问题"
---

快速入门和首次运行问答。有关日常操作、模型、身份验证、会话和故障排除，请参阅主要的[常见问题](/zh/help/faq)。

## 快速开始和首次运行设置

<AccordionGroup>
  <Accordion title="我卡住了，解决问题的最快方法">
    使用一个能够**查看您的机器**的本地 AI 代理。这比在 Discord 中询问要有效得多，因为大多数“卡住了”的情况是**本地配置或环境问题**，远程帮助者无法检查这些问题。

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    这些工具可以读取代码库、运行命令、检查日志，并帮助修复您的机器级设置（PATH、服务、权限、身份验证文件）。通过可破解的安装方式为他们提供**完整的源代码检出**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这将从 git 检出安装 OpenClaw，以便代理可以读取代码和文档，并推断您正在运行的确切版本。您随时可以在以后重新运行安装程序（不使用 `--install-method git` 切换回稳定版本。

    提示：要求代理**计划并监督**修复过程（分步进行），然后仅执行必要的命令。这样可以保持更改较小且易于审计。

    如果您发现了真正的错误或修复方法，请在 GitHub 上提交 issue 或发送 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    从这些命令开始（在寻求帮助时共享输出）：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它们的作用：

    - `openclaw status`：网关/代理健康状况 + 基本配置的快速快照。
    - `openclaw models status`：检查提供商身份验证 + 模型可用性。
    - `openclaw doctor`：验证并修复常见的配置/状态问题。

    其他有用的 CLI 检查：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    快速调试循环：[如果出现问题，最初的 60 秒](/zh/help/faq#first-60-seconds-if-something-is-broken)。
    安装文档：[安装](/zh/install)、[安装程序标志](/zh/install/installer)、[更新](/zh/install/updating)。

  </Accordion>

  <Accordion title="心跳一直被跳过。跳过原因是什么意思？">
    常见的心跳跳过原因：

    - `quiet-hours`：超出了配置的活动时间窗口
    - `empty-heartbeat-file`：`HEARTBEAT.md` 存在，但仅包含空白/仅标题的脚手架
    - `no-tasks-due`：`HEARTBEAT.md` 任务模式处于活动状态，但还没有任何任务间隔到期
    - `alerts-disabled`：所有心跳可见性均已禁用（`showOk`、`showAlerts` 和 `useIndicator` 均处于关闭状态）

    在任务模式下，只有在实际心跳运行完成后，才会推进到期时间戳。跳过的运行不会将任务标记为已完成。

    文档：[Heartbeat](/zh/gateway/heartbeat)、[Automation](/zh/automation)。

  </Accordion>

  <Accordion title="安装和设置 OpenClaw 的推荐方式">
    该仓库推荐从源代码运行并使用新手引导：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    向导还可以自动构建 UI 资源。新手引导完成后，通常在端口 **18789** 上运行 Gateway(网关)。

    从源代码运行（贡献者/开发者）：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build
    openclaw onboard
    ```

    如果您尚未进行全局安装，请通过 `pnpm openclaw onboard` 运行它。

  </Accordion>

<Accordion title="新手引导后如何打开仪表板？">向导会在新手引导完成后立即在浏览器中打开一个干净的（非令牌化）仪表板 URL，并在摘要中打印该链接。请保持该选项卡打开；如果未启动，请在同一台机器上复制/粘贴打印出的 URL。</Accordion>

  <Accordion title="如何在本地主机与远程对仪表板进行身份验证？">
    **本地主机（同一台机器）：**

    - 打开 `http://127.0.0.1:18789/`。
    - 如果要求共享密钥身份验证，请将配置的令牌或密码粘贴到 Control UI 设置中。
    - 令牌来源：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - 密码来源：`gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果尚未配置共享密钥，请使用 `openclaw doctor --generate-gateway-token` 生成令牌。

    **不在本地主机上：**

    - **Tailscale Serve**（推荐）：保持绑定回环，运行 `openclaw gateway --tailscale serve`，打开 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 是 `true`，身份标头满足 Control UI/WebSocket 身份验证（无需粘贴共享密钥，假定网关主机受信任）；HTTP API 仍需要共享密钥身份验证，除非您有意使用 private-ingress `none` 或 trusted-proxy HTTP 身份验证。
      来自同一客户端的错误并发 Serve 身份验证尝试会在失败的身份验证限制器记录它们之前进行序列化，因此第二次错误重试可能已经显示 `retry later`。
    - **Tailnet bind**：运行 `openclaw gateway --bind tailnet --token "<token>"`（或配置密码身份验证），打开 `http://<tailscale-ip>:18789/`，然后在仪表板设置中粘贴匹配的共享密钥。
    - **感知身份的反向代理**：将 Gateway(网关) 保留在受信任的代理后面，配置 `gateway.auth.mode: "trusted-proxy"`，然后打开代理 URL。同主机回环代理需要显式 `gateway.auth.trustedProxy.allowLoopback = true`。
    - **SSH 隧道**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/`。共享密钥身份验证仍适用于隧道；如果出现提示，请粘贴配置的令牌或密码。

    有关绑定模式和身份验证的详细信息，请参阅 [仪表板](/zh/web/dashboard) 和 [Web 界面](/zh/web)。

  </Accordion>

  <Accordion title="为什么聊天审批有两个执行审批配置？">
    它们控制不同的层级：

    - `approvals.exec`：将审批提示转发到聊天目标
    - `channels.<channel>.execApprovals`：使该渠道充当执行审批的原生审批客户端

    主机执行策略仍然是真正的审批关口。聊天配置仅控制审批提示出现的位置以及人们如何回答它们。

    在大多数设置中，您**不需要**同时使用两者：

    - 如果聊天已经支持命令和回复，同聊天的 `/approve` 通过共享路径工作。
    - 如果支持的原生渠道可以安全地推断审批人，当 `channels.<channel>.execApprovals.enabled` 未设置或为 `"auto"` 时，OpenClaw 现在会自动启用私信优先的原生审批。
    - 当原生审批卡片/按钮可用时，该原生 UI 是主要路径；只有当工具结果指示聊天审批不可用或手动审批是唯一路径时，代理才应包含手动 `/approve` 命令。
    - 仅当提示必须转发到其他聊天或显式的运维室时，才使用 `approvals.exec`。
    - 仅当您明确希望将审批提示回发到发起的房间/主题时，才使用 `channels.<channel>.execApprovals.target: "channel"` 或 `"both"`。
    - 插件审批再次是分开的：它们默认使用同聊天的 `/approve`，可选的 `approvals.plugin` 转发，并且只有某些原生渠道会在顶部保留插件审批的原生处理。

    简而言之：转发用于路由，原生客户端配置用于更丰富的特定于渠道的 UX。
    请参阅 [执行审批](/zh/tools/exec-approvals)。

  </Accordion>

  <Accordion title="我需要什么运行时？">
    需要 Node **>= 22**。推荐使用 `pnpm`。对于 Bun，**不推荐**使用 Gateway(网关)。
  </Accordion>

  <Accordion title="Raspberry Pi它能在 Raspberry Pi 上运行吗？"Gateway(网关)Raspberry PiRaspberry PiGateway(网关)>
    是的。Gateway(网关) 非常轻量——文档列明 **512MB-1GB RAM**、**1 核**以及约 **500MB** 磁盘空间对于个人使用已足够，并且请注意 **Raspberry Pi 4 也可以运行它**。

    如果您需要额外余地（日志、媒体、其他服务），**建议使用 2GB**，但这并非硬性最低要求。

    提示：一个小型的 Raspberry Pi/VPS 可以托管 Gateway(网关)，您可以在笔记本电脑/手机上配对 **节点** 以进行本地屏幕/摄像头/画布操作或命令执行。请参阅 [Nodes](/zh/nodes)。

  </Accordion>

  <Accordion title="Raspberry PiRaspberry Pi 安装有什么提示吗？"Linux>
    简短版本：可以使用，但请预期会遇到一些粗糙的边缘情况。

    - 使用 **64 位** 操作系统并保持 Node >= 22。
    - 优先选择 **可破解的 安装**，以便您查看日志并快速更新。
    - 在不启用 channels/skills 的情况下启动，然后逐个添加它们。
    - 如果遇到奇怪的二进制问题，这通常是 **ARM 兼容性** 问题。

    文档：[Linux](/zh/platforms/linux), [安装](/zh/install)。

  </Accordion>

  <Accordion title="It is stuck on wake up my friend / 新手引导 will not hatch. What now?">
    该屏幕取决于 Gateway(网关) 是否可达以及是否已通过身份验证。 TUI 还会在首次启动时自动发送“Wake up, my friend!”。如果您看到该行显示 **no reply** 且 token 数量保持在 0，则意味着代理从未运行过。

    1. 重启 Gateway(网关)：

    ```bash
    openclaw gateway restart
    ```

    2. 检查状态 + 身份验证：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. 如果仍然挂起，请运行：

    ```bash
    openclaw doctor
    ```

    如果 Gateway(网关) 是远程的，请确保隧道/Tailscale 连接正常，并且 UI 指向正确的 Gateway(网关)。请参阅 [Remote access](/zh/gateway/remote)。

  </Accordion>

  <Accordion title="我可以将设置迁移到新机器（Mac mini）而无需重新进行新手引导吗？">
    可以。复制 **状态目录** 和 **工作区**，然后运行一次 Doctor。只要您复制 **这两个** 位置，这就可以让您的机器人保持“完全相同”（记忆、会话历史、身份验证和渠道状态）：

    1. 在新机器上安装 OpenClaw。
    2. 从旧机器复制 `$OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）。
    3. 复制您的工作区（默认：`~/.openclaw/workspace`）。
    4. 运行 `openclaw doctor`Gateway(网关)WhatsApp 并重启 Gateway 服务。

    这将保留配置、身份验证配置文件、WhatsApp 凭据、会话和记忆。如果您处于远程模式，请记住网关主机拥有会话存储和工作区。

    **重要提示：** 如果您仅将工作区提交/推送到 GitHub，您备份的是 **记忆 + 引导文件**，但 **不** 包括会话历史或身份验证信息。这些内容位于 `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    相关：[迁移](/zh/install/migrating)、[磁盘上的文件位置](/zh/help/faq#where-things-live-on-disk)、
    [Agent 工作区](/zh/concepts/agent-workspace)、[Doctor](/zh/gateway/doctor)、
    [远程模式](/zh/gateway/remote)。

  </Accordion>

  <Accordion title="我在哪里可以看到最新版本的新内容？">
    查看 GitHub 更新日志：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新的条目位于顶部。如果顶部部分标记为 **Unreleased**，则下一个有日期的部分
    是最新发布的版本。条目按 **Highlights**（亮点）、**Changes**（变更）和
    **Fixes**（修复）分组（根据需要还包括文档/其他部分）。

  </Accordion>

  <Accordion title="无法访问 docs.openclaw.ai（SSL 错误）">
    部分 Comcast/Xfinity 连接会通过 Xfinity 高级安全功能错误地拦截 `docs.openclaw.ai`。请禁用该功能或将 `docs.openclaw.ai` 加入允许列表，然后重试。
    请通过在此处报告来帮助我们解除拦截：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果您仍然无法访问该站点，文档已镜像到 GitHub：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Difference between stable and beta"npm>
    **Stable** 和 **beta** 是 **npm dist-tags**，不是独立的代码行：

    - `latest` = stable
    - `beta` = 用于测试的早期构建

    通常，stable 版本会先发布到 **beta** 上，然后通过一个明确的提升步骤将同一版本移动到 `latest`。维护者在需要时也可以直接发布到 `latest`。这就是为什么在提升后，beta 和 stable 可能指向**同一版本**。

    查看变更内容：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    关于单行安装命令以及 beta 和 dev 之间的区别，请参阅下方的折叠面板。

  </Accordion>

  <Accordion title="如何安装 Beta 版本，以及 Beta 版和 Dev 版有什么区别？"npm>
    **Beta** 是 npm dist-tag `beta`（在发布后可能与 `latest` 匹配）。
    **Dev** 是 `main`npm (git) 的移动头部；发布时，它使用 npm dist-tag `dev`macOSLinux。

    单行命令 (macOS/Linux)：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```Windows

    Windows 安装程序 (PowerShell)：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多详情：[开发渠道](/en/install/development-channels) 和 [安装程序标志](/en/install/installer)。

  </Accordion>

  <Accordion title="我如何试用最新版本？">
    两种选择：

    1. **开发渠道（git checkout）：**

    ```bash
    openclaw update --channel dev
    ```

    这将切换到 `main` 分支并从源代码更新。

    2. **可破解安装（从安装程序站点）：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这会为您提供一个可以编辑的本地仓库，然后通过 git 更新。

    如果您希望手动进行干净的克隆，请使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文档：[更新](/zh/cli/update)、[开发渠道](/zh/install/development-channels)、
    [安装](/zh/install)。

  </Accordion>

  <Accordion title="安装和新手引导通常需要多长时间？">
    大致指南：

    - **安装：** 2-5 分钟
    - **新手引导：** 5-15 分钟，具体取决于您配置的渠道/模型数量

    如果卡住，请使用 [安装卡住](#quick-start-and-first-run-setup)
    以及 [我卡住了](#quick-start-and-first-run-setup) 中的快速调试循环。

  </Accordion>

  <Accordion title="安装程序卡住了？如何获取更多信息？">
    使用 **详细输出（verbose output）** 重新运行安装程序：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    使用详细输出的 Beta 安装：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    对于可修改的 安装：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
    ```

    Windows (PowerShell) 等效命令：

    ```powershell
    # install.ps1 has no dedicated -Verbose flag yet.
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

    更多选项：[安装程序标志](/zh/install/installer)。

  </Accordion>

  <Accordion title="Windows 安装提示未找到 git 或无法识别 openclaw">
    两个常见的 Windows 问题：

    **1) npm 错误 spawn git / git not found**

    - 安装 **Git for Windows** 并确保 `git` 在您的 PATH 中。
    - 关闭并重新打开 PowerShell，然后重新运行安装程序。

    **2) 安装后无法识别 openclaw**

    - 您的 npm 全局 bin 文件夹不在 PATH 中。
    - 检查路径：

      ```powershell
      npm config get prefix
      ```

    - 将该目录添加到您的用户 PATH（在 Windows 上不需要 `\bin` 后缀；在大多数系统上是 `%AppData%\npm`）。
    - 更新 PATH 后关闭并重新打开 PowerShell。

    如果您想要最顺畅的 Windows 设置，请使用 **WSL2** 而不是原生 Windows。
    文档：[Windows](/zh/platforms/windows)。

  </Accordion>

  <Accordion title="WindowsWindows exec 输出显示乱码中文 - 我该怎么办？"Windows>
    这通常是由于原生 Windows Shell 的控制台代码页不匹配造成的。

    症状：

    - `system.run`/`exec` 输出将中文渲染为乱码（mojibake）
    - 同一条命令在另一个终端配置文件中显示正常

    在 PowerShell 中的快速解决方法：

    ```powershell
    chcp 65001
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ```Gateway(网关)

    然后重启 Gateway 并重试您的命令：

    ```powershell
    openclaw gateway restart
    ```OpenClaw

    如果您在最新的 OpenClaw 上仍然遇到此问题，请在此处跟踪或报告：

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="文档没有回答我的问题 - 我如何获得更好的答案？">
    使用 **hackable (git) 安装**，这样你在本地拥有完整的源代码和文档，然后
    在该文件夹中_向你的机器人（或 Claude/Codex）提问_，以便它能读取仓库并精准回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多详情：[安装](/zh/install) 和 [安装程序标志](/zh/install/installer)。

  </Accordion>

  <Accordion title="如何在 OpenClaw 上安装 Linux？">
    简短回答：遵循 Linux 指南，然后运行新手引导。

    - Linux 快速路径 + 服务安装：[Linux](/zh/platforms/linux)。
    - 完整演练：[入门指南](/zh/start/getting-started)。
    - 安装程序 + 更新：[安装与更新](/zh/install/updating)。

  </Accordion>

  <Accordion title="OpenClaw如何在 VPS 上安装 OpenClaw？"LinuxTailscaleGateway(网关)>
    任何 Linux VPS 均可。在服务器上安装，然后使用 SSH/Tailscale 连接 Gateway(网关)。

    指南：[exe.dev](/zh/install/exe-devHetzner)、[Hetzner](/zh/install/hetznerFly.io)、[Fly.io](/zh/install/flyGateway(网关))。
    远程访问：[Gateway(网关) remote](/zh/gateway/remote)。

  </Accordion>

  <Accordion title="云服务器/VPS 安装指南在哪里？">
    我们维护了一个包含常见提供商的 **托管中心**。选择一个并按照指南操作：

    - [VPS 托管](/zh/vps) (所有提供商汇总)
    - [Fly.io](/zh/install/fly)
    - [Hetzner](/zh/install/hetzner)
    - [exe.dev](/zh/install/exe-devGateway(网关)Tailscale)

    云端工作原理：**Gateway(网关) 运行在服务器上**，你通过控制 UI（或 Tailscale/SSH）从笔记本电脑/手机访问它。你的状态 + 工作区位于服务器上，因此请将主机视为事实来源并进行备份。

    你可以将 **节点** (Mac/iOS/AndroidGateway(网关)Gateway(网关)/headless) 配对到该云端 Gateway(网关) 以访问本地屏幕/相机/画布或在笔记本电脑上运行命令，同时将 Gateway(网关) 保留在云端。

    中心：[平台](/zh/platformsGateway(网关))。远程访问：[Gateway(网关) 远程](/zh/gateway/remote)。
    节点：[节点](/zh/nodesCLI), [节点 CLI](/zh/cli/nodes)。

  </Accordion>

  <Accordion title="Can I ask OpenClaw to update itself?"Gateway(网关)CLI>
    简短回答：**可行，但不推荐**。更新流程可能会重启
    Gateway(网关)（这会断开当前会话），可能需要进行干净的 git checkout，并且
    可能会提示进行确认。更安全的做法是：以操作员身份从 shell 运行更新。

    使用 CLI：

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel stable|beta|dev
    openclaw update --tag <dist-tag|version>
    openclaw update --no-restart
    ```

    如果您必须通过代理自动化执行此操作：

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    文档：[Update](/zh/cli/update)、[Updating](/zh/install/updating)。

  </Accordion>

  <Accordion title="新手引导实际上是做什么的？">
    `openclaw onboard`OAuthAPIAnthropicGateway(网关)WhatsAppTelegramDiscordMattermostSignaliMessagemacOSLinuxWSL2 是推荐的设置路径。在**本地模式**下，它会引导您完成以下步骤：

    - **模型/认证设置**（提供商 OAuth、API 密钥、Anthropic 设置令牌，以及本地模型选项，例如 LM Studio）
    - **工作区**位置 + 引导文件
    - **Gateway(网关)设置**（绑定/端口/认证/tailscale）
    - **渠道**（WhatsApp、Telegram、Discord、Mattermost、Signal、iMessage，以及捆绑的渠道插件，如 QQ Bot）
    - **守护进程安装**（macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd 用户单元）
    - **健康检查**和**技能**选择

    如果您配置的模型未知或缺少认证，它也会发出警告。

  </Accordion>

  <Accordion title="运行此程序是否需要 Claude 或 OpenAI 订阅？">
    不需要。您可以使用 **API 密钥**（OpenClaw/API/或其他）或**仅限本地模型**来运行 AnthropicOpenAI，以便让您的数据保留在您的设备上。订阅（Claude Pro/Max 或 OpenAI Codex）是对这些提供商进行身份验证的可选方式。

    对于在 Anthropic 中的 OpenClaw，实际的划分方式如下：

    - **Anthropic API 密钥**：按标准的 Anthropic API 计费
    - **在 CLI 中通过 Claude OpenClaw / Claude 订阅进行身份验证**：Anthropic 工作人员告知我们这种用法再次被允许，并且除非 OpenClaw 发布新政策，否则 Anthropic 将 `claude -p` 用法视为对此集成已获准许

    对于长期运行的网关主机，Anthropic API 密钥仍然是更可预测的设置方案。OpenAI Codex OAuth 明确支持像 OpenClaw 这样的外部工具。

    OpenClaw 还支持其他托管的订阅式选项，包括 **Qwen Cloud Coding Plan**、**MiniMax Coding Plan** 和 **Z.AI / GLM Coding Plan**。

    文档：[Anthropic](/zh/providers/anthropic)、[OpenAI](/zh/providers/openai)、
    [Qwen Cloud](/zh/providers/qwen)、
    [MiniMax](/zh/providers/minimax)、[Z.AI (GLM)](/zh/providers/zai)、
    [本地模型](/zh/gateway/local-models)、[模型](/zh/concepts/models)。

  </Accordion>

  <Accordion title="API我可以在没有 API 密钥的情况下使用 Claude Max 订阅吗？"AnthropicOpenClawCLIOpenClaw>
    可以。

    Anthropic 员工告知我们，OpenClaw 风格的 Claude CLI 使用再次被允许，因此除非 Anthropic 发布新政策，否则 OpenClaw 将 Claude 订阅身份验证和 `claude -p`AnthropicAnthropicAPI 使用视为此集成的授权行为。如果您希望拥有最可预测的服务器端设置，请改用 Anthropic API 密钥。

  </Accordion>

  <Accordion title="您是否支持 Claude 订阅身份验证（Claude Pro 或 Max）？">
    是的。

    AnthropicOpenClaw 员工告诉我们，这种使用方式再次被允许，因此除非 CLI 发布新政策，否则 OpenClaw 将此集成中的 Claude Anthropic 复用和 `claude -p` 使用视为经过授权。

    AnthropicOpenClawOpenClaw setup-token 仍然作为受支持的 OpenClaw 令牌路径可用，但如果可用，OpenClaw 现在更倾向于 Claude CLI 复用和 `claude -p`。
    对于生产环境或多用户工作负载，Anthropic APIOpenClaw 密钥身份验证仍然是更安全、更可预测的选择。如果您想要 OpenClaw 中其他基于订阅的托管选项，请参阅 [OpenAI](/zh/providers/openai)、[Qwen / Model
    Cloud](/zh/providers/qwen)、[MiniMax](/zh/providers/minimax) 和 [GLM
    Models](/zh/providers/zai)。

  </Accordion>

</AccordionGroup>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>

<AccordionGroup>
  <Accordion title="为什么我会收到来自 Anthropic 的 HTTP 429 rate_limit_error 错误？">
    这意味着您的 **Anthropic 配额/速率限制** 在当前时间窗口内已耗尽。如果您
    使用的是 **Claude CLI**，请等待时间窗口重置或升级您的计划。如果您
    使用的是 **Anthropic API 密钥**，请检查 Anthropic 控制台
    的使用情况/账单并根据需要提高限制。

    如果消息具体为：
    `Extra usage is required for long context requests`，则表示该请求尝试使用
    Anthropic 的 1M 上下文窗口（一个支持 GA 的 1M Claude 4.x 模型或旧版
    `context1m: true` 配置）。这仅在您的凭据有资格
    获得长上下文计费时才有效（API 密钥计费或启用了额外使用额度的 OpenClaw Claude-login 路径）。

    提示：设置一个 **回退模型（fallback 模型）**，这样当提供商受到速率限制时，OpenClaw 可以继续回复。
    请参阅 [模型](/zh/cli/models)、[OAuth](/zh/concepts/oauth) 和
    [/gateway/故障排除#anthropic-429-extra-usage-required-for-long-context](/zh/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

<Accordion title="是否支持 AWS Bedrock？">
  是的。OpenClaw 捆绑了 **Amazon Bedrock (Converse)** 提供商。当存在 AWS 环境标记时，OpenClaw 可以自动发现流式/文本 Bedrock 目录并将其作为隐式 `amazon-bedrock` 提供商进行合并；否则你可以显式启用 `plugins.entries.amazon-bedrock.config.discovery.enabled` 或添加手动提供商条目。请参阅 [Amazon Bedrock](/zh/providers/bedrock) 和 [Model providers](/zh/providers/models)。如果你更喜欢托管密钥流程，在
  Bedrock 前面使用 OpenAI 兼容的代理仍然是一个有效的选项。
</Accordion>

<Accordion title="Codex 认证如何工作？">
  OpenClaw 通过 OpenAI（ChatGPT 登录）支持 **OAuth Code (Codex)**。使用 `openai/gpt-5.5` 进行常见设置：ChatGPT/Codex 订阅身份验证以及 原生 Codex 应用服务器执行。遗留的 Codex GPT 引用是 由 `openclaw doctor --fix` 修复的遗留配置。直接的 OpenAI API 密钥 访问仍可用于非代理 OpenAI API 表面以及通过有序的 `openai` API 密钥配置文件 用于代理模型。请参阅 [模型提供商](/zh/concepts/model-providers) 和
  [新手引导 (CLI)](/zh/start/wizard)。
</Accordion>

  <Accordion title="为什么 OpenClaw 仍然提到旧版 OpenAI Codex 前缀？">
    `openai` 是 OpenAI API 密钥和
    ChatGPT/Codex OAuth 的提供商和身份验证配置文件 ID。您可能仍会在旧版配置和
    迁移警告中看到旧版 OpenAI Codex 前缀。
    较旧的配置也将其用作模型前缀：

    - `openai/gpt-5.5` = 带有原生 Codex 运行时的 ChatGPT/Codex 订阅身份验证，用于代理轮次
    - 旧版 Codex GPT-5.5 引用 = 由 `openclaw doctor --fix` 修复的旧版模型路由
    - `openai/gpt-5.5` 加上有序的 `openai` API 密钥配置文件 = API 密钥身份验证，用于 OpenAI 代理模型
    - 旧版 Codex 身份验证配置文件 ID = 由 `openclaw doctor --fix` 迁移的旧版身份验证配置文件 ID

    如果您希望直接使用 OpenAI 平台的计费/限制路径，请设置
    `OPENAI_API_KEY`。如果您希望使用 ChatGPT/Codex 订阅身份验证，请使用
    `openclaw models auth login --provider openai` 登录。请保持模型引用为
    `openai/gpt-5.5`；旧版 Codex 模型引用是
    `openclaw doctor --fix` 重写的旧版配置。

  </Accordion>

  <Accordion title="Why can Codex OAuth limits differ from ChatGPT web?">
    Codex OAuth uses OpenAI-managed, plan-dependent quota windows. In practice,
    those limits can differ from the ChatGPT website/app experience, even when
    both are tied to the same account.

    OpenClaw can show the currently visible 提供商 usage/quota windows in
    `openclaw models status`, but it does not invent or normalize ChatGPT-web
    entitlements into direct API access. If you want the direct OpenAI Platform
    billing/limit path, use `openai/*` with an API key.

  </Accordion>

  <Accordion title="是否支持 OpenAI 订阅认证 (Codex OAuth)？">
    是的。OpenClaw 完全支持 **OpenAI Code (Codex) 订阅 OAuth**。
    OpenAI 明确允许在外部工具/工作流
    （如 OAuth）中使用订阅 OpenClaw。新手引导可以为您运行 OAuth 流程。

    请参阅 [OAuth](/zh/concepts/oauth)、[Model providers](/zh/concepts/model-providers) 和 [新手引导 (CLI)](/zh/start/wizard)。

  </Accordion>

  <Accordion title="如何设置 Gemini CLI OAuth？">
    Gemini CLI 使用**插件认证流程**，而不是在 `openclaw.json` 中使用客户端 ID 或密钥。

    步骤：

    1. 在本地安装 Gemini CLI，以便 `gemini` 位于 `PATH` 上
       - Homebrew: `brew install gemini-cli`
       - npm: `npm install -g @google/gemini-cli`
    2. 启用插件：`openclaw plugins enable google`
    3. 登录：`openclaw models auth login --provider google-gemini-cli --set-default`
    4. 登录后的默认模型：`google-gemini-cli/gemini-3-flash-preview`
    5. 如果请求失败，请在网关主机上设置 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`

    这会将 OAuth 令牌存储在网关主机的认证配置文件中。详情：[Model providers](/zh/concepts/model-providers)。

  </Accordion>

<Accordion title="Is a local 模型 OK for casual chats?">通常不可以。OpenClaw 需要大上下文 + 强安全性；小卡会截断和泄露。如果必须，请在本地运行你能运行的 **最大** 模型构建（LM Studio），并查看 [/gateway/local-models](/zh/gateway/local-models)。更小/量化模型会增加提示注入风险 - 请参阅 [Security](/zh/gateway/security)。</Accordion>

<Accordion title="如何将托管模型流量保留在特定区域？">选择区域固定的端点。OpenRouter 为 MiniMax、Kimi 和 GLM 提供了美国托管的选项；选择美国托管变体以将数据保留在区域内。您仍然可以通过使用 `models.mode: "merge"` 将 Anthropic/OpenAI 与这些并列列出，以便在尊重您选择的区域提供商的同时保持回退可用。</Accordion>

  <Accordion title="我必须购买 Mac Mini 才能安装它吗？"OpenClawmacOSLinuxWindowsWSL2Raspberry PimacOSiMessageiMessage>
    不需要。OpenClaw 可以在 macOS 或 Linux（Windows 通过 WSL2）上运行。Mac mini 是可选的——有些人购买它作为始终开启的主机，但小型 VPS、家庭服务器或 Raspberry Pi 级别的设备也可以工作。

    你只需要一台 Mac 来使用 **仅限 macOS 的工具**。对于 iMessage，在任何已登录 Messages 的 Mac 上配合 [iMessage](/zh/channels/imessage) 使用 `imsg`Gateway(网关)Linux。如果 Gateway 在 Linux 或其他地方运行，请将 `channels.imessage.cliPath` 设置为在该 Mac 上运行 `imsg`macOSGateway(网关)macOSiMessage 的 SSH 封装程序。如果你需要其他仅限 macOS 的工具，请在 Mac 上运行 Gateway 或配对一个 macOS 节点。

    文档：[iMessage](/zh/channels/imessage)、[Nodes](/zh/nodes)、[Mac remote mode](/zh/platforms/mac/remote)。

  </Accordion>

  <Accordion title="iMessage支持 iMessage 需要配备 Mac mini 吗？"macOSiMessage>
    您需要有一台**已登录 Messages 的 macOS 设备**。它**不必**是 Mac mini ——
    任何 Mac 都可以。**使用带有 `imsg`Gateway(网关) 的 [iMessage](/zh/channels/imessage)**；Gateway(网关) 可以在该 Mac 上运行，也可以在别处通过 SSH 封装器 `cliPath`Gateway(网关)Linux 运行。

    常见设置：

    - 在 Linux/VPS 上运行 Gateway(网关)，并将 `channels.imessage.cliPath` 设置为 SSH 封装器，该封装器在已登录 Messages 的 Mac 上运行 `imsg`iMessage。
    - 如果您想要最简单的单机设置，请在 Mac 上运行所有内容。

    文档：[iMessage](/zh/channels/imessage)、[Nodes](/zh/nodes)、
    [Mac remote mode](/zh/platforms/mac/remote)。

  </Accordion>

  <Accordion title="OpenClaw如果我购买 Mac mini 来运行 OpenClaw，我可以将它连接到我的 MacBook Pro 吗？"Gateway(网关)Gateway(网关)>
    可以。**Mac mini 可以运行 Gateway(网关)**，而你的 MacBook Pro 可以作为**节点**（配套设备）连接。节点不运行 Gateway(网关)——它们提供额外的功能，如该设备上的屏幕/摄像头/画布和 `system.run`Gateway(网关)macOSGateway(网关)。

    常见模式：

    - Mac mini 上的 Gateway(网关)（始终开启）。
    - MacBook Pro 运行 macOS 应用或节点主机，并与 Gateway(网关) 配对。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 查看它。

    文档：[节点](/zh/nodesCLI)，[节点 CLI](/zh/cli/nodes)。

  </Accordion>

  <Accordion title="我可以使用 Bun 吗？">
    **不建议**使用 Bun。我们会遇到运行时错误，特别是在 Bun 和 Bun 方面。
    请使用 **Node** 以获得稳定的网关。

    如果您仍然想尝试使用 Bun，请在非生产环境网关上进行操作，
    且不要涉及 WhatsApp/Telegram。

  </Accordion>

  <Accordion title="TelegramTelegram: allowFrom 中填什么？">
    `channels.telegram.allowFrom`Telegram 是**人类发送者的 Telegram 用户 ID**（数字）。它不是机器人用户名。

    安装程序仅要求输入数字用户 ID。如果你在配置中已经有旧的 `@username` 条目，`openclaw doctor --fix` 可以尝试解析它们。

    更安全（无第三方机器人）：

    - 私信你的机器人，然后运行 `openclaw logs --follow` 并读取 `from.id`API。

    官方 Bot API：

    - 私信你的机器人，然后调用 `https://api.telegram.org/bot<bot_token>/getUpdates` 并读取 `message.from.id`。

    第三方（隐私性较低）：

    - 私信 `@userinfobot` 或 `@getidsbot`。

    请参阅 [/channels/telegram](/zh/channels/telegram#access-control-and-activation)。

  </Accordion>

<Accordion title="Can multiple people use one WhatsApp number with different OpenClaw instances?">
  是的，通过 **multi-agent routing**。将每个发送者的 WhatsApp **私信**（peer `kind: "direct"`，sender E.164 like `+15551234567`）绑定到不同的 `agentId`，这样每个人都能获得自己的工作区和会话存储。回复仍然来自 **同一个 WhatsApp 账户**，并且私信访问控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）是针对每个 WhatsApp 账户的全局设置。参见 [Multi-Agent
  Routing](/zh/concepts/multi-agent) 和 [WhatsApp](/zh/channels/whatsapp)。
</Accordion>

<Accordion title="我可以运行一个“快速聊天”代理和一个“用于编程的 Opus”代理吗？">可以。使用多代理路由：为每个代理分配其自己的默认模型，然后将入站路由（提供商帐户或特定对等端）绑定到每个代理。示例配置位于 [多代理路由](/zh/concepts/multi-agent)。另请参阅 [模型](/zh/concepts/models) 和 [配置](/zh/gateway/configuration)。</Accordion>

  <Accordion title="Homebrew 适用于 Linux 吗？">
    是的。Homebrew 支持 Linux (Linuxbrew)。快速设置：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果你通过 systemd 运行 OpenClaw，请确保服务的 PATH 包含 `/home/linuxbrew/.linuxbrew/bin`（或你的 brew 前缀），以便 `brew` 安装的工具在非登录 shell 中能被解析。
    最新的构建版本还会在 Linux systemd 服务中预置常见的用户 bin 目录（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），并在设置时遵循 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可黑客修改的 git 安装与 npm 安装的区别">
    - **可黑客修改 (git) 安装：** 完整的源代码检出，可编辑，最适合贡献者。
      您在本地运行构建，并且可以修补代码/文档。
    - **npm 安装：** 全局 CLI 安装，无仓库，最适合“直接运行”。
      更新来自 npm dist-tags。

    文档：[入门指南](/zh/start/getting-started)，[更新](/zh/install/updating)。

  </Accordion>

  <Accordion title="npm我稍后可以在 npm 和 git 安装之间切换吗？">
    可以的。当 OpenClaw 已安装时，请使用 `openclaw update --channel ...`OpenClawOpenClaw。
    这**不会删除您的数据**——它仅更改 OpenClaw 的代码安装。
    您的状态（`~/.openclaw`）和工作区（`~/.openclaw/workspace`npm）将保持不变。

    从 npm 切换到 git：

    ```bash
    openclaw update --channel dev
    ```npm

    从 git 切换到 npm：

    ```bash
    openclaw update --channel stable
    ```

    添加 `--dry-run` 以预先预览计划中的模式切换。更新程序会
    运行 Doctor 后续检查，为目标渠道刷新插件来源，并
    重启网关，除非您传递了 `--no-restart`。

    安装程序也可以强制任一模式：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
    ```

    备份提示：请参阅[备份策略](/zh/help/faq#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="我应该在我的笔记本电脑还是 VPS 上运行 Gateway(网关)？">
    简短回答：**如果您需要 24/7 的稳定性，请使用 VPS**。如果您希望摩擦最小且不介意睡眠/重启，请在本地运行。

    **笔记本电脑（本地 Gateway(网关)）**

    - **优点：** 无服务器成本，直接访问本地文件，实时浏览器窗口。
    - **缺点：** 休眠/网络掉线 = 断开连接，操作系统更新/重启会中断，必须保持唤醒。

    **VPS / 云端**

    - **优点：** 始终在线，网络稳定，无笔记本休眠问题，更容易保持运行。
    - **缺点：** 通常无头运行（使用截图），仅限远程文件访问，必须通过 SSH 进行更新。

    **OpenClaw 特别说明：** WhatsApp/Telegram/Slack/Mattermost/Discord 在 VPS 上都可以正常工作。唯一真正的权衡是 **无头浏览器** 与可见窗口之间的选择。请参阅 [浏览器](/zh/tools/browser)。

    **推荐默认选项：** 如果您以前遇到过网关断开连接的情况，请使用 VPS。当您正在积极使用 Mac 并且希望访问本地文件或使用可见浏览器进行 UI 自动化时，本地运行非常棒。

  </Accordion>

  <Accordion title="OpenClaw在专用机器上运行 OpenClaw 有多重要？"Raspberry PiGateway(网关)>
    非必须，但**为了可靠性和隔离性，建议这样做**。

    - **专用主机（VPS/Mac mini/Raspberry Pi）：** 始终在线，睡眠/重启中断更少，权限更清晰，更容易保持运行。
    - **共享笔记本电脑/台式机：** 用于测试和主动使用完全没问题，但要注意当机器休眠或更新时会出现暂停。

    如果你想两全其美，请将 Gateway 保留在专用主机上，并将你的笔记本电脑作为**节点**配对，用于本地屏幕/摄像头/exec 工具。请参阅 [节点](/zh/nodes)。
    如需安全指南，请阅读 [安全性](/zh/gateway/security)。

  </Accordion>

  <Accordion title="最低的 VPS 要求和推荐的操作系统是什么？">
    OpenClaw 是轻量级的。对于一个基本的 Gateway(网关) + 一个聊天渠道：

    - **绝对最低配置：** 1 vCPU，1GB RAM，约 500MB 磁盘空间。
    - **推荐配置：** 1-2 vCPU，2GB RAM 或更多，以便留有余量（日志、媒体、多个渠道）。Node 工具和浏览器自动化可能会消耗较多资源。

    操作系统：使用 **Ubuntu LTS**（或任何现代的 Debian/Ubuntu）。Linux 的安装路径在那里经过了最充分的测试。

    文档：[Linux](/zh/platforms/linux)，[VPS hosting](/zh/vps)。

  </Accordion>

  <Accordion title="OpenClaw我可以在虚拟机 (VM) 中运行 OpenClaw 吗？有哪些要求？"Gateway(网关)WindowsWSL2Windows>
    可以。将虚拟机视为 VPS：它需要保持一直在线、可访问，并且拥有足够的
    RAM 以供 Gateway(网关) 和您启用的任何通道使用。

    基准指导：

    - **绝对最低配置：** 1 个 vCPU，1GB RAM。
    - **推荐配置：** 2GB RAM 或更多，如果您运行多个通道、浏览器自动化或媒体工具。
    - **操作系统：** Ubuntu LTS 或其他现代 Debian/Ubuntu 版本。

    如果您使用的是 Windows，**WSL2 是最简单的虚拟机风格设置** 并且具有最佳的工具
    兼容性。请参阅 [Windows](/zh/platforms/windows)、[VPS 托管](/zh/vpsmacOSmacOS)。
    如果您在虚拟机中运行 macOS，请参阅 [macOS VM](/zh/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 相关

- [常见问题](/zh/help/faq) — 主常见问题（模型、会话、网关、安全性等）
- [安装概述](/zh/install)
- [入门指南](/zh/start/getting-started)
- [故障排除](/zh/help/troubleshooting)
