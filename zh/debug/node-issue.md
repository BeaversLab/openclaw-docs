---
summary: Node + tsx "__name is not a function" 崩溃说明和变通方法
read_when:
  - 调试仅限 Node 的开发脚本或监视模式故障
  - 调查 OpenClaw 中的 tsx/esbuild 加载器崩溃
title: "Node + tsx Crash"
---

# Node + tsx "\_\_name is not a function" 崩溃

## 摘要

通过 Node 运行 OpenClaw 并使用 `tsx` 在启动时失败，错误如下：

```
[openclaw] Failed to start CLI: TypeError: __name is not a function
    at createSubsystemLogger (.../src/logging/subsystem.ts:203:25)
    at .../src/agents/auth-profiles/constants.ts:25:20
```

将开发脚本从 Bun 切换到 `tsx`（提交 `2871657e`，2026-01-06）后，开始出现此问题。相同的运行时路径在 Bun 下工作正常。

## 环境

- Node: v25.x (在 v25.3.0 上观察到)
- tsx: 4.21.0
- OS: macOS (在其他运行 Node 25 的平台上也可能复现)

## 复现（仅限 Node）

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

- Node 25.3.0: 失败
- Node 22.22.0 (Homebrew `node@22`): 失败
- Node 24: 此处尚未安装；需要验证

## 说明 / 假设

- `tsx` 使用 esbuild 转换 TS/ESM。esbuild 的 `keepNames` 会发出 `__name` 辅助函数，并用 `__name(...)` 包装函数定义。
- 崩溃表明 `__name` 存在但在运行时不是函数，这意味着在 Node 25 加载器路径中，该模块的辅助函数缺失或被覆盖了。
- 当辅助函数缺失或被重写时，其他 esbuild 使用者中也报告过类似的 `__name` 辅助函数问题。

## 回归历史

- `2871657e` (2026-01-06): 脚本从 Bun 更改为 tsx，以便将 Bun 设为可选。
- 在此之前（Bun 路径），`openclaw status` 和 `gateway:watch` 工作正常。

## 变通方法

- 使用 Bun 运行开发脚本（当前临时回退）。
- 使用 Node + tsc 监视模式，然后运行编译后的输出：

  ```bash
  pnpm exec tsc --watch --preserveWatchOutput
  node --watch openclaw.mjs status
  ```

- 已本地确认：`pnpm exec tsc -p tsconfig.json` + `node openclaw.mjs status` 在 Node 25 上有效。
- 如果可能，在 TS 加载器中禁用 esbuild keepNames（防止插入 `__name` 辅助函数）；tsx 目前未公开此选项。
- 使用 `tsx` 测试 Node LTS (22/24)，以查看该问题是否为 Node 25 特有。

## 参考

- [https://opennext.js.org/cloudflare/howtos/keep_names](https://opennext.js.org/cloudflare/howtos/keep_names)
- [https://esbuild.github.io/api/#keep-names](https://esbuild.github.io/api/#keep-names)
- [https://github.com/evanw/esbuild/issues/1031](https://github.com/evanw/esbuild/issues/1031)

## 后续步骤

- 在 Node 22/24 上重现以确认 Node 25 的回归。
- 如果存在已知回归，请测试 `tsx` 每夜构建版或固定到较早版本。
- 如果在 Node LTS 上重现，请使用 `__name` 堆栈跟踪向上游提交最小复现。

import en from "/components/footer/en.mdx";

<en />
