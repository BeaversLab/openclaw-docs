---
summary: "常见问题"
title: "关于 OpenClaw 设置、配置和使用的常见问题"
---

# 常见问题

针对实际部署场景（本地开发、VPS、多代理、OAuth/API 密钥、模型故障转移）的快速解答和深入故障排除。运行时诊断请参阅[故障排除](/zh/gateway/troubleshooting)。完整配置参考请参阅[配置](/zh/gateway/configuration)。

## 目录

- [快速入门和首次运行设置](#quick-start-and-firstrun-setup)
  - [我被卡住了，最快的方法是什么？](#im-stuck-whats-the-fastest-way-to-get-unstuck)
  - [安装和设置 OpenClaw 的推荐方式是什么？](#whats-the-recommended-way-to-install-and-set-up-openclaw)
  - [入门后如何打开仪表板？](#how-do-i-open-the-dashboard-after-onboarding)
  - [如何在本地主机与远程服务器上对仪表板进行身份验证（令牌）？](#how-do-i-authenticate-the-dashboard-token-on-localhost-vs-remote)
  - [我需要什么运行时？](#what-runtime-do-i-need)
  - [它能在 Raspberry Pi 上运行吗？](#does-it-run-on-raspberry-pi)
  - [Raspberry Pi 安装有什么技巧吗？](#any-tips-for-raspberry-pi-installs)
  - [它卡在 "wake up my friend" / 入门向导无法启动。现在怎么办？](#it-is-stuck-on-wake-up-my-friend-onboarding-will-not-hatch-what-now)
  - [我可以将设置迁移到新机器（Mac mini）而无需重新进行入门吗？](#can-i-migrate-my-setup-to-a-new-machine-mac-mini-without-redoing-onboarding)
  - [我在哪里可以看到最新版本的新内容？](#where-do-i-see-what-is-new-in-the-latest-version)
  - [我无法访问 docs.openclaw.ai（SSL 错误）。现在怎么办？](#i-cant-access-docsopenclawai-ssl-error-what-now)
  - [稳定版和 beta 版有什么区别？](#whats-the-difference-between-stable-and-beta)
  - [如何安装 beta 版本，beta 版和 dev 版有什么区别？](#how-do-i-install-the-beta-version-and-whats-the-difference-between-beta-and-dev)
  - [如何尝试最新版本？](#how-do-i-try-the-latest-bits)
  - [安装和入门通常需要多长时间？](#how-long-does-install-and-onboarding-usually-take)
  - [安装程序卡住了？如何获得更多反馈？](#installer-stuck-how-do-i-get-more-feedback)
  - [Windows 安装显示找不到 git 或无法识别 openclaw](#windows-install-says-git-not-found-or-openclaw-not-recognized)
  - [文档没有回答我的问题 - 如何获得更好的答案？](#the-docs-didnt-answer-my-question-how-do-i-get-a-better-answer)
  - [如何在 Linux 上安装 OpenClaw？](#how-do-i-install-openclaw-on-linux)
  - [如何在 VPS 上安装 OpenClaw？](#how-do-i-install-openclaw-on-a-vps)
  - [云/VPS 安装指南在哪里？](#where-are-the-cloudvps-install-guides)
  - [我可以要求 OpenClaw 自动更新吗？](#can-i-ask-openclaw-to-update-itself)
  - [入门向导实际上是做什么的？](#what-does-the-onboarding-wizard-actually-do)
  - [运行此程序需要 Claude 或 OpenAI 订阅吗？](#do-i-need-a-claude-or-openai-subscription-to-run-this)
  - [我可以在没有 API 密钥的情况下使用 Claude Max 订阅吗](#can-i-use-claude-max-subscription-without-an-api-key)
  - [Anthropic "setup-token" 身份验证如何工作？](#how-does-anthropic-setuptoken-auth-work)
  - [在哪里可以找到 Anthropic setup-token？](#where-do-i-find-an-anthropic-setuptoken)
  - [您支持 Claude 订阅身份验证（Claude Code OAuth）吗？](#do-you-support-claude-subscription-auth-claude-code-oauth)
  - [为什么我看到来自 Anthropic 的 `HTTP 429: rate_limit_error`？](#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)
  - [支持 AWS Bedrock 吗？](#is-aws-bedrock-supported)
  - [Codex 身份验证如何工作？](#how-does-codex-auth-work)
  - [您支持 OpenAI 订阅身份验证（Codex OAuth）吗？](#do-you-support-openai-subscription-auth-codex-oauth)
  - [如何设置 Gemini CLI OAuth](#how-do-i-set-up-gemini-cli-oauth)
  - [本地模型可以用于随意聊天吗？](#is-a-local-model-ok-for-casual-chats)
  - [如何将托管模型流量保留在特定区域？](#how-do-i-keep-hosted-model-traffic-in-a-specific-region)
  - [我必须购买 Mac Mini 才能安装此程序吗？](#do-i-have-to-buy-a-mac-mini-to-install-this)
  - [我需要 Mac mini 才能支持 iMessage 吗？](#do-i-need-a-mac-mini-for-imessage-support)
  - [如果我购买 Mac mini 来运行 OpenClaw，可以将其连接到我的 MacBook Pro 吗？](#if-i-buy-a-mac-mini-to-run-openclaw-can-i-connect-it-to-my-macbook-pro)
  - [我可以使用 Bun 吗？](#can-i-use-bun)
  - [Telegram：`allowFrom` 中应该填什么？](#telegram-what-goes-in-allowfrom)
  - [多个人可以分别使用不同的 OpenClaw 实例来使用一个 WhatsApp 号码吗？](#can-multiple-people-use-one-whatsapp-number-with-different-openclaw-instances)
  - [我可以同时运行"快速聊天"代理和"Opus 编程"代理吗？](#can-i-run-a-fast-chat-agent-and-an-opus-for-coding-agent)
  - [Homebrew 在 Linux 上有效吗？](#does-homebrew-work-on-linux)
  - [可破解（git）安装和 npm 安装有什么区别？](#whats-the-difference-between-the-hackable-git-install-and-npm-install)
  - [我以后可以在 npm 和 git 安装之间切换吗？](#can-i-switch-between-npm-and-git-installs-later)
  - [我应该在笔记本电脑还是 VPS 上运行 Gateway？](#should-i-run-the-gateway-on-my-laptop-or-a-vps)
  - [在专用机器上运行 OpenClaw 有多重要？](#how-important-is-it-to-run-openclaw-on-a-dedicated-machine)
  - [最低 VPS 要求和推荐的操作系统是什么？](#what-are-the-minimum-vps-requirements-and-recommended-os)
  - [我可以在 VM 中运行 OpenClaw 吗，有什么要求](#can-i-run-openclaw-in-a-vm-and-what-are-the-requirements)
- [什么是 OpenClaw？](#what-is-openclaw)
  - [用一段话描述什么是 OpenClaw？](#what-is-openclaw-in-one-paragraph)
  - [价值主张是什么？](#whats-the-value-proposition)
  - [我刚刚设置好了，首先应该做什么](#i-just-set-it-up-what-should-i-do-first)
  - [OpenClaw 的五大日常用例是什么](#what-are-the-top-five-everyday-use-cases-for-openclaw)
  - [OpenClaw 可以帮助 SaaS 进行潜在客户开发、外联、广告和博客吗](#can-openclaw-help-with-lead-gen-outreach-ads-and-blogs-for-a-saas)
  - [与 Claude Code 相比在 Web 开发方面有什么优势？](#what-are-the-advantages-vs-claude-code-for-web-development)
- [技能和自动化](#skills-and-automation)
  - [如何在保持仓库干净的情况下自定义技能？](#how-do-i-customize-skills-without-keeping-the-repo-dirty)
  - [我可以从自定义文件夹加载技能吗？](#can-i-load-skills-from-a-custom-folder)
  - [如何为不同的任务使用不同的模型？](#how-can-i-use-different-models-for-different-tasks)
  - [机器人在进行繁重工作时冻结。如何卸载该工作？](#the-bot-freezes-while-doing-heavy-work-how-do-i-offload-that)
  - [Cron 或提醒未触发。我应该检查什么？](#cron-or-reminders-do-not-fire-what-should-i-check)
  - [如何在 Linux 上安装技能？](#how-do-i-install-skills-on-linux)
  - [OpenClaw 可以按计划或在后台连续运行任务吗？](#can-openclaw-run-tasks-on-a-schedule-or-continuously-in-the-background)
  - [我可以从 Linux 运行仅限 Apple/macOS 的技能吗？](#can-i-run-applemacosonly-skills-from-linux)
  - [您有 Notion 或 HeyGen 集成吗？](#do-you-have-a-notion-or-heygen-integration)
  - [如何安装 Chrome 扩展程序以接管浏览器？](#how-do-i-install-the-chrome-extension-for-browser-takeover)
- [沙箱和内存](#sandboxing-and-memory)
  - [有专门的沙箱文档吗？](#is-there-a-dedicated-sandboxing-doc)
  - [如何将主机文件夹绑定到沙箱中？](#how-do-i-bind-a-host-folder-into-the-sandbox)
  - [内存如何工作？](#how-does-memory-work)
  - [内存总是忘记事情。如何让它记住？](#memory-keeps-forgetting-things-how-do-i-make-it-stick)
  - [内存会永久保留吗？有什么限制？](#does-memory-persist-forever-what-are-the-limits)
  - [语义内存搜索需要 OpenAI API 密钥吗？](#does-semantic-memory-search-require-an-openai-api-key)
- [磁盘上的文件位置](#where-things-live-on-disk)
  - [与 OpenClaw 一起使用的所有数据都保存在本地吗？](#is-all-data-used-with-openclaw-saved-locally)
  - [OpenClaw 在哪里存储其数据？](#where-does-openclaw-store-its-data)
  - [AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该放在哪里？](#where-should-agentsmd-soulmd-usermd-memorymd-live)
  - [推荐的备份策略是什么？](#whats-the-recommended-backup-strategy)
  - [如何完全卸载 OpenClaw？](#how-do-i-completely-uninstall-openclaw)
  - [代理可以在工作区外工作吗？](#can-agents-work-outside-the-workspace)
  - [我处于远程模式 - 会话存储在哪里？](#im-in-remote-mode-where-is-the-session-store)
- [配置基础](#config-basics)
  - [配置是什么格式？它在哪里？](#what-format-is-the-config-where-is-it)
  - [我设置了 `gateway.bind: "lan"`（或 `"tailnet"`），现在什么都没有监听 / UI 显示未授权](#i-set-gatewaybind-lan-or-tailnet-and-now-nothing-listens-the-ui-says-unauthorized)
  - [为什么现在在本地主机上需要令牌？](#why-do-i-need-a-token-on-localhost-now)
  - [更改配置后必须重启吗？](#do-i-have-to-restart-after-changing-config)
  - [如何启用网络搜索（和网络获取）？](#how-do-i-enable-web-search-and-web-fetch)
  - [config.apply 清除了我的配置。如何恢复并避免这种情况？](#configapply-wiped-my-config-how-do-i-recover-and-avoid-this)
  - [如何使用专门的跨设备工作程序运行中央 Gateway？](#how-do-i-run-a-central-gateway-with-specialized-workers-across-devices)
  - [OpenClaw 浏览器可以无头运行吗？](#can-the-openclaw-browser-run-headless)
  - [如何使用 Brave 进行浏览器控制？](#how-do-i-use-brave-for-browser-control)
- [远程 Gateway + 节点](#remote-gateways-nodes)
  - [命令如何在 Telegram、Gateway和节点之间传播？](#how-do-commands-propagate-between-telegram-the-gateway-and-nodes)
  - [如果Gateway远程托管，我的代理如何访问我的计算机？](#how-can-my-agent-access-my-computer-if-the-gateway-is-hosted-remotely)
  - [Tailscale 已连接但没有收到回复。现在怎么办？](#tailscale-is-connected-but-i-get-no-replies-what-now)
  - [两个 OpenClaw 实例可以相互通信吗（本地 + VPS）？](#can-two-openclaw-instances-talk-to-each-other-local-vps)
  - [多个代理是否需要单独的 VPS](#do-i-need-separate-vpses-for-multiple-agents)
  - [在个人笔记本电脑上使用节点而不是从 VPS 使用 SSH 有什么好处？](#is-there-a-benefit-to-using-a-node-on-my-personal-laptop-instead-of-ssh-from-a-vps)
  - [节点运行Gateway服务吗？](#do-nodes-run-a-gateway-service)
  - [是否有 API/RPC 方式来应用配置？](#is-there-an-api-rpc-way-to-apply-config)
  - [首次安装的最小"合理"配置是什么？](#whats-a-minimal-sane-config-for-a-first-install)
  - [如何在 VPS 上设置 Tailscale 并从 Mac 连接？](#how-do-i-set-up-tailscale-on-a-vps-and-connect-from-my-mac)
  - [如何将 Mac 节点连接到远程Gateway（Tailscale Serve）？](#how-do-i-connect-a-mac-node-to-a-remote-gateway-tailscale-serve)
  - [我应该安装在第二台笔记本电脑上还是只添加一个节点？](#should-i-install-on-a-second-laptop-or-just-add-a-node)
- [环境变量和 .env 加载](#env-vars-and-env-loading)
  - [OpenClaw 如何加载环境变量？](#how-does-openclaw-load-environment-variables)
  - ["我通过服务启动了Gateway，我的环境变量消失了。"现在怎么办？](#i-started-the-gateway-via-the-service-and-my-env-vars-disappeared-what-now)
  - [我设置了 `COPILOT_GITHUB_TOKEN`，但模型状态显示"Shell env: off."为什么？](#i-set-copilotgithubtoken-but-models-status-shows-shell-env-off-why)
- [会话和多重聊天](#sessions-multiple-chats)
  - [如何开始新对话？](#how-do-i-start-a-fresh-conversation)
  - [如果我从不发送 `/new`，会话会自动重置吗？](#do-sessions-reset-automatically-if-i-never-send-new)
  - [有没有办法让一组 OpenClaw 实例成为一个 CEO 和多个代理](#is-there-a-way-to-make-a-team-of-openclaw-instances-one-ceo-and-many-agents)
  - [为什么上下文在任务中途被截断？如何防止？](#why-did-context-get-truncated-midtask-how-do-i-prevent-it)
  - [如何完全重置 OpenClaw 但保持已安装状态？](#how-do-i-completely-reset-openclaw-but-keep-it-installed)
  - [我收到"context too large"错误 - 如何重置或压缩？](#im-getting-context-too-large-errors-how-do-i-reset-or-compact)
  - [为什么我看到"LLM request rejected: messages.N.content.X.tool_use.input: Field required"？](#why-am-i-seeing-llm-request-rejected-messagesncontentxtooluseinput-field-required)
  - [为什么我每 30 分钟收到一次心跳消息？](#why-am-i-getting-heartbeat-messages-every-30-minutes)
  - [我需要将"机器人帐户"添加到 WhatsApp 群组吗？](#do-i-need-to-add-a-bot-account-to-a-whatsapp-group)
  - [如何获取 WhatsApp 群组的 JID？](#how-do-i-get-the-jid-of-a-whatsapp-group)
  - [为什么 OpenClaw 不在群组中回复？](#why-doesnt-openclaw-reply-in-a-group)
  - [群组/线程与私信共享上下文吗？](#do-groupsthreads-share-context-with-dms)
  - [我可以创建多少个工作区和代理？](#how-many-workspaces-and-agents-can-i-create)
  - [我可以同时运行多个机器人或聊天（Slack），应该如何设置？](#can-i-run-multiple-bots-or-chats-at-the-same-time-slack-and-how-should-i-set-that-up)
- [模型：默认值、选择、别名、切换](#models-defaults-selection-aliases-switching)
  - [什么是"默认模型"？](#what-is-the-default-model)
  - [你推荐什么模型？](#what-model-do-you-recommend)
  - [如何切换模型而不清除配置？](#how-do-i-switch-models-without-wiping-my-config)
  - [我可以使用自托管模型（llama.cpp、vLLM、Ollama）吗？](#can-i-use-selfhosted-models-llamacpp-vllm-ollama)
  - [OpenClaw、Flawd 和 Krill 使用什么模型？](#what-do-openclaw-flawd-and-krill-use-for-models)
  - [如何即时切换模型（无需重启）？](#how-do-i-switch-models-on-the-fly-without-restarting)
  - [我可以将 GPT 5.2 用于日常任务，将 Codex 5.2 用于编程吗](#can-i-use-gpt-52-for-daily-tasks-and-codex-52-for-coding)
  - [为什么我看到"Model … is not allowed"然后没有回复？](#why-do-i-see-model-is-not-allowed-and-then-no-reply)
  - [为什么我看到"Unknown model: minimax/MiniMax-M2.1"？](#why-do-i-see-unknown-model-minimaxminimaxm21)
  - [我可以将 MiniMax 作为默认模型，将 OpenAI 用于复杂任务吗？](#can-i-use-minimax-as-my-default-and-openai-for-complex-tasks)
  - [opus/sonnet/gpt 是内置快捷方式吗？](#are-opus-sonnet-gpt-builtin-shortcuts)
  - [如何定义/覆盖模型快捷方式（别名）？](#how-do-i-defineoverride-model-shortcuts-aliases)
  - [如何添加来自其他提供商的模型，如 OpenRouter 或 Z.AI？](#how-do-i-add-models-from-other-providers-like-openrouter-or-zai)
- [模型故障转移和"All models failed"](#model-failover-and-all-models-failed)
  - [故障转移如何工作？](#how-does-failover-work)
  - [这个错误是什么意思？](#what-does-this-error-mean)
  - [`No credentials found for profile "anthropic:default"` 的修复清单](#fix-checklist-for-no-credentials-found-for-profile-anthropicdefault)
  - [为什么它也尝试 Google Gemini 并失败？](#why-did-it-also-try-google-gemini-and-fail)
- [身份验证配置文件：它们是什么以及如何管理它们](#auth-profiles-what-they-are-and-how-to-manage-them)
  - [什么是身份验证配置文件？](#what-is-an-auth-profile)
  - [典型的配置文件 ID 是什么？](#what-are-typical-profile-ids)
  - [我可以控制首先尝试哪个身份验证配置文件吗？](#can-i-control-which-auth-profile-is-tried-first)
  - [OAuth 与 API 密钥：有什么区别？](#oauth-vs-api-key-whats-the-difference)
- [Gateway：端口、"正在运行"和远程模式](#gateway-ports-already-running-and-remote-mode)
  - [Gateway使用什么端口？](#what-port-does-the-gateway-use)
  - [为什么 `openclaw gateway status` 说 `Runtime: running` 但 `RPC probe: failed`？](#why-does-openclaw-gateway-status-say-runtime-running-but-rpc-probe-failed)
  - [为什么 `openclaw gateway status` 显示 `Config (cli)` 和 `Config (service)` 不同？](#why-does-openclaw-gateway-status-show-config-cli-and-config-service-different)
  - ["另一个Gateway实例已在监听"是什么意思？](#what-does-another-gateway-instance-is-already-listening-mean)
  - [如何在远程模式下运行 OpenClaw（客户端连接到其他地方的Gateway）？](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere)
  - [控制 UI 显示"未授权"（或不断重新连接）。现在怎么办？](#the-control-ui-says-unauthorized-or-keeps-reconnecting-what-now)
  - [我设置了 `gateway.bind: "tailnet"` 但无法绑定 / 什么都没有监听](#i-set-gatewaybind-tailnet-but-it-cant-bind-nothing-listens)
  - [我可以在同一主机上运行多个Gateway吗？](#can-i-run-multiple-gateways-on-the-same-host)
  - ["invalid handshake" / 代码 1008 是什么意思？](#what-does-invalid-handshake-code-1008-mean)
- [日志记录和调试](#logging-and-debugging)
  - [日志在哪里？](#where-are-logs)
  - [如何启动/停止/重启Gateway服务？](#how-do-i-startstoprestart-the-gateway-service)
  - [我在 Windows 上关闭了终端 - 如何重启 OpenClaw？](#i-closed-my-terminal-on-windows-how-do-i-restart-openclaw)
  - [Gateway已启动但回复从未到达。应该检查什么？](#the-gateway-is-up-but-replies-never-arrive-what-should-i-check)
  - ["Disconnected from gateway: no reason" - 现在怎么办？](#disconnected-from-gateway-no-reason-what-now)
  - [Telegram setMyCommands 因网络错误而失败。应该检查什么？](#telegram-setmycommands-fails-with-network-errors-what-should-i-check)
  - [TUI 显示无输出。应该检查什么？](#tui-shows-no-output-what-should-i-check)
  - [如何完全停止然后启动Gateway？](#how-do-i-completely-stop-then-start-the-gateway)
  - [ELI5：`openclaw gateway restart` vs `openclaw gateway`](#eli5-openclaw-gateway-restart-vs-openclaw-gateway)
  - [当某些内容失败时，获得更多详细信息的最快方法是什么？](#whats-the-fastest-way-to-get-more-details-when-something-fails)
- [媒体和附件](#media-attachments)
  - [我的技能生成了图像/PDF，但什么都没有发送](#my-skill-generated-an-imagepdf-but-nothing-was-sent)
- [安全和访问控制](#security-and-access-control)
  - [将 OpenClaw 暴露给入站私信安全吗？](#is-it-safe-to-expose-openclaw-to-inbound-dms)
  - [提示注入只是公共机器人的问题吗？](#is-prompt-injection-only-a-concern-for-public-bots)
  - [我的机器人应该有自己的电子邮件 GitHub 帐户或电话号码吗](#should-my-bot-have-its-own-email-github-account-or-phone-number)
  - [我可以让它对我的文本消息拥有自主权，这安全吗](#can-i-give-it-autonomy-over-my-text-messages-and-is-that-safe)
  - [我可以为个人助理任务使用更便宜的模型吗？](#can-i-use-cheaper-models-for-personal-assistant-tasks)
  - [我在 Telegram 中运行了 `/start` 但没有获得配对码](#i-ran-start-in-telegram-but-didnt-get-a-pairing-code)
  - [WhatsApp：它会给我的联系人发送消息吗？配对如何工作？](#whatsapp-will-it-message-my-contacts-how-does-pairing-work)
- [聊天命令、中止任务和"它不会停止"](#chat-commands-aborting-tasks-and-it-wont-stop)
  - [如何阻止内部系统消息在聊天中显示](#how-do-i-stop-internal-system-messages-from-showing-in-chat)
  - [如何停止/取消正在运行的任务？](#how-do-i-stopcancel-a-running-task)
  - [如何从 Telegram 发送 Discord 消息？（"Cross-context messaging denied"）](#how-do-i-send-a-discord-message-from-telegram-crosscontext-messaging-denied)
  - [为什么感觉机器人"忽略"了快速连续的消息？](#why-does-it-feel-like-the-bot-ignores-rapidfire-messages)

## 如果出现问题，前 60 秒该做什么

1. **快速状态（首选检查）**

   ```bash
   openclaw status
   ```

   快速本地摘要：操作系统 + 更新、Gateway/服务可达性、代理/会话、提供商配置 + 运行时问题（当Gateway可达时）。

2. **可粘贴的报告（可安全共享）**

   ```bash
   openclaw status --all
   ```

   只读诊断，附带日志尾部（令牌已编辑）。

3. **守护进程 + 端口状态**

   ```bash
   openclaw gateway status
   ```

   显示监控程序运行时与 RPC 可达性、探测目标 URL 以及服务可能使用的配置。

4. **深度探测**

   ```bash
   openclaw status --deep
   ```

   运行Gateway健康检查 + 提供商探测（需要可访问的Gateway）。请参阅[运行状况](/zh/gateway/health)。

5. **跟踪最新日志**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 不可用，请回退到：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   文件日志与服务日志分开；请参阅[日志记录](/zh/logging)和[故障排除](/zh/gateway/troubleshooting)。

6. **运行医生（修复）**

   ```bash
   openclaw doctor
   ```

   修复/迁移配置/状态 + 运行健康检查。请参阅[医生](/zh/gateway/doctor)。

7. **Gateway快照**
   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```
   向正在运行的Gateway请求完整快照（仅 WS）。请参阅[运行状况](/zh/gateway/health)。

## 快速入门和首次运行设置

### 我被卡住了，最快的方法是什么

使用可以**看到您的机器**的本地 AI 代理。这比在 Discord 中询问有效得多，因为大多数"我被卡住了"的情况是**本地配置或环境问题**，远程帮助者无法检查这些问题。

- **Claude Code**: https://www.anthropic.com/claude-code/
- **OpenAI Codex**: https://openai.com/codex/

这些工具可以读取仓库、运行命令、检查日志，并帮助修复您的机器级设置（PATH、服务、权限、身份验证文件）。通过可破解（git）安装为它们提供**完整的源代码检出**：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

这会**从 git 检出**安装 OpenClaw，因此代理可以阅读代码 + 文档并推理您正在运行的确切版本。您始终可以通过不带 `--install-method git` 重新运行安装程序来切换回稳定版本。

提示：要求代理**计划和监督**修复（分步），然后仅执行必要的命令。这样可以保持更改较小且更容易审核。

如果您发现了真正的错误或修复，请提交 GitHub 问题或发送 PR：
https://github.com/openclaw/openclaw/issues
https://github.com/openclaw/openclaw/pulls

从以下命令开始（在寻求帮助时共享输出）：

```bash
openclaw status
openclaw models status
openclaw doctor
```

它们的作用：

- `openclaw status`：Gateway/代理运行状况 + 基本配置的快速快照。
- `openclaw models status`：检查提供商身份验证 + 模型可用性。
- `openclaw doctor`：验证并修复常见的配置/状态问题。

其他有用的 CLI 检查：`openclaw status --all`、`openclaw logs --follow`、
`openclaw gateway status`、`openclaw health --verbose`。

快速调试循环：[如果出现问题，前 60 秒该做什么](#first-60-seconds-if-somethings-broken)。
安装文档：[安装](/zh/install)、[安装程序标志](/zh/install/installer)、[更新](/zh/install/updating)。

### 安装和设置 OpenClaw 的推荐方式是什么

仓库建议从源代码运行并使用入门向导：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
```

向导还可以自动构建 UI 资产。入门后，您通常在端口 **18789** 上运行Gateway。

从源代码（贡献者/开发者）：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw onboard
```

如果您还没有全局安装，请通过 `pnpm openclaw onboard` 运行它。

### 入门后如何打开仪表板

向导现在会在入门后立即在浏览器中打开带有令牌化仪表板 URL 的链接，并在摘要中打印完整链接（带令牌）。保持该选项卡打开；如果它未启动，请在同一台计算机上复制/粘贴打印的 URL。令牌保留在您的主机本地 - 浏览器不会获取任何内容。

### 如何在本地主机与远程服务器上对仪表板令牌进行身份验证

**本地主机（同一台机器）：**

- 打开 `http://127.0.0.1:18789/`。
- 如果它要求身份验证，请运行 `openclaw dashboard` 并使用令牌化链接（`?token=...`）。
- 令牌与 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）的值相同，并在首次加载后由 UI 存储。

**不在本地主机上：**

- **Tailscale Serve**（推荐）：保持绑定环回，运行 `openclaw gateway --tailscale serve`，打开 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 是 `true`，则身份验证标头满足身份验证（无需令牌）。
- **Tailnet 绑定**：运行 `openclaw gateway --bind tailnet --token "<token>"`，打开 `http://<tailscale-ip>:18789/`，在仪表板设置中粘贴令牌。
- **SSH 隧道**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然后从 `openclaw dashboard` 打开 `http://127.0.0.1:18789/?token=...`。

有关绑定模式和身份验证详细信息，请参阅[仪表板](/zh/web/dashboard)和 [Web 界面](/zh/web)。

### 我需要什么运行时

需要 Node **>= 22**。推荐 `pnpm`。**不推荐**将 Bun 用于Gateway。

### 它能在 Raspberry Pi 上运行吗

可以。Gateway很轻量 - 文档列出 **512MB-1GB RAM**、**1 个核心**和约 **500MB**
磁盘对于个人使用来说足够了，并注意**Raspberry Pi 4 可以运行它**。

如果您想要额外的空间（日志、媒体、其他服务），**建议使用 2GB**，但这不是硬性最低要求。

提示：小型 Pi/VPS 可以托管Gateway，您可以在笔记本电脑/手机上配对**节点**以进行本地屏幕/摄像头/画布或命令执行。请参阅[节点](/zh/nodes)。

### Raspberry Pi 安装有什么技巧吗

简短版本：它有效，但预期会有一些粗糙的地方。

- 使用 **64 位**操作系统并保持 Node >= 22。
- 优先使用**可破解（git）安装**，这样您就可以查看日志并快速更新。
- 从不使用频道/技能开始，然后逐个添加它们。
- 如果遇到奇怪的二进制问题，这通常是**ARM 兼容性**问题。

文档：[Linux](/zh/platforms/linux)、[安装](/zh/install)。

### 它卡在 wake up my friend 入门向导无法启动 现在怎么办

该屏幕依赖于Gateway可访问和已通过身份验证。TUI 还会在首次启动时自动发送"Wake up, my friend!"。如果您看到该行但**没有回复**并且令牌保持在 0，则代理从未运行。

1. 重启Gateway：

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

如果Gateway是远程的，请确保隧道/Tailscale 连接已建立，并且 UI 指向正确的Gateway。请参阅[远程访问](/zh/gateway/remote)。

### 我可以将设置迁移到新机器 Mac mini 而无需重新进行入门吗

可以。复制**状态目录**和**工作区**，然后运行一次 Doctor。这可以使您的机器人"完全相同"（内存、会话历史、身份验证和频道状态），只要您复制**两个**位置：

1. 在新机器上安装 OpenClaw。
2. 从旧机器复制 `$OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）。
3. 复制您的工作区（默认：`~/.openclaw/workspace`）。
4. 运行 `openclaw doctor` 并重启Gateway服务。

这样可以保留配置、身份验证配置文件、WhatsApp 凭据、会话和内存。如果您处于远程模式，请记住Gateway主机拥有会话存储和工作区。

**重要：**如果您仅将工作区提交/推送到 GitHub，则正在备份**内存 + 引导文件**，但**不**备份会话历史或身份验证。这些位于 `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

相关：[迁移](/zh/install/migrating)、[磁盘上的文件位置](/zh/help/faq#where-does-openclaw-store-its-data)、
[代理工作区](/zh/concepts/agent-workspace)、[医生](/zh/gateway/doctor)、
[远程模式](/zh/gateway/remote)。

### 我在哪里可以看到最新版本的新内容

查看 GitHub 变更日志：
https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md

最新的条目在顶部。如果顶部部分标记为**未发布**，则下一个日期部分是最新发布的版本。条目按**亮点**、**更改**和**修复**分组（必要时还包括文档/其他部分）。

### 我无法访问 docs.openclaw.ai SSL 错误 现在怎么办

某些 Comcast/Xfinity 连接通过 Xfinity 高级安全错误地阻止 `docs.openclaw.ai`。禁用它或将 `docs.openclaw.ai` 加入允许列表，然后重试。更多详细信息：[故障排除](/zh/help/troubleshooting#docsopenclawai-shows-an-ssl-error-comcastxfinity)。
请通过以下报告帮助我们解除阻止：https://spa.xfinity.com/check_url_status。

如果您仍然无法访问该站点，文档在 GitHub 上镜像：
https://github.com/openclaw/openclaw/tree/main/docs

### 稳定版和 beta 版有什么区别

**稳定版**和**beta 版**是**npm 分发标签**，不是单独的代码行：

- `latest` = 稳定版
- `beta` = 用于测试的早期构建

我们将构建发布到**beta**，对其进行测试，一旦构建稳定，我们就**将相同版本提升到 `latest`**。这就是为什么 beta 和稳定版可以指向**相同版本**。

查看更改内容：
https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md

### 如何安装 beta 版本，beta 版和 dev 版有什么区别

**Beta** 是 npm 分发标签 `beta`（可能与 `latest` 匹配）。
**Dev** 是 `main`（git）的移动头部；发布时，它使用 npm 分发标签 `dev`。

单行命令（macOS/Linux）：

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
```

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Windows 安装程序（PowerShell）：
https://openclaw.ai/install.ps1

更多详细信息：[开发渠道](/zh/install/development-channels)和[安装程序标志](/zh/install/installer)。

### 安装和入门通常需要多长时间

粗略指南：

- **安装：** 2-5 分钟
- **入门：** 5-15 分钟，取决于您配置的频道/模型数量

如果挂起，请使用[安装程序卡住了](/zh/help/faq#installer-stuck-how-do-i-get-more-feedback)
和[我被卡住了](/zh/help/faq#im-stuck--whats-the-fastest-way-to-get-unstuck)中的快速调试循环。

### 如何尝试最新版本

两个选项：

1. **开发渠道（git 检出）：**

```bash
openclaw update --channel dev
```

这会切换到 `main` 分支并从源代码更新。

2. **可破解安装（从安装程序站点）：**

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

这为您提供一个可以编辑的本地仓库，然后通过 git 更新。

如果您希望手动进行干净的克隆，请使用：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
```

文档：[更新](/zh/cli/update)、[开发渠道](/zh/install/development-channels)、
[安装](/zh/install)。

### 安装程序卡住了 如何获得更多反馈

使用**详细输出**重新运行安装程序：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
```

使用详细输出的 beta 安装：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
```

对于可破解（git）安装：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
```

更多选项：[安装程序标志](/zh/install/installer)。

### Windows 安装显示找不到 git 或无法识别 openclaw

两个常见的 Windows 问题：

**1) npm 错误 spawn git / 找不到 git**

- 安装**Git for Windows** 并确保 `git` 在您的 PATH 上。
- 关闭并重新打开 PowerShell，然后重新运行安装程序。

**2) 安装后无法识别 openclaw**

- 您的 npm 全局 bin 文件夹不在 PATH 上。
- 检查路径：
  ```powershell
  npm config get prefix
  ```
- 确保 `<prefix>\\bin` 在 PATH 上（在大多数系统上它是 `%AppData%\\npm`）。
- 更新 PATH 后关闭并重新打开 PowerShell。

如果您想要最流畅的 Windows 设置，请使用**WSL2**而不是原生 Windows。
文档：[Windows](/zh/platforms/windows)。

### 文档没有回答我的问题 如何获得更好的答案

使用**可破解（git）安装**，这样您就可以在本地获得完整的源代码和文档，然后_从该文件夹_询问您的机器人（或 Claude/Codex），以便它可以阅读仓库并准确回答。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

更多详细信息：[安装](/zh/install)和[安装程序标志](/zh/install/installer)。

### 如何在 Linux 上安装 OpenClaw

简短回答：按照 Linux 指南操作，然后运行入门向导。

- Linux 快速路径 + 服务安装：[Linux](/zh/platforms/linux)。
- 完整演练：[入门](/zh/start/getting-started)。
- 安装程序 + 更新：[安装和更新](/zh/install/updating)。

### 如何在 VPS 上安装 OpenClaw

任何 Linux VPS 都可以。在服务器上安装，然后使用 SSH/Tailscale 访问Gateway。

指南：[exe.dev](/zh/platforms/exe-dev)、[Hetzner](/zh/platforms/hetzner)、[Fly.io](/zh/platforms/fly)。
远程访问：[Gateway远程](/zh/gateway/remote)。

### 云/VPS 安装指南在哪里

我们保留了一个包含常见提供商的**托管中心**。选择一个并按照指南操作：

- [VPS 托管](/zh/vps)（所有提供商在一处）
- [Fly.io](/zh/platforms/fly)
- [Hetzner](/zh/platforms/hetzner)
- [exe.dev](/zh/platforms/exe-dev)

它在云端的工作原理：**Gateway在服务器上运行**，您可以通过控制 UI（或 Tailscale/SSH）从笔记本电脑/手机访问它。您的状态 + 工作区位于服务器上，因此将主机视为真实来源并备份它。

您可以将**节点**（Mac/iOS/Android/无头）配对到该云Gateway，以访问本地屏幕/摄像头/画布或在笔记本电脑上运行命令，同时将Gateway保留在云中。

中心：[平台](/zh/platforms)。远程访问：[Gateway远程](/zh/gateway/remote)。
节点：[节点](/zh/nodes)、[节点 CLI](/zh/cli/nodes)。

### 我可以要求 OpenClaw 自动更新吗

简短回答：**可能，但不推荐**。更新流程可能会重启Gateway（这会断开活动会话），可能需要干净的 git 检出，并且可能会提示确认。更安全的方法：作为操作员从 shell 运行更新。

使用 CLI：

```bash
openclaw update
openclaw update status
openclaw update --channel stable|beta|dev
openclaw update --tag <dist-tag|version>
openclaw update --no-restart
```

如果您必须从代理自动化：

```bash
openclaw update --yes --no-restart
openclaw gateway restart
```

文档：[更新](/zh/cli/update)、[更新中](/zh/install/updating)。

### 入门向导实际上是做什么的

`openclaw onboard` 是推荐的设置路径。在**本地模式**下，它会引导您完成：

- **模型/身份验证设置**（推荐为 Claude 订阅使用 Anthropic **setup-token**，支持 OpenAI Codex OAuth，API 密钥可选，支持 LM Studio 本地模型）
- **工作区**位置 + 引导文件
- **Gateway设置**（绑定/端口/身份验证/tailscale）
- **提供商**（WhatsApp、Telegram、Discord、Mattermost（插件）、Signal、iMessage）
- **守护进程安装**（macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd 用户单元）
- **健康检查**和**技能**选择

如果您配置的模型未知或缺少身份验证，它还会发出警告。

### 运行此程序需要 Claude 或 OpenAI 订阅吗

不需要。您可以使用**API 密钥**（Anthropic/OpenAI/其他）或**仅本地模型**运行 OpenClaw，以便您的数据保留在您的设备上。订阅（Claude Pro/Max 或 OpenAI Codex）是这些提供商的可选身份验证方式。

文档：[Anthropic](/zh/providers/anthropic)、[OpenAI](/zh/providers/openai)、
[本地模型](/zh/gateway/local-models)、[模型](/zh/concepts/models)。

### 我可以在没有 API 密钥的情况下使用 Claude Max 订阅吗

可以。您可以使用 **setup-token**
进行身份验证，而不是 API 密钥。这是订阅路径。

Claude Pro/Max 订阅**不包含 API 密钥**，因此这是订阅帐户的正确方法。重要：您必须与 Anthropic 确认这种使用在其订阅政策和条款下是允许的。
如果您想要最明确、支持的路径，请使用 Anthropic API 密钥。

### Anthropic setup-token 身份验证如何工作

`claude setup-token` 通过 Claude Code CLI 生成**令牌字符串**（它在 Web 控制台中不可用）。您可以在**任何机器**上运行它。在向导中选择**Anthropic 令牌（粘贴 setup-token）**或使用 `openclaw models auth paste-token --provider anthropic` 粘贴它。令牌作为 **anthropic** 提供商的身份验证配置文件存储，并像 API 密钥一样使用（不自动刷新）。更多详细信息：[OAuth](/zh/concepts/oauth)。

### 在哪里可以找到 Anthropic setup-token

它**不**在 Anthropic 控制台中。setup-token 由**Claude Code CLI**在**任何机器**上生成：

```bash
claude setup-token
```

复制它打印的令牌，然后在向导中选择**Anthropic 令牌（粘贴 setup-token）**。如果您想在Gateway主机上运行它，请使用 `openclaw models auth setup-token --provider anthropic`。如果您在其他地方运行了 `claude setup-token`，请使用 `openclaw models auth paste-token --provider anthropic` 在Gateway主机上粘贴它。请参阅[Anthropic](/zh/providers/anthropic)。

### 您支持 Claude 订阅身份验证（Claude Pro/Max）吗

是的 - 通过 **setup-token**。OpenClaw 不再重用 Claude Code CLI OAuth 令牌；请使用 setup-token 或 Anthropic API 密钥。在任何地方生成令牌并在Gateway主机上粘贴它。请参阅[Anthropic](/zh/providers/anthropic)和[OAuth](/zh/concepts/oauth)。

注意：Claude 订阅访问受 Anthropic 条款约束。对于生产或多用户工作负载，API 密钥通常是更安全的选择。

### 为什么我看到来自 Anthropic 的 HTTP 429 ratelimiterror

这意味着您的 **Anthropic 配额/速率限制**在当前时间窗口内已用尽。如果您使用**Claude 订阅**（setup-token 或 Claude Code OAuth），请等待时间窗口重置或升级您的计划。如果您使用**Anthropic API 密钥**，请检查 Anthropic 控制台的使用/计费情况并根据需要提高限制。

提示：设置**故障转移模型**，以便在提供商受到速率限制时 OpenClaw 可以继续回复。
请参阅[模型](/zh/cli/models)和[OAuth](/zh/concepts/oauth)。

### 支持 AWS Bedrock 吗

是的 - 通过 pi-ai 的 **Amazon Bedrock (Converse)** 提供商进行**手动配置**。您必须在Gateway主机上提供 AWS 凭据/区域，并在模型配置中添加 Bedrock 提供商标目。请参阅[Amazon Bedrock](/zh/bedrock)和[模型提供商](/zh/providers/models)。如果您更喜欢托管密钥流程，在 Bedrock 前面使用 OpenAI 兼容代理仍然是一个有效的选项。

### Codex 身份验证如何工作

OpenClaw 通过 OAuth（ChatGPT 登录）支持**OpenAI Code (Codex)**。向导可以运行 OAuth 流程，并在适当时将默认模型设置为 `openai-codex/gpt-5.2`。请参阅[模型提供商](/zh/concepts/model-providers)和[向导](/zh/start/wizard)。

### 您支持 OpenAI 订阅身份验证（Codex OAuth）吗

是的。OpenClaw 完全支持**OpenAI Code (Codex) 订阅 OAuth**。入门向导可以为您运行 OAuth 流程。

请参阅[OAuth](/zh/concepts/oauth)、[模型提供商](/zh/concepts/model-providers)和[向导](/zh/start/wizard)。

### 如何设置 Gemini CLI OAuth

Gemini CLI 使用**插件身份验证流程**，而不是 `openclaw.json` 中的客户端 ID 或密钥。

步骤：

1. 启用插件：`openclaw plugins enable google-gemini-cli-auth`
2. 登录：`openclaw models auth login --provider google-gemini-cli --set-default`

这会将 OAuth 令牌存储在Gateway主机上的身份验证配置文件中。详细信息：[模型提供商](/zh/concepts/model-providers)。

### 本地模型可以用于随意聊天吗

通常不可以。OpenClaw 需要大上下文 + 强安全性；小型卡会截断和泄漏。如果必须，请在本地运行您可以运行的**最大** MiniMax M2.1 构建（LM Studio）并查看[/gateway/local-models](/zh/gateway/local-models)。较小/量化的模型会增加提示注入风险 - 请参阅[安全](/zh/gateway/security)。

### 如何将托管模型流量保留在特定区域

选择区域固定的端点。OpenRouter 为 MiniMax、Kimi 和 GLM 提供了美国托管的选项；选择美国托管的变体以将数据保留在区域内。您仍然可以通过使用 `models.mode: "merge"` 并行列出 Anthropic/OpenAI，以便在选择区域提供商时保持故障转移可用。

### 我必须购买 Mac Mini 才能安装此程序吗

不需要。OpenClaw 在 macOS 或 Linux（通过 WSL2 的 Windows）上运行。Mac mini 是可选的 - 有些人购买它作为始终开启的主机，但小型 VPS、家庭服务器或 Raspberry Pi 级别的盒子也可以。

您只需要 Mac **来使用仅限 macOS 的工具**。对于 iMessage，请使用[BlueBubbles](/zh/channels/bluebubbles)（推荐）- BlueBubbles 服务器在任何 Mac 上运行，而Gateway可以在 Linux 或其他地方运行。如果您想要其他仅限 macOS 的工具，请在 Mac 上运行Gateway或配对 macOS 节点。

文档：[BlueBubbles](/zh/channels/bluebubbles)、[节点](/zh/nodes)、[Mac 远程模式](/zh/platforms/mac/remote)。

### 我需要 Mac mini 才能支持 iMessage 吗

您需要**登录到 Messages 的某个 macOS 设备**。它**不**一定是 Mac mini - 任何 Mac 都可以。**使用[BlueBubbles](/zh/channels/bluebubbles)**（推荐）进行 iMessage - BlueBubbles 服务器在 macOS 上运行，而Gateway可以在 Linux 或其他地方运行。

常见设置：

- 在 Linux/VPS 上运行Gateway，并在登录到 Messages 的任何 Mac 上运行 BlueBubbles 服务器。
- 如果您想要最简单的单机设置，请在 Mac 上运行所有内容。

文档：[BlueBubbles](/zh/channels/bluebubbles)、[节点](/zh/nodes)、
[Mac 远程模式](/zh/platforms/mac/remote)。

### 如果我购买 Mac mini 来运行 OpenClaw，可以将其连接到我的 MacBook Pro 吗

可以。**Mac mini 可以运行Gateway**，而您的 MacBook Pro 可以作为**节点**（伴侣设备）连接。节点不运行Gateway - 它们提供额外的功能，如该设备上的屏幕/摄像头/画布和 `system.run`。

常见模式：

- Mac mini 上的Gateway（始终开启）。
- MacBook Pro 运行 macOS 应用或节点主机并配对到Gateway。
- 使用 `openclaw nodes status` / `openclaw nodes list` 查看它。

文档：[节点](/zh/nodes)、[节点 CLI](/zh/cli/nodes)。

### 我可以使用 Bun 吗

**不推荐**使用 Bun。我们看到了运行时错误，特别是 WhatsApp 和 Telegram。
请使用**Node**来获得稳定的Gateway。

如果您仍然想尝试 Bun，请在没有 WhatsApp/Telegram 的非生产Gateway上进行。

### Telegram：allowFrom 中应该填什么

`channels.telegram.allowFrom` 是**人类发送者的 Telegram 用户 ID**（数字，推荐）或 `@username`。它不是机器人用户名。

更安全（无第三方机器人）：

- 向您的机器人发送私信，然后运行 `openclaw logs --follow` 并读取 `from.id`。

官方 Bot API：

- 向您的机器人发送私信，然后调用 `https://api.telegram.org/bot<bot_token>/getUpdates` 并读取 `message.from.id`。

第三方（私密性较低）：

- 向 `@userinfobot` 或 `@getidsbot` 发送私信。

请参阅[/channels/telegram](/zh/channels/telegram#access-control-dms--groups)。

### 多个人可以分别使用不同的 OpenClaw 实例来使用一个 WhatsApp 号码吗

是的，通过**多代理路由**。将每个发送者的 WhatsApp **私信**（对等 `kind: "dm"`，发送者 E.164 如 `+15551234567`）绑定到不同的 `agentId`，以便每个人获得自己的工作区和会话存储。回复仍来自**相同的 WhatsApp 帐户**，并且私信访问控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）对于每个 WhatsApp 帐户是全局的。请参阅[多代理路由](/zh/concepts/multi-agent)和[WhatsApp](/zh/channels/whatsapp)。

### 我可以同时运行"快速聊天"代理和"Opus 编程"代理吗

是的。使用多代理路由：为每个代理提供自己的默认模型，然后将入站路由（提供商帐户或特定对等方）绑定到每个代理。示例配置位于[多代理路由](/zh/concepts/multi-agent)中。另请参阅[模型](/zh/concepts/models)和[配置](/zh/gateway/configuration)。

### Homebrew 在 Linux 上有效吗

是的。Homebrew 支持 Linux（Linuxbrew）。快速设置：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
brew install <formula>
```

如果您通过 systemd 运行 OpenClaw，请确保服务 PATH 包含 `/home/linuxbrew/.linuxbrew/bin`（或您的 brew 前缀），以便 `brew` 安装的工具在非登录 shell 中解析。
最近的构建还在 Linux systemd 服务上预先添加常见的用户 bin 目录（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`）并在设置时遵守 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

### 可破解（git）安装和 npm 安装有什么区别

- **可破解（git）安装：**完整的源代码检出，可编辑，最适合贡献者。
  您在本地运行构建并可以修补代码/文档。
- **npm 安装：**全局 CLI 安装，没有仓库，最适合"只需运行它"。
  更新来自 npm 分发标签。

文档：[入门](/zh/start/getting-started)、[更新](/zh/install/updating)。

### 我以后可以在 npm 和 git 安装之间切换吗

是的。安装其他版本，然后运行 Doctor 以便Gateway服务指向新的入口点。
这**不会删除您的数据** - 它只更改 OpenClaw 代码安装。您的状态
（`~/.openclaw`）和工作区（`~/.openclaw/workspace`）保持不变。

从 npm → git：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
openclaw doctor
openclaw gateway restart
```

从 git → npm：

```bash
npm install -g openclaw@latest
openclaw doctor
openclaw gateway restart
```

Doctor 检测到Gateway服务入口点不匹配，并提议重写服务配置以匹配当前安装（在自动化中使用 `--repair`）。

备份提示：请参阅[备份策略](/zh/help/faq#whats-the-recommended-backup-strategy)。

### 我应该在笔记本电脑还是 VPS 上运行Gateway

简短回答：**如果您希望 24/7 可靠性，请使用 VPS**。如果您希望最低的摩擦力并且可以接受睡眠/重启，请在本地运行。

**笔记本电脑（本地Gateway）**

- **优点：**无服务器成本，直接访问本地文件，实时浏览器窗口。
- **缺点：**睡眠/网络断开 = 断开连接，操作系统更新/重启中断，必须保持清醒。

**VPS / 云端**

- **优点：**始终开启，稳定的网络，无笔记本睡眠问题，更容易保持运行。
- **缺点：**通常无头运行（使用截图），仅远程文件访问，您必须 SSH 进行更新。

**OpenClaw 特定说明：** WhatsApp/Telegram/Slack/Mattermost（插件）/Discord 都可以在 VPS 上正常工作。唯一真正的权衡是**无头浏览器**与可见窗口。请参阅[浏览器](/zh/tools/browser)。

**推荐的默认值：**如果您之前有Gateway断开连接，请使用 VPS。当您主动使用 Mac 并希望本地文件访问或使用可见浏览器进行 UI 自动化时，本地非常好。

### 在专用机器上运行 OpenClaw 有多重要

不是必需的，但**为了可靠性和隔离性而推荐**。

- **专用主机（VPS/Mac mini/Pi）：**始终开启，较少的睡眠/重启中断，更清晰的权限，更容易保持运行。
- **共享笔记本电脑/台式机：**对于测试和主动使用完全没问题，但预期在机器睡眠或更新时会暂停。

如果您想要两全其美，请将Gateway保留在专用主机上，并将您的笔记本电脑配对为**节点**，以进行本地屏幕/摄像头/exec 工具操作。请参阅[节点](/zh/nodes)。
有关安全指南，请阅读[安全](/zh/gateway/security)。

### 最低 VPS 要求和推荐的操作系统是什么

OpenClaw 很轻量。对于基本Gateway + 一个聊天频道：

- **绝对最低要求：** 1 vCPU、1GB RAM、约 500MB 磁盘。
- **推荐：** 1-2 vCPU、2GB RAM 或更多以留有余地（日志、媒体、多个频道）。节点工具和浏览器自动化可能会消耗大量资源。

操作系统：使用**Ubuntu LTS**（或任何现代 Debian/Ubuntu）。Linux 安装路径在那里经过了最好的测试。

文档：[Linux](/zh/platforms/linux)、[VPS 托管](/zh/vps)。

### 我可以在 VM 中运行 OpenClaw 吗，有什么要求

可以。将 VM 视为与 VPS 相同：它需要始终开启、可访问，并且有足够的 RAM 来运行Gateway和您启用的任何频道。

基线指南：

- **绝对最低要求：** 1 vCPU、1GB RAM。
- **推荐：** 2GB RAM 或更多，如果您运行多个频道、浏览器自动化或媒体工具。
- **操作系统：** Ubuntu LTS 或另一个现代 Debian/Ubuntu。

如果您使用的是 Windows，**WSL2 是最简单的 VM 风格设置**，并且具有最佳的工具兼容性。请参阅[Windows](/zh/platforms/windows)、[VPS 托管](/zh/vps)。
如果您在 VM 中运行 macOS，请参阅[macOS VM](/zh/platforms/macos-vm)。

## 什么是 OpenClaw？

### 用一段话描述什么是 OpenClaw

OpenClaw 是一个您在自己的设备上运行的个人 AI 助手。它在您已经使用的消息界面上回复（WhatsApp、Telegram、Slack、Mattermost（插件）、Discord、Google Chat、Signal、iMessage、WebChat），并且可以在支持的平台上进行语音 + 实时 Canvas。**Gateway**是始终开启的控制平面；助手是产品。

### 价值主张是什么

OpenClaw 不仅仅是"一个 Claude 包装器"。它是一个**本地优先的控制平面**，让您可以在**自己的硬件**上运行有能力的助手，从您已经使用的聊天应用程序访问，具有有状态的会话、内存和工具 - 而无需将工作流控制权交给托管 SaaS。

亮点：

- **您的设备，您的数据：** 在您想要的任何地方（Mac、Linux、VPS）运行Gateway，并将工作
  区 + 会话历史保留在本地。
- **真实的频道，而不是 Web 沙箱：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，加上支持平台上的移动语音和 Canvas。
- **模型不可知：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，具有每个代理的路由和故障转移。
- **仅本地选项：** 运行本地模型，因此如果您愿意，**所有数据都可以保留在您的设备上**。
- **多代理路由：** 每个频道、帐户或任务的单独代理，每个都有自己的工作区和默认值。
- **开源和可破解：** 检查、扩展和自托管，而无需供应商锁定。

文档：[Gateway](/zh/gateway)、[频道](/zh/channels)、[多代理](/zh/concepts/multi-agent)、
[内存](/zh/concepts/memory)。

### 我刚刚设置好了，首先应该做什么

好的第一个项目：

- 构建一个网站（WordPress、Shopify 或一个简单的静态站点）。
- 原型制作一个移动应用程序（大纲、屏幕、API 计划）。
- 整理文件和文件夹（清理、命名、标记）。
- 连接 Gmail 并自动化摘要或后续跟进。

它可以处理大型任务，但当您将其分为多个阶段并使用子代理进行并行工作时，它的工作效果最好。

### OpenClaw 的五大日常用例是什么

日常胜利通常看起来像：

- **个人简报：**收件箱、日历和您关心的新闻的摘要。
- **研究和起草：**快速研究、摘要以及电子邮件或文档的初稿。
- **提醒和后续跟进：**由 cron 或心跳驱动的提醒和检查清单。
- **浏览器自动化：**填写表单、收集数据和重复的 Web 任务。
- **跨设备协调：**从手机发送任务，让Gateway在服务器上运行，然后在聊天中取回结果。

### OpenClaw 可以帮助 SaaS 进行潜在客户开发、外联、广告和博客吗

是的，用于**研究、资格审查和起草**。它可以扫描站点、建立候选名单、总结潜在客户，并撰写外联或广告副本草稿。

对于**外联或广告运行**，请保持人工参与。避免垃圾邮件、遵守当地法律和平台政策，并在发送之前审查任何内容。最安全的模式是让 OpenClaw 起草，然后您批准。

文档：[安全](/zh/gateway/security)。

### 与 Claude Code 相比在 Web 开发方面有什么优势

OpenClaw 是一个**个人助理**和协调层，而不是 IDE 替代品。使用 Claude Code 或 Codex 在仓库内进行最快的直接编码循环。当您需要持久的内存、跨设备访问和工具编排时，请使用 OpenClaw。

优势：

- 跨会话的**持久内存 + 工作区**
- **多平台访问**（WhatsApp、Telegram、TUI、WebChat）
- **工具编排**（浏览器、文件、调度、钩子）
- **始终开启的Gateway**（在 VPS 上运行，从任何地方交互）
- 用于本地浏览器/屏幕/摄像头/exec 的**节点**

展示：https://openclaw.ai/showcase

## 技能和自动化

### 如何在保持仓库干净的情况下自定义技能

使用托管覆盖而不是编辑仓库副本。将您的更改放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加文件夹）。优先级是 `<workspace>/skills` > `~/.openclaw/skills` > 捆绑，因此托管覆盖获胜而不触及 git。只有值得上游的编辑才应该存在于仓库中并作为 PR 发出。

### 我可以从自定义文件夹加载技能吗

是的。通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加额外的目录（最低优先级）。默认优先级保持为：`<workspace>/skills` → `~/.openclaw/skills` → 捆绑 → `skills.load.extraDirs`。`clawhub` 默认安装到 `./skills` 中，OpenClaw 将其视为 `<workspace>/skills`。

### 如何为不同的任务使用不同的模型

目前支持的模式是：

- **Cron 作业：**隔离的作业可以为每个作业设置 `model` 覆盖。
- **子代理：**将任务路由到具有不同默认模型的单独代理。
- **按需切换：**使用 `/model` 随时切换当前会话模型。

请参阅[Cron 作业](/zh/automation/cron-jobs)、[多代理路由](/zh/concepts/multi-agent)和[斜杠命令](/zh/tools/slash-commands)。

### 机器人在进行繁重工作时冻结 如何卸载该工作

对长期或并行任务使用**子代理**。子代理在自己的会话中运行，返回摘要，并保持您的主聊天响应。

要求您的机器人"为此任务生成一个子代理"或使用 `/subagents`。
在聊天中使用 `/status` 查看Gateway现在正在做什么（以及它是否忙碌）。

令牌提示：长期任务和子代理都消耗令牌。如果成本是一个问题，请通过 `agents.defaults.subagents.model` 为子代理设置更便宜的模型。

文档：[子代理](/zh/tools/subagents)。

### Cron 或提醒未触发 应该检查什么

Cron 在Gateway进程内运行。如果Gateway没有连续运行，计划的作业将不会运行。

检查清单：

- 确认启用了 cron（`cron.enabled`）并且未设置 `OPENCLAW_SKIP_CRON`。
- 检查Gateway是否 24/7 运行（无睡眠/重启）。
- 验证作业的时区设置（`--tz` 与主机时区）。

调试：

```bash
openclaw cron run <jobId> --force
openclaw cron runs --id <jobId> --limit 50
```

文档：[Cron 作业](/zh/automation/cron-jobs)、[Cron 与心跳](/zh/automation/cron-vs-heartbeat)。

### 如何在 Linux 上安装技能

使用**ClawHub** (CLI) 或将技能放入您的工作区。macOS 技能 UI 在 Linux 上不可用。
在 https://clawhub.com 浏览技能。

安装 ClawHub CLI（选择一个包管理器）：

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

### OpenClaw 可以按计划或在后台连续运行任务吗

是的。使用Gateway调度程序：

- **Cron 作业**用于计划或重复任务（跨重启持久化）。
- **心跳**用于"主会话"定期检查。
- **隔离作业**用于自动代理，它们发布摘要或传递到聊天。

文档：[Cron 作业](/zh/automation/cron-jobs)、[Cron 与心跳](/zh/automation/cron-vs-heartbeat)、
[心跳](/zh/gateway/heartbeat)。

**我可以从 Linux 运行仅限 Apple/macOS 的技能吗**

不能直接运行。macOS 技能受 `metadata.openclaw.os` 以及所需的二进制文件限制，并且只有当它们在**Gateway主机**上有资格时才出现在系统提示中。在 Linux 上，`darwin`-仅限技能（如 `apple-notes`、`apple-reminders`、`things-mac`）将不会加载，除非您覆盖限制。

您有三种支持的模式：

**选项 A - 在 Mac 上运行Gateway（最简单）。**
在存在 macOS 二进制文件的地方运行Gateway，然后通过[远程模式](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere) 或 Tailscale 从 Linux 连接。技能正常加载，因为Gateway主机是 macOS。

**选项 B - 使用 macOS 节点（无需 SSH）。**
在 Linux 上运行Gateway，配对 macOS 节点（菜单栏应用程序），并在 Mac 上将**节点运行命令**设置为"始终询问"或"始终允许"。当节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为有资格。代理通过 `nodes` 工具运行这些技能。如果您选择"始终询问"，在提示中批准"始终允许"会将该命令添加到允许列表。

**选项 C - 通过 SSH 代理 macOS 二进制文件（高级）。**
将Gateway保留在 Linux 上，但使所需的 CLI 二进制文件解析为在 Mac 上运行的 SSH 包装器。然后覆盖技能以允许 Linux，以便它保持有资格。

1. 为二进制文件创建 SSH 包装器（例如：`memo` 用于 Apple Notes）：
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
   ```
2. 将包装器放在 Linux 主机上的 `PATH` 上（例如 `~/bin/memo`）。
3. 覆盖技能元数据（工作区或 `~/.openclaw/skills`）以允许 Linux：
   ```markdown
   ---
   name: apple-notes
   description: Manage Apple Notes via the memo CLI on macOS.
   metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
   ---
   ```
4. 启动一个新会话，以便技能快照刷新。

### 您有 Notion 或 HeyGen 集成吗

目前没有内置。

选项：

- **自定义技能/插件：**最适合可靠的 API 访问（Notion/HeyGen 都有 API）。
- **浏览器自动化：**无需代码即可工作，但速度较慢且更脆弱。

如果您想为每个客户端保留上下文（代理工作流），一个简单的模式是：

- 每个客户端一个 Notion 页面（上下文 + 偏好 + 活跃工作）。
- 要求代理在会话开始时获取该页面。

如果您想要原生集成，请打开功能请求或构建针对这些 API 的技能。

安装技能：

```bash
clawhub install <skill-slug>
clawhub update --all
```

ClawHub 安装到当前目录下的 `./skills` 中（或回退到您配置的 OpenClaw 工作区）；OpenClaw 在下一个会话中将其视为 `<workspace>/skills`。要在代理之间共享技能，请将它们放在 `~/.openclaw/skills/<name>/SKILL.md` 中。某些技能期望通过 Homebrew 安装二进制文件；在 Linux 上，这意味着 Linuxbrew（请参阅上面的 Homebrew Linux FAQ 条目）。请参阅[技能](/zh/tools/skills)和[ClawHub](/zh/tools/clawhub)。

### 如何安装 Chrome 扩展程序以接管浏览器

使用内置安装程序，然后在 Chrome 中加载解压的扩展程序：

```bash
openclaw browser extension install
openclaw browser extension path
```

然后 Chrome → `chrome://extensions` → 启用"开发者模式" → "加载解压的" → 选择该文件夹。

完整指南（包括远程Gateway + 安全说明）：[Chrome 扩展程序](/zh/tools/chrome-extension)

如果Gateway与 Chrome 在同一台机器上运行（默认设置），您通常**不需要**任何额外的东西。
如果Gateway在其他地方运行，请在浏览器机器上运行节点主机，以便Gateway可以代理浏览器操作。
您仍然需要在要控制的选项卡上单击扩展程序按钮（它不会自动附加）。

## 沙箱和内存

### 有专门的沙箱文档吗

是的。请参阅[沙箱](/zh/gateway/sandboxing)。对于 Docker 特定设置（Docker 中的完整Gateway或沙箱映像），请参阅[Docker](/zh/install/docker)。

### Docker 感觉受到限制 如何启用完整功能

默认映像是安全优先的，并作为 `node` 用户运行，因此它不包含系统包、Homebrew 或捆绑的浏览器。为了更完整的设置：

- 使用 `OPENCLAW_HOME_VOLUME` 持久化 `/home/node`，以便缓存能够保留。
- 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 将系统依赖项烘焙到映像中。
- 通过捆绑的 CLI 安装 Playwright 浏览器：
  `node /app/node_modules/playwright-core/cli.js install chromium`
- 设置 `PLAYWRIGHT_BROWSERS_PATH` 并确保持久化路径。

文档：[Docker](/zh/install/docker)、[浏览器](/zh/tools/browser)。

**我可以保持私信私人化，但使用一个代理使群组成为公共沙箱吗**

是的 - 如果您的私人流量是**私信**，而您的公共流量是**群组**。

使用 `agents.defaults.sandbox.mode: "non-main"`，以便群组/频道会话（非主键）在 Docker 中运行，而主私信会话保持在主机上。然后通过 `tools.sandbox.tools` 限制沙箱会话中可用的工具。

设置演练 + 示例配置：[群组：个人私信 + 公共群组](/zh/concepts/groups#pattern-personal-dms-public-groups-single-agent)

关键配置参考：[Gateway配置](/zh/gateway/configuration#agentsdefaultssandbox)

### 如何将主机文件夹绑定到沙箱中

将 `agents.defaults.sandbox.docker.binds` 设置为 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全局 + 每代理绑定合并；当 `scope: "shared"` 时，每代理绑定将被忽略。对任何敏感内容使用 `:ro`，并记住绑定会绕过沙箱文件系统墙。请参阅[沙箱](/zh/gateway/sandboxing#custom-bind-mounts)和[沙箱与工具策略与提升](/zh/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)以获取示例和安全说明。

### 内存如何工作

OpenClaw 内存只是代理工作区中的 Markdown 文件：

- `memory/YYYY-MM-DD.md` 中的每日笔记
- `MEMORY.md` 中的精选长期笔记（仅主/私有会话）

OpenClaw 还运行**静默预压缩内存刷新**，以提醒模型在自动压缩之前写入持久的笔记。这仅在工作区可写时运行（只读沙箱会跳过它）。请参阅[内存](/zh/concepts/memory)。

### 内存总是忘记事情 如何让它记住

要求机器人**将事实写入内存**。长期笔记属于 `MEMORY.md`，短期上下文进入 `memory/YYYY-MM-DD.md`。

这是我们仍在改进的领域。提醒模型存储记忆会有帮助；它会知道该做什么。如果它一直忘记，请验证Gateway在每次运行时使用相同的工作区。

文档：[内存](/zh/concepts/memory)、[代理工作区](/zh/concepts/agent-workspace)。

### 语义内存搜索需要 OpenAI API 密钥吗

仅当您使用**OpenAI 嵌入**时。Codex OAuth 涵盖聊天/完成，并且**不**授予嵌入访问权限，因此**使用 Codex 登录（OAuth 或 Codex CLI 登录）**对语义内存搜索没有帮助。OpenAI 嵌入仍然需要真正的 API 密钥（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

如果您没有明确设置提供商，OpenClaw 会在可以解析 API 密钥（身份验证配置文件、`models.providers.*.apiKey` 或环境变量）时自动选择提供商。
如果解析了 OpenAI 密钥，它更喜欢 OpenAI，否则如果解析了 Gemini 密钥，则更喜欢 Gemini。如果两个密钥都不可用，内存搜索将保持禁用状态，直到您配置它。如果您配置并存在本地模型路径，OpenClaw 更喜欢 `local`。

如果您想保持本地，请设置 `memorySearch.provider = "local"`（并可选择设置
`memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，请设置
`memorySearch.provider = "gemini"` 并提供 `GEMINI_API_KEY`（或
`memorySearch.remote.apiKey`）。我们支持**OpenAI、Gemini 或本地**嵌入
模型 - 有关设置详细信息，请参阅[内存](/zh/concepts/memory)。

### 内存会永久保留吗 有什么限制

内存文件位于磁盘上，并会持久保存直到您删除它们。限制是您的存储空间，而不是模型。**会话上下文**仍然受到模型上下文窗口的限制，因此长对话可能会压缩或截断。这就是内存搜索存在的原因 - 它只将相关部分拉回上下文中。

文档：[内存](/zh/concepts/memory)、[上下文](/zh/concepts/context)。

## 磁盘上的文件位置

### 与 OpenClaw 一起使用的所有数据都保存在本地吗

不 - **OpenClaw 的状态是本地的**，但**外部服务仍然可以看到您发送给它们的内容**。

- **默认本地：**会话、内存文件、配置和工作区位于Gateway主机上（`~/.openclaw` + 您的工作区目录）。
- **必要时的远程：**您发送给模型提供商（Anthropic/OpenAI 等）的消息会发送到它们的 API，聊天平台（WhatsApp/Telegram/Slack 等）在其服务器上存储消息数据。
- **您控制足迹：**使用本地模型会将提示保留在您的机器上，但频道流量仍会通过频道的服务器。

相关：[代理工作区](/zh/concepts/agent-workspace)、[内存](/zh/concepts/memory)。

### OpenClaw 在哪里存储其数据

所有内容都位于 `$OPENCLAW_STATE_DIR` 下（默认：`~/.openclaw`）：

| Path                                                            | Purpose                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------ |
| `$OPENCLAW_STATE_DIR/openclaw.json`                             | Main config (JSON5)                                          |
| `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | Legacy OAuth import (copied into auth profiles on first use) |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Auth profiles (OAuth + API keys)                             |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | Runtime auth cache (managed automatically)                   |
| `$OPENCLAW_STATE_DIR/credentials/`                              | Provider state (e.g. `whatsapp/<accountId>/creds.json`)      |
| `$OPENCLAW_STATE_DIR/agents/`                                   | Per-agent state (agentDir + sessions)                        |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | Conversation history & state (per agent)                     |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Session metadata (per agent)                                 |

旧版单代理路径：`~/.openclaw/agent/*`（通过 `openclaw doctor` 迁移）。

您的**工作区**（AGENTS.md、内存文件、技能等）是分开的，并通过 `agents.defaults.workspace` 配置（默认：`~/.openclaw/workspace`）。

### AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该放在哪里

这些文件位于**代理工作区**中，而不是 `~/.openclaw`。

- **工作区（每个代理）：** `AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
  `MEMORY.md`（或 `memory.md`）、`memory/YYYY-MM-DD.md`、可选的 `HEARTBEAT.md`。
- **状态目录（`~/.openclaw`）：**配置、凭据、身份验证配置文件、会话、日志和共享技能（`~/.openclaw/skills`）。

默认工作区是 `~/.openclaw/workspace`，可通过以下方式配置：

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

如果机器人在重启后"忘记"了，请确认Gateway在每次启动时使用相同的工作区（并记住：远程模式使用**Gateway主机的工作区**，而不是您的本地笔记本电脑）。

提示：如果您想要持久的行为或偏好，请要求机器人**将其写入 AGENTS.md 或 MEMORY.md**，而不是依赖聊天历史。

请参阅[代理工作区](/zh/concepts/agent-workspace)和[内存](/zh/concepts/memory)。

### 推荐的备份策略是什么

将您的**代理工作区**放在**私有**git 仓库中，并在某处私有地备份（例如 GitHub 私有仓库）。这样可以捕获内存 + AGENTS/SOUL/USER 文件，并让您稍后恢复助手的"思维"。

**不要**提交 `~/.openclaw` 下的任何内容（凭据、会话、令牌）。
如果您需要完全恢复，请分别备份工作区和状态目录（请参阅上面的迁移问题）。

文档：[代理工作区](/zh/concepts/agent-workspace)。

### 如何完全卸载 OpenClaw

请参阅专用指南：[卸载](/zh/install/uninstall)。

### 代理可以在工作区外工作吗

可以。工作区是**默认 cwd**和内存锚点，而不是硬性沙箱。
相对路径在工作区内解析，但绝对路径可以访问其他主机位置，除非启用了沙箱。如果您需要隔离，请使用[`agents.defaults.sandbox`](/zh/gateway/sandboxing) 或每代理沙箱设置。如果您
希望仓库成为默认工作目录，请将该代理的
`workspace` 指向仓库根目录。OpenClaw 仓库只是源代码；将工作区分开，除非您故意希望代理在其中工作。

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

### 我处于远程模式 - 会话存储在哪里

会话状态由**Gateway主机**拥有。如果您处于远程模式，您关心的会话存储在远程计算机上，而不是您的本地笔记本电脑。请参阅[会话管理](/zh/concepts/session)。

## 配置基础

### 配置是什么格式？它在哪里？

OpenClaw 从 `$OPENCLAW_CONFIG_PATH` 读取可选的 **JSON5** 配置（默认：`~/.openclaw/openclaw.json`）：

```
$OPENCLAW_CONFIG_PATH
```

如果文件丢失，它使用安全的默认值（包括默认工作区 `~/.openclaw/workspace`）。

### 我设置了 gateway.bind: "lan" 或 "tailnet"，现在什么都没有监听 / UI 显示未授权

非环回绑定**需要身份验证**。配置 `gateway.auth.mode` + `gateway.auth.token`（或使用 `OPENCLAW_GATEWAY_TOKEN`）。

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

- `gateway.remote.token` 仅用于**远程 CLI 调用**；它不启用本地Gateway身份验证。
- 控制 UI 通过 `connect.params.auth.token` 进行身份验证（存储在应用程序/UI 设置中）。避免将令牌放在 URL 中。

### 为什么现在在本地主机上需要令牌？

向导默认生成Gateway令牌（即使在环回上），因此**本地 WS 客户端必须进行身份验证**。这会阻止其他本地进程调用Gateway。将令牌粘贴到控制 UI 设置（或您的客户端配置）中以进行连接。

如果您**真的**想要开放环回，请从配置中删除 `gateway.auth`。Doctor 可以随时为您生成令牌：`openclaw doctor --generate-gateway-token`。

### 更改配置后必须重启吗？

Gateway监视配置并支持热重新加载：

- `gateway.reload.mode: "hybrid"`（默认）：热应用安全更改，为关键更改重启
- 也支持 `hot`、`restart`、`off`

### 如何启用网络搜索和网络获取？

`web_fetch` 无需 API 密钥即可工作。`web_search` 需要 Brave Search API 密钥。**推荐：**运行 `openclaw configure --section web` 将其存储在 `tools.web.search.apiKey` 中。环境替代方案：为Gateway进程设置 `BRAVE_API_KEY`。

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "BRAVE_API_KEY_HERE",
        maxResults: 5,
      },
      fetch: {
        enabled: true,
      },
    },
  },
}
```

注意事项：

- 如果您使用允许列表，请添加 `web_search`/`web_fetch` 或 `group:web`。
- `web_fetch` 默认启用（除非明确禁用）。
- 守护进程从 `~/.openclaw/.env`（或服务环境）读取环境变量。

文档：[Web 工具](/zh/tools/web)。

### 如何使用专门的跨设备工作程序运行中央Gateway？

常见模式是**一个Gateway**（例如 Raspberry Pi）加上**节点**和**代理**：

- **Gateway（中央）：**拥有频道（Signal/WhatsApp）、路由和会话。
- **节点（设备）：** Mac/iOS/Android 作为外设连接并暴露本地工具（`system.run`、`canvas`、`camera`）。
- **代理（工作程序）：**用于特殊角色的单独大脑/工作区（例如"Hetzner 运维"、"个人数据"）。
- **子代理：**当您需要并行性时，从主代理生成后台工作。
- **TUI：**连接到Gateway并切换代理/会话。

文档：[节点](/zh/nodes)、[远程访问](/zh/gateway/remote)、[多代理路由](/zh/concepts/multi-agent)、[子代理](/zh/tools/subagents)、[TUI](/zh/tui)。

### OpenClaw 浏览器可以无头运行吗？

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

默认是 `false`（有头）。无头模式更有可能在某些网站上触发反机器人检查。请参阅[浏览器](/zh/tools/browser)。

无头使用**相同的 Chromium 引擎**并且适用于大多数自动化（表单、点击、抓取、登录）。主要区别：

- 没有可见的浏览器窗口（如果需要视觉效果，请使用截图）。
- 某些网站在无头模式下对自动化更严格（验证码、反机器人）。
  例如，X/Twitter 经常阻止无头会话。

### 如何使用 Brave 进行浏览器控制？

将 `browser.executablePath` 设置为您的 Brave 二进制文件（或任何基于 Chromium 的浏览器）并重启Gateway。
请参阅[浏览器](/zh/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置示例。

## 远程Gateway + 节点

### 命令如何在 Telegram、Gateway和节点之间传播？

Telegram 消息由**Gateway**处理。Gateway运行代理，然后仅在需要节点工具时通过**Gateway WebSocket** 调用节点：

Telegram → Gateway → 代理 → `node.*` → 节点 → Gateway → Telegram

节点看不到入站提供商流量；它们只接收节点 RPC 调用。

### 如果Gateway远程托管，我的代理如何访问我的计算机？

简短回答：**将您的计算机配对为节点**。Gateway在其他地方运行，但它可以通过Gateway WebSocket 在您的本地计算机上调用 `node.*` 工具（屏幕、摄像头、系统）。

典型设置：

1. 在始终开启的主机（VPS/家庭服务器）上运行Gateway。
2. 将Gateway主机 + 您的计算机放在同一个 tailnet 上。
3. 确保Gateway WS 可访问（tailnet 绑定或 SSH 隧道）。
4. 在本地打开 macOS 应用程序并以**通过 SSH 远程**模式连接（或直接 tailnet），以便它可以注册为节点。
5. 在Gateway上批准节点：
   ```bash
   openclaw nodes pending
   openclaw nodes approve <requestId>
   ```

不需要单独的 TCP 网桥；节点通过Gateway WebSocket 连接。

安全提醒：配对 macOS 节点允许该机器上的 `system.run`。仅配对您信任的设备，并查看[安全](/zh/gateway/security)。

文档：[节点](/zh/nodes)、[Gateway协议](/zh/gateway/protocol)、[Mac 远程模式](/zh/platforms/mac/remote)、[安全](/zh/gateway/security)。

### Tailscale 已连接但没有收到回复。现在怎么办？

检查基础知识：

- Gateway正在运行：`openclaw gateway status`
- Gateway运行状况：`openclaw status`
- 频道运行状况：`openclaw channels status`

然后验证身份验证和路由：

- 如果您使用 Tailscale Serve，请确保 `gateway.auth.allowTailscale` 设置正确。
- 如果您通过 SSH 隧道连接，请确认本地隧道已启动并指向正确的端口。
- 确认您的允许列表（私信或群组）包含您的帐户。

文档：[Tailscale](/zh/gateway/tailscale)、[远程访问](/zh/gateway/remote)、[频道](/zh/channels)。

### 两个 OpenClaw 实例可以相互通信吗（本地 + VPS）？

是的。没有内置的"机器人到机器人"网桥，但您可以通过几种可靠的方式连接它：

**最简单：**使用两个机器人都可以访问的正常聊天频道（Telegram/Slack/WhatsApp）。
让机器人 A 向机器人 B 发送消息，然后让机器人 B 像往常一样回复。

**CLI 网桥（通用）：**运行一个脚本，使用 `openclaw agent --message ... --deliver` 调用另一个Gateway，目标是另一个机器人监听的聊天。如果一个机器人在远程 VPS 上，请通过 SSH/Tailscale 将您的 CLI 指向该远程Gateway（请参阅[远程访问](/zh/gateway/remote)）。

示例模式（从可以访问目标Gateway的机器运行）：

```bash
openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
```

提示：添加一个保护措施，以便两个机器人不会无限循环（仅提及、频道允许列表或"不要回复机器人消息"规则）。

文档：[远程访问](/zh/gateway/remote)、[代理 CLI](/zh/cli/agent)、[代理发送](/zh/tools/agent-send)。

### 多个代理是否需要单独的 VPS？

不需要。一个Gateway可以托管多个代理，每个代理都有自己的工作区、模型默认值和路由。这是正常设置，比每个代理运行一个 VPS 便宜得多也更简单。

仅在您需要硬隔离（安全边界）或非常不同的配置且您不想共享时，才使用单独的 VPS。否则，保留一个Gateway并使用多个代理或子代理。

### 在个人笔记本电脑上使用节点而不是从 VPS 使用 SSH 有什么好处？

是的 - 节点是从远程Gateway访问笔记本电脑的首选方式，它们解锁的功能不仅仅是 shell 访问。Gateway在 macOS/Linux（通过 WSL2 的 Windows）上运行，并且很轻量（小型 VPS 或 Raspberry Pi 级别的盒子就可以；4 GB RAM 就足够了），因此常见的设置是始终开启的主机加上作为节点的笔记本电脑。

- **不需要入站 SSH。**节点连接到Gateway WebSocket 并使用设备配对。
- **更安全的执行控制。** `system.run` 由该笔记本电脑上的节点允许列表/批准限制。
- **更多设备工具。**节点除了 `system.run` 之外还暴露 `canvas`、`camera` 和 `screen`。
- **本地浏览器自动化。**将Gateway保留在 VPS 上，但在本地运行 Chrome 并通过 Chrome 扩展程序 + 笔记本电脑上的节点主机中继控制。

SSH 适合临时 shell 访问，但对于持续的代理工作流和设备自动化，节点更简单。

文档：[节点](/zh/nodes)、[节点 CLI](/zh/cli/nodes)、[Chrome 扩展程序](/zh/tools/chrome-extension)。

### 我应该在第二台笔记本电脑上安装还是只添加一个节点？

如果您只需要第二台笔记本电脑上的**本地工具**（屏幕/摄像头/exec），请将其添加为**节点**。这样可以保持单个Gateway并避免重复配置。本地节点工具目前仅限 macOS，但我们计划将它们扩展到其他操作系统。

仅在您需要**硬隔离**或两个完全独立的机器人时才安装第二个Gateway。

文档：[节点](/zh/nodes)、[节点 CLI](/zh/cli/nodes)、[多个Gateway](/zh/gateway/multiple-gateways)。

### 节点运行Gateway服务吗？

不。除非您有意运行隔离的配置文件（请参阅[多个Gateway](/zh/gateway/multiple-gateways)），否则每台主机应只运行**一个Gateway**。节点是连接到Gateway的外设（iOS/Android 节点，或菜单栏应用程序中的 macOS"节点模式"）。对于无头节点主机和 CLI 控制，请参阅[节点主机 CLI](/zh/cli/node)。

`gateway`、`discovery` 和 `canvasHost` 的更改需要完全重启。

### 是否有 API/RPC 方式来应用配置？

是的。`config.apply` 验证 + 写入完整配置并作为操作的一部分重启Gateway。

### config.apply 清除了我的配置。如何恢复并避免这种情况？

`config.apply` 替换**整个配置**。如果您发送部分对象，其他所有内容都将被删除。

恢复：
- 从备份恢复（git 或复制的 `~/.openclaw/openclaw.json`）。
- 如果您没有备份，请重新运行 `openclaw doctor` 并重新配置频道/模型。
- 如果这是意外的，请提交错误并包含您最后已知的配置或任何备份。
- 本地编码代理通常可以根据日志或历史记录重建出可工作的配置。

避免它：

- 使用 `openclaw config set` 进行小更改。
- 使用 `openclaw configure` 进行交互式编辑。

文档：[配置](/zh/cli/config)、[配置](/zh/cli/configure)、[医生](/zh/gateway/doctor)。

### 首次安装的最小"合理"配置是什么？

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

这会设置您的工作区并限制谁可以触发机器人。

### 如何在 VPS 上设置 Tailscale 并从 Mac 连接？

最小步骤：

1. **在 VPS 上安装 + 登录**
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```
2. **在 Mac 上安装 + 登录**
   - 使用 Tailscale 应用程序并登录到同一个 tailnet。
3. **启用 MagicDNS（推荐）**
   - 在 Tailscale 管理控制台中，启用 MagicDNS，以便 VPS 拥有稳定的名称。
4. **使用 tailnet 主机名**
   - SSH：`ssh user@your-vps.tailnet-xxxx.ts.net`
   - Gateway WS：`ws://your-vps.tailnet-xxxx.ts.net:18789`

如果您想要无需 SSH 的控制 UI，请在 VPS 上使用 Tailscale Serve：

```bash
openclaw gateway --tailscale serve
```

这使Gateway保持绑定到环回，并通过 Tailscale 暴露 HTTPS。请参阅[Tailscale](/zh/gateway/tailscale)。

### 如何将 Mac 节点连接到远程Gateway（Tailscale Serve）？

Serve 暴露**Gateway控制 UI + WS**。节点通过同一Gateway WS 端点连接。

推荐设置：

1. **确保 VPS + Mac 在同一个 tailnet 上。**
2. **在远程模式下使用 macOS 应用程序**（SSH 目标可以是 tailnet 主机名）。
   应用程序将隧道Gateway端口并作为节点连接。
3. **在Gateway上批准节点**：
   ```bash
   openclaw nodes pending
   openclaw nodes approve <requestId>
   ```

文档：[Gateway协议](/zh/gateway/protocol)、[发现](/zh/gateway/discovery)、[Mac 远程模式](/zh/platforms/mac/remote)。

## 环境变量和 .env 加载

### OpenClaw 如何加载环境变量？

OpenClaw 从父进程（shell、launchd/systemd、CI 等）读取环境变量，并额外加载：

- 来自当前工作目录的 `.env`
- 来自 `~/.openclaw/.env`（又名 `$OPENCLAW_STATE_DIR/.env`）的全局回退 `.env`

`.env` 文件不会覆盖现有的环境变量。

您还可以在配置中定义内联环境变量（仅当进程环境中缺少时才应用）：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

有关完整的优先级和来源，请参阅[/environment](/zh/environment)。

### 我通过服务启动了Gateway，我的环境变量消失了。现在怎么办？

两个常见的修复方法：

1. 将缺少的密钥放在 `~/.openclaw/.env` 中，这样即使服务不继承您的 shell 环境也会被拾取。
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

这会运行您的登录 shell 并仅导入缺少的预期密钥（从不覆盖）。环境变量等效项：`OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

### 我设置了 COPILOT_GITHUB_TOKEN，但模型状态显示 Shell env: off。为什么？

`openclaw models status` 报告**shell env 导入**是否启用。"Shell env: off"并**不**意味着您的环境变量丢失 - 它只是意味着 OpenClaw 不会自动加载您的登录 shell。

如果Gateway作为服务（launchd/systemd）运行，它不会继承您的 shell 环境。通过执行以下操作之一进行修复：

1. 将令牌放在 `~/.openclaw/.env` 中：
   ```
   COPILOT_GITHUB_TOKEN=...
   ```
2. 或启用 shell 导入（`env.shellEnv.enabled: true`）。
3. 或将其添加到您的配置 `env` 块中（仅在缺少时应用）。

然后重启Gateway并重新检查：

```bash
openclaw models status
```

Copilot 令牌从 `COPILOT_GITHUB_TOKEN` 读取（也支持 `GH_TOKEN` / `GITHUB_TOKEN`）。
请参阅[/concepts/model-providers](/zh/concepts/model-providers)和[/environment](/zh/environment)。

## 会话和多重聊天

### 如何开始新对话？

发送 `/new` 或 `/reset` 作为独立消息。请参阅[会话管理](/zh/concepts/session)。

### 如果我从不发送 /new，会话会自动重置吗？

是的。会话在 `session.idleMinutes` 后过期（默认**60**）。**下**一条消息将为该聊天键启动新的会话 ID。这不会删除记录 - 它只是开始一个新会话。

```json5
{
  session: {
    idleMinutes: 240,
  },
}
```

### 有没有办法让一组 OpenClaw 实例成为一个 CEO 和多个代理？

是的，通过**多代理路由**和**子代理**。您可以创建一个协调器代理和几个工作代理代理，它们拥有自己的工作区和模型。

也就是说，这最好被视为一个**有趣的实验**。它消耗大量令牌，并且通常比使用一个具有单独会话的机器人效率更低。我们设想的典型模型是一个您与之交谈的机器人，并为并行工作使用不同的会话。该机器人在需要时也可以生成子代理。

文档：[多代理路由](/zh/concepts/multi-agent)、[子代理](/zh/tools/subagents)、[代理 CLI](/zh/cli/agents)。

### 为什么上下文在任务中途被截断了？如何防止这种情况？

会话上下文受模型窗口限制。长对话、大型工具输出或许多文件可能触发压缩或截断。

有帮助的方法：

- 要求机器人总结当前状态并将其写入文件。
- 在长任务之前使用 `/compact`，在切换主题时使用 `/new`。
- 将重要上下文保留在工作区中，并要求机器人读回它。
- 对长时间或并行工作使用子代理，以便主聊天保持较小。
- 如果这种情况经常发生，请选择具有更大上下文窗口的模型。

### 如何完全重置 OpenClaw 但保持已安装状态？

使用重置命令：

```bash
openclaw reset
```

非交互式完全重置：

```bash
openclaw reset --scope full --yes --non-interactive
```

然后重新运行入门向导：

```bash
openclaw onboard --install-daemon
```

注意事项：

- 如果入门向导看到现有配置，它也会提供**重置**选项。请参阅[向导](/zh/start/wizard)。
- 如果您使用了配置文件（`--profile` / `OPENCLAW_PROFILE`），请重置每个状态目录（默认为 `~/.openclaw-<profile>`）。
- 开发重置：`openclaw gateway --dev --reset`（仅限开发；清除开发配置 + 凭证 + 会话 + 工作区）。

### 我收到上下文过大错误，如何重置或压缩？

使用以下方法之一：

- **压缩**（保留对话但总结较早的轮次）：

  ```
  /compact
  ```

  or   or   or   or ` 指导总结。

- **重置**（为同一聊天键创建新的会话 ID）：
  ```
  /new
  /reset
  ```

如果持续发生这种情况：

- 启用或调整**会话修剪**（`agents.defaults.contextPruning`）以修剪旧的工具输出。
- 使用具有更大上下文窗口的模型。

文档：[压缩](/zh/concepts/compaction)、[会话修剪](/zh/concepts/session-pruning)、[会话管理](/zh/concepts/session)。

### 为什么我收到"LLM request rejected"消息："content.tool_use.input Field required"？

这是提供商验证错误：模型发出的 `tool_use` 块没有必需的 `input`。这通常意味着会话历史已过期或损坏（通常在长线程或工具/架构更改后）。

修复方法：使用 `/new` 启动新会话（独立消息）。

### 为什么我每 30 分钟收到一次心跳消息？

心跳默认每 **30 分钟**运行一次。您可以调整或禁用它们：

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

如果 `HEARTBEAT.md` 存在但实际上是空的（只有空行和 `# Heading` 这样的 markdown 标题），OpenClaw 将跳过心跳运行以节省 API 调用。如果文件缺失，心跳仍会运行，由模型决定做什么。

每个代理的覆盖使用 `agents.list[].heartbeat`。文档：[心跳](/zh/gateway/heartbeat)。

### 我需要将机器人帐户添加到 WhatsApp 群组吗？

不需要。OpenClaw 在**您自己的帐户**上运行，所以如果您在群组中，OpenClaw 就可以看到它。默认情况下，在您允许发送者（`groupPolicy: "allowlist"`）之前，群组回复会被阻止。

如果您只想让**您自己**能够触发群组回复：

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

### 如何获取 WhatsApp 群组的 JID？

选项 1（最快）：在日志中查找并在群组中发送测试消息：

```bash
openclaw logs --follow --json
```

查找以 `@g.us` 结尾的 `chatId`（或 `from`），例如：`1234567890-1234567890@g.us`。

选项 2（如果已配置/加入白名单）：从配置中列出群组：

```bash
openclaw directory groups list --channel whatsapp
```

文档：[WhatsApp](/zh/channels/whatsapp)、[目录](/zh/cli/directory)、[日志](/zh/cli/logs)。

### 为什么 OpenClaw 不在群组中回复？

两个常见原因：

- 提及门控已开启（默认）。您必须 @提及机器人（或匹配 `mentionPatterns`）。
- 您配置了 `channels.whatsapp.groups` 但没有 `"*"`，并且群组不在白名单中。

请参阅[群组](/zh/concepts/groups) 和[群组消息](/zh/concepts/group-messages)。

### 群组/线程是否与私信共享上下文？

直接聊天默认折叠到主会话。群组/频道有自己的会话密钥，Telegram 主题/Discord 线程是独立的会话。请参阅[群组](/zh/concepts/groups) 和[群组消息](/zh/concepts/group-messages)。

### 我可以创建多少个工作区和代理？

没有硬性限制。几十个（甚至几百个）都可以，但请注意：

- **磁盘增长：**会话 + 转录存储在 `~/.openclaw/agents/<agentId>/sessions/` 下。
- **令牌成本：**更多的代理意味着更多的并发模型使用。
- **运维开销：**每个代理的身份验证配置文件、工作区和频道路由。

提示：

- 为每个代理保留一个**活跃的**工作区（`agents.defaults.workspace`）。
- 如果磁盘增长，请修剪旧会话（删除 JSONL 或存储条目）。
- 使用 `openclaw doctor` 来发现孤立的工作区和配置文件不匹配。

### 我可以同时运行多个机器人或聊天（包括 Slack）吗？应该如何设置？

是的。使用**多代理路由**运行多个隔离的代理，并按频道/帐户/对等方路由入站消息。Slack 作为频道受支持，并且可以绑定到特定代理。

浏览器访问功能强大，但不是"可以做人类能做的任何事"——反机器人、验证码和多因素认证仍然可以阻止自动化。为了最可靠的浏览器控制，请在运行浏览器的计算机上使用 Chrome 扩展程序中继（并且可以将Gateway保留在任何地方）。

最佳实践设置：

- 始终在线的Gateway主机（VPS/Mac mini）。
- 每个角色一个代理（绑定）。
- 绑定到这些代理的 Slack 频道。
- 需时通过扩展中继（或节点）使用本地浏览器。

文档：[多代理路由](/zh/concepts/multi-agent)、[Slack](/zh/channels/slack)、[浏览器](/zh/tools/browser)、[Chrome 扩展程序](/zh/tools/chrome-extension)、[节点](/zh/nodes)。

## 模型：默认值、选择、别名、切换

### 什么是默认模型？

OpenClaw 的默认模型是您设置为：

```
agents.defaults.model.primary
```

模型被引用为 `provider/model`（例如：`anthropic/claude-opus-4-5`）。如果省略提供商，OpenClaw 当前假设 `anthropic` 作为临时弃用回退——但您仍然应该**显式**设置 `provider/model`。

### 您推荐什么模型？

**推荐默认：** `anthropic/claude-opus-4-5`。
**良好的替代方案：** `anthropic/claude-sonnet-4-5`。
**可靠（较少个性）：** `openai/gpt-5.2` - 几乎与 Opus 一样好，只是个性较少。
**预算：** `zai/glm-4.7`。

MiniMax M2.1 有自己的文档：[MiniMax](/zh/providers/minimax) 和[本地模型](/zh/gateway/local-models)。

经验法则：对于高风险工作，使用您能负担得起的**最佳模型**，对于常规聊天或摘要，使用更便宜的模型。您可以为每个代理路由模型，并使用子代理来并行化长任务（每个子代理消耗令牌）。请参阅[模型](/zh/concepts/models) 和[子代理](/zh/tools/subagents)。

强烈警告：较弱/过度量化的模型更容易受到提示注入和不安全行为的影响。请参阅[安全](/zh/gateway/security)。

更多上下文：[模型](/zh/concepts/models)。

### 我可以使用自托管模型（llama.cpp、vLLM、Ollama）吗？

是的。如果您的本地服务器暴露了与 OpenAI 兼容的 API，您可以指向一个自定义提供商。直接支持 Ollama，这是最简单的路径。

安全说明：较小或大量量化的模型更容易受到提示注入。对于任何可以使用工具的机器人，我们强烈建议使用**大型模型**。如果您仍然想要小型模型，请启用沙箱和严格的工具允许列表。

文档：[Ollama](/zh/providers/ollama)、[本地模型](/zh/gateway/local-models)、[模型提供商](/zh/concepts/model-providers)、[安全](/zh/gateway/security)、[沙箱](/zh/gateway/sandboxing)。

### 如何切换模型而不清除配置？

使用**模型命令**或仅编辑**模型**字段。避免完全替换配置。

安全选项：

- 聊天中的 `/model`（快速，每会话）
- `openclaw models set ...`（仅更新模型配置）
- `openclaw configure --section models`（交互式）
- 在 `~/.openclaw/openclaw.json` 中编辑 `agents.defaults.model`

除非您打算替换整个配置，否则避免使用部分对象的 `config.apply`。如果您确实覆盖了配置，请从备份恢复或重新运行 `openclaw doctor` 进行修复。

文档：[模型](/zh/concepts/models)、[配置](/zh/cli/configure)、[配置](/zh/cli/config)、[医生](/zh/gateway/doctor)。

### OpenClaw、Flawd 和 Krill 使用什么模型？

- **OpenClaw + Flawd：** Anthropic Opus（`anthropic/claude-opus-4-5`）- 请参阅[Anthropic](/zh/providers/anthropic)。
- **Krill：** MiniMax M2.1（`minimax/MiniMax-M2.1`）- 请参阅[MiniMax](/zh/providers/minimax)。

### 如何在不重启的情况下即时切换模型？

使用 `/model` 命令作为独立消息：

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

`/model`（和 `/model list`）显示一个紧凑的编号选择器。按编号选择：

```
/model 3
```

您还可以为提供商强制特定的身份验证配置文件（每会话）：

```
/model opus@anthropic:default
/model opus@anthropic:work
```

提示：`/model status` 显示哪个代理处于活动状态，正在使用哪个 `auth-profiles.json` 文件，以及下次将尝试哪个身份验证配置文件。它还在可用时显示配置的提供商端点（`baseUrl`）和 API 模式（`api`）。

**如何取消固定我使用配置文件设置的配置文件？**

**不**带 `@profile` 后缀重新运行 `/model`：

```
/model anthropic/claude-opus-4-5
```

如果您想返回默认值，请从 `/model` 中选择它（或发送 `/model <default provider/model>`）。使用 `/model status` 确认哪个身份验证配置文件处于活动状态。

### 我可以将 GPT 5.2 用于日常任务，将 Codex 5.2 用于编码吗？

是的。将一个设置为默认值并根据需要切换：

- **快速切换（每会话）：** `/model gpt-5.2` 用于日常任务，`/model gpt-5.2-codex` 用于编码。
- **默认 + 切换：** 将 `agents.defaults.model.primary` 设置为 `openai-codex/gpt-5.2`，然后在编码时切换到 `openai-codex/gpt-5.2-codex`（或反之亦然）。
- **子代理：** 将编码任务路由到具有不同默认模型的子代理。

请参阅[模型](/zh/concepts/models) 和[斜杠命令](/zh/tools/slash-commands)。

### 为什么我看到"Model is not allowed"然后没有回复？

如果设置了 `agents.defaults.models`，它将成为 `/model` 和任何会话覆盖的**白名单**。选择不在该列表中的模型将返回：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

该错误**而不是**正常回复返回。修复方法：将模型添加到 `agents.defaults.models`，删除白名单，或从 `/model list` 中选择模型。

### 为什么我看到"Unknown model minimaxMiniMaxM21"？

这意味着**提供商未配置**（未找到 MiniMax 提供商配置或身份验证配置文件），因此无法解析模型。此检测的修复在 **2026.1.12** 中（撰写本文时未发布）。

修复清单：

1. 升级到 **2026.1.12**（或从源 `main` 运行），然后重启Gateway。
2. 确保已配置 MiniMax（向导或 JSON），或环境中存在 MiniMax API 密钥/身份验证配置文件，以便可以注入提供商。
3. 使用确切的模型 ID（区分大小写）：`minimax/MiniMax-M2.1` 或 `minimax/MiniMax-M2.1-lightning`。
4. 运行：
   ```bash
   openclaw models list
   ```
   并从列表中选择（或在聊天中运行 `/model list`）。

请参阅[MiniMax](/zh/providers/minimax) 和[模型](/zh/concepts/models)。

### 我可以将 MiniMax 作为默认模型，将 OpenAI 用于复杂任务吗？

是的。使用 **MiniMax 作为默认模型**并根据需要**每会话**切换模型。回退用于**错误**，而不是"困难任务"，因此请使用 `/model` 或单独的代理。

**选项 A：每会话切换**

```json5
{
  env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "minimax/MiniMax-M2.1" },
      models: {
        "minimax/MiniMax-M2.1": { alias: "minimax" },
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
- 按代理路由或使用 `/agent` 切换

文档：[模型](/zh/concepts/models)、[多代理路由](/zh/concepts/multi-agent)、[MiniMax](/zh/providers/minimax)、[OpenAI](/zh/providers/openai)。

### opus、sonnet、gpt 是内置快捷方式吗？

是的。OpenClaw 附带了一些默认简写（仅当模型存在于 `agents.defaults.models` 中时才应用）：

- `opus` → `anthropic/claude-opus-4-5`
- `sonnet` → `anthropic/claude-sonnet-4-5`
- `gpt` → `openai/gpt-5.2`
- `gpt-mini` → `openai/gpt-5-mini`
- `gemini` → `google/gemini-3-pro-preview`
- `gemini-flash` → `google/gemini-3-flash-preview`

如果您使用相同的名称设置自己的别名，您的值将优先。

### 如何定义/覆盖模型快捷方式（别名）？

别名来自 `agents.defaults.models.<modelId>.alias`。例如：

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-opus-4-5" },
      models: {
        "anthropic/claude-opus-4-5": { alias: "opus" },
        "anthropic/claude-sonnet-4-5": { alias: "sonnet" },
        "anthropic/claude-haiku-4-5": { alias: "haiku" },
      },
    },
  },
}
```

然后 `/model sonnet`（或在支持时使用 `/<alias>`）解析为该模型 ID。

### 如何添加来自其他提供商（如 OpenRouter 或 ZAI）的模型？

OpenRouter（按令牌付费；多种模型）：

```json5
{
  agents: {
    defaults: {
      model: { primary: "openrouter/anthropic/claude-sonnet-4-5" },
      models: { "openrouter/anthropic/claude-sonnet-4-5": {} },
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
      model: { primary: "zai/glm-4.7" },
      models: { "zai/glm-4.7": {} },
    },
  },
  env: { ZAI_API_KEY: "..." },
}
```

如果您引用提供商/模型但缺少所需的提供商密钥，您将收到运行时身份验证错误（例如 `No API key found for provider "zai"`）。

**添加新代理后未找到提供商的 API 密钥**

这通常意味着**新代理**有一个空的身份验证存储。身份验证是每个代理单独的，存储在：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

修复选项：

- 运行 `openclaw agents add <id>` 并在向导期间配置身份验证。
- 或将 `auth-profiles.json` 从主代理的 `agentDir` 复制到新代理的 `agentDir`。

请**勿**在代理之间重用 `agentDir`；它会导致身份验证/会话冲突。

## 模型故障转移和"All models failed"

### 故障转移如何工作？

故障转移分两个阶段进行：

1. **身份验证配置文件轮换**在同一提供商内。
2. **模型回退**到 `agents.defaults.model.fallbacks` 中的下一个模型。

冷却适用于失败的配置文件（指数退避），因此即使提供商受到速率限制或暂时失败，OpenClaw 也能继续响应。

### 这个错误是什么意思？

```
No credentials found for profile "anthropic:default"
```

这意味着系统尝试使用身份验证配置文件 ID `anthropic:default`，但在预期的身份验证存储中找不到它的凭证。

### "No credentials found for profile anthropicdefault"的修复清单

- **确认身份验证配置文件的位置**（新路径与旧路径）
  - 当前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - 旧版：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）
- **确认您的环境变量由Gateway加载**
  - 如果您在 shell 中设置了 `ANTHROPIC_API_KEY` 但通过 systemd/launchd 运行Gateway，它可能不会继承它。将其放在 `~/.openclaw/.env` 中或启用 `env.shellEnv`。
- **确保您正在编辑正确的代理**
  - 多代理设置意味着可以有多个 `auth-profiles.json` 文件。
- **健全性检查模型/身份验证状态**
  - 使用 `openclaw models status` 查看配置的模型以及提供商是否已通过身份验证。

**"No credentials found for profile anthropic"的修复清单**

这意味着运行固定到 Anthropic 身份验证配置文件，但Gateway在其身份验证存储中找不到它。

- **使用设置令牌**
  - 运行 `claude setup-token`，然后使用 `openclaw models auth setup-token --provider anthropic` 粘贴它。
  - 如果令牌是在另一台机器上创建的，请使用 `openclaw models auth paste-token --provider anthropic`。
- **如果您想使用 API 密钥**
  - 将 `ANTHROPIC_API_KEY` 放在**Gateway主机**上的 `~/.openclaw/.env` 中。
  - 清除任何强制缺少配置文件的固定顺序：
    ```bash
    openclaw models auth order clear --provider anthropic
    ```
- **确认您在Gateway主机上运行命令**
  - 在远程模式下，身份验证配置文件存在于Gateway计算机上，而不是您的笔记本电脑上。

### 为什么它也尝试 Google Gemini 并失败了？

如果您的模型配置包含 Google Gemini 作为回退（或者您切换到了 Gemini 简写），OpenClaw 将在模型回退期间尝试它。如果您尚未配置 Google 凭证，您将看到 `No API key found for provider "google"`。

修复方法：提供 Google 身份验证，或者在 `agents.defaults.model.fallbacks` / 别名中删除/避免 Google 模型，以便回退不会路由到那里。

**"LLM request rejected: thinking signature required (google:antigravity)"消息**

原因：会话历史包含**没有签名的思考块**（通常来自中止/部分流）。Google Antigravity 要求思考块具有签名。

修复方法：OpenClaw 现在会为 Google Antigravity Claude 剥离未签名的思考块。如果仍然出现，请启动**新会话**或为该代理设置 `/thinking off`。

## 身份验证配置文件：它们是什么以及如何管理它们

相关：[/concepts/oauth](/zh/concepts/oauth)（OAuth 流、令牌存储、多帐户模式）

### 什么是身份验证配置文件？

身份验证配置文件是绑定到提供商的命名凭证记录（OAuth 或 API 密钥）。配置文件位于：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

### 典型的配置文件 ID 是什么？

OpenClaw 使用提供商前缀的 ID，例如：

- `anthropic:default`（当不存在电子邮件身份时常见）
- `anthropic:<email>` 用于 OAuth 身份
- 您选择的自定义 ID（例如 `anthropic:work`）

### 我可以控制首先尝试哪个身份验证配置文件吗？

是的。配置支持配置文件的可选元数据和每个提供商的排序（`auth.order.<provider>`）。这**不**存储机密；它将 ID 映射到提供商/模式并设置轮换顺序。

OpenClaw 如果配置文件处于短暂的**冷却**（速率限制/超时/身份验证失败）或更长的**禁用**状态（计费/积分不足），可能会暂时跳过它。要检查这一点，请运行 `openclaw models status --json` 并检查 `auth.unusableProfiles`。调整：`auth.cooldowns.billingBackoffHours*`。

您还可以通过 CLI 设置**每个代理**的顺序覆盖（存储在该代理的 `auth-profiles.json` 中）：

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

### OAuth 与 API 密钥有什么区别？

OpenClaw 同时支持两者：

- **OAuth** 通常利用订阅访问权限（如适用）。
- **API 密钥**使用按令牌付费的计费。

向导明确支持 Anthropic setup-token 和 OpenAI Codex OAuth，并且可以为您存储 API 密钥。

## Gateway：端口、"already running"和远程模式

### Gateway使用什么端口？

`gateway.port` 控制 WebSocket + HTTP（控制 UI、钩子等）的单个多路复用端口。

优先级：

```
--port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
```

### 为什么 openclaw gateway status 显示"Runtime running"但"RPC probe failed"？

因为"running"是**主管**的视图（launchd/systemd/schtasks）。RPC 探测是实际连接到Gateway WebSocket 并调用 `status` 的 CLI。

使用 `openclaw gateway status` 并信任以下行：

- `Probe target:`（探测实际使用的 URL）
- `Listening:`（端口上实际绑定的内容）
- `Last gateway error:`（进程存活但端口未监听时的常见根本原因）

### 为什么 openclaw gateway status 显示"Config cli"和"Config service"不同？

您正在编辑一个配置文件，而服务正在运行另一个（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

修复方法：

```bash
openclaw gateway install --force
```

从您希望服务使用的相同 `--profile` / 环境运行该命令。

### "another gateway instance is already listening"是什么意思？

OpenClaw 通过在启动时立即绑定 WebSocket 侦听器（默认 `ws://127.0.0.1:18789`）来强制执行运行时锁定。如果绑定失败并显示 `EADDRINUSE`，它将抛出 `GatewayLockError`，表示另一个实例已在侦听。

修复方法：停止另一个实例，释放端口，或使用 `openclaw gateway --port <port>` 运行。

### 如何在远程模式下运行 OpenClaw（客户端连接到其他地方的Gateway）？

设置 `gateway.mode: "remote"` 并指向远程 WebSocket URL，可以选择使用令牌/密码：

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

- `openclaw gateway` 仅在 `gateway.mode` 为 `local` 时启动（或您传递覆盖标志）。
- macOS 应用程序会监视配置文件，并在这些值更改时实时切换模式。

### 控制显示"unauthorized"或不断重新连接。现在怎么办？

您的Gateway在启用了身份验证（`gateway.auth.*`）的情况下运行，但 UI 没有发送匹配的令牌/密码。

事实（来自代码）：

- 控制 UI 将令牌存储在浏览器 localStorage 密钥 `openclaw.control.settings.v1` 中。
- UI 可以导入 `?token=...`（和/或 `?password=...`）一次，然后将其从 URL 中剥离。

修复方法：

- 最快：`openclaw dashboard`（打印 + 复制令牌化链接，尝试打开；如果是无头模式则显示 SSH 提示）。
- 如果您还没有令牌：`openclaw doctor --generate-gateway-token`。
- 如果是远程，首先建立隧道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/?token=...`。
- 在Gateway主机上设置 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 在控制 UI 设置中，粘贴相同的令牌（或使用一次性 `?token=...` 链接刷新）。
- 仍然卡住了？运行 `openclaw status --all` 并按照[故障排除](/zh/gateway/troubleshooting) 操作。有关身份验证详细信息，请参阅[仪表板](/zh/web/dashboard)。

### 我设置了 gateway.bind tailnet，但它无法绑定，什么也没有监听

`tailnet` 绑定从您的网络接口（100.64.0.0/10）中选择一个 Tailscale IP。如果机器不在 Tailscale 上（或接口已关闭），则没有任何东西可以绑定。

修复方法：

- 在该主机上启动 Tailscale（因此它具有 100.x 地址），或
- 切换到 `gateway.bind: "loopback"` / `"lan"`。

注意：`tailnet` 是显式的。`auto` 优先使用环回；当您想要仅 tailnet 绑定时使用 `gateway.bind: "tailnet"`。

### 我可以在同一主机上运行多个Gateway吗？

通常不需要 - 一个Gateway可以运行多个消息频道和代理。仅在您需要冗余（例如：救援机器人）或硬隔离时才使用多个Gateway。

是的，但您必须隔离：

- `OPENCLAW_CONFIG_PATH`（每个实例的配置）
- `OPENCLAW_STATE_DIR`（每个实例的状态）
- `agents.defaults.workspace`（工作区隔离）
- `gateway.port`（唯一端口）

快速设置（推荐）：

- 每个实例使用 `openclaw --profile <name> …`（自动创建 `~/.openclaw-<name>`）。
- 在每个配置文件配置中设置唯一的 `gateway.port`（或为手动运行传递 `--port`）。
- 安装每个配置文件的服务：`openclaw --profile <name> gateway install`。

配置文件也会为服务名称添加后缀（`bot.molt.<profile>`；旧版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
完整指南：[多个Gateway](/zh/gateway/multiple-gateways)。

### "invalid handshake code 1008"是什么意思？

Gateway是一个 **WebSocket 服务器**，它期望第一条消息是 `connect` 帧。如果它收到其他任何内容，它将使用 **代码 1008**（策略违规）关闭连接。

常见原因：

- 您在浏览器中打开了 **HTTP** URL（`http://...`）而不是 WS 客户端。
- 您使用了错误的端口或路径。
- 代理或隧道剥离了身份验证标头或发送了非Gateway请求。

快速修复：

1. 使用 WS URL：`ws://<host>:18789`（如果是 HTTPS 则使用 `wss://...`）。
2. 不要在普通浏览器标签页中打开 WS 端口。
3. 如果启用了身份验证，请在 `connect` 帧中包含令牌/密码。

如果您使用 CLI 或 TUI，URL 应类似于：

```
openclaw tui --url ws://<host>:18789 --token <token>
```

协议详细信息：[Gateway协议](/zh/gateway/protocol)。

## 日志记录和调试

### 日志在哪里？

文件日志（结构化）：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

您可以通过 `logging.file` 设置稳定的路径。文件日志级别由 `logging.level` 控制。控制台详细程度由 `--verbose` 和 `logging.consoleLevel` 控制。

最快的日志跟踪：

```bash
openclaw logs --follow
```

服务/主管日志（当Gateway通过 launchd/systemd 运行时）：

- macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（默认：`~/.openclaw/logs/...`；配置文件使用 `~/.openclaw-<profile>/logs/...`）
- Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
- Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

详见[故障排除](/zh/gateway/troubleshooting#log-locations)。

### 如何启动/停止/重启Gateway服务？

使用Gateway助手：

```bash
openclaw gateway status
openclaw gateway restart
```

如果您手动运行Gateway，`openclaw gateway --force` 可以回收端口。请参阅[Gateway](/zh/gateway)。

### 我在 Windows 上关闭了终端，如何重启 OpenClaw？

有**两种 Windows 安装模式**：

**1) WSL2（推荐）：**Gateway在 Linux 内运行。

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

**2) 本机 Windows（不推荐）：**Gateway直接在 Windows 中运行。

打开 PowerShell 并运行：

```powershell
openclaw gateway status
openclaw gateway restart
```

如果您手动运行它（没有服务），请使用：

```powershell
openclaw gateway run
```

文档：[Windows (WSL2)](/zh/platforms/windows)、[Gateway服务运行手册](/zh/gateway)。

### Gateway已启动但回复从未到达。我应该检查什么？

首先进行快速健康扫描：

```bash
openclaw status
openclaw models status
openclaw channels status
openclaw logs --follow
```

常见原因：

- 模型身份验证未在**Gateway主机**上加载（检查 `models status`）。
- 频道配对/白名单阻止回复（检查频道配置 + 日志）。
- WebChat/仪表板在没有正确令牌的情况下打开。

如果您是远程的，请确认隧道/Tailscale 连接已建立并且Gateway WebSocket 可访问。

文档：[频道](/zh/channels)、[故障排除](/zh/gateway/troubleshooting)、[远程访问](/zh/gateway/remote)。

### 与Gateway断开连接，没有原因。现在怎么办？

这通常意味着 UI 失去了 WebSocket 连接。检查：

1. Gateway是否正在运行？`openclaw gateway status`
2. Gateway是否健康？`openclaw status`
3. UI 是否有正确的令牌？`openclaw dashboard`
4. 如果是远程，隧道/Tailscale 链接是否已建立？

然后跟踪日志：

```bash
openclaw logs --follow
```

文档：[仪表板](/zh/web/dashboard)、[远程访问](/zh/gateway/remote)、[故障排除](/zh/gateway/troubleshooting)。

### Telegram setMyCommands 失败并显示网络错误。我应该检查什么？

首先从日志和频道状态开始：

```bash
openclaw channels status
openclaw channels logs --channel telegram
```

如果您在 VPS 上或在代理后面，请确认允许出站 HTTPS 并且 DNS 工作。如果Gateway是远程的，请确保您正在查看Gateway主机上的日志。

文档：[Telegram](/zh/channels/telegram)、[频道故障排除](/zh/channels/troubleshooting)。

### TUI 显示无输出。我应该检查什么？

首先确认Gateway可访问并且代理可以运行：

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

在 TUI 中，使用 `/status` 查看当前状态。如果您希望在聊天频道中收到回复，请确保已启用传递（`/deliver on`）。

文档：[TUI](/zh/tui)、[斜杠命令](/zh/tools/slash-commands)。

### 如何完全停止然后启动Gateway？

如果您安装了服务：

```bash
openclaw gateway stop
openclaw gateway start
```

这将停止/启动**受监管的服务**（macOS 上的 launchd，Linux 上的 systemd）。当Gateway作为守护程序在后台运行时，请使用此方法。

如果您在前台运行，请使用 Ctrl-C 停止，然后：

```bash
openclaw gateway run
```

文档：[Gateway服务运行手册](/zh/gateway)。

### ELI5：openclaw gateway restart 与 openclaw gateway 的区别

- `openclaw gateway restart`：重启**后台服务**（launchd/systemd）。
- `openclaw gateway`：为这个终端会话**在前台**运行Gateway。

如果您安装了服务，请使用Gateway命令。当您想要一次性前台运行时，请使用 `openclaw gateway`。

### 当某些事情失败时，获取更多详细信息的最快方法是什么？

使用 `--verbose` 启动Gateway以获取更多控制台详细信息。然后检查日志文件以查找频道身份验证、模型路由和 RPC 错误。

## 媒体和附件

### 我的技能生成了图像/PDF，但没有发送任何内容

来自代理的出站附件必须包含 `MEDIA:<path-or-url>` 行（在单独的行上）。请参阅[OpenClaw 助手设置](/zh/start/openclaw) 和[代理发送](/zh/tools/agent-send)。

CLI 发送：

```bash
openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
```

还要检查：

- 目标频道支持出站媒体并且没有被白名单阻止。
- 文件在提供商的大小限制内（图像被调整为最大 2048px）。

请参阅[图像](/zh/nodes/images)。

## 安全性和访问控制

### 将 OpenClaw 暴露给入站私信安全吗？

将入站私信视为不受信任的输入。默认设置旨在降低风险：

- 支持私信的频道上的默认行为是**配对**：
  - 未知发件人收到配对代码；机器人不会处理他们的消息。
  - 使用以下方式批准：`openclaw pairing approve <channel> <code>`
  - 待处理的请求限制为**每个频道 3 个**；如果代码没有到达，请检查 `openclaw pairing list <channel>`。
- 公开打开私信需要明确选择加入（`dmPolicy: "open"` 和白名单 `"*"`）。

运行 `openclaw doctor` 以发现风险较高的私信策略。

### 提示注入仅仅是公共机器人的问题吗？

不。提示注入是关于**不受信任的内容**，而不仅仅是谁可以向机器人发送私信。如果您的助手读取外部内容（网络搜索/获取、浏览器页面、电子邮件、文档、附件、粘贴的日志），这些内容可能包含试图劫持模型的指令。即使**您是唯一的发件人**，也可能发生这种情况。

最大的风险是在启用工具时：模型可能会被诱骗泄露上下文或代表您调用工具。通过以下方式减少爆炸半径：

- 使用只读或禁用工具的"阅读器"代理来总结不受信任的内容
- 为启用工具的代理关闭 `web_search` / `web_fetch` / `browser`
- 沙箱和严格的工具允许列表

详细信息：[安全性](/zh/gateway/security)。

### 我的机器人应该有自己的电子邮件/GitHub 帐户或电话号码吗？

是的，对于大多数设置。使用单独的帐户和电话号码隔离机器人可以在出现问题时减少爆炸半径。这也使得轮换凭证或撤销访问而不影响您的个人帐户变得更容易。

从小处开始。仅授予您实际需要的工具和帐户的访问权限，并在需要时进行扩展。

文档：[安全性](/zh/gateway/security)、[配对](/zh/start/pairing)。

### 我可以让它对我的短信拥有自主权吗？这安全吗？

我们**不**建议对您的个人消息拥有完全自主权。最安全的模式是：

- 将私信保持在**配对模式**或严格的白名单中。
- 如果您希望它代表您发送消息，请使用**单独的号码或帐户**。
- 让它起草草稿，然后在发送前**批准**。

如果您想进行实验，请在专用帐户上进行实验并保持隔离。请参阅[安全性](/zh/gateway/security)。

### 我可以为个人助手任务使用更便宜的模型吗？

是的，**如果**代理仅用于聊天且输入是受信任的。较小的级别更容易受到指令劫持，因此对于启用工具的代理或读取不受信任的内容时，请避免使用它们。如果您必须使用较小的模型，请锁定工具并在沙箱内运行。请参阅[安全性](/zh/gateway/security)。

### 我在 Telegram 中运行了 /start，但没有收到配对代码

配对代码**仅**在未知发件人向机器人发送消息并启用 `dmPolicy: "pairing"` 时才会发送。`/start` 本身不会生成代码。

检查待处理的请求：

```bash
openclaw pairing list telegram
```

如果您希望立即访问，请将您的发送者 ID 加入白名单或为该帐户设置 `dmPolicy: "open"`。

### WhatsApp：它会给我的联系人发送消息吗？配对如何工作？

不。默认的 WhatsApp 私信策略是**配对**。未知发件人只会收到配对代码，他们的消息**不会被处理**。OpenClaw 只回复它接收到的聊天或您触发的显式发送。

使用以下方法批准配对：

```bash
openclaw pairing approve whatsapp <code>
```

列出待处理的请求：

```bash
openclaw pairing list whatsapp
```

向导电话号码提示：它用于设置您的**白名单/所有者**，因此允许您自己的私信。它不用于自动发送。如果您在个人 WhatsApp 号码上运行，请使用该号码并启用 `channels.whatsapp.selfChatMode`。

## 聊天命令、中止任务和"它不会停止"

### 如何阻止内部系统消息显示在聊天中？

大多数内部或工具消息仅在为该会话启用了**详细**或**推理**时才会出现。

在您看到它的聊天中修复：

```
/verbose off
/reasoning off
```

如果仍然有噪音，请在控制 UI 中检查会话设置并将详细设置为**继承**。还要确认您没有使用在配置中将 `verboseDefault` 设置为 `on` 的机器人配置文件。

文档：[思考和详细](/zh/tools/thinking)、[安全性](/zh/gateway/security#reasoning--verbose-output-in-groups)。

### 如何停止/取消正在运行的任务？

发送其中任何一个**作为独立消息**（无斜杠）：

```
stop
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

斜杠命令概述：请参阅[斜杠命令](/zh/tools/slash-commands)。

大多数命令必须作为以 `/` 开头的**独立**消息发送，但一些快捷方式（如 `/status`）对于白名单发件人也可以内联使用。

### 如何从 Telegram 发送 Discord 消息？"跨上下文消息被拒绝"

OpenClaw 默认阻止**跨提供商**消息传递。如果工具调用绑定到 Telegram，它将不会发送到 Discord，除非您明确允许。

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

编辑配置后重启Gateway。如果您只希望单个代理使用此功能，请在 `agents.list[].tools.message` 下设置。

### 为什么感觉机器人忽略了快速连续的消息？

队列模式控制新消息如何与正在运行的运行交互。使用 `/queue` 更改模式：

- `steer` - 新消息重定向当前任务
- `followup` - 一次运行一条消息
- `collect` - 批量消息并回复一次（默认）
- `steer-backlog` - 现在引导，然后处理积压
- `interrupt` - 中止当前运行并重新开始

您可以为后续模式添加 `debounce:2s cap:25 drop:summarize` 等选项。

## 从截图/聊天日志中回答确切的问题

**问："使用 API 密钥时 Anthropic 的默认模型是什么？"**

**答：** 在 OpenClaw 中，凭证和模型选择是分开的。设置 `ANTHROPIC_API_KEY`（或在身份验证配置文件中存储 Anthropic API 密钥）可以启用身份验证，但实际的默认模型是您在 `agents.defaults.model.primary` 中配置的任何内容（例如 `anthropic/claude-sonnet-4-5` 或 `anthropic/claude-opus-4-5`）。如果您看到 `No credentials found for profile "anthropic:default"`，这意味着Gateway无法在正在运行的代理的预期 `auth-profiles.json` 中找到 Anthropic 凭证。

---

仍然卡住了？在 [Discord](https://discord.com/invite/clawd) 中提问或在 [GitHub discussion](https://github.com/openclaw/openclaw/discussions) 中提问。
