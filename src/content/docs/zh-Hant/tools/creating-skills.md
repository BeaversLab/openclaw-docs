---
summary: "使用 SKILL.md 建構並測試自訂工作區技能"
title: "建立技能"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

技能會教導代理如何以及何時使用工具。每個技能都是一個目錄，其中包含一個帶有 YAML 前置資訊和 Markdown 指令的 `SKILL.md` 檔案。

如需了解技能如何載入與設定優先順序，請參閱 [Skills](/zh-Hant/tools/skills)。

## 建立您的第一個技能

<Steps>
  <Step title="建立技能目錄">
    技能位於您的工作區中。建立一個新資料夾：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

  </Step>

  <Step title="撰寫 SKILL.md">
    在該目錄中建立 `SKILL.md`。Frontmatter 定義了中繼資料，
    而 markdown 主體包含給代理程式的指示。

    ```markdown
    ---
    name: hello-world
    description: A simple skill that says hello.
    ---

    # Hello World Skill

    When the user asks for a greeting, use the `echo` tool to say
    "Hello from your custom skill!".
    ```

    技能的 `name` 請使用小寫字母、數字和連字號的連字號寫法（hyphen-case）。
    請保持資料夾名稱與 frontmatter 中的 `name` 一致。

  </Step>

  <Step title="新增工具（選用）">
    您可以在 frontmatter 中定義自訂工具架構，或指示代理程式
    使用現有的系統工具（例如 `exec` 或 `browser`）。技能也可以
    隨同其記載的工具一起在插件內發布。

  </Step>

  <Step title="載入技能">
    啟動新的工作階段，讓 OpenClaw 載入該技能：

    ```bash
    # From chat
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

    驗證技能是否已載入：

    ```bash
    openclaw skills list
    ```

  </Step>

  <Step title="進行測試">
    傳送一則應觸發該技能的訊息：

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    或者直接與代理交談並要求打招呼。

  </Step>
</Steps>

## 技能元資料參考

YAML 前置資訊支援以下欄位：

| 欄位                                | 必要 | 說明                                      |
| ----------------------------------- | ---- | ----------------------------------------- |
| `name`                              | 是   | 使用小寫字母、數字和連字號的唯一識別碼    |
| `description`                       | 是   | 顯示給代理的單行描述                      |
| `metadata.openclaw.os`              | 否   | OS 篩選器（`["darwin"]`、`["linux"]` 等） |
| `metadata.openclaw.requires.bins`   | 否   | PATH 中必要的二元檔案                     |
| `metadata.openclaw.requires.config` | 否   | 必要的設定金鑰                            |

## 進階功能

一旦基本技能運作正常，這些欄位有助於使其更可靠且便於移植：

- **條件式啟用** — 使用 `requires.bins`、`requires.env` 或
  `requires.config` 僅在所需相依項目可用時載入技能。請參閱 [Skills reference: gating](/zh-Hant/tools/skills#gating)。
- **環境變數與 API 金鑰連線** — 使用 `skills.entries.<name>.env` 和
  `skills.entries.<name>.apiKey` 將主機端環境變數注入至技能
  輪次。請參閱 [Skills reference: config wiring](/zh-Hant/tools/skills#config-wiring)。
- **叫用控制** — 設定 `user-invocable: false` 以隱藏斜線指令，
  或設定 `disable-model-invocation: true` 以讓指令樣式的技能不出現在
  模型提示中。請參閱 [Skills reference: frontmatter](/zh-Hant/tools/skills#frontmatter)。
- **直接指令分派** — 當斜線指令應直接呼叫工具而非透過模型路由時，
  請搭配 `command-tool` 使用 `command-dispatch: tool`。
- **可移植路徑** — 在 `SKILL.md` 中使用 `{baseDir}` 來參考
  技能目錄內的腳本或資源。
- **發佈** — 準備發佈技能時使用 ClawHub 技能。
  它會記錄目前的 `clawhub publish` 指令形狀與所需
  中繼資料。

## 最佳實踐

- **保持簡潔** — 指示模型做*什麼*，而不是如何成為 AI
- **安全第一** — 如果您的技能使用 `exec`，請確保提示不允許來自未受信任輸入的任意指令注入
- **本機測試** — 使用 `openclaw agent --message "..."` 在分享前進行測試
- **使用 ClawHub** — 瀏覽並貢獻技能於 [ClawHub](https://clawhub.ai)

## 技能存放位置

| 位置                            | 優先順序 | 範圍                 |
| ------------------------------- | -------- | -------------------- |
| `\<workspace\>/skills/`         | 最高     | 個別代理程式         |
| `\<workspace\>/.agents/skills/` | 高       | 每個工作區的代理程式 |
| `~/.agents/skills/`             | 中       | 共用的代理程式設定檔 |
| `~/.openclaw/skills/`           | 中       | 共用 (所有代理程式)  |
| 內建 (隨 OpenClaw 附帶)         | 低       | 全域                 |
| `skills.load.extraDirs`         | 最低     | 自訂共用資料夾       |

## 相關

- [Skills 參考](/zh-Hant/tools/skills) — 載入、優先順序和閘控規則
- [Skills 設定](/zh-Hant/tools/skills-config) — `skills.*` 設定架構
- [ClawHub](/zh-Hant/clawhub) — 公開技能註冊表
- [建置外掛程式](/zh-Hant/plugins/building-plugins) — 外掛程式可以隨附技能
