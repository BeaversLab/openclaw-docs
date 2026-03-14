---
summary: "关于 OpenClaw 设置、配置和使用的常见问题"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常见问题"
---

# 常见问题

针对实际设置（本地开发、VPS、多代理、OAuth/API 密钥、模型故障转移）的快速解答和更深入的故障排除。有关运行时诊断，请参阅[故障排除](/zh/gateway/troubleshooting)。有关完整的配置参考，请参阅[配置](/zh/gateway/configuration)。

## 目录

- [快速入门和首次运行设置]
  - [我被卡住了，有什么最快的方法解决问题？](#im-stuck-whats-the-fastest-way-to-get-unstuck)
  - [安装和设置 OpenClaw 的推荐方法是什么？](#whats-the-recommended-way-to-install-and-set-up-openclaw)
  - [完成新手引导后如何打开仪表板？](#how-do-i-open-the-dashboard-after-onboarding)
  - [如何在本地主机与远程服务器上验证仪表板（令牌）？](#how-do-i-authenticate-the-dashboard-token-on-localhost-vs-remote)
  - [我需要什么运行环境？](#what-runtime-do-i-need)
  - [它可以在 Raspberry Pi 上运行吗？](#does-it-run-on-raspberry-pi)
  - [Raspberry Pi 安装有什么技巧吗？](#any-tips-for-raspberry-pi-installs)
  - [它卡在了 "wake up my friend" / 新手引导无法完成。现在该怎么办？](#it-is-stuck-on-wake-up-my-friend-onboarding-will-not-hatch-what-now)
  - [我可以在不重新进行新手引导的情况下将设置迁移到新机器（Mac mini）吗？](#can-i-migrate-my-setup-to-a-new-machine-mac-mini-without-redoing-onboarding)
  - [我在哪里可以看到最新版本的新增内容？](#where-do-i-see-what-is-new-in-the-latest-version)
  - [我无法访问 docs.openclaw.ai（SSL 错误）。现在该怎么办？](#i-cant-access-docsopenclawai-ssl-error-what-now)
  - [stable 和 beta 版本有什么区别？](#whats-the-difference-between-stable-and-beta)
  - [我该如何安装 beta 版本，beta 和 dev 版本有什么区别？](#how-do-i-install-the-beta-version-and-whats-the-difference-between-beta-and-dev)
  - [我该如何尝试最新的内容？](#how-do-i-try-the-latest-bits)
  - [安装和新手引导通常需要多长时间？](#how-long-does-install-and-onboarding-usually-take)
  - [安装程序卡住了？我如何获得更多反馈？](#installer-stuck-how-do-i-get-more-feedback)
  - [Windows 安装提示找不到 git 或无法识别 openclaw](#windows-install-says-git-not-found-or-openclaw-not-recognized)
  - [Windows 可执行文件输出显示乱码中文，我该怎么办](#windows-exec-output-shows-garbled-chinese-text-what-should-i-do)
  - [文档没有回答我的问题 - 我如何获得更好的答案？](#the-docs-didnt-answer-my-question-how-do-i-get-a-better-answer)
  - [如何在 OpenClaw 上安装 Linux？](#how-do-i-install-openclaw-on-linux)
  - [如何在 VPS 上安装 OpenClaw？](#how-do-i-install-openclaw-on-a-vps)
  - [云端/VPS 安装指南在哪里？](#where-are-the-cloudvps-install-guides)
  - [我可以要求 OpenClaw 自我更新吗？](#can-i-ask-openclaw-to-update-itself)
  - [新手向导实际上做了什么？](#what-does-the-onboarding-wizard-actually-do)
  - [运行此程序需要 Claude 或 OpenAI 订阅吗？](#do-i-need-a-claude-or-openai-subscription-to-run-this)
  - [我可以在没有 API 密钥的情况下使用 Claude Max 订阅吗](#can-i-use-claude-max-subscription-without-an-api-key)
  - [Anthropic 的“setup-token”身份验证如何工作？](#how-does-anthropic-setuptoken-auth-work)
  - [我在哪里可以找到 Anthropic 的 setup-token？](#where-do-i-find-an-anthropic-setuptoken)
  - [你们支持 Claude 订阅认证吗（Claude Pro 或 Max）？](#do-you-support-claude-subscription-auth-claude-pro-or-max)
  - [为什么我会从 Anthropic 收到 `HTTP 429: rate_limit_error`？](#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)
  - [支持 AWS Bedrock 吗？](#is-aws-bedrock-supported)
  - [Codex 认证是如何工作的？](#how-does-codex-auth-work)
  - [您是否支持 OpenAI 订阅身份验证（Codex OAuth）？](#do-you-support-openai-subscription-auth-codex-oauth)
  - [如何设置 Gemini CLI OAuth](#how-do-i-set-up-gemini-cli-oauth)
  - [本地模型适合随意聊天吗？](#is-a-local-model-ok-for-casual-chats)
  - [如何将托管模型的流量保留在特定区域？](#how-do-i-keep-hosted-model-traffic-in-a-specific-region)
  - [我必须购买 Mac Mini 才能安装它吗？](#do-i-have-to-buy-a-mac-mini-to-install-this)
  - [iMessage 支持需要 Mac mini 吗？](#do-i-need-a-mac-mini-for-imessage-support)
  - [如果我购买 Mac mini 来运行 OpenClaw，我可以将其连接到我的 MacBook Pro 吗？](#if-i-buy-a-mac-mini-to-run-openclaw-can-i-connect-it-to-my-macbook-pro)
  - [我可以使用 Bun 吗？](#can-i-use-bun)
  - [Telegram：应该在 `allowFrom` 中填什么？](#telegram-what-goes-in-allowfrom)
  - [多个人可以使用一个 WhatsApp 号码配合不同的 OpenClaw 实例吗？](#can-multiple-people-use-one-whatsapp-number-with-different-openclaw-instances)
  - [我可以同时运行一个“快速聊天”代理和一个“用于编码的 Opus”代理吗？](#can-i-run-a-fast-chat-agent-and-an-opus-for-coding-agent)
  - [Homebrew 在 Linux 上能用吗？](#does-homebrew-work-on-linux)
  - [可破解 (git) 安装和 npm 安装有什么区别？](#whats-the-difference-between-the-hackable-git-install-and-npm-install)
  - [我以后可以在 npm 和 git 安装之间切换吗？](#can-i-switch-between-npm-and-git-installs-later)
  - [我应该在我的笔记本电脑还是 VPS 上运行 Gateway(网关)？](#should-i-run-the-gateway-on-my-laptop-or-a-vps)
  - [在专用机器上运行 OpenClaw 有多重要？](#how-important-is-it-to-run-openclaw-on-a-dedicated-machine)
  - [VPS 的最低要求和推荐的操作系统是什么？](#what-are-the-minimum-vps-requirements-and-recommended-os)
  - [我可以在虚拟机中运行 OpenClaw 吗，有哪些要求](#can-i-run-openclaw-in-a-vm-and-what-are-the-requirements)
- [什么是 OpenClaw？](#what-is-openclaw)
  - [用一段话解释，什么是 OpenClaw？](#what-is-openclaw-in-one-paragraph)
  - [价值主张是什么？](#whats-the-value-proposition)
  - [我刚刚设置好，首先应该做什么](#i-just-set-it-up-what-should-i-do-first)
  - [OpenClaw 的前五大日常用例是什么](#what-are-the-top-five-everyday-use-cases-for-openclaw)
  - [OpenClaw 是否可以帮助 SaaS 进行潜在客户开发外联广告和博客撰写](#can-openclaw-help-with-lead-gen-outreach-ads-and-blogs-for-a-saas)
  - [与 Claude Code 相比进行 Web 开发有什么优势？](#what-are-the-advantages-vs-claude-code-for-web-development)
- [Skills 和自动化](#skills-and-automation)
  - [如何在不污染仓库的情况下自定义 skills？](#how-do-i-customize-skills-without-keeping-the-repo-dirty)
  - [我可以从自定义文件夹加载 skills 吗？](#can-i-load-skills-from-a-custom-folder)
  - [我如何针对不同的任务使用不同的模型？](#how-can-i-use-different-models-for-different-tasks)
  - [机器人在执行繁重任务时冻结。我该如何卸载它？](#the-bot-freezes-while-doing-heavy-work-how-do-i-offload-that)
  - [Cron 或提醒未触发。我应该检查什么？](#cron-or-reminders-do-not-fire-what-should-i-check)
  - [如何在 Linux 上安装技能？](#how-do-i-install-skills-on-linux)
  - [OpenClaw 可以按计划或在后台连续运行任务吗？](#can-openclaw-run-tasks-on-a-schedule-or-continuously-in-the-background)
  - [我可以在 macOS 上运行仅适用于 Apple Linux 的技能吗？](#can-i-run-apple-macos-only-skills-from-linux)
  - [你有 Notion 或 HeyGen 集成吗？](#do-you-have-a-notion-or-heygen-integration)
  - [如何安装用于接管浏览器的 Chrome 扩展程序？](#how-do-i-install-the-chrome-extension-for-browser-takeover)
- [沙箱隔离与内存](#sandboxing-and-memory)
  - [有专门的沙箱隔离文档吗？](#is-there-a-dedicated-sandboxing-doc)
  - [如何将主机文件夹绑定到沙箱中？](#how-do-i-bind-a-host-folder-into-the-sandbox)
  - [内存是如何工作的？](#how-does-memory-work)
  - [内存总是忘记事情。如何让它记住？](#memory-keeps-forgetting-things-how-do-i-make-it-stick)
  - [内存会永久保留吗？有哪些限制？](#does-memory-persist-forever-what-are-the-limits)
  - [语义记忆搜索是否需要 OpenAI API 密钥？](#does-semantic-memory-search-require-an-openai-api-key)
- [磁盘上文件的位置](#where-things-live-on-disk)
  - [与 OpenClaw 一起使用的所有数据都会保存在本地吗？](#is-all-data-used-with-openclaw-saved-locally)
  - [OpenClaw 将其数据存储在哪里？](#where-does-openclaw-store-its-data)
  - [AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该放在哪里？](#where-should-agentsmd-soulmd-usermd-memorymd-live)
  - [推荐的备份策略是什么？](#whats-the-recommended-backup-strategy)
  - [如何完全卸载 OpenClaw？](#how-do-i-completely-uninstall-openclaw)
  - [代理可以在工作区之外工作吗？](#can-agents-work-outside-the-workspace)
  - [我处于远程模式 - 会话存储在哪里？](#im-in-remote-mode-where-is-the-session-store)
- [配置基础](#config-basics)
  - [配置是什么格式？它在哪里？](#what-format-is-the-config-where-is-it)
  - [我设置了 `gateway.bind: "lan"`（或 `"tailnet"`），现在没有任何监听 / UI 显示未授权](#i-set-gatewaybind-lan-or-tailnet-and-now-nothing-listens-the-ui-says-unauthorized)
  - [为什么现在在 localhost 上需要令牌？](#why-do-i-need-a-token-on-localhost-now)
  - [更改配置后必须重启吗？](#do-i-have-to-restart-after-changing-config)
  - [如何禁用有趣的 CLI 标语？](#how-do-i-disable-funny-cli-taglines)
  - [如何启用网络搜索（和网络获取）？](#how-do-i-enable-web-search-and-web-fetch)
  - [config.apply 清除了我的配置。如何恢复并避免这种情况？](#configapply-wiped-my-config-how-do-i-recover-and-avoid-this)
  - [如何在跨设备的专用工作器之间运行中央 Gateway(网关)？](#how-do-i-run-a-central-gateway-with-specialized-workers-across-devices)
  - [OpenClaw 浏览器可以无头运行吗？](#can-the-openclaw-browser-run-headless)
  - [如何使用 Brave 进行浏览器控制？](#how-do-i-use-brave-for-browser-control)
- [远程网关和节点](#remote-gateways-and-nodes)
  - [指令如何在 Telegram、网关和节点之间传播？](#how-do-commands-propagate-between-telegram-the-gateway-and-nodes)
  - [如果 Gateway(网关) 托管在远程，我的代理如何访问我的计算机？](#how-can-my-agent-access-my-computer-if-the-gateway-is-hosted-remotely)
  - [Tailscale 已连接，但我收不到回复。现在该怎么办？](#tailscale-is-connected-but-i-get-no-replies-what-now)
  - [两个 OpenClaw 实例可以相互通信（本地 + VPS）吗？](#can-two-openclaw-instances-talk-to-each-other-local-vps)
  - [多个智能体是否需要独立的 VPS](#do-i-need-separate-vpses-for-multiple-agents)
  - [在个人笔记本电脑上使用节点而不是通过 VPS 进行 SSH 有什么好处吗？](#is-there-a-benefit-to-using-a-node-on-my-personal-laptop-instead-of-ssh-from-a-vps)
  - [节点运行网关服务吗？](#do-nodes-run-a-gateway-service)
  - [是否有 API / RPC 方式来应用配置？](#is-there-an-api-rpc-way-to-apply-config)
  - [首次安装的最小“合理”配置是什么？](#whats-a-minimal-sane-config-for-a-first-install)
  - [如何在 VPS 上设置 Tailscale 并从我的 Mac 连接？](#how-do-i-set-up-tailscale-on-a-vps-and-connect-from-my-mac)
  - [如何将 Mac 节点连接到远程 Gateway(网关) (Tailscale Serve)？](#how-do-i-connect-a-mac-node-to-a-remote-gateway-tailscale-serve)
  - [我应该安装在第二台笔记本电脑上还是只添加一个节点？](#should-i-install-on-a-second-laptop-or-just-add-a-node)
- [环境变量和 .env 加载](#env-vars-and-env-loading)
  - [OpenClaw 如何加载环境变量？](#how-does-openclaw-load-environment-variables)
  - ["我通过服务启动了 Gateway(网关)，我的环境变量丢失了。" 现在怎么办？](#i-started-the-gateway-via-the-service-and-my-env-vars-disappeared-what-now)
  - [我设置了 `COPILOT_GITHUB_TOKEN`，但模型状态显示“Shell env: off。”为什么？](#i-set-copilotgithubtoken-but-models-status-shows-shell-env-off-why)
- [会话和多个聊天](#sessions-and-multiple-chats)
  - [如何开始一个新的对话？](#how-do-i-start-a-fresh-conversation)
  - [如果我不发送 `/new`，会话会自动重置吗？](#do-sessions-reset-automatically-if-i-never-send-new)
  - [有没有办法组建一个 OpenClaw 实例团队，包括一个 CEO 和多个代理](#is-there-a-way-to-make-a-team-of-openclaw-instances-one-ceo-and-many-agents)
  - [为什么上下文会在任务中途被截断？我该如何防止这种情况？](#why-did-context-get-truncated-midtask-how-do-i-prevent-it)
  - [如何完全重置 OpenClaw 但保持其安装状态？](#how-do-i-completely-reset-openclaw-but-keep-it-installed)
  - [我收到“上下文过大”错误 - 如何重置或压缩？](#im-getting-context-too-large-errors-how-do-i-reset-or-compact)
  - [为什么我会看到“LLM 请求被拒绝：需要 messages.content.tool_use.input 字段”？](#why-am-i-seeing-llm-request-rejected-messagescontenttool_useinput-field-required)
  - [为什么我每 30 分钟会收到一次心跳消息？](#why-am-i-getting-heartbeat-messages-every-30-minutes)
  - [我是否需要将“机器人帐户”添加到 WhatsApp 群组中？](#do-i-need-to-add-a-bot-account-to-a-whatsapp-group)
  - [如何获取 WhatsApp 群组的 JID？](#how-do-i-get-the-jid-of-a-whatsapp-group)
  - [为什么 OpenClaw 不在群组中回复？](#why-doesnt-openclaw-reply-in-a-group)
  - [群组/线程是否与私信共享上下文？](#do-groupsthreads-share-context-with-dms)
  - [我可以创建多少个工作区和代理？](#how-many-workspaces-and-agents-can-i-create)
  - [我可以同时运行多个机器人或聊天吗？如何设置？](#can-i-run-multiple-bots-or-chats-at-the-same-time-slack-and-how-should-i-set-that-up)
- [模型：默认值、选择、别名、切换](#models-defaults-selection-aliases-switching)
  - [什么是“默认模型”？](#what-is-the-default-model)
  - [你推荐什么模型？](#what-model-do-you-recommend)
  - [如何在不清除配置的情况下切换模型？](#how-do-i-switch-models-without-wiping-my-config)
  - [我可以使用自托管的模型吗？](#can-i-use-selfhosted-models-llamacpp-vllm-ollama)
  - [OpenClaw、Flawd 和 Krill 使用什么模型？](#what-do-openclaw-flawd-and-krill-use-for-models)
  - [如何即时切换模型（无需重启）？](#how-do-i-switch-models-on-the-fly-without-restarting)
  - [我可以使用 GPT 5.2 处理日常任务，使用 Codex 5.3 进行编码吗](#can-i-use-gpt-52-for-daily-tasks-and-codex-53-for-coding)
  - [为什么我会看到“Model … is not allowed”然后没有回复？](#why-do-i-see-model-is-not-allowed-and-then-no-reply)
  - [为什么我会看到“Unknown 模型: minimax/MiniMax-M2.5”？](#why-do-i-see-unknown-model-minimaxminimaxm25)
  - [我可以将 MiniMax 作为默认模型，并将 OpenAI 用于复杂任务吗？](#can-i-use-minimax-as-my-default-and-openai-for-complex-tasks)
  - [opus / sonnet / gpt 是内置的快捷方式吗？](#are-opus-sonnet-gpt-builtin-shortcuts)
  - [如何定义/覆盖模型快捷方式（别名）？](#how-do-i-defineoverride-model-shortcuts-aliases)
  - [如何添加来自 OpenRouter 或 Z.AI 等其他提供商的模型？](#how-do-i-add-models-from-other-providers-like-openrouter-or-zai)
- [模型故障转移和“所有模型均失败”](#model-failover-and-all-models-failed)
  - [故障转移是如何工作的？](#how-does-failover-work)
  - [这个错误是什么意思？](#what-does-this-error-mean)
  - [`No credentials found for profile "anthropic:default"` 的修复清单](#fix-checklist-for-no-credentials-found-for-profile-anthropicdefault)
  - [为什么它也尝试了 Google Gemini 但失败了？](#why-did-it-also-try-google-gemini-and-fail)
- [Auth profiles：它们是什么以及如何管理它们](#auth-profiles-what-they-are-and-how-to-manage-them)
  - [什么是 auth profile？](#what-is-an-auth-profile)
  - [典型的 profile ID 有哪些？](#what-are-typical-profile-ids)
  - [我可以控制先尝试哪个 auth profile 吗？](#can-i-control-which-auth-profile-is-tried-first)
  - [OAuth 与 API 密钥：有什么区别？](#oauth-vs-api-key-whats-the-difference)
- [Gateway(网关): 端口、“已在运行”和远程模式](#gateway-ports-already-running-and-remote-mode)
  - [Gateway(网关) 网关使用哪个端口？](#what-port-does-the-gateway-use)
  - [为什么 `openclaw gateway status` 说 `Runtime: running` 但实际上却是 `RPC probe: failed`？](#why-does-openclaw-gateway-status-say-runtime-running-but-rpc-probe-failed)
  - [为什么 `openclaw gateway status` 显示的 `Config (cli)` 和 `Config (service)` 不同？](#why-does-openclaw-gateway-status-show-config-cli-and-config-service-different)
  - [“another gateway instance is already listening”是什么意思？](#what-does-another-gateway-instance-is-already-listening-mean)
  - [如何以远程模式运行 OpenClaw（客户端连接到其他地方的 Gateway 网关）？](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere)
  - [控制 UI 显示“未授权”（或不断重新连接）。现在该怎么办？](#the-control-ui-says-unauthorized-or-keeps-reconnecting-what-now)
  - [我设置了 `gateway.bind: "tailnet"`，但它无法绑定 / 没有任何监听](#i-set-gatewaybind-tailnet-but-it-cant-bind-nothing-listens)
  - [我可以在同一主机上运行多个 Gateway 网关吗？](#can-i-run-multiple-gateways-on-the-same-host)
  - [“无效握手” / 代码 1008 是什么意思？](#what-does-invalid-handshake-code-1008-mean)
- [日志记录和调试](#logging-and-debugging)
  - [日志在哪里？](#where-are-logs)
  - [如何启动/停止/重启 Gateway(网关) 网关服务？](#how-do-i-startstoprestart-the-gateway-service)
  - [我在 Windows 上关闭了终端 - 如何重启 OpenClaw？](#i-closed-my-terminal-on-windows-how-do-i-restart-openclaw)
  - [Gateway(网关) 网关已启动，但从未收到回复。我应该检查什么？](#the-gateway-is-up-but-replies-never-arrive-what-should-i-check)
  - [“从网关断开连接：无原因” - 现在该怎么办？](#disconnected-from-gateway-no-reason-what-now)
  - [Telegram setMyCommands 失败。我应该检查什么？](#telegram-setmycommands-fails-what-should-i-check)
  - [TUI 没有输出。我应该检查什么？](#tui-shows-no-output-what-should-i-check)
  - [如何完全停止然后启动 Gateway 网关？](#how-do-i-completely-stop-then-start-the-gateway)
  - [ELI5：`openclaw gateway restart` vs `openclaw gateway`](#eli5-openclaw-gateway-restart-vs-openclaw-gateway)
  - [当出现故障时，获取更多详细信息的最快方法是什么？](#whats-the-fastest-way-to-get-more-details-when-something-fails)
- [媒体和附件](#media-and-attachments)
  - [我的技能生成了图像/PDF，但没有发送任何内容](#my-skill-generated-an-imagepdf-but-nothing-was-sent)
- [安全和访问控制](#security-and-access-control)
  - [将 OpenClaw 暴露给入站私信是否安全？](#is-it-safe-to-expose-openclaw-to-inbound-dms)
  - [提示词注入仅是公共机器人需要关注的问题吗？](#is-prompt-injection-only-a-concern-for-public-bots)
  - [我的机器人应该拥有自己的电子邮箱 GitHub 账户或电话号码吗](#should-my-bot-have-its-own-email-github-account-or-phone-number)
  - [我可以让它自主处理我的短信吗，这是否安全](#can-i-give-it-autonomy-over-my-text-messages-and-is-that-safe)
  - [我可以为个人助理任务使用更便宜的模型吗？](#can-i-use-cheaper-models-for-personal-assistant-tasks)
  - [我在 Telegram 中运行了 `/start` 但没有收到配对码](#i-ran-start-in-telegram-but-didnt-get-a-pairing-code)
  - [WhatsApp：它会给我的联系人发消息吗？配对是如何工作的？](#whatsapp-will-it-message-my-contacts-how-does-pairing-work)
- [聊天命令、中止任务和“它无法停止”](#chat-commands-aborting-tasks-and-it-wont-stop)
  - [如何阻止内部系统消息在聊天中显示](#how-do-i-stop-internal-system-messages-from-showing-in-chat)
  - [如何停止/取消正在运行的任务？](#how-do-i-stopcancel-a-running-task)
  - [如何从 Telegram 发送 Discord 消息？（“Cross-context messaging denied”）](#how-do-i-send-a-discord-message-from-telegram-crosscontext-messaging-denied)
  - [为什么感觉机器人会“忽略”快速连续的消息？](#why-does-it-feel-like-the-bot-ignores-rapidfire-messages)

## 如果出现故障，最初的六十秒

1. **快速状态（首先检查）**

   ```bash
   openclaw status
   ```

   快速本地摘要：操作系统 + 更新、网关/服务可达性、代理/会话、提供商配置 + 运行时问题（当网关可达时）。

2. **可粘贴的报告（可安全分享）**

   ```bash
   openclaw status --all
   ```

   只读诊断，包含日志尾部（令码已编辑）。

3. **守护进程 + 端口状态**

   ```bash
   openclaw gateway status
   ```

   显示 supervisor 运行时与 RPC 可达性、探测目标 URL 以及服务可能使用的配置。

4. **深度探测**

   ```bash
   openclaw status --deep
   ```

   运行网关健康检查 + 提供商探测（需要可访问的网关）。参见 [Health](/zh/gateway/health)。

5. **查看最新日志**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 宕机，请回退到：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   文件日志与服务日志是分开的；参见 [Logging](/zh/logging) 和 [Troubleshooting](/zh/gateway/troubleshooting)。

6. **运行医生（修复）**

   ```bash
   openclaw doctor
   ```

   修复/迁移配置/状态 + 运行健康检查。参见 [Doctor](/zh/gateway/doctor)。

7. **Gateway(网关) 快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向正在运行的网关请求完整快照（仅限 WS）。参见 [Health](/zh/gateway/health)。

## 快速开始和首次运行设置

### 我卡住了，解决问题的最快方法是什么

使用一个可以**查看您的机器**的本地 AI 智能体。这比在 Discord 中求助要有效得多，因为大多数“我被卡住了”的情况都是**本地配置或环境问题**，远程协助者无法检查这些问题。

- **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
- **OpenAI Codex**：[https://openai.com/codex/](https://openai.com/codex/)

这些工具可以读取代码仓库、运行命令、检查日志，并帮助修复您的机器级设置（PATH、服务、权限、认证文件）。通过可破解的 安装方式为他们提供**完整的源代码检出**：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

这会**从 git 检出**安装 OpenClaw，以便代理可以阅读代码和文档并
推理您正在运行的精确版本。您可以随时通过
不带 `--install-method git` 重新运行安装程序来切换回稳定版。

提示：要求智能体**计划并监督**修复过程（分步进行），然后仅执行必要的命令。这可以保持较小的改动，并更容易进行审核。

如果您发现了真正的错误或修复，请在 GitHub 上提交 issue 或发送 PR：
[https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
[https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

从这些命令开始（在寻求帮助时分享输出）：

```bash
openclaw status
openclaw models status
openclaw doctor
```

它们的作用：

- `openclaw status`：网关/智能体健康状况 + 基本配置的快速快照。
- `openclaw models status`：检查提供商认证 + 模型可用性。
- `openclaw doctor`：验证并修复常见的配置/状态问题。

其他有用的 CLI 检查：`openclaw status --all`、`openclaw logs --follow`、
`openclaw gateway status`、`openclaw health --verbose`。

快速调试循环：[如果出现问题，请检查最初的六十秒](#first-60-seconds-if-somethings-broken)。
安装文档：[安装](/zh/install)，[安装程序标志](/zh/install/installer)，[更新](/zh/install/updating)。

### 安装和设置 OpenClaw 的推荐方式是什么

该代码仓库建议从源代码运行并使用新手向导：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
```

向导也可以自动构建 UI 资产。在新手引导之后，通常在端口 **18789** 上运行 Gateway(网关)。

从源代码（贡献者/开发者）：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw onboard
```

如果你还没有全局安装，请通过 `pnpm openclaw onboard` 运行它。

### 新手引导后如何打开仪表板

向导会在新手引导完成后立即用浏览器打开一个干净的（非令牌化）仪表板 URL，并在摘要中打印该链接。请保持该选项卡打开；如果它没有启动，请在同一台机器上复制/粘贴打印出的 URL。

### 如何在本地主机与远程环境验证仪表板令牌

**本地主机（同一台机器）：**

- 打开 `http://127.0.0.1:18789/`。
- 如果它要求身份验证，请将 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）中的令牌粘贴到 Control UI 设置中。
- 从网关主机检索它：`openclaw config get gateway.auth.token`（或生成一个：`openclaw doctor --generate-gateway-token`）。

**不在本地主机上：**

- **Tailscale Serve**（推荐）：保持绑定环回，运行 `openclaw gateway --tailscale serve`，打开 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 是 `true`，身份标头满足控制 UI/WebSocket 认证（无需令牌，假设是可信网关主机）；HTTP API 仍需要令牌/密码。
- **Tailnet bind**：运行 `openclaw gateway --bind tailnet --token "<token>"`，打开 `http://<tailscale-ip>:18789/`，在仪表板设置中粘贴令牌。
- **SSH 隧道**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/` 并在 Control UI 设置中粘贴令牌。

有关绑定模式和身份验证的详细信息，请参阅 [仪表板](/zh/web/dashboard) 和 [Web 界面](/zh/web)。

### 我需要什么运行时

需要 **>= 22** 版本的 Node。推荐使用 `pnpm`。对于 Gateway(网关)，**不推荐** 使用 Bun。

### 它可以在 Raspberry Pi 上运行吗

是的。Gateway(网关) 网关非常轻量——文档列出了 **512MB-1GB RAM**、**1 核心** 和大约 **500MB** 磁盘空间作为个人使用的最低配置，并注明 **Raspberry Pi 4 可以运行它**。

如果您需要额外的余量（用于日志、媒体、其他服务），**建议使用 2GB**，但这并非硬性最低要求。

提示：一个小型的 Pi/VPS 可以托管 Gateway 网关，您可以在笔记本电脑/手机上配对 **节点** 用于本地屏幕/摄像头/画布或命令执行。请参阅 [节点](/zh/nodes)。

### Raspberry Pi 安装有什么技巧吗

简短回答：可以用，但要做好遇到小问题的准备。

- 使用 **64 位** 操作系统并保持 Node 版本 >= 22。
- 优先选择 **可修改 安装**，这样您可以查看日志并快速更新。
- 先不添加渠道/技能，然后逐个添加。
- 如果您遇到奇怪的二进制问题，这通常是 **ARM 兼容性** 问题。

文档：[Linux](/zh/platforms/linux)，[安装](/zh/install)。

### 它卡在唤醒我的朋友这一步，新手引导无法启动，现在该怎么办

该屏幕取决于 Gateway(网关) 网关是否可达且已通过身份验证。TUI 也会在首次孵化时自动发送“Wake up, my friend!”。如果您看到该行显示 **no reply** 且代币数保持在 0，则说明代理从未运行。

1. 重启 Gateway 网关：

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

如果 Gateway(网关) 网关是远程的，请确保隧道/Tailscale 连接已建立，并且 UI 指向正确的 Gateway(网关) 网关。请参阅[远程访问](/zh/gateway/remote)。

### 我可以将我的设置迁移到新机器（如 Mac mini）而无需重新进行新手引导吗

可以。复制 **状态目录** 和 **工作区**，然后运行一次 Doctor。只要您复制了**这两个**位置，这就能让您的机器人保持“完全相同”（记忆、会话历史、身份验证和渠道状态）：

1. 在新机器上安装 OpenClaw。
2. 从旧机器复制 `$OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）。
3. 复制您的工作区（默认：`~/.openclaw/workspace`）。
4. 运行 `openclaw doctor` 并重启 Gateway(网关) 网关服务。

这保留了配置、身份验证配置文件、WhatsApp 凭据、会话和记忆。如果您处于
远程模式，请记住网关主机拥有会话存储和工作区。

**重要：**如果您仅将工作区提交/推送到 GitHub，您正在备份
**记忆 + 引导文件**，但**不会**备份会话历史记录或身份验证信息。这些文件位于
`~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

相关内容：[迁移](/zh/install/migrating)，[磁盘文件位置](/zh/help/faq#where-does-openclaw-store-its-data)，
[Agent 工作区](/zh/concepts/agent-workspace)，[Doctor](/zh/gateway/doctor)，
[远程模式](/zh/gateway/remote)。

### 在哪里查看最新版本的新增内容

查看 GitHub 更新日志：
[https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

最新的条目位于顶部。如果顶部部分标记为 **Unreleased**（未发布），则下一个带日期的
部分是最新发布的版本。条目按 **Highlights**（亮点）、**Changes**（更改）和
**Fixes**（修复）分组（必要时还包括文档/其他部分）。

### 无法访问 docs.openclaw.ai SSL 错误 怎么办

部分 Comcast/Xfinity 连接通过 Xfinity 高级安全功能错误地拦截了 `docs.openclaw.ai`。请禁用它或将 `docs.openclaw.ai` 加入允许列表，然后重试。更多
详情：[故障排除](/zh/help/troubleshooting#docsopenclawai-shows-an-ssl-error-comcastxfinity)。
请在此处报告以帮助我们解除拦截：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

如果您仍然无法访问该站点，文档已镜像到 GitHub：
[https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

### stable（稳定版）和 beta（测试版）有什么区别

**Stable** 和 **beta** 是 **npm dist-tags**，不是单独的代码行：

- `latest` = stable（稳定版）
- `beta` = early build for testing（早期测试版本）

我们将构建版本发布到 **beta**，进行测试，一旦构建稳定，我们就将**同一版本
提升到 `latest`**。这就是为什么 beta 和 stable 可能指向
**同一版本** 的原因。

查看更改内容：
[https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

### 如何安装 Beta 版本以及 Beta 和 Dev 版本之间有什么区别

**Beta** 是 npm 的 npm dist-tag `beta`（可能匹配 `latest`）。
**Dev** 是 `main` (git) 的最新开发头；发布时，它使用 npm dist-tag `dev`。

单行命令（macOS/Linux）：

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
```

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Windows 安装程序：
[https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

更多详情：[开发渠道](/zh/install/development-channels) 和 [安装程序标志](/zh/install/installer)。

### 安装和新手引导通常需要多长时间

大致指南：

- **安装：** 2-5 分钟
- **新手引导：** 5-15 分钟，具体取决于您配置的渠道/模型数量

如果卡住，请使用 [安装程序卡住](/zh/help/faq#installer-stuck-how-do-i-get-more-feedback)
以及 [我被卡住了](/zh/help/faq#im-stuck--whats-the-fastest-way-to-get-unstuck) 中的快速调试循环。

### 如何试用最新的版本

两种选项：

1. **Dev 渠道 (git checkout)：**

```bash
openclaw update --channel dev
```

这将切换到 `main` 分支并从源代码更新。

2. **可修改安装 (来自安装站点)：**

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

这为您提供一个可以编辑的本地仓库，然后通过 git 更新。

如果您更喜欢手动进行干净克隆，请使用：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
```

文档：[更新](/zh/cli/update)、[开发渠道](/zh/install/development-channels)、
[安装](/zh/install)。

### 安装程序卡住了 如何获取更多反馈

使用 **详细输出** 重新运行安装程序：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
```

使用详细输出进行 Beta 安装：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
```

对于可修改 (git) 安装：

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

### Windows 安装提示未找到 git 或无法识别 openclaw

Windows 上的两个常见问题：

**1) npm 错误：spawn git / git not found**

- 安装 **Git for Windows** 并确保 `git` 在您的 PATH 环境变量中。
- 关闭并重新打开 PowerShell，然后重新运行安装程序。

**2) 安装后无法识别 openclaw**

- 您的 npm 全局 bin 文件夹未在 PATH 中。
- 检查路径：

  ```powershell
  npm config get prefix
  ```

- 将该目录添加到您的用户 PATH（在 Windows 上不需要 `\bin` 后缀；在大多数系统中它是 `%AppData%\npm`）。
- 更新 PATH 后关闭并重新打开 PowerShell。

如果您想要最顺畅的 Windows 安装体验，请使用 **WSL2** 而不是原生 Windows。
文档：[Windows](/zh/platforms/windows)。

### Windows 可执行文件输出显示乱码中文，该怎么办

这通常是由于原生 Windows Shell 上的控制台代码页不匹配造成的。

症状：

- `system.run`/`exec` 输出将中文显示为乱码（mojibake）
- 同一条命令在其他终端配置文件中显示正常

PowerShell 中的快速解决方法：

```powershell
chcp 65001
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
```

然后重启 Gateway 网关 并重试您的命令：

```powershell
openclaw gateway restart
```

如果您在最新的 OpenClaw 上仍然遇到此问题，请在此处跟踪/报告：

- [问题 #30640](https://github.com/openclaw/openclaw/issues/30640)

### 文档没有回答我的问题，我该如何获得更好的答案

使用 **可破解 (git) 安装**，这样您就可以在本地拥有完整的源代码和文档，然后
_在该文件夹中_ 询问您的机器人（或 Claude/Codex），以便它可以阅读仓库并准确回答。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

更多详情：[安装](/zh/install) 和 [安装程序标志](/zh/install/installer)。

### 如何在 OpenClaw 上安装 Linux

简短回答：遵循 Linux 指南，然后运行新手引导向导。

- Linux 快速路径 + 服务安装：[Linux](/zh/platforms/linux)。
- 完整演练：[入门指南](/zh/start/getting-started)。
- 安装程序 + 更新：[安装与更新](/zh/install/updating)。

### 如何在 VPS 上安装 OpenClaw

任何 Linux VPS 均可。在服务器上安装，然后使用 SSH/Tailscale 连接到 Gateway(网关)。

指南：[exe.dev](/zh/install/exe-dev)、[Hetzner](/zh/install/hetzner)、[Fly.io](/zh/install/fly)。
远程访问：[Gateway(网关) remote](/zh/gateway/remote)。

### 云 VPS 安装指南在哪里

我们维护了一个包含常见提供商的 **托管中心**。选择一个并按照指南操作：

- [VPS 托管](/zh/vps)（在一个地方查看所有提供商）
- [Fly.io](/zh/install/fly)
- [Hetzner](/zh/install/hetzner)
- [exe.dev](/zh/install/exe-dev)

云端工作原理：**Gateway(网关) 运行在服务器上**，您可以通过控制 UI（或 Tailscale/SSH）从笔记本电脑/手机访问它。您的状态和工作区位于服务器上，因此请将主机视为事实来源并进行备份。

您可以将**节点** (Mac/iOS/Android/headless) 与该云端 Gateway(网关) 配对，以访问本地屏幕/相机/画布或在您的笔记本电脑上运行命令，同时将 Gateway(网关) 保留在云端。

中心：[平台](/zh/platforms)。远程访问：[Gateway 网关 remote](/zh/gateway/remote)。
节点：[节点](/zh/nodes)，[节点 CLI](/zh/cli/nodes)。

### 我可以要求 OpenClaw 更新自身吗

简短回答：**可能，但不推荐**。更新流程可能会重启 Gateway 网关（这会断开活动会话），可能需要干净的 git 检出，并且可能会提示确认。更安全的做法：以操作员身份从 shell 运行更新。

使用 CLI：

```bash
openclaw update
openclaw update status
openclaw update --channel stable|beta|dev
openclaw update --tag <dist-tag|version>
openclaw update --no-restart
```

如果您必须从代理进行自动化操作：

```bash
openclaw update --yes --no-restart
openclaw gateway restart
```

文档：[更新](/zh/cli/update)，[更新中](/zh/install/updating)。

### 新手引导向导实际上是做什么的

`openclaw onboard` 是推荐的设置路径。在 **本地模式** 下，它会引导您完成以下操作：

- **模型/认证设置**（支持提供商 OAuth/setup-token 流程和 API 密钥，以及本地模型选项，例如 LM Studio）
- **工作区**位置 + 引导文件
- **Gateway(网关) settings** (bind/port/auth/tailscale)
- **提供商**（WhatsApp, Telegram, Discord, Mattermost (插件), Signal, iMessage）
- **守护进程安装**（macOS 上为 LaunchAgent；Linux/WSL2 上为 systemd 用户单元）
- **健康检查**和**技能**选择

如果您配置的模型未知或缺少认证，它也会发出警告。

### 运行此程序是否需要 Claude 或 OpenAI 订阅

不需要。您可以使用 **API 密钥**（Anthropic/OpenAI/其他）或 **仅限本地的模型** 来运行 OpenClaw，这样您的数据将保留在您的设备上。订阅（Claude Pro/Max 或 OpenAI Codex）是用于验证这些提供商的可选方式。

如果您选择 Anthropic 订阅验证，请自行决定是否使用它：Anthropic 过去曾在 Claude Code 之外阻止某些订阅的使用。OpenAI Codex OAuth 明确支持像 OpenClaw 这样的外部工具。

文档：[Anthropic](/zh/providers/anthropic)、[OpenAI](/zh/providers/openai)、
[本地模型](/zh/gateway/local-models)、[模型](/zh/concepts/models)。

### 我可以在没有 API 密钥的情况下使用 Claude Max 订阅吗

可以。您可以使用 **setup-token**
代替 API 密钥进行验证。这是订阅方式的路径。

Claude Pro/Max 订阅 **不包含 API 密钥**，因此这是
订阅账户的技术路径。但这取决于您的决定：Anthropic
过去曾在 Claude Code 之外阻止某些订阅的使用。
如果您希望在生产环境中获得最清晰、最安全的支持路径，请使用 Anthropic API 密钥。

### Anthropic setuptoken 验证如何工作

`claude setup-token` 通过 Claude Code CLI 生成一个 **令牌字符串**（它在 Web 控制台中不可用）。您可以在 **任何机器** 上运行它。在向导中选择 **Anthropic 令牌（粘贴 setup-token）** 或使用 `openclaw models auth paste-token --provider anthropic` 粘贴它。该令牌作为验证配置文件存储用于 **anthropic** 提供商，并像 API 密钥一样使用（无自动刷新）。更多详情：[OAuth](/zh/concepts/oauth)。

### 我在哪里可以找到 Anthropic setuptoken

它 **不**在 Anthropic 控制台中。setup-token 由 **Claude Code CLI** 在 **任何机器** 上生成：

```bash
claude setup-token
```

复制它打印出的令牌，然后在向导中选择 **Anthropic 令牌（粘贴 setup-token）**。如果要在网关主机上运行，请使用 `openclaw models auth setup-token --provider anthropic`。如果在其他地方运行了 `claude setup-token`，则使用 `openclaw models auth paste-token --provider anthropic` 将其粘贴到网关主机上。请参阅 [Anthropic](/zh/providers/anthropic)。

### 是否支持 Claude 订阅身份验证（Claude Pro 或 Max）

是的 - 通过 **setup-token**。OpenClaw 不再复用 Claude Code CLI OAuth 令牌；请使用 setup-token 或 Anthropic API 密钥。可以在任何地方生成令牌并将其粘贴到网关主机上。请参阅 [Anthropic](/zh/providers/anthropic) 和 [OAuth](/zh/concepts/oauth)。

重要提示：这是技术兼容性，而非政策保证。Anthropic
过去曾阻止某些订阅在 Claude Code 之外的使用。
您需要决定是否使用它并验证 Anthropic 当前的条款。
对于生产或多用户工作负载，Anthropic API 密钥身份验证是更安全、更推荐的选择。

### 为什么我会收到来自 Anthropic 的 HTTP 429 速率限制错误

这意味着您在当前时间窗口内的 **Anthropic 配额/速率限制** 已耗尽。如果您
使用的是 **Claude 订阅** (setup-token)，请等待窗口
重置或升级您的计划。如果您使用的是 **Anthropic API 密钥**，请检查 Anthropic 控制台
中的使用/计费情况，并根据需要提高限制。

如果消息具体是：
`Extra usage is required for long context requests`，则该请求正尝试使用
Anthropic 的 1M 上下文测试版 (`context1m: true`)。这仅在您的凭据符合长上下文计费条件（API 密钥计费或启用了额外用量的订阅）时才有效。

提示：设置一个 **fallback 模型**，以便在提供商受到速率限制时，OpenClaw 可以继续回复。
请参阅 [Models](/zh/cli/models)、[OAuth](/zh/concepts/oauth) 和
[/gateway/故障排除#anthropic-429-extra-usage-required-for-long-context](/zh/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

### 是否支持 AWS Bedrock

是的 - 通过 pi-ai 的 **Amazon Bedrock (Converse)** 提供商并使用 **手动配置**。您必须在网关主机上提供 AWS 凭证/区域，并在您的模型配置中添加 Bedrock 提供商条目。请参阅 [Amazon Bedrock](/zh/providers/bedrock) 和 [模型提供商](/zh/providers/models)。如果您更倾向于托管密钥流程，在 Bedrock 前面使用一个兼容 OpenAI 的代理仍然是一个有效的选项。

### Codex 身份验证是如何工作的

OpenClaw 通过 OAuth（ChatGPT 登录）支持 **OpenAI Code (Codex)**。向导可以运行 OAuth 流程，并适当时将默认模型设置为 `openai-codex/gpt-5.4`。请参阅 [模型提供商](/zh/concepts/model-providers) 和 [向导](/zh/start/wizard)。

### 你们支持 OpenAI 订阅身份验证 Codex OAuth 吗

是的。OpenClaw 完全支持 **OpenAI Code (Codex) 订阅 OAuth**。
OpenAI 明确允许在外部工具/工作流（如 OpenClaw）中使用订阅 OAuth。新手引导向导可以为您运行 OAuth 流程。

请参阅 [OAuth](/zh/concepts/oauth)、[模型提供商](/zh/concepts/model-providers) 和 [向导](/zh/start/wizard)。

### 如何设置 Gemini CLI OAuth

Gemini CLI 使用的是 **插件身份验证流程**，而不是 `openclaw.json` 中的客户端 ID 或密钥。

步骤：

1. 启用插件：`openclaw plugins enable google-gemini-cli-auth`
2. 登录：`openclaw models auth login --provider google-gemini-cli --set-default`

这会将 OAuth 令牌存储在网关主机的身份验证配置文件中。详细信息：[模型提供商](/zh/concepts/model-providers)。

### 本地模型适合用于随意聊天吗

通常不适合。OpenClaw 需要大上下文 + 强安全性；小卡会截断并泄露信息。如果您必须这样做，请在本地运行您能运行的 **最大** MiniMax M2.5 版本（LM Studio），并参阅 [/gateway/local-models](/zh/gateway/local-models)。较小/量化的模型会增加提示注入风险 - 请参阅 [安全性](/zh/gateway/security)。

### 如何将托管模型流量保留在特定区域

选择区域固定的端点。OpenRouter 为 MiniMax、Kimi 和 GLM 提供了美国托管的选项；选择美国托管的变体以将数据保留在区域内。您仍然可以通过使用 `models.mode: "merge"` 将 Anthropic/OpenAI 与这些模型列在一起，以便在遵守您选择的区域提供商的同时保持后备选项可用。

### 我必须购买 Mac Mini 才能安装它吗

不需要。OpenClaw 运行在 macOS 或 Linux 上（Windows 通过 WSL2）。Mac mini 是可选的——有些人会购买它作为常开主机，但小型 VPS、家庭服务器或 Raspberry Pi 级别的盒子也可以。

你只需要一台 Mac **来使用仅限 macOS 的工具**。对于 iMessage，请使用 [BlueBubbles](/zh/channels/bluebubbles)（推荐）—— BlueBubbles 服务器可以在任何 Mac 上运行，而 Gateway(网关) 可以在 Linux 或其他地方运行。如果你想要其他仅限 macOS 的工具，请在 Mac 上运行 Gateway(网关) 或连接一个 macOS 节点。

文档：[BlueBubbles](/zh/channels/bluebubbles)、[节点](/zh/nodes)、[Mac 远程模式](/zh/platforms/mac/remote)。

### 我是否需要 Mac mini 来支持 iMessage

你需要一台登录了 Messages 的 **macOS 设备**。它**不**一定是 Mac mini——
任何 Mac 都可以。对于 BlueBubbles，**使用 [iMessage](/zh/channels/bluebubbles)**（推荐）——BlueBubbles 服务器运行在 macOS 上，而 Gateway(网关) 可以运行在 Linux 或其他地方。

常见设置：

- 在 Gateway(网关)/VPS 上运行 Gateway(网关) 网关，并在任何登录了 Messages 的 Mac 上运行 BlueBubbles 服务器。
- 如果您想要最简单的单机设置，可以将所有内容都运行在 Mac 上。

文档：[BlueBubbles](/zh/channels/bluebubbles)、[Nodes](/zh/nodes)、
[Mac 远程模式](/zh/platforms/mac/remote)。

### 如果我购买 Mac mini 来运行 OpenClaw，我可以将其连接到我的 MacBook Pro 吗

是的。**Mac mini 可以运行 Gateway 网关**，而您的 MacBook Pro 可以作为
**节点**（配套设备）进行连接。节点不运行 Gateway 网关——它们提供额外的
功能，例如该设备上的屏幕/摄像头/画布和 `system.run`。

常见模式：

- Mac mini（始终开启）上的 Gateway 网关。
- MacBook Pro 运行 macOS 应用程序或节点主机，并与 Gateway(网关) 网关配对。
- 使用 `openclaw nodes status` / `openclaw nodes list` 来查看它。

文档：[Nodes](/zh/nodes)、[Nodes CLI](/zh/cli/nodes)。

### 我可以使用 Bun 吗

Bun **不被推荐**。我们看到了运行时错误，尤其是在 WhatsApp 和 Telegram 中。
请使用 **Node** 来获得稳定的 Gateway 网关。

如果您仍然想尝试 Bun，请在非生产环境的 Gateway 网关上进行操作
不要使用 WhatsApp/Telegram。

### Telegram 在 allowFrom 中填什么

`channels.telegram.allowFrom` 是**人类发送者的 Telegram 用户 ID**（数字）。它不是机器人用户名。

新手引导向导接受 `@username` 输入并将其解析为数字 ID，但 OpenClaw 授权仅使用数字 ID。

更安全（无第三方机器人）：

- 向您的机器人发送私信，然后运行 `openclaw logs --follow` 并读取 `from.id`。

官方 Bot API：

- 向您的机器人发送私信，然后调用 `https://api.telegram.org/bot<bot_token>/getUpdates` 并读取 `message.from.id`。

第三方（隐私性较差）：

- 向 `@userinfobot` 或 `@getidsbot` 发送私信。

参见 [/channels/telegram](/zh/channels/telegram#access-control-dms--groups)。

### 多人可以针对不同的 OpenClaw 实例使用同一个 WhatsApp 号码吗

是的，通过**多代理路由**。将每个发送者的 WhatsApp **私信**（对等节点 `kind: "direct"`，发送者 E.164 格式如 `+15551234567`）绑定到不同的 `agentId`，这样每个人都能获得自己的工作区和会话存储。回复仍然来自**同一个 WhatsApp 账户**，且私信访问控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）是针对每个 WhatsApp 账户的全局设置。参见[多代理路由](/zh/concepts/multi-agent)和 [WhatsApp](/zh/channels/whatsapp)。

### 我可以同时运行一个快速聊天代理和一个用于编码的 Opus 代理吗

是的。使用多智能体路由：为每个智能体分配其自己的默认模型，然后将入站路由（提供商帐户或特定对等端）绑定到每个智能体。示例配置位于 [多智能体路由](/zh/concepts/multi-agent)。另请参阅 [模型](/zh/concepts/models) 和 [配置](/zh/gateway/configuration)。

### Homebrew 在 Linux 上能用吗

是的。Homebrew 支持 Linux (Linuxbrew)。快速设置：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
brew install <formula>
```

如果您通过 systemd 运行 OpenClaw，请确保服务 PATH 包含 `/home/linuxbrew/.linuxbrew/bin`（或您的 brew 前缀），以便 `brew` 安装的工具在非登录 shell 中解析。
最近的构建版本还会在 Linux systemd 服务上预置常见的用户 bin 目录（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），并在设置时遵循 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

### 可黑客修改的 git 安装与 npm 安装之间有什么区别

- **可黑客修改 (git) 安装：** 完整的源代码检出，可编辑，最适合贡献者。
  你可以在本地运行构建并修补代码/文档。
- **npm install：** 全局 CLI 安装，无需仓库，最适合“直接运行”的场景。
  更新来自 npm dist-tags。

文档：[入门指南](/zh/start/getting-started)、[更新](/zh/install/updating)。

### 稍后我可以在 npm 和 git 安装之间切换吗

可以。安装另一种版本，然后运行 Doctor，以便 Gateway 服务指向新的入口点。
这 **不会删除您的数据** —— 它仅更改 OpenClaw 代码安装。您的状态
(`~/.openclaw`) 和工作区 (`~/.openclaw/workspace`) 保持不变。

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

Doctor 检测到 Gateway 网关服务入口点不匹配，并提供重写服务配置以匹配当前安装（在自动化中使用 `--repair`）。

备份提示：请参阅 [Backup strategy](/zh/help/faq#whats-the-recommended-backup-strategy)。

### 我应该在我的笔记本电脑还是 VPS 上运行 Gateway(网关)

简短回答：**如果您希望 24/7 可靠，请使用 VPS**。如果您希望
最低的阻力，并且您对休眠/重启没问题，请在本地运行。

**笔记本电脑（本地 Gateway(网关)）**

- **优点：** 无服务器成本，直接访问本地文件，实时浏览器窗口。
- **缺点：** 休眠/网络掉线 = 断开连接，操作系统更新/重启会中断，必须保持唤醒。

**VPS / 云端**

- **优点：** 始终在线，网络稳定，无笔记本电脑休眠问题，更容易保持运行。
- **缺点：** 通常无头运行（使用截图），仅限远程文件访问，您必须通过 SSH 进行更新。

**OpenClaw 专用说明：** WhatsApp/Telegram/Slack/Mattermost（插件）/Discord 在 VPS 上均能正常运行。唯一的真正权衡是 **无头浏览器** 与可见窗口之间的选择。请参阅 [浏览器](/zh/tools/browser)。

**推荐默认值：** 如果您之前遇到过网关断开连接的情况，请使用 VPS。当您正在积极使用 Mac 并希望访问本地文件或使用可见浏览器进行 UI 自动化时，本地是非常好的选择。

### 在专用机器上运行 OpenClaw 有多重要？

不是必需的，但**为了可靠性和隔离性而推荐**。

- **专用主机（VPS/Mac mini/Pi）：** 始终在线，休眠/重启中断更少，权限更简洁，更容易保持运行。
- **共享笔记本电脑/桌面：** 对于测试和积极使用完全没问题，但请注意机器休眠或更新时会有暂停。

如果您想要两全其美，请将 Gateway(网关) 保留在专用主机上，并将您的笔记本电脑作为本地屏幕/摄像头/执行工具的 **node（节点）** 进行配对。请参阅 [Nodes](/zh/nodes)。
有关安全指导，请阅读 [Security](/zh/gateway/security)。

### 最低 VPS 要求和推荐的操作系统是什么

OpenClaw 是轻量级的。对于基本的 Gateway 网关 + 一个聊天渠道：

- **绝对最低配置：** 1 vCPU，1GB RAM，约 500MB 磁盘空间。
- **推荐配置：** 1-2 vCPU，2GB 或更多 RAM 以留有余量（日志、媒体、多渠道）。Node 工具和浏览器自动化可能会消耗较多资源。

操作系统：使用 **Ubuntu LTS**（或任何现代 Debian/Ubuntu）。Linux 安装路径在那里经过了最佳测试。

文档：[Linux](/zh/platforms/linux)，[VPS 托管](/zh/vps)。

### 我可以在虚拟机 (VM) 中运行 OpenClaw 吗，有哪些要求

是的。将 VM 视为与 VPS 相同：它需要始终保持开启、可访问，并有足够的 RAM 来运行 Gateway(网关) 以及您启用的任何通道。

基准指南：

- **绝对最低配置：** 1 vCPU，1GB RAM。
- **推荐配置：** 如果您运行多个渠道、浏览器自动化或媒体工具，建议 2GB 或更多 RAM。
- **操作系统：** Ubuntu LTS 或其他现代 Debian/Ubuntu。

如果您使用的是 Windows，**WSL2 是最简单的 VM 风格设置**，并且具有最佳的工具兼容性。请参阅 [Windows](/zh/platforms/windows)，[VPS 托管](/zh/vps)。
如果您在 VM 中运行 macOS，请参阅 [macOS VM](/zh/install/macos-vm)。

## 什么是 OpenClaw？

### 用一段话概括什么是 OpenClaw

OpenClaw 是一个您在自己的设备上运行的个人 AI 助手。它会在您已经使用的消息界面（WhatsApp、Telegram、Slack、Mattermost（插件）、Discord、Google Chat、Signal、iMessage、WebChat）上进行回复，并且可以在受支持的平台上进行语音交互和实时 Canvas 操作。**Gateway 网关**是始终在线的控制平面；助手则是产品本身。

### 价值主张是什么

OpenClaw 不仅仅是“一个 Claude 的包装器”。它是一个**本地优先的控制平面**，允许您在**您自己的硬件**上运行一个功能强大的助手，可以从您已经使用的聊天应用中访问，具有有状态会话、记忆和工具功能 - 而无需将您的工作流控制权交给托管的 SaaS。

亮点：

- **您的设备，您的数据：** 在您想要的任何地方（Mac、Linux、VPS）运行 Gateway 网关，并将工作区 + 会话历史记录保留在本地。
- **真实渠道，而非 Web 沙盒：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，以及在受支持的平台上的移动语音和 Canvas。
- **模型无关：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，并支持按智能体路由和故障转移。
- **仅限本地选项：** 运行本地模型，这样如果您愿意，**所有数据都可以保留在您的设备上**。
- **多智能体路由：** 根据渠道、帐户或任务分离智能体，每个智能体都有自己的工作区和默认设置。
- **开源且可黑客：** 检查、扩展和自托管，而无需供应商锁定。

文档：[Gateway 网关](/zh/gateway)、[渠道](/zh/channels)、[多智能体](/zh/concepts/multi-agent)、
[记忆](/zh/concepts/memory)。

### 我刚设置好它，首先应该做什么

不错的入门项目：

- 构建一个网站（WordPress、Shopify 或一个简单的静态站点）。
- 制作移动应用原型（大纲、屏幕、API 计划）。
- 整理文件和文件夹（清理、命名、标记）。
- 连接 Gmail 并自动执行摘要或跟进操作。

它可以处理大型任务，但当您将其分解为阶段并使用子智能体进行并行工作时，效果最好。

### OpenClaw 的五大日常用例是什么

日常的成功案例通常如下所示：

- **个人简报：** 您关心的收件箱、日历和新闻摘要。
- **研究和起草：** 针对电子邮件或文档的快速研究、摘要和初稿。
- **提醒和跟进：** 由 cron 或心跳驱动的提醒和检查清单。
- **浏览器自动化：** 填写表单、收集数据和重复执行 Web 任务。
- **跨设备协作：** 从您的手机发送任务，让 Gateway(网关) 在服务器上运行，并在聊天中获取结果。

### OpenClaw 可以帮助 SaaS 进行潜在客户开发、外联、广告和博客吗

适用于**研究、资格筛选和起草**。它可以扫描网站、建立候选列表、总结潜在客户，并撰写外联或广告文案草稿。

对于 **外联或广告投放**，请保持人工参与。避免垃圾信息，遵守当地法律和平台政策，并在发送前审核任何内容。最安全的模式是让 OpenClaw 起草，然后由您批准。

文档：[安全](/zh/gateway/security)。

### 与 Claude Code 相比，用于 Web 开发的优势是什么

OpenClaw 是一个**个人助手**和协调层，而不是 IDE 的替代品。请使用
Claude Code 或 Codex 在代码仓库内进行最快速的直接编码循环。当您
需要持久化记忆、跨设备访问和工具编排时，请使用 OpenClaw。

优势：

- 跨会话的**持久记忆 + 工作区**
- **多平台访问**（WhatsApp、Telegram、TUI、WebChat）
- **工具编排**（浏览器、文件、调度、钩子）
- **Always-on Gateway(网关)**（在 VPS 上运行，从任何地方交互）
- **节点** 用于本地浏览器/屏幕/摄像头/执行

展示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

## Skills 和自动化

### 如何在不清空代码库的情况下自定义 Skills

使用托管覆盖而不是编辑代码库副本。将您的更改放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或者通过 `skills.load.extraDirs` 在 `~/.openclaw/openclaw.json` 中添加文件夹）。优先级是 `<workspace>/skills` > `~/.openclaw/skills` > 捆绑，因此托管覆盖无需接触 git 即可获胜。只有值得向上游合并的编辑才应存在于代码库中并作为 PR 发出。

### 我可以从自定义文件夹加载 Skills 吗

是的。通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加额外的目录（优先级最低）。默认优先级保持不变：`<workspace>/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`。`clawhub` 默认安装到 `./skills`，OpenClaw 将其视为 `<workspace>/skills`。

### 如何为不同的任务使用不同的模型

目前支持的模式有：

- **Cron 作业**：隔离的作业可以为每个作业设置 `model` 覆盖。
- **子代理**：将任务路由到具有不同默认模型的独立代理。
- **按需切换**：使用 `/model` 随时切换当前会话模型。

请参阅 [Cron 作业](/zh/automation/cron-jobs)、[多代理路由](/zh/concepts/multi-agent) 和 [斜杠命令](/zh/tools/slash-commands)。

### 机器人在执行繁重任务时冻结。我该如何卸载该任务

对长时间或并行任务使用**子代理**。子代理在自己的会话中运行，
返回摘要，并保持您的主聊天响应。

让你的机器人“为此任务生成一个子代理”或使用 `/subagents`。
在聊天中使用 `/status` 查看 Gateway(网关) 网关当前正在做什么（以及它是否繁忙）。

提示：长任务和子代理都会消耗 Token。如果担心成本，可以通过 `agents.defaults.subagents.model` 为子代理设置更便宜的模型。

文档：[子代理](/zh/tools/subagents)。

### Discord 上的线程绑定子代理会话是如何工作的

使用线程绑定。你可以将 Discord 线程绑定到子代理或会话目标，以便该线程中的后续消息保留在该绑定的会话上。

基本流程：

- 使用 `sessions_spawn` 通过 `thread: true` 生成（以及可选地使用 `mode: "session"` 进行持续跟进）。
- 或使用 `/focus <target>` 手动绑定。
- 使用 `/agents` 检查绑定状态。
- 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自动取消聚焦。
- 使用 `/unfocus` 分离线程。

所需配置：

- 全局默认值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
- Discord 覆盖：`channels.discord.threadBindings.enabled`，`channels.discord.threadBindings.idleHours`，`channels.discord.threadBindings.maxAgeHours`。
- 生成时自动绑定：设置 `channels.discord.threadBindings.spawnSubagentSessions: true`。

文档：[Sub-agents](/zh/tools/subagents)，[Discord](/zh/channels/discord)，[Configuration Reference](/zh/gateway/configuration-reference)，[Slash commands](/zh/tools/slash-commands)。

### Cron 或提醒未触发 我应该检查什么

Cron 在 Gateway(网关) 网关进程内运行。如果 Gateway(网关) 网关未持续运行，
计划作业将不会执行。

检查清单：

- 确认已启用 cron (`cron.enabled`) 且未设置 `OPENCLAW_SKIP_CRON`。
- 检查 Gateway(网关) 网关是否正在 24/7 运行（无睡眠/重启）。
- 验证作业的时区设置 (`--tz` 与主机时区对比)。

调试：

```bash
openclaw cron run <jobId> --force
openclaw cron runs --id <jobId> --limit 50
```

文档：[Cron jobs](/zh/automation/cron-jobs)，[Cron vs Heartbeat](/zh/automation/cron-vs-heartbeat)。

### 如何在 Linux 上安装 Skills

使用 **ClawHub** (CLI) 或将 Skills 放入您的工作区。macOS Skills UI 在 Linux 上不可用。
在 [https://clawhub.com](https://clawhub.com) 浏览 Skills。

安装 ClawHub CLI（选择一个包管理器）：

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

### OpenClaw 可以按计划运行任务或在后台连续运行吗

是的。使用 Gateway(网关) 网关调度器：

- **Cron jobs** 用于计划或重复性任务（重启后持久保存）。
- **Heartbeat** 用于“主会话”定期检查。
- **Isolated jobs** 用于发布摘要或传送到聊天的自主代理。

文档：[Cron jobs](/zh/automation/cron-jobs)，[Cron vs Heartbeat](/zh/automation/cron-vs-heartbeat)，
[Heartbeat](/zh/gateway/heartbeat)。

### 我可以从 Linux 运行仅 Apple macOS 的 Skills 吗？

不能直接运行。macOS 技能受 `metadata.openclaw.os` 以及必需的二进制文件限制，并且只有当技能在 **Gateway 网关 主机**上具备运行条件时，它们才会出现在系统提示中。在 Linux 上，除非您覆盖了限制条件，否则仅限 `darwin` 的技能（如 `apple-notes`、`apple-reminders`、`things-mac`）将无法加载。

您有三种支持的模式：

**选项 A - 在 Mac 上运行 Gateway 网关（最简单）。**
在存在 macOS 二进制文件的地方运行 Gateway 网关，然后通过 [远程模式](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere) 或通过 Tailscale 从 Linux 进行连接。技能将正常加载，因为 Gateway 网关 主机是 macOS。

**方案 B - 使用 macOS 节点（无需 SSH）。**
在 Linux 上运行 Gateway 网关，配对一个 macOS 节点（菜单栏应用），并在 Mac 上将 **节点运行命令** 设置为“始终询问”或“始终允许”。当节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为有资格。代理通过 `nodes` 工具运行这些技能。如果您选择“始终询问”，在提示中批准“始终允许”会将该命令添加到允许列表中。

**选项 C - 通过 SSH 代理 macOS 二进制文件（高级）。**
将 Gateway(网关) 网关保留在 Linux 上，但让必需的 CLI 二进制文件解析为在 Mac 上运行的 SSH 包装器。然后覆盖该 skill 以允许 Linux，从而使其保持可用状态。

1. 为二进制文件创建一个 SSH 包装器（例如：`memo` 用于 Apple Notes）：

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

### 您有 Notion 或 HeyGen 集成吗

目前尚未内置。

选项：

- **自定义技能 / 插件：** 最适合可靠的 API 访问（Notion/HeyGen 都有 API）。
- **浏览器自动化：** 无需代码即可工作，但速度较慢且较不稳定。

如果您想按客户端保留上下文（代理工作流），一个简单的模式是：

- 每个客户端一个 Notion 页面（上下文 + 偏好设置 + 活跃工作）。
- 要求代理在会话开始时获取该页面。

如果您需要原生集成，请提交功能请求或构建一个针对这些 API 的 Skill。

安装 Skills：

```bash
clawhub install <skill-slug>
clawhub update --all
```

ClawHub 安装到当前目录下的 `./skills` 中（或者回退到您配置的 OpenClaw 工作区）；OpenClaw 在下一次会话中将其视为 `<workspace>/skills`。为了在代理之间共享 Skills，请将它们放置在 `~/.openclaw/skills/<name>/SKILL.md` 中。某些 Skills 需要通过 Homebrew 安装二进制文件；在 Linux 上这意味着 Linuxbrew（请参阅上方的 Homebrew Linux 常见问题条目）。请参阅 [Skills](/zh/tools/skills) 和 [ClawHub](/zh/tools/clawhub)。

### 如何安装用于浏览器接管功能的 Chrome 扩展程序

使用内置安装程序，然后在 Chrome 中加载解压的扩展程序：

```bash
openclaw browser extension install
openclaw browser extension path
```

然后 Chrome → `chrome://extensions` → 启用“开发者模式” → “加载已解压的扩展程序” → 选择该文件夹。

完整指南（包括远程 Gateway 网关 + 安全说明）：[Chrome 扩展程序](/zh/tools/chrome-extension)

如果 Gateway(网关) 网关与 Chrome 在同一台机器上运行（默认设置），您通常**不需要**任何额外配置。
如果 Gateway(网关) 网关在其他地方运行，请在浏览器机器上运行节点主机，以便 Gateway(网关) 网关可以代理浏览器操作。
您仍需在要控制的选项卡上点击扩展程序按钮（它不会自动附加）。

## 沙箱隔离和内存

### 是否有专门的沙箱隔离文档

是的。请参阅 [沙箱隔离 沙箱隔离](/zh/gateway/sandboxing)。有关 Docker 特定设置（Docker 中的完整网关或沙箱映像），请参阅 [Docker](/zh/install/docker)。

### Docker 感觉受限。如何启用完整功能

默认镜像以安全为首要考虑，并以 `node` 用户身份运行，因此它
不包含系统软件包、Homebrew 或捆绑的浏览器。要进行更完整的设置：

- 使用 `OPENCLAW_HOME_VOLUME` 持久化 `/home/node`，以便缓存得以保留。
- 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 将系统依赖项构建到镜像中。
- 通过捆绑的 CLI 安装 Playwright 浏览器：
  `node /app/node_modules/playwright-core/cli.js install chromium`
- 设置 `PLAYWRIGHT_BROWSERS_PATH` 并确保该路径已持久化。

文档：[Docker](/zh/install/docker)，[浏览器](/zh/tools/browser)。

**我可以保持私信个人化，同时让一个代理在公共群组中进行沙箱隔离吗**

可以 - 如果您的私密流量是**私信**，而您的公共流量是**群组**。

使用 `agents.defaults.sandbox.mode: "non-main"`，以便群组/渠道会话（非主密钥）在 Docker 中运行，而主私信会话保持在主机上。然后通过 `tools.sandbox.tools` 限制沙箱隔离会话中可用的工具。

设置演练 + 示例配置：[群组：个人私信 + 公共群组](/zh/channels/groups#pattern-personal-dms-public-groups-single-agent)

关键配置参考：[Gateway(网关) 配置](/zh/gateway/configuration#agentsdefaultssandbox)

### 如何将主机文件夹绑定到沙箱中

将 `agents.defaults.sandbox.docker.binds` 设置为 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全局 + 每个代理的绑定会合并；当 `scope: "shared"` 时，每个代理的绑定将被忽略。对于任何敏感内容，请使用 `:ro`，并记住绑定会绕过沙箱文件系统隔离墙。有关示例和安全注意事项，请参阅[沙箱隔离](/zh/gateway/sandboxing#custom-bind-mounts)和[沙箱 vs 工具策略 vs 提权](/zh/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。

### 内存是如何工作的

OpenClaw 内存只是代理工作区中的 Markdown 文件：

- 位于 `memory/YYYY-MM-DD.md` 中的每日笔记
- 位于 `MEMORY.md` 中的精选长期笔记（仅限主/私密会话）

OpenClaw 还会运行**静默预压缩内存刷新**，以提醒模型
在自动压缩之前写入持久化说明。这仅在工作区
可写时运行（只读沙箱会跳过此步骤）。请参阅 [内存](/zh/concepts/memory)。

### Memory keeps forgetting things How do I make it stick

Ask the bot to **write the fact to memory**. Long-term notes belong in `MEMORY.md`,
short-term context goes into `memory/YYYY-MM-DD.md`.

这是我们仍在改进的领域。提醒模型存储记忆会有所帮助；它会知道该怎么做。如果它一直忘记，请验证 Gateway(网关) 在每次运行时都使用相同的工作区。

Docs: [Memory](/zh/concepts/memory), [Agent workspace](/zh/concepts/agent-workspace).

### 语义记忆搜索是否需要 OpenAI API 密钥

仅当您使用 **OpenAI 嵌入** 时需要。Codex OAuth 涵盖聊天/补全，并且
**不**授予嵌入访问权限，因此 **使用 Codex 登录（OAuth 或
Codex CLI 登录）** 对语义记忆搜索没有帮助。OpenAI 嵌入
仍然需要真正的 API 密钥（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

如果您未明确设置提供商，当OpenClaw可以解析API密钥（身份验证配置文件、`models.providers.*.apiKey`或环境变量）时，它会自动选择一个提供商。如果解析到OpenAI密钥，它优先选择OpenAI；否则，如果解析到 Gemini 密钥，则选择 Gemini，然后是 Voyage，接着是 Mistral。如果没有可用的远程密钥，内存搜索将保持禁用状态，直到您对其进行配置。如果您配置并存在本地模型路径，OpenClaw优先使用`local`。当您明确设置`memorySearch.provider = "ollama"`时，支持Ollama。

如果您希望保持本地运行，请设置 `memorySearch.provider = "local"`（以及可选的
`memorySearch.fallback = "none"`）。如果您需要 Gemini 嵌入，请设置
`memorySearch.provider = "gemini"` 并提供 `GEMINI_API_KEY`（或
`memorySearch.remote.apiKey`）。我们支持 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本地** 嵌入
模型 - 有关设置的详细信息，请参阅 [Memory](/zh/concepts/memory)。

### Does memory persist forever What are the limits

记忆文件存储在磁盘上，直到你删除它们才会消失。限制取决于你的存储空间，而不是模型。**会话上下文**仍然受限于模型的上下文窗口，因此长对话可能会被压缩或截断。这就是存在记忆搜索的原因——它只将相关部分拉回上下文中。

文档：[记忆](/zh/concepts/memory)、[上下文](/zh/concepts/context)。

## 事物在磁盘上的存储位置

### 与 OpenClaw 一起使用的所有数据是否都保存在本地

不 - **OpenClaw 的状态是本地的**，但 **外部服务仍然可以看到您发送给它们的内容**。

- **默认本地化：** 会话、内存文件、配置和工作区位于 Gateway(网关) 主机上
  (`~/.openclaw` + 您的工作区目录)。
- **Remote by necessity:** messages you send to 模型 providers (Anthropic/OpenAI/etc.) go to
  their APIs, and chat platforms (WhatsApp/Telegram/Slack/etc.) store message data on their
  servers.
- **你控制数据范围：** 使用本地模型可以将提示词保留在你的机器上，但渠道流量仍会经过渠道的服务器。

相关：[Agent 工作区](/zh/concepts/agent-workspace)、[记忆](/zh/concepts/memory)。

### OpenClaw 将其数据存储在哪里

所有内容都位于 `$OPENCLAW_STATE_DIR` 下（默认：`~/.openclaw`）：

| 路径                                                            | 用途                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------- |
| `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主配置 (JSON5)                                                    |
| `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 旧版 OAuth 导入（首次使用时复制到身份验证配置文件中）             |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 身份验证配置文件（OAuth、API 密钥以及可选的 `keyRef`/`tokenRef`） |
| `$OPENCLAW_STATE_DIR/secrets.json`                              | 可选的文件后备机密负载，用于 `file` SecretRef 提供商              |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 旧版兼容性文件（已清理静态 `api_key` 条目）                       |
| `$OPENCLAW_STATE_DIR/credentials/`                              | 提供商状态（例如 `whatsapp/<accountId>/creds.json`）              |
| `$OPENCLAW_STATE_DIR/agents/`                                   | 每个代理的状态 (agentDir + 会话)                                  |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 对话历史与状态（每个 Agent）                                      |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 会话元数据（每个 Agent）                                          |

旧版单 Agent 路径：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）。

您的 **工作区**（AGENTS.md、内存文件、技能等）是独立的，并通过 `agents.defaults.workspace` 进行配置（默认：`~/.openclaw/workspace`）。

### AGENTS.md、SOUL.md、USER.md、MEMORY.md 应该放在哪里

这些文件位于 **agent 工作区**中，而不是 `~/.openclaw`。

- **工作区（每个 Agent）**：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
  `MEMORY.md`（或 `memory.md`）、`memory/YYYY-MM-DD.md`、可选的 `HEARTBEAT.md`。
- **状态目录（`~/.openclaw`）**：配置、凭证、身份验证配置文件、会话、日志
  和共享技能（`~/.openclaw/skills`）。

默认工作区为 `~/.openclaw/workspace`，可通过以下方式配置：

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

如果机器人重启后“忘记”了之前的配置，请确认 Gateway(网关) 在每次启动时使用的是同一个
工作区（请记住：远程模式使用的是 **网关主机（gateway host）的**
工作区，而不是你本地笔记本电脑的工作区）。

提示：如果您希望持久保留某种行为或偏好，请让机器人将其 **写入
AGENTS.md 或 MEMORY.md**，而不是依赖聊天记录。

请参阅 [Agent 工作区](/zh/concepts/agent-workspace) 和 [记忆](/zh/concepts/memory)。

### 推荐的备份策略是什么

将您的 **agent 工作区**放入一个 **私有** git 仓库中，并在某个
私有位置进行备份（例如 GitHub 私有仓库）。这会捕获内存以及 AGENTS/SOUL/USER
文件，并允许您稍后恢复助手的“思维”。

**切勿**提交 `~/.openclaw` 下的任何内容（凭证、会话、令牌或加密密钥负载）。
如果需要完全恢复，请分别备份工作区状态目录
（请参阅上面的迁移问题）。

文档：[Agent 工作区](/zh/concepts/agent-workspace)。

### 如何完全卸载 OpenClaw

请参阅专用指南：[卸载](/zh/install/uninstall)。

### Agent 可以在工作区之外工作吗？

是的。工作区是 **默认 cwd** 和内存锚点，而不是硬性沙箱。相对路径在工作区内解析，但除非启用了沙箱隔离，否则绝对路径可以访问其他主机位置。如果您需要隔离，请使用 [`agents.defaults.sandbox`](/zh/gateway/sandboxing) 或每代理沙箱设置。如果您希望某个仓库成为默认工作目录，请将该代理的 `workspace` 指向仓库根目录。OpenClaw 仓库只是源代码；除非您有意让代理在其中工作，否则请将工作区分开。

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

### 我处于远程模式，会话存储在哪里？

会话状态由**网关主机**拥有。如果您处于远程模式，您关心的会话存储位于远程计算机上，而不是您的本地笔记本电脑上。请参阅[会话管理](/zh/concepts/session)。

## 配置基础

### 配置是什么格式的？它在哪里？

OpenClaw 从 `$OPENCLAW_CONFIG_PATH`（默认：`~/.openclaw/openclaw.json`）读取可选的 **JSON5** 配置：

```
$OPENCLAW_CONFIG_PATH
```

如果文件丢失，它将使用安全的默认值（包括默认工作区 `~/.openclaw/workspace`）。

### 我设置了 gatewaybind lan 或 tailnet，现在没有任何监听，UI 显示未授权

非环回绑定**需要认证**。配置 `gateway.auth.mode` + `gateway.auth.token`（或使用 `OPENCLAW_GATEWAY_TOKEN`）。

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

- `gateway.remote.token` / `.password` 本身**不**启用本地网关认证。
- 仅当未设置 `gateway.auth.*` 时，本地调用路径才可以将 `gateway.remote.*` 作为回退。
- 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置但未解析，解析将以失败告终（无远程回退掩码）。
- 控制 UI 通过 `connect.params.auth.token` 进行认证（存储在 app/UI 设置中）。避免将令牌放在 URL 中。

### 为什么现在在 localhost 上也需要令牌

OpenClaw 默认强制执行令牌认证，包括环回。如果未配置令牌，网关启动时会自动生成一个并将其保存到 `gateway.auth.token`，因此**本地 WS 客户端必须进行认证**。这会阻止其他本地进程调用 Gateway 网关。

如果您**真的**想要开放环回，请在配置中显式设置 `gateway.auth.mode: "none"`。Doctor 可以随时为您生成令牌：`openclaw doctor --generate-gateway-token`。

### 更改配置后是否必须重启

Gateway(网关) 会监视配置文件并支持热重载：

- `gateway.reload.mode: "hybrid"`（默认）：热应用安全更改，针对关键更改则重启
- `hot`、`restart`、`off` 也受支持

### 如何禁用有趣的 CLI 标语

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

### 如何启用网络搜索和网络抓取

`web_fetch` 无需 API 密钥即可工作。`web_search` 需要为您所选提供商（Brave、Gemini、Grok、Kimi 或 Perplexity）提供密钥。
**推荐：** 运行 `openclaw configure --section web` 并选择一个提供商。
环境替代方案：

- Brave：`BRAVE_API_KEY`
- Gemini：`GEMINI_API_KEY`
- Grok：`XAI_API_KEY`
- Kimi：`KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
- Perplexity：`PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
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

备注：

- 如果您使用允许列表，请添加 `web_search`/`web_fetch` 或 `group:web`。
- `web_fetch` 默认启用（除非明确禁用）。
- 守护进程从 `~/.openclaw/.env`（或服务环境）读取环境变量。

文档：[Web 工具](/zh/tools/web)。

### 如何运行一个中央 Gateway(网关) 并跨设备使用专用的工作节点

常见模式是**一个 Gateway 网关**（例如 Raspberry Pi）加上**节点**和**代理**：

- **Gateway 网关（中央）：** 拥有通道（Signal/WhatsApp）、路由和会话。
- **节点（设备）：** Mac/iOS/Android 作为外设连接并暴露本地工具（`system.run`、`canvas`、`camera`）。
- **代理（工作程序）：** 用于特殊角色的独立大脑/工作区（例如“Hetzner 运维”、“个人数据”）。
- **子代理：** 当您需要并行处理时，从主代理生成后台工作。
- **TUI：** 连接到 Gateway(网关) 并切换代理/会话。

文档：[节点](/zh/nodes)、[远程访问](/zh/gateway/remote)、[多代理路由](/zh/concepts/multi-agent)、[子代理](/zh/tools/subagents)、[TUI](/zh/web/tui)。

### OpenClaw 浏览器可以无头运行吗

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

默认为 `false`（有头模式）。无头模式在某些网站上更容易触发反机器人检查。请参阅 [Browser](/zh/tools/browser)。

无头模式使用**相同的 Chromium 引擎**，适用于大多数自动化操作（表单、点击、抓取、登录）。主要区别如下：

- 没有可见的浏览器窗口（如果需要视觉效果，请使用截图）。
- 某些网站对无头模式下的自动化更为严格（验证码、反机器人）。
  例如，X/Twitter 经常阻止无头会话。

### 我如何使用 Brave 进行浏览器控制

将 `browser.executablePath` 设置为您的 Brave 二进制文件（或任何基于 Chromium 的浏览器）并重启 Gateway(网关)。
有关完整的配置示例，请参阅 [Browser](/zh/tools/browser#use-brave-or-another-chromium-based-browser)。

## 远程网关和节点

### 命令如何在 Telegram、网关和节点之间传播

Telegram 消息由 **gateway** 处理。gateway 运行代理，并且仅在需要节点工具时才通过 **Gateway(网关) WebSocket** 调用节点：

Telegram → Gateway(网关) → Agent → `node.*` → Node → Gateway(网关) → Telegram

节点看不到入站提供商流量；它们仅接收节点 RPC 调用。

### 如果 Gateway(网关) 是远程托管的，我的代理如何访问我的计算机

简短回答：**将您的计算机配对为一个节点**。Gateway(网关) 运行在其他地方，但它可以通过 Gateway(网关) WebSocket 调用本地计算机上的 `node.*` 工具（屏幕、摄像头、系统）。

典型设置：

1. 在常驻主机（VPS/家庭服务器）上运行 Gateway(网关)。
2. 将 Gateway(网关) 主机和您的计算机放在同一个 tailnet 上。
3. 确保 Gateway(网关) WS 可访问（通过 tailnet bind 或 SSH 隧道）。
4. 在本地打开 macOS 应用，并以 **Remote over SSH** 模式（或直接 tailnet）连接，
   以便它可以注册为节点。
5. 在 Gateway(网关) 上批准节点：

   ```bash
   openclaw devices list
   openclaw devices approve <requestId>
   ```

不需要单独的 TCP 桥接；节点通过 Gateway(网关) WebSocket 连接。

安全提醒：配对 macOS 节点将允许在该机器上使用 `system.run`。仅
配对您信任的设备，并查看[安全性](/zh/gateway/security)。

文档：[节点](/zh/nodes)、[Gateway(网关) 网关协议](/zh/gateway/protocol)、[macOS 远程模式](/zh/platforms/mac/remote)、[安全性](/zh/gateway/security)。

### Tailscale 已连接但我没有收到回复，现在怎么办

检查基本项：

- Gateway(网关) 正在运行：`openclaw gateway status`
- Gateway(网关) 状态：`openclaw status`
- 渠道健康状况：`openclaw channels status`

然后验证身份验证和路由：

- 如果您使用 Tailscale Serve，请确保 `gateway.auth.allowTailscale` 设置正确。
- 如果您通过 SSH 隧道连接，请确认本地隧道已开启并指向正确的端口。
- 确认您的允许列表（私信或群组）包含您的帐户。

文档：[Tailscale](/zh/gateway/tailscale)、[远程访问](/zh/gateway/remote)、[渠道](/zh/channels)。

### 两个 OpenClaw 实例可以相互通信吗 本地 VPS

可以。没有内置的“机器人到机器人”桥接器，但您可以通过几种
可靠的方式进行连接：

**最简单：** 使用两个机器人都可以访问的普通聊天渠道（Telegram/Slack/WhatsApp）。
让机器人 A 向机器人 B 发送消息，然后让机器人 B 像往常一样回复。

**CLI 桥接（通用）：** 运行一个脚本来调用另一个 Gateway 网关，
使用 `openclaw agent --message ... --deliver`，目标定位到另一个机器人
监听的聊天。如果一个机器人在远程 VPS 上，请通过 SSH/Tailscale 将您的 CLI 指向该远程 Gateway 网关
（见[远程访问](/zh/gateway/remote)）。

示例模式（从可以访问目标 Gateway(网关) 网关的计算机运行）：

```bash
openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
```

提示：添加一个防护栏，以免两个机器人无限循环（仅提及、渠道
允许列表或“不回复机器人消息”规则）。

文档：[远程访问](/zh/gateway/remote)、[Agent CLI](/zh/cli/agent)、[Agent send](/zh/tools/agent-send)。

### 多个代理是否需要独立的 VPS

不需要。一个 Gateway(网关) 网关可以托管多个代理，每个代理都有自己的工作区、模型默认值
和路由。这是标准设置，比为每个代理运行一个 VPS 更便宜、更简单。

仅当您需要强隔离（安全边界）或您不想共享的非常不同
的配置时，才使用单独的 VPS。否则，请保留一个 Gateway(网关) 网关并
使用多个代理或子代理。

### 在个人笔记本电脑上使用节点而不是从 VPS 进行 SSH 有好处吗？

是的 - 节点是从远程 Gateway(网关) 访问您的笔记本电脑的首选方式，而且
它们提供的不仅仅是 shell 访问权限。Gateway(网关) 运行在 macOS/Linux（Windows 通过 WSL2）上，并且
是轻量级的（一个小型 VPS 或 Raspberry Pi 级别的盒子就可以；4 GB 内存绰绰有余），因此一种常见的
设置是使用一个始终开启的主机加上您的笔记本电脑作为节点。

- **无需入站 SSH。** 节点向外连接到 Gateway 网关 WebSocket 并使用设备配对。
- **更安全的执行控制。** `system.run` 受该笔记本电脑上的节点允许列表/批准限制。
- **更多设备工具。** 除了 `system.run` 之外，节点还暴露 `canvas`、`camera` 和 `screen`。
- **本地浏览器自动化。** 将 Gateway(网关) 保留在 VPS 上，但在本地运行 Chrome，并通过 Chrome 扩展程序 + 笔记本电脑上的节点主机来中继控制。

SSH 适用于临时 Shell 访问，但对于持续的代理工作流和设备自动化，节点更简单。

文档：[节点](/zh/nodes)、[节点 CLI](/zh/cli/nodes)、[Chrome 扩展程序](/zh/tools/chrome-extension)。

### 我应该在第二台笔记本电脑上安装还是只添加一个节点？

如果您只需要第二台笔记本电脑上的 **local tools**（屏幕/摄像头/exec），请将其添加为 **node**。这样可以保持单个 Gateway(网关) 并避免重复的配置。本地节点工具目前仅限 macOS，但我们计划将其扩展到其他操作系统。

仅在需要**硬隔离**或两个完全独立的机器人时，才安装第二个 Gateway(网关)。

文档：[节点](/zh/nodes)、[节点 CLI](/zh/cli/nodes)、[多个网关](/zh/gateway/multiple-gateways)。

### 节点是否运行网关服务

不。每个主机应只运行**一个网关**，除非你有意运行隔离的配置文件（请参阅[多个网关](/zh/gateway/multiple-gateways)）。节点是连接到网关的外设（iOS/Android 节点，或菜单栏应用中的 macOS “节点模式”）。有关无头节点主机和 CLI 控制，请参阅[节点主机 CLI](/zh/cli/node)。

对 `gateway`、`discovery` 和 `canvasHost` 的更改需要完全重启。

### 是否有 API RPC 方式来应用配置

是的。`config.apply` 会验证并写入完整配置，并在操作过程中重启 Gateway(网关)。

### configapply 清除了我的配置。如何恢复并避免这种情况

`config.apply` 会替换**整个配置**。如果您发送部分对象，其他所有内容将被删除。

恢复：

- 从备份恢复（git 或复制的 `~/.openclaw/openclaw.json`）。
- 如果您没有备份，请重新运行 `openclaw doctor` 并重新配置渠道/模型。
- 如果这是意外情况，请提交错误报告，并包含您上次已知的配置或任何备份。
- 本地编码代理通常可以从日志或历史记录中重建有效的配置。

避免这种情况：

- 使用 `openclaw config set` 进行小的更改。
- 使用 `openclaw configure` 进行交互式编辑。

文档：[配置](/zh/cli/config)、[配置](/zh/cli/configure)、[诊断](/zh/gateway/doctor)。

### 首次安装的最小合理配置是什么

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

这将设置您的工作区并限制谁可以触发机器人。

### 如何在我的 VPS 上设置 Tailscale 并从我的 Mac 进行连接

最少步骤：

1. **在 VPS 上安装 + 登录**

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```

2. **在您的 Mac 上安装 + 登录**
   - 使用 Tailscale 应用并登录到同一个 tailnet。
3. **启用 MagicDNS（推荐）**
   - 在 Tailscale 管理控制台中，启用 MagicDNS 以便 VPS 拥有稳定的名称。
4. **使用 tailnet 主机名**
   - SSH: `ssh user@your-vps.tailnet-xxxx.ts.net`
   - Gateway(网关) WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

如果您想要无需 SSH 的控制 UI，请在 VPS 上使用 Tailscale Serve：

```bash
openclaw gateway --tailscale serve
```

这将保持网关绑定到回环地址，并通过 Tailscale 暴露 HTTPS。参见 [Tailscale](/zh/gateway/tailscale)。

### 如何将 Mac 节点连接到远程 Gateway(网关) Tailscale Serve

Serve 暴露了 **Gateway Control UI + WS**。节点通过同一个 Gateway WS 端点连接。

推荐的设置：

1. **确保 VPS 和 Mac 位于同一个 tailnet 上**。
2. **在远程模式下使用 macOS 应用程序**（SSH 目标可以是 tailnet 主机名）。
   该应用程序将隧道传输 Gateway 端口并作为节点连接。
3. **在网关上批准节点**：

   ```bash
   openclaw devices list
   openclaw devices approve <requestId>
   ```

文档：[Gateway(网关) 协议](/zh/gateway/protocol)、[设备发现](/zh/gateway/discovery)、[macOS 远程模式](/zh/platforms/mac/remote)。

## 环境变量 和 .env 加载

### OpenClaw 如何加载环境变量

OpenClaw 从父进程（shell、launchd/systemd、CI 等）读取环境变量，并且额外加载：

- `.env` 来自当前工作目录
- 来自 `~/.openclaw/.env` 的全局回退 `.env`（也称为 `$OPENCLAW_STATE_DIR/.env`）

这两个 `.env` 文件都不会覆盖现有的环境变量。

您还可以在配置中定义内联环境变量（仅当进程环境中缺失时应用）：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

有关完整优先级和来源，请参阅 [/environment](/zh/help/environment)。

### 我通过服务启动了 Gateway(网关)，我的环境变量消失了。现在该怎么办？

两种常见的修复方法：

1. 将缺失的键放入 `~/.openclaw/.env` 中，以便即使服务未继承您的 shell 环境也能被拾取。
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

这将运行您的登录 shell 并仅导入缺失的预期键名（永不覆盖）。对应的环境变量：
`OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

### 我设置了 COPILOTGITHUBTOKEN，但模型状态显示 Shell env off，为什么？

`openclaw models status` 报告是否启用了 **shell env import**。“Shell env: off”并**不**意味着您的环境变量丢失——它只是表示 OpenClaw 不会自动加载您的登录 shell。

如果 Gateway(网关) 作为服务（launchd/systemd）运行，它将不会继承您的 shell
环境。请通过以下方式之一进行修复：

1. 将令牌放入 `~/.openclaw/.env`：

   ```
   COPILOT_GITHUB_TOKEN=...
   ```

2. 或者启用 shell 导入（`env.shellEnv.enabled: true`）。
3. 或者将其添加到您的配置 `env` 块中（仅在缺失时适用）。

然后重启网关并重新检查：

```bash
openclaw models status
```

Copilot 令牌从 `COPILOT_GITHUB_TOKEN` 读取（也包括 `GH_TOKEN` / `GITHUB_TOKEN`）。
请参阅 [/concepts/模型-providers](/zh/concepts/model-providers) 和 [/environment](/zh/help/environment)。

## 会话和多个聊天

### 我如何开始一个新的对话

发送 `/new` 或 `/reset` 作为独立消息。请参阅 [会话管理](/zh/concepts/session)。

### 如果我不发送新消息，会话会自动重置吗？

是的。会话会在 `session.idleMinutes` 后过期（默认为 **60**）。**下一条**
消息将为该聊天键启动一个新的会话 ID。这不会删除
记录——它只是开始一个新的会话。

```json5
{
  session: {
    idleMinutes: 240,
  },
}
```

### 有没有办法组建一个 OpenClaw 实例团队，包括一个 CEO 和许多代理？

是的，通过 **multi-agent routing**（多代理路由）和 **sub-agents**（子代理）。您可以创建一个协调器
代理和几个具有各自工作空间和模型的工作代理。

话虽如此，这最好被视为一个**有趣的实验**。它非常消耗 token，而且通常比使用一个具有独立会话的 bot 效率更低。我们设想的标准模型是：你与一个 bot 交谈，使用不同的会话进行并行工作。该 bot 还可以在需要时生成子代理。

文档：[多代理路由](/zh/concepts/multi-agent)、[子代理](/zh/tools/subagents)、[代理 CLI](/zh/cli/agents)。

### 为什么上下文在任务中途被截断了？我该如何预防？

会话上下文受模型窗口限制。长对话、大型工具输出或许多文件可能会触发压缩或截断。

有帮助的方法：

- 让 bot 总结当前状态并将其写入文件。
- 在长任务之前使用 `/compact`，在切换话题时使用 `/new`。
- 将重要的上下文保存在工作区中，并让 bot 重新读取它。
- 对于长时间或并行工作，使用子代理，以便主对话保持较小。
- 如果这种情况经常发生，请选择一个具有更大上下文窗口的模型。

### 如何完全重置 OpenClaw 但保留其安装？

使用重置命令：

```bash
openclaw reset
```

非交互式完全重置：

```bash
openclaw reset --scope full --yes --non-interactive
```

然后重新运行新手引导：

```bash
openclaw onboard --install-daemon
```

注意：

- 如果新手引导向导检测到现有配置，它也会提供 **重置** 选项。请参阅 [向导](/zh/start/wizard)。
- 如果您使用了配置文件（`--profile` / `OPENCLAW_PROFILE`），请重置每个状态目录（默认为 `~/.openclaw-<profile>`）。
- 开发重置：`openclaw gateway --dev --reset`（仅限开发；清除开发配置 + 凭证 + 会话 + 工作区）。

### 我收到上下文过大的错误，如何重置或压缩？

使用以下方法之一：

- **压缩**（保留对话但总结较早的轮次）：

  ```
  /compact
  ```

  或使用 `/compact <instructions>` 来引导摘要。

- **重置**（为相同的聊天键生成新的会话 ID）：

  ```
  /new
  /reset
  ```

如果持续发生：

- 启用或调整 **会话修剪**（`agents.defaults.contextPruning`）以删除旧的工具输出。
- 使用具有更大上下文窗口的模型。

文档：[Compaction](/zh/concepts/compaction)、[Session pruning](/zh/concepts/session-pruning)、[Session management](/zh/concepts/session)。

### 为什么我会看到“LLM request rejected: messages.content.tool_use.input field required”？

这是一个提供商验证错误：模型发出了一个 `tool_use` 块，但没有必需的
`input`。这通常意味着会话历史已过期或损坏（通常发生在长线程
或工具/架构更改之后）。

修复方法：使用 `/new` 开始一个新会话（独立消息）。

### 为什么我每 30 分钟会收到心跳消息

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

如果 `HEARTBEAT.md` 存在但实际为空（只有空行和类似 `# Heading` 的 markdown
标题），OpenClaw 会跳过心跳运行以节省 API 调用。
如果文件丢失，心跳仍会运行，模型决定如何处理。

每个代理的覆盖设置使用 `agents.list[].heartbeat`。文档：[Heartbeat](/zh/gateway/heartbeat)。

### 我是否需要将机器人帐户添加到 WhatsApp 群组

不需要。OpenClaw 运行在**您自己的帐户**上，所以如果您在群组中，OpenClaw 就能看到它。
默认情况下，群组回复会被阻止，直到您允许发送者 (`groupPolicy: "allowlist"`)。

如果您想只有**您**能够触发群组回复：

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

### 如何获取 WhatsApp 群组的 JID

选项 1（最快）：跟踪日志并在群组中发送测试消息：

```bash
openclaw logs --follow --json
```

查找以 `@g.us` 结尾的 `chatId`（或 `from`），例如：
`1234567890-1234567890@g.us`。

选项 2（如果已配置/在允许列表中）：从配置中列出群组：

```bash
openclaw directory groups list --channel whatsapp
```

文档：[WhatsApp](/zh/channels/whatsapp)、[目录](/zh/cli/directory)、[日志](/zh/cli/logs)。

### 为什么 OpenClaw 不在群组中回复

两个常见原因：

- 提及门控已开启（默认）。您必须 @提及机器人（或匹配 `mentionPatterns`）。
- 您配置了 `channels.whatsapp.groups` 但没有配置 `"*"`，且该群组不在允许列表中。

请参阅 [群组](/zh/channels/groups) 和 [群组消息](/zh/channels/group-messages)。

### 群组/线程是否与私信共享上下文

直接聊天默认合并到主会话。群组/渠道拥有自己的会话密钥，且 Telegram 主题/Discord 线程是独立的会话。请参阅 [群组](/zh/channels/groups) 和 [群组消息](/zh/channels/group-messages)。

### 我可以创建多少个工作区和代理

没有硬性限制。几十个（甚至几百个）都可以，但请注意：

- **磁盘增长：** 会话 + 聊天记录存储在 `~/.openclaw/agents/<agentId>/sessions/` 下。
- **Token 成本：** 更多代理意味着更多的并发模型使用。
- **运维开销：** 每个代理的身份验证配置文件、工作区和渠道路由。

提示：

- 每个代理保持一个 **活跃** 工作区 (`agents.defaults.workspace`)。
- 如果磁盘增长，请清理旧会话（删除 JSONL 或存储条目）。
- 使用 `openclaw doctor` 来发现孤立的工作区和配置文件不匹配。

### 我可以同时在 Slack 上运行多个机器人或聊天吗？我应该如何设置

可以。使用 **多代理路由** 运行多个隔离的代理，并通过
渠道/账户/对等方路由传入消息。Slack 支持作为渠道，可以绑定到特定的代理。

浏览器访问功能强大，但并非“能做人类能做的任何事”——反机器人、CAPTCHA 和多重身份验证（MFA）仍然可以阻止自动化。为了获得最可靠的浏览器控制，请在运行浏览器的机器上使用 Chrome 扩展程序中继（并将 Gateway(网关) 网关放在任何位置）。

最佳实践设置：

- 始终在线的 Gateway(网关) 网关主机（VPS/Mac mini）。
- 每个角色一个代理（绑定）。
- 绑定到这些代理的 Slack 渠道。
- 根据需要通过扩展程序中继（或节点）进行本地浏览器访问。

文档：[多智能体路由](/zh/concepts/multi-agent)、[Slack](/zh/channels/slack)、
[浏览器](/zh/tools/browser)、[Chrome 扩展程序](/zh/tools/chrome-extension)、[节点](/zh/nodes)。

## 模型：默认值、选择、别名、切换

### 什么是默认模型

OpenClaw 的默认模型是您设置为：

```
agents.defaults.model.primary
```

模型被引用为 `provider/model`（例如：`anthropic/claude-opus-4-6`）。如果您省略提供商，OpenClaw 目前假设 `anthropic` 作为临时的弃用回退方案——但您仍然应该**明确地**设置 `provider/model`。

### 您推荐什么模型

**推荐的默认设置：** 使用您的提供商堆栈中可用的最强最新一代模型。
**对于启用工具或不受信任输入的代理：** 优先考虑模型强度而非成本。
**对于常规/低风险聊天：** 使用更便宜的回退模型并按代理角色进行路由。

MiniMax M2.5 有自己的文档：[MiniMax](/zh/providers/minimax) 和
[Local models](/zh/gateway/local-models)。

经验法则：对于高风险工作，使用您能负担得起的**最佳模型**，对于
常规聊天或摘要，使用更便宜的模型。您可以按代理路由模型，并使用子代理
并行化长任务（每个子代理消耗令牌）。请参阅 [模型](/zh/concepts/models) 和
[子代理](/zh/tools/subagents)。

强烈警告：较弱/过度量化的模型更容易受到
提示注入和不安全行为的影响。请参阅 [安全性](/zh/gateway/security)。

更多背景信息：[模型](/zh/concepts/models)。

### 我可以使用自托管模型 llamacpp vLLM Ollama

可以。Ollama 是本地模型最简单的路径。

最快的设置：

1. 从 `https://ollama.com/download` 安装 Ollama
2. 拉取一个本地模型，例如 `ollama pull glm-4.7-flash`
3. 如果您还需要 Ollama Cloud，请运行 `ollama signin`
4. 运行 `openclaw onboard` 并选择 `Ollama`
5. 选择 `Local` 或 `Cloud + Local`

注意：

- `Cloud + Local` 为您提供 Ollama Cloud 模型以及您的本地 Ollama 模型
- 云模型（如 `kimi-k2.5:cloud`）不需要在本地拉取
- 若要手动切换，请使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

安全提示：体积较小或经过重度量化的模型更容易受到提示词注入攻击。我们强烈建议任何可以使用工具的机器人使用**大型模型**。如果您仍想使用小型模型，请启用沙箱隔离和严格的工具允许列表。

文档：[Ollama](/zh/providers/ollama)、[本地模型](/zh/gateway/local-models)、
[模型提供商](/zh/concepts/model-providers)、[安全性](/zh/gateway/security)、
[沙箱隔离](/zh/gateway/sandboxing)。

### 如何在不清除配置的情况下切换模型

使用 **模型命令** 或仅编辑 **模型** 字段。避免完全替换配置。

安全选项：

- 在聊天中使用 `/model`（快速，每次会话）
- `openclaw models set ...`（仅更新模型配置）
- `openclaw configure --section model`（交互式）
- 在 `~/.openclaw/openclaw.json` 中编辑 `agents.defaults.model`

除非您打算替换整个配置，否则请避免使用部分对象进行 `config.apply`。
如果您确实覆盖了配置，请从备份恢复或重新运行 `openclaw doctor` 进行修复。

文档：[模型](/zh/concepts/models)，[配置](/zh/cli/configure)，[配置文件](/zh/cli/config)，[诊断工具](/zh/gateway/doctor)。

### OpenClaw、Flawd 和 Krill 使用什么模型

- 这些部署可能有所不同，且可能会随时间变化；没有固定的提供商推荐。
- 使用 `openclaw models status` 检查每个网关上的当前运行时设置。
- 对于对安全敏感或启用工具的代理，请使用可用的最强最新一代模型。

### 如何在不重启的情况下即时切换模型

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

`/model`（以及 `/model list`）会显示一个紧凑的、带编号的选择器。通过编号进行选择：

```
/model 3
```

您还可以为提供商强制使用特定的身份验证配置文件（每个会话）：

```
/model opus@anthropic:default
/model opus@anthropic:work
```

提示：`/model status` 显示哪个 agent 处于活动状态，正在使用哪个 `auth-profiles.json` 文件，以及下次将尝试哪个身份验证配置文件。
如果可用，它还会显示配置的提供商端点 (`baseUrl`) 和 API 模式 (`api`)。

**如何取消固定我用 profile 设置的配置文件**

重新运行 `/model`，**不**带 `@profile` 后缀：

```
/model anthropic/claude-opus-4-6
```

如果您想返回默认设置，请从 `/model` 中选择它（或发送 `/model <default provider/model>`）。
使用 `/model status` 确认当前活动的身份验证配置文件。

### 我可以将 GPT 5.2 用于日常任务，将 Codex 5.3 用于编码吗

可以。将一个设为默认，然后根据需要进行切换：

- **快速切换（每次会话）：** `/model gpt-5.2` 用于日常任务，`/model openai-codex/gpt-5.4` 用于使用 Codex OAuth 进行编码。
- **默认 + 切换：** 将 `agents.defaults.model.primary` 设置为 `openai/gpt-5.2`，然后在编码时切换到 `openai-codex/gpt-5.4`（或者反过来）。
- **子代理：** 将编码任务路由到具有不同默认模型的子代理。

参见 [模型](/zh/concepts/models) 和 [斜杠命令](/zh/tools/slash-commands)。

### 为什么我会看到模型不允许然后就没有回复了

如果设置了 `agents.defaults.models`，它将成为 `/model` 和任何
会话覆盖的 **允许列表**。选择不在该列表中的模型将返回：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

该错误 **代替** 正常回复被返回。解决方法：将该模型添加到
`agents.defaults.models`，移除允许列表，或从 `/model list` 中选择一个模型。

### 为什么我看到 Unknown 模型 minimaxMiniMaxM25

这意味着**未配置提供商**（未找到 MiniMax 提供商配置或身份验证配置文件），因此无法解析该模型。针对此检测的修复包含在 **2026.1.12** 版本中（撰写本文时尚未发布）。

修复检查清单：

1. 升级到 **2026.1.12**（或从源代码 `main` 运行），然后重启网关。
2. 确保已配置 MiniMax（向导或 JSON），或者 env/auth 配置文件中存在 MiniMax API 密钥，以便注入提供商。
3. 使用确切的模型 ID（区分大小写）：`minimax/MiniMax-M2.5` 或
   `minimax/MiniMax-M2.5-highspeed`。
4. 运行：

   ```bash
   openclaw models list
   ```

   并从列表中选择（或在聊天中使用 `/model list`）。

请参阅 MiniMax](/zh/providers/minimax) 和 [Models](/zh/concepts/models)。

### 我可以将 MiniMax 作为默认设置，并在复杂任务中使用 OpenAI 吗

可以。使用 **MiniMax 作为默认设置**，并在需要时**按会话**切换模型。
回退机制用于**错误**，而非“困难任务”，因此请使用 `/model` 或单独的代理。

**选项 A：每次会话切换**

```json5
{
  env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "minimax/MiniMax-M2.5" },
      models: {
        "minimax/MiniMax-M2.5": { alias: "minimax" },
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
- 按代理路由或使用 `/agent` 进行切换

文档：[Models](/zh/concepts/models)、[Multi-Agent Routing](/zh/concepts/multi-agent)、[MiniMax](/zh/providers/minimax)、[OpenAI](/zh/providers/openai)。

### opus sonnet gpt 是内置快捷方式吗

是的。OpenClaw 提供了一些默认的简写（仅当该模型存在于 `agents.defaults.models` 时才应用）：

- `opus` → `anthropic/claude-opus-4-6`
- `sonnet` → `anthropic/claude-sonnet-4-6`
- `gpt` → `openai/gpt-5.4`
- `gpt-mini` → `openai/gpt-5-mini`
- `gemini` → `google/gemini-3.1-pro-preview`
- `gemini-flash` → `google/gemini-3-flash-preview`
- `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

如果您设置了同名的自定义别名，您的值将优先生效。

### 如何定义/覆盖模型快捷方式和别名

别名来自 `agents.defaults.models.<modelId>.alias`。例如：

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-opus-4-6" },
      models: {
        "anthropic/claude-opus-4-6": { alias: "opus" },
        "anthropic/claude-sonnet-4-5": { alias: "sonnet" },
        "anthropic/claude-haiku-4-5": { alias: "haiku" },
      },
    },
  },
}
```

然后 `/model sonnet`（或在支持时使用 `/<alias>`）将解析为该模型 ID。

### 如何添加来自其他提供商（如 OpenRouter 或 ZAI）的模型

OpenRouter（按 token 付费；包含多种模型）：

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
      model: { primary: "zai/glm-5" },
      models: { "zai/glm-5": {} },
    },
  },
  env: { ZAI_API_KEY: "..." },
}
```

如果您引用了提供商/模型，但缺少所需的提供商密钥，您将收到运行时身份验证错误（例如 `No API key found for provider "zai"`）。

**添加新代理后未找到提供商的 API 密钥**

这通常意味着 **新代理** 拥有一个空的认证存储。认证是按代理进行的，并存储于：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

修复选项：

- 运行 `openclaw agents add <id>` 并在向导过程中配置认证。
- 或者将 `auth-profiles.json` 从主代理的 `agentDir` 复制到新代理的 `agentDir` 中。

请 **勿** 在代理之间重复使用 `agentDir`；这会导致认证/会话冲突。

## 模型故障转移和“所有模型均失败”

### 故障转移是如何工作的

故障转移分两个阶段进行：

1. **同一提供商内的认证配置轮换**。
2. **模型回退**到 `agents.defaults.model.fallbacks` 中的下一个模型。

冷却策略适用于失败的配置文件（指数退避），因此即使某个提供商受到速率限制或暂时发生故障，OpenClaw 仍能继续响应。

### 此错误是什么意思

```
No credentials found for profile "anthropic:default"
```

这意味着系统尝试使用身份验证配置文件 ID `anthropic:default`，但在预期的身份验证存储中找不到它的凭据。

### 针对未找到配置文件 anthropicdefault 的凭据的修复清单

- **确认身份验证配置文件的位置**（新路径与旧路径）
  - 当前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - 旧版：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）
- **确认您的环境变量已由 Gateway 加载**
  - 如果您在 shell 中设置了 `ANTHROPIC_API_KEY` 但通过 systemd/launchd 运行 Gateway(网关)，它可能无法继承该设置。请将其放入 `~/.openclaw/.env` 或启用 `env.shellEnv`。
- **确保您正在编辑正确的代理**
  - 多代理设置意味着可能存在多个 `auth-profiles.json` 文件。
- **合理性检查模型/身份验证状态**
  - 使用 `openclaw models status` 查看配置的模型以及提供商是否已通过身份验证。

**针对未找到配置文件 anthropic 的凭据的修复清单**

这意味着该运行被锁定到了一个 Anthropic 身份验证配置文件，但 Gateway(网关) 在其身份验证存储中找不到它。

- **使用 setup-token**
  - 运行 `claude setup-token`，然后使用 `openclaw models auth setup-token --provider anthropic` 粘贴它。
  - 如果令牌是在另一台机器上创建的，请使用 `openclaw models auth paste-token --provider anthropic`。
- **如果您想改用 API 密钥**
  - 将 `ANTHROPIC_API_KEY` 放入 **网关主机** 上的 `~/.openclaw/.env` 中。
  - 清除任何强制使用缺失配置文件的固定顺序：

    ```bash
    openclaw models auth order clear --provider anthropic
    ```

- **确认您正在网关主机上运行命令**
  - 在远程模式下，身份验证配置文件位于网关机器上，而不是您的笔记本电脑上。

### 为什么它也尝试了 Google Gemini 并且失败了

如果您的模型配置包括 Google Gemini 作为后备（或者您切换到了 Gemini 简写），OpenClaw 将在模型回退期间尝试使用它。如果您尚未配置 Google 凭据，您将看到 `No API key found for provider "google"`。

修复：要么提供 Google 身份验证，要么在 `agents.defaults.model.fallbacks` / 别名中移除/避免使用 Google 模型，以免故障转移路由到那里。

**LLM 请求被拒绝消息，认为需要签名 google antigravity**

原因：会话历史记录包含 **没有签名的思维块**（通常来自
中断/部分流）。Google Antigravity 要求思维块必须具有签名。

修复方法：OpenClaw 现在会针对 Google Antigravity Claude 剥离无签名的思考块。如果问题仍然存在，请启动一个**新会话**或为该代理设置 `/thinking off`。

## 身份验证配置文件：它们是什么以及如何管理它们

相关：[/concepts/oauth](/zh/concepts/oauth)（OAuth 流程、令牌存储、多账户模式）

### 什么是身份验证配置文件

Auth profile 是与提供商关联的命名凭据记录（OAuth 或 API 密钥）。Profiles 位于：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

### 典型的配置文件 ID 是什么

OpenClaw 使用提供商前缀的 ID，例如：

- `anthropic:default` （当不存在电子邮件身份时常见）
- `anthropic:<email>` 用于 OAuth 身份
- 您选择的自定义 ID（例如 `anthropic:work`）

### 我可以控制首先尝试哪个身份验证配置文件吗

可以。配置支持配置文件的可选元数据和每个提供商的排序 (`auth.order.<provider>`)。这 **不** 存储机密；它将 ID 映射到提供商/模式并设置轮换顺序。

OpenClaw 可能会暂时跳过某个 profile，如果它处于短暂的 **cooldown**（速率限制/超时/认证失败）状态或较长的 **disabled**（计费/余额不足）状态。要检查此情况，请运行 `openclaw models status --json` 并检查 `auth.unusableProfiles`。调整：`auth.cooldowns.billingBackoffHours*`。

您还可以通过 CLI 设置 **per-agent** 顺序覆盖（存储在该代理的 `auth-profiles.json` 中）：

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

### OAuth 与 API 密钥有什么区别

OpenClaw 支持两者：

- **OAuth** 通常利用订阅访问权限（如适用）。
- **API keys** 使用按 token 付费的计费方式。

该向导明确支持 Anthropic 设置令牌和 OpenAI Codex OAuth，并可为您存储 API 密钥。

## Gateway(网关)：端口、“正在运行”和远程模式

### Gateway(网关)使用什么端口

`gateway.port` 控制用于 WebSocket + HTTP（控制 UI、hooks 等）的单个多路复用端口。

优先级：

```
--port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
```

### 为什么 openclaw 网关状态显示 Runtime 正在运行但 RPC 探测失败

因为“运行中”是**监控程序**的视角（launchd/systemd/schtasks）。RPC 探测是 CLI 实际连接到网关 WebSocket 并调用 `status`。

使用 `openclaw gateway status` 并信任这些行：

- `Probe target:`（probe 实际使用的 URL）
- `Listening:`（端口上实际绑定的内容）
- `Last gateway error:`（进程存活但端口未监听时的常见根本原因）

### 为什么 openclaw gateway 状态显示 Config cli 和 Config service 不同

您正在编辑一个配置文件，而服务正在运行另一个（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

修复：

```bash
openclaw gateway install --force
```

从您希望服务使用的同一 `--profile` / 环境运行该命令。

### 另一个 gateway 实例已在监听是什么意思

OpenClaw 通过在启动时立即绑定 WebSocket 监听器来强制实施运行时锁（默认为 `ws://127.0.0.1:18789`）。如果绑定失败并出现 `EADDRINUSE`，它将抛出 `GatewayLockError`，表明另一个实例已在监听。

修复：停止另一个实例，释放端口，或使用 `openclaw gateway --port <port>` 运行。

### 如何以远程模式运行 OpenClaw，即客户端连接到其他地方的 Gateway(网关)

设置 `gateway.mode: "remote"` 并指向远程 WebSocket URL，可选择带有 token/password：

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

- `openclaw gateway` 仅当 `gateway.mode` 为 `local` 时（或者您传递了覆盖标志）才会启动。
- macOS 应用会监视配置文件，并在这些值更改时实时切换模式。

### 控制 UI 显示未授权或一直重新连接 怎么办

您的网关在启用身份验证的情况下运行 (`gateway.auth.*`)，但 UI 未发送匹配的令牌/密码。

事实（来自代码）：

- 控制 UI 会将令牌保存在 `sessionStorage` 中，用于当前浏览器标签页会话和选定的网关 URL，因此同一标签页的刷新可以在不恢复长期 localStorage 令牌持久化的情况下继续工作。
- 在 `AUTH_TOKEN_MISMATCH` 上，当网关返回重试提示 (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`) 时，受信任的客户端可以尝试使用缓存的设备令牌进行一次有界重试。

修复：

- 最快：`openclaw dashboard`（打印 + 复制仪表板 URL，尝试打开；如果是无头模式则显示 SSH 提示）。
- 如果您还没有令牌：`openclaw doctor --generate-gateway-token`。
- 如果是远程，首先建立隧道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/`。
- 在网关主机上设置 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 在控制 UI 设置中，粘贴相同的令牌。
- 如果在一次重试后仍然不匹配，请轮换/重新批准配对的设备令牌：
  - `openclaw devices list`
  - `openclaw devices rotate --device <id> --role operator`
- 还是卡住了？运行 `openclaw status --all` 并遵循 [Troubleshooting](/zh/gateway/troubleshooting)。有关身份验证的详细信息，请参阅 [Dashboard](/zh/web/dashboard)。

### 我设置了 gatewaybind tailnet 但无法绑定 没有任何监听

`tailnet` bind 从您的网络接口 (100.64.0.0/10) 中选择一个 Tailscale IP。如果机器不在 Tailscale 上（或接口已关闭），则没有任何内容可绑定。

修复：

- 在该主机上启动 Tailscale（以便它拥有 100.x 地址），或者
- 切换到 `gateway.bind: "loopback"` / `"lan"`。

注意：`tailnet` 是显式的。`auto` 优先使用环回地址；当你想要仅限 tailnet 的绑定时，使用 `gateway.bind: "tailnet"`。

### 我可以在同一主机上运行多个 Gateway 网关吗

通常不需要——一个 Gateway(网关) 可以运行多个消息通道和代理。仅当您需要冗余（例如：救援机器人）或硬隔离时才使用多个网关。

可以，但你必须进行隔离：

- `OPENCLAW_CONFIG_PATH` （每个实例的配置）
- `OPENCLAW_STATE_DIR` （每个实例的状态）
- `agents.defaults.workspace` （工作区隔离）
- `gateway.port` （唯一端口）

快速设置（推荐）：

- 每个实例使用 `openclaw --profile <name> …` （自动创建 `~/.openclaw-<name>`）。
- 在每个配置文件配置中设置唯一的 `gateway.port` （或在手动运行时传递 `--port`）。
- 安装每个配置文件的服务： `openclaw --profile <name> gateway install`。

配置文件也会为服务名称添加后缀（`ai.openclaw.<profile>`；旧版 `com.openclaw.*`， `openclaw-gateway-<profile>.service`， `OpenClaw Gateway (<profile>)`）。
完整指南：[多个网关](/zh/gateway/multiple-gateways)。

### 无效握手代码 1008 是什么意思

Gateway(网关) 是一个 **WebSocket 服务器**，它期望接收到的第一条消息是
`connect` 帧。如果收到其他任何内容，它将以 **code 1008**（策略违规）关闭连接。

常见原因：

- 你在浏览器中打开了 **HTTP** URL (`http://...`) 而不是 WS 客户端。
- 你使用了错误的端口或路径。
- 代理或隧道剥离了认证标头或发送了非 Gateway(网关) 请求。

快速修复：

1. 使用 WS URL： `ws://<host>:18789` （如果使用 HTTPS 则为 `wss://...`）。
2. 不要在普通的浏览器标签页中打开 WS 端口。
3. 如果开启了身份验证，请在 `connect` 帧中包含令牌/密码。

如果您使用的是 CLI 或 TUI，URL 应类似于：

```
openclaw tui --url ws://<host>:18789 --token <token>
```

协议详情：[Gateway 网关 protocol](/zh/gateway/protocol)。

## 日志记录和调试

### 日志在哪里

文件日志（结构化）：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

您可以通过 `logging.file` 设置稳定路径。文件日志级别由 `logging.level` 控制。控制台详细程度由 `--verbose` 和 `logging.consoleLevel` 控制。

最快的日志追踪：

```bash
openclaw logs --follow
```

服务/监控器日志（当 Gateway 网关通过 launchd/systemd 运行时）：

- macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（默认：`~/.openclaw/logs/...`；配置文件使用 `~/.openclaw-<profile>/logs/...`）
- Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
- Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

更多信息请参阅 [故障排除](/zh/gateway/troubleshooting#log-locations)。

### 如何启动/停止/重启 Gateway(网关) 服务

使用 gateway 辅助脚本：

```bash
openclaw gateway status
openclaw gateway restart
```

如果您手动运行 gateway，`openclaw gateway --force` 可以回收端口。参见 [Gateway 网关](/zh/gateway)。

### 我在 Windows 上关闭了终端，如何重启 OpenClaw

有 **两种 Windows 安装模式**：

**1) WSL2（推荐）：**Gateway(网关) 在 Linux 内部运行。

打开 PowerShell，进入 WSL，然后重启：

```powershell
wsl
openclaw gateway status
openclaw gateway restart
```

如果您从未安装该服务，请在前台启动它：

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

文档：[Windows (WSL2)](/zh/platforms/windows)，[Gateway 网关 service runbook](/zh/gateway)。

### Gateway(网关) 已启动，但从未收到回复。我应该检查什么？

从快速健康扫描开始：

```bash
openclaw status
openclaw models status
openclaw channels status
openclaw logs --follow
```

常见原因：

- 模型认证未在 **gateway 主机** 上加载（检查 `models status`）。
- 渠道配对/白名单阻止回复（检查渠道配置 + 日志）。
- WebChat/Dashboard 在没有正确令牌的情况下打开。

如果您在远程，请确认 tunnel/Tailscale 连接已建立，并且 Gateway(网关) WebSocket 是可访问的。

文档：[渠道](/zh/channels)、[故障排除](/zh/gateway/troubleshooting)、[远程访问](/zh/gateway/remote)。

### 与网关断开连接，没有原因，现在怎么办

这通常意味着 UI 失去了 WebSocket 连接。请检查：

1. Gateway(网关)是否正在运行？ `openclaw gateway status`
2. Gateway(网关)是否健康？`openclaw status`
3. UI 是否拥有正确的令牌？ `openclaw dashboard`
4. 如果是远程，隧道/Tailscale 链接是否启动？

然后查看日志尾部：

```bash
openclaw logs --follow
```

文档：[仪表板](/zh/web/dashboard)、[远程访问](/zh/gateway/remote)、[故障排除](/zh/gateway/troubleshooting)。

### Telegram setMyCommands 失败 我应该检查什么

首先检查日志和渠道状态：

```bash
openclaw channels status
openclaw channels logs --channel telegram
```

然后匹配错误信息：

- `BOT_COMMANDS_TOO_MUCH`： Telegram 菜单条目过多。 OpenClaw 已经修剪到 Telegram 限制并使用较少的命令重试，但仍需要删除某些菜单条目。 减少插件/技能/自定义命令，如果不需要菜单，则禁用 `channels.telegram.commands.native`。
- `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或类似的网络错误：如果您在 VPS 上或位于代理后面，请确认允许出站 HTTPS 且 `api.telegram.org` 的 DNS 工作正常。

如果 Gateway(网关) 是远程的，请确保您正在 Gateway(网关) 主机上查看日志。

文档： [Telegram](/zh/channels/telegram)， [Channel 故障排除](/zh/channels/troubleshooting)。

### TUI 显示无输出 我应该检查什么

首先确认 Gateway(网关) 是可达的，并且代理可以运行：

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

在 TUI 中，使用 `/status` 查看当前状态。如果您在聊天渠道中期待收到回复，请确保已启用投递功能（`/deliver on`）。

文档：[TUI](/zh/web/tui)、[Slash commands](/zh/tools/slash-commands)。

### 如何完全停止然后启动 Gateway 网关

如果您安装了该服务：

```bash
openclaw gateway stop
openclaw gateway start
```

这会停止/启动**受监管的服务**（macOS 上的 launchd，macOS 上的 systemd）。
当 Gateway(网关) 作为守护进程在后台运行时，请使用此方法。

如果您在前台运行，请使用 Ctrl-C 停止，然后执行：

```bash
openclaw gateway run
```

文档：[Gateway(网关) service runbook](/zh/gateway)。

### 简单解释：openclaw gateway restart vs openclaw gateway

- `openclaw gateway restart`：重启**后台服务**（launchd/systemd）。
- `openclaw gateway`：为当前终端会话**在前台**运行网关。

如果您安装了该服务，请使用 gateway 命令。当您想要进行一次性前台运行时，请使用 `openclaw gateway`。

### 当出现故障时，获取更多详细信息的最快方法是什么

使用 Gateway(网关)`--verbose` 启动 RPC 以获取更多控制台详细信息。然后检查日志文件中的渠道身份验证、模型路由和 RPC 错误。

## 媒体和附件

### 我的技能生成了图片或 PDF，但未发送任何内容

来自代理的出站附件必须包含一行 `MEDIA:<path-or-url>`（单独占一行）。请参阅 [OpenClaw 助手设置](/zh/start/openclaw) 和 [Agent send](/zh/tools/agent-send)。

CLI 发送：

```bash
openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
```

另外检查：

- 目标渠道支持出站媒体，且未被允许列表阻止。
- 文件大小在提供商的限制范围内（图片会被调整为最大 2048px）。

请参阅 [图片](/zh/nodes/images)。

## 安全和访问控制

### 将 OpenClaw 暴露给入站私信是否安全

将入站私信视为不受信任的输入。默认设置旨在降低风险：

- 支持私信的渠道上的默认行为是**配对**：
  - 未知发送者会收到配对码；机器人不会处理他们的消息。
  - 使用以下命令批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
  - 待处理的请求限制为每个渠道 **3 个**；如果未收到代码，请检查 `openclaw pairing list --channel <channel> [--account <id>]`。
- 公开接收私信需要明确选择加入（`dmPolicy: "open"` 和允许列表 `"*"`）。

运行 `openclaw doctor` 以检查有风险的私信策略。

### 提示注入是否只是公开机器人需要关注的问题

不是。提示注入涉及的是**不受信任的内容**，而不仅仅是谁能给机器人发私信。
如果你的助手读取外部内容（网络搜索/获取、浏览器页面、电子邮件、
文档、附件、粘贴的日志），这些内容可能包含试图劫持模型的指令。即使**你是唯一的发送者**，也可能发生这种情况。

最大的风险在于启用工具时：模型可能会被诱骗泄露上下文或代表你调用工具。可以通过以下方式减小爆炸半径：

- 使用只读或禁用工具的“阅读器”智能体来总结不受信任的内容
- 对于启用工具的智能体，保持 `web_search` / `web_fetch` / `browser` 关闭
- 沙箱隔离和严格的工具允许列表

详情：[Security](/zh/gateway/security)。

### 我的机器人是否应该拥有自己的电子邮件 GitHub 账户或电话号码

是的，对于大多数设置来说。使用单独的账户和电话号码隔离机器人，可以在出现问题时减小爆炸半径。这也使得轮换凭证或撤销访问权限变得更容易，而不会影响你的个人账户。

从小处着手。仅授予你实际需要的工具和账户的访问权限，并在需要时再扩展。

文档：[Security](/zh/gateway/security)、[Pairing](/zh/channels/pairing)。

### 我可以让它自主管理我的短信吗，这安全吗

我们**不**建议让它对你的个人消息拥有完全的自主权。最安全的模式是：

- 将私信保持在**配对模式** 或严格的允许列表中。
- 如果你希望它代表你发送消息，请使用**单独的电话号码或账户**。
- 让它起草草稿，然后**在发送前批准**。

如果您想进行实验，请使用专用账号并保持隔离。参见
[安全性](/zh/gateway/security)。

### 我能否为个人助理任务使用更便宜的模型

可以，**前提是** 代理仅用于聊天且输入内容可信。较小层级的模型
更容易受到指令劫持，因此对于启用了工具的代理
或读取不可信内容时，应避免使用它们。如果您必须使用较小的模型，请锁定
工具并在沙盒中运行。参见 [安全性](/zh/gateway/security)。

### 我在 Telegram 中运行了 start 但没有获得配对代码

配对码**仅在**未知发送者向机器人发送消息且
启用了 `dmPolicy: "pairing"` 时发送。 `/start` 本身不会生成代码。

检查待处理请求：

```bash
openclaw pairing list telegram
```

如果您希望立即获得访问权限，请将您的发送者 ID 加入允许列表，或针对
该账号设置 `dmPolicy: "open"`。

### WhatsApp 它会给我的联系人发消息吗 配对如何工作

不会。默认 WhatsApp 私信策略是 **配对**。未知发送者只会获得配对码，其消息 **不会被处理**。OpenClaw 只回复收到的聊天或您触发的显式发送。

批准配对：

```bash
openclaw pairing approve whatsapp <code>
```

列出待处理请求：

```bash
openclaw pairing list whatsapp
```

向导电话号码提示：它用于设置您的 **allowlist/owner**（白名单/所有者），以便允许您自己的私信。它不用于自动发送。如果您在个人 WhatsApp 号码上运行，请使用该号码并启用 `channels.whatsapp.selfChatMode`。

## 聊天命令，中止任务，以及“它停不下来”

### 如何阻止内部系统消息显示在聊天中

大多数内部或工具消息仅当为该
会话启用了 **verbose**（详细）或 **reasoning**（推理）时才会出现。

在您看到消息的聊天中修复：

```
/verbose off
/reasoning off
```

如果仍然嘈杂，请检查控制 UI 中的会话设置，并将 verbose
设置为 **inherit**（继承）。同时确认您未在配置中使用了将 `verboseDefault` 设置
为 `on` 的机器人配置文件。

文档：[思维和详细输出](/zh/tools/thinking)，[安全性](/zh/gateway/security#reasoning--verbose-output-in-groups)。

### 如何停止/取消正在运行的任务

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

对于后台进程（来自 exec 工具），你可以要求代理运行：

```
process action:kill sessionId:XXX
```

斜杠命令概述：参见[斜杠命令](/zh/tools/slash-commands)。

大多数命令必须作为以 `/` 开头的**独立**消息发送，但少数快捷方式（如 `/status`）对于列入白名单的发送者也可以内联使用。

### 如何从 Discord 发送 Telegram 消息 跨上下文消息已拒绝

OpenClaw 默认阻止 **跨提供商** 消息传递。如果工具调用绑定到 Telegram，除非您明确允许，否则它不会发送到 Discord。

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

编辑配置后重启网关。如果你只想对单个代理进行此设置，请改在 `agents.list[].tools.message` 下进行设置。

### 为什么感觉机器人忽略了连珠炮式的消息

队列模式控制新消息如何与正在进行的运行交互。使用 `/queue` 更改模式：

- `steer` - 新消息重定向当前任务
- `followup` - 一次运行一条消息
- `collect` - 批量消息并回复一次（默认）
- `steer-backlog` - 现在引导，然后处理积压
- `interrupt` - 中止当前运行并重新开始

你可以为后续模式添加选项，如 `debounce:2s cap:25 drop:summarize`。

## 准确回答截图/聊天记录中的问题

**Q：“使用 Anthropic 密钥时 API 的默认模型是什么？”**

**A：** 在 OpenClaw 中，凭据和模型选择是分开的。设置 `ANTHROPIC_API_KEY`（或在身份验证配置文件中存储 Anthropic API 密钥）可以启用身份验证，但实际的默认模型是您在 `agents.defaults.model.primary` 中配置的任何模型（例如，`anthropic/claude-sonnet-4-5` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，这意味着 Gateway(网关) 无法在正在运行的代理的预期 `auth-profiles.json` 中找到 Anthropic 凭据。

---

仍然卡住了？在 [Discord](https://discord.com/invite/clawd) 中提问或发起一个 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。

import zh from '/components/footer/zh.mdx';

<zh />
