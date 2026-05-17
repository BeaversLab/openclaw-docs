---
summary: "關於 OpenClaw 設定、設定組態和使用的常見問題"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常見問題"
---

針對真實環境設定（本機開發、VPS、多重代理、OAuth/API 金鑰、模型容錯移轉）的快速解答與更深入的疑難排解。關於執行時期診斷，請參閱 [疑難排解](/zh-Hant/gateway/troubleshooting)。關於完整的設定參考，請參閱 [設定](/zh-Hant/gateway/configuration)。

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

   執行即時閘道健康檢查，包括支援時的通道探測（需要可連線的閘道）。請參閱 [健康狀態](/zh-Hant/gateway/health)。

5. **追蹤最新記錄**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 停機，則回退至：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   檔案日誌與服務日誌是分開的；請參閱 [日誌記錄](/zh-Hant/logging) 與 [疑難排解](/zh-Hant/gateway/troubleshooting)。

6. **執行醫生程式（修復）**

   ```bash
   openclaw doctor
   ```

   修復/遷移設定/狀態並執行健康檢查。請參閱 [Doctor](/zh-Hant/gateway/doctor)。

7. **閘道器快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向執行中的閘道要求完整快照（僅限 WebSocket）。請參閱 [健康狀態](/zh-Hant/gateway/health)。

## 快速開始與首次執行設定

首次執行的常見問題 — 安裝、上架、驗證路由、訂閱、初始失敗 — 位於 [首次執行 FAQ](/zh-Hant/help/faq-first-run)。

## 什麼是 OpenClaw？

<AccordionGroup>
  <Accordion title="OpenClaw 是什麼，用一段話概括？">
    OpenClaw 是您在自己的設備上運行的個人 AI 助手。它會在您已經使用的訊息介面上回覆（WhatsApp、Telegram、Slack、Mattermost、Discord、Google Chat、Signal、iMessage、WebChat 以及內建的頻道外掛如 QQ 機器人），並且在支援的平台上還能進行語音互動和使用即時 Canvas。**Gateway** 是永遠在線的控制平面；而助理則是產品本身。
  </Accordion>

  <Accordion title="價值主張">
    OpenClaw 不僅僅是「一個 Claude 的包裝器」。它是一個 **優先本機的控制平面**，讓您能在 **您自己的硬體** 上執行強大的助理，從您已經使用的聊天應用程式中連線，並具備有狀態的工作階段、記憶和工具 — 無需將您的工作流程控制權交給託管的 SaaS。

    重點特色：

    - **您的裝置，您的資料：** 在您想要的地方執行 Gateway（Mac、Linux、VPS），並將工作區 + 工作階段歷史記錄保留在本機。
    - **真實通道，而非網頁沙盒：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/等等，加上支援平台上的行動語音和 Canvas。
    - **模型中立：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，並透過每個代理的路由和容錯移轉。
    - **僅限本機選項：** 執行本機模型，因此如果您願意，**所有資料都可以保留在您的裝置上**。
    - **多重代理路由：** 根據通道、帳戶或任務分離代理，每個都有自己的工作區和預設值。
    - **開源且可駭：** 檢查、擴展和自託管，無廠商鎖定。

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

  <Accordion title="OpenClaw 是否能協助 SaaS 進行潛在客戶開發、外聯、廣告和部落格營運？">
    在**研究、篩選和草擬**方面是可以的。它可以掃描網站、建立候選清單、
    總結潛在客戶，並撰寫外聯或廣告文案草稿。

    對於**外聯或廣告投放**，請保留人工審查環節。避免垃圾郵件，遵守當地法律和
    平台政策，並在發送前審查所有內容。最安全的模式是讓
    OpenClaw 撰寫草稿，由您進行審核批准。

    文件：[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="相較於 Claude Code，OpenClaw 在網頁開發方面有哪些優勢？">
    OpenClaw 是一個**個人助理**和協調層，而非 IDE 的替代品。請使用
    Claude Code 或 Codex 以在程式庫中獲得最快的直接編碼迴路。當您需要
    持久記憶、跨裝置存取和工具協調時，請使用 OpenClaw。

    優勢：

    - 跨會話的**持久記憶 + 工作區**
    - **多平台存取**（WhatsApp、Telegram、TUI、WebChat）
    - **工具協調**（瀏覽器、檔案、排程、掛鉤）
    - **永遠在線的閘道**（在 VPS 上執行，隨處互動）
    - 用於本地瀏覽器/螢幕/相機/執行的**節點**

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

    - **Cron 任務**：隔離的任務可以針對每個任務設定 `model` 覆寫。
    - **子代理程式**：將任務路由到具有不同預設模型的獨立代理程式。
    - **按需切換**：使用 `/model`/en/tools/slash-commands/en/concepts/multi-agent/en/automation/cron-jobs 隨時切換目前會話的模型。

    請參閱 [Cron 任務](%%PH:LINK_TARGET:748:3a1c7fcc%)、[多代理程式路由](%%PH:LINK_TARGET:749:03f71e34%) 和 [斜線指令](%%PH:LINK_TARGET:750:5fda6bce%)。

  </Accordion>

  <Accordion title="機器人在執行繁重工作時會凍結。我該如何將其卸載？">
    對於長時間或並行任務，請使用**子代理**。子代理在自己的會話中運行，
    返回摘要，並讓您的主對話保持響應。

    要求您的機器人「為此任務生成一個子代理」或使用 `/subagents`。
    在對話中使用 `/status` 以查看網關當前正在做什麼（以及它是否忙碌）。

    Token 提示：長時間任務和子代理都會消耗 Token。如果擔心成本，請透過 `agents.defaults.subagents.model` 為子代理設定更便宜的模型。

    文件：[Sub-agents](/zh-Hant/tools/subagents)、[Background Tasks](/zh-Hant/automation/tasks)。

  </Accordion>

  <Accordion title="綁定執行緒的子代理會話在 Discord 上如何運作？">
    使用執行緒綁定。您可以將 Discord 執行緒綁定到子代理或會話目標，以便該執行緒中的後續訊息保持在該綁定的會話上。

    基本流程：

    - 使用 `thread: true` 透過 `sessions_spawn` 生成（並可選擇使用 `mode: "session"` 進行持續的後續追蹤）。
    - 或使用 `/focus <target>` 手動綁定。
    - 使用 `/agents` 檢查綁定狀態。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 來控制自動取消聚焦。
    - 使用 `/unfocus` 分離執行緒。

    必要配置：

    - 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆蓋值：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 生成時自動綁定：`channels.discord.threadBindings.spawnSessions` 預設為 `true`；將其設為 `false` 以停用綁定執行緒的會話生成。

    文件：[Sub-agents](/zh-Hant/tools/subagents)、[Discord](/zh-Hant/channels/discord)、[Configuration Reference](/zh-Hant/gateway/configuration-reference)、[Slash commands](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="子代理已完成，但完成更新發送到了錯誤的地方或從未發布。我應該檢查什麼？">
    首先檢查已解析的請求者路由：

    - 完成模式的子代理傳遞優先使用任何綁定的執行緒或對話路由（如果存在）。
    - 如果完成來源僅包含頻道，OpenClaw 會退回到請求者會話的存儲路由（`lastChannel` / `lastTo` / `lastAccountId`），以便直接傳遞仍然可以成功。
    - 如果既不存在綁定路由也不存在可用的存儲路由，直接傳遞可能會失敗，結果將退回到佇列會話傳遞，而不是立即發布到聊天。
    - 無效或過時的目標仍可能強制退回到佇列或最終傳遞失敗。
    - 如果子代理最後一個可見的助理回覆是確切的靜默令牌 `NO_REPLY` / `no_reply`，或者確切是 `ANNOUNCE_SKIP`，OpenClaw 會有意抑制公告，而不是發布過時的早期進度。
    - 如果子代理僅在工具調用後超時，公告可以將其折疊為一個簡短的局部進度摘要，而不是重播原始工具輸出。

    調試：

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    文檔：[子代理](/zh-Hant/tools/subagents)、[後台任務](/zh-Hant/automation/tasks)、[會話工具](/zh-Hant/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒沒有觸發。我應該檢查什麼？">
    Cron 在 Gateway 程序內部運行。如果 Gateway 沒有持續運行，
    排程的工作將不會運行。

    檢查清單：

    - 確認 cron 已啟用 (`cron.enabled`) 並且未設定 `OPENCLAW_SKIP_CRON`。
    - 檢查 Gateway 是否 24/7 運行（無休眠/重啟）。
    - 驗證工作的時區設定 (`--tz` 與主機時區的對比)。

    除錯：

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Automation](/zh-Hant/automation)。

  </Accordion>

  <Accordion title="Cron 已觸發，但沒有任何內容發送到頻道。為什麼？">
    首先檢查傳遞模式：

    - `--no-deliver` / `delivery.mode: "none"` 表示不預期有 runner 備援傳送。
    - 缺少或無效的 announce 目標 (`channel` / `to`) 表示 runner 跳過了出站傳遞。
    - 頻道認證失敗 (`unauthorized`, `Forbidden`) 表示 runner 嘗試傳遞但憑證阻擋了它。
    - 靜默的隔離結果 (`NO_REPLY` / `no_reply` 僅有) 被視為故意不可傳遞，因此 runner 也會抑制排隊的備援傳遞。

    對於隔離的 cron 工作，當聊天路由可用時，Agent 仍然可以使用 `message`
    工具直接發送。`--announce` 僅控制 Agent 尚未發送的最終文字的 runner 備援路徑。

    除錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs), [Background Tasks](/zh-Hant/automation/tasks)。

  </Accordion>

  <Accordion title="為什麼隔離的 cron 執行會切換模型或重試一次？">
    這通常是即時模型切換路徑，而不是重複排程。

    隔離的 cron 可以在執行拋出 `LiveSessionModelSwitchError` 時持續化執行時期的模型移交並重試。重試會保留切換後的提供者/模型，且如果切換帶有新的認證設定檔覆寫，cron 也會在重試前將其持續化。

    相關選擇規則：

    - Gmail hook 模型覆寫在適用時優先。
    - 然後是每個工作的 `model`。
    - 然後是任何已儲存的 cron-session 模型覆寫。
    - 然後是正常的 Agent/預設模型選擇。

    重試迴圈是有界的。在初次嘗試加上 2 次切換重試後，cron 會中止而不是無限迴圈。

    除錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs), [cron CLI](/zh-Hant/cli/cron)。

  </Accordion>

  <Accordion title="如何在 Linux 上安裝技能？">
    使用原生 `openclaw skills` 指令或將技能放入您的工作區。macOS 技能 UI 在 Linux 上無法使用。
    瀏覽技能請前往 [https://clawhub.ai](https://clawhub.ai)。

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

    原生 `openclaw skills install` 會寫入目前使用中的工作區 `skills/`
    目錄。僅當您想要發布或
    同步您自己的技能時，才需安裝獨立的 `clawhub` CLI。若要跨代理程式共享安裝，請將技能置於
    `~/.openclaw/skills` 之下，並使用 `agents.defaults.skills` 或
    `agents.list[].skills`，如果您想限制哪些代理程式可以看到它。

  </Accordion>

  <Accordion title="OpenClaw 可以按排程或在背景持續執行任務嗎？">
    可以。使用 Gateway 排程器：

    - **Cron jobs** 用於排程或週期性任務（重啟後仍會保留）。
    - **Heartbeat** 用於「主會話」的定期檢查。
    - **Isolated jobs** 用於發布摘要或傳送到聊天的自主代理程式。

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Automation](/zh-Hant/automation)、
    [Heartbeat](/zh-Hant/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以在 Linux 上執行 Apple macOS 專屬的技能嗎？">
    不能直接執行。macOS 技能受 `metadata.openclaw.os` 以及必要的二進位檔案限制，而且只有在 **Gateway 主機**上符合資格時，這些技能才會出現在系統提示詞中。在 Linux 上，`darwin` 專屬的技能（例如 `apple-notes`、`apple-reminders`、`things-mac`）將無法載入，除非您覆寫該限制條件。

    您有三種支援的模式：

    **選項 A - 在 Mac 上執行 Gateway（最簡單）。**
    在存在 macOS 二進位檔案的地方執行 Gateway，然後透過 [遠端模式](#gateway-ports-already-running-and-remote-mode) 或 Tailscale 從 Linux 連線。由於 Gateway 主機是 macOS，技能會正常載入。

    **選項 B - 使用 macOS 節點（無 SSH）。**
    在 Linux 上執行 Gateway，配對一個 macOS 節點（選單列應用程式），並在 Mac 上將 **Node Run Commands** 設定為「Always Ask」或「Always Allow」。當節點上存在必要的二進位檔案時，OpenClaw 可以將 macOS 專屬技能視為符合資格。代理程式會透過 `nodes` 工具執行這些技能。如果您選擇「Always Ask」，在提示詞中批准「Always Allow」會將該指令加入允許清單。

    **選項 C - 透過 SSH 代理 macOS 二進位檔案（進階）。**
    將 Gateway 保留在 Linux 上，但讓必要的 CLI 二進位檔案解析為在 Mac 上執行的 SSH 包裝程式。然後覆寫技能以允許 Linux，使其保持符合資格。

    1. 為二進位檔案建立一個 SSH 包裝程式（例如：Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 將包裝程式放置在 Linux 主機的 `PATH` 上（例如 `~/bin/memo`）。
    3. 覆寫技能元數據（工作區或 `~/.openclaw/skills`）以允許 Linux：

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. 啟動一個新的工作階段，以便重新整理技能快照。

  </Accordion>

  <Accordion title="你們有 Notion 或 HeyGen 整合功能嗎？">
    目前尚未內建。

    選項如下：

    - **自訂技能 / 外掛：** 最適合用於可靠的 API 存取（Notion/HeyGen 都有 API）。
    - **瀏覽器自動化：** 無需編寫代碼即可運作，但速度較慢且較不穩定。

    如果您希望為每個客戶保留上下文（代理機構工作流程），一個簡單的模式是：

    - 每個客戶一個 Notion 頁面（上下文 + 偏好設定 + 進行中的工作）。
    - 要求 Agent 在會話開始時獲取該頁面。

    如果您想要原生的整合功能，請開啟功能請求或構建一個針對這些 API 的技能。

    安裝技能：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安裝會放置於現有工作區 `skills/` 目錄中。若要跨 Agent 共享技能，請將它們放置在 `~/.openclaw/skills/<name>/SKILL.md` 中。如果只有部分 Agent 應該看到共享安裝，請設定 `agents.defaults.skills` 或 `agents.list[].skills`。某些技能預期會透過 Homebrew 安裝二進位檔案；在 Linux 上這意味著 Linuxbrew（請參閱上方的 Homebrew Linux 條目）。請參閱 [技能](/zh-Hant/tools/skills)、[技能設定](/zh-Hant/tools/skills-config) 和 [ClawHub](/zh-Hant/clawhub)。

  </Accordion>

  <Accordion title="如何使用我現有的已登入 Chrome 與 OpenClaw 搭配？">
    使用內建的 `user` 瀏覽器設定檔，它透過 Chrome DevTools MCP 進行連接：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果您想要自訂名稱，請建立一個明確的 MCP 設定檔：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    此路徑可以使用本地主機瀏覽器或已連接的瀏覽器節點。如果 Gateway 運行在其他地方，請在瀏覽器機器上運行節點主機，或者改用遠端 CDP。

    目前對 `existing-session` / `user` 的限制：

    - 動作是由參照驅動的，而不是由 CSS 選擇器驅動
    - 上傳需要 `ref` / `inputRef`，且目前一次僅支援一個檔案
    - `responsebody`、PDF 匯出、下載攔截和批次動作仍然需要受管理的瀏覽器或原始 CDP 設定檔

  </Accordion>
</AccordionGroup>

## 沙盒機制與記憶體

<AccordionGroup>
  <Accordion title="是否有專門的沙盒文件？">
    有的。請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing)。關於 Docker 特定設定（Docker 中的完整閘道或沙盒映像檔），請參閱 [Docker](/zh-Hant/install/docker)。
  </Accordion>

  <Accordion title="Docker 感覺受限 - 如何啟用完整功能？">
    預設映像檔以安全性為優先，並以 `node` 使用者身分執行，因此它不包含
    系統套件、Homebrew 或內建的瀏覽器。若要進行更完整的設定：

    - 使用 `OPENCLAW_HOME_VOLUME` 持續保存 `/home/node`，以便快取得以保留。
    - 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 將系統相依項目製作到映像檔中。
    - 透過內建的 CLI 安裝 Playwright 瀏覽器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 設定 `PLAYWRIGHT_BROWSERS_PATH` 並確保該路徑已持續保存。

    文件：[Docker](/zh-Hant/install/docker)、[Browser](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="我可以讓私訊保持個人化，但讓群組公開/沙盒化並由一個代理程式處理嗎？">
    可以 - 如果您的私人流量是 **DMs**（私訊）而您的公開流量是 **groups**（群組）。

    使用 `agents.defaults.sandbox.mode: "non-main"`，讓群組/頻道工作階段（非主要金鑰）在設定的沙盒後端執行，同時主要私訊工作階段保持在主機上。如果您不選擇後端，Docker 是預設後端。然後透過 `tools.sandbox.tools` 限制沙盒工作階段中可用的工具。

    設定教學 + 範例設定：[Groups: personal DMs + public groups](/zh-Hant/channels/groups#pattern-personal-dms-public-groups-single-agent)

    主要設定參考：[Gateway configuration](/zh-Hant/gateway/config-agents#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="如何將主機資料夾綁定到沙箱中？">
    將 `agents.defaults.sandbox.docker.binds` 設為 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全域 + 各代理的綁定會合併；當 `scope: "shared"` 時，會忽略各代理的綁定。對於任何敏感內容請使用 `:ro`，並請記得綁定會繞過沙箱檔案系統的防護牆。

    OpenClaw 會根據正規化路徑以及透過最深層現有祖系解析的規範路徑，來驗證綁定來源。這意味著即使最後一段路徑尚未存在，透過符號連結父系逃逸的操作仍會被封閉式地阻擋，且解析符號連結後仍會檢查允許的根路徑。

    請參閱 [沙箱](/zh-Hant/gateway/sandboxing#custom-bind-mounts) 和 [沙箱 vs 工具政策 vs 提升權限](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) 以取得範例和安全注意事項。

  </Accordion>

  <Accordion title="記憶體如何運作？">
    OpenClaw 的記憶體只是代理工作區中的 Markdown 檔案：

    - `memory/YYYY-MM-DD.md` 中的每日筆記
    - `MEMORY.md` 中的策劃長期筆記（僅限主要/私人會話）

    OpenClaw 也會執行 **靜默壓縮前記憶體排清**，以提醒模型在自動壓縮之前寫入持久化的筆記。這僅在工作區可寫入時執行（唯讀沙箱會跳過此步驟）。請參閱 [記憶體](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="記憶體一直忘記事情。我該如何讓它記住？">
    要求機器人 **將事實寫入記憶體**。長期筆記應放在 `MEMORY.md` 中，短期上下文則放入 `memory/YYYY-MM-DD.md`。

    這仍是我們正在改進的領域。提醒模型儲存記憶體會有幫助；它會知道該做什麼。如果它持續忘記，請驗證 Gateway 在每次執行時是否使用相同的工作區。

    文件：[記憶體](/zh-Hant/concepts/memory)、[代理工作區](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="記憶會永久保存嗎？有什麼限制？">
    記憶檔案儲存在磁碟上，並會持續存在直到您將其刪除。限制在於您的
    儲存空間，而非模型。**會話上下文**仍然受限於模型的
    上下文視窗，因此較長的對話可能會被壓縮或截斷。這就是為什麼
    記憶搜尋功能存在的原因——它只將相關的部分提取回上下文中。

    文件：[記憶](/zh-Hant/concepts/memory)、[上下文](/zh-Hant/concepts/context)。

  </Accordion>

  <Accordion title="語意記憶搜尋需要 OpenAI API 金鑰嗎？">
    只有在使用 **OpenAI 嵌入** 時才需要。Codex OAuth 涵蓋聊天/完成功能，
    但並**不**授予嵌入存取權限，因此 **登入 Codex（OAuth 或
    Codex CLI 登入）** 對語意記憶搜尋沒有幫助。OpenAI 嵌入
    仍然需要真正的 API 金鑰（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果您沒有明確設定供應商，當 OpenClaw
    可以解析 API 金鑰時（驗證設定檔、`models.providers.*.apiKey` 或環境變數），
    它會自動選擇供應商。
    如果可以解析 OpenAI 金鑰，它偏好使用 OpenAI；否則如果可以解析 Gemini 金鑰，則使用 Gemini，
    接著是 Voyage，然後是 Mistral。如果沒有可用的遠端金鑰，記憶
    搜尋將保持停用狀態，直到您進行設定。如果您已設定並且存在本機模型路徑，OpenClaw
    偏好使用 `local`。當您明確設定
    `memorySearch.provider = "ollama"` 時，支援 Ollama。

    如果您寧願保持在本機，請設定 `memorySearch.provider = "local"`（並可選擇
    設定 `memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，請設定
    `memorySearch.provider = "gemini"` 並提供 `GEMINI_API_KEY`（或
    `memorySearch.remote.apiKey`）。我們支援 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本機** 嵌入
    模型——有關設定詳細資訊，請參閱 [記憶](/zh-Hant/concepts/memory)。

  </Accordion>
</AccordionGroup>

## 檔案在磁碟上的位置

<AccordionGroup>
  <Accordion title="OpenClaw 使用的所有資料都會在本機儲存嗎？">
    不 - **OpenClaw 的狀態是本機的**，但 **外部服務仍會看到您傳送給它們的內容**。

    - **預設為本機：** 會話、記憶檔案、配置和工作區位於 Gateway 主機
      (`~/.openclaw` + 您的工作區目錄) 上。
    - **必要時為遠端：** 您傳送給模型提供商 (Anthropic/OpenAI/等.) 的訊息會傳送至
      它們的 API，而聊天平台 (WhatsApp/Telegram/Slack/等.) 則會在它們的
      伺服器上儲存訊息資料。
    - **您控制資料足跡：** 使用本機模型可將提示保留在您的機器上，但頻道
      流量仍會經過頻道的伺服器。

    相關：[Agent workspace](/zh-Hant/concepts/agent-workspace)、[Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 將其資料儲存在哪裡？">
    所有內容都位於 `$OPENCLAW_STATE_DIR`（預設：`~/.openclaw`）之下：

    | Path                                                            | Purpose                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主設定檔 (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 舊版 OAuth 匯入（首次使用時會複製到 auth profiles）       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 驗證設定檔 (OAuth、API 金鑰及選用的 `keyRef`/`tokenRef`)  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | 選用的檔案型密鑰承載，用於 `file` SecretRef 提供者 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 舊版相容性檔案（靜態 `api_key` 項目已清除）      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供者狀態 (例如 `whatsapp/<accountId>/creds.json`)            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每個代理程式的狀態 (agentDir + sessions)                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 對話記錄與狀態（每個代理程式）                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 會話元資料（每個代理程式）                                       |

    舊版單一代理程式路徑：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）。

    您的 **workspace** (AGENTS.md、記憶檔案、技能等) 是分開的，並透過 `agents.defaults.workspace` 進行設定（預設：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 應該放在哪裡？">
    這些檔案位於 **agent workspace** 中，而不是 `~/.openclaw`。

    - **Workspace (每個 agent)**：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md`、`memory/YYYY-MM-DD.md`、選用的 `HEARTBEAT.md`。
      小寫根目錄 `memory.md` 僅用於舊版修復輸入；當這兩個檔案都存在時，`openclaw doctor --fix`
      可以將其合併到 `MEMORY.md`。
    - **State dir (`~/.openclaw`)**：設定、channel/provider 狀態、設定檔、sessions、記錄檔，
      以及共享技能 (`~/.openclaw/skills`)。

    預設 workspace 為 `~/.openclaw/workspace`，可透過以下方式設定：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果機器人在重新啟動後「忘記」了，請確認 Gateway 在每次啟動時都使用相同的
    workspace (並記住：遠端模式使用的是 **gateway 主機的**
    workspace，而不是你的本地筆記型電腦)。

    提示：如果你想要持久化的行為或偏好設定，請要求機器人將其**寫入
    AGENTS.md 或 MEMORY.md**，而不是依賴聊天記錄。

    參閱 [Agent workspace](/zh-Hant/concepts/agent-workspace) 和 [Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="建議的備份策略">
    將你的 **agent workspace** 放入一個 **私有** git repo 並備份到某個
    私有位置 (例如 GitHub 私有儲存庫)。這會擷取記憶體 + AGENTS/SOUL/USER
    檔案，並讓你稍後還原助手的「心智」。

    **請勿** 將 `~/.openclaw` 下的任何內容提交 (憑證、sessions、權杖或加密的機密承載)。
    如果你需要完整還原，請分別備份 workspace 和 state 目錄
    (請參閱上述遷移問題)。

    文件：[Agent workspace](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

<Accordion title="我如何完全解除安裝 OpenClaw？">請參閱專屬指南：[解除安裝](/zh-Hant/install/uninstall)。</Accordion>

  <Accordion title="代理可以在工作區之外運作嗎？">
    可以。工作區是**預設的 cwd**（目前工作目錄）和記憶錨點，而不是一個硬性沙盒。
    相對路徑會在工作區內解析，但絕對路徑可以存取其他
    主機位置，除非啟用了沙盒機制。如果您需要隔離，請使用
    [`agents.defaults.sandbox`](/zh-Hant/gateway/sandboxing) 或個別代理的沙盒設定。如果您
    希望某個儲存庫 成為預設的工作目錄，請將該代理的
    `workspace` 指向該儲存庫的根目錄。OpenClaw 儲存庫僅包含原始碼；除非您有意讓代理在其中工作，否則請將
    工作區分開存放。

    範例（將儲存庫作為預設 cwd）：

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

  <Accordion title="遠端模式：Session 儲存位置在哪裡？">
    Session 狀態由**閘道主機** 擁有。如果您處於遠端模式，您關心的 Session 儲存位於遠端機器上，而不是您的本地筆記型電腦。請參閱 [Session 管理](/zh-Hant/concepts/session)。
  </Accordion>
</AccordionGroup>

## 設定基礎

<AccordionGroup>
  <Accordion title="設定檔是什麼格式？它在哪裡？">
    OpenClaw 會從 `$OPENCLAW_CONFIG_PATH` 讀取選用的 **JSON5** 設定檔（預設值：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果檔案不存在，它將使用相對安全的預設值（包括預設工作區 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我設定了 gateway.bind: "lan"（或 "tailnet"），現在沒有任何東西在監聽 / UI 顯示未授權'>
    非迴路（non-loopback）綁定**需要一個有效的 gateway auth path**。實際上這意味著：

    - shared-secret auth：token 或密碼
    - 位於正確設定的具身分感知反向代理後方的 `gateway.auth.mode: "trusted-proxy"`

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

    - `gateway.remote.token` / `.password` **不會**自行啟用本機 gateway auth。
    - 本機呼叫路徑僅在 `gateway.auth.*` 未設定時，才能將 `gateway.remote.*` 作為後備。
    - 若使用密碼認證，請改為設定 `gateway.auth.mode: "password"` 加上 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 是透過 SecretRef 明確設定但未解析，解析將會失敗並關閉（不會有遠端後備遮罩）。
    - 使用共享金鑰的 Control UI 設定會透過 `connect.params.auth.token` 或 `connect.params.auth.password`（儲存在 app/UI 設定中）進行驗證。承載身分的模式（如 Tailscale Serve 或 `trusted-proxy`）則改用請求標頭。請避免將共享金鑰放在 URL 中。
    - 使用 `gateway.auth.mode: "trusted-proxy"` 時，同主機迴路反向代理需要明確的 `gateway.auth.trustedProxy.allowLoopback = true` 以及 `gateway.trustedProxies` 中的迴路條目。

  </Accordion>

  <Accordion title="為什麼現在本機連線 也需要 token？">
    OpenClaw 預設會強制執行 Gateway 驗證，包括 loopback 連線。在一般的預設路徑中，這表示使用 token 驗證：如果未設定明確的驗證路徑，Gateway 啟動時會解析為 token 模式，並為該次啟動產生一個僅限執行時期的 token，因此 **本機 WebSocket 客戶端必須通過驗證**。當客戶端在重新啟動之間需要穩定的密鑰 時，請明確設定 `gateway.auth.token`、`gateway.auth.password`、`OPENCLAW_GATEWAY_TOKEN` 或 `OPENCLAW_GATEWAY_PASSWORD`。這能阻擋其他本機程序呼叫 Gateway。

    如果您偏好的是其他驗證路徑，可以明確選擇密碼模式 (或者，針對具備身分識別能力的反向代理，使用 `trusted-proxy`)。如果您 **真的** 想要開放 loopback 連線，請在設定中明確設定 `gateway.auth.mode: "none"`。Doctor 可以隨時為您產生 token：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="變更設定後需要重新啟動嗎？">
    Gateway 會監控設定檔並支援熱重載:

    - `gateway.reload.mode: "hybrid"` (預設值): 熱套用安全變更，針對關鍵變更則重新啟動
    - `hot`、`restart`、`off` 也受支援

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
    - `random`：輪播有趣/季節性標語 (預設行為)。
    - 如果您完全不想要橫幅，請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何啟用網路搜尋（以及網路擷取）？">
    `web_fetch` 不需要 API 金鑰即可運作。`web_search` 取決於您選擇的
    提供者：

    - 支援 API 的提供者（例如 Brave、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Perplexity 和 Tavily）需要進行其正常的 API 金鑰設定。
    - Ollama 網路搜尋不需要金鑰，但它會使用您設定的 Ollama 主機並且需要 `ollama signin`。
    - DuckDuckGo 不需要金鑰，但這是一個非官方的 HTML 整合。
    - SearXNG 不需要金鑰/自行託管；請設定 `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`。

    **建議：** 執行 `openclaw configure --section web` 並選擇一個提供者。
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

    特定提供者的網路搜尋設定現在位於 `plugins.entries.<plugin>.config.webSearch.*` 之下。
    舊版 `tools.web.search.*` 提供者路徑為了相容性仍會暫時載入，但不應用於新的設定。
    Firecrawl 網路擷取後援設定位於 `plugins.entries.firecrawl.config.webFetch.*` 之下。

    註記：

    - 如果您使用允許清單，請新增 `web_search`/`web_fetch`/`x_search` 或 `group:web`。
    - `web_fetch` 預設為啟用（除非明確停用）。
    - 如果省略 `tools.web.fetch.provider`，OpenClaw 會從可用的憑證中自動偵測第一個就緒的擷取後援提供者。目前內建的提供者是 Firecrawl。
    - Daemons 從 `~/.openclaw/.env`（或服務環境）讀取環境變數。

    文件：[Web 工具](/zh-Hant/tools/web)。

  </Accordion>

  <Accordion title="config.apply 清除了我的配置。我該如何恢復並避免這種情況？">
    `config.apply` 會**替換整個配置**。如果您發送的是部分物件，其他所有內容
    都會被移除。

    目前的 OpenClaw 能防許多意外覆寫的情況：

    - OpenClaw 擁有的配置寫入會在寫入前驗證完整的變更後配置。
    - 無效或具破壞性的 OpenClaw 擁有寫入會被拒絕，並儲存為 `openclaw.json.rejected.*`。
    - 如果直接編輯破壞了啟動或熱重載，Gateway 會失敗封閉或跳過重載；它不會重寫 `openclaw.json`。
    - `openclaw doctor --fix` 擁有修復功能，可以在將被拒絕的檔案儲存為 `openclaw.json.clobbered.*` 的同時，還原最後已知的良好配置。

    恢復：

    - 檢查 `openclaw logs --follow` 中的 `Invalid config at`、`Config write rejected:` 或 `config reload skipped (invalid config)`。
    - 檢查現用配置旁邊最新的 `openclaw.json.clobbered.*` 或 `openclaw.json.rejected.*`。
    - 執行 `openclaw config validate` 和 `openclaw doctor --fix`。
    - 使用 `openclaw config set` 或 `config.patch` 僅複製預期的金鑰回來。
    - 如果您沒有最後已知的良好配置或被拒絕的載荷，請從備份還原，或重新執行 `openclaw doctor` 並重新配置通道/模型。
    - 如果這是意外發生的，請提交錯誤報告並附上您最後已知的配置或任何備份。
    - 本地編碼代理通常可以從日誌或歷史記錄重建可用的配置。

    避免發生：

    - 對於小變更，請使用 `openclaw config set`。
    - 對於互動式編輯，請使用 `openclaw configure`。
    - 當您不確定確切路徑或欄位形狀時，請先使用 `config.schema.lookup`；它會傳回淺層 schema 節點加上直接子摘要以供深入查看。
    - 對於部分 RPC 編輯，請使用 `config.patch`；僅將 `config.apply` 用於完整配置替換。
    - 如果您從代理執行中使用僅限擁有者的 `gateway` 工具，它仍會拒絕對 `tools.exec.ask` / `tools.exec.security` 的寫入（包括正規化為相同受保護執行路徑的舊版 `tools.bash.*` 別名）。

    文件：[Config](/zh-Hant/cli/config)、[Configure](/zh-Hant/cli/configure)、[Gateway troubleshooting](/zh-Hant/gateway/troubleshooting#gateway-rejected-invalid-config)、[Doctor](/zh-Hant/gateway/doctor)。

  </Accordion>

  <Accordion title="如何在不同設備上運行具有專用工作程式的中央 Gateway？">
    常見的架構模式是 **一個 Gateway**（例如 Raspberry Pi）加上 **節點** 和 **代理程式**：

    - **Gateway（中央）：** 擁有通道（Signal/WhatsApp）、路由和會話。
    - **節點（設備）：** Mac/iOS/Android 作為外設連接並暴露本地工具（`system.run`、`canvas`、`camera`）。
    - **代理程式（工作程式）：** 用於特殊角色的獨立大腦/工作區（例如「Hetzner 運維」、「個人數據」）。
    - **子代理程式：** 當您需要並行處理時，從主代理程式生成背景工作。
    - **TUI：** 連接到 Gateway 並切換代理程式/會話。

    文檔：[節點](/zh-Hant/nodes)、[遠端訪問](/zh-Hant/gateway/remote)、[多代理程式路由](/zh-Hant/concepts/multi-agent)、[子代理程式](/zh-Hant/tools/subagents)、[TUI](/zh-Hant/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 瀏覽器可以無頭模式（headless）運行嗎？">
    是的。這是一個配置選項：

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

    無頭模式使用 **相同的 Chromium 引擎**，並適用於大多數自動化操作（表單、點擊、爬蟲、登入）。主要區別在於：

    - 沒有可見的瀏覽器視窗（如果需要視覺效果，請使用截圖）。
    - 某些網站對無頭模式下的自動化更嚴格（驗證碼、反機器人）。
      例如，X/Twitter 經常會阻擋無頭會話。

  </Accordion>

  <Accordion title="如何使用 Brave 瀏覽器進行控制？">
    將 `browser.executablePath` 設定為您的 Brave 執行檔（或任何基於 Chromium 的瀏覽器）並重新啟動 Gateway。
    請參閱 [瀏覽器](/zh-Hant/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置範例。
  </Accordion>
</AccordionGroup>

## 遠端 Gateway 和節點

<AccordionGroup>
  <Accordion title="指令如何在 Telegram、閘道和節點之間傳遞？">
    Telegram 訊息由 **閘道** 處理。閘道執行代理程式（agent），
    並且僅在需要節點工具時，透過 **Gateway WebSocket** 呼叫節點：

    Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

    節點看不到入站提供商流量；它們只接收節點 RPC 呼叫。

  </Accordion>

  <Accordion title="如果閘道是遠端託管的，我的代理程式如何存取我的電腦？">
    簡短回答：**將您的電腦配對為節點**。閘道在其他地方運行，但它可以透過 Gateway WebSocket 呼叫您本機上的 `node.*` 工具（螢幕、相機、系統）。

    典型設定：

    1. 在永久運行主機（VPS/家用伺服器）上運行閘道。
    2. 將閘道主機與您的電腦置於同一個 tailnet 中。
    3. 確保閘道 WS 可連線（tailnet bind 或 SSH tunnel）。
    4. 在本機開啟 macOS 應用程式，並以 **Remote over SSH** 模式（或直接透過 tailnet）連線
       以便註冊為節點。
    5. 在閘道上核准節點：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要單獨的 TCP 橋接器；節點透過 Gateway WebSocket 連線。

    安全提醒：配對 macOS 節點允許在該機器上進行 `system.run`。僅配對您信任的裝置，並審查 [安全性](/zh-Hant/gateway/security)。

    文件：[節點](/zh-Hant/nodes)、[閘道通訊協定](/zh-Hant/gateway/protocol)、[macOS 遠端模式](/zh-Hant/platforms/mac/remote)、[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已連線但我沒收到回覆。現在該怎麼辦？">
    檢查基本項目：

    - Gateway 正在運作：`openclaw gateway status`
    - Gateway 健康狀態：`openclaw status`
    - 頻道健康狀態：`openclaw channels status`

    然後驗證認證與路由：

    - 如果您使用 Tailscale Serve，請確保 `gateway.auth.allowTailscale` 設定正確。
    - 如果您透過 SSH tunnel 連線，請確認本地 tunnel 已啟動並指向正確的連接埠。
    - 確認您的允許名單（DM 或群組）包含您的帳號。

    文件：[Tailscale](/zh-Hant/gateway/tailscale)、[Remote access](/zh-Hant/gateway/remote)、[Channels](/zh-Hant/channels)。

  </Accordion>

  <Accordion title="兩個 OpenClaw 實例可以互相通訊嗎（本地 + VPS）？">
    可以。沒有內建的「bot-to-bot」橋接器，但您可以透過幾種
    可靠的方式將它們連接起來：

    **最簡單：**使用兩個 bot 都能存取的正常聊天頻道（Telegram/Slack/WhatsApp）。
    讓 Bot A 傳送訊息給 Bot B，然後讓 Bot B 如常回覆。

    **CLI 橋接器（通用）：**執行一個腳本，使用
    `openclaw agent --message ... --deliver` 呼叫另一個 Gateway，
    目標設為另一個 bot 正在監聽的聊天。如果其中一個 bot 位於遠端 VPS，請透過 SSH/Tailscale 將您的 CLI 指向該遠端 Gateway
    （請參閱 [Remote access](/zh-Hant/gateway/remote)）。

    範例模式（從能連接到目標 Gateway 的機器執行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：加入防護措施，避免這兩個 bot 無限循環（僅限提及、頻道
    允許名單，或「不回覆 bot 訊息」規則）。

    文件：[Remote access](/zh-Hant/gateway/remote)、[Agent CLI](/zh-Hant/cli/agent)、[Agent send](/zh-Hant/tools/agent-send)。

  </Accordion>

  <Accordion title="多個代理是否需要分開的 VPS？">
    不需要。一個 Gateway 可以代管多個代理，每個代理都有自己的工作區、模型預設值
    和路由。這是標準設定，比每個代理運行一個 VPS 更便宜且簡單。

    只有當您需要強隔離（安全邊界）或您不想分享的差異很大的設定時，才使用分開的 VPS。
    否則，請保留一個 Gateway 並使用多個代理或子代理。

  </Accordion>

  <Accordion title="與其從 VPS 使用 SSH，在我的個人筆記型電腦上使用 Node 有什麼好處嗎？">
    有的 —— Node 是從遠端 Gateway 存取您的筆記型電腦的首選方式，而且
    它們解鎖的功能不僅僅是 Shell 存取。Gateway 執行於 macOS/Linux（Windows 則透過 WSL2）且
    輕量化（小型 VPS 或樹莓派等級的裝置即可；4 GB RAM 綽綽有餘），因此一種常見的
    設定是：一台永遠上線的主機加上您的筆記型電腦作為 Node。

    - **不需要連入 SSH。** Node 會向外連線到 Gateway WebSocket 並使用裝置配對。
    - **更安全的執行控制。** 在該筆記型電腦上，`system.run` 受到 Node 允許清單/核准機制的管制。
    - **更多裝置工具。** 除了 `system.run` 之外，Node 還會公開 `canvas`、`camera` 和 `screen`。
    - **本機瀏覽器自動化。** 將 Gateway 保留在 VPS 上，但透過筆記型電腦上的 Node Host 在本機執行 Chrome，或是透過 Chrome MCP 連線到主機上的本機 Chrome。

    SSH 適合臨時的 Shell 存取，但對於持續性的 Agent 工作流程和
    裝置自動化來說，Node 更為簡單。

    文件：[Nodes](/zh-Hant/nodes)、[Nodes CLI](/zh-Hant/cli/nodes)、[Browser](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="節點是否會執行閘道服務？">
    不會。除非您刻意執行獨立的設定檔（請參閱 [多個閘道](/zh-Hant/gateway/multiple-gateways)），否則每個主機應該只執行 **一個閘道**。節點是連接到閘道的周邊設備（iOS/Android 節點，或選單列應用程式中的 macOS「節點模式」）。關於無頭節點主機和 CLI 控制，請參閱 [節點主機 CLI](/zh-Hant/cli/node)。

    對於 `gateway`、`discovery` 和託管的外掛介面變更，需要完全重新啟動。

  </Accordion>

  <Accordion title="是否有 API / RPC 方式來套用設定？">
    有的。

    - `config.schema.lookup`：在寫入前檢視單一設定子樹，包含其淺層架構節點、匹配的 UI 提示以及直接子項摘要
    - `config.get`：取得目前的快照 + 雜湊值
    - `config.patch`：安全的部分更新（大部分 RPC 編輯的首選）；盡可能進行熱重新載入，必要時重新啟動
    - `config.apply`：驗證並取代完整設定；盡可能進行熱重新載入，必要時重新啟動
    - 僅限擁有者使用的 `gateway` 執行時期工具仍然拒絕重寫 `tools.exec.ask` / `tools.exec.security`；舊版 `tools.bash.*` 別名會正規化為相同的受保護執行路徑

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

  <Accordion title="如何在我的 VPS 上設置 Tailscale 並從我的 Mac 連線？">
    最低步驟：

    1. **在 VPS 上安裝 + 登入**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在您的 Mac 上安裝 + 登入**
       - 使用 Tailscale 應用程式並登入同一個 tailnet。
    3. **啟用 MagicDNS（建議）**
       - 在 Tailscale 管理主控台中，啟用 MagicDNS，以便 VPS 擁有穩定的名稱。
    4. **使用 tailnet 主機名稱**
       - SSH: `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果您想要不使用 SSH 的控制 UI，請在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    這會將閘道繫結到 loopback 並透過 Tailscale 公開 HTTPS。請參閱 [Tailscale](/zh-Hant/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何將 Mac 節點連線到遠端 Gateway (Tailscale Serve)？">
    Serve 會公開 **Gateway Control UI + WS**。節點透過相同的 Gateway WS 端點進行連線。

    建議的設定方式：

    1. **確保 VPS 和 Mac 位於同一個 tailnet 上**。
    2. **在 macOS 應用程式中使用遠端模式** (SSH 目標可以是 tailnet 主機名稱)。
       應用程式會將 Gateway 連接埠進行隧道傳輸，並以節點身分連線。
    3. **在 gateway 上核准該節點**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文件：[Gateway 通訊協定](/zh-Hant/gateway/protocol)、[探索](/zh-Hant/gateway/discovery)、[macOS 遠端模式](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我應該在第二台筆記型電腦上安裝，還是直接新增一個節點？">
    如果您在第二台筆記型電腦上只需要 **本機工具** (螢幕/相機/exec)，請將其新增為 **節點**。這樣可以維持單一 Gateway 並避免重複的設定。本機節點工具目前僅支援 macOS，但我們計劃將其擴展到其他作業系統。

    只有當您需要 **強隔離** 或兩個完全分開的機器人時，才安裝第二個 Gateway。

    文件：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)、[多個 Gateway](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 環境變數與 .env 載入

<AccordionGroup>
  <Accordion title="OpenClaw 如何載入環境變數？">
    OpenClaw 會從父程序 (shell、launchd/systemd、CI 等) 讀取環境變數，並額外載入：

    - 目前工作目錄中的 `.env`
    - 來自 `~/.openclaw/.env` (亦稱 `$OPENCLAW_STATE_DIR/.env`) 的全域後備 `.env`

    這兩個 `.env` 檔案都不會覆蓋既有的環境變數。

    您也可以在設定中定義內聯環境變數 (僅在程序環境中缺少該變數時套用)：

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

  <Accordion title="我透過服務啟動了 Gateway，但我的環境變數不見了。現在該怎麼辦？">
    兩個常見的修復方法：

    1. 將遺失的金鑰放入 `~/.openclaw/.env` 中，這樣即使服務未繼承您的 shell 環境，也能讀取這些金鑰。
    2. 啟用 shell 匯入（可選的便利功能）：

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

    這會執行您的登入 shell 並僅匯入遺失的預期金鑰（絕不覆蓋）。對應的環境變數為：
    `OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我設定了 COPILOT_GITHUB_TOKEN，但模型狀態顯示「Shell env: off」。為什麼？'>
    `openclaw models status` 回報是否已啟用 **shell 環境變數匯入**。「Shell env: off」
    **並不**表示您的環境變數遺失——它僅表示 OpenClaw 不會
    自動載入您的登入 shell。

    如果 Gateway 以服務形式執行（launchd/systemd），它將不會繼承您的 shell
    環境。請執行以下其中一項來修復：

    1. 將 token 放入 `~/.openclaw/.env` 中：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或啟用 shell 匯入（`env.shellEnv.enabled: true`）。
    3. 或將其加入您的設定 `env` 區塊（僅在遺失時適用）。

    然後重新啟動 gateway 並再次檢查：

    ```bash
    openclaw models status
    ```

    Copilot token 是從 `COPILOT_GITHUB_TOKEN` 讀取的（也可從 `GH_TOKEN` / `GITHUB_TOKEN`）。
    請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers) 與 [/environment](/zh-Hant/help/environment)。

  </Accordion>
</AccordionGroup>

## Sessions and multiple chats

<AccordionGroup>
  <Accordion title="我如何開始一個新的對話？">
    發送 `/new` 或 `/reset` 作為獨立訊息。請參閱 [Session management](/zh-Hant/concepts/session)。
  </Accordion>

  <Accordion title="如果我不傳送 /new，工作階段會自動重置嗎？">
    工作階段可以在 `session.idleMinutes` 後過期，但這是**預設停用**的（預設值為 **0**）。
    將其設定為正值以啟用閒置過期。啟用後，閒置期間結束後的**下一則**訊息將為該聊天金鑰啟動一個新的工作階段 ID。
    這不會刪除逐字稿——它只是開啟一個新的工作階段。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有沒有辦法建立一個 OpenClaw 實例團隊（一個 CEO 和多個代理程式）？">
    有的，透過**多代理程式路由**和**子代理程式**。您可以建立一個協調器代理程式和幾個具有各自工作區與模型的工作器代理程式。

    話雖如此，這最好被視為一個**有趣的實驗**。這會消耗大量 Token，且通常比使用一個具有獨立工作階段的機器人效率更低。我們設想的典型模式是您與一個機器人對話，並使用不同的工作階段進行平行工作。該機器人也可以在需要時生成子代理程式。

    文件：[Multi-agent routing](/zh-Hant/concepts/multi-agent)、[Sub-agents](/zh-Hant/tools/subagents)、[Agents CLI](/zh-Hant/cli/agents)。

  </Accordion>

  <Accordion title="為什麼上下文在任務中途被截斷？如何預防？">
    工作階段上下文受限於模型視窗。長時間的對話、大型工具輸出或大量檔案可能會觸發壓縮或截斷。

    以下方法有幫助：

    - 要求機器人總結當前狀態並將其寫入檔案。
    - 在長任務之前使用 `/compact`，並在切換主題時使用 `/new`。
    - 將重要的上下文保留在工作區中，並要求機器人讀回。
    - 對於長時間或平行的任務使用子代理程式，以保持主聊天較小。
    - 如果這種情況經常發生，請選擇一個具有較大上下文視窗的模型。

  </Accordion>

  <Accordion title="如何在保留安裝狀態的情況下完全重置 OpenClaw？">
    使用重置指令：

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

    備註：

    - 如果引導程式偵測到現有設定，也會提供 **Reset (重置)** 選項。請參閱 [Onboarding (CLI)](/zh-Hant/start/wizard)。
    - 如果您使用了設定檔 (`--profile` / `OPENCLAW_PROFILE`)，請重置每個狀態目錄 (預設為 `~/.openclaw-<profile>`)。
    - 開發環境重置：`openclaw gateway --dev --reset` (僅限開發環境；會清除開發設定 + 憑證 + 工作階段 + 工作區)。

  </Accordion>

  <Accordion title='我收到「context too large」錯誤 - 該如何重置或壓縮？'>
    使用以下其中一種方法：

    - **壓縮 (Compact)** (保留對話但總結較舊的輪次)：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 來引導摘要產生。

    - **重置 (Reset)** (為相同的聊天金鑰建立新的工作階段 ID)：

      ```
      /new
      /reset
      ```

    如果問題持續發生：

    - 啟用或調整 **工作階段修剪** (`agents.defaults.contextPruning`) 以移除舊的工具輸出。
    - 使用具有較大上下文視窗的模型。

    文件：[壓縮](/zh-Hant/concepts/compaction)、[工作階段修剪](/zh-Hant/concepts/session-pruning)、[工作階段管理](/zh-Hant/concepts/session)。

  </Accordion>

  <Accordion title='為什麼我看到「LLM request rejected: messages.content.tool_use.input field required」？'>
    這是一個供應商驗證錯誤：模型發出了 `tool_use` 區塊，但缺少必要的
    `input`。這通常表示工作階段歷程記錄已過時或損壞 (通常發生在長對話串
    或工具/結構描述變更之後)。

    解決方法：使用 `/new` (獨立訊息) 啟動新的工作階段。

  </Accordion>

  <Accordion title="為什麼我每 30 分鐘會收到心跳訊息？">
    心跳預設每 **30m** 執行一次（使用 OAuth 驗證時為 **1h**）。您可以調整或停用它們：

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

    如果 `HEARTBEAT.md` 存在但實際上是空的（僅包含空白行和像 `# Heading` 這樣的 markdown 標題），OpenClaw 會跳過心跳執行以節省 API 呼叫。
    如果檔案不存在，心跳仍會執行，並由模型決定該做什麼。

    每個代理的覆寫使用 `agents.list[].heartbeat`。文件：[Heartbeat](/zh-Hant/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我需要將「機器人帳號」加入 WhatsApp 群組嗎？'>
    不需要。OpenClaw 執行在**您自己的帳號**上，所以如果您在群組中，OpenClaw 就能看到它。
    預設情況下，群組回覆會被阻擋，直到您允許發送者 (`groupPolicy: "allowlist"`)。

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
    選項 1（最快）：追蹤日誌並在群組中傳送測試訊息：

    ```bash
    openclaw logs --follow --json
    ```

    尋找以 `@g.us` 結尾的 `chatId`（或 `from`），例如：
    `1234567890-1234567890@g.us`。

    選項 2（如果已經設定/加入白名單）：從設定中列出群組：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文件：[WhatsApp](/zh-Hant/channels/whatsapp)、[Directory](/zh-Hant/cli/directory)、[Logs](/zh-Hant/cli/logs)。

  </Accordion>

  <Accordion title="為什麼 OpenClaw 不在群組中回覆？">
    兩個常見原因：

    - 提及閘門已開啟（預設）。您必須 @提及機器人（或符合 `mentionPatterns`）。
    - 您設定 `channels.whatsapp.groups` 時未設定 `"*"`，且該群組未被加入白名單。

    請參閱 [Groups](/zh-Hant/channels/groups) 和 [Group messages](/zh-Hant/channels/group-messages)。

  </Accordion>

<Accordion title="群組/執行緒是否與私訊共享上下文？">直接聊天預設會折疊到主會話中。群組/頻道擁有自己的會話金鑰，而 Telegram 主題 / Discord 執行緒則是獨立的會話。參見 [群組](/zh-Hant/channels/groups) 和 [群組訊息](/zh-Hant/channels/group-messages)。</Accordion>

  <Accordion title="我可以建立多少個工作區和代理？">
    沒有硬性限制。數十個（甚至數百個）都沒問題，但需注意：

    - **磁碟空間增長：** 會話和逐字稿儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本：** 代理越多表示並發的模型使用量越多。
    - **營運負擔：** 每個代理的認證設定檔、工作區和通道路由。

    建議：

    - 每個代理保持一個 **作用中** 的工作區（`agents.defaults.workspace`）。
    - 如果磁碟空間增長，請修剪舊的會話（刪除 JSONL 或儲存條目）。
    - 使用 `openclaw doctor` 來找出遺留的工作區和設定檔不符的情況。

  </Accordion>

  <Accordion title="我可以同時運行多個機器人或聊天 (Slack)，該如何設定？">
    可以。使用 **多代理路由** 來運行多個獨立的代理，並根據
    頻道/帳戶/對等節點路由傳入訊息。Slack 受支援作為一個頻道，並可以綁定到特定的代理。

    瀏覽器存取功能強大，但並非「能做人能做的任何事」——反機器人、驗證碼 (CAPTCHA) 和 MFA
    仍然可能阻擋自動化。為了最可靠的瀏覽器控制，請在主機上使用本機 Chrome MCP，
    或者在實際運行瀏覽器的機器上使用 CDP。

    最佳實踐設定：

    - 永遠線上的 Gateway 主機 (VPS/Mac mini)。
    - 每個角色一個代理 (綁定)。
    - 綁定到這些代理的 Slack 頻道。
    - 根據需要透過 Chrome MCP 或節點存取本機瀏覽器。

    文件：[多代理路由](/zh-Hant/concepts/multi-agent)、[Slack](/zh-Hant/channels/slack)、
    [瀏覽器](/zh-Hant/tools/browser)、[節點](/zh-Hant/nodes)。

  </Accordion>
</AccordionGroup>

## 模型、故障轉移和驗證設定檔

模型問答 — 預設值、選擇、別名、切換、容錯移轉、驗證設定檔 —
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
    因為「running」是**監督程式**（supervisor）的視角（launchd/systemd/schtasks）。連線探測則是 CLI 實際連接到 gateway WebSocket 的結果。

    請使用 `openclaw gateway status` 並參考這些輸出行：

    - `Probe target:`（探測實際使用的 URL）
    - `Listening:`（連接埠上實際綁定的服務）
    - `Last gateway error:`（常見的根本原因，當程序存活但連接埠未監聽時）

  </Accordion>

  <Accordion title='為什麼 openclaw gateway status 顯示「Config (cli)」和「Config (service)」不同？'>
    您正在編輯一個組態檔案，但服務正在使用另一個（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不符）。

    修正方法：

    ```bash
    openclaw gateway install --force
    ```

    請從您希望服務使用的相同 `--profile` / 環境執行該指令。

  </Accordion>

  <Accordion title='「another gateway instance is already listening」是什麼意思？'>
    OpenClaw 透過在啟動時立即綁定 WebSocket 監聽器來執行執行時鎖定（預設為 `ws://127.0.0.1:18789`）。如果綁定失敗並出現 `EADDRINUSE`，它會拋出 `GatewayLockError`，表示另一個實例正在監聽。

    修正方法：停止另一個實例、釋放連接埠，或使用 `openclaw gateway --port <port>` 執行。

  </Accordion>

  <Accordion title="如何在遠端模式下執行 OpenClaw（用戶端連接到別處的 Gateway）？">
    設定 `gateway.mode: "remote"` 並指向一個遠端 WebSocket URL，可選擇搭配共享金鑰（shared-secret）的遠端憑證：

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

    註記：

    - `openclaw gateway` 僅在 `gateway.mode` 為 `local` 時才啟動（或者您傳遞覆寫旗標）。
    - macOS 應用程式會監看設定檔，並在這些數值變更時即時切換模式。
    - `gateway.remote.token` / `.password` 僅為用戶端的遠端憑證；它們本身並不啟用本機 gateway 驗證。

  </Accordion>

  <Accordion title='控制 UI 顯示「未授權」（或不斷重新連線）。現在該怎麼辦？'>
    您的閘道驗證路徑與 UI 的驗證方法不符。

    事實（來自程式碼）：

    - 控制 UI 會將權杖保留在 `sessionStorage` 中，用於目前的瀏覽器分頁工作階段和選定的閘道 URL，因此同分頁重新整理能持續運作，無需還原長期存在的 localStorage 權杖持久性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，當閘道傳回重試提示（`canRetryWithDeviceToken=true`、`recommendedNextStep=retry_with_device_token`）時，受信任的用戶端可以嘗試一次有界的重試，使用快取的裝置權杖。
    - 該快取權杖重試現在會重複使用與裝置權杖一起儲存的快取已核准範圍。明確的 `deviceToken` / 明確的 `scopes` 呼叫者仍會保留其請求的範圍集，而不是繼承快取的範圍。
    - 在該重試路徑之外，連線驗證優先順序首先是明確的共用權杖/密碼，然後是明確的 `deviceToken`，接著是儲存的裝置權杖，最後是啟動權杖。
    - 啟動權杖範圍檢查具有角色前綴。內建的啟動操作員允許清單僅滿足操作員請求；節點或其他非操作員角色仍需要在其自己的角色前綴下擁有範圍。

    修正方法：

    - 最快：`openclaw dashboard`（會列印並複製儀表板 URL，嘗試開啟；如果是無頭模式則顯示 SSH 提示）。
    - 如果您還沒有權杖：`openclaw doctor --generate-gateway-token`。
    - 如果是遠端，請先建立通道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`。
    - 共用金鑰模式：設定 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然後在控制 UI 設定中貼上相符的金鑰。
    - Tailscale Serve 模式：請確保已啟用 `gateway.auth.allowTailscale`，並且您開啟的是 Serve URL，而不是繞過 Tailscale 身分標頭的原始回送/tailnet URL。
    - 受信任代理模式：請確保您是透過設定的身分感知代理程式連線，而不是原始閘道 URL。同主機回送代理程式也需要 `gateway.auth.trustedProxy.allowLoopback = true`。
    - 如果在一次重試後仍然不符，請輪替/重新核准配對的裝置權杖：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 如果該輪替呼叫表示被拒絕，請檢查兩件事：
      - 配對裝置工作階段只能輪替其**自己的**裝置，除非它們也擁有 `operator.admin`
      - 明確的 `--scope` 值不能超過呼叫者目前的操作員範圍
    - 仍然卡住？請執行 `openclaw status --all` 並依照 [疑難排解](/zh-Hant/gateway/troubleshooting) 操作。請參閱 [儀表板](/zh-Hant/web/dashboard) 以了解驗證詳細資訊。

  </Accordion>

  <Accordion title="我設定了 gateway.bind tailnet 但它無法綁定，且沒有監聽任何東西">
    `tailnet` bind 會從您的網路介面 (100.64.0.0/10) 中選取一個 Tailscale IP。如果機器不在 Tailscale 上 (或介面已關閉)，就沒有東西可以綁定。

    修正方法：

    - 在該主機上啟動 Tailscale (這樣它就會有 100.x 位址)，或
    - 切換到 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是明確指定的。 `auto` 偏好 loopback；當您想要僅限 tailnet 的綁定時，請使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="我可以在同一台主機上執行多個 Gateway 嗎？">
    通常不行 - 一個 Gateway 可以執行多個訊息通道和代理程式。僅當您需要冗餘 (例如：救援機器人) 或強隔離時才使用多個 Gateway。

    可以，但您必須隔離：

    - `OPENCLAW_CONFIG_PATH` (每個實例的設定)
    - `OPENCLAW_STATE_DIR` (每個實例的狀態)
    - `agents.defaults.workspace` (工作區隔離)
    - `gateway.port` (唯一的連接埠)

    快速設定 (建議)：

    - 每個實例使用 `openclaw --profile <name> ...` (會自動建立 `~/.openclaw-<name>`)。
    - 在每個 profile 設定中設定唯一的 `gateway.port` (或在手動執行時傳遞 `--port`)。
    - 安裝各個 profile 的服務：`openclaw --profile <name> gateway install`。

    Profiles 也會為服務名稱加上後綴 (`ai.openclaw.<profile>`；舊版 `com.openclaw.*`、 `openclaw-gateway-<profile>.service`、 `OpenClaw Gateway (<profile>)`)。
    完整指南：[Multiple gateways](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='"invalid handshake" / code 1008 是什麼意思？'>
    Gateway 是一個 **WebSocket 伺服器**，它預期的第一則訊息必須是 `connect` 格式。如果收到其他任何內容，它會以 **code 1008**（原則違規）關閉連線。

    常見原因：

    - 您在瀏覽器中開啟了 **HTTP** URL (`http://...`)，而非使用 WS 用戶端。
    - 您使用了錯誤的連接埠或路徑。
    - 代理伺服器或通道移除了驗證標頭或發送了非 Gateway 的請求。

    快速修復：

    1. 使用 WS URL：`ws://<host>:18789` (若為 HTTPS 則使用 `wss://...`)。
    2. 不要在一般瀏覽器分頁中開啟 WS 連接埠。
    3. 如果啟用了驗證，請在 `connect` 格式中包含 token/密碼。

    如果您使用的是 CLI 或 TUI，URL 應該看起來像這樣：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    協定細節：[Gateway 協定](/zh-Hant/gateway/protocol)。

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

    最快的日誌追蹤方式：

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

    如果您手動執行 gateway，`openclaw gateway --force` 可以取回連接埠。請參閱 [Gateway](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="我在 Windows 上關閉了終端機 - 如何重新啟動 OpenClaw？">
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

  <Accordion title="Gateway 已啟動但回應從未到達。我應該檢查什麼？">
    先從快速的健康檢查開始：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常見原因：

    - 模型驗證未在 **gateway host** 上載入（請檢查 `models status`/en/gateway/troubleshooting/en/channels）。
    - 頻道配對/允許清單阻擋了回應（請檢查頻道設定 + 記錄檔）。
    - WebChat/Dashboard 已開啟，但沒有正確的權杖。

    如果您是遠端連線，請確認 tunnel/Tailscale 連線已啟動，且
    Gateway WebSocket 可連線。

    文件：[Channels](%%PH:LINK_TARGET:863:7868424c%)、[Troubleshooting](%%PH:LINK_TARGET:864:e243dc7f%)、[Remote access](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title='"已與 gateway 中斷連線：無原因" - 該怎麼辦？'>
    這通常表示 UI 失去了 WebSocket 連線。請檢查：

    1. Gateway 是否正在執行？ `openclaw gateway status`
    2. Gateway 是否健康？ `openclaw status`
    3. UI 是否有正確的權杖？ `openclaw dashboard`
    4. 若為遠端連線，tunnel/Tailscale 連線是否已啟動？

    然後查看記錄檔：

    ```bash
    openclaw logs --follow
    ```/en/gateway/remote/en/web/dashboard

    文件：[Dashboard](%%PH:LINK_TARGET:866:7c1dd76c%)、[Remote access](%%PH:LINK_TARGET:867:4cbf6956%)、[Troubleshooting](/en/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失敗。我應該檢查什麼？">
    從日誌和頻道狀態開始：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然後比對錯誤：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 選單項目過多。OpenClaw 已經會修剪至 Telegram 限制並以較少的指令重試，但仍需捨棄部分選單項目。請減少外掛/技能/自訂指令，或者如果您不需要選單，請停用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或類似的網路錯誤：如果您在 VPS 上或位於 Proxy 之後，請確認允許傳出 HTTPS 且 `api.telegram.org` 的 DNS 解析正常。

    如果 Gateway 是遠端的，請確保您正在檢視 Gateway 主機上的日誌。

    文件：[Telegram](/zh-Hant/channels/telegram)、[頻道疑難排解](/zh-Hant/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 顯示沒有輸出。我應該檢查什麼？">
    首先確認 Gateway 可以連線且 Agent 可以執行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 檢視目前狀態。如果您預期在聊天頻道中收到回覆，請確保已啟用傳遞功能 (`/deliver on`)。

    文件：[TUI](/zh-Hant/web/tui)、[斜線指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何完全停止然後啟動 Gateway？">
    如果您安裝了服務：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    這會停止/啟動 **受監控的服務** (macOS 上為 launchd，Linux 上為 systemd)。
    當 Gateway 作為 Daemon 在背景執行時，請使用此方法。

    如果您在前台執行，請使用 Ctrl-C 停止，然後執行：

    ```bash
    openclaw gateway run
    ```

    文件：[Gateway 服務手冊](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: 重啟 **背景服務** (launchd/systemd)。
    - `openclaw gateway`: 在此終端機階段的前景 **執行** gateway。

    如果您已安裝服務，請使用 gateway 指令。當您想要單次前景執行時，請使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    使用 `--verbose` 啟動 Gateway 以獲得更多主控台詳細資訊。然後檢查日誌檔案中的通道驗證、模型路由和 RPC 錯誤。
  </Accordion>
</AccordionGroup>

## 媒體與附件

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    來自代理的輸出附件必須包含一個 `MEDIA:<path-or-url>` 行（獨自佔一行）。請參閱 [OpenClaw assistant setup](/zh-Hant/start/openclaw) 和 [Agent send](/zh-Hant/tools/agent-send)。

    CLI 傳送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    同時檢查：

    - 目標通道支援輸出媒體且未被允許清單封鎖。
    - 檔案大小在供應商的限制範圍內（圖片會調整大小至最大 2048px）。
    - `tools.fs.workspaceOnly=true` 將本機路徑傳送限制在工作區、temp/media-store 和沙箱驗證的檔案。
    - `tools.fs.workspaceOnly=false` 允許 `MEDIA:` 傳送代理已可讀取的主機本機檔案，但僅限於媒體和安全文件類型（圖片、音訊、視訊、PDF 和 Office 文件）。純文字和類似機密的檔案仍然被封鎖。

    請參閱 [Images](/zh-Hant/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全與存取控制

<AccordionGroup>
  <Accordion title="將 OpenClaw 暴露於傳入的 DM 是否安全？">
    將傳入的 DM 視為不受信任的輸入。預設值設計旨在降低風險：

    - 支援 DM 的通道預設行為是 **配對** (pairing)：
      - 未知的傳送者會收到配對碼；機器人不會處理其訊息。
      - 使用以下指令批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 待處理請求上限為 **每個通道 3 個**；如果未收到代碼，請檢查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公開開放 DM 需要明確選擇加入 (`dmPolicy: "open"` 和允許清單 `"*"`)。

    執行 `openclaw doctor` 以顯示有風險的 DM 政策。

  </Accordion>

  <Accordion title="提示詞注入 (prompt injection) 是否僅是公開機器人的問題？">
    不是。提示詞注入涉及的是 **不受信任的內容**，而不僅僅是誰可以 DM 機器人。
    如果您的助理讀取外部內容（網頁搜尋/擷取、瀏覽器頁面、電子郵件、
    文件、附件、貼上的日誌），該內容可能包含試圖
    挾持模型的指令。即使 **您是唯一的傳送者**，這種情況也可能發生。

    最大的風險在於啟用工具時：模型可能被誘騙
    外洩上下文或代表您呼叫工具。您可以透過以下方式減少影響範圍：

    - 使用唯讀或停用工具的「讀取器」代理人來摘要不受信任的內容
    - 對啟用工具的代理人保持 `web_search` / `web_fetch` / `browser` 關閉
    - 將解碼後的檔案/文件文字也視為不受信任：OpenResponses
      `input_file` 和媒體附件擷取都會將擷取的文字包裝在
      明確的外部內容邊界標記中，而不是傳遞原始檔案文字
    - 沙盒機制和嚴格的工具允許清單

    詳情：[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="我的機器人應該擁有自己的電子郵件、GitHub 帳號或電話號碼嗎？">
    是的，對於大多數設置而言。使用獨立的帳號和電話號碼將機器人隔離，
    可以在發生問題時縮小受影響的範圍。這也讓在輪換憑證或撤銷存取權限時
    更容易，且不會影響您的個人帳號。

    從小規模開始。僅授予您實際需要的工具和帳號存取權，並在需要時
    再進行擴展。

    文件：[安全性](/zh-Hant/gateway/security)、[配對](/zh-Hant/channels/pairing)。

  </Accordion>

  <Accordion title="我可以讓它自主處理我的簡訊，這樣安全嗎？">
    我們**不**建議讓其對您的個人訊息擁有完全自主權。最安全的模式是：

    - 將直接訊息 (DM) 保持在**配對模式**或嚴格的允許清單中。
    - 如果您希望它代表您發送訊息，請使用**獨立的號碼或帳號**。
    - 讓它擬草稿，然後在發送前**進行審核**。

    如果您想要進行實驗，請在專用帳號上進行並保持隔離。請參閱
    [安全性](/zh-Hant/gateway/security)。

  </Accordion>

<Accordion title="我可以使用較便宜的模型來執行個人助理任務嗎？">可以，**前提是**代理程式僅用於聊天且輸入內容是受信任的。較低階層的模型 更容易受到指令劫持，因此請避免將其用於已啟用工具的代理程式 或在讀取不受信任的內容時使用。如果您必須使用較小的模型，請鎖定 工具並在沙盒內執行。請參閱 [安全性](/zh-Hant/gateway/security)。</Accordion>

  <Accordion title="我在 Telegram 執行了 /start 但沒有收到配對代碼">
    配對代碼**僅**在未知的發送者向機器人發送訊息且
    已啟用 `dmPolicy: "pairing"` 時才會發送。僅靠 `/start` 本身並不會產生代碼。

    檢查待處理的要求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您希望立即存取，請將您的發送者 ID 加入允許清單，或為該帳號
    設定 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它會發訊息給我的聯絡人嗎？配對運作方式是什麼？">
    不會。預設的 WhatsApp 私訊政策是 **配對 (pairing)**。未知的發送者只會收到配對碼，而他們的訊息 **不會被處理**。OpenClaw 只會回覆它收到的聊天或您觸發的明確發送。

    使用以下方式批准配對：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待處理請求：

    ```bash
    openclaw pairing list whatsapp
    ```

    精靈手機號碼提示：這是用來設定您的 **allowlist/owner (白名單/擁有者)**，以便允許您自己的私訊。它不用於自動發送。如果您在個人 WhatsApp 號碼上運行，請使用該號碼並啟用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天指令、中止任務，以及「它無法停止」

<AccordionGroup>
  <Accordion title="如何停止內部系統訊息顯示在聊天中？">
    大多數內部或工具訊息僅在該工作階段啟用 **verbose (詳細)**、**trace (追蹤)** 或 **reasoning (推理)** 時才會出現。

    在您看到該訊息的聊天中修正：

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    如果仍然很吵，請檢查 Control UI 中的工作階段設定，並將 verbose 設定為 **inherit (繼承)**。同時確認您沒有在設定中使用 bot 設定檔，其中 `verboseDefault` 設定為 `on`。

    文件：[Thinking and verbose](/zh-Hant/tools/thinking)、[Security](/zh-Hant/gateway/security/index#reasoning-and-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在執行的任務？">
    傳送以下任一訊息 **作為獨立訊息**（無斜線）：

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

    大多數指令必須以 **獨立** 訊息的形式發送，並以 `/` 開頭，但一些快捷鍵（如 `/status`）對於白名單中的發送者也可以在行內運作。

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

  <Accordion title='為什麼機器人看起來像是「忽略」了連續傳送的訊息？'>
    佇列模式控制新訊息如何與正在進行的執行互動。使用 `/queue` 來變更模式：

    - `steer` - 將所有待處理的導向指令排入目前執行的下一個模型邊界
    - `queue` - 傳統的單次導向指令
    - `followup` - 每次執行一則訊息
    - `collect` - 批次處理訊息並回覆一次
    - `steer-backlog` - 立即導向，然後處理積壓項目
    - `interrupt` - 中止目前執行並重新開始

    預設模式為 `steer`。您可以新增像 `debounce:0.5s cap:25 drop:summarize` 這樣的選項作為後續模式。請參閱 [Command queue](/zh-Hant/concepts/queue) 和 [Steering queue](/zh-Hant/concepts/queue-steering)。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title="使用 API 金鑰時，Anthropic 的預設模型是什麼？">
    在 OpenClaw 中，憑證與模型選擇是分開的。設定 `ANTHROPIC_API_KEY`（或在 auth profiles 中儲存 Anthropic API 金鑰）可啟用驗證，但實際的預設模型取決於您在 `agents.defaults.model.primary` 中設定的內容（例如 `anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，這表示 Gateway 無法在執行中代理的預期 `auth-profiles.json`
    中找到 Anthropic 憑證。
  </Accordion>
</AccordionGroup>

---

還是卡住了？請到 [Discord](https://discord.com/invite/clawd) 提問，或是開啟一個 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。

## 相關

- [First-run FAQ](/zh-Hant/help/faq-first-run) — 安裝、上架、驗證、訂閱、早期失敗
- [Models FAQ](/zh-Hant/help/faq-models) — 模型選擇、容錯移轉、auth profiles
- [Troubleshooting](/zh-Hant/help/troubleshooting) — 症狀優先的分診
