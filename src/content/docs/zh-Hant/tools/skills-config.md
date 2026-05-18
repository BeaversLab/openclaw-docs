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
- `load.allowSymlinkTargets`：受信的實際目標目錄，符號連結的
  workspace、project-agent 或 extra-dir 技能資料夾即使符號連結位於該目標根目錄之外，也可以解析到這些目錄。將其用於有意的
  同級儲存庫佈局，例如
  `<workspace>/skills/manager -> ~/Projects/manager/skills`。受管理的
  `~/.openclaw/skills` 和個人 `~/.agents/skills` 根目錄預設情況下
  可能會遵循來自本機技能管理器的技能目錄符號連結，但每個
  `SKILL.md` 仍必須在其自身的技能目錄內解析。
- `load.watch`：監視技能資料夾並重新整理技能快照（預設為 true）。
- `load.watchDebounceMs`：技能監視器事件的防抖時間，以毫秒為單位（預設為 250）。
- `install.preferBrew`：當有可用時優先使用 brew 安裝程式（預設為 true）。
- `install.nodeManager`：node 安裝程式偏好設定（`npm` | `pnpm` | `yarn` | `bun`，預設為 npm）。
  這僅影響**技能安裝**；Gateway 執行時仍應為 Node
  （不建議將 Bun 用於 WhatsApp/Telegram）。
  - `openclaw setup --node-manager` 更為狹隘，目前接受 `npm`、
    `pnpm` 或 `bun`。如果您
    想要由 Yarn 支援的技能安裝，請手動設定 `skills.install.nodeManager: "yarn"`。
- `install.allowUploadedArchives`：允許受信的 `operator.admin` Gateway
  用戶端安裝透過 `skills.upload.*` 暫存的私人 zip 壓縮檔
  （預設為 false）。這僅啟用上傳壓縮檔路徑；正常的 ClawHub
  安裝不需要它。
- `entries.<skillKey>`：個別技能的覆蓋設定。
- `agents.defaults.skills`：可選的預設技能允許清單，由省略
  `agents.list[].skills` 的代理程式繼承。
- `agents.list[].skills`：可選的個別代理程式最終技能允許清單；明確的
  清單會取代繼承的預設值，而不是合併。

## 符號連結的姊妹儲存庫

預設情況下，workspace、project-agent、extra-dir 和 bundled skill 根目錄是隔離邊界。如果 `<workspace>/skills` 下的技能資料夾是指向 `<workspace>/skills` 外部的符號連結，OpenClaw 將會跳過它並記錄 `Skipping escaped skill path outside its configured root`。

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

使用此配置，諸如 `<workspace>/skills/manager -> ~/Projects/manager/skills` 的符號連結在解析實際路徑後會被接受。`extraDirs` 也會直接掃描同層級存放庫，而 `allowSymlinkTargets` 則保留符號連結路徑以維持現有的 workspace-skill 佈局。Managed `~/.openclaw/skills` 和 personal `~/.agents/skills` 目錄已經接受技能目錄的符號連結，因為這些根目錄是用戶擁有的本地 skill-manager 介面；個別技能的 `SKILL.md` 隔離仍然適用。請保持目標條目狹窄；除非該根目錄下的每個技能樹都受信任，否則不要指向廣泛的根目錄，例如 `~` 或 `~/Projects`。

每個技能的欄位：

- `enabled`：將 `false` 設定為以停用技能，即使該技能已打包/安裝。
- `env`：為代理執行注入的環境變數（僅在尚未設定時）。
- `apiKey`：對於宣告主要環境變數的技能而言，這是可選的便利設定。
  支援純文字字串或 SecretRef 物件 (`{ source, provider, id }`)。

## 注意事項

- `entries` 下的金鑰預設對應至技能名稱。如果技能定義了
  `metadata.openclaw.skillKey`，請改用該金鑰。
- 載入優先順序為 `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → bundled skills →
  `skills.load.extraDirs`。
- 當啟用監看器時，技能的變更將在下一輪 agent 週期時被載入。

### 沙盒化技能與環境變數

當會話處於**沙盒**狀態時，技能程序會在設定的沙盒後端內執行。沙盒**不會**繼承主機的 `process.env`。

<Warning>
  全域 `env` 和 `skills.entries.<skill>.env`/`apiKey` 僅適用於 **主機** 執行。在沙箱內它們沒有作用，因此依賴 `GEMINI_API_KEY` 的技能將會因 `apiKey not configured` 而失敗，除非單獨將該變數提供給沙箱。
</Warning>

使用下列其中一種方式：

- 對於 Docker 後端使用 `agents.defaults.sandbox.docker.env`（或是針對每個 Agent 使用 `agents.list[].sandbox.docker.env`）。
- 將環境變數內建至您的自訂沙盒映像檔或遠端沙盒環境中。

對於 Docker 沙箱，設定的 `sandbox.docker.env` 值會變成明確的容器環境變數。擁有 Docker daemon 存取權的使用者可以透過 Docker 中繼資料檢查它們，因此當這種暴露是不可接受時，請使用掛載的秘密檔案、自訂映像檔或其他傳遞路徑。

## 相關

<CardGroup cols={2}>
  <Card title="Skills" href="/zh-Hant/tools/skills" icon="puzzle-piece">
    什麼是技能以及它們如何載入。
  </Card>
  <Card title="Creating skills" href="/zh-Hant/tools/creating-skills" icon="hammer">
    撰寫自訂技能包。
  </Card>
  <Card title="Slash commands" href="/zh-Hant/tools/slash-commands" icon="terminal">
    原生命令目錄和聊天指令。
  </Card>
  <Card title="Configuration reference" href="/zh-Hant/gateway/configuration-reference" icon="gear">
    完整的 `skills` 和 `agents.skills` 結構描述。
  </Card>
</CardGroup>
