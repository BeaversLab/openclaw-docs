---
summary: "使用 SKILL.md 建構並測試自訂工作區技能"
title: "建立技能"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

技能會教導代理程式如何以及何時使用工具。每個技能都是一個目錄，其中包含一個帶有 YAML 前置資訊和 Markdown 指示的 `SKILL.md` 檔案。

關於技能如何載入和優先順序，請參閱 [技能](/zh-Hant/tools/skills)。

## 建立您的第一個技能

<Steps>
  <Step title="建立技能目錄">
    技能位於您的工作區中。建立一個新資料夾：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

    當您的技能庫成長時，您可以將技能群組在子資料夾中：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/personal/hello-world
    ```

    群組資料夾僅供組織使用。技能仍然由
    `SKILL.md` 前置資訊命名，因此 `name: hello-world` 會被叫用作
    `/hello-world`。

  </Step>

  <Step title="撰寫 SKILL.md">
    在該目錄中建立 `SKILL.md`。前置資訊定義元數據，
    而 Markdown 本文包含給代理程式的指示。

    ```markdown
    ---
    name: hello-world
    description: A simple skill that says hello.
    ---

    # Hello World Skill

    When the user asks for a greeting, use the `echo` tool to say
    "Hello from your custom skill!".
    ```

    技能 `name` 請使用由小寫字母、數字和連字元組成的連字元命名法。保持最底層資料夾名稱與前置資訊 `name` 一致。

  </Step>

  <Step title="新增工具（選用）">
    您可以在前置資訊中定義自訂工具綱要，或指示代理程式
    使用現有的系統工具（例如 `exec` 或 `browser`）。技能也可以
    隨附於外掛程式內，與其記錄的工具一起打包。

  </Step>

  <Step title="載入技能">
    驗證技能已載入：

    ```bash
    openclaw skills list
    ```

    OpenClaw 會監看技能根目錄下的巢狀 `SKILL.md` 檔案。如果監看器
    已停用，或者您正在延續現有的工作階段，請啟動新的工作階段，
    以便模型接收更新的技能清單：

    ```bash
    # From chat
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

  </Step>

  <Step title="Test it">
    發送一條應觸發該技能的訊息：

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    或者直接與 Agent 對話並要求打招呼。

  </Step>
</Steps>

## 技能元資料參考

YAML 前置資訊支援以下欄位：

| 欄位                                | 必要 | 說明                                     |
| ----------------------------------- | ---- | ---------------------------------------- |
| `name`                              | 是   | 使用小寫字母、數字和連字號的唯一識別碼   |
| `description`                       | 是   | 顯示給代理的單行描述                     |
| `metadata.openclaw.os`              | 否   | OS 過濾器 (`["darwin"]`、`["linux"]` 等) |
| `metadata.openclaw.requires.bins`   | 否   | PATH 中必要的二元檔案                    |
| `metadata.openclaw.requires.config` | 否   | 必要的設定金鑰                           |

## 進階功能

一旦基本技能運作正常，這些欄位有助於使其更可靠且便於移植：

- **條件啟用** — 使用 `requires.bins`、`requires.env` 或
  `requires.config` 僅在所需相依項可用時載入技能。請參閱 [Skills reference: gating](/zh-Hant/tools/skills#gating)。
- **環境和 API 金鑰連線** — 使用 `skills.entries.<name>.env` 和
  `skills.entries.<name>.apiKey` 為技能回合注入主機端環境。請參閱 [Skills reference: config wiring](/zh-Hant/tools/skills#config-wiring)。
- **呼叫控制** — 設定 `user-invocable: false` 以隱藏斜線命令，
  或設定 `disable-model-invocation: true` 以將命令式技能保留在模型提示詞之外。請參閱 [Skills reference: frontmatter](/zh-Hant/tools/skills#frontmatter)。
- **直接命令分派** — 當斜線命令應直接呼叫工具而非透過模型路由時，搭配 `command-tool` 使用 `command-dispatch: tool`。
- **可移植路徑** — 在 `SKILL.md` 中使用 `{baseDir}` 以引用技能目錄內的腳本或資源。
- **發布** — 在準備發布技能時使用 ClawHub 技能。它會記錄目前的 `clawhub publish` 命令形狀和所需的元數據。

## 最佳實踐

- **保持簡潔** — 指示模型做*什麼*，而不是如何成為 AI
- **安全第一** — 如果您的技能使用了 `exec`，請確保提示詞不允許來自不受信任輸入的任意命令注入
- **本機測試** — 使用 `openclaw agent --message "..."` 在分享前進行測試
- **使用 ClawHub** — 在 [ClawHub](https://clawhub.ai) 瀏覽並貢獻技能

## 技能存放位置

| 位置                            | 優先順序 | 範圍                 |
| ------------------------------- | -------- | -------------------- |
| `\<workspace\>/skills/`         | 最高     | 個別代理程式         |
| `\<workspace\>/.agents/skills/` | 高       | 每個工作區的代理程式 |
| `~/.agents/skills/`             | 中       | 共用的代理程式設定檔 |
| `~/.openclaw/skills/`           | 中       | 共用 (所有代理程式)  |
| 內建 (隨 OpenClaw 附帶)         | 低       | 全域                 |
| `skills.load.extraDirs`         | 最低     | 自訂共用資料夾       |

每個技能根目錄可以包含直接的技能資料夾，例如
`skills/hello-world/SKILL.md` 或分組資料夾，例如
`skills/personal/hello-world/SKILL.md`。

## 相關

- [Skills reference](/zh-Hant/tools/skills) — 載入、優先順序和閘道規則
- [Skills config](/zh-Hant/tools/skills-config) — `skills.*` 設定架構
- [ClawHub](/zh-Hant/clawhub) — 公開技能註冊表
- [Building Plugins](/zh-Hant/plugins/building-plugins) — 外掛程式可以隨附技能
