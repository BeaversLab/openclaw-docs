---
summary: "如何在本機執行測試 (vitest) 以及何時使用 force/coverage 模式"
read_when:
  - Running or fixing tests
title: "測試"
---

# 測試

- 完整的測試套件（套件、即時、Docker）：[Testing](/en/help/testing)

- `pnpm test:force`：終止任何佔用預設控制埠的殘留 gateway 程序，然後使用隔離的 gateway 埠執行完整的 Vitest 套件，以免伺服器測試與執行中的實例衝突。當先前的 gateway 執行留下佔用 18789 埠時使用此選項。
- `pnpm test:coverage`：使用 V8 覆蓋率 (透過 `vitest.unit.config.ts`) 執行單元套件。全域閾值為 70% 的行/分支/函式/陳述式。覆蓋率排除重度整合的進入點 (CLI 接線、gateway/telegram 橋接器、webchat 靜態伺服器)，以將目標集中在可進行單元測試的邏輯上。
- `pnpm test:coverage:changed`：僅對自 `origin/main` 以來變更的檔案執行單元覆蓋率。
- `pnpm test:changed`：當差異僅涉及可路由的原始碼/測試檔案時，將變更的 git 路徑擴充為範圍化的 Vitest 通道。組態/設定變更仍會回退至原生的根專案執行，以便在需要時廣泛重新執行連線編輯。
- `pnpm test`：透過範圍化的 Vitest 通道路由明確的檔案/目錄目標。未指定目標的執行現在會依序執行十一個分片組態（`vitest.full-core-unit-src.config.ts`、`vitest.full-core-unit-security.config.ts`、`vitest.full-core-unit-ui.config.ts`、`vitest.full-core-unit-support.config.ts`、`vitest.full-core-support-boundary.config.ts`、`vitest.full-core-contracts.config.ts`、`vitest.full-core-bundled.config.ts`、`vitest.full-core-runtime.config.ts`、`vitest.full-agentic.config.ts`、`vitest.full-auto-reply.config.ts`、`vitest.full-extensions.config.ts`），而不是單一巨大的根專案程序。
- 選定的 `plugin-sdk` 和 `commands` 測試檔案現在會透過專用的輕量級通道路由，這些通道僅保留 `test/setup.ts`，而將執行時間較長的案例保留在現有通道中。
- 選定的 `plugin-sdk` 和 `commands` 輔助原始碼檔案也會將 `pnpm test:changed` 對應到這些輕量級通道中的明確同級測試，因此對輔助程式的小幅編輯可避免重新執行繁重的執行時期支援套件。
- `auto-reply` 現在也會分割為三個專用組態（`core`、`top-level`、`reply`），以便回覆測試框架不會掩蓋較輕量的頂層狀態/權杖/輔助測試。
- 基礎 Vitest 組態現在預設為 `pool: "threads"` 和 `isolate: false`，並在所有儲存庫組態中啟用了共用的非隔離執行器。
- `pnpm test:channels` 會執行 `vitest.channels.config.ts`。
- `pnpm test:extensions` 會執行 `vitest.extensions.config.ts`。
- `pnpm test:extensions`：執行擴充功能/外掛程式套件。
- `pnpm test:perf:imports`：啟用 Vitest 匯入持續時間與匯入分解報告，同時仍對明確的檔案/目錄目標使用範圍化的通道路由。
- `pnpm test:perf:imports:changed`: 相同的匯入性能分析，但僅針對自 `origin/main` 以來變更的檔案。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 針對相同的已提交 git diff，對比路由變更模式路徑與原生根專案執行進行基準測試。
- `pnpm test:perf:changed:bench -- --worktree` 在不先提交的情況下，對當前工作樹變更集進行基準測試。
- `pnpm test:perf:profile:main`: 為 Vitest 主執行緒 (`.artifacts/vitest-main-profile`) 撰寫 CPU 設定檔。
- `pnpm test:perf:profile:runner`: 為單元執行器 (`.artifacts/vitest-runner-profile`) 撰寫 CPU + heap 設定檔。
- Gateway 整合：透過 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 啟用。
- `pnpm test:e2e`: 執行 Gateway 端到端煙霧測試 (多實例 WS/HTTP/node 配對)。預設為在 `vitest.e2e.config.ts` 中使用自適應工作執行個體的 `threads` + `isolate: false`；可透過 `OPENCLAW_E2E_WORKERS=<n>` 調整，並設定 `OPENCLAW_E2E_VERBOSE=1` 以取得詳細日誌。
- `pnpm test:live`: 執行供應商即時測試 (minimax/zai)。需要 API 金鑰和 `LIVE=1` (或供應商特定的 `*_LIVE_TEST=1`) 以取消跳過。
- `pnpm test:docker:openwebui`: 啟動 Docker 化的 OpenClaw + Open WebUI，透過 Open WebUI 登入，檢查 `/api/models`，然後透過 `/api/chat/completions` 執行真實的代理聊天。需要可用的即時模型金鑰 (例如 `~/.profile` 中的 OpenAI)，會拉取外部 Open WebUI 映像檔，且不預期像一般單元/e2e 測試套件那樣在 CI 中穩定。
- `pnpm test:docker:mcp-channels`: 啟動一個已設定種子的 Gateway 容器和第二個產生 `openclaw mcp serve` 的用戶端容器，然後透過真實的 stdio 橋接器驗證路由對話探索、逐字稿讀取、附件中繼資料、即時事件佇列行為、輸出傳送路由，以及 Claude 風格的頻道 + 權限通知。Claude 通知斷言會直接讀取原始 stdio MCP 幀，因此煙霧測試反映了橋接器的實際輸出內容。

## 本機 PR 閘道

若要進行本機 PR 併入/閘道檢查，請執行：

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在負載較高的主機上不穩定，請在將其視為回歸問題之前重新執行一次，然後使用 `pnpm test <path/to/test>` 進行隔離。對於記憶體受限的主機，請使用：

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## 模型延遲基準測試（本地金鑰）

腳本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

使用方法：

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 可選環境變數：`MINIMAX_API_KEY`、`MINIMAX_BASE_URL`、`MINIMAX_MODEL`、`ANTHROPIC_API_KEY`
- 預設提示詞：「Reply with a single word: ok. No punctuation or extra text.」

最近執行（2025-12-31，20 次執行）：

- minimax 中位數 1279ms（最小 1114，最大 2431）
- opus 中位數 2454ms（最小 1224，最大 3170）

## CLI 啟動基準測試

腳本：[`scripts/bench-cli-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-cli-startup.ts)

使用方法：

- `pnpm test:startup:bench`
- `pnpm test:startup:bench:smoke`
- `pnpm test:startup:bench:save`
- `pnpm test:startup:bench:update`
- `pnpm test:startup:bench:check`
- `pnpm tsx scripts/bench-cli-startup.ts`
- `pnpm tsx scripts/bench-cli-startup.ts --runs 12`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case status --case gatewayStatus --runs 3`
- `pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all`
- `pnpm tsx scripts/bench-cli-startup.ts --preset all --output .artifacts/cli-startup-bench-all.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case gatewayStatusJson --output .artifacts/cli-startup-bench-smoke.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu`
- `pnpm tsx scripts/bench-cli-startup.ts --json`

預設：

- `startup`：`--version`、`--help`、`health`、`health --json`、`status --json`、`status`
- `real`：`health`、`status`、`status --json`、`sessions`、`sessions --json`、`agents list --json`、`gateway status`、`gateway status --json`、`gateway health --json`、`config get gateway.port`
- `all`：兩種預設

輸出包含 `sampleCount`、平均值、p50、p95、最小/最大值、退出代碼/訊號分佈以及每個指令的最大 RSS 摘要。可選的 `--cpu-prof-dir` / `--heap-prof-dir` 會在每次執行時寫入 V8 設定檔，以便計時和設定檔捕獲使用相同的測試工具。

已儲存的輸出慣例：

- `pnpm test:startup:bench:smoke` 將目標的測試構件寫入 `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` 使用 `runs=5` 和 `warmup=1` 將完整套件的構件寫入 `.artifacts/cli-startup-bench-all.json`
- `pnpm test:startup:bench:update` 使用 `runs=5` 和 `warmup=1` 重新整理存入儲存庫的基準設備於 `test/fixtures/cli-startup-bench.json`

存入儲存庫的設備：

- `test/fixtures/cli-startup-bench.json`
- 使用 `pnpm test:startup:bench:update` 重新整理
- 使用 `pnpm test:startup:bench:check` 將目前的結果與設備進行比較

## 入門端對端測試 (Docker)

Docker 是選用的；這僅用於容器化的入門測試。

在乾淨的 Linux 容器中進行完整的冷啟動流程：

```bash
scripts/e2e/onboard-docker.sh
```

此腳本透過偽終端機驅動互動式精靈，驗證設定/工作區/工作階段檔案，然後啟動閘道並執行 `openclaw health`。

## QR 匯入測試 (Docker)

確保 `qrcode-terminal` 在支援的 Docker Node 執行環境下載入 (Node 24 預設，Node 22 相容)：

```bash
pnpm test:docker:qr
```
