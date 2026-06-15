---
title: "技能"
sidebarTitle: "技能"
summary: "技能教導您的代理如何使用工具。了解它們如何載入、優先順序如何運作，以及如何配置閘道、允許清單和環境注入。"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
---

技能是 Markdown 指令檔案，用於教導代理如何以及何時使用工具。每個技能都位於一個包含 `SKILL.md` 檔案的目錄中，該檔案包含 YAML frontmatter 和 Markdown 內容。OpenClaw 會載入套件內建的技能以及任何本機覆寫，並在載入時根據環境、設定和二進位檔案的存在進行篩選。

<CardGroup cols={2}>
  <Card title="建立技能" href="/zh-Hant/tools/creating-skills" icon="hammer">
    從頭開始建置並測試自訂技能。
  </Card>
  <Card title="技能工坊" href="/zh-Hant/tools/skill-workshop" icon="flask">
    審查並批准代理草擬的技能提案。
  </Card>
  <Card title="技能設定" href="/zh-Hant/tools/skills-config" icon="gear">
    完整的 `skills.*` 設定架構和代理允許清單。
  </Card>
  <Card title="ClawHub" href="/zh-Hant/clawhub" icon="cloud">
    瀏覽並安裝社群技能。
  </Card>
</CardGroup>

## 載入順序

OpenClaw 會從這些來源載入，**優先順序由高到低**。當相同的技能名稱出現在多個位置時，來源優先順序較高的會勝出。

| 優先順序 | 來源              | 路徑                               |
| -------- | ----------------- | ---------------------------------- |
| 1 — 最高 | 工作區技能        | `<workspace>/skills`               |
| 2        | 專案代理技能      | `<workspace>/.agents/skills`       |
| 3        | 個人代理技能      | `~/.agents/skills`                 |
| 4        | 已管理 / 本機技能 | `~/.openclaw/skills`               |
| 5        | 內建技能          | 隨安裝程式附帶                     |
| 6 — 最低 | 額外目錄          | `skills.load.extraDirs` + 外掛技能 |

技能根目錄支援分組佈局。只要在設定的根目錄下的任何位置出現 `SKILL.md`，OpenClaw 就會發現一個技能：

```text
<workspace>/skills/research/SKILL.md          ✓ found as "research"
<workspace>/skills/personal/research/SKILL.md ✓ also found as "research"
```

資料夾路徑僅用於組織。技能的名稱、斜線指令和允許清單金鑰都來自 `name` frontmatter 欄位（當缺少 `name` 時則使用目錄名稱）。

<Note>Codex CLI 的原生 `$CODEX_HOME/skills` 目錄**不是** OpenClaw 技能根目錄。使用 `openclaw migrate plan codex` 列出這些技能，然後 使用 `openclaw migrate codex` 將它們複製到您的 OpenClaw 工作區。</Note>

## 個別代理程式與共享技能

在多代理程式設置中，每個代理程式都有自己的工作區。使用符合您所需可見性的路徑：

| 範圍         | 路徑                         | 可見於                 |
| ------------ | ---------------------------- | ---------------------- |
| 個別代理程式 | `<workspace>/skills`         | 僅該代理程式           |
| 專案代理程式 | `<workspace>/.agents/skills` | 僅該工作區的代理程式   |
| 個人代理程式 | `~/.agents/skills`           | 此機器上的所有代理程式 |
| 共享管理     | `~/.openclaw/skills`         | 此機器上的所有代理程式 |
| 額外目錄     | `skills.load.extraDirs`      | 此機器上的所有代理程式 |

## 代理程式允許清單

技能**位置**（優先順序）和技能**可見性**（哪個代理程式可以使用它）是分開的控制項。使用允許清單來限制代理程式看到的技能，無論它們從何處載入。

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"], // shared baseline
    },
    list: [
      { id: "writer" }, // inherits github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults entirely
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

<AccordionGroup>
  <Accordion title="Allowlist rules">- 省略 `agents.defaults.skills` 以預設讓所有技能不受限制。 - 省略 `agents.list[].skills` 以繼承 `agents.defaults.skills`。 - 設定 `agents.list[].skills: []` 以不對該代理程式公開任何技能。 - 非空的 `agents.list[].skills` 清單是**最終**集合 — 它不會 與預設值合併。 - 有效的允許清單適用於提示詞建置、斜線指令 探索、沙盒同步和技能快照。</Accordion>
</AccordionGroup>

## 外掛程式與技能

外掛程式可以透過在 `openclaw.plugin.json` 中列出 `skills` 目錄來附帶自己的技能（路徑相對於外掛程式根目錄）。當外掛程式啟用時會載入外掛程式技能——例如，瀏覽器外掛程式附帶一個用於多步驟瀏覽器控制的 `browser-automation` 技能。

外掛程式技能目錄會在與 `skills.load.extraDirs` 相同的低優先級層級合併，因此同名稱的隨附、受管、代理程式或工作區技能會覆寫它們。您可以透過外掛程式配置項目中的 `metadata.openclaw.requires.config` 來控制它們。

請參閱 [外掛程式](/zh-Hant/tools/plugin) 和 [工具](/zh-Hant/tools) 以了解完整的外掛程式系統。

## Skill Workshop

[Skill Workshop](/zh-Hant/tools/skill-workshop) 是代理程式與您使用中的技能檔案之間的提案佇列。當代理程式發現可重複使用的工作時，它會起草一個提案，而不是直接寫入 `SKILL.md`。在變更發生前，您需要進行審閱並核准。

```bash
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop apply <proposal-id>
```

請參閱 [Skill Workshop](/zh-Hant/tools/skill-workshop) 以了解完整的生命週期、CLI 參考資料和配置。

## 從 ClawHub 安裝

[ClawHub](https://clawhub.ai) 是公開的技能註冊表。使用 `openclaw skills` 指令進行安裝和更新，或使用 `clawhub` CLI 進行發佈和同步。

| 動作                         | 指令                                                   |
| ---------------------------- | ------------------------------------------------------ |
| 將技能安裝到工作區           | `openclaw skills install <slug>`                       |
| 從 Git 存放庫安裝            | `openclaw skills install git:owner/repo@ref`           |
| 安裝本機技能目錄             | `openclaw skills install ./path/to/skill --as my-tool` |
| 為所有本機代理程式安裝       | `openclaw skills install <slug> --global`              |
| 更新所有工作區技能           | `openclaw skills update --all`                         |
| 更新共用的受管技能           | `openclaw skills update <slug> --global`               |
| 更新所有共用的受管技能       | `openclaw skills update --all --global`                |
| 驗證技能的信託範圍           | `openclaw skills verify <slug>`                        |
| 列印產生的 Skill Card        | `openclaw skills verify <slug> --card`                 |
| 透過 ClawHub CLI 發佈 / 同步 | `clawhub sync --all`                                   |

<AccordionGroup>
  <Accordion title="安裝詳情">
    `openclaw skills install` 預設會安裝到目前工作區的 `skills/`
    目錄。新增 `--global` 以安裝到共用的
    `~/.openclaw/skills` 目錄，除非代理人白名單限制範圍，否則所有本機代理人都可見。

    Git 和本機安裝預期來源根目錄中要有 `SKILL.md`。當有效時，簡稱來自
    `SKILL.md` 前置資料 `name`，接著會後備使用
    目錄或儲存庫名稱。使用 `--as <slug>` 來覆寫。
    `openclaw skills update` 僅追蹤 ClawHub 安裝 — 重新安裝 Git 或
    本機來源以重新整理它們。

  </Accordion>
  <Accordion title="驗證與安全掃描">
    `openclaw skills verify <slug>` 會向 ClawHub 要求該技能的
    `clawhub.skill.verify.v1` 信任封套。已安裝的 ClawHub 技能會根據 `.clawhub/origin.json` 中記錄的版本和登錄表進行驗證。

    ClawHub 技能頁面會在安裝前公開最新的安全掃描狀態，並提供 VirusTotal、ClawScan 和靜態分析的詳細頁面。當 ClawHub 將驗證標記為失敗時，該指令會以非零值結束。發行者可以透過 ClawHub 儀表板或
    `clawhub skill rescan <slug>` 解決誤判。

  </Accordion>
  <Accordion title="私人封存安裝">
    需要非 ClawHub 傳遞的 Gateway 用戶端可以準備包含 `skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit` 的 zip 技能封存，
    然後使用 `skills.install({ source: "upload", ... })` 進行安裝。此路徑預設為關閉，且需要在
    `openclaw.json` 中設定 `skills.install.allowUploadedArchives: true`。正常的 ClawHub 安裝從不需要該設定。
  </Accordion>
</AccordionGroup>

## 安全性

<Warning>請將第三方技能視為 **不受信任的程式碼**。在啟用前請先閱讀它們。 針對不受信任的輸入和有風險的工具，請優先使用沙箱執行。請參閱 [沙箱機制](/zh-Hant/gateway/sandboxing) 以了解代理人端控制項。</Warning>

<AccordionGroup>
  <Accordion title="Path containment">
    工作區、專案代理程式和額外目錄的技能探索僅接受其解析後的真實路徑保持在已設定根目錄內的技能根目錄，除非 `skills.load.allowSymlinkTargets` 明確信任目標根目錄。
    受管理的 `~/.openclaw/skills` 和個人的 `~/.agents/skills` 可能包含
    符號連結的技能資料夾，但每個 `SKILL.md` 的真實路徑仍必須保留
    在其解析後的技能目錄內。
  </Accordion>
  <Accordion title="Scan and scan overrides">
    由閘道支援的技能安裝（入職設定、Skills 設定 UI）會在執行安裝程式中繼資料之前
    執行內建的危險程式碼掃描器。`critical` 的發現結果預設會封鎖；`suspicious` 的發現結果僅發出警告。
    `openclaw skills install <slug>` 直接下載 ClawHub 技能資料夾
    並不使用安裝程式中繼資料掃描器。
  </Accordion>
  <Accordion title="Secret injection scope">
    `skills.entries.*.env` 和 `skills.entries.*.apiKey` 會將祕密注入到
    該代理程式回合的 **主機** 程序中 — 僅限於此，而不會注入沙箱。請
    將祕密排除在提示和日誌之外。
  </Accordion>
</AccordionGroup>

如需更廣泛的威脅模型和安全檢查清單，請參閱
[安全性](/zh-Hant/gateway/security)。

## SKILL.md 格式

每個技能至少需要在 frontmatter 中包含 `name` 和 `description`：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---

When the user asks to generate an image, use the `image_generate` tool...
```

<Note>OpenClaw 遵循 [AgentSkills](https://agentskills.io) 規格。 Frontmatter 解析器僅支援 **單行金鑰** — `metadata` 必須是 單行 JSON 物件。請在正文中使用 `{baseDir}` 來引用技能 資料夾路徑。</Note>

### 選用的 frontmatter 金鑰

<ParamField path="homepage" type="string">
  在 macOS Skills UI 中顯示為「網站」的 URL。也可以透過 `metadata.openclaw.homepage` 支援。
</ParamField>

<ParamField path="user-invocable" type="boolean" default="true">
  當 `true` 時，該技能將作為使用者可呼叫的斜線指令公開。
</ParamField>

<ParamField path="disable-model-invocation" type="boolean" default="false">
  當 `true` 時，OpenClaw 會將該技能的指令排除在代理的一般提示詞之外。若 `user-invocable` 也設為 `true`，則該技能仍可作為斜線指令使用。
</ParamField>

<ParamField path="command-dispatch" type='"tool"'>
  當設為 `tool` 時，該斜線指令將繞過模型並直接分派至已註冊的工具。
</ParamField>

<ParamField path="command-tool" type="string">
  當設定 `command-dispatch: tool` 時要呼叫的工具名稱。
</ParamField>

<ParamField path="command-arg-mode" type='"raw"' default="raw">
  針對工具分派，將原始參數字串直接轉發給工具，而不進行核心解析。工具將接收
  `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。
</ParamField>

## 閘道

OpenClaw 在載入時使用 `metadata.openclaw`（前置元資料中的單行 JSON）來過濾技能。除非明確停用，否則沒有 `metadata.openclaw` 區塊的技能始終符合資格。

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

<ParamField path="always" type="boolean">
  當 `true` 時，一律包含該技能並跳過所有其他閘道。
</ParamField>

<ParamField path="emoji" type="string">
  在 macOS 技能 UI 中顯示的選用表情符號。
</ParamField>

<ParamField path="homepage" type="string">
  在 macOS 技能 UI 中顯示為「Website」的選用 URL。
</ParamField>

<ParamField path="os" type='"darwin" | "linux" | "win32"'>
  平台過濾器。設定後，該技能僅在列出的作業系統上符合資格。
</ParamField>

<ParamField path="requires.bins" type="string[]">
  每個二進位檔案必須存在於 `PATH` 中。
</ParamField>

<ParamField path="requires.anyBins" type="string[]">
  `PATH` 上必須至少存在一個二進制檔案。
</ParamField>

<ParamField path="requires.env" type="string[]">
  每個環境變數必須存在於程序中，或透過設定提供。
</ParamField>

<ParamField path="requires.config" type="string[]">
  每個 `openclaw.json` 路徑必須為真值 (truthy)。
</ParamField>

<ParamField path="primaryEnv" type="string">
  與 `skills.entries.<name>.apiKey` 關聯的環境變數名稱。
</ParamField>

<ParamField path="install" type="object[]">
  由 macOS Skills UI 使用的可選安裝程式規格 (brew / node / go / uv / download)。
</ParamField>

<Note>當 `metadata.openclaw` 不存在時，仍接受舊版的 `metadata.clawdbot` 區塊，因此較舊的已安裝技能會保留其相依性閘道和安裝提示。新技能應使用 `metadata.openclaw`。</Note>

### 安裝程式規格

安裝程式規格會告訴 macOS Skills UI 如何安裝相依性：

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

<AccordionGroup>
  <Accordion title="Installer selection rules">
    - 當列出多個安裝程式時，閘道會選擇一個首選選項 (如果有 brew 則選 brew，否則選 node)。
    - 如果所有安裝程式都是 `download`，OpenClaw 會列出每個項目，以便您查看所有可用的構件。
    - 規格可以包含 `os: ["darwin"|"linux"|"win32"]` 以依平台篩選。
    - Node 安裝會遵守 `openclaw.json` 中的 `skills.install.nodeManager` (預設：npm；選項：npm / pnpm / yarn / bun)。這僅影響技能安裝；Gateway 執行時仍應是 Node。
    - Gateway 安裝程式偏好：Homebrew → uv → 已設定的 node 管理員 → go → download。
  </Accordion>
  <Accordion title="Per-installer details">
    - **Homebrew:** OpenClaw 不會自動安裝 Homebrew 或將 brew
      formulas 轉換為系統套件指令。在沒有
      `brew` 的 Linux 容器中，
      僅使用 brew 的安裝程式會被隱藏；請使用自訂映像檔或手動
      安裝相依套件。
    - **Go:** 如果 `go` 缺失且 `brew` 可用，
      閘道會先透過 Homebrew 安裝 Go，並將 `GOBIN` 設定為 Homebrew 的
      `bin`。
    - **Download:** `url` (必要), `archive` (`tar.gz` | `tar.bz2` | `zip`),
      `extract` (預設: 偵測到壓縮檔時為 auto), `stripComponents`,
      `targetDir` (預設: `~/.openclaw/tools/<skillKey>`)。
  </Accordion>
  <Accordion title="Sandboxing notes">
    `requires.bins` 會在技能載入時於 **主機** 上檢查。如果 agent
    在沙盒中執行，二進位檔也必須存在 **於容器內**。
    請透過 `agents.defaults.sandbox.docker.setupCommand` 或自訂
    映像檔進行安裝。`setupCommand` 會在容器建立後執行一次，且需要
    網路出口、可寫入的根 FS，以及沙盒中的 root 使用者。
  </Accordion>
</AccordionGroup>

## Config 覆寫

在 `~/.openclaw/openclaw.json` 中的 `skills.entries` 下切換並設定內建或受管理的技能：

```json5
{
  skills: {
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
        config: {
          endpoint: "https://example.invalid",
          model: "nano-pro",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

<ParamField path="enabled" type="boolean">
  `false` 會停用該技能，即使它是內建或已安裝的。`coding-agent` 內建技能為選用 — 設定 `skills.entries.coding-agent.enabled: true` 並確保安裝並驗證了 `claude`、`codex`、`opencode` 或其他支援的 CLI 其中之一。
</ParamField>

<ParamField path="apiKey" type="string | { source, provider, id }">
  為宣告 `metadata.openclaw.primaryEnv` 的技能提供的便利欄位。 支援純文字字串或 SecretRef 物件。
</ParamField>

<ParamField path="env" type="Record<string, string>">
  為代理執行注入的環境變數。僅在程序中尚未設定該變數時注入。
</ParamField>

<ParamField path="config" type="object">
  用於自訂各別技能配置欄位的選用容器。
</ParamField>

<ParamField path="allowBundled" type="string[]">
  僅適用於 **bundled**（內建）技能的選用允許清單。設定後，僅清單中的內建技能符合資格。受管理與工作區技能不受影響。
</ParamField>

<Note>Config 鍵值預設對應 **skill name**（技能名稱）。若技能定義了 `metadata.openclaw.skillKey`，請在 `skills.entries` 下使用該鍵值。請為連字元名稱加上引號：JSON5 允許引號鍵值。</Note>

## 環境變數注入

當代理執行開始時，OpenClaw 將會：

<Steps>
  <Step title="讀取技能中繼資料">
    OpenClaw 解析代理的有效技能清單，並套用閘門規則、允許清單與配置覆寫。
  </Step>
  <Step title="注入環境變數與 API 金鑰">
    `skills.entries.<key>.env` 與 `skills.entries.<key>.apiKey` 會在執行期間套用至
    `process.env`。
  </Step>
  <Step title="建構系統提示詞">
    合格的技能會被編譯成精簡的 XML 區塊，並注入至系統提示詞中。
  </Step>
  <Step title="還原環境變數">
    執行結束後，將還原先前的環境變數。
  </Step>
</Steps>

<Warning>環境變數注入的範圍僅限於 **host**（主機）代理執行，而非沙箱。在沙箱內， `env` 與 `apiKey` 不會生效。請參閱 [Skills config](/zh-Hant/tools/skills-config#sandboxed-skills-and-env-vars) 以了解如何將機密傳遞至沙箱執行環境。</Warning>

對於捆綁的 `claude-cli` 後端，OpenClaw 也會將相同的合格技能快照實例化為臨時的 Claude Code 外掛，並透過 `--plugin-dir` 傳遞。其他 CLI 後端則僅使用提示目錄。

## 快照與重新整理

OpenClaw 會在**工作階段開始時**對合格的技能建立快照，並在工作階段中的所有後續輪次重複使用該清單。對技能或設定的變更將在下一個新工作階段生效。

技能在兩種情況下會於工作階段中途重新整理：

- 技能監視器偵測到 `SKILL.md` 變更。
- 連接了一個新的合格遠端節點。

重新整理後的清單會在下一個代理輪次中被採用。如果有效的代理允許清單發生變更，OpenClaw 會重新整理快照以保持可見技能的一致性。

<AccordionGroup>
  <Accordion title="技能監視器">
    預設情況下，OpenClaw 會監視資料夾，並在 `SKILL.md` 檔案變更時更新快照。可在 `skills.load` 下進行設定：

    ```json5
    {
      skills: {
        load: {
          extraDirs: ["~/Projects/agent-scripts/skills"],
          allowSymlinkTargets: ["~/Projects/manager/skills"],
          watch: true,
          watchDebounceMs: 250,
        },
      },
    }
    ```

    若技能根目錄的符號連結指向已設定根目錄之外（例如 `<workspace>/skills/manager -> ~/Projects/manager/skills`），請使用 `allowSymlinkTargets` 以配合此類刻意安排的符號連結佈局。

  </Accordion>
  <Accordion title="遠端 macOS 節點 (Linux 閘道)">
    如果閘道器在 Linux 上執行，但連接了一個允許 `system.run` 的 **macOS 節點**，則當該節點上存在所需的二進位檔案時，OpenClaw 可將僅限 macOS 的技能視為合格。代理應透過 `exec` 工具並搭配 `host=node` 來執行這些技能。

    離線節點**不會**讓僅限遠端的技能變為可見。如果節點停止回應二進位檔案探測，OpenClaw 會清除其快取的二進位檔案相符項目。

  </Accordion>
</AccordionGroup>

## Token 影響

當技能符合資格時，OpenClaw 會將一個精簡的 XML 區塊注入系統提示中。成本是確定的：

```text
total = 195 + Σ (97 + len(name) + len(description) + len(filepath))
```

- **基本額外開銷**（僅當 ≥ 1 個技能時）：約 195 個字元
- **每個技能：** 約 97 個字元 + 您的 `name`、`description` 和 `location` 欄位長度
- XML 轉義會將 `& < > " '` 擴充為實體，每次出現增加幾個字元
- 以每個 token 約 4 個字元計算，在欄位長度之前，每個技能約 97 個字元 ≈ 24 個 tokens

保持描述簡短且具有描述性，以最大限度地減少提示詞開銷。

## 相關

<CardGroup cols={2}>
  <Card title="建立技能" href="/zh-Hant/tools/creating-skills" icon="hammer">
    撰寫自訂技能的逐步指南。
  </Card>
  <Card title="技能工作坊" href="/zh-Hant/tools/skill-workshop" icon="flask">
    代理起草技能的提案佇列。
  </Card>
  <Card title="技能設定" href="/zh-Hant/tools/skills-config" icon="gear">
    完整的 `skills.*` 設定架構和代理允許清單。
  </Card>
  <Card title="斜線指令" href="/zh-Hant/tools/slash-commands" icon="terminal">
    技能斜線指令的註冊和路由方式。
  </Card>
  <Card title="ClawHub" href="/zh-Hant/clawhub" icon="cloud">
    在公開註冊表上瀏覽和發布技能。
  </Card>
  <Card title="外掛程式" href="/zh-Hant/tools/plugin" icon="plug">
    外掛程式可以隨其記錄的工具一起提供技能。
  </Card>
</CardGroup>
