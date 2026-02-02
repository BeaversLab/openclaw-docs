---
title: "apply_patch Tool"
summary: "使用 apply_patch 工具应用多文件补丁"
read_when:
  - 需要跨多个文件进行结构化编辑
  - 想记录或调试基于补丁的编辑
---

# apply_patch 工具

使用结构化补丁格式应用文件变更。适用于多文件或多 hunk 编辑，避免单次 `edit` 调用过于脆弱。

该工具接受一个 `input` 字符串，其中包含一个或多个文件操作：

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

- `input`（必需）：包含 `*** Begin Patch` 与 `*** End Patch` 的完整补丁内容。

## 说明

- 路径相对于工作区根目录解析。
- 在 `*** Update File:` 的 hunk 中使用 `*** Move to:` 可重命名文件。
- 需要时可用 `*** End of File` 标记仅 EOF 插入。
- 实验性，默认禁用。通过 `tools.exec.applyPatch.enabled` 启用。
- 仅 OpenAI（包括 OpenAI Codex）可用。可通过 `tools.exec.applyPatch.allowModels` 按模型限制。
- 配置仅位于 `tools.exec` 下。

## 示例

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch
*** Update File: src/index.ts
@@
-const foo = 1
+const foo = 2
*** End Patch"
}
```
