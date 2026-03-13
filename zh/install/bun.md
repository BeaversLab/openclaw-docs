---
summary: "Bun 工作流（实验性）：安装以及与 pnpm 相比的注意事项"
read_when:
  - You want the fastest local dev loop (bun + watch)
  - You hit Bun install/patch/lifecycle script issues
title: "Bun（实验性）"
---

# Bun（实验性）

目标：使用 **Bun** 运行此仓库（可选，不推荐用于 WhatsApp/Telegram）
同时不偏离 pnpm 的工作流。

⚠️ **不推荐用于 Gateway 运行时**（存在 WhatsApp/Telegram 错误）。生产环境请使用 Node。

## 状态

- Bun 是一个可选的本地运行时，用于直接运行 TypeScript (`bun run …`, `bun --watch …`)。
- `pnpm` 是构建的默认选择，仍然得到完全支持（并被一些文档工具使用）。
- Bun 无法使用 `pnpm-lock.yaml` 并且会将其忽略。

## 安装

默认：

```sh
bun install
```

注意：`bun.lock`/`bun.lockb` 被 git 忽略了，所以无论哪种方式都不会产生仓库变动。如果您想要 _不写入锁文件_：

```sh
bun install --no-save
```

## 构建 / 测试 (Bun)

```sh
bun run build
bun run vitest run
```

## Bun 生命周期脚本（默认阻止）

除非显式受信任（`bun pm untrusted` / `bun pm trust`），否则 Bun 可能会阻止依赖项生命周期脚本。
对于此仓库，通常被阻止的脚本并不是必需的：

- `@whiskeysockets/baileys` `preinstall`：检查 Node 主版本 >= 20（OpenClaw 默认使用 Node 24 并且仍然支持 Node 22 LTS，目前为 `22.16+`）。
- `protobufjs` `postinstall`：发出关于不兼容版本方案的警告（无构建产物）。

如果您遇到需要这些脚本的实际运行时问题，请显式信任它们：

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## 注意事项

- 某些脚本仍然硬编码了 pnpm（例如 `docs:build`, `ui:*`, `protocol:check`）。请暂时通过 pnpm 运行这些脚本。

import zh from '/components/footer/zh.mdx';

<zh />
