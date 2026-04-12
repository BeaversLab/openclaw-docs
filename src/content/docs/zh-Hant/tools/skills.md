---
summary: "Skills：託管與工作區、閘控規則以及配置/環境連線"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "Skills"
---

# 技能

OpenClaw 使用 **與 [AgentSkills](https://agentskills.io) 相容** 的技能資料夾來教導代理如何使用工具。每個技能是一個包含 YAML frontmatter 與指令的 `SKILL.md` 目錄。OpenClaw 會載入 **內建技能** 以及可選的本機覆寫值，並在載入時根據環境、設定和二進位檔的存在進行篩選。

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

外掛程式可以透過在 `openclaw.plugin.json` 中列出 `skills` 目錄（相對於外掛程式根目錄的路徑）來隨附自己的技能。當外掛程式啟用時，外掛程式技能就會載入。目前，這些目錄會被合併到與 `skills.load.extraDirs` 相同的低優先級路徑中，因此同名稱的內建、受管理、代理或工作區技能會覆寫它們。
您可以透過外掛程式設定項目上的 `metadata.openclaw.requires.config` 來對其進行閘道控制。請參閱 [Plugins](/en/tools/plugin) 以了解探索/設定，並參閱 [Tools](/en/tools) 以了解這些技能所教導的工具介面。

## ClawHub (安裝 + 同步)

ClawHub 是 OpenClaw 的公開技能註冊表。請前往
[https://clawhub.ai](https://clawhub.ai) 瀏覽。使用原生的 `openclaw skills`
指令來探索/安裝/更新技能，或是當您需要發佈/同步工作流程時使用獨立的 `clawhub` CLI。
完整指南：[ClawHub](/en/tools/clawhub)。

常見流程：

- 將技能安裝到您的工作區：
  - `openclaw skills install <skill-slug>`
- 更新所有已安裝的技能：
  - `openclaw skills update --all`
- 同步 (掃描 + 發佈更新)：
  - `clawhub sync --all`

原生 `openclaw skills install` 會安裝到現用工作區 `skills/` 目錄中。獨立的 `clawhub` CLI 也會安裝到您目前工作目錄下的 `./skills` 中（或者退回到已設定的 OpenClaw 工作區）。
OpenClaw 會在下一個工作階段將其視為 `<workspace>/skills` 載入。

## 安全性注意事項

- 將第三方技能視為 **不受信任的程式碼**。在啟用之前請閱讀它們。
- 對於不受信任的輸入和風險工具，請優先使用沙箱執行。請參閱 [Sandboxing](/en/gateway/sandboxing)。
- 工作區和額外目錄的技能探索只接受解析後的真實路徑位於已設定根目錄內的技能根目錄和 `SKILL.md` 檔案。
- 閘道支援的技能相依性安裝（`skills.install`、新手引導以及 Skills 設定 UI）會在執行安裝程式中繼資料之前執行內建的危险程式碼掃描器。`critical` 的發現結果預設會被封鎖，除非呼叫者明確設定危險覆寫；可疑的發現結果仍僅會發出警告。
- `openclaw skills install <slug>` 則不同：它會將 ClawHub 技能資料夾下載到工作區中，並不使用上述的安裝程式中繼資料路徑。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 會將秘密注入到該代理程式回合的 **主機** 進程中（而非沙箱）。請勿在提示和記錄中洩露秘密。
- 如需更廣泛的威脅模型與檢查清單，請參閱 [Security](/en/gateway/security)。

## 格式 (AgentSkills + Pi 相容)

`SKILL.md` 必須至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

註記：

- 我們遵循 AgentSkills 規格進行佈局/意圖設計。
- 內嵌代理程式使用的解析器僅支援 **單行** 前置資料鍵。
- `metadata` 應為 **單行 JSON 物件**。
- 在指令中使用 `{baseDir}` 來參照技能資料夾路徑。
- 選用前置資料鍵：
  - `homepage` — 在 macOS Skills UI 中顯示為「Website」的 URL（亦可透過 `metadata.openclaw.homepage` 支援）。
  - `user-invocable` — `true|false` (預設：`true`)。當 `true` 時，該技能會以使用者斜線指令的形式公開。
  - `disable-model-invocation` — `true|false` (預設：`false`)。當 `true` 時，該技能會從模型提示中排除（仍可透過使用者叫用使用）。
  - `command-dispatch` — `tool` (選用)。當設定為 `tool` 時，斜線指令會略過模型並直接分派至工具。
  - `command-tool` — 設定 `command-dispatch: tool` 時要叫用的工具名稱。
  - `command-arg-mode` — `raw` (預設)。針對工具調度，將原始參數字串轉發給工具（無核心解析）。

    該工具使用以下參數調用：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 閘控 (載入時過濾器)

OpenClaw **在載入時過濾技能**，使用 `metadata` (單行 JSON)：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的欄位：

- `always: true` — 始終包含該技能（跳過其他閘控）。
- `emoji` — macOS 技能 UI 使用的可選表情符號。
- `homepage` — 在 macOS 技能 UI 中顯示為「網站」的可選 URL。
- `os` — 平台的可選清單 (`darwin`, `linux`, `win32`)。如果設定，該技能僅在這些作業系統上可用。
- `requires.bins` — 清單；每個項目都必須存在於 `PATH` 上。
- `requires.anyBins` — 清單；至少一個必須存在於 `PATH` 上。
- `requires.env` — 清單；環境變數必須存在**或**在設定中提供。
- `requires.config` — 必須為 truthy 的 `openclaw.json` 路徑清單。
- `primaryEnv` — 與 `skills.entries.<name>.apiKey` 相關聯的環境變數名稱。
- `install` — macOS 技能 UI 使用的安裝程式規格可選陣列 (brew/node/go/uv/download)。

關於沙盒的說明：

- `requires.bins` 是在技能載入時於 **主機** 上檢查的。
- 如果代理程式被沙盒化，二進位檔案也必須存在**於容器內部**。
  請透過 `agents.defaults.sandbox.docker.setupCommand` (或自訂映像檔) 安裝它。
  `setupCommand` 會在容器建立後執行一次。
  套件安裝也需要網路出口、可寫入的根檔案系統，以及沙盒中的 root 使用者。
  範例：`summarize` 技能 (`skills/summarize/SKILL.md`) 需要沙盒容器中的 `summarize` CLI
  才能在那裡執行。

安裝程式範例：

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

備註：

- 如果列出了多個安裝程式，閘道會選擇**單一**首選選項 (可用時選擇 brew，否則選擇 node)。
- 如果所有安裝程式都是 `download`，OpenClaw 會列出每個條目，以便您查看可用的成品。
- 安裝程式規格可以包含 `os: ["darwin"|"linux"|"win32"]` 以按平台過濾選項。
- Node 安裝會遵守 `skills.install.nodeManager` 中的 `openclaw.json`（預設：npm；選項：npm/pnpm/yarn/bun）。
  這僅影響 **skill 安裝**；Gateway 執行階段仍應為 Node
  （不建議在 WhatsApp/Telegram 上使用 Bun）。
- Gateway 支援的安裝程式選擇是偏好驅動的，而不僅僅是限於 node：
  當安裝規格混合類型時，如果啟用了 `skills.install.preferBrew` 且 `brew` 存在，OpenClaw 會優先選擇 Homebrew，其次是 `uv`，然後是
  配置的 node 管理器，最後是其他備選方案，例如 `go` 或 `download`。
- 如果每個安裝規格都是 `download`，OpenClaw 會顯示所有下載選項
  而不是折疊為單一首選安裝程式。
- Go 安裝：如果缺少 `go` 且 `brew` 可用，gateway 會先透過 Homebrew 安裝 Go，並盡可能將 `GOBIN` 設定為 Homebrew 的 `bin`。
- 下載安裝：`url`（必需），`archive`（`tar.gz` | `tar.bz2` | `zip`），`extract`（偵測到封存時預設為自動），`stripComponents`，`targetDir`（預設：`~/.openclaw/tools/<skillKey>`）。

如果沒有 `metadata.openclaw`，該技能始終符合資格（除非
在配置中停用或對於內建技能被 `skills.allowBundled` 阻擋）。

## 配置覆寫（`~/.openclaw/openclaw.json`）

內建/受管理的技能可以切換並提供環境變數值：

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

注意：如果技能名稱包含連字號，請用引號括住金鑰（JSON5 允許帶引號的金鑰）。

如果您想要在 OpenClaw 內部進行原生的影像生成/編輯，請使用核心
`image_generate` 工具搭配 `agents.defaults.imageGenerationModel`，而不是使用
內建技能。此處的技能範例適用於自訂或第三方工作流程。

若要進行原生影像分析，請使用 `image` 工具搭配 `agents.defaults.imageModel`。
若要進行原生影像生成/編輯，請使用 `image_generate` 搭配
`agents.defaults.imageGenerationModel`。如果您選擇 `openai/*`、`google/*`、
`fal/*` 或其他供應商特定的影像模型，請一併新增該供應商的驗證/API
金鑰。

設定金鑰預設符合 **技能名稱**。如果技能定義了
`metadata.openclaw.skillKey`，請在 `skills.entries` 下使用該金鑰。

規則：

- `enabled: false` 會停用技能，即使它是內建的/已安裝的。
- `env`：僅在變數尚未於程序中設置時注入。
- `apiKey`：為宣告 `metadata.openclaw.primaryEnv` 的技能提供的便利設定。
  支援純文字字串或 SecretRef 物件 (`{ source, provider, id }`)。
- `config`：用於自訂各技能欄位的可選容器；自訂金鑰必須置於此處。
- `allowBundled`：僅針對 **內建** 技能的可選允許清單。若已設定，僅清單中
  的內建技能符合資格 (受管理/工作區技能不受影響)。

## 環境注入 (每次代理執行)

當代理執行開始時，OpenClaw 會：

1. 讀取技能元資料。
2. 將任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 套用至
   `process.env`。
3. 使用 **符合資格** 的技能建構系統提示詞。
4. 執行結束後恢復原始環境。

此設定 **僅限於代理執行範圍**，而非全域 shell 環境。

對於內建的 `claude-cli` 後端，OpenClaw 也會將相同的合格快照具現化為暫時的 Claude Code 外掛程式，並使用 `--plugin-dir` 傳遞它。Claude Code 然後可以使用其原生的技能解析器，而 OpenClaw 仍擁有優先順序、每個代理的允許清單、閘道控制以及 `skills.entries.*` 環境/API 金鑰插入。其他 CLI 後端僅使用提示詞目錄。

## 工作階段快照（效能）

OpenClaw 會在 **工作階段開始時** 對合格的技能進行快照，並在同一工作階段的後續輪次中重複使用該清單。對技能或設定的變更會在下一個新工作階段生效。

當啟用技能監視器或出現新的符合條件的遠端節點時，技能也可以在會話中途重新整理（見下文）。將其視為一種**熱重新載入**：重新整理後的清單將在下一個代理輪次中被選取。

如果該會話的有效代理技能允許清單發生變化，OpenClaw 會重新整理快照，以確保可見的技能與當前代理保持一致。

## 遠端 macOS 節點（Linux 閘道器）

如果閘道器在 Linux 上執行，但連接了 **macOS 節點** 且**允許 `system.run`**（未將 Exec approvals 安全性設定為 `deny`），當該節點上存在所需的二進位檔案時，OpenClaw 可以將僅限 macOS 的技能視為符合資格。代理應透過 `exec` 工具並帶有 `host=node` 來執行這些技能。

這取決於節點報告的指令支援情況以及透過 `system.run` 進行的二進位檔案探測。如果 macOS 節點稍後離線，這些技能仍然可見；在節點重新連線之前，調用可能會失敗。

## 技能監視器（自動重新整理）

預設情況下，OpenClaw 會監視技能資料夾，並在 `SKILL.md` 檔案變更時更新技能快照。您可以在 `skills.load` 下進行設定：

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

## Token 影響（技能清單）

當技能符合資格時，OpenClaw 會將可用技能的精簡 XML 清單注入到系統提示詞中（透過 `formatSkillsForPrompt` 中的 `pi-coding-agent`）。成本是確定的：

- **基本開銷（僅當 ≥1 個技能時）：** 195 個字元。
- **每個技能：** 97 個字元 + XML 轉義後的 `<name>`、`<description>` 和 `<location>` 值的長度。

公式（字元）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

備註：

- XML 轉義會將 `& < > " '` 展開為實體（`&amp;`、`&lt;` 等），從而增加長度。
- Token 計數因模型分詞器而異。粗略的 OpenAI 風格估計約為 4 個字元/token，因此 **97 個字元 ≈ 每個技能 24 個 tokens**，再加上您實際的欄位長度。

## 受管理技能的生命週期

OpenClaw 在安裝（npm 套件或 OpenClaw.app）中提供了一組基準的技能作為**隨附技能**。`~/.openclaw/skills` 用於本機覆寫（例如，在不修改隨附副本的情況下釘選/修補技能）。工作區技能由使用者擁有，且在名稱衝突時會覆寫上述兩者。

## 設定參考

請參閱 [技能設定](/en/tools/skills-config) 以了解完整的設定架構。

## 尋找更多技能？

瀏覽 [https://clawhub.ai](https://clawhub.ai)。

---

## 相關

- [建立技能](/en/tools/creating-skills) — 建構自訂技能
- [技能設定](/en/tools/skills-config) — 技能設定參考
- [斜線指令](/en/tools/slash-commands) — 所有可用的斜線指令
- [外掛程式](/en/tools/plugin) — 外掛程式系統概覽
