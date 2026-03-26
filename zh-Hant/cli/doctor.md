---
summary: "`openclaw doctor`（健康檢查 + 引導式修復）的 CLI 參考"
read_when:
  - You have connectivity/auth issues and want guided fixes
  - You updated and want a sanity check
title: "doctor"
---

# `openclaw doctor`

針對閘道和通道的健康檢查與快速修復。

相關：

- 疑難排解：[疑難排解](/zh-Hant/gateway/troubleshooting)
- 安全稽核：[安全性](/zh-Hant/gateway/security)

## 範例

```bash
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep
```

備註：

- 互動式提示（例如鑰匙圈/OAuth 修復）僅在 stdin 為 TTY 且未設定 `--non-interactive` 時執行。無頭執行（cron、Telegram、無終端機）將會跳過提示。
- `--fix`（`--repair` 的別名）會將備份寫入 `~/.openclaw/openclaw.json.bak`，並捨棄未知的設定鍵，列出每一項移除內容。
- 狀態完整性檢查現在可以偵測 sessions 目錄中的孤兒轉錄檔案，並可將其封存為 `.deleted.<timestamp>` 以安全地回收空間。
- Doctor 也會掃描 `~/.openclaw/cron/jobs.json` (或 `cron.store`) 以尋找舊版的 cron job 形狀，並可以在排程器於執行時自動正規化它們之前就地重寫它們。
- Doctor 包含記憶體搜尋就緒性檢查，並且當嵌入憑證遺失時可以建議使用 `openclaw configure --section model`。
- 如果已啟用沙盒模式但 Docker 無法使用，doctor 會報告具有修復建議的高信號警告 (`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`)。
- 如果 `gateway.auth.token`/`gateway.auth.password` 是由 SecretRef 管理且在目前的命令路徑中無法使用，doctor 會報告唯讀警告，並且不會寫入明文後備憑證。
- 如果在修復路徑中對通道 SecretRef 的檢查失敗，doctor 會繼續執行並回報警告，而不是提早結束。
- Telegram `allowFrom` 使用者名稱自動解析 (`doctor --fix`) 需要在目前指令路徑中有可解析的 Telegram 權杖。如果無法進行權杖檢查，doctor 會回報警告並在該次執行中跳過自動解析。

## macOS：`launchctl` env 覆寫

如果您先前執行過 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (或 `...PASSWORD`)，該值會覆寫您的設定檔，並可能導致持續的「未授權」錯誤。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
