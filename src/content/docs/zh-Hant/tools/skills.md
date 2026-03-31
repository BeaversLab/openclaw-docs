---
summary: "Skills：受控與工作區、閘控規則，以及配置/環境連線"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "技能"
---

# 技能

OpenClaw 使用與 **[AgentSkills](https://agentskills.io)** 相容的技能資料夾來教導代理如何使用工具。每個技能是一個包含 `SKILL.md` 的目錄，其中包含 YAML 前置資料與指令。OpenClaw 會載入**內建技能**以及可選的本機覆寫，並在載入時根據環境、設定和二進位檔案的存在進行篩選。

## 位置與優先順序

OpenClaw 從這些來源載入技能：

1. **額外的技能資料夾**：透過 `skills.load.extraDirs` 設定
2. **內建技能**：隨安裝版本（npm 套件或 OpenClaw.app）附帶
3. **受管理/本機技能**：`~/.openclaw/skills`
4. **個人代理技能**：`~/.agents/skills`
5. **專案代理技能**：`<workspace>/.agents/skills`
6. **工作區技能**：`<workspace>/skills`

如果技能名稱衝突，優先順序為：

`<workspace>/skills`（最高優先級）→ `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled skills → `skills.load.extraDirs`（最低優先級）

## Per-agent vs shared skills

在 **multi-agent** 設定中，每個 agent 都有自己的工作區。這意味著：

- **Per-agent skills** 僅存在於該 agent 的 `<workspace>/skills` 中。
- **Project agent skills** 存在於 `<workspace>/.agents/skills` 中，並在一般工作區 `skills/` 資料夾之前應用於該工作區。
- **Personal agent skills** 存在於 `~/.agents/skills` 中，並套用於該機器上的所有工作區。
- **Shared skills** 存在於 `~/.openclaw/skills`（managed/local）中，並對同一機器上的 **所有 agents** 可見。
- **共享資料夾**也可以透過 `skills.load.extraDirs` 新增（優先順位最低），如果您希望多個代理程式使用通用的技能套件。

如果相同的技能名稱存在於多個位置，則適用一般的優先順序：工作區優先，接著是專案代理程式技能，然後是個人代理程式技能，接著是受管理/本機，然後是隨附的，最後是額外的目錄。

## 外掛程式 + 技能

外掛程式可以透過在 `openclaw.plugin.json` 中列出 `skills` 目錄來附帶自己的技能（路徑相對於外掛程式根目錄）。當外掛程式啟用時，會載入外掛程式的技能。目前，這些目錄會被合併到與 `skills.load.extraDirs` 相同的低優先級路徑中，因此同名稱的內建、受管、代理程式或工作區技能會覆寫它們。
您可以透過外掛程式設定項目上的 `metadata.openclaw.requires.config` 來控管它們。請參閱 [Plugins](/en/tools/plugin) 以了解探索/設定，以及 [Tools](/en/tools) 以了解這些技能所教導的工具介面。

## ClawHub (安裝 + 同步)

ClawHub 是 OpenClaw 的公開技能註冊表。請在
[https://clawhub.com](https://clawhub.com) 瀏覽。使用原生的 `openclaw skills`
指令來探索/安裝/更新技能，或者當您需要發佈/同步工作流程時，使用獨立的 `clawhub` CLI。
完整指南：[ClawHub](/en/tools/clawhub)。

常見流程：

- 將技能安裝到您的工作區：
  - `openclaw skills install <skill-slug>`
- 更新所有已安裝的技能：
  - `openclaw skills update --all`
- 同步（掃描 + 發佈更新）：
  - `clawhub sync --all`

原生 `openclaw skills install` 會安裝到目前的工作區 `skills/` 目錄中。獨立的 `clawhub` CLI 也會安裝到您目前工作目錄下的 `./skills` 中（或是退回到已設定的 OpenClaw 工作區）。OpenClaw 會在下一次會話中將其識別為 `<workspace>/skills`。

## 安全注意事項

- 請將第三方技能視為**不受信任的程式碼**。在啟用前請先閱讀。
- 對於不受信任的輸入和具風險的工具，優先使用沙箱執行。請參閱 [沙箱隔離 (Sandboxing)](/en/gateway/sandboxing)。
- 工作區和額外目錄的技能探索僅接受解析後的真實路徑位於已設定根目錄內的技能根目錄和 `SKILL.md` 檔案。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 將機密注入到該 agent 週期的 **主機** 進程中（而非沙箱）。請勿將機密放入提示詞和日誌中。
- 如需更廣泛的威脅模型和檢查清單，請參閱 [Security](/en/gateway/security)。

## 格式（AgentSkills + 相容 Pi）

`SKILL.md` 必須至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

註記：

- 我們遵循 AgentSkills 規範的佈局/意圖。
- 嵌入式 agent 使用的解析器僅支援 **單行** frontmatter 鍵。
- `metadata` 應為 **單行 JSON 物件**。
- 在指令中使用 `{baseDir}` 來引用技能資料夾路徑。
- 選用 frontmatter 鍵：
  - `homepage` — 在 macOS Skills UI 中顯示為「Website」的 URL（亦可透過 `metadata.openclaw.homepage` 支援）。
  - `user-invocable` — `true|false` (預設: `true`)。當 `true` 時，該技能會以使用者斜線指令的形式公開。
  - `disable-model-invocation` — `true|false` (預設: `false`)。當 `true` 時，該技能會從模型提示詞中排除 (仍可透過使用者呼叫使用)。
  - `command-dispatch` — `tool` (選用)。當設定為 `tool` 時，斜線指令會略過模型並直接分派給工具。
  - `command-tool` — 當設定 `command-dispatch: tool` 時要叫用的工具名稱。
  - `command-arg-mode` — `raw` (預設)。針對工具分派，會將原始參數字串轉發給工具 (不進行核心解析)。

    該工具使用參數進行調用：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 閘控（載入時過濾）

OpenClaw 使用 `metadata`（單行 JSON）**在載入時過濾技能**：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的欄位：

- `always: true` — 始終包含該技能（跳過其他閘控條件）。
- `emoji` — macOS 技能 UI 使用的可選 emoji。
- `homepage` — 在 macOS 技能 UI 中顯示為「網站」的可選 URL。
- `os` — 可選的平台列表（`darwin`、`linux`、`win32`）。如果已設定，則該技能僅在那些作業系統上可用。
- `requires.bins` — 列表；每個項目都必須存在於 `PATH` 上。
- `requires.anyBins` — 列表；至少有一個必須存在於 `PATH` 上。
- `requires.env` — 列表；環境變數必須存在 **或** 在配置中提供。
- `requires.config` — 必須為真值的 `openclaw.json` 路徑列表。
- `primaryEnv` — 與 `skills.entries.<name>.apiKey` 關聯的環境變數名稱。
- `install` — macOS Skills UI 使用的安裝程式規格可選陣列 (brew/node/go/uv/download)。

關於沙盒的註記：

- `requires.bins` 是在技能載入時於 **主機** 上檢查的。
- 如果代理程式被沙箱化，二進位檔案也必須存在於容器**內部**。
  請透過 `agents.defaults.sandbox.docker.setupCommand`（或自訂映像檔）進行安裝。
  `setupCommand` 會在容器建立後執行一次。
  套件安裝還需要網路出口、可寫入的根檔案系統，以及沙箱中的 root 使用者。
  範例：`summarize` 技能（`skills/summarize/SKILL.md`）需要沙箱容器中的 `summarize` CLI
  才能在該處執行。

安裝程式範例：

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

備註：

- 如果列出了多個安裝程式，閘道會選擇**單一**首選項（如果可用則選擇 brew，否則選擇 node）。
- 如果所有安裝程式都是 `download`，OpenClaw 會列出每個項目，以便您查看可用的構件。
- 安裝程式規格可以包含 `os: ["darwin"|"linux"|"win32"]` 以依平台篩選選項。
- Node 安裝會遵守 `openclaw.json` 中的 `skills.install.nodeManager`（預設：npm；選項：npm/pnpm/yarn/bun）。
  這僅影響 **技能安裝**；Gateway 執行時仍應為 Node
  （不建議將 Bun 用於 WhatsApp/Telegram）。
- Go 安裝：如果缺少 `go` 且有 `brew` 可用，gateway 會先透過 Homebrew 安裝 Go，並在可能時將 `GOBIN` 設定為 Homebrew 的 `bin`。
- 下載安裝：`url`（必填）、`archive`（`tar.gz` | `tar.bz2` | `zip`）、`extract`（預設：偵測到壓縮檔時自動）、`stripComponents`、`targetDir`（預設 `~/.openclaw/tools/<skillKey>`）。

如果沒有 `metadata.openclaw`，該技能永遠符合資格（除非在設定中停用或被 `skills.allowBundled` 封鎖對於內建技能）。

## 設定覆寫（`~/.openclaw/openclaw.json`）

內建/受管理的技能可以被切換並提供環境變數值：

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

注意：如果技能名稱包含連字號，請用引號括住鍵名（JSON5 允許加上引號的鍵）。

如果您想在 OpenClaw 內部進行內建的圖像生成/編輯，請使用核心的 `image_generate` 工具搭配 `agents.defaults.imageGenerationModel`，而不是使用捆綁的技能。此處的技能範例適用於自訂或第三方工作流程。

對於原生圖像分析，請使用 `image` 工具搭配 `agents.defaults.imageModel`。
對於原生圖像生成/編輯，請使用 `image_generate` 搭配
`agents.defaults.imageGenerationModel`。如果您選擇 `openai/*`、`google/*`、
`fal/*` 或其他供應商特定的圖像模型，也請新增該供應商的 auth/API
金鑰。

設定金鑰預設符合 **技能名稱**。如果技能定義了
`metadata.openclaw.skillKey`，請在 `skills.entries` 下使用該金鑰。

規則：

- `enabled: false` 即使該技能是隨附的/已安裝的，也會將其停用。
- `env`：僅在程序中尚未設定該變數時才注入。
- `apiKey`：為宣告 `metadata.openclaw.primaryEnv` 的技能提供的便利項目。
  支援純文字字串或 SecretRef 物件 (`{ source, provider, id }`)。
- `config`：用於自訂各個技能欄位的可選容器；自訂金鑰必須置於此處。
- `allowBundled`：僅適用於**隨附**技能的可選允許清單。若已設定，則清單中
  的隨附技能才有資格受影響（受管理的/工作區技能不受影響）。

## 環境注入 (每次 agent 執行)

當 agent 執行開始時，OpenClaw 會執行以下操作：

1. 讀取技能中繼資料。
2. 將任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 套用至
   `process.env`。
3. 使用**符合資格**的技能建構系統提示。
4. 在執行結束後還原原始環境。

此設定**範圍僅限於代理程式執行期間**，而非全域 shell 環境。

## 會話快照 (效能)

OpenClaw 會在**會話開始時**對符合資格的技能進行快照，並在同一會話的後續輪次中重複使用該列表。對技能或設定所做的變更將在下一個新會話中生效。

當啟用技能監視器或出現新的符合資格的遠端節點時（見下文），技能也可以在會話中途重新整理。將其視為**熱重新載入**：更新的列表將在下一個代理程式輪次中被採用。

## 遠端 macOS 節點 (Linux 閘道)

如果閘道器正在 Linux 上運行，但連接了一個 **macOS 節點** 且**允許 `system.run`**（Exec approvals 安全性未設定為 `deny`），則當該節點上存在所需的二進位檔案時，OpenClaw 可以將僅限 macOS 的技能視為符合資格。代理程式應透過 `nodes` 工具（通常是 `nodes.run`）來執行這些技能。

這取決於節點回報其指令支援情況，以及透過 `system.run` 進行的 bin probe。如果 macOS 節點稍後離線，這些技能仍然可見；在節點重新連線之前，呼叫可能會失敗。

## 技能監看器（自動重新整理）

預設情況下，OpenClaw 會監看技能資料夾，並在 `SKILL.md` 檔案變更時更新技能快照。在 `skills.load` 下進行設定：

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

當技能符合資格時，OpenClaw 會將可用的技能清單以精簡 XML 格式注入系統提示詞（透過 `pi-coding-agent` 中的 `formatSkillsForPrompt`）。成本是確定的：

- **基本開銷（僅當 ≥1 個技能時）：** 195 個字元。
- **每個技能：** 97 個字元加上 XML 轉義後的 `<name>`、`<description>` 和 `<location>` 值的長度。

公式（字元）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

註記：

- XML 轉義會將 `& < > " '` 展開為實體（`&amp;`、`&lt;` 等），從而增加長度。
- Token 計數因模型分詞器而異。粗略的 OpenAI 風格估計約為每個 Token 4 個字元，因此每個技能 **97 個字元 ≈ 24 個 tokens**，再加上您實際的欄位長度。

## 受控技能生命週期

OpenClaw 在安裝（npm 套件或 OpenClaw.app）過程中，會隨附一組基準技能作為 **bundled skills**。`~/.openclaw/skills` 是用於本地覆寫（例如，在不修改隨附副本的情況下釘選/修補技能）。Workspace 技能由使用者擁有，並且會在名稱衝突時覆寫前述兩者。

## 設定參考

請參閱 [Skills config](/en/tools/skills-config) 以了解完整的設定架構。

## 正在尋找更多技能？

瀏覽 [https://clawhub.com](https://clawhub.com)。

---
