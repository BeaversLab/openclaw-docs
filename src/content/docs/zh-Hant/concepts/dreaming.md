---
summary: "輕度、深度和 REM 階段加上夢境日記的背景記憶整合"
title: "做夢"
sidebarTitle: "做夢"
read_when:
  - You want memory promotion to run automatically
  - You want to understand what each dreaming phase does
  - You want to tune consolidation without polluting MEMORY.md
---

Dreaming 是 `memory-core` 中的背景記憶整合系統。它協助 OpenClaw 將強烈的短期訊號轉移為持久記憶，同時保持過程的可解釋性和可審查性。

<Note>做夢功能是**可選加入 (opt-in)** 的，且預設為停用。</Note>

## 做夢寫入的內容

做夢會保留兩種輸出：

- `memory/.dreams/` 中的 **機器狀態**（回憶儲存庫、階段訊號、攝入檢查點、鎖）。
- `DREAMS.md`（或現有的 `dreams.md`）中的 **人類可讀輸出** 以及 `memory/dreaming/<phase>/YYYY-MM-DD.md` 下的可選階段報告檔案。

長期提升仍然僅寫入 `MEMORY.md`。

## 階段模型

做夢使用三個協作階段：

| 階段 | 目的                     | 持久寫入         |
| ---- | ------------------------ | ---------------- |
| 輕度 | 排序並暫存最近的短期素材 | 否               |
| 深度 | 評分並提升持久候選項目   | 是 (`MEMORY.md`) |
| REM  | 反思主題和重複出現的想法 | 否               |

這些階段是內部實作細節，而非獨立的使用者設定「模式」。

<AccordionGroup>
  <Accordion title="輕量階段">
    輕量階段攝入最近的每日記憶訊號和回憶追蹤，對其進行去重，並暫存候選行。

    - 從短期回憶狀態、最近的每日記憶檔案以及可用的經過編修的會話紀錄中讀取。
    - 當儲存包含內聯輸出時，寫入受管理的 `## Light Sleep` 區塊。
    - 記錄用於後續深度排序的增強訊號。
    - 永不寫入 `MEMORY.md`。

  </Accordion>
  <Accordion title="深度階段">
    深度階段決定什麼成為長期記憶。

    - 使用加權評分和閾值閘門對候選項進行排序。
    - 要求 `minScore`、`minRecallCount` 和 `minUniqueQueries` 通過。
    - 在寫入之前從即時每日檔案中重新擷取片段，因此會跳過過時/已刪除的片段。
    - 將提升的條目附加到 `MEMORY.md`。
    - 將 `## Deep Sleep` 摘要寫入 `DREAMS.md` 並選擇性地寫入 `memory/dreaming/deep/YYYY-MM-DD.md`。

  </Accordion>
  <Accordion title="REM 階段">
    REM 階段提取模式和反思訊號。

    - 從最近的短期追蹤中建立主題和反思摘要。
    - 當儲存包含內聯輸出時，寫入受管理的 `## REM Sleep` 區塊。
    - 記錄深度排序使用的 REM 增強訊號。
    - 永不寫入 `MEMORY.md`。

  </Accordion>
</AccordionGroup>

## Session transcript ingestion

Dreaming 可以將編輯過的會話逐字稿攝入到夢境語料庫中。當逐字稿可用時，它們會與每日記憶信號和回溯追蹤一起被送入輕量階段。個人與敏感內容在攝入前會被編輯。

## 夢境日記

Dreaming 也會在 `DREAMS.md` 中保留敘事性的 **Dream Diary**（夢境日記）。當每個階段累積足夠的材料後，`memory-core` 會盡力在背景執行一次子代理程式運作，並附加一條簡短的日記條目。除非配置了 `dreaming.model`，否則它會使用預設的執行時期模型。如果配置的模型無法使用，Dream Diary 會使用會話的預設模型重試一次。

<Note>此日記是供人類在 Dreams UI 中閱讀的，並非晉升來源。由 Dreaming 產生的日記/報告成果會被排除在短期晉升之外。只有有根據的記憶片段才有資格晉升到 `MEMORY.md`。</Note>

還有一條用於審查與恢復工作的植基式歷史回填管道：

<AccordionGroup>
  <Accordion title="回填指令">
    - `memory rem-harness --path ... --grounded` 預覽來自歷史 `YYYY-MM-DD.md` 筆記的有根據日記輸出。
    - `memory rem-backfill --path ...` 將可逆的有根據日記條目寫入 `DREAMS.md`。
    - `memory rem-backfill --path ... --stage-short-term` 將有根據的持久候選項目暫存到與正常深度階段使用的相同短期證據儲存區中。
    - `memory rem-backfill --rollback` 和 `--rollback-short-term` 會移除那些暫存的回填成果，而不會觸及一般的日記條目或即時短期回憶。

  </Accordion>
</AccordionGroup>

控制 UI 暴露了相同的日記回填/重置流程，以便您在決定那些基於事實的候選項是否值得提升之前，可以在「夢境」場景中檢查結果。該場景還顯示了一個獨特的「基於事實」通道，讓您可以看到哪些暫存的短期條目來自歷史重放，哪些提升的項目是由基於事實的引導所驅動，並且可以清除僅包含基於事實的暫存條目，而不會影響普通的即時短期狀態。

## 深度排名訊號

深度排名使用六個加權基礎訊號加上階段強化：

| 訊號       | 權重 | 描述                        |
| ---------- | ---- | --------------------------- |
| 頻率       | 0.24 | 該條目累積了多少短期訊號    |
| 相關性     | 0.30 | 該條目的平均檢索品質        |
| 查詢多樣性 | 0.15 | 呈現它的不同查詢/日語境     |
| 近期性     | 0.15 | 隨時間衰減的新鮮度分數      |
| 整合       | 0.10 | 多天重複出現的強度          |
| 概念豐富度 | 0.06 | 來自片段/路徑的概念標籤密度 |

Light 和 REM 階段的命中會從 `memory/.dreams/phase-signals.json` 增加一個微小的近期遞減提升。

影子試驗結果可以在任何持久化寫入之前，作為審查訊號疊加在該基礎分數之上。有幫助的試驗會給予候選者一個小的有界提升，中立的試驗會將其保持為延遲狀態，而有害的試驗會將其標記為在該次評分通過中被拒絕。此訊號仍然僅供報告使用：它可以改變候選者排序或審查元數據，但不會寫入 `MEMORY.md` 或自行提升候選者。

## QA 影子試驗報告覆蓋範圍

QA Lab 包含一個僅供報告的情境，用於探索未來的夢境影子試驗如何在提升前審查候選記憶。該情境要求代理比較基準答案與可以使用候選記憶的答案，然後撰寫包含裁決、理由和風險標誌的本地報告。

此覆蓋範圍特意僅限於 QA。它驗證了報告工件與 `MEMORY.md` 保持分離，並且代理不會聲稱候選者已被提升。它不會增加生產環境影子試驗行為或改變深階段提升引擎。

`memory-core` 影子試驗執行器對需要穩定工件的程式碼路徑保持相同的僅供報告約定。它接受候選者、試驗提示、基準結果、候選結果、裁決、理由、風險標誌和證據參考，然後使用 `promotion action: report-only` 撰寫報告。有幫助的裁決映射到 `promote` 建議，中立裁決映射到 `defer`，有害裁決映射到 `reject`；這些建議都不會寫入 `MEMORY.md` 或應用深階段提升。

## 排程

啟用後，`memory-core` 會自動管理一個 cron 工作以進行完整的夢境掃描。每次掃描會按順序執行各階段：light → REM → deep。

該掃描包含主要執行時工作區以及任何已設定的代理工作區，並根據路徑進行去重，因此子代理工作區的扇出不會排除主要代理的 `DREAMS.md` 和記憶狀態。

預設頻率行為：

| 設定                 | 預設值      |
| -------------------- | ----------- |
| `dreaming.frequency` | `0 3 * * *` |
| `dreaming.model`     | 預設模型    |

## 快速開始

<Tabs>
  <Tab title="啟用夢境整理">
    ```json
    {
      "plugins": {
        "entries": {
          "memory-core": {
            "config": {
              "dreaming": {
                "enabled": true
              }
            }
          }
        }
      }
    }
    ```
  </Tab>
  <Tab title="自訂掃描頻率">
    ```json
    {
      "plugins": {
        "entries": {
          "memory-core": {
            "config": {
              "dreaming": {
                "enabled": true,
                "timezone": "America/Los_Angeles",
                "frequency": "0 */6 * * *"
              }
            }
          }
        }
      }
    }
    ```
  </Tab>
</Tabs>

## 斜線指令

```
/dreaming status
/dreaming on
/dreaming off
/dreaming help
```

## CLI 工作流程

<Tabs>
  <Tab title="晉升預覽 / 套用">
    ```bash
    openclaw memory promote
    openclaw memory promote --apply
    openclaw memory promote --limit 5
    openclaw memory status --deep
    ```

    手動 `memory promote` 預設使用深層階段閾值，除非使用 CLI 標誌覆寫。

  </Tab>
  <Tab title="解釋晉升">
    解釋為什麼特定候選者會或不會晉升：

    ```bash
    openclaw memory promote-explain "router vlan"
    openclaw memory promote-explain "router vlan" --json
    ```

  </Tab>
  <Tab title="REM 組件預覽">
    預覽 REM 反思、候選真實性以及深層晉升輸出，而不寫入任何內容：

    ```bash
    openclaw memory rem-harness
    openclaw memory rem-harness --json
    ```

  </Tab>
</Tabs>

## 主要預設值

所有設定都在 `plugins.entries.memory-core.config.dreaming` 之下。

<ParamField path="enabled" type="boolean" default="false">
  啟用或停用夢境掃描。
</ParamField>
<ParamField path="frequency" type="string" default="0 3 * * *">
  完整夢境掃描的 Cron 頻率。
</ParamField>
<ParamField path="model" type="string">
  可選的夢境日誌（Dream Diary）子代理模型覆寫。在設定子代理 `allowedModels` 允許清單時，請使用標準的 `provider/model` 值。
</ParamField>
<ParamField path="phases.deep.maxPromotedSnippetTokens" type="number" default="160">
  從每個晉升至 `MEMORY.md` 的短期回憶片段中保留的最大估算 token 數。排名來源仍然可見。
</ParamField>

<Warning>`dreaming.model` 需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`。若要限制它，也請設定 `plugins.entries.memory-core.subagent.allowedModels`。信任或允許清單失敗會保持可見，而不是靜默回退；重試僅涵蓋模型不可用的錯誤。</Warning>

<Note>大部分階段策略、閾值和儲存行為都是內部實作細節。請參閱 [Memory configuration reference](/zh-Hant/reference/memory-config#dreaming) 以取得完整的金鑰列表。</Note>

## Dreams UI

啟用後，Gateway 的 **Dreams** 分頁會顯示：

- 目前的 dreaming 已啟用狀態
- 階段層級狀態與 managed-sweep 的存在與否
- 短期、grounded、signal 與今日 promoted 的計數
- 下次排程執行的時間
- 專屬的 grounded Scene 頻道，用於顯示已預備的歷史重播項目
- 由 `doctor.memory.dreamDiary` 支援的可展開 Dream Diary 閱讀器

## Dreaming 從不執行：狀態顯示為已封鎖

如果 `openclaw memory status` 回報 `Dreaming status: blocked`，表示 managed cron 已存在，但預設代理程式的心跳並未觸發。請檢查預設代理程式已啟用心跳，且其目標不是 `none`，然後在下一個心跳間隔後再次執行 `openclaw memory status --deep`。

## 相關內容

- [Memory](/zh-Hant/concepts/memory)
- [Memory CLI](/zh-Hant/cli/memory)
- [Memory configuration reference](/zh-Hant/reference/memory-config)
- [Memory search](/zh-Hant/concepts/memory-search)
