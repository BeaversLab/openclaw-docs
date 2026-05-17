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

GitHub smoke 工作流程是 `Mantis Discord Smoke`。第一個真實情境的前後 GitHub 工作流程是 `Mantis Discord Status Reactions`。它接受：

- `baseline_ref`：預期重現僅佇列行為的 ref。
- `candidate_ref`：預期顯示 `queued -> thinking -> done` 的 ref。

它會檢出 workflow harness ref，建置獨立的 baseline 和 candidate worktree，對每個 worktree 執行 `discord-status-reactions-tool-only`，並將 `baseline/`、`candidate/`、`comparison.json` 和 `mantis-report.md` 作為 Actions 成品上傳。它也會在 Crabbox 桌面瀏覽器中呈現每個 lane 的 timeline HTML，並在 PR 註解中將那些 VNC 截圖與確定性 timeline PNG 並排發佈。同一個 PR 註解會嵌入由 `crabbox media preview` 生成的輕量級 motion-trimmed GIF 預覽、連結至對應的 motion-trimmed MP4 片段，並保留完整的桌面 MP4 檔案以供深入檢查。截圖保持內嵌以便快速審查。Workflow 會從 `openclaw/crabbox` main 建置 Crabbox CLI，以便在下一個 Crabbox 二進位版本發布前使用目前的 desktop/browser lease 旗標。

`Mantis Scenario` 是通用的人工進入點。它接收 `scenario_id`、`candidate_ref`、可選的 `baseline_ref` 和可選的 `pr_number`，然後分派 scenario 所擁有的 workflow。此包裝器刻意設計得很精簡：scenario workflows 仍然擁有其傳輸設定、憑證、VM 類別、預期 oracle 和成品清單。

`Mantis Slack Desktop Smoke` 是第一個 Slack VM workflow。它會在獨立的 worktree 中檢出受信任的 candidate ref，租用一個 Crabbox Linux 桌面，對該 candidate 執行 `pnpm openclaw qa mantis slack-desktop-smoke --gateway-setup`，在 VNC 瀏覽器中開啟 Slack Web，錄製桌面畫面，使用 `crabbox media preview` 生成 motion-trimmed 預覽，上傳完整的成品目錄，並選擇性地在目標 PR 上張貼內嵌證據註解。它預設使用 AWS 進行桌面租用，並公開手動 provider 輸入，以便操作員在 AWS 容量緩慢或無法使用時切換至 Hetzner。當您想要「一台執行 Slack 和 claw 的 Linux 桌面」而非僅有 bot 對 bot 的 Slack 訊息紀錄時，請使用此 lane。

`Mantis Telegram Live` 將現有的 Telegram 即時 QA 通道封裝在同一個 PR 證據管道中。它會在獨立的工作樹中檢出受信任的候選 ref，執行 `pnpm openclaw qa telegram --credential-source convex
--credential-role ci`, writes a `mantis-evidence.` 顯示資訊清單，來自 Telegram QA 摘要和 observed-message 產出，透過 Crabbox 桌面瀏覽器呈現經過編修的逐字稿 HTML，使用 `crabbox media preview` 產生經過動態修剪的 GIF，並在 PR 號碼可用時張貼內聯 PR 證據評論。此通道是逐字稿視覺化，而非登入的 Telegram Web 證明：Telegram Bot API 提供穩定的即時訊息證據，但正常的 Mantis 自動化不需要 Telegram Web 登入狀態。

`Mantis Telegram Desktop Proof` 是代理式的原生 Telegram Desktop
前後包裝器。維護者可以透過 PR 評論使用
`@Mantis telegram desktop proof` 觸發它，從 Actions UI 使用自由格式
指令，或透過通用 `Mantis Scenario` 分發器。工作流程
將 PR、基準參考、候選參考和維護者指令傳遞給 Codex。
代理會讀取 PR，決定哪種 Telegram 可見行為可證明
變更，對基準和候選執行真實使用者 Crabbox Telegram Desktop 證明通道，反覆運算直到原生 GIF 有用為止，將成對的
`motionPreview` 檔案寫入 `mantis-evidence.json`，上傳該套件，並
在 PR 號碼可用時發佈兩欄式 PR 證據表格。

對於有人工介入的 Telegram 桌面設定，請使用場景建構器：

```bash
pnpm openclaw qa mantis telegram-desktop-builder \
  --credential-source convex \
  --credential-role maintainer \
  --keep-lease
```

建構器會租用或重用 Crabbox 桌面，安裝原生 Linux
Telegram Desktop 執行檔，選擇性地還原使用者工作階段封存，使用租用的 Telegram SUT Bot 權杖設定
OpenClaw，在連接埠 `38974` 上啟動 `openclaw gateway run`，
將驅動程式 Bot 就緒訊息發佈至租用的私人
群組，然後從可見的 VNC 桌面擷取螢幕擷圖和 MP4。Bot
權杖從不登入 Telegram Desktop；它僅設定 OpenClaw。桌面
檢視器是從 `--telegram-profile-archive-env <name>` 還原的獨立 Telegram 使用者工作階段，或透過 VNC 手動建立並使用 `--keep-lease` 保持
運作。

有用的 Telegram 桌面建構器旗標：

- `--lease-id <cbx_...>` 對操作員已登入 Telegram Desktop 的 VM 重新執行。
- `--telegram-profile-archive-env <name>` 從該環境變數讀取 base64 `.tgz` Telegram Desktop 設定檔封存，並在啟動前還原它。
- `--telegram-profile-dir <remote-path>` 控制遠端 Telegram Desktop 設定檔目錄。預設值為 `$HOME/.local/share/TelegramDesktop`。
- `--no-gateway-setup` 安裝並開啟 Telegram Desktop，而不設定 OpenClaw。
- `--credential-source convex --credential-role ci` 使用共用憑證代理程式，而非直接的 Telegram 環境變數權杖。

每個 PR 發佈場景都會在其報告旁寫入 `mantis-evidence.json`。
此架構是場景代碼與 GitHub 評論之間的交接：

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

Artifact `path` 值是相對於 manifest 目錄的。`targetPath`
值是 `qa-artifacts` 分支發佈目錄下的相對路徑。
發佈者會拒絕路徑遍歷，並在可選的預覽或影片不可用時跳過標記為
`"required": false` 的項目。

支援的 Artifact 類型：

- `timeline`：確定性的場景截圖，通常是 before/after（之前/之後）。
- `desktopScreenshot`：VNC/瀏覽器桌面截圖。
- `motionPreview`：從桌面錄製生成的內聯動畫 GIF。
- `motionClip`：經過動態修剪的 MP4，會移除靜態的引導和結尾部分。
- `fullVideo`：完整的 MP4 錄製，用於深度檢查。
- `metadata`：JSON/日誌側車檔案。
- `report`：Markdown 報告。

可重複使用的發佈者為 `scripts/mantis/publish-pr-evidence.mjs`。工作流程
會使用 manifest、目標 PR、`qa-artifacts` 目標根目錄、評論標記、
Actions Artifact URL、執行 URL 和請求來源來呼叫它。它會將宣告的 artifacts
複製到 `qa-artifacts` 分支，建立一個以摘要為優先的 PR 評論，其中包含內聯
圖片/預覽和連結的影片，然後更新現有的標記評論或
建立一個新的評論。

您也可以直接從 PR 評論觸發狀態反應執行：

```text
@Mantis discord status reactions
```

評論觸發是有意設計得非常狹隘的。它僅針對擁有寫入、維護者或管理員存取權限的使用者所發出的 PR 評論執行，且僅識別
Discord 狀態反應請求。預設情況下，它使用已知的錯誤基準 ref
和目前的 PR head SHA 作為候選者。維護者可以覆蓋任一
ref：

```text
@Mantis discord status reactions baseline=origin/main candidate=HEAD
```

Telegram 即時 QA 也可以從 PR 評論觸發：

```text
@Mantis telegram
@Mantis telegram scenario=telegram-status-command
@Mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

預設情況下，它使用目前的 PR head SHA 作為候選者並執行
`telegram-status-command`。當維護者需要特定的 ref 或
預熱的 Crabbox 桌面時，可以覆蓋 `candidate=...`、
`provider=aws|hetzner` 和 `lease=<cbx_...>`。

ClawSweeper 指令範例：

```text
@clawsweeper mantis discord discord-status-reactions-tool-only
@clawsweeper verify e2e discord
```

第一個指令是明確的且專注於情境。第二個指令稍後可以根據標籤、變更檔案和 ClawSweeper 審查發現，將 PR 或 issue 對應到推薦的 Mantis 情境。

## 執行生命週期

1. 取得憑證。
2. 配置或重用 VM。
3. 當情境需要 UI 證據時，準備桌面/瀏覽器設定檔。
4. 為基準 ref 準備乾淨的檢出。
5. 安裝相依項並僅建置情境所需的部分。
6. 啟動具有隔離狀態目錄的子 OpenClaw Gateway。
7. 設定即時傳輸、提供者、模型和瀏覽器設定檔。
8. 執行情境並擷取基準證據。
9. 停止 Gateway 並保留日誌。
10. 在同一個 VM 中準備候選 ref。
11. 執行相同的情境並擷取候選證據。
12. 比較預測結果和視覺證據。
13. 寫入 Markdown、JSON、日誌、螢幕擷圖和選用的追蹤產出檔。
14. 上傳 GitHub Actions 產出檔。
15. 發布簡潔的 PR 或 Discord 狀態訊息。

情境應該能夠以兩種不同的方式失敗：

- **Bug 重現**：基準以預期的方式失敗。
- **Harness 失敗**：環境設定、憑證、Discord API、瀏覽器或提供者在 Bug 預測具意義之前就失敗了。

最終報告必須區分這些情況，以便維護者不會將不穩定的環境與產品行為混淆。

## Discord MVP

第一個情境應鎖定於伺服器頻道中的 Discord 狀態反應，其中來源回覆傳遞模式為 `message_tool_only`。

為何它是個好的 Mantis 種子：

- 它在 Discord 中以觸發訊息上的反應形式可見。
- 它透過 Discord 訊息反應狀態具有強大的 REST 預測。
- 它練習了真實的 OpenClaw Gateway、Discord 機器人驗證、訊息分派、來源回覆傳遞模式、狀態反應狀態以及模型輪次生命週期。
- 它的範圍足夠窄，可以保持第一次實作的誠實。

預期的情境形式：

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

基準證據應顯示已排程的確認反應，但在僅工具模式下沒有生命週期轉換。候選證據應顯示當 `messages.statusReactions.enabled` 明確為 true 時正在執行的生命週期狀態反應。

可執行的第一個部分是選用的 Discord 即時 QA 情境：

```bash
pnpm openclaw qa discord \
  --scenario discord-status-reactions-tool-only \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --fast \
  --output-dir .artifacts/qa-e2e/mantis/discord-status-reactions-candidate
```

它使用始終啟用的伺服器處理、`visibleReplies:
"message_tool"`, `ackReaction: "👀"` 和明確的狀態反應來配置 SUT。預測器會輪詢真實的 Discord 觸發訊息，並預期觀察到的序列
`👀 -> 🤔 -> 👍`。成品包含 `discord-qa-reaction-timelines.json`、
`discord-status-reactions-tool-only-timeline.html` 和
`discord-status-reactions-tool-only-timeline.png`。

## 現有的 QA 組件

Mantis 應建立在現有的私有 QA 堆疊上，而不是從零開始：

- `pnpm openclaw qa discord` 已經運行著一個包含驅動程式和
  SUT 機器人的即時 Discord 通道。
- 即時傳輸執行器已經將報告和觀察到的訊息
  成品寫入 `.artifacts/qa-e2e/`。
- Convex 憑證租約已經提供對共用即時
  傳輸憑證的獨佔存取。
- 瀏覽器控制服務已經支援螢幕截圖、快照、
  無頭管理設定檔和遠端 CDP 設定檔。
- QA Lab 已經有一個適用於傳輸形狀測試的除錯器 UI 和匯流排。

第一個 Mantis 實作可以是這些組件之上的輕量級之前/之後執行器，再加上一個視覺證據層。

## 證據模型

每次執行都會寫入一個穩定的成品目錄：

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
Markdown 報告則用於 PR 註解和人工審查。

摘要必須包含：

- 測試過的 refs 與 SHA
- 傳輸與情境 ID
- 機器提供者與機器 ID 或租約 ID
- 不含機密值的憑證來源
- 基線結果
- 候選結果
- 錯誤是否在基線上重現
- 候選版本是否已修正
- 成品路徑
- 經過清理的設定或清理問題

螢幕截圖是證據，不是機密。它們仍然需要編修紀律：
私人頻道名稱、使用者名稱或訊息內容可能會出現。對於公開 PR，
在編修機制更強大之前，優先使用 GitHub Actions 成品連結而非內嵌圖片。

## 瀏覽器與 VNC

瀏覽器通道有兩種模式：

- **無頭自動化**：CI 的預設值。Chrome 啟動並啟用 CDP，
  Playwright 或 OpenClaw 瀏覽器控制會擷取螢幕截圖。
- **VNC 救援**：當登入、MFA、Discord 反自動化
  或視覺除錯需要人工介入時，在同一台 VM 上啟用。

Discord 觀察者瀏覽器設定檔應該具備足夠的持久性，以避免每次執行都需登入，但需與個人瀏覽器狀態隔離。設定檔屬於 Mantis 機器池，而非開發者的筆記型電腦。

當 Mantis 卡住時，它會發佈一則包含以下內容的 Discord 狀態訊息：

- 執行 ID
- 場景 ID
- 機器提供者
- 構件目錄
- VNC 或 noVNC 連線說明（如果可用）
- 簡短的阻礙文字

初次私有部署可以將這些訊息發佈到現有的操作員頻道，稍後再移至專用的 Mantis 頻道。

## 機器

在第一個遠端實作中，Mantis 應優先透過 Crabbox 使用 AWS。Crabbox 為我們提供預熱機器、租用追蹤、準備、日誌、結果和清理。如果 AWS 容量太慢或無法使用，請在相同的機器介面後方新增 Hetzner 提供者。

最低 VM 需求：

- Linux 環境，並安裝具備桌面功能的 Chrome 或 Chromium
- 用於瀏覽器自動化的 CDP 存取權
- 用於救援的 VNC 或 noVNC
- Node 22 和 pnpm
- OpenClaw 檢出和相依性快取
- 使用 Playwright 時的 Playwright Chromium 瀏覽器快取
- 足夠的 CPU 和記憶體，以支援一個 OpenClaw Gateway、一個瀏覽器和一次模型執行
- 對 Discord、GitHub、模型提供者和憑證代理程式的連出存取權

VM 不應在預期的憑證或瀏覽器設定檔儲存區之外，保留長期存在的原始密鑰。

## 密鑰

對於遠端執行，密鑰存儲在 GitHub 組織或儲存庫密鑰中；對於本地執行，則存儲在本地操作員控制的密鑰檔案中。

建議的密鑰名稱：

- `OPENCLAW_QA_DISCORD_MANTIS_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_NOTIFY_CHANNEL_ID`
- `OPENCLAW_QA_REDACT_PUBLIC_METADATA=1` for public GitHub artifact uploads
- `OPENCLAW_QA_CONVEX_SITE_URL`
- `OPENCLAW_QA_CONVEX_SECRET_CI`
- `OPENCLAW_QA_MANTIS_CRABBOX_COORDINATOR`
- `OPENCLAW_QA_MANTIS_CRABBOX_COORDINATOR_TOKEN`

長遠來看，Convex 憑證池應繼續作為即時傳輸憑證的常規來源。GitHub secrets 用於引導代理程式 和備用通道。Discord 狀態反應工作流 將 Mantis Crabbox secrets 對應回 Crabbox CLI 預期的 `CRABBOX_COORDINATOR` 和 `CRABBOX_COORDINATOR_TOKEN` 環境變數。純 `CRABBOX_*` GitHub secret 名稱仍作為相容性備選方案被接受。

Mantis runner 決不能列印：

- Discord bot tokens
- provider API keys
- browser cookies
- auth profile contents
- VNC passwords
- raw credential payloads

公開的上傳成品 也應編輯掉 Discord 目標元資料，例如 bot、guild、channel 和 message ids。GitHub smoke workflow 因這個原因啟用了 `OPENCLAW_QA_REDACT_PUBLIC_METADATA=1`。

如果 token 被意外貼上到 issue、PR、聊天或日誌中，請在儲存新 secret 後輪換 它。

## GitHub artifacts 和 PR comments

Mantis workflows 應將完整的證據包 作為短期有效的 Actions artifact 上傳。當為 bug report 或 fix PR 執行工作流時，它還應將編輯過的 PNG 截圖發布到 `qa-artifacts` 分支，並在該 bug 或 fix PR 上更新一條包含內嵌 before/after 截圖的評論。不要僅在通用的 QA 自動化 PR 上發布主要證明。原始日誌、觀察到的訊息和其他龐大的證據保留在 Actions artifact 中。

Production workflows 應使用 Mantis GitHub App 而非 `github-actions[bot]` 發布這些評論。將 app id 和 private key 儲存為 `MANTIS_GITHUB_APP_ID` 和 `MANTIS_GITHUB_APP_PRIVATE_KEY` GitHub Actions secrets。該工作流使用隱藏標記 作為更新鍵，當 token 可以編輯該評論時更新它，並在無法編輯較舊的 bot 擁有標記時建立一條新的 Mantis 擁有評論。

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

當因為 harness 失敗而導致執行失敗時，評論必須說明這一點，而不是暗示 candidate 失敗。

## Private deployment notes

Private deployment 可能已經有 Mantis Discord 應用程式。當該應用程式擁有正確的 bot 權限且可以安全輪換時，請重複使用它，而不是建立另一個 app。

透過秘密或部署配置設定初始的操作員通知頻道。它首先可以指向現有的維護者或操作頻道，然後一旦存在專用的 Mantis 頻道，就轉移到該頻道。

請勿將伺服器 ID、頻道 ID、機器人權杖、瀏覽器 Cookie 或 VNC 密碼放在此文件中。請將它們儲存在 GitHub Secrets、憑證代理程式或操作員的本機秘密儲存區中。

## 新增情境

Mantis 情境應宣告：

- ID 與標題
- 傳輸
- 所需的憑證
- 基準參照策略
- 候選參照策略
- OpenClaw 配置修補
- 設定步驟
- 刺激
- 預期基準預測
- 預期候選預測
- 視覺擷取目標
- 逾時預算
- 清理步驟

情境應偏好小型、類型化的預測：

- 用於反應錯誤的 Discord 反應狀態
- 用於執行緒錯誤的 Discord 訊息參照
- 用於 Slack 錯誤的 Slack 執行緒 ts 和反應 API 狀態
- 用於電子郵件錯誤的電子郵件訊息 ID 和標頭
- 當 UI 是唯一可靠的觀察對象時，進行瀏覽器截圖

視覺檢查應該是累加的。如果平台 API 可以證明該錯誤，請使用 API 作為通過/失敗預測，並保留截圖以供人工確認。

## 提供者擴展

在 Discord 之後，相同的執行器可以新增：

- Slack：反應、執行緒、應用程式提及、模態、檔案上傳。
- 電子郵件：當連接器不足時，使用 `gog` 進行 Gmail 認證和訊息執行緒。
- WhatsApp：QR 登入、重新識別、訊息傳遞、媒體、反應。
- Telegram：群組提及閘道、指令、可用的反應。
- Matrix：加密房間、執行緒或回覆關係、重新啟動恢復。

每個傳輸應該有一個廉價的冒煙測試情境和一個或多個錯誤類別情境。昂貴的視覺情境應保持選用狀態。

## 未解決的問題

- 當重複使用現有的 Mantis 機器人時，哪個 Discord 機器人應該是驅動程式，哪個應該是被測系統 (SUT)？
- 觀察者瀏覽器登入應該使用人工 Discord 帳號、測試帳號，還是在第一階段僅使用機器人可讀的 REST 證據？
- GitHub 應該為 PR 保留 Mantis 成品多久？
- ClawSweeper 應該在何時自動建議 Mantis，而不是等待維護者指令？
- 在上傳至公開 PR 之前，是否應該對截圖進行編輯或裁剪？
