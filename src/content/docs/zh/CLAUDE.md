# 文档指南

此目录负责文档编写、Mintlify 链接规则以及文档国际化 (i18n) 政策。

## Mintlify 规则

- 文档托管在 Mintlify (`https://docs.openclaw.ai`) 上。
- `docs/**/*.md` 中的内部文档链接必须保持根相对路径，且不带 `.md` 或 `.mdx` 后缀（例如：`[Config](/configuration)`）。
- 章节交叉引用应在根相对路径上使用锚点（例如：`[Hooks](/configuration#hooks)`）。
- 文档标题应避免使用破折号和撇号，因为 Mintlify 在这些情况下的锚点生成比较脆弱。
- README 和其他 GitHub 渲染的文档应保留绝对文档 URL，以便在 Mintlify 之外链接也能正常工作。
- 文档内容必须保持通用：不得包含个人设备名称、主机名或本地路径；请使用像 `user@gateway-host` 这样的占位符。

## 文档内容规则

- 对于文档、UI 文本和选择器列表，除非章节明确描述了运行时顺序或自动检测顺序，否则请按字母顺序排列服务/提供商。
- 捆绑插件的命名应与根目录 `AGENTS.md` 中的仓库级插件术语规则保持一致。

## 文档国际化 (i18n)

- 外语文档不在此仓库中维护。生成的发布输出位于单独的 `openclaw/docs` 仓库中（通常在本地克隆为 `../openclaw-docs`）。
- 请勿在此处的 `docs/<locale>/**` 下添加或编辑本地化文档。
- 应将此仓库中的英文文档和术语表文件视为事实来源。
- 流程：在此处更新英文文档，根据需要更新 `docs/.i18n/glossary.<locale>.json`，然后让发布仓库同步和 `scripts/docs-i18n` 在 `openclaw/docs` 中运行。
- 在重新运行 `scripts/docs-i18n` 之前，请为任何必须保留英文或使用固定翻译的新技术术语、页面标题或简短导航标签添加术语表条目。
- `pnpm docs:check-i18n-glossary` 是更改后的英文文档标题和简短内部文档标签的守护检查。
- 翻译记忆库存在于发布仓库中生成的 `docs/.i18n/*.tm.jsonl` 文件中。
- 参见 `docs/.i18n/README.md`。
