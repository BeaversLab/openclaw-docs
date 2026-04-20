---
summary: "Private QA automation shape for qa-lab, qa-channel, seeded scenarios, and protocol reports"
read_when:
  - Extending qa-lab or qa-channel
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "QA E2E Automation"
---

# QA E2E 自動化

私人 QA 堆疊旨在以比單一單元測試更貼近現實、以頻道為形狀的方式來測試 OpenClaw。

目前的組成部分：

- `extensions/qa-channel`：具有 DM、頻道、執行緒、反應、編輯和刪除功能的合成訊息頻道。
- `extensions/qa-lab`：用於觀察文字記錄、注入入站訊息並匯出 Markdown 報告的偵錯器 UI 和 QA 匯流排。
- `qa/`：用於啟動任務和基準 QA 情境的存放庫支援種子資產。

目前的 QA 操作員流程是一個雙面板的 QA 網站：

- 左側：包含代理程式的 Gateway 儀表板（控制 UI）。
- 右側：QA Lab，顯示類似 Slack 的對話記錄和場景計畫。

執行方式如下：

```bash
pnpm qa:lab:up
```

這會建置 QA 網站、啟動 Docker 支援的 Gateway 通道，並公開 QA Lab 頁面，操作員或自動化迴圈可以在其中為代理程式指派 QA 任務、觀察真實的頻道行為，並記錄成功、失敗或受阻的內容。

為了在不每次重建 Docker 映像檔的情況下加速 QA Lab UI 迭代，請使用 bind-mounted QA Lab 套件啟動堆疊：

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` 將 Docker 服務保持在預先建置的映像檔上，並將 `extensions/qa-lab/web/dist` 掛載進 `qa-lab` 容器中。`qa:lab:watch` 會在變更時重建該套件，而當 QA Lab 資產雜湊變更時，瀏覽器會自動重新載入。

若要執行傳輸真實的 Matrix 測試通道，請執行：

```bash
pnpm openclaw qa matrix
```

該通道會在 Docker 中佈建一次性的 Tuwunel homeserver，註冊暫時的驅動程式、SUT 和觀察者使用者，建立一個私人聊天室，然後在 QA gateway 子程序中執行真實的 Matrix 外掛。即時傳輸通道將子程序設定範圍限制在受測傳輸上，因此 Matrix 可在子程序設定中無需 `qa-channel` 的情況下執行。

若要執行傳輸真實的 Telegram 測試通道，請執行：

```bash
pnpm openclaw qa telegram
```

該通道以一個真實的私人 Telegram 群組為目標，而不是佈建一次性伺服器。它需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`，以及同一私人群組中的兩個不同的機器人。SUT 機器人必須具有 Telegram 使用者名稱，而當兩個機器人在 `@BotFather` 中啟用「Bot-to-Bot 通訊模式」時，機器人對機器人的觀察效果最佳。

即時傳輸通道現在共用一個較小的合約，而不是各自發明自己的情境清單形狀：

`qa-channel` 仍然是廣泛的合成產品行為套件，不是即時傳輸覆蓋率矩陣的一部分。

| 通道     | 金絲雀 | 提及閘道 | 允許清單封鎖 | 頂層回覆 | 重新啟動恢復 | 執行緒後續追蹤 | 執行緒隔離 | 反應觀察 | 說明指令 |
| -------- | ------ | -------- | ------------ | -------- | ------------ | -------------- | ---------- | -------- | -------- |
| Matrix   | x      | x        | x            | x        | x            | x              | x          | x        |          |
| Telegram | x      |          |              |          |              |                |            |          | x        |

這將 `qa-channel` 保持為廣泛的產品行為套件，而 Matrix、
Telegram 和未來的即時傳輸共用一個明確的傳輸契約
檢查清單。

若要使用一次性的 Linux VM 通道而不將 Docker 引入 QA 路徑，請執行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

這會啟動一個新的 Multipass 客體，安裝相依元件，在客體內建置 OpenClaw，
執行 `qa suite`，然後將標準 QA 報告和
摘要複製回主機上的 `.artifacts/qa-e2e/...`。
它重用與主機上 `qa suite` 相同的情境選擇行為。
主機和 Multipass 套件執行預設會使用獨立的 gateway workers 並行執行
多個選定的情境，最多 64 個 workers 或選定的情境數量。
使用 `--concurrency <count>` 來調整 worker 數量，或
使用 `--concurrency 1` 進行序列執行。
即時執行會轉發對客體而言實用的支援 QA auth inputs：基於 env 的提供者金鑰、
QA 即時提供者設定路徑，以及存在的 `CODEX_HOME`。
請將 `--output-dir` 保持在 repo 根目錄下，以便客體
可以透過掛載的工作區寫回。

## Repo-backed seeds

Seed 資源位於 `qa/`：

- `qa/scenarios/index.md`
- `qa/scenarios/*.md`

這些有意放置在 git 中，以便 QA 計劃對人類和代理程式都可見。

`qa-lab` 應保持為通用 markdown 執行器。每個情境 markdown 檔案是單次測試執行的事實來源，並應定義：

- 情境元資料
- 文件和程式碼參照
- 可選的外掛程式需求
- 可選的 gateway 設定補丁
- 可執行的 `qa-flow`

支援 `qa-flow` 的可重用執行時介面被允許保持通用性和橫切性。例如，markdown 情境可以結合傳輸端的輔助程式與瀏覽器端的輔助程式，透過 Gateway `browser.request` 縫合來驅動嵌入式控制 UI，而無需新增特殊情況的執行器。

基線清單應保持足夠廣泛以涵蓋：

- 私訊和頻道聊天
- 執行緒行為
- 訊息操作生命週期
- cron 回呼
- 記憶體回憶
- 模型切換
- 子代理移交
- 讀取 repo 和讀取文件
- 一個小型的建置任務，例如 Lobster Invaders

## 傳輸適配器

`qa-lab` 擁有適用於 markdown QA 情境的通用傳輸縫合。
`qa-channel` 是該縫合上的第一個適配器，但設計目標更廣泛：
未來的真實或合成頻道應插入到相同的套件執行器中，
而不是新增傳輸特定的 QA 執行器。

在架構層面，劃分如下：

- `qa-lab` 負責通用情境執行、工作並發、產出寫入和報告。
- 傳輸適配器負責 gateway 設定、就緒狀態、入站和出站觀測、傳輸操作，以及正規化的傳輸狀態。
- `qa/scenarios/` 下的 markdown 情境檔案定義測試執行；`qa-lab` 提供執行它們的可重用執行時介面。

針對新頻道適配器的維護者採用指南位於
[Testing](/en/help/testing#adding-a-channel-to-qa)。

## 報告

`qa-lab` 從觀測到的總線時間軸匯出 Markdown 協議報告。
該報告應回答：

- 什麼運作正常
- 什麼失敗了
- 什麼仍被阻塞
- 哪些後續情境值得新增

對於角色和風格檢查，請跨多個即時模型參照執行相同的情境
並撰寫經過評判的 Markdown 報告：

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.4,thinking=xhigh \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-6,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.4,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-6,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

此指令執行本機 QA 閘道子進程，而非 Docker。角色評估場景應透過 `SOUL.md` 設定角色，然後執行一般使用者回合，例如聊天、工作區協助和小型檔案任務。不應讓候選模型知道它正在接受評估。該指令會保留每份完整對話紀錄、記錄基本執行統計數據，然後要求法官模型以 `xhigh` 推理的快速模式根據自然度、氛圍和幽默感來對執行進行排名。比較供應商時請使用 `--blind-judge-models`：法官提示仍會取得每份對話紀錄和執行狀態，但候選參照會被取代為中性標籤，例如 `candidate-01`；報告會在解析後將排名對應回真實參照。
候選執行預設為 `high` 思考，支援該功能的 OpenAI 模型則為 `xhigh`。您可以使用 `--model provider/model,thinking=<level>` 针對特定候選進行內嵌覆寫。`--thinking <level>` 仍會設定全域後備，並保留較舊的 `--model-thinking <provider/model=level>` 格式以相容舊版。
OpenAI 候選參照預設為快速模式，因此只要供應商支援，就會使用優先處理。當單一候選或法官需要覆寫時，請內嵌新增 `,fast`、`,no-fast` 或 `,fast=false`。只有在您希望對每個候選模型強制開啟快速模式時，才傳遞 `--fast`。候選和法官的持續時間會記錄在報告中以進行基準分析，但法官提示會明確指出不要根據速度排名。
候選和法官模型執行的預設並行數皆為 16。當供應商限制或本機閘道壓力導致執行過於干擾時，請降低 `--concurrency` 或 `--judge-concurrency`。
當未傳遞候選 `--model` 時，角色評估預設為 `openai/gpt-5.4`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-6`、`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、`moonshot/kimi-k2.5` 和 `google/gemini-3.1-pro-preview` (當未傳遞 `--model` 時)。
當未傳遞 `--judge-model` 時，法官預設為 `openai/gpt-5.4,thinking=xhigh,fast` 和 `anthropic/claude-opus-4-6,thinking=high`。

## 相關文件

- [測試](/en/help/testing)
- [QA 頻道](/en/channels/qa-channel)
- [儀表板](/en/web/dashboard)
