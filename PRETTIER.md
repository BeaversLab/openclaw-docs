# Prettier 格式化配置

本项目使用 [Prettier](https://prettier.io) 来统一 Markdown 和 JSON 文件的格式。

## 安装依赖

```bash
pnpm install
```

## 可用命令

### 检查格式

检查所有文件是否符合格式规范：

```bash
pnpm format:check
```

只检查英文文档：

```bash
pnpm prettier --check "en/**/*.md"
```

只检查中文文档：

```bash
pnpm prettier --check "zh/**/*.md"
```

### 自动格式化

格式化所有文件：

```bash
pnpm format
```

只格式化英文文档：

```bash
pnpm format:en
```

只格式化中文文档：

```bash
pnpm format:zh
```

格式化单个文件：

```bash
pnpm prettier --write "zh/gateway/doctor.md"
```

## 配置说明

### 空行规则

Prettier 会自动添加以下位置的空行：

1. **Frontmatter 后**：`---` 后自动添加空行
2. **列表前**：在代码块后的列表前自动添加空行
3. **对象/数组**：JSON 中对象和数组的最后一项添加尾随逗号

### JSON 尾随逗号

配置为 `trailingComma: "es5"`，会在以下位置添加尾随逗号：

```json5
{
  key: "value",
  array: [
    1,
    2,
  ],
}
```

### Markdown 宽度

- Markdown 文件：100 字符
- 其他文件：80 字符

## 忽略文件

`.prettierignore` 文件中列出的文件和目录会被忽略，包括：

- `node_modules/` - 依赖
- `_site/` - Jekyll 构建输出
- `.git/` - Git 目录
- 配置文件（`.vscode/`, `.idea/` 等）
- 日志文件

## Git 集成（可选）

### Pre-commit Hook

可以使用 [husky](https://github.com/typicode/husky) 和 [lint-staged](https://github.com/okonet/lint-staged) 在提交前自动格式化：

```bash
pnpm add -D husky lint-staged
pnpm exec husky-init
```

然后配置 `.husky/pre-commit`：

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm exec lint-staged
```

配置 `package.json`：

```json
{
  "lint-staged": {
    "*.{md,json,yaml,yml,json5}": "prettier --write"
  }
}
```

## 常见问题

### Q: Prettier 改变了我的文件格式怎么办？

A: Prettier 的格式化规则是可配置的。如果不喜欢某个规则，可以修改 `.prettierrc.yml` 配置文件。

### Q: 如何只检查不修改文件？

A: 使用 `--check` 参数：

```bash
pnpm prettier --check "zh/**/*.md"
```

### Q: 如何查看 Prettier 会做哪些改动？

A: 使用 `--write` 参数配合 git diff：

```bash
pnpm prettier --write "zh/gateway/doctor.md"
git diff zh/gateway/doctor.md
```

## 相关资源

- [Prettier 官方文档](https://prettier.io/docs/en/)
- [Prettier 选项配置](https://prettier.io/docs/en/options.html)
- [Prettier 忽略文件](https://prettier.io/docs/en/ignore.html)
