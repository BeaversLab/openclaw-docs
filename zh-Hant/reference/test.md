---
summary: "如何在本地執行測試 (vitest) 以及何時使用 force/coverage 模式"
read_when:
  - Running or fixing tests
title: "測試"
---

# 測試

- 完整的測試套件 (suites, live, Docker)：[測試](/zh-Hant/help/testing)

- `pnpm test:force`：終止任何佔用預設控制埠的殘留 gateway 進程，然後使用獨立的 gateway 埠執行完整的 Vitest 測試套件，以避免伺服器測試與運行中的實例發生衝突。當之前的 gateway 執行導致 18789 埠被佔用時，請使用此指令。
- `pnpm test:coverage`：使用 V8 覆蓋率執行單元測試套件 (透過 `vitest.unit.config.ts`)。全域閾值為 70% 的行/分支/函式/陳述式。覆蓋率計算排除了重度整合的進入點 (CLI 接線、gateway/telegram 橋接器、webchat 靜態伺服器)，以便將目標集中在可進行單元測試的邏輯上。
- 在 Node 22、23 和 24 上執行 `pnpm test` 時，預設使用 Vitest `vmForks` 以加快啟動速度。Node 25+ 在重新驗證之前會回退到 `forks`。您可以使用 `OPENCLAW_TEST_VM_FORKS=0|1` 強制指定行為。
- `pnpm test`：預設執行快速核心單元通道，以提供快速的本地反饋。
- `pnpm test:channels`：執行重度通道的測試套件。
- `pnpm test:extensions`：執行擴充功能/外掛程式測試套件。
- Gateway 整合測試：透過 `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` 或 `pnpm test:gateway` 選擇加入。
- `pnpm test:e2e`：執行 gateway 端對端冒煙測試 (多實例 WS/HTTP/node 配對)。預設使用 `vmForks` 加上 `vitest.e2e.config.ts` 中的自適應工作執行緒；可使用 `OPENCLAW_E2E_WORKERS=<n>` 進行調整，並設定 `OPENCLAW_E2E_VERBOSE=1` 以取得詳細日誌。
- `pnpm test:live`：執行供應商即時測試 (minimax/zai)。需要 API 金鑰和 `LIVE=1` (或供應商專屬的 `*_LIVE_TEST=1`) 來取消跳過。

## 本地 PR 閘道

若要進行本地 PR land/gate 檢查，請執行：

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

如果 `pnpm test` 在負載較高的主機上出現不穩定，請先重新執行一次再視為回歸問題，然後使用 `pnpm vitest run <path/to/test>` 進行隔離。對於記憶體受限的主機，請使用：

- `OPENCLAW_TEST_PROFILE=low OPENCLAW_TEST_SERIAL_GATEWAY=1 pnpm test`

## 模型延遲基準測試 (本機金鑰)

腳本：[`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

使用方法：

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- 可選環境變數：`MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- 預設提示詞：「請用一個單字回覆：ok。不要標點符號或多餘文字。」

上次執行 (2025-12-31，20 次執行)：

- minimax 中位數 1279ms (最小 1114，最大 2431)
- opus 中位數 2454ms (最小 1224，最大 3170)

## CLI 啟動基準測試

腳本：[`scripts/bench-cli-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-cli-startup.ts)

使用方法：

- `pnpm tsx scripts/bench-cli-startup.ts`
- `pnpm tsx scripts/bench-cli-startup.ts --runs 12`
- `pnpm tsx scripts/bench-cli-startup.ts --entry dist/entry.js --timeout-ms 45000`

此基準測試涵蓋以下指令：

- `--version`
- `--help`
- `health --json`
- `status --json`
- `status`

輸出包含每個指令的平均值、p50、p95、最小/最大值，以及結束代碼/訊號分佈。

## 上線 E2E 測試 (Docker)

Docker 為選用；此項僅適用於容器化的上線冒煙測試。

在乾淨的 Linux 容器中進行完整的冷啟動流程：

```bash
scripts/e2e/onboard-docker.sh
```

此腳本透過偽終端機驅動互動式精靈，驗證設定/工作區/工作階段檔案，然後啟動 gateway 並執行 `openclaw health`。

## QR 匯入冒煙測試 (Docker)

確保 `qrcode-terminal` 可在支援的 Docker Node 執行環境下載入 (預設為 Node 24，相容 Node 22)：

```bash
pnpm test:docker:qr
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
