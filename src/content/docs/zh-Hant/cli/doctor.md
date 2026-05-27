---
summary: "CLI 參考指南用於 `openclaw doctor` (健康檢查 + 引導修復)"
read_when:
  - You have connectivity/auth issues and want guided fixes
  - You updated and want a sanity check
title: "Doctor"
---

# `openclaw doctor`

閘道和通道的健康檢查與快速修復。

相關主題：

- 疑難排解：[疑難排解](/zh-Hant/gateway/troubleshooting)
- 安全性稽核：[安全性](/zh-Hant/gateway/security)

## 為何使用它

`openclaw doctor` 是 OpenClaw 的健康檢查介面。當閘道、
通道、外掛、技能、模型路由、本機狀態或設定檔遷移
的行為不如預期，且您想要用一個指令來解釋問題所在時，請使用它。

Doctor 有三種模式：

| 模式 | 指令                     | 行為                                                       |
| ---- | ------------------------ | ---------------------------------------------------------- |
| 檢查 | `openclaw doctor`        | 以人為導向的檢查與引導式提示。                             |
| 修復 | `openclaw doctor --fix`  | 套用支援的修復，除非非互動式修復是安全的，否則會使用提示。 |
| Lint | `openclaw doctor --lint` | 適用於 CI、預檢和審查閘道的唯讀結構化發現。                |

當自動化需要穩定的結果時，建議使用 `--lint`。當人類操作員有意讓
doctor 編輯設定或狀態時，建議使用 `--fix`。

## 範例

```bash
openclaw doctor
openclaw doctor --lint
openclaw doctor --lint --json
openclaw doctor --lint --severity-min warning
openclaw doctor --deep
openclaw doctor --fix
openclaw doctor --fix --non-interactive
openclaw doctor --generate-gateway-token
```

對於特定通道的權限，請使用通道探測器而非 `doctor`：

```bash
openclaw channels capabilities --channel discord --target channel:<channel-id>
openclaw channels status --probe
```

目標 Discord 功能探測器會報告機器人的有效通道權限；狀態探測器會稽核已設定的 Discord 頻道和語音自動加入目標。

## 選項

- `--no-workspace-suggestions`：停用工作區記憶/搜尋建議
- `--yes`：接受預設值而不提示
- `--repair`：套用建議的非服務修復而不提示；閘道服務安裝和重寫仍需要互動確認或明確的閘道指令
- `--fix`：`--repair` 的別名
- `--force`：套用進階修復，包括在需要時覆寫自訂服務設定
- `--non-interactive`：無提示執行；僅限安全遷移和非服務修復
- `--generate-gateway-token`：產生並設定閘道權杖
- `--deep`：掃描系統服務以尋找額外的 Gateway 安裝，並報告最近的 Gateway supervisor 重啟交接
- `--lint`：以唯讀模式執行現代化的健康檢查並輸出診斷結果
- `--json`：配合 `--lint`，輸出 JSON 格式的結果而非人類可讀的輸出
- `--severity-min <level>`：配合 `--lint`，捨棄低於 `info`、`warning` 或 `error` 的結果
- `--skip <id>`：配合 `--lint`，跳過特定的檢查 ID；重複使用可跳過多個
- `--only <id>`：配合 `--lint`，僅執行特定的檢查 ID；重複使用可執行少數選定的項目

## Lint 模式

`openclaw doctor --lint` 是 doctor 檢查的唯讀自動化姿態。
它使用結構化的健康檢查路徑，不會提示，也不會修復
或重寫設定/狀態。當您需要機器可讀的結果而非指導式修復提示時，請在 CI、預檢腳本和審查工作流程中使用它。
Lint 輸出選項，例如 `--json`、`--severity-min`、`--only` 和 `--skip`
僅能與 `--lint` 一起使用。

```bash
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --only core/doctor/gateway-config --json
```

人類可讀的輸出很簡潔：

```text
doctor --lint: ran 6 check(s), 1 finding(s)
  [warning] core/doctor/gateway-config gateway.mode - gateway.mode is unset; gateway start will be blocked.
    fix: Run `openclaw configure` and set Gateway mode (local/remote), or `openclaw config set gateway.mode local`.
```

JSON 輸出是 lint 執行的腳本介面：

```json
{
  "ok": false,
  "checksRun": 5,
  "checksSkipped": 0,
  "findings": [
    {
      "checkId": "core/doctor/gateway-config",
      "severity": "warning",
      "message": "gateway.mode is unset; gateway start will be blocked.",
      "path": "gateway.mode",
      "fixHint": "Run `openclaw configure` and set Gateway mode (local/remote), or `openclaw config set gateway.mode local`."
    }
  ]
}
```

結束行為：

- `0`：沒有達到或高於所選嚴重性閾值的結果
- `1`：至少有一個結果符合所選閾值
- `2`：在產生 lint 結果之前的指令/執行階段失敗

`--severity-min` 同時控制可見的結果和結束閾值。例如，
`openclaw doctor --lint --severity-min error` 即使存在較低嚴重性的 `info` 或 `warning` 結果，也可能不列印任何結果並
以 `0` 狀態結束。

## 結構化健康檢查

現代的 doctor 檢查使用一個小型的結構化合約：

```ts
detect(ctx, scope?) -> HealthFinding[]
repair?(ctx, findings) -> HealthRepairResult
```

`detect()` 驅動 `doctor --lint`。`repair()` 是可選的，僅由
`doctor --fix` / `doctor --repair` 考慮。尚未遷移至此
結構的檢查項目繼續使用舊版的 doctor 貢獻流程。

此區分是有意為之的：`detect()` 負責診斷，而 `repair()` 負責
回報它已變更或將變更的內容。修復上下文可以攜帶
`dryRun`/`diff` 請求，且修復結果可以針對
組態/檔案編輯傳回結構化的 `diffs`，並針對服務、程序、套件、狀態或其他
副作用傳回 `effects`。這讓轉換後的檢查項目能朝 `doctor --fix --dry-run`
和差異回報發展，而無需將變動規劃移入 `detect()`。

`repair()` 透過 `status:
"repaired" | "skipped" | "failed"`. Omitted status means `repaired` 回報是否嘗試了請求的修復，因此簡單的
修復檢查只需要回報變更。當修復傳回 `skipped` 或
`failed` 時，doctor 會回報原因，並不會針對該檢查執行驗證。

在成功的結構化修復後，doctor 會以修復後的發現作為範圍重新執行 `detect()`。檢查項目可以使用選定的發現、路徑或 `ocPath`
值進行專注的驗證。如果發現仍然存在，doctor 會回報修復警告，而不是將變更視為無聲完成。

發現包括：

| 欄位              | 用途                                                |
| ----------------- | --------------------------------------------------- |
| `checkId`         | 用於 skip/only 篩選器和 CI 允許清單的穩定 ID。      |
| `severity`        | `info`、`warning` 或 `error`。                      |
| `message`         | 人類可讀的問題陳述。                                |
| `path`            | 可用時的組態、檔案或邏輯路徑。                      |
| `line` / `column` | 可用時的來源位置。                                  |
| `ocPath`          | 當檢查可以指向特定位置時，提供精確的 `oc://` 位址。 |
| `fixHint`         | 建議的操作員動作或修復摘要。                        |

此版本在結構化健康路徑上註冊了現代化的核心 doctor 檢查。`openclaw/plugin-sdk/health` 子路徑為內建的後續處理者公開了相同的合約，但外掛支援的檢查僅在其擁有的套件在活動指令路徑中註冊後才會執行。

## 檢查選擇

當工作流程需要專注的閘道時，請使用 `--only` 和 `--skip`：

```bash
openclaw doctor --lint --only core/doctor/gateway-config --json
openclaw doctor --lint --skip core/doctor/skills-readiness
```

`--only` 和 `--skip` 接受完整的檢查 ID，並可重複使用。如果未註冊 `--only` ID，則不會針對該 ID 執行任何檢查；請使用指令的 `checksRun` 和 `checksSkipped` 欄位來驗證專注的閘道是否正在選取您預期的檢查。

注意：

- 在 Nix 模式 (`OPENCLAW_NIX_MODE=1`) 下，唯讀的 doctor 檢查仍然有效，但 `doctor --fix`、`doctor --repair`、`doctor --yes` 和 `doctor --generate-gateway-token` 已被停用，因為 `openclaw.json` 是不可變的。請改為編輯此安裝的 Nix 來源；對於 nix-openclaw，請使用 agent-first 的 [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start)。
- 互動式提示（例如鑰匙圈/OAuth 修復）僅在 stdin 為 TTY 且未設定 `--non-interactive` 時執行。無頭執行（cron、Telegram、無終端機）將會跳過提示。
- 效能：非互動式 `doctor` 執行會跳過積極的外掛載入，因此無頭健康檢查能保持快速。互動式 doctor 工作階段仍會載入舊版健康與修復流程所需的外掛介面。
- `--lint` 比 `--non-interactive` 更嚴格：它始終是唯讀的，從不提示，也從不套用安全的移轉。當您希望 doctor 進行變更時，請執行 `doctor --fix` 或 `doctor --repair`。
- `--fix` (`--repair` 的別名) 會將備份寫入 `~/.openclaw/openclaw.json.bak` 並捨棄未知的設定鍵，列出每個移除項目。
- 現代化的健康檢查可以為 `doctor --fix` 公開 `repair()` 路徑；未公開路徑的檢查會繼續通過現有的 Doctor 修復流程。
- `doctor --fix --non-interactive` 會回報遺失或過時的 Gateway 服務定義，但在更新修復模式之外不會安裝或重寫它們。請針對遺失的服務執行 `openclaw gateway install`，或在您有意要置換啟動器時執行 `openclaw gateway install --force`。
- 狀態完整性檢查現在能偵測 sessions 目錄中的孤兒逐字稿檔案。將它們封存為 `.deleted.<timestamp>` 需要互動式確認；`--fix`、`--yes` 和無頭執行會將其保留原位。
- Doctor 也會掃描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中的舊版 cron 作業形狀，並可以在排程器於執行時自動將其正規化之前就地重寫它們。
- Doctor 會回報具有明確 `payload.model` 覆寫的 cron 作業，包括提供者命名空間計數以及與 `agents.defaults.model` 的不符之處，以便在驗證或計費調查期間能看到未繼承預設模型的排程作業。
- 在 Linux 上，當使用者的 crontab 仍在執行舊版 `~/.openclaw/bin/ensure-whatsapp.sh` 時，Doctor 會發出警告；該指令碼不再維護，並且當 cron 缺少 systemd user-bus 環境時，可能會記錄錯誤的 WhatsApp Gateway 停機訊息。
- 啟用 WhatsApp 時，Doctor 會檢查 Gateway 事件迴圈是否因本機 `openclaw-tui` 用戶端仍在執行而降低效能。`doctor --fix` 僅會停止已驗證的本機 TUI 用戶端，以免 WhatsApp 回覆被卡在過時的 TUI 重新整理迴圈後面。
- Doctor 會將舊版 `openai-codex/*` 模型參照重寫為標準 `openai/*` 參照，範圍涵蓋主要模型、後備機制、heartbeat/subagent/compaction 覆寫、hooks、通道模型覆寫以及過時的工作階段路由釘選。`--fix` 會將 Codex intent 移至提供者/模型範圍的 `agentRuntime.id: "codex"` 項目，保留工作階段 auth-profile 釘選（例如 `openai-codex:...`），移除過時的整個代理程式/工作階段執行時期釘選，並在 Codex auth 路由上保留修復後的 OpenAI 代理程式參照，而非直接使用 OpenAI API 金鑰認證。
- Doctor 會清理由舊版 OpenClaw 建立的舊版外掛程式相依性暫存狀態，並為將其宣告為對等相依性 的受管理 npm 外掛程式重新連結主機 `openclaw` 套件。它還會修復設定中參照但遺失的可下載外掛程式，例如 `plugins.entries`、設定的通道、設定的提供者/搜尋設定或設定的代理程式執行時期。在套件更新期間，doctor 會跳過套件管理員外掛程式修復，直到套件交換完成；如果設定的外掛程式仍需要復原，請在之後重新執行 `openclaw doctor --fix`。如果下載失敗，doctor 會回報安裝錯誤並保留設定的外掛程式項目以供下次修復嘗試。
- 當外掛程式探索狀態良好時，Doctor 會透過從 `plugins.allow`/`plugins.deny`/`plugins.entries` 中移除遺失的外掛程式 ID，以及移除相符的懸置通道設定、heartbeat 目標和通道模型覆寫，來修復過時的外掛程式設定。
- Doctor 會透過停用受影響的 `plugins.entries.<id>` 項目並移除其無效的 `config` 載荷，來隔離無效的外掛程式設定。Gateway 啟動時已經會僅跳過該錯誤的外掛程式，讓其他外掛程式和通道能繼續執行。
- 當其他監督器 擁有 Gateway 生命週期時，請設定 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。Doctor 仍會回報 Gateway/服務健全狀況並套用非服務修復，但會跳過服務安裝/啟動/重新啟動/引導程序 以及舊版服務清理。
- 在 Linux 上，doctor 會忽略非作用中的額外類似 gateway 的 systemd 單位，並且在修復期間不會重寫正在執行的 systemd gateway 服務的 command/entrypoint 中繼資料。請先停止服務，或者當您故意想要替換作用中的啟動器時使用 `openclaw gateway install --force`。
- Doctor 會自動將舊版扁平 Talk 設定 (`talk.voiceId`、`talk.modelId` 及相關項目) 自動遷移至 `talk.provider` + `talk.providers.<provider>`。
- 重複執行 `doctor --fix` 不再會在唯一的差異是物件金鑰順序時回報/套用 Talk 正規化。
- Doctor 包含記憶體搜尋就緒檢查，並且當缺少嵌入憑證時可以建議 `openclaw configure --section model`。
- 當未設定命令擁有者時，Doctor 會發出警告。命令擁有者是被允許執行擁有者專屬命令並核准危險操作的人類操作員帳戶。DM 配對僅允許某人與機器人交談；如果您在首次擁有者引導程式存在之前已核准發送者，請明確設定 `commands.ownerAllowFrom`。
- 當配置了 Codex 模式的代理並且操作員的 Codex 主目錄中存在個人 Codex CLI 資產時，Doctor 會報告一則資訊說明。本機 Codex 應用程式伺服器啟動使用獨立的逐代理主目錄，因此如有需要，請先安裝 Codex 外掛程式，然後使用 `openclaw migrate plan codex` 來盤點應有意提升的資產。
- Doctor 會移除已退役的 `plugins.entries.codex.config.codexDynamicToolsProfile`；Codex app-server 始終保持 Codex 原生工作區工具的原生狀態。
- 當允許預設代理程式的技能因缺少 bins、環境變數、設定或 OS 需求而無法在目前執行環境中使用時，Doctor 會發出警告。`doctor --fix` 可以使用 `skills.entries.<skill>.enabled=false` 停用那些無法使用的技能；當您想要保持技能啟用時，請改為安裝/設定缺少的需求。
- 如果已啟用沙箱模式但 Docker 無法使用，doctor 會回報高信號警告並提供修復方法 (`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`)。
- 如果存在舊版沙箱註冊表檔案（`~/.openclaw/sandbox/containers.json` 或 `~/.openclaw/sandbox/browsers.json`），doctor 會報告它們；`openclaw doctor --fix` 會將有效條目遷移到分片註冊表目錄，並隔離無效的舊版檔案。
- 如果 `gateway.auth.token`/`gateway.auth.password` 是由 SecretRef 管理，且在當前指令路徑中不可用，doctor 會報告唯讀警告，並不會寫入純文字後備憑證。
- 如果在修復路徑中頻道 SecretRef 檢查失敗，doctor 會繼續並報告警告，而不是提前退出。
- 在狀態目錄遷移後，如果啟用的預設 Telegram 或 Discord 帳戶依賴 env 後備，且 `TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN` 對 doctor 程序不可用，doctor 會發出警告。
- Telegram `allowFrom` 用戶名自動解析（`doctor --fix`）需要在當前指令路徑中有可解析的 Telegram token。如果 token 檢查不可用，doctor 會報告警告並跳過該次的自動解析。

## macOS：`launchctl` env 覆蓋

如果您先前執行過 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），該值會覆蓋您的設定檔，並可能導致持續的「unauthorized」錯誤。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## 相關

- [CLI 參考](/zh-Hant/cli)
- [Gateway doctor](/zh-Hant/gateway/doctor)
