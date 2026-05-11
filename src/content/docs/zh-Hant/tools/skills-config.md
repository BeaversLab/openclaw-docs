---
summary: "Skills 配置結構描述與範例"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Skills config"
---

大多數技能載入器/安裝配置位於 `skills` 中的
`~/.openclaw/openclaw.json`。特定於代理的技能可見性位於
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

對於內建影像生成/編輯，建議優先使用 `agents.defaults.imageGenerationModel`
搭配核心 `image_generate` 工具。`skills.entries.*` 僅適用於自訂或
第三方技能工作流程。

如果您選擇特定的影像供應商/模型，請同時設定該供應商的
驗證/API 金鑰。典型範例：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY` 用於
`google/*`、`OPENAI_API_KEY` 用於 `openai/*`，以及 `FAL_KEY` 用於 `fal/*`。

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

- `agents.defaults.skills`：針對省略
  `agents.list[].skills` 之代理的共享基準允許清單。
- 省略 `agents.defaults.skills` 以預設讓技能不受限制。
- `agents.list[].skills`：該代理的明確最終技能集；它不會
  與預設值合併。
- `agents.list[].skills: []`：不對該代理公開任何技能。

## 欄位

- 內建技能根目錄總是包含 `~/.openclaw/skills`、`~/.agents/skills`、
  `<workspace>/.agents/skills` 和 `<workspace>/skills`。
- `allowBundled`：僅針對 **隨附** 技能的可選允許清單。設定後，清單中
  的隨附技能才符合資格（受管理、代理和工作區技能不受影響）。
- `load.extraDirs`：要掃描的其他技能目錄（優先順序最低）。
- `load.watch`：監看技能資料夾並重新整理技能快照（預設：true）。
- `load.watchDebounceMs`：技能監看者事件的防動時間，以毫秒為單位（預設：250）。
- `install.preferBrew`：盡可能使用 brew 安裝程式（預設值：true）。
- `install.nodeManager`：node 安裝程式偏好設定（`npm` | `pnpm` | `yarn` | `bun`，預設值：npm）。
  這僅影響 **skill 安裝**；Gateway 執行時仍應為 Node
  （不建議將 Bun 用於 WhatsApp/Telegram）。
  - `openclaw setup --node-manager` 較嚴格，目前接受 `npm`、
    `pnpm` 或 `bun`。如果您
    想要使用 Yarn 支援的 skill 安裝，請手動設定 `skills.install.nodeManager: "yarn"`。
- `entries.<skillKey>`：各個 skill 的覆寫設定。
- `agents.defaults.skills`：選用的預設 skill 允許清單，由省略
  `agents.list[].skills` 的代理程式繼承。
- `agents.list[].skills`：選用的各個代理程式最終 skill 允許清單；明確
  指定的清單會取代繼承的預設值，而不是合併。

各個 skill 的欄位：

- `enabled`：設定 `false` 以停用 skill，即使其已打包/安裝。
- `env`：為代理程式執行注入的環境變數（僅在尚未設定時）。
- `apiKey`：適用於宣告主要環境變數之 skill 的選用便利功能。
  支援純文字字串或 SecretRef 物件（`{ source, provider, id }`）。

## 備註

- `entries` 下的索引鍵預設對應至 skill 名稱。如果 skill 定義
  了 `metadata.openclaw.skillKey`，請改用該索引鍵。
- 載入優先順序為 `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → bundled skills →
  `skills.load.extraDirs`。
- 當監看器已啟用時，skill 的變更會在下一輪代理程式回合時被套用。

### 沙盒化 skills + 環境變數

當工作階段處於 **沙盒化** 狀態時，skill 程序會在設定的
沙盒後端內執行。沙盒 **不會** 繼承主機的 `process.env`。

使用以下其中之一：

- 用於 Docker 後端的 `agents.defaults.sandbox.docker.env`（或各個代理程式的 `agents.list[].sandbox.docker.env`）
- 將環境變數內建到您的自訂沙盒映像檔或遠端沙盒環境中

全域 `env` 和 `skills.entries.<skill>.env/apiKey` 僅適用於 **host** 執行。

## 相關

- [技能](/zh-Hant/tools/skills)
- [建立技能](/zh-Hant/tools/creating-skills)
- [斜線指令](/zh-Hant/tools/slash-commands)
