---
summary: "Skills: managed vs workspace, gating rules, and config/env wiring"
read_when:
  - 新增或修改技能
  - 變更技能閘控或載入規則
title: "Skills"
---

# 技能 (OpenClaw)

OpenClaw 使用與 **[AgentSkills](https://agentskills.io) 相容** 的技能資料夾來教導代理如何使用工具。每個技能是一個包含 YAML frontmatter 和指令的 `SKILL.md` 目錄。OpenClaw 會載入 **內建技能** 加上選用的本機覆寫，並根據環境、設定和二進位檔的存在在載入時進行篩選。

## 位置與優先順序

技能會從 **三** 個地方載入：

1. **內建技能**：隨安裝包附送（npm 套件或 OpenClaw.app）
2. **管理/本機技能**：`~/.openclaw/skills`
3. **工作區技能**：`<workspace>/skills`

如果技能名稱衝突，優先順序為：

`<workspace>/skills`（最高）→ `~/.openclaw/skills` → 內建技能（最低）

此外，您可以透過 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 來設定額外的技能資料夾（優先順序最低）。

## 個別代理與共享技能

在 **多代理** 設定中，每個代理都有自己的工作區。這意味著：

- **個別代理技能** 僅存放在該代理的 `<workspace>/skills` 中。
- **共享技能** 存放在 `~/.openclaw/skills`（管理/本機）中，並對同一台機器上的 **所有代理** 可見。
- 如果您希望多個代理使用通用的技能包，也可以透過 `skills.load.extraDirs`（優先順序最低）新增共享資料夾。

如果相同的技能名稱存在於多個地方，適用一般的優先順序：工作區優先，然後是管理/本機，最後是內建。

## 外掛 + 技能

外掛可以透過在 `openclaw.plugin.json`（相對於外掛根目錄的路徑）中列出 `skills` 目錄來附帶自己的技能。外掛技能會在外掛啟用時載入，並參與正常的技能優先順序規則。您可以透過外掛設定項目上的 `metadata.openclaw.requires.config` 來閘控它們。請參閱 [Plugins](/zh-Hant/tools/plugin) 以了解探索/設定，以及 [Tools](/zh-Hant/tools) 以了解這些技能所教導的工具介面。

## ClawHub (安裝 + 同步)

ClawHub 是 OpenClaw 的公開技能註冊表。請前往 [https://clawhub.com](https://clawhub.com) 瀏覽。您可以使用它來探索、安裝、更新及備份技能。
完整指南：[ClawHub](/zh-Hant/tools/clawhub)。

常見流程：

- 將技能安裝到您的工作區：
  - `clawhub install <skill-slug>`
- 更新所有已安裝的技能：
  - `clawhub update --all`
- 同步 (掃描 + 發布更新)：
  - `clawhub sync --all`

預設情況下，`clawhub` 會安裝到您目前工作目錄下的 `./skills` 中 (或者回退到已設定的 OpenClaw 工作區)。OpenClaw 會在下一次工作階段中將其視為 `<workspace>/skills`。

## 安全性注意事項

- 請將第三方技能視為 **不受信任的程式碼**。在啟用前請仔細閱讀。
- 對於不受信任的輸入和有風險的工具，建議優先使用沙箱執行。請參閱 [沙箱機制 (Sandboxing)](/zh-Hant/gateway/sandboxing)。
- 工作區和額外目錄 的技能探索僅接受解析後的真實路徑 位於設定根目錄內的技能根目錄和 `SKILL.md` 檔案。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 會將機密注入到該代理回合的 **主機** 程序中 (而非沙箱)。請勿將機密放在提示詞和日誌中。
- 如需更廣泛的威脅模型和檢查清單，請參閱 [安全性](/zh-Hant/gateway/security)。

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
- 嵌入式代理使用的解析器僅支援 **單行** 前置元資料 鍵值。
- `metadata` 應為 **單行 JSON 物件**。
- 請在指令中使用 `{baseDir}` 來參照技能資料夾路徑。
- 選用前置元資料鍵：
  - `homepage` — 在 macOS 技能 UI 中顯示為「網站」的 URL (也可以透過 `metadata.openclaw.homepage` 支援)。
  - `user-invocable` — `true|false` (預設值：`true`)。當為 `true` 時，該技能會以使用者斜線指令的形式公開。
  - `disable-model-invocation` — `true|false` (預設：`false`)。當 `true` 時，該技能會從模型提示詞中排除（仍可透過使用者呼叫使用）。
  - `command-dispatch` — `tool` (選用)。當設定為 `tool` 時，斜線指令會略過模型並直接分派至工具。
  - `command-tool` — 當設定 `command-dispatch: tool` 時要呼叫的工具名稱。
  - `command-arg-mode` — `raw` (預設)。對於工具分派，會將原始參數字串轉發給工具（無核心解析）。

    使用以下參數叫用工具：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 過濾機制 (載入時篩選器)

OpenClaw 使用 `metadata` (單行 JSON) **在載入時過濾技能**：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
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
- `emoji` — macOS 技能 UI 使用的選用 emoji。
- `homepage` — 在 macOS 技能 UI 中顯示為「Website」的選用 URL。
- `os` — 平台選用列表 (`darwin`、`linux`、`win32`)。如果設定，該技能僅符合這些作業系統。
- `requires.bins` — 列表；每個項目都必須存在於 `PATH` 上。
- `requires.anyBins` — 列表；至少必須有一個存在於 `PATH` 上。
- `requires.env` — 列表；環境變數必須存在 **或** 在設定中提供。
- `requires.config` — 必須為 truthy 的 `openclaw.json` 路徑列表。
- `primaryEnv` — 與 `skills.entries.<name>.apiKey` 相關聯的環境變數名稱。
- `install` — macOS 技能 UI 使用的安裝程式規格選用陣列 (brew/node/go/uv/download)。

關於沙盒的說明：

- `requires.bins` 會在技能載入時於 **主機** 上進行檢查。
- 如果代理程式（agent）被沙盒化，二進位檔案也必須存在於**容器內部**。
  請透過 `agents.defaults.sandbox.docker.setupCommand` 安裝（或是使用自訂映像檔）。
  `setupCommand` 會在容器建立後執行一次。
  套件安裝還需要網路出站（egress）存取、可寫入的根檔案系統，以及沙盒中的 root 使用者。
  範例：`summarize` 技能（`skills/summarize/SKILL.md`）需要 `summarize` CLI
  位於沙盒容器中才能在此執行。

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

註記：

- 如果列出了多個安裝程式，閘道會挑選**單一**的首選選項（可用時優先選擇 brew，否則選 node）。
- 如果所有安裝程式都是 `download`，OpenClaw 會列出每個項目，讓您可以看到可用的構件。
- 安裝程式規格可以包含 `os: ["darwin"|"linux"|"win32"]` 以依平台篩選選項。
- Node 安裝會遵守 `openclaw.json` 中的 `skills.install.nodeManager`（預設：npm；選項：npm/pnpm/yarn/bun）。
  這僅影響**技能安裝**；Gateway 執行時仍應為 Node
  （不建議對 WhatsApp/Telegram 使用 Bun）。
- Go 安裝：如果缺少 `go` 且有 `brew` 可用，閘道會先透過 Homebrew 安裝 Go，並在可行時將 `GOBIN` 設為 Homebrew 的 `bin`。
- 下載安裝：`url`（必要），`archive`（`tar.gz` | `tar.bz2` | `zip`），`extract`（預設：偵測到壓縮檔時為 auto），`stripComponents`，`targetDir`（預設：`~/.openclaw/tools/<skillKey>`）。

如果沒有 `metadata.openclaw`，該技能永遠符合資格（除非在設定中停用，或對於內建技能被 `skills.allowBundled` 阻擋）。

## 設定覆寫（`~/.openclaw/openclaw.json`）

內建/受控技能可以被切換並提供環境變數值：

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

注意：如果技能名稱包含連字號，請將鍵加上引號（JSON5 允許加上引號的鍵）。

如果您想要在 OpenClaw 內部使用內建的圖像生成/編輯功能，請使用核心的 `image_generate` 工具搭配 `agents.defaults.imageGenerationModel`，而不是使用捆綁的技能。此處的技能範例適用於自訂或第三方工作流程。

預設情況下，配置鍵對應 **skill name**。如果技能定義了 `metadata.openclaw.skillKey`，請在 `skills.entries` 下使用該鍵。

規則：

- `enabled: false` 會停用該技能，即使它已被捆綁/安裝。
- `env`：僅在程序中尚未設定該變數時才注入。
- `apiKey`：方便宣告了 `metadata.openclaw.primaryEnv` 的技能。
  支援純文字字串或 SecretRef 物件 (`{ source, provider, id }`)。
- `config`：用於自訂每個技能欄位的可選容器；自訂鍵必須位於此處。
- `allowBundled`：僅適用於 **bundled** 技能的可選允許清單。如果設定，則清單中僅列出的捆綁技能符合資格 (受管理/工作區技能不受影響)。

## 環境注入 (每次 agent 執行)

當 agent 執行開始時，OpenClaw：

1. 讀取技能中繼資料。
2. 將任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 套用至
   `process.env`。
3. 使用 **eligible** (符合資格) 的技能建構系統提示詞。
4. 在執行結束後恢復原始環境。

這的範圍 **僅限於 agent 執行**，而非全域 shell 環境。

## Session 快照 (效能)

OpenClaw 會在 **session 啟動時** 對符合資格的技能進行快照，並在同一 session 的後續輪次中重複使用該清單。對技能或配置的變更將在下一個新 session 中生效。

當啟用技能監看器或出現新的符合資格的遠端節點時 (見下文)，技能也可以在 session 期間重新整理。您可以將此視為 **熱重新載入**：更新後的清單將在下一個 agent 輪次中被採用。

## 遠端 macOS 節點 (Linux gateway)

如果 Gateway 在 Linux 上運行，但連接了一個 **macOS 節點**並且**允許 `system.run`**（Exec approvals 安全性未設為 `deny`），當該節點上存在所需的二進制檔案時，OpenClaw 可以將僅限 macOS 的技能視為可用。Agent 應透過 `nodes` 工具（通常是 `nodes.run`）執行這些技能。

這取決於節點報告其指令支援情況以及透過 `system.run` 進行的二進制探測。如果 macOS 節點稍後離線，技能仍然可見；在節點重新連接之前，呼叫可能會失敗。

## Skills watcher (自動重新整理)

預設情況下，OpenClaw 會監視技能資料夾，並在 `SKILL.md` 檔案變更時更新技能快照。請在 `skills.load` 下設定此功能：

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

## Token 影響 (技能清單)

當技能可用時，OpenClaw 會將可用技能的精簡 XML 清單注入系統提示詞（透過 `pi-coding-agent` 中的 `formatSkillsForPrompt`）。成本是確定的：

- **基本開銷（僅當 ≥1 個技能時）：** 195 個字元。
- **每個技能：** 97 個字元 + XML 轉義後的 `<name>`、`<description>` 和 `<location>` 值的長度。

公式（字元）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

備註：

- XML 轉義會將 `& < > " '` 擴展為實體（`&amp;`、`&lt;` 等），從而增加長度。
- Token 數量隨模型分詞器而異。粗略的 OpenAI 風格估計約為每 token 4 個字元，因此每個技能 **97 個字元 ≈ 24 個 token**，再加上您的實際欄位長度。

## 託管技能生命週期

OpenClaw 作為安裝（npm 套件或 OpenClaw.app）的一部分，提供了一套基準的 **bundled skills**（捆綁技能）。`~/.openclaw/skills` 用於本機覆寫（例如，在不修改捆綁副本的情況下釘選/修補技能）。Workspace 技能由用戶擁有，並在名稱衝突時覆寫上述兩者。

## 設定參考

請參閱 [Skills config](/zh-Hant/tools/skills-config) 以了解完整的設定架構。

## 尋找更多技能？

瀏覽 [https://clawhub.com](https://clawhub.com)。

---

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
