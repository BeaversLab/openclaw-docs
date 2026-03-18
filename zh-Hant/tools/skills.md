---
summary: "Skills：託管版與工作區、篩選規則以及配置/環境連結"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "Skills"
---

# Skills (OpenClaw)

OpenClaw 使用與 **[AgentSkills](https://agentskills.io)-compatible** 相容的技能資料夾來教導代理如何使用工具。每個技能都是一個目錄，包含帶有 YAML 前置資料和說明的 `SKILL.md`。OpenClaw 會載入**內建技能**加上可選的本地覆寫，並在載入時根據環境、配置和二進位檔的存在進行篩選。

## 位置與優先順序

技能從**三個**地方載入：

1. **內建技能**：隨安裝包附帶（npm 套件或 OpenClaw.app）
2. **託管/本地技能**：`~/.openclaw/skills`
3. **工作區技能**：`<workspace>/skills`

如果技能名稱衝突，優先順序為：

`<workspace>/skills` (最高) → `~/.openclaw/skills` → 內建技能 (最低)

此外，您可以透過
`~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 來設定額外的技能資料夾（最低優先順序）。

## 每個代理與共享技能

在**多代理**設定中，每個代理都有自己的工作區。這意味著：

- **每個代理的技能**僅存在於該代理的 `<workspace>/skills` 中。
- **共享技能**存在於 `~/.openclaw/skills` (託管/本地) 中，且對同一台機器上的**所有代理**可見。
- 如果您希望多個代理使用共同的技能包，也可以透過 `skills.load.extraDirs` 新增共享資料夾 (最低
  優先順序)。

如果同一個技能名稱存在於多個位置，則適用一般的優先順序：工作區優先，然後是託管/本地，最後是內建。

## 外掛程式 + 技能

外掛程式可以在
`openclaw.plugin.json` 中列出 `skills` 目錄（相對於外掛程式根目錄的路徑）來隨附自己的技能。當外掛程式啟用時會載入外掛程式技能，並參與一般的技能優先順序規則。
您可以透過外掛程式配置項目上的 `metadata.openclaw.requires.config` 來篩選它們。請參閱 [外掛程式](/zh-Hant/tools/plugin) 以了解探索/配置，以及 [工具](/zh-Hant/tools) 以了解這些技能所教授的工具表面。

## ClawHub (安裝 + 同步)

ClawHub 是 OpenClaw 的公開技能註冊表。請在以下位置瀏覽：
[https://clawhub.com](https://clawhub.com)。使用它來探索、安裝、更新和備份技能。
完整指南：[ClawHub](/zh-Hant/tools/clawhub)。

常見流程：

- 將技能安裝到您的工作區：
  - `clawhub install <skill-slug>`
- 更新所有已安裝的技能：
  - `clawhub update --all`
- 同步 (掃描 + 發布更新)：
  - `clawhub sync --all`

預設情況下，`clawhub` 會安裝到目前工作目錄下的 `./skills` 中
(或者退而求其次使用已設定的 OpenClaw 工作區)。OpenClaw 會在下次
會話中將其作為 `<workspace>/skills` 載入。

## 安全性注意事項

- 將第三方技能視為**不受信任的程式碼**。在啟用前請仔細閱讀。
- 對於不受信任的輸入和風險工具，優先使用沙箱執行。請參閱[沙箱機制](/zh-Hant/gateway/sandboxing)。
- 工作區和額外目錄 (extra-dir) 的技能探索僅接受解析後的真實路徑 (resolved realpath) 保持在已設定根目錄內的技能根目錄和 `SKILL.md` 檔案。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 會將秘密注入該代理程式回合的 **主機**
  程序中 (而非沙箱)。請勿將秘密資訊留在提示詞和日誌中。
- 如需更廣泛的威脅模型和檢查清單，請參閱[安全性](/zh-Hant/gateway/security)。

## 格式 (AgentSkills + Pi 相容)

`SKILL.md` 必須至少包含：

```markdown
---
name: nano-banana-pro
description: Generate or edit images via Gemini 3 Pro Image
---
```

備註：

- 我們遵循 AgentSkills 規範來處理版面配置與意圖。
- 內嵌代理程式使用的解析器僅支援 **單行** frontmatter 鍵。
- `metadata` 應為 **單行 JSON 物件**。
- 在指令中使用 `{baseDir}` 來參照技能資料夾路徑。
- 選用的 frontmatter 鍵：
  - `homepage` — 在 macOS 技能 UI 中顯示為「Website」的 URL (亦可透過 `metadata.openclaw.homepage` 支援)。
  - `user-invocable` — `true|false` (預設值：`true`)。當為 `true` 時，該技能會以用戶斜線指令的形式公開。
  - `disable-model-invocation` — `true|false` (預設: `false`)。當 `true` 時，該技能會從模型提示詞中排除 (但仍可透過使用者呼叫使用)。
  - `command-dispatch` — `tool` (選用)。當設定為 `tool` 時，斜線指令會繞過模型並直接分派給工具。
  - `command-tool` — 當設定 `command-dispatch: tool` 時要呼叫的工具名稱。
  - `command-arg-mode` — `raw` (預設)。針對工具分派，會將原始參數字串轉發給工具 (無核心解析)。

    工具會使用以下參數進行呼叫:
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 篩選 (載入時過濾器)

OpenClaw 使用 `metadata` (單行 JSON) **在載入時篩選技能**：

```markdown
---
name: nano-banana-pro
description: Generate or edit images via Gemini 3 Pro Image
metadata:
  {
    "openclaw":
      {
        "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] },
        "primaryEnv": "GEMINI_API_KEY",
      },
  }
---
```

`metadata.openclaw` 下的欄位：

- `always: true` — 始終包含該技能 (略過其他閘門)。
- `emoji` — macOS 技能 UI 使用的選用表情符號。
- `homepage` — macOS 技能 UI 中顯示為「Website」的選用 URL。
- `os` — 平台的選用清單 (`darwin`、`linux`、`win32`)。如果設定，該技能僅在這些 OS 上可用。
- `requires.bins` — 清單；每個項目都必須存在於 `PATH` 上。
- `requires.anyBins` — 清單；至少有一個必須存在於 `PATH` 上。
- `requires.env` — 清單；環境變數必須存在 **或** 在設定中提供。
- `requires.config` — 必須為真實值的 `openclaw.json` 路徑清單。
- `primaryEnv` — 與 `skills.entries.<name>.apiKey` 相關聯的環境變數名稱。
- `install` — macOS 技能 UI 使用的安裝程式規格選用陣列 (brew/node/go/uv/download)。

關於沙盒的說明：

- `requires.bins` 會在技能載入時於 **主機** 上進行檢查。
- 如果代理被沙盒化，二進制檔案也必須存在於**容器內部**。
  透過 `agents.defaults.sandbox.docker.setupCommand` 安裝（或使用自訂映像檔）。
  `setupCommand` 在容器建立後執行一次。
  套件安裝還需要網路出口、可寫入的根檔案系統，以及沙盒中的 root 使用者。
  範例：`summarize` 技能（`skills/summarize/SKILL.md`）需要在沙盒容器中
  有 `summarize` CLI 才能在那裡執行。

安裝程式範例：

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata:
  {
    "openclaw":
      {
        "emoji": "♊️",
        "requires": { "bins": ["gemini"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "gemini-cli",
              "bins": ["gemini"],
              "label": "Install Gemini CLI (brew)",
            },
          ],
      },
  }
---
```

備註：

- 如果列出了多個安裝程式，閘道會選擇**單一**的首選項（優先使用 brew，否則使用 node）。
- 如果所有安裝程式都是 `download`，OpenClaw 會列出每個條目，以便您查看可用的構件。
- 安裝程式規格可以包含 `os: ["darwin"|"linux"|"win32"]` 以依平台篩選選項。
- Node 安裝會遵守 `openclaw.json` 中的 `skills.install.nodeManager`（預設：npm；選項：npm/pnpm/yarn/bun）。
  這只會影響**技能安裝**；閘道執行時仍應為 Node
  （不建議在 WhatsApp/Telegram 上使用 Bun）。
- Go 安裝：如果缺少 `go` 且有 `brew` 可用，閘道會先透過 Homebrew 安裝 Go，並在可能的情況下將 `GOBIN` 設定為 Homebrew 的 `bin`。
- 下載安裝：`url`（必要），`archive`（`tar.gz` | `tar.bz2` | `zip`），`extract`（預設：偵測到封存檔時為 auto），`stripComponents`，`targetDir`（預設：`~/.openclaw/tools/<skillKey>`）。

如果不存在 `metadata.openclaw`，該技能始終符合資格（除非
在設定中停用或對於內建技能被 `skills.allowBundled` 阻擋）。

## 設定覆寫（`~/.openclaw/openclaw.json`）

內建/管理的技能可以切換並提供 env 值：

```json5
{
  skills: {
    entries: {
      "nano-banana-pro": {
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

注意：如果技能名稱包含連字號，請用引號括住鍵值（JSON5 允許用引號括住的鍵值）。

設定鍵預設與 **技能名稱** 相符。如果技能定義了
`metadata.openclaw.skillKey`，請在 `skills.entries` 下使用該鍵。

規則：

- `enabled: false` 會停用技能，即使它是內建的/已安裝的。
- `env`：僅在變數尚未在程序中設定時**才會**注入。
- `apiKey`：為宣告了 `metadata.openclaw.primaryEnv` 的技能提供便利。
  支援純文字字串或 SecretRef 物件 (`{ source, provider, id }`)。
- `config`：用於自訂每個技能欄位的可選容器；自訂鍵必須放在此處。
- `allowBundled`：僅適用於 **內建** 技能的可選允許列表。如果設定，僅列表中的內建技能符合資格 (受管理的/工作區技能不受影響)。

## 環境注入 (每次代理執行)

當代理執行開始時，OpenClaw 會：

1. 讀取技能元資料。
2. 將任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 套用至
   `process.env`。
3. 使用 **符合資格的** 技能建構系統提示詞。
4. 在執行結束後還原原始環境。

這是 **限於代理執行範圍內** 的，而非全域的 Shell 環境。

## 會話快照 (效能)

OpenClaw 會在 **會話開始時** 對符合資格的技能進行快照，並在同一會話的後續輪次中重用該列表。對技能或設定的變更會在下一個新會話中生效。

當啟用技能監看器或出現新的符合資格的遠端節點時，技能也可以在會話中途重新整理 (見下文)。將此視為 **熱重載**：更新後的列表將在下一個代理輪次中被採用。

## 遠端 macOS 節點 (Linux 閘道)

如果閘道在 Linux 上執行，但連接了 **macOS 節點** 且 **允許 `system.run`** (Exec approvals 安全性未設定為 `deny`)，當該節點上存在所需的二進位檔案時，OpenClaw 可以將僅限 macOS 的技能視為符合資格。代理應透過 `nodes` 工具 (通常是 `nodes.run`) 執行這些技能。

這依賴於節點報告其命令支援以及透過 `system.run` 進行的 bin 探測。如果 macOS 節點稍後離線，技能仍然可見；在節點重新連線之前，調用可能會失敗。

## 技能監視器（自動重新整理）

預設情況下，OpenClaw 會監視技能資料夾，並在 `SKILL.md` 檔案變更時更新技能快照。您可以在 `skills.load` 下配置此功能：

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

當技能符合資格時，OpenClaw 會將可用技能的精簡 XML 列表注入系統提示（透過 `pi-coding-agent` 中的 `formatSkillsForPrompt`）。成本是確定的：

- **基本開銷（僅當 ≥1 個技能時）：** 195 個字元。
- **每個技能：** 97 個字元 + XML 轉義後的 `<name>`、`<description>` 和 `<location>` 值的長度。

公式（字元）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

備註：

- XML 轉義會將 `& < > " '` 擴充為實體（例如 `&amp;`、`&lt;` 等），從而增加長度。
- Token 數量因模型的分詞器而異。粗略的 OpenAI 風格估計約為每 token 4 個字元，因此每個技能 **97 個字元 ≈ 24 個 token**，加上您的實際欄位長度。

## 受管理技能的生命週期

OpenClaw 作為安裝（npm 套件或 OpenClaw.app）的一部分，提供了一組基準技能作為 **隨附技能**。`~/.openclaw/skills` 用於本地覆寫（例如，固定/修補技能而不更改隨附副本）。工作區技能由用戶擁有，並在名稱衝突時覆寫兩者。

## 配置參考

請參閱 [Skills config](/zh-Hant/tools/skills-config) 以取得完整的配置架構。

## 正在尋找更多技能？

瀏覽 [https://clawhub.com](https://clawhub.com)。

---

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
