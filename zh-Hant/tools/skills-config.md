---
summary: "Skills config schema and examples"
read_when:
  - 新增或修改 Skills 設定
  - 調整 bundled allowlist 或安裝行為
title: "Skills Config"
---

# Skills Config

所有與技能相關的設定都位於 `skills` 中的 `~/.openclaw/openclaw.json` 下。

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

對於內建的影像生成/編輯，建議優先使用 `agents.defaults.imageGenerationModel`
加上核心 `image_generate` 工具。`skills.entries.*` 僅適用於自訂或
第三方技能工作流程。

範例：

- 原生 Nano Banana 風格設定：`agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- 原生 fal 設定：`agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## 欄位

- `allowBundled`：僅適用於 **bundled** 技能的可選 allowlist。設定後，清單中
  的 bundled 技能才符合資格 (managed/workspace 技能不受影響)。
- `load.extraDirs`：要掃描的其他技能目錄 (優先順序最低)。
- `load.watch`：監看技能資料夾並重新整理技能快照 (預設值：true)。
- `load.watchDebounceMs`：技能監看器事件的防震動時間，以毫秒為單位 (預設值：250)。
- `install.preferBrew`：盡可能使用 brew 安裝程式 (預設值：true)。
- `install.nodeManager`：Node 安裝程式偏好設定 (`npm` | `pnpm` | `yarn` | `bun`，預設值：npm)。
  這僅影響 **技能安裝**；Gateway 執行階段仍應為 Node
  (不建議用於 WhatsApp/Telegram)。
- `entries.<skillKey>`：各項技能的覆寫設定。

各項技能欄位：

- `enabled`：將 `false` 設為以停用技能，即使其已 bundled/安裝。
- `env`：為代理執行注入的環境變數 (僅在尚未設定時)。
- `apiKey`：針對宣告主要環境變數之技能的可選便利設定。
  支援純文字字串或 SecretRef 物件 (`{ source, provider, id }`)。

## 備註

- `entries` 下的索引鍵預設對應至技能名稱。如果技能定義了
  `metadata.openclaw.skillKey`，請改用該索引鍵。
- 當啟用監看器時，對技能的變更會在下一個代理程式回合時被拾取。

### 沙盒技能 + 環境變數

當會話處於**沙盒模式**時，技能程序會在 Docker 內執行。沙盒**不會**繼承主機的 `process.env`。

使用以下方法之一：

- `agents.defaults.sandbox.docker.env`（或每個代理程式的 `agents.list[].sandbox.docker.env`）
- 將環境變數編入您的自訂沙盒映像中

全域 `env` 和 `skills.entries.<skill>.env/apiKey` 僅適用於**主機**執行。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
