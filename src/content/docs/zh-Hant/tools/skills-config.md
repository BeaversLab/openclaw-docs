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

- 內建技能根目錄總是包含 `~/.openclaw/skills`、`~/.agents/skills`、
  `<workspace>/.agents/skills` 和 `<workspace>/skills`。
- `allowBundled`：僅針對**內建**技能的可選允許清單。設定後，
  清單中僅內建技能符合資格（受控、代理和工作區技能不受影響）。
- `load.extraDirs`：要掃描的其他技能目錄（優先順序最低）。
- `load.watch`：監看技能資料夾並重新整理技能快照（預設：true）。
- `load.watchDebounceMs`：技能監看器事件的防抖時間，以毫秒為單位（預設：250）。
- `install.preferBrew`：當有提供時，優先使用 brew 安裝程式（預設：true）。
- `install.nodeManager`：Node 安裝程式偏好（`npm` | `pnpm` | `yarn` | `bun`，預設值：npm）。
  這僅影響 **skill 安裝**；Gateway 執行時仍應為 Node
  （不建議用於 WhatsApp/Telegram）。
- `entries.<skillKey>`：各技能的覆蓋設定。

各技能欄位：

- `enabled`：設定 `false` 以停用技能，即使其已打包/安裝。
- `env`：為 agent 執行注入的環境變數（僅在尚未設定時）。
- `apiKey`：針對宣告主要環境變數的技能的可選便利設定。
  支援純文字字串或 SecretRef 物件（`{ source, provider, id }`）。

## 注意事項

- 預設情況下，`entries` 下的鍵會對應到技能名稱。如果技能定義了
  `metadata.openclaw.skillKey`，請改用該鍵。
- 載入優先順序為 `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → bundled skills →
  `skills.load.extraDirs`。
- 當啟用監看器時，技能的變更會在下一個代理輪次中被接收。

### 沙盒化技能 + 環境變數

當會話處於**沙盒化**（sandboxed）狀態時，技能程序會在 Docker 內執行。沙盒**不會**繼承主機的 `process.env`。

使用下列其中一種方式：

- `agents.defaults.sandbox.docker.env` （或每個代理的 `agents.list[].sandbox.docker.env`）
- 將環境變數內建到您的自訂沙盒映像中

全域 `env` 和 `skills.entries.<skill>.env/apiKey` 僅適用於 **主機**（host）執行。
