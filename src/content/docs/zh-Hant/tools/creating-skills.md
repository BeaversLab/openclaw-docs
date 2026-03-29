---
title: "建立技能"
summary: "使用 SKILL.md 建置並測試自訂工作區技能"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

# 建立技能

技能會教導代理程式如何以及何時使用工具。每個技能都是一個目錄，
其中包含一個帶有 YAML 前置資料和 markdown 指令的 `SKILL.md` 檔案。

如需了解技能如何載入和排定優先順序，請參閱 [Skills](/en/tools/skills)。

## 建立您的第一個技能

<Steps>
  <Step title="建立技能目錄">
    技能位於您的工作區中。建立一個新資料夾：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

  </Step>

  <Step title="撰寫 SKILL.md">
    在該目錄中建立 `SKILL.md`。前置資料定義中繼資料，
    而 markdown 本文包含給代理程式的指令。

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

  <Step title="新增工具 (選用)">
    您可以在前置資料中定義自訂工具綱要，或指示代理程式
    使用現有的系統工具 (例如 `exec` 或 `browser`)。技能也可以
    隨同其記錄的工具一起在插件內發布。

  </Step>

  <Step title="載入技能">
    啟動新的工作階段，讓 OpenClaw 載入技能：

    ```bash
    # From chat
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

    驗證技能已載入：

    ```bash
    openclaw skills list
    ```

  </Step>

  <Step title="進行測試">
    傳送一則應該會觸發該技能的訊息：

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    或者直接與代理程式交談並要求問候。

  </Step>
</Steps>

## 技能中繼資料參考

YAML 前置資料支援以下欄位：

| 欄位                                | 必要 | 說明                                           |
| ----------------------------------- | ---- | ---------------------------------------------- |
| `name`                              | 是   | 唯一識別碼 (snake_case)                        |
| `description`                       | 是   | 顯示給代理程式看的單行說明                     |
| `metadata.openclaw.os`              | 否   | 作業系統篩選器 (`["darwin"]`, `["linux"]`, 等) |
| `metadata.openclaw.requires.bins`   | 否   | PATH 上必要的二元檔                            |
| `metadata.openclaw.requires.config` | 否   | 必要的設定金鑰                                 |

## 最佳實務

- **保持簡潔** — 指示模型做*什麼*，而不是如何成為 AI
- **安全第一** — 如果您的技能使用了 `exec`，請確保提示不允許來自不受信任輸入的任意命令注入
- **本機測試** — 在分享之前使用 `openclaw agent --message "..."` 進行測試
- **使用 ClawHub** — 在 [ClawHub](https://clawhub.com) 瀏覽和貢獻技能

## 技能的存放位置

| 位置                     | 優先順序 | 範圍                 |
| ------------------------ | -------- | -------------------- |
| `\<workspace\>/skills/`  | 最高     | 單一代理程式         |
| `~/.openclaw/skills/`    | 中等     | 共享（所有代理程式） |
| 內建（隨 OpenClaw 附帶） | 最低     | 全域                 |
| `skills.load.extraDirs`  | 最低     | 自訂共享資料夾       |

## 相關

- [技能參考](/en/tools/skills) — 載入、優先順序和閘道規則
- [技能設定](/en/tools/skills-config) — `skills.*` 設定架構
- [ClawHub](/en/tools/clawhub) — 公共技能註冊表
- [建置外掛程式](/en/plugins/building-plugins) — 外掛程式可以附帶技能
