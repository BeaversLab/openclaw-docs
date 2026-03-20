---
summary: "Bun 工作流（实验性）：安装以及与 pnpm 相比的注意事项"
read_when:
  - 你想要最快的本地开发循环（bun + watch）
  - 你遇到了 Bun 安装/补丁/生命周期脚本问题
title: "Bun（实验性）"
---

# Bun（实验性）

目标：使用 **Bun** 运行此仓库（可选，不推荐用于 WhatsApp/Telegram）
同时不偏离 pnpm 工作流。

⚠️ **不推荐用于 Gateway 运行时**（WhatsApp/Telegram 存在 bug）。生产环境请使用 Node。

## 状态

- Bun 是一个可选的本地运行时，用于直接运行 TypeScript（`bun run …`，`bun --watch …`）。
- `pnpm` 是构建的默认选项，并且仍然得到完全支持（部分文档工具在使用）。
- Bun 无法使用 `pnpm-lock.yaml` 并且会忽略它。

## 安装

默认：

```sh
bun install
```

注意：`bun.lock`/`bun.lockb` 被 git 忽略了，所以无论哪种方式都不会产生仓库变动。如果你想要*不写入锁文件*：

```sh
bun install --no-save
```

## 构建 / 测试 (Bun)

```sh
bun run build
bun run vitest run
```

## Bun 生命周期脚本（默认被阻止）

Bun 可能会阻止依赖项的生命周期脚本，除非显式信任（`bun pm untrusted` / `bun pm trust`）。
对于此仓库，通常被阻止的脚本并不是必需的：

- `@whiskeysockets/baileys` `preinstall`：检查 Node 主版本 >= 20（OpenClaw 默认为 Node 24，并且仍然支持 Node 22 LTS，当前为 `22.16+`）。
- `protobufjs` `postinstall`：发出关于不兼容版本方案的警告（无构建产物）。

如果你遇到需要这些脚本的实际运行时问题，请显式信任它们：

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## 注意事项

- 某些脚本仍然硬编码了 pnpm（例如 `docs:build`，`ui:*`，`protocol:check`）。暂时请通过 pnpm 运行这些脚本。

import zh from "/components/footer/zh.mdx";

<zh />
