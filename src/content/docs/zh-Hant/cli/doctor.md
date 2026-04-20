---
summary: "CLI 參考指南：`openclaw doctor`（健康檢查 + 指導修復）"
read_when:
  - You have connectivity/auth issues and want guided fixes
  - You updated and want a sanity check
title: "doctor"
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

## 選項

- `--no-workspace-suggestions`：停用工作區記憶體/搜尋建議
- `--yes`：接受預設值而不提示
- `--repair`：套用建議的修復而不提示
- `--fix`：`--repair` 的別名
- `--force`：套用積極的修復，包括在需要時覆寫自訂服務設定
- `--non-interactive`：在無提示下執行；僅限安全遷移
- `--generate-gateway-token`：產生並設定閘道權杖
- `--deep`：掃描系統服務以尋找額外的閘道安裝

備註：

- 互動式提示（例如鑰匙圈/OAuth 修復）僅在 stdin 是 TTY 且未設定 `--non-interactive` 時執行。無頭執行（cron、Telegram、無終端機）將會跳過提示。
- `--fix`（`--repair` 的別名）會將備份寫入 `~/.openclaw/openclaw.json.bak` 並捨棄未知的設定鍵，列出每個移除項目。
- 狀態完整性檢查現在可以偵測 sessions 目錄中的孤兒文字記錄檔，並可將其封存為 `.deleted.<timestamp>` 以安全地回收空間。
- Doctor 也會掃描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）尋找舊版 cron job 形狀，並可在排程器於執行時自動正規化之前就地重寫它們。
- Doctor 會自動將舊版平面 Talk 設定（`talk.voiceId`、`talk.modelId` 及相關設定）遷移至 `talk.provider` + `talk.providers.<provider>`。
- 重複執行 `doctor --fix` 不再會在唯一差異是物件鍵順序時回報/套用 Talk 正規化。
- Doctor 包含記憶體搜尋就緒檢查，並可在缺少嵌入憑證時建議 `openclaw configure --section model`。
- 如果啟用了沙盒模式但 Docker 無法使用，doctor 會回報高訊號警告並提供補救措施（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理，且在當前指令路徑中不可用，doctor 會回報唯讀警告，並不會寫入純文字後備憑證。
- 如果在修復路徑中檢查頻道 SecretRef 失敗，doctor 會繼續執行並回報警告，而不會提前結束。
- Telegram `allowFrom` 使用者名稱自動解析 (`doctor --fix`) 需要在當前指令路徑中有可解析的 Telegram token。如果無法檢查 token，doctor 會回報警告並在該次檢查中跳過自動解析。

## macOS：`launchctl` 環境變數覆蓋

如果您先前執行過 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (或 `...PASSWORD`)，該值會覆蓋您的設定檔，並可能導致持續的「未授權」錯誤。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```
