---
summary: "除錯工具：監看模式、原始模型串流，以及追蹤推理洩漏"
read_when:
  - You need to inspect raw model output for reasoning leakage
  - You want to run the Gateway in watch mode while iterating
  - You need a repeatable debugging workflow
title: "除錯"
---

用於串流輸出的除錯輔助工具，特別是當供應商將推理混合到正常文字中時。

## 執行時期除錯覆寫

在聊天中使用 `/debug` 來設定**僅限執行時期**（runtime-only）的設定覆寫（儲存在記憶體中，而非磁碟）。
`/debug` 預設為停用；請使用 `commands.debug: true` 啟用它。
當您需要切換不明顯的設定而不編輯 `openclaw.json` 時，這非常方便。

範例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 會清除所有覆寫並返回磁碟上的設定。

## Session 追蹤輸出

當您想要在單一 Session 中查看外掛擁有的追蹤/除錯行，而不開啟完整詳細模式的情況下，請使用 `/trace`。

範例：

```text
/trace
/trace on
/trace off
```

使用 `/trace` 進行外掛診斷，例如 Active Memory 除錯摘要。
請繼續使用 `/verbose` 來進行一般的詳細狀態/工具輸出，並繼續使用
`/debug` 進行僅限執行時期的設定覆寫。

## 暫時性 CLI 除錯計時

OpenClaw 保留 `src/cli/debug-timing.ts` 作為本地調查的小型輔助工具。它故意未連接到 CLI 啟動、命令路由，或預設情況下的任何命令。僅在除錯緩慢命令時使用它，然後在發布行為變更之前移除匯入和 span。

當命令緩慢且您需要快速階段細分，以決定是否使用 CPU 分析器或修復特定子系統時，請使用此功能。

### 新增暫時性 Spans

在您正在調查的程式碼附近新增輔助工具。例如，在除錯
`openclaw models list` 時，`src/commands/models/list.list-command.ts` 中的暫時性修補可能如下所示：

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

指導原則：

- 在暫時性階段名稱前加上 `debug:` 前綴。
- 僅在可疑的緩慢區段周圍新增少數幾個 spans。
- 優先使用諸如 `registry`、`auth_store` 或 `rows` 等廣泛階段，
  而非輔助函式名稱。
- 對於同步工作請使用 `time()`，對於 promises 則使用 `timeAsync()`。
- 保持 stdout 乾淨。輔助工具會寫入 stderr，因此命令 JSON 輸出保持
  可解析狀態。
- 在開啟最終修復 PR 之前，移除暫時性的匯入和 spans。
- 在說明該優化的 Issue 或 PR 中，包含計時輸出或簡短摘要。

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

來自此輸出的發現：

| 階段                                     |      時間 | 含義                                                     |
| ---------------------------------------- | --------: | -------------------------------------------------------- |
| `debug:models:list:auth_store`           |     20.3s | auth-profile 存儲加載是最大的成本，應首先調查。          |
| `debug:models:list:ensure_models_json`   |      5.0s | 同步 `models.json` 的成本足以檢查快取或跳過條件。        |
| `debug:models:list:load_model_registry`  |      5.9s | 註冊表建構和提供程式可用性工作也是重要的成本。           |
| `debug:models:list:read_registry_models` |      2.4s | 讀取所有註冊表模型並非免費，且可能對 `--all` 有影響。    |
| 列追加階段                               | 總計 3.2s | 建構五個顯示列仍需幾秒鐘，因此篩選路徑值得更仔細的檢視。 |
| `debug:models:list:print_model_table`    |       0ms | 渲染並非瓶頸。                                           |

這些發現足以指導下一個修補程式，而無需在生產路徑中保留計時程式碼。

### 以 JSON 輸出執行

當您想要儲存或比較計時數據時，請使用 JSON 模式：

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

### 提交前清理

在開啟最終 PR 之前：

```bash
rg 'createCliDebugTiming|debug:[a-z0-9_-]+:' src/commands src/cli \
  --glob '!src/cli/debug-timing.*' \
  --glob '!*.test.ts'
```

除非 PR 明確新增了永久診斷介面，否則該指令不應傳回任何暫時的檢測呼叫點。對於一般的效能修復，僅保留行為變更、測試以及包含計時證據的簡短說明。

對於更深入的 CPU 熱點，請使用 Node 分析工具 (`--cpu-prof`) 或外部分析器，而不是新增更多的計時包裝器。

## Gateway 監看模式

為了快速迭代，請在檔案監看器下執行 gateway：

```bash
pnpm gateway:watch
```

這對應於：

```bash
node scripts/watch-node.mjs gateway --force
```

監看器會在 `src/` 下的建置相關檔案、擴充功能原始碼檔案、擴充功能 `package.json` 和 `openclaw.plugin.json` 中繼資料、`tsconfig.json`、`package.json` 和 `tsdown.config.ts` 變更時重新啟動。擴充功能中繼資料變更會重新啟動 gateway，而不會強制 `tsdown` 重新建置；來源和組態變更仍會先重新建置 `dist`。

在 `gateway:watch` 之後新增任何 gateway CLI 標誌，它們會在每次重啟時被傳遞。現在，為同一個 repository/標誌集重新執行相同的 watch 指令會取代較舊的 watcher，而不是留下重複的 watcher 父程序。

## Dev profile + dev gateway (--dev)

使用 dev profile 來隔離狀態並啟動一個安全、可拋棄的設定以進行除錯。有 **兩個** `--dev` 標誌：

- **全域 `--dev` (profile)：** 在 `~/.openclaw-dev` 下隔離狀態，並將 gateway 預設連接埠設為 `19001`（衍生連接埠會隨之變動）。
- **`gateway --dev`：告訴 Gateway 在缺少時自動建立預設 config + workspace**（並跳過 BOOTSTRAP.md）。

建議流程 (dev profile + dev bootstrap)：

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果您還沒有全域安裝，請透過 `pnpm openclaw ...` 執行 CLI。

其作用如下：

1. **Profile 隔離** (全域 `--dev`)
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001` (瀏覽器/畫布隨之變動)

2. **Dev bootstrap** (`gateway --dev`)
   - 如果缺少則寫入最小設定 (`gateway.mode=local`，繫結 loopback)。
   - 將 `agent.workspace` 設定為 dev workspace。
   - 設定 `agent.skipBootstrap=true` (無 BOOTSTRAP.md)。
   - 如果缺少則植入 workspace 檔案：
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`。
   - 預設身分：**C3‑PO** (protocol droid)。
   - 在 dev 模式下跳過通道提供者 (`OPENCLAW_SKIP_CHANNELS=1`)。

重設流程 (重新開始)：

```bash
pnpm gateway:dev:reset
```

<Note>
`--dev` 是一個 **全域** profile 標誌，會被某些 runner 吃掉。如果您需要拼出來，請使用 env var 形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

</Note>

`--reset` 會清除 config、credentials、sessions 和 dev workspace (使用 `trash`，而非 `rm`)，然後重新建立預設 dev 設定。

<Tip>
如果非開發環境的 Gateway 已經在執行（launchd 或 systemd），請先將其停止：

```bash
openclaw gateway stop
```

</Tip>

## 原始串流記錄 (OpenClaw)

OpenClaw 可以在任何過濾/格式化之前記錄 **原始助手串流**。
這是檢查推理內容是否以純文字增量
（或作為獨立的思考區塊）到達的最佳方式。

透過 CLI 啟用：

```bash
pnpm gateway:watch --raw-stream
```

可選路徑覆寫：

```bash
pnpm gateway:watch --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

對等的環境變數：

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

預設檔案：

`~/.openclaw/logs/raw-stream.jsonl`

## 原始區塊記錄 (pi-mono)

為了在將 **原始 OpenAI 相容區塊** 解析為區塊之前進行捕獲，
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
> `openai-completions` provider 的程序發出。

## 安全性注意事項

- 原始串流記錄可能包含完整的提示、工具輸出和使用者資料。
- 請將記錄保留在本機，並在除錯後將其刪除。
- 如果您分享記錄，請先清除機密資訊和 PII（個人識別資訊）。

## 相關內容

- [疑難排解](/zh-Hant/help/troubleshooting)
- [常見問題](/zh-Hant/help/faq)
