---
summary: "使用 apply_patch 工具套用多檔案補丁"
read_when:
  - You need structured file edits across multiple files
  - You want to document or debug patch-based edits
title: "apply_patch 工具"
---

# apply_patch 工具

使用結構化補丁格式套用檔案變更。這非常適合單一 `edit` 呼叫可能會變得脆弱的多檔案或多區塊編輯。

此工具接受一個單一的 `input` 字串，其中包含一或多個檔案操作：

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

- `input` (必填)：完整的補丁內容，包括 `*** Begin Patch` 和 `*** End Patch`。

## 注意事項

- 補丁路徑支援相對路徑 (從工作區目錄) 和絕對路徑。
- `tools.exec.applyPatch.workspaceOnly` 預設為 `true` (限於工作區內)。僅在您刻意希望 `apply_patch` 在工作區目錄之外寫入/刪除時，將其設定為 `false`。
- 在 `*** Update File:` 區塊中使用 `*** Move to:` 來重新命名檔案。
- `*** End of File` 在需要時標記僅 EOF 插入。
- 實驗性功能，預設停用。使用 `tools.exec.applyPatch.enabled` 啟用。
- 僅限 OpenAI (包括 OpenAI Codex)。可選透過 `tools.exec.applyPatch.allowModels` 依模型進行限制。
- 設定僅在 `tools.exec` 下。

## 範例

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```
