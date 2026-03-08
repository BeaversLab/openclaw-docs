---
summary: "关于 OpenClaw 设置、配置和使用的常见问题"
title: "常见问题"
---

# 常见问题（FAQ）

快速答案 + 更深入的实战排障（本地开发、VPS、多 agent、OAuth/API keys、模型 failover）。运行时诊断请看 [故障排查](/zh/gateway/troubleshooting)。完整配置参考见 [配置](/zh/gateway/configuration)。

## 目录

- [Quick start and first-run setup](#quick-start-and-firstrun-setup)
  - [Im stuck whats the fastest way to get unstuck?](#im-stuck-whats-the-fastest-way-to-get-unstuck)
  - [What’s the recommended way to install and set up OpenClaw?](#whats-the-recommended-way-to-install-and-set-up-openclaw)
  - [How do I open the dashboard after onboarding?](#how-do-i-open-the-dashboard-after-onboarding)
  - [How do I authenticate the dashboard (token) on localhost vs remote?](#how-do-i-authenticate-the-dashboard-token-on-localhost-vs-remote)
  - [What runtime do I need?](#what-runtime-do-i-need)
  - [Does it run on Raspberry Pi?](#does-it-run-on-raspberry-pi)
  - [Any tips for Raspberry Pi installs?](#any-tips-for-raspberry-pi-installs)
  - [It is stuck on "wake up my friend" / onboarding will not hatch. What now?](#it-is-stuck-on-wake-up-my-friend-onboarding-will-not-hatch-what-now)
  - [Can I migrate my setup to a new machine (Mac mini) without redoing onboarding?](#can-i-migrate-my-setup-to-a-new-machine-mac-mini-without-redoing-onboarding)
  - [Where do I see what’s new in the latest version?](#where-do-i-see-what-is-new-in-the-latest-version)
  - [I can't access docs.openclaw.ai (SSL error). What now?](#i-cant-access-docsopenclawai-ssl-error-what-now)
  - [What’s the difference between stable and beta?](#whats-the-difference-between-stable-and-beta)
- [How do I install the beta version, and what’s the difference between beta and dev?](#how-do-i-install-the-beta-version-and-whats-the-difference-between-beta-and-dev)
  - [How do I try the latest bits?](#how-do-i-try-the-latest-bits)
  - [How long does install and onboarding usually take?](#how-long-does-install-and-onboarding-usually-take)
  - [Installer stuck? How do I get more feedback?](#installer-stuck-how-do-i-get-more-feedback)
  - [Windows install says git not found or openclaw not recognized](#windows-install-says-git-not-found-or-openclaw-not-recognized)
  - [The docs didn’t answer my question - how do I get a better answer?](#the-docs-didnt-answer-my-question-how-do-i-get-a-better-answer)
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
  - [What’s the difference between the hackable (git) install and npm install?](#whats-the-difference-between-the-hackable-git-install-and-npm-install)
  - [Can I switch between npm and git installs later?](#can-i-switch-between-npm-and-git-installs-later)
  - [Should I run the Gateway on my laptop or a VPS?](#should-i-run-the-gateway-on-my-laptop-or-a-vps)
  - [How important is it to run OpenClaw on a dedicated machine?](#how-important-is-it-to-run-openclaw-on-a-dedicated-machine)
  - [What are the minimum VPS requirements and recommended OS?](#what-are-the-minimum-vps-requirements-and-recommended-os)
  - [Can I run OpenClaw in a VM and what are the requirements](#can-i-run-openclaw-in-a-vm-and-what-are-the-requirements)
- [What is OpenClaw?](#what-is-openclaw)
  - [What is OpenClaw, in one paragraph?](#what-is-openclaw-in-one-paragraph)
  - [What’s the value proposition?](#whats-the-value-proposition)
  - [I just set it up what should I do first](#i-just-set-it-up-what-should-i-do-first)
  - [What are the top five everyday use cases for OpenClaw](#what-are-the-top-five-everyday-use-cases-for-openclaw)
  - [Can OpenClaw help with lead gen outreach ads and blogs for a SaaS](#can-openclaw-help-with-lead-gen-outreach-ads-and-blogs-for-a-saas)
  - [What are the advantages vs Claude Code for web development?](#what-are-the-advantages-vs-claude-code-for-web-development)
- [技能 and automation](#skills-and-automation)
  - [How do I customize skills without keeping the repo dirty?](#how-do-i-customize-skills-without-keeping-the-repo-dirty)
  - [Can I load skills from a custom folder?](#can-i-load-skills-from-a-custom-folder)
  - [How can I use different models for different tasks?](#how-can-i-use-different-models-for-different-tasks)
  - [The bot freezes while doing heavy work. How do I offload that?](#the-bot-freezes-while-doing-heavy-work-how-do-i-offload-that)
  - [Cron or reminders do not fire. What should I check?](#cron-or-reminders-do-not-fire-what-should-i-check)
  - [How do I install skills on Linux?](#how-do-i-install-skills-on-linux)
  - [Can OpenClaw run tasks on a schedule or continuously in the background?](#can-openclaw-run-tasks-on-a-schedule-or-continuously-in-the-background)
  - [Can I run Apple/macOS-only skills from Linux?](#can-i-run-applemacosonly-skills-from-linux)
  - [Do you have a Notion or HeyGen integration?](#do-you-have-a-notion-or-heygen-integration)
  - [How do I install the Chrome 扩展 for browser takeover?](#how-do-i-install-the-chrome-extension-for-browser-takeover)
- [沙盒隔离 and memory](#sandboxing-and-memory)
  - [Is there a dedicated sandboxing doc?](#is-there-a-dedicated-sandboxing-doc)
  - [How do I bind a host folder into the sandbox?](#how-do-i-bind-a-host-folder-into-the-sandbox)
  - [How does memory work?](#how-does-memory-work)
  - [记忆 keeps forgetting things. How do I make it stick?](#memory-keeps-forgetting-things-how-do-i-make-it-stick)
  - [Does memory persist forever? What are the limits?](#does-memory-persist-forever-what-are-the-limits)
  - [Does semantic memory search require an OpenAI API key?](#does-semantic-memory-search-require-an-openai-api-key)
- [文件存储位置](#where-things-live-on-disk)
  - [Is all data used with OpenClaw saved locally?](#is-all-data-used-with-openclaw-saved-locally)
  - [Where does OpenClaw store its data?](#where-does-openclaw-store-its-data)
  - [Where should AGENTS.md / SOUL.md / USER.md / MEMORY.md live?](#where-should-agentsmd-soulmd-usermd-memorymd-live)
  - [What’s the recommended backup strategy?](#whats-the-recommended-backup-strategy)
  - [How do I completely uninstall OpenClaw?](#how-do-i-completely-uninstall-openclaw)
  - [Can agents work outside the workspace?](#can-agents-work-outside-the-workspace)
  - [I’m in remote mode - where is the session store?](#im-in-remote-mode-where-is-the-session-store)
- [配置 basics](#config-basics)
  - [What format is the config? Where is it?](#what-format-is-the-config-where-is-it)
  - [I set `gateway.bind: "lan"` (or `"tailnet"`) and now nothing listens / the UI says unauthorized](#i-set-gatewaybind-lan-or-tailnet-and-now-nothing-listens-the-ui-says-unauthorized)
  - [Why do I need a token on localhost now?](#why-do-i-need-a-token-on-localhost-now)
  - [Do I have to restart after changing config?](#do-i-have-to-restart-after-changing-config)
  - [How do I enable web search (and web fetch)?](#how-do-i-enable-web-search-and-web-fetch)
  - [config.apply wiped my config. How do I recover and avoid this?](#configapply-wiped-my-config-how-do-i-recover-and-avoid-this)
  - [How do I run a central Gateway with specialized workers across devices?](#how-do-i-run-a-central-gateway-with-specialized-workers-across-devices)
  - [Can the OpenClaw browser run headless?](#can-the-openclaw-browser-run-headless)
  - [How do I use Brave for browser control?](#how-do-i-use-brave-for-browser-control)
- [Remote gateways + nodes](#remote-gateways-nodes)
  - [How do commands propagate between Telegram, the gateway, and nodes?](#how-do-commands-propagate-between-telegram-the-gateway-and-nodes)
  - [How can my agent access my computer if the Gateway is hosted remotely?](#how-can-my-agent-access-my-computer-if-the-gateway-is-hosted-remotely)
  - [Tailscale is connected but I get no replies. What now?](#tailscale-is-connected-but-i-get-no-replies-what-now)
  - [Can two OpenClaw instances talk to each other (local + VPS)?](#can-two-openclaw-instances-talk-to-each-other-local-vps)
  - [Do I need separate VPSes for multiple agents](#do-i-need-separate-vpses-for-multiple-agents)
  - [Is there a benefit to using a node on my personal laptop instead of SSH from a VPS?](#is-there-a-benefit-to-using-a-node-on-my-personal-laptop-instead-of-ssh-from-a-vps)
  - [Do nodes run a gateway service?](#do-nodes-run-a-gateway-service)
  - [Is there an API / RPC way to apply config?](#is-there-an-api-rpc-way-to-apply-config)
  - [What’s a minimal “sane” config for a first install?](#whats-a-minimal-sane-config-for-a-first-install)
  - [How do I set up Tailscale on a VPS and connect from my Mac?](#how-do-i-set-up-tailscale-on-a-vps-and-connect-from-my-mac)
  - [How do I connect a Mac node to a remote Gateway (Tailscale Serve)?](#how-do-i-connect-a-mac-node-to-a-remote-gateway-tailscale-serve)
  - [Should I install on a second laptop or just add a node?](#should-i-install-on-a-second-laptop-or-just-add-a-node)
- [Env vars and .env loading](#env-vars-and-env-loading)
  - [How does OpenClaw load environment variables?](#how-does-openclaw-load-environment-variables)
  - [“I started the Gateway via the service and my env vars disappeared.” What now?](#i-started-the-gateway-via-the-service-and-my-env-vars-disappeared-what-now)
  - [I set `COPILOT_GITHUB_TOKEN`, but models status shows “Shell env: off.” Why?](#i-set-copilotgithubtoken-but-models-status-shows-shell-env-off-why)
- [会话 & multiple chats](#sessions-multiple-chats)
  - [How do I start a fresh conversation?](#how-do-i-start-a-fresh-conversation)
  - [Do sessions reset automatically if I never send `/new`?](#do-sessions-reset-automatically-if-i-never-send-new)
  - [Is there a way to make a team of OpenClaw instances one CEO and many agents](#is-there-a-way-to-make-a-team-of-openclaw-instances-one-ceo-and-many-agents)
  - [Why did context get truncated mid-task? How do I prevent it?](#why-did-context-get-truncated-midtask-how-do-i-prevent-it)
  - [How do I completely reset OpenClaw but keep it installed?](#how-do-i-completely-reset-openclaw-but-keep-it-installed)
  - [I’m getting “context too large” errors - how do I reset or compact?](#im-getting-context-too-large-errors-how-do-i-reset-or-compact)
  - [Why am I seeing “LLM request rejected: messages.N.content.X.tool_use.input: Field required”?](#why-am-i-seeing-llm-request-rejected-messagesncontentxtooluseinput-field-required)
  - [Why am I getting heartbeat messages every 30 minutes?](#why-am-i-getting-heartbeat-messages-every-30-minutes)
  - [Do I need to add a “bot account” to a WhatsApp group?](#do-i-need-to-add-a-bot-account-to-a-whatsapp-group)
  - [How do I get the JID of a WhatsApp group?](#how-do-i-get-the-jid-of-a-whatsapp-group)
  - [Why doesn’t OpenClaw reply in a group?](#why-doesnt-openclaw-reply-in-a-group)
  - [Do groups/threads share context with DMs?](#do-groupsthreads-share-context-with-dms)
  - [How many workspaces and agents can I create?](#how-many-workspaces-and-agents-can-i-create)
  - [Can I run multiple bots or chats at the same time (Slack), and how should I set that up?](#can-i-run-multiple-bots-or-chats-at-the-same-time-slack-and-how-should-i-set-that-up)
- [模型: defaults, selection, aliases, switching](#models-defaults-selection-aliases-switching)
  - [What is the “default model”?](#what-is-the-default-model)
  - [What model do you recommend?](#what-model-do-you-recommend)
  - [How do I switch models without wiping my config?](#how-do-i-switch-models-without-wiping-my-config)
  - [Can I use self-hosted models (llama.cpp, vLLM, Ollama)?](#can-i-use-selfhosted-models-llamacpp-vllm-ollama)
  - [What do OpenClaw, Flawd, and Krill use for models?](#what-do-openclaw-flawd-and-krill-use-for-models)
  - [How do I switch models on the fly (without restarting)?](#how-do-i-switch-models-on-the-fly-without-restarting)
  - [Can I use GPT 5.2 for daily tasks and Codex 5.2 for coding](#can-i-use-gpt-52-for-daily-tasks-and-codex-52-for-coding)
  - [Why do I see “模型 … is not allowed” and then no reply?](#why-do-i-see-model-is-not-allowed-and-then-no-reply)
  - [Why do I see “Unknown model: minimax/MiniMax-M2.1”?](#why-do-i-see-unknown-model-minimaxminimaxm21)
  - [Can I use MiniMax as my default and OpenAI for complex tasks?](#can-i-use-minimax-as-my-default-and-openai-for-complex-tasks)
  - [Are opus / sonnet / gpt built‑in shortcuts?](#are-opus-sonnet-gpt-builtin-shortcuts)
  - [How do I define/override model shortcuts (aliases)?](#how-do-i-defineoverride-model-shortcuts-aliases)
  - [How do I add models from other providers like OpenRouter or Z.AI?](#how-do-i-add-models-from-other-providers-like-openrouter-or-zai)
- [模型 failover and “All models failed”](#model-failover-and-all-models-failed)
  - [How does failover work?](#how-does-failover-work)
  - [What does this error mean?](#what-does-this-error-mean)
  - [Fix checklist for `No credentials found for profile "anthropic:default"`](#fix-checklist-for-no-credentials-found-for-profile-anthropicdefault)
  - [Why did it also try Google Gemini and fail?](#why-did-it-also-try-google-gemini-and-fail)
- [Auth profiles: what they are and how to manage them](#auth-profiles-what-they-are-and-how-to-manage-them)
  - [What is an auth profile?](#what-is-an-auth-profile)
  - [What are typical profile IDs?](#what-are-typical-profile-ids)
  - [Can I control which auth profile is tried first?](#can-i-control-which-auth-profile-is-tried-first)
  - [OAuth vs API key: what’s the difference?](#oauth-vs-api-key-whats-the-difference)
- [Gateway: ports, “already running”, and remote mode](#gateway-ports-already-running-and-remote-mode)
  - [What port does the Gateway use?](#what-port-does-the-gateway-use)
  - [Why does `openclaw gateway status` say `Runtime: running` but `RPC probe: failed`?](#why-does-openclaw-gateway-status-say-runtime-running-but-rpc-probe-failed)
  - [Why does `openclaw gateway status` show `配置 (cli)` and `配置 (service)` different?](#why-does-openclaw-gateway-status-show-config-cli-and-config-service-different)
  - [What does “another gateway instance is already listening” mean?](#what-does-another-gateway-instance-is-already-listening-mean)
  - [How do I run OpenClaw in remote mode (client connects to a Gateway elsewhere)?](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere)
  - [The 控制界面 says “unauthorized” (or keeps reconnecting). What now?](#the-control-ui-says-unauthorized-or-keeps-reconnecting-what-now)
  - [I set `gateway.bind: "tailnet"` but it can’t bind / nothing listens](#i-set-gatewaybind-tailnet-but-it-cant-bind-nothing-listens)
  - [Can I run multiple Gateways on the same host?](#can-i-run-multiple-gateways-on-the-same-host)
  - [What does “invalid handshake” / code 1008 mean?](#what-does-invalid-handshake-code-1008-mean)
- [日志 and debugging](#logging-and-debugging)
  - [Where are logs?](#where-are-logs)
  - [How do I start/stop/restart the Gateway service?](#how-do-i-startstoprestart-the-gateway-service)
  - [I closed my terminal on Windows - how do I restart OpenClaw?](#i-closed-my-terminal-on-windows-how-do-i-restart-openclaw)
  - [The Gateway is up but replies never arrive. What should I check?](#the-gateway-is-up-but-replies-never-arrive-what-should-i-check)
  - ["Disconnected from gateway: no reason" - what now?](#disconnected-from-gateway-no-reason-what-now)
  - [Telegram setMyCommands fails with network errors. What should I check?](#telegram-setmycommands-fails-with-network-errors-what-should-i-check)
  - [TUI shows no output. What should I check?](#tui-shows-no-output-what-should-i-check)
  - [How do I completely stop then start the Gateway?](#how-do-i-completely-stop-then-start-the-gateway)
  - [ELI5: `openclaw gateway restart` vs `openclaw gateway`](#eli5-openclaw-gateway-restart-vs-openclaw-gateway)
  - [What’s the fastest way to get more details when something fails?](#whats-the-fastest-way-to-get-more-details-when-something-fails)
- [Media & attachments](#media-attachments)
  - [My skill generated an image/PDF, but nothing was sent](#my-skill-generated-an-imagepdf-but-nothing-was-sent)
- [安全 and access control](#security-and-access-control)
  - [Is it safe to expose OpenClaw to inbound DMs?](#is-it-safe-to-expose-openclaw-to-inbound-dms)
  - [Is prompt injection only a concern for public bots?](#is-prompt-injection-only-a-concern-for-public-bots)
  - [Should my bot have its own email GitHub account or phone number](#should-my-bot-have-its-own-email-github-account-or-phone-number)
  - [Can I give it autonomy over my text messages and is that safe](#can-i-give-it-autonomy-over-my-text-messages-and-is-that-safe)
  - [Can I use cheaper models for personal assistant tasks?](#can-i-use-cheaper-models-for-personal-assistant-tasks)
  - [I ran `/start` in Telegram but didn’t get a pairing code](#i-ran-start-in-telegram-but-didnt-get-a-pairing-code)
  - [WhatsApp: will it message my contacts? How does pairing work?](#whatsapp-will-it-message-my-contacts-how-does-pairing-work)

## 出现问题时的前 60 秒

1. **快速状态检查（首选）**

   ```bash
   openclaw status
   ```

   本地快速摘要：操作系统 + 更新、网关/服务可达性、代理/会话、提供商配置 + 运行时问题（当网关可达时）。

1. **快速状态（首个检查）**

   ```bash
   openclaw status
   ```

   本地快速摘要：OS + 更新、gateway/服务可达性、agents/sessions、provider 配置 + 运行时问题（当 gateway 可达时）。

2. **可粘贴报告（安全分享）**

   ```bash
   openclaw status --all
   ```

   只读诊断 + 日志尾（token 已脱敏）。

3. **守护进程 + 端口状态**

   ```bash
   openclaw gateway status
   ```

   显示 supervisor 运行状态 vs RPC 可达性、探测目标 URL，以及服务可能使用的配置。

4. **深入探测**

   ```bash
   openclaw status --deep
   ```

   运行 gateway 健康检查 + provider 探测（需要可达的 gateway）。见 [健康](/zh/gateway/health)。

5. **跟随最新日志**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 不可用，回退到：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   文件日志与服务日志是分开的；见 [日志](/zh/logging) 与 [故障排查](/zh/gateway/troubleshooting)。

6. **运行 doctor（修复）**

   ```bash
   openclaw doctor
   ```

   修复/迁移配置与状态 + 运行健康检查。见 [诊断](/zh/gateway/doctor)。

## 快速入门和首次设置

## Quick start and first-run setup

Use a local AI agent that can **see your machine**. That is far more effective than asking
in Discord, because most "I'm stuck" cases are **local config or environment issues** that
remote helpers cannot inspect.

- **Claude Code**: https://www.anthropic.com/claude-code/
- **Claude Code**: https://www.anthropic.com/claude-code/

These tools can read the repo, run commands, inspect logs, and help fix your machine-level
setup (PATH, services, permissions, auth files). Give them the **full source checkout** via
the hackable (git) install:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

这些工具可以读取 repo、运行命令、检查日志，并帮你修复机器级设置（PATH、服务、权限、认证文件）。请用 hackable（git）安装提供 **完整源码 checkout**：

这样会 **从 git checkout 安装** OpenClaw，agent 能读取代码 + 文档，并基于你正在运行的具体版本进行推理。你随时可以通过不带 `--install-method git` 重新运行安装器切回稳定版。

提示：让 agent **规划并监督** 修复流程（逐步执行），然后只执行必要命令。这样变更更小、也更易审计。

如果你发现了真实 bug 或修复，请提 GitHub issue 或发 PR：
https://github.com/openclaw/openclaw/issues
https://github.com/openclaw/openclaw/pulls

```bash
openclaw status
openclaw models status
openclaw doctor
```

先从这些命令开始（求助时分享输出）：

- `openclaw status`: quick snapshot of gateway/agent health + basic config.
- `openclaw status`：gateway/agent 健康 + 基础配置的快速快照。
- `openclaw models status`：检查 provider 认证 + 模型可用性。

Other useful CLI checks: `openclaw status --all`, `openclaw logs --follow`,
`openclaw gateway status`, `openclaw health --verbose`.

其他有用的 CLI 检查：`openclaw status --all`, `openclaw logs --follow`,
`openclaw gateway status`, `openclaw health --verbose`。

### What's the recommended way to install and set up OpenClaw

The repo recommends running from source and using the onboarding wizard:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
```

The repo recommends running from source and using the onboarding wizard:

The wizard can also build UI assets automatically. After onboarding, you typically run the Gateway on port **18789**.

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw onboard
```

From source (contributors/dev):

### How do I open the dashboard after onboarding

The wizard now opens your browser with a tokenized dashboard URL right after onboarding and also prints the full link (with token) in the summary. Keep that tab open; if it didn't launch, copy/paste the printed URL on the same machine. Tokens stay local to your host-nothing is fetched from the browser.

### How do I authenticate the dashboard token on localhost vs remote

**Localhost (same machine):**

- Open `http://127.0.0.1:18789/`.
- Open `http://127.0.0.1:18789/`.
- If it asks for auth, run `openclaw dashboard` and use the tokenized link (`?token=...`).

**Not on localhost:**

- **Tailscale Serve** (recommended): keep bind loopback, run `openclaw gateway --tailscale serve`, open `https://<magicdns>/`. If `gateway.auth.allowTailscale` is `true`, identity headers satisfy auth (no token).
- **Tailscale Serve** (recommended): keep bind loopback, run `openclaw gateway --tailscale serve`, open `https://<magicdns>/`. If `gateway.auth.allowTailscale` is `true`, identity headers satisfy auth (no token).
- **Tailnet bind**: run `openclaw gateway --bind tailnet --token "<token>"`, open `http://<tailscale-ip>:18789/`, paste token in dashboard settings.

See [Dashboard](/zh/web/dashboard) and [Web surfaces](/zh/web) for bind modes and auth details.

### What runtime do I need

Node **>= 22** is required. `pnpm` is recommended. Bun is **not recommended** for the Gateway.

### Does it run on Raspberry Pi

Yes. The Gateway is lightweight - docs list **512MB-1GB RAM**, **1 core**, and about **500MB**
disk as enough for personal use, and note that a **Raspberry Pi 4 can run it**.

Yes. The Gateway is lightweight - docs list **512MB-1GB RAM**, **1 core**, and about **500MB**
disk as enough for personal use, and note that a **Raspberry Pi 4 can run it**.

If you want extra headroom (logs, media, other services), **2GB is recommended**, but it’s
not a hard minimum.

### Any tips for Raspberry Pi installs

Short version: it works, but expect rough edges.

- Use a **64-bit** OS and keep Node >= 22.
- Use a **64-bit** OS and keep Node >= 22.
- Prefer the **hackable (git) install** so you can see logs and update fast.
- Start without channels/skills, then add them one by one.

Docs: [Linux](/zh/platforms/linux), [Install](/zh/install).

### It is stuck on wake up my friend onboarding will not hatch What now

That screen depends on the Gateway being reachable and authenticated. The TUI also sends
"Wake up, my friend!" automatically on first hatch. If you see that line with **no reply**
and tokens stay at 0, the agent never ran.

1. Restart the Gateway:

```bash
openclaw gateway restart
```

1. Restart the Gateway:

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

2. Check status + auth:

```bash
openclaw doctor
```

If the Gateway is remote, ensure the tunnel/Tailscale connection is up and that the UI
is pointed at the right Gateway. See [Remote access](/zh/gateway/remote).

### Can I migrate my setup to a new machine Mac mini without redoing onboarding

Yes. Copy the **state directory** and **workspace**, then run Doctor once. This
keeps your bot "exactly the same" (memory, session history, auth, and channel
state) as long as you copy **both** locations:

1. Install OpenClaw on the new machine.
1. Install OpenClaw on the new machine.
2. Copy `$OPENCLAW_STATE_DIR` (default: `~/.openclaw`) from the old machine.
3. Copy your workspace (default: `~/.openclaw/workspace`).

That preserves config, auth profiles, WhatsApp creds, sessions, and memory. If you're in
remote mode, remember the gateway host owns the session store and workspace.

That preserves config, auth profiles, WhatsApp creds, sessions, and memory. If you’re in
remote mode, remember the gateway host owns the session store and workspace.

**Important:** if you only commit/push your workspace to GitHub, you’re backing
up **memory + bootstrap files**, but **not** session history or auth. Those live
under `~/.openclaw/` (for example `~/.openclaw/agents/<agentId>/sessions/`).

### Where do I see what is new in the latest version

Check the GitHub changelog:
https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md

Check the GitHub changelog:  
https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md

### I cant access docs.openclaw.ai SSL error What now

Some Comcast/Xfinity connections incorrectly block `docs.openclaw.ai` via Xfinity
Advanced Security. Disable it or allowlist `docs.openclaw.ai`, then retry. More
detail: [Troubleshooting](/zh/help/troubleshooting#docsopenclawai-shows-an-ssl-error-comcastxfinity).
Please help us unblock it by reporting here: https://spa.xfinity.com/check_url_status.

Some Comcast/Xfinity connections incorrectly block `docs.openclaw.ai` via Xfinity
Advanced Security. Disable it or allowlist `docs.openclaw.ai`, then retry. More
detail: [故障排查](/help/troubleshooting#docsopenclawai-shows-an-ssl-error-comcastxfinity).
Please help us unblock it by reporting here: https://spa.xfinity.com/check_url_status.

### What's the difference between stable and beta

**Stable** and **beta** are **npm dist-tags**, not separate code lines:

- `latest` = stable
- `latest` = stable

We ship builds to **beta**, test them, and once a build is solid we **promote
that same version to `latest`**. That's why beta and stable can point at the
**same version**.

We ship builds to **beta**, test them, and once a build is solid we **promote
that same version to `latest`**. That’s why beta and stable can point at the
**same version**.

### How do I install the beta version and whats the difference between beta and dev

**Beta** is the npm dist-tag `beta` (may match `latest`).
**Dev** is the moving head of `main` (git); when published, it uses the npm dist-tag `dev`.

**Beta** is the npm dist‑tag `beta` (may match `latest`).  
**Dev** is the moving head of `main` (git); when published, it uses the npm dist‑tag `dev`.

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
```

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
```

One‑liners (macOS/Linux):

Windows installer (PowerShell):
https://openclaw.ai/install.ps1

### How long does install and onboarding usually take

Rough guide:

- **Install:** 2-5 minutes
- **Install:** 2-5 minutes

If it hangs, use [Installer stuck](/zh/help/faq#installer-stuck-how-do-i-get-more-feedback)
and the fast debug loop in [Im stuck](/zh/help/faq#im-stuck--whats-the-fastest-way-to-get-unstuck).

### How do I try the latest bits

Two options:

1. **Dev channel (git checkout):**

```bash
openclaw update --channel dev
```

This switches to the `main` branch and updates from source.

2. **Hackable install (from the installer site):**

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

That gives you a local repo you can edit, then update via git.

That gives you a local repo you can edit, then update via git.

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
```

If you prefer a clean clone manually, use:

### Installer stuck How do I get more feedback

Re-run the installer with **verbose output**:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
```

Re-run the installer with **verbose output**:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
```

Beta install with verbose:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
```

For a hackable (git) install:

### Windows install says git not found or openclaw not recognized

Two common Windows issues:

Two common Windows issues:

- Install **Git for Windows** and make sure `git` is on your PATH.
- Install **Git for Windows** and make sure `git` is on your PATH.

**2) openclaw is not recognized after install**

- Your npm global bin folder is not on PATH.
- Your npm global bin folder is not on PATH.
- Check the path:
  ```powershell
  npm config get prefix
  ```
- Ensure `<prefix>\\bin` is on PATH (on most systems it is `%AppData%\\npm`).

If you want the smoothest Windows setup, use **WSL2** instead of native Windows.
Docs: [Windows](/zh/platforms/windows).

### The docs didnt answer my question how do I get a better answer

Use the **hackable (git) install** so you have the full source and docs locally, then ask
your bot (or Claude/Codex) _from that folder_ so it can read the repo and answer precisely.

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Use the **hackable (git) install** so you have the full source and docs locally, then ask
your bot (or Claude/Codex) _from that folder_ so it can read the repo and answer precisely.

### How do I install OpenClaw on Linux

Short answer: follow the Linux guide, then run the onboarding wizard.

- Linux quick path + service install: [Linux](/zh/platforms/linux).
- Linux quick path + service install: [Linux](/platforms/linux).
- Full walkthrough: [入门指南](/start/getting-started).

### How do I install OpenClaw on a VPS

Any Linux VPS works. Install on the server, then use SSH/Tailscale to reach the Gateway.

Any Linux VPS works. Install on the server, then use SSH/Tailscale to reach the Gateway.

### Where are the cloudVPS install guides

We keep a **hosting hub** with the common providers. Pick one and follow the guide:

- [VPS hosting](/zh/vps) (all providers in one place)
- [VPS hosting](/vps) (all providers in one place)
- [Fly.io](/platforms/fly)
- [Hetzner](/platforms/hetzner)

How it works in the cloud: the **Gateway runs on the server**, and you access it
from your laptop/phone via the Control UI (or Tailscale/SSH). Your state + workspace
live on the server, so treat the host as the source of truth and back it up.

How it works in the cloud: the **Gateway runs on the server**, and you access it
from your laptop/phone via the Control UI (or Tailscale/SSH). Your state + workspace
live on the server, so treat the host as the source of truth and back it up.

You can pair **nodes** (Mac/iOS/Android/headless) to that cloud Gateway to access
local screen/camera/canvas or run commands on your laptop while keeping the
Gateway in the cloud.

### Can I ask OpenClaw to update itself

Short answer: **possible, not recommended**. The update flow can restart the
Gateway (which drops the active session), may need a clean git checkout, and
can prompt for confirmation. Safer: run updates from a shell as the operator.

Short answer: **possible, not recommended**. The update flow can restart the
Gateway (which drops the active session), may need a clean git checkout, and
can prompt for confirmation. Safer: run updates from a shell as the operator.

```bash
openclaw update
openclaw update status
openclaw update --channel stable|beta|dev
openclaw update --tag <dist-tag|version>
openclaw update --no-restart
```

Use the CLI:

```bash
openclaw update --yes --no-restart
openclaw gateway restart
```

If you must automate from an agent:

### What does the onboarding wizard actually do

`openclaw onboard` is the recommended setup path. In **local mode** it walks you through:

- **Model/auth setup** (Anthropic **setup-token** recommended for Claude subscriptions, OpenAI Codex OAuth supported, API keys optional, LM Studio local models supported)
- **Model/auth setup** (Anthropic **setup-token** recommended for Claude subscriptions, OpenAI Codex OAuth supported, API keys optional, LM Studio local models supported)
- **Workspace** location + bootstrap files
- **Gateway settings** (bind/port/auth/tailscale)
- **Providers** (WhatsApp, Telegram, Discord, Mattermost (plugin), Signal, iMessage)
- **Daemon install** (LaunchAgent on macOS; systemd user unit on Linux/WSL2)

It also warns if your configured model is unknown or missing auth.

### Do I need a Claude or OpenAI subscription to run this

No. You can run OpenClaw with **API keys** (Anthropic/OpenAI/others) or with
**local-only models** so your data stays on your device. Subscriptions (Claude
Pro/Max or OpenAI Codex) are optional ways to authenticate those providers.

No. You can run OpenClaw with **API keys** (Anthropic/OpenAI/others) or with
**local‑only models** so your data stays on your device. Subscriptions (Claude
Pro/Max or OpenAI Codex) are optional ways to authenticate those providers.

### Can I use Claude Max subscription without an API key

Yes. You can authenticate with a **setup-token**
instead of an API key. This is the subscription path.

Yes. You can authenticate with a **setup-token**
instead of an API key. This is the subscription path.

### How does Anthropic setuptoken auth work

`claude setup-token` generates a **token string** via the Claude Code CLI (it is not available in the web console). You can run it on **any machine**. Choose **Anthropic token (paste setup-token)** in the wizard or paste it with `openclaw models auth paste-token --provider anthropic`. The token is stored as an auth profile for the **anthropic** provider and used like an API key (no auto-refresh). More detail: [OAuth](/zh/concepts/oauth).

### Where do I find an Anthropic setuptoken

It is **not** in the Anthropic Console. The setup-token is generated by the **Claude Code CLI** on **any machine**:

```bash
claude setup-token
```

It is **not** in the Anthropic Console. The setup-token is generated by the **Claude Code CLI** on **any machine**:

### Do you support Claude subscription auth (Claude Pro/Max)

Yes - via **setup-token**. OpenClaw no longer reuses Claude Code CLI OAuth tokens; use a setup-token or an Anthropic API key. Generate the token anywhere and paste it on the gateway host. See [Anthropic](/zh/providers/anthropic) and [OAuth](/zh/concepts/oauth).

Yes — via **setup-token**. OpenClaw no longer reuses Claude Code CLI OAuth tokens; use a setup-token or an Anthropic API key. Generate the token anywhere and paste it on the gateway host. See [Anthropic](/providers/anthropic) and [OAuth](/concepts/oauth).

### Why am I seeing HTTP 429 ratelimiterror from Anthropic

That means your **Anthropic quota/rate limit** is exhausted for the current window. If you
use a **Claude subscription** (setup-token or Claude Code OAuth), wait for the window to
reset or upgrade your plan. If you use an **Anthropic API key**, check the Anthropic Console
for usage/billing and raise limits as needed.

That means your **Anthropic quota/rate limit** is exhausted for the current window. If you
use a **Claude subscription** (setup‑token or Claude Code OAuth), wait for the window to
reset or upgrade your plan. If you use an **Anthropic API key**, check the Anthropic Console
for usage/billing and raise limits as needed.

### Is AWS Bedrock supported

Yes - via pi-ai's **Amazon Bedrock (Converse)** provider with **manual config**. You must supply AWS credentials/region on the gateway host and add a Bedrock provider entry in your models config. See [Amazon Bedrock](/zh/bedrock) and [Model providers](/zh/providers/models). If you prefer a managed key flow, an OpenAI-compatible proxy in front of Bedrock is still a valid option.

### How does Codex auth work

OpenClaw supports **OpenAI Code (Codex)** via OAuth (ChatGPT sign-in). The wizard can run the OAuth flow and will set the default model to `openai-codex/gpt-5.2` when appropriate. See [Model providers](/zh/concepts/model-providers) and [Wizard](/zh/start/wizard).

### Do you support OpenAI subscription auth Codex OAuth

Yes. OpenClaw fully supports **OpenAI Code (Codex) subscription OAuth**. The onboarding wizard
can run the OAuth flow for you.

Yes. OpenClaw fully supports **OpenAI Code (Codex) subscription OAuth**. The onboarding wizard
can run the OAuth flow for you.

### How do I set up Gemini CLI OAuth

Gemini CLI uses a **plugin auth flow**, not a client id or secret in `openclaw.json`.

Gemini CLI uses a **plugin auth flow**, not a client id or secret in `openclaw.json`.

1. Enable the plugin: `openclaw plugins enable google-gemini-cli-auth`
1. Enable the plugin: `openclaw plugins enable google-gemini-cli-auth`

This stores OAuth tokens in auth profiles on the gateway host. Details: [Model providers](/zh/concepts/model-providers).

### Is a local model OK for casual chats

Usually no. OpenClaw needs large context + strong safety; small cards truncate and leak. If you must, run the **largest** MiniMax M2.1 build you can locally (LM Studio) and see [/gateway/local-models](/zh/gateway/local-models). Smaller/quantized models increase prompt-injection risk - see [Security](/zh/gateway/security).

### How do I keep hosted model traffic in a specific region

Pick region-pinned endpoints. OpenRouter exposes US-hosted options for MiniMax, Kimi, and GLM; choose the US-hosted variant to keep data in-region. You can still list Anthropic/OpenAI alongside these by using `models.mode: "merge"` so fallbacks stay available while respecting the regioned provider you select.

### Do I have to buy a Mac Mini to install this

No. OpenClaw runs on macOS or Linux (Windows via WSL2). A Mac mini is optional - some people
buy one as an always-on host, but a small VPS, home server, or Raspberry Pi-class box works too.

No. OpenClaw runs on macOS or Linux (Windows via WSL2). A Mac mini is optional - some people
buy one as an always‑on host, but a small VPS, home server, or Raspberry Pi‑class box works too.

You only need a Mac **for macOS‑only tools**. For iMessage, you can keep the Gateway on Linux
and run `imsg` on any Mac over SSH by pointing `channels.imessage.cliPath` at an SSH wrapper.
If you want other macOS‑only tools, run the Gateway on a Mac or pair a macOS node.

### Do I need a Mac mini for iMessage support

You need **some macOS device** signed into Messages. It does **not** have to be a Mac mini -
any Mac works. **Use [BlueBubbles](/zh/channels/bluebubbles)** (recommended) for iMessage - the BlueBubbles server runs on macOS, while the Gateway can run on Linux or elsewhere.

You need **some macOS device** signed into Messages. It does **not** have to be a Mac mini -
any Mac works. OpenClaw’s iMessage integrations run on macOS (BlueBubbles or `imsg`), while
the Gateway can run elsewhere.

- Run the Gateway on Linux/VPS, and run the BlueBubbles server on any Mac signed into Messages.
- Run the Gateway on Linux/VPS, and point `channels.imessage.cliPath` at an SSH wrapper that
  runs `imsg` on the Mac.

Docs: [BlueBubbles](/zh/channels/bluebubbles), [Nodes](/zh/nodes),
[Mac remote mode](/zh/platforms/mac/remote).

### If I buy a Mac mini to run OpenClaw can I connect it to my MacBook Pro

Yes. The **Mac mini can run the Gateway**, and your MacBook Pro can connect as a
**node** (companion device). Nodes don't run the Gateway - they provide extra
capabilities like screen/camera/canvas and `system.run` on that device.

Yes. The **Mac mini can run the Gateway**, and your MacBook Pro can connect as a
**node** (companion device). Nodes don’t run the Gateway - they provide extra
capabilities like screen/camera/canvas and `system.run` on that device.

- Gateway on the Mac mini (always-on).
- Gateway on the Mac mini (always‑on).
- MacBook Pro runs the macOS app or a node host and pairs to the Gateway.

Docs: [Nodes](/zh/nodes), [Nodes CLI](/zh/cli/nodes).

### Can I use Bun

Bun is **not recommended**. We see runtime bugs, especially with WhatsApp and Telegram.
Use **Node** for stable gateways.

Bun is **not recommended**. We see runtime bugs, especially with WhatsApp and Telegram.
Use **Node** for stable gateways.

### Telegram what goes in allowFrom

`channels.telegram.allowFrom` is **the human sender's Telegram user ID** (numeric, recommended) or `@username`. It is not the bot username.

`channels.telegram.allowFrom` is **the human sender’s Telegram user ID** (numeric, recommended) or `@username`. It is not the bot username.

- DM your bot, then run `openclaw logs --follow` and read `from.id`.

Official Bot API:

- DM your bot, then call `https://api.telegram.org/bot<bot_token>/getUpdates` and read `message.from.id`.

Third-party (less private):

- DM `@userinfobot` or `@getidsbot`.

See [/channels/telegram](/zh/channels/telegram#access-control-dms--groups).

### Can multiple people use one WhatsApp number with different OpenClaw instances

Yes, via **multi-agent routing**. Bind each sender's WhatsApp **DM** (peer `kind: "dm"`, sender E.164 like `+15551234567`) to a different `agentId`, so each person gets their own workspace and session store. Replies still come from the **same WhatsApp account**, and DM access control (`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`) is global per WhatsApp account. See [Multi-Agent Routing](/zh/concepts/multi-agent) and [WhatsApp](/zh/channels/whatsapp).

### Can I run a fast chat agent and an Opus for coding agent

Yes. Use multi-agent routing: give each agent its own default model, then bind inbound routes (provider account or specific peers) to each agent. Example config lives in [Multi-Agent Routing](/zh/concepts/multi-agent). See also [Models](/zh/concepts/models) and [Configuration](/zh/gateway/configuration).

### Does Homebrew work on Linux

Yes. Homebrew supports Linux (Linuxbrew). Quick setup:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
brew install <formula>
```

Yes. Homebrew supports Linux (Linuxbrew). Quick setup:

### What's the difference between the hackable git install and npm install

- **Hackable (git) install:** full source checkout, editable, best for contributors.
  You run builds locally and can patch code/docs.
- **Hackable (git) install:** full source checkout, editable, best for contributors.
  You run builds locally and can patch code/docs.

Docs: [Getting started](/zh/start/getting-started), [Updating](/zh/install/updating).

### Can I switch between npm and git installs later

Yes. Install the other flavor, then run Doctor so the gateway service points at the new entrypoint.
This **does not delete your data** - it only changes the OpenClaw code install. Your state
(`~/.openclaw`) and workspace (`~/.openclaw/workspace`) stay untouched.

Yes. Install the other flavor, then run Doctor so the gateway service points at the new entrypoint.
This **does not delete your data** - it only changes the OpenClaw code install. Your state
(`~/.openclaw`) and workspace (`~/.openclaw/workspace`) stay untouched.

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
openclaw doctor
openclaw gateway restart
```

From npm → git:

```bash
npm install -g openclaw@latest
openclaw doctor
openclaw gateway restart
```

From git → npm:

Doctor detects a gateway service entrypoint mismatch and offers to rewrite the service config to match the current install (use `--repair` in automation).

### Should I run the Gateway on my laptop or a VPS

Short answer: **if you want 24/7 reliability, use a VPS**. If you want the
lowest friction and you're okay with sleep/restarts, run it locally.

Short answer: **if you want 24/7 reliability, use a VPS**. If you want the
lowest friction and you’re okay with sleep/restarts, run it locally.

- **Pros:** no server cost, direct access to local files, live browser window.
- **Pros:** no server cost, direct access to local files, live browser window.

**VPS / cloud**

- **Pros:** always-on, stable network, no laptop sleep issues, easier to keep running.
- **Pros:** always‑on, stable network, no laptop sleep issues, easier to keep running.

**OpenClaw-specific note:** WhatsApp/Telegram/Slack/Mattermost (plugin)/Discord all work fine from a VPS. The only real trade-off is **headless browser** vs a visible window. See [Browser](/zh/tools/browser).

**OpenClaw-specific note:** WhatsApp/Telegram/Slack/Mattermost (plugin)/Discord all work fine from a VPS. The only real trade-off is **headless browser** vs a visible window. See [浏览器](/tools/browser).

### How important is it to run OpenClaw on a dedicated machine

Not required, but **recommended for reliability and isolation**.

- **Dedicated host (VPS/Mac mini/Pi):** always-on, fewer sleep/reboot interruptions, cleaner permissions, easier to keep running.
- **Dedicated host (VPS/Mac mini/Pi):** always‑on, fewer sleep/reboot interruptions, cleaner permissions, easier to keep running.

If you want the best of both worlds, keep the Gateway on a dedicated host and pair your laptop as a **node** for local screen/camera/exec tools. See [Nodes](/zh/nodes).
For security guidance, read [Security](/zh/gateway/security).

### What are the minimum VPS requirements and recommended OS

OpenClaw is lightweight. For a basic Gateway + one chat channel:

- **Absolute minimum:** 1 vCPU, 1GB RAM, ~500MB disk.
- **Absolute minimum:** 1 vCPU, 1GB RAM, ~500MB disk.

OS: use **Ubuntu LTS** (or any modern Debian/Ubuntu). The Linux install path is best tested there.

OS: use **Ubuntu LTS** (or any modern Debian/Ubuntu). The Linux install path is best tested there.

### Can I run OpenClaw in a VM and what are the requirements

Yes. Treat a VM the same as a VPS: it needs to be always on, reachable, and have enough
RAM for the Gateway and any channels you enable.

Yes. Treat a VM the same as a VPS: it needs to be always on, reachable, and have enough
RAM for the Gateway and any channels you enable.

- **Absolute minimum:** 1 vCPU, 1GB RAM.
- **Absolute minimum:** 1 vCPU, 1GB RAM.
- **Recommended:** 2GB RAM or more if you run multiple channels, browser automation, or media tools.

If you are on Windows, **WSL2 is the easiest VM style setup** and has the best tooling
compatibility. See [Windows](/zh/platforms/windows), [VPS hosting](/zh/vps).
If you are running macOS in a VM, see [macOS VM](/zh/platforms/macos-vm).

## What is OpenClaw?

## What is OpenClaw?

OpenClaw is a personal AI assistant you run on your own devices. It replies on the messaging surfaces you already use (WhatsApp, Telegram, Slack, Mattermost (plugin), Discord, Google Chat, Signal, iMessage, WebChat) and can also do voice + a live Canvas on supported platforms. The **Gateway** is the always-on control plane; the assistant is the product.

### What's the value proposition

OpenClaw is not "just a Claude wrapper." It's a **local-first control plane** that lets you run a
capable assistant on **your own hardware**, reachable from the chat apps you already use, with
stateful sessions, memory, and tools - without handing control of your workflows to a hosted
SaaS.

OpenClaw is not “just a Claude wrapper.” It’s a **local-first control plane** that lets you run a
capable assistant on **your own hardware**, reachable from the chat apps you already use, with
stateful sessions, memory, and tools - without handing control of your workflows to a hosted
SaaS.

- **Your devices, your data:** run the Gateway wherever you want (Mac, Linux, VPS) and keep the
  workspace + session history local.
- **Your devices, your data:** run the Gateway wherever you want (Mac, Linux, VPS) and keep the
  workspace + session history local.
- **Real channels, not a web sandbox:** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc,
  plus mobile voice and Canvas on supported platforms.
- **Model-agnostic:** use Anthropic, OpenAI, MiniMax, OpenRouter, etc., with per‑agent routing
  and failover.
- **Local-only option:** run local models so **all data can stay on your device** if you want.
- **Multi-agent routing:** separate agents per channel, account, or task, each with its own
  workspace and defaults.

Docs: [Gateway](/zh/gateway), [Channels](/zh/channels), [Multi-agent](/zh/concepts/multi-agent),
[Memory](/zh/concepts/memory).

### I just set it up what should I do first

Good first projects:

- Build a website (WordPress, Shopify, or a simple static site).
- Build a website (WordPress, Shopify, or a simple static site).
- Prototype a mobile app (outline, screens, API plan).
- Organize files and folders (cleanup, naming, tagging).

It can handle large tasks, but it works best when you split them into phases and
use sub agents for parallel work.

### What are the top five everyday use cases for OpenClaw

Everyday wins usually look like:

- **Personal briefings:** summaries of inbox, calendar, and news you care about.
- **Personal briefings:** summaries of inbox, calendar, and news you care about.
- **Research and drafting:** quick research, summaries, and first drafts for emails or docs.
- **Reminders and follow ups:** cron or heartbeat driven nudges and checklists.
- **Browser automation:** filling forms, collecting data, and repeating web tasks.

### Can OpenClaw help with lead gen outreach ads and blogs for a SaaS

Yes for **research, qualification, and drafting**. It can scan sites, build shortlists,
summarize prospects, and write outreach or ad copy drafts.

Yes for **research, qualification, and drafting**. It can scan sites, build shortlists,
summarize prospects, and write outreach or ad copy drafts.

For **outreach or ad runs**, keep a human in the loop. Avoid spam, follow local laws and
platform policies, and review anything before it is sent. The safest pattern is to let
OpenClaw draft and you approve.

### What are the advantages vs Claude Code for web development

OpenClaw is a **personal assistant** and coordination layer, not an IDE replacement. Use
Claude Code or Codex for the fastest direct coding loop inside a repo. Use OpenClaw when you
want durable memory, cross-device access, and tool orchestration.

OpenClaw is a **personal assistant** and coordination layer, not an IDE replacement. Use
Claude Code or Codex for the fastest direct coding loop inside a repo. Use OpenClaw when you
want durable memory, cross-device access, and tool orchestration.

- **Persistent memory + workspace** across sessions
- **Persistent memory + workspace** across sessions
- **Multi-platform access** (WhatsApp, Telegram, TUI, WebChat)
- **Tool orchestration** (browser, files, scheduling, hooks)
- **Always-on Gateway** (run on a VPS, interact from anywhere)

Showcase: https://openclaw.ai/showcase

## Skills and automation

## Skills and automation

Use managed overrides instead of editing the repo copy. Put your changes in `~/.openclaw/skills/<name>/SKILL.md` (or add a folder via `skills.load.extraDirs` in `~/.openclaw/openclaw.json`). Precedence is `<workspace>/skills` > `~/.openclaw/skills` > bundled, so managed overrides win without touching git. Only upstream-worthy edits should live in the repo and go out as PRs.

### Can I load skills from a custom folder

Yes. Add extra directories via `skills.load.extraDirs` in `~/.openclaw/openclaw.json` (lowest precedence). Default precedence remains: `<workspace>/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`. `clawhub` installs into `./skills` by default, which OpenClaw treats as `<workspace>/skills`.

### How can I use different models for different tasks

Today the supported patterns are:

- **Cron jobs**: isolated jobs can set a `model` override per job.
- **Cron jobs**: isolated jobs can set a `model` override per job.
- **Sub-agents**: route tasks to separate agents with different default models.

See [Cron jobs](/zh/automation/cron-jobs), [Multi-Agent Routing](/zh/concepts/multi-agent), and [Slash commands](/zh/tools/slash-commands).

### The bot freezes while doing heavy work How do I offload that

Use **sub-agents** for long or parallel tasks. Sub-agents run in their own session,
return a summary, and keep your main chat responsive.

Use **sub-agents** for long or parallel tasks. Sub-agents run in their own session,
return a summary, and keep your main chat responsive.

Ask your bot to "spawn a sub-agent for this task" or use `/subagents`.
Use `/status` in chat to see what the Gateway is doing right now (and whether it is busy).

Token tip: long tasks and sub-agents both consume tokens. If cost is a concern, set a
cheaper model for sub-agents via `agents.defaults.subagents.model`.

### Cron or reminders do not fire What should I check

Cron runs inside the Gateway process. If the Gateway is not running continuously,
scheduled jobs will not run.

Cron runs inside the Gateway process. If the Gateway is not running continuously,
scheduled jobs will not run.

- Confirm cron is enabled (`cron.enabled`) and `OPENCLAW_SKIP_CRON` is not set.
- Confirm cron is enabled (`cron.enabled`) and `OPENCLAW_SKIP_CRON` is not set.
- Check the Gateway is running 24/7 (no sleep/restarts).

Debug:

```bash
openclaw cron run <jobId> --force
openclaw cron runs --id <jobId> --limit 50
```

Debug:

### How do I install skills on Linux

Use **ClawHub** (CLI) or drop skills into your workspace. The macOS Skills UI isn't available on Linux.
Browse skills at https://clawhub.com.

Use **ClawdHub** (CLI) or drop skills into your workspace. The macOS Skills UI isn’t available on Linux.
Browse skills at https://clawdhub.com.

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

### Can OpenClaw run tasks on a schedule or continuously in the background

Yes. Use the Gateway scheduler:

- **Cron jobs** for scheduled or recurring tasks (persist across restarts).
- **Cron jobs** for scheduled or recurring tasks (persist across restarts).
- **Heartbeat** for “main session” periodic checks.

Docs: [Cron jobs](/zh/automation/cron-jobs), [Cron vs Heartbeat](/zh/automation/cron-vs-heartbeat),
[Heartbeat](/zh/gateway/heartbeat).

Docs: [Cron 作业/automation/cron-jobs), [Cron vs Heartbeat/automation/cron-vs-heartbeat),
[Heartbeat](/gateway/heartbeat).

**Can I run Apple macOS only skills from Linux**

Not directly. macOS skills are gated by `metadata.openclaw.os` plus required binaries, and skills only appear in the system prompt when they are eligible on the **Gateway host**. On Linux, `darwin`-only skills (like `imsg`, `apple-notes`, `apple-reminders`) will not load unless you override the gating.

You have three supported patterns:

**Option A - run the Gateway on a Mac (simplest).**  
Run the Gateway where the macOS binaries exist, then connect from Linux in [remote mode](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere) or over Tailscale. The skills load normally because the Gateway host is macOS.

**Option B - use a macOS node (no SSH).**  
Run the Gateway on Linux, pair a macOS node (menubar app), and set **Node Run Commands** to "Always Ask" or "Always Allow" on the Mac. OpenClaw can treat macOS-only skills as eligible when the required binaries exist on the node. The agent runs those skills via the `nodes` tool. If you choose "Always Ask", approving "Always Allow" in the prompt adds that command to the allowlist.

1. Create an SSH wrapper for the binary (example: `memo` for Apple Notes):
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
   ```
1. Create an SSH wrapper for the binary (example: `imsg`):
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   exec ssh -T user@mac-host /opt/homebrew/bin/imsg "$@"
   ```
2. Put the wrapper on `PATH` on the Linux host (for example `~/bin/imsg`).
3. Override the skill metadata (workspace or `~/.openclaw/skills`) to allow Linux:
   ```markdown
   ---
   name: imsg
   description: iMessage/SMS CLI for listing chats, history, watch, and sending.
   metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["imsg"] } } }
   ---
   ```

### Do you have a Notion or HeyGen integration

For iMessage specifically, you can also point `channels.imessage.cliPath` at an SSH wrapper (OpenClaw only needs stdio). See [iMessage](/channels/imessage).

Options:

- **Custom skill / plugin:** best for reliable API access (Notion/HeyGen both have APIs).
- **Browser automation:** works without code but is slower and more fragile.

If you want to keep context per client (agency workflows), a simple pattern is:

- **Browser automation:** works without code but is slower and more fragile.
- Ask the agent to fetch that page at the start of a session.

If you want a native integration, open a feature request or build a skill
targeting those APIs.

Install skills:

```bash
clawhub install <skill-slug>
clawhub update --all
```

If you want a native integration, open a feature request or build a skill
targeting those APIs.

### How do I install the Chrome extension for browser takeover

ClawdHub installs into `./skills` under your current directory (or falls back to your configured OpenClaw workspace); OpenClaw treats that as `<workspace>/skills` on the next session. For shared skills across agents, place them in `~/.openclaw/skills/<name>/SKILL.md`. Some skills expect binaries installed via Homebrew; on Linux that means Linuxbrew (see the Homebrew Linux FAQ entry above). See [技能](/tools/skills) and [ClawdHub](/tools/clawdhub).

```bash
openclaw browser extension install
openclaw browser extension path
```

Then Chrome → `chrome://extensions` → enable "Developer mode" → "Load unpacked" → pick that folder.

Use the built-in installer, then load the unpacked extension in Chrome:

Then Chrome → `chrome://extensions` → enable “Developer mode” → “Load unpacked” → pick that folder.

## Sandboxing and memory

### Is there a dedicated sandboxing doc

Yes. See [Sandboxing](/zh/gateway/sandboxing). For Docker-specific setup (full gateway in Docker or sandbox images), see [Docker](/zh/install/docker).

### Is there a dedicated sandboxing doc

Yes. See [沙盒隔离](/gateway/sandboxing). For Docker-specific setup (full gateway in Docker or sandbox images), see [Docker](/install/docker).

- Persist `/home/node` with `OPENCLAW_HOME_VOLUME` so caches survive.
- Bake system deps into the image with `OPENCLAW_DOCKER_APT_PACKAGES`.
- Install Playwright browsers via the bundled CLI:
  `node /app/node_modules/playwright-core/cli.js install chromium`
- Set `PLAYWRIGHT_BROWSERS_PATH` and ensure the path is persisted.

Key config reference: [Gateway 配置](/gateway/configuration#agentsdefaultssandbox)

**Can I keep DMs personal but make groups public sandboxed with one agent**

Set `agents.defaults.sandbox.docker.binds` to `["host:path:mode"]` (e.g., `"/home/user/src:/src:ro"`). Global + per-agent binds merge; per-agent binds are ignored when `scope: "shared"`. Use `:ro` for anything sensitive and remember binds bypass the sandbox filesystem walls. See [沙盒隔离](/gateway/sandboxing#custom-bind-mounts) and [沙盒 vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) for examples and safety notes.

Use `agents.defaults.sandbox.mode: "non-main"` so group/channel sessions (non-main keys) run in Docker, while the main DM session stays on-host. Then restrict what tools are available in sandboxed sessions via `tools.sandbox.tools`.

OpenClaw memory is just Markdown files in the agent workspace:

Key config reference: [Gateway configuration](/zh/gateway/configuration#agentsdefaultssandbox)

### How do I bind a host folder into the sandbox

OpenClaw also runs a **silent pre-compaction memory flush** to remind the model
to write durable notes before auto-compaction. This only runs when the workspace
is writable (read-only sandboxes skip it). See [记忆](/concepts/memory).

### Memory keeps forgetting things How do I make it stick

Ask the bot to **write the fact to memory**. Long-term notes belong in `MEMORY.md`,
short-term context goes into `memory/YYYY-MM-DD.md`.

- Daily notes in `memory/YYYY-MM-DD.md`
- Curated long-term notes in `MEMORY.md` (main/private sessions only)

OpenClaw also runs a **silent pre-compaction memory flush** to remind the model
to write durable notes before auto-compaction. This only runs when the workspace
is writable (read-only sandboxes skip it). See [Memory](/zh/concepts/memory).

### Memory keeps forgetting things How do I make it stick

If you don’t set a provider explicitly, OpenClaw auto-selects a provider when it
can resolve an API key (auth profiles, `models.providers.*.apiKey`, or env vars).
It prefers OpenAI if an OpenAI key resolves, otherwise Gemini if a Gemini key
resolves. If neither key is available, memory search stays disabled until you
configure it. If you have a local model path configured and present, OpenClaw
prefers `local`.

If you’d rather stay local, set `memorySearch.provider = "local"` (and optionally
`memorySearch.fallback = "none"`). If you want Gemini embeddings, set
`memorySearch.provider = "gemini"` and provide `GEMINI_API_KEY` (or
`memorySearch.remote.apiKey`). We support **OpenAI, Gemini, or local** embedding
models - see [记忆](/concepts/memory) for the setup details.

Docs: [Memory](/zh/concepts/memory), [Agent workspace](/zh/concepts/agent-workspace).

### Does semantic memory search require an OpenAI API key

Docs: [记忆](/concepts/memory), [上下文](/concepts/context).

If you don't set a provider explicitly, OpenClaw auto-selects a provider when it
can resolve an API key (auth profiles, `models.providers.*.apiKey`, or env vars).
It prefers OpenAI if an OpenAI key resolves, otherwise Gemini if a Gemini key
resolves. If neither key is available, memory search stays disabled until you
configure it. If you have a local model path configured and present, OpenClaw
prefers `local`.

If you'd rather stay local, set `memorySearch.provider = "local"` (and optionally
`memorySearch.fallback = "none"`). If you want Gemini embeddings, set
`memorySearch.provider = "gemini"` and provide `GEMINI_API_KEY` (or
`memorySearch.remote.apiKey`). We support **OpenAI, Gemini, or local** embedding
models - see [Memory](/zh/concepts/memory) for the setup details.

### Does memory persist forever What are the limits

Memory files live on disk and persist until you delete them. The limit is your
storage, not the model. The **session context** is still limited by the model
context window, so long conversations can compact or truncate. That is why
memory search exists - it pulls only the relevant parts back into context.

Docs: [Memory](/zh/concepts/memory), [Context](/zh/concepts/context).

## Where things live on disk

### Is all data used with OpenClaw saved locally

No - **OpenClaw's state is local**, but **external services still see what you send them**.

- **Local by default:** sessions, memory files, config, and workspace live on the Gateway host
  (`~/.openclaw` + your workspace directory).
- **Remote by necessity:** messages you send to model providers (Anthropic/OpenAI/etc.) go to
  their APIs, and chat platforms (WhatsApp/Telegram/Slack/etc.) store message data on their
  servers.
- **You control the footprint:** using local models keeps prompts on your machine, but channel
  traffic still goes through the channel's servers.

Related: [Agent workspace](/zh/concepts/agent-workspace), [Memory](/zh/concepts/memory).

### Where does OpenClaw store its data

Everything lives under `$OPENCLAW_STATE_DIR` (default: `~/.openclaw`):

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

Default workspace is `~/.openclaw/workspace`, configurable via:

### Where should AGENTSmd SOULmd USERmd MEMORYmd live

Tip: if you want a durable behavior or preference, ask the bot to **write it into
AGENTS.md or MEMORY.md** rather than relying on chat history.

- **Workspace (per agent)**: `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
  `MEMORY.md` (or `memory.md`), `memory/YYYY-MM-DD.md`, optional `HEARTBEAT.md`.
- **State dir (`~/.openclaw`)**: config, credentials, auth profiles, sessions, logs,
  and shared skills (`~/.openclaw/skills`).

Put your **agent workspace** in a **private** git repo and back it up somewhere
private (for example GitHub private). This captures memory + AGENTS/SOUL/USER
files, and lets you restore the assistant’s “mind” later.

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

Do **not** commit anything under `~/.openclaw` (credentials, sessions, tokens).
If you need a full restore, back up both the workspace and the state directory
separately (see the migration question above).

Docs: [Agent 工作区](/concepts/agent-workspace).

See [Agent workspace](/zh/concepts/agent-workspace) and [Memory](/zh/concepts/memory).

### What's the recommended backup strategy

Put your **agent workspace** in a **private** git repo and back it up somewhere
private (for example GitHub private). This captures memory + AGENTS/SOUL/USER
files, and lets you restore the assistant's "mind" later.

Yes. The workspace is the **default cwd** and memory anchor, not a hard sandbox.
Relative paths resolve inside the workspace, but absolute paths can access other
host locations unless sandboxing is enabled. If you need isolation, use
[`agents.defaults.sandbox`](/gateway/sandboxing) or per‑agent sandbox settings. If you
want a repo to be the default working directory, point that agent’s
`workspace` to the repo root. The OpenClaw repo is just source code; keep the
workspace separate unless you intentionally want the agent to work inside it.

Example (repo as default cwd):

### Im in remote mode where is the session store

Session state is owned by the **gateway host**. If you’re in remote mode, the session store you care about is on the remote machine, not your local laptop. See [会话 management](/concepts/session).

## Config basics

Yes. The workspace is the **default cwd** and memory anchor, not a hard sandbox.
Relative paths resolve inside the workspace, but absolute paths can access other
host locations unless sandboxing is enabled. If you need isolation, use
[`agents.defaults.sandbox`](/zh/gateway/sandboxing) or per-agent sandbox settings. If you
want a repo to be the default working directory, point that agent's
`workspace` to the repo root. The OpenClaw repo is just source code; keep the
workspace separate unless you intentionally want the agent to work inside it.

OpenClaw reads an optional **JSON5** config from `$OPENCLAW_CONFIG_PATH` (default: `~/.openclaw/openclaw.json`):

```json5
{
  agents: {
    defaults: {
      workspace: "~/Projects/my-repo",
    },
  },
}
```

### Im in remote mode where is the session store

Session state is owned by the **gateway host**. If you're in remote mode, the session store you care about is on the remote machine, not your local laptop. See [Session management](/zh/concepts/session).

## Config basics

### What format is the config Where is it

OpenClaw reads an optional **JSON5** config from `$OPENCLAW_CONFIG_PATH` (default: `~/.openclaw/openclaw.json`):

```
$OPENCLAW_CONFIG_PATH
```

If the file is missing, it uses safe-ish defaults (including a default workspace of `~/.openclaw/workspace`).

### Why do I need a token on localhost now

The wizard generates a gateway token by default (even on loopback) so **local WS clients must authenticate**. This blocks other local processes from calling the Gateway. Paste the token into the Control UI settings (or your client config) to connect.

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

If you **really** want open loopback, remove `gateway.auth` from your config. Doctor can generate a token for you any time: `openclaw doctor --generate-gateway-token`.

- `gateway.remote.token` is for **remote CLI calls** only; it does not enable local gateway auth.
- The Control UI authenticates via `connect.params.auth.token` (stored in app/UI settings). Avoid putting tokens in URLs.

### Why do I need a token on localhost now

The wizard generates a gateway token by default (even on loopback) so **local WS clients must authenticate**. This blocks other local processes from calling the Gateway. Paste the token into the Control UI settings (or your client config) to connect.

If you **really** want open loopback, remove `gateway.auth` from your config. Doctor can generate a token for you any time: `openclaw doctor --generate-gateway-token`.

### Do I have to restart after changing config

Notes:

- If you use allowlists, add `web_search`/`web_fetch` or `group:web`.
- `web_fetch` is enabled by default (unless explicitly disabled).

### How do I enable web search and web fetch

Docs: [Web 工具](/tools/web).

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

If you **really** want open loopback, remove `gateway.auth` from your config. Doctor can generate a token for you any time: `openclaw doctor --generate-gateway-token`.

- If you use allowlists, add `web_search`/`web_fetch` or `group:web`.
- **Gateway (central):** owns channels (Signal/WhatsApp), routing, and sessions.
- **Nodes (devices):** Macs/iOS/Android connect as peripherals and expose local tools (`system.run`, `canvas`, `camera`).

Docs: [Web tools](/zh/tools/web).

### How do I run a central Gateway with specialized workers across devices

The common pattern is **one Gateway** (e.g. Raspberry Pi) plus **nodes** and **agents**:

- **Gateway (central):** owns channels (Signal/WhatsApp), routing, and sessions.
- **Nodes (devices):** Macs/iOS/Android connect as peripherals and expose local tools (`system.run`, `canvas`, `camera`).
- **Agents (workers):** separate brains/workspaces for special roles (e.g. "Hetzner ops", "Personal data").
- **Sub-agents:** spawn background work from a main agent when you want parallelism.
- **TUI:** connect to the Gateway and switch agents/sessions.

Docs: [Nodes](/zh/nodes), [Remote access](/zh/gateway/remote), [Multi-Agent Routing](/zh/concepts/multi-agent), [Sub-agents](/zh/tools/subagents), [TUI](/zh/tui).

### Can the OpenClaw browser run headless

Yes. It's a config option:

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

Set `browser.executablePath` to your Brave binary (or any Chromium-based browser) and restart the Gateway.
See the full config examples in [浏览器](/tools/browser#use-brave-or-another-chromium-based-browser).

Headless uses the **same Chromium engine** and works for most automation (forms, clicks, scraping, logins). The main differences:

- No visible browser window (use screenshots if you need visuals).
- Some sites are stricter about automation in headless mode (CAPTCHAs, anti-bot).
  For example, X/Twitter often blocks headless sessions.

### How do I use Brave for browser control

Nodes don’t see inbound provider traffic; they only receive node RPC calls.

### How can my agent access my computer if the Gateway is hosted remotely

### How do commands propagate between Telegram the gateway and nodes

Typical setup:

Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

Nodes don't see inbound provider traffic; they only receive node RPC calls.

### How can my agent access my computer if the Gateway is hosted remotely

Short answer: **pair your computer as a node**. The Gateway runs elsewhere, but it can
call `node.*` tools (screen, camera, system) on your local machine over the Gateway WebSocket.

Typical setup:

1. Run the Gateway on the always-on host (VPS/home server).
2. Put the Gateway host + your computer on the same tailnet.
3. Ensure the Gateway WS is reachable (tailnet bind or SSH tunnel).
4. Open the macOS app locally and connect in **Remote over SSH** mode (or direct tailnet)
   so it can register as a node.
5. Approve the node on the Gateway:
   ```bash
   openclaw nodes pending
   openclaw nodes approve <requestId>
   ```

No separate TCP bridge is required; nodes connect over the Gateway WebSocket.

Security reminder: pairing a macOS node allows `system.run` on that machine. Only
pair devices you trust, and review [Security](/zh/gateway/security).

Docs: [Nodes](/zh/nodes), [Gateway protocol](/zh/gateway/protocol), [macOS remote mode](/zh/platforms/mac/remote), [Security](/zh/gateway/security).

### Tailscale is connected but I get no replies What now

Check the basics:

- If you connect via SSH tunnel, confirm the local tunnel is up and points at the right port.
- Confirm your allowlists (DM or group) include your account.
- Channel health: `openclaw channels status`

Then verify auth and routing:

- If you use Tailscale Serve, make sure `gateway.auth.allowTailscale` is set correctly.
- If you connect via SSH tunnel, confirm the local tunnel is up and points at the right port.
- Confirm your allowlists (DM or group) include your account.

Example pattern (run from a machine that can reach the target Gateway):

### Can two OpenClaw instances talk to each other local VPS

Docs: [远程访问](/gateway/remote), [Agent CLI/cli/agent), [Agent 发送](/tools/agent-send).

**Simplest:** use a normal chat channel both bots can access (Telegram/Slack/WhatsApp).
Have Bot A send a message to Bot B, then let Bot B reply as usual.

No. One Gateway can host multiple agents, each with its own workspace, model defaults,
and routing. That is the normal setup and it is much cheaper and simpler than running
one VPS per agent.

Use separate VPSes only when you need hard isolation (security boundaries) or very
different configs that you do not want to share. Otherwise, keep one Gateway and
use multiple agents or sub-agents.

```bash
openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
```

Tip: add a guardrail so the two bots do not loop endlessly (mention-only, channel
allowlists, or a "do not reply to bot messages" rule).

Yes - nodes are the first‑class way to reach your laptop from a remote Gateway, and they
unlock more than shell access. The Gateway runs on macOS/Linux (Windows via WSL2) and is
lightweight (a small VPS or Raspberry Pi-class box is fine; 4 GB RAM is plenty), so a common
setup is an always‑on host plus your laptop as a node.

### Do I need separate VPSes for multiple agents

No. One Gateway can host multiple agents, each with its own workspace, model defaults,
and routing. That is the normal setup and it is much cheaper and simpler than running
one VPS per agent.

Use separate VPSes only when you need hard isolation (security boundaries) or very
different configs that you do not want to share. Otherwise, keep one Gateway and
use multiple agents or sub-agents.

### Is there a benefit to using a node on my personal laptop instead of SSH from a VPS

SSH is fine for ad‑hoc shell access, but nodes are simpler for ongoing agent workflows and
device automation.

- **No inbound SSH required.** Nodes connect out to the Gateway WebSocket and use device pairing.
- **Safer execution controls.** `system.run` is gated by node allowlists/approvals on that laptop.
- **More device tools.** Nodes expose `canvas`, `camera`, and `screen` in addition to `system.run`.
- **Local browser automation.** Keep the Gateway on a VPS, but run Chrome locally and relay control
  with the Chrome extension + a node host on the laptop.

Docs: [节点](/nodes), [节点 CLI](/cli/nodes), [多 Gateway](/gateway/multiple-gateways).

Docs: [Nodes](/zh/nodes), [Nodes CLI](/zh/cli/nodes), [Chrome extension](/zh/tools/chrome-extension).

### Should I install on a second laptop or just add a node

A full restart is required for `gateway`, `discovery`, and `canvasHost` changes.

Install a second Gateway only when you need **hard isolation** or two fully separate bots.

Yes. `config.apply` validates + writes the full config and restarts the Gateway as part of the operation.

### configapply wiped my config How do I recover and avoid this

`config.apply` replaces the **entire config**. If you send a partial object, everything
else is removed.

Recover:

### Is there an API RPC way to apply config

Yes. `config.apply` validates + writes the full config and restarts the Gateway as part of the operation.

### configapply wiped my config How do I recover and avoid this

`config.apply` replaces the **entire config**. If you send a partial object, everything
else is removed.

Avoid it:

- Use `openclaw config set` for small changes.
- Use `openclaw configure` for interactive edits.
- If this was unexpected, file a bug and include your last known config or any backup.
- A local coding agent can often reconstruct a working config from logs or history.

This sets your workspace and restricts who can trigger the bot.

- Use `openclaw config set` for small changes.
- Use `openclaw configure` for interactive edits.

Docs: [Config](/zh/cli/config), [Configure](/zh/cli/configure), [Doctor](/zh/gateway/doctor).

### What's a minimal sane config for a first install

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

This sets your workspace and restricts who can trigger the bot.

### How do I set up Tailscale on a VPS and connect from my Mac

If you want the Control UI without SSH, use Tailscale Serve on the VPS:

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

This keeps the gateway bound to loopback and exposes HTTPS via Tailscale. See [Tailscale](/zh/gateway/tailscale).

### How do I connect a Mac node to a remote Gateway Tailscale Serve

Docs: [Gateway 协议](/gateway/protocol), [发现](/gateway/discovery), [macOS 远程模式/platforms/mac/remote).

Recommended setup:

1. **Make sure the VPS + Mac are on the same tailnet**.
2. **Use the macOS app in Remote mode** (SSH target can be the tailnet hostname).
   The app will tunnel the Gateway port and connect as a node.
- `.env` from the current working directory

Docs: [Gateway protocol](/zh/gateway/protocol), [Discovery](/zh/gateway/discovery), [macOS remote mode](/zh/platforms/mac/remote).

## Env vars and .env loading

### How does OpenClaw load environment variables

See [/environment](/zh/environment) for full precedence and sources.

- `.env` from the current working directory
- a global fallback `.env` from `~/.openclaw/.env` (aka `$OPENCLAW_STATE_DIR/.env`)

Neither `.env` file overrides existing env vars.

You can also define inline env vars in config (applied only if missing from the process env):

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

This runs your login shell and imports only missing expected keys (never overrides). Env var equivalents:
`OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

### I set COPILOTGITHUBTOKEN but models status shows Shell env off Why

`openclaw models status` reports whether **shell env import** is enabled. “Shell env: off”
does **not** mean your env vars are missing - it just means OpenClaw won’t load
your login shell automatically.

1. Put the missing keys in `~/.openclaw/.env` so they're picked up even when the service doesn't inherit your shell env.
1. Put the token in `~/.openclaw/.env`:
   ```
   COPILOT_GITHUB_TOKEN=...
   ```

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

This runs your login shell and imports only missing expected keys (never overrides). Env var equivalents:
`OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

### I set COPILOTGITHUBTOKEN but models status shows Shell env off Why

Then restart the gateway and recheck:

Copilot tokens are read from `COPILOT_GITHUB_TOKEN` (also `GH_TOKEN` / `GITHUB_TOKEN`).
See [/concepts/model-providers](/zh/concepts/model-providers) and [/environment](/zh/environment).

1. Put the token in `~/.openclaw/.env`:
   ```
   COPILOT_GITHUB_TOKEN=...
   ```
2. Or enable shell import (`env.shellEnv.enabled: true`).
3. Or add it to your config `env` block (applies only if missing).

Then restart the gateway and recheck:

```bash
openclaw models status
```

Yes. Sessions expire after `session.idleMinutes` (default **60**). The **next**
message starts a fresh session id for that chat key. This does not delete
transcripts - it just starts a new session.

### Is there a way to make a team of OpenClaw instances one CEO and many agents

### How do I start a fresh conversation

That said, this is best seen as a **fun experiment**. It is token heavy and often
less efficient than using one bot with separate sessions. The typical model we
envision is one bot you talk to, with different sessions for parallel work. That
bot can also spawn sub-agents when needed.

### Do sessions reset automatically if I never send new

Yes. Sessions expire after `session.idleMinutes` (default **60**). The **next**
message starts a fresh session id for that chat key. This does not delete
transcripts - it just starts a new session.

```json5
{
  session: {
    idleMinutes: 240,
  },
}
```

### Is there a way to make a team of OpenClaw instances one CEO and many agents

What helps:

That said, this is best seen as a **fun experiment**. It is token heavy and often
less efficient than using one bot with separate sessions. The typical model we
envision is one bot you talk to, with different sessions for parallel work. That
bot can also spawn sub-agents when needed.

Docs: [Multi-agent routing](/zh/concepts/multi-agent), [Sub-agents](/zh/tools/subagents), [Agents CLI](/zh/cli/agents).

### Why did context get truncated midtask How do I prevent it

Session context is limited by the model window. Long chats, large tool outputs, or many
files can trigger compaction or truncation.

What helps:

- Ask the bot to summarize the current state and write it to a file.
- Use `/compact` before long tasks, and `/new` when switching topics.
- Keep important context in the workspace and ask the bot to read it back.
- Use sub-agents for long or parallel work so the main chat stays smaller.
- Pick a model with a larger context window if this happens often.

### How do I completely reset OpenClaw but keep it installed

Use the reset command:

```bash
openclaw reset
```

Non-interactive full reset:

```bash
openclaw reset --scope full --yes --non-interactive
```

Then re-run onboarding:

```bash
openclaw onboard --install-daemon
```

If you **really** want open loopback, remove `gateway.auth` from your config. Doctor can generate a token for you any time: `openclaw doctor --generate-gateway-token`.

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
- Dev reset: `openclaw gateway --dev --reset` (dev-only; wipes dev config + credentials + sessions + workspace).

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

This is a provider validation error: the model emitted a `tool_use` block without the required
`input`. It usually means the session history is stale or corrupted (often after long threads
or a tool/schema change).

- Enable or tune **session pruning** (`agents.defaults.contextPruning`) to trim old tool output.
- Use a model with a larger context window.

Heartbeats run every **30m** by default. Tune or disable them:

### Why am I seeing LLM request rejected messagesNcontentXtooluseinput Field required

Per-agent overrides use `agents.list[].heartbeat`. Docs: [Heartbeat](/gateway/heartbeat).

Fix: start a fresh session with `/new` (standalone message).

### Why am I getting heartbeat messages every 30 minutes

If you want only **you** to be able to trigger group replies:

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

If `HEARTBEAT.md` exists but is effectively empty (only blank lines and markdown
headers like `# Heading`), OpenClaw skips the heartbeat run to save API calls.
If the file is missing, the heartbeat still runs and the model decides what to do.

Option 1 (fastest): tail logs and send a test message in the group:

### Do I need to add a bot account to a WhatsApp group

Option 2 (if already configured/allowlisted): list groups from config:

Docs: [WhatsApp](/channels/whatsapp), [目录/cli/directory), [日志/cli/logs).

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

### Why doesnt OpenClaw reply in a group

Two common causes:

```bash
openclaw logs --follow --json
```

Look for `chatId` (or `from`) ending in `@g.us`, like:
`1234567890-1234567890@g.us`.

Option 2 (if already configured/allowlisted): list groups from config:

```bash
openclaw directory groups list --channel whatsapp
```

See [群组](/concepts/groups) and [群组消息](/concepts/group-messages).

### Do groupsthreads share context with DMs

Direct chats collapse to the main session by default. Groups/channels have their own session keys, and Telegram topics / Discord threads are separate sessions. See [群组](/concepts/groups) and [群组消息](/concepts/group-messages).

- Mention gating is on (default). You must @mention the bot (or match `mentionPatterns`).
- You configured `channels.whatsapp.groups` without `"*"` and the group isn't allowlisted.

See [Groups](/zh/concepts/groups) and [Group messages](/zh/concepts/group-messages).

### Do groupsthreads share context with DMs

Direct chats collapse to the main session by default. Groups/channels have their own session keys, and Telegram topics / Discord threads are separate sessions. See [Groups](/zh/concepts/groups) and [Group messages](/zh/concepts/group-messages).

### How many workspaces and agents can I create

No hard limits. Dozens (even hundreds) are fine, but watch for:

- Prune old sessions (delete JSONL or store entries) if disk grows.
- Use `openclaw doctor` to spot stray workspaces and profile mismatches.
- **Ops overhead:** per-agent auth profiles, workspaces, and channel routing.

Yes. Use **Multi‑Agent Routing** to run multiple isolated agents and route inbound messages by
channel/account/peer. Slack is supported as a channel and can be bound to specific agents.

- Keep one **active** workspace per agent (`agents.defaults.workspace`).
- Prune old sessions (delete JSONL or store entries) if disk grows.
- Always‑on Gateway host (VPS/Mac mini).

### Can I run multiple bots or chats at the same time Slack and how should I set that up

Yes. Use **Multi-Agent Routing** to run multiple isolated agents and route inbound messages by
channel/account/peer. Slack is supported as a channel and can be bound to specific agents.

Browser access is powerful but not "do anything a human can" - anti-bot, CAPTCHAs, and MFA can
still block automation. For the most reliable browser control, use the Chrome extension relay
on the machine that runs the browser (and keep the Gateway anywhere).

Docs: [Multi‑Agent Routing](/concepts/multi-agent), [Slack](/channels/slack),
[浏览器](/tools/browser), [Chrome 扩展](/tools/chrome-extension), [节点](/nodes).

- Always-on Gateway host (VPS/Mac mini).
- One agent per role (bindings).
- Slack channel(s) bound to those agents.
- Local browser via extension relay (or a node) when needed.

Docs: [Multi-Agent Routing](/zh/concepts/multi-agent), [Slack](/zh/channels/slack),
[Browser](/zh/tools/browser), [Chrome extension](/zh/tools/chrome-extension), [Nodes](/zh/nodes).

## Models: defaults, selection, aliases, switching

### What is the default model

Rule of thumb: use the **best model you can afford** for high-stakes work, and a cheaper
model for routine chat or summaries. You can route models per agent and use sub-agents to
parallelize long tasks (each sub-agent consumes tokens). See [模型](/concepts/models) and
[子 Agent](/tools/subagents).

```
agents.defaults.model.primary
```

Strong warning: weaker/over-quantized models are more vulnerable to prompt
injection and unsafe behavior. See [安全](/gateway/security).

### What model do you recommend

**Recommended default:** `anthropic/claude-opus-4-5`.
**Good alternative:** `anthropic/claude-sonnet-4-5`.
**Reliable (less character):** `openai/gpt-5.2` - nearly as good as Opus, just less personality.
**Budget:** `zai/glm-4.7`.

Yes. If your local server exposes an OpenAI-compatible API, you can point a
custom provider at it. Ollama is supported directly and is the easiest path.

Security note: smaller or heavily quantized models are more vulnerable to prompt
injection. We strongly recommend **large models** for any bot that can use tools.
If you still want small models, enable sandboxing and strict tool allowlists.

Docs: [Ollama](/providers/ollama), [本地模型](/gateway/local-models),
[模型 providers](/concepts/model-providers), [安全](/gateway/security),
[沙盒隔离](/gateway/sandboxing).

More context: [Models](/zh/concepts/models).

### Can I use selfhosted models llamacpp vLLM Ollama

Safe options:

Security note: smaller or heavily quantized models are more vulnerable to prompt
injection. We strongly recommend **large models** for any bot that can use tools.
If you still want small models, enable sandboxing and strict tool allowlists.

Docs: [Ollama](/zh/providers/ollama), [Local models](/zh/gateway/local-models),
[Model providers](/zh/concepts/model-providers), [Security](/zh/gateway/security),
[Sandboxing](/zh/gateway/sandboxing).

### How do I switch models without wiping my config

Use **model commands** or edit only the **model** fields. Avoid full config replaces.

Avoid `config.apply` with a partial object unless you intend to replace the whole config.
If you did overwrite config, restore from backup or re-run `openclaw doctor` to repair.

- `/model` in chat (quick, per-session)
- `openclaw models set ...` (updates just model config)
- **OpenClaw + Flawd:** Anthropic Opus (`anthropic/claude-opus-4-5`) - see [Anthropic](/providers/anthropic).
- **Krill:** MiniMax M2.1 (`minimax/MiniMax-M2.1`) - see [MiniMax](/providers/minimax).

Avoid `config.apply` with a partial object unless you intend to replace the whole config.
If you did overwrite config, restore from backup or re-run `openclaw doctor` to repair.

Use the `/model` command as a standalone message:

### What do OpenClaw, Flawd, and Krill use for models

- **OpenClaw + Flawd:** Anthropic Opus (`anthropic/claude-opus-4-5`) - see [Anthropic](/zh/providers/anthropic).
- **Krill:** MiniMax M2.1 (`minimax/MiniMax-M2.1`) - see [MiniMax](/zh/providers/minimax).

### How do I switch models on the fly without restarting

**How do I unpin a profile I set with profile**

```
/model sonnet
/model haiku
/model opus
/model gpt
/model gpt-mini
/model gemini
/model gemini-flash
```

Re-run `/model` **without** the `@profile` suffix:

If you want to return to the default, pick it from `/model` (or send `/model <default provider/model>`).
Use `/model status` to confirm which auth profile is active.

```
/model 3
```

You can also force a specific auth profile for the provider (per session):

```
/model opus@anthropic:default
/model opus@anthropic:work
```

Yes. Set one as default and switch as needed:

**How do I unpin a profile I set with profile**

Re-run `/model` **without** the `@profile` suffix:

```
/model anthropic/claude-opus-4-5
```

If you want to return to the default, pick it from `/model` (or send `/model <default provider/model>`).
Use `/model status` to confirm which auth profile is active.

### Can I use GPT 5.2 for daily tasks and Codex 5.2 for coding

Yes. Set one as default and switch as needed:

- **Quick switch (per session):** `/model gpt-5.2` for daily tasks, `/model gpt-5.2-codex` for coding.
- **Default + switch:** set `agents.defaults.model.primary` to `openai-codex/gpt-5.2`, then switch to `openai-codex/gpt-5.2-codex` when coding (or the other way around).
- **Sub-agents:** route coding tasks to sub-agents with a different default model.

This means the **provider isn’t configured** (no MiniMax provider config or auth
profile was found), so the model can’t be resolved. A fix for this detection is
in **2026.1.12** (unreleased at the time of writing).

### Why do I see Model is not allowed and then no reply

If `agents.defaults.models` is set, it becomes the **allowlist** for `/model` and any
session overrides. Choosing a model that isn't in that list returns:

```
Model "provider/model" is not allowed. Use /model to list available models.
```

That error is returned **instead of** a normal reply. Fix: add the model to
`agents.defaults.models`, remove the allowlist, or pick a model from `/model list`.

### Why do I see Unknown model minimaxMiniMaxM21

This means the **provider isn't configured** (no MiniMax provider config or auth
profile was found), so the model can't be resolved. A fix for this detection is
in **2026.1.12** (unreleased at the time of writing).

See [MiniMax](/providers/minimax) and [模型](/concepts/models).

1. Upgrade to **2026.1.12** (or run from source `main`), then restart the gateway.
2. Make sure MiniMax is configured (wizard or JSON), or that a MiniMax API key
   exists in env/auth profiles so the provider can be injected.
3. Use the exact model id (case-sensitive): `minimax/MiniMax-M2.1` or
   `minimax/MiniMax-M2.1-lightning`.
4. Run:
   ```bash
   openclaw models list
   ```
   and pick from the list (or `/model list` in chat).

**Option B: separate agents**

### Can I use MiniMax as my default and OpenAI for complex tasks

Yes. Use **MiniMax as the default** and switch models **per session** when needed.
Fallbacks are for **errors**, not "hard tasks," so use `/model` or a separate agent.

**Option A: switch per session**

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

Docs: [模型](/zh/concepts/models), [多 Agent 路由](/zh/concepts/multi-agent), [MiniMax](/zh/providers/minimax), [OpenAI](/zh/providers/openai).

```
/model gpt
```

**Option B: separate agents**

- Agent A default: MiniMax
- `opus` → `anthropic/claude-opus-4-5`
- `sonnet` → `anthropic/claude-sonnet-4-5`

Docs: [Models](/zh/concepts/models), [Multi-Agent Routing](/zh/concepts/multi-agent), [MiniMax](/zh/providers/minimax), [OpenAI](/zh/providers/openai).

### Are opus sonnet gpt builtin shortcuts

Yes. OpenClaw ships a few default shorthands (only applied when the model exists in `agents.defaults.models`):

- `gemini-flash` → `google/gemini-3-flash-preview`
- `sonnet` → `anthropic/claude-sonnet-4-5`
- `gpt` → `openai/gpt-5.2`
- `gpt-mini` → `openai/gpt-5-mini`
- `gemini` → `google/gemini-3-pro-preview`
- `gemini-flash` → `google/gemini-3-flash-preview`

OpenRouter（按 token 计费；模型众多）：

### How do I defineoverride model shortcuts aliases

如果你引用了某个 provider/model，但缺少所需的 provider key，你会得到运行时 auth 错误（例如 `No API key found for provider "zai"`）。

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

**No API key found for provider after adding a new agent**

### How do I add models from other providers like OpenRouter or ZAI

修复选项：

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

If you reference a provider/model but the required provider key is missing, you'll get a runtime auth error (e.g. `No API key found for provider "zai"`).

不要在多个 agent 之间复用 `agentDir`；这会导致 auth/session 冲突。

This usually means the **new agent** has an empty auth store. Auth is per-agent and
stored in:

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

Fix options:

- Run `openclaw agents add <id>` and configure auth during the wizard.
1. 在同一 provider 内进行 **Auth profile 轮换**。

Do **not** reuse `agentDir` across agents; it causes auth/session collisions.

## Model failover and "All models failed"

### What does this error mean

说明系统尝试使用 auth profile ID `anthropic:default`，但在预期的 auth 存储中找不到凭据。

1. **Auth profile rotation** within the same provider.
- **确认 auth profiles 的位置**（新路径 vs 旧路径）
  - 当前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - 旧路径：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）

Cooldowns apply to failing profiles (exponential backoff), so OpenClaw can keep responding even when a provider is rate-limited or temporarily failing.

### What does this error mean

```
No credentials found for profile "anthropic:default"
```

It means the system attempted to use the auth profile ID `anthropic:default`, but could not find credentials for it in the expected auth store.

### Fix checklist for No credentials found for profile anthropicdefault

- **Confirm where auth profiles live** (new vs legacy paths)
  - Current: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - Legacy: `~/.openclaw/agent/*` (migrated by `openclaw doctor`)
- **使用 setup-token**
  - 运行 `claude setup-token`，然后用 `openclaw models auth setup-token --provider anthropic` 粘贴。
  - 如果 token 是在另一台机器上创建的，使用 `openclaw models auth paste-token --provider anthropic`。
- **如果你想改用 API key**
  - 在**Gateway 主机**的 `~/.openclaw/.env` 中设置 `ANTHROPIC_API_KEY`。
  - 清除任何强制缺失 profile 的固定顺序：
    ```bash
    openclaw models auth order clear --provider anthropic
    ```
- **确认你在 Gateway 主机上运行命令**
  - 远程模式下，auth profiles 位于 Gateway 机器上，而不是你的笔记本。

**Fix checklist for No credentials found for profile anthropic**

如果你的模型配置包含 Google Gemini 作为 fallback（或你切换到了 Gemini 快捷名），OpenClaw 会在 fallback 期间尝试它。如果你没有配置 Google 凭据，就会看到 `No API key found for provider "google"`。

- **Use a setup-token**
  - Run `claude setup-token`, then paste it with `openclaw models auth setup-token --provider anthropic`.
  - If the token was created on another machine, use `openclaw models auth paste-token --provider anthropic`.
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

相关：[/concepts/oauth](/zh/concepts/oauth)（OAuth 流程、token 存储、多账号模式）

**LLM request rejected message thinking signature required google antigravity**

Auth profile 是一个按 provider 绑定的命名凭据记录（OAuth 或 API key）。Profiles 存放在：

Fix: OpenClaw now strips unsigned thinking blocks for Google Antigravity Claude. If it still appears, start a **new session** or set `/thinking off` for that agent.

## Auth profiles: what they are and how to manage them

Related: [/concepts/oauth](/zh/concepts/oauth) (OAuth flows, token storage, multi-account patterns)

### What is an auth profile

An auth profile is a named credential record (OAuth or API key) tied to a provider. Profiles live in:

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

### Can I control which auth profile is tried first

可以。配置支持为 profile 添加可选元数据，并为每个 provider 设置顺序（`auth.order.<provider>`）。它**不存储 secrets**；只是在 IDs 与 provider/mode 之间做映射并设置轮换顺序。

- `anthropic:default` (common when no email identity exists)
- `anthropic:<email>` for OAuth identities
- custom IDs you choose (e.g. `anthropic:work`)

### OAuth vs API key whats the difference

OpenClaw 同时支持两者：

OpenClaw may temporarily skip a profile if it's in a short **cooldown** (rate limits/timeouts/auth failures) or a longer **disabled** state (billing/insufficient credits). To inspect this, run `openclaw models status --json` and check `auth.unusableProfiles`. Tuning: `auth.cooldowns.billingBackoffHours*`.

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

向导明确支持 Anthropic setup-token 和 OpenAI Codex OAuth，并可为你存储 API keys。

```bash
openclaw models auth order set --provider anthropic --agent main anthropic:default
```

## Gateway: ports, “already running”, and remote mode

OpenClaw supports both:

- **OAuth** often leverages subscription access (where applicable).
- **API keys** use pay-per-token billing.

The wizard explicitly supports Anthropic setup-token and OpenAI Codex OAuth and can store API keys for you.

## Gateway: ports, "already running", and remote mode

### What port does the Gateway use

`gateway.port` controls the single multiplexed port for WebSocket + HTTP (Control UI, hooks, etc.).

Precedence:

```
--port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
```

### Why does openclaw gateway status say Runtime running but RPC probe failed

Because "running" is the **supervisor's** view (launchd/systemd/schtasks). The RPC probe is the CLI actually connecting to the gateway WebSocket and calling `status`.

你在编辑一个 config，但服务运行的是另一个（常见是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

- `Probe target:` (the URL the probe actually used)
- `Listening:` (what's actually bound on the port)
- `Last gateway error:` (common root cause when the process is alive but the port isn't listening)

### Why does openclaw gateway status show Config cli and Config service different

修复：停止其他实例、释放端口，或改用 `openclaw gateway --port <port>`。

通常不需要：一个 Gateway 就能跑多个消息通道和 agents。只有在需要冗余（例如救援 bot）或强隔离时，才建议多个 Gateway。

```bash
openclaw gateway install --force
```

设置 `gateway.mode: "remote"` 并指向远程 WebSocket URL，可选 token/password：

### What does another gateway instance is already listening mean

OpenClaw enforces a runtime lock by binding the WebSocket listener immediately on startup (default `ws://127.0.0.1:18789`). If the bind fails with `EADDRINUSE`, it throws `GatewayLockError` indicating another instance is already listening.

Fix: stop the other instance, free the port, or run with `openclaw gateway --port <port>`.

### The Control UI says unauthorized or keeps reconnecting What now

你的 Gateway 启用了 auth（`gateway.auth.*`），但 UI 没有发送匹配的 token/password。

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

If you **really** want open loopback, remove `gateway.auth` from your config. Doctor can generate a token for you any time: `openclaw doctor --generate-gateway-token`.

- Control UI 把 token 存在浏览器 localStorage 的 `openclaw.control.settings.v1`。
- UI 能一次性导入 `?token=...`（和/或 `?password=...`），然后会从 URL 中移除。

### The Control UI says unauthorized or keeps reconnecting What now

Your gateway is running with auth enabled (`gateway.auth.*`), but the UI is not sending the matching token/password.

Facts (from code):

- 远程时先打隧道：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然后打开 `http://127.0.0.1:18789/?token=...`。
- 在 Gateway 主机上设置 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。

通常不需要：一个 Gateway 就能跑多个消息通道和 agents。只有在需要冗余（例如救援 bot）或强隔离时，才建议多个 Gateway。

- 仍未解决？运行 `openclaw status --all` 并查看 [故障排查](/zh/gateway/troubleshooting)。[仪表板](/zh/web/dashboard) 有 auth 细节。
- If you don't have a token yet: `openclaw doctor --generate-gateway-token`.
- If remote, tunnel first: `ssh -N -L 18789:127.0.0.1:18789 user@host` then open `http://127.0.0.1:18789/?token=...`.
- Set `gateway.auth.token` (or `OPENCLAW_GATEWAY_TOKEN`) on the gateway host.
- 在该主机上启动 Tailscale（使其获得 100.x 地址），或
- 切换为 `gateway.bind: "loopback"` / `"lan"`。

### I set gatewaybind tailnet but it cant bind nothing listens

`tailnet` bind picks a Tailscale IP from your network interfaces (100.64.0.0/10). If the machine isn't on Tailscale (or the interface is down), there's nothing to bind to.

通常不需要：一个 Gateway 就能跑多个消息通道和 agents。只有在需要冗余（例如救援 bot）或强隔离时，才建议多个 Gateway。

- Start Tailscale on that host (so it has a 100.x address), or
- `OPENCLAW_CONFIG_PATH`（每实例 config）

Note: `tailnet` is explicit. `auto` prefers loopback; use `gateway.bind: "tailnet"` when you want a tailnet-only bind.

### Can I run multiple Gateways on the same host

Usually no - one Gateway can run multiple messaging channels and agents. Use multiple Gateways only when you need redundancy (ex: rescue bot) or hard isolation.

快速配置（推荐）：

- 每实例使用 `openclaw --profile <name> …`（自动创建 `~/.openclaw-<name>`）。
- 在每个 profile 的 config 中设置唯一 `gateway.port`（或手动运行时传 `--port`）。
- 安装每 profile 的服务：`openclaw --profile <name> gateway install`。
- `gateway.port` (unique ports)

Quick setup (recommended):

- Use `openclaw --profile <name> …` per instance (auto-creates `~/.openclaw-<name>`).
- Set a unique `gateway.port` in each profile config (or pass `--port` for manual runs).
- 你在浏览器中打开了 **HTTP** URL（`http://...`），而不是 WS 客户端。

Profiles also suffix service names (`bot.molt.<profile>`; legacy `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`).
Full guide: [Multiple gateways](/zh/gateway/multiple-gateways).

### What does invalid handshake code 1008 mean

快速修复：

Docs: [通道](/zh/channels), [故障排查](/zh/gateway/troubleshooting), [远程访问](/zh/gateway/remote)。

2. 不要用普通浏览器标签页打开 WS 端口。
3. 若开启了 auth，在 `connect` 帧中带上 token/password。
- A proxy or tunnel stripped auth headers or sent a non-Gateway request.

协议细节：[Gateway 协议](/zh/gateway/protocol)。

1. Use the WS URL: `ws://<host>:18789` (or `wss://...` if HTTPS).
2. Don't open the WS port in a normal browser tab.
3. If auth is on, include the token/password in the `connect` frame.

你可以通过 `logging.file` 设置稳定路径。文件日志级别由 `logging.level` 控制。控制台详细度由 `--verbose` 和 `logging.consoleLevel` 控制。

```
openclaw tui --url ws://<host>:18789 --token <token>
```

最快的日志跟随：

## Logging and debugging

### Where are logs

File logs (structured):

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

You can set a stable path via `logging.file`. File log level is controlled by `logging.level`. Console verbosity is controlled by `--verbose` and `logging.consoleLevel`.

更多信息见 [故障排查](/zh/gateway/troubleshooting#log-locations)。

```bash
openclaw logs --follow
```

Service/supervisor logs (when the gateway runs via launchd/systemd):

- macOS: `$OPENCLAW_STATE_DIR/logs/gateway.log` and `gateway.err.log` (default: `~/.openclaw/logs/...`; profiles use `~/.openclaw-<profile>/logs/...`)
- Linux: `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
- Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

Windows 有**两种安装模式**：

### How do I startstoprestart the Gateway service

打开 PowerShell，进入 WSL，然后重启：

```bash
openclaw gateway status
openclaw gateway restart
```

如果你从未安装过服务，可以前台启动：

### I closed my terminal on Windows how do I restart OpenClaw

打开 PowerShell 并运行：

如果是手动运行（无服务），使用：

Docs: [Windows (WSL2)](/zh/platforms/windows), [Gateway 服务运维手册](/zh/gateway)。

```powershell
wsl
openclaw gateway status
openclaw gateway restart
```

If you never installed the service, start it in the foreground:

```bash
openclaw gateway run
```

先做一轮快速健康检查：

常见原因：

```powershell
openclaw gateway status
openclaw gateway restart
```

If you run it manually (no service), use:

```powershell
openclaw gateway run
```

Docs: [Windows (/en/platforms/windows)](/zh/platforms/windows), [Gateway service runbook](/zh/gateway).

### The Gateway is up but replies never arrive What should I check

如果你是远程模式，确认隧道/Tailscale 连接可用，并且 Gateway WebSocket 可达。

```bash
openclaw status
openclaw models status
openclaw channels status
openclaw logs --follow
```

Docs: [通道](/zh/channels), [故障排查](/zh/gateway/troubleshooting), [远程访问](/zh/gateway/remote)。

- Model auth not loaded on the **gateway host** (check `models status`).
- Channel pairing/allowlist blocking replies (check channel config + logs).
1. Gateway 在运行吗？`openclaw gateway status`

If you are remote, confirm the tunnel/Tailscale connection is up and that the
Gateway WebSocket is reachable.

Docs: [Channels](/zh/channels), [Troubleshooting](/zh/gateway/troubleshooting), [Remote access](/zh/gateway/remote).

### Disconnected from gateway no reason what now

然后跟随日志：

1. Is the Gateway running? `openclaw gateway status`
2. Is the Gateway healthy? `openclaw status`
3. Does the UI have the right token? `openclaw dashboard`
4. If remote, is the tunnel/Tailscale link up?

Docs: [Telegram](/zh/channels/telegram), [通道 troubleshooting](/zh/channels/troubleshooting)。

```bash
openclaw logs --follow
```

Docs: [Dashboard](/zh/web/dashboard), [Remote access](/zh/gateway/remote), [Troubleshooting](/zh/gateway/troubleshooting).

### Telegram setMyCommands fails with network errors What should I check

在 TUI 中用 `/status` 查看当前状态。如果你期待在聊天频道收到回复，确保开启投递（`/deliver on`）。

```bash
openclaw channels status
openclaw channels logs --channel telegram
```

Docs: [TUI](/zh/tui), [斜杠命令](/zh/tools/slash-commands)。

Docs: [Telegram](/zh/channels/telegram), [Channel troubleshooting](/zh/channels/troubleshooting).

### TUI shows no output What should I check

这会停止/启动**受监督的服务**（macOS 上是 launchd，Linux 上是 systemd）。当 Gateway 作为守护进程在后台运行时用这个。

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

如果你是前台运行，Ctrl‑C 停止，然后：

Docs: [Gateway 服务运维手册](/zh/gateway)。

### ELI5 openclaw gateway restart vs openclaw gateway

If you installed the service:

```bash
openclaw gateway stop
openclaw gateway start
```

This stops/starts the **supervised service** (launchd on macOS, systemd on Linux).
Use this when the Gateway runs in the background as a daemon.

如果你安装了服务，就用 gateway 命令；要临时前台跑一遍，就用 `openclaw gateway`。

```bash
openclaw gateway run
```

Docs: [Gateway service runbook](/zh/gateway).

### ELI5 openclaw gateway restart vs openclaw gateway

- `openclaw gateway restart`: restarts the **background service** (launchd/systemd).
- `openclaw gateway`: runs the gateway **in the foreground** for this terminal session.

Agent 发送附件时，必须在消息里包含一行 `MEDIA:<path-or-url>`（单独一行）。见 [OpenClaw 助手设置](/zh/start/openclaw) 和 [Agent 发送](/zh/tools/agent-send)。

### What's the fastest way to get more details when something fails

还要检查：

## Media & attachments

### My skill generated an imagePDF but nothing was sent

见 [图片/zh/nodes/images)。

CLI sending:

```bash
openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
```

Also check:

- The target channel supports outbound media and isn't blocked by allowlists.
- 支持 DMs 的频道默认是 **pairing**：
  - 未知发送者会收到 pairing 码；bot 不处理其消息。
  - 通过 `openclaw pairing approve <channel> <code>` 批准。
  - 待处理请求每个频道最多 **3** 个；若没收到 code，检查 `openclaw pairing list <channel>`。

See [Images](/zh/nodes/images).

## Security and access control

### Is prompt injection only a concern for public bots

不是。Prompt injection 针对的是**不可信内容**，不是仅仅谁能 DM 机器人。
如果你的助手会读取外部内容（web search/fetch、浏览器页面、邮件、文档、附件、粘贴的日志），这些内容可能包含试图劫持模型的指令。即便**只有你**是发送者，也可能发生。

- Default behavior on DM-capable channels is **pairing**:
  - Unknown senders receive a pairing code; the bot does not process their message.
  - Approve with: `openclaw pairing approve <channel> <code>`
  - Pending requests are capped at **3 per channel**; check `openclaw pairing list <channel>` if a code didn't arrive.
- 用只读或禁工具的“reader” agent 来总结不可信内容

Run `openclaw doctor` to surface risky DM policies.

### Is prompt injection only a concern for public bots

细节见 [安全](/zh/gateway/security)。

The biggest risk is when tools are enabled: the model can be tricked into
exfiltrating context or calling tools on your behalf. Reduce the blast radius by:

- using a read-only or tool-disabled "reader" agent to summarize untrusted content
- keeping `web_search` / `web_fetch` / `browser` off for tool-enabled agents
- sandboxing and strict tool allowlists

Details: [Security](/zh/gateway/security).

### Should my bot have its own email GitHub account or phone number

Yes, for most setups. Isolating the bot with separate accounts and phone numbers
reduces the blast radius if something goes wrong. This also makes it easier to rotate
credentials or revoke access without impacting your personal accounts.

Start small. Give access only to the tools and accounts you actually need, and expand
later if required.

Docs: [Security](/zh/gateway/security), [Pairing](/zh/start/pairing).

### Can I give it autonomy over my text messages and is that safe

We do **not** recommend full autonomy over your personal messages. The safest pattern is:

- Keep DMs in **pairing mode** or a tight allowlist.
- Use a **separate number or account** if you want it to message on your behalf.
- Let it draft, then **approve before sending**.

查看待处理请求：

### Can I use cheaper models for personal assistant tasks

Yes, **if** the agent is chat-only and the input is trusted. Smaller tiers are
more susceptible to instruction hijacking, so avoid them for tool-enabled agents
or when reading untrusted content. If you must use a smaller model, lock down
tools and run inside a sandbox. See [Security](/zh/gateway/security).

### I ran start in Telegram but didnt get a pairing code

批准 pairing：

查看待处理请求：

```bash
openclaw pairing list telegram
```

向导中的手机号提示用于设置你的 **allowlist/owner**，以允许你自己的 DMs。它不会用于自动发送。如果你用个人 WhatsApp 号码运行，使用该号码并启用 `channels.whatsapp.selfChatMode`。

## Chat commands, aborting tasks, and “it won’t stop”

No. Default WhatsApp DM policy is **pairing**. Unknown senders only get a pairing code and their message is **not processed**. OpenClaw only replies to chats it receives or to explicit sends you trigger.

多数内部或工具消息只会在该会话启用 **verbose** 或 **reasoning** 时显示。

```bash
openclaw pairing approve whatsapp <code>
```

在出现的聊天中这样修复：

```bash
openclaw pairing list whatsapp
```

如果仍然很吵，检查 Control UI 的会话设置并将 verbose 设为 **inherit**。同时确认你没有在 config 中使用 `verboseDefault` 为 `on` 的 bot profile。

## Chat commands, aborting tasks, and "it won't stop"

### How do I stopcancel a running task

发送以下任一**独立消息**（不带斜杠）：

这些是中止触发词（不是 slash commands）。

```
/verbose off
/reasoning off
```

对于后台进程（来自 exec 工具），可以让 agent 运行：

Slash commands 总览见 [斜杠命令](/zh/tools/slash-commands)。

### How do I stopcancel a running task

Send any of these **as a standalone message** (no slash):

```
stop
abort
esc
wait
exit
interrupt
```

OpenClaw 默认阻止**跨 provider**消息。如果工具调用绑定在 Telegram，就不会发送到 Discord，除非你明确允许。

为 agent 启用跨 provider 消息：

```
process action:kill sessionId:XXX
```

编辑 config 后重启 gateway。如果只想对单个 agent 生效，把它放在 `agents.list[].tools.message` 下。

Most commands must be sent as a **standalone** message that starts with `/`, but a few shortcuts (like `/status`) also work inline for allowlisted senders.

### How do I send a Discord message from Telegram Crosscontext messaging denied

OpenClaw blocks **cross-provider** messaging by default. If a tool call is bound
to Telegram, it won't send to Discord unless you explicitly allow it.

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

Restart the gateway after editing config. If you only want this for a single
agent, set it under `agents.list[].tools.message` instead.

### Why does it feel like the bot ignores rapidfire messages

Queue mode controls how new messages interact with an in-flight run. Use `/queue` to change modes:

- `steer` - new messages redirect the current task
- `followup` - run messages one at a time
- `collect` - batch messages and reply once (default)
- `steer-backlog` - steer now, then process backlog
- `interrupt` - abort current run and start fresh

You can add options like `debounce:2s cap:25 drop:summarize` for followup modes.

## Answer the exact question from the screenshot/chat log

**Q: "What's the default model for Anthropic with an API key?"**

**A:** In OpenClaw, credentials and model selection are separate. Setting `ANTHROPIC_API_KEY` (or storing an Anthropic API key in auth profiles) enables authentication, but the actual default model is whatever you configure in `agents.defaults.model.primary` (for example, `anthropic/claude-sonnet-4-5` or `anthropic/claude-opus-4-5`). If you see `No credentials found for profile "anthropic:default"`, it means the Gateway couldn't find Anthropic credentials in the expected `auth-profiles.json` for the agent that's running.

---

Still stuck? Ask in [Discord](https://discord.com/invite/clawd) or open a [GitHub discussion](https://github.com/openclaw/openclaw/discussions).
