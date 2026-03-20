---
summary: "測試工具包：單元/e2e/live 套件、Docker 執行器，以及每個測試涵蓋的內容"
read_when:
  - 在本地或 CI 中執行測試
  - 為模型/供應商錯誤添加回歸測試
  - 除錯閘道和代理行為
title: "測試"
---

# 測試

OpenClaw 有三個 Vitest 套件（單元/整合、e2e、live）和一小組 Docker 執行器。

這份文件是一份「我們如何測試」指南：

- 每個套件涵蓋的內容（以及它故意_不_涵蓋的內容）
- 針對常見工作流程應執行哪些指令（本地、推送前、除錯）
- 即時測試如何發現憑證並選擇模型/供應商
- 如何為現實世界的模型/供應商問題添加回歸測試

## 快速入門

大多數時候：

- 完整檢查（推送前預期）：`pnpm build && pnpm check && pnpm test`

當你修改測試或想要額外的信心時：

- 覆蓋率檢查：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

當除錯真實供應商/模型時（需要真實憑證）：

- Live 套件（模型 + 閘道工具/圖像探測）：`pnpm test:live`

提示：當你只需要一個失敗案例時，建議透過下方描述的 allowlist 環境變數來縮小即時測試的範圍。

## 測試套件（什麼在哪裡執行）

可以將這些套件視為「真實性逐級遞增」（同時不穩定性/成本也逐級遞增）：

### 單元 / 整合（預設）

- 指令：`pnpm test`
- 設定：`vitest.config.ts`
- 檔案：`src/**/*.test.ts`
- 範圍：
  - 純單元測試
  - 程序內整合測試（閘道身份驗證、路由、工具、解析、設定）
  - 已知錯誤的確定性回歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實金鑰
  - 應該快速且穩定

### E2E（閘道冒煙測試）

- 指令：`pnpm test:e2e`
- 設定：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`
- 範圍：
  - 多實例閘道端到端行為
  - WebSocket/HTTP 表面、節點配對和更重的網路處理
- 預期：
  - 在 CI 中執行（當在管線中啟用時）
  - 不需要真實金鑰
  - 比單元測試有更多運作部件（可能會較慢）

### Live（真實供應商 + 真實模型）

- 指令：`pnpm test:live`
- 設定：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`
- 預設：透過 `pnpm test:live` 啟用（設定 `OPENCLAW_LIVE_TEST=1`）
- 範圍：
  - 「此供應商/模型今日是否能使用真實憑證正常運作？」
  - 捕獲供應商格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期：
  - 依設計不保證在 CI 中穩定（真實網路、真實供應商政策、配額、服務中斷）
  - 需要花費金錢 / 使用速率限制
  - 建議執行縮小的子集而非「全部」
  - Live 執行將 source `~/.profile` 以獲取缺少的 API 金鑰
  - Anthropic 金鑰輪替：設定 `OPENCLAW_LIVE_ANTHROPIC_KEYS="sk-...,sk-..."`（或 `OPENCLAW_LIVE_ANTHROPIC_KEY=sk-...`）或多個 `ANTHROPIC_API_KEY*` 變數；測試將在速率限制時重試

## 我應該執行哪個測試套件？

使用此決策表：

- 編輯邏輯/測試時：執行 `pnpm test`（如果您做了大量修改，則執行 `pnpm test:coverage`）
- 涉及 gateway 網路 / WS 協定 / 配對時：加入 `pnpm test:e2e`
- 除錯「我的 bot 掛了」/ 供應商特定失敗 / 工具呼叫時：執行縮小的 `pnpm test:live`

## Live：model smoke（profile 金鑰）

Live 測試分為兩層，以便我們隔離失敗原因：

- 「直接模型」告訴我們供應商/模型是否能使用指定的金鑰回應。
- 「Gateway smoke」告訴我們完整的 gateway+agent 管線對該模型是否運作正常（sessions、history、tools、sandbox policy 等）。

### 第 1 層：直接模型完成（無 gateway）

- 測試：`src/agents/models.profiles.live.test.ts`
- 目標：
  - 列舉探索到的模型
  - 使用 `getApiKeyForModel` 來選擇您有憑證的模型
  - 對每個模型執行一個小型完成（並視需要執行目標回歸測試）
- 如何啟用：
  - `pnpm test:live`（如果直接呼叫 Vitest 則為 `OPENCLAW_LIVE_TEST=1`）
- 設定 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，即 modern 的別名）以實際執行此套件；否則會跳過以保持 `pnpm test:live` 專注於 gateway smoke
- 如何選擇模型：
  - `OPENCLAW_LIVE_MODELS=modern` 執行 modern allowlist（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.1、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是 modern allowlist 的別名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,..."`（逗號允許清單）
- 如何選擇提供商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗號允許清單）
- 金鑰來源：
  - 預設：profile store 和 env 後備
  - 設定 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以僅強制使用 **profile store**
- 為什麼存在：
  - 區分「提供商 API 損壞 / 金鑰無效」與「gateway agent 管道損壞」
  - 包含小型、獨立的回歸測試（例如：OpenAI Responses/Codex Responses 推理重播 + 工具調用流程）

### Layer 2：Gateway + dev agent smoke（這是 "@openclaw" 實際上做的事情）

- 測試：`src/gateway/gateway-models.profiles.live.test.ts`
- 目標：
  - 啟動一個進程內 gateway
  - 建立/修補 `agent:dev:*` session（每次執行的模型覆寫）
  - 遍歷帶金鑰的模型並斷言：
    - 「有意義的」回應（無工具）
    - 真實的工具調用運作正常（read probe）
    - 選用的額外工具探測（exec+read probe）
    - OpenAI 回歸路徑（tool-call-only → follow-up）保持正常運作
- 探測細節（以便快速解釋失敗原因）：
  - `read` probe：測試在工作區寫入一個 nonce 檔案，並要求 agent `read` 它並回傳 nonce。
  - `exec+read` probe：測試要求 agent `exec`-write 一個 nonce 到暫存檔，然後 `read` 回傳。
  - image probe：測試附加一個生成的 PNG（貓 + 隨機代碼），並期望模型回傳 `cat <CODE>`。
  - 實作參考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何啟用：
  - `pnpm test:live`（若直接呼叫 Vitest 則為 `OPENCLAW_LIVE_TEST=1`）
- 如何選擇模型：
  - 預設：現代允許清單（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.1、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是現代允許清單的別名
  - 或設定 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗號清單）來縮小範圍
- 如何選擇提供商（避免「OpenRouter 全選」）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗號允許清單）
- 在此即時測試中，工具與圖片探測始終開啟：
  - `read` probe + `exec+read` probe（工具壓力測試）
  - 當模型宣稱支援圖像輸入時，會執行圖像探測
  - 流程（高層次）：
    - 測試會生成一個含有「CAT」和隨機代碼的微小 PNG (`src/gateway/live-image-probe.ts`)
    - 透過 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 發送
    - Gateway 將附件解析為 `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - 內嵌代理程式將多模態使用者訊息轉發給模型
    - 斷言：回覆包含 `cat` + 代碼（OCR 容錯：允許微小錯誤）

提示：若要查看您可以在機器上測試的內容（以及確切的 `provider/model` id），請執行：

```bash
openclaw models list
openclaw models list --json
```

## Live：Anthropic setup-token smoke

- 測試：`src/agents/anthropic.setup-token.live.test.ts`
- 目標：驗證 Claude Code CLI setup-token（或貼上的 setup-token profile）能否完成 Anthropic 提示。
- 啟用：
  - `pnpm test:live`（若直接呼叫 Vitest 則為 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Token 來源（擇一）：
  - Profile：`OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - 原始 token：`OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- 模型覆寫（選用）：
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-5`

設定範例：

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live：CLI 後端 smoke (Claude Code CLI 或其他本機 CLI)

- 測試：`src/gateway/gateway-cli-backend.live.test.ts`
- 目標：使用本機 CLI 後端驗證 Gateway + 代理程式管線，而不動到您的預設設定。
- 啟用：
  - `pnpm test:live`（若直接呼叫 Vitest 則為 `OPENCLAW_LIVE_TEST=1`）
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
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 以傳送真實的圖像附件（路徑會被注入到提示中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 以透過 CLI 參數傳遞圖像檔案路徑，而非透過提示注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）用於控制在設定 `IMAGE_ARG` 時如何傳遞圖像參數。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 以發送第二輪對話並驗證恢復流程。
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` 以保持 Claude Code CLI MCP 配置啟用（預設會使用暫存空白檔案停用 MCP 配置）。

範例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-5" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### 推薦的 Live 測試配方

狹隘且明確的允許清單是最快且最不穩定的：

- 單一模型，直接（無閘道）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 單一模型，閘道冒煙測試：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多個供應商的工具呼叫：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.1" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 重點（Gemini API 金鑰 + Antigravity）：
  - Gemini（API 金鑰）： `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity（OAuth）： `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-5-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

備註：

- `google/...` 使用 Gemini API（API 金鑰）。
- `google-antigravity/...` 使用 Antigravity OAuth 橋接器（Cloud Code Assist 風格的代理端點）。
- `google-gemini-cli/...` 使用您機器上的本機 Gemini CLI（獨立的驗證 + 工具特性）。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 透過 HTTP 呼叫 Google 託管的 Gemini API（API 金鑰 / 設定檔驗證）；這是大多數使用者所說的「Gemini」。
  - CLI：OpenClaw 呼叫本機 `gemini` 二進位檔；它有自己的驗證方式，且行為可能有所不同（串流 / 工具支援 / 版本差異）。

## Live：模型矩陣（涵蓋範圍）

沒有固定的「CI 模型清單」（Live 測試為選用），但這些是**推薦**在開發機器上使用金鑰定期涵蓋的模型。

### 現代冒煙測試集（工具呼叫 + 圖片）

這是我們預期持續運作的「通用模型」執行：

- OpenAI（非 Codex）： `openai/gpt-5.2`（選用： `openai/gpt-5.1`）
- OpenAI Codex： `openai-codex/gpt-5.2`（選用： `openai-codex/gpt-5.2-codex`）
- Anthropic： `anthropic/claude-opus-4-5`（或 `anthropic/claude-sonnet-4-5`）
- Google（Gemini API）： `google/gemini-3-pro-preview` 和 `google/gemini-3-flash-preview`（避免使用較舊的 Gemini 2.x 模型）
- Google（Antigravity）： `google-antigravity/claude-opus-4-5-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI（GLM）： `zai/glm-4.7`
- MiniMax： `minimax/minimax-m2.1`

使用工具 + 圖片執行閘道冒煙測試：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.2,anthropic/claude-opus-4-5,google/gemini-3-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-5-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.1" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基準：工具呼叫（讀取 + 選用執行）

每個提供商系列至少選擇一個：

- OpenAI：`openai/gpt-5.2`（或 `openai/gpt-5-mini`）
- Anthropic：`anthropic/claude-opus-4-5`（或 `anthropic/claude-sonnet-4-5`）
- Google：`google/gemini-3-flash-preview`（或 `google/gemini-3-pro-preview`）
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/minimax-m2.1`

額外的選用覆蓋範圍（最好具備）：

- xAI：`xai/grok-4`（或最新可用版本）
- Mistral：`mistral/`…（選擇一個您已啟用且支援「工具」的模型）
- Cerebras：`cerebras/`…（如果您有權限存取）
- LM Studio：`lmstudio/`…（本機；工具呼叫取決於 API 模式）

### 視覺：圖片傳送（附件 → 多模態訊息）

請在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中包含至少一個支援圖片的模型（Claude/Gemini/OpenAI 支援視覺的變體等），以執行圖片探測。

### 聚合器 / 其他閘道

如果您啟用了金鑰，我們也支援透過以下方式進行測試：

- OpenRouter：`openrouter/...`（數百種模型；使用 `openclaw models scan` 尋找支援工具與圖片的候選）
- OpenCode Zen：`opencode/...`（透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 進行驗證）

您可以將更多提供商納入即時矩陣（如果您有憑證/設定）：

- 內建：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 透過 `models.providers`（自訂端點）：`minimax`（雲端/API），加上任何 OpenAI/Anthropic 相容的代理（LM Studio、vLLM、LiteLLM 等）

提示：不要嘗試在文件中將「所有模型」硬編碼。權威清單是 `discoverModels(...)` 在您的機器上返回的任何內容 + 可用的任何金鑰。

## 憑證（絕不提交）

即時測試以與 CLI 相同的方式發現憑證。實際影響：

- 如果 CLI 有效，即時測試應該能找到相同的金鑰。
- 如果即時測試顯示「no creds」，請像調試 `openclaw models list` / 模型選擇那樣進行調試。

- 設定檔存儲：`~/.openclaw/credentials/`（首選；即測試中「設定檔金鑰」的含義）
- 設定：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）

如果您想依賴環境變數金鑰（例如在您的 `~/.profile` 中匯出的），請在 `source ~/.profile` 之後執行本地測試，或使用下方的 Docker 執行器（它們可以將 `~/.profile` 掛載到容器中）。

## Deepgram 即時（音訊轉錄）

- 測試：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 啟用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## Docker 執行器（可選的「適用於 Linux」檢查）

這些在倉庫 Docker 映像檔內執行 `pnpm test:live`，掛載您的本地設定檔目錄和工作區（如果已掛載，則匯入 `~/.profile`）：

- 直接模型：`pnpm test:docker:live-models`（腳本：`scripts/test-live-models-docker.sh`）
- Gateway + dev agent：`pnpm test:docker:live-gateway`（腳本：`scripts/test-live-gateway-models-docker.sh`）
- Onboarding 精靈（TTY，完整腳手架）：`pnpm test:docker:onboard`（腳本：`scripts/e2e/onboard-docker.sh`）
- Gateway 網路（兩個容器，WS 認證 + 健康檢查）：`pnpm test:docker:gateway-network`（腳本：`scripts/e2e/gateway-network-docker.sh`）
- 外掛程式（自訂擴充功能載入 + 註冊表冒煙測試）：`pnpm test:docker:plugins`（腳本：`scripts/e2e/plugins-docker.sh`）

有用的環境變數：

- `OPENCLAW_CONFIG_DIR=...`（預設：`~/.openclaw`）掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（預設：`~/.openclaw/workspace`）掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（預設：`~/.profile`）掛載至 `/home/node/.profile` 並在執行測試前匯入
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以縮小執行範圍
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以確保憑證來自設定檔存放區（而非環境變數）

## 文件完整性檢查

編輯文件後執行檢查：`pnpm docs:list`。

## 離線回歸測試（CI 安全）

這些是不含真實供應商的「真實管線」回歸測試：

- Gateway 工具呼叫（模擬 OpenAI、真實 gateway + agent 迴圈）：`src/gateway/gateway.tool-calling.mock-openai.test.ts`
- Gateway 精靈（WS `wizard.start`/`wizard.next`，寫入設定 + 強制執行驗證）：`src/gateway/gateway.wizard.e2e.test.ts`

## Agent 可靠性評估（Skills）

我們已經有一些 CI 安全的測試，其行為類似於「agent 可靠性評估」：

- 透過真實 gateway + agent 迴圈進行模擬工具呼叫（`src/gateway/gateway.tool-calling.mock-openai.test.ts`）。
- 驗證 session 連線和設定效果的端到端精靈流程（`src/gateway/gateway.wizard.e2e.test.ts`）。

Skills 尚未具備的部分（請參閱 [Skills](/zh-Hant/tools/skills)）：

- **決策制定：**當 Skills 列於提示中時，agent 是否選擇正確的 skill（或避免不相關的）？
- **合規性：**agent 是否在使用前閱讀 `SKILL.md` 並遵循必要的步驟/參數？
- **工作流程約定：**斷言工具順序、session 歷史傳遞以及沙箱邊界的多輪次情境。

未來的評估應首先保持確定性：

- 使用模擬供應商的情境執行器，以斷言工具呼叫 + 順序、skill 檔案讀取以及 session 連線。
- 一組專注於 skill 的小型測試情境（使用 vs 避免、閘控、提示注入）。
- 僅在 CI 安全測試套件就位後，才進行選用的即時評估（選擇加入、環境變數閘控）。

## 新增回歸測試（指導原則）

當您修復在即時測試中發現的供應商/模型問題時：

- 盡可能新增 CI 安全的回歸測試（模擬/Stub 供應商，或擷取確切的要求形狀轉換）
- 如果本質上僅限即時執行（速率限制、驗證策略），請讓即時測試保持精簡並透過環境變數選擇加入
- 優先針對發現問題的最小層級：
  - 供應商請求轉換/重放錯誤 → 直接模型測試
  - gateway session/歷史/工具管線錯誤 → gateway 即時冒煙測試或 CI 安全 gateway 模擬測試

import en from "/components/footer/en.mdx";

<en />
