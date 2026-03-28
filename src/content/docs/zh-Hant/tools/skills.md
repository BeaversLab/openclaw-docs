---
summary: "技能：託管與工作區、閘控規則，以及設定/環境連線"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "技能"
---

# 技能 (OpenClaw)

OpenClaw 使用與 **[AgentSkills](https://agentskills.io)** 相容的技能資料夾來教導代理程式如何使用工具。每個技能是一個包含 `SKILL.md` 的目錄，其中包含 YAML frontmatter 和指令。OpenClaw 載入**內建技能** 以及可選的本機覆寫，並在載入時根據環境、設定和二進位檔的存在進行篩選。

## 位置與優先順序

技能從 **三個** 地方載入：

1. **內建技能**：隨安裝套件附帶 (npm 套件或 OpenClaw.app)
2. **託管/本機技能**：`~/.openclaw/skills`
3. **工作區技能**：`<workspace>/skills`

如果技能名稱發生衝突，優先順序為：

`<workspace>/skills` (最高) → `~/.openclaw/skills` → 內建技能 (最低)

此外，您可以透過 `skills.load.extraDirs` 中的 `~/.openclaw/openclaw.json` 設定額外的技能資料夾 (最低優先順序)。

## 個別代理程式與共享技能

在 **多代理程式** 設定中，每個代理程式都有自己的工作區。這意味著：

- **個別代理程式技能** 僅存在於該代理程式的 `<workspace>/skills` 中。
- **共享技能** 存在於 `~/.openclaw/skills` (託管/本機) 中，並對同一台機器上的 **所有代理程式** 可見。
- 如果您希望多個代理程式使用通用的技能包，也可以透過 `skills.load.extraDirs` (最低優先順序) 新增共享資料夾。

如果相同的技能名稱存在於多個位置，則適用一般的優先順序：工作區優先，其次是託管/本機，最後是內建。

## 外掛程式 + 技能

外掛程式可以透過在 `openclaw.plugin.json` 中列出 `skills` 目錄 (相對於外掛程式根目錄的路徑) 來隨附自己的技能。當外掛程式啟用時，外掛程式技能會載入並參與正常的技能優先順序規則。您可以透過外掛程式設定項目中的 `metadata.openclaw.requires.config` 來對其進行閘控。請參閱 [外掛程式](/zh-Hant/tools/plugin) 以了解探索/設定，並參閱 [工具](/zh-Hant/tools) 以了解這些技能所教導的工具介面。

## ClawHub (安裝 + 同步)

ClawHub 是 OpenClaw 的公開技能註冊中心。您可以在
[https://clawhub.com](https://clawhub.com) 瀏覽。使用它來發現、安裝、更新和備份技能。
完整指南：[ClawHub](/zh-Hant/tools/clawhub)。

常見流程：

- 將技能安裝到您的工作區：
  - `clawhub install <skill-slug>`
- 更新所有已安裝的技能：
  - `clawhub update --all`
- 同步 (掃描 + 發布更新)：
  - `clawhub sync --all`

預設情況下，`clawhub` 會安裝到您目前工作目錄下的 `./skills` 中
(或者回退到已設定的 OpenClaw 工作區)。OpenClaw 會在下一個工作階段將其
作為 `<workspace>/skills` 載入。

## 安全性說明

- 將第三方技能視為 **不受信任的程式碼**。在啟用之前請先閱讀它們。
- 對於不受信任的輸入和風險工具，請優先使用沙盒執行。請參閱 [沙盒機制](/zh-Hant/gateway/sandboxing)。
- 工作區和額外目錄 的技能發現僅接受其解析的真實路徑 保持在設定根目錄內的技能根目錄和 `SKILL.md` 檔案。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 會將祕密注入到該代理輪次的 **主機** 程序中
  (而非沙盒)。請勿將祕密洩漏在提示和日誌中。
- 如需更廣泛的威脅模型和檢查清單，請參閱 [安全性](/zh-Hant/gateway/security)。

## 格式 (AgentSkills + Pi 相容)

`SKILL.md` 必須至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

備註：

- 我們遵循 AgentSkills 規範來處理佈局/意圖。
- 內嵌代理使用的解析器僅支援 **單行** 前置資料 鍵。
- `metadata` 應該是 **單行 JSON 物件**。
- 在指令中使用 `{baseDir}` 來引用技能資料夾路徑。
- 選用的前置資料鍵：
  - `homepage` — 在 macOS Skills UI 中顯示為「網站」的 URL (也可透過 `metadata.openclaw.homepage` 支援)。
  - `user-invocable` — `true|false` (預設值：`true`)。當設定為 `true` 時，該技能會作為使用者斜線指令公開。
  - `disable-model-invocation` — `true|false` (預設值: `false`)。當 `true` 時，該技能會從模型提示詞中排除（但仍可透過使用者調用使用）。
  - `command-dispatch` — `tool` (選用)。當設定為 `tool` 時，斜線指令會繞過模型並直接分發至工具。
  - `command-tool` — 當設定 `command-dispatch: tool` 時要叫用的工具名稱。
  - `command-arg-mode` — `raw` (預設值)。對於工具分發，會將原始參數字串轉發給工具 (不進行核心解析)。

    工具將使用以下參數叫用：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 閘控 (載入時過濾器)

OpenClaw 在載入時使用 `metadata` (單行 JSON) **過濾技能**：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的欄位：

- `always: true` — 始終包含該技能 (略過其他閘控)。
- `emoji` — macOS 技能 UI 使用的選用表情符號。
- `homepage` — macOS 技能 UI 中顯示為「Website」的選用 URL。
- `os` — 平台選用清單 (`darwin`, `linux`, `win32`)。如果設定，該技能僅在這些作業系統上符合資格。
- `requires.bins` — 清單；每個都必須存在於 `PATH` 上。
- `requires.anyBins` — 清單；至少有一個必須存在於 `PATH` 上。
- `requires.env` — 清單；環境變數必須存在 **或** 在設定中提供。
- `requires.config` — 必須為 truthy 的 `openclaw.json` 路徑清單。
- `primaryEnv` — 與 `skills.entries.<name>.apiKey` 相關聯的環境變數名稱。
- `install` — macOS 技能 UI 使用的安裝程式規格選用陣列 (brew/node/go/uv/download)。

關於沙盒的說明：

- `requires.bins` 會在技能載入時於 **主機** 上進行檢查。
- 如果代理位於沙箱中，二進制檔案也必須存在於**容器內部**。
  透過 `agents.defaults.sandbox.docker.setupCommand` 安裝（或使用自訂映像檔）。
  `setupCommand` 在容器建立後執行一次。
  套件安裝還需要網路出口、可寫入的根檔案系統以及沙箱中的 root 使用者。
  範例：`summarize` 技能（`skills/summarize/SKILL.md`）需要在沙箱容器中
  有 `summarize` CLI 才能在那裡執行。

安裝程式範例：

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

備註：

- 如果列出了多個安裝程式，閘道會選擇**單一**首選項目（如果有 brew 則優先使用，否則使用 node）。
- 如果所有安裝程式都是 `download`，OpenClaw 會列出每個項目，以便您查看可用的構件。
- 安裝程式規格可以包含 `os: ["darwin"|"linux"|"win32"]` 以依平台篩選選項。
- Node 安裝會遵守 `openclaw.json` 中的 `skills.install.nodeManager`（預設：npm；選項：npm/pnpm/yarn/bun）。
  這僅影響**技能安裝**；閘道執行時應仍為 Node
  （不建議將 Bun 用於 WhatsApp/Telegram）。
- Go 安裝：如果缺少 `go` 且 `brew` 可用，閘道會先透過 Homebrew 安裝 Go，並在可能的情況下將 `GOBIN` 設定為 Homebrew 的 `bin`。
- 下載安裝：`url`（必要），`archive`（`tar.gz` | `tar.bz2` | `zip`），`extract`（偵測到壓縮檔時預設為 auto），`stripComponents`，`targetDir`（預設：`~/.openclaw/tools/<skillKey>`）。

如果沒有 `metadata.openclaw`，該技能始終符合資格（除非
在設定中停用或對於捆綁技能被 `skills.allowBundled` 阻擋）。

## 設定覆寫（`~/.openclaw/openclaw.json`）

可以切換捆綁/受管理的技能並提供環境變數值：

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

注意：如果技能名稱包含連字號，請用引號括住金鑰（JSON5 允許使用引號括住的金鑰）。

如果您希望在 OpenClaw 內部進行內建圖像生成/編輯，請使用核心 `image_generate` 工具搭配 `agents.defaults.imageGenerationModel`，而不是使用內建技能。此處的技能範例適用於自訂或協力廠商工作流程。

根據預設，Config 鍵會符合 **技能名稱**。如果技能定義了 `metadata.openclaw.skillKey`，請在 `skills.entries` 下使用該鍵。

規則：

- `enabled: false` 會停用技能，即使該技能已內建/安裝。
- `env`：僅在程序中尚未設定該變數時才注入。
- `apiKey`：針對宣告了 `metadata.openclaw.primaryEnv` 之技能的便利設定。
  支援純文字字串或 SecretRef 物件 (`{ source, provider, id }`)。
- `config`：用於自訂各技能欄位的選用性容器；自訂鍵必須置於此處。
- `allowBundled`：僅適用於 **內建** 技能的選用性允許清單。若設定，僅清單中的內建技能符合資格 (受管理/工作區技能不受影響)。

## 環境注入 (每次代理執行)

當代理執行開始時，OpenClaw 會：

1. 讀取技能中繼資料。
2. 將任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 套用至
   `process.env`。
3. 使用 **符合資格** 的技能建構系統提示詞。
4. 執行結束後恢復原始環境。

這是 **限定於代理執行** 的範圍，而非全域 shell 環境。

## 會話快照 (效能)

OpenClaw 會在 **會話開始時** 對符合資格的技能進行快照，並在該會話的後續輪次中重複使用該清單。技能或設定的變更會在下一個新會話生效。

當啟用技能監看器或出現新的符合資格的遠端節點時，技能也可以在會話中途重新整理 (請參見下文)。您可以將此視為 **熱重新載入**：重新整理後的清單會在下一個代理輪次中被採用。

## 遠端 macOS 節點 (Linux 閘道)

如果閘道器在 Linux 上執行，但連接了一個 **macOS 節點** 且 **允許使用 `system.run`**（Exec approvals 安全性未設定為 `deny`），則當該節點上存在必要的二進位檔時，OpenClaw 可以將僅限 macOS 的技能視為可用。Agent 應透過 `nodes` 工具（通常是 `nodes.run`）來執行這些技能。

這取決於節點報告其指令支援情況，以及透過 `system.run` 進行的二進位檔探測。如果 macOS 節點稍後離線，技能仍然可見；在節點重新連線之前，呼叫可能會失敗。

## 技能監視器（自動重新整理）

根據預設，OpenClaw 會監視技能資料夾，並在 `SKILL.md` 檔案變更時更新技能快照。您可以在 `skills.load` 下設定此功能：

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

- **基本開銷（僅在 ≥1 個技能時）：** 195 個字元。
- **每個技能：** 97 個字元 + XML 跳脫後的 `<name>`、`<description>` 和 `<location>` 值的長度。

公式（字元）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

備註：

- XML 跳脫會將 `& < > " '` 展開為實體（`&amp;`、`&lt;` 等），從而增加長度。
- Token 計數因模型分詞器而異。粗略的 OpenAI 風格估計約為 4 字元/token，因此除了您實際的欄位長度外，**97 個字元 ≈ 每個技能 24 個 token**。

## 受管技能生命週期

OpenClaw 隨安裝（npm 套件或 OpenClaw.app）附帶一組作為 **bundled skills** 的基準技能集。`~/.openclaw/skills` 用於本機覆寫（例如，固定/修補技能而不變更內建的副本）。工作區技能由使用者擁有，並在名稱衝突時覆寫兩者。

## 設定參考

請參閱 [Skills config](/zh-Hant/tools/skills-config) 以取得完整的設定結構描述。

## 尋找更多技能？

瀏覽 [https://clawhub.com](https://clawhub.com)。

---
