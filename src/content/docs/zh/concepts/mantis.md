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

GitHub 冒烟工作流是 GitHub`Mantis Discord Smoke`GitHub。第一个真实场景的前后 GitHub 工作流是 `Mantis Discord Status Reactions`。它接受：

- `baseline_ref`：预期重现仅排队行为的 ref。
- `candidate_ref`：预期显示 `queued -> thinking -> done` 的 ref。

它检出工作流程序 ref，构建独立的基线和候选工作树，对每个工作树运行 `discord-status-reactions-tool-only`，并将 `baseline/`、`candidate/`、`comparison.json` 和 `mantis-report.md` 作为 Actions 制品上传。它还在 Crabbox 桌面浏览器中呈现每个通道的时间轴 HTML，并将这些 VNC 截图与 PR 评论中确定性的时间轴 PNG 一起发布。同一条 PR 评论还嵌入了由 `crabbox media preview`CLI 生成的轻量级动作修剪 GIF 预览，链接到匹配的动作修剪 MP4 片段，并保留完整的桌面 MP4 文件以供深入检查。截图保持内联以便快速审阅。该工作流从 `openclaw/crabbox` main 构建 Crabbox CLI，以便在下一个 Crabbox 二进制版本发布之前使用当前的桌面/浏览器租约标志。

`Mantis Scenario` 是通用的手动入口点。它接受一个 `scenario_id`、
`candidate_ref`、可选的 `baseline_ref` 和可选的 `pr_number`，然后
调度场景所拥有的工作流。该包装器故意设计得很薄：
场景工作流仍然拥有其传输设置、凭据、VM 类、
预期的预言机和工件清单。

`Mantis Slack Desktop Smoke`SlackLinux 是第一个 Slack VM 工作流。它在单独的
工作树中检出任信的候选引用，租用一个 Crabbox Linux 桌面，
针对该候选运行 `pnpm openclaw qa mantis slack-desktop-smoke --gateway-setup`Slack，在 VNC 浏览器中打开 Slack Web，录制桌面，使用 `crabbox media preview`HetznerLinuxSlackSlack 生成
运动裁剪预览，上传完整的工件
目录，并可选择在目标 PR 上发布内联证据评论。
它默认使用 AWS 进行桌面租用，并公开手动提供商输入，以便
操作员在 AWS 容量缓慢或不可用时切换到 Hetzner。当您想要
“一台运行着 Slack 和 claw 的 Linux 桌面”
而不仅仅是机器人对机器人的 Slack 脚本时，请使用此通道。

`Mantis Telegram Live`Telegram 将现有的 Telegram 实时 QA 通道封装在同一个 PR
证据管道中。它在单独的
工作树中检出任信的候选引用，运行 `pnpm openclaw qa telegram --credential-source convex
--credential-role ci`, writes a `Telegrammantis-evidence.` 清单，该清单来自
Telegram QA 摘要和观察到的消息工件，通过 Crabbox 桌面浏览器
渲染编辑后的脚本 HTML，使用 `crabbox media preview`TelegramTelegramAPITelegram 生成
运动裁剪的 GIF，并在 PR
编号可用时发布内联 PR 证据评论。此通道是脚本可视化的，而不是
登录状态的 Telegram Web 证明：Telegram Bot API 提供稳定的实时消息证据，但
Telegram Web 登录状态对于正常的 Mantis 自动化
并不是必需的。

对于人机协同的 Telegram 桌面设置，请使用场景构建器：

```bash
pnpm openclaw qa mantis telegram-desktop-builder \
  --credential-source convex \
  --credential-role maintainer \
  --keep-lease
```

构建器会租用或复用 Crabbox 桌面，安装原生的 Linux Telegram Desktop 二进制文件，可选择恢复用户会话存档，使用租用的 Telegram SUT 机器人令牌配置 OpenClaw，在端口 LinuxTelegramOpenClawTelegram`openclaw gateway run`TelegramOpenClawTelegram`38974` 上启动 `openclaw gateway run`，向租用的私有群组发布驱动机器人就绪消息，然后从可见的 VNC 桌面捕获截图和 MP4。机器人令牌从不登录 Telegram Desktop；它仅配置 OpenClaw。桌面查看器是从 `--telegram-profile-archive-env <name>` 恢复的单独 Telegram 用户会话，或者是通过 VNC 手动创建并使用 `--keep-lease` 保持活动状态的会话。

有用的 Telegram 桌面构建器标志：

- `--lease-id <cbx_...>`Telegram 在操作员已登录 Telegram Desktop 的虚拟机上重新运行。
- `--telegram-profile-archive-env <name>` 从该环境变量读取 base64 `.tgz`Telegram Telegram Desktop 配置文件存档，并在启动前将其恢复。
- `--telegram-profile-dir <remote-path>`Telegram 控制远程 Telegram Desktop 配置文件目录。默认为 `$HOME/.local/share/TelegramDesktop`。
- `--no-gateway-setup`TelegramOpenClaw 安装并打开 Telegram Desktop 而不配置 OpenClaw。
- `--credential-source convex --credential-role ci`Telegram 使用共享凭据代理，而不是直接的 Telegram 环境变量令牌。

每个发布 PR 的场景都会在其报告旁边写入 `mantis-evidence.json`GitHub。
此模式是场景代码与 GitHub 评论之间的交接：

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

Artifact `path` 值是相对于清单目录的。`targetPath`
值是 `qa-artifacts` 分支发布目录下的相对路径。
发布器会拒绝路径遍历，并在可选预览或视频不可用时跳过标记为
`"required": false` 的条目。

支持的工件种类：

- `timeline`：确定性场景截图，通常是修复前后对比。
- `desktopScreenshot`：VNC/浏览器桌面截图。
- `motionPreview`：从桌面录像生成的内联动画 GIF。
- `motionClip`：经过运动裁剪的 MP4，移除了静态的开头和结尾。
- `fullVideo`：用于深度检查的完整 MP4 录像。
- `metadata`：JSON/日志侧车文件。
- `report`：Markdown 报告。

可重用的发布器是 `scripts/mantis/publish-pr-evidence.mjs`。工作流
使用清单、目标 PR、`qa-artifacts` 目标根目录、评论标记、
Actions 工件 URL、运行 URL 和请求源来调用它。它会将声明的工件
复制到 `qa-artifacts` 分支，构建一个摘要优先的 PR 评论，其中包含内联
图像/预览和链接视频，然后更新现有的标记评论或
创建一个新评论。

您也可以直接从 PR 评论触发状态响应运行：

```text
@Mantis discord status reactions
```

评论触发器的范围是有意限制的。它仅对具有写入、维护或管理员权限的用户
在 PR 评论中运行，并且仅识别
Discord 状态响应请求。默认情况下，它使用已知的不良基线引用
和当前的 PR 头部 SHA 作为候选。维护者可以覆盖任一
引用：

```text
@Mantis discord status reactions baseline=origin/main candidate=HEAD
```

Telegram 实时 QA 也可以从 PR 评论触发：

```text
@Mantis telegram
@Mantis telegram scenario=telegram-status-command
@Mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

默认情况下，它使用当前的 PR 头部 SHA 作为候选并运行
`telegram-status-command`。维护者可以覆盖 `candidate=...`、
`provider=aws|hetzner` 和 `lease=<cbx_...>`，当他们需要特定的引用或
预热过的 Crabbox 桌面时。

ClawSweeper 命令示例：

```text
@clawsweeper mantis discord discord-status-reactions-tool-only
@clawsweeper verify e2e discord
```

第一个命令是明确的且专注于场景的。第二个命令稍后可以将 PR 或 issue 映射到从标签、更改的文件和 ClawSweeper 审查结果中推荐的 Mantis 场景。

## 运行生命周期

1. 获取凭证。
2. 分配或重用虚拟机。
3. 当场景需要 UI 证据时，准备桌面/浏览器配置文件。
4. 为基准引用准备一个干净的检出。
5. 安装依赖项并仅构建场景所需的内容。
6. 启动具有隔离状态目录的子 OpenClaw Gateway(网关)。
7. 配置实时传输、提供商、模型和浏览器配置文件。
8. 运行场景并捕获基准证据。
9. 停止网关并保留日志。
10. 在同一虚拟机中准备候选引用。
11. 运行相同的场景并捕获候选证据。
12. 比较预言机结果和视觉证据。
13. 写入 Markdown、JSON、日志、屏幕截图和可选的跟踪产物。
14. 上传 GitHub Actions 产物。
15. 发布简明的 PR 或 Discord 状态消息。

该场景应该能够以两种不同的方式失败：

- **Bug 复现**：基准以预期的方式失败。
- **工具失败**：在 bug 预言机有意义之前，环境设置、凭证、Discord API、浏览器或提供商失败了。

最终报告必须区分这些情况，以免维护人员将不稳定的环境与产品行为混淆。

## Discord MVP

第一个场景应针对 Discord 频道中的状态反应，其中源回复交付模式为 `message_tool_only`。

为什么这是一个很好的 Mantis 种子：

- 它在 Discord 中作为触发消息上的反应可见。
- 它通过 Discord 消息反应状态拥有强大的 REST 预言机。
- 它演练了真实的 OpenClaw Gateway(网关)、Discord 机器人身份验证、消息分发、源回复交付模式、状态反应状态和模型轮次生命周期。
- 它足够狭窄，可以保持第一次实现的诚实性。

预期的场景形状：

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

基准证据应显示已排队的确认反应，但在仅工具模式下没有生命周期转换。候选证据应显示当 `messages.statusReactions.enabled` 显式为 true 时正在运行的生命周期状态反应。

可执行的第一部分是可选加入的 Discord 实时 QA 场景：

```bash
pnpm openclaw qa discord \
  --scenario discord-status-reactions-tool-only \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --fast \
  --output-dir .artifacts/qa-e2e/mantis/discord-status-reactions-candidate
```

它通过始终开启的公会处理、`visibleReplies:
"message_tool"`, `ackReaction: "👀"` 以及显式状态反应来配置 SUT。Oracle 轮询真实的 Discord 触发消息，并期望观察到的序列
`👀 -> 🤔 -> 👍`。产物包括 `discord-qa-reaction-timelines.json`、
`discord-status-reactions-tool-only-timeline.html` 和
`discord-status-reactions-tool-only-timeline.png`。

## 现有的 QA 组件

Mantis 应该建立在现有的私有 QA 栈之上，而不是从零开始：

- `pnpm openclaw qa discord` 已经运行了一个带有驱动程序和
  SUT 机器人的实时 Discord 通道。
- 实时传输运行程序已经在 `.artifacts/qa-e2e/` 下写入报告和观察到的消息
  产物。
- Convex 凭证租约已经提供了对共享实时
  传输凭证的独占访问。
- 浏览器控制服务已经支持屏幕截图、快照、
  无头托管配置文件和远程 CDP 配置文件。
- QA Lab 已经有一个用于传输型测试的调试器 UI 和总线。

第一个 Mantis 实现可以是在这些组件之上的一个轻量级的前后对比运行程序，再加上一个视觉证据层。

## 证据模型

每次运行都会写入一个稳定的产物目录：

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

`mantis-summary.json` 应该是机器可读的事实来源。Markdown 报告用于 PR 评论和人工审查。

摘要必须包括：

- 测试的 refs 和 SHAs
- 传输和场景 ID
- 机器提供商和机器 ID 或租约 ID
- 不包含秘密值的凭证来源
- 基准结果
- 候选结果
- Bug 是否在基准上复现
- 候选版本是否修复了它
- 产物路径
- 经过清理的设置或清理问题

截图是证据，不是秘密。它们仍需遵守删减规范：可能会出现私有渠道名称、用户名或消息内容。对于公开的 PR，在删减功能更完善之前，首选 GitHub Actions 产物链接而非内联图片。

## 浏览器和 VNC

浏览器通道有两种模式：

- **无头自动化**：CI 的默认模式。Chrome 在启用 CDP 的情况下运行，
  Playwright 或 OpenClaw 浏览器控制会捕获截图。
- **VNC 救援**：当登录、MFA、Discord 反自动化，
  或视觉调试需要人工介入时，在同一 VM 上启用。

Discord 观察者浏览器配置文件应足够持久，以避免每次运行都登录，但需与个人浏览器状态隔离。配置文件属于 Mantis 机器池，而不属于开发者的笔记本电脑。

当 Mantis 卡住时，它会发布一条包含以下内容的 Discord 状态消息：

- 运行 ID
- 场景 ID
- 机器提供商
- 产物目录
- VNC 或 noVNC 连接说明（如果有）
- 简短的阻塞文本

首次私有部署可以将这些消息发送到现有的操作员渠道，稍后再转移到专用的 Mantis 渠道。

## 机器

对于首次远程实现，Mantis 应优先选择通过 Crabbox 使用 AWS。
Crabbox 为我们提供预热好的机器、租约跟踪、水合、日志、结果和
清理。如果 AWS 容量太慢或不可用，请在同一机器接口后面添加 Hetzner 提供商。

最低 VM 要求：

- 安装了支持桌面环境的 Chrome 或 Chromium 的 Linux
- 用于浏览器自动化的 CDP 访问权限
- 用于救援的 VNC 或 noVNC
- Node 22 和 pnpm
- OpenClaw 检出和依赖缓存
- 当使用 Playwright 时，需要有 Playwright Chromium 浏览器缓存
- 足够的 CPU 和内存，用于运行一个 OpenClaw Gateway(网关)、一个浏览器和一个模型
- 对 Discord、GitHub、模型提供商和凭证代理的出站访问权限

VM 不应在预期的凭证或浏览器配置文件存储之外保留长期存在的原始机密。

## 机密

Secrets 存储在 GitHub 组织或仓库 secrets 中以用于远程运行，并存储在本地操作员控制的 secret 文件中以用于本地运行。

推荐的 secret 名称：

- `OPENCLAW_QA_DISCORD_MANTIS_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_NOTIFY_CHANNEL_ID`
- `OPENCLAW_QA_REDACT_PUBLIC_METADATA=1`GitHub 用于公共 GitHub 构件上传
- `OPENCLAW_QA_CONVEX_SITE_URL`
- `OPENCLAW_QA_CONVEX_SECRET_CI`
- `OPENCLAW_QA_MANTIS_CRABBOX_COORDINATOR`
- `OPENCLAW_QA_MANTIS_CRABBOX_COORDINATOR_TOKEN`

长期来看，Convex 凭证池应仍是实时传输凭证的常规来源。GitHub secrets 为代理和备用通道提供引导。Discord 状态反应工作流将 Mantis Crabbox secrets 映射回 Crabbox CLI 期望的 GitHubDiscord`CRABBOX_COORDINATOR` 和 `CRABBOX_COORDINATOR_TOKEN`CLI 环境变量。普通的 `CRABBOX_*`GitHub GitHub secret 名称仍被接受作为兼容性回退方案。

Mantis 运行器绝不能打印：

- Discord 机器人令牌
- 提供商 API 密钥
- 浏览器 cookies
- 认证配置文件内容
- VNC 密码
- 原始凭证负载

公共构件上传还应编辑掉 Discord 目标元数据，如机器人、服务器、渠道和消息 ID。GitHub 冒烟工作流出于此原因启用了 DiscordGitHub`OPENCLAW_QA_REDACT_PUBLIC_METADATA=1`。

如果令牌被意外粘贴到 issue、PR、聊天或日志中，请在存储新 secret 后轮换它。

## GitHub 构件和 PR 评论

Mantis 工作流应将完整的证据包作为短期 Actions 制品上传。当为 Bug 报告或修复 PR 运行工作流时，它还应将编辑过的 PNG 截图发布到 `qa-artifacts` 分支，并在该 Bug 或修复 PR 上更新（upsert）一条评论，其中包含内联的前后对比截图。不要仅在一个通用的 QA 自动化 PR 上发布主要证明。原始日志、观察到的消息和其他庞大的证据保留在 Actions 制品中。

生产工作流应使用 Mantis GitHub App 发布这些评论，而不是使用 `github-actions[bot]`。将 App ID 和私钥存储为 `MANTIS_GITHUB_APP_ID` 和 `MANTIS_GITHUB_APP_PRIVATE_KEY` GitHub Actions 密钥。工作流使用隐藏标记作为更新（upsert）键，当令牌可以编辑该评论时更新它，当无法编辑较旧的机器人拥有的标记时，创建一个新的 Mantis 拥有的评论。

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

当运行因工具失败而失败时，评论必须说明这一点，而不是暗示候选版本失败。

## 私有部署说明

私有部署可能已经有一个 Mantis Discord 应用程序。如果该应用程序具有正确的机器人权限并且可以安全轮换，则复用它而不是创建另一个应用程序。

通过密钥或部署配置设置初始操作员通知渠道。它可以首先指向现有的维护者或操作渠道，一旦存在专用的 Mantis 渠道，再移动到该渠道。

不要在此文档中放置公会 ID、渠道 ID、机器人令牌、浏览器 Cookie 或 VNC 密码。将它们存储在 GitHub 密钥、凭证代理或操作员的本地密钥存储中。

## 添加场景

Mantis 场景应声明：

- ID 和标题
- 传输
- 所需凭证
- 基准引用策略
- 候选引用策略
- OpenClaw 配置补丁
- 设置步骤
- 刺激
- 预期基准预言机
- 预期候选预言机
- 视觉捕获目标
- 超时预算
- 清理步骤

场景应首选小型、类型化的预言机：

- Discord 反应状态用于反应 Bug
- Discord 消息引用用于线程 Bug
- Slack 线程 ts 和反应 SlackAPI 状态用于 Slack 缺陷
- 邮件消息 ID 和标头用于邮件缺陷
- 当 UI 是唯一可靠的观察对象时，进行浏览器截图

视觉检查应该是补充性的。如果平台 API 可以证明该缺陷，请使用该 API 作为通过/失败的预言机，并保留截图以供人工确信。

## 提供商扩展

在 Discord 之后，同一运行器可以添加：

- Slack：反应、线程、应用提及、模态框、文件上传。
- 电子邮件：Gmail 身份验证和使用 `gog` 的消息线程，当连接器不足时。
- WhatsApp：二维码登录、重新识别、消息传递、媒体、反应。
- Telegram：群组提及门控、命令、可用位置的反应。
- Matrix：加密房间、线程或回复关系、重启恢复。

每种传输应该有一个低成本的冒烟场景和一个或多个缺陷类别场景。昂贵的视觉场景应保持可选加入。

## 未解决问题

- 当重用现有的 Mantis 机器人时，哪个 Discord 机器人应该是驱动程序，哪个应该是被测系统 (SUT)？
- 观察者浏览器登录应该使用人类 Discord 账户、测试账户，还是在第一阶段仅使用机器人可读的 REST 证据？
- %%PH:GLOSSARY:319:449ec62b\*\* 应该为 PR 保留 Mantis 制品多久？
- ClawSweeper 应该在什么时候自动推荐 Mantis，而不是等待维护者命令？
- 在上传到公共 PR 之前，是否应该对截图进行编辑或裁剪？
