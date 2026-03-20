---
summary: "使用 apply_patch 工具套用多檔案修補"
read_when:
  - 您需要跨多個檔案進行結構化的檔案編輯
  - 您想要記錄或偵錯基於修補的編輯
title: "apply_patch 工具"
---

# apply_patch 工具

使用結構化的修補格式套用檔案變更。這非常適合用於單一 `edit` 呼叫會變得脆弱的多檔案或多區塊編輯。

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

- `input` (必填)：完整的修補內容，包含 `*** Begin Patch` 和 `*** End Patch`。

## 注意事項

- 修補路徑支援相對路徑 (從工作區目錄) 與絕對路徑。
- `tools.exec.applyPatch.workspaceOnly` 預設為 `true` (限制於工作區內)。僅在您有意讓 `apply_patch` 在工作區目錄之外寫入/刪除時，才將其設定為 `false`。
- 在 `*** Update File:` 區塊中使用 `*** Move to:` 來重新命名檔案。
- `*** End of File` 用於在需要時標記僅在檔案結尾 (EOF) 的插入。
- 實驗性功能，預設為停用。透過 `tools.exec.applyPatch.enabled` 啟用。
- 僅限 OpenAI (包括 OpenAI Codex)。可選擇透過
  `tools.exec.applyPatch.allowModels` 依模型設定閘道。
- 設定僅在 `tools.exec` 之下。

## 範例

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

import en from "/components/footer/en.mdx";

<en />
