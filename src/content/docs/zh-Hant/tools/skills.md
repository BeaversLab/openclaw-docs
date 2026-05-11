---
summary: "技能：受管 vs 工作區、閘道規則、代理允許清單，以及設定連線"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "Skills"
sidebarTitle: "技能"
---

OpenClaw 使用與 **[AgentSkills](https://agentskills.io)** 相容的技能資料夾來教導代理如何使用工具。每個技能都是一個包含 `SKILL.md` 的目錄，其中包含 YAML frontmatter 和指令。OpenClaw 會載入打包的技能以及可選的本機覆寫，並在載入時根據環境、設定和二進位檔的存在進行篩選。

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

## Per-agent vs shared skills

在 **多代理** 設定中，每個代理都有自己的工作區：

| 範圍                 | 路徑                                   | 可見於             |
| -------------------- | -------------------------------------- | ------------------ |
| Per-agent            | `<workspace>/skills`                   | 僅該代理           |
| Project-agent        | `<workspace>/.agents/skills`           | 僅該工作區的代理   |
| Personal-agent       | `~/.agents/skills`                     | 該機器上的所有代理 |
| Shared managed/local | `~/.openclaw/skills`                   | 該機器上的所有代理 |
| Shared extra dirs    | `skills.load.extraDirs` (最低優先順序) | 該機器上的所有代理 |

多處同名稱 → 來源優先順序較高的獲勝。工作區勝於 project-agent，勝於 personal-agent，勝於 managed/local，勝於 bundled，勝於 extra dirs。

## Agent skill allowlists

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
  <Accordion title="Allowlist rules">- 預設情況下，省略 `agents.defaults.skills` 以允許無限制的技能。 - 省略 `agents.list[].skills` 以繼承 `agents.defaults.skills`。 - 設定 `agents.list[].skills: []` 以不使用任何技能。 - 非空的 `agents.list[].skills` 列表是該代理程式的「最終」設定 — 它不會與預設值合併。 - 有效的允許清單適用於提示詞建置、技能斜線指令探索、沙箱同步以及技能快照。</Accordion>
</AccordionGroup>

## 外掛程式與技能

外掛程式可以透過在 `openclaw.plugin.json` 中列出 `skills` 目錄（相對於外掛程式根目錄的路徑）來提供其專屬的技能。當外掛程式啟用時，外掛程式技能會隨之載入。這是放置工具特定操作指南的適當位置；這些指南若放在工具描述中過於冗長，但應在安裝外掛程式時隨時可用 — 例如，瀏覽器外掛程式提供了一個 `browser-automation` 技能用於多步驟瀏覽器控制。

外掛程式技能目錄會被合併到與 `skills.load.extraDirs` 相同的低優先級路徑中，因此同名稱的內建、受管理、代理程式或工作區技能會覆寫它們。您可以透過外掛程式設定項目中的 `metadata.openclaw.requires.config` 來限制它們。

請參閱 [外掛程式](/zh-Hant/tools/plugin) 以了解探索/設定，並參閱 [工具](/zh-Hant/tools) 以了解這些技能所教導的工具介面。

## 技能工作坊

選用且實驗性的「技能工作坊」外掛程式可以根據代理程式工作期間觀察到的可重複程序來建立或更新工作區技能。它預設為停用，必須透過 `plugins.entries.skill-workshop` 明確啟用。

技能工作坊僅寫入 `<workspace>/skills`，會掃描生成的內容，支援待審核或自動安全寫入，隔離不安全的提案，並在成功寫入後重新整理技能快照，因此新技能無需重新啟動 Gateway 即可使用。

將其用於諸如 _"下次，請驗證 GIF 歸屬"_ 之類的更正，或是諸如媒體 QA 檢查清單等來之不易的工作流程。開始時先等待審批；僅在審查其提案後於受信任的工作區中使用自動寫入。完整指南：[Skill Workshop 外掛程式](/zh-Hant/plugins/skill-workshop)。

## ClawHub (安裝與同步)

[ClawHub](https://clawhub.ai) 是 OpenClaw 的公開技能註冊表。
使用原生的 `openclaw skills` 指令來進行探索/安裝/更新，或使用
獨立的 `clawhub` CLI 進行發佈/同步工作流程。完整指南：
[ClawHub](/zh-Hant/tools/clawhub)。

| 動作                   | 指令                                   |
| ---------------------- | -------------------------------------- |
| 將技能安裝至工作區     | `openclaw skills install <skill-slug>` |
| 更新所有已安裝的技能   | `openclaw skills update --all`         |
| 同步 (掃描 + 發佈更新) | `clawhub sync --all`                   |

原生 `openclaw skills install` 會安裝到啟用工作區的
`skills/` 目錄中。獨立的 `clawhub` CLI 也會安裝到
目前工作目錄下的 `./skills` (或是退回到
已設定的 OpenClaw 工作區)。OpenClaw 會在下一次
工作階段中將其拾取為 `<workspace>/skills`。

## 安全性

<Warning>請將第三方技能視為 **不受信任的程式碼**。在啟用前請先閱讀。 對於不受信任的輸入和有風險的工具，請優先使用沙箱執行。請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing) 以了解代理程式端的控制項。</Warning>

- 工作區和額外目錄的技能探索僅接受解析後的真實路徑停留在已設定根目錄內的技能根目錄和 `SKILL.md` 檔案。
- 閘道支援的技能相依性安裝 (`skills.install`、入門以及 Skills 設定 UI) 會在執行安裝程式中繼資料之前執行內建的危險程式碼掃描器。`critical` 的發現結果預設會遭到封鎖，除非呼叫端明確設定危險覆寫；可疑的發現結果仍僅會發出警告。
- `openclaw skills install <slug>` 則有所不同 — 它會將 ClawHub 技能資料夾下載到工作區中，並不使用上述的安裝程式中繼資料路徑。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 會將機密注入至該 Agent 週期的 **主機** 進程（而非沙盒）。請勿將機密包含在提示詞和日誌中。

如需更廣泛的威脅模型與檢查清單，請參閱 [安全性](/zh-Hant/gateway/security)。

## SKILL.md 格式

`SKILL.md` 必須至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClaw 遵循 AgentSkills 規範的佈局/意圖。嵌入式 Agent 使用的解析器僅支援 **單行** frontmatter 鍵；`metadata` 應為 **單行 JSON 物件**。請在指令中使用 `{baseDir}` 來參照技能資料夾路徑。

### 可選 frontmatter 鍵

<ParamField path="homepage" type="string">
  在 macOS Skills UI 中顯示為「網站」的 URL。亦可透過 `metadata.openclaw.homepage` 支援。
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  當 `true` 時，該技能會以使用者斜線指令形式公開。
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  當 `true` 時，該技能會從模型提示詞中排除（仍可透過使用者叫用使用）。
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  當設為 `tool` 時，斜線指令會略過模型並直接分派至工具。
</ParamField>
<ParamField path="command-tool" type="string">
  當設定 `command-dispatch: tool` 時要叫用的工具名稱。
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  針對工具分派，將原始參數字串轉發給工具（無核心解析）。工具會以 `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }` 叫用。
</ParamField>

## 閘控（載入時篩選）

OpenClaw 會在載入時使用 `metadata`（單行 JSON）篩選技能：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的欄位：

<ParamField path="always" type="boolean">
  當 `true` 時，始終包含該技能（跳過其他閘門）。
</ParamField>
<ParamField path="emoji" type="string">
  macOS Skills UI 使用的可選表情符號。
</ParamField>
<ParamField path="homepage" type="string">
  在 macOS Skills UI 中顯示為「Website」的可選 URL。
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  可選的平台列表。如果設置，該技能僅適用於那些作業系統。
</ParamField>
<ParamField path="requires.bins" type="string[]">
  每個都必須存在於 `PATH`。
</ParamField>
<ParamField path="requires.anyBins" type="string[]">
  至少有一個必須存在於 `PATH`。
</ParamField>
<ParamField path="requires.env" type="string[]">
  環境變數必須存在或在配置中提供。
</ParamField>
<ParamField path="requires.config" type="string[]">
  必須為真的 `openclaw.json` 路徑列表。
</ParamField>
<ParamField path="primaryEnv" type="string">
  與 `skills.entries.<name>.apiKey` 相關聯的環境變數名稱。
</ParamField>
<ParamField path="install" type="object[]">
  macOS Skills UI 使用的可選安裝程式規格（brew/node/go/uv/download）。
</ParamField>

如果沒有 `metadata.openclaw`，該技能始終符合資格（除非在配置中停用或對於捆綁技能被 `skills.allowBundled` 阻擋）。

<Note>當缺少 `metadata.openclaw` 時，仍接受舊版 `metadata.clawdbot` 區塊，因此較舊的已安裝技能會保留其相依性閘門和安裝程式提示。新技能和更新後的技能應使用 `metadata.openclaw`。</Note>

### 沙盒化說明

- `requires.bins` 會在技能載入時於**主機**上檢查。
- 如果代理程式在沙箱中執行，二進位檔案也必須存在於**容器內部**。透過 `agents.defaults.sandbox.docker.setupCommand` 安裝（或使用自訂映像檔）。`setupCommand` 會在容器建立後執行一次。套件安裝也需要網路出口、可寫入的根檔案系統，以及沙箱中的 root 使用者。
- 範例：`summarize` 技能（`skills/summarize/SKILL.md`）需要沙箱容器中的 `summarize` CLI 才能在那裡執行。

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
    - 如果列出了多個安裝程式，閘道會挑選一個首選選項（可用時為 brew，否則為 node）。
    - 如果所有安裝程式都是 `download`，OpenClaw 會列出每個項目，以便您查看可用的構件。
    - 安裝程式規格可以包含 `os: ["darwin"|"linux"|"win32"]` 以依平台篩選選項。
    - Node 安裝會遵守 `openclaw.json` 中的 `skills.install.nodeManager`（預設：npm；選項：npm/pnpm/yarn/bun）。這僅影響技能安裝；Gateway 執行時期仍應為 Node — 不建議將 Bun 用於 WhatsApp/Telegram。
    - Gateway 支援的安裝程式選擇是由偏好驅動的：當安裝規格混合類型時，如果啟用了 `skills.install.preferBrew` 且存在 `brew`，OpenClaw 會優先選擇 Homebrew，然後是 `uv`，接著是設定的 node 管理器，然後是其他備選方案，如 `go` 或 `download`。
    - 如果每個安裝規格都是 `download`，OpenClaw 會顯示所有下載選項，而不是折疊為一個首選安裝程式。
  </Accordion>
  <Accordion title="每個安裝程式的詳細資訊">
    - **Go 安裝：** 如果缺少 `go` 且有 `brew` 可用，閘道會先透過 Homebrew 安裝 Go，並盡可能將 `GOBIN` 設定為 Homebrew 的 `bin`。
    - **下載安裝：** `url` (必要)，`archive` (`tar.gz` | `tar.bz2` | `zip`)，`extract` (預設：偵測到壓縮檔時為自動)，`stripComponents`，`targetDir` (預設 `~/.openclaw/tools/<skillKey>`)。
  </Accordion>
</AccordionGroup>

## 設定覆寫

可以在 `~/.openclaw/openclaw.json` 的 `skills.entries` 下切換並提供內建與管理技能的環境變數值：

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
  即使技能是內建或已安裝，`false` 也會停用它。
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  針對宣告 `metadata.openclaw.primaryEnv` 之技能的便利設定。支援純文字或 SecretRef。
</ParamField>
<ParamField path="env" type="Record<string, string>">
  僅在程序中尚未設定該變數時才注入。
</ParamField>
<ParamField path="config" type="object">
  自訂各個技能欄位的可選容器。自訂金鑰必須置於此處。
</ParamField>
<ParamField path="allowBundled" type="string[]">
  僅限 **內建** 技能的可選允許清單。如果設定，則清單中只有內建技能符合資格 (受管理/工作區技能不受影響)。
</ParamField>

如果技能名稱包含連字號，請用引號括住金鑰 (JSON5 允許引號括住的金鑰)。設定金鑰預設符合 **技能名稱** — 如果技能定義了 `metadata.openclaw.skillKey`，請在 `skills.entries` 下使用該金鑰。

<Note>若要在 OpenClaw 內進行標準圖片生成/編輯，請改用核心 `image_generate` 工具搭配 `agents.defaults.imageGenerationModel`，而非 附帶的技能。此處的技能範例適用於自訂或第三方 工作流程。若要進行原生圖片分析，請使用 `image` 工具搭配 `agents.defaults.imageModel`。如果您選擇 `openai/*`、`google/*`、 `fal/*` 或其他供應商特定的圖片模型，也請一併新增該供應商的 auth/API 金鑰。</Note>

## 環境注入

當 Agent 執行開始時，OpenClaw 會：

1. 讀取技能中繼資料。
2. 將 `skills.entries.<key>.env` 與 `skills.entries.<key>.apiKey` 套用至 `process.env`。
3. 使用**符合資格**的技能建構系統提示。
4. 在執行結束後還原原始環境。

環境注入的**範圍僅限於 Agent 執行期間**，而非全域 Shell
環境。

對於附帶的 `claude-cli` 後端，OpenClaw 也會將相同的符合資格快照具體化為暫時的 Claude Code 外掛，並透過
`--plugin-dir` 傳遞。如此一來，Claude Code 便可使用其原生技能解析器，同時 OpenClaw 仍掌控優先順序、各 Agent 允許清單、閘控以及
`skills.entries.*` env/API 金鑰注入。其他 CLI 後端則僅使用提示目錄。

## 快照與重新整理

OpenClaw 會在**工作階段開始時**擷取符合資格的技能快照，
並在同一工作階段的後續輪次中重複使用該清單。對技能或組態的變更
會在下一個新的工作階段生效。

技能在以下兩種情況下可於工作階段中途重新整理：

- 已啟用技能監看器。
- 出現新的符合資格遠端節點。

您可以將此視為**熱重新載入**：重新整理後的清單會在
下一次 Agent 輪次被採用。若該工作階段的有效 Agent 技能允許清單發生變更，
OpenClaw 會重新整理快照，以確保可見的技能與目前的
Agent 保持一致。

### 技能監看器

依預設，OpenClaw 會監看技能資料夾，並在 `SKILL.md` 檔案變更時更新技能快照。
請在 `skills.load` 下進行設定：

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

### 遠端 macOS 節點 (Linux 閘道)

如果 Gateway 在 Linux 上運行，但連接了一個 **macOS 節點** 且允許 `system.run`（Exec approvals 安全設定未設為 `deny`），當該節點上存在所需的二進位檔案時，OpenClaw 可以將僅限 macOS 的技能視為符合資格。Agent 應透過帶有 `host=node` 的 `exec` 工具來執行這些技能。

這取決於節點回報其指令支援情況，以及透過 `system.which` 或 `system.run` 進行的二進位檔案探測。離線節點**不會**讓僅限遠端的技能可見。如果連線的節點停止回應二進位檔案探測，OpenClaw 會清除其快取的二進位檔案匹配項，讓 Agent 不再看到目前無法在那裡執行的技能。

## Token 影響

當技能符合資格時，OpenClaw 會將可用技能的精簡 XML 清單注入系統提示詞（透過 `pi-coding-agent` 中的 `formatSkillsForPrompt`）。成本是確定的：

- **基本額外開銷**（僅當有 ≥1 個技能時）：195 個字元。
- **每個技能：**97 個字元 + XML 轉義後的 `<name>`、`<description>` 和 `<location>` 值的長度。

公式（字元）：

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

XML 轉義會將 `& < > " '` 擴展為實體（如 `&amp;`、`&lt;` 等），從而增加長度。Token 計數會根據模型的分詞器而變化。粗略的 OpenAI 風格估算約為 4 字元/token，因此每個技能 **97 字元 ≈ 24 tokens**，加上您實際的欄位長度。

## 受管技能生命週期

OpenClaw 在安裝（npm 套件或 OpenClaw.app）時提供了一組基準技能作為**隨附技能**。`~/.openclaw/skills` 用於本機覆寫——例如，固定或修補技能而不變更隨附副本。工作區技能為使用者所有，且在名稱衝突時會覆寫前兩者。

## 尋找更多技能？

瀏覽 [https://clawhub.ai](https://clawhub.ai)。完整配置架構：[Skills config](/zh-Hant/tools/skills-config)。

## 相關

- [ClawHub](/zh-Hant/tools/clawhub) — 公共技能註冊表
- [Creating skills](/zh-Hant/tools/creating-skills) — 建置自訂技能
- [外掛程式](/zh-Hant/tools/plugin) — 外掛程式系統概述
- [Skill Workshop 外掛程式](/zh-Hant/plugins/skill-workshop) — 從 Agent 的工作生成技能
- [技能設定](/zh-Hant/tools/skills-config) — 技能設定參考
- [斜線指令](/zh-Hant/tools/slash-commands) — 所有可用的斜線指令
