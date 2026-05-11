---
summary: "使用 apply_patch 工具套用多檔案補丁"
read_when:
  - You need structured file edits across multiple files
  - You want to document or debug patch-based edits
title: "apply_patch 工具"
---

使用結構化的 patch 格式套用檔案變更。這非常適合單一 `edit` 呼叫可能會變得脆弱的多檔案或多區塊編輯。

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

- `input` (必填)：完整的 patch 內容，包括 `*** Begin Patch` 和 `*** End Patch`。

## 備註

- Patch 路徑支援相對路徑 (從工作區目錄開始) 和絕對路徑。
- `tools.exec.applyPatch.workspaceOnly` 預設為 `true` (受限於工作區)。僅在您有意讓 `apply_patch` 在工作區目錄之外寫入/刪除時，才將其設定為 `false`。
- 在 `*** Update File:` 區塊中使用 `*** Move to:` 來重新命名檔案。
- `*** End of File` 在需要時標記僅 EOF 插入。
- 對於 OpenAI 和 OpenAI Codex 模型，預設為可用。設定
  `tools.exec.applyPatch.enabled: false` 以停用它。
- 可選透過
  `tools.exec.applyPatch.allowModels` 以模型進行閘控。
- 設定僅在 `tools.exec` 之下。

## 範例

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

## 相關

- [差異 (Diffs)](/zh-Hant/tools/diffs)
- [Exec 工具](/zh-Hant/tools/exec)
- [程式碼執行](/zh-Hant/tools/code-execution)
