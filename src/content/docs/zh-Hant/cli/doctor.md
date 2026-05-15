---
summary: "CLI 參考資料，適用於 `openclaw doctor` (健康檢查 + 指引修復)"
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

## 範例

```bash
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep
openclaw doctor --repair --non-interactive
openclaw doctor --generate-gateway-token
```

針對特定頻道的權限，請使用頻道探測器 (channel probes) 來代替 `doctor`：

```bash
openclaw channels capabilities --channel discord --target channel:<channel-id>
openclaw channels status --probe
```

目標 Discord 功能探測器會回報 Bot 的有效頻道權限；狀態探測器會稽核已設定的 Discord 頻道和語音自動加入目標。

## 選項

- `--no-workspace-suggestions`：停用工作區記憶體/搜尋建議
- `--yes`：接受預設值而不提示
- `--repair`：在不提示的情況下套用建議的非服務修復；閘道服務安裝和重寫仍需要互動式確認或明確的閘道指令
- `--fix`：`--repair` 的別名
- `--force`：套用進階修復，包括在需要時覆寫自訂服務設定
- `--non-interactive`：無提示執行；僅限安全遷移和非服務修復
- `--generate-gateway-token`：產生並設定閘道權杖
- `--deep`：掃描系統服務以尋找額外的閘道安裝，並回報最近的 Gateway supervisor 重新啟動交接

備註：

- 在 Nix 模式 (`OPENCLAW_NIX_MODE=1`) 下，唯讀的 doctor 檢查仍然有效，但 `doctor --fix`、`doctor --repair`、`doctor --yes` 和 `doctor --generate-gateway-token` 已停用，因為 `openclaw.json` 是不可變的。請改為編輯此安裝的 Nix 來源；對於 nix-openclaw，請使用以代理程式為優先的 [快速入門](https://github.com/openclaw/nix-openclaw#quick-start)。
- 互動式提示 (例如鑰匙圈/OAuth 修復) 僅在 stdin 為 TTY 且**未**設定 `--non-interactive` 時執行。無頭式執行 (cron、Telegram、無終端機) 將會跳過提示。
- 效能：非互動式 `doctor` 執行會跳過預先載入外掛程式，以便無頭健康檢查保持快速。當檢查需要外掛程式的貢獻時，互動式工作階段仍會完整載入外掛程式。
- `--fix` (`--repair` 的別名) 會將備份寫入 `~/.openclaw/openclaw.json.bak` 並捨棄未知的配置金鑰，列出每個移除項目。
- `doctor --fix --non-interactive` 會報告遺失或過時的閘道服務定義，但在更新修復模式之外不會安裝或重寫它們。針對遺失的服務請執行 `openclaw gateway install`，或者當您有意要取代啟動器時執行 `openclaw gateway install --force`。
- 狀態完整性檢查現在會偵測工作階段目錄中的孤立文字紀錄檔。將它們封存為 `.deleted.<timestamp>` 需要互動式確認；`--fix`、`--yes` 和無頭執行會將其保留在原處。
- Doctor 也會掃描 `~/.openclaw/cron/jobs.json` (或 `cron.store`) 尋找舊版 cron job 形狀，並且可以在排程器於執行時自動將其正規化之前就地重寫它們。
- 在 Linux 上，當使用者的 crontab 仍在執行舊版 `~/.openclaw/bin/ensure-whatsapp.sh` 時，doctor 會發出警告；該腳本已不再維護，且當 cron 缺少 systemd user-bus 環境時，可能會記錄錯誤的 WhatsApp 閘道停機訊息。
- 當啟用 WhatsApp 時，doctor 會檢查是否有本機 `openclaw-tui` 用戶端仍在執行，導致閘道事件迴圈效能降低。`doctor --fix` 僅停止已驗證的本機 TUI 用戶端，以免 WhatsApp 回覆被卡在過時的 TUI 重新整理迴圈之後。
- Doctor 會將舊版 `openai-codex/*` 模型參照重寫為標準 `openai/*` 參照，範圍涵蓋主要模型、後備模型、heartbeat/subagent/compaction 覆寫、hooks、通道模型覆寫，以及過時的工作階段路由釘選。`--fix` 會保留明確的提供者/模型 `agentRuntime` 原則，移除過時的全 agent/工作階段執行時釘選，並在使用官方 OpenAI 提供者時，在預設 Codex 佈建上保留標準 OpenAI agent 參照。
- Doctor 會清除舊版 OpenClaw 建立的遺留外掛相依性暫存狀態。它還會修復設定檔中參照但遺失的可下載外掛，例如 `plugins.entries`、已設定的頻道、已設定的提供者/搜尋設定，或已設定的 Agent 執行環境。在套件更新期間，doctor 會略過套件管理員外掛修復，直到套件交換完成；如果設定的外掛仍需要復原，請在之後重新執行 `openclaw doctor --fix`。如果下載失敗，doctor 會回報安裝錯誤並保留設定的外掛項目，以便下次修復嘗試。
- 當外掛探索健康時，Doctor 會透過從 `plugins.allow`/`plugins.entries` 移除遺失的外掛 ID 來修復過時的外掛設定，加上相符的懸置頻道設定、心跳目標和頻道模型覆寫。
- Doctor 會透過停用受影響的 `plugins.entries.<id>` 項目並移除其無效的 `config` 載荷，來隔離無效的外掛設定。Gateway 啟動時已會略過該錯誤外掛，讓其他外掛和頻道能繼續執行。
- 當其他監督程式擁有 Gateway 生命週期時，請設定 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。Doctor 仍會回報 Gateway/服務健康狀態並套用非服務修復，但會略過服務安裝/啟動/重新啟動/引導和遺留服務清理。
- 在 Linux 上，doctor 會忽略非作用中的額外類似 Gateway 的 systemd 單元，並且在修復期間不會重寫執行中 systemd gateway 服務的命令/進入點中繼資料。請先停止服務，或者當您有意要取代現用啟動器時使用 `openclaw gateway install --force`。
- Doctor 會自動將遺留的平面 Talk 設定（`talk.voiceId`、`talk.modelId` 等）遷移至 `talk.provider` + `talk.providers.<provider>`。
- 重複執行 `doctor --fix` 不再會在唯一差異是物件鍵順序時，回報或套用 Talk 正規化。
- Doctor 包含記憶體搜尋就緒檢查，並且在遺失內嵌憑證時可以建議 `openclaw configure --section model`。
- 當未配置指令擁有者時，Doctor 會發出警告。指令擁有者是被允許執行僅限擁有者的指令並批准危險操作的人類操作員帳戶。DM 配對僅允許某人與機器人對話；如果您在首次擁有者啟動存在之前批准了發送者，請明確設定 `commands.ownerAllowFrom`。
- 當配置了 Codex 模式的代理，且操作員的 Codex 主目錄中存在個人 Codex CLI 資產時，Doctor 會發出警告。本機 Codex 應用程式伺服器啟動使用獨立的逐代理主目錄，因此請使用 `openclaw migrate codex --dry-run` 來列舉應被有意提升的資產。
- Doctor 會移除已淘汰的 `plugins.entries.codex.config.codexDynamicToolsProfile`；Codex 應用程式伺服器始終保持 Codex 原生的工作區工具為原生狀態。
- 當允許預設代理使用的技能由於缺少 bins、環境變數、配置或 OS 需求而在當前執行時環境中不可用時，Doctor 會發出警告。`doctor --fix` 可以使用 `skills.entries.<skill>.enabled=false` 停用那些不可用的技能；當您希望保持該技能啟用時，請改為安裝/配置缺失的需求。
- 如果啟用了沙箱模式但 Docker 不可用，doctor 會報告一個包含修復建議（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）的高優先級警告。
- 如果存在舊版沙箱登錄檔案（`~/.openclaw/sandbox/containers.json` 或 `~/.openclaw/sandbox/browsers.json`），doctor 會報告它們；`openclaw doctor --fix` 會將有效條目遷移到分片登錄目錄，並隔離無效的舊版檔案。
- 如果 `gateway.auth.token`/`gateway.auth.password` 是由 SecretRef 管理的，且在當前指令路徑中不可用，doctor 會報告一個唯讀警告，並不會寫入純文字備用憑證。
- 如果通道 SecretRef 檢查在修復路徑中失敗，doctor 會繼續並報告警告，而不是提前退出。
- 在狀態目錄遷移後，當已啟用的預設 Telegram 或 Discord 帳戶依賴環境變數備用，且 `TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN` 對 doctor 程序不可用時，doctor 會發出警告。
- Telegram `allowFrom` 使用者名稱自動解析 (`doctor --fix`) 需要在當前指令路徑中有一個可解析的 Telegram token。如果無法檢查 token，doctor 會回報警告並跳過該次的自動解析。

## macOS：`launchctl` 環境變數覆蓋

如果您先前執行過 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (或 `...PASSWORD`)，該數值會覆蓋您的設定檔，並可能導致持續的「未授權」錯誤。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [Gateway doctor](/zh-Hant/gateway/doctor)
