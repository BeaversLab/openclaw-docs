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

- 故障排除：[故障排除](/zh-Hant/gateway/troubleshooting)
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
openclaw doctor --lint --allow-exec
openclaw doctor --deep
openclaw doctor --fix
openclaw doctor --fix --non-interactive
openclaw doctor --generate-gateway-token
openclaw doctor --post-upgrade
openclaw doctor --post-upgrade --json
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
- `--allow-exec`：允許 doctor 在驗證機密時執行已設定的 exec SecretRefs
- `--deep`：掃描系統服務是否有額外的 gateway 安裝，並報告最近的 Gateway supervisor 重新啟動交接
- `--lint`：以唯讀模式執行現代化的健康檢查並輸出診斷結果
- `--post-upgrade`：執行升級後的外掛程式相容性探查；將結果輸出至 stdout；如果存在任何錯誤等級的結果，則以代碼 1 退出
- `--json`：搭配 `--lint` 使用，輸出 JSON 結果而非人工輸出；搭配 `--post-upgrade` 使用，輸出機器可讀的 JSON 封套 (`{ probesRun, findings }`)
- `--severity-min <level>`：搭配 `--lint` 使用，捨棄低於 `info`、`warning` 或 `error` 的結果
- `--skip <id>`：搭配 `--lint` 使用，跳過一個檢查 ID；重複以跳過多個
- `--only <id>`：搭配 `--lint` 使用，僅執行一個檢查 ID；重複以執行一組較小的選定項目

## Lint 模式

`openclaw doctor --lint` 是 doctor 檢查的唯讀自動化姿態。它使用結構化健康檢查路徑，不會提示，也不會修復或重寫設定/狀態。當您想要機器可讀的結果而非引導式修復提示時，請在 CI、預檢腳本和審查工作流程中使用它。諸如 `--json`、`--severity-min`、`--only` 和 `--skip` 等 Lint 輸出選項僅在接受 `--lint` 時有效。

```bash
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --allow-exec
openclaw doctor --lint --only core/doctor/gateway-config --json
```

人工輸出很精簡：

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

退出行為：

- `0`：在選定的嚴重性閾值或以上沒有結果
- `1`：至少有一個結果符合選定的閾值
- `2`：在產生 lint 結果之前的指令/執行時期失敗

`--severity-min` 同時控制可見結果和退出閾值。例如，`openclaw doctor --lint --severity-min error` 可以不列印任何結果並退出 `0`，即使存在較低嚴重性的 `info` 或 `warning` 結果。

## 結構化健康檢查

現代 doctor 檢查使用一個小型的結構化合約：

```ts
detect(ctx, scope?) -> HealthFinding[]
repair?(ctx, findings) -> HealthRepairResult
```

`detect()` 驅動 `doctor --lint`。`repair()` 是可選的，僅被
`doctor --fix` / `doctor --repair` 考慮。尚未遷移到此形狀的
檢查會繼續使用舊版 doctor 貢獻流程。

這種分割是有意為之的：`detect()` 負責診斷，而 `repair()` 負責
報告它變更或將變更的內容。修復上下文可以攜帶
`dryRun`/`diff` 請求，而修復結果可以針對
設定/檔案編輯返回結構化的 `diffs`，以及針對服務、行程、套件、狀態或其他
副作用返回 `effects`。這讓轉換後的檢查可以朝向 `doctor --fix --dry-run`
和差異報告發展，而無需將變異計畫移至 `detect()`。

`repair()` 會回報它是否嘗試了請求的修復，狀態為 `status:
"repaired" | "skipped" | "failed"`. Omitted status means `repaired`，因此簡單的
修復檢查只需回報變更。當修復返回 `skipped` 或
`failed` 時，doctor 會回報原因並且不會對該檢查執行驗證。

成功的結構化修復後，doctor 會以修復後的發現作為範圍重新執行 `detect()`。
檢查可以使用選定的發現、路徑或 `ocPath`
值進行專注驗證。如果發現仍然存在，doctor 會回報修復警告，而不是將變更視為無聲完成。

發現包括：

| 欄位              | 用途                                            |
| ----------------- | ----------------------------------------------- |
| `checkId`         | 用於 skip/only 過濾器和 CI 許可清單的穩定 ID。  |
| `severity`        | `info`、`warning` 或 `error`。                  |
| `message`         | 人類可讀的問題陳述。                            |
| `path`            | 可用的設定、檔案或邏輯路徑。                    |
| `line` / `column` | 可用的來源位置。                                |
| `ocPath`          | 當檢查可以指向特定 `oc://` 地址時提供精確位置。 |
| `fixHint`         | 建議的操作員操作或修復摘要。                    |

此版本在結構化健康路徑上註冊了現代化的核心 doctor 檢查。`openclaw/plugin-sdk/health` 子路徑為捆綁的後續消費者公開了相同的合約，但外掛支援的檢查僅在其擁有的套件在活動指令路徑中註冊它們之後才會運行。

## 檢查選擇

當工作流程需要專注的閘道時，請使用 `--only` 和 `--skip`：

```bash
openclaw doctor --lint --only core/doctor/gateway-config --json
openclaw doctor --lint --skip core/doctor/skills-readiness
```

`--only` 和 `--skip` 接受完整的檢查 ID 並且可以重複使用。如果 `--only` ID 未註冊，則不會為該 ID 運行任何檢查；請使用指令的 `checksRun` 和 `checksSkipped` 欄位來驗證專注的閘道是否正在選擇您預期的檢查。

## 升級後模式

`openclaw doctor --post-upgrade` 運行外掛相容性探測，旨在鏈接在建置或升級之後。結果會發送到 stdout；如果任何結果具有 `level: "error"`，則指令以代碼 1 退出。新增 `--json` 以接收適合於 CI、社群 `fork-upgrade` skill 以及其他升級後冒煙測試工具的機器可讀包络 (`{ probesRun, findings }`)。如果已安裝的外掛索引遺失或格式錯誤，JSON 模式仍會發送該包络，並帶有 `plugin.index_unavailable` 錯誤結果。

備註：

- 在 Nix 模式 (`OPENCLAW_NIX_MODE=1`) 下，唯讀的 doctor 檢查仍然有效，但 `doctor --fix`、`doctor --repair`、`doctor --yes` 和 `doctor --generate-gateway-token` 被停用，因為 `openclaw.json` 是不可變的。請改為編輯此安裝的 Nix 來源；對於 nix-openclaw，請使用以 agent-first 為主的 [快速入門](https://github.com/openclaw/nix-openclaw#quick-start)。
- 互動式提示（例如鑰匙圈/OAuth 修復）僅在 stdin 是 TTY 且未設定 `--non-interactive` 時才會運行。無頭執行（cron、Telegram、無終端機）將會跳過提示。
- 效能：非互動式 `doctor` 執行會跳過急切載入外掛，以便無頭健康檢查保持快速。互動式 doctor 工作階段仍會載入舊版健康與修復流程所需的外掛介面。
- `--lint` 比 `--non-interactive` 更嚴格：它始終是唯讀的，從不提示，也從不套用安全的遷移。當您希望 doctor 進行變更時，請執行 `doctor --fix` 或 `doctor --repair`。
- 根據預設，doctor 在檢查密鑰時不會執行 `exec` SecretRefs。僅在您有意讓 doctor 執行那些設定的密鑰解析器時，才使用 `openclaw doctor --allow-exec` 或 `openclaw doctor --lint --allow-exec`。
- `--fix`（`--repair` 的別名）會將備份寫入 `~/.openclaw/openclaw.json.bak` 並捨棄未知的設定鍵，列出每個被移除的項目。
- 現代化的健康檢查可以為 `doctor --fix` 公開 `repair()` 路徑；未公開路徑的檢查會繼續透過現有的 doctor 修復流程。
- `doctor --fix --non-interactive` 會回報遺失或過時的 gateway service 定義，但在更新修復模式之外不會安裝或重寫它們。對於遺失的服務，請執行 `openclaw gateway install`，或者當您有意要取代啟動器時執行 `openclaw gateway install --force`。
- 狀態完整性檢查現在會偵測 sessions 目錄中的孤立 transcript 檔案。將它們封存為 `.deleted.<timestamp>` 需要互動式確認；`--fix`、`--yes` 和無頭執行會將其保留原處。
- Doctor 也會掃描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中舊版 cron job 的格式，並在將標準資料列匯入 SQLite 之前重寫它們。
- Doctor 會回報具有明確 `payload.model` 覆寫的 cron jobs，包括提供者命名空間計數以及與 `agents.defaults.model` 的不符情況，因此未繼承預設模型的排程工作會在授權或計費調查時顯示出來。
- 在 Linux 上，當使用者的 crontab 仍在執行舊版 `~/.openclaw/bin/ensure-whatsapp.sh` 時，doctor 會發出警告；該腳本已不再維護，並且當 cron 缺少 systemd 使用者匯流排環境時，可能會記錄錯誤的 WhatsApp 閘道離線狀態。
- 當啟用 WhatsApp 時，doctor 會檢查是否有本機 `openclaw-tui` 用戶端仍在執行，導致閘道事件迴圈效能降低。`doctor --fix` 僅停止已驗證的本機 TUI 用戶端，以免 WhatsApp 回覆被陳舊的 TUI 重新整理迴圈阻塞。
- Doctor 會將主要模型、後備模型、圖像/視頻生成模型、heartbeat/subagent/compaction 覆蓋、hooks、通道模型覆蓋以及陳舊的會話路由釘選中的舊版 `openai-codex/*` 模型參照重寫為標準 `openai/*` 參照。`--fix` 也會將舊版 `openai-codex:*` 驗證設定檔和 `auth.order.openai-codex` 項目遷移至 `openai:*`，將 Codex 意圖移至提供者/模型範圍的 `agentRuntime.id: "codex"` 項目，移除陳舊的整個 Agent/會話運行時釘選，並在 Codex 驗證路由上保留修復後的 OpenAI Agent 參照，而不是直接使用 OpenAI API 金鑰驗證。
- Doctor 會清除由較舊版本的 OpenClaw 建立的舊版外掛程式相依性暫存狀態，並為將其宣告為對等相依性的受管理 npm 外掛程式重新連結主機 `openclaw` 套件。它還會修復組態中參照的遺失可下載外掛程式，例如 `plugins.entries`、已設定的通道、已設定的提供者/搜尋設定或已設定的 Agent 運行時。在套件更新期間，doctor 會跳過套件管理員外掛程式修復，直到套件交換完成；如果已設定的外掛程式仍需要復原，請在事後重新執行 `openclaw doctor --fix`。如果下載失敗，doctor 會回報安裝錯誤並保留已設定的外掛程式項目以供下次修復嘗試。
- 當外掛程式探索狀態良好時，Doctor 會透過從 `plugins.allow`/`plugins.deny`/`plugins.entries` 中移除遺失的外掛程式 ID，以及移除對應的懸置通道設定、heartbeat 目標和通道模型覆蓋，來修復陳舊的外掛程式設定。
- Doctor 會透過停用受影響的 `plugins.entries.<id>` 項目並移除其無效的 `config` 載荷，來隔離無效的外掛程式配置。Gateway 啟動時原本就會跳過該有問題的外掛程式，因此其他外掛程式和通道可以繼續運作。
- 當另一個監督器擁有 Gateway 生命週期時，請設定 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。Doctor 仍會回報 Gateway/服務的健康狀況並套用非服務修復，但會跳過服務安裝/啟動/重新啟動/啟動引導及舊版服務清理。
- 在 Linux 上，doctor 會忽略非使用中的額外 Gateway 類似 systemd 單元，並且在修復期間不會重寫執行中 systemd Gateway 服務的命令/入口點元資料。請先停止服務，或者當您有意要替換使用中的啟動器時，請使用 `openclaw gateway install --force`。
- Doctor 會自動將舊版平面 Talk 配置（`talk.voiceId`、`talk.modelId` 及相關項目）遷移至 `talk.provider` + `talk.providers.<provider>`。
- 重複執行 `doctor --fix` 時，若唯一的差異在於物件鍵的順序，將不再回報/套用 Talk 正規化。
- Doctor 包含記憶體搜尋就緒檢查，並且當缺少內嵌憑證時，可以建議使用 `openclaw configure --section model`。
- 當未設定命令擁有者時，Doctor 會發出警告。命令擁有者是允許執行僅限擁有者之命令及批准危險操作的人力操作員帳戶。DM 配對僅允許某人与機器人對話；如果您在首任擁有者啟動引導存在之前就已核准傳送者，請明確設定 `commands.ownerAllowFrom`。
- 當設定 Codex 模式代理程式且操作員的 Codex 目錄中存在個人 Codex CLI 資產時，Doctor 會回報資訊註記。本機 Codex app-server 啟動使用獨立的各代理程式主目錄，因此如有需要請先安裝 Codex 外掛程式，然後使用 `openclaw migrate plan codex` 來盤點應刻意提升的資產。
- Doctor 會移除已退役的 `plugins.entries.codex.config.codexDynamicToolsProfile`；Codex app-server 始終會將 Codex 原生工作區工具保持為原生狀態。
- 當預設代理程式允許的技能因缺少 bins、env vars、config 或 OS 需求而在目前執行時環境中無法使用時，Doctor 會發出警告。`doctor --fix` 可以使用 `skills.entries.<skill>.enabled=false` 停用那些無法使用的技能；如果您想保持該技能啟用，請改為安裝/設定缺少的需求。
- 如果啟用了沙盒模式但 Docker 無法使用，doctor 會回報一個包含修復建議（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）的高訊號警告。
- 如果存在舊版沙盒註冊表檔案（`~/.openclaw/sandbox/containers.json` 或 `~/.openclaw/sandbox/browsers.json`），doctor 會回報它們；`openclaw doctor --fix` 會將有效的項目遷移到分片註冊表目錄，並隔離無效的舊版檔案。
- 如果 `gateway.auth.token`/`gateway.auth.password` 是由 SecretRef 管理的，且在目前指令路徑中無法使用，doctor 會回報唯讀警告，且不會寫入明文後備憑證。對於 exec 支援的 SecretRef，除非出現 `--allow-exec`，否則 doctor 會跳過執行。
- 如果在修復路徑中檢查通道 SecretRef 失敗，doctor 會繼續執行並回報警告，而不是提前退出。
- 在狀態目錄遷移後，如果啟用的預設 Telegram 或 Discord 帳戶依賴 env 後備，且 doctor 程序無法使用 `TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN`，doctor 會發出警告。
- Telegram `allowFrom` 使用者名稱自動解析（`doctor --fix`）需要在目前指令路徑中有可解析的 Telegram token。如果 token 檢查無法使用，doctor 會回報警告並在該次通過中跳過自動解析。

## macOS：`launchctl` env 覆寫

如果您之前執行過 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），該值會覆寫您的設定檔，並可能導致持續的「未授權」錯誤。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [Gateway doctor](/zh-Hant/gateway/doctor)
