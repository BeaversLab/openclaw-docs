# 翻译进度 TODO

## 已完成 (88.8%)
- ✅ 269 个文件已处理并提交
- ✅ 所有文件的 title frontmatter 已添加
- ✅ 格式同步完成（数字格式、空行等）
- ✅ 推送到 GitHub

## 待完成文件（需要完整翻译）

### 高优先级（核心文档）
1. **automation/cron-jobs.md** (48% 完成)
   - 英文：444行，中文：214行
   - 缺失章节：
     - Quick start (actionable)
     - Tool-call equivalents
     - JSON schema for tool calls
     - Gateway API surface
     - Troubleshooting

2. **gateway/configuration.md** (75% 完成)
   - 英文：3388行，中文：2554行
   - 缺失约800行内容

### 中优先级（频道文档）
3. **channels/telegram.md** (89% 完成)
   - 英文：750行，中文：670行
   - 缺失约80行

4. **channels/discord.md** (85% 完成)
   - 英文：471行，中文：401行
   - 缺失约70行

5. **tools/browser.md** (88% 完成)
   - 英文：576行，中文：504行
   - 缺失约72行

6. **tools/skills.md** (84% 完成)
   - 英文：300行，中文：251行
   - 缺失约49行

## 翻译建议

### 对于 automation/cron-jobs.md
这是一个重要的核心文档，建议优先翻译。主要缺失内容是：
1. Quick start 章节（包含实际的CLI使用示例）
2. Tool-call equivalents（API工具调用说明）
3. JSON schema（开发者参考）
4. Troubleshooting（故障排除）

### 对于 gateway/configuration.md
这是配置参考文档，建议：
1. 翻译新增的配置选项说明
2. 保持技术术语的一致性
3. 代码示例保持原样

### 对于频道文档
这些文档主要是：
1. 新增的配置选项
2. 更新的API说明
3. 额外的使用示例

## 翻译规则

### 保留不变
- 代码块（\`\`\`）
- 内联代码（\`command\`）
- URL（https://，/en/xxx 链接转为 /zh/xxx）
- 变量（{{var}}，$ENV）
- 技术术语（Gateway，CLI，API，OAuth，SDK等）

### 需要翻译
- Frontmatter（title，summary，description）
- 标题（#，##）
- 段落文本
- 列表项
- 说明性文字

### 一致性要求
- 使用统一的术语映射
- 保持与已翻译文档的一致性
- 遵循项目的翻译风格

## 完成标准

一个文件被认为完成翻译当：
1. 所有新增的英文内容都有对应的中文翻译
2. 链接正确更新（/en/ → /zh/）
3. 代码示例保持原样
4. 格式与英文版本一致

---
生成时间：2026-02-03
当前进度：269/303 (88.8%)
