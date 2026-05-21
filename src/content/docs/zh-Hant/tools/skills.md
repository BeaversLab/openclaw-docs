---
summary: "技能：受管 vs 工作區、閘道規則、代理允許清單，以及設定連線"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "Skills"
sidebarTitle: "技能"
---

OpenClaw 使用 **與 [AgentSkills](https://agentskills.io) 相容** 的技能資料夾來教導代理如何使用工具。每個技能是一個包含帶有 YAML 前置資料與指令的 `SKILL.md` 之目錄。OpenClaw 會載入套件技能以及可選的本機覆寫，並在載入時根據環境、設定和二進位檔的存在與否進行篩選。

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

Codex CLI 原生的 `$CODEX_HOME/skills` 目錄並非這些 OpenClaw 技能根目錄之一。在 Codex harness 模式下，本機 app-server 啟動會使用獨立的每個代理 Codex home，因此操作員個人 `~/.codex/skills` 中的技能不會被隱含載入。Codex 原生的 `.agents` 探索會單獨使用繼承的 `HOME`；OpenClaw 上文自己的技能根目錄已經包含了 `~/.agents/skills`。使用 `openclaw migrate codex --dry-run` 來清點 Codex home 中的技能，然後使用 `openclaw migrate codex` 選擇技能目錄，透過互動式核取方塊提示將其複製到目前的 OpenClaw 代理工作區。對於非互動式執行，請針對要複製的確切技能重複 `--skill <name>`。

## 每個代理與共享技能

在 **多代理** 設定中，每個代理都有自己的工作區：

| 範圍            | 路徑                                   | 可見於             |
| --------------- | -------------------------------------- | ------------------ |
| 每個代理        | `<workspace>/skills`                   | 僅該代理           |
| 專案代理        | `<workspace>/.agents/skills`           | 僅該工作區的代理   |
| 個人代理        | `~/.agents/skills`                     | 該機器上的所有代理 |
| 共享受管理/本機 | `~/.openclaw/skills`                   | 該機器上的所有代理 |
| 共享額外目錄    | `skills.load.extraDirs` (優先順序最低) | 該機器上的所有代理 |

多個地方出現同名稱 → 最高來源獲勝。工作區勝過專案代理，勝過個人代理，勝過受管理/本機，勝過捆綁，勝過額外目錄。

## 代理技能允許清單

技能 **位置** 和技能 **可見性** 是分開的控制項。位置/優先順序決定同名稱技能的哪個副本獲勝；代理允許清單則決定代理實際上可以使用哪些技能。

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
  <Accordion title="Allowlist rules">- 預設情況下省略 `agents.defaults.skills` 以獲得不受限制的技能。 - 省略 `agents.list[].skills` 以繼承 `agents.defaults.skills`。 - 設定 `agents.list[].skills: []` 表示無技能。 - 非空的 `agents.list[].skills` 列表是該代理的 **最終** 集合 - 它不會與預設值合併。 - 有效的允許清單適用於提示構建、技能斜線指令探索、沙箱同步和技能快照。</Accordion>
</AccordionGroup>

## 外掛程式與技能

外掛程式可以透過在 `openclaw.plugin.json` 中列出 `skills` 目錄（相對於外掛程式根目錄的路徑）來附帶自己的技能。當外掛程式啟用時，外掛程式技能就會載入。這是放置工具專屬操作指南的正確位置，這些指南對於工具描述來說太長，但只要安裝了外掛程式就應該可供使用——例如，瀏覽器外掛程式附帶了一個用於多步驟瀏覽器控制的 `browser-automation` 技能。

外掛程式技能目錄會被合併到與 `skills.load.extraDirs` 相同的低優先級路徑中，因此同名的內建、受管理、代理程式或工作區技能會覆寫它們。您可以透過外掛程式配置項目上的 `metadata.openclaw.requires.config` 來限制它們。

請參閱 [Plugins](/zh-Hant/tools/plugin) 以了解探索/設定，並參閱 [Tools](/zh-Hant/tools) 以了解這些技能所教導的工具介面。

## 技能工作坊

這個選用的實驗性 **Skill Workshop** 外掛程式可以根據代理程式工作中觀察到的可重複程序來建立或更新工作區技能。它預設為停用，必須透過 `plugins.entries.skill-workshop` 明確啟用。

Skill Workshop 僅寫入 `<workspace>/skills`，會掃描產生的內容，支援待批准或自動安全寫入，隔離不安全的提案，並在成功寫入後重新整理技能快照，以便新技能無需重新啟動 Gateway 即可使用。

將其用於修正，例如 _「下次驗證 GIF 歸屬」_，或用於來之不易的工作流程，例如媒體 QA 檢查清單。一開始先採用待審核模式；僅在審查其提案後於受信任的工作區中使用自動寫入。完整指南：[Skill Workshop plugin](/zh-Hant/plugins/skill-workshop)。

## ClawHub (安裝與同步)

[ClawHub](https://clawhub.ai) 是 OpenClaw 的公開技能註冊表。使用原生的 `openclaw skills` 指令來進行探索/安裝/更新，或使用獨立的 `clawhub` CLI 進行發佈/同步工作流程。完整指南：[ClawHub](/zh-Hant/clawhub)。

| 動作                        | 指令                                            |
| --------------------------- | ----------------------------------------------- |
| 將技能安裝到工作區          | `openclaw skills install <skill-slug>`          |
| 為所有本機代理安裝技能      | `openclaw skills install <skill-slug> --global` |
| 更新所有已安裝的工作區技能  | `openclaw skills update --all`                  |
| 更新單一共享的受管理技能    | `openclaw skills update <skill-slug> --global`  |
| 更新所有共享受管理/本機技能 | `openclaw skills update --all --global`         |
| 同步（掃描 + 發佈更新）     | `clawhub sync --all`                            |

原生的 `openclaw skills install` 預設會安裝到啟用的工作區 `skills/` 目錄中。加入 `--global` 以安裝到共用的 managed/local 目錄（預設為 `~/.openclaw/skills`），除非 Agent 技能允許清單縮小了可見範圍，否則所有本地 Agent 都能看見。獨立的 `clawhub` CLI 也會安裝到您當前工作目錄下的 `./skills`（或者回退到設定的 OpenClaw 工作區）。OpenClaw 會在下次會話中將其識別為 `<workspace>/skills`。設定的技能根目錄也支援一層分組，例如 `skills/<group>/<skill>/SKILL.md`，因此相關的第三方技能可以保留在共用資料夾下，而無需進行廣泛的遞迴掃描。

需要私有、非 ClawHub 傳遞方式的 Gateway 用戶端，可以使用 `skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit` 來暫存 zip 技能封存檔，然後使用 `skills.install({ source: "upload", uploadId, slug, force?, sha256? })` 安裝已提交的上傳內容。這是供受信任用戶端使用的明確管理員上傳路徑，而非正常的 `openclaw skills install <slug>` 或 ClawHub 安裝流程。此功能預設為關閉，僅當在 `openclaw.json` 中設定了 `skills.install.allowUploadedArchives: true` 時才有效。上傳模式仍會安裝到預設的 Agent 工作區 `skills/<slug>` 目錄；封存檔的內部資料夾名稱在最終安裝目標中會被忽略。

ClawHub 技能頁面會在安裝前公開最新的安全掃描狀態，並提供 VirusTotal、ClawScan 和靜態分析的掃描器詳細資訊頁面。`openclaw skills install <slug>` 僅保留作為安裝路徑；發行者可以透過 ClawHub 儀表板或 `clawhub skill rescan <slug>` 解決誤報問題。

## 安全性

<Warning>將第三方技能視為 **不受信任的程式碼**。在啟用前請仔細閱讀。對於不受信任的輸入和風險工具，請優先使用沙箱執行。請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing) 以了解 Agent 端的控制項。</Warning>

- Workspace、project-agent 和 extra-dir 技能發現僅接受解析後的 realpath 保持在已設定根目錄內的技能根目錄，除非 `skills.load.allowSymlinkTargets` 明確信任目標根目錄。Bundled 技能始終保持在內部。受管理的 `~/.openclaw/skills` 和個人 `~/.agents/skills` 根目錄可能包含由 ClawHub 或其他本地技能管理器安裝的符號連結資料夾，但每個 `SKILL.md` 的 realpath 仍必須保持在其解析後的技能目錄內。
- 閘道私人封存安裝預設為關閉。當明確啟用時，它們需要包含 `SKILL.md` 的已提交 zip 上傳，並重複使用與 ClawHub 技能安裝相同的封存解壓縮、路徑遍歷、符號連結、強制和回滾保護。它們受 `skills.install.allowUploadedArchives` 限制；正常的 ClawHub 安裝不需要該設定。
- 由閘道支援的技能相依性安裝（`skills.install`、onboarding 和技能設定 UI）會在執行安裝程式元資料之前執行內建的危險程式碼掃描器。`critical` 發現結果預設會封鎖，除非呼叫者明確設定危險覆寫；可疑的發現結果仍僅會發出警告。
- `openclaw skills install <slug>` 不同——它會將 ClawHub 技能資料夾下載到工作區，或使用 `--global` 下載到共用的受管理/本機技能中，並且不使用上述的安裝程式元資料路徑。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 會將秘密注入該 agent 週期的 **host** 程序（而非沙箱）。請勿將秘密放入提示和日誌中。

如需更廣泛的威脅模型和檢查清單，請參閱 [Security](/zh-Hant/gateway/security)。

## SKILL.md 格式

`SKILL.md` 必須至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClaw 遵循 AgentSkills 規範的佈局/意圖。嵌入式 agent 使用的解析器僅支援 **單行** frontmatter 金鑰；`metadata` 應為 **單行 JSON 物件**。在指令中使用 `{baseDir}` 來引用技能資料夾路徑。

### 可選的 frontmatter 金鑰

<ParamField path="homepage" type="string">
  在 macOS Skills UI 中顯示為「網站」的 URL。也透過 `metadata.openclaw.homepage` 支援。
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  當 `true` 時，該技能會以使用者斜線指令的形式公開。
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  當 `true` 時，OpenClaw 會將技能的指令排除在代理的一般提示之外。該技能仍然會被安裝，並且當 `user-invocable` 也為 `true` 時，仍可作為斜線指令明確執行。
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  當設定為 `tool` 時，斜線指令會略過模型，直接分派至工具。
</ParamField>
<ParamField path="command-tool" type="string">
  當設定 `command-dispatch: tool` 時要叫用的工具名稱。
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  針對工具分派，將原始參數字串轉發給工具（無核心解析）。該工具會以 `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }` 被叫用。
</ParamField>

## 閘道（載入時篩選器）

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
  當 `true` 時，總是包含該技能（跳過其他閘道）。
</ParamField>
<ParamField path="emoji" type="string">
  由 macOS 技能 UI 使用的選用性 emoji。
</ParamField>
<ParamField path="homepage" type="string">
  在 macOS 技能 UI 中顯示為「網站」的選用性 URL。
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  平台的選用性列表。如果設定，該技能僅在那些 OS 上符合資格。
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
  必須為 truthy 的 `openclaw.json` 路徑列表。
</ParamField>
<ParamField path="primaryEnv" type="string">
  與 `skills.entries.<name>.apiKey` 相關聯的環境變數名稱。
</ParamField>
<ParamField path="install" type="object[]">
  由 macOS 技能 UI 使用的選用性安裝程式規格 (brew/node/go/uv/download)。
</ParamField>

如果不存在 `metadata.openclaw`，該技能始終符合資格（除非
在設定中停用或針對捆綁技能被 `skills.allowBundled` 封鎖）。

<Note>當缺少 `metadata.openclaw` 時，仍接受舊版 `metadata.clawdbot` 區塊，因此較舊的已安裝技能可保留其相依性閘道和安裝程式提示。新技能和更新後的技能應使用 `metadata.openclaw`。</Note>

### 沙盒備註

- `requires.bins` 會在技能載入時於 **主機** 上檢查。
- 如果代理被沙盒化，二進位檔案也必須存在於容器內。請透過 `agents.defaults.sandbox.docker.setupCommand`（或自訂映像檔）進行安裝。`setupCommand` 會在容器建立後執行一次。套件安裝還需要網路出口、可寫入的根檔案系統，以及沙盒中的 root 使用者。
- 範例：`summarize` 技能（`skills/summarize/SKILL.md`）需要 `summarize` CLI 位於沙盒容器中才能執行。

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
    - 如果列出多個安裝程式，閘道會挑選一個首選選項（優先選用 brew，否則選用 node）。
    - 如果所有安裝程式都是 `download`，OpenClaw 會列出每個項目，以便您查看可用的構件。
    - 安裝程式規格可以包含 `os: ["darwin"|"linux"|"win32"]` 以依平台篩選選項。
    - Node 安裝會遵守 `skills.install.nodeManager` 中的 `openclaw.json`（預設：npm；選項：npm/pnpm/yarn/bun）。這僅影響技能安裝；Gateway 執行時應仍為 Node - 不建議針對 WhatsApp/Telegram 使用 Bun。
    - Gateway 支援的安裝程式選擇是偏好驅動的：當安裝規格混合種類時，OpenClaw 會在啟用 `skills.install.preferBrew` 且存在 `brew` 時偏好 Homebrew，然後是 `uv`，接著是設定的 node 管理員，然後是其他備援選項，例如 `go` 或 `download`。
    - 如果每個安裝規格都是 `download`，OpenClaw 會顯示所有下載選項，而非折疊為單一首選安裝程式。

  </Accordion>
  <Accordion title="各安裝程式的詳細資訊">
    - **Homebrew 安裝：** OpenClaw 不會自動安裝 Homebrew，也不會將 brew 公式轉換為系統套件管理員指令。在沒有 `brew` 的 Linux 容器中，入門流程會隱藏僅限 brew 的相依性安裝程式；請使用自訂映像檔或在啟用該技能之前手動安裝相依性。
    - **Go 安裝：** 如果缺少 `go` 且有 `brew` 可用，閘道會先透過 Homebrew 安裝 Go，並在可行的情況下將 `GOBIN` 設定為 Homebrew 的 `bin`。
    - **下載安裝：** `url` (必要)、`archive` (`tar.gz` | `tar.bz2` | `zip`)、`extract` (預設：偵測到壓縮檔時為 auto)、`stripComponents`、`targetDir` (預設：`~/.openclaw/tools/<skillKey>`)。

  </Accordion>
</AccordionGroup>

## 設定覆寫

可以在 `~/.openclaw/openclaw.json` 中的 `skills.entries` 下切換內建與受管理的技能，並提供環境變數值：

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
  `false` 會停用該技能，即使它是內建或已安裝的。 內建的 `coding-agent` 技能預設為選用：在將其公開給 Agent 之前，請先設定 `skills.entries.coding-agent.enabled: true`，然後確保已安裝並驗證 `claude`、`codex`、`opencode` 或 `pi` 其中之一 的 CLI。
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  針對宣告 `metadata.openclaw.primaryEnv` 之技能的便利設定。支援純文字或 SecretRef。
</ParamField>
<ParamField path="env" type="Record<string, string>">
  僅在程序中尚未設定該變數時才注入。
</ParamField>
<ParamField path="config" type="object">
  用於自訂個別技能欄位的選用容器。自訂金鑰必須放在此處。
</ParamField>
<ParamField path="allowBundled" type="string[]">
  僅限 **內建** 技能的選用允許清單。若設定，則僅清單中的內建技能符合資格（受控/工作區技能不受影響）。
</ParamField>

如果技能名稱包含連字號，請用引號括住金鑰（JSON5 允許帶引號的金鑰）。設定金鑰預設符合 **技能名稱** - 如果技能定義了 `metadata.openclaw.skillKey`，請在 `skills.entries` 下使用該金鑰。

<Note>若要在 OpenClaw 內進行標準的影像生成/編輯，請使用核心 `image_generate` 工具搭配 `agents.defaults.imageGenerationModel`，而不要使用內建技能。此處的技能範例適用於自訂或第三方工作流程。若要進行原生影像分析，請使用 `image` 工具搭配 `agents.defaults.imageModel`。如果您選擇 `openai/*`、`google/*`、`fal/*` 或其他供應商專屬的影像模型，也請一併新增該供應商的 auth/API 金鑰。</Note>

## 環境變數注入

當 Agent 執行開始時，OpenClaw：

1. 讀取技能中繼資料。
2. 將 `skills.entries.<key>.env` 和 `skills.entries.<key>.apiKey` 套用至 `process.env`。
3. 使用**符合資格**的技能建構系統提示詞。
4. 在執行結束後還原原始環境。

環境注入的**範圍限於代理執行期間**，而非全域 shell 環境。

對於內建的 `claude-cli` 後端，OpenClaw 也會將相同的符合資格的快照實作為暫時的 Claude Code 外掛，並透過 `--plugin-dir` 傳遞。Claude Code 接著可以使用其原生技能解析器，而 OpenClaw 仍擁有優先順序、每個代理的允許清單、閘控以及 `skills.entries.*` env/API 金鑰注入。其他 CLI 後端僅使用提示詞目錄。

## 快照與重新整理

OpenClaw 會在**工作階段啟動時**對符合資格的技能進行快照，並在該工作階段的後續輪次中重複使用該清單。對技能或設定的變更會在下一個新工作階段生效。

技能可以在兩種情況下於工作階段中途重新整理：

- 已啟用技能監看器。
- 出現新的符合資格的遠端節點。

將其視為**熱重新載入**：重新整理後的清單會在下一個代理輪次中被採用。如果該工作階段的有效代理技能允許清單發生變更，OpenClaw 會重新整理快照，以便可見的技能保持與當前代理一致。

### 技能監看器

預設情況下，OpenClaw 會監看技能資料夾，並在 `SKILL.md` 檔案變更時更新技能快照。在 `skills.load` 下進行設定：

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

對於刻意安排的工作區、專案代理或額外目錄配置，如果技能根目錄包含符號連結，請使用 `allowSymlinkTargets`，例如 `<workspace>/skills/manager -> ~/Projects/manager/skills`。受管理的 `~/.openclaw/skills` 和個人的 `~/.agents/skills` 預設可以跟隨來自本機技能管理器的技能目錄符號連結，但目標清單仍會在解析真實路徑後進行比對，並且在配置時應保持狹窄。

### 遠端 macOS 節點 (Linux 閘道)

如果閘道在 Linux 上執行，但連接了 **macOS 節點**且允許 `system.run` (Exec approvals 安全性未設定為 `deny`)，則當該節點上存在必要的二進位檔案時，OpenClaw 可以將僅限 macOS 的技能視為符合資格。代理應透過 `exec` 工具使用 `host=node` 來執行這些技能。

這取決於節點回報其指令支援情況，以及透過 `system.which` 或 `system.run` 進行的 bin probe。離線節點**不會**讓僅限遠端的技能顯示出來。如果連線的節點停止回應 bin probes，OpenClaw 會清除其快取的 bin 符合項目，因此 Agent 不再會看到目前無法在那裡執行的技能。

## Token 影響

當技能符合資格時，OpenClaw 會將可用技能的精簡 XML 清單注入系統提示（透過 `formatSkillsForPrompt` 中的 `pi-coding-agent`）。成本是確定的：

- **基本額外開銷**（僅當有 ≥1 個技能時）：195 個字元。
- **每個技能：** 97 個字元 + 經過 XML 跳脫的 `<name>`、`<description>` 和 `<location>` 值的長度。

公式（字元）：

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

XML 跳脫會將 `& < > " '` 展開為實體（`&amp;`、`&lt;` 等），從而增加長度。Token 計數會根據模型的 tokenizer 而有所不同。粗略的 OpenAI 風格估計約為 4 個字元/token，因此每個技能 **97 個字元 ≈ 24 個 tokens**，再加上您實際的欄位長度。

## 受控技能生命週期

OpenClaw 隨安裝（npm 套件或 OpenClaw.app）附帶了一組基準技能作為**內綑技能 (bundled skills)**。`~/.openclaw/skills` 存在用於本機覆蓋——例如，釘選或修補技能而不變更內綑副本。工作區技能歸使用者所有，並且在名稱衝突時會覆蓋前兩者。

## 尋找更多技能？

瀏覽 [https://clawhub.ai](https://clawhub.ai)。完整配置結構描述：[Skills config](/zh-Hant/tools/skills-config)。

## 相關

- [ClawHub](/zh-Hant/clawhub) - 公開技能註冊表
- [Creating skills](/zh-Hant/tools/creating-skills) - 建立自訂技能
- [Plugins](/zh-Hant/tools/plugin) - 外掛系統概覽
- [Skill Workshop plugin](/zh-Hant/plugins/skill-workshop) - 從 Agent 工作生成技能
- [Skills config](/zh-Hant/tools/skills-config) - 技能配置參考
- [Slash commands](/zh-Hant/tools/slash-commands) - 所有可用的斜線指令
