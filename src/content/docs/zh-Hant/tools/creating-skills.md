---
summary: "使用 SKILL.md 建構並測試自訂工作區技能"
title: "建立技能"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

技能會教導代理如何以及何時使用工具。每個技能都是一個目錄，其中包含一個帶有 YAML 前置資訊和 Markdown 指令的 `SKILL.md` 檔案。

關於技能如何載入和設定優先順序，請參閱 [技能](/zh-Hant/tools/skills)。

## 建立您的第一個技能

<Steps>
  <Step title="建立技能目錄">
    技能位於您的工作區中。建立一個新資料夾：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

  </Step>

  <Step title="撰寫 SKILL.md">
    在該目錄中建立 `SKILL.md`。前置資訊定義元資料，
    而 Markdown 主體包含給代理的指令。

    ```markdown
    ---
    name: hello_world
    description: A simple skill that says hello.
    ---

    # Hello World Skill

    When the user asks for a greeting, use the `echo` tool to say
    "Hello from your custom skill!".
    ```

  </Step>

  <Step title="新增工具（選用）">
    您可以在前置資訊中定義自訂工具架構，或指示代理
    使用現有的系統工具（例如 `exec` 或 `browser`）。技能也可以
    隨附於外掛程式中，與其所記錄的工具一起打包。

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

| 欄位                                | 必要 | 說明                                     |
| ----------------------------------- | ---- | ---------------------------------------- |
| `name`                              | 是   | 唯一識別碼 (snake_case)                  |
| `description`                       | 是   | 顯示給代理的單行描述                     |
| `metadata.openclaw.os`              | 否   | OS 篩選器 (`["darwin"]`、`["linux"]` 等) |
| `metadata.openclaw.requires.bins`   | 否   | PATH 中必要的二元檔案                    |
| `metadata.openclaw.requires.config` | 否   | 必要的設定金鑰                           |

## 最佳實務

- **保持簡潔** — 指示模型做什麼，而不是如何成為 AI
- **安全第一** — 如果您的技能使用 `exec`，請確保提示不允許來自不受信任輸入的任意命令注入
- **本地測試** — 在分享之前使用 `openclaw agent --message "..."` 進行測試
- **使用 ClawHub** — 瀏覽並在 [ClawHub](https://clawhub.ai) 上貢獻技能

## 技能存放位置

| 位置                            | 優先順序 | 範圍             |
| ------------------------------- | -------- | ---------------- |
| `\<workspace\>/skills/`         | 最高     | 個別代理         |
| `\<workspace\>/.agents/skills/` | 高       | 每個工作區代理   |
| `~/.agents/skills/`             | 中       | 共享的代理設定檔 |
| `~/.openclaw/skills/`           | 中       | 共享（所有代理） |
| 內建（隨 OpenClaw 附帶）        | 低       | 全域             |
| `skills.load.extraDirs`         | 最低     | 自訂共享資料夾   |

## 相關

- [技能參考](/zh-Hant/tools/skills) — 載入、優先順序和閘控規則
- [技能設定](/zh-Hant/tools/skills-config) — `skills.*` 設定綱要
- [ClawHub](/zh-Hant/tools/clawhub) — 公共技能註冊表
- [建置外掛程式](/zh-Hant/plugins/building-plugins) — 外掛程式可以隨附技能
