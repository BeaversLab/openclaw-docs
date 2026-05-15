---
summary: "輕度、深度和 REM 階段加上夢境日記的背景記憶整合"
title: "做夢"
sidebarTitle: "做夢"
read_when:
  - You want memory promotion to run automatically
  - You want to understand what each dreaming phase does
  - You want to tune consolidation without polluting MEMORY.md
---

做夢是 `memory-core` 中的背景記憶整合系統。它能幫助 OpenClaw 將強烈的短期訊號轉移到持久記憶中，同時保持過程可解釋和可審查。

<Note>做夢功能是**可選加入 (opt-in)** 的，且預設為停用。</Note>

## 做夢寫入的內容

做夢會保留兩種輸出：

- `memory/.dreams/` 中的**機器狀態**（回憶儲存庫、階段訊號、攝入檢查點、鎖定）。
- `DREAMS.md`（或現有的 `dreams.md`）中的**人類可讀輸出**，以及 `memory/dreaming/<phase>/YYYY-MM-DD.md` 下的可選階段報告檔案。

長期提升仍然只寫入 `MEMORY.md`。

## 階段模型

做夢使用三個協作階段：

| 階段 | 目的                     | 持久寫入         |
| ---- | ------------------------ | ---------------- |
| 輕度 | 排序並暫存最近的短期素材 | 否               |
| 深度 | 評分並提升持久候選項目   | 是 (`MEMORY.md`) |
| REM  | 反思主題和重複出現的想法 | 否               |

這些階段是內部實作細節，而非獨立的使用者設定「模式」。

<AccordionGroup>
  <Accordion title="輕度階段">
    輕度階段會攝入最近的每日記憶訊號和回憶追蹤，對其進行去重，並暫存候選行。

    - 從短期回憶狀態、最近的每日記憶檔案，以及在可用時讀取編輯過的會話逐字稿。
    - 當儲存空間包含內聯輸出時，會寫入受管理的 `## Light Sleep` 區塊。
    - 記錄強化訊號以供後續深度排名使用。
    - 決不寫入 `MEMORY.md`。

  </Accordion>
  <Accordion title="深度階段">
    深度階段決定什麼會成為長期記憶。

    - 使用加權評分和閾值門檻來對候選項進行排名。
    - 需要 `minScore`、`minRecallCount` 和 `minUniqueQueries` 通過。
    - 在寫入之前從即時每日檔案中還原片段，因此會跳過過時/已刪除的片段。
    - 將提升的條目附加到 `MEMORY.md`。
    - 將 `## Deep Sleep` 摘要寫入 `DREAMS.md` 並可選地寫入 `memory/dreaming/deep/YYYY-MM-DD.md`。

  </Accordion>
  <Accordion title="REM 階段">
    REM 階段會提取模式與反思信號。

    - 根據最近的短期追蹤記錄建構主題與反思摘要。
    - 當儲存包含內聯輸出時，寫入受管理的 `## REM Sleep` 區塊。
    - 記錄深度排名所使用的 REM 增強信號。
    - 永不寫入 `MEMORY.md`。

  </Accordion>
</AccordionGroup>

## Session transcript ingestion

Dreaming 可以將編輯過的會話逐字稿攝入到夢境語料庫中。當逐字稿可用時，它們會與每日記憶信號和回溯追蹤一起被送入輕量階段。個人與敏感內容在攝入前會被編輯。

## 夢境日記

Dreaming 還會在 `DREAMS.md` 中保留敘事性的 **Dream Diary**（夢境日記）。當每個階段累積了足夠的素材後，`memory-core` 會盡力執行背景子代理回合並附加一則簡短的日記條目。除非配置了 `dreaming.model`，否則它會使用預設的執行時期模型。如果配置的模型無法使用，Dream Diary 將使用會話的預設模型重試一次。

<Note>這份日記是供人類在 Dreams UI 中閱讀的，而非升級來源。由 Dreaming 產生的日記/報表工件會被排除在短期升級之外。只有植基於事實的記憶片段才具備升級至 `MEMORY.md` 的資格。</Note>

還有一條用於審查與恢復工作的植基式歷史回填管道：

<AccordionGroup>
  <Accordion title="回填指令">
    - `memory rem-harness --path ... --grounded` 預覽來自歷史 `YYYY-MM-DD.md` 筆記的紮記日記輸出。
    - `memory rem-backfill --path ...` 將可逆轉的紮記日記條目寫入 `DREAMS.md`。
    - `memory rem-backfill --path ... --stage-short-term` 將紮記的持久候選暫存到正常深層階段已使用的同一個短期證據儲存庫中。
    - `memory rem-backfill --rollback` 和 `--rollback-short-term` 移除那些暫存的回填構件，而不觸及普通日記條目或即時短期回憶。

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

輕度和快速動眼期（REM）階段的命中會從 `memory/.dreams/phase-signals.json` 增加一個小幅的、隨時間遞減的加成。

## 排程

啟用後，`memory-core` 會自動管理一個 cron 任務以執行完整的夢境檢視。每次檢視會按順序執行各階段：輕度 → REM → 深度。

掃描範圍包括主要執行時期工作區和任何已配置的代理工作區，並根據路徑去重，因此子代理工作區的擴散不會排除主要代理的 `DREAMS.md` 和記憶狀態。

預設頻率行為：

| 設定                 | 預設值      |
| -------------------- | ----------- |
| `dreaming.frequency` | `0 3 * * *` |
| `dreaming.model`     | 預設模型    |

## 快速開始

<Tabs>
  <Tab title="啟用 dreaming">
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
  <Tab title="升級預覽 / 套用">
    ```bash
    openclaw memory promote
    openclaw memory promote --apply
    openclaw memory promote --limit 5
    openclaw memory status --deep
    ```

    手動 `memory promote` 預設使用深層階段的閾值，除非使用 CLI 旗標覆寫。

  </Tab>
  <Tab title="解釋升級">
    解釋為什麼特定候選會或不會升級：

    ```bash
    openclaw memory promote-explain "router vlan"
    openclaw memory promote-explain "router vlan" --json
    ```

  </Tab>
  <Tab title="REM 馬具預覽">
    預覽 REM 反思、候選事實和深度提升輸出，無需寫入任何內容：

    ```bash
    openclaw memory rem-harness
    openclaw memory rem-harness --json
    ```

  </Tab>
</Tabs>

## 關鍵預設值

所有設定都位於 `plugins.entries.memory-core.config.dreaming` 之下。

<ParamField path="enabled" type="boolean" default="false">
  啟用或停用 dreaming 掃描。
</ParamField>
<ParamField path="frequency" type="string" default="0 3 * * *">
  完整 dreaming 掃描的 Cron 排程頻率。
</ParamField>
<ParamField path="model" type="string">
  可選的 Dream Diary 子代理模型覆寫。當同時設定子代理 `allowedModels` 允許清單時，請使用標準的 `provider/model` 值。
</ParamField>

<Warning>`dreaming.model` 需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`。若要限制它，請同時設定 `plugins.entries.memory-core.subagent.allowedModels`。信任或允許清單失敗會保持可見狀態，而不是靜默回退；重試僅涵蓋模型不可用的錯誤。</Warning>

<Note>階段策略、閾值和儲存行為是內部實作細節（非面向使用者的設定）。如需完整的金鑰列表，請參閱 [Memory configuration reference](/zh-Hant/reference/memory-config#dreaming)。</Note>

## Dreams UI

啟用後，Gateway 的 **Dreams** 分頁會顯示：

- 目前的 dreaming 啟用狀態
- 階段層級的狀態和受管理掃描的存在
- 短期、扎根、訊號和今日提升的計數
- 下次排程執行的時間
- 用於暫存歷史重播項目的專屬扎根 Scene 通道
- 由 `doctor.memory.dreamDiary` 支援的可展開 Dream Diary 閱讀器

## Dreaming 永不執行：狀態顯示為封鎖

如果 `openclaw memory status` 回報 `Dreaming status: blocked`，表示受管理的 cron 存在，但預設代理的心跳並未觸發。請檢查預設代理已啟用心跳，且其目標不是 `none`，然後在下一個心跳間隔後再次執行 `openclaw memory status --deep`。

## 相關

- [記憶體](/zh-Hant/concepts/memory)
- [Memory CLI](/zh-Hant/cli/memory)
- [記憶體設定參考](/zh-Hant/reference/memory-config)
- [記憶體搜尋](/zh-Hant/concepts/memory-search)
