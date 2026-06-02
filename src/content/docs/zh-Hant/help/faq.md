---
summary: "關於 OpenClaw 設定、設定檔和使用的常見問題"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常見問題"
---

針對真實環境設定（本地開發、VPS、多代理、OAuth/API 金鑰、模型容錯移轉）提供快速解答及更深入的故障排除。如需執行時期診斷，請參閱 [故障排除](/zh-Hant/gateway/troubleshooting)。如需完整的設定參考，請參閱 [組態設定](/zh-Hant/gateway/configuration)。

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

   執行即時閘道健康檢查，包括支援時的通道探測
   （需要可連線的閘道）。請參閱 [健康狀態](/zh-Hant/gateway/health)。

5. **追蹤最新記錄**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 停機，則回退至：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   檔案日誌與服務日誌是分開的；請參閱 [日誌記錄](/zh-Hant/logging) 與 [故障排除](/zh-Hant/gateway/troubleshooting)。

6. **執行醫生程式（修復）**

   ```bash
   openclaw doctor
   ```

   修復/遷移設定/狀態並執行健康檢查。請參閱 [醫生](/zh-Hant/gateway/doctor)。

7. **閘道器快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向執行中的閘道請求完整快照（僅限 WS）。請參閱 [健康狀態](/zh-Hant/gateway/health)。

## 快速開始與首次執行設定

首次執行常見問題 — 安裝、入門、驗證路由、訂閱、初始失敗 —
位於 [首次執行常見問題](/zh-Hant/help/faq-first-run)。

## 什麼是 OpenClaw？

<AccordionGroup>
  <Accordion title="用一段話介紹什麼是 OpenClaw？">
    OpenClaw 是您在自己的裝置上執行的個人 AI 助理。它會在您已使用的訊息介面上回覆（WhatsApp、Telegram、Slack、Mattermost、Discord、Google Chat、Signal、iMessage、WebChat，以及內建的通道外掛程式，如 QQ Bot），並且在支援的平台上也能進行語音互動 + 即時 Canvas。**閘道**是永遠在線的控制平面；而助理才是產品本身。
  </Accordion>

  <Accordion title="價值主張">
    OpenClaw 不僅僅是「Claude 的封裝殼」。它是一個 **本地優先的控制平面**，讓您在
    **您自己的硬體** 上執行功能強大的助理，並透過您已經使用的聊天應用程式連線，擁有
    有狀態的工作階段、記憶和工具 — 無需將您的工作流程控制權交給託管的
    SaaS。

    重點功能：

    - **您的裝置，您的資料：** 在您想要的地方執行閘道（Mac、Linux、VPS）並將
      工作區 + 工作階段歷史保留在本地。
    - **真實通道，而非網頁沙箱：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/等等，
      加上支援平台上的行動語音和 Canvas。
    - **模型無關：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，具備每個代理的路由
      和容錯移轉功能。
    - **僅限本地選項：** 執行本地模型，因此如果您願意，**所有資料都可以保留在您的裝置上**。
    - **多代理路由：** 依照通道、帳戶或任務區分代理，每個都有自己的
      工作區和預設值。
    - **開放原始碼且可駭客：** 檢視、擴充和自我託管，沒有廠商鎖定。

    文件：[閘道](/zh-Hant/gateway)、[通道](/zh-Hant/channels)、[多代理](/zh-Hant/concepts/multi-agent)、
    [記憶](/zh-Hant/concepts/memory)。

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
    在**研究、資格審核和草擬**方面是可以的。它可以掃描網站、建立候選名單、
    總結潛在客戶，並撰寫外聯或廣告文案草稿。

    對於**外聯或廣告投放**，請保持人機協作。避免垃圾訊息，遵守當地法律和
    平台政策，並在發送前審查所有內容。最安全的模式是讓
    OpenClaw 草擬，然後由您批准。

    文件：[Security](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="相比 Claude Code，OpenClaw 在網頁開發方面有哪些優勢？">
    OpenClaw 是一個**個人助理**和協調層，而非 IDE 的替代品。使用
    Claude Code 或 Codex 以在程式庫內獲得最快的直接編碼迴圈。當您
    需要持久記憶、跨裝置存取和工具協調時，請使用 OpenClaw。

    優勢：

    - 跨會話的**持久記憶 + 工作區**
    - **多平台存取**（WhatsApp、Telegram、TUI、WebChat）
    - **工具協調**（瀏覽器、檔案、排程、掛鉤）
    - **永遠在線的閘道**（在 VPS 上運行，從任何地方互動）
    - 用於本地瀏覽器/螢幕/相機/執行的**節點**

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

    - **Cron jobs**：隔離的作業可以為每個作業設定 `model` 覆蓋。
    - **Sub-agents**：將任務路由到具有不同預設模型的獨立代理程式。
    - **隨時切換**：使用 `/model` 隨時切換目前會話的模型。

    請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent) 和 [Slash commands](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="機器人在執行繁重工作時會凍結。我該如何卸載該工作？">
    將 **子代理** 用於長時間或並行任務。子代理在各自的會話中運行，
    返回摘要，並讓您的主聊天保持響應。

    請您的機器人「為此任務生成一個子代理」或使用 `/subagents`。
    在聊天中使用 `/status` 以查看網關目前正在做什麼（以及它是否忙碌）。

    Token 提示：長時間任務和子代理都會消耗 tokens。如果關心成本，請透過
    `agents.defaults.subagents.model` 為子代理設定更便宜的模型。

    文件：[子代理](/zh-Hant/tools/subagents)、[背景任務](/zh-Hant/automation/tasks)。

  </Accordion>

  <Accordion title="Discord 上的執行緒綁定子代理會話是如何運作的？">
    使用執行緒綁定。您可以將 Discord 執行緒綁定到子代理或會話目標，以便該執行緒中的後續訊息保持在綁定的會話上。

    基本流程：

    - 使用 `thread: true` 透過 `sessions_spawn` 生成（並可選擇使用 `mode: "session"` 進行持續後續跟進）。
    - 或使用 `/focus <target>` 手動綁定。
    - 使用 `/agents` 檢查綁定狀態。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自動取消聚焦。
    - 使用 `/unfocus` 分離執行緒。

    必要配置：

    - 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆寫：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 生成時自動綁定：`channels.discord.threadBindings.spawnSessions` 預設為 `true`；將其設定為 `false` 以停用執行緒綁定的會話生成。

    文件：[子代理](/zh-Hant/tools/subagents)、[Discord](/zh-Hant/channels/discord)、[配置參考](/zh-Hant/gateway/configuration-reference)、[斜線指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="子代理完成了，但完成更新去了錯誤的地方或從未發布。我應該檢查什麼？">
    首先檢查已解析的請求者路由：

    - 完成模式的子代理傳送偏好任何綁定的執行緒或對話路由（如果存在的話）。
    - 如果完成來源僅包含頻道，OpenClaw 會回退到請求者會話的儲存路由（`lastChannel` / `lastTo` / `lastAccountId`），以便直接傳送仍能成功。
    - 如果既沒有綁定的路由也沒有可用的儲存路由，直接傳送可能會失敗，結果會回退到佇列會話傳送，而不是立即發布到聊天。
    - 無效或過時的目標仍可能強制回退到佇列或最終傳送失敗。
    - 如果子項最後可見的助手回覆完全是靜默令牌 `NO_REPLY` / `no_reply`，或是完全 `ANNOUNCE_SKIP`，OpenClaw 會刻意隱藏公告，而不是發布過時的早期進度。
    - 工具/toolResult 輸出不會被提升到子項結果文字中；結果是子項最新的可見助手回覆。

    除錯：

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[子代理](/zh-Hant/tools/subagents)、[背景工作](/zh-Hant/automation/tasks)、[會話工具](/zh-Hant/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒未觸發。我應該檢查什麼？">
    Cron 在 Gateway 程序內執行。如果 Gateway 未持續執行，
    排程的工作將不會執行。

    檢查清單：

    - 確認 cron 已啟用（`cron.enabled`）且未設定 `OPENCLAW_SKIP_CRON`。
    - 檢查 Gateway 是否 24/7 執行（無休眠/重啟）。
    - 驗證工作的時區設定（`--tz` 與主機時區的差異）。

    除錯：

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文件：[Cron 工作](/zh-Hant/automation/cron-jobs)、[自動化](/zh-Hant/automation)。

  </Accordion>

  <Accordion title="Cron 已觸發，但沒有向頻道發送任何內容。為什麼？">
    請先檢查傳遞模式：

    - `--no-deliver` / `delivery.mode: "none"` 表示不預期執行器回退發送。
    - 遺失或無效的公告目標 (`channel` / `to`) 表示執行器跳過了出站傳遞。
    - 頻道驗證失敗 (`unauthorized`, `Forbidden`) 表示執行器嘗試傳遞但憑證阻擋了它。
    - 靜默隔離結果 (`NO_REPLY` / `no_reply` 僅) 被視為故意不可傳遞，因此執行器也會抑制排隊的回退傳遞。

    對於隔離的 cron 作業，當有聊天路由可用時，代理程式仍然可以使用 `message`
    工具直接發送。`--announce` 僅控制代理程式尚未發送的最終文字的執行器回退路徑。

    除錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs), [Background Tasks](/zh-Hant/automation/tasks)。

  </Accordion>

  <Accordion title="為什麼隔離的 cron 執行會切換模型或重試一次？">
    這通常是即時模型切換路徑，而不是重複排程。

    隔離的 cron 可以在當前執行拋出 `LiveSessionModelSwitchError` 時持續執行時期模型移交並重試。重試會保留切換後的提供者/模型，且如果切換帶有新的驗證設定檔覆寫，cron 會在重試前將其持久化。

    相關選擇規則：

    - Gmail hook 模型覆寫在適用時優先。
    - 然後是各作業的 `model`。
    - 然後是任何儲存的 cron-session 模型覆寫。
    - 然後是正常的代理程式/預設模型選擇。

    重試迴圈是有界限的。在初始嘗試加上 2 次切換重試後，cron 會中止而不是無限迴圈。

    除錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs), [cron CLI](/zh-Hant/cli/cron)。

  </Accordion>

  <Accordion title="How do I install skills on Linux?">
    使用原生的 `openclaw skills` 指令或將技能放入您的工作區。macOS 技能 UI 在 Linux 上無法使用。
    瀏覽技能請前往 [https://clawhub.ai](https://clawhub.ai)。

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

    原生 `openclaw skills install` 預設會寫入至現用工作區 `skills/`
    目錄。新增 `--global` 以安裝至所有本機代理程式的共享管理
    技能目錄。僅在您想要發佈或同步您自己的技能時，才安裝獨立的 `clawhub` CLI。
    如果您想要限制
    哪些代理程式可以看到共享技能，請使用
    `agents.defaults.skills` 或 `agents.list[].skills`。

  </Accordion>

  <Accordion title="Can OpenClaw run tasks on a schedule or continuously in the background?">
    是的。使用 Gateway 排程器：

    - **Cron jobs** 用於排定或循環任務（重啟後持續存在）。
    - **Heartbeat** 用於「主工作階段」的定期檢查。
    - **Isolated jobs** 用於發佈摘要或傳送至聊天的自主代理程式。

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Automation](/zh-Hant/automation)、
    [Heartbeat](/zh-Hant/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以從 Linux 執行 Apple macOS 專屬的技能嗎？">
    無法直接執行。macOS 技能受到 `metadata.openclaw.os` 以及必要執行檔的限制，而且只有在 **Gateway 主機** 上符合資格時，這些技能才會出現於系統提示詞中。在 Linux 上，`darwin` 專屬的技能（例如 `apple-notes`、`apple-reminders`、`things-mac`）除非您覆寫這些限制，否則將不會載入。

    您有三種支援的模式：

    **選項 A - 在 Mac 上執行 Gateway（最簡單）。**
    在存在 macOS 執行檔的地方執行 Gateway，然後從 Linux 以 [遠端模式](#gateway-ports-already-running-and-remote-mode) 或透過 Tailscale 進行連線。因為 Gateway 主機是 macOS，所以技能會正常載入。

    **選項 B - 使用 macOS 節點（無 SSH）。**
    在 Linux 上執行 Gateway，配對一個 macOS 節點（選單列應用程式），並在 Mac 上將 **Node Run Commands** 設定為「Always Ask」或「Always Allow」。當節點上存在必要的執行檔時，OpenClaw 可以將 macOS 專屬技能視為符合資格。代理程式會透過 `nodes` 工具來執行這些技能。如果您選擇「Always Ask」，在提示詞中核准「Always Allow」會將該指令新增到允許清單中。

    **選項 C - 透過 SSH 代理 macOS 執行檔（進階）。**
    將 Gateway 保留在 Linux 上，但讓必要的 CLI 執行檔解析為在 Mac 上執行的 SSH 包裝程式。然後覆寫技能以允許 Linux，使其保持符合資格。

    1. 為執行檔建立 SSH 包裝程式（範例：針對 Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 將包裝程式放置於 Linux 主機上的 `PATH`（例如 `~/bin/memo`）。
    3. 覆寫技能中繼資料（workspace 或 `~/.openclaw/skills`）以允許 Linux：

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. 啟動新的工作階段，以便重新整理技能快照。

  </Accordion>

  <Accordion title="您有 Notion 或 HeyGen 整合功能嗎？">
    目前尚未內建。

    選項如下：

    - **自訂技能 / 外掛：** 最適合可靠的 API 存取（Notion 和 HeyGen 都有 API）。
    - **瀏覽器自動化：** 無需編碼即可運作，但速度較慢且較不穩定。

    如果您想為每個客戶保留上下文（代理商工作流程），一個簡單的模式是：

    - 每個客戶一個 Notion 頁面（上下文 + 偏好設定 + 進行中的工作）。
    - 要求代理程式在工作階段開始時取得該頁面。

    如果您想要原生整合，請開啟功能請求或建構一個針對這些 API 的技能。

    安裝技能：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安裝會放置在啟用的工作區 `skills/` 目錄中。若要在所有本機代理程式之間共享技能，請使用 `openclaw skills install <slug> --global`（或手動將其放置在 `~/.openclaw/skills/<name>/SKILL.md` 中）。如果只有部分代理程式應該看到共享安裝，請設定 `agents.defaults.skills` 或 `agents.list[].skills`。某些技能期望透過 Homebrew 安裝二進位檔；在 Linux 上這意味著使用 Linuxbrew（請參閱上方的 Homebrew Linux FAQ 條目）。請參閱 [技能](/zh-Hant/tools/skills)、[技能設定](/zh-Hant/tools/skills-config) 和 [ClawHub](/zh-Hant/tools/clawhub)。

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
  <Accordion title="是否有專屬的沙盒文件？">
    是的。請參閱 [沙盒隔離](/zh-Hant/gateway/sandboxing)。關於 Docker 專屬設定（Docker 中的完整閘道或沙盒映像檔），請參閱 [Docker](/zh-Hant/install/docker)。
  </Accordion>

  <Accordion title="Docker 感覺受限 - 如何啟用完整功能？">
    預設映像檔以安全為先，並以 `node` 使用者身分執行，因此它不包含系統套件、Homebrew 或內建瀏覽器。若要進行更完整的設定：

    - 使用 `OPENCLAW_HOME_VOLUME` 持續化 `/home/node`，以保存快取。
    - 使用 `OPENCLAW_IMAGE_APT_PACKAGES` 將系統相依項目建構至映像檔中。
    - 透過內建 CLI 安裝 Playwright 瀏覽器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 設定 `PLAYWRIGHT_BROWSERS_PATH` 並確保該路徑已持續化。

    文件：[Docker](/zh-Hant/install/docker)、[瀏覽器](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="我可以讓私訊保持個人化，但讓群組公開/沙盒化並由一個代理程式處理嗎？">
    可以 - 如果您的私人流量是 **私訊 (DMs)** 而公開流量是 **群組**。

    使用 `agents.defaults.sandbox.mode: "non-main"` 讓群組/頻道工作階段（非主要金鑰）在設定的沙盒後端中執行，而主要的私訊工作階段則保持在主機上。如果您未選擇後端，Docker 是預設後端。然後透過 `tools.sandbox.tools` 限制沙盒工作階段中可用的工具。

    設定示範 + 範例設定：[群組：個人私訊 + 公開群組](/zh-Hant/channels/groups#pattern-personal-dms-public-groups-single-agent)

    關鍵設定參考：[Gateway configuration](/zh-Hant/gateway/config-agents#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="如何將主機資料夾綁定至沙箱？">
    設定 `agents.defaults.sandbox.docker.binds` 為 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全域與個別代理的綁定會合併；當 `scope: "shared"` 時，個別代理的綁定會被忽略。請使用 `:ro` 處理任何敏感內容，並記得綁定會繞過沙箱的檔案系統防護。

    OpenClaw 會根據正規化路徑以及透過最深的現有祖先解析出的規範路徑來驗證綁定來源。這意味著符號連結父項逃逸仍會失敗並保持封閉，即使最後一段路徑尚不存在，且允許根項檢查仍會在解析符號連結後套用。

    請參閱 [沙箱](/zh-Hant/gateway/sandboxing#custom-bind-mounts) 和 [沙箱 vs 工具原則 vs 提升權限](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) 以了解範例與注意事項。

  </Accordion>

  <Accordion title="記憶體如何運作？">
    OpenClaw 的記憶體只是代理工作區中的 Markdown 檔案：

    - 位於 `memory/YYYY-MM-DD.md` 中的每日筆記
    - 位於 `MEMORY.md` 中的策展長期筆記（僅限主要/私人工作階段）

    OpenClaw 也會執行 **靜默的預壓縮記憶體排清**，以提醒模型
    在自動壓縮之前撰寫持久筆記。這僅在工作區
    可寫入時執行（唯讀沙箱會跳過此步驟）。請參閱 [記憶體](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="記憶體一直忘記事情。如何讓它牢記？">
    要求機器人 **將事實寫入記憶體**。長期筆記應放在 `MEMORY.md`，
    短期內容則放入 `memory/YYYY-MM-DD.md`。

    這仍是我們正在改進的領域。提醒模型儲存記憶體會有幫助；
    它會知道該怎麼做。如果持續忘記，請驗證 Gateway 在每次執行時是否使用相同的工作區。

    文件：[記憶體](/zh-Hant/concepts/memory)、[代理工作區](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="記憶會永久保存嗎？有哪些限制？">
    記憶檔案儲存在磁碟上，並會持續保存直到您將其刪除。限制取決於您的儲存空間，
    而非模型。**會話上下文** 仍然受到模型上下文視窗的限制，因此長時間的對話可能會壓縮或截斷。這就是為什麼
    記憶搜尋存在的原因——它只將相關的部分拉回上下文中。

    文件：[Memory](/zh-Hant/concepts/memory), [Context](/zh-Hant/concepts/context)。

  </Accordion>

  <Accordion title="語意記憶搜尋需要 OpenAI API 金鑰嗎？">
    只有當您使用 **OpenAI embeddings** 時才需要。Codex OAuth 涵蓋了聊天/完成功能，
    但並**不**授予 embeddings 存取權限，因此 **透過 Codex 登入（OAuth 或
    Codex CLI 登入）** 對語意記憶搜尋沒有幫助。OpenAI embeddings
    仍然需要真正的 API 金鑰（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果您沒有明確設定提供者，OpenClaw 會使用 OpenAI embeddings。仍然顯示 `memorySearch.provider = "auto"` 的舊版設定
    也會解析為 OpenAI。
    如果沒有可用的 OpenAI API 金鑰，語意記憶搜尋將保持不可用狀態，
    直到您設定金鑰或明確選擇其他提供者為止。

    如果您希望保持本地化，請設定 `memorySearch.provider = "local"`（並選擇性地
    設定 `memorySearch.fallback = "none"`）。如果您想要 Gemini embeddings，請設定
    `memorySearch.provider = "gemini"` 並提供 `GEMINI_API_KEY`（或
    `memorySearch.remote.apiKey`）。我們支援 **OpenAI、OpenAI 相容、Gemini、
    Voyage、Mistral、Bedrock、Ollama、LM Studio、GitHub Copilot、DeepInfra 或本地端**
    embedding 模型——詳見 [Memory](/zh-Hant/concepts/memory) 了解設定細節。

  </Accordion>
</AccordionGroup>

## 檔案在磁碟上的位置

<AccordionGroup>
  <Accordion title="Is all data used with OpenClaw saved locally?">
    不 - **OpenClaw 的狀態是本地的**，但 **外部服務仍會看到您發送給它們的內容**。

    - **預設為本地：** 會話、記憶檔案、配置和工作區位於 Gateway 主機
      (`~/.openclaw` + 您的工作區目錄)。
    - **必要時遠端：** 您發送給模型提供商 (Anthropic/OpenAI/等) 的訊息會傳送至
      其 API，且聊天平台 (WhatsApp/Telegram/Slack/等) 會在其
      伺服器上儲存訊息資料。
    - **您控制範圍：** 使用本機模型可將提示保留在您的機器上，但頻道
      流量仍會經過該頻道的伺服器。

    相關：[Agent workspace](/zh-Hant/concepts/agent-workspace)、[Memory](/zh-Hant/concepts/memory)。

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

  <Accordion title="Where should AGENTS.md / SOUL.md / USER.md / MEMORY.md live?">
    這些檔案位於 **agent workspace** 中，而不是 `~/.openclaw`。

    - **Workspace (每個 agent)**：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md`、`memory/YYYY-MM-DD.md`、選用的 `HEARTBEAT.md`。
      小寫根目錄 `memory.md` 僅用於舊版修復輸入；當兩個檔案都存在時，`openclaw doctor --fix`
      可以將其合併到 `MEMORY.md` 中。
    - **State dir (`~/.openclaw`)**：配置、頻道/提供商狀態、認證設定檔、會話、日誌
      和共享技能 (`~/.openclaw/skills`)。

    預設工作區為 `~/.openclaw/workspace`，可透過以下方式配置：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果機器人在重新啟動後「忘記」了，請確認 Gateway 在每次啟動時都使用相同的工作區
    (並記住：遠端模式使用的是 **gateway 主機的**
    工作區，而不是您的本地筆記型電腦)。

    提示：如果您想要持久的行為或偏好設定，請要求機器人 **將其寫入
    AGENTS.md 或 MEMORY.md**，而不是依賴聊天記錄。

    參見 [Agent workspace](/zh-Hant/concepts/agent-workspace) 和 [Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="建議的備份策略">
    將您的 **agent workspace** 放在 **私有** git repo 中，並將其備份到某個私有位置（例如 GitHub 私有倉庫）。這會捕獲記憶體 + AGENTS/SOUL/USER 檔案，並讓您稍後能還原助手的「心智」。

    請 **勿** 將 `~/.openclaw` 下的任何內容提交（憑證、sessions、tokens 或加密的 secrets payloads）。
    如果您需要完全還原，請分別備份 workspace 和 state 目錄（請參閱上述遷移問題）。

    文件：[Agent workspace](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

<Accordion title="我該如何完全解除安裝 OpenClaw？">請參閱專屬指南：[Uninstall](/zh-Hant/install/uninstall)。</Accordion>

  <Accordion title="Agents 可以在 workspace 之外運作嗎？">
    可以。Workspace 是 **預設 cwd** 和記憶體錨點，並非嚴格的沙箱。
    相對路徑會在 workspace 內解析，但除非啟用沙箱功能，否則絕對路徑可以存取其他主機位置。如果您需要隔離，請使用
    [`agents.defaults.sandbox`](/zh-Hant/gateway/sandboxing) 或個別 agent 的沙箱設定。如果您
    希望 repo 成為預設工作目錄，請將該 agent 的
    `workspace` 指向 repo 根目錄。OpenClaw repo 只是原始碼；除非您有意讓 agent 在其中運作，否則請將 workspace 分開存放。

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

  </Accordion>

  <Accordion title="遠端模式：session store 在哪裡？">
    Session 狀態歸屬於 **gateway host**。如果您處於遠端模式，您關心的 session store 位於遠端機器上，而非您的本地筆記型電腦。請參閱 [Session management](/zh-Hant/concepts/session)。
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

  <Accordion title="如何啟用網頁搜尋（以及網頁擷取）？">
    `web_fetch` 不需要 API 金鑰即可運作。`web_search` 則取決於您選擇的
    供應商：

    - 需要支援 API 的供應商（如 Brave、Exa、Firecrawl、Gemini、Kimi、MiniMax Search、Perplexity 和 Tavily）需要進行其標準的 API 金鑰設定。
    - Grok 可以重用模型驗證中的 xAI OAuth，或是回退至 `XAI_API_KEY` / 外掛程式網頁搜尋設定。
    - Ollama 網頁搜尋不需要金鑰，但它使用您設定的 Ollama 主機並需要 `ollama signin`。
    - DuckDuckGo 不需要金鑰，但它是非官方的 HTML 整合。
    - SearXNG 無需金鑰/可自行託管；請設定 `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`。

    **建議：** 執行 `openclaw configure --section web` 並選擇一個供應商。
    環境變數替代方案：

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

    特定供應商的網頁搜尋設定現位於 `plugins.entries.<plugin>.config.webSearch.*` 下。
    舊版 `tools.web.search.*` 供應商路徑為了相容性仍會暫時載入，但不應用於新的設定。
    Firecrawl 網頁擷取回退設定位於 `plugins.entries.firecrawl.config.webFetch.*` 下。

    註記：

    - 如果您使用允許清單，請新增 `web_search`/`web_fetch`/`x_search` 或 `group:web`。
    - `web_fetch` 預設為啟用（除非明確停用）。
    - 如果省略 `tools.web.fetch.provider`，OpenClaw 會從可用的憑證中自動偵測第一個就緒的擷取回退供應商。目前內建的供應商是 Firecrawl。
    - Daemons 會從 `~/.openclaw/.env`（或服務環境）讀取環境變數。

    文件：[網頁工具](/zh-Hant/tools/web)。

  </Accordion>

  <Accordion title="config.apply 清除了我的設定。我該如何復原並避免這種情況？">
    `config.apply` 會取代**整個設定**。如果您發送部分物件，其他所有內容
    都會被移除。

    目前的 OpenClaw 可保護許多意外覆寫的風險：

    - OpenClaw 擁有的設定寫入會在寫入前驗證完整的變更後設定。
    - 無效或破壞性的 OpenClaw 擁有寫入會被拒絕並儲存為 `openclaw.json.rejected.*`。
    - 如果直接編輯導致啟動或熱重載失敗，Gateway 會以封閉式失敗或跳過重載；它不會重寫 `openclaw.json`。
    - `openclaw doctor --fix` 負責修復，並可以在將拒絕的檔案儲存為 `openclaw.json.clobbered.*` 的同時，還原最後已知良好的狀態。

    復原：

    - 檢查 `openclaw logs --follow` 是否有 `Invalid config at`、`Config write rejected:` 或 `config reload skipped (invalid config)`。
    - 在作用中設定旁邊檢查最新的 `openclaw.json.clobbered.*` 或 `openclaw.json.rejected.*`。
    - 執行 `openclaw config validate` 和 `openclaw doctor --fix`。
    - 使用 `openclaw config set` 或 `config.patch` 僅複製預定的金鑰回來。
    - 如果您沒有最後已知良好或被拒絕的資料，請從備份還原，或重新執行 `openclaw doctor` 並重新設定通道/模型。
    - 如果這是意料之外的情況，請提交錯誤報告並附上您最後的已知設定或任何備份。
    - 本地編碼代理通常可以從日誌或歷史記錄重建可運作的設定。

    避免發生：

    - 使用 `openclaw config set` 進行小幅變更。
    - 使用 `openclaw configure` 進行互動式編輯。
    - 當您不確確切路徑或欄位形狀時，請先使用 `config.schema.lookup`；它會傳回淺層架構節點以及用於深入探查的立即子摘要。
    - 使用 `config.patch` 進行部分 RPC 編輯；僅將 `config.apply` 用於完整設定取代。
    - 如果您在代理執行中使用代理面向的 `gateway` 工具，它仍會拒絕寫入 `tools.exec.ask` / `tools.exec.security`（包括正規化為相同受保護執行路徑的舊版 `tools.bash.*` 別名）。

    文件：[Config](/zh-Hant/cli/config)、[Configure](/zh-Hant/cli/configure)、[Gateway troubleshooting](/zh-Hant/gateway/troubleshooting#gateway-rejected-invalid-config)、[Doctor](/zh-Hant/gateway/doctor)。

  </Accordion>

  <Accordion title="我如何在不同設備上運行具有專用工作程式的中央 Gateway？">
    常見的模式是 **一個 Gateway**（例如 Raspberry Pi）加上 **節點** 和 **代理程式**：

    - **Gateway（中央）：** 擁有通道、路由和會話。
    - **Nodes（設備）：** Mac/iOS/Android 作為外設連接並公開本地工具（`system.run`, `canvas`, `camera`）。
    - **Agents（工作程式）：** 用於特殊角色的獨立大腦/工作區（例如 "Hetzner ops"、"Personal data"）。
    - **Sub-agents（子代理程式）：** 當您需要並行處理時，從主代理程式生成後台工作。
    - **TUI：** 連接到 Gateway 並切換代理程式/會話。

    文檔：[Nodes](/zh-Hant/nodes)、[Remote access](/zh-Hant/gateway/remote)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent)、[Sub-agents](/zh-Hant/tools/subagents)、[TUI](/zh-Hant/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 瀏覽器可以無頭模式運行嗎？">
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

    預設值為 `false`（有頭模式）。無頭模式在某些網站上更容易觸發反機器人檢查。請參閱 [Browser](/zh-Hant/tools/browser)。

    無頭模式使用**相同的 Chromium 引擎**，適用於大多數自動化操作（表單、點擊、抓取、登入）。主要區別在於：

    - 沒有可見的瀏覽器視窗（如果您需要視覺效果，請使用截圖）。
    - 某些網站對無頭模式下的自動化更嚴格（驗證碼、反機器人）。
      例如，X/Twitter 經常阻擋無頭會話。

  </Accordion>

  <Accordion title="我如何使用 Brave 進行瀏覽器控制？">
    將 `browser.executablePath` 設定為您的 Brave 執行檔（或任何基於 Chromium 的瀏覽器），然後重新啟動 Gateway。
    請參閱 [Browser](/zh-Hant/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置範例。
  </Accordion>
</AccordionGroup>

## 遠端 Gateway 和節點

<AccordionGroup>
  <Accordion title="指令如何在 Telegram、Gateway 和節點之間傳播？">
    Telegram 訊息由 **Gateway** 處理。Gateway 執行代理程式（Agent），並且僅在需要節點工具時透過 **Gateway WebSocket** 呼叫節點：

    Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

    節點看不到入站提供者流量；它們僅接收節點 RPC 呼叫。

  </Accordion>

  <Accordion title="如果 Gateway 託管在遠端，我的 Agent 如何存取我的電腦？">
    簡答：**將您的電腦配對為節點**。Gateway 在其他地方運行，但它可以通過 Gateway WebSocket 調用您本地機器上的 `node.*` 工具（螢幕、相機、系統）。

    典型設置：

    1. 在始終運行的主機（VPS/家庭伺服器）上運行 Gateway。
    2. 將 Gateway 主機和您的電腦置於同一個 tailnet。
    3. 確保 Gateway WS 可訪問（tailnet bind 或 SSH tunnel）。
    4. 在本地打開 macOS 應用程式並以 **Remote over SSH** 模式（或直接 tailnet）連接，以便註冊為節點。
    5. 在 Gateway 上批准該節點：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要單獨的 TCP 橋接；節點通過 Gateway WebSocket 連接。

    安全提醒：配對 macOS 節點允許該機器上的 `system.run`。僅配對您信任的設備，並查看 [安全性](/zh-Hant/gateway/security)。

    文檔：[節點](/zh-Hant/nodes)、[Gateway 協定](/zh-Hant/gateway/protocol)、[macOS 遠端模式](/zh-Hant/platforms/mac/remote)、[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已連接，但我沒有收到回覆。怎麼辦？">
    檢查基礎事項：

    - Gateway 正在運行：`openclaw gateway status`
    - Gateway 健康狀況：`openclaw status`
    - 頻道健康狀況：`openclaw channels status`

    然後驗證身份驗證和路由：

    - 如果您使用 Tailscale Serve，請確保 `gateway.auth.allowTailscale` 設置正確。
    - 如果您通過 SSH tunnel 連接，請確認本地 tunnel 已啟動並指向正確的端口。
    - 確認您的允許列表（DM 或群組）包含您的帳號。

    文檔：[Tailscale](/zh-Hant/gateway/tailscale)、[遠端存取](/zh-Hant/gateway/remote)、[頻道](/zh-Hant/channels)。

  </Accordion>

  <Accordion title="兩個 OpenClaw 實例可以互相通訊嗎（本機 + VPS）？">
    可以。雖然沒有內建的「bot-to-bot」橋接器，但您可以透過幾種可靠的方式來連接：

    **最簡單的方法：** 使用兩個機器人都可存取的正常聊天頻道（Telegram/Slack/WhatsApp）。
    讓機器人 A 發送訊息給機器人 B，然後讓機器人 B 像往常一樣回覆。

    **CLI 橋接器（通用）：** 執行一個腳本，使用
    `openclaw agent --message ... --deliver` 呼叫另一個 Gateway，
    目標設為另一個機器人正在監聽的聊天。如果其中一個機器人在遠端 VPS 上，請透過 SSH/Tailscale 將您的 CLI 指向該遠端 Gateway
    （請參閱 [遠端存取](/zh-Hant/gateway/remote)）。

    範例模式（從可以連線到目標 Gateway 的機器執行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：加入防護措施，以免兩個機器人無限循環（僅限提及、頻道
    白名單，或「不要回覆機器人訊息」規則）。

    文件：[遠端存取](/zh-Hant/gateway/remote)、[Agent CLI](/zh-Hant/cli/agent)、[Agent send](/zh-Hant/tools/agent-send)。

  </Accordion>

  <Accordion title="多個代理是否需要分開的 VPS？">
    不需要。一個 Gateway 可以託管多個代理，每個代理都有自己的工作區、預設模型和路由。這是標準設定，比每個代理運行一個 VPS 更便宜且簡單。

    只有當您需要強隔離（安全邊界）或非常不願意共用的不同設定時，才使用分開的 VPS。否則，請保留一個 Gateway 並使用多個代理或子代理。

  </Accordion>

  <Accordion title="與其從 VPS 透過 SSH 連線，使用我個人筆記型電腦上的 node 有什麼好處嗎？">
    有的 - Node 是從遠端 Gateway 連線到您筆記型電腦的首選方式，而且
    它們提供的功能不僅僅是 Shell 存取。Gateway 執行於 macOS/Linux (Windows 透過 WSL2) 上，且
    非常輕量化 (小型 VPS 或樹莓派等級的機器即可；4 GB RAM 綽綽有餘)，因此常見的
    設定方式是一台恆運行主機加上您的筆記型電腦作為 Node。

    - **不需要入站 SSH。** Node 會主動連線到 Gateway WebSocket 並使用裝置配對。
    - **更安全的執行控制。** `system.run` 受限於該筆記型電腦上的 Node 允許清單/核准機制。
    - **更多裝置工具。** 除了 `system.run` 之外，Node 還會公開 `canvas`、`camera` 和 `screen`。
    - **本機瀏覽器自動化。** 將 Gateway 保留在 VPS 上，但透過筆記型電腦上的 node 主機在本機執行 Chrome，或透過 Chrome MCP 附加到主機上的本機 Chrome。

    SSH 適合臨時的 Shell 存取，但對於持續的 Agent 工作流程和
    裝置自動化，Node 則更為簡單。

    文件：[Nodes](/zh-Hant/nodes)、[Nodes CLI](/zh-Hant/cli/nodes)、[Browser](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="Node 是否會執行 gateway 服務？">
    不會。除非您故意執行獨立的設定檔 (請參閱 [Multiple gateways](/zh-Hant/gateway/multiple-gateways))，否則每個主機應該只執行 **一個 gateway**。Node 是連線到
    gateway 的周邊裝置 (iOS/Android nodes，或選單列應用程式中的 macOS 「node mode」)。若需無介面 node
    主機和 CLI 控制，請參閱 [Node host CLI](/zh-Hant/cli/node)。

    若變更 `gateway`、`discovery` 和外掛程式介面變更，需要完全重新啟動。

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

  <Accordion title="我如何在 VPS 上設置 Tailscale 並從我的 Mac 連接？">
    最簡步驟：

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
       - SSH： `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS： `ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果您想要不使用 SSH 的控制 UI，請在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    這會將網關綁定到 loopback 並透過 Tailscale 暴露 HTTPS。參見 [Tailscale](/zh-Hant/gateway/tailscale)。

  </Accordion>

  <Accordion title="我如何將 Mac 節點連接到遠端 Gateway (Tailscale Serve)？">
    Serve 會暴露 **Gateway Control UI + WS**。節點會透過同一個 Gateway WS 端點進行連接。

    建議設定：

    1. **確保 VPS 和 Mac 位於同一個 tailnet 上**。
    2. **在 Remote 模式下使用 macOS 應用程式**（SSH 目標可以是 tailnet 主機名稱）。
       應用程式將會通道傳輸 Gateway 埠並作為節點進行連接。
    3. **在 gateway 上核准節點**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文件： [Gateway protocol](/zh-Hant/gateway/protocol)、 [Discovery](/zh-Hant/gateway/discovery)、 [macOS remote mode](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我應該在第二台筆記型電腦上安裝，還是只需新增一個節點？">
    如果您在第二台筆記型電腦上只需要 **本機工具** (screen/camera/exec)，請將其新增為
    **節點**。這樣可以保持單一 Gateway 並避免重複的設定。本機節點工具目前僅支援 macOS，但我們計劃將其擴展到其他作業系統。

    只有當您需要 **強力隔離** 或兩個完全分開的機器人時，才安裝第二個 Gateway。

    文件： [Nodes](/zh-Hant/nodes)、 [Nodes CLI](/zh-Hant/cli/nodes)、 [Multiple gateways](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 環境變數與 .env 載入

<AccordionGroup>
  <Accordion title="OpenClaw 如何載入環境變數？">
    OpenClaw 從父進程（shell、launchd/systemd、CI 等）讀取環境變數，並額外載入：

    - 目前工作目錄中的 `.env`
    - 來自 `~/.openclaw/.env`（又名 `$OPENCLAW_STATE_DIR/.env`）的全局後備 `.env`

    這兩個 `.env` 檔案都不會覆蓋既有的環境變數。
    提供者憑證變數是工作區 `.env` 的例外：諸如
    `GEMINI_API_KEY`、`XAI_API_KEY` 或 `MISTRAL_API_KEY` 這類金鑰會從工作區
    `.env` 中被忽略，並應置於進程環境、`~/.openclaw/.env` 或設定 `env` 中。

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

  <Accordion title='我設定了 COPILOT_GITHUB_TOKEN，但模型狀態顯示「Shell env: off」。為什麼？'>
    `openclaw models status` 回報是否已啟用 **shell 環境變數匯入**。「Shell env: off」
    並**不**表示您的環境變數缺失——這只是意味著 OpenClaw 不會自動
    載入您的登入 shell。

    如果 Gateway 以服務形式執行（launchd/systemd），它將不會繼承您的 shell
    環境。請透過以下其中一種方式修正：

    1. 將權杖置於 `~/.openclaw/.env` 中：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或啟用 shell 匯入（`env.shellEnv.enabled: true`）。
    3. 或將其加入您的設定 `env` 區塊（僅在缺失時套用）。

    然後重新啟動 gateway 並重新檢查：

    ```bash
    openclaw models status
    ```

    Copilot 權杖是從 `COPILOT_GITHUB_TOKEN` 讀取的（也包含 `GH_TOKEN` / `GITHUB_TOKEN`）。
    參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers) 與 [/environment](/zh-Hant/help/environment)。

  </Accordion>
</AccordionGroup>

## Sessions and multiple chats

<AccordionGroup>
  <Accordion title="我如何開始一個新的對話？">
    發送 `/new` 或 `/reset` 作為獨立訊息。請參閱 [會話管理](/zh-Hant/concepts/session)。
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

  <Accordion title="有沒有辦法建立一個 OpenClaw 實例團隊（一個 CEO 和多個代理程式）？">
    有的，透過 **多代理程式路由** 和 **子代理程式**。您可以建立一個協調器
    代理程式和數個擁有自己工作區和模型的工作代理程式。

    話雖如此，這最好被視為一個 **有趣的實驗**。這非常耗費 token，而且通常
    比使用一個具有不同會話的機器人效率更低。我們設想的典型模型
    是您與一個機器人交談，並使用不同的會話進行平行工作。該
    機器人也可以在需要時生成子代理程式。

    文件：[多代理程式路由](/zh-Hant/concepts/multi-agent)、[子代理程式](/zh-Hant/tools/subagents)、[代理程式 CLI](/zh-Hant/cli/agents)。

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

  <Accordion title="如何完全重設 OpenClaw 但保留安裝？">
    使用重設指令：

    ```bash
    openclaw reset
    ```

    非互動式完整重設：

    ```bash
    openclaw reset --scope full --yes --non-interactive
    ```

    然後重新執行設定：

    ```bash
    openclaw onboard --install-daemon
    ```

    備註：

    - 如果看到既有設定，入門流程也會提供 **重設** 選項。請參閱 [入門 (CLI)](/zh-Hant/start/wizard)。
    - 如果您使用了設定檔 (`--profile` / `OPENCLAW_PROFILE`)，請重設每個狀態目錄 (預設為 `~/.openclaw-<profile>`)。
    - 開發重設：`openclaw gateway --dev --reset` (僅限開發；清除開發設定 + 憑證 + 會話 + 工作區)。

  </Accordion>

  <Accordion title='我收到「context too large」（上下文過大）錯誤 - 如何重置或壓縮？'>
    使用以下其中一種方式：

    - **壓縮 (Compact)**（保留對話但摘要較早的輪次）：

      ```
      /compact
      ```

      或 `/compact <instructions>` 以引導摘要產生。

    - **重置 (Reset)**（為相同的聊天金鑰產生新的 Session ID）：

      ```
      /new
      /reset
      ```

    如果持續發生此情況：

    - 啟用或調整 **session pruning**（`agents.defaults.contextPruning`）以修剪舊的工具輸出。
    - 使用具有較大上下文視窗的模型。

    文件：[壓縮](/zh-Hant/concepts/compaction)、[Session pruning](/zh-Hant/concepts/session-pruning)、[Session 管理](/zh-Hant/concepts/session)。

  </Accordion>

  <Accordion title='為什麼我看到「LLM request rejected: messages.content.tool_use.input field required」錯誤？'>
    這是一個供應商驗證錯誤：模型發出了一個 `tool_use` 區塊，但缺少必需的
    `input`。這通常意味著會話歷史記錄已過時或損壞（通常發生在長執行緒後
    或工具/架構變更之後）。

    解決方法：使用 `/new`（獨立訊息）開始一個新的會話。

  </Accordion>

  <Accordion title="為什麼我每 30 分鐘會收到 heartbeat 訊息？">
    Heartbeats 預設每 **30 分鐘** 執行一次（使用 OAuth 認證時為 **1 小時**）。您可以調整或停用它們：

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

    如果 `HEARTBEAT.md` 存在但實際上是空的（僅有空白行和像 `# Heading` 這樣的 markdown 標題），OpenClaw 會跳過 heartbeat 執行以節省 API 呼叫。如果檔案不存在，heartbeat 仍會執行並由模型決定要做什麼。

    逐代理覆寫使用 `agents.list[].heartbeat`。文件：[Heartbeat](/zh-Hant/gateway/heartbeat)。

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
    選項 1（最快）：追蹤日誌並在群組中發送測試訊息：

    ```bash
    openclaw logs --follow --json
    ```

    尋找以 `@g.us` 結尾的 `chatId`（或 `from`），例如：
    `1234567890-1234567890@g.us`。

    選項 2（如果已經設定/加入允許名單）：從設定檔列出群組：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文件：[WhatsApp](/zh-Hant/channels/whatsapp)、[目錄](/zh-Hant/cli/directory)、[日誌](/zh-Hant/cli/logs)。

  </Accordion>

  <Accordion title="Why does OpenClaw not reply in a group?">
    兩個常見原因：

    - 提及閘門（mention gating）已開啟（預設）。你必須 @提及機器人（或符合 `mentionPatterns`）。
    - 你設定 `channels.whatsapp.groups` 時未使用 `"*"`，且該群組未被列入允許名單。

    請參閱 [群組](/zh-Hant/channels/groups) 和 [群組訊息](/zh-Hant/channels/group-messages)。

  </Accordion>

<Accordion title="Do groups/threads share context with DMs?">直接聊天預設會合併至主會話。群組/頻道擁有自己的會話金鑰，且 Telegram 主題 / Discord 執行緒是獨立的會話。請參閱 [群組](/zh-Hant/channels/groups) 和 [群組訊息](/zh-Hant/channels/group-messages)。</Accordion>

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

  <Accordion title="Can I run multiple bots or chats at the same time (Slack), and how should I set that up?">
    是的。使用 **多代理路由（Multi-Agent Routing）** 來執行多個隔離的代理程式，並依
    頻道/帳號/對等端路由傳入訊息。Slack 受支援為一種頻道，並可綁定至特定代理程式。

    瀏覽器存取功能強大但並非「人類能做的任何事皆可為」——反機器人、CAPTCHA 和 MFA
    仍可能阻擋自動化。若要獲得最可靠的瀏覽器控制，請在主機上使用本機 Chrome MCP，
    或在實際執行瀏覽器的機器上使用 CDP。

    最佳實務設定：

    - 常駐的閘道主機（VPS/Mac mini）。
    - 每個角色一個代理程式（綁定）。
    - 綁定至這些代理程式的 Slack 頻道。
    - 視需要透過 Chrome MCP 或節點使用本機瀏覽器。

    文件：[多代理路由](/zh-Hant/concepts/multi-agent)、[Slack](/zh-Hant/channels/slack)、
    [瀏覽器](/zh-Hant/tools/browser)、[節點](/zh-Hant/nodes)。

  </Accordion>
</AccordionGroup>

## 模型、故障轉移和驗證設定檔

模型常見問題——預設值、選取、別名、切換、容錯移轉、驗證設定檔——
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

  <Accordion title='控制介面顯示「未授權」（或不斷重新連線）。現在該怎麼辦？'>
    您的閘道認證路徑與介面的認證方法不符。

    事實（來自程式碼）：

    - 控制介面會將權杖保留在 `sessionStorage` 中，用於目前瀏覽器分頁階段和選定的閘道 URL，因此同分頁重新整理能持續運作，無需還原長期 localStorage 權杖持久性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，當閘道返回重試提示（`canRetryWithDeviceToken=true`、`recommendedNextStep=retry_with_device_token`）時，受信任的用戶端可以嘗試使用快取的裝置權杖進行一次有界的重試。
    - 該快取權杖重試現在會重複使用與裝置權杖一起儲存的快取已批准範圍。明確的 `deviceToken` / 明確的 `scopes` 呼叫者仍然保留其請求的範圍集，而不是繼承快取範圍。
    - 在該重試路徑之外，連線認證優先順序首先是明確的共用權杖/密碼，然後是明確的 `deviceToken`，接著是儲存的裝置權杖，最後是啟動權杖。
    - 內建的設定碼啟動僅限於節點。批准後，它會返回具有 `scopes: []` 的節點裝置權杖，並不返回移交的操作員權杖。

    修正方法：

    - 最快的方法：`openclaw dashboard`（列印 + 複製儀表板 URL，嘗試開啟；如果是無頭模式，則顯示 SSH 提示）。
    - 如果您還沒有權杖：`openclaw doctor --generate-gateway-token`。
    - 如果是遠端：先建立通道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`。
    - 共用密鑰模式：設定 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然後在控制介面設定中貼上相符的密鑰。
    - Tailscale Serve 模式：確保已啟用 `gateway.auth.allowTailscale`，並且您正在開啟 Serve URL，而不是繞過 Tailscale 身分標頭的原始回送/tailnet URL。
    - 受信任代理模式：確保您是透過設定的身分感知代理連線，而不是原始閘道 URL。同主機回送代理也需要 `gateway.auth.trustedProxy.allowLoopback = true`。
    - 如果在一次重試後仍不匹配，請輪換/重新批准配對的裝置權杖：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 如果該輪換呼叫表示被拒絕，請檢查兩件事：
      - 配對裝置階段只能輪換其**自己的**裝置，除非它們還具有 `operator.admin`
      - 明確的 `--scope` 值不能超過呼叫者目前操作員的範圍
    - 仍然卡住了？執行 `openclaw status --all` 並按照 [故障排除](/zh-Hant/gateway/troubleshooting) 操作。有關認證詳細資訊，請參閱 [儀表板](/zh-Hant/web/dashboard)。

  </Accordion>

  <Accordion title="我設定了 gateway.bind tailnet 但無法綁定且沒有監聽">
    `tailnet` bind 會從您的網路介面 (100.64.0.0/10) 中選取一個 Tailscale IP。如果機器不在 Tailscale 上（或介面已關閉），就沒有綁定目標。

    修正方法：

    - 在該主機上啟動 Tailscale（使其擁有 100.x 位址），或
    - 切換到 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是明確指定的。`auto` 偏好 loopback；當您想要僅限 tailnet 的綁定時，請使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="我可以在同一台主機上執行多個 Gateway 嗎？">
    通常不需要 - 一個 Gateway 可以執行多個訊息通道和代理程式。僅當您需要冗餘（例如：救援機器人）或強隔離時，才使用多個 Gateway。

    可以，但您必須隔離：

    - `OPENCLAW_CONFIG_PATH`（個別實例設定）
    - `OPENCLAW_STATE_DIR`（個別實例狀態）
    - `agents.defaults.workspace`（工作區隔離）
    - `gateway.port`（唯一連接埠）

    快速設定（建議）：

    - 每個實例使用 `openclaw --profile <name> ...`（自動建立 `~/.openclaw-<name>`）。
    - 在每個設定檔中設定唯一的 `gateway.port`（或是手動執行時傳遞 `--port`）。
    - 安裝針對每個設定檔的服務：`openclaw --profile <name> gateway install`。

    設定檔也會為服務名稱加上後綴（`ai.openclaw.<profile>`；舊版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
    完整指南：[Multiple gateways](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='「invalid handshake」/ 代碼 1008 是什麼意思？'>
    Gateway 是一個 **WebSocket 伺服器**，它預期收到的第一則訊息必須是 `connect` 格式。如果收到任何其他內容，它會以 **代碼 1008**（原則違反）關閉連線。

    常見原因：

    - 您在瀏覽器中開啟了 **HTTP** URL（`http://...`），而不是使用 WS 用戶端。
    - 您使用了錯誤的連接埠或路徑。
    - 代理伺服器或通道移除了驗證標頭，或發送了非 Gateway 的請求。

    快速修復方法：

    1. 使用 WS URL：`ws://<host>:18789`（如果使用 HTTPS，則為 `wss://...`）。
    2. 不要在一般的瀏覽器分頁中開啟 WS 連接埠。
    3. 如果開啟了驗證，請在 `connect` 格式中包含 token/密碼。

    如果您使用的是 CLI 或 TUI，URL 應如下所示：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    通訊協定細節：[Gateway protocol](/zh-Hant/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 日誌記錄與除錯

<AccordionGroup>
  <Accordion title="日誌在哪裡？">
    檔案日誌（結構化）：

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    您可以透過 `logging.file` 設定穩定的路徑。檔案日誌層級由 `logging.level` 控制。主控台詳細度由 `--verbose` 和 `logging.consoleLevel` 控制。

    最快的日誌追蹤方式：

    ```bash
    openclaw logs --follow
    ```

    服務/監督者日誌（當閘道透過 launchd/systemd 執行時）：

    - macOS launchd stdout：`~/Library/Logs/openclaw/gateway.log`（設定檔使用 `gateway-<profile>.log`；stderr 已被隱藏）
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    參閱 [疑難排解](/zh-Hant/gateway/troubleshooting) 以取得更多資訊。

  </Accordion>

  <Accordion title="如何啟動/停止/重新啟動 Gateway 服務？">
    使用 gateway 輔助指令：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行 gateway，`openclaw gateway --force` 可以回收連接埠。參閱 [Gateway](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="我在 Windows 上關閉了終端機——如何重新啟動 OpenClaw？">
    有 **兩種 Windows 安裝模式**：

    **1) WSL2（推薦）：** Gateway 在 Linux 內部執行。

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

    文件：[Windows (WSL2)](/zh-Hant/platforms/windows)、[Gateway 服務手冊](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="閘道器已啟動但未收到回覆。我應該檢查什麼？">
    首先進行快速的健康檢查：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常見原因：

    - **閘道器主機**上未載入模型授權（請檢查 `models status`）。
    - 通道配對/允許清單阻擋了回覆（請檢查通道設定與日誌）。
    - WebChat/Dashboard 在未提供正確權杖的情況下開啟。

    如果您處於遠端環境，請確認通道/Tailscale 連線正常，且
    Gateway WebSocket 可以連線。

    文件：[通道](/zh-Hant/channels)、[疑難排解](/zh-Hant/gateway/troubleshooting)、[遠端存取](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title='「已從閘道器斷線：無原因」——現在該怎麼辦？'>
    這通常表示 UI 失去了 WebSocket 連線。請檢查：

    1. Gateway 是否正在執行？ `openclaw gateway status`
    2. Gateway 是否健康？ `openclaw status`
    3. UI 是否具有正確的權杖？ `openclaw dashboard`
    4. 若為遠端連線，通道/Tailscale 連線是否正常？

    然後查看日誌：

    ```bash
    openclaw logs --follow
    ```

    文件：[儀表板](/zh-Hant/web/dashboard)、[遠端存取](/zh-Hant/gateway/remote)、[疑難排解](/zh-Hant/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失敗。我該檢查什麼？">
    首先檢查日誌和頻道狀態：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然後比對錯誤：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 選單包含太多項目。OpenClaw 已經會自動修剪至 Telegram 的限制並重試較少的指令，但您可能仍需刪除部分選單項目。減少外掛/技能/自訂指令的數量，或者如果您不需要選單，可以停用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或類似的網路錯誤：如果您使用 VPS 或位於 Proxy 後方，請確認允許傳出 HTTPS 且 DNS 對 `api.telegram.org` 正常運作。

    如果 Gateway 是遠端的，請確保您正在檢視 Gateway 主機上的日誌。

    文件：[Telegram](/zh-Hant/channels/telegram)、[頻道疑難排解](/zh-Hant/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 沒有顯示輸出。我該檢查什麼？">
    首先確認 Gateway 可以連線且代理程式 (agent) 能夠執行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 來查看目前狀態。如果您預期在聊天頻道中收到回覆，請確保已啟用傳遞功能 (`/deliver on`)。

    文件：[TUI](/zh-Hant/web/tui)、[斜線指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何完全停止然後啟動 Gateway？">
    如果您已安裝服務：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    這會停止/啟動 **受監控的服務** (macOS 上的 launchd，Linux 上的 systemd)。
    當 Gateway 以背景常駐程式 (daemon) 執行時使用此指令。

    如果您在前台執行，請按 Ctrl-C 停止，然後執行：

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
  <Accordion title="我的技能產生了圖片/PDF，但沒有發送任何內容">
    代理發出的附件必須使用結構化媒體欄位，例如 `media`、`mediaUrl`、`path` 或 `filePath`。請參閱 [OpenClaw 助手設定](/zh-Hant/start/openclaw) 和 [代理傳送](/zh-Hant/tools/agent-send)。

    CLI 傳送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    同時請檢查：

    - 目標頻道支援傳出媒體，且未被允許清單封鎖。
    - 檔案大小在供應商的限制範圍內（圖片會調整大小至最大 2048px）。
    - `tools.fs.workspaceOnly=true` 將本地路徑傳送限制在工作區、temp/media-store 和已驗證的沙盒檔案。
    - `tools.fs.workspaceOnly=false` 允許結構化本地媒體傳送使用代理已可讀取的主機本地檔案，但僅限於媒體和安全文件類型（圖片、音訊、視訊、PDF 和 Office 文件）。純文字和類似機密的檔案仍會被封鎖。

    請參閱 [圖片](/zh-Hant/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全與存取控制

<AccordionGroup>
  <Accordion title="將 OpenClaw 暴露給傳入私訊是否安全？">
    將傳入私訊視為不受信任的輸入。預設值的設計旨在降低風險：

    - 支援私訊頻道的預設行為是 **配對**：
      - 未知的發送者會收到配對碼；機器人不會處理其訊息。
      - 使用以下指令核准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 待處理請求限制為 **每個頻道 3 個**；如果代碼未收到，請檢查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公開開啟私訊需要明確選擇加入（`dmPolicy: "open"` 和允許清單 `"*"`）。

    執行 `openclaw doctor` 以顯示有風險的私訊政策。

  </Accordion>

  <Accordion title="提示注入僅是公開機器人的隱憂嗎？">
    不是。提示注入涉及的是**不受信任的內容**，而不僅僅是誰可以私信機器人。
    如果您的助理讀取外部內容（網路搜尋/擷取、瀏覽器頁面、電子郵件、
    文件、附件、貼上的記錄），該內容可能包含試圖
    劫持模型的指令。即使**您是唯一的發送者**，也可能發生這種情況。

    最大的風險在於啟用工具時：模型可能被誘騙
    外洩上下文或代表您呼叫工具。透過以下方式減少影響範圍：

    - 使用唯讀或已停用工具的「讀者」代理程式來摘要不受信任的內容
    - 針對已啟用工具的代理程式，將 `web_search` / `web_fetch` / `browser` 關閉
    - 將解碼後的檔案/文件文字也視為不受信任：OpenResponses
      `input_file` 和媒體附件擷取都會將擷取的文字包裝在
      明確的外部內容邊界標記中，而不是直接傳遞原始檔案文字
    - 沙箱機制和嚴格的工具允許清單

    詳情：[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="OpenClaw 因為使用 TypeScript/Node 而非 Rust/WASM 而較不安全嗎？">
    語言和執行環境固然重要，但它們並非個人
    代理程式的主要風險。OpenClaw 的實際風險在於閘道暴露、誰可以傳訊息給
    機器人、提示注入、工具範圍、憑證處理、瀏覽器存取、執行
    存取，以及第三方技能或外掛程式的信任。

    Rust 和 WASM 可以為某些類別的程式碼提供更強的隔離，但
    它們無法解決提示注入、錯誤的允許清單、公開閘道暴露、
    過於寬泛的工具，或已登入敏感帳戶的瀏覽器設定檔等問題。應將這些視為主要控制手段：

    - 將閘道保持為私人或已驗證狀態
    - 對私信和群組使用配對和允許清單
    - 拒絕或對不受信任的輸入沙箱化風險工具
    - 僅安裝受信任的外掛程式和技能
    - 在設定變更後執行 `openclaw security audit --deep`

    詳情：[安全性](/zh-Hant/gateway/security)、[沙箱機制](/zh-Hant/gateway/sandboxing)。

  </Accordion>

  <Accordion title="我看到有關於 OpenClaw 實例暴露的報告。我應該檢查什麼？">
    首先檢查您的實際部署狀態：

    ```bash
    openclaw security audit --deep
    openclaw gateway status
    ```

    更安全的基準做法是：

    - Gateway 綁定到 `loopback`，或者僅透過經過驗證的私有
      存取（例如 tailnet、SSH tunnel、token/password 驗證或正確
      設定的受信任代理）公開
    - DM 處於 `pairing` 或 `allowlist` 模式
    - 群組已加入白名單並設有提及限制，除非每位成員都受信任
    - 高風險工具（`exec`、`browser`、`gateway`、`cron`）對於讀取不受信任內容的代理程式
      應被拒絕或嚴格限制範圍
    - 在工具執行需要較小影響範圍的地方啟用沙盒機制

    缺乏驗證的公開綁定、開放並具備工具權限的 DM/群組，以及暴露的瀏覽器
    控制權是首要修補的發現事項。詳細資訊：
    [Security audit checklist](/zh-Hant/gateway/security#security-audit-checklist)。

  </Accordion>

  <Accordion title="安裝 ClawHub 技能和第三方外掛是否安全？">
    應將第三方技能和外掛視為您選擇信任的程式碼。
    ClawHub 技能頁面會在安裝前公開掃描狀態，且 OpenClaw 外掛
    安裝/更新流程會執行內建的危險程式碼檢查，但掃描並非
    完整的安全邊界。

    更安全的模式：

    - 優先選擇受信任的作者和鎖定版本
    - 在啟用前閱讀技能或外掛內容
    - 保持外掛和技能白名單範圍狹窄
    - 在具備最少工具的沙盒中執行不受信任輸入的工作流程
    - 避免給予第三方程式碼廣泛的檔案系統、執行、瀏覽器或機密存取權

    詳情：[Skills](/zh-Hant/tools/skills)、[Plugins](/zh-Hant/tools/plugin)、
    [Security](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="我的機器人應該有自己的電子郵件、GitHub 帳號或電話號碼嗎？">
    是的，對於大多數設定而言。使用獨立的帳號和電話號碼將機器人隔離，
    可以在發生問題時減輕受影響的範圍。這也讓輪換憑證
    或撤銷存取權限變得更容易，且不會影響您的個人帳號。

    從小處著手。僅授予您實際需要的工具和帳號存取權限，
    並在必要時再進行擴充。

    文件：[安全性](/zh-Hant/gateway/security)、[配對](/zh-Hant/channels/pairing)。

  </Accordion>

  <Accordion title="我可以讓它全權處理我的簡訊嗎？這樣安全嗎？">
    我們**不**建議讓其對您的個人訊息擁有完全的自主權。最安全的模式是：

    - 將直訊 (DM) 保持在 **配對模式** 或嚴格的白名單中。
    - 如果您希望它代表您發送訊息，請使用 **獨立的電話號碼或帳號**。
    - 讓它擬草稿，然後在發送前 **進行審核**。

    如果您想要進行實驗，請在專用帳號上進行並保持隔離。請參閱
    [安全性](/zh-Hant/gateway/security)。

  </Accordion>

<Accordion title="我可以針對個人助理任務使用較便宜的模型嗎？">可以，**前提是**該代理程式僅用於聊天且輸入內容是可信的。較低階層的模型 更容易受到指令劫持，因此請避免將其用於已啟用工具的代理程式 或在讀取不受信任的內容時使用。如果您必須使用較小的模型，請鎖定 工具並在沙盒中執行。請參閱 [安全性](/zh-Hant/gateway/security)。</Accordion>

  <Accordion title="我在 Telegram 中執行了 /start 但沒有收到配對碼">
    配對碼**僅**在未知寄件者傳送訊息給機器人且
    已啟用 `dmPolicy: "pairing"` 時才會傳送。僅憑 `/start` 本身並不會產生代碼。

    檢查待處理的要求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您希望立即存取，請將您的寄件者 ID 加入白名單，或為該帳號設定 `dmPolicy: "open"`
    。

  </Accordion>

  <Accordion title="WhatsApp: 它會傳訊息給我的聯絡人嗎？配對運作原理為何？">
    不會。預設 WhatsApp 私訊 (DM) 政策是**配對** (pairing)。未知的發送者只會收到配對碼，且其訊息**不會被處理**。OpenClaw 只會回覆它收到的聊天訊息，或是由您觸發的明確發送。

    透過以下方式批准配對：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待處理請求：

    ```bash
    openclaw pairing list whatsapp
    ```

    精靈電話號碼提示：它用於設定您的**允許清單/擁有者** (allowlist/owner)，以便允許您自己的私訊。它不用於自動發送。如果您在個人 WhatsApp 號碼上執行，請使用該號碼並啟用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天指令、中止任務，以及「它無法停止」

<AccordionGroup>
  <Accordion title="如何阻止內部系統訊息顯示在聊天中？">
    大多數內部或工具訊息只有在針對該工作階段啟用**詳細 (verbose)**、**追蹤 (trace)** 或**推理 (reasoning)** 時才會出現。

    在您看到該訊息的聊天中修正：

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    如果仍然很吵雜，請檢查控制 UI 中的工作階段設定，並將詳細模式設定為**繼承** (inherit)。同時請確認您沒有在設定中使用在組態中將 `verboseDefault` 設定為 `on` 的機器人設定檔。

    文件：[思考與詳細模式](/zh-Hant/tools/thinking)、[安全性](/zh-Hant/gateway/security/index#reasoning-and-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在執行的任務？">
    傳送以下任何一項**作為獨立訊息**（無斜線）：

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

    斜線指令概覽：請參閱[斜線指令](/zh-Hant/tools/slash-commands)。

    大多數指令必須以 `/` 開頭的**獨立**訊息傳送，但少數捷徑（例如 `/status`）也可以在允許清單中的發送者之行內運作。

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

  <Accordion title='為什麼機器人看起來像「忽略」了連續發送的訊息？'>
    執行中的提示預設會被導引至目前的執行。使用 `/queue` 來選擇目前執行的行為：

    - `steer` - 在下一個模型邊界引導目前的執行
    - `followup` - 將訊息排入佇列，並在目前執行結束後逐一執行
    - `collect` - 將相容訊息排入佇列，並在目前執行結束後回覆一次
    - `interrupt` - 中止目前的執行並重新開始

    預設模式為 `steer`。您可以為佇列模式新增選項，例如 `debounce:0.5s cap:25 drop:summarize`。請參閱 [Command queue](/zh-Hant/concepts/queue) 和 [Steering queue](/zh-Hant/concepts/queue-steering)。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title="使用 API 金鑰時 Anthropic 的預設模型是什麼？">
    在 OpenClaw 中，憑證與模型選擇是分開的。設定 `ANTHROPIC_API_KEY`（或將 Anthropic API 金鑰儲存在 auth profiles 中）會啟用驗證，但實際的預設模型則是您在 `agents.defaults.model.primary` 中設定的任何模型（例如 `anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，這表示 Gateway 無法在正在執行的代理程式所預期的
    `auth-profiles.json` 中找到 Anthropic 憑證。
  </Accordion>
</AccordionGroup>

---

還是卡住了？請在 [Discord](https://discord.com/invite/clawd) 提問，或開啟一個 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。

## 相關內容

- [首次執行常見問題](/zh-Hant/help/faq-first-run) — 安裝、上手、驗證、訂閱、早期失敗
- [模型常見問題](/zh-Hant/help/faq-models) — 模型選擇、故障轉移、驗證設定檔
- [疑難排解](/zh-Hant/help/troubleshooting) — 以症狀優先的分診
