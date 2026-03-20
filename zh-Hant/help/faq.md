---
summary: "關於 OpenClaw 設定、配置和使用的常見問題"
read_when:
  - 回答常見的設定、安裝、導入或執行階段支援問題
  - 在進行更深層除錯之前對使用者回報的問題進行分類
title: "FAQ"
---

# 常見問題

針對實際設定的快速解答與更深入的故障排除（本機開發、VPS、多重代理、OAuth/API 金鑰、模型失效備援）。關於執行階段診斷，請參閱[疑難排解](/zh-Hant/gateway/troubleshooting)。完整的配置參考，請參閱[配置](/zh-Hant/gateway/configuration)。

## 目錄

- [快速入門與首次執行設定]
  - [我卡住了 - 最快的解決方法](#i-am-stuck---fastest-way-to-get-unstuck)
  - [安裝和設定 OpenClaw 的建議方式](#recommended-way-to-install-and-set-up-openclaw)
  - [導入後如何開啟儀表板？](#how-do-i-open-the-dashboard-after-onboarding)
  - [如何在本機與遠端驗證儀表板（權杖）？](#how-do-i-authenticate-the-dashboard-token-on-localhost-vs-remote)
  - [我需要什麼執行環境？](#what-runtime-do-i-need)
  - [它可以在 Raspberry Pi 上執行嗎？](#does-it-run-on-raspberry-pi)
  - [Raspberry Pi 安裝有任何建議嗎？](#any-tips-for-raspberry-pi-installs)
  - [卡在「wake up my friend」/ 導入無法完成。現在該怎麼辦？](#it-is-stuck-on-wake-up-my-friend-onboarding-will-not-hatch-what-now)
  - [我可以將設定移轉到新機器（Mac mini）而不需重新進行導入嗎？](#can-i-migrate-my-setup-to-a-new-machine-mac-mini-without-redoing-onboarding)
  - [我在哪裡可以看到最新版本的更新內容？](#where-do-i-see-what-is-new-in-the-latest-version)
  - [無法存取 docs.openclaw.ai（SSL 錯誤）](#cannot-access-docsopenclawai-ssl-error)
  - [穩定版與 Beta 版的差異](#difference-between-stable-and-beta)
  - [如何安裝 Beta 版，以及 Beta 版與開發版有何差異](#how-do-i-install-the-beta-version-and-what-is-the-difference-between-beta-and-dev)
  - [如何嘗試最新版本？](#how-do-i-try-the-latest-bits)
  - [安裝和導入通常需要多長時間？](#how-long-does-install-and-onboarding-usually-take)
  - [安裝程式卡住了？如何獲得更多回饋？](#installer-stuck-how-do-i-get-more-feedback)
  - [Windows 安裝顯示找不到 git 或無法辨識 openclaw](#windows-install-says-git-not-found-or-openclaw-not-recognized)
  - [Windows 執行輸出顯示亂碼中文，我該怎麼辦](#windows-exec-output-shows-garbled-chinese-text-what-should-i-do)
  - [文件沒有回答我的問題 - 如何獲得更好的答案](#the-docs-did-not-answer-my-question---how-do-i-get-a-better-answer)
  - [如何在 Linux 上安裝 OpenClaw？](#how-do-i-install-openclaw-on-linux)
  - [如何在 VPS 上安裝 OpenClaw？](#how-do-i-install-openclaw-on-a-vps)
  - [雲端/VPS 安裝指南在哪裡？](#where-are-the-cloudvps-install-guides)
  - [我可以要求 OpenClaw 自我更新嗎？](#can-i-ask-openclaw-to-update-itself)
  - [入門導覽實際上做什麼？](#what-does-onboarding-actually-do)
  - [執行此程式需要 Claude 或 OpenAI 訂閱嗎？](#do-i-need-a-claude-or-openai-subscription-to-run-this)
  - [我可以在沒有 API 金鑰的情況下使用 Claude Max 訂閱嗎](#can-i-use-claude-max-subscription-without-an-api-key)
  - [Anthropic 的「setup-token」驗證如何運作？](#how-does-anthropic-setuptoken-auth-work)
  - [我在哪裡可以找到 Anthropic 的 setup-token？](#where-do-i-find-an-anthropic-setuptoken)
  - [你們支援 Claude 訂閱驗證（Claude Pro 或 Max）嗎？](#do-you-support-claude-subscription-auth-claude-pro-or-max)
  - [為什麼我會看到來自 Anthropic 的 `HTTP 429: rate_limit_error`？](#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)
  - [支援 AWS Bedrock 嗎？](#is-aws-bedrock-supported)
  - [Codex 驗證如何運作？](#how-does-codex-auth-work)
  - [你們支援 OpenAI 訂閱驗證（Codex OAuth）嗎？](#do-you-support-openai-subscription-auth-codex-oauth)
  - [如何設定 Gemini CLI OAuth](#how-do-i-set-up-gemini-cli-oauth)
  - [本機模型適合閒聊嗎？](#is-a-local-model-ok-for-casual-chats)
  - [如何將託管模型流量保留在特定區域？](#how-do-i-keep-hosted-model-traffic-in-a-specific-region)
  - [我需要購買 Mac Mini 才能安裝這個嗎？](#do-i-have-to-buy-a-mac-mini-to-install-this)
  - [我需要 Mac mini 才能支援 iMessage 嗎？](#do-i-need-a-mac-mini-for-imessage-support)
  - [如果我購買 Mac mini 來執行 OpenClaw，我可以將它連接到我的 MacBook Pro 嗎？](#if-i-buy-a-mac-mini-to-run-openclaw-can-i-connect-it-to-my-macbook-pro)
  - [我可以使用 Bun 嗎？](#can-i-use-bun)
  - [Telegram：`allowFrom` 中應填入什麼？](#telegram-what-goes-in-allowfrom)
  - [多個人可以使用同一個 WhatsApp 號碼搭配不同的 OpenClaw 實例嗎？](#can-multiple-people-use-one-whatsapp-number-with-different-openclaw-instances)
  - [我可以同時執行「快速聊天」代理程式和「用於編碼的 Opus」代理程式嗎？](#can-i-run-a-fast-chat-agent-and-an-opus-for-coding-agent)
  - [Homebrew 在 Linux 上運作嗎？](#does-homebrew-work-on-linux)
  - [可駭改的 git 安裝與 npm 安裝之間的區別](#difference-between-the-hackable-git-install-and-npm-install)
  - [我後來可以在 npm 和 git 安裝之間切換嗎？](#can-i-switch-between-npm-and-git-installs-later)
  - [我應該在筆記型電腦還是 VPS 上執行 Gateway？](#should-i-run-the-gateway-on-my-laptop-or-a-vps)
  - [在專用機器上執行 OpenClaw 有多重要？](#how-important-is-it-to-run-openclaw-on-a-dedicated-machine)
  - [最低的 VPS 需求和推薦的作業系統是什麼？](#what-are-the-minimum-vps-requirements-and-recommended-os)
  - [我可以在 VM 中執行 OpenClaw 嗎，需求是什麼](#can-i-run-openclaw-in-a-vm-and-what-are-the-requirements)
- [什麼是 OpenClaw？](#what-is-openclaw)
  - [什麼是 OpenClaw，用一段話來說？](#what-is-openclaw-in-one-paragraph)
  - [價值主張](#value-proposition)
  - [我剛設定好，首先應該做什麼](#i-just-set-it-up-what-should-i-do-first)
  - [OpenClaw 的五大日常使用案例是什麼](#what-are-the-top-five-everyday-use-cases-for-openclaw)
  - [OpenClaw 能否協助 SaaS 的潛在客戶開發外聯、廣告和部落格](#can-openclaw-help-with-lead-gen-outreach-ads-and-blogs-for-a-saas)
  - [相較於網頁開發的 Claude Code，有哪些優勢？](#what-are-the-advantages-vs-claude-code-for-web-development)
- [技能與自動化](#skills-and-automation)
  - [如何自訂技能而不讓 repo 保持骯髒狀態？](#how-do-i-customize-skills-without-keeping-the-repo-dirty)
  - [我可以從自訂資料夾載入技能嗎？](#can-i-load-skills-from-a-custom-folder)
  - [我如何針對不同的任務使用不同的模型？](#how-can-i-use-different-models-for-different-tasks)
  - [機器人在執行繁重工作時會凍結。我該如何卸載該工作？](#the-bot-freezes-while-doing-heavy-work-how-do-i-offload-that)
  - [Cron 或提醒無法觸發。我應該檢查什麼？](#cron-or-reminders-do-not-fire-what-should-i-check)
  - [我如何在 Linux 上安裝技能？](#how-do-i-install-skills-on-linux)
  - [OpenClaw 可以排程執行任務或在背景持續執行嗎？](#can-openclaw-run-tasks-on-a-schedule-or-continuously-in-the-background)
  - [我可以從 Linux 執行僅限 Apple macOS 的技能嗎？](#can-i-run-apple-macos-only-skills-from-linux)
  - [你們有 Notion 或 HeyGen 整合嗎？](#do-you-have-a-notion-or-heygen-integration)
  - [我如何使用我現有已登入的 Chrome 與 OpenClaw？](#how-do-i-use-my-existing-signed-in-chrome-with-openclaw)
- [沙盒機制與記憶體](#sandboxing-and-memory)
  - [有專門的沙盒機制文件嗎？](#is-there-a-dedicated-sandboxing-doc)
  - [如何將主機資料夾綁定到沙盒？](#how-do-i-bind-a-host-folder-into-the-sandbox)
  - [記憶體是如何運作的？](#how-does-memory-work)
  - [記憶體一直忘記事情。我該如何讓它記住？](#memory-keeps-forgetting-things-how-do-i-make-it-stick)
  - [記憶體會永久保存嗎？有什麼限制？](#does-memory-persist-forever-what-are-the-limits)
  - [語意記憶體搜尋需要 OpenAI API 金鑰嗎？](#does-semantic-memory-search-require-an-openai-api-key)
- [檔案在磁碟上的存放位置](#where-things-live-on-disk)
  - [所有與 OpenClaw 一起使用的資料都會儲存在本機嗎？](#is-all-data-used-with-openclaw-saved-locally)
  - [OpenClaw 將資料儲存在哪裡？](#where-does-openclaw-store-its-data)
  - [AGENTS.md / SOUL.md / USER.md / MEMORY.md 應該放在哪裡？](#where-should-agentsmd-soulmd-usermd-memorymd-live)
  - [建議的備份策略](#recommended-backup-strategy)
  - [如何完全解除安裝 OpenClaw？](#how-do-i-completely-uninstall-openclaw)
  - [代理程式可以在工作區外運作嗎？](#can-agents-work-outside-the-workspace)
  - [我在遠端模式下 - session store 在哪裡？](#im-in-remote-mode-where-is-the-session-store)
- [設定基礎](#config-basics)
  - [設定是什麼格式？它在哪裡？](#what-format-is-the-config-where-is-it)
  - [我設定了 `gateway.bind: "lan"` (或 `"tailnet"`)，現在沒有任何東西在監聽 / UI 顯示未獲授權](#i-set-gatewaybind-lan-or-tailnet-and-now-nothing-listens-the-ui-says-unauthorized)
  - [為什麼我現在在 localhost 需要 token？](#why-do-i-need-a-token-on-localhost-now)
  - [變更設定後需要重新啟動嗎？](#do-i-have-to-restart-after-changing-config)
  - [如何停用有趣的 CLI 標語？](#how-do-i-disable-funny-cli-taglines)
  - [如何啟用網路搜尋 (和網路擷取)？](#how-do-i-enable-web-search-and-web-fetch)
  - [config.apply 清除了我的設定。我該如何復原並避免這種情況？](#configapply-wiped-my-config-how-do-i-recover-and-avoid-this)
  - [如何在跨設備的專用 Worker 上執行中央 Gateway？](#how-do-i-run-a-central-gateway-with-specialized-workers-across-devices)
  - [OpenClaw 瀏覽器可以無頭模式 (headless) 執行嗎？](#can-the-openclaw-browser-run-headless)
  - [如何使用 Brave 進行瀏覽器控制？](#how-do-i-use-brave-for-browser-control)
- [遠端閘道和節點](#remote-gateways-and-nodes)
  - [指令如何在 Telegram、Gateway 和節點之間傳遞？](#how-do-commands-propagate-between-telegram-the-gateway-and-nodes)
  - [如果閘道是託管在遠端，我的代理如何存取我的電腦？](#how-can-my-agent-access-my-computer-if-the-gateway-is-hosted-remotely)
  - [Tailscale 已連線，但我沒有收到回覆。現在該怎麼辦？](#tailscale-is-connected-but-i-get-no-replies-what-now)
  - [兩個 OpenClaw 實例可以互相通訊嗎（本機 + VPS）？](#can-two-openclaw-instances-talk-to-each-other-local-vps)
  - [多個代理是否需要分開的 VPS](#do-i-need-separate-vpses-for-multiple-agents)
  - [與其從 VPS 使用 SSH，在我的個人筆記型電腦上使用節點有什麼好處嗎？](#is-there-a-benefit-to-using-a-node-on-my-personal-laptop-instead-of-ssh-from-a-vps)
  - [節點會執行閘道服務嗎？](#do-nodes-run-a-gateway-service)
  - [是否有 API / RPC 方式可以套用設定？](#is-there-an-api-rpc-way-to-apply-config)
  - [首次安裝的最小合理設定](#minimal-sane-config-for-a-first-install)
  - [我該如何在 VPS 上設置 Tailscale 並從我的 Mac 連線？](#how-do-i-set-up-tailscale-on-a-vps-and-connect-from-my-mac)
  - [我該如何將 Mac 節點連線到遠端閘道（Tailscale Serve）？](#how-do-i-connect-a-mac-node-to-a-remote-gateway-tailscale-serve)
  - [我應該安裝在第二台筆記型電腦上，還是只新增一個節點？](#should-i-install-on-a-second-laptop-or-just-add-a-node)
- [環境變數與 .env 載入](#env-vars-and-env-loading)
  - [OpenClaw 如何載入環境變數？](#how-does-openclaw-load-environment-variables)
  - [「我透過服務啟動了閘道，結果環境變數不見了。」現在該怎麼辦？](#i-started-the-gateway-via-the-service-and-my-env-vars-disappeared-what-now)
  - [我設定了 `COPILOT_GITHUB_TOKEN`，但模型狀態顯示「Shell env: off」。為什麼？](#i-set-copilotgithubtoken-but-models-status-shows-shell-env-off-why)
- [工作階段與多重聊天](#sessions-and-multiple-chats)
  - [我該如何開始一個新的對話？](#how-do-i-start-a-fresh-conversation)
  - [如果從未傳送 `/new`，工作階段會自動重置嗎？](#do-sessions-reset-automatically-if-i-never-send-new)
  - [有沒有辦法建立一個 OpenClaw 實例團隊，其中一個是 CEO，許多個是代理](#is-there-a-way-to-make-a-team-of-openclaw-instances-one-ceo-and-many-agents)
  - [為什麼內容在工作途中被截斷？我該如何預防？](#why-did-context-get-truncated-midtask-how-do-i-prevent-it)
  - [我該如何完全重置 OpenClaw 但保留安裝？](#how-do-i-completely-reset-openclaw-but-keep-it-installed)
  - [我遇到「context too large」錯誤 - 該如何重置或壓縮？](#im-getting-context-too-large-errors-how-do-i-reset-or-compact)
  - [為什麼我看到「LLM request rejected: messages.content.tool_use.input field required」？](#why-am-i-seeing-llm-request-rejected-messagescontenttool_useinput-field-required)
  - [為什麼我每 30 分鐘會收到心跳訊息？](#why-am-i-getting-heartbeat-messages-every-30-minutes)
  - [我需要將「機器人帳號」新增到 WhatsApp 群組嗎？](#do-i-need-to-add-a-bot-account-to-a-whatsapp-group)
  - [如何取得 WhatsApp 群組的 JID？](#how-do-i-get-the-jid-of-a-whatsapp-group)
  - [為什麼 OpenClaw 不在群組中回覆](#why-does-openclaw-not-reply-in-a-group)
  - [群組/執行緒會與私人訊息 (DM) 共用上下文嗎？](#do-groupsthreads-share-context-with-dms)
  - [我可以建立多少個工作區和代理程式？](#how-many-workspaces-and-agents-can-i-create)
  - [我可以同時執行多個機器人或聊天嗎？我應該如何設定？](#can-i-run-multiple-bots-or-chats-at-the-same-time-slack-and-how-should-i-set-that-up)
- [模型：預設值、選擇、別名、切換](#models-defaults-selection-aliases-switching)
  - [什麼是「預設模型」？](#what-is-the-default-model)
  - [你推薦使用哪種模型？](#what-model-do-you-recommend)
  - [如何在不清除設定的情況下切換模型？](#how-do-i-switch-models-without-wiping-my-config)
  - [我可以使用自託管的模型嗎？](#can-i-use-selfhosted-models-llamacpp-vllm-ollama)
  - [OpenClaw、Flawd 和 Krill 使用什麼模型？](#what-do-openclaw-flawd-and-krill-use-for-models)
  - [如何動態切換模型（無需重新啟動）？](#how-do-i-switch-models-on-the-fly-without-restarting)
  - [我可以將 GPT 5.2 用於日常任務，並將 Codex 5.3 用於編寫程式碼嗎？](#can-i-use-gpt-52-for-daily-tasks-and-codex-53-for-coding)
  - [為什麼我會看到「Model … is not allowed」，然後沒有回覆？](#why-do-i-see-model-is-not-allowed-and-then-no-reply)
  - [為什麼我會看到「Unknown model: minimax/MiniMax-M2.5」？](#why-do-i-see-unknown-model-minimaxminimaxm25)
  - [我可以將 MiniMax 作為預設值，並將 OpenAI 用於複雜任務嗎？](#can-i-use-minimax-as-my-default-and-openai-for-complex-tasks)
  - [opus / sonnet / gpt 是內建的捷徑嗎？](#are-opus-sonnet-gpt-builtin-shortcuts)
  - [如何定義/覆寫模型捷徑（別名）？](#how-do-i-defineoverride-model-shortcuts-aliases)
  - [如何新增來自其他供應商（如 OpenRouter 或 Z.AI）的模型？](#how-do-i-add-models-from-other-providers-like-openrouter-or-zai)
- [模型容錯移轉和「所有模型皆失敗」](#model-failover-and-all-models-failed)
  - [容錯移轉是如何運作的？](#how-does-failover-work)
  - [這個錯誤訊息是什麼意思？](#what-does-this-error-mean)
  - [`No credentials found for profile "anthropic:default"` 的修復檢查清單](#fix-checklist-for-no-credentials-found-for-profile-anthropicdefault)
  - [為什麼它也嘗試了 Google Gemini 並且失敗了？](#why-did-it-also-try-google-gemini-and-fail)
- [認證設定檔：它們是什麼以及如何管理它們](#auth-profiles-what-they-are-and-how-to-manage-them)
  - [什麼是認證設定檔？](#what-is-an-auth-profile)
  - [典型的設定檔 ID 有哪些？](#what-are-typical-profile-ids)
  - [我可以控制先嘗試哪個認證設定檔嗎？](#can-i-control-which-auth-profile-is-tried-first)
  - [OAuth 與 API 金鑰 - 有什麼區別](#oauth-vs-api-key---what-is-the-difference)
- [Gateway：連接埠、「已在執行」以及遠端模式](#gateway-ports-already-running-and-remote-mode)
  - [Gateway 使用哪個連接埠？](#what-port-does-the-gateway-use)
  - [為什麼 `openclaw gateway status` 說 `Runtime: running` 但 `RPC probe: failed`？](#why-does-openclaw-gateway-status-say-runtime-running-but-rpc-probe-failed)
  - [為什麼 `openclaw gateway status` 顯示的 `Config (cli)` 和 `Config (service)` 不同？](#why-does-openclaw-gateway-status-show-config-cli-and-config-service-different)
  - [「另一個 gateway 實例正在監聽」是什麼意思？](#what-does-another-gateway-instance-is-already-listening-mean)
  - [我如何在遠端模式下執行 OpenClaw（客戶端連接到其他地方的 Gateway）？](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere)
  - [控制 UI 顯示「未授權」（或持續重新連線）。現在該怎麼辦？](#the-control-ui-says-unauthorized-or-keeps-reconnecting-what-now)
  - [我設定了 gateway.bind tailnet 但它無法綁定且沒有任何東西在監聽](#i-set-gatewaybind-tailnet-but-it-cannot-bind-and-nothing-listens)
  - [我可以在同一台主機上執行多個 Gateway 嗎？](#can-i-run-multiple-gateways-on-the-same-host)
  - [「無效的交握」/ 代碼 1008 是什麼意思？](#what-does-invalid-handshake-code-1008-mean)
- [紀錄與除錯](#logging-and-debugging)
  - [紀錄檔在哪裡？](#where-are-logs)
  - [我如何啟動/停止/重新啟動 Gateway 服務？](#how-do-i-startstoprestart-the-gateway-service)
  - [我在 Windows 上關閉了終端機 - 我該如何重新啟動 OpenClaw？](#i-closed-my-terminal-on-windows-how-do-i-restart-openclaw)
  - [Gateway 已啟動但回覆從未到達。我應該檢查什麼？](#the-gateway-is-up-but-replies-never-arrive-what-should-i-check)
  - [「已從 gateway 中斷連線：無原因」- 現在該怎麼辦？](#disconnected-from-gateway-no-reason-what-now)
  - [Telegram setMyCommands 失敗。我應該檢查什麼？](#telegram-setmycommands-fails-what-should-i-check)
  - [TUI 沒有顯示輸出。我應該檢查什麼？](#tui-shows-no-output-what-should-i-check)
  - [我如何完全停止然後啟動 Gateway？](#how-do-i-completely-stop-then-start-the-gateway)
  - [ELI5: `openclaw gateway restart` vs `openclaw gateway`](#eli5-openclaw-gateway-restart-vs-openclaw-gateway)
  - [發生故障時獲取更多詳情的最快方法](#fastest-way-to-get-more-details-when-something-fails)
- [媒體與附件](#media-and-attachments)
  - [我的技能產生了圖片/PDF，但什麼都沒有發送](#my-skill-generated-an-imagepdf-but-nothing-was-sent)
- [安全性與存取控制](#security-and-access-control)
  - [將 OpenClaw 暴露給傳入 DM 安全嗎？](#is-it-safe-to-expose-openclaw-to-inbound-dms)
  - [提示詞注入僅是公開機器人的隱患嗎？](#is-prompt-injection-only-a-concern-for-public-bots)
  - [我的機器人應該擁有自己的電子郵件、GitHub 帳號或電話號碼嗎](#should-my-bot-have-its-own-email-github-account-or-phone-number)
  - [我可以讓它自主控制我的簡訊嗎，這樣安全嗎](#can-i-give-it-autonomy-over-my-text-messages-and-is-that-safe)
  - [我可以使用更便宜的模型來執行個人助理任務嗎？](#can-i-use-cheaper-models-for-personal-assistant-tasks)
  - [我在 Telegram 中執行了 /start 但沒有收到配對碼](#i-ran-start-in-telegram-but-did-not-get-a-pairing-code)
  - [WhatsApp：它會傳訊息給我的聯絡人嗎？配對如何運作？](#whatsapp-will-it-message-my-contacts-how-does-pairing-work)
- [聊天指令、中止任務，以及「它停不下來」](#chat-commands-aborting-tasks-and-it-will-not-stop)
  - [如何停止內部系統訊息顯示在聊天中](#how-do-i-stop-internal-system-messages-from-showing-in-chat)
  - [如何停止/取消正在執行的任務？](#how-do-i-stopcancel-a-running-task)
  - [如何從 Telegram 發送 Discord 訊息？（「跨語境傳訊被拒」）](#how-do-i-send-a-discord-message-from-telegram-crosscontext-messaging-denied)
  - [為什麼感覺機器人會「忽略」連珠砲似的訊息？](#why-does-it-feel-like-the-bot-ignores-rapidfire-messages)

## 如果發生故障，前 60 秒該做什麼

1. **快速狀態（首要檢查）**

   ```bash
   openclaw status
   ```

   快速本機摘要：OS + 更新、閘道/服務連線性、代理/工作階段、提供者設定 + 執行時問題（當閘道可連線時）。

2. **可貼上的報告（可安全分享）**

   ```bash
   openclaw status --all
   ```

   唯讀診斷，包含日誌尾部（令牌已塗銷）。

3. **常駐程式 + 連接埠狀態**

   ```bash
   openclaw gateway status
   ```

   顯示監督器執行時 vs RPC 連線性、探測目標 URL，以及服務可能使用的設定。

4. **深度探測**

   ```bash
   openclaw status --deep
   ```

   執行閘道健康檢查 + 提供者探測（需要可連線的閘道）。請參閱[健康狀態](/zh-Hant/gateway/health)。

5. **追蹤最新的日誌**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 當機，請改用：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   檔案日誌與服務日誌是分開的；請參閱 [日誌記錄](/zh-Hant/logging) 和 [疑難排解](/zh-Hant/gateway/troubleshooting)。

6. **執行修復程式 (修復)**

   ```bash
   openclaw doctor
   ```

   修復/遷移設定/狀態 + 執行健康檢查。請參閱 [修復程式](/zh-Hant/gateway/doctor)。

7. **閘道快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向執行中的閘道請求完整快照 (僅限 WS)。請參閱 [健康狀態](/zh-Hant/gateway/health)。

## 快速入門與首次執行設定

### 我卡住了 - 解除卡住的最快方法

使用可以**看到您的機器**的本機 AI 代理。這比在 Discord 中詢問有效得多，因為大多數「我卡住了」的情況都是遠端協助者無法檢查的**本機設定或環境問題**。

- **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
- **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

這些工具可以讀取儲存庫、執行指令、檢查日誌，並協助修正您的機器層級設定 (PATH、服務、權限、驗證檔案)。透過可駭客安裝 (git) 為它們提供 **完整的原始碼簽出**：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

這會**從 git 簽出**安裝 OpenClaw，因此代理可以讀取程式碼 + 文件並推斷您正在執行的確切版本。您始終可以稍後透過不使用 `--install-method git` 重新執行安裝程式來切換回穩定版本。

提示：要求代理**計劃並監督**修正 (逐步進行)，然後僅執行必要的指令。這可以保持變更細微且更容易稽核。

如果您發現真正的錯誤或修復方法，請提出 GitHub issue 或傳送 PR：
[https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
[https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

從這些指令開始 (尋求協助時分享輸出)：

```bash
openclaw status
openclaw models status
openclaw doctor
```

它們的作用：

- `openclaw status`：閘道/代理健康狀態 + 基本設定的快速快照。
- `openclaw models status`：檢查提供者驗證 + 模型可用性。
- `openclaw doctor`：驗證並修復常見的設定/狀態問題。

其他有用的 CLI 檢查：`openclaw status --all`、`openclaw logs --follow`、
`openclaw gateway status`、`openclaw health --verbose`。

快速偵錯循環：[First 60 seconds if something is broken](#first-60-seconds-if-something-is-broken)。
安裝文件：[Install](/zh-Hant/install)、[Installer flags](/zh-Hant/install/installer)、[Updating](/zh-Hant/install/updating)。

### 安裝與設定 OpenClaw 的建議方式

此儲存庫建議從原始碼執行並使用入門嚮導：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
```

嚮導也可以自動建置 UI 資源。入門完成後，您通常會在連接埠 **18789** 上執行 Gateway。

從原始碼（貢獻者/開發人員）：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw onboard
```

如果您尚未進行全域安裝，請透過 `pnpm openclaw onboard` 執行它。

### 入門完成後如何開啟儀表板

嚮導會在入門完成後立即使用乾淨（非權杖化）的儀表板 URL 開啟您的瀏覽器，並且會在摘要中列印連結。請保持該分頁開啟；如果它未啟動，請在同一台機器上複製並貼上列印出的 URL。

### 如何在本地主機或遠端驗證儀表板權杖

**本地主機（同一台機器）：**

- 開啟 `http://127.0.0.1:18789/`。
- 如果它要求驗證，請將 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）中的權杖貼上至 Control UI 設定中。
- 從 gateway 主機擷取它：`openclaw config get gateway.auth.token`（或產生一個：`openclaw doctor --generate-gateway-token`）。

**非本地主機：**

- **Tailscale Serve**（建議）：保持繫結回送，執行 `openclaw gateway --tailscale serve`，開啟 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 是 `true`，身份標頭會滿足 Control UI/WebSocket 驗證（無需權杖，假設為受信任的 gateway 主機）；HTTP API 仍需要權杖/密碼。
- **Tailnet bind**：執行 `openclaw gateway --bind tailnet --token "<token>"`，開啟 `http://<tailscale-ip>:18789/`，在儀表板設定中貼上權杖。
- **SSH tunnel**：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/` 並在 Control UI 設定中貼上權杖。

請參閱 [Dashboard](/zh-Hant/web/dashboard) 和 [Web surfaces](/zh-Hant/web) 以了解繫結模式和驗證詳細資訊。

### 我需要什麼執行環境

需要 Node **>= 22**。建議使用 `pnpm`。Bun **不建議**用於 Gateway。

### 它能在 Raspberry Pi 上執行嗎

是的。Gateway 是輕量級的——文件列出 **512MB-1GB RAM**、**1 核**和大約 **500MB** 的磁盤空間對於個人使用來說就足夠了，並且請注意 **Raspberry Pi 4 可以運行它**。

如果您想要額外的預留空間（日誌、媒體、其他服務），**建議使用 2GB**，但這並非硬性最低要求。

提示：小型 Pi/VPS 可以託管 Gateway，您可以在筆記本電腦/手機上配對 **節點** 以進行本地螢幕/相機/畫布或命令執行。請參閱 [節點](/zh-Hant/nodes)。

### Raspberry Pi 安裝有什麼建議嗎

簡短版本：它可以用，但預計會有一些粗糙的地方。

- 使用 **64 位元** 操作系統並保持 Node >= 22。
- 優先選擇 **可駭客化 (git) 安裝**，以便您可以查看日誌並快速更新。
- 開始時不要添加頻道/技能，然後逐一添加。
- 如果您遇到奇怪的二進制問題，通常是 **ARM 相容性** 問題。

文檔：[Linux](/zh-Hant/platforms/linux)、[安裝](/zh-Hant/install)。

### 它卡在「喚醒我的朋友」導覽無法完成怎麼辦

該畫面取決於 Gateway 是否可訪問且已通過身份驗證。TUI 也會在首次孵化時自動發送「Wake up, my friend!」。如果您看到該行但 **沒有回覆** 並且令牌數量保持為 0，則代理從未運行過。

1. 重新啟動 Gateway：

```bash
openclaw gateway restart
```

2. 檢查狀態 + 身份驗證：

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

3. 如果仍然卡住，請運行：

```bash
openclaw doctor
```

如果 Gateway 是遠端的，請確保隧道/Tailscale 連接已啟動，並且 UI 指向正確的 Gateway。請參閱 [遠端存取](/zh-Hant/gateway/remote)。

### 我可以將我的設定遷移到新機器 Mac mini 而無需重新進行導覽嗎

可以。複製 **狀態目錄** 和 **工作區**，然後運行一次 Doctor。只要您複製了 **兩個** 位置，這可以使您的機器人保持「完全相同」（記憶體、會話歷史、身份驗證和頻道狀態）：

1. 在新機器上安裝 OpenClaw。
2. 從舊機器複製 `$OPENCLAW_STATE_DIR`（預設：`~/.openclaw`）。
3. 複製您的工作區（預設：`~/.openclaw/workspace`）。
4. 運行 `openclaw doctor` 並重新啟動 Gateway 服務。

這將保留設定、身份驗證設定檔、WhatsApp 憑證、會話和記憶體。如果您處於遠端模式，請記住 gateway 主機擁有會話存儲和工作區。

**重要提示：** 如果您只將工作區 commit/push 到 GitHub，您備份的是 **記憶體 + 引導檔案**，但**不**包括會話歷史或認證資訊。這些檔案位於 `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

相關連結：[遷移](/zh-Hant/install/migrating)、[磁碟上的檔案位置](/zh-Hant/help/faq#where-does-openclaw-store-its-data)、
[Agent 工作區](/zh-Hant/concepts/agent-workspace)、[醫生工具](/zh-Hant/gateway/doctor)、
[遠端模式](/zh-Hant/gateway/remote)。

### 在哪裡可以查看最新版本的新功能

請查看 GitHub 變更日誌：
[https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

最新的條目位於頂部。如果頂部區段標記為 **Unreleased**（未發布），則下一個有日期的區段是最新發布的版本。條目按 **亮點**、**變更** 和 **修復** 分組（必要時還包含文件/其他區段）。

### 無法存取 docs.openclaw.ai (SSL 錯誤)

部分 Comcast/Xfinity 連線會透過 Xfinity Advanced Security 錯誤阻擋 `docs.openclaw.ai`。請停用它或將 `docs.openclaw.ai` 加入白名單，然後重試。更多詳情：[疑難排解](/zh-Hant/help/troubleshooting#docsopenclawai-shows-an-ssl-error-comcastxfinity)。
請透過此處回報來協助我們解除封鎖：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

如果您仍然無法存取該網站，文件在 GitHub 上有鏡像：
[https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

### 穩定版 與 Beta 版 的區別

**Stable** 和 **beta** 是 **npm dist-tags**（分發標籤），不是獨立的程式碼分支：

- `latest` = 穩定版
- `beta` = 用於測試的早期版本

我們將版本發布到 **beta** 進行測試，一旦某個版本穩定，我們會將該版本**推廣至 `latest`**。這就是為什麼 beta 和 stable 可能指向 **同一個版本**。

查看變更內容：
[https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

### 如何安裝 Beta 版以及 Beta 版和 Dev 版有什麼區別

**Beta** 是 npm dist-tag `beta`（可能與 `latest` 相同）。
**Dev** 是 `main` (git) 的移動開發分支；發布時，它使用 npm dist-tag `dev`。

單行指令 (macOS/Linux)：

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
```

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Windows 安裝程式：
[https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

更多詳情：[開發通道](/zh-Hant/install/development-channels) 和 [安裝程式旗標](/zh-Hant/install/installer)。

### 安裝和入門通常需要多長時間

粗略指南：

- **安裝：** 2-5 分鐘
- **入門：** 5-15 分鐘，取決於您設定了多少通道/模型

如果它停住了，請使用 [安裝程式停住](/zh-Hant/help/faq#installer-stuck-how-do-i-get-more-feedback)
以及 [我卡住了](/zh-Hant/help/faq#i-am-stuck---fastest-way-to-get-unstuck) 中的快速除錯迴圈。

### 我該如何嘗試最新版本

兩個選項：

1. **開發通道 (git checkout)：**

```bash
openclaw update --channel dev
```

這會切換到 `main` 分支並從原始碼更新。

2. **可駭客安裝 (從安裝程式網站)：**

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

這會給您一個可以編輯的本地存儲庫，然後透過 git 更新。

如果您偏好手動乾淨的克隆，請使用：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
```

文件：[更新](/zh-Hant/cli/update)、[開發通道](/zh-Hant/install/development-channels)、
[安裝](/zh-Hant/install)。

### 安裝程式停住了 如何獲得更多反饋

使用 **詳細輸出** 重新執行安裝程式：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
```

Beta 版本安裝並啟用詳細輸出：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
```

對於可駭客 安裝：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
```

Windows (PowerShell) 等效指令：

```powershell
# install.ps1 has no dedicated -Verbose flag yet.
Set-PSDebug -Trace 1
& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
Set-PSDebug -Trace 0
```

更多選項：[安裝程式旗標](/zh-Hant/install/installer)。

### Windows 安裝程式顯示找不到 git 或無法識別 openclaw

兩個常見的 Windows 問題：

**1) npm 錯誤 spawn git / git not found**

- 安裝 **Git for Windows** 並確保 `git` 在您的 PATH 中。
- 關閉並重新開啟 PowerShell，然後重新執行安裝程式。

**2) openclaw is not recognized after install**

- 您的 npm 全域 bin 資料夾不在 PATH 中。
- 檢查路徑：

  ```powershell
  npm config get prefix
  ```

- 將該目錄新增至您的使用者 PATH (Windows 上不需要 `\bin` 後綴；在大多數系統上是 `%AppData%\npm`)。
- 更新 PATH 後關閉並重新開啟 PowerShell。

如果您想要最順暢的 Windows 設定，請使用 **WSL2** 而非原生 Windows。
文件：[Windows](/zh-Hant/platforms/windows)。

### Windows 執行輸出顯示亂碼中文 我該怎麼辦

這通常是原生 Windows Shell 上主控台字碼頁不匹配造成的。

症狀：

- `system.run`/`exec` 輸出將中文渲染為亂碼
- 同一個指令在另一個終端機設定檔中看起來正常

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

如果您在最新版本的 OpenClaw 上仍然遇到此問題，請在此追蹤/回報：

- [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

### 文件沒有回答我的問題 - 如何獲得更好的答案

使用 **hackable (git) install** 安裝，這樣您本地就有完整的原始碼和文件，然後
_在該資料夾中_ 詢問您的機器人（或 Claude/Codex），以便它能閱讀 repo 並精確回答。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

更多細節：[安裝](/zh-Hant/install) 和 [安裝程式旗標](/zh-Hant/install/installer)。

### 如何在 Linux 上安裝 OpenClaw

簡短回答：遵循 Linux 指南，然後執行 onboarding。

- Linux 快速路徑 + 服務安裝：[Linux](/zh-Hant/platforms/linux)。
- 完整逐步指南：[入門](/zh-Hant/start/getting-started)。
- 安裝程式 + 更新：[安裝與更新](/zh-Hant/install/updating)。

### 如何在 VPS 上安裝 OpenClaw

任何 Linux VPS 都可以。在伺服器上安裝，然後使用 SSH/Tailscale 連線到 Gateway。

指南：[exe.dev](/zh-Hant/install/exe-dev)、[Hetzner](/zh-Hant/install/hetzner)、[Fly.io](/zh-Hant/install/fly)。
遠端存取：[Gateway 遠端](/zh-Hant/gateway/remote)。

### cloudVPS 安裝指南在哪裡

我們維護了一個涵蓋常見供應商的 **hosting hub**。選擇其中一個並遵循指南：

- [VPS hosting](/zh-Hant/vps) (所有供應商在一處)
- [Fly.io](/zh-Hant/install/fly)
- [Hetzner](/zh-Hant/install/hetzner)
- [exe.dev](/zh-Hant/install/exe-dev)

其在雲端運作方式：**Gateway 在伺服器上運行**，您可以透過 Control UI（或 Tailscale/SSH）
從筆記型電腦/手機存取它。您的狀態 + 工作區
存在於伺服器上，因此請將主機視為事實來源並進行備份。

您可以將 **節點**（Mac/iOS/Android/headless）配對到該雲端 Gateway 以存取
本機畫面/相機/畫布或在您的筆記型電腦上執行指令，同時將
Gateway 保留在雲端。

中心：[平台](/zh-Hant/platforms)。遠端存取：[Gateway 遠端](/zh-Hant/gateway/remote)。
節點：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)。

### 我可以要求 OpenClaw 自我更新嗎

簡答：**可行，但不建議**。更新流程可能會重新啟動
Gateway（這會中斷使用中的連線），可能需要乾淨的 git checkout，
並且可能會提示確認。更安全的做法：以操作員身分從 shell 執行更新。

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

### 入門實際上會做什麼

`openclaw onboard` 是建議的設定途徑。在**本地模式**下，它會引導您完成：

- **模型/認證設定**（支援提供者 OAuth/setup-token 流程和 API 金鑰，以及 LM Studio 等本地模型選項）
- **工作區**位置 + 引導檔案
- **Gateway 設定**（bind/port/auth/tailscale）
- **提供者**（WhatsApp、Telegram、Discord、Mattermost (plugin)、Signal、iMessage）
- **Daemon 安裝**（macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd user unit）
- **健康檢查**和**技能**選擇

如果您設定的模型未知或缺少認證，它也會發出警告。

### 執行此操作需要 Claude 或 OpenAI 訂閱嗎

不需要。您可以使用 **API 金鑰**（Anthropic/OpenAI/其他）或僅使用
**本地模型**來執行 OpenClaw，讓您的資料保留在您的裝置上。訂閱服務（Claude
Pro/Max 或 OpenAI Codex）是驗證這些提供者的可選方式。

如果您選擇 Anthropic 訂閱認證，請自行決定是否使用：
Anthropic 過去曾封鎖部分在 Claude Code 之外的訂閱使用。
OpenAI Codex OAuth 明確支援像 OpenClaw 這樣的外部工具。

文件：[Anthropic](/zh-Hant/providers/anthropic)、[OpenAI](/zh-Hant/providers/openai)、
[本地模型](/zh-Hant/gateway/local-models)、[模型](/zh-Hant/concepts/models)。

### 我可以在沒有 API 金鑰的情況下使用 Claude Max 訂閱嗎

可以。您可以使用 **setup-token**
代替 API 金鑰進行驗證。這是訂閱途徑。

Claude Pro/Max 訂閱**不包含 API 金鑰**，因此這是
訂閱帳戶的技術途徑。但這由您決定：Anthropic
過去曾封鎖部分在 Claude Code 之外的訂閱使用。
如果您想要生產環境中最清晰且最安全的支援途徑，請使用 Anthropic API 金鑰。

### Anthropic setuptoken 認證如何運作

`claude setup-token` 透過 Claude Code CLI 產生 **token 字串**（無法在網頁主控台取得）。您可以在**任何機器**上執行。在新手引導中選擇 **Anthropic token (paste setup-token)**，或是使用 `openclaw models auth paste-token --provider anthropic` 貼上。該 token 會儲存為 **anthropic** 提供者的 auth profile，並像 API 金鑰一樣使用（無法自動重新整理）。更多詳情：[OAuth](/zh-Hant/concepts/oauth)。

### 我在哪裡可以找到 Anthropic setuptoken

它**不**在 Anthropic Console 中。setup-token 是由 **Claude Code CLI** 在**任何機器**上產生的：

```bash
claude setup-token
```

複製它印出的 token，然後在新手引導中選擇 **Anthropic token (paste setup-token)**。如果您想在 gateway 主機上執行，請使用 `openclaw models auth setup-token --provider anthropic`。如果您在其他地方執行了 `claude setup-token`，請使用 `openclaw models auth paste-token --provider anthropic` 將其貼上到 gateway 主機。參見 [Anthropic](/zh-Hant/providers/anthropic)。

### 你們是否支援 Claude 訂閱驗證（Claude Pro 或 Max）

是 - 透過 **setup-token**。OpenClaw 不再重複使用 Claude Code CLI OAuth token；請使用 setup-token 或 Anthropic API 金鑰。在任何地方產生 token 並將其貼上到 gateway 主機。參見 [Anthropic](/zh-Hant/providers/anthropic) 和 [OAuth](/zh-Hant/concepts/oauth)。

重要：這是技術上的相容性，並非政策保證。Anthropic 過去曾封鎖部分在 Claude Code 之外的訂閱使用。您需要自行決定是否使用並驗證 Anthropic 的目前條款。對於生產環境或多使用者工作負載，Anthropic API 金鑰驗證是較安全且建議的選擇。

### 為什麼我會收到來自 Anthropic 的 HTTP 429 ratelimiterror

這表示您目前的 **Anthropic 配額/速率限制** 已用盡。如果您使用的是 **Claude 訂閱**（setup-token），請等待視窗重置或升級您的方案。如果您使用的是 **Anthropic API 金鑰**，請檢查 Anthropic Console 的使用情況/帳單，並視需要提高限制。

如果訊息特別是：
`Extra usage is required for long context requests`，表示請求正嘗試使用
Anthropic 的 1M context beta（`context1m: true`）。這只有在您的憑證符合長 context 計費資格（API 金鑰計費或已啟用 Extra Usage 的訂閱）時才有效。

提示：設定一個 **備用模型 (fallback model)**，以便在提供者受到速率限制時，OpenClaw 能繼續回覆。
請參閱 [Models](/zh-Hant/cli/models)、[OAuth](/zh-Hant/concepts/oauth) 以及
[/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/zh-Hant/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

### 是否支援 AWS Bedrock

是 - 透過 pi-ai 的 **Amazon Bedrock (Converse)** 提供者並使用 **手動配置**。您必須在 Gateway 主機上提供 AWS 憑證/區域，並在您的模型配置中新增 Bedrock 提供者項目。請參閱 [Amazon Bedrock](/zh-Hant/providers/bedrock) 和 [Model providers](/zh-Hant/providers/models)。如果您偏好受控金鑰流程，在 Bedrock 前面使用一個相容 OpenAI 的代理仍然是一個可行的選項。

### Codex 驗證如何運作

OpenClaw 透過 OAuth (ChatGPT 登入) 支援 **OpenAI Code (Codex)**。入門流程可以執行 OAuth 流程，並在適當時將預設模型設定為 `openai-codex/gpt-5.4`。請參閱 [Model providers](/zh-Hant/concepts/model-providers) 和 [Onboarding (CLI)](/zh-Hant/start/wizard)。

### 您是否支援 OpenAI 訂閱驗證 Codex OAuth

是。OpenClaw 完全支援 **OpenAI Code (Codex) subscription OAuth**。
OpenAI 明確允許在外部工具/工作流程中（如 OpenClaw）使用訂閱 OAuth。入門流程可以幫您執行 OAuth 流程。

請參閱 [OAuth](/zh-Hant/concepts/oauth)、[Model providers](/zh-Hant/concepts/model-providers) 和 [Onboarding (CLI)](/zh-Hant/start/wizard)。

### 如何設定 Gemini CLI OAuth

Gemini CLI 使用 **外掛程式驗證流程**，而不是在 `openclaw.json` 中使用客戶端 ID 或密鑰。

步驟：

1. 啟用外掛程式：`openclaw plugins enable google`
2. 登入：`openclaw models auth login --provider google-gemini-cli --set-default`

這會將 OAuth 權杖儲存在 Gateway 主機上的驗證設定檔中。詳細資訊：[Model providers](/zh-Hant/concepts/model-providers)。

### 本地模型適合用於閒聊嗎

通常不適合。OpenClaw 需要長上下文 + 強大的安全性；小顯卡會造成截斷和洩漏。如果您必須使用，請在本地執行您能執行的 **最大** MiniMax M2.5 版本 (LM Studio)，並參閱 [/gateway/local-models](/zh-Hant/gateway/local-models)。較小/量化模型會增加提示詞注入風險 - 請參閱 [Security](/zh-Hant/gateway/security)。

### 如何將託管模型的流量保留在特定區域

選擇區域固定的端點。OpenRouter 為 MiniMax、Kimi 和 GLM 提供了美國託管的選項；選擇美國託管的變體可將數據保留在區域內。您仍然可以使用 `models.mode: "merge"` 將 Anthropic/OpenAI 與這些模型並列，以便在遵守您選擇的區域供應商的同時保持備用可用。

### 不需要購買 Mac Mini 才能安裝此程式嗎

不用。OpenClaw 可在 macOS 或 Linux（透過 WSL2 的 Windows）上運行。Mac mini 是可選的 - 有些人會購買它作為始終運行的主機，但小型的 VPS、家庭伺服器或 Raspberry Pi 級別的設備也可以。

您只需要一台 Mac **用於僅限 macOS 的工具**。對於 iMessage，請使用 [BlueBubbles](/zh-Hant/channels/bluebubbles)（推薦）- BlueBubbles 伺服器可在任何 Mac 上運行，而 Gateway 可以在 Linux 或其他地方運行。如果您想要其他僅限 macOS 的工具，請在 Mac 上運行 Gateway 或配對 macOS 節點。

文件：[BlueBubbles](/zh-Hant/channels/bluebubbles)、[節點](/zh-Hant/nodes)、[Mac 遠端模式](/zh-Hant/platforms/mac/remote)。

### 我需要 Mac mini 才能支援 iMessage 嗎

您需要 **某台已登入 Messages 的 macOS 設備**。它**不**一定要是 Mac mini - 任何 Mac 都可以。**使用 [BlueBubbles](/zh-Hant/channels/bluebubbles)**（推薦）進行 iMessage 通訊 - BlueBubbles 伺服器在 macOS 上運行，而 Gateway 可以在 Linux 或其他地方運行。

常見設定：

- 在 Linux/VPS 上運行 Gateway，並在任何已登入 Messages 的 Mac 上運行 BlueBubbles 伺服器。
- 如果您想要最簡單的單機設定，請在 Mac 上運行所有程式。

文件：[BlueBubbles](/zh-Hant/channels/bluebubbles)、[節點](/zh-Hant/nodes)、
[Mac 遠端模式](/zh-Hant/platforms/mac/remote)。

### 如果我購買 Mac mini 來運行 OpenClaw，我可以將其連接到我的 MacBook Pro 嗎

可以。**Mac mini 可以運行 Gateway**，而您的 MacBook Pro 可以作為
**節點**（伴隨設備）連接。節點不運行 Gateway - 它們提供額外的
功能，例如該設備上的螢幕/相機/畫布和 `system.run`。

常見模式：

- Gateway 在 Mac mini 上（始終運行）。
- MacBook Pro 運行 macOS 應用程式或節點主機並與 Gateway 配對。
- 使用 `openclaw nodes status` / `openclaw nodes list` 來查看它。

文件：[Nodes](/zh-Hant/nodes)、[Nodes CLI](/zh-Hant/cli/nodes)。

### 我可以使用 Bun 嗎

**不建議**使用 Bun。我們發現執行時錯誤，特別是在 WhatsApp 和 Telegram 上。
請使用 **Node** 以獲得穩定的閘道。

如果您仍想嘗試 Bun，請在非生產閘道上進行，
且不要包含 WhatsApp/Telegram。

### Telegram allowFrom 中應填入什麼

`channels.telegram.allowFrom` 是**人類發送者的 Telegram 使用者 ID**（數字）。它不是機器人使用者名稱。

入門流程接受 `@username` 輸入並將其解析為數字 ID，但 OpenClaw 授權僅使用數字 ID。

較安全（無第三方機器人）：

- 傳送私訊 (DM) 給您的機器人，然後執行 `openclaw logs --follow` 並讀取 `from.id`。

官方 Bot API：

- 傳送私訊 (DM) 給您的機器人，然後呼叫 `https://api.telegram.org/bot<bot_token>/getUpdates` 並讀取 `message.from.id`。

第三方（隱私性較低）：

- 傳送私訊 (DM) 給 `@userinfobot` 或 `@getidsbot`。

請參閱 [/channels/telegram](/zh-Hant/channels/telegram#access-control-dms--groups)。

### 多人可以在不同的 OpenClaw 執行個體中使用同一個 WhatsApp 號碼嗎

可以，透過**多代理程式路由**。將每個發送者的 WhatsApp **私訊 (DM)**（對等節點 `kind: "direct"`，發送者 E.164 例如 `+15551234567`) 綁定到不同的 `agentId`，這樣每個人都能獲得自己的工作區和會話存放區。回覆仍然來自**同一個 WhatsApp 帳號**，且私訊存取控制 (`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`) 對每個 WhatsApp 帳號是全域的。請參閱 [多代理程式路由](/zh-Hant/concepts/multi-agent) 和 [WhatsApp](/zh-Hant/channels/whatsapp)。

### 我可以同時執行一個快速聊天代理程式和一個 Opus 編碼代理程式嗎

可以。使用多代理程式路由：為每個代理程式指定其預設模型，然後將輸入路由（提供者帳號或特定對等節點）綁定到每個代理程式。範例設定位於 [多代理程式路由](/zh-Hant/concepts/multi-agent) 中。另請參閱 [模型](/zh-Hant/concepts/models) 和 [設定](/zh-Hant/gateway/configuration)。

### Homebrew 在 Linux 上能用嗎

可以。Homebrew 支援 Linux (Linuxbrew)。快速設定：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
brew install <formula>
```

如果您透過 systemd 執行 OpenClaw，請確保服務的 PATH 包含 `/home/linuxbrew/.linuxbrew/bin` （或您的 brew 前綴），以便 `brew` 安裝的工具在非登入 shell 中能正確解析。
最近的版本也會在 Linux systemd 服務中預先加入常見的使用者 bin 目錄（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），並在設定時遵守 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

### 可修改的 git 安裝與 npm 安裝之間的差異

- **可修改 安裝：** 完整的原始碼檢出、可編輯，最適合貢獻者。
  您在本地執行建置並可以修改程式碼/文件。
- **npm install：** 全域 CLI 安裝，無 repo，最適合「直接執行」。
  更新來自 npm dist-tags。

文件：[入門指南](/zh-Hant/start/getting-started)、[更新](/zh-Hant/install/updating)。

### 我稍後可以在 npm 和 git 安裝之間切換嗎

可以。安裝另一個版本，然後執行 Doctor，以便閘道服務指向新的進入點。
這**不會刪除您的資料** —— 它僅變更 OpenClaw 程式碼的安裝。您的狀態
(`~/.openclaw`) 和工作區 (`~/.openclaw/workspace`) 保持不變。

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

備份提示：請參閱 [備份策略](/zh-Hant/help/faq#recommended-backup-strategy)。

### 我應該在筆記型電腦還是 VPS 上執行 Gateway

簡短回答：**如果您想要 24/7 的可靠性，請使用 VPS**。如果您想要
最低的阻力，且您可以接受睡眠/重新啟動，則在本地執行。

**筆記型電腦（本機 Gateway）**

- **優點：** 無伺服器成本，可直接存取本地檔案，即時瀏覽器視窗。
- **缺點：** 睡眠/網路斷線 = 連線中斷，作業系統更新/重新啟動會干擾，必須保持喚醒。

**VPS / 雲端**

- **優點：** 永遠在線、網路穩定、無筆記型電腦睡眠問題、更容易保持運作。
- **缺點：** 經常無頭運行（使用截圖），只能遠端存取檔案，您必須透過 SSH 進行更新。

**OpenClaw 特別說明：** WhatsApp/Telegram/Slack/Mattermost (plugin)/Discord 都可以在 VPS 上正常運作。唯一的真正取捨是 **無頭瀏覽器** 與可視視窗之間的選擇。請參閱 [瀏覽器](/zh-Hant/tools/browser)。

**建議預設值：** 如果您之前有 Gateway 連線中斷的問題，請使用 VPS。當您積極使用 Mac 並希望存取本機檔案或使用可視瀏覽器進行 UI 自動化時，本機執行非常棒。

### 在專用機器上執行 OpenClaw 有多重要

非必需，但為了 **可靠性和隔離性，建議使用**。

- **專用主機 (VPS/Mac mini/Pi)：** 永遠線上，較少的睡眠/重新啟動中斷，更乾淨的權限，更容易維持運作。
- **共用的筆記型電腦/桌上型電腦：** 非常適合測試和主動使用，但當電腦進入睡眠或更新時，預期會有暫停。

如果您想要兩全其美，請將 Gateway 保留在專用主機上，並將您的筆記型電腦配對為 **節點** 以進行本機螢幕/相機/執行工具。請參閱 [節點](/zh-Hant/nodes)。
若需安全性指導，請閱讀 [安全性](/zh-Hant/gateway/security)。

### VPS 的最低需求與建議的作業系統為何

OpenClaw 是輕量級的。對於基本的 Gateway + 一個聊天頻道：

- **絕對最低需求：** 1 vCPU，1GB RAM，約 500MB 磁碟空間。
- **建議規格：** 1-2 vCPU，2GB RAM 或更多，以保留緩衝空間（日誌、媒體、多重頻道）。節點工具和瀏覽器自動化可能會耗費大量資源。

作業系統：請使用 **Ubuntu LTS**（或任何現代的 Debian/Ubuntu）。Linux 安裝路徑在那裡經過最充分的測試。

文件：[Linux](/zh-Hant/platforms/linux)、[VPS hosting](/zh-Hant/vps)。

### 我可以在 VM 中執行 OpenClaw 嗎？需求是什麼

可以。將 VM 視為與 VPS 相同：它需要永遠線上、可連線，並且有足夠的 RAM 供 Gateway 和您啟用的任何頻道使用。

基本指導原則：

- **絕對最低需求：** 1 vCPU，1GB RAM。
- **建議規格：** 如果您執行多重頻道、瀏覽器自動化或媒體工具，建議使用 2GB RAM 或更多。
- **作業系統：** Ubuntu LTS 或其他現代的 Debian/Ubuntu。

如果您使用的是 Windows，**WSL2 是最簡單的 VM 樣式設定**，並且具有最佳的工具
相容性。請參閱 [Windows](/zh-Hant/platforms/windows)、[VPS hosting](/zh-Hant/vps)。
如果您在 VM 中執行 macOS，請參閱 [macOS VM](/zh-Hant/install/macos-vm)。

## 什麼是 OpenClaw？

### 用一段話介紹 OpenClaw

OpenClaw 是一個您在自己的設備上運行的個人 AI 助手。它在您已經使用的訊息介面上回覆 (WhatsApp, Telegram, Slack, Mattermost (plugin), Discord, Google Chat, Signal, iMessage, WebChat)，並且可以在支援的平台上進行語音互動和即時 Canvas。**Gateway** 是始終運行的控制平面；助手是產品。

### 價值主張

OpenClaw 不僅僅是一個「Claude 包裝器」。它是一個**本地優先的控制平面**，讓您在**您自己的硬體上**運行一個
功能強大的助手，可以從您已經使用的聊天應用程式中存取，具備
有狀態的會話、記憶和工具功能——而無需將您的工作流程控制權交給
託管的 SaaS。

亮點：

- **您的設備，您的資料：** 在您想要的任何地方 (Mac, Linux, VPS) 運行 Gateway，並將
  工作區 + 會話記錄保留在本地。
- **真實的頻道，而非網頁沙盒：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/等，
  加上支援平台上的行動語音和 Canvas。
- **模型中立：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，具備每個代理的路由
  和故障轉移功能。
- **僅本地選項：** 運行本地模型，因此如果您願意，**所有資料都可以保留在您的設備上**。
- **多代理路由：** 為每個頻道、帳戶或任務分開代理，每個都有自己的
  工作區和預設值。
- **開源且可修改：** 檢查、擴展和自我託管，而無供應商鎖定。

文件：[Gateway](/zh-Hant/gateway)、[Channels](/zh-Hant/channels)、[Multi-agent](/zh-Hant/concepts/multi-agent)、
[Memory](/zh-Hant/concepts/memory)。

### 我剛設定好，首先應該做什麼

適合初學者的專案：

- 建立一個網站 (WordPress、Shopify 或簡單的靜態網站)。
- 製作行動應用程式原型 (大綱、畫面、API 計劃)。
- 整理檔案和資料夾 (清理、命名、標記)。
- 連接 Gmail 並自動化摘要或後續追蹤。

它可以處理大型任務，但當您將其分為幾個階段並
使用子代理進行並行工作時，效果最好。

### OpenClaw 的前五大日常使用案例有哪些

日常獲勝通常看起來像這樣：

- **個人簡報：** 您關注的收件匣、行事曆和新聞摘要。
- **研究與草擬：** 快速研究、摘要以及電子郵件或文件的初稿。
- **提醒與跟進：** 由 cron 或 heartbeat 驅動的提示與檢查清單。
- **瀏覽器自動化：** 填寫表單、收集數據以及重複的網頁任務。
- **跨裝置協調：** 從手機發送任務，讓 Gateway 在伺服器上執行，並在聊天中取回結果。

### OpenClaw 能否協助 SaaS 的潛在客戶開發、外聯、廣告和部落格

是的，適用於**研究、資格審查與草擬**。它可以掃描網站、建立候選清單、摘要潛在客戶，並撰寫外聯或廣告文案草稿。

對於**外聯或廣告活動**，請保持人類在迴路中。避免垃圾郵件，遵守當地法律和平台政策，並在發送前審查所有內容。最安全的模式是讓 OpenClaw 草擬，由您來批准。

文件：[安全性](/zh-Hant/gateway/security)。

### 相比於網頁開發的 Claude Code，有哪些優勢

OpenClaw 是一個**個人助理**和協調層，而非 IDE 的替代品。請使用 Claude Code 或 Codex 以在 repo 內獲得最快的直接編碼迴路。當您需要持久記憶、跨裝置存取和工具協調時，請使用 OpenClaw。

優勢：

- **跨會話的持久記憶 + 工作區**
- **多平台存取**（WhatsApp、Telegram、TUI、WebChat）
- **工具協調**（瀏覽器、檔案、排程、hooks）
- **永遠在線的 Gateway**（在 VPS 上執行，從任何地方互動）
- **節點**用於本機瀏覽器/螢幕/相機/exec

展示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

## 技能與自動化

### 如何自訂技能而不讓 repo 保持髒亂狀態

使用受管覆寫代替編輯 repo 副本。將您的變更放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或透過 `skills.load.extraDirs` 在 `~/.openclaw/openclaw.json` 中新增資料夾）。優先順序是 `<workspace>/skills` > `~/.openclaw/skills` > bundled，因此受管覆寫會獲勝而不需要動到 git。只有值得上游的編輯應留在 repo 中並作為 PR 發出。

### 我可以從自訂資料夾載入技能嗎

是的。透過 `~/.openclaw/openclaw.json`（優先級最低）中的 `skills.load.extraDirs` 新增額外的目錄。預設優先級保持為：`<workspace>/skills` → `~/.openclaw/skills` → 內建（bundled）→ `skills.load.extraDirs`。`clawhub` 預設安裝到 `./skills`，OpenClaw 將其視為 `<workspace>/skills`。

### 如何針對不同任務使用不同的模型

目前支援的模式有：

- **Cron 任務**：獨立的任務可以設定每個工作的 `model` 覆寫。
- **子代理**：將任務路由到具有不同預設模型的獨立代理。
- **按需切換**：隨時使用 `/model` 切換目前的工作階段模型。

請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent) 和 [Slash commands](/zh-Hant/tools/slash-commands)。

### 機器人在執行繁重工作時會凍結，如何卸載該工作

對於長時間或並行任務，請使用 **子代理**。子代理在自己的工作階段中運行，
傳回摘要，並讓您的主要聊天保持響應。

請您的機器人「為此任務生成一個子代理」或使用 `/subagents`。
在聊天中使用 `/status` 查看 Gateway 目前正在做什麼（以及是否忙碌）。

Token 提示：長時間任務和子代理都會消耗 token。如果關心成本，可以透過 `agents.defaults.subagents.model` 為子代理設定更便宜的模型。

文件：[Sub-agents](/zh-Hant/tools/subagents)。

### Discord 上綁定執行緒的子代理工作階段如何運作

使用執行緒綁定。您可以將 Discord 執行緒綁定到子代理或工作階段目標，以便該執行緒中的後續訊息保持在該綁定的工作階段上。

基本流程：

- 使用 `thread: true` 透過 `sessions_spawn` 生成（並選擇性地使用 `mode: "session"` 進行持續的後續追蹤）。
- 或使用 `/focus <target>` 手動綁定。
- 使用 `/agents` 檢查綁定狀態。
- 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自動取消聚焦。
- 使用 `/unfocus` 分離執行緒。

所需配置：

- 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
- Discord 覆蓋值：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
- 生成時自動綁定：設定 `channels.discord.threadBindings.spawnSubagentSessions: true`。

文件：[Sub-agents](/zh-Hant/tools/subagents)、[Discord](/zh-Hant/channels/discord)、[Configuration Reference](/zh-Hant/gateway/configuration-reference)、[Slash commands](/zh-Hant/tools/slash-commands)。

### Cron 或提醒事項未觸發，我應該檢查什麼

Cron 在 Gateway 程序內執行。如果 Gateway 未持續執行，
排定的工作將不會執行。

檢查清單：

- 確認已啟用 cron (`cron.enabled`) 且未設定 `OPENCLAW_SKIP_CRON`。
- 檢查 Gateway 是否 24/7 執行中（無睡眠/重啟）。
- 驗證工作的時區設定 (`--tz` vs 主機時區)。

除錯：

```bash
openclaw cron run <jobId> --force
openclaw cron runs --id <jobId> --limit 50
```

文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Cron vs Heartbeat](/zh-Hant/automation/cron-vs-heartbeat)。

### 我要如何在 Linux 上安裝技能

使用 **ClawHub** (CLI) 或將技能放入您的工作區。macOS 的 Skills UI 在 Linux 上無法使用。
瀏覽技能請至 [https://clawhub.com](https://clawhub.com)。

安裝 ClawHub CLI（選擇其中一個套件管理員）：

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

### OpenClaw 可以排程執行任務或在背景持續執行嗎

可以。使用 Gateway 排程器：

- 針對排程或週期性任務使用 **Cron jobs**（重啟後持續存在）。
- 針對「主工作階段」的定期檢查使用 **Heartbeat**。
- 針對發布摘要或傳送至聊天的自主代理程式使用 **Isolated jobs**。

文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Cron vs Heartbeat](/zh-Hant/automation/cron-vs-heartbeat)、
[Heartbeat](/zh-Hant/gateway/heartbeat)。

### 我可以從 Linux 執行僅限 Apple macOS 的技能嗎？

不能直接執行。macOS 技能受 `metadata.openclaw.os` 及所需的二進位檔限制，且技能僅在 **Gateway 主機** 上符合資格時才會出現在系統提示中。在 Linux 上，除非您覆寫閘道限制，否則僅限 `darwin` 的技能（如 `apple-notes`、`apple-reminders`、`things-mac`）將不會載入。

您有三種支援的模式：

**選項 A - 在 Mac 上執行 Gateway（最簡單）。**
在 macOS 二進位檔案存在的地方執行 Gateway，然後從 Linux 以[遠端模式](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere)或透過 Tailscale 進行連線。由於 Gateway 主機是 macOS，因此技能可以正常載入。

**選項 B - 使用 macOS 節點（無 SSH）。**
在 Linux 上執行 Gateway，配對一個 macOS 節點（選單列應用程式），並在 Mac 上將 **Node Run Commands** 設定為「Always Ask」或「Always Allow」。當節點上存在所需的二進位檔案時，OpenClaw 可以將僅限 macOS 的技能視為符合資格。代理程式會透過 `nodes` 工具執行這些技能。如果您選擇「Always Ask」，在提示中批准「Always Allow」會將該指令加入允許清單。

**選項 C - 透過 SSH 代理 macOS 二進位檔案（進階）。**
將 Gateway 保留在 Linux 上，但讓所需的 CLI 二進位檔案解析為在 Mac 上執行的 SSH 包裝程式。然後覆寫技能以允許 Linux，使其保持符合資格狀態。

1. 為二進位檔案建立 SSH 包裝程式（例如：Apple Notes 的 `memo`）：

   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
   ```

2. 將包裝程式放置於 Linux 主機的 `PATH` 上（例如 `~/bin/memo`）。
3. 覆寫技能中繼資料（工作區或 `~/.openclaw/skills`）以允許 Linux：

   ```markdown
   ---
   name: apple-notes
   description: Manage Apple Notes via the memo CLI on macOS.
   metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
   ---
   ```

4. 啟動新的工作階段，以便重新整理技能快照。

### 您是否有 Notion 或 HeyGen 整合

目前尚未內建。

選項：

- **自訂技能 / 外掛：** 最適合用於可靠的 API 存取（Notion/HeyGen 都有提供 API）。
- **瀏覽器自動化：** 無需編寫程式碼即可運作，但速度較慢且較不穩定。

如果您希望為每個客戶保留情境（代理商工作流程），一個簡單的模式是：

- 每個客戶一個 Notion 頁面（情境 + 偏好設定 + 進行中的工作）。
- 請代理程式在工作階段開始時擷取該頁面。

如果您想要原生的整合功能，請開啟功能請求或建構一個針對這些 API 的技能。

安裝技能：

```bash
clawhub install <skill-slug>
clawhub update --all
```

ClawHub 會安裝到目前目錄下的 `./skills` 中（或者回退到您設定的 OpenClaw 工作區）；OpenClaw 在下一次工作階段會將其視為 `<workspace>/skills`。若要跨代理程式共享技能，請將它們放在 `~/.openclaw/skills/<name>/SKILL.md` 中。某些技能預期透過 Homebrew 安裝的二進位檔案；在 Linux 上這代表 Linuxbrew（請參閱上方的 Homebrew Linux FAQ 條目）。請參閱 [技能](/zh-Hant/tools/skills) 和 [ClawHub](/zh-Hant/tools/clawhub)。

### 如何使用我現有的已登入 Chrome 與 OpenClaw

使用內建的 `user` 瀏覽器設定檔，它透過 Chrome DevTools MCP 連結：

```bash
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot
```

如果您想要自訂名稱，請建立一個明確的 MCP 設定檔：

```bash
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser --browser-profile chrome-live tabs
```

此路徑是主機本機的。如果 Gateway 在其他地方執行，請在瀏覽器機器上執行節點主機，或者改用遠端 CDP。

## 沙箱與記憶體

### 是否有專門的沙箱文件

有的。請參閱 [沙箱](/zh-Hant/gateway/sandboxing)。針對 Docker 特定的設定（Docker 中的完整 Gateway 或沙箱映像檔），請參閱 [Docker](/zh-Hant/install/docker)。

### Docker 感覺受限。如何啟用完整功能

預設映像檔以安全為先，並以 `node` 使用者身分執行，因此它不包含
系統套件、Homebrew 或內建的瀏覽器。若要進行更完整的設定：

- 使用 `OPENCLAW_HOME_VOLUME` 持續保存 `/home/node`，以便快取能夠留存。
- 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 將系統相依項目建置到映像檔中。
- 透過內建的 CLI 安裝 Playwright 瀏覽器：
  `node /app/node_modules/playwright-core/cli.js install chromium`
- 設定 `PLAYWRIGHT_BROWSERS_PATH` 並確保該路徑已被持續保存。

文件：[Docker](/zh-Hant/install/docker)、[瀏覽器](/zh-Hant/tools/browser)。

**我可以讓私訊保持個人化，但讓群組公開並以一個代理程式進行沙箱化嗎**

可以——如果您的私人流量是 **私訊 (DMs)** 而您的公開流量是 **群組**。

使用 `agents.defaults.sandbox.mode: "non-main"`，讓群組/頻道工作階段（非主要金鑰）在 Docker 中執行，而主要的私訊工作階段則保留在主機上。然後透過 `tools.sandbox.tools` 限制沙箱工作階段中可用的工具。

設定逐步解說 + 範例設定：[群組：個人私訊 + 公開群組](/zh-Hant/channels/groups#pattern-personal-dms-public-groups-single-agent)

關鍵配置參考：[Gateway configuration](/zh-Hant/gateway/configuration#agentsdefaultssandbox)

### 如何將主機資料夾綁定至沙盒

將 `agents.defaults.sandbox.docker.binds` 設定為 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全域與每個代理程式的綁定會合併；當 `scope: "shared"` 時，會忽略每個代理程式的綁定。對於任何敏感內容請使用 `:ro`，並請記住綁定會繞過沙盒檔案系統的防護。範例與安全注意事項請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing#custom-bind-mounts) 和 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。

### 記憶體如何運作

OpenClaw 記憶體只是代理程式工作區中的 Markdown 檔案：

- `memory/YYYY-MM-DD.md` 中的每日筆記
- `MEMORY.md` 中的經策劃長期筆記（僅限主要/私人工作階段）

OpenClaw 也會執行 **靜默預壓縮記憶體排清**，以提醒模型在自動壓縮之前寫入持久性筆記。這僅在工作區可寫入時執行（唯讀沙盒會跳過此步驟）。參閱 [Memory](/zh-Hant/concepts/memory)。

### 記憶體一直忘記事情，我該如何讓它記住

請要求機器人 **將事實寫入記憶體**。長期筆記應放在 `MEMORY.md`，短期情境則放入 `memory/YYYY-MM-DD.md`。

這仍是我們正在改進的領域。提醒模型儲存記憶體會有幫助；它會知道該怎麼做。如果它持續忘記，請驗證 Gateway 在每次執行時是否都使用相同的工作區。

文件：[Memory](/zh-Hant/concepts/memory)、[Agent workspace](/zh-Hant/concepts/agent-workspace)。

### 語意記憶體搜尋是否需要 OpenAI API 金鑰

只有當您使用 **OpenAI embeddings** 時才需要。Codex OAuth 涵蓋聊天/完成，並且**不**授予 embeddings 存取權限，因此**使用 Codex 登入（OAuth 或 Codex CLI 登入）**對語意記憶體搜尋沒有幫助。OpenAI embeddings 仍然需要真正的 API 金鑰（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

如果您沒有明確設定提供者，OpenClaw 會在可以解析 API 金鑰（auth profiles、`models.providers.*.apiKey` 或環境變數）時自動選擇一個提供者。如果解析到 OpenAI 金鑰，它會優先使用 OpenAI，其次是解析到 Gemini 金鑰時使用 Gemini，然後是 Voyage 和 Mistral。如果沒有可用的遠端金鑰，記憶體搜尋將保持停用狀態，直到您進行設定。如果您已設定並存在本機模型路徑，OpenClaw 會優先使用 `local`。當您明確設定 `memorySearch.provider = "ollama"` 時，則支援 Ollama。

如果您更傾向於保持本地使用，請設定 `memorySearch.provider = "local"`（並選擇性地設定 `memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，請設定 `memorySearch.provider = "gemini"` 並提供 `GEMINI_API_KEY`（或 `memorySearch.remote.apiKey`）。我們支援 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本地**嵌入模型——詳見 [Memory](/zh-Hant/concepts/memory) 了解設定細節。

### 記憶體會永久保存嗎 有什麼限制

記憶體檔案儲存在磁碟上，並會持續保存直到您刪除它們。限制在於您的儲存空間，而不是模型。**對話上下文** 仍然受到模型上下文視窗的限制，因此長時間的對話可能會被壓縮或截斷。這就是記憶體搜尋存在的原因——它只將相關的部分提取回上下文中。

文件：[Memory](/zh-Hant/concepts/memory)、[Context](/zh-Hant/concepts/context)。

## 資料在磁碟上的儲存位置

### 所有使用 OpenClaw 的資料都會儲存在本地嗎

不——**OpenClaw 的狀態是本地的**，但 **外部服務仍然可以看到您發送給它們的內容**。

- **預設為本地：** sessions、記憶體檔案、config 和 workspace 位於 Gateway 主機上
  (`~/.openclaw` + 您的 workspace 目錄)。
- **必要為遠端：** 您發送給模型提供者（Anthropic/OpenAI 等）的訊息會發送到它們的 API，而聊天平台（WhatsApp/Telegram/Slack 等）會在其伺服器上儲存訊息資料。
- **您可以控制足跡：** 使用本機模型可以將提示保留在您的機器上，但頻道流量仍然會通過該頻道的伺服器。

相關：[Agent workspace](/zh-Hant/concepts/agent-workspace)、[Memory](/zh-Hant/concepts/memory)。

### OpenClaw 將其資料儲存在哪裡

所有內容都位於 `$OPENCLAW_STATE_DIR` 下（預設值：`~/.openclaw`）：

| 路徑                                                            | 用途                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主要配置 (JSON5)                                                |
| `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 舊版 OAuth 匯入（首次使用時會複製到驗證設定檔中）       |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 驗證設定檔 (OAuth、API 金鑰，以及可選的 `keyRef`/`tokenRef`)  |
| `$OPENCLAW_STATE_DIR/secrets.json`                              | `file` SecretRef 提供者的可選檔案支援秘密載荷 |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 舊版相容性檔案（已清除靜態 `api_key` 項目）      |
| `$OPENCLAW_STATE_DIR/credentials/`                              | 提供者狀態 (例如 `whatsapp/<accountId>/creds.json`)            |
| `$OPENCLAW_STATE_DIR/agents/`                                   | 個別代理程式狀態 (agentDir + sessions)                              |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 對話記錄與狀態（每個代理程式）                           |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 階段作業元資料（每個代理程式）                                       |

舊版單一代理程式路徑：`~/.openclaw/agent/*` (由 `openclaw doctor` 遷移)。

您的 **工作區** (AGENTS.md、記憶檔案、技能等) 是分開的，並透過 `agents.defaults.workspace` 進行設定（預設值：`~/.openclaw/workspace`）。

### AGENTSmd SOULmd USERmd MEMORYmd 應該放在哪裡

這些檔案位於 **代理程式工作區** 中，而不是 `~/.openclaw`。

- **工作區（每個代理程式）**：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
  `MEMORY.md` (當 `MEMORY.md` 不存在時的舊版後援 `memory.md`)、
  `memory/YYYY-MM-DD.md`、可選的 `HEARTBEAT.md`。
- **狀態目錄 (`~/.openclaw`)**：配置、憑證、驗證設定檔、階段作業、記錄檔，
  以及共享技能 (`~/.openclaw/skills`)。

預設工作區為 `~/.openclaw/workspace`，可透過以下方式設定：

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

如果機器人在重新啟動後「忘記」了內容，請確認 Gateway 在每次啟動時都使用相同的
工作區（並請記住：遠端模式使用的是 **gateway 主機的**
工作區，而不是您本地的筆記型電腦）。

提示：如果您想要持久的行為或偏好設定，請要求機器人**將其寫入 AGENTS.md 或 MEMORY.md**，而不是依賴聊天記錄。

請參閱 [Agent workspace](/zh-Hant/concepts/agent-workspace) 和 [Memory](/zh-Hant/concepts/memory)。

### 建議的備份策略

將您的 **agent workspace** 放在 **私有** 的 git repo 中，並將其備份到某個私有位置（例如 GitHub private）。這會捕捉記憶體 + AGENTS/SOUL/USER 檔案，並讓您稍後可以還原助理的「思維」。

**請勿** 提交 `~/.openclaw` 下的任何內容（憑證、工作階段、權杖或加密的機密酬載）。如果您需要完整還原，請分別備份 workspace 和 state 目錄（請參閱上述的遷移問題）。

文件：[Agent workspace](/zh-Hant/concepts/agent-workspace)。

### 如何完全解除安裝 OpenClaw

請參閱專屬指南：[Uninstall](/zh-Hant/install/uninstall)。

### 代理程式可以在 workspace 之外運作嗎

可以。Workspace 是 **預設的 cwd** 和記憶體錨點，而非嚴格的沙箱。相對路徑在 workspace 內解析，但絕對路徑可以存取其他主機位置，除非啟用了沙箱功能。如果您需要隔離，請使用 [`agents.defaults.sandbox`](/zh-Hant/gateway/sandboxing) 或每個代理程式的沙箱設定。如果您希望某個 repo 成為預設的工作目錄，請將該代理程式的 `workspace` 指向 repo 根目錄。OpenClaw repo 只是原始碼；請保持 workspace 分開，除非您有意讓代理程式在其中運作。

範例（repo 作為預設 cwd）：

```json5
{
  agents: {
    defaults: {
      workspace: "~/Projects/my-repo",
    },
  },
}
```

### 我在遠端模式下，session store 在哪裡

Session 狀態是由 **gateway host** 擁有的。如果您處於遠端模式，您關心的 session store 位於遠端機器上，而非您的本地筆記型電腦。請參閱 [Session management](/zh-Hant/concepts/session)。

## 設定基礎

### 設定檔是什麼格式 它在哪裡

OpenClaw 會從 `$OPENCLAW_CONFIG_PATH` 讀取選用的 **JSON5** 設定檔（預設值：`~/.openclaw/openclaw.json`）：

```
$OPENCLAW_CONFIG_PATH
```

如果檔案不存在，它會使用安全-ish 的預設值（包括預設 workspace 為 `~/.openclaw/workspace`）。

### 我設定了 gatewaybind lan 或 tailnet，但現在沒有監聽任何東西，UI 顯示未經授權

非回環綁定**需要認證**。請設定 `gateway.auth.mode` + `gateway.auth.token` (或使用 `OPENCLAW_GATEWAY_TOKEN`)。

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

- `gateway.remote.token` / `.password` 本身**不會**啟用本機 Gateway 認證。
- 只有在 `gateway.auth.*` 未設定時，本機呼叫路徑才能使用 `gateway.remote.*` 作為後備。
- 如果透過 SecretRef 明確設定 `gateway.auth.token` / `gateway.auth.password` 且未解析，解析將會失敗關閉 (不會進行遠端後備遮罩)。
- 控制 UI 透過 `connect.params.auth.token` 進行驗證 (儲存在應用程式/UI 設定中)。請避免將權杖放在 URL 中。

### 為什麼現在本機連線需要權杖

OpenClaw 預設強制執行權杖驗證，包括回環。如果未設定權杖，Gateway 啟動時會自動產生一個並儲存至 `gateway.auth.token`，因此 **本機 WS 用戶端必須經過驗證**。這可阻擋其他本機程序呼叫 Gateway。

如果您**真的**想要開放回環，請在設定中明確設定 `gateway.auth.mode: "none"`。Doctor 可以隨時為您產生權杖：`openclaw doctor --generate-gateway-token`。

### 變更設定後是否需要重新啟動

Gateway 會監看設定並支援熱重載：

- `gateway.reload.mode: "hybrid"` (預設)：熱套用安全變更，關鍵變更則重新啟動
- 也支援 `hot`、`restart`、`off`

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

- `off`：隱藏標語文字，但保留標題標題/版本行。
- `default`：每次都使用 `All your chats, one OpenClaw.`。
- `random`：輪替顯示有趣/季節性標語 (預設行為)。
- 如果您完全不想要標題，請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

### 如何啟用網路搜尋和網路擷取

`web_fetch` 不需要 API 金鑰。`web_search` 需要為您選擇的供應商（Brave、Gemini、Grok、Kimi 或 Perplexity）提供金鑰。
**建議：** 執行 `openclaw configure --section web` 並選擇一個供應商。
環境變數替代方案：

- Brave: `BRAVE_API_KEY`
- Gemini: `GEMINI_API_KEY`
- Grok: `XAI_API_KEY`
- Kimi: `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
- Perplexity: `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`

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

特定供應商的網頁搜尋組態現在位於 `plugins.entries.<plugin>.config.webSearch.*` 下。
舊版的 `tools.web.search.*` 供應商路徑為了相容性仍會暫時載入，但不應在新的組態中使用。

備註：

- 如果您使用許可清單，請新增 `web_search`/`web_fetch` 或 `group:web`。
- `web_fetch` 預設為啟用（除非明確停用）。
- 守護程式會從 `~/.openclaw/.env`（或服務環境）讀取環境變數。

文件：[Web tools](/zh-Hant/tools/web)。

### 如何跨設備使用專用 Worker 執行中央 Gateway

常見模式是 **一個 Gateway**（例如 Raspberry Pi）加上 **節點** 和 **代理程式**：

- **Gateway (中央)：** 擁有通道（Signal/WhatsApp）、路由和工作階段。
- **節點 (設備)：** Mac/iOS/Android 作為外設連接並公開本機工具（`system.run`、`canvas`、`camera`）。
- **代理程式 (workers)：** 用於特殊角色的獨立大腦/工作區（例如「Hetzner ops」、「個人資料」）。
- **子代理程式：** 當您需要並行處理時，從主代理程式產生背景工作。
- **TUI：** 連接到 Gateway 並切換代理程式/工作階段。

文件：[Nodes](/zh-Hant/nodes)、[Remote access](/zh-Hant/gateway/remote)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent)、[Sub-agents](/zh-Hant/tools/subagents)、[TUI](/zh-Hant/web/tui)。

### OpenClaw 瀏覽器可以無頭模式 執行嗎

可以。這是一個組態選項：

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

預設為 `false` (有介面)。無頭模式在某些網站上更容易觸發反機器人檢查。請參閱 [瀏覽器](/zh-Hant/tools/browser)。

無頭模式使用**相同的 Chromium 引擎**，適用於大多數自動化操作（表單、點擊、爬取、登入）。主要差異如下：

- 沒有可見的瀏覽器視窗（如果您需要視覺效果，請使用截圖）。
- 某些網站對無頭模式下的自動化更嚴格（驗證碼、反機器人）。
  例如，X/Twitter 經常封鎖無頭會話。

### 如何使用 Brave 進行瀏覽器控制

將 `browser.executablePath` 設定為您的 Brave 執行檔（或任何基於 Chromium 的瀏覽器）並重新啟動 Gateway。
請參閱 [瀏覽器](/zh-Hant/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置範例。

## 遠端 Gateway 和節點

### 指令如何在 Telegram、Gateway 和節點之間傳播

Telegram 訊息由 **gateway** 處理。Gateway 運行代理程式，
只有在需要節點工具時才透過 **Gateway WebSocket** 呼叫節點：

Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

節點看不到傳入的提供者流量；它們只接收節點 RPC 呼叫。

### 如果 Gateway 託管在遠端，我的代理程式如何存取我的電腦

簡短回答：**將您的電腦配對為節點**。Gateway 在其他地方運行，但它可以
透過 Gateway WebSocket 呼叫您本機上的 `node.*` 工具（螢幕、相機、系統）。

典型設定：

1. 在永遠在線的主機（VPS/家庭伺服器）上運行 Gateway。
2. 將 Gateway 主機 + 您的電腦放在同一個 tailnet 上。
3. 確保 Gateway WS 可達（tailnet 綁定或 SSH 隧道）。
4. 在本地打開 macOS 應用程式並以 **Remote over SSH** 模式（或直接透過 tailnet）連接，
   以便它可以註冊為節點。
5. 在 Gateway 上批准節點：

   ```bash
   openclaw devices list
   openclaw devices approve <requestId>
   ```

不需要單獨的 TCP 橋接器；節點透過 Gateway WebSocket 連接。

安全提醒：配對 macOS 節點允許在該機器上進行 `system.run`。僅
配對您信任的設備，並檢閱 [安全性](/zh-Hant/gateway/security)。

文件：[節點](/zh-Hant/nodes)、[Gateway 協定](/zh-Hant/gateway/protocol)、[macOS 遠端模式](/zh-Hant/platforms/mac/remote)、[安全性](/zh-Hant/gateway/security)。

### Tailscale 已連線但我沒收到回覆 現在該怎麼辦

檢查基本項目：

- Gateway 正在運行：`openclaw gateway status`
- Gateway 健康狀態：`openclaw status`
- 通道健康狀態：`openclaw channels status`

然後驗證身份驗證和路由：

- 如果您使用 Tailscale Serve，請確保 `gateway.auth.allowTailscale` 設定正確。
- 如果您透過 SSH 隧道連線，請確認本機隧道已啟動並指向正確的連接埠。
- 確認您的允許清單（DM 或群組）包含您的帳戶。

文件：[Tailscale](/zh-Hant/gateway/tailscale)、[遠端存取](/zh-Hant/gateway/remote)、[通道](/zh-Hant/channels)。

### 兩個 OpenClaw 執行個體可以互相通訊嗎 本機 VPS

可以。沒有內建的「bot 對 bot」橋接器，但您可以透過幾種可靠的方式進行連接：

**最簡單的方法：** 使用兩個 bot 都可以存取的一般聊天頻道（Telegram/Slack/WhatsApp）。
讓 Bot A 傳送訊息給 Bot B，然後讓 Bot B 像平常一樣回覆。

**CLI 橋接器（通用）：** 執行一個腳本，使用 `openclaw agent --message ... --deliver` 呼叫另一個 Gateway，
目標是另一個 bot 監聽的聊天室。如果其中一個 bot 在遠端 VPS 上，請透過 SSH/Tailscale 將您的 CLI 指向該遠端 Gateway（請參閱 [遠端存取](/zh-Hant/gateway/remote)）。

範例模式（從可連線到目標 Gateway 的機器執行）：

```bash
openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
```

提示：加入防護措施，以免兩個 bot 無限循環（僅限提及、頻道允許清單，或「不要回覆 bot 訊息」規則）。

文件：[遠端存取](/zh-Hant/gateway/remote)、[Agent CLI](/zh-Hant/cli/agent)、[Agent send](/zh-Hant/tools/agent-send)。

### 多個 Agent 需要分開的 VPS 嗎

不需要。一個 Gateway 可以託管多個 Agent，每個都有自己的工作區、模型預設值
和路由。這是標準設定，比每個 Agent 執行一個 VPS 便宜且簡單得多。

只有在您需要強烈隔離（安全邊界）或您不想分享的差異很大的
設定時，才使用分開的 VPS。否則，請保留一個 Gateway 並使用多個 Agent 或子 Agent。

### 在我的個人筆記電腦上使用節點，而不是從 VPS 進行 SSH，有什麼好處嗎

是的 - 節點是從遠端閘道連接到您的筆記型電腦的首選方式，而且它們不僅提供 Shell 存取權限。閘道運行於 macOS/Linux（Windows 透過 WSL2）並且輕量化（小型 VPS 或樹莓派等級的設備即可；4 GB RAM 綽綽有餘），因此常見的設定是一台常時運行的主機加上您的筆記型電腦作為節點。

- **不需要入站 SSH。** 節點會向外連接到閘道的 WebSocket 並使用裝置配對。
- **更安全的執行控制。** `system.run` 受該筆記型電腦上的節點允許清單/批准所限制。
- **更多裝置工具。** 除了 `system.run` 之外，節點還公開 `canvas`、`camera` 和 `screen`。
- **本機瀏覽器自動化。** 將閘道保留在 VPS 上，但透過筆記型電腦上的節點主機在本地運行 Chrome，或透過 Chrome MCP 附加到主機上的本機 Chrome。

SSH 適合臨時的 Shell 存取，但對於持續的代理工作流程和裝置自動化，節點更簡單。

文件：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)、[瀏覽器](/zh-Hant/tools/browser)。

### 我應該安裝在第二台筆記型電腦上，還是只需新增一個節點

如果您只需要第二台筆記型電腦上的 **本機工具** (screen/camera/exec)，請將其新增為 **節點**。這樣可以保持單一閘道並避免重複的設定。本機節點工具目前僅支援 macOS，但我們計劃將其擴展到其他作業系統。

只有在需要 **嚴格隔離** 或兩個完全獨立的機器人時，才安裝第二個閘道。

文件：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)、[多個閘道](/zh-Hant/gateway/multiple-gateways)。

### 節點是否運行閘道服務

不。除非您故意執行獨立的設定檔（請參閱 [多個閘道](/zh-Hant/gateway/multiple-gateways)），否則每台主機應該只運行 **一個閘道**。節點是連接到閘道的周邊設備（iOS/Android 節點，或功能表列應用程式中的 macOS「節點模式」）。對於無介面的節點主機和 CLI 控制，請參閱 [節點主機 CLI](/zh-Hant/cli/node)。

`gateway`、`discovery` 和 `canvasHost` 的變更需要完全重新啟動。

### 是否有 API RPC 方式可以套用設定

是的。`config.apply` 會驗證並寫入完整配置，並在操作過程中重新啟動 Gateway。

### configapply 清空了我的配置 如何復原並避免此情況

`config.apply` 會**替換整個配置**。如果您發送部分物件，其他所有內容都會被移除。

復原：

- 從備份恢復（git 或複製的 `~/.openclaw/openclaw.json`）。
- 如果您沒有備份，請重新執行 `openclaw doctor` 並重新配置通道/模型。
- 如果這是意外發生的，請提交錯誤報告並附上您最後已知的配置或任何備份。
- 本機編碼代理通常可以從日誌或歷史記錄中重建可用的配置。

避免方法：

- 使用 `openclaw config set` 進行小幅變更。
- 使用 `openclaw configure` 進行互動式編輯。

文件：[配置](/zh-Hant/cli/config)、[Configure](/zh-Hant/cli/configure)、[Doctor](/zh-Hant/gateway/doctor)。

### 首次安裝的最低合理配置

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

這會設定您的工作區並限制誰可以觸發機器人。

### 如何 在 VPS 上設定 Tailscale 並從 Mac 連接

最基本步驟：

1. **在 VPS 上安裝並登入**

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```

2. **在您的 Mac 上安裝並登入**
   - 使用 Tailscale 應用程式並登入同一個 tailnet。
3. **啟用 MagicDNS（建議）**
   - 在 Tailscale 管理控制台中啟用 MagicDNS，讓 VPS 擁有穩定的名稱。
4. **使用 tailnet 主機名稱**
   - SSH：`ssh user@your-vps.tailnet-xxxx.ts.net`
   - Gateway WS：`ws://your-vps.tailnet-xxxx.ts.net:18789`

如果您想要不透過 SSH 使用 Control UI，請在 VPS 上使用 Tailscale Serve：

```bash
openclaw gateway --tailscale serve
```

這會將 gateway 綁定到 loopback 並透過 Tailscale 公開 HTTPS。參見 [Tailscale](/zh-Hant/gateway/tailscale)。

### 如何將 Mac 節點連接到遠端 Gateway Tailscale Serve

Serve 會公開 **Gateway Control UI + WS**。節點透過同一個 Gateway WS 端點進行連接。

建議設定：

1. **確保 VPS 和 Mac 位於同一個 tailnet 上**。
2. **在 macOS 應用程式中使用遠端模式**（SSH 目標可以是 tailnet 主機名稱）。
   應用程式會將 Gateway 連接埠建立隧道並以節點身份連接。
3. **在 gateway 上核准節點**：

   ```bash
   openclaw devices list
   openclaw devices approve <requestId>
   ```

文件：[Gateway protocol](/zh-Hant/gateway/protocol)、[Discovery](/zh-Hant/gateway/discovery)、[macOS remote mode](/zh-Hant/platforms/mac/remote)。

## 環境變數和 .env 載入

### OpenClaw 如何載入環境變數

OpenClaw 從父程序（shell、launchd/systemd、CI 等）讀取環境變數，並額外載入：

- 來自當前工作目錄的 `.env`
- 來自 `~/.openclaw/.env` 的全域後備 `.env`（亦稱 `$OPENCLAW_STATE_DIR/.env`）

這兩個 `.env` 檔案都不會覆蓋既有的環境變數。

您也可以在設定檔中定義內聯環境變數（僅在程序環境中缺少時套用）：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

請參閱 [/environment](/zh-Hant/help/environment) 以了解完整的優先順序與來源。

### 我透過服務啟動了 Gateway，但環境變數消失了。現在該怎麼辦

兩種常見的解決方法：

1. 將遺漏的索引鍵放入 `~/.openclaw/.env` 中，這樣即使服務未繼承您的 shell 環境，也能讀取這些變數。
2. 啟用 shell 匯入（選擇性便利功能）：

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

這會執行您的登入 shell 並僅匯入遺漏的預期索引鍵（絕不覆蓋）。對應的環境變數：
`OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

### 我設定了 COPILOTGITHUBTOKEN，但模型狀態顯示 Shell env off。為什麼

`openclaw models status` 會回報是否已啟用 **shell 環境匯入**。「Shell env: off」
並**不**表示您的環境變數遺失——它僅表示 OpenClaw 不會自動
載入您的登入 shell。

如果 Gateway 以服務方式執行，它將不會繼承您的 shell
環境。請透過以下任一方式修正：

1. 將 Token 放入 `~/.openclaw/.env` 中：

   ```
   COPILOT_GITHUB_TOKEN=...
   ```

2. 或是啟用 shell 匯入（`env.shellEnv.enabled: true`）。
3. 或是將其新增至您的設定檔 `env` 區塊（僅在遺漏時套用）。

然後重新啟動 gateway 並再次檢查：

```bash
openclaw models status
```

Copilot Token 是從 `COPILOT_GITHUB_TOKEN` 讀取的（也有 `GH_TOKEN` / `GITHUB_TOKEN`）。
請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers) 和 [/environment](/zh-Hant/help/environment)。

## Sessions and multiple chats

### How do I start a fresh conversation

Send `/new` or `/reset` as a standalone message. See [Session management](/zh-Hant/concepts/session).

### Do sessions reset automatically if I never send new

是的。Session 會在 `session.idleMinutes` 後過期（預設為 **60**）。**下一則**訊息會為該聊天金鑰啟動新的 session id。這不會刪除對話記錄——它只是開始一個新的 session。

```json5
{
  session: {
    idleMinutes: 240,
  },
}
```

### 有沒有辦法建立一個 CEO 和多個 agents 的 OpenClaw 實例團隊

有的，透過 **multi-agent routing** 和 **sub-agents**。您可以建立一個協調 agent 和數個 worker agents，並擁有自己的工作區和模型。

話雖如此，這最好被視為一個 **有趣的實驗**。這非常耗費 token，而且通常比使用一個具有獨立 sessions 的 bot 效率更低。我們想像的典型模型是您與一個 bot 對話，並為並行工作使用不同的 sessions。該 bot 也可以在需要時產生 sub-agents。

文件：[Multi-agent routing](/zh-Hant/concepts/multi-agent)、[Sub-agents](/zh-Hant/tools/subagents)、[Agents CLI](/zh-Hant/cli/agents)。

### 為什麼 context 在任務中途被截斷了？我要如何預防這種情況？

Session context 受限於模型視窗。長時間的聊天、大量的工具輸出或許多檔案都可能觸發壓縮或截斷。

有用的方法：

- 要求 bot 總結當前狀態並將其寫入檔案。
- 在長時間任務前使用 `/compact`，並在切換主題時使用 `/new`。
- 將重要的 context 保留在工作區中，並要求 bot 重新讀取。
- 對於長時間或並行工作使用 sub-agents，以便主要聊天保持較小。
- 如果這種情況經常發生，請選擇具有較大 context window 的模型。

### 我該如何完全重置 OpenClaw 但保持安裝狀態？

使用 reset 指令：

```bash
openclaw reset
```

非互動式完整重置：

```bash
openclaw reset --scope full --yes --non-interactive
```

然後重新執行安裝程式：

```bash
openclaw onboard --install-daemon
```

註記：

- 如果 Onboarding 發現現有設定，也會提供 **Reset**。請參閱 [Onboarding (CLI)](/zh-Hant/start/wizard)。
- 如果您使用了 profiles (`--profile` / `OPENCLAW_PROFILE`)，請重置每個 state dir（預設為 `~/.openclaw-<profile>`）。
- 開發重置：`openclaw gateway --dev --reset` (僅限開發；清除開發設定 + 憑證 + sessions + workspace)。

### 我遇到 context 太大的錯誤，該如何重置或壓縮？

使用其中之一：

- **壓縮** (保留對話但總結較舊的輪次)：

  ```
  /compact
  ```

  或使用 `/compact <instructions>` 來引導總結。

- **重置** (為相同的聊天金鑰啟動新的 session ID)：

  ```
  /new
  /reset
  ```

如果持續發生這種情況：

- 啟用或調整 **session pruning** (`agents.defaults.contextPruning`) 以修剪舊的工具輸出。
- 使用具有較大上下文視窗的模型。

文件：[Compaction](/zh-Hant/concepts/compaction)、[Session pruning](/zh-Hant/concepts/session-pruning)、[Session management](/zh-Hant/concepts/session)。

### 為什麼我會看到 "LLM request rejected: messages.content.tool_use.input field required"？

這是一個提供者驗證錯誤：模型發出了一個 `tool_use` 區塊，但缺少必需的
`input`。這通常意味著會話記錄已過時或損壞（通常發生在長對話線程
或工具/架構變更之後）。

解決方法：使用 `/new` 開始一個新會話（獨立訊息）。

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

如果 `HEARTBEAT.md` 存在但實際上是空的（只有空行和像 `# Heading` 這樣的 markdown
標題），OpenClaw 會跳過心跳執行以節省 API 呼叫。
如果檔案不存在，心跳仍會執行，由模型決定要做什麼。

個別代理程式的覆蓋設定使用 `agents.list[].heartbeat`。文件：[Heartbeat](/zh-Hant/gateway/heartbeat)。

### 我是否需要將機器人帳號新增至 WhatsApp 群組

不需要。OpenClaw 運行在 **您自己的帳號** 上，所以如果您在群組中，OpenClaw 就能看到它。
預設情況下，群組回覆會被阻擋，直到您允許發送者 (`groupPolicy: "allowlist"`)。

如果您希望只有 **您** 能觸發群組回覆：

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

選項 1（最快）：追蹤日誌並在群組中傳送測試訊息：

```bash
openclaw logs --follow --json
```

尋找以 `@g.us` 結尾的 `chatId`（或 `from`），例如：
`1234567890-1234567890@g.us`。

選項 2（如果已經配置/列入允許清單）：從配置列出群組：

```bash
openclaw directory groups list --channel whatsapp
```

文件：[WhatsApp](/zh-Hant/channels/whatsapp)、[Directory](/zh-Hant/cli/directory)、[Logs](/zh-Hant/cli/logs)。

### 為什麼 OpenClaw 不在群組中回覆

兩個常見原因：

- 提及閘門已開啟（預設）。您必須 @提及機器人（或符合 `mentionPatterns`）。
- 您在未設定 `"*"` 的情況下設定了 `channels.whatsapp.groups`，且該群組未被列入允許清單。

請參閱 [群組](/zh-Hant/channels/groups) 和 [群組訊息](/zh-Hant/channels/group-messages)。

### 群組/主題串是否與私人訊息共用上下文

直接聊天預設會合併到主會話中。群組/頻道有自己的會話金鑰，而 Telegram 主題 / Discord 執行緒則是獨立的會話。請參閱 [群組](/zh-Hant/channels/groups) 和 [群組訊息](/zh-Hant/channels/group-messages)。

### 我可以建立多少個工作區和代理程式

沒有硬性限制。數十個（甚至數百個）都沒問題，但請注意：

- **磁碟空間增長：**會話 + 轉錄記錄儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下。
- **Token 成本：**更多的代理程式意味著更多的並發模型使用。
- **營運額外負擔：**每個代理程式的設定檔、工作區和通道路由。

建議：

- 每個代理程式保留一個 **使用中** 的工作區 (`agents.defaults.workspace`)。
- 如果磁碟空間增長，請修剪舊的會話（刪除 JSONL 或儲存項目）。
- 使用 `openclaw doctor` 來找出孤立的工作區和設定檔不匹配。

### 我可以同時在 Slack 上執行多個機器人或聊天嗎？我該如何設置

可以。使用 **Multi-Agent Routing** 來執行多個獨立的代理程式，並透過通道/帳戶/對等點路由傳入訊息。Slack 作為一個通道受到支援，並可以綁定到特定的代理程式。

瀏覽器存取功能強大，但並非「人類能做的任何事都能做」——反機器人措施、CAPTCHA 和多重要素驗證仍然會阻擋自動化。為了獲得最可靠的瀏覽器控制，請在主機上使用本機 Chrome MCP，或在實際執行瀏覽器的機器上使用 CDP。

最佳實務設置：

- 永遠線上的閘道主機 (VPS/Mac mini)。
- 每個角色一個代理程式 (綁定)。
- 綁定到這些代理程式的 Slack 通道。
- 必要時透過 Chrome MCP 或節點使用本機瀏覽器。

文件：[Multi-Agent Routing](/zh-Hant/concepts/multi-agent)、[Slack](/zh-Hant/channels/slack)、
[Browser](/zh-Hant/tools/browser)、[Nodes](/zh-Hant/nodes)。

## 模型：預設值、選擇、別名、切換

### 預設模型是什麼

OpenClaw 的預設模型是您設定的任何內容：

```
agents.defaults.model.primary
```

模型引用為 `provider/model`（例如：`anthropic/claude-opus-4-6`）。如果您省略了提供者，OpenClaw 目前會假設 `anthropic` 作為臨時棄用回退方案——但您仍然應該**明確**設定 `provider/model`。

### 您推薦使用哪個模型

**推薦預設值：** 使用您提供者堆疊中最強大的最新世代模型。
**對於啟用工具或非信任輸入的代理程式：** 優先考慮模型強度而非成本。
**對於常規/低風險聊天：** 使用較便宜的回退模型並根據代理程式角色進行路由。

MiniMax M2.5 有其自己的文件：[MiniMax](/zh-Hant/providers/minimax) 和
[本機模型](/zh-Hant/gateway/local-models)。

經驗法則：對於高風險工作，使用您**負擔得起的最好模型**；對於常規聊天或摘要，使用較便宜的
模型。您可以根據代理程式路由模型，並使用子代理程式來
並行化長任務（每個子代理程式都會消耗 token）。請參閱 [模型](/zh-Hant/concepts/models) 和
[子代理程式](/zh-Hant/tools/subagents)。

強烈警告：較弱/過度量化的模型更容易受到提示注入
和不安全行為的影響。請參閱 [安全性](/zh-Hant/gateway/security)。

更多背景資訊：[模型](/zh-Hant/concepts/models)。

### 我可以使用自託管的模型 llamacpp vLLM Ollama 嗎

可以。Ollama 是本地模型最簡單的路徑。

最快速的設定：

1. 從 `https://ollama.com/download` 安裝 Ollama
2. 提取一個本地模型，例如 `ollama pull glm-4.7-flash`
3. 如果您也需要 Ollama Cloud，請執行 `ollama signin`
4. 執行 `openclaw onboard` 並選擇 `Ollama`
5. 選擇 `Local` 或 `Cloud + Local`

備註：

- `Cloud + Local` 為您提供 Ollama Cloud 模型以及您的本地 Ollama 模型
- 雲端模型（如 `kimi-k2.5:cloud`）不需要本地提取
- 若要手動切換，請使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

安全性提示：較小或經大量量化（quantized）的模型更容易受到提示詞注入（prompt injection）的攻擊。我們強烈建議任何能夠使用工具的機器人都使用 **大型模型**。如果您仍想使用小型模型，請啟用沙箱（sandboxing）和嚴格的工具允許清單（tool allowlists）。

文件：[Ollama](/zh-Hant/providers/ollama)、[本機模型](/zh-Hant/gateway/local-models)、
[模型供應商](/zh-Hant/concepts/model-providers)、[安全性](/zh-Hant/gateway/security)、
[沙箱](/zh-Hant/gateway/sandboxing)。

### 如何在不清除設定的情況下切換模型

使用 **模型指令** 或僅編輯 **model** 欄位。請避免完整替換設定。

安全的選項：

- 在聊天中使用 `/model`（快速，僅限當前階段）
- `openclaw models set ...`（僅更新模型設定）
- `openclaw configure --section model`（互動式）
- 在 `~/.openclaw/openclaw.json` 中編輯 `agents.defaults.model`

除非您打算完全替換設定，否則請避免使用不完整的物件執行 `config.apply`。
如果您確實覆蓋了設定，請從備份還原或重新執行 `openclaw doctor` 進行修復。

文件：[模型](/zh-Hant/concepts/models)、[設定](/zh-Hant/cli/configure)、[設定檔](/zh-Hant/cli/config)、[醫生](/zh-Hant/gateway/doctor)。

### OpenClaw、Flawd 和 Krill 使用什麼模型

- 這些部署可能會有所不同，且可能會隨時間改變；沒有固定的供應商建議。
- 使用 `openclaw models status` 檢查每個閘道上的目前執行時設定。
- 對於安全性敏感或已啟用工具的代理程式，請使用可用的最新一代中最強大的模型。

### 如何在不重新啟動的情況下動態切換模型

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

您可以使用 `/model`、`/model list` 或 `/model status` 列出可用的模型。

`/model`（以及 `/model list`）會顯示一個簡潔、編號的選擇器。通過編號選擇：

```
/model 3
```

您也可以強制供應商使用特定的驗證設定檔（每個階段）：

```
/model opus@anthropic:default
/model opus@anthropic:work
```

提示：`/model status` 顯示哪個代理程式處於活動狀態，正在使用哪個 `auth-profiles.json` 檔案，以及接下來將嘗試哪個認證設定檔。
它還會在可用時顯示已設定的供應商端點 (`baseUrl`) 和 API 模式 (`api`)。

**如何取消固定我使用 profile 設定的設定檔**

重新執行 `/model`，但**不要**加上 `@profile` 後綴：

```
/model anthropic/claude-opus-4-6
```

如果您想返回預設值，請從 `/model` 中選擇它（或發送 `/model <default provider/model>`）。
使用 `/model status` 確認哪個認證設定檔處於活動狀態。

### 我可以將 GPT 5.2 用於日常工作，將 Codex 5.3 用於編碼嗎

可以。將其中一個設為預設，並根據需要切換：

- **快速切換（每個工作階段）：** 日常工作使用 `/model gpt-5.2`，使用 Codex OAuth 進行編碼時使用 `/model openai-codex/gpt-5.4`。
- **預設 + 切換：** 將 `agents.defaults.model.primary` 設定為 `openai/gpt-5.2`，然後在編碼時切換到 `openai-codex/gpt-5.4`（反之亦然）。
- **子代理程式：** 將編碼任務路由到具有不同預設模型的子代理程式。

請參閱 [模型](/zh-Hant/concepts/models) 和 [斜線指令](/zh-Hant/tools/slash-commands)。

### 為什麼我會看到不允許使用此模型然後沒有回覆

如果設定了 `agents.defaults.models`，它就會成為 `/model` 和任何
工作階段覆寫的 **允許清單**。選擇該清單中不存在的模型會傳回：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

該錯誤會被傳回，**而不是**正常的回覆。解決方法：將模型新增至
`agents.defaults.models`，移除允許清單，或從 `/model list` 中選擇一個模型。

### 為什麼我會看到未知模型 minimaxMiniMaxM25

這表示 **未設定供應商**（找不到 MiniMax 供應商設定或認證設定檔），因此無法解析模型。此偵測的修復方案位於 **2026.1.12** 版本中（撰寫時尚未發布）。

修復檢查清單：

1. 升級到 **2026.1.12**（或從原始碼執行 `main`），然後重新啟動閘道。
2. 確保已設定 MiniMax（精靈或 JSON），或 env/auth 設定檔中存在 MiniMax API 金鑰，以便能夠插入供應商。
3. 使用確切的模型 ID（區分大小寫）：`minimax/MiniMax-M2.5` 或
   `minimax/MiniMax-M2.5-highspeed`。
4. 執行：

   ```bash
   openclaw models list
   ```

   並從列表中選取（或在聊天中輸入 `/model list`）。

請參閱 [MiniMax](/zh-Hant/providers/minimax) 與 [Models](/zh-Hant/concepts/models)。

### 我可以將 MiniMax 作為預設，並將 OpenAI 用於複雜任務嗎

可以。將 **MiniMax 設為預設**，並在需要時**依會話**切換模型。
備援機制是針對**錯誤**，而非「困難任務」，因此請使用 `/model` 或獨立的代理程式。

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

**選項 B：分開的代理程式**

- 代理程式 A 預設：MiniMax
- 代理程式 B 預設：OpenAI
- 透過代理程式路由或使用 `/agent` 來切換

文件：[Models](/zh-Hant/concepts/models)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent)、[MiniMax](/zh-Hant/providers/minimax)、[OpenAI](/zh-Hant/providers/openai)。

### opus sonnet gpt 是內建的捷徑嗎

是的。OpenClaw 附帶幾個預設簡稱（僅在模型存在於 `agents.defaults.models` 時套用）：

- `opus` → `anthropic/claude-opus-4-6`
- `sonnet` → `anthropic/claude-sonnet-4-6`
- `gpt` → `openai/gpt-5.4`
- `gpt-mini` → `openai/gpt-5-mini`
- `gemini` → `google/gemini-3.1-pro-preview`
- `gemini-flash` → `google/gemini-3-flash-preview`
- `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

如果您設定同名的別名，您的值會優先。

### 如何定義/覆蓋模型捷徑（別名）

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

然後 `/model sonnet`（或在支援時輸入 `/<alias>`）將解析為該模型 ID。

### 如何新增來自其他提供者（如 OpenRouter 或 ZAI）的模型

OpenRouter（依 Token 計費；多種模型）：

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

如果您參照某個提供者/模型但缺少必要的提供者金鑰，您將會收到執行時期的驗證錯誤（例如 `No API key found for provider "zai"`）。

**新增代理程式後找不到提供者的 API 金鑰**

這通常意味著 **新代理** 的授權儲存是空的。授權是針對每個代理的，並儲存在：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

修復選項：

- 執行 `openclaw agents add <id>` 並在精靈（wizard）過程中設定授權。
- 或將 `auth-profiles.json` 從主代理的 `agentDir` 複製到新代理的 `agentDir`。

請**勿**在代理之間重複使用 `agentDir`；這會導致授權/會話衝突。

## 模型故障轉移與「所有模型均失敗」

### 故障轉移如何運作

故障轉移發生在兩個階段：

1. **授權設定檔輪替** 在同一供應商內。
2. **模型回退** 到 `agents.defaults.model.fallbacks` 中的下一個模型。

冷卻時間適用於失敗的設定檔（指數退避），因此即使供應商受到速率限制或暫時故障，OpenClaw 也能持續回應。

### 這個錯誤訊息是什麼意思

```
No credentials found for profile "anthropic:default"
```

這意味著系統嘗試使用授權設定檔 ID `anthropic:default`，但在預期的授權儲存中找不到其憑證。

### 修復「找不到設定檔 anthropicdefault 的憑證」的檢查清單

- **確認授權設定檔的位置**（新路徑與舊路徑）
  - 目前路徑：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - 舊路徑：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）
- **確認您的環境變數已由 Gateway 載入**
  - 如果您在 shell 中設定了 `ANTHROPIC_API_KEY`，但透過 systemd/launchd 執行 Gateway，它可能無法繼承該變數。請將其放入 `~/.openclaw/.env` 或啟用 `env.shellEnv`。
- **確保您正在編輯正確的代理**
  - 多代理設定意味著可能會有多個 `auth-profiles.json` 檔案。
- **合理性檢查模型/授權狀態**
  - 使用 `openclaw models status` 來查看已設定的模型以及供應商是否已通過驗證。

**修復「找不到設定檔 anthropic 的憑證」的檢查清單**

這意味著該執行固定使用 Anthropic 授權設定檔，但 Gateway 無法在其授權儲存中找到它。

- **使用 setup-token（設定權杖）**
  - 執行 `claude setup-token`，然後使用 `openclaw models auth setup-token --provider anthropic` 貼上它。
  - 如果權杖是在另一台機器上建立的，請使用 `openclaw models auth paste-token --provider anthropic`。
- **如果您想改用 API 金鑰**
  - 將 `ANTHROPIC_API_KEY` 放在 **gateway host** 上的 `~/.openclaw/.env` 中。
  - 清除任何強制使用遺失設定檔的固定順序：

    ```bash
    openclaw models auth order clear --provider anthropic
    ```

- **確認您正在 gateway host 上執行指令**
  - 在遠端模式下，驗證設定檔位於 gateway 機器上，而非您的筆記型電腦上。

### 為什麼它也嘗試了 Google Gemini 並失敗

如果您的模型設定包含 Google Gemini 作為後備（或者您切換到了 Gemini 簡寫），OpenClaw 將在模型故障轉移期間嘗試使用它。如果您尚未設定 Google 憑證，您將會看到 `No API key found for provider "google"`。

修復方法：提供 Google 驗證，或移除/避免在 `agents.defaults.model.fallbacks` / 別名中使用 Google 模型，以免故障轉移路由到那裡。

**LLM request rejected message thinking signature required google antigravity**

原因：工作階段歷史記錄包含 **沒有簽章的思考區塊**（通常來自於已中止/部分串流）。Google Antigravity 要求思考區塊必須有簽章。

修復方法：OpenClaw 現在會為 Google Antigravity Claude 移除未簽章的思考區塊。如果仍然出現，請開啟一個 **新工作階段** 或為該 agent 設定 `/thinking off`。

## Auth profiles：它們是什麼以及如何管理它們

相關連結：[/concepts/oauth](/zh-Hant/concepts/oauth)（OAuth 流程、Token 儲存、多帳號模式）

### 什麼是 auth profile

Auth profile 是連結到提供者的命名憑證記錄（OAuth 或 API 金鑰）。設定檔位於：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

### 典型的設定檔 ID 是什麼

OpenClaw 使用提供者前綴的 ID，例如：

- `anthropic:default`（當不存在電子郵件識別身份時很常見）
- `anthropic:<email>` 用於 OAuth 身份
- 您選擇的自訂 ID（例如 `anthropic:work`）

### 我可以控制先嘗試哪個 auth profile 嗎

可以。設定檔支援選用的設定檔元資料以及每個提供者的順序（`auth.order.<provider>`）。這 **不** 會儲存秘密；它將 ID 對應到提供者/模式並設定輪替順序。

如果設定檔處於短暫的 **冷卻** 狀態（速率限制/逾時/驗證失敗）或較長的 **停用** 狀態（帳單/點數不足），OpenClaw 可能會暫時跳過該設定檔。要檢查此情況，請執行 `openclaw models status --json` 並檢查 `auth.unusableProfiles`。調整設定：`auth.cooldowns.billingBackoffHours*`。

您也可以透過 CLI 設定 **每個代理程式 (per-agent)** 的順序覆寫（儲存在該代理程式的 `auth-profiles.json` 中）：

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

若要指定特定的代理程式：

```bash
openclaw models auth order set --provider anthropic --agent main anthropic:default
```

### OAuth 與 API 金鑰 - 有什麼差別

OpenClaw 支援這兩者：

- **OAuth** 通常會利用訂閱存取權（如適用）。
- **API 金鑰** 使用按 token 付費的計費方式。

精靈 (Wizard) 明確支援 Anthropic setup-token 和 OpenAI Codex OAuth，並且可以為您儲存 API 金鑰。

## Gateway：連接埠、「already running」以及遠端模式

### Gateway 使用哪個連接埠

`gateway.port` 控制用於 WebSocket + HTTP（控制 UI、hooks 等）的單一多工連接埠。

優先順序：

```
--port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
```

### 為什麼 openclaw gateway status 顯示 Runtime running 但 RPC probe failed

因為 "running" 是 **監督程式 (supervisor)** 的觀點（launchd/systemd/schtasks）。RPC 探測是指 CLI 實際連接到 gateway WebSocket 並呼叫 `status`。

使用 `openclaw gateway status` 並相信這幾行：

- `Probe target:` (探測實際使用的 URL)
- `Listening:` (連接埠上實際綁定的內容)
- `Last gateway error:` (常見的根本原因，當程序存活但連接埠未監聽時)

### 為什麼 openclaw gateway status 顯示 Config cli 和 Config service 不同

您正在編輯一個設定檔，而服務正在使用另一個（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不符）。

解決方法：

```bash
openclaw gateway install --force
```

從您希望服務使用的相同 `--profile` / 環境執行該操作。

### another gateway instance is already listening 是什麼意思

OpenClaw 透過在啟動時立即綁定 WebSocket 監聽器來強制執行執行階段鎖定（預設為 `ws://127.0.0.1:18789`）。如果綁定失敗並出現 `EADDRINUSE`，它會拋出 `GatewayLockError`，表示另一個實例正在監聽。

解決方法：停止另一個實例，釋放連接埠，或使用 `openclaw gateway --port <port>` 執行。

### 如何以遠端模式執行 OpenClaw（用戶端連接到其他地方的 Gateway）

設定 `gateway.mode: "remote"` 並指向遠端 WebSocket URL，可選擇使用 token/密碼：

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

- `openclaw gateway` 僅在 `gateway.mode` 為 `local` 時啟動（或您傳遞覆寫標誌）。
- macOS 應用程式會監視設定檔，並在這些值變更時即時切換模式。

### 控制 UI 顯示未授權或不斷重新連線 該怎麼辦

您的閘道器已啟用驗證 (`gateway.auth.*`)，但 UI 未傳送相符的 token/密碼。

事實（來自程式碼）：

- 控制 UI 會將 token 保留在 `sessionStorage` 中，針對目前的瀏覽器分頁工作階段和選定的閘道器 URL，因此同分頁重新整理能持續運作，而無需還原長期的 localStorage token 持續性。
- 在 `AUTH_TOKEN_MISMATCH` 上，當閘道器傳回重試提示 (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`) 時，受信任的用戶端可以使用快取的裝置 token 嘗試一次有限次數的重試。

修正方法：

- 最快：`openclaw dashboard`（列印並複製儀表板 URL，嘗試開啟；如果是無頭模式則顯示 SSH 提示）。
- 如果您還沒有 token：`openclaw doctor --generate-gateway-token`。
- 如果是遠端，先建立通道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`。
- 在閘道器主機上設定 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 在控制 UI 設定中，貼上相同的 token。
- 如果在一次重試後仍然不匹配，請輪換/重新批准配對的裝置 token：
  - `openclaw devices list`
  - `openclaw devices rotate --device <id> --role operator`
- 還是卡住了？執行 `openclaw status --all` 並依照 [疑難排解](/zh-Hant/gateway/troubleshooting)。參閱 [儀表板](/zh-Hant/web/dashboard) 以取得驗證詳細資訊。

### 我設定了 gateway.bind tailnet 但它無法綁定且沒有任何監聽

`tailnet` 綁定會從您的網路介面 (100.64.0.0/10) 中選擇一個 Tailscale IP。如果機器不在 Tailscale 上（或介面已關閉），則沒有可綁定的物件。

修正方法：

- 在該主機上啟動 Tailscale（使其擁有 100.x 位址），或
- 切換到 `gateway.bind: "loopback"` / `"lan"`。

注意：`tailnet` 是明確指定的。`auto` 偏好回送 (loopback)；當您只需要 tailnet 綁定時，請使用 `gateway.bind: "tailnet"`。

### 我可以在同一台主機上執行多個 Gateway 嗎

通常不行——一個 Gateway 可以執行多個訊息通道和代理程式。僅在您需要冗餘 (例如：救援機器人) 或嚴格隔離時，才使用多個 Gateway。

可以，但您必須進行隔離：

- `OPENCLAW_CONFIG_PATH` (每個執行個體的配置)
- `OPENCLAW_STATE_DIR` (每個執行個體的狀態)
- `agents.defaults.workspace` (工作區隔離)
- `gateway.port` (唯一連接埠)

快速設定 (推薦)：

- 每個執行個體使用 `openclaw --profile <name> …` (會自動建立 `~/.openclaw-<name>`)。
- 在每個設定檔中設定唯一的 `gateway.port` (或是在手動執行時傳遞 `--port`)。
- 安裝針對每個設定檔的服務：`openclaw --profile <name> gateway install`。

設定檔也會為服務名稱加上後綴 (`ai.openclaw.<profile>`；舊版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`)。
完整指南：[Multiple gateways](/zh-Hant/gateway/multiple-gateways)。

### 無效的交握代碼 1008 是什麼意思

Gateway 是一個 **WebSocket 伺服器**，它預期第一則訊息必須是 `connect` 影格。如果接收到任何其他內容，它會以 **代碼 1008** (原則違反) 關閉連線。

常見原因：

- 您在瀏覽器中開啟了 **HTTP** URL (`http://...`)，而不是使用 WS 用戶端。
- 您使用了錯誤的連接埠或路徑。
-  Proxy 或通道移除了驗證標頭，或發送了非 Gateway 要求。

快速修正：

1. 使用 WS URL：`ws://<host>:18789` (如果是 HTTPS 則使用 `wss://...`)。
2. 不要在一般的瀏覽器分頁中開啟 WS 連接埠。
3. 如果開啟了驗證，請在 `connect` 影格中包含 token/密碼。

如果您使用的是 CLI 或 TUI，URL 應該看起來像這樣：

```
openclaw tui --url ws://<host>:18789 --token <token>
```

通訊協定詳情：[Gateway protocol](/zh-Hant/gateway/protocol)。

## 記錄與除錯

### 記錄檔在哪裡

檔案記錄 (結構化)：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

您可以透過 `logging.file` 設定穩定的路徑。檔案日誌層級由 `logging.level` 控制。主控台詳細程度由 `--verbose` 和 `logging.consoleLevel` 控制。

最快速的日誌追蹤：

```bash
openclaw logs --follow
```

服務/監督器日誌（當閘道透過 launchd/systemd 執行時）：

- macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（預設值：`~/.openclaw/logs/...`；設定檔使用 `~/.openclaw-<profile>/logs/...`）
- Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
- Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

詳情請參閱 [疑難排解](/zh-Hant/gateway/troubleshooting#log-locations)。

### 如何啟動/停止/重新啟動 Gateway 服務

使用 gateway 輔助工具：

```bash
openclaw gateway status
openclaw gateway restart
```

如果您手動執行閘道，`openclaw gateway --force` 可以回收連接埠。請參閱 [Gateway](/zh-Hant/gateway)。

### 我在 Windows 上關閉了終端機，如何重新啟動 OpenClaw

Windows 有 **兩種安裝模式**：

**1) WSL2（建議）：** Gateway 在 Linux 內部執行。

開啟 PowerShell，進入 WSL，然後重新啟動：

```powershell
wsl
openclaw gateway status
openclaw gateway restart
```

如果您從未安裝該服務，請在前台啟動它：

```bash
openclaw gateway run
```

**2) 原生 Windows（不建議）：** Gateway 直接在 Windows 中執行。

開啟 PowerShell 並執行：

```powershell
openclaw gateway status
openclaw gateway restart
```

如果您手動執行它（無服務），請使用：

```powershell
openclaw gateway run
```

文件：[Windows (WSL2)](/zh-Hant/platforms/windows), [Gateway service runbook](/zh-Hant/gateway)。

### Gateway 已啟動但從未收到回覆 我應檢查什麼

先進行快速健康檢查：

```bash
openclaw status
openclaw models status
openclaw channels status
openclaw logs --follow
```

常見原因：

- 模型驗證未載入至 **gateway host**（檢查 `models status`）。
- 頻道配對/允許清單阻擋了回覆（檢查頻道設定 + 日誌）。
- WebChat/Dashboard 已開啟但未使用正確的權杖。

如果您是遠端連線，請確認 tunnel/Tailscale 連線已啟動，且 Gateway WebSocket 可連接。

文件：[Channels](/zh-Hant/channels), [Troubleshooting](/zh-Hant/gateway/troubleshooting), [Remote access](/zh-Hant/gateway/remote)。

### 從 gateway 斷線，沒有原因，現在該怎麼辦

這通常表示 UI 失去了 WebSocket 連線。請檢查：

1. Gateway 是否正在執行？`openclaw gateway status`
2. Gateway 是否健康？`openclaw status`
3. UI 是否擁有正確的 token？`openclaw dashboard`
4. 如果是遠端，tunnel/Tailscale 連線是否正常？

然後檢查日誌：

```bash
openclaw logs --follow
```

文件：[Dashboard](/zh-Hant/web/dashboard)、[Remote access](/zh-Hant/gateway/remote)、[Troubleshooting](/zh-Hant/gateway/troubleshooting)。

### Telegram setMyCommands 失敗，我應該檢查什麼

先檢查日誌和頻道狀態：

```bash
openclaw channels status
openclaw channels logs --channel telegram
```

然後比對錯誤訊息：

- `BOT_COMMANDS_TOO_MUCH`：Telegram 選單的項目過多。OpenClaw 已經會修剪至 Telegram 的限制並以較少的指令重試，但有些選單項目仍然需要移除。請減少 plugin/skill/custom 指令，或者如果您不需要選單，請停用 `channels.telegram.commands.native`。
- `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或類似的網路錯誤：如果您在 VPS 上或位於代理伺服器後方，請確認允許連出 HTTPS 且 DNS 對 `api.telegram.org` 的解析正常。

如果 Gateway 位於遠端，請確認您正在查看 Gateway 主機上的日誌。

文件：[Telegram](/zh-Hant/channels/telegram)、[Channel troubleshooting](/zh-Hant/channels/troubleshooting)。

### TUI 沒有顯示輸出，我應該檢查什麼

首先確認 Gateway 可以連線，且 agent 能夠執行：

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

在 TUI 中，使用 `/status` 來查看目前狀態。如果您預期在聊天頻道中收到回覆，請確認已啟用傳送功能 (`/deliver on`)。

文件：[TUI](/zh-Hant/web/tui)、[Slash commands](/zh-Hant/tools/slash-commands)。

### 我要如何完全停止然後啟動 Gateway

如果您安裝了服務：

```bash
openclaw gateway stop
openclaw gateway start
```

這會停止/啟動 **受管理的服務** (macOS 上是 launchd，Linux 上是 systemd)。當 Gateway 在背景作為 daemon 執行時，請使用此指令。

如果您是在前景執行，請使用 Ctrl-C 停止，然後執行：

```bash
openclaw gateway run
```

文件：[Gateway service runbook](/zh-Hant/gateway)。

### ELI5：openclaw gateway restart 與 openclaw gateway 的比較

- `openclaw gateway restart`：重新啟動 **背景服務** (launchd/systemd)。
- `openclaw gateway`：**在前景** 執行 gateway 僅供此終端機階段使用。

如果您安裝了服務，請使用 gateway 指令。當您想要單次在前景執行時，請使用 `openclaw gateway`。

### 當出現問題時獲取更多詳細資訊的最快方法

使用 `--verbose` 啟動 Gateway 以獲取更多控制台詳細資訊。然後檢查日誌檔案中的通道授權、模型路由和 RPC 錯誤。

## 媒體與附件

### 我的技能生成了圖片或 PDF，但沒有發送任何內容

從代理傳出的附件必須包含一行 `MEDIA:<path-or-url>`（單獨佔一行）。請參閱 [OpenClaw assistant setup](/zh-Hant/start/openclaw) 和 [Agent send](/zh-Hant/tools/agent-send)。

CLI 傳送：

```bash
openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
```

同時請檢查：

- 目標通道支援傳出媒體，且未被允許清單封鎖。
- 檔案大小在提供者的限制範圍內（圖片會被調整大小至最大 2048px）。

請參閱 [Images](/zh-Hant/nodes/images)。

## 安全與存取控制

### 將 OpenClaw 暴露給傳入私訊是否安全

將傳入私訊視為不受信任的輸入。預設設定旨在降低風險：

- 支援私訊的通道，其預設行為是 **配對 (pairing)**：
  - 未知的發送者會收到配對碼；機器人不會處理他們的訊息。
  - 使用以下指令批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
  - 待處理請求每個通道上限為 **3** 個；如果沒收到代碼，請檢查 `openclaw pairing list --channel <channel> [--account <id>]`。
- 公開開啟私訊需要明確選擇加入（`dmPolicy: "open"` 和允許清單 `"*"`）。

執行 `openclaw doctor` 以顯示有風險的私訊政策。

### 提示詞注入是否只是公開機器人的問題

不是。提示詞注入與 **不受信任的內容** 有關，而不僅僅是誰可以傳私訊給機器人。
如果您的助理讀取外部內容（網路搜尋/擷取、瀏覽器頁面、電子郵件、
文件、附件、貼上的日誌），該內容可能包含試圖
劫持模型的指令。即使 **您是唯一的發送者**，這也可能發生。

最大的風險在於啟用工具時：模型可能被誘騙
外洩上下文或代表您呼叫工具。透過以下方式降低爆炸半徑：

- 使用唯讀或停用工具的「讀者」代理來總結不受信任的內容
- 對於啟用工具的代理，保持 `web_search` / `web_fetch` / `browser` 關閉
- 沙箱機制與嚴格的工具允許清單

詳細資訊：[Security](/zh-Hant/gateway/security)。

### 我的機器人應該有自己的電子郵件、GitHub 帳號或電話號碼嗎

是的，對於大多數設置而言。使用獨立的帳號和電話號碼隔離機器人，可以在發生問題時縮小受影響的範圍。這也使得輪換憑證或撤銷存取權限變得更容易，且不會影響您的個人帳號。

從小處著手。僅授予您實際需要的工具和帳號的存取權限，並在需要時進行擴展。

文件：[安全性](/zh-Hant/gateway/security)、[配對](/zh-Hant/channels/pairing)。

### 我可以讓它全權處理我的文字訊息嗎，這樣安全嗎

我們**不**建議讓其對您的個人訊息擁有完全自主權。最安全的模式是：

- 將直接訊息 (DM) 保持在**配對模式**或嚴格的允許清單中。
- 如果您希望它代表您發送訊息，請使用**獨立的號碼或帳號**。
- 讓它起草草稿，然後**在發送前進行審批**。

如果您想進行實驗，請在專用帳號上進行並保持隔離。請參閱[安全性](/zh-Hant/gateway/security)。

### 我可以使用較便宜的模型來執行個人助理任務嗎

是的，**前提是**該代理程式僅用於聊天且輸入內容可信。較低層級的模型更容易受到指令劫持，因此請避免將其用於啟用工具功能的代理程式或在讀取不可信內容時使用。如果您必須使用較小的模型，請鎖定工具並在沙箱中執行。請參閱[安全性](/zh-Hant/gateway/security)。

### 我在 Telegram 執行了 start 但沒有收到配對代碼

僅當未知發送者向機器人發送訊息並且啟用了 `dmPolicy: "pairing"` 時，才會發送配對代碼。單獨執行 `/start` 不會產生代碼。

檢查待處理請求：

```bash
openclaw pairing list telegram
```

如果您希望立即獲得存取權限，請將您的發送者 ID 加入允許清單，或為該帳號設定 `dmPolicy: "open"`。

### WhatsApp：它會傳訊息給我的聯絡人嗎？配對如何運作

不會。WhatsApp 預設的直接訊息 (DM) 政策是**配對**。未知發送者只會收到配對代碼，且其訊息**不會被處理**。OpenClaw 只會回覆它收到的聊天或您觸發的明確傳送。

使用以下方式批准配對：

```bash
openclaw pairing approve whatsapp <code>
```

列出待處理請求：

```bash
openclaw pairing list whatsapp
```

精靈電話號碼提示：此提示用於設定您的**允許清單/擁有者**，以便允許您自己的直接訊息。它不用於自動發送。如果您在個人 WhatsApp 號碼上執行，請使用該號碼並啟用 `channels.whatsapp.selfChatMode`。

## 聊天指令、中止任務，以及「它無法停止」

### 如何阻止內部系統訊息顯示在聊天中

大多數內部或工具訊息僅在該工作階段啟用 **verbose** 或 **reasoning** 時出現。

在您看到的聊天中進行修正：

```
/verbose off
/reasoning off
```

如果仍然很吵雜，請檢查 Control UI 中的工作階段設定，並將 verbose 設定為 **inherit**。另外，請確認您沒有使用設定中將 `verboseDefault` 設定為 `on` 的機器人設定檔。

文件：[Thinking and verbose](/zh-Hant/tools/thinking)、[Security](/zh-Hant/gateway/security#reasoning--verbose-output-in-groups)。

### 如何停止/取消正在執行的任務

將以下任何一項**作為獨立訊息**傳送（無斜線）：

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

斜線指令概覽：請參閱 [Slash commands](/zh-Hant/tools/slash-commands)。

大多數指令必須作為以 `/` 開頭的**獨立**訊息傳送，但某些捷徑（例如 `/status`）也可以在白名單傳送者的行內使用。

### 如何從 Telegram 傳送 Discord 訊息（跨上下文傳訊被拒絕）

OpenClaw 預設會封鎖**跨供應商**傳訊。如果工具呼叫綁定到 Telegram，除非您明確允許，否則它不會傳送到 Discord。

為代理程式啟用跨供應商傳訊：

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

編輯設定後重新啟動閘道。如果您只希望這用於單一代理程式，請改在 `agents.list[].tools.message` 下設定它。

### 為什麼感覺機器人會忽略連珠炮式的訊息

佇列模式控制新訊息如何與正在進行的執行互動。使用 `/queue` 變更模式：

- `steer` - 新訊息重新導向目前任務
- `followup` - 一次執行一則訊息
- `collect` - 批次處理訊息並回覆一次（預設）
- `steer-backlog` - 現在導向，然後處理積壓
- `interrupt` - 中止目前執行並重新開始

您可以新增選項（例如 `debounce:2s cap:25 drop:summarize`）用於後續模式。

## 回答截圖/聊天記錄中的確切問題

**問：「使用 API 金鑰時 Anthropic 的預設模型是什麼？」**

**A:** 在 OpenClaw 中，憑證與模型選擇是分開的。設定 `ANTHROPIC_API_KEY`（或在 auth profiles 中儲存 Anthropic API 金鑰）可啟用驗證，但實際的預設模型則是您在 `agents.defaults.model.primary` 中設定的任何內容（例如 `anthropic/claude-sonnet-4-5` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，這表示 Gateway 在執行中的代理程式之預期 `auth-profiles.json` 中找不到 Anthropic 憑證。

---

仍然卡住？請在 [Discord](https://discord.com/invite/clawd) 提問，或開啟 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。

import en from "/components/footer/en.mdx";

<en />
