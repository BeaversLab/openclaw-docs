---
summary: "Skills：受控與工作區、閘控規則，以及配置/環境連線"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "技能"
---

# 技能

OpenClaw 使用與 **[AgentSkills](https://agentskills.io) 相容** 的技能資料夾來教導代理如何使用工具。每個技能都是一個包含 `SKILL.md` 的目錄，其中包含 YAML 前置資料和指令。OpenClaw 會載入**捆綁的技能**以及可選的本機覆蓋，並在載入時根據環境、設定和二進位檔案的存在進行篩選。

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

外掛程式可以透過在 `openclaw.plugin.json` 中列出 `skills` 目錄（相對於外掛程式根目錄的路徑）來隨附自己的技能。當啟用外掛程式時，會載入外掛程式技能。目前這些目錄會被合併到與 `skills.load.extraDirs` 相同的低優先級路徑中，因此同名稱的捆綁、受管理、代理或工作區技能會覆蓋它們。
您可以透過外掛程式設定項目中的 `metadata.openclaw.requires.config` 對其進行閘道控制。請參閱 [Plugins](/en/tools/plugin) 以了解探索/設定，以及 [Tools](/en/tools) 以了解這些技能所教授的工具介面。

## ClawHub (安裝 + 同步)

ClawHub 是 OpenClaw 的公開技能註冊表。請在
[https://clawhub.com](https://clawhub.com) 瀏覽。使用原生的 `openclaw skills`
指令來探索/安裝/更新技能，或者當您需要發佈/同步工作流程時使用獨立的 `clawhub` CLI。
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
- 對於不受信任的輸入和有風險的工具，請優先使用沙箱執行。請參閱 [Sandboxing](/en/gateway/sandboxing)。
- 工作區和額外目錄的技能探索僅接受解析後的真實路徑位於已設定根目錄內的技能根目錄和 `SKILL.md` 檔案。
- Gateway 支援的技能相依性安裝（`skills.install`、上架指引以及技能設定 UI）會在執行安裝程式中繼資料之前執行內建的危險程式碼掃描器。除非呼叫者明確設定危險覆蓋，否則 `critical` 的發現結果預設會被封鎖；可疑的發現結果仍然只會發出警告。
- `openclaw skills install <slug>` 則不同：它會將 ClawHub 技能資料夾下載到工作區中，並不使用上述的安裝程式中繼資料路徑。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 會將秘密注入到該代理輪次的 **主機** 程序中（而非沙箱）。請勿讓秘密出現在提示詞和日誌中。
- 若要了解更廣泛的威脅模型和檢查清單，請參閱 [Security](/en/gateway/security)。

## 格式 (AgentSkills + Pi 相容)

`SKILL.md` 必須至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

備註：

- 我們遵循 AgentSkills 規範的佈局與意圖。
- 內嵌代理程式使用的解析器僅支援 **單行** frontmatter 鍵。
- `metadata` 應為 **單行 JSON 物件**。
- 在指令中使用 `{baseDir}` 來引用技能資料夾路徑。
- 選用 frontmatter 鍵：
  - `homepage` — 在 macOS Skills UI 中顯示為「網站」的 URL（亦可透過 `metadata.openclaw.homepage` 支援）。
  - `user-invocable` — `true|false`（預設值：`true`）。當為 `true` 時，該技能會以使用者斜線指令形式公開。
  - `disable-model-invocation` — `true|false`（預設值：`false`）。當為 `true` 時，該技能會從模型提示詞中排除（仍可透過使用者叫用使用）。
  - `command-dispatch` — `tool`（選用）。當設定為 `tool` 時，斜線指令會略過模型並直接分派給工具。
  - `command-tool` — 當設定 `command-dispatch: tool` 時要叫用的工具名稱。
  - `command-arg-mode` — `raw`（預設值）。針對工具分派，會將原始參數字串轉發給工具（不進行核心解析）。

    工具會以以下參數叫用：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 過濾 (載入時過濾器)

OpenClaw **在載入時過濾技能**，使用 `metadata`（單行 JSON）：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的欄位：

- `always: true` — 始終包含該技能（略過其他閘門）。
- `emoji` — macOS Skills UI 使用的選用表情符號。
- `homepage` — macOS Skills UI 中顯示為「網站」的選用 URL。
- `os` — 選用的平台列表（`darwin`、`linux`、`win32`）。如果設定，該技能僅在這些作業系統上可用。
- `requires.bins` — 列表；每一項都必須存在於 `PATH` 上。
- `requires.anyBins` — 列表；至少有一項必須存在於 `PATH` 上。
- `requires.env` — 列表；環境變數必須存在**或**在設定中提供。
- `requires.config` — 必須為真值的 `openclaw.json` 路徑列表。
- `primaryEnv` — 與 `skills.entries.<name>.apiKey` 相關的環境變數名稱。
- `install` — 由 macOS Skills UI 使用的可選安裝程式規格陣列（brew/node/go/uv/download）。

關於沙盒的註記：

- `requires.bins` 會在技能載入時於 **主機** 上進行檢查。
- 如果代理程式被沙盒化，二進位檔也必須存在於**容器內**。
  透過 `agents.defaults.sandbox.docker.setupCommand` 安裝它（或使用自訂映像檔）。
  `setupCommand` 會在容器建立後執行一次。
  套件安裝還需要網路出口、可寫入的根檔案系統，以及沙盒中的 root 使用者。
  範例：`summarize` 技能（`skills/summarize/SKILL.md`）需要沙盒容器中的 `summarize` CLI
  才能在其中執行。

安裝程式範例：

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

註記：

- 如果列出了多個安裝程式，閘道會選擇**單一**首選項（優先使用 brew，否則使用 node）。
- 如果所有安裝程式都是 `download`，OpenClaw 會列出每個條目，以便您查看可用的構件。
- 安裝程式規格可以包含 `os: ["darwin"|"linux"|"win32"]` 以根據平台篩選選項。
- Node 安裝會遵守 `openclaw.json` 中的 `skills.install.nodeManager`（預設值：npm；選項：npm/pnpm/yarn/bun）。
  這只會影響 **skill installs**；Gateway 執行時應仍為 Node
  （不建議在 WhatsApp/Telegram 上使用 Bun）。
- Go 安裝：如果缺少 `go` 且有 `brew` 可用，閘道會先透過 Homebrew 安裝 Go，並在可能時將 `GOBIN` 設定為 Homebrew 的 `bin`。
- 下載安裝：`url` （必需）、`archive` （`tar.gz` | `tar.bz2` | `zip`）、`extract` （預設：偵測到歸檔時自動）、`stripComponents`、`targetDir` （預設 `~/.openclaw/tools/<skillKey>`）。

如果沒有 `metadata.openclaw`，該技能始終符合條件（除非在設定中停用或被 `skills.allowBundled` 阻止對於內建技能）。

## 設定覆寫 (`~/.openclaw/openclaw.json`)

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

注意：如果技能名稱包含連字號，請用引號括住鍵值（JSON5 允許帶引號的鍵）。

如果您希望在 OpenClaw 內進行標準的圖像生成/編輯，請使用核心的 `image_generate` 工具搭配 `agents.defaults.imageGenerationModel`，而不是使用內建技能。此處的技能範例適用於自訂或第三方工作流程。

對於原生圖像分析，請使用 `image` 工具搭配 `agents.defaults.imageModel`。
對於原生圖像生成/編輯，請使用 `image_generate` 搭配
`agents.defaults.imageGenerationModel`。如果您選擇 `openai/*`、`google/*`、
`fal/*` 或其他供應商特定的圖像模型，也請新增該供應商的 auth/API
金鑰。

設定鍵預設符合 **技能名稱**。如果技能定義了
`metadata.openclaw.skillKey`，請在 `skills.entries` 下使用該鍵。

規則：

- `enabled: false` 會停用該技能，即使它已內建/安裝。
- `env`：僅在程序中尚未設定該變數時才注入。
- `apiKey`：為宣告了 `metadata.openclaw.primaryEnv` 的技能提供的便利設定。
  支援純文字字串或 SecretRef 物件（`{ source, provider, id }`）。
- `config`：用於自訂每個技能欄位的可選容器；自訂鍵必須放在此處。
- `allowBundled`：僅針對 **內建（bundled）** 技能的可選允許列表。如果設置，則列表中只有內建技能符合資格（受管理/工作區技能不受影響）。

## 環境注入（每次代理運行）

當代理運行開始時，OpenClaw：

1. 讀取技能元數據。
2. 將任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 應用於
   `process.env`。
3. 使用 **符合資格** 的技能構建系統提示。
4. 運行結束後恢復原始環境。

這是 **作用於代理運行範圍內**，而非全局 shell 環境。

## 會話快照（效能）

OpenClaw 會在 **會話開始時** 對符合資格的技能進行快照，並在同一會話的後續輪次中重用該列表。對技能或配置的更改將在下一個新會話中生效。

當啟用技能監視器或出現新的符合資格的遠端節點時（見下文），技能也可以在會話中途刷新。將此視為 **熱重載**：刷新後的列表將在下一個代理輪次中被採用。

## 遠端 macOS 節點（Linux 閘道）

如果閘道在 Linux 上運行，但連接了一個 **macOS 節點** 並且 **允許 `system.run`**（Exec approvals 安全性未設置為 `deny`），則當該節點上存在所需的二進制文件時，OpenClaw 可以將僅限 macOS 的技能視為符合資格。代理應透過 `exec` 工具並使用 `host=node` 來執行這些技能。

這依賴於節點報告其命令支援以及透過 `system.run` 進行的二進制探測。如果 macOS 節點稍後離線，技能仍然可見；在節點重新連接之前，調用可能會失敗。

## 技能監視器（自動刷新）

默認情況下，OpenClaw 會監視技能資料夾，並在 `SKILL.md` 文件更改時更新技能快照。在 `skills.load` 下配置此項：

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

當技能符合資格時，OpenClaw 會將可用技能的簡潔 XML 列表注入到系統提示中（透過 `pi-coding-agent` 中的 `formatSkillsForPrompt`）。成本是確定的：

- **基本開銷（僅當 ≥1 個技能時）：** 195 個字元。
- **每項技能：** 97 個字元加上 XML 轉義後的 `<name>`、`<description>` 和 `<location>` 值的長度。

公式（字元）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

備註：

- XML 轉義會將 `& < > " '` 展開為實體（例如 `&amp;`、`&lt;` 等），從而增加長度。
- Token 計數取決於模型的分詞器。粗略的 OpenAI 風格估算是約 4 個字元/token，因此除了您實際的欄位長度外，**97 個字元 ≈ 24 個 token**。

## 受管技能的生命週期

OpenClaw 隨安裝（npm 套件或 OpenClaw.app）附帶了一組基準技能作為 **bundled skills**（內建技能）。`~/.openclaw/skills` 存在於本機覆寫（例如，固定/修補技能而不更改內建副本）。工作區技能屬於用戶所有，在名稱衝突時會覆蓋前述兩者。

## 設定參考

請參閱 [Skills config](/en/tools/skills-config) 以了解完整的設定架構。

## 正在尋找更多技能？

瀏覽 [https://clawhub.com](https://clawhub.com)。

---

## 相關

- [Creating Skills](/en/tools/creating-skills) — 建立自訂技能
- [Skills Config](/en/tools/skills-config) — 技能設定參考
- [Slash Commands](/en/tools/slash-commands) — 所有可用的斜線指令
- [Plugins](/en/tools/plugin) — 外掛系統概覽
