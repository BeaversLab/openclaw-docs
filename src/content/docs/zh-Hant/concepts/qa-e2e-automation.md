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

該通道在 Docker 中佈建一個一次性 Tuwunel homeserver，註冊臨時驅動程式、SUT 和觀察者使用者，建立一個私人房間，然後在 QA gateway 子程序中執行真正的 Matrix 外掛程式。即時傳輸通道將子程序設定範圍限制在被測試的傳輸，因此 Matrix 在子程序設定中不包含 `qa-channel`。它會將結構化報表成果以及合併的 stdout/stderr 記錄寫入選定的 Matrix QA 輸出目錄。若要同時擷取外部 `scripts/run-node.mjs` 建置/啟動器輸出，請將 `OPENCLAW_RUN_NODE_OUTPUT_LOG=<path>` 設定為儲存庫本機記錄檔。

若要執行傳輸真實的 Telegram 測試通道，請執行：

```bash
pnpm openclaw qa telegram
```

該通道針對一個真實的私人 Telegram 群組，而不是佈建一次性伺服器。它需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、
`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和
`OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`，加上同一私人群組中的兩個不同的機器人。SUT 機器人必須擁有 Telegram 使用者名稱，並且當兩個機器人在 `@BotFather` 中啟用 Bot-to-Bot 通訊模式時，bot-to-bot 觀察效果最佳。
當任何場景失敗時，該指令會以非零狀態碼退出。當您想要產生相關成果而不希望以失敗狀態碼退出時，請使用 `--allow-failures`。

即時傳輸通道現在共用一個較小的合約，而不是各自發明自己的情境清單形狀：

`qa-channel` 仍然是廣泛的綜合產品行為測試套件，並且不是即時傳輸覆蓋率矩陣的一部分。

| 通道     | 金絲雀 | 提及閘道 | 允許清單封鎖 | 頂層回覆 | 重新啟動恢復 | 執行緒後續追蹤 | 執行緒隔離 | 反應觀察 | 說明指令 |
| -------- | ------ | -------- | ------------ | -------- | ------------ | -------------- | ---------- | -------- | -------- |
| Matrix   | x      | x        | x            | x        | x            | x              | x          | x        |          |
| Telegram | x      |          |              |          |              |                |            |          | x        |

這保持了 `qa-channel` 作為廣泛的產品行為測試套件，而 Matrix、Telegram 和未來的即時傳輸則共用一個明確的傳輸合約檢查清單。

若要使用一次性的 Linux VM 通道而不將 Docker 引入 QA 路徑，請執行：

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

這會啟動一個全新的 Multipass 客體，安裝相依套件，在客體內部建置 OpenClaw，
執行 `qa suite`，然後將正常的 QA 報告和
摘要複製回主機上的 `.artifacts/qa-e2e/...`。
它重用與主機上 `qa suite` 相同的場景選擇行為。
預設情況下，主機和 Multipass 測試套件執行會使用獨立的 gateway worker 並行執行多個選定的場景。
`qa-channel` 預設並發數為 4，並受選定場景數量的上限限制。使用 `--concurrency <count>` 來調整
worker 數量，或使用 `--concurrency 1` 進行序列執行。
當任何場景失敗時，該指令會以非零狀態碼退出。當您想要產生相關成果而不希望以失敗狀態碼退出時，請使用 `--allow-failures`。
即時執行會轉發對客體而言實用的支援 QA 驗證輸入：基於環境變數的提供者金鑰、QA 即時提供者設定路徑，以及
當存在時的 `CODEX_HOME`。請將 `--output-dir` 保持在儲存庫根目錄下，以便客體
可以透過掛載的工作區寫回資料。

## Repo-backed seeds

Seed 資產位於 `qa/`：

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

這些有意放置在 git 中，以便 QA 計劃對人類和代理程式都可見。

`qa-lab` 應保持為一個通用的 markdown 執行器。每個場景 markdown 檔案是
單次測試執行的唯一來源，並應定義：

- 情境元資料
- optional category, capability, lane, and risk metadata
- docs and code refs
- optional plugin requirements
- optional gateway config patch
- 可執行檔 `qa-flow`

支援 `qa-flow` 的可重複使用執行時期介面允許保持通用和跨領域的特性。例如，markdown 情境可以結合傳輸端輔助程式與瀏覽器端輔助程式，透過 Gateway `browser.request` 縫合來驅動嵌入式控制 UI，而無需新增特殊情況的執行器。

情境檔案應按產品功能而非來源樹資料夾分組。當檔案移動時，請保持情境 ID 穩定；請使用 `docsRefs` 和 `codeRefs` 進行實作可追溯性。

The baseline list should stay broad enough to cover:

- DM and channel chat
- thread behavior
- message action lifecycle
- cron callbacks
- memory recall
- model switching
- subagent handoff
- repo-reading and docs-reading
- one small build task such as Lobster Invaders

## Provider mock lanes

`qa suite` 有兩個本機提供者模擬通道：

- `mock-openai` 是具備情境感知能力的 OpenClaw 模擬。它仍然是支援 repo 的 QA 和對等閘道的預設決定性模擬通道。
- `aimock` 啟動一個由 AIMock 支援的提供者伺服器，用於實驗性協定、fixture、錄製/重播和混亂測試覆蓋。它是附加性的，並不取代 `mock-openai` 情境調度器。

提供者通道實作位於 `extensions/qa-lab/src/providers/` 下。每個提供者擁有其預設值、本機伺服器啟動、Gateway 模型配置、auth-profile 暫存需求，以及即時/模擬功能標誌。共享套件和 Gateway 程式碼應透過提供者註冊表路由，而不是根據提供者名稱進行分支。

## Transport adapters

`qa-lab` 擁有用於 markdown QA 情境的通用傳輸縫合。`qa-channel` 是該縫合上的第一個介面卡，但設計目標更廣泛：未來的真實或合成通道應插入到同一個套件執行器中，而不是新增傳輸專屬的 QA 執行器。

在架構層面上，劃分如下：

- `qa-lab` 負責通用情境執行、工作並發、寫入產報表和報告。
- 傳輸適配器負責閘道配置、就緒狀態、入站和出站觀察、傳輸操作以及規範化的傳輸狀態。
- `qa/scenarios/` 下的 markdown 情境檔案定義了測試執行；`qa-lab` 提供了執行它們的可重複使用執行時期介面。

針對維護者的新通道介面卡採用指南位於 [Testing](/zh-Hant/help/testing#adding-a-channel-to-qa)。

## 報告

`qa-lab` 從觀察到的匯流排時間軸匯出 Markdown 協定報告。該報告應回答：

- 什麼有效
- 什麼失敗
- 什麼仍然受阻
- 哪些後續場景值得添加

對於字元和風格檢查，請在多個即時模型參考上執行相同的場景，並撰寫一份經過評斷的 Markdown 報告：

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

此指令執行本機 QA gateway 子進程，而非 Docker。角色評估場景應透過 `SOUL.md` 設定角色，然後執行一般使用者輪次，例如聊天、工作區幫助和小型檔案任務。不應告訴候選模型它正在接受評估。該指令會保留每份完整逐字稿，記錄基本執行統計數據，然後以 `xhigh` 推理的快速模式詢問評審模型，依自然度、氛圍和幽默感對執行結果進行排名。比較提供者時請使用 `--blind-judge-models`：評審提示詞仍然會取得每份逐字稿和執行狀態，但候選參照會被替換為中性標籤，例如 `candidate-01`；報表會在解析後將排名對應回真實參照。
候選執行預設為 `high` 思考，支援此功能的 OpenAI 模型則使用 `xhigh`。可使用 `--model provider/model,thinking=<level>` 直接覆寫特定候選。`--thinking <level>` 仍會設定全域後備值，而較舊的 `--model-thinking <provider/model=level>` 形式則為了相容性而保留。
OpenAI 候選參照預設為快速模式，因此在提供者支援的情況下會使用優先處理。當單一候選或評審需要覆寫時，可直接加入 `,fast`、`,no-fast` 或 `,fast=false`。僅當您想要對每個候選模型強制開啟快速模式時，才傳遞 `--fast`。候選和評審的持續時間會記錄在報表中用於基準分析，但評審提示詞會明確指出不要根據速度排名。
候選和評審模型執行預設並行數皆為 16。當提供者限制或本機 gateway 壓力導致執行過於嘈雜時，請降低 `--concurrency` 或 `--judge-concurrency`。
當未傳遞候選 `--model` 時，角色評估預設為 `openai/gpt-5.4`、`openai/gpt-5.2`、`openai/gpt-5`、`anthropic/claude-opus-4-6`、
`anthropic/claude-sonnet-4-6`、`zai/glm-5.1`、
`moonshot/kimi-k2.5` 和
`google/gemini-3.1-pro-preview` 當未傳遞 `--model` 時。
當未傳遞 `--judge-model` 時，評審預設為
`openai/gpt-5.4,thinking=xhigh,fast` 和
`anthropic/claude-opus-4-6,thinking=high`。

## 相關文件

- [測試](/zh-Hant/help/testing)
- [QA 頻道](/zh-Hant/channels/qa-channel)
- [儀表板](/zh-Hant/web/dashboard)
