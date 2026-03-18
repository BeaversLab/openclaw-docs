---
summary: "OpenClaw 外掛程式/擴充功能：探索、設定與安全性"
read_when:
  - Adding or modifying plugins/extensions
  - Documenting plugin install or load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "外掛程式"
---

# 外掛程式 (擴充功能)

## 快速入門 (外掛程式新手？)

外掛程式可以是：

- 原生 **OpenClaw 外掛程式** (`openclaw.plugin.json` + runtime 模組)，或是
- 相容的 **套件組合** (`.codex-plugin/plugin.json` 或 `.claude-plugin/plugin.json`)

兩者都會顯示在 `openclaw plugins` 下，但只有原生 OpenClaw 外掛程式會在
程序內執行 runtime 程式碼。

大多數時候，當您想要一個尚未內建於核心 OpenClaw 的功能時
（或者您希望將可選功能從主要安裝中分離），您會使用外掛程式。

快速途徑：

1. 查看已載入的內容：

```bash
openclaw plugins list
```

2. 安裝官方外掛程式 (範例：Voice Call)：

```bash
openclaw plugins install @openclaw/voice-call
```

Npm 規格僅支援 **registry-only** (套件名稱 + 可選的 **確切版本** 或
**dist-tag**)。會拒絕 Git/URL/檔案規格和 semver 範圍。

裸規格 和 `@latest` 會保持在穩定版本。如果 npm 將
其中任何一個解析為預發布版本，OpenClaw 會停止並要求您使用預發布標籤
（例如 `@beta`/`@rc`）或
確切的預發布版本明確選擇加入。

3. 重新啟動 Gateway，然後在 `plugins.entries.<id>.config` 下進行設定。

請參閱 [Voice Call](/zh-Hant/plugins/voice-call) 以取得具體的外掛程式範例。
尋找第三方清單？請參閱 [社群外掛程式](/zh-Hant/plugins/community)。
需要套件組合相容性詳細資訊？請參閱 [外掛程式套件組合](/zh-Hant/plugins/bundles)。

對於相容的套件組合，請從本機目錄或封存安裝：

```bash
openclaw plugins install ./my-bundle
openclaw plugins install ./my-bundle.tgz
```

對於 Claude 市集安裝，請先列出市集，然後透過市集條目名稱安裝：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

OpenClaw 會從 `~/.claude/plugins/known_marketplaces.json` 解析已知的
Claude 市集名稱。您也可以使用 `--marketplace`
傳入明確的市集來源。

## 架構

OpenClaw 的外掛程式系統有四個層級：

1. **資訊清單 + 探索**
   OpenClaw 會從設定的路徑、工作區根目錄、
   全域擴充功能根目錄和配套擴充功能中尋找候選外掛程式。探索會
   先讀取原生 `openclaw.plugin.json` 資訊清單以及支援的套件組合資訊清單。
2. **啟用與驗證**
   核心會決定發現的外掛程式是已啟用、已停用、已封鎖，還是被選取用於記憶體等獨佔位置。
3. **執行時期載入**
   原生 OpenClaw 外掛程式會透過 jiti 在行程內載入，並將功能註冊到中央登錄檔。相容的套件會被正規化為登錄檔記錄，而不會匯入執行時期程式碼。
4. **表面消費**
   OpenClaw 的其餘部分會讀取登錄檔以公開工具、管道、提供者設定、掛鉤、HTTP 路由、CLI 指令和服務。

重要的設計邊界：

- 探索與設定驗證應該能夠透過 **資訊清單/架構中繼資料** 運作，
  而無需執行外掛程式碼
- 原生執行時期行為來自外掛程式模組的 `register(api)` 路徑

這種區分讓 OpenClaw 能夠在完整執行時期啟動之前驗證設定、說明遺失/已停用的外掛程式，並建立 UI/架構提示。

## 相容的套件

OpenClaw 也識別兩種相容的外部套件佈局：

- Codex 風格的套件：`.codex-plugin/plugin.json`
- Claude 風格的套件：`.claude-plugin/plugin.json` 或預設的 Claude
  元件佈局（不含資訊清單）
- Cursor 風格的套件：`.cursor-plugin/plugin.json`

Claude 市集項目可以指向這些相容套件中的任何一種，或是原生 OpenClaw 外掛程式來源。OpenClaw 會先解析市集項目，然後對解析出的來源執行正常的安裝路徑。

它們會在此外掛程式清單中顯示為 `format=bundle`，並在詳細資訊/資訊輸出中顯示子類型
`codex` 或 `claude`。

請參閱 [外掛程式套件](/zh-Hant/plugins/bundles) 以了解確切的偵測規則、對應行為和目前的支援矩陣。

目前，OpenClaw 將這些視為 **功能套件**，而非原生執行時期外掛程式：

- 目前已支援：已打包的 `skills`
- 目前已支援：Claude `commands/` markdown 根目錄，對應至標準
  OpenClaw 技能載入器
- 目前已支援：Claude 套件 `settings.json` 預設值，用於嵌入式 Pi 代理程式
  設定（並清理 shell 覆寫金鑰）
- 目前已支援：Cursor `.cursor/commands/*.md` 根目錄，對應至標準
  OpenClaw 技能載入器
- 目前支援：使用 OpenClaw hook-pack 版面配置的 Codex bundle hook 目錄（`HOOK.md` + `handler.ts`/`handler.js`）
- 已偵測但尚未連線：其他宣告的 bundle 功能，例如 agents、Claude hook automation、Cursor rules/hooks/MCP metadata、MCP/app/LSP metadata、output styles

這意味著 bundle 安裝/探索/列表/資訊/啟用均可運作，並且在啟用 bundle 時會載入 bundle skills、Claude command-skills、Claude bundle settings defaults 以及相容的 Codex hook 目錄，但 bundle 執行時程式碼不會在進程內執行。

Bundle hook 支援僅限於標準的 OpenClaw hook 目錄格式（在宣告的 hook 根目錄下的 `HOOK.md` 加上 `handler.ts`/`handler.js`）。供應商特定的 shell/JSON hook 執行環境，包括 Claude `hooks.json`，目前僅被偵測到，不會直接執行。

## 執行模型

原生 OpenClaw 外掛程式與 Gateway **在進程內**（in-process）一起執行。它們不受沙箱限制。已載入的原生外掛程式具有與核心程式碼相同的進程層級信任邊界。

影響：

- 原生外掛程式可以註冊工具、網路處理程式、hooks 和服務
- 原生外掛程式的錯誤可能導致 gateway 當機或不穩定
- 惡意的原生外掛程式相當於在 OpenClaw 進程內執行任意程式碼

相容的 bundle 預設情況下更安全，因為 OpenClaw 目前將它們視為中繼資料/內容套件。在目前的版本中，這主要是指捆綁的 skills。

對於非捆綁的外掛程式，請使用允許清單和明確的安裝/載入路徑。將工作區外掛程式視為開發時期的程式碼，而非生產環境預設值。

重要信任提示：

- `plugins.allow` 信任的是**外掛程式 ID**，而非來源出處。
- 當啟用或加入允許清單時，ID 與捆綁外掛程式相同的工作區外掛程式會刻意覆蓋該捆綁副本。
- 這是正常現象，且對於本機開發、修補程式測試和熱修復很有用。

## 可用的外掛程式（官方）

- 截至 2026.1.15，Microsoft Teams 僅支援外掛程式模式；如果您使用 Teams，請安裝 `@openclaw/msteams`。
- Memory (Core) — 捆綁的記憶體搜尋外掛程式（透過 `plugins.slots.memory` 預設啟用）
- Memory (LanceDB) — 捆綁的長期記憶體外掛程式（自動召回/捕獲；設定 `plugins.slots.memory = "memory-lancedb"`）
- [語音通話](/zh-Hant/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/zh-Hant/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/zh-Hant/channels/matrix) — `@openclaw/matrix`
- [Nostr](/zh-Hant/channels/nostr) — `@openclaw/nostr`
- [Zalo](/zh-Hant/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/zh-Hant/channels/msteams) — `@openclaw/msteams`
- Anthropic 提供者執行時 — 捆綁為 `anthropic`（預設啟用）
- BytePlus 提供者目錄 — 捆綁為 `byteplus`（預設啟用）
- Cloudflare AI Gateway 提供者目錄 — 捆綁為 `cloudflare-ai-gateway`（預設啟用）
- Google 網頁搜尋 + Gemini CLI OAuth — 捆綁為 `google`（網頁搜尋會自動載入；提供者驗證保持選用）
- GitHub Copilot 提供者執行時 — 捆綁為 `github-copilot`（預設啟用）
- Hugging Face 提供者目錄 — 捆綁為 `huggingface`（預設啟用）
- Kilo Gateway 提供者執行時 — 捆綁為 `kilocode`（預設啟用）
- Kimi Coding 提供者目錄 — 捆綁為 `kimi-coding`（預設啟用）
- MiniMax 提供者目錄 + 使用量 + OAuth — 捆綁為 `minimax`（預設啟用；擁有 `minimax` 和 `minimax-portal`）
- Mistral 提供者功能 — 捆綁為 `mistral`（預設啟用）
- Model Studio 提供者目錄 — 捆綁為 `modelstudio`（預設啟用）
- Moonshot 提供者執行時 — 捆綁為 `moonshot`（預設啟用）
- NVIDIA 提供者目錄 — 捆綁為 `nvidia`（預設啟用）
- OpenAI provider runtime — 打包為 `openai` (預設啟用；擁有 `openai` 和 `openai-codex`)
- OpenCode Go provider capabilities — 打包為 `opencode-go` (預設啟用)
- OpenCode Zen provider capabilities — 打包為 `opencode` (預設啟用)
- OpenRouter provider runtime — 打包為 `openrouter` (預設啟用)
- Qianfan provider catalog — 打包為 `qianfan` (預設啟用)
- Qwen OAuth (provider auth + catalog) — 打包為 `qwen-portal-auth` (預設啟用)
- Synthetic provider catalog — 打包為 `synthetic` (預設啟用)
- Together provider catalog — 打包為 `together` (預設啟用)
- Venice provider catalog — 打包為 `venice` (預設啟用)
- Vercel AI Gateway provider catalog — 打包為 `vercel-ai-gateway` (預設啟用)
- Volcengine provider catalog — 打包為 `volcengine` (預設啟用)
- Xiaomi provider catalog + usage — 打包為 `xiaomi` (預設啟用)
- Z.AI provider runtime — 打包為 `zai` (預設啟用)
- Copilot Proxy (provider auth) — 本地 VS Code Copilot Proxy 橋接；與內建的 `github-copilot` 裝置登入不同 (已打包，預設停用)

原生 OpenClaw 外掛是透過 jiti 在執行時載入的 **TypeScript 模組**。
**配置驗證不會執行外掛程式碼**；它改用外掛清單
和 JSON Schema。請參閱 [外掛清單](/zh-Hant/plugins/manifest)。

原生 OpenClaw 外掛可以註冊：

- Gateway RPC 方法
- Gateway HTTP 路由
- Agent 工具
- CLI 指令
- 背景服務
- Context 引擎
- 提供者驗證流程和模型目錄
- 提供者執行時 Hook，用於動態模型 ID、傳輸正規化、功能中繼資料、串流包裝、快取 TTL 原則、缺少驗證提示、內建模型抑制、目錄擴充、執行時驗證交換，以及使用/計費驗證 + 快照解析
- 選用配置驗證
- **Skills**（透過在 plugin manifest 中列出 `skills` 目錄）
- **Auto-reply commands**（執行時無需呼叫 AI agent）

原生 OpenClaw 外掛程式與 Gateway **在相同程序中 (in‑process)** 執行，因此請將其視為受信任的程式碼。
工具撰寫指南：[Plugin agent tools](/zh-Hant/plugins/agent-tools)。

## Provider runtime hooks

Provider 外掛程式現在有兩層：

- manifest metadata：`providerAuthEnvVars` 用於在執行時期載入之前進行低成本的環境授權查找，加上 `providerAuthChoices` 用於在執行時期載入之前進行低成本的上手/授權選擇標籤和 CLI 標誌元資料
- config-time hooks：`catalog` / 舊版 `discovery`
- runtime hooks：`resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw 仍然擁有通用 agent 迴圈、故障轉移、逐字稿處理和工具原則。這些 hooks 是特定 Provider 行為的縫合點，無需完整的自訂推論傳輸。

當 Provider 具有基於環境的憑證時，請使用 manifest `providerAuthEnvVars`，以便通用授權/狀態/模型選擇路徑在無需載入外掛程式執行時期的情況下看到它們。當上手/授權選擇 CLI 介面應該知道 Provider 的選擇 ID、群組標籤和簡單的單一標誌授權接線而無需載入 provider 執行時期時，請使用 manifest `providerAuthChoices`。請保留 provider 執行時期 `envVars` 用於操作員面向的提示，例如上手標籤或 OAuth client-id/client-secret 設定變數。

### Hook 順序

對於模型/Provider 外掛程式，OpenClaw 大致按照以下順序使用 hooks：

1. `catalog`
   在 `models.json` 生成期間將提供者配置發布到 `models.providers` 中。
2. 內建/已探索的模型查找
   OpenClaw 首先嘗試正常的註冊表/目錄路徑。
3. `resolveDynamicModel`
   針對尚不在本地註冊表中的提供者自有模型 ID 的同步後援。
4. `prepareDynamicModel`
   僅在非同步模型解析路徑上進行非同步預熱，然後
   `resolveDynamicModel` 會再次運作。
5. `normalizeResolvedModel`
   在內嵌執行器使用解析出的模型之前進行的最終重寫。
6. `capabilities`
   共享核心邏輯使用的提供者自有轉錄/工具元資料。
7. `prepareExtraParams`
   在通用串流選項包裝器之前的提供者自有請求參數正規化。
8. `wrapStreamFn`
   在套用通用包裝器之後的提供者自有串流包裝器。
9. `formatApiKey`
   當儲存的驗證設定檔需要變成執行階段 `apiKey` 字串時所使用的提供者自有驗證設定檔格式器。
10. `refreshOAuth`
    用於自訂重新整理端點或重新整理失敗政策的提供者自有 OAuth 重新整理覆寫。
11. `buildAuthDoctorHint`
    當 OAuth 重新整理失敗時附加的提供者自有修復提示。
12. `isCacheTtlEligible`
    針對代理/回程提供者的提供者自有提示快取政策。
13. `buildMissingAuthMessage`
    用來取代通用缺少驗證恢復訊息的提供者自有替代方案。
14. `suppressBuiltInModel`
    提供者自有過時上游模型抑制，加上可選的使用者面向錯誤提示。
15. `augmentModelCatalog`
    在探索之後附加的提供者自有合成/最終目錄列。
16. `isBinaryThinking`
    針對二元思考提供者的提供者自有推理開關。
17. `supportsXHighThinking`
    針對所選模型的提供者自有 `xhigh` 推理支援。
18. `resolveDefaultThinkingLevel`
    特定模型系列的提供者自有預設 `/think` 等級。
19. `isModernModelRef`
    供應商擁有的新型模型匹配器，由即時設定檔過濾器和煙霧選擇使用。
20. `prepareRuntimeAuth`
    在推斷之前，將設定的憑證交換為實際的執行時段 token/金鑰。
21. `resolveUsageAuth`
    解析 `/usage` 和相關狀態表面的使用量/計費憑證。
22. `fetchUsageSnapshot`
    在解析驗證後，取得並標準化供應商特定的使用量/配額快照。

### 使用哪個 Hook

- `catalog`: 將供應商設定和模型目錄發佈到 `models.providers`
- `resolveDynamicModel`: 處理尚未在本機註冊表中的透傳或向前相容模型 ID
- `prepareDynamicModel`: 在重試動態解析之前的非同步預熱（例如重新整理供應商元資料快取）
- `normalizeResolvedModel`: 在推斷之前重寫已解析模型的傳輸/基礎 URL/相容性
- `capabilities`: 發佈供應商系列和轉錄/工具特性，而無需在核心中硬編碼供應商 ID
- `prepareExtraParams`: 在通用串流包裝之前設定供應商預設值或標準化供應商特定的每模型參數
- `wrapStreamFn`: 新增供應商特定的標頭/內容/模型相容性修補，同時仍使用正常的 `pi-ai` 執行路徑
- `formatApiKey`: 將儲存的驗證設定檔轉換為執行時段 `apiKey` 字串，而無需在核心中硬編碼供應商 token blob
- `refreshOAuth`: 擁有不符合共用 `pi-ai` 更新器的供應商的 OAuth 更新
- `buildAuthDoctorHint`: 當更新失敗時附加供應商擁有的驗證修復指引
- `isCacheTtlEligible`: 決定供應商/模型配對是否應使用快取 TTL 元資料
- `buildMissingAuthMessage`: 將通用驗證儲存區錯誤替換為供應商特定的恢復提示
- `suppressBuiltInModel`: 隱藏過時的上游行，並可選地返回供應商擁有的錯誤，用於直接解析失敗
- `augmentModelCatalog`：在探索和配置合併後附加合成/最終目錄行
- `isBinaryThinking`：顯示二進位開/關推理 UX，而無需在 `/think` 中硬編碼提供商 ID
- `supportsXHighThinking`：選擇特定模型加入 `xhigh` 推理層級
- `resolveDefaultThinkingLevel`：將提供商/模型預設推理策略排除在核心之外
- `isModernModelRef`：將即時/冒煙模型系列包含規則保留給提供商
- `prepareRuntimeAuth`：將設定的憑證交換為用於請求的實際短期執行時期 Token/金鑰
- `resolveUsageAuth`：解析用量/計費端點的提供商自有憑證，而無需在核心中硬編碼 Token 解析
- `fetchUsageSnapshot`：擁有提供商特定的用量端點獲取/解析，同時核心保留摘要扇出和格式設定

經驗法則：

- 提供商擁有目錄或基底 URL 預設值：使用 `catalog`
- 提供商接受任意上游模型 ID：使用 `resolveDynamicModel`
- 提供商在解析未知 ID 之前需要網路元資料：新增 `prepareDynamicModel`
- 提供商需要傳輸重寫但仍然使用核心傳輸：使用 `normalizeResolvedModel`
- 提供商需要文字記錄/提供商系列怪癖：使用 `capabilities`
- 提供商需要預設請求參數或每個提供商參數清理：使用 `prepareExtraParams`
- 提供商需要請求標頭/主體/模型相容性包裝器，而不需要自訂傳輸：使用 `wrapStreamFn`
- 提供商在設定檔中儲存額外元資料，並需要自訂執行時期 Token 形狀：使用 `formatApiKey`
- 提供商需要自訂 OAuth 重新整理端點或重新整理失敗政策：使用 `refreshOAuth`
- 提供商在重新整理失敗後需要提供商自有修復指引：使用 `buildAuthDoctorHint`
- 提供商需要特定於代理的快取 TTL 閘控：使用 `isCacheTtlEligible`
- 提供商需要特定於提供商的遺失驗證恢復提示：使用 `buildMissingAuthMessage`
- 提供者需要隱藏陳舊的上游行或將其替換為廠商提示：使用 `suppressBuiltInModel`
- 提供者需要在 `models list` 和選擇器中使用合成向前相容行：使用 `augmentModelCatalog`
- 提供者僅公開二進位思維開/關：使用 `isBinaryThinking`
- 提供者僅希望在部分模型上使用 `xhigh`：使用 `supportsXHighThinking`
- 提供者擁有模型系列的預設 `/think` 策略：使用 `resolveDefaultThinkingLevel`
- 提供者擁有即時/冒煙測試的首選模型匹配：使用 `isModernModelRef`
- 提供者需要權杖交換或短期請求憑證：使用 `prepareRuntimeAuth`
- 提供者需要自訂使用量/配額權杖解析或不同的使用量憑證：使用 `resolveUsageAuth`
- 提供者需要特定於提供者的使用量端點或承載解析器：使用 `fetchUsageSnapshot`

如果提供者需要完全自訂的通訊協定或自訂請求執行器，
那是另一類的擴充功能。這些掛鉤是用於仍然在 OpenClaw 正常推斷迴圈上
執行的提供者行為。

### 提供者範例

```ts
api.registerProvider({
  id: "example-proxy",
  label: "Example Proxy",
  auth: [],
  catalog: {
    order: "simple",
    run: async (ctx) => {
      const apiKey = ctx.resolveProviderApiKey("example-proxy").apiKey;
      if (!apiKey) {
        return null;
      }
      return {
        provider: {
          baseUrl: "https://proxy.example.com/v1",
          apiKey,
          api: "openai-completions",
          models: [{ id: "auto", name: "Auto" }],
        },
      };
    },
  },
  resolveDynamicModel: (ctx) => ({
    id: ctx.modelId,
    name: ctx.modelId,
    provider: "example-proxy",
    api: "openai-completions",
    baseUrl: "https://proxy.example.com/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  }),
  prepareRuntimeAuth: async (ctx) => {
    const exchanged = await exchangeToken(ctx.apiKey);
    return {
      apiKey: exchanged.token,
      baseUrl: exchanged.baseUrl,
      expiresAt: exchanged.expiresAt,
    };
  },
  resolveUsageAuth: async (ctx) => {
    const auth = await ctx.resolveOAuthToken();
    return auth ? { token: auth.token } : null;
  },
  fetchUsageSnapshot: async (ctx) => {
    return await fetchExampleProxyUsage(ctx.token, ctx.timeoutMs, ctx.fetchFn);
  },
});
```

### 內建範例

- Anthropic 使用 `resolveDynamicModel`、`capabilities`、`buildAuthDoctorHint`、
  `resolveUsageAuth`、`fetchUsageSnapshot`、`isCacheTtlEligible`、
  `resolveDefaultThinkingLevel` 和 `isModernModelRef`，因為它擁有 Claude
  4.6 向前相容性、提供者系列提示、修復驗證指導、使用量
  端點整合、提示快取資格，以及 Claude 預設/自適應
  思維策略。
- OpenAI 使用 `resolveDynamicModel`、`normalizeResolvedModel` 和
  `capabilities` 加上 `buildMissingAuthMessage`、`suppressBuiltInModel`、
  `augmentModelCatalog`、`supportsXHighThinking` 和 `isModernModelRef`
  因為它擁有 GPT-5.4 向前相容性、直接的 OpenAI
  `openai-completions` -> `openai-responses` 標準化、Codex 感知身份驗證
  提示、Spark 抑制、合成 OpenAI 列表行，以及 GPT-5 思維 /
  即時模型策略。
- OpenRouter 使用 `catalog` 加上 `resolveDynamicModel` 和
  `prepareDynamicModel` 因為該供應商是直通的，且可能在 OpenClaw 的靜態目錄更新之前
  公開新的模型 ID。
- GitHub Copilot 使用 `catalog`、`auth`、`resolveDynamicModel` 和
  `capabilities` 加上 `prepareRuntimeAuth` 和 `fetchUsageSnapshot` 因為它
  需要供應商擁有的裝置登入、模型後援行為、Claude 逐字稿
  怪癖、GitHub token -> Copilot token 交換，以及供應商擁有的用量
  端點。
- OpenAI Codex 使用 `catalog`、`resolveDynamicModel`、
  `normalizeResolvedModel`、`refreshOAuth` 和 `augmentModelCatalog` 加上
  `prepareExtraParams`、`resolveUsageAuth` 和 `fetchUsageSnapshot` 因為它
  仍在核心 OpenAI 傳輸上運行，但擁有其傳輸/基底 URL
  標準化、OAuth 重新整理後援策略、預設傳輸選擇、
  合成 Codex 目錄行，以及 ChatGPT 用量端點整合。
- Google AI Studio 和 Gemini CLI OAuth 使用 `resolveDynamicModel` 和
  `isModernModelRef` 因為它們擁有 Gemini 3.1 向前相容性後援和
  現代模型匹配；Gemini CLI OAuth 也使用 `formatApiKey`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot` 進行 token 格式化、token
  解析和配額端點連線。
- OpenRouter 使用 `capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible`
  來保持供應商特定的請求標頭、路由元數據、推理補丁和
  提示詞緩存策略不進入核心。
- Moonshot 使用 `catalog` 加上 `wrapStreamFn`，因為它仍然使用共享的
  OpenAI 傳輸，但需要供應商擁有的思考負載正規化。
- Kilocode 使用 `catalog`、`capabilities`、`wrapStreamFn` 和
  `isCacheTtlEligible`，因為它需要供應商擁有的請求標頭、
  推理負載正規化、Gemini 腳本提示和 Anthropic
  緩存 TTL 閘控。
- Z.AI 使用 `resolveDynamicModel`、`prepareExtraParams`、`wrapStreamFn`、
  `isCacheTtlEligible`、`isBinaryThinking`、`isModernModelRef`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot`，因為它擁有 GLM-5 回退、
  `tool_stream` 預設值、二進制思考 UX、現代模型匹配，以及
  使用量身份驗證和配額獲取。
- Mistral、OpenCode Zen 和 OpenCode Go 僅使用 `capabilities` 來保持
  腳本/工具怪癖不進入核心。
- 僅目錄打包的供應商（例如 `byteplus`、`cloudflare-ai-gateway`、
  `huggingface`、`kimi-coding`、`modelstudio`、`nvidia`、`qianfan`、
  `synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine`）僅使用
  `catalog`。
- Qwen 入口網站使用 `catalog`、`auth` 和 `refreshOAuth`。
- MiniMax 和 Xiaomi 使用 `catalog` 加上使用量掛鉤，因為它們的 `/usage`
  行為由外掛程式擁有，即使推論仍然透過共享
  傳輸運行。

## 載入管線

啟動時，OpenClaw 大致執行以下操作：

1. 探索候選外掛根目錄
2. 讀取原生或相容的綑綁清單和套件元資料
3. 拒絕不安全的候選項
4. 正規化外掛設定 (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. 決定每個候選項是否啟用
6. 透過 jiti 載入啟用的原生模組
7. 呼叫原生 `register(api)` hooks 並將註冊資訊收集到外掛註冊表中
8. 將註冊表公開給指令/執行時介面

安全檢查機制發生在**執行時執行之前**。當進入點超出外掛根目錄、路徑為任何人可寫入，或非綑綁外掛的路徑所有權看起來可疑時，候選項會被封鎖。

### 優先使用資訊清單的行為

資訊清單是控制層面的單一真實來源。OpenClaw 使用它來：

- 識別外掛
- 探索已宣告的通道/技能/設定架構或綑綁功能
- 驗證 `plugins.entries.<id>.config`
- 增強控制 UI 標籤/佔位符
- 顯示安裝/目錄元資料

對於原生外掛，執行時模組是資料層面的部分。它註冊實際行為，例如 hooks、工具、指令或提供者流程。

### 載入器快取的內容

OpenClaw 會為以下內容保留短暫的進程內快取：

- 探索結果
- 資訊清單註冊表資料
- 已載入的外掛註冊表

這些快取減少了突發啟動和重複指令的開銷。將它們視為短效能快取而非持久化儲存是安全的。

## 執行時輔助函式

外掛可以透過 `api.runtime` 存取選定的核心輔助函式。對於電話語音 TTS：

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});
```

注意事項：

- 使用核心 `messages.tts` 設定 (OpenAI 或 ElevenLabs)。
- 傳回 PCM 音訊緩衝區 + 取樣率。外掛必須為提供者進行重新取樣/編碼。
- 電話語音不支援 Edge TTS。

對於 STT/轉錄，外掛可以呼叫：

```ts
const { text } = await api.runtime.stt.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

注意事項：

- 使用核心媒體理解音訊設定 (`tools.media.audio`) 和提供者回退順序。
- 當未產生轉錄輸出時（例如跳過/不支援的輸入），傳回 `{ text: undefined }`。

## Gateway HTTP 路由

外掛可以使用 `api.registerHttpRoute(...)` 公開 HTTP 端點。

```ts
api.registerHttpRoute({
  path: "/acme/webhook",
  auth: "plugin",
  match: "exact",
  handler: async (_req, res) => {
    res.statusCode = 200;
    res.end("ok");
    return true;
  },
});
```

路由欄位：

- `path`：閘道 HTTP 伺服器下的路由路徑。
- `auth`：必要。使用 `"gateway"` 來要求標準的閘道驗證，或使用 `"plugin"` 進行外掛程式管理的驗證/Webhook 驗證。
- `match`：選用。`"exact"`（預設）或 `"prefix"`。
- `replaceExisting`：選用。允許同一個外掛程式取代其既有的路由註冊。
- `handler`：當路由處理了請求時，回傳 `true`。

備註：

- `api.registerHttpHandler(...)` 已過時。請使用 `api.registerHttpRoute(...)`。
- 外掛程式路由必須明確宣告 `auth`。
- 完全相同的 `path + match` 衝突會被拒絕，除非設定了 `replaceExisting: true`，且一個外掛程式無法取代另一個外掛程式的路由。
- 具有不同 `auth` 層級的重疊路由會被拒絕。請將 `exact`/`prefix` 透傳鏈保持僅在同一個驗證層級上。

## 外掛程式 SDK 匯入路徑

在編寫外掛程式時，使用 SDK 子路徑而不是單體式的 `openclaw/plugin-sdk` 匯入：

- `openclaw/plugin-sdk/core` 用於通用外掛程式 API、提供者驗證類型，以及共享輔助程式，例如路由/Session 工具和記錄器支援的執行環境。
- `openclaw/plugin-sdk/compat` 用於需要比 `core` 更廣泛的共享執行環境輔助程式的打包/內部外掛程式碼。
- `openclaw/plugin-sdk/telegram` 用於 Telegram 頻道外掛程式類型和共享的面向頻道的輔助程式。內建 Telegram 實作內部細節仍屬於打包擴充功能的私有部分。
- `openclaw/plugin-sdk/discord` 用於 Discord 頻道外掛程式類型和共享的面向頻道的輔助程式。內建 Discord 實作內部細節仍屬於打包擴充功能的私有部分。
- `openclaw/plugin-sdk/slack` 用於 Slack 頻道外掛程式類型和共享的面向頻道的輔助程式。內建 Slack 實作內部細節仍屬於打包擴充功能的私有部分。
- `openclaw/plugin-sdk/signal` 用於 Signal 通道外掛程式類型和共用的通道導向輔助程式。內建的 Signal 實作內部細節對於打包的擴充功能保持私密。
- `openclaw/plugin-sdk/imessage` 用於 iMessage 通道外掛程式類型和共用的通道導向輔助程式。內建的 iMessage 實作內部細節對於打包的擴充功能保持私密。
- `openclaw/plugin-sdk/whatsapp` 用於 WhatsApp 通道外掛程式類型和共用的通道導向輔助程式。內建的 WhatsApp 實作內部細節對於打包的擴充功能保持私密。
- `openclaw/plugin-sdk/line` 用於 LINE 通道外掛程式。
- `openclaw/plugin-sdk/msteams` 用於打包的 Microsoft Teams 外掛程式介面。
- 也可以使用擴充功能專屬的打包子路徑：
  `openclaw/plugin-sdk/acpx`, `openclaw/plugin-sdk/bluebubbles`,
  `openclaw/plugin-sdk/copilot-proxy`, `openclaw/plugin-sdk/device-pair`,
  `openclaw/plugin-sdk/diagnostics-otel`, `openclaw/plugin-sdk/diffs`,
  `openclaw/plugin-sdk/feishu`, `openclaw/plugin-sdk/googlechat`,
  `openclaw/plugin-sdk/irc`, `openclaw/plugin-sdk/llm-task`,
  `openclaw/plugin-sdk/lobster`, `openclaw/plugin-sdk/matrix`,
  `openclaw/plugin-sdk/mattermost`, `openclaw/plugin-sdk/memory-core`,
  `openclaw/plugin-sdk/memory-lancedb`,
  `openclaw/plugin-sdk/minimax-portal-auth`,
  `openclaw/plugin-sdk/nextcloud-talk`, `openclaw/plugin-sdk/nostr`,
  `openclaw/plugin-sdk/open-prose`, `openclaw/plugin-sdk/phone-control`,
  `openclaw/plugin-sdk/qwen-portal-auth`, `openclaw/plugin-sdk/synology-chat`,
  `openclaw/plugin-sdk/talk-voice`, `openclaw/plugin-sdk/test-utils`,
  `openclaw/plugin-sdk/thread-ownership`, `openclaw/plugin-sdk/tlon`,
  `openclaw/plugin-sdk/twitch`, `openclaw/plugin-sdk/voice-call`,
  `openclaw/plugin-sdk/zalo`, 和 `openclaw/plugin-sdk/zalouser`。

## 提供者目錄

提供者外掛程式可以定義模型目錄，用於透過
`registerProvider({ catalog: { run(...) { ... } } })` 進行推論。

`catalog.run(...)` 會傳回與 OpenClaw 寫入
`models.providers` 相同的結構：

- `{ provider }` 用於單一提供者項目
- `{ providers }` 用於多個提供者項目

當外掛程式擁有提供者特定的模型 ID、預設基底 URL 或受驗證閘道的模型元資料時，請使用 `catalog`。

`catalog.order` 控制外掛程式的目錄相對於 OpenClaw 內建隱含提供者的合併時機：

- `simple`：純 API 金鑰或環境變數驅動的提供者
- `profile`：當存在驗證設定檔時顯示的提供者
- `paired`：綜合多個相關提供者項目的提供者
- `late`：最後一輪，在其他隱含提供者之後

後續的提供者在金鑰衝突時獲勝，因此外掛程式可以使用相同的提供者 ID 有意地覆寫內建的提供者項目。

相容性：

- `discovery` 仍可作為舊版別名使用
- 如果同時註冊了 `catalog` 和 `discovery`，OpenClaw 將使用 `catalog`

相容性備註：

- `openclaw/plugin-sdk` 仍受現有外部外掛程式支援。
- 新新增和已遷移的套件外掛程式應使用通道或擴充功能特定的子路徑；對於一般介面請使用 `core`，僅當需要更廣泛的共用輔助程式時才使用 `compat`。

## 唯讀通道檢查

如果您的外掛程式註冊了一個通道，建議在實作 `resolveAccount(...)` 的同時也實作 `plugin.config.inspectAccount(cfg, accountId)`。

原因：

- `resolveAccount(...)` 是執行時期路徑。它可以假設憑證已完全具體化，並且在缺少所需的密碼時能快速失敗。
- 諸如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve` 等唯讀指令路徑，以及 doctor/config 修復流程，不應僅為了描述設定就需要具體化執行時期憑證。

建議的 `inspectAccount(...)` 行為：

- 僅傳回描述性的帳戶狀態。
- 保留 `enabled` 和 `configured`。
- 在相關時包含憑證來源/狀態欄位，例如：
  - `tokenSource`、`tokenStatus`
  - `botTokenSource`、`botTokenStatus`
  - `appTokenSource`、`appTokenStatus`
  - `signingSecretSource`、`signingSecretStatus`
- 若僅為報告唯讀可用性，您不需要回傳原始 token 值。回傳 `tokenStatus: "available"`（以及匹配的 source 欄位）對於狀態類指令已足夠。
- 當憑證透過 SecretRef 配置但在當前指令路徑中不可用時，請使用 `configured_unavailable`。

這讓唯讀指令能夠回報「已配置但在該指令路徑中不可用」，而不是崩潰或錯誤地將帳號回報為未配置。

效能備註：

- 外掛探索與清單元資料使用短暫的進程內快取，以減少突發的啟動/重新載入工作。
- 設定 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 以停用這些快取。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 來調整快取時間視窗。

## 探索與優先順序

OpenClaw 依序掃描：

1. 設定路徑

- `plugins.load.paths`（檔案或目錄）

2. 工作區擴充功能

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. 全域擴充功能

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. 內建擴充功能（隨 OpenClaw 附帶；混合了預設啟用/預設停用）

- `<openclaw>/extensions/*`

許多內建的提供者外掛預設為啟用，以便模型目錄/執行時期鉤子無需額外設定即可使用。其他則仍需透過 `plugins.entries.<id>.enabled` 或
`openclaw plugins enable <id>` 明確啟用。

預設啟用的內建外掛範例：

- `byteplus`
- `cloudflare-ai-gateway`
- `device-pair`
- `github-copilot`
- `huggingface`
- `kilocode`
- `kimi-coding`
- `minimax`
- `minimax`
- `modelstudio`
- `moonshot`
- `nvidia`
- `ollama`
- `openai`
- `openrouter`
- `phone-control`
- `qianfan`
- `qwen-portal-auth`
- `sglang`
- `synthetic`
- `talk-voice`
- `together`
- `venice`
- `vercel-ai-gateway`
- `vllm`
- `volcengine`
- `xiaomi`
- active memory slot plugin (預設插槽: `memory-core`)

已安裝的外掛程式預設為啟用狀態，但也可以用相同的方式停用。

工作區外掛程式**預設為停用**，除非您明確啟用它們或將其加入允許清單。這是故意的設計：簽出的儲存庫不應靜默變成生產閘道程式碼。

加固備註：

- 如果 `plugins.allow` 為空且可探索到非綑綁的外掛程式，OpenClaw 會記錄包含外掛程式 ID 和來源的啟動警告。
- 候選路徑在探索准入前會經過安全性檢查。當發生以下情況時，OpenClaw 會封鎖候選路徑：
  - 擴充功能入口解析至外掛程式根目錄之外（包括符號連結/路徑遍歷逃逸），
  - 外掛程式根目錄/來源路徑可被全域寫入，
  - 對於非綑綁的外掛程式，路徑擁有權可疑（POSIX 擁有者既不是目前的 uid 也不是 root）。
- 載入沒有安裝/載入路徑來源證明的非綑綁外掛程式會發出警告，以便您固定信任 (`plugins.allow`) 或安裝追蹤 (`plugins.installs`)。

每個原生 OpenClaw 外掛程式都必須在其根目錄中包含 `openclaw.plugin.json` 檔案。如果路徑指向檔案，外掛程式根目錄即為該檔案的目錄，且必須包含清單。

相容的套件可以改為提供以下之一：

- `.codex-plugin/plugin.json`
- `.claude-plugin/plugin.json`

套件目錄是從與原生外掛程式相同的根目錄探索的。

如果多個外掛程式解析到同一個 ID，則上述順序中的第一個符合項獲勝，並忽略優先順序較低的副本。

這意味著：

- 工作區外掛程式會刻意覆蓋具有相同 ID 的綑綁外掛程式
- `plugins.allow: ["foo"]` 授權使用中的 `foo` 外掛程式 ID，即使使用中的副本來自工作區而非綑綁的擴充功能根目錄
- 如果您需要更嚴格的來源控制，請使用明確的安裝/載入路徑，並
  在啟用外掛程式之前檢查已解析的外掛程式來源

### 啟用規則

啟用是在發現之後解析的：

- `plugins.enabled: false` 會停用所有外掛程式
- `plugins.deny` 總是優先
- `plugins.entries.<id>.enabled: false` 會停用該外掛程式
- 來源為工作區的外掛程式預設為停用
- 當 `plugins.allow` 非空時，允許清單會限制作用中的集合
- 允許清單是基於 **ID** 的，而不是基於來源
- 隨附的外掛程式預設為停用，除非：
  - 該隨附 ID 位於內建的預設啟用集合中，或
  - 您明確啟用它，或
  - 通道組態隱含地啟用隨附的通道外掛程式
- 獨佔插槽可以強制啟用為該插槽選擇的外掛程式

在目前的 核心 中，隨附的預設啟用 ID 包含上述的 local/provider 輔助程式
加上作用中的記憶體插槽外掛程式。

### 套件包

外掛程式目錄可能包含帶有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每個條目都會變成一個外掛程式。如果套件包列出多個擴充功能，外掛程式 ID
會變成 `name/<fileBase>`。

如果您的外掛程式匯入 npm 相依項，請將其安裝在該目錄中，以便
`node_modules` 可用 (`npm install` / `pnpm install`)。

安全防護：每個 `openclaw.extensions` 條目在解析符號連結後必須保留在外掛程式
目錄內。脫離套件目錄的條目會被拒絕。

安全注意事項：`openclaw plugins install` 會使用 `npm install --ignore-scripts` 安裝外掛程式相依項
(無生命週期指令碼)。請保持外掛程式相依項樹為「純 JS/TS」，並避免需要
`postinstall` 建置的套件。

選用項：`openclaw.setupEntry` 可以指向一個輕量級的僅設定模組。
當 OpenClaw 需要已停用通道外掛程式的設定介面，或
當通道外掛程式已啟用但尚未設定時，它會載入 `setupEntry`
而不是完整的外掛程式進入點。這能讓啟動和設定保持輕量，
當您的主要外掛程式進入點也連接了工具、掛鉤或其他僅限執行時期的
程式碼時。

選用：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
can opt a channel plugin into the same `setupEntry` path during the gateway's
pre-listen startup phase, even when the channel is already configured.

Use this only when `setupEntry` fully covers the startup surface that must exist
before the gateway starts listening. In practice, that means the setup entry
must register every channel-owned capability that startup depends on, such as:

- channel registration itself
- any HTTP routes that must be available before the gateway starts listening
- any gateway methods, tools, or services that must exist during that same window

If your full entry still owns any required startup capability, do not enable
this flag. Keep the plugin on the default behavior and let OpenClaw load the
full entry during startup.

Example:

```json
{
  "name": "@scope/my-channel",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

### Channel catalog metadata

Channel plugins can advertise setup/discovery metadata via `openclaw.channel` and
install hints via `openclaw.install`. This keeps the core catalog data-free.

Example:

```json
{
  "name": "@openclaw/nextcloud-talk",
  "openclaw": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk (self-hosted)",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "Self-hosted chat via Nextcloud Talk webhook bots.",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@openclaw/nextcloud-talk",
      "localPath": "extensions/nextcloud-talk",
      "defaultChoice": "npm"
    }
  }
}
```

OpenClaw can also merge **external channel catalogs** (for example, an MPM
registry export). Drop a JSON file at one of:

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

Or point `OPENCLAW_PLUGIN_CATALOG_PATHS` (or `OPENCLAW_MPM_CATALOG_PATHS`) at
one or more JSON files (comma/semicolon/`PATH`-delimited). Each file should
contain `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`.

## Plugin IDs

Default plugin ids:

- Package packs: `package.json` `name`
- Standalone file: file base name (`~/.../voice-call.ts` → `voice-call`)

If a plugin exports `id`, OpenClaw uses it but warns when it doesn’t match the
configured id.

## Registry model

Loaded plugins do not directly mutate random core globals. They register into a
central plugin registry.

The registry tracks:

- plugin records (identity, source, origin, status, diagnostics)
- tools
- legacy hooks and typed hooks
- channels
- providers
- gateway RPC handlers
- HTTP routes
- CLI registrars
- background services
- plugin-owned commands

核心功能隨後從該註冊表讀取，而不是直接與插件模組對話。這使得載入過程保持單向：

- 插件模組 -> 註冊表註冊
- 核心執行時 -> 註冊表消費

這種分離對可維護性至關重要。這意味著大多數核心表面只需要一個整合點：「讀取註冊表」，而不是「對每個插件模組進行特殊處理」。

## 配置

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-extension"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

欄位：

- `enabled`：主開關（預設：true）
- `allow`：允許清單（可選）
- `deny`：拒絕清單（可選；拒絕優先）
- `load.paths`：額外的插件檔案/目錄
- `slots`：獨佔插槽選擇器，例如 `memory` 和 `contextEngine`
- `entries.<id>`：各插件的開關 + 配置

配置變更**需要重新啟動閘道**。

驗證規則（嚴格）：

- 在 `entries`、`allow`、`deny` 或 `slots` 中的未知插件 ID 是**錯誤**。
- 未知的 `channels.<id>` 鍵是**錯誤**，除非插件清單宣告了通道 ID。
- 原生插件配置是使用嵌入在 `openclaw.plugin.json` (`configSchema`) 中的 JSON Schema 進行驗證的。
- 相容套件目前不會公開原生的 OpenClaw 配置架構。
- 如果插件被停用，其配置會被保留，並且會發出**警告**。

### 已停用 vs 缺失 vs 無效

這些狀態是有意區分的：

- **已停用**：插件存在，但啟用規則將其關閉
- **缺失**：配置引用了一個探索未找到的插件 ID
- **無效**：插件存在，但其配置不符合宣告的架構

OpenClaw 會保留已停用插件的配置，因此重新啟用它們不會造成資料毀損。

## 插件插槽（獨佔類別）

某些插件類別是**獨佔的**（一次只能啟用一個）。使用 `plugins.slots` 來選擇哪個插件擁有該插槽：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
      contextEngine: "legacy", // or a plugin id such as "lossless-claw"
    },
  },
}
```

支援的獨佔插槽：

- `memory`：主動記憶插件（`"none"` 會停用記憶插件）
- `contextEngine`：作用中的上下文引擎外掛（`"legacy"` 是內建的預設值）

如果多個外掛宣告 `kind: "memory"` 或 `kind: "context-engine"`，只有
該插槽選定的外掛會載入。其他外掛會被停用並顯示診斷資訊。

### Context engine 外掛

Context engine 外掛擁有用於擷取、組裝和壓縮的 session 上下文編排功能。從您的外掛中使用
`api.registerContextEngine(id, factory)` 註冊它們，然後使用
`plugins.slots.contextEngine` 選擇作用中的引擎。

當您的外掛需要取代或擴充預設的上下文管線，而不僅僅是新增記憶體搜尋或 hooks 時，請使用此功能。

## 控制 UI (schema + labels)

控制 UI 使用 `config.schema` (JSON Schema + `uiHints`) 來呈現更好的表單。

OpenClaw 會根據探索到的外掛在執行時期擴充 `uiHints`：

- 為 `plugins.entries.<id>` / `.enabled` / `.config` 新增各外掛的標籤
- 在以下路徑合併選用的外掛提供的設定欄位提示：
  `plugins.entries.<id>.config.<field>`

如果您希望您的外掛設定欄位顯示良好的標籤/預留位置（並將機密標記為敏感），
請在外掛清單中隨附您的 JSON Schema 提供 `uiHints`。

範例：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": { "type": "string" },
      "region": { "type": "string" }
    }
  },
  "uiHints": {
    "apiKey": { "label": "API Key", "sensitive": true },
    "region": { "label": "Region", "placeholder": "us-east-1" }
  }
}
```

## CLI

```bash
openclaw plugins list
openclaw plugins info <id>
openclaw plugins install <path>                 # copy a local file/dir into ~/.openclaw/extensions/<id>
openclaw plugins install ./extensions/voice-call # relative path ok
openclaw plugins install ./plugin.tgz           # install from a local tarball
openclaw plugins install ./plugin.zip           # install from a local zip
openclaw plugins install -l ./extensions/voice-call # link (no copy) for dev
openclaw plugins install @openclaw/voice-call # install from npm
openclaw plugins install @openclaw/voice-call --pin # store exact resolved name@version
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

`openclaw plugins list` 將頂層格式顯示為 `openclaw` 或 `bundle`。
詳細的 list/info 輸出也會顯示 bundle 子類型 (`codex` 或 `claude`) 以及
偵測到的 bundle 功能。

`plugins update` 僅適用於在 `plugins.installs` 下追蹤的 npm 安裝。
如果儲存的完整性中繼資料在更新之間發生變更，OpenClaw 會發出警告並要求確認（使用全域 `--yes` 來略過提示）。

外掛也可以註冊自己的頂層指令（例如：`openclaw voicecall`）。

## 外掛 API (概述)

外掛會匯出下列其中之一：

- 一個函式：`(api) => { ... }`
- 一個物件：`{ id, name, configSchema, register(api) { ... } }`

`register(api)` 是外掛程式附加行為的地方。常見的註冊包括：

- `registerTool`
- `registerHook`
- `on(...)` 用於類型化的生命週期掛鉤
- `registerChannel`
- `registerProvider`
- `registerHttpRoute`
- `registerCommand`
- `registerCli`
- `registerContextEngine`
- `registerService`

Context engine 外掛程式也可以註冊一個 runtime 擁有的 context manager：

```ts
export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages }) {
      return { messages, estimatedTokens: 0 };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

然後在配置中啟用它：

```json5
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw",
    },
  },
}
```

## 外掛程式掛鉤

外掛程式可以在執行時註冊掛鉤。這允許外掛程式捆綁事件驅動的自動化，而無需單獨安裝掛鉤包。

### 範例

```ts
export default function register(api) {
  api.registerHook(
    "command:new",
    async () => {
      // Hook logic here.
    },
    {
      name: "my-plugin.command-new",
      description: "Runs when /new is invoked",
    },
  );
}
```

備註：

- 透過 `api.registerHook(...)` 明確註冊掛鉤。
- 掛鉤資格規則仍然適用（作業系統/二進位檔案/環境/配置要求）。
- 外掛程式管理的掛鉤會顯示在 `openclaw hooks list` 中，並帶有 `plugin:<id>`。
- 您無法透過 `openclaw hooks` 啟用/停用外掛程式管理的掛鉤；請改為啟用/停用外掛程式。

### Agent 生命週期掛鉤 (`api.on`)

對於類型化的執行時生命週期掛鉤，請使用 `api.on(...)`：

```ts
export default function register(api) {
  api.on(
    "before_prompt_build",
    (event, ctx) => {
      return {
        prependSystemContext: "Follow company style guide.",
      };
    },
    { priority: 10 },
  );
}
```

用於提示詞構建的重要掛鉤：

- `before_model_resolve`：在 session 載入之前執行（`messages` 尚不可用）。使用此掛鉤以確定性方式覆寫 `modelOverride` 或 `providerOverride`。
- `before_prompt_build`：在 session 載入之後執行（`messages` 可用）。使用此掛鉤來塑造提示詞輸入。
- `before_agent_start`：舊版相容性掛鉤。最好使用上述兩個明確的掛鉤。

核心強制執行的掛鉤策略：

- 操作員可以透過 `plugins.entries.<id>.hooks.allowPromptInjection: false` 針對每個外掛程式停用提示詞變更掛鉤。
- 停用時，OpenClaw 會封鎖 `before_prompt_build` 並忽略從舊版 `before_agent_start` 返回的提示詞變更欄位，同時保留舊版 `modelOverride` 和 `providerOverride`。

`before_prompt_build` 結果欄位：

- `prependContext`: 將文字前置到此次執行的使用者提示詞。最適合特定回合或動態內容。
- `systemPrompt`: 完整覆寫系統提示詞。
- `prependSystemContext`: 將文字前置到目前的系統提示詞。
- `appendSystemContext`: 將文字附加到目前的系統提示詞。

嵌入式執行環境中的提示詞建構順序：

1. 將 `prependContext` 套用至使用者提示詞。
2. 當提供時，套用 `systemPrompt` 覆寫。
3. 套用 `prependSystemContext + current system prompt + appendSystemContext`。

合併與優先順序備註：

- Hook 處理器按優先順序執行（較高者優先）。
- 對於合併的上下文欄位，數值會依執行順序串接。
- `before_prompt_build` 數值會在舊版 `before_agent_start` 後備數值之前套用。

遷移指南：

- 將靜態指引從 `prependContext` 移至 `prependSystemContext`（或 `appendSystemContext`），以便提供者能快取穩定的系統前綴內容。
- 保留 `prependContext` 用於應保持與使用者訊息關聯的每回合動態上下文。

## 提供者外掛（模型授權）

外掛可以註冊 **模型提供者**，以便使用者可以在 OpenClaw 內執行 OAuth 或 API 金鑰
設定，在入門/模型選擇器中顯示提供者設定，並
貢獻隱含的提供者探索功能。

提供者外掛是模型提供者設定的模組化擴展縫合點。它們
不再只是「OAuth 助手」。

### 提供者外掛生命週期

提供者外掛可以參與五個不同的階段：

1. **授權**
   `auth[].run(ctx)` 執行 OAuth、API 金鑰擷取、裝置代碼或自訂
   設定，並傳回授權設定檔以及可選的設定檔修補。
2. **非互動式設定**
   `auth[].runNonInteractive(ctx)` 在不提示的情況下處理 `openclaw onboard --non-interactive`。
   當提供者需要超出內建簡單 API 金鑰路徑的自訂無頭設定時，請使用此功能。
3. **精靈整合**
   `wizard.setup` 新增一個項目至 `openclaw onboard`。
   `wizard.modelPicker` 新增一個設定項目至模型選擇器。
4. **隱式探索**
   `discovery.run(ctx)` 可以在模型解析/列舉期間自動提供提供者配置。
5. **選擇後的後續處理**
   `onModelSelected(ctx)` 在選擇模型後執行。使用此功能進行提供者特定的工作，例如下載本機模型。

這是建議的拆分方式，因為這些階段具有不同的生命週期需求：

- 驗證是互動式的，並寫入憑證/配置
- 非互動式設置是由標誌/環境變數驅動的，且不得提示
- 精靈元資料是靜態的且面向 UI
- 探索應該是安全的、快速的並且能容忍故障
- 選擇後的掛鉤是與所選模型相關聯的副作用

### 提供者驗證合約

`auth[].run(ctx)` 返回：

- `profiles`：要寫入的驗證設定檔
- `configPatch`：可選的 `openclaw.json` 變更
- `defaultModel`：可選的 `provider/model` 引用
- `notes`：可選的面向使用者的註記

核心接著：

1. 寫入返回的驗證設定檔
2. 應用驗證設定檔配置連線
3. 合併配置補丁
4. 選擇性套用預設模型
5. 在適當時執行提供者的 `onModelSelected` 掛鉤

這意味著提供者外掛程式擁有提供者特定的設置邏輯，而核心擁有通用的持久化和配置合併路徑。

### 提供者非互動式合約

`auth[].runNonInteractive(ctx)` 是可選的。當提供者需要無頭設置且無法透過內建的通用 API 金鑰流程表示時，請實作它。

非互動式上下文包括：

- 目前和基本配置
- 解析的入門 CLI 選項
- 執行階段日誌/錯誤輔助程式
- agent/workspace 目錄，以便提供者可以將驗證持久化到與入門其餘部分使用的相同範圍儲存中
- `resolveApiKey(...)` 從標誌、環境變數或現有驗證設定檔讀取提供者金鑰，同時遵守 `--secret-input-mode`
- `toApiKeyCredential(...)` 將解析的金鑰轉換為驗證設定檔憑證，並具有正確的明文與秘密引用儲存

將此介面用於諸如以下的提供者：

- 需要 `--custom-base-url` +
  `--custom-model-id` 的自託管 OpenAI 相容執行環境
- 供應商特定的非互動式驗證或配置合成

請勿從 `runNonInteractive` 進行提示。對於缺失的輸入，請回報可採取行動的
錯誤。

### 供應商精靈中繼資料

供應商驗證/上架中繼資料可存在於兩個層級：

- manifest `providerAuthChoices`：低成本標籤、分組、`--auth-choice`
  ID，以及在執行環境載入前可用的簡單 CLI 標誌中繼資料
- runtime `wizard.setup` / `auth[].wizard`：取決於
  已載入供應商代碼的更豐富行為

對於靜態標籤/標誌，請使用 manifest 中繼資料。當設定取決於動態驗證方法、方法備援或執行時驗證時，請使用 runtime 精靈中繼資料。

`wizard.setup` 控制供應商在分組上架時的顯示方式：

- `choiceId`：驗證選擇的值
- `choiceLabel`：選項標籤
- `choiceHint`：簡短提示
- `groupId`：群組分類 ID
- `groupLabel`：群組標籤
- `groupHint`：群組提示
- `methodId`：要執行的驗證方法
- `modelAllowlist`：可選的驗證後允許清單政策 (`allowedKeys`, `initialSelections`, `message`)

`wizard.modelPicker` 控制供應商在模型選擇中作為「立即設定」
項目的顯示方式：

- `label`
- `hint`
- `methodId`

當供應商有多種驗證方法時，精靈可以指向一個
明確的方法，或讓 OpenClaw 合成每個方法的選擇。

當外掛程式註冊時，OpenClaw 會驗證供應商精靈中繼資料：

- 重複或空白的驗證方法 ID 會被拒絕
- 當供應商沒有驗證方法時，精靈中繼資料會被忽略
- 無效的 `methodId` 綁定會降級為警告，並
  回退到供應商剩餘的驗證方法

### 供應商探索合約

`discovery.run(ctx)` 回傳其中之一：

- `{ provider }`
- `{ providers }`
- `null`

在插件擁有一個提供者 ID 的常見情況下，請使用 `{ provider }`。
當插件發現多個提供者項目時，請使用 `{ providers }`。

發現上下文包含：

- 當前配置
- 代理/工作區目錄
- 程序環境變數
- 用於解析提供者 API 金鑰的輔助函式，以及適合發現階段使用的 API 金鑰值

發現過程應該：

- 快速
- 盡力而為
- 失敗時可安全略過
- 小心副作用

它不應依賴提示或長時間執行的設定。

### 發現順序

提供者發現按順序分階段執行：

- `simple`
- `profile`
- `paired`
- `late`

請使用：

- `simple` 進行僅依賴環境的廉價發現
- 當發現依賴於認證設定檔時，使用 `profile`
- 當提供者需要與另一個發現步驟協調時，使用 `paired`
- `late` 用於昂貴或本地網路探測

大多數自託管的提供者應該使用 `late`。

### 良好的提供者-插件邊界

適合提供者插件：

- 具有自訂設定流程的本機/自託管提供者
- 特定於提供者的 OAuth/裝置代碼登入
- 本機模型伺服器的隱式發現
- 選擇後的副作用，例如模型拉取

較不適合的情況：

- 僅使用 API 金鑰的簡易提供者，它們僅在環境變數、基礎 URL 和一個
  預設模型上有所不同

這些仍然可以成為插件，但主要的模組化收益來自於
首先提取行為豐富的提供者。

透過 `api.registerProvider(...)` 註冊一個提供者。每個提供者公開一個
或多個認證方法（OAuth、API 金鑰、裝置代碼等）。這些方法可以
支援：

- `openclaw models auth login --provider <id> [--method <id>]`
- `openclaw onboard`
- 模型選擇器「自訂提供者」設定項目
- 在模型解析/列舉期間隱式發現提供者

範例：

```ts
api.registerProvider({
  id: "acme",
  label: "AcmeAI",
  auth: [
    {
      id: "oauth",
      label: "OAuth",
      kind: "oauth",
      run: async (ctx) => {
        // Run OAuth flow and return auth profiles.
        return {
          profiles: [
            {
              profileId: "acme:default",
              credential: {
                type: "oauth",
                provider: "acme",
                access: "...",
                refresh: "...",
                expires: Date.now() + 3600 * 1000,
              },
            },
          ],
          defaultModel: "acme/opus-1",
        };
      },
    },
  ],
  wizard: {
    setup: {
      choiceId: "acme",
      choiceLabel: "AcmeAI",
      groupId: "acme",
      groupLabel: "AcmeAI",
      methodId: "oauth",
    },
    modelPicker: {
      label: "AcmeAI (custom)",
      hint: "Connect a self-hosted AcmeAI endpoint",
      methodId: "oauth",
    },
  },
  discovery: {
    order: "late",
    run: async () => ({
      provider: {
        baseUrl: "https://acme.example/v1",
        api: "openai-completions",
        apiKey: "${ACME_API_KEY}",
        models: [],
      },
    }),
  },
});
```

備註：

- `run` 接收一個帶有 `prompter`、`runtime`、
  `openUrl`、`oauth.createVpsAwareHandlers`、`secretInputMode` 和
  `allowSecretRefPrompt` helper/state 的 `ProviderAuthContext`。Onboarding/configure 流程可以使用
  這些來遵守 `--secret-input-mode` 或提供 env/file/exec secret-ref
  擷取，而 `openclaw models auth` 則保持更緊湊的提示介面。
- `runNonInteractive` 接收一個
  帶有 `opts`、`agentDir`、`resolveApiKey` 和 `toApiKeyCredential` helper 的 `ProviderAuthMethodNonInteractiveContext`
  以用於 headless onboarding。
- 當您需要新增預設模型或提供者設定時，請傳回 `configPatch`。
- 傳回 `defaultModel`，以便 `--set-default` 可以更新代理程式預設值。
- `wizard.setup` 會在 onboarding 介面（例如
  `openclaw onboard` / `openclaw setup --wizard`）中新增提供者選項。
- `wizard.setup.modelAllowlist` 允許提供者在 onboarding/configure 期間縮小後續模型
  allowlist 提示的範圍。
- `wizard.modelPicker` 會在模型選擇器中新增一個「設定此提供者」項目。
- `deprecatedProfileIds` 允許提供者擁有對已退役
  auth-profile id 的 `openclaw doctor` 清理作業。
- `discovery.run` 會針對外掛程式自己的提供者 id 傳回 `{ provider }`，
  或針對多提供者探索傳回 `{ providers }`。
- `discovery.order` 控制提供者相對於內建
  探索階段何時執行：`simple`、`profile`、`paired` 或 `late`。
- `onModelSelected` 是用於提供者特定後續
  工作（例如拉取本機模型）的後置選擇 hook。

### 註冊訊息通道

外掛程式可以註冊**頻道外掛程式**，其行為類似於內建頻道
(WhatsApp、Telegram 等)。頻道設定位於 `channels.<id>` 之下，並由您的頻道外掛程式碼進行驗證。

```ts
const myChannel = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "demo channel plugin.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async () => ({ ok: true }),
  },
};

export default function (api) {
  api.registerChannel({ plugin: myChannel });
}
```

備註：

- 將設定放在 `channels.<id>` (而非 `plugins.entries`)。
- `meta.label` 用於 CLI/UI 列表中的標籤。
- `meta.aliases` 新增用於正規化和 CLI 輸入的替代 ID。
- `meta.preferOver` 列出當兩者都已設定時要跳過自動啟用的頻道 ID。
- `meta.detailLabel` 和 `meta.systemImage` 讓 UI 顯示更豐富的頻道標籤/圖示。

### 頻道設定攔截 (Hooks)

建議的設定劃分：

- `plugin.setup` 負責帳戶 ID 正規化、驗證和設定寫入。
- `plugin.setupWizard` 允許主機執行通用精靈流程，而頻道僅提供狀態、憑證、DM 許可清單和頻道存取描述符。

`plugin.setupWizard` 最適合符合共用模式的頻道：

- 由 `plugin.config.listAccountIds` 驅動的單一帳戶選擇器
- 在提示之前可選的預檢/準備步驟 (例如安裝程式/啟動工作)
- 針對捆綁憑證集的可選 env-shortcut 提示 (例如配對的機器人/應用程式權杖)
- 一個或多個憑證提示，每個步驟透過 `plugin.setup.applyAccountConfig` 寫入或頻道擁有的部分修補
- 可選的非機密文字提示 (例如 CLI 路徑、基本 URL、帳戶 ID)
- 由主機解析的可選頻道/群組存取許可清單提示
- 可選的 DM 許可清單解析 (例如 `@username` -> 數字 ID)
- 設定完成後可選的完成說明

### 撰寫新的訊息頻道 (逐步)

當您想要一個**新的聊天介面** (「訊息頻道」) 而不是模型提供者時，請使用此選項。
模型提供者文件位於 `/providers/*`。

1. 選擇 ID + 設定結構

- 所有頻道設定都位於 `channels.<id>`。
- 對於多帳戶設定，建議使用 `channels.<id>.accounts.<accountId>`。

2. 定義頻道元資料

- `meta.label`、`meta.selectionLabel`、`meta.docsPath` 和 `meta.blurb` 控制 CLI/UI 列表。
- `meta.docsPath` 應指向類似 `/channels/<id>` 的文件頁面。
- `meta.preferOver` 允許外掛程式取代其他通道（自動啟用會優先選用它）。
- `meta.detailLabel` 和 `meta.systemImage` 由 UI 用於詳細文字/圖示。

3. 實作所需的適配器

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities`（聊天類型、媒體、執行緒等）
- `outbound.deliveryMode` + `outbound.sendText`（用於基本發送）

4. 視需要新增選用的適配器

- `setup`（驗證 + 寫入設定）、`setupWizard`（主機擁有的精靈）、`security`（DM 政策）、`status`（健康狀態/診斷）
- `gateway`（啟動/停止/登入）、`mentions`、`threading`、`streaming`
- `actions`（訊息動作）、`commands`（原生指令行為）

5. 在您的外掛程式中註冊通道

- `api.registerChannel({ plugin })`

最小設定範例：

```json5
{
  channels: {
    acmechat: {
      accounts: {
        default: { token: "ACME_TOKEN", enabled: true },
      },
    },
  },
}
```

最小通道外掛程式（僅限輸出）：

```ts
const plugin = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "AcmeChat messaging channel.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ text }) => {
      // deliver `text` to your channel here
      return { ok: true };
    },
  },
};

export default function (api) {
  api.registerChannel({ plugin });
}
```

載入外掛程式（extensions 目錄或 `plugins.load.paths`），重新啟動閘道，
然後在您的設定中設定 `channels.<id>`。

### Agent 工具

請參閱專屬指南：[Plugin agent tools](/zh-Hant/plugins/agent-tools)。

### 註冊閘道 RPC 方法

```ts
export default function (api) {
  api.registerGatewayMethod("myplugin.status", ({ respond }) => {
    respond(true, { ok: true });
  });
}
```

### 註冊 CLI 指令

```ts
export default function (api) {
  api.registerCli(
    ({ program }) => {
      program.command("mycmd").action(() => {
        console.log("Hello");
      });
    },
    { commands: ["mycmd"] },
  );
}
```

### 註冊自動回覆指令

外掛程式可以註冊自訂斜線指令，這些指令在執行時**不需叫用
AI agent**。這適用於不需要 LLM 處理的切換指令、狀態檢查或快速動作。

```ts
export default function (api) {
  api.registerCommand({
    name: "mystatus",
    description: "Show plugin status",
    handler: (ctx) => ({
      text: `Plugin is running! Channel: ${ctx.channel}`,
    }),
  });
}
```

指令處理器上下文：

- `senderId`：發送者的 ID（如果可用）
- `channel`：發送指令的通道
- `isAuthorizedSender`：發送者是否為授權使用者
- `args`: 在指令之後傳遞的參數（如果 `acceptsArgs: true`）
- `commandBody`: 完整的指令文字
- `config`: 目前的 OpenClaw 設定

指令選項：

- `name`: 指令名稱（不包含前導 `/`）
- `nativeNames`: 用於斜線/選單介面的可選原生指令別名。使用 `default` 適用於所有原生提供者，或使用提供者特定的金鑰，例如 `discord`
- `description`: 在指令列表中顯示的說明文字
- `acceptsArgs`: 指令是否接受參數（預設：false）。如果為 false 且提供了參數，指令將不會匹配，訊息將會傳遞給其他處理程式
- `requireAuth`: 是否要求經過授權的傳送者（預設：true）
- `handler`: 傳回 `{ text: string }` 的函式（可以是非同步）

包含授權與參數的範例：

```ts
api.registerCommand({
  name: "setmode",
  description: "Set plugin mode",
  acceptsArgs: true,
  requireAuth: true,
  handler: async (ctx) => {
    const mode = ctx.args?.trim() || "default";
    await saveMode(mode);
    return { text: `Mode set to: ${mode}` };
  },
});
```

備註：

- 外掛指令會在內建指令和 AI 代理程式**之前**被處理
- 指令是全域註冊的，並在所有頻道中運作
- 指令名稱不區分大小寫（`/MyStatus` 符合 `/mystatus`）
- 指令名稱必須以字母開頭，且只能包含字母、數字、連字元和底線
- 保留的指令名稱（例如 `help`、`status`、`reset` 等）無法被外掛覆寫
- 跨外掛重複註冊指令將會失敗並顯示診斷錯誤

### 註冊背景服務

```ts
export default function (api) {
  api.registerService({
    id: "my-service",
    start: () => api.logger.info("ready"),
    stop: () => api.logger.info("bye"),
  });
}
```

## 命名慣例

- Gateway 方法：`pluginId.action`（範例：`voicecall.status`）
- 工具：`snake_case`（範例：`voice_call`）
- CLI 指令：kebab 或 camel，但避免與核心指令衝突

## 技能

外掛可以在倉庫中附帶一個技能（`skills/<name>/SKILL.md`）。
使用 `plugins.entries.<id>.enabled`（或其他設定閘門）啟用它，並確保
它存在於您的工作區/受管理技能位置中。

## 發行 (npm)

推薦的打包方式：

- 主要套件：`openclaw` (此 repo)
- 外掛：`@openclaw/*` 下的獨立 npm 套件 (例如：`@openclaw/voice-call`)

發行約定：

- 外掛 `package.json` 必須包含 `openclaw.extensions`，其中含有一或多個進入點檔案。
- 選用：`openclaw.setupEntry` 可以指向一個輕量級的僅設定用進入點，用於已停用或尚未設定的通道設定。
- 選用：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` 可以選擇讓通道外掛在預監聽 (pre-listen) 閘道啟動期間使用 `setupEntry`，但僅限於該設定進入點完全覆蓋外掛的啟動關鍵介面時。
- 進入點檔案可以是 `.js` 或 `.ts` (jiti 會在執行時載入 TS)。
- `openclaw plugins install <npm-spec>` 會使用 `npm pack`，將其解壓縮到 `~/.openclaw/extensions/<id>/`，並在設定中啟用它。
- 設定金鑰穩定性：限定範圍 的套件會針對 `plugins.entries.*` 正規化為 **未限定範圍** (unscoped) 的 id。

## 外掛範例：語音通話

此 repo 包含一個語音通話外掛 (Twilio 或日誌後備)：

- 原始碼：`extensions/voice-call`
- 技能：`skills/voice-call`
- CLI：`openclaw voicecall start|status`
- 工具：`voice_call`
- RPC：`voicecall.start`, `voicecall.status`
- 設定：`provider: "twilio"` + `twilio.accountSid/authToken/from` (選用 `statusCallbackUrl`, `twimlUrl`)
- 設定 (dev)：`provider: "log"` (無網路)

請參閱 [語音通話](/zh-Hant/plugins/voice-call) 和 `extensions/voice-call/README.md` 以了解設定與使用方式。

## 安全性注意事項

外掛在閘道 內的程序中執行。請將其視為受信任的程式碼：

- 僅安裝您信任的外掛。
- 優先使用 `plugins.allow` 允許清單。
- 請記住 `plugins.allow` 是基於 ID 的，因此已啟用的工作區外掛可以刻意覆蓋 (shadow) 具有相同 ID 的內建外掛。
- 變更後請重新啟動閘道。

## 測試外掛

外掛可以 (且應該) 隨附測試：

- In-repo 插件可以將 Vitest 測試放在 `src/**` 下（例如：`src/plugins/voice-call.plugin.test.ts`）。
- 單獨發布的插件應該執行自己的 CI（lint/build/test），並驗證 `openclaw.extensions` 指向構建的入口點（`dist/index.js`）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
