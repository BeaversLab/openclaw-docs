---
summary: "關於 OpenClaw 設定、配置和使用的常見問題"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "常見問題"
---

針對真實環境設置（本機開發、VPS、多代理、OAuth/API 金鑰、模型故障轉移）的快速解答與更深入的疑難排解。關於執行時診斷，請參閱 [疑難排解](/zh-Hant/gateway/troubleshooting)。若需完整的配置參考，請參閱 [配置](/zh-Hant/gateway/configuration)。

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

   執行即時的閘道健康探測，包含支援時的通道探測
   （需要可連線的閘道）。請參閱 [健康狀態](/zh-Hant/gateway/health)。

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

   修復/遷移配置/狀態並執行健康檢查。請參閱 [Doctor](/zh-Hant/gateway/doctor)。

7. **閘道器快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向執行中的閘道要求完整快照（僅限 WS）。請參閱 [健康狀態](/zh-Hant/gateway/health)。

## 快速開始與首次執行設定

首次執行 Q&A — 安裝、上架、驗證路由、訂閱、初期失敗 —
位於 [首次執行常見問題](/zh-Hant/help/faq-first-run)。

## 什麼是 OpenClaw？

<AccordionGroup>
  <Accordion title="什麼是 OpenClaw？用一段話說明。">
    OpenClaw 是一個您在自己的裝置上執行的個人 AI 助理。它會在您已經使用的訊息介面上回覆（WhatsApp、Telegram、Slack、Mattermost、Discord、Google Chat、Signal、iMessage、WebChat，以及內建的通道外掛如 QQ Bot），並且在支援的平台上還能進行語音互動 + 即時 Canvas。**閘道** 是永遠在線的控制平面；而助理則是產品本身。
  </Accordion>

  <Accordion title="價值主張">
    OpenClaw 不僅僅是「一個 Claude 的外殼」。它是一個 **以本地為優先的控制平面**，讓您在
    **您自己的硬體** 上執行一個
    功能強大的助理，並透過您原本就使用的聊天應用程式來存取，具備
    有狀態的會話、記憶和工具功能 - 無需將您的工作流程控制權交給
    託管的 SaaS。

    重點特色：

    - **您的裝置，您的資料：** 在您想要的任何地方 (Mac、Linux、VPS) 執行 Gateway，並將
      工作區 + 會話紀錄保留在本地。
    - **真實管道，而非網頁沙箱：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，
      加上在支援的平台上的行動語音和 Canvas。
    - **模型無關性：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，並具備每個代理的路由
      和容錯移轉功能。
    - **僅限本地的選項：** 執行本地模型，因此 **所有資料都可以保留在您的裝置上** (如果您願意的話)。
    - **多代理路由：** 根據管道、帳戶或任務分離代理，每個都有自己的
      工作區和預設值。
    - **開放原始碼且可駭客：** 檢視、擴充和自我託管，沒有廠商鎖定。

    文件：[Gateway](/zh-Hant/gateway)、[Channels](/zh-Hant/channels)、[Multi-agent](/zh-Hant/concepts/multi-agent)、
    [Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="我剛設定好 - 我該先做什麼？">
    適合的首選專案：

    - 建立網站 (WordPress、Shopify 或簡單的靜態網站)。
    - 製作行動應用程式原型 (大綱、畫面、API 計畫)。
    - 整理檔案和資料夾 (清理、命名、標記)。
    - 連結 Gmail 並自動化摘要或後續追蹤。

    它可以處理大型任務，但當您將任務分階段執行並
    使用子代理進行並行工作時，效果最好。

  </Accordion>

  <Accordion title="OpenClaw 的五大日常使用案例是什麼？">
    日常的獲益通常包括：

    - **個人簡報：** 收件匣、行事曆和您關心的新聞摘要。
    - **研究與起草：** 快速研究、摘要以及電子郵件或文件的初稿。
    - **提醒與跟進：** 由 cron 或心跳驅動的提醒與檢查清單。
    - **瀏覽器自動化：** 填寫表單、收集數據以及重複的網頁任務。
    - **跨裝置協調：** 從手機發送任務，讓 Gateway 在伺服器上執行，並在聊天中取回結果。

  </Accordion>

  <Accordion title="OpenClaw 能協助 SaaS 的潛在客戶開發、外聯、廣告和部落格嗎？">
    在**研究、篩選和起草**方面是可以的。它可以掃描網站、建立候選名單、摘要潛在客戶，並撰寫外聯或廣告文案初稿。

    對於**外聯或廣告活動**，請保持人員參與。避免垃圾郵件，遵守當地法律和平台政策，並在發送前審核所有內容。最安全的模式是讓 OpenClaw 起草，由您批准。

    文件：[安全](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="對於網頁開發，與 Claude Code 相比有什麼優勢？">
    OpenClaw 是一個**個人助理**和協調層，而非 IDE 的替代品。使用 Claude Code 或 Codex 以在程式庫內獲得最快的直接編碼迴路。當您需要持久的記憶、跨裝置存取和工具協調時，請使用 OpenClaw。

    優勢：

    - **跨會話的持久記憶 + 工作區**
    - **多平台存取**（WhatsApp、Telegram、TUI、WebChat）
    - **工具協調**（瀏覽器、檔案、排程、鉤子）
    - **始終運作的 Gateway**（在 VPS 上執行，從任何地方互動）
    - 用於本機瀏覽器/螢幕/相機/執行的 **Nodes**

    展示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## 技能與自動化

<AccordionGroup>
  <Accordion title="如何在不讓程式庫變髒的情況下自訂技能？">
    使用受管覆寫來代替編輯程式庫副本。將您的變更放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或在 `~/.openclaw/openclaw.json` 中透過 `skills.load.extraDirs` 新增資料夾）。優先順序為 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`，因此受管覆寫仍會勝過捆綁的技能，而不需要觸及 git。如果您需要將技能全域安裝但僅對某些代理程式可見，請將共用副本保留在 `~/.openclaw/skills` 中，並使用 `agents.defaults.skills` 和 `agents.list[].skills` 控制可見性。只有值得向上遊提交的編輯才應該存放在程式庫中並作為 PR 發出。
  </Accordion>

  <Accordion title="我可以從自訂資料夾載入技能嗎？">
    可以。在 `~/.openclaw/openclaw.json` 中透過 `skills.load.extraDirs` 新增額外的目錄（優先順序最低）。預設的優先順序是 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`。`clawhub` 預設安裝到 `./skills`，OpenClaw 在下一個工作階段會將其視為 `<workspace>/skills`。如果該技能僅應對特定代理程式可見，請將其與 `agents.defaults.skills` 或 `agents.list[].skills` 搭配使用。
  </Accordion>

  <Accordion title="我如何為不同的任務使用不同的模型或設定？">
    目前支援的模式有：

    - **Cron jobs**：獨立的作業可以針對每個作業設定 `model` 覆寫。
    - **Agents**：將任務路由到具有不同預設模型、思考層級和串流參數的個別代理程式。
    - **On-demand switch**：使用 `/model` 隨時切換目前的工作階段模型。

    例如，使用相同的模型搭配不同的針對代理程式設定：

    ```json5
    {
      agents: {
        list: [
          {
            id: "coder",
            model: "xiaomi/mimo-v2.5-pro",
            thinkingDefault: "high",
            params: { temperature: 0.1 },
          },
          {
            id: "chat",
            model: "xiaomi/mimo-v2.5-pro",
            thinkingDefault: "off",
            params: { temperature: 0.8 },
          },
        ],
      },
    }
    ```

    將共用的針對模型預設值放在 `agents.defaults.models["provider/model"].params`，然後將針對代理程式的覆寫放在扁平的 `agents.list[].params` 中。請勿為同一個模型定義單獨的巢狀 `agents.list[].models["provider/model"].params` 項目；`agents.list[].models` 是用於針對代理程式的模型目錄和執行時期覆寫。

    請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs)、[Multi-Agent Routing](/zh-Hant/concepts/multi-agent)、[Configuration](/zh-Hant/gateway/config-agents) 和 [Slash commands](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="機器人在執行繁重工作時會凍結。我要如何將其卸載？">
    請對長時間或並行任務使用 **sub-agents**。子代理程式在自己的工作階段中執行，
    會回傳摘要，並讓您的主要聊天保持回應。

    請要求您的機器人「為此任務產生子代理程式」或使用 `/subagents`。
    在聊天中使用 `/status` 以查看 Gateway 目前正在做什麼（以及它是否忙碌）。

    Token 提示：長時間任務和子代理程式都會消耗 Token。如果成本是考量因素，請透過 `agents.defaults.subagents.model` 為子代理程式設定更便宜的模型。

    文件：[Sub-agents](/zh-Hant/tools/subagents)、[Background Tasks](/zh-Hant/automation/tasks)。

  </Accordion>

  <Accordion title="Discord 上的執行緒綁定子代理工作階段是如何運作的？">
    使用執行緒綁定。您可以將 Discord 執行緒綁定到子代理或工作階段目標，以便該執行緒中的後續訊息保持在該綁定的工作階段中。

    基本流程：

    - 使用 `thread: true` 透過 `sessions_spawn` 生成（並可選擇使用 `mode: "session"` 以進行持續後續追蹤）。
    - 或使用 `/focus <target>` 手動綁定。
    - 使用 `/agents` 檢查綁定狀態。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自動取消聚焦。
    - 使用 `/unfocus` 分離執行緒。

    必要設定：

    - 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆寫：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 生成時自動綁定：`channels.discord.threadBindings.spawnSessions` 預設為 `true`；將其設為 `false` 以停用執行緒綁定的工作階段生成。

    文件：[子代理](/zh-Hant/tools/subagents)、[Discord](/zh-Hant/channels/discord)、[設定參考](/zh-Hant/gateway/configuration-reference)、[斜線指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="子代理已完成，但完成更新發送到了錯誤的位置或從未發布。我應該檢查什麼？">
    首先檢查已解析的請求者路由：

    - 完成模式的子代理傳遞優先使用任何綁定的執行緒或對話路由（如果存在的話）。
    - 如果完成來源僅攜帶頻道，OpenClaw 會回退到請求者會話的存儲路由 (`lastChannel` / `lastTo` / `lastAccountId`)，以便直接傳遞仍然可以成功。
    - 如果既沒有綁定路由也沒有可用的存儲路由，直接傳遞可能會失敗，結果將回退到排隊的會話傳遞，而不是立即發布到聊天。
    - 無效或過時的目標仍可能導致強制回退到佇列或最終傳遞失敗。
    - 如果子代理的最後一個可見助手回覆是確切的靜默令牌 `NO_REPLY` / `no_reply`，或者確切是 `ANNOUNCE_SKIP`，OpenClaw 會有意抑制公告，而不是發布過時的早期進度。
    - Tool/toolResult 輸出不會被提升到子代理結果文本中；結果是子代理的最新可見助手回覆。

    調試：

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    文檔：[Sub-agents](/zh-Hant/tools/subagents)、[Background Tasks](/zh-Hant/automation/tasks)、[Session Tools](/zh-Hant/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒沒有觸發。我應該檢查什麼？">
    Cron 在 Gateway 進程內運行。如果 Gateway 沒有持續運行，
    計劃的作業將不會運行。

    檢查清單：

    - 確認 cron 已啟用 (`cron.enabled`) 並且未設置 `OPENCLAW_SKIP_CRON`。
    - 檢查 Gateway 是否全天候運行（無睡眠/重啟）。
    - 驗證作業的時區設置 (`--tz` vs 主機時區)。

    調試：

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文檔：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Automation](/zh-Hant/automation)。

  </Accordion>

  <Accordion title="Cron 已觸發，但沒有任何內容傳送到頻道。為什麼？">
    請先檢查傳遞模式：

    - `--no-deliver` / `delivery.mode: "none"` 表示不預期 runner 備援傳送。
    - 遺失或無效的公告目標（`channel` / `to`）表示 runner 跳過了向外傳遞。
    - 頻道認證失敗（`unauthorized`，`Forbidden`）表示 runner 嘗試傳遞但憑證阻擋了它。
    - 無聲的隔離結果（僅 `NO_REPLY` / `no_reply`）被視為故意不傳遞，因此 runner 也會抑制排隊的備援傳遞。

    對於隔離的 cron 工作，當聊天路由可用時，agent 仍然可以直接使用 `message`
    工具傳送。`--announce` 僅控制 runner 對於 agent 尚未傳送的最終文字的備援路徑。

    除錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Background Tasks](/zh-Hant/automation/tasks)。

  </Accordion>

  <Accordion title="為什麼隔離的 cron 執行會切換模型或重試一次？">
    這通常是即時模型切換路徑，而非重複排程。

    隔離的 cron 可以保存運行時模型移交，並在當前
    執行拋出 `LiveSessionModelSwitchError` 時重試。重試會保持切換後的
    提供者/模型，且如果切換攜帶了新的認證設定檔覆蓋，cron
    也會在重試前將其保存。

    相關選取規則：

    - Gmail hook 模型覆蓋在適用時優先。
    - 然後是各別工作的 `model`。
    - 然後是任何已儲存的 cron-session 模型覆蓋。
    - 然後是正常的 agent/預設模型選取。

    重試迴圈是有界的。在初始嘗試加上 2 次切換重試後，
    cron 會中止而不是無限迴圈。

    除錯：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[cron CLI](/zh-Hant/cli/cron)。

  </Accordion>

  <Accordion title="如何在 Linux 上安裝技能？">
    使用原生的 `openclaw skills` 指令或將技能放入您的工作區。macOS 技能 UI 在 Linux 上無法使用。
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

    原生的 `openclaw skills install` 預設會寫入至啟用的工作區 `skills/`
    目錄。新增 `--global` 以安裝至所有本地代理程式的共享管理技能
    目錄。僅在您想要發布或同步您自己的技能時，才安裝個別的 `clawhub` CLI。
    如果您想要限制哪些代理程式能看到共享技能，請使用
    `agents.defaults.skills` 或 `agents.list[].skills`。

  </Accordion>

  <Accordion title="OpenClaw 可以排程執行任務或在背景連續執行嗎？">
    可以。使用 Gateway 排程器：

    - **Cron jobs** 用於排程或循環任務（重啟後持續存在）。
    - **Heartbeat** 用於「主工作階段」定期檢查。
    - **Isolated jobs** 用於發布摘要或傳遞至聊天的自主代理程式。

    文件：[Cron jobs](/zh-Hant/automation/cron-jobs)、[Automation](/zh-Hant/automation)、
    [Heartbeat](/zh-Hant/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以從 Linux 執行僅適用於 Apple macOS 的技能嗎？">
    無法直接執行。macOS 技能受到 `metadata.openclaw.os` 以及必要二進位檔的限制，只有在 **Gateway 主機**上符合資格時，技能才會出現在系統提示中。在 Linux 上，`darwin` 專屬技能（例如 `apple-notes`、`apple-reminders`、`things-mac`）除非您覆寫該限制，否則將不會載入。

    您有三種支援的方案：

    **方案 A - 在 Mac 上執行 Gateway（最簡單）。**
    在存在 macOS 二進位檔的地方執行 Gateway，然後從 Linux 以 [遠端模式](#gateway-ports-already-running-and-remote-mode) 或透過 Tailscale 進行連線。由於 Gateway 主機是 macOS，技能會正常載入。

    **方案 B - 使用 macOS 節點（無需 SSH）。**
    在 Linux 上執行 Gateway，配對 macOS 節點（選單列應用程式），並在 Mac 上將 **Node Run Commands** 設定為「Always Ask」或「Always Allow」。當節點上存在必要的二進位檔時，OpenClaw 可以將僅限 macOS 的技能視為符合資格。代理程式會透過 `nodes` 工具執行這些技能。如果您選擇「Always Ask」，在提示中批准「Always Allow」會將該指令加入允許清單。

    **方案 C - 透過 SSH 代理 macOS 二進位檔（進階）。**
    將 Gateway 保留在 Linux 上，但讓必要的 CLI 二進位檔解析為在 Mac 上執行的 SSH 包裝程式。然後覆寫技能以允許 Linux，使其保持符合資格。

    1. 為二進位檔建立 SSH 包裝程式（例如：Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 將包裝程式放置在 Linux 主機的 `PATH` 上（例如 `~/bin/memo`）。
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
    目前尚未內建。

    選項：

    - **自訂技能 / 外掛：** 最適合可靠的 API 存取（Notion/HeyGen 都有 API）。
    - **瀏覽器自動化：** 無需程式碼即可運作，但速度較慢且較不穩定。

    如果您想為每個客戶保留上下文（代理商工作流程），一個簡單的模式是：

    - 每個客戶一個 Notion 頁面（上下文 + 偏好設定 + 進行中的工作）。
    - 要求代理在會話開始時擷取該頁面。

    如果您想要原生整合，請開啟功能請求或建構一個針對這些 API 的技能。

    安裝技能：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安裝會放在目前工作區 `skills/` 目錄中。若要跨所有本地代理共用技能，請使用 `openclaw skills install <slug> --global`（或手動將其放置在 `~/.openclaw/skills/<name>/SKILL.md` 中）。如果只有部分代理應該看到共用安裝，請設定 `agents.defaults.skills` 或 `agents.list[].skills`。某些技能期望透過 Homebrew 安裝二進位檔；在 Linux 上這意味著使用 Linuxbrew（請參閱上方的 Homebrew Linux FAQ 條目）。請參閱 [Skills](/zh-Hant/tools/skills)、[Skills config](/zh-Hant/tools/skills-config) 和 [ClawHub](/zh-Hant/tools/clawhub)。

  </Accordion>

  <Accordion title="如何使用現有的已登入 Chrome 與 OpenClaw 搭配？">
    使用內建的 `user` browser profile，其透過 Chrome DevTools MCP 連接：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果您想要自訂名稱，請建立明確的 MCP profile：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    此路徑可以使用本地主機瀏覽器或連線的瀏覽器節點。如果 Gateway 在其他地方運行，請在瀏覽器機器上執行節點主機，或改用遠端 CDP。

    目前在 `existing-session` / `user` 上的限制：

    - 動作是 ref 驅動的，而非 CSS selector 驅動
    - 上傳需要 `ref` / `inputRef` 且目前一次僅支援一個檔案
    - `responsebody`、PDF 匯出、下載攔截和批次動作仍需要受管理的瀏覽器或原始 CDP profile

  </Accordion>
</AccordionGroup>

## 沙盒機制與記憶體

<AccordionGroup>
  <Accordion title="是否有專門的沙箱文件？">
    有的。請參閱 [沙箱隔離](/zh-Hant/gateway/sandboxing)。關於 Docker 特定設定（Docker 中的完整閘道或沙箱映像檔），請參閱 [Docker](/zh-Hant/install/docker)。
  </Accordion>

  <Accordion title="Docker 似乎功能受限 - 如何啟用完整功能？">
    預設映像檔以安全為優先，並以 `node` 使用者身分執行，因此不包含
    系統套件、Homebrew 或內建瀏覽器。若要進行更完整的設定：

    - 使用 `OPENCLAW_HOME_VOLUME` 持續保存 `/home/node`，讓快取得以留存。
    - 使用 `OPENCLAW_IMAGE_APT_PACKAGES` 將系統相依性建置至映像檔中。
    - 透過內建 CLI 安裝 Playwright 瀏覽器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 設定 `PLAYWRIGHT_BROWSERS_PATH` 並確保該路徑已持續保存。

    文件：[Docker](/zh-Hant/install/docker)、[瀏覽器](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="我可以在保持私人訊息 (DM) 個人化的同時，讓群組公開/沙箱化並使用一個 Agent 嗎？">
    可以 - 如果您的私人流量是 **私人訊息 (DM)** 而公開流量是 **群組**。

    使用 `agents.defaults.sandbox.mode: "non-main"`，讓群組/頻道階段（非主要金鑰）在設定的沙箱後端中執行，而主要私人訊息階段則保留在主機上。如果您未選擇後端，Docker 即為預設後端。然後透過 `tools.sandbox.tools` 限制沙箱階段中可用的工具。

    設定逐步指南 + 範例設定：[群組：私人訊息 + 公開群組](/zh-Hant/channels/groups#pattern-personal-dms-public-groups-single-agent)

    關鍵設定參考：[閘道設定](/zh-Hant/gateway/config-agents#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="How do I bind a host folder into the sandbox?">
    將 `agents.defaults.sandbox.docker.binds` 設為 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全域 + 每個代理的綁定會合併；當 `scope: "shared"` 時，每個代理的綁定會被忽略。對於任何敏感內容請使用 `:ro`，並記住綁定會繞過沙盒檔案系統牆壁。

    OpenClaw 會根據正規化路徑以及透過最深層現有祖先解析的規範路徑，來驗證綁定來源。這意味著即使最後一個路徑區段尚不存在，符號連結父目錄的逃逸仍會失敗（關閉），且在解析符號連結後仍會套用允許根目錄的檢查。

    請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing#custom-bind-mounts) 和 [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) 以取得範例和安全注意事項。

  </Accordion>

  <Accordion title="How does memory work?">
    OpenClaw 記憶體只是代理工作區中的 Markdown 檔案：

    - `memory/YYYY-MM-DD.md` 中的每日筆記
    - `MEMORY.md` 中的精選長期筆記（僅限主要/私人會話）

    OpenClaw 也會執行 **靜音預壓縮記憶體清除**，以提醒模型
    在自動壓縮之前寫入持久的筆記。這僅在工作區可寫入時執行
    （唯讀沙盒會跳過此步驟）。請參閱 [Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="Memory keeps forgetting things. How do I make it stick?">
    請要求機器人 **將該事實寫入記憶體**。長期筆記應放在 `MEMORY.md`，
    短期內容則放入 `memory/YYYY-MM-DD.md`。

    這仍是我們正在改進的領域。提醒模型儲存記憶會有所幫助；
    它會知道該做什麼。如果它一直忘記，請驗證 Gateway 在每次執行時是否使用相同的
    工作區。

    文件：[Memory](/zh-Hant/concepts/memory)、[Agent workspace](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="記憶會永久保存嗎？有哪些限制？">
    記憶檔案儲存在磁碟上，除非您將其刪除，否則會一直保存。限制在於您的
    儲存空間，而非模型。**會話內容** 仍然受限於模型的
    內容視窗，因此長時間的對話可能會被壓縮或截斷。這就是為什麼
    存在記憶搜尋——它只將相關部分拉回內容中。

    文件：[記憶](/zh-Hant/concepts/memory)、[內容](/zh-Hant/concepts/context)。

  </Accordion>

  <Accordion title="語意記憶搜尋是否需要 OpenAI API 金鑰？">
    只有在使用 **OpenAI 嵌入** 時才需要。Codex OAuth 涵蓋了聊天/補全功能，
    但並**不**授予嵌入權限，因此**透過 Codex 登入（OAuth 或
    Codex CLI 登入）** 對語意記憶搜尋沒有幫助。OpenAI 嵌入
    仍然需要真正的 API 金鑰（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果您沒有明確設定提供者，OpenClaw 會使用 OpenAI 嵌入。仍然顯示
    `memorySearch.provider = "auto"` 的舊版組態也會解析為 OpenAI。
    如果沒有可用的 OpenAI API 金鑰，語意記憶搜尋將保持不可用狀態，
    直到您設定金鑰或明確選擇其他提供者。

    如果您希望保持本地化，請設定 `memorySearch.provider = "local"`（並選擇性地
    設定 `memorySearch.fallback = "none"`）。如果您想要 Gemini 嵌入，請設定
    `memorySearch.provider = "gemini"` 並提供 `GEMINI_API_KEY`（或
    `memorySearch.remote.apiKey`）。我們支援 **OpenAI、OpenAI 相容、Gemini、
    Voyage、Mistral、Bedrock、Ollama、LM Studio、GitHub Copilot、DeepInfra 或本地**
    嵌入模型——詳見 [記憶](/zh-Hant/concepts/memory) 了解設定細節。

  </Accordion>
</AccordionGroup>

## 檔案在磁碟上的位置

<AccordionGroup>
  <Accordion title="OpenClaw 使用的所有資料都會儲存在本機嗎？">
    不會 - **OpenClaw 的狀態是本機的**，但 **外部服務仍然能看到您發送給它們的內容**。

    - **預設為本機：** 會話、記憶檔案、設定和工作區位於 Gateway 主機上
      (`~/.openclaw` + 您的工作區目錄)。
    - **必要時為遠端：** 您發送給模型提供商 (Anthropic/OpenAI/等) 的訊息會傳送到
      其 API，且聊天平台 (WhatsApp/Telegram/Slack/等) 會在其
      伺服器上儲存訊息資料。
    - **您控制影響範圍：** 使用本機模型可將提示保留在您的機器上，但頻道
      流量仍會經過頻道的伺服器。

    相關：[Agent workspace](/zh-Hant/concepts/agent-workspace), [Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 將資料儲存在哪裡？">
    所有資料都位於 `$OPENCLAW_STATE_DIR` 下（預設：`~/.openclaw`）：

    | Path                                                            | Purpose                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主要設定 (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 舊版 OAuth 匯入（首次使用時會複製到認證設定檔中）       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 認證設定檔 (OAuth、API 金鑰，以及選用的 `keyRef`/`tokenRef`)  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | 針對 `file` SecretRef 提供者的選用檔案支援機密負載 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 舊版相容性檔案（靜態 `api_key` 條目已清除）      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供者狀態（例如 `whatsapp/<accountId>/creds.json`）            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每個代理程式的狀態 (agentDir + sessions)                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 對話歷史與狀態（每個代理程式）                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 工作階段中繼資料（每個代理程式）                                       |

    舊版單一代理程式路徑：`~/.openclaw/agent/*`（由 `openclaw doctor` 遷移）。

    您的 **workspace**（AGENTS.md、記憶檔案、技能等）是分開的，並透過 `agents.defaults.workspace` 進行設定（預設：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 應該放在哪裡？">
    這些檔案位於 **agent workspace** 中，而不是 `~/.openclaw`。

    - **Workspace (每個 agent)**: `AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md`、`memory/YYYY-MM-DD.md`、選用的 `HEARTBEAT.md`。
      小寫根目錄 `memory.md` 僅用於舊版修復輸入；`openclaw doctor --fix`
      可以在兩個檔案都存在時將其合併到 `MEMORY.md`。
    - **State dir (`~/.openclaw`)**: 設定、頻道/提供者狀態、認證設定檔、會話、日誌，
      以及共享技能 (`~/.openclaw/skills`)。

    預設 workspace 是 `~/.openclaw/workspace`，可透過以下方式設定：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果機器人在重啟後「忘記」了內容，請確認 Gateway 在每次啟動時都使用相同的
    workspace（請記住：遠端模式使用的是 **gateway 主機的**
    workspace，而不是您的本地筆電）。

    提示：如果您想要持久的行為或偏好設定，請要求機器人 **將其寫入
    AGENTS.md 或 MEMORY.md**，而不是依賴聊天記錄。

    參閱 [Agent workspace](/zh-Hant/concepts/agent-workspace) 和 [Memory](/zh-Hant/concepts/memory)。

  </Accordion>

  <Accordion title="我可以讓 SOUL.md 更大嗎？">
    可以。`SOUL.md` 是注入到代理上下文中的工作區引導文件之一。預設的單個文件注入限制為 `20000` 個字元，
    所有文件的總引導預算為 `60000` 個字元。

    在您的 OpenClaw 配置中更改共用預設值：

    ```json5
    {
      agents: {
        defaults: {
          bootstrapMaxChars: 50000,
          bootstrapTotalMaxChars: 300000,
        },
      },
    }
    ```

    或者覆寫單個代理：

    ```json5
    {
      agents: {
        list: [
          {
            id: "main",
            bootstrapMaxChars: 50000,
            bootstrapTotalMaxChars: 300000,
          },
        ],
      },
    }
    ```

    使用 `/context` 來檢查原始大小與注入大小，以及是否發生了截斷。
    讓 `SOUL.md` 專注於語氣、立場和個性；將操作規則
    放在 `AGENTS.md` 中，並將持久事實放在記憶中。

    參見 [Context](/zh-Hant/concepts/context) 和 [Agent config](/zh-Hant/gateway/config-agents)。

  </Accordion>

  <Accordion title="建議的備份策略">
    將您的 **agent workspace** 放在一個 **私有** git repo 中，並將其備份到某個
    私有位置（例如 GitHub 私有倉庫）。這將捕獲記憶 + AGENTS/SOUL/USER
    文件，讓您以後可以還原助手的「心智」。

    **切勿** 提交 `~/.openclaw` 下的任何內容（憑證、會話、令牌或加密的秘密負載）。
    如果您需要完全還原，請分別備份工作區和狀態目錄
    （請參見上面的遷移問題）。

    文檔：[Agent workspace](/zh-Hant/concepts/agent-workspace)。

  </Accordion>

<Accordion title="我如何完全解除安裝 OpenClaw？">請參閱專用指南：[Uninstall](/zh-Hant/install/uninstall)。</Accordion>

  <Accordion title="代理可以在工作區之外工作嗎？">
    可以。工作區是**預設的目前工作目錄 (cwd)** 和記憶錨點，而不是硬性沙箱。
    相對路徑在工作區內解析，但絕對路徑可以存取其他
    主機位置，除非啟用了沙箱功能。如果您需要隔離，請使用
    [`agents.defaults.sandbox`](/zh-Hant/gateway/sandboxing) 或每個代理的沙箱設定。如果您
    希望儲存庫成為預設工作目錄，請將該代理的
    `workspace` 指向儲存庫根目錄。OpenClaw 儲存庫只是原始碼；請將
    工作區分開，除非您有意讓代理在其中工作。

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
    Session 狀態由 **gateway host** 擁有。如果您處於遠端模式，您關心的 session 儲存是在遠端機器上，而不是您的本地筆記型電腦。請參閱 [Session 管理](/zh-Hant/concepts/session)。
  </Accordion>
</AccordionGroup>

## 設定基礎

<AccordionGroup>
  <Accordion title="設定檔是什麼格式？在哪裡？">
    OpenClaw 會從 `$OPENCLAW_CONFIG_PATH` 讀取選用的 **JSON5** 設定（預設值：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果檔案不存在，它會使用相對安全的預設值（包括預設的工作區 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我設定了 gateway.bind: "lan" (或 "tailnet")，現在沒有任何監聽 / UI 顯示未授權'>
    非回環綁定 **需要有效的閘道驗證路徑**。實際上這意味著：

    - 共用金鑰驗證：token 或密碼
    - 位於正確設定的身分感知反向代理後方的 `gateway.auth.mode: "trusted-proxy"`

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

    注意事項：

    - `gateway.remote.token` / `.password` **不會**自行啟用本機閘道驗證。
    - 只有在未設定 `gateway.auth.*` 時，本機呼叫路徑才能將 `gateway.remote.*` 作為後備。
    - 對於密碼驗證，請改為設定 `gateway.auth.mode: "password"` 加上 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 是透過 SecretRef 明確設定但未解析，解析將會失敗並關閉（不會有遠端後備遮罩）。
    - 共用金鑰 Control UI 設定會透過 `connect.params.auth.token` 或 `connect.params.auth.password`（儲存在 app/UI 設定中）進行驗證。承載身分的模式（如 Tailscale Serve 或 `trusted-proxy`）則改用請求標頭。請避免將共用金鑰放在 URL 中。
    - 使用 `gateway.auth.mode: "trusted-proxy"` 時，同主機回環反向代理需要明確的 `gateway.auth.trustedProxy.allowLoopback = true` 以及 `gateway.trustedProxies` 中的回環項目。

  </Accordion>

  <Accordion title="為什麼現在在 localhost 上也需要 token？">
    OpenClaw 預設會強制執行閘道驗證，包括回送位址 (loopback)。在正常的預設路徑中，這意味著 token 驗證：如果未設定明確的驗證路徑，閘道啟動時會解析為 token 模式，並為該次啟動產生一個僅限執行時期的 token，因此 **本機 WebSocket 用戶端必須進行驗證**。當用戶端在重新啟動之間需要穩定的金鑰時，請明確設定 `gateway.auth.token`、`gateway.auth.password`、`OPENCLAW_GATEWAY_TOKEN` 或 `OPENCLAW_GATEWAY_PASSWORD`。這可以阻擋其他本機程序呼叫閘道。

    如果您偏好不同的驗證路徑，可以明確選擇密碼模式（或者，針對具備身分識別功能的反向代理，使用 `trusted-proxy`）。如果您**真的**想要開放回送位址，請在設定中明確設定 `gateway.auth.mode: "none"`。Doctor 可以隨時為您產生 token：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="變更設定後需要重新啟動嗎？">
    Gateway 會監視設定並支援熱重載：

    - `gateway.reload.mode: "hybrid"` (預設)：熱套用安全變更，關鍵變更則重新啟動
    - `hot`、`restart` 和 `off` 也有支援

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

    - `off`：隱藏標語文字，但保留橫幅標題/版本列。
    - `default`：每次都使用 `All your chats, one OpenClaw.`。
    - `random`：輪播有趣/季節性標語（預設行為）。
    - 如果您完全不想要橫幅，請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何啟用網頁搜尋（以及網頁抓取）？">
    `web_fetch` 不需要 API 金鑰。`web_search` 取決於您選擇的
    提供者：

    - 支援 API 的提供者（例如 Brave、Exa、Firecrawl、Gemini、Kimi、MiniMax Search、Perplexity 和 Tavily）需要其一般的 API 金鑰設定。
    - Grok 可以重複使用來自模型驗證的 xAI OAuth，或者回退到 `XAI_API_KEY` / 外掛程式 web-search 設定。
    - Ollama Web Search 是免金鑰的，但它使用您設定的 Ollama 主機並且需要 `ollama signin`。
    - DuckDuckGo 是免金鑰的，但它是一個非官方的 HTML 型整合。
    - SearXNG 是免金鑰/自託管的；請設定 `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`。

    **建議：** 執行 `openclaw configure --section web` 並選擇一個提供者。
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

    特定提供者的網頁搜尋設定現在位於 `plugins.entries.<plugin>.config.webSearch.*` 之下。
    舊版的 `tools.web.search.*` 提供者路徑為了相容性暫時仍會載入，但不應用於新設定。
    Firecrawl 網頁抓取回退設定位於 `plugins.entries.firecrawl.config.webFetch.*` 之下。

    注意事項：

    - 如果您使用允許清單，請新增 `web_search`/`web_fetch`/`x_search` 或 `group:web`。
    - `web_fetch` 預設為啟用（除非明確停用）。
    - 如果省略 `tools.web.fetch.provider`，OpenClaw 會從可用的憑證中自動偵測第一個就緒的抓取回退提供者。目前內建的提供者是 Firecrawl。
    - Daemons 從 `~/.openclaw/.env`（或服務環境）讀取環境變數。

    文件：[Web 工具](/zh-Hant/tools/web)。

  </Accordion>

  <Accordion title="config.apply 清空了我的設定。我該如何復原並避免再次發生？">
    `config.apply` 會取代**整個設定**。如果您傳送部分物件，其他所有內容都會被移除。

    目前的 OpenClaw 可防範許多意外覆寫的情況：

    - OpenClaw 擁有的設定寫入會在寫入前驗證完整的變更後設定。
    - 無效或具破壞性的 OpenClaw 擁有寫入會被拒絕，並儲存為 `openclaw.json.rejected.*`。
    - 如果直接編輯中斷了啟動或熱重載，Gateway 會以封閉模式失敗或跳過重載；它不會重寫 `openclaw.json`。
    - `openclaw doctor --fix` 擁有修復權限，可以還原最後已知良好的狀態，同時將被拒絕的檔案儲存為 `openclaw.json.clobbered.*`。

    復原步驟：

    - 檢查 `openclaw logs --follow` 中是否有 `Invalid config at`、`Config write rejected:` 或 `config reload skipped (invalid config)`。
    - 檢查最新 `openclaw.json.clobbered.*` 或 `openclaw.json.rejected.*` 與現行設定的差異。
    - 執行 `openclaw config validate` 和 `openclaw doctor --fix`。
    - 使用 `openclaw config set` 或 `config.patch` 僅複製預定的金鑰回來。
    - 如果您沒有最後已知良好或被拒絕的載荷，請從備份還原，或重新執行 `openclaw doctor` 並重新設定通道/模型。
    - 如果這是意外發生，請回報錯誤並附上您最後已知的設定或任何備份。
    - 本地程式碼代理通常可以從記錄或歷史記錄中重建可用的設定。

    避免方法：

    - 使用 `openclaw config set` 進行小幅變更。
    - 使用 `openclaw configure` 進行互動式編輯。
    - 當您不確確切的路徑或欄位形狀時，請先使用 `config.schema.lookup`；它會傳回淺層架構節點加上立即的子項摘要以便深入。
    - 針對部分 RPC 編輯，請使用 `config.patch`；僅將 `config.apply` 用於完整設定取代。
    - 如果您在代理執行期間使用代理導向的 `gateway` 工具，它仍會拒絕對 `tools.exec.ask` / `tools.exec.security` 的寫入（包括正規化為相同受保護執行路徑的舊版 `tools.bash.*` 別名）。

    文件：[設定](/zh-Hant/cli/config)、[Configure](/zh-Hant/cli/configure)、[Gateway 疑難排解](/zh-Hant/gateway/troubleshooting#gateway-rejected-invalid-config)、[Doctor](/zh-Hant/gateway/doctor)。

  </Accordion>

  <Accordion title="如何在跨設備上運行具備專用工作程式的中央 Gateway？">
    常見的模式是**一個 Gateway**（例如 Raspberry Pi）加上**節點**和**代理程式**：

    - **Gateway（中央）：** 擁有頻道（Signal/WhatsApp）、路由和工作階段。
    - **節點（設備）：** Mac/iOS/Android 作為外設連接並公開本機工具（`system.run`, `canvas`, `camera`）。
    - **代理程式（工作程式）：** 用於特殊角色的獨立大腦/工作區（例如「Hetzner 維運」、「個人資料」）。
    - **子代理程式：** 當您需要並行處理時，從主代理程式產生背景工作。
    - **TUI：** 連接到 Gateway 並切換代理程式/工作階段。

    文件：[節點](/zh-Hant/nodes)、[遠端存取](/zh-Hant/gateway/remote)、[多代理程式路由](/zh-Hant/concepts/multi-agent)、[子代理程式](/zh-Hant/tools/subagents)、[TUI](/zh-Hant/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 瀏覽器可以無頭模式（headless）執行嗎？">
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

    預設是 `false`（有頭模式）。無頭模式更有可能在某些網站上觸發反機器人檢查。參閱[瀏覽器](/zh-Hant/tools/browser)。

    無頭模式使用**相同的 Chromium 引擎**，並適用於大多數自動化操作（表單、點擊、爬取、登入）。主要差異如下：

    - 沒有可見的瀏覽器視窗（如果您需要視覺效果，請使用截圖）。
    - 某些網站對無頭模式下的自動化更嚴格（驗證碼、反機器人）。
      例如，X/Twitter 經常封鎖無頭工作階段。

  </Accordion>

  <Accordion title="如何使用 Brave 進行瀏覽器控制？">
    將 `browser.executablePath` 設定為您的 Brave 執行檔（或任何基於 Chromium 的瀏覽器）並重新啟動 Gateway。
    請參閱[瀏覽器](/zh-Hant/tools/browser#use-brave-or-another-chromium-based-browser)中的完整設定範例。
  </Accordion>
</AccordionGroup>

## 遠端閘道與節點

<AccordionGroup>
  <Accordion title="指令如何在 Telegram、閘道和節點之間傳播？">
    Telegram 訊息由 **閘道** 處理。閘道運行代理程式，
    並且僅在需要節點工具時才透過 **Gateway WebSocket** 呼叫節點：

    Telegram → 閘道 → 代理程式 → `node.*` → 節點 → 閘道 → Telegram

    節點看不到進入的提供者流量；它們只接收節點 RPC 呼叫。

  </Accordion>

  <Accordion title="如果 Gateway 是遠端託管的，我的 Agent 如何存取我的電腦？">
    簡答：**將您的電腦配對為節點**。Gateway 在其他地方運行，但它可以透過 Gateway WebSocket 呼叫您本機上的 `node.*` 工具（螢幕、相機、系統）。

    典型設定：

    1. 在永遠上線的主機（VPS/家用伺服器）上執行 Gateway。
    2. 將 Gateway 主機與您的電腦置於同一個 tailnet 中。
    3. 確保 Gateway WS 可到達（tailnet bind 或 SSH tunnel）。
    4. 在本機開啟 macOS 應用程式，並以 **Remote over SSH** 模式（或直接透過 tailnet）連線，以便它能註冊為節點。
    5. 在 Gateway 上核准該節點：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要單獨的 TCP 橋接器；節點透過 Gateway WebSocket 連線。

    安全提醒：配對 macOS 節點允許在該機器上進行 `system.run`。僅配對您信任的裝置，並檢閱 [Security](/zh-Hant/gateway/security)。

    文件：[Nodes](/zh-Hant/nodes)、[Gateway protocol](/zh-Hant/gateway/protocol)、[macOS remote mode](/zh-Hant/platforms/mac/remote)、[Security](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已連線但我沒收到回應。該怎麼辦？">
    檢查基本項目：

    - Gateway 正在執行：`openclaw gateway status`
    - Gateway 健康狀態：`openclaw status`
    - Channel 健康狀態：`openclaw channels status`

    然後驗證身分驗證與路由：

    - 若您使用 Tailscale Serve，請確保 `gateway.auth.allowTailscale` 設定正確。
    - 若您透過 SSH tunnel 連線，請確認本地 tunnel 已啟動並指向正確的連接埠。
    - 確認您的 allowlists（DM 或群組）包含您的帳號。

    文件：[Tailscale](/zh-Hant/gateway/tailscale)、[遠端存取](/zh-Hant/gateway/remote)、[Channels](/zh-Hant/channels)。

  </Accordion>

  <Accordion title="兩個 OpenClaw 實例可以互相通訊嗎（本機 + VPS）？">
    可以。沒有內建的「bot 對 bot」橋接器，但您可以透過幾種可靠的方式將其連接起來：

    **最簡單：**使用兩個 bot 都能存取的一般聊天頻道（Telegram/Slack/WhatsApp）。
    讓 Bot A 傳送訊息給 Bot B，然後讓 Bot B 如常回覆。

    **CLI 橋接器（通用）：**執行一個呼叫另一個 Gateway 的腳本，
    使用 `openclaw agent --message ... --deliver`，目標指向另一個 bot
    正在監聽的聊天室。如果其中一個 bot 位於遠端 VPS，請透過 SSH/Tailscale 將您的 CLI 指向該遠端 Gateway
    （請參閱 [遠端存取](/zh-Hant/gateway/remote)）。

    範例模式（從可連線至目標 Gateway 的機器執行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：加入防護措施，避免兩個 bot 無限迴圈（僅限提及、頻道
    allowlists，或「不回覆 bot 訊息」規則）。

    文件：[遠端存取](/zh-Hant/gateway/remote)、[Agent CLI](/zh-Hant/cli/agent)、[Agent send](/zh-Hant/tools/agent-send)。

  </Accordion>

  <Accordion title="多個代理是否需要分開的 VPS？">
    不需要。一個 Gateway 可以託管多個代理，每個代理都有自己的工作區、模型預設值
    和路由。這是標準設定，比為每個代理運行一個 VPS 更便宜且更簡單。

    僅當您需要強隔離（安全邊界）或非常不希望共享的不同配置時，才使用分開的 VPS。否則，請保留一個 Gateway
    並使用多個代理或子代理。

  </Accordion>

  <Accordion title="與其從 VPS 使用 SSH，在我的個人筆記型電腦上使用節點有什麼好處嗎？">
    有的 - 節點是從遠端 Gateway 連接到您的筆記型電腦的首選方式，並且它們
    解鎖的功能不僅僅是 shell 存取權限。Gateway 運行於 macOS/Linux（Windows 透過 WSL2）並且
    是輕量級的（小型 VPS 或 Raspberry Pi 級別的盒子即可；4 GB RAM 已綽綽有餘），因此一個常見的
    設定是一個始終運行的主機加上您的筆記型電腦作為一個節點。

    - **無需傳入 SSH。** 節點會向外連接到 Gateway WebSocket 並使用裝置配對。
    - **更安全的執行控制。** `system.run` 受到該筆記型電腦上的節點允許清單/批准的限制。
    - **更多裝置工具。** 除了 `system.run` 之外，節點還公開 `canvas`、`camera` 和 `screen`。
    - **本機瀏覽器自動化。** 將 Gateway 保留在 VPS 上，但透過筆記型電腦上的節點主機在本地執行 Chrome，或透過 Chrome MCP 連接到主機上的本機 Chrome。

    SSH 適合臨時的 shell 存取，但對於持續的代理工作流程和
    裝置自動化，節點更簡單。

    文件：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)、[瀏覽器](/zh-Hant/tools/browser)。

  </Accordion>

  <Accordion title="節點是否會執行閘道服務？">
    不會。除非您刻意執行獨立的設定檔（請參閱 [多重閘道](/zh-Hant/gateway/multiple-gateways)），否則每台主機應該只執行 **一個閘道**。節點是連接到閘道的外設（iOS/Android 節點，或是選單列應用程式中的 macOS「節點模式」）。若要管理無介面節點主機及 CLI 控制，請參閱 [Node host CLI](/zh-Hant/cli/node)。

    對於 `gateway`、`discovery` 和託管外掛介面變更，需要完全重新啟動。

  </Accordion>

  <Accordion title="是否有 API / RPC 方式可以套用設定？">
    有的。

    - `config.schema.lookup`：在寫入之前檢視某個設定子樹、其淺層架構節點、相符的 UI 提示以及直接的子項摘要
    - `config.get`：取得目前的快照 + 雜湊
    - `config.patch`：安全的部分更新（最適合大多數 RPC 編輯）；盡可能熱重新載入，必要時重新啟動
    - `config.apply`：驗證並取代完整設定；盡可能熱重新載入，必要時重新啟動
    - 面向代理程式的 `gateway` 執行階段工具仍然拒絕重寫 `tools.exec.ask` / `tools.exec.security`；舊版 `tools.bash.*` 別名會正規化為相同的受保護執行路徑

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

  <Accordion title="如何在 VPS 上設置 Tailscale 並從我的 Mac 連接？">
    最基本步驟：

    1. **在 VPS 上安裝並登入**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在您的 Mac 上安裝並登入**
       - 使用 Tailscale 應用程式並登入同一個 tailnet。
    3. **啟用 MagicDNS（建議）**
       - 在 Tailscale 管理主控台中啟用 MagicDNS，讓 VPS 擁有穩定的名稱。
    4. **使用 tailnet 主機名稱**
       - SSH：`ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS：`ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果您想在不使用 SSH 的情況下使用控制 UI，請在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    這會讓閘道保持綁定在 loopback，並透過 Tailscale 提供 HTTPS。請參閱 [Tailscale](/zh-Hant/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何將 Mac 節點連接到遠端閘道（Tailscale Serve）？">
    Serve 會公開 **Gateway Control UI + WS**。節點會透過同一個 Gateway WS 端點進行連接。

    建議設定：

    1. **確保 VPS 和 Mac 在同一個 tailnet 上**。
    2. **在 macOS 應用程式中使用遠端模式**（SSH 目標可以是 tailnet 主機名稱）。
       應用程式會將 Gateway 連接埠建立通道，並以節點身分連接。
    3. **在閘道上核准節點**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文件：[Gateway protocol](/zh-Hant/gateway/protocol)、[Discovery](/zh-Hant/gateway/discovery)、[macOS remote mode](/zh-Hant/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我應該在第二台筆記型電腦上安裝，還是只新增節點？">
    如果您在第二台筆記型電腦上只需要 **本機工具**（螢幕/相機/exec），請將其新增為
    **節點**。這樣可以維持單一 Gateway 並避免重複的設定。本機節點工具目前僅支援 macOS，但我們計畫將其擴充到其他作業系統。

    只有在您需要 **強隔離** 或兩個完全分開的機器人時，才安裝第二個 Gateway。

    文件：[Nodes](/zh-Hant/nodes)、[Nodes CLI](/zh-Hant/cli/nodes)、[Multiple gateways](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 環境變數與 .env 載入

<AccordionGroup>
  <Accordion title="OpenClaw 如何載入環境變數？">
    OpenClaw 從父行程（shell、launchd/systemd、CI 等）讀取環境變數，並額外載入：

    - 來自目前工作目錄的 `.env`
    - 來自 `~/.openclaw/.env`（即 `$OPENCLAW_STATE_DIR/.env`）的全局後備 `.env`

    兩個 `.env` 檔案都不會覆蓋現有的環境變數。
    提供者憑證變數是工作區 `.env` 的例外：諸如 `GEMINI_API_KEY`、`XAI_API_KEY` 或 `MISTRAL_API_KEY` 之類的索引鍵會從工作區 `.env` 中被忽略，並且應該存在於行程環境、`~/.openclaw/.env` 或設定 `env` 中。

    您也可以在設定中定義內聯環境變數（僅在行程環境中缺失時套用）：

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

  <Accordion title="我透過服務啟動了 Gateway，環境變數卻消失了。現在該怎麼辦？">
    兩個常見的修復方法：

    1. 將缺失的索引鍵放入 `~/.openclaw/.env` 中，這樣即使服務未繼承您的 shell 環境，也能讀取這些索引鍵。
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

    這會執行您的登入 shell 並僅匯入缺失的預期索引鍵（絕不覆蓋）。對應的環境變數為：
    `OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我設定了 COPILOT_GITHUB_TOKEN，但模型狀態顯示 "Shell env: off."，為什麼？'>
    `openclaw models status` 回報是否啟用了 **shell env import**（Shell 環境匯入）。「Shell env: off」並**不**表示缺少您的環境變數——這只是意味著 OpenClaw 不會自動載入您的登入 Shell。

    如果 Gateway 以服務形式執行（launchd/systemd），它將不會繼承您的 Shell 環境。請透過以下任一方式修正：

    1. 將 token 放入 `~/.openclaw/.env`：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或啟用 shell 匯入（`env.shellEnv.enabled: true`）。
    3. 或將其加入您的 config `env` 區塊（僅在缺少時適用）。

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
  <Accordion title="我該如何開始一個新的對話？">
    傳送 `/new` 或 `/reset` 作為獨立訊息。請參閱 [Session management](/zh-Hant/concepts/session)。
  </Accordion>

  <Accordion title="如果我不傳送 /new，sessions 會自動重置嗎？">
    Sessions 可能會在 `session.idleMinutes` 後過期，但這是 **預設停用** 的（預設值為 **0**）。
    將其設為正值以啟用閒置過期。啟用後，閒置期間之後的**下一條**訊息會為該 chat key 啟動一個新的 session id。這不會刪除對話紀錄——它只是啟動一個新的 session。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有沒有辦法組建一個 OpenClaw 實例團隊（一個 CEO 和多個代理）？">
    是的，透過**多代理路由**和**子代理**。您可以建立一個協調器
    代理和幾個擁有各自工作空間和模型的 worker 代理。

    話雖如此，這最好被視為一種**有趣的實驗**。這非常耗費 token，而且通常
    比使用一個具有多個獨立會話的機器人效率更低。我們設想的典型模型
    是您與一個機器人對話，並使用不同的會話進行並行工作。該
    機器人也可以在需要時生成子代理。

    文檔：[多代理路由](/zh-Hant/concepts/multi-agent)、[子代理](/zh-Hant/tools/subagents)、[代理 CLI](/zh-Hant/cli/agents)。

  </Accordion>

  <Accordion title="為什麼上下文在任務中途被截斷了？如何防止這種情況？">
    會話上下文受到模型窗口的限制。長時間的對話、大量的工具輸出或許多
    檔案都可能觸發壓縮或截斷。

    以下方法有幫助：

    - 要求機器人總結當前狀態並將其寫入檔案。
    - 在長時間任務前使用 `/compact`，並在切換主題時使用 `/new`。
    - 將重要的上下文保留在工作空間中，並要求機器人讀回它。
    - 對於長時間或並行工作使用子代理，以便主對話保持較小。
    - 如果這種情況經常發生，請選擇一個具有更大上下文窗口的模型。

  </Accordion>

  <Accordion title="如何完全重置 OpenClaw 但保留已安裝的狀態？">
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

    注意事項：

    - 如果入職程式偵測到現有的配置，它也會提供**重置**選項。請參閱[入職 (CLI)](/zh-Hant/start/wizard)。
    - 如果您使用了設定檔 (`--profile` / `OPENCLAW_PROFILE`)，請重置每個狀態目錄（預設為 `~/.openclaw-<profile>`）。
    - 開發重置：`openclaw gateway --dev --reset` (僅限開發；清除開發配置 + 憑證 + 會話 + 工作空間)。

  </Accordion>

  <Accordion title='我遇到「context too large」錯誤 - 如何重置或壓縮？'>
    使用以下其中一種方法：

    - **壓縮 (Compact)**（保留對話但摘要較舊的回合）：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 來引導摘要產生。

    - **重置 (Reset)**（為相同的聊天金鑰建立全新的 session ID）：

      ```
      /new
      /reset
      ```

    如果問題持續發生：

    - 啟用或調整 **session pruning**（`agents.defaults.contextPruning`）以修剪舊的工具輸出。
    - 使用具有更大 context window 的模型。

    文件：[壓縮 (Compaction)](/zh-Hant/concepts/compaction)、[Session pruning](/zh-Hant/concepts/session-pruning)、[Session management](/zh-Hant/concepts/session)。

  </Accordion>

  <Accordion title='為什麼我看到「LLM request rejected: messages.content.tool_use.input field required」錯誤？'>
    這是一個提供者驗證錯誤：模型發出了 `tool_use` 區塊，但未包含必要的
    `input`。這通常表示 session 歷程記錄已過時或損壞（通常發生在長對話之後
    或工具/結構描述變更後）。

    解決方法：使用 `/new` 開始一個新的 session（獨立訊息）。

  </Accordion>

  <Accordion title="為什麼我每 30 分鐘會收到 heartbeat 訊息？">
    Heartbeats 預設每 **30 分鐘** 執行一次（使用 OAuth 驗證時為 **1 小時**）。您可以調整或停用它們：

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

    如果 `HEARTBEAT.md` 存在但實際上是空的（只有空行和 markdown
    標題，如 `# Heading`），OpenClaw 會跳過 heartbeat 執行以節省 API 呼叫。
    如果檔案不存在，heartbeat 仍會執行，並由模型決定該做什麼。

    每個代理的覆寫設定使用 `agents.list[].heartbeat`。文件：[Heartbeat](/zh-Hant/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我是否需要將「機器人帳號」加入到 WhatsApp 群組？'>
    不需要。OpenClaw 運行在**您自己的帳號**上，所以如果您在群組中，OpenClaw 就能看到它。
    預設情況下，群組回覆會被阻擋，直到您允許發送者 (`groupPolicy: "allowlist"`)。

    如果您只希望**您自己**能夠觸發群組回覆：

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

  <Accordion title="我如何取得 WhatsApp 群組的 JID？">
    選項 1 (最快)：監看日誌並在群組中傳送測試訊息：

    ```bash
    openclaw logs --follow --json
    ```

    尋找以 `@g.us` 結尾的 `chatId` (或 `from`)，例如：
    `1234567890-1234567890@g.us`。

    選項 2 (如果已經配置/加入白名單)：從配置列出群組：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文件：[WhatsApp](/zh-Hant/channels/whatsapp)、[目錄](/zh-Hant/cli/directory)、[日誌](/zh-Hant/cli/logs)。

  </Accordion>

  <Accordion title="為什麼 OpenClaw 不在群組中回覆？">
    兩個常見原因：

    - 提及閘門已開啟 (預設)。您必須 @提及機器人 (或符合 `mentionPatterns`)。
    - 您配置了 `channels.whatsapp.groups` 但沒有 `"*"`，且該群組未被加入白名單。

    參閱 [群組](/zh-Hant/channels/groups) 和 [群組訊息](/zh-Hant/channels/group-messages)。

  </Accordion>

<Accordion title="群組/主題串會與 DM 共用上下文嗎？">直接聊天預設會合併到主會話。群組/頻道有自己的會話金鑰，而 Telegram 主題 / Discord 主題串是分開的會話。參閱 [群組](/zh-Hant/channels/groups) 和 [群組訊息](/zh-Hant/channels/group-messages)。</Accordion>

  <Accordion title="我可以建立多少個工作區和代理程式？">
    沒有硬性限制。幾十個（甚至幾百個）都沒問題，但需注意：

    - **磁碟空間增長：** 工作階段和對話記錄儲存在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本：** 代理程式越多代表並行使用模型的次數越多。
    - **維運負擔：** 每個代理程式的驗證設定檔、工作區以及通道路由。

    建議：

    - 每個代理程式維持一個 **作用中** 的工作區（`agents.defaults.workspace`）。
    - 如果磁碟空間增加，請清理舊的工作階段（刪除 JSONL 或儲存項目）。
    - 使用 `openclaw doctor` 來找出遺留的工作區和設定檔不符的問題。

  </Accordion>

  <Accordion title="我可以同時執行多個機器人或聊天嗎？">
    可以。使用 **Multi-Agent Routing** 來執行多個隔離的代理程式，並根據通道/帳號/對等端路由傳入訊息。Slack 支援作為通道，並可綁定至特定的代理程式。

    瀏覽器存取功能強大，但並非「人類能做的一切都能做」——反機器人檢測、CAPTCHA 和 MFA 仍可能阻擋自動化。為了最可靠的瀏覽器控制，請在主機上使用本機 Chrome MCP，或在實際執行瀏覽器的機器上使用 CDP。

    最佳實務設定：

    - 常駐的 Gateway 主機（VPS/Mac mini）。
    - 每個角色一個代理程式（綁定）。
    - 綁定至這些代理程式的 Slack 頻道。
    - 視需要透過 Chrome MCP 或節點使用本機瀏覽器。

    文件：[Multi-Agent Routing](/zh-Hant/concepts/multi-agent)、[Slack](/zh-Hant/channels/slack)、
    [Browser](/zh-Hant/tools/browser)、[Nodes](/zh-Hant/nodes)。

  </Accordion>
</AccordionGroup>

## 模型、故障移轉與驗證設定檔

模型常見問題 — 預設值、選擇、別名、切換、故障移轉、驗證設定檔 —
位於 [Models FAQ](/zh-Hant/help/faq-models)。

## Gateway：連接埠、「正在執行」與遠端模式

<AccordionGroup>
  <Accordion title="Gateway 使用哪個連接埠？">
    `gateway.port` 控制用於 WebSocket + HTTP（控制 UI、hooks 等）的單一多工連接埠。

    優先順序：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='為什麼 openclaw gateway status 顯示「Runtime: running」，但「Connectivity probe: failed」？'>
    因為「running」是 **supervisor** 的視角（launchd/systemd/schtasks）。連線探測則是 CLI 實際連線到 gateway WebSocket 的結果。

    使用 `openclaw gateway status` 並參考以下幾行資訊：

    - `Probe target:`（探測實際使用的 URL）
    - `Listening:`（連接埠上實際綁定的內容）
    - `Last gateway error:`（常見根本原因：程序雖然存活，但連接埠未在監聽）

  </Accordion>

  <Accordion title='為什麼 openclaw gateway status 顯示的「Config (cli)」與「Config (service)」不同？'>
    您正在編輯一個設定檔，但服務執行的卻是另一個（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不一致）。

    修正方法：

    ```bash
    openclaw gateway install --force
    ```

    請從您希望服務使用的同一個 `--profile` / 環境中執行上述指令。

  </Accordion>

  <Accordion title='「another gateway instance is already listening」是什麼意思？'>
    OpenClaw 會在啟動時立即綁定 WebSocket 監聽器來執行執行時鎖定（預設 `ws://127.0.0.1:18789`）。如果綁定失敗並出現 `EADDRINUSE`，就會拋出 `GatewayLockError`，表示已有另一個實例正在監聽。

    修正方法：停止另一個實例、釋放連接埠，或是使用 `openclaw gateway --port <port>` 執行。

  </Accordion>

  <Accordion title="我如何在遠端模式下執行 OpenClaw（客戶端連線到其他地方的 Gateway）？">
    設定 `gateway.mode: "remote"` 並指向遠端 WebSocket URL，並選擇性使用共享金鑰的遠端憑證：

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
    - macOS 應用程式會監看設定檔，並在這些數值變更時即時切換模式。
    - `gateway.remote.token` / `.password` 僅是客戶端遠端憑證；它們本身並不啟用本機 gateway 驗證。

  </Accordion>

  <Accordion title='控制 UI 顯示「未授權」（或持續重新連線）。現在該怎麼辦？'>
    您的閘道驗證路徑與 UI 的驗證方法不符。

    事實（來源代碼）：

    - 控制 UI 會將權杖保留在 `sessionStorage` 中，用於當前瀏覽器分頁會話和選定的閘道 URL，因此同分頁重新整理能持續運作，而無需還原長期的 localStorage 權杖持久性。
    - 在 `AUTH_TOKEN_MISMATCH` 上，當閘道返回重試提示（`canRetryWithDeviceToken=true`、`recommendedNextStep=retry_with_device_token`）時，受信任的客戶端可以使用快取的裝置權杖嘗試一次有限的重試。
    - 該快取權杖重試現在會重複使用隨裝置權杖儲存的已快取核准範圍。明確的 `deviceToken` / 明確的 `scopes` 呼叫端仍會保留其請求的範圍集，而不是繼承快取的範圍。
    - 在該重試路徑之外，連線驗證優先順序為：先明確共享權杖/密碼，然後是明確的 `deviceToken`，接著是儲存的裝置權杖，最後是啟動權杖。
    - 內建的 setup-code 啟動僅適用於節點。核准後，它會返回具有 `scopes: []` 的節點裝置權杖，而不會返回移交的操作員權杖。

    修復方法：

    - 最快的方法：`openclaw dashboard`（列印並複製儀表板 URL，嘗試開啟；如果是無頭模式則顯示 SSH 提示）。
    - 如果您還沒有權杖：`openclaw doctor --generate-gateway-token`。
    - 如果是遠端：先建立通道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 然後開啟 `http://127.0.0.1:18789/`。
    - 共享金鑰模式：設定 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然後將匹配的金鑰貼到控制 UI 設定中。
    - Tailscale Serve 模式：確保 `gateway.auth.allowTailscale` 已啟用，並且您開啟的是 Serve URL，而不是繞過 Tailscale 身分標頭的原始回送/tailnet URL。
    - 受信任代理模式：確保您是透過設定的身分感知代理連線，而不是原始閘道 URL。同主機回送代理也需要 `gateway.auth.trustedProxy.allowLoopback = true`。
    - 如果在一次重試後不匹配仍然存在，請輪換/重新核准配對的裝置權杖：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 如果該輪換呼叫顯示被拒絕，請檢查兩件事：
      - 配對裝置會話只能輪換其**自己的**裝置，除非它們還具有 `operator.admin`
      - 明確的 `--scope` 值不能超過呼叫端當前的操作員範圍
    - 還是卡住了？執行 `openclaw status --all` 並遵循 [疑難排解](/zh-Hant/gateway/troubleshooting)。請參閱 [儀表板](/zh-Hant/web/dashboard) 以了解驗證詳情。

  </Accordion>

  <Accordion title="I set gateway.bind tailnet but it cannot bind and nothing listens">
    `tailnet` bind 會從您的網路介面 (100.64.0.0/10) 中選取一個 Tailscale IP。如果該機器不在 Tailscale 上（或介面已關閉），則沒有可供綁定的對象。

    修復方法：

    - 在該主機上啟動 Tailscale（使其擁有 100.x 位址），或
    - 切換至 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是明確指定的。`auto` 偏好 loopback；當您需要僅限 tailnet 的綁定時，請使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="Can I run multiple Gateways on the same host?">
    通常不行 - 一個 Gateway 可以執行多個訊息通道和代理程式。僅當您需要冗餘（例如：救援機器人）或強制隔離時，才使用多個 Gateway。

    可以，但您必須進行隔離：

    - `OPENCLAW_CONFIG_PATH`（每個執行個體的設定）
    - `OPENCLAW_STATE_DIR`（每個執行個體的狀態）
    - `agents.defaults.workspace`（工作區隔離）
    - `gateway.port`（唯一連接埠）

    快速設定（建議）：

    - 每個執行個體使用 `openclaw --profile <name> ...`（自動建立 `~/.openclaw-<name>`）。
    - 在每個 profile 設定中設定唯一的 `gateway.port`（或在手動執行時傳遞 `--port`）。
    - 安裝針對每個 profile 的服務：`openclaw --profile <name> gateway install`。

    Profiles 也會為服務名稱加上後綴（`ai.openclaw.<profile>`；舊版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
    完整指南：[Multiple gateways](/zh-Hant/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='「無效的交握」/ 錯誤碼 1008 是什麼意思？'>
    Gateway 是一個 **WebSocket 伺服器**，它預期收到的第一則訊息必須是
    一個 `connect` 影格。如果收到其他任何內容，它會以 **錯誤碼 1008**（原則違規）關閉連線。

    常見原因：

    - 您在瀏覽器中開啟了 **HTTP** URL (`http://...`)，而不是使用 WebSocket 客戶端。
    - 您使用了錯誤的連接埠或路徑。
    - 代理伺服器或通道移除了驗證標頭，或傳送了非 Gateway 的請求。

    快速修復方法：

    1. 使用 WS URL：`ws://<host>:18789` (如果是 HTTPS 則為 `wss://...`)。
    2. 不要在一般的瀏覽器分頁中開啟 WS 連接埠。
    3. 如果開啟了驗證，請在 `connect` 影格中包含 token/密碼。

    如果您使用的是 CLI 或 TUI，URL 應該看起來像這樣：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    通訊協定詳細資訊：[Gateway protocol](/zh-Hant/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 記錄與除錯

<AccordionGroup>
  <Accordion title="記錄檔在哪裡？">
    檔案記錄（結構化）：

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    您可以透過 `logging.file` 設定穩定的路徑。檔案記錄層級由 `logging.level` 控制。主控台詳細程度由 `--verbose` 和 `logging.consoleLevel` 控制。

    最快速的記錄追蹤：

    ```bash
    openclaw logs --follow
    ```

    服務/監督者記錄（當 gateway 透過 launchd/systemd 執行時）：

    - macOS launchd stdout：`~/Library/Logs/openclaw/gateway.log` (設定檔使用 `gateway-<profile>.log`；stderr 會被抑制)
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    更多資訊請參閱 [Troubleshooting](/zh-Hant/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="如何啟動/停止/重新啟動 Gateway 服務？">
    使用 gateway 輔助指令：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行 gateway，`openclaw gateway --force` 可以回收連接埠。請參閱 [Gateway](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="我在 Windows 上關閉了終端機——如何重新啟動 OpenClaw？">
    有 **兩種 Windows 安裝模式**：

    **1) WSL2（推薦）：** 閘道 執行於 Linux 環境中。

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

    **2) 原生 Windows（不推薦）：** 閘道 直接在 Windows 中執行。

    開啟 PowerShell 並執行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果您手動執行（無服務），請使用：

    ```powershell
    openclaw gateway run
    ```

    文件：[Windows (WSL2)](/zh-Hant/platforms/windows)、[Gateway service runbook](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="閘道已啟動但從未收到回應。我應檢查什麼？">
    先進行快速健康檢查：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常見原因：

    - 模型驗證未在 **gateway host** 上載入（請檢查 `models status`）。
    - 頻道配對/允許清單封鎖了回應（請檢查頻道設定與紀錄檔）。
    - WebChat/Dashboard 已開啟但未使用正確的 Token。

    如果您是透過遠端連線，請確認通道/Tailscale 連線正常，且
    Gateway WebSocket 可連線。

    文件：[Channels](/zh-Hant/channels)、[Troubleshooting](/zh-Hant/gateway/troubleshooting)、[Remote access](/zh-Hant/gateway/remote)。

  </Accordion>

  <Accordion title='"Disconnected from gateway: no reason" - 接下來該怎麼辦？'>
    這通常表示 UI 失去了 WebSocket 連線。請檢查：

    1. Gateway 是否正在執行？`openclaw gateway status`
    2. Gateway 是否健康？`openclaw status`
    3. UI 是否有正確的 Token？`openclaw dashboard`
    4. 如果是遠端連線，通道/Tailscale 連線是否正常？

    然後查看紀錄檔：

    ```bash
    openclaw logs --follow
    ```

    文件：[Dashboard](/zh-Hant/web/dashboard)、[Remote access](/zh-Hant/gateway/remote)、[Troubleshooting](/zh-Hant/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失敗。我應該檢查什麼？">
    首先檢查日誌和頻道狀態：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然後比對錯誤：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 選單的項目過多。OpenClaw 已經修剪至 Telegram 的限制並以較少的指令重試，但仍需要刪除部分選單項目。減少外掛程式/技能/自訂指令，或者如果您不需要選單，請停用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或類似的網路錯誤：如果您在 VPS 上或位於代理伺服器後方，請確認允許傳出 HTTPS 且 DNS 對 `api.telegram.org` 正常運作。

    如果 Gateway 是遠端的，請確保您正在檢視 Gateway 主機上的日誌。

    文件：[Telegram](/zh-Hant/channels/telegram)、[頻道疑難排解](/zh-Hant/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 沒有顯示輸出。我應該檢查什麼？">
    首先確認 Gateway 可以連線且代理程式可以執行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 來查看目前狀態。如果您預期在聊天
    頻道中收到回覆，請確保已啟用傳遞功能 (`/deliver on`)。

    文件：[TUI](/zh-Hant/web/tui)、[斜線指令](/zh-Hant/tools/slash-commands)。

  </Accordion>

  <Accordion title="我該如何完全停止然後啟動 Gateway？">
    如果您已安裝服務：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    這會停止/啟動 **受監控的服務** (macOS 上的 launchd，Linux 上的 systemd)。
    當 Gateway 作為幕後程式 在背景執行時使用此方法。

    如果您在前台執行，請使用 Ctrl-C 停止，然後：

    ```bash
    openclaw gateway run
    ```

    文件：[Gateway 服務手冊](/zh-Hant/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: 重新啟動**背景服務** (launchd/systemd)。
    - `openclaw gateway`: 在此終端機階段中**於前景**執行 gateway。

    如果您安裝了服務，請使用 gateway 指令。當您想要單次前景執行時，請使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    使用 `--verbose` 啟動 Gateway 以取得更多主控台細節。然後檢查日誌檔案以了解頻道認證、模型路由和 RPC 錯誤。
  </Accordion>
</AccordionGroup>

## 媒體與附件

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    代理程式的輸出附件必須使用結構化媒體欄位，例如 `media`、`mediaUrl`、`path` 或 `filePath`。請參閱 [OpenClaw assistant setup](/zh-Hant/start/openclaw) 和 [Agent send](/zh-Hant/tools/agent-send)。

    CLI 傳送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    亦請檢查：

    - 目標頻道支援輸出媒體且未受到允許清單封鎖。
    - 檔案在提供者的大小限制內 (圖片會調整大小至最大 2048px)。
    - `tools.fs.workspaceOnly=true` 將本機路徑傳送限制在工作區、temp/media-store 和沙箱驗證的檔案內。
    - `tools.fs.workspaceOnly=false` 允許結構化本機媒體傳送使用代理程式已可讀取的主機本機檔案，但僅限於媒體加上安全文件類型 (圖片、音訊、視訊、PDF、Office 文件，以及已驗證的文字文件，例如 Markdown/MD、TXT、JSON、YAML 和 YML)。這不是秘密掃描器：當副檔名和內容驗證相符時，可以附加代理程式可讀取的 `secret.txt` 或 `config.json`。請將敏感檔案保留在代理程式可讀取的路徑之外，或維持 `tools.fs.workspaceOnly=true` 以進行更嚴格的本機路徑傳送。

    請參閱 [Images](/zh-Hant/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全性與存取控制

<AccordionGroup>
  <Accordion title="讓 OpenClaw 接收傳入的私人訊息（DM）安全嗎？">
    將傳入的私人訊息視為不受信任的輸入。預設值的設計旨在降低風險：

    - 支援私人訊息的頻道，其預設行為為 **配對**：
      - 未知的發送者會收到配對碼；機器人不會處理他們的訊息。
      - 使用以下指令批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 每個頻道的待處理請求上限為 **3 個**；如果未收到代碼，請檢查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公開開放私人訊息需要明確選擇加入（`dmPolicy: "open"` 與允許清單 `"*"`）。

    執行 `openclaw doctor` 以顯示有風險的私人訊息政策。

  </Accordion>

  <Accordion title="提示詞注入（prompt injection）是否僅是公開機器人需要關注的問題？">
    不是。提示詞注入涉及的是 **不受信任的內容**，而不僅僅是誰能傳送私人訊息給機器人。
    如果您的助理讀取外部內容（網頁搜尋/擷取、瀏覽器頁面、電子郵件、
    文件、附件、貼上的日誌），該內容可能包含試圖
    挾持模型的指令。即使 **您是唯一的發送者**，這種情況也可能發生。

    當啟用工具時風險最大：模型可能被誘騙而
    洩漏上下文內容或代表您呼叫工具。您可以透過以下方式降低影響範圍：

    - 使用唯讀或已停用工具的「讀取器」代理程式來摘要不受信任的內容
    - 對已啟用工具的代理程式，保持 `web_search` / `web_fetch` / `browser` 為關閉狀態
    - 將解碼後的檔案/文件文字也視為不受信任：OpenResponses
      `input_file` 和媒體附件擷取功能會將擷取的文字包裝在
      明確的外部內容邊界標記中，而不是直接傳遞原始檔案文字
    - 沙箱機制與嚴格的工具允許清單

    詳細資訊：[安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="OpenClaw 因使用 TypeScript/Node 而非 Rust/WASM，是否較不安全？">
    程式語言與執行環境固然重要，但它們並非個人代理程式的主要風險來源。實務上 OpenClaw 的風險在於：閘道暴露、誰能傳訊給機器人、提示詞注入、工具範圍、憑證處理、瀏覽器存取權、執行存取權，以及對第三方技能或外掛的信任。

    Rust 和 WASM 可以為某些類別的程式碼提供更強的隔離，但它們無法解決提示詞注入、不良的允許清單、公開閘道暴露、過於寬泛的工具，或是已登入敏感帳號的瀏覽器設定檔等問題。請將下列視為主要控制手段：

    - 將 Gateway 設為私有或啟用驗證
    - 對私訊和群組使用配對與允許清單
    - 針對不受信任的輸入拒絕或沙盒化風險工具
    - 僅安裝受信任的外掛與技能
    - 在變更設定後執行 `openclaw security audit --deep`

    詳細資訊：[Security](/zh-Hant/gateway/security)、[Sandboxing](/zh-Hant/gateway/sandboxing)。

  </Accordion>

  <Accordion title="我看到有關 OpenClaw 實例暴露的報告。我應該檢查什麼？">
    首先檢查您的實際部署情況：

    ```bash
    openclaw security audit --deep
    openclaw gateway status
    ```

    更安全的基準是：

    - Gateway 綁定到 `loopback`，或僅透過經過驗證的私人
      存取（例如 tailnet、SSH 隧道、Token/密碼驗證或正確
      設定的受信任代理）來暴露
    - 處於 `pairing` 或 `allowlist` 模式下的 DM
    - 群組已加入白名單並設有提及閘門，除非每個成員都受信任
    - 高風險工具（`exec`、`browser`、`gateway`、`cron`）被拒絕或受到嚴格
      限制，僅限於讀取不受信任內容的代理
    - 在工具執行需要較小爆炸半徑的地方啟用沙盒機制

    沒有驗證的公開綁定、帶有工具的開放 DM/群組以及暴露的瀏覽器
    控制是首當其衝需要修復的問題。詳情：
    [安全稽核檢查清單](/zh-Hant/gateway/security#security-audit-checklist)。

  </Accordion>

  <Accordion title="安裝 ClawHub 技能與第三方外掛安全嗎？">
    請將第三方技能與外掛視為您選擇信任的程式碼。
    ClawHub 技能頁面會在安裝前公開掃描狀態，而 OpenClaw 外掛
    安裝/更新流程會執行內建的危險程式碼檢查，但掃描並非
    完整的安全邊界。

    更安全的模式：

    - 優先選擇受信任的作者與鎖定版本
    - 在啟用技能或外掛前先閱讀其內容
    - 保持外掛與技能的允許清單狹窄
    - 在具備最少工具的沙箱中執行不受信任輸入的工作流程
    - 避免給予第三方程式碼廣泛的檔案系統、執行、瀏覽器或秘密存取權

    詳情：[技能](/zh-Hant/tools/skills)、[外掛](/zh-Hant/tools/plugin)、
    [安全性](/zh-Hant/gateway/security)。

  </Accordion>

  <Accordion title="我的機器人應該有自己的電子郵件、GitHub 帳號或電話號碼嗎？">
    是的，對於大多數設定而言。使用獨立的帳號與電話號碼隔離機器人，
    可在發生問題時減少波及範圍。這也能讓您更容易輪換
    憑證或撤銷存取權，而不會影響您的個人帳號。

    從小處著手。僅授予您實際需要的工具與帳號存取權，
    之後如有需要再擴充。

    文件：[安全性](/zh-Hant/gateway/security)、[配對](/zh-Hant/channels/pairing)。

  </Accordion>

  <Accordion title="我可以讓它自主控制我的簡訊嗎？這樣安全嗎？">
    我們**不**建議對您的個人訊息給予完全自主權。最安全的模式是：

    - 將直訊保持在 **配對模式** 或嚴格的允許清單中。
    - 如果您希望它代表您發送訊息，請使用 **獨立的號碼或帳號**。
    - 讓它草擬內容，然後 **在發送前進行審核**。

    如果您想要進行實驗，請在專用帳號上進行並保持隔離。請參閱
    [安全性](/zh-Hant/gateway/security)。

  </Accordion>

<Accordion title="我可以在個人助理任務中使用更便宜的模型嗎？">可以，**如果**該代理僅用於聊天且輸入是受信任的。較低層級的模型更容易受到指令劫持，因此請避免將其用於啟用工具的代理或在讀取不受信任的內容時使用。如果您必須使用較小的模型，請鎖定工具並在沙盒中執行。請參閱 [Security](/zh-Hant/gateway/security)。</Accordion>

  <Accordion title="我在 Telegram 中執行了 /start 但沒有收到配對碼">
    配對碼**僅**在未知發送者向機器人發送訊息且啟用了 `dmPolicy: "pairing"` 時才會發送。單獨的 `/start` 不會產生代碼。

    檢查待處理請求：

    ```bash
    openclaw pairing list telegram
    ```

    如果您希望立即存取，請將您的發送者 ID 加入允許清單，或為該帳戶設定 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它會傳訊息給我的聯絡人嗎？配對如何運作？">
    不會。預設的 WhatsApp 直接訊息 策略是 **配對**。未知發送者只會收到配對碼，且其訊息**不會被處理**。OpenClaw 只會回覆它收到的聊天或您觸發的明確發送。

    使用以下指令批准配對：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待處理請求：

    ```bash
    openclaw pairing list whatsapp
    ```

    精靈電話號碼提示：它用於設定您的 **allowlist/owner**，以便允許您自己的直接訊息。它不用於自動傳送。如果您在個人的 WhatsApp 號碼上執行，請使用該號碼並啟用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天指令、中止任務和「它無法停止」

<AccordionGroup>
  <Accordion title="如何停止內部系統訊息顯示在聊天中？">
    大多數內部或工具訊息僅在針對該工作階段啟用 **verbose**、**trace** 或 **reasoning** 時才會出現。

    在顯示該訊息的聊天中進行修復：

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    如果仍然顯得雜亂，請檢查控制 UI 中的工作階段設定，並將 verbose 設定為 **inherit**（繼承）。同時請確認您未在設定中使用將 `verboseDefault` 設定為 `on` 的 bot 檔案。

    文件：[Thinking and verbose](/zh-Hant/tools/thinking)、[Security](/zh-Hant/gateway/security/index#reasoning-and-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在執行的任務？">
    發送以下任何一項 **作為獨立訊息**（無需斜線）：

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

    大多數指令必須作為以 `/` 開頭的 **獨立** 訊息發送，但少數捷徑（例如 `/status`）對於允許清單中的發送者也可以在行內使用。

  </Accordion>

  <Accordion title='如何從 Telegram 發送 Discord 訊息？（"Cross-context messaging denied"）'>
    OpenClaw 預設會阻擋 **跨提供者** 訊息傳送。如果工具呼叫綁定到 Telegram，除非您明確允許，否則它不會發送到 Discord。

    為代理程式啟用跨提供者訊息傳送：

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

    編輯設定後，請重新啟動閘道。

  </Accordion>

  <Accordion title='為什麼機器人感覺像是「忽略」了連續快速傳送的訊息？'>
    執行中的提示預設會被引導至現有的執行。請使用 `/queue` 來選擇執行中行為：

    - `steer` - 在下一個模型邊界引導現有執行
    - `followup` - 將訊息加入佇列，並在當前執行結束後逐一執行
    - `collect` - 將相容訊息加入佇列，並在當前執行結束後回覆一次
    - `interrupt` - 中止當前執行並重新開始

    預設模式為 `steer`。您可以為佇列模式新增諸如 `debounce:0.5s cap:25 drop:summarize` 的選項。請參閱[指令佇列](/zh-Hant/concepts/queue)和[引導佇列](/zh-Hant/concepts/queue-steering)。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title="使用 API 金鑰時，Anthropic 的預設模型是什麼？">
    在 OpenClaw 中，憑證與模型選擇是分開的。設定 `ANTHROPIC_API_KEY`（或在設定檔中儲存 Anthropic API 金鑰）會啟用驗證，但實際的預設模型取決於您在 `agents.defaults.model.primary` 中的設定（例如 `anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果您看到 `No credentials found for profile "anthropic:default"`，表示 Gateway 無法在執行中代理程式的預期 `auth-profiles.json` 中找到
    Anthropic 憑證。
  </Accordion>
</AccordionGroup>

---

還是卡住了？請在 [Discord](https://discord.com/invite/clawd) 提問或開啟 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。

## 相關

- [首次執行常見問題](/zh-Hant/help/faq-first-run) — 安裝、入門、驗證、訂閱、早期故障
- [模型常見問題](/zh-Hant/help/faq-models) — 模型選擇、故障轉移、驗證設定檔
- [疑難排解](/zh-Hant/help/troubleshooting) — 以症狀為優先的分診
