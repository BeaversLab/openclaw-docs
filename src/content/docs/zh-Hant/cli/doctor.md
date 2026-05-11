---
summary: "CLI 參考指南：`openclaw doctor`（健康檢查 + 指導修復）"
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
- 效能：非互動式 `doctor` 執行會跳過積極式的外掛程式載入，讓無頭式 (headless) 健康檢查保持快速。當檢查需要互動式工作階段時，仍然會完整載入外掛程式。
- `--fix` (`--repair` 的別名) 會將備份寫入 `~/.openclaw/openclaw.json.bak` 並捨棄未知的設定鍵，列出每一個移除項目。
- 狀態完整性檢查現在會偵測 sessions 目錄中的孤兒轉錄檔 (transcript files)，並可將其封存為 `.deleted.<timestamp>` 以安全地回收空間。
- Doctor 也會掃描 `~/.openclaw/cron/jobs.json` (或 `cron.store`) 尋找舊版的 cron job 格式，並可在排程器於執行時自動將其正規化之前就地重寫它們。
- Doctor 會修復遺失的套件外掛程式執行階段相依性，而不寫入已封裝的全域安裝。對於 root 擁有的 npm 安裝或強化的 systemd 單元，請將 `OPENCLAW_PLUGIN_STAGE_DIR` 設定為可寫入的目錄，例如 `/var/lib/openclaw/plugin-runtime-deps`；它也可以是路徑清單，例如 `/opt/openclaw/plugin-runtime-deps:/var/lib/openclaw/plugin-runtime-deps`，其中較早的根是唯讀查詢層，而最後一個根是修復目標。
- Doctor 會透過從 `plugins.allow`/`plugins.entries` 中移除遺失的外掛程式 ID，以及在外掛程式探索健康時移除相符的懸置通道設定、心跳目標和通道模型覆寫，來修復過期的外掛程式設定。
- Doctor 會透過停用受影響的 `plugins.entries.<id>` 項目並移除其無效的 `config` 載荷，來隔離無效的外掛程式設定。Gateway 啟動已經只會跳過該錯誤的外掛程式，因此其他外掛程式和通道可以繼續執行。
- 當另一個 supervisor 擁有 gateway 生命週期時，請設定 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。Doctor 仍會回報 gateway/服務健全狀況並套用非服務修復，但會跳過服務安裝/啟動/重新啟動/開機程序以及舊版服務清理。
- Doctor 會自動將舊版平面 Talk 設定（`talk.voiceId`、`talk.modelId` 等）遷移至 `talk.provider` + `talk.providers.<provider>`。
- 重複 `doctor --fix` 執行時，如果唯一的差異是物件鍵順序，將不再回報/套用 Talk 正規化。
- Doctor 包含記憶體搜尋就緒檢查，並且在遺失內嵌認證時可以建議 `openclaw configure --section model`。
- 如果已啟用沙箱模式但 Docker 無法使用，doctor 會回報高訊號警告並提供修復方法（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理，且在當前指令路徑中不可用，doctor 會回報唯讀警告，並不會寫入純文字後援認證資訊。
- 如果通道 SecretRef 檢查在修復路徑中失敗，doctor 會繼續執行並回報警告，而不是提早結束。
- Telegram `allowFrom` 使用者名稱自動解析 (`doctor --fix`) 需要在當前指令路徑中有一個可解析的 Telegram token。如果 token 檢查不可用，doctor 會回報警告並跳過該次回合的自動解析。

## macOS：`launchctl` 環境變數覆蓋

如果您先前執行過 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (或 `...PASSWORD`)，該值會覆蓋您的設定檔，並可能導致持續的「未授權」錯誤。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## 相關

- [CLI 參考](/zh-Hant/cli)
- [Gateway doctor](/zh-Hant/gateway/doctor)
