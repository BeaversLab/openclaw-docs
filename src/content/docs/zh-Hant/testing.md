---
summary: "測試套件：單元/e2e/live 測試組、Docker 執行器，以及各個測試涵蓋的範圍"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "測試"
---

# 測試

OpenClaw 有三個 Vitest 測試組（單元/整合、e2e、live）和一小組 Docker 執行器。

這份文件是一份「我們如何測試」指南：

- 各測試組涵蓋的範圍（以及它刻意*不*涵蓋的範圍）
- 常見工作流程應執行的指令（本機、推送前、除錯）
- Live 測試如何探索憑證並選擇模型/供應商
- 如何為真實世界的模型/供應商問題新增回歸測試

## 快速入門

大部分時候：

- 完整閘道（推送前預期執行）：`pnpm build && pnpm check && pnpm test`

當您更動測試或需要更多信心時：

- 覆蓋率閘道：`pnpm test:coverage`
- E2E 測試組：`pnpm test:e2e`

當對真實供應商/模型進行除錯時（需要真實憑證）：

- Live 測試組（模型 + 閘道工具/圖像探測）：`pnpm test:live`

提示：當您只需要一個失敗案例時，建議使用下文描述的允許清單環境變數來縮小 Live 測試的範圍。

## 測試組（什麼在哪裡執行）

將這些測試組視為「真實度遞增」（以及不穩定性/成本遞增）：

### 單元 / 整合（預設）

- 指令：`pnpm test`
- 設定：`vitest.config.ts`
- 檔案：`src/**/*.test.ts`
- 範圍：
  - 純單元測試
  - 程序內整合測試（閘道驗證、路由、工具、解析、設定）
  - 已知錯誤的確定性回歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實金鑰
  - 應快速且穩定

### E2E（閘道冒煙測試）

- 指令：`pnpm test:e2e`
- 設定：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`
- 範圍：
  - 多實例閘道的端到端行為
  - WebSocket/HTTP 介面、節點配對，以及較重的網路操作
- 預期：
  - 在 CI 中執行（當在管線中啟用時）
  - 不需要真實金鑰
  - 比單元測試有更多移動部件（可能較慢）

### Live（真實供應商 + 真實模型）

- 指令：`pnpm test:live`
- 設定：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`
- 預設：由 `pnpm test:live` **啟用**（設定 `OPENCLAW_LIVE_TEST=1`）
- 範圍：
  - 「這個供應商/模型在今天是否真的能使用真實憑證運作？」
  - 捕捉供應商格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期：
  - 基於設計不適合在 CI 中穩定運作（真實網路、真實供應商政策、配額、服務中斷）
  - 需要花費金錢 / 會使用速率限制
  - 偏好執行縮減後的子集，而不是「全部」
  - Live 執行會 source `~/.profile` 以取得遺失的 API 金鑰
  - Anthropic 金鑰輪換：設定 `OPENCLAW_LIVE_ANTHROPIC_KEYS="sk-...,sk-..."`（或 `OPENCLAW_LIVE_ANTHROPIC_KEY=sk-...`）或多個 `ANTHROPIC_API_KEY*` 變數；測試會在遇到速率限制時重試

## 我應該執行哪個測試套件？

使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test`（如果您修改了很多內容，還要執行 `pnpm test:coverage`）
- 涉及 Gateway 網路 / WS 協定 / 配對：新增 `pnpm test:e2e`
- 除錯「我的機器人掛了」/ 供應商特定錯誤 / 工具呼叫：執行縮減範圍的 `pnpm test:live`

## Live：模型冒煙測試 (profile keys)

Live 測試分為兩個層級，以便我們隔離錯誤：

- 「直接模型」告訴我們該供應商/模型是否能使用給定的金鑰回答。
- 「Gateway 冒煙測試」告訴我們完整的 gateway+agent 管線是否對該模型有效（sessions、history、tools、sandbox policy 等）。

### 第一層：直接模型補全（無 gateway）

- 測試：`src/agents/models.profiles.live.test.ts`
- 目標：
  - 列舉探索到的模型
  - 使用 `getApiKeyForModel` 來選擇您有憑證的模型
  - 對每個模型執行一個小型補全（以及在需要時執行目標回歸測試）
- 如何啟用：
  - `pnpm test:live`（如果直接呼叫 Vitest，則為 `OPENCLAW_LIVE_TEST=1`）
- 設定 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，現代版的別名）以實際執行此套件；否則它會跳過，以保持 `pnpm test:live` 專注於 gateway 冒煙測試
- 如何選擇模型：
  - `OPENCLAW_LIVE_MODELS=modern` 以執行現代允許清單（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.1、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是現代允許清單的別名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,..."`（逗號分隔允許清單）
- 如何選擇供應商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗號分隔允許清單）
- 金鑰來源：
  - 預設：profile store 和 env 後備
  - 設定 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制僅使用 **profile store**
- 存在原因：
  - 區分「provider API 故障 / 金鑰無效」與「gateway agent pipeline 故障」
  - 包含小型、獨立的回歸測試（範例：OpenAI Responses/Codex Responses 推理重播 + tool-call 流程）

### Layer 2: Gateway + dev agent smoke（「@openclaw」實際執行的內容）

- 測試：`src/gateway/gateway-models.profiles.live.test.ts`
- 目標：
  - 啟動一個程序內 gateway
  - 建立/修補 `agent:dev:*` session（每次執行的模型覆蓋）
  - 迭代帶有金鑰的模型並斷言：
    - 「有意義」的回應（無工具）
    - 真實的工具調用有效（read probe）
    - 可選的額外工具 probes（exec+read probe）
    - OpenAI 回歸路徑（tool-call-only → follow-up）持續正常運作
- Probe 詳情（方便您快速解釋失敗原因）：
  - `read` probe：測試在工作區寫入一個 nonce 檔案，並要求 agent `read` 該檔案並將 nonce 回傳。
  - `exec+read` probe：測試要求 agent `exec`-write 一個 nonce 到暫存檔案，然後 `read` 回傳。
  - image probe：測試附加一個生成的 PNG（cat + 隨機程式碼）並預期模型回傳 `cat <CODE>`。
  - 實作參考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何啟用：
  - `pnpm test:live`（若直接呼叫 Vitest 則為 `OPENCLAW_LIVE_TEST=1`）
- 如何選擇模型：
  - 預設：現代允許清單（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.1、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是現代允許清單的別名
  - 或設定 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗號清單）以縮小範圍
- 如何選擇 providers（避免「全走 OpenRouter」）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗號允許清單）
- 在此 live 測試中，工具 + image probes 始終開啟：
  - `read` probe + `exec+read` probe（工具壓力測試）
  - 當模型宣稱支援圖片輸入時執行 image probe
  - 流程（高層次）：
    - 測試生成一個帶有「CAT」+ 隨機程式碼的小型 PNG（`src/gateway/live-image-probe.ts`）
    - 透過 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 發送
    - Gateway 將附件解析為 `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - Embedded agent 將多模態使用者訊息轉發給模型
    - 斷言：回覆包含 `cat` + 程式碼 (OCR 容錯：允許小幅錯誤)

提示：若要查看您可以在機器上測試什麼（以及確切的 `provider/model` id），請執行：

```bash
openclaw models list
openclaw models list --json
```

## Live：Anthropic setup-token smoke

- 測試：`src/agents/anthropic.setup-token.live.test.ts`
- 目標：驗證 Claude Code CLI setup-token（或貼上的 setup-token profile）能否完成 Anthropic prompt。
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

## Live：CLI backend smoke (Claude Code CLI 或其他本地 CLIs)

- 測試：`src/gateway/gateway-cli-backend.live.test.ts`
- 目標：使用本地 CLI backend 驗證 Gateway + agent pipeline，且不影響您的預設配置。
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
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 以傳送真實圖片附件（路徑會被注入到 prompt 中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 以將圖片檔案路徑作為 CLI 參數傳遞，而非透過 prompt 注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）用於設定 `IMAGE_ARG` 時控制圖片參數的傳遞方式。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 以傳送第二輪對話並驗證恢復流程。
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` 以保持 Claude Code CLI MCP 配置啟用（預設會使用臨時空白檔案停用 MCP 配置）。

範例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-5" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### 推薦的 Live 配方

狹窄且明確的允許清單速度最快且最不穩定：

- 單一模型，直接（無閘道）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 單一模型，閘道冒煙測試：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多個供應商的工具呼叫：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-5,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.1" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 側重（Gemini API 金鑰 + Antigravity）：
  - Gemini (API 金鑰): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-5-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

註記：

- `google/...` 使用 Gemini API (API 金鑰)。
- `google-antigravity/...` 使用 Antigravity OAuth 橋接器 (Cloud Code Assist 風格的代理端點)。
- `google-gemini-cli/...` 使用您機器上的本機 Gemini CLI（獨立的驗證 + 工具怪癖）。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 透過 HTTP 呼叫 Google 託管的 Gemini API (API 金鑰 / 設定檔驗證)；這是大多數使用者所指的「Gemini」。
  - CLI：OpenClaw 呼叫本機的 `gemini` 二進位檔案；它有自己的驗證方式，且行為可能有所不同 (串流/工具支援/版本偏差)。

## Live: 模型矩陣（涵蓋範圍）

沒有固定的「CI 模型清單」(live 是選用的)，但這些是建議在開發機器上使用金鑰定期涵蓋的**推薦**模型。

### 現代冒煙測試集（工具呼叫 + 圖片）

這是我們期望保持運作的「常見模型」執行：

- OpenAI (非 Codex): `openai/gpt-5.2` (選用: `openai/gpt-5.1`)
- OpenAI Codex: `openai-codex/gpt-5.2` (選用: `openai-codex/gpt-5.2-codex`)
- Anthropic: `anthropic/claude-opus-4-5` (或 `anthropic/claude-sonnet-4-5`)
- Google (Gemini API): `google/gemini-3-pro-preview` 和 `google/gemini-3-flash-preview` (避免較舊的 Gemini 2.x 模型)
- Google (Antigravity): `google-antigravity/claude-opus-4-5-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/minimax-m2.1`

使用工具 + 圖片執行閘道冒煙測試：
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
- Mistral: `mistral/`… (挑選一個您已啟用的支援「工具」功能的模型)
- Cerebras: `cerebras/`… (如果您有存取權限)
- LM Studio: `lmstudio/`… (本機；工具呼叫取決於 API 模式)

### Vision：影像傳送 (附件 → 多模態訊息)

請在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一個支援影像的模型（Claude/Gemini/OpenAI 支援視覺的變體等），以執行影像探測。

### 聚合器 / 替代閘道

如果您啟用了金鑰，我們也支援透過以下方式進行測試：

- OpenRouter: `openrouter/...` (數百種模型；使用 `openclaw models scan` 尋找支援工具與影像的候選者)
- OpenCode Zen: `opencode/...` (透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 進行驗證)

更多您可以包含在即時矩陣中的提供商（如果您有憑證/設定）：

- 內建：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 透過 `models.providers` (自訂端點)：`minimax` (雲端/API)，以及任何 OpenAI/Anthropic 相容的 Proxy (LM Studio、vLLM、LiteLLM 等)

提示：請嘗試在文件中硬編碼「所有模型」。權威清單是您的機器上 `discoverModels(...)` 返回的內容加上可用的金鑰。

## 憑證（切勿提交）

即時測試與 CLI 使用相同的方式發現憑證。實際影響：

- 如果 CLI 能運作，即時測試應該能找到相同的金鑰。
- 如果即時測試顯示「no creds」，請使用與偵錯 `openclaw models list` / 模型選擇相同的方式進行偵錯。

- 設定檔儲存：`~/.openclaw/credentials/`（首選；即測試中「設定檔金鑰」的含義）
- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）

如果您想依賴環境變數金鑰（例如在您的 `~/.profile` 中匯出的），請在 `source ~/.profile` 之後執行本地測試，或使用下方的 Docker 執行器（它們可以將 `~/.profile` 掛載到容器中）。

## Deepgram 即時（音訊轉錄）

- 測試：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 啟用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## Docker 執行器（選用的「適用於 Linux」檢查）

這些會在儲存庫 Docker 映像檔內執行 `pnpm test:live`，掛載您的本機配置目錄和工作區（並在掛載時讀取 `~/.profile`）：

- 直接模型：`pnpm test:docker:live-models`（腳本：`scripts/test-live-models-docker.sh`）
- 閘道 + 開發代理程式：`pnpm test:docker:live-gateway`（腳本：`scripts/test-live-gateway-models-docker.sh`）
- 入門嚮導（TTY，完整腳手架）：`pnpm test:docker:onboard`（腳本：`scripts/e2e/onboard-docker.sh`）
- 閘道網路（兩個容器，WS 驗證 + 健康狀態）：`pnpm test:docker:gateway-network`（腳本：`scripts/e2e/gateway-network-docker.sh`）
- 外掛程式（自訂擴充功能載入 + 登錄檔冒煙測試）：`pnpm test:docker:plugins`（腳本：`scripts/e2e/plugins-docker.sh`）

有用的環境變數：

- `OPENCLAW_CONFIG_DIR=...`（預設值：`~/.openclaw`）掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（預設值：`~/.openclaw/workspace`）掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（預設值：`~/.profile`）掛載至 `/home/node/.profile` 並在執行測試前讀取
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以縮小執行範圍
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以確保憑證來自設定檔儲存（而非環境變數）

## 文件檢查"

在編輯文件後執行文件檢查：`pnpm docs:list`。

## 離線回歸（CI 安全）

這些是沒有真實提供者的「真實管線」回歸測試：

- Gateway 工具呼叫（模擬 OpenAI、真實 gateway + agent 迴圈）：`src/gateway/gateway.tool-calling.mock-openai.test.ts`
- Gateway 精靈（WS `wizard.start`/`wizard.next`，寫入設定檔 + 強制執行驗證）：`src/gateway/gateway.wizard.e2e.test.ts`

## Agent 可靠性評估（技能）

我們已經有一些 CI 安全的測試，其行為類似「agent 可靠性評估」：

- 透過真實 gateway + agent 迴圈進行模擬工具呼叫（`src/gateway/gateway.tool-calling.mock-openai.test.ts`）。
- 驗證連線接線與配置效果的端對端精靈流程（`src/gateway/gateway.wizard.e2e.test.ts`）。

技能方面仍缺少的內容（請參閱 [技能](/en/tools/skills)）：

- **決策：** 當提示中列出技能時，agent 是否會選擇正確的技能（或避免不相關的技能）？
- **合規性：** agent 是否在使用前讀取 `SKILL.md` 並遵循必要的步驟/參數？
- **工作流程合約：** 斷言工具順序、對話歷史傳遞和沙箱邊界的多輪情境。

未來的評估應首先保持確定性：

- 使用模擬提供者的情境執行器，以斷言工具呼叫和順序、技能檔案讀取以及連線接線。
- 一小套以技能為導向的情境（使用 vs 避免、閘控、提示注入）。
- 僅在 CI 安全套件到位後，才進行選用的即時評估（選用、受環境變數限制）。

## 新增回歸測試（指導）

當您修復在即時測試中發現的提供者/模型問題時：

- 如果可能，請新增 CI 安全的回歸測試（模擬/存根提供者，或捕獲確切的請求形狀轉換）
- 如果本質上僅限即時測試（速率限制、驗證策略），請保持即時測試狹窄，並透過環境變數啟用
- 優先以發現錯誤的最小層級為目標：
  - 提供者請求轉換/重播錯誤 → 直接模型測試
  - gateway 會話/歷史/工具管線錯誤 → gateway 即時冒煙測試或 CI 安全 gateway 模擬測試
