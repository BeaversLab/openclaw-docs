---
summary: "除錯工具：監看模式、原始模型串流以及追蹤推理洩漏"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "除錯"
---

用於串流輸出的除錯輔助工具，特別是當供應商將推理混合到正常文字中時。

## 執行時期除錯覆寫

在聊天中使用 `/debug` 來設定 **僅限執行時期** 的設定覆寫（記憶體，而非磁碟）。
`/debug` 預設為停用；請使用 `commands.debug: true` 來啟用。
當您需要切換冷門設定而不編輯 `openclaw.json` 時，這非常方便。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 會清除所有覆寫並返回磁碟上的設定。

## Session 追蹤輸出

當您想要在單一作業階段中查看外掛程式擁有的追蹤/除錯行，而不開啟完整詳細模式的情況下，請使用 `/trace`。

範例：

```text
/trace
/trace on
/trace off
```

請使用 `/trace` 進行外掛程式診斷，例如「主動記憶體」(Active Memory) 除錯摘要。
請繼續使用 `/verbose` 來顯示一般的詳細狀態/工具輸出，並繼續使用
`/debug` 進行僅限執行時期的設定覆寫。

## 外掛程式生命週期追蹤

當外掛程式生命週期指令感覺變慢，而您需要針對外掛程式中繼資料、探索、登錄、
執行時期鏡像、設定變更和重新整理工作使用內建的階段細分時，請使用 `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1`。該追蹤屬於選用性質，並會寫入
stderr，因此 JSON 指令輸出仍保持可解析狀態。

範例：

```bash
OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1 openclaw plugins install tokenjuice --force
```

輸出範例：

```text
[plugins:lifecycle] phase="config read" ms=6.83 status=ok command="install"
[plugins:lifecycle] phase="slot selection" ms=94.31 status=ok command="install" pluginId="tokenjuice"
[plugins:lifecycle] phase="registry refresh" ms=51.56 status=ok command="install" reason="source-changed"
```

在尋求 CPU 分析器之前，請先使用此功能進行外掛程式生命週期調查。
如果指令是從原始碼检出版本執行，請優先在 `pnpm build` 之後，使用 `node dist/entry.js ...` 測量建置的
執行時期；`pnpm openclaw ...`
也會測量來源執行器的額外負荷。

## CLI 啟動和指令分析

當指令感覺變慢時，請使用簽入的啟動基準測試：

```bash
pnpm test:startup:bench:smoke
pnpm tsx scripts/bench-cli-startup.ts --preset real --case status --runs 3
pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu
```

若要透過正常來源執行器進行一次性分析，請設定
`OPENCLAW_RUN_NODE_CPU_PROF_DIR`：

```bash
OPENCLAW_RUN_NODE_CPU_PROF_DIR=.artifacts/cli-cpu pnpm openclaw status
```

來源執行器會新增 Node CPU 分析旗標，並為該指令寫入 `.cpuprofile`。
在對指令程式碼新增臨時檢測功能之前，請先使用此功能。

對於看起來像是同步檔案系統或模組載入器工作的啟動停頓，
請透過來源執行器新增 Node 的同步 I/O 追蹤旗標：

```bash
OPENCLAW_TRACE_SYNC_IO=1 pnpm openclaw gateway --force
```

`pnpm gateway:watch` 預設會對被監看的
Gateway 子程序停用此旗標。當您在監看模式下明確需要 Node
同步 I/O 追蹤輸出時，請設定 `OPENCLAW_TRACE_SYNC_IO=1`。

## Gateway 監看模式

為了快速迭代，請在檔案監看器下執行 gateway：

```bash
pnpm gateway:watch
```

預設情況下，這會啟動或重新啟動一個名為
`openclaw-gateway-watch-main` 的 tmux 工作階段（或是特定設定檔/連接埠的變體，例如
`openclaw-gateway-watch-dev-19001`），並從互動式終端機自動附加。
非互動式 Shell、CI 和代理程式執行呼叫將保持分離狀態，並改為列印附加
說明。需要時請手動附加：

```bash
tmux attach -t openclaw-gateway-watch-main
```

tmux 面板會執行原始監看器：

```bash
node scripts/watch-node.mjs gateway --force
```

當不需要 tmux 時，請使用前景模式：

```bash
pnpm gateway:watch:raw
# or
OPENCLAW_GATEWAY_WATCH_TMUX=0 pnpm gateway:watch
```

停用自動附加，但保留 tmux 管理：

```bash
OPENCLAW_GATEWAY_WATCH_ATTACH=0 pnpm gateway:watch
```

當除錯啟動/執行時期效能熱點時，分析被監看 Gateway 的 CPU 時間：

```bash
pnpm gateway:watch --benchmark
```

監看包裝器會在叫用 Gateway 之前消耗 `--benchmark`，並在
`.artifacts/gateway-watch-profiles/` 下為每次 Gateway 子程序離開寫入
一個 V8 `.cpuprofile`。停止或重新啟動被監看的 gateway 以
重新整理目前的分析設定檔，然後使用 Chrome DevTools 或 Speedscope 開啟它：

```bash
npx speedscope .artifacts/gateway-watch-profiles/*.cpuprofile
```

當您希望分析設定檔位於其他位置時，請使用 `--benchmark-dir <path>`。
當您希望受測試的子程序跳過
預設的 `--force` 連接埠清理，且在 Gateway 連接埠已被佔用時快速失敗，
請使用 `--benchmark-no-force`。
基準測試模式預設會壓制同步 I/O 追蹤的垃圾訊息。當您明確需要同時取得 CPU
分析設定檔和 Node 同步 I/O 堆疊追蹤時，請將 `OPENCLAW_TRACE_SYNC_IO=1` 與 `--benchmark` 一起設定。在基準測試模式下，這些追蹤區塊
會被寫入基準測試目錄下的 `gateway-watch-output.log` 中，
並從終端機面板中過濾掉；正常的 Gateway 日誌仍然可見。

tmux 包裝器會將常見的非機密執行時選擇器，例如
`OPENCLAW_PROFILE`、`OPENCLAW_CONFIG_PATH`、`OPENCLAW_STATE_DIR`、
`OPENCLAW_GATEWAY_PORT` 和 `OPENCLAW_SKIP_CHANNELS`，帶入面板中。請將
提供者憑證放在您的一般設定檔/組態中，或者對於一次性臨時機密使用
原始前景模式。
如果受監控的 Gateway 在啟動期間退出，監控器會執行
`openclaw doctor --fix --non-interactive` 一次並重新啟動 Gateway 子程序。
當您想要原始的啟動
失敗而不含僅限開發的修復過程時，請使用 `OPENCLAW_GATEWAY_WATCH_AUTO_DOCTOR=0`。
受管理的 tmux 面板預設也會為了可讀性而顯示彩色的 Gateway 日誌；
啟動 `pnpm gateway:watch` 時設定 `FORCE_COLOR=0` 即可停用 ANSI 輸出。

監控器會在 `src/` 下的建置相關檔案、擴充功能原始檔案、
擴充功能 `package.json` 和 `openclaw.plugin.json` 元數據、`tsconfig.json`、
`package.json` 和 `tsdown.config.ts` 上重新啟動。擴充功能元數據變更會重新啟動
gateway 而不強制進行 `tsdown` 重新建置；來源和組態變更仍然
會先重新建置 `dist`。

在 `gateway:watch` 之後加入任何 gateway CLI 旗標，它們將在每次
重新啟動時被傳遞。重新執行相同的監控命令會重新產生命名的 tmux 面板，而
原始監控器仍會保持其單一監控器鎖定，因此重複的監控器父程序
會被取代而不是堆積。

## Dev profile + dev gateway (--dev)

使用 dev profile 來隔離狀態並啟動一個安全的、可拋棄的設定用於
除錯。有 **兩個** `--dev` 旗標：

- **全域 `--dev` (profile)：** 在 `~/.openclaw-dev` 下隔離狀態並
  將 gateway 預設連接埠設為 `19001` (衍生連接埠隨之變更)。
- **`gateway --dev`：告訴 Gateway 在缺失時自動建立預設組態 +
  workspace** (並跳過 BOOTSTRAP.md)。

推薦流程 (dev profile + dev bootstrap)：

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果您尚未進行全域安裝，請透過 `pnpm openclaw ...` 執行 CLI。

這樣做的作用：

1. **Profile 隔離**（全域 `--dev`）
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001`（瀏覽器/canvas 隨之對應調整）

2. **Dev bootstrap**（`gateway --dev`）
   - 如果缺少則寫入最小設定（`gateway.mode=local`，綁定 loopback）。
   - 將 `agent.workspace` 設定為 dev workspace。
   - 設定 `agent.skipBootstrap=true`（無 BOOTSTRAP.md）。
   - 如果缺少則植入 workspace 檔案：
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`。
   - 預設身分：**C3-PO**（protocol droid）。
   - 在 dev 模式下跳過 channel providers（`OPENCLAW_SKIP_CHANNELS=1`）。

重置流程（全新開始）：

```bash
pnpm gateway:dev:reset
```

<Note>
`--dev` 是一個 **全域** profile 標誌，會被某些 runner 吃掉。如果您需要明確指定，請使用環境變數形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

</Note>

`--reset` 會清除設定、憑證、工作階段和 dev workspace（使用
`trash`，而非 `rm`），然後重新建立預設的 dev 設定。

<Tip>
如果非開發 gateway 已在執行（launchd 或 systemd），請先將其停止：

```bash
openclaw gateway stop
```

</Tip>

## 原始串流記錄 (OpenClaw)

OpenClaw 可以在任何過濾/格式化之前記錄 **原始 assistant stream**。
這是查看推理內容是否以純文字增量形式到達
（或作為獨立的 thinking 區塊）的最佳方式。

透過 CLI 啟用：

```bash
pnpm gateway:watch --raw-stream
```

可選路徑覆寫：

```bash
pnpm gateway:watch --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

對等環境變數：

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

預設檔案：

`~/.openclaw/logs/raw-stream.jsonl`

## 原始 OpenAI 相容區塊記錄

若要在將區塊解析為區塊之前擷取**原始 OpenAI 相容區塊**，
請啟用傳輸記錄器：

```bash
OPENCLAW_RAW_STREAM=1
```

可選路徑：

```bash
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-openai-completions.jsonl
```

預設檔案：

`~/.openclaw/logs/raw-openai-completions.jsonl`

## 安全注意事項

- 原始串流記錄可能包含完整的提示詞、工具輸出和使用者資料。
- 請將記錄保留在本地，並在除錯後將其刪除。
- 如果您分享記錄，請先清除機密和個人識別資訊 (PII)。

## 在 VSCode 中除錯

需要來源映射 才能在基於 VSCode 的 IDE 中啟用除錯，因為許多生成的檔案在建置過程中最終會具有雜湊名稱。包含的 `launch.json` 組態以 Gateway 服務為目標，但可以快速調整用於其他用途：

1. **重新建置並對 Gateway 進行除錯** - 在建立新建置後對 Gateway 服務進行除錯
2. **對 Gateway 進行除錯** - 對現有建置的 Gateway 服務進行除錯

### 設定

預設的 **重新建置並對 Gateway 進行除錯** 組態是完備的，它會自動刪除 `/dist` 資料夾並在建置時啟用除錯功能來重建專案：

1. 從活動列 開啟 **執行和除錯** 面板，或按 `Ctrl`+`Shift`+`D`
2. 在 IDE 中，請確保在下拉式選單中選取了 **重新建置並對 Gateway 進行除錯**，然後按下 **開始除錯** 按鈕

或者 - 如果您想要手動管理建置和除錯程序：

1. 開啟終端機並啟用來源映射：
   - **Linux/macOS**：`export OUTPUT_SOURCE_MAPS=1`
   - **Windows (PowerShell)**：`$env:OUTPUT_SOURCE_MAPS="1"`
   - **Windows (CMD)**：`set OUTPUT_SOURCE_MAPS=1`
2. 在同一個終端機中，重建專案：`pnpm clean:dist && pnpm build`
3. 在 IDE 中，在 **執行和除錯** 組態下拉式選單中選取 **對 Gateway 進行除錯** 選項，然後按下 **開始除錯** 按鈕

您現在可以在 TypeScript 原始檔案 (`src/` 目錄) 中設定中斷點，除錯器將透過來源映射將中斷點正確對應到編譯後的 JavaScript。您將能夠檢查變數、逐步執行程式碼，並檢查呼叫堆疊。

### 備註

- 如果使用 **"Rebuild and Debug Gateway"** 選項 - 每次啟動調試器時，它將完全刪除 `/dist` 資料夾，並在啟動 Gateway 之前執行完整的 `pnpm build` 且啟用 source maps
- 如果使用 **"Debug Gateway"** 選項 - 調試會話可以隨時啟動和停止，而不會影響 `/dist` 資料夾，但您必須使用單獨的終端機程序來啟用調試和管理建構週期
- 修改 `args` 的 `launch.json` 設定以調試專案的其他部分
- 如果您需要將建置好的 OpenClaw CLI 用於其他任務（即 `dashboard --no-open`，如果您的調試會話產生了一個新的 auth token），您可以在另一個終端機中將其執行為 `node ./openclaw.mjs` 或建立一個 shell 別名，例如 `alias openclaw-build="node $(pwd)/openclaw.mjs"`

## 相關

- [疑難排解](/zh-Hant/help/troubleshooting)
- [常見問題](/zh-Hant/help/faq)
