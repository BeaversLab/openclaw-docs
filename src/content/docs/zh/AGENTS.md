# 文档指南

此目录负责文档编写、Mintlify 链接规则以及文档国际化策略。

## Mintlify 规则

- 文档托管于 Mintlify (`https://docs.openclaw.ai`)。
- `docs/**/*.md` 中的内部文档链接必须保持相对于根目录，且不带 `.md` 或 `.mdx` 后缀（例如：`[Config](/configuration)`）。
- 章节交叉引用应使用相对于根目录路径的锚点（例如：`[Hooks](/configuration#hooks)`）。
- 文档标题应避免使用破折号和撇号，因为 Mintlify 的锚点生成在这些情况下比较脆弱。
- README 和其他 GitHub 渲染的文档应保留绝对的文档 URL，以便在 Mintlify 之外链接也能正常工作。
- 文档内容必须保持通用：不包含个人设备名称、主机名或本地路径；请使用像 `user@gateway-host` 这样的占位符。

## 文档内容规则

- 对于文档、UI 副本和选择器列表，除非该章节明确描述了运行时顺序或自动检测顺序，否则应按字母顺序排列服务/提供商。
- 捆绑插件命名应与根目录 `AGENTS.md` 中全仓库范围的插件术语规则保持一致。

## 文档国际化

- 外语文档不在此仓库中维护。生成的发布输出位于单独的 `openclaw/docs` 仓库中（通常在本地克隆为 `../openclaw-docs`）。
- 请勿在此处 `docs/<locale>/**` 下添加或编辑本地化文档。
- 应将此仓库中的英语文档和术语表文件视为事实来源。
- 流程：在此处更新英语文档，根据需要更新 `docs/.i18n/glossary.<locale>.json`，然后让发布仓库同步和 `scripts/docs-i18n` 在 `openclaw/docs` 中运行。
- 在重新运行 `scripts/docs-i18n` 之前，请为任何必须保留英语或使用固定翻译的新技术术语、页面标题或简短导航标签添加术语表条目。
- `pnpm docs:check-i18n-glossary` 是更改英语文档标题和简短内部文档标签的守卫。
- 翻译记忆库位于发布仓库中生成的 `docs/.i18n/*.tm.jsonl` 文件中。
- 请参阅 `docs/.i18n/README.md`。
