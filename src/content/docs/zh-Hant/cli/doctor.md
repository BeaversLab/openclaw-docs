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
openclaw doctor --lint --allow-exec
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
- `--allow-exec`：允許 doctor 在驗證機密時執行已設定的 exec SecretRefs
- `--deep`：掃描系統服務是否有額外的 gateway 安裝，並報告最近的 Gateway supervisor 重新啟動交接
- `--lint`：以唯讀模式執行現代化的健康檢查並輸出診斷結果
- `--json`：配合 `--lint`，輸出 JSON 格式結果而非人類可讀輸出
- `--severity-min <level>`：配合 `--lint`，捨棄低於 `info`、`warning` 或 `error` 的結果
- `--skip <id>`：配合 `--lint`，跳過特定檢查 ID；重複使用以跳過多個檢查
- `--only <id>`：配合 `--lint`，僅執行特定檢查 ID；重複使用以執行少量選定的檢查

## Lint 模式

`openclaw doctor --lint` 是 doctor 檢查的唯讀自動化姿態。
它使用結構化健康檢查路徑，不會提示，也不會修復
或重寫設定/狀態。當您需要機器可讀結果而非引導式修復提示時，
請在 CI、預檢腳本和審查工作流程中使用它。
Lint 輸出選項，如 `--json`、`--severity-min`、`--only` 和 `--skip`
僅能與 `--lint` 搭配使用。

```bash
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --allow-exec
openclaw doctor --lint --only core/doctor/gateway-config --json
```

人類可讀輸出很簡潔：

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

- `0`：沒有達到或超過所選嚴重性閾值的結果
- `1`：至少有一個結果符合所選閾值
- `2`：在產生 lint 結果之前的指令/執行階段失敗

`--severity-min` 控制顯示的發現項目和退出閾值。例如，`openclaw doctor --lint --severity-min error` 可以不列印任何發現項目，並即使存在較低嚴重性的 `info` 或 `warning` 發現項目也退出 `0`。

## 結構化健康檢查

現代 doctor 檢查使用一個小型的結構化契約：

```ts
detect(ctx, scope?) -> HealthFinding[]
repair?(ctx, findings) -> HealthRepairResult
```

`detect()` 驅動 `doctor --lint`。`repair()` 是可選的，僅由 `doctor --fix` / `doctor --repair` 考慮。尚未遷移到此形狀的檢查繼續使用舊版的 doctor 貢獻流程。

這種分離是有意的：`detect()` 負責診斷，而 `repair()` 負責回報它變更了什麼或會變更什麼。修復上下文可以攜帶 `dryRun`/`diff` 請求，而修復結果可以針對設定/檔案編輯回傳結構化的 `diffs`，以及針對服務、程序、套件、狀態或其他副作用回傳 `effects`。這讓轉換後的檢查能朝向 `doctor --fix --dry-run` 和差異回報發展，而無需將變異規劃移入 `detect()`。

`repair()` 回報它是否嘗試了請求的修復，使用 `status:
"repaired" | "skipped" | "failed"`. Omitted status means `repaired`，因此簡單的修復檢查只需要回傳變更。當修復回傳 `skipped` 或 `failed` 時，doctor 會回報原因並且不會對該檢查執行驗證。

在成功的結構化修復後，doctor 會以修復後的發現項目為範圍重新執行 `detect()`。檢查可以使用選定的發現項目、路徑或 `ocPath` 值進行專注驗證。如果發現項目仍然存在，doctor 會回報修復警告，而不是將變更視為靜默完成。

發現項目包含：

| 欄位              | 用途                                           |
| ----------------- | ---------------------------------------------- |
| `checkId`         | 用於 skip/only 過濾器和 CI 許可清單的穩定 ID。 |
| `severity`        | `info`、`warning` 或 `error`。                 |
| `message`         | 人類可讀的問題陳述。                           |
| `path`            | 可用的配置、檔案或邏輯路徑。                   |
| `line` / `column` | 可用的來源位置。                               |
| `ocPath`          | 當檢查可以指向特定時，精確的 `oc://` 位址。    |
| `fixHint`         | 建議的操作員操作或修復摘要。                   |

此版本在結構化健康路徑上註冊了現代化的核心 doctor 檢查。`openclaw/plugin-sdk/health` 子路徑為內建的後續消費者公開了相同的契約，但外掛支援的檢查僅在其擁有套件在主動指令路徑中註冊它們後才會執行。

## 檢查選擇

當工作流程需要專注的閘道時，使用 `--only` 和 `--skip`：

```bash
openclaw doctor --lint --only core/doctor/gateway-config --json
openclaw doctor --lint --skip core/doctor/skills-readiness
```

`--only` 和 `--skip` 接受完整的檢查 ID 並可重複使用。如果未註冊 `--only` ID，則該 ID 不會執行任何檢查；請使用指令的 `checksRun` 和 `checksSkipped` 欄位來驗證專注的閘道是否正在選擇您預期的檢查。

備註：

- 在 Nix 模式 (`OPENCLAW_NIX_MODE=1`) 下，唯讀的 doctor 檢查仍然有效，但 `doctor --fix`、`doctor --repair`、`doctor --yes` 和 `doctor --generate-gateway-token` 已停用，因為 `openclaw.json` 是不可變的。請改為編輯此安裝的 Nix 來源；對於 nix-openclaw，請使用 agent-first [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start)。
- 互動式提示 (例如鑰匙圈/OAuth 修復) 僅在 stdin 為 TTY 且未設定 `--non-interactive` 時執行。無頭執行 (cron、Telegram、無終端機) 將跳過提示。
- 效能：非互動式 `doctor` 執行會跳過急切載入外掛，以保持無頭健康檢查的快速性。互動式 doctor 工作階段仍會載入舊版健康和修復流程所需的外掛介面。
- `--lint` 比 `--non-interactive` 更嚴格：它始終是唯讀的，從不提示，也從不套用安全遷移。當您希望 doctor 進行變更時，請執行 `doctor --fix` 或 `doctor --repair`。
- 預設情況下，doctor 在檢查 secrets 時不會執行 `exec` SecretRefs。僅當您刻意希望 doctor 執行那些已配置的 secret 解析器時，才使用 `openclaw doctor --allow-exec` 或 `openclaw doctor --lint --allow-exec`。
- `--fix` (`--repair` 的別名) 會將備份寫入 `~/.openclaw/openclaw.json.bak`，並捨棄未知的配置金鑰，列出每個刪除項目。
- 現代化的健康檢查可以為 `doctor --fix` 公開 `repair()` 路徑；未公開路徑的檢查會繼續透過現有的 doctor 修復流程進行。
- `doctor --fix --non-interactive` 會回報遺失或過時的 gateway service 定義，但在更新修復模式之外不會安裝或重寫它們。針對遺失的服務請執行 `openclaw gateway install`，或者當您刻意想要取代啟動器時執行 `openclaw gateway install --force`。
- 狀態完整性檢查現在會偵測 sessions 目錄中的孤立 transcript 檔案。將其封存為 `.deleted.<timestamp>` 需要互動式確認；`--fix`、`--yes` 和無頭執行會將其保留原處。
- Doctor 也會掃描 `~/.openclaw/cron/jobs.json` (或 `cron.store`) 中的舊版 cron job 形狀，並且可以在排程器於執行時自動將其正規化之前就地重寫它們。
- Doctor 會回報具有明確 `payload.model` 覆蓋的 cron jobs，包括提供者命名空間計數以及與 `agents.defaults.model` 的不符之處，以便在驗證或計費調查期間看到未繼承預設模型的已排程工作。
- 在 Linux 上，當使用者的 crontab 仍在執行舊版 `~/.openclaw/bin/ensure-whatsapp.sh` 時，doctor 會發出警告；該腳本已不再維護，並且當 cron 缺少 systemd user-bus 環境時，可能會記錄錯誤的 WhatsApp gateway 停機訊息。
- 當啟用 WhatsApp 時，doctor 會檢查是否有本機 `openclaw-tui` 用戶端仍在運行的已降級 Gateway 事件循環。`doctor --fix` 僅停止已驗證的本機 TUI 用戶端，以便 WhatsApp 回覆不會排在過時的 TUI 重新整理循環之後。
- Doctor 會將主要的模型、後備、心跳/子代理/壓縮覆寫、鉤子、通道模型覆寫和過時的會話路由釘選中的舊式 `openai-codex/*` 模型參照重寫為標準 `openai/*` 參照。`--fix` 會將 Codex 意圖移至提供者/模型範圍的 `agentRuntime.id: "codex"` 項目，保留會話 auth-profile 釘選（例如 `openai-codex:...`），移除過時的全代理/會話執行時釘選，並在 Codex auth 路由上保留修復後的 OpenAI 代理參照，而不是直接使用 OpenAI API 金鑰進行驗證。
- Doctor 會清除舊版 OpenClaw 版本建立的舊版外掛程式相依性暫存狀態，並為將其宣告為對等相依性的受管理 npm 外掛程式重新連結主機 `openclaw` 套件。它還會修復設定參照的遺失可下載外掛程式，例如 `plugins.entries`、設定的通道、設定的提供者/搜尋設定或設定的代理執行時。在套件更新期間，doctor 會跳過套件管理員外掛程式修復，直到套件交換完成；如果設定的外掛程式仍需要復原，請在之後重新執行 `openclaw doctor --fix`。如果下載失敗，doctor 會回報安裝錯誤並保留設定的外掛程式項目，以供下次修復嘗試。
- 當外掛程式探索狀況良好時，Doctor 會透過從 `plugins.allow`/`plugins.deny`/`plugins.entries` 中移除遺失的外掛程式 ID，以及移除相符的懸空通道設定、心跳目標和通道模型覆寫，來修復過時的外掛程式設定。
- Doctor 會透過停用受影響的 `plugins.entries.<id>` 項目並移除其無效的 `config` 載荷，來隔離無效的外掛程式設定。Gateway 啟動時已經會跳過該錯誤的外掛程式，以便其他外掛程式和通道可以繼續執行。
- 當另一個監督器擁有 gateway 生命週期時，設定 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。Doctor 仍會報告 gateway/服務的健康狀態並套用非服務修復，但會跳過服務安裝/啟動/重新啟動/啟動引導 以及舊版服務清理。
- 在 Linux 上，doctor 會忽略非額外作用中的類似 gateway systemd 單元，並且在修復期間不會重寫正在執行的 systemd gateway 服務的 command/entrypoint 中繼資料。請先停止服務，或者當您有意取代作用中的啟動器時使用 `openclaw gateway install --force`。
- Doctor 會自動將舊版扁平 Talk 設定（`talk.voiceId`、`talk.modelId` 和相關項目）遷移至 `talk.provider` + `talk.providers.<provider>`。
- 重複執行 `doctor --fix` 時，若唯一差異在於物件鍵 的順序，則不再報告/套用 Talk 標準化。
- Doctor 包含記憶體搜尋就緒檢查，並且當缺少嵌入式憑證時可以建議使用 `openclaw configure --section model`。
- 當未設定指令擁有者 時，Doctor 會發出警告。指令擁有者是指被允許執行僅限擁有者指令並核准危險操作的人類操作員帳戶。DM 配對僅允許某人與 Bot 對話；如果您在首次擁有者啟動引導 存在之前就已核准了發送者，請明確設定 `commands.ownerAllowFrom`。
- 當設定 Codex 模式 代理程式 且操作員的 Codex 主目錄中存在個人 Codex CLI 資產時，Doctor 會報告一則資訊備註。本機 Codex 應用程式伺服器啟動會使用各自獨立的每個代理程式主目錄，因此如有需要請先安裝 Codex 外掛程式，然後使用 `openclaw migrate plan codex` 來盤點應刻意提升的資產。
- Doctor 會移除已淘汰的 `plugins.entries.codex.config.codexDynamicToolsProfile`；Codex 應用程式伺服器會始終將 Codex 原生工作區工具保持為原生狀態。
- 當允許預設代理程式使用的技能因缺少 bins、env vars、config 或 OS 需求而在目前執行時環境中無法使用時，Doctor 會發出警告。`doctor --fix` 可以使用 `skills.entries.<skill>.enabled=false` 停用那些無法使用的技能；當您想保持該技能啟用時，請改為安裝/設定缺失的需求。
- 如果啟用了沙箱模式但 Docker 不可用，doctor 會報告一個高信號警告並提供補救措施（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果存在舊版沙箱註冊表檔案（`~/.openclaw/sandbox/containers.json` 或 `~/.openclaw/sandbox/browsers.json`），doctor 會報告它們；`openclaw doctor --fix` 會將有效條目遷移到分片註冊表目錄中，並隔離無效的舊版檔案。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理且在當前指令路徑中不可用，doctor 會報告唯讀警告，且不會寫入純文字後備憑證。對於由 exec 支援的 SecretRef，除非存在 `--allow-exec`，否則 doctor 會跳過執行。
- 如果在修復路徑中通道 SecretRef 檢查失敗，doctor 會繼續並報告警告，而不是提前退出。
- 在狀態目錄遷移後，如果已啟用的預設 Telegram 或 Discord 帳號依賴 env 後備，且 doctor 程序無法存取 `TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN`，doctor 會發出警告。
- Telegram `allowFrom` 使用者名稱自動解析（`doctor --fix`）需要在當前指令路徑中有可解析的 Telegram token。如果 token 檢查不可用，doctor 會報告警告並在該次過程中跳過自動解析。

## macOS：`launchctl` env 覆蓋

如果您之前執行過 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），該值將覆蓋您的設定檔，並可能導致持續的「未授權」錯誤。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## 相關

- [CLI 參考](/zh-Hant/cli)
- [Gateway doctor](/zh-Hant/gateway/doctor)
