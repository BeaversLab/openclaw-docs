---
summary: "Skills：受控與工作區、閘控規則，以及配置/環境連線"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "技能"
---

# 技能

OpenClaw 使用與 **[AgentSkills](https://agentskills.io)** 相容的技能資料夾來教導代理如何使用工具。每個技能都是一個包含帶有 YAML frontmatter 和指令的 `SKILL.md` 的目錄。OpenClaw 會載入**內建技能**加上可選的本機覆寫，並在載入時根據環境、設定和二進位檔案的存在進行篩選。

## 位置與優先順序

技能會從 **三個** 地方載入：

1. **內建技能**：隨安裝（npm 套件或 OpenClaw.app）附帶
2. **受控/本機技能**：`~/.openclaw/skills`
3. **工作區技能**：`<workspace>/skills`

如果技能名稱發生衝突，優先順序為：

`<workspace>/skills` (最高) → `~/.openclaw/skills` → 內建技能 (最低)

此外，您可以透過 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 來設定額外的技能資料夾 (優先順序最低)。

## 每個代理與共享技能

在 **多代理** 設定中，每個代理都有自己的工作區。這意味著：

- **每個代理的技能** 僅存在於該代理的 `<workspace>/skills` 中。
- **共享技能** 存在於 `~/.openclaw/skills` (受控/本機) 中，且對同一台機器上的 **所有代理** 可見。
- 如果您想要多個代理使用的通用技能包，也可以透過 `skills.load.extraDirs` (優先順序最低) 新增**共享資料夾**。

如果相同的技能名稱存在於多個地方，則適用一般的優先順序規則：工作區優先，然後是受控/本機，最後是內建。

## 外掛程式 + 技能

外掛程式可以透過在 `openclaw.plugin.json` (相對於外掛程式根目錄的路徑) 中列出 `skills` 目錄來提供其自己的技能。當外掛程式啟用時，外掛程式技能就會載入，並參與正常的技能優先順序規則。您可以透過外掛程式設定項目上的 `metadata.openclaw.requires.config` 來對其進行閘控。請參閱 [外掛程式](/en/tools/plugin) 以了解探索/設定，並參閱 [工具](/en/tools) 以了解這些技能所教授的工具介面。

## ClawHub (安裝 + 同步)

ClawHub 是 OpenClaw 的公開技能註冊表。請在
[https://clawhub.com](https://clawhub.com) 瀏覽。使用原生的 `openclaw skills`
指令來探索/安裝/更新技能，或者當您需要發布/同步工作流程時，使用獨立的 `clawhub` CLI。
完整指南：[ClawHub](/en/tools/clawhub)。

常見流程：

- 將技能安裝到您的工作區：
  - `openclaw skills install <skill-slug>`
- 更新所有已安裝的技能：
  - `openclaw skills update --all`
- 同步 (掃描 + 發布更新)：
  - `clawhub sync --all`

原生的 `openclaw skills install` 會安裝到現用工作區的 `skills/`
目錄中。獨立的 `clawhub` CLI 也會安裝到您目前工作目錄下的 `./skills`
(或者回退到設定的 OpenClaw 工作區)。
OpenClaw 在下一個工作階段會將其視為 `<workspace>/skills`。

## 安全性注意事項

- 將第三方技能視為 **不受信任的程式碼**。在啟用前請仔細閱讀。
- 對於不受信任的輸入和有風險的工具，優先使用沙箱執行。請參閱 [Sandboxing](/en/gateway/sandboxing)。
- 工作區和額外目錄 (extra-dir) 技能探索僅接受解析後的真實路徑保留在設定根目錄內的技能根目錄和 `SKILL.md` 檔案。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 會將秘密注入到該代理回合的 **主機**
  程序中 (而非沙箱)。請勿在提示和日誌中洩露秘密。
- 如需更廣泛的威脅模型和檢查清單，請參閱 [Security](/en/gateway/security)。

## 格式 (AgentSkills + Pi 相容)

`SKILL.md` 必須至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

註記：

- 我們遵循 AgentSkills 規範來處理佈局/意圖。
- 嵌入式代理使用的解析器僅支援 **單行** 前置資料鍵。
- `metadata` 應為 **單行 JSON 物件**。
- 在指令中使用 `{baseDir}` 來參照技能資料夾路徑。
- 選用的前置資料鍵：
  - `homepage` — 在 macOS Skills UI 中顯示為「Website」的 URL (也可透過 `metadata.openclaw.homepage` 支援)。
  - `user-invocable` — `true|false` (預設值：`true`)。當為 `true` 時，該技能會以用戶斜線指令的方式公開。
  - `disable-model-invocation` — `true|false` (預設值：`false`)。當為 `true` 時，該技能會從模型提示詞中排除（但仍可透過用戶調用使用）。
  - `command-dispatch` — `tool` (選用)。當設定為 `tool` 時，斜線指令會略過模型並直接分發給工具。
  - `command-tool` — 當設定 `command-dispatch: tool` 時要呼叫的工具名稱。
  - `command-arg-mode` — `raw` (預設值)。對於工具分發，會將原始參數字串轉發給工具（無核心解析）。

    工具會使用以下參數進行呼叫：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 閘控 (載入時篩選)

OpenClaw 使用 `metadata` (單行 JSON) **在載入時篩選技能**：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的欄位：

- `always: true` — 始終包含該技能 (略過其他閘控條件)。
- `emoji` — macOS 技能 UI 使用的選用表情符號。
- `homepage` — 在 macOS 技能 UI 中顯示為「網站」 的選用 URL。
- `os` — 平台的選用清單 (`darwin`、`linux`、`win32`)。如果設定，該技能僅適用於這些作業系統。
- `requires.bins` — 清單；每個都必須存在於 `PATH` 上。
- `requires.anyBins` — 清單；至少一個必須存在於 `PATH` 上。
- `requires.env` — 清單；環境變數必須存在 **或** 在設定中提供。
- `requires.config` — 必須為真值的 `openclaw.json` 路徑清單。
- `primaryEnv` — 與 `skills.entries.<name>.apiKey` 相關聯的環境變數名稱。
- `install` — macOS 技能 UI 使用的安裝程式規格選用陣列 (brew/node/go/uv/download)。

關於沙盒的說明：

- `requires.bins` 會在技能載入時於 **主機** 上進行檢查。
- 如果代理程式位於沙箱中，二進位檔案也必須存在於 **容器內部**。
  請透過 `agents.defaults.sandbox.docker.setupCommand` 安裝（或使用自訂映像檔）。
  `setupCommand` 會在容器建立後執行一次。
  套件安裝也需要網路出口、可寫入的根檔案系統，以及沙箱中的 root 使用者。
  範例：`summarize` 技能 (`skills/summarize/SKILL.md`) 需要沙箱容器中的 `summarize` CLI
  才能在其中執行。

安裝程式範例：

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

備註：

- 如果列出了多個安裝程式，閘道會選擇 **單一** 的首選項（可用時優先選擇 brew，否則為 node）。
- 如果所有安裝程式皆為 `download`，OpenClaw 會列出每個項目，以便您查看可用的構件。
- 安裝程式規格可以包含 `os: ["darwin"|"linux"|"win32"]` 以依平台篩選選項。
- Node 安裝會遵守 `openclaw.json` 中的 `skills.install.nodeManager` (預設：npm；選項：npm/pnpm/yarn/bun)。
  這僅會影響 **技能安裝**；閘道執行時期仍應為 Node
  (不建議將 Bun 用於 WhatsApp/Telegram)。
- Go 安裝：如果缺少 `go` 且有 `brew` 可用，閘道會先透過 Homebrew 安裝 Go，並在可能時將 `GOBIN` 設定為 Homebrew 的 `bin`。
- 下載安裝：`url` (必要)，`archive` (`tar.gz` | `tar.bz2` | `zip`)，`extract` (預設：偵測到封存時為自動)，`stripComponents`，`targetDir` (預設：`~/.openclaw/tools/<skillKey>`)。

如果不存在 `metadata.openclaw`，該技能始終符合資格 (除非
在設定中停用或對於內建技能被 `skills.allowBundled` 封鎖)。

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

注意：如果技能名稱包含連字號，請將鍵加上引號 (JSON5 允許加上引號的鍵)。

如果您希望在 OpenClaw 內部進行標準的圖像生成/編輯，請使用核心的
`image_generate` 工具搭配 `agents.defaults.imageGenerationModel`，而不要使用
捆綁的技能。此處的技能範例適用於自訂或第三方工作流程。

對於原生圖像分析，請使用 `image` 工具搭配 `agents.defaults.imageModel`。
對於原生圖像生成/編輯，請使用 `image_generate` 搭配
`agents.defaults.imageGenerationModel`。如果您選擇 `openai/*`、`google/*`、
`fal/*` 或其他供應商特定的圖像模型，請同時新增該供應商的 auth/API
金鑰。

預設情況下，Config 鍵會與 **技能名稱** 匹配。如果技能定義了
`metadata.openclaw.skillKey`，請在 `skills.entries` 下使用該鍵。

規則：

- `enabled: false` 會停用該技能，即使它是捆綁/已安裝的。
- `env`：**僅當** 變數尚未在程序中設定時才會注入。
- `apiKey`：這是一種便捷方式，適用於宣告了 `metadata.openclaw.primaryEnv` 的技能。
  支援純文字字串或 SecretRef 物件 (`{ source, provider, id }`)。
- `config`：用於存放自訂每個技能欄位的可選容器；自訂鍵必須位於此處。
- `allowBundled`：僅適用於 **捆綁** 技能的可選允許列表。如果設定，則清單中
  的捆綁技能才符合資格（受管理/工作區技能不受影響）。

## 環境注入 (每次 agent 執行)

當 agent 執行開始時，OpenClaw 會：

1. 讀取技能元資料。
2. 將任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 套用至
   `process.env`。
3. 使用 **符合資格** 的技能建構系統提示。
4. 在執行結束後還原原始環境。

這是 **限定於 agent 執行** 的範圍，而非全域 shell 環境。

## 會話快照 (效能)

OpenClaw 會在 **會話開始時** 對符合資格的技能進行快照，並在該會話的後續輪次中重複使用該列表。對技能或設定的變更將在下一個新會話中生效。

當啟用技能監視器或是出現新的符合條件的遠端節點時，技能也可以在會話中途重新整理（見下文）。您可以將此視為 **熱重新載入**：重新整理後的列表將在下一輪代理回合中被採用。

## 遠端 macOS 節點（Linux 閘道）

如果閘道在 Linux 上運行，但連接了 **macOS 節點** 並 **允許 `system.run`**（Exec approvals 安全性未設為 `deny`），當該節點上存在所需的二進位檔案時，OpenClaw 可以將僅限 macOS 的技能視為符合條件。代理應透過 `nodes` 工具（通常是 `nodes.run`）來執行這些技能。

這取決於節點回報其指令支援情況，以及透過 `system.run` 進行的二進位檔案探測。如果 macOS 節點稍後離線，技能仍然保持可見；在節點重新連線之前，調用可能會失敗。

## 技能監視器（自動重新整理）

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

當技能符合條件時，OpenClaw 會將可用技能的精簡 XML 列表注入系統提示詞（透過 `pi-coding-agent` 中的 `formatSkillsForPrompt`）。成本是確定的：

- **基本額外開銷（僅當 ≥1 個技能時）：** 195 個字元。
- **每個技能：** 97 個字元 + XML 轉義後的 `<name>`、`<description>` 和 `<location>` 值的長度。

公式（字元）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

備註：

- XML 轉義會將 `& < > " '` 擴展為實體（`&amp;`、`&lt;` 等），從而增加長度。
- Token 計數因模型分詞器而異。粗略的 OpenAI 風格估計約為每個 token 4 個字元，因此每個技能 **97 個字元 ≈ 24 個 token**，加上您實際的欄位長度。

## 受管技能的生命週期

OpenClaw 作為安裝的一部分（npm 套件或 OpenClaw.app），提供了一組基準技能作為 **內建技能**。`~/.openclaw/skills` 用於本地覆寫（例如，固定/修補技能而不變更內建副本）。工作區技能為使用者所有，並會在名稱衝突時覆寫上述兩者。

## 設定參考

完整的設定結構請參閱 [Skills config](/en/tools/skills-config)。

## 尋找更多技能？

瀏覽 [https://clawhub.com](https://clawhub.com)。

---
