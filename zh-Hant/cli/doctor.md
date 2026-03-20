---
summary: "CLI 參考手冊，用於 `openclaw doctor`（健康檢查 + 指引修復）"
read_when:
  - 您遇到連線/認證問題並且希望獲得指引修復
  - 您已更新版本並希望進行完整性檢查
title: "doctor"
---

# `openclaw doctor`

針對閘道和頻道的健康檢查與快速修復。

相關：

- 疑難排解：[疑難排解](/zh-Hant/gateway/troubleshooting)
- 安全性稽核：[安全性](/zh-Hant/gateway/security)

## 範例

```bash
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep
```

注意事項：

- 互動式提示（例如鑰匙圈/OAuth 修復）僅在 stdin 為 TTY 且未設定 `--non-interactive` 時執行。無頭模式執行（cron、Telegram、無終端機）將略過提示。
- `--fix`（`--repair` 的別名）會將備份寫入 `~/.openclaw/openclaw.json.bak` 並捨棄未知的設定鍵，列出每個移除項目。
- 狀態完整性檢查現在會偵測工作階段目錄中的孤立轉錄檔案，並可將其封存為 `.deleted.<timestamp>` 以安全地回收空間。
- Doctor 也會掃描 `~/.openclaw/cron/jobs.json` (或 `cron.store`) 中舊版的 cron job 形狀，並可在排程器於執行時自動正規化它們之前就地重寫。
- Doctor 包含記憶體搜尋就緒檢查，並可在遺失嵌入憑證時建議使用 `openclaw configure --section model`。
- 如果已啟用沙箱模式但 Docker 無法使用，doctor 會回報高信號警告並提供修復方法 (`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`)。
- 如果 `gateway.auth.token`/`gateway.auth.password` 是由 SecretRef 管理且在目前命令路徑中無法使用，doctor 會回報唯讀警告，並且不會寫入明文後備憑證。
- 如果修復路徑中的通道 SecretRef 檢查失敗，doctor 會繼續執行並報告警告，而不是提前退出。
- Telegram `allowFrom` 使用者名稱自動解析（`doctor --fix`）需要在目前的指令路徑中有一個可解析的 Telegram 權杖。如果無法進行權杖檢查，doctor 會報告警告並在該次檢查中跳過自動解析。

## macOS: `launchctl` env overrides

如果您先前執行過 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），該值會覆蓋您的設定檔，並可能導致持續的「unauthorized」（未授權）錯誤。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

import en from "/components/footer/en.mdx";

<en />
