---
summary: "技能：受管與工作區、閘控規則、代理允許清單與配置連線"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "技能"
sidebarTitle: "技能"
---

OpenClaw 使用與 **[AgentSkills](https://agentskills.io)** 相容的技能資料夾，來教導代理如何使用工具。每個技能都是一個目錄，其中包含一個帶有 YAML 前置資料與說明的 `SKILL.md` 檔案。OpenClaw 會載入內建的技能加上可選的本機覆寫，並在載入時根據環境、設定和二進位檔案的存在性進行篩選。

## 位置與優先順序

OpenClaw 從這些來源載入技能，**優先順序由高到低**：

| #   | 來源           | 路徑                           |
| --- | -------------- | ------------------------------ |
| 1   | 工作區技能     | `<workspace>/skills`           |
| 2   | 專案代理技能   | `<workspace>/.agents/skills`   |
| 3   | 個人代理技能   | `~/.agents/skills`             |
| 4   | 受管/本機技能  | `~/.openclaw/skills`           |
| 5   | 打包技能       | 隨安裝附帶                     |
| 6   | 額外技能資料夾 | `skills.load.extraDirs` (設定) |

如果技能名稱衝突，來源優先順序較高的獲勝。

技能根目錄可以使用資料夾來組織。當在設定的技能根目錄下出現 `SKILL.md` 時，就會發現一個技能，因此這兩者都是有效的：

```text
<workspace>/skills/research/SKILL.md
<workspace>/skills/personal/research/SKILL.md
```

資料夾路徑僅用於組織。技能的可見名稱、斜線指令和允許列表金鑰來自 `SKILL.md` frontmatter `name`（或當缺少 `name` 時來自技能目錄名稱），因此具有 `name: research` 的巢狀技能仍會被叫用為 `/research`，而不是 `/personal/research`。

Codex CLI 的原生 `$CODEX_HOME/skills` 目錄不是這些 OpenClaw 技能根目錄之一。在 Codex harness 模式下，本機應用程式伺服器啟動會使用隔離的每個代理程式 Codex home，因此操作員個人 `~/.codex/skills` 中的技能不會被隱式載入。Codex 原生的 `.agents` 探索會單獨使用繼承的 `HOME`；上述 OpenClaw 自身的技能根目錄已經包含了 `~/.agents/skills`。使用 `openclaw migrate plan codex` 來列舉 Codex home 中的技能，然後使用 `openclaw migrate codex` 透過互動式核取方塊提示選擇技能目錄，再將它們複製到目前的 OpenClaw 代理程式工作區中。對於非互動式執行，請針對要複製的確切技能重複 `--skill <name>`。

## 個別代理 vs 共享技能

在 **多代理** 設定中，每個代理都有自己的工作區：

| 範圍          | 路徑                                    | 可見於             |
| ------------- | --------------------------------------- | ------------------ |
| 每個代理      | `<workspace>/skills`                    | 僅該代理           |
| 專案代理      | `<workspace>/.agents/skills`            | 僅該工作區的代理   |
| 個人代理      | `~/.agents/skills`                      | 該機器上的所有代理 |
| 共享管理/本地 | `~/.openclaw/skills`                    | 該機器上的所有代理 |
| 共享額外目錄  | `skills.load.extraDirs`（優先順序最低） | 該機器上的所有代理 |

多處同名 → 最高來源優先。工作區勝過
專案代理，勝過個人代理，勝過管理/本地，勝過內建，
勝過額外目錄。

## 代理技能允許清單

技能**位置**和技能**可見性**是分開的控制。
位置/優先級決定同名技能的哪個副本勝出；代理
允許清單決定代理實際可以使用哪些技能。

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"],
    },
    list: [
      { id: "writer" }, // inherits github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

<AccordionGroup>
  <Accordion title="Allowlist rules">- 預設情況下，省略 `agents.defaults.skills` 以啟用無限制的技能。 - 省略 `agents.list[].skills` 以繼承 `agents.defaults.skills`。 - 設定 `agents.list[].skills: []` 表示不使用任何技能。 - 非空的 `agents.list[].skills` 列表是該代理程式的最終集合——它不會與預設值合併。 - 有效的允許清單適用於提示構建、技能斜線指令探索、沙箱同步和技能快照。</Accordion>
</AccordionGroup>

## 外掛與技能

外掛程式可以透過在 `openclaw.plugin.json` 中列出 `skills` 目錄來提供自己的技能（路徑相對於外掛程式根目錄）。當外掛程式啟用時，外掛程式技能就會載入。這是存放工具特定操作指南的合適位置，這些指南對於工具描述來說太長，但應該在外掛程式安裝時隨時可用——例如，瀏覽器外掛程式提供了一個 `browser-automation` 技能用於多步驟瀏覽器控制。

外掛程式技能目錄會被合併到與 `skills.load.extraDirs` 相同的低優先級路徑中，因此同名的一體包、受管、代理或工作區技能會覆寫它們。您可以透過外掛程式配置項目上的 `metadata.openclaw.requires.config` 來控制它們的可用性。

請參閱 [外掛程式](/zh-Hant/tools/plugin) 以了解探索/配置，並參閱 [工具](/zh-Hant/tools) 以了解這些技能所教授的工具介面。

## Skill Workshop 提案

Skill Workshop 提案是用於建立或更新工作區技能的持久草稿，而不會靜默變更現有的 `SKILL.md` 檔案。OpenClaw 將它們儲存在：

```text
<OPENCLAW_STATE_DIR>/skill-workshop/
  proposals.json
  proposals/<proposal-id>/
    proposal.json
    PROPOSAL.md
    references/
    scripts/
    rollback.json
```

預設的狀態目錄是 `~/.openclaw`。

`proposal.json` 是正式的提案記錄。`proposals.json` 是快速清單清單，當遺失或過時時可以從提案資料夾重建。`PROPOSAL.md` 會使用 `status: proposal`、`version: v1` 和 `date` 明確標記草稿內容；當提案被套用為現有的 `SKILL.md` 時，這些僅限於提案的欄位會被移除。

提案內容遵循 `skills.workshop.maxSkillBytes`，且提案描述限制為 160 位元組，因為它們可能會出現在探索和列表輸出中。

提案資料夾也可以在 `assets/`、`examples/`、`references/`、`scripts/` 或 `templates/` 下攜帶支援檔案。OpenClaw 會在 `proposal.json` 中記錄支援檔案元資料，將檔案內容儲存在 `PROPOSAL.md` 旁，隨提案掃描它們，並在套用前驗證其雜湊值。批准的支援檔案會被寫入 `SKILL.md` 旁的現用技能目錄中。

只有待處理的提案才能被修訂或套用。修訂會保持相同的提案 ID，增加提案版本，更新提案日期，重新執行掃描器元數據，並保留現有的支援檔案，除非提供了新的支援檔案列表。套用會將內容寫入所選工作區 `skills/` 根目錄，執行技能掃描器，寫入回滾元數據，拒絕覆蓋現有的建立目標，並且如果目標技能在提案建立後發生變更，則將更新提案標記為過時。拒絕和隔離僅針對提案元數據；它們不會觸及活動的技能。

使用 CLI 供操作員審查：

```bash
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id>
openclaw skills workshop quarantine <proposal-id>
```

當代理識別出值得重複使用的工作時，可以透過 `skill_workshop` 工具起草提案，並且可以在審查期間修訂待處理的提案。當使用者明確要求核准/使用/套用、拒絕或隔離特定提案時，該工具可以透過 Skill Workshop 執行該生命週期動作，而不是透過 Shell 或直接檔案系統變更。

## ClawHub（安裝與同步）

[ClawHub](https://clawhub.ai) 是 OpenClaw 的公開技能登錄檔。使用原生 `openclaw skills` 指令進行探索/安裝/更新，或使用獨立的 `clawhub` CLI 進行發布/同步工作流程。完整指南：[ClawHub](/zh-Hant/clawhub)。

| 動作                        | 指令                                                   |
| --------------------------- | ------------------------------------------------------ |
| 將 ClawHub 技能安裝至工作區 | `openclaw skills install <skill-slug>`                 |
| 將 Git 技能安裝至工作區     | `openclaw skills install git:owner/repo@ref`           |
| 將本機技能安裝至工作區      | `openclaw skills install ./path/to/skill --as my-tool` |
| 為所有本地代理安裝技能      | `openclaw skills install <skill-slug> --global`        |
| 更新所有工作區安裝的技能    | `openclaw skills update --all`                         |
| 更新單個共享管理技能        | `openclaw skills update <skill-slug> --global`         |
| 更新所有共享管理/本地技能   | `openclaw skills update --all --global`                |
| 驗證 ClawHub 技能           | `openclaw skills verify <skill-slug>`                  |
| 列印生成的技能卡片          | `openclaw skills verify <skill-slug> --card`           |
| 同步（掃描 + 發布更新）     | `clawhub sync --all`                                   |

原生 `openclaw skills install` 預設安裝到目前工作區的 `skills/` 目錄中。新增 `--global` 以安裝到共用的 managed/local 目錄（預設為 `~/.openclaw/skills`），除非代理程式技能允許清單縮小了可見範圍，否則所有本機代理程式都能看見此目錄。另一個 `clawhub` CLI 也會安裝到您目前工作目錄下的 `./skills`（或是退回到已設定的 OpenClaw 工作區）。OpenClaw 會在下一個工作階段將其視為 `<workspace>/skills` 載入。已設定的技能根目錄也支援分組佈局，例如 `skills/<group>/<skill>/SKILL.md`，因此相關的第三方技能可以保留在共用資料夾下，而無需進行廣泛的遞迴掃描。分組時請使用扁平的 frontmatter 名稱，例如帶有 `name: research` 的 `skills/imported/research/SKILL.md`。

Git 和本機目錄安裝預期在來源根目錄有一個 `SKILL.md`。安裝的 slug 來自 `SKILL.md` 前置標題 `name`，當它是有效的 slug 時，然後回退到來源目錄或儲存庫名稱。使用 `--as <slug>` 來覆蓋推斷出的 slug。`--version` 僅適用於 ClawHub 安裝。Skill 安裝不支援 npm 套件規格或 zip/archive 路徑。`openclaw skills update` 僅更新 ClawHub 追蹤的安裝；重新安裝 Git 或本機來源以重新整理它們。

使用 `openclaw skills verify <slug>` 向 ClawHub 請求該技能的 `clawhub.skill.verify.v1` 信託封套。預設輸出為 JSON；使用 `--card` 列印生成的技術卡 Markdown。已安裝的 ClawHub 技能會根據 `.clawhub/origin.json` 中記錄的版本和登錄表進行驗證；`--version` 和 `--tag` 僅覆寫版本選擇器。當 ClawHub 將驗證標記為失敗時，該指令會以非零狀態碼退出。生成的 `skill-card.md` 可能存在於已安裝的套件中，但 OpenClaw 將其視為 ClawHub 提供的中繼資料，並不會將其用作本機模型指令或本機雜湊閘門。

需要私人、非 ClawHub 傳遞的 Gateway 客戶端可以使用 `skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit` 暫存 zip 技能壓縮檔，然後使用 `skills.install({ source: "upload", uploadId, slug, force?, sha256? })` 安裝已提交的上傳。這是一條專門針對受信任客戶端的管理員上傳路徑，而非正常的 `openclaw skills install <slug>` 或 ClawHub 安裝流程。此功能預設為關閉，並且只有在 `openclaw.json` 中設定了 `skills.install.allowUploadedArchives: true` 時才能運作。上傳模式仍然會安裝到預設的代理程式工作區 `skills/<slug>` 目錄中；壓縮檔內部的資料夾名稱在最終安裝目標中會被忽略。

ClawHub 技能頁面在安裝前會顯示最新的安全掃描狀態，並提供 VirusTotal、ClawScan 和靜態分析的詳細掃描頁面。`openclaw skills install <slug>` 僅作為安裝路徑；發布者可以透過 ClawHub 儀表板或 `clawhub skill rescan <slug>` 解決誤報問題。

## 安全性

<Warning>請將第三方技能視為**不受信任的程式碼**。在啟用前請仔細閱讀。對於不受信任的輸入和風險工具，請優先使用沙箱執行。請參閱[Sandboxing](/zh-Hant/gateway/sandboxing)以了解代理端控制項。</Warning>

- 工作區、專案代理和額外目錄的技能發現僅接受解析後的真實路徑保持在已設定根目錄內的技能根目錄，除非 `skills.load.allowSymlinkTargets` 明確信任目標根目錄。捆綁的技能始終保持在內部。受管理的 `~/.openclaw/skills` 和個人 `~/.agents/skills` 根目錄可能包含由 ClawHub 或其他本機技能管理器安裝的符號連結技能資料夾，但每個 `SKILL.md` 的真實路徑仍必須保持在其解析後的技能目錄內。
- 巢狀探索是有界的。OpenClaw 會掃描 skills 根目錄（例如 `<workspace>/skills`、`<workspace>/.agents/skills`、
  `~/.agents/skills` 和 `~/.openclaw/skills`）下的分組技能資料夾，但會跳過隱藏目錄、
  `node_modules`、過大的 `SKILL.md` 檔案、跳出的符號連結以及可疑的
  大型目錄樹。
- 閘道私人封存安裝預設為關閉。當明確啟用時，它們需要包含 `SKILL.md` 的已提交 zip 上傳，並重複使用與
  ClawHub 技能安裝相同的封存解壓縮、路徑遍歷、符號連結、強制和回溯保護措施。它們由
  `skills.install.allowUploadedArchives` 控管；正常的 ClawHub 安裝不需要
  該設定。
- 閘道支援的技能依賴安裝（`skills.install`、onboarding 以及技能設定 UI）會在執行安裝程式中繼資料之前執行內建的危險代碼掃描器。預設情況下，`critical` 的發現結果會進行阻擋，除非呼叫者明確設定危險覆寫；可疑的發現結果仍僅會發出警告。
- `openclaw skills install <slug>` 則有所不同——它會將 ClawHub 技能資料夾下載到工作區，或是使用 `--global` 下載到共享的 managed/local 技能中，並且不使用上述的 installer-metadata 路徑。Git 和本機目錄安裝會將受信任的 `SKILL.md` 目錄複製到同一個技能根目錄，但不會被 `openclaw skills update` 追蹤。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 會將秘密注入該代理回合的 **主機** 程序（而非沙箱）。請確保提示詞和日誌中不包含秘密。

如需更全面的威脅模型和檢查清單，請參閱 [安全性](/zh-Hant/gateway/security)。

## SKILL.md 格式

`SKILL.md` 必須至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClaw 遵循 AgentSkills 規範的佈局/意圖。內嵌代理使用的解析器僅支援 **單行** frontmatter 鍵；`metadata` 應為 **單行 JSON 物件**。請在指令中使用 `{baseDir}` 來引用技能資料夾路徑。

### 選用 frontmatter 鍵

<ParamField path="homepage" type="string">
  在 macOS Skills UI 中顯示為「Website」的 URL。也透過 `metadata.openclaw.homepage` 支援。
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  當 `true` 時，該技能會以使用者斜線指令的形式公開。
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  當 `true` 時，OpenClaw 會將技能的指令排除在代理的一般提示詞之外。只要 `user-invocable` 也是 `true`，該技能仍會被安裝，並且可以作為斜線指令明確執行。
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  當設定為 `tool` 時，斜線指令會略過模型並直接分派給工具。
</ParamField>
<ParamField path="command-tool" type="string">
  當設定 `command-dispatch: tool` 時要叫用的工具名稱。
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  針對工具分派，將原始參數字串轉發給工具（不進行核心解析）。工具會使用 `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }` 來叫用。
</ParamField>

## 閘控 (載入時篩選器)

OpenClaw 在載入時使用 `metadata` (單行 JSON) 篩選技能：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的欄位：

<ParamField path="always" type="boolean">
  當 `true` 時，始終包含該技能（跳過其他閘門）。
</ParamField>
<ParamField path="emoji" type="string">
  macOS Skills UI 使用的選用表情符號。
</ParamField>
<ParamField path="homepage" type="string">
  在 macOS Skills UI 中顯示為「網站」的選用 URL。
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  選用平台清單。如果設定，該技能僅在這些作業系統上可用。
</ParamField>
<ParamField path="requires.bins" type="string[]">
  每個都必須存在於 `PATH` 中。
</ParamField>
<ParamField path="requires.anyBins" type="string[]">
  至少一個必須存在於 `PATH` 中。
</ParamField>
<ParamField path="requires.env" type="string[]">
  環境變數必須存在或在設定中提供。
</ParamField>
<ParamField path="requires.config" type="string[]">
  必須為真值的 `openclaw.json` 路徑清單。
</ParamField>
<ParamField path="primaryEnv" type="string">
  與 `skills.entries.<name>.apiKey` 相關聯的環境變數名稱。
</ParamField>
<ParamField path="install" type="object[]">
  macOS Skills UI 使用的選用安裝程式規格 (brew/node/go/uv/download)。
</ParamField>

如果沒有 `metadata.openclaw`，該技能始終符合條件（除非在配置中停用或對於捆綁技能被 `skills.allowBundled` 阻擋）。

<Note>當 `metadata.openclaw` 不存在時，仍然接受舊版的 `metadata.clawdbot` 區塊，因此較早安裝的技能會保留其相依性閘道和安裝程式提示。新技能和更新後的技能應使用 `metadata.openclaw`。</Note>

### 沙盒化備註

- `requires.bins` 會在技能載入時於 **主機** 上接受檢查。
- 如果代理程式已沙盒化，二進位檔案也必須存在於 **容器內部**。透過 `agents.defaults.sandbox.docker.setupCommand`（或自訂映像檔）進行安裝。`setupCommand` 會在容器建立後執行一次。套件安裝也需要網路出口、可寫入的根 FS 以及沙盒中的 root 使用者。
- 範例：`summarize` 技能 (`skills/summarize/SKILL.md`) 需要在沙盒容器中安裝 `summarize` CLI 才能在其中執行。

### 安裝程式規格

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

<AccordionGroup>
  <Accordion title="安裝程式選擇規則">
    - 如果列出了多個安裝程式，閘道會選擇單一首選選項（如果有 brew 則選 brew，否則選 node）。
    - 如果所有安裝程式都是 `download`，OpenClaw 會列出每個條目，讓您可以看到可用的構件。
    - 安裝程式規格可以包含 `os: ["darwin"|"linux"|"win32"]` 以依平台篩選選項。
    - Node 安裝會遵守 `openclaw.json` 中的 `skills.install.nodeManager`（預設：npm；選項：npm/pnpm/yarn/bun）。這僅影響技能安裝；Gateway 執行階段仍應為 Node - 不建議將 Bun 用於 WhatsApp/Telegram。
    - Gateway 支援的安裝程式選擇是由偏好驅動的：當安裝規格混合種類時，如果啟用了 `skills.install.preferBrew` 且存在 `brew`，OpenClaw 會優先選擇 Homebrew，然後是 `uv`，然後是設定的 node 管理器，接著是其他備案如 `go` 或 `download`。
    - 如果每個安裝規格都是 `download`，OpenClaw 會顯示所有下載選項，而不是折疊為單一首選安裝程式。

  </Accordion>
  <Accordion title="Per-installer details">
    - **Homebrew 安裝：** OpenClaw 不會自動安裝 Homebrew 或將
      brew 公式轉換為系統套件管理員指令。在沒有 `brew` 的 Linux 容器
      中，入門流程會隱藏僅限 brew 的相依性安裝程式；請使用
      自訂映像檔或在啟用該技能之前手動安裝相依性。
    - **Go 安裝：** 如果缺少 `go` 且有 `brew` 可用，
      閘道會先透過 Homebrew 安裝 Go，並在可能的情況下將 `GOBIN`
      設定為 Homebrew 的 `bin`。
    - **下載安裝：** `url` (必要)，`archive` (`tar.gz` | `tar.bz2` | `zip`)，
      `extract` (預設：偵測到封存檔時為 auto)，`stripComponents`，
      `targetDir` (預設 `~/.openclaw/tools/<skillKey>`)。

  </Accordion>
</AccordionGroup>

## 配置覆寫

套件與受管理的技能可以在 `skills.entries` 下的 `~/.openclaw/openclaw.json` 中進行切換並提供環境變數值：

```json5
{
  skills: {
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE",
        },
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
  `false` 即使技能已隨附或安裝也會予以停用。 隨附的 `coding-agent` 技能屬於選用：在將其公開給代理程式之前，請設定 `skills.entries.coding-agent.enabled: true`，然後確保已安裝並驗證 `claude`、`codex`、`opencode` 或其他受支援 CLI 的憑證。
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  針對宣告 `metadata.openclaw.primaryEnv` 之技能的便利設定。支援純文字或 SecretRef。
</ParamField>
<ParamField path="env" type="Record<string, string>">
  僅在程序中尚未設定該變數時才會注入。
</ParamField>
<ParamField path="config" type="object">
  用於自訂各個技能欄位的選用容器。自訂金鑰必須置於此處。
</ParamField>
<ParamField path="allowBundled" type="string[]">
  僅適用於 **隨附** 技能的選用允許清單。若已設定，則清單中僅有隨附技能符合資格（受管理/工作區技能不受影響）。
</ParamField>

如果技能名稱包含連字號，請用引號將鍵（key）括起來（JSON5 允許使用帶引號的鍵）。設定鍵預設符合**技能名稱**——如果技能定義了 `metadata.openclaw.skillKey`，請在 `skills.entries` 下使用該鍵。

<Note>若要在 OpenClaw 內進行標準的圖像生成/編輯，請改用核心的 `image_generate` 工具搭配 `agents.defaults.imageGenerationModel`，而不要使用打包的技能。此處的技能範例適用於自訂或第三方工作流程。若要進行原生圖像分析，請使用 `image` 工具搭配 `agents.defaults.imageModel`。如果您選擇 `openai/*`、`google/*`、`fal/*` 或其他供應商專屬的圖像模型，也請一併新增該供應商的 auth/API 金鑰。</Note>

## 環境變數注入

當代理程式 (Agent) 執行開始時，OpenClaw：

1. 讀取技能中繼資料。
2. 將 `skills.entries.<key>.env` 和 `skills.entries.<key>.apiKey` 應用於 `process.env`。
3. 使用**符合資格**的技能構建系統提示。
4. 在執行結束後還原原始環境。

環境注入**範圍限於代理執行**，而非全域 shell 環境。

對於內建的 `claude-cli` 後端，OpenClaw 也會將相同的合格快照具體化為暫時的 Claude Code 外掛，並使用 `--plugin-dir` 傳遞。Claude Code 接著可以使用其原生技能解析器，而 OpenClaw 仍擁有優先順序、每個代理的允許清單、閘控以及 `skills.entries.*` env/API 金鑰注入。其他 CLI 後端僅使用提示目錄。

## 快照與重新整理

OpenClaw 會在 **工作階段開始時** 對符合條件的技能建立快照，並在該工作階段的後續輪次中重複使用該清單。對技能或設定的變更會在下一個新工作階段生效。

技能在兩種情況下可以在工作階段中重新整理：

- 已啟用技能監看器。
- 出現新的符合條件的遠端節點。

您可以將此視為 **熱重新載入**：重新整理後的清單會在下一個代理程式輪次中被採用。如果該工作階段的有效代理程式技能允許清單發生變更，OpenClaw 會重新整理快照，以便可見的技能與目前的代理程式保持一致。

### 技能監看器

預設情況下，OpenClaw 會監看資料夾，並在 `SKILL.md` 檔案變更時更新技能快照。可在 `skills.load` 下設定：

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

在有意義的工作區、專案代理程式或額外目錄佈局中，如果技能根目錄包含符號連結，請使用 `allowSymlinkTargets`，例如 `<workspace>/skills/manager -> ~/Projects/manager/skills`。託管的 `~/.openclaw/skills` 和個人的 `~/.agents/skills` 預設可以跟隨來自本機技能管理程式的技能目錄符號連結，但目標清單仍會在 realpath 解析後進行比對，因此在配置時應保持狹窄範圍。

監視器涵蓋分組技能根目錄下的嵌套 `SKILL.md` 檔案。新增或編輯 `skills/personal/foo/SKILL.md` 會重新整理快照，其方式與編輯 `skills/foo/SKILL.md` 相同。

### 遠端 macOS 節點 (Linux 閘道)

如果 Gateway 在 Linux 上運行，但連接了一個允許 `system.run` 的 **macOS 節點**（Exec approvals 安全性未設為 `deny`），當該節點上存在所需的二進位檔案時，OpenClaw 可以將僅限 macOS 的技能視為符合資格。Agent 應該透過 `exec` 工具並使用 `host=node` 來執行這些技能。

這取決於節點回報其指令支援情況，以及透過 `system.which` 或 `system.run` 進行的 bin 探測。離線節點**不會**讓僅限遠端的技能可見。如果已連接的節點停止回應 bin 探測，OpenClaw 將清除其快取的 bin 匹配項，因此 Agent 將不再看到目前無法在那裡執行的技能。

## Token 影響

當技能符合資格時，OpenClaw 會將可用技能的精簡 XML 清單注入系統提示詞（透過 `session runtime` 中的 `formatSkillsForPrompt`）。成本是確定的：

- **基本開銷**（僅當有 ≥1 個技能時）：195 個字元。
- **每個技能：**97 個字元 + XML 轉義後 `<name>`、`<description>` 和 `<location>` 值的長度。

公式（字元）：

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

XML 轉義會將 `& < > " '` 展開為實體（`&amp;`、`&lt;` 等），從而增加長度。Token 計數因模型分詞器而異。粗略的 OpenAI 風格估計為約 4 個字元/token，因此每個技能 **97 個字元 ≈ 24 個 token**，加上您的實際欄位長度。

## 受控技能生命週期

OpenClaw 會在安裝（npm 套件或 OpenClaw.app）時隨附一組基準技能作為**內建技能**。`~/.openclaw/skills` 用於本地覆蓋——例如，在不變更內建副本的情況下鎖定或修補技能。工作區技能屬於使用者所有，在名稱衝突時會覆蓋前述兩者。

## 正在尋找更多技能？

瀏覽 [https://clawhub.ai](https://clawhub.ai)。完整的設定架構：[Skills config](/zh-Hant/tools/skills-config)。

## 相關內容

- [ClawHub](/zh-Hant/clawhub) - 公開技能註冊表
- [Creating skills](/zh-Hant/tools/creating-skills) - 建立自訂技能
- [Plugins](/zh-Hant/tools/plugin) - 外掛系統概覽
- [Skills config](/zh-Hant/tools/skills-config) - 技能設定參考
- [Slash commands](/zh-Hant/tools/slash-commands) - 所有可用的斜線指令
