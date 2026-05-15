---
summary: "Skills 配置架構和範例"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Skills 配置"
---

大多數 Skills 載入器/安裝配置位於 `skills` 中的
`~/.openclaw/openclaw.json`。特定 Agent 的 Skills 可見性位於
`agents.defaults.skills` 和 `agents.list[].skills`。

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills", "~/Projects/oss/some-skill-pack/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun (Gateway runtime still Node; bun not recommended)
      allowUploadedArchives: false,
    },
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

對於內建的圖像生成/編輯，建議優先使用 `agents.defaults.imageGenerationModel`
加上核心 `image_generate` 工具。`skills.entries.*` 僅適用於自訂或
第三方 Skills 工作流程。

如果您選擇了特定的圖像供應商/模型，也請配置該供應商的
驗證/API 金鑰。典型範例：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY` 用於
`google/*`，`OPENAI_API_KEY` 用於 `openai/*`，以及 `FAL_KEY` 用於 `fal/*`。

範例：

- 原生 Nano Banana Pro 風格設定：`agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- 原生 fal 設定：`agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## 代理技能允許清單

當您希望使用相同的機器/工作區技能根目錄，但每個代理具有不同的可見技能集時，請使用代理配置。

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"],
    },
    list: [
      { id: "writer" }, // inherits defaults -> github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

規則：

- `agents.defaults.skills`：省略
  `agents.list[].skills` 的 Agent 之共用基準允許清單。
- 省略 `agents.defaults.skills` 以保持 Skills 預設不受限制。
- `agents.list[].skills`：該 Agent 的明確最終 Skill 集；它不會
  與預設值合併。
- `agents.list[].skills: []`：不對該 Agent 公開任何 Skills。

## 欄位

- 內建 Skill 根目錄總是包含 `~/.openclaw/skills`、`~/.agents/skills`、
  `<workspace>/.agents/skills` 和 `<workspace>/skills`。
- `allowBundled`：僅適用於 **bundled** Skills 的選用允許清單。設定後，只有
  清單中的 bundled Skills 符合資格（managed、agent 和 workspace Skills 不受影響）。
- `load.extraDirs`：要掃描的額外 Skill 目錄（優先順序最低）。
- `load.allowSymlinkTargets`：受信任的真實目標目錄，即使符號連結位於該
  目標根目錄之外，連結的 Skill 資料夾也可以解析到這些目錄。將此用於有意的同層級 repo 版面配置，例如
  `~/.agents/skills/manager -> ~/Projects/manager/skills`。
- `load.watch`: 監看技能資料夾並重新整理技能快照（預設：true）。
- `load.watchDebounceMs`: 技能監看器事件的防抖時間，以毫秒為單位（預設：250）。
- `install.preferBrew`: 當可用時優先使用 brew 安裝程式（預設：true）。
- `install.nodeManager`: node 安裝程式偏好（`npm` | `pnpm` | `yarn` | `bun`，預設：npm）。
  這僅影響**技能安裝**；Gateway 執行時仍應為 Node
  （不建議將 Bun 用於 WhatsApp/Telegram）。
  - `openclaw setup --node-manager` 範圍較窄，目前接受 `npm`、
    `pnpm` 或 `bun`。如果您
    想要由 Yarn 支援的技能安裝，請手動設定 `skills.install.nodeManager: "yarn"`。
- `install.allowUploadedArchives`: 允許受信任的 `operator.admin` Gateway
  用戶端安裝透過 `skills.upload.*` 暫存的私有 zip 壓縮檔
  （預設：false）。這僅啟用上傳壓縮檔路徑；正常的 ClawHub
  安裝不需要它。
- `entries.<skillKey>`: 針對個別技能的覆寫設定。
- `agents.defaults.skills`: 可選的預設技能允許清單，由省略
  `agents.list[].skills` 的代理程式繼承。
- `agents.list[].skills`: 可選的針對個別代理程式的最終技能允許清單；明確
  的清單會取代繼承的預設值，而非合併。

## 符號連結的姊妹儲存庫

根據預設，每個技能根目錄都是一個邊界。如果 `~/.agents/skills` 下的技能資料夾
是一個解析到 `~/.agents/skills` 之外的符號連結，
OpenClaw 會跳過它並記錄 `Skipping escaped skill path outside its configured
root`。

保留符號連結佈局並僅允許受信任的目標根目錄：

```json5
{
  skills: {
    load: {
      extraDirs: ["~/Projects/manager/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
  },
}
```

透過此設定，在解析真實路徑後，類似 `~/.agents/skills/manager -> ~/Projects/manager/skills` 的符號連結會被接受。`extraDirs` 也會直接掃描同層級 repo，而 `allowSymlinkTargets` 則會為現有的 agent-skill 版面配置保留符號連結路徑。請保持目標項目狹窄；除非該根目錄下的每個技能樹都受信任，否則不要指向廣泛的根目錄，例如 `~` 或 `~/Projects`。

每個技能的欄位：

- `enabled`：將 `false` 設為停用，即使該技能已內建/安裝。
- `env`：為 agent 執行注入的環境變數（僅在尚未設置時）。
- `apiKey`：針對宣告主要環境變數的技能之可選便利設定。支援純文字字串或 SecretRef 物件 (`{ source, provider, id }`)。

## 注意事項

- `entries` 下的鍵預設對應至技能名稱。如果技能定義了 `metadata.openclaw.skillKey`，則改用該鍵。
- 載入優先順序為 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → 內建技能 → `skills.load.extraDirs`。
- 當啟用監看器時，技能的變更將在下一輪 agent 週期時被載入。

### 沙盒化技能與環境變數

當工作階段處於**沙盒**狀態時，技能程序會在設定的沙盒後端內執行。沙盒**不會**繼承主機的 `process.env`。

<Warning>
  全域的 `env` 與 `skills.entries.<skill>.env`/`apiKey` 僅適用於**主機**執行。在沙盒內它們無效，因此依賴 `GEMINI_API_KEY` 的技能將會因 `apiKey not configured` 而失敗，除非單獨將該變數提供給沙盒。
</Warning>

使用下列其中一種方式：

- 針對 Docker 後端使用 `agents.defaults.sandbox.docker.env` (或每個 agent 的 `agents.list[].sandbox.docker.env`)。
- 將環境變數內建至您的自訂沙盒映像檔或遠端沙盒環境中。

## 相關連結

<CardGroup cols={2}>
  <Card title="Skills" href="/zh-Hant/tools/skills" icon="puzzle-piece">
    什麼是技能及其載入方式。
  </Card>
  <Card title="Creating skills" href="/zh-Hant/tools/creating-skills" icon="hammer">
    撰寫自訂技能套件。
  </Card>
  <Card title="Slash commands" href="/zh-Hant/tools/slash-commands" icon="terminal">
    原生命令目錄和聊天指令。
  </Card>
  <Card title="Configuration reference" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    完整的 `skills` 和 `agents.skills` 綱要。
  </Card>
</CardGroup>
