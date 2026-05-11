---
summary: "常见问题：快速开始和首次运行设置 — 安装、入门、身份验证、订阅、初始失败"
read_when:
  - New install, onboarding stuck, or first-run errors
  - Choosing auth and provider subscriptions
  - Cannot access docs.openclaw.ai, cannot open dashboard, install stuck
title: "常见问题：首次运行设置"
sidebarTitle: "首次运行常见问题"
---

快速开始和首次运行问答。有关日常操作、模型、身份验证、会话和故障排除，请参阅主[常见问题](/zh/help/faq)。

## 快速开始和首次运行设置

<AccordionGroup>
  <Accordion title="我卡住了，解决问题的最快方法">
    使用一个能**看到你的机器**的本地 AI 代理。这比在 Discord 上提问要有效得多，因为大多数“卡住了”的情况都是**本地配置或环境问题**，远程助手无法检查。

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **Discord Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    这些工具可以读取代码仓库，运行命令，检查日志，并帮助修复你的机器级设置（PATH、服务、权限、认证文件）。通过可破解的安装方式，为它们提供**完整的源代码检出**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这将从 git 检出中安装 OpenAI，以便代理可以阅读代码和文档，并推断你正在运行的确切版本。你以后总是可以通过不带 `--install-method git` 重新运行安装程序来切换回稳定版。

    提示：要求代理**计划和监督**修复过程（分步进行），然后只执行必要的命令。这样可以使更改更小且更容易审计。

    如果你发现真正的错误或修复，请提交 OpenClaw issue 或发送 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    从这些命令开始（在寻求帮助时共享输出）：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它们的作用：

    - `openclaw status`: 网关/代理健康状况 + 基本配置的快速快照。
    - `openclaw models status`: 检查提供商认证 + 模型可用性。
    - `openclaw doctor`: 验证并修复常见的配置/状态问题。

    其他有用的 GitHub 检查：`openclaw status --all`, `openclaw logs --follow`,
    `openclaw gateway status`, `openclaw health --verbose`.

    快速调试循环：[出现问题后的前 60 秒](#first-60-seconds-if-something-is-broken)。
    安装文档：[安装](/zh/install)、[安装程序标志](/zh/install/installer)、[更新](/zh/install/updating)。

  </Accordion>

  <Accordion title="心跳一直跳过。跳过原因是什么意思？">
    常见的心跳跳过原因：

    - `quiet-hours`: 超出配置的活动时间窗口
    - `empty-heartbeat-file`: `HEARTBEAT.md` 存在，但仅包含空白/仅标题的脚手架
    - `no-tasks-due`: `HEARTBEAT.md` 任务模式处于活动状态，但尚未到期任何任务间隔
    - `alerts-disabled`: 所有心跳可见性均被禁用（`showOk`、`showAlerts` 和 `useIndicator` 均已关闭）

    在任务模式下，到期时间戳仅在真实心跳运行完成后推进。跳过的运行不会将任务标记为已完成。

    文档：[心跳](/zh/gateway/heartbeat)、[自动化与任务](/zh/automation)。

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

  <Accordion title="如何在本地主机与远程端对仪表板进行身份验证？">
    **本地主机（同一台机器）：**

    - 打开 `http://127.0.0.1:18789/`。
    - 如果要求共享密钥身份验证，请将配置的令牌或密码粘贴到 Control UI 设置中。
    - 令牌来源：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - 密码来源：`gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果尚未配置共享密钥，请使用 `openclaw doctor --generate-gateway-token` 生成令牌。

    **不在本地主机上：**

    - **Tailscale Serve**（推荐）：保持绑定环回，运行 `openclaw gateway --tailscale serve`，打开 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 为 `true`，身份标头满足 Control UI/WebSocket 身份验证（无需粘贴共享密钥，假定受信任的网关主机）；HTTP API 仍需要共享密钥身份验证，除非您有意使用 private-ingress `none` 或 trusted-proxy HTTP 身份验证。
      来自同一客户端的错误并发 Serve 身份验证尝试会在失败身份验证限制器记录它们之前被序列化，因此第二次错误重试可能已经显示 `retry later`。
    - **Tailnet 绑定**：运行 `openclaw gateway --bind tailnet --token "<token>"`（或配置密码身份验证），打开 `http://<tailscale-ip>:18789/`，然后在仪表板设置中粘贴匹配的共享密钥。
    - **具有身份感知功能的反向代理**：将 Gateway(网关) 保留在非环回受信任代理后面，配置 `gateway.auth.mode: "trusted-proxy"`，然后打开代理 URL。
    - **SSH 隧道**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/`。共享密钥身份验证仍通过隧道应用；如果提示，请粘贴配置的令牌或密码。

    有关绑定模式和身份验证详细信息，请参阅 [仪表板](/zh/web/dashboard) 和 [Web 界面](/zh/web)。

  </Accordion>

  <Accordion title="为什么针对聊天审批有两个执行审批配置？">
    它们控制不同的层级：

    - `approvals.exec`：将审批提示转发到聊天目标
    - `channels.<channel>.execApprovals`：使该渠道充当执行审批的原生审批客户端

    主机执行策略仍然是真正的审批关口。聊天配置仅控制审批提示出现的位置以及人们如何回答它们。

    在大多数设置中，您**不**需要同时启用两者：

    - 如果聊天已经支持命令和回复，同聊天 `/approve` 通过共享路径工作。
    - 如果支持的原生渠道可以安全地推断审批人，OpenClaw 现在会在 `channels.<channel>.execApprovals.enabled` 未设置或为 `"auto"` 时自动启用私信优先的原生审批。
    - 当原生审批卡片/按钮可用时，该原生 UI 是主要路径；仅当工具结果表明聊天审批不可用或手动审批是唯一路径时，代理才应包含手动 `/approve` 命令。
    - 仅当提示还必须转发到其他聊天或显式的运维房间时，才使用 `approvals.exec`。
    - 仅当您明确希望将审批提示回发到源房间/主题时，才使用 `channels.<channel>.execApprovals.target: "channel"` 或 `"both"`。
    - 插件审批又是独立的：它们默认使用同聊天 `/approve`，可选 `approvals.plugin` 转发，并且只有部分原生渠道保留了插件审批原生处理。

    简而言之：转发用于路由，原生客户端配置用于更丰富的特定渠道用户体验。
    请参阅 [执行审批](/zh/tools/exec-approvals)。

  </Accordion>

  <Accordion title="我需要什么运行时？">
    需要 Node **>= 22**。推荐使用 `pnpm`。对于 Bun，**不推荐**使用 Gateway(网关)。
  </Accordion>

  <Accordion title="可以在 Raspberry Pi 上运行吗？">
    可以。Gateway(网关) 非常轻量 - 文档列出 **512MB-1GB RAM**、**1 核**和大约 **500MB**
    磁盘空间就足以满足个人使用，请注意 **Raspberry Pi 4 可以运行它**。

    如果你需要额外的余量（日志、媒体、其他服务），**建议使用 2GB**，但这并不是
    硬性最低要求。

    提示：一个小型的 Pi/VPS 可以托管 Gateway(网关)，你可以在笔记本电脑/手机上配对 **节点**
    用于本地屏幕/摄像头/画布或命令执行。参见 [Nodes](/zh/nodes)。

  </Accordion>

  <Accordion title="Raspberry Pi 安装有什么技巧吗？">
    简而言之：它可以运行，但可能会有一些粗糙的边缘。

    - 使用 **64 位** 操作系统并保持 Node >= 22。
    - 优先选择 **可黑客攻击 (git) 安装**，这样你可以查看日志并快速更新。
    - 在没有 channels/skills 的情况下开始，然后逐个添加它们。
    - 如果你遇到奇怪的二进制问题，这通常是 **ARM 兼容性** 问题。

    文档：[Linux](/zh/platforms/linux)，[Install](/zh/install)。

  </Accordion>

  <Accordion title="卡在 wake up my friend / 新手引导无法启动。现在该怎么办？">
    该屏幕取决于 Gateway(网关) 是否可达且已通过身份验证。TUI 还会在
    首次启动时自动发送 “Wake up, my friend!”。如果你看到那行字但没有 **回复**
    并且 tokens 保持在 0，则说明代理从未运行。

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

    如果 Gateway(网关) 是远程的，请确保隧道/Tailscale 连接已建立，并且 UI
    指向正确的 Gateway(网关)。参见 [Remote access](/zh/gateway/remote)。

  </Accordion>

  <Accordion title="能否在不重新进行新手引导的情况下将我的设置迁移到新机器（Mac mini）？">
    可以。复制 **state 目录** 和 **工作区**，然后运行一次 Doctor。这会让你的机器人“完全保持原样”（内存、会话历史、身份验证和渠道状态），前提是你复制了 **这两个** 位置：

    1. 在新机器上安装 OpenClaw。
    2. 从旧机器复制 `$OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）。
    3. 复制你的工作区（默认：`~/.openclaw/workspace`）。
    4. 运行 `openclaw doctor` 并重启 Gateway(网关) 服务。

    这样可以保留配置、身份验证配置文件、WhatsApp 凭据、会话和内存。如果你处于远程模式，请记住网关主机拥有会话存储和工作区。

    **重要提示：** 如果你仅将工作区提交/推送到 GitHub，你备份的是 **内存 + 引导文件**，但 **不包含** 会话历史或身份验证。这些内容位于 `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    相关：[迁移](/zh/install/migrating)、[文件存储位置](#where-things-live-on-disk)、
    [代理工作区](/zh/concepts/agent-workspace)、[Doctor](/zh/gateway/doctor)、
    [远程模式](/zh/gateway/remote)。

  </Accordion>

  <Accordion title="我在哪里可以查看最新版本的新内容？">
    查看 GitHub 更新日志：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新的条目位于顶部。如果顶部部分标记为 **Unreleased**，则下一个带日期的部分是最新发布的版本。条目按 **Highlights**、**Changes** 和 **Fixes** 分组（根据需要还包括文档/其他部分）。

  </Accordion>

  <Accordion title="无法访问 docs.openclaw.ai（SSL 错误）">
    某些 Comcast/Xfinity 连接通过 Xfinity 高级安全功能错误地阻止了 `docs.openclaw.ai`。请禁用它或将 `docs.openclaw.ai` 加入允许列表，然后重试。
    请通过此处报告来帮助我们解除阻止：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果你仍然无法访问该站点，文档在 GitHub 上有镜像：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Difference between stable and beta">
    **Stable**（稳定版）和 **beta**（测试版）是 **npm dist-tags**（npm 分发标签），不是独立的代码行：

    - `latest` = stable
    - `beta` = early build for testing

    通常，stable 版本会先发布到 **beta**，然后通过显式的升级步骤将该版本移动到 `latest`。维护人员也可以在需要时直接发布到 `latest`。这就是为什么 beta 和 stable 在升级后可以指向 **same version**（同一版本）。

    查看变更内容：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    有关单行安装命令以及 beta 和 dev 之间的区别，请参阅下面的折叠面板。

  </Accordion>

  <Accordion title="How do I install the beta version and what is the difference between beta and dev?">
    **Beta** 是 npm dist-tag `beta`（升级后可能与 `latest` 匹配）。
    **Dev** 是 `main` (git) 的最新移动头；发布时，它使用 npm dist-tag `dev`。

    单行安装命令 (macOS/Linux)：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安装程序 (PowerShell)：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多详情：[Development channels](/zh/install/development-channels) 和 [Installer flags](/zh/install/installer)。

  </Accordion>

  <Accordion title="How do I try the latest bits?">
    两个选项：

    1. **Dev 渠道 (git checkout)：**

    ```bash
    openclaw update --channel dev
    ```

    这将切换到 `main` 分支并从源码更新。

    2. **Hackable install (from the installer site)：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这会为你提供一个可以编辑的本地仓库，然后通过 git 更新。

    如果你更喜欢手动进行干净的克隆，请使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文档：[Update](/zh/cli/update)、[Development channels](/zh/install/development-channels)、
    [Install](/zh/install)。

  </Accordion>

  <Accordion title="安装和新手引导通常需要多长时间？">
    大致指南：

    - **安装：** 2-5 分钟
    - **新手引导：** 5-15 分钟，具体取决于您配置的渠道/模型数量

    如果卡住，请使用 [安装程序卡住](#quick-start-and-first-run-setup)
    以及 [我卡住了](#quick-start-and-first-run-setup) 中的快速调试循环。

  </Accordion>

  <Accordion title="安装程序卡住了？如何获取更多反馈？">
    使用 **详细输出** 重新运行安装程序：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    带有详细输出的 Beta 版安装：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    对于可黑客（git）安装：

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

  <Accordion title="Windows 安装提示找不到 git 或无法识别 openclaw">
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

    - 将该目录添加到您的用户 PATH（在 Windows 上不需要 `\bin` 后缀；在大多数系统上它是 `%AppData%\npm`）。
    - 更新 PATH 后关闭并重新打开 PowerShell。

    如果您想要最顺畅的 Windows 设置，请使用 **WSL2** 而不是原生 Windows。
    文档：[Windows](/zh/platforms/windows)。

  </Accordion>

  <Accordion title="Windows exec output shows garbled Chinese text - what should I do?">
    这通常是由于原生 Windows shell 上的控制台代码页不匹配造成的。

    症状：

    - `system.run`/`exec` 输出将中文显示为乱码
    - 同一命令在另一个终端配置文件中看起来正常

    PowerShell 中的快速解决方法：

    ```powershell
    chcp 65001
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ```

    然后重启 Gateway(网关) 并重试您的命令：

    ```powershell
    openclaw gateway restart
    ```

    如果您在最新的 OpenClaw 上仍然遇到此问题，请在此处跟踪/报告：

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="The docs did not answer my question - how do I get a better answer?">
    使用 **可破解 (git) 安装**，这样您就可以在本地拥有完整的源代码和文档，然后在该文件夹中 _询问您的机器人（或 Claude/Codex）_，以便它可以读取仓库并精确回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多详情：[安装](/zh/install) 和 [安装程序标志](/zh/install/installer)。

  </Accordion>

  <Accordion title="How do I install OpenClaw on Linux?">
    简短回答：遵循 Linux 指南，然后运行新手引导。

    - Linux 快速路径 + 服务安装：[Linux](/zh/platforms/linux)。
    - 完整演练：[入门指南](/zh/start/getting-started)。
    - 安装程序 + 更新：[安装与更新](/zh/install/updating)。

  </Accordion>

  <Accordion title="How do I install OpenClaw on a VPS?">
    任何 Linux VPS 均可。在服务器上安装，然后使用 SSH/Tailscale 连接到 Gateway(网关)。

    指南：[exe.dev](/zh/install/exe-dev)、[Hetzner](/zh/install/hetzner)、[Fly.io](/zh/install/fly)。
    远程访问：[Gateway(网关) 远程](/zh/gateway/remote)。

  </Accordion>

  <Accordion title="云/VPS 安装指南在哪里？">
    我们维护了一个包含常见提供商的**托管中心 (hosting hub)**。选择一个并按照指南操作：

    - [VPS hosting](/zh/vps) (所有提供商汇总)
    - [Fly.io](/zh/install/fly)
    - [Hetzner](/zh/install/hetzner)
    - [exe.dev](/zh/install/exe-dev)

    云端工作原理：**Gateway(网关) 运行在服务器上**，你可以通过
    控制UI（或 Tailscale/SSH）从笔记本电脑/手机访问它。你的状态 + 工作区
    存在于服务器上，因此请将主机视为事实来源并对其进行备份。

    你可以将**节点**（Mac/iOS/Android/headless）与该云端 Gateway(网关) 配对，以便访问
    本地屏幕/摄像头/画布或在笔记本电脑上运行命令，同时保持
    Gateway(网关) 在云端。

    中心：[Platforms](/zh/platforms)。远程访问：[Gateway(网关) remote](/zh/gateway/remote)。
    节点：[Nodes](/zh/nodes)，[Nodes CLI](/zh/cli/nodes)。

  </Accordion>

  <Accordion title="我可以让 OpenClaw 更新自己吗？">
    简短回答：**可行，但不推荐**。更新流程可能会重启
    Gateway(网关)（这会断开活动会话），可能需要干净的 git checkout，并且
    可能会提示确认。更安全的方法：以操作员身份从 shell 运行更新。

    使用 CLI：

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel stable|beta|dev
    openclaw update --tag <dist-tag|version>
    openclaw update --no-restart
    ```

    如果你必须通过代理自动执行：

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    文档：[Update](/zh/cli/update)，[Updating](/zh/install/updating)。

  </Accordion>

  <Accordion title="新手引导实际上做了什么？">
    `openclaw onboard` 是推荐的设置路径。在**本地模式** 下，它会引导您完成以下步骤：

    - **模型/认证设置**（提供商 OAuth、API 密钥、Anthropic setup-token，以及本地模型选项如 LM Studio）
    - **工作区** 位置 + 引导文件
    - **Gateway(网关)设置**（绑定/端口/认证/tailscale）
    - **渠道**（WhatsApp、Telegram、Discord、Mattermost、Signal、iMessage，以及打包的渠道插件如 QQ Bot）
    - **守护进程安装**（macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd 用户单元）
    - **健康检查** 和 **技能** 选择

    如果您配置的模型未知或缺少认证，它也会发出警告。

  </Accordion>

  <Accordion title="运行此程序需要 Claude 或 OpenAI 订阅吗？">
    不需要。您可以使用 **API 密钥**（Anthropic/OpenAI/其他）或**仅限本地的模型** 来运行 OpenClaw，这样您的数据将保留在您的设备上。订阅（Claude Pro/Max 或 OpenAI Codex）是验证这些提供商的可选方式。

    对于 OpenClaw 中的 Anthropic，实际的划分是：

    - **Anthropic API 密钥**：正常的 Anthropic API 计费
    - **OpenClaw 中的 Claude CLI / Claude 订阅认证**：Anthropic 员工告诉我们此使用方式再次被允许，除非 Anthropic 发布新政策，否则 OpenClaw 将 `claude -p` 的使用视为此集成的许可用法

    对于长期运行的网关主机，Anthropic API 密钥仍然是更可预测的设置方式。OpenAI Codex OAuth 明确支持像 OpenClaw 这样的外部工具。

    OpenClaw 还支持其他托管式订阅选项，包括 **Qwen Cloud Coding Plan**、**MiniMax Coding Plan** 和 **Z.AI / GLM Coding Plan**。

    文档：[Anthropic](/zh/providers/anthropic)、[OpenAI](/zh/providers/openai)、
    [Qwen Cloud](/zh/providers/qwen)、
    [MiniMax](/zh/providers/minimax)、[GLM Models](/zh/providers/glm)、
    [Local models](/zh/gateway/local-models)、[Models](/zh/concepts/models)。

  </Accordion>

  <Accordion title="我可以在没有 API 密钥的情况下使用 Claude Max 订阅吗？">
    是的。

    Anthropic 员工告诉我们，OpenClaw 风格的 Claude CLI 使用再次被允许，因此除非 Anthropic 发布新政策，否则 OpenClaw 将 Claude 订阅身份验证和 `claude -p` 使用视为对该集成的认可。如果您想要最可预测的服务器端设置，请改用 Anthropic API 密钥。

  </Accordion>

  <Accordion title="你们是否支持 Claude 订阅身份验证（Claude Pro 或 Max）？">
    是的。

    Anthropic 员工告诉我们，这种使用再次被允许，因此除非 Anthropic 发布新政策，否则 OpenClaw 将 CLI 复用和 `claude -p` 使用视为对该集成的认可。

    Anthropic 设置令牌（setup-token）仍然作为受支持的 OpenClaw 令牌路径可用，但现在 OpenClaw 更倾向于 Claude CLI 复用和 `claude -p`（如果可用）。对于生产或多用户工作负载，Anthropic API 密钥身份验证仍然是更安全、更可预测的选择。如果您想要 OpenClaw 中其他类似订阅的托管选项，请参阅 [OpenAI](/zh/providers/openai)、[Qwen / Model
    Cloud](/zh/providers/qwen)、[MiniMax](/zh/providers/minimax) 和 [GLM
    Models](/zh/providers/glm)。

  </Accordion>

</AccordionGroup>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>

<AccordionGroup>
  <Accordion title="为什么我会收到来自 Anthropic 的 HTTP 429 rate_limit_error 错误？">
    这意味着您的 **Anthropic 配额/速率限制** 在当前时间窗口内已耗尽。如果您使用的是 **Claude CLI**，请等待时间窗口重置或升级您的计划。如果您使用的是 **Anthropic API 密钥**，请检查 Anthropic 控制台中的使用情况/计费信息，并根据需要提高限制。

    如果消息特别显示为：
    `Extra usage is required for long context requests`，则表示该请求正在尝试使用 Anthropic 的 1M 上下文测试版 (`context1m: true`)。这仅在您的凭据符合长上下文计费条件时才有效（API 密钥计费或启用了额外使用量的 OpenClaw Claude 登录路径）。

    提示：设置一个**备用模型 (fallback 模型)**，以便在提供商受限时 OpenClaw 可以继续回复。请参阅 [模型](/zh/cli/models)、[OAuth](/zh/concepts/oauth) 和 [/gateway/故障排除#anthropic-429-extra-usage-required-for-long-context](/zh/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

<Accordion title="是否支持 AWS Bedrock？">
  是的。OpenClaw 捆绑了 **Amazon Bedrock (Converse)** 提供商。当存在 AWS 环境标记时，OpenClaw 可以自动发现流式/文本 Bedrock 目录并将其合并为隐式 `amazon-bedrock` 提供商；否则，您可以显式启用 `plugins.entries.amazon-bedrock.config.discovery.enabled` 或添加手动提供商条目。请参阅 [Amazon Bedrock](/zh/providers/bedrock) 和 [模型提供商](/zh/providers/models)。如果您更喜欢托管密钥流程，在 Bedrock
  前面使用 OpenAI 兼容的代理仍然是一个有效的选项。
</Accordion>

<Accordion title="Codex 认证是如何工作的？">
  OpenClaw 通过 OAuth（ChatGPT 登录）支持 **OpenAI Code (Codex)**。对于默认的 PI 运行器，使用 `openai-codex/gpt-5.5` 进行 Codex OAuth。使用 `openai/gpt-5.5` 进行直接的 OpenAI API 密钥访问。GPT-5.5 还可以通过 `openai-codex/gpt-5.5` 使用订阅/OAuth，或使用 `openai/gpt-5.5` 和 `agentRuntime.id: "codex"` 运行原生 Codex 应用服务器。 请参阅 [模型提供商](/zh/concepts/model-providers) 和 [新手引导
  (CLI)](/zh/start/wizard)。
</Accordion>

  <Accordion title="为什么 OpenClaw 仍然提到 openai-codex？">
    `openai-codex` 是 ChatGPT/Codex OAuth 的提供商和认证配置文件 ID。
    它也是 Codex OAuth 的显式 PI 模型前缀：

    - `openai/gpt-5.5` = PI 中当前的直接 OpenAI API 密钥路由
    - `openai-codex/gpt-5.5` = PI 中的 Codex OAuth 路由
    - `openai/gpt-5.5` + `agentRuntime.id: "codex"` = 原生 Codex 应用服务器路由
    - `openai-codex:...` = 认证配置文件 ID，不是模型引用

    如果您想要直接的 OpenAI Platform 计费/限制路径，请设置
    `OPENAI_API_KEY`。如果您想要 ChatGPT/Codex 订阅认证，请使用
    `openclaw models auth login --provider openai-codex` 登录，并在 PI 运行中使用
    `openai-codex/*` 模型引用。

  </Accordion>

  <Accordion title="为什么 Codex OAuth 限制可能与 ChatGPT 网页版不同？">
    Codex OAuth 使用由 OpenAI 管理的、取决于计划的配额窗口。实际上，
    这些限制可能与 ChatGPT 网站/应用的体验不同，即使两者都关联到同一个账户。

    OpenClaw 可以在 `openclaw models status` 中显示当前可见的提供商使用情况/配额窗口，但它不会将 ChatGPT 网页版的权益转换或标准化为直接 API 访问。如果您想要直接的 OpenAI Platform
    计费/限制路径，请使用带有 API 密钥的 `openai/*`。

  </Accordion>

  <Accordion title="是否支持 OpenAI 订阅身份验证 (Codex OAuth)？">
    是的。OpenClaw 完全支持 **OpenAI Code (Codex) 订阅 OAuth**。
    OpenAI 明确允许在像 OAuth 这样的外部工具/工作流中使用订阅 OpenClaw。新手引导可以为您运行 OAuth 流程。

    参见 [OAuth](/zh/concepts/oauth)、[模型提供商](/zh/concepts/model-providers) 和 [新手引导 (CLI)](/zh/start/wizard)。

  </Accordion>

  <Accordion title="如何设置 Gemini CLI OAuth？">
    Gemini CLI 使用的是 **插件认证流程**，而不是在 `openclaw.json` 中使用客户端 ID 或密钥。

    步骤如下：

    1. 在本地安装 Gemini CLI，以便 `gemini` 位于 `PATH` 中
       - Homebrew：`brew install gemini-cli`
       - npm：`npm install -g @google/gemini-cli`
    2. 启用插件：`openclaw plugins enable google`
    3. 登录：`openclaw models auth login --provider google-gemini-cli --set-default`
    4. 登录后的默认模型：`google-gemini-cli/gemini-3-flash-preview`
    5. 如果请求失败，请在网关主机上设置 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`

    这会将 OAuth 令牌存储在网关主机的认证配置文件中。详情：[模型提供商](/zh/concepts/model-providers)。

  </Accordion>

<Accordion title="使用本地模型进行随意聊天可以吗？">通常不可以。OpenClaw 需要大上下文和强大的安全性；小显存会导致截断和泄露。如果必须使用，请在本地运行您能运行的**最大**模型构建版本 (LM Studio)，并参阅 [/gateway/local-models](/zh/gateway/local-models)。较小/量化的模型会增加提示注入风险 - 参见 [安全](/zh/gateway/security)。</Accordion>

<Accordion title="如何将托管模型流量保留在特定区域？">选择区域固定的端点。OpenRouter 为 MiniMax、Kimi 和 GLM 提供了美国托管的选项；选择美国托管的变体以将数据保留在该区域内。您仍然可以通过使用 `models.mode: "merge"` 将 Anthropic/OpenAI 与这些列在一起，以便在遵守您选择的区域性提供商的同时保持备用选项可用。</Accordion>

  <Accordion title="我必须购买 Mac Mini 才能安装它吗？">
    不。OpenClaw 运行于 macOS 或 Linux（Windows 通过 WSL2）。Mac mini 是可选的 - 有些人购买它作为常驻主机，但小型 VPS、家庭服务器或 Raspberry Pi 级别的设备也可以。

    您只需要 Mac 用于 **仅限 macOS 的工具**。对于 iMessage，请使用 [BlueBubbles](/zh/channels/bluebubbles)（推荐）- BlueBubbles 服务器在任何 Mac 上运行，而 Gateway(网关) 可以在 Linux 或其他地方运行。如果您想要其他仅限 macOS 的工具，请在 Mac 上运行 Gateway(网关) 或配对 macOS 节点。

    文档：[BlueBubbles](/zh/channels/bluebubbles)，[节点](/zh/nodes)，[Mac 远程模式](/zh/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我需要 Mac mini 来支持 iMessage 吗？">
    您需要一台登录了 Messages 的 **macOS 设备**。它 **不** 必须是 Mac mini - 任何 Mac 都可以。**使用 [BlueBubbles](/zh/channels/bluebubbles)**（推荐）用于 iMessage - BlueBubbles 服务器在 macOS 上运行，而 Gateway(网关) 可以在 Linux 或其他地方运行。

    常见设置：

    - 在 Gateway(网关)/VPS 上运行 Linux，并在任何登录了 Messages 的 Mac 上运行 BlueBubbles 服务器。
    - 如果您想要最简单的单机设置，请在 Mac 上运行所有内容。

    文档：[BlueBubbles](/zh/channels/bluebubbles)，[节点](/zh/nodes)，
    [Mac 远程模式](/zh/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我购买 Mac mini 来运行 OpenClaw，我可以将其连接到我的 MacBook Pro 吗？">
    是的。**Mac mini 可以运行 Gateway(网关)**，您的 MacBook Pro 可以作为 **节点**（ companion device）连接。节点不运行 Gateway(网关) - 它们提供额外的功能，如该设备上的屏幕/摄像头/画布和 `system.run`。

    常见模式：

    - Gateway(网关) 位于 Mac mini 上（常开）。
    - MacBook Pro 运行 macOS 应用程序或节点主机并配对到 Gateway(网关)。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 来查看它。

    文档：[节点](/zh/nodes)，[节点 CLI](/zh/cli/nodes)。

  </Accordion>

  <Accordion title="我可以使用 Bun 吗？">
    **不建议**使用 Bun。我们会遇到运行时错误，特别是在 Bun 和 Bun 方面。
    请使用 **Node** 以获得稳定的网关。

    如果您仍然想尝试使用 Bun，请在非生产环境网关上进行操作，
    且不要涉及 WhatsApp/Telegram。

  </Accordion>

  <Accordion title="Telegram：allowFrom 中填什么？">
    `channels.telegram.allowFrom` 是 **发送者的 Telegram 用户 ID**（数字）。它不是机器人的用户名。

    设置仅要求提供数字用户 ID。如果您在配置中已有旧版的 `@username` 条目，`openclaw doctor --fix` 可以尝试解析它们。

    更安全的方式（无第三方机器人）：

    - 给您的机器人发私信，然后运行 `openclaw logs --follow` 并查看 `from.id`。

    官方 Bot API：

    - 给您的机器人发私信，然后调用 `https://api.telegram.org/bot<bot_token>/getUpdates` 并查看 `message.from.id`。

    第三方方式（隐私性较差）：

    - 给 `@userinfobot` 或 `@getidsbot` 发私信。

    请参阅 [/channels/telegram](/zh/channels/telegram#access-control-and-activation)。

  </Accordion>

<Accordion title="多个人可以通过不同的 WhatsApp 实例使用一个 OpenClaw 号码吗？">
  是的，通过 **多智能体路由**。将每个发送者的 WhatsApp **私信**（peer `kind: "direct"`，发送者 E.164 格式如 `+15551234567`）绑定到不同的 `agentId`，以便每个人获得自己的工作区和会话存储。回复仍然来自 **同一个 WhatsApp 账号**，且私信访问控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）是针对每个 WhatsApp 账号全局生效的。请参阅 [多智能体路由](/zh/concepts/multi-agent) 和
  [WhatsApp](/zh/channels/whatsapp)。
</Accordion>

<Accordion title="我可以同时运行“快速聊天”代理和“Opus 编码”代理吗？">可以。使用多代理路由：为每个代理指定其默认模型，然后将入站路由（提供商帐户或特定对等方）绑定到每个代理。配置示例位于[多代理路由](/zh/concepts/multi-agent)。另请参阅[模型](/zh/concepts/models)和[配置](/zh/gateway/configuration)。</Accordion>

  <Accordion title="Homebrew 可以在 Linux 上运行吗？">
    可以。Homebrew 支持 Linux (Linuxbrew)。快速设置：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果您通过 systemd 运行 OpenClaw，请确保服务 PATH 包含 `/home/linuxbrew/.linuxbrew/bin`（或您的 brew 前缀），以便 `brew` 安装的工具在非登录 shell 中解析。
    最新版本还会在 Linux systemd 服务上预置常见的用户 bin 目录（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），并在设置时遵守 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可黑客修改的 git 安装与 npm 安装的区别">
    - **可黑客修改 安装：** 完整的源代码检出，可编辑，最适合贡献者。
      您可以在本地运行构建并修补代码/文档。
    - **npm 安装：** 全局 CLI 安装，不包含代码仓库，最适合“直接运行”的情况。
      更新来自 npm dist-tags。

    文档：[入门指南](/zh/start/getting-started)、[更新](/zh/install/updating)。

  </Accordion>

  <Accordion title="稍后我可以在 npm 和 git 安装之间切换吗？">
    是的。当 OpenClaw 已安装时使用 `openclaw update --channel ...`。
    这**不会删除你的数据**——它仅更改 OpenClaw 代码安装。
    你的状态（`~/.openclaw`）和工作区（`~/.openclaw/workspace`）保持不变。

    从 npm 切换到 git：

    ```bash
    openclaw update --channel dev
    ```

    从 git 切换到 npm：

    ```bash
    openclaw update --channel stable
    ```

    添加 `--dry-run` 以预先预览计划中的模式切换。更新程序运行 Doctor 后续检查，为目标渠道刷新插件源，并重启网关，除非你传递 `--no-restart`。

    安装程序也可以强制任一模式：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
    ```

    备份提示：请参阅 [备份策略](#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="我应该将 Gateway(网关) 运行在笔记本电脑还是 VPS 上？">
    简短回答：**如果你需要 24/7 的可靠性，请使用 VPS**。如果你希望最低的阻力，并且不介意睡眠/重启，请在本地运行。

    **笔记本电脑（本地 Gateway(网关)）**

    - **优点：** 无服务器成本，直接访问本地文件，实时浏览器窗口。
    - **缺点：** 睡眠/网络掉线 = 断开连接，操作系统更新/重启会中断，必须保持唤醒。

    **VPS / 云端**

    - **优点：** 始终在线，网络稳定，无笔记本电脑睡眠问题，更容易保持运行。
    - **缺点：** 通常以无头模式运行（使用截图），仅限远程文件访问，你必须通过 SSH 进行更新。

    **OpenClaw 特定说明：** WhatsApp/Telegram/Slack/Mattermost/Discord 在 VPS 上均可正常工作。唯一的真正权衡是**无头浏览器**与可见窗口的区别。请参阅 [浏览器](/zh/tools/browser)。

    **推荐默认设置：** 如果你之前遇到过网关断开连接的情况，请使用 VPS。当你正在积极使用 Mac 并希望访问本地文件或使用可见浏览器进行 UI 自动化时，本地运行非常棒。

  </Accordion>

  <Accordion title="在专用机器上运行 OpenClaw 有多重要？">
    非必须，但**出于可靠性和隔离性建议这样做**。

    - **专用主机（VPS/Mac mini/Pi）：** 始终在线，睡眠/重启中断较少，权限更清晰，更容易保持运行。
    - **共享笔记本电脑/台式机：** 用于测试和活跃使用完全没问题，但在机器睡眠或更新时预期会有暂停。

    如果您想两全其美，请将 Gateway(网关)保留在专用主机上，并将您的笔记本电脑作为本地屏幕/摄像头/执行工具的**节点**进行配对。请参阅 [Nodes](/zh/nodes)。
    有关安全指南，请阅读 [Security](/zh/gateway/security)。

  </Accordion>

  <Accordion title="最低 VPS 要求和建议的操作系统是什么？">
    OpenClaw 是轻量级的。对于基本的 Gateway(网关) + 一个聊天渠道：

    - **绝对最低配置：** 1 vCPU，1GB RAM，约 500MB 磁盘空间。
    - **推荐配置：** 1-2 vCPU，2GB 或更多 RAM 以留有余量（日志、媒体、多个渠道）。节点工具和浏览器自动化可能会消耗较多资源。

    操作系统：使用 **Ubuntu LTS**（或任何现代 Debian/Ubuntu）。Linux 安装路径在那里经过了最充分的测试。

    文档：[Linux](/zh/platforms/linux)，[VPS 托管](/zh/vps)。

  </Accordion>

  <Accordion title="我可以在虚拟机中运行 OpenClaw 吗，有什么要求？">
    是的。将虚拟机视同 VPS：它需要始终在线、可访问，并且拥有足够的 RAM 来运行 Gateway(网关)以及您启用的任何渠道。

    基本指导原则：

    - **绝对最低配置：** 1 vCPU，1GB RAM。
    - **推荐配置：** 如果您运行多个渠道、浏览器自动化或媒体工具，建议使用 2GB 或更多 RAM。
    - **操作系统：** Ubuntu LTS 或其他现代 Debian/Ubuntu。

    如果您使用的是 Windows，**WSL2 是最简单的虚拟机风格设置**，并且具有最佳的工具兼容性。请参阅 [Windows](/zh/platforms/windows)，[VPS 托管](/zh/vps)。
    如果您在虚拟机中运行 macOS，请参阅 [macOS VM](/zh/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 相关

- [常见问题](/zh/help/faq) — 主要常见问题（模型、会话、gateway、安全、更多）
- [安装概述](/zh/install)
- [入门指南](/zh/start/getting-started)
- [故障排除](/zh/help/troubleshooting)
