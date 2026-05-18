---
summary: "技能：受管 vs 工作區、閘道規則、代理允許清單，以及設定連線"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "Skills"
sidebarTitle: "技能"
---

OpenClaw 使用與 **[AgentSkills](https://agentskills.io)** 相容的技能資料夾來教導代理如何使用工具。每個技能是一個包含帶有 YAML frontmatter 和指令的 `SKILL.md` 的目錄。OpenClaw 會載入捆綁的技能以及可選的本機覆寫，並在載入時根據環境、設定和二進位檔案的存在進行篩選。

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

請參閱 [外掛程式](/zh-Hant/tools/plugin) 以了解探索/配置，並參閱 [工具](/zh-Hant/tools) 以了解這些技能所教授的工具介面。

## 技能工作坊

這個選用的實驗性 **Skill Workshop** 外掛程式可以根據代理程式工作中觀察到的可重複程序來建立或更新工作區技能。它預設為停用，必須透過 `plugins.entries.skill-workshop` 明確啟用。

Skill Workshop 僅寫入 `<workspace>/skills`，會掃描產生的內容，支援待批准或自動安全寫入，隔離不安全的提案，並在成功寫入後重新整理技能快照，以便新技能無需重新啟動 Gateway 即可使用。

將其用於諸如 _「下次驗證 GIF 歸屬」_ 之類的修正，或是諸如媒體 QA 檢查清單之類的艱辛得來的工作流程。從待批准開始；僅在審查其提案後於受信任的工作區中使用自動寫入。完整指南：[Skill Workshop 外掛程式](/zh-Hant/plugins/skill-workshop)。

## ClawHub (安裝與同步)

[ClawHub](https://clawhub.ai) 是 OpenClaw 的公開技能註冊表。使用原生的 `openclaw skills` 指令進行探索/安裝/更新，或使用獨立的 `clawhub` CLI 進行發佈/同步工作流程。完整指南：[ClawHub](/zh-Hant/clawhub)。

| 動作                   | 指令                                   |
| ---------------------- | -------------------------------------- |
| 將技能安裝到工作區     | `openclaw skills install <skill-slug>` |
| 更新所有已安裝的技能   | `openclaw skills update --all`         |
| 同步 (掃描 + 發佈更新) | `clawhub sync --all`                   |

原生 `openclaw skills install` 會安裝到使用中工作區的
`skills/` 目錄中。獨立的 `clawhub` CLI 也會安裝到
當前工作目錄下的 `./skills`（或回退到已配置的 OpenClaw 工作區）。OpenClaw 會在下一個工作階段將其識別為
`<workspace>/skills`。
已配置的技能根目錄也支援一個分組層級，例如
`skills/<group>/<skill>/SKILL.md`，以便將相關的第三方技能保留在共用資料夾下，而無需廣泛的遞迴掃描。

需要私人、非 ClawHub 傳遞的 Gateway 用戶端可以使用
`skills.upload.begin`、`skills.upload.chunk` 和
`skills.upload.commit` 準備 zip 技能壓縮檔，然後使用
`skills.install({ source: "upload", uploadId, slug, force?, sha256? })` 安裝已提交的上傳內容。這是
一個專為受信用戶端設定的明確管理員上傳路徑，而非正常的
`openclaw skills install <slug>` 或 ClawHub 安裝流程。此功能預設關閉，
並且僅當在 `openclaw.json` 中設定了
`skills.install.allowUploadedArchives: true` 時才會運作。上傳模式仍然會安裝到預設的 Agent 工作區
`skills/<slug>` 目錄；壓縮檔的內部資料夾名稱在最終安裝目標中會被忽略。

ClawHub 技能頁面會在安裝前公開最新的安全掃描狀態，
並提供 VirusTotal、ClawScan 和靜態分析的掃描器詳細資訊頁面。
`openclaw skills install <slug>` 僅保留為安裝路徑；發布者
可以透過 ClawHub 儀表板或
`clawhub skill rescan <slug>` 解決誤報問題。

## 安全性

<Warning>將第三方技能視為 **不受信任的程式碼**。在啟用前請先閱讀。 對於不受信任的輸入和風險工具，請優先使用沙箱執行。請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing) 以了解 Agent 端的控制項。</Warning>

- 工作區、專案代理 和額外目錄 的技能探索僅接受已解析真實路徑位於已設定根目錄內的技能根目錄，除非 `skills.load.allowSymlinkTargets` 明確信任目標根目錄。捆綁技能始終保持受包含狀態。受管理的 `~/.openclaw/skills` 和個人 `~/.agents/skills` 根目錄可能包含由 ClawHub 或其他本機技能管理器安裝的符號連結技能資料夾，但每個 `SKILL.md` 的真實路徑仍必須保持在其已解析的技能目錄內。
- 閘道私有封存安裝預設為關閉。當明確啟用時，它們需要包含 `SKILL.md` 的提交 zip 上傳，並且重複使用與 ClawHub 技能安裝相同的封存解壓縮、路徑遍歷、符號連結、強制和回滾保護。它們由 `skills.install.allowUploadedArchives` 限制；正常的 ClawHub 安裝不需要該設定。
- 閘道支援的技能相依性安裝 (`skills.install`、onboarding 和技能設定 UI) 在執行安裝程式中繼資料之前會執行內建的危險代碼掃描器。除非呼叫者明確設定危險覆寫，否則 `critical` 的發現預設會封鎖；可疑的發現仍僅會發出警告。
- `openclaw skills install <slug>` 則不同 - 它會將 ClawHub 技能資料夾下載到工作區，並且不使用上述的安裝程式中繼資料路徑。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 會將秘密資訊注入該代理輪次的 **主機** 程序（而非沙箱）。請勿將秘密資訊放入提示詞和日誌中。

如需更廣泛的威脅模型和檢查清單，請參閱 [Security](/zh-Hant/gateway/security)。

## SKILL.md 格式

`SKILL.md` 必須至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClaw 遵循 AgentSkills 規範的佈局/意圖。嵌入式代理使用的解析器僅支援 **單行** 前置資料鍵；`metadata` 應為 **單行 JSON 物件**。請在指令中使用 `{baseDir}` 來引用技能資料夾路徑。

### 可選的 frontmatter 鍵

<ParamField path="homepage" type="string">
  在 macOS Skills UI 中顯示為「Website」的 URL。也可透過 `metadata.openclaw.homepage` 支援。
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  當 `true` 時，該技能會公開為使用者斜線指令。
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  當 `true` 時，OpenClaw 會將技能的指示保持在代理的一般提示之外。只要 `user-invocable` 也為 `true`，該技能仍會安裝，並且仍可作為斜線指令明確執行。
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  設定為 `tool` 時，斜線指令會略過模型並直接分派給工具。
</ParamField>
<ParamField path="command-tool" type="string">
  當設定 `command-dispatch: tool` 時要叫用的工具名稱。
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  對於工具分派，將原始參數字串轉發給工具（無核心剖析）。工具會以 `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }` 叫用。
</ParamField>

## 閘道（載入時篩選器）

OpenClaw 在載入時會使用 `metadata`（單行 JSON）來篩選技能：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的欄位：

<ParamField path="always" type="boolean">
  當 `true` 時，始終包含該技能（略過其他閘門）。
</ParamField>
<ParamField path="emoji" type="string">
  macOS Skills UI 使用的可選 emoji。
</ParamField>
<ParamField path="homepage" type="string">
  在 macOS Skills UI 中顯示為「Website」的可選 URL。
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  平台的可選列表。如果設定，該技能僅在這些作業系統上符合資格。
</ParamField>
<ParamField path="requires.bins" type="string[]">
  每個都必須存在於 `PATH`。
</ParamField>
<ParamField path="requires.anyBins" type="string[]">
  至少一個必須存在於 `PATH`。
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
  macOS Skills UI 使用的可選安裝程式規格（brew/node/go/uv/download）。
</ParamField>

如果沒有 `metadata.openclaw`，該技能始終符合資格（除非在設定中停用，或對於捆綁技能被 `skills.allowBundled` 封鎖）。

<Note>當 `metadata.openclaw` 不存在時，仍接受舊版 `metadata.clawdbot` 區塊，因此較早安裝的技能會保留其相依性閘門和安裝程式提示。新技能和更新後的技能應使用 `metadata.openclaw`。</Note>

### 沙箱備註

- `requires.bins` 會在技能載入時於 **主機** 上檢查。
- 如果代理是在沙箱中運行的，二進位檔案也必須存在於**容器內部**。請透過 `agents.defaults.sandbox.docker.setupCommand`（或自訂映像檔）進行安裝。`setupCommand` 會在容器建立後執行一次。套件安裝還需要網路出口、可寫入的根檔案系統以及沙箱中的 root 使用者。
- 範例：`summarize` 技能（`skills/summarize/SKILL.md`）需要在沙箱容器中有 `summarize` CLI 才能在那裡執行。

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
    - 如果列出了多個安裝程式，閘道會選擇一個首選選項（優先使用 brew，否則使用 node）。
    - 如果所有安裝程式都是 `download`，OpenClaw 會列出每個條目，以便您查看可用的構件。
    - 安裝程式規格可以包含 `os: ["darwin"|"linux"|"win32"]` 以依平台篩選選項。
    - Node 安裝會遵守 `openclaw.json` 中的 `skills.install.nodeManager`（預設：npm；選項：npm/pnpm/yarn/bun）。這僅影響技能安裝；Gateway 執行時環境仍應為 Node - 不建議將 Bun 用於 WhatsApp/Telegram。
    - Gateway 支援的安裝程式選擇是偏好驅動的：當安裝規格混合不同種類時，如果啟用了 `skills.install.preferBrew` 且 `brew` 存在，OpenClaw 會偏好 Homebrew，然後是 `uv`，接著是設定的 node 管理程式，然後是其他備案，如 `go` 或 `download`。
    - 如果每個安裝規格都是 `download`，OpenClaw 會顯示所有下載選項，而不是折疊為一個首選安裝程式。

  </Accordion>
  <Accordion title="Per-installer details">
    - **Homebrew installs:** OpenClaw 不會自動安裝 Homebrew 或將
      brew 公式轉換為系統套件管理器指令。在沒有 `brew` 的 Linux 容器中，
      入門程序會隱藏僅限 brew 的相依性安裝程式；請使用
      自訂映像檔或在啟用該技能之前手動安裝相依性。
    - **Go installs:** 如果缺少 `go` 且有 `brew`，
      閘道會先透過 Homebrew 安裝 Go，並在可能時將 `GOBIN`
      設定為 Homebrew 的 `bin`。
    - **Download installs:** `url` (必要)，`archive` (`tar.gz` | `tar.bz2` | `zip`)，`extract` (預設：偵測到封存檔時為 auto)，`stripComponents`，`targetDir` (預設：`~/.openclaw/tools/<skillKey>`)。

  </Accordion>
</AccordionGroup>

## 設定覆寫

可以在 `~/.openclaw/openclaw.json` 中的 `skills.entries` 下切換
內建與管理的技能，並提供環境變數值：

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
  `false` 即使該技能為內建或已安裝也會將其停用。 內建的 `coding-agent` 技能屬於選用功能：請在將其公開給代理之前設定 `skills.entries.coding-agent.enabled: true`，然後確保已安裝並為 `claude`、`codex`、`opencode` 或 `pi` 其中之一設定其 CLI 的驗證。
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  為宣告 `metadata.openclaw.primaryEnv` 的技能提供便利。支援純文字或 SecretRef。
</ParamField>
<ParamField path="env" type="Record<string, string>">
  僅在程序中尚未設定該變數時才進行注入。
</ParamField>
<ParamField path="config" type="object">
  用於自訂各別技能欄位的選用容器。自訂金鑰必須置於此處。
</ParamField>
<ParamField path="allowBundled" type="string[]">
  僅限 **bundled** 技能的選用允許清單。若已設定，則僅清單中的內建技能符合資格 (受管理/工作區技能不受影響)。
</ParamField>

如果技能名稱包含連字號，請為金鑰加上引號 (JSON5 允許使用引號括住金鑰)。設定金鑰預設符合 **skill name** (技能名稱) - 如果技能定義了 `metadata.openclaw.skillKey`，請在 `skills.entries` 下使用該金鑰。

<Note>若要在 OpenClaw 內進行標準的圖像生成/編輯，請使用核心 `image_generate` 工具搭配 `agents.defaults.imageGenerationModel`，而非內建技能。此處的技能範例適用於自訂或第三方工作流程。若要進行原生圖像分析，請使用 `image` 工具搭配 `agents.defaults.imageModel`。如果您選擇 `openai/*`、`google/*`、 `fal/*` 或其他供應商專屬的圖像模型，也請一併新增該供應商的 auth/API 金鑰。</Note>

## 環境注入

當代理執行開始時，OpenClaw 會：

1. 讀取技能元資料。
2. 將 `skills.entries.<key>.env` 和 `skills.entries.<key>.apiKey` 套用至 `process.env`。
3. 使用 **符合資格** 的技能建構系統提示詞。
4. 執行結束後恢復原始環境。

環境注入的範圍 **僅限於該次代理執行**，而非全域 shell 環境。

對於內建的 `claude-cli` 後端，OpenClaw 也會將相同的合格快照具體化為暫時的 Claude Code 外掛程式，並透過 `--plugin-dir` 傳遞。Claude Code 接著可以使用其原生技能解析器，而 OpenClaw 仍擁有優先順序、每個代理程式的允許清單、閘控以及 `skills.entries.*` 環境/API 金鑰注入。其他 CLI 後端僅使用提示詞目錄。

## 快照與重新整理

OpenClaw 會在 **工作階段開始時** 對符合資格的技能進行快照，並在同一工作階段的後續輪次中重用該清單。對技能或配置的變更會在下一個新工作階段生效。

技能可以在工作階段中途重新整理的情況有兩種：

- 已啟用技能監看器。
- 出現了新的符合資格的遠端節點。

您可以將此視為一種 **熱重新載入**：重新整理後的清單會在下一個代理輪次中生效。如果該工作階段的有效代理技能允許清單發生變更，OpenClaw 會重新整理快照，確保可見的技能與當前代理保持一致。

### 技能監看器

根據預設，OpenClaw 會監看技能資料夾，並在 `SKILL.md` 檔案變更時更新技能快照。在 `skills.load` 下進行設定：

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

對於刻意的工作區、專案代理程式或額外目錄佈局，如果技能根目錄包含符號連結 (例如 `<workspace>/skills/manager -> ~/Projects/manager/skills`)，請使用 `allowSymlinkTargets`。受管理的 `~/.openclaw/skills` 和個人 `~/.agents/skills` 根據預設可以跟隨來自本地技能管理器的技能目錄符號連結，但目標清單仍會在解析真實路徑 後進行比對，因此在設定時應保持狹窄範圍。

### 遠端 macOS 節點（Linux 閘道）

如果 Gateway 在 Linux 上執行，但連接了一個允許 `system.run` 的 **macOS 節點** (Exec approvals 安全性未設為 `deny`)，且該節點上存在所需的二進位檔案，則 OpenClaw 可以將僅限 macOS 的技能視為符合資格。代理程式應透過 `exec` 工具搭配 `host=node` 來執行這些技能。

這取決於節點回報其指令支援能力，以及透過 `system.which` 或 `system.run` 進行的二進位檔案探測。離線節點**不會**顯示僅限遠端的技能。如果已連接的節點停止回應二進位檔案探測，OpenClaw 會清除其快取的二進位檔案相符項目，使代理程式不再看到目前無法在那裡執行的技能。

## Token 影響

當技能符合資格時，OpenClaw 會將可用技能的精簡 XML 清單注入系統提示詞 (透過 `pi-coding-agent` 中的 `formatSkillsForPrompt`)。成本是確定的：

- **基本額外開銷**（僅當 ≥1 個技能時）：195 個字元。
- **每個技能：** 97 個字元 + XML 轉義後的 `<name>`、`<description>` 和 `<location>` 值的長度。

公式（字元）：

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

XML escaping 將 `& < > " '` 展開為實體（`&amp;`、`&lt;` 等），
從而增加長度。Token 計數會根據模型分詞器而變化。粗略的
OpenAI 風格估計約為 4 個字元/token，因此每個技能 **97 個字元 ≈ 24 個 tokens**，
再加上您實際的欄位長度。

## 受管理技能的生命週期

OpenClaw 隨安裝（npm 套件或 OpenClaw.app）提供了一組基準技能作為 **bundled skills**。
`~/.openclaw/skills` 存在用於本機覆寫——例如，固定或修補技能而
不變更打包副本。Workspace 技能由使用者擁有，並在名稱衝突時覆寫
兩者。

## 尋找更多技能？

瀏覽 [https://clawhub.ai](https://clawhub.ai)。完整配置架構：
[Skills config](/zh-Hant/tools/skills-config)。

## 相關

- [ClawHub](/zh-Hant/clawhub) - 公開技能註冊表
- [Creating skills](/zh-Hant/tools/creating-skills) - 建立自訂技能
- [Plugins](/zh-Hant/tools/plugin) - 外掛系統概覽
- [Skill Workshop plugin](/zh-Hant/plugins/skill-workshop) - 從代理的工作產生技能
- [Skills config](/zh-Hant/tools/skills-config) - 技能配置參考
- [Slash commands](/zh-Hant/tools/slash-commands) - 所有可用的斜線指令
