---
summary: "OpenClawMantis 是一个可视化端到端验证系统，用于在实时传输上重现 OpenClaw 错误，捕获修复前后的证据，并将产物附加到 PR。"
title: "Mantis"
read_when:
  - Building or running live visual QA for OpenClaw bugs
  - Adding before and after verification for a pull request
  - Adding Discord, Slack, WhatsApp, or other live transport scenarios
  - Debugging QA runs that need screenshots, browser automation, or VNC access
---

Mantis 是 OpenClaw 的端到端验证系统，适用于需要真实运行时、真实传输和可视化证明的错误。它针对已知的错误引用运行场景，捕获证据，然后针对候选引用运行相同的场景，并将比较结果作为产物发布，维护者可以从 PR 或本地命令检查这些产物。

Mantis 从 Discord 开始，因为 Discord 为我们提供了一个高价值的首选通道：真实的机器人身份验证、真实的公会频道、反应、主题、原生命令以及一个浏览器 UI，人类可以在其中直观地确认传输显示的内容。

## 目标

- 使用用户看到的相同传输形状，从 GitHub issue 或 PR 重现错误。
- 在应用修复之前，在基线引用上捕获 **before**（修复前）产物。
- 在应用修复之后，在候选引用上捕获 **after**（修复后）产物。
- 尽可能使用确定性预言机，例如 Discord REST 反应读取或频道记录检查。
- 当错误具有可见的 UI 表面时，捕获屏幕截图。
- 通过代理控制的 CLI 在本地运行，并通过 GitHub 远程运行。
- 保留足够的机器状态以便在登录、浏览器自动化或提供商身份验证卡住时进行 VNC 救援。
- 当运行受阻、需要手动 VNC 帮助或完成时，向操作员 Discord 频道发布简明状态。

## 非目标

- Mantis 不是单元测试的替代品。在理解修复后，Mantis 运行通常应变为一个更小的回归测试。
- Mantis 不是正常的快速 CI 门控。它速度较慢，使用实时凭据，并保留给实时环境很重要的错误。
- Mantis 在正常运行中不应需要人工干预。手动 VNC 是救援路径，而非理想路径。
- Mantis 不会在产物、日志、屏幕截图、Markdown 报告或 PR 评论中存储原始机密信息。

## 所有权

Mantis 位于 OpenClaw QA 技术栈中。

- OpenClaw 拥有场景运行时、传输适配器、证据模式以及 `pnpm openclaw qa mantis` 下的本地 CLI。
- QA Lab 拥有实时传输测试装置组件、浏览器捕获辅助工具和产物写入器。
- 当需要远程 VM 时，Crabbox 拥有预热好的 Linux 机器。
- GitHub Actions 拥有远程工作流入口点和产物保留策略。
- ClawSweeper 负责 GitHub 评论路由：解析维护者命令、分发工作流以及发布最终的 PR 评论。
- 当场景需要代理设置、调试或卡死状态报告时，OpenClaw 代理会通过 Codex 驱动 Mantis。

这个边界将传输知识保留在 OpenClaw 中，将机器调度保留在 Crabbox 中，并将维护者工作流粘合逻辑保留在 ClawSweeper 中。

## 命令形态

第一个本地命令会验证 Discord 机器人、服务器、渠道、消息发送、反应发送和产物路径：

```bash
pnpm openclaw qa mantis discord-smoke \
  --output-dir .artifacts/qa-e2e/mantis/discord-smoke
```

本地的前后运行器接受以下形态：

```bash
pnpm openclaw qa mantis run \
  --transport discord \
  --scenario discord-status-reactions-tool-only \
  --baseline origin/main \
  --candidate HEAD \
  --output-dir .artifacts/qa-e2e/mantis/local-discord-status-reactions
```

运行器在输出目录下创建分离的基线和候选工作树，安装依赖项，构建每个引用，使用 `--allow-failures` 运行场景，然后写入 `baseline/`、`candidate/`、`comparison.json` 和 `mantis-report.md`。对于第一个 Discord 场景，成功的验证意味着基线状态为 `fail`，候选状态为 `pass`。

第二个 Discord 前后探针针对线程附件：

```bash
pnpm openclaw qa mantis run \
  --transport discord \
  --scenario discord-thread-reply-filepath-attachment \
  --baseline <bug-ref> \
  --candidate <fix-ref> \
  --output-dir .artifacts/qa-e2e/mantis/local-discord-thread-attachment
```

该场景使用驱动程序机器人发布父消息，创建一个真实的 Discord 线程，使用仓库本地的 `filePath` 调用 OpenClaw 的 `message.thread-reply` 动作，然后轮询线程以获取 SUT 回复和附件文件名。基线截图显示没有附件的回复；候选截图显示预期的 `mantis-thread-report.md` 附件。

第一个 VM/浏览器 原语是桌面冒烟测试：

```bash
pnpm openclaw qa mantis desktop-browser-smoke \
  --output-dir .artifacts/qa-e2e/mantis/desktop-browser
```

它会租用或重用一台 Crabbox 桌面机器，在 VNC 会话中启动一个可见的浏览器，捕获桌面内容，将构件拉取回本地输出目录，并将重连命令写入报告中。该命令默认使用 Hetzner 提供商，因为它是 Mantis 通道中第一个具备可用桌面/VNC 覆盖范围的服务商。在针对其他 Crabbox 集群运行时，可以使用 `--provider`、`--crabbox-bin` 或 `OPENCLAW_MANTIS_CRABBOX_PROVIDER` 进行覆盖。

有用的桌面冒烟测试标志：

- `--lease-id <cbx_...>` 或 `OPENCLAW_MANTIS_CRABBOX_LEASE_ID` 会重用一个已预热的桌面。
- `--browser-url <url>` 会更改可见浏览器中打开的页面。
- `--html-file <path>` 会在可见浏览器中渲染一个仓库本地的 HTML 构件。Mantis 使用此功能通过真实的 Crabbox 桌面来捕获生成的 Discord 状态-反应时间线。
- `--browser-profile-dir <remote-path>` 会重用远程的 Chrome user-data-dir，以便持久的 Mantis 桌面在运行之间保持登录状态。请将其用于长期运行的 Discord Web 查看器配置文件。
- `--browser-profile-archive-env <name>` 会在启动浏览器之前，从指定的环境变量中恢复一个 base64 `.tgz` Chrome user-data-dir 归档文件。请将其用于已登录的见证者（如 Discord Web）。默认的环境变量是 `OPENCLAW_MANTIS_BROWSER_PROFILE_TGZ_B64`。
- `--video-duration <seconds>` 控制 MP4 捕获时长。对于需要时间稳定下来的已登录慢速 Web 应用，请使用更长的持续时间。
- `--keep-lease` 或 `OPENCLAW_MANTIS_KEEP_VM=1` 会保持新创建的通过租约开放，以便进行 VNC 检查。失败的运行在创建租约的情况下默认会保留该租约，以便操作员可以重新连接。
- `--class`、`--idle-timeout` 和 `--ttl` 用于调整机器大小和租约生命周期。

对于 Discord Web 证据，Mantis 使用专用的查看者帐户而不是机器人令牌。实时的 Discord API 场景仍是预言机：它创建真实线程，发送 SUT DiscordDiscordAPI`thread-reply`Discord，并通过 Discord REST 检查附件。当设置 `OPENCLAW_QA_DISCORD_CAPTURE_UI_METADATA=1`Discord 时，场景还会写入 Discord Web URL 构件。当设置 `OPENCLAW_QA_DISCORD_KEEP_THREADS=1` 时，它会将该线程保留足够长的时间，以便已登录的浏览器打开并录制它。

GitHub 工作流在 Discord Web 中打开候选线程 URL，捕获截图，录制 MP4，并在 Crabbox 媒体工具可用时生成裁剪的 GIF 预览。首选通过 GitHubDiscord`MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR`GitHub 配置的持久查看者配置文件路径，因为完整的 Chrome 配置文件归档可能会超过 GitHub 的密钥大小限制。对于小型/引导配置文件，工作流还可以从 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64`Discord 恢复 base64 `.tgz` 归档。如果未配置任何配置文件源，工作流仍会发布确定的基线/候选附件截图，并记录一条通知，说明已登录的 Discord Web 见证被跳过。

第一个完整的桌面传输原语是 Slack 桌面冒烟测试：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --output-dir .artifacts/qa-e2e/mantis/slack-desktop \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

它租用或重用 Crabbox 桌面机器，将当前检出同步到 VM 中，在该 VM 内运行 `pnpm openclaw qa slack`SlackSlackOpenClawLinux，在 VNC 浏览器中打开 Slack Web，捕获可见桌面，并将 Slack QA 构件和 VNC 截图复制回本地输出目录。这是 SUT OpenClaw 网关和浏览器都位于同一个 Linux 桌面 VM 中的第一个 Mantis 形状。

使用 `--gateway-setup` 时，该命令会在 `$HOME/.openclaw-mantis/slack-openclaw` 准备一个持久的临时 OpenClaw 主目录，为所选渠道修补 Slack Socket 模式配置，在端口 `38973` 上启动 `openclaw gateway run`，并让 Chrome 在 VNC 会话中保持运行。这是“给我留一个运行着 Linux 和 claw 的 Slack 桌面”模式；当省略 `--gateway-setup` 时，bot-to-bot Slack QA 通道仍然是默认模式。

`--credential-source env` 的必需输入：

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`
- 远程模型通道的 `OPENCLAW_LIVE_OPENAI_KEY`。如果仅在本地设置了 `OPENAI_API_KEY`，Mantis 会在调用 Crabbox 之前将其映射到 `OPENCLAW_LIVE_OPENAI_KEY`，以便 Crabbox 的 `OPENCLAW_*` 环境变量转发能将其带入虚拟机。

使用 `--gateway-setup --credential-source convex` 时，Mantis 会在创建虚拟机之前从共享池租用 Slack SUT 凭据，并将租用的渠道 ID、Socket 模式应用令牌和机器人令牌作为桌面内的 `OPENCLAW_MANTIS_SLACK_*` 运行时环境转发。这使得 GitHub 工作流保持精简：它们只需要 Convex broker 密钥，而不需要原始的 Slack 机器人或应用令牌。

有用的 Slack 桌面标志：

- `--lease-id <cbx_...>` 针对操作员已通过 VNC 登录到 Slack Web 的机器重新运行。
- `--gateway-setup` 在虚拟机中启动一个持久的 OpenClaw Slack 网关，而不是仅运行 bot-to-bot QA 通道。
- `--keep-lease` 在成功后保持网关虚拟机打开以供 VNC 检查；`--no-keep-lease` 在收集产物后将其停止。
- `--slack-url <url>`Slack 打开特定的 Slack Web URL。如果没有它，当 SUT 机器人令牌可用时，Mantis 会从 Slack `auth.test` 推导出 `https://app.slack.com/client/<team>/<channel>`Slack。
- `--slack-channel-id <id>`Slack 控制网关设置使用的 Slack 渠道允许列表。
- `OPENCLAW_MANTIS_SLACK_BROWSER_PROFILE_DIR` 控制虚拟机 (VM) 内的持久化 Chrome 配置文件。默认值为 `$HOME/.config/openclaw-mantis/slack-chrome-profile`Slack，因此手动 Slack Web 登录在同一租约上的重新运行中得以保留。
- `--credential-source convex --credential-role ci`Slack 使用共享凭据池，而不是直接的 Slack 环境令牌。
- `--provider-mode`、`--model`、`--alt-model` 和 `--fast`Slack 传递给 Slack 实时通道。

批准检查点运行将 Slack API 消息快照渲染为检查点 PNG，以用于 CI 安全的可视化证明。SlackAPI`slack-desktop-smoke.png`Slack 仅在租约使用已登录的热浏览器配置文件时，才是 Slack Web 的证明。

GitHub 冒烟工作流是 GitHub`Mantis Discord Smoke`GitHub。第一个真实场景的 GitHub 前后工作流是 `Mantis Discord Status Reactions`。它接受：

- `baseline_ref`：预期重现仅排队行为的 ref。
- `candidate_ref`：预期显示 `queued -> thinking -> done` 的 ref。

它会检出工作流 harness ref，构建单独的基线和候选工作树，针对每个工作树运行 `discord-status-reactions-tool-only`，并将 `baseline/`、`candidate/`、`comparison.json` 和 `mantis-report.md` 作为 Actions 制品上传。它还在 Crabbox 桌面浏览器中渲染每个通道的时间轴 HTML，并将这些 VNC 截图与确定性时间轴 PNG 一起发布在 PR 评论中。同一条 PR 评论还嵌入了由 `crabbox media preview`CLI 生成的轻量级动作修剪 GIF 预览，链接到匹配的动作修剪 MP4 片段，并保留完整的桌面 MP4 文件以供深入检查。截图保持内联以便快速审阅。该工作流从 `openclaw/crabbox` main 构建 Crabbox CLI，以便在下一个 Crabbox 二进制版本发布之前使用当前的桌面/浏览器租约标志。

`Mantis Scenario` 是通用手动入口点。它接受 `scenario_id`、`candidate_ref`、可选的 `baseline_ref` 和可选的 `pr_number`，然后分派场景拥有的工作流。该包装器故意保持精简：场景工作流仍然拥有其传输设置、凭据、VM 类、预期预言机和制品清单。

`Mantis Slack Desktop Smoke`SlackLinux 是第一个 Slack VM 工作流。它在独立的工作树中检出受信任的候选 ref，租用一个 Crabbox Linux 桌面，对该候选运行 `pnpm openclaw qa mantis slack-desktop-smoke --gateway-setup`Slack，在 VNC 浏览器中打开 Slack Web，录制桌面，使用 `crabbox media preview`HetznerLinuxSlackSlack 生成动态裁剪的预览，上传完整构件目录，并可选择在目标 PR 上发布内联证据评论。它默认使用 AWS 进行桌面租用，并公开手动提供商输入，以便操作员在 AWS 容量缓慢或不可用时切换到 Hetzner。当您想要“一台运行着 Slack 和 claw 的 Linux 桌面”而不仅仅是机器人对机器人的 Slack 脚本时，请使用此通道。

`Mantis Telegram Live`Telegram 将现有的 Telegram 实时 QA 通道封装在同一 PR 证据管道中。它在独立的工作树中检出受信任的候选 ref，运行 `pnpm openclaw qa telegram --credential-source convex
--credential-role ci`, writes a `Telegrammantis-evidence.` 清单，该清单来自 Telegram QA 摘要和观察消息构件，通过 Crabbox 桌面浏览器呈现经过编辑的脚本 HTML，使用 `crabbox media preview`TelegramTelegramAPITelegram 生成动态裁剪的 GIF，并在有 PR 编号时发布内联 PR 证据评论。此通道是脚本可视化的，而不是已登录的 Telegram Web 证明：Telegram Bot API 提供稳定的实时消息证据，但正常 Mantis 自动化不需要 Telegram Web 登录状态。

`Mantis Telegram Desktop Proof`Telegram 是用于原生 Telegram Desktop
的前后对比封装代理。维护者可以通过 PR 评论中的
`@openclaw-mantis telegram desktop proof`、Actions UI 中的自由格式说明，或通过通用的
`Mantis Scenario`TelegramTelegram 调度器来触发它。该工作流将 PR、基线引用（ref）、候选引用（ref）以及维护者的说明传递给 Codex。
该代理阅读 PR，决定哪种 Telegram 可见的行为可以证明
更改，针对基线和候选运行真实的用户 Crabbox Telegram Desktop 证明通道，迭代直到原生 GIF 有用，将成对的
`motionPreview` 制品写入 `mantis-evidence.json`，上传该捆绑包，并在有 PR 编号时发布两列的 PR 证据表。

对于人在回路（human-in-the-loop）的 Telegram 桌面设置，请使用场景构建器：

```bash
pnpm openclaw qa mantis telegram-desktop-builder \
  --credential-source convex \
  --credential-role maintainer \
  --keep-lease
```

构建器会租用或重用 Crabbox 桌面，安装原生 Linux
Telegram Desktop 二进制文件，可选地恢复用户会话存档，使用租用的 Telegram SUT bot 令牌配置
OpenClaw，在端口 `38974`LinuxTelegramOpenClaw 上启动 TelegramTelegramOpenClawTelegram`openclaw gateway run`，
将驱动 bot 就绪消息发布到租用的私有组，然后从可见的 VNC 桌面捕获截图和 MP4。Bot
令牌从不用于登录 Telegram Desktop；它仅用于配置 OpenClaw。桌面
查看器是从 `--telegram-profile-archive-env <name>` 恢复的独立 Telegram 用户会话，
或者是通过 VNC 手动创建并使用 `--keep-lease` 保持活跃的。

有用的 Telegram 桌面构建器标志：

- `--lease-id <cbx_...>`Telegram 在操作员已登录 Telegram Desktop 的 VM 上重新运行。
- `--telegram-profile-archive-env <name>` 从该环境变量读取 base64 `.tgz`Telegram Telegram Desktop 档案存档并在启动前恢复它。
- `--telegram-profile-dir <remote-path>`Telegram 控制远程 Telegram Desktop 配置文件目录。默认值为 `$HOME/.local/share/TelegramDesktop`。
- `--no-gateway-setup`TelegramOpenClaw 安装并打开 Telegram Desktop，且不配置 OpenClaw。
- `--credential-source convex --credential-role ci`Telegram 使用共享凭证代理，而不是直接的 Telegram 环境令牌。

每个发布 PR 的场景都会在其报告旁边写入 `mantis-evidence.json`GitHub。
该架构是场景代码与 GitHub 评论之间的交接点：

```json
{
  "schemaVersion": 1,
  "id": "discord-status-reactions",
  "title": "Mantis Discord Status Reactions QA",
  "summary": "Human-readable top summary for the PR comment.",
  "scenario": "discord-status-reactions-tool-only",
  "comparison": {
    "baseline": { "sha": "...", "status": "fail", "expected": "queued-only" },
    "candidate": { "sha": "...", "status": "pass", "expected": "queued -> thinking -> done" },
    "pass": true
  },
  "artifacts": [
    {
      "kind": "timeline",
      "lane": "baseline",
      "label": "Baseline queued-only",
      "path": "baseline/timeline.png",
      "targetPath": "baseline.png",
      "alt": "Baseline Discord timeline",
      "width": 420
    }
  ]
}
```

Artifact `path` 值是相对于清单目录的路径。`targetPath`
值是配置的 Mantis R2/S3 artifact 前缀下的相对路径。
发布器会拒绝路径遍历，并在可选预览或视频不可用时跳过标记为 `"required": false`
的条目。

支持的 artifact 类型：

- `timeline`：确定性的场景截图，通常为修改前后。
- `desktopScreenshot`：VNC/浏览器桌面截图。
- `motionPreview`：从桌面录制生成的内联动画 GIF。
- `motionClip`：经过运动裁剪的 MP4，移除了静态的开头和结尾。
- `fullVideo`：用于深度检查的完整 MP4 录制。
- `metadata`：JSON/日志附属文件。
- `report`：Markdown 报告。

可复用的发布器是 `scripts/mantis/publish-pr-evidence.mjs`。工作流
使用清单、目标 PR、artifact 目标根目录、评论标记、
Actions artifact URL、运行 URL 和请求源来调用它。它将声明的 artifacts
上传到配置的 Mantis R2/S3 存储桶，构建一个摘要优先的 PR 评论，
其中包含内联图像/预览和链接视频，然后更新现有的标记
评论或创建一个新评论。工作流发布到 `openclaw-crabbox-artifacts`
，公共 URL 位于 `https://artifacts.openclaw.ai` 下。它们直接提供存储桶、
区域和公共 URL 值。可复用的发布器需要：

- `MANTIS_ARTIFACT_R2_ACCESS_KEY_ID`
- `MANTIS_ARTIFACT_R2_SECRET_ACCESS_KEY`
- `MANTIS_ARTIFACT_R2_BUCKET`
- `MANTIS_ARTIFACT_R2_ENDPOINT`
- `MANTIS_ARTIFACT_R2_REGION`
- `MANTIS_ARTIFACT_R2_PUBLIC_BASE_URL`

您也可以直接从 PR 评论触发状态反应运行：

```text
@openclaw-mantis discord status reactions
```

评论触发器是有意限制得很窄的。它只对具有写入、维护者或管理员权限的用户的 PR 评论运行，并且只识别 Discord 状态反应请求。默认情况下，它使用已知的错误基准 ref 和当前的 PR head SHA 作为候选项。维护者可以覆盖任一 ref：

```text
@openclaw-mantis discord status reactions baseline=origin/main candidate=HEAD
```

Telegram 实时 QA 也可以从 PR 评论触发：

```text
@openclaw-mantis telegram
@openclaw-mantis telegram scenario=telegram-status-command
@openclaw-mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

默认情况下，它使用当前的 PR head SHA 作为候选项并运行 `telegram-status-command`。维护者可以在需要特定 ref 或预热的 Crabbox 桌面时覆盖 `candidate=...`、`provider=aws|hetzner` 和 `lease=<cbx_...>`。

ClawSweeper 命令示例：

```text
@clawsweeper mantis discord discord-status-reactions-tool-only
@clawsweeper verify e2e discord
```

第一条命令是明确的且专注于场景。第二条命令随后可以将 PR 或问题映射到推荐的 Mantis 场景，这些场景来自标签、更改的文件和 ClawSweeper 审查发现。

## 运行生命周期

1. 获取凭据。
2. 分配或重用虚拟机。
3. 当场景需要 UI 证据时，准备桌面/浏览器配置文件。
4. 为基准 ref 准备一个干净的检出。
5. 安装依赖项并仅构建场景所需的内容。
6. 启动一个带有隔离状态目录的子 OpenClaw Gateway(网关)。
7. 配置实时传输、提供商、模型和浏览器配置文件。
8. 运行场景并捕获基准证据。
9. 停止网关并保留日志。
10. 在同一虚拟机中准备候选项 ref。
11. 运行相同的场景并捕获候选项证据。
12. 比较预言机结果和视觉证据。
13. 写入 Markdown、JSON、日志、屏幕截图和可选的 trace 工件。
14. 上传 GitHub Actions 工件。
15. 发布简洁的 PR 或 Discord 状态消息。

场景应该能够以两种不同的方式失败：

- **Bug 复现**：基准以预期方式失败。
- **工具失败**：环境设置、凭据、Discord API、浏览器或
  提供商在 Bug 预言机变得有意义之前失败。

最终报告必须区分这些情况，以免维护者将不稳定的环境与产品行为混淆。

## Discord MVP

第一个场景应以公会频道中的 Discord 状态反应为目标，其中源回复传递模式为 `message_tool_only`。

为什么它是 Mantis 的一个良好种子：

- 它在 Discord 中作为触发消息的反应是可见的。
- 它通过 Discord 消息反应状态拥有强大的 REST 预言机（oracle）。
- 它演练了一个真实的 OpenClaw Gateway(网关)、Discord 机器人授权、消息分发、源回复传递模式、状态反应状态以及模型轮次生命周期。
- 它的范围足够狭窄，可以确保初次实现的诚实性。

预期的场景形态：

```yaml
id: discord-status-reactions-tool-only
transport: discord
baseline:
  expect:
    reproduced: true
candidate:
  expect:
    fixed: true
config:
  messages:
    ackReaction: "👀"
    ackReactionScope: "group-mentions"
    groupChat:
      visibleReplies: "message_tool"
    statusReactions:
      enabled: true
      timing:
        debounceMs: 0
discord:
  requireMention: true
  notifyChannel: operator-notify
evidence:
  rest:
    messageReactions: true
  browser:
    screenshotMessageRow: true
```

基线证据应显示已排队的确认反应，但在仅工具模式下没有生命周期转换。候选证据应显示当 `messages.statusReactions.enabled` 显式为 true 时正在运行的生命周期状态反应。

可执行的第一个切片是可选加入的 Discord 实时 QA 场景：

```bash
pnpm openclaw qa discord \
  --scenario discord-status-reactions-tool-only \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --fast \
  --output-dir .artifacts/qa-e2e/mantis/discord-status-reactions-candidate
```

它使用始终开启的公会处理、`visibleReplies:
"message_tool"`, `ackReaction: "👀"` 和显式状态反应来配置 SUT。预言机轮询真实的 Discord 触发消息并期望观察到的序列 `👀 -> 🤔 -> 👍`。产物包括 `discord-qa-reaction-timelines.json`、
`discord-status-reactions-tool-only-timeline.html` 和
`discord-status-reactions-tool-only-timeline.png`。

## 现有的 QA 组件

Mantis 应建立在现有的私有 QA 栈之上，而不是从零开始：

- `pnpm openclaw qa discord` 已经运行了一个带有驱动程序和 SUT 机器人的实时 Discord 通道。
- 实时传输运行程序已经在 `.artifacts/qa-e2e/` 下写入报告和观察到的消息产物。
- Convex 凭证租约已经提供了对共享实时传输凭证的独占访问。
- 浏览器控制服务已经支持截图、快照、无头托管配置文件和远程 CDP 配置文件。
- QA Lab 已经具有用于传输型测试的调试器 UI 和总线。

第一个 Mantis 实现可以是一个基于这些组件的简单前后运行器，外加一个可视化证据层。

## 证据模型

每次运行都会写入一个稳定的构件目录：

```text
.artifacts/qa-e2e/mantis/<run-id>/
  mantis-report.md
  mantis-summary.json
  baseline/
    summary.json
    discord-message.json
    screenshot-message-row.png
    gateway-debug/
  candidate/
    summary.json
    discord-message.json
    screenshot-message-row.png
    gateway-debug/
  comparison.json
  run.log
```

`mantis-summary.json` 应该是机器可读的真实来源。Markdown 报告用于 PR 评论和人工审查。

摘要必须包括：

- 已测试的 refs 和 SHAs
- 传输方式和 scenario id
- 机器提供商和机器 id 或租约 id
- 不含密钥值的凭证来源
- 基线结果
- 候选结果
- bug 是否在基线上复现
- 候选版本是否修复了它
- 构件路径
- 经过清理的设置或清理问题

截图是证据，不是机密。它们仍需遵守编辑纪律：可能会出现私有渠道名称、用户名或消息内容。对于公开 PR，在编辑功能更强大之前，请优先使用 GitHub Actions 构件链接而非内联图片。

## 浏览器和 VNC

浏览器通道有两种模式：

- **无头自动化**：CI 的默认模式。Chrome 在启用 CDP 的情况下运行，Playwright 或 OpenClaw 浏览器控制程序会捕获截图。
- **VNC 救援**：当登录、MFA、Discord 反自动化或视觉调试需要人工干预时，在同一 VM 上启用。

Discord 观察者浏览器配置文件应具有足够的持久性，以避免每次运行都登录，但应与个人浏览器状态隔离。配置文件属于 Mantis 机器池，而不属于开发人员的笔记本电脑。

当 Mantis 卡住时，它会发布一条 Discord 状态消息，其中包含：

- run id
- scenario id
- 机器提供商
- 构件目录
- VNC 或 noVNC 连接说明（如果可用）
- 简短的阻塞程序文本

首次私有部署可以将这些消息发送到现有的操作员渠道，然后再移动到专用的 Mantis 渠道。

## 机器

对于第一次远程实现，Mantis 应优先通过 Crabbox 使用 AWS。Crabbox 为我们提供预热机器、租约跟踪、水合、日志、结果和清理功能。如果 AWS 容量太慢或不可用，请在相同的机器接口后添加 Hetzner 提供商。

最低 VM 要求：

- 安装了支持桌面的 Chrome 或 Chromium 的 Linux
- 用于浏览器自动化的 CDP 访问权限
- 用于救援的 VNC 或 noVNC
- Node 22 和 pnpm
- OpenClaw 检出和依赖缓存
- 使用 Playwright 时的 Playwright Chromium 浏览器缓存
- 足够的 CPU 和内存，用于运行一个 OpenClaw Gateway(网关)、一个浏览器和一个模型
- 对 Discord、GitHub、模型提供商和凭证经纪商的出站访问

虚拟机不应在预期的凭证或浏览器配置文件存储之外保留长期存在的原始机密。

## 机密

对于远程运行，机密存在于 GitHub 组织或仓库机密中；对于本地运行，则存在于本地操作员控制的机密文件中。

推荐的机密名称：

- `OPENCLAW_QA_DISCORD_MANTIS_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_NOTIFY_CHANNEL_ID`
- `OPENCLAW_QA_REDACT_PUBLIC_METADATA=1`GitHub 用于公共 GitHub 工件上传
- `OPENCLAW_QA_CONVEX_SITE_URL`
- `OPENCLAW_QA_CONVEX_SECRET_CI`
- `OPENCLAW_QA_MANTIS_CRABBOX_COORDINATOR`
- `OPENCLAW_QA_MANTIS_CRABBOX_COORDINATOR_TOKEN`

从长远来看，Convex 凭证池应该仍然是实时传输凭证的正常来源。GitHub 机密用于引导经纪商和备用渠道。Discord 状态反应工作流将 Mantis Crabbox 机密映射回 Crabbox CLI 所期望的 GitHubDiscord`CRABBOX_COORDINATOR` 和 `CRABBOX_COORDINATOR_TOKEN`CLI 环境变量。普通的 `CRABBOX_*`GitHub GitHub 机密名称作为兼容性回退方案仍然被接受。

Mantis 运行器绝不能打印：

- Discord 机器人令牌
- 提供商 API 密钥
- 浏览器 Cookie
- 身份验证配置文件内容
- VNC 密码
- 原始凭证负载

公共工件上传还应编辑 Discord 目标元数据，例如机器人、公会、渠道和消息 ID。GitHub 冒烟测试工作流启用 DiscordGitHub`OPENCLAW_QA_REDACT_PUBLIC_METADATA=1` 即出于此原因。

如果令牌被意外粘贴到 issue、PR、聊天或日志中，请在存储新密钥后轮换该令牌。

## GitHub 构件和 PR 评论

Mantis 工作流应将完整的证据包作为短期的 Actions 构件上传。当工作流针对错误报告或修复 PR 运行时，它还应将经过编辑处理的内联媒体发布到配置的 Mantis R2/S3 存储桶，并在该错误或修复 PR 上更新一条包含内联修复前/后截图的评论。不要仅通过通用的 QA 自动化 PR 来发布主要证明。原始日志、观察到的消息和其他臃肿的证据保留在 Actions 构件中。

生产工作流应使用 Mantis GitHub App 发布这些评论，而不是使用 `github-actions[bot]`。将应用 ID 和私钥存储为 `MANTIS_GITHUB_APP_ID` 和 `MANTIS_GITHUB_APP_PRIVATE_KEY` GitHub Actions 机密。工作流使用隐藏标记作为更新键，当令牌可以编辑该评论时更新它，并在无法编辑较旧的机器人拥有的标记时创建新的 Mantis 拥有的评论。

PR 评论应简短且直观：

```md
Mantis Discord Status Reactions QA

Summary: Mantis reran the reported Discord status-reaction bug against the known
bad baseline and the candidate fix. The baseline reproduced the bug, while the
candidate showed the expected queued -> thinking -> done sequence.

- Scenario: `discord-status-reactions-tool-only`
- Run: <workflow run link>
- Artifact: <artifact link>
- Baseline: `<status>` at `<sha>`
- Candidate: `<status>` at `<sha>`

| Baseline            | Candidate           |
| ------------------- | ------------------- |
| <inline screenshot> | <inline screenshot> |
```

当运行因测试框架失败而失败时，评论必须说明这一点，而不是暗示候选版本失败。

## 私有部署说明

私有部署可能已经有一个 Mantis Discord 应用程序。如果该应用程序具有正确的机器人权限并且可以安全轮换，请重用它而不是创建另一个应用程序。

通过机密或部署配置设置初始操作员通知渠道。它可以首先指向现有的维护者或操作渠道，然后在存在专用 Mantis 渠道后移动到该渠道。

不要将公会 ID、渠道 ID、机器人令牌、浏览器 cookie 或 VNC 密码放在此文档中。将它们存储在 GitHub 机密、凭证代理或操作员的本地机密存储中。

## 添加场景

Mantis 场景应声明：

- id 和 title
- 传输
- 所需凭证
- 基准参考策略
- 候选参考策略
- OpenClaw 配置补丁
- 设置步骤
- 刺激
- 预期基准预言机
- 预期候选预言机
- 视觉捕获目标
- 超时预算
- 清理步骤

场景应首选小型、类型化的预言机：

- Discord 反应状态，用于反应类 Bug
- Discord 消息引用，用于线程类 Bug
- Slack 线程时间戳和反应 API 状态，用于 Slack Bug
- 电子邮件消息 ID 和标头，用于邮件 Bug
- 当 UI 是唯一可靠的观察对象时，进行浏览器截图

视觉检查应该是累加的。如果平台 API 可以证明该 Bug，请将该 API 作为通过/失败的预言机，并保留截图以供人工确认。

## 提供商扩展

在 Discord 之后，同一个运行器可以添加：

- Slack：反应、线程、应用提及、模态框、文件上传。
- Email：在连接器不足时，使用 `gog` 进行 Gmail 身份验证和消息线程处理。
- WhatsApp：二维码登录、重新识别、消息投递、媒体、反应。
- Telegram：群组提及门控、命令以及可用时的反应。
- Matrix：加密房间、线程或回复关系、重启恢复。

每种传输方式都应该有一个廉价的冒烟测试场景和一个或多个 Bug 类场景。昂贵的视觉场景应保持可选加入。

## 未解决问题

- 当重用现有的 Mantis 机器人时，哪个 Discord 机器人应该是驱动程序，哪个应该是被测系统 (SUT)？
- 观察者浏览器登录应该使用人工 Discord 账户、测试账户，还是在第一阶段仅使用机器人可读的 REST 证据？
- GitHub 应该为 PR 保留 Mantis 制品多长时间？
- ClawSweeper 何时应该自动推荐 Mantis，而不是等待维护者命令？
- 在上传公开 PR 的截图之前，是否应该对其进行编辑或裁剪？
