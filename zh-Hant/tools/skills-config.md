---
summary: "技能配置架構與範例"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "技能配置"
---

# 技能配置

所有與技能相關的配置都位於 `skills` 中的 `~/.openclaw/openclaw.json` 下。

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
      "nano-banana-pro": {
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

## 欄位

- `allowBundled`：僅限**隨附 (bundled)** 技能的可選允許清單。設定後，僅清單中的隨附技能符合資格（受管理/工作區技能不受影響）。
- `load.extraDirs`：要掃描的其他技能目錄（優先順序最低）。
- `load.watch`：監看技能資料夾並重新整理技能快照（預設為 true）。
- `load.watchDebounceMs`：技能監看器事件的防震動時間，以毫秒為單位（預設為 250）。
- `install.preferBrew`：在可用時偏好使用 brew 安裝程式（預設為 true）。
- `install.nodeManager`：Node 安裝程式偏好（`npm` | `pnpm` | `yarn` | `bun`，預設為 npm）。
  這僅影響**技能安裝**；Gateway 執行時仍應為 Node
  （不建議用於 WhatsApp/Telegram）。
- `entries.<skillKey>`：各項技能的覆寫設定。

各項技能欄位：

- `enabled`：將 `false` 設定為停用技能，即使其為隨附/已安裝。
- `env`：為代理執行注入的環境變數（僅在尚未設定時）。
- `apiKey`：針對宣告主要環境變數的技能所提供的可選便利設定。
  支援純文字字串或 SecretRef 物件（`{ source, provider, id }`）。

## 注意事項

- `entries` 下的索引鍵預設對應至技能名稱。如果技能定義了
  `metadata.openclaw.skillKey`，請改用該索引鍵。
- 當啟用監看器時，對技能所做的變更會在下一輪代理回合時被採用。

### 沙箱化技能 + 環境變數

當工作階段處於**沙箱化**狀態時，技能程序會在 Docker 內部執行。沙箱**不會**繼承主機的 `process.env`。

使用下列其中一種方式：

- `agents.defaults.sandbox.docker.env`（或各代理的 `agents.list[].sandbox.docker.env`）
- 將環境變數建置至您的自訂沙箱映像中

全域 `env` 和 `skills.entries.<skill>.env/apiKey` 僅套用於 **host** 執行。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
