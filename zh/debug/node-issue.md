---
summary: Node + tsx “__name is not a function” 崩溃的说明和解决方案
read_when:
  - Debugging Node-only dev scripts or watch mode failures
  - Investigating tsx/esbuild loader crashes in OpenClaw
title: "Node + tsx Crash"
---

# Node + tsx "__name is not a function" 崩溃

## 摘要

通过 Node 使用 `tsx` 运行 OpenClaw 在启动时失败，并出现：

```
[openclaw] Failed to start CLI: TypeError: __name is not a function
    at createSubsystemLogger (.../src/logging/subsystem.ts:203:25)
    at .../src/agents/auth-profiles/constants.ts:25:20
```

这是在将开发脚本从 Bun 切换到 `tsx` 之后开始的（提交 `2871657e`，2026-01-06）。相同的运行时路径在 Bun 下工作正常。

## 环境

- Node：v25.x（在 v25.3.0 上观察到）
- tsx：4.21.0
- OS：macOS（在其他运行 Node 25 的平台上也可能复现）

## 复现（仅 Node）

```bash
# in repo root
node --version
pnpm install
node --import tsx src/entry.ts status
```

## 仓库中的最小复现

```bash
node --import tsx scripts/repro/tsx-name-repro.ts
```

## Node 版本检查

- Node 25.3.0：失败
- Node 22.22.0 (Homebrew `node@22`)：失败
- Node 24：尚未在此处安装；需要验证

## 说明 / 假设

- `tsx` 使用 esbuild 来转换 TS/ESM。esbuild 的 `keepNames` 会发出一个 `__name` 辅助函数，并用 `__name(...)` 包装函数定义。
- 崩溃表明 `__name` 在运行时存在但不是一个函数，这意味着在 Node 25 的加载器路径中，该模块的辅助函数丢失或被覆盖了。
- 当辅助函数丢失或重写时，在其他 esbuild 使用者中也报告过类似的 `__name` 辅助函数问题。

## 回归历史

- `2871657e` (2026-01-06)：脚本从 Bun 更改为 tsx，以使 Bun 成为可选项。
- 在此之前（Bun 路径），`openclaw status` 和 `gateway:watch` 工作正常。

## 解决方案

- 使用 Bun 运行开发脚本（当前临时回退方案）。
- 使用 Node + tsc watch，然后运行编译输出：

  ```bash
  pnpm exec tsc --watch --preserveWatchOutput
  node --watch openclaw.mjs status
  ```

- 已在本地确认：`pnpm exec tsc -p tsconfig.json` + `node openclaw.mjs status` 在 Node 25 上工作正常。
- 如果可能，在 TS 加载器中禁用 esbuild keepNames（防止 `__name` 辅助函数插入）；tsx 目前未公开此选项。
- 使用 `tsx` 测试 Node LTS (22/24)，以查看该问题是否特定于 Node 25。

## 参考

- [https://opennext.js.org/cloudflare/howtos/keep_names](https://opennext.js.org/cloudflare/howtos/keep_names)
- [https://esbuild.github.io/api/#keep-names](https://esbuild.github.io/api/#keep-names)
- [https://github.com/evanw/esbuild/issues/1031](https://github.com/evanw/esbuild/issues/1031)

## 后续步骤

- 在 Node 22/24 上复现以确认 Node 25 的回归。
- 测试 `tsx` 每夜版，如果存在已知回归则锁定到早期版本。
- 如果在 Node LTS 上复现，请向上游提交一个包含 `__name` 堆栈跟踪的最小复现。

import zh from '/components/footer/zh.mdx';

<zh />
