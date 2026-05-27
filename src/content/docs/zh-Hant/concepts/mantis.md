---
summary: "Mantis 是用於在即時傳輸上重現 OpenClaw 錯誤、擷取修復前後證據並將附加檔案附加至 PR 的視覺化端對端驗證系統。"
title: "Mantis"
read_when:
  - Building or running live visual QA for OpenClaw bugs
  - Adding before and after verification for a pull request
  - Adding Discord, Slack, WhatsApp, or other live transport scenarios
  - Debugging QA runs that need screenshots, browser automation, or VNC access
---

Mantis 是 OpenClaw 的端對端驗證系統，專門用於需要真實執行環境、真實傳輸以及可見證據的錯誤。它會針對已知的錯誤參照執行場景，擷取證據，然後針對候選參照執行相同的場景，並將比較結果發布為維護者可以從 PR 或本機指令檢查的附加檔案。

Mantis 從 Discord 開始，因為 Discord 為我們提供了一個高價值的首選通道：真實的機器人身份驗證、真實的伺服器頻道、反應、執行緒、原生指令，以及人類可以視覺化確認傳輸所顯示內容的瀏覽器 UI。

## 目標

- 使用與使用者所見相同的傳輸形狀，從 GitHub issue 或 PR 重現錯誤。
- 在套用修復之前，在基準參照上擷取 **修復前** 的附加檔案。
- 在套用修復之後，在候選參照上擷取 **修復後** 的附加檔案。
- 盡可能使用確定性預言機，例如 Discord REST 反應讀取或頻道紀錄檢查。
- 當錯誤具有可見的 UI 表面時，擷取螢幕截圖。
- 從代理程式控制的 CLI 在本機執行，並從 GitHub 遠端執行。
- 當登入、瀏覽器自動化或提供者驗證卡住時，保留足夠的機器狀態以進行 VNC 救援。
- 當執行被阻塞、需要手動 VNC 協助或完成時，將簡潔的狀態發布到操作員 Discord 頻道。

## 非目標

- Mantis 不是單元測試的替代品。在了解修復後，Mantis 執行通常應變成較小的回歸測試。
- Mantis 不是正常的快速 CI 閘道。它速度較慢，使用即時憑證，並保留給即時環境至關重要的錯誤。
- Mantis 在正常操作中不應需要人類介入。手動 VNC 是救援路徑，而不是理想路徑。
- Mantis 不會在附加檔案、日誌、螢幕截圖、Markdown 報告或 PR 評論中儲存原始機密。

## 擁有權

Mantis 位於 OpenClaw QA 堆疊中。

- OpenClaw 擁有 `pnpm openclaw qa mantis` 下的場景執行環境、傳輸轉接器、證據架構和本機 CLI。
- QA Lab 擁有即時傳輸組件、瀏覽器擷取輔助程式和附加檔案寫入器。
- 當需要遠端虛擬機器時，Crabbox 擁有已預熱的 Linux 機器。
- GitHub Actions 擁有遠端工作流程入口點和成品保留。
- ClawSweeper 擁有 GitHub 評論路由：解析維護者指令、
  分發工作流程，以及發布最終的 PR 評論。
- 當場景需要代理設定、除錯或卡住狀態報告時，OpenClaw 代理會透過 Codex 驅動 Mantis。

此邊界將傳輸知識保留在 OpenClaw 中，機器排程保留在
Crabbox 中，並將維護者工作流程膠水保留在 ClawSweeper 中。

## 指令形狀

第一個本機指令會驗證 Discord 機器人、伺服器、頻道、訊息發送、
回應發送和成品路徑：

```bash
pnpm openclaw qa mantis discord-smoke \
  --output-dir .artifacts/qa-e2e/mantis/discord-smoke
```

本機的前後比對執行器接受此形狀：

```bash
pnpm openclaw qa mantis run \
  --transport discord \
  --scenario discord-status-reactions-tool-only \
  --baseline origin/main \
  --candidate HEAD \
  --output-dir .artifacts/qa-e2e/mantis/local-discord-status-reactions
```

執行器會在輸出目錄下建立分離的基線和候選工作樹，安裝相依項目，建構每個參考版本，使用
`--allow-failures` 執行場景，然後寫入 `baseline/`、`candidate/`、`comparison.json`
和 `mantis-report.md`。對於第一個 Discord 場景，成功的驗證
意味著基線狀態為 `fail` 且候選狀態為 `pass`。

第二個 Discord 前/後探針以執行緒附件為目標：

```bash
pnpm openclaw qa mantis run \
  --transport discord \
  --scenario discord-thread-reply-filepath-attachment \
  --baseline <bug-ref> \
  --candidate <fix-ref> \
  --output-dir .artifacts/qa-e2e/mantis/local-discord-thread-attachment
```

該場景會使用驅動程式機器人發布父訊息，建立一個真實的 Discord
執行緒，使用儲存庫本機的 `filePath` 呼叫 OpenClaw 的 `message.thread-reply` 動作，然後輪詢執行緒以取得 SUT 回應和附件檔名。
基線截圖顯示沒有附件的回應；候選截圖顯示預期的 `mantis-thread-report.md` 附件。

第一個 VM/瀏覽器基本型別是桌面冒煙測試：

```bash
pnpm openclaw qa mantis desktop-browser-smoke \
  --output-dir .artifacts/qa-e2e/mantis/desktop-browser
```

它租用或重複使用 Crabbox 桌面機器，在 VNC 會話內啟動可見的瀏覽器，
擷取桌面畫面，將成品拉回本機輸出目錄，並將重新連線指令寫入報告中。該指令預設
使用 Hetzner 提供者，因為它是 Mantis 通道中第一個具有可用桌面/VNC
覆蓋範圍的提供者。當針對其他 Crabbox 艦隊執行時，使用 `--provider`、`--crabbox-bin` 或
`OPENCLAW_MANTIS_CRABBOX_PROVIDER` 覆寫它。

有用的桌面冒煙測試旗標：

- `--lease-id <cbx_...>` 或 `OPENCLAW_MANTIS_CRABBOX_LEASE_ID` 會重用已預熱的桌面。
- `--browser-url <url>` 會變更可見瀏覽器中開啟的頁面。
- `--html-file <path>` 會在可見瀏覽器中呈現一個本機儲存庫的 HTML 成果。Mantis 使用此功能透過真實的 Crabbox 桌面來擷取產生的 Discord 狀態-反應時間軸。
- `--browser-profile-dir <remote-path>` 會重用遠端的 Chrome user-data-dir，以便持久的 Mantis 桌面可以在執行之間保持登入狀態。將此用於長期存在的 Discord Web 檢視器設定檔。
- `--browser-profile-archive-env <name>` 會在啟動瀏覽器之前，從指定的環境變數還原 base64 編碼的 `.tgz` Chrome user-data-dir 封存。將此用於已登入的見證者，例如 Discord Web。預設的環境變數是 `OPENCLAW_MANTIS_BROWSER_PROFILE_TGZ_B64`。
- `--video-duration <seconds>` 控制擷取 MP4 的長度。對於需要時間穩定的緩慢已登入 Web 應用程式，請使用更長的持續時間。
- `--keep-lease` 或 `OPENCLAW_MANTIS_KEEP_VM=1` 會將新建立的通過租用保持開啟以進行 VNC 檢查。失敗的執行在建立租用時預設會保留該租用，以便操作員可以重新連線。
- `--class`、`--idle-timeout` 和 `--ttl` 可調整機器大小和租用存續時間。

對於 Discord Web 證據，Mantis 使用專用的檢視者帳戶，而不是 Bot 權杖。即時 Discord API 情境仍然是預言：它建立真實的執行緒、發送 SUT `thread-reply`，並透過 Discord REST 檢查附件。當設定 `OPENCLAW_QA_DISCORD_CAPTURE_UI_METADATA=1` 時，情境也會寫入 Discord Web URL 成果。當設定 `OPENCLAW_QA_DISCORD_KEEP_THREADS=1` 時，它會讓該執行緒保持可用時間足夠讓已登入的瀏覽器開啟並記錄它。

GitHub 工作流程會在 Discord Web 中開啟候選執行緒 URL，擷取螢幕畫面，錄製 MP4，並在 Crabbox 媒體工具可用時產生經過修剪的 GIF 預覽。建議使用透過 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` 設定的持續檢視器設定檔路徑，因為完整的 Chrome 設定檔壓縮檔可能會超過 GitHub 的密鑰大小限制。對於小型/啟動設定檔，工作流程也可以從 `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64` 還原 base64 `.tgz` 壓縮檔。如果兩者都未設定，工作流程仍會發布確定性基準/候選附件的螢幕截圖，並記錄一則通知，表示已跳過登入的 Discord Web 見證。

第一個完整的桌面傳輸原語是 Slack desktop smoke：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --output-dir .artifacts/qa-e2e/mantis/slack-desktop \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

它會租用或重複使用 Crabbox 桌面機器，將目前的簽出內容同步到 VM，在該 VM 內執行 `pnpm openclaw qa slack`，在 VNC 瀏覽器中開啟 Slack Web，擷取可見的桌面，並將 Slack QA 成品和 VNC 螢幕截圖複製回本機輸出目錄。這是第一個 Mantis 形式，其中 SUT OpenClaw gateway 和瀏覽器都位於同一個 Linux 桌面 VM 內。

使用 `--gateway-setup` 時，指令會在 `$HOME/.openclaw-mantis/slack-openclaw` 準備一個持續的拋棄式 OpenClaw 家目錄，為選定的通道修補 Slack Socket Mode 設定，在連接埠 `38973` 上啟動 `openclaw gateway run`，並讓 Chrome 在 VNC 工作階段中繼續執行。這是「留給我一個執行 Slack 和 claw 的 Linux 桌面」模式；當省略 `--gateway-setup` 時，bot 對 bot 的 Slack QA 通道仍然是預設值。

`--credential-source env` 的必要輸入：

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`
- `OPENCLAW_LIVE_OPENAI_KEY` 用於遠端模型通道。如果僅在本地設定
  `OPENAI_API_KEY`，Mantis 會在呼叫 Crabbox 之前將其對應到 `OPENCLAW_LIVE_OPENAI_KEY`，
  以便 Crabbox 的 `OPENCLAW_*` 環境變數轉發能將其帶入 VM。

使用 `--gateway-setup --credential-source convex`，Mantis 在建立 VM 之前會從共用集區租用 Slack SUT 憑證，並將租用的通道 ID、Socket Mode 應用程式權杖和機器人權杖作為桌面內的 `OPENCLAW_MANTIS_SLACK_*` 執行時環境變數進行轉發。這使 GitHub 工作流程保持輕量：它們只需要 Convex broker secret，而不需要原始的 Slack 機器人或應用程式權杖。

實用的 Slack 桌面旗標：

- `--lease-id <cbx_...>` 針對操作員已透過 VNC 登入 Slack Web 的機器重新執行。
- `--gateway-setup` 在 VM 中啟動永續的 OpenClaw Slack 閘道，而不僅是執行 bot-to-bot QA 通道。
- `--keep-lease` 在成功後保持閘道 VM 開啟以供 VNC 檢查；`--no-keep-lease` 在收集完構件後將其停止。
- `--slack-url <url>` 開啟特定的 Slack Web URL。若沒有它，當 SUT 機器人權杖可用時，Mantis 會從 Slack `auth.test` 推導 `https://app.slack.com/client/<team>/<channel>`。
- `--slack-channel-id <id>` 控制閘道設置所使用的 Slack 通道允許清單。
- `OPENCLAW_MANTIS_SLACK_BROWSER_PROFILE_DIR` 控制 VM 內的永續 Chrome 設定檔。預設為 `$HOME/.config/openclaw-mantis/slack-chrome-profile`，因此手動 Slack Web 登入可在同一租用上於重新執行後保留。
- `--credential-source convex --credential-role ci` 使用共用憑證集區，而不是直接使用 Slack 環境權杖。
- `--provider-mode`、`--model`、`--alt-model` 和 `--fast` 會傳遞至 Slack live 通道。

Approval checkpoint runs 會將 Slack API 訊息快照渲染為 checkpoint PNG，以提供適合 CI 的視覺證明。`slack-desktop-smoke.png` 僅在租約使用已登入的熱瀏覽器設定檔時，才能作為 Slack Web 的證明。

GitHub smoke workflow 是 `Mantis Discord Smoke`。第一個真實場景的 before and after GitHub workflow 是 `Mantis Discord Status Reactions`。它接受：

- `baseline_ref`：預期會重現僅排隊行為的 ref。
- `candidate_ref`：預期會顯示 `queued -> thinking -> done` 的 ref。

它會 checkout workflow harness ref，建置獨立的 baseline 和 candidate worktrees，對每個 worktree 執行 `discord-status-reactions-tool-only`，並將 `baseline/`、`candidate/`、`comparison.json` 和 `mantis-report.md` 作為 Actions artifacts 上傳。它還會在 Crabbox 桌面瀏覽器中渲染每個 lane 的 timeline HTML，並將這些 VNC 截圖與 PR 註解中的決定性 timeline PNG 一起發布。同一個 PR 註解嵌入了由 `crabbox media preview` 生成的輕量級 motion-trimmed GIF 預覽、連結至對應的 motion-trimmed MP4 片段，並保留完整的桌面 MP4 檔案以供深入檢查。截圖保持內嵌以便快速審閱。該 workflow 從 `openclaw/crabbox` main 建置 Crabbox CLI，以便在下一個 Crabbox 二進位版本發布前，使用目前的 desktop/browser lease flags。

`Mantis Scenario` 是通用的手動進入點。它接受 `scenario_id`、`candidate_ref`、可選的 `baseline_ref` 和可選的 `pr_number`，然後分發場景所屬的 workflow。此包裝器刻意保持精簡：場景 workflows 仍擁有其傳輸設定、憑證、VM 類別、預期的 oracle 和 artifact manifest。

`Mantis Slack Desktop Smoke` 是首個 Slack VM 工作流程。它會在獨立的工作樹中檢出受信任的候選 ref，租用一台 Crabbox Linux 桌面機，對該候選版本執行 `pnpm openclaw qa mantis slack-desktop-smoke --gateway-setup`，在 VNC 瀏覽器中開啟 Slack Web，錄製桌面畫面，使用 `crabbox media preview` 生成動態修剪的預覽，上傳完整的成品目錄，並選擇性地在目標 PR 上發布內聯證據評論。桌面租用預設使用 AWS，並暴露手動提供商輸入，讓操作員可以在 AWS 容量緩慢或不可用時切換到 Hetzner。當您想要「一個運行著 Slack 和 claw 的 Linux 桌面」而不僅僅是 bot 對 bot 的 Slack 訊息紀錄時，請使用此通道。

`Mantis Telegram Live` 將現有的 Telegram 即時 QA 通道封裝在同一個 PR 證據管線中。它會在獨立的工作樹中檢出受信任的候選 ref，從 Telegram QA 摘要和 observed-message 成品讀取 `pnpm openclaw qa telegram --credential-source convex
--credential-role ci`, writes a `mantis-evidence.` 清單，透過 Crabbox 桌面瀏覽器呈現經過編修的紀錄 HTML，使用 `crabbox media preview` 生成動態修剪的 GIF，並在 PR 號碼可用時發布內聯 PR 證據評論。此通道是視覺化的紀錄，而非已登入的 Telegram Web 證明：Telegram Bot API 提供穩定的即時訊息證據，但正常的 Mantis 自動化不需要 Telegram Web 登入狀態。

`Mantis Telegram Desktop Proof` 是原生的代理式 Telegram Desktop 前後對比封裝器。維護者可以透過 PR 評論使用 `@openclaw-mantis telegram desktop proof` 觸發它，在 Actions UI 中使用自由格式指令觸發，或透過通用 `Mantis Scenario` 分派器觸發。該工作流程將 PR、基準 ref、候選 ref 和維護者指令交給 Codex。代理會閱讀 PR，決定哪種 Telegram 可見行為能證明變更，為基準和候選版本執行真實使用者 Crabbox Telegram Desktop 證明通道，反覆迭代直到原生 GIF 有用為止，將成對的 `motionPreview` 成品寫入 `mantis-evidence.json`，上傳壓縮包，並在 PR 號碼可用時發佈兩欄式 PR 證據表格。

若要設置涉及人工介入的 Telegram 桌面環境，請使用情境建構器：

```bash
pnpm openclaw qa mantis telegram-desktop-builder \
  --credential-source convex \
  --credential-role maintainer \
  --keep-lease
```

建構器會租用或重複使用 Crabbox 桌面，安裝原生 Linux Telegram Desktop 二進位檔，選擇性地還原使用者工作階段封存，使用租用的 Telegram SUT 機器人 Token 設定 OpenClaw，在連接埠 `38974` 上啟動 `openclaw gateway run`，將驅動程式機器人就緒訊息張貼至租用的私密群組，然後從可見的 VNC 桌面擷取螢幕截圖和 MP4。機器人 Token 永遠不會登入 Telegram Desktop；它僅用於設定 OpenClaw。桌面檢視器是從 `--telegram-profile-archive-env <name>` 還原的獨立 Telegram 使用者工作階段，或是透過 VNC 手動建立並使用 `--keep-lease` 維持運作。

實用的 Telegram 桌面建構器旗標：

- `--lease-id <cbx_...>` 會在操作員已登入 Telegram Desktop 的 VM 上重新執行。
- `--telegram-profile-archive-env <name>` 會從該環境變數讀取 base64 編碼的 `.tgz` Telegram Desktop 設定檔封存，並在啟動前還原它。
- `--telegram-profile-dir <remote-path>` 控制遠端 Telegram Desktop 設定檔目錄。預設值為 `$HOME/.local/share/TelegramDesktop`。
- `--no-gateway-setup` 會安裝並開啟 Telegram Desktop，而不設定 OpenClaw。
- `--credential-source convex --credential-role ci` 使用共用憑證經紀人，而不是直接的 Telegram 環境變數 Token。

每個發佈 PR 的情境都會在其報告旁寫入 `mantis-evidence.json`。此 Schema 是情境程式碼與 GitHub 註解之間的交接：

```json
{
  "schemaVersion": 1,
  "id": "discord-status-reactions",
  "title": "Mantis Discord Status Reactions QA",
  "summary": "Human-readable top summary for the PR comment.",
  "scenario": "discord-status-reactions-tool-only",
  "comparison": {
    "baseline": { "sha": "...", "status": "fail", "expected": "queued-only" },
    "candidate": { "sha": "...", "status": "pass", "expected": "queued -> thinking -> done" },
    "pass": true
  },
  "artifacts": [
    {
      "kind": "timeline",
      "lane": "baseline",
      "label": "Baseline queued-only",
      "path": "baseline/timeline.png",
      "targetPath": "baseline.png",
      "alt": "Baseline Discord timeline",
      "width": 420
    }
  ]
}
```

Artifact `path` 值是相對於清單目錄的路徑。`targetPath` 值是已設定 Mantis R2/S3 artifact 前綴下的相對路徑。發佈者會拒絕路徑遍歷，並在選用的預覽或影片無法使用時跳過標記為 `"required": false` 的項目。

支援的 Artifact 種類：

- `timeline`：決定性情境螢幕截圖，通常是之前/之後。
- `desktopScreenshot`：VNC/瀏覽器桌面螢幕截圖。
- `motionPreview`：從桌面錄製產生的內嵌動畫 GIF。
- `motionClip`：移除靜態開頭和結尾的經過動態修剪的 MP4。
- `fullVideo`：用於深度檢查的完整 MP4 錄製。
- `metadata`：JSON/日誌 sidecar 檔案。
- `report`：Markdown 報告。

可重複使用的發布器是 `scripts/mantis/publish-pr-evidence.mjs`。工作流程會使用清單、目標 PR、構件目標根目錄、評論標記、Actions 構件 URL、執行 URL 和請求來源來呼叫它。它將宣告的構件上傳到已配置的 Mantis R2/S3 儲存貯體，並建立一個優先顯示摘要的 PR 評論，其中包含內聯圖片/預覽和連結影片，然後更新現有的標記評論或建立一個新的。工作流程發佈到 `openclaw-crabbox-artifacts`，並在 `https://artifacts.openclaw.ai` 下提供公開 URL。它們直接提供儲存貯體、區域和公開 URL 值。可重複使用的發布器需要：

- `MANTIS_ARTIFACT_R2_ACCESS_KEY_ID`
- `MANTIS_ARTIFACT_R2_SECRET_ACCESS_KEY`
- `MANTIS_ARTIFACT_R2_BUCKET`
- `MANTIS_ARTIFACT_R2_ENDPOINT`
- `MANTIS_ARTIFACT_R2_REGION`
- `MANTIS_ARTIFACT_R2_PUBLIC_BASE_URL`

您也可以直接從 PR 評論觸發 status-reactions 執行：

```text
@openclaw-mantis discord status reactions
```

評論觸發器被刻意限制得很窄。它僅針對擁有寫入、維護者或管理員權限的使用者對 PR 發表的評論執行，並且僅識別 Discord status-reaction 請求。預設情況下，它使用已知的錯誤基準 ref 和目前的 PR head SHA 作為候選。維護者可以覆蓋任一 ref：

```text
@openclaw-mantis discord status reactions baseline=origin/main candidate=HEAD
```

Telegram live QA 也可以從 PR 評論觸發：

```text
@openclaw-mantis telegram
@openclaw-mantis telegram scenario=telegram-status-command
@openclaw-mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

預設情況下，它使用目前的 PR head SHA 作為候選並執行 `telegram-status-command`。當需要特定的 ref 或預熱的 Crabbox 桌面時，維護者可以覆蓋 `candidate=...`、`provider=aws|hetzner` 和 `lease=<cbx_...>`。

ClawSweeper 指令範例：

```text
@clawsweeper mantis discord discord-status-reactions-tool-only
@clawsweeper verify e2e discord
```

第一個指令是明確的並以場景為重點。第二個可以後續根據標籤、變更的檔案和 ClawSweeper 審查結果，將 PR 或問題對應到建議的 Mantis 場景。

## 執行生命週期

1. 取得憑證。
2. 分配或重複使用 VM。
3. 當場景需要 UI 證據時，準備桌面/瀏覽器設定檔。
4. 為基準 ref 準備一個乾淨的簽出 (checkout)。
5. 安裝依賴項並僅建構場景所需的內容。
6. 啟動一個具有隔離狀態目錄的子 OpenClaw Gateway。
7. 設定即時傳輸、提供者、模型和瀏覽器設定檔。
8. 執行場景並擷取基準證據。
9. 停止 Gateway 並保留日誌。
10. 在同一個 VM 中準備候選參考。
11. 執行相同的場景並擷取候選證據。
12. 比較預測結果和視覺證據。
13. 寫入 Markdown、JSON、日誌、螢幕截圖和選用的追蹤產出。
14. 上傳 GitHub Actions 產出。
15. 發布簡明的 PR 或 Discord 狀態訊息。

場景應該能夠以兩種不同的方式失敗：

- **Bug 重現**：基準以預期的方式失敗。
- **工具失敗**：環境設定、認證、Discord API、瀏覽器或提供者在 bug 預測有意義之前就已失敗。

最終報告必須區分這些情況，以便維護者不會將不穩定的環境與產品行為混淆。

## Discord MVP

第一個場景應以伺服器頻道中的 Discord 狀態反應為目標，其中來源回覆傳遞模式為 `message_tool_only`。

為什麼它是一個好的 Mantis 種子：

- 它在 Discord 中作為觸發訊息的反應可見。
- 它透過 Discord 訊息反應狀態具有強大的 REST 預測。
- 它執行真實的 OpenClaw Gateway、Discord 機器人認證、訊息分派、來源回覆傳遞模式、狀態反應狀態和模型輪次生命週期。
- 它足夠狹窄，可以保持第一次實作的誠實。

預期的場景形狀：

```yaml
id: discord-status-reactions-tool-only
transport: discord
baseline:
  expect:
    reproduced: true
candidate:
  expect:
    fixed: true
config:
  messages:
    ackReaction: "👀"
    ackReactionScope: "group-mentions"
    groupChat:
      visibleReplies: "message_tool"
    statusReactions:
      enabled: true
      timing:
        debounceMs: 0
discord:
  requireMention: true
  notifyChannel: operator-notify
evidence:
  rest:
    messageReactions: true
  browser:
    screenshotMessageRow: true
```

基準證據應顯示排隊的確認反應，但在僅工具模式下沒有生命週期轉換。候選證據應顯示當 `messages.statusReactions.enabled` 明確為 true 時正在運行的生命週期狀態反應。

可執行的第一個部分是選用的 Discord 即時 QA 場景：

```bash
pnpm openclaw qa discord \
  --scenario discord-status-reactions-tool-only \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --fast \
  --output-dir .artifacts/qa-e2e/mantis/discord-status-reactions-candidate
```

它使用始終開啟的伺服器處理、`visibleReplies:
"message_tool"`, `ackReaction: "👀"` 和明確的狀態反應來設定 SUT。預測會輪詢真實的 Discord 觸發訊息，並預期觀察到的序列 `👀 -> 🤔 -> 👍`。產出包括 `discord-qa-reaction-timelines.json`、`discord-status-reactions-tool-only-timeline.html` 和 `discord-status-reactions-tool-only-timeline.png`。

## 現有的 QA 組件

Mantis 應該建立在現有的私有 QA 堆疊之上，而不是從零開始：

- `pnpm openclaw qa discord` 已經運行了一個包含驅動程式和
  SUT bot 的即時 Discord 通道。
- 即時傳輸執行器已經在 `.artifacts/qa-e2e/` 下寫入報告和觀察訊息
  構件。
- Convex 憑證租約已經提供對共享即時傳輸憑證的獨佔存取。
- 瀏覽器控制服務已經支援截圖、快照、
  無頭管理設定檔和遠端 CDP 設定檔。
- QA Lab 已經有一個用於傳輸形態測試的偵錯器 UI 和匯流排。

第一個 Mantis 實作可以是在這些元件之上的薄層前後對比執行器，再加上一個視覺證據層。

## 證據模型

每次執行都會寫入一個穩定的構件目錄：

```text
.artifacts/qa-e2e/mantis/<run-id>/
  mantis-report.md
  mantis-summary.json
  baseline/
    summary.json
    discord-message.json
    screenshot-message-row.png
    gateway-debug/
  candidate/
    summary.json
    discord-message.json
    screenshot-message-row.png
    gateway-debug/
  comparison.json
  run.log
```

`mantis-summary.json` 應該是機器可讀的事實來源。
Markdown 報告則是用於 PR 註解和人工審查。

摘要必須包含：

- 測試的 refs 和 SHA
- 傳輸和情境 id
- 機器提供者和機器 id 或租約 id
- 不含秘密值的憑證來源
- 基準結果
- 候選結果
- 錯誤是否在基準上重現
- 候選版本是否修復了它
- 構件路徑
- 經過清理的設定或清理問題

截圖是證據，不是秘密。它們仍然需要編修紀律：
私人頻道名稱、使用者名稱或訊息內容可能會出現。對於公開 PR，
在編修機制更強大之前，優先使用 GitHub Actions 構件連結而非內嵌圖片。

## 瀏覽器和 VNC

瀏覽器通道有兩種模式：

- **無頭自動化**：CI 的預設模式。Chrome 在啟用 CDP 的情況下執行，並且
  Playwright 或 OpenClaw 瀏覽器控制會擷取截圖。
- **VNC 救援**：當登入、MFA、Discord 反自動化、
  或視覺化偵錯需要人工介入時，在同一個 VM 上啟用。

Discord 觀察者瀏覽器設定檔應該足夠持久，以避免每次執行時都要登入，
但要與個人瀏覽器狀態隔離。設定檔屬於 Mantis 機器池，不屬於開發人員的筆記型電腦。

當 Mantis 卡住時，它會發佈一個包含以下內容的 Discord 狀態訊息：

- 執行 id
- 情境 id
- 機器提供者
- 構件目錄
- VNC 或 noVNC 連線指示（如果可用）
- 簡短的阻礙文字

第一個私有部署可以將這些訊息發送到現有的 operator 頻道，稍後再移至專用的 Mantis 頻道。

## 機器

對於第一次遠端實作，Mantis 應優先透過 Crabbox 使用 AWS。Crabbox 提供了預熱的機器、租用追蹤、資料準備、日誌、結果和清理功能。如果 AWS 容量太慢或不可用，請在相同的機器介面後面加入 Hetzner 提供者。

最低 VM 需求：

- 安裝了具備桌面功能的 Chrome 或 Chromium 的 Linux
- 用於瀏覽器自動化的 CDP 存取權
- 用於救援的 VNC 或 noVNC
- Node 22 和 pnpm
- OpenClaw 程式碼簽出和相依性快取
- 使用 Playwright 時的 Playwright Chromium 瀏覽器快取
- 足夠的 CPU 和記憶體以執行一個 OpenClaw Gateway、一個瀏覽器和一個模型執行
- 對 Discord、GitHub、模型提供者和憑證代理程式的出站存取權

VM 不應在預期的憑證或瀏覽器設定檔存放區之外保存長期存在的原始機密。

## 機密

對於遠端執行，機密儲存在 GitHub 組織或存放庫機密中；對於本機執行，則儲存在本機操作員控制的機密檔案中。

建議的機密名稱：

- `OPENCLAW_QA_DISCORD_MANTIS_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_NOTIFY_CHANNEL_ID`
- `OPENCLAW_QA_REDACT_PUBLIC_METADATA=1` 用於公開 GitHub 上傳
- `OPENCLAW_QA_CONVEX_SITE_URL`
- `OPENCLAW_QA_CONVEX_SECRET_CI`
- `OPENCLAW_QA_MANTIS_CRABBOX_COORDINATOR`
- `OPENCLAW_QA_MANTIS_CRABBOX_COORDINATOR_TOKEN`

長遠來看，Convex 憑證池應繼續作為即時傳輸憑證的常規來源。GitHub 機密啟動代理程式和備用通道。Discord 狀態反應工作流程將 Mantis Crabbox 機密映射回 Crabbox CLI 預期的 `CRABBOX_COORDINATOR` 和 `CRABBOX_COORDINATOR_TOKEN` 環境變數。純 `CRABBOX_*` GitHub 機密名稱仍然被接受作為相容性備選方案。

Mantis 執行器絕不能列印：

- Discord 機器人權杖
- 提供者 API 金鑰
- 瀏覽器 Cookies
- 驗證設定檔內容
- VNC 密碼
- 原始憑證載荷

公開的成品上傳也應該對 Discord 目標元數據進行編輯，例如機器人、伺服器、頻道和訊息 ID。GitHub 測試工作流程出於此原因啟用了 `OPENCLAW_QA_REDACT_PUBLIC_METADATA=1`。

如果權杖意外貼上到問題、PR、聊天或日誌中，請在儲存新密碼後輪換該權杖。

## GitHub 成品與 PR 評論

Mantis 工作流程應將完整的證據套件作為短期 Actions 成品上傳。當針對錯誤報告或修復 PR 執行工作流程時，它還應將編輯過的內聯媒體發佈到已配置的 Mantis R2/S3 存儲桶，並在該錯誤或修復 PR 上更新一條包含內聯修復前/後截圖的評論。不要僅在通用的 QA 自動化 PR 上發佈主要證據。原始日誌、觀察到的訊息和其他龐大的證據保留在 Actions 成品中。

生產環境工作流程應使用 Mantis GitHub App 發佈這些評論，而不是使用 `github-actions[bot]`。將應用程式 ID 和私鑰存儲為 `MANTIS_GITHUB_APP_ID` 和 `MANTIS_GITHUB_APP_PRIVATE_KEY` GitHub Actions 密碼。工作流程使用隱藏標記作為更新鍵，當權杖可以編輯該評論時更新它，並在無法編輯較舊的機器人擁有的標記時建立一個新的 Mantis 擁有的評論。

PR 評論應簡短且視覺化：

```md
Mantis Discord Status Reactions QA

Summary: Mantis reran the reported Discord status-reaction bug against the known
bad baseline and the candidate fix. The baseline reproduced the bug, while the
candidate showed the expected queued -> thinking -> done sequence.

- Scenario: `discord-status-reactions-tool-only`
- Run: <workflow run link>
- Artifact: <artifact link>
- Baseline: `<status>` at `<sha>`
- Candidate: `<status>` at `<sha>`

| Baseline            | Candidate           |
| ------------------- | ------------------- |
| <inline screenshot> | <inline screenshot> |
```

當運行因控制線路失敗而失敗時，評論必須說明這一點，而不是暗示候選版本失敗。

## 私有部署註記

私有部署可能已經有一個 Mantis Discord 應用程式。當該應用程式擁有正確的機器人權限並且可以安全輪換時，請重複使用該應用程式，而不是建立另一個應用程式。

通過密碼或部署配置設定初始操作員通知頻道。它可以首先指向現有的維護者或操作頻道，一旦存在專用的 Mantis 頻道，再移至該頻道。

不要將伺服器 ID、頻道 ID、機器人權杖、瀏覽器 Cookie 或 VNC 密碼放在此文件中。將它們存儲在 GitHub 密碼、憑證代理程式或操作員的本機密碼存儲中。

## 新增場景

Mantis 場景應聲明：

- ID 和標題
- 傳輸
- 所需憑證
- 基準參照策略
- 候選參照策略
- OpenClaw 配置修補
- 設定步驟
- 刺激
- 預期基準預測
- 預期候選預測
- 視覺捕獲目標
- 逾時預算
- 清理步驟

Scenarios should prefer small, typed oracles:

- Discord reaction state for reaction bugs
- Discord message references for threading bugs
- Slack thread ts and reaction API state for Slack bugs
- email message ids and headers for email bugs
- browser screenshots when UI is the only reliable observable

Vision checks should be additive. If a platform API can prove the bug, use the
API as the pass/fail oracle and keep screenshots for human confidence.

## Provider expansion

After Discord, the same runner can add:

- Slack: reactions, threads, app mentions, modals, file uploads.
- Email: Gmail auth and message threading using `gog` where connectors are not
  enough.
- WhatsApp: QR login, re-identification, message delivery, media, reactions.
- Telegram: group mention gating, commands, reactions where available.
- Matrix: encrypted rooms, thread or reply relations, restart resume.

Each transport should have one cheap smoke scenario and one or more bug-class
scenarios. Expensive visual scenarios should stay opt-in.

## Open questions

- Which Discord bot should be the driver, and which should be the SUT, when the
  existing Mantis bot is reused?
- Should the observer browser login use a human Discord account, a test account,
  or only bot-readable REST evidence for the first phase?
- How long should GitHub retain Mantis artifacts for PRs?
- When should ClawSweeper automatically recommend Mantis instead of waiting for a
  maintainer command?
- Should screenshots be redacted or cropped before upload for public PRs?
