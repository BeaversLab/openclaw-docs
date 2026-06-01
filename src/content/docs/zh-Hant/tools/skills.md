---
summary: "技能：託管 vs 工作區、閘道規則、代理允許清單及配置連線"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "技能"
sidebarTitle: "技能"
---

OpenClaw 使用與 **[AgentSkills](https://agentskills.io) 相容** 的技能資料夾來教導代理如何使用工具。每個技能都是一個包含 `SKILL.md` 的目錄，其中帶有 YAML 前置資料和指令。OpenClaw 會載入捆綁的技能加上可選的本機覆寫，並在載入時根據環境、配置和二進位檔案的存在進行篩選。

## 位置與優先順序

OpenClaw 從這些來源載入技能，**優先順序由高到低**：

| #   | 來源           | 路徑                           |
| --- | -------------- | ------------------------------ |
| 1   | 工作區技能     | `<workspace>/skills`           |
| 2   | 專案代理技能   | `<workspace>/.agents/skills`   |
| 3   | 個人代理技能   | `~/.agents/skills`             |
| 4   | 受管/本機技能  | `~/.openclaw/skills`           |
| 5   | 打包技能       | 隨安裝附帶                     |
| 6   | 額外技能資料夾 | `skills.load.extraDirs` (配置) |

如果技能名稱衝突，來源優先順序較高的獲勝。

技能根目錄可以用資料夾組織。當 `SKILL.md` 出現在設定的技能根目錄下時，就會發現一個技能，因此這兩者都是有效的：

```text
<workspace>/skills/research/SKILL.md
<workspace>/skills/personal/research/SKILL.md
```

資料夾路徑僅用於組織。技能的可見名稱、斜線指令和允許清單金鑰來自 `SKILL.md` 前置資料 `name`（當缺少 `name` 時則來自技能目錄名稱），因此具有 `name: research` 的巢狀技能仍然被調用為 `/research`，而不是 `/personal/research`。

Codex CLI 的原生 `$CODEX_HOME/skills` 目錄不是這些 OpenClaw 技能根目錄之一。在 Codex 鞍座模式下，本地應用程式伺服器啟動使用獨立的每個代理 Codex 家目錄，因此操作員個人 `~/.codex/skills` 中的技能不會被隱式載入。Codex 原生 `.agents` 發現單獨使用繼承的 `HOME`；OpenClaw 自己的上述技能根目錄已經包含 `~/.agents/skills`。使用 `openclaw migrate plan codex` 從 Codex 家目錄盤點技能，然後使用 `openclaw migrate codex` 以互動式核取方塊提示選擇技能目錄，然後將它們複製到當前 OpenClaw 代理工作區。對於非互動式運行，請針對要複製的確切技能重複 `--skill <name>`。

## 個別代理 vs 共享技能

在 **多代理** 設定中，每個代理都有自己的工作區：

| 範圍          | 路徑                                 | 可見於             |
| ------------- | ------------------------------------ | ------------------ |
| 每個代理      | `<workspace>/skills`                 | 僅該代理           |
| 專案代理      | `<workspace>/.agents/skills`         | 僅該工作區的代理   |
| 個人代理      | `~/.agents/skills`                   | 該機器上的所有代理 |
| 共享管理/本地 | `~/.openclaw/skills`                 | 該機器上的所有代理 |
| 共享額外目錄  | `skills.load.extraDirs` (優先級最低) | 該機器上的所有代理 |

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
  <Accordion title="允許清單規則">- 省略 `agents.defaults.skills` 以預設允許無限制的技能。 - 省略 `agents.list[].skills` 以繼承 `agents.defaults.skills`。 - 設定 `agents.list[].skills: []` 表示沒有技能。 - 非空的 `agents.list[].skills` 列表是該代理的**最終** 集合 - 它不會與預設值合併。 - 有效允許清單適用於提示詞建構、技能 斜線指令發現、沙箱同步和技能快照。</Accordion>
</AccordionGroup>

## 外掛與技能

外掛可以透過在 `openclaw.plugin.json` 中列出 `skills` 目錄（相對於外掛根目錄的路徑）來附帶自己的技能。當外掛啟用時，外掛技能會載入。這是放置特定工具操作指南的適當位置，這些指南對於工具描述來說太長，但應該在外掛安裝時隨時可用 - 例如，瀏覽器外掛附帶一個 `browser-automation` 技能用於多步驟瀏覽器控制。

外掛技能目錄會被合併到與 `skills.load.extraDirs` 相同的低優先級路徑中，因此同名的內建、管理、代理或工作區技能會覆寫它們。您可以透過外掛配置項目上的 `metadata.openclaw.requires.config` 來限制它們。

參閱 [外掛程式](/zh-Hant/tools/plugin) 以進行探索/設定，並參閱 [工具](/zh-Hant/tools) 以了解這些技能所教授的工具介面。

## 技能工作坊

選用且實驗性的 **技能工作坊 (Skill Workshop)** 外掛程式可以根據代理程式工作期間觀察到的可重複程序，來建立或更新工作區技能。它預設為停用，必須透過 `plugins.entries.skill-workshop` 明確啟用。

技能工作坊僅寫入 `<workspace>/skills`、掃描產生的內容、支援待批准或自動安全寫入、隔離不安全的提案，並在成功寫入後重新整理技能快照，以便無需重新啟動 Gateway 即可使用新技能。

將其用於修正，例如 _「下次驗證 GIF 歸屬」_，或用於來之不易的工作流程，例如媒體 QA 檢查清單。從待批准開始；僅在檢閱其提案後於受信任的工作區使用自動寫入。完整指南：[技能工作坊外掛程式](/zh-Hant/plugins/skill-workshop)。

## ClawHub (安裝與同步)

[ClawHub](https://clawhub.ai) 是 OpenClaw 的公開技能註冊表。使用原生的 `openclaw skills` 指令進行探索/安裝/更新，或使用獨立的 `clawhub` CLI 進行發佈/同步工作流程。完整指南：[ClawHub](/zh-Hant/clawhub)。

| 動作                        | 指令                                                   |
| --------------------------- | ------------------------------------------------------ |
| 將 ClawHub 技能安裝至工作區 | `openclaw skills install <skill-slug>`                 |
| 將 Git 技能安裝至工作區     | `openclaw skills install git:owner/repo@ref`           |
| 將本機技能安裝至工作區      | `openclaw skills install ./path/to/skill --as my-tool` |
| 為所有本機代理程式安裝技能  | `openclaw skills install <skill-slug> --global`        |
| 更新所有安裝於工作區的技能  | `openclaw skills update --all`                         |
| 更新單一共享受管理技能      | `openclaw skills update <skill-slug> --global`         |
| 更新所有共享受管理/本機技能 | `openclaw skills update --all --global`                |
| 驗證 ClawHub 技能           | `openclaw skills verify <skill-slug>`                  |
| 列印產生的技能卡            | `openclaw skills verify <skill-slug> --card`           |
| 同步 (掃描 + 發佈更新)      | `clawhub sync --all`                                   |

原生 `openclaw skills install` 預設會安裝到目前的工作區 `skills/` 目錄中。新增 `--global` 以安裝到共用的 managed/local 目錄（預設為 `~/.openclaw/skills`），除非代理程式技能允許清單限制了可見性，否則所有本機代理程式都能看到該目錄。另外獨立的 `clawhub` CLI 也會安裝到目前工作目錄下的 `./skills`（如果失敗則退回到已設定的 OpenClaw 工作區）。OpenClaw 會在下一次工作階段將其視為 `<workspace>/skills`。已設定的技能根目錄也支援群組佈局，例如 `skills/<group>/<skill>/SKILL.md`，讓相關的第三方技能可以保留在共用資料夾下，而無需廣泛地遞迴掃描。群組時請使用扁平的 frontmatter 名稱，例如帶有 `name: research` 的 `skills/imported/research/SKILL.md`。

Git 和本機目錄安裝預期來源根目錄中會有一個 `SKILL.md`。安裝的 slug 來自 `SKILL.md` frontmatter `name`（當它是有效的 slug 時），接著退回到來源目錄或儲存庫名稱。使用 `--as <slug>` 來覆寫推斷的 slug。`--version` 僅適用於 ClawHub 安裝。技能安裝不支援 npm 套件規格或 zip/archive 路徑。`openclaw skills update` 僅更新 ClawHub 追蹤的安裝；請重新安裝 Git 或本機來源以重新整理它們。

使用 `openclaw skills verify <slug>` 向 ClawHub 請求技能的 `clawhub.skill.verify.v1` 信任封套。輸出預設為 JSON；使用 `--card` 列印產生的技能卡 Markdown。已安裝的 ClawHub 技能會根據 `.clawhub/origin.json` 中記錄的版本和註冊表進行驗證；`--version` 和 `--tag` 僅覆寫版本選擇器。當 ClawHub 將驗證標記為失敗時，指令會以非零值結束。已安裝的套件中可能會有產生的 `skill-card.md`，但 OpenClaw 會將其視為 ClawHub 提供的中繼資料，並不會將其用作本機模型指令或本機雜湊閘門。

需要非 ClawHub 的私人傳遞的 Gateway 客戶端，可以使用 `skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit` 暫存 zip 技能壓縮檔，然後使用 `skills.install({ source: "upload", uploadId, slug, force?, sha256? })` 安裝已提交的上傳內容。這是專為受信任客戶端設定的明確管理員上傳路徑，而非正常的 `openclaw skills install <slug>` 或 ClawHub 安裝流程。此功能預設關閉，僅在 `skills.install.allowUploadedArchives: true` 設定於 `openclaw.json` 中時運作。上傳模式仍會安裝至預設的代理程式工作區 `skills/<slug>` 目錄；壓縮檔內部的資料夾名稱在最終安裝目標中會被忽略。

ClawHub 技能頁面會在安裝前公開最新的安全掃描狀態，並提供 VirusTotal、ClawScan 和靜態分析的掃描器詳細資訊頁面。`openclaw skills install <slug>` 僅保留為安裝路徑；發行者可透過 ClawHub 儀表板或 `clawhub skill rescan <slug>` 解決誤報問題。

## 安全性

<Warning>將第三方技能視為 **不受信任的程式碼**。啟用前請先閱讀內容。對於不受信任的輸入和風險工具，建議優先使用沙箱執行。請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing) 以了解代理程式端的控制項。</Warning>

- 工作區、專案代理程式和額外目錄的技能探索功能，僅接受解析後的真實路徑位於設定根目錄內的技能根目錄，除非 `skills.load.allowSymlinkTargets` 明確信任目標根目錄。捆綁的技能始終保持在內部。受管理的 `~/.openclaw/skills` 和個人 `~/.agents/skills` 根目錄可能包含由 ClawHub 或其他本機技能管理器安裝的符號連結技能資料夾，但每個 `SKILL.md` 的真實路徑仍必須位於其解析後的技能目錄內。
- 巢狀探索是有界限的。OpenClaw 會掃描技能根目錄下的群組化技能資料夾，例如 `<workspace>/skills`、`<workspace>/.agents/skills`、`~/.agents/skills` 和 `~/.openclaw/skills`，但會跳過隱藏目錄、`node_modules`、過大的 `SKILL.md` 檔案、逃逸的符號連結以及異常龐大的目錄樹。
- Gateway 私有存檔安裝預設為關閉。當明確啟用時，它們需要包含 `SKILL.md` 的已提交 zip 上傳，並重複使用與 ClawHub 技能安裝相同的存檔解壓縮、路徑遍歷、符號連結、強制和回滾保護。它們由 `skills.install.allowUploadedArchives` 限制；正常的 ClawHub 安裝不需要該設定。
- Gateway 支援的技能依賴安裝 (`skills.install`、onboarding 以及技能設定 UI) 會在執行安裝程式中繼資料之前執行內建的危險代碼掃描器。除非呼叫者明確設定危險覆蓋，否則 `critical` 發現會預設封鎖；可疑發現仍僅會發出警告。
- `openclaw skills install <slug>` 則不同 — 它將 ClawHub 技能資料夾下載到工作區，或使用 `--global` 下載到共用的 managed/local 技能中，並且不使用上述的安裝程式中繼資料路徑。Git 和本機目錄安裝會將受信任的 `SKILL.md` 目錄複製到同一個技能根目錄，但不會被 `openclaw skills update` 追蹤。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 會將秘密注入該 agent 週期的 **host** 程序（而非 sandbox）。請勿在提示和日誌中洩露秘密。

有關更廣泛的威脅模型和檢查清單，請參閱 [Security](/zh-Hant/gateway/security)。

## SKILL.md 格式

`SKILL.md` 必須至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClaw 遵循 AgentSkills 規範的佈局/意圖。嵌入式 agent 使用的解析器僅支援 **單行** frontmatter 鍵；`metadata` 應為 **單行 JSON 物件**。在指令中使用 `{baseDir}` 來引用技能資料夾路徑。

### 可選的 frontmatter 鍵

<ParamField path="homepage" type="string">
  在 macOS 技能 UI 中顯示為「Website」的 URL。也可透過 `metadata.openclaw.homepage` 來支援。
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  當 `true` 時，該技能會以使用者斜線指令的形式公開。
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  當 `true` 時，OpenClaw 會將該技能的指令排除在代理的一般提示詞之外。該技能仍會被安裝，並且當 `user-invocable` 也為 `true` 時，仍可作為斜線指令明確執行。
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  當設為 `tool` 時，斜線指令會略過模型並直接分派至工具。
</ParamField>
<ParamField path="command-tool" type="string">
  當設定 `command-dispatch: tool` 時要叫用的工具名稱。
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  針對工具分派，將原始參數字串轉發至工具（無核心解析）。工具會以 `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }` 叫用。
</ParamField>

## 閘控（載入時篩選器）

OpenClaw 在載入時使用 `metadata`（單行 JSON）來篩選技能：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的欄位：

<ParamField path="always" type="boolean">
  當 `true` 時，始終包含該技能（跳過其他閘道）。
</ParamField>
<ParamField path="emoji" type="string">
  macOS Skills UI 使用的選用表情符號。
</ParamField>
<ParamField path="homepage" type="string">
  在 macOS Skills UI 中顯示為「Website」的選用 URL。
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  平台的選用列表。如果設定，該技能僅適用於那些作業系統。
</ParamField>
<ParamField path="requires.bins" type="string[]">
  每個都必須存在於 `PATH` 上。
</ParamField>
<ParamField path="requires.anyBins" type="string[]">
  至少一個必須存在於 `PATH` 上。
</ParamField>
<ParamField path="requires.env" type="string[]">
  環境變數必須存在或在設定中提供。
</ParamField>
<ParamField path="requires.config" type="string[]">
  必須為真值的 `openclaw.json` 路徑列表。
</ParamField>
<ParamField path="primaryEnv" type="string">
  與 `skills.entries.<name>.apiKey` 關聯的環境變數名稱。
</ParamField>
<ParamField path="install" type="object[]">
  macOS Skills UI 使用的選用安裝程式規格 (brew/node/go/uv/download)。
</ParamField>

如果不存在 `metadata.openclaw`，該技能始終符合資格（除非在設定中停用或對於捆綁的技能被 `skills.allowBundled` 封鎖）。

<Note>當 `metadata.openclaw` 不存在時，仍接受舊版 `metadata.clawdbot` 區塊，因此較舊的已安裝技能會保留其相依性閘道和安裝程式提示。新技能和更新後的技能應使用 `metadata.openclaw`。</Note>

### 沙盒化說明

- `requires.bins` 會在技能載入時於 **主機** 上進行檢查。
- 如果代理程式是在沙盒中運作，則二進位檔案也必須存在於**容器內部**。請透過 `agents.defaults.sandbox.docker.setupCommand`（或自訂映像檔）進行安裝。`setupCommand` 會在容器建立後執行一次。套件安裝也需要網路出口、可寫入的根檔案系統，以及沙盒中的 root 使用者。
- 範例：`summarize` 技能（`skills/summarize/SKILL.md`）需要在沙盒容器中有 `summarize` CLI 才能在那裡執行。

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
    - 如果列出多個安裝程式，閘道會挑選一個單一的首選項（brew 如果可用，否則為 node）。
    - 如果所有安裝程式都是 `download`，OpenClaw 會列出每個項目，以便您查看可用的構件。
    - 安裝程式規格可以包含 `os: ["darwin"|"linux"|"win32"]` 以依平台篩選選項。
    - Node 安裝會遵守 `openclaw.json` 中的 `skills.install.nodeManager`（預設：npm；選項：npm/pnpm/yarn/bun）。這僅影響技能安裝；Gateway 執行時期仍應為 Node - 不建議將 Bun 用於 WhatsApp/Telegram。
    - 支援 Gateway 的安裝程式選擇是偏好驅動的：當安裝規格混合種類時，如果啟用了 `skills.install.preferBrew` 且 `brew` 存在，OpenClaw 偏好 Homebrew，然後是 `uv`，接著是設定的 node 管理員，然後是其他後備選項如 `go` 或 `download`。
    - 如果每個安裝規格都是 `download`，OpenClaw 會顯示所有下載選項，而不是折疊為一個首選的安裝程式。

  </Accordion>
  <Accordion title="各安裝程式詳情">
    - **Homebrew 安裝：** OpenClaw 不會自動安裝 Homebrew 或將
      brew 公式轉換為系統套件管理器指令。在沒有 `brew` 的 Linux 容器
      中，入門流程會隱藏僅限 brew 的相依性安裝程式；請使用
      自訂映像檔或在啟用該技能前手動安裝相依性。
    - **Go 安裝：** 如果缺少 `go` 且可用 `brew`，閘道會先透過 Homebrew 安裝 Go，並在可能的情況下將 `GOBIN` 設定為 Homebrew 的 `bin`。
    - **下載安裝：** `url` (必要)、`archive` (`tar.gz` | `tar.bz2` | `zip`)、`extract` (預設值：偵測到封存時為 auto)、`stripComponents`、`targetDir` (預設值： `~/.openclaw/tools/<skillKey>`)。

  </Accordion>
</AccordionGroup>

## 組態覆寫

可以在 `~/.openclaw/openclaw.json` 中的 `skills.entries` 下切換
內建與受管理的技能，並提供環境變數值：

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
  `false` 會停用該技能，即使它是內建的或已安裝的。 內建的 `coding-agent` 技能屬於選用：將其暴露給代理之前，請先設定 `skills.entries.coding-agent.enabled: true`，然後確保已安裝並為其自己的 CLI 認證了 `claude`、`codex`、`opencode` 或其他支援的 CLI。
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  對於宣告 `metadata.openclaw.primaryEnv` 的技能來說，這是一個便捷設定。支援純文字或 SecretRef。
</ParamField>
<ParamField path="env" type="Record<string, string>">
  僅在程序中尚未設定該變數時才會注入。
</ParamField>
<ParamField path="config" type="object">
  用於自訂各個技能欄位的選用容器。自訂金鑰必須置於此處。
</ParamField>
<ParamField path="allowBundled" type="string[]">
  僅適用於 **內建 (bundled)** 技能的選用允許清單。如果已設定，則只有清單中的內建技能符合資格（受管理/工作區技能不受影響）。
</ParamField>

如果技能名稱包含連字號，請將金鑰加上引號（JSON5 允許帶引號的金鑰）。設定金鑰預設符合 **技能名稱** — 如果技能定義了 `metadata.openclaw.skillKey`，請在 `skills.entries` 下使用該金鑰。

<Note>若要在 OpenClaw 內進行標準的圖像生成/編輯，請使用核心的 `image_generate` 工具搭配 `agents.defaults.imageGenerationModel`，而不要使用內建技能。此處的技能範例適用於自訂或第三方工作流程。若要進行原生圖像分析，請使用 `image` 工具搭配 `agents.defaults.imageModel`。如果您選擇 `openai/*`、`google/*`、`fal/*` 或其他供應商特定的圖像模型，也請一併新增該供應商的 auth/API 金鑰。</Note>

## 環境變數注入

當代理執行開始時，OpenClaw 會：

1. 讀取技能中繼資料。
2. 將 `skills.entries.<key>.env` 和 `skills.entries.<key>.apiKey` 套用至 `process.env`。
3. 使用 **符合資格 (eligible)** 的技能建構系統提示詞。
4. 在運行結束後恢復原始環境。

環境注入的作用範圍**僅限於 agent 運行期間**，而非全域 shell 環境。

對於捆綁的 `claude-cli` 後端，OpenClaw 也會將相同的合格快照具體化為臨時的 Claude Code 外掛，並透過 `--plugin-dir` 傳遞。Claude Code 隨後可以使用其原生技能解析器，而 OpenClaw 仍擁有優先順序、每個 agent 的允許清單、閘控以及 `skills.entries.*` env/API 金鑰注入的控制權。其他 CLI 後端則僅使用提示詞目錄。

## 快照與重新整理

OpenClaw 會在**工作階段啟動時**對合格的技能建立快照，並在該工作階段的後續輪次中重複使用該清單。對技能或設定的變更會在下一個新工作階段生效。

技能可在工作階段中途於兩種情況下重新整理：

- 已啟用技能監看器。
- 出現新的合格遠端節點。

將此視為一種**熱重載**（hot reload）：重新整理後的清單會在下一個 agent 輪次中被採用。如果該工作階段的有效 agent 技能允許清單發生變更，OpenClaw 會重新整理快照，使可見技能與目前的 agent 保持一致。

### 技能監看器

預設情況下，OpenClaw 會監看技能資料夾，並在 `SKILL.md` 檔案變更時更新技能快照。可在 `skills.load` 下進行設定：

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

對於刻意的工作區、專案 agent 或額外目錄佈局，如果技能根目錄包含符號連結（symlink），請使用 `allowSymlinkTargets`，例如 `<workspace>/skills/manager -> ~/Projects/manager/skills`。管理的 `~/.openclaw/skills` 和個人的 `~/.agents/skills` 預設可以跟隨來自本地技能管理器的技能目錄符號連結，但目標清單仍會在 realpath 解析後進行比對，因此在設定時應保持狹窄。

監看器涵蓋分組技能根目錄下的巢狀 `SKILL.md` 檔案。新增或編輯 `skills/personal/foo/SKILL.md` 重新整理快照的方式與編輯 `skills/foo/SKILL.md` 相同。

### 遠端 macOS 節點（Linux 閘道）

如果 Gateway 在 Linux 上運行，但連接了一個允許 `system.run` 的 **macOS 節點**（Exec approvals 安全性未設為 `deny`），當該節點上存在所需的二進制文件時，OpenClaw 可以將僅限 macOS 的技能視為可用。Agent 應透過 `exec` 工具並使用 `host=node` 來執行這些技能。

這取決於節點報告其指令支援情況，以及透過 `system.which` 或 `system.run` 進行的二進制探測。離線節點**不會**使僅限遠端的技能可見。如果已連接的節點停止回應二進制探測，OpenClaw 將清除其快取的二進制匹配項，因此 Agent 不再看到目前無法在那裡執行的技能。

## Token 影響

當技能符合資格時，OpenClaw 會將可用技能的精簡 XML 清單注入系統提示詞（透過 `session runtime` 中的 `formatSkillsForPrompt`）。成本是確定性的：

- **基本開銷**（僅當 ≥1 個技能時）：195 個字元。
- **每個技能**：97 個字元 + XML 轉義後的 `<name>`、`<description>` 和 `<location>` 值的長度。

公式（字元）：

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

XML 轉義會將 `& < > " '` 展開為實體（`&amp;`、`&lt;` 等），從而增加長度。Token 數量因模型分詞器而異。粗略的 OpenAI 風格估計為每個 Token 約 4 個字元，因此除了您實際的欄位長度外，**每個技能約為 97 個字元 ≈ 24 個 Token**。

## 受管理技能的生命週期

OpenClaw 隨安裝（npm 套件或 OpenClaw.app）提供了一組基準技能作為 **bundled skills**。`~/.openclaw/skills` 用於本機覆寫——例如，固定或修補技能而不更改捆绑副本。工作區技能為使用者所有，並在名稱衝突時覆寫前兩者。

## 尋找更多技能？

瀏覽 [https://clawhub.ai](https://clawhub.ai。完整的配置架構：[Skills config](/zh-Hant/tools/skills-config)。

## 相關

- [ClawHub](/zh-Hant/clawhub) - 公共技能註冊表
- [Creating skills](/zh-Hant/tools/creating-skills) - 建立自訂技能
- [Plugins](/zh-Hant/tools/plugin) - 外掛系統概覽
- [Skill Workshop plugin](/zh-Hant/plugins/skill-workshop) - 根據代理工作產生技能
- [Skills config](/zh-Hant/tools/skills-config) - 技能設定參考
- [Slash commands](/zh-Hant/tools/slash-commands) - 所有可用的斜線指令
