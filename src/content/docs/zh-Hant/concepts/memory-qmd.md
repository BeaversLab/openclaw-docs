---
summary: "本地優先的搜尋側車，具備 BM25、向量、重新排序及查詢擴展功能"
title: "QMD 記憶引擎"
read_when:
  - You want to set up QMD as your memory backend
  - You want advanced memory features like reranking or extra indexed paths
---

[QMD](https://github.com/tobi/qmd) 是一個本地優先的搜尋側車，與 OpenClaw 並行運行。它將 BM25、向量搜尋和重新排序結合在單一二進位檔案中，並且可以索引您工作區記憶檔案之外的內容。

## 相較於內建功能的增強

- **重新排序和查詢擴展**以提供更好的召回率。
- **索引額外目錄**——專案文件、團隊筆記、磁碟上的任何內容。
- **索引會話紀錄**——回顧先前的對話。
- **完全本地化**——使用可選的 node-llama-cpp 運行時套件運行，並自動下載 GGUF 模型。
- **自動回退**——如果 QMD 不可用，OpenClaw 會無縫回退到內建引擎。

## 開始使用

### 先決條件

- 安裝 QMD：`npm install -g @tobilu/qmd` 或 `bun install -g @tobilu/qmd`
- 允許擴展功能的 SQLite 版本（macOS 上為 `brew install sqlite`）。
- QMD 必須位於閘道的 `PATH` 中。
- macOS 和 Linux 可直接運作。Windows 建議透過 WSL2 獲得最佳支援。

### 啟用

```json5
{
  memory: {
    backend: "qmd",
  },
}
```

OpenClaw 會在 `~/.openclaw/agents/<agentId>/qmd/` 下建立一個獨立的 QMD 家目錄，並自動管理側車的生命週期——集合、更新和嵌入運行都會為您處理好。它偏好當前的 QMD 集合和 MCP 查詢形狀，但在需要時仍會回退到備用集合模式標誌和較舊的 MCP 工具名稱。當仍存在同名的較舊 QMD 集合時，啟動時的協調也會將過時的受管理集合重建為其標準模式。

## 側車運作方式

- OpenClaw 會根據您的工作區記憶檔案和任何設定的 `memory.qmd.paths` 建立集合，然後在啟動時及定期（預設每 5 分鐘）執行 `qmd update`。語意模式也會執行 `qmd embed`。
- 預設的工作區集合會追蹤 `MEMORY.md` 以及 `memory/` 樹狀結構。小寫 `memory.md` 不會被索引為根記憶檔案。
- 啟動時的重新整理會在背景執行，因此不會阻擋聊天啟動。
- 搜尋使用配置的 `searchMode`（預設：`search`；也支援
  `vsearch` 和 `query`）。`search` 僅為 BM25，因此在此模式下 OpenClaw 會跳過語意
  向量就緒探測和嵌入維護。如果模式失敗，OpenClaw 會以 `qmd query` 重試。
- 對於宣佈支援多集合篩選器的 QMD 版本，OpenClaw 會將相同來源的集合合併為一次 QMD 搜尋呼叫。較舊的 QMD 版本則保持相容的逐集合回退。
- 如果 QMD 完全失效，OpenClaw 會回退到內建的 SQLite 引擎。

<Info>首次搜尋可能會很慢 —— QMD 會在第一次 `qmd query` 執行時自動下載用於 重排序和查詢擴展的 GGUF 模型（約 2 GB）。</Info>

## 搜尋效能與相容性

OpenClaw 保持 QMD 搜尋路徑與目前和較舊的 QMD 安裝相容。

啟動時，OpenClaw 會每個管理員檢查一次已安裝的 QMD 說明文字。如果
二進位檔宣佈支援多集合篩選器，OpenClaw 會使用一個指令搜尋所有
相同來源的集合：

```bash
qmd search "router notes" --json -n 10 -c memory-root-main -c memory-dir-main
```

這避免了為每個持久化記憶集合啟動一個 QMD 子程序。
會話記錄集合保留在它們自己的來源群組中，因此混合
`memory` + `sessions` 搜尋仍能從兩個
來源為結果多樣化器提供輸入。

較舊的 QMD 版本僅接受一個集合篩選器。當 OpenClaw 偵測到其中一個
版本時，它會保持相容路徑，分別搜尋每個集合，然後再合併和
去重結果。

若要手動檢查已安裝的合約，請執行：

```bash
qmd --help | grep -i collection
```

目前的 QMD 說明指出集合篩選器可以針對一個或多個集合。
較舊的說明通常描述單一集合。

## 模型覆寫

QMD 模型環境變數會從閘道程序原封不動地傳遞，因此您可以在不
新增 OpenClaw 設定的情況下全域調整 QMD：

```bash
export QMD_EMBED_MODEL="hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf"
export QMD_RERANK_MODEL="/absolute/path/to/reranker.gguf"
export QMD_GENERATE_MODEL="/absolute/path/to/generator.gguf"
```

變更嵌入模型後，請重新執行嵌入，以便索引符合新的向量空間。

## 索引額外路徑

將 QMD 指向其他目錄以使其可搜尋：

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      paths: [{ name: "docs", path: "~/notes", pattern: "**/*.md" }],
    },
  },
}
```

來自額外路徑的摘要在
搜尋結果中顯示為 `qmd/<collection>/<relative-path>`。`memory_get` 能夠理解此前綴並從正確的
集合根目錄讀取。

## 索引對話紀錄

啟用對話索引以回憶先前的對話：

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      sessions: { enabled: true },
    },
  },
}
```

對話紀錄會作為經過清理的使用者/助手回合匯出到 `~/.openclaw/agents/<id>/qmd/sessions/` 下的專用 QMD 收藏集中。

## 搜尋範圍

根據預設，QMD 搜尋結果會顯示在直接和頻道階段中（而非群組）。設定 `memory.qmd.scope` 以變更此設定：

```json5
{
  memory: {
    qmd: {
      scope: {
        default: "deny",
        rules: [{ action: "allow", match: { chatType: "direct" } }],
      },
    },
  },
}
```

當範圍拒絕搜尋時，OpenClaw 會記錄一則包含衍生頻道和聊天類型的警告，以便更輕鬆地除錯空結果。

## 引用

當 `memory.citations` 為 `auto` 或 `on` 時，搜尋片段會包含 `Source: <path#line>` 頁尾。設定 `memory.citations = "off"` 以省略頁尾，同時仍將路徑在內部傳遞給代理程式。

## 使用時機

在您需要以下功能時選擇 QMD：

- 重新排序以獲得更高品質的結果。
- 搜尋工作區外的專案文件或筆記。
- 回憶過去的對話紀錄。
- 完全本地化搜尋，無需 API 金鑰。

對於較簡單的設定，[內建引擎](/zh-Hant/concepts/memory-builtin) 在無需額外相依元件的情況下也能運作良好。

## 疑難排解

**找不到 QMD？** 請確保二進位檔位於閘道的 `PATH` 上。如果 OpenClaw 作為服務執行，請建立符號連結：
`sudo ln -s ~/.bun/bin/qmd /usr/local/bin/qmd`。

如果 `qmd --version` 在您的 shell 中運作正常，但 OpenClaw 仍回報 `spawn qmd ENOENT`，則閘道程序的 `PATH` 可能與您的互動式 shell 不同。請明確釘選二進位檔：

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      command: "/absolute/path/to/qmd",
    },
  },
}
```

在安裝 QMD 的環境中使用 `command -v qmd`，然後使用 `openclaw memory status --deep` 重新檢查。

**首次搜尋很慢？** QMD 會在首次使用時下載 GGUF 模型。請使用與 OpenClaw 相同的 XDG 目錄，透過 `qmd query "test"` 進行預熱。

**搜尋期間有許多 QMD 子程序？** 如果可能，請更新 QMD。僅當安裝的 QMD 宣告支援多個 `-c` 篩選器時，OpenClaw 才會針對來源相同的多收藏集搜尋使用單一程序；否則，為了正確性，它會保留較舊的逐收藏集後援機制。

**僅使用 BM25 的 QMD 仍在嘗試建置 llama.cpp？** 設定
`memory.qmd.searchMode = "search"`。OpenClaw 會將該模式視為僅詞彙模式，
不會執行 QMD 向量狀態探測或嵌入維護，並將語意就緒檢查留給 `vsearch` 或 `query` 設定。

**搜尋逾時？** 增加 `memory.qmd.limits.timeoutMs`（預設值：4000ms）。
對於較慢的硬體，請設定為 `120000`。

**群組聊天中沒有結果？** 檢查 `memory.qmd.scope` -- 預設僅
允許直接和頻道工作階段。

**根記憶體搜尋突然變得太廣泛？** 重新啟動閘道或等待
下一次啟動協調。當 OpenClaw 偵測到同名稱衝突時，
會將過時的管理集合重新建立回標準的 `MEMORY.md` 和 `memory/` 模式。

**工作區可見的暫存存放庫導致 `ENAMETOOLONG` 或索引損壞？**
QMD 遍歷目前遵循底層 QMD 掃描器行為，而非
OpenClaw 的內建符號連結規則。將暫時的 monorepo 簽出保留在
隱藏目錄（如 `.tmp/`）下，或放在索引的 QMD 根目錄之外，直到 QMD 公開
迴圈安全遍歷或明確排除控制為止。

## 設定

如需完整的設定介面（`memory.qmd.*`）、搜尋模式、更新間隔、
範圍規則以及所有其他控制選項，請參閱
[記憶體設定參考](/zh-Hant/reference/memory-config)。

## 相關

- [記憶體概觀](/zh-Hant/concepts/memory)
- [內建記憶體引擎](/zh-Hant/concepts/memory-builtin)
- [Honcho 記憶體](/zh-Hant/concepts/memory-honcho)
