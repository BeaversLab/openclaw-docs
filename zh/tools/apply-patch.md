---
summary: "使用 apply_patch 工具应用多文件补丁"
read_when:
  - You need structured file edits across multiple files
  - You want to document or debug patch-based edits
title: "apply_patch 工具"
---

# apply_patch 工具

使用结构化补丁格式应用文件更改。这非常适合于单次 `edit` 调用可能不可靠的多文件或多块编辑。

该工具接受包含一个或多个文件操作的单一 `input` 字符串：

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

- `input`（必需）：完整的补丁内容，包括 `*** Begin Patch` 和 `*** End Patch`。

## 说明

- 补丁路径支持相对路径（从工作区目录）和绝对路径。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（包含在工作区内）。仅当您有意希望 `apply_patch` 在工作区目录之外写入/删除时，才将其设置为 `false`。
- 在 `*** Update File:` 块中使用 `*** Move to:` 来重命名文件。
- 需要时，`*** End of File` 标记仅文件结尾 (EOF) 的插入。
- 默认为实验性功能且已禁用。通过 `tools.exec.applyPatch.enabled` 启用。
- 仅限 OpenAI（包括 OpenAI Codex）。可选择通过模型进行限制，方式为
  `tools.exec.applyPatch.allowModels`。
- 配置仅位于 `tools.exec` 下。

## 示例

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

import zh from '/components/footer/zh.mdx';

<zh />
