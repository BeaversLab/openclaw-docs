---
summary: "使用 SKILL.md 建置並測試自訂工作區技能"
title: "建立技能"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

技能會教導代理程式如何以及何時使用工具。每個技能都是一個目錄，其中包含一個帶有 YAML 前置資料和 markdown 指令的 `SKILL.md` 檔案。

有關技能如何載入和優先順序的詳細資訊，請參閱 [Skills](/zh-Hant/tools/skills)。

## 建立您的第一個技能

<Steps>
  <Step title="建立技能目錄">
    技能位於您的工作區中。建立一個新資料夾：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

    當您的技能庫增長時，您可以將技能分組在子資料夾中：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/personal/hello-world
    ```

    群組資料夾僅用於組織用途。技能仍然由 `SKILL.md` 前置資料命名，因此 `name: hello-world` 被調用為 `/hello-world`。

  </Step>

  <Step title="撰寫 SKILL.md">
    在該目錄中建立 `SKILL.md`。前置資料定義元資料，而 markdown 主體包含給代理程式的指令。

    ```markdown
    ---
    name: hello-world
    description: A simple skill that says hello.
    ---

    # Hello World Skill

    When the user asks for a greeting, use the `echo` tool to say
    "Hello from your custom skill!".
    ```

    對於技能 `name`，請使用連字號命名法（hyphen-case），包含小寫字母、數字和連字號。請保持葉資料夾名稱與前置資料 `name` 一致。

  </Step>

  <Step title="新增工具 (選用)">
    您可以在前置資料中定義自訂工具架構，或指示代理程式使用現有的系統工具（例如 `exec` 或 `browser`）。技能也可以與其記錄的工具一起在插件內部發布。

  </Step>

  <Step title="載入技能">
    驗證技能已載入：

    ```bash
    openclaw skills list
    ```

    OpenClaw 會監看技能根目錄下的嵌套 `SKILL.md` 檔案。如果監看器已停用，或者您正在繼續現有的會話，請啟動一個新會話，以便模型接收更新的技能清單：

    ```bash
    # From chat
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

  </Step>

  <Step title="Test it">
    傳送一則應觸發該技能的訊息：

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    或者直接與代理對話並詢問問候語。

  </Step>
</Steps>

## 套用前先提案

對於代理生成的程序，請使用 Skill Workshop 提案，而不要直接撰寫 `SKILL.md`：

```bash
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "A simple skill that says hello." \
  --proposal ./PROPOSAL.md
```

當提案也包含支援檔案時，請使用 `--proposal-dir`：

```bash
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "A simple skill that says hello." \
  --proposal-dir ./hello-world-proposal
```

草稿會儲存在
`<OPENCLAW_STATE_DIR>/skill-workshop/proposals/<proposal-id>/PROPOSAL.md` 之下，
並在操作員審查並套用之前保持非啟用狀態。預設的狀態
目錄是 `~/.openclaw`。提案目錄必須包含 `PROPOSAL.md`。
支援檔案可以包含在 `assets/`、`examples/`、`references/`、
`scripts/` 或 `templates/` 中；OpenClaw 會將它們與提案一起儲存並掃描：

```bash
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
openclaw skills workshop apply <proposal-id>
```

套用時，OpenClaw 會將最終的 `SKILL.md` 寫入工作區 `skills/`
根目錄，將已核准的支援檔案寫在其旁邊，並移除僅限提案的
frontmatter，例如 `status: proposal`、提案 `version` 和提案
`date`。

## 技能元數據參考

YAML frontmatter 支援這些欄位：

| 欄位                                | 必要 | 說明                                     |
| ----------------------------------- | ---- | ---------------------------------------- |
| `name`                              | 是   | 使用小寫字母、數字和連字元的唯一識別碼   |
| `description`                       | 是   | 顯示給代理的單行說明                     |
| `metadata.openclaw.os`              | 否   | OS 篩選器 (`["darwin"]`、`["linux"]` 等) |
| `metadata.openclaw.requires.bins`   | 否   | PATH 上必要的二進位檔案                  |
| `metadata.openclaw.requires.config` | 否   | 必要的設定金鑰                           |

## 進階功能

一旦基本技能運作正常，這些欄位有助於使其可靠且可移植：

- **條件式啟用** — 使用 `requires.bins`、`requires.env` 或
  `requires.config` 僅在必要的相依性可用時載入技能。請參閱 [Skills reference: gating](/zh-Hant/tools/skills#gating)。
- **環境和 API 金鑰連線** — 使用 `skills.entries.<name>.env` 和
  `skills.entries.<name>.apiKey` 為技能執行注入主機端環境。請參閱 [技能參考：配置連線](/zh-Hant/tools/skills#config-wiring)。
- **調用控制** — 設定 `user-invocable: false` 以隱藏斜線指令，
  或設定 `disable-model-invocation: true` 以將指令式技能排除在模型
  提示詞之外。請參閱 [技能參考：frontmatter](/zh-Hant/tools/skills#frontmatter)。
- **直接指令派發** — 當斜線指令應直接呼叫工具而不是透過模型路由時，請使用 `command-dispatch: tool` 搭配
  `command-tool`。
- **可攜路徑** — 在 `SKILL.md` 中引用技能目錄內的腳本
  或資產時，請使用 `{baseDir}`。
- **發布** — 準備發布技能時，請使用 ClawHub 技能。
  它會記錄目前的 `clawhub publish` 指令格式和必要的
  中繼資料。

## 最佳實踐

- **保持簡潔** — 指示模型做*什麼*，而不是如何成為 AI
- **安全第一** — 如果您的技能使用 `exec`，請確保提示詞不允許來自不受信任輸入的任意指令注入
- **本機測試** — 在分享之前，使用 `openclaw agent --message "..."` 進行測試
- **使用 ClawHub** — 在 [ClawHub](https://clawhub.ai) 瀏覽並貢獻技能

## 技能存放位置

| 位置                            | 優先順序 | 範圍                 |
| ------------------------------- | -------- | -------------------- |
| `\<workspace\>/skills/`         | 最高     | 個別代理程式         |
| `\<workspace\>/.agents/skills/` | 高       | 每個工作區代理程式   |
| `~/.agents/skills/`             | 中       | 共享代理程式設定檔   |
| `~/.openclaw/skills/`           | 中       | 共享（所有代理程式） |
| 內建（隨 OpenClaw 附帶）        | 低       | 全域                 |
| `skills.load.extraDirs`         | 最低     | 自訂共享資料夾       |

每個技能根目錄可以包含直接的技能資料夾，例如
`skills/hello-world/SKILL.md` 或分組的資料夾，例如
`skills/personal/hello-world/SKILL.md`。

## 相關

- [技能參考](/zh-Hant/tools/skills) — 載入、優先順序和閘道規則
- [技能配置](/zh-Hant/tools/skills-config) — `skills.*` 配置架構
- [ClawHub](/zh-Hant/clawhub) — 公共技能註冊表
- [建構外掛程式](/zh-Hant/plugins/building-plugins) — 外掛程式可以附帶技能
