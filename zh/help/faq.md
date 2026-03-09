---
summary: "Frequently asked questions about OpenClaw setup, configuration, and usage"
title: "FAQ"
---

# 常见问题

快速解答以及针对真实部署场景（本地开发、VPS、多代理、OAuth/API 密钥、模型故障转移）的深度故障排除。如需运行时诊断，请参阅[故障排除](/en/gateway/troubleshooting)。如需完整配置参考，请参阅[配置](/en/gateway/configuration)。

## 目录

- [快速开始和首次运行设置](#quick-start-and-firstrun-setup)
  - [我被卡住了，最快的方法是什么？](#im-stuck-whats-the-fastest-way-to-get-unstuck)
  - [安装和设置 OpenClaw 的推荐方式是什么？](#whats-the-recommended-way-to-install-and-set-up-openclaw)
  - [完成入职后如何打开仪表板？](#how-do-i-open-the-dashboard-after-onboarding)
  - [如何在本地主机和远程服务器上对仪表板（令牌）进行身份验证？](#how-do-i-authenticate-the-dashboard-token-on-localhost-vs-remote)
  - [我需要什么运行时？](#what-runtime-do-i-need)
  - [它能在 Raspberry Pi 上运行吗？](#does-it-run-on-raspberry-pi)
  - [在 Raspberry Pi 上安装有什么技巧吗？](#any-tips-for-raspberry-pi-installs)
  - [卡在"wake up my friend"/入职向导无法启动。现在怎么办？](#it-is-stuck-on-wake-up-my-friend-onboarding-will-not-hatch-what-now)
  - [我可以将设置迁移到新机器（Mac mini）而无需重新做入职吗？](#can-i-migrate-my-setup-to-a-new-machine-mac-mini-without-redoing-onboarding)
  - [我在哪里可以看到最新版本的新内容？](#where-do-i-see-what-is-new-in-the-latest-version)
  - [我无法访问 docs.openclaw.ai（SSL 错误）。现在怎么办？](#i-cant-access-docsopenclawai-ssl-error-what-now)
  - [stable 和 beta 版本有什么区别？](#whats-the-difference-between-stable-and-beta)
  - [如何安装 beta 版本，beta 和 dev 版本有什么区别？](#how-do-i-install-the-beta-version-and-whats-the-difference-between-beta-and-dev)
  - [如何尝试最新的版本？](#how-do-i-try-the-latest-bits)
  - [安装和入职通常需要多长时间？](#how-long-does-install-and-onboarding-usually-take)
  - [安装程序卡住了？如何获得更多反馈？](#installer-stuck-how-do-i-get-more-feedback)
  - [Windows 安装显示找不到 git 或无法识别 openclaw](#windows-install-says-git-not-found-or-openclaw-not-recognized)
  - [文档没有回答我的问题 — 如何获得更好的答案？](#the-docs-didnt-answer-my-question-how-do-i-get-a-better-answer)
  - [如何在 Linux 上安装 OpenClaw？](#how-do-i-install-openclaw-on-linux)
  - [如何在 VPS 上安装 OpenClaw？](#how-do-i-install-openclaw-on-a-vps)
  - [云/VPS 安装指南在哪里？](#where-are-the-cloudvps-install-guides)
  - [我可以要求 OpenClaw 更新自己吗？](#can-i-ask-openclaw-to-update-itself)
  - [入职向导实际上是做什么的？](#what-does-the-onboarding-wizard-actually-do)
  - [运行它需要 Claude 或 OpenAI 订阅吗？](#do-i-need-a-claude-or-openai-subscription-to-run-this)
  - [我可以在没有 API 密钥的情况下使用 Claude Max 订阅吗](#can-i-use-claude-max-subscription-without-an-api-key)
  - [Anthropic "setup-token" 认证是如何工作的？](#how-does-anthropic-setuptoken-auth-work)
  - [在哪里可以找到 Anthropic setup-token？](#where-do-i-find-an-anthropic-setuptoken)
  - [你们支持 Claude 订阅认证（Claude Code OAuth）吗？](#do-you-support-claude-subscription-auth-claude-code-oauth)
  - [为什么我会看到来自 Anthropic 的 `HTTP 429: rate_limit_error`？](#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)
  - [支持 AWS Bedrock 吗？](#is-aws-bedrock-supported)
  - [Codex 认证是如何工作的？](#how-does-codex-auth-work)
  - [你们支持 OpenAI 订阅认证（Codex OAuth）吗？](#do-you-support-openai-subscription-auth-codex-oauth)
  - [如何设置 Gemini CLI OAuth](#how-do-i-set-up-gemini-cli-oauth)
  - [本地模型可以用于休闲聊天吗？](#is-a-local-model-ok-for-casual-chats)
  - [如何将托管模型流量保持在特定区域？](#how-do-i-keep-hosted-model-traffic-in-a-specific-region)
  - [我必须购买 Mac Mini 才能安装它吗？](#do-i-have-to-buy-a-mac-mini-to-install-this)
  - [iMessage 支持需要 Mac mini 吗？](#do-i-need-a-mac-mini-for-imessage-support)
  - [如果我购买 Mac mini 来运行 OpenClaw，可以将其连接到我的 MacBook Pro 吗？](#if-i-buy-a-mac-mini-to-run-openclaw-can-i-connect-it-to-my-macbook-pro)
  - [我可以使用 Bun 吗？](#can-i-use-bun)
  - [Telegram：`allowFrom` 中应该填什么？](#telegram-what-goes-in-allowfrom)
  - [多个人可以使用一个 WhatsApp 号码配合不同的 OpenClaw 实例吗？](#can-multiple-people-use-one-whatsapp-number-with-different-openclaw-instances)
  - [我可以运行一个"快速聊天"代理和一个"Opus 编码"代理吗？](#can-i-run-a-fast-chat-agent-and-an-opus-for-coding-agent)
  - [Homebrew 在 Linux 上有效吗？](#does-homebrew-work-on-linux)
  - [可破解（git）安装和 npm 安装有什么区别？](#whats-the-difference-between-the-hackable-git-install-and-npm-install)
  - [我可以稍后在 npm 和 git 安装之间切换吗？](#can-i-switch-between-npm-and-git-installs-later)
  - [我应该在笔记本电脑还是 VPS 上运行 Gateway？](#should-i-run-the-gateway-on-my-laptop-or-a-vps)
  - [在专用机器上运行 OpenClaw 有多重要？](#how-important-is-it-to-run-openclaw-on-a-dedicated-machine)
  - [最低 VPS 要求和推荐的操作系统是什么？](#what-are-the-minimum-vps-requirements-and-recommended-os)
  - [我可以在 VM 中运行 OpenClaw 吗，有什么要求](#can-i-run-openclaw-in-a-vm-and-what-are-the-requirements)
- [什么是 OpenClaw？](#what-is-openclaw)
  - [什么是 OpenClaw，用一段话概括？](#what-is-openclaw-in-one-paragraph)
  - [价值主张是什么？](#whats-the-value-proposition)
  - [我刚设置好，首先应该做什么](#i-just-set-it-up-what-should-i-do-first)
  - [OpenClaw 的五大日常用例是什么](#what-are-the-top-five-everyday-use-cases-for-openclaw)
  - [OpenClaw 可以帮助 SaaS 进行潜在客户开发、外联广告和博客吗](#can-openclaw-help-with-lead-gen-outreach-ads-and-blogs-for-a-saas)
  - [与 Claude Code 相比，Web 开发有什么优势？](#what-are-the-advantages-vs-claude-code-for-web-development)
- [技能和自动化](#skills-and-automation)
  - [如何自定义技能而不让仓库变脏？](#how-do-i-customize-skills-without-keeping-the-repo-dirty)
  - [我可以从自定义文件夹加载技能吗？](#can-i-load-skills-from-a-custom-folder)
  - [如何为不同的任务使用不同的模型？](#how-can-i-use-different-models-for-different-tasks)
  - [机器人在执行繁重任务时冻结。如何卸载这些任务？](#the-bot-freezes-while-doing-heavy-work-how-do-i-offload-that)
  - [Cron 或提醒器不触发。我应该检查什么？](#cron-or-reminders-do-not-fire-what-should-i-check)
  - [如何在 Linux 上安装技能？](#how-do-i-install-skills-on-linux)
  - [OpenClaw 可以按计划或在后台连续运行任务吗？](#can-openclaw-run-tasks-on-a-schedule-or-continuously-in-the-background)
  - [我可以从 Linux 运行仅 Apple/macOS 的技能吗？](#can-i-run-applemacosonly-skills-from-linux)
  - [你有 Notion 或 HeyGen 集成吗？](#do-you-have-a-notion-or-heygen-integration)
  - [如何安装 Chrome 扩展程序以接管浏览器？](#how-do-i-install-the-chrome-extension-for-browser-takeover)
- [沙盒和内存](#sandboxing-and-memory)
  - [有专门的沙盒文档吗？](#is-there-a-dedicated-sandboxing-doc)
  - [如何将主机文件夹绑定到沙盒中？](#how-do-i-bind-a-host-folder-into-the-sandbox)
  - [内存是如何工作的？](#how-does-memory-work)
  - [内存总是忘记事情。如何让它记住？](#memory-keeps-forgetting-things-how-do-i-make-it-stick)
  - [内存会永久保存吗？有什么限制？](#does-memory-persist-forever-what-are-the-limits)
  - [语义内存搜索需要 OpenAI API 密钥吗？](#does-semantic-memory-search-require-an-openai-api-key)
- [磁盘上的文件位置](#where-things-live-on-disk)
  - [与 OpenClaw 一起使用的所有数据都保存在本地吗？](#is-all-data-used-with-openclaw-saved-locally)
  - [OpenClaw 在哪里存储其数据？](#where-does-openclaw-store-its-data)
  - [AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该放在哪里？](#where-should-agentsmd-soulmd-usermd-memorymd-live)
  - [推荐的备份策略是什么？](#whats-the-recommended-backup-strategy)
  - [如何完全卸载 OpenClaw？](#how-do-i-completely-uninstall-openclaw)
  - [代理可以在工作区之外工作吗？](#can-agents-work-outside-the-workspace)
  - [我处于远程模式 — 会话存储在哪里？](#im-in-remote-mode-where-is-the-session-store)
- [配置基础](#config-basics)
  - [配置是什么格式？它在哪里？](#what-format-is-the-config-where-is-it)
  - [我设置了 `gateway.bind: "lan"`（或 `"tailnet"`），现在没有任何监听/UI 显示未经授权](#i-set-gatewaybind-lan-or-tailnet-and-now-nothing-listens-the-ui-says-unauthorized)
  - [为什么我现在在本地主机上需要令牌？](#why-do-i-need-a-token-on-localhost-now)
  - [更改配置后必须重启吗？](#do-i-have-to-restart-after-changing-config)
  - [如何启用网络搜索（和网络获取）？](#how-do-i-enable-web-search-and-web-fetch)
  - [config.apply 清除了我的配置。如何恢复并避免这种情况？](#configapply-wiped-my-config-how-do-i-recover-and-avoid-this)
  - [如何使用跨设备的专用工作程序运行中央 Gateway？](#how-do-i-run-a-central-gateway-with-specialized-workers-across-devices)
  - [OpenClaw 浏览器可以无头运行吗？](#can-the-openclaw-browser-run-headless)
  - [如何使用 Brave 进行浏览器控制？](#how-do-i-use-brave-for-browser-control)
- [远程 Gateway + 节点](#remote-gateways-nodes)
  - [命令如何在 Telegram、gateway 和节点之间传播？](#how-do-commands-propagate-between-telegram-the-gateway-and-nodes)
  - [如果 Gateway 远程托管，我的代理如何访问我的计算机？](#how-can-my-agent-access-my-computer-if-the-gateway-is-hosted-remotely)
  - [Tailscale 已连接但我没有收到回复。现在怎么办？](#tailscale-is-connected-but-i-get-no-replies-what-now)
  - [两个 OpenClaw 实例可以相互通信（本地 + VPS）吗？](#can-two-openclaw-instances-talk-to-each-other-local-vps)
  - [多个代理需要单独的 VPS 吗](#do-i-need-separate-vpses-for-multiple-agents)
  - [在我个人笔记本电脑上使用节点而不是从 VPS 使用 SSH 有什么好处吗？](#is-there-a-benefit-to-using-a-node-on-my-personal-laptop-instead-of-ssh-from-a-vps)
  - [节点运行 gateway 服务吗？](#do-nodes-run-a-gateway-service)
  - [有 API/RPC 方式来应用配置吗？](#is-there-an-api-rpc-way-to-apply-config)
  - [首次安装的最小"合理"配置是什么？](#whats-a-minimal-sane-config-for-a-first-install)
  - [如何在 VPS 上设置 Tailscale 并从 Mac 连接？](#how-do-i-set-up-tailscale-on-a-vps-and-connect-from-my-mac)
  - [如何将 Mac 节点连接到远程 Gateway（Tailscale Serve）？](#how-do-i-connect-a-mac-node-to-a-remote-gateway-tailscale-serve)
  - [我应该在第二台笔记本电脑上安装还是只添加一个节点？](#should-i-install-on-a-second-laptop-or-just-add-a-node)
- [环境变量和 .env 加载](#env-vars-and-env-loading)
  - [OpenClaw 如何加载环境变量？](#how-does-openclaw-load-environment-variables)
  - ["我通过服务启动了 Gateway，环境变量消失了。"现在怎么办？](#i-started-the-gateway-via-the-service-and-my-env-vars-disappeared-what-now)
  - [我设置了 `COPILOT_GITHUB_TOKEN`，但模型状态显示"Shell env: off。"为什么？](#i-set-copilotgithubtoken-but-models-status-shows-shell-env-off-why)
- [会话和多个聊天](#sessions-multiple-chats)
  - [如何开始新的对话？](#how-do-i-start-a-fresh-conversation)
  - [如果我从未发送 `/new`，会话会自动重置吗？](#do-sessions-reset-automatically-if-i-never-send-new)
  - [有没有办法让一组 OpenClaw 实例成为一个 CEO 和多个代理](#is-there-a-way-to-make-a-team-of-openclaw-instances-one-ceo-and-many-agents)
  - [为什么上下文在任务中途被截断？如何防止这种情况？](#why-did-context-get-truncated-midtask-how-do-i-prevent-it)
  - [如何完全重置 OpenClaw 但保持安装状态？](#how-do-i-completely-reset-openclaw-but-keep-it-installed)
  - [我收到"context too large"错误 — 如何重置或压缩？](#im-getting-context-too-large-errors-how-do-i-reset-or-compact)
  - [为什么我看到"LLM request rejected: messages.N.content.X.tool_use.input: Field required"？](#why-am-i-seeing-llm-request-rejected-messagesncontentxtooluseinput-field-required)
  - [为什么我每 30 分钟收到一次心跳消息？](#why-am-i-getting-heartbeat-messages-every-30-minutes)
  - [我需要将"机器人帐户"添加到 WhatsApp 组吗？](#do-i-need-to-add-a-bot-account-to-a-whatsapp-group)
  - [如何获取 WhatsApp 组的 JID？](#how-do-i-get-the-jid-of-a-whatsapp-group)
  - [为什么 OpenClaw 不在群组中回复？](#why-doesnt-openclaw-reply-in-a-group)
  - [群组/线程与私信共享上下文吗？](#do-groupsthreads-share-context-with-dms)
  - [我可以创建多少个工作区和代理？](#how-many-workspaces-and-agents-can-i-create)
  - [我可以同时运行多个机器人或聊天（Slack），应该如何设置？](#can-i-run-multiple-bots-or-chats-at-the-same-time-slack-and-how-should-i-set-that-up)
- [模型：默认值、选择、别名、切换](#models-defaults-selection-aliases-switching)
  - [什么是"默认模型"？](#what-is-the-default-model)
  - [你推荐什么模型？](#what-model-do-you-recommend)
  - [如何在不清除配置的情况下切换模型？](#how-do-i-switch-models-without-wiping-my-config)
  - [我可以使用自托管模型（llama.cpp、vLLM、Ollama）吗？](#can-i-use-selfhosted-models-llamacpp-vllm-ollama)
  - [OpenClaw、Flawd 和 Krill 使用什么模型？](#what-do-openclaw-flawd-and-krill-use-for-models)
  - [如何即时切换模型（无需重启）？](#how-do-i-switch-models-on-the-fly-without-restarting)
  - [我可以将 GPT 5.2 用于日常任务，将 Codex 5.2 用于编码吗](#can-i-use-gpt-52-for-daily-tasks-and-codex-52-for-coding)
  - [为什么我看到"Model … is not allowed"然后没有回复？](#why-do-i-see-model-is-not-allowed-and-then-no-reply)
  - [为什么我看到"Unknown model: minimax/MiniMax-M2.1"？](#why-do-i-see-unknown-model-minimaxminimaxm21)
  - [我可以将 MiniMax 作为默认模型，将 OpenAI 用于复杂任务吗？](#can-i-use-minimax-as-my-default-and-openai-for-complex-tasks)
  - [opus / sonnet / gpt 是内置快捷方式吗？](#are-opus-sonnet-gpt-builtin-shortcuts)
  - [如何定义/覆盖模型快捷方式（别名）？](#how-do-i-defineoverride-model-shortcuts-aliases)
  - [如何添加来自其他提供商（如 OpenRouter 或 Z.AI）的模型？](#how-do-i-add-models-from-other-providers-like-openrouter-or-zai)
- [模型故障转移和"所有模型失败"](#model-failover-and-all-models-failed)
  - [故障转移如何工作？](#how-does-failover-work)
  - [这个错误是什么意思？](#what-does-this-error-mean)
  - [`No credentials found for profile "anthropic:default"` 的修复清单](#fix-checklist-for-no-credentials-found-for-profile-anthropicdefault)
  - [为什么它还尝试了 Google Gemini 并且失败了？](#why-did-it-also-try-google-gemini-and-fail)
- [认证配置文件：它们是什么以及如何管理它们](#auth-profiles-what-they-are-and-how-to-manage-them)
  - [什么是认证配置文件？](#what-is-an-auth-profile)
  - [典型的配置文件 ID 是什么？](#what-are-typical-profile-ids)
  - [我可以控制首先尝试哪个认证配置文件吗？](#can-i-control-which-auth-profile-is-tried-first)
  - [OAuth 与 API 密钥：有什么区别？](#oauth-vs-api-key-whats-the-difference)
- [Gateway：端口、"正在运行"和远程模式](#gateway-ports-already-running-and-remote-mode)
  - [Gateway 使用什么端口？](#what-port-does-the-gateway-use)
  - [为什么 `openclaw gateway status` 说 `Runtime: running` 但 `RPC probe: failed`？](#why-does-openclaw-gateway-status-say-runtime-running-but-rpc-probe-failed)
  - [为什么 `openclaw gateway status` 显示 `Config (cli)` 和 `Config (service)` 不同？](#why-does-openclaw-gateway-status-show-config-cli-and-config-service-different)
  - ["另一个 gateway 实例已在监听"是什么意思？](#what-does-another-gateway-instance-is-already-listening-mean)
  - [如何在远程模式下运行 OpenClaw（客户端连接到其他地方的 Gateway）？](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere)
  - [控制 UI 显示"unauthorized"（或不断重新连接）。现在怎么办？](#the-control-ui-says-unauthorized-or-keeps-reconnecting-what-now)
  - [我设置了 `gateway.bind: "tailnet"` 但它无法绑定/没有任何监听](#i-set-gatewaybind-tailnet-but-it-cant-bind-nothing-listens)
  - [我可以在同一主机上运行多个 Gateway 吗？](#can-i-run-multiple-gateways-on-the-same-host)
  - ["invalid handshake"/代码 1008 是什么意思？](#what-does-invalid-handshake-code-1008-mean)
- [日志记录和调试](#logging-and-debugging)
  - [日志在哪里？](#where-are-logs)
  - [如何启动/停止/重启 Gateway 服务？](#how-do-i-startstoprestart-the-gateway-service)
  - [我在 Windows 上关闭了终端 — 如何重启 OpenClaw？](#i-closed-my-terminal-on-windows-how-do-i-restart-openclaw)
  - [Gateway 已启动但回复从未到达。我应该检查什么？](#the-gateway-is-up-but-replies-never-arrive-what-should-i-check)
  - ["Disconnected from gateway: no reason" — 现在怎么办？](#disconnected-from-gateway-no-reason-what-now)
  - [Telegram setMyCommands 失败，出现网络错误。我应该检查什么？](#telegram-setmycommands-fails-with-network-errors-what-should-i-check)
  - [TUI 显示无输出。我应该检查什么？](#tui-shows-no-output-what-should-i-check)
  - [如何完全停止然后启动 Gateway？](#how-do-i-completely-stop-then-start-the-gateway)
  - [ELI5：`openclaw gateway restart` vs `openclaw gateway`](#eli5-openclaw-gateway-restart-vs-openclaw-gateway)
  - [当某些事情失败时，获得更多详细信息的最快方法是什么？](#whats-the-fastest-way-to-get-more-details-when-something-fails)
- [媒体和附件](#media-attachments)
  - [我的技能生成了图像/PDF，但没有发送任何内容](#my-skill-generated-an-imagepdf-but-nothing-was-sent)
- [安全和访问控制](#security-and-access-control)
  - [将 OpenClaw 暴露给传入私信安全吗？](#is-it-safe-to-expose-openclaw-to-inbound-dms)
  - [提示词注入只是公共机器人的问题吗？](#is-prompt-injection-only-a-concern-for-public-bots)
  - [我的机器人应该有自己的电子邮件/GitHub 帐户或电话号码吗](#should-my-bot-have-its-own-email-github-account-or-phone-number)
  - [我可以让它对我的文本消息拥有自主权，这安全吗](#can-i-give-it-autonomy-over-my-text-messages-and-is-that-safe)
  - [我可以为个人助理任务使用更便宜的模型吗？](#can-i-use-cheaper-models-for-personal-assistant-tasks)
  - [我在 Telegram 中运行了 `/start` 但没有收到配对代码](#i-ran-start-in-telegram-but-didnt-get-a-pairing-code)
  - [WhatsApp：它会给我的联系人发送消息吗？配对如何工作？](#whatsapp-will-it-message-my-contacts-how-does-pairing-work)
- [聊天命令、中止任务和"它不会停止"](#chat-commands-aborting-tasks-and-it-wont-stop)
  - [如何阻止内部系统消息在聊天中显示](#how-do-i-stop-internal-system-messages-from-showing-in-chat)
  - [如何停止/取消正在运行的任务？](#how-do-i-stopcancel-a-running-task)
  - [如何从 Telegram 发送 Discord 消息？（"Cross-context messaging denied"）](#how-do-i-send-a-discord-message-from-telegram-crosscontext-messaging-denied)
  - [为什么感觉机器人"忽略"了快速连续的消息？](#why-does-it-feel-like-the-bot-ignores-rapidfire-messages)

## 如果出现问题，首先 60 秒

1. **快速状态（首次检查）**

   ```bash
   openclaw status
   ```

   快速本地摘要：操作系统 + 更新、gateway/服务可达性、代理/会话、提供商配置 + 运行时问题（当 gateway 可达时）。

2. **可粘贴报告（可安全分享）**

   ```bash
   openclaw status --all
   ```

   带有日志尾部的只读诊断（令牌已编辑）。

3. **守护进程 + 端口状态**

   ```bash
   openclaw gateway status
   ```

   显示监督程序运行时与 RPC 可达性、探测目标 URL 以及服务可能使用的配置。

4. **深度探测**

   ```bash
   openclaw status --deep
   ```

   运行 gateway 健康检查 + 提供商探测（需要可访问的 gateway）。请参阅[健康](/en/gateway/health)。

5. **跟踪最新日志**

   ```bash
   openclaw logs --follow
   ```

   If RPC is down, fall back to:

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   文件日志与服务日志是分开的；请参阅[日志记录](/en/logging)和[故障排除](/en/gateway/troubleshooting)。

6. **运行医生（修复）**

   ```bash
   openclaw doctor
   ```

   修复/迁移配置/状态 + 运行健康检查。请参阅[医生](/en/gateway/doctor)。

7. **Gateway 快照**
   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```
   向正在运行的 gateway 请求完整快照（仅 WS）。请参阅[健康](/en/gateway/health)。

## 快速开始和首次运行设置

### 我被卡住了，最快的方法是什么

使用可以**查看您的机器**的本地 AI 代理。这比在 Discord 中提问有效得多，因为大多数"我被卡住了"的情况是**本地配置或环境问题**，远程帮助者无法检查这些问题。

- **Claude Code**: https://www.anthropic.com/claude-code/
- **OpenAI Codex**: https://openai.com/codex/

这些工具可以读取仓库、运行命令、检查日志并帮助修复您的机器级设置（PATH、服务、权限、认证文件）。通过可破解安装为它们提供**完整的源代码检出**：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

这会**从 git 检出**安装 OpenClaw，因此代理可以读取代码 + 文档并推理您正在运行的确切版本。您始终可以稍后通过重新运行安装程序而不使用 `--install-method git` 切换回稳定版本。

提示：要求代理**计划和监督**修复（逐步），然后仅执行必要的命令。这使更改保持较小且更容易审计。

如果您发现真正的错误或修复，请提交 GitHub issue 或发送 PR：
https://github.com/openclaw/openclaw/issues
https://github.com/openclaw/openclaw/pulls

从这些命令开始（在寻求帮助时分享输出）：

```bash
openclaw status
openclaw models status
openclaw doctor
```

它们的作用：

- `openclaw status`：gateway/代理健康 + 基本配置的快速快照。
- `openclaw models status`：检查提供商认证 + 模型可用性。
- `openclaw doctor`：验证并修复常见的配置/状态问题。

其他有用的 CLI 检查：`openclaw status --all`、`openclaw logs --follow`、`openclaw gateway status`、`openclaw health --verbose`。

快速调试循环：[如果出现问题，首先 60 秒](#first-60-seconds-if-somethings-broken)。
安装文档：[安装](/en/install)、[安装程序标志](/en/install/installer)、[更新](/en/install/updating)。

### 安装和设置 OpenClaw 的推荐方式是什么

仓库建议从源代码运行并使用入职向导：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
```

向导还可以自动构建 UI 资产。入职后，您通常在端口 **18789** 上运行 Gateway。

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

### 完成入职后如何打开仪表板

向导现在会在入职后立即在浏览器中打开带有令牌化的仪表板 URL，并在摘要中打印完整链接（带令牌）。保持该选项卡打开；如果它没有启动，请在同一台机器上复制/粘贴打印的 URL。令牌保留在您的本地主机上 — 浏览器不会获取任何内容。

### 如何在本地主机和远程服务器上对仪表板令牌进行身份验证

**本地主机（同一台机器）：**

- 打开 `http://127.0.0.1:18789/`。
- 如果它要求身份验证，请运行 `openclaw dashboard` 并使用令牌化链接（`?token=...`）。
- 令牌与 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）的值相同，并且在首次加载后由 UI 存储。

**不在本地主机上：**

- **Tailscale Serve**（推荐）：保持绑定环回，运行 `openclaw gateway --tailscale serve`，打开 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 是 `true`，身份标头满足认证（无需令牌）。
- **Tailnet 绑定**：运行 `openclaw gateway --bind tailnet --token "<token>"`，打开 `http://<tailscale-ip>:18789/`，在仪表板设置中粘贴令牌。
- **SSH 隧道**：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然后从 `openclaw dashboard` 打开 `http://127.0.0.1:18789/?token=...`。

有关绑定模式和身份验证详细信息，请参阅[仪表板](/en/web/dashboard)和[Web 界面](/en/web)。

### 我需要什么运行时

需要 Node **>= 22**。推荐使用 `pnpm`。**不推荐**将 Bun 用于 Gateway。

### 它可以在 Raspberry Pi 上运行吗

可以。Gateway 是轻量级的 — 文档列出了 **512MB-1GB RAM**、**1 核**和约 **500MB**
磁盘就足以供个人使用，并且请注意 **Raspberry Pi 4 可以运行它**。

如果您想要额外的余量（日志、媒体、其他服务），**推荐使用 2GB**，但这
不是硬性最低要求。

提示：小型 Pi/VPS 可以托管 Gateway，您可以在笔记本电脑/手机上配对 **节点**以
进行本地屏幕/相机/画布或命令执行。请参阅[节点](/en/nodes)。

### 在 Raspberry Pi 上安装有什么技巧吗

简短版本：它可以工作，但可能会有一些粗糙的地方。

- 使用 **64 位**操作系统并保持 Node >= 22。
- 优先使用 **可破解安装**，这样您就可以查看日志并快速更新。
- 首先不使用频道/技能启动，然后逐个添加它们。
- 如果遇到奇怪的二进制问题，这通常是一个 **ARM 兼容性**问题。

文档：[Linux](/en/platforms/linux)、[安装](/en/install)。

### 卡在"wake up my friend"/入职向导无法启动。现在怎么办

该屏幕取决于 Gateway 是否可访问和已认证。TUI 还会在首次启动时自动发送
"Wake up, my friend!"。如果您看到该行并且**没有回复**，
令牌保持为 0，则代理从未运行。

1. 重启 Gateway：

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

如果 Gateway 是远程的，请确保隧道/Tailscale 连接已启动，并且 UI
指向正确的 Gateway。请参阅[远程访问](/en/gateway/remote)。

### 我可以将设置迁移到新机器（Mac mini）而无需重新做入职吗

可以。复制 **状态目录**和**工作区**，然后运行一次 Doctor。这
使您的机器人保持"完全相同"（内存、会话历史、认证和频道
状态），只要您复制**两个**位置：

1. 在新机器上安装 OpenClaw。
2. 从旧机器复制 `$OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）。
3. 复制您的工作区（默认：`~/.openclaw/workspace`）。
4. 运行 `openclaw doctor` 并重启 Gateway 服务。

这将保留配置、认证配置文件、WhatsApp 凭证、会话和内存。如果您处于
远程模式，请记住 gateway 主机拥有会话存储和工作区。

**重要提示：**如果您仅将工作区提交/推送到 GitHub，则您正在备份
**内存 + 引导文件**，但**不会**备份会话历史或认证。这些内容位于
`~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

相关内容：[迁移](/en/install/migrating)、[磁盘上的文件位置](/en/help/faq#where-does-openclaw-store-its-data)、
[代理工作区](/en/concepts/agent-workspace)、[医生](/en/gateway/doctor)、
[远程模式](/en/gateway/remote)。

### 我在哪里可以看到最新版本的新内容

查看 GitHub 更改日志：
https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md

最新条目位于顶部。如果顶部标记为 **Unreleased**，则下一个日期部分是最新发布的版本。条目按 **Highlights**、**Changes** 和 **Fixes** 分组（根据需要还包括文档/其他部分）。

### 我无法访问 docs.openclaw.ai（SSL 错误）。现在怎么办

某些 Comcast/Xfinity 连接通过 Xfinity 高级安全错误地阻止 `docs.openclaw.ai`。禁用它或将 `docs.openclaw.ai` 加入允许列表，然后重试。更多详细信息：[故障排除](/en/help/troubleshooting#docsopenclawai-shows-an-ssl-error-comcastxfinity)。
请通过此处报告帮助我们解除阻止：https://spa.xfinity.com/check_url_status。

如果您仍然无法访问该站点，文档会在 GitHub 上镜像：
https://github.com/openclaw/openclaw/tree/main/docs

### stable 和 beta 版本有什么区别

**Stable** 和 **beta** 是 **npm dist-tags**，不是单独的代码行：

- `latest` = stable
- `beta` = 用于测试的早期版本

我们将构建版本发布到 **beta**，进行测试，一旦构建版本稳定，我们就**将同一版本升级到 `latest`**。这就是为什么 beta 和 stable 可以指向**同一版本**。

查看更改内容：
https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md

### 如何安装 beta 版本，beta 和 dev 版本有什么区别

**Beta** 是 npm dist-tag `beta`（可能与 `latest` 匹配）。
**Dev** 是 `main` (git) 的移动头部；发布时，它使用 npm dist-tag `dev`。

单行命令（macOS/Linux）：

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
```

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Windows 安装程序（PowerShell）：
https://openclaw.ai/install.ps1

更多详细信息：[开发频道](/en/install/development-channels) 和 [安装程序标志](/en/install/installer)。

### 安装和入职通常需要多长时间

粗略指南：

- **安装：** 2-5 分钟
- **入职：** 5-15 分钟，取决于您配置的频道/模型数量

如果它挂起，请使用 [安装程序卡住](/en/help/faq#installer-stuck-how-do-i-get-more-feedback)
和 [我被卡住了](/en/help/faq#im-stuck--whats-the-fastest-way-to-get-unstuck) 中的快速调试循环。

### 如何尝试最新的版本

两个选项：

1. **开发频道（git 检出）：**

```bash
openclaw update --channel dev
```

这将切换到 `main` 分支并从源代码更新。

2. **可破解安装（来自安装程序站点）：**

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

这为您提供了一个可以编辑的本地仓库，然后通过 git 更新。

如果您更喜欢手动干净的克隆，请使用：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
```

文档：[更新](/en/cli/update)、[开发频道](/en/install/development-channels)、[安装](/en/install)。

### 安装程序卡住了。如何获得更多反馈

使用 **详细输出** 重新运行安装程序：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
```

Beta 安装并启用详细输出：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
```

对于可破解安装：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
```

更多选项：[安装程序标志](/en/install/installer)。

### Windows 安装显示找不到 git 或无法识别 openclaw

两个常见的 Windows 问题：

**1) npm error spawn git / git not found**

- 安装 **Git for Windows** 并确保 `git` 在您的 PATH 上。
- 关闭并重新打开 PowerShell，然后重新运行安装程序。

**2) 安装后无法识别 openclaw**

- 您的 npm 全局 bin 文件夹不在 PATH 上。
- 检查路径：
  ```powershell
  npm config get prefix
  ```
- 确保 `<prefix>\\bin` 在 PATH 上（在大多数系统上它是 `%AppData%\\npm`）。
- 更新 PATH 后关闭并重新打开 PowerShell。

如果您想要最顺畅的 Windows 设置，请使用 **WSL2** 而不是本机 Windows。
文档：[Windows](/en/platforms/windows)。

### 文档没有回答我的问题 — 如何获得更好的答案

使用 **可破解安装**，这样您在本地拥有完整的源代码和文档，然后从该文件夹向您的机器人（或 Claude/Codex）提问，以便它可以读取仓库并准确回答。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

更多详细信息：[安装](/en/install) 和 [安装程序标志](/en/install/installer)。

### 如何在 Linux 上安装 OpenClaw

简短回答：按照 Linux 指南操作，然后运行入职向导。

- Linux 快速路径 + 服务安装：[Linux](/en/platforms/linux)。
- 完整演练：[入门](/en/start/getting-started)。
- 安装程序 + 更新：[安装和更新](/en/install/updating)。

### 如何在 VPS 上安装 OpenClaw

任何 Linux VPS 都可以。在服务器上安装，然后使用 SSH/Tailscale 连接到 Gateway。

指南：[exe.dev](/en/platforms/exe-dev)、[Hetzner](/en/platforms/hetzner)、[Fly.io](/en/platforms/fly)。
远程访问：[Gateway 远程](/en/gateway/remote)。

### 云/VPS 安装指南在哪里

我们为常见提供商维护了一个**托管中心**。选择一个并按照指南操作：

- [VPS 托管](/en/vps)（所有提供商在一个地方）
- [Fly.io](/en/platforms/fly)
- [Hetzner](/en/platforms/hetzner)
- [exe.dev](/en/platforms/exe-dev)

它在云中的工作方式：**Gateway 在服务器上运行**，您通过控制 UI（或 Tailscale/SSH）从笔记本电脑/手机访问它。您的状态 + 工作区位于服务器上，因此请将主机视为事实来源并备份它。

您可以将 **节点**（Mac/iOS/Android/headless）配对到该云 Gateway，以访问
本地屏幕/相机/画布或在笔记本电脑上运行命令，同时保持 Gateway 在云中。

中心：[平台](/en/platforms)。远程访问：[Gateway 远程](/en/gateway/remote)。
节点：[节点](/en/nodes)、[节点 CLI](/en/cli/nodes)。

### 我可以要求 OpenClaw 更新自己吗

简短回答：**可以，但不推荐**。更新流程可能会重启 Gateway（这会断开活动会话），可能需要干净的 git 检出，并且可能会提示确认。更安全：作为操作员从 shell 运行更新。

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

文档：[更新](/en/cli/update)、[更新](/en/install/updating)。

### 入职向导实际上是做什么的

`openclaw onboard` 是推荐的设置路径。在**本地模式**中，它会引导您完成：

- **模型/认证设置**（Anthropic **setup-token** 推荐用于 Claude 订阅，支持 OpenAI Codex OAuth，API 密钥可选，支持 LM Studio 本地模型）
- **工作区**位置 + 引导文件
- **Gateway 设置**（绑定/端口/认证/tailscale）
- **提供商**（WhatsApp、Telegram、Discord、Mattermost（插件）、Signal、iMessage）
- **守护进程安装**（macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd 用户单元）
- **健康检查**和**技能**选择

如果您的配置模型未知或缺少认证，它也会发出警告。

### 运行它需要 Claude 或 OpenAI 订阅吗

不需要。您可以使用 **API 密钥**（Anthropic/OpenAI/其他）或 **仅本地模型**
运行 OpenClaw，这样您的数据保留在您的设备上。订阅（Claude
Pro/Max 或 OpenAI Codex）是认证这些提供商的可选方式。

文档：[Anthropic](/en/providers/anthropic)、[OpenAI](/en/providers/openai)、
[本地模型](/en/gateway/local-models)、[模型](/en/concepts/models)。

### 我可以在没有 API 密钥的情况下使用 Claude Max 订阅吗

可以。您可以使用 **setup-token** 而不是 API 密钥进行身份验证。这是订阅路径。

Claude Pro/Max 订阅**不包含 API 密钥**，因此这是订阅帐户的正确方法。重要：您必须向 Anthropic 验证此使用在其订阅政策和条款下是允许的。
如果您想要最明确、支持的路径，请使用 Anthropic API 密钥。

### Anthropic setup-token 认证是如何工作的

`claude setup-token` 通过 Claude Code CLI 生成一个**令牌字符串**（它在 Web 控制台中不可用）。您可以在**任何机器**上运行它。在向导中选择 **Anthropic token（paste setup-token）** 或使用 `openclaw models auth paste-token --provider anthropic` 粘贴它。令牌作为 **anthropic** 提供商的认证配置文件存储，并像 API 密钥一样使用（无自动刷新）。更多详细信息：[OAuth](/en/concepts/oauth)。

### 在哪里可以找到 Anthropic setup-token

它**不**在 Anthropic 控制台中。setup-token 由 **Claude Code CLI** 在**任何机器**上生成：

```bash
claude setup-token
```

复制它打印的令牌，然后在向导中选择 **Anthropic token（paste setup-token）**。如果您想在 gateway 主机上运行它，请使用 `openclaw models auth setup-token --provider anthropic`。如果您在其他地方运行了 `claude setup-token`，请使用 `openclaw models auth paste-token --provider anthropic` 在 gateway 主机上粘贴它。请参阅 [Anthropic](/en/providers/anthropic)。

### 你们支持 Claude 订阅认证（Claude Pro/Max）吗

支持 — 通过 **setup-token**。OpenClaw 不再重用 Claude Code CLI OAuth 令牌；请使用 setup-token 或 Anthropic API 密钥。在任何地方生成令牌并将其粘贴到 gateway 主机上。请参阅 [Anthropic](/en/providers/anthropic) 和 [OAuth](/en/concepts/oauth)。

注意：Claude 订阅访问受 Anthropic 条款管辖。对于生产或多用户工作负载，API 密钥通常是更安全的选择。

### 为什么我会看到来自 Anthropic 的 HTTP 429 ratelimiterror

这意味着您的 **Anthropic 配额/速率限制**在当前时间窗口内已耗尽。如果您使用 **Claude 订阅**（setup-token 或 Claude Code OAuth），请等待时间窗口重置或升级您的计划。如果您使用 **Anthropic API 密钥**，请检查 Anthropic 控制台的使用情况/计费并根据需要提高限制。

提示：设置一个**后备模型**，以便 OpenClaw 在提供商受到速率限制时继续回复。
请参阅[模型](/en/cli/models) 和 [OAuth](/en/concepts/oauth)。

### 支持 AWS Bedrock 吗

支持 — 通过 pi-ai 的 **Amazon Bedrock (Converse)** 提供商，使用**手动配置**。您必须在 gateway 主机上提供 AWS 凭证/区域，并在模型配置中添加 Bedrock 提供商条目。请参阅 [Amazon Bedrock](/en/bedrock) 和 [模型提供商](/en/providers/models)。如果您更喜欢托管密钥流程，在 Bedrock 前面使用 OpenAI 兼容的代理仍然是一个有效的选项。

### Codex 认证是如何工作的

OpenClaw 通过 OAuth（ChatGPT 登录）支持 **OpenAI Code (Codex)**。向导可以运行 OAuth 流程，并在适当时将默认模型设置为 `openai-codex/gpt-5.2`。请参阅[模型提供商](/en/concepts/model-providers) 和[向导](/en/start/wizard)。

### 你们支持 OpenAI 订阅认证（Codex OAuth）吗

支持。OpenClaw 完全支持 **OpenAI Code (Codex) 订阅 OAuth**。入职向导可以为您运行 OAuth 流程。

请参阅 [OAuth](/en/concepts/oauth)、[模型提供商](/en/concepts/model-providers) 和[向导](/en/start/wizard)。

### 如何设置 Gemini CLI OAuth

Gemini CLI 使用**插件认证流程**，而不是 `openclaw.json` 中的客户端 ID 或密钥。

步骤：

1. 启用插件：`openclaw plugins enable google-gemini-cli-auth`
2. 登录：`openclaw models auth login --provider google-gemini-cli --set-default`

这会将 OAuth 令牌存储在 gateway 主机上的认证配置文件中。详细信息：[模型提供商](/en/concepts/model-providers)。

### 本地模型可以用于休闲聊天吗

通常不可以。OpenClaw 需要大型上下文 + 强安全性；小型卡会截断和泄漏。如果必须，请在本地运行您可以运行的**最大** MiniMax M2.1 版本（LM Studio）并参阅 [/gateway/local-models](/en/gateway/local-models)。较小/量化的模型会增加提示注入风险 — 请参阅[安全性](/en/gateway/security)。

### 如何将托管模型流量保持在特定区域

选择区域固定的端点。OpenRouter 为 MiniMax、Kimi 和 GLM 提供美国托管选项；选择美国托管变体以将数据保留在区域内。您仍然可以通过使用 `models.mode: "merge"` 与这些端点一起列出 Anthropic/OpenAI，以便在选择区域提供商的同时保持后备可用。

### 我必须购买 Mac Mini 才能安装它吗

不需要。OpenClaw 在 macOS 或 Linux（通过 WSL2 的 Windows）上运行。Mac mini 是可选的 — 有些人购买它作为常开主机，但小型 VPS、家庭服务器或 Raspberry Pi 级别的盒子也可以。

您只需要 Mac 来使用 **仅 macOS 的工具**。对于 iMessage，请使用 [BlueBubbles](/en/channels/bluebubbles)（推荐）- BlueBubbles 服务器在任何 Mac 上运行，而 Gateway 可以在 Linux 或其他地方运行。如果您想要其他仅 macOS 的工具，请在 Mac 上运行 Gateway 或配对 macOS 节点。

文档：[BlueBubbles](/en/channels/bluebubbles)、[节点](/en/nodes)、[Mac 远程模式](/en/platforms/mac/remote)。

### iMessage 支持需要 Mac mini 吗

您需要**某个 macOS 设备**登录到 Messages。它**不**一定是 Mac mini — 任何 Mac 都可以。**使用 [BlueBubbles](/en/channels/bluebubbles)**（推荐）进行 iMessage — BlueBubbles 服务器在 macOS 上运行，而 Gateway 可以在 Linux 或其他地方运行。

常见设置：

- 在 Linux/VPS 上运行 Gateway，并在任何登录到 Messages 的 Mac 上运行 BlueBubbles 服务器。
- 如果您想要最简单的单机设置，请在 Mac 上运行所有内容。

文档：[BlueBubbles](/en/channels/bluebubbles)、[节点](/en/nodes)、
[Mac 远程模式](/en/platforms/mac/remote)。

### 如果我购买 Mac mini 来运行 OpenClaw，可以将其连接到我的 MacBook Pro 吗

可以。**Mac mini 可以运行 Gateway**，而您的 MacBook Pro 可以作为**节点**（配套设备）连接。节点不运行 Gateway — 它们在该设备上提供额外的功能，如屏幕/相机/画布和 `system.run`。

常见模式：

- Gateway 在 Mac mini 上（常开）。
- MacBook Pro 运行 macOS 应用或节点主机并与 Gateway 配对。
- 使用 `openclaw nodes status` / `openclaw nodes list` 查看它。

文档：[节点](/en/nodes)、[节点 CLI](/en/cli/nodes)。

### 我可以使用 Bun 吗

**不推荐**。我们看到运行时错误，尤其是与 WhatsApp 和 Telegram 的错误。
对稳定的 gateway 使用 **Node**。

如果您仍然想尝试 Bun，请在没有 WhatsApp/Telegram 的非生产 gateway 上进行。

### Telegram：allowFrom 中应该填什么

`channels.telegram.allowFrom` 是**人类发送者的 Telegram 用户 ID**（数字，推荐）或 `@username`。它不是机器人用户名。

更安全（无第三方机器人）：

- 向您的机器人发送私信，然后运行 `openclaw logs --follow` 并阅读 `from.id`。

官方机器人 API：

- 向您的机器人发送私信，然后调用 `https://api.telegram.org/bot<bot_token>/getUpdates` 并阅读 `message.from.id`。

第三方（隐私较少）：

- 向 `@userinfobot` 或 `@getidsbot` 发送私信。

请参阅 [/channels/telegram](/en/channels/telegram#access-control-dms--groups)。

### 多个人可以使用一个 WhatsApp 号码配合不同的 OpenClaw 实例吗

可以，通过**多代理路由**。将每个发送者的 WhatsApp **私信**（对等方 `kind: "dm"`，发送者 E.164 如 `+15551234567`）绑定到不同的 `agentId`，这样每个人都可以获得自己的工作区和会话存储。回复仍然来自**同一个 WhatsApp 帐户**，并且私信访问控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）是每个 WhatsApp 帐户的全局设置。请参阅[多代理路由](/en/concepts/multi-agent) 和 [WhatsApp](/en/channels/whatsapp)。

### 我可以运行一个"快速聊天"代理和一个"Opus 编码"代理吗

可以。使用多代理路由：为每个代理提供自己的默认模型，然后将传入路由（提供商帐户或特定对等方）绑定到每个代理。示例配置位于[多代理路由](/en/concepts/multi-agent) 中。另请参阅[模型](/en/concepts/models) 和[配置](/en/gateway/configuration)。

### Homebrew 在 Linux 上有效吗

有效。Homebrew 支持 Linux (Linuxbrew)。快速设置：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
brew install <formula>
```

如果您通过 systemd 运行 OpenClaw，请确保服务 PATH 包括 `/home/linuxbrew/.linuxbrew/bin`（或您的 brew 前缀），以便 `brew` 安装的工具在非登录 shell 中解析。
最近的版本还会在 Linux systemd 服务上添加常见的用户 bin 目录（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），并在设置时遵守 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

### 可破解安装和 npm 安装有什么区别

- **可破解安装**：完整的源代码检出，可编辑，最适合贡献者。
  您在本地运行构建并可以修补代码/文档。
- **npm 安装**：全局 CLI 安装，无仓库，最适合"直接运行"。
  更新来自 npm dist-tags。

文档：[入门](/en/start/getting-started)、[更新](/en/install/updating)。

### 我可以稍后在 npm 和 git 安装之间切换吗

可以。安装另一种版本，然后运行 Doctor 以便 gateway 服务指向新的入口点。
这**不会删除您的数据** — 它只会更改 OpenClaw 代码安装。您的状态
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

Doctor 会检测 gateway 服务入口点不匹配，并提议重写服务配置以匹配当前安装（在自动化中使用 `--repair`）。

备份提示：请参阅[备份策略](/en/help/faq#whats-the-recommended-backup-strategy)。

### 我应该在笔记本电脑还是 VPS 上运行 Gateway

简短回答：**如果您想要 24/7 可靠性，请使用 VPS**。如果您想要
最低的摩擦力并且您对睡眠/重启没有问题，请在本地运行它。

**笔记本电脑（本地 Gateway）**

- **优点：** 无服务器成本，直接访问本地文件，实时浏览器窗口。
- **缺点：** 睡眠/网络断开 = 断开连接，操作系统更新/重启中断，必须保持唤醒。

**VPS / 云**

- **优点：** 始终开启，网络稳定，无笔记本电脑睡眠问题，更容易保持运行。
- **缺点：** 通常无头运行（使用屏幕截图），仅远程文件访问，您必须 SSH 进行更新。

**OpenClaw 特别说明：** WhatsApp/Telegram/Slack/Mattermost（插件）/Discord 都可以在 VPS 上正常运行。唯一的真正权衡是**无头浏览器**与可见窗口。参见 [Browser](/en/tools/browser)。

**推荐默认选项：** 如果您之前遇到过 Gateway 断开连接的情况，请使用 VPS。当您积极使用 Mac 并希望通过可见浏览器进行本地文件访问或 UI 自动化时，本地模式非常好。

### 在专用机器上运行 OpenClaw 有多重要

不是必需的，但**为了可靠性和隔离性而推荐**。

- **专用主机（VPS/Mac mini/Pi）：** 始终在线，更少的睡眠/重启中断，更清晰的权限，更容易保持运行。
- **共享笔记本电脑/台式机：** 对于测试和积极使用完全没问题，但在机器睡眠或更新时期望会有暂停。

如果您想两全其美，请将 Gateway 保持在专用主机上，并将您的笔记本电脑配对为用于本地屏幕/相机/执行工具的**节点**。参见 [Nodes](/en/nodes)。
有关安全指导，请阅读 [Security](/en/gateway/security)。

### 最低 VPS 要求和推荐的操作系统是什么

OpenClaw 是轻量级的。对于基本的 Gateway + 一个聊天频道：

- **绝对最低要求：** 1 vCPU、1GB RAM、约 500MB 磁盘空间。
- **推荐：** 1-2 vCPU、2GB 或更多 RAM 以留有余地（日志、媒体、多个频道）。节点工具和浏览器自动化可能会消耗大量资源。

操作系统：使用 **Ubuntu LTS**（或任何现代的 Debian/Ubuntu）。Linux 安装路径在那里经过了最充分的测试。

文档：[Linux](/en/platforms/linux)、[VPS hosting](/en/vps)。

### 我可以在 VM 中运行 OpenClaw 吗，有什么要求

可以。将 VM 视为与 VPS 相同：它需要始终在线、可访问，并有足够的 RAM 来运行 Gateway 和您启用的任何频道。

基本指导：

- **绝对最低要求：** 1 vCPU、1GB RAM。
- **推荐：** 2GB 或更多 RAM，如果您运行多个频道、浏览器自动化或媒体工具。
- **操作系统：** Ubuntu LTS 或另一个现代 Debian/Ubuntu。

如果您使用的是 Windows，**WSL2 是最简单的 VM 风格设置**，并且具有最佳的工具兼容性。参见 [Windows](/en/platforms/windows)、[VPS hosting](/en/vps)。
如果您在 VM 中运行 macOS，请参见 [macOS VM](/en/platforms/macos-vm)。

## 什么是 OpenClaw？

### 用一段话描述 OpenClaw

OpenClaw 是一个运行在您自己设备上的个人 AI 助手。它在您已经使用的消息平台上回复（WhatsApp、Telegram、Slack、Mattermost（插件）、Discord、Google Chat、Signal、iMessage、WebChat），并且可以在支持的平台上进行语音对话和实时 Canvas。**Gateway** 是始终在线的控制平面；助手就是产品本身。

### 有什么价值主张

OpenClaw 不仅仅是"一个 Claude 包装器"。它是一个**本地优先的控制平面**，让您可以在**自己的硬件**上运行功能强大的助手，从您已经使用的聊天应用程序访问，具有有状态会话、记忆和工具功能——而无需将工作流程的控制权交给托管的 SaaS。

亮点：

- **您的设备，您的数据：** 在您想要的任何地方（Mac、Linux、VPS）运行 Gateway，并将工作区 + 会话历史保存在本地。
- **真实渠道，而不是 Web 沙箱：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，以及在支持的平台上的移动语音和 Canvas。
- **模型无关：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，支持每个代理的路由和故障转移。
- **仅本地选项：** 运行本地模型，这样如果需要，**所有数据都可以保留在您的设备上**。
- **多代理路由：** 为每个渠道、账户或任务设置单独的代理，每个都有自己的工作区和默认设置。
- **开源且可定制：** 检查、扩展和自托管，没有供应商锁定。

文档：[Gateway](/en/gateway)、[Channels](/en/channels)、[Multi-agent](/en/concepts/multi-agent)、[Memory](/en/concepts/memory)。

### 我刚设置好，首先应该做什么

不错的入门项目：

- 构建一个网站（WordPress、Shopify 或简单的静态站点）。
- 制作移动应用原型（大纲、屏幕、API 计划）。
- 整理文件和文件夹（清理、命名、标记）。
- 连接 Gmail 并自动生成摘要或跟进。

它可以处理大型任务，但当您将其分解为多个阶段并使用子代理进行并行工作时，效果最佳。

### OpenClaw 的五大日常使用场景是什么

日常优势通常包括：

- **个人简报：** 收件箱、日历和您关心的新闻摘要。
- **研究和起草：** 快速研究、摘要以及电子邮件或文档的初稿。
- **提醒和跟进：** 由 cron 或心跳驱动的提醒和检查清单。
- **浏览器自动化：** 填写表单、收集数据和重复的 Web 任务。
- **跨设备协调：** 从手机发送任务，让 Gateway 在服务器上运行，并在聊天中获取结果。

### OpenClaw 能否帮助 SaaS 进行潜在客户开发、外联、广告和博客

可用于**研究、资格审查和起草**。它可以扫描网站、建立候选名单、
总结潜在客户，并编写外联或广告文案草稿。

对于**外联或广告投放**，请保持人工参与。避免垃圾邮件，遵守当地法律和
平台政策，并在发送之前审查任何内容。最安全的模式是让
OpenClaw 起草，您来批准。

文档：[Security](/en/gateway/security)。

### 与 Claude Code 相比，OpenClaw 在 Web 开发方面有什么优势

OpenClaw 是一个**个人助理**和协调层，不是 IDE 的替代品。使用
Claude Code 或 Codex 在仓库内进行最快的直接编码循环。当您
想要持久的内存、跨设备访问和工具编排时，使用 OpenClaw。

优势：

- **跨会话的持久记忆 + 工作区**
- **多平台访问**（WhatsApp、Telegram、TUI、WebChat）
- **工具编排**（浏览器、文件、调度、钩子）
- **始终在线的 Gateway**（在 VPS 上运行，从任何地方交互）
- 用于本地浏览器/屏幕/相机/执行的**节点**

展示：https://openclaw.ai/showcase

## 技能和自动化

### 如何自定义技能而不让仓库变脏

使用托管覆盖而不是编辑仓库副本。将您的更改放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加文件夹）。优先级是 `<workspace>/skills` > `~/.openclaw/skills` > 捆绑的，因此托管覆盖胜出而无需触及 git。只有值得上游合并的编辑才应该存在于仓库中并作为 PR 提交。

### 我可以从自定义文件夹加载技能吗

可以。通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加额外的目录（最低优先级）。默认优先级保持不变：`<workspace>/skills` → `~/.openclaw/skills` → 捆绑的 → `skills.load.extraDirs`。`clawhub` 默认安装到 `./skills`，OpenClaw 将其视为 `<workspace>/skills`。

### 如何为不同的任务使用不同的模型

目前支持的模式有：

- **Cron 作业**：隔离的作业可以为每个作业设置 `model` 覆盖。
- **子代理**：将任务路由到具有不同默认模型的单独代理。
- **按需切换**：使用 `/model` 随时切换当前会话模型。

参见 [Cron jobs](/en/automation/cron-jobs)、[Multi-Agent Routing](/en/concepts/multi-agent) 和 [Slash commands](/en/tools/slash-commands)。

### The bot freezes while doing heavy work How do I offload that

Use **sub-agents** for long or parallel tasks. Sub-agents run in their own session,
return a summary, and keep your main chat responsive.

Ask your bot to "spawn a sub-agent for this task" or use `/subagents`.
Use `/status` in chat to see what the Gateway is doing right now (and whether it is busy).

有。请参阅[沙盒](/en/gateway/sandboxing)。有关 Docker 特定设置（Docker 中的完整 gateway 或沙盒镜像），请参阅 [Docker](/en/install/docker)。

Docs: [Sub-agents](/en/tools/subagents).

### Cron or reminders do not fire What should I check

Cron runs inside the Gateway process. If the Gateway is not running continuously,
scheduled jobs will not run.

Checklist:

- 通过捆绑的 CLI 安装 Playwright 浏览器：
  `node /app/node_modules/playwright-core/cli.js install chromium`
- 设置 `PLAYWRIGHT_BROWSERS_PATH` 并确保路径被持久化。
- Verify timezone settings for the job (`--tz` vs host timezone).

**我可以保持私信私密，但使用一个代理使群组公开沙盒化吗**

```bash
openclaw cron run <jobId> --force
openclaw cron runs --id <jobId> --limit 50
```

可以 — 如果您的私人流量是**私信**，而您的公共流量是**群组**。

### How do I install skills on Linux

设置演练 + 示例配置：[群组：私人私信 + 公共群组](/en/concepts/groups#pattern-personal-dms-public-groups-single-agent)

关键配置参考：[Gateway 配置](/en/gateway/configuration#agentsdefaultssandbox)

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

### 如何将主机文件夹绑定到沙盒中

将 `agents.defaults.sandbox.docker.binds` 设置为 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全局 + 每个代理的绑定合并；当 `scope: "shared"` 时，每个代理的绑定将被忽略。对任何敏感内容使用 `:ro`，并记住绑定会绕过沙盒文件系统墙。请参阅[沙盒](/en/gateway/sandboxing#custom-bind-mounts) 和 [沙盒 vs 工具策略 vs 提升权限](/en/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) 了解示例和安全说明。

- **Cron jobs** for scheduled or recurring tasks (persist across restarts).
- **Heartbeat** for "main session" periodic checks.
- `memory/YYYY-MM-DD.md` 中的每日笔记

Docs: [Cron jobs](/en/automation/cron-jobs), [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat),
[Heartbeat](/en/gateway/heartbeat).

OpenClaw 还运行**静默预压缩内存刷新**，以提醒模型
在自动压缩之前写入持久笔记。这仅在工作区可写时运行
（只读沙盒会跳过它）。请参阅[内存](/en/concepts/memory)。

Not directly. macOS skills are gated by `metadata.openclaw.os` plus required binaries, and skills only appear in the system prompt when they are eligible on the **Gateway host**. On Linux, `darwin`-only skills (like `apple-notes`, `apple-reminders`, `things-mac`) will not load unless you override the gating.

对长时间或并行任务使用**子代理**。子代理在自己的会话中运行，
返回摘要，并使您的主聊天保持响应。

要求您的机器人"为此任务生成一个子代理"或使用 `/subagents`。
在聊天中使用 `/status` 查看 Gateway 当前正在做什么（以及它是否忙碌）。

令牌提示：长时间任务和子代理都会消耗令牌。如果成本是一个问题，请通过 `agents.defaults.subagents.model` 为子代理设置更便宜的模型。

文档：[子代理](/en/tools/subagents)。

1. Create an SSH wrapper for the binary (example: `memo` for Apple Notes):
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
   ```
2. Put the wrapper on `PATH` on the Linux host (for example `~/bin/memo`).
3. Override the skill metadata (workspace or `~/.openclaw/skills`) to allow Linux:
   ```markdown
   ---
   name: apple-notes
   description: Manage Apple Notes via the memo CLI on macOS.
   metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
   ---
   ```
- 确认 cron 已启用（`cron.enabled`）并且未设置 `OPENCLAW_SKIP_CRON`。

### Do you have a Notion or HeyGen integration

Not built-in today.

调试：

- **Custom skill / plugin:** best for reliable API access (Notion/HeyGen both have APIs).
- **Browser automation:** works without code but is slower and more fragile.

使用 **ClawHub** (CLI) 或将技能放入您的工作区。macOS 技能 UI 在 Linux 上不可用。
在 https://clawhub.com 浏览技能。

- One Notion page per client (context + preferences + active work).
- Ask the agent to fetch that page at the start of a session.

可以。使用 Gateway 调度器：

Install skills:

```bash
clawhub install <skill-slug>
clawhub update --all
```

ClawHub installs into `./skills` under your current directory (or falls back to your configured OpenClaw workspace); OpenClaw treats that as `<workspace>/skills` on the next session. For shared skills across agents, place them in `~/.openclaw/skills/<name>/SKILL.md`. Some skills expect binaries installed via Homebrew; on Linux that means Linuxbrew (see the Homebrew Linux FAQ entry above). See [Skills](/en/tools/skills) and [ClawHub](/en/tools/clawhub).

### How do I install the Chrome extension for browser takeover

文档：[Cron 作业](/en/automation/cron-jobs)、[Cron vs 心跳](/en/automation/cron-vs-heartbeat)、
[心跳](/en/gateway/heartbeat)。

```bash
openclaw browser extension install
openclaw browser extension path
```

**我可以从 Linux 运行仅 Apple/macOS 的技能吗**

不能直接运行。macOS 技能受 `metadata.openclaw.os` 加上所需二进制文件的限制，并且技能只有在 **Gateway 主机**上有资格时才会出现在系统提示中。在 Linux 上，`darwin` 仅限的技能（如 `apple-notes`、`apple-reminders`、`things-mac`）将不会加载，除非您覆盖限制。

您有三种支持的模式：

## Sandboxing and memory

### Is there a dedicated sandboxing doc

Yes. See [Sandboxing](/en/gateway/sandboxing). For Docker-specific setup (full gateway in Docker or sandbox images), see [Docker](/en/install/docker).

### Docker feels limited How do I enable full features

The default image is security-first and runs as the `node` user, so it does not
include system packages, Homebrew, or bundled browsers. For a fuller setup:

4. 启动新会话，以便技能快照刷新。
- Bake system deps into the image with `OPENCLAW_DOCKER_APT_PACKAGES`.
- Install Playwright browsers via the bundled CLI:
  `node /app/node_modules/playwright-core/cli.js install chromium`
- Set `PLAYWRIGHT_BROWSERS_PATH` and ensure the path is persisted.

Docs: [Docker](/en/install/docker), [Browser](/en/tools/browser).

**Can I keep DMs personal but make groups public sandboxed with one agent**

如果您想为每个客户保留上下文（代理机构工作流程），一个简单的模式是：

Use `agents.defaults.sandbox.mode: "non-main"` so group/channel sessions (non-main keys) run in Docker, while the main DM session stays on-host. Then restrict what tools are available in sandboxed sessions via `tools.sandbox.tools`.

Setup walkthrough + example config: [Groups: personal DMs + public groups](/en/concepts/groups#pattern-personal-dms-public-groups-single-agent)

如果您想要原生集成，请打开功能请求或构建针对这些 API 的技能。

### How do I bind a host folder into the sandbox

ClawHub 安装到当前目录下的 `./skills` 中（或回退到您配置的 OpenClaw 工作区）；OpenClaw 在下一次会话时将其视为 `<workspace>/skills`。要跨代理共享技能，请将它们放在 `~/.openclaw/skills/<name>/SKILL.md` 中。某些技能期望通过 Homebrew 安装二进制文件；在 Linux 上，这意味着 Linuxbrew（请参阅上面的 Homebrew Linux FAQ 条目）。请参阅[技能](/en/tools/skills) 和 [ClawHub](/en/tools/clawhub)。

### 如何安装 Chrome 扩展程序以接管浏览器

使用内置安装程序，然后在 Chrome 中加载解压的扩展程序：

- Daily notes in `memory/YYYY-MM-DD.md`
- Curated long-term notes in `MEMORY.md` (main/private sessions only)

OpenClaw also runs a **silent pre-compaction memory flush** to remind the model
to write durable notes before auto-compaction. This only runs when the workspace
is writable (read-only sandboxes skip it). See [Memory](/en/concepts/memory).

### Memory keeps forgetting things How do I make it stick

这仍然是我们要改进的领域。提醒模型存储记忆会有帮助；
它会知道该做什么。如果它一直忘记，请验证 Gateway 在每次运行时使用相同的工作区。

文档：[内存](/en/concepts/memory)、[代理工作区](/en/concepts/agent-workspace)。

Docs: [Memory](/en/concepts/memory), [Agent workspace](/en/concepts/agent-workspace).

### Does semantic memory search require an OpenAI API key

如果您没有明确设置提供商，OpenClaw 在可以解析 API 密钥（认证配置文件、`models.providers.*.apiKey` 或环境变量）时会自动选择提供商。
如果可以解析 OpenAI 密钥，它更喜欢 OpenAI，否则如果可以解析 Gemini 密钥，则更喜欢 Gemini。如果两个密钥都不可用，内存搜索将保持禁用状态，直到您配置它。如果您配置并存在本地模型路径，OpenClaw 更喜欢 `local`。

如果您想保持本地，请设置 `memorySearch.provider = "local"`（可选地
`memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，请设置
`memorySearch.provider = "gemini"` 并提供 `GEMINI_API_KEY`（或
`memorySearch.remote.apiKey`）。我们支持 **OpenAI、Gemini 或本地**嵌入
模型 — 有关设置详细信息，请参阅[内存](/en/concepts/memory)。

If you'd rather stay local, set `memorySearch.provider = "local"` (and optionally
`memorySearch.fallback = "none"`). If you want Gemini embeddings, set
`memorySearch.provider = "gemini"` and provide `GEMINI_API_KEY` (or
`memorySearch.remote.apiKey`). We support **OpenAI, Gemini, or local** embedding
models - see [Memory](/en/concepts/memory) for the setup details.

### Does memory persist forever What are the limits

文档：[内存](/en/concepts/memory)、[上下文](/en/concepts/context)。

Docs: [Memory](/en/concepts/memory), [Context](/en/concepts/context).

### 与 OpenClaw 一起使用的所有数据都保存在本地吗

### Is all data used with OpenClaw saved locally

No - **OpenClaw's state is local**, but **external services still see what you send them**.

- **必要时远程：**您发送给模型提供商的消息 go 到
  它们的 API，聊天平台存储消息数据在它们的服务器上。
- **您控制足迹：**使用本地模型将提示保留在您的机器上，但频道
  流量仍然通过频道的服务器。
相关内容：[代理工作区](/en/concepts/agent-workspace)、[内存](/en/concepts/memory)。
- **You control the footprint:** using local models keeps prompts on your machine, but channel
  traffic still goes through the channel's servers.

所有内容都在 `$OPENCLAW_STATE_DIR` 下（默认：`~/.openclaw`）：

### Where does OpenClaw store its data

您的**工作区**（AGENTS.md、内存文件、技能等）是独立的，并通过 `agents.defaults.workspace` 配置（默认：`~/.openclaw/workspace`）。

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

Legacy single-agent path: `~/.openclaw/agent/*` (migrated by `openclaw doctor`).

这些文件位于**代理工作区**中，而不是 `~/.openclaw`。

### Where should AGENTSmd SOULmd USERmd MEMORYmd live

These files live in the **agent workspace**, not `~/.openclaw`.

- **Workspace (per agent)**: `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
  `MEMORY.md` (or `memory.md`), `memory/YYYY-MM-DD.md`, optional `HEARTBEAT.md`.
- **State dir (`~/.openclaw`)**: config, credentials, auth profiles, sessions, logs,
  and shared skills (`~/.openclaw/skills`).

提示：如果您想要持久的行为或偏好，请要求机器人**将其写入 AGENTS.md 或 MEMORY.md**，而不是依赖聊天历史。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

请参阅[代理工作区](/en/concepts/agent-workspace) 和[内存](/en/concepts/memory)。

Tip: if you want a durable behavior or preference, ask the bot to **write it into
AGENTS.md or MEMORY.md** rather than relying on chat history.

将您的**代理工作区**放在一个**私有**的 git 仓库中，并将其备份到某个私有地方（例如 GitHub 私有仓库）。这会捕获内存 + AGENTS/SOUL/USER 文件，并让您稍后恢复助手的"思维"。

### What's the recommended backup strategy

文档：[代理工作区](/en/concepts/agent-workspace)。

Do **not** commit anything under `~/.openclaw` (credentials, sessions, tokens).
If you need a full restore, back up both the workspace and the state directory
separately (see the migration question above).

请参阅专用指南：[卸载](/en/install/uninstall)。

### 代理可以在工作区之外工作吗

可以。工作区是**默认 cwd**和内存锚点，而不是硬沙盒。
相对路径在工作区内解析，但绝对路径可以访问其他主机位置，除非启用了沙盒。如果您需要隔离，请使用 [`agents.defaults.sandbox`](/en/gateway/sandboxing) 或每个代理的沙盒设置。如果您希望仓库成为默认工作目录，请将该代理的 `workspace` 指向仓库根目录。OpenClaw 仓库只是源代码；除非您有意让代理在其中工作，否则请保持工作区分离。

### Can agents work outside the workspace

Yes. The workspace is the **default cwd** and memory anchor, not a hard sandbox.
Relative paths resolve inside the workspace, but absolute paths can access other
host locations unless sandboxing is enabled. If you need isolation, use
[`agents.defaults.sandbox`](/en/gateway/sandboxing) or per-agent sandbox settings. If you
want a repo to be the default working directory, point that agent's
`workspace` to the repo root. The OpenClaw repo is just source code; keep the
workspace separate unless you intentionally want the agent to work inside it.

会话状态由 **Gateway 主机**拥有。如果您处于远程模式，您关心的会话存储在远程机器上，而不是您的本地笔记本电脑。请参阅[会话管理](/en/concepts/session)。

```json5
{
  agents: {
    defaults: {
      workspace: "~/Projects/my-repo",
    },
  },
}
```

## 配置基础

Session state is owned by the **gateway host**. If you're in remote mode, the session store you care about is on the remote machine, not your local laptop. See [Session management](/en/concepts/session).

## Config basics

### What format is the config Where is it

OpenClaw reads an optional **JSON5** config from `$OPENCLAW_CONFIG_PATH` (default: `~/.openclaw/openclaw.json`):

```
$OPENCLAW_CONFIG_PATH
```

非环回绑定**需要认证**。配置 `gateway.auth.mode` + `gateway.auth.token`（或使用 `OPENCLAW_GATEWAY_TOKEN`）。

### I set gatewaybind lan or tailnet and now nothing listens the UI says unauthorized

Non-loopback binds **require auth**. Configure `gateway.auth.mode` + `gateway.auth.token` (or use `OPENCLAW_GATEWAY_TOKEN`).

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

仅当您需要硬隔离（安全边界）或非常不同的配置且不想共享时，才使用单独的 VPS。否则，保持一个 Gateway 并使用多个代理或子代理。

- `gateway.remote.token` is for **remote CLI calls** only; it does not enable local gateway auth.
- The Control UI authenticates via `connect.params.auth.token` (stored in app/UI settings). Avoid putting tokens in URLs.

### 两个 OpenClaw 实例可以相互通信吗（本地 + VPS）

可以。没有内置的"机器人到机器人"桥接，但您可以通过几种可靠的方式连接它：

**最简单：**使用两个机器人都可以访问的正常聊天频道。
让机器人 A 向机器人 B 发送消息，然后让机器人 B 像往常一样回复。

### Do I have to restart after changing config

示例模式（从可以访问目标 Gateway 的机器运行）：

- `gateway.reload.mode: "hybrid"` (default): hot-apply safe changes, restart for critical ones
- `hot`, `restart`, `off` are also supported

### 多个代理需要单独的 VPS 吗

不需要。一个 Gateway 可以托管多个代理，每个代理都有自己的工作区、模型默认值和路由。这是正常的设置，比为每个代理运行一个 VPS 便宜和简单得多。

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

仅当您需要硬隔离（安全边界）或非常不同的配置且不想共享时，才使用单独的 VPS。否则，保持一个 Gateway 并使用多个代理或子代理。

- If you use allowlists, add `web_search`/`web_fetch` or `group:web`.
- `web_fetch` is enabled by default (unless explicitly disabled).
- **无需传入 SSH。**节点连接到 Gateway WebSocket 并使用设备配对。

Docs: [Web tools](/en/tools/web).

### How do I run a central Gateway with specialized workers across devices

The common pattern is **one Gateway** (e.g. Raspberry Pi) plus **nodes** and **agents**:

- **Gateway (central):** owns channels (Signal/WhatsApp), routing, and sessions.
- **Nodes (devices):** Macs/iOS/Android connect as peripherals and expose local tools (`system.run`, `canvas`, `camera`).
- **Agents (workers):** separate brains/workspaces for special roles (e.g. "Hetzner ops", "Personal data").
- `gateway.reload.mode: "hybrid"`（默认）：热应用安全更改，为关键更改重启
- `hot`、`restart`、`off` 也受支持

Docs: [Nodes](/en/nodes), [Remote access](/en/gateway/remote), [Multi-Agent Routing](/en/concepts/multi-agent), [Sub-agents](/en/tools/subagents), [TUI](/en/tui).

### Can the OpenClaw browser run headless

注意：

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

Default is `false` (headful). Headless is more likely to trigger anti-bot checks on some sites. See [Browser](/en/tools/browser).

Headless uses the **same Chromium engine** and works for most automation (forms, clicks, scraping, logins). The main differences:

- 守护进程从 `~/.openclaw/.env`（或服务环境）读取环境变量。
- Some sites are stricter about automation in headless mode (CAPTCHAs, anti-bot).
  For example, X/Twitter often blocks headless sessions.

### 如何使用跨设备的专用工作程序运行中央 Gateway

常见的模式是**一个 Gateway**（例如 Raspberry Pi）加上**节点**和**代理**：

## Remote gateways + nodes

### How do commands propagate between Telegram the gateway and nodes

Telegram messages are handled by the **gateway**. The gateway runs the agent and
only then calls nodes over the **Gateway WebSocket** when a node tool is needed:

Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

Nodes don't see inbound provider traffic; they only receive node RPC calls.

### How can my agent access my computer if the Gateway is hosted remotely

Short answer: **pair your computer as a node**. The Gateway runs elsewhere, but it can
call `node.*` tools (screen, camera, system) on your local machine over the Gateway WebSocket.

可以。这是一个配置选项：

1. Run the Gateway on the always-on host (VPS/home server).
2. Put the Gateway host + your computer on the same tailnet.
- 没有可见的浏览器窗口（如果需要视觉效果，请使用屏幕截图）。
- 某些站点对无头模式下的自动化更严格（CAPTCHA、反机器人）。
  例如，X/Twitter 经常阻止无头会话。
5. Approve the node on the Gateway:
   ```bash
   openclaw nodes pending
   openclaw nodes approve <requestId>
   ```

将 `browser.executablePath` 设置为您的 Brave 二进制文件（或任何基于 Chromium 的浏览器）并重启 Gateway。请参阅[浏览器](/en/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置示例。

Security reminder: pairing a macOS node allows `system.run` on that machine. Only
pair devices you trust, and review [Security](/en/gateway/security).

Docs: [Nodes](/en/nodes), [Gateway protocol](/en/gateway/protocol), [macOS remote mode](/en/platforms/mac/remote), [Security](/en/gateway/security).

### Tailscale is connected but I get no replies What now

Telegram → Gateway → 代理 → `node.*` → 节点 → Gateway → Telegram

- Gateway is running: `openclaw gateway status`
- Gateway health: `openclaw status`
- Channel health: `openclaw channels status`

典型设置：

1. 在常开主机（VPS/家庭服务器）上运行 Gateway。
2. 将 Gateway 主机 + 您的计算机放在同一个 tailnet 上。
3. 确保 Gateway WS 可访问（tailnet 绑定或 SSH 隧道）。

Docs: [Tailscale](/en/gateway/tailscale), [Remote access](/en/gateway/remote), [Channels](/en/channels).

### Can two OpenClaw instances talk to each other local VPS

不需要单独的 TCP 桥接；节点通过 Gateway WebSocket 连接。

安全提醒：配对 macOS 节点允许在该机器上进行 `system.run`。仅配对您信任的设备，并查阅[安全性](/en/gateway/security)。

文档：[节点](/en/nodes)、[Gateway 协议](/en/gateway/protocol)、[macOS 远程模式](/en/platforms/mac/remote)、[安全性](/en/gateway/security)。

Example pattern (run from a machine that can reach the target Gateway):

```bash
openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
```

检查基础：

Docs: [Remote access](/en/gateway/remote), [Agent CLI](/en/cli/agent), [Agent send](/en/tools/agent-send).

### Do I need separate VPSes for multiple agents

No. One Gateway can host multiple agents, each with its own workspace, model defaults,
and routing. That is the normal setup and it is much cheaper and simpler than running
one VPS per agent.

然后验证认证和路由：

### Is there a benefit to using a node on my personal laptop instead of SSH from a VPS

Yes - nodes are the first-class way to reach your laptop from a remote Gateway, and they
unlock more than shell access. The Gateway runs on macOS/Linux (Windows via WSL2) and is
lightweight (a small VPS or Raspberry Pi-class box is fine; 4 GB RAM is plenty), so a common
setup is an always-on host plus your laptop as a node.

- 确认您的允许列表（私信或群组）包括您的帐户。
然后重启 gateway 并重新检查：
- **Safer execution controls.** `system.run` is gated by node allowlists/approvals on that laptop.
- **More device tools.** Nodes expose `canvas`, `camera`, and `screen` in addition to `system.run`.
- **Local browser automation.** Keep the Gateway on a VPS, but run Chrome locally and relay control
  with the Chrome extension + a node host on the laptop.

发送 `/new` 或 `/reset` 作为独立消息。请参阅[会话管理](/en/concepts/session)。

Docs: [Nodes](/en/nodes), [Nodes CLI](/en/cli/nodes), [Chrome extension](/en/tools/chrome-extension).

### Should I install on a second laptop or just add a node

If you only need **local tools** (screen/camera/exec) on the second laptop, add it as a
**node**. That keeps a single Gateway and avoids duplicated config. Local node tools are
currently macOS-only, but we plan to extend them to other OSes.

可以，通过**多代理路由**和**子代理**。您可以创建一个协调器代理和几个具有各自工作区和模型的工作代理。

也就是说，这最好被视为一个**有趣的实验**。它消耗大量令牌，并且通常比使用一个具有单独会话的机器人效率低。我们设想的典型模型是您与之交谈的一个机器人，并为并行工作使用不同的会话。该机器人还可以在需要时生成子代理。

### Do nodes run a gateway service

No. Only **one gateway** should run per host unless you intentionally run isolated profiles (see [Multiple gateways](/en/gateway/multiple-gateways)). Nodes are peripherals that connect
to the gateway (iOS/Android nodes, or macOS "node mode" in the menubar app). For headless node
hosts and CLI control, see [Node host CLI](/en/cli/node).

会话上下文受模型窗口限制。长聊天、大型工具输出或许多文件可能会触发压缩或截断。

### Is there an API RPC way to apply config

Yes. `config.apply` validates + writes the full config and restarts the Gateway as part of the operation.

### configapply wiped my config How do I recover and avoid this

`config.apply` replaces the **entire config**. If you send a partial object, everything
else is removed.

Recover:

- 如果这种情况经常发生，请选择具有更大上下文窗口的模型。
- If you have no backup, re-run `openclaw doctor` and reconfigure channels/models.
- If this was unexpected, file a bug and include your last known config or any backup.
- A local coding agent can often reconstruct a working config from logs or history.

然后重新运行入职：

- Use `openclaw config set` for small changes.
- 入职向导还在看到现有配置时提供**重置**。请参阅[向导](/en/start/wizard)。

Docs: [Config](/en/cli/config), [Configure](/en/cli/configure), [Doctor](/en/gateway/doctor).

### What's a minimal sane config for a first install

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

This sets your workspace and restricts who can trigger the bot.

### How do I set up Tailscale on a VPS and connect from my Mac

仅当您需要**硬隔离**或两个完全独立的机器人时，才安装第二个 Gateway。

1. **Install + login on the VPS**
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```
2. **Install + login on your Mac**
   - Use the Tailscale app and sign in to the same tailnet.
3. **Enable MagicDNS (recommended)**
   - In the Tailscale admin console, enable MagicDNS so the VPS has a stable name.
4. **Use the tailnet hostname**
   - SSH: `ssh user@your-vps.tailnet-xxxx.ts.net`
   - Gateway WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

If you want the Control UI without SSH, use Tailscale Serve on the VPS:

```bash
openclaw gateway --tailscale serve
```

有。`config.apply` 验证 + 写入完整配置，并在操作期间重启 Gateway。

### config.apply 清除了我的配置。如何恢复并避免这种情况

`config.apply` 替换**整个配置**。如果您发送部分对象，其他所有内容都将被删除。

恢复：

- 从备份恢复（git 或复制的 `~/.openclaw/openclaw.json`）。
- 如果您没有备份，请重新运行 `openclaw doctor` 并重新配置频道/模型。
- 如果这是意外的，请提交错误并包含您最后已知的配置或任何备份。

Docs: [Gateway protocol](/en/gateway/protocol), [Discovery](/en/gateway/discovery), [macOS remote mode](/en/platforms/mac/remote).

## Env vars and .env loading

### How does OpenClaw load environment variables

OpenClaw reads env vars from the parent process (shell, launchd/systemd, CI, etc.) and additionally loads:

- `.env` from the current working directory
- a global fallback `.env` from `~/.openclaw/.env` (aka `$OPENCLAW_STATE_DIR/.env`)

这将设置您的工作区并限制谁可以触发机器人。

You can also define inline env vars in config (applied only if missing from the process env):

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

最少的步骤：

### I started the Gateway via the service and my env vars disappeared What now

Two common fixes:

3. **启用 MagicDNS（推荐）**
   - 在 Tailscale 管理控制台中，启用 MagicDNS，以便 VPS 具有稳定的名称。
4. **使用 tailnet 主机名**
   - SSH：`ssh user@your-vps.tailnet-xxxx.ts.net`
   - Gateway WS：`ws://your-vps.tailnet-xxxx.ts.net:18789`
如果您想要无需 SSH 的控制 UI，请在 VPS 上使用 Tailscale Serve：

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

这将使 gateway 绑定到环回并通过 Tailscale 暴露 HTTPS。请参阅 [Tailscale](/en/gateway/tailscale)。

### 如何将 Mac 节点连接到远程 Gateway (Tailscale Serve)

Serve 暴露 **Gateway 控制 UI + WS**。节点通过同一个 Gateway WS 端点连接。

推荐设置：

1. **确保 VPS + Mac 在同一个 tailnet 上**。
2. **在远程模式下使用 macOS 应用程序**（SSH 目标可以是 tailnet 主机名）。
   应用程序将隧道传输 Gateway 端口并作为节点连接。
3. **在 gateway 上批准节点**：
   ```bash
   openclaw nodes pending
   openclaw nodes approve <requestId>
   ```

文档：[Gateway 协议](/en/gateway/protocol)、[发现](/en/gateway/discovery)、[macOS 远程模式](/en/platforms/mac/remote)。

```bash
openclaw models status
```

Copilot tokens are read from `COPILOT_GITHUB_TOKEN` (also `GH_TOKEN` / `GITHUB_TOKEN`).
See [/concepts/model-providers](/en/concepts/model-providers) and [/environment](/en/environment).

### OpenClaw 如何加载环境变量

### How do I start a fresh conversation

Send `/new` or `/reset` as a standalone message. See [Session management](/en/concepts/session).

### Do sessions reset automatically if I never send new

两个 `.env` 文件都不会覆盖现有的环境变量。

```json5
{
  session: {
    idleMinutes: 240,
  },
}
```

### Is there a way to make a team of OpenClaw instances one CEO and many agents

有关完整的优先级和来源，请参阅 [/environment](/en/environment)。

That said, this is best seen as a **fun experiment**. It is token heavy and often
less efficient than using one bot with separate sessions. The typical model we
envision is one bot you talk to, with different sessions for parallel work. That
bot can also spawn sub-agents when needed.

两种常见的修复方法：

### Why did context get truncated midtask How do I prevent it

Session context is limited by the model window. Long chats, large tool outputs, or many
files can trigger compaction or truncation.

这将运行您的登录 shell 并仅导入缺失的预期密钥（从不覆盖）。环境变量等效项：`OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

- Ask the bot to summarize the current state and write it to a file.
- Use `/compact` before long tasks, and `/new` when switching topics.
- Keep important context in the workspace and ask the bot to read it back.
1. 将令牌放在 `~/.openclaw/.env` 中：
   ```
   COPILOT_GITHUB_TOKEN=...
   ```
2. 或启用 shell 导入（`env.shellEnv.enabled: true`）。

### How do I completely reset OpenClaw but keep it installed

Use the reset command:

```bash
openclaw reset
```

使用以下方法之一：

```bash
openclaw reset --scope full --yes --non-interactive
```

Then re-run onboarding:

```bash
openclaw onboard --install-daemon
```

仅当您需要硬隔离（安全边界）或非常不同的配置且不想共享时，才使用单独的 VPS。否则，保持一个 Gateway 并使用多个代理或子代理。

- The onboarding wizard also offers **Reset** if it sees an existing config. See [Wizard](/en/start/wizard).
- 启用或调整**会话修剪**（`agents.defaults.contextPruning`）以修剪旧工具输出。
- 使用具有更大上下文窗口的模型。

### Im getting context too large errors how do I reset or compact

Use one of these:

- **Compact** (keeps the conversation but summarizes older turns):

  ```
  /compact
  ```

  or `/compact <instructions>` to guide the summary.

- **Reset** (fresh session ID for the same chat key):
  ```
  /new
  /reset
  ```

If it keeps happening:

- Enable or tune **session pruning** (`agents.defaults.contextPruning`) to trim old tool output.
- Use a model with a larger context window.

每个代理的覆盖使用 `agents.list[].heartbeat`。文档：[心跳](/en/gateway/heartbeat)。

### 我需要将机器人帐户添加到 WhatsApp 群组吗

不需要。OpenClaw 在**您自己的帐户**上运行，因此如果您在群组中，OpenClaw 可以看到它。默认情况下，群组回复被阻止，直到您允许发送者（`groupPolicy: "allowlist"`）。

如果您只想让**您**能够触发群组回复：

### 如何获取 WhatsApp 群组的 JID

选项 1（最快）：跟踪日志并在群组中发送测试消息：

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

查找 `chatId`（或 `from`）以 `@g.us` 结尾，如：
`1234567890-1234567890@g.us`。

选项 2（如果已配置/允许列表）：从配置中列出群组：

### Do I need to add a bot account to a WhatsApp group

No. OpenClaw runs on **your own account**, so if you're in the group, OpenClaw can see it.
By default, group replies are blocked until you allow senders (`groupPolicy: "allowlist"`).

两个常见原因：

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

### How do I get the JID of a WhatsApp group

Option 1 (fastest): tail logs and send a test message in the group:

```bash
openclaw logs --follow --json
```

请参阅[群组](/en/concepts/groups) 和[群组消息](/en/concepts/group-messages)。

Option 2 (if already configured/allowlisted): list groups from config:

```bash
openclaw directory groups list --channel whatsapp
```

直接聊天默认折叠到主会话。群组/频道有自己的会话密钥，Telegram 主题/Discord 线程是独立的会话。请参阅[群组](/en/concepts/groups) 和[群组消息](/en/concepts/group-messages)。

### 我可以创建多少个工作区和代理

没有硬性限制。几十个（甚至数百个）都可以，但请注意：

- **磁盘增长：**会话 + 记录位于 `~/.openclaw/agents/<agentId>/sessions/` 下。
- **令牌成本：**更多代理意味着更多并发的模型使用。

See [Groups](/en/concepts/groups) and [Group messages](/en/concepts/group-messages).

### Do groupsthreads share context with DMs

Direct chats collapse to the main session by default. Groups/channels have their own session keys, and Telegram topics / Discord threads are separate sessions. See [Groups](/en/concepts/groups) and [Group messages](/en/concepts/group-messages).

### How many workspaces and agents can I create

No hard limits. Dozens (even hundreds) are fine, but watch for:

- **Disk growth:** sessions + transcripts live under `~/.openclaw/agents/<agentId>/sessions/`.
- **Token cost:** more agents means more concurrent model usage.
- **Ops overhead:** per-agent auth profiles, workspaces, and channel routing.

最佳实践设置：

- 常开的 Gateway 主机（VPS/Mac mini）。
- 每个角色一个代理（绑定）。
- 绑定到这些代理的 Slack 频道。

### Can I run multiple bots or chats at the same time Slack and how should I set that up

文档：[多代理路由](/en/concepts/multi-agent)、[Slack](/en/channels/slack)、[浏览器](/en/tools/browser)、[Chrome 扩展](/en/tools/chrome-extension)、[节点](/en/nodes)。

Browser access is powerful but not "do anything a human can" - anti-bot, CAPTCHAs, and MFA can
still block automation. For the most reliable browser control, use the Chrome extension relay
on the machine that runs the browser (and keep the Gateway anywhere).

Best-practice setup:

- Always-on Gateway host (VPS/Mac mini).
- One agent per role (bindings).
- Slack channel(s) bound to those agents.
- Local browser via extension relay (or a node) when needed.

MiniMax M2.1 有自己的文档：[MiniMax](/en/providers/minimax) 和
[本地模型](/en/gateway/local-models)。

## Models: defaults, selection, aliases, switching

### What is the default model

更多上下文：[模型](/en/concepts/models)。

```
agents.defaults.model.primary
```

Models are referenced as `provider/model` (example: `anthropic/claude-opus-4-5`). If you omit the provider, OpenClaw currently assumes `anthropic` as a temporary deprecation fallback - but you should still **explicitly** set `provider/model`.

### What model do you recommend

安全提示：较小或大量量化的模型更容易受到提示注入的影响。我们强烈建议对可以使用工具的任何机器人使用**大型模型**。如果您仍然想要小型模型，请启用沙盒和严格的工具允许列表。

文档：[Ollama](/en/providers/ollama)、[本地模型](/en/gateway/local-models)、
[模型提供商](/en/concepts/model-providers)、[安全性](/en/gateway/security)、
[沙盒](/en/gateway/sandboxing)。

Rule of thumb: use the **best model you can afford** for high-stakes work, and a cheaper
model for routine chat or summaries. You can route models per agent and use sub-agents to
parallelize long tasks (each sub-agent consumes tokens). See [Models](/en/concepts/models) and
[Sub-agents](/en/tools/subagents).

使用**模型命令**或仅编辑**模型**字段。避免完全替换配置。

安全选项：

### Can I use selfhosted models llamacpp vLLM Ollama

Yes. If your local server exposes an OpenAI-compatible API, you can point a
custom provider at it. Ollama is supported directly and is the easiest path.

Security note: smaller or heavily quantized models are more vulnerable to prompt
injection. We strongly recommend **large models** for any bot that can use tools.
If you still want small models, enable sandboxing and strict tool allowlists.

Docs: [Ollama](/en/providers/ollama), [Local models](/en/gateway/local-models),
[Model providers](/en/concepts/model-providers), [Security](/en/gateway/security),
[Sandboxing](/en/gateway/sandboxing).

### How do I switch models without wiping my config

文档：[模型](/en/concepts/models)、[配置](/en/cli/configure)、[配置](/en/cli/config)、[医生](/en/gateway/doctor)。

Safe options:

- **OpenClaw + Flawd：** Anthropic Opus (`anthropic/claude-opus-4-5`) - 请参阅 [Anthropic](/en/providers/anthropic)。
- **Krill：** MiniMax M2.1 (`minimax/MiniMax-M2.1`) - 请参阅 [MiniMax](/en/providers/minimax)。
- `openclaw configure --section models` (interactive)
- edit `agents.defaults.model` in `~/.openclaw/openclaw.json`

Avoid `config.apply` with a partial object unless you intend to replace the whole config.
If you did overwrite config, restore from backup or re-run `openclaw doctor` to repair.

Docs: [Models](/en/concepts/models), [Configure](/en/cli/configure), [Config](/en/cli/config), [Doctor](/en/gateway/doctor).

### What do OpenClaw, Flawd, and Krill use for models

1. **认证配置文件轮换**在同一提供商内。
2. **模型后备**到 `agents.defaults.model.fallbacks` 中的下一个模型。

### How do I switch models on the fly without restarting

Use the `/model` command as a standalone message:

```
/model sonnet
/model haiku
/model opus
/model gpt
/model gpt-mini
/model gemini
/model gemini-flash
```

这意味着系统尝试使用认证配置文件 ID `anthropic:default`，但无法在预期的认证存储中找到它的凭证。

`/model` (and `/model list`) shows a compact, numbered picker. Select by number:

```
/model 3
```

You can also force a specific auth profile for the provider (per session):

```
/model opus@anthropic:default
/model opus@anthropic:work
```

Tip: `/model status` shows which agent is active, which `auth-profiles.json` file is being used, and which auth profile will be tried next.
It also shows the configured provider endpoint (`baseUrl`) and API mode (`api`) when available.

**How do I unpin a profile I set with profile**

Re-run `/model` **without** the `@profile` suffix:

```
/model anthropic/claude-opus-4-5
```

**"No credentials found for profile: anthropic"的修复清单**

### Can I use GPT 5.2 for daily tasks and Codex 5.2 for coding

Yes. Set one as default and switch as needed:

- **如果您想改用 API 密钥**
  - 将 `ANTHROPIC_API_KEY` 放在 **gateway 主机**上的 `~/.openclaw/.env` 中。
  - 清除任何强制缺少配置文件的固定顺序：
    ```bash
    openclaw models auth order clear --provider anthropic
    ```
- **确认您在 gateway 主机上运行命令**
  - 在远程模式下，认证配置文件位于 gateway 机器上，而不是您的笔记本电脑。
- **Sub-agents:** route coding tasks to sub-agents with a different default model.

如果您的模型配置包括 Google Gemini 作为后备（或者您切换到 Gemini 简写），OpenClaw 将在模型后备期间尝试它。如果您没有配置 Google 凭证，您将看到 `No API key found for provider "google"`。

### Why do I see Model is not allowed and then no reply

**"LLM request rejected: ... thinking signature required (google antigravity)"消息**
原因：会话历史包含**没有签名的思考块**（通常来自中止/部分流）。Google Antigravity 需要为思考块提供签名。

```
Model "provider/model" is not allowed. Use /model to list available models.
```

修复：OpenClaw 现在为 Google Antigravity Claude 剥离无符号的思考块。如果仍然出现，请启动**新会话**或为该代理设置 `/thinking off`。

## 认证配置文件：它们是什么以及如何管理它们

相关内容：[/concepts/oauth](/en/concepts/oauth)（OAuth 流程、令牌存储、多帐户模式）

Fix checklist:

1. Upgrade to **2026.1.12** (or run from source `main`), then restart the gateway.
2. Make sure MiniMax is configured (wizard or JSON), or that a MiniMax API key
   exists in env/auth profiles so the provider can be injected.
3. Use the exact model id (case-sensitive): `minimax/MiniMax-M2.1` or
   `minimax/MiniMax-M2.1-lightning`.
- `anthropic:default`（当不存在电子邮件身份时常见）

See [MiniMax](/en/providers/minimax) and [Models](/en/concepts/models).

### Can I use MiniMax as my default and OpenAI for complex tasks

Yes. Use **MiniMax as the default** and switch models **per session** when needed.
Fallbacks are for **errors**, not "hard tasks," so use `/model` or a separate agent.

可以。配置支持配置文件的可选元数据和每个提供商的排序（`auth.order.<provider>`）。这**不**存储机密；它将 ID 映射到提供商/模式并设置轮换顺序。

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

如果配置文件处于短时间的**冷却**（速率限制/超时/认证失败）或较长的**禁用**状态（计费/积分不足），OpenClaw 可能会暂时跳过该配置文件。要检查这一点，请运行 `openclaw models status --json` 并检查 `auth.unusableProfiles`。调整：`auth.cooldowns.billingBackoffHours*`。

```
/model gpt
```

您还可以通过 CLI 为每个代理设置顺序覆盖（存储在该代理的 `auth-profiles.json` 中）：

- Agent A default: MiniMax
- Agent B default: OpenAI
- Route by agent or use `/agent` to switch

Docs: [Models](/en/concepts/models), [Multi-Agent Routing](/en/concepts/multi-agent), [MiniMax](/en/providers/minimax), [OpenAI](/en/providers/openai).

### Are opus sonnet gpt builtin shortcuts

向导明确支持 Anthropic setup-token 和 OpenAI Codex OAuth，并可以为您存储 API 密钥。

- `opus` → `anthropic/claude-opus-4-5`
- `sonnet` → `anthropic/claude-sonnet-4-5`
- `gpt` → `openai/gpt-5.2`
- `gpt-mini` → `openai/gpt-5-mini`
- `gemini` → `google/gemini-3-pro-preview`
- `gemini-flash` → `google/gemini-3-flash-preview`

`/model`（以及 `/model list`）显示一个紧凑的编号选择器。按编号选择：

### How do I defineoverride model shortcuts aliases

提示：`/model status` 显示哪个代理处于活动状态，正在使用哪个 `auth-profiles.json` 文件，以及下次将尝试哪个认证配置文件。它还显示配置的提供商端点（`baseUrl`）和 API 模式（`api`）（如果可用）。

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

**如何取消我用 profile 设置的配置文件固定**

### How do I add models from other providers like OpenRouter or ZAI

如果您想返回默认值，请从 `/model` 中选择（或发送 `/model <default provider/model>`）。使用 `/model status` 确认哪个认证配置文件处于活动状态。

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

Z.AI (GLM models):

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

可以。设置一个为默认值，并根据需要切换：

**No API key found for provider after adding a new agent**

This usually means the **new agent** has an empty auth store. Auth is per-agent and
stored in:

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

Fix options:

- Run `openclaw agents add <id>` and configure auth during the wizard.
- Or copy `auth-profiles.json` from the main agent's `agentDir` into the new agent's `agentDir`.

如果设置了 `agents.defaults.models`，它将成为 `/model` 和任何会话覆盖的**允许列表**。选择不在该列表中的模型会返回：

## Model failover and "All models failed"

### 为什么我看到"Unknown model: minimax/MiniMax-M2.1"

这意味着**未配置提供商**（没有 MiniMax 提供商配置或找到认证配置文件），因此无法解析模型。此检测的修复在 **2026.1.12** 中（撰写时未发布）。

1. **Auth profile rotation** within the same provider.
1. 升级到 **2026.1.12**（或从源 `main` 运行），然后重启 gateway。

Cooldowns apply to failing profiles (exponential backoff), so OpenClaw can keep responding even when a provider is rate-limited or temporarily failing.

### What does this error mean

```
No credentials found for profile "anthropic:default"
```

It means the system attempted to use the auth profile ID `anthropic:default`, but could not find credentials for it in the expected auth store.

### 我可以将 MiniMax 作为默认模型，将 OpenAI 用于复杂任务吗

- **Confirm where auth profiles live** (new vs legacy paths)
  - Current: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - Legacy: `~/.openclaw/agent/*` (migrated by `openclaw doctor`)
- **Confirm your env var is loaded by the Gateway**
  - If you set `ANTHROPIC_API_KEY` in your shell but run the Gateway via systemd/launchd, it may not inherit it. Put it in `~/.openclaw/.env` or enable `env.shellEnv`.
- **Make sure you're editing the correct agent**
  - Multi-agent setups mean there can be multiple `auth-profiles.json` files.
- **Sanity-check model/auth status**
  - Use `openclaw models status` to see configured models and whether providers are authenticated.

**Fix checklist for No credentials found for profile anthropic**

This means the run is pinned to an Anthropic auth profile, but the Gateway
can't find it in its auth store.

- 按代理路由或使用 `/agent` 切换
- **If you want to use an API key instead**
  - Put `ANTHROPIC_API_KEY` in `~/.openclaw/.env` on the **gateway host**.
  - Clear any pinned order that forces a missing profile:
    ```bash
    openclaw models auth order clear --provider anthropic
    ```
- **Confirm you're running commands on the gateway host**
  - In remote mode, auth profiles live on the gateway machine, not your laptop.

### Why did it also try Google Gemini and fail

If your model config includes Google Gemini as a fallback (or you switched to a Gemini shorthand), OpenClaw will try it during model fallback. If you haven't configured Google credentials, you'll see `No API key found for provider "google"`.

Fix: either provide Google auth, or remove/avoid Google models in `agents.defaults.model.fallbacks` / aliases so fallback doesn't route there.

**LLM request rejected message thinking signature required google antigravity**

Cause: the session history contains **thinking blocks without signatures** (often from
an aborted/partial stream). Google Antigravity requires signatures for thinking blocks.

Fix: OpenClaw now strips unsigned thinking blocks for Google Antigravity Claude. If it still appears, start a **new session** or set `/thinking off` for that agent.

## Auth profiles: what they are and how to manage them

如果您使用相同的名称设置自己的别名，您的值将获胜。

### 如何定义/覆盖模型快捷方式（别名）

别名来自 `agents.defaults.models.<modelId>.alias`。示例：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

### What are typical profile IDs

OpenClaw uses provider-prefixed IDs like:

- `anthropic:default` (common when no email identity exists)
- `anthropic:<email>` for OAuth identities
- custom IDs you choose (e.g. `anthropic:work`)

### Can I control which auth profile is tried first

这通常意味着**新代理**有一个空的认证存储。认证是每个代理的，并存储在：

修复选项：

You can also set a **per-agent** order override (stored in that agent's `auth-profiles.json`) via the CLI:

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

To target a specific agent:

```bash
openclaw models auth order set --provider anthropic --agent main anthropic:default
```

### OAuth vs API key whats the difference

Use `openclaw gateway status` and trust these lines:

- `Probe target:` (the URL the probe actually used)
- `Listening:` (what's actually bound on the port)

The wizard explicitly supports Anthropic setup-token and OpenAI Codex OAuth and can store API keys for you.

### Why does openclaw gateway status show Config cli and Config service different

### What port does the Gateway use

Fix:

Run that from the same `--profile` / environment you want the service to use.

```
--port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
```

### What does another gateway instance is already listening mean

OpenClaw enforces a runtime lock by binding the WebSocket listener immediately on startup (default `ws://127.0.0.1:18789`). If the bind fails with `EADDRINUSE`, it throws `GatewayLockError` indicating another instance is already listening.

Fix: stop the other instance, free the port, or run with `openclaw gateway --port <port>`.

- `Probe target:` (the URL the probe actually used)
- `Listening:` (what's actually bound on the port)
- `Last gateway error:` (common root cause when the process is alive but the port isn't listening)

### Why does openclaw gateway status show Config cli and Config service different

You're editing one config file while the service is running another (often a `--profile` / `OPENCLAW_STATE_DIR` mismatch).

Fix:

```bash
openclaw gateway install --force
```

Your gateway is running with auth enabled (`gateway.auth.*`), but the UI is not sending the matching token/password.

### What does another gateway instance is already listening mean

OpenClaw enforces a runtime lock by binding the WebSocket listener immediately on startup (default `ws://127.0.0.1:18789`). If the bind fails with `EADDRINUSE`, it throws `GatewayLockError` indicating another instance is already listening.

Fix: stop the other instance, free the port, or run with `openclaw gateway --port <port>`.

### How do I run OpenClaw in remote mode client connects to a Gateway elsewhere

Set `gateway.mode: "remote"` and point to a remote WebSocket URL, optionally with a token/password:

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

仅当您需要硬隔离（安全边界）或非常不同的配置且不想共享时，才使用单独的 VPS。否则，保持一个 Gateway 并使用多个代理或子代理。

- If remote, tunnel first: `ssh -N -L 18789:127.0.0.1:18789 user@host` then open `http://127.0.0.1:18789/?token=...`.
- Set `gateway.auth.token` (or `OPENCLAW_GATEWAY_TOKEN`) on the gateway host.

### The Control UI says unauthorized or keeps reconnecting What now

Your gateway is running with auth enabled (`gateway.auth.*`), but the UI is not sending the matching token/password.

Facts (from code):

- The Control UI stores the token in browser localStorage key `openclaw.control.settings.v1`.
- The UI can import `?token=...` (and/or `?password=...`) once, then strips it from the URL.

Fix:

- 切换到 `gateway.bind: "loopback"` / `"lan"`。
- If you don't have a token yet: `openclaw doctor --generate-gateway-token`.
- If remote, tunnel first: `ssh -N -L 18789:127.0.0.1:18789 user@host` then open `http://127.0.0.1:18789/?token=...`.
- Set `gateway.auth.token` (or `OPENCLAW_GATEWAY_TOKEN`) on the gateway host.
- In the Control UI settings, paste the same token (or refresh with a one-time `?token=...` link).
- `OPENCLAW_CONFIG_PATH`（每个实例的配置）

### I set gatewaybind tailnet but it cant bind nothing listens

`tailnet` bind picks a Tailscale IP from your network interfaces (100.64.0.0/10). If the machine isn't on Tailscale (or the interface is down), there's nothing to bind to.

Fix:

- Start Tailscale on that host (so it has a 100.x address), or
- 每个实例使用 `openclaw --profile <name> …`（自动创建 `~/.openclaw-<name>`）。

Note: `tailnet` is explicit. `auto` prefers loopback; use `gateway.bind: "tailnet"` when you want a tailnet-only bind.

### Can I run multiple Gateways on the same host

配置文件也会为服务名称添加后缀（`bot.molt.<profile>`；旧版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
完整指南：[多个网关](/en/gateway/multiple-gateways)。

Yes, but you must isolate:

- `OPENCLAW_CONFIG_PATH` (per-instance config)
- `OPENCLAW_STATE_DIR` (per-instance state)
- 您在浏览器中打开了 **HTTP** URL（`http://...`）而不是 WS 客户端。
- 您使用了错误的端口或路径。

Quick setup (recommended):

- Use `openclaw --profile <name> …` per instance (auto-creates `~/.openclaw-<name>`).
1. 使用 WS URL：`ws://<host>:18789`（如果是 HTTPS 则使用 `wss://...`）。
2. 不要在普通浏览器标签页中打开 WS 端口。

Profiles also suffix service names (`bot.molt.<profile>`; legacy `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`).
Full guide: [Multiple gateways](/en/gateway/multiple-gateways).

### What does invalid handshake code 1008 mean

协议详情：[Gateway 协议](/en/gateway/protocol)。

Common causes:

- You opened the **HTTP** URL in a browser (`http://...`) instead of a WS client.
- You used the wrong port or path.
- A proxy or tunnel stripped auth headers or sent a non-Gateway request.

最快的日志跟踪：

1. Use the WS URL: `ws://<host>:18789` (or `wss://...` if HTTPS).
- macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（默认：`~/.openclaw/logs/...`；配置文件使用 `~/.openclaw-<profile>/logs/...`）
- Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`

If you're using the CLI or TUI, the URL should look like:

```
openclaw tui --url ws://<host>:18789 --token <token>
```

详情请参阅[故障排除](/en/gateway/troubleshooting#log-locations)。

### 如何启动/停止/重启 Gateway 服务

### Where are logs

如果您手动运行 gateway，`openclaw gateway --force` 可以回收端口。请参阅 [Gateway](/en/gateway)。

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

You can set a stable path via `logging.file`. File log level is controlled by `logging.level`. Console verbosity is controlled by `--verbose` and `logging.consoleLevel`.

有**两种 Windows 安装模式**：

```bash
openclaw logs --follow
```

**1) WSL2（推荐）：** Gateway 在 Linux 内运行。

- macOS: `$OPENCLAW_STATE_DIR/logs/gateway.log` and `gateway.err.log` (default: `~/.openclaw/logs/...`; profiles use `~/.openclaw-<profile>/logs/...`)
- Linux: `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
- Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

打开 PowerShell 并运行：

### How do I startstoprestart the Gateway service

文档：[Windows (/en/platforms/windows)](/platforms/windows)、[Gateway 服务手册](/en/gateway)。

```bash
openclaw gateway status
openclaw gateway restart
```

If you run the gateway manually, `openclaw gateway --force` can reclaim the port. See [Gateway](/en/gateway).

### I closed my terminal on Windows how do I restart OpenClaw

常见原因：

**1) WSL2 (recommended):** the Gateway runs inside Linux.

Open PowerShell, enter WSL, then restart:

```powershell
wsl
openclaw gateway status
openclaw gateway restart
```

If you never installed the service, start it in the foreground:

```bash
openclaw gateway run
```

如果您是远程的，请确认隧道/Tailscale 连接已启动且 Gateway WebSocket 可访问。

文档：[通道](/en/channels)、[故障排除](/en/gateway/troubleshooting)、[远程访问](/en/gateway/remote)。

```powershell
openclaw gateway status
openclaw gateway restart
```

If you run it manually (no service), use:

```powershell
openclaw gateway run
```

这通常意味着 UI 失去了 WebSocket 连接。检查：

### The Gateway is up but replies never arrive What should I check

Start with a quick health sweep:

```bash
openclaw status
openclaw models status
openclaw channels status
openclaw logs --follow
```

Common causes:

4. 如果是远程，隧道/Tailscale 链接是否已启动？
- Channel pairing/allowlist blocking replies (check channel config + logs).
- WebChat/Dashboard is open without the right token.

If you are remote, confirm the tunnel/Tailscale connection is up and that the
Gateway WebSocket is reachable.

从日志和通道状态开始：

### Disconnected from gateway no reason what now

文档：[Telegram](/en/channels/telegram)、[通道故障排除](/en/channels/troubleshooting)。

1. Is the Gateway running? `openclaw gateway status`
2. Is the Gateway healthy? `openclaw status`
3. Does the UI have the right token? `openclaw dashboard`
4. If remote, is the tunnel/Tailscale link up?

Then tail logs:

```bash
openclaw logs --follow
```

如果您安装了服务：

### Telegram setMyCommands fails with network errors What should I check

如果您在前台运行，请使用 Ctrl-C 停止，然后：

```bash
openclaw channels status
openclaw channels logs --channel telegram
```

文档：[Gateway 服务手册](/en/gateway)。

Docs: [Telegram](/en/channels/telegram), [Channel troubleshooting](/en/channels/troubleshooting).

### TUI shows no output What should I check

First confirm the Gateway is reachable and the agent can run:

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

如果您安装了服务，请使用 gateway 命令。当您想要一次性前台运行时使用 `openclaw gateway`。

Docs: [TUI](/en/tui), [Slash commands](/en/tools/slash-commands).

### How do I completely stop then start the Gateway

If you installed the service:

```bash
openclaw gateway stop
openclaw gateway start
```

This stops/starts the **supervised service** (launchd on macOS, systemd on Linux).
Use this when the Gateway runs in the background as a daemon.

来自代理的出站附件必须包含 `MEDIA:<path-or-url>` 行（单独占一行）。请参阅 [OpenClaw 助手设置](/en/start/openclaw) 和 [代理发送](/en/tools/agent-send)。

```bash
openclaw gateway run
```

CLI 发送：

### ELI5 openclaw gateway restart vs openclaw gateway

- 目标通道支持出站媒体且未被允许列表阻止。
- 文件在提供商的大小限制内（图像被调整为最大 2048px）。

请参阅 [图像](/en/nodes/images)。

## 安全性和访问控制

Start the Gateway with `--verbose` to get more console detail. Then inspect the log file for channel auth, model routing, and RPC errors.

## Media & attachments

### My skill generated an imagePDF but nothing was sent

Outbound attachments from the agent must include a `MEDIA:<path-or-url>` line (on its own line). See [OpenClaw assistant setup](/en/start/openclaw) and [Agent send](/en/tools/agent-send).

运行 `openclaw doctor` 以显示有风险的私信策略。

```bash
openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
```

Also check:

- The target channel supports outbound media and isn't blocked by allowlists.
- The file is within the provider's size limits (images are resized to max 2048px).

See [Images](/en/nodes/images).

## Security and access control

### Is it safe to expose OpenClaw to inbound DMs

详情：[安全性](/en/gateway/security)。

- Default behavior on DM-capable channels is **pairing**:
  - Unknown senders receive a pairing code; the bot does not process their message.
  - Approve with: `openclaw pairing approve <channel> <code>`
  - Pending requests are capped at **3 per channel**; check `openclaw pairing list <channel>` if a code didn't arrive.
- Opening DMs publicly requires explicit opt-in (`dmPolicy: "open"` and allowlist `"*"`).

从小处开始。仅授予您实际需要的工具和帐户的访问权限，并在以后需要时进行扩展。

### Is prompt injection only a concern for public bots

No. Prompt injection is about **untrusted content**, not just who can DM the bot.
If your assistant reads external content (web search/fetch, browser pages, emails,
docs, attachments, pasted logs), that content can include instructions that try
to hijack the model. This can happen even if **you are the only sender**.

We do **not** recommend full autonomy over your personal messages. The safest pattern is:

- Keep DMs in **pairing mode** or a tight allowlist.
- Use a **separate number or account** if you want it to message on your behalf.
- Let it draft, then **approve before sending**.

If you want to experiment, do it on a dedicated account and keep it isolated. See
[Security](/en/gateway/security).

### Can I use cheaper models for personal assistant tasks

Yes, **if** the agent is chat-only and the input is trusted. Smaller tiers are
more susceptible to instruction hijacking, so avoid them for tool-enabled agents
or when reading untrusted content. If you must use a smaller model, lock down
tools and run inside a sandbox. See [Security](/en/gateway/security).

Start small. Give access only to the tools and accounts you actually need, and expand
later if required.

Pairing codes are sent **only** when an unknown sender messages the bot and
`dmPolicy: "pairing"` is enabled. `/start` by itself doesn't generate a code.

### Can I give it autonomy over my text messages and is that safe

If you want immediate access, allowlist your sender id or set `dmPolicy: "open"`
for that account.

- Keep DMs in **pairing mode** or a tight allowlist.
- Use a **separate number or account** if you want it to message on your behalf.
- Let it draft, then **approve before sending**.

List pending requests:

### Can I use cheaper models for personal assistant tasks

Yes, **if** the agent is chat-only and the input is trusted. Smaller tiers are
more susceptible to instruction hijacking, so avoid them for tool-enabled agents
or when reading untrusted content. If you must use a smaller model, lock down
tools and run inside a sandbox. See [Security](/en/gateway/security).

### How do I stop internal system messages from showing in chat

Most internal or tool messages only appear when **verbose** or **reasoning** is enabled
for that session.

Fix in the chat where you see it:

```bash
openclaw pairing list telegram
```

If it is still noisy, check the session settings in the Control UI and set verbose
to **inherit**. Also confirm you are not using a bot profile with `verboseDefault` set
to `on` in config.

### WhatsApp will it message my contacts How does pairing work

No. Default WhatsApp DM policy is **pairing**. Unknown senders only get a pairing code and their message is **not processed**. OpenClaw only replies to chats it receives or to explicit sends you trigger.

Send any of these **as a standalone message** (no slash):

```bash
openclaw pairing approve whatsapp <code>
```

These are abort triggers (not slash commands).

```bash
openclaw pairing list whatsapp
```

For background processes (from the exec tool), you can ask the agent to run:

## Chat commands, aborting tasks, and "it won't stop"

### How do I stop internal system messages from showing in chat

Most internal or tool messages only appear when **verbose** or **reasoning** is enabled
for that session.

OpenClaw blocks **cross-provider** messaging by default. If a tool call is bound
to Telegram, it won't send to Discord unless you explicitly allow it.

```
/verbose off
/reasoning off
```

Enable cross-provider messaging for the agent:

Restart the gateway after editing config. If you only want this for a single
agent, set it under `agents.list[].tools.message` instead.

### Why does it feel like the bot ignores rapidfire messages

Queue mode controls how new messages interact with an in-flight run. Use `/queue` to change modes:

```
stop
abort
esc
wait
exit
interrupt
```

These are abort triggers (not slash commands).

For background processes (from the exec tool), you can ask the agent to run:

```
process action:kill sessionId:XXX
```

Slash commands overview: see [Slash commands](/en/tools/slash-commands).

Most commands must be sent as a **standalone** message that starts with `/`, but a few shortcuts (like `/status`) also work inline for allowlisted senders.

### How do I send a Discord message from Telegram Crosscontext messaging denied

You can add options like `debounce:2s cap:25 drop:summarize` for followup modes.

Enable cross-provider messaging for the agent:

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

**Q: "What's the default model for Anthropic with an API key?"**

### Why does it feel like the bot ignores rapidfire messages

Still stuck? Ask in [Discord](https://discord.com/invite/clawd) or open a [GitHub discussion](https://github.com/openclaw/openclaw/discussions).

- `steer` - new messages redirect the current task
- `followup` - run messages one at a time
- `collect` - batch messages and reply once (default)
- `steer-backlog` - steer now, then process backlog
- [Quick start and first-run setup](#quick-start-and-firstrun-setup)
  - [Im stuck whats the fastest way to get unstuck?](#im-stuck-whats-the-fastest-way-to-get-unstuck)
  - [What's the recommended way to install and set up OpenClaw?](#whats-the-recommended-way-to-install-and-set-up-openclaw)
  - [How do I open the dashboard after onboarding?](#how-do-i-open-the-dashboard-after-onboarding)
  - [How do I authenticate the dashboard (token) on localhost vs remote?](#how-do-i-authenticate-the-dashboard-token-on-localhost-vs-remote)
  - [What runtime do I need?](#what-runtime-do-i-need)
  - [Does it run on Raspberry Pi?](#does-it-run-on-raspberry-pi)
  - [Any tips for Raspberry Pi installs?](#any-tips-for-raspberry-pi-installs)
  - [It is stuck on "wake up my friend" / onboarding will not hatch. What now?](#it-is-stuck-on-wake-up-my-friend-onboarding-will-not-hatch-what-now)
  - [Can I migrate my setup to a new machine (Mac mini) without redoing onboarding?](#can-i-migrate-my-setup-to-a-new-machine-mac-mini-without-redoing-onboarding)
  - [Where do I see what is new in the latest version?](#where-do-i-see-what-is-new-in-the-latest-version)
  - [I can't access docs.openclaw.ai (SSL error). What now?](#i-cant-access-docsopenclawai-ssl-error-what-now)
  - [What's the difference between stable and beta?](#whats-the-difference-between-stable-and-beta)
  - [How do I install the beta version, and what's the difference between beta and dev?](#how-do-i-install-the-beta-version-and-whats-the-difference-between-beta-and-dev)
  - [How do I try the latest bits?](#how-do-i-try-the-latest-bits)
  - [How long does install and onboarding usually take?](#how-long-does-install-and-onboarding-usually-take)
  - [Installer stuck? How do I get more feedback?](#installer-stuck-how-do-i-get-more-feedback)
  - [Windows install says git not found or openclaw not recognized](#windows-install-says-git-not-found-or-openclaw-not-recognized)
  - [The docs didn't answer my question - how do I get a better answer?](#the-docs-didnt-answer-my-question-how-do-i-get-a-better-answer)
  - [How do I install OpenClaw on Linux?](#how-do-i-install-openclaw-on-linux)
  - [How do I install OpenClaw on a VPS?](#how-do-i-install-openclaw-on-a-vps)
  - [Where are the cloud/VPS install guides?](#where-are-the-cloudvps-install-guides)
  - [Can I ask OpenClaw to update itself?](#can-i-ask-openclaw-to-update-itself)
  - [What does the onboarding wizard actually do?](#what-does-the-onboarding-wizard-actually-do)
  - [Do I need a Claude or OpenAI subscription to run this?](#do-i-need-a-claude-or-openai-subscription-to-run-this)
  - [Can I use Claude Max subscription without an API key](#can-i-use-claude-max-subscription-without-an-api-key)
  - [How does Anthropic "setup-token" auth work?](#how-does-anthropic-setuptoken-auth-work)
  - [Where do I find an Anthropic setup-token?](#where-do-i-find-an-anthropic-setuptoken)
  - [Do you support Claude subscription auth (Claude Code OAuth)?](#do-you-support-claude-subscription-auth-claude-code-oauth)
  - [Why am I seeing `HTTP 429: rate_limit_error` from Anthropic?](#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)
  - [Is AWS Bedrock supported?](#is-aws-bedrock-supported)
  - [How does Codex auth work?](#how-does-codex-auth-work)
  - [Do you support OpenAI subscription auth (Codex OAuth)?](#do-you-support-openai-subscription-auth-codex-oauth)
  - [How do I set up Gemini CLI OAuth](#how-do-i-set-up-gemini-cli-oauth)
  - [Is a local model OK for casual chats?](#is-a-local-model-ok-for-casual-chats)
  - [How do I keep hosted model traffic in a specific region?](#how-do-i-keep-hosted-model-traffic-in-a-specific-region)
  - [Do I have to buy a Mac Mini to install this?](#do-i-have-to-buy-a-mac-mini-to-install-this)
  - [Do I need a Mac mini for iMessage support?](#do-i-need-a-mac-mini-for-imessage-support)
  - [If I buy a Mac mini to run OpenClaw, can I connect it to my MacBook Pro?](#if-i-buy-a-mac-mini-to-run-openclaw-can-i-connect-it-to-my-macbook-pro)
  - [Can I use Bun?](#can-i-use-bun)
  - [Telegram: what goes in `allowFrom`?](#telegram-what-goes-in-allowfrom)
  - [Can multiple people use one WhatsApp number with different OpenClaw instances?](#can-multiple-people-use-one-whatsapp-number-with-different-openclaw-instances)
  - [Can I run a "fast chat" agent and an "Opus for coding" agent?](#can-i-run-a-fast-chat-agent-and-an-opus-for-coding-agent)
  - [Does Homebrew work on Linux?](#does-homebrew-work-on-linux)
  - [What's the difference between the hackable (git) install and npm install?](#whats-the-difference-between-the-hackable-git-install-and-npm-install)
  - [Can I switch between npm and git installs later?](#can-i-switch-between-npm-and-git-installs-later)
  - [Should I run the Gateway on my laptop or a VPS?](#should-i-run-the-gateway-on-my-laptop-or-a-vps)
  - [How important is it to run OpenClaw on a dedicated machine?](#how-important-is-it-to-run-openclaw-on-a-dedicated-machine)
  - [What are the minimum VPS requirements and recommended OS?](#what-are-the-minimum-vps-requirements-and-recommended-os)
  - [Can I run OpenClaw in a VM and what are the requirements](#can-i-run-openclaw-in-a-vm-and-what-are-the-requirements)

You can add options like `debounce:2s cap:25 drop:summarize` for followup modes.

## Answer the exact question from the screenshot/chat log

**Q: "What's the default model for Anthropic with an API key?"**

**A:** In OpenClaw, credentials and model selection are separate. Setting `ANTHROPIC_API_KEY` (or storing an Anthropic API key in auth profiles) enables authentication, but the actual default model is whatever you configure in `agents.defaults.model.primary` (for example, `anthropic/claude-sonnet-4-5` or `anthropic/claude-opus-4-5`). If you see `No credentials found for profile "anthropic:default"`, it means the Gateway couldn't find Anthropic credentials in the expected `auth-profiles.json` for the agent that's running.

---

Still stuck? Ask in [Discord](https://discord.com/invite/clawd) or open a [GitHub discussion](https://github.com/openclaw/openclaw/discussions).
