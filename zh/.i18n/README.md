# OpenClaw 文档 i18n 资源

此文件夹存储用于文档翻译的**生成**文件和**配置**文件。

## 文件

- `glossary.<lang>.json` — 首选术语映射（用于提示词指导）。
- `<lang>.tm.jsonl` — 翻译记忆（缓存），以工作流 + 模型 + 文本哈希为键。

## 词汇表格式

`glossary.<lang>.json` 是一个条目数组：

```json
{
  "source": "troubleshooting",
  "target": "故障排除",
  "ignore_case": true,
  "whole_word": false
}
```

字段：

- `source`：英语（或源语言）短语，优先匹配。
- `target`：首选翻译输出。

## 注意事项

- 词汇表条目作为**提示词指导**传递给模型（非确定性重写）。
- 翻译记忆由 `scripts/docs-i18n` 更新。
