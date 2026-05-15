---
summary: "本地優先的搜尋側車，具備 BM25、向量、重新排序及查詢擴展功能"
title: "QMD 記憶引擎"
read_when:
  - You want to set up QMD as your memory backend
  - You want advanced memory features like reranking or extra indexed paths
---

[QMD](https://github.com/tobi/qmd) 是一個與 OpenClaw 並行運行的本機優先搜尋側車。它將 BM25、向量搜尋和重排序結合在單一二進位檔案中，並可對您工作區記憶體檔案之外的內容進行索引。

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

- OpenClaw 會從您的工作區記憶體檔案和任何設定的 `memory.qmd.paths` 建立集合，然後在開啟 QMD 管理器時及之後定期（預設每 5 分鐘）執行 `qmd update`。這些重新整理透過 QMD 子程序執行，而不是程序內的檔案系統掃描。語意模式也會執行 `qmd embed`。
- 預設的工作區集合會追蹤 `MEMORY.md` 以及 `memory/` 樹狀結構。小寫 `memory.md` 不會被索引為根記憶檔案。
- QMD 自己的掃描器會忽略隱藏路徑和常見的相依性/建置目錄，例如 `.git`、`.cache`、`node_modules`、`vendor`、`dist` 和 `build`。Gateway 啟動預設不會初始化 QMD，因此冷啟動可避免在首次使用記憶體之前匯入記憶體執行時或建立長期存活的監看器。
- 如果您仍希望在 gateway 啟動時重新整理，請將 `memory.qmd.update.startup` 設定為 `idle` 或 `immediate`。此選用啟動重新整理使用一次性 QMD 子程序路徑，而不是建立完整的長期程序內監看器。
- 搜尋使用設定的 `searchMode`（預設：`search`；也支援 `vsearch` 和 `query`）。`search` 僅包含 BM25，因此 OpenClaw 在該模式下會跳過語意向量就緒檢查和嵌入維護。如果模式失敗，OpenClaw 會使用 `qmd query` 重試。
- 對於宣佈支援多集合篩選的 QMD 版本，OpenClaw 會將來自相同來源的集合合併為單一 QMD 搜尋呼叫。較舊的 QMD 版本則保持相容的每個集合後援機制。
- 如果 QMD 完全失敗，OpenClaw 會後援到內建的 SQLite 引擎。重複的對話回合嘗試在開啟失敗後會短暫退避，以免缺少的二進位檔案或損壞的側車相依性造成重試風暴；`openclaw memory status` 和一次性 CLI 探測仍會直接重新檢查 QMD。

<Info>首次搜尋可能會很慢 —— QMD 會在第一次 `qmd query` 執行時自動下載用於重排序和查詢擴展的 GGUF 模型（約 2 GB）。</Info>

## 搜尋效能與相容性

OpenClaw 確保 QMD 搜尋路徑與目前和舊版 QMD 安裝相容。

啟動時，OpenClaw 會針對每個管理員檢查一次已安裝的 QMD 說明文字。如果二進位檔案宣稱支援多個集合篩選器，OpenClaw 會使用一個指令搜尋所有同來源集合：

```bash
qmd search "router notes" --json -n 10 -c memory-root-main -c memory-dir-main
```

這避免了為每個持久記憶體集合啟動一個 QMD 子行程。會話轉錄集合位於其自己的來源群組中，因此混合 `memory` + `sessions` 搜尋仍能從兩個來源為結果多樣化器提供輸入。

較舊的 QMD 版本僅接受一個集合篩選器。當 OpenClaw 偵測到其中一個版本時，它會保持相容性路徑，並在合併和去重結果之前分別搜尋每個集合。

若要手動檢查已安裝的合約，請執行：

```bash
qmd --help | grep -i collection
```

目前的 QMD 說明指出集合篩選器可以針對一個或多個集合。較舊的說明通常僅描述單一集合。

## 模型覆寫

QMD 模型環境變數會從閘道行程原封不動地傳遞，因此您可以全域調整 QMD 而無需新增 OpenClaw 設定：

```bash
export QMD_EMBED_MODEL="hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf"
export QMD_RERANK_MODEL="/absolute/path/to/reranker.gguf"
export QMD_GENERATE_MODEL="/absolute/path/to/generator.gguf"
```

變更嵌入模型後，請重新執行嵌入，使索引符合新的向量空間。

## 索引額外路徑

將 QMD 指向其他目錄以使其可被搜尋：

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

來自額外路徑的片段會在搜尋結果中以 `qmd/<collection>/<relative-path>` 形式出現。`memory_get` 瞭解此前綴，並會從正確的集合根目錄讀取。

## 索引會話轉錄

啟用會話索引以回憶先前的對話：

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

轉錄內容會以經過清理的使用者/助理回合匯出到 `~/.openclaw/agents/<id>/qmd/sessions/` 下的專用 QMD 集合中。

## 搜尋範圍

根據預設，QMD 搜尋結果會顯示在直接和頻道會話中（而非群組）。設定 `memory.qmd.scope` 以變更此設定：

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

當範圍拒絕搜尋時，OpenClaw 會記錄包含衍生頻道和聊天類型的警告，以便更容易除錯空結果。

## 引用

當 `memory.citations` 為 `auto` 或 `on` 時，搜尋摘要會包含一個
`Source: <path#line>` 頁尾。設定 `memory.citations = "off"` 可省略頁尾，
同時仍內部將路徑傳遞給代理程式。

## 使用時機

當您需要以下功能時，請選擇 QMD：

- 重新排序以獲得更高品質的結果。
- 搜尋工作區之外的專案文件或筆記。
- 回顧過去的會話對話。
- 完全本地搜尋，無需 API 金鑰。

對於較簡單的設定，[內建引擎](/zh-Hant/concepts/memory-builtin) 運作良好，
且無需額外相依套件。

## 疑難排解

**找不到 QMD？** 請確保二進位檔案位於閘道的 `PATH` 中。如果 OpenClaw
作為服務執行，請建立符號連結：
`sudo ln -s ~/.bun/bin/qmd /usr/local/bin/qmd`。

如果 `qmd --version` 在您的 shell 中正常運作，但 OpenClaw 仍回報
`spawn qmd ENOENT`，則閘道程序的 `PATH` 可能與您的
互動式 shell 不同。請明確指定二進位檔案：

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

在安裝 QMD 的環境中使用 `command -v qmd`，然後使用
`openclaw memory status --deep` 重新檢查。

**第一次搜尋很慢？** QMD 會在首次使用時下載 GGUF 模型。請使用 OpenClaw 使用的相同 XDG 目錄，
透過 `qmd query "test"` 進行預熱。

**搜尋時出現許多 QMD 子程序？** 如果可能，請更新 QMD。只有在安裝的
QMD 宣告支援多個 `-c` 篩選器時，OpenClaw 才會針對同來源的多集合搜尋使用單一程序；
否則，為了正確性，它會保留較舊的每個集合的後備方案。

**僅 BM25 的 QMD 仍嘗試建置 llama.cpp？** 請設定
`memory.qmd.searchMode = "search"`。OpenClaw 會將該模式視為僅詞彙模式，
不執行 QMD 向量狀態探測或嵌入維護，並將語意就緒檢查留給
`vsearch` 或 `query` 設定。

**搜尋逾時？** 增加 `memory.qmd.limits.timeoutMs` (預設：4000ms)。
對於較慢的硬體，請設定為 `120000`。

**群組聊天中沒有結果？** 請檢查 `memory.qmd.scope` —— 預設值僅
允許直接和頻道會話。

**根記憶體搜尋突然變得太寬泛？** 重啟閘道或等待下次啟動調和。當 OpenClaw 偵測到同名衝突時，它會將過時的受管理集合重新建立回標準的 `MEMORY.md` 和 `memory/` 模式。

**工作區可見的暫存儲存庫導致 `ENAMETOOLONG` 或索引損壞？** QMD 遍歷目前遵循底層 QMD 掃描器的行為，而不是 OpenClaw 內建的符號連結規則。將暫時的 monorepo 簽出保留在隱藏目錄（例如 `.tmp/`）下或索引的 QMD 根目錄之外，直到 QMD 揭示循環安全的遍歷或明確的排除控制。

## 設定

有關完整的設定介面（`memory.qmd.*`）、搜尋模式、更新間隔、範圍規則以及所有其他控制選項，請參閱[記憶體設定參考](/zh-Hant/reference/memory-config)。

## 相關

- [記憶體概覽](/zh-Hant/concepts/memory)
- [內建記憶體引擎](/zh-Hant/concepts/memory-builtin)
- [Honcho 記憶體](/zh-Hant/concepts/memory-honcho)
