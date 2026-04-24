---
summary: "除錯工具：監看模式、原始模型串流，以及追蹤推理洩漏"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "除錯"
---

# 除錯

本頁面涵蓋串流輸出的除錯輔助工具，特別是當供應商將推理內容混合到正常文字中時。

## 執行時期除錯覆寫

在聊天中使用 `/debug` 來設定 **僅限執行時期** 的設定覆寫（記憶體，非磁碟）。
`/debug` 預設為停用；請使用 `commands.debug: true` 來啟用。
當您需要切換不明顯的設定而不編輯 `openclaw.json` 時，這非常方便。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 會清除所有覆寫並返回磁碟上的設定。

## 工作階段追蹤輸出

當您想要在一個 session 中查看外掛擁有的追蹤/除錯行，而不開啟完整詳細模式時，請使用 `/trace`。

範例：

```text
/trace
/trace on
/trace off
```

請使用 `/trace` 進行外掛診斷，例如 Active Memory 除錯摘要。
請繼續使用 `/verbose` 來取得一般的詳細狀態/工具輸出，並繼續使用
`/debug` 進行僅限執行時期的設定覆寫。

## 暫時性 CLI 除錯計時

OpenClaw 保留了 `src/cli/debug-timing.ts` 作為本地
調查的小型輔助工具。它刻意不連接到 CLI 啟動、命令路由，
或任何預設命令。請僅在除錯緩慢的命令時使用它，然後
在落地行為變更之前移除 import 和 spans。

當命令執行緩慢且您需要快速的階段分解，以
決定是否使用 CPU 分析器或修復特定子系統時，請使用此方法。

### 新增暫時性 span

在您正在調查的程式碼附近新增輔助工具。例如，在除錯
`openclaw models list` 時，
`src/commands/models/list.list-command.ts` 中的暫時性修補程式可能如下所示：

```ts
// Temporary debugging only. Remove before landing.
import { createCliDebugTiming } from "../../cli/debug-timing.js";

const timing = createCliDebugTiming({ command: "models list" });

const authStore = timing.time("debug:models:list:auth_store", () => ensureAuthProfileStore());

const loaded = await timing.timeAsync(
  "debug:models:list:registry",
  () => loadListModelRegistry(cfg, { sourceConfig }),
  (result) => ({
    models: result.models.length,
    discoveredKeys: result.discoveredKeys.size,
  }),
);
```

指引：

- 在暫時性階段名稱前加上 `debug:` 前綴。
- 僅在疑似緩慢的區段周圍新增少數幾個 span。
- 優先使用 `registry`、`auth_store` 或 `rows` 等廣泛階段，而非輔助工具
  名稱。
- 對於同步工作請使用 `time()`，對於 promises 請使用 `timeAsync()`。
- 保持 stdout 乾淨。輔助工具會寫入 stderr，因此命令 JSON 輸出保持
  可解析。
- 在開啟最終修復 PR 之前，請移除暫時性的 imports 和 spans。
- 在說明最佳化的 issue 或 PR 中，包含計時輸出或簡短摘要。

### 以可讀輸出執行

可讀模式最適合即時除錯：

```bash
OPENCLAW_DEBUG_TIMING=1 pnpm openclaw models list --all --provider moonshot
```

來自暫時 `models list` 調查的輸出範例：

```text
OpenClaw CLI debug timing: models list
     0ms     +0ms start all=true json=false local=false plain=false provider="moonshot"
     2ms     +2ms debug:models:list:import_runtime duration=2ms
    17ms    +14ms debug:models:list:load_config duration=14ms sourceConfig=true
  20.3s  +20.3s debug:models:list:auth_store duration=20.3s
  20.3s     +0ms debug:models:list:resolve_agent_dir duration=0ms agentDir=true
  20.3s     +0ms debug:models:list:resolve_provider_filter duration=0ms
  25.3s   +5.0s debug:models:list:ensure_models_json duration=5.0s
  31.2s   +5.9s debug:models:list:load_model_registry duration=5.9s models=869 availableKeys=38 discoveredKeys=868 availabilityError=false
  31.2s     +0ms debug:models:list:resolve_configured_entries duration=0ms entries=1
  31.2s     +0ms debug:models:list:build_configured_lookup duration=0ms entries=1
  33.6s   +2.4s debug:models:list:read_registry_models duration=2.4s models=871
  35.2s   +1.5s debug:models:list:append_discovered_rows duration=1.5s seenKeys=0 rows=0
  36.9s   +1.7s debug:models:list:append_catalog_supplement_rows duration=1.7s seenKeys=5 rows=5

Model                                      Input       Ctx   Local Auth  Tags
moonshot/kimi-k2-thinking                  text        256k  no    no
moonshot/kimi-k2-thinking-turbo            text        256k  no    no
moonshot/kimi-k2-turbo                     text        250k  no    no
moonshot/kimi-k2.5                         text+image  256k  no    no
moonshot/kimi-k2.6                         text+image  256k  no    no

  36.9s     +0ms debug:models:list:print_model_table duration=0ms rows=5
  36.9s     +0ms complete rows=5
```

此輸出的發現：

| 階段                                     |      時間 | 代表意義                                                       |
| ---------------------------------------- | --------: | -------------------------------------------------------------- |
| `debug:models:list:auth_store`           |     20.3s | 載入 auth-profile store 是最大的成本，應優先調查。             |
| `debug:models:list:ensure_models_json`   |      5.0s | 同步 `models.json` 的成本夠高，值得檢查是否有快取或略過條件。  |
| `debug:models:list:load_model_registry`  |      5.9s | 建構 Registry 和供應商可用性檢查也是顯著的成本。               |
| `debug:models:list:read_registry_models` |      2.4s | 讀取所有 registry 模型並非免費，且對 `--all` 可能有影響。      |
| row append 階段                          | 總共 3.2s | 建構五個顯示的列仍然需要數秒鐘，因此篩選路徑值得更仔細地檢查。 |
| `debug:models:list:print_model_table`    |       0ms | 渲染並非瓶頸。                                                 |

這些發現足以引導下一次修補，而無需在正式環境路徑中保留計時程式碼。

### 以 JSON 輸出執行

當您想要儲存或比較計時資料時，請使用 JSON 模式：

```bash
OPENCLAW_DEBUG_TIMING=json pnpm openclaw models list --all --provider moonshot \
  2> .artifacts/models-list-timing.jsonl
```

每個 stderr 行都是一個 JSON 物件：

```json
{
  "command": "models list",
  "phase": "debug:models:list:registry",
  "elapsedMs": 31200,
  "deltaMs": 5900,
  "durationMs": 5900,
  "models": 869,
  "discoveredKeys": 868
}
```

### 合併前清理

在開啟最終 PR 之前：

```bash
rg 'createCliDebugTiming|debug:[a-z0-9_-]+:' src/commands src/cli \
  --glob '!src/cli/debug-timing.*' \
  --glob '!*.test.ts'
```

除非 PR 明確新增永久診斷介面，否則指令不應傳回任何暫時的檢測呼叫點。對於一般的效能修正，僅保留行為變更、測試，以及附帶計時證據的簡短註記。

對於更深入的 CPU 熱點，請使用 Node 分析工具 (`--cpu-prof`) 或外部分析器，而不是新增更多計時包裝器。

## Gateway 監看模式

為了快速迭代，請在檔案監看器下執行 gateway：

```bash
pnpm gateway:watch
```

這對應至：

```bash
node scripts/watch-node.mjs gateway --force
```

當 `src/` 下的建構相關檔案、擴充功能原始碼檔案、擴充功能 `package.json` 和 `openclaw.plugin.json` 元資料、`tsconfig.json`、`package.json` 以及 `tsdown.config.ts` 變更時，監看器會重新啟動。擴充功能元資料變更會重新啟動 gateway，而不會強制 `tsdown` 重新建構；來源和設定變更仍然會先重新建構 `dist`。

在 `gateway:watch` 之後新增任何 gateway CLI 標誌，它們將在每次重新啟動時被傳遞。現在，針對相同的 repo/標誌集重新執行相同的 watch 指令會替換舊的監看器，而不是留下重複的監听器父程序。

## Dev profile + dev gateway (--dev)

使用 dev profile 來隔離狀態並建立一個安全的、可拋棄的除錯設定。這裡有 **兩個** `--dev` 標誌：

- **Global `--dev` (profile):** 將狀態隔離在 `~/.openclaw-dev` 下，並預設 gateway 埠為 `19001`（衍生埠隨之變化）。
- **`gateway --dev`:** 告訴 Gateway 在缺少時自動建立預設設定 + 工作區\*\*（並跳過 BOOTSTRAP.md）。

建議流程（dev profile + dev bootstrap）：

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果您尚未進行全域安裝，請透過 `pnpm openclaw ...` 執行 CLI。

其作用：

1. **Profile isolation** (global `--dev`)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (瀏覽器/畫布相應變化)

2. **Dev bootstrap** (`gateway --dev`)
   - 如果缺少，則寫入最小設定 (`gateway.mode=local`，綁定 loopback)。
   - 將 `agent.workspace` 設定為 dev 工作區。
   - 設定 `agent.skipBootstrap=true` (無 BOOTSTRAP.md)。
   - 如果缺少，則植入工作區檔案：
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`。
   - 預設身分：**C3‑PO** (protocol droid)。
   - 在 dev 模式下跳過 channel providers (`OPENCLAW_SKIP_CHANNELS=1`)。

重置流程（全新開始）：

```bash
pnpm gateway:dev:reset
```

注意：`--dev` 是一個 **全域** profile 標誌，會被某些運行器吞噬。如果您需要完整拼寫，請使用 env var 形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` 會清除設定、憑證、sessions 和 dev 工作區（使用 `trash`，而非 `rm`），然後重建預設的 dev 設定。

提示：如果非 dev gateway 已經在執行（launchd/systemd），請先將其停止：

```bash
openclaw gateway stop
```

## 原始串流記錄 (OpenClaw)

OpenClaw 可以在任何過濾/格式化之前記錄 **原始助理串流**。
這是檢查推理內容是否以純文字增量
（或作為單獨的思考區塊）到達的最佳方式。

透過 CLI 啟用：

```bash
pnpm gateway:watch --raw-stream
```

可選的路徑覆寫：

```bash
pnpm gateway:watch --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

等效的環境變數：

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

預設檔案：

`~/.openclaw/logs/raw-stream.jsonl`

## 原始區塊記錄 (pi-mono)

為了在 **原始 OpenAI 相容區塊** 被解析為區塊之前進行捕獲，
pi-mono 公開了一個獨立的記錄器：

```bash
PI_RAW_STREAM=1
```

可選路徑：

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

預設檔案：

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> 注意：這僅由使用 pi-mono 的
> `openai-completions` 提供者的程序發出。

## 安全事項

- 原始串流記錄可能包含完整的提示詞、工具輸出和使用者資料。
- 請將記錄保持在本地，並在除錯後刪除它們。
- 如果您分享記錄，請先清除機密和個人資訊 (PII)。
