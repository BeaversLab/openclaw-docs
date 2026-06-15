---
title: "Skills config"
sidebarTitle: "Skills config"
summary: "skills.* 配置架構、代理程式允許清單、Workshop 設定以及沙盒環境變數處理的完整參考。"
read_when:
  - Configuring skill loading, install, or gating behavior
  - Setting per-agent skill visibility
  - Adjusting Skill Workshop limits or approval policy
---

大多數技能配置位於 `~/.openclaw/openclaw.json` 中的 `skills` 下。特定於代理程式的可見性位於 `agents.defaults.skills` 和 `agents.list[].skills` 下。

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm",
      allowUploadedArchives: false,
    },
    workshop: {
      autonomous: { enabled: false },
      approvalPolicy: "pending",
      maxPending: 50,
      maxSkillBytes: 40000,
    },
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

<Note>對於內建圖片生成，請使用 `agents.defaults.imageGenerationModel` 加上核心 `image_generate` 工具，而不是 `skills.entries`。技能條目僅適用於自訂或第三方技能工作流程。</Note>

## 載入 (`skills.load`)

<ParamField path="skills.load.extraDirs" type="string[]">
  要掃描的其他技能目錄，優先順序最低（在內建和插件技能之後）。路徑會使用 `~` 支援進行展開。
</ParamField>

<ParamField path="skills.load.allowSymlinkTargets" type="string[]">
  符號連結技能資料夾可能解析到的受信任真實目標目錄，即使符號連結位於設定的根目錄之外。將此用於有意的同層級存放庫佈局，例如 `<workspace>/skills/manager -> ~/Projects/manager/skills`。請保持此列表狹窄 — 不要指向像 `~` 或 `~/Projects` 這樣的廣泛根目錄。
</ParamField>

<ParamField path="skills.load.watch" type="boolean" default="true">
  監看技能資料夾，並在 `SKILL.md` 檔案變更時重新整理技能快照。涵蓋群組技能根目錄下的巢狀檔案。
</ParamField>

<ParamField path="skills.load.watchDebounceMs" type="number" default="250">
  技能監看器事件的防顫視窗（毫秒）。
</ParamField>

## 安裝 (`skills.install`)

<ParamField path="skills.install.preferBrew" type="boolean" default="true">
  當 `brew` 可用時，優先使用 Homebrew 安裝程式。
</ParamField>

<ParamField path="skills.install.nodeManager" type='"npm" | "pnpm" | "yarn" | "bun"' default='"npm"'>
  技能安裝的 Node 套件管理器偏好設定。這僅影響技能安裝 — Gateway 執行時仍應使用 Node（不建議針對 WhatsApp/Telegram 使用 Bun）。針對 npm、pnpm 或 bun 使用 `openclaw setup --node-manager`；若是基於 Yarn 的技能安裝，請手動設定 `"yarn"`。
</ParamField>

<ParamField path="skills.install.allowUploadedArchives" type="boolean" default="false">
  允許受信任的 `operator.admin` Gateway 用戶端安裝透過 `skills.upload.*` 暫存的私人 zip 壓縮檔。一般的 ClawHub 安裝不需要此設定。
</ParamField>

## 隨附技能允許清單

<ParamField path="skills.allowBundled" type="string[]">
  僅適用於 **隨附 (bundled)** 技能的選用允許清單。設定後，僅清單中的隨附技能符合資格。受管理、代理層級和工作區技能不受影響。
</ParamField>

## 個別技能項目 (`skills.entries`)

`entries` 下的索引鍵預設會比對技能 `name`。如果技能定義了 `metadata.openclaw.skillKey`，請改用該索引鍵。請用引號括住帶有連字號的名稱（JSON5 允許使用帶引號的索引鍵）。

<ParamField path="skills.entries.<key>.enabled" type="boolean">
  `false` 會停用技能，即使已隨附或安裝也一樣。`coding-agent` 隨附技能為選用 — 將其設為 `true` 並確保已安裝並驗證 `claude`、`codex`、`opencode` 或其他支援的 CLI。
</ParamField>

<ParamField path="skills.entries.<key>.apiKey" type='string | { source, provider, id }'>
  針對宣告 `metadata.openclaw.primaryEnv` 的技能提供的便利欄位。
  支援純文字字串或 SecretRef：`{ source: "env", provider: "default", id: "VAR_NAME" }`。
</ParamField>

<ParamField path="skills.entries.<key>.env" type="Record<string, string>">
  為代理執行注入的環境變數。僅在程序中尚未設定該變數時才會注入。
</ParamField>

<ParamField path="skills.entries.<key>.config" type="object">
  自訂各技能設定欄位的選用性物件袋。
</ParamField>

## Agent 允許列表 (`agents`)

當您希望使用相同的機器/工作區技能根目錄，但每個 Agent 有不同的可見技能集時，請使用 Agent 配置。

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"], // shared baseline
    },
    list: [
      { id: "writer" }, // inherits github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults entirely
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

<ParamField path="agents.defaults.skills" type="string[]">
  省略 `agents.list[].skills` 的 Agent 繼承的共享基準允許列表。 完全省略此項可讓技能預設不受限制。
</ParamField>

<ParamField path="agents.list[].skills" type="string[]">
  該 Agent 的明確最終技能集。明確列表會**取代**繼承的 預設值 —— 它們不會合併。設為 `[]` 可讓該 Agent 不顯示任何技能。
</ParamField>

## Workshop (`skills.workshop`)

<ParamField path="skills.workshop.autonomous.enabled" type="boolean" default="false">
  當設為 `true` 時，Agent 可以在成功執行後從持續的對話訊號中建立待處理提案。無論此設定為何，使用者提示建立的技能一律會透過 Skill Workshop 進行。
</ParamField>

<ParamField path="skills.workshop.approvalPolicy" type='"pending" | "auto"' default='"pending"'>
  `pending` 要求在 Agent 初始化的套用、拒絕或隔離之前獲得操作員批准。`auto` 允許在無需批准的情況下執行這些操作。
</ParamField>

<ParamField path="skills.workshop.maxPending" type="number" default="50">
  每個工作區保留的最大待處理和隔離提案數量。
</ParamField>

<ParamField path="skills.workshop.maxSkillBytes" type="number" default="40000">
  提案主體的大小上限（位元組）。由於提案描述會出現在探索和列表輸出中，因此其硬性上限為 160 位元組。
</ParamField>

## 符號連結的技能根目錄

根據預設，工作區、專案 Agent、額外目錄和捆綁的技能根目錄都是
隔離邊界。在 `<workspace>/skills` 下解析至根目錄外部的符號連結技能資料夾將會被跳過並記錄訊息。

若要允許有意安排的符號連結佈局，請宣告受信任的目標：

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

使用此配置，`<workspace>/skills/manager -> ~/Projects/manager/skills` 在
解析 realpath 後會被接受。`extraDirs` 會直接掃描同層級的 repo；
`allowSymlinkTargets` 則會為現有佈局保留符號連結路徑。

受管理的 `~/.openclaw/skills` 和個人的 `~/.agents/skills` 目錄
已接受技能目錄的符號連結（單一技能的 `SKILL.md` 限制
仍然適用）。

## 沙盒化技能與環境變數

<Warning>
  `skills.entries.<skill>.env` 和 `apiKey` 僅適用於 **主機** 執行。在
  沙盒內則無效 — 依賴 `GEMINI_API_KEY` 的技能
  將會因 `apiKey not configured` 而失敗，除非單獨
  將該變數提供給沙盒。
</Warning>

使用以下方式將祕密傳遞至 Docker 沙盒：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          env: { GEMINI_API_KEY: "your-key-here" },
        },
      },
    },
  },
}
```

<Note>具有 Docker 守護程序存取權限的使用者可以透過 Docker 元資料 檢視 `sandbox.docker.env` 值。若此暴露不可接受， 請使用掛載的秘密檔案、自訂映像檔或其他傳遞路徑。</Note>

## 載入順序提醒

```text
workspace/skills      (highest)
workspace/.agents/skills
~/.agents/skills
~/.openclaw/skills
bundled skills
skills.load.extraDirs (lowest)
```

當監看器啟用時，對技能和配置的變更會在下一個新工作階段生效，
或在監看器偵測到變更時的下一個 Agent 輪次生效。

## 相關連結

<CardGroup cols={2}>
  <Card title="Skills reference" href="/zh-Hant/tools/skills" icon="puzzle-piece">
    技能的定義、載入順序、閘控以及 SKILL.md 格式。
  </Card>
  <Card title="Creating skills" href="/zh-Hant/tools/creating-skills" icon="hammer">
    撰寫自訂工作區技能。
  </Card>
  <Card title="Skill Workshop" href="/zh-Hant/tools/skill-workshop" icon="flask">
    代理草擬技能的提案佇列。
  </Card>
  <Card title="Slash commands" href="/zh-Hant/tools/slash-commands" icon="terminal">
    原生斜線指令目錄與聊天指令。
  </Card>
</CardGroup>
