---
summary: "`openclaw doctor` 的 CLI 參考（健康檢查 + 引導修復）"
read_when:
  - You have connectivity/auth issues and want guided fixes
  - You updated and want a sanity check
title: "doctor"
---

# `openclaw doctor`

針對閘道與通道的健康檢查與快速修復。

相關主題：

- 疑難排解：[疑難排解](/zh-Hant/gateway/troubleshooting)
- 安全性稽核：[安全性](/zh-Hant/gateway/security)

## 範例

```bash
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep
```

備註：

- 互動式提示（例如鑰匙圈/OAuth 修復）僅在 stdin 為 TTY 且未設定 `--non-interactive` 時執行。無介面執行（cron、Telegram、無終端機）將跳過提示。
- `--fix`（`--repair` 的別名）會將備份寫入 `~/.openclaw/openclaw.json.bak` 並捨棄未知的配置金鑰，列出每一個移除項目。
- 狀態完整性檢查現在會偵測工作階段目錄中的孤立文字記錄檔，並可將其封存為 `.deleted.<timestamp>` 以安全回收空間。
- Doctor 也會掃描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中的舊版 cron job 形式，並可讓排程器在執行時自動將其正規化之前就地重寫。
- Doctor 包含記憶體搜尋就緒檢查，並可在缺少嵌入憑證時建議使用 `openclaw configure --section model`。
- 如果啟用沙箱模式但 Docker 無法使用，doctor 會報告高信號警告並提供修復建議（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理但在目前的指令路徑中無法使用，doctor 會報告唯讀警告，且不會寫入純文字後備憑證。

## macOS：`launchctl` 環境變數覆寫

如果您先前執行過 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），該值會覆寫您的配置檔，並可能導致持續的「未授權」錯誤。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
