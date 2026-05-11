---
summary: "關於 OpenClaw 設定、設定組態和使用的常見問題"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常見問題"
---

針對真實環境設定的快速解答與更深層的疑難排解（本地開發、VPS、多代理、OAuth/API 金鑰、模型故障轉移）。關於執行時期診斷，請參閱 [疑難排解](/zh-Hant/gateway/troubleshooting)。如需完整的設定組態參考，請參閱 [設定組態](/zh-Hant/gateway/configuration)。

## 如果發生問題時的前 60 秒

1. **快速狀態（首先檢查）**

   ```bash
   openclaw status
   ```

   快速本地摘要：作業系統 + 更新、閘道器/服務連線性、代理/工作階段、提供者設定組態 + 執行時期問題（當閘道器可連線時）。

2. **可貼上的報告（安全可分享）**

   ```bash
   openclaw status --all
   ```

   具有記錄追蹤（token 已編輯）的唯讀診斷。

3. **常駐程式 + 埠狀態**

   ```bash
   openclaw gateway status
   ```

   顯示監督器執行時期與 RPC 連線性、探測目標 URL，以及服務可能使用的設定組態。

4. **深度探測**

   ```bash
   openclaw status --deep
   ```

   執行即時閘道器健康探測，包含支援時的通道探測
   （需要可連線的閘道器）。請參閱 [健康狀態](/zh-Hant/gateway/health)。

5. **追蹤最新記錄**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 停機，則回退至：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   檔案記錄與服務記錄是分開的；請參閱 [記錄](/zh-Hant/logging) 和 [疑難排解](/zh-Hant/gateway/troubleshooting)。

6. **執行醫生程式（修復）**

   ```bash
   openclaw doctor
   ```

   修復/遷移設定組態/狀態 + 執行健康檢查。請參閱 [醫生程式](/zh-Hant/gateway/doctor)。

7. **閘道器快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向執行中的閘道器要求完整快照（僅限 WS）。請參閱 [健康狀態](/zh-Hant/gateway/health)。

## 快速開始與首次執行設定

首次執行問答 — 安裝、上架、驗證路由、訂閱、初始失敗 —
位於 [首次執行常見問題](/zh-Hant/help/faq-first-run)。

## 什麼是 OpenClaw？

<AccordionGroup>
  <Accordion title="OpenClaw 是什麼，用一段話概括？">
    OpenClaw 是您在自己的設備上運行的個人 AI 助手。它會在您已經使用的訊息介面上回覆（WhatsApp、Telegram、Slack、Mattermost、Discord、Google Chat、Signal、iMessage、WebChat 以及內建的頻道外掛如 QQ 機器人），並且在支援的平台上還能進行語音互動和使用即時 Canvas。**Gateway** 是永遠在線的控制平面；而助理則是產品本身。
  </Accordion>

  <Accordion title="價值主張">
    OpenClaw 不僅僅是「一個 Claude 的封裝」。它是一個**本地優先的控制平面**，讓您能在**自己的硬體上**運行一個功能強大的助理，從您已經使用的聊天應用程式中存取，並具備有狀態的會話、記憶和工具——而無需將您的工作流程控制權交給託管的 SaaS。

    重點摘要：

    - **您的設備，您的資料：** 在您想要的任何地方（Mac、Linux、VPS）運行 Gateway，並將工作區 + 會話紀錄保留在本地。
    - **真實的頻道，而非網頁沙箱：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，以及在支援的平台上的行動語音和 Canvas。
    - **模型無關：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，並支援每個助理的路由和故障轉移。
    - **僅限本地選項：** 執行本地模型，因此如果您願意，**所有資料都可以保留在您的設備上**。
    - **多助理路由：** 針對每個頻道、帳戶或任務分離助理，每個都有自己的工作區和預設值。
    - **開源且可駭：** 檢查、擴展和自託管，沒有廠商鎖定。

    文件：[Gateway](/zh-Hant/gateway)、[Channels](/zh-Hant/channels)、[Multi-agent](/zh-Hant/concepts/multi-agent)、
    [Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="我剛設定好——首先應該做什麼？">
    適合做為初次嘗試的專案：

    - 建立一個網站（WordPress、Shopify 或一個簡單的靜態網站）。
    - 製作行動應用程式原型（大綱、畫面、API 計畫）。
    - 整理檔案和資料夾（清理、命名、標記）。
    - 連結 Gmail 並自動產生摘要或後續追蹤。

    它可以處理大型任務，但當您將其分解為階段並使用子助理進行並行工作時，效果最好。

  </Accordion>

  <Accordion title="OpenClaw 的五大日常使用案例是什麼？">
    日常的勝利通常體現在：

    - **個人簡報：** 您關注的收件箱、行事曆和新聞摘要。
    - **研究與草擬：** 快速研究、摘要，以及電子郵件或文件的初稿。
    - **提醒與跟進：** 由 cron 或心跳驅動的提醒與檢查清單。
    - **瀏覽器自動化：** 填寫表單、收集資料和重複執行的網頁任務。
    - **跨裝置協調：** 從手機發送任務，讓 Gateway 在伺服器上執行，並在聊天中取回結果。

  </Accordion>

  <Accordion title="OpenClaw 能否協助 SaaS 的潛在客戶開發、外聯、廣告和部落格？">
    可以用於**研究、篩選和草擬**。它可以掃描網站、建立候選清單、
    摘要潛在客戶，並撰寫外聯或廣告文案草稿。

    對於**外聯或廣告投放**，請保持人工介入。避免垃圾郵件，遵守當地法律和
    平台政策，並在發送前審查所有內容。最安全的模式是讓
    OpenClaw 草擬，由您來批准。

    文件：[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="相較於 Claude Code 用於網頁開發有什麼優勢？">
    OpenClaw 是一個**個人助理**和協調層，而非 IDE 的替代品。使用
    Claude Code 或 Codex 在程式庫內進行最快的直接編碼迴圈。當您需要持久記憶、跨裝置存取和工具編排時，請使用 OpenClaw。

    優勢：

    - 跨會話的**持久記憶 + 工作區**
    - **多平台存取**（WhatsApp、Telegram、TUI、WebChat）
    - **工具編排**（瀏覽器、檔案、排程、hooks）
    - **始終在線的 Gateway**（在 VPS 上執行，從任何地方互動）
    - 用於本機瀏覽器/螢幕/相機/執行的**節點**

    展示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## 技能與自動化

<AccordionGroup>
  <Accordion title="如何在不讓程式庫變得髒亂的情況下自訂技能？">
    使用受管覆寫代替編輯程式庫副本。將您的變更放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或透過 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 新增資料夾）。優先順序為 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`，因此受管覆寫仍然優勝於捆绑技能，而不需觸碰 git。如果您需要全域安裝技能但僅對部分代理程式可見，請將共享副本保留在 `~/.openclaw/skills` 中，並使用 `agents.defaults.skills` 和 `agents.list[].skills` 控制可見性。只有值得提交至上遊的編輯才應存在於程式庫中並作為 PR 發出。
  </Accordion>

  <Accordion title="我可以從自訂資料夾載入技能嗎？">
    可以。透過 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 新增額外目錄（優先順序最低）。預設優先順序為 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`。`clawhub` 預設安裝到 `./skills` 中，OpenClaw 在下一次工作階段會將其視為 `<workspace>/skills`。如果該技能應僅對特定代理程式可見，請將其與 `agents.defaults.skills` 或 `agents.list[].skills` 搭配使用。
  </Accordion>

  <Accordion title="我如何針對不同任務使用不同的模型？">
    目前支援的模式有：

    - **Cron jobs**：隔離的工作可以為每個工作設定 `model` 覆蓋值。
    - **Sub-agents**：將任務路由至具有不同預設模型的獨立代理程式。
    - **On-demand switch**：使用 `/model` 隨時切換目前的工作階段模型。

    參閱 [Cron jobs](/zh-Hant/automation/cron-jobs)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent) 和 [Slash commands](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="機器人在執行繁重工作時會凍結。我該如何將負載分流？">
    請對長時間或並行任務使用 **sub-agents**。Sub-agents 在自己的工作階段中運行，
    回傳摘要，並保持您的主聊天響應靈敏。

    要求您的機器人「為此任務生成一個 sub-agent」或使用 `/subagents`。
    在聊天中使用 `/status` 查看 Gateway 目前正在做什麼（以及它是否忙碌）。

    Token 提示：長時間任務和 sub-agents 都會消耗 tokens。如果成本是考量，請透過 `agents.defaults.subagents.model` 為 sub-agents 設定更便宜的模型。

    文件：[Sub-agents](/zh-Hant/tools/subagents)、[Background Tasks](/zh-Hant/automation/tasks)。

  </Accordion>

  <Accordion title="Discord 上綁定執行緒的子代理階段是如何運作的？">
    使用執行緒綁定。您可以將 Discord 執行緒綁定到子代理或階段目標，以便該執行緒中的後續訊息保留在該綁定的階段中。

    基本流程：

    - 使用 `thread: true` 以 `sessions_spawn` 生成（可選地使用 `mode: "session"` 進行持續後續追蹤）。
    - 或使用 `/focus <target>` 手動綁定。
    - 使用 `/agents` 檢查綁定狀態。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自動取消聚焦。
    - 使用 `/unfocus` 分離執行緒。

    必要配置：

    - 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆寫：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 生成時自動綁定：設定 `channels.discord.threadBindings.spawnSubagentSessions: true`。

    文件：[子代理](/zh-Hant/tools/subagents)、[Discord](/zh-Hant/channels/discord)、[配置參考](/zh-Hant/gateway/configuration-reference)、[斜線指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="子代理已完成，但完成更新發送到了錯誤的地方或從未發布。我應該檢查什麼？">
    首先檢查解析後的請求者路由：

    - 完成模式子代理傳送優先使用任何綁定的執行緒或對話路由（如果存在的話）。
    - 如果完成來源僅包含通道，OpenClaw 會回退到請求者會話的儲存路由（`lastChannel` / `lastTo` / `lastAccountId`），以便直接傳送仍能成功。
    - 如果既沒有綁定路由也沒有可用的儲存路由，直接傳送可能會失敗，結果會回退到排隊的會話傳送，而不是立即發布到聊天。
    - 無效或過時的目標仍可能強制回退到佇列或導致最終傳送失敗。
    - 如果子代理的最後一個可見助理回覆是精確的靜默令牌 `NO_REPLY` / `no_reply`，或者精確為 `ANNOUNCE_SKIP`，OpenClaw 會有意抑制公告，而不是發布過時的早期進度。
    - 如果子代理僅在工具呼叫後超時，公告可以將其折疊為簡短的部分進度摘要，而不是重播原始工具輸出。

    除錯：

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[子代理](/zh-Hant/tools/subagents)、[背景任務](/zh-Hant/automation/tasks)、[會話工具](/zh-Hant/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒未觸發。我應該檢查什麼？">
    Cron 在 Gateway 程序內執行。如果 Gateway 未持續執行，
    排程的工作將不會執行。

    檢查清單：

    - 確認 cron 已啟用（`cron.enabled`）且未設定 `OPENCLAW_SKIP_CRON`。
    - 檢查 Gateway 是否全天候執行（無休眠/重新啟動）。
    - 驗證工作的時區設定（`--tz` 與主機時區相對比）。

    除錯：

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文件：[Cron 工作](/zh-Hant/automation/cron-jobs)、[自動化與任務](/zh-Hant/automation)。

  </Accordion>

  <Accordion title="Cron 已觸發，但沒有任何內容發送到頻道。為什麼？">
    首先檢查傳遞模式：

    - `--no-deliver` / `delivery.mode: "none"` 表示預期不會有 runner 備援發送。
    - 缺少或無效的公告目標 (`channel` / `to`) 表示 runner 跳過了傳出傳遞。
    - 頻道認證失敗 (`unauthorized`, `Forbidden`) 表示 runner 嘗試傳遞，但憑證阻擋了它。
    - 無聲的隔離結果 (僅 `NO_REPLY` / `no_reply`) 被視為故意不可傳遞，因此 runner 也會抑制佇列中的備援傳遞。

    對於隔離的 cron 作業，當有聊天路由可用時，agent 仍然可以直接使用 `message`
    工具發送。`--announce` 僅控制 runner 對於 agent 尚未發送的最終文字的備援路徑。

    除錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron 作業](/zh-Hant/automation/cron-jobs)、[背景任務](/zh-Hant/automation/tasks)。

  </Accordion>

  <Accordion title="為什麼隔離的 cron 執行會切換模型或重試一次？">
    這通常是即時模型切換路徑，而不是重複排程。

    隔離的 cron 可以保留執行時期模型移交，並在活動執行擲回 `LiveSessionModelSwitchError` 時重試。重試會保留切換後的提供者/模型，且如果切換帶有新的認證設定檔覆蓋，cron 也會在重試前保留它。

    相關選擇規則：

    - Gmail hook 模型覆蓋優先適用時勝出。
    - 然後是各個作業的 `model`。
    - 然後是任何儲存的 cron 會話模型覆蓋。
    - 然後是正常的 agent/預設模型選擇。

    重試迴圈是有界的。在初次嘗試加上 2 次切換重試後，cron 會中止而不是無限迴圈。

    除錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron 作業](/zh-Hant/automation/cron-jobs)、[cron CLI](/zh-Hant/cli/cron)。

  </Accordion>

  <Accordion title="我如何在 Linux 上安裝技能？">
    使用原生的 `openclaw skills` 指令或將技能放入您的工作區。macOS 的技能 UI 在 Linux 上無法使用。
    在 [https://clawhub.ai](https://clawhub.ai) 瀏覽技能。

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

    原生的 `openclaw skills install` 會寫入至使用中工作區的 `skills/`
    目錄。僅當您想要發布或
    同步您自己的技能時，才需安裝獨立的 `clawhub` CLI。若要跨代理程式進行共享安裝，請將技能置於
    `~/.openclaw/skills` 之下，並在您想要限制哪些代理程式能看見它時，使用 `agents.defaults.skills` 或
    `agents.list[].skills`。

  </Accordion>

  <Accordion title="OpenClaw 可以排程執行任務或在背景持續執行嗎？">
    可以。使用 Gateway 排程器：

    - **Cron jobs** 用於排程或週期性任務（重啟後仍持續存在）。
    - **Heartbeat** 用於「主工作階段」的定期檢查。
    - **Isolated jobs** 用於發布摘要或傳送至聊天室的自主代理程式。

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Automation & Tasks](/zh-Hant/automation)、
    [Heartbeat](/zh-Hant/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以從 Linux 執行僅適用 Apple macOS 的技能嗎？">
    不能直接執行。macOS 技能受 `metadata.openclaw.os` 加上必要的二進位檔案限制，且只有在 **Gateway 主機** 上符合資格時，技能才會出現在系統提示詞中。在 Linux 上，除非您覆寫閘道限制，否則 `darwin` 專用的技能（例如 `apple-notes`、`apple-reminders`、`things-mac`）將不會載入。

    您有三種支援的方案：

    **方案 A - 在 Mac 上執行 Gateway（最簡單）。**
    在存在 macOS 二進位檔案的地方執行 Gateway，然後從 Linux 以[遠端模式](#gateway-ports-already-running-and-remote-mode)或透過 Tailscale 進行連線。技能會正常載入，因為 Gateway 主機是 macOS。

    **方案 B - 使用 macOS 節點（無 SSH）。**
    在 Linux 上執行 Gateway，配對一個 macOS 節點（選單列應用程式），並在 Mac 上將 **節點執行指令** 設定為「總是詢問」或「總是允許」。當節點上存在必要的二進位檔案時，OpenClaw 可以將僅限 macOS 的技能視為符合資格。代理程式會透過 `nodes` 工具執行這些技能。如果您選擇「總是詢問」，在提示詞中核准「總是允許」會將該指令新增到允許清單中。

    **方案 C - 透過 SSH 代理 macOS 二進位檔案（進階）。**
    將 Gateway 保留在 Linux 上，但讓必要的 CLI 二進位檔案解析為在 Mac 上執行的 SSH 包裝函式。然後覆寫技能以允許 Linux，使其保持符合資格。

    1. 為二進位檔案建立 SSH 包裝函式（例如針對 Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 將包裝函式放置在 Linux 主機的 `PATH` 上（例如 `~/bin/memo`）。
    3. 覆寫技能中繼資料（工作區或 `~/.openclaw/skills`）以允許 Linux：

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. 啟動新的工作階段，以便重新整理技能快照。

  </Accordion>

  <Accordion title="你們有 Notion 或 HeyGen 整合嗎？">
    目前沒有內建。

    選項：

    - **自訂技能 / 外掛：** 最適合可靠的 API 存取（Notion/HeyGen 都有 API）。
    - **瀏覽器自動化：** 無需編碼即可運作，但速度較慢且較不穩定。

    如果您想為每個客戶保留上下文（代理商工作流程），一個簡單的模式是：

    - 每個客戶一個 Notion 頁面（上下文 + 偏好設定 + 進行中的工作）。
    - 要求 Agent 在會話開始時擷取該頁面。

    如果您想要原生整合，請開啟功能請求或建構一個針對這些 API 的技能。

    安裝技能：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安裝會置於現用工作區 `skills/` 目錄中。若要在 Agent 之間共用技能，請將它們放在 `~/.openclaw/skills/<name>/SKILL.md` 中。如果只有部分 Agent 應該看到共用的安裝，請設定 `agents.defaults.skills` 或 `agents.list[].skills`。某些技能預期會有透過 Homebrew 安裝的二進位檔；在 Linux 上這表示 Linuxbrew（請參閱上方的 Homebrew Linux FAQ 條目）。請參閱 [技能](/zh-Hant/tools/skills)、[技能設定](/zh-Hant/tools/skills-config) 和 [ClawHub](/zh-Hant/tools/clawhub)。

  </Accordion>

  <Accordion title="我如何在 OpenClaw 中使用我現有的已登入 Chrome？">
    使用內建的 `user` 瀏覽器設定檔，它會透過 Chrome DevTools MCP 連接：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果您想要自訂名稱，請建立明確的 MCP 設定檔：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    此路徑可以使用本地主機瀏覽器或已連接的瀏覽器節點。如果 Gateway 在其他地方執行，請在瀏覽器機器上執行節點主機，或者改用遠端 CDP。

    目前的 `existing-session` / `user` 限制：

    - 動作是由 ref 驅動，而非由 CSS 選擇器驅動
    - 上傳需要 `ref` / `inputRef`，目前一次支援一個檔案
    - `responsebody`、PDF 匯出、下載攔截和批次動作仍需要受管理的瀏覽器或原始 CDP 設定檔

  </Accordion>
</AccordionGroup>

## 沙盒機制與記憶體

<AccordionGroup>
  <Accordion title="是否有專門的沙盒文件？">
    有的。請參閱 [沙盒](/zh-Hant/gateway/sandboxing)。關於 Docker 特定設定（Docker 中的完整閘道或沙盒映像檔），請參閱 [Docker](/zh-Hant/install/docker)。
  </Accordion>

  <Accordion title="Docker 感覺受限 - 如何啟用完整功能？">
    預設映像檔以安全為先，並以 `node` 使用者身分執行，因此它不包含
    系統套件、Homebrew 或內建瀏覽器。若要進行更完整的設定：

    - 使用 `OPENCLAW_HOME_VOLUME` 持續保存 `/home/node`，以便快取得以保留。
    - 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 將系統相依項目建置至映像檔中。
    - 透過內建 CLI 安裝 Playwright 瀏覽器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 設定 `PLAYWRIGHT_BROWSERS_PATH` 並確保該路徑已被持續保存。

    文件：[Docker](/zh-Hant/install/docker)、[瀏覽器](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="我可以保持私訊個人化，但在同一個代理程式下將群組設為公開/沙盒化嗎？">
    可以 - 如果您的私人流量是 **私訊 (DMs)** 而公開流量是 **群組**。

    使用 `agents.defaults.sandbox.mode: "non-main"`，讓群組/頻道工作階段（非主要金鑰）在設定的沙盒後端中執行，而主要私訊工作階段則保持在主機上。如果您不選擇後端，Docker 是預設後端。然後透過 `tools.sandbox.tools` 限制沙盒化工作階段中可用的工具。

    設定逐步解說 + 範例設定：[群組：個人私訊 + 公開群組](/zh-Hant/channels/groups#pattern-personal-dms-public-groups-single-agent)

    主要設定參考：[閘道設定](/zh-Hant/gateway/config-agents#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="如何將主機資料夾綁定到沙箱中？">
    將 `agents.defaults.sandbox.docker.binds` 設定為 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全域 + 每個代理程式的綁定會合併；當 `scope: "shared"` 時，會忽略每個代理程式的綁定。對於任何敏感性內容，請使用 `:ro`，並記住綁定會繞過沙箱檔案系統的防護。

    OpenClaw 會針對正規化路徑以及透過最深的現有祖先解析出的標準路徑，驗證綁定來源。這意味著即使最後一個路徑區段尚不存在，符號連結父目錄的逃逸嘗試仍會封閉失敗，且在解析符號連結後仍會套用允許的根目錄檢查。

    範例與安全說明請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing#custom-bind-mounts) 和 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。

  </Accordion>

  <Accordion title="記憶體是如何運作的？">
    OpenClaw 的記憶體只是代理程式工作區中的 Markdown 檔案：

    - 位於 `memory/YYYY-MM-DD.md` 的每日筆記
    - 位於 `MEMORY.md` 的策劃長期筆記（僅限主要/私人階段）

    OpenClaw 還會執行 **靜默預壓縮記憶體排清**，以提醒模型
    在自動壓縮之前寫入持久化的筆記。這僅在工作區
    可寫入時執行（唯讀沙箱會跳過此步驟）。請參閱 [Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="記憶體一直忘記事情。我該如何讓它記住？">
    請要求機器人 **將事實寫入記憶體**。長期筆記應放在 `MEMORY.md`，
    短期內容則放入 `memory/YYYY-MM-DD.md`。

    這仍是我們正在改進的領域。提醒模型儲存記憶會有幫助；
    它會知道該做什麼。如果它持續忘記，請驗證 Gateway 在每次執行時是否使用相同
    的工作區。

    文件：[Memory](/zh-Hant/concepts/memory)、[Agent workspace](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="記憶體會永久保存嗎？有哪些限制？">
    記憶體檔案儲存在磁碟上，並會一直保存直到您將其刪除。限制在於您的
    儲存空間，而非模型本身。**工作階段內容** 仍然受限於模型的
    內容視窗，因此冗長的對話可能會被壓縮或截斷。這就是為什麼
    記憶體搜尋功能存在的原因——它只將相關的部分拉回內容中。

    文件：[記憶體](/zh-Hant/concepts/memory)、[內容](/zh-Hant/concepts/context)。

  </Accordion>

  <Accordion title="語意記憶體搜尋需要 OpenAI API 金鑰嗎？">
    只有當您使用 **OpenAI 嵌入** 時才需要。Codex OAuth 涵蓋了聊天/完成功能，
    但並**不**授予嵌入存取權限，因此**使用 Codex 登入（OAuth 或
    Codex CLI 登入）** 對語意記憶體搜尋沒有幫助。OpenAI 嵌入
    仍然需要實際的 API 金鑰（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果您沒有明確設定提供者，OpenClaw 會在能夠解析 API 金鑰時
    自動選擇提供者（auth profiles、`models.providers.*.apiKey` 或環境變數）。
    如果解析到 OpenAI 金鑰，它優先選擇 OpenAI；其次是解析到 Gemini 金鑰時選擇 Gemini，
    接著是 Voyage，然後是 Mistral。如果沒有可用的遠端金鑰，記憶體
    搜尋將保持停用狀態，直到您進行設定。如果您設定並存在本機模型路徑，
    OpenClaw 會優先使用 `local`。當您明確設定
    `memorySearch.provider = "ollama"` 時，支援 Ollama。

    如果您希望保持在本機，請設定 `memorySearch.provider = "local"`（並選擇性地
    設定 `memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，請設定
    `memorySearch.provider = "gemini"` 並提供 `GEMINI_API_KEY`（或
    `memorySearch.remote.apiKey`）。我們支援 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本機** 嵌入
    模型——詳見 [記憶體](/zh-Hant/concepts/memory) 的設定細節。

  </Accordion>
</AccordionGroup>

## 檔案在磁碟上的位置

<AccordionGroup>
  <Accordion title="OpenClaw 使用的所有資料都會在本機儲存嗎？">
    不會 - **OpenClaw 的狀態在本機**，但 **外部服務仍會看到您傳送給它們的內容**。

    - **預設為本機：** 會話、記憶檔案、設定和工作區位於 Gateway 主機上
      (`~/.openclaw` + 您的工作區目錄)。
    - **必要時為遠端：** 您傳送給模型提供商（Anthropic/OpenAI/等）的訊息會傳送至
      它們的 API，而聊天平台（WhatsApp/Telegram/Slack/等）會在其伺服器上儲存訊息資料。
    - **由您控制使用量：** 使用本機模型可將提示保留在您的機器上，但頻道
      流量仍會經過頻道的伺服器。

    相關主題：[Agent workspace](/zh-Hant/concepts/agent-workspace)、[Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 的數據存儲在哪裡？">
    所有內容都位於 `$OPENCLAW_STATE_DIR` 之下（預設值：`~/.openclaw`）：

    | Path                                                            | Purpose                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主要配置 (JSON5)                                                   |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 舊版 OAuth 導入（首次使用時複製到 auth profiles）                  |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 身份驗證配置文件 (OAuth, API keys 和可選的 `keyRef`/`tokenRef`) |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | 用於 `file` SecretRef 提供者的可選檔案支援密碼負載 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 舊版相容性檔案（已清除靜態 `api_key` 條目）               |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供者狀態（例如 `whatsapp/<accountId>/creds.json`）                       |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每個代理程式的狀態 (agentDir + sessions)                            |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 對話歷史與狀態 (每個代理程式)                                      |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Session 元數據 (每個代理程式)                                      |

    舊版單一代理程式路徑：`~/.openclaw/agent/*` (由 `openclaw doctor` 遷移)。

    您的 **workspace** (AGENTS.md, memory files, skills 等) 是分開的，並透過 `agents.defaults.workspace` 進行配置（預設值：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 應該放在哪裡？">
    這些檔案位於 **agent workspace**（代理程式工作區）中，而不是 `~/.openclaw`。

    - **Workspace (per agent)**（每個代理程式的工作區）：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md`、`memory/YYYY-MM-DD.md`、選用的 `HEARTBEAT.md`。
      小寫的根目錄 `memory.md` 僅用於舊版修復輸入；當兩個檔案都存在時，`openclaw doctor --fix`
      可以將其合併到 `MEMORY.md` 中。
    - **State dir (`~/.openclaw`)**（狀態目錄）：設定、通道/提供者狀態、設定檔、工作階段、記錄檔，
      以及共用技能（`~/.openclaw/skills`）。

    預設工作區是 `~/.openclaw/workspace`，可透過以下方式設定：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果機器人在重新啟動後「忘記」了資訊，請確認 Gateway 在每次啟動時都使用相同的
    工作區（並請記住：遠端模式使用的是 **gateway host's**（閘道主機的）
    工作區，而不是您本機的筆記型電腦）。

    提示：如果您想要持久的行為或偏好設定，請要求機器人 **將其寫入
    AGENTS.md 或 MEMORY.md**，而不是依賴聊天記錄。

    參閱 [Agent workspace](/zh-Hant/concepts/agent-workspace) 和 [Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="建議的備份策略">
    將您的 **agent workspace** 放在 **private**（私有）git 儲存庫中，並將其備份到某個
    私有位置（例如 GitHub 私有儲存庫）。這會擷取記憶體 + AGENTS/SOUL/USER
    檔案，並讓您稍後還原助手的「思維」。

    請**切勿**提交 `~/.openclaw` 下的任何內容（憑證、工作階段、權杖或加密的秘密承載）。
    如果您需要完整還原，請分別備份工作區和狀態目錄
    （請參閱上述移轉問題）。

    文件：[Agent workspace](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

<Accordion title="如何完全解除安裝 OpenClaw？">請參閱專屬指南：[Uninstall](/zh-Hant/install/uninstall)。</Accordion>

  <Accordion title="代理可以在工作區之外運作嗎？">
    可以。工作區是**預設的 cwd**（目前工作目錄）和記憶體錨點，而不是一個強制的沙箱。
    相對路徑會在工作區內解析，但除非啟用了沙箱功能，否則絕對路徑可以存取其他
    主機位置。如果您需要隔離，請使用
    [`agents.defaults.sandbox`](/zh-Hant/gateway/sandboxing) 或每個代理的沙箱設定。如果您
    希望某個儲存庫成為預設的工作目錄，請將該代理的
    `workspace` 指向該儲存庫的根目錄。OpenClaw 儲存庫只是原始碼；請將
    工作區分開，除非您有意讓代理在其中運作。

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

  </Accordion>

  <Accordion title="遠端模式：工作階段儲存在哪裡？">
    工作階段狀態由**閘道主機**擁有。如果您處於遠端模式，您關心的的工作階段儲存是在遠端機器上，而不是在您的本機筆記型電腦上。請參閱[工作階段管理](/zh-Hant/concepts/session)。
  </Accordion>
</AccordionGroup>

## 設定基礎

<AccordionGroup>
  <Accordion title="設定檔是什麼格式？它在哪裡？">
    OpenClaw 會從 `$OPENCLAW_CONFIG_PATH` 讀取選用的 **JSON5** 設定檔（預設值：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果檔案不存在，它會使用大致安全的預設值（包括預設的工作區 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我設定了 gateway.bind: "lan" (或 "tailnet") 但現在沒有任何監聽 / UI 顯示未授權'>
    非迴路綁定 **需要有效的閘道驗證路徑**。實務上這表示：

    - shared-secret auth：token 或密碼
    - 在正確設定的非迴路身分感知反向代理後方的 `gateway.auth.mode: "trusted-proxy"`

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

    註記：

    - `gateway.remote.token` / `.password` **不會**單獨啟用本地閘道驗證。
    - 本地呼叫路徑僅在 `gateway.auth.*` 未設定時，才能將 `gateway.remote.*` 作為後備。
    - 若使用密碼驗證，請改為設定 `gateway.auth.mode: "password"` 加上 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
    - 若 `gateway.auth.token` / `gateway.auth.password` 透過 SecretRef 明確設定且無法解析，解析會以封閉式失敗處理 (不會有遠端後備遮罩)。
    - Shared-secret Control UI 設定會透過 `connect.params.auth.token` 或 `connect.params.auth.password` (儲存於 app/UI 設定中) 進行驗證。承載身分的模式 (如 Tailscale Serve 或 `trusted-proxy`) 則改用請求標頭。請避免在 URL 中放入 shared secrets。
    - 使用 `gateway.auth.mode: "trusted-proxy"` 時，同主機的迴路反向代理仍 **不會** 滿足 trusted-proxy auth。受信任的代理必須是設定的非迴路來源。

  </Accordion>

  <Accordion title="Why do I need a token on localhost now?">
    OpenClaw 預設會強制執行閘道驗證，包括本機迴路。在正常的預設路徑中，這意味著使用 Token 驗證：如果未設定明確的驗證路徑，閘道啟動時會解析為 Token 模式並自動產生一個，將其儲存至 `gateway.auth.token`，因此 **本機 WebSocket 用戶端必須通過驗證**。這可阻擋其他本機程序呼叫閘道。

    如果您偏好不同的驗證路徑，可以明確選擇密碼模式（或者，對於非本機迴路的具備身分識別感知的反向代理，使用 `trusted-proxy`）。如果您**真的**想要開放本機迴路，請在設定中明確設定 `gateway.auth.mode: "none"`。Doctor 可以隨時為您產生 Token：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="Do I have to restart after changing config?">
    閘道會監視設定並支援熱重載：

    - `gateway.reload.mode: "hybrid"` (預設)：熱套用安全變更，針對關鍵變更則重新啟動
    - `hot`、`restart`、`off` 也受支援

  </Accordion>

  <Accordion title="How do I disable funny CLI taglines?">
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

    - `off`：隱藏標語文字，但保留標題/版本列。
    - `default`：每次都使用 `All your chats, one OpenClaw.`。
    - `random`：輪換顯示有趣/季節性標語（預設行為）。
    - 如果您完全不想要橫幅，請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何啟用網路搜尋（以及網路擷取）？">
    `web_fetch` 不需要 API 金鑰。`web_search` 取決於您選擇的
    供應商：

    - 支援 API 的供應商，例如 Brave、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Perplexity 和 Tavily，需要其正常的 API 金鑰設定。
    - Ollama 網路搜尋免金鑰，但它使用您設定的 Ollama 主機並且需要 `ollama signin`。
    - DuckDuckGo 免金鑰，但它是一個非官方的 HTML 整合。
    - SearXNG 免金鑰/自託管；請設定 `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`。

    **建議：** 執行 `openclaw configure --section web` 並選擇一個供應商。
    環境變數替代方案：

    - Brave: `BRAVE_API_KEY`
    - Exa: `EXA_API_KEY`
    - Firecrawl: `FIRECRAWL_API_KEY`
    - Gemini: `GEMINI_API_KEY`
    - Grok: `XAI_API_KEY`
    - Kimi: `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
    - MiniMax Search: `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`
    - Perplexity: `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`
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

    供應商專屬的網路搜尋設定現在位於 `plugins.entries.<plugin>.config.webSearch.*`。
    舊版 `tools.web.search.*` 供應商路徑為了相容性暫時仍會載入，但不應用於新設定。
    Firecrawl 網路擷取後援設定位於 `plugins.entries.firecrawl.config.webFetch.*`。

    說明：

    - 如果您使用允許清單，請新增 `web_search`/`web_fetch`/`x_search` 或 `group:web`。
    - `web_fetch` 預設為啟用（除非明確停用）。
    - 如果省略 `tools.web.fetch.provider`，OpenClaw 會從可用的認證中自動偵測第一個就緒的擷取後援供應商。目前內建的供應商是 Firecrawl。
    - Daemon 從 `~/.openclaw/.env`（或服務環境）讀取環境變數。

    文件：[Web tools](/zh-Hant/tools/web)。

  </Accordion>

  <Accordion title="config.apply 清除了我的設定。我該如何復原並避免再次發生？">
    `config.apply` 會取代**整個設定**。如果您傳送部分物件，其他所有內容
    都會被移除。

    目前的 OpenClaw 可防止許多意外覆寫的情況：

    - OpenClaw 擁有的設定寫入會在寫入前驗證完整的變更後設定。
    - 無效或破壞性的 OpenClaw 擁有之寫入會被拒絕並儲存為 `openclaw.json.rejected.*`。
    - 如果直接編輯導致啟動或熱載入失敗，Gateway 會恢復最後已知良好的設定，並將遭拒絕的檔案儲存為 `openclaw.json.clobbered.*`。
    - 主要代理程式會在復原後收到啟動警告，以免盲目再次寫入錯誤的設定。

    復原：

    - 檢查 `openclaw logs --follow` 中的 `Config auto-restored from last-known-good`、`Config write rejected:` 或 `config reload restored last-known-good config`。
    - 檢查現用設定旁邊最新的 `openclaw.json.clobbered.*` 或 `openclaw.json.rejected.*`。
    - 如果現用的已復原設定可正常運作則予以保留，然後使用 `openclaw config set` 或 `config.patch` 僅複製預定的金鑰回來。
    - 執行 `openclaw config validate` 和 `openclaw doctor`。
    - 如果您沒有最後已知良好或遭拒絕的負載，請從備份還原，或重新執行 `openclaw doctor` 並重新設定通道/模型。
    - 如果此情況出乎意料，請回報錯誤並附上您最後已知的設定或任何備份。
    - 本地端編碼代理程式通常可以從記錄或歷史記錄重建可運作的設定。

    避免發生：

    - 使用 `openclaw config set` 進行小幅變更。
    - 使用 `openclaw configure` 進行互動式編輯。
    - 當您不確確切路徑或欄位形狀時，請先使用 `config.schema.lookup`；它會傳回淺層架構節點以及用於下鑽的立即子項摘要。
    - 使用 `config.patch` 進行部分 RPC 編輯；請將 `config.apply` 僅用於完整設定取代。
    - 如果您在代理程式執行期間使用僅限擁有者的 `gateway` 工具，它仍會拒絕對 `tools.exec.ask` / `tools.exec.security` 的寫入（包括正規化為相同受保護執行路徑的舊版 `tools.bash.*` 別名）。

    文件：[設定](/zh-Hant/cli/config)、[組態](/zh-Hant/cli/configure)、[Gateway 疑難排解](/zh-Hant/gateway/troubleshooting#gateway-restored-last-known-good-config)、[Doctor](/zh-Hant/gateway/doctor)。

  </Accordion>

  <Accordion title="如何在不同設備上運行具有專用工作程式的中央 Gateway？">
    常見的模式是 **一個 Gateway**（例如 Raspberry Pi）加上 **節點** 和 **代理程式**：

    - **Gateway (中央)：** 擁有通道、路由和會話。
    - **節點 (設備)：** Mac/iOS/Android 作為外設連接並公開本地工具 (`system.run`, `canvas`, `camera`)。
    - **代理程式 (工作程式)：** 用於特殊角色的獨立大腦/工作區（例如 "Hetzner ops"、「個人資料」）。
    - **子代理程式：** 當您需要並行處理時，從主代理程式產生背景工作。
    - **TUI：** 連接到 Gateway 並切換代理程式/會話。

    文檔：[節點](/zh-Hant/nodes), [遠端存取](/zh-Hant/gateway/remote), [多代理程式路由](/zh-Hant/concepts/multi-agent), [子代理程式](/zh-Hant/tools/subagents), [TUI](/zh-Hant/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 瀏覽器可以無頭模式運行嗎？">
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

    預設為 `false` (有頭模式)。無頭模式更有可能在某些網站上觸發反機器人檢查。請參閱 [瀏覽器](/zh-Hant/tools/browser)。

    無頭模式使用 **相同的 Chromium 引擎**，並適用於大多數自動化（表單、點擊、抓取、登入）。主要差異：

    - 沒有可見的瀏覽器視窗（如果您需要視覺效果，請使用截圖）。
    - 某些網站對無頭模式下的自動化更嚴格（驗證碼、反機器人）。
      例如，X/Twitter 經常阻止無頭會話。

  </Accordion>

  <Accordion title="如何使用 Brave 進行瀏覽器控制？">
    將 `browser.executablePath` 設定為您的 Brave 執行檔（或任何基於 Chromium 的瀏覽器）並重新啟動 Gateway。
    請參閱 [瀏覽器](/zh-Hant/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置範例。
  </Accordion>
</AccordionGroup>

## 遠端 Gateway 和節點

<AccordionGroup>
  <Accordion title="指令如何從 Telegram、閘道和節點之間傳播？">
    Telegram 訊息由**閘道** 處理。閘道執行 Agent，
    並且僅在需要節點工具時，透過 **Gateway WebSocket** 呼叫節點：

    Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

    節點看不到入站提供商流量；它們僅接收節點 RPC 呼叫。

  </Accordion>

  <Accordion title="如果 Gateway 託管在遠端，我的 Agent 如何存取我的電腦？">
    簡短回答：**將您的電腦配對為節點**。Gateway 在其他地方運行，但它可以
    透過 Gateway WebSocket 呼叫您本機上的 `node.*` 工具（螢幕、相機、系統）。

    典型設定：

    1. 在永遠在線的主機（VPS/家用伺服器）上運行 Gateway。
    2. 將 Gateway 主機和您的電腦放在同一個 tailnet 上。
    3. 確保 Gateway WS 可達（tailnet bind 或 SSH tunnel）。
    4. 在本機開啟 macOS 應用程式並以 **Remote over SSH** 模式（或直接透過 tailnet）連線，
       以便它能註冊為節點。
    5. 在 Gateway 上核准節點：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要單獨的 TCP 橋接器；節點透過 Gateway WebSocket 連線。

    安全提醒：配對 macOS 節點允許在該機器上進行 `system.run`。僅
    配對您信任的裝置，並參閱 [Security](/zh-Hant/gateway/security)。

    文件：[Nodes](/zh-Hant/nodes)、[Gateway protocol](/zh-Hant/gateway/protocol)、[macOS remote mode](/zh-Hant/platforms/mac/remote)、[Security](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已連線但我沒收到回覆。現在該怎麼辦？">
    檢查基本項：

    - Gateway 正在執行：`openclaw gateway status`
    - Gateway 健康狀態：`openclaw status`
    - 頻道健康狀態：`openclaw channels status`

    然後驗證驗證和路由：

    - 如果您使用 Tailscale Serve，請確保 `gateway.auth.allowTailscale` 設定正確。
    - 如果您透過 SSH 通道連線，請確認本機通道已啟動並指向正確的連接埠。
    - 確認您的允許清單（DM 或群組）包含您的帳號。

    文件：[Tailscale](/zh-Hant/gateway/tailscale)、[遠端存取](/zh-Hant/gateway/remote)、[頻道](/zh-Hant/channels)。

  </Accordion>

  <Accordion title="兩個 OpenClaw 實例可以互相通訊嗎（本機 + VPS）？">
    可以。沒有內建的「bot-to-bot」橋接器，但您可以透過幾種可靠的方式將其連接起來：

    **最簡單：** 使用兩個機器人都能存取的普通聊天頻道（Telegram/Slack/WhatsApp）。
    讓機器人 A 傳送訊息給機器人 B，然後讓機器人 B 像平常一樣回覆。

    **CLI 橋接器（通用）：** 執行一個腳本，使用 `openclaw agent --message ... --deliver` 呼叫另一個 Gateway，
    目標設為另一個機器人監聽的聊天。如果其中一個機器人在遠端 VPS 上，請透過 SSH/Tailscale 將您的 CLI 指向該遠端 Gateway
    （請參閱 [遠端存取](/zh-Hant/gateway/remote)）。

    範例模式（從可以連線到目標 Gateway 的機器執行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：加入防護措施，以免兩個機器人無限迴圈（僅限提及、頻道
    允許清單，或是「不要回覆機器人訊息」規則）。

    文件：[遠端存取](/zh-Hant/gateway/remote)、[Agent CLI](/zh-Hant/cli/agent)、[Agent send](/zh-Hant/tools/agent-send)。

  </Accordion>

  <Accordion title="多個代理是否需要分開的 VPS？">
    不需要。一個 Gateway 可以代管多個代理，每個代理都有自己的工作區、模型預設值
    和路由。這是標準設定，比每個代理運行一個 VPS 更便宜且簡單。

    只有當您需要強隔離（安全邊界）或您不想分享的差異很大的設定時，才使用分開的 VPS。
    否則，請保留一個 Gateway 並使用多個代理或子代理。

  </Accordion>

  <Accordion title="與從 VPS 使用 SSH 相比，在我的個人筆記型電腦上使用節點有什麼好處嗎？">
    是的——節點是從遠端 Gateway 存取您的筆記型電腦的首選方式，它們
    解鎖的功能不僅僅是 shell 存取。Gateway 運行在 macOS/Linux（Windows 透過 WSL2）上，並且
    是輕量級的（小型 VPS 或 Raspberry Pi 級別的盒子即可；4 GB RAM 綽綽有餘），因此常見的
    設定是一個永遠開機的主機加上您的筆記型電腦作為節點。

    - **不需要傳入 SSH。** 節點向外連接到 Gateway WebSocket 並使用裝置配對。
    - **更安全的執行控制。** `system.run` 受到該筆記型電腦上節點允許列表/核准的閘控。
    - **更多裝置工具。** 除了 `system.run` 之外，節點還公開了 `canvas`、`camera` 和 `screen`。
    - **本機瀏覽器自動化。** 將 Gateway 保留在 VPS 上，但透過筆記型電腦上的節點主機在本機執行 Chrome，或透過 Chrome MCP 附加到主機上的本機 Chrome。

    SSH 適合臨時的 shell 存取，但對於持續的代理工作流程和
    裝置自動化，節點更簡單。

    文件：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)、[瀏覽器](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="節點是否會執行閘道服務？">
    不會。除非您刻意執行獨立的設定檔（請參閱[多個閘道](/zh-Hant/gateway/multiple-gateways)），否則每台主機應該只執行**一個閘道**。節點是連線到閘道的周邊裝置（iOS/Android 節點，或選單列應用程式中的 macOS「節點模式」）。如需無頭節點主機和 CLI 控制，請參閱[節點主機 CLI](/zh-Hant/cli/node)。

    變更 `gateway`、`discovery` 和 `canvasHost` 後需要完整重新啟動。

  </Accordion>

  <Accordion title="是否有 API / RPC 方式可以套用設定？">
    有的。

    - `config.schema.lookup`：在寫入前檢查一個設定子樹、其淺層架構節點、相符的 UI 提示以及直接子項摘要
    - `config.get`：取得目前的快照 + 雜湊
    - `config.patch`：安全的部分更新（大多數 RPC 編輯的首選）；盡可能進行熱重新載入，必要時則重新啟動
    - `config.apply`：驗證並取代完整設定；盡可能進行熱重新載入，必要時則重新啟動
    - 僅限擁有者使用的 `gateway` 執行時期工具仍然拒絕覆寫 `tools.exec.ask` / `tools.exec.security`；舊版的 `tools.bash.*` 別名會正規化為相同的受保護執行路徑

  </Accordion>

  <Accordion title="初次安裝的最低合理設定">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    這會設定您的工作區並限制誰可以觸發機器人。

  </Accordion>

  <Accordion title="我如何在 VPS 上設置 Tailscale 並從我的 Mac 連接？">
    最低步驟：

    1. **在 VPS 上安裝 + 登入**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在您的 Mac 上安裝 + 登入**
       - 使用 Tailscale 應用程式並登入同一個 tailnet。
    3. **啟用 MagicDNS（建議）**
       - 在 Tailscale 管理控制台中，啟用 MagicDNS，以便 VPS 擁有穩定的名稱。
    4. **使用 tailnet 主機名稱**
       - SSH：`ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS：`ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果您希望在不使用 SSH 的情況下使用控制 UI，請在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    這會將 Gateway 綁定到 loopback 並透過 Tailscale 公開 HTTPS。請參閱 [Tailscale](/zh-Hant/gateway/tailscale)。

  </Accordion>

  <Accordion title="我如何將 Mac 節點連接到遠端 Gateway (Tailscale Serve)？">
    Serve 會公開 **Gateway Control UI + WS**。節點透過相同的 Gateway WS 端點進行連接。

    建議的設置：

    1. **確保 VPS + Mac 位於同一個 tailnet 上**。
    2. **在遠端模式下使用 macOS 應用程式**（SSH 目標可以是 tailnet 主機名稱）。
       應用程式將會對 Gateway 連接埠進行通道連接並作為節點連線。
    3. **在 gateway 上核准該節點**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文件：[Gateway 協定](/zh-Hant/gateway/protocol)、[發現](/zh-Hant/gateway/discovery)、[macOS 遠端模式](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我應該在第二台筆記型電腦上安裝還是只新增一個節點？">
    如果您只需要在第二台筆記型電腦上使用 **本機工具**（螢幕/相機/exec），請將其新增為
    **節點**。這樣可以保持單一 Gateway 並避免重複的配置。本機節點工具目前僅支援 macOS，但我們計劃將其擴展到其他作業系統。

    只有當您需要 **強隔離** 或兩個完全分離的機器人時，才安裝第二個 Gateway。

    文件：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)、[多個 Gateway](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 環境變數與 .env 載入

<AccordionGroup>
  <Accordion title="OpenClaw 如何載入環境變數？">
    OpenClaw 會從父進程（shell、launchd/systemd、CI 等）讀取環境變數，並額外載入：

    - 來自當前工作目錄的 `.env`
    - 來自 `~/.openclaw/.env`（即 `$OPENCLAW_STATE_DIR/.env`）的全局後備 `.env`

    兩個 `.env` 檔案都不會覆蓋既有的環境變數。

    您也可以在配置中定義行內環境變數（僅在進程環境中缺失時套用）：

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    如需完整的優先順序和來源，請參閱 [/environment](/zh-Hant/help/environment)。

  </Accordion>

  <Accordion title="我透過服務啟動了 Gateway，但環境變數消失了。現在該怎麼辦？">
    兩個常見的修復方法：

    1. 將缺失的金鑰放入 `~/.openclaw/.env`，以便在服務未繼承您的 shell 環境時也能被載入。
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

    這會執行您的登入 shell 並僅匯入缺失的預期金鑰（絕不覆蓋）。等效的環境變數：
    `OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我設定了 COPILOT_GITHUB_TOKEN，但模型狀態顯示「Shell env: off.」。為什麼？'>
    `openclaw models status` 回報是否已啟用 **shell env import**。「Shell env: off」
    **並不**表示您的環境變數遺失——這只是意味著 OpenClaw 不會自動載入
    您的登入 shell。

    如果 Gateway 作為服務（launchd/systemd）運行，它將不會繼承您的 shell
    環境。請透過以下任一方式修復：

    1. 將 token 放入 `~/.openclaw/.env`：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或啟用 shell 載入（`env.shellEnv.enabled: true`）。
    3. 或將其新增到您的設定 `env` 區塊（僅在遺失時適用）。

    然後重新啟動 gateway 並重新檢查：

    ```bash
    openclaw models status
    ```

    Copilot token 是從 `COPILOT_GITHUB_TOKEN` 讀取的（同時也支援 `GH_TOKEN` / `GITHUB_TOKEN`）。
    請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers) 和 [/environment](/zh-Hant/help/environment)。

  </Accordion>
</AccordionGroup>

## Sessions and multiple chats

<AccordionGroup>
  <Accordion title="如何開始新的對話？">
    發送 `/new` 或 `/reset` 作為獨立訊息。請參閱 [Session management](/zh-Hant/concepts/session)。
  </Accordion>

  <Accordion title="如果我不傳送 /new，sessions 會自動重置嗎？">
    Sessions 可以在 `session.idleMinutes` 後過期，但這是**預設停用**的（預設值為 **0**）。
    將其設為正數以啟用閒置過期。啟用後，閒置期間之後的**下一則**
    訊息將為該聊天金鑰啟動新的 session id。
    這不會刪除逐字稿——這只是啟動一個新的 session。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有沒有辦法建立一個 OpenClaw 實例團隊（一個 CEO 和許多代理程式）？">
    有的，透過**多代理路由** 和**子代理程式**。您可以建立一個協調器
    代理程式和幾個工作代理程式，並擁有各自的工作區和模型。

    不過，這最好視為一個**有趣的實驗**。這非常消耗 token，且往往
    比使用單一機器人搭配不同會話的效率更低。我們設想的典型模式
    是您與一個機器人對話，並使用不同的會話進行平行工作。該
    機器人也可以在需要時生成子代理程式。

    文件：[多代理路由](/zh-Hant/concepts/multi-agent)、[子代理程式](/zh-Hant/tools/subagents)、[代理程式 CLI](/zh-Hant/cli/agents)。

  </Accordion>

  <Accordion title="為什麼任務進行到一半時內容被截斷了？我該如何預防？">
    會話內容受限於模型的視窗大小。長時間的聊天、龐大的工具輸出，或許多
    檔案都可能觸發壓縮或截斷。

    以下方法有幫助：

    - 要求機器人總結當前狀態並寫入檔案。
    - 在執行長時間任務前使用 `/compact`，並在切換主題時使用 `/new`。
    - 將重要內容保留在工作區中，並要求機器人重新讀取。
    - 對於長時間或平行的作業，使用子代理程式，讓主對話保持精簡。
    - 如果這種情況經常發生，請選擇具有更大內容視窗的模型。

  </Accordion>

  <Accordion title="如何在不解除安裝的情況下完全重置 OpenClaw？">
    使用重置指令：

    ```bash
    openclaw reset
    ```

    非互動式完整重置：

    ```bash
    openclaw reset --scope full --yes --non-interactive
    ```

    然後重新執行安裝設定：

    ```bash
    openclaw onboard --install-daemon
    ```

    備註：

    - 如果新手引導發現現有設定，也會提供**重置** 選項。請參閱 [新手引導 (CLI)](/zh-Hant/start/wizard)。
    - 如果您使用了設定檔 (`--profile` / `OPENCLAW_PROFILE`)，請重置每個狀態目錄 (預設為 `~/.openclaw-<profile>`)。
    - 開發重置：`openclaw gateway --dev --reset` (僅限開發；清除開發設定 + 憑證 + 會話 + 工作區)。

  </Accordion>

  <Accordion title='我收到「context too large」錯誤 - 如何重置或壓縮？'>
    使用以下其中一種方法：

    - **壓縮**（保留對話但總結較舊的回合）：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 來引導總結。

    - **重置**（為相同的聊天金鑰產生新的會話 ID）：

      ```
      /new
      /reset
      ```

    如果問題持續發生：

    - 啟用或調整 **session pruning**（`agents.defaults.contextPruning`）以修剪舊的工具輸出。
    - 使用具有較大上下文視窗的模型。

    文件：[壓縮](/zh-Hant/concepts/compaction)、[會話修剪](/zh-Hant/concepts/session-pruning)、[會話管理](/zh-Hant/concepts/session)。

  </Accordion>

  <Accordion title='為什麼我看到「LLM request rejected: messages.content.tool_use.input field required」？'>
    這是一個提供者驗證錯誤：模型發出了 `tool_use` 區塊但缺少必需的
    `input`。這通常意味著會話歷程已過時或損壞（通常發生在長對話串
    或工具/架構變更之後）。

    解決方法：使用 `/new`（獨立訊息）開啟新會話。

  </Accordion>

  <Accordion title="為什麼我每 30 分鐘會收到心跳訊息？">
    心跳預設每 **30 分鐘** 執行一次（使用 OAuth 驗證時為 **1 小時**）。您可以調整或停用它們：

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

    如果 `HEARTBEAT.md` 存在但實質上為空（僅包含空白行和像 `# Heading` 這樣的 markdown
    標題），OpenClaw 會跳過心跳執行以節省 API 呼叫。
    如果檔案不存在，心跳仍會執行並由模型決定要執行什麼操作。

    每個代理的覆寫使用 `agents.list[].heartbeat`。文件：[心跳](/zh-Hant/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我是否需要將「機器人帳號」新增到 WhatsApp 群組？'>
    不需要。OpenClaw 運行在**您自己的帳號**上，因此如果您在群組中，OpenClaw 就可以看到它。
    預設情況下，群組回覆會被阻擋，直到您允許發送者 (`groupPolicy: "allowlist"`)。

    如果您希望只有**您**能夠觸發群組回覆：

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

  <Accordion title="如何取得 WhatsApp 群組的 JID？">
    選項 1（最快）：追蹤日誌並在群組中發送測試訊息：

    ```bash
    openclaw logs --follow --json
    ```

    尋找以 `@g.us` 結尾的 `chatId`（或 `from`），例如：
    `1234567890-1234567890@g.us`。

    選項 2（如果已經配置/加入白名單）：從配置中列出群組：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文件：[WhatsApp](/zh-Hant/channels/whatsapp)、[Directory](/zh-Hant/cli/directory)、[Logs](/zh-Hant/cli/logs)。

  </Accordion>

  <Accordion title="為什麼 OpenClaw 不在群組中回覆？">
    兩個常見原因：

    - 提及閘門已開啟（預設）。您必須 @提及機器人（或符合 `mentionPatterns`）。
    - 您配置了 `channels.whatsapp.groups` 但沒有 `"*"`，且該群組未被加入白名單。

    請參閱 [Groups](/zh-Hant/channels/groups) 和 [Group messages](/zh-Hant/channels/group-messages)。

  </Accordion>

<Accordion title="群組/執行緒是否與私訊 (DM) 共用上下文？">私人聊天預設會折疊到主會話。群組/頻道有自己的會話金鑰，而 Telegram 主題 / Discord 執行緒是獨立的會話。請參閱 [Groups](/zh-Hant/channels/groups) 和 [Group messages](/zh-Hant/channels/group-messages)。</Accordion>

  <Accordion title="我可以建立多少個工作區和代理程式？">
    沒有硬性限制。數十個（甚至數百個）都沒問題，但請注意：

    - **磁碟空間增長：** 會話和逐字稿儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本：** 更多代理程式意味著更多的並發模型使用量。
    - **營運負擔：** 每個代理程式的驗證設定檔、工作區和通道路由。

    提示：

    - 每個代理程式保持一個 **作用中** 的工作區 (`agents.defaults.workspace`)。
    - 如果磁碟空間增加，請修剪舊的會話（刪除 JSONL 或儲存條目）。
    - 使用 `openclaw doctor` 來發現散亂的工作區和設定檔不符的情況。

  </Accordion>

  <Accordion title="我可以同時執行多個機器人或聊天嗎 (Slack)，該如何設定？">
    是的。使用 **多代理程式路由** 來執行多個獨立的代理程式，並根據通道/帳戶/對等節點路由傳入訊息。Slack 支援作為一個通道，並可以綁定到特定的代理程式。

    瀏覽器存取功能強大，但並非「可以做任何人類能做的事」——反機器人措施、CAPTCHAs 和 MFA 仍然可能阻擋自動化。為了獲得最可靠的瀏覽器控制，請在主機上使用本機 Chrome MCP，或在實際執行瀏覽器的機器上使用 CDP。

    最佳實踐設定：

    - 永遠開機的閘道主機 (VPS/Mac mini)。
    - 每個角色一個代理程式 (綁定)。
    - 綁定到這些代理程式的 Slack 通道。
    - 根據需要透過 Chrome MCP 或節點使用本機瀏覽器。

    文件：[多代理程式路由](/zh-Hant/concepts/multi-agent)、[Slack](/zh-Hant/channels/slack)、
    [瀏覽器](/zh-Hant/tools/browser)、[節點](/zh-Hant/nodes)。

  </Accordion>
</AccordionGroup>

## 模型、故障轉移和驗證設定檔

模型常見問題解答 — 預設值、選擇、別名、切換、故障轉移、驗證設定檔 —
位於 [模型常見問題解答](/zh-Hant/help/faq-models)。

## 閘道器：連接埠、「已在執行」和遠端模式

<AccordionGroup>
  <Accordion title="閘道器使用哪個連接埠？">
    `gateway.port` 控制用於 WebSocket + HTTP（控制 UI、hooks 等）的單一多工連接埠。

    優先順序：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='為什麼 openclaw gateway 顯示「Runtime: running」但「Connectivity probe: failed」？'>
    因為「running」是 **supervisor's** 的視角（launchd/systemd/schtasks）。連線探測是指 CLI 實際連接到 gateway WebSocket。

    使用 `openclaw gateway status` 並相信這幾行：

    - `Probe target:`（探測實際使用的 URL）
    - `Listening:`（連接埠上實際綁定的內容）
    - `Last gateway error:`（常見的根本原因：程序存活但連接埠未監聽）

  </Accordion>

  <Accordion title='為什麼 openclaw gateway 顯示「Config (cli)」與「Config (service)」不同？'>
    您正在編輯一個配置文件，但服務運行的是另一個（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    修正方法：

    ```bash
    openclaw gateway install --force
    ```

    請從您希望服務使用的相同 `--profile` / 環境中執行該指令。

  </Accordion>

  <Accordion title='「another gateway instance is already listening」是什麼意思？'>
    OpenClaw 透過在啟動時立即綁定 WebSocket 監聽器（預設 `ws://127.0.0.1:18789`）來強制執行運行時鎖。如果綁定失敗並顯示 `EADDRINUSE`，它會拋出 `GatewayLockError`，表示已有另一個實例正在監聽。

    修正方法：停止另一個實例，釋放連接埠，或使用 `openclaw gateway --port <port>` 執行。

  </Accordion>

  <Accordion title="我如何在遠端模式下執行 OpenClaw（用戶端連線到其他地方的 Gateway）？">
    設定 `gateway.mode: "remote"` 並指向遠端 WebSocket URL，可選擇搭配共用金鑰的遠端認證資訊：

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

    - `openclaw gateway` 僅在 `gateway.mode` 為 `local` 時啟動（或者您傳入覆寫標誌）。
    - macOS 應用程式會監看設定檔，並在這些數值變更時即時切換模式。
    - `gateway.remote.token` / `.password` 僅是用戶端遠端認證資訊；它們本身不會啟用本地 gateway 驗證。

  </Accordion>

  <Accordion title='控制介面顯示「未授權」（或持續重新連線）。現在該怎麼辦？'>
    您的閘道驗證路徑與 UI 的驗證方法不符。

    事實（來自程式碼）：

    - 控制介面會將權杖保留在 `sessionStorage` 中，用於目前的瀏覽器分頁階段和選定的閘道 URL，因此同分頁重新整理能持續運作，無需還原長期存活的 localStorage 權杖持久性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，當閘道傳回重試提示（`canRetryWithDeviceToken=true`、`recommendedNextStep=retry_with_device_token`）時，受信任的用戶端可以嘗試使用快取的裝置權杖進行一次有界的重試。
    - 該快取權杖重試現在會重用與裝置權杖一起儲存的快取已核准範圍。明確的 `deviceToken` / 明確的 `scopes` 呼叫端仍會保留其要求的範圍集合，而不是繼承快取的範圍。
    - 在該重試路徑之外，連線驗證優先順序首先是明確的共享權杖/密碼，然後是明確的 `deviceToken`，接著是儲存的裝置權杖，最後是啟動權杖。
    - 啟動權杖範圍檢查會加上角色前綴。內建啟動操作員允許清單僅滿足操作員請求；節點或其他非操作員角色仍需要在其自己的角色前綴下具備範圍。

    修復方法：

    - 最快：`openclaw dashboard`（列印並複製儀表板 URL，嘗試開啟；如果是無介面模式則顯示 SSH 提示）。
    - 如果您還沒有權杖：`openclaw doctor --generate-gateway-token`。
    - 如果是遠端，請先建立通道：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然後開啟 `http://127.0.0.1:18789/`。
    - 共用金鑰模式：設定 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然後在控制介面設定中貼上相符的密鑰。
    - Tailscale Serve 模式：確保已啟用 `gateway.auth.allowTailscale`，且您正在開啟 Serve URL，而不是繞過 Tailscale 身分標頭的原始回環/tailnet URL。
    - 受信任代理模式：確保您是透過設定的非回環身分感知代理連線，而不是同主機回環代理或原始閘道 URL。
    - 如果在一次重試後仍然不匹配，請輪換/重新核准配對的裝置權杖：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 如果該輪換呼叫表示被拒絕，請檢查兩件事：
      - 配對裝置階段只能輪換其**自己的**裝置，除非它們也具有 `operator.admin`
      - 明確的 `--scope` 值不能超過呼叫端目前的操作員範圍
    - 仍然卡住了？執行 `openclaw status --all` 並依照 [疑難排解](/zh-Hant/gateway/troubleshooting) 操作。請參閱 [儀表板](/zh-Hant/web/dashboard) 以取得驗證詳細資訊。

  </Accordion>

  <Accordion title="我設定了 gateway.bind 為 tailnet，但它無法綁定且沒有任何監聽">
    `tailnet` 會從您的網路介面 (100.64.0.0/10) 中選取一個 Tailscale IP。如果該機器不在 Tailscale 上（或介面已關閉），則沒有物件可進行綁定。

    修復方法：

    - 在該主機上啟動 Tailscale（使其擁有 100.x 位址），或
    - 切換至 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是顯式的。`auto` 偏好 loopback；當您僅想要 tailnet 綁定時請使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="我可以在同一台主機上執行多個 Gateway 嗎？">
    通常不行——一個 Gateway 可以執行多個訊息通道和代理程式。僅當您需要冗餘（例如：救援機器人）或嚴格隔離時才使用多個 Gateway。

    可以，但您必須隔離：

    - `OPENCLAW_CONFIG_PATH`（每個執行個體的設定）
    - `OPENCLAW_STATE_DIR`（每個執行個體的狀態）
    - `agents.defaults.workspace`（工作區隔離）
    - `gateway.port`（唯一連接埠）

    快速設定（建議）：

    - 每個執行個體使用 `openclaw --profile <name> ...`（會自動建立 `~/.openclaw-<name>`）。
    - 在每個設定檔中設定唯一的 `gateway.port`（或針對手動執行傳遞 `--port`）。
    - 安裝每個設定檔的服務：`openclaw --profile <name> gateway install`。

    設定檔也會為服務名稱加上後綴（`ai.openclaw.<profile>`；舊版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
    完整指南：[Multiple gateways](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='「無效的握手」/ 代碼 1008 是什麼意思？'>
    Gateway 是一個 **WebSocket 伺服器**，它預期第一條訊息必須是
    一個 `connect` 幀。如果收到其他任何內容，它會以
    **代碼 1008**（策略違規）關閉連線。

    常見原因：

    - 您在瀏覽器中開啟了 **HTTP** URL (`http://...`) 而不是 WS 客戶端。
    - 您使用了錯誤的連接埠或路徑。
    - 代理或隧道移除了標頭或發送了非 Gateway 請求。

    快速修復：

    1. 使用 WS URL：`ws://<host>:18789` (如果是 HTTPS 則使用 `wss://...`)。
    2. 不要在正常的瀏覽器分頁中開啟 WS 連接埠。
    3. 如果開啟了身份驗證，請在 `connect` 幀中包含權杖/密碼。

    如果您使用的是 CLI 或 TUI，URL 應該看起來像這樣：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    協議詳情：[Gateway 協議](/zh-Hant/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 日誌記錄與除錯

<AccordionGroup>
  <Accordion title="日誌在哪裡？">
    檔案日誌（結構化）：

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    您可以透過 `logging.file` 設定穩定的路徑。檔案日誌層級由 `logging.level` 控制。主控台詳細程度由 `--verbose` 和 `logging.consoleLevel` 控制。

    最快的日誌追蹤：

    ```bash
    openclaw logs --follow
    ```

    服務/監督程式日誌（當 gateway 透過 launchd/systemd 執行時）：

    - macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log` (預設：`~/.openclaw/logs/...`；設定檔使用 `~/.openclaw-<profile>/logs/...`)
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    詳情請參閱 [疑難排解](/zh-Hant/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="如何啟動/停止/重新啟動 Gateway 服務？">
    使用 gateway 輔助工具：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行 gateway，`openclaw gateway --force` 可以回收連接埠。請參閱 [Gateway](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="我在 Windows 上關閉了終端機 - 如何重新啟動 OpenClaw？">
    有 **兩種 Windows 安裝模式**：

    **1) WSL2 (建議)：** 閘道在 Linux 內執行。

    開啟 PowerShell，進入 WSL，然後重新啟動：

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您從未安裝服務，請在前台啟動它：

    ```bash
    openclaw gateway run
    ```

    **2) 原生 Windows (不建議)：** 閘道直接在 Windows 中執行。

    開啟 PowerShell 並執行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行它 (無服務)，請使用：

    ```powershell
    openclaw gateway run
    ```

    文件：[Windows (WSL2)](/zh-Hant/platforms/windows)、[Gateway service runbook](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="閘道已啟動但從未收到回覆。我應該檢查什麼？">
    先進行快速健康檢查：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常見原因：

    - 未在 **gateway host** 上載入模型授權 (檢查 `models status`)。
    - 頻道配對/允許清單封鎖了回覆 (檢查頻道設定 + 記錄)。
    - WebChat/Dashboard 在沒有正確權杖的情況下開啟。

    如果您是遠端連線，請確認通道/Tailscale 連線已啟動，且
    Gateway WebSocket 可連線。

    文件：[Channels](/zh-Hant/channels)、[Troubleshooting](/zh-Hant/gateway/troubleshooting)、[Remote access](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title='"從閘道斷線：無原因" - 該怎麼辦？'>
    這通常表示 UI 失去了 WebSocket 連線。請檢查：

    1. Gateway 是否正在執行？ `openclaw gateway status`
    2. Gateway 是否健康？ `openclaw status`
    3. UI 是否有正確的權杖？ `openclaw dashboard`
    4. 如果是遠端連線，通道/Tailscale 連線是否已啟動？

    然後檢視記錄：

    ```bash
    openclaw logs --follow
    ```

    文件：[Dashboard](/zh-Hant/web/dashboard)、[Remote access](/zh-Hant/gateway/remote)、[Troubleshooting](/zh-Hant/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失敗。我該檢查什麼？">
    從日誌和通道狀態開始：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然後比對錯誤：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 選單有太多項目。OpenClaw 已經修剪到 Telegram 限制並以較少的指令重試，但仍需刪除一些選單項目。減少外掛/技能/自訂指令，或者如果您不需要選單，請停用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或類似的網路錯誤：如果您在 VPS 上或代理伺服器後方，請確認允許傳出 HTTPS 且 DNS 對於 `api.telegram.org` 正常運作。

    如果 Gateway 是遠端的，請確保您正在查看 Gateway 主機上的日誌。

    文件：[Telegram](/zh-Hant/channels/telegram)、[通道疑難排解](/zh-Hant/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 顯示沒有輸出。我該檢查什麼？">
    首先確認 Gateway 可以連線且代理程式可以執行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 來查看目前狀態。如果您預期在聊天
    通道中收到回覆，請確保已啟用傳遞功能 (`/deliver on`)。

    文件：[TUI](/zh-Hant/web/tui)、[斜線指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何完全停止然後啟動 Gateway？">
    如果您安裝了服務：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    這會停止/啟動 **受監控的服務** (macOS 上的 launchd，Linux 上的 systemd)。
    當 Gateway 作為守護程式在背景執行時使用此方式。

    如果您在前台執行，請使用 Ctrl-C 停止，然後：

    ```bash
    openclaw gateway run
    ```

    文件：[Gateway 服務手冊](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: 重啟 **背景服務** (launchd/systemd)。
    - `openclaw gateway`: 在此終端機階段的前景 **中執行** gateway。

    如果您已安裝服務，請使用 gateway 指令。當您想要一次性在前景執行時，請使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    使用 `--verbose` 啟動 Gateway 以取得更多主控台詳細資訊。然後檢查日誌檔案中的通道驗證、模型路由和 RPC 錯誤。
  </Accordion>
</AccordionGroup>

## 媒體與附件

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    來自 agent 的傳出附件必須包含一個 `MEDIA:<path-or-url>` 行（獨立一行）。請參閱 [OpenClaw assistant setup](/zh-Hant/start/openclaw) 和 [Agent send](/zh-Hant/tools/agent-send)。

    CLI 傳送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    此外請檢查：

    - 目標通道支援傳出媒體，且未被允許清單封鎖。
    - 檔案在提供者的大小限制內（圖片會調整大小至最大 2048px）。
    - `tools.fs.workspaceOnly=true` 將本地路徑傳送限制在工作區、temp/media-store 和沙盒驗證的檔案。
    - `tools.fs.workspaceOnly=false` 允許 `MEDIA:` 傳送 agent 已可讀取的主機本地檔案，但僅限於媒體及安全文件類型（圖片、音訊、視訊、PDF 和 Office 文件）。純文字和類似機密的檔案仍會被封鎖。

    參閱 [Images](/zh-Hant/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全與存取控制

<AccordionGroup>
  <Accordion title="將 OpenClaw 暴露於傳入的私訊（DM）是否安全？">
    將傳入的私訊視為不受信任的輸入。預設值設計旨在降低風險：

    - 支援私訊頻道的預設行為是**配對**（pairing）：
      - 未知發送者會收到配對碼；機器人不會處理其訊息。
      - 使用以下指令核准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 每個頻道的待處理請求上限為 **3 個**；如果未收到代碼，請檢查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公開開放私訊需要明確選擇加入（`dmPolicy: "open"` 和允許清單 `"*"`）。

    執行 `openclaw doctor` 以顯示具風險的私訊政策。

  </Accordion>

  <Accordion title="提示詞注入是否僅是公開機器人需要關注的問題？">
    不是。提示詞注入涉及的是**不受信任的內容**，而不僅僅是誰可以傳送私訊給機器人。
    如果您的助理讀取外部內容（網頁搜尋/擷取、瀏覽器頁面、電子郵件、
    文件、附件、貼上的日誌），該內容可能包含試圖劫持模型的指令。即使**您是唯一的發送者**，這種情況也可能發生。

    最大的風險在於啟用工具時：模型可能被誘騙而洩露上下文或代表您呼叫工具。您可以透過以下方式降低影響範圍：

    - 使用唯讀或停用工具的「讀取器」代理程式來總結不受信任的內容
    - 針對已啟用工具的代理程式，將 `web_search` / `web_fetch` / `browser` 保持關閉
    - 將解碼後的檔案/文件文字也視為不受信任：OpenResponses
      `input_file` 和媒體附件擷取都會將擷取的文字包裝在明確的外部內容邊界標記中，而不是直接傳遞原始檔案文字
    - 沙箱機制與嚴格的工具允許清單

    詳情請參閱：[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="我的機器人應該有自己的電子郵件、GitHub 帳號或電話號碼嗎？">
    是的，對於大多數設定而言。使用獨立的帳號和電話號碼將機器人隔離
    可以在發生問題時減少受影響的範圍。這也使得輪換憑證
    或撤銷存取權限更容易，且不會影響您的個人帳號。

    從小處著手。僅授予您實際需要的工具和帳號存取權限，並在
    需要時再進行擴充。

    文件：[安全性](/zh-Hant/gateway/security)、[配對](/zh-Hant/channels/pairing)。

  </Accordion>

  <Accordion title="我可以讓它自主控制我的簡訊，這樣安全嗎？">
    我們**不**建議對您的個人訊息給予完全自主權。最安全的模式是：

    - 將私人訊息保持在**配對模式**或嚴格的允許清單中。
    - 如果您希望它代表您發送訊息，請使用**獨立的號碼或帳號**。
    - 讓它擬稿，然後在**發送前進行審核**。

    如果您想進行實驗，請在專用帳號上進行並保持隔離。請參閱
    [安全性](/zh-Hant/gateway/security)。

  </Accordion>

<Accordion title="我可以使用較便宜的模型來處理個人助理任務嗎？">可以，**前提是**代理人僅用於聊天且輸入內容是受信任的。較低階層的模型 更容易受到指令劫持，因此請避免將其用於啟用工具的代理人 或在讀取不受信任的內容時使用。如果您必須使用較小的模型，請鎖定 工具並在沙盒中執行。請參閱 [安全性](/zh-Hant/gateway/security)。</Accordion>

  <Accordion title="我在 Telegram 中執行了 /start 但沒有收到配對碼">
    配對碼**僅**在未知的發送者傳送訊息給機器人且
    已啟用 `dmPolicy: "pairing"` 時才會發送。單獨的 `/start` 不會產生代碼。

    檢查待處理的要求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您想要立即存取，請將您的發送者 ID 加入允許清單，或為該帳號設定
    `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp: 它會傳訊息給我的聯絡人嗎？配對運作方式為何？">
    不會。預設的 WhatsApp 私訊 (DM) 政策是**配對**。未知的寄件者只會收到配對碼，而他們的訊息**不會被處理**。OpenClaw 只會回覆它收到的聊天，或是您主動觸發的明確發送。

    使用以下方式批准配對：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待處理請求：

    ```bash
    openclaw pairing list whatsapp
    ```

    精靈手機號碼提示：這是用來設定您的 **allowlist/owner**，以便允許您自己的私訊。它不用於自動發送。如果您使用個人的 WhatsApp 號碼執行，請使用該號碼並啟用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天指令、中止任務，以及「它無法停止」

<AccordionGroup>
  <Accordion title="如何停止內部系統訊息顯示在聊天中？">
    大多數內部或工具訊息僅在針對該工作階段啟用了 **verbose**、**trace** 或 **reasoning** 時才會顯示。

    在您看到該訊息的聊天中修正：

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    如果仍然顯示過多內容，請檢查 Control UI 中的工作階段設定，並將 verbose 設定為 **inherit**。同時確認您沒有使用在設定中將 `verboseDefault` 設定為 `on` 的 bot 設定檔。

    文件：[Thinking and verbose](/zh-Hant/tools/thinking)、[Security](/zh-Hant/gateway/security#reasoning-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在執行的任務？">
    傳送以下任一內容**作為獨立訊息**（無斜線）：

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

    對於背景程序（來自 exec 工具），您可以要求 agent 執行：

    ```
    process action:kill sessionId:XXX
    ```

    斜線指令概覽：請參閱 [Slash commands](/zh-Hant/tools/slash-commands)。

    大多數指令必須作為以 `/` 開頭的**獨立**訊息傳送，但部分捷徑（如 `/status`）對允許清單中的寄件者也可以在行內運作。

  </Accordion>

  <Accordion title='我如何從 Telegram 發送 Discord 訊息？（「跨內容訊息被拒絕」）'>
    OpenClaw 預設會封鎖**跨供應商**的訊息傳遞。如果工具呼叫綁定
    到 Telegram，除非您明確允許，否則它不會傳送到 Discord。

    為代理程式啟用跨供應商訊息傳遞：

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

    編輯設定後請重新啟動閘道。

  </Accordion>

  <Accordion title='為什麼機器人看起來會「忽略」連續發送的訊息？'>
    佇列模式控制新訊息如何與正在執行的工作互動。使用 `/queue` 變更模式：

    - `steer` - 新訊息會重新導向目前任務
    - `followup` - 一次執行一則訊息
    - `collect` - 批次處理訊息並回覆一次（預設）
    - `steer-backlog` - 立即引導，然後處理待辦事項
    - `interrupt` - 中止目前執行並重新開始

    您可以新增選項，例如 `debounce:2s cap:25 drop:summarize`，用於後續模式。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title="使用 API 金鑰時，Anthropic 的預設模型是什麼？">
    在 OpenClaw 中，憑證和模型選擇是分開的。設定 `ANTHROPIC_API_KEY`（或在設定檔中儲存 Anthropic API 金鑰）會啟用驗證，但實際的預設模型是您在 `agents.defaults.model.primary` 中設定的任何內容（例如 `anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，這表示閘道無法在正在執行的代理程式的預期 `auth-profiles.json` 中找到
    Anthropic 憑證。
  </Accordion>
</AccordionGroup>

---

還是有問題？請在 [Discord](https://discord.com/invite/clawd) 提問，或開啟 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。

## 相關

- [首次執行 FAQ](/zh-Hant/help/faq-first-run) — 安裝、上線、驗證、訂閱、早期故障
- [模型 FAQ](/zh-Hant/help/faq-models) — 模型選擇、故障轉移、驗證設定檔
- [疑難排解](/zh-Hant/help/troubleshooting) — 以症狀為優先的分診
