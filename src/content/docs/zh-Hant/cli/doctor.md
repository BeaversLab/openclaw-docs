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

- 疑難排解：[疑難排解](/en/gateway/troubleshooting)
- 安全性稽核：[安全性](/en/gateway/security)

## 範例

```bash
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep
```

注意事項：

- 互動式提示（例如鑰匙圈/OAuth 修復）僅在 stdin 為 TTY 且未設定 `--non-interactive` 時執行。無介面執行（cron、Telegram、無終端機）將跳過提示。
- `--fix`（`--repair` 的別名）會將備份寫入 `~/.openclaw/openclaw.json.bak` 並移除未知的設定鍵，列出每個移除項目。
- 狀態完整性檢查現在會偵測 sessions 目錄中的孤立轉錄檔，並可將其封存為 `.deleted.<timestamp>` 以安全地回收空間。
- Doctor 也會掃描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中的舊版 cron job 格式，並可將其就地重寫，以避免排程器在執行時自動將其正規化。
- Doctor 包含記憶體搜尋就緒檢查，並可在缺少嵌入憑證時建議使用 `openclaw configure --section model`。
- 如果已啟用沙盒模式但 Docker 無法使用，doctor 會回報高訊號警告並提供修復方法（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理，且在目前的指令路徑中無法使用，doctor 會回報唯讀警告，並不會寫入純文字後備憑證。
- 如果在修復路徑中通道 SecretRef 檢查失敗，doctor 會繼續執行並回報警告，而非提早退出。
- Telegram `allowFrom` 使用者名稱自動解析（`doctor --fix`）需要目前指令路徑中有可解析的 Telegram 權杖。如果無法檢查權杖，doctor 會回報警告並在該次傳遞中跳過自動解析。

## macOS：`launchctl` 環境變數覆寫

如果您先前執行過 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），該值將覆蓋您的設定檔，並可能導致持續的「未授權」錯誤。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```
