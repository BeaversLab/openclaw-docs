---
summary: "關於 OpenClaw 安裝、設定和使用的常見問題"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常見問題"
---

# 常見問題

針對真實場景（本地開發、VPS、多代理、OAuth/API 金鑰、模型容錯移轉）的快速解答與更深入的疑難排解。如需執行時期診斷，請參閱[疑難排解](/zh-Hant/gateway/troubleshooting)。如需完整的設定參考，請參閱[組態](/zh-Hant/gateway/configuration)。

## 目錄

- [快速入門與首次執行設定]
  - [我被卡住了，有什麼最快的方法可以解脫？](#im-stuck-whats-the-fastest-way-to-get-unstuck)
  - [安裝和設定 OpenClaw 的推薦方式為何？](#whats-the-recommended-way-to-install-and-set-up-openclaw)
  - [上手後如何開啟儀表板？](#how-do-i-open-the-dashboard-after-onboarding)
  - [如何在本地與遠端驗證儀表板（權杖）？](#how-do-i-authenticate-the-dashboard-token-on-localhost-vs-remote)
  - [我需要什麼執行環境？](#what-runtime-do-i-need)
  - [它可以在 Raspberry Pi 上執行嗎？](#does-it-run-on-raspberry-pi)
  - [有什麼 Raspberry Pi 安裝的建議嗎？](#any-tips-for-raspberry-pi-installs)
  - [卡在「wake up my friend」/ 上手無法完成。現在該怎麼辦？](#it-is-stuck-on-wake-up-my-friend-onboarding-will-not-hatch-what-now)
  - [我可以將設定遷移到新機器（Mac mini）而無需重新上手嗎？](#can-i-migrate-my-setup-to-a-new-machine-mac-mini-without-redoing-onboarding)
  - [我在哪裡可以看到最新版本的新功能？](#where-do-i-see-what-is-new-in-the-latest-version)
  - [我無法存取 docs.openclaw.ai（SSL 錯誤）。現在該怎麼辦？](#i-cant-access-docsopenclawai-ssl-error-what-now)
  - [穩定版與 Beta 版有什麼區別？](#whats-the-difference-between-stable-and-beta)
  - [我該如何安裝 Beta 版，Beta 版與 Dev 版有什麼區別？](#how-do-i-install-the-beta-version-and-whats-the-difference-between-beta-and-dev)
  - [我該如何嘗試最新版本？](#how-do-i-try-the-latest-bits)
  - [安裝和上手通常需要多久時間？](#how-long-does-install-and-onboarding-usually-take)
  - [安裝程式卡住了？我該如何獲得更多回饋？](#installer-stuck-how-do-i-get-more-feedback)
  - [Windows 安裝顯示找不到 git 或無法辨識 openclaw](#windows-install-says-git-not-found-or-openclaw-not-recognized)
  - [Windows 執行輸出顯示亂碼中文，我該怎麼辦](#windows-exec-output-shows-garbled-chinese-text-what-should-i-do)
  - [文件沒有回答我的問題 - 我該如何獲得更好的答案？](#the-docs-didnt-answer-my-question-how-do-i-get-a-better-answer)
  - [我該如何在 Linux 上安裝 OpenClaw？](#how-do-i-install-openclaw-on-linux)
  - [我該如何在 VPS 上安裝 OpenClaw？](#how-do-i-install-openclaw-on-a-vps)
  - [雲端/VPS 安裝指南在哪裡？](#where-are-the-cloudvps-install-guides)
  - [我可以要求 OpenCl� 自我更新嗎？](#can-i-ask-openclaw-to-update-itself)
  - [引導 實際上做什麼？](#what-does-onboarding-actually-do)
  - [運行此程式需要 Claude 或 OpenAI 訂閱嗎？](#do-i-need-a-claude-or-openai-subscription-to-run-this)
  - [我可以在沒有 API 金鑰的情況下使用 Claude Max 訂閱嗎](#can-i-use-claude-max-subscription-without-an-api-key)
  - [Anthropic 的 "setup-token" 驗證是如何運作的？](#how-does-anthropic-setuptoken-auth-work)
  - [我在哪裡可以找到 Anthropic 的 setup-token？](#where-do-i-find-an-anthropic-setuptoken)
  - [你們支援 Claude 訂閱驗證 (Claude Pro 或 Max) 嗎？](#do-you-support-claude-subscription-auth-claude-pro-or-max)
  - [為什麼我會看到來自 Anthropic 的 `HTTP 429: rate_limit_error`？](#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)
  - [支援 AWS Bedrock 嗎？](#is-aws-bedrock-supported)
  - [Codex 驗證是如何運作的？](#how-does-codex-auth-work)
  - [你們支援 OpenAI 訂閱驗證 (Codex OAuth) 嗎？](#do-you-support-openai-subscription-auth-codex-oauth)
  - [我該如何設定 Gemini CLI OAuth](#how-do-i-set-up-gemini-cli-oauth)
  - [本地模型適合閒聊嗎？](#is-a-local-model-ok-for-casual-chats)
  - [我該如何將託管模型的流量保留在特定區域？](#how-do-i-keep-hosted-model-traffic-in-a-specific-region)
  - [我必須購買 Mac Mini 才能安裝這個嗎？](#do-i-have-to-buy-a-mac-mini-to-install-this)
  - [我需要 Mac mini 才能支援 iMessage 嗎？](#do-i-need-a-mac-mini-for-imessage-support)
  - [如果我購買 Mac mini 來運行 OpenClaw，我可以將其連接到我的 MacBook Pro 嗎？](#if-i-buy-a-mac-mini-to-run-openclaw-can-i-connect-it-to-my-macbook-pro)
  - [我可以使用 Bun 嗎？](#can-i-use-bun)
  - [Telegram：`allowFrom` 裡面該填什麼？](#telegram-what-goes-in-allowfrom)
  - [多個人可以使用一個 WhatsApp 號碼搭配不同的 OpenClaw 實例嗎？](#can-multiple-people-use-one-whatsapp-number-with-different-openclaw-instances)
  - [我可以同時運行一個「快速聊天」代理程式和一個「Opus 編碼」代理程式嗎？](#can-i-run-a-fast-chat-agent-and-an-opus-for-coding-agent)
  - [Homebrew 可以在 Linux 上運作嗎？](#does-homebrew-work-on-linux)
  - [可駭客（git）安裝與 npm 安裝有什麼區別？](#whats-the-difference-between-the-hackable-git-install-and-npm-install)
  - [我稍後可以在 npm 和 git 安裝之間切換嗎？](#can-i-switch-between-npm-and-git-installs-later)
  - [我應該在筆記型電腦還是 VPS 上執行 Gateway？](#should-i-run-the-gateway-on-my-laptop-or-a-vps)
  - [在專用機器上執行 OpenClaw 有多重要？](#how-important-is-it-to-run-openclaw-on-a-dedicated-machine)
  - [VPS 的最低需求和建議的作業系統是什麼？](#what-are-the-minimum-vps-requirements-and-recommended-os)
  - [我可以在 VM 中執行 OpenClaw 嗎？需求是什麼？](#can-i-run-openclaw-in-a-vm-and-what-are-the-requirements)
- [什麼是 OpenClaw？](#what-is-openclaw)
  - [什麼是 OpenClaw？（一段話總結）](#what-is-openclaw-in-one-paragraph)
  - [它的價值主張是什麼？](#whats-the-value-proposition)
  - [我剛設置好，首先該做什麼？](#i-just-set-it-up-what-should-i-do-first)
  - [OpenClaw 的前五大日常使用案例是什麼？](#what-are-the-top-five-everyday-use-cases-for-openclaw)
  - [OpenClaw 能協助 SaaS 的潛在客戶開發、外聯、廣告和部落格嗎？](#can-openclaw-help-with-lead-gen-outreach-ads-and-blogs-for-a-saas)
  - [與 Claude Code 相比，它在網頁開發方面有什麼優勢？](#what-are-the-advantages-vs-claude-code-for-web-development)
- [技能與自動化](#skills-and-automation)
  - [如何自訂技能而不讓 repo 讂髒？](#how-do-i-customize-skills-without-keeping-the-repo-dirty)
  - [我可以從自訂資料夾載入技能嗎？](#can-i-load-skills-from-a-custom-folder)
  - [我如何針對不同的任務使用不同的模型？](#how-can-i-use-different-models-for-different-tasks)
  - [機器人在執行繁重工作時會凍結。我該如何卸載這些工作？](#the-bot-freezes-while-doing-heavy-work-how-do-i-offload-that)
  - [Cron 或提醒沒有觸發。我應該檢查什麼？](#cron-or-reminders-do-not-fire-what-should-i-check)
  - [我如何在 Linux 上安裝技能？](#how-do-i-install-skills-on-linux)
  - [OpenClaw 可以排程執行任務或在背景連續執行嗎？](#can-openclaw-run-tasks-on-a-schedule-or-continuously-in-the-background)
  - [我可以從 Linux 執行 Apple macOS 專屬的技能嗎？](#can-i-run-apple-macos-only-skills-from-linux)
  - [你們有 Notion 或 HeyGen 整合功能嗎？](#do-you-have-a-notion-or-heygen-integration)
  - [我如何使用現有已登入的 Chrome 與 OpenClaw 搭配？](#how-do-i-use-my-existing-signed-in-chrome-with-openclaw)
- [沙盒機制與記憶體](#sandboxing-and-memory)
  - [有專門的沙盒機制文件嗎？](#is-there-a-dedicated-sandboxing-doc)
  - [如何將主機資料夾綁定到沙箱中？](#how-do-i-bind-a-host-folder-into-the-sandbox)
  - [記憶是如何運作的？](#how-does-memory-work)
  - [記憶總是忘記事情。我該如何讓它記住？](#memory-keeps-forgetting-things-how-do-i-make-it-stick)
  - [記憶會永久保存嗎？有什麼限制？](#does-memory-persist-forever-what-are-the-limits)
  - [語意記憶搜尋需要 OpenAI API 金鑰嗎？](#does-semantic-memory-search-require-an-openai-api-key)
- [檔案系統中的儲存位置](#where-things-live-on-disk)
  - [所有與 OpenClaw 使用的資料都會儲存在本機嗎？](#is-all-data-used-with-openclaw-saved-locally)
  - [OpenClaw 將資料儲存在哪裡？](#where-does-openclaw-store-its-data)
  - [AGENTS.md / SOUL.md / USER.md / MEMORY.md 應該放在哪裡？](#where-should-agentsmd-soulmd-usermd-memorymd-live)
  - [推薦的備份策略是什麼？](#whats-the-recommended-backup-strategy)
  - [我該如何完全解除安裝 OpenClaw？](#how-do-i-completely-uninstall-openclaw)
  - [代理可以在工作區之外運作嗎？](#can-agents-work-outside-the-workspace)
  - [我在遠端模式下 - Session 儲存在哪裡？](#im-in-remote-mode-where-is-the-session-store)
- [設定檔基礎](#config-basics)
  - [設定檔是什麼格式？它在哪裡？](#what-format-is-the-config-where-is-it)
  - [我設定了 `gateway.bind: "lan"` (或 `"tailnet"`)，現在沒有東西在監聽 / UI 顯示未授權](#i-set-gatewaybind-lan-or-tailnet-and-now-nothing-listens-the-ui-says-unauthorized)
  - [為什麼我在 localhost 現在需要 Token？](#why-do-i-need-a-token-on-localhost-now)
  - [變更設定後我需要重新啟動嗎？](#do-i-have-to-restart-after-changing-config)
  - [我該如何停用有趣的 CLI 標語？](#how-do-i-disable-funny-cli-taglines)
  - [我該如何啟用網頁搜尋 (以及網頁擷取)？](#how-do-i-enable-web-search-and-web-fetch)
  - [config.apply 清除了我的設定。我該如何復原並避免這種情況？](#configapply-wiped-my-config-how-do-i-recover-and-avoid-this)
  - [我該如何在跨裝置的情境下，使用專用 Worker 執行中央 Gateway？](#how-do-i-run-a-central-gateway-with-specialized-workers-across-devices)
  - [OpenClaw 瀏覽器可以以無頭模式 執行嗎？](#can-the-openclaw-browser-run-headless)
  - [我該如何使用 Brave 進行瀏覽器控制？](#how-do-i-use-brave-for-browser-control)
- [遠端 Gateway 和節點](#remote-gateways-and-nodes)
  - [指令如何在 Telegram、Gateway 和節點之間傳遞？](#how-do-commands-propagate-between-telegram-the-gateway-and-nodes)
  - [如果 Gateway 託管在遠端，我的 Agent 如何存取我的電腦？](#how-can-my-agent-access-my-computer-if-the-gateway-is-hosted-remotely)
  - [Tailscale 已連線，但我沒有收到回覆。現在該怎麼辦？](#tailscale-is-connected-but-i-get-no-replies-what-now)
  - [兩個 OpenClaw 實例可以互相通訊嗎（本機 + VPS）？](#can-two-openclaw-instances-talk-to-each-other-local-vps)
  - [多個 Agent 是否需要分開的 VPS？](#do-i-need-separate-vpses-for-multiple-agents)
  - [與其從 VPS 使用 SSH，在我的個人筆記型電腦上使用節點有什麼好處嗎？](#is-there-a-benefit-to-using-a-node-on-my-personal-laptop-instead-of-ssh-from-a-vps)
  - [節點會執行 Gateway 服務嗎？](#do-nodes-run-a-gateway-service)
  - [是否有 API / RPC 方式可以套用設定？](#is-there-an-api-rpc-way-to-apply-config)
  - [初次安裝時，什麼是最小化且「合理」的設定？](#whats-a-minimal-sane-config-for-a-first-install)
  - [我如何在 VPS 上設置 Tailscale 並從我的 Mac 連線？](#how-do-i-set-up-tailscale-on-a-vps-and-connect-from-my-mac)
  - [我如何將 Mac 節點連線到遠端 Gateway (Tailscale Serve)？](#how-do-i-connect-a-mac-node-to-a-remote-gateway-tailscale-serve)
  - [我應該安裝在第二台筆記型電腦上，還是只需新增一個節點？](#should-i-install-on-a-second-laptop-or-just-add-a-node)
- [環境變數與 .env 載入](#env-vars-and-env-loading)
  - [OpenClaw 如何載入環境變數？](#how-does-openclaw-load-environment-variables)
  - [「我透過服務啟動了 Gateway，環境變數卻消失了。」現在該怎麼辦？](#i-started-the-gateway-via-the-service-and-my-env-vars-disappeared-what-now)
  - [我設定了 `COPILOT_GITHUB_TOKEN`，但模型狀態顯示「Shell env: off。」為什麼？](#i-set-copilotgithubtoken-but-models-status-shows-shell-env-off-why)
- [會話與多重聊天](#sessions-and-multiple-chats)
  - [我如何開始新的對話？](#how-do-i-start-a-fresh-conversation)
  - [如果我不傳送 `/new`，會話會自動重設嗎？](#do-sessions-reset-automatically-if-i-never-send-new)
  - [有沒有辦法讓一組 OpenClaw 實例成為一個 CEO 和多個 Agent 的團隊？](#is-there-a-way-to-make-a-team-of-openclaw-instances-one-ceo-and-many-agents)
  - [為什麼任務執行到一半時上下文被截斷了？我該如何預防？](#why-did-context-get-truncated-midtask-how-do-i-prevent-it)
  - [我如何完全重設 OpenClaw 但保留安裝？](#how-do-i-completely-reset-openclaw-but-keep-it-installed)
  - [我不斷收到「context too large」錯誤 - 我該如何重設或壓縮？](#im-getting-context-too-large-errors-how-do-i-reset-or-compact)
  - [為什麼我會看到「LLM request rejected: messages.content.tool_use.input field required」？](#why-am-i-seeing-llm-request-rejected-messagescontenttool_useinput-field-required)
  - [為什麼我每 30 分鐘會收到心跳訊息？](#why-am-i-getting-heartbeat-messages-every-30-minutes)
  - [我需要將「機器人帳號」加入到 WhatsApp 群組嗎？](#do-i-need-to-add-a-bot-account-to-a-whatsapp-group)
  - [如何取得 WhatsApp 群組的 JID？](#how-do-i-get-the-jid-of-a-whatsapp-group)
  - [為什麼 OpenClaw 不在群組中回覆？](#why-doesnt-openclaw-reply-in-a-group)
  - [群組/主題串會與私訊（DM）共享上下文嗎？](#do-groupsthreads-share-context-with-dms)
  - [我可以建立多少個工作區和代理程式（agents）？](#how-many-workspaces-and-agents-can-i-create)
  - [我可以同時執行多個機器人或聊天嗎，該如何設定？](#can-i-run-multiple-bots-or-chats-at-the-same-time-slack-and-how-should-i-set-that-up)
- [模型：預設值、選擇、別名、切換](#models-defaults-selection-aliases-switching)
  - [什麼是「預設模型」？](#what-is-the-default-model)
  - [你推薦使用哪種模型？](#what-model-do-you-recommend)
  - [如何在不清除設定的情況下切換模型？](#how-do-i-switch-models-without-wiping-my-config)
  - [我可以使用自託管的模型嗎？](#can-i-use-selfhosted-models-llamacpp-vllm-ollama)
  - [OpenClaw、Flawd 和 Krill 使用什麼模型？](#what-do-openclaw-flawd-and-krill-use-for-models)
  - [如何動態切換模型（無需重新啟動）？](#how-do-i-switch-models-on-the-fly-without-restarting)
  - [我可以將 GPT 5.2 用於日常任務，將 Codex 5.3 用於編碼嗎？](#can-i-use-gpt-52-for-daily-tasks-and-codex-53-for-coding)
  - [為什麼我會看到「Model … is not allowed」，然後沒有回覆？](#why-do-i-see-model-is-not-allowed-and-then-no-reply)
  - [為什麼我會看到「Unknown model: minimax/MiniMax-M2.5」？](#why-do-i-see-unknown-model-minimaxminimaxm25)
  - [我可以將 MiniMax 作為預設值，並將 OpenAI 用於複雜任務嗎？](#can-i-use-minimax-as-my-default-and-openai-for-complex-tasks)
  - [opus / sonnet / gpt 是內建捷徑嗎？](#are-opus-sonnet-gpt-builtin-shortcuts)
  - [如何定義/覆寫模型捷徑（別名）？](#how-do-i-defineoverride-model-shortcuts-aliases)
  - [如何新增來自其他供應商（如 OpenRouter 或 Z.AI）的模型？](#how-do-i-add-models-from-other-providers-like-openrouter-or-zai)
- [模型故障轉移與「所有模型均失敗」](#model-failover-and-all-models-failed)
  - [故障轉移是如何運作的？](#how-does-failover-work)
  - [這個錯誤訊息是什麼意思？](#what-does-this-error-mean)
  - [`No credentials found for profile "anthropic:default"` 的修復檢查清單](#fix-checklist-for-no-credentials-found-for-profile-anthropicdefault)
  - [為什麼它也嘗試了 Google Gemini 並失敗了？](#why-did-it-also-try-google-gemini-and-fail)
- [Auth profiles：它們是什麼以及如何管理它們](#auth-profiles-what-they-are-and-how-to-manage-them)
  - [什麼是 auth profile？](#what-is-an-auth-profile)
  - [典型的 profile ID 有哪些？](#what-are-typical-profile-ids)
  - [我可以控制先嘗試哪個 auth profile 嗎？](#can-i-control-which-auth-profile-is-tried-first)
  - [OAuth 與 API 金鑰：有什麼區別？](#oauth-vs-api-key-whats-the-difference)
- [Gateway：連接埠、「already running」和遠端模式](#gateway-ports-already-running-and-remote-mode)
  - [Gateway 使用哪個連接埠？](#what-port-does-the-gateway-use)
  - [為什麼 `openclaw gateway status` 說 `Runtime: running` 但 `RPC probe: failed`？](#why-does-openclaw-gateway-status-say-runtime-running-but-rpc-probe-failed)
  - [為什麼 `openclaw gateway status` 顯示 `Config (cli)` 和 `Config (service)` 不同？](#why-does-openclaw-gateway-status-show-config-cli-and-config-service-different)
  - [「another gateway instance is already listening」是什麼意思？](#what-does-another-gateway-instance-is-already-listening-mean)
  - [如何在遠端模式下執行 OpenClaw（客戶端連接到其他地方的 Gateway）？](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere)
  - [控制 UI 顯示「unauthorized」（或不斷重新連接）。現在該怎麼辦？](#the-control-ui-says-unauthorized-or-keeps-reconnecting-what-now)
  - [我設定了 `gateway.bind: "tailnet"` 但它無法綁定 / 沒有任何東西在監聽](#i-set-gatewaybind-tailnet-but-it-cant-bind-nothing-listens)
  - [我可以在同一台主機上執行多個 Gateway 嗎？](#can-i-run-multiple-gateways-on-the-same-host)
  - [「invalid handshake」/ 代碼 1008 是什麼意思？](#what-does-invalid-handshake-code-1008-mean)
- [日誌記錄與偵錯](#logging-and-debugging)
  - [日誌在哪裡？](#where-are-logs)
  - [如何啟動/停止/重新啟動 Gateway 服務？](#how-do-i-startstoprestart-the-gateway-service)
  - [我在 Windows 上關閉了終端機 - 如何重新啟動 OpenClaw？](#i-closed-my-terminal-on-windows-how-do-i-restart-openclaw)
  - [Gateway 已啟動但回覆從未到達。我應該檢查什麼？](#the-gateway-is-up-but-replies-never-arrive-what-should-i-check)
  - [「Disconnected from gateway: no reason」 - 現在該怎麼辦？](#disconnected-from-gateway-no-reason-what-now)
  - [Telegram setMyCommands 失敗。我應該檢查什麼？](#telegram-setmycommands-fails-what-should-i-check)
  - [TUI 沒有顯示輸出。我應該檢查什麼？](#tui-shows-no-output-what-should-i-check)
  - [如何完全停止然後啟動 Gateway？](#how-do-i-completely-stop-then-start-the-gateway)
  - [ELI5：`openclaw gateway restart` vs `openclaw gateway`](#eli5-openclaw-gateway-restart-vs-openclaw-gateway)
  - [當發生錯誤時，取得更多詳細資訊的最快方法是什麼？](#whats-the-fastest-way-to-get-more-details-when-something-fails)
- [媒體與附件](#media-and-attachments)
  - [我的技能生成了圖片/PDF，但沒有傳送任何內容](#my-skill-generated-an-imagepdf-but-nothing-was-sent)
- [安全與存取控制](#security-and-access-control)
  - [將 OpenClaw 暴露給傳入的私人訊息（DM）安全嗎？](#is-it-safe-to-expose-openclaw-to-inbound-dms)
  - [提示詞注入（prompt injection）只是公開機器人需要擔心的問題嗎？](#is-prompt-injection-only-a-concern-for-public-bots)
  - [我的機器人應該擁有自己的 Email、GitHub 帳號或電話號碼嗎？](#should-my-bot-have-its-own-email-github-account-or-phone-number)
  - [我可以讓它自主管理我的簡訊嗎？這樣安全嗎？](#can-i-give-it-autonomy-over-my-text-messages-and-is-that-safe)
  - [我可以使用更便宜的模型來執行個人助理任務嗎？](#can-i-use-cheaper-models-for-personal-assistant-tasks)
  - [我在 Telegram 執行了 `/start` 但沒有收到配對代碼](#i-ran-start-in-telegram-but-didnt-get-a-pairing-code)
  - [WhatsApp：它會傳訊息給我的聯絡人嗎？配對是如何運作的？](#whatsapp-will-it-message-my-contacts-how-does-pairing-work)
- [聊天指令、中止任務，以及「它無法停止」](#chat-commands-aborting-tasks-and-it-wont-stop)
  - [如何停止內部系統訊息顯示在聊天中](#how-do-i-stop-internal-system-messages-from-showing-in-chat)
  - [如何停止/取消正在執行的任務？](#how-do-i-stopcancel-a-running-task)
  - [如何從 Telegram 傳送 Discord 訊息？（「跨語境訊息被拒」）](#how-do-i-send-a-discord-message-from-telegram-crosscontext-messaging-denied)
  - [為什麼機器人似乎會「忽略」快速連續的訊息？](#why-does-it-feel-like-the-bot-ignores-rapidfire-messages)

## 如果發生故障的前 60 秒

1. **快速狀態（首先檢查）**

   ```bash
   openclaw status
   ```

   快速本機摘要：作業系統 + 更新、閘道/服務連線性、代理程式/工作階段、提供者設定 + 執行時期問題（當閘道可連線時）。

2. **可貼上的報告（可安全分享）**

   ```bash
   openclaw status --all
   ```

   唯讀診斷，包含 log 尾部（Token 已編輯）。

3. **Daemon + 連接埠狀態**

   ```bash
   openclaw gateway status
   ```

   顯示監督器執行時期與 RPC 連線性、探測目標 URL，以及服務可能使用的設定。

4. **深度探測**

   ```bash
   openclaw status --deep
   ```

   執行閘道健康檢查 + 提供者探測（需要可連線的閘道）。請參閱 [健康檢查](/zh-Hant/gateway/health)。

5. **監看最新的 log**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 故障，則回退至：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   檔案日誌與服務日誌是分開的；請參閱[日誌記錄](/zh-Hant/logging)和[疑難排解](/zh-Hant/gateway/troubleshooting)。

6. **執行醫生程式 (修復)**

   ```bash
   openclaw doctor
   ```

   修復/遷移設定/狀態 + 執行健康檢查。請參閱[醫生程式](/zh-Hant/gateway/doctor)。

7. **閘道快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   要求正在執行的閘道提供完整快照 (僅限 WS)。請參閱[健康狀態](/zh-Hant/gateway/health)。

## 快速入門與首次執行設定

### 我卡住了，最快解決卡住問題的方法是什麼

使用能夠**查看您的機器**的本機 AI 智慧體。這比在 Discord 上詢問更有效，因為大多數「我卡住了」的情況都是遠端協助者無法檢查的**本機設定或環境問題**。

- **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
- **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

這些工具可以讀取 repo、執行命令、檢查日誌，並協助修復您的機器層級設定 (PATH、服務、權限、驗證檔案)。透過可修改 的 安裝方式，提供它們 **完整的原始碼 checkout**：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

這會**從 git checkout** 安裝 OpenClaw，因此智慧體可以讀取程式碼 + 文件，並推斷您正在執行的確切版本。您可以隨時重新執行安裝程式且不加 `--install-method git`，以便稍後切換回穩定版本。

提示：要求智慧體**規劃並監督**修復程序 (逐步進行)，然後僅執行必要的命令。這樣可以保持變更微小，並更容易進行審查。

如果您發現真正的錯誤或修復方法，請提出 GitHub issue 或發送 PR：
[https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
[https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

從這些命令開始 (在尋求協助時分享輸出)：

```bash
openclaw status
openclaw models status
openclaw doctor
```

它們的作用：

- `openclaw status`：閘道/智慧體健康狀態 + 基本設定的快速快照。
- `openclaw models status`：檢查提供者驗證 + 模型可用性。
- `openclaw doctor`：驗證並修復常見的設定/狀態問題。

其他有用的 CLI 檢查：`openclaw status --all`、`openclaw logs --follow`、
`openclaw gateway status`、`openclaw health --verbose`。

快速調試循環：[First 60 seconds if something's broken](#first-60-seconds-if-somethings-broken)。
安裝文件：[Install](/zh-Hant/install)、[Installer flags](/zh-Hant/install/installer)、[Updating](/zh-Hant/install/updating)。

### 安裝和設定 OpenClaw 的推薦方式為何

此倉庫建議從原始碼執行並使用入門引導：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
```

精靈也可以自動建置 UI 資產。完成入門引導後，您通常會在連接埠 **18789** 上執行 Gateway。

從原始碼（貢獻者/開發者）：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw onboard
```

如果您尚未進行全域安裝，請透過 `pnpm openclaw onboard` 執行。

### 完成入門引導後，我該如何開啟儀表板

精靈會在入門引導後立即使用您的瀏覽器開啟一個乾淨（未代碼化）的儀表板 URL，並且也會在摘要中列印該連結。請保持該分頁開啟；如果它沒有啟動，請在同一台機器上複製並貼上列印出的 URL。

### 我該如何在本地主機或遠端上驗證儀表板代碼

**本地主機（同一台機器）：**

- 開啟 `http://127.0.0.1:18789/`。
- 如果它要求驗證，請將來自 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）的代碼貼上到 Control UI 設定中。
- 從 gateway 主機擷取它：`openclaw config get gateway.auth.token`（或產生一個：`openclaw doctor --generate-gateway-token`）。

**非本地主機：**

- **Tailscale Serve**（推薦）：保持繫結回送，執行 `openclaw gateway --tailscale serve`，開啟 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 是 `true`，則標頭滿足 Control UI/WebSocket 驗證（無代碼，假設為受信任的 gateway 主機）；HTTP API 仍需要代碼/密碼。
- **Tailnet bind**：執行 `openclaw gateway --bind tailnet --token "<token>"`，開啟 `http://<tailscale-ip>:18789/`，將代碼貼上到儀表板設定中。
- **SSH tunnel**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/` 並在 Control UI 設定中貼上代碼。

關於繫結模式和驗證詳情，請參閱 [Dashboard](/zh-Hant/web/dashboard) 和 [Web surfaces](/zh-Hant/web)。

### 我需要什麼執行環境

需要 Node **>= 22**。建議使用 `pnpm`。對於 Gateway，**不建議**使用 Bun。

### 它可以在 Raspberry Pi 上執行嗎

是的。Gateway 非常輕量 — 文件列出 **512MB-1GB RAM**、**1 核心**和約 **500MB**
磁碟空間即可滿足個人使用需求，並指出 **Raspberry Pi 4 也可以執行它**。

如果您想要額外的緩衝空間（日誌、媒體、其他服務），建議 **2GB**，但這並非
硬性最低要求。

提示：小型 Pi/VPS 可以託管 Gateway，您可以在筆記型電腦/手機上配對 **節點** 以進行
本機螢幕/相機/畫布或指令執行。請參閱 [節點](/zh-Hant/nodes)。

### 有沒有 Raspberry Pi 安裝的建議

簡單來說：它可以運作，但預期會有一些粗糙的地方。

- 使用 **64 位元** 作業系統並保持 Node >= 22。
- 建議使用 **可駭客 (git) 安裝**，以便您查看日誌並快速更新。
- 請先不啟用頻道/技能，然後逐一新增。
- 如果您遇到奇怪的二進位檔問題，通常是由於 **ARM 相容性** 問題。

文件：[Linux](/zh-Hant/platforms/linux)、[安裝](/zh-Hant/install)。

### 它卡在 wake up my friend，引導程序無法啟動 現在該怎麼辦

該畫面取決於 Gateway 是否可連線且已通過驗證。TUI 也會在首次啟動時自動發送
"Wake up, my friend!"。如果您看到該行卻**沒有回應**
且代幣數量維持在 0，則表示代理程式從未執行。

1. 重新啟動 Gateway：

```bash
openclaw gateway restart
```

2. 檢查狀態 + 驗證：

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

3. 如果仍然卡住，請執行：

```bash
openclaw doctor
```

如果 Gateway 是遠端的，請確保通道/Tailscale 連線正常，且 UI
指向正確的 Gateway。請參閱 [遠端存取](/zh-Hant/gateway/remote)。

### 我可以將我的設定遷移到新機器 Mac mini 而無需重新進行引導嗎

可以。複製 **狀態目錄** 和 **工作區**，然後執行一次 Doctor。這
會讓您的機器人保持「完全相同」（記憶體、工作階段記錄、驗證和頻道
狀態），前提是您複製了**這兩個**位置：

1. 在新機器上安裝 OpenClaw。
2. 從舊機器複製 `$OPENCLAW_STATE_DIR` (預設：`~/.openclaw`)。
3. 複製您的工作區 (預設：`~/.openclaw/workspace`)。
4. 執行 `openclaw doctor` 並重新啟動 Gateway 服務。

這將保留設定、驗證設定檔、WhatsApp 憑證、工作階段和記憶體。如果您使用的是
遠端模式，請記住 gateway 主機擁有工作階段存放區和工作區。

**重要提示：** 如果您只將工作區提交/推送到 GitHub，您備份的是 **記憶體 + 引導文件**，但 **不包括** 會話歷史記錄或身份驗證。這些檔案位於 `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

相關主題：[遷移](/zh-Hant/install/migrating)、[檔案在磁碟上的位置](/zh-Hant/help/faq#where-does-openclaw-store-its-data)、
[Agent 工作區](/zh-Hant/concepts/agent-workspace)、[診斷工具](/zh-Hant/gateway/doctor)、
[遠端模式](/zh-Hant/gateway/remote)。

### 我在哪裡可以看到最新版本的新內容

請查看 GitHub 變更日誌：
[https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

最新的條目位於頂部。如果頂部部分標記為 **Unreleased**（未發布），則下一個帶日期的
部分是最新的已發布版本。條目按 **亮點**、**變更** 和
**修復** 分組（需要的話還包括文檔/其他部分）。

### 我無法存取 docs.openclaw.ai SSL 錯誤 該怎麼辦

部分 Comcast/Xfinity 連線透過 Xfinity
Advanced Security 錯誤地封鎖了 `docs.openclaw.ai`。請停用它或將 `docs.openclaw.ai` 加入允許清單，然後重試。更多
細節請參閱：[疑難排解](/zh-Hant/help/troubleshooting#docsopenclawai-shows-an-ssl-error-comcastxfinity)。
請透過在此處回報來幫助我們解除封鎖：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

如果您仍然無法存取該網站，文檔已在 GitHub 上同步：
[https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

### 穩定版 和 Beta 版有什麼區別

**穩定版 (Stable)** 和 **Beta 版** 是 **npm 分發標籤**，而不是獨立的程式碼分支：

- `latest` = 穩定版
- `beta` = 用於測試的早期構建

我們將構建版本發布到 **beta**，進行測試，一旦構建版本穩定，我們就會將
**相同版本提升至 `latest`**。這就是為什麼 beta 和穩定版可能指向
**同一版本** 的原因。

查看變更內容：
[https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

### 如何安裝 Beta 版本，Beta 版和 Dev 版有什麼區別

**Beta** 是 npm 分發標籤 `beta`（可能與 `latest` 相符）。
**Dev** 是 `main` 的最新動態；發布時，它使用 npm 分發標籤 `dev`。

單行指令：

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
```

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Windows 安裝程式：
[https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

更多詳情：[開發頻道](/zh-Hant/install/development-channels) 與 [安裝程式旗標](/zh-Hant/install/installer)。

### 安裝與引導通常需要多久時間

大略指南：

- **安裝：** 2-5 分鐘
- **引導：** 5-15 分鐘，取決於您設定了多少頻道/模型

如果當住，請使用 [安裝程式當住](/zh-Hant/help/faq#installer-stuck-how-do-i-get-more-feedback)
與 [我卡住了](/zh-Hant/help/faq#im-stuck--whats-the-fastest-way-to-get-unstuck) 中的快速除錯迴圈。

### 我要如何嘗試最新版本

有兩個選項：

1. **Dev 頻道 (git checkout)：**

```bash
openclaw update --channel dev
```

這會切換到 `main` 分支並從原始碼更新。

2. **可駭客式安裝 (來自安裝程式網站)：**

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

這會提供您一個可編輯的本地儲存庫，然後透過 git 更新。

如果您偏好手動進行乾淨的複製，請使用：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
```

文件：[更新](/zh-Hant/cli/update)、[開發頻道](/zh-Hant/install/development-channels)、
[安裝](/zh-Hant/install)。

### 安裝程式當住 我要如何獲得更多回饋

使用 **詳細輸出** 重新執行安裝程式：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
```

Beta 安裝並啟用詳細輸出：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
```

若是可駭客式 (git) 安裝：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
```

Windows (PowerShell) 的對等指令：

```powershell
# install.ps1 has no dedicated -Verbose flag yet.
Set-PSDebug -Trace 1
& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
Set-PSDebug -Trace 0
```

更多選項：[安裝程式旗標](/zh-Hant/install/installer)。

### Windows 安裝顯示找不到 git 或無法辨識 openclaw

兩個常見的 Windows 問題：

**1) npm error spawn git / git not found**

- 安裝 **Git for Windows** 並確保 `git` 在您的 PATH 中。
- 關閉並重新開啟 PowerShell，然後重新執行安裝程式。

**2) openclaw is not recognized after install**

- 您的 npm 全域 bin 資料夾未在 PATH 中。
- 檢查路徑：

  ```powershell
  npm config get prefix
  ```

- 將該目錄加入您的使用者 PATH (Windows 上不需要 `\bin` 後綴；在大多數系統上它是 `%AppData%\npm`)。
- 更新 PATH 後，請關閉並重新開啟 PowerShell。

如果您想要最順暢的 Windows 設定，請使用 **WSL2** 而非原生 Windows。
文件：[Windows](/zh-Hant/platforms/windows)。

### Windows 執行輸出顯示亂碼中文文字 我該怎麼辦

這通常是原生 Windows Shell 上主控台字碼頁不相符造成的。

症狀：

- `system.run`/`exec` 輸出將中文顯示為亂碼
- 同一個指令在其他終端機設定檔中顯示正常

PowerShell 中的快速解決方法：

```powershell
chcp 65001
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
```

然後重新啟動 Gateway 並重試您的指令：

```powershell
openclaw gateway restart
```

如果您在最新版本的 OpenClaw 上仍然遇到此問題，請在以下位置追蹤/回報：

- [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

### 文件未解答我的問題，我該如何獲得更好的答案

使用 **可駭客式 (git) 安裝**，以便您在本地擁有完整的原始碼和文件，然後*從該資料夾中*詢問您的機器人（或 Claude/Codex），以便它可以讀取程式庫並精確回答。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

更多細節：[安裝](/zh-Hant/install) 和 [安裝程式旗標](/zh-Hant/install/installer)。

### 我如何在 Linux 上安裝 OpenClaw

簡短回答：按照 Linux 指南操作，然後執行入門設定。

- Linux 快速路徑 + 服務安裝：[Linux](/zh-Hant/platforms/linux)。
- 完整教學：[入門指南](/zh-Hant/start/getting-started)。
- 安裝程式 + 更新：[安裝與更新](/zh-Hant/install/updating)。

### 我如何在 VPS 上安裝 OpenClaw

任何 Linux VPS 均可運作。在伺服器上安裝，然後使用 SSH/Tailscale 連線至 Gateway。

指南：[exe.dev](/zh-Hant/install/exe-dev)、[Hetzner](/zh-Hant/install/hetzner)、[Fly.io](/zh-Hant/install/fly)。
遠端存取：[Gateway 遠端](/zh-Hant/gateway/remote)。

### cloudVPS 安裝指南在哪裡

我們提供了一個包含常見供應商的**託管中心**。選擇其中一個並按照指南操作：

- [VPS 託管](/zh-Hant/vps) (所有供應商在一處)
- [Fly.io](/zh-Hant/install/fly)
- [Hetzner](/zh-Hant/install/hetzner)
- [exe.dev](/zh-Hant/install/exe-dev)

在雲端中的運作方式：**Gateway 在伺服器上運作**，您可以透過控制 UI（或 Tailscale/SSH）從筆記型電腦/手機存取它。您的狀態 + 工作區存在於伺服器上，因此請將主機視為真實來源並進行備份。

您可以將 **節點** (Mac/iOS/Android/headless) 配對到該雲端 Gateway 以存取本機螢幕/相機/畫布，或在將 Gateway 保留在雲端中的同時在筆記型電腦上執行指令。

中心：[平台](/zh-Hant/platforms)。遠端存取：[Gateway 遠端](/zh-Hant/gateway/remote)。
節點：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)。

### 我可以要求 OpenClaw 自我更新嗎

簡短回答：**可行，但不建議**。更新流程可能會重新啟動
Gateway（這會中斷作用中的工作階段），可能需要乾淨的 git checkout，並且
可能會提示確認。更安全的方式：以操作員身分從 shell 執行更新。

使用 CLI：

```bash
openclaw update
openclaw update status
openclaw update --channel stable|beta|dev
openclaw update --tag <dist-tag|version>
openclaw update --no-restart
```

如果您必須透過代理程式自動化：

```bash
openclaw update --yes --no-restart
openclaw gateway restart
```

文件：[更新](/zh-Hant/cli/update)、[更新中](/zh-Hant/install/updating)。

### 入門實際上做了什麼

`openclaw onboard` 是建議的設定途徑。在**本機模式**下，它會引導您完成：

- **模型/驗證設定**（支援提供者 OAuth/setup-token 流程和 API 金鑰，加上 LM Studio 等本機模型選項）
- **工作區**位置 + 引導檔案
- **Gateway 設定**（bind/port/auth/tailscale）
- **提供者**（WhatsApp、Telegram、Discord、Mattermost (外掛)、Signal、iMessage）
- **Daemon 安裝**（macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd 使用者單元）
- **健康檢查**和**技能**選擇

如果您設定的模型未知或缺少驗證，它也會發出警告。

### 我需要 Claude 或 OpenAI 訂閱才能執行此程式嗎

不需要。您可以使用 **API 金鑰**（Anthropic/OpenAI/其他）或**僅限本機模型**
來執行 OpenClaw，讓您的資料留在您的裝置上。訂閱（Claude
Pro/Max 或 OpenAI Codex）是驗證這些提供者的選擇性方式。

如果您選擇 Anthropic 訂閱驗證，請自行決定是否使用：
Anthropic 過去曾在 Claude Code 之外封鎖部分訂閱使用。
OpenAI Codex OAuth 明確支援 OpenClaw 等外部工具。

文件：[Anthropic](/zh-Hant/providers/anthropic)、[OpenAI](/zh-Hant/providers/openai)、
[本機模型](/zh-Hant/gateway/local-models)、[模型](/zh-Hant/concepts/models)。

### 我可以在沒有 API 金鑰的情況下使用 Claude Max 訂閱嗎

可以。您可以使用 **setup-token**
代替 API 金鑰進行驗證。這是訂閱途徑。

Claude Pro/Max 訂閱**不包含 API 金鑰**，因此這是
訂閱帳戶的技術途徑。但這由您決定：Anthropic
過去曾在 Claude Code 之外封鎖部分訂閱使用。
如果您想要生產環境中最清晰且最安全的支援途徑，請使用 Anthropic API 金鑰。

### Anthropic setuptoken 驗證如何運作

`claude setup-token` 透過 Claude Code CLI 產生一個 **token 字串**（無法在網頁主控台取得）。您可以在**任何機器**上執行它。在入場流程中選擇 **Anthropic token (貼上 setup-token)**，或使用 `openclaw models auth paste-token --provider anthropic` 貼上。此 token 會以 auth profile 形式儲存給 **anthropic** provider 使用，就像 API key 一樣（不會自動重新整理）。更多細節：[OAuth](/zh-Hant/concepts/oauth)。

### 我在哪裡可以找到 Anthropic setuptoken

它**並不**在 Anthropic Console 中。setup-token 是由 **Claude Code CLI** 在**任何機器**上產生的：

```bash
claude setup-token
```

複製它印出的 token，然後在入場流程中選擇 **Anthropic token (貼上 setup-token)**。如果您想在 gateway 主機上執行，請使用 `openclaw models auth setup-token --provider anthropic`。如果您在其他地方執行了 `claude setup-token`，請在 gateway 主機上使用 `openclaw models auth paste-token --provider anthropic` 貼上。請參閱 [Anthropic](/zh-Hant/providers/anthropic)。

### 您是否支援 Claude 訂閱驗證（Claude Pro 或 Max）

是的 - 透過 **setup-token**。OpenClaw 不再重複使用 Claude Code CLI OAuth token；請使用 setup-token 或 Anthropic API key。您可以隨處產生 token 並貼到 gateway 主機上。請參閱 [Anthropic](/zh-Hant/providers/anthropic) 和 [OAuth](/zh-Hant/concepts/oauth)。

重要提示：這是技術相容性，並非政策保證。Anthropic 過去曾封鎖部分在 Claude Code 以外的訂閱使用。您需要自行決定是否使用並確認 Anthropic 目前的條款。對於生產環境或多用戶工作負載，Anthropic API key 驗證是更安全、推薦的選擇。

### 為什麼我會收到來自 Anthropic 的 HTTP 429 ratelimiterror

這表示您的 **Anthropic 配額/速率限制** 在當前時間視窗內已耗盡。如果您使用的是 **Claude 訂閱**（setup-token），請等待時間視窗重置或升級您的方案。如果您使用的是 **Anthropic API key**，請檢查 Anthropic Console 的使用量/計費情況，並視需要提高限制。

如果訊息特別是：
`Extra usage is required for long context requests`，表示該請求嘗試使用
Anthropic 的 1M 上下文測試版（`context1m: true`）。這只有在您的憑證符合長上下文計費資格（API key 計費或啟用 Extra Usage 的訂閱）時才有效。

提示：設定一個**備用模型**，這樣當供應商受到速率限制時，OpenClaw 可以繼續回覆。
請參閱 [模型](/zh-Hant/cli/models)、[OAuth](/zh-Hant/concepts/oauth) 和
[/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/zh-Hant/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

### 是否支援 AWS Bedrock

是 - 透過 pi-ai 的 **Amazon Bedrock (Converse)** 供應商並搭配 **手動設定**。您必須在 gateway 主機上提供 AWS 憑證/區域，並在您的模型設定中新增 Bedrock 供應商條目。請參閱 [Amazon Bedrock](/zh-Hant/providers/bedrock) 和 [模型供應商](/zh-Hant/providers/models)。如果您偏好受管理的金鑰流程，在 Bedrock 前面設一個相容 OpenAI 的 proxy 仍然是一個可行的選項。

### Codex 驗證是如何運作的

OpenClaw 透過 OAuth（ChatGPT 登入）支援 **OpenAI Code (Codex)**。入門流程可以執行 OAuth 流程，並會在適當時將預設模型設定為 `openai-codex/gpt-5.4`。請參閱 [模型供應商](/zh-Hant/concepts/model-providers) 和 [入門 (CLI)](/zh-Hant/start/wizard)。

### 你們是否支援 OpenAI 訂閱驗證 Codex OAuth

是的。OpenClaw 完全支援 **OpenAI Code (Codex) 訂閱 OAuth**。
OpenAI 明確允許在外部工具/工作流程（如 OpenClaw）中使用訂閱 OAuth。
入門流程可以為您執行 OAuth 流程。

請參閱 [OAuth](/zh-Hant/concepts/oauth)、[模型供應商](/zh-Hant/concepts/model-providers) 和 [入門 (CLI)](/zh-Hant/start/wizard)。

### 如何設定 Gemini CLI OAuth

Gemini CLI 使用的是 **外掛程式驗證流程**，而不是 `openclaw.json` 中的 client id 或 secret。

步驟：

1. 啟用外掛程式：`openclaw plugins enable google`
2. 登入：`openclaw models auth login --provider google-gemini-cli --set-default`

這會將 OAuth 權杖儲存在 gateway 主機上的驗證設定檔中。詳細資訊：[模型供應商](/zh-Hant/concepts/model-providers)。

### 本地端模型適合用於閒聊嗎

通常不適合。OpenClaw 需要長上下文 + 強大的安全性；顯卡記憶體小會導致截斷和洩漏。如果非要使用，請在本地端執行您能運作的 **最大** MiniMax M2.5 版本（LM Studio），並參閱 [/gateway/local-models](/zh-Hant/gateway/local-models)。較小/量化模型會增加提示注入風險 - 請參閱 [安全性](/zh-Hant/gateway/security)。

### 如何將託管模型的流量保留在特定區域

選擇區域固定的端點。OpenRouter 為 MiniMax、Kimi 和 GLM 提供了美國託管選項；選擇美國託管變體以將數據保留在該區域內。您仍然可以通過使用 `models.mode: "merge"` 將 Anthropic/OpenAI 與這些模型並列列出，以便在尊重您選擇的區域提供商的同時保持備用方案可用。

### 我需要購買 Mac Mini 才能安裝這個嗎

不需要。OpenClaw 可在 macOS 或 Linux（通過 WSL2 的 Windows）上運行。Mac mini 是可選的——有些人會購買它作為始終運行的主機，但小型 VPS、家庭服務器或樹莓派級別的設備也可以。

您只需要 Mac 來使用 **僅限 macOS 的工具**。對於 iMessage，請使用 [BlueBubbles](/zh-Hant/channels/bluebubbles)（推薦）——BlueBubbles 服務器在任何 Mac 上運行，而 Gateway 可以在 Linux 或其他地方運行。如果您想要其他僅限 macOS 的工具，請在 Mac 上運行 Gateway 或配對 macOS 節點。

文件：[BlueBubbles](/zh-Hant/channels/bluebubbles)、[節點](/zh-Hant/nodes)、[Mac 遠端模式](/zh-Hant/platforms/mac/remote)。

### 我需要 Mac mini 才能支援 iMessage 嗎

您需要**登入 Messages 的某種 macOS 設備**。它**不**必須是 Mac mini——任何 Mac 都可以。對於 iMessage，**請使用 [BlueBubbles](/zh-Hant/channels/bluebubbles)**（推薦）——BlueBubbles 服務器在 macOS 上運行，而 Gateway 可以在 Linux 或其他地方運行。

常見設定方式：

- 在 Linux/VPS 上運行 Gateway，並在任何登入 Messages 的 Mac 上運行 BlueBubbles 服務器。
- 如果您想要最簡單的單機設定，請在 Mac 上運行所有內容。

文件：[BlueBubbles](/zh-Hant/channels/bluebubbles)、[節點](/zh-Hant/nodes)、
[Mac 遠端模式](/zh-Hant/platforms/mac/remote)。

### 如果我購買 Mac mini 來運行 OpenClaw，我可以將它連接到我的 MacBook Pro 嗎

可以。**Mac mini 可以運行 Gateway**，而您的 MacBook Pro 可以作為
**節點**（伴隨設備）連接。節點不運行 Gateway——它們提供該設備上的螢幕/相機/畫布和 `system.run` 等額外功能。

常見模式：

- Gateway 在 Mac mini 上運行（始終開機）。
- MacBook Pro 運行 macOS 應用程式或節點主機並與 Gateway 配對。
- 使用 `openclaw nodes status` / `openclaw nodes list` 來查看它。

文件：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)。

### 我可以使用 Bun 嗎

**不建議**使用 Bun。我們發現執行時期錯誤，特別是在 WhatsApp 和 Telegram 方面。
請使用 **Node** 以獲得穩定的閘道。

如果您仍想嘗試 Bun，請在非生產環境的閘道上進行，
且不包含 WhatsApp/Telegram。

### Telegram 在 allowFrom 中填什麼

`channels.telegram.allowFrom` 是 **人類發送者的 Telegram 使用者 ID**（數字）。它不是機器人用戶名。

入門流程接受 `@username` 輸入並將其解析為數字 ID，但 OpenClaw 授權僅使用數字 ID。

較安全（無第三方機器人）：

- 私訊您的機器人，然後執行 `openclaw logs --follow` 並讀取 `from.id`。

官方 Bot API：

- 私訊您的機器人，然後呼叫 `https://api.telegram.org/bot<bot_token>/getUpdates` 並讀取 `message.from.id`。

第三方（隱私性較低）：

- 私訊 `@userinfobot` 或 `@getidsbot`。

請參閱 [/channels/telegram](/zh-Hant/channels/telegram#access-control-dms--groups)。

### 多個人是否可以使用一個 WhatsApp 號碼搭配不同的 OpenClaw 執行個體

可以，透過**多代理程式路由**。將每個發送者的 WhatsApp **私訊**（對等端 `kind: "direct"`，發送者 E.164 格式如 `+15551234567`）綁定到不同的 `agentId`，這樣每個人都能獲得自己的工作區和會話儲存庫。回覆仍然來自**同一個 WhatsApp 帳號**，且私訊存取控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）是每個 WhatsApp 帳號的全域設定。請參閱 [多代理程式路由](/zh-Hant/concepts/multi-agent) 和 [WhatsApp](/zh-Hant/channels/whatsapp)。

### 我可以同時執行一個快速聊天代理程式和一個用於編碼的 Opus 代理程式嗎

可以。使用多代理程式路由：為每個代理程式指定其預設模型，然後將輸入路由（提供者帳號或特定對等端）綁定到每個代理程式。範例設定位於 [多代理程式路由](/zh-Hant/concepts/multi-agent)。另請參閱 [模型](/zh-Hant/concepts/models) 和 [設定](/zh-Hant/gateway/configuration)。

### Homebrew 可以在 Linux 上運作嗎

可以。Homebrew 支援 Linux (Linuxbrew)。快速設定：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
brew install <formula>
```

如果您透過 systemd 執行 OpenClaw，請確保服務的 PATH 包含 `/home/linuxbrew/.linuxbrew/bin` （或您的 brew 前綴），這樣 `brew` 安裝的工具才能在非登入 shell 中正確解析。
最新的版本也會在 Linux systemd 服務中將常見的使用者 bin 目錄加入 PATH 前綴（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），並且在設定時會遵守 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

### 可修改的 git 安裝與 npm 安裝有什麼不同

- **可修改 安裝：** 完整的原始碼檢出，可編輯，最適合貢獻者。
  您在本地執行建置並可以修改程式碼/文件。
- **npm 安裝：** 全域 CLI 安裝，沒有原始碼庫，最適合「直接執行」。
  更新來自 npm dist-tags。

文件：[入門指南](/zh-Hant/start/getting-started)、[更新](/zh-Hant/install/updating)。

### 我可以稍後在 npm 和 git 安裝之間切換嗎

可以。安裝另一個版本，然後執行 Doctor，讓閘道服務指向新的進入點。
這**不會刪除您的資料**——它只會變更 OpenClaw 程式碼的安裝。您的狀態
(`~/.openclaw`) 和工作區 (`~/.openclaw/workspace`) 將保持不變。

從 npm → git：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
openclaw doctor
openclaw gateway restart
```

從 git → npm：

```bash
npm install -g openclaw@latest
openclaw doctor
openclaw gateway restart
```

Doctor 會偵測到閘道服務進入點不匹配，並提議重寫服務設定以符合目前的安裝（在自動化中使用 `--repair`）。

備份提示：請參閱 [備份策略](/zh-Hant/help/faq#whats-the-recommended-backup-strategy)。

### 我應該在筆記型電腦或 VPS 上執行閘道器嗎

簡短回答：**如果您想要 24/7 的可靠性，請使用 VPS**。如果您想要
最低的摩擦力，並且可以接受休眠/重新啟動，請在本地執行。

**筆記型電腦 (本地閘道器)**

- **優點：** 沒有伺服器成本，可直接存取本地檔案，即時瀏覽器視窗。
- **缺點：** 休眠/網路斷線 = 中斷連線，作業系統更新/重新啟動會中斷，必須保持喚醒。

**VPS / 雲端**

- **優點：** 永遠在線，穩定的網路，沒有筆記型電腦休眠問題，更容易保持執行。
- **缺點：** 經常無頭運行（使用螢幕截圖），僅限遠端檔案存取，您必須使用 SSH 進行更新。

**OpenClaw 特別說明：** WhatsApp/Telegram/Slack/Mattermost（外掛）/Discord 都可以在 VPS 上正常運作。唯一真正的取捨是 **無頭瀏覽器** 與可見視窗之間的選擇。請參閱 [瀏覽器](/zh-Hant/tools/browser)。

**建議預設：** 如果您之前遇到過閘道中斷連線的問題，請選擇 VPS。當您積極使用 Mac 並想要本機檔案存取或使用可見瀏覽器進行 UI 自動化時，本機環境非常適合。

### 在專用機器上執行 OpenClaw 有多重要

非必須，但為了**可靠性和隔離性建議採用**。

- **專用主機 (VPS/Mac mini/Pi)：** 永遠在線，較少的休眠/重新啟動中斷，權限更乾淨，更容易保持運作。
- **共用筆記型電腦/桌機：** 完全適合測試和主動使用，但請預期當機器休眠或更新時會有暫停的情況。

如果您想要兩全其美，請將閘道保留在專用主機上，並將您的筆記型電腦配對為 **節點**，用於本機螢幕/相機/執行工具。請參閱 [節點](/zh-Hant/nodes)。
如需安全性指導，請閱讀 [安全性](/zh-Hant/gateway/security)。

### VPS 的最低要求和推薦作業系統是什麼

OpenClaw 非常輕量。對於基本的閘道 + 一個聊天頻道：

- **絕對最低要求：** 1 vCPU，1GB RAM，約 500MB 磁碟空間。
- **建議：** 1-2 vCPU，2GB RAM 或更多以提供餘裕（日誌、媒體、多頻道）。節點工具和瀏覽器自動化可能會消耗較多資源。

OS：使用 **Ubuntu LTS**（或任何現代化的 Debian/Ubuntu）。Linux 的安裝路徑在此經過了最充分的測試。

文件：[Linux](/zh-Hant/platforms/linux)、[VPS 託管](/zh-Hant/vps)。

### 我可以在 VM 中執行 OpenClaw 嗎，有什麼要求

可以。將 VM 視為與 VPS 相同：它需要永遠在線、可連線，並且為閘道和您啟用的任何頻道擁有足夠的 RAM。

基礎指導：

- **絕對最低要求：** 1 vCPU，1GB RAM。
- **建議：** 如果您執行多個頻道、瀏覽器自動化或媒體工具，請使用 2GB RAM 或更多。
- **OS：** Ubuntu LTS 或其他現代化的 Debian/Ubuntu。

如果您使用的是 Windows，**WSL2 是最簡單的 VM 風格設置**，並且具有最佳的工具
相容性。請參閱 [Windows](/zh-Hant/platforms/windows)、[VPS 託管](/zh-Hant/vps)。
如果您在 VM 中執行 macOS，請參閱 [macOS VM](/zh-Hant/install/macos-vm)。

## 什麼是 OpenClaw？

### 用一段話介紹 OpenClaw

OpenClaw 是您在自己的裝置上執行的個人 AI 助手。它會在您已經使用的傳訊介面上回覆（WhatsApp、Telegram、Slack、Mattermost (plugin)、Discord、Google Chat、Signal、iMessage、WebChat），並且還可以在支援的平台上進行語音 + 即時 Canvas 操作。**Gateway** 是永遠在線的控制平面；助手則是產品本身。

### 價值主張是什麼

OpenClaw 不僅僅是「一個 Claude 包裝器」。它是一個 **本地優先的控制平面**，讓您在
**您自己的硬體** 上執行功能強大的助手，可從您已經使用的聊天應用程式存取，並擁有
有狀態的工作階段、記憶和工具 - 而無需將您的工作流程控制權交給託管的
SaaS。

亮點：

- **您的裝置，您的資料：** 在您想要的任何地方（Mac、Linux、VPS）執行 Gateway，並將
  工作區 + 工作階段歷史記錄保留在本地。
- **真實的頻道，而非網頁沙箱：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/等，
  加上支援的平台上的行動語音和 Canvas。
- **模型無關性：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，並進行每個代理程式的路由
  和故障轉移。
- **僅限本地的選項：** 執行本地模型，因此如果您願意，**所有資料都可以保留在您的裝置上**。
- **多代理程式路由：** 按頻道、帳戶或任務分開的代理程式，每個都有自己
  的工作區和預設值。
- **開源且可駭客：** 檢查、擴展和自我託管，無供應商鎖定。

文件：[Gateway](/zh-Hant/gateway)、[Channels](/zh-Hant/channels)、[Multi-agent](/zh-Hant/concepts/multi-agent)、
[Memory](/zh-Hant/concepts/memory)。

### 我剛設定好，首先應該做什麼

不錯的入門專案：

- 建立網站（WordPress、Shopify 或簡單的靜態網站）。
- 製作行動應用程式原型（大綱、畫面、API 計劃）。
- 整理檔案和資料夾（清理、命名、標記）。
- 連接 Gmail 並自動執行摘要或後續追蹤。

它可以處理大型任務，但當您將其分為階段並
使用子代理程式進行並行工作時，效果最好。

### OpenClaw 的前五大日常使用案例是什麼

日常成果通常如下所示：

- **個人簡報：** 您關注的收件箱、行事曆和新聞摘要。
- **研究與起草：** 快速研究、摘要，以及電子郵件或文件的初稿。
- **提醒與追蹤：** 由 cron 或心跳驅動的提醒與檢查清單。
- **瀏覽器自動化：** 填寫表單、收集資料以及重複執行的網頁任務。
- **跨裝置協調：** 從手機發送任務，讓 Gateway 在伺服器上執行，並在聊天中取回結果。

### OpenClaw 能否協助 SaaS 的潛在客戶開發外聯、廣告和部落格

是的，適用於 **研究、評估和起草**。它可以掃描網站、建立候選名單、總結潛在客戶，並撰寫外聯或廣告文案的草稿。

對於 **外聯或廣告投放**，請保持人機協作。避免垃圾郵件，遵守當地法律和平台政策，並在發送前審查所有內容。最安全的模式是讓 OpenClaw 起草，由您來批准。

文件：[安全] (/en/gateway/security)。

### 與 Claude Code 相比，OpenClaw 在網頁開發方面有什麼優勢

OpenClaw 是一個 **個人助理** 和協調層，並非 IDE 的替代品。請使用 Claude Code 或 Codex 在儲存庫內進行最快的直接編碼迴圈。當您需要持久記憶、跨裝置存取和工具協調時，請使用 OpenClaw。

優勢：

- **跨工作階段的持久記憶 + 工作區**
- **多平台存取** (WhatsApp、Telegram、TUI、WebChat)
- **工具協調** (瀏覽器、檔案、排程、hooks)
- **永遠線上的 Gateway** (在 VPS 上執行，從任何地方互動)
- **節點** 用於本地瀏覽器/螢幕/相機/exec

展示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

## 技能與自動化

### 如何在不弄髒儲存庫的情況下自訂技能

使用受管理的覆寫，而不是編輯儲存庫副本。將您的變更放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或透過 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 新增資料夾）。優先順序是 `<workspace>/skills` > `~/.openclaw/skills` > 內建，因此受管理的覆寫會在無需接觸 git 的情況下勝出。只有值得上傳的編輯才應存在於儲存庫中並作為 PR 送出。

### 我可以從自訂資料夾載入技能嗎

是的。您可以透過 `skills.load.extraDirs` 在 `~/.openclaw/openclaw.json` 中新增額外的目錄（優先級最低）。預設優先級保持不變：`<workspace>/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`。`clawhub` 預設安裝到 `./skills`，OpenClaw 將其視為 `<workspace>/skills`。

### 如何針對不同任務使用不同的模型

目前支援的模式有：

- **Cron 任務**：隔離的任務可以為每個任務設定 `model` 覆蓋。
- **子代理程式**：將任務路由到具有不同預設模型的獨立代理程式。
- **按需切換**：使用 `/model` 隨時切換目前會話的模型。

請參閱 [Cron 任務](/zh-Hant/automation/cron-jobs)、[多代理程式路由](/zh-Hant/concepts/multi-agent) 和 [斜線指令](/zh-Hant/tools/slash-commands)。

### 機器人在執行繁重工作時會凍結。我該如何將其卸載

對於長時間或並行任務，請使用 **子代理程式**。子代理程式在自己的會話中運行，
返回摘要，並保持您的主要聊天回應暢通。

請要求您的機器人「為此任務產生子代理程式」或使用 `/subagents`。
在聊天中使用 `/status` 查看 Gateway 目前正在做什麼（以及它是否忙碌）。

Token 提示：長時間任務和子代理程式都會消耗 token。如果您關注成本，可以透過 `agents.defaults.subagents.model` 為子代理程式設定更便宜的模型。

文件：[子代理程式](/zh-Hant/tools/subagents)。

### Discord 上執行緒綁定的子代理程式會話如何運作

使用執行緒綁定。您可以將 Discord 執行緒綁定到子代理程式或會話目標，以便該執行緒中的後續訊息保持在該綁定的會話上。

基本流程：

- 使用 `thread: true` 透過 `sessions_spawn` 產生（可選擇搭配 `mode: "session"` 以進行持續的後續追蹤）。
- 或使用 `/focus <target>` 手動綁定。
- 使用 `/agents` 檢查綁定狀態。
- 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自動取消聚焦。
- 使用 `/unfocus` 分離執行緒。

必要配置：

- 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
- Discord 覆寫值：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
- 生成時自動綁定：設定 `channels.discord.threadBindings.spawnSubagentSessions: true`。

文件：[Sub-agents](/zh-Hant/tools/subagents)、[Discord](/zh-Hant/channels/discord)、[Configuration Reference](/zh-Hant/gateway/configuration-reference)、[Slash commands](/zh-Hant/tools/slash-commands)。

### Cron 或提醒未觸發，我應該檢查什麼

Cron 在 Gateway 程序內執行。如果 Gateway 未持續執行，排程的工作將不會執行。

檢查清單：

- 確認 cron 已啟用 (`cron.enabled`) 且未設定 `OPENCLAW_SKIP_CRON`。
- 檢查 Gateway 是否全天候執行 (無休眠/重新啟動)。
- 驗證工作的時區設定 (`--tz` 與主機時區)。

除錯：

```bash
openclaw cron run <jobId> --force
openclaw cron runs --id <jobId> --limit 50
```

文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Cron vs Heartbeat](/zh-Hant/automation/cron-vs-heartbeat)。

### 我如何在 Linux 上安裝技能

使用 **ClawHub** (CLI) 或將技能放入您的工作區。macOS 技能 UI 在 Linux 上無法使用。
瀏覽位於 [https://clawhub.com](https://clawhub.com) 的技能。

安裝 ClawHub CLI (選擇一個套件管理器)：

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

### OpenClaw 可以排程執行任務或在後台連續執行嗎

可以。使用 Gateway 排程器：

- 針對排程或週期性任務使用 **Cron jobs** (跨重新啟動持續存在)。
- 針對「主會話」定期檢查使用 **Heartbeat**。
- 針對發佈摘要或傳送到聊天的自主代理程式使用 **Isolated jobs**。

文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Cron vs Heartbeat](/zh-Hant/automation/cron-vs-heartbeat)、
[Heartbeat](/zh-Hant/gateway/heartbeat)。

### 我可以從 Linux 執行僅限 Apple macOS 的技能嗎？

無法直接執行。macOS 技能受到 `metadata.openclaw.os` 加上所需二進位檔案的閘道控制，而且只有在 **Gateway 主機** 上符合資格時，技能才會出現在系統提示中。在 Linux 上，除非您覆寫閘道控制，否則 `darwin` 專屬技能 (例如 `apple-notes`、`apple-reminders`、`things-mac`) 將不會載入。

您有三種支援的模式：

**選項 A - 在 Mac 上執行 Gateway（最簡單）。**
在 macOS 二進位檔案存在的位置執行 Gateway，然後從 Linux 以[遠端模式](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere)或透過 Tailscale 進行連接。由於 Gateway 主機是 macOS，技能會正常載入。

**選項 B - 使用 macOS 節點（無 SSH）。**
在 Linux 上執行 Gateway，配對 macOS 節點（功能表列應用程式），並在 Mac 上將 **Node Run Commands** 設定為「Always Ask」或「Always Allow」。當節點上存在所需的二進位檔案時，OpenClaw 可以將僅限 macOS 的技能視為可用。代理程式會透過 `nodes` 工具執行這些技能。如果您選擇「Always Ask」，在提示中批准「Always Allow」會將該指令新增到允許清單中。

**選項 C - 透過 SSH 代理 macOS 二進位檔案（進階）。**
將 Gateway 保留在 Linux 上，但讓所需的 CLI 二進位檔案解析為在 Mac 上執行的 SSH 包裝程式。然後覆寫技能以允許 Linux，使其保持可用狀態。

1. 為二進位檔案建立 SSH 包裝程式（例如：針對 Apple Notes 使用 `memo`）：

   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
   ```

2. 將包裝程式放在 Linux 主機的 `PATH` 上（例如 `~/bin/memo`）。
3. 覆寫技能中繼資料（工作區或 `~/.openclaw/skills`）以允許 Linux：

   ```markdown
   ---
   name: apple-notes
   description: Manage Apple Notes via the memo CLI on macOS.
   metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
   ---
   ```

4. 啟動新工作階段，以便重新整理技能快照。

### 您是否有 Notion 或 HeyGen 整合功能

目前尚未內建。

選項：

- **自訂技能 / 外掛程式：** 最適合用於可靠的 API 存取（Notion 和 HeyGen 都有 API）。
- **瀏覽器自動化：** 無需程式碼即可運作，但速度較慢且較不穩定。

如果您想為每個客戶保留情境（代理機構工作流程），一個簡單的模式是：

- 每個客戶一個 Notion 頁面（情境 + 偏好設定 + 進行中的工作）。
- 請求代理程式在工作階段開始時擷取該頁面。

如果您想要原生整合，請提出功能請求或建構以這些 API 為目標的技能。

安裝技能：

```bash
clawhub install <skill-slug>
clawhub update --all
```

ClawHub 會安裝到您目前目錄下的 `./skills` 中（或者回退到您設定的 OpenClaw 工作區）；OpenClaw 在下一次會話中會將其視為 `<workspace>/skills`。若要在代理之間共享技能，請將它們放在 `~/.openclaw/skills/<name>/SKILL.md` 中。某些技能預期透過 Homebrew 安裝二進位檔案；在 Linux 上這意味著 Linuxbrew（請參閱上面的 Homebrew Linux FAQ 條目）。請參閱 [技能](/zh-Hant/tools/skills) 和 [ClawHub](/zh-Hant/tools/clawhub)。

### 如何將我現有已登入的 Chrome 與 OpenClaw 搭配使用

使用內建的 `user` 瀏覽器設定檔，它透過 Chrome DevTools MCP 連接：

```bash
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot
```

如果您想要自訂名稱，請建立一個明確的 MCP 設定檔：

```bash
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser --browser-profile chrome-live tabs
```

此路徑是主機本機的。如果 Gateway 在其他地方運行，請在瀏覽器機器上運行節點主機，或者改用遠端 CDP。

## 沙箱與記憶體

### 是否有專門的沙箱文件

有的。請參閱 [沙箱](/zh-Hant/gateway/sandboxing)。有關 Docker 特定設定（Docker 中的完整 gateway 或沙箱映像檔），請參閱 [Docker](/zh-Hant/install/docker)。

### Docker 感覺功能受限。如何啟用完整功能

預設映像檔以安全為先，並以 `node` 使用者身分運行，因此它不包含系統套件、Homebrew 或內建的瀏覽器。若要進行更完整的設定：

- 使用 `OPENCLAW_HOME_VOLUME` 持續保存 `/home/node`，以便快取得以保留。
- 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 將系統相依性建置到映像檔中。
- 透過內建的 CLI 安裝 Playwright 瀏覽器：
  `node /app/node_modules/playwright-core/cli.js install chromium`
- 設定 `PLAYWRIGHT_BROWSERS_PATH` 並確保該路徑被持續保存。

文件：[Docker](/zh-Hant/install/docker)、[瀏覽器](/zh-Hant/tools/browser)。

**我是否可以將私訊保持個人化，但讓群組公開，並使用一個代理進行沙箱化**

可以——如果您的私人流量是 **私訊 (DMs)**，而您的公開流量是 **群組**。

使用 `agents.defaults.sandbox.mode: "non-main"`，使群組/頻道會話（非主要金鑰）在 Docker 中運行，而主要私訊會話保留在主機上。然後透過 `tools.sandbox.tools` 限制沙箱化會話中可用的工具。

設定逐步解說 + 範例設定：[群組：個人私訊 + 公開群組](/zh-Hant/channels/groups#pattern-personal-dms-public-groups-single-agent)

關鍵設定參考：[Gateway configuration](/zh-Hant/gateway/configuration#agentsdefaultssandbox)

### 如何將主機資料夾綁定到沙盒

將 `agents.defaults.sandbox.docker.binds` 設定為 `["host:path:mode"]` (例如 `"/home/user/src:/src:ro"`)。全域 + 每個代理程式的綁定會合併；當 `scope: "shared"` 時，會忽略每個代理程式的綁定。對任何敏感內容使用 `:ro`，並記住綁定會繞過沙盒檔案系統的防護牆。範例和安全說明請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing#custom-bind-mounts) 和 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。

### 記憶體是如何運作的

OpenClaw 的記憶體只是代理程式工作區中的 Markdown 檔案：

- `memory/YYYY-MM-DD.md` 中的每日筆記
- `MEMORY.md` 中的策展長期筆記 (僅限主要/私人階段)

OpenClaw 也會執行 **靜默預壓縮記憶體排清**，以提醒模型在自動壓縮之前寫入持久筆記。這僅在工作區可寫入時執行 (唯讀沙盒會跳過)。請參閱 [Memory](/zh-Hant/concepts/memory)。

### 記憶體一直忘記事情，我要如何讓它記住

請要求機器人 **將事實寫入記憶體**。長期筆記屬於 `MEMORY.md`，短期內容則進入 `memory/YYYY-MM-DD.md`。

這仍是我們正在改進的領域。提醒模型儲存記憶體會有幫助；它會知道該怎麼做。如果它持續忘記，請驗證 Gateway 是否在每次執行時都使用相同的工作區。

文件：[Memory](/zh-Hant/concepts/memory)、[Agent workspace](/zh-Hant/concepts/agent-workspace)。

### 語意記憶體搜尋是否需要 OpenAI API 金鑰

僅限於您使用 **OpenAI embeddings** 時。Codex OAuth 涵蓋聊天/補全，並**不**授予嵌入權限，因此 **透過 Codex 登入 (OAuth 或 Codex CLI 登入)** 對語意記憶體搜尋沒有幫助。OpenAI embeddings 仍然需要真實的 API 金鑰 (`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`)。

如果您未明確設定供應商，當 OpenClaw 可以解析 API 金鑰（auth 設定檔、`models.providers.*.apiKey` 或環境變數）時，它會自動選擇供應商。
如果解析到 OpenAI 金鑰，它會優先使用 OpenAI，否則如果解析到 Gemini 金鑰則使用 Gemini，接著是 Voyage，然後是 Mistral。如果沒有可用的遠端金鑰，記憶體搜尋將保持停用狀態，直到您設定它為止。如果您設定並提供本機模型路徑，OpenClaw
會優先使用 `local`。當您明確設定
`memorySearch.provider = "ollama"` 時，支援 Ollama。

如果您寧願保持在本機，請設定 `memorySearch.provider = "local"`（並選擇性地
設定 `memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，請設定
`memorySearch.provider = "gemini"` 並提供 `GEMINI_API_KEY`（或
`memorySearch.remote.apiKey`）。我們支援 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本機** 嵌入
模型 - 請參閱 [記憶體](/zh-Hant/concepts/memory) 以了解設定詳細資訊。

### 記憶體會永久保存嗎？有哪些限制？

記憶體檔案儲存在磁碟上，並持續保存直到您刪除它們。限制取決於您的
儲存空間，而非模型。**工作階段內容** 仍然受限於模型的
內容視窗，因此長對話可能會壓縮或截斷。這就是
記憶體搜尋存在的原因 - 它只將相關的部分拉回內容中。

文件：[記憶體](/zh-Hant/concepts/memory)、[內容](/zh-Hant/concepts/context)。

## 檔案在磁碟上的位置

### 與 OpenClaw 一起使用的所有資料都會儲存在本機嗎？

不 - **OpenClaw 的狀態是本機的**，但 **外部服務仍然可以看到您傳送給它們的內容**。

- **預設為本機：** 工作階段、記憶體檔案、設定和工作區位於 Gateway 主機上
  (`~/.openclaw` + 您的工作區目錄)。
- **必要時為遠端：** 您傳送給模型供應商（Anthropic/OpenAI 等）的訊息會傳送到
  它們的 API，而聊天平台（WhatsApp/Telegram/Slack 等）會在其
  伺服器上儲存訊息資料。
- **您掌控數據足跡：** 使用本機模型可將提示保留在您的機器上，但頻道
  流量仍然會通過頻道的伺服器。

相關內容：[Agent 工作區](/zh-Hant/concepts/agent-workspace)、[記憶體](/zh-Hant/concepts/memory)。

### OpenClaw 將其資料儲存在哪裡？

所有內容都位於 `$OPENCLAW_STATE_DIR` 下（預設值：`~/.openclaw`）：

| 路徑                                                            | 用途                                                             |
| --------------------------------------------------------------- | ---------------------------------------------------------------- |
| `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主要設定 (JSON5)                                                 |
| `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 舊版 OAuth 匯入（首次使用時會複製到 auth profiles）              |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Auth profiles（OAuth、API 金鑰，以及可選的 `keyRef`/`tokenRef`） |
| `$OPENCLAW_STATE_DIR/secrets.json`                              | 可選的檔案支援 Secret 載荷，用於 `file` SecretRef 提供者         |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 舊版相容性檔案（靜態 `api_key` 條目已被清除）                    |
| `$OPENCLAW_STATE_DIR/credentials/`                              | 提供者狀態（例如 `whatsapp/<accountId>/creds.json`）             |
| `$OPENCLAW_STATE_DIR/agents/`                                   | 個別代理程式狀態（agentDir + sessions）                          |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 對話歷史與狀態（每個代理程式）                                   |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Session 元資料（每個代理程式）                                   |

舊版單一代理程式路徑：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）。

您的 **工作區**（AGENTS.md、記憶檔案、技能等）是分開的，並透過 `agents.defaults.workspace` 進行設定（預設值：`~/.openclaw/workspace`）。

### AGENTSmd、SOULmd、USERmd、MEMORYmd 應該放在哪裡

這些檔案位於 **代理程式工作區** 中，而不是 `~/.openclaw`。

- **工作區（每個代理程式）**：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
  `MEMORY.md`（當缺少 `MEMORY.md` 時，則使用舊版備用 `memory.md`）、
  `memory/YYYY-MM-DD.md`、可選的 `HEARTBEAT.md`。
- **狀態目錄（`~/.openclaw`）**：設定、憑證、auth profiles、sessions、記錄檔，
  以及共享技能（`~/.openclaw/skills`）。

預設工作區是 `~/.openclaw/workspace`，可透過以下方式設定：

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

如果機器人在重新啟動後「忘記」了內容，請確認 Gateway 在每次啟動時都使用相同的
工作區（請記住：遠端模式使用的是 **gateway 主機的**
工作區，而不是您本地的筆記型電腦）。

提示：如果您希望某種行為或偏好設定能持久保存，請要求機器人將其**寫入
AGENTS.md 或 MEMORY.md**，而不是依賴聊天記錄。

請參閱 [Agent workspace](/zh-Hant/concepts/agent-workspace) 和 [Memory](/zh-Hant/concepts/memory)。

### 推薦的備份策略是什麼

將您的 **agent workspace** 放入一個**私有** git 儲存庫，並將其備份到某個私有位置（例如 GitHub 私有儲存庫）。這會儲存記憶體以及 AGENTS/SOUL/USER 檔案，讓您稍後能還原助理的「大腦」。

**切勿**提交 `~/.openclaw` 下的任何內容（憑證、工作階段、權杖或加密的機密承載）。
如果您需要完整還原，請分別備份 workspace 和 state 目錄
（請參閱上述的遷移問題）。

文件：[Agent workspace](/zh-Hant/concepts/agent-workspace)。

### 如何完全解除安裝 OpenClaw

請參閱專屬指南：[Uninstall](/zh-Hant/install/uninstall)。

### Agents 可以在 workspace 之外運作嗎

可以。Workspace 是**預設的 cwd** 和記憶體錨點，而不是嚴格的沙箱。
相對路徑在 workspace 內解析，但絕對路徑可以存取其他
主機位置，除非啟用了沙箱功能。如果您需要隔離，請使用
[`agents.defaults.sandbox`](/zh-Hant/gateway/sandboxing) 或個別 agent 的沙箱設定。如果您
希望某個儲存庫成為預設的工作目錄，請將該 agent 的
`workspace` 指向儲存庫根目錄。OpenClaw 儲存庫只是原始碼；請將
workspace 分開存放，除非您有意讓 agent 在其中運作。

範例（儲存庫作為預設 cwd）：

```json5
{
  agents: {
    defaults: {
      workspace: "~/Projects/my-repo",
    },
  },
}
```

### 我在遠端模式，session store 在哪裡

Session 狀態歸屬於**gateway host**。如果您處於遠端模式，您關心的 session store 位於遠端機器上，而不是您的本地筆記型電腦。請參閱 [Session management](/zh-Hant/concepts/session)。

## Config 基礎

### Config 是什麼格式 它在哪裡

OpenClaw 會從 `$OPENCLAW_CONFIG_PATH` 讀取選用的 **JSON5** config（預設：`~/.openclaw/openclaw.json`）：

```
$OPENCLAW_CONFIG_PATH
```

如果檔案不存在，它會使用相對安全的預設值（包括預設 workspace `~/.openclaw/workspace`）。

### 我設定了 gatewaybind lan 或 tailnet，但現在沒有東西在監聽，UI 顯示未授權

非迴圈綁定 **需要驗證**。請設定 `gateway.auth.mode` + `gateway.auth.token`（或使用 `OPENCLAW_GATEWAY_TOKEN`）。

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

備註：

- `gateway.remote.token` / `.password` **不會**單獨啟用本機閘道驗證。
- 僅當 `gateway.auth.*` 未設定時，本機呼叫路徑才能將 `gateway.remote.*` 作為後備。
- 如果 `gateway.auth.token` / `gateway.auth.password` 透過 SecretRef 明確設定但未解析，解析將會失敗並關閉（不會有遠端後備遮罩）。
- 控制 UI 透過 `connect.params.auth.token` 進行驗證（儲存在 app/UI 設定中）。請避免在 URL 中放入權杖。

### 為什麼現在本機連線需要權杖

OpenClaw 預設強制執行權杖驗證，包括迴圈。如果未設定權杖，閘道啟動時會自動產生一個並將其儲存到 `gateway.auth.token`，因此 **本機 WS 用戶端必須通過驗證**。這會阻止其他本機程序呼叫閘道。

如果您 **真的** 想要開放迴圈，請在設定中明確設定 `gateway.auth.mode: "none"`。Doctor 可以隨時為您產生權杖：`openclaw doctor --generate-gateway-token`。

### 變更設定後需要重新啟動嗎

閘道會監視設定並支援熱重載：

- `gateway.reload.mode: "hybrid"`（預設）：熱套用安全變更，關鍵變更則重新啟動
- `hot`、`restart`、`off` 也受支援

### 如何停用有趣的 CLI 標語

在設定中設定 `cli.banner.taglineMode`：

```json5
{
  cli: {
    banner: {
      taglineMode: "off", // random | default | off
    },
  },
}
```

- `off`：隱藏標語文字，但保留橫幅標題/版本行。
- `default`：每次都使用 `All your chats, one OpenClaw.`。
- `random`：輪換顯示有趣/季節性標語（預設行為）。
- 如果您完全不想要橫幅，請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

### 如何啟用網頁搜尋和網頁擷取

`web_fetch` 不需要 API 金鑰即可運作。`web_search` 需要為您選擇的供應商（Brave、Gemini、Grok、Kimi 或 Perplexity）提供金鑰。
**建議：** 執行 `openclaw configure --section web` 並選擇供應商。
環境變數替代方案：

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

備註：

- 如果您使用允許清單，請新增 `web_search`/`web_fetch` 或 `group:web`。
- `web_fetch` 預設為啟用（除非明確停用）。
- 後台程式會從 `~/.openclaw/.env`（或服務環境）讀取環境變數。

文件：[Web 工具](/zh-Hant/tools/web)。

### 如何在不同裝置上運行具有專用工作程式的中央 Gateway

常見模式是 **一個 Gateway**（例如：樹莓派）加上 **節點** 和 **代理程式**：

- **Gateway（中央）：** 擁有通道（Signal/WhatsApp）、路由和工作階段。
- **節點（裝置）：** Mac/iOS/Android 作為周邊裝置連接並公開本地工具（`system.run`、`canvas`、`camera`）。
- **代理程式（工作程式）：** 用於特殊角色的獨立大腦/工作區（例如：「Hetzner 運維」、「個人資料」）。
- **子代理程式：** 當您需要並行處理時，從主代理程式產生背景工作。
- **TUI：** 連接到 Gateway 並切換代理程式/工作階段。

文件：[節點](/zh-Hant/nodes)、[遠端存取](/zh-Hant/gateway/remote)、[多重代理程式路由](/zh-Hant/concepts/multi-agent)、[子代理程式](/zh-Hant/tools/subagents)、[TUI](/zh-Hant/web/tui)。

### OpenClaw 瀏覽器可以無頭模式執行嗎

可以。這是一個配置選項：

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

預設值為 `false`（有頭模式）。無頭模式在某些網站上更容易觸發反機器人檢查。請參閱 [瀏覽器](/zh-Hant/tools/browser)。

無頭模式使用**相同的 Chromium 引擎**，並適用於大多數自動化操作（表單、點擊、爬取、登入）。主要差異：

- 沒有可見的瀏覽器視窗（如果您需要視覺化內容，請使用截圖）。
- 部分網站對無頭模式下的自動化更嚴格（驗證碼、反機器人）。
  例如，X/Twitter 經常阻擋無頭工作階段。

### 如何使用 Brave 進行瀏覽器控制

將 `browser.executablePath` 設定為您的 Brave 執行檔（或任何基於 Chromium 的瀏覽器），並重新啟動 Gateway。
請參閱 [瀏覽器](/zh-Hant/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整設定範例。

## 遠端 Gateway 與節點

### 指令如何在 Telegram、Gateway 與節點之間傳遞

Telegram 訊息由 **Gateway** 處理。Gateway 執行 Agent，
並且僅在需要節點工具時透過 **Gateway WebSocket** 呼叫節點：

Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

節點看不到來自提供者的入站流量；它們只接收節點 RPC 呼叫。

### 如果 Gateway 託管在遠端，我的 Agent 如何存取我的電腦

簡短回答：**將您的電腦配對為節點**。Gateway 在其他地方運行，但它可以
透過 Gateway WebSocket 在您的本機上呼叫 `node.*` 工具（螢幕、相機、系統）。

典型設定：

1. 在持續運行主機（VPS/家用伺服器）上運行 Gateway。
2. 將 Gateway 主機和您的電腦放在同一個 tailnet 上。
3. 確保 Gateway WS 可連線（tailnet bind 或 SSH tunnel）。
4. 在本機開啟 macOS 應用程式，並以 **SSH 遠端**模式（或直接 tailnet）連接，
   以便註冊為節點。
5. 在 Gateway 上批准節點：

   ```bash
   openclaw devices list
   openclaw devices approve <requestId>
   ```

不需要單獨的 TCP 橋接；節點透過 Gateway WebSocket 連接。

安全提醒：配對 macOS 節點允許在該機器上進行 `system.run`。僅
配對您信任的裝置，並參閱 [安全性](/zh-Hant/gateway/security)。

文件：[節點](/zh-Hant/nodes)、[Gateway 協定](/zh-Hant/gateway/protocol)、[macOS 遠端模式](/zh-Hant/platforms/mac/remote)、[安全性](/zh-Hant/gateway/security)。

### Tailscale 已連接但我沒有收到回覆 該怎麼辦

檢查基本事項：

- Gateway 正在運行：`openclaw gateway status`
- Gateway 健康狀態：`openclaw status`
- 通道健康狀態： `openclaw channels status`

然後驗證身份驗證和路由：

- 如果您使用 Tailscale Serve，請確保 `gateway.auth.allowTailscale` 設定正確。
- 如果您透過 SSH 通道連線，請確認本機通道已啟動並指向正確的連接埠。
- 確認您的允許清單（DM 或群組）包含您的帳戶。

文件： [Tailscale](/zh-Hant/gateway/tailscale), [遠端存取](/zh-Hant/gateway/remote), [通道](/zh-Hant/channels)。

### 兩個 OpenClaw 執行個體可以彼此通訊嗎（本地 VPS）

可以。沒有內建的「bot 對 bot」橋接器，但您可以透過幾種
可靠的方式將其連接起來：

**最簡單：** 使用兩個機器人都能存取的普通聊天通道（Telegram/Slack/WhatsApp）。
讓機器人 A 發送訊息給機器人 B，然後讓機器人 B 像往常一樣回覆。

**CLI 橋接器（通用）：** 執行一個腳本，使用
`openclaw agent --message ... --deliver` 呼叫另一個 Gateway，
目標指向另一個機器人監聽的聊天。如果一個機器人在遠端 VPS 上，請透過 SSH/Tailscale 將您的 CLI 指向該遠端 Gateway
（請參閱 [遠端存取](/zh-Hant/gateway/remote)）。

範例模式（從可連線到目標 Gateway 的機器上執行）：

```bash
openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
```

提示：增加一個防護措施，以免兩個機器人無限循環（僅限提及、通道
允許清單，或「不回覆機器人訊息」規則）。

文件： [遠端存取](/zh-Hant/gateway/remote), [Agent CLI](/zh-Hant/cli/agent), [Agent send](/zh-Hant/tools/agent-send)。

### 多個代理程式是否需要個別的 VPS

不需要。一個 Gateway 可以託管多個代理程式，每個代理程式都有自己的工作區、模型預設值
和路由。這是標準設定，比為每個代理程式執行
一個 VPS 更便宜且簡單。

僅當您需要強隔離（安全邊界）或不想共用的
非常不同的設定時，才使用個別的 VPS。否則，請保留一個 Gateway 並
使用多個代理程式或子代理程式。

### 在我的個人筆記電腦上使用節點而不是從 VPS 使用 SSH 有什麼好處嗎

有的 - 節點是從遠端 Gateway 存取您筆記電腦的首要方式，而且它們
解鎖的不僅僅是 shell 存取權。Gateway 執行於 macOS/Linux（Windows 透過 WSL2）並且
是輕量級的（小型 VPS 或 Raspberry Pi 級別的盒子即可；4 GB RAM 足夠了），因此一個常見的
設定是一台永遠開啟的主機加上您的筆記電腦作為節點。

- **不需要連入 SSH。** 節點會向 Gateway WebSocket 發起連出連線並使用裝置配對。
- **更安全的執行控制。** `system.run` 受該筆記型電腦上的節點允許清單/審核機制所控管。
- **更多裝置工具。** 除了 `system.run` 之外，節點還公開 `canvas`、`camera` 和 `screen`。
- **本機瀏覽器自動化。** 將 Gateway 保留在 VPS 上，但透過筆記型電腦上的節點主機在本機執行 Chrome，或透過 Chrome MCP 附加到主機上的本機 Chrome。

SSH 適合臨時的 shell 存取，但對於持續的代理工作流程和裝置自動化來說，節點更簡單。

文件：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)、[瀏覽器](/zh-Hant/tools/browser)。

### 我應該安裝在第二台筆記型電腦上還是直接新增一個節點

如果您只需要第二台筆記型電腦上的**本機工具**（螢幕/相機/exec），請將其新增為
**節點**。這樣可以保持單一 Gateway 並避免重複的設定。本機節點工具目前僅支援 macOS，但我們計畫將其擴展到其他作業系統。

僅當您需要**嚴格隔離**或兩個完全獨立的機器人時，才安裝第二個 Gateway。

文件：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)、[多個 Gateway](/zh-Hant/gateway/multiple-gateways)。

### 節點是否執行 gateway 服務

不。除非您有意執行隔離設定檔（請參閱[多個 Gateway](/zh-Hant/gateway/multiple-gateways)），否則每個主機應該只執行**一個 gateway**。節點是連接到 gateway 的外設（iOS/Android 節點，或選單列應用程式中的 macOS「節點模式」）。對於無頭節點主機和 CLI 控制，請參閱[節點主機 CLI](/zh-Hant/cli/node)。

`gateway`、`discovery` 和 `canvasHost` 的變更需要完全重新啟動。

### 是否有 API RPC 方式可以套用設定

有的。`config.apply` 會驗證並寫入完整設定，並在作業過程中重新啟動 Gateway。

### configapply 清空了我的設定 我該如何復原並避免這種情況

`config.apply` 會替換**整個設定**。如果您發送部分物件，其他所有內容都會被移除。

復原方法：

- 從備份（git 或複製的 `~/.openclaw/openclaw.json`）還原。
- 如果您沒有備份，請重新執行 `openclaw doctor` 並重新設定通道/模型。
- 如果這是意料之外的情況，請回報錯誤並附上您最後的設定或任何備份。
- 本機編碼代理通常可以從日誌或歷史記錄重建可用的設定。

避免發生：

- 使用 `openclaw config set` 進行小幅變更。
- 使用 `openclaw configure` 進行互動式編輯。

文件：[Config](/zh-Hant/cli/config)、[Configure](/zh-Hant/cli/configure)、[Doctor](/zh-Hant/gateway/doctor)。

### 初次安裝的最小可行設定是什麼

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

這會設定您的工作區並限制誰可以觸發機器人。

### 如何設定 VPS 上的 Tailscale 並從 Mac 連線

最步驟：

1. **在 VPS 上安裝 + 登入**

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```

2. **在您的 Mac 上安裝 + 登入**
   - 使用 Tailscale 應用程式並登入同一個 tailnet。
3. **啟用 MagicDNS（建議）**
   - 在 Tailscale 管理主控台中啟用 MagicDNS，以便 VPS 擁有穩定的名稱。
4. **使用 tailnet 主機名稱**
   - SSH：`ssh user@your-vps.tailnet-xxxx.ts.net`
   - Gateway WS：`ws://your-vps.tailnet-xxxx.ts.net:18789`

如果您想要不透過 SSH 存取控制 UI，請在 VPS 上使用 Tailscale Serve：

```bash
openclaw gateway --tailscale serve
```

這會將閘道繫結到回環介面，並透過 Tailscale 公開 HTTPS。請參閱 [Tailscale](/zh-Hant/gateway/tailscale)。

### 如何將 Mac 節點連線到遠端 Gateway Tailscale Serve

Serve 會公開 **Gateway Control UI + WS**。節點透過同一個 Gateway WS 端點進行連線。

建議設定：

1. **確保 VPS 和 Mac 位於同一個 tailnet 上**。
2. **在 Remote 模式下使用 macOS 應用程式**（SSH 目標可以是 tailnet 主機名稱）。
   應用程式會將 Gateway 通道連線，並以節點身分連線。
3. **在閘道上核准節點**：

   ```bash
   openclaw devices list
   openclaw devices approve <requestId>
   ```

文件：[Gateway protocol](/zh-Hant/gateway/protocol)、[Discovery](/zh-Hant/gateway/discovery)、[macOS remote mode](/zh-Hant/platforms/mac/remote)。

## 環境變數與 .env 載入

### OpenClaw 如何載入環境變數

OpenClaw 會從父程序（shell、launchd/systemd、CI 等）讀取環境變數，並額外載入：

- 來自目前工作目錄的 `.env`
- 來自 `~/.openclaw/.env` 的全域備援 `.env` (又名 `$OPENCLAW_STATE_DIR/.env`)

兩個 `.env` 檔案都不會覆寫既有的環境變數。

您也可以在設定中定義內聯環境變數 (僅在程序環境中缺少時套用):

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

請參閱 [/environment](/zh-Hant/help/environment) 以了解完整的優先順序和來源。

### 我透過服務啟動了 Gateway，但環境變數消失了。現在該怎麼辦

兩種常見的修復方法:

1. 將遺漏的金鑰放入 `~/.openclaw/.env` 中，以便即使服務未繼承您的 shell 環境也能載入它們。
2. 啟用 shell 匯入 (選用的便利功能):

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

這會執行您的登入 shell 並且僅匯入遺漏的預期金鑰 (絕不覆寫)。對應的環境變數:
`OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

### 我設定了 COPILOTGITHUBTOKEN 但模型狀態顯示 Shell env 為關閉。為什麼

`openclaw models status` 回報是否啟用了 **shell env 匯入**。「Shell env: off」
**並不** 表示您的環境變數遺失了 — 這僅表示 OpenClaw 不會自動
載入您的登入 shell。

如果 Gateway 作為服務 執行，它將不會繼承您的 shell
環境。請執行以下其中一項操作來修正:

1. 將權杖放入 `~/.openclaw/.env` 中:

   ```
   COPILOT_GITHUB_TOKEN=...
   ```

2. 或啟用 shell 匯入 (`env.shellEnv.enabled: true`)。
3. 或將其新增至您的設定 `env` 區塊 (僅在遺漏時套用)。

然後重新啟動 gateway 並重新檢查:

```bash
openclaw models status
```

Copilot 權杖是從 `COPILOT_GITHUB_TOKEN` 讀取的 (也包含 `GH_TOKEN` / `GITHUB_TOKEN`)。
請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers) 和 [/environment](/zh-Hant/help/environment)。

## 工作階段與多個聊天

### 如何開始新的對話

傳送 `/new` 或 `/reset` 作為獨立訊息。請參閱 [工作階段管理](/zh-Hant/concepts/session)。

### 如果我從不傳送新訊息，工作階段會自動重置嗎

會。工作階段會在 `session.idleMinutes` 之後過期 (預設為 **60**)。**下**
一則訊息會針對該聊天金鑰啟動一個新的工作階段 ID。這不會刪除
逐字稿 — 它只是開始一個新的工作階段。

```json5
{
  session: {
    idleMinutes: 240,
  },
}
```

### 有沒有辦法讓一組 OpenClaw 實例組成一個 CEO 和多個代理？

有的，透過**多代理路由**和**子代理**。您可以建立一個協調器代理和幾個擁有自己的工作區和模型的工作代理。

話雖如此，這最好視為一個**有趣的實驗**。它非常耗費 token，而且通常不如使用一個具有不同會話的機器人有效率。我們設想的典型模型是您與一個機器人交談，並使用不同的會話進行平行工作。該機器人也可以在需要時生成子代理。

文件：[多代理路由](/zh-Hant/concepts/multi-agent)、[子代理](/zh-Hant/tools/subagents)、[代理 CLI](/zh-Hant/cli/agents)。

### 為什麼上下文會在任務中途被截斷？我該如何預防？

會話上下文受到模型視窗的限制。長時間的對話、大量的工具輸出或許多檔案都可能觸發壓縮或截斷。

有幫助的方法：

- 請機器人總結當前狀態並將其寫入檔案。
- 在長時間任務前使用 `/compact`，並在切換主題時使用 `/new`。
- 將重要的上下文保留在工作區中，並請機器人讀取它。
- 對於長時間或平行的作業，使用子代理，以便主對話保持較小。
- 如果這種情況經常發生，請選擇一個具有較大上下文視窗的模型。

### 如何完全重置 OpenClaw 但保持其安裝狀態？

使用重置指令：

```bash
openclaw reset
```

非互動式完整重置：

```bash
openclaw reset --scope full --yes --non-interactive
```

然後重新執行設定：

```bash
openclaw onboard --install-daemon
```

備註：

- 如果引導偵測到現有設定，也會提供**重置**選項。請參閱 [引導 (CLI)](/zh-Hant/start/wizard)。
- 如果您使用設定檔 (`--profile` / `OPENCLAW_PROFILE`)，請重置每個狀態目錄 (預設為 `~/.openclaw-<profile>`)。
- 開發重置：`openclaw gateway --dev --reset` (僅限開發；清除開發設定 + 憑證 + 會話 + 工作區)。

### 我收到上下文過大的錯誤，該如何重置或壓縮？

使用以下其中一種方法：

- **壓縮** (保留對話但總結較早的輪次)：

  ```
  /compact
  ```

  或使用 `/compact <instructions>` 來引導總結。

- **重置** (為相同的聊天金鑰提供新的會話 ID)：

  ```
  /new
  /reset
  ```

如果持續發生：

- 啟用或調整**會話修剪** (`agents.defaults.contextPruning`) 以修剪舊的工具輸出。
- 使用具有較大上下文視窗的模型。

文件：[壓縮](/zh-Hant/concepts/compaction)、[會話修剪](/zh-Hant/concepts/session-pruning)、[會話管理](/zh-Hant/concepts/session)。

### 為什麼我會看到「LLM request rejected: messages.content.tool_use.input field required」？

這是一個提供者驗證錯誤：模型發出了 `tool_use` 區塊但沒有包含必需的
`input`。這通常意味著會話歷史已過時或損壞（常發生於長對話串
或工具/架構變更後）。

解決方法：使用 `/new` 開始一個新的會話（獨立訊息）。

### 為什麼我每 30 分鐘會收到心跳訊息

心跳預設每 **30m** 執行一次。您可以調整或停用它們：

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

如果 `HEARTBEAT.md` 存在但實際上是空的（只有空白行和 markdown
標題，如 `# Heading`），OpenClaw 會跳過心跳執行以節省 API 呼叫。
如果檔案不存在，心跳仍會執行，由模型決定要做什麼。

每個代理的覆寫使用 `agents.list[].heartbeat`。文件：[Heartbeat](/zh-Hant/gateway/heartbeat)。

### 我是否需要將機器人帳號加入 WhatsApp 群組

不需要。OpenClaw 運作於**您自己的帳號**上，所以如果您在群組中，OpenClaw 就能看到它。
預設情況下，群組回覆會被封鎖，直到您允許發送者 (`groupPolicy: "allowlist"`)。

如果您希望只有**您**能觸發群組回覆：

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

### 如何取得 WhatsApp 群組的 JID

選項 1（最快）：監看日誌並在群組中發送測試訊息：

```bash
openclaw logs --follow --json
```

尋找以 `@g.us` 結尾的 `chatId`（或 `from`），例如：
`1234567890-1234567890@g.us`。

選項 2（如果已經設定/加入允許清單）：從設定中列出群組：

```bash
openclaw directory groups list --channel whatsapp
```

文件：[WhatsApp](/zh-Hant/channels/whatsapp)、[目錄](/zh-Hant/cli/directory)、[日誌](/zh-Hant/cli/logs)。

### 為什麼 OpenClaw 不在群組中回覆

兩個常見原因：

- 提及閘門已開啟（預設）。您必須 @提及機器人（或符合 `mentionPatterns`）。
- 您設定了 `channels.whatsapp.groups` 但沒有 `"*"`，且該群組不在允許清單中。

請參閱 [群組](/zh-Hant/channels/groups) 和 [群組訊息](/zh-Hant/channels/group-messages)。

### 群組/討論串是否與私訊 (DM) 共享上下文

直接聊天預設會合併到主工作階段。群組/頻道有自己的工作階段金鑰，而 Telegram 主題 / Discord 執行串則是獨立的工作階段。請參閱 [群組](/zh-Hant/channels/groups) 和 [群組訊息](/zh-Hant/channels/group-messages)。

### 我可以建立多少個工作區和代理程式

沒有硬性限制。數十個（甚至數百個）都沒問題，但請注意：

- **磁碟空間增長：** 工作階段 + 逐字稿位於 `~/.openclaw/agents/<agentId>/sessions/` 下。
- **Token 成本：** 代理程式越多表示並行使用的模型越多。
- **營運負擔：** 每個代理程式的驗證設定檔、工作區和通道路由。

建議：

- 每個代理程式維持一個 **作用中** 工作區 (`agents.defaults.workspace`)。
- 如果磁碟空間增長，請修剪舊的工作階段（刪除 JSONL 或儲存項目）。
- 使用 `openclaw doctor` 來找出遺失的工作區和設定檔不相符的問題。

### 我可以同時執行多個機器人或聊天 (Slack) 嗎？我該如何設定

可以。使用 **多代理程式路由** 來執行多個獨立的代理程式，並根據
通道/帳號/同儕路由傳入訊息。Slack 支援作為通道，並可綁定至特定的代理程式。

瀏覽器存取功能強大，但並非「人類能做到的都能做」——反機器人措施、驗證碼 (CAPTCHA) 和多重要素驗證 (MFA)
仍然可能阻擋自動化。為了獲得最可靠的瀏覽器控制，請在主機上使用本機 Chrome MCP，
或在實際執行瀏覽器的機器上使用 CDP。

最佳實務設定：

- 永遠線上的閘道主機 (VPS/Mac mini)。
- 每個角色一個代理程式 (綁定)。
- 綁定至這些代理程式的 Slack 頻道。
- 視需要透過 Chrome MCP 或節點使用本機瀏覽器。

文件：[多代理程式路由](/zh-Hant/concepts/multi-agent)、[Slack](/zh-Hant/channels/slack)、
[瀏覽器](/zh-Hant/tools/browser)、[節點](/zh-Hant/nodes)。

## 模型：預設值、選擇、別名、切換

### 什麼是預設模型

OpenClaw 的預設模型是您設定的：

```
agents.defaults.model.primary
```

模型參照為 `provider/model`（範例：`anthropic/claude-opus-4-6`）。如果您省略供應商，OpenClaw 目前假設 `anthropic` 作為暫時的棄用回退選項 —— 但您仍應**明確**設定 `provider/model`。

### 您推薦使用哪個模型

**推薦預設：**使用您的供應商堆疊中可用的最強最新一代模型。
**對於啟用工具或不受信任輸入的代理：**優先考慮模型強度而非成本。
**對於例行/低風險聊天：**使用較便宜的回退模型，並根據代理角色進行路由。

MiniMax M2.5 有自己的文件：[MiniMax](/zh-Hant/providers/minimax) 和
[Local models](/zh-Hant/gateway/local-models)。

經驗法則：對於高風險工作，使用您負擔得起的**最佳模型**；對於例行聊天或摘要，則使用較便宜的模型。您可以根據代理路由模型，並使用子代理將長任務並行化（每個子代理都會消耗 token）。請參閱 [Models](/zh-Hant/concepts/models) 和
[Sub-agents](/zh-Hant/tools/subagents)。

強烈警告：較弱/過度量化的模型更容易受到提示詞注入和不安全行為的影響。請參閱 [Security](/zh-Hant/gateway/security)。

更多背景資訊：[Models](/zh-Hant/concepts/models)。

### 我可以使用自託管模型 llamacpp vLLM Ollama 嗎

可以。Ollama 是本地模型最簡單的途徑。

最快速的設定：

1. 從 `https://ollama.com/download` 安裝 Ollama
2. 拉取一個本地模型，例如 `ollama pull glm-4.7-flash`
3. 如果您同時想要 Ollama Cloud，請執行 `ollama signin`
4. 執行 `openclaw onboard` 並選擇 `Ollama`
5. 選擇 `Local` 或 `Cloud + Local`

備註：

- `Cloud + Local` 提供您 Ollama Cloud 模型以及您的本地 Ollama 模型
- 雲端模型例如 `kimi-k2.5:cloud` 不需要本地拉取
- 若要手動切換，請使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

安全性注意：較小或經過高度量化的大型語言模型更容易受到提示詞注入的攻擊。我們強烈建議對任何可以使用工具的機器人使用**大型模型**。如果您仍想使用小型模型，請啟用沙盒機制和嚴格的工具允許清單。

文件：[Ollama](/zh-Hant/providers/ollama)、[本機模型](/zh-Hant/gateway/local-models)、
[模型供應商](/zh-Hant/concepts/model-providers)、[安全性](/zh-Hant/gateway/security)、
[沙盒機制](/zh-Hant/gateway/sandboxing)。

### 如何在不清除配置的情況下切換模型

使用**模型指令**或僅編輯**模型**欄位。避免完整替換配置。

安全的選項：

- 在聊天中使用 `/model`（快速，僅限當前會話）
- `openclaw models set ...`（僅更新模型配置）
- `openclaw configure --section model`（互動式）
- 在 `~/.openclaw/openclaw.json` 中編輯 `agents.defaults.model`

除非您打算替換整個配置，否則請避免使用部分物件進行 `config.apply`。
如果您覆寫了配置，請從備份還原或重新執行 `openclaw doctor` 進行修復。

文件：[模型](/zh-Hant/concepts/models)、[設定](/zh-Hant/cli/configure)、[配置](/zh-Hant/cli/config)、[診斷工具](/zh-Hant/gateway/doctor)。

### OpenClaw、Flawd 和 Krill 使用什麼模型

- 這些部署可能有所不同，且可能會隨時間改變；沒有固定的供應商建議。
- 使用 `openclaw models status` 檢查每個閘道目前的運行時設定。
- 對於安全性敏感或啟用工具的代理程式，請使用可用的最強大的最新一代模型。

### 如何在不重新啟動的情況下即時切換模型

將 `/model` 指令作為獨立訊息使用：

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

`/model`（以及 `/model list`）會顯示一個簡潔的編號選擇器。請透過編號選擇：

```
/model 3
```

您也可以為供應商強制指定特定的驗證設定檔（每個會話）：

```
/model opus@anthropic:default
/model opus@anthropic:work
```

提示：`/model status` 會顯示哪個代理程式處於啟用狀態，正在使用哪個 `auth-profiles.json` 檔案，以及下次將嘗試哪個驗證設定檔。
它還會在可用時顯示已設定的提供者端點 (`baseUrl`) 和 API 模式 (`api`)。

**如何取消我用 profile 設定的固定設定檔**

重新執行 `/model`，請**勿**加上 `@profile` 後綴：

```
/model anthropic/claude-opus-4-6
```

如果您想恢復為預設值，請從 `/model` 中選取它 (或傳送 `/model <default provider/model>`)。
使用 `/model status` 確認哪個驗證設定檔處於啟用狀態。

### 我可以將 GPT 5.2 用於日常任務，將 Codex 5.3 用於編碼嗎

可以。將其中一個設為預設值並視需要切換：

- **快速切換 (每個階段作業)：** 對於日常任務使用 `/model gpt-5.2`，對於使用 Codex OAuth 的編碼使用 `/model openai-codex/gpt-5.4`。
- **預設 + 切換：** 將 `agents.defaults.model.primary` 設為 `openai/gpt-5.2`，然後在編碼時切換為 `openai-codex/gpt-5.4` (反之亦然)。
- **子代理程式：** 將編碼工作傳送給具有不同預設模型的子代理程式。

請參閱 [模型](/zh-Hant/concepts/models) 和 [斜線指令](/zh-Hant/tools/slash-commands)。

### 為什麼我看到模型不允許，然後沒有回覆

如果設定了 `agents.defaults.models`，它會成為 `/model` 和任何
階段作業覆寫的 **允許清單**。選擇不在該清單中的模型會傳回：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

該錯誤會傳回，**取代**正常的回覆。修正方法：將模型新增至
`agents.defaults.models`，移除允許清單，或從 `/model list` 中選取模型。

### 為什麼我看到未知模型 minimaxMiniMaxM25

這表示 **未設定提供者** (找不到 MiniMax 提供者設定或驗證
設定檔)，因此無法解析模型。此偵測的修正方法
在 **2026.1.12** 中 (撰寫時尚未發布)。

修正檢查清單：

1. 升級至 **2026.1.12** (或從來源 `main` 執行)，然後重新啟動閘道。
2. 確保已設定 MiniMax (精靈或 JSON)，或環境變數/驗證設定檔中存在
   MiniMax API 金鑰，以便注入提供者。
3. 使用精確的模型 ID（區分大小寫）：`minimax/MiniMax-M2.5` 或
   `minimax/MiniMax-M2.5-highspeed`。
4. 執行：

   ```bash
   openclaw models list
   ```

   並從列表中選取（或在聊天中使用 `/model list`）。

參見 [MiniMax](/zh-Hant/providers/minimax) 和 [Models](/zh-Hant/concepts/models)。

### 我可以將 MiniMax 作為預設，而對複雜任務使用 OpenAI 嗎

可以。使用 **MiniMax 作為預設**，並在需要時**依會話切換**模型。
Failover 是用於**錯誤**，而非「困難任務」，因此請使用 `/model` 或獨立的代理程式。

**選項 A：依會話切換**

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

然後：

```
/model gpt
```

**選項 B：獨立的代理程式**

- 代理程式 A 預設：MiniMax
- 代理程式 B 預設：OpenAI
- 依代理程式路由或使用 `/agent` 來切換

文件：[Models](/zh-Hant/concepts/models)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent)、[MiniMax](/zh-Hant/providers/minimax)、[OpenAI](/zh-Hant/providers/openai)。

### opus sonnet gpt 是否為內建的快捷方式

是的。OpenClaw 內建了一些預設的簡寫（僅在模型存在於 `agents.defaults.models` 時才會套用）：

- `opus` → `anthropic/claude-opus-4-6`
- `sonnet` → `anthropic/claude-sonnet-4-6`
- `gpt` → `openai/gpt-5.4`
- `gpt-mini` → `openai/gpt-5-mini`
- `gemini` → `google/gemini-3.1-pro-preview`
- `gemini-flash` → `google/gemini-3-flash-preview`
- `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

如果您設定了同名的別名，您的值將優先。

### 如何定義或覆蓋模型快捷方式別名

別名來自 `agents.defaults.models.<modelId>.alias`。範例：

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

然後 `/model sonnet`（或在支援時使用 `/<alias>`）將解析為該模型 ID。

### 如何新增來自其他供應商（如 OpenRouter 或 ZAI）的模型

OpenRouter（按 token 付費；多種模型）：

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

如果您參考了某個供應商/模型，但缺少所需的供應商金鑰，您會收到執行時期的驗證錯誤（例如 `No API key found for provider "zai"`）。

**新增新代理程式後找不到供應商的 API 金鑰**

這通常意味著 **新代理** 擁有一個空的認證儲存空間。認證是針對每個代理的，並儲存在：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

修復選項：

- 執行 `openclaw agents add <id>` 並在精靈期間設定認證。
- 或將 `auth-profiles.json` 從主代理的 `agentDir` 複製到新代理的 `agentDir`。

請**勿**跨代理重複使用 `agentDir`；這會導致認證/會衝突。

## 模型故障轉移與 "所有模型均失敗"

### 故障轉移如何運作

故障轉移分兩個階段進行：

1. **認證設定檔輪替** 在同一個供應商內進行。
2. **模型故障轉移** 切換至 `agents.defaults.model.fallbacks` 中的下一個模型。

冷卻時間適用於失敗的設定檔（指數退避），因此即使當供應商受到速率限制或暫時故障，OpenClaw 也能繼續回應。

### 這個錯誤是什麼意思

```
No credentials found for profile "anthropic:default"
```

這表示系統嘗試使用認證設定檔 ID `anthropic:default`，但在預期的認證儲存空間中找不到其憑證。

### 修復 "找不到設定檔 anthropicdefault 的憑證" 的檢查清單

- **確認認證設定檔的位置**（新路徑與舊路徑）
  - 目前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - 舊版：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）
- **確認您的環境變數已由 Gateway 載入**
  - 如果您在 shell 中設定了 `ANTHROPIC_API_KEY`，但透過 systemd/launchd 執行 Gateway，它可能無法繼承該變數。請將其放入 `~/.openclaw/.env` 或啟用 `env.shellEnv`。
- **確保您正在編輯正確的代理**
  - 多代理設定意味著可能存在多個 `auth-profiles.json` 檔案。
- **合理性檢查模型/認證狀態**
  - 使用 `openclaw models status` 查看已設定的模型以及供應商是否已通過認證。

**修復 "找不到設定檔 anthropic 的憑證" 的檢查清單**

這表示該執行實例已釘選至 Anthropic 認證設定檔，但 Gateway
無法在其認證儲存空間中找到它。

- **使用設定權杖**
  - 執行 `claude setup-token`，然後使用 `openclaw models auth setup-token --provider anthropic` 貼上它。
  - 如果權杖是在另一台機器上建立的，請使用 `openclaw models auth paste-token --provider anthropic`。
- **如果您想改用 API 金鑰**
  - 在 **gateway host** 上將 `ANTHROPIC_API_KEY` 放入 `~/.openclaw/.env` 中。
  - 清除任何強制使用缺失設定檔的固定順序：

    ```bash
    openclaw models auth order clear --provider anthropic
    ```

- **確認您正在 gateway host 上執行指令**
  - 在遠端模式下，驗證設定檔位於 gateway 機器上，而非您的筆記型電腦。

### 為什麼它還嘗試了 Google Gemini 並且失敗

如果您的模型設定包含 Google Gemini 作為後備（或者您切換到了 Gemini 簡寫），OpenClaw 將會在模型故障轉移期間嘗試使用它。如果您尚未設定 Google 憑證，您將會看到 `No API key found for provider "google"`。

修正：請提供 Google 驗證，或者在 `agents.defaults.model.fallbacks` / 別名中移除/避免使用 Google 模型，以免故障轉移路由到那裡。

**LLM request rejected message thinking signature required google antigravity**

原因：對話歷史記錄包含 **沒有簽名的思考區塊**（通常來自於
已中止/部分的串流）。Google Antigravity 要求思考區塊必須有簽名。

修正：OpenClaw 現在會針對 Google Antigravity Claude 移除未簽名的思考區塊。如果問題仍然存在，請開啟 **新對話** 或為該代理程式設定 `/thinking off`。

## 驗證設定檔：它們是什麼以及如何管理它們

相關：[/concepts/oauth](/zh-Hant/concepts/oauth) (OAuth 流程、權杖儲存、多重帳號模式)

### 什麼是驗證設定檔

驗證設定檔是與提供者關聯的具名憑證記錄（OAuth 或 API 金鑰）。設定檔位於：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

### 典型的設定檔 ID 是什麼

OpenClaw 使用提供者前綴的 ID，例如：

- `anthropic:default` （當不存在電子郵件身分識別時常見）
- 用於 OAuth 身分識別的 `anthropic:<email>`
- 您選擇的自訂 ID（例如 `anthropic:work`）

### 我可以控制先嘗試哪個驗證設定檔嗎

可以。設定支援針對設定檔的可選元數據，以及每個提供者的順序 (`auth.order.<provider>`)。這**不會**儲存機密；它將 ID 對應到提供者/模式並設定輪替順序。

如果設定檔處於短暫的 **冷卻** （速率限制/逾時/驗證失敗）或較長的 **停用** 狀態 （計費/額度不足），OpenClaw 可能會暫時跳過該設定檔。要檢查此情況，請執行 `openclaw models status --json` 並檢查 `auth.unusableProfiles`。調整：`auth.cooldowns.billingBackoffHours*`。

您也可以透過 CLI 設定**每個代理**的順序覆寫（儲存在該代理的 `auth-profiles.json` 中）：

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

若要指定特定代理：

```bash
openclaw models auth order set --provider anthropic --agent main anthropic:default
```

### OAuth 與 API 金鑰有什麼區別

OpenClaw 支援這兩者：

- **OAuth** 通常利用訂閱存取權（如適用）。
- **API 金鑰** 使用按 Token 付費的計費方式。

精靈明確支援 Anthropic setup-token 和 OpenAI Codex OAuth，並可為您儲存 API 金鑰。

## Gateway：連接埠、「已在執行」和遠端模式

### Gateway 使用哪個連接埠

`gateway.port` 控制 WebSocket + HTTP（控制 UI、hooks 等）的單一多工連接埠。

優先順序：

```
--port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
```

### 為什麼 openclaw gateway status 顯示 Runtime running 但 RPC probe failed

因為「running」是**監督器**的視角（launchd/systemd/schtasks）。RPC 探測是 CLI 實際連線到 gateway WebSocket 並呼叫 `status`。

使用 `openclaw gateway status` 並信任這幾行：

- `Probe target:`（探測實際使用的 URL）
- `Listening:`（連接埠上實際綁定的內容）
- `Last gateway error:`（當程序存活但連接埠未監聽時的常見根本原因）

### 為什麼 openclaw gateway status 顯示 Config cli 與 Config service 不同

您正在編輯一個組態檔，而服務正在執行另一個（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不相符）。

解決方法：

```bash
openclaw gateway install --force
```

從您希望服務使用的相同 `--profile` / 環境執行該指令。

### What does another gateway instance is already listening mean 是什麼意思

OpenClaw 透過在啟動時立即綁定 WebSocket 監聽器來執行執行時期鎖定（預設 `ws://127.0.0.1:18789`）。如果綁定失敗並出現 `EADDRINUSE`，它會擲回 `GatewayLockError`，表示另一個執行個體正在監聽。

解決方法：停止另一個執行個體、釋放連接埠，或使用 `openclaw gateway --port <port>` 執行。

### 如何在遠端模式下執行 OpenClaw（用戶端連線到其他地方的 Gateway）

設定 `gateway.mode: "remote"` 並指向遠端 WebSocket URL，選擇性包含 token/password：

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

備註：

- `openclaw gateway` 僅在 `gateway.mode` 為 `local` 時才會啟動（或者您傳遞了覆寫標誌）。
- macOS 應用程式會監視設定檔，並在這些數值變更時即時切換模式。

### 控制介面顯示未授權或持續重新連線，現在該怎麼辦

您的閘道已在啟用驗證的情況下運行 (`gateway.auth.*`)，但介面未發送相符的 token/密碼。

事實（來源代碼）：

- 控制介面會將 token 保留在 `sessionStorage` 中，針對目前的瀏覽器分頁階段和選定的閘道 URL，因此同分頁重新整理能持續運作，而無需還原長期 localStorage token 持久性。
- 在 `AUTH_TOKEN_MISMATCH` 上，當閘道傳回重試提示 (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`) 時，受信任的用戶端可以嘗試使用快取的裝置 token 進行一次有限的重試。

解決方法：

- 最快：`openclaw dashboard`（會列印並複製儀表板 URL，嘗試開啟；若是無介面環境則顯示 SSH 提示）。
- 如果您還沒有 token：`openclaw doctor --generate-gateway-token`。
- 如果是遠端，請先建立通道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`。
- 在閘道主機上設定 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 在控制介面設定中，貼上相同的 token。
- 如果在一次重試後仍然不符，請輪替/重新核准配對的裝置 token：
  - `openclaw devices list`
  - `openclaw devices rotate --device <id> --role operator`
- 還是卡住了？請執行 `openclaw status --all` 並依照 [疑難排解](/zh-Hant/gateway/troubleshooting) 操作。關於驗證詳細資訊，請參閱 [儀表板](/zh-Hant/web/dashboard)。

### 我設定了 gatewaybind tailnet 但無法繫結，沒有程式在監聽

`tailnet` 繫結會從您的網路介面 (100.64.0.0/10) 選擇一個 Tailscale IP。如果機器不在 Tailscale 上（或是介面已關閉），就沒有繫結對象。

解決方法：

- 在該主機上啟動 Tailscale（這樣它就會有 100.x 位址），或者
- 切換到 `gateway.bind: "loopback"` / `"lan"`。

注意：`tailnet` 是明確指定的。`auto` 偏好回環位址；當您想要僅限 tailnet 的繫結時，請使用 `gateway.bind: "tailnet"`。

### 我可以在同一台主機上執行多個 Gateway 嗎

通常不需要 - 一個 Gateway 可以執行多個訊息頻道和代理程式。僅在您需要冗餘（例如：救援機器人）或強隔離時才使用多個 Gateway。

可以，但您必須隔離：

- `OPENCLAW_CONFIG_PATH` (每個執行個體的設定)
- `OPENCLAW_STATE_DIR` (每個執行個體的狀態)
- `agents.defaults.workspace` (工作區隔離)
- `gateway.port` (唯一連接埠)

快速設定 (推薦)：

- 每個執行個體使用 `openclaw --profile <name> …` (自動建立 `~/.openclaw-<name>`)。
- 在每個設定檔中設定唯一的 `gateway.port` (或在手動執行時傳遞 `--port`)。
- 安裝每個設定檔的服務：`openclaw --profile <name> gateway install`。

設定檔也會為服務名稱加上後綴 (`ai.openclaw.<profile>`; 舊版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`)。
完整指南：[Multiple gateways](/zh-Hant/gateway/multiple-gateways)。

### 無效的交握代碼 1008 是什麼意思

Gateway 是一個 **WebSocket 伺服器**，它預期第一條訊息必須是
`connect` 幀。如果收到其他任何內容，它將以 **代碼 1008** (原則違規) 關閉連線。

常見原因：

- 您在瀏覽器 (`http://...`) 中開啟了 **HTTP** URL，而不是 WS 用戶端。
- 您使用了錯誤的連接埠或路徑。
- Proxy 或通道移除了驗證標頭或發送了非 Gateway 請求。

快速修正：

1. 使用 WS URL：`ws://<host>:18789` (如果是 HTTPS 則使用 `wss://...`)。
2. 不要在正常的瀏覽器分頁中開啟 WS 連接埠。
3. 如果開啟了驗證，請在 `connect` 幀中包含權杖/密碼。

如果您使用 CLI 或 TUI，URL 應如下所示：

```
openclaw tui --url ws://<host>:18789 --token <token>
```

通訊協定詳情：[Gateway protocol](/zh-Hant/gateway/protocol)。

## 記錄與偵錯

### 記錄檔在哪裡

檔案記錄 (結構化)：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

您可以透過 `logging.file` 設定穩定的路徑。檔案記錄層級由 `logging.level` 控制。主控台詳細程度由 `--verbose` 和 `logging.consoleLevel` 控制。

最快的記錄追蹤：

```bash
openclaw logs --follow
```

服務/監督器日誌（當閘道透過 launchd/systemd 執行時）：

- macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（預設：`~/.openclaw/logs/...`；設定檔使用 `~/.openclaw-<profile>/logs/...`）
- Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
- Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

更多資訊請參閱 [疑難排解](/zh-Hant/gateway/troubleshooting#log-locations)。

### 如何啟動/停止/重新啟動 Gateway 服務

使用 gateway 輔助程式：

```bash
openclaw gateway status
openclaw gateway restart
```

如果您手動執行 gateway，`openclaw gateway --force` 可以回收連接埠。請參閱 [Gateway](/zh-Hant/gateway)。

### 我在 Windows 上關閉了終端機，該如何重新啟動 OpenClaw

Windows 有 **兩種安裝模式**：

**1) WSL2（推薦）：** Gateway 在 Linux 內部執行。

開啟 PowerShell，進入 WSL，然後重新啟動：

```powershell
wsl
openclaw gateway status
openclaw gateway restart
```

如果您從未安裝過服務，請在前台啟動它：

```bash
openclaw gateway run
```

**2) 原生 Windows（不推薦）：** Gateway 直接在 Windows 中執行。

開啟 PowerShell 並執行：

```powershell
openclaw gateway status
openclaw gateway restart
```

如果您手動執行它（無服務），請使用：

```powershell
openclaw gateway run
```

文件：[Windows (WSL2)](/zh-Hant/platforms/windows), [Gateway 服務手冊](/zh-Hant/gateway)。

### Gateway 已啟動但從未收到回應 我該檢查什麼

先進行快速的健康檢查：

```bash
openclaw status
openclaw models status
openclaw channels status
openclaw logs --follow
```

常見原因：

- 模型驗證未載入至 **gateway 主機**（檢查 `models status`）。
- 通道配對/允許清單阻擋了回應（檢查通道設定 + 日誌）。
- WebChat/Dashboard 已開啟但沒有正確的 token。

如果您是遠端連線，請確認 tunnel/Tailscale 連線已啟動，且
Gateway WebSocket 可以連線。

文件：[通道](/zh-Hant/channels), [疑難排解](/zh-Hant/gateway/troubleshooting), [遠端存取](/zh-Hant/gateway/remote)。

### 從 gateway 中斷連線 沒有原因 接下來該怎麼辦

這通常表示 UI 失去了 WebSocket 連線。請檢查：

1. Gateway 是否正在執行？`openclaw gateway status`
2. Gateway 是否健康？`openclaw status`
3. UI 是否有正確的 token？`openclaw dashboard`
4. 如果是遠端連線，tunnel/Tailscale 連線是否已啟動？

然後查看日誌：

```bash
openclaw logs --follow
```

文件：[儀表板](/zh-Hant/web/dashboard)、[遠端存取](/zh-Hant/gateway/remote)、[疑難排解](/zh-Hant/gateway/troubleshooting)。

### Telegram setMyCommands 失敗 我應該檢查什麼

從日誌和通道狀態開始：

```bash
openclaw channels status
openclaw channels logs --channel telegram
```

然後比對錯誤：

- `BOT_COMMANDS_TOO_MUCH`：Telegram 功能表項目過多。OpenClaw 已經修剪至 Telegram 限制並以較少的指令重試，但仍需要捨棄部分功能表項目。減少外掛程式/技能/自訂指令，或者如果您不需要功能表，請停用 `channels.telegram.commands.native`。
- `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或類似的網路錯誤：如果您在 VPS 上或位於 Proxy 後方，請確認允許傳出 HTTPS 且 DNS 可解析 `api.telegram.org`。

如果 Gateway 是遠端的，請確保您正在查看 Gateway 主機上的日誌。

文件：[Telegram](/zh-Hant/channels/telegram)、[通道疑難排解](/zh-Hant/channels/troubleshooting)。

### TUI 顯示無輸出 我應該檢查什麼

首先確認 Gateway 可連線且代理程式可以執行：

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

在 TUI 中，使用 `/status` 查看目前狀態。如果您預期在聊天
通道中收到回覆，請確保已啟用傳遞功能 (`/deliver on`)。

文件：[TUI](/zh-Hant/web/tui)、[斜線指令](/zh-Hant/tools/slash-commands)。

### 如何完全停止然後啟動 Gateway

如果您安裝了服務：

```bash
openclaw gateway stop
openclaw gateway start
```

這會停止/啟動 **受監控的服務** (macOS 上為 launchd，Linux 上為 systemd)。
當 Gateway 作為守護程序在背景執行時，請使用此方式。

如果您在前台執行，請按 Ctrl-C 停止，然後：

```bash
openclaw gateway run
```

文件：[Gateway 服務手冊](/zh-Hant/gateway)。

### ELI5 openclaw gateway restart 與 openclaw gateway 的比較

- `openclaw gateway restart`：重新啟動 **背景服務** (launchd/systemd)。
- `openclaw gateway`：在此終端機階段中，於 **前台** 執行 gateway。

如果您已安裝服務，請使用 gateway 指令。當您想要
一次性在前台執行時，請使用 `openclaw gateway`。

### 當發生失敗時，取得更多詳細資訊的最快方法是什麼

使用 `--verbose` 啟動 Gateway 以取得更多主控台詳細資訊。然後檢查日誌檔案中的通道驗證、模型路由和 RPC 錯誤。

## 媒體與附件

### 我的技能產生了圖像或 PDF，但沒有傳送任何內容

來自代理程式的出站附件必須包含一行 `MEDIA:<path-or-url>` （需獨立成行）。請參閱 [OpenClaw 助手設定](/zh-Hant/start/openclaw) 和 [代理程式傳送](/zh-Hant/tools/agent-send)。

CLI 傳送：

```bash
openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
```

同時檢查：

- 目標通道支援出站媒體，且未被允許清單封鎖。
- 檔案大小在提供者的限制範圍內（圖片會調整大小至最大 2048px）。

請參閱 [圖片](/zh-Hant/nodes/images)。

## 安全性與存取控制

### 將 OpenClaw 暴露於入站 DM 是否安全

請將入站 DM 視為不受信任的輸入。預設值旨在降低風險：

- 支援 DM 的通道其預設行為為 **配對 (pairing)**：
  - 未知的發送者會收到配對碼；機器人不會處理他們的訊息。
  - 使用以下指令核准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
  - 每個通道的待處理請求上限為 **3 個**；如果代碼未送達，請檢查 `openclaw pairing list --channel <channel> [--account <id>]`。
- 公開開放 DM 需要明確選擇加入（`dmPolicy: "open"` 和允許清單 `"*"`）。

執行 `openclaw doctor` 以找出有風險的 DM 政策。

### 提示詞注入 (Prompt injection) 是否只是公開機器人的隱患

不是。提示詞注入是關於 **不受信任的內容**，而不僅僅是誰能 DM 機器人。
如果您的助手讀取外部內容（網路搜尋/擷取、瀏覽器頁面、電子郵件、
文件、附件、貼上的日誌），該內容可能包含試圖
劫持模型的指令。即使 **您是唯一的發送者**，也可能發生這種情況。

最大的風險在於啟用工具時：模型可能會被誘騙而
外洩內容或代表您呼叫工具。您可以透過以下方式降低影響範圍：

- 使用唯讀或停用工具的「讀者」代理程式來總結不受信任的內容
- 針對已啟用工具的代理程式，請保持 `web_search` / `web_fetch` / `browser` 關閉
- 沙盒機制與嚴格的工具允許清單

詳細資訊：[安全性](/zh-Hant/gateway/security)。

### 我的機器人是否應該擁有自己的電子郵件、GitHub 帳號或電話號碼

是的，對於大多數設定來說。使用獨立的帳號和電話號碼來隔離機器人，可在發生問題時減少受影響的範圍。這也能讓您更容易輪換憑證或撤銷存取權，而不會影響您的個人帳號。

從小處著手。僅授與您實際需要的工具和帳號存取權，之後如有需要再擴充。

文件：[安全性](/zh-Hant/gateway/security)、[配對](/zh-Hant/channels/pairing)。

### 我可以讓它自主控制我的簡訊，這樣安全嗎

我們**不建議**讓它對您的個人訊息擁有完全自主權。最安全的模式是：

- 將直接訊息保持在 **配對模式** 或嚴格的白名單中。
- 如果您希望它代表您傳送訊息，請使用 **獨立的號碼或帳號**。
- 讓它先起草，然後在 **傳送前進行審核**。

如果您想要進行實驗，請在專用的帳號上進行並保持隔離。請參閱 [安全性](/zh-Hant/gateway/security)。

### 我可以使用較便宜的模型來執行個人助理任務嗎

可以，**前提是**代理程式僅用於聊天且輸入內容是受信任的。較低階層的模型更容易受到指令劫持，因此應避免在啟用工具的代理程式或讀取不受信任內容時使用。如果您必須使用較小的模型，請鎖定工具並在沙箱中執行。請參閱 [安全性](/zh-Hant/gateway/security)。

### 我在 Telegram 執行了 start 但沒有收到配對碼

僅當未知的發送者傳送訊息給機器人且已啟用
`dmPolicy: "pairing"` 時，才會傳送配對碼。單獨執行 `/start` 不會產生代碼。

檢查待處理請求：

```bash
openclaw pairing list telegram
```

如果您希望立即存取，請將您的發送者 ID 加入白名單，或為該帳號設定 `dmPolicy: "open"`。

### WhatsApp 它會傳送訊息給我的聯絡人嗎 配對如何運作

不會。WhatsApp 預設的直接訊息政策是 **配對**。未知的發送者只會收到配對碼，且其訊息**不會被處理**。OpenClaw 僅會回覆它收到的聊天，或是您觸發的明確傳送。

使用以下方式批准配對：

```bash
openclaw pairing approve whatsapp <code>
```

列出待處理請求：

```bash
openclaw pairing list whatsapp
```

精靈電話號碼提示：這是用來設定您的 **白名單/擁有者**，以便允許您自己的直接訊息。它不用於自動傳送。如果您在個人的 WhatsApp 號碼上執行，請使用該號碼並啟用 `channels.whatsapp.selfChatMode`。

## 聊天指令、中止任務和「它無法停止」

### 如何阻止內部系統訊息顯示在聊天中

大多數內部或工具訊息僅在針對該工作階段啟用 **verbose** 或 **reasoning** 時才會出現。

在出現問題的聊天中進行修復：

```
/verbose off
/reasoning off
```

如果仍然顯示過多訊息，請檢查控制 UI 中的工作階段設定，並將 verbose 設定為 **inherit**。同時確認您未在設定檔中使用將 `verboseDefault` 設定為 `on` 的 bot 設定檔。

文件：[Thinking and verbose](/zh-Hant/tools/thinking)、[Security](/zh-Hant/gateway/security#reasoning--verbose-output-in-groups)。

### 如何停止/取消正在執行的任務

將以下任一項**作為獨立訊息發送**（不帶斜線）：

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

這些是中止觸發器（不是斜線指令）。

對於背景程序（來自 exec 工具），您可以要求代理程式執行：

```
process action:kill sessionId:XXX
```

斜線指令概述：請參閱 [Slash commands](/zh-Hant/tools/slash-commands)。

大多數指令必須作為以 `/` 開頭的**獨立**訊息發送，但少數捷徑（例如 `/status`）也可以在允許清單中的發送者處內聯使用。

### 如何從 Telegram 發送 Discord 訊息（跨上下文訊息被拒絕）

OpenClaw 預設會封鎖 **跨提供者** 訊息傳送。如果工具呼叫綁定到 Telegram，除非您明確允許，否則它不會發送到 Discord。

為代理程式啟用跨提供者訊息傳送：

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

編輯設定後請重新啟動閘道。如果您只希望單一代理程式擁有此設定，請改為在 `agents.list[].tools.message` 下設定。

### 為什麼 bot 似乎會忽略快速連續發送的訊息

佇列模式控制新訊息如何與正在進行的執行互動。使用 `/queue` 來變更模式：

- `steer` - 新訊息會重新導向目前的任務
- `followup` - 一次執行一則訊息
- `collect` - 批次處理訊息並回覆一次（預設）
- `steer-backlog` - 立即導引，然後處理積压
- `interrupt` - 中止目前執行並重新開始

您可以新增選項（例如 `debounce:2s cap:25 drop:summarize`）以用於後續模式。

## 根據截圖/聊天紀錄回答確切的問題

**Q：「使用 API 金鑰時，Anthropic 的預設模型是什麼？」**

**A：** 在 OpenClaw 中，憑證與模型選擇是分開的。設定 `ANTHROPIC_API_KEY`（或在 auth profiles 中儲存 Anthropic API 金鑰）會啟用驗證，但實際的預設模型是您在 `agents.defaults.model.primary` 中設定的任何內容（例如，`anthropic/claude-sonnet-4-5` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，這表示 Gateway 在執行中代理程式的預期 `auth-profiles.json` 中找不到 Anthropic 憑證。

---

還是卡住了？請在 [Discord](https://discord.com/invite/clawd) 中提問或開啟 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
