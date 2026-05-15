---
summary: "使用 apply_patch 工具套用多檔案補丁"
read_when:
  - You need structured file edits across multiple files
  - You want to document or debug patch-based edits
title: "apply_patch 工具"
---

使用結構化的補丁格式套用檔案變更。這非常適合單一 `edit` 呼叫可能不穩定的多檔案或多區塊編輯。

此工具接受單一 `input` 字串，其中包含一或多個檔案操作：

```
*** Begin Patch
*** Add File: path/to/file.txt
+line 1
+line 2
*** Update File: src/app.ts
@@
-old line
+new line
*** Delete File: obsolete.txt
*** End Patch
```

## 參數

- `input`（必要）：完整的補丁內容，包括 `*** Begin Patch` 和 `*** End Patch`。

## 備註

- Patch 路徑支援相對路徑 (從工作區目錄開始) 和絕對路徑。
- `tools.exec.applyPatch.workspaceOnly` 預設為 `true`（限於工作區內）。僅當您有意讓 `apply_patch` 在工作區目錄之外寫入/刪除時，才將其設定為 `false`。
- 在 `*** Update File:` 區塊內使用 `*** Move to:` 來重新命名檔案。
- `*** End of File` 在需要時標記僅在檔案結尾（EOF）的插入。
- 預設情況下，OpenAI 和 OpenAI Codex 模型可用此功能。設定
  `tools.exec.applyPatch.enabled: false` 以將其停用。
- 可選擇透過
  `tools.exec.applyPatch.allowModels` 依模型進行限制。
- 設定僅在 `tools.exec` 之下。

## 範例

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

## 相關

<CardGroup cols={2}>
  <Card title="Diffs" href="/zh-Hant/tools/diffs" icon="code-compare">
    用於呈現變更的唯讀差異檢視器。
  </Card>
  <Card title="Exec 工具" href="/zh-Hant/tools/exec" icon="terminal">
    來自代理程式的 Shell 指令執行。
  </Card>
  <Card title="程式碼執行" href="/zh-Hant/tools/code-execution" icon="square-code">
    使用 xAI 進行沙箱遠端 Python 分析。
  </Card>
</CardGroup>
