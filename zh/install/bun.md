---
title: "Bun (Experimental)"
summary: "Bun 工作流（实验性）：安装与相对 pnpm 的注意事项"
read_when:
  - 你想要最快的本地开发循环（bun + watch）
  - 你遇到 Bun 的安装/补丁/生命周期脚本问题
---

# Bun（实验性）

目标：用 **Bun** 运行本仓库（可选，不推荐用于 WhatsApp/Telegram），
同时不偏离 pnpm 工作流。

⚠️ **不推荐用于 Gateway 运行时**（WhatsApp/Telegram 有 bug）。生产环境请用 Node。

## 状态

- Bun 可作为本地运行时，直接运行 TypeScript（`bun run …`、`bun --watch …`）。
- `pnpm` 仍是默认构建方案，完全受支持（且部分文档工具依赖它）。
- Bun 不能使用 `pnpm-lock.yaml`，会忽略该文件。

## 安装

默认：

```sh
bun install
```

注意：`bun.lock`/`bun.lockb` 已在 gitignore，因此不会产生仓库改动。如果你希望*不写锁文件*：

```sh
bun install --no-save
```

## 构建 / 测试（Bun）

```sh
bun run build
bun run vitest run
```

## Bun 生命周期脚本（默认被阻止）

Bun 可能会阻止依赖的生命周期脚本，除非显式信任（`bun pm untrusted` / `bun pm trust`）。
对本仓库来说，常见被阻止的脚本并非必须：

- `@whiskeysockets/baileys` `preinstall`：检查 Node 主版本 >= 20（我们使用 Node 22+）。
- `protobufjs` `postinstall`：会输出不兼容版本方案的警告（没有构建产物）。

如果你遇到确实需要这些脚本的运行问题，请显式信任：

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## 注意事项

- 有些脚本仍硬编码 pnpm（例如 `docs:build`、`ui:*`、`protocol:check`）。目前请用 pnpm 运行这些脚本。
