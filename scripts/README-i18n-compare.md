# i18n 质量检查脚本

用于批量比较 `/en` 和 `/zh` 目录下的所有 markdown 文件翻译质量。

## 脚本说明

### 1. `compare-i18n.sh` (Bash 版本)

简单的 bash 包装脚本，调用原有的 `quality-cli.js`。

**用法：**
```bash
# 基本用法 - 检查所有文件
./scripts/compare-i18n.sh

# JSON 输出
./scripts/compare-i18n.sh --json

# 只检查特定项目
./scripts/compare-i18n.sh --check terminology,codeBlocks

# 跳过某些检查
./scripts/compare-i18n.sh --skip untranslated
```

**特点：**
- 轻量级，直接调用现有工具
- 支持所有 `quality-cli.js` 的参数
- 带颜色输出

---

### 2. `compare-i18n.js` (Node.js 版本)

增强版 Node.js 脚本，提供更好的报告和统计功能。

**用法：**
```bash
# 完整报告（默认）
node scripts/compare-i18n.js

# 仅显示汇总
node scripts/compare-i18n.js --summary

# 仅显示失败的文件
node scripts/compare-i18n.js --failures

# JSON 输出
node scripts/compare-i18n.js --json
```

**输出模式：**

| 模式 | 说明 |
|------|------|
| `--full` | 显示所有文件的详细检查结果（默认） |
| `--summary` | 仅显示统计汇总和失败文件列表 |
| `--failures` | 仅显示未通过检查的文件详情 |
| `--json` | 以 JSON 格式输出（用于程序处理） |

**输出示例（summary 模式）：**
```
════════════════════════════════════════════════════════════════════
SUMMARY
════════════════════════════════════════════════════════════════════

Total files:     150
✓ Passed:         142
✗ Failed:         6
○ Missing:        2

Total errors:    15
Total warnings:  8

Failed/Missing Files:
  ✗ cli/acp.md (3 errors)
  ✗ cli/config.md (2 errors)
  ✗ concepts/session.md (5 errors)
  ○ cli/new-feature.md

════════════════════════════════════════════════════════════════════
Overall: FAILED
════════════════════════════════════════════════════════════════════
```

---

## 检查项目

质量检查包含以下项目（基于 `quality-cli.js`）：

| 检查ID | 说明 |
|--------|------|
| `structure` | 结构完整性（标题、代码块、列表数量匹配） |
| `codeBlocks` | 代码块内容一致性（必须完全相同） |
| `variables` | 变量保持（`{{var}}`, `$ENV`, `%fmt` 等） |
| `links` | 链接完整性（外部链接、相对链接、锚点） |
| `terminology` | 术语一致性（检查 no-translate.yaml 规则） |
| `untranslated` | 检测未翻译的内容 |
| `sections` | 章节完整性（标题顺序） |
| `frontmatterTranslated` | Frontmatter 翻译状态 |

---

## 推荐工作流

### 1. 开发/翻译阶段
使用 `--summary` 模式快速查看整体进度：
```bash
node scripts/compare-i18n.js --summary
```

### 2. 修复阶段
使用 `--failures` 模式专注处理问题文件：
```bash
node scripts/compare-i18n.js --failures
```

### 3. CI/CD 集成
使用 `--json` 模式以便程序处理结果：
```bash
node scripts/compare-i18n.js --json > i18n-report.json
```

### 4. 单文件检查
直接使用 `quality-cli.js`：
```bash
node .claude/skills/beaver-markdown-i18n/scripts/quality-cli.js \
  en/cli/acp.md zh/cli/acp.md --target-locale zh
```

---

## 退出码

- `0` - 所有检查通过
- `1` - 有文件检查失败或目标文件缺失

可用于 CI/CD 流水线：
```bash
node scripts/compare-i18n.js --summary || exit 1
```
