---
summary: "Bun 工作流（实验性）：安装以及与 pnpm 相比的注意事项"
read_when:
  - You want the fastest local dev loop (bun + watch)
  - You hit Bun install/patch/lifecycle script issues
title: "Bun（实验性）"
---

# Bun（实验性）

<Warning>
  Bun **不推荐用于网关运行时**（已知存在与 WhatsApp 和 Telegram 的问题）。生产环境请使用 Node。
</Warning>

Bun 是一个可选的本地运行时，用于直接运行 TypeScript（`bun run ...`，`bun --watch ...`）。默认的包管理器仍然是 `pnpm`，它得到完全支持并被文档工具使用。Bun 无法使用 `pnpm-lock.yaml` 并且会忽略它。

## 安装

<Steps>
  <Step title="安装依赖项">
    ```sh
    bun install
    ```

    `bun.lock` / `bun.lockb` 被 git 忽略，因此不会产生仓库变动。要完全跳过锁文件写入：

    ```sh
    bun install --no-save
    ```

  </Step>
  <Step title="构建和测试">
    ```sh
    bun run build
    bun run vitest run
    ```
  </Step>
</Steps>

## 生命周期脚本

Bun 会阻止依赖项的生命周期脚本，除非显式信任。对于此仓库，不需要那些通常被阻止的脚本：

- `@whiskeysockets/baileys` `preinstall` -- 检查 Node 主版本号是否 >= 20（OpenClaw 默认使用 Node 24，目前仍支持 Node 22 LTS，当前为 `22.14+`）
- `protobufjs` `postinstall` -- 发出关于不兼容版本方案的警告（无构建产物）

如果遇到需要这些脚本的运行时问题，请显式信任它们：

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## 注意事项

某些脚本仍然硬编码使用 pnpm（例如 `docs:build`，`ui:*`，`protocol:check`）。目前请通过 pnpm 运行这些脚本。

import zh from "/components/footer/zh.mdx";

<zh />
