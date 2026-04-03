---
summary: "关于 OpenClaw 设置、配置和使用的常见问题"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常见问题"
---

# 常见问题

针对现实世界设置（本地开发、VPS、多智能体、OAuth/API 密钥、模型故障转移）的快速解答及更深入的故障排除。有关运行时诊断，请参阅 [Troubleshooting](/en/gateway/troubleshooting)。有关完整的配置参考，请参阅 [Configuration](/en/gateway/configuration)。

## 出现故障时的前 60 秒

1. **快速状态（首先检查）**

   ```bash
   openclaw status
   ```

   快速本地摘要：操作系统 + 更新、网关/服务可达性、代理/会话、提供商配置 + 运行时问题（当网关可达时）。

2. **可粘贴的报告（可安全分享）**

   ```bash
   openclaw status --all
   ```

   具有日志尾随的只读诊断（令牌已编辑）。

3. **守护进程 + 端口状态**

   ```bash
   openclaw gateway status
   ```

   显示监督程序运行时与 RPC 可达性、探测目标 URL 以及服务可能使用的配置。

4. **深度探测**

   ```bash
   openclaw status --deep
   ```

   运行网关健康检查 + 提供商探测（需要可访问的网关）。请参阅 [Health](/en/gateway/health)。

5. **跟踪最新日志**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 宕机，请回退到：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   文件日志与服务日志是分开的；请参阅 [Logging](/en/logging) 和 [Troubleshooting](/en/gateway/troubleshooting)。

6. **运行医生（修复）**

   ```bash
   openclaw doctor
   ```

   修复/迁移配置/状态 + 运行健康检查。请参阅 [Doctor](/en/gateway/doctor)。

7. **Gateway(网关) 快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向正在运行的网关请求完整快照（仅限 WS）。请参阅 [Health](/en/gateway/health)。

## 快速开始和首次运行设置

<AccordionGroup>
  <Accordion title="I am stuck, fastest way to 解决问题">
    使用一个能够**查看你的机器**的本地 AI 代理。这比在 Discord 中询问要有效得多，因为大多数“我卡住了”的情况都是**本地配置或环境问题**，远程协助者无法检查。

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    这些工具可以读取代码仓库、运行命令、检查日志，并帮助修复你的机器级设置（PATH、服务、权限、认证文件）。通过可破解的 安装方式，为它们提供**完整的源代码检出**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这会**从 git 检出**安装 OpenClaw，因此代理可以读取代码和文档，并对你正在运行的确切版本进行推理。你以后可以通过不带 `--install-method git` 重新运行安装程序来随时切换回稳定版。

    提示：要求代理**计划并监督**修复过程（逐步进行），然后仅执行必要的命令。这可以保持更改较小且易于审查。

    如果你发现了真正的错误或修复方法，请在 GitHub 上提交 issue 或发送 PR：
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
    - `openclaw models status`：检查提供商认证 + 模型可用性。
    - `openclaw doctor`：验证并修复常见的配置/状态问题。

    其他有用的 CLI 检查：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    快速调试循环：[First 60 seconds if something is broken](#first-60-seconds-if-something-is-broken)。
    安装文档：[Install](/en/install)、[Installer flags](/en/install/installer)、[Updating](/en/install/updating)。

  </Accordion>

  <Accordion title="安装和设置 OpenClaw 的推荐方式">
    该仓库建议从源代码运行并使用新手引导：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    向导还可以自动构建 UI 资源。完成新手引导后，通常在端口 **18789** 上运行 Gateway(网关)。

    从源代码（贡献者/开发人员）：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build # auto-installs UI deps on first run
    openclaw onboard
    ```

    如果您还没有全局安装，请通过 `pnpm openclaw onboard` 运行它。

  </Accordion>

<Accordion title="新手引导后如何打开仪表板？">向导会在新手引导完成后立即在浏览器中打开一个干净的（未令牌化的）仪表板 URL，并在摘要中打印该链接。请保持该标签页打开；如果未启动，请在同一台机器上复制/粘贴打印出的 URL。</Accordion>

  <Accordion title="如何在本地主机与远程环境上验证仪表板（令牌）？">
    **本地主机（同一台机器）：**

    - 打开 `http://127.0.0.1:18789/`。
    - 如果它要求进行身份验证，请将 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）中的令牌粘贴到 Control UI 设置中。
    - 从网关主机获取它：`openclaw config get gateway.auth.token`（或者生成一个：`openclaw doctor --generate-gateway-token`）。

    **不在本地主机上：**

    - **Tailscale Serve**（推荐）：保持绑定回环，运行 `openclaw gateway --tailscale serve`，打开 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 是 `true`，则身份标头满足 Control UI/WebSocket 身份验证（无需令牌，假设网关主机受信任）；HTTP API 仍需要令牌/密码。
    - **Tailnet bind**：运行 `openclaw gateway --bind tailnet --token "<token>"`，打开 `http://<tailscale-ip>:18789/`，在仪表板设置中粘贴令牌。
    - **SSH tunnel**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/` 并将令牌粘贴到 Control UI 设置中。

    有关绑定模式和身份验证详细信息，请参阅 [Dashboard](/en/web/dashboard) 和 [Web surfaces](/en/web)。

  </Accordion>

  <Accordion title="我需要什么运行时？">
    需要 Node **>= 22**。推荐使用 `pnpm`。对于 Gateway(网关)，**不推荐**使用 Bun。
  </Accordion>

  <Accordion title="它能在 Raspberry Pi 上运行吗？">
    可以。Gateway(网关) 非常轻量 - 文档列出的 **512MB-1GB RAM**、**1 核**和大约 **500MB**
    磁盘空间足以满足个人使用，并注明 **Raspberry Pi 4 可以运行它**。

    如果你想要额外的余量（日志、媒体、其他服务），**建议 2GB**，但这
    并不是硬性最低要求。

    提示：一个小型的 Pi/VPS 可以托管 Gateway(网关)，并且你可以在你的笔记本电脑/手机上配对 **节点**
    用于本地屏幕/摄像头/画布或命令执行。参见 [节点](/en/nodes)。

  </Accordion>

  <Accordion title="关于 Raspberry Pi 安装有什么技巧吗？">
    简短回答：可以使用，但要预期会有一些粗糙的边缘。

    - 使用 **64 位** 操作系统并保持 Node >= 22。
    - 首选 **可破解 (git) 安装**，这样你可以查看日志并快速更新。
    - 首先不启用 channels/skills 启动，然后逐个添加它们。
    - 如果你遇到奇怪的二进制问题，这通常是一个 **ARM 兼容性** 问题。

    文档：[Linux](/en/platforms/linux)，[安装](/en/install)。

  </Accordion>

  <Accordion title="它卡在唤醒我的朋友 / 新手引导无法孵化。现在怎么办？">
    该屏幕取决于 Gateway(网关) 是否可达以及是否已通过身份验证。TUI 也会在
    第一次孵化时自动发送“Wake up, my friend!”。如果你看到那行文字却**没有回复**
    并且 token 数保持在 0，则代理从未运行。

    1. 重启 Gateway(网关)：

    ```bash
    openclaw gateway restart
    ```

    2. 检查状态 + 认证：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. 如果仍然挂起，请运行：

    ```bash
    openclaw doctor
    ```

    如果 Gateway(网关) 是远程的，请确保隧道/Tailscale 连接已启动，并且 UI
    指向正确的 Gateway(网关)。参见 [远程访问](/en/gateway/remote)。

  </Accordion>

  <Accordion title="我可以将我的设置迁移到新机器（Mac mini）而无需重新进行新手引导吗？">
    可以。复制 **state 目录**和**工作空间**，然后运行一次 Doctor。只要你复制**这两个**位置，这就能让你的 bot 保持“完全一致”（内存、会话历史、认证和渠道状态）：

    1. 在新机器上安装 OpenClaw。
    2. 从旧机器复制 `$OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）。
    3. 复制你的工作空间（默认：`~/.openclaw/workspace`）。
    4. 运行 `openclaw doctor` 并重启 Gateway(网关) 服务。

    这将保留配置、认证配置文件、WhatsApp 凭据、会话和内存。如果你处于远程模式，请记住网关主机拥有会话存储和工作空间。

    **重要提示：** 如果你仅将工作空间 commit/push 到 GitHub，你备份的是**内存 + 引导文件**，但**不包括**会话历史或认证。这些位于 `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    相关内容：[迁移](/en/install/migrating)、[文件存储位置](#where-things-live-on-disk)、
    [Agent 工作空间](/en/concepts/agent-workspace)、[Doctor](/en/gateway/doctor)、
    [远程模式](/en/gateway/remote)。

  </Accordion>

  <Accordion title="我在哪里可以看到最新版本的更新内容？">
    查看 GitHub 更新日志：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新的条目位于顶部。如果顶部部分标记为 **Unreleased**，则下一个带日期的部分是最新发布的版本。条目按**亮点**、**更改**和**修复**分组（并在需要时加上文档/其他部分）。

  </Accordion>

  <Accordion title="无法访问 docs.openclaw.ai（SSL 错误）">
    某些 Comcast/Xfinity 连接通过 Xfinity 高级安全功能错误地阻止了 `docs.openclaw.ai`。请禁用它或将 `docs.openclaw.ai` 加入允许列表，然后重试。
    请通过此处报告来帮助我们解除阻止：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果你仍然无法访问该站点，文档在 GitHub 上有镜像：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Stable 和 Beta 之间的区别">
    **Stable** 和 **beta** 是 **npm dist-tags**，不是单独的代码行：

    - `latest` = stable（稳定版）
    - `beta` = 用于测试的早期构建

    我们将构建发布到 **beta**，进行测试，一旦构建稳定，我们就将该版本**提升到 `latest`**。这就是 beta 和 stable 可以指向**相同版本**的原因。

    查看更改内容：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    关于单行安装命令以及 beta 和 dev 之间的区别，请参见下面的折叠面板。

  </Accordion>

  <Accordion title="如何安装 beta 版本，它与 dev 有什么区别？">
    **Beta** 是 npm dist-tag `beta`（可能匹配 `latest`）。
    **Dev** 是 `main` (git) 的移动头部；发布时，它使用 npm dist-tag `dev`。

    单行命令（macOS/Linux）：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安装程序（PowerShell）：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多详情：[Development channels](/en/install/development-channels)（开发渠道）和 [Installer flags](/en/install/installer)（安装程序标志）。

  </Accordion>

  <Accordion title="如何试用最新版本？">
    两种选择：

    1. **Dev 渠道（git checkout）：**

    ```bash
    openclaw update --channel dev
    ```

    这会切换到 `main` 分支并从源代码更新。

    2. **可修改安装（来自安装程序站点）：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这会给你一个可以编辑的本地仓库，然后通过 git 更新。

    如果你喜欢手动进行干净的克隆，请使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文档：[Update](/en/cli/update)（更新），[Development channels](/en/install/development-channels)（开发渠道），
    [Install](/en/install)（安装）。

  </Accordion>

  <Accordion title="安装和新手引导通常需要多长时间？">
    粗略指南：

    - **安装：** 2-5 分钟
    - **新手引导：** 5-15 分钟，具体取决于您配置的渠道/模型数量

    如果卡住，请使用 [Installer stuck](#quick-start-and-first-run-setup)
    以及 [I am stuck](#quick-start-and-first-run-setup) 中的快速调试循环。

  </Accordion>

  <Accordion title="安装程序卡住了？如何获取更多反馈？">
    使用 **详细输出** 重新运行安装程序：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    带有详细输出的 Beta 安装：

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

    更多选项：[Installer flags](/en/install/installer)。

  </Accordion>

  <Accordion title="Windows 安装提示未找到 git 或无法识别 openclaw">
    两个常见的 Windows 问题：

    **1) npm 错误 spawn git / git not found**

    - 安装 **Git for Windows** 并确保 `git` 在您的 PATH 环境变量中。
    - 关闭并重新打开 PowerShell，然后重新运行安装程序。

    **2) openclaw is not recognized after install**

    - 您的 npm 全局 bin 文件夹不在 PATH 中。
    - 检查路径：

      ```powershell
      npm config get prefix
      ```

    - 将该目录添加到您的用户 PATH（在 Windows 上不需要 `\bin` 后缀；在大多数系统上是 `%AppData%\npm`）。
    - 更新 PATH 后关闭并重新打开 PowerShell。

    如果您希望获得最流畅的 Windows 设置体验，请使用 **WSL2** 而不是原生 Windows。
    文档：[Windows](/en/platforms/windows)。

  </Accordion>

  <Accordion title="Windows exec 输出显示乱码中文 - 我该怎么办？">
    这通常是原生 Windows shell 上控制台代码页不匹配导致的。

    症状：

    - `system.run`/`exec` 输出将中文渲染为乱码 (mojibake)
    - 同一命令在另一个终端配置文件中看起来正常

    PowerShell 中的快速解决方法：

    ```powershell
    chcp 65001
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ```

    然后重启 Windows 并重试您的命令：

    ```powershell
    openclaw gateway restart
    ```

    如果您在最新的 Gateway(网关) 上仍然遇到此问题，请在此处跟踪/报告：

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="文档没有回答我的问题 - 如何获得更好的答案？">
    使用 **hackable (git) install** 安装，以便您在本地拥有完整的源代码和文档，然后
    _从该文件夹_ 向您的机器人（或 Claude/Codex）提问，以便它可以阅读代码库并准确回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多详情：[安装](/en/install) 和 [安装程序标志](/en/install/installer)。

  </Accordion>

  <Accordion title="如何在 OpenClaw 上安装 Linux？">
    简短回答：遵循 Linux 指南，然后运行新手引导。

    - Linux 快速路径 + 服务安装：[Linux](/en/platforms/linux)。
    - 完整演练：[入门指南](/en/start/getting-started)。
    - 安装程序 + 更新：[安装与更新](/en/install/updating)。

  </Accordion>

  <Accordion title="如何在 VPS 上安装 OpenClaw？">
    任何 Linux VPS 均可。在服务器上安装，然后使用 SSH/Tailscale 连接到 Gateway(网关)。

    指南：[exe.dev](/en/install/exe-dev)、[Hetzner](/en/install/hetzner)、[Fly.io](/en/install/fly)。
    远程访问：[Gateway(网关) remote](/en/gateway/remote)。

  </Accordion>

  <Accordion title="云端/VPS 安装指南在哪里？">
    我们维护了一个涵盖常见提供商的**托管中心**。选择一个并按照指南操作：

    - [VPS 托管](/en/vps) (所有提供商汇总)
    - [Fly.io](/en/install/fly)
    - [Hetzner](/en/install/hetzner)
    - [exe.dev](/en/install/exe-dev)

    云端工作原理：**Gateway(网关) 运行在服务器上**，您通过
    控制UI（或 Gateway(网关)/SSH）从笔记本电脑/手机访问它。您的状态 + 工作区
    位于服务器上，因此请将主机视为真实来源并对其进行备份。

    您可以将**节点**（Mac/Tailscale/iOS/无头模式）配对到该云端 Gateway(网关)，以便在
    保持 Gateway(网关) 位于云端的同时，访问本地屏幕/相机/画布或在笔记本电脑上运行命令。

    中心：[Platforms](/en/platforms)。远程访问：[Gateway(网关) remote](/en/gateway/remote)。
    节点：[Nodes](/en/nodes)，[Nodes CLI](/en/cli/nodes)。

  </Accordion>

  <Accordion title="我可以要求 OpenClaw 更新自身吗？">
    简短回答：**可行，但不推荐**。更新流程可能会重启
    Gateway(网关)（这会断开当前会话），可能需要干净的 git checkout，并且
    可能会提示进行确认。更安全的做法：作为操作员从 shell 运行更新。

    使用 CLI：

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel stable|beta|dev
    openclaw update --tag <dist-tag|version>
    openclaw update --no-restart
    ```

    如果您必须通过代理进行自动化操作：

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    文档：[Update](/en/cli/update)，[Updating](/en/install/updating)。

  </Accordion>

  <Accordion title="新手引导实际上做了什么？">
    `openclaw onboard` 是推荐的设置路径。在 **本地模式** 下，它将引导您完成以下步骤：

    - **模型/认证设置**（支持提供商 OAuth/setup-token 流程和 API 密钥，以及 LM Studio 等本地模型选项）
    - **工作区**位置 + 引导文件
    - **Gateway(网关) 设置**（绑定/端口/认证/tailscale）
    - **提供商**（WhatsApp、Telegram、Discord、Mattermost (插件)、Signal、iMessage）
    - **守护进程安装**（macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd 用户单元）
    - **健康检查**和 **技能**选择

    如果您配置的模型未知或缺少认证，它也会发出警告。

  </Accordion>

  <Accordion title="运行此程序需要 Claude 或 OpenAI 订阅吗？">
    不需要。您可以使用 **API 密钥**（Anthropic/OpenAI/其他）或 **仅限本地的模型**运行 OpenClaw，这样您的数据将保留在您的设备上。订阅（Claude Pro/Max 或 OpenAI Codex）是认证这些提供商的可选方式。

    如果您选择 Anthropic 订阅认证，请自行决定是否使用它：
    过去，Anthropic 曾在 Claude Code 之外阻止某些订阅的使用。
    OpenAI Codex OAuth 明确支持 OpenClaw 等外部工具。

    文档：[Anthropic](/en/providers/anthropic)、[OpenAI](/en/providers/openai)、
    [本地模型](/en/gateway/local-models)、[模型](/en/concepts/models)。

  </Accordion>

  <Accordion title="我可以在没有 API 密钥的情况下使用 Claude Max 订阅吗？">
    是的。您可以使用 **setup-token** 或在网关主机上重用本地的 **Claude CLI**
    登录。

    Claude Pro/Max 订阅 **不包含 API 密钥**，因此这是
    订阅账户的技术路径。但这取决于您的决定：Anthropic
    过去曾阻止在 Claude Code 之外使用订阅。
    如果您希望为生产环境使用最清晰、最安全的支持路径，请使用 Anthropic API 密钥。

  </Accordion>

<Accordion title="Anthropic setup-token 认证是如何工作的？">
  `claude setup-token` 通过 Claude Code CLI 生成一个 **令牌字符串**（它在 Web 控制台中不可用）。您可以在 **任何机器**上运行它。在新手引导中选择 **Anthropic 令牌（粘贴 setup-token）** 或使用 `openclaw models auth paste-token --provider anthropic` 粘贴它。该令牌作为 **anthropic** 提供商的认证配置文件存储，并像 API 密钥一样使用（不会自动刷新）。更多详情：[OAuth](/en/concepts/oauth)。
</Accordion>

  <Accordion title="我在哪里可以找到 Anthropic 设置令牌？">
    它**不在** Anthropic 控制台中。设置令牌是由 **Claude Code Anthropic** 在**任何机器**上生成的：

    ```bash
    claude setup-token
    ```

    复制它打印出的令牌，然后在新手引导中选择 **Anthropic 令牌（粘贴设置令牌）**。如果您想在网关主机上运行它，请使用 `openclaw models auth setup-token --provider anthropic`。如果您在其他地方运行了 `claude setup-token`，请使用 `openclaw models auth paste-token --provider anthropic` 将其粘贴到网关主机上。参见 [CLI](/en/providers/anthropic)。

  </Accordion>

  <Accordion title="您是否支持 Claude 订阅身份验证（Claude Pro 或 Max）？">
    是的。您可以：

    - 使用一个 **设置令牌**
    - 使用 `openclaw models auth login --provider anthropic --method cli --set-default` 在网关主机上重用本地 **Claude CLI** 登录

    仍然支持设置令牌。当网关主机已经运行 Claude Code 时，Claude CLI 迁移会更简单。参见 [Anthropic](/en/providers/anthropic) 和 [OAuth](/en/concepts/oauth)。

    重要提示：这只是技术兼容性，并非政策保证。Anthropic 过去曾在 Claude Code 之外阻止了一些订阅使用。
    您需要决定是否使用它，并核实 Anthropic 的当前条款。
    对于生产环境或多用户工作负载，Anthropic API 密钥身份验证是更安全、更推荐的选择。

  </Accordion>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>
<Accordion title="为什么我会收到来自 Anthropic 的 HTTP 429 rate_limit_error 错误？">
这意味着您当前的 **Anthropic 配额/速率限制**已用尽。如果您使用的是 **Claude 订阅**（setup-token），请等待时间窗口重置或升级您的计划。如果您使用的是 **Anthropic API 密钥**，请检查 Anthropic 控制台中的使用/计费情况，并根据需要提高限制。

    如果消息具体为：
    `Extra usage is required for long context requests`，则说明请求正尝试使用
    Anthropic 的 1M 上下文测试版（`context1m: true`）。这仅在您的凭据符合长上下文计费条件时才有效（API 密钥计费或启用了额外使用的订阅）。

    提示：设置一个 **备用模型（fallback 模型）**，以便在提供商受到速率限制时，OpenClaw 可以继续回复。
    请参阅 [模型](/en/cli/models)、[OAuth](/en/concepts/oauth) 和
    [/gateway/故障排除#anthropic-429-extra-usage-required-for-long-context](/en/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

<Accordion title="支持 AWS Bedrock 吗？">是的 - 通过 pi-ai 的 **Amazon Bedrock (Converse)** 提供商进行**手动配置**。您必须在网关主机上提供 AWS 凭据/区域，并在模型配置中添加 Bedrock 提供商条目。请参阅 [Amazon Bedrock](/en/providers/bedrock) 和 [模型提供商](/en/providers/models)。如果您更喜欢托管密钥流程，在 Bedrock 前面使用一个兼容 OpenAI 的代理仍然是一个有效的选择。</Accordion>

<Accordion title="Codex 认证是如何工作的？">OpenClaw 通过 OpenAI（ChatGPT 登录）支持 **OAuth Code (Codex)**。新手引导可以运行 OAuth 流程，并在适当时将默认模型设置为 `openai-codex/gpt-5.4`。请参阅 [模型提供商](/en/concepts/model-providers) 和 [新手引导 (CLI)](/en/start/wizard)。</Accordion>

  <Accordion title="您支持 OpenAI 订阅身份验证 (Codex OAuth) 吗？">
    是的。OpenClaw 完全支持 **OpenAI Code (Codex) 订阅 OAuth**。
    OpenAI 明确允许在外部工具/工作流（如 OpenClaw）中使用订阅 OAuth。新手引导可以为您运行 OAuth 流程。

    请参阅 [OAuth](/en/concepts/oauth)、[Model providers](/en/concepts/model-providers) 和 [新手引导 (CLI)](/en/start/wizard)。

  </Accordion>

  <Accordion title="如何设置 Gemini CLI OAuth？">
    Gemini CLI 使用**插件身份验证流程**，而不是在 `openclaw.json` 中使用客户端 ID 或密钥。

    步骤：

    1. 启用插件：`openclaw plugins enable google`
    2. 登录：`openclaw models auth login --provider google-gemini-cli --set-default`

    这会将 OAuth 令牌存储在网关主机上的身份配置文件中。详情：[Model providers](/en/concepts/model-providers)。

  </Accordion>

<Accordion title="本地模型适合随意聊天吗？">通常不适合。OpenClaw 需要大上下文 + 强安全性；小显卡会截断内容并导致泄漏。如果必须使用，请在本地运行您能运行的**最大**模型版本 (LM Studio)，并参阅 [/gateway/local-models](/en/gateway/local-models)。较小/量化的模型会增加提示注入风险 - 请参阅 [Security](/en/gateway/security)。</Accordion>

<Accordion title="如何将托管模型流量保留在特定区域？">选择区域固定的端点。OpenRouter 为 MiniMax、Kimi 和 GLM 提供了美国托管的选项；选择美国托管的变体以将数据保留在区域内。您仍然可以通过使用 `models.mode: "merge"` 将 Anthropic/OpenAI 与这些模型列在一起，以便在选择区域提供商时保持备用选项可用。</Accordion>

  <Accordion title="我必须购买 Mac Mini 才能安装它吗？">
    不需要。OpenClaw 运行在 macOS 或 Linux 上（Windows 通过 WSL2）。Mac mini 是可选的——有些人购买它作为一直开启的主机，但小型 VPS、家庭服务器或 Raspberry Pi 级别的设备也可以。

    你只需要一台 Mac **来使用仅限 macOS 的工具**。对于 iMessage，请使用 [BlueBubbles](/en/channels/bluebubbles)（推荐）——BlueBubbles 服务器运行在任何 Mac 上，而 Gateway(网关) 可以运行在 Linux 或其他地方。如果你想使用其他仅限 macOS 的工具，请在 Mac 上运行 Gateway(网关) 或配对 macOS 节点。

    文档：[BlueBubbles](/en/channels/bluebubbles), [Nodes](/en/nodes), [Mac remote mode](/en/platforms/mac/remote).

  </Accordion>

  <Accordion title="为了支持 iMessage，我需要一台 Mac mini 吗？">
    你需要 **某个 macOS 设备** 登录到 Messages。它 **不必** 是 Mac mini——任何 Mac 都可以。**使用 [BlueBubbles](/en/channels/bluebubbles)**（推荐）来支持 iMessage——BlueBubbles 服务器运行在 macOS 上，而 Gateway(网关) 可以运行在 Linux 或其他地方。

    常见设置：

    - 在 Gateway(网关)/VPS 上运行 Linux，并在任何登录了 Messages 的 Mac 上运行 BlueBubbles 服务器。
    - 如果你想要最简单的单机设置，可以在 Mac 上运行所有内容。

    文档：[BlueBubbles](/en/channels/bluebubbles), [Nodes](/en/nodes),
    [Mac remote mode](/en/platforms/mac/remote).

  </Accordion>

  <Accordion title="如果我购买 Mac mini 来运行 OpenClaw，我可以将它连接到我的 MacBook Pro 吗？">
    可以。**Mac mini 可以运行 Gateway(网关)**，而你的 MacBook Pro 可以作为 **节点**（ companion 设备）连接。节点不运行 Gateway(网关)——它们提供额外的功能，如该设备上的屏幕/摄像头/画布和 `system.run`。

    常见模式：

    - Gateway(网关) 在 Mac mini 上（一直开启）。
    - MacBook Pro 运行 macOS 应用或节点主机并配对到 Gateway(网关)。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 查看它。

    文档：[Nodes](/en/nodes), [Nodes CLI](/en/cli/nodes).

  </Accordion>

  <Accordion title="可以使用 Bun 吗？">
    **不建议**使用 Bun。我们发现运行时存在错误，尤其是涉及 Bun 和 Bun 时。
    请使用 **Node** 以获得稳定的网关。

    如果您仍想尝试使用 WhatsApp，请在非生产环境的网关上
    进行，且不要使用 Telegram/Bun。

  </Accordion>

  <Accordion title="Telegram：allowFrom 中填什么？">
    `channels.telegram.allowFrom` 是**人类发送者的 Telegram 用户 ID**（数字）。它不是机器人的用户名。

    新手引导接受 `@username` 输入并将其解析为数字 ID，但 OpenClaw 授权仅使用数字 ID。

    更安全（无第三方机器人）：

    - 私信您的机器人，然后运行 `openclaw logs --follow` 并读取 `from.id`。

    官方 Bot API：

    - 私信您的机器人，然后调用 `https://api.telegram.org/bot<bot_token>/getUpdates` 并读取 `message.from.id`。

    第三方（隐私性较低）：

    - 私信 `@userinfobot` 或 `@getidsbot`。

    请参阅 [/channels/telegram](/en/channels/telegram#access-control-and-activation)。

  </Accordion>

<Accordion title="多个人可以使用同一个 WhatsApp 号码搭配不同的 OpenClaw 实例吗？">
  可以，通过**多代理路由**。将每个发送者的 WhatsApp **私信**（对端 `kind: "direct"`，发送者 E.164 例如 `+15551234567`）绑定到不同的 `agentId`，这样每个人都可以获得自己的工作区和会话存储。回复仍然来自**同一个 WhatsApp 账户**，且私信访问控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）对每个 WhatsApp 账户是全局的。请参阅 [Multi-Agent Routing](/en/concepts/multi-agent) 和
  [WhatsApp](/en/channels/whatsapp)。
</Accordion>

<Accordion title="我可以同时运行一个“快速聊天”代理和一个用于编程的“Opus”代理吗？">是的。使用多代理路由：为每个代理分配其自己的默认模型，然后将入站路由（提供商帐户或特定对等节点）绑定到每个代理。示例配置位于[多代理路由](/en/concepts/multi-agent)中。另请参阅[模型](/en/concepts/models)和[配置](/en/gateway/configuration)。</Accordion>

  <Accordion title="Homebrew 可以在 Linux 上运行吗？">
    是的。Homebrew 支持 Linux (Linuxbrew)。快速设置：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果你通过 systemd 运行 OpenClaw，请确保服务 PATH 包含 `/home/linuxbrew/.linuxbrew/bin`（或你的 brew 前缀），以便 `brew` 安装的工具在非登录 shell 中解析。
    最近的构建版本还会在 Linux systemd 服务上预先添加常见的用户 bin 目录（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），并在设置时遵守 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可黑客式的 git 安装与 npm 安装之间的区别">
    - **可黑客式 安装：** 完整的源代码检出，可编辑，最适合贡献者。
      你可以在本地运行构建并修补代码/文档。
    - **npm 安装：** 全局 CLI 安装，无仓库，最适合“直接运行”。
      更新来自 npm dist-tags。

    文档：[入门指南](/en/start/getting-started)、[更新](/en/install/updating)。

  </Accordion>

  <Accordion title="我以后可以在 npm 和 git 安装之间切换吗？">
    是的。安装另一种版本，然后运行 Doctor，以便 Gateway 服务指向新的入口点。
    这**不会删除您的数据**——它只更改 OpenClaw 代码安装。您的状态
    (`~/.openclaw`) 和工作区 (`~/.openclaw/workspace`) 保持不变。

    从 npm 到 git：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    openclaw doctor
    openclaw gateway restart
    ```

    从 git 到 npm：

    ```bash
    npm install -g openclaw@latest
    openclaw doctor
    openclaw gateway restart
    ```

    Doctor 会检测到 Gateway 服务入口点不匹配，并提供重写服务配置以匹配当前安装（在自动化中使用 `--repair`）。

    备份提示：请参阅 [备份策略](#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="我应该将 Gateway(网关) 运行在笔记本电脑还是 VPS 上？">
    简短的回答：**如果您想要 24/7 的可靠性，请使用 VPS**。如果您想要
    最低的摩擦力，并且不介意睡眠/重启，请在本地运行。

    **笔记本电脑（本地 Gateway(网关)）**

    - **优点：** 无服务器成本，直接访问本地文件，实时浏览器窗口。
    - **缺点：** 休眠/网络断开 = 连接中断，操作系统更新/重启会中断，必须保持唤醒。

    **VPS / 云**

    - **优点：** 始终在线，网络稳定，无笔记本电脑休眠问题，更容易保持运行。
    - **缺点：** 通常无头运行（使用截图），只能远程访问文件，必须通过 SSH 进行更新。

    **OpenClaw 特定说明：** WhatsApp/Telegram/Slack/Mattermost（插件）/Discord 都可以在 VPS 上正常运行。唯一真正的折衷是**无头浏览器**与可见窗口之间的选择。请参阅 [浏览器](/en/tools/browser)。

    **推荐的默认设置：** 如果您以前有过 Gateway(网关) 断开连接的情况，请使用 VPS。当您积极使用 Mac 并且想要本地文件访问或使用可见浏览器进行 UI 自动化时，本地运行非常棒。

  </Accordion>

  <Accordion title="在专用机器上运行 OpenClaw 有多重要？">
    非必需，但**为了可靠性和隔离性，建议这样做**。

    - **专用主机 (VPS/Mac mini/Pi)：** 始终在线，因睡眠/重启导致的干扰较少，权限更干净，更容易保持运行。
    - **共享笔记本电脑/台式机：** 完全适合测试和主动使用，但在机器睡眠或更新时可能会暂停。

    如果您想两全其美，请将 Gateway(网关) 保留在专用主机上，并将您的笔记本电脑作为本地屏幕/摄像头/执行工具的 **节点 (node)** 进行配对。请参阅 [节点 (Nodes)](/en/nodes)。
    有关安全指导，请阅读 [安全性 (Security)](/en/gateway/security)。

  </Accordion>

  <Accordion title="VPS 的最低要求是什么？推荐的操作系统是什么？">
    OpenClaw 是轻量级的。对于一个基本的 Gateway(网关) + 一个聊天渠道 (渠道)：

    - **绝对最低要求：** 1 vCPU，1GB RAM，约 500MB 磁盘空间。
    - **推荐配置：** 1-2 vCPU，2GB 或更多 RAM 以留有余量（日志、媒体、多个渠道）。节点工具和浏览器自动化可能会消耗较多资源。

    操作系统：使用 **Ubuntu LTS**（或任何现代 Debian/Ubuntu）。Linux 安装路径在那里经过了最充分的测试。

    文档：[Linux](/en/platforms/linux)，[VPS 托管](/en/vps)。

  </Accordion>

  <Accordion title="我可以在虚拟机中运行 OpenClaw 吗？有哪些要求？">
    可以。将虚拟机视为与 VPS 相同：它需要始终在线、可访问，并为 Gateway(网关) 和您启用的任何渠道提供足够的
    RAM。

    基本指导：

    - **绝对最低要求：** 1 vCPU，1GB RAM。
    - **推荐配置：** 如果您运行多个渠道、浏览器自动化或媒体工具，建议使用 2GB 或更多 RAM。
    - **操作系统：** Ubuntu LTS 或其他现代 Debian/Ubuntu。

    如果您使用的是 Windows，**WSL2 是最简单的虚拟机风格设置**，并且具有最佳的工具兼容性。请参阅 [Windows](/en/platforms/windows)，[VPS 托管](/en/vps)。
    如果您在虚拟机中运行 macOS，请参阅 [macOS 虚拟机](/en/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 什么是 OpenClaw？

<AccordionGroup>
  <Accordion title="用一段话描述 OpenClaw？">
    OpenClaw 是一个您在自己的设备上运行的个人 AI 助手。它会在您已经使用的消息平台上回复（WhatsApp、Telegram、Slack、Mattermost（插件）、Discord、Google Chat、Signal、iMessage、WebChat），并且还可以在支持的平台上进行语音交互和实时 Canvas 操作。**Gateway(网关)** 是始终在线的控制平面；而助手本身就是产品。
  </Accordion>

  <Accordion title="价值主张">
    OpenClaw 不仅仅是“一个 Claude 的外壳”。它是一个**本地优先的控制平面**，允许您在**您自己的硬件**上运行一个功能强大的助手，通过您已经使用的聊天应用即可访问，具备有状态的会话、记忆和工具功能——而无需将您的工作流程控制权交给托管的 SaaS。

    亮点：

    - **您的设备，您的数据：** 在您想要的地方运行 Gateway(网关)（Mac、Linux、VPS），并将工作区 + 会话历史保留在本地。
    - **真实的渠道，而非 Web 沙盒：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，加上支持平台上的移动端语音和 Canvas。
    - **模型无关：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，支持按代理路由和故障转移。
    - **仅限本地选项：** 运行本地模型，这样如果您愿意，**所有数据都可以保留在您的设备上**。
    - **多代理路由：** 按渠道、账户或任务分离代理，每个代理都有自己的工作区和默认设置。
    - **开源且可 hack：** 检查、扩展和自托管，没有供应商锁定。

    文档：[Gateway(网关)](/en/gateway)、[Channels](/en/channels)、[Multi-agent](/en/concepts/multi-agent)、
    [Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="我刚设置好——首先应该做什么？">
    不错的入门项目：

    - 构建一个网站（WordPress、Shopify 或一个简单的静态站点）。
    - 原型设计一个移动应用（大纲、屏幕界面、API 计划）。
    - 整理文件和文件夹（清理、命名、标记）。
    - 连接 Gmail 并自动生成摘要或跟进。

    它可以处理大型任务，但当您将其拆分为阶段并使用子代理进行并行工作时，效果最好。

  </Accordion>

  <Accordion title="OpenClaw 的五大日常用例是什么？">
    日常成效通常包括：

    - **个人简报：** 您关注的收件箱、日历和新闻摘要。
    - **研究与起草：** 快速研究、摘要以及电子邮件或文档的初稿。
    - **提醒与跟进：** 由 cron 或心跳驱动的提醒和检查清单。
    - **浏览器自动化：** 填写表单、收集数据以及重复执行网页任务。
    - **跨设备协调：** 从手机发送任务，让 Gateway(网关) 在服务器上运行，并在聊天中获取结果。

  </Accordion>

  <Accordion title="OpenClaw 能否协助 SaaS 进行潜在客户开发、外联、广告和博客撰写？">
    可以用于 **研究、资格认定和起草**。它可以扫描网站、建立候选名单、
    总结潜在客户并撰写外联或广告文案初稿。

    对于 **外联或广告投放**，请保持人工介入。避免发送垃圾邮件，遵守当地法律和
    平台政策，并在发送前审核所有内容。最安全的模式是让
    OpenClaw 起草，然后由您批准。

    文档：[Security](/en/gateway/security)。

  </Accordion>

  <Accordion title="与 Claude Code 相比，Web 开发方面有哪些优势？">
    OpenClaw 是一个 **个人助手** 和协调层，而不是 IDE 的替代品。使用
    Claude Code 或 Codex 以便在代码仓库内实现最快的直接编码循环。当您需要持久记忆、跨设备访问和工具编排时，请使用 OpenClaw。

    优势：

    - **持久记忆 + 工作区** 跨会话
    - **多平台访问** (WhatsApp, Telegram, TUI, WebChat)
    - **工具编排** (浏览器、文件、调度、钩子)
    - **Always-on Gateway(网关)** (在 VPS 上运行，从任何地方交互)
    - 用于本地浏览器/屏幕/相机/执行的 **Nodes**

    Showcase: [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Skills 和自动化

<AccordionGroup>
  <Accordion title="如何在不弄脏仓库的情况下自定义技能？">
    使用托管覆盖（managed overrides）而不是编辑仓库副本。将您的更改放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或者通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加文件夹）。优先级为 `<workspace>/skills` > `~/.openclaw/skills` > 捆绑，因此托管覆盖胜出而无需触及 git。只有适合上游（upstream）的编辑才应该存在于仓库中并作为 PR 提交。
  </Accordion>

  <Accordion title="我可以从自定义文件夹加载技能吗？">
    是的。通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加额外的目录（优先级最低）。默认优先级保持不变：`<workspace>/skills` → `~/.openclaw/skills` → 捆绑 → `skills.load.extraDirs`。`clawhub` 默认安装到 `./skills`，OpenClaw 在下一次会话中将其视为 `<workspace>/skills`。
  </Accordion>

  <Accordion title="如何针对不同的任务使用不同的模型？">
    目前支持的模式有：

    - **Cron 作业**：隔离的作业可以为每个作业设置 `model` 覆盖。
    - **子代理**：将任务路由到具有不同默认模型的独立代理。
    - **按需切换**：使用 `/model` 随时切换当前会话模型。

    请参阅 [Cron 作业](/en/automation/cron-jobs)、[多代理路由](/en/concepts/multi-agent) 和 [斜杠命令](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="机器人在执行繁重任务时冻结。我该如何卸载该任务？">
    使用**子代理**来处理长时间或并行任务。子代理在其自己的会话中运行，
    返回摘要，并保持您的主聊天响应畅通。

    让您的机器人“为此任务生成一个子代理”或使用 `/subagents`。
    在聊天中使用 `/status` 查看 Gateway(网关) 当前正在做什么（以及它是否忙碌）。

    Token 提示：长任务和子代理都会消耗 token。如果成本是一个问题，请通过 `agents.defaults.subagents.model` 为子代理设置更便宜的模型。

    文档：[Sub-agents](/en/tools/subagents)，[Background Tasks](/en/automation/tasks)。

  </Accordion>

  <Accordion title="线程绑定的子代理会话在 Discord 上如何工作？">
    使用线程绑定。您可以将 Discord 线程绑定到子代理或会话目标，以便该线程中的后续消息保留在该绑定会话上。

    基本流程：

    - 使用 `thread: true` 通过 `sessions_spawn` 生成（可选择使用 `mode: "session"` 进行持续跟进）。
    - 或使用 `/focus <target>` 手动绑定。
    - 使用 `/agents` 检查绑定状态。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自动失焦。
    - 使用 `/unfocus` 分离线程。

    所需配置：

    - 全局默认值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆盖：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 生成时自动绑定：设置 `channels.discord.threadBindings.spawnSubagentSessions: true`。

    文档：[Sub-agents](/en/tools/subagents)、[Discord](/en/channels/discord)、[Configuration Reference](/en/gateway/configuration-reference)、[Slash commands](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="Cron 或提醒未触发。我应该检查什么？">
    Cron 在 Gateway(网关) 进程内运行。如果 Gateway(网关) 未持续运行，
    计划作业将不会运行。

    检查清单：

    - 确认 cron 已启用 (`cron.enabled`) 且未设置 `OPENCLAW_SKIP_CRON`。
    - 检查 Gateway(网关) 是否全天候运行（无休眠/重启）。
    - 验证作业的时区设置 (`--tz` 与主机时区对比)。

    调试：

    ```bash
    openclaw cron run <jobId> --force
    openclaw cron runs --id <jobId> --limit 50
    ```

    文档：[Cron jobs](/en/automation/cron-jobs)，[Cron vs Heartbeat](/en/automation/cron-vs-heartbeat)。

  </Accordion>

  <Accordion title="如何在 Linux 上安装 Skills？">
    使用原生 `openclaw skills` 命令或将 Skills 放入您的工作区。macOS 的 Skills UI 在 Linux 上不可用。
    在 [https://clawhub.com](https://clawhub.com) 浏览 Skills。

    ```bash
    openclaw skills search "calendar"
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    仅当您想要发布或同步您自己的 Skills 时，才安装单独的 `clawhub` CLI。

  </Accordion>

  <Accordion title="OpenClaw 可以按计划或连续在后台运行任务吗？">
    是的。使用 Gateway(网关) 调度器：

    - **Cron jobs** 用于计划或重复性任务（跨重启持久化）。
    - **Heartbeat** 用于“主会话”的定期检查。
    - **Isolated jobs** 用于发布摘要或投递到聊天的自主代理。

    文档：[Cron jobs](/en/automation/cron-jobs)，[Cron vs Heartbeat](/en/automation/cron-vs-heartbeat)，
    [Heartbeat](/en/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以在 Linux 上运行仅限 Apple macOS 的技能吗？">
    不能直接运行。macOS 技能受 `metadata.openclaw.os` 及所需二进制文件的限制，并且只有在 **Gateway(网关) 主机** 上满足条件时，这些技能才会出现在系统提示中。在 Linux 上，除非您覆盖限制条件，否则仅限 `darwin` 的技能（如 `apple-notes`、`apple-reminders`、`things-mac`）将不会加载。

    您有三种支持的模式：

    **选项 A - 在 Mac 上运行 Gateway(网关)（最简单）。**
    在存在 macOS 二进制文件的地方运行 Gateway(网关)，然后通过 [远程模式](#gateway-ports-already-running-and-remote-mode) 或 Tailscale 从 Linux 连接。由于 Gateway(网关) 主机是 macOS，技能会正常加载。

    **选项 B - 使用 macOS 节点（无 SSH）。**
    在 Linux 上运行 Gateway(网关)，配对一个 macOS 节点（菜单栏应用），并在 Mac 上将 **节点运行命令 (Node Run Commands)** 设置为“始终询问”或“始终允许”。当节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为符合条件。代理会通过 `nodes` 工具运行这些技能。如果您选择“始终询问”，在提示中批准“始终允许”会将该命令添加到允许列表中。

    **选项 C - 通过 SSH 代理 macOS 二进制文件（高级）。**
    将 Gateway(网关) 保留在 Linux 上，但使所需的 CLI 二进制文件解析为在 Mac 上运行的 SSH 包装器。然后覆盖技能以允许 Linux，使其保持符合条件。

    1. 为二进制文件创建 SSH 包装器（例如：用于 Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 将包装器放置在 Linux 主机上的 `PATH` 处（例如 `~/bin/memo`）。
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

  <Accordion title="你有 Notion 或 HeyGen 集成吗？">
    目前尚未内置。

    选项：

    - **自定义 skill / 插件：** 最适合可靠的 API 访问（Notion 和 HeyGen 都有 API）。
    - **浏览器自动化：** 无需代码即可工作，但速度较慢且较脆弱。

    如果你想为每个客户端保留上下文（代理机构工作流），一个简单的模式是：

    - 每个客户端一个 Notion 页面（上下文 + 偏好设置 + 活跃工作）。
    - 要求代理在会话开始时获取该页面。

    如果你想要原生集成，请提交功能请求或构建一个针对这些 API 的 skill。

    安装 skills：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安装会放置在活动工作区 `skills/` 目录中。对于跨代理共享的 skills，请将它们放置在 `~/.openclaw/skills/<name>/SKILL.md` 中。某些 skills 需要通过 Homebrew 安装的二进制文件；在 API 上，这意味着使用 Linuxbrew（请参阅上面的 Homebrew Linux 常见问题条目）。请参阅 [Skills](/en/tools/skills) 和 [Linux](/en/tools/clawhub)。

  </Accordion>

  <Accordion title="如何将我现有的已登录 Chrome 与 OpenClaw 结合使用？">
    使用内置的 `user` 浏览器配置文件，它通过 Chrome DevTools MCP 附加：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果你想要自定义名称，请创建一个显式的 MCP 配置文件：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    此路径是特定于主机的。如果 Gateway(网关) 在其他地方运行，请在浏览器机器上运行节点主机或改用远程 CDP。

  </Accordion>
</AccordionGroup>

## 沙箱隔离与内存

<AccordionGroup>
  <Accordion title="是否有专门的沙箱隔离文档？">
    有的。请参阅 [沙箱隔离](/en/gateway/sandboxing)。有关 Docker 特定的设置（Docker 中的完整网关或沙箱映像），请参阅 [Docker](/en/install/docker)。
  </Accordion>

  <Accordion title="Docker 感觉受限——我如何启用完整功能？">
    默认镜像优先考虑安全性，并以 `node` 用户身份运行，因此它不包含系统软件包、Homebrew 或捆绑的浏览器。为了获得更完整的设置：

    - 使用 `OPENCLAW_HOME_VOLUME` 持久化 `/home/node`，以便缓存得以保留。
    - 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 将系统依赖项构建到镜像中。
    - 通过捆绑的 CLI 安装 Playwright 浏览器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 设置 `PLAYWRIGHT_BROWSERS_PATH` 并确保该路径已持久化。

    文档：[Docker](/en/install/docker)、[Browser](/en/tools/browser)。

  </Accordion>

  <Accordion title="我可以保持私信私密，同时用一个代理将群组设为公开/沙箱隔离吗？">
    可以——如果您的私有流量是 **私信** 而公共流量是 **groups**。

    使用 `agents.defaults.sandbox.mode: "non-main"`，使 group/渠道 会话（非主密钥）在 Docker 中运行，而主私信会话保持在主机上。然后通过 `tools.sandbox.tools` 限制沙箱隔离会话中可用的工具。

    设置演练 + 示例配置：[Groups: personal 私信 + public groups](/en/channels/groups#pattern-personal-dms-public-groups-single-agent)

    关键配置参考：[Gateway(网关) configuration](/en/gateway/configuration-reference#agentsdefaultssandbox)

  </Accordion>

<Accordion title="如何将主机文件夹绑定到沙箱中？">
  将 `agents.defaults.sandbox.docker.binds` 设置为 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全局绑定和每代理绑定会合并；当 `scope: "shared"` 时，每代理绑定将被忽略。对任何敏感内容请使用 `:ro`，并记住绑定会绕过沙箱文件系统隔离墙。有关示例和安全说明，请参阅 [沙箱隔离](/en/gateway/sandboxing#custom-bind-mounts) 和 [沙箱 vs Tool Policy vs
  Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。
</Accordion>

  <Accordion title="内存是如何工作的？">
    OpenClaw 的内存只是代理工作区中的 Markdown 文件：

    - `memory/YYYY-MM-DD.md` 中的每日笔记
    - `MEMORY.md` 中的精选长期笔记（仅限主/私有会话）

    OpenClaw 还会运行 **静默预压缩内存刷新**，以提醒模型
    在自动压缩之前写入持久笔记。这仅在工作区
    可写时运行（只读沙箱会跳过此步骤）。请参阅 [Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="内存总是遗忘事情。如何让它记住？">
    要求机器人 **将该事实写入内存**。长期笔记应放入 `MEMORY.md`，
    短期上下文则放入 `memory/YYYY-MM-DD.md`。

    这仍是我们正在改进的领域。提醒模型存储记忆会有所帮助；
    它会知道该怎么做。如果它一直遗忘，请验证 Gateway(网关) 是否在每次运行时
    使用相同的工作区。

    文档：[Memory](/en/concepts/memory)、[Agent workspace](/en/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="内存会永久保留吗？有哪些限制？">
    内存文件存储在磁盘上，并会一直保留，直到您删除它们。限制在于您的
    存储空间，而不是模型。**会话上下文** 仍然受限于模型的
    上下文窗口，因此长对话可能会压缩或截断。这就是
    存在内存搜索的原因——它只将相关部分拉回上下文中。

    文档：[Memory](/en/concepts/memory)、[Context](/en/concepts/context)。

  </Accordion>

  <Accordion title="语义内存搜索是否需要 OpenAI API 密钥？">
    仅当您使用 **API 嵌入**时需要。Codex OpenAI 涵盖聊天/补全，并且
    **不**授予嵌入访问权限，因此**使用 Codex 登录（OAuth 或
    Codex OAuth 登录）**对语义内存搜索没有帮助。CLI 嵌入
    仍然需要真实的 API 密钥（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果您没有显式设置提供商，OpenAI 能够解析 API 密钥（身份验证配置文件、`models.providers.*.apiKey` 或环境变量）时会自动选择提供商。
    如果能解析 OpenClaw 密钥，它会优先选择 API，否则如果能解析 Gemini 密钥则选择 Gemini，然后是 Voyage，接着是 Mistral。如果没有可用的远程密钥，内存
    搜索将保持禁用状态，直到您对其进行配置。如果您配置并存在本地模型路径，OpenAI
    优先选择 `local`。当您显式设置
    `memorySearch.provider = "ollama"` 时，支持 OpenAI。

    如果您希望保持本地运行，请设置 `memorySearch.provider = "local"`（并可选地设置
    `memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，请设置
    `memorySearch.provider = "gemini"` 并提供 `GEMINI_API_KEY`（或
    `memorySearch.remote.apiKey`）。我们支持 **OpenClaw、Gemini、Voyage、Mistral、Ollama 或本地**嵌入
    模型 - 有关设置详细信息，请参阅 [内存](/en/concepts/memory)。

  </Accordion>
</AccordionGroup>

## 文件存储位置

<AccordionGroup>
  <Accordion title="与 OpenClaw 一起使用的所有数据都会在本地保存吗？">
    不 - **OpenClaw 的状态是本地的**，但 **外部服务仍然可以看到您发送给它们的内容**。

    - **默认本地化：** 会话、内存文件、配置和工作区位于 Gateway(网关) 主机上
      (`~/.openclaw` + 您的工作区目录)。
    - **必要的远程化：** 您发送给模型提供商 (Anthropic/OpenAI/等) 的消息会发送到
      他们的 API，而聊天平台 (WhatsApp/Telegram/Slack/等) 会将消息数据存储在他们的
      服务器上。
    - **您控制影响范围：** 使用本地模型可以将提示词保留在您的机器上，但渠道
      流量仍然会通过渠道的服务器。

    相关：[Agent 工作区](/en/concepts/agent-workspace)，[Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 将其数据存储在哪里？">
    所有内容都位于 `$OPENCLAW_STATE_DIR` 之下（默认值：`~/.openclaw`）：

    | 路径                                                            | 用途                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主配置 (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 旧版 OAuth 导入（首次使用时复制到身份配置文件中）       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 身份配置文件（OAuth、API 密钥和可选的 `keyRef`/`tokenRef`）  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | 用于 `file` SecretRef 提供程序的可选文件支持的秘密载荷 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 旧版兼容性文件（已清除静态 `api_key` 条目）      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供程序状态（例如 `whatsapp/<accountId>/creds.json`）            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每个代理的状态（agentDir + 会话）                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 对话历史和状态（每个代理）                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 会话元数据（每个代理）                                       |

    旧版单代理路径：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）。

    您的**工作区**（AGENTS.md、内存文件、技能等）是独立的，并通过 `agents.defaults.workspace` 进行配置（默认值：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该放在哪里？">
    这些文件位于 **agent workspace（代理工作区）** 中，而不是 `~/.openclaw` 中。

    - **Workspace（每个代理）**：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`，
      `MEMORY.md`（当 `MEMORY.md` 缺失时的旧版后备 `memory.md`），
      `memory/YYYY-MM-DD.md`、可选的 `HEARTBEAT.md`。
    - **State dir（`~/.openclaw`）**：配置、凭据、身份验证配置文件、会话、日志，
      以及共享技能（`~/.openclaw/skills`）。

    默认工作区是 `~/.openclaw/workspace`，可通过以下方式配置：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果机器人在重启后“忘记”了内容，请确认 Gateway(网关) 在每次启动时使用的是相同的工作区
    （请记住：远程模式使用的是 **gateway host's（网关主机）** 的工作区，而不是您本地笔记本电脑的工作区）。

    提示：如果您希望保持持久的行为或偏好，请要求机器人将其 **写入 AGENTS.md 或 MEMORY.md**，
    而不是依赖聊天记录。

    参见 [Agent workspace](/en/concepts/agent-workspace) 和 [Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="推荐的备份策略">
    将您的 **agent workspace（代理工作区）** 放在一个 **私有** git 仓库中，并将其备份到某个
    私有位置（例如 GitHub 私有仓库）。这样可以捕获内存以及 AGENTS/SOUL/USER
    文件，并允许您稍后恢复助手的“思维”。

    **不要** 提交 `~/.openclaw` 下的任何内容（凭据、会话、令牌或加密的机密负载）。
    如果您需要完全恢复，请分别备份工作区和状态目录
    （请参阅上面的迁移问题）。

    文档：[Agent workspace](/en/concepts/agent-workspace)。

  </Accordion>

<Accordion title="如何完全卸载 OpenClaw？">请参阅专门指南：[Uninstall](/en/install/uninstall)。</Accordion>

  <Accordion title="代理可以在工作区之外工作吗？">
    可以的。工作区是**默认的 cwd** 和内存锚点，而不是严格的沙箱。
    相对路径在工作区内部解析，但绝对路径可以访问其他
    主机位置，除非启用了沙箱隔离。如果您需要隔离，请使用
    [`agents.defaults.sandbox`](/en/gateway/sandboxing) 或每个代理的沙箱设置。如果您
    希望某个仓库成为默认工作目录，请将该代理的
    `workspace` 指向仓库根目录。OpenClaw 仓库只是源代码；请保持
    工作区独立，除非您有意让代理在其中工作。

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
    会话状态由**网关主机**拥有。如果您处于远程模式，您关心的会话存储位于远程机器上，而不是您的本地笔记本电脑。请参阅[会话管理](/en/concepts/session)。
  </Accordion>
</AccordionGroup>

## 配置基础知识

<AccordionGroup>
  <Accordion title="配置是什么格式？它在哪里？">
    OpenClaw 从 `$OPENCLAW_CONFIG_PATH` 读取可选的 **JSON5** 配置（默认：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果文件丢失，它将使用相对安全的默认值（包括默认工作区 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我设置了 gateway.bind: "lan" (或 "tailnet")，但现在没有监听任何内容 / UI 显示未授权'>
    非回环绑定 **需要身份验证**。配置 `gateway.auth.mode` + `gateway.auth.token` (或使用 `OPENCLAW_GATEWAY_TOKEN`)。

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
    - 仅当 `gateway.auth.*` 未设置时，本地调用路径才能将 `gateway.remote.*` 作为回退。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 是通过 SecretRef 显式配置的且未解析，解析将以失败关闭 (不会进行远程回退屏蔽)。
    - 控制 UI 通过 `connect.params.auth.token` 进行身份验证 (存储在 app/UI 设置中)。避免将令牌放在 URL 中。

  </Accordion>

  <Accordion title="为什么现在在 localhost 上也需要令牌？">
    OpenClaw 默认强制执行令牌身份验证，包括回环。如果未配置令牌，网关启动时会自动生成一个并将其保存到 `gateway.auth.token`，因此 **本地 WS 客户端必须进行身份验证**。这会阻止其他本地进程调用 Gateway(网关)。

    如果您 **真的** 想要开放回环，请在配置中显式设置 `gateway.auth.mode: "none"`。Doctor 可以随时为您生成令牌：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="更改配置后需要重启吗？">
    Gateway(网关) 会监视配置并支持热重载：

    - `gateway.reload.mode: "hybrid"` (默认)：热应用安全更改，针对关键更改进行重启
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
    - `random`：轮换有趣/季节性标语（默认行为）。
    - 如果您根本不想要横幅，请设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何启用网络搜索（和网络获取）？">
    `web_fetch` 无需 API 密钥即可工作。`web_search` 需要为您所选提供商（Brave、Gemini、Grok、Kimi 或 Perplexity）提供的密钥。
    **推荐：** 运行 `openclaw configure --section web` 并选择一个提供商。
    环境变量替代方案：

    - Brave：`BRAVE_API_KEY`
    - Gemini：`GEMINI_API_KEY`
    - Grok：`XAI_API_KEY`
    - Kimi：`KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
    - Perplexity：`PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`

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
          },
        },
      },
    }
    ```

    特定于提供商的网络搜索配置现在位于 `plugins.entries.<plugin>.config.webSearch.*` 下。
    旧的 `tools.web.search.*` 提供商路径为兼容性暂时仍然加载，但不应用于新配置。

    注意事项：

    - 如果您使用允许列表，请添加 `web_search`/`web_fetch` 或 `group:web`。
    - `web_fetch` 默认启用（除非明确禁用）。
    - 守护进程从 `~/.openclaw/.env`（或服务环境）读取环境变量。

    文档：[Web tools](/en/tools/web)。

  </Accordion>

  <Accordion title="config.apply 清空了我的配置。如何恢复并避免这种情况？">
    `config.apply` 会替换**整个配置**。如果您发送的是部分对象，其他所有内容都会被删除。

    恢复：

    - 从备份恢复（git 或复制的 `~/.openclaw/openclaw.json`）。
    - 如果没有备份，请重新运行 `openclaw doctor` 并重新配置频道/模型。
    - 如果这是意外情况，请提交错误报告并附上您已知的最后配置或任何备份。
    - 本地编码代理通常可以从日志或历史记录中重建一个有效的配置。

    避免这种情况：

    - 使用 `openclaw config set` 进行微小的更改。
    - 使用 `openclaw configure` 进行交互式编辑。

    文档：[Config](/en/cli/config)、[Configure](/en/cli/configure)、[Doctor](/en/gateway/doctor)。

  </Accordion>

  <Accordion title="如何跨设备运行一个中央 Gateway(网关) 和专门的工作节点？">
    常见的模式是**一个 Gateway(网关)**（例如 Raspberry Pi）加上**节点**和**代理**：

    - **Gateway(网关)（中央）：** 拥有频道（Signal/WhatsApp）、路由和会话。
    - **节点（设备）：** Mac/iOS/Android 作为外设连接并暴露本地工具（`system.run`、`canvas`、`camera`）。
    - **代理（工作节点）：** 用于特定角色的独立大脑/工作空间（例如“Hetzner 运维”、“个人数据”）。
    - **子代理：** 当您需要并行处理时，从主代理生成后台工作。
    - **TUI：** 连接到 Gateway(网关) 并切换代理/会话。

    文档：[Nodes](/en/nodes)、[Remote access](/en/gateway/remote)、[Multi-Agent Routing](/en/concepts/multi-agent)、[Sub-agents](/en/tools/subagents)、[TUI](/en/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 浏览器可以以无头模式运行吗？">
    可以。这是一个配置选项：

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

    默认是 `false` (有头模式)。无头模式在某些网站上更容易触发反机器人检查。请参阅 [浏览器](/en/tools/browser)。

    无头模式使用**相同的 Chromium 引擎**，适用于大多数自动化操作（表单、点击、抓取、登录）。主要区别如下：

    - 没有可见的浏览器窗口（如果需要可视化，请使用截图）。
    - 某些网站对无头模式下的自动化要求更严格（验证码、反机器人）。
      例如，X/Twitter 经常阻止无头会话。

  </Accordion>

  <Accordion title="如何使用 Brave 进行浏览器控制？">
    将 `browser.executablePath` 设置为您的 Brave 二进制文件（或任何基于 Chromium 的浏览器）并重启 Gateway(网关)。
    请参阅 [浏览器](/en/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置示例。
  </Accordion>
</AccordionGroup>

## 远程 Gateway(网关)和节点

<AccordionGroup>
  <Accordion title="命令如何在 Telegram、gateway 和节点之间传播？">
    Telegram 消息由 **gateway** 处理。gateway 运行代理，
    只有在需要节点工具时，才通过 **Gateway(网关) WebSocket** 调用节点：

    Telegram → Gateway(网关) → Agent → `node.*` → Node → Gateway(网关) → Telegram

    节点看不到入站的提供商流量；它们只接收节点 RPC 调用。

  </Accordion>

  <Accordion title="如果 Gateway(网关) 托管在远程，我的 Agent 如何访问我的计算机？">
    简短回答：**将您的计算机配对为节点**。Gateway(网关) 在其他地方运行，但它可以通过 Gateway(网关) WebSocket 调用本地计算机上的 `node.*` 工具（屏幕、摄像头、系统）。

    典型设置：

    1. 在常驻主机（VPS/家庭服务器）上运行 Gateway(网关)。
    2. 将 Gateway(网关) 主机和您的计算机置于同一个 tailnet 中。
    3. 确保 Gateway(网关) WS 可访问（tailnet 绑定或 SSH 隧道）。
    4. 在本地打开 macOS 应用并以 **Remote over SSH** 模式（或直接通过 tailnet）连接，以便其注册为节点。
    5. 在 Gateway(网关) 上批准节点：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要单独的 TCP 网桥；节点通过 Gateway(网关) WebSocket 连接。

    安全提醒：配对 macOS 节点允许在该机器上进行 `system.run`。仅配对您信任的设备，并查看 [安全](/en/gateway/security)。

    文档：[节点](/en/nodes)，[Gateway(网关) 协议](/en/gateway/protocol)，[macOS 远程模式](/en/platforms/mac/remote)，[安全](/en/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已连接但我没有收到回复。现在该怎么办？">
    检查基础信息：

    - Gateway(网关) 正在运行：`openclaw gateway status`
    - Gateway(网关) 状态：`openclaw status`
    - 通道状态：`openclaw channels status`

    然后验证身份验证和路由：

    - 如果您使用 Tailscale Serve，请确保 `gateway.auth.allowTailscale` 设置正确。
    - 如果您通过 SSH 隧道连接，请确认本地隧道已启动并指向正确的端口。
    - 确认您的允许列表（私信或组）包含您的账户。

    文档：[Tailscale](/en/gateway/tailscale)，[远程访问](/en/gateway/remote)，[通道](/en/channels)。

  </Accordion>

  <Accordion title="两个 OpenClaw 实例可以互相通信吗（本地 + VPS）？">
    可以。虽然没有内置的“机器人对机器人”桥接器，但您可以通过几种可靠的方式进行连接：

    **最简单的方式：** 使用两个机器人都能访问的正常聊天渠道（Telegram/Slack/WhatsApp）。
    让机器人 A 向机器人 B 发送消息，然后让机器人 B 像往常一样回复。

    **CLI 桥接（通用）：** 运行一个脚本，使用
    `openclaw agent --message ... --deliver` 调用另一个 Gateway(网关)，
    目标指向另一个机器人监听的聊天。如果一个机器人在远程 VPS 上，可以通过 SSH/Tailscale 将您的 CLI 指向该远程 Gateway(网关)
    （参见 [Remote access](/en/gateway/remote)）。

    示例模式（在可以连接到目标 Gateway(网关) 的机器上运行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：添加一个护栏，以防止两个机器人无限循环（仅限提及、渠道
    白名单，或“不回复机器人消息”规则）。

    文档：[Remote access](/en/gateway/remote)、[Agent CLI](/en/cli/agent)、[Agent send](/en/tools/agent-send)。

  </Accordion>

  <Accordion title="多个 Agent 是否需要独立的 VPS？">
    不需要。一个 Gateway(网关) 可以托管多个 Agent，每个 Agent 拥有自己的工作区、模型默认设置
    和路由。这是正常的设置方式，比为每个 Agent 运行一个 VPS 更便宜、更简单。

    仅当您需要严格的隔离（安全边界）或非常
    不同的配置且不想共享时，才使用独立的 VPS。否则，请保留一个 Gateway(网关) 并
    使用多个 Agent 或子 Agent。

  </Accordion>

  <Accordion title="在个人笔记本电脑上使用节点而不是从 VPS 进行 SSH 有什么好处吗？">
    是的 - 节点是从远程 Gateway(网关) 访问笔记本电脑的首选方式，它们
    提供的功能不仅仅是 Shell 访问。Gateway(网关) 运行在 macOS/Linux（Windows 通过 WSL2）上，并且
    是轻量级的（小型 VPS 或 Raspberry Pi 级别的盒子就可以；4 GB RAM 足够了），因此常见的
    设置是一个常开主机加上您的笔记本电脑作为节点。

    - **无需入站 SSH。** 节点连接到 Gateway(网关) WebSocket 并使用设备配对。
    - **更安全的执行控制。** `system.run` 受该笔记本电脑上的节点允许列表/批准的限制。
    - **更多设备工具。** 除了 `system.run` 之外，节点还暴露 `canvas`、`camera` 和 `screen`。
    - **本地浏览器自动化。** 将 Gateway(网关) 保留在 VPS 上，但通过笔记本电脑上的节点主机在本地运行 Chrome，或者通过 Chrome MCP 附加到主机上的本地 Chrome。

    SSH 适合临时 Shell 访问，但对于持续的代理工作流和
    设备自动化，节点更简单。

    文档：[节点](/en/nodes)、[节点 CLI](/en/cli/nodes)、[浏览器](/en/tools/browser)。

  </Accordion>

  <Accordion title="节点运行 Gateway 服务吗？">
    不。除非您有意运行隔离的配置文件（请参阅[多个 Gateway(网关)](/en/gateway/multiple-gateways)），否则每个主机应只运行**一个 Gateway(网关)**。节点是连接
    到 Gateway(网关) 的外设（iOS/Android 节点，或菜单栏应用中的 macOS“节点模式”）。对于无头节点
    主机和 CLI 控制，请参阅[节点主机 CLI](/en/cli/node)。

    更改 `gateway`、`discovery` 和 `canvasHost` 需要完全重启。

  </Accordion>

<Accordion title="是否有 API / RPC 方式来应用配置？">是的。`config.apply` 会验证并写入完整配置，并在操作过程中重启 Gateway(网关)。</Accordion>

  <Accordion title="首次安装的合理最小配置">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    这将设置您的工作区并限制可以触发机器人的人员。

  </Accordion>

  <Accordion title="如何在 VPS 上设置 Tailscale 并从我的 Mac 连接？">
    最少步骤：

    1. **在 VPS 上安装 + 登录**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在您的 Mac 上安装 + 登录**
       - 使用 Tailscale 应用并登录到同一个 tailnet。
    3. **启用 MagicDNS（推荐）**
       - 在 Tailscale 管理控制台中，启用 MagicDNS，以便 VPS 拥有一个稳定的名称。
    4. **使用 tailnet 主机名**
       - SSH: `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway(网关) WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果您不需要 SSH 就想使用控制 UI，请在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    这会将网关绑定到环回地址，并通过 Tailscale 暴露 HTTPS。请参阅 [Tailscale](/en/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何将 Mac 节点连接到远程 Gateway(网关) (Tailscale Serve)？">
    Serve 暴露了 **Gateway(网关) 控制界面 + WS**。节点通过同一个 Gateway(网关) WS 端点进行连接。

    推荐设置：

    1. **确保 VPS 和 Mac 位于同一个 tailnet 上**。
    2. **在远程模式下使用 macOS 应用**（SSH 目标可以是 tailnet 主机名）。
       该应用将通过隧道传输 Gateway(网关) 端口并作为节点进行连接。
    3. **在网关上批准节点**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文档：[Gateway(网关) 协议](/en/gateway/protocol)，[设备发现](/en/gateway/discovery)，[macOS 远程模式](/en/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我是应该在第二台笔记本电脑上安装，还是直接添加一个节点？">
    如果你在第二台笔记本电脑上只需要 **本地工具**（屏幕/摄像头/exec），请将其添加为一个
    **节点**。这样可以保持单一的 Gateway(网关) 并避免重复配置。本地节点工具目前仅支持 macOS，但我们计划将其扩展到其他操作系统。

    只有当你需要 **硬隔离** 或两个完全独立的机器人时，才安装第二个 Gateway(网关)。

    文档：[Nodes](/en/nodes), [Nodes CLI](/en/cli/nodes), [Multiple gateways](/en/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 环境变量和 .env 加载

<AccordionGroup>
  <Accordion title="OpenClaw 如何加载环境变量？">
    OpenClaw 从父进程（shell、launchd/systemd、CI 等）读取环境变量，并且额外加载：

    - 当前工作目录中的 `.env`
    - 来自 `~/.openclaw/.env`（即 `$OPENCLAW_STATE_DIR/.env`）的全局备用 `.env`

    这两个 `.env` 文件都不会覆盖现有的环境变量。

    你也可以在配置中定义内联环境变量（仅当进程环境中缺失时才应用）：

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    有关完整的优先级和来源，请参阅 [/environment](/en/help/environment)。

  </Accordion>

  <Accordion title="我通过服务启动了 Gateway(网关)，我的环境变量消失了。现在该怎么办？">
    两种常见的修复方法：

    1. 将缺失的键放入 `~/.openclaw/.env` 中，这样即使服务未继承你的 shell 环境也能被拾取。
    2. 启用 shell 导入（可选的便捷方式）：

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

    这将运行你的登录 shell 并仅导入缺失的预期键名（从不覆盖）。等效的环境变量：
    `OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我设置了 COPILOT_GITHUB_TOKEN，但模型状态显示 "Shell env: off."（Shell 环境变量：关闭）。为什么？'>
    `openclaw models status` 报告是否启用了 **shell env import**（Shell 环境变量导入）。"Shell env: off" 并**不**意味着缺少环境变量——这仅仅意味着 OpenClaw 不会自动加载您的登录 Shell。

    如果 Gateway(网关) 作为服务（launchd/systemd）运行，它将不会继承您的 Shell 环境。通过以下任一方式修复：

    1. 将 token 放在 `~/.openclaw/.env` 中：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或者启用 shell 导入（`env.shellEnv.enabled: true`）。
    3. 或者将其添加到您的配置 `env` 块中（仅在缺失时适用）。

    然后重启网关并重新检查：

    ```bash
    openclaw models status
    ```

    Copilot tokens 从 `COPILOT_GITHUB_TOKEN` 读取（也包括 `GH_TOKEN` / `GITHUB_TOKEN`）。
    请参阅 [/concepts/模型-providers](/en/concepts/model-providers) 和 [/environment](/en/help/environment)。

  </Accordion>
</AccordionGroup>

## 会话和多次聊天

<AccordionGroup>
  <Accordion title="如何开始一次新的对话？">
    发送 `/new` 或 `/reset` 作为独立消息。请参阅 [会话管理](/en/concepts/session)。
  </Accordion>

  <Accordion title="如果我不发送 /new，会话会自动重置吗？">
    会话可以在 `session.idleMinutes` 后过期，但这**默认是禁用的**（默认为 **0**）。
    将其设置为正值以启用空闲过期。启用后，空闲期之后的**下一条**消息将为该聊天密钥启动一个新的会话 ID。
    这不会删除记录——它只是开始一个新的会话。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有没有办法组建一个 OpenClaw 实例团队（一个 CEO 和多个 agents）？">
    有的，可以通过 **multi-agent routing**（多智能体路由）和 **sub-agents**（子智能体）来实现。你可以创建一个协调器（coordinator）agent 和几个 worker agent，它们各自拥有自己的工作区和模型。

    不过，这最好被视为一个 **有趣的实验**。它很消耗 token，而且通常不如使用一个 bot 配合独立会话来得高效。我们设想的典型模型是：你与一个 bot 对话，并通过不同的会话进行并行工作。该 bot 可以在需要时生成 sub-agents。

    文档：[Multi-agent routing](/en/concepts/multi-agent)、[Sub-agents](/en/tools/subagents)、[Agents CLI](/en/cli/agents)。

  </Accordion>

  <Accordion title="为什么上下文在任务中途被截断了？我该如何防止这种情况？">
    会话上下文受限于模型的上下文窗口。长对话、大量的工具输出或许多文件都可能会触发压缩或截断。

    以下方法有帮助：

    - 让 bot 总结当前状态并将其写入文件。
    - 在执行长任务前使用 `/compact`，并在切换话题时使用 `/new`。
    - 将重要的上下文保存在工作区中，并让 bot 读回这些内容。
    - 针对长时间或并行工作使用 sub-agents，以保持主对话的精简。
    - 如果这种情况经常发生，请选择一个具有更大上下文窗口的模型。

  </Accordion>

  <Accordion title="如何在保持安装的情况下完全重置 OpenClaw？">
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

    - 如果 新手引导 检测到现有配置，它也会提供 **Reset** 选项。请参阅 [新手引导 (CLI)](/en/start/wizard)。
    - 如果你使用了 profiles（`--profile` / `OPENCLAW_PROFILE`），请重置每个状态目录（默认为 `~/.openclaw-<profile>`）。
    - 开发重置：`openclaw gateway --dev --reset`（仅限开发环境；会清除开发配置 + 凭据 + 会话 + 工作区）。

  </Accordion>

  <Accordion title='我收到“上下文过大”错误 - 如何重置或压缩？'>
    使用以下方法之一：

    - **压缩** (保留对话但总结较早的轮次):

      ```
      /compact
      ```

      或 `/compact <instructions>` 以指导总结。

    - **重置** (为相同的聊天键使用新的会话 ID):

      ```
      /new
      /reset
      ```

    如果持续出现此问题：

    - 启用或调整 **会话修剪** (`agents.defaults.contextPruning`) 以修剪旧工具输出。
    - 使用具有更大上下文窗口的模型。

    文档：[压缩](/en/concepts/compaction)、[会话修剪](/en/concepts/session-pruning)、[会话管理](/en/concepts/session)。

  </Accordion>

  <Accordion title='为什么我看到“LLM 请求被拒绝：需要 messages.content.tool_use.input 字段”？'>
    这是一个提供商验证错误：模型发出的 `tool_use` 块缺少所需的
    `input`。这通常意味着会话历史记录已过时或损坏（通常发生在长线程
    或工具/架构更改之后）。

    修复方法：使用 `/new`（独立消息）开始一个新的会话。

  </Accordion>

  <Accordion title="为什么我每 30 分钟会收到一次心跳消息？">
    心跳默认每 **30 分钟**运行一次（使用 OAuth 身份验证时为 **1 小时**）。您可以调整或禁用它们：

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

    如果 `HEARTBEAT.md` 存在但实际上是空的（只有空行和
    标题之类的 `# Heading` 标题），OpenClaw 将跳过心跳运行以节省 API 调用。
    如果文件缺失，心跳仍会运行，模型将决定执行什么操作。

    每个代理的覆盖设置使用 `agents.list[].heartbeat`。文档：[心跳](/en/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我是否需要向 WhatsApp 群组添加一个“机器人账号”？'>
    不需要。OpenClaw 运行在**您自己的账户**上，所以如果您在群组中，OpenClaw 就能看到它。
    默认情况下，群组回复会被阻止，直到您允许发件人 (`groupPolicy: "allowlist"`)。

    如果您希望只有**您自己**能够触发群组回复：

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
    选项 1（最快）：跟踪日志并在群组中发送一条测试消息：

    ```bash
    openclaw logs --follow --json
    ```

    查找以 `@g.us` 结尾的 `chatId`（或 `from`），例如：
    `1234567890-1234567890@g.us`.

    选项 2（如果已配置/已加入白名单）：从配置中列出群组：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文档：[WhatsApp](/en/channels/whatsapp)、[Directory](/en/cli/directory)、[Logs](/en/cli/logs)。

  </Accordion>

  <Accordion title="为什么 OpenClaw 不在群组中回复？">
    两个常见原因：

    - 提及门控已开启（默认）。您必须 @提及机器人（或匹配 `mentionPatterns`）。
    - 您配置了 `channels.whatsapp.groups` 但没有配置 `"*"`，且该群组未被加入白名单。

    请参阅 [Groups](/en/channels/groups) 和 [Group messages](/en/channels/group-messages)。

  </Accordion>

<Accordion title="群组/主题是否与私信共享上下文？">默认情况下，直接聊天会合并到主会话中。群组/频道拥有自己的会话密钥，且 Telegram 主题 / Discord 线程是独立的会话。请参阅 [Groups](/en/channels/groups) 和 [Group messages](/en/channels/group-messages)。</Accordion>

  <Accordion title="我可以创建多少个工作区和代理？">
    没有硬性限制。几十个（甚至几百个）都可以，但请注意以下几点：

    - **磁盘增长：** 会话和转录记录存储在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本：** 代理越多意味着并发使用的模型越多。
    - **运维开销：** 每个代理的身份验证配置文件、工作区和渠道路由。

    提示：

    - 为每个代理保留一个 **活跃** 工作区 (`agents.defaults.workspace`)。
    - 如果磁盘空间增长，请清理旧会话（删除 JSONL 或存储条目）。
    - 使用 `openclaw doctor` 来发现孤立的工作区和配置文件不匹配的情况。

  </Accordion>

  <Accordion title="我可以同时运行多个机器人或聊天吗 (Slack)，应该如何设置？">
    是的。使用 **多代理路由** 运行多个隔离的代理，并通过渠道/账户/对等端路由传入消息。Slack 支持作为渠道使用，并且可以绑定到特定的代理。

    浏览器访问功能强大，但并非“能做人类能做的任何事”——反机器人机制、验证码 (CAPTCHA) 和多因素认证 (MFA) 仍可能阻止自动化。为了获得最可靠的浏览器控制，请在主机上使用本地 Chrome MCP，或者在实际运行浏览器的机器上使用 CDP。

    最佳实践设置：

    - 始终在线的 Gateway(网关) 主机 (VPS/Mac mini)。
    - 每个角色一个代理（绑定）。
    - 绑定到这些代理的 Slack 渠道。
    - 根据需要通过 Chrome MCP 或节点使用本地浏览器。

    文档：[多代理路由](/en/concepts/multi-agent)，[Slack](/en/channels/slack)，
    [浏览器](/en/tools/browser)，[节点](/en/nodes)。

  </Accordion>
</AccordionGroup>

## 模型：默认值、选择、别名、切换

<AccordionGroup>
  <Accordion title='什么是“默认模型”？'>
    OpenClaw 的默认模型是您设置为以下内容的任何模型：

    ```
    agents.defaults.model.primary
    ```

    模型被引用为 `provider/model`（例如：`anthropic/claude-opus-4-6`）。如果您省略提供商，OpenClaw 目前假设 `anthropic` 作为临时弃用回退——但您仍然应该 **显式** 设置 `provider/model`。

  </Accordion>

  <Accordion title="您推荐使用哪个模型？">
    **推荐的默认选项：** 使用您的提供商堆栈中可用的最强最新一代模型。
    **对于启用工具或输入不受信任的代理：** 优先考虑模型强度而非成本。
    **对于常规/低风险聊天：** 使用更便宜的备用模型，并根据代理角色进行路由。

    MiniMax 有自己的文档：[MiniMax](/en/providers/minimax) 和
    [本地模型](/en/gateway/local-models)。

    经验法则：对于高风险工作，使用您**能负担得起的最好模型**；对于常规聊天或摘要，使用较便宜的模型。您可以为每个代理路由模型，并使用子代理来并行化长任务（每个子代理都会消耗 token）。请参阅[模型](/en/concepts/models)和
    [子代理](/en/tools/subagents)。

    严厉警告：较弱/过度量化的模型更容易受到提示注入和不安全行为的影响。请参阅[安全性](/en/gateway/security)。

    更多背景信息：[模型](/en/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清除配置的情况下切换模型？">
    使用 **模型命令** 或仅编辑 **模型** 字段。避免完全替换配置。

    安全选项：

    - `/model` 在聊天中（快速，针对每次会话）
    - `openclaw models set ...` （仅更新模型配置）
    - `openclaw configure --section model` （交互式）
    - 在 `~/.openclaw/openclaw.json` 中编辑 `agents.defaults.model`

    除非您打算替换整个配置，否则请避免使用带有部分对象的 `config.apply`。
    如果您确实覆盖了配置，请从备份恢复或重新运行 `openclaw doctor` 进行修复。

    文档：[模型](/en/concepts/models)、[配置](/en/cli/configure)、[Config](/en/cli/config)、[Doctor](/en/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自托管模型（llama.cpp、vLLM、Ollama）吗？">
    可以。Ollama 是使用本地模型最简单的途径。

    最快设置方法：

    1. 从 `https://ollama.com/download` 安装 Ollama
    2. 拉取一个本地模型，例如 `ollama pull glm-4.7-flash`
    3. 如果您还想要 Ollama Cloud，请运行 `ollama signin`
    4. 运行 `openclaw onboard` 并选择 `Ollama`
    5. 选择 `Local` 或 `Cloud + Local`

    注意事项：

    - `Cloud + Local` 让您可以使用 Ollama Cloud 模型以及您的本地 Ollama 模型
    - 云端模型（如 `kimi-k2.5:cloud`）不需要本地拉取
    - 如需手动切换，请使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全提示：较小或高度量化的模型更容易受到提示注入攻击。我们强烈建议任何可以使用工具的机器人使用**大型模型**。如果您仍然想使用小型模型，请启用沙箱隔离和严格的工具允许列表。

    文档：[Ollama](/en/providers/ollama)、[本地模型](/en/gateway/local-models)、
    [模型提供商](/en/concepts/model-providers)、[安全](/en/gateway/security)、
    [沙箱隔离](/en/gateway/sandboxing)。

  </Accordion>

<Accordion title="OpenClaw、Flawd 和 Krill 使用什么模型？">- 这些部署可能有所不同，并且可能会随时间变化；没有固定的提供商推荐。 - 使用 `openclaw models status` 检查每个网关上的当前运行时设置。 - 对于安全敏感型/启用了工具的代理，请使用可用的最强最新一代模型。</Accordion>

  <Accordion title="如何在不重启的情况下即时切换模型？">
    将 `/model` 命令作为独立消息使用：

    ```
    /model sonnet
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    /model gemini-flash-lite
    ```

    这些是内置别名。可以通过 `agents.defaults.models` 添加自定义别名。

    您可以使用 `/model`、`/model list` 或 `/model status` 列出可用模型。

    `/model`（以及 `/model list`）会显示一个紧凑的带编号选择器。通过数字进行选择：

    ```
    /model 3
    ```

    您还可以为提供商强制指定特定的身份验证配置文件（每次会话）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 显示当前处于活动状态的代理、正在使用的 `auth-profiles.json` 文件以及下一步将尝试使用的身份验证配置文件。
    当可用时，它还会显示配置的提供商端点 (`baseUrl`) 和 API 模式 (`api`)。

    **如何取消固定我用 @profile 设置的配置文件？**

    重新运行 `/model`，但**不带** `@profile` 后缀：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果您想恢复默认设置，请从 `/model` 中选择它（或发送 `/model <default provider/model>`）。
    使用 `/model status` 确认哪个身份验证配置文件处于活动状态。

  </Accordion>

  <Accordion title="我可以将 GPT 5.2 用于日常任务，将 Codex 5.3 用于编程吗？">
    可以。将其中一个设置为默认，然后根据需要进行切换：

    - **快速切换（每次会话）：** 日常任务使用 `/model gpt-5.4`，使用 Codex OAuth 进行编程时使用 `/model openai-codex/gpt-5.4`。
    - **默认设置 + 切换：** 将 `agents.defaults.model.primary` 设置为 `openai/gpt-5.4`，然后在编程时切换到 `openai-codex/gpt-5.4`（或者反过来）。
    - **子代理：** 将编程任务路由到具有不同默认模型的子代理。

    请参阅 [Models](/en/concepts/models) 和 [Slash commands](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title='为什么我会看到 "Model ... is not allowed" 然后没有回复？'>
    如果设置了 `agents.defaults.models`，它将成为 `/model` 和任何
    会话覆盖的 **允许列表**。选择不在该列表中的模型将返回：

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    该错误会 **代替** 正常回复返回。解决方法：将该模型添加到
    `agents.defaults.models`，移除允许列表，或从 `/model list` 中选择一个模型。

  </Accordion>

  <Accordion title='为什么我会看到 "Unknown 模型: MiniMax-M2.7"？'>
    这意味着 **提供商未配置**（未找到 MiniMax 提供商配置或身份验证
    配置文件），因此无法解析该模型。

    修复检查清单：

    1. 升级到当前的 OpenClaw 版本（或从源代码运行 `main`），然后重启网关。
    2. 确保 MiniMax 已配置（向导或 JSON），或者环境中存在 MiniMax API 密钥
       或身份验证配置文件，以便注入提供商。
    3. 使用确切的模型 ID（区分大小写）：`minimax/MiniMax-M2.7` 或
       `minimax/MiniMax-M2.7-highspeed`。
    4. 运行：

       ```bash
       openclaw models list
       ```

       并从列表中选择（或在聊天中使用 `/model list`）。

    参见 [MiniMax](/en/providers/minimax) 和 [模型](/en/concepts/models)。

  </Accordion>

  <Accordion title="我可以将 MiniMax 作为默认值，并在复杂任务中使用 OpenAI 吗？">
    是的。使用 **MiniMax 作为默认值**，并在需要时 **按会话切换** 模型。
    回退机制是针对 **错误** 的，而不是针对“困难任务”，因此请使用 `/model` 或单独的代理。

    **选项 A：按会话切换**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "minimax" },
            "openai/gpt-5.4": { alias: "gpt" },
          },
        },
      },
    }
    ```

    然后：

    ```
    /model gpt
    ```

    **选项 B：分离的代理**

    - 代理 A 默认：MiniMax
    - 代理 B 默认：OpenAI
    - 按代理路由或使用 `/agent` 进行切换

    文档：[模型](/en/concepts/models)、[多代理路由](/en/concepts/multi-agent)、[MiniMax](/en/providers/minimax)、[OpenAI](/en/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是内置快捷方式吗？">
    是的。OpenClaw 附带了一些默认的简写（仅当该模型存在于 `agents.defaults.models` 中时才应用）：

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5-mini`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果您设置了同名的别名，您的值将优先生效。

  </Accordion>

  <Accordion title="如何定义/覆盖模型快捷方式（别名）？">
    别名来源于 `agents.defaults.models.<modelId>.alias`。例如：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": { alias: "opus" },
            "anthropic/claude-sonnet-4-6": { alias: "sonnet" },
            "anthropic/claude-haiku-4-5": { alias: "haiku" },
          },
        },
      },
    }
    ```

    然后 `/model sonnet`（或在支持时为 `/<alias>`）将解析为该模型 ID。

  </Accordion>

  <Accordion title="如何添加来自其他提供商（如 OpenRouter 或 Z.AI）的模型？">
    OpenRouter（按 token 付费；多种模型）：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "openrouter/anthropic/claude-sonnet-4-6" },
          models: { "openrouter/anthropic/claude-sonnet-4-6": {} },
        },
      },
      env: { OPENROUTER_API_KEY: "sk-or-..." },
    }
    ```

    Z.AI（GLM 模型）：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-5" },
          models: { "zai/glm-5": {} },
        },
      },
      env: { ZAI_API_KEY: "..." },
    }
    ```

    如果您引用了某个提供商/模型，但缺少所需的提供商密钥，您将收到运行时身份验证错误（例如 `No API key found for provider "zai"`）。

    **添加新代理后未找到提供商的 API 密钥**

    这通常意味着**新代理**的认证存储为空。认证是针对每个代理的，
    并存储在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修复选项：

    - 运行 `openclaw agents add <id>` 并在向导期间配置认证。
    - 或者将 `auth-profiles.json` 从主代理的 `agentDir` 复制到新代理的 `agentDir` 中。

    切勿在代理之间重用 `agentDir`；这会导致认证/会话冲突。

  </Accordion>
</AccordionGroup>

## 模型故障转移和“所有模型均失败”

<AccordionGroup>
  <Accordion title="故障转移是如何工作的？">
    故障转移分两个阶段进行：

    1. 同一提供商内部的 **Auth profile rotation**（认证配置轮换）。
    2. **Model fallback**（模型回退）到 `agents.defaults.model.fallbacks` 中的下一个模型。

    冷却时间适用于失败的配置（指数退避），因此即使提供商受到速率限制或暂时失败，OpenClaw 也能继续响应。

  </Accordion>

  <Accordion title='“No credentials found for profile anthropic:default”是什么意思？'>
    这意味着系统尝试使用认证配置 ID `anthropic:default`，但无法在预期的认证存储中找到其凭据。

    **修复检查清单：**

    - **确认认证配置的存储位置**（新路径与旧路径）
      - 当前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 旧版：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）
    - **确认您的环境变量已被 Gateway(网关) 加载**
      - 如果您在 Shell 中设置了 `ANTHROPIC_API_KEY`，但通过 systemd/launchd 运行 Gateway(网关)，它可能无法继承该变量。请将其放入 `~/.openclaw/.env` 或启用 `env.shellEnv`。
    - **确保您正在编辑正确的 agent**
      - 多 Agent 设置意味着可能存在多个 `auth-profiles.json` 文件。
    - **健全性检查 模型/认证 状态**
      - 使用 `openclaw models status` 查看已配置的模型以及提供商是否已通过认证。

    **针对“No credentials found for profile anthropic”的修复检查清单**

    这意味着运行被锁定为 Anthropic 认证配置，但 Gateway(网关) 无法在其认证存储中找到它。

    - **使用 setup-token**
      - 运行 `claude setup-token`，然后使用 `openclaw models auth setup-token --provider anthropic` 粘贴它。
      - 如果 Token 是在另一台机器上创建的，请使用 `openclaw models auth paste-token --provider anthropic`。
    - **如果您想改用 API 密钥**
      - 将 `ANTHROPIC_API_KEY` 放入 **Gateway(网关) 主机** 上的 `~/.openclaw/.env` 中。
      - 清除任何强制使用缺失配置的锁定顺序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **确认您在 Gateway(网关) 主机上运行命令**
      - 在远程模式下，认证配置存储在 Gateway(网关) 机器上，而不是您的笔记本电脑上。

  </Accordion>

  <Accordion title="为什么它也尝试了 Google Gemini 并失败了？">
    如果您的模型配置包含 Google Gemini 作为后备（或者您切换到了 Gemini 简写），OpenClaw 将在模型回退期间尝试使用它。如果您尚未配置 Google 凭据，您将看到 `No API key found for provider "google"`。

    修复方法：提供 Google 身份验证，或者在 `agents.defaults.model.fallbacks` / 别名中移除/避免使用 Google 模型，以免回退路由到那里。

    **LLM request rejected: thinking signature required (Google Antigravity)**

    原因：会话历史包含 **不带签名的思维块**（通常来自中止/部分流）。Google Antigravity 需要思维块带有签名。

    修复方法：OpenClaw 现在会为 Google Antigravity Claude 剥离未签名的思维块。如果问题仍然出现，请启动一个 **新会话** 或为该代理设置 `/thinking off`。

  </Accordion>
</AccordionGroup>

## Auth profiles: what they are and how to manage them

相关：[/concepts/oauth](/en/concepts/oauth) (OAuth flows, token storage, multi-account patterns)

<AccordionGroup>
  <Accordion title="什么是 auth profile？">
    Auth profile 是与提供商关联的命名凭据记录（OAuth 或 API key）。Profiles 位于：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="典型的 profile ID 是什么？">
    OpenClaw 使用提供商前缀的 ID，例如：

    - `anthropic:default`（当不存在电子邮件身份时很常见）
    - `anthropic:<email>` 用于 OAuth 身份
    - 您选择的自定义 ID（例如 `anthropic:work`）

  </Accordion>

  <Accordion title="我可以控制先尝试哪个身份验证配置文件吗？">
    可以。配置支持配置文件的可选元数据以及每个提供商的排序 (`auth.order.<provider>`)。这**不**存储机密；它将 ID 映射到提供商/模式并设置轮换顺序。

    如果配置文件处于短期的 **cooldown**（速率限制/超时/身份验证失败）或较长时间的 **disabled**（禁用）状态（计费/额度不足），OpenClaw 可能会暂时跳过该配置文件。要检查此情况，请运行 `openclaw models status --json` 并检查 `auth.unusableProfiles`。调整：`auth.cooldowns.billingBackoffHours*`。

    您还可以通过 CLI 设置 **per-agent**（每个代理）的顺序覆盖（存储在该代理的 `auth-profiles.json` 中）：

    ```bash
    # Defaults to the configured default agent (omit --agent)
    openclaw models auth order get --provider anthropic

    # Lock rotation to a single profile (only try this one)
    openclaw models auth order set --provider anthropic anthropic:default

    # Or set an explicit order (fallback within provider)
    openclaw models auth order set --provider anthropic anthropic:work anthropic:default

    # Clear override (fall back to config auth.order / round-robin)
    openclaw models auth order clear --provider anthropic
    ```

    要定位到特定的代理：

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

  </Accordion>

  <Accordion title="OAuth 与 API 密钥 - 有什么区别？">
    OpenClaw 支持这两种方式：

    - **OAuth** 通常利用订阅访问权限（如果适用）。
    - **API 密钥** 使用按令牌付费的计费方式。

    向导明确支持 Anthropic 设置令牌和 OpenAI Codex OAuth，并且可以为您存储 API 密钥。

  </Accordion>
</AccordionGroup>

## Gateway(网关)：端口、“正在运行”和远程模式

<AccordionGroup>
  <Accordion title="Gateway(网关) 使用哪个端口？">
    `gateway.port` 控制 WebSocket + HTTP（控制 UI、钩子等）的单个多路复用端口。

    优先级：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='为什么 openclaw gateway status 显示“Runtime: running”（运行时：正在运行）但“RPC probe: failed”（RPC 探测：失败）？'>
    因为“running”是 **supervisor's**（监督程序）的视图（launchd/systemd/schtasks）。RPC 探测是 CLI 实际连接到 gateway WebSocket 并调用 `status`。

    使用 `openclaw gateway status` 并信任以下行：

    - `Probe target:`（探测实际使用的 URL）
    - `Listening:`（端口上实际绑定的内容）
    - `Last gateway error:`（当进程存活但端口未监听时的常见根本原因）

  </Accordion>

  <Accordion title='为什么 openclaw gateway 状态显示“Config (cli)”和“Config (service)”不同？'>
    您正在编辑一个配置文件，而服务正在运行另一个文件（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    修复方法：

    ```bash
    openclaw gateway install --force
    ```

    在您希望服务使用的相同 `--profile` / 环境中运行该命令。

  </Accordion>

  <Accordion title='“另一个 gateway 实例已在监听”是什么意思？'>
    OpenClaw 通过在启动时立即绑定 WebSocket 监听器来强制执行运行时锁定（默认 `ws://127.0.0.1:18789`）。如果绑定失败并出现 `EADDRINUSE`，它会抛出 `GatewayLockError`，表明另一个实例已在监听。

    修复方法：停止另一个实例，释放端口，或使用 `openclaw gateway --port <port>` 运行。

  </Accordion>

  <Accordion title="如何在远程模式下运行 OpenClaw（客户端连接到其他地方的 Gateway(网关)）？">
    设置 `gateway.mode: "remote"` 并指向远程 WebSocket URL，可选择添加令牌/密码：

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

    注意事项：

    - `openclaw gateway` 仅在 `gateway.mode` 为 `local` 时启动（或者您传递覆盖标志）。
    - macOS 应用程序会监视配置文件，并在这些值更改时实时切换模式。

  </Accordion>

  <Accordion title='控制 UI 显示“未授权”（或不断重新连接）。现在该怎么办？'>
    您的网关在启用身份验证（`gateway.auth.*`）的情况下运行，但 UI 未发送匹配的令牌/密码。

    事实（来自代码）：

    - 控制 UI 将令牌保存在 `sessionStorage` 中，用于当前浏览器标签页会话和选定的网关 URL，因此同标签页刷新可以继续工作，而无需恢复长期的 localStorage 令牌持久性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，当网关返回重试提示（`canRetryWithDeviceToken=true`，`recommendedNextStep=retry_with_device_token`）时，受信任的客户端可以使用缓存的设备令牌尝试一次有限重试。

    修复：

    - 最快：`openclaw dashboard`（打印 + 复制仪表板 URL，尝试打开；如果是无头模式则显示 SSH 提示）。
    - 如果您还没有令牌：`openclaw doctor --generate-gateway-token`。
    - 如果是远程，先建立隧道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/`。
    - 在网关主机上设置 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - 在控制 UI 设置中，粘贴相同的令牌。
    - 如果在一次重试后仍然不匹配，轮换/重新批准配对的设备令牌：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 仍然卡住？运行 `openclaw status --all` 并按照 [故障排除](/en/gateway/troubleshooting) 操作。有关身份验证详细信息，请参阅 [仪表板](/en/web/dashboard)。

  </Accordion>

  <Accordion title="我设置了 gateway.bind tailnet 但它无法绑定且没有任何监听">
    `tailnet` 绑定从您的网络接口（100.64.0.0/10）中选择一个 Tailscale IP。如果机器不在 Tailscale 上（或接口已关闭），则没有任何内容可以绑定。

    修复：

    - 在该主机上启动 Tailscale（以便它具有 100.x 地址），或
    - 切换到 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是显式的。`auto` 优先使用环回；当您只需要 tailnet 绑定时，请使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="我可以在同一台主机上运行多个 Gateway(网关) 吗？">
    通常不需要——一个 Gateway(网关) 就可以运行多个消息通道和代理。仅在需要冗余（例如：救援机器人）或强隔离时才使用多个 Gateway(网关)。

    可以，但您必须隔离：

    - `OPENCLAW_CONFIG_PATH` （每个实例的配置）
    - `OPENCLAW_STATE_DIR` （每个实例的状态）
    - `agents.defaults.workspace` （工作区隔离）
    - `gateway.port` （唯一端口）

    快速设置（推荐）：

    - 每个实例使用 `openclaw --profile <name> ...` （自动创建 `~/.openclaw-<name>`）。
    - 在每个配置文件中设置唯一的 `gateway.port` （或者在手动运行时传递 `--port`）。
    - 安装针对每个配置文件的服务：`openclaw --profile <name> gateway install`。

    配置文件还会为服务名称添加后缀（`ai.openclaw.<profile>`；旧版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
    完整指南：[Multiple gateways](/en/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='“invalid handshake” / 代码 1008 是什么意思？'>
    Gateway(网关) 是一个 **WebSocket 服务器**，它期望收到的第一条消息
    是一个 `connect` 帧。如果收到其他任何内容，它将以 **代码 1008**（策略违规）关闭连接。

    常见原因：

    - 您在浏览器中打开了 **HTTP** URL（`http://...`）而不是 WS 客户端。
    - 您使用了错误的端口或路径。
    - 代理或隧道剥离了认证头或发送了非 Gateway(网关) 请求。

    快速修复：

    1. 使用 WS URL：`ws://<host>:18789`（如果是 HTTPS 则为 `wss://...`）。
    2. 不要在普通浏览器标签页中打开 WS 端口。
    3. 如果开启了认证，请在 `connect` 帧中包含令牌/密码。

    如果您使用的是 CLI 或 TUI，URL 应该如下所示：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    协议详情：[Gateway(网关) 协议](/en/gateway/protocol)。

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

    服务/监管者日志（当 gateway 通过 launchd/systemd 运行时）：

    - macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（默认：`~/.openclaw/logs/...`；配置文件使用 `~/.openclaw-<profile>/logs/...`）
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    更多信息请参阅[故障排除](/en/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="如何启动/停止/重启 Gateway(网关) 服务？">
    使用 gateway 辅助工具：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手动运行 gateway，`openclaw gateway --force` 可以回收该端口。请参阅[Gateway(网关)](/en/gateway)。

  </Accordion>

  <Accordion title="我在 Windows 上关闭了终端 - 如何重启 OpenClaw？">
    有 **两种 Windows 安装模式**：

    **1) WSL2（推荐）：** Gateway(网关) 运行在 Linux 内部。

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

    文档：[Windows (WSL2)](/en/platforms/windows)，[Gateway(网关) 服务手册](/en/gateway)。

  </Accordion>

  <Accordion title="Gateway(网关) 已启动但从未收到回复。我应该检查什么？">
    首先进行快速健康检查：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常见原因：

    - **网关主机**上未加载模型认证（检查 `models status`）。
    - 渠道配对/允许列表阻止了回复（检查渠道配置 + 日志）。
    - WebChat/Dashboard 在没有正确令牌的情况下打开。

    如果您在远程，请确认隧道/Tailscale 连接已启动，并且
    Gateway(网关) WebSocket 是可访问的。

    文档：[渠道](/en/channels)、[故障排除](/en/gateway/troubleshooting)、[远程访问](/en/gateway/remote)。

  </Accordion>

  <Accordion title='"Disconnected from gateway: no reason" - 现在该怎么办？'>
    这通常意味着 UI 失去了 WebSocket 连接。检查：

    1. Gateway(网关) 是否正在运行？ `openclaw gateway status`
    2. Gateway(网关) 是否健康？ `openclaw status`
    3. UI 是否有正确的令牌？ `openclaw dashboard`
    4. 如果是远程，隧道/Tailscale 链接是否启动？

    然后查看日志：

    ```bash
    openclaw logs --follow
    ```

    文档：[Dashboard](/en/web/dashboard)、[远程访问](/en/gateway/remote)、[故障排除](/en/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失败。我应该检查什么？">
    首先检查日志和渠道状态：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然后对照错误信息：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 菜单项过多。OpenClaw 已经修剪到 Telegram 限制并使用较少的命令重试，但仍需要删除一些菜单项。减少插件/技能/自定义命令，或者如果不需要菜单，请禁用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或类似的网络错误：如果您在 VPS 上或位于代理后面，请确认允许出站 HTTPS 并且 DNS 适用于 `api.telegram.org`。

    如果 Gateway(网关) 是远程的，请确保您正在查看 Gateway(网关) 主机上的日志。

    文档：[Telegram](/en/channels/telegram)、[渠道故障排除](/en/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 没有显示输出。我应该检查什么？">
    首先确认 Gateway(网关) 是可达的，并且代理可以运行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 查看当前状态。如果您期望在聊天
    渠道中收到回复，请确保已启用投递 (`/deliver on`)。

    文档：[TUI](/en/web/tui)、[斜杠命令](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="我该如何完全停止然后启动 Gateway(网关)？">
    如果您安装了该服务：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    这将停止/启动**受监管的服务**（macOS 上的 launchd，Linux 上的 systemd）。
    当 Gateway(网关) 作为守护进程在后台运行时，请使用此方法。

    如果您在前台运行，请使用 Ctrl-C 停止，然后：

    ```bash
    openclaw gateway run
    ```

    文档：[Gateway(网关) 服务手册](/en/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: 重启 **后台服务** (launchd/systemd)。
    - `openclaw gateway`: 在此终端会话的 **前台** 运行网关。

    如果您安装了服务，请使用网关命令。当您想要运行一次前台任务时，请使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    使用 `--verbose` 启动 Gateway(网关) 以获取更多控制台详细信息。然后检查日志文件中的渠道认证、模型路由和 RPC 错误。
  </Accordion>
</AccordionGroup>

## 媒体和附件

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    代理发出的出站附件必须包含一行 `MEDIA:<path-or-url>`（单独占一行）。请参阅 [OpenClaw assistant setup](/en/start/openclaw) 和 [Agent send](/en/tools/agent-send)。

    CLI 发送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    另请检查：

    - 目标渠道支持出站媒体且未被允许列表阻止。
    - 文件在提供商的大小限制范围内（图像将被调整至最大 2048px）。
    - `tools.fs.workspaceOnly=true` 将本地路径发送限制在工作区、temp/media-store 和沙盒验证的文件内。
    - `tools.fs.workspaceOnly=false` 允许 `MEDIA:` 发送代理已经可以读取的主机本地文件，但仅限于媒体和安全文档类型（图像、音频、视频、PDF 和 Office 文档）。纯文本和类似机密的文件仍然被阻止。

    请参阅 [Images](/en/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全与访问控制

<AccordionGroup>
  <Accordion title="让 OpenClaw 接收入站私信是否安全？">
    将入站私信视为不受信任的输入。默认设置旨在降低风险：

    - 支持私信的渠道的默认行为是**配对 (pairing)**：
      - 未知发送者会收到配对码；机器人不会处理其消息。
      - 使用以下命令批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 待处理的请求限制为**每个渠道 3 个**；如果未收到配对码，请检查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公开开放私信需要显式选择加入（`dmPolicy: "open"` 和允许列表 `"*"`）。

    运行 `openclaw doctor` 以查找有风险的私信策略。

  </Accordion>

  <Accordion title="提示词注入 (Prompt injection) 只是公共机器人的问题吗？">
    不。提示词注入关乎**不受信任的内容**，而不仅仅是谁能给机器人发私信。
    如果你的助手读取外部内容（网络搜索/获取、浏览器页面、电子邮件、文档、附件、粘贴的日志），这些内容可能包含试图劫持模型的指令。即使**你是唯一的发送者**，这种情况也可能发生。

    最大的风险在于启用工具时：模型可能会被诱骗去泄露上下文或代表你调用工具。通过以下方式减小爆炸半径：

    - 使用只读或禁用工具的“读取器 (reader)”代理来总结不受信任的内容
    - 为启用工具的代理保持 `web_search` / `web_fetch` / `browser` 关闭状态
    - 沙箱隔离和严格的工具允许列表

    详情：[安全](/en/gateway/security)。

  </Accordion>

  <Accordion title="我的机器人应该拥有自己的电子邮件、GitHub 账户或电话号码吗？">
    是的，对于大多数设置而言。使用单独的账户和电话号码隔离机器人可以在出现问题时减小爆炸半径。这也使得轮换凭证或撤销访问权限更容易，而不会影响你的个人账户。

    从小处着手。仅授予你实际需要的工具和账户的访问权限，并在需要时再进行扩展。

    文档：[安全](/en/gateway/security)、[配对](/en/channels/pairing)。

  </Accordion>

  <Accordion title="我可以让它完全自主控制我的短信吗？这样做安全吗？">
    我们**不**建议让它完全自主控制您的个人消息。最安全的模式是：

    - 将私信保持在**配对模式**或严格的允许列表中。
    - 如果您希望它代表您发送消息，请使用**单独的电话号码或帐户**。
    - 让它起草草稿，然后在发送前**审核批准**。

    如果您想进行实验，请在专用帐户上进行，并保持隔离。请参阅
    [Security](/en/gateway/security)。

  </Accordion>

<Accordion title="我可以在个人助理任务中使用更便宜的模型吗？">可以，**前提是**代理仅用于聊天且输入内容可信。较小的层级更容易受到指令劫持，因此对于启用了工具的代理或在读取不受信任的内容时，应避免使用它们。如果您必须使用较小的模型，请锁定工具并在沙盒中运行。请参阅 [Security](/en/gateway/security)。</Accordion>

  <Accordion title="我在 Telegram 中运行了 /start 但没有收到配对代码">
    配对代码**仅**在未知发送者向机器人发送消息并且
    `dmPolicy: "pairing"` 被启用时发送。`/start` 本身不会生成代码。

    检查待处理的请求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您希望立即获得访问权限，请将您的发送者 ID 加入允许列表，或为该帐户设置 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它会给我的联系人发消息吗？配对是如何工作的？">
    不会。默认的 WhatsApp 私信策略是**配对**。未知发送者只会收到配对代码，且其消息**不会被处理**。OpenClaw 只回复它收到的聊天，或回复您触发的显式发送。

    使用以下命令批准配对：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待处理的请求：

    ```bash
    openclaw pairing list whatsapp
    ```

    向导电话号码提示：它用于设置您的**允许列表/所有者**，以便允许您自己的私信。它不用于自动发送。如果您在个人 WhatsApp 号码上运行，请使用该号码并启用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天命令、中止任务和“它无法停止”

<AccordionGroup>
  <Accordion title="如何阻止内部系统消息在聊天中显示？">
    大多数内部或工具消息仅当该会话启用了 **verbose** 或 **reasoning** 时才会出现。

    在出现该问题的聊天中进行修复：

    ```
    /verbose off
    /reasoning off
    ```

    如果仍然很嘈杂，请在控制 UI 中检查会话设置并将 verbose 设置为 **inherit**。同时请确认您没有在配置中使用了 `verboseDefault` 设置为 `on` 的机器人配置文件。

    文档：[Thinking and verbose](/en/tools/thinking)，[Security](/en/gateway/security#reasoning-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在运行的任务？">
    发送以下任何一条**作为独立消息**（无斜杠）：

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

    斜杠命令概述：请参阅 [Slash commands](/en/tools/slash-commands)。

    大多数命令必须作为以 `/` 开头的**独立**消息发送，但少数快捷方式（如 `/status`）对于白名单发送者也可以内联工作。

  </Accordion>

  <Accordion title='如何从 Discord 发送 Telegram 消息？（“Cross-context messaging denied”）'>
    OpenClaw 默认阻止**跨提供商**消息传递。如果工具调用绑定到 Telegram，除非您明确允许，否则它不会发送到 Discord。

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

  <Accordion title='为什么感觉机器人会“忽略”连珠炮式的消息？'>
    队列模式控制新消息如何与正在进行的运行交互。使用 `/queue` 切换模式：

    - `steer` - 新消息重定向当前任务
    - `followup` - 每次运行一条消息
    - `collect` - 批量消息并回复一次（默认）
    - `steer-backlog` - 立即引导，然后处理积压
    - `interrupt` - 中止当前运行并重新开始

    您可以为后续模式添加 `debounce:2s cap:25 drop:summarize` 等选项。

  </Accordion>
</AccordionGroup>

## 杂项

<AccordionGroup>
  <Accordion title="使用 API 密钥时 Anthropic 的默认模型是什么？">
    在 OpenClaw 中，凭据和模型选择是分开的。设置 `ANTHROPIC_API_KEY`（或在身份验证配置文件中存储 Anthropic API 密钥）可以启用身份验证，但实际的默认模型取决于您在 `agents.defaults.model.primary` 中的配置（例如，`anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，这意味着 Gateway(网关) 无法在正在运行的代理的预期
    `auth-profiles.json` 中找到 Anthropic 凭据。
  </Accordion>
</AccordionGroup>

---

还是卡住了？请在 [Discord](https://discord.com/invite/clawd) 中提问，或在 GitHub 上发起 [discussion](https://github.com/openclaw/openclaw/discussions)。
