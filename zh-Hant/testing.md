---
summary: "測試工具包：單元/E2E/即時測試套件、Docker 執行器，以及各項測試涵蓋的範圍"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "測試"
---

# 測試

OpenClaw 擁有三個 Vitest 測試套件（單元/整合、E2E、即時）以及一小組 Docker 執行器。

本文件是一份「我們如何進行測試」的指南：

- 各測試套件的涵蓋範圍（以及刻意*不*涵蓋的部分）
- 針對常見工作流程（本地、推送前、除錯）應執行的指令
- 即時測試如何探索憑證並選擇模型/供應商
- 如何為真實世界的模型/供應商問題加入回歸測試

## 快速開始

大多數時候：

- 完整檢核（推送前預期執行）：`pnpm build && pnpm check && pnpm test`

當您接觸測試或需要更多信心時：

- 覆蓋率檢核：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

當除錯真實供應商/模型時（需要真實憑證）：

- 即時套件（模型 + 閘道工具/映像檔探測）：`pnpm test:live`

提示：當您只需要一個失敗案例時，建議透過下方描述的 allowlist 環境變數來縮小即時測試範圍。

## 測試套件（什麼在哪裡執行）

您可以將這些套件視為「真實度遞增」（以及不穩定性/成本遞增）：

### 單元 / 整合（預設）

- 指令：`pnpm test`
- 設定：`vitest.config.ts`
- 檔案：`src/**/*.test.ts`
- 範圍：
  - 純單元測試
  - 程序內整合測試（閘道驗證、路由、工具、解析、設定）
  - 針對已知錯誤的確定性回歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實金鑰
  - 應該快速且穩定

### E2E（閘道冒煙測試）

- 指令：`pnpm test:e2e`
- 設定：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`
- 範圍：
  - 多執行個體閘道的端對端行為
  - WebSocket/HTTP 介面、節點配對以及較重度的網路操作
- 預期：
  - 在 CI 中執行（當在管道中啟用時）
  - 不需要真實金鑰
  - 比單元測試有更多運作部件（可能會較慢）

### 即時（真實供應商 + 真實模型）

- 指令：`pnpm test:live`
- 設定：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`
- 預設：由 `pnpm test:live` **啟用**（設定 `OPENCLAW_LIVE_TEST=1`）
- 範圍：
  - 「此提供者/模型在*今天*使用真實憑證是否真的能運作？」
  - 捕捉提供者格式變更、工具呼叫的怪異行為、驗證問題以及速率限制行為
- 預期：
  - 按設計在 CI 中不穩定（真實網路、真實提供者原則、配額、停機）
  - 需要花費金錢 / 使用速率限制
  - 建議優先執行縮小的子集，而非「全部」
  - Live 執行將會 source `~/.profile` 以獲取遺失的 API 金鑰
  - Anthropic 金鑰輪替：設定 `OPENCLAW_LIVE_ANTHROPIC_KEYS="sk-...,sk-..."`（或 `OPENCLAW_LIVE_ANTHROPIC_KEY=sk-...`）或多個 `ANTHROPIC_API_KEY*` 變數；測試會在遇到速率限制時重試

## 我應該執行哪個套件？

使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test`（如果您變更了很多內容，也執行 `pnpm test:coverage`）
- 涉及閘道網路功能 / WS 協定 / 配對：新增 `pnpm test:e2e`
- 除錯「我的機器人掛了」/ 特定提供者的失敗 / 工具呼叫：執行縮小的 `pnpm test:live`

## Live：模型冒煙測試（設定檔金鑰）

Live 測試分為兩層，以便我們隔離失敗原因：

- 「直接模型」告訴我們該提供者/模型是否能在給定金鑰下回應。
- 「閘道冒煙測試」告訴我們完整的閘道+代理程式管線是否對該模型有效（sessions、歷史紀錄、工具、沙箱原則等）。

### 第一層：直接模型補全（無閘道）

- 測試：`src/agents/models.profiles.live.test.ts`
- 目標：
  - 列舉探索到的模型
  - 使用 `getApiKeyForModel` 來選取您有憑證的模型
  - 對每個模型執行小型補全（並在需要時執行目標回歸測試）
- 如何啟用：
  - `pnpm test:live`（如果直接呼叫 Vitest，則使用 `OPENCLAW_LIVE_TEST=1`）
- 設定 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，modern 的別名）以實際執行此套件；否則會跳過，以保持 `pnpm test:live` 專注於閘道冒煙測試
- 如何選取模型：
  - `OPENCLAW_LIVE_MODELS=modern` 以執行 modern 允許清單（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.1、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是 modern 允許清單的別名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,..."`（逗號分隔允許清單）
- 如何選取提供者：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗號分隔允許清單）
- 金鑰來源：
  - 預設：profile store 和 env 後備
  - 設定 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以僅強制使用 **profile store**
- 存在原因：
  - 區分「provider API 壞掉 / 金鑰無效」與「gateway agent pipeline 壞掉」
  - 包含小型、獨立的回歸測試（範例：OpenAI Responses/Codex Responses reasoning replay + tool-call 流程）

### Layer 2: Gateway + dev agent smoke（「@openclaw」實際上做的事）

- 測試：`src/gateway/gateway-models.profiles.live.test.ts`
- 目標：
  - 啟動一個程序內的 gateway
  - 建立/修補一個 `agent:dev:*` session（每次執行的模型覆寫）
  - 迭代帶金鑰的模型並斷言：
    - 「有意義的」回應（無工具）
    - 真實的工具調用有效（read probe）
    - 選用的額外工具探測（exec+read probe）
    - OpenAI 回歸路徑（tool-call-only → follow-up）持續運作
- 探測細節（讓你能快速解釋失敗原因）：
  - `read` probe：測試在工作區寫入一個 nonce 檔案，並要求 agent `read` 它並將 nonce 回傳。
  - `exec+read` probe：測試要求 agent 將 nonce `exec`-寫入暫存檔，然後 `read` 回傳。
  - image probe：測試附加一個生成的 PNG（cat + 隨機代碼）並期望模型回傳 `cat <CODE>`。
  - 實作參考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何啟用：
  - `pnpm test:live`（若直接呼叫 Vitest 則為 `OPENCLAW_LIVE_TEST=1`）
- 如何選擇模型：
  - 預設：現代白名單（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.1、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是現代白名單的別名
  - 或設定 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗號清單）以縮小範圍
- 如何選擇提供商（避免「全用 OpenRouter」）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗號白名單）
- 在此即時測試中，工具 + 圖像探測總是開啟：
  - `read` probe + `exec+read` probe（工具壓力測試）
  - 當模型宣稱支援圖像輸入時執行 image probe
  - 流程（高層級）：
    - 測試生成一個帶有「CAT」+ 隨機代碼的小型 PNG（`src/gateway/live-image-probe.ts`）
    - 透過 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 發送
    - Gateway 將附件解析為 `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - 嵌入式代理將多模態使用者訊息轉發給模型
    - 斷言：回覆包含 `cat` + 程式碼 (OCR 容錯率：允許輕微錯誤)

提示：若要查看您可以在機器上測試的內容（以及確切的 `provider/model` ID），請執行：

```bash
openclaw models list
openclaw models list --json
```

## Live：Anthropic setup-token 測試

- 測試：`src/agents/anthropic.setup-token.live.test.ts`
- 目標：驗證 Claude Code CLI setup-token（或貼上的 setup-token 設定檔）能否完成 Anthropic 提示詞。
- 啟用：
  - `pnpm test:live` (若直接呼叫 Vitest 則為 `OPENCLAW_LIVE_TEST=1`)
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Token 來源（擇一）：
  - 設定檔：`OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - 原始 Token：`OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- 模型覆寫（選用）：
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-5`

設定範例：

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live：CLI 後端測試 (Claude Code CLI 或其他本地 CLI)

- 測試：`src/gateway/gateway-cli-backend.live.test.ts`
- 目標：使用本地 CLI 後端驗證 Gateway + 代理管線，而不變更您的預設設定。
- 啟用：
  - `pnpm test:live` (若直接呼叫 Vitest 則為 `OPENCLAW_LIVE_TEST=1`)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 預設值：
  - 模型：`claude-cli/claude-sonnet-4-5`
  - 指令：`claude`
  - 參數：`["-p","--output-format","json","--dangerously-skip-permissions"]`
- 覆寫（選用）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-5"`
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.2-codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 以傳送真實圖片附件（路徑會被注入到提示詞中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 以將圖片檔案路徑作為 CLI 參數傳遞，而非透過提示詞注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (或 `"list"`) 以控制當設定 `IMAGE_ARG` 時圖片參數的傳遞方式。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 以發送第二輪對話並驗證恢復流程。
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` 以保持 Claude Code CLI MCP 配置啟用（預設會使用臨時空白檔案停用 MCP 配置）。

範例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-5" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### 推薦的 Live 配方

狹窄、明確的允許清單是最快且最不穩定的：

- 單一模型，直接（無閘道）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 單一模型，閘道冒煙測試：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多個供應商的工具呼叫：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.1" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 側重（Gemini API 金鑰 + Antigravity）：
  - Gemini (API 金鑰): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-5-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

備註：

- `google/...` 使用 Gemini API (API 金鑰)。
- `google-antigravity/...` 使用 Antigravity OAuth 橋接器（Cloud Code Assist 風格的代理端點）。
- `google-gemini-cli/...` 使用您機器上的本機 Gemini CLI（獨立的驗證 + 工具怪癖）。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 透過 HTTP 呼叫 Google 託管的 Gemini API（API 金鑰 / 設定檔驗證）；這是大多數使用者所說的「Gemini」。
  - CLI：OpenClaw 呼叫本機 `gemini` 二進位檔案；它有自己的驗證方式，且行為可能有所不同（串流/工具支援/版本差異）。

## Live: 模型矩陣（我們涵蓋的內容）

沒有固定的「CI 模型清單」（Live 是選用的），但這些是**推薦**在有金鑰的開發機上定期涵蓋的模型。

### 現代冒煙測試集（工具呼叫 + 圖片）

這是我們預期能保持運作的「常見模型」執行：

- OpenAI (非 Codex): `openai/gpt-5.2` (選用: `openai/gpt-5.1`)
- OpenAI Codex: `openai-codex/gpt-5.2` (選用: `openai-codex/gpt-5.2-codex`)
- Anthropic: `anthropic/claude-opus-4-5` (或 `anthropic/claude-sonnet-4-5`)
- Google (Gemini API): `google/gemini-3-pro-preview` 和 `google/gemini-3-flash-preview` (避免較舊的 Gemini 2.x 模型)
- Google (Antigravity): `google-antigravity/claude-opus-4-5-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/minimax-m2.1`

執行包含工具 + 圖片的閘道冒煙測試：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.2,anthropic/claude-opus-4-5,google/gemini-3-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-5-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.1" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基準：工具呼叫（讀取 + 選用執行）

每個供應商系列至少選擇一個：

- OpenAI: `openai/gpt-5.2` (或 `openai/gpt-5-mini`)
- Anthropic: `anthropic/claude-opus-4-5` (或 `anthropic/claude-sonnet-4-5`)
- Google: `google/gemini-3-flash-preview` (或 `google/gemini-3-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/minimax-m2.1`

可選的額外覆蓋範圍（最好有）：

- xAI: `xai/grok-4` (或最新可用版本)
- Mistral: `mistral/`… (選擇一個你已啟用的支援「工具」功能的模型)
- Cerebras: `cerebras/`… (如果你有存取權限)
- LM Studio: `lmstudio/`… (本地；工具呼叫取決於 API 模式)

### Vision：圖片發送（附件 → 多模態訊息）

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一個支援圖片的模型（Claude/Gemini/OpenAI 支援視覺的變體等），以測試圖片探測功能。

### 聚合器 / 替代閘道

如果你已啟用金鑰，我們也支援透過以下方式進行測試：

- OpenRouter: `openrouter/...` (數百種模型；使用 `openclaw models scan` 尋找支援工具與圖片的候選模型)
- OpenCode Zen: `opencode/...` (透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 進行驗證)

更多你可以包含在即時矩陣中的供應商（如果你有憑證/設定）：

- 內建：`openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- 透過 `models.providers` (自訂端點)：`minimax` (雲端/API)，以及任何 OpenAI/Anthropic 相容的代理 (LM Studio, vLLM, LiteLLM 等)

提示：不要試圖在文件中硬編碼「所有模型」。權威清單取決於 `discoverModels(...)` 在您的機器上傳回的內容，以及可用的金鑰。

## 憑證（絕不要提交）

Live 測試尋找憑證的方式與 CLI 相同。實際影響：

- 如果 CLI 運作正常，Live 測試應該能找到相同的金鑰。
- 如果 Live 測試顯示「no creds」，請像除錯 `openclaw models list` / 模型選擇一樣進行除錯。

- Profile store：`~/.openclaw/credentials/`（首選；即測試中「profile keys」的含義）
- 設定：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）

如果您想依賴環境金鑰（例如在您的 `~/.profile` 中匯出的），請在 `source ~/.profile` 之後執行本地測試，或使用下方的 Docker 執行器（它們可以將 `~/.profile` 掛載到容器中）。

## Deepgram live（音訊轉錄）

- 測試：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 啟用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## Docker 執行器（可選的「在 Linux 中運作」檢查）

這些會在倉庫 Docker 映像檔內執行 `pnpm test:live`，掛載您的本地設定目錄和工作區（並在掛載時 sourcing `~/.profile`）：

- 直接模型：`pnpm test:docker:live-models`（腳本：`scripts/test-live-models-docker.sh`）
- Gateway + dev agent：`pnpm test:docker:live-gateway`（腳本：`scripts/test-live-gateway-models-docker.sh`）
- Onboarding wizard（TTY，完整腳手架）：`pnpm test:docker:onboard`（腳本：`scripts/e2e/onboard-docker.sh`）
- Gateway 網路（兩個容器，WS auth + health）：`pnpm test:docker:gateway-network`（腳本：`scripts/e2e/gateway-network-docker.sh`）
- 外掛程式（自訂擴充載入 + registry smoke）：`pnpm test:docker:plugins`（腳本：`scripts/e2e/plugins-docker.sh`）

有用的環境變數：

- `OPENCLAW_CONFIG_DIR=...`（預設：`~/.openclaw`）掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（預設：`~/.openclaw/workspace`）掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（預設：`~/.profile`）掛載至 `/home/node/.profile` 並在執行測試前 sourcing
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以縮小執行範圍
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以確保憑證來自設定檔儲存（而非環境變數）

## :文件健全性檢查

在編輯文件後執行檢查：`pnpm docs:list`。

## 離線回歸測試（CI 安全）

這些是不含真實供應商的「真實管線」回歸測試：

- Gateway 工具呼叫（模擬 OpenAI，真實 gateway + agent 迴圈）：`src/gateway/gateway.tool-calling.mock-openai.test.ts`
- Gateway 精靈（WS `wizard.start`/`wizard.next`，寫入設定檔 + 強制執行驗證）：`src/gateway/gateway.wizard.e2e.test.ts`

## Agent 可靠性評估（技能）

我們已經有一些行為類似「agent 可靠性評估」的 CI 安全測試：

- 透過真實 gateway + agent 迴圈進行模擬工具呼叫（`src/gateway/gateway.tool-calling.mock-openai.test.ts`）。
- 驗證 session 連線和配置效果的端到端精靈流程（`src/gateway/gateway.wizard.e2e.test.ts`）。

技能目前仍缺少的部分（請參閱 [技能](/zh-Hant/tools/skills))：

- **決策制定：** 當提示中列出技能時，agent 是否會選擇正確的技能（或避免不相關的技能）？
- **合規性：** agent 在使用前是否會閱讀 `SKILL.md` 並遵循必要的步驟/參數？
- **工作流程合約：** 斷言工具順序、session 歷史傳遞和沙箱邊界的多輪次場景。

未來的評估應首先保持確定性：

- 使用模擬供應商的場景執行器，以斷言工具呼叫 + 順序、技能檔案讀取和 session 連線。
- 一小組專注於技能的場景（使用與避免、閘控、提示注入）。
- 僅在 CI 安全測試套件就位後，才進行選用的即時評估（選用、受環境變數限制）。

## 新增回歸測試（指導原則）

當您修復在即時測試中發現的供應商/模型問題時：

- 如果可能，請新增 CI 安全的回歸測試（模擬/存根供應商，或擷取確切的請求形狀轉換）
- 如果本質上僅限於即時測試（速率限制、驗證策略），請保持即時測試狹窄，並透過環境變數設為選用
- 優先針對能捕獲錯誤的最小層級：
  - 供應商請求轉換/重放錯誤 → 直接模型測試
  - gateway session/history/tool 管線錯誤 → gateway 即時冒煙測試或 CI 安全 gateway 模擬測試

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
