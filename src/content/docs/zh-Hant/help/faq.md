---
summary: "關於 OpenClaw 設定、設定檔和使用的常見問題"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常見問題"
---

針對實際部署環境（本機開發、VPS、多代理、OAuth/API 金鑰、模型故障轉移）的快速解答與更深層的疑難排解。如需執行時期診斷，請參閱 [疑難排解](/zh-Hant/gateway/troubleshooting)。如需完整的設定檔參考，請參閱 [設定](/zh-Hant/gateway/configuration)。

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

   執行即時閘道健康檢查，包括支援時的通道偵測
   （需要可連線的閘道）。請參閱 [健康狀態](/zh-Hant/gateway/health)。

5. **追蹤最新記錄**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 停機，則回退至：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   檔案記錄檔與服務記錄檔是分開的；請參閱 [記錄](/zh-Hant/logging) 和 [疑難排解](/zh-Hant/gateway/troubleshooting)。

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

   向執行中的閘道要求完整快照（僅限 WS）。請參閱 [健康狀態](/zh-Hant/gateway/health)。

## 快速開始與首次執行設定

首次執行問答 — 安裝、上線、驗證路由、訂閱、初始失敗 —
位於 [首次執行常見問題](/zh-Hant/help/faq-first-run)。

## 什麼是 OpenClaw？

<AccordionGroup>
  <Accordion title="用一段話介紹什麼是 OpenClaw？">
    OpenClaw 是您在自己的裝置上執行的個人 AI 助理。它會在您已使用的訊息介面上回覆（WhatsApp、Telegram、Slack、Mattermost、Discord、Google Chat、Signal、iMessage、WebChat，以及內建的通道外掛程式，如 QQ Bot），並且在支援的平台上也能進行語音互動 + 即時 Canvas。**閘道**是永遠在線的控制平面；而助理才是產品本身。
  </Accordion>

  <Accordion title="Value proposition">
    OpenClaw 不僅僅是「Claude 的封裝」。它是一個**本地優先的控制平面**，讓您能夠在**您自己的硬體上**運行
    一個功能強大的助手，從您已經使用的聊天應用程式存取，具備
    有狀態的工作階段、記憶體和工具——而無需將您的工作流程控制權交給
    託管的 SaaS。

    重點摘要：

    - **您的裝置，您的資料：** 在您想要的任何地方（Mac、Linux、VPS）運行 Gateway，並將
      工作區 + 工作階段歷史記錄保留在本地。
    - **真實的管道，而非網頁沙箱：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/等，
      以及在支援的平台上的行動語音和 Canvas。
    - **模型中立：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，並具備針對每個代理程式的路由
      和容錯移轉功能。
    - **純本地選項：** 執行本地模型，因此如果您願意，**所有資料都可以保留在您的裝置上**。
    - **多代理程式路由：** 針對每個管道、帳戶或任務分開不同的代理程式，每個都有自己的
      工作區和預設值。
    - **開源且可駭客：** 檢查、擴展和自我託管，沒有供應商鎖定。

    文件：[Gateway](/zh-Hant/gateway)、[Channels](/zh-Hant/channels)、[Multi-agent](/zh-Hant/concepts/multi-agent)、
    [Memory](/zh-Hant/concepts/memory)。

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

  <Accordion title="OpenClaw 能否協助 SaaS 進行潛在客戶開發、外聯、廣告和部落格撰寫？">
    在**研究、篩選和草稿撰寫**方面是肯定的。它可以掃描網站、建立候選清單、
    總結潛在客戶，並撰寫外聯或廣告文案的草稿。

    對於**外聯或廣告投放**，請保持人員監督。避免發送垃圾訊息，遵守當地法律和
    平台政策，並在發送前審查所有內容。最安全的模式是讓
    OpenClaw 擬稿，由您來審核批准。

    文件：[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="相較於 Claude Code 用於網頁開發，有哪些優勢？">
    OpenClaw 是一個**個人助理**和協調層，並非取代 IDE。請使用
    Claude Code 或 Codex 在程式庫內進行最快的直接編碼迴圈。當您需要
    持久記憶、跨裝置存取和工具協調時，請使用 OpenClaw。

    優勢：

    - **跨會話的持久記憶 + 工作區**
    - **多平台存取** (WhatsApp, Telegram, TUI, WebChat)
    - **工具協調** (瀏覽器、檔案、排程、鉤子)
    - **永遠在線的 Gateway** (在 VPS 上運行，從任何地方互動)
    - 用於本機瀏覽器/螢幕/相機/執行的**節點**

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

  <Accordion title="如何針對不同任務使用不同的模型？">
    目前支援的模式有：

    - **Cron jobs (排程任務)**：隔離的工作可以為每個工作設定 `model` 覆蓋。
    - **Sub-agents (子代理程式)**：將任務路由到具有不同預設模型的獨立代理程式。
    - **On-demand switch (隨需切換)**：使用 `/model` 隨時切換目前的工作階段模型。

    請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent) 和 [Slash commands](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="機器人在執行繁重工作時會當機。我該如何將其卸載？">
    請使用 **sub-agents (子代理程式)** 來處理長時間或平行的任務。子代理程式在自己的工作階段中運行，
    會傳回摘要，並讓您的主要聊天保持回應。

    請要求您的機器人「為此任務產生一個子代理程式」或使用 `/subagents`。
    在聊天中使用 `/status` 來查看 Gateway 目前正在做什麼（以及它是否忙碌）。

    Token 提示：長時間任務和子代理程式都會消耗 tokens。如果您關心成本，請透過 `agents.defaults.subagents.model` 為子代理程式設定更便宜的模型。

    文件：[Sub-agents](/zh-Hant/tools/subagents)、[Background Tasks](/zh-Hant/automation/tasks)。

  </Accordion>

  <Accordion title="Discord 上的執行緒綁定子代理會話是如何運作的？">
    使用執行緒綁定。您可以將 Discord 執行緒綁定到子代理或會話目標，以便該執行緒中的後續訊息保留在該綁定的會話中。

    基本流程：

    - 使用 `thread: true` 透過 `sessions_spawn` 產生（並可選擇使用 `mode: "session"` 進行持續的後續追蹤）。
    - 或使用 `/focus <target>` 手動綁定。
    - 使用 `/agents` 檢查綁定狀態。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自動取消聚焦。
    - 使用 `/unfocus` 分離執行緒。

    所需設定：

    - 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆寫：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 產生時自動綁定：`channels.discord.threadBindings.spawnSessions` 預設為 `true`；將其設為 `false` 以停用執行緒綁定會話的產生。

    文件：[子代理](/zh-Hant/tools/subagents)、[Discord](/zh-Hant/channels/discord)、[設定參考](/zh-Hant/gateway/configuration-reference)、[斜線指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="子代理已完成，但完成更新去到了錯誤的地方或從未發布。我應該檢查什麼？">
    首先檢查已解析的請求者路由：

    - 完成模式下的子代理傳遞優先使用任何綁定的執行緒或對話路由（如果存在的話）。
    - 如果完成來源僅攜帶頻道，OpenClaw 會退回到請求者會話的儲存路由（`lastChannel` / `lastTo` / `lastAccountId`），以便直接傳遞仍能成功。
    - 如果既沒有綁定路由也沒有可用的儲存路由，直接傳遞可能會失敗，結果將退回到佇列會話傳遞，而不是立即發布到聊天。
    - 無效或過時的目標仍可能導致強制佇列退回或最終傳遞失敗。
    - 如果子程式的最後一個可見助理回覆確切是靜默標記 `NO_REPLY` / `no_reply`，或確切是 `ANNOUNCE_SKIP`，OpenClaw 會刻意抑制公告，而不是發布過時的先前進度。
    - 工具/toolResult 輸出不會被提升到子程式結果文字中；結果是子程式最新的可見助理回覆。

    除錯：

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[子代理](/zh-Hant/tools/subagents)、[背景任務](/zh-Hant/automation/tasks)、[會話工具](/zh-Hant/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒沒有觸發。我應該檢查什麼？">
    Cron 在 Gateway 程序內運作。如果 Gateway 沒有持續運作，
    排程的工作將不會執行。

    檢查清單：

    - 確認 cron 已啟用（`cron.enabled`）且未設定 `OPENCLAW_SKIP_CRON`。
    - 檢查 Gateway 是否全天候運作（無休眠/重啟）。
    - 驗證工作的時區設定（`--tz` 與主機時區的對比）。

    除錯：

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文件：[Cron 工作](/zh-Hant/automation/cron-jobs)、[自動化](/zh-Hant/automation)。

  </Accordion>

  <Accordion title="Cron 已觸發，但沒有傳送任何內容到頻道。為什麼？">
    請先檢查傳送模式：

    - `--no-deliver` / `delivery.mode: "none"` 表示不預期有 runner 備援傳送。
    - 缺少或無效的 announce 目標 (`channel` / `to`) 表示 runner 跳過了 outbound 傳送。
    - 頻道驗證失敗 (`unauthorized`, `Forbidden`) 表示 runner 嘗試傳送但被憑證阻擋。
    - 無聲的隔離結果 (僅有 `NO_REPLY` / `no_reply`) 被視為故意不可傳送，因此 runner 也會抑制排隊的備援傳送。

    對於隔離的 cron 工作，當聊天路由可用時，agent 仍可透過 `message`
    工具直接傳送。`--announce` 僅控制 runner 對 agent 未傳送的最終文字的備援路徑。

    除錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs), [Background Tasks](/zh-Hant/automation/tasks)。

  </Accordion>

  <Accordion title="為什麼隔離的 cron 執行會切換模型或重試一次？">
    這通常是即時模型切換路徑，而非重複排程。

    隔離的 cron 可以在當前執行拋出 `LiveSessionModelSwitchError` 時持續化執行時期的模型移交並重試。重試會保留切換後的 provider/model，且如果切換帶有新的 auth profile 覆蓋，cron 會在重試前將其持續化。

    相關的選擇規則：

    - Gmail hook 模型覆蓋在適用時優先。
    - 然後是每個工作的 `model`。
    - 然後是任何儲存的 cron-session 模型覆蓋。
    - 然後是正常的 agent/預設模型選擇。

    重試迴圈是有界限的。在初次嘗試加上 2 次切換重試後，cron 會中止而不是無限迴圈。

    除錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs), [cron CLI](/zh-Hant/cli/cron)。

  </Accordion>

  <Accordion title="How do I install skills on Linux?">
    使用原生 `openclaw skills` 指令或將技能放入您的工作區。macOS 的 Skills UI 在 Linux 上無法使用。
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

    原生 `openclaw skills install` 預設會寫入到現用工作區 `skills/`
    目錄。新增 `--global` 以安裝到所有本機代理程式
    共用的受管理技能目錄。僅在您想要發布或同步您自己的技能時

n，才安裝個別的 `clawhub` CLI。
如果您想要限制哪些代理程式能夠看見共用技能，請使用
`agents.defaults.skills` 或 `agents.list[].skills`。

  </Accordion>

  <Accordion title="Can OpenClaw run tasks on a schedule or continuously in the background?">
    是的。使用 Gateway 排程器：

    - **Cron jobs** 用於排定或週期性任務（重啟後仍會持續）。
    - **Heartbeat** 用於「主工作階段」的定期檢查。
    - **Isolated jobs** 用於發布摘要或傳送至聊天內容的自主代理程式。

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Automation](/zh-Hant/automation)、
    [Heartbeat](/zh-Hant/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以從 Linux 執行僅適用於 Apple macOS 的技能嗎？">
    不能直接執行。macOS 技能受到 `metadata.openclaw.os` 以及必要二進位檔的限制，而且只有在 **Gateway 主機**上符合條件時，這些技能才會出現在系統提示詞中。在 Linux 上，除非您覆蓋限制，否則 `darwin` 專用技能（例如 `apple-notes`、`apple-reminders`、`things-mac`）將不會載入。

    您有三種支援的模式：

    **選項 A - 在 Mac 上執行 Gateway（最簡單）。**
    在存在 macOS 二進位檔的地方執行 Gateway，然後透過 [遠端模式](#gateway-ports-already-running-and-remote-mode) 或透過 Tailscale 從 Linux 連線。由於 Gateway 主機是 macOS，技能會正常載入。

    **選項 B - 使用 macOS 節點（無 SSH）。**
    在 Linux 上執行 Gateway，配對 macOS 節點（選單列應用程式），並在 Mac 上將 **Node Run Commands** 設定為「Always Ask」或「Always Allow」。當節點上存在必要的二進位檔時，OpenClaw 可以將僅限 macOS 的技能視為符合資格。代理程式會透過 `nodes` 工具執行這些技能。如果您選擇「Always Ask」，在提示詞中核准「Always Allow」會將該指令新增至允許清單。

    **選項 C - 透過 SSH 代理 macOS 二進位檔（進階）。**
    將 Gateway 保留在 Linux 上，但讓必要的 CLI 二進位檔解析為在 Mac 上執行的 SSH 包裝程式。然後覆蓋技能以允許 Linux，使其保持符合資格。

    1. 為二進位檔建立 SSH 包裝程式（例如：針對 Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 將包裝程式放在 Linux 主機上的 `PATH`（例如 `~/bin/memo`）。
    3. 覆蓋技能中繼資料（workspace 或 `~/.openclaw/skills`）以允許 Linux：

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. 啟動新工作階段，以便重新整理技能快照。

  </Accordion>

  <Accordion title="你們有 Notion 或 HeyGen 整合嗎？">
    目前尚未內建。

    選項：

    - **自訂 skill / 插件：** 最適合可靠的 API 存取（Notion/HeyGen 都有 API）。
    - **瀏覽器自動化：** 無需編寫程式碼即可運作，但速度較慢且較不穩定。

    如果你想為每個客戶保留上下文（代理商工作流程），一個簡單的模式是：

    - 每個客戶一個 Notion 頁面（上下文 + 偏好設定 + 進行中的工作）。
    - 要求代理在會話開始時取得該頁面。

    如果你想要原生整合，請開啟功能請求或建構一個針對這些 API 的 skill。

    安裝 skills：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安裝會放在現用工作區 `skills/` 目錄中。若要在所有本機代理之間共享 skills，請使用 `openclaw skills install <slug> --global`（或手動將其放在 `~/.openclaw/skills/<name>/SKILL.md` 中）。如果只有某些代理應該看到共享安裝，請設定 `agents.defaults.skills` 或 `agents.list[].skills`。某些 skills 預期會安裝透過 Homebrew 安裝的二進位檔；在 Linux 上這意味著使用 Linuxbrew（請參閱上方的 Homebrew Linux 條目）。請參閱 [Skills](/zh-Hant/tools/skills)、[Skills config](/zh-Hant/tools/skills-config) 和 [ClawHub](/zh-Hant/tools/clawhub)。

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
  <Accordion title="有沒有專門的沙盒文件？">
    有的。請參閱 [沙盒](/zh-Hant/gateway/sandboxing)。關於 Docker 特定設定（Docker 中的完整閘道或沙盒映像檔），請參閱 [Docker](/zh-Hant/install/docker)。
  </Accordion>

  <Accordion title="Docker 感覺受限 - 如何啟用完整功能？">
    預設映像檔以安全為優先，並以 `node` 使用者身分執行，因此不包含
    系統套件、Homebrew 或隨附的瀏覽器。若要進行更完整的設定：

    - 使用 `OPENCLAW_HOME_VOLUME` 持續保存 `/home/node`，以便快取得以保留。
    - 使用 `OPENCLAW_IMAGE_APT_PACKAGES` 將系統相依項建置至映像檔中。
    - 透過隨附的 CLI 安裝 Playwright 瀏覽器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 設定 `PLAYWRIGHT_BROWSERS_PATH` 並確保該路徑已被持續保存。

    文件：[Docker](/zh-Hant/install/docker)、[瀏覽器](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="我可以在保持 DM 私人的同時，讓群組公開/透過一個代理程式進行沙盒化嗎？">
    可以 - 如果您的私人流量是 **DM** 而您的公開流量是 **群組**。

    使用 `agents.defaults.sandbox.mode: "non-main"` 讓群組/頻道會話（非主要金鑰）在設定的沙盒後端中執行，而主要的 DM 會話則保留在主機上。如果您不選擇後端，Docker 是預設的後端。然後透過 `tools.sandbox.tools` 限制沙盒化會話中可用的工具。

    設定逐步解說 + 範例設定：[群組：個人 DM + 公開群組](/zh-Hant/channels/groups#pattern-personal-dms-public-groups-single-agent)

    主要設定參考：[閘道設定](/zh-Hant/gateway/config-agents#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="如何將主機資料夾綁定到沙箱中？">
    將 `agents.defaults.sandbox.docker.binds` 設定為 `["host:path:mode"]` (例如 `"/home/user/src:/src:ro"`)。全域 + 每個代理程式的綁定會合併；當 `scope: "shared"` 時，會忽略每個代理程式的綁定。請針對任何敏感內容使用 `:ro`，並請記住綁定會繞過沙箱檔案系統防護。

    OpenClaw 會根據正規化路徑以及透過最深層現有祖先解析的規範路徑，來驗證綁定來源。這意味著即使最後一個路徑區段尚不存在，符號連結父目錄逃逸仍會以失敗封閉，而在解析符號連結後，仍會套用允許根目錄的檢查。

    請參閱 [沙箱](/zh-Hant/gateway/sandboxing#custom-bind-mounts) 和 [沙箱與工具政策與提權](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) 以取得範例和安全性說明。

  </Accordion>

  <Accordion title="記憶體是如何運作的？">
    OpenClaw 記憶體只是代理程式工作區中的 Markdown 檔案：

    - `memory/YYYY-MM-DD.md` 中的每日筆記
    - `MEMORY.md` 中的策展長期筆記 (僅限主要/私人工作階段)

    OpenClaw 還會執行 **靜音預壓縮記憶體排清**，以提醒模型
    在自動壓縮之前寫入持久化筆記。這僅在工作區
    可寫入時執行 (唯讀沙箱會跳過此步驟)。請參閱 [記憶體](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="記憶體總是忘記事情。我要如何讓它記住？">
    要求機器人 **將該事實寫入記憶體**。長期筆記應放在 `MEMORY.md` 中，
    短期情境則放入 `memory/YYYY-MM-DD.md`。

    這仍是我們正在改進的領域。提醒模型儲存記憶會有所幫助；
    它會知道該做什麼。如果它持續忘記，請驗證 Gateway 在每次執行時是否使用相同的工作區。

    文件：[記憶體](/zh-Hant/concepts/memory)、[代理程式工作區](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="記憶體會永久保存嗎？有哪些限制？">
    記憶體檔案存在於磁碟上，並會持續保存直到您將其刪除。限制取決於您的
    儲存空間，而非模型。**工作階段內容** 仍然受限於模型的
    內容視窗，因此長時間的對話可能會被壓縮或截斷。這就是為什麼
    記憶體搜尋存在的緣故——它只將相關的部分拉回內容中。

    文件：[Memory](/zh-Hant/concepts/memory)、[Context](/zh-Hant/concepts/context)。

  </Accordion>

  <Accordion title="語意記憶體搜尋需要 OpenAI API 金鑰嗎？">
    只有在使用 **OpenAI embeddings** 時才需要。Codex OAuth 涵蓋了聊天/完成功能，
    且 **不** 授予 embeddings 存取權限，因此 **透過 Codex 登入（OAuth 或
    Codex CLI 登入）** 對語意記憶體搜尋沒有幫助。OpenAI embeddings
    仍然需要真實的 API 金鑰（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果您未明確設定提供者，OpenClaw 會在能夠解析 API 金鑰時自動選擇提供者
    （auth profiles、`models.providers.*.apiKey` 或環境變數）。
    如果解析到 OpenAI 金鑰，它偏好 OpenAI；否則如果解析到 Gemini 金鑰，則偏好 Gemini，
    接著是 Voyage，然後是 Mistral。如果沒有可用的遠端金鑰，記憶體
    搜尋將保持停用狀態，直到您進行設定。如果您有設定且存在的本機模型路徑，
    OpenClaw 偏好 `local`。當您明確設定
    `memorySearch.provider = "ollama"` 時，支援 Ollama。

    如果您希望保持本機化，請設定 `memorySearch.provider = "local"`（並選擇性地
    設定 `memorySearch.fallback = "none"`）。如果您想要 Gemini embeddings，請設定
    `memorySearch.provider = "gemini"` 並提供 `GEMINI_API_KEY`（或
    `memorySearch.remote.apiKey`）。我們支援 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本機** embedding
    模型——詳見 [Memory](/zh-Hant/concepts/memory) 了解設定細節。

  </Accordion>
</AccordionGroup>

## 檔案在磁碟上的位置

<AccordionGroup>
  <Accordion title="Is all data used with OpenClaw saved locally?">
    不——**OpenClaw 的狀態是本地的**，但 **外部服務仍然能看到你發送給它們的內容**。

    - **預設為本地：** 會話（sessions）、記憶檔案、配置和工作區位於 Gateway 主機
      （`~/.openclaw` + 你的工作區目錄）。
    - **必要時為遠端：** 你發送給模型提供商（Anthropic/OpenAI/等）的訊息會
      發送到它們的 API，而聊天平台（WhatsApp/Telegram/Slack/等）會在其
      伺服器上儲存訊息資料。
    - **由你控管足跡：** 使用本地模型可以讓提示詞保留在你的機器上，但頻道
      流量仍會通過該頻道的伺服器。

    相關：[Agent workspace](/zh-Hant/concepts/agent-workspace)，[Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 將資料儲存在哪裡？">
    所有內容都位於 `$OPENCLAW_STATE_DIR` 下（預設為：`~/.openclaw`）：

    | Path                                                            | Purpose                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主要設定 (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 舊版 OAuth 匯入（首次使用時會複製到 auth profiles）       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Auth profiles（OAuth、API 金鑰以及可選的 `keyRef`/`tokenRef`）  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | 針對 `file` SecretRef 提供者的可選檔案支援秘密載荷 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 舊版相容性檔案（靜態 `api_key` 條目已清除）      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供者狀態（例如 `whatsapp/<accountId>/creds.json`）            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每個代理程式的狀態（agentDir + sessions）                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 對話歷史與狀態（每個代理程式）                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Session 元資料（每個代理程式）                                       |

    舊版單一代理程式路徑：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）。

    您的 **workspace**（AGENTS.md、記憶檔案、技能等）是分開的，並透過 `agents.defaults.workspace` 進行設定（預設為：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 應該放在哪裡？">
    這些檔案位於 **agent workspace** 中，而不是 `~/.openclaw`。

    - **Workspace (每個 agent)**: `AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md`、`memory/YYYY-MM-DD.md`，以及選用的 `HEARTBEAT.md`。
      小寫根目錄 `memory.md` 僅用於舊版修復輸入；當這兩個檔案都存在時，`openclaw doctor --fix`
      可以將其合併到 `MEMORY.md`。
    - **State dir (`~/.openclaw`)**: 設定、channel/provider 狀態、auth profiles、sessions、日誌，
      以及共享技能 (`~/.openclaw/skills`)。

    預設的 workspace 是 `~/.openclaw/workspace`，可透過以下方式設定：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果機器人在重新啟動後「忘記」了內容，請確認 Gateway 每次啟動時都使用相同的
    workspace (並記住：遠端模式使用的是 **gateway host's**
    的 workspace，而不是您的本機筆電)。

    提示：如果您想要持久的行為或偏好設定，請要求機器人 **將其寫入
    AGENTS.md 或 MEMORY.md**，而不是依賴聊天記錄。

    請參閱 [Agent workspace](/zh-Hant/concepts/agent-workspace) 和 [Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="推薦的備份策略">
    將您的 **agent workspace** 放在一個 **私有** git repo 中，並將其備份到某個
    私有位置 (例如 GitHub 私有儲存庫)。這會儲存記憶 + AGENTS/SOUL/USER
    檔案，並讓您稍後還原助理的「心智」。

    **請勿** commit `~/.openclaw` 下的任何內容 (憑證、sessions、權杖或加密的 secrets payloads)。
    如果您需要完整還原，請分別備份 workspace 和 state 目錄
    (請參閱上面的遷移問題)。

    文件: [Agent workspace](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

<Accordion title="如何完全解除安裝 OpenClaw？">請參閱專屬指南: [Uninstall](/zh-Hant/install/uninstall)。</Accordion>

  <Accordion title="代理能在工作區外運作嗎？">
    可以。工作區是**預設的工作目錄**和記憶錨點，並非嚴格的沙箱。
    相對路徑會在工作區內解析，但絕對路徑可以存取其他
    主機位置，除非啟用了沙箱功能。如果您需要隔離，請使用
    [`agents.defaults.sandbox`](/zh-Hant/gateway/sandboxing) 或個別代理的沙箱設定。如果您
    希望某個存儲庫成為預設工作目錄，請將該代理的
    `workspace` 指向存儲庫根目錄。OpenClaw 存儲庫只是原始碼；除非您有意讓代理在其中運作，否則請將
    工作區分開。

    範例（將存儲庫作為預設 cwd）：

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
    Session 狀態由 **gateway 主機** 擁有。如果您處於遠端模式，您關注的 session 儲存位置是在遠端機器上，而不是您的本地筆電。請參閱 [Session 管理](/zh-Hant/concepts/session)。
  </Accordion>
</AccordionGroup>

## 設定基礎

<AccordionGroup>
  <Accordion title="設定檔是什麼格式？在哪裡？">
    OpenClaw 會從 `$OPENCLAW_CONFIG_PATH` 讀取選用的 **JSON5** 設定檔（預設值：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果檔案不存在，它會使用相對安全的預設值（包括預設工作區 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我設定了 gateway.bind: "lan" (或 "tailnet")，現在沒有東西在監聽 / UI 顯示未授權'>
    非回環綁定 **需要有效的閘道驗證路徑**。實務上這代表：

    - 共用金鑰驗證：token 或密碼
    - 位於正確設定之具備身份意識的反向代理後方的 `gateway.auth.mode: "trusted-proxy"`

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

    - `gateway.remote.token` / `.password` **並不會**單獨啟用本機閘道驗證。
    - 本機呼叫路徑僅能在 `gateway.auth.*` 未設定時，將 `gateway.remote.*` 作為後備方案。
    - 若使用密碼驗證，請改為設定 `gateway.auth.mode: "password"` 加上 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
    - 若 `gateway.auth.token` / `gateway.auth.password` 是透過 SecretRef 明確設定但未解析，解析會以封閉式失敗結束 (不會有遠端後備遮罩)。
    - 共用金鑰 Control UI 設定透過 `connect.params.auth.token` 或 `connect.params.auth.password` (儲存於 app/UI 設定中) 進行驗證。承載身份的模式如 Tailscale Serve 或 `trusted-proxy` 則改用請求標頭。請避免將共用金鑰放在 URL 中。
    - 使用 `gateway.auth.mode: "trusted-proxy"` 時，同主機回環反向代理需要明確的 `gateway.auth.trustedProxy.allowLoopback = true` 以及 `gateway.trustedProxies` 中的回環條目。

  </Accordion>

  <Accordion title="為什麼我在 localhost 現在需要 token？">
    OpenClaw 預設會強制執行閘道驗證，包括迴路。在正常的預設路徑中，這意味著 token 驗證：如果未設定明確的驗證路徑，閘道啟動會解析為 token 模式並為該次啟動產生僅限執行時期的 token，因此 **本機 WS 用戶端必須進行驗證**。當用戶端在重啟之間需要穩定的金鑰時，請明確設定 `gateway.auth.token`、`gateway.auth.password`、`OPENCLAW_GATEWAY_TOKEN` 或 `OPENCLAW_GATEWAY_PASSWORD`。這可以阻止其他本機程序呼叫閘道。

    如果您偏好不同的驗證路徑，可以明確選擇密碼模式（或者，對於具備身分感知的反向代理，則是 `trusted-proxy`）。如果您**真的**想要開放迴路，請在您的設定中明確設定 `gateway.auth.mode: "none"`。Doctor 隨時可以為您產生 token：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="變更設定後需要重啟嗎？">
    閘道會監控設定並支援熱重載：

    - `gateway.reload.mode: "hybrid"` (預設)：熱套用安全變更，關鍵變更則重啟
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
    - `random`：輪換顯示有趣/季節性標語（預設行為）。
    - 如果您完全不想要橫幅，請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何啟用網路搜尋（以及網路抓取）？">
    `web_fetch` 不需要 API 金鑰即可運作。`web_search` 取決於您選擇的
    提供商：

    - 依賴 API 的提供者（如 Brave、Exa、Firecrawl、Gemini、Kimi、MiniMax Search、Perplexity 和 Tavily）需要其正常的 API 金鑰設定。
    - Grok 可以重複使用來自模型認證的 xAI OAuth，或回退至 `XAI_API_KEY` / 外掛程式 web-search 設定。
    - Ollama Web Search 不需要金鑰，但它會使用您設定的 Ollama 主機並需要 `ollama signin`。
    - DuckDuckGo 不需要金鑰，但它是一個非官方的 HTML 整合。
    - SearXNG 無金鑰/自託管；請設定 `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`。

    **建議：** 執行 `openclaw configure --section web` 並選擇一個提供者。
    環境變數替代方案：

    - Brave: `BRAVE_API_KEY`
    - Exa: `EXA_API_KEY`
    - Firecrawl: `FIRECRAWL_API_KEY`
    - Gemini: `GEMINI_API_KEY`
    - Grok: xAI OAuth, `XAI_API_KEY`
    - Kimi: `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
    - MiniMax Search: `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY`, 或 `MINIMAX_API_KEY`
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
    舊版 `tools.web.search.*` 提供者路徑為了相容性暫時仍會載入，但不應用於新的設定。
    Firecrawl web-fetch 回退設定位於 `plugins.entries.firecrawl.config.webFetch.*` 之下。

    註記：

    - 如果您使用允許清單，請新增 `web_search`/`web_fetch`/`x_search` 或 `group:web`。
    - `web_fetch` 預設為啟用（除非明確停用）。
    - 如果省略 `tools.web.fetch.provider`，OpenClaw 會從可用的憑證中自動偵測第一個準備就緒的抓取回退提供者。目前的內建提供者是 Firecrawl。
    - Daemon 從 `~/.openclaw/.env`（或服務環境）讀取環境變數。

    文件：[Web tools](/zh-Hant/tools/web)。

  </Accordion>

  <Accordion title="config.apply 清除了我的設定。如何復原並避免此情況？">
    `config.apply` 會**取代整個設定**。如果您傳送部分物件，其他所有內容
    都會被移除。

    目前的 OpenClaw 可防護許多意外覆寫的情況：

    - OpenClaw 擁有的設定寫入會在寫入前驗證完整的變更後設定。
    - 無效或破壞性的 OpenClaw 擁有寫入會被拒絕並儲存為 `openclaw.json.rejected.*`。
    - 如果直接編輯破壞了啟動或熱重載，Gateway 會以封閉模式失敗或跳過重載；它不會覆寫 `openclaw.json`。
    - `openclaw doctor --fix` 擁有修復功能，並可以在將拒絕的檔案儲存為 `openclaw.json.clobbered.*` 的同時復原最後已知的好設定。

    復原：

    - 檢查 `openclaw logs --follow` 中是否有 `Invalid config at`、`Config write rejected:` 或 `config reload skipped (invalid config)`。
    - 檢查最新 `openclaw.json.clobbered.*` 或 `openclaw.json.rejected.*` 與現行設定的差異。
    - 執行 `openclaw config validate` 和 `openclaw doctor --fix`。
    - 使用 `openclaw config set` 或 `config.patch` 只將預定的鍵複製回來。
    - 如果您沒有最後已知的好設定或被拒絕的資料負載，請從備份還原，或重新執行 `openclaw doctor` 並重新設定通道/模型。
    - 如果這是意外發生，請提報錯誤並附上您最後的已知設定或任何備份。
    - 本機編碼代理程式通常可以從記錄或歷史記錄重建可用的設定。

    避免此情況：

    - 針對小變更使用 `openclaw config set`。
    - 針對互動式編輯使用 `openclaw configure`。
    - 當您不確定確切路徑或欄位形狀時，請先使用 `config.schema.lookup`；它會傳回淺層架構節點加上即時子摘要以便向下鑽取。
    - 針對部分 RPC 編輯使用 `config.patch`；僅將 `config.apply` 用於完整設定替換。
    - 如果您從代理程式執行中使用面向代理程式的 `gateway` 工具，它仍會拒絕對 `tools.exec.ask` / `tools.exec.security` 的寫入（包括正規化為相同受保護執行路徑的舊版 `tools.bash.*` 別名）。

    文件：[設定](/zh-Hant/cli/config)、[組態](/zh-Hant/cli/configure)、[Gateway 疑難排解](/zh-Hant/gateway/troubleshooting#gateway-rejected-invalid-config)、[Doctor](/zh-Hant/gateway/doctor)。

  </Accordion>

  <Accordion title="How do I run a central Gateway with specialized workers across devices?">
    常見的模式是**一個 Gateway**（例如 Raspberry Pi）加上**節點（nodes）**和**代理程式（agents）**：

    - **Gateway（中央）：** 擁有通道（Signal/WhatsApp）、路由和工作階段。
    - **Nodes（裝置）：** Mac/iOS/Android 作為外設連接並公開本機工具（`system.run`、`canvas`、`camera`）。
    - **Agents（工作程式）：** 用於特殊角色的獨立「大腦」/工作區（例如「Hetzner 營運」、「個人資料」）。
    - **Sub-agents（子代理程式）：** 當您需要並行處理時，從主代理程式生成背景工作。
    - **TUI：** 連接到 Gateway 並切換代理程式/工作階段。

    文件：[Nodes](/zh-Hant/nodes)、[Remote access](/zh-Hant/gateway/remote)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent)、[Sub-agents](/zh-Hant/tools/subagents)、[TUI](/zh-Hant/web/tui)。

  </Accordion>

  <Accordion title="Can the OpenClaw browser run headless?">
    可以。這是一個設定選項：

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

    預設為 `false`（有介面模式）。無介面模式在某些網站上更容易觸發反機器人檢查。請參閱 [Browser](/zh-Hant/tools/browser)。

    無介面模式使用**相同的 Chromium 引擎**，並且適用於大多數自動化操作（表單、點擊、爬取、登入）。主要差異如下：

    - 沒有可見的瀏覽器視窗（如果您需要視覺效果，請使用截圖）。
    - 某些網站對無介面模式下的自動化更嚴格（驗證碼、反機器人）。
      例如，X/Twitter 經常會封鎖無介面模式的工作階段。

  </Accordion>

  <Accordion title="How do I use Brave for browser control?">
    將 `browser.executablePath` 設定為您的 Brave 執行檔（或任何基於 Chromium 的瀏覽器），然後重新啟動 Gateway。
    請參閱 [Browser](/zh-Hant/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整設定範例。
  </Accordion>
</AccordionGroup>

## 遠端 Gateway 和節點

<AccordionGroup>
  <Accordion title="指令如何在 Telegram、Gateway 和節點之間傳遞？">
    Telegram 訊息由 **gateway** 處理。Gateway 執行代理程式，並且只有在需要節點工具時，才透過 **Gateway WebSocket** 呼叫節點：

    Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

    節點看不到來自提供方的傳入流量；它們只接收節點 RPC 呼叫。

  </Accordion>

  <Accordion title="如果 Gateway 託管在遠端，我的代理程式如何存取我的電腦？">
    簡短回答：**將您的電腦配對為節點**。Gateway 在其他地方執行，但它可以透過 Gateway WebSocket 呼叫您本機電腦上的 `node.*` 工具（螢幕、相機、系統）。

    典型設定：

    1. 在常時運作的主機（VPS/家用伺服器）上執行 Gateway。
    2. 將 Gateway 主機與您的電腦放在同一個 tailnet 上。
    3. 確保 Gateway WS 可被存取（tailnet bind 或 SSH tunnel）。
    4. 在本機開啟 macOS 應用程式並以 **Remote over SSH** 模式（或直接透過 tailnet）連接，
       以便能註冊為節點。
    5. 在 Gateway 上批准該節點：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要單獨的 TCP 橋接器；節點透過 Gateway WebSocket 連接。

    安全提醒：配對 macOS 節點允許在該機器上進行 `system.run`。僅
    配對您信任的裝置，並閱讀 [Security](/zh-Hant/gateway/security)。

    文件：[Nodes](/zh-Hant/nodes)、[Gateway protocol](/zh-Hant/gateway/protocol)、[macOS remote mode](/zh-Hant/platforms/mac/remote)、[Security](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已連線但我沒收到回覆。現在該怎麼辦？">
    檢查基本事項：

    - Gateway 正在執行：`openclaw gateway status`
    - Gateway 健康狀況：`openclaw status`
    - 頻道健康狀況：`openclaw channels status`

    然後驗證授權和路由：

    - 如果您使用 Tailscale Serve，請確保 `gateway.auth.allowTailscale` 設定正確。
    - 如果您透過 SSH 隧道連線，請確認本機隧道已啟動並指向正確的連接埠。
    - 確認您的允許清單（DM 或群組）包含您的帳戶。

    文件：[Tailscale](/zh-Hant/gateway/tailscale)、[遠端存取](/zh-Hant/gateway/remote)、[頻道](/zh-Hant/channels)。

  </Accordion>

  <Accordion title="兩個 OpenClaw 執行個體可以互相通訊嗎（本機 + VPS）？">
    可以。沒有內建的「bot-to-bot」橋接器，但您可以透過幾種可靠的方式將其連接：

    **最簡單的方式：** 使用兩個機器人都能存取的正常聊天頻道（Telegram/Slack/WhatsApp）。
    讓機器人 A 傳送訊息給機器人 B，然後讓機器人 B 像往常一樣回覆。

    **CLI 橋接器（通用）：** 執行一個腳本，使用
    `openclaw agent --message ... --deliver` 呼叫另一個 Gateway，
    指向另一個機器人監聽的聊天。如果其中一個機器人在遠端 VPS 上，請透過 SSH/Tailscale 將您的 CLI 指向該遠端 Gateway
    （請參閱 [遠端存取](/zh-Hant/gateway/remote)）。

    範例模式（從可以連線到目標 Gateway 的機器執行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：加入防護措施，避免兩個機器人無限循環（僅限提及、頻道
    允許清單，或「不要回覆機器人訊息」規則）。

    文件：[遠端存取](/zh-Hant/gateway/remote)、[Agent CLI](/zh-Hant/cli/agent)、[Agent send](/zh-Hant/tools/agent-send)。

  </Accordion>

  <Accordion title="多個代理是否需要分開的 VPS？">
    不需要。一個 Gateway 可以託管多個代理，每個代理都有自己的工作區、預設模型和路由。這是標準設定，比每個代理運行一個 VPS 更便宜且簡單。

    只有當您需要強隔離（安全邊界）或非常不願意共用的不同設定時，才使用分開的 VPS。否則，請保留一個 Gateway 並使用多個代理或子代理。

  </Accordion>

  <Accordion title="在我的個人筆記型電腦上使用 node 而不是從 VPS 使用 SSH 有什麼好處嗎？">
    是的 —— node 是從遠端 Gateway 連接您的筆記型電腦的首選方式，並且它們提供的功能不僅限於 shell 存取。Gateway 運行於 macOS/Linux（Windows 透過 WSL2）且非常輕量（小型 VPS 或 Raspberry Pi 級別的設備即可；4 GB RAM 綽綽有餘），因此常見的設定是一台恆運主機加上您的筆記型電腦作為 node。

    - **無需 inbound SSH。** Node 會向外連接到 Gateway WebSocket 並使用裝置配對。
    - **更安全的執行控制。** `system.run` 受該筆記型電腦上的 node 許可清單/核准限制。
    - **更多裝置工具。** 除了 `system.run` 之外，Node 還公開 `canvas`、`camera` 和 `screen`。
    - **本機瀏覽器自動化。** 將 Gateway 保留在 VPS 上，但透過筆記型電腦上的 node 主機在本地運行 Chrome，或透過 Chrome MCP 附加到主機上的本機 Chrome。

    SSH 適合臨時的 shell 存取，但對於持續的代理工作流程和裝置自動化，node 更簡單。

    文件：[Nodes](/zh-Hant/nodes)、[Nodes CLI](/zh-Hant/cli/nodes)、[Browser](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="節點是否會執行閘道服務？">
    不會。除非您故意執行獨立的設定檔（請參閱[多重閘道](/zh-Hant/gateway/multiple-gateways)），否則每台主機應該只執行**一個閘道**。節點是連接到閘道的外圍設備（iOS/Android 節點，或功能表列應用程式中的 macOS「節點模式」）。關於無頭節點主機和 CLI 控制，請參閱[節點主機 CLI](/zh-Hant/cli/node)。

    對於 `gateway`、`discovery` 和託管的外掛介面變更，需要完整重新啟動。

  </Accordion>

  <Accordion title="是否有 API / RPC 方式可以套用設定？">
    有的。

    - `config.schema.lookup`：在寫入前檢查單一設定子樹、其淺層架構節點、相符的 UI 提示以及直接子項摘要
    - `config.get`：取得目前的快照 + 雜湊值
    - `config.patch`：安全的部分更新（大多數 RPC 編輯的首選）；盡可能熱重載，必要時重新啟動
    - `config.apply`：驗證並取代完整設定；盡可能熱重載，必要時重新啟動
    - 面向代理程式的 `gateway` 執行期工具仍然拒絕改寫 `tools.exec.ask` / `tools.exec.security`；舊版的 `tools.bash.*` 別名會正規化為相同的受保護執行路徑

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

  <Accordion title="如何在 VPS 上設置 Tailscale 並從我的 Mac 連接？">
    最基本步驟：

    1. **在 VPS 上安裝 + 登入**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在您的 Mac 上安裝 + 登入**
       - 使用 Tailscale 應用程式並登入相同的 tailnet。
    3. **啟用 MagicDNS（建議）**
       - 在 Tailscale 管理主控台中啟用 MagicDNS，以便 VPS 擁有穩定的名稱。
    4. **使用 tailnet 主機名**
       - SSH： `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS： `ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果您希望不使用 SSH 也能存取 Control UI，請在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    這會將 Gateway 綁定到 loopback 並透過 Tailscale 公開 HTTPS。參見 [Tailscale](/zh-Hant/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何將 Mac 節點連接到遠端 Gateway (Tailscale Serve)？">
    Serve 會公開 **Gateway Control UI + WS**。節點透過相同的 Gateway WS 端點進行連接。

    建議的設定：

    1. **確保 VPS 和 Mac 位於同一個 tailnet 上**。
    2. **在 macOS 應用程式中使用 Remote 模式**（SSH 目標可以是 tailnet 主機名稱）。
       應用程式將會建立 Gateway 連線通道並以節點身分連接。
    3. **在 gateway 上核准節點**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文件：[Gateway protocol](/zh-Hant/gateway/protocol)、[Discovery](/zh-Hant/gateway/discovery)、[macOS remote mode](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我應該在第二台筆記型電腦上安裝還是只新增一個節點？">
    如果您在第二台筆記型電腦上只需要 **本機工具** (screen/camera/exec)，請將其新增為
    **節點**。這可以維持單一 Gateway 並避免重複的設定。本機節點工具目前僅支援 macOS，但我們計劃將其擴展到其他作業系統。

    只有在您需要 **嚴格隔離** 或兩個完全獨立的機器人時，才安裝第二個 Gateway。

    文件：[Nodes](/zh-Hant/nodes)、[Nodes CLI](/zh-Hant/cli/nodes)、[Multiple gateways](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 環境變數與 .env 載入

<AccordionGroup>
  <Accordion title="OpenClaw 如何載入環境變數？">
    OpenClaw 會從父程序（shell、launchd/systemd、CI 等）讀取環境變數，並額外載入：

    - 當前工作目錄中的 `.env`
    - 來自 `~/.openclaw/.env`（也稱作 `$OPENCLAW_STATE_DIR/.env`）的全局後備 `.env`

    這兩個 `.env` 檔案都不會覆蓋既有的環境變數。

    您也可以在設定中定義內聯環境變數（僅在程序環境中缺失時套用）：

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    詳見 [/environment](/zh-Hant/help/environment) 以了解完整的優先順序和來源。

  </Accordion>

  <Accordion title="我透過服務啟動了 Gateway，但我的環境變數消失了。該怎麼辦？">
    有兩個常見的修復方法：

    1. 將缺失的金鑰放入 `~/.openclaw/.env`，以便在服務未繼承您的 shell 環境時也能被載入。
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

    這會執行您的登入 shell 並僅匯入缺失的預期金鑰（絕不覆蓋）。等效的環境變數為：
    `OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我設定了 COPILOT_GITHUB_TOKEN，但模型狀態顯示「Shell env: off」。為什麼？'>
    `openclaw models status` 會回報是否已啟用 **shell env import**。「Shell env: off」
    並 **不** 代表你的環境變數遺失——這只是表示 OpenClaw 不會
    自動載入你的登入 shell。

    如果 Gateway 以服務方式執行（launchd/systemd），它將不會繼承你的 shell
    環境。請透過以下任一方式修正：

    1. 將 token 放入 `~/.openclaw/.env`：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或啟用 shell 匯入（`env.shellEnv.enabled: true`）。
    3. 或將其新增至你的設定檔 `env` 區塊（僅在遺失時適用）。

    然後重新啟動 gateway 並重新檢查：

    ```bash
    openclaw models status
    ```

    Copilot tokens 是從 `COPILOT_GITHUB_TOKEN` 讀取的（也有 `GH_TOKEN` / `GITHUB_TOKEN`）。
    請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers) 與 [/environment](/zh-Hant/help/environment)。

  </Accordion>
</AccordionGroup>

## Sessions and multiple chats

<AccordionGroup>
  <Accordion title="我要如何開始一個新的對話？">
    傳送 `/new` 或 `/reset` 作為獨立訊息。請參閱 [Session management](/zh-Hant/concepts/session)。
  </Accordion>

  <Accordion title="如果我不傳送 /new，sessions 會自動重設嗎？">
    Sessions 可以在 `session.idleMinutes` 之後過期，但這是 **預設停用** 的（預設值為 **0**）。
    將其設定為正數值以啟用閒置過期。啟用後，閒置期間之後的 **下一則**
    訊息將會為該 chat key 啟動一個新的 session id。
    這不會刪除逐字稿——它只是開始一個新的 session。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有沒有辦法建立一個 OpenClaw 實例團隊（一個 CEO 和許多代理）？">
    是的，透過 **多代理路由** 和 **子代理**。您可以建立一個協調器
    代理和多個具有各自工作區和模型的工作代理。

    不過說真的，這最好被視為一個 **有趣的實驗**。它非常耗費 token，而且通常
    比使用一個機器人搭配不同的會話來得沒效率。我們設想的典型模型
    是您與一個機器人對話，並使用不同的會話來進行平行工作。該
    機器人也可以在需要時生成子代理。

    文件：[多代理路由](/zh-Hant/concepts/multi-agent)、[子代理](/zh-Hant/tools/subagents)、[代理 CLI](/zh-Hant/cli/agents)。

  </Accordion>

  <Accordion title="為什麼上下文在任務中途被截斷？我該如何預防？">
    會話上下文受模型視窗限制。長時間的對話、龐大的工具輸出或許多
    檔案都可能觸發壓縮或截斷。

    解決方法：

    - 要求機器人總結當前狀態並將其寫入檔案。
    - 在長任務前使用 `/compact`，切換主題時使用 `/new`。
    - 將重要的上下文保留在工作區中，並要求機器人讀回。
    - 對於長時間或平行工作使用子代理，以便主對話保持較小。
    - 如果這種情況經常發生，請選擇具有較大上下文視窗的模型。

  </Accordion>

  <Accordion title="我如何完全重置 OpenClaw 但保留安裝？">
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

    - 如果引導程式偵測到現有的設定，也會提供 **重置** 選項。請參閱 [引導程式 (CLI)](/zh-Hant/start/wizard)。
    - 如果您使用了設定檔（`--profile` / `OPENCLAW_PROFILE`），請重置每個狀態目錄（預設為 `~/.openclaw-<profile>`）。
    - 開發重置：`openclaw gateway --dev --reset`（僅限開發；清除開發設定 + 憑證 + 會話 + 工作區）。

  </Accordion>

  <Accordion title='我遇到「context too large」錯誤 - 如何重置或壓縮？'>
    使用以下其中一種方法：

    - **壓縮 (Compact)**（保留對話但總結較早的輪次）：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 來引導總結。

    - **重置 (Reset)**（為相同的聊天金鑰建立全新的工作階段 ID）：

      ```
      /new
      /reset
      ```

    如果持續發生此情況：

    - 啟用或調整 **session pruning**（`agents.defaults.contextPruning`）以修剪舊的工具輸出。
    - 使用具有較大上下文視窗的模型。

    文件：[Compaction](/zh-Hant/concepts/compaction)、[Session pruning](/zh-Hant/concepts/session-pruning)、[Session management](/zh-Hant/concepts/session)。

  </Accordion>

  <Accordion title='為什麼我會看到「LLM request rejected: messages.content.tool_use.input field required」？'>
    這是一個提供者驗證錯誤：模型發出了一個 `tool_use` 區塊，但缺少必需的
    `input`。這通常表示工作階段歷程已過時或損壞（通常發生在長對話串
    或工具/架構變更之後）。

    解決方法：使用 `/new`（獨立訊息）開始一個新的工作階段。

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

    如果 `HEARTBEAT.md` 存在但實際上是空的（僅包含空白行和像 `# Heading` 這樣的 markdown
    標題），OpenClaw 會跳過心跳執行以節省 API 呼叫。
    如果檔案不存在，心跳仍會執行，模型會決定要做什麼。

    每個代理程式的覆寫使用 `agents.list[].heartbeat`。文件：[Heartbeat](/zh-Hant/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我需要將「機器人帳號」新增至 WhatsApp 群組嗎？'>
    不需要。OpenClaw 運作於**您自己的帳號**上，所以如果您在群組中，OpenClaw 就能看到它。
    預設情況下，群組回覆會被阻擋，直到您允許傳送者 (`groupPolicy: "allowlist"`)。

    如果您只希望**您自己**能觸發群組回覆：

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
    選項 1 (最快)：追蹤日誌 並在群組中傳送測試訊息：

    ```bash
    openclaw logs --follow --json
    ```

    尋找以 `@g.us` 結尾的 `chatId` (或 `from`)，例如：
    `1234567890-1234567890@g.us`。

    選項 2 (如果已經設定/加入允許清單)：從設定列出群組：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文件：[WhatsApp](/zh-Hant/channels/whatsapp)、[Directory](/zh-Hant/cli/directory)、[Logs](/zh-Hant/cli/logs)。

  </Accordion>

  <Accordion title="為什麼 OpenClaw 不在群組中回覆？">
    兩個常見原因：

    - Mention gating (提及閘門) 已開啟 (預設)。您必須 @提及 機器人 (或符合 `mentionPatterns`)。
    - 您設定了 `channels.whatsapp.groups` 但沒有 `"*"`，且該群組不在允許清單中。

    請參閱 [Groups](/zh-Hant/channels/groups) 和 [Group messages](/zh-Hant/channels/group-messages)。

  </Accordion>

<Accordion title="群組/執行緒會與 DM 共用上下文嗎？">直接聊天 預設會合併至主工作階段。群組/頻道有自己的工作階段金鑰，而 Telegram 主題 / Discord 執行緒則是獨立的工作階段。請參閱 [Groups](/zh-Hant/channels/groups) 和 [Group messages](/zh-Hant/channels/group-messages)。</Accordion>

  <Accordion title="我可以建立多少個工作區和代理程式？">
    沒有硬性限制。數十個（甚至數百個）都沒問題，但請注意：

    - **硬碟增長：** 會話 + 逐字稿位於 `~/.openclaw/agents/<agentId>/sessions/` 之下。
    - **Token 成本：** 更多代理程式意味著更多的並行模型使用量。
    - **營運負擔：** 每個代理程式的驗證設定檔、工作區和通道路由。

    提示：

    - 為每個代理程式保留一個 **作用中** 工作區 (`agents.defaults.workspace`)。
    - 如果硬碟空間增加，請修剪舊的會話（刪除 JSONL 或儲存條目）。
    - 使用 `openclaw doctor` 來發現孤立的工作區和設定檔不符。

  </Accordion>

  <Accordion title="我可以同時執行多個機器人或聊天 (Slack) 嗎？我該如何設定？">
    可以。使用 **多代理程式路由** 來執行多個獨立的代理程式，並透過
    通道/帳號/對等方路由傳入訊息。Slack 受支援為一種通道，並可綁定至特定的代理程式。

    瀏覽器存取功能強大，但並非「人類能做的一切」—— 反機器人措施、CAPTCHA 和 MFA
    仍可能阻擋自動化。為了獲得最可靠的瀏覽器控制，請在主機上使用本機 Chrome MCP，
    或在實際執行瀏覽器的機器上使用 CDP。

    最佳實務設定：

    - 永遠線上的 Gateway 主機 (VPS/Mac mini)。
    - 每個角色一個代理程式 (綁定)。
    - 綁定至這些代理程式的 Slack 通道。
    - 視需要透過 Chrome MCP 或節點使用本機瀏覽器。

    文件：[多代理程式路由](/zh-Hant/concepts/multi-agent)、[Slack](/zh-Hant/channels/slack)、
    [瀏覽器](/zh-Hant/tools/browser)、[節點](/zh-Hant/nodes)。

  </Accordion>
</AccordionGroup>

## 模型、故障轉移和驗證設定檔

模型 Q&A — 預設值、選擇、別名、切換、容錯移轉、驗證設定檔 —
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
    因為「running」是 **監督程式**（supervisor）的視角（launchd/systemd/schtasks）。連線探測則是指 CLI 實際連線到 gateway WebSocket。

    請使用 `openclaw gateway status` 並檢查這幾行資訊：

    - `Probe target:`（探測實際使用的 URL）
    - `Listening:`（該連接埠上實際綁定的項目）
    - `Last gateway error:`（常見根本原因：程序運作中但連接埠未監聽）

  </Accordion>

  <Accordion title='為什麼 openclaw gateway status 顯示的「Config (cli)」與「Config (service)」不同？'>
    您正在編輯某個設定檔，但服務運行的是另一個（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    解決方法：

    ```bash
    openclaw gateway install --force
    ```

    請從您希望服務使用的相同 `--profile` / 環境執行上述指令。

  </Accordion>

  <Accordion title='「another gateway instance is already listening」是什麼意思？'>
    OpenClaw 透過在啟動時立即綁定 WebSocket 監聽器來強制執行執行時鎖定（預設為 `ws://127.0.0.1:18789`）。如果綁定失敗並傳回 `EADDRINUSE`，它會拋出 `GatewayLockError`，表示已有另一個實例正在監聽。

    解決方法：停止另一個實例、釋放該連接埠，或使用 `openclaw gateway --port <port>` 執行。

  </Accordion>

  <Accordion title="如何在遠端模式下執行 OpenClaw（用戶端連接到其他地方的 Gateway）？">
    設定 `gateway.mode: "remote"` 並指向一個遠端 WebSocket URL，可選擇搭配共享密鑰的遠端認證資訊：

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

    - `openclaw gateway` 僅在 `gateway.mode` 為 `local` 時才會啟動（或是您傳入了覆寫旗標）。
    - macOS 應用程式會監看設定檔，並在這些數值變更時即時切換模式。
    - `gateway.remote.token` / `.password` 僅是用戶端的遠端認證資訊；它們本身並不會啟用本機 gateway 的認證。

  </Accordion>

  <Accordion title='Control UI 顯示「未授權」（或持續重新連線）。現在該怎麼辦？'>
    您的 gateway 驗證路徑與 UI 的驗證方法不符。

    事實（來自程式碼）：

    - Control UI 會將 token 保存在 `sessionStorage` 中，僅供當前瀏覽器分頁階段和選定的 gateway URL 使用，因此同一分頁的重新整理可以持續運作，無需還原長期 localStorage 的 token 持久性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，當 gateway 傳回重試提示（`canRetryWithDeviceToken=true`、`recommendedNextStep=retry_with_device_token`）時，受信任的用戶端可以嘗試使用快取的裝置 token 進行一次有界的重試。
    - 該快取 token 的重試現在會重複使用與裝置 token 一起儲存的已核准範圍。明確的 `deviceToken` / 明確的 `scopes` 呼叫端仍然保留其要求的範圍集，而不是繼承快取的範圍。
    - 在該重試路徑之外，連線驗證的優先順序是：明確的共用 token/密碼優先，然後是明確的 `deviceToken`，然後是儲存的裝置 token，最後是 bootstrap token。
    - 內建的設定碼 bootstrap 僅限於節點。核准後，它會傳回具有 `scopes: []` 的節點裝置 token，且不會傳回移交的操作員 token。

    修復方法：

    - 最快：`openclaw dashboard`（會列印並複製儀表板 URL，嘗試開啟；如果是無介面模式則顯示 SSH 提示）。
    - 如果您還沒有 token：`openclaw doctor --generate-gateway-token`。
    - 如果是遠端：先建立通道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`。
    - 共用金鑰模式：設定 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然後在 Control UI 設定中貼上相符的秘密金鑰。
    - Tailscale Serve 模式：請確保已啟用 `gateway.auth.allowTailscale`，並且您正在開啟 Serve URL，而不是繞過 Tailscale 身分標頭的原始 loopback/tailnet URL。
    - 受信任代理模式：請確保您是透過設定的身分識別感知代理連線，而不是原始的 gateway URL。同主機 loopback 代理也需要 `gateway.auth.trustedProxy.allowLoopback = true`。
    - 如果在一次重試後不匹配仍然存在，請輪替/重新核准配對的裝置 token：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 如果該輪替呼叫表示被拒絕，請檢查兩件事：
      - 配對裝置階段只能輪替其**自己的**裝置，除非它們也有 `operator.admin`
      - 明確的 `--scope` 值不能超過呼叫端當前的操作員範圍
    - 仍然卡住？執行 `openclaw status --all` 並依照 [疑難排解](/zh-Hant/gateway/troubleshooting) 操作。請參閱 [儀表板](/zh-Hant/web/dashboard) 以瞭解驗證詳細資訊。

  </Accordion>

  <Accordion title="我設定了 gateway.bind tailnet 但它無法綁定且沒有東西在監聽">
    `tailnet` bind 會從您的網路介面卡中選擇一個 Tailscale IP (100.64.0.0/10)。如果機器不在 Tailscale 上（或介面已關閉），就無可綁定之物。

    解決方法：

    - 在該主機上啟動 Tailscale（使其擁有 100.x 位址），或
    - 切換至 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是明確指定的。`auto` 偏好 loopback；當您想要僅限 tailnet 的綁定時，請使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="我可以在同一台主機上執行多個 Gateway 嗎？">
    通常不行——一個 Gateway 可以執行多個訊息通道和代理程式。僅在您需要冗餘（例如：救援機器人）或強烈隔離時，才使用多個 Gateway。

    可以，但您必須隔離：

    - `OPENCLAW_CONFIG_PATH` （每個執行個體的設定）
    - `OPENCLAW_STATE_DIR` （每個執行個體的狀態）
    - `agents.defaults.workspace` （工作區隔離）
    - `gateway.port` （唯一埠號）

    快速設定（推薦）：

    - 每個執行個體使用 `openclaw --profile <name> ...` （會自動建立 `~/.openclaw-<name>`）。
    - 在每個設定檔中設定唯一的 `gateway.port` （或在手動執行時傳遞 `--port`）。
    - 安裝個別設定檔的服務：`openclaw --profile <name> gateway install`。

    設定檔也會為服務名稱加上後綴（`ai.openclaw.<profile>`；舊版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
    完整指南：[Multiple gateways](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='「invalid handshake」/ code 1008 是什麼意思？'>
    Gateway 是一個 **WebSocket 伺服器**，它期望第一則訊息是
    `connect` 格式。如果收到其他任何內容，它會關閉連線
    並傳回 **code 1008** (policy violation)。

    常見原因：

    - 您在瀏覽器中開啟了 **HTTP** 網址 (`http://...`) 而非使用 WS 客戶端。
    - 您使用了錯誤的連接埠或路徑。
    - 代理伺服器或通道移除了驗證標頭，或傳送了非 Gateway 的請求。

    快速解決方法：

    1. 使用 WS 網址：`ws://<host>:18789` (如果是 HTTPS 則使用 `wss://...`)。
    2. 不要在一般瀏覽器分頁中開啟 WS 連接埠。
    3. 如果啟用了驗證，請在 `connect` 訊息框中包含 token/password。

    如果您使用的是 CLI 或 TUI，網址應如下所示：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    協定詳細資訊：[Gateway protocol](/zh-Hant/gateway/protocol)。

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

    服務/監督者日誌（當 gateway 透過 launchd/systemd 執行時）：

    - macOS launchd stdout：`~/Library/Logs/openclaw/gateway.log` （profiles 使用 `gateway-<profile>.log`；stderr 已被隱藏）
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

    如果您手動執行 gateway，`openclaw gateway --force` 可以回收連接埠。參閱 [Gateway](/zh-Hant/gateway)。

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

    如果您手動執行它 (無服務)，請使用：

    ```powershell
    openclaw gateway run
    ```

    文件：[Windows (WSL2)](/zh-Hant/platforms/windows), [Gateway service runbook](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="Gateway 已啟動但回應從未到達。我該檢查什麼？">
    先從快速健康檢查開始：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常見原因：

    - 模型驗證未載入到 **gateway host** 上 (檢查 `models status`)。
    - 頻道配對/允許清單封鎖了回應 (檢查頻道設定 + 記錄)。
    - WebChat/Dashboard 在沒有正確權杖的情況下開啟。

    如果您是在遠端，請確認 tunnel/Tailscale 連線已啟動，且
    Gateway WebSocket 可連線。

    文件：[Channels](/zh-Hant/channels), [Troubleshooting](/zh-Hant/gateway/troubleshooting), [Remote access](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title='"與 gateway 中斷連線：無原因」- 該怎麼辦？'>
    這通常表示 UI 失去了 WebSocket 連線。檢查：

    1. Gateway 是否正在執行？ `openclaw gateway status`
    2. Gateway 是否健康？ `openclaw status`
    3. UI 是否有正確的權杖？ `openclaw dashboard`
    4. 如果是遠端，tunnel/Tailscale 連線是否已啟動？

    然後查看記錄：

    ```bash
    openclaw logs --follow
    ```

    文件：[Dashboard](/zh-Hant/web/dashboard), [Remote access](/zh-Hant/gateway/remote), [Troubleshooting](/zh-Hant/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失敗。我應該檢查什麼？">
    從日誌和頻道狀態開始：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然後比對錯誤訊息：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 選單的項目太多。OpenClaw 已經修剪至 Telegram 的限制並嘗試以較少的指令重試，但仍需捨棄部分選單項目。請減少外掛程式/技能/自訂指令，或者如果您不需要選單，請停用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或類似的網路錯誤：如果您在 VPS 或代理伺服器後面，請確認允許傳出 HTTPS 且 DNS 對 `api.telegram.org` 正常運作。

    如果 Gateway 是遠端的，請確保您正在查看 Gateway 主機上的日誌。

    文件：[Telegram](/zh-Hant/channels/telegram)、[頻道疑難排解](/zh-Hant/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 顯示沒有輸出。我應該檢查什麼？">
    首先確認 Gateway 可以連線且代理程式可以執行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 查看目前狀態。如果您預期在聊天頻道收到回覆，請確保已啟用傳送功能 (`/deliver on`)。

    文件：[TUI](/zh-Hant/web/tui)、[斜線指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="我如何完全停止然後啟動 Gateway？">
    如果您安裝了服務：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    這會停止/啟動 **受監控的服務** (macOS 上的 launchd，Linux 上的 systemd)。
    當 Gateway 作為常駐程式在背景執行時，請使用此方法。

    如果您在前台執行，請使用 Ctrl-C 停止，然後執行：

    ```bash
    openclaw gateway run
    ```

    文件：[Gateway 服務手冊](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`：重新啟動 **背景服務** (launchd/systemd)。
    - `openclaw gateway`：在前景執行 gateway，僅用於此終端機階段。

    如果您已安裝該服務，請使用 gateway 指令。當您想要單次、前景執行時，請使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    使用 `--verbose` 啟動 Gateway 以獲得更多主控台細節。然後檢查記錄檔中的通道授權、模型路由和 RPC 錯誤。
  </Accordion>
</AccordionGroup>

## 媒體與附件

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    Agent 的輸出附件必須包含一行 `MEDIA:<path-or-url>` (獨自一行)。請參閱 [OpenClaw assistant setup](/zh-Hant/start/openclaw) 和 [Agent send](/zh-Hant/tools/agent-send)。

    CLI 傳送方式：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    同時也請檢查：

    - 目標通道支援輸出媒體，且未被允許清單阻擋。
    - 檔案大小在提供者的限制內 (圖片會調整大小至最大 2048px)。
    - `tools.fs.workspaceOnly=true` 將本地路徑的傳送限制在工作區、temp/media-store 和沙盒驗證的檔案內。
    - `tools.fs.workspaceOnly=false` 允許 `MEDIA:` 傳送 agent 已可讀取的主機本地檔案，但僅限於媒體和安全的文件類型 (圖片、音訊、影片、PDF 和 Office 文件)。純文字和類似機密的檔案仍會被阻擋。

    請參閱 [Images](/zh-Hant/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全與存取控制

<AccordionGroup>
  <Accordion title="讓 OpenClaw 接收傳入的私人訊息安全嗎？">
    請將傳入的私人訊息視為不受信任的輸入。預設值旨在降低風險：

    - 支援私人訊息的頻道，其預設行為是 **配對**：
      - 未知的發送者會收到一個配對碼；機器人不會處理他們的訊息。
      - 使用以下指令核准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 每個頻道的待處理請求上限為 **3 個**；如果未收到代碼，請檢查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公開開放私人訊息需要明確選擇加入（`dmPolicy: "open"` 和允許清單 `"*"`）。

    執行 `openclaw doctor` 以顯示具風險的私人訊息策略。

  </Accordion>

  <Accordion title="提示詞注入僅是公開機器人需要關注的問題嗎？">
    不是。提示詞注入是關於 **不受信任的內容**，而不僅僅是誰可以發私人訊息給機器人。
    如果您的助理讀取外部內容（網頁搜尋/擷取、瀏覽器頁面、電子郵件、
    文件、附件、貼上的日誌），該內容可能包含試圖
    劫持模型的指令。即使 **您是唯一的發送者**，這也可能發生。

    最大的風險在於啟用工具時：模型可能被誘騙
    外洩上下文或代表您呼叫工具。透過以下方式減少影響範圍：

    - 使用唯讀或停用工具的「讀取器」代理程式來摘要不受信任的內容
    - 針對啟用工具的代理程式，保持 `web_search` / `web_fetch` / `browser` 關閉
    - 將解碼後的檔案/文件文字也視為不受信任：OpenResponses
      `input_file` 和媒體附件提取都會將提取的文字包裝在
      明確的外部內容邊界標記中，而不是直接傳遞原始檔案文字
    - 沙盒機制和嚴格的工具允許清單

    詳情：[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="因為 OpenClaw 使用的是 TypeScript/Node 而非 Rust/WASM，所以它比較不安全嗎？">
    語言和執行環境固然重要，但它們並非個人代理的主要風險。OpenClaw 實際上的風險在於 Gateway 暴露、誰能傳訊息給機器人、提示詞注入、工具範圍、憑證處理、瀏覽器存取權、執行權限，以及對第三方技能或外掛的信任度。

    Rust 和 WASM 可以為某些類別的程式碼提供更強的隔離，但它們無法解決提示詞注入、糟糕的白名單、Gateway 公開暴露、過於寬鬆的工具權限，或是已登入敏感帳號的瀏覽器設定檔。應將以下視為主要的管控手段：

    - 將 Gateway 保持為私人或經過驗證
    - 對私訊和群組使用配對與白名單
    - 對不受信任的輸入拒絕或沙箱化風險工具
    - 僅安裝受信任的外掛與技能
    - 在變更設定後執行 `openclaw security audit --deep`

    詳細資訊：[Security](/zh-Hant/gateway/security)、[Sandboxing](/zh-Hant/gateway/sandboxing)。

  </Accordion>

  <Accordion title="我看到關於 OpenClaw 實例暴露的報告。我應該檢查什麼？">
    首先請檢查您的實際部署環境：

    ```bash
    openclaw security audit --deep
    openclaw gateway status
    ```

    更安全的基準是：

    - Gateway 繫結至 `loopback`，或僅透過驗證過的私人存取（例如 tailnet、SSH tunnel、Token/密碼驗證，或正確設定的受信任 Proxy）來暴露
    - 私訊處於 `pairing` 或 `allowlist` 模式
    - 群組已加入白名單並限制提及（mention-gated），除非每個成員都受信任
    - 高風險工具（`exec`、`browser`、`gateway`、`cron`）對於讀取不受信任內容的代理應予以拒絕或嚴格限制範圍
    - 在工具執行需要較小爆炸範圍時啟用沙箱

    公開繫結且無驗證、擁有工具權限的開放私訊/群組，以及暴露的瀏覽器控制權是優先修復的項目。詳細資訊：
    [Security audit checklist](/zh-Hant/gateway/security#security-audit-checklist)。

  </Accordion>

  <Accordion title="安裝 ClawHub 技能和第三方外掛安全嗎？">
    應將第三方技能和外掛視為您選擇信任的程式碼。
    ClawHub 技能頁面會在安裝前顯示掃描狀態，而 OpenClaw 外掛
    安裝/更新流程會執行內建的危險程式碼檢查，但掃描並非
    完整的安全邊界。

    更安全的模式：

    - 優先選擇可信任的作者和固定版本
    - 在啟用技能或外掛前先閱讀其內容
    - 將外掛和技能的允許清單限制在最小範圍
    - 在沙盒中搭配最少的工具來執行未受信任輸入的工作流程
    - 避免給予第三方程式碼對檔案系統、執行、瀏覽器或機密資訊的廣泛存取權

    詳情：[技能](/zh-Hant/tools/skills)、[外掛](/zh-Hant/tools/plugin)、
    [安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="我的機器人是否應該有自己的電子郵件、GitHub 帳號或電話號碼？">
    是的，對於大多數設定而言。使用獨立的帳號和電話號碼將機器人隔離
    可以在發生問題時降低影響範圍。這也能讓您更容易輪替
    憑證或撤銷存取權，而不會影響您的個人帳號。

    從小處著手。僅給予您實際需要的工具和帳號存取權，必要時再
    擴大範圍。

    文件：[安全性](/zh-Hant/gateway/security)、[配對](/zh-Hant/channels/pairing)。

  </Accordion>

  <Accordion title="我可以讓它全權處理我的簡訊嗎？這樣安全嗎？">
    我們**不**建議讓其擁有對您個人訊息的完全自主權。最安全的模式是：

    - 將直接訊息 (DM) 保持在**配對模式**或嚴格的允許清單中。
    - 如果您希望它代表您發送訊息，請使用**獨立的號碼或帳號**。
    - 讓它擬稿，然後在**發送前進行核准**。

    如果您想要進行實驗，請在專用帳號上進行並保持隔離。請參閱
    [安全性](/zh-Hant/gateway/security)。

  </Accordion>

<Accordion title="我可以在個人助理任務中使用較便宜的模型嗎？">可以，**如果**該代理僅用於聊天且輸入內容是可信的。較低階層的模型更容易遭受指令劫持，因此請避免將其用於啟用了工具的代理，或在讀取不可信內容時使用。如果您必須使用較小的模型，請鎖定工具並在沙盒中運行。請參閱 [安全性](/zh-Hant/gateway/security)。</Accordion>

  <Accordion title="我在 Telegram 執行了 /start 但沒有收到配對碼">
    配對碼**僅**在未知發送者向機器人發送訊息且
    `dmPolicy: "pairing"` 已啟用時發送。單獨使用 `/start` 不會產生代碼。

    檢查待處理請求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您希望立即存取，請將您的發送者 ID 加入允許列表或為該帳戶設定 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它會傳訊息給我的聯絡人嗎？配對是如何運作的？">
    不會。預設的 WhatsApp 私訊原則是 **pairing**（配對）。未知發送者只會收到配對碼，其訊息**不會被處理**。OpenClaw 只會回覆它收到的聊天，或您觸發的明確傳送。

    使用以下方式批准配對：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待處理請求：

    ```bash
    openclaw pairing list whatsapp
    ```

    精靈電話號碼提示：它用於設定您的 **allowlist/owner**，以便允許您自己的私訊。它不用於自動傳送。如果您在個人 WhatsApp 號碼上運行，請使用該號碼並啟用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天指令、中止任務，以及「它無法停止」

<AccordionGroup>
  <Accordion title="如何停止內部系統訊息顯示在聊天中？">
    大多數內部或工具訊息僅在針對該工作階段啟用 **verbose**、**trace** 或 **reasoning** 時
    才會顯示。

    在您看到訊息的聊天中修正：

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    如果仍然顯示過多資訊，請檢查控制 UI 中的工作階段設定，並將 verbose
    設定為 **inherit**。同時請確認您在設定中未使用將 `verboseDefault` 設定
    為 `on` 的 bot 檔案。

    文件：[Thinking and verbose](/zh-Hant/tools/thinking)、[Security](/zh-Hant/gateway/security/index#reasoning-and-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在執行的任務？">
    傳送以下任一訊息**作為獨立訊息**（無斜線）：

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

    大多數指令必須作為以 `/` 開頭的**獨立**訊息傳送，但部分捷徑（例如 `/status`）對於允許清單中的傳送者也可在行內使用。

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

  <Accordion title='為什麼機器人看起來會「忽略」連續發送的訊息？'>
    執行中途的提示預設會導向到目前執行的任務中。使用 `/queue` 來選擇目前執行任務的行為模式：

    - `steer` - 在下一個模型邊界引導目前執行的任務
    - `followup` - 將訊息排入佇列，在目前任務結束後逐一執行
    - `collect` - 將相容訊息排入佇列，在目前任務結束後回覆一次
    - `interrupt` - 中止目前任務並重新開始

    預設模式為 `steer`。您可以為佇列模式新增諸如 `debounce:0.5s cap:25 drop:summarize` 等選項。請參閱 [Command queue](/zh-Hant/concepts/queue) 與 [Steering queue](/zh-Hant/concepts/queue-steering)。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title="使用 API 金鑰時，Anthropic 的預設模型是什麼？">
    在 OpenClaw 中，憑證與模型選擇是分開的。設定 `ANTHROPIC_API_KEY`（或在設定檔中儲存 Anthropic API 金鑰）可啟用驗證，但實際的預設模型是您在 `agents.defaults.model.primary` 中設定的任何模型（例如 `anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，這表示 Gateway 無法在正在執行的代理程式預期的 `auth-profiles.json`
    中找到 Anthropic 憑證。
  </Accordion>
</AccordionGroup>

---

還是有問題？請在 [Discord](https://discord.com/invite/clawd) 提問或開啟 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。

## 相關內容

- [First-run FAQ](/zh-Hant/help/faq-first-run) — 安裝、入門、驗證、訂閱、早期故障排除
- [Models FAQ](/zh-Hant/help/faq-models) — 模型選擇、故障轉移、驗證設定檔
- [Troubleshooting](/zh-Hant/help/troubleshooting) — 症狀優先的檢診
