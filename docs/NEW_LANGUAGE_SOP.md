# 新语言添加标准化流程 (SOP)

当需要为 `crawfish-docs` 添加一种新语言（例如 `es`）时，请严格按照以下步骤操作，以确保所有自动化工具和导航功能正常工作。

## 1. 初始化目录结构

- **创建目录**: 复制 `en/` 目录并重命名为目标语言代码（例如 `es/`）。
- **初始化内容**: 确保基础文件（如 `index.md`）存在。

## 2. 核心配置更新 (`docs.json`)

- **添加语言入口**: 在 `navigation.languages` 数组中添加新语言对象。
- **配置导航栏**: 复制 `en` 的 `tabs` 配置，并执行全局替换，将所有 `en/` 前缀替换为目标语言前缀（如 `es/`）。
- **重定向规则**: 检查 `redirects` 是否需要为新语言添加特殊规则。

## 3. 浏览器语言检测与重定向 (`redirect.js`)

- **路径匹配**: 在 `localeMatch` 正则表达式中添加新语言代码。
  ```javascript
  var localeMatch = path.match(/^\/(en|zh|es)(\/.*)?$/);
  ```
- **语言检测逻辑**: 在 `detectPreferredLocale` 函数中添加对新语言的识别。
  ```javascript
  if (l.startsWith("es")) return "es";
  ```

## 4. 自动化脚本支持

- **链接修复脚本 (`scripts/fix-locale-links.js`)**:
  - 在 `LOCALE_PREFIXES` 数组中添加新语言代码。
  - 在 `detectLocale` 函数中添加相应的 `if` 分支以识别新目录。
- **质量对比脚本 (`scripts/compare-i18n.js`)**:
  - 该脚本已支持 `--locale <lang>` 参数。
  - 验证命令: `node scripts/compare-i18n.js --locale <lang>`。

## 5. 国际化工具配置 (`.i18n/config.yaml`)

- **链接修复规则**: 在 `linkFix.rules` 下添加新语言的目录和前缀。
  ```yaml
  - dir: /es
    prefix: es/
  ```

## 6. 组件与格式化

- **页脚组件**: 在 `components/footer/` 目录下创建 `<lang>.mdx`（例如 `es.mdx`），并进行翻译。
- **格式化脚本 (`package.json`)**: 在 `scripts` 中添加 `format:<lang>` 命令。
  ```json
  "format:es": "prettier --write \"es/**/*.md\""
  ```

## 7. 术语表同步 (`.i18n/glossary.yaml`)

- **添加翻译字段**: 确保 `entries` 下的每个术语都在 `targets` 中包含新语言的翻译。
- **示例**:
  ```yaml
  targets:
    en: API
    zh: API
    es: API
  ```

## 8. 最终验证清单

1. **运行页脚同步**: `npm run footers` (会自动检测 `components/footer/` 下的新文件)。
2. **执行链接修复**: `node scripts/fix-locale-links.js <lang>/`。
3. **运行格式化**: `npm run format:<lang>`。
4. **执行质量对比**: `node scripts/compare-i18n.js --summary --locale <lang>`。

---

遵循此 SOP 可确保新语言在 `crawfish-docs` 架构下获得完整的工程化支持。
