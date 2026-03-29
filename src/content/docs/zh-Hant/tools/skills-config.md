---
summary: "Skills 配置架構與範例"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Skills Config"
---

# Skills Config

所有與 Skills 相關的配置都位於 `skills` 的 `~/.openclaw/openclaw.json` 下。

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

對於內建的影像生成/編輯，建議使用 `agents.defaults.imageGenerationModel`
加上核心的 `image_generate` 工具。`skills.entries.*` 僅適用於自訂或
第三方 Skills 工作流程。

如果您選擇了特定的影像提供者/模型，請同時配置該提供者的
驗證/API 金鑰。常見範例：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY` 用於
`google/*`，`OPENAI_API_KEY` 用於 `openai/*`，以及 `FAL_KEY` 用於 `fal/*`。

範例：

- 原生 Nano Banana 風格設定：`agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- 原生 fal 設定：`agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## 欄位

- `allowBundled`：僅針對 **內建** Skills 的可選允許清單。設定後，僅清單中的
  內建 Skills 符合資格（受管理/工作區 Skills 不受影響）。
- `load.extraDirs`：要掃描的其他 Skills 目錄（優先順序最低）。
- `load.watch`：監看 Skills 資料夾並重新整理 Skills 快照（預設為 true）。
- `load.watchDebounceMs`：Skills 監看事件的防震動時間（毫秒，預設為 250）。
- `install.preferBrew`：當可用時優先使用 brew 安裝程式（預設為 true）。
- `install.nodeManager`：node 安裝程式偏好設定（`npm` | `pnpm` | `yarn` | `bun`，預設為 npm）。
  這僅影響 **Skills 安裝**；Gateway 執行時應仍為 Node
  （不建議在 WhatsApp/Telegram 上使用 Bun）。
- `entries.<skillKey>`：個別 Skills 的覆寫設定。

個別 Skills 欄位：

- `enabled`：設定 `false` 以停用 Skill，即使該 Skill 已內建/安裝。
- `env`：為代理執行注入的環境變數（僅在尚未設定時）。
- `apiKey`：針對宣告主要環境變數的技能的選用便利設定。
  支援純文字字串或 SecretRef 物件 (`{ source, provider, id }`)。

## 注意事項

- `entries` 下的鍵預設對應至技能名稱。如果技能定義了
  `metadata.openclaw.skillKey`，請改用該鍵。
- 當啟用監看器時，對技能的變更會在下一個代理回合中被套用。

### 沙箱技能 + 環境變數

當工作階段處於 **沙箱** 模式時，技能程序會在 Docker 內執行。沙箱
**不會** 繼承主機的 `process.env`。

使用以下其中之一：

- `agents.defaults.sandbox.docker.env` (或每個代理的 `agents.list[].sandbox.docker.env`)
- 將環境變數內建至您的自訂沙箱映像中

全域 `env` 和 `skills.entries.<skill>.env/apiKey` 僅適用於 **主機** 執行。
