---
title: "建立技能"
sidebarTitle: "建立技能"
summary: "為您的 OpenClaw 代理程式建置、測試及發布自訂 SKILL.md 工作區技能。"
read_when:
  - You are creating a new custom skill
  - You need a quick starter workflow for SKILL.md-based skills
  - You want to use Skill Workshop to propose a skill for agent review
---

技能會教導代理程式如何以及何時使用工具。每個技能都是一個目錄，其中包含一個帶有 YAML frontmatter 和 markdown 指令的 `SKILL.md` 檔案。
OpenClaw 會依照定義的[優先順序](/zh-Hant/tools/skills#loading-order)從多個根目錄載入技能。

## 建立您的第一個技能

<Steps>
  <Step title="建立技能目錄">
    技能位於您工作區的 `skills/` 資料夾中。請為您的
    新技能建立一個目錄：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

    您可以將技能組織在子資料夾中以方便管理 — 技能仍然由
    `SKILL.md` frontmatter 命名，而非資料夾路徑：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/personal/hello-world
    # skill name is still "hello-world", invoked as /hello-world
    ```

  </Step>

  <Step title="撰寫 SKILL.md">
    在目錄中建立 `SKILL.md`。Frontmatter 定義中繼資料；
    本文則提供代理程式指令。

    ```markdown
    ---
    name: hello-world
    description: A simple skill that prints a greeting.
    ---

    # Hello World

    When the user asks for a greeting, use the `exec` tool to run:

    ```bash
    echo "Hello from your custom skill!"
    ```
    ```

    命名規則：
    - `name` 使用小寫字母、數字和連字號。
    - 保持目錄名稱和 frontmatter `name` 一致。
    - `description` 會顯示給代理程式並在斜線指令探索中顯示 —
      請將其保持在單行且不超過 160 個字元。

  </Step>

  <Step title="驗證技能已載入">
    ```bash
    openclaw skills list
    ```

    OpenClaw 預設會監看技能根目錄下的 `SKILL.md` 檔案。如果
    監看功能已停用，或者您正在繼續現有的工作階段，請開啟一個新的
    工作階段，以便代理程式接收更新的清單：

    ```bash
    # From chat — archive current session and start fresh
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

  </Step>

  <Step title="測試它">
    發送一條應該觸發該技能的訊息：

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    或者開啟一個聊天並直接詢問代理。使用 `/skill hello-world` 透過名稱明確調用它。

  </Step>
</Steps>

## SKILL.md 參考

### 必填欄位

| 欄位          | 描述                                   |
| ------------- | -------------------------------------- |
| `name`        | 使用小寫字母、數字和連字號的唯一識別碼 |
| `description` | 顯示給代理並在發現輸出中顯示的單行描述 |

### 可選的前置資料鍵

| 欄位                       | 預設值  | 描述                                                       |
| -------------------------- | ------- | ---------------------------------------------------------- |
| `user-invocable`           | `true`  | 將技能公開為使用者斜線指令                                 |
| `disable-model-invocation` | `false` | 將技能排除在代理的系統提示詞之外（仍可透過 `/skill` 執行） |
| `command-dispatch`         | —       | 設定為 `tool` 以將斜線指令直接路由到工具，繞過模型         |
| `command-tool`             | —       | 當設定 `command-dispatch: tool` 時要調用的工具名稱         |
| `command-arg-mode`         | `raw`   | 對於工具分發，將原始參數字串轉發給工具                     |
| `homepage`                 | —       | 在 macOS 技能 UI 中顯示為「網站」的 URL                    |

關於閘道欄位（`requires.bins`、`requires.env` 等），請參閱
[Skills — Gating](/zh-Hant/tools/skills#gating)。

### 使用 `{baseDir}`

在技能主體中使用 `{baseDir}` 來引用技能目錄內的檔案，而無需硬編碼路徑：

```markdown
Run the helper script at `{baseDir}/scripts/run.sh`.
```

## 新增條件啟用

為您的技能設定閘道，使其僅在依賴項可用時才載入：

```markdown
---
name: gemini-search
description: Search using Gemini CLI.
metadata: { "openclaw": { "requires": { "bins": ["gemini"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

<AccordionGroup>
  <Accordion title="閘道選項">
    | 金鑰 | 描述 |
    | --- | --- |
    | `requires.bins` | 所有二進位檔案必須存在於 `PATH` |
    | `requires.anyBins` | 至少一個二進位檔案必須存在於 `PATH` |
    | `requires.env` | 每個環境變數必須存在於程序或設定中 |
    | `requires.config` | 每個 `openclaw.json` 路徑必須為真值 |
    | `os` | 平台過濾器：`["darwin"]`、`["linux"]`、`["win32"]` |
    | `always` | 設定 `true` 以跳過所有閘道並始終包含該技能 |

    完整參考：[Skills — Gating](/zh-Hant/tools/skills#gating)。

  </Accordion>
  <Accordion title="環境與 API 金鑰">
    將 API 金鑰連接到 `openclaw.json` 中的技能條目：

    ```json5
    {
      skills: {
        entries: {
          "gemini-search": {
            enabled: true,
            apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
          },
        },
      },
    }
    ```

    金鑰僅針對該代理輪次注入到主機程序中。
    它不會到達沙箱 — 請參閱
    [sandboxed env vars](/zh-Hant/tools/skills-config#sandboxed-skills-and-env-vars)。

  </Accordion>
</AccordionGroup>

## 透過 Skill Workshop 提議

對於由代理草擬的技能，或者當您希望在技能上線前由操作員進行審查時，
請使用 [Skill Workshop](/zh-Hant/tools/skill-workshop) 提案，而不是直接撰寫
`SKILL.md`。

```bash
# Propose a brand-new skill
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "A simple skill that prints a greeting." \
  --proposal ./PROPOSAL.md

# Propose an update to an existing skill
openclaw skills workshop propose-update hello-world \
  --proposal ./PROPOSAL.md \
  --description "Updated greeting skill"
```

當提案包含支援檔案時，請使用 `--proposal-dir`：

```bash
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "A simple skill that prints a greeting." \
  --proposal-dir ./hello-world-proposal/
```

目錄必須包含 `PROPOSAL.md`。支援檔案可以放在 `assets/`、
`examples/`、`references/`、`scripts/` 或 `templates/` 中。

審查之後：

```bash
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop apply <proposal-id>
```

請參閱 [Skill Workshop](/zh-Hant/tools/skill-workshop) 以了解完整的提案生命週期。

## 發佈到 ClawHub

<Steps>
  <Step title="確保您的 SKILL.md 已完成">
    確保 `name`、`description` 以及任何 `metadata.openclaw` 閘道欄位
    已設定。如果您有專案頁面，請新增 `homepage` URL。
  </Step>
  <Step title="安裝 ClawHub 技能">
    ClawHub 技能記錄了目前的發布指令形式以及必要的
    元資料：

    ```bash
    openclaw skills install clawhub-publish
    ```

  </Step>
  <Step title="發布">
    ```bash
    clawhub publish
    ```

    請參閱 [ClawHub — Publishing](/zh-Hant/clawhub/publishing) 以了解完整流程。

  </Step>
</Steps>

## 最佳實踐

<Tip>- **簡明扼要** — 指示模型做*什麼*，而不是如何成為一個 AI。 - **安全第一** — 如果您的技能使用 `exec`，請確保提示不允許 來自不受信任輸入的任意指令注入。 - **本地測試** — 在分享之前使用 `openclaw agent --message "..."`。 - **使用 ClawHub** — 在從頭開始構建之前，先在 [clawhub.ai](https://clawhub.ai) 瀏覽社群技能。</Tip>

## 相關

<CardGroup cols={2}>
  <Card title="技能參考" href="/zh-Hant/tools/skills" icon="puzzle-piece">
    載入順序、閘道、允許清單以及 SKILL.md 格式。
  </Card>
  <Card title="Skill Workshop" href="/zh-Hant/tools/skill-workshop" icon="flask">
    代理起草技能的提案佇列。
  </Card>
  <Card title="技能設定" href="/zh-Hant/tools/skills-config" icon="gear">
    完整的 `skills.*` 設定架構。
  </Card>
  <Card title="ClawHub" href="/zh-Hant/clawhub" icon="cloud">
    在公開註冊表中瀏覽和發布技能。
  </Card>
  <Card title="建構外掛程式" href="/zh-Hant/plugins/building-plugins" icon="plug">
    外掛程式可以隨附其文件記載的工具一併發布技能。
  </Card>
</CardGroup>
