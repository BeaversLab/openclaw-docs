---
summary: "Bun 工作流（实验性）：与 pnpm 相比的安装方法和注意事项"
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

- Bun 是一个可选的本地运行时，用于直接运行 TypeScript（`bun run …`，`bun --watch …`）。
- `pnpm` 是构建的默认选项，仍获得完全支持（并被某些文档工具使用）。
- Bun 无法使用 `pnpm-lock.yaml` 并且会忽略它。

## 安装

默认：

```sh
bun install
```

注意：`bun.lock`/`bun.lockb` 被 git 忽略了，因此无论哪种方式都不会导致仓库的变动。如果您想要_不写入 lockfile_：

```sh
bun install --no-save
```

## 构建 / 测试 (Bun)

```sh
bun run build
bun run vitest run
```

## Bun 生命周期脚本（默认阻止）

除非被显式信任（`bun pm untrusted` / `bun pm trust`），否则 Bun 可能会阻止依赖项的生命周期脚本。
对于此仓库，通常被阻止的脚本并不是必需的：

- `@whiskeysockets/baileys` `preinstall`：检查 Node 主版本号 >= 20（OpenClaw 默认为 Node 24 且仍支持 Node 22 LTS，当前为 `22.16+`）。
- `protobufjs` `postinstall`：针对不兼容的版本方案发出警告（无构建产物）。

如果您遇到需要这些脚本的实际运行时问题，请显式信任它们：

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## 注意事项

- 某些脚本仍然硬编码 pnpm（例如 `docs:build`、`ui:*`、`protocol:check`）。请暂时通过 pnpm 运行这些脚本。
