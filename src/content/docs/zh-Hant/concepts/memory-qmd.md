---
title: "QMD 記憶引擎"
summary: "本地優先的搜尋側車，具備 BM25、向量、重排序和查詢擴展功能"
read_when:
  - You want to set up QMD as your memory backend
  - You want advanced memory features like reranking or extra indexed paths
---

# QMD 記憶引擎

[QMD](https://github.com/tobi/qmd) 是一個與 OpenClaw 並行運行的本地優先搜尋側車。它將 BM25、向量搜尋和重排序結合在單一二進位檔案中，並可對您的工作區記憶檔案之外的內容進行索引。

## 相較於內建引擎的增強功能

- **重排序和查詢擴展**，以獲得更好的召回率。
- **索引額外目錄**——專案文件、團隊筆記、磁碟上的任何內容。
- **索引對話紀錄**——回顧先前的對話。
- **完全本機化**——透過 Bun + node-llama-cpp 運行，自動下載 GGUF 模型。
- **自動備援**——如果 QMD 無法使用，OpenClaw 會無縫切換回
  內建引擎。

## 快速開始

### 先決條件

- 安裝 QMD：`npm install -g @tobilu/qmd` 或 `bun install -g @tobilu/qmd`
- 允許擴充功能的 SQLite 版本（macOS 上為 `brew install sqlite`）。
- QMD 必須位於閘道的 `PATH` 上。
- macOS 和 Linux 可直接運作。Windows 建議透過 WSL2 以獲得最佳支援。

### 啟用

```json5
{
  memory: {
    backend: "qmd",
  },
}
```

OpenClaw 會在 `~/.openclaw/agents/<agentId>/qmd/` 下建立一個獨立的 QMD 主目錄，並自動管理側車的生命週期——集合、更新和嵌入運行均會為您處理。它優先使用目前的 QMD 集合和 MCP 查詢形狀，但在需要時仍會回退到舊版 `--mask` 集合旗標和較舊的 MCP 工具名稱。

## 側車運作方式

- OpenClaw 會根據您的工作區記憶檔案和任何已設定的 `memory.qmd.paths` 建立集合，然後在啟動時和定期（預設每 5 分鐘）執行 `qmd update` + `qmd embed`。
- 啟動重新整理會在背景執行，因此不會阻塞聊天啟動。
- 搜尋使用設定的 `searchMode`（預設：`search`；也支援 `vsearch` 和 `query`）。如果某種模式失敗，OpenClaw 會使用 `qmd query` 重試。
- 如果 QMD 完全失效，OpenClaw 將備援回內建 SQLite 引擎。

<Info>第一次搜尋可能會很慢——QMD 會在第一次 `qmd query` 執行時自動下載用於重排序和查詢擴展的 GGUF 模型（約 2 GB）。</Info>

## 模型覆寫

QMD 模型環境變數會從閘道程序原樣傳遞，因此您可以在不新增 OpenClaw 設定的情況下全局調整 QMD：

```bash
export QMD_EMBED_MODEL="hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf"
export QMD_RERANK_MODEL="/absolute/path/to/reranker.gguf"
export QMD_GENERATE_MODEL="/absolute/path/to/generator.gguf"
```

變更嵌入模型後，請重新執行嵌入，以便索引符合新的向量空間。

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

來自額外路徑的摘要在搜尋結果中顯示為 `qmd/<collection>/<relative-path>`。`memory_get` 能識別此前綴並從正確的集合根目錄讀取。

## 索引會話記錄

啟用會話索引以回顧先前的對話：

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

對話紀錄會以清理過的使用者/助理回合形式匯出到 `~/.openclaw/agents/<id>/qmd/sessions/` 下的專用 QMD 集合。

## 搜尋範圍

根據預設，QMD 搜尋結果只會顯示在 DM 會話中（而非群組或頻道）。設定 `memory.qmd.scope` 以變更此設定：

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

當範圍拒絕搜尋時，OpenClaw 會記錄一個包含衍生頻道和聊天類型的警告，以便更容易調試空結果。

## 引用

當 `memory.citations` 為 `auto` 或 `on` 時，搜尋片段會包含一個
`Source: <path#line>` 頁尾。設定 `memory.citations = "off"` 以省略頁尾，
同時仍將路徑在內部傳遞給代理程式。

## 使用時機

當您需要以下功能時，請選擇 QMD：

- 重新排序（reranking）以獲得更高品質的結果。
- 搜尋工作區以外的專案文件或筆記。
- 回顧過去的會話對話。
- 完全本地的搜尋，無需 API 金鑰。

對於較簡單的設定，[內建引擎](/en/concepts/memory-builtin) 運作良好，且無需額外的相依元件。

## 疑難排解

**找不到 QMD？** 確認執行檔位於閘道的 `PATH` 中。如果 OpenClaw
以服務形式執行，請建立符號連結（symlink）：
`sudo ln -s ~/.bun/bin/qmd /usr/local/bin/qmd`。

**第一次搜尋很慢？** QMD 會在首次使用時下載 GGUF 模型。請使用 OpenClaw
所使用的相同 XDG 目錄透過 `qmd query "test"` 進行預熱。

**搜尋逾時？** 增加 `memory.qmd.limits.timeoutMs`（預設值：4000ms）。
對於較慢的硬體，請設定為 `120000`。

**群組聊天中沒有結果？** 檢查 `memory.qmd.scope` —— 預設值僅
允許 DM 會話。

**工作區可見的暫存儲存庫導致 `ENAMETOOLONG` 或索引損壞？**
QMD 遍歷目前遵循底層 QMD 掃描器的行為，而不是
OpenClaw 的內建符號連結規則。請將暫時的 monorepo 檢出保留在
隱藏目錄（如 `.tmp/`）中，或放在索引的 QMD 根目錄之外，直到 QMD 提供
迴圈安全的遍歷或明確的排除控制為止。

## 設定

有關完整的設定介面 (`memory.qmd.*`)、搜尋模式、更新間隔、
範圍規則以及所有其他選項，請參閱
[記憶體設定參考](/en/reference/memory-config)。
