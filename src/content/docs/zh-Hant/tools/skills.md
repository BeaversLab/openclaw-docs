---
summary: "Skills：託管與工作區、閘控規則以及配置/環境連線"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "Skills"
---

# 技能

OpenClaw 使用與 **[AgentSkills](https://agentskills.io)** 相容的技能資料夾來教導代理如何使用工具。每個技能都是一個包含 `SKILL.md` 的目錄，其中帶有 YAML 前置元資料和指令。OpenClaw 會載入 **封包技能** 以及可選的本地覆寫，並在載入時根據環境、配置和二進位檔案的存在性進行篩選。

## 位置與優先順序

OpenClaw 從這些來源載入技能：

1. **額外技能資料夾**：透過 `skills.load.extraDirs` 進行配置
2. **內建技能**：隨安裝版本（npm 套件或 OpenClaw.app）附帶
3. **託管/本機技能**：`~/.openclaw/skills`
4. **個人代理技能**：`~/.agents/skills`
5. **專案代理技能**：`<workspace>/.agents/skills`
6. **工作區技能**：`<workspace>/skills`

如果技能名稱衝突，優先順序為：

`<workspace>/skills` (最高) → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → 套件技能 → `skills.load.extraDirs` (最低)

## Per-agent vs shared skills

在 **multi-agent** 設定中，每個 agent 都有自己的工作區。這意味著：

- **單一代理技能** 僅存在於該代理的 `<workspace>/skills` 中。
- **專案代理技能** 位於 `<workspace>/.agents/skills` 中，並在一般工作區 `skills/` 資料夾之前套用於該工作區。
- **個人代理技能** 位於 `~/.agents/skills` 中，並套用於該機器上的所有工作區。
- **共享技能** 位於 `~/.openclaw/skills` (託管/本機) 中，對同一台機器上的 **所有代理** 可見。
- 如果您希望使用由多個代理共用的通用技能包，也可以透過 `skills.load.extraDirs` (優先順序最低) 新增 **共享資料夾**。

如果相同的技能名稱存在於多個位置，則適用一般的優先順序：工作區優先，接著是專案代理程式技能，然後是個人代理程式技能，接著是受管理/本機，然後是隨附的，最後是額外的目錄。

## 代理技能允許清單

技能 **位置** 和技能 **可見性** 是分開的控制項。

- 位置/優先順序決定了同名技能的哪個副本獲勝。
- 代理允許清單決定了代理可以實際使用哪些可見技能。

使用 `agents.defaults.skills` 作為共享基準，然後使用 `agents.list[].skills` 按代理進行覆寫：

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

規則：

- 省略 `agents.defaults.skills` 以預設允許不受限的技能。
- 省略 `agents.list[].skills` 以繼承 `agents.defaults.skills`。
- 設定 `agents.list[].skills: []` 以不使用任何技能。
- 非空的 `agents.list[].skills` 列表是該代理程式的最終集合；它不會與預設值合併。

OpenClaw 會在提示詞建構、技能斜線指令探索、沙箱同步和技能快照中套用有效的代理程式技能集合。

## 外掛程式 + 技能

外掛程式可以透過在 `openclaw.plugin.json` 中列出 `skills` 目錄來隨附其自己的技能（路徑相對於外掛程式根目錄）。當外掛程式啟用時，會載入外掛程式技能。目前這些目錄會被合併到與 `skills.load.extraDirs` 相同的低優先級路徑中，因此同名稱的封包、受管理、代理或工作區技能會覆寫它們。您可以透過外掛程式配置項目上的 `metadata.openclaw.requires.config` 對其進行閘道控制。請參閱 [Plugins](/zh-Hant/tools/plugin) 以進行探索/配置，並參閱 [Tools](/zh-Hant/tools) 以了解這些技能所教授的工具介面。

## 技能工作坊

選用且實驗性的技能工作坊外掛程式可以根據代理工作期間觀察到的可重複程序來建立或更新工作區技能。它預設為停用，且必須透過 `plugins.entries.skill-workshop` 明確啟用。

技能工作坊僅寫入 `<workspace>/skills`，掃描生成的內容，支援待核准或自動安全寫入，隔離不安全的提案，並在成功寫入後重新整理技能快照，以便新技能可在不需重新啟動 Gateway 的情況下生效。

當您希望諸如「下次請驗證 GIF 來源」之類的修正，或諸如媒體 QA 檢查清單之類得來不易的工作流程變為持久的程序指令時，請使用它。從待核准開始；僅在檢閱其提案後，於受信任的工作區中使用自動寫入。完整指南：[Skill Workshop Plugin](/zh-Hant/plugins/skill-workshop)。

## ClawHub（安裝 + 同步）

ClawHub 是 OpenClaw 的公開技能註冊表。請在 [https://clawhub.ai](https://clawhub.ai) 瀏覽。使用原生的 `openclaw skills` 指令來探索/安裝/更新技能，或是當您需要發佈/同步工作流程時，使用獨立的 `clawhub` CLI。完整指南：[ClawHub](/zh-Hant/tools/clawhub)。

常見流程：

- 將技能安裝到您的工作區：
  - `openclaw skills install <skill-slug>`
- 更新所有已安裝的技能：
  - `openclaw skills update --all`
- 同步（掃描 + 發布更新）：
  - `clawhub sync --all`

原生的 `openclaw skills install` 會安裝到啟用工作區的 `skills/`
目錄中。獨立的 `clawhub` CLI 也會安裝到您目前
工作目錄下的 `./skills`（或回退到已設定的 OpenClaw 工作區）。
OpenClaw 會在下次會話時將其視為 `<workspace>/skills` 載入。

## 安全性注意事項

- 請將第三方技能視為**不受信任的程式碼**。在啟用前請閱讀其內容。
- 針對不受信任的輸入和風險工具，請優先使用沙箱執行。請參閱[沙箱機制](/zh-Hant/gateway/sandboxing)。
- 工作區和額外目錄的技能探索僅接受解析後的真實路徑位於設定根目錄內的技能根目錄和 `SKILL.md` 檔案。
- 由閘道支援的技能相依性安裝（`skills.install`、入門引導和技能設定 UI）會在執行安裝程式中繼資料之前執行內建的危險程式碼掃描器。`critical` 的偵測結果預設會封鎖安裝，除非呼叫者明確設定危險覆寫；可疑的偵測結果仍然僅會發出警告。
- `openclaw skills install <slug>` 則有所不同：它會將 ClawHub 技能資料夾下載到工作區，並不使用上述的安裝程式中繼資料路徑。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 會將機密注入到該 agent 週期的 **主機** 程序中
  （而非沙箱）。請勿在提示和日誌中洩漏機密。
- 如需更廣泛的威脅模型和檢查清單，請參閱[安全性](/zh-Hant/gateway/security)。

## 格式（AgentSkills + Pi 相容）

`SKILL.md` 必須至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

備註：

- 我們遵循 AgentSkills 規範來處理佈局與意圖。
- 內嵌 agent 使用的解析器僅支援**單行** frontmatter 金鑰。
- `metadata` 應為一個**單行 JSON 物件**。
- 在指令中使用 `{baseDir}` 來參照技能資料夾路徑。
- 選用的 frontmatter 金鑰：
  - `homepage` — 在 macOS Skills UI 中顯示為「Website」的 URL（亦可透過 `metadata.openclaw.homepage` 取得支援）。
  - `user-invocable` — `true|false`（預設值：`true`）。當 `true` 時，該技能會以使用者斜線指令的形式公開。
  - `disable-model-invocation` — `true|false`（預設值：`false`）。當 `true` 時，該技能會從模型提示詞中排除（但仍可透過使用者呼叫使用）。
  - `command-dispatch` — `tool`（選用）。設為 `tool` 時，該斜線指令會略過模型並直接分發至工具。
  - `command-tool` — 當設定 `command-dispatch: tool` 時要叫用的工具名稱。
  - `command-arg-mode` — `raw`（預設值）。對於工具分發，會將原始引數字串轉發給工具（無核心解析）。

    工具會使用以下參數叫用：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 篩選（載入時過濾器）

OpenClaw 使用 `metadata`（單行 JSON）在**載入時篩選技能**：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的欄位：

- `always: true` — 始終包含該技能（略過其他閘門）。
- `emoji` — macOS Skills UI 所使用的選用 emoji。
- `homepage` — macOS Skills UI 中顯示為「Website」的選用 URL。
- `os` — 平台選用列表（`darwin`、`linux`、`win32`）。若設定，則該技能僅在這些作業系統上適用。
- `requires.bins` — 列表；每個項目必須存在於 `PATH` 上。
- `requires.anyBins` — 列表；至少一個項目必須存在於 `PATH` 上。
- `requires.env` — 列表；環境變數必須存在**或**於設定中提供。
- `requires.config` — 必須為真值的 `openclaw.json` 路徑列表。
- `primaryEnv` — 與 `skills.entries.<name>.apiKey` 關聯的環境變數名稱。
- `install` — macOS Skills UI 使用的安裝程式規格的可選陣列（brew/node/go/uv/download）。

關於沙盒的注意事項：

- `requires.bins` 會在技能載入時於 **主機** 上進行檢查。
- 如果代理程式在沙盒中，二進位檔案也必須存在於 **容器內部**。
  請透過 `agents.defaults.sandbox.docker.setupCommand` 安裝（或使用自訂映像）。
  `setupCommand` 會在容器建立後執行一次。
  套件安裝還需要網路出口、可寫入的根檔案系統，以及沙盒中的 root 使用者。
  範例：`summarize` 技能（`skills/summarize/SKILL.md`）需要 `summarize` CLI
  才能在沙盒容器中執行。

安裝程式範例：

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

備註：

- 如果列出了多個安裝程式，閘道會挑選 **單一** 首選選項（如果有 brew 則優先使用，否則使用 node）。
- 如果所有安裝程式都是 `download`，OpenClaw 會列出每個項目，以便您查看可用的構件。
- 安裝程式規格可以包含 `os: ["darwin"|"linux"|"win32"]` 以依平台篩選選項。
- Node 安裝會遵守 `skills.install.nodeManager` 中的 `openclaw.json`（預設：npm；選項：npm/pnpm/yarn/bun）。
  這僅影響 **技能安裝**；閘道執行時仍應為 Node
  （不建議在 WhatsApp/Telegram 上使用 Bun）。
- 閘道支援的安裝程式選擇是由偏好驅動，而非僅限 node：
  當安裝規格混合不同種類時，如果啟用了 `skills.install.preferBrew` 且存在 `brew`，OpenClaw 會優先使用 Homebrew，然後是 `uv`，接著是
  設定的 node 管理員，然後是其他備援方案，如 `go` 或 `download`。
- 如果每個安裝規格都是 `download`，OpenClaw 會顯示所有下載選項
  而不是折疊為一個首選安裝程式。
- Go 安裝：如果缺少 `go` 且有 `brew` 可用，閘道會先透過 Homebrew 安裝 Go，並盡可能將 `GOBIN` 設定為 Homebrew 的 `bin`。
- 下載安裝：`url`（必要），`archive`（`tar.gz` | `tar.bz2` | `zip`），`extract`（預設：偵測到壓縮檔時為 auto），`stripComponents`，`targetDir`（預設 `~/.openclaw/tools/<skillKey>`）。

如果沒有 `metadata.openclaw`，該技能始終符合資格（除非在設定中停用，或因內建技能被 `skills.allowBundled` 封鎖）。

## 設定覆寫（`~/.openclaw/openclaw.json`）

內建/管理的技能可以切換並提供環境變數值：

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

注意：如果技能名稱包含連字號，請將鍵值加上引號（JSON5 允許加上引號的鍵值）。

如果您想要在 OpenClaw 內部使用標準的圖像生成/編輯，請搭配 `agents.defaults.imageGenerationModel` 使用核心 `image_generate` 工具，而不是使用內建技能。此處的技能範例適用於自訂或第三方工作流程。

若要進行原生圖像分析，請搭配 `agents.defaults.imageModel` 使用 `image` 工具。
若要進行原生圖像生成/編輯，請搭配 `agents.defaults.imageGenerationModel` 使用 `image_generate`。如果您選擇 `openai/*`、`google/*`、
`fal/*` 或其他供應商特定的圖像模型，也請一併新增該供應商的 auth/API 金鑰。

設定鍵值預設符合 **技能名稱**。如果技能定義了
`metadata.openclaw.skillKey`，請在 `skills.entries` 下使用該鍵值。

規則：

- `enabled: false` 會停用技能，即使它是內建/已安裝的。
- `env`：**僅在** 變數尚未在程序中設定時才會注入。
- `apiKey`：為宣告了 `metadata.openclaw.primaryEnv` 的技能提供便利。
  支援純文字字串或 SecretRef 物件（`{ source, provider, id }`）。
- `config`：用於自訂每個技能欄位的選用性容器；自訂鍵值必須放在這裡。
- `allowBundled`：僅適用於**內建**技能的可選允許列表。如果設定，則僅列表中的內建技能符合資格（受管理/工作區技能不受影響）。

## 環境注入（每次代理執行）

當代理執行開始時，OpenClaw：

1. 讀取技能元資料。
2. 將任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 應用於
   `process.env`。
3. 使用**符合資格**的技能建構系統提示詞。
4. 在執行結束後還原原始環境。

此範圍僅限於**代理執行**，而非全域 shell 環境。

對於內建的 `claude-cli` 後端，OpenClaw 也會將相同的符合資格的快照具體化為臨時 Claude Code 外掛，並透過 `--plugin-dir` 傳遞。Claude Code 接著可以使用其原生技能解析器，同時 OpenClaw 仍擁有優先權、每代理允許列表、閘控以及 `skills.entries.*` env/API 金鑰注入。其他 CLI 後端僅使用提示詞目錄。

## 工作階段快照（效能）

OpenClaw 會在**工作階段開始時**對符合資格的技能進行快照，並在該工作階段的後續輪次中重複使用該列表。對技能或設定的變更會在下一個新工作階段生效。

當啟用技能監看器或出現新的符合資格的遠端節點時（見下文），技能也可以在工作階段中途重新整理。將此視為**熱重新載入**：更新的列表將在下一個代理輪次中被採用。

如果該工作階段的有效代理技能允許列表發生變化，OpenClaw
會重新整理快照，以便可見技能與當前
代理保持一致。

## 遠端 macOS 節點（Linux 閘道）

如果閘道在 Linux 上執行，但連接了**macOS 節點**且**允許 `system.run`**（Exec approvals 安全性未設定為 `deny`），則當該節點上存在所需的二進位檔案時，OpenClaw 可以將僅限 macOS 的技能視為符合資格。代理應透過帶有 `host=node` 的 `exec` 工具執行這些技能。

這取決於節點報告其指令支援情況以及透過 `system.run` 進行的二進位檔案探測。如果 macOS 節點後來離線，技能仍然可見；在節點重新連線之前，調用可能會失敗。

## 技能監看器（自動重新整理）

根據預設，OpenClaw 會監視技能資料夾，並在 `SKILL.md` 檔案變更時更新技能快照。您可以在 `skills.load` 下進行設定：

```json5
{
  skills: {
    load: {
      watch: true,
      watchDebounceMs: 250,
    },
  },
}
```

## Token 影響（技能列表）

當技能符合資格時，OpenClaw 會將可用的精簡 XML 技能列表注入系統提示詞（透過 `formatSkillsForPrompt` 中的 `pi-coding-agent`）。成本是確定的：

- **基本額外開銷（僅當 ≥1 個技能時）：** 195 個字元。
- **每個技能：** 97 個字元加上 XML 轉義後的 `<name>`、`<description>` 和 `<location>` 值的長度。

公式（字元）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

註記：

- XML 轉義會將 `& < > " '` 展開為實體（如 `&amp;`、`&lt;` 等），從而增加長度。
- Token 數量因模型分詞器而異。粗略的 OpenAI 風格估計約為每 Token 4 個字元，因此每個技能 **97 個字元 ≈ 24 個 Tokens**，加上您實際的欄位長度。

## 管理技能生命週期

OpenClaw 在安裝過程中（npm 套件或 OpenClaw.app）提供了一組基準技能作為 **bundled skills**。`~/.openclaw/skills` 用於本地覆寫（例如，在不變更打包副本的情況下釘選/修補技能）。工作區技能屬於用戶所有，並在名稱衝突時覆寫這兩者。

## 設定參考

有關完整的設定架構，請參閱 [Skills config](/zh-Hant/tools/skills-config)。

## 正在尋找更多技能？

瀏覽 [https://clawhub.ai](https://clawhub.ai)。

---

## 相關

- [Creating Skills](/zh-Hant/tools/creating-skills) — 建置自訂技能
- [Skills Config](/zh-Hant/tools/skills-config) — 技能設定參考
- [Slash Commands](/zh-Hant/tools/slash-commands) — 所有可用的斜線指令
- [Plugins](/zh-Hant/tools/plugin) — 外掛系統概覽
