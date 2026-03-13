---
summary: "关于 OpenClaw 设置、配置和使用的常见问题"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "FAQ"
---

# FAQ

针对实际环境设置（本地开发、VPS、多代理、OAuth/API 密钥、模型故障转移）的快速解答以及更深入的故障排除。有关运行时诊断，请参阅 [Troubleshooting](/zh/en/gateway/troubleshooting)。有关完整配置参考，请参阅 [Configuration](/zh/en/gateway/configuration)。

## 目录

- [快速入门和首次运行设置]
  - [我卡住了，最快摆脱困境的方法是什么？](#im-stuck-whats-the-fastest-way-to-get-unstuck)
  - [安装和设置 OpenClaw 的推荐方法是什么？](#whats-the-recommended-way-to-install-and-set-up-openclaw)
  - [入职后如何打开仪表板？](#how-do-i-open-the-dashboard-after-onboarding)
  - [如何在本地与远程身份验证仪表板（令牌）？](#how-do-i-authenticate-the-dashboard-token-on-localhost-vs-remote)
  - [我需要什么运行时？](#what-runtime-do-i-need)
  - [它可以在 Raspberry Pi 上运行吗？](#does-it-run-on-raspberry-pi)
  - [Raspberry Pi 安装有什么技巧吗？](#any-tips-for-raspberry-pi-installs)
  - [它卡在“wake up my friend”/ 入职无法完成。现在怎么办？](#it-is-stuck-on-wake-up-my-friend-onboarding-will-not-hatch-what-now)
  - [我可以将设置迁移到新机器而不重新做入职吗？](#can-i-migrate-my-setup-to-a-new-machine-mac-mini-without-redoing-onboarding)
  - [我在哪里可以看到最新版本的新内容？](#where-do-i-see-what-is-new-in-the-latest-version)
  - [我无法访问 docs.openclaw.ai (SSL 错误)。现在怎么办？](#i-cant-access-docsopenclawai-ssl-error-what-now)
  - [稳定版和测试版有什么区别？](#whats-the-difference-between-stable-and-beta)
  - [如何安装测试版，测试版和开发版有什么区别？](#how-do-i-install-the-beta-version-and-whats-the-difference-between-beta-and-dev)
  - [我如何试用最新版本？](#how-do-i-try-the-latest-bits)
  - [安装和入职通常需要多长时间？](#how-long-does-install-and-onboarding-usually-take)
  - [安装程序卡住了？如何获得更多反馈？](#installer-stuck-how-do-i-get-more-feedback)
  - [Windows 安装提示找不到 git 或无法识别 openclaw](#windows-install-says-git-not-found-or-openclaw-not-recognized)
  - [Windows 执行输出显示乱码中文，我该怎么办](#windows-exec-output-shows-garbled-chinese-text-what-should-i-do)
  - [文档没有回答我的问题 - 我如何获得更好的答案？](#the-docs-didnt-answer-my-question-how-do-i-get-a-better-answer)
  - [如何在 Linux 上安装 OpenClaw？](#how-do-i-install-openclaw-on-linux)
  - [如何在 VPS 上安装 OpenClaw？](#how-do-i-install-openclaw-on-a-vps)
  - [云/VPS 安装指南在哪里？](#where-are-the-cloudvps-install-guides)
  - [我可以要求 OpenClaw 自我更新吗？](#can-i-ask-openclaw-to-update-itself)
  - [入职向导实际上是做什么的？](#what-does-the-onboarding-wizard-actually-do)
  - [运行它需要 Claude 或 OpenAI 订阅吗？](#do-i-need-a-claude-or-openai-subscription-to-run-this)
  - [我可以在没有 API 密钥的情况下使用 Claude Max 订阅吗](#can-i-use-claude-max-subscription-without-an-api-key)
  - [Anthropic “setup-token” 认证是如何工作的？](#how-does-anthropic-setuptoken-auth-work)
  - [我在哪里可以找到 Anthropic setup-token？](#where-do-i-find-an-anthropic-setuptoken)
  - [你们支持 Claude 订阅身份验证（Claude Pro 或 Max）吗？](#do-you-support-claude-subscription-auth-claude-pro-or-max)
  - [为什么我会从 Anthropic 收到 `HTTP 429: rate_limit_error`？](#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)
  - [支持 AWS Bedrock 吗？](#is-aws-bedrock-supported)
  - [Codex 身份验证是如何工作的？](#how-does-codex-auth-work)
  - [你们支持 OpenAI 订阅身份验证（Codex OAuth）吗？](#do-you-support-openai-subscription-auth-codex-oauth)
  - [如何设置 Gemini CLI OAuth](#how-do-i-set-up-gemini-cli-oauth)
  - [本地模型适合休闲聊天吗？](#is-a-local-model-ok-for-casual-chats)
  - [如何将托管模型流量保持在特定区域？](#how-do-i-keep-hosted-model-traffic-in-a-specific-region)
  - [我必须购买 Mac Mini 才能安装这个吗？](#do-i-have-to-buy-a-mac-mini-to-install-this)
  - [我需要 Mac mini 来支持 iMessage 吗？](#do-i-need-a-mac-mini-for-imessage-support)
  - [如果我购买 Mac mini 来运行 OpenClaw，我可以将其连接到我的 MacBook Pro 吗？](#if-i-buy-a-mac-mini-to-run-openclaw-can-i-connect-it-to-my-macbook-pro)
  - [我可以使用 Bun 吗？](#can-i-use-bun)
  - [Telegram：`allowFrom` 中填什么？](#telegram-what-goes-in-allowfrom)
  - [多个人可以拥有一个 WhatsApp 号码但使用不同的 OpenClaw 实例吗？](#can-multiple-people-use-one-whatsapp-number-with-different-openclaw-instances)
  - [我可以同时运行一个“快速聊天”代理和一个“Opus 编码”代理吗？](#can-i-run-a-fast-chat-agent-and-an-opus-for-coding-agent)
  - [Homebrew 可以在 Linux 上运行吗？](#does-homebrew-work-on-linux)
  - [可破解安装和 npm 安装有什么区别？](#whats-the-difference-between-the-hackable-git-install-and-npm-install)
  - [以后可以在 npm 和 git 安装之间切换吗？](#can-i-switch-between-npm-and-git-installs-later)
  - [我应该在笔记本电脑还是 VPS 上运行网关？](#should-i-run-the-gateway-on-my-laptop-or-a-vps)
  - [在专用机器上运行 OpenClaw 有多重要？](#how-important-is-it-to-run-openclaw-on-a-dedicated-machine)
  - [最低 VPS 要求和推荐的操作系统是什么？](#what-are-the-minimum-vps-requirements-and-recommended-os)
  - [我可以在 VM 中运行 OpenClaw 吗，有什么要求](#can-i-run-openclaw-in-a-vm-and-what-are-the-requirements)
- [OpenClaw 是什么？](#what-is-openclaw)
  - [OpenClaw 是什么，用一段话概括？](#what-is-openclaw-in-one-paragraph)
  - [价值主张是什么？](#whats-the-value-proposition)
  - [我刚刚设置好，首先应该做什么](#i-just-set-it-up-what-should-i-do-first)
  - [OpenClaw 的前五大日常用例是什么](#what-are-the-top-five-everyday-use-cases-for-openclaw)
  - [OpenClaw 能否帮助 SaaS 进行潜在客户开发、外联、广告和博客创作](#can-openclaw-help-with-lead-gen-outreach-ads-and-blogs-for-a-saas)
  - [与用于 Web 开发的 Claude Code 相比有什么优势？](#what-are-the-advantages-vs-claude-code-for-web-development)
- [技能和自动化](#skills-and-automation)
  - [How do I customize skills without keeping the repo dirty?](#how-do-i-customize-skills-without-keeping-the-repo-dirty)
  - [Can I load skills from a custom folder?](#can-i-load-skills-from-a-custom-folder)
  - [How can I use different models for different tasks?](#how-can-i-use-different-models-for-different-tasks)
  - [The bot freezes while doing heavy work. How do I offload that?](#the-bot-freezes-while-doing-heavy-work-how-do-i-offload-that)
  - [Cron or reminders do not fire. What should I check?](#cron-or-reminders-do-not-fire-what-should-i-check)
  - [How do I install skills on Linux?](#how-do-i-install-skills-on-linux)
  - [Can OpenClaw run tasks on a schedule or continuously in the background?](#can-openclaw-run-tasks-on-a-schedule-or-continuously-in-the-background)
  - [Can I run Apple macOS-only skills from Linux?](#can-i-run-apple-macos-only-skills-from-linux)
  - [Do you have a Notion or HeyGen integration?](#do-you-have-a-notion-or-heygen-integration)
  - [How do I install the Chrome extension for browser takeover?](#how-do-i-install-the-chrome-extension-for-browser-takeover)
- [沙箱和内存](#sandboxing-and-memory)
  - [是否有专门的沙盒文档？](#is-there-a-dedicated-sandboxing-doc)
  - [如何将主机文件夹绑定到沙盒中？](#how-do-i-bind-a-host-folder-into-the-sandbox)
  - [内存是如何工作的？](#how-does-memory-work)
  - [内存总是忘记事情。如何让它记住？](#memory-keeps-forgetting-things-how-do-i-make-it-stick)
  - [内存会永久保存吗？有哪些限制？](#does-memory-persist-forever-what-are-the-limits)
  - [语义内存搜索是否需要 OpenAI API 密钥？](#does-semantic-memory-search-require-an-openai-api-key)
- [文件在磁盘上的位置](#where-things-live-on-disk)
  - [OpenClaw 使用的所有数据是否都保存在本地？](#is-all-data-used-with-openclaw-saved-locally)
  - [OpenClaw 将数据存储在哪里？](#where-does-openclaw-store-its-data)
  - [AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该放在哪里？](#where-should-agentsmd-soulmd-usermd-memorymd-live)
  - [推荐的备份策略是什么？](#whats-the-recommended-backup-strategy)
  - [如何完全卸载 OpenClaw？](#how-do-i-completely-uninstall-openclaw)
  - [Agent 可以在工作区之外工作吗？](#can-agents-work-outside-the-workspace)
  - [我处于远程模式 - 会话存储在哪里？](#im-in-remote-mode-where-is-the-session-store)
- [配置基础](#config-basics)
  - [配置文件是什么格式？它在哪？](#what-format-is-the-config-where-is-it)
  - [我设置了 `gateway.bind: "lan"`（或 `"tailnet"`），现在没有任何监听 / UI 显示未授权](#i-set-gatewaybind-lan-or-tailnet-and-now-nothing-listens-the-ui-says-unauthorized)
  - [为什么我现在在 localhost 上需要一个令牌？](#why-do-i-need-a-token-on-localhost-now)
  - [修改配置后我需要重启吗？](#do-i-have-to-restart-after-changing-config)
  - [我该如何禁用有趣的 CLI 标语？](#how-do-i-disable-funny-cli-taglines)
  - [我该如何启用网络搜索（和网络获取）？](#how-do-i-enable-web-search-and-web-fetch)
  - [config.apply 清除了我的配置。我该如何恢复并避免这种情况？](#configapply-wiped-my-config-how-do-i-recover-and-avoid-this)
  - [我如何在多台设备上运行中央网关和专用工作器？](#how-do-i-run-a-central-gateway-with-specialized-workers-across-devices)
  - [OpenClaw 浏览器可以无头运行吗？](#can-the-openclaw-browser-run-headless)
  - [我该如何使用 Brave 进行浏览器控制？](#how-do-i-use-brave-for-browser-control)
- [远程网关和节点](#remote-gateways-and-nodes)
  - [命令如何在 Telegram、网关和节点之间传播？](#how-do-commands-propagate-between-telegram-the-gateway-and-nodes)
  - [如果网关托管在远程，我的代理如何访问我的计算机？](#how-can-my-agent-access-my-computer-if-the-gateway-is-hosted-remotely)
  - [Tailscale 已连接但我没有收到回复。现在怎么办？](#tailscale-is-connected-but-i-get-no-replies-what-now)
  - [两个 OpenClaw 实例可以相互通信吗（本地 + VPS）？](#can-two-openclaw-instances-talk-to-each-other-local-vps)
  - [多个代理是否需要单独的 VPS](#do-i-need-separate-vpses-for-multiple-agents)
  - [在我的个人笔记本电脑上使用节点而不是从 VPS 使用 SSH 有什么好处吗？](#is-there-a-benefit-to-using-a-node-on-my-personal-laptop-instead-of-ssh-from-a-vps)
  - [节点运行网关服务吗？](#do-nodes-run-a-gateway-service)
  - [是否有 API / RPC 方式来应用配置？](#is-there-an-api-rpc-way-to-apply-config)
  - [首次安装的最小“合理”配置是什么？](#whats-a-minimal-sane-config-for-a-first-install)
  - [如何在 VPS 上设置 Tailscale 并从我的 Mac 连接？](#how-do-i-set-up-tailscale-on-a-vps-and-connect-from-my-mac)
  - [如何将 Mac 节点连接到远程网关（Tailscale Serve）？](#how-do-i-connect-a-mac-node-to-a-remote-gateway-tailscale-serve)
  - [我应该在第二台笔记本电脑上安装还是只添加一个节点？](#should-i-install-on-a-second-laptop-or-just-add-a-node)
- [环境变量和 .env 加载](#env-vars-and-env-loading)
  - [OpenClaw 如何加载环境变量？](#how-does-openclaw-load-environment-variables)
  - [“我通过服务启动了网关，但我的环境变量消失了。”现在该怎么办？](#i-started-the-gateway-via-the-service-and-my-env-vars-disappeared-what-now)
  - [我设置了 `COPILOT_GITHUB_TOKEN`，但模型状态显示“Shell env: off.” 为什么？](#i-set-copilotgithubtoken-but-models-status-shows-shell-env-off-why)
- [会话和多次聊天](#sessions-and-multiple-chats)
  - [如何开始一个新的对话？](#how-do-i-start-a-fresh-conversation)
  - [如果我从没发送 `/new`，会话会自动重置吗？](#do-sessions-reset-automatically-if-i-never-send-new)
  - [有没有办法组成一个 OpenClaw 实例团队，一个 CEO 和许多代理？](#is-there-a-way-to-make-a-team-of-openclaw-instances-one-ceo-and-many-agents)
  - [为什么上下文在任务中途被截断了？我该如何防止这种情况？](#why-did-context-get-truncated-midtask-how-do-i-prevent-it)
  - [我该如何完全重置 OpenClaw 但保留已安装的文件？](#how-do-i-completely-reset-openclaw-but-keep-it-installed)
  - [我收到“上下文过大”错误 - 该如何重置或压缩？](#im-getting-context-too-large-errors-how-do-i-reset-or-compact)
  - [为什么我看到“LLM request rejected: messages.content.tool_use.input field required”？](#why-am-i-seeing-llm-request-rejected-messagescontenttool_useinput-field-required)
  - [为什么我每 30 分钟会收到心跳消息？](#why-am-i-getting-heartbeat-messages-every-30-minutes)
  - [我需要将“机器人帐户”添加到 WhatsApp 群组吗？](#do-i-need-to-add-a-bot-account-to-a-whatsapp-group)
  - [如何获取 WhatsApp 群组的 JID？](#how-do-i-get-the-jid-of-a-whatsapp-group)
  - [为什么 OpenClaw 不在群组中回复？](#why-doesnt-openclaw-reply-in-a-group)
  - [群组/线索与私信共享上下文吗？](#do-groupsthreads-share-context-with-dms)
  - [我可以创建多少个工作区和代理？](#how-many-workspaces-and-agents-can-i-create)
  - [我可以同时运行多个机器人或聊天吗，该如何设置？](#can-i-run-multiple-bots-or-chats-at-the-same-time-slack-and-how-should-i-set-that-up)
- [模型：默认值、选择、别名、切换](#models-defaults-selection-aliases-switching)
  - [什么是“默认模型”？](#what-is-the-default-model)
  - [你推荐哪个模型？](#what-model-do-you-recommend)
  - [如何在不清除配置的情况下切换模型？](#how-do-i-switch-models-without-wiping-my-config)
  - [我可以使用自托管模型（llama.cpp、vLLM、Ollama）吗？](#can-i-use-selfhosted-models-llamacpp-vllm-ollama)
  - [OpenClaw、Flawd 和 Krill 使用什么模型？](#what-do-openclaw-flawd-and-krill-use-for-models)
  - [如何即时切换模型（无需重启）？](#how-do-i-switch-models-on-the-fly-without-restarting)
  - [我可以在日常任务中使用 GPT 5.2，在编码中使用 Codex 5.3 吗](#can-i-use-gpt-52-for-daily-tasks-and-codex-53-for-coding)
  - [为什么我看到“Model … is not allowed”然后没有回复？](#why-do-i-see-model-is-not-allowed-and-then-no-reply)
  - [为什么我看到“Unknown model: minimax/MiniMax-M2.5”？](#why-do-i-see-unknown-model-minimaxminimaxm25)
  - [我可以将 MiniMax 设为默认，并在复杂任务中使用 OpenAI 吗？](#can-i-use-minimax-as-my-default-and-openai-for-complex-tasks)
  - [opus / sonnet / gpt 是内置快捷方式吗？](#are-opus-sonnet-gpt-builtin-shortcuts)
  - [如何定义/覆盖模型快捷方式（别名）？](#how-do-i-defineoverride-model-shortcuts-aliases)
  - [如何添加来自其他提供商（如 OpenRouter 或 Z.AI）的模型？](#how-do-i-add-models-from-other-providers-like-openrouter-or-zai)
- [模型故障转移和“所有模型均失败”](#model-failover-and-all-models-failed)
  - [故障转移是如何工作的？](#how-does-failover-work)
  - [这个错误是什么意思？](#what-does-this-error-mean)
  - [`No credentials found for profile "anthropic:default"` 的修复检查清单](#fix-checklist-for-no-credentials-found-for-profile-anthropicdefault)
  - [为什么它也尝试了 Google Gemini 但失败了？](#why-did-it-also-try-google-gemini-and-fail)
- [身份配置文件：它们是什么以及如何管理它们](#auth-profiles-what-they-are-and-how-to-manage-them)
  - [什么是认证配置文件？](#what-is-an-auth-profile)
  - [典型的配置文件 ID 有哪些？](#what-are-typical-profile-ids)
  - [我可以控制首先尝试哪个认证配置文件吗？](#can-i-control-which-auth-profile-is-tried-first)
  - [OAuth 与 API 密钥：有什么区别？](#oauth-vs-api-key-whats-the-difference)
- [网关：端口、“已在运行”和远程模式](#gateway-ports-already-running-and-remote-mode)
  - [网关使用什么端口？](#what-port-does-the-gateway-use)
  - [为什么 `openclaw gateway status` 显示 `Runtime: running` 但 `RPC probe: failed`？](#why-does-openclaw-gateway-status-say-runtime-running-but-rpc-probe-failed)
  - [为什么 `openclaw gateway status` 显示的 `Config (cli)` 和 `Config (service)` 不同？](#why-does-openclaw-gateway-status-show-config-cli-and-config-service-different)
  - [“另一个网关实例已在监听”是什么意思？](#what-does-another-gateway-instance-is-already-listening-mean)
  - [如何在远程模式下运行 OpenClaw（客户端连接到其他地方的网关）？](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere)
  - [控制 UI 显示“unauthorized”（或一直重新连接）。现在该怎么办？](#the-control-ui-says-unauthorized-or-keeps-reconnecting-what-now)
  - [我设置了 `gateway.bind: "tailnet"` 但它无法绑定 / 没有任何内容在监听](#i-set-gatewaybind-tailnet-but-it-cant-bind-nothing-listens)
  - [我可以在同一主机上运行多个网关吗？](#can-i-run-multiple-gateways-on-the-same-host)
  - [“invalid handshake” / 代码 1008 是什么意思？](#what-does-invalid-handshake-code-1008-mean)
- [日志记录和调试](#logging-and-debugging)
  - [日志在哪里？](#where-are-logs)
  - [如何启动/停止/重启 Gateway 服务？](#how-do-i-startstoprestart-the-gateway-service)
  - [我在 Windows 上关闭了终端 - 如何重启 OpenClaw？](#i-closed-my-terminal-on-windows-how-do-i-restart-openclaw)
  - [Gateway 已启动但从未收到回复。我应该检查什么？](#the-gateway-is-up-but-replies-never-arrive-what-should-i-check)
  - [“Disconnected from gateway: no reason” - 现在该怎么办？](#disconnected-from-gateway-no-reason-what-now)
  - [Telegram setMyCommands 失败。我应该检查什么？](#telegram-setmycommands-fails-what-should-i-check)
  - [TUI 没有显示输出。我应该检查什么？](#tui-shows-no-output-what-should-i-check)
  - [如何完全停止然后启动 Gateway？](#how-do-i-completely-stop-then-start-the-gateway)
  - [ELI5: `openclaw gateway restart` vs `openclaw gateway`](#eli5-openclaw-gateway-restart-vs-openclaw-gateway)
  - [当出现故障时，获取更多详细信息的最快方法是什么？](#whats-the-fastest-way-to-get-more-details-when-something-fails)
- [媒体和附件](#media-and-attachments)
  - [My skill generated an image/PDF, but nothing was sent](#my-skill-generated-an-imagepdf-but-nothing-was-sent)
- [安全和访问控制](#security-and-access-control)
  - [将 OpenClaw 暴露给入站私信安全吗？](#is-it-safe-to-expose-openclaw-to-inbound-dms)
  - [提示词注入只是公共机器人需要担心的问题吗？](#is-prompt-injection-only-a-concern-for-public-bots)
  - [我的机器人应该有自己的电子邮件、GitHub 账户或电话号码吗](#should-my-bot-have-its-own-email-github-account-or-phone-number)
  - [我可以让它自主处理我的短信吗，这安全吗](#can-i-give-it-autonomy-over-my-text-messages-and-is-that-safe)
  - [我可以在个人助理任务中使用更便宜的模型吗？](#can-i-use-cheaper-models-for-personal-assistant-tasks)
  - [我在 Telegram 中运行了 `/start` 但没有获得配对代码](#i-ran-start-in-telegram-but-didnt-get-a-pairing-code)
  - [WhatsApp：它会给我的联系人发消息吗？配对如何工作？](#whatsapp-will-it-message-my-contacts-how-does-pairing-work)
- [聊天命令、中止任务和“它无法停止”](#chat-commands-aborting-tasks-and-it-wont-stop)
  - [如何阻止内部系统消息在聊天中显示](#how-do-i-stop-internal-system-messages-from-showing-in-chat)
  - [如何停止/取消正在运行的任务？](#how-do-i-stopcancel-a-running-task)
  - [如何从 Telegram 发送 Discord 消息？（“跨上下文消息被拒绝”）](#how-do-i-send-a-discord-message-from-telegram-crosscontext-messaging-denied)
  - [为什么感觉机器人会“忽略”连珠炮式的消息？](#why-does-it-feel-like-the-bot-ignores-rapidfire-messages)

## 如果出现问题，首先做的 60 秒

1. **快速状态（首次检查）**

   ```bash
   openclaw status
   ```

快速本地总结：操作系统 + 更新，网关/服务可达性，代理/会话，提供程序配置 + 运行时问题（当网关可达时）。

2. **可粘贴的报告（可安全分享）**

   ```bash
   openclaw status --all
   ```

只读诊断，带有日志尾部（令牌已编辑）。

3. **守护进程 + 端口状态**

   ```bash
   openclaw gateway status
   ```

显示监控程序运行时与 RPC 可达性、探测目标 URL 以及服务可能使用的配置。

4. **深度探测**

   ```bash
   openclaw status --deep
   ```

运行网关健康检查 + 提供商探测（需要可访问的网关）。参见 [Health

5. **查看最新日志**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 故障，回退到：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   文件日志与服务日志是分开的；请参阅[日志记录](/zh/en/logging)和[故障排除](/zh/en/gateway/troubleshooting)。

6. **运行诊断程序（修复）**

   ```bash
   openclaw doctor
   ```

   修复/迁移配置/状态并运行健康检查。请参阅 [Doctor](/zh/en/gateway/doctor)。

7. **网关快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向运行中的网关请求完整快照（仅限 WS）。请参阅 [健康检查](/zh/en/gateway/health)。

## 快速入门和首次运行设置

### 我卡住了，最快摆脱困境的方法是什么

使用一个能**查看你的机器**的本地 AI 代理。这比在 Discord 上提问要有效得多，因为大多数“我卡住了”的情况都是**本地配置或环境问题**，远程帮助者无法检查这些问题。

- **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
- **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

这些工具可以读取仓库、运行命令、检查日志，并帮助修复机器级别的
设置（PATH、服务、权限、身份验证文件）。通过可破解（git）安装
方式向它们提供**完整的源代码检出**：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

这将从 git 检出安装 OpenClaw **from a git checkout**，以便智能体可以读取代码和文档，并对您运行的确切版本进行推理。稍后您始终可以通过不带 `--install-method git` 重新运行安装程序来切换回稳定版本。

提示：要求 agent **规划并监督**修复过程（分步进行），然后仅执行
必要的命令。这能保持改动微小，更易于审计。

如果您发现真正的错误或修复，请提交 GitHub issue 或发送 PR:
[https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
[https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

从以下命令开始（在寻求帮助时分享输出）：

```bash
openclaw status
openclaw models status
openclaw doctor
```

它们的作用：

- `openclaw status`：网关/代理健康状况 + 基本配置的快速快照。
- `openclaw models status`：检查提供商身份验证和模型可用性。
- `openclaw doctor`: 验证并修复常见的配置/状态问题。

其他有用的 CLI 检查：`openclaw status --all`、`openclaw logs --follow`、
`openclaw gateway status`、`openclaw health --verbose`。

快速调试循环：[如果出现故障，请查看最初的60秒](#first-60-seconds-if-somethings-broken)。
安装文档：[安装](/zh/en/install)、[安装程序标志](/zh/en/install/installer)、[更新](/zh/en/install/updating)。

### 安装和设置 OpenClaw 的推荐方法是什么

该仓库建议从源代码运行并使用入门向导：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
```

向导也可以自动构建 UI 资产。完成入门引导后，通常会在端口 **18789** 上运行网关。

从源码（贡献者/开发者）：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw onboard
```

如果您还没有进行全局安装，请通过 `pnpm openclaw onboard` 运行它。

### 入职后如何打开仪表板

向导会在引导完成后立即在你的浏览器中打开一个干净的（非令牌化的）仪表板 URL，并且也会在摘要中打印该链接。请保持该标签页打开；如果它没有启动，请在同一台机器上复制/粘贴打印出的 URL。

### 如何在本地主机和远程服务器上验证仪表板令牌

**本地主机（同一台机器）：**

- 打开 `http://127.0.0.1:18789/`。
- 如果系统要求进行身份验证，请将 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）中的令牌粘贴到控制界面设置中。
- 从网关主机检索它：`openclaw config get gateway.auth.token`（或生成一个：`openclaw doctor --generate-gateway-token`）。

**不在 localhost 上：**

- **Tailscale Serve**（推荐）：保持绑定回环，运行 `openclaw gateway --tailscale serve`，打开 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 为 `true`，身份标头满足 Control UI/WebSocket 认证（无令牌，假定受信任的网关主机）；HTTP API 仍需要令牌/密码。
- **Tailnet bind**：运行 `openclaw gateway --bind tailnet --token "<token>"`，打开 `http://<tailscale-ip>:18789/`，在仪表盘设置中粘贴令牌。
- **SSH 隧道**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/` 并在 Control UI 设置中粘贴令牌。

有关绑定模式和身份验证详情，请参阅 [Dashboard](/zh/en/web/dashboard) 和 [Web surfaces](/zh/en/web)。

### 我需要什么运行时

需要 Node **>= 22**。推荐使用 `pnpm`。对于网关，**不推荐** 使用 Bun。

### 它能在树莓派上运行吗

是的。Gateway 是轻量级的——文档列出的 **512MB-1GB RAM**、**1 核**以及约 **500MB** 磁盘空间对于个人使用已足够，并注明 **Raspberry Pi 4 可以运行它**。

如果您需要额外的余量（日志、媒体、其他服务），**建议使用 2GB**，但这
并非硬性最低要求。

提示：一台小型 Pi/VPS 即可托管网关，您可以在笔记本电脑/手机上配对 **节点**，以用于本地屏幕/摄像头/画布或命令执行。请参阅 [节点](/zh/en/nodes)。

### 树莓派安装有什么技巧吗

简而言之：它可以用，但可能会有一些粗糙的边缘。

- 请使用 **64 位** 操作系统，并确保 Node 版本 >= 22。
- 建议使用 **可黑客式安装 (git)**，这样您可以查看日志并快速更新。
- 在不使用 channels/skills 的情况下启动，然后逐个添加它们。
- 如果您遇到奇怪的二进制问题，通常是一个 **ARM 兼容性** 问题。

文档：[Linux](/zh/en/platforms/linux)，[安装](/zh/en/install)。

### 它卡在了唤醒我的朋友，入职无法完成，现在怎么办？

该屏幕取决于网关是否可达且已通过身份验证。TUI 还会在首次孵化时自动发送“Wake up, my friend!”。如果您看到该行且**没有回复**，并且令牌数量保持为 0，则说明代理从未运行。

1. 重启网关：

```bash
openclaw gateway restart
```

2. 检查状态 + 身份验证：

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

3. 如果仍然卡住，请运行：

```bash
openclaw doctor
```

如果网关是远程的，请确保隧道/Tailscale 连接正常，并且 UI 指向了正确的网关。请参阅 [远程访问](/zh/en/gateway/remote)。

### 我可以将我的设置迁移到新的 Mac mini 机器而无需重新进行入门引导吗

是的。复制 **state directory** 和 **workspace**，然后运行一次 Doctor。这能让你的 bot 保持“完全一致”（内存、会话历史、身份验证和通道状态），前提是你复制了 **both** 位置：

1. 在新机器上安装 OpenClaw。
2. 从旧机器复制 `$OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）。
3. 复制你的工作区（默认：`~/.openclaw/workspace`）。
4. 运行 `openclaw doctor` 并重启 Gateway 服务。

这会保留配置、身份验证配置文件、WhatsApp 凭据、会话和记忆。如果您处于远程模式，请记住网关主机拥有会话存储和工作区。

**重要提示：** 如果你只将工作区 commit/push 到 GitHub，你备份的是 **memory + bootstrap files**，但**不**包括会话历史或认证信息。这些信息位于 `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

相关：[迁移](/zh/en/install/migrating)，[数据在磁盘上的位置](/zh/en/help/faq#where-does-openclaw-store-its-data)，
[Agent 工作区](/zh/en/concepts/agent-workspace)，[诊断工具](/zh/en/gateway/doctor)，
[远程模式](/zh/en/gateway/remote)。

### 我在哪里可以看到最新版本的新内容

查看 GitHub 更新日志:
[https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

最新的条目位于顶部。如果顶部部分标记为 **Unreleased**，则下一个带日期的部分是最新发布的版本。条目按 **Highlights**、**Changes** 和 **Fixes** 分组（必要时还包括文档/其他部分）。

### 我无法访问 docs.openclaw.ai SSL 错误 怎么办

某些 Comcast/Xfinity 连接通过 Xfinity
Advanced Security 错误地阻止了 `docs.openclaw.ai`。请禁用它或将 `docs.openclaw.ai` 加入白名单，然后重试。更多
详细信息: [Troubleshooting](/zh/en/help/troubleshooting#docsopenclawai-shows-an-ssl-error-comcastxfinity)。
请通过此处报告来帮助我们解除封锁: [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

如果您仍然无法访问该站点，文档已在 GitHub 上镜像:
[https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

### 稳定版和 beta 版有什么区别？

**Stable** 和 **beta** 是 **npm dist-tags**，而不是独立的代码行：

- `latest` = 稳定版
- `beta` = 早期测试构建

我们将构建版本发布到 **beta**，进行测试，一旦某个版本稳定，我们就将其**提升到 `latest`**。这就是为什么 beta 和 stable 可能指向**同一个版本**。

查看更改内容:
[https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

### 如何安装 beta 版本，beta 和 dev 版本之间有什么区别？

**Beta** 是 npm dist-tag `beta`（可能匹配 `latest`）。
**Dev** 是 `main` (git) 的移动头部；发布时，它使用 npm dist-tag `dev`。

单行命令 (macOS/Linux)：

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
```

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Windows 安装程序 (PowerShell):
[https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

更多详情：[开发渠道](/zh/en/install/development-channels) 和 [安装程序标志](/zh/en/install/installer)。

### 安装和入职通常需要多长时间

快速指南：

- **安装：** 2-5 分钟
- **入职引导：** 5-15 分钟，具体取决于你配置的渠道/模型数量

如果挂起，请使用 [Installer stuck](/zh/en/help/faq#installer-stuck-how-do-i-get-more-feedback)
以及 [Im stuck](/zh/en/help/faq#im-stuck--whats-the-fastest-way-to-get-unstuck) 中的快速调试循环。

### 如何试用最新的版本

两个选项：

1. **开发通道 (git checkout)：**

```bash
openclaw update --channel dev
```

这将切换到 `main` 分支并从源代码更新。

2. **可自定义安装（来自安装站点）：**

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

这为您提供了一个可以编辑的本地仓库，然后可以通过 git 进行更新。

如果您喜欢手动进行干净的克隆，请使用：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
```

文档：[更新](/zh/en/cli/update)、[开发渠道](/zh/en/install/development-channels)、
[安装](/zh/en/install)。

### 安装程序卡住了 我如何获取更多反馈

使用 **详细输出** 重新运行安装程序：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
```

Beta 安装带详细输出：

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

更多选项：[安装程序标志](/zh/en/install/installer)。

### Windows 安装提示未找到 git 或无法识别 openclaw

Windows 上的两个常见问题：

**1) npm 错误 spawn git / 未找到 git**

- 安装 **Git for Windows** 并确保 `git` 在您的 PATH 中。
- 关闭并重新打开 PowerShell，然后重新运行安装程序。

**2) 安装后无法识别 openclaw**

- 您的 npm 全局 bin 文件夹未在 PATH 中。
- 检查路径：

  ```powershell
  npm config get prefix
  ```

- 将该目录添加到您的用户 PATH（在 Windows 上不需要 `\bin` 后缀；在大多数系统上是 `%AppData%\npm`）。
- 更新 PATH 后关闭并重新打开 PowerShell。

如果你想要最顺畅的 Windows 设置，请使用 **WSL2** 而不是原生 Windows。
文档：[Windows](/zh/en/platforms/windows)。

### Windows exec 输出显示乱码中文，我该怎么办

这通常是由于本机 Windows Shell 的控制台代码页不匹配导致的。

症状：

- `system.run`/`exec` 输出将中文渲染为乱码（mojibake）
- 在另一个终端配置文件中，同一命令显示正常

PowerShell 中的快速变通方法：

```powershell
chcp 65001
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
```

然后重启 Gateway 并重试你的命令：

```powershell
openclaw gateway restart
```

如果您在最新版本的 OpenClaw 中仍然遇到此问题，请在以下位置跟踪或报告：

- [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

### 文档没有回答我的问题，我如何获得更好的答案

使用 **可破解的（git）安装**，这样你就可以在本地拥有完整的源代码和文档，然后
_从该文件夹中_ 询问你的机器人（或 Claude/Codex），以便它可以读取仓库并准确回答。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

更多详情：[安装](/zh/en/install) 和 [安装程序标志](/zh/en/install/installer)。

### 如何在 Linux 上安装 OpenClaw

简短回答：遵循 Linux 指南，然后运行入门向导。

- Linux 快速路径 + 服务安装：[Linux](/zh/en/platforms/linux)。
- 完整指南：[Getting Started](/zh/en/start/getting-started)。
- 安装程序 + 更新：[安装与更新](/zh/en/install/updating)。

### 如何在 VPS 上安装 OpenClaw

任何 Linux VPS 都可以。在服务器上安装，然后使用 SSH/Tailscale 来连接网关。

指南：[exe.dev](/zh/en/install/exe-dev)、[Hetzner](/zh/en/install/hetzner)、[Fly.io](/zh/en/install/fly)。
远程访问：[Gateway remote](/zh/en/gateway/remote)。

### 云VPS安装指南在哪里

我们维护了一个包含常见提供商的**托管中心**。选择一个并按照指南操作：

- [VPS 托管](/zh/en/vps)（将所有提供商集中在一处）
- [Fly.io](/zh/en/install/fly)
- [Hetzner](/zh/en/install/hetzner)
- [exe.dev](/zh/en/install/exe-dev)

云端工作原理：**Gateway 运行在服务器上**，您可以通过控制 UI（或 Tailscale/SSH）从笔记本电脑/手机访问它。您的状态 + 工作区位于服务器上，因此请将主机视为事实来源并进行备份。

您可以将**节点**（Mac/iOS/Android/无头）与该云网关配对，以便
访问本地屏幕/摄像头/画布或在笔记本电脑上运行命令，同时将
网关保留在云端。

Hub: [Platforms](/zh/en/platforms)。远程访问: [Gateway remote](/zh/en/gateway/remote)。
Nodes: [Nodes](/zh/en/nodes), [Nodes CLI](/zh/en/cli/nodes)。

### 我可以要求 OpenClaw 更新自己吗

简短回答：**可行，但不推荐**。更新流程可能会重启
网关（这会断开活动会话），可能需要干净的 git checkout，并且
可能会提示进行确认。更安全的做法：作为操作员从 shell 运行更新。

使用命令行界面（CLI）：

```bash
openclaw update
openclaw update status
openclaw update --channel stable|beta|dev
openclaw update --tag <dist-tag|version>
openclaw update --no-restart
```

如果您必须从代理程序进行自动化：

```bash
openclaw update --yes --no-restart
openclaw gateway restart
```

文档：[更新](/zh/en/cli/update)、[正在更新](/zh/en/install/updating)。

### 入门向导实际上做了什么

`openclaw onboard` 是推荐的设置路径。在**本地模式**下，它会引导您完成：

- **模型/认证设置**（支持提供商 OAuth/设置令牌流程和 API 密钥，以及本地模型选项，如 LM Studio）
- **工作区** 位置 + 引导文件
- **网关设置**（绑定/端口/认证/tailscale）
- **提供商**（WhatsApp、Telegram、Discord、Mattermost（插件）、Signal、iMessage）
- **守护进程安装** (macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd 用户单元)
- **健康检查**和**技能**选择

如果您配置的模型未知或缺少身份验证，它也会发出警告。

### 运行这个需要 Claude 或 OpenAI 订阅吗

不需要。您可以使用 **API 密钥**（Anthropic/OpenAI/其他）或使用 **仅本地模型** 来运行 OpenClaw，以便您的数据保留在您的设备上。订阅（Claude Pro/Max 或 OpenAI Codex）是验证这些提供商的可选方式。

如果您选择 Anthropic 订阅认证，请自行决定是否使用：
过去 Anthropic 曾阻止 Claude Code 之外的部分订阅使用。
OpenAI Codex OAuth 明确支持像 OpenClaw 这样的外部工具。

文档：[Anthropic](/zh/en/providers/anthropic)、[OpenAI](/zh/en/providers/openai)、
[本地模型](/zh/en/gateway/local-models)、[模型](/zh/en/concepts/models)。

### 我可以在没有 API 密钥的情况下使用 Claude Max 订阅吗

是的。你可以使用 **setup-token** 而不是 API 密钥进行身份验证。这是订阅路径。

Claude Pro/Max 订阅 **不包含 API 密钥**，因此这是订阅账户的技术路径。但这取决于您的决定：Anthropic 过去曾阻止部分订阅账户在 Claude Code 之外的使用。如果您希望获得生产环境中最清晰且最安全的支持路径，请使用 Anthropic API 密钥。

### Anthropic 的 setuptoken 认证是如何工作的？

`claude setup-token` 通过 Claude Code CLI 生成一个 **令牌字符串**（Web 控制台中不可用）。您可以在 **任何机器** 上运行它。在向导中选择 **Anthropic 令牌（粘贴 setup-token）** 或使用 `openclaw models auth paste-token --provider anthropic` 粘贴它。该令牌作为 **anthropic** 提供商的身份验证配置文件存储，并像 API 密钥一样使用（不自动刷新）。更多详情：[OAuth](/zh/en/concepts/oauth)。

### 我在哪里可以找到 Anthropic 的 setup 令牌

它**不在** Anthropic Console 中。setup-token 是由 **Claude Code CLI** 在**任何机器上**生成的：

```bash
claude setup-token
```

复制它打印出的令牌，然后在向导中选择 **Anthropic 令牌（粘贴 setup-token）**。如果你想将其运行在网关主机上，请使用 `openclaw models auth setup-token --provider anthropic`。如果你在别处运行了 `claude setup-token`，请使用 `openclaw models auth paste-token --provider anthropic` 将其粘贴到网关主机上。参见 [Anthropic](/zh/en/providers/anthropic)。

### 您是否支持 Claude 订阅身份验证（Claude Pro 或 Max）

是的 - 通过 **setup-token**。OpenClaw 不再复用 Claude Code CLI OAuth 令牌；请使用 setup-token 或 Anthropic API 密钥。可以在任何地方生成令牌，然后将其粘贴到网关主机上。请参阅 [Anthropic](/zh/en/providers/anthropic) 和 [OAuth](/zh/en/concepts/oauth)。

重要提示：这指的是技术兼容性，而非政策保证。Anthropic 过去曾阻止某些在 Claude Code 之外的订阅使用。
您需要自行决定是否使用它，并核实 Anthropic 的当前条款。
对于生产环境或多用户工作负载，Anthropic API 密钥认证是更安全、更推荐的选择。

### 为什么我会收到来自 Anthropic 的 HTTP 429 速率限制错误

这意味着您当前的 **Anthropic 配额/速率限制** 已用尽。如果您使用的是 **Claude 订阅**（setup-token），请等待窗口重置或升级您的计划。如果您使用的是 **Anthropic API 密钥**，请检查 Anthropic 控制台的使用情况/计费信息，并根据需要提高限额。

如果消息特别指出是：
`Extra usage is required for long context requests`，则该请求正尝试使用
Anthropic 的 1M 上下文测试版（`context1m: true`）。这仅在你的凭证
符合长上下文计费条件时才有效（即 API 密钥计费或启用了额外使用的订阅）。

提示：设置一个 **fallback model**，以便在提供商被限速时 OpenClaw 能够继续回复。
请参阅 [Models](/zh/en/cli/models)、[OAuth](/zh/en/concepts/oauth) 和
[/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/zh/en/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

### 是否支持 AWS Bedrock

是的 - 通过 pi-ai 的 **Amazon Bedrock (Converse)** 提供程序并使用**手动配置**。您必须在网关主机上提供 AWS 凭证/区域，并在模型配置中添加 Bedrock 提供程序条目。请参阅 [Amazon Bedrock](/zh/en/providers/bedrock) 和 [Model providers](/zh/en/providers/models)。如果您更倾向于托管密钥流程，在 Bedrock 前面部署一个兼容 OpenAI 的代理仍然是一个有效的选择。

### Codex 认证如何工作

OpenClaw 通过 OAuth（ChatGPT 登录）支持 **OpenAI Code (Codex)**。向导可以运行 OAuth 流程，并在适当时将默认模型设置为 `openai-codex/gpt-5.4`。请参阅 [Model providers](/zh/en/concepts/model-providers) 和 [Wizard](/zh/en/start/wizard)。

### 您是否支持 OpenAI 订阅身份验证、Codex OAuth

是的。OpenClaw 完全支持 **OpenAI Code (Codex) 订阅 OAuth**。
OpenAI 明确允许在 OpenClaw 等外部工具/工作流中使用订阅 OAuth。
入门向导可以为您运行 OAuth 流程。

请参阅 [OAuth](/zh/en/concepts/oauth)、[模型提供商](/zh/en/concepts/model-providers) 和 [向导](/zh/en/start/wizard)。

### 如何设置 Gemini CLI OAuth

Gemini CLI 使用 **插件认证流程**，而不是 `openclaw.json` 中的客户端 ID 或密钥。

步骤：

1. 启用插件：`openclaw plugins enable google-gemini-cli-auth`
2. 登录：`openclaw models auth login --provider google-gemini-cli --set-default`

这会将 OAuth 令牌存储在网关主机的身份验证配置文件中。详情：[模型提供商](/zh/en/concepts/model-providers)。

### 本地模型是否适合用于非正式聊天？

通常不行。OpenClaw 需要大上下文 + 强安全性；小卡会截断并泄露。如果你必须使用，请在本地运行你能运行的 **最大的** MiniMax M2.5 版本（LM Studio），并参阅 [/gateway/local-models](/zh/en/gateway/local-models)。更小/量化的模型会增加提示词注入风险 - 请参阅 [Security](/zh/en/gateway/security)。

### 如何将托管模型的流量保持在特定区域

选择区域固定的端点。OpenRouter 为 MiniMax、Kimi 和 GLM 提供了美国托管选项；选择美国托管变体以将数据保留在区域内。您仍然可以通过使用 `models.mode: "merge"` 将 Anthropic/OpenAI 与这些模型并列列出，以便在选择区域提供商的同时保持备选可用。

### 我必须购买 Mac Mini 才能安装这个吗

不。OpenClaw 运行在 macOS 或 Linux 上（Windows 通过 WSL2）。Mac mini 是可选的——有些人会购买一个作为长期运行的主机，但小型 VPS、家庭服务器或树莓派级别的设备也可以。

你只需要一台 Mac **用于仅限 macOS 的工具**。对于 iMessage，请使用 [BlueBubbles](/zh/en/channels/bluebubbles)（推荐）- BlueBubbles 服务器可在任何 Mac 上运行，而 Gateway 可在 Linux 或其他地方运行。如果你想要其他仅限 macOS 的工具，请在 Mac 上运行 Gateway 或配对一个 macOS 节点。

文档：[BlueBubbles](/zh/en/channels/bluebubbles)、[Nodes](/zh/en/nodes)、[Mac 远程模式](/zh/en/platforms/mac/remote)。

### 我是否需要 Mac mini 才能支持 iMessage

您需要一台**已登录到信息的 macOS 设备**。它**不一定**要是 Mac mini——任何 Mac 都可以。**使用 [BlueBubbles](/zh/en/channels/bluebubbles)**（推荐）来实现 iMessage 功能——BlueBubbles 服务器运行在 macOS 上，而 Gateway 可以运行在 Linux 或其他地方。

常见设置：

- 在 Linux/VPS 上运行 Gateway，并在任何已登录 Messages 的 Mac 上运行 BlueBubbles 服务器。
- 如果你想要最简单的单机设置，请在 Mac 上运行所有内容。

文档：[BlueBubbles](/zh/en/channels/bluebubbles)、[Nodes](/zh/en/nodes)、
[Mac 远程模式](/zh/en/platforms/mac/remote)。

### 如果我购买一台 Mac mini 来运行 OpenClaw，我可以将它连接到我的 MacBook Pro 吗？

是的。**Mac mini 可以运行 Gateway**，而您的 MacBook Pro 可以作为**节点**（配套设备）进行连接。节点不运行 Gateway——它们提供额外的功能，如该设备上的屏幕/摄像头/画布和 `system.run`。

常见模式：

- Mac mini（始终开启）上的网关。
- MacBook Pro 运行 macOS 应用程序或节点主机，并与 Gateway 配对。
- 使用 `openclaw nodes status` / `openclaw nodes list` 来查看它。

文档：[节点](/zh/en/nodes)、[节点 CLI](/zh/en/cli/nodes)。

### 我可以使用 Bun 吗

不建议使用 Bun。我们遇到了运行时错误，尤其是在 WhatsApp 和 Telegram 方面。
请使用 Node 以获得稳定的网关。

如果您仍然想尝试 Bun，请在没有 WhatsApp/Telegram 的非生产网关上进行。

### Telegram 中 allowFrom 应该填什么

`channels.telegram.allowFrom` 是**人类发送者的 Telegram 用户 ID**（数字）。它不是机器人用户名。

入职向导接受 `@username` 输入并将其解析为数字 ID，但 OpenClaw 授权仅使用数字 ID。

更安全（无第三方机器人）：

- 私信给你的机器人，然后运行 `openclaw logs --follow` 并阅读 `from.id`。

官方 Bot API：

- 私信你的机器人，然后调用 `https://api.telegram.org/bot<bot_token>/getUpdates` 并阅读 `message.from.id`。

第三方（隐私性较低）：

- 私信 `@userinfobot` 或 `@getidsbot`。

参见 [/channels/telegram](/zh/en/channels/telegram#access-control-dms--groups)。

### 多个人可以共用一个 WhatsApp 号码搭配不同的 OpenClaw 实例吗

是的，通过 **多代理路由**。将每个发送者的 WhatsApp **私信**（对端 `kind: "direct"`，发送者 E.164 格式如 `+15551234567`）绑定到不同的 `agentId`，这样每个人都能获得自己的工作区和会话存储。回复仍来自 **同一个 WhatsApp 账号**，且私信访问控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）是按 WhatsApp 账号全局生效的。请参阅 [多代理路由](/zh/en/concepts/multi-agent) 和 [WhatsApp](/zh/en/channels/whatsapp)。

### 我可以同时运行一个快速聊天代理和一个用于编程的 Opus 代理吗

是的。使用多代理路由：为每个代理指定其默认模型，然后将入站路由（提供商账户或特定对等端）绑定到每个代理。配置示例位于 [Multi-Agent Routing](/zh/en/concepts/multi-agent)。另请参阅 [Models](/zh/en/concepts/models) 和 [Configuration](/zh/en/gateway/configuration)。

### Homebrew 在 Linux 上能运行吗

是的。Homebrew 支持 Linux（Linuxbrew）。快速设置：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
brew install <formula>
```

如果您通过 systemd 运行 OpenClaw，请确保服务 PATH 包含 `/home/linuxbrew/.linuxbrew/bin`（或您的 brew 前缀），以便 `brew` 安装的工具在非登录 shell 中能正确解析。
最近的版本还会在 Linux systemd 服务中预置常见的用户 bin 目录（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），并在设置了 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR` 时予以遵守。

### 可黑客的 git 安装和 npm 安装之间有什么区别

- **可黑客（git）安装：** 完整的源代码检出，可编辑，最适合贡献者。
  你在本地运行构建并可以修补代码/文档。
- **npm install：** 全局 CLI 安装，不需要仓库，最适合“直接运行”的情况。
更新来自 npm dist-tags。

文档：[入门指南](/zh/en/start/getting-started)，[更新](/zh/en/install/updating)。

### 我以后可以在 npm 和 git 安装之间切换吗

是的。安装另一个版本，然后运行 Doctor，以便网关服务指向新的入口点。
这**不会删除你的数据**——它只会更改 OpenClaw 代码安装。你的状态
(`~/.openclaw`)和工作区 (`~/.openclaw/workspace`) 保持不变。

从 npm → git：

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

Doctor 会检测到网关服务入口点不匹配，并提议重写服务配置以匹配当前安装（在自动化中使用 `--repair`）。

备份提示：请参阅 [Backup strategy](/zh/en/help/faq#whats-the-recommended-backup-strategy)。

### 我应该将 Gateway 运行在笔记本电脑还是 VPS 上

简短回答：**如果您需要 24/7 的稳定性，请使用 VPS**。如果您希望
最省心且不介意休眠/重启，请在本地运行。

**笔记本电脑（本地网关）**

- **优点：** 无服务器成本，直接访问本地文件，实时浏览器窗口。
- **缺点：** 休眠/网络断开 = 连接中断，系统更新/重启会中断，必须保持唤醒状态。

**VPS / 云服务器**

- **优点：** 始终在线、网络稳定、无笔记本休眠问题、更易于持续运行。
- **缺点：** 通常无头运行（使用截图），仅限远程文件访问，必须通过 SSH 进行更新。

**OpenClaw 专属说明：** 在 VPS 上使用 WhatsApp/Telegram/Slack/Mattermost（插件）/Discord 均可正常运行。唯一的真正权衡是 **无头浏览器（headless browser）** 与可见窗口之间的选择。请参阅 [浏览器](/zh/en/tools/browser)。

**推荐默认选项：**如果您之前遇到过网关断开连接的情况，请选择 VPS。当您正在积极使用 Mac 并希望进行本地文件访问或使用可见浏览器进行 UI 自动化时，本地部署是非常棒的。

### 在专用机器上运行 OpenClaw 有多重要

非必需，但**为了可靠性和隔离性，推荐使用**。

- **专用主机（VPS/Mac mini/Pi）：** 始终在线，休眠/重启中断较少，权限更清晰，更易于保持运行。
- **共享笔记本电脑/台式机：** 完全适合测试和主动使用，但请注意在机器睡眠或更新时会出现暂停。

如果您想要两全其美，请将 Gateway 保留在专用主机上，并将您的笔记本电脑作为本地屏幕/摄像头/exec工具的 **node** 进行配对。请参阅 [Nodes](/zh/en/nodes)。
有关安全指南，请阅读 [Security](/zh/en/gateway/security)。

### 最低 VPS 要求和推荐的操作系统是什么

OpenClaw 很轻量。对于基本的 Gateway + 一个聊天频道：

- **绝对最低要求：** 1 vCPU，1GB RAM，约500MB磁盘空间。
- **推荐：** 1-2 vCPU，2GB RAM 或更多以留有余量（日志、媒体、多个频道）。Node 工具和浏览器自动化可能会消耗较多资源。

操作系统：请使用 **Ubuntu LTS**（或任何现代的 Debian/Ubuntu）。Linux 安装路径在此经过了最充分的测试。

文档：[Linux](/zh/en/platforms/linux)，[VPS 托管](/zh/en/vps)。

### 我可以在虚拟机中运行 OpenClaw 吗，有哪些要求？

是的。将虚拟机（VM）视为与 VPS 相同：它需要始终保持开机、可访问，并且为 Gateway 及您启用的任何通道提供足够的 RAM。

基本指导：

- **绝对最低要求：** 1 vCPU，1GB RAM。
- **推荐：** 如果您运行多个频道、浏览器自动化或媒体工具，建议使用 2GB 或更多内存。
- **操作系统：** Ubuntu LTS 或其他现代 Debian/Ubuntu 发行版。

如果您使用的是 Windows，**WSL2 是最简单的虚拟机风格设置**，并且具有最佳的工具兼容性。请参阅 [Windows](/zh/en/platforms/windows)、[VPS 托管](/zh/en/vps)。
如果您在虚拟机中运行 macOS，请参阅 [macOS 虚拟机](/zh/en/install/macos-vm)。

## 什么是 OpenClaw？

### 用一段话概括什么是 OpenClaw

OpenClaw 是您在自己的设备上运行的个人 AI 助手。它会在您已经使用的消息平台上回复（WhatsApp、Telegram、Slack、Mattermost（插件）、Discord、Google Chat、Signal、iMessage、WebChat），并且还可以在支持的平台上进行语音交互和使用实时 Canvas。**Gateway** 是常驻运行的控制平面；而助手则是核心产品。

### OpenClaw 的价值主张是什么

OpenClaw 并不仅仅是“一个 Claude 封装器”。它是一个**以本地优先的控制平面**，让您能够在**您自己的硬件**上运行一个功能强大的助手，并可通过您已经在使用的聊天应用进行访问，具备有状态会话、记忆和工具功能——而无需将您的工作流控制权交给托管的 SaaS 服务。

亮点：

- **您的设备，您的数据：** 您可以在任何您想要的地方运行网关（Mac、Linux、VPS）并保留
  workspace + 会话记录本地。
- **真实渠道，而非网络沙箱：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/等，
  以及在受支持平台上的移动语音和 Canvas。
- **模型无关：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，并支持每个代理的路由
和故障转移。
- **仅限本地选项：** 运行本地模型，这样如果您愿意，**所有数据都可以保留在您的设备上**。
- **多代理路由：** 按渠道、账户或任务划分独立的代理，每个代理都有自己的
  工作区和默认值。
- **开源且可定制：** 检查、扩展和自托管，不受供应商锁定。

文档：[Gateway](/zh/en/gateway)、[Channels](/zh/en/channels)、[Multi-agent](/zh/en/concepts/multi-agent)、
[Memory](/zh/en/concepts/memory)。

### 我刚刚设置完成，首先应该做什么？

推荐的首个项目：

- 构建一个网站（WordPress、Shopify 或一个简单的静态网站）。
- 原型化一个移动应用（大纲、界面、API 方案）。
- 整理文件和文件夹（清理、命名、标记）。
- 连接 Gmail 并自动生成摘要或跟进邮件。

它可以处理大型任务，但将其拆分为阶段并使用子代理进行并行工作时效果最佳。

### OpenClaw 的前五大日常用例是什么

日常的胜利通常看起来像：

- **个人简报：** 您关心的收件箱、日历和新闻的摘要。
- **研究和起草：** 快速研究、摘要以及电子邮件或文档的初稿。
- **提醒和跟进：** 由 cron 或心跳驱动的提醒和检查清单。
- **浏览器自动化：** 填写表单、收集数据以及重复执行网页任务。
- **跨设备协调：**从您的手机发送任务，让 Gateway 在服务器上运行它，并在聊天中取回结果。

### OpenClaw 能否帮助 SaaS 进行潜在客户开发、外联广告和博客撰写？

是的，适用于**研究、资格筛选和起草**。它可以扫描网站、建立候选名单、总结潜在客户，并撰写外联或广告文案草稿。

对于**推广或广告投放**，请保持人工参与。避免垃圾信息，遵守当地法律和
平台政策，并在发送前审核所有内容。最安全的模式是让
OpenClaw 起草，然后由您批准。

文档：[安全](/zh/en/gateway/security)。

### 与 Claude Code 相比，在 Web 开发方面有哪些优势

OpenClaw 是一个**个人助手**和协调层，并非 IDE 的替代品。如果你需要在代码仓库内部进行最快的直接编码循环，请使用 Claude Code 或 Codex。当你需要持久的记忆、跨设备访问和工具编排时，请使用 OpenClaw。

优点：

- **跨会话的持久化内存 + 工作区**
- **多平台访问**（WhatsApp、Telegram、TUI、WebChat）
- **工具编排**（浏览器、文件、调度、hooks）
- **常驻网关**（在 VPS 上运行，从任何地方交互）
- **节点**，用于本地浏览器/屏幕/摄像头/执行

展示: [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

## 技能与自动化

### 如何在保持仓库干净的情况下自定义技能

使用托管覆盖而不是编辑仓库副本。将您的更改放入 `~/.openclaw/skills/<name>/SKILL.md`（或通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加文件夹）。优先级为 `<workspace>/skills` > `~/.openclaw/skills` > bundled，因此托管覆盖无需触及 git 即可获胜。只有值得上游提交的编辑才应保留在仓库中并作为 PR 发出。

### 我可以从自定义文件夹加载技能吗

是的。可以通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加额外的目录（优先级最低）。默认优先级保持为：`<workspace>/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`。`clawhub` 默认安装到 `./skills`，OpenClaw 将其视为 `<workspace>/skills`。

### 我如何为不同的任务使用不同的模型

目前支持的模式如下：

- **Cron jobs**：隔离的作业可以针对每个作业设置 `model` 覆盖。
- **子代理**：将任务路由到具有不同默认模型的独立代理。
- **按需切换**：使用 `/model` 随时切换当前会话的模型。

请参阅 [Cron jobs](/zh/en/automation/cron-jobs)、[Multi-Agent Routing](/zh/en/concepts/multi-agent) 和 [Slash commands](/zh/en/tools/slash-commands)。

### 机器人在执行繁重任务时卡住了，如何卸载这些任务？

对长时间运行或并行任务使用**子代理**。子代理在自己的会话中运行，返回摘要，并保持主聊天响应。

让您的机器人“为此任务生成一个子代理”或使用 `/subagents`。
在聊天中使用 `/status` 查看网关当前正在做什么（以及它是否繁忙）。

Token 提示：长任务和子代理都会消耗 Token。如果担心成本，请通过 `agents.defaults.subagents.model` 为子代理设置更便宜的模型。

文档：[Sub-agents](/zh/en/tools/subagents)。

### Discord 上线程绑定的子代理会话是如何工作的

使用线程绑定。您可以将 Discord 线程绑定到子代理或会话目标，以便该线程中的后续消息保持在该绑定的会话上。

基本流程：

- 使用 `thread: true` 配合 `sessions_spawn` 生成（并可选择使用 `mode: "session"` 进行持续跟进）。
- 或者使用 `/focus <target>` 手动绑定。
- 使用 `/agents` 检查绑定状态。
- 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 来控制自动失去焦点。
- 使用 `/unfocus` 分离线程。

所需配置：

- 全局默认值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
- Discord 覆盖设置：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
- 生成时自动绑定：设置 `channels.discord.threadBindings.spawnSubagentSessions: true`。

文档：[Sub-agents](/zh/en/tools/subagents)、[Discord](/zh/en/channels/discord)、[Configuration Reference](/zh/en/gateway/configuration-reference)、[Slash commands](/zh/en/tools/slash-commands)。

### Cron 或提醒未触发，我应该检查什么？

Cron 在 Gateway 进程内运行。如果 Gateway 没有持续运行，预定的作业将不会执行。

检查清单：

- 确认 cron 已启用 (`cron.enabled`) 且 `OPENCLAW_SKIP_CRON` 未设置。
- 检查 Gateway 是否全天候运行（无休眠/重启）。
- 验证作业的时区设置（`--tz` vs 主机时区）。

调试：

```bash
openclaw cron run <jobId> --force
openclaw cron runs --id <jobId> --limit 50
```

文档：[Cron jobs](/zh/en/automation/cron-jobs), [Cron vs Heartbeat](/zh/en/automation/cron-vs-heartbeat)。

### 如何在 Linux 上安装技能

使用 **ClawHub** (CLI) 或将技能放入工作区。macOS 技能 UI 在 Linux 上不可用。
在 [https://clawhub.com](https://clawhub.com) 浏览技能。

安装 ClawHub CLI（选择一个包管理器）：

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

### OpenClaw 可以按计划运行任务或在后台连续运行吗？

是的。使用 Gateway 调度器：

- **Cron jobs** 用于计划或重复性任务（在重启后持续存在）。
- “主会话”周期性检查的 **心跳**。
- **独立作业**，适用于发布摘要或发送到聊天的自主代理。

文档：[Cron jobs](/zh/en/automation/cron-jobs)、[Cron vs Heartbeat](/zh/en/automation/cron-vs-heartbeat)、[Heartbeat](/zh/en/gateway/heartbeat)。

### 我可以在 Linux 上运行仅限 Apple macOS 的技能吗？

不能直接运行。macOS 技能受 `metadata.openclaw.os` 以及所需二进制文件的限制，并且只有在 **Gateway 主机** 上符合资格时，这些技能才会出现在系统提示词中。在 Linux 上，除非您覆盖限制条件，否则 `darwin` 专属技能（如 `apple-notes`、`apple-reminders`、`things-mac`）将无法加载。

你有三种受支持的模式：

**选项 A - 在 Mac 上运行网关（最简单）。**
在存在 macOS 二进制文件的地方运行网关，然后从 Linux 通过[远程模式](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere)或 Tailscale 进行连接。技能可以正常加载，因为网关主机是 macOS。

**选项 B - 使用 macOS 节点（无 SSH）。**
在 Linux 上运行 Gateway，配对一个 macOS 节点（菜单栏应用），并在 Mac 上将 **节点运行命令** 设置为“始终询问”或“始终允许”。当节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为可用。代理通过 `nodes` 工具运行这些技能。如果您选择“始终询问”，在提示中批准“始终允许”会将该命令添加到允许列表中。

**选项 C - 通过 SSH 代理 macOS 二进制文件（高级）。**
将 Gateway 保留在 Linux 上，但使所需的 CLI 二进制文件解析为在 Mac 上运行的 SSH 封装程序。然后覆盖技能以允许 Linux，使其保持可用状态。

1. 为二进制文件创建一个 SSH 封装器（示例：Apple Notes 使用 `memo`）：

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

4. 启动一个新会话，以便刷新技能快照。

### 你们有 Notion 或 HeyGen 集成吗

目前暂未内置。

选项：

- **自定义技能/插件：** 最适合可靠的API访问（Notion/HeyGen都提供API）。
- **浏览器自动化：** 无需代码即可工作，但速度较慢且较不稳定。

如果您希望为每个客户端保留上下文（代理机构工作流），一个简单的模式是：

- 每个客户端一个 Notion 页面（上下文 + 偏好设置 + 当前工作）。
- 请代理在会话开始时获取该页面。

如果您需要原生集成，请提交功能请求或构建一个针对这些 API 的技能。

安装技能：

```bash
clawhub install <skill-slug>
clawhub update --all
```

ClawHub 会安装到您当前目录下的 `./skills` 中（或者回退到您配置的 OpenClaw 工作区）；OpenClaw 在下一次会话中会将其视为 `<workspace>/skills`。若要在代理之间共享技能，请将它们放置在 `~/.openclaw/skills/<name>/SKILL.md` 中。某些技能需要通过 Homebrew 安装的二进制文件；在 Linux 上这意味着 Linuxbrew（请参阅上面的 Homebrew Linux FAQ 条目）。参见 [Skills](/zh/en/tools/skills) 和 [ClawHub](/zh/en/tools/clawhub)。

### 如何安装 Chrome 扩展程序以接管浏览器

使用内置安装程序，然后在 Chrome 中加载解压后的扩展：

```bash
openclaw browser extension install
openclaw browser extension path
```

然后 Chrome → `chrome://extensions` → 启用“开发者模式” → “加载已解压的扩展程序” → 选择该文件夹。

完整指南（包括远程网关 + 安全说明）：[Chrome 扩展程序](/zh/en/tools/chrome-extension)

如果 Gateway 运行在与 Chrome 相同的机器上（默认设置），您通常**不需要**任何额外的配置。
如果 Gateway 运行在其他地方，请在浏览器机器上运行一个节点主机，以便 Gateway 可以代理浏览器操作。
您仍然需要在您想要控制的标签页上点击扩展按钮（它不会自动附加）。

## 沙箱和内存

### 有专门关于沙箱隔离的文档吗

是的。请参阅 [沙箱隔离](/zh/en/gateway/sandboxing)。有关 Docker 特定设置（Docker 中的完整网关或沙箱镜像），请参阅 [Docker](/zh/en/install/docker)。

### Docker 感觉受限，我如何启用完整功能？

默认镜像优先考虑安全性，并以 `node` 用户身份运行，因此它
不包含系统软件包、Homebrew 或捆绑的浏览器。如需更完整的设置：

- 使用 `OPENCLAW_HOME_VOLUME` 持久化 `/home/node`，以便缓存能够保留。
- 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 将系统依赖项烘焙到镜像中。
- 通过捆绑的 CLI 安装 Playwright 浏览器：
  `node /app/node_modules/playwright-core/cli.js install chromium`
- 设置 `PLAYWRIGHT_BROWSERS_PATH` 并确保路径被持久化。

文档：[Docker](/zh/en/install/docker)、[Browser](/zh/en/tools/browser)。

**我可以保持私信私密，但将群组公开为一个代理的沙盒环境吗**

是的 - 如果您的私有流量是 **DMs** 而您的公共流量是 **groups**。

使用 `agents.defaults.sandbox.mode: "non-main"`，以便群组/频道会话（非主密钥）在 Docker 中运行，而主 DM 会话保持在主机上。然后通过 `tools.sandbox.tools` 限制沙盒会话中可用的工具。

设置演练 + 示例配置：[群组：个人私信 + 公共群组](/zh/en/channels/groups#pattern-personal-dms-public-groups-single-agent)

关键配置参考：[网关配置](/zh/en/gateway/configuration#agentsdefaultssandbox)

### 如何将主机文件夹挂载到沙箱中

将 `agents.defaults.sandbox.docker.binds` 设置为 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全局 + 每个代理的绑定会合并；当 `scope: "shared"` 时，每个代理的绑定将被忽略。对于任何敏感内容，请使用 `:ro`，并记住绑定会绕过沙箱文件系统隔离。有关示例和安全说明，请参阅 [沙箱隔离](/zh/en/gateway/sandboxing#custom-bind-mounts) 和 [沙箱 vs 工具策略 vs 提权](/zh/en/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。

### 内存如何工作

OpenClaw 内存只是代理工作区中的 Markdown 文件：

- `memory/YYYY-MM-DD.md` 中的每日笔记
- `MEMORY.md` 中的精选长期笔记（仅限主/私有会话）

OpenClaw 还会运行 **静默预压缩内存刷新**，以提醒模型在自动压缩之前写入持久化笔记。这仅在工作区可写时运行（只读沙箱会跳过此步骤）。请参阅 [Memory](/zh/en/concepts/memory)。

### 记忆总是忘记东西 我要怎么让它记住

让机器人**把事实写入记忆**。长期笔记属于 `MEMORY.md`，
短期上下文则放入 `memory/YYYY-MM-DD.md`。

这是我们仍在改进的一个领域。提醒模型存储记忆会有所帮助；它会知道该怎么做。如果它一直忘记，请验证 Gateway 在每次运行时是否使用的是同一个工作区。

文档：[内存](/zh/en/concepts/memory)，[Agent 工作区](/zh/en/concepts/agent-workspace)。

### 语义记忆搜索是否需要 OpenAI API 密钥

仅当您使用 **OpenAI 嵌入 (embeddings)** 时。Codex OAuth 涵盖聊天/补全，并且**不**授予嵌入访问权限，因此**使用 Codex 登录（OAuth 或 Codex CLI 登录）** 对语义记忆搜索没有帮助。OpenAI 嵌入仍然需要一个真实的 API 密钥 (`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`)。

如果您未显式设置提供商，当 OpenClaw 能够解析 API 密钥（身份验证配置文件、`models.providers.*.apiKey` 或环境变量）时，它会自动选择提供商。如果解析出 OpenAI 密钥，它优先选择 OpenAI；否则，如果解析出 Gemini 密钥，则选择 Gemini，接着是 Voyage，然后是 Mistral。如果没有可用的远程密钥，内存搜索将保持禁用状态，直到您对其进行配置。如果您配置并存在本地模型路径，OpenClaw 优先选择 `local`。当您显式设置 `memorySearch.provider = "ollama"` 时，支持 Ollama。

如果您希望保持在本地，请设置 `memorySearch.provider = "local"`（也可以选择性地设置
`memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，请设置
`memorySearch.provider = "gemini"` 并提供 `GEMINI_API_KEY`（或
`memorySearch.remote.apiKey`）。我们支持 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本地** 嵌入
模型 - 有关设置详细信息，请参阅 [Memory](/zh/en/concepts/memory)。

### 内存是否永久保留？有什么限制？

Memory 文件存储在磁盘上，会一直保留，直到你删除它们。限制在于你的存储空间，而不是模型。**会话上下文**仍然受到模型上下文窗口的限制，因此长对话可能会被压缩或截断。这就是存在内存搜索的原因——它只将相关部分拉回上下文中。

文档：[Memory](/zh/en/concepts/memory)，[Context](/zh/en/concepts/context)。

## 磁盘上的文件位置

### 所有与 OpenClaw 一起使用的数据是否都保存在本地？

不 - **OpenClaw 的状态是本地存储的**，但 **外部服务仍然可以看到你发送给它们的内容**。

- **默认本地化：** 会话、内存文件、配置和工作区位于 Gateway 主机上
  (`~/.openclaw` + 你的工作区目录)。
- **出于必要性使用远程：** 您发送给模型提供商（Anthropic/OpenAI/等）的消息会发送至
  他们的 API，以及聊天平台（WhatsApp/Telegram/Slack/等）将消息数据存储在它们的
  服务器上。
- **您控制占用空间：** 使用本地模型可以将提示保留在您的机器上，但渠道
  流量仍然通过该频道的服务器。

相关：[Agent workspace](/zh/en/concepts/agent-workspace)、[Memory](/zh/en/concepts/memory)。

### OpenClaw 将其数据存储在哪里

所有内容都在 `$OPENCLAW_STATE_DIR` 下（默认：`~/.openclaw`）：

| 路径                                                            | 用途                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主配置 (JSON5)                                                |
| `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 旧版 OAuth 导入（首次使用时复制到 auth profiles 中）       |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Auth profiles (OAuth, API keys, 以及可选的 `keyRef`/`tokenRef`)  |
| `$OPENCLAW_STATE_DIR/secrets.json`                              | 可选的基于文件的 secret payload，用于 `file` SecretRef providers |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 旧版兼容性文件（已清理静态 `api_key` 条目）      |
| `$OPENCLAW_STATE_DIR/credentials/`                              | Provider 状态 (例如 `whatsapp/<accountId>/creds.json`)            |
| `$OPENCLAW_STATE_DIR/agents/`                                   | 每个代理的状态 (agentDir + sessions)                              |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 对话历史和状态 (每个代理)                           |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 会话元数据 (每个代理)                                       |

旧版单代理路径：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）。

您的 **workspace**（AGENTS.md, memory files, skills, etc.）是独立的，并通过 `agents.defaults.workspace` 进行配置（默认：`~/.openclaw/workspace`）。

### AGENTSmd SOULmd USERmd MEMORYmd 应该放在哪里

这些文件位于 **agent workspace** 中，而不是 `~/.openclaw`。

- **工作区（每个代理）**：`AGENTS.md`，`SOUL.md`，`IDENTITY.md`，`USER.md`，
  `MEMORY.md`（或 `memory.md`），`memory/YYYY-MM-DD.md`，可选 `HEARTBEAT.md`。
- **状态目录 (`~/.openclaw`)**：配置、凭证、认证配置文件、会话、日志，
  和共享技能 (`~/.openclaw/skills`)。

默认工作区为 `~/.openclaw/workspace`，可通过以下方式配置：

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

如果机器人重启后“忘记”了信息，请确认 Gateway 在每次启动时使用的是同一个
工作区（并且请记住：远程模式使用的是 **gateway 主机** 的
工作区，而不是你本地的笔记本电脑）。

提示：如果您希望持久化某种行为或偏好，请让机器人将其**写入 AGENTS.md 或 MEMORY.md**，而不是依赖聊天记录。

请参阅 [Agent workspace](/zh/en/concepts/agent-workspace) 和 [Memory](/zh/en/concepts/memory)。

### 推荐的备份策略是什么？

将您的 **agent workspace** 放在一个 **私有** git 仓库中，并将其备份到某个私有位置（例如 GitHub 私有仓库）。这会捕获 memory + AGENTS/SOUL/USER 文件，并允许您稍后恢复助手的“思维”。

请**勿**提交 `~/.openclaw` 下的任何内容（凭据、会话、令牌或加密的秘密负载）。
如果您需要完全恢复，请分别备份工作区和状态目录
（请参阅上面的迁移问题）。

文档：[Agent workspace](/zh/en/concepts/agent-workspace)。

### 我如何彻底卸载 OpenClaw

请参阅专用指南：[卸载](/zh/en/install/uninstall)。

### 代理可以在工作区之外工作吗

是的。工作区是**默认的 cwd** 和内存锚点，而不是一个硬沙箱。
相对路径在工作区内部解析，但绝对路径可以访问其他
主机位置，除非启用了沙箱功能。如果您需要隔离，请使用
[`agents.defaults.sandbox`](/zh/en/gateway/sandboxing) 或每代理的沙箱设置。如果您
希望某个仓库成为默认工作目录，请将该代理的
`workspace` 指向仓库根目录。OpenClaw 仓库只是源代码；请保持
工作区独立，除非您有意让代理在其中工作。

示例（以仓库作为默认工作目录）：

```json5
{
  agents: {
    defaults: {
      workspace: "~/Projects/my-repo",
    },
  },
}
```

### 我在远程模式下，会话存储在哪里

会话状态由 **网关主机** 拥有。如果您处于远程模式，您关注的会话存储位于远程计算机上，而不是您的本地笔记本电脑。请参阅[会话管理](/zh/en/concepts/session)。

## 配置基础

### 配置是什么格式的？它在哪里？

OpenClaw 从 `$OPENCLAW_CONFIG_PATH`（默认值：`~/.openclaw/openclaw.json`）读取可选的 **JSON5** 配置：

```
$OPENCLAW_CONFIG_PATH
```

如果文件缺失，它将使用相对安全的默认值（包括默认工作区 `~/.openclaw/workspace`）。

### 我设置了 gatewaybind lan 或 tailnet，现在没有监听任何内容，UI 显示未授权

非环回绑定 **需要认证**。配置 `gateway.auth.mode` + `gateway.auth.token`（或使用 `OPENCLAW_GATEWAY_TOKEN`）。

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

- `gateway.remote.token` / `.password` 本身**不**启用本地网关身份验证。
- 仅当 `gateway.auth.*` 未设置时，本地调用路径才可以将 `gateway.remote.*` 作为回退选项。
- 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置且未解析，解析将以失败关闭（无远程回退掩码）。
- 控制 UI 通过 `connect.params.auth.token`（存储在 app/UI 设置中）进行身份验证。请避免将令牌放入 URL 中。

### 为什么我现在在本地主机上需要一个令牌

OpenClaw 默认强制执行令牌身份验证，包括本地回环。如果未配置令牌，网关启动时会自动生成一个并将其保存到 `gateway.auth.token`，因此**本地 WS 客户端必须进行身份验证**。这会阻止其他本地进程调用网关。

如果你**真的**想要开放回环，请在你的配置中显式设置 `gateway.auth.mode: "none"`。Doctor 可以随时为你生成一个令牌：`openclaw doctor --generate-gateway-token`。

### 更改配置后是否需要重启

Gateway 会监视配置并支持热重载：

- `gateway.reload.mode: "hybrid"` (默认): 热应用安全更改，关键更改需重启
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
- `random`：轮换有趣/季节性标语（默认行为）。
- 如果您完全不想要横幅，请设置 env `OPENCLAW_HIDE_BANNER=1`。

### 我如何启用网页搜索和网页抓取

`web_fetch` 无需 API 密钥即可运行。`web_search` 需要为您选定的提供商（Brave、Gemini、Grok、Kimi 或 Perplexity）提供密钥。
**建议：** 运行 `openclaw configure --section web` 并选择一个提供商。
环境替代方案：

- Brave：`BRAVE_API_KEY`
- Gemini：`GEMINI_API_KEY`
- Grok：`XAI_API_KEY`
- Kimi: `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
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

注意事项：

- 如果您使用允许列表，请添加 `web_search`/`web_fetch` 或 `group:web`。
- `web_fetch` 默认处于启用状态（除非被明确禁用）。
- 守护进程从 `~/.openclaw/.env` （或服务环境）读取环境变量。

文档：[Web 工具](/zh/en/tools/web)。

### 我如何跨设备运行一个带有专用工作程序的中心网关

常见模式是 **一个网关**（例如树莓派）加上 **节点** 和 **代理**：

- **网关（中心）：** 拥有通道（Signal/WhatsApp）、路由和会话。
- **节点（设备）：** Mac/iOS/Android 作为外设连接并暴露本地工具 (`system.run`, `canvas`, `camera`)。
- **代理（工作器）：** 用于特殊角色的独立大脑/工作区（例如 "Hetzner ops"、"Personal data"）。
- **子代理：** 当您需要并行处理时，从主代理生成后台工作。
- **TUI：** 连接到 Gateway 并切换代理/会话。

文档：[节点](/zh/en/nodes)、[远程访问](/zh/en/gateway/remote)、[多代理路由](/zh/en/concepts/multi-agent)、[子代理](/zh/en/tools/subagents)、[TUI](/zh/en/web/tui)。

### OpenClaw 浏览器可以无头模式运行吗？

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

默认为 `false` (有头模式)。无头模式在某些网站上更有可能触发反机器人检查。请参阅 [浏览器](/zh/en/tools/browser)。

Headless 使用**相同的 Chromium 引擎**，适用于大多数自动化操作（表单、点击、抓取、登录）。主要区别如下：

- 没有可见的浏览器窗口（如果需要视觉效果，请使用截图）。
- 某些网站对无头模式下的自动化更为严格（验证码、反机器人）。
  例如，X/Twitter 经常阻止无头会话。

### 如何使用 Brave 进行浏览器控制

将 `browser.executablePath` 设置为您的 Brave 二进制文件（或任何基于 Chromium 的浏览器）并重启 Gateway。
有关完整的配置示例，请参阅 [Browser](/zh/en/tools/browser#use-brave-or-another-chromium-based-browser)。

## 远程网关和节点

### 命令如何在 Telegram、网关和节点之间传播

Telegram 消息由 **gateway**（网关）处理。网关运行代理，并且仅在需要节点工具时才通过 **Gateway WebSocket**（网关 WebSocket）调用节点：

Telegram → 网关 → 代理 → `node.*` → 节点 → 网关 → Telegram

节点看不到入站提供商流量；它们只接收节点 RPC 调用。

### 如果网关是远程托管的，我的代理如何访问我的计算机

简短回答：**将你的计算机配对为一个节点**。Gateway 运行在其他地方，但它可以通过 Gateway WebSocket 调用你本地计算机上的 `node.*` 工具（屏幕、摄像头、系统）。

典型设置：

1. 在常驻主机（VPS/家庭服务器）上运行 Gateway。
2. 将网关主机和您的计算机置于同一个 tailnet 上。
3. 确保 Gateway WS 可访问（通过 tailnet 绑定或 SSH 隧道）。
4. 在本地打开 macOS 应用并以 **Remote over SSH** 模式（或直接通过 tailnet）连接
   以便它可以注册为节点。
5. 在网关上批准节点：

   ```bash
   openclaw devices list
   openclaw devices approve <requestId>
   ```

不需要单独的 TCP 网桥；节点通过网关 WebSocket 进行连接。

安全提醒：配对 macOS 节点允许 `system.run` 在该机器上。请仅配对您信任的设备，并查看[安全](/zh/en/gateway/security)。

文档：[节点](/zh/en/nodes)、[网关协议](/zh/en/gateway/protocol)、[macOS 远程模式](/zh/en/platforms/mac/remote)、[安全性](/zh/en/gateway/security)。

### Tailscale 已连接但我没有收到回复，现在该怎么办

检查基本项：

- Gateway 正在运行：`openclaw gateway status`
- 网关健康状态：`openclaw status`
- 通道健康度：`openclaw channels status`

然后验证身份验证和路由：

- 如果您使用 Tailscale Serve，请确保 `gateway.auth.allowTailscale` 设置正确。
- 如果您通过 SSH 隧道连接，请确认本地隧道已启动并指向正确的端口。
- 确认您的允许列表（私信或群组）包含您的账户。

文档：[Tailscale](/zh/en/gateway/tailscale)、[远程访问](/zh/en/gateway/remote)、[频道](/zh/en/channels)。

### 两个 OpenClaw 实例可以互相通信吗 本地 VPS

是的。虽然内置没有“机器人对机器人”的桥接，但你可以通过几种可靠的方式连接它们：

**最简单的方法：** 使用两个机器人都能访问的普通聊天频道（Telegram/Slack/WhatsApp）。
让机器人 A 向机器人 B 发送消息，然后让机器人 B 像往常一样回复。

**CLI 桥接（通用）：** 运行一个脚本，使用 `openclaw agent --message ... --deliver` 调用另一个网关，目标是另一个机器人监听的聊天。如果一个机器人位于远程 VPS 上，请通过 SSH/Tailscale 将您的 CLI 指向该远程网关（请参阅 [远程访问](/zh/en/gateway/remote)）。

示例模式（从可以访问目标 Gateway 的机器上运行）：

```bash
openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
```

提示：添加一个防护措施，以防止两个机器人无限循环（仅限提及、频道白名单，或“不回复机器人消息”规则）。

文档：[远程访问](/zh/en/gateway/remote)、[Agent CLI](/zh/en/cli/agent)、[Agent send](/zh/en/tools/agent-send)。

### 我是否需要为多个代理使用独立的VPS

不。一个 Gateway 可以托管多个代理，每个代理都有自己的工作区、模型默认值和路由。这是常规的设置方式，比为每个代理运行一个 VPS 更便宜、更简单。

仅在需要严格隔离（安全边界）或您不想共享差异很大的配置时，才使用独立的 VPS。否则，请保留一个 Gateway，并使用多个代理或子代理。

### 在个人笔记本电脑上使用节点而不是通过VPS进行SSH有什么好处吗

是的——节点是从远程网关访问您的笔记本电脑的一等方式，并且它们提供的不仅仅是 shell 访问权限。网关运行在 macOS/Linux（Windows 通过 WSL2）上，并且轻量级（一台小型 VPS 或树莓派级别的盒子即可；4 GB RAM 已绰绰有余），因此常见的设置是一台始终开启的主机加上您的笔记本电脑作为节点。

- **无需入站 SSH。** 节点主动连接到 Gateway WebSocket 并使用设备配对。
- **更安全的执行控制。** `system.run` 受该笔记本电脑上的节点允许列表/批准限制。
- **更多设备工具。** 除了 `system.run` 之外，节点还公开 `canvas`、`camera` 和 `screen`。
- **本地浏览器自动化。** 将 Gateway 保留在 VPS 上，但在本地运行 Chrome 并中继控制
  配合 Chrome 扩展程序 + 笔记本电脑上的节点主机使用。

SSH 适合临时的 shell 访问，但对于持续的代理工作流和设备自动化，节点更为简单。

文档：[节点](/zh/en/nodes)、[节点 CLI](/zh/en/cli/nodes)、[Chrome 扩展](/zh/en/tools/chrome-extension)。

### 我应该安装在第二台笔记本电脑上还是仅仅添加一个节点

如果第二台笔记本电脑只需要 **本地工具**（屏幕/摄像头/执行），请将其添加为 **节点**。这样可以保持单个 Gateway，并避免重复配置。本地节点工具目前仅支持 macOS，但我们计划将其扩展到其他操作系统。

仅在需要**硬隔离**或两个完全独立的机器人时，才安装第二个网关。

文档：[节点](/zh/en/nodes)、[节点 CLI](/zh/en/cli/nodes)、[多网关](/zh/en/gateway/multiple-gateways)。

### 节点是否运行网关服务

不。除非你有意运行隔离的配置文件（参见 [Multiple gateways](/zh/en/gateway/multiple-gateways)），否则每台主机应只运行**一个网关**。节点是连接到网关的外设（iOS/Android 节点，或菜单栏应用程序中的 macOS “节点模式”）。对于无头节点主机和 CLI 控制，请参阅 [Node host CLI](/zh/en/cli/node)。

对于 `gateway`、`discovery` 和 `canvasHost` 的更改，需要完全重启。

### 是否有 API RPC 方式来应用配置

是的。`config.apply` 会验证并写入完整配置，并作为操作的一部分重启网关。

### configapply 清除了我的配置，如何恢复并避免这种情况

`config.apply` 会替换**整个配置**。如果您发送部分对象，其他所有内容都将被移除。

恢复：

- 从备份恢复（git 或复制的 `~/.openclaw/openclaw.json`）。
- 如果您没有备份，请重新运行 `openclaw doctor` 并重新配置通道/模型。
- 如果这是意外情况，请提交错误报告并附上您已知的最后配置或任何备份。
- 本地编码代理通常可以从日志或历史记录中重建有效的配置。

避免这种情况：

- 对于小的更改，请使用 `openclaw config set`。
- 使用 `openclaw configure` 进行交互式编辑。

文档：[Config](/zh/en/cli/config), [Configure](/zh/en/cli/configure), [Doctor](/zh/en/gateway/doctor)。

### 首次安装的最小合理配置是什么

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

这将设置您的工作区并限制谁可以触发机器人。

### 如何在 VPS 上设置 Tailscale 并从我的 Mac 连接

最低步骤：

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

如果您不使用 SSH 却想要控制 UI，请在 VPS 上使用 Tailscale Serve：

```bash
openclaw gateway --tailscale serve
```

这将使网关绑定到回环地址并通过 Tailscale 暴露 HTTPS。请参阅 [Tailscale](/zh/en/gateway/tailscale)。

### 如何将 Mac 节点连接到远程网关 Tailscale Serve

Serve 暴露了 **Gateway Control UI + WS**。节点连接到同一个 Gateway WS 端点。

推荐设置：

1. **确保 VPS 和 Mac 处于同一个 tailnet 中。**
2. **在远程模式下使用 macOS 应用**（SSH 目标可以是 tailnet 主机名）。
   应用程序将隧道传输 Gateway 端口并作为节点进行连接。
3. **批准节点** 在网关上：

   ```bash
   openclaw devices list
   openclaw devices approve <requestId>
   ```

文档：[Gateway 协议](/zh/en/gateway/protocol)，[发现机制](/zh/en/gateway/discovery)，[macOS 远程模式](/zh/en/platforms/mac/remote)。

## 环境变量和 .env 加载

### OpenClaw 如何加载环境变量

OpenClaw 从父进程（shell、launchd/systemd、CI 等）读取环境变量，并额外加载：

- 从当前工作目录加载 `.env`
- 来自 `~/.openclaw/.env` （也称 `$OPENCLAW_STATE_DIR/.env`）的全局回退 `.env`

`.env` 文件都不会覆盖现有的环境变量。

您还可以在配置中定义内联环境变量（仅当进程环境变量中缺失时才应用）：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

关于完整的优先级和来源，请参阅 [/environment](/zh/en/help/environment)。

### 我通过服务启动了 Gateway，环境变量消失了，现在怎么办？

两种常见的修复方法：

1. 将缺失的密钥放入 `~/.openclaw/.env` 中，这样即使服务未继承你的 shell 环境，也能获取到它们。
2. 启用 shell 导入（选择性便捷功能）：

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

这会运行你的登录 shell 并仅导入缺失的预期键（从不覆盖）。等效的环境变量：
`OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

### 我设置了 COPILOTGITHUBTOKEN 但模型状态显示 Shell env 关闭 为什么

`openclaw models status` 报告是否启用了 **shell env import**（Shell 环境导入）。"Shell env: off" **并不** 意味着您的环境变量丢失——它只是表示 OpenClaw 不会自动加载您的登录 shell。

如果 Gateway 作为服务（launchd/systemd）运行，它将不会继承您的 shell
环境。通过执行以下操作之一来修复此问题：

1. 将令牌放入 `~/.openclaw/.env` 中：

   ```
   COPILOT_GITHUB_TOKEN=...
   ```

2. 或者启用 shell 导入 (`env.shellEnv.enabled: true`)。
3. 或者将其添加到你的配置 `env` 块中（仅在缺失时适用）。

然后重启网关并重新检查：

```bash
openclaw models status
```

Copilot 令牌从 `COPILOT_GITHUB_TOKEN` 读取（也包括 `GH_TOKEN` / `GITHUB_TOKEN`）。
请参阅 [/concepts/model-providers](/zh/en/concepts/model-providers) 和 [/environment](/zh/en/help/environment)。

## 会话和多个聊天

### 如何开始一个新的对话

将 `/new` 或 `/reset` 作为独立消息发送。参见 [会话管理](/zh/en/concepts/session)。

### 如果我不发送新的消息，会话是否会自动重置？

是的。会话在 `session.idleMinutes`（默认为 **60**）后过期。**下一条**消息将为该聊天密钥启动一个新的会话 ID。这不会删除记录 - 它只是开始一个新的会话。

```json5
{
  session: {
    idleMinutes: 240,
  },
}
```

### 有没有办法组建一个 OpenClaw 实例团队，由一个 CEO 和多个代理组成？

是的，通过 **多代理路由** 和 **子代理**。您可以创建一个协调器
代理和多个具有各自工作空间和模型的代理。

话虽如此，这最好被视为一种**有趣的实验**。它非常消耗 token，而且通常不如使用一个带有多个独立会话的 bot 高效。我们设想的典型模式是：一个你与之对话的 bot，利用不同的会话进行并行工作。该 bot 还可以根据需要生成子代理。

文档：[Multi-agent routing](/zh/en/concepts/multi-agent), [Sub-agents](/zh/en/tools/subagents), [Agents CLI](/zh/en/cli/agents)。

### 为什么上下文会在任务中途被截断？如何防止这种情况发生？

会话上下文受模型窗口限制。长对话、大型工具输出或大量文件可能会触发压缩或截断。

有效措施：

- 让机器人总结当前状态并将其写入文件。
- 在执行长时间任务之前使用 `/compact`，在切换主题时使用 `/new`。
- 将重要上下文保存在工作区中，并要求机器人将其读回。
- 使用子代理处理耗时或并行任务，以便主对话保持精简。
- 如果这种情况经常发生，请选择一个具有更大上下文窗口的模型。

### 如何完全重置 OpenClaw 但保持其已安装状态

使用重置命令：

```bash
openclaw reset
```

非交互式完全重置：

```bash
openclaw reset --scope full --yes --non-interactive
```

然后重新运行入门流程：

```bash
openclaw onboard --install-daemon
```

注意：

- 如果向导检测到现有配置，还会提供 **重置** 选项。请参阅 [向导](/zh/en/start/wizard)。
- 如果您使用了配置文件（`--profile` / `OPENCLAW_PROFILE`），请重置每个状态目录（默认为 `~/.openclaw-<profile>`）。
- 开发者重置：`openclaw gateway --dev --reset`（仅限开发者；清除开发者配置 + 凭证 + 会话 + 工作区）。

### 我遇到了上下文过大的错误，如何重置或压缩

使用其中一种：

- **紧凑**（保留对话但总结较早的轮次）：

  ```
  /compact
  ```

  或 `/compact <instructions>` 来指导摘要。

- **重置**（为相同的聊天密钥提供新的会话 ID）：

  ```
  /new
  /reset
  ```

如果这种情况持续发生：

- 启用或调整 **会话修剪** (`agents.defaults.contextPruning`) 以修剪旧工具输出。
- 使用具有更大上下文窗口的模型。

文档：[压缩](/zh/en/concepts/compaction)、[会话修剪](/zh/en/concepts/session-pruning)、[会话管理](/zh/en/concepts/session)。

### 为什么我看到“LLM request rejected: messages.content.tool_use.input field required”？

这是一个提供程序验证错误：模型发出了 `tool_use` 块，但没有包含所需的
`input`。这通常意味着会话历史已过时或损坏（通常发生在长对话之后
或工具/架构变更时）。

修复：使用 `/new` 开启一个新会话（独立消息）。

### 为什么我每 30 分钟会收到心跳消息

心跳默认每 **30分钟** 运行一次。可以调整或禁用它们：

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

如果 `HEARTBEAT.md` 存在但实际上是空的（只有空行和像 `# Heading` 这样的 markdown 标题），OpenClaw 会跳过心跳运行以节省 API 调用。如果文件丢失，心跳仍然运行，模型决定做什么。

每个代理的覆盖使用 `agents.list[].heartbeat`。文档：[Heartbeat](/zh/en/gateway/heartbeat)。

### 我需要将机器人账号添加到 WhatsApp 群组吗

不需要。OpenClaw 在**您自己的账号**上运行，因此如果您在该群组中，OpenClaw 就可以看到它。
默认情况下，群组回复会被阻止，直到您允许发件人 (`groupPolicy: "allowlist"`)。

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

### 如何获取 WhatsApp 群组的 JID

选项 1（最快）：查看日志并在群组中发送一条测试消息：

```bash
openclaw logs --follow --json
```

查找以 `@g.us` 结尾的 `chatId`（或 `from`），例如：
`1234567890-1234567890@g.us`。

选项 2（如果已配置/列入允许列表）：从配置列出组：

```bash
openclaw directory groups list --channel whatsapp
```

文档：[WhatsApp](/zh/en/channels/whatsapp)、[Directory](/zh/en/cli/directory)、[Logs](/zh/en/cli/logs)。

### 为什么 OpenClaw 不在群组中回复

两个常见原因：

- 提及 gating 已开启（默认）。你必须 @mention 机器人（或匹配 `mentionPatterns`）。
- 您配置了 `channels.whatsapp.groups` 但没有 `"*"`，并且该组未被列入允许列表。

请参阅 [Groups](/zh/en/channels/groups) 和 [Group messages](/zh/en/channels/group-messages)。

### 群组/会话是否与私信共享上下文

默认情况下，直接聊天会折叠到主会话中。群组/频道拥有自己的会话密钥，而 Telegram 主题 / Discord 线程则是独立的会话。请参阅 [群组](/zh/en/channels/groups) 和 [群组消息](/zh/en/channels/group-messages)。

### 我可以创建多少个工作空间和代理

没有硬性限制。几十个（甚至几百个）都可以，但请注意：

- **磁盘增长：** 会话和抄本位于 `~/.openclaw/agents/<agentId>/sessions/` 下。
- **Token 成本：** 更多代理意味着更多的并发模型使用。
- **运维开销：** 每个代理的身份验证配置文件、工作区和通道路由。

提示：

- 为每个智能体保留一个 **active** 工作区 (`agents.defaults.workspace`)。
- 如果磁盘空间增长，请清理旧会话（删除 JSONL 或存储条目）。
- 使用 `openclaw doctor` 来发现孤立的配置文件和配置文件不匹配。

### 我可以在 Slack 上同时运行多个机器人或聊天吗？应该如何设置？

是的。使用 **多代理路由** 来运行多个独立的代理，并通过渠道/账户/对等节点路由传入的消息。Slack 支持作为渠道，可以绑定到特定的代理。

浏览器访问虽然强大，但并非“可以做人类能做的任何事”——反机器人、验证码（CAPTCHA）和多因素认证（MFA）仍然可能阻止自动化。为了获得最可靠的浏览器控制，请在运行浏览器的机器上使用 Chrome 扩展程序中继（并将 Gateway 放置在任何位置）。

最佳实践设置：

- 常开的网关主机（VPS/Mac mini）。
- 每个角色一个代理（绑定）。
- 绑定到这些代理的 Slack 频道。
- 必要时通过扩展中继（或节点）在本地浏览器中进行。

文档：[多智能体路由](/zh/en/concepts/multi-agent)、[Slack](/zh/en/channels/slack)、
[浏览器](/zh/en/tools/browser)、[Chrome 扩展程序](/zh/en/tools/chrome-extension)、[节点](/zh/en/nodes)。

## 模型：默认设置、选择、别名、切换

### 默认模型是什么

OpenClaw 的默认模型是您设置的：

```
agents.defaults.model.primary
```

模型被引用为 `provider/model`（例如：`anthropic/claude-opus-4-6`）。如果您省略提供商，OpenClaw 目前假定 `anthropic` 作为临时弃用的回退方案——但您仍应**显式**设置 `provider/model`。

### 您推荐使用哪个模型

**推荐默认设置：** 使用您提供商堆栈中可用的最强最新一代模型。
**对于启用工具或不可信输入的代理：** 优先考虑模型强度而非成本。
**对于常规/低风险聊天：** 使用更便宜的回退模型并按代理角色进行路由。

MiniMax M2.5 有自己的文档：[MiniMax](/zh/en/providers/minimax) 和
[Local models](/zh/en/gateway/local-models)。

经验法则：在高风险工作中使用你能负担得起的**最佳模型**，而在日常聊天或摘要中使用更便宜
的模型。你可以为每个智能体路由模型，并使用子智能体来
并行处理长任务（每个子智能体都会消耗令牌）。请参阅 [Models](/zh/en/concepts/models) 和
[Sub-agents](/zh/en/tools/subagents)。

严重警告：较弱或过度量化的模型更容易受到提示词注入和不安全行为的影响。请参阅 [安全](/zh/en/gateway/security)。

更多上下文：[模型](/zh/en/concepts/models)。

### 我可以使用自托管模型（如 llama.cpp、vLLM、Ollama）吗？

是的。对于本地模型，Ollama 是最简单的路径。

最快设置：

1. 从 `https://ollama.com/download` 安装 Ollama
2. 拉取本地模型，例如 `ollama pull glm-4.7-flash`
3. 如果您也想要 Ollama Cloud，请运行 `ollama signin`
4. 运行 `openclaw onboard` 并选择 `Ollama`
5. 选择 `Local` 或 `Cloud + Local`

注意事项：

- `Cloud + Local` 为您提供 Ollama Cloud 模型以及您的本地 Ollama 模型
- 像 `kimi-k2.5:cloud` 这样的云模型不需要本地拉取
- 如需手动切换，请使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

安全提示：较小或经过大量量化的模型更容易受到提示词注入攻击。我们强烈建议任何可以使用工具的机器人使用**大型模型**。如果您仍然想使用小型模型，请启用沙盒机制和严格的工具允许列表。

文档：[Ollama](/zh/en/providers/ollama)、[本地模型](/zh/en/gateway/local-models)、
[模型提供商](/zh/en/concepts/model-providers)、[安全](/zh/en/gateway/security)、
[沙盒](/zh/en/gateway/sandboxing)。

### 如何在不删除配置的情况下切换模型

使用 **模型命令** 或仅编辑 **模型** 字段。避免完全替换配置。

安全选项：

- 在聊天中使用 `/model`（快速，每次会话）
- `openclaw models set ...` (仅更新模型配置)
- `openclaw configure --section model` (交互式)
- 在 `~/.openclaw/openclaw.json` 中编辑 `agents.defaults.model`

除非您打算替换整个配置，否则请避免使用部分对象进行 `config.apply`。
如果您确实覆盖了配置，请从备份恢复或重新运行 `openclaw doctor` 进行修复。

文档：[Models](/zh/en/concepts/models), [Configure](/zh/en/cli/configure), [Config](/zh/en/cli/config), [Doctor](/zh/en/gateway/doctor).

### OpenClaw、Flawd 和 Krill 使用什么模型

- 这些部署可能会有所不同，并且可能会随时间而变化；没有固定的提供商推荐。
- 使用 `openclaw models status` 检查每个网关上的当前运行时设置。
- 对于涉及敏感安全或启用工具的代理，请使用可用的最新一代最强模型。

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

`/model`（和 `/model list`）显示一个紧凑的编号选择器。通过数字选择：

```
/model 3
```

您也可以强制为提供程序指定特定的身份验证配置文件（每个会话）：

```
/model opus@anthropic:default
/model opus@anthropic:work
```

提示：`/model status` 显示哪个代理处于活动状态，正在使用哪个 `auth-profiles.json` 文件，以及接下来将尝试哪个身份验证配置文件。
它还会显示配置的提供商端点 (`baseUrl`) 和 API 模式 (`api`)（如果可用）。

**如何取消固定我使用 profile 设置的配置文件**

重新运行 `/model`，**不要**带 `@profile` 后缀：

```
/model anthropic/claude-opus-4-6
```

如果您想恢复默认设置，请从 `/model` 中选择（或发送 `/model <default provider/model>`）。
使用 `/model status` 确认当前激活的认证配置文件。

### 我可以在日常任务中使用 GPT 5.2，在编码时使用 Codex 5.3 吗

是的。将其中一个设为默认，并根据需要进行切换：

- **快速切换（每次会话）：** `/model gpt-5.2` 用于日常任务，`/model openai-codex/gpt-5.4` 用于使用 Codex OAuth 进行编程。
- **默认 + 切换：** 将 `agents.defaults.model.primary` 设置为 `openai/gpt-5.2`，然后在编码时切换到 `openai-codex/gpt-5.4`（反之亦然）。
- **子代理：** 将编码任务路由到具有不同默认模型的子代理。

请参阅 [Models](/zh/en/concepts/models) 和 [Slash commands](/zh/en/tools/slash-commands)。

### 为什么我会看到 Model is not allowed 然后没有回复

如果设置了 `agents.defaults.models`，它将成为 `/model` 和任何会话覆盖的**允许列表**。选择不在该列表中的模型将返回：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

该错误会在正常回复之前**返回**。修复方法：将模型添加到 `agents.defaults.models`，移除允许列表，或者从 `/model list` 中选择一个模型。

### 为什么我会看到 Unknown model minimaxMiniMaxM25

这表示 **提供商未配置** （未找到 MiniMax 提供商配置或身份验证配置文件），因此无法解析模型。针对此检测的修复包含在 **2026.1.12** 版本中（撰写时尚未发布）。

修复清单：

1. 升级到 **2026.1.12**（或从源代码运行 `main`），然后重启网关。
2. 确保 MiniMax 已配置（通过向导或 JSON），或者已拥有 MiniMax API 密钥
   存在于 env/auth 配置文件中，以便注入提供商。
3. 使用精确的模型 id（区分大小写）：`minimax/MiniMax-M2.5` 或
   `minimax/MiniMax-M2.5-highspeed`。
4. 运行：

   ```bash
   openclaw models list
   ```

   并从列表中选择（或者在聊天中 `/model list`）。

请参阅 [MiniMax](/zh/en/providers/minimax) 和 [Models](/zh/en/concepts/models)。

### 我可以将 MiniMax 作为默认模型，而将 OpenAI 用于复杂任务吗

是的。将 **MiniMax 作为默认设置**，并在需要时**按会话**切换模型。
回退机制是针对**错误**的，而非针对“困难任务”，因此请使用 `/model` 或单独的代理。

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

**选项 B：独立的代理**

- Agent A 默认：MiniMax
- Agent B 默认：OpenAI
- 按代理路由或使用 `/agent` 进行切换

文档：[模型](/zh/en/concepts/models)、[多代理路由](/zh/en/concepts/multi-agent)、[MiniMax](/zh/en/providers/minimax)、[OpenAI](/zh/en/providers/openai)。

### opus、sonnet、gpt 是内置快捷方式吗

是的。OpenClaw 附带了一些默认简写（仅当模型存在于 `agents.defaults.models` 时才适用）：

- `opus` → `anthropic/claude-opus-4-6`
- `sonnet` → `anthropic/claude-sonnet-4-6`
- `gpt` → `openai/gpt-5.4`
- `gpt-mini` → `openai/gpt-5-mini`
- `gemini` → `google/gemini-3.1-pro-preview`
- `gemini-flash` → `google/gemini-3-flash-preview`
- `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

如果您设置了同名的别名，您的值将生效。

### 如何定义/覆盖模型快捷方式别名

别名来自 `agents.defaults.models.<modelId>.alias`。示例：

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

然后 `/model sonnet`（或在支持时使用 `/<alias>`）会解析为该模型 ID。

### 如何添加来自其他提供商（如 OpenRouter 或 ZAI）的模型

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
      model: { primary: "zai/glm-5" },
      models: { "zai/glm-5": {} },
    },
  },
  env: { ZAI_API_KEY: "..." },
}
```

如果你引用了提供商/模型，但缺少所需的提供商密钥，则会收到运行时身份验证错误（例如 `No API key found for provider "zai"`）。

**添加新代理后未找到提供商的 API 密钥**

这通常意味着 **新代理** 的身份验证存储为空。身份验证是按代理进行的，并存储在：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

修复选项：

- 运行 `openclaw agents add <id>` 并在向导过程中配置身份验证。
- 或者将 `auth-profiles.json` 从主代理的 `agentDir` 复制到新代理的 `agentDir` 中。

请勿在多个代理之间重用 `agentDir`；这会导致身份验证/会话冲突。

## 模型故障转移和“所有模型均失败”

### 故障转移如何工作

故障转移分两个阶段进行：

1. **身份配置轮换**在同一提供商内。
2. `agents.defaults.model.fallbacks` 中的下一个模型的**模型回退**。

冷却策略适用于失败的配置文件（指数退避），因此即使某个提供商受到速率限制或暂时故障，OpenClaw 仍能持续响应。

### 这个错误是什么意思

```
No credentials found for profile "anthropic:default"
```

这意味着系统尝试使用身份验证配置文件 ID `anthropic:default`，但在预期的身份验证存储中找不到它的凭据。

### 针对未找到配置文件 anthropicdefault 凭证的修复清单

- **确认身份配置文件的位置**（新路径与旧路径）
  - Current: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - Legacy: `~/.openclaw/agent/*` (migrated by `openclaw doctor`)
- **确认您的环境变量已被 Gateway 加载**
  - 如果你在 Shell 中设置了 `ANTHROPIC_API_KEY`，但通过 systemd/launchd 运行 Gateway，它可能无法继承该变量。将其放入 `~/.openclaw/.env` 或启用 `env.shellEnv`。
- **确保你正在编辑正确的代理**
  - 多代理设置意味着可以有多个 `auth-profiles.json` 文件。
- **检查模型/认证状态**
  - 使用 `openclaw models status` 查看已配置的模型以及提供商是否已通过身份验证。

**修复检查清单：未找到配置文件 anthropic 的凭据**

这意味着运行被固定到一个 Anthropic 身份验证配置文件，但 Gateway
在其身份验证存储中找不到它。

- **使用 setup-token**
  - 运行 `claude setup-token`，然后使用 `openclaw models auth setup-token --provider anthropic` 粘贴它。
  - 如果令牌是在另一台机器上创建的，请使用 `openclaw models auth paste-token --provider anthropic`。
- **如果您想改用 API 密钥**
  - 将 `ANTHROPIC_API_KEY` 放在 **网关主机** 上的 `~/.openclaw/.env` 中。
  - 清除任何强制使用缺失配置文件的固定顺序：

    ```bash
    openclaw models auth order clear --provider anthropic
    ```

- **确认您正在网关主机上运行命令**
  - 在远程模式下，认证配置文件位于网关机器上，而不是你的笔记本电脑上。

### 为什么它还尝试了 Google Gemini 但失败了？

如果您的模型配置包含 Google Gemini 作为回退（或者您切换到了 Gemini 简写），OpenClaw 将在模型回退期间尝试使用它。如果您尚未配置 Google 凭证，您将看到 `No API key found for provider "google"`。

修复：提供 Google 认证，或者在 `agents.defaults.model.fallbacks` / 别名中移除/避免使用 Google 模型，这样备用路由就不会指向它们。

**LLM 请求被拒绝消息认为需要签名 google antigravity**

原因：会话历史包含**没有签名的思维块**（通常来自
中断/不完整的流）。Google Antigravity 要求思维块必须有签名。

修复：OpenClaw 现在会为 Google Antigravity Claude 去除无签名的思考块。如果仍然出现，请**开启新会话**或为该代理设置 `/thinking off`。

## 身份验证配置文件：它们是什么以及如何管理它们

相关：[/concepts/oauth](/zh/en/concepts/oauth) (OAuth 流程、令牌存储、多账户模式)

### 什么是身份验证配置文件

Auth 配置文件是与提供商关联的命名凭据记录（OAuth 或 API 密钥）。配置文件位于：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

### 典型的个人资料 ID 是什么

OpenClaw 使用带有提供商前缀的 ID，例如：

- `anthropic:default` （通常在没有电子邮件身份时发生）
- 用于 OAuth 身份的 `anthropic:<email>`
- 您选择的自定义 ID（例如 `anthropic:work`）

### 我可以控制首先尝试哪个认证配置文件吗

是的。配置文件支持可选的配置文件元数据以及每个提供者的排序 (`auth.order.<provider>`)。这**不**存储机密信息；它将 ID 映射到提供者/模式并设置轮换顺序。

如果配置文件处于短暂的 **cooldown**（速率限制/超时/身份验证失败）状态或更长的 **disabled**（计费/额度不足）状态，OpenClaw 可能会暂时跳过该配置文件。要检查此情况，请运行 `openclaw models status --json` 并检查 `auth.unusableProfiles`。调优：`auth.cooldowns.billingBackoffHours*`。

您还可以通过 CLI 设置**按代理**的顺序覆盖（存储在该代理的 `auth-profiles.json` 中）：

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

### OAuth 和 API key 有什么区别

OpenClaw 支持两者：

- **OAuth** 通常利用订阅访问权限（如适用）。
- **API keys** 使用按 token 计费的付费模式。

向导明确支持 Anthropic setup-token 和 OpenAI Codex OAuth，并可以为您存储 API 密钥。

## 网关：端口、“已在运行”和远程模式

### 网关使用什么端口

`gateway.port` 控制 WebSocket + HTTP（控制 UI、hooks 等）使用的单一多路复用端口。

优先级：

```
--port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
```

### 为什么 openclaw 网关状态显示 Runtime running 但 RPC 探测失败

因为“运行中”是**supervisor（监管程序）**的视角（launchd/systemd/schtasks）。RPC 探测是 CLI 实际连接到 gateway WebSocket 并调用 `status`。

使用 `openclaw gateway status` 并相信这些行：

- `Probe target:`（探针实际使用的 URL）
- `Listening:`（端口上实际绑定的内容）
- `Last gateway error:`（进程存活但端口未监听时的常见根本原因）

### 为什么 openclaw gateway status 显示的 Config cli 和 Config service 不同

您正在编辑一个配置文件，而服务正在运行另一个配置文件（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

修复：

```bash
openclaw gateway install --force
```

在您希望服务使用的同一个 `--profile` / 环境中运行它。

### “另一个网关实例正在监听”是什么意思

OpenClaw 通过在启动时立即绑定 WebSocket 监听器（默认 `ws://127.0.0.1:18789`）来强制执行运行时锁定。如果绑定失败并返回 `EADDRINUSE`，它将抛出 `GatewayLockError`，表明另一个实例已在监听。

修复：停止另一个实例，释放端口，或使用 `openclaw gateway --port <port>` 运行。

### 如何在远程模式下运行 OpenClaw，即客户端连接到其他地方的网关

设置 `gateway.mode: "remote"` 并指向远程 WebSocket URL，可以选择性地带上令牌/密码：

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

- 仅当 `gateway.mode` 为 `local` 时，`openclaw gateway` 才会启动（或者您传递了覆盖标志）。
- macOS 应用会监控配置文件，并在这些值发生变化时实时切换模式。

### 控制界面显示未授权或一直重连，现在该怎么办

您的网关已启用身份验证 (`gateway.auth.*`)，但 UI 未发送匹配的令牌/密码。

事实（来自代码）：

- 控制 UI 将令牌保存在 `sessionStorage` 中，用于当前的浏览器标签页会话和选定的网关 URL，因此同标签页刷新可继续工作，而无需恢复长期的 localStorage 令牌持久性。
- 在 `AUTH_TOKEN_MISMATCH` 上，当网关返回重试提示（`canRetryWithDeviceToken=true`，`recommendedNextStep=retry_with_device_token`）时，受信任的客户端可以使用缓存设备令牌尝试一次有界重试。

修复方法：

- 最快：`openclaw dashboard`（打印并复制仪表板 URL，尝试打开；如果是无头模式则显示 SSH 提示）。
- 如果您还没有令牌：`openclaw doctor --generate-gateway-token`。
- 如果是远程，请先进行隧道操作：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然后打开 `http://127.0.0.1:18789/`。
- 在网关主机上设置 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 在控制 UI 设置中，粘贴相同的令牌。
- 如果重试后不匹配仍然存在，请轮换/重新批准配对的设备令牌：
  - `openclaw devices list`
  - `openclaw devices rotate --device <id> --role operator`
- 还是卡住了？运行 `openclaw status --all` 并参考 [故障排查](/zh/en/gateway/troubleshooting)。有关身份验证详情，请参阅 [仪表板](/zh/en/web/dashboard)。

### 我设置了 gatewaybind tailnet，但它无法绑定，没有任何监听

`tailnet` bind 从您的网络接口（100.64.0.0/10）中选择一个 Tailscale IP。如果机器不在 Tailscale 上（或者接口已关闭），就没有可绑定的对象。

修复：

- 在该主机上启动 Tailscale（以便它拥有一个 100.x 地址），或
- 切换到 `gateway.bind: "loopback"` / `"lan"`。

注意：`tailnet` 是显式的。`auto` 优先使用环回地址；当您想要仅限 tailnet 的绑定时，请使用 `gateway.bind: "tailnet"`。

### 我可以在同一主机上运行多个 Gateway 吗

通常不需要——一个 Gateway 可以运行多个消息通道和代理。仅在需要冗余（例如：救援机器人）或硬隔离时才使用多个 Gateway。

是的，但您必须进行隔离：

- `OPENCLAW_CONFIG_PATH` (每个实例的配置)
- `OPENCLAW_STATE_DIR` (每个实例的状态)
- `agents.defaults.workspace` (工作区隔离)
- `gateway.port` (唯一端口)

快速设置（推荐）：

- 每个实例使用 `openclaw --profile <name> …`（自动创建 `~/.openclaw-<name>`）。
- 在每个配置文件中设置唯一的 `gateway.port`（或在手动运行时传递 `--port`）。
- 安装一个按配置文件的服务：`openclaw --profile <name> gateway install`。

配置文件也会为服务名称添加后缀（`ai.openclaw.<profile>`；旧版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
完整指南：[多个网关](/zh/en/gateway/multiple-gateways)。

### 无效的握手代码 1008 是什么意思

网关是一个 **WebSocket 服务器**，它期望收到的第一条消息是
`connect` 帧。如果收到其他任何内容，它将以
**code 1008**（策略违规）关闭连接。

常见原因：

- 您在浏览器中打开了 **HTTP** URL (`http://...`)，而不是 WS 客户端。
- 您使用了错误的端口或路径。
- 代理或隧道剥离了认证标头，或者发送了非 Gateway 请求。

快速修复：

1. 使用 WS URL：`ws://<host>:18789`（如果是 HTTPS 则使用 `wss://...`）。
2. 不要在普通浏览器标签页中打开 WS 端口。
3. 如果开启了身份验证，请在 `connect` 帧中包含令牌/密码。

如果您使用的是 CLI 或 TUI，URL 应该看起来像：

```
openclaw tui --url ws://<host>:18789 --token <token>
```

协议详情：[Gateway 协议](/zh/en/gateway/protocol)。

## 日志记录和调试

### 日志在哪里

文件日志（结构化）：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

您可以通过 `logging.file` 设置稳定的路径。文件日志级别由 `logging.level` 控制。控制台详细程度由 `--verbose` 和 `logging.consoleLevel` 控制。

最快的日志跟踪：

```bash
openclaw logs --follow
```

服务/监督日志（当网关通过 launchd/systemd 运行时）：

- macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（默认：`~/.openclaw/logs/...`；配置文件使用 `~/.openclaw-<profile>/logs/...`）
- Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
- Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

有关更多信息，请参阅 [故障排除](/zh/en/gateway/troubleshooting#log-locations)。

### 如何启动/停止/重启 Gateway 服务

使用网关辅助工具：

```bash
openclaw gateway status
openclaw gateway restart
```

如果您手动运行网关，`openclaw gateway --force` 可以回收该端口。请参阅 [网关](/zh/en/gateway)。

### 我在 Windows 上关闭了终端，如何重启 OpenClaw？

有 **两种 Windows 安装模式**：

**1) WSL2（推荐）：** 网关在 Linux 内部运行。

打开 PowerShell，输入 WSL，然后重启：

```powershell
wsl
openclaw gateway status
openclaw gateway restart
```

如果您从未安装过该服务，请在前台启动它：

```bash
openclaw gateway run
```

**2) 原生 Windows（不推荐）：** 网关直接在 Windows 上运行。

打开 PowerShell 并运行：

```powershell
openclaw gateway status
openclaw gateway restart
```

如果您手动运行它（非服务模式），请使用：

```powershell
openclaw gateway run
```

文档：[Windows (WSL2)](/zh/en/platforms/windows)，[Gateway service runbook](/zh/en/gateway)。

### 网关已启动但回复从未到达，我应该检查什么？

首先进行一次快速的健康检查：

```bash
openclaw status
openclaw models status
openclaw channels status
openclaw logs --follow
```

常见原因：

- 模型身份验证未加载到 **网关主机** 上（请检查 `models status`）。
- 频道配对/允许列表阻止回复（检查频道配置 + 日志）。
- WebChat/Dashboard 在没有正确令牌的情况下打开。

如果您在远程，请确认隧道/Tailscale 连接已启动，并且
Gateway WebSocket 可达。

文档：[频道](/zh/en/channels)、[故障排除](/zh/en/gateway/troubleshooting)、[远程访问](/zh/en/gateway/remote)。

### 与网关断开连接，没有原因，现在怎么办

这通常意味着 UI 失去了 WebSocket 连接。请检查：

1. 网关正在运行吗？ `openclaw gateway status`
2. 网关是否健康？ `openclaw status`
3. UI 是否拥有正确的令牌？ `openclaw dashboard`
4. 如果是远程连接，隧道/Tailscale 链接是否正常？

然后跟踪日志：

```bash
openclaw logs --follow
```

文档：[控制台](/zh/en/web/dashboard)，[远程访问](/zh/en/gateway/remote)，[故障排除](/zh/en/gateway/troubleshooting)。

### Telegram setMyCommands 失败 应该检查什么

从日志和通道状态开始：

```bash
openclaw channels status
openclaw channels logs --channel telegram
```

然后匹配错误：

- `BOT_COMMANDS_TOO_MUCH`：Telegram 菜单条目过多。OpenClaw 已经修剪至 Telegram 限制并使用较少的命令重试，但仍需要删除某些菜单条目。减少插件/技能/自定义命令，如果不需要菜单，请禁用 `channels.telegram.commands.native`。
- `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或类似网络错误：如果您在 VPS 上或位于代理后面，请确认允许出站 HTTPS 并且 `api.telegram.org` 的 DNS 正常工作。

如果网关是远程的，请确保您正在查看网关主机上的日志。

文档：[Telegram](/zh/en/channels/telegram)、[渠道故障排除](/zh/en/channels/troubleshooting)。

### TUI 无输出 应该检查什么

首先确认网关可达并且代理可以运行：

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

在 TUI 中，使用 `/status` 查看当前状态。如果您期望在聊天
渠道中收到回复，请确保已启用投递（`/deliver on`）。

文档：[TUI](/zh/en/web/tui)、[斜杠命令](/zh/en/tools/slash-commands)。

### 如何完全停止然后启动网关

如果您安装了服务：

```bash
openclaw gateway stop
openclaw gateway start
```

这将停止/启动 **受监督的服务**（macOS 上的 launchd，Linux 上的 systemd）。
当网关作为守护进程在后台运行时，请使用此命令。

如果您在前台运行，请使用 Ctrl-C 停止，然后：

```bash
openclaw gateway run
```

文档：[网关服务手册](/zh/en/gateway)。

### ELI5 openclaw gateway restart vs openclaw gateway

- `openclaw gateway restart`：重新启动 **后台服务**（launchd/systemd）。
- `openclaw gateway`：在此终端会话中 **在前台** 运行网关。

如果您安装了服务，请使用网关命令。当
您想要一次性前台运行时，请使用 `openclaw gateway`。

### 当出现故障时，获取更多详细信息的最快方法是什么

使用 `--verbose` 启动 Gateway 以获取更多控制台详细信息。然后检查日志文件中的通道身份验证、模型路由和 RPC 错误。

## 媒体和附件

### 我的技能生成了图像或 PDF，但没有发送任何内容

来自代理的出站附件必须包含一行 `MEDIA:<path-or-url>`（独占一行）。请参阅 [OpenClaw assistant setup](/zh/en/start/openclaw) 和 [Agent send](/zh/en/tools/agent-send)。

CLI 发送：

```bash
openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
```

还要检查：

- 目标通道支持出站媒体，且未被允许列表阻止。
- 文件在提供商的大小限制范围内（图片会被调整为最大 2048px）。

请参阅 [Images](/zh/en/nodes/images)。

## 安全与访问控制

### 将 OpenClaw 暴露给入站私信（DM）是否安全

将入站私信视为不受信任的输入。默认设置旨在降低风险：

- 支持私信的通道上的默认行为是**配对**：
  - 未知发送者会收到配对码；机器人不会处理他们的消息。
  - 使用以下命令批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
  - 待处理的请求限制为**每个通道 3 个**；如果未收到代码，请检查 `openclaw pairing list --channel <channel> [--account <id>]`。
- 公开开放私信需要显式选择加入（`dmPolicy: "open"` 和允许列表 `"*"`）。

运行 `openclaw doctor` 以查找有风险的私信策略。

### 提示词注入只是公共机器人的顾虑吗

不是。提示词注入是关于**不受信任的内容**，而不仅仅是谁能给机器人发私信。
如果您的助手读取外部内容（网络搜索/获取、浏览器页面、电子邮件、
文档、附件、粘贴的日志），这些内容可能包含试图
劫持模型的指令。即使**您是唯一的发送者**，也可能发生这种情况。

最大的风险是在启用工具时：模型可能被诱骗
泄露上下文或代表您调用工具。通过以下方式减少爆炸半径：

- 使用只读或禁用工具的“阅读器”代理来总结不受信任的内容
- 对于启用工具的代理，保持 `web_search` / `web_fetch` / `browser` 关闭
- 沙盒化和严格的工具允许列表

详情：[Security](/zh/en/gateway/security)。

### 我的 bot 应该拥有自己独立的电子邮件 GitHub 账户或电话号码吗

是的，对于大多数设置来说都是如此。使用独立的账户和电话号码将 bot 隔离起来，可以在出现问题时减小影响范围（爆炸半径）。这也使得轮换凭据或撤销访问权限变得更加容易，且不会影响您的个人账户。

从小处着手。仅授予您实际需要的工具和账户的访问权限，并在需要时再进行扩展。

文档：[安全](/zh/en/gateway/security)，[配对](/zh/en/channels/pairing)。

### 我可以让它自主控制我的短信吗？这样做安全吗

我们**不**建议让其对您的个人消息拥有完全自主权。最安全的模式是：

- 将私信保持在**配对模式**或严格的允许列表中。
- 如果您希望它代表您发送消息，请使用**独立的号码或账户**。
- 让它起草草稿，然后**在发送前进行批准**。

如果您想进行实验，请在专用账户上进行，并保持其隔离。请参阅[安全](/zh/en/gateway/security)。

### 我可以在个人助理任务中使用更便宜的模型吗

可以，**如果**该代理仅用于聊天且输入是可信的。较小的层级更容易受到指令劫持，因此对于启用了工具的代理或在读取不可信内容时，应避免使用它们。如果您必须使用较小的模型，请锁定工具并在沙盒中运行。请参阅[安全](/zh/en/gateway/security)。

### 我在 Telegram 中运行了 start 但没有收到配对代码

仅当未知发送者向 bot 发送消息且启用了 `dmPolicy: "pairing"` 时，才会发送配对代码。仅使用 `/start` 本身不会生成代码。

检查待处理的请求：

```bash
openclaw pairing list telegram
```

如果您希望立即获得访问权限，请将您的发送者 ID 加入允许列表，或为该账户设置 `dmPolicy: "open"`。

### WhatsApp：它会给我的联系人发消息吗？配对是如何工作的

不会。默认的 WhatsApp 私信策略是**配对**。未知发送者只会收到配对代码，其消息**不会被处理**。OpenClaw 仅回复其收到的聊天或您触发的显式发送。

通过以下方式批准配对：

```bash
openclaw pairing approve whatsapp <code>
```

列出待处理的请求：

```bash
openclaw pairing list whatsapp
```

向导手机号码提示：它用于设置您的 **allowlist/owner**（白名单/所有者），以便允许您自己的私信。它不用于自动发送。如果您使用个人 WhatsApp 号码运行，请使用该号码并启用 `channels.whatsapp.selfChatMode`。

## 聊天命令、中止任务和“它停不下来”

### 如何阻止内部系统消息显示在聊天中

大多数内部或工具消息仅在为该会话启用了 **verbose**（详细）或 **reasoning**（推理）时才出现。

在您看到消息的聊天中修复：

```
/verbose off
/reasoning off
```

如果仍然很嘈杂，请检查控制 UI 中的会话设置，并将 verbose 设置为 **inherit**（继承）。还要确认您没有在配置中使用设置了 `verboseDefault` 为 `on` 的机器人配置文件。

文档：[Thinking and verbose](/zh/en/tools/thinking)，[Security](/zh/en/gateway/security#reasoning--verbose-output-in-groups)。

### 如何停止/取消正在运行的任务

将以下任一内容 **作为独立消息** 发送（不带斜杠）：

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

斜杠命令概览：请参阅 [Slash commands](/zh/en/tools/slash-commands)。

大多数命令必须作为以 `/` 开头的 **standalone**（独立）消息发送，但少数快捷方式（如 `/status`）也可以对列入白名单的发件人内联工作。

### 如何从 Telegram 发送 Discord 消息 跨上下文消息被拒绝

OpenClaw 默认阻止 **跨提供商**（cross-provider）消息传递。如果工具调用绑定到 Telegram，除非您明确允许，否则它不会发送到 Discord。

为该代理启用跨提供商消息传递：

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

编辑配置后重启网关。如果您只希望对单个代理进行此设置，请改为在 `agents.list[].tools.message` 下进行设置。

### 为什么感觉机器人忽略了连珠炮式的消息

队列模式控制新消息如何与正在进行的运行交互。使用 `/queue` 更改模式：

- `steer` - 新消息重定向当前任务
- `followup` - 一次运行一条消息
- `collect` - 批量处理消息并回复一次（默认）
- `steer-backlog` - 立即引导，然后处理积压
- `interrupt` - 中止当前运行并重新开始

您可以添加像 `debounce:2s cap:25 drop:summarize` 这样的选项用于后续模式。

## 准确回答截图/聊天记录中的问题

**Q：“使用 API 密钥时 Anthropic 的默认模型是什么？”**

**A:** 在 OpenClaw 中，凭证和模型选择是分开的。设置 `ANTHROPIC_API_KEY`（或在身份验证配置文件中存储 Anthropic API 密钥）可以启用身份验证，但实际的默认模型是您在 `agents.defaults.model.primary` 中配置的任何模型（例如，`anthropic/claude-sonnet-4-5` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，这意味着 Gateway 无法在正在运行的代理的预期 `auth-profiles.json` 中找到 Anthropic 凭证。

---

还是卡住了？请在 [Discord](https://discord.com/invite/clawd) 中提问或发起 [GitHub 讨论](https://github.com/openclaw/openclaw/discussions)。

import zh from '/components/footer/zh.mdx';

<zh />
