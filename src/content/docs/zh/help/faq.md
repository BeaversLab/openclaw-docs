---
summary: "关于 OpenClaw 设置、配置和使用的常见问题"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常见问题"
---

# 常见问题

针对实际设置（本地开发、VPS、多代理、OAuth/API 密钥、模型故障转移）的快速解答和更深入的故障排除。有关运行时诊断，请参阅 [Troubleshooting](/en/gateway/troubleshooting)。有关完整的配置参考，请参阅 [Configuration](/en/gateway/configuration)。

## 如果出现故障，请先检查这 60 秒

1. **快速状态（首先检查）**

   ```bash
   openclaw status
   ```

   快速本地摘要：操作系统 + 更新、Gateway/服务可达性、代理/会话、提供商配置 + 运行时问题（当 Gateway 可达时）。

2. **可粘贴的报告（可安全分享）**

   ```bash
   openclaw status --all
   ```

   带有日志尾部的只读诊断（令牌已编辑）。

3. **守护进程 + 端口状态**

   ```bash
   openclaw gateway status
   ```

   显示监管程序运行时与 RPC 可达性、探测目标 URL 以及服务可能使用的配置。

4. **深度探测**

   ```bash
   openclaw status --deep
   ```

   运行实时的 Gateway 健康探测，包括受支持时的渠道探测
   （需要可达的 Gateway）。请参阅 [Health](/en/gateway/health)。

5. **查看最新日志**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 宕机，请回退到：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   文件日志与服务日志是分开的；请参阅 [Logging](/en/logging) 和 [Troubleshooting](/en/gateway/troubleshooting)。

6. **运行 Doctor（修复）**

   ```bash
   openclaw doctor
   ```

   修复/迁移配置/状态 + 运行健康检查。请参阅 [Doctor](/en/gateway/doctor)。

7. **Gateway(网关) 快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   请求运行中的 Gateway 提供完整快照（仅限 WS）。请参阅 [Health](/en/gateway/health)。

## 快速开始和首次运行设置

<AccordionGroup>
  <Accordion title="我被卡住了，解决问题的最快方法">
    使用一个可以**查看你的机器**的本地 AI 代理。这远比在 Discord 上提问有效，因为大多数“我被卡住了”的情况都是**本地配置或环境问题**，
    远程协助者无法检查这些问题。

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    这些工具可以读取代码仓库、运行命令、检查日志，并帮助修复你机器级别的
    设置（PATH、服务、权限、身份验证文件）。通过可破解的 安装方式，
    为它们提供**完整的源代码检出**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这将从 git 检出中安装 OpenClaw，以便代理可以读取代码和文档，
    并推断你正在运行的确切版本。你随时可以通过不带 `--install-method git` 参数重新运行安装程序
    来切换回稳定版本。

    提示：要求代理**计划并监督**修复过程（逐步进行），然后仅执行
    必要的命令。这样可以保持更改较小且更容易审查。

    如果你发现了真正的错误或修复方案，请提交 GitHub issue 或发送 PR：
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

    其他有用的 CLI 检查：`openclaw status --all`，`openclaw logs --follow`，
    `openclaw gateway status`，`openclaw health --verbose`。

    快速调试循环：[如果出现问题，最初的 60 秒](#first-60-seconds-if-something-is-broken)。
    安装文档：[安装](/en/install)、[安装程序标志](/en/install/installer)、[更新](/en/install/updating)。

  </Accordion>

  <Accordion title="心跳不断跳过。跳过原因是什么意思？">
    常见的心跳跳过原因：

    - `quiet-hours`：在配置的 active-hours（活跃时间）窗口之外
    - `empty-heartbeat-file`： `HEARTBEAT.md` 存在但仅包含空白/仅表头的脚手架
    - `no-tasks-due`： `HEARTBEAT.md` 任务模式处于活动状态，但尚未有任何任务间隔到期
    - `alerts-disabled`：所有心跳可见性均已禁用（`showOk`、`showAlerts` 和 `useIndicator` 均已关闭）

    在任务模式下，截止时间戳只有在实际的心跳运行
    完成后才会向前推进。跳过的运行不会将任务标记为已完成。

    文档：[Heartbeat](/en/gateway/heartbeat)、[Automation & Tasks](/en/automation)。

  </Accordion>

  <Accordion title="推荐安装和设置 OpenClaw 的方式">
    该仓库建议从源码运行并使用新手引导（新手引导）：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    向导还可以自动构建 UI 资源。在新手引导之后，通常会在端口 **18789** 上运行 Gateway(网关)。

    从源码运行（贡献者/开发者）：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build # auto-installs UI deps on first run
    openclaw onboard
    ```

    如果您还没有全局安装，请通过 `pnpm openclaw onboard` 运行。

  </Accordion>

<Accordion title="新手引导后如何打开仪表板？">向导会在新手引导完成后立即在浏览器中打开一个干净的（非令牌化）仪表板 URL，并在摘要中打印该链接。请保持该标签页打开；如果未启动，请在同一台机器上复制/粘贴打印的 URL。</Accordion>

  <Accordion title="How do I authenticate the dashboard on localhost vs remote?">
    **Localhost (same machine):**

    - Open `http://127.0.0.1:18789/`.
    - If it asks for shared-secret auth, paste the configured token or password into Control UI settings.
    - Token source: `gateway.auth.token` (or `OPENCLAW_GATEWAY_TOKEN`).
    - Password source: `gateway.auth.password` (or `OPENCLAW_GATEWAY_PASSWORD`).
    - If no shared secret is configured yet, generate a token with `openclaw doctor --generate-gateway-token`.

    **Not on localhost:**

    - **Tailscale Serve** (recommended): keep bind loopback, run `openclaw gateway --tailscale serve`, open `https://<magicdns>/`. If `gateway.auth.allowTailscale` is `true`, identity headers satisfy Control UI/WebSocket auth (no pasted shared secret, assumes trusted gateway host); HTTP APIs still require shared-secret auth unless you deliberately use private-ingress `none` or trusted-proxy HTTP auth.
      Bad concurrent Serve auth attempts from the same client are serialized before the failed-auth limiter records them, so the second bad retry can already show `retry later`.
    - **Tailnet bind**: run `openclaw gateway --bind tailnet --token "<token>"` (or configure password auth), open `http://<tailscale-ip>:18789/`, then paste the matching shared secret in dashboard settings.
    - **Identity-aware reverse proxy**: keep the Gateway(网关) behind a non-loopback trusted proxy, configure `gateway.auth.mode: "trusted-proxy"`, then open the proxy URL.
    - **SSH tunnel**: `ssh -N -L 18789:127.0.0.1:18789 user@host` then open `http://127.0.0.1:18789/`. Shared-secret auth still applies over the tunnel; paste the configured token or password if prompted.

    See [Dashboard](/en/web/dashboard) and [Web surfaces](/en/web) for bind modes and auth details.

  </Accordion>

  <Accordion title="为什么聊天审批会有两个执行审批配置？">
    它们控制不同的层：

    - `approvals.exec`：将审批提示转发到聊天目的地
    - `channels.<channel>.execApprovals`：使该渠道充当执行审批的原生审批客户端

    主机执行策略仍然是真正的审批关口。聊天配置仅控制审批提示出现的位置以及人们如何回答它们。

    在大多数设置中，您**不需要**同时使用两者：

    - 如果聊天已经支持命令和回复，同聊 `/approve` 通过共享路径工作。
    - 如果受支持的原生渠道可以安全地推断审批者，OpenClaw 现在会在 `channels.<channel>.execApprovals.enabled` 未设置或 `"auto"` 时自动启用私信优先的原生审批。
    - 当原生审批卡片/按钮可用时，该原生 UI 是主要路径；仅当工具结果指示聊天审批不可用或手动审批是唯一路径时，Agent 才应包含手动 `/approve` 命令。
    - 仅当提示也必须转发到其他聊天或显式运营室时，才使用 `approvals.exec`。
    - 仅当您明确希望将审批提示发布回原始房间/主题时，才使用 `channels.<channel>.execApprovals.target: "channel"` 或 `"both"`。
    - 插件审批又是分开的：默认情况下它们使用同聊 `/approve`，可选 `approvals.plugin` 转发，并且只有一些原生渠道在顶部保留插件审批原生处理。

    简而言之：转发用于路由，原生客户端配置用于更丰富的特定于渠道的用户体验。
    参见 [Exec Approvals](/en/tools/exec-approvals)。

  </Accordion>

  <Accordion title="我需要什么运行时？">
    需要 Node **>= 22**。推荐使用 `pnpm`。Bun **不推荐**用于 Gateway(网关)。
  </Accordion>

  <Accordion title="它能在 Raspberry Pi 上运行吗？">
    是的。Gateway(网关)非常轻量——文档列出 **512MB-1GB RAM**、**1 核**和约 **500MB**
    磁盘空间对于个人使用来说已足够，并指出 **Raspberry Pi 4 可以运行它**。

    如果你需要额外的余量（日志、媒体、其他服务），**建议 2GB**，但这并非硬性最低要求。

    提示：一个小型的 Pi/VPS 可以托管 Gateway(网关)，并且你可以在笔记本电脑/手机上配对 **节点 (nodes)**
    用于本地屏幕/摄像头/画布或命令执行。请参阅 [节点](/en/nodes)。

  </Accordion>

  <Accordion title="关于 Raspberry Pi 安装有什么提示吗？">
    简短回答：可以用，但预计会有一些粗糙的地方。

    - 使用 **64 位** 操作系统并保持 Node >= 22。
    - 优先使用 **可破解的安装方式** 以便查看日志并快速更新。
    - 开始时不添加频道/技能，然后逐个添加。
    - 如果遇到奇怪的二进制问题，这通常是一个 **ARM 兼容性** 问题。

    文档：[Linux](/en/platforms/linux), [安装](/en/install)。

  </Accordion>

  <Accordion title="It is stuck on wake up my friend / 新手引导 will not hatch. What now?">
    该屏幕取决于 Gateway(网关)是否可达以及是否已通过身份验证。TUI 也会在首次孵化时自动发送
    “Wake up, my friend!”。如果你看到该行却**没有回复**
    且 token 数量一直为 0，说明代理从未运行。

    1. 重启 Gateway(网关)：

    ```bash
    openclaw gateway restart
    ```

    2. 检查状态和身份验证：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. 如果仍然卡住，请运行：

    ```bash
    openclaw doctor
    ```

    如果 Gateway(网关) 是远程的，请确保隧道/Tailscale 连接已启动，并且 UI
    指向正确的 Gateway(网关)。请参阅 [远程访问](/en/gateway/remote)。

  </Accordion>

  <Accordion title="不重新进行新手引导，可以将我的设置迁移到新机器（Mac mini）吗？">
    是的。复制 **state 目录**和 **workspace（工作空间）**，然后运行一次 Doctor。这
    可以让你的机器人保持“完全相同”（内存、会话历史、身份验证和渠道
    状态），只要你复制了 **这两个** 位置：

    1. 在新机器上安装 OpenClaw。
    2. 从旧机器复制 `$OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）。
    3. 复制你的工作空间（默认：`~/.openclaw/workspace`）。
    4. 运行 `openclaw doctor` 并重启 Gateway(网关)服务。

    这将保留配置、身份验证配置文件、WhatsApp 凭据、会话和内存。如果你处于
    远程模式，请记住 Gateway(网关) 主机拥有会话存储和工作空间。

    **重要：** 如果你只是将工作空间提交/推送到 GitHub，你备份的是
    **内存 + 引导文件**，但**不**包括会话历史或身份验证。这些位于
    `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    相关：[迁移](/en/install/migrating)、[磁盘上的文件位置](#where-things-live-on-disk)、
    [Agent 工作空间](/en/concepts/agent-workspace)、[Doctor](/en/gateway/doctor)、
    [远程模式](/en/gateway/remote)。

  </Accordion>

  <Accordion title="在哪里可以看到最新版本的更新内容？">
    查看 GitHub 更改日志：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新的条目位于顶部。如果顶部部分标记为 **Unreleased（未发布）**，则下一个带有日期的
    部分是最新发布的版本。条目按 **Highlights（亮点）**、**Changes（更改）** 和
    **Fixes（修复）** 分组（必要时还包括文档/其他部分）。

  </Accordion>

  <Accordion title="无法访问 docs.openclaw.ai（SSL 错误）">
    某些 Comcast/Xfinity 连接通过 Xfinity
    高级安全功能错误地阻止了 `docs.openclaw.ai`。请禁用它或将 `docs.openclaw.ai` 加入白名单，然后重试。
    请通过在此处报告来帮助我们解除阻止：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果你仍然无法访问该站点，文档已在 GitHub 上镜像：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="Stable 和 Beta 的区别">
    **Stable** 和 **beta** 是 **npm dist-tags**，不是单独的代码分支：

    - `latest` = stable
    - `beta` = 用于测试的早期构建

    通常，stable 版本会先发布到 **beta**，然后通过显式的提升步骤将同一版本移动到 `latest`。维护者在需要时也可以直接发布到 `latest`。这就是为什么在提升之后，beta 和 stable 可能指向**同一版本**。

    查看变更内容：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    关于单行安装命令以及 beta 和 dev 的区别，请参阅下方的折叠面板。

  </Accordion>

  <Accordion title="如何安装 Beta 版本，Beta 和 Dev 有什么区别？">
    **Beta** 是 npm dist-tag `beta`（在提升后可能与 `latest` 相同）。
    **Dev** 是 `main` (git) 的移动头部；发布时，它使用 npm dist-tag `dev`。

    单行命令 (macOS/Linux)：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安装程序 (PowerShell)：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多详情：[开发渠道](/en/install/development-channels) 和 [安装程序标志](/en/install/installer)。

  </Accordion>

  <Accordion title="如何尝试最新的版本？">
    两种选择：

    1. **Dev 渠道 (git checkout)：**

    ```bash
    openclaw update --channel dev
    ```

    这会切换到 `main` 分支并从源代码更新。

    2. **可修改安装 (来自安装站点)：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这会为您提供一个可以编辑的本地仓库，然后通过 git 更新。

    如果您喜欢手动进行干净的克隆，请使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文档：[更新](/en/cli/update)、[开发渠道](/en/install/development-channels)、
    [安装](/en/install)。

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

    Beta 详细安装：

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

    更多选项：[Installer flags](/en/install/installer)。

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

    - 将该目录添加到您的用户 PATH（在 Windows 上不需要 `\bin` 后缀；在大多数系统上是 `%AppData%\npm`）。
    - 更新 PATH 后关闭并重新打开 PowerShell。

    如果您想要最顺畅的 Windows 设置，请使用 **WSL2** 而不是原生 Windows。
    文档：[Windows](/en/platforms/windows)。

  </Accordion>

  <Accordion title="Windows 执行输出显示为乱码中文 - 我该怎么办？">
    这通常是由于原生 Windows Shell 上的控制台代码页不匹配造成的。

    症状：

    - `system.run`/`exec` 输出将中文显示为乱码
    - 同一条命令在其他终端配置文件中显示正常

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

    如果您在最新的 OpenClaw 上仍然遇到此问题，请在以下位置跟踪/报告：

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="文档没有回答我的问题 - 我如何获得更好的答案？">
    使用 **hackable (git) 安装**，以便您在本地拥有完整的源代码和文档，然后
    _从该文件夹_ 询问您的机器人（或 Claude/Codex），以便它可以读取仓库并准确回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多详情：[安装](/en/install) 和 [安装程序标志](/en/install/installer)。

  </Accordion>

  <Accordion title="如何安装 OpenClaw 到 Linux 上？">
    简短回答：遵循 Linux 指南，然后运行新手引导。

    - Linux 快速路径 + 服务安装：[Linux](/en/platforms/linux)。
    - 完整演练：[入门指南](/en/start/getting-started)。
    - 安装程序 + 更新：[安装和更新](/en/install/updating)。

  </Accordion>

  <Accordion title="如何安装 OpenClaw 到 VPS 上？">
    任何 Linux VPS 均可。在服务器上安装，然后使用 SSH/Tailscale 连接到 Gateway(网关)。

    指南：[exe.dev](/en/install/exe-dev)、[Hetzner](/en/install/hetzner)、[Fly.io](/en/install/fly)。
    远程访问：[Gateway(网关) 远程](/en/gateway/remote)。

  </Accordion>

  <Accordion title="云端/VPS 安装指南在哪里？">
    我们维护了一个包含常见提供商的**托管中心**。选择一个并按照指南操作：

    - [VPS 托管](/en/vps) (所有提供商汇总于此)
    - [Fly.io](/en/install/fly)
    - [Hetzner](/en/install/hetzner)
    - [exe.dev](/en/install/exe-dev)

    云端工作原理：**Gateway(网关) 运行在服务器上**，您可以通过控制 UI（或 Gateway(网关)/SSH）从笔记本电脑/手机访问它。您的状态 + 工作区位于服务器上，因此请将主机视为事实来源并对其进行备份。

    您可以将**节点** (Mac/Tailscale/iOS/headless) 配对到该云端 Android，以便在将 Gateway(网关) 保留在云端的同时访问本地屏幕/摄像头/画布或在笔记本电脑上运行命令。

    中心：[平台](/en/platforms)。远程访问：[Gateway(网关) 远程](/en/gateway/remote)。
    节点：[节点](/en/nodes)、[节点 Gateway(网关)](/en/cli/nodes)。

  </Accordion>

  <Accordion title="我可以让 OpenClaw 自我更新吗？">
    简短回答：**可能，但不建议**。更新流程可能会重启 Gateway(网关)（这会断开活动会话），可能需要干净的 git checkout，并且可能会提示进行确认。更安全的方法：以操作员身份从 shell 运行更新。

    使用 CLI：

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel stable|beta|dev
    openclaw update --tag <dist-tag|version>
    openclaw update --no-restart
    ```

    如果您必须通过代理自动化此操作：

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    文档：[更新](/en/cli/update)、[正在更新](/en/install/updating)。

  </Accordion>

  <Accordion title="新手引导实际上做了什么？">
    `openclaw onboard` 是推荐的设置路径。在 **本地模式** 下，它会引导您完成以下步骤：

    - **模型/身份验证设置**（提供商 OAuth、API 密钥、Anthropic 设置令牌，以及 LM Studio 等本地模型选项）
    - **工作区** 位置 + 引导文件
    - **Gateway(网关) 设置**（绑定/端口/身份验证/tailscale）
    - **渠道**（WhatsApp、Telegram、Discord、Mattermost、Signal、iMessage，以及捆绑的渠道插件如 QQ Bot）
    - **守护进程安装**（macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd 用户单元）
    - **健康检查** 和 **技能** 选择

    如果您配置的模型未知或缺少身份验证，它也会发出警告。

  </Accordion>

  <Accordion title="运行此程序需要 Claude 或 OpenAI 订阅吗？">
    不需要。您可以使用 **API 密钥**（Anthropic/OpenAI/其他）或 **仅本地模型** 来运行 OpenClaw，这样您的数据将保留在您的设备上。订阅（Claude Pro/Max 或 OpenAI Codex）是验证这些提供商的可选方式。

    对于 OpenClaw 中的 Anthropic，实际的划分方式如下：

    - **Anthropic API 密钥**：标准的 Anthropic API 计费
    - **OpenClaw 中的 Claude CLI / Claude 订阅身份验证**：Anthropic 员工告诉我们这种使用再次被允许，除非 Anthropic 发布新政策，否则 OpenClaw 将 `claude -p` 使用视为对此集成的认可

    对于长期运行的 Gateway(网关) 主机，Anthropic API 密钥仍然是更可预测的设置方式。明确支持将 OpenAI Codex OAuth 用于 OpenClaw 等外部工具。

    OpenClaw 还支持其他托管订阅式选项，包括 **Qwen Cloud Coding Plan**、**MiniMax Coding Plan** 和 **Z.AI / GLM Coding Plan**。

    文档：[Anthropic](/en/providers/anthropic)、[OpenAI](/en/providers/openai)、
    [Qwen Cloud](/en/providers/qwen)、
    [MiniMax](/en/providers/minimax)、[GLM Models](/en/providers/glm)、
    [Local models](/en/gateway/local-models)、[Models](/en/concepts/models)。

  </Accordion>

  <Accordion title="我可以在没有 API 密钥的情况下使用 Claude Max 订阅吗？">
    是的。

    Anthropic 员工告知我们，OpenClaw 风格的 Claude CLI 使用再次被允许，因此除非 Anthropic 发布新政策，否则 OpenClaw 将此集成中的 Claude 订阅身份验证和 `claude -p` 使用视为已获准许。如果您希望拥有最可预测的服务器端设置，请改用 Anthropic API 密钥。

  </Accordion>

  <Accordion title="你们支持 Claude 订阅身份验证（Claude Pro 或 Max）吗？">
    是的。

    Anthropic 员工告知我们这种使用再次被允许，因此除非 Anthropic 发布新政策，否则 OpenClaw 将此集成中的 Claude CLI 复用和 `claude -p` 使用视为已获准许。

    Anthropic setup-token 仍然作为受支持的 OpenClaw token 路径可用，但现在如果可用，OpenClaw 更倾向于使用 Claude CLI 复用和 `claude -p`。对于生产或多用户工作负载，Anthropic API 密钥身份验证仍然是更安全、更可预测的选择。如果您希望在 OpenClaw 中使用其他订阅式托管选项，请参阅 [OpenAI](/en/providers/openai)、[Qwen / Model
    Cloud](/en/providers/qwen)、[MiniMax](/en/providers/minimax) 和 [GLM
    Models](/en/providers/glm)。

  </Accordion>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>
<Accordion title="为什么我会收到来自 Anthropic 的 HTTP 429 rate_limit_error？">
这意味着您的 **Anthropic 配额/速率限制** 在当前时间窗口内已耗尽。如果您
使用的是 **Claude CLI**，请等待时间窗口重置或升级您的计划。如果您
使用的是 **Anthropic API key**，请检查 Anthropic 控制台
中的使用情况/计费，并根据需要提高限制。

    如果消息具体是：
    `Extra usage is required for long context requests`，则请求正在尝试使用
    Anthropic 的 1M 上下文测试版（`context1m: true`）。这仅在您的

凭据符合长上下文计费条件时才有效（API key 计费或
启用了额外使用额度的 OpenClaw Claude-login 路径）。

    提示：设置一个 **备用模型**，以便在提供商受到速率限制时 OpenClaw 可以继续回复。
    请参阅 [模型](/en/cli/models)、[OAuth](/en/concepts/oauth) 和
    [/gateway/故障排除#anthropic-429-extra-usage-required-for-long-context](/en/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

<Accordion title="是否支持 AWS Bedrock？">
  是的。OpenClaw 捆绑了 **Amazon Bedrock (Converse)** 提供商。如果存在 AWS 环境标记，OpenClaw 可以自动发现流式/文本 Bedrock 目录并将其作为隐式 `amazon-bedrock` 提供商合并；否则您可以显式启用 `plugins.entries.amazon-bedrock.config.discovery.enabled` 或添加手动提供商条目。请参阅 [Amazon Bedrock](/en/providers/bedrock) 和 [模型提供商](/en/providers/models)。如果您更喜欢托管密钥流程，在 Bedrock
  前面使用一个兼容 OpenAI 的代理仍然是一个有效的选项。
</Accordion>

<Accordion title="Codex 认证是如何工作的？">OpenClaw 通过 OAuth（ChatGPT 登录）支持 **OpenAI Code (Codex)**。新手引导可以运行 OAuth 流程，并在适当时将默认模型设置为 `openai-codex/gpt-5.4`。请参阅 [模型提供商](/en/concepts/model-providers) 和 [新手引导 (CLI)](/en/start/wizard)。</Accordion>

  <Accordion title="为什么 ChatGPT GPT-5.4 无法在 OpenClaw 中解锁 openai/gpt-5.4？">
    OpenClaw 将这两条路由分开处理：

    - `openai-codex/gpt-5.4` = ChatGPT/Codex OAuth
    - `openai/gpt-5.4` = 直接的 OpenAI 平台 API

    在 OpenClaw 中，ChatGPT/Codex 登录连接到了 `openai-codex/*` 路由，
    而不是直接的 `openai/*` 路由。如果您想要 API 中的直接 OpenClaw 路径，
    请设置 `OPENAI_API_KEY` （或等效的 OpenAI 提供商配置）。
    如果您想要 OpenClaw 中的 ChatGPT/Codex 登录，请使用 `openai-codex/*`。

  </Accordion>

  <Accordion title="为什么 Codex OAuth 限制可能与 ChatGPT 网页版不同？">
    `openai-codex/*` 使用 Codex OAuth 路由，其可用配额窗口由
    OpenAI 管理且取决于计划。实际上，这些限制可能与
    ChatGPT 网站/应用体验不同，即使两者关联的是同一个账户。

    OpenClaw 可以在 `openclaw models status` 中显示当前可见的提供商使用情况/配额窗口，
    但它不会编造或将 ChatGPT 网页版权限标准化为直接 API 访问权限。如果您想要直接的 OpenAI 平台
    计费/限制路径，请结合 API 密钥使用 `openai/*`。

  </Accordion>

  <Accordion title="您是否支持 OpenAI 订阅身份验证 (Codex OAuth)？">
    是的。OpenClaw 完全支持 **OpenAI Code (Codex) 订阅 OAuth**。
    OpenAI 明确允许在 OAuth 等外部工具/工作流中使用订阅 OpenClaw。
    新手引导可以为您运行 OAuth 流程。

    参见 [OAuth](/en/concepts/oauth)、[Model providers](/en/concepts/model-providers) 和 [新手引导 (CLI)](/en/start/wizard)。

  </Accordion>

  <Accordion title="如何设置 Gemini CLI OAuth？">
    Gemini CLI 使用的是**插件授权流程**，而不是 `openclaw.json` 中的客户端 ID 或密钥。

    步骤：

    1. 在本地安装 Gemini CLI，以便 `gemini` 位于 `PATH` 中
       - Homebrew：`brew install gemini-cli`
       - CLI：`npm install -g @google/gemini-cli`
    2. 启用插件：`openclaw plugins enable google`
    3. 登录：`openclaw models auth login --provider google-gemini-cli --set-default`
    4. 登录后的默认模型：`google-gemini-cli/gemini-3-flash-preview`
    5. 如果请求失败，请在网关主机上设置 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`

    这会将 OAuth 令牌存储在网关主机的授权配置文件中。详情：[Model providers](/en/concepts/model-providers)。

  </Accordion>

<Accordion title="使用本地模型进行日常聊天可以吗？">通常不可以。OpenClaw 需要大上下文和强大的安全性；小卡显存会截断并泄露数据。如果必须使用，请在本地运行你能运行的**最大**模型版本（LM Studio），并参阅 [/gateway/local-models](/en/gateway/local-models)。较小/量化的模型会增加提示注入风险 - 请参阅 [Security](/en/gateway/security)。</Accordion>

<Accordion title="如何将托管模型流量保留在特定区域内？">选择区域固定的端点。OpenRouter 为 MiniMax、Kimi 和 GLM 提供了美国托管的选项；选择美国托管的变体可将数据保留在区域内。您仍可以通过使用 `models.mode: "merge"` 将 Anthropic/OpenAI 与这些模型并列列出，以便在选择区域化提供商的同时保持备用可用性。</Accordion>

  <Accordion title="我必须购买 Mac Mini 才能安装这个吗？">
    不需要。OpenClaw 可以运行在 macOS 或 Linux 上（Windows 通过 WSL2）。Mac mini 是可选的 - 有些人会购买一个作为常驻主机，但一个小型 VPS、家庭服务器或 Raspberry Pi 级别的设备也可以工作。

    只有在使用 **仅限 macOS 的工具** 时才需要 Mac。对于 iMessage，请使用 [BlueBubbles](/en/channels/bluebubbles)（推荐）- BlueBubbles 服务器运行在任何 Mac 上，而 Gateway(网关) 可以运行在 Linux 或其他地方。如果您想要其他仅限 macOS 的工具，请在 Mac 上运行 Gateway(网关) 或配对一个 macOS 节点。

    文档：[BlueBubbles](/en/channels/bluebubbles)、[Nodes](/en/nodes)、[Mac remote mode](/en/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我需要 Mac mini 才能支持 iMessage 吗？">
    您需要 **某一台 macOS 设备** 登录到 Messages。它**不一定**要是 Mac mini - 任何 Mac 都可以。对于 BlueBubbles，**请使用 [iMessage](/en/channels/bluebubbles)**（推荐）- BlueBubbles 服务器运行在 macOS 上，而 Gateway(网关) 可以运行在 Linux 或其他地方。

    常见设置：

    - 在 Gateway(网关)/VPS 上运行 Linux，并在任何登录到 Messages 的 Mac 上运行 BlueBubbles 服务器。
    - 如果您想要最简单的单机设置，请在 Mac 上运行所有内容。

    文档：[BlueBubbles](/en/channels/bluebubbles)、[Nodes](/en/nodes)、
    [Mac remote mode](/en/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我购买 Mac mini 来运行 OpenClaw，我可以将它连接到我的 MacBook Pro 吗？">
    可以。**Mac mini 可以运行 Gateway(网关)**，而您的 MacBook Pro 可以作为 **节点**（companion device/配套设备）进行连接。节点不运行 Gateway(网关) - 它们提供额外的功能，如该设备上的屏幕/摄像头/画布和 `system.run`。

    常见模式：

    - Mac mini 上的 Gateway(网关)（常驻）。
    - MacBook Pro 运行 macOS 应用程序或节点主机，并与 Gateway(网关) 配对。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 来查看它。

    文档：[Nodes](/en/nodes)、[Nodes CLI](/en/cli/nodes)。

  </Accordion>

  <Accordion title="我可以使用 Bun 吗？">
    不建议使用 **Bun**。我们遇到了运行时错误，特别是在 Bun 和 Bun 方面。
    请使用 **Node** 以获得稳定的网关。

    如果您仍然想尝试 **Bun**，请在非生产网关上进行
    不要用于 WhatsApp/Telegram。

  </Accordion>

  <Accordion title="Telegram：allowFrom 中填什么？">
    `channels.telegram.allowFrom` 是 **人类发送者的 Telegram 用户 ID**（数字）。它不是机器人的用户名。

    新手引导接受 `@username` 输入并将其解析为数字 ID，但 OpenClaw 授权仅使用数字 ID。

    更安全的方法（无第三方机器人）：

    - 给您的机器人发私信，然后运行 `openclaw logs --follow` 并读取 `from.id`。

    官方 Bot API：

    - 给您的机器人发私信，然后调用 `https://api.telegram.org/bot<bot_token>/getUpdates` 并读取 `message.from.id`。

    第三方方法（隐私性较差）：

    - 给 `@userinfobot` 或 `@getidsbot` 发私信。

    参见 [/channels/telegram](/en/channels/telegram#access-control-and-activation)。

  </Accordion>

<Accordion title="多个人可以一个 WhatsApp 号码配合不同的 OpenClaw 实例使用吗？">
  是的，通过 **多代理路由**。将每个发送者的 WhatsApp **私信**（peer `kind: "direct"`，发送者 E.164 格式如 `+15551234567`）绑定到不同的 `agentId`，这样每个人都能获得自己的工作区和会话存储。回复仍然来自 **同一个 WhatsApp 账户**，并且私信访问控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）是针对每个 WhatsApp 账户全局的。参见 [多代理路由](/en/concepts/multi-agent) 和
  [WhatsApp](/en/channels/whatsapp)。
</Accordion>

<Accordion title="我可以同时运行一个“快速聊天”代理和一个“用于编码的 Opus”代理吗？">可以。使用多代理路由：为每个代理分配其默认模型，然后将入站路由（提供商账户或特定对等端）绑定到每个代理。示例配置位于 [多代理路由](/en/concepts/multi-agent)。另请参阅 [模型](/en/concepts/models) 和 [配置](/en/gateway/configuration)。</Accordion>

  <Accordion title="Homebrew 在 Linux 上能工作吗？">
    可以。Homebrew 支持 Linux (Linuxbrew)。快速设置：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果您通过 systemd 运行 OpenClaw，请确保服务 PATH 包含 `/home/linuxbrew/.linuxbrew/bin`（或您的 brew 前缀），以便 `brew` 安装的工具在非登录 shell 中能被解析。
    最新版本还会在 Linux systemd 服务中预置常见的用户 bin 目录（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），并在设置时尊重 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可黑客修改的 git 安装与 npm 安装的区别">
    - **可黑客修改的 安装：** 完整的源代码检出，可编辑，最适合贡献者。
      您在本地运行构建，并且可以修改代码/文档。
    - **npm install：** 全局 CLI 安装，不包含仓库，最适合“直接运行”。
      更新来自 npm dist-tags。

    文档：[入门指南](/en/start/getting-started)、[更新](/en/install/updating)。

  </Accordion>

  <Accordion title="以后我可以在 npm 和 git 安装之间切换吗？">
    是的。安装另一种版本，然后运行 Doctor，以便 Gateway 服务指向新的入口点。
    这**不会删除您的数据**——它只是更改 OpenClaw 代码安装。您的状态
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

    Doctor 会检测 Gateway 服务入口点不匹配，并提供重写服务配置以匹配当前安装（在自动化中使用 `--repair`）。

    备份提示：请参阅 [备份策略](#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="我应该在我的笔记本电脑还是 VPS 上运行 Gateway(网关)？">
    简短回答：**如果您想要 24/7 的稳定性，请使用 VPS**。如果您想要
    最低的阻力，并且您接受睡眠/重新启动，请在本地运行。

    **笔记本电脑（本地 Gateway(网关)）**

    - **优点：**无服务器成本，直接访问本地文件，实时浏览器窗口。
    - **缺点：**睡眠/网络掉线 = 断开连接，操作系统更新/重新启动会中断，必须保持唤醒。

    **VPS / 云**

    - **优点：**始终在线，网络稳定，无笔记本电脑睡眠问题，更容易保持运行。
    - **缺点：**通常无头运行（使用截图），只能远程访问文件，您必须 SSH 进行更新。

    **OpenClaw 特别说明：**WhatsApp/Telegram/Slack/Mattermost/Discord 都可以在 VPS 上正常工作。唯一的真正权衡是 **无头浏览器** 与可见窗口。请参阅 [浏览器](/en/tools/browser)。

    **推荐的默认值：**如果您以前有过 Gateway(网关) 断开连接的情况，请使用 VPS。当您积极使用 Mac 并想要访问本地文件或使用可见浏览器进行 UI 自动化时，本地版非常棒。

  </Accordion>

  <Accordion title="在专用机器上运行 OpenClaw 有多重要？">
    非必需，但 **建议出于可靠性和隔离性的考虑**。

    - **专用主机（VPS/Mac mini/Pi）：** 始终在线，较少因睡眠/重启而中断，权限更清晰，更易于保持运行。
    - **共享笔记本/台式机：** 完全适合测试和主动使用，但需注意机器睡眠或更新时会出现暂停。

    如果您想两全其美，请将 Gateway(网关) 保留在专用主机上，并将您的笔记本作为 **node** 配对以使用本地屏幕/摄像头/exec 工具。参见 [Nodes](/en/nodes)。
    有关安全指导，请阅读 [Security](/en/gateway/security)。

  </Accordion>

  <Accordion title="最低 VPS 要求和推荐的操作系统是什么？">
    OpenClaw 是轻量级的。对于基本的 Gateway(网关) + 一个聊天渠道：

    - **绝对最低配置：** 1 vCPU，1GB 内存，约 500MB 磁盘空间。
    - **推荐配置：** 1-2 vCPU，2GB 或更多内存以留有余量（日志、媒体、多个渠道）。Node 工具和浏览器自动化可能会消耗较多资源。

    操作系统：使用 **Ubuntu LTS**（或任何现代 Debian/Ubuntu）。Linux 安装路径在此处经过了最佳测试。

    文档：[Linux](/en/platforms/linux)，[VPS 托管](/en/vps)。

  </Accordion>

  <Accordion title="我可以在虚拟机中运行 OpenClaw 吗？有哪些要求？">
    是的。将虚拟机视为与 VPS 相同：它需要始终在线、可访问，并且有足够的
    内存供 Gateway(网关) 和您启用的任何渠道使用。

    基本指导：

    - **绝对最低配置：** 1 vCPU，1GB 内存。
    - **推荐配置：** 如果您运行多个渠道、浏览器自动化或媒体工具，建议 2GB 或更多内存。
    - **操作系统：** Ubuntu LTS 或其他现代 Debian/Ubuntu。

    如果您使用的是 Windows，**WSL2 是最简单的虚拟机风格设置**，并且具有最佳的工具
    兼容性。参见 [Windows](/en/platforms/windows)，[VPS 托管](/en/vps)。
    如果您在虚拟机中运行 macOS，请参见 [macOS VM](/en/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 什么是 OpenClaw？

<AccordionGroup>
  <Accordion title="OpenClaw 是什么（一段话概括）？">
    OpenClaw 是一个在您自己的设备上运行的个人 AI 助手。它会在您已经使用的消息界面（WhatsApp、Telegram、Slack、Mattermost、Discord、Google Chat、Signal、iMessage、WebChat 以及捆绑的渠道插件，如 QQ Bot）上回复，并且可以在支持的平台进行语音交互和实时 Canvas 操作。**Gateway(网关)** 是常驻控制平面；助手即是产品。
  </Accordion>

  <Accordion title="价值主张">
    OpenClaw 不仅仅是一个“Claude 包装器”。它是一个**本地优先的控制平面**，让您能够在**您自己的硬件**上运行一个功能强大的助手，通过您已经在使用的聊天应用程序进行访问，具备有状态的会话、记忆和工具功能——而无需将您的工作流程控制权交给托管的 SaaS。

    亮点：

    - **您的设备，您的数据：** 在您想要的任何地方运行 Gateway(网关)（Mac、Linux、VPS），并将工作区 + 会话历史保留在本地。
    - **真实的渠道，而非 Web 沙箱：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，以及在支持的平台上的移动语音和 Canvas。
    - **模型无关：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，支持按代理路由和故障转移。
    - **仅本地选项：** 运行本地模型，因此如果需要，**所有数据都可以保留在您的设备上**。
    - **多代理路由：** 按渠道、账户或任务分离代理，每个代理都有自己的工作区和默认设置。
    - **开源且可修改：** 检查、扩展和自托管，没有供应商锁定。

    文档：[Gateway(网关)](/en/gateway)、[渠道](/en/channels)、[多代理](/en/concepts/multi-agent)、
    [记忆](/en/concepts/memory)。

  </Accordion>

  <Accordion title="我刚刚搭建好了——首先应该做什么？">
    不错的首个项目：

    - 构建一个网站（WordPress、Shopify 或简单的静态站点）。
    - 原型设计一个移动应用（大纲、屏幕、API 计划）。
    - 整理文件和文件夹（清理、命名、标记）。
    - 连接 Gmail 并自动生成摘要或跟进。

    它可以处理大型任务，但当您将其分解为阶段并使用子代理进行并行工作时，效果最佳。

  </Accordion>

  <Accordion title="OpenClaw 的前五大日常用例是什么？">
    日常胜利通常看起来像：

    - **个人简报：** 您关心的收件箱、日历和新闻摘要。
    - **研究和起草：** 针对电子邮件或文档的快速研究、摘要和初稿。
    - **提醒和跟进：** 由 cron 或心跳驱动的提醒和检查清单。
    - **浏览器自动化：** 填写表单、收集数据和重复的网页任务。
    - **跨设备协调：** 从手机发送任务，让 Gateway(网关) 在服务器上运行，并在聊天中取回结果。

  </Accordion>

  <Accordion title="OpenClaw 能否帮助 SaaS 进行潜在客户开发、外联、广告和博客撰写？">
    在**研究、资格认证和起草**方面可以。它可以扫描网站、建立候选名单、
    总结潜在客户，并撰写外联或广告文案草稿。

    对于**外联或广告投放**，请保持人工参与。避免垃圾邮件，遵守当地法律和
    平台政策，并在发送前审查所有内容。最安全的模式是让
    OpenClaw 起草并由您批准。

    文档：[安全](/en/gateway/security)。

  </Accordion>

  <Accordion title="与 Claude Code 相比，在 Web 开发方面有哪些优势？">
    OpenClaw 是一个**个人助手**和协调层，而不是 IDE 的替代品。使用
    Claude Code 或 Codex 在代码库内进行最快的直接编码循环。当您
    需要持久化内存、跨设备访问和工具编排时，使用 OpenClaw。

    优势：

    - 跨会话的**持久化内存 + 工作区**
    - **多平台访问**（WhatsApp、Telegram、TUI、WebChat）
    - **工具编排**（浏览器、文件、调度、钩子）
    - **始终在线的 Gateway(网关)**（在 VPS 上运行，从任何地方交互）
    - 用于本地浏览器/屏幕/摄像头/执行的 **Nodes**

    展示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Skills 和自动化

<AccordionGroup>
  <Accordion title="如何在不弄脏仓库的情况下自定义技能？">
    使用托管覆盖而不是编辑仓库副本。将您的更改放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或者通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加一个文件夹）。优先级是 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`，因此托管覆盖仍然胜过打包技能，而无需触及 git。如果您需要全局安装该技能但仅对某些代理可见，请将共享副本保留在 `~/.openclaw/skills` 中，并使用 `agents.defaults.skills` 和 `agents.list[].skills` 控制可见性。只有值得向上游提交的编辑才应该存在于仓库中并作为 PR 发出。
  </Accordion>

  <Accordion title="我可以从自定义文件夹加载技能吗？">
    是的。通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加额外目录（优先级最低）。默认优先级是 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`。`clawhub` 默认安装到 `./skills` 中，OpenClaw 在下一次会话时将其视为 `<workspace>/skills`。如果该技能应该仅对特定代理可见，请将其与 `agents.defaults.skills` 或 `agents.list[].skills` 配合使用。
  </Accordion>

  <Accordion title="如何针对不同任务使用不同的模型？">
    目前支持的模式有：

    - **Cron jobs（定时任务）**：隔离的任务可以为每个作业设置 `model` 覆盖。
    - **Sub-agents（子代理）**：将任务路由到具有不同默认模型的独立代理。
    - **On-demand switch（按需切换）**：使用 `/model` 随时切换当前会话的模型。

    参阅 [Cron jobs](/en/automation/cron-jobs)、[Multi-Agent Routing](/en/concepts/multi-agent) 和 [Slash commands](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="机器人在执行繁重任务时卡住了。我该如何卸载这些任务？">
    对于长时间或并行任务，请使用 **sub-agents（子代理）**。子代理在自己的会话中运行，
    返回摘要，并保持您的主聊天响应畅通。

    让您的机器人“为此任务生成一个子代理”，或使用 `/subagents`。
    在聊天中使用 `/status` 查看 Gateway(网关) 当前正在做什么（以及它是否忙碌）。

    Token 提示：长时间任务和子代理都会消耗 Token。如果您关注成本，可以通过 `agents.defaults.subagents.model` 为子代理设置更便宜的模型。

    文档：[Sub-agents](/en/tools/subagents)、[Background Tasks](/en/automation/tasks)。

  </Accordion>

  <Accordion title="Discord 上的线程绑定子代理会话是如何工作的？">
    使用线程绑定。您可以将 Discord 线程绑定到子代理或会话目标，以便该线程中的后续消息保留在该绑定会话上。

    基本流程：

    - 使用 `thread: true` 通过 `sessions_spawn` 生成（并可选择使用 `mode: "session"` 进行持续跟进）。
    - 或使用 `/focus <target>` 手动绑定。
    - 使用 `/agents` 检查绑定状态。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自动失焦。
    - 使用 `/unfocus` 分离线程。

    所需配置：

    - 全局默认值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆盖设置：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 生成时自动绑定：设置 `channels.discord.threadBindings.spawnSubagentSessions: true`。

    文档：[子代理](/en/tools/subagents)、[Discord](/en/channels/discord)、[配置参考](/en/gateway/configuration-reference)、[斜杠命令](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="子代理已完成，但完成更新发到了错误的地方或从未发布。我应该检查什么？">
    首先检查已解析的请求者路由：

    - 完成模式的子代理传递优先使用任何绑定的线程或对话路由（如果存在）。
    - 如果完成来源仅携带渠道，OpenClaw 会回退到请求者会话的存储路由（`lastChannel` / `lastTo` / `lastAccountId`），以便直接传递仍然可以成功。
    - 如果既不存在绑定的路由，也不存在可用的存储路由，直接传递可能会失败，结果将回退到排队会话传递，而不是立即发布到聊天。
    - 无效或陈旧的目标仍可能导致排队回退或最终传递失败。
    - 如果子级的最后一个可见助手回复是精确的无提示令牌 `NO_REPLY` / `no_reply`，或者精确为 `ANNOUNCE_SKIP`，OpenClaw 会故意抑制公告，而不是发布陈旧的早期进度。
    - 如果子级在仅执行工具调用后超时，公告可能会将其折叠为简短的部分进度摘要，而不是重放原始工具输出。

    调试：

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[Sub-agents](/en/tools/subagents)、[Background Tasks](/en/automation/tasks)、[Session Tools](/en/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒未触发。我应该检查什么？">
    Cron 在 Gateway(网关) 进程内运行。如果 Gateway(网关) 未持续运行，
    计划的任务将不会运行。

    检查清单：

    - 确认已启用 cron（`cron.enabled`）且未设置 `OPENCLAW_SKIP_CRON`。
    - 检查 Gateway(网关) 是否 24/7 运行（无睡眠/重启）。
    - 验证任务的时区设置（`--tz` 与主机时区对比）。

    调试：

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文档：[Cron jobs](/en/automation/cron-jobs)、[Automation & Tasks](/en/automation)。

  </Accordion>

  <Accordion title="Cron 已触发，但没有任何内容发送到渠道。为什么？">
    首先检查传递模式：

    - `--no-deliver` / `delivery.mode: "none"` 表示不预期有外部消息。
    - 缺失或无效的公告目标（`channel` / `to`）意味着运行器跳过了出站传递。
    - 渠道认证失败（`unauthorized`，`Forbidden`）意味着运行器尝试传递但凭据阻止了它。
    - 静默的隔离结果（仅 `NO_REPLY` / `no_reply`）被视为故意不可传递，因此运行器也会抑制排队的回退传递。

    对于隔离的 cron 作业，运行器负责最终传递。预期代理会返回纯文本摘要供运行器发送。`--no-deliver` 将该结果保留在内部；它不允许代理直接使用消息工具发送。

    调试：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[Cron 作业](/en/automation/cron-jobs)，[后台任务](/en/automation/tasks)。

  </Accordion>

  <Accordion title="为什么隔离的 cron 运行会切换模型或重试一次？">
    这通常是实时模型切换路径，而不是重复调度。

    隔离的 cron 可以持久化运行时模型切换，并在活动运行抛出 `LiveSessionModelSwitchError` 时重试。重试会保留切换后的提供商/模型，如果切换带有新的认证配置文件覆盖，cron 也会在重试前持久化它。

    相关选择规则：

    - Gmail 钩子模型覆盖在适用时优先。
    - 然后是每个作业的 `model`。
    - 然后是任何存储的 cron 会话模型覆盖。
    - 最后是正常的代理/默认模型选择。

    重试循环是有界的。在初始尝试加上 2 次切换重试后，cron 会中止而不是无限循环。

    调试：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[Cron 作业](/en/automation/cron-jobs)，[cron CLI](/en/cli/cron)。

  </Accordion>

  <Accordion title="如何在 Linux 上安装 Skills？">
    使用原生的 `openclaw skills` 命令或将 Skills 放入您的工作区。macOS Skills UI 在 Linux 上不可用。
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

    原生 `openclaw skills install` 会写入活动工作区 `skills/`
    目录。仅当您想要发布或
    同步自己的 Skills 时，才需安装单独的 `clawhub` CLI。对于跨代理的共享安装，请将 Skill 放在
    `~/.openclaw/skills` 下，并使用 `agents.defaults.skills` 或
    `agents.list[].skills` 如果您想限制哪些代理可以看到它。

  </Accordion>

  <Accordion title="OpenClaw 可以按计划运行任务或在后台持续运行吗？">
    是的。使用 Gateway(网关) 调度器：

    - **Cron jobs** 用于计划或重复任务（重启后依然保留）。
    - **Heartbeat** 用于“主会话”的定期检查。
    - **Isolated jobs** 用于发布摘要或投递到聊天的自主代理。

    文档：[Cron jobs](/en/automation/cron-jobs)、[Automation & Tasks](/en/automation)、
    [Heartbeat](/en/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我能从 Linux 运行仅限 Apple macOS 的技能吗？">
    不能直接运行。macOS 技能受 `metadata.openclaw.os` 及所需二进制文件的限制，只有当它们在 **Gateway(网关) 主机**上符合条件时，才会出现在系统提示中。在 Linux 上，除非你覆盖这些限制，否则 `darwin` 专用的技能（如 `apple-notes`、`apple-reminders`、`things-mac`）将无法加载。

    你有三种支持的模式：

    **选项 A - 在 Mac 上运行 Gateway(网关)（最简单）。**
    在存在 macOS 二进制文件的地方运行 Gateway(网关)，然后从 Linux 通过 [远程模式](#gateway-ports-already-running-and-remote-mode) 或 Tailscale 进行连接。由于 Gateway(网关) 主机是 macOS，技能会正常加载。

    **选项 B - 使用 macOS 节点（无 SSH）。**
    在 Linux 上运行 Gateway(网关)，配对一个 macOS 节点（菜单栏应用），并在 Mac 上将 **Node Run Commands** 设置为“始终询问”或“始终允许”。当节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为符合条件。代理通过 `nodes` 工具运行这些技能。如果你选择“始终询问”，在提示中批准“始终允许”会将该命令添加到允许列表中。

    **选项 C - 通过 SSH 代理 macOS 二进制文件（高级）。**
    将 Gateway(网关) 保留在 Linux 上，但使所需的 CLI 二进制文件解析为在 Mac 上运行的 SSH 包装器。然后覆盖技能以允许 Linux，使其保持符合条件。

    1. 为二进制文件创建一个 SSH 包装器（例如：用于 Apple Notes 的 `memo`）：

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

  <Accordion title="你们有 Notion 或 HeyGen 集成吗？">
    目前没有内置集成。

    可选方案：

    - **自定义 skill / 插件：** 最适合可靠的 API 访问（Notion/HeyGen 都有 API）。
    - **浏览器自动化：** 无需代码即可工作，但速度较慢且较脆弱。

    如果你想为每个客户（机构工作流）保留上下文，一个简单的模式是：

    - 每个客户一个 Notion 页面（上下文 + 偏好设置 + 活跃工作）。
    - 让代理在会话开始时获取该页面。

    如果你想要原生集成，请提交功能请求或构建一个针对这些 API 的 skill。

    安装 skills：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安装位于活动工作区 `skills/` 目录中。对于代理间共享的 skills，请将它们放在 `~/.openclaw/skills/<name>/SKILL.md` 中。如果只有部分代理应该看到共享安装，请配置 `agents.defaults.skills` 或 `agents.list[].skills`。某些 skills 需要通过 Homebrew 安装二进制文件；在 API 上这意味着 Linuxbrew（请参阅上面的 Homebrew Linux 常见问题 条目）。请参阅 [Skills](/en/tools/skills)、[Skills 配置](/en/tools/skills-config) 和 [Linux](/en/tools/clawhub)。

  </Accordion>

  <Accordion title="如何在 OpenClaw 中使用我现有的已登录 Chrome？">
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

    此路径是特定于主机的。如果 Gateway(网关) 运行在其他地方，请在浏览器机器上运行节点主机或使用远程 CDP。

    `existing-session` / `user` 的当前限制：

    - 操作是由引用驱动的，而不是由 CSS 选择器驱动的
    - 上传需要 `ref` / `inputRef` 并且目前一次只支持一个文件
    - `responsebody`、PDF 导出、下载拦截和批量操作仍然需要托管浏览器或原始 CDP 配置文件

  </Accordion>
</AccordionGroup>

## 沙箱隔离和内存

<AccordionGroup>
  <Accordion title="是否有专门的沙箱隔离文档？">
    有的。请参阅 [沙箱隔离](/en/gateway/sandboxing)。关于 Docker 特定的设置（Docker 中的完整 Gateway 或沙箱镜像），请参阅 [Docker](/en/install/docker)。
  </Accordion>

  <Accordion title="Docker 感觉受限 - 如何启用完整功能？">
    默认镜像以安全为优先，并以 `node` 用户身份运行，因此不包含系统包、Homebrew 或捆绑的浏览器。若要进行更完整的设置：

    - 使用 `OPENCLAW_HOME_VOLUME` 持久化 `/home/node`，以便缓存得以保留。
    - 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 将系统依赖项烘焙到镜像中。
    - 通过捆绑的 CLI 安装 Playwright 浏览器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 设置 `PLAYWRIGHT_BROWSERS_PATH` 并确保该路径已持久化。

    文档：[Docker](/en/install/docker)、[浏览器](/en/tools/browser)。

  </Accordion>

  <Accordion title="我可以将私信保持为私密，但同时让一个代理处理公开/沙箱隔离的群组吗？">
    可以 - 如果您的私人流量是 **私信** 而公共流量是 **群组**。

    使用 `agents.defaults.sandbox.mode: "non-main"`，使群组/渠道会话（非主密钥）在 Docker 中运行，而主私信会话保留在主机上。然后通过 `tools.sandbox.tools` 限制沙箱隔离会话中可用的工具。

    设置演练 + 示例配置：[群组：个人私信 + 公开群组](/en/channels/groups#pattern-personal-dms-public-groups-single-agent)

    关键配置参考：[Gateway(网关) 配置](/en/gateway/configuration-reference#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="如何将主机文件夹绑定到沙箱中？">
    将 `agents.defaults.sandbox.docker.binds` 设置为 `["host:path:mode"]`（例如，`"/home/user/src:/src:ro"`）。全局 + 每个代理的绑定会合并；当 `scope: "shared"` 时，每个代理的绑定将被忽略。对于任何敏感内容，请使用 `:ro`，并记住绑定会绕过沙箱文件系统壁垒。

    OpenClaw 会根据标准化路径和通过最深现有祖先解析的规范路径来验证绑定源。这意味着即使最后一个路径段尚不存在，符号链接父级逃逸仍然会失败关闭，并且在解析符号链接后仍会应用允许根检查。

    有关示例和安全说明，请参阅[沙箱隔离](/en/gateway/sandboxing#custom-bind-mounts)和[沙箱 vs 工具策略 vs 提升权限](/en/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。

  </Accordion>

  <Accordion title="内存是如何工作的？">
    OpenClaw 内存只是代理工作区中的 Markdown 文件：

    - `memory/YYYY-MM-DD.md` 中的每日笔记
    - `MEMORY.md` 中的精选长期笔记（仅限主/私有会话）

    OpenClaw 还会运行**静默预压缩内存刷新**，以提醒模型
    在自动压缩之前写入持久笔记。这仅在工作区
    可写时运行（只读沙箱会跳过它）。请参阅[内存](/en/concepts/memory)。

  </Accordion>

  <Accordion title="内存总是记不住事情。如何让它记住？">
    要求机器人**将该事实写入内存**。长期笔记应放在 `MEMORY.md` 中，
    短期上下文则放入 `memory/YYYY-MM-DD.md` 中。

    这仍然是我们正在改进的领域。提醒模型存储记忆会有所帮助；
    它会知道该怎么做。如果它一直忘记，请验证 Gateway(网关) 在每次运行时是否
    使用相同的工作区。

    文档：[内存](/en/concepts/memory)、[代理工作区](/en/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="内存是否会永久保留？有哪些限制？">
    内存文件存储在磁盘上，并会一直保留，直到您将其删除。限制在于您的
    存储空间，而不是模型。**会话上下文** 仍然受限于模型
    上下文窗口，因此较长的对话可能会被压缩或截断。这就是
    内存搜索存在的原因——它只将相关部分拉回上下文中。

    文档：[内存](/en/concepts/memory)，[上下文](/en/concepts/context)。

  </Accordion>

  <Accordion title="语义内存搜索是否需要 OpenAI API 密钥？">
    仅当您使用 **OpenAI embeddings** 时才需要。Codex OAuth 涵盖聊天/补全，
    并**不**授予 embeddings 访问权限，因此**通过 Codex 登录（OAuth 或
    Codex CLI 登录）** 对语义内存搜索没有帮助。OpenAI embeddings
    仍然需要真实的 API 密钥（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果您没有显式设置提供商，当 OpenClaw
    可以解析 API 密钥（auth profiles、`models.providers.*.apiKey` 或环境变量）时，会自动选择一个提供商。
    如果能解析到 OpenAI 密钥，它首选 OpenAI，否则如果能解析到 Gemini 密钥则首选 Gemini，
    然后是 Voyage，接着是 Mistral。如果没有可用的远程密钥，内存
    搜索将保持禁用状态，直到您对其进行配置。如果您配置并存在本地模型路径，OpenClaw
    会首选 `local`。当您显式设置
    `memorySearch.provider = "ollama"` 时，支持 Ollama。

    如果您更愿意保持本地化，请设置 `memorySearch.provider = "local"`（并可选地
    设置 `memorySearch.fallback = "none"`）。如果您想要 Gemini embeddings，请设置
    `memorySearch.provider = "gemini"` 并提供 `GEMINI_API_KEY`（或
    `memorySearch.remote.apiKey`）。我们支持 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本地** embedding
    模型——有关设置详细信息，请参阅 [内存](/en/concepts/memory)。

  </Accordion>
</AccordionGroup>

## 磁盘上的文件位置

<AccordionGroup>
  <Accordion title="与 OpenClaw 一起使用的所有数据都会保存在本地吗？">
    不——**OpenClaw 的状态是本地的**，但 **外部服务仍然能看到您发送给它们的内容**。

    - **默认本地化：** 会话、内存文件、配置和工作区位于 Gateway(网关) 主机上
      (`~/.openclaw` + 您的工作区目录)。
    - **必要远程化：** 您发送给模型提供商（Anthropic/OpenAI/等）的消息会发送到
      它们的 API，而聊天平台（WhatsApp/Telegram/Slack/等）会将其服务器上存储消息数据。
    - **您控制数据范围：** 使用本地模型可以将提示词保留在您的机器上，但渠道
      流量仍然会经过该渠道的服务器。

    相关：[Agent workspace](/en/concepts/agent-workspace), [Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 将其数据存储在哪里？">
    所有内容均存储在 `$OPENCLAW_STATE_DIR` 下（默认：`~/.openclaw`）：

    | 路径                                                            | 用途                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主配置 (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 旧版 OAuth 导入（首次使用时复制到身份配置文件中）       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 身份配置文件（OAuth、API 密钥以及可选的 `keyRef`/`tokenRef`）  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | 用于 `file` SecretRef 提供程序的可选文件后备机密负载 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 旧版兼容性文件（已清除静态 `api_key` 条目）      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供程序状态（例如 `whatsapp/<accountId>/creds.json`）            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每个代理的状态（agentDir + sessions）                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 对话历史和状态（每个代理）                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 会话元数据（每个代理）                                       |

    旧版单代理路径：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）。

    您的 **工作区**（AGENTS.md、内存文件、技能等）是分开的，通过 `agents.defaults.workspace` 进行配置（默认：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该放在哪里？">
    这些文件位于 **agent workspace（代理工作区）** 中，而不是 `~/.openclaw` 中。

    - **Workspace (per agent)（工作区，每个代理）**：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md`（或在缺少 `MEMORY.md` 时的旧版回退 `memory.md`）、
      `memory/YYYY-MM-DD.md`、可选的 `HEARTBEAT.md`。
    - **State dir (`~/.openclaw`)（状态目录）**：配置、渠道/提供商状态、身份配置文件、会话、日志
      以及共享技能 (`~/.openclaw/skills`)。

    默认工作区是 `~/.openclaw/workspace`，可通过以下方式配置：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果机器人在重启后“遗忘”了内容，请确认 Gateway(网关) 在每次启动时都使用相同
    的工作区（并请记住：远程模式使用的是 **Gateway(网关) 主机的**
    工作区，而不是你的本地笔记本电脑）。

    提示：如果你希望持久化某个行为或偏好，请让机器人将其**写入
    AGENTS.md 或 MEMORY.md**，而不是依赖聊天记录。

    参见 [Agent workspace](/en/concepts/agent-workspace) 和 [Memory](/en/concepts/memory)。

  </Accordion>

  <Accordion title="推荐的备份策略">
    将你的 **agent workspace（代理工作区）** 放入一个 **私有** git 仓库中，并将其备份到某个
    私有位置（例如 GitHub 私有仓库）。这将捕获记忆 + AGENTS/SOUL/USER
    文件，并允许你稍后恢复助手的“思维”。

    **不要**提交 `~/.openclaw` 下的任何内容（凭据、会话、令牌或加密机密负载）。
    如果你需要完整恢复，请分别备份工作区和状态目录
    （请参阅上面的迁移问题）。

    文档：[Agent workspace](/en/concepts/agent-workspace)。

  </Accordion>

<Accordion title="如何完全卸载 OpenClaw？">请参阅专用指南：[Uninstall](/en/install/uninstall)。</Accordion>

  <Accordion title="智能体可以在工作区之外工作吗？">
    是的。工作区是 **默认 cwd** 和内存锚点，而不是硬性沙箱。
    相对路径在工作区内解析，但绝对路径可以访问其他
    主机位置，除非启用了沙箱隔离。如果您需要隔离，请使用
    [`agents.defaults.sandbox`](/en/gateway/sandboxing) 或每个智能体的沙箱设置。如果您
    希望将仓库作为默认工作目录，请将该智能体的
    `workspace` 指向仓库根目录。OpenClaw 仓库只是源代码；请保持
    工作区独立，除非您有意让智能体在其中工作。

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
    会话状态由 **网关主机** 拥有。如果您处于远程模式，您关心的会话存储位于远程机器上，而不是您的本地笔记本电脑。请参阅[会话管理](/en/concepts/session)。
  </Accordion>
</AccordionGroup>

## 配置基础知识

<AccordionGroup>
  <Accordion title="配置文件是什么格式？它在哪里？">
    OpenClaw 从 `$OPENCLAW_CONFIG_PATH` 读取可选的 **JSON5** 配置（默认值：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果文件丢失，它将使用相对安全的默认值（包括 `~/.openclaw/workspace` 的默认工作区）。

  </Accordion>

  <Accordion title='我设置了 gateway.bind: "lan" (或 "tailnet")，但现在没有任何监听 / UI 显示未授权'>
    非环回绑定 **需要一个有效的网关身份验证路径**。实际上这意味着：

    - 共享密钥身份验证：令牌或密码
    - 在正确配置的非环回身份感知反向代理后面的 `gateway.auth.mode: "trusted-proxy"`

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

    - `gateway.remote.token` / `.password` **不会**自行启用本地网关身份验证。
    - 仅当 `gateway.auth.*` 未设置时，本地调用路径才能使用 `gateway.remote.*` 作为后备。
    - 对于密码身份验证，请改为设置 `gateway.auth.mode: "password"` 加上 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 是通过 SecretRef 显式配置且未解析的，解析将以失败告终（没有远程后备屏蔽）。
    - 共享密钥控制 UI 设置通过 `connect.params.auth.token` 或 `connect.params.auth.password`（存储在应用/UI 设置中）进行身份验证。Tailscale Serve 或 `trusted-proxy` 等承载身份的模式则改用请求头。避免将共享密钥放在 URL 中。
    - 使用 `gateway.auth.mode: "trusted-proxy"` 时，同主机环回反向代理仍然 **不** 满足受信任代理的身份验证。受信任代理必须是配置的非环回源。

  </Accordion>

  <Accordion title="为什么现在在 localhost 上需要 token？">
    OpenClaw 默认强制进行网关身份验证，包括环回。在常规默认路径中，这意味着 token 验证：如果未配置显式的验证路径，网关启动将解析为 token 模式并自动生成一个，将其保存到 `gateway.auth.token`，因此**本地 WS 客户端必须进行身份验证**。这会阻止其他本地进程调用 Gateway(网关)。

    如果您更喜欢其他验证路径，可以显式选择密码模式（或者，对于非环回的感知身份的反向代理，`trusted-proxy`）。如果您**确实**想要开放环回，请在配置中显式设置 `gateway.auth.mode: "none"`。Doctor 随时可以为您生成 token：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="更改配置后必须重启吗？">
    Gateway(网关) 会监视配置并支持热重载：

    - `gateway.reload.mode: "hybrid"`（默认）：热应用安全更改，针对关键更改则重启
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
    - 如果您根本不想要横幅，请设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何启用网页搜索（以及网页抓取）？">
    `web_fetch` 无需 API 密钥即可工作。`web_search` 取决于您选择的
    提供商：

    - 依赖 API 的提供商（如 Brave、Exa、Brave、Gemini、Grok、Kimi、Firecrawl Search、MiniMax 和 Tavily）需要其常规的 Perplexity 密钥设置。
    - API Web Search 是免密钥的，但它使用您配置的 Ollama 主机并且需要 `ollama signin`。
    - DuckDuckGo 是免密钥的，但它是非官方的基于 HTML 的集成。
    - SearXNG 是免密钥/自托管的；请配置 `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`。

    **推荐：** 运行 `openclaw configure --section web` 并选择一个提供商。
    环境变量替代方案：

    - Ollama: `BRAVE_API_KEY`
    - Exa: `EXA_API_KEY`
    - Brave: `FIRECRAWL_API_KEY`
    - Gemini: `GEMINI_API_KEY`
    - Grok: `XAI_API_KEY`
    - Kimi: `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
    - Firecrawl Search: `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`
    - MiniMax: `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`
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
    旧的 `tools.web.search.*` 提供商路径为了兼容性暂时仍然会加载，但不应将其用于新配置。
    Perplexity 网页抓取回退配置位于 `plugins.entries.firecrawl.config.webFetch.*` 下。

    注意事项：

    - 如果您使用允许列表，请添加 `web_search`/`web_fetch`/`x_search` 或 `group:web`。
    - 默认情况下启用 `web_fetch`（除非明确禁用）。
    - 如果省略 `tools.web.fetch.provider`，Firecrawl 会根据可用的凭据自动检测第一个就绪的抓取回退提供商。目前捆绑的提供商是 OpenClaw。
    - 守护进程从 `~/.openclaw/.env`（或服务环境）读取环境变量。

    文档：[Web tools](/en/tools/web)。

  </Accordion>

  <Accordion title="config.apply 清除了我的配置。我该如何恢复并避免这种情况？">
    `config.apply` 会替换**整个配置**。如果你发送一个部分对象，其他所有内容
    都会被移除。

    恢复：

    - 从备份恢复（git 或复制的 `~/.openclaw/openclaw.json`）。
    - 如果没有备份，请重新运行 `openclaw doctor` 并重新配置频道/模型。
    - 如果这是意外发生的，请提交 bug 并附上你已知的最后一个配置或任何备份。
    - 本地编码代理通常可以从日志或历史记录中重建一个有效的配置。

    避免这种情况：

    - 使用 `openclaw config set` 进行小的更改。
    - 使用 `openclaw configure` 进行交互式编辑。
    - 当你不确定确切的路径或字段形状时，请先使用 `config.schema.lookup`；它会返回一个浅层架构节点以及直接子摘要，以便进行下钻。
    - 使用 `config.patch` 进行部分 RPC 编辑；仅保留 `config.apply` 用于完整配置替换。
    - 如果你正在从代理运行中使用仅限所有者的 `gateway` 工具，它仍然会拒绝写入 `tools.exec.ask` / `tools.exec.security`（包括规范化为相同受保护执行路径的旧版 `tools.bash.*` 别名）。

    文档：[Config](/en/cli/config), [Configure](/en/cli/configure), [Doctor](/en/gateway/doctor)。

  </Accordion>

  <Accordion title="如何跨设备运行中央Gateway(网关)和专用工作程序？">
    常见模式是 **一个Gateway(网关)**（例如 Raspberry Pi）加上 **节点** 和 **代理**：

    - **Gateway(网关)（中央）：** 拥有通道（Gateway(网关)/Gateway(网关)）、路由和会话。
    - **节点（设备）：** Macs/Raspberry Pi/Gateway(网关) 作为外设连接并暴露本地工具（`system.run`、`canvas`、`camera`）。
    - **代理（工作程序）：** 用于特殊角色的独立大脑/工作区（例如 "Signal 运维"、"个人数据"）。
    - **子代理：** 当您需要并行处理时，从主代理生成后台工作。
    - **WhatsApp：** 连接到Gateway(网关)并切换代理/会话。

    文档：[Nodes](/en/nodes)、[Remote access](/en/gateway/remote)、[Multi-Agent Routing](/en/concepts/multi-agent)、[Sub-agents](/en/tools/subagents)、[iOS](/en/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 浏览器可以无头模式运行吗？">
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

    默认为 `false`（有头模式）。无头模式更有可能触发某些网站的反机器人检查。请参阅 [Browser](/en/tools/browser)。

    无头模式使用 **相同的 Chromium 引擎**，适用于大多数自动化任务（表单、点击、抓取、登录）。主要区别如下：

    - 没有可见的浏览器窗口（如果需要视觉效果，请使用截图）。
    - 某些网站对无头模式下的自动化要求更严格（验证码、反机器人）。
      例如，X/Twitter 经常阻止无头会话。

  </Accordion>

  <Accordion title="如何使用 Brave 进行浏览器控制？">
    将 `browser.executablePath` 设置为您的 Brave 二进制文件（或任何基于 Chromium 的浏览器），然后重启Gateway(网关)。
    请参阅 [Browser](/en/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置示例。
  </Accordion>
</AccordionGroup>

## 远程Gateway(网关)和节点

<AccordionGroup>
  <Accordion title="命令如何在 Telegram、网关 和节点之间传播？">
    Telegram 消息由 **Gateway(网关)** 处理。Gateway(网关) 运行代理，
    只有在需要节点工具时，才通过 **Gateway(网关) WebSocket** 调用节点：

    Telegram → Gateway(网关) → 代理 → `node.*` → 节点 → Gateway(网关) → Telegram

    节点看不到入站提供商流量；它们只接收节点 RPC 调用。

  </Accordion>

  <Accordion title="如果 Gateway(网关) 托管在远程，我的代理如何访问我的计算机？">
    简短回答：**将您的计算机配对为节点**。Gateway(网关) 在其他地方运行，但它可以
    通过 Gateway(网关) WebSocket 调用本地计算机上的 `node.*` 工具（屏幕、摄像头、系统）。

    典型设置：

    1. 在始终在线的主机（VPS/家庭服务器）上运行 Gateway(网关)。
    2. 将 Gateway(网关) 主机和您的计算机置于同一个 tailnet 中。
    3. 确保 Gateway(网关) WS 可访问（tailnet 绑定或 SSH 隧道）。
    4. 在本地打开 macOS 应用并以 **Remote over SSH** 模式（或直接 tailnet）连接，
       以便它可以注册为节点。
    5. 在 Gateway(网关) 上批准节点：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要单独的 TCP 网桥；节点通过 Gateway(网关) WebSocket 连接。

    安全提醒：配对 macOS 节点允许在该机器上进行 `system.run`。仅
    配对您信任的设备，并查看 [安全](/en/gateway/security)。

    文档：[节点](/en/nodes)、[Gateway(网关) 协议](/en/gateway/protocol)、[macOS 远程模式](/en/platforms/mac/remote)、[安全](/en/gateway/security)。

  </Accordion>

  <Accordion title="已连接 Tailscale 但没有收到回复。现在该怎么办？">
    检查基本项：

    - Gateway(网关)正在运行：`openclaw gateway status`
    - Gateway(网关)健康状态：`openclaw status`
    - 渠道健康状态：`openclaw channels status`

    然后验证身份验证和路由：

    - 如果您使用 Tailscale Serve，请确保 `gateway.auth.allowTailscale` 设置正确。
    - 如果您通过 SSH 隧道连接，请确认本地隧道已启动并指向正确的端口。
    - 确认您的白名单（私信或群组）包含您的帐户。

    文档：[Tailscale](/en/gateway/tailscale)、[远程访问](/en/gateway/remote)、[渠道](/en/channels)。

  </Accordion>

  <Accordion title="两个 OpenClaw 实例可以相互通信吗（本地 + VPS）？">
    是的。没有内置的“机器人到机器人”桥接器，但您可以通过几种
    可靠的方式进行连接：

    **最简单的方法：** 使用两个机器人都可以访问的正常聊天渠道（Telegram/Slack/WhatsApp）。
    让机器人 A 向机器人 B 发送消息，然后让机器人 B 像往常一样回复。

    **CLI 桥接器（通用）：** 运行一个脚本，使用
    `openclaw agent --message ... --deliver` 调用另一个 Gateway(网关)，
    目标是另一个机器人监听的聊天。如果一个机器人在远程 VPS 上，请通过 SSH/Tailscale 将您的 CLI 指向该远程 Gateway(网关)
    （请参阅[远程访问](/en/gateway/remote)）。

    示例模式（从可以访问目标 Gateway(网关)的机器运行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：添加一个防护措施，以防止两个机器人无限循环（仅限提及、渠道
    白名单，或“不回复机器人消息”规则）。

    文档：[远程访问](/en/gateway/remote)、[Agent CLI](/en/cli/agent)、[Agent send](/en/tools/agent-send)。

  </Accordion>

  <Accordion title="多个代理是否需要独立的 VPS？">
    不需要。一个 Gateway(网关) 可以托管多个代理，每个代理都有自己的工作区、模型默认设置
    和路由。这是正常的设置方式，比为每个代理运行一个 VPS 更便宜、更简单。

    仅当您需要严格的隔离（安全边界）或不想共享非常不同的配置时，才使用独立的 VPS。否则，请保留一个 Gateway(网关)
    并使用多个代理或子代理。

  </Accordion>

  <Accordion title="与从 VPS 使用 SSH 相比，在我的个人笔记本电脑上使用节点有什么好处？">
    有的 - 节点是从远程 Gateway(网关) 访问您的笔记本电脑的首要方式，并且
    它们提供的不仅仅是 shell 访问权限。Gateway(网关) 运行在 macOS/Linux（Windows 通过 WSL2）上，并且
    轻量级（一个小型 VPS 或 Raspberry Pi 级别的盒子就可以了；4 GB RAM 就足够了），所以一个常见的
    设置是一个常驻主机加上您的笔记本电脑作为一个节点。

    - **无需入站 SSH。** 节点向外连接到 Gateway(网关) 的 WebSocket 并使用设备配对。
    - **更安全的执行控制。** `system.run` 受该笔记本电脑上的节点允许列表/批准限制。
    - **更多设备工具。** 除了 `system.run` 之外，节点还公开 `canvas`、`camera` 和 `screen`。
    - **本地浏览器自动化。** 将 Gateway(网关) 保留在 VPS 上，但通过笔记本电脑上的节点主机在本地运行 Chrome，或者通过 Chrome MCP 附加到主机上的本地 Chrome。

    SSH 适合临时的 shell 访问，但对于持续的代理工作流和
    设备自动化，节点更简单。

    文档：[节点](/en/nodes)、[节点 CLI](/en/cli/nodes)、[浏览器](/en/tools/browser)。

  </Accordion>

  <Accordion title="节点是否运行网关服务？">
    不。除非你有意运行隔离的配置文件（参见[多个网关](/en/gateway/multiple-gateways)），否则每台主机应仅运行**一个网关**。节点是连接
    到网关的外设（iOS/Android 节点，或菜单栏应用中的 macOS “节点模式”）。对于无头节点
    主机和 CLI 控制，请参阅[节点主机 CLI](/en/cli/node)。

    更改 `gateway`、`discovery` 和 `canvasHost` 需要完全重启。

  </Accordion>

  <Accordion title="是否有 API / RPC 方式来应用配置？">
    是的。

    - `config.schema.lookup`：在写入之前检查一个配置子树及其浅层模式节点、匹配的 UI 提示和直接子摘要
    - `config.get`：获取当前快照 + 哈希值
    - `config.patch`：安全部分更新（大多数 RPC 编辑的首选）；尽可能热重载，必要时重启
    - `config.apply`：验证 + 替换完整配置；尽可能热重载，必要时重启
    - 仅所有者可用的 `gateway` 运行时工具仍拒绝重写 `tools.exec.ask` / `tools.exec.security`；旧版 `tools.bash.*` 别名会规范化为相同的受保护执行路径

  </Accordion>

  <Accordion title="首次安装的最低合理配置">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    这会设置你的工作区并限制谁可以触发机器人。

  </Accordion>

  <Accordion title="如何在 VPS 上设置 Tailscale 并从我的 Mac 连接？">
    最少步骤：

    1. **在 VPS 上安装 + 登录**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在 Mac 上安装 + 登录**
       - 使用 Tailscale 应用并登录到同一个 tailnet。
    3. **启用 MagicDNS（推荐）**
       - 在 Tailscale 管理控制台中，启用 MagicDNS 以便 VPS 拥有一个稳定的名称。
    4. **使用 tailnet 主机名**
       - SSH: `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway(网关) WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果您想在不使用 SSH 的情况下使用控制 UI，请在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    这会将网关绑定到环回地址，并通过 Tailscale 暴露 HTTPS。参见 [Tailscale](/en/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何将 Mac 节点连接到远程 Gateway(网关) (Tailscale Serve)？">
    Serve 暴露了 **Gateway(网关) 控制界面 + WS**。节点通过同一个 Gateway(网关) WS 端点进行连接。

    推荐设置：

    1. **确保 VPS 和 Mac 位于同一个 tailnet 上**。
    2. **在远程模式下使用 macOS 应用**（SSH 目标可以是 tailnet 主机名）。
       该应用程序将隧道化 Gateway(网关) 端口并作为节点连接。
    3. **在网关上批准该节点**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文档: [Gateway(网关) 协议](/en/gateway/protocol), [设备发现](/en/gateway/discovery), [macOS 远程模式](/en/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我应该安装在第二台笔记本电脑上还是只添加一个节点？">
    如果您在第二台笔记本电脑上只需要**本地工具**（屏幕/摄像头/exec），请将其添加为一个
    **节点**。这样可以保持单一的 Gateway(网关) 并避免重复的配置。本地节点工具目前
    仅限 macOS 使用，但我们计划将其扩展到其他操作系统。

    仅当您需要**严格的隔离**或两个完全独立的机器人时，才安装第二个 Gateway(网关)。

    文档: [节点](/en/nodes), [节点 CLI](/en/cli/nodes), [多个网关](/en/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 环境变量和 .env 加载

<AccordionGroup>
  <Accordion title="OpenClaw 如何加载环境变量？">
    OpenClaw 从父进程（shell、launchd/systemd、CI 等）读取环境变量，并额外加载：

    - 当前工作目录中的 `.env`
    - 来自 `~/.openclaw/.env`（即 `$OPENCLAW_STATE_DIR/.env`）的全局回退 `.env`

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

    请参阅 [/environment](/en/help/environment) 了解完整的优先级和来源。

  </Accordion>

  <Accordion title="我通过服务启动了 Gateway(网关)，环境变量消失了。现在怎么办？">
    两种常见的修复方法：

    1. 将缺失的键放入 `~/.openclaw/.env` 中，这样即使服务未继承您的 shell 环境，也能被拾取。
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

    这将运行您的登录 shell 并仅导入缺失的预期键名（从不覆盖）。对应的环境变量为：
    `OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='I set COPILOT_GITHUB_TOKEN, but models status shows "Shell env: off." Why?'>
    `openclaw models status` 报告是否启用了 **shell env import**。“Shell env: off”
    **并不**意味着您的环境变量缺失——这只是意味着 OpenClaw 不会
    自动加载您的登录 shell。

    如果 Gateway(网关) 作为服务（launchd/systemd）运行，它将不会继承您的 shell
    环境。通过执行以下操作之一进行修复：

    1. 将 token 放在 `~/.openclaw/.env` 中：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或启用 shell 导入（`env.shellEnv.enabled: true`）。
    3. 或将其添加到您的配置 `env` 块中（仅在缺失时适用）。

    然后重启网关并重新检查：

    ```bash
    openclaw models status
    ```

    Copilot token 从 `COPILOT_GITHUB_TOKEN` 读取（也可以从 `GH_TOKEN` / `GITHUB_TOKEN`）。
    请参阅 [/concepts/模型-providers](/en/concepts/model-providers) 和 [/environment](/en/help/environment)。

  </Accordion>
</AccordionGroup>

## 会话和多次聊天

<AccordionGroup>
  <Accordion title="How do I start a fresh conversation?">
    发送 `/new` 或 `/reset` 作为独立消息。请参阅 [会话管理](/en/concepts/session)。
  </Accordion>

  <Accordion title="Do sessions reset automatically if I never send /new?">
    会话可以在 `session.idleMinutes` 后过期，但这在默认情况下是 **禁用的**（默认为 **0**）。
    将其设置为正值以启用空闲过期。启用后，空闲期后的 **下一条**
    消息将为该聊天键启动一个新的会话 ID。
    这不会删除记录——它只是开始一个新的会话。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有没有办法组建一个 OpenClaw 实例团队（一个 CEO 和多个 agent）？">
    可以，通过**多智能体路由（multi-agent routing）**和**子智能体（sub-agents）**。您可以创建一个协调器智能体和几个拥有各自工作空间和模型的 worker 智能体。

    也就是说，这最好被视为一种**有趣的实验**。它消耗大量 token，而且通常不如使用一个带有独立会话的机器人高效。我们设想的典型模式是您与一个机器人对话，使用不同的会话进行并行工作。该机器人还可以根据需要生成子智能体。

    文档：[Multi-agent routing](/en/concepts/multi-agent)，[Sub-agents](/en/tools/subagents)，[Agents CLI](/en/cli/agents)。

  </Accordion>

  <Accordion title="为什么上下文在任务中途被截断了？我该如何防止这种情况？">
    会话上下文受到模型窗口的限制。长聊天、大型工具输出或大量文件可能会触发压缩或截断。

    有帮助的方法：

    - 让机器人总结当前状态并将其写入文件。
    - 在执行长任务前使用 `/compact`，并在切换主题时使用 `/new`。
    - 将重要上下文保存在工作空间中，并让机器人重新读取。
    - 对于长时间或并行工作，使用子智能体，以保持主聊天较小。
    - 如果这种情况经常发生，请选择一个具有更大上下文窗口的模型。

  </Accordion>

  <Accordion title="如何在不卸载 OpenClaw 的情况下完全重置它？">
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

    - 如果新手引导（新手引导）发现现有配置，它也提供**重置（Reset）**选项。请参阅 [新手引导 (CLI)](/en/start/wizard)。
    - 如果您使用了配置文件（`--profile` / `OPENCLAW_PROFILE`），请重置每个状态目录（默认为 `~/.openclaw-<profile>`）。
    - 开发重置：`openclaw gateway --dev --reset`（仅限开发；清除开发配置 + 凭证 + 会话 + 工作空间）。

  </Accordion>

  <Accordion title='我遇到“context too large”错误 - 如何重置或压缩？'>
    使用以下方法之一：

    - **压缩**（保留对话但总结旧轮次）：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 来指导总结。

    - **重置**（为同一聊天密钥生成新的会话 ID）：

      ```
      /new
      /reset
      ```

    如果问题持续存在：

    - 启用或调整 **会话修剪**（`agents.defaults.contextPruning`）以修剪旧工具输出。
    - 使用具有更大上下文窗口的模型。

    文档：[压缩](/en/concepts/compaction)、[会话修剪](/en/concepts/session-pruning)、[会话管理](/en/concepts/session)。

  </Accordion>

  <Accordion title='为什么我看到“LLM request rejected: messages.content.tool_use.input field required”？'>
    这是一个提供商验证错误：模型发出了 `tool_use` 块，但缺少必需的
    `input`。这通常意味着会话历史已过时或损坏（通常发生在长线程后
    或工具/架构更改后）。

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

    如果 `HEARTBEAT.md` 存在但实际为空（仅包含空行和 markdown
    标题，如 `# Heading`），OpenClaw 会跳过心跳运行以节省 API 调用。
    如果文件缺失，心跳仍会运行，模型决定要做什么。

    每个代理的覆盖设置使用 `agents.list[].heartbeat`。文档：[心跳](/en/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我是否需要向 WhatsApp 群组添加一个“机器人帐户”？'>
    不需要。OpenClaw 运行在**您自己的帐户**上，所以如果您在群里，OpenClaw 就能看到它。
    默认情况下，群组回复会被阻止，直到您允许发送者（`groupPolicy: "allowlist"`）。

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
    选项 1（最快）：跟踪日志并在群组中发送一条测试消息：

    ```bash
    openclaw logs --follow --json
    ```

    查找以 `@g.us` 结尾的 `chatId`（或 `from`），例如：
    `1234567890-1234567890@g.us`。

    选项 2（如果已配置/在允许列表中）：从配置中列出群组：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文档：[WhatsApp](/en/channels/whatsapp)、[目录](/en/cli/directory)、[日志](/en/cli/logs)。

  </Accordion>

  <Accordion title="为什么 OpenClaw 不在群组中回复？">
    两个常见原因：

    - 提及门控已开启（默认）。您必须 @提及机器人（或匹配 `mentionPatterns`）。
    - 您配置了 `channels.whatsapp.groups` 但没有配置 `"*"`，并且该群组不在允许列表中。

    请参阅[群组](/en/channels/groups)和[群组消息](/en/channels/group-messages)。

  </Accordion>

<Accordion title="群组/话题是否与私信共享上下文？">直接聊天默认会折叠到主会话。群组/频道拥有自己的会话密钥，且 Telegram 话题 / Discord 线程是独立的会话。请参阅[群组](/en/channels/groups)和[群组消息](/en/channels/group-messages)。</Accordion>

  <Accordion title="我可以创建多少个工作空间和代理？">
    没有硬性限制。几十个（甚至几百个）都可以，但请注意以下几点：

    - **磁盘增长：** 会话和文字记录存储在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本：** 代理越多意味着并发的模型使用量越多。
    - **运维开销：** 每个代理的身份验证配置文件、工作空间和渠道路由。

    提示：

    - 为每个代理保留一个 **活动** 工作空间 (`agents.defaults.workspace`)。
    - 如果磁盘增长，请清理旧会话（删除 JSONL 或存储条目）。
    - 使用 `openclaw doctor` 来发现孤立的工作空间和配置文件不匹配的情况。

  </Accordion>

  <Accordion title="我可以同时运行多个机器人或聊天吗 (Slack)，应该如何设置？">
    是的。使用 **Multi-Agent Routing** 运行多个隔离的代理，并按渠道/账户/对等方路由传入消息。Slack 作为受支持的渠道，可以绑定到特定的代理。

    浏览器访问功能强大，但并非“能做人类能做的一切”——反机器人、验证码 (CAPTCHA) 和多因素认证 (MFA) 仍可能阻止自动化。为了最可靠的浏览器控制，请在主机上使用本地 Chrome MCP，或者在实际运行浏览器的机器上使用 CDP。

    最佳实践设置：

    - 始终在线的 Gateway(网关) 主机 (VPS/Mac mini)。
    - 每个角色一个代理（绑定）。
    - 绑定到这些代理的 Slack 渠道。
    - 需要时通过 Chrome MCP 或节点使用本地浏览器。

    文档：[Multi-Agent Routing](/en/concepts/multi-agent)，[Slack](/en/channels/slack)，
    [Browser](/en/tools/browser)，[Nodes](/en/nodes)。

  </Accordion>
</AccordionGroup>

## 模型：默认值、选择、别名、切换

<AccordionGroup>
  <Accordion title='什么是“默认模型”？'>
    OpenClaw 的默认模型取决于您设置的以下内容：

    ```
    agents.defaults.model.primary
    ```

    模型引用方式为 `provider/model`（例如：`openai/gpt-5.4`）。如果您省略提供商，OpenClaw 会首先尝试别名，然后尝试匹配该确切模型 ID 的唯一已配置提供商，最后才回退到已配置的默认提供商，作为一种已弃用的兼容性路径。如果该提供商不再提供已配置的默认模型，OpenClaw 将回退到第一个已配置的提供商/模型，而不是显示过时的已移除提供商的默认值。您仍然应该**显式**设置 `provider/model`。

  </Accordion>

  <Accordion title="您推荐哪个模型？">
    **推荐默认值：** 使用您的提供商堆栈中可用的最强最新一代模型。
    **对于启用了工具或不受信任输入的智能体：** 优先考虑模型强度而非成本。
    **对于常规/低风险聊天：** 使用更便宜的回退模型，并根据智能体角色进行路由。

    MiniMax 有其自己的文档：[MiniMax](/en/providers/minimax) 和
    [本地模型](/en/gateway/local-models)。

    经验法则：对于高风险工作，使用您能负担得起的**最佳模型**，对于常规聊天或摘要，使用更便宜的模型。您可以根据每个智能体路由模型，并使用子智能体来并行化长任务（每个子智能体都会消耗 Token）。请参阅[模型](/en/concepts/models)和
    [子智能体](/en/tools/subagents)。

    严重警告：较弱/过度量化的模型更容易受到提示词注入和不安全行为的影响。请参阅[安全性](/en/gateway/security)。

    更多背景信息：[模型](/en/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清除配置的情况下切换模型？">
    使用 **模型命令** 或仅编辑 **模型** 字段。避免完全替换配置。

    安全选项：

    - 在聊天中使用 `/model`（快速，针对当前会话）
    - `openclaw models set ...`（仅更新模型配置）
    - `openclaw configure --section model`（交互式）
    - 在 `~/.openclaw/openclaw.json` 中编辑 `agents.defaults.model`

    除非您打算替换整个配置，否则避免使用带有部分对象的 `config.apply`。
    对于 RPC 编辑，请先使用 `config.schema.lookup` 检查，并首选 `config.patch`。查找负载会为您提供标准化路径、浅层模式文档/约束以及直接子摘要。
    用于部分更新。
    如果您确实覆盖了配置，请从备份恢复或重新运行 `openclaw doctor` 进行修复。

    文档：[模型](/en/concepts/models)、[配置](/en/cli/configure)、[Config](/en/cli/config)、[Doctor](/en/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自托管模型（llama.cpp、vLLM、Ollama）吗？">
    可以。Ollama 是本地模型最简单的途径。

    最快设置方法：

    1. 从 `https://ollama.com/download` 安装 Ollama
    2. 拉取一个本地模型，例如 `ollama pull gemma4`
    3. 如果您也想要云端模型，请运行 `ollama signin`
    4. 运行 `openclaw onboard` 并选择 `Ollama`
    5. 选择 `Local` 或 `Cloud + Local`

    注意事项：

    - `Cloud + Local` 为您提供云端模型以及本地 Ollama 模型
    - 诸如 `kimi-k2.5:cloud` 之类的云端模型不需要本地拉取
    - 如需手动切换，请使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全提示：较小或重度量化的模型更容易受到提示注入攻击。对于任何可以使用工具的机器人，我们强烈推荐使用**大型模型**。如果您仍想使用小模型，请启用沙箱隔离和严格的工具允许列表。

    文档：[Ollama](/en/providers/ollama)、[本地模型](/en/gateway/local-models)、
    [模型提供商](/en/concepts/model-providers)、[安全](/en/gateway/security)、
    [沙箱隔离](/en/gateway/sandboxing)。

  </Accordion>

<Accordion title="OpenClaw、Flawd 和 Krill 使用什么模型？">- 这些部署可能有所不同，并且可能会随时间变化；没有固定的提供商推荐。 - 使用 `openclaw models status` 检查每个网关上的当前运行时设置。 - 对于对安全敏感/启用了工具的代理，请使用可用的最新一代最强模型。</Accordion>

  <Accordion title="如何即时切换模型（无需重启）？">
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

    `/model`（以及 `/model list`）显示一个紧凑的带编号选择器。通过数字选择：

    ```
    /model 3
    ```

    您还可以强制提供商使用特定的身份验证配置文件（每个会话）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 显示哪个代理处于活动状态，正在使用哪个 `auth-profiles.json` 文件，以及接下来将尝试哪个身份验证配置文件。
    它还显示配置的提供商端点（`baseUrl`）和 API 模式（`api`）（如果可用）。

    **如何取消固定我用 @profile 设置的配置文件？**

    **不**带 `@profile` 后缀重新运行 `/model`：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果您想返回默认值，请从 `/model` 中选择它（或发送 `/model <default provider/model>`）。
    使用 `/model status` 确认哪个身份验证配置文件处于活动状态。

  </Accordion>

  <Accordion title="我可以将 GPT 5.2 用于日常任务，将 Codex 5.3 用于编码吗？">
    是的。将一个设置为默认值，并根据需要切换：

    - **快速切换（每个会话）：** 日常任务使用 `/model gpt-5.4`，使用 Codex OAuth 进行编码时使用 `/model openai-codex/gpt-5.4`。
    - **默认值 + 切换：** 将 `agents.defaults.model.primary` 设置为 `openai/gpt-5.4`，然后在编码时切换到 `openai-codex/gpt-5.4`（或者反过来）。
    - **子代理：** 将编码任务路由到具有不同默认模型的子代理。

    请参阅 [模型](/en/concepts/models) 和 [斜杠命令](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何为 GPT 5.4 配置快速模式？">
    使用会话切换开关或配置默认值均可：

    - **按会话：** 在会话使用 `openai/gpt-5.4` 或 `openai-codex/gpt-5.4` 时发送 `/fast on`。
    - **按模型默认值：** 将 `agents.defaults.models["openai/gpt-5.4"].params.fastMode` 设置为 `true`。
    - **Codex OAuth 也是：** 如果你也使用 `openai-codex/gpt-5.4`，请在此处设置相同的标志。

    示例：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": {
              params: {
                fastMode: true,
              },
            },
            "openai-codex/gpt-5.4": {
              params: {
                fastMode: true,
              },
            },
          },
        },
      },
    }
    ```

    对于 OpenAI，快速模式在支持的原生 Responses 请求上映射为 `service_tier = "priority"`。会话 `/fast` 会覆盖 beat 配置默认值。

    请参阅 [Thinking and fast mode](/en/tools/thinking) 和 [OpenAI fast mode](/en/providers/openai#openai-fast-mode)。

  </Accordion>

  <Accordion title='为什么我看到“Model ... is not allowed”然后没有回复？'>
    如果设置了 `agents.defaults.models`，它将成为 `/model` 和任何
    会话覆盖的 **allowlist（允许列表）**。选择不在该列表中的模型将返回：

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    该错误是 **代替** 正常回复返回的。修复方法：将模型添加到
    `agents.defaults.models` 中，移除允许列表，或从 `/model list` 中选择一个模型。

  </Accordion>

  <Accordion title='为什么我会看到“Unknown 模型: minimax/MiniMax-M2.7”？'>
    这意味着**提供商未配置**（未找到 MiniMax 提供商配置或身份验证配置文件），因此无法解析该模型。

    修复清单：

    1. 升级到最新的 OpenClaw 版本（或从源码运行 `main`），然后重启网关。
    2. 确保已配置 MiniMax（通过向导或 JSON），或者 env/auth 配置文件中存在 MiniMax 身份验证，以便注入匹配的提供商
       （针对 `minimax` 的 `MINIMAX_API_KEY`、`MINIMAX_OAUTH_TOKEN` 或针对 `minimax-portal` 存储的 MiniMax OAuth）。
    3. 为您的身份验证路径使用精确的模型 ID（区分大小写）：
       针对密钥设置使用 `minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`，或
       针对身份验证设置使用 `minimax-portal/MiniMax-M2.7` /
       `minimax-portal/MiniMax-M2.7-highspeed`。
    4. 运行：

       ```bash
       openclaw models list
       ```

       并从列表中选择（或在聊天中使用 `/model list`）。

    参见 [API](/en/providers/minimax) 和 [模型](/en/concepts/models)。

  </Accordion>

  <Accordion title="我可以将 MiniMax 用作默认设置，并在复杂任务中使用 OpenAI 吗？">
    是的。使用 **MiniMax 作为默认设置**，并在需要时**按会话**切换模型。
    故障转移是用于**错误**的，而不是用于“困难的任务”，因此请使用 `/model` 或单独的代理。

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

    **选项 B：单独的代理**

    - 代理 A 默认：MiniMax
    - 代理 B 默认：OpenAI
    - 通过代理路由或使用 `/agent` 进行切换

    文档：[模型](/en/concepts/models)、[多代理路由](/en/concepts/multi-agent)、[MiniMax](/en/providers/minimax)、[OpenAI](/en/providers/openai)。

  </Accordion>

  <Accordion title="Are opus / sonnet / gpt built-in shortcuts?">
    是的。OpenClaw 附带了一些默认的简写（仅当模型存在于 `agents.defaults.models` 中时才应用）：

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果您设置了同名的别名，您的值将优先。

  </Accordion>

  <Accordion title="How do I define/override 模型 shortcuts (aliases)?">
    别名来源于 `agents.defaults.models.<modelId>.alias`。示例：

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

    然后 `/model sonnet`（或在支持时使用 `/<alias>`）将解析为该模型 ID。

  </Accordion>

  <Accordion title="How do I add models from other providers like OpenRouter or Z.AI?">
    OpenRouter（按令牌付费；包含许多模型）：

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

    Z.AI (GLM 模型)：

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

    如果您引用了一个提供商/模型，但缺少所需的提供商密钥，您将收到运行时身份验证错误（例如 `No API key found for provider "zai"`）。

    **添加新代理后未找到提供商的 API 密钥**

    这通常意味着**新代理**拥有空的身份验证存储。身份验证是针对每个代理的，并存储在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修复选项：

    - 运行 `openclaw agents add <id>` 并在向导期间配置身份验证。
    - 或者将主代理的 `agentDir` 中的 `auth-profiles.json` 复制到新代理的 `agentDir` 中。

    请**勿**在代理之间重复使用 `agentDir`；这会导致身份验证/会话冲突。

  </Accordion>
</AccordionGroup>

## 模型故障转移和“所有模型均失败”

<AccordionGroup>
  <Accordion title="故障转移是如何工作的？">
    故障转移分两个阶段进行：

    1. 同一提供商内的 **Auth profile rotation**。
    2. **Model fallback** 到 `agents.defaults.model.fallbacks` 中的下一个模型。

    冷却期适用于失败的个人资料（指数退避），因此即使提供商受到速率限制或暂时出现故障，OpenClaw 也能保持响应。

    速率限制桶包含的不仅仅是普通的 `429` 响应。OpenClaw
    还将诸如 `Too many concurrent requests`、
    `ThrottlingException`、 `concurrency limit reached`、
    `workers_ai ... quota limit exceeded`、 `resource exhausted` 等消息以及周期性
    使用量窗口限制（`weekly/monthly limit reached`）视为值得故障转移的
    速率限制。

    一些看起来像账单相关的响应并不是 `402`，一些 HTTP `402`
    响应也保留在该瞬态桶中。如果提供商在 `401` 或 `403` 上返回明确的账单文本，OpenClaw 仍可以将其保留在
    账单通道中，但特定于提供商的文本匹配器仍限定于
    拥有它们的提供商（例如 OpenRouter `Key limit exceeded`）。如果 `402`
    消息看起来像可重试的使用量窗口或
    组织/工作区支出限制（`daily limit reached, resets tomorrow`、
    `organization spending limit exceeded`），OpenClaw 会将其视为
    `rate_limit`，而不是长期的账单禁用。

    上下文溢出错误有所不同：诸如
    `request_too_large`、 `input exceeds the maximum number of tokens`、
    `input token count exceeds the maximum number of input tokens`、
    `input is too long for the model` 或 `ollama error: context length
    exceeded` 之类的签名保留在压缩/重试路径上，而不是推进模型
    回退。

    通用服务器错误文本的有意范围比“任何包含
    unknown/error 的内容”更窄。OpenClaw 确实会处理提供商范围的瞬态形态，
    例如 Anthropic 纯粹的 `An unknown error occurred`、OpenRouter 纯粹的
    `Provider returned error`、诸如 `Unhandled stop reason:
    error`, JSON `api_error` 之类的停止原因错误以及带有瞬态服务器文本的
    （`internal server error`、 `unknown error, 520`、 `upstream error`、`backend
    error`), and provider-busy errors such as `ModelNotReadyException` 作为
    当提供商上下文匹配时值得故障转移的超时/过载信号。
    通用内部回退文本（如 `LLM request failed with an unknown
    error.`）保持保守，本身不会触发模型回退。

  </Accordion>

  <Accordion title='“未找到配置文件 anthropic:default 的凭据”是什么意思？'>
    这意味着系统尝试使用身份验证配置文件 ID `anthropic:default`，但无法在预期的身份验证存储中找到其凭据。

    **修复清单：**

    - **确认身份验证配置文件的位置**（新路径与旧路径）
      - 当前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 旧版：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）
    - **确认您的环境变量已由 Gateway(网关) 加载**
      - 如果您在 Shell 中设置了 `ANTHROPIC_API_KEY`，但通过 systemd/launchd 运行 Gateway(网关)，它可能无法继承该变量。请将其放入 `~/.openclaw/.env` 中或启用 `env.shellEnv`。
    - **确保您正在编辑正确的代理**
      - 多代理设置意味着可能存在多个 `auth-profiles.json` 文件。
    - **健全性检查模型/身份验证状态**
      - 使用 `openclaw models status` 查看已配置的模型以及提供商是否已通过身份验证。

    **“未找到配置文件 anthropic 的凭据”修复清单**

    这意味着运行被固定到了 Anthropic 身份验证配置文件，但 Gateway(网关)
    无法在其身份验证存储中找到它。

    - **使用 Claude CLI**
      - 在 gateway 主机上运行 `openclaw models auth login --provider anthropic --method cli --set-default`。
    - **如果您想改用 API 密钥**
      - 将 `ANTHROPIC_API_KEY` 放入 **gateway 主机** 上的 `~/.openclaw/.env` 中。
      - 清除任何强制使用缺失配置文件的固定顺序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **确认您在 gateway 主机上运行命令**
      - 在远程模式下，身份验证配置文件位于 gateway 机器上，而不是您的笔记本电脑上。

  </Accordion>

  <Accordion title="为什么它也尝试了 Google Gemini 并失败了？">
    如果您的模型配置包含 Google Gemini 作为后备（或者您切换到了 Gemini 简写），OpenClaw 将在模型回退期间尝试它。如果您尚未配置 Google 凭据，您将看到 `No API key found for provider "google"`。

    修复方法：提供 Google 身份验证，或者在 `agents.defaults.model.fallbacks` / 别名中移除/避免使用 Google 模型，以免回退路由到那里。

    **LLM 请求被拒绝：需要思考签名 (Google Antigravity)**

    原因：会话历史包含 **没有签名的思考块**（通常来自
    中止/不完整的流）。Google Antigravity 要求思考块必须具有签名。

    修复方法：OpenClaw 现在会为 Google Antigravity Claude 剥离未签名的思考块。如果问题仍然存在，请启动一个 **新会话** 或为该代理设置 `/thinking off`。

  </Accordion>
</AccordionGroup>

## 身份验证配置文件：它们是什么以及如何管理它们

相关：[/concepts/oauth](/en/concepts/oauth) (OAuth 流程、令牌存储、多账户模式)

<AccordionGroup>
  <Accordion title="什么是身份验证配置文件？">
    身份验证配置文件是与提供商关联的命名凭据记录（OAuth 或 API 密钥）。配置文件位于：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="典型的配置文件 ID 是什么？">
    OpenClaw 使用带有提供商前缀的 ID，例如：

    - `anthropic:default` (当不存在电子邮件身份时常见)
    - 用于 OAuth 身份的 `anthropic:<email>`
    - 您选择的自定义 ID (例如 `anthropic:work`)

  </Accordion>

  <Accordion title="我可以控制先尝试哪个身份验证配置文件吗？">
    可以。配置支持配置文件的可选元数据和每个提供商的顺序 (`auth.order.<provider>`)。这**不**存储机密信息；它将 ID 映射到提供商/模式并设置轮换顺序。

    如果某个配置文件处于短暂的 **冷却**（冷却期）（速率限制/超时/身份验证失败）状态或较长时间的 **禁用** 状态（计费问题/余额不足），OpenClaw 可能会暂时跳过该配置文件。要检查这一点，请运行 `openclaw models status --json` 并检查 `auth.unusableProfiles`。调整方法：`auth.cooldowns.billingBackoffHours*`。

    速率限制冷却期可以限定于特定模型。对于同一个提供商，一个模型处于冷却期的配置文件仍然可用于同级的另一个模型，而计费/禁用窗口仍然会阻止整个配置文件。

    您还可以通过 CLI 设置 **每个代理** 的顺序覆盖（存储在该代理的 `auth-state.json` 中）：

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

    要定位特定代理：

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

    要验证实际将尝试的内容，请使用：

    ```bash
    openclaw models status --probe
    ```

    如果存储的配置文件未包含在显式顺序中，探测将针对该配置文件报告 `excluded_by_auth_order`，而不是静默尝试它。

  </Accordion>

  <Accordion title="OAuth 与 API 密钥 - 有什么区别？">
    OpenClaw 支持两者：

    - **OAuth** 通常利用订阅访问（如适用）。
    - **API 密钥** 使用按 Token 付费的计费方式。

    向导明确支持 Anthropic Claude CLI、OpenAI Codex OAuth 和 API 密钥。

  </Accordion>
</AccordionGroup>

## Gateway(网关)：端口、“已在运行”和远程模式

<AccordionGroup>
  <Accordion title="Gateway(网关) 使用哪个端口？">
    `gateway.port` 控制 WebSocket + HTTP（控制 UI、钩子等）的单个多路复用端口。

    优先级：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='为什么 openclaw 网关状态显示“Runtime: running”但“RPC probe: failed”？'>
    因为“running”是**监督程序**（supervisor）的视角（launchd/systemd/schtasks）。RPC 探测是 CLI 实际连接到网关 WebSocket 并调用 `status` 的行为。

    使用 `openclaw gateway status` 并相信这些行：

    - `Probe target:`（探测实际使用的 URL）
    - `Listening:`（端口上实际绑定的内容）
    - `Last gateway error:`（当进程存活但端口未监听时的常见根本原因）

  </Accordion>

  <Accordion title='为什么 openclaw 网关状态显示的“Config (cli)”和“Config (service)”不同？'>
    您正在编辑一个配置文件，而服务正在运行另一个配置文件（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    修复方法：

    ```bash
    openclaw gateway install --force
    ```

    在您希望服务使用的同一 `--profile` / 环境中运行该命令。

  </Accordion>

  <Accordion title='“another gateway instance is already listening”是什么意思？'>
    OpenClaw 通过在启动时立即绑定 WebSocket 监听器来强制执行运行时锁（默认为 `ws://127.0.0.1:18789`）。如果绑定失败并出现 `EADDRINUSE`，它会抛出 `GatewayLockError`，表明另一个实例已在监听。

    修复方法：停止另一个实例，释放端口，或使用 `openclaw gateway --port <port>` 运行。

  </Accordion>

  <Accordion title="如何在远程模式下运行 OpenClaw（客户端连接到其他地方的 Gateway(网关)）？">
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

    注意事项：

    - `openclaw gateway` 仅在 `gateway.mode` 为 `local` 时启动（或者您传递了覆盖标志）。
    - macOS 应用会监视配置文件，并在这些值更改时实时切换模式。
    - `gateway.remote.token` / `.password` 仅仅是客户端的远程凭据；它们本身不会启用本地网关身份验证。

  </Accordion>

  <Accordion title='控制 UI 显示“unauthorized”（或不断重新连接）。现在怎么办？'>
    您的网关认证路径与 UI 的认证方式不匹配。

    事实（来自代码）：

    - 控制 UI 将令牌保存在 `sessionStorage` 中，用于当前浏览器标签页会话和选定的网关 URL，因此同标签页刷新可以继续工作，而无需恢复长期的 localStorage 令牌持久性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，当网关返回重试提示（`canRetryWithDeviceToken=true`，`recommendedNextStep=retry_with_device_token`）时，受信任的客户端可以尝试使用缓存的设备令牌进行一次有界重试。
    - 该缓存令牌重试现在会重用与设备令牌一起存储的缓存批准范围。显式 `deviceToken` / 显式 `scopes` 调用者仍保留其请求的范围集，而不是继承缓存的范围。
    - 在该重试路径之外，连接认证优先级首先是显式共享令牌/密码，然后是显式 `deviceToken`，然后是存储的设备令牌，最后是引导令牌。
    - 引导令牌范围检查带有角色前缀。内置引导操作员白名单仅满足操作员请求；节点或其他非操作员角色仍需要在其自己的角色前缀下的范围。

    修复方法：

    - 最快：`openclaw dashboard`（打印 + 复制仪表板 URL，尝试打开；如果是无头模式则显示 SSH 提示）。
    - 如果您还没有令牌：`openclaw doctor --generate-gateway-token`。
    - 如果是远程，先建立隧道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/`。
    - 共享密钥模式：设置 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然后在控制 UI 设置中粘贴匹配的密钥。
    - Tailscale Serve 模式：确保 `gateway.auth.allowTailscale` 已启用，并且您打开的是 Serve URL，而不是绕过 Tailscale 身份标头的原始环回/tailnet URL。
    - 受信任代理模式：确保您通过配置的非环回身份感知代理访问，而不是同主机环回代理或原始网关 URL。
    - 如果在一次重试后不匹配仍然存在，请轮换/重新批准配对的设备令牌：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 如果该轮换调用显示被拒绝，请检查两件事：
      - 配对设备会话只能轮换其**自己的**设备，除非它们也具有 `operator.admin`
      - 显式 `--scope` 值不能超过调用者当前的操作员范围
    - 还是卡住了？运行 `openclaw status --all` 并按照 [故障排除](/en/gateway/troubleshooting) 操作。有关认证详细信息，请参阅 [仪表板](/en/web/dashboard)。

  </Accordion>

  <Accordion title="我设置了 gateway.bind tailnet 但它无法绑定，也没有监听">
    `tailnet` bind 会从你的网络接口中选择一个 Tailscale IP (100.64.0.0/10)。如果该机器未连接 Tailscale（或接口已关闭），则没有可绑定的地址。

    修复方法：

    - 在该主机上启动 Tailscale（使其拥有 100.x 地址），或者
    - 切换到 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是显式的。`auto` 优先使用回环地址；当你想要仅限 tailnet 的绑定时，请使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="我可以在同一主机上运行多个 Gateway(网关) 吗？">
    通常不需要——一个 Gateway(网关) 可以运行多个消息通道和代理。仅在需要冗余（例如：救援机器人）或硬隔离时才使用多个 Gateway(网关)。

    可以，但必须隔离：

    - `OPENCLAW_CONFIG_PATH`（每个实例的配置）
    - `OPENCLAW_STATE_DIR`（每个实例的状态）
    - `agents.defaults.workspace`（工作区隔离）
    - `gateway.port`（唯一端口）

    快速设置（推荐）：

    - 每个实例使用 `openclaw --profile <name> ...`（自动创建 `~/.openclaw-<name>`）。
    - 在每个配置文件中设置唯一的 `gateway.port`（或在手动运行时传递 `--port`）。
    - 安装每个配置文件的服务：`openclaw --profile <name> gateway install`。

    配置文件还会为服务名添加后缀（`ai.openclaw.<profile>`；旧版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
    完整指南：[Multiple gateways](/en/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='“无效握手” / 代码 1008 是什么意思？'>
    Gateway(网关) 是一个 **WebSocket 服务器**，它期望收到的第一条消息是
    `connect` 帧。如果收到其他内容，它会以
    **代码 1008**（策略违规）关闭连接。

    常见原因：

    - 您在浏览器中打开了 **HTTP** URL (`http://...`)，而不是 WS 客户端。
    - 您使用了错误的端口或路径。
    - 代理或隧道剥离了认证头或发送了非 Gateway(网关) 请求。

    快速修复：

    1. 使用 WS URL：`ws://<host>:18789`（如果是 HTTPS 则为 `wss://...`）。
    2. 不要在普通浏览器标签页中打开 WS 端口。
    3. 如果开启了认证，请将令牌/密码包含在 `connect` 帧中。

    如果您使用的是 CLI 或 TUI，URL 应如下所示：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    协议详情：[Gateway(网关) protocol](/en/gateway/protocol)。

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

    最快的日志追踪：

    ```bash
    openclaw logs --follow
    ```

    服务/监督者日志（当网关通过 launchd/systemd 运行时）：

    - macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（默认：`~/.openclaw/logs/...`；配置文件使用 `~/.openclaw-<profile>/logs/...`）
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    更多信息请参阅 [Troubleshooting](/en/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="如何启动/停止/重启 Gateway(网关) 服务？">
    使用 gateway helpers：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手动运行网关，`openclaw gateway --force` 可以回收端口。请参阅 [Gateway(网关)](/en/gateway)。

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

    如果你从未安装过该服务，请在前台启动它：

    ```bash
    openclaw gateway run
    ```

    **2) 原生 Windows（不推荐）：** Gateway(网关) 直接在 Windows 中运行。

    打开 PowerShell 并运行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你手动运行它（无服务），请使用：

    ```powershell
    openclaw gateway run
    ```

    文档：[Windows (WSL2)](/en/platforms/windows)，[Gateway(网关) 服务手册](/en/gateway)。

  </Accordion>

  <Accordion title="Gateway(网关) 已启动，但回复从未到达。我应该检查什么？">
    首先进行快速健康检查：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常见原因：

    - 模型认证未在 **gateway host** 上加载（检查 `models status`）。
    - 渠道配对/允许列表阻止了回复（检查渠道配置 + 日志）。
    - WebChat/Dashboard 在没有正确令牌的情况下打开。

    如果你是远程连接，请确认隧道/Tailscale 连接已启动，并且
    Gateway(网关) WebSocket 可达。

    文档：[渠道](/en/channels)，[故障排除](/en/gateway/troubleshooting)，[远程访问](/en/gateway/remote)。

  </Accordion>

  <Accordion title='"Disconnected from gateway: no reason" - 现在该怎么办？'>
    这通常意味着 UI 失去了 WebSocket 连接。检查：

    1. Gateway(网关) 是否正在运行？ `openclaw gateway status`
    2. Gateway(网关) 是否健康？ `openclaw status`
    3. UI 是否有正确的令牌？ `openclaw dashboard`
    4. 如果是远程连接，隧道/Tailscale 链接是否已启动？

    然后追踪日志：

    ```bash
    openclaw logs --follow
    ```

    文档：[仪表板](/en/web/dashboard)，[远程访问](/en/gateway/remote)，[故障排除](/en/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失败了。我应该检查什么？">
    首先检查日志和渠道状态：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然后对照错误信息：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 菜单条目过多。OpenClaw 已经自动修剪以符合 Telegram 限制并用较少的命令重试，但仍需删除一些菜单条目。请减少插件/技能/自定义命令，或者如果您不需要菜单，请禁用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或类似网络错误：如果您使用的是 VPS 或位于代理后面，请确认允许出站 HTTPS 且 DNS 对 `api.telegram.org` 有效。

    如果 Gateway(网关) 是远程的，请确保您正在查看 Gateway(网关) 主机上的日志。

    文档：[Telegram](/en/channels/telegram)，[渠道故障排除](/en/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 显示无输出。我应该检查什么？">
    首先确认 Gateway(网关) 是可达的，并且代理可以运行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 查看当前状态。如果您期望在聊天
    渠道中收到回复，请确保已启用投递 (`/deliver on`)。

    文档：[TUI](/en/web/tui)，[斜杠命令](/en/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何完全停止然后启动 Gateway(网关)？">
    如果您安装了服务：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    这将停止/启动 **受监督的服务** (macOS 上的 launchd，Linux 上的 systemd)。
    当 Gateway(网关) 作为守护进程在后台运行时使用此命令。

    如果您在前台运行，使用 Ctrl-C 停止，然后：

    ```bash
    openclaw gateway run
    ```

    文档：[Gateway(网关) 服务手册](/en/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: 重启**后台服务** (launchd/systemd)。
    - `openclaw gateway`: 在此终端会话中**于前台**运行网关。

    如果您安装了服务，请使用 gateway 命令。当您想要一次性在前台运行时，请使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    使用 `--verbose` 启动 Gateway(网关) 以获取更多控制台详细信息。然后检查日志文件中的渠道认证、模型路由和 RPC 错误。
  </Accordion>
</AccordionGroup>

## 媒体和附件

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    来自代理的出站附件必须包含 `MEDIA:<path-or-url>` 行（独占一行）。请参阅 [OpenClaw assistant setup](/en/start/openclaw) 和 [Agent send](/en/tools/agent-send)。

    CLI 发送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    同时还要检查：

    - 目标渠道支持出站媒体，且未被允许列表阻止。
    - 文件在提供商的大小限制范围内（图片会被调整为最大 2048px）。
    - `tools.fs.workspaceOnly=true` 限制本地路径发送只能用于工作区、temp/media-store 和沙盒验证的文件。
    - `tools.fs.workspaceOnly=false` 允许 `MEDIA:` 发送代理已可读取的主机本地文件，但仅限于媒体和安全文档类型（图片、音频、视频、PDF 和 Office 文档）。纯文本和类似机密的文件仍然被阻止。

    请参阅 [Images](/en/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全和访问控制

<AccordionGroup>
  <Accordion title="让 OpenClaw 接收入站私信是否安全？">
    将入站私信视为不可信输入。默认设置旨在降低风险：

    - 支持私信的渠道上的默认行为是**配对**：
      - 未知发送者会收到一个配对代码；机器人不会处理他们的消息。
      - 使用以下命令批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 每个渠道最多允许 **3 个**待处理请求；如果代码未送达，请检查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公开开启私信需要明确选择加入（`dmPolicy: "open"` 和 allowlist `"*"`）。

    运行 `openclaw doctor` 以检查有风险的私信策略。

  </Accordion>

  <Accordion title="提示词注入只是公共机器人需要注意的问题吗？">
    不是。提示词注入涉及的是**不可信内容**，而不仅仅是谁可以向机器人发送私信。
    如果您的助手读取外部内容（网络搜索/获取、浏览器页面、电子邮件、
    文档、附件、粘贴的日志），这些内容可能包含试图
    劫持模型的指令。即使**您是唯一的发送者**，这种情况也可能发生。

    最大的风险在于启用工具时：模型可能会被诱骗
    泄露上下文或代表您调用工具。通过以下方式减小攻击半径：

    - 使用只读或禁用工具的“reader”代理来总结不可信内容
    - 为启用工具的代理关闭 `web_search` / `web_fetch` / `browser`
    - 将解码后的文件/文档文本也视为不可信：OpenResponses
      `input_file` 和媒体附件提取都会将提取的文本包裹在
      明确的外部内容边界标记中，而不是传递原始文件文本
    - 沙箱隔离和严格的工具允许列表

    详情：[Security](/en/gateway/security)。

  </Accordion>

  <Accordion title="我的机器人应该拥有自己的电子邮件、GitHub 账户或电话号码吗？">
    是的，对于大多数设置来说。将机器人与单独的账户和电话号码隔离开来
    可以在出现问题时减少受损范围。这也使得在不影响您个人账户的情况下
    更容易轮换凭据或撤销访问权限。

    从小处着手。仅授予您实际需要的工具和账户的访问权限，并在必要时
    稍后进行扩展。

    文档：[安全](/en/gateway/security)，[配对](/en/channels/pairing)。

  </Accordion>

  <Accordion title="我可以让它自主管理我的短信吗？这安全吗？">
    我们**不**建议让它完全控制您的个人消息。最安全的模式是：

    - 将私信保持在 **配对模式** 或严格的允许列表中。
    - 如果您希望它代表您发送消息，请使用 **单独的电话号码或账户**。
    - 让它起草草稿，然后 **在发送前进行批准**。

    如果您想进行实验，请在专用账户上进行，并保持隔离。请参阅
    [安全](/en/gateway/security)。

  </Accordion>

<Accordion title="我可以为个人助理任务使用更便宜的模型吗？">是的，**如果**代理仅用于聊天且输入是受信任的。较小的等级 更容易受到指令劫持，因此请避免在启用工具的代理上使用它们 或在读取不受信任的内容时使用。如果您必须使用较小的模型，请锁定 工具并在沙盒中运行。请参阅 [安全](/en/gateway/security)。</Accordion>

  <Accordion title="我在 Telegram 中运行了 /start 但没有收到配对代码">
    仅当未知发送者向机器人发送消息并且
    `dmPolicy: "pairing"` 被启用时，才会发送配对代码。单独的 `/start` 不会生成代码。

    检查待处理的请求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您想立即获得访问权限，请将您的发送者 ID 加入允许列表或为该账户设置 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它会给我的联系人发消息吗？配对如何进行？">
    不会。默认的 WhatsApp 私信策略是 **配对**。未知发件人只会收到一个配对代码，且他们的消息 **不会被处理**。OpenClaw 只会回复它收到的聊天或你触发的显式发送。

    使用以下命令批准配对：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待处理的请求：

    ```bash
    openclaw pairing list whatsapp
    ```

    向导手机号码提示：它用于设置你的 **allowlist/owner**（允许列表/所有者），以便你自己的私信被允许。它不用于自动发送。如果你使用你的个人 WhatsApp 号码运行，请使用该号码并启用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天命令、中止任务以及“它无法停止”

<AccordionGroup>
  <Accordion title="如何阻止内部系统消息显示在聊天中？">
    大多数内部或工具消息仅在该会话启用了 **verbose**（详细）或 **reasoning**（推理）时才出现。

    在你看到该消息的聊天中修复：

    ```
    /verbose off
    /reasoning off
    ```

    如果仍然很嘈杂，请在控制 UI 中检查会话设置并将 verbose 设置为 **inherit**（继承）。同时确认你没有在配置中使用设置了 `verboseDefault` 为 `on` 的机器人配置文件。

    文档：[Thinking and verbose](/en/tools/thinking)、[Security](/en/gateway/security#reasoning-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在运行的任务？">
    将以下任一内容 **作为独立消息**（无斜杠）发送：

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

    斜杠命令概述：请参阅 [Slash commands](/en/tools/slash-commands)。

    大多数命令必须作为以 `/` 开头的 **独立** 消息发送，但少数快捷方式（如 `/status`）也可以对在允许列表中的发件人以内联方式工作。

  </Accordion>

  <Accordion title='如何从 Telegram 发送 Discord 消息？（“跨上下文消息被拒绝”）'>
    Telegram 默认阻止**跨提供商**消息传递。如果工具调用绑定到 OpenClaw，除非您明确允许，否则它不会发送到 Telegram。

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

    编辑配置后重启 Discord。

  </Accordion>

  <Accordion title='为什么感觉机器人“忽略”了快速连续发送的消息？'>
    队列模式控制新消息如何与正在运行的交互。使用 `/queue` 更改模式：

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
  <Accordion title="使用 Anthropic 密钥时 API 的默认模型是什么？">
    在 OpenClaw 中，凭据和模型选择是分开的。设置 `ANTHROPIC_API_KEY`（或在身份验证配置文件中存储 Anthropic API 密钥）可以启用身份验证，但实际的默认模型是您在 `agents.defaults.model.primary` 中配置的任何模型（例如，`anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，这意味着 Gateway(网关) 无法在正在运行的代理的预期
    `auth-profiles.json` 中找到 Anthropic 凭据。
  </Accordion>
</AccordionGroup>

---

还是卡住了？请在 [Discord](https://discord.com/invite/clawd) 中提问或在 GitHub 上发起 [讨论](https://github.com/openclaw/openclaw/discussions)。
