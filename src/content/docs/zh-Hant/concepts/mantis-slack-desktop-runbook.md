---
summary: "Mantis Slack 桌面版 QA 的操作員手冊：GitHub 分派、本機 CLI、溫暖 VNC 租約、Hydrate 模式、計時解讀、成品與失敗處理。"
read_when:
  - Running Mantis Slack desktop QA from GitHub or locally
  - Debugging slow Mantis Slack desktop runs
  - Choosing source, prehydrated, or warm-lease mode
  - Posting screenshot and video evidence to a PR
title: "Mantis Slack 桌面版操作手冊"
---

Mantis Slack 桌面版 QA 是針對需要 Linux 桌面、VNC 救援、Slack Web、真正的 OpenClaw 閘道、螢幕截圖、影片以及 PR 證據註解的 Slack 級別錯誤的真實 UI 通道。

當單元測試或無頭 Slack 即時通道無法證明該錯誤時，請使用此通道。

## 儲存模型

Mantis 使用三種不同的儲存層：

- 提供者映像檔：由 Crabbox 擁有並儲存在雲端提供者帳戶中。
  它包含機器功能，例如 Chrome/Chromium、ffmpeg、scrot、
  Node/corepack/pnpm、原生建置工具以及空的快取目錄。
- 溫暖租約狀態：由目前的操作員階段擁有。在租約期間，它可以包含
  已登入的瀏覽器設定檔、`/var/cache/crabbox/pnpm` 以及準備好的來源
  檢出。
- Mantis 成品：由 OpenClaw 執行擁有。它們位於
  `.artifacts/qa-e2e/mantis/...` 之下，接著 GitHub Actions 會將其上傳，而
  Mantis GitHub App 會在 PR 上發表內嵌證據註解。

切勿將機密、瀏覽器 Cookie、Slack 登入狀態、存放庫檢出、
`node_modules` 或 `dist/` 放入預先烘焙的提供者映像檔中。

## GitHub 分派

從 `main` 執行工作流程：

```bash
gh workflow run mantis-slack-desktop-smoke.yml \
  --ref main \
  -f candidate_ref=<trusted-ref-or-sha> \
  -f pr_number=<pr-number> \
  -f scenario_id=slack-canary \
  -f crabbox_provider=aws \
  -f keep_vm=false \
  -f hydrate_mode=source
```

允許的 `candidate_ref` 值有意設限，因為工作流程
使用即時憑證：目前的 `main` 祖系、發佈標籤，或來自
`openclaw/openclaw` 的開放 PR Head。

工作流程會寫入：

- 已上傳的成品：`mantis-slack-desktop-smoke-<run-id>-<attempt>`；
- 來自 Mantis GitHub App 的內嵌 PR 註解；
- `slack-desktop-smoke.png`；
- `slack-desktop-smoke.mp4`；
- `slack-desktop-smoke-preview.gif`；
- `slack-desktop-smoke-change.mp4`；
- `mantis-slack-desktop-smoke-summary.json`；
- `mantis-slack-desktop-smoke-report.md`；
- 遠端日誌，例如 `slack-desktop-command.log`、`openclaw-gateway.log`、
  `chrome.log` 和 `ffmpeg.log`。

PR 評論會透過隱藏的
`<!-- mantis-slack-desktop-smoke -->` 標記就地更新。

## 本機 CLI

冷來源驗證：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --class standard \
  --gateway-setup \
  --credential-source convex \
  --credential-role maintainer \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --scenario slack-canary \
  --hydrate-mode source
```

保留 VM 以供 VNC 救援：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --class standard \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

開啟 VNC：

```bash
crabbox vnc --provider aws --id <cbx_id> --open
```

重用溫熱租用：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --lease-id <cbx_id-or-slug> \
  --gateway-setup \
  --scenario slack-canary \
  --hydrate-mode source
```

僅當重用的遠端工作區已經擁有
`node_modules` 和已建置的 `dist/` 時，才使用 `--hydrate-mode prehydrated`。如果缺少這些，Mantis 將以封閉式失敗處理。

## Hydrate 模式

| 模式          | 使用時機                 | 遠端行為                                                                       | 權衡                                 |
| ------------- | ------------------------ | ------------------------------------------------------------------------------ | ------------------------------------ |
| `source`      | 一般 PR 驗證、冷機器、CI | 在 VM 內執行 `pnpm install --frozen-lockfile --prefer-offline` 和 `pnpm build` | 最慢，最強的來源檢出驗證             |
| `prehydrated` | 您刻意準備了可重用的租用 | 需要現有的 `node_modules` 和 `dist/`；跳過安裝/建置                            | 快速，但僅對操作員控制的溫熱租用有效 |

GitHub Actions 總是在 VM 執行前準備候選檢出。其 pnpm store 會根據作業系統、Node 版本和鎖定檔進行快取。VM 來源執行也會在存在時使用 `/var/cache/crabbox/pnpm`。

## 時序解讀

`mantis-slack-desktop-smoke-report.md` 包含階段時序：

- `crabbox.warmup`：雲端提供者啟動、桌面/瀏覽器就緒度以及 SSH。
- `crabbox.inspect`：租用中繼資料查詢。
- `credentials.prepare`：取得 Convex 憑證租用。
- `crabbox.remote_run`：同步、瀏覽器啟動、OpenClaw 安裝/建置或
  hydrate 驗證、閘道啟動、截圖和影片擷取。
- `artifacts.copy`：從 VM rsync 回來。

當 Crabbox 在 Mantis 複製證明 OpenClaw 閘道
已啟動且設定已完成的中繼資料後，傳回非零遠端狀態時，`crabbox.remote_run` 可被標記為 `accepted`。將 `accepted` 視為附帶說明的通過，
而非失敗情境。

如果執行緩慢：

- 暖機佔主導：預先烘焙或升級更好的 Crabbox 提供者映像；
- remote_run 在 `source` 中佔主導：使用溫熱租用、改善 pnpm store 重複使用，
  或將機器先決條件移入提供者映像；
- remote_run 主導 `prehydrated`：遠端工作區實際上尚未
  準備就緒，或是 gateway/browser/Slack 設定緩慢；
- artifact copy 主導：檢查影片大小與 artifact 目錄內容。

## 證據檢查清單

一個好的 PR 註解應該顯示：

- scenario id 與 candidate SHA；
- GitHub Actions run URL；
- artifact URL；
- 內嵌截圖；
- 若有提供則加上內嵌動畫預覽；
- 完整 MP4 與裁切後 MP4 連結；
- 通過/失敗狀態；
- 附加報告中的時序摘要。

請勿將截圖或影片提交到儲存庫。請將它們保留在 GitHub
Actions artifacts 或 PR 註解中。

## 失敗處理

若工作流程在 VM 執行前失敗，請先檢查 Actions 工作。常見
原因包括不受信任的 `candidate_ref`、缺少環境 secrets，或 candidate
安裝/建置失敗。

若 VM 執行失敗但截圖已被複製回來，請檢查：

```bash
cat mantis-slack-desktop-smoke-report.md
cat mantis-slack-desktop-smoke-summary.json
cat slack-desktop-command.log
cat openclaw-gateway.log
cat chrome.log
cat ffmpeg.log
```

若該次執行保留了租用，請使用報告中的 `crabbox vnc ...` 指令開啟 VNC。
完成後請停止租用：

```bash
crabbox stop --provider aws <cbx_id-or-slug>
```

若 Slack 登入已過期，請在保留的租用上透過 VNC 進行修復，並使用
`--lease-id` 重新執行。請勿將該瀏覽器設定檔烘焙到 provider 映像中。

## 相關資訊

- [QA 概觀](/zh-Hant/concepts/qa-e2e-automation)
- [Slack 頻道](/zh-Hant/channels/slack)
- [測試](/zh-Hant/help/testing)
