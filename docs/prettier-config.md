# Prettier 格式化配置说明

本项目使用 [Prettier](https://prettier.io) 来统一 Markdown 和 JSON 文件的格式。所有的文档（`.md` 和 `.mdx`）均已配置为使用 MDX 解析器，以确保在不同环境下都具有良好的兼容性。

## 安装依赖

```bash
pnpm install
```

## 可用命令

### 检查格式

检查所有文件（包括 Markdown、JSON、YAML 和 JSON5）是否符合格式规范：

```bash
pnpm format:check
```

### 自动格式化

格式化全量文件：

```bash
pnpm format
```

针对特定目录执行格式化（更推荐日常开发使用）：

| 命令                     | 说明                            |
| :----------------------- | :------------------------------ |
| `pnpm format:en`         | 格式化英文文档 (`en/`)          |
| `pnpm format:zh`         | 格式化中文文档 (`zh/`)          |
| `pnpm format:fr`         | 格式化法语文档 (`fr/`)          |
| `pnpm format:components` | 格式化 MDX 组件 (`components/`) |

## 配置规则汇总 (`.prettierrc.yml`)

### 核心规则

1.  **字符宽度**：
    - 普通文件（JSON/YAML）：**80** 字符。
    - Markdown/MDX 文档：**100** 字符。
2.  **空行规则**：
    - **Frontmatter**：`---` 后会自动添加空行。
    - **列表与代码块**：在代码块后的列表前会自动添加空行。
3.  **尾随逗号**：
    - JS/TS/Markdown 代码块：配置为 `all`，在所有可能的地方添加。
    - JSON/YAML：配置为 `es5`。
4.  **Markdown 换行**：
    - `proseWrap: "preserve"`：保持文件原本的换行风格，不强制折行。
5.  **解析器**：
    - 所有 `.md` 文件强制使用 `mdx` 解析器，以避免 JSX 注释被错误处理。

## 忽略文件

`.prettierignore` 文件中列出的文件和目录会被跳过，包括：

- `node_modules/` - 依赖
- `_site/` - Jekyll 构建输出
- `.git/` - Git 目录
- `.i18n/` 目录下的某些文件（如日志、工件）
- 配置文件（`.vscode/`, `.idea/` 等）

## Git 集成

### Pre-commit Hook

项目在 `.githooks` 中配置了提交前钩子。如果你的环境支持，可以在提交前自动运行格式化：

```bash
pnpm format:staged
```

## 相关资源

- [Prettier 官方文档](https://prettier.io/docs/en/)
- [Prettier 选项配置](https://prettier.io/docs/en/options.html)
