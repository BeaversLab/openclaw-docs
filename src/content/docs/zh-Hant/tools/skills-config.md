---
summary: "Skills 配置結構描述與範例"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Skills 配置"
---

# Skills Config

大多數 Skills 載入器/安裝設定位於 `skills` 中的
`~/.openclaw/openclaw.json`。特定 Agent 的 Skills 可見性位於
`agents.defaults.skills` 和 `agents.list[].skills`。

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills", "~/Projects/oss/some-skill-pack/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun (Gateway runtime still Node; bun not recommended)
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

對於內建的圖片產生/編輯，建議優先使用 `agents.defaults.imageGenerationModel`
加上核心 `image_generate` 工具。`skills.entries.*` 僅適用於自訂或
第三方的 Skills 工作流程。

如果您選擇了特定的圖片提供者/模型，也請配置該提供者的
驗證/API 金鑰。典型範例：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY` 用於
`google/*`，`OPENAI_API_KEY` 用於 `openai/*`，以及 `FAL_KEY` 用於 `fal/*`。

範例：

- 原生 Nano Banana 風格設定：`agents.defaults.imageGenerationModel.primary: "google/gemini-3.1-flash-image-preview"`
- 原生 fal 設定：`agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## Agent Skills 允許清單

當您想要使用相同的機器/工作區 Skills 根目錄，但每個 Agent 有不同的可見 Skills 集合時，請使用 Agent 設定。

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
  `agents.list[].skills` 的 Agents 之共用基準允許清單。
- 省略 `agents.defaults.skills` 可讓 Skills 預設不受限制。
- `agents.list[].skills`：該 Agent 的明確最終 Skills 集；它不會
  與預設值合併。
- `agents.list[].skills: []`：對該 Agent 不顯示任何 Skills。

## 欄位

- 內建 Skills 根目錄總是包含 `~/.openclaw/skills`、`~/.agents/skills`、
  `<workspace>/.agents/skills` 和 `<workspace>/skills`。
- `allowBundled`：僅適用於 **內建 (bundled)** Skills 的選用允許清單。設定後，
  只有清單中的內建 Skills 符合資格（受控、Agent 和工作區 Skills 不受影響）。
- `load.extraDirs`：要掃描的其他 Skills 目錄（優先順序最低）。
- `load.watch`：監看 Skills 資料夾並重新整理 Skills 快照（預設：true）。
- `load.watchDebounceMs`：技能監視器事件的防抖時間，以毫秒為單位（預設值：250）。
- `install.preferBrew`：如果可用，優先使用 brew 安裝程式（預設值：true）。
- `install.nodeManager`：node 安裝程式偏好（`npm` | `pnpm` | `yarn` | `bun`，預設值：npm）。
  這僅影響 **技能安裝**；Gateway 執行時仍應為 Node
  （不建議在 WhatsApp/Telegram 上使用 Bun）。
  - `openclaw setup --node-manager` 較為狹窄，目前接受 `npm`、
    `pnpm` 或 `bun`。如果您
    想要使用 Yarn 支援的技能安裝，請手動設定 `skills.install.nodeManager: "yarn"`。
- `entries.<skillKey>`：針對個別技能的覆寫。
- `agents.defaults.skills`：可選的預設技能允許清單，由省略
  `agents.list[].skills` 的代理程式繼承。
- `agents.list[].skills`：可選的針對個別代理程式的最終技能允許清單；明確的
  清單會取代繼承的預設值，而不是合併。

個別技能欄位：

- `enabled`：設定 `false` 以停用技能，即使該技能已捆綁/安裝。
- `env`：為代理程式執行注入的環境變數（僅在尚未設定時）。
- `apiKey`：針對宣告主要環境變數之技能的可選便利功能。
  支援純文字字串或 SecretRef 物件（`{ source, provider, id }`）。

## 備註

- `entries` 下的鍵預設對應至技能名稱。如果技能定義了
  `metadata.openclaw.skillKey`，請改用該鍵。
- 載入優先順序為 `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → 捆綁技能 →
  `skills.load.extraDirs`。
- 當啟用監視器時，技能的變更會在下一輪代理程式回合中生效。

### 沙箱化技能 + 環境變數

當會話被**沙盒化**時，技能程序會在設定的沙盒後端內執行。沙盒**不會**繼承主機的 `process.env`。

使用以下其中之一：

- 針對 Docker 後端使用 `agents.defaults.sandbox.docker.env`（或針對各代理使用 `agents.list[].sandbox.docker.env`）
- 將環境變數融入您的自訂沙盒映像檔或遠端沙盒環境中

全域 `env` 和 `skills.entries.<skill>.env/apiKey` 僅適用於 **host** 執行。
