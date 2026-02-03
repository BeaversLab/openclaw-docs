---
summary: Node + tsx "__name is not a function" 崩溃说明与规避方案
read_when:
  - 排查仅 Node 的 dev 脚本或 watch 失败
  - 调查 OpenClaw 中 tsx/esbuild loader 崩溃
title: "Node + tsx 崩溃"
---

# Node + tsx "\_\_name is not a function" 崩溃

## 摘要

通过 Node + `tsx` 运行 OpenClaw 在启动时失败：

```
[openclaw] Failed to start CLI: TypeError: __name is not a function
    at createSubsystemLogger (.../src/logging/subsystem.ts:203:25)
    at .../src/agents/auth-profiles/constants.ts:25:20
```

此问题出现在开发脚本从 Bun 切换到 `tsx` 之后（提交 `2871657e`，2026-01-06）。相同路径在 Bun 下可运行。

## 环境

- Node：v25.x（观察到 v25.3.0）
- tsx：4.21.0
- OS：macOS（其他运行 Node 25 的平台可能也可复现）

## 复现（仅 Node）

```bash
# in repo root
node --version
pnpm install
node --import tsx src/entry.ts status
```

## 仓库内最小复现

```bash
node --import tsx scripts/repro/tsx-name-repro.ts
```

## Node 版本检查

- Node 25.3.0：失败
- Node 22.22.0（Homebrew `node@22`）：失败
- Node 24：此处尚未安装，需要验证

## 备注 / 假设

- `tsx` 使用 esbuild 转换 TS/ESM。esbuild 的 `keepNames` 会生成 `__name` helper，并用 `__name(...)` 包裹函数定义。
- 崩溃表明运行时存在 `__name` 但不是函数，说明 helper 在 Node 25 loader 路径中缺失或被覆盖。
- 其他 esbuild 使用方也出现过类似 `__name` helper 丢失/重写的问题。

## 回归历史

- `2871657e`（2026-01-06）：脚本从 Bun 切换到 tsx，使 Bun 可选。
- 在此之前（Bun 路径），`openclaw status` 与 `gateway:watch` 可用。

## 规避方案

- 使用 Bun 运行 dev 脚本（当前临时回退）。
- 使用 Node + tsc watch，再运行编译输出：
  ```bash
  pnpm exec tsc --watch --preserveWatchOutput
  node --watch openclaw.mjs status
  ```
- 本地确认：`pnpm exec tsc -p tsconfig.json` + `node openclaw.mjs status` 在 Node 25 可用。
- 如果可行，禁用 TS loader 的 esbuild keepNames（防止注入 `__name` helper）；目前 tsx 不暴露该选项。
- 测试 Node LTS（22/24）+ `tsx`，确认是否为 Node 25 特有问题。

## 参考

- https://opennext.js.org/cloudflare/howtos/keep_names
- https://esbuild.github.io/api/#keep-names
- https://github.com/evanw/esbuild/issues/1031

## 下一步

- 在 Node 22/24 复现以确认 Node 25 回归。
- 测试 `tsx` nightly 或固定到较早版本（若有已知回归）。
- 若在 Node LTS 也可复现，向上游提交最小复现与 `__name` 堆栈。
