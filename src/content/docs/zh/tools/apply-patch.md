---
summary: "使用 apply_patch 工具应用多文件补丁"
read_when:
  - You need structured file edits across multiple files
  - You want to document or debug patch-based edits
title: "apply_patch 工具"
---

使用结构化补丁格式应用文件更改。这非常适合多文件或多块编辑，在那种情况下，单次 `edit` 调用可能会比较脆弱。

该工具接受一个 `input` 字符串，其中包装了一个或多个文件操作：

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

## 注意事项

- 补丁路径支持相对路径（从工作区目录）和绝对路径。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（限于工作区内）。仅当您有意希望 `apply_patch` 在工作区目录之外写入/删除时，才将其设置为 `false`。
- 在 `*** Update File:` 代码块中使用 `*** Move to:` 来重命名文件。
- `*** End of File` 根据需要标记仅在文件末尾（EOF）插入的内容。
- 默认情况下可用于 OpenAI 和 OpenAI Codex 模型。设置 `tools.exec.applyPatch.enabled: false` 以禁用它。
- 可以选择通过 `tools.exec.applyPatch.allowModels` 按模型进行限制。
- 配置仅位于 `tools.exec` 下。

## 示例

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

## 相关

<CardGroup cols={2}>
  <Card title="Diffs" href="/zh/tools/diffs" icon="code-compare">
    用于展示更改的只读差异查看器。
  </Card>
  <Card title="Exec 工具" href="/zh/tools/exec" icon="terminal">
    来自代理的 Shell 命令执行。
  </Card>
  <Card title="代码执行" href="/zh/tools/code-execution" icon="square-code">
    使用 xAI 进行沙箱隔离的远程 Python 分析。
  </Card>
</CardGroup>
