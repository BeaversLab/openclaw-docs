---
summary: "Node + tsx \"__name is not a function\" 崩溃说明和变通方法"
read_when:
  - "调试仅 Node 的开发脚本或监视模式失败"
  - "调查 OpenClaw 中的 tsx/esbuild 加载器崩溃"
title: "Node + tsx 崩溃"
---

# Node + tsx "\_\_name is not a function" 崩溃

## 概要

通过 Node 使用 `tsx` 运行 OpenClaw 在启动时失败并出现：

```
[openclaw] Failed to start CLI: TypeError: __name is not a function
    at createSubsystemLogger (.../src/logging/subsystem.ts:203:25)
    at .../src/agents/auth-profiles/constants.ts:25:20
```

这是在将开发脚本从 Bun 切换到 `tsx` 之后开始的（提交 `2871657e`，2026-01-06）。相同的运行时路径在 Bun 中有效。

## 环境

- Node：v25.x（在 v25.3.0 上观察到）
- tsx：4.21.0
- 操作系统：macOS（在其他运行 Node 25 的平台上也可能重现）

## 重现（仅 Node）

```bash
# in repo root
node --version
pnpm install
node --import tsx src/entry.ts status
```

## 仓库中的最小重现

```bash
node --import tsx scripts/repro/tsx-name-repro.ts
```

## Node 版本检查

- Node 25.3.0：失败
- Node 22.22.0（Homebrew `node@22`）：失败
- Node 24：尚未在此处安装；需要验证

## 说明 / 假设

- `tsx` 使用 esbuild 来转换 TS/ESM。esbuild 的 `keepNames` 发出 `__name` 辅助函数，并用 `__name(...)` 包装函数定义。
- 崩溃表明 `__name` 存但在运行时不是函数，这意味着在 Node 25 加载器路径中，该模块缺少或覆盖了辅助函数。
- 在其他 esbuild 消费者中，当缺少或重写辅助函数时，已报告了类似的 `__name` 辅助函数问题。

## 回归历史

- `2871657e`（2026-01-06）：脚本从 Bun 更改为 tsx 以使 Bun 成为可选。
- 在此之前（Bun 路径），`openclaw status` 和 `gateway:watch` 工作正常。

## 变通方法

- 使用 Bun 进行开发脚本（当前临时回退）。
- 使用 Node + tsc watch，然后运行编译输出：
  ```bash
  pnpm exec tsc --watch --preserveWatchOutput
  node --watch openclaw.mjs status
  ```
- 本地确认：`pnpm exec tsc -p tsconfig.json` + `node openclaw.mjs status` 在 Node 25 上有效。
- 如果可能，在 TS 加载器中禁用 esbuild keepNames（防止 `__name` 辅助函数插入）；tsx 目前不公开此选项。
- 使用 `tsx` 测试 Node LTS（22/24），以查看问题是否是 Node 25 特有的。

## 参考

- https://opennext.js.org/cloudflare/howtos/keep_names
- https://esbuild.github.io/api/#keep-names
- https://github.com/evanw/esbuild/issues/1031

## 后续步骤

- 在 Node 22/24 上重现以确认 Node 25 的回归。
- 测试 `tsx` nightly 或固定到早期版本（如果存在已知的回归）。
- 如果在 Node LTS 上重现，请使用 `__name` 堆栈跟踪向上游提交最小重现。
