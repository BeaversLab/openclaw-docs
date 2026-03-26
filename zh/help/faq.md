---
summary: "关于 OpenClaw 设置、配置和使用的常见问题"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常见问题"
---

# 常见问题

针对真实环境设置（本地开发、VPS、多代理、OAuth/API 密钥、模型故障转移）的快速解答及更深入的故障排除。有关运行时诊断，请参阅 [故障排除](/zh/gateway/troubleshooting)。有关完整的配置参考，请参阅 [配置](/zh/gateway/configuration)。

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

   运行网关健康检查 + 提供商探测（需要可访问的网关）。请参阅 [健康检查](/zh/gateway/health)。

5. **跟踪最新日志**

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

   修复/迁移配置/状态并运行健康检查。请参阅 [医生](/zh/gateway/doctor)。

7. **Gateway(网关) 快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向运行的网关请求完整快照（仅限 WS）。请参阅 [健康检查](/zh/gateway/health)。

## 快速开始和首次运行设置

<AccordionGroup>
  <Accordion title="我遇到了困难，最快解决问题的方式">
    使用一个可以**查看您的机器**的本地 AI 代理。这比在 Discord 上询问要有效得多，因为大多数“我遇到了困难”的情况都是**本地配置或环境问题**，远程助手无法检查这些问题。

    - **Claude Code**：[https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**：[https://openai.com/codex/](https://openai.com/codex/)

    这些工具可以读取仓库、运行命令、检查日志，并帮助修复您的机器级设置（PATH、服务、权限、认证文件）。通过可黑客（git）安装为他们提供**完整的源代码检出**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这会**从 git 检出**安装 OpenClaw，因此代理可以读取代码和文档，并推断您正在运行的确切版本。您可以稍后通过不使用 `--install-method git` 重新运行安装程序，随时切换回稳定版本。

    提示：要求代理**计划并监督**修复（分步进行），然后仅执行必要的命令。这会使更改保持较小且易于审计。

    如果您发现了真正的错误或修复方法，请在 GitHub 上提交 issue 或发送 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    从这些命令开始（寻求帮助时分享输出）：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它们的作用：

    - `openclaw status`：网关/代理健康状况和基本配置的快速快照。
    - `openclaw models status`：检查提供商认证和模型可用性。
    - `openclaw doctor`：验证并修复常见的配置/状态问题。

    其他有用的 CLI 检查：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    快速调试循环：[First 60 seconds if something is broken](#first-60-seconds-if-something-is-broken)。
    安装文档：[Install](/zh/install)、[Installer flags](/zh/install/installer)、[Updating](/zh/install/updating)。

  </Accordion>

  <Accordion title="OpenClaw 的推荐安装和设置方式">
    该仓库推荐从源代码运行并使用新手引导：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    向导还可以自动构建 UI 资源。在新手引导完成后，通常在端口 **18789** 上运行 Gateway(网关)。

    从源代码运行（贡献者/开发人员）：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build # auto-installs UI deps on first run
    openclaw onboard
    ```

    如果您尚未进行全局安装，请通过 `pnpm openclaw onboard` 运行。

  </Accordion>

<Accordion title="新手引导后如何打开仪表板？">
  向导会在新手引导完成后立即在浏览器中打开一个干净的（非令牌化）仪表板 URL，
  并在摘要中打印该链接。请保持该标签页打开；如果它没有启动，请在同一台机器上复制/粘贴 打印出的 URL。
</Accordion>

  <Accordion title="如何在本地主机与远程主机上对仪表板（令牌）进行身份验证？">
    **本地主机（同一台机器）：**

    - 打开 `http://127.0.0.1:18789/`。
    - 如果要求进行身份验证，请将 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）中的令牌粘贴到 Control UI 设置中。
    - 从 Gateway(网关) 主机获取它：`openclaw config get gateway.auth.token`（或生成一个：`openclaw doctor --generate-gateway-token`）。

    **不在本地主机上：**

    - **Tailscale Serve**（推荐）：保持绑定回环，运行 `openclaw gateway --tailscale serve`，打开 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 为 `true`，身份标头满足 Control UI/WebSocket 身份验证（无需令牌，假设受信任的 Gateway(网关) 主机）；HTTP API 仍需令牌/密码。
    - **Tailnet bind**：运行 `openclaw gateway --bind tailnet --token "<token>"`，打开 `http://<tailscale-ip>:18789/`，在仪表板设置中粘贴令牌。
    - **SSH tunnel**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/` 并在 Control UI 设置中粘贴令牌。

    有关绑定模式和身份验证的详细信息，请参阅 [仪表板](/zh/web/dashboard) 和 [Web 表面](/zh/web)。

  </Accordion>

  <Accordion title="我需要什么运行时？">
    需要 Node **>= 22**。推荐使用 `pnpm`。不推荐为 Bun 使用 Gateway(网关)。
  </Accordion>

  <Accordion title="它可以在 Raspberry Pi 上运行吗？">
    是的。Gateway(网关) 很轻量 - 文档列出 **512MB-1GB RAM**、**1 核** 和大约 **500MB**
    磁盘空间就足以满足个人使用，并注明 **Raspberry Pi 4 可以运行它**。

    如果你需要额外的余量（日志、媒体、其他服务），推荐 **2GB**，但这
    不是硬性最低要求。

    提示：一个小型的 Pi/VPS 可以托管 Gateway(网关)，你可以将笔记本电脑/手机上的 **节点** 与其配对，
    用于本地屏幕/摄像头/画布或命令执行。参见 [节点](/zh/nodes)。

  </Accordion>

  <Accordion title="关于 Raspberry Pi 安装有什么提示吗？">
    简单来说：它可以用，但要注意可能会有一些粗糙的边缘。

    - 使用 **64 位** 操作系统并保持 Node >= 22。
    - 优先选择 **可破解的 (git) 安装**，以便你可以查看日志并快速更新。
    - 先不要启用 channels/skills，然后逐个添加它们。
    - 如果你遇到奇怪的二进制问题，这通常是一个 **ARM 兼容性** 问题。

    文档：[Linux](/zh/platforms/linux)、[安装](/zh/install)。

  </Accordion>

  <Accordion title="它卡在唤醒我的朋友 / 新手引导无法孵化。现在怎么办？">
    该屏幕取决于 Gateway(网关) 是否可达以及是否已通过身份验证。TUI 也会在首次孵化时
    自动发送“Wake up, my friend!”。如果你看到那行字却 **没有回复**
    且 token 数量保持在 0，说明代理从未运行。

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

    3. 如果仍然卡住，请运行：

    ```bash
    openclaw doctor
    ```

    如果 Gateway(网关) 是远程的，请确保隧道/Tailscale 连接正常，并且 UI
    指向正确的 Gateway(网关)。参见 [远程访问](/zh/gateway/remote)。

  </Accordion>

  <Accordion title="我可以在不重新进行新手引导的情况下将设置迁移到新机器（Mac mini）吗？">
    可以。复制 **状态目录 (state directory)** 和 **工作区 (workspace)**，然后运行一次 Doctor。这
    能让您的机器人保持“完全一致”（内存、会话历史、认证和渠道
    状态），前提是您复制了 **这两个** 位置：

    1. 在新机器上安装 OpenClaw。
    2. 从旧机器复制 `$OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）。
    3. 复制您的工作区（默认：`~/.openclaw/workspace`）。
    4. 运行 `openclaw doctor` 并重启 Gateway(网关) 服务。

    这将保留配置、认证配置文件、WhatsApp 凭据、会话和内存。如果您处于
    远程模式，请记住网关主机拥有会话存储和工作区。

    **重要提示：**如果您仅将工作区提交/推送到 GitHub，您备份的是
    **内存 + 引导文件**，但 **不包含** 会话历史或认证信息。这些内容位于
    `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    相关：[迁移](/zh/install/migrating)、[磁盘文件位置](#where-things-live-on-disk)、
    [代理工作区](/zh/concepts/agent-workspace)、[Doctor](/zh/gateway/doctor)、
    [远程模式](/zh/gateway/remote)。

  </Accordion>

  <Accordion title="我在哪里可以看到最新版本的更新内容？">
    查看 GitHub 变更日志：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新的条目位于顶部。如果顶部部分标记为 **Unreleased**（未发布），则下一个带日期的
    部分是最新发布的版本。条目按 **Highlights**（亮点）、**Changes**（变更）和
    **Fixes**（修复）分组（必要时还包括文档/其他部分）。

  </Accordion>

  <Accordion title="无法访问 docs.openclaw.ai（SSL 错误）">
    部分 Comcast/Xfinity 连接通过 Xfinity 高级安全功能错误地阻止了 `docs.openclaw.ai`。请禁用它或将 `docs.openclaw.ai` 加入白名单，然后重试。更多详情：[故障排除](/zh/help/faq#docsopenclawai-shows-an-ssl-error-comcast-xfinity)。
    请通过在此处报告来帮助我们解除封锁：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果您仍然无法访问该站点，文档已在 GitHub 上镜像：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="稳定版 和 Beta 版的区别">
    **Stable** 和 **beta** 是 **npm dist-tags**，而不是独立的代码行：

    - `latest` = stable
    - `beta` = early build for testing

    我们将构建版本发布到 **beta**，进行测试，一旦构建版本稳定，我们就会 **将该相同版本提升至 `latest`**。这就是 beta 和 stable 可以指向 **同一版本** 的原因。

    查看变更内容：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

  </Accordion>

  <Accordion title="如何安装 Beta 版，Beta 版和 Dev 版有什么区别？">
    **Beta** 是 npm dist-tag `beta`（可能匹配 `latest`）。
    **Dev** 是 `main` (git) 的移动头指针；发布时，它使用 npm dist-tag `dev`。

    单行命令 (macOS/Linux)：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安装程序 (PowerShell)：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多详情：[开发渠道](/zh/install/development-channels) 和 [安装程序标志](/zh/install/installer)。

  </Accordion>

  <Accordion title="如何试用最新版本？">
    有两种选择：

    1. **开发渠道（git checkout）：**

    ```bash
    openclaw update --channel dev
    ```

    这会切换到 `main` 分支并从源代码更新。

    2. **可修改安装（来自安装程序网站）：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这会为您提供一个可以编辑的本地仓库，然后通过 git 更新。

    如果您更喜欢手动进行干净的克隆，请使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文档：[更新](/zh/cli/update)、[开发渠道](/zh/install/development-channels)、
    [安装](/zh/install)。

  </Accordion>

  <Accordion title="安装和引导通常需要多长时间？">
    大致指南：

    - **安装：** 2-5 分钟
    - **新手引导：** 5-15 分钟，具体取决于您配置的渠道/模型数量

    如果卡住了，请使用 [安装程序卡住](#quick-start-and-first-run-setup)
    以及 [我卡住了](#quick-start-and-first-run-setup) 中的快速调试循环。

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

    对于可修改（git）安装：

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
    Windows 上常见的两个问题：

    **1) npm 错误 spawn git / 找不到 git**

    - 安装 **Git for Windows** 并确保 `git` 在您的 PATH 环境变量中。
    - 关闭并重新打开 PowerShell，然后重新运行安装程序。

    **2) 安装后无法识别 openclaw**

    - 您的 npm 全局 bin 文件夹不在 PATH 环境变量中。
    - 检查路径：

      ```powershell
      npm config get prefix
      ```

    - 将该目录添加到您的用户 PATH 中（在 Windows 上不需要 `\bin` 后缀；在大多数系统上它是 `%AppData%\npm`）。
    - 更新 PATH 后，关闭并重新打开 PowerShell。

    如果您希望获得最流畅的 Windows 体验，请使用 **WSL2** 而不是原生 Windows。
    文档：[Windows](/zh/platforms/windows)。

  </Accordion>

  <Accordion title="Windows 执行输出显示乱码中文 - 我该怎么办？">
    这通常是由于原生 Windows Shell 上的控制台代码页不匹配导致的。

    症状：

    - `system.run`/`exec` 输出将中文渲染为乱码
    - 同一条命令在另一个终端配置文件中看起来正常

    PowerShell 中的快速解决方法：

    ```powershell
    chcp 65001
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ```

    然后重启 Gateway 并重试您的命令：

    ```powershell
    openclaw gateway restart
    ```

    如果您在最新的 OpenClaw 上仍然遇到此问题，请在以下位置跟踪/报告：

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="文档没有回答我的问题 - 我该如何获得更好的答案？">
    使用 **可破解的 安装**，以便您在本地拥有完整的源代码和文档，然后在该文件夹中向您的机器人（或 Claude/Codex）提问，以便它可以读取代码库并准确回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多详情：[安装](/zh/install) 和 [安装程序标志](/zh/install/installer)。

  </Accordion>

  <Accordion title="如何在 OpenClaw 上安装 Linux？">
    简短回答：遵循 Linux 指南，然后运行 新手引导。

    - Linux 快速路径 + 服务安装：[Linux](/zh/platforms/linux)。
    - 完整演练：[入门指南](/zh/start/getting-started)。
    - 安装程序 + 更新：[安装与更新](/zh/install/updating)。

  </Accordion>

  <Accordion title="如何在 VPS 上安装 OpenClaw？">
    任何 Linux VPS 均可。在服务器上安装，然后使用 SSH/Tailscale 连接 Gateway(网关)。

    指南：[exe.dev](/zh/install/exe-dev)、[Gateway(网关)](/zh/install/hetzner)、[Hetzner](/zh/install/fly)。
    远程访问：[Gateway(网关) remote](/zh/gateway/remote)。

  </Accordion>

  <Accordion title="云/VPS 安装指南在哪里？">
    我们维护了一个包含常用提供商的 **hosting hub**。选择一个并遵循指南：

    - [VPS 托管](/zh/vps)（所有提供商汇总）
    - [Fly.io](/zh/install/fly)
    - [Hetzner](/zh/install/hetzner)
    - [exe.dev](/zh/install/exe-dev)

    云端工作原理：**Gateway(网关) 在服务器上运行**，您通过控制 UI（或 Tailscale/SSH）从笔记本/手机访问它。您的状态 + 工作区位于服务器上，因此请将主机视为真实来源并进行备份。

    您可以将 **nodes**（Mac/Gateway(网关)/Tailscale/headless）与该云端 Gateway(网关) 配对，以便访问本地屏幕/摄像头/画布或在笔记本电脑上运行命令，同时将 Gateway(网关) 保留在云端。

    Hub：[Platforms](/zh/platforms)。远程访问：[Gateway(网关) remote](/zh/gateway/remote)。
    Nodes：[Nodes](/zh/nodes)、[Nodes CLI](/zh/cli/nodes)。

  </Accordion>

  <Accordion title="我可以要求 OpenClaw 更新自己吗？">
    简短回答：**可行，但不推荐**。更新流程可能会重启
    Gateway（这会断开当前会话），可能需要干净的 git checkout，并且
    可能会提示进行确认。更安全的做法：以操作员身份从 shell 运行更新。

    使用 CLI：

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel stable|beta|dev
    openclaw update --tag <dist-tag|version>
    openclaw update --no-restart
    ```

    如果您必须通过代理自动执行此操作：

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    文档：[更新](/zh/cli/update), [更新中](/zh/install/updating)。

  </Accordion>

  <Accordion title="新手引导实际上做什么？">
    `openclaw onboard` 是推荐的设置路径。在 **本地模式** 下，它会引导您完成：

    - **模型/认证设置**（支持提供商 OAuth/setup-token 流程和 API 密钥，以及本地模型选项，如 LM Studio）
    - **工作区**位置 + 引导文件
    - **Gateway 设置**（绑定/端口/认证/tailscale）
    - **提供商**（WhatsApp、Telegram、Discord、Mattermost（插件）、Signal、iMessage）
    - **守护进程安装**（macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd 用户单元）
    - **健康检查**和 **技能**选择

    如果您配置的模型未知或缺少认证，它也会发出警告。

  </Accordion>

  <Accordion title="运行此程序需要 Claude 或 OpenAI 订阅吗？">
    不需要。您可以使用 **API 密钥**（Anthropic/OpenAI/其他）或仅使用
    **本地模型**来运行 OpenClaw，这样您的数据将保留在您的设备上。订阅（Claude
    Pro/Max 或 OpenAI Codex）是验证这些提供商的可选方式。

    如果您选择 Anthropic 订阅认证，请自行决定是否使用：
    Anthropic 过去曾在 Claude Code 之外阻止部分订阅使用。
    OpenAI Codex OAuth 明确支持像 OpenClaw 这样的外部工具。

    文档：[Anthropic](/zh/providers/anthropic), [OpenAI](/zh/providers/openai),
    [本地模型](/zh/gateway/local-models), [模型](/zh/concepts/models)。

  </Accordion>

  <Accordion title="我可以在没有 API 密钥的情况下使用 Claude Max 订阅吗？">
    是的。您可以使用 **setup-token**（设置令牌）
    而不是 API 密钥进行身份验证。这是订阅的路径。

    Claude Pro/Max 订阅 **不包括 API 密钥**，因此这是
    订阅账户的技术路径。但这取决于您的决定：Anthropic
    过去曾阻止了一些在 Claude Code 之外的订阅使用。
    如果您想要用于生产环境的最清晰、最安全的支持路径，请使用 Anthropic API 密钥。

  </Accordion>

<Accordion title="Anthropic setup-token 身份验证是如何工作的？">
  `claude setup-token` 通过 Claude Code CLI 生成一个 **token string**（令牌字符串）（它在 Web
  控制台中不可用）。您可以在 **any machine**（任何机器）上运行它。在新手引导过程中选择 **Anthropic
  token (paste setup-token)** 或使用 `openclaw models auth paste-token --提供商 anthropic`
  粘贴它。该令牌存储为 **anthropic** 提供商的身份验证配置文件，并像 API
  密钥一样使用（不会自动刷新）。更多详情：[OAuth](/zh/concepts/oauth)。
</Accordion>

  <Accordion title="我在哪里可以找到 Anthropic setup-token？">
    它 **不** 在 Anthropic 控制台中。setup-token 是由 **any machine**（任何机器）上的 **Claude Code CLI**
    生成的：

    ```bash
    claude setup-token
    ```

    复制它打印的令牌，然后在新手引导过程中选择 **Anthropic token (paste setup-token)**。如果您想在网关主机上运行它，请使用 `openclaw models auth setup-token --provider anthropic`。如果您在其他地方运行了 `claude setup-token`，请使用 `openclaw models auth paste-token --provider anthropic` 将其粘贴到网关主机上。请参阅 [Anthropic](/zh/providers/anthropic)。

  </Accordion>

  <Accordion title="您是否支持 Claude 订阅身份验证（Claude Pro 或 Max）？">
    是的 - 通过 **setup-token**。OpenClaw 不再复用 Claude Code CLI OAuth 令牌；请使用 setup-token 或 Anthropic API 密钥。在任何地方生成令牌并将其粘贴到网关主机上。请参阅 [Anthropic](/zh/providers/anthropic) 和 [OAuth](/zh/concepts/oauth)。

    重要提示：这只是技术兼容性，而非政策保证。Anthropic
    过去曾阻止 Claude Code 之外的某些订阅使用。
    您需要决定是否使用它并验证 Anthropic 的当前条款。
    对于生产或多用户工作负载，Anthropic API 密钥身份验证是更安全、更推荐的选择。

  </Accordion>

  <Accordion title="为什么我会收到来自 Anthropic 的 HTTP 429 rate_limit_error？">
    这意味着您当前时间窗口的 **Anthropic 配额/速率限制** 已用尽。如果您
    使用的是 **Claude 订阅** (setup-token)，请等待时间窗口
    重置或升级您的计划。如果您使用的是 **Anthropic API 密钥**，请检查 Anthropic 控制台
    的使用情况/计费，并根据需要提高限制。

    如果消息具体是：
    `Extra usage is required for long context requests`，则表明该请求正尝试使用
    Anthropic 的 1M 上下文测试版 (`context1m: true`)。这仅在您的
    凭证有资格进行长上下文计费（API 密钥计费或启用了额外使用的订阅）
    时才有效。

    提示：设置一个 **备用模型**，以便在 OpenClaw 在提供商受速率限制时仍能继续回复。
    请参阅 [模型](/zh/cli/models)、[OAuth](/zh/concepts/oauth) 和
    [/gateway/故障排除#anthropic-429-extra-usage-required-for-long-context](/zh/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

<Accordion title="是否支持 AWS Bedrock？">
  是的 - 通过 pi-ai 的 **Amazon Bedrock (Converse)** 提供商使用**手动配置**。您必须 在网关主机上提供
  AWS 凭证/区域，并在您的模型配置中添加 Bedrock 提供商条目。 请参阅 [Amazon
  Bedrock](/zh/providers/bedrock) 和 [Model providers](/zh/providers/models)。如果您
  偏好托管密钥流程，在 Bedrock 前面使用一个兼容 OpenAI 的代理仍然是一个有效的选项。
</Accordion>

<Accordion title="Codex 认证如何工作？">
  OpenClaw 通过 OpenAI（ChatGPT 登录）支持 **OAuth Code (Codex)**。新手引导可以运行 OAuth
  流程，并在适当时将默认模型设置为 `openai-codex/gpt-5.4`。请参阅 [Model
  providers](/zh/concepts/模型-providers) 和 [新手引导 (CLI)](/zh/start/wizard)。
</Accordion>

  <Accordion title="您是否支持 OpenAI 订阅认证 (Codex OAuth)？">
    是的。OpenClaw 完全支持 **OpenAI Code (Codex) 订阅 OAuth**。
    OpenAI 明确允许在外部工具/工作流（如 OAuth）中使用订阅 OpenClaw。
    新手引导可以为您运行 OAuth 流程。

    请参阅 [OAuth](/zh/concepts/oauth)、[Model providers](/zh/concepts/model-providers) 和 [新手引导 (CLI)](/zh/start/wizard)。

  </Accordion>

  <Accordion title="如何设置 Gemini CLI OAuth？">
    Gemini CLI 使用的是**插件认证流程**，而不是 `openclaw.json` 中的客户端 ID 或密钥。

    步骤：

    1. 启用插件：`openclaw plugins enable google`
    2. 登录：`openclaw models auth login --provider google-gemini-cli --set-default`

    这会将 OAuth 令牌存储在网关主机上的认证配置文件中。详情：[Model providers](/zh/concepts/model-providers)。

  </Accordion>

<Accordion title="本地模型适合用于日常聊天吗？">
  通常不适合。OpenClaw 需要大上下文 + 强安全性；小显卡会导致截断和泄露。如果您
  必须使用，请在本地运行您能运行的 **最大** 的 MiniMax M2.5 版本（通过 LM Studio），并参阅
  [/gateway/local-models](/zh/gateway/local-models)。更小/量化的模型会增加 提示注入风险 - 请参阅
  [安全性](/zh/gateway/security)。
</Accordion>

<Accordion title="如何将托管模型流量保留在特定区域？">
  选择区域固定端点。OpenRouter 提供了 MiniMax、Kimi 和 GLM 的美国托管选项；
  选择美国托管变体可将数据保留在区域内。您仍然可以通过使用 `models.mode: "merge"` 将
  Anthropic/OpenAI 与 这些一起列出，以便在选择区域化提供商的同时保持备用可用。
</Accordion>

  <Accordion title="我必须购买 Mac Mini 才能安装这个吗？">
    不需要。OpenClaw 运行在 macOS 或 Linux 上（Windows 通过 WSL2）。Mac mini 是可选的 - 有些人
    购买它作为常驻主机，但小型 VPS、家庭服务器或 Raspberry Pi 级别的盒子也可以工作。

    您只需要一台 Mac **来使用仅 macOS 的工具**。对于 iMessage，请使用 [BlueBubbles](/zh/channels/bluebubbles)（推荐） - BlueBubbles 服务器运行在任何 Mac 上，而 Gateway(网关) 可以运行在 Linux 或其他地方。如果您想使用其他仅 macOS 的工具，请在 Mac 上运行 Gateway(网关) 或配对 macOS 节点。

    文档：[BlueBubbles](/zh/channels/bluebubbles)、[节点](/zh/nodes)、[Mac 远程模式](/zh/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我是否需要 Mac mini 来支持 iMessage？">
    你需要**一台登录了 Messages 的 macOS 设备**。它**不必**是 Mac mini ——
    任何 Mac 都可以。**使用 [BlueBubbles](/zh/channels/bluebubbles)**（推荐）来使用 iMessage —— BlueBubbles 服务器运行在 macOS 上，而 Gateway 可以运行在 Linux 或其他地方。

    常见设置：

    - 在 Linux/VPS 上运行 Gateway，并在任何登录了 Messages 的 Mac 上运行 BlueBubbles 服务器。
    - 如果你想要最简单的单机设置，可以在 Mac 上运行所有内容。

    文档：[BlueBubbles](/zh/channels/bluebubbles)、[Nodes](/zh/nodes)、
    [Mac 远程模式](/zh/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我购买 Mac mini 来运行 OpenClaw，我可以将其连接到我的 MacBook Pro 吗？">
    可以。**Mac mini 可以运行 Gateway**，而你的 MacBook Pro 可以作为
    **节点**（companion device）连接。节点不运行 Gateway —— 它们提供
    额外功能，如该设备上的屏幕/摄像头/画布和 `system.run`。

    常见模式：

    - Gateway 在 Mac mini 上运行（始终在线）。
    - MacBook Pro 运行 macOS 应用程序或节点主机并配对到 Gateway。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 进行查看。

    文档：[Nodes](/zh/nodes)、[Nodes CLI](/zh/cli/nodes)。

  </Accordion>

  <Accordion title="我可以使用 Bun 吗？">
    **不推荐**使用 Bun。我们发现了运行时错误，特别是在使用 WhatsApp 和 Telegram 时。
    请使用 **Node** 来获得稳定的 Gateway。

    如果你仍然想尝试 Bun，请在非生产环境的 Gateway 上进行
    且不要配置 WhatsApp/Telegram。

  </Accordion>

  <Accordion title="Telegram：allowFrom 中填什么？">
    `channels.telegram.allowFrom` 是 **人类发送者的 Telegram 用户 ID**（数字）。它不是机器人用户名。

    新手引导接受 `@username` 输入并将其解析为数字 ID，但 OpenClaw 授权仅使用数字 ID。

    更安全（无第三方机器人）：

    - 私信（私信）你的机器人，然后运行 `openclaw logs --follow` 并读取 `from.id`。

    官方 Bot API：

    - 私信（私信）你的机器人，然后调用 `https://api.telegram.org/bot<bot_token>/getUpdates` 并读取 `message.from.id`。

    第三方（隐私性较差）：

    - 私信（私信） `@userinfobot` 或 `@getidsbot`。

    请参阅 [/channels/telegram](/zh/channels/telegram#access-control-and-activation)。

  </Accordion>

<Accordion title="多个人可以使用一个 WhatsApp 号码搭配不同的 OpenClaw 实例吗？">
  可以，通过 **多代理路由**。将每个发送者的 WhatsApp **私信（私信）**（对等方 `kind: "direct"`，
  发送者 E.164 如 `+15551234567`）绑定到不同的 `agentId`，这样每个人都可以获得自己的
  工作区和会话存储。回复仍然来自 **同一个 WhatsApp 账户**，且私信访问
  控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）是针对每个 WhatsApp
  账户全局生效的。请参阅 [多代理路由](/zh/concepts/multi-agent) 和
  [WhatsApp](/zh/channels/whatsapp)。
</Accordion>

<Accordion title="我可以运行一个“快速聊天”代理和一个“用于编码的 Opus”代理吗？">
  可以。使用多代理路由：为每个代理指定其默认模型，然后将入站路由
  （提供商账户或特定对等方）绑定到每个代理。示例配置位于 [多代理
  路由](/zh/concepts/multi-agent)。另请参阅 [模型](/zh/concepts/models) 和
  [配置](/zh/gateway/configuration)。
</Accordion>

  <Accordion title="Homebrew 可以在 Linux 上运行吗？">
    是的。Homebrew 支持 Linux (Linuxbrew)。快速设置：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果你通过 systemd 运行 OpenClaw，请确保服务 PATH 包含 `/home/linuxbrew/.linuxbrew/bin`（或你的 brew 前缀），以便 `brew` 安装的工具在非登录 shell 中能被解析。
    最近的版本还会在 Linux systemd 服务中添加常见的用户 bin 目录（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），并在设置时遵守 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可黑客定制的 git 安装与 npm 安装的区别">
    - **可黑客定制 (git) 安装：** 完整的源代码检出，可编辑，最适合贡献者。
      你在本地运行构建，并且可以修补代码/文档。
    - **npm 安装：** 全局 CLI 安装，不包含仓库，最适合“直接运行”。
      更新来自 npm dist-tags。

    文档：[入门指南](/zh/start/getting-started)，[更新](/zh/install/updating)。

  </Accordion>

  <Accordion title="我以后可以在 npm 和 git 安装之间切换吗？">
    是的。安装另一种版本，然后运行 Doctor，以便网关服务指向新的入口点。
    这**不会删除你的数据**——它只更改 OpenClaw 代码安装。你的状态
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

    Doctor 会检测网关服务入口点不匹配，并提供重写服务配置以匹配当前安装（在自动化中使用 `--repair`）。

    备份提示：参见 [备份策略](#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="我应该在我的笔记本电脑还是 VPS 上运行 Gateway(网关)？">
    简短回答：**如果你想要 24/7 的稳定性，请使用 VPS**。如果你希望
    最低程度的麻烦，并且不介意休眠/重启，可以在本地运行。

    **笔记本电脑（本地 Gateway(网关)）**

    - **优点：** 无服务器成本，直接访问本地文件，实时浏览器窗口。
    - **缺点：** 休眠/网络掉线 = 断开连接，系统更新/重启会中断，必须保持唤醒。

    **VPS / 云端**

    - **优点：** 始终在线，网络稳定，无笔记本电脑休眠问题，更容易保持运行。
    - **缺点：** 通常无头运行（使用截图），只能远程访问文件，必须通过 SSH 进行更新。

    **OpenClaw 特别说明：** WhatsApp/Telegram/Slack/Mattermost（插件）/Discord 都可以在 VPS 上正常运行。唯一真正的权衡是 **无头浏览器** 与可见窗口的对比。请参阅 [Browser](/zh/tools/browser)。

    **推荐的默认设置：** 如果你之前遇到过 Gateway(网关) 断开连接的情况，请使用 VPS。当你正在积极使用 Mac 并希望访问本地文件或使用可见浏览器进行 UI 自动化时，本地运行非常棒。

  </Accordion>

  <Accordion title="在专用机器上运行 OpenClaw 有多重要？">
    不是必须的，但 **为了可靠性和隔离性，建议这样做**。

    - **专用主机（VPS/Mac mini/Pi）：** 始终在线，较少因休眠/重启而中断，权限更清晰，更容易保持运行。
    - **共享笔记本电脑/台式机：** 用于测试和主动使用完全没问题，但请预见到在机器休眠或更新时会出现暂停。

    如果你想要两全其美，请将 Gateway(网关) 保留在专用主机上，并将你的笔记本电脑作为 **节点（node）** 配对，以使用本地屏幕/摄像头/执行工具。请参阅 [Nodes](/zh/nodes)。
    有关安全指导，请阅读 [Security](/zh/gateway/security)。

  </Accordion>

  <Accordion title="最低的 VPS 要求和推荐的操作系统是什么？">
    OpenClaw 是轻量级的。对于基本的 Gateway(网关) + 一个聊天渠道：

    - **绝对最低配置：** 1 vCPU，1GB RAM，约 500MB 磁盘空间。
    - **推荐配置：** 1-2 vCPU，2GB RAM 或更多以预留余量（日志、媒体、多个渠道）。Node 工具和浏览器自动化可能会消耗较多资源。

    操作系统：使用 **Ubuntu LTS**（或任何现代 Debian/Ubuntu）。Linux 安装路径在那里经过了最充分的测试。

    文档：[Linux](/zh/platforms/linux)、[VPS 托管](/zh/vps)。

  </Accordion>

  <Accordion title="我可以在虚拟机中运行 OpenClaw 吗，有什么要求？">
    可以。像对待 VPS 一样对待虚拟机：它需要保持开机、可访问，并具有足够的 RAM 来运行 Gateway(网关) 和您启用的任何渠道。

    基本指导原则：

    - **绝对最低配置：** 1 vCPU，1GB RAM。
    - **推荐配置：** 2GB RAM 或更多，如果您运行多个渠道、浏览器自动化或媒体工具。
    - **操作系统：** Ubuntu LTS 或其他现代 Debian/Ubuntu。

    如果您使用的是 Windows，**WSL2 是最简单的虚拟机风格设置**，并且具有最佳的工具兼容性。请参阅 [Windows](/zh/platforms/windows)、[VPS 托管](/zh/vps)。
    如果您在虚拟机中运行 macOS，请参阅 [macOS VM](/zh/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 什么是 OpenClaw？

<AccordionGroup>
  <Accordion title="用一段话概括，什么是 OpenClaw？">
    OpenClaw 是一个您在自己的设备上运行的个人 AI 助手。它会在您已经使用的消息界面上回复（WhatsApp、Telegram、Slack、Mattermost（插件）、Discord、Google Chat、Signal、iMessage、WebChat），并且还可以在受支持的平台上进行语音交互和实时 Canvas 操作。**Gateway(网关)** 是始终开启的控制平面；助手即产品本身。
  </Accordion>

  <Accordion title="价值主张">
    OpenClaw 不仅仅是一个“Claude 封装器”。它是一个**以本地优先的控制平面**，让您能够在**您自己的硬件**上运行一个功能强大的助手，通过您已经在使用的聊天应用程序进行访问，具备有状态会话、记忆和工具功能 - 而无需将您的工作流控制权移交给托管的 SaaS。

    亮点：

    - **您的设备，您的数据：** 在您想要的任何地方运行 Gateway(网关)（Mac、Linux、VPS），并将工作区 + 会话历史保留在本地。
    - **真实的渠道，而非网络沙盒：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/等，以及在支持的平台上的移动语音和 Canvas。
    - **模型无关：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，支持按代理路由和故障转移。
    - **仅本地选项：** 运行本地模型，这样如果愿意，**所有数据都可以保留在您的设备上**。
    - **多代理路由：** 按渠道、帐户或任务分离代理，每个代理都有自己的工作区和默认设置。
    - **开源且可破解：** 检查、扩展和自托管，没有供应商锁定。

    文档：[Gateway(网关)](/zh/gateway)、[渠道](/zh/channels)、[多代理](/zh/concepts/multi-agent)、
    [记忆](/zh/concepts/memory)。

  </Accordion>

  <Accordion title="我刚刚完成了设置 - 首先应该做什么？">
    不错的入门项目：

    - 构建一个网站（WordPress、Shopify 或简单的静态网站）。
    - 原型设计一个移动应用程序（大纲、屏幕、API 计划）。
    - 整理文件和文件夹（清理、命名、标记）。
    - 连接 Gmail 并自动生成摘要或后续跟进。

    它可以处理大型任务，但最好将它们分成几个阶段，并使用子代理进行并行工作。

  </Accordion>

  <Accordion title="OpenClaw 的五大日常用例是什么？">
    日常胜利通常表现为：

    - **个人简报：** 您关心的收件箱、日历和新闻摘要。
    - **研究和起草：** 快速研究、摘要，以及电子邮件或文档的初稿。
    - **提醒和跟进：** 由 cron 或心跳驱动的提醒和检查清单。
    - **浏览器自动化：** 填写表单、收集数据以及重复执行 Web 任务。
    - **跨设备协调：** 从手机发送任务，让 Gateway 在服务器上运行，然后在聊天中获取结果。

  </Accordion>

  <Accordion title="OpenClaw 能帮助 SaaS 进行潜在客户挖掘、外联、广告和博客撰写吗？">
    可以用于 **研究、资格认定和起草**。它可以扫描网站、建立候选名单、
    总结潜在客户，并撰写外联或广告文案草稿。

    对于 **外联或广告投放**，请保留人工审核环节。避免垃圾邮件，遵守当地法律和
    平台政策，并在发送前审查所有内容。最安全的模式是让
    OpenClaw 起草，然后由您批准。

    文档：[Security](/zh/gateway/security)。

  </Accordion>

  <Accordion title="与 Claude Code 相比，OpenClaw 在 Web 开发方面有哪些优势？">
    OpenClaw 是一个 **个人助手** 和协调层，而不是 IDE 的替代品。使用
    Claude Code 或 Codex 可以在代码库内获得最快的直接编码循环。当您
    需要持久记忆、跨设备访问和工具编排时，请使用 OpenClaw。

    优势：

    - 跨会话的 **持久内存 + 工作区**
    - **多平台访问** (WhatsApp, Telegram, TUI, WebChat)
    - **工具编排** (browser, files, scheduling, hooks)
    - **始终在线的 Gateway** (在 VPS 上运行，从任何地方交互)
    - 用于本地浏览器/屏幕/相机/执行的 **Nodes**

    Showcase: [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Skills 和自动化

<AccordionGroup>
  <Accordion title="如何在不弄脏仓库的情况下自定义技能？">
    使用托管覆盖而不是编辑仓库副本。将您的更改放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加文件夹）。优先级是 `<workspace>/skills` > `~/.openclaw/skills` > bundled（打包），因此托管覆盖胜出且无需触及 git。只有值得上游合并的编辑才应存在于仓库中并作为 PR 提交。
  </Accordion>

  <Accordion title="我可以从自定义文件夹加载技能吗？">
    是的。通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加额外的目录（最低优先级）。默认优先级保持不变：`<workspace>/skills` → `~/.openclaw/skills` → bundled（打包） → `skills.load.extraDirs`。`clawhub` 默认安装到 `./skills`，OpenClaw 在下一次会话中将其视为 `<workspace>/skills`。
  </Accordion>

  <Accordion title="如何针对不同的任务使用不同的模型？">
    目前支持的模式有：

    - **Cron 作业（定时任务）**：隔离的作业可以为每个作业设置 `model` 覆盖。
    - **子代理**：将任务路由到具有不同默认模型的独立代理。
    - **按需切换**：使用 `/model` 随时切换当前会话模型。

    请参阅 [Cron 作业](/zh/automation/cron-jobs)、[多代理路由](/zh/concepts/multi-agent) 和 [斜杠命令](/zh/tools/slash-commands)。

  </Accordion>

  <Accordion title="机器人在执行繁重任务时卡死。我该如何卸载该任务？">
    使用 **子代理** 来处理长时间或并行的任务。子代理在自己的会话中运行，
    返回摘要，并保持您的主聊天响应。

    让您的机器人“为此任务生成一个子代理”，或使用 `/subagents`。
    在聊天中使用 `/status` 查看 Gateway(网关) 当前正在做什么（以及它是否忙碌）。

    Token 提示：长任务和子代理都会消耗 token。如果成本是顾虑，可以通过 `agents.defaults.subagents.model` 为子代理设置更便宜的模型。

    文档：[子代理](/zh/tools/subagents)。

  </Accordion>

  <Accordion title="线程绑定的子代理会话在 Discord 上如何工作？">
    使用线程绑定。您可以将 Discord 线程绑定到子代理或会话目标，以便该线程中的后续消息保持在该绑定的会话上。

    基本流程：

    - 使用 `thread: true` 通过 `sessions_spawn` 生成（并可选择使用 `mode: "session"` 进行持续跟进）。
    - 或使用 `/focus <target>` 手动绑定。
    - 使用 `/agents` 检查绑定状态。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自动取消焦点。
    - 使用 `/unfocus` 分离线程。

    所需配置：

    - 全局默认值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆盖设置：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 生成时自动绑定：设置 `channels.discord.threadBindings.spawnSubagentSessions: true`。

    文档：[子代理](/zh/tools/subagents)、[Discord](/zh/channels/discord)、[配置参考](/zh/gateway/configuration-reference)、[斜杠命令](/zh/tools/slash-commands)。

  </Accordion>

  <Accordion title="Cron 或提醒未触发。我应该检查什么？">
    Cron 在 Gateway(网关) 进程内运行。如果 Gateway(网关) 未持续运行，
    计划任务将不会执行。

    检查清单：

    - 确认已启用 cron (`cron.enabled`) 且未设置 `OPENCLAW_SKIP_CRON`。
    - 检查 Gateway(网关) 是否 24/7 运行（无睡眠/重启）。
    - 验证任务的时区设置（`--tz` 与主机时区对比）。

    调试：

    ```bash
    openclaw cron run <jobId> --force
    openclaw cron runs --id <jobId> --limit 50
    ```

    文档：[Cron jobs](/zh/automation/cron-jobs)、[Cron vs Heartbeat](/zh/automation/cron-vs-heartbeat)。

  </Accordion>

  <Accordion title="如何在 Linux 上安装 Skills？">
    使用 **ClawHub** (CLI) 或将 Skills 放入您的工作区。macOS Skills UI 在 Linux 上不可用。
    在 [https://clawhub.com](https://clawhub.com) 浏览 Skills。

    安装 ClawHub CLI（选择一个包管理器）：

    ```bash
    npm i -g clawhub
    ```

    ```bash
    pnpm add -g clawhub
    ```

  </Accordion>

  <Accordion title="OpenClaw 可以按计划运行任务或在后台持续运行吗？">
    是的。使用 Gateway(网关) 调度器：

    - **Cron jobs** 用于计划或重复性任务（跨重启持久化）。
    - **Heartbeat** 用于“主会话”定期检查。
    - **Isolated jobs** 用于发布摘要或发送到聊天的自主代理。

    文档：[Cron jobs](/zh/automation/cron-jobs)、[Cron vs Heartbeat](/zh/automation/cron-vs-heartbeat)、
    [Heartbeat](/zh/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以在 Linux 上运行仅限 Apple macOS 的技能吗？">
    不能直接运行。macOS 技能受 `metadata.openclaw.os` 以及所需二进制文件的限制，只有当技能在 **Gateway(网关) 主机**上符合条件时，它们才会出现在系统提示中。在 Linux 上，除非您覆盖限制，否则仅限 `darwin` 的技能（例如 `apple-notes`、`apple-reminders`、`things-mac`）将无法加载。

    您有三种支持的模式：

    **方案 A - 在 Mac 上运行 Gateway（最简单）。**
    在存在 macOS 二进制文件的地方运行 Gateway，然后从 Linux 通过[远程模式](#gateway-ports-already-running-and-remote-mode)或 Tailscale 进行连接。由于 Gateway 主机是 macOS，技能会正常加载。

    **方案 B - 使用 macOS 节点（无 SSH）。**
    在 Linux 上运行 Gateway，配对一个 macOS 节点（菜单栏应用），并在 Mac 上将 **节点运行命令**设置为“始终询问”或“始终允许”。当节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为符合条件。代理通过 `nodes` 工具运行这些技能。如果您选择“始终询问”，在提示中批准“始终允许”会将该命令添加到允许列表中。

    **方案 C - 通过 SSH 代理 macOS 二进制文件（高级）。**
    将 Gateway 保留在 Linux 上，但使所需的 CLI 二进制文件解析为在 Mac 上运行的 SSH 包装器。然后覆盖技能以允许 Linux，使其保持符合条件。

    1. 为二进制文件创建一个 SSH 包装器（例如：`memo` 用于 Apple 备忘录）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 将包装器放置在 Linux 主机的 `PATH` 上（例如 `~/bin/memo`）。
    3. 覆盖技能元数据（工作区或 `~/.openclaw/skills`）以允许 Linux：

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. 启动一个新会话，以便刷新技能快照。

  </Accordion>

  <Accordion title="你们是否有 Notion 或 HeyGen 的集成？">
    目前尚未内置。

    可选方案：

    - **自定义 skill / 插件：** 最适合可靠的 API 访问（Notion/HeyGen 均有 API）。
    - **浏览器自动化：** 无需编写代码即可运行，但速度较慢且较不稳定。

    如果您希望为每个客户端保留上下文（代理机构工作流），一个简单的模式是：

    - 每个客户端一个 Notion 页面（上下文 + 偏好设置 + 活跃工作）。
    - 在会话开始时，让代理获取该页面。

    如果您需要原生集成，请提交功能请求或构建一个针对这些 API 的 skill。

    安装 skills：

    ```bash
    clawhub install <skill-slug>
    clawhub update --all
    ```

    API 会安装到当前目录下的 `./skills` 中（或者回退到您配置的 ClawHub 工作区）；OpenClaw 在下一次会话中将其视为 `<workspace>/skills`。为了在代理之间共享 skills，请将它们放置在 `~/.openclaw/skills/<name>/SKILL.md` 中。某些 skills 需要通过 Homebrew 安装二进制文件；在 OpenClaw 上这意味着使用 Linuxbrew（请参阅上面的 Homebrew Linux 常见问题 条目）。请参阅 [Skills](/zh/tools/skills) 和 [Linux](/zh/tools/clawhub)。

  </Accordion>

  <Accordion title="如何使用我现有的已登录 Chrome 与 OpenClaw 配合？">
    使用内置的 `user` 浏览器配置文件，该文件通过 Chrome DevTools MCP 连接：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果您想要自定义名称，请创建一个显式的 MCP 配置文件：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    此路径是主机本地的。如果 Gateway(网关) 运行在其他位置，请在浏览器机器上运行节点主机，或者改用远程 CDP。

  </Accordion>
</AccordionGroup>

## 沙箱隔离与内存

<AccordionGroup>
  <Accordion title="是否有专门的沙箱隔离文档？">
    是的。请参阅 [沙箱隔离](/zh/gateway/sandboxing)。有关 Docker 特定的设置（Docker 中的完整网关或沙箱镜像），请参阅 [Docker](/zh/install/docker)。
  </Accordion>

  <Accordion title="Docker 感觉受限 - 如何启用全部功能？">
    默认镜像以安全为重，并以 `node` 用户身份运行，因此它不
    包括系统包、Homebrew 或捆绑的浏览器。要获得更完整的设置：

    - 使用 `OPENCLAW_HOME_VOLUME` 持久化 `/home/node`，以便缓存得以保留。
    - 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 将系统依赖项烘焙到镜像中。
    - 通过捆绑的 Docker 安装 Playwright 浏览器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 设置 `PLAYWRIGHT_BROWSERS_PATH` 并确保该路径被持久化。

    文档：[Docker](/zh/install/docker)，[浏览器](/zh/tools/browser)。

  </Accordion>

  <Accordion title="我能否保持私信（私信）私密，同时使用一个代理将群组设为公开/沙箱隔离？">
    可以 - 如果您的私有流量是 **私信（私信）** 而公共流量是 **群组**。

    使用 `agents.defaults.sandbox.mode: "non-main"`，以便群组/渠道会话（非主密钥）在 Docker 中运行，而主私信会话保持在宿主机上。然后通过 `tools.sandbox.tools` 限制沙箱隔离会话中可用的工具。

    设置演练 + 示例配置：[Groups: personal 私信 + public groups](/zh/channels/groups#pattern-personal-dms-public-groups-single-agent)

    关键配置参考：[Gateway(网关) configuration](/zh/gateway/configuration-reference#agents-defaults-sandbox)

  </Accordion>

<Accordion title="如何将宿主机文件夹绑定到沙箱中？">
  将 `agents.defaults.sandbox.docker.binds` 设置为 `["host:path:mode"]`（例如，
  `"/home/user/src:/src:ro"`）。全局 + 每个代理的绑定会合并；当 `scope: "shared"`
  时，将忽略每个代理的绑定。对于任何敏感内容，请使用 `:ro`，并记住绑定会绕过沙箱
  文件系统屏障。请参阅 [沙箱隔离](/zh/gateway/sandboxing#custom-bind-mounts) 和 [沙箱 vs Tool Policy
  vs Elevated](/zh/gateway/sandbox-vs-工具-policy-vs-elevated#bind-mounts-security-quick-check) 了解
  示例和安全说明。
</Accordion>

  <Accordion title="内存如何工作？">
    OpenClaw 的内存只是代理工作区中的 Markdown 文件：

    - `memory/YYYY-MM-DD.md` 中的每日笔记
    - `MEMORY.md` 中的精选长期笔记（仅限主/私有会话）

    OpenClaw 还会运行**静默预压缩内存刷新**，以提醒模型
    在自动压缩之前写入持久笔记。这仅在工作区
    可写时运行（只读沙盒会跳过此步骤）。参见[内存](/zh/concepts/memory)。

  </Accordion>

  <Accordion title="内存总是遗忘事情。如何让它记住？">
    要求机器人**将事实写入内存**。长期笔记应存放在 `MEMORY.md` 中，
    短期上下文则放入 `memory/YYYY-MM-DD.md` 中。

    这仍然是我们正在改进的领域。提醒模型存储记忆会有所帮助；
    它会知道该怎么做。如果它持续遗忘，请验证 Gateway(网关) 在每次运行时是否使用
    相同的工作区。

    文档：[内存](/zh/concepts/memory)、[代理工作区](/zh/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="内存会永久保留吗？有什么限制？">
    内存文件存储在磁盘上，会一直保留直到您将其删除。限制在于您的
    存储空间，而非模型。**会话上下文**仍然受到模型
    上下文窗口的限制，因此长对话可能会被压缩或截断。这就是
    内存搜索存在的原因——它仅将相关部分拉回上下文中。

    文档：[内存](/zh/concepts/memory)、[上下文](/zh/concepts/context)。

  </Accordion>

  <Accordion title="语义记忆搜索是否需要 OpenAI API 密钥？">
    仅当您使用 **OpenAI 嵌入** 时。Codex OAuth 覆盖聊天/补全功能，且
    **不** 授予嵌入访问权限，因此**通过 Codex 登录（OAuth 或
    Codex CLI 登录）** 对语义记忆搜索没有帮助。OpenAI 嵌入
    仍然需要真实的 API 密钥（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果您没有明确设置提供商，OpenClaw 会在能够解析 API 密钥（身份验证配置文件、`models.providers.*.apiKey` 或环境变量）时自动选择提供商。
    如果解析到 OpenAI 密钥，它优先使用 OpenAI；否则，如果解析到 Gemini 密钥，则使用 Gemini，其次是 Voyage，然后是 Mistral。如果没有可用的远程密钥，内存搜索将保持禁用状态，直到您对其进行配置。如果您配置并存在本地模型路径，OpenClaw
    优先使用 `local`。当您明确设置 `memorySearch.provider = "ollama"` 时，支持 Ollama。

    如果您希望保持本地化，请设置 `memorySearch.provider = "local"`（可选地设置
    `memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，请设置
    `memorySearch.provider = "gemini"` 并提供 `GEMINI_API_KEY`（或
    `memorySearch.remote.apiKey`）。我们支持 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本地** 嵌入
    模型 - 有关设置详细信息，请参阅 [Memory](/zh/concepts/memory)。

  </Accordion>
</AccordionGroup>

## 磁盘上的文件位置

<AccordionGroup>
  <Accordion title="与 OpenClaw 一起使用的所有数据都会保存在本地吗？">
    不 - **OpenClaw 的状态是本地的**，但 **外部服务仍然可以看到你发送给它们的内容**。

    - **默认本地化：** 会话、内存文件、配置和工作区位于 Gateway(网关) 主机上
      (`~/.openclaw` + 你的工作区目录)。
    - **必要的远程：** 你发送给模型提供商 (Anthropic/OpenAI/etc.) 的消息会发送到
      它们的 API，而聊天平台 (WhatsApp/Telegram/Slack/etc.) 会将消息数据存储在它们的
      服务器上。
    - **你可以控制数据范围：** 使用本地模型可以将提示词保留在你的机器上，但渠道
      流量仍然会经过渠道的服务器。

    相关内容：[Agent workspace](/zh/concepts/agent-workspace)，[Memory](/zh/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 将其数据存储在哪里？">
    所有内容都位于 `$OPENCLAW_STATE_DIR` 下（默认：`~/.openclaw`）：

    | 路径                                                            | 用途                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主配置 (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 旧版 OAuth 导入（首次使用时复制到身份配置文件中）       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 身份配置文件（OAuth、API 密钥和可选的 `keyRef`/`tokenRef`）  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | 用于 `file` SecretRef 提供程序的可选文件支持的秘密负载 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 旧版兼容性文件（已清除静态 `api_key` 条目）      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供程序状态（例如 `whatsapp/<accountId>/creds.json`）            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每个代理的状态（agentDir + sessions）                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 对话历史和状态（每个代理）                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 会话元数据（每个代理）                                       |

    旧版单代理路径：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）。

    您的**工作区**（AGENTS.md、内存文件、技能等）是独立的，并通过 `agents.defaults.workspace` 进行配置（默认：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该存放在哪里？">
    这些文件位于 **agent workspace（代理工作区）** 中，而不是 `~/.openclaw` 中。

    - **Workspace (per agent)（工作区，每个代理）**: `AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`，
      `MEMORY.md`（当 `MEMORY.md` 缺失时的传统回退项 `memory.md`），
      `memory/YYYY-MM-DD.md`，可选的 `HEARTBEAT.md`。
    - **State dir (`~/.openclaw`)（状态目录）**: 配置、凭据、身份验证配置文件、会话、日志
      以及共享技能 (`~/.openclaw/skills`)。

    默认工作区是 `~/.openclaw/workspace`，可通过以下方式配置：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果机器人在重启后“忘记”了内容，请确认 Gateway(网关) 在每次启动时使用的是相同的
    工作区（并且请记住：远程模式使用的是 **gateway host's（网关主机）**
    的工作区，而不是您本地笔记本电脑的工作区）。

    提示：如果您希望保持持久的行为或偏好，请让机器人 **将其写入
    AGENTS.md 或 MEMORY.md**，而不是依赖聊天记录。

    参见 [Agent workspace](/zh/concepts/agent-workspace) 和 [Memory](/zh/concepts/memory)。

  </Accordion>

  <Accordion title="推荐的备份策略">
    将您的 **agent workspace（代理工作区）** 放入一个 **私有** git 仓库中，并将其备份到某个
    私有位置（例如 GitHub 私有仓库）。这会捕获内存以及 AGENTS/SOUL/USER
    文件，并允许您稍后恢复助手的“思维”。

    **不要** 提交 `~/.openclaw` 下的任何内容（凭据、会话、令牌或加密的秘密载荷）。
    如果您需要完全恢复，请分别备份工作区和状态目录
    （请参阅上面的迁移问题）。

    文档: [Agent workspace](/zh/concepts/agent-workspace)。

  </Accordion>

<Accordion title="如何完全卸载 OpenClaw？">
  请参阅专用指南: [Uninstall](/zh/install/uninstall)。
</Accordion>

  <Accordion title="代理可以在工作区之外工作吗？">
    是的。工作区是**默认的 cwd** 和内存锚点，而不是严格的沙箱。
    相对路径在工作区内解析，但除非启用沙箱隔离，否则绝对路径可以访问其他
    主机位置。如果需要隔离，请使用
    [`agents.defaults.sandbox`](/zh/gateway/sandboxing) 或每代理沙箱设置。如果您
    希望将仓库作为默认工作目录，请将该代理的
    `workspace` 指向仓库根目录。OpenClaw 仓库只是源代码；除非您有意让代理在其中工作，否则请将
    工作区分开。

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

  <Accordion title="我处于远程模式 - 会话存储在哪里？">
    会话状态由**网关主机**拥有。如果您处于远程模式，您关心的会话存储位于远程机器上，而不是您的本地笔记本电脑。请参阅 [会话管理](/zh/concepts/session)。
  </Accordion>
</AccordionGroup>

## 配置基础

<AccordionGroup>
  <Accordion title="配置是什么格式？它在哪里？">
    OpenClaw 从 `$OPENCLAW_CONFIG_PATH`（默认值：`~/.openclaw/openclaw.json`）读取可选的 **JSON5** 配置：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果文件丢失，它将使用相对安全的默认值（包括默认工作区 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我设置了 gateway.bind: "lan" (或 "tailnet")，现在没有任何监听 / UI 显示未授权'>
    非环回绑定**需要认证**。配置 `gateway.auth.mode` + `gateway.auth.token` (或使用 `OPENCLAW_GATEWAY_TOKEN`)。

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
    - 只有当 `gateway.auth.*` 未设置时，本地调用路径才能将 `gateway.remote.*` 作为备用。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置但无法解析，解析将以失败告终（不会使用远程备用进行掩盖）。
    - 控制 UI 通过 `connect.params.auth.token` (存储在 app/UI 设置中) 进行身份验证。避免将令牌放在 URL 中。

  </Accordion>

  <Accordion title="为什么我现在在 localhost 上需要一个令牌？">
    OpenClaw 默认强制执行令牌认证，包括环回。如果未配置令牌，网关启动时会自动生成一个并将其保存到 `gateway.auth.token`，因此**本地 WS 客户端必须进行身份验证**。这会阻止其他本地进程调用 Gateway(网关)。

    如果你**真的**想要开放环回，请在配置中显式设置 `gateway.auth.mode: "none"`。Doctor 随时可以为你生成令牌：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="更改配置后我需要重启吗？">
    Gateway(网关) 会监视配置并支持热重载：

    - `gateway.reload.mode: "hybrid"` (默认)：热应用安全更改，对关键更改进行重启
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
    - 如果您完全不想要横幅，请设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何启用网络搜索（和网络抓取）？">
    `web_fetch` 无需 API 密钥即可工作。`web_search` 需要为您所选的提供商（Brave、Gemini、Grok、Kimi 或 Perplexity）提供密钥。
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
    旧的 `tools.web.search.*` 提供商路径为了兼容性暂时仍然加载，但不应在新配置中使用。

    注意事项：

    - 如果您使用允许列表，请添加 `web_search`/`web_fetch` 或 `group:web`。
    - `web_fetch` 默认启用（除非明确禁用）。
    - 守护进程从 `~/.openclaw/.env`（或服务环境）读取环境变量。

    文档：[Web 工具](/zh/tools/web)。

  </Accordion>

  <Accordion title="config.apply 清除了我的配置。如何恢复并避免这种情况？">
    `config.apply` 会替换**整个配置**。如果您发送的部分对象，所有其他内容将被删除。

    恢复：

    - 从备份恢复（git 或复制的 `~/.openclaw/openclaw.json`）。
    - 如果您没有备份，请重新运行 `openclaw doctor` 并重新配置渠道/模型。
    - 如果这是意外发生的，请提交错误报告并附上您最后一次已知的配置或任何备份。
    - 本地编码代理通常可以从日志或历史记录中重建一个可用的配置。

    避免这种情况：

    - 使用 `openclaw config set` 进行微小的更改。
    - 使用 `openclaw configure` 进行交互式编辑。

    文档：[Config](/zh/cli/config)，[Configure](/zh/cli/configure)，[Doctor](/zh/gateway/doctor)。

  </Accordion>

  <Accordion title="如何运行一个带有跨设备专用工作进程的中央 Gateway(网关)？">
    常见的模式是**一个 Gateway(网关)**（例如 Raspberry Pi）加上**节点（nodes）**和**代理（agents）**：

    - **Gateway(网关) (中央)：** 拥有渠道（Signal/WhatsApp）、路由和会话。
    - **节点（设备）：** Macs/iOS/Android 作为外设连接并暴露本地工具（`system.run`，`canvas`，`camera`）。
    - **代理（工作进程）：** 用于特殊角色的独立大脑/工作空间（例如“Hetzner 运维”、“个人数据”）。
    - **子代理：** 当您需要并行处理时，从主代理生成后台工作。
    - **TUI：** 连接到 Gateway(网关) 并切换代理/会话。

    文档：[Nodes](/zh/nodes)，[Remote access](/zh/gateway/remote)，[Multi-Agent Routing](/zh/concepts/multi-agent)，[Sub-agents](/zh/tools/subagents)，[TUI](/zh/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 浏览器可以无头模式运行吗？">
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

    默认是 `false` (有头模式)。在某些网站上，无头模式更有可能触发反机器人检查。参见 [Browser](/zh/tools/browser)。

    无头模式使用**相同的 Chromium 引擎**，适用于大多数自动化操作（表单、点击、抓取、登录）。主要区别如下：

    - 没有可见的浏览器窗口（如果需要视觉效果，请使用截图）。
    - 某些网站对无头模式下的自动化更严格（验证码、反机器人）。
      例如，X/Twitter 经常阻止无头会话。

  </Accordion>

  <Accordion title="如何使用 Brave 进行浏览器控制？">
    将 `browser.executablePath` 设置为您的 Brave 二进制文件（或任何基于 Chromium 的浏览器）并重启 Gateway(网关)。
    参见 [Browser](/zh/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置示例。
  </Accordion>
</AccordionGroup>

## 远程 Gateway(网关)和节点

<AccordionGroup>
  <Accordion title="命令如何在 Telegram、gateway 和节点之间传播？">
    Telegram 消息由 **gateway** 处理。gateway 运行代理，并且
    仅在需要节点工具时通过 **Gateway WebSocket** 调用节点：

    Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

    节点看不到入站提供商流量；它们只接收节点 RPC 调用。

  </Accordion>

  <Accordion title="如果 Gateway(网关) 托管在远程，我的代理如何访问我的计算机？">
    简短回答：**将您的计算机配对为节点**。Gateway(网关) 运行在其他地方，但它可以通过 Gateway(网关) WebSocket 调用您本地机器上的 `node.*` 工具（屏幕、摄像头、系统）。

    典型设置：

    1. 在始终在线的主机（VPS/家庭服务器）上运行 Gateway(网关)。
    2. 将 Gateway(网关) 主机和您的计算机置于同一个 tailnet 中。
    3. 确保 Gateway(网关) WS 可访问（tailnet 绑定或 SSH 隧道）。
    4. 在本地打开 macOS 应用，并以 **Remote over SSH** 模式（或直接通过 tailnet）连接，以便其注册为节点。
    5. 在 Gateway(网关) 上批准该节点：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要单独的 TCP 桥接；节点通过 Gateway(网关) WebSocket 连接。

    安全提醒：配对 macOS 节点允许在该机器上进行 `system.run`。仅配对您信任的设备，并查看 [Security](/zh/gateway/security)。

    文档：[Nodes](/zh/nodes)、[Gateway(网关) protocol](/zh/gateway/protocol)、[macOS remote mode](/zh/platforms/mac/remote)、[Security](/zh/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已连接但我没有收到回复。现在怎么办？">
    检查基础项：

    - Gateway(网关) 正在运行：`openclaw gateway status`
    - Gateway(网关) 运行状况：`openclaw status`
    - 通道运行状况：`openclaw channels status`

    然后验证身份验证和路由：

    - 如果您使用 Tailscale Serve，请确保 `gateway.auth.allowTailscale` 设置正确。
    - 如果您通过 SSH 隧道连接，请确认本地隧道已启动并指向正确的端口。
    - 确认您的允许列表（私信或组）包含您的账户。

    文档：[Tailscale](/zh/gateway/tailscale)、[Remote access](/zh/gateway/remote)、[Channels](/zh/channels)。

  </Accordion>

  <Accordion title="两个 OpenClaw 实例可以相互通信吗（本地 + VPS）？">
    是的。没有内置的“机器人对机器人”桥接器，但你可以通过几种可靠的方式进行连接：

    **最简单：** 使用两个机器人都能访问的普通聊天渠道（Telegram/Slack/WhatsApp）。
    让机器人 A 向机器人 B 发送消息，然后让机器人 B 像往常一样回复。

    **CLI 桥接（通用）：** 运行一个脚本，使用
    `openclaw agent --message ... --deliver` 调用另一个 Gateway(网关)，
    目标是另一个机器人监听的聊天。如果一个机器人在远程 VPS 上，请通过 SSH/Tailscale 将你的 CLI 指向该远程 Gateway(网关)
    （请参阅 [Remote access](/zh/gateway/remote)）。

    示例模式（从可以访问目标 Gateway(网关) 的机器运行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：添加一个护栏，以防止两个机器人无限循环（仅限提及、渠道
    白名单，或“不回复机器人消息”规则）。

    文档：[Remote access](/zh/gateway/remote)、[Agent CLI](/zh/cli/agent)、[Agent send](/zh/tools/agent-send)。

  </Accordion>

  <Accordion title="多个 Agent 是否需要独立的 VPS？">
    不需要。一个 Gateway(网关) 可以托管多个 Agent，每个 Agent 都有自己的工作区、模型默认值
    和路由。这是常规设置，比为每个 Agent 运行一个 VPS 更便宜、更简单。

    仅当你需要硬隔离（安全边界）或不想共享的非常不同的配置时，才使用独立的 VPS。否则，请保留一个 Gateway(网关) 并
    使用多个 Agent 或子 Agent。

  </Accordion>

  <Accordion title="在个人笔记本电脑上使用节点而不是通过 VPS SSH 连接有什么好处？">
    是的——节点是从远程 Gateway(网关) 访问您的笔记本电脑的首选方式，并且它们
    开启的功能不仅仅是 Shell 访问。Gateway(网关) 运行在 macOS/Linux（Windows 通过 WSL2）上，并且
    是轻量级的（一个小型 VPS 或 Raspberry Pi 级别的盒子就可以了；4 GB 内存绰绰有余），因此一种常见的
    设置是一个常开主机加上您的笔记本电脑作为一个节点。

    - **无需入站 SSH。** 节点向外连接到 Gateway(网关) 的 WebSocket 并使用设备配对。
    - **更安全的执行控制。** 在该笔记本电脑上，`system.run` 受节点允许列表/批准的限制。
    - **更多设备工具。** 除了 `system.run` 之外，节点还暴露 `canvas`、`camera` 和 `screen`。
    - **本地浏览器自动化。** 将 Gateway(网关) 保留在 VPS 上，但通过笔记本电脑上的节点主机在本地运行 Chrome，或者通过 Chrome MCP 附加到主机上的本地 Chrome。

    SSH 适用于临时 Shell 访问，但对于持续运行的代理工作流和
    设备自动化，节点更简单。

    文档：[节点](/zh/nodes)，[节点 CLI](/zh/cli/nodes)，[浏览器](/zh/tools/browser)。

  </Accordion>

  <Accordion title="节点是否运行 Gateway(网关)服务？">
    不。除非您有意运行隔离的配置文件（请参阅 [多个网关](/zh/gateway/multiple-gateways)），否则每台主机应只运行 **一个 Gateway(网关)**。节点是连接到 Gateway(网关) 的外设（iOS/Android 节点，或菜单栏应用程序中的 macOS “节点模式”）。对于无头节点主机和 CLI 控制，请参阅 [节点主机 CLI](/zh/cli/node)。

    对 `gateway`、`discovery` 和 `canvasHost` 的更改需要完全重启。

  </Accordion>

<Accordion title="是否有 API / RPC 方式来应用配置？">
  是的。`config.apply` 会验证并写入完整配置，并在操作期间重启 Gateway(网关)。
</Accordion>

  <Accordion title="首次安装的最小合理配置">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    这将设置您的工作区并限制谁可以触发机器人。

  </Accordion>

  <Accordion title="如何在 VPS 上设置 Tailscale 并从 Mac 连接？">
    最少步骤：

    1. **在 VPS 上安装 + 登录**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在您的 Mac 上安装 + 登录**
       - 使用 Tailscale 应用并登录到同一个 tailnet。
    3. **启用 MagicDNS（推荐）**
       - 在 Tailscale 管理控制台中，启用 MagicDNS，以便 VPS 拥有稳定的名称。
    4. **使用 tailnet 主机名**
       - SSH: `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果您希望在无需 SSH 的情况下使用控制 UI，请在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    这将使网关绑定到环回地址并通过 Tailscale 暴露 HTTPS。请参阅 [Tailscale](/zh/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何将 Mac 节点连接到远程 Gateway (Tailscale Serve)？">
    Serve 暴露 **Gateway Control UI + WS**。节点通过同一个 Gateway WS 端点连接。

    推荐设置：

    1. **确保 VPS 和 Mac 在同一个 tailnet 上**。
    2. **在远程模式下使用 macOS 应用**（SSH 目标可以是 tailnet 主机名）。
       该应用将隧道传输 Gateway 端口并作为节点进行连接。
    3. **在网关上批准节点**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文档：[Gateway 协议](/zh/gateway/protocol)、[设备发现](/zh/gateway/discovery)、[macOS 远程模式](/zh/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我是应该安装在第二台笔记本电脑上还是只添加一个节点？">
    如果您在第二台笔记本电脑上只需要**本地工具**（屏幕/摄像头/执行），请将其作为**节点**添加。这可以保持单个 Gateway(网关) 并避免重复的配置。本地节点工具目前仅支持 macOS，但我们计划将其扩展到其他操作系统。

    仅当您需要**硬隔离**或两个完全独立的机器人时，才安装第二个 Gateway(网关)。

    文档：[节点](/zh/nodes)、[节点 CLI](/zh/cli/nodes)、[多网关](/zh/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 环境变量和 .env 加载

<AccordionGroup>
  <Accordion title="OpenClaw 如何加载环境变量？">
    OpenClaw 从父进程（shell、launchd/systemd、CI 等）读取环境变量，并额外加载：

    - `.env` 来自当前工作目录
    - `~/.openclaw/.env`（即 `$OPENCLAW_STATE_DIR/.env`）中的全局后备 `.env`

    两个 `.env` 文件都不会覆盖现有的环境变量。

    您还可以在配置中定义内联环境变量（仅在进程环境中缺失时应用）：

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

  <Accordion title="我通过服务启动了 Gateway(网关)，环境变量消失了。现在怎么办？">
    两种常见的修复方法：

    1. 将缺失的键放入 `~/.openclaw/.env` 中，以便在服务未继承您的 shell 环境时也能被拾取。
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
    `OPENCLAW_LOAD_SHELL_ENV=1`，`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我设置了 COPILOT_GITHUB_TOKEN，但模型状态显示 "Shell env: off."（Shell 环境变量：关闭）。为什么？'>
    `openclaw models status` 报告是否启用了 **shell env import**（Shell 环境变量导入）。"Shell env: off" 
    **并不**意味着您的环境变量丢失了——它只是意味着 OpenClaw 不会
    自动加载您的登录 shell。

    如果 Gateway(网关) 作为服务运行（launchd/systemd），它将不会继承您的 shell
    环境。请通过以下方式之一修复此问题：

    1. 将令牌放入 `~/.openclaw/.env` 中：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或者启用 shell 导入（`env.shellEnv.enabled: true`）。
    3. 或者将其添加到您的配置 `env` 块中（仅在缺失时适用）。

    然后重启网关并重新检查：

    ```bash
    openclaw models status
    ```

    Copilot 令牌是从 `COPILOT_GITHUB_TOKEN` 读取的（也包括 `GH_TOKEN` / `GITHUB_TOKEN`）。
    请参阅 [/concepts/模型-providers](/zh/concepts/model-providers) 和 [/environment](/zh/help/environment)。

  </Accordion>
</AccordionGroup>

## 会话与多个聊天

<AccordionGroup>
  <Accordion title="如何开始一个新的对话？">
    发送 `/new` 或 `/reset` 作为一条独立消息。请参阅 [会话管理](/zh/concepts/session)。
  </Accordion>

  <Accordion title="如果我不发送 /new，会话会自动重置吗？">
    是的。会话会在 `session.idleMinutes` 后过期（默认 **60**）。**下一条**
    消息将为该聊天键启动一个新的会话 ID。这不会删除
    转录记录——它只是开始一个新的会话。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有没有办法组建一个 OpenClaw 实例团队（一个 CEO 和多个代理）？">
    是的，可以通过 **多代理路由** 和 **子代理** 实现。您可以创建一个协调器
    代理和几个具有各自工作区和模型的辅助代理。

    话虽如此，这最好被视为一种 **有趣的实验**。它非常消耗 token，而且通常
    比使用一个带有独立会话的机器人效率低。我们设想的典型模型是
    您与一个机器人对话，通过不同的会话进行并行工作。该机器人在需要时
    也可以生成子代理。

    文档：[多代理路由](/zh/concepts/multi-agent)、[子代理](/zh/tools/subagents)、[代理 CLI](/zh/cli/agents)。

  </Accordion>

  <Accordion title="为什么上下文会在任务中途被截断？如何防止这种情况？">
    会话上下文受限于模型窗口。长对话、大型工具输出或大量
    文件可能会触发压缩或截断。

    有以下帮助方法：

    - 让机器人总结当前状态并将其写入文件。
    - 在长任务之前使用 `/compact`，并在切换主题时使用 `/new`。
    - 将重要的上下文保留在工作区中，并让机器人重新读取它。
    - 对长时间或并行工作使用子代理，以便主对话保持较小规模。
    - 如果这种情况经常发生，请选择一个具有更大上下文窗口的模型。

  </Accordion>

  <Accordion title="如何完全重置 OpenClaw 但保留其安装？">
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
    ```

    注意：

    - 如果新手引导检测到现有配置，也会提供 **重置** 选项。请参阅 [新手引导 (CLI)](/zh/start/wizard)。
    - 如果您使用了配置文件 (`--profile` / `OPENCLAW_PROFILE`)，请重置每个状态目录（默认为 `~/.openclaw-<profile>`）。
    - 开发重置：`openclaw gateway --dev --reset`（仅限开发环境；清除开发配置 + 凭证 + 会话 + 工作区）。

  </Accordion>

  <Accordion title='出现“上下文过大”错误 - 如何重置或压缩？'>
    使用以下方法之一：

    - **压缩**（保留对话但总结旧的轮次）：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 来指导总结。

    - **重置**（为同一聊天密钥生成新的会话 ID）：

      ```
      /new
      /reset
      ```

    如果持续发生：

    - 启用或调整 **会话修剪**（`agents.defaults.contextPruning`）以修剪旧的工具输出。
    - 使用具有更大上下文窗口的模型。

    文档：[压缩](/zh/concepts/compaction)、[会话修剪](/zh/concepts/session-pruning)、[会话管理](/zh/concepts/session)。

  </Accordion>

  <Accordion title='为什么我看到“LLM 请求被拒绝：需要 messages.content.tool_use.input 字段”？'>
    这是提供商验证错误：模型发出了 `tool_use` 块，但没有包含必需的
    `input`。这通常意味着会话历史已过时或损坏（通常发生在长对话后
    或工具/架构更改后）。

    修复方法：使用 `/new`（独立消息）开始一个新的会话。

  </Accordion>

  <Accordion title="为什么每 30 分钟会收到心跳消息？">
    心跳默认每 **30m** 运行一次。您可以调整或禁用它们：

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

    如果 `HEARTBEAT.md` 存在但内容实际上为空（只有空行和像 `# Heading` 这样的 markdown
    标题），OpenClaw 会跳过心跳运行以节省 API 调用。
    如果文件缺失，心跳仍会运行，由模型决定执行什么操作。

    每个代理的覆盖设置使用 `agents.list[].heartbeat`。文档：[心跳](/zh/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我是否需要将“机器人帐户”添加到 WhatsApp 群组中？'>
    不需要。OpenClaw 运行在**您自己的帐户**上，所以如果您在群组中，OpenClaw 就能看到它。
    默认情况下，在您允许发送者（`groupPolicy: "allowlist"`）之前，群组回复是被阻止的。

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

    选项 2（如果已配置/在允许列表中）：从配置中列出群组：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文档：[WhatsApp](/zh/channels/whatsapp)，[Directory](/zh/cli/directory)，[Logs](/zh/cli/logs)。

  </Accordion>

  <Accordion title="为什么 OpenClaw 不在群组中回复？">
    两个常见原因：

    - 提及门控已开启（默认）。您必须 @提及机器人（或匹配 `mentionPatterns`）。
    - 您配置了 `channels.whatsapp.groups` 但没有配置 `"*"`，且该群组不在允许列表中。

    参见 [Groups](/zh/channels/groups) 和 [Group messages](/zh/channels/group-messages)。

  </Accordion>

<Accordion title="群组/线程是否与私信共享上下文？">
  直接聊天默认会合并到主会话中。群组/频道拥有自己的会话密钥， 并且 Telegram 主题 / Discord
  线程是独立的会话。参见 [Groups](/zh/channels/groups) 和 [Group
  messages](/zh/channels/group-messages)。
</Accordion>

  <Accordion title="我可以创建多少个工作区和代理？">
    没有硬性限制。几十个（甚至数百个）都可以，但请注意：

    - **磁盘增长：** 会话和转录记录存储在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本：** 代理越多意味着并发模型使用越多。
    - **运维开销：** 每个代理的身份验证配置文件、工作区和渠道路由。

    提示：

    - 为每个代理保留一个**活跃**工作区 (`agents.defaults.workspace`)。
    - 如果磁盘增长，请清理旧会话（删除 JSONL 或存储条目）。
    - 使用 `openclaw doctor` 来发现孤立的工作区和配置文件不匹配。

  </Accordion>

  <Accordion title="我可以同时运行多个机器人或聊天吗？">
    是的。使用 **多代理路由** 来运行多个隔离的代理，并通过渠道/账户/对等方路由传入的消息。Slack 作为渠道受支持，并且可以绑定到特定的代理。

    浏览器访问功能强大但并非“可以做人类能做的任何事情”——反机器人、CAPTCHA 和 MFA 仍然可以阻止自动化。为了获得最可靠的浏览器控制，请在主机上使用本地 Chrome MCP，或者在实际运行浏览器的计算机上使用 CDP。

    最佳实践设置：

    - 始终在线的 Gateway(网关) 主机 (VPS/Mac mini)。
    - 每个角色一个代理（绑定）。
    - 绑定到这些代理的 Slack 渠道。
    - 必要时通过 Chrome MCP 或节点使用本地浏览器。

    文档：[多代理路由](/zh/concepts/multi-agent)、[Slack](/zh/channels/slack)、
    [浏览器](/zh/tools/browser)、[节点](/zh/nodes)。

  </Accordion>
</AccordionGroup>

## 模型：默认值、选择、别名、切换

<AccordionGroup>
  <Accordion title='什么是“默认模型”？'>
    OpenClaw 的默认模型是您设置为以下内容的任何模型：

    ```
    agents.defaults.model.primary
    ```

    模型引用为 `provider/model` （例如：`anthropic/claude-opus-4-6`）。如果您省略提供商，OpenClaw 目前假定 `anthropic` 作为临时的弃用回退——但您仍然应该**显式**设置 `provider/model`。

  </Accordion>

  <Accordion title="您推荐使用哪种模型？">
    **推荐默认设置：** 使用提供商堆栈中可用的最强最新一代模型。
    **对于启用工具或输入不可信的代理：** 优先考虑模型强度而非成本。
    **对于常规/低风险聊天：** 使用更便宜的回退模型，并根据代理角色进行路由。

    MiniMax 有自己的文档：[MiniMax](/zh/providers/minimax) 和
    [本地模型](/zh/gateway/local-models)。

    经验法则：对于高风险工作，请使用您能负担得起的**最佳模型**，对于常规聊天或摘要，请使用更便宜的模型。您可以为每个代理路由模型，并使用子代理来并行化长任务（每个子代理消耗 token）。请参阅[模型](/zh/concepts/models)和
    [子代理](/zh/tools/subagents)。

    严重警告：较弱/过度量化的模型更容易受到提示词注入和不安全行为的影响。请参阅[安全性](/zh/gateway/security)。

    更多背景信息：[模型](/zh/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清除配置的情况下切换模型？">
    使用**模型命令**或仅编辑**模型**字段。避免完全替换配置。

    安全选项：

    - 聊天中的 `/model`（快速，每次会话）
    - `openclaw models set ...`（仅更新模型配置）
    - `openclaw configure --section model`（交互式）
    - 在 `~/.openclaw/openclaw.json` 中编辑 `agents.defaults.model`

    除非您打算替换整个配置，否则避免使用带有部分对象的 `config.apply`。
    如果您确实覆盖了配置，请从备份恢复或重新运行 `openclaw doctor` 进行修复。

    文档：[模型](/zh/concepts/models)、[配置](/zh/cli/configure)、[Config](/zh/cli/config)、[Doctor](/zh/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自托管模型（llama.cpp、vLLM、Ollama）吗？">
    是的。Ollama 是本地模型最简单的路径。

    最快设置方式：

    1. 从 `https://ollama.com/download` 安装 Ollama
    2. 拉取一个本地模型，例如 `ollama pull glm-4.7-flash`
    3. 如果您还需要 Ollama Cloud，请运行 `ollama signin`
    4. 运行 `openclaw onboard` 并选择 `Ollama`
    5. 选择 `Local` 或 `Cloud + Local`

    注意事项：

    - `Cloud + Local` 提供了 Ollama Cloud 模型以及您的本地 Ollama 模型
    - 云端模型（如 `kimi-k2.5:cloud`）不需要本地拉取
    - 如需手动切换，请使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全提示：较小或重度量化的模型更容易受到提示词注入攻击。我们强烈建议任何可以使用工具的机器人使用 **大型模型**。如果您仍然想使用小模型，请启用沙箱隔离和严格的工具允许列表。

    文档：[Ollama](/zh/providers/ollama)，[本地模型](/zh/gateway/local-models)，
    [模型提供商](/zh/concepts/model-providers)，[安全](/zh/gateway/security)，
    [沙箱隔离](/zh/gateway/sandboxing)。

  </Accordion>

<Accordion title="OpenClaw、Flawd 和 Krill 使用什么模型？">
  - 这些部署可能有所不同，并且可能随时间变化；没有固定的提供商推荐。 - 使用 `openclaw models status`
  检查每个网关上的当前运行时设置。 - 对于对安全敏感/启用了工具的代理，请使用可用的最强最新一代模型。
</Accordion>

  <Accordion title="如何即时切换模型（无需重启）？">
    将 `/model` 命令作为独立消息使用：

    ```
    /model sonnet
    /model haiku
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    ```

    您可以使用 `/model`、`/model list` 或 `/model status` 列出可用模型。

    `/model`（以及 `/model list`）显示一个紧凑的编号选择器。通过数字选择：

    ```
    /model 3
    ```

    您还可以为提供商强制指定特定的身份验证配置文件（每次会话）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 显示当前处于活动状态的代理、正在使用的 `auth-profiles.json` 文件以及接下来将尝试哪个身份验证配置文件。
    它还显示配置的提供商端点 (`baseUrl`) 和 API 模式 (`api`)（如果可用）。

    **如何取消固定我通过 @profile 设置的配置文件？**

    重新运行 `/model`，**不带** `@profile` 后缀：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果您想返回默认值，请从 `/model` 中选择（或发送 `/model <default provider/model>`）。
    使用 `/model status` 确认哪个身份验证配置文件处于活动状态。

  </Accordion>

  <Accordion title="我可以在日常任务中使用 GPT 5.2，在编码时使用 Codex 5.3 吗？">
    是的。将一个设置为默认值，并根据需要进行切换：

    - **快速切换（每次会话）：** 日常任务使用 `/model gpt-5.2`，使用 Codex OAuth 进行编码时使用 `/model openai-codex/gpt-5.4`。
    - **默认值 + 切换：** 将 `agents.defaults.model.primary` 设置为 `openai/gpt-5.2`，然后在编码时切换到 `openai-codex/gpt-5.4`（反之亦然）。
    - **子代理：** 将编码任务路由到具有不同默认模型的子代理。

    参见 [模型](/zh/concepts/models) 和 [斜杠命令](/zh/tools/slash-commands)。

  </Accordion>

  <Accordion title='为什么我会看到“Model ... is not allowed”，然后没有收到回复？'>
    如果设置了 `agents.defaults.models`，它将成为 `/model` 和任何
    会话覆盖的 **允许列表**。选择一个不在该列表中的模型将返回：

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    该错误会在正常回复 **之前** 返回。修复方法：将该模型添加到
    `agents.defaults.models`，移除允许列表，或从 `/model list` 中选择一个模型。

  </Accordion>

  <Accordion title='为什么我会看到“Unknown 模型: minimax/MiniMax-M2.7”？'>
    这意味着 **提供商未配置**（未找到 MiniMax 提供商配置或身份验证
    配置文件），因此无法解析该模型。针对此检测的修复位于
    **2026.1.12** 版本中（撰写时尚未发布）。

    修复检查清单：

    1. 升级到 **2026.1.12**（或从源 `main` 运行），然后重启网关。
    2. 确保 MiniMax 已配置（向导或 JSON），或者存在 MiniMax API 密钥
       在环境变量/身份验证配置文件中，以便注入提供商。
    3. 使用确切的模型 ID（区分大小写）：`minimax/MiniMax-M2.7`、
       `minimax/MiniMax-M2.7-highspeed`、`minimax/MiniMax-M2.5` 或
       `minimax/MiniMax-M2.5-highspeed`。
    4. 运行：

       ```bash
       openclaw models list
       ```

       并从列表中选择（或在聊天中使用 `/model list`）。

    参见 [MiniMax](/zh/providers/minimax) 和 [模型](/zh/concepts/models)。

  </Accordion>

  <Accordion title="我可以将 MiniMax 设为默认值，并将 OpenAI 用于复杂任务吗？">
    可以。将 **MiniMax 设为默认**，并在需要时按 **会话** 切换模型。
    后备机制适用于 **错误**，而非“困难任务”，因此请使用 `/model` 或单独的代理。

    **选项 A：按会话切换**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "minimax" },
            "openai/gpt-5.2": { alias: "gpt" },
          },
        },
      },
    }
    ```

    然后：

    ```
    /model gpt
    ```

    **选项 B：单独的代理**

    - 代理 A 默认：MiniMax
    - 代理 B 默认：OpenAI
    - 通过代理进行路由，或使用 `/agent` 进行切换

    文档：[模型](/zh/concepts/models)、[多代理路由](/zh/concepts/multi-agent)、[MiniMax](/zh/providers/minimax)、[OpenAI](/zh/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是内置的快捷方式吗？">
    是的。OpenClaw 提供了一些默认的简写（仅当该模型存在于 `agents.defaults.models` 中时才适用）：

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5-mini`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果您设置了同名的别名，则以您的值为准。

  </Accordion>

  <Accordion title="如何定义/覆盖模型快捷方式（别名）？">
    别名源自 `agents.defaults.models.<modelId>.alias`。例如：

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

    然后 `/model sonnet`（或在受支持时使用 `/<alias>`）将解析为该模型 ID。

  </Accordion>

  <Accordion title="如何添加来自其他提供商（如 OpenRouter 或 Z.AI）的模型？">
    OpenRouter（按令牌付费；多种模型）：

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

    这通常意味着**新代理**的认证存储为空。认证是特定于代理的，并存储在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修复选项：

    - 运行 `openclaw agents add <id>` 并在向导期间配置认证。
    - 或者将 `auth-profiles.json` 从主代理的 `agentDir` 复制到新代理的 `agentDir` 中。

    请**勿**在代理之间重用 `agentDir`；这会导致认证/会话冲突。

  </Accordion>
</AccordionGroup>

## 模型故障转移和“所有模型均失败”

<AccordionGroup>
  <Accordion title="故障转移是如何工作的？">
    故障转移分两个阶段进行：

    1. 同一提供商内的**认证配置文件轮换**。
    2. **模型回退**到 `agents.defaults.model.fallbacks` 中的下一个模型。

    冷却时间适用于失败的配置文件（指数退避），因此即使提供商受到速率限制或暂时失败，OpenClaw 也能继续响应。

  </Accordion>

  <Accordion title='“未找到配置文件 anthropic:default 的凭据”是什么意思？'>
    这意味着系统尝试使用认证配置文件 ID `anthropic:default`，但无法在预期的认证存储中找到该凭据。

    **修复清单：**

    - **确认认证配置文件的位置**（新路径与旧路径）
      - 当前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 旧版：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）
    - **确认您的环境变量已由 Gateway(网关) 加载**
      - 如果您在 Shell 中设置了 `ANTHROPIC_API_KEY`，但通过 systemd/launchd 运行 Gateway(网关)，则可能无法继承该变量。将其放入 `~/.openclaw/.env` 或启用 `env.shellEnv`。
    - **确保您正在编辑正确的代理**
      - 多代理设置意味着可能存在多个 `auth-profiles.json` 文件。
    - **健全性检查模型/认证状态**
      - 使用 `openclaw models status` 查看已配置的模型以及提供商是否已通过认证。

    **针对“未找到配置文件 anthropic 的凭据”的修复清单**

    这意味着运行被固定到了 Anthropic 认证配置文件，但 Gateway(网关) 无法在其认证存储中找到它。

    - **使用 setup-token**
      - 运行 `claude setup-token`，然后使用 `openclaw models auth setup-token --provider anthropic` 粘贴。
      - 如果 Token 是在另一台机器上创建的，请使用 `openclaw models auth paste-token --provider anthropic`。
    - **如果您想改用 API 密钥**
      - 将 `ANTHROPIC_API_KEY` 放入 **网关主机** 上的 `~/.openclaw/.env` 中。
      - 清除任何强制要求缺失配置文件的固定顺序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **确认您正在网关主机上运行命令**
      - 在远程模式下，认证配置文件位于网关机器上，而不是您的笔记本电脑上。

  </Accordion>

  <Accordion title="为什么它也尝试了 Google Gemini 并失败了？">
    如果您的模型配置包含 Google Gemini 作为备用（或者您切换到了 Gemini 简写），OpenClaw 将在模型回退期间尝试使用它。如果您尚未配置 Google 凭据，您将看到 `No API key found for provider "google"`。

    修复方法：提供 Google 身份验证，或者在 `agents.defaults.model.fallbacks` / 别名中删除/避免使用 Google 模型，以免回退路由到那里。

    **LLM 请求被拒绝：需要思考签名（Google Antigravity）**

    原因：会话历史包含 **没有签名的思考块**（通常来自中止/部分流）。Google Antigravity 要求思考块必须具有签名。

    修复方法：OpenClaw 现在会为 Google Antigravity Claude 剥离未签名的思考块。如果问题仍然出现，请启动 **新会话** 或为该代理设置 `/thinking off`。

  </Accordion>
</AccordionGroup>

## 身份验证配置文件：它们是什么以及如何管理它们

相关：[/concepts/oauth](/zh/concepts/oauth)（OAuth 流程、令牌存储、多账户模式）

<AccordionGroup>
  <Accordion title="什么是身份验证配置文件？">
    身份验证配置文件是与提供商关联的命名凭据记录（OAuth 或 API 密钥）。配置文件位于：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="典型的配置文件 ID 是什么？">
    OpenClaw 使用提供商前缀的 ID，例如：

    - `anthropic:default`（当不存在电子邮件身份时常见）
    - `anthropic:<email>` 用于 OAuth 身份
    - 您选择的自定义 ID（例如 `anthropic:work`）

  </Accordion>

  <Accordion title="Can I control which auth profile is tried first?">
    是的。配置支持配置文件的可选元数据以及每个提供商的顺序（`auth.order.<provider>`）。这**不会**存储机密信息；它将 ID 映射到提供商/模式并设置轮换顺序。

    如果某个配置文件处于短时间的“冷却”状态（速率限制/超时/身份验证失败）或较长时间的“禁用”状态（计费/余额不足），OpenClaw 可能会暂时跳过该配置文件。要检查此情况，请运行 `openclaw models status --json` 并检查 `auth.unusableProfiles`。调优：`auth.cooldowns.billingBackoffHours*`。

    您还可以通过 CLI 设置“**每个代理**”的顺序覆盖（存储在该代理的 `auth-profiles.json` 中）：

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

    要定位到特定代理：

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

  </Accordion>

  <Accordion title="OAuth vs API key - what is the difference?">
    OpenClaw 支持两者：

    - **OAuth** 通常利用订阅访问权限（如适用）。
    - **API keys** 使用按令牌付费的计费模式。

    向导明确支持 Anthropic 设置令牌和 OpenAI Codex OAuth，并可以为您存储 API 密钥。

  </Accordion>
</AccordionGroup>

## Gateway(网关): ports, "already running", and remote mode

<AccordionGroup>
  <Accordion title="What port does the Gateway(网关) use?">
    `gateway.port` 控制 WebSocket + HTTP（控制 UI、hooks 等）使用的单一多路复用端口。

    优先级：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='Why does openclaw gateway status say "Runtime: running" but "RPC probe: failed"?'>
    因为“running”是**管理器**（supervisor）的视图（launchd/systemd/schtasks）。RPC 探测是 CLI 实际连接到 Gateway WebSocket 并调用 `status`。

    使用 `openclaw gateway status` 并信任这些行：

    - `Probe target:`（探测实际使用的 URL）
    - `Listening:`（端口上实际绑定的内容）
    - `Last gateway error:`（当进程存活但端口未监听时的常见根本原因）

  </Accordion>

  <Accordion title='为什么 OpenClaw Gateway 状态显示的“Config (cli)”和“Config (service)”不一致？'>
    您正在编辑一个配置文件，而服务正在运行另一个（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    修复方法：

    ```bash
    openclaw gateway install --force
    ```

    请在您希望服务使用的同一 `--profile` / 环境中运行该命令。

  </Accordion>

  <Accordion title='“另一个 Gateway 实例已在监听”是什么意思？'>
    OpenClaw 通过在启动时立即绑定 WebSocket 监听器来强制执行运行时锁（默认为 `ws://127.0.0.1:18789`）。如果绑定失败并出现 `EADDRINUSE`，它将抛出 `GatewayLockError`，指示另一个实例已在监听。

    修复方法：停止另一个实例，释放端口，或使用 `openclaw gateway --port <port>` 运行。

  </Accordion>

  <Accordion title="如何在远程模式下运行 OpenClaw（客户端连接到其他地方的 Gateway(网关)）？">
    设置 `gateway.mode: "remote"` 并指向远程 WebSocket URL，可选择使用令牌/密码：

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

  </Accordion>

  <Accordion title='控制界面显示“未授权”（或不断重新连接）。现在怎么办？'>
    您的网关在启用了身份验证 (`gateway.auth.*`) 的情况下运行，但界面未发送匹配的令牌/密码。

    事实（来自代码）：

    - 控制界面将令牌保存在 `sessionStorage` 中，用于当前浏览器标签页会话和所选网关 URL，因此同一标签页的刷新可以继续工作，而无需恢复长期的 localStorage 令牌持久性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，当网关返回重试提示 (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`) 时，受信任的客户端可以使用缓存的设备令牌尝试一次有限的重试。

    修复：

    - 最快的方法：`openclaw dashboard`（打印并复制仪表板 URL，尝试打开；如果是无头模式则显示 SSH 提示）。
    - 如果您还没有令牌：`openclaw doctor --generate-gateway-token`。
    - 如果是远程操作，请先建立隧道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/`。
    - 在网关主机上设置 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - 在控制界面设置中，粘贴相同的令牌。
    - 如果在一次重试后仍然不匹配，请轮换/重新批准配对的设备令牌：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 仍然卡住？运行 `openclaw status --all` 并按照 [故障排除](/zh/gateway/troubleshooting) 操作。有关身份验证的详细信息，请参阅 [仪表板](/zh/web/dashboard)。

  </Accordion>

  <Accordion title="我设置了 gateway.bind tailnet 但它无法绑定，也没有任何监听">
    `tailnet` 绑定会从您的网络接口 (100.64.0.0/10) 中选择一个 Tailscale IP。如果机器不在 Tailscale 上（或者接口已关闭），则没有任何内容可供绑定。

    修复：

    - 在该主机上启动 Tailscale（使其具有 100.x 地址），或者
    - 切换到 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是显式的。`auto` 优先使用环回地址；当您需要仅限 tailnet 的绑定时，请使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="Can I run multiple Gateways on the same host?">
    通常不需要——一个 Gateway(网关) 可以运行多个消息通道和代理。仅在需要冗余（例如：救援机器人）或硬隔离时才使用多个 Gateway。

    可以，但您必须隔离：

    - `OPENCLAW_CONFIG_PATH` （每个实例的配置）
    - `OPENCLAW_STATE_DIR` （每个实例的状态）
    - `agents.defaults.workspace` （工作区隔离）
    - `gateway.port` （唯一端口）

    快速设置（推荐）：

    - 每个实例使用 `openclaw --profile <name> ...`（自动创建 `~/.openclaw-<name>`）。
    - 在每个配置文件中设置唯一的 `gateway.port`（或者在手动运行时传递 `--port`）。
    - 安装每个配置文件的服务： `openclaw --profile <name> gateway install`。

    配置文件也会给服务名添加后缀（`ai.openclaw.<profile>`；旧版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
    完整指南：[Multiple gateways](/zh/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='What does "invalid handshake" / code 1008 mean?'>
    Gateway(网关) 是一个 **WebSocket 服务器**，它期望收到的第一条消息是 `connect` 帧。如果收到其他任何内容，它将以 **code 1008**（策略违规）关闭连接。

    常见原因：

    - 您在浏览器中打开了 **HTTP** URL（`http://...`），而不是 WS 客户端。
    - 您使用了错误的端口或路径。
    - 代理或隧道剥离了身份验证标头，或发送了非 Gateway(网关) 请求。

    快速修复：

    1. 使用 WS URL： `ws://<host>:18789`（如果是 HTTPS 则为 `wss://...`）。
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

    您可以通过 `logging.file` 设置稳定路径。文件日志级别由 `logging.level` 控制。控制台详细程度由 `--verbose` 和 `logging.consoleLevel` 控制。

    最快的日志跟踪：

    ```bash
    openclaw logs --follow
    ```

    服务/监督者日志（当网关通过 launchd/systemd 运行时）：

    - macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（默认：`~/.openclaw/logs/...`；配置文件使用 `~/.openclaw-<profile>/logs/...`）
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    更多信息请参阅 [故障排除](/zh/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="如何启动/停止/重启 Gateway(网关) 服务？">
    使用网关助手：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手动运行网关，`openclaw gateway --force` 可以回收端口。请参阅 [Gateway(网关)](/zh/gateway)。

  </Accordion>

  <Accordion title="我在 Windows 上关闭了终端 - 如何重启 OpenClaw？">
    **有两种 Windows 安装模式**：

    **1) WSL2（推荐）：**网关在 Linux 内部运行。

    打开 PowerShell，进入 WSL，然后重启：

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您从未安装过该服务，请在以前台模式启动它：

    ```bash
    openclaw gateway run
    ```

    **2) 原生 Gateway(网关)（不推荐）：**网关直接在 Windows 中运行。

    打开 PowerShell 并运行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手动运行它（无服务），请使用：

    ```powershell
    openclaw gateway run
    ```

    文档：[Linux (Windows)](/zh/platforms/windows)，[Gateway(网关) 服务运行手册](/zh/gateway)。

  </Accordion>

  <Accordion title="Gateway(网关)已启动，但从未收到回复。我应该检查什么？">
    首先进行快速健康检查：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常见原因：

    - **gateway host**上未加载模型认证（检查 `models status`）。
    - 渠道配对/白名单阻止了回复（检查渠道配置和日志）。
    - WebChat/Dashboard 在没有正确令牌的情况下打开。

    如果您在远程，请确认隧道/Tailscale 连接已启动，并且
    Gateway(网关) WebSocket 可达。

    文档：[渠道](/zh/channels)、[故障排除](/zh/gateway/troubleshooting)、[远程访问](/zh/gateway/remote)。

  </Accordion>

  <Accordion title='"Disconnected from gateway: no reason" - 现在怎么办？'>
    这通常意味着 UI 失去了 WebSocket 连接。检查：

    1. Gateway(网关)是否正在运行？ `openclaw gateway status`
    2. Gateway(网关)是否健康？ `openclaw status`
    3. UI 是否有正确的令牌？ `openclaw dashboard`
    4. 如果是远程，隧道/Tailscale 链接是否已启动？

    然后查看日志：

    ```bash
    openclaw logs --follow
    ```

    文档：[仪表板](/zh/web/dashboard)、[远程访问](/zh/gateway/remote)、[故障排除](/zh/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失败。我应该检查什么？">
    首先检查日志和渠道状态：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然后对照错误信息：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 菜单条目过多。OpenClaw 已经将其修剪到 Telegram 限制并尝试使用较少的命令重试，但仍然需要删除部分菜单条目。减少插件/技能/自定义命令，或者如果不需要菜单，请禁用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或类似的网络错误：如果您使用的是 VPS 或位于代理后面，请确认允许出站 HTTPS 且 `api.telegram.org` 的 DNS 解析正常。

    如果 Gateway(网关) 是远程的，请确保您正在查看 Gateway(网关) 主机上的日志。

    文档：[Telegram](/zh/channels/telegram)，[渠道故障排除](/zh/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 无输出。我应该检查什么？">
    首先确认 Gateway(网关) 是可达的，并且代理可以运行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 查看当前状态。如果您期望在聊天渠道中收到回复，请确保已启用投递（`/deliver on`）。

    文档：[TUI](/zh/web/tui)，[斜杠命令](/zh/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何完全停止然后启动 Gateway(网关)？">
    如果您安装了服务：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    这将停止/启动**受监管服务**（macOS 上的 launchd，Linux 上的 systemd）。
    当 Gateway(网关) 作为守护进程在后台运行时，请使用此方法。

    如果您在前台运行，请使用 Ctrl-C 停止，然后：

    ```bash
    openclaw gateway run
    ```

    文档：[Gateway(网关) 服务运行手册](/zh/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: 重启 **后台服务** (launchd/systemd)。
    - `openclaw gateway`: 在此终端会话中于**前台**运行 gateway。

    如果您安装了服务，请使用 gateway 命令。当您想要一次性在前台运行时，请使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    使用 `--verbose` 启动 Gateway 以获取更多控制台详细信息。然后检查日志文件中的 渠道 auth、模型 routing 和 Gateway(网关) 错误。
  </Accordion>
</AccordionGroup>

## 媒体和附件

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    来自代理的出站附件必须包含一行 `MEDIA:<path-or-url>`（单独一行）。请参阅 [OpenClaw assistant setup](/zh/start/openclaw) 和 [Agent send](/zh/tools/agent-send)。

    CLI 发送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    还要检查：

    - 目标渠道支持出站媒体，且未被允许列表阻止。
    - 文件在提供商的大小限制范围内（图片会被调整为最大 2048px）。

    请参阅 [Images](/zh/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全与访问控制

<AccordionGroup>
  <Accordion title="Is it safe to expose OpenClaw to inbound 私信?">
    将入站私信视为不受信任的输入。默认设置旨在降低风险：

    - 支持私信的渠道上的默认行为是**配对**：
      - 未知发送者会收到配对代码；bot 不会处理他们的消息。
      - 使用以下命令批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 待处理的请求限制为**每个渠道 3 个**；如果代码未收到，请检查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公开开放私信需要明确选择加入 (`dmPolicy: "open"` 和允许列表 `"*"`)。

    运行 `openclaw doctor` 以显示有风险的私信策略。

  </Accordion>

  <Accordion title="提示词注入只是公共机器人需要关注的问题吗？">
    不是。提示词注入涉及的是**不受信任的内容**，而不仅仅是谁能向机器人发送私信。
    如果您的助手读取外部内容（网络搜索/抓取、浏览器页面、电子邮件、
    文档、附件、粘贴的日志），这些内容可能包含试图
    劫持模型的指令。即使**您是唯一的发送者**，也可能发生这种情况。

    最大的风险在于启用工具时：模型可能会被诱骗
    泄露上下文或代表您调用工具。您可以通过以下方式减少破坏半径：

    - 使用只读或禁用工具的“读取器”代理来汇总不受信任的内容
    - 为启用工具的代理关闭 `web_search` / `web_fetch` / `browser`
    - 沙箱隔离和严格的工具允许列表

    详情：[安全性](/zh/gateway/security)。

  </Accordion>

  <Accordion title="我的机器人应该有自己的电子邮件、GitHub 账户或电话号码吗？">
    是的，对于大多数设置来说是的。使用独立的账户和电话号码隔离机器人
    可以在出现问题时减少破坏半径。这也使得轮换
    凭据或撤销访问权限更容易，且不会影响您的个人账户。

    从小处着手。仅授予您实际需要的工具和账户访问权限，并在需要时
    稍后扩展。

    文档：[安全性](/zh/gateway/security), [配对](/zh/channels/pairing)。

  </Accordion>

  <Accordion title="我可以让它自主控制我的短信吗？这安全吗？">
    我们**不**建议完全控制您的个人消息。最安全的模式是：

    - 将私信保持在**配对模式**或严格的允许列表中。
    - 如果您希望它代表您发送消息，请使用**单独的号码或账户**。
    - 让它起草草稿，然后在发送前**进行批准**。

    如果您想进行实验，请在专用账户上进行，并保持其隔离。请参阅
    [安全性](/zh/gateway/security)。

  </Accordion>

<Accordion title="我可以使用更便宜的模型来执行个人助理任务吗？">
  是的，**前提是**该代理仅用于聊天且输入可信。较低等级的模型更容易受到
  指令劫持，因此对于启用了工具的代理或读取不受信任内容时应避免使用它们。如果您
  必须使用较小的模型，请锁定工具并在沙箱中运行。请参阅 [安全性](/zh/gateway/security)。
</Accordion>

  <Accordion title="我在 Telegram 中运行了 /start 但没有收到配对代码">
    仅当未知发送者向机器人发送消息且
    `dmPolicy: "pairing"` 已启用时，才会发送配对代码。`/start` 本身不会生成代码。

    检查待处理的请求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您希望立即获得访问权限，请将您的发送者 ID 加入允许列表或为该帐户设置 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它会给我的联系人发消息吗？配对是如何工作的？">
    不会。默认的 WhatsApp 私信策略是**配对**。未知发送者只会收到配对代码，其消息**不会被处理**。OpenClaw 仅回复其收到的聊天或您触发的显式发送。

    使用以下命令批准配对：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待处理的请求：

    ```bash
    openclaw pairing list whatsapp
    ```

    向导电话号码提示：它用于设置您的**允许列表/所有者**，以便允许您自己的私信。它不用于自动发送。如果您在个人的 WhatsApp 号码上运行，请使用该号码并启用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天命令、中止任务和“它无法停止”

<AccordionGroup>
  <Accordion title="如何阻止内部系统消息在聊天中显示？">
    大多数内部或工具消息仅在该会话启用了 **verbose**（详细）或 **reasoning**（推理）时才会出现。

    在出现该问题的聊天中修复：

    ```
    /verbose off
    /reasoning off
    ```

    如果仍然很吵杂，请在控制 UI 中检查会话设置并将 verbose 设置为 **inherit**（继承）。同时确认您没有使用在配置中将 `verboseDefault` 设置为 `on` 的机器人配置文件。

    文档：[Thinking and verbose](/zh/tools/thinking)、[Security](/zh/gateway/security#reasoning-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在运行的任务？">
    发送以下任意内容**作为独立消息**（不要带斜杠）：

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

    大多数命令必须作为以 `/` 开头的**独立**消息发送，但少数快捷方式（如 `/status`）对于列入白名单的发送者也可以内联使用。

  </Accordion>

  <Accordion title='如何从 Discord 发送 Telegram 消息？（“跨上下文消息被拒绝”）'>
    OpenClaw 默认阻止**跨提供商**消息传递。如果工具调用绑定到 Telegram，除非您明确允许，否则它不会发送到 Discord。

    为代理启用跨提供商消息传递：

    ```json5
    {
      agents: {
        defaults: {
          tools: {
            message: {
              crossContext: {
                allowAcrossProviders: true,
                marker: { enabled: true, prefix: "[from {channel}] " },
              },
            },
          },
        },
      },
    }
    ```

    编辑配置后重启网关。如果您只想对单个代理执行此操作，请在 `agents.list[].tools.message` 下进行设置。

  </Accordion>

  <Accordion title='为什么感觉机器人会“忽略”快速连续发送的消息？'>
    队列模式控制新消息如何与正在进行的运行交互。使用 `/queue` 来更改模式：

    - `steer` - 新消息重定向当前任务
    - `followup` - 一次运行一条消息
    - `collect` - 批量处理消息并回复一次（默认）
    - `steer-backlog` - 立即引导，然后处理积压
    - `interrupt` - 中止当前运行并重新开始

    您可以为后续模式添加 `debounce:2s cap:25 drop:summarize` 等选项。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title="使用 API 密钥时 Anthropic 的默认模型是什么？">
    在 OpenClaw 中，凭证和模型选择是分开的。设置 `ANTHROPIC_API_KEY`（或在身份验证配置文件中存储
    Anthropic API 密钥）可以启用身份验证，但实际的默认模型是您在 `agents.defaults.model.primary`
    中配置的任何模型（例如，`anthropic/claude-sonnet-4-6` 或
    `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile
    "anthropic:default"`，这意味着 Gateway(网关) 无法在正在运行的代理的预期 `auth-profiles.json`
    中找到 Anthropic 凭证。
  </Accordion>
</AccordionGroup>

---

还是无法解决？请在 [Discord](https://discord.com/invite/clawd) 中提问或发起 [GitHub 讨论](https://github.com/openclaw/openclaw/discussions)。

import zh from "/components/footer/zh.mdx";

<zh />
