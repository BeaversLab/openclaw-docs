---
summary: "使用 apply_patch 工具应用多文件补丁"
read_when:
  - You need structured file edits across multiple files
  - You want to document or debug patch-based edits
title: "apply_patch 工具"
---

使用结构化补丁格式应用文件更改。这非常适合多文件或多块编辑，在这种情况下，单次 `edit` 调用可能会变得脆弱。

该工具接受单个 `input` 字符串，该字符串包装一个或多个文件操作：

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

## 参数

- `input`（必填）：包括 `*** Begin Patch` 和 `*** End Patch` 的完整补丁内容。

## 注意事项

- 补丁路径支持相对路径（从工作区目录）和绝对路径。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（工作区包含）。仅当您有意希望 `apply_patch` 在工作区目录之外写入/删除时，才将其设置为 `false`。
- 在 `*** Update File:` 块中使用 `*** Move to:` 来重命名文件。
- `*** End of File` 在需要时标记仅 EOF 插入。
- 默认情况下可用于 OpenAI 和 OpenAI Codex 模型。设置
  `tools.exec.applyPatch.enabled: false` 可将其禁用。
- 可选地通过 `tools.exec.applyPatch.allowModels` 按模型进行控制。
- 配置仅位于 `tools.exec` 下。

## 示例

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

## 相关

- [差异](/zh/tools/diffs)
- [Exec 工具](/zh/tools/exec)
- [代码执行](/zh/tools/code-execution)
