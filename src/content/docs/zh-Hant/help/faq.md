---
summary: "關於 OpenClaw 設定、設定檔和使用的常見問題"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常見問題"
---

針對實際部署（本地開發、VPS、多代理、OAuth/API 金鑰、模型故障轉移）的快速解答與更深入的故障排除。有關執行時診斷，請參閱[疑難排解](/zh-Hant/gateway/troubleshooting)。有關完整的組態參考，請參閱[組態](/zh-Hant/gateway/configuration)。

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

   執行即時閘道健康探測，包括支援時的通道探測
   （需要可連線的閘道）。請參閱[健康狀態](/zh-Hant/gateway/health)。

5. **追蹤最新記錄**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 停機，則回退至：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   檔案日誌與服務日誌是分開的；請參閱[日誌記錄](/zh-Hant/logging)與[疑難排解](/zh-Hant/gateway/troubleshooting)。

6. **執行醫生程式（修復）**

   ```bash
   openclaw doctor
   ```

   修復/遷移組態/狀態並執行健康檢查。請參閱[醫生](/zh-Hant/gateway/doctor)。

7. **閘道器快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向執行中的閘道請求完整快照（僅限 WS）。請參閱[健康狀態](/zh-Hant/gateway/health)。

## 快速開始與首次執行設定

首次執行問答 — 安裝、上架、驗證路由、訂閱、初始失敗 —
位於[首次執行常見問題](/zh-Hant/help/faq-first-run)。

## 什麼是 OpenClaw？

<AccordionGroup>
  <Accordion title="用一段話介紹什麼是 OpenClaw？">
    OpenClaw 是您在自己的裝置上執行的個人 AI 助理。它會在您已使用的訊息介面上回覆（WhatsApp、Telegram、Slack、Mattermost、Discord、Google Chat、Signal、iMessage、WebChat，以及內建的通道外掛程式，如 QQ Bot），並且在支援的平台上也能進行語音互動 + 即時 Canvas。**閘道**是永遠在線的控制平面；而助理才是產品本身。
  </Accordion>

  <Accordion title="價值主張">
    OpenClaw 不僅僅是「一個 Claude 封裝器」。它是一個 **本地優先的控制平面**，讓您能在
    **您自己的硬體** 上運行一個強大的助手，可透過您已經使用的聊天應用程式存取，並具備
    有狀態的工作階段、記憶體和工具 - 無需將您的工作流程控制權交給託管的
    SaaS。

    重點特色：

    - **您的裝置，您的資料：** 在您想要的任何地方（Mac、Linux、VPS）運行閘道，並將
      工作區 + 工作階段歷史記錄保留在本地。
    - **真實通道，而非網頁沙盒：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/等，
      以及支援平台上的行動語音和 Canvas。
    - **模型無關性：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，並具備每個代理的路由
      和故障轉移功能。
    - **僅限本地選項：** 執行本地模型，因此如果您願意，**所有資料都可以保留在您的裝置上**。
    - **多代理路由：** 根據通道、帳戶或任務分開代理，每個代理都有自己的
      工作區和預設值。
    - **開源且可駭客：** 檢查、擴展和自我託管，無廠商鎖定。

    文件：[閘道](/zh-Hant/gateway)、[通道](/zh-Hant/channels)、[多代理](/zh-Hant/concepts/multi-agent)、
    [記憶體](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="I just set it up - what should I do first?">
    適合的入門專案：

    - 建立一個網站（WordPress、Shopify 或簡單的靜態網站）。
    - 製作行動應用程式原型（大綱、畫面、API 計畫）。
    - 整理檔案和資料夾（清理、命名、標記）。
    - 連接 Gmail 並自動化摘要或後續追蹤。

    它可以處理大型任務，但當您將其分為幾個階段並
    使用子代理程式進行並行工作時，效果最好。

  </Accordion>

  <Accordion title="OpenClaw 的五大日常使用案例是什麼？">
    日常應用通常包括：

    - **個人簡報：** 您關注的收件匣、行事曆和新聞摘要。
    - **研究與草稿：** 快速研究、摘要，以及電子郵件或文件的初稿。
    - **提醒與跟進：** 由 cron 或心跳驅動的提示與檢查清單。
    - **瀏覽器自動化：** 填寫表單、收集資料和重複執行網頁任務。
    - **跨裝置協調：** 從手機發送任務，讓 Gateway 在伺服器上執行，然後在聊天中取回結果。

  </Accordion>

  <Accordion title="OpenClaw 能協助 SaaS 進行潛在客戶開發、外聯、廣告和部落格嗎？">
    在 **研究、資格審查和起草** 方面可以。它可以掃描網站、建立候選清單、
    總結潛在客戶，並撰寫外聯或廣告文案草稿。

    對於 **外聯或廣告投放**，請保持人工監管。避免發送垃圾郵件，遵守當地法律和
    平台政策，並在發送前審閱所有內容。最安全的模式是讓
    OpenClaw 起草，然後由您批准。

    文件：[Security](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="相較於 Claude Code，OpenClaw 在網頁開發方面有哪些優勢？">
    OpenClaw 是一個 **個人助理** 和協調層，並非 IDE 的替代品。請使用
    Claude Code 或 Codex 以在程式庫內獲得最快的直接編碼迴圈。當您
    需要持久記憶、跨裝置存取和工具編排時，請使用 OpenClaw。

    優勢：

    - 跨會話的 **持久記憶 + 工作區**
    - **多平台存取**（WhatsApp、Telegram、TUI、WebChat）
    - **工具編排**（瀏覽器、檔案、排程、掛鉤）
    - **Always-on Gateway**（在 VPS 上執行，從任何地方互動）
    - 用於本機瀏覽器/螢幕/攝影機/執行的 **節點 (Nodes)**

    展示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## 技能與自動化

<AccordionGroup>
  <Accordion title="如何自訂技能而不弄髒儲存庫？">
    使用管理的覆寫來代替編輯儲存庫副本。將您的變更放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或在 `~/.openclaw/openclaw.json` 中透過 `skills.load.extraDirs` 新增資料夾）。優先順序為 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`，因此管理的覆寫仍然優先於內建技能，而無需接觸 git。如果您需要全域安裝該技能但僅對某些代理程式可見，請將共享副本保留在 `~/.openclaw/skills` 中，並使用 `agents.defaults.skills` 和 `agents.list[].skills` 控制可見性。只有值得提交給上游的編輯才應該存在於儲存庫中並作為 PR 發送。
  </Accordion>

  <Accordion title="我可以從自訂資料夾載入技能嗎？">
    可以。在 `~/.openclaw/openclaw.json` 中透過 `skills.load.extraDirs` 新增額外的目錄（優先順序最低）。預設優先順序為 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`。`clawhub` 預設安裝到 `./skills`，OpenClaw 在下一次會話中會將其視為 `<workspace>/skills`。如果該技能僅應對特定代理程式可見，請將其與 `agents.defaults.skills` 或 `agents.list[].skills` 搭配使用。
  </Accordion>

  <Accordion title="我如何針對不同的任務使用不同的模型？">
    目前支援的模式有：

    - **Cron jobs**：隔離的作業可以針對每個作業設定 `model` 覆寫。
    - **Sub-agents**：將任務路由到具有不同預設模型的獨立代理程式。
    - **On-demand switch**：使用 `/model`/en/tools/slash-commands/en/concepts/multi-agent/en/automation/cron-jobs 隨時切換目前的工作階段模型。

    參閱 [Cron jobs](%%PH:LINK_TARGET:767:3a1c7fcc%)、[Multi-Agent Routing](%%PH:LINK_TARGET:768:03f71e34%) 和 [Slash commands](%%PH:LINK_TARGET:769:5fda6bce%)。

  </Accordion>

  <Accordion title="機器人在進行繁重工作時會凍結。我該如何卸載該工作？">
    針對長時間或並行任務，請使用**子代理**。子代理在自己的會話中運行，
    返回摘要，並保持您的主聊天響應靈敏。

    請要求您的機器人「為此任務生成一個子代理」或使用 `/subagents`。
    在聊天中使用 `/status` 以查看網關當前正在做什麼（以及它是否忙碌）。

    Token 提示：長時間任務和子代理都會消耗 token。如果您關心成本，請透過 `agents.defaults.subagents.model` 為子代理設定更便宜的模型。

    文件：[子代理](/zh-Hant/tools/subagents)、[背景任務](/zh-Hant/automation/tasks)。

  </Accordion>

  <Accordion title="Discord 上的執行緒綁定子代理會話是如何運作的？">
    使用執行緒綁定。您可以將 Discord 執行緒綁定到子代理或會話目標，以便該執行緒中的後續訊息保持在該綁定的會話上。

    基本流程：

    - 使用 `sessions_spawn` 透過 `thread: true` 生成（並可選擇使用 `mode: "session"` 進行持續後續追蹤）。
    - 或使用 `/focus <target>` 手動綁定。
    - 使用 `/agents` 檢查綁定狀態。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自動取消聚焦。
    - 使用 `/unfocus` 分離執行緒。

    必要設定：

    - 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆蓋值：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 生成時自動綁定：`channels.discord.threadBindings.spawnSessions` 預設為 `true`；將其設定為 `false` 以停用執行緒綁定會話生成。

    文件：[子代理](/zh-Hant/tools/subagents)、[Discord](/zh-Hant/channels/discord)、[設定參考](/zh-Hant/gateway/configuration-reference)、[斜線指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="子代理已完成，但完成更新去了錯誤的地方或從未發布。我應該檢查什麼？">
    首先檢查已解析的請求者路由：

    - 完成模式的子代理傳遞優先使用任何綁定的 thread 或 conversation 路由（如果存在）。
    - 如果完成來源僅包含 channel，OpenClaw 會回退到請求者會話的存儲路由（`lastChannel` / `lastTo` / `lastAccountId`），以便直接傳遞仍然可以成功。
    - 如果既沒有綁定路由也沒有可用的存儲路由，直接傳遞可能會失敗，結果將回退到排隊的會話傳遞，而不是立即發布到聊天。
    - 無效或過時的目標仍然可能強制回退到隊列或最終傳遞失敗。
    - 如果子代理的最後一個可見助手回覆確切是靜默令牌 `NO_REPLY` / `no_reply`，或者確切是 `ANNOUNCE_SKIP`，OpenClaw 會有意抑制公告，而不是發布過時的早期進度。
    - Tool/toolResult 輸出不會被提升到子代理結果文本中；結果是子代理最新的可見助手回覆。

    調試：

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    文檔：[子代理](/zh-Hant/tools/subagents)、[後台任務](/zh-Hant/automation/tasks)、[會話工具](/zh-Hant/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒未觸發。我應該檢查什麼？">
    Cron 在 Gateway 進程內運行。如果 Gateway 未持續運行，
    計劃的作業將不會運行。

    檢查清單：

    - 確認 cron 已啟用（`cron.enabled`）且未設置 `OPENCLAW_SKIP_CRON`。
    - 檢查 Gateway 是否 24/7 運行（無休眠/重啟）。
    - 驗證作業的時區設置（`--tz` 與主機時區的對比）。

    調試：

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文檔：[Cron 作業](/zh-Hant/automation/cron-jobs)、[自動化](/zh-Hant/automation)。

  </Accordion>

  <Accordion title="Cron 已觸發，但沒有任何內容發送到頻道。為什麼？">
    首先檢查發送模式：

    - `--no-deliver` / `delivery.mode: "none"` 表示不預期有 runner 備援發送。
    - 缺少或無效的公告目標 (`channel` / `to`) 表示 runner 跳過了外寄發送。
    - 頻道認證失敗 (`unauthorized`, `Forbidden`) 表示 runner 嘗試發送但憑證阻擋了它。
    - 靜默的隔離結果 (僅 `NO_REPLY` / `no_reply`) 被視為故意不發送，因此 runner 也會抑制排入佇列的備援發送。

    對於隔離的 cron 工作，當有聊天路由可用時，代理程式仍可使用 `message`
    工具直接發送。`--announce` 僅控制代理程式尚未發送的
    最終文字的 runner 備援路徑。

    偵錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Background Tasks](/zh-Hant/automation/tasks)。

  </Accordion>

  <Accordion title="為什麼隔離的 cron 執行會切換模型或重試一次？">
    那通常是即時模型切換路徑，而非重複排程。

    隔離的 cron 可以保存執行時期的模型移交，並在當前執行拋出 `LiveSessionModelSwitchError` 時重試。
    重試會保留切換後的提供者/模型，且如果切換帶有新的認證設定檔覆寫，cron 也會在重試前將其保存。

    相關的選擇規則：

    - 當適用時，Gmail hook 的模型覆寫優先。
    - 接著是各別工作的 `model`。
    - 然後是任何已儲存的 cron-session 模型覆寫。
    - 最後是正常的代理程式/預設模型選擇。

    重試迴圈是受限的。在初始嘗試加上 2 次切換重試後，
    cron 會中止而不是無限迴圈。

    偵錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[cron CLI](/zh-Hant/cli/cron)。

  </Accordion>

  <Accordion title="如何在 Linux 上安裝技能？">
    使用原生 `openclaw skills` 指令或將技能放入您的工作區。macOS 技能 UI 在 Linux 上無法使用。
    在 [https://clawhub.ai](https://clawhub.ai) 瀏覽技能。

    ```bash
    openclaw skills search "calendar"
    openclaw skills search --limit 20
    openclaw skills install <skill-slug>
    openclaw skills install <skill-slug> --version <version>
    openclaw skills install <skill-slug> --force
    openclaw skills install <skill-slug> --global
    openclaw skills update --all
    openclaw skills update --all --global
    openclaw skills list --eligible
    openclaw skills check
    ```

    原生 `openclaw skills install` 預設會寫入現用工作區 `skills/`
    目錄。新增 `--global` 以安裝至所有本機代理的共享管理技能目錄。僅當您想要發佈或同步您自己的技能時，才安裝獨立的 `clawhub` CLI。
    如果您想要限制哪些代理可以看到共享技能，請使用
    `agents.defaults.skills` 或 `agents.list[].skills`。

  </Accordion>

  <Accordion title="OpenClaw 可以按排程或在背景持續執行任務嗎？">
    可以。使用 Gateway 排程器：

    - **Cron jobs** 用於排程或週期性任務（重啟後仍持續存在）。
    - **Heartbeat** 用於「主要會話」的定期檢查。
    - **Isolated jobs** 用於發佈摘要或傳送至聊天的自主代理。

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Automation](/zh-Hant/automation)、
    [Heartbeat](/zh-Hant/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以從 Linux 執行僅限 Apple macOS 的技能嗎？">
    不能直接執行。macOS 技能受 `metadata.openclaw.os` 和必要二元檔的門檻限制，而且只有在 **Gateway 主機** 上符合資格時，技能才會出現在系統提示詞中。在 Linux 上，`darwin` 專用的技能（例如 `apple-notes`、`apple-reminders`、`things-mac`）除非您覆寫門檻限制，否則不會載入。

    您有三種支援的模式：

    **選項 A - 在 Mac 上執行 Gateway（最簡單）。**
    在存在 macOS 二元檔的地方執行 Gateway，然後從 Linux 以 [遠端模式](#gateway-ports-already-running-and-remote-mode) 或透過 Tailscale 進行連線。由於 Gateway 主機是 macOS，技能會正常載入。

    **選項 B - 使用 macOS 節點（無 SSH）。**
    在 Linux 上執行 Gateway，配對 macOS 節點（選單列應用程式），並在 Mac 上將 **Node Run Commands** 設定為「一律詢問」或「一律允許」。當節點上存在必要二元檔時，OpenClaw 可以將僅限 macOS 的技能視為符合資格。代理程式會透過 `nodes` 工具執行這些技能。如果您選擇「一律詢問」，在提示詞中核准「一律允許」會將該指令新增到允許清單中。

    **選項 C - 透過 SSH 代理 macOS 二元檔（進階）。**
    將 Gateway 保留在 Linux 上，但讓必要的 CLI 二元檔解析為在 Mac 上執行的 SSH 包裝程式。然後覆寫技能以允許 Linux，使其保持符合資格。

    1. 為二元檔建立 SSH 包裝程式（例如：Apple Notes 的 `memo`）：

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

  </Accordion>

  <Accordion title="你是否有 Notion 或 HeyGen 整合？">
    目前尚未內建。

    選項：

    - **自訂技能 / 外掛：** 最適合可靠的 API 存取（Notion/HeyGen 皆有 API）。
    - **瀏覽器自動化：** 無需編寫程式碼即可運作，但速度較慢且較不穩定。

    如果你想為每個客戶保留上下文（代理機構工作流程），一個簡單的模式是：

    - 每個客戶一個 Notion 頁面（上下文 + 偏好設定 + 進行中的工作）。
    - 要求代理在會話開始時擷取該頁面。

    如果你想要原生的整合，請開啟功能請求或建構一個針對這些 API 的技能。

    安裝技能：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安裝會放置在啟用的工作區 `skills/` 目錄中。若要在所有本地代理之間共用技能，請使用 `openclaw skills install <slug> --global`（或手動將其放置在 `~/.openclaw/skills/<name>/SKILL.md` 中）。如果只有部分代理應該看到共用安裝，請設定 `agents.defaults.skills` 或 `agents.list[].skills`。某些技能預期透過 Homebrew 安裝二進位檔；在 Linux 上這意味著使用 Linuxbrew（請參閱上方的 Homebrew Linux 常見問題條目）。請參閱 [技能](/zh-Hant/tools/skills)、[技能設定](/zh-Hant/tools/skills-config) 和 [ClawHub](/zh-Hant/tools/clawhub)。

  </Accordion>

  <Accordion title="我如何在 OpenClaw 中使用現有的已登入 Chrome？">
    使用內建的 `user` 瀏覽器設定檔，它透過 Chrome DevTools MCP 連線：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果你想要自訂名稱，請建立一個明確的 MCP 設定檔：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    此路徑可以使用本機主機瀏覽器或已連線的瀏覽器節點。如果 Gateway 在其他地方執行，請在瀏覽器機器上執行節點主機，或是改用遠端 CDP。

    `existing-session` / `user` 的目前限制：

    - 動作是 ref 驅動的，而非 CSS-selector 驅動的
    - 上傳需要 `ref` / `inputRef` 且目前一次僅支援一個檔案
    - `responsebody`、PDF 匯出、下載攔截和批次動作仍需要受管理的瀏覽器或原始 CDP 設定檔

  </Accordion>
</AccordionGroup>

## 沙盒機制與記憶體

<AccordionGroup>
  <Accordion title="是否有專門的沙盒文件？">
    有的。請參閱 [沙盒](/zh-Hant/gateway/sandboxing)。若要進行 Docker 專屬設定（Docker 中的完整閘道或沙盒映像檔），請參閱 [Docker](/zh-Hant/install/docker)。
  </Accordion>

  <Accordion title="Docker 感覺功能受限 - 我該如何啟用完整功能？">
    預設映像檔以安全為優先並以 `node` 使用者身分執行，因此不包含
    系統套件、Homebrew 或內建的瀏覽器。若要進行更完整的設定：

    - 使用 `OPENCLAW_HOME_VOLUME` 持續保存 `/home/node`，讓快取得以留存。
    - 使用 `OPENCLAW_IMAGE_APT_PACKAGES` 將系統相依項目烘焙至映像檔中。
    - 透過內建的 CLI 安裝 Playwright 瀏覽器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 設定 `PLAYWRIGHT_BROWSERS_PATH` 並確保該路徑已被持續保存。

    文件：[Docker](/zh-Hant/install/docker)、[Browser](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="我可以保持 DM 的私密性，並讓群組公開/沙盒化，僅使用一個代理程式嗎？">
    可以 - 如果您的私人流量是 **DM** 而公開流量是 **groups**。

    使用 `agents.defaults.sandbox.mode: "non-main"`，讓群組/頻道階段（非主要金鑰）在設定的沙盒後端中執行，而主要的 DM 階段則保留在主機上。如果您未選擇後端，Docker 是預設選項。然後透過 `tools.sandbox.tools` 限制沙盒階段中可用的工具。

    設定逐步解說 + 範例設定檔：[Groups: personal DMs + public groups](/zh-Hant/channels/groups#pattern-personal-dms-public-groups-single-agent)

    主要設定檔參考：[Gateway configuration](/zh-Hant/gateway/config-agents#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="如何將主機資料夾綁定到沙箱中？">
    將 `agents.defaults.sandbox.docker.binds` 設為 `["host:path:mode"]` (例如 `"/home/user/src:/src:ro"`)。全域 + 各代理程式的綁定會合併；當 `scope: "shared"` 時，會忽略各代理程式的綁定。對於任何敏感內容請使用 `:ro`，並記得綁定會繞過沙箱檔案系統牆壁。

    OpenClaw 會透過最深的現有祖先解析路徑，同時對照正規化路徑和標準路徑來驗證綁定來源。這意味著即使最後一個路徑區段尚不存在，符號連結父系逃逸仍會因封閉而失敗，且在解析符號連結後仍會檢查允許根目錄。

    請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing#custom-bind-mounts) 和 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) 以取得範例和安全說明。

  </Accordion>

  <Accordion title="記憶體如何運作？">
    OpenClaw 記憶體只是代理程式工作區中的 Markdown 檔案：

    - `memory/YYYY-MM-DD.md` 中的每日筆記
    - `MEMORY.md` 中的策劃長期筆記 (僅限主要/私人工作階段)

    OpenClaw 也會執行 **無聲的預壓縮記憶體排清**，以提醒模型
    在自動壓縮之前寫入持久筆記。這僅在工作區
    可寫入時執行 (唯讀沙箱會跳過它)。請參閱 [Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="記憶體一直忘記事情。如何讓它記住？">
    要求機器人 **將事實寫入記憶體**。長期筆記屬於 `MEMORY.md`，
    短期內容則放入 `memory/YYYY-MM-DD.md`。

    這仍是我們正在改進的領域。提醒模型儲存記憶體會有幫助；
    它會知道該做什麼。如果它一直忘記，請驗證 Gateway 在每次執行時
    都使用相同的工作區。

    文件：[Memory](/zh-Hant/concepts/memory)、[Agent workspace](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="記憶體會永久保存嗎？有哪些限制？">
    記憶體檔案儲存在磁碟上，並會持續保存直到您刪除它們。限制取決於您的儲存空間，而非模型。**Session context** 仍然受到模型上下文視窗的限制，因此長對話可能會被壓縮或截斷。這就是為什麼存在記憶體搜尋功能——它只將相關的部分拉回上下文中。

    文件：[Memory](/zh-Hant/concepts/memory)、[Context](/zh-Hant/concepts/context)。

  </Accordion>

  <Accordion title="語意記憶體搜尋需要 OpenAI API 金鑰嗎？">
    只有在使用 **OpenAI embeddings** 時才需要。Codex OAuth 涵蓋了 chat/completions，但**不**授予 embeddings 存取權限，因此**登入 Codex (OAuth 或 Codex CLI 登入)** 對語意記憶體搜尋沒有幫助。OpenAI embeddings 仍然需要真正的 API 金鑰 (`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`)。

    如果您未明確設定提供商，OpenClaw 會使用 OpenAI embeddings。仍然顯示 `memorySearch.provider = "auto"` 的舊版設定也會解析為 OpenAI。如果沒有可用的 OpenAI API 金鑰，語意記憶體搜尋將保持不可用，直到您設定金鑰或明確選擇其他提供商。

    如果您希望保持本機，請設定 `memorySearch.provider = "local"` (並可選擇性地設定 `memorySearch.fallback = "none"`)。如果您想要 Gemini embeddings，請設定 `memorySearch.provider = "gemini"` 並提供 `GEMINI_API_KEY` (或 `memorySearch.remote.apiKey`)。我們支援 **OpenAI、OpenAI-compatible、Gemini、Voyage、Mistral、Bedrock、Ollama、LM Studio、GitHub Copilot、DeepInfra 或本機** embedding 模型——請參閱 [Memory](/zh-Hant/concepts/memory) 以了解設定細節。

  </Accordion>
</AccordionGroup>

## 檔案在磁碟上的位置

<AccordionGroup>
  <Accordion title="OpenClaw 使用的所有數據都會在本機儲存嗎？">
    不會——**OpenClaw 的狀態在本機**，但**外部服務仍然會看到您發送給它們的內容**。

    - **預設為本機：** 工作階段、記憶體檔案、配置和工作區位於 Gateway 主機上
      (`~/.openclaw` + 您的工作區目錄)。
    - **必要時為遠端：** 您發送給模型提供商 (Anthropic/OpenAI 等) 的訊息會傳送至
      其 API，且聊天平台 (WhatsApp/Telegram/Slack 等) 會在其
      伺服器上儲存訊息數據。
    - **由您控管數據足跡：** 使用本機模型可將提示保留在您的機器上，但頻道
      流量仍會通過該頻道的伺服器。

    相關：[Agent 工作區](/zh-Hant/concepts/agent-workspace)、[記憶體](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 將其資料儲存在哪裡？">
    所有內容都儲存在 `$OPENCLAW_STATE_DIR` 下（預設：`~/.openclaw`）：

    | Path                                                            | Purpose                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主設定檔 (JSON5)                                                 |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 舊版 OAuth 匯入（首次使用時會複製到 auth profiles）       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 驗證設定檔（OAuth、API 金鑰，以及可選的 `keyRef`/`tokenRef`）  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | 針對 `file` SecretRef 提供者的可選檔案型秘密載荷 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 舊版相容性檔案（已清除靜態 `api_key` 條目）      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供者狀態（例如 `whatsapp/<accountId>/creds.json`）            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每個代理程式的狀態（agentDir + sessions）                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 對話歷史與狀態（每個代理程式）                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Session 元資料（每個代理程式）                                       |

    舊版單一代理程式路徑：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）。

    您的 **工作區**（AGENTS.md、記憶檔案、技能等）是分開的，並透過 `agents.defaults.workspace` 進行設定（預設：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 應該放在哪裡？">
    這些檔案位於 **agent workspace** 中，而不是 `~/.openclaw`。

    - **Workspace (每個 agent)**：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md`、`memory/YYYY-MM-DD.md`、選用的 `HEARTBEAT.md`。
      小寫的根 `memory.md` 僅用於舊版修復輸入；當這兩個檔案都存在時，`openclaw doctor --fix`
      可以將其合併到 `MEMORY.md` 中。
    - **State dir (`~/.openclaw`)**：設定、頻道/提供者狀態、身分驗證設定檔、工作階段、日誌，
      以及共享技能 (`~/.openclaw/skills`)。

    預設工作區為 `~/.openclaw/workspace`，可透過以下方式設定：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果機器人在重新啟動後「忘記」了，請確認 Gateway 在每次啟動時都使用相同的
    工作區（並請記住：遠端模式使用的是 **gateway 主機的**
    工作區，而不是您的本機筆電）。

    提示：如果您想要持久化的行為或偏好設定，請要求機器人將其**寫入
    AGENTS.md 或 MEMORY.md**，而不是依賴聊天記錄。

    參閱 [Agent workspace](/zh-Hant/concepts/agent-workspace) 和 [Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="建議的備份策略">
    將您的 **agent workspace** 放在 **私有** git 儲存庫中，並將其備份到某個
    私有位置（例如 GitHub 私有儲存庫）。這會擷取記憶 + AGENTS/SOUL/USER
    檔案，並讓您稍後能還原助手的「心智」。

    **請勿** 將 `~/.openclaw` 下的任何內容提交（憑證、工作階段、權杖或加密的秘密負載）。
    如果您需要完整還原，請分別備份工作區和狀態目錄
    （請參閱上述遷移問題）。

    文件：[Agent workspace](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

<Accordion title="我要如何完全解除安裝 OpenClaw？">請參閱專屬指南：[Uninstall](/zh-Hant/install/uninstall)。</Accordion>

  <Accordion title="代理能在工作區之外運作嗎？">
    可以。工作區是**預設的工作目錄 (cwd)** 和記憶錨點，而非嚴格的沙箱。
    相對路徑在工作區內解析，但絕對路徑可以存取其他
    主機位置，除非啟用了沙箱。如果您需要隔離，請使用
    [`agents.defaults.sandbox`](/zh-Hant/gateway/sandboxing) 或每個代理的沙箱設定。如果您
    希望某個儲存庫成為預設工作目錄，請將該代理的
    `workspace` 指向儲存庫根目錄。OpenClaw 儲存庫僅包含原始碼；請將
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

  <Accordion title="遠端模式：Session 儲存在哪裡？">
    Session 狀態由 **gateway host** 所擁有。如果您處於遠端模式，您關心的 session 儲存是在遠端機器上，而不是您的本地筆電。請參閱 [Session 管理](/zh-Hant/concepts/session)。
  </Accordion>
</AccordionGroup>

## 設定基礎

<AccordionGroup>
  <Accordion title="設定檔是什麼格式？它在哪裡？">
    OpenClaw 從 `$OPENCLAW_CONFIG_PATH` 讀取選用的 **JSON5** 設定（預設為：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果檔案不存在，它會使用相對安全的預設值（包括預設工作區 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我設定了 gateway.bind: "lan" (或 "tailnet")，但現在沒有監聽任何東西 / UI 顯示未授權'>
    非回環綁定**需要有效的閘道驗證路徑**。實際上這意味著：

    - 共用金鑰驗證：token 或密碼
    - 正確設定的具身份感知反向代理後方的 `gateway.auth.mode: "trusted-proxy"`

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

    註事項：

    - `gateway.remote.token` / `.password` 本身**不會**啟用本地閘道驗證。
    - 只有在未設定 `gateway.auth.*` 時，本地呼叫路徑才能使用 `gateway.remote.*` 作為後備。
    - 對於密碼驗證，請改為設定 `gateway.auth.mode: "password"` 加上 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 是透過 SecretRef 明確設定但未解析，解析將會失敗並封閉 (不會遮蔽遠端後備)。
    - 共用金鑰控制 UI 設定會透過 `connect.params.auth.token` 或 `connect.params.auth.password` (儲存在 app/UI 設定中) 進行驗證。承載身分的模式，例如 Tailscale Serve 或 `trusted-proxy`，則改用請求標頭。請避免將共用金鑰放在 URL 中。
    - 使用 `gateway.auth.mode: "trusted-proxy"` 時，同主機回環反向代理需要明確的 `gateway.auth.trustedProxy.allowLoopback = true` 以及 `gateway.trustedProxies` 中的回環條目。

  </Accordion>

  <Accordion title="為什麼現在在 localhost 需要使用 token？">
    OpenClaw 預設會強制執行 Gateway 驗證，包括回環。在一般的預設路徑中，這意味著使用 token 驗證：如果未設定明確的驗證路徑，Gateway 啟動時會解析為 token 模式，並為該次啟動生成僅限執行時期的 token，因此 **本機 WS 用戶端必須通過驗證**。當用戶端在重新啟動之間需要穩定的密鑰時，請明確設定 `gateway.auth.token`、`gateway.auth.password`、`OPENCLAW_GATEWAY_TOKEN` 或 `OPENCLAW_GATEWAY_PASSWORD`。這可防止其他本機程序呼叫 Gateway。

    如果您偏好不同的驗證路徑，可以明確選擇密碼模式（或者，針對具備身份感知能力的反向代理，則是 `trusted-proxy`）。如果您 **真的** 想要開放回環，請在設定中明確設定 `gateway.auth.mode: "none"`。Doctor 隨時可以為您生成 token：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="變更設定後需要重新啟動嗎？">
    Gateway 會監看設定檔並支援熱重載：

    - `gateway.reload.mode: "hybrid"` (預設)：熱套用安全變更，針對關鍵變更則重新啟動
    - `hot`、`restart`、`off` 也有支援

  </Accordion>

  <Accordion title="如何停用有趣的 CLI 標語？">
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
    - `random`：輪播有趣/季節性標語（預設行為）。
    - 如果您完全不想要橫幅，請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="我如何啟用網路搜尋（以及網路擷取）？">
    `web_fetch` 不需要 API 金鑰即可運作。`web_search` 取決於您選擇的
    提供者：

    - 支援 API 的提供者，例如 Brave、Exa、Firecrawl、Gemini、Kimi、MiniMax Search、Perplexity 和 Tavily，需要其正常的 API 金鑰設定。
    - Grok 可以重複使用來自模型驗證的 xAI OAuth，或是回退至 `XAI_API_KEY` / 外掛程式 web-search 設定。
    - Ollama Web Search 不需要金鑰，但它使用您設定的 Ollama 主機並且需要 `ollama signin`。
    - DuckDuckGo 不需要金鑰，但它是非官方的基於 HTML 的整合。
    - SearXNG 不需要金鑰/自行託管；請設定 `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`。

    **建議：** 執行 `openclaw configure --section web` 並選擇一個提供者。
    環境替代方案：

    - Brave：`BRAVE_API_KEY`
    - Exa：`EXA_API_KEY`
    - Firecrawl：`FIRECRAWL_API_KEY`
    - Gemini：`GEMINI_API_KEY`
    - Grok：xAI OAuth，`XAI_API_KEY`
    - Kimi：`KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
    - MiniMax Search：`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`
    - Perplexity：`PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`
    - SearXNG：`SEARXNG_BASE_URL`
    - Tavily：`TAVILY_API_KEY`

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

    特定提供者的網路搜尋設定現在位於 `plugins.entries.<plugin>.config.webSearch.*` 之下。
    舊版 `tools.web.search.*` 提供者路徑為了相容性仍會暫時載入，但不應將其用於新設定。
    Firecrawl web-fetch 回退設定位於 `plugins.entries.firecrawl.config.webFetch.*` 之下。

    註記：

    - 如果您使用允許清單，請新增 `web_search`/`web_fetch`/`x_search` 或 `group:web`。
    - `web_fetch` 預設為啟用（除非明確停用）。
    - 如果省略 `tools.web.fetch.provider`，OpenClaw 會從可用的憑證中自動偵測第一個準備就緒的擷取回退提供者。目前內建的提供者為 Firecrawl。
    - Daemons 會從 `~/.openclaw/.env`（或服務環境）讀取環境變數。

    文件：[網路工具](/zh-Hant/tools/web)。

  </Accordion>

  <Accordion title="config.apply 抹除了我的配置。我該如何恢復並避免這種情況？">
    `config.apply` 會替換**整個配置**。如果您發送部分物件，其他所有內容都會被移除。

    目前的 OpenClaw 可保護許多意外覆寫的情況：

    - OpenClaw 擁有的配置寫入會在寫入前驗證完整的變更後配置。
    - 無效或具破壞性的 OpenClaw 擁有寫入會被拒絕並儲存為 `openclaw.json.rejected.*`。
    - 如果直接編輯導致啟動或熱重載失敗，Gateway 將會失敗關閉或略過重載；它不會重寫 `openclaw.json`。
    - `openclaw doctor --fix` 負責修復，並可在將拒絕的檔案儲存為 `openclaw.json.clobbered.*` 的同時，還原最後已知良好的狀態。

    恢復方法：

    - 檢查 `openclaw logs --follow` 中是否有 `Invalid config at`、`Config write rejected:` 或 `config reload skipped (invalid config)`。
    - 檢查活動配置旁邊最新的 `openclaw.json.clobbered.*` 或 `openclaw.json.rejected.*`。
    - 執行 `openclaw config validate` 和 `openclaw doctor --fix`。
    - 使用 `openclaw config set` 或 `config.patch` 僅複製預期的金鑰回來。
    - 如果您沒有最後已知良好的設定或遭拒絕的負載，請從備份還原，或重新執行 `openclaw doctor` 並重新設定通道/模型。
    - 如果這是意外發生的，請回報錯誤並附上您最後已知的配置或任何備份。
    - 本地端程式碼代理程式通常可以從紀錄或歷史記錄重建可用的配置。

    避免方法：

    - 使用 `openclaw config set` 進行小幅變更。
    - 使用 `openclaw configure` 進行互動式編輯。
    - 當您不確確切路徑或欄位形狀時，請先使用 `config.schema.lookup`；它會傳回淺層結構描述節點以及用於向下鑽取的即時子項摘要。
    - 對於部分 RPC 編輯，請使用 `config.patch`；僅將 `config.apply` 用於完整配置替換。
    - 如果您在代理程式執行期間使用代理程式導向的 `gateway` 工具，它仍會拒絕對 `tools.exec.ask` / `tools.exec.security` 的寫入（包括正規化為相同受保護執行路徑的舊版 `tools.bash.*` 別名）。

    文件：[Config](/zh-Hant/cli/config)、[Configure](/zh-Hant/cli/configure)、[Gateway troubleshooting](/zh-Hant/gateway/troubleshooting#gateway-rejected-invalid-config)、[Doctor](/zh-Hant/gateway/doctor)。

  </Accordion>

  <Accordion title="我如何在跨設備上運行帶有專用工作程式的中央 Gateway？">
    常見的模式是**一個 Gateway**（例如 Raspberry Pi）加上**節點**和**代理程式**：

    - **Gateway（中央）：** 擁有通道（Signal/WhatsApp）、路由和工作階段。
    - **節點（裝置）：** Mac/iOS/Android 作為外設連接並公開本機工具（`system.run`、`canvas`、`camera`）。
    - **代理程式（工作程式）：** 用於特殊角色的獨立大腦/工作空間（例如「Hetzner 運維」、「個人資料」）。
    - **子代理程式：** 當您需要並行處理時，從主代理程式產生背景工作。
    - **TUI：** 連接到 Gateway 並切換代理程式/工作階段。

    文件：[節點](/zh-Hant/nodes)、[遠端存取](/zh-Hant/gateway/remote)、[多代理程式路由](/zh-Hant/concepts/multi-agent)、[子代理程式](/zh-Hant/tools/subagents)、[TUI](/zh-Hant/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 瀏覽器可以無頭模式執行嗎？">
    可以的。這是一個設定選項：

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

    預設為 `false`（有頭模式）。無頭模式在某些網站上更容易觸發反機器人檢查。請參閱 [瀏覽器](/zh-Hant/tools/browser)。

    無頭模式使用**相同的 Chromium 引擎**，並適用於大多數自動化操作（表單、點擊、抓取、登入）。主要差異如下：

    - 沒有可見的瀏覽器視窗（如果您需要視覺效果，請使用截圖）。
    - 某些網站對無頭模式下的自動化更嚴格（CAPTCHA、反機器人）。
      例如，X/Twitter 經常阻擋無頭工作階段。

  </Accordion>

  <Accordion title="我如何使用 Brave 進行瀏覽器控制？">
    將 `browser.executablePath` 設定為您的 Brave 執行檔（或任何基於 Chromium 的瀏覽器），然後重新啟動 Gateway。
    請參閱 [瀏覽器](/zh-Hant/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整設定範例。
  </Accordion>
</AccordionGroup>

## 遠端 Gateway 和節點

<AccordionGroup>
  <Accordion title="指令如何在 Telegram、Gateway 和節點之間傳播？">
    Telegram 訊息由 **Gateway** 處理。Gateway 執行代理程式（Agent），並且僅在需要節點工具時透過 **Gateway WebSocket** 呼叫節點：

    Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

    節點看不到入站提供者流量；它們僅接收節點 RPC 呼叫。

  </Accordion>

  <Accordion title="如果 Gateway 是遠端託管的，我的代理程式如何存取我的電腦？">
    簡短回答：**將您的電腦配對為節點**。Gateway 在其他地方執行，但它可以透過 Gateway WebSocket 在您的本機上呼叫 `node.*` 工具（螢幕、相機、系統）。

    典型設定：

    1. 在永遠上線的主機（VPS/家用伺服器）上執行 Gateway。
    2. 將 Gateway 主機和您的電腦放在同一個 tailnet 上。
    3. 確保 Gateway WS 可存取（tailnet bind 或 SSH tunnel）。
    4. 在本機開啟 macOS 應用程式，並以 **Remote over SSH** 模式（或直接透過 tailnet）連線，以便它能註冊為節點。
    5. 在 Gateway 上批准節點：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要單獨的 TCP 橋接器；節點透過 Gateway WebSocket 連線。

    安全提醒：配對 macOS 節點允許在該機器上執行 `system.run`。僅配對您信任的裝置，並檢閱 [Security](/zh-Hant/gateway/security)。

    文件：[Nodes](/zh-Hant/nodes)、[Gateway protocol](/zh-Hant/gateway/protocol)、[macOS remote mode](/zh-Hant/platforms/mac/remote)、[Security](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已連線但我沒收到回覆。現在該怎麼辦？">
    檢查基本事項：

    - Gateway 正在執行：`openclaw gateway status`
    - Gateway 健康狀態：`openclaw status`
    - 頻道健康狀態：`openclaw channels status`

    然後驗證身分驗證與路由：

    - 如果您使用 Tailscale Serve，請確保 `gateway.auth.allowTailscale` 設定正確。
    - 如果您透過 SSH 通道連線，請確認本機通道已啟動並指向正確的連接埠。
    - 確認您的允許名單（DM 或群組）包含您的帳戶。

    文件：[Tailscale](/zh-Hant/gateway/tailscale)、[遠端存取](/zh-Hant/gateway/remote)、[頻道](/zh-Hant/channels)。

  </Accordion>

  <Accordion title="兩個 OpenClaw 執行實例可以互相通訊嗎（本機 + VPS）？">
    可以。沒有內建的「Bot 對 Bot」橋接器，但您可以透過幾種可靠的方式將其連接起來：

    **最簡單：**使用兩個機器人都能存取的正常聊天頻道（Telegram/Slack/WhatsApp）。
    讓機器人 A 發送訊息給機器人 B，然後讓機器人 B 像平常一樣回覆。

    **CLI 橋接器（通用）：**執行一個腳本，該腳本使用 `openclaw agent --message ... --deliver` 呼叫另一個 Gateway，
    目標指向另一個機器人監聽的聊天。如果其中一個機器人在遠端 VPS 上，請透過 SSH/Tailscale 將您的 CLI 指向該遠端 Gateway
    （請參閱 [遠端存取](/zh-Hant/gateway/remote)）。

    範例模式（從可存取目標 Gateway 的機器執行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：加入防護措施，以免兩個機器人無限循環（僅限提及、頻道
    允許名單，或「不回覆機器人訊息」規則）。

    文件：[遠端存取](/zh-Hant/gateway/remote)、[Agent CLI](/zh-Hant/cli/agent)、[Agent send](/zh-Hant/tools/agent-send)。

  </Accordion>

  <Accordion title="多個代理是否需要分開的 VPS？">
    不需要。一個 Gateway 可以託管多個代理，每個代理都有自己的工作區、預設模型和路由。這是標準設定，比每個代理運行一個 VPS 更便宜且簡單。

    只有當您需要強隔離（安全邊界）或非常不願意共用的不同設定時，才使用分開的 VPS。否則，請保留一個 Gateway 並使用多個代理或子代理。

  </Accordion>

  <Accordion title="與從 VPS 進行 SSH 相比，在我的個人筆記型電腦上使用節點有什麼好處嗎？">
    是的——節點是從遠端 Gateway 存取您的筆記型電腦的首選方式，而且它們
    解鎖的不僅僅是 shell 存取權限。Gateway 執行於 macOS/Linux（Windows 則透過 WSL2）並且
    輕量化（小型 VPS 或 Raspberry Pi 等級的盒子即可；4 GB RAM 綽綽有餘），因此一種常見的
    設定方式是一台始終運作的主機加上您的筆記型電腦作為節點。

    - **不需要傳入 SSH。** 節點會向外連接到 Gateway WebSocket 並使用裝置配對。
    - **更安全的執行控制。** 在該筆記型電腦上，`system.run` 受到節點允許清單/核准的限制。
    - **更多裝置工具。** 除了 `system.run` 之外，節點還會公開 `canvas`、`camera` 和 `screen`。
    - **本機瀏覽器自動化。** 將 Gateway 保留在 VPS 上，但透過筆記型電腦上的節點主機在本機執行 Chrome，或透過 Chrome MCP 附加到主機上的本機 Chrome。

    SSH 適用於臨時的 shell 存取，但對於持續的代理程式工作流程和
    裝置自動化來說，節點更簡單。

    文件：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)、[瀏覽器](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="節點會執行 gateway 服務嗎？">
    不會。除非您故意執行隔離的設定檔（請參閱 [多個 Gateway](/zh-Hant/gateway/multiple-gateways)），否則每個主機應該只執行 **一個 gateway**。節點是連接到
    gateway 的周邊裝置（iOS/Android 節點，或是選單列應用程式中的 macOS「節點模式」）。關於無頭節點
    主機和 CLI 控制，請參閱 [節點主機 CLI](/zh-Hant/cli/node)。

    對於 `gateway`、`discovery` 和託管的外掛介面變更，需要完整重新啟動。

  </Accordion>

  <Accordion title="有沒有透過 API / RPC 套用組態的方式？">
    有的。

    - `config.schema.lookup`：在寫入前檢視單一組態子樹、其淺層架構節點、對應的 UI 提示以及直接的子項摘要
    - `config.get`：取得目前的快照 + 雜湊
    - `config.patch`：安全的部分更新（大多數 RPC 編輯的首選）；盡可能熱重載，必要時重新啟動
    - `config.apply`：驗證並替換完整組態；盡可能熱重載，必要時重新啟動
    - 面向代理的 `gateway` 執行期工具仍拒絕覆寫 `tools.exec.ask` / `tools.exec.security`；舊版 `tools.bash.*` 別名會正規化為相同的受保護執行路徑

  </Accordion>

  <Accordion title="首次安裝的最低合理設定">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    這會設定您的工作區並限制誰可以觸發機器人。

  </Accordion>

  <Accordion title="我如何在 VPS 上設定 Tailscale 並從我的 Mac 連線？">
    最低步驟：

    1. **在 VPS 上安裝 + 登入**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在你的 Mac 上安裝 + 登入**
       - 使用 Tailscale 應用程式並登入同一個 tailnet。
    3. **啟用 MagicDNS（建議）**
       - 在 Tailscale 管理主控台中啟用 MagicDNS，讓 VPS 擁有穩定的名稱。
    4. **使用 tailnet 主機名稱**
       - SSH：`ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS：`ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果你想不使用 SSH 就存取 Control UI，請在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    這會將閘道綁定至 loopback，並透過 Tailscale 公開 HTTPS。請參閱 [Tailscale](/zh-Hant/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何將 Mac 節點連線到遠端 Gateway (Tailscale Serve)？">
    Serve 會公開 **Gateway Control UI + WS**。節點會透過相同的 Gateway WS 端點進行連線。

    建議的設定方式：

    1. **確保 VPS + Mac 位於同一個 tailnet 上**。
    2. **在 Remote 模式下使用 macOS 應用程式**（SSH 目標可以是 tailnet 主機名稱）。
       應用程式將會為 Gateway 連接埠建立通道，並以節點身份連線。
    3. **在 gateway 上核准該節點**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文件：[Gateway 通訊協定](/zh-Hant/gateway/protocol)、[探索](/zh-Hant/gateway/discovery)、[macOS 遠端模式](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我應該在第二台筆記型電腦上安裝，還是只要新增一個節點？">
    如果您在第二台筆記型電腦上只需要 **本機工具**（螢幕/相機/exec），請將其新增為
    **節點**。這樣可以維持單一 Gateway 並避免重複的設定。本機節點工具目前僅支援 macOS，但我們計劃將其擴展到其他作業系統。

    只有當您需要 **強烈隔離** 或兩個完全分開的機器人時，才安裝第二個 Gateway。

    文件：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)、[多個 Gateway](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 環境變數與 .env 載入

<AccordionGroup>
  <Accordion title="OpenClaw 如何載入環境變數？">
    OpenClaw 從父進程（shell、launchd/systemd、CI 等）讀取環境變數，並額外載入：

    - 目前工作目錄中的 `.env`
    - 來自 `~/.openclaw/.env`（亦稱 `$OPENCLAW_STATE_DIR/.env`）的全域後備 `.env`

    這兩個 `.env` 檔案都不會覆蓋既有的環境變數。
    提供者憑證變數是工作區 `.env` 的例外：諸如
    `GEMINI_API_KEY`、`XAI_API_KEY` 或 `MISTRAL_API_KEY` 等金鑰會從工作區
    `.env` 中忽略，應存在於進程環境、`~/.openclaw/.env` 或設定 `env` 中。

    您也可以在設定中定義內聯環境變數（僅在進程環境中缺失時套用）：

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    參閱 [/environment](/zh-Hant/help/environment) 以了解完整的優先順序和來源。

  </Accordion>

  <Accordion title="我透過服務啟動了 Gateway，但我的環境變數不見了。現在該怎麼辦？">
    兩個常見的修正方法：

    1. 將缺失的金鑰放入 `~/.openclaw/.env`，這樣即使服務未繼承您的 shell 環境，也能被讀取。
    2. 啟用 shell 匯入（選用便利功能）：

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

    這會執行您的登入 shell 並僅匯入缺失的預期金鑰（絕不覆蓋）。對應的環境變數為：
    `OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我設定了 COPILOT_GITHUB_TOKEN，但模型狀態顯示 "Shell env: off." 為什麼？'>
    `openclaw models status` 回報是否已啟用 **shell env import**。「Shell env: off」
    **並不**表示您的環境變數遺失——這僅表示 OpenClaw 不會自動載入
    您的登入 shell。

    如果 Gateway 以服務形式執行（launchd/systemd），它將不會繼承您的 shell
    環境。請透過下列其中一種方式修正：

    1. 將 token 放入 `~/.openclaw/.env` 中：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或啟用 shell import（`env.shellEnv.enabled: true`）。
    3. 或將其加入您的 config `env` 區塊（僅在缺失時適用）。

    然後重新啟動 gateway 並重新檢查：

    ```bash
    openclaw models status
    ```

    Copilot token 是從 `COPILOT_GITHUB_TOKEN` 讀取的（也支援 `GH_TOKEN` / `GITHUB_TOKEN`）。
    請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers) 與 [/environment](/zh-Hant/help/environment)。

  </Accordion>
</AccordionGroup>

## Sessions and multiple chats

<AccordionGroup>
  <Accordion title="我該如何開始新的對話？">
    傳送 `/new` 或 `/reset` 作為獨立訊息。請參閱 [Session management](/zh-Hant/concepts/session)。
  </Accordion>

  <Accordion title="如果我不傳送 /new，sessions 會自動重置嗎？">
    Sessions 可以在 `session.idleMinutes` 後過期，但此功能**預設為停用**（預設值為 **0**）。
    將其設為正數以啟用閒置過期。啟用後，閒置期間結束後的**下一則**
    訊息將為該聊天金鑰啟動一個新的 session id。
    這不會刪除對話紀錄——它只是開始一個新的 session。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有沒有辦法建立一個 OpenClaw 實例團隊（一個 CEO 和多個代理）？">
    是的，透過 **多代理路由** 和 **子代理**。您可以建立一個協調器
    代理和數個具有各自工作空間和模型的工作代理。

    話雖如此，這最好被視為一個 **有趣的實驗**。它非常消耗 token，且通常
    比使用單一機器人搭配不同對話階段來得沒效率。我們設想的典型模型
    是您與一個機器人對話，並使用不同的對話階段進行平行工作。該
    機器人也可以在需要時生成子代理。

    文件：[多代理路由](/zh-Hant/concepts/multi-agent)、[子代理](/zh-Hant/tools/subagents)、[代理 CLI](/zh-Hant/cli/agents)。

  </Accordion>

  <Accordion title="為什麼上下文會在任務中途被截斷？我該如何預防？">
    對話階段的上下文受限於模型的視窗。長時間的對話、龐大的工具輸出或許多
    檔案都可能觸發壓縮或截斷。

    以下方法有幫助：

    - 要求機器人總結當前狀態並將其寫入檔案。
    - 在長時間任務前使用 `/compact`，並在切換主題時使用 `/new`。
    - 將重要的上下文保留在工作空間中，並要求機器人重新讀取它。
    - 針對漫長或平行的作業使用子代理，讓主對話保持精簡。
    - 如果這種情況經常發生，請選擇一個具有較大上下文視窗的模型。

  </Accordion>

  <Accordion title="我要如何完全重置 OpenClaw 但保留安裝？">
    使用重置指令：

    ```bash
    openclaw reset
    ```

    非互動式完全重置：

    ```bash
    openclaw reset --scope full --yes --non-interactive
    ```

    然後重新執行設定：

    ```bash
    openclaw onboard --install-daemon
    ```

    備註：

    - 如果入門程式發現現有的設定，也會提供 **重置** 選項。請參閱 [入門 (CLI)](/zh-Hant/start/wizard)。
    - 如果您使用了設定檔（`--profile` / `OPENCLAW_PROFILE`），請重置每個狀態目錄（預設為 `~/.openclaw-<profile>`）。
    - 開發重置：`openclaw gateway --dev --reset`（僅限開發；會清除開發設定 + 憑證 + 對話階段 + 工作空間）。

  </Accordion>

  <Accordion title='我收到「context too large」（語境過大）錯誤——如何重置或壓縮？'>
    使用以下方法之一：

    - **壓縮**（保留對話但總結較舊的輪次）：

      ```
      /compact
      ```

      或 `/compact <instructions>` 以引導總結。

    - **重置**（為相同的聊天金鑰使用新的會話 ID）：

      ```
      /new
      /reset
      ```

    如果持續發生此情況：

    - 啟用或調整 **會話修剪**（`agents.defaults.contextPruning`）以修剪舊的工具輸出。
    - 使用具有更大語境視窗的模型。

    文件：[壓縮](/zh-Hant/concepts/compaction)、[會話修剪](/zh-Hant/concepts/session-pruning)、[會話管理](/zh-Hant/concepts/session)。

  </Accordion>

  <Accordion title='為什麼我看到「LLM request rejected: messages.content.tool_use.input field required」錯誤？'>
    這是一個供應商驗證錯誤：模型發出了一個 `tool_use` 區塊，但缺少必需的
    `input`。這通常意味著會話歷史記錄已過時或損壞（通常發生在長執行緒後
    或工具/架構變更之後）。

    解決方法：使用 `/new`（獨立訊息）開始一個新的會話。

  </Accordion>

  <Accordion title="為什麼我每 30 分鐘會收到心跳訊息？">
    心跳預設每 **30m** 執行一次（使用 OAuth 驗證時為 **1h**）。調整或停用它們：

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

    如果 `HEARTBEAT.md` 存在但實際上是空的（僅包含空白行和像 `# Heading` 這樣的 markdown
    標題），OpenClaw 將跳過心跳執行以節省 API 呼叫。
    如果檔案缺失，心跳仍會執行，並由模型決定要執行的操作。

    每個代理的覆寫使用 `agents.list[].heartbeat`。文件：[心跳](/zh-Hant/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我是否需要將「機器人帳號」新增至 WhatsApp 群組？'>
    不需要。OpenClaw 運行在**您自己的帳號**上，所以如果您在群組中，OpenClaw 就能看到它。
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

  </Accordion>

  <Accordion title="如何取得 WhatsApp 群組的 JID？">
    選項 1（最快）：查看日誌 並在群組中傳送測試訊息：

    ```bash
    openclaw logs --follow --json
    ```

    尋找以 `@g.us` 結尾的 `chatId` (或 `from`)，例如：
    `1234567890-1234567890@g.us`。

    選項 2（如果已經設定/在允許清單中）：從配置列出群組：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文件：[WhatsApp](/zh-Hant/channels/whatsapp)、[Directory](/zh-Hant/cli/directory)、[Logs](/zh-Hant/cli/logs)。

  </Accordion>

  <Accordion title="為什麼 OpenClaw 不在群組中回覆？">
    兩個常見原因：

    - 提及閘門已開啟（預設）。您必須 @提及機器人（或符合 `mentionPatterns`）。
    - 您設定了 `channels.whatsapp.groups` 但未設定 `"*"`，且該群組不在允許清單中。

    請參閱 [Groups](/zh-Hant/channels/groups) 和 [Group messages](/zh-Hant/channels/group-messages)。

  </Accordion>

<Accordion title="群組/主題會與 DM 共用上下文嗎？">私人聊天預設會折疊至主工作階段。群組/頻道有自己的工作階段金鑰，而 Telegram 主題 / Discord 執行緒是獨立的工作階段。請參閱 [Groups](/zh-Hant/channels/groups) 和 [Group messages](/zh-Hant/channels/group-messages)。</Accordion>

  <Accordion title="我可以建立多少個工作區和代理程式？">
    沒有硬性限制。數十個（甚至數百個）都沒問題，但請留意以下事項：

    - **硬碟空間增長：** 會話和逐字稿存放在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本：** 代理程式越多表示並行使用的模型越多。
    - **維運負擔：** 每個代理程式的身分驗證設定檔、工作區和通道路由。

    建議：

    - 為每個代理程式保留一個 **作用中** 的工作區（`agents.defaults.workspace`）。
    - 如果硬碟空間增加，請清理舊的會話（刪除 JSONL 或儲存條目）。
    - 使用 `openclaw doctor` 來找出散落的工作區和設定檔不符的情況。

  </Accordion>

  <Accordion title="我可以同時執行多個機器人或聊天（Slack）嗎？該如何設定？">
    可以。使用 **多代理程式路由** 來執行多個隔離的代理程式，並根據
    通道/帳號/對等方路由傳入訊息。Slack 受支援為一個通道，並可綁定至特定的代理程式。

    瀏覽器存取功能強大，但並非「能做人類能做的任何事」——反機器人措施、CAPTCHA 和 MFA
    仍可能阻擋自動化。為了獲得最可靠的瀏覽器控制，請在主機上使用本機 Chrome MCP，
    或在實際執行瀏覽器的機器上使用 CDP。

    最佳實務設定：

    - 常駐的 Gateway 主機（VPS/Mac mini）。
    - 每個角色一個代理程式（綁定）。
    - 綁定至這些代理程式的 Slack 通道。
    - 視需要透過 Chrome MCP 或節點使用本機瀏覽器。

    文件：[多代理程式路由](/zh-Hant/concepts/multi-agent)、[Slack](/zh-Hant/channels/slack)、
    [瀏覽器](/zh-Hant/tools/browser)、[節點](/zh-Hant/nodes)。

  </Accordion>
</AccordionGroup>

## 模型、故障轉移和驗證設定檔

模型問答 — 預設值、選擇、別名、切換、故障轉移、身分驗證設定檔 —
位於 [模型常見問題](/zh-Hant/help/faq-models)。

## 閘道器：連接埠、「已在執行」和遠端模式

<AccordionGroup>
  <Accordion title="Gateway 使用哪個連接埠？">
    `gateway.port` 控制用於 WebSocket + HTTP（控制 UI、hooks 等）的單一多工連接埠。

    優先順序：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='為什麼 openclaw gateway status 顯示「Runtime: running」但「Connectivity probe: failed」？'>
    因為「running」是 **監管程式 (supervisor)** 的視角 (launchd/systemd/schtasks)。連線探測是指 CLI 實際連線至 gateway WebSocket。

    使用 `openclaw gateway status` 並相信這幾行輸出：

    - `Probe target:` (探測實際使用的 URL)
    - `Listening:` (連接埠上實際綁定的內容)
    - `Last gateway error:` (常見根本原因：程序存活但連接埠未監聽)

  </Accordion>

  <Accordion title='為什麼 openclaw gateway status 顯示的「Config (cli)」與「Config (service)」不同？'>
    您正在編輯一份配置檔案，但服務正在執行另一份 (通常是 `--profile` / `OPENCLAW_STATE_DIR` 不一致)。

    修復方法：

    ```bash
    openclaw gateway install --force
    ```

    請在您希望服務使用的相同 `--profile` / 環境中執行該指令。

  </Accordion>

  <Accordion title='「another gateway instance is already listening」是什麼意思？'>
    OpenClaw 透過在啟動時立即綁定 WebSocket 監聽器來強制執行執行時鎖定 (預設 `ws://127.0.0.1:18789`)。如果綁定失敗並回傳 `EADDRINUSE`，它會拋出 `GatewayLockError`，表示已有另一個執行實例正在監聽。

    修復方法：停止另一個執行實例、釋放連接埠，或使用 `openclaw gateway --port <port>` 執行。

  </Accordion>

  <Accordion title="如何在遠端模式下執行 OpenClaw（用戶端連接到其他地方的 Gateway）？">
    設定 `gateway.mode: "remote"` 並指向遠端 WebSocket URL，可選地使用共用的遠端憑證：

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

    注意事項：

    - `openclaw gateway` 僅在 `gateway.mode` 為 `local` 時啟動（或者您傳遞覆寫旗標）。
    - macOS 應用程式會監看設定檔，並在這些值變更時即時切換模式。
    - `gateway.remote.token` / `.password` 僅為用戶端遠端憑證；它們本身不啟用本機 gateway 驗證。

  </Accordion>

  <Accordion title='控制介面顯示「未授權」（或持續重新連線）。現在該怎麼辦？'>
    您的閘道驗證路徑與 UI 的驗證方法不符。

    事實（來自程式碼）：

    - 控制介面會將 token 保留在 `sessionStorage` 中，供目前瀏覽器分頁階段和選定的閘道 URL 使用，因此同分頁重新整理可繼續運作，無需還原長期 localStorage token 持續性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，當閘道傳回重試提示（`canRetryWithDeviceToken=true`、`recommendedNextStep=retry_with_device_token`）時，受信任的用戶端可以嘗試使用快取的裝置 token 進行一次有限的重試。
    - 該快取 token 重試現在會重複使用與裝置 token 一同儲存的快取核准範圍。明確的 `deviceToken` / 明確的 `scopes` 呼叫者仍會保留其要求的範圍集，而不是繼承快取的範圍。
    - 在該重試路徑之外，連線驗證優先順序首先是明確的共用 token/密碼，然後是明確的 `deviceToken`，接著是儲存的裝置 token，最後是啟動 token。
    - 內建的設定碼啟動僅適用於節點。核准後，它會傳回具有 `scopes: []` 的節點裝置 token，並不會傳回移交的操作員 token。

    修復方法：

    - 最快：`openclaw dashboard`（會列印並複製儀表板 URL，嘗試開啟；如果是無介面模式，會顯示 SSH 提示）。
    - 如果您還沒有 token：`openclaw doctor --generate-gateway-token`。
    - 如果是遠端，請先建立通道：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然後開啟 `http://127.0.0.1:18789/`。
    - 共用金鑰模式：設定 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然後在控制介面設定中貼上相符的秘密。
    - Tailscale Serve 模式：確保已啟用 `gateway.auth.allowTailscale`，並且您開啟的是 Serve URL，而不是繞過 Tailscale 身分標頭的原始回送/tailnet URL。
    - 受信任代理模式：確保您是透過設定的身分感知代理連線，而不是原始閘道 URL。同主機回送代理也需要 `gateway.auth.trustedProxy.allowLoopback = true`。
    - 如果在經過一次重試後仍然不匹配，請輪替/重新核准配對的裝置 token：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 如果該輪替呼叫表示被拒絕，請檢查兩件事：
      - 配對裝置階段只能輪替其**自己的**裝置，除非它們也具有 `operator.admin`
      - 明確的 `--scope` 值不能超過呼叫者目前的操作員範圍
    - 仍然卡住？執行 `openclaw status --all` 並依照 [疑難排解](/zh-Hant/gateway/troubleshooting) 操作。請參閱 [儀表板](/zh-Hant/web/dashboard) 以取得驗證詳細資訊。

  </Accordion>

  <Accordion title="我設定了 gateway.bind tailnet 但無法綁定且沒有監聽">
    `tailnet` bind 會從您的網路介面 (100.64.0.0/10) 中選取一個 Tailscale IP。如果機器不在 Tailscale 上（或介面已關閉），就沒有綁定目標。

    修正方法：

    - 在該主機上啟動 Tailscale（使其擁有 100.x 位址），或
    - 切換到 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是明確指定的。`auto` 偏好 loopback；當您想要僅限 tailnet 的綁定時，請使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="我可以在同一台主機上執行多個 Gateway 嗎？">
    通常不行 - 一個 Gateway 可以執行多個訊息頻道和代理程式。只有在您需要冗餘（例如：救援機器人）或強隔離時才使用多個 Gateway。

    可以，但您必須隔離：

    - `OPENCLAW_CONFIG_PATH` （每個執行個體的設定）
    - `OPENCLAW_STATE_DIR` （每個執行個體的狀態）
    - `agents.defaults.workspace` （工作區隔離）
    - `gateway.port` （唯一埠號）

    快速設定（建議）：

    - 每個執行個體使用 `openclaw --profile <name> ...` （會自動建立 `~/.openclaw-<name>`）。
    - 在每個設定檔中設定唯一的 `gateway.port` （或為手動執行傳遞 `--port`）。
    - 安裝每個設定檔的服務：`openclaw --profile <name> gateway install`。

    設定檔也會為服務名稱加上後綴（`ai.openclaw.<profile>`；舊版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
    完整指南：[多個閘道](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='“invalid handshake” / 代碼 1008 是什麼意思？'>
    Gateway 是一個 **WebSocket 伺服器**，它期望收到的第一條訊息是
    一個 `connect` 幀。如果收到其他任何內容，它將以
    **代碼 1008**（策略違規）關閉連線。

    常見原因：

    - 您在瀏覽器中打開了 **HTTP** URL (`http://...`) 而非 WS 客戶端。
    - 您使用了錯誤的連接埠或路徑。
    - 代理伺服器或隧道移除了驗證標頭或發送了非 Gateway 請求。

    快速修復：

    1. 使用 WS URL：`ws://<host>:18789`（如果是 HTTPS 則使用 `wss://...`）。
    2. 不要在正常的瀏覽器分頁中打開 WS 連接埠。
    3. 如果開啟了驗證，請在 `connect` 幀中包含 token/密碼。

    如果您使用的是 CLI 或 TUI，URL 應如下所示：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    協議詳情：[Gateway protocol](/zh-Hant/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 日誌記錄與除錯

<AccordionGroup>
  <Accordion title="日誌在哪裡？">
    檔案日誌（結構化）：

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    您可以透過 `logging.file` 設定穩定的路徑。檔案日誌級別由 `logging.level` 控制。主控台詳細程度由 `--verbose` 和 `logging.consoleLevel` 控制。

    最快的日誌追蹤方式：

    ```bash
    openclaw logs --follow
    ```

    服務/監督程式日誌（當 gateway 透過 launchd/systemd 執行時）：

    - macOS launchd stdout：`~/Library/Logs/openclaw/gateway.log`（設定檔使用 `gateway-<profile>.log`；stderr 會被抑制）
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    詳情請參閱 [Troubleshooting](/zh-Hant/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="如何啟動/停止/重新啟動 Gateway 服務？">
    使用 gateway 輔助工具：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行 gateway，`openclaw gateway --force` 可以回收連接埠。請參閱 [Gateway](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="I closed my terminal on Windows - how do I restart OpenClaw?">
    有 **兩種 Windows 安裝模式**：

    **1) WSL2 (推薦)：** Gateway 在 Linux 內執行。

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

    **2) 原生 Windows (不推薦)：** Gateway 直接在 Windows 中執行。

    開啟 PowerShell 並執行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行它（無服務），請使用：

    ```powershell
    openclaw gateway run
    ```

    文件：[Windows (WSL2)](/zh-Hant/platforms/windows)、[Gateway service runbook](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="The Gateway is up but replies never arrive. What should I check?">
    首先進行快速健康檢查：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常見原因：

    - 模型驗證未載入到 **gateway host** 上（請檢查 `models status`）。
    - 通道配對/允許清單封鎖了回覆（請檢查通道設定 + 記錄）。
    - WebChat/Dashboard 在沒有正確 token 的情況下開啟。

    如果您是遠端連線，請確認通道/Tailscale 連線已啟動，且
    Gateway WebSocket 可以連線。

    文件：[Channels](/zh-Hant/channels)、[Troubleshooting](/zh-Hant/gateway/troubleshooting)、[Remote access](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title='"Disconnected from gateway: no reason" - what now?'>
    這通常表示 UI 失去了 WebSocket 連線。請檢查：

    1. Gateway 是否正在執行？`openclaw gateway status`
    2. Gateway 是否健康？`openclaw status`
    3. UI 是否有正確的 token？`openclaw dashboard`
    4. 如果是遠端連線，通道/Tailscale 連線是否啟動？

    然後檢視記錄：

    ```bash
    openclaw logs --follow
    ```

    文件：[Dashboard](/zh-Hant/web/dashboard)、[Remote access](/zh-Hant/gateway/remote)、[Troubleshooting](/zh-Hant/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失敗。我應該檢查什麼？">
    先檢查日誌和通道狀態：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然後比對錯誤：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 選單的項目太多。OpenClaw 已經會修剪至 Telegram 限制並以較少的指令重試，但仍需要捨棄部分選單項目。請減少插件/技能/自訂指令，或者如果您不需要選單，請停用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或類似的網路錯誤：如果您在 VPS 或代理伺服器後方，請確認允許傳出 HTTPS 且 DNS 能正常解析 `api.telegram.org`。

    如果 Gateway 是遠端的，請確保您正在查看 Gateway 主機上的日誌。

    文件：[Telegram](/zh-Hant/channels/telegram)、[通道疑難排解](/zh-Hant/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 沒有顯示輸出。我應該檢查什麼？">
    首先確認 Gateway 可連線且代理程式可以執行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 來查看目前狀態。如果您預期在聊天通道中收到回覆，請確保已啟用傳遞功能 (`/deliver on`)。

    文件：[TUI](/zh-Hant/web/tui)、[Slash 指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="我該如何完全停止然後啟動 Gateway？">
    如果您安裝了服務：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    這會停止/啟動 **受管服務**（macOS 上的 launchd，Linux 上的 systemd）。
    當 Gateway 作為常駐程式在背景執行時，請使用此方法。

    如果您在前台執行，請使用 Ctrl-C 停止，然後：

    ```bash
    openclaw gateway run
    ```

    文件：[Gateway 服務手冊](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: 重啟 **背景服務** (launchd/systemd)。
    - `openclaw gateway`: 在此終端機階段中 **於前景** 執行 gateway。

    如果您安裝了服務，請使用 gateway 指令。當您想要單次、前景執行時，請使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    以 `--verbose` 啟動 Gateway 以獲得更多主控台詳細資訊。然後檢查日誌檔案中的通道授權、模型路由和 RPC 錯誤。
  </Accordion>
</AccordionGroup>

## 媒體與附件

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    來自代理程式的傳出附件必須包含 `MEDIA:<path-or-url>` 行（在獨立的一行）。請參閱 [OpenClaw assistant setup](/zh-Hant/start/openclaw) 和 [Agent send](/zh-Hant/tools/agent-send)。

    CLI 傳送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    同時請檢查：

    - 目標通道支援傳出媒體且未被允許清單封鎖。
    - 檔案在提供者的大小限制內（圖片會被調整大小至最大 2048px）。
    - `tools.fs.workspaceOnly=true` 將本機路徑傳送限制在工作區、temp/media-store 和沙盒驗證的檔案。
    - `tools.fs.workspaceOnly=false` 允許 `MEDIA:` 傳送代理程式已可讀取的主機本機檔案，但僅限於媒體及安全的文件類型（圖片、音訊、影片、PDF 和 Office 文件）。純文字和類似機密的檔案仍然會被封鎖。

    參閱 [Images](/zh-Hant/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全與存取控制

<AccordionGroup>
  <Accordion title="讓 OpenClaw 接收傳入的私人訊息是否安全？">
    將傳入的私人訊息視為不受信任的輸入。預設值的設計旨在降低風險：

    - 支援私人訊息頻道的預設行為是 **配對** (pairing)：
      - 未知的發送者會收到配對碼；機器人不會處理其訊息。
      - 使用以下指令批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 待處理的請求上限為 **每頻道 3 個**；如果配對碼未送達，請檢查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公開開啟私人訊息需要明確選擇加入 (`dmPolicy: "open"` 和允許清單 `"*"`)。

    執行 `openclaw doctor` 以顯示具有風險的私人訊息政策。

  </Accordion>

  <Accordion title="提示詞注入 是否僅是公開機器人需要注意的問題？">
    不會。提示詞注入是關於 **不受信任的內容**，而不僅僅是誰可以傳送私人訊息給機器人。
    如果您的助理讀取外部內容（網頁搜尋/擷取、瀏覽器頁面、電子郵件、
    文件、附件、貼上的記錄檔），該內容可能包含試圖
    劫持模型的指令。即使 **您是唯一的發送者**，這種情況也可能發生。

    最大的風險在於啟用工具時：模型可能被誘騙
    洩漏背景資訊或代表您呼叫工具。您可以透過以下方式減少受影響範圍：

    - 使用唯讀或停用工具的「讀取器」代理程式來總結不受信任的內容
    - 對啟用工具的代理程式，將 `web_search` / `web_fetch` / `browser` 保持關閉
    - 將解碼後的檔案/文件文字也視為不受信任：OpenResponses
      `input_file` 和媒體附件擷取都會將擷取的文字包裝在
      明確的外部內容邊界標記中，而不是直接傳遞原始檔案文字
    - 沙盒機制和嚴格的工具允許清單

    詳情：[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="OpenClaw 因為使用 TypeScript/Node 而非 Rust/WASM，所以比較不安全嗎？">
    語言和執行環境固然重要，但它們並非個人助理的主要風險來源。OpenClaw 的實際風險包括：閘道暴露、誰能傳訊息給機器人、提示注入、工具範圍、憑證處理、瀏覽器存取、執行存取，以及對第三方技能或外掛的信任。

    Rust 和 WASM 可以對某些類別的程式碼提供更強的隔離，但它們無法解決提示注入、不良的允許清單、公開閘道暴露、過於寬泛的工具，或是已登入敏感帳號的瀏覽器設定檔等問題。請將以下視為主要控管手段：

    - 將 Gateway 保持為私有或設定驗證
    - 對私訊和群組使用配對與允許清單
    - 對不信任的輸入拒絕或沙箱化風險工具
    - 僅安裝受信任的外掛與技能
    - 在變更設定後執行 `openclaw security audit --deep`

    詳情：[Security](/zh-Hant/gateway/security)、[Sandboxing](/zh-Hant/gateway/sandboxing)。

  </Accordion>

  <Accordion title="我看到有關 OpenClaw 實例暴露的報告。我應該檢查什麼？">
    首先檢查您的實際部署：

    ```bash
    openclaw security audit --deep
    openclaw gateway status
    ```

    更安全的基準做法是：

    - Gateway 繫結到 `loopback`，或僅透過已驗證的私人存取（例如 tailnet、SSH tunnel、Token/密碼驗證，或正確設定的信任代理）公開
    - 私訊採用 `pairing` 或 `allowlist` 模式
    - 群組加入允許清單並啟用提及限制，除非每位成員都受信任
    - 對於讀取不信任內容的代理人，拒絕或嚴格限制高風險工具（`exec`、`browser`、`gateway`、`cron`）的範圍
    - 在工具執行需要縮小影響範圍時啟用沙箱化

    未驗證的公開綁定、開放且具備工具的私訊/群組，以及暴露的瀏覽器控制，是應優先修補的問題。詳情：
    [Security audit checklist](/zh-Hant/gateway/security#security-audit-checklist)。

  </Accordion>

  <Accordion title="安裝 ClawHub 技能和第三方插件安全嗎？">
    請將第三方技能和插件視為您選擇信任的程式碼。
    ClawHub 技能頁面會在安裝前公開掃描狀態，且 OpenClaw 外掛
    安裝/更新流程會執行內建的危險程式碼檢查，但掃描並非
    完整的安全邊界。

    更安全的模式：

    - 優先選擇受信任的作者和釘選版本
    - 在啟用前閱讀技能或外掛內容
    - 將外掛和技能允許清單保持狹窄
    - 在具備最少工具的沙盒中執行不受信任輸入的工作流程
    - 避免賦予第三方程式碼對檔案系統、執行、瀏覽器或密碼的廣泛存取權

    詳情：[技能](/zh-Hant/tools/skills)、[外掛](/zh-Hant/tools/plugin)、
    [安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="我的機器人應該有自己的電子郵件、GitHub 帳號或電話號碼嗎？">
    是的，對於大多數設定而言如此。使用獨立的帳號和電話號碼隔離機器人
    可在發生問題時減少受影響範圍。這也讓您更容易輪換
    憑證或撤銷存取權，而不會影響您的個人帳號。

    從小處開始。僅授予您實際需要的工具和帳號存取權，並在需要時
    稍後再擴充。

    文件：[安全性](/zh-Hant/gateway/security)、[配對](/zh-Hant/channels/pairing)。

  </Accordion>

  <Accordion title="我可以讓它自主管理我的簡訊，這樣安全嗎？">
    我們**不**建議讓其擁有您個人訊息的完全自主權。最安全的模式是：

    - 將私人訊息保持在 **配對模式** 或嚴格的允許清單中。
    - 如果您希望它代表您傳送訊息，請使用 **獨立的號碼或帳號**。
    - 讓它撰寫草稿，然後 **在傳送前進行核准**。

    如果您想要進行實驗，請在專用帳號上進行並保持隔離。請參閱
    [安全性](/zh-Hant/gateway/security)。

  </Accordion>

<Accordion title="我可以將較便宜的模型用於個人助理任務嗎？">可以，**如果**該代理僅用於聊天且輸入是受信任的。較低層級的模型更容易受到指令劫持，因此請避免為啟用工具的代理或在讀取不受信任的內容時使用它們。如果您必須使用較小的模型，請鎖定工具並在沙盒中執行。請參閱 [安全性](/zh-Hant/gateway/security)。</Accordion>

  <Accordion title="我在 Telegram 中執行了 /start 但沒有收到配對碼">
    配對碼**僅**在未知發送者傳送訊息給機器人並且啟用
    `dmPolicy: "pairing"` 時才會傳送。單獨的 `/start` 不會產生代碼。

    檢查待處理的請求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您希望立即存取，請將您的發送者 ID 加入允許清單，或為該帳戶設定
    `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它會傳送訊息給我的聯絡人嗎？配對如何運作？">
    不會。預設的 WhatsApp 私訊政策是**配對**。未知發送者只會收到配對碼，且其訊息**不會被處理**。OpenClaw 僅回覆它收到的聊天或您觸發的明確傳送。

    使用以下方式批准配對：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待處理的請求：

    ```bash
    openclaw pairing list whatsapp
    ```

    精靈手機號碼提示：這是用來設定您的**允許清單/擁有者**，以便允許您自己的私訊。它不用於自動傳送。如果您在個人的 WhatsApp 號碼上執行，請使用該號碼並啟用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天指令、中止任務，以及「它無法停止」

<AccordionGroup>
  <Accordion title="如何停止內部系統訊息顯示在聊天中？">
    大多數內部或工具訊息僅在該工作階段啟用 **verbose**、**trace** 或 **reasoning** 時
    才會出現。

    在您看到問題的聊天中進行修復：

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    如果仍然顯得過於嘈雜，請檢查 Control UI 中的工作階段設定並將 verbose
    設定為 **inherit**。同時請確認您在設定中未將 `verboseDefault` 設定為 `on` 的 bot 設定檔。

    文件：[Thinking and verbose](/zh-Hant/tools/thinking)、[Security](/zh-Hant/gateway/security/index#reasoning-and-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在執行的任務？">
    發送以下任一訊息**作為獨立訊息**（無斜線）：

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

    這些是中止觸發器（而非斜線指令）。

    對於背景程序（來自 exec 工具），您可以要求 agent 執行：

    ```
    process action:kill sessionId:XXX
    ```

    斜線指令概覽：請參閱 [Slash commands](/zh-Hant/tools/slash-commands)。

    大多數指令必須作為以 `/` 開頭的**獨立**訊息發送，但部分快捷方式（如 `/status`）對於允許清單中的發送者也可在行內使用。

  </Accordion>

  <Accordion title='如何從 Telegram 傳送 Discord 訊息？（"Cross-context messaging denied"）'>
    OpenClaw 預設會封鎖**跨提供者**傳訊。如果工具呼叫綁定
    至 Telegram，除非您明確允許，否則它不會傳送到 Discord。

    為 agent 啟用跨提供者傳訊：

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

    編輯設定後請重新啟動 gateway。

  </Accordion>

  <Accordion title='為什麼感覺 bot 會「忽略」連續快速發送的訊息？'>
    執行中輸入的提示預設會被引導至目前執行中。使用 `/queue` 來選擇執行中的行為：

    - `steer` - 在下一個模型邊界引導目前的執行
    - `followup` - 將訊息加入佇列，並在目前執行結束後逐一執行
    - `collect` - 將相容訊息加入佇列，並在目前執行結束後回覆一次
    - `interrupt` - 中止目前執行並重新開始

    預設模式為 `steer`。您可以為佇列模式添加 `debounce:0.5s cap:25 drop:summarize` 等選項。請參閱 [Command queue](/zh-Hant/concepts/queue) 和 [Steering queue](/zh-Hant/concepts/queue-steering)。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title="使用 API 金鑰時，Anthropic 的預設模型是什麼？">
    在 OpenClaw 中，憑證與模型選擇是分開的。設定 `ANTHROPIC_API_KEY`（或在 auth profiles 中儲存 Anthropic API 金鑰）會啟用驗證，但實際的預設模型取決於您在 `agents.defaults.model.primary` 中的設定（例如 `anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，表示 Gateway 無法在預期的 `auth-profiles.json`
    中，為正在運行的代理程式找到 Anthropic 憑證。
  </Accordion>
</AccordionGroup>

---

還是卡住了？請在 [Discord](https://discord.com/invite/clawd) 提問，或開啟一個 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。

## 相關內容

- [初次執行 FAQ](/zh-Hant/help/faq-first-run) — 安裝、上手、驗證、訂閱、早期失敗
- [模型 FAQ](/zh-Hant/help/faq-models) — 模型選擇、故障轉移、驗證設定檔
- [疑難排解](/zh-Hant/help/troubleshooting) — 依症狀優先的分診
