---
summary: "Plan: isolate browser act:evaluate from Playwright queue using CDP, with end-to-end deadlines and safer ref resolution"
read_when:
  - Working on browser `act:evaluate` timeout, abort, or queue blocking issues
  - Planning CDP based isolation for evaluate execution
owner: "openclaw"
status: "draft"
last_updated: "2026-02-10"
title: "Browser Evaluate CDP Refactor"
---

# Browser Evaluate CDP Refactor Plan

## Context

`act:evaluate` executes user provided JavaScript in the page. Today it runs via Playwright
(`page.evaluate` or `locator.evaluate`). Playwright serializes CDP commands per page, so a
stuck or long running evaluate can block the page command queue and make every later action
on that tab look "stuck".

PR #13498 adds a pragmatic safety net (bounded evaluate, abort propagation, and best-effort
recovery). This document describes a larger refactor that makes `act:evaluate` inherently
isolated from Playwright so a stuck evaluate cannot wedge normal Playwright operations.

## Goals

- `act:evaluate` cannot permanently block later browser actions on the same tab.
- Timeouts are single source of truth end to end so a caller can rely on a budget.
- Abort and timeout are treated the same way across HTTP and in-process dispatch.
- Element targeting for evaluate is supported without switching everything off Playwright.
- Maintain backward compatibility for existing callers and payloads.

## Non-goals

- Replace all browser actions (click, type, wait, etc.) with CDP implementations.
- Remove the existing safety net introduced in PR #13498 (it remains a useful fallback).
- Introduce new unsafe capabilities beyond the existing `browser.evaluateEnabled` gate.
- Add process isolation (worker process/thread) for evaluate. If we still see hard to recover
  stuck states after this refactor, that is a follow-up idea.

## Current Architecture (Why It Gets Stuck)

At a high level:

- Callers send `act:evaluate` to the browser control service.
- The route handler calls into Playwright to execute the JavaScript.
- Playwright serializes page commands, so an evaluate that never finishes blocks the queue.
- A stuck queue means later click/type/wait operations on the tab can appear to hang.

## 建议的架构

### 1. 截止时间传播

引入单一预算概念并由此推导一切：

- 调用方设置 `timeoutMs`（或将来的截止时间）。
- 外部请求超时、路由处理程序逻辑以及页面内的执行预算
  全部使用同一预算，在序列化开销需要的地方预留少量余地。
- 中止作为 `AbortSignal` 在各处传播，以确保取消操作一致。

实现方向：

- 添加一个小辅助工具（例如 `createBudget({ timeoutMs, signal })`），它返回：
  - `signal`：关联的 AbortSignal
  - `deadlineAtMs`：绝对截止时间
  - `remainingMs()`：子操作的剩余预算
- 在以下位置使用此辅助工具：
  - `src/browser/client-fetch.ts`（HTTP 和进程内分派）
  - `src/node-host/runner.ts`（代理路径）
  - 浏览器操作实现（Playwright 和 CDP）

### 2. 独立的求值引擎 (CDP 路径)

添加一个基于 CDP 的求值实现，该实现不共享 Playwright 的每页命令
队列。关键属性在于求值传输是一个单独的 WebSocket 连接
和一个附加到目标的单独 CDP 会话。

实现方向：

- 新模块，例如 `src/browser/cdp-evaluate.ts`，它：
  - 连接到配置的 CDP 端点（浏览器级套接字）。
  - 使用 `Target.attachToTarget({ targetId, flatten: true })` 获取 `sessionId`。
  - 运行以下任一：
    - `Runtime.evaluate` 用于页面级求值，或
    - `DOM.resolveNode` 加上 `Runtime.callFunctionOn` 用于元素求值。
  - 发生超时或中止时：
    - 尽力为该会话发送 `Runtime.terminateExecution`。
    - 关闭 WebSocket 并返回明确的错误。

注意事项：

- 这仍然在页面中执行 JavaScript，因此终止可能会产生副作用。好处
  在于它不会卡住 Playwright 队列，并且可以通过终结 CDP 会话在传输
  层取消。

### 3. Ref 故事（无需完全重写的元素定位）

难点在于元素定位。CDP 需要 DOM 句柄或 `backendDOMNodeId`，而
目前大多数浏览器操作使用基于快照 ref 的 Playwright 定位器。

推荐方法：保留现有的 ref，但附加一个可选的 CDP 可解析 ID。

#### 3.1 扩展存储的 Ref 信息

扩展存储的角色引用元数据以可选地包含 CDP ID：

- 今天：`{ role, name, nth }`
- 提议：`{ role, name, nth, backendDOMNodeId?: number }`

这使所有现有的基于 Playwright 的操作继续工作，并允许 CDP evaluate 在 `backendDOMNodeId` 可用时接受相同的 `ref` 值。

#### 3.2 在快照时间填充 backendDOMNodeId

当生成角色快照时：

1. 像今天一样生成现有的角色引用映射（role、name、nth）。
2. 通过 CDP (`Accessibility.getFullAXTree`) 获取 AX 树，并使用相同的重复处理规则计算 `(role, name, nth) -> backendDOMNodeId` 的并行映射。
3. 将 ID 合并回当前选项卡的存储引用信息中。

如果引用的映射失败，请将 `backendDOMNodeId` 保留为未定义。这使得该功能是尽力而为的，并且可以安全地推出。

#### 3.3 使用 Ref 的 Evaluate 行为

在 `act:evaluate` 中：

- 如果存在 `ref` 并且具有 `backendDOMNodeId`，请通过 CDP 运行元素 evaluate。
- 如果存在 `ref` 但没有 `backendDOMNodeId`，则回退到 Playwright 路径（带有安全网）。

可选的逃生舱口：

- 扩展请求形状以直接接受 `backendDOMNodeId` 供高级调用者（和调试）使用，同时保持 `ref` 作为主要接口。

### 4. 保留最后手段的恢复路径

即使使用了 CDP evaluate，还有其他方法会导致选项卡或连接卡住。保留现有的恢复机制（终止执行 + 断开 Playwright 连接）作为最后手段，用于：

- 传统调用者
- CDDP 附加被阻止的环境
- 意外的 Playwright 边缘情况

## 实施计划（单次迭代）

### 交付成果

- 基于 CDP 的 evaluate 引擎，在 Playwright 每页命令队列之外运行。
- 单一端到端超时/中止预算，由调用者和处理程序一致使用。
- 可以选择携带 `backendDOMNodeId` 用于元素 evaluate 的 Ref 元数据。
- `act:evaluate` 尽可能优先使用 CDP 引擎，在不可能时回退到 Playwright。
- 证明卡住的 evaluate 不会卡住后续操作的测试。
- 使故障和回退可见的日志/指标。

### 实施清单

1. 添加一个共享的“预算”辅助工具，将 `timeoutMs` + 上游 `AbortSignal` 链接到：
   - 一个单一的 `AbortSignal`
   - 一个绝对截止时间
   - 用于下游操作的 `remainingMs()` 辅助工具
2. 更新所有调用路径以使用该辅助工具，使 `timeoutMs` 在所有地方的含义一致：
   - `src/browser/client-fetch.ts` （HTTP 和进程内调度）
   - `src/node-host/runner.ts` （节点代理路径）
   - 调用 `/act` 的 CLI 包装器（将 `--timeout-ms` 添加到 `browser evaluate`）
3. 实现 `src/browser/cdp-evaluate.ts`：
   - 连接到浏览器级 CDP 套接字
   - `Target.attachToTarget` 以获取 `sessionId`
   - 运行 `Runtime.evaluate` 进行页面评估
   - 运行 `DOM.resolveNode` + `Runtime.callFunctionOn` 进行元素评估
   - 在超时/中止时：尽力执行 `Runtime.terminateExecution` 然后关闭套接字
4. 扩展存储的角色引用元数据以可选地包含 `backendDOMNodeId`：
   - 保持 Playwright 操作现有的 `{ role, name, nth }` 行为
   - 为 CDP 元素定位添加 `backendDOMNodeId?: number`
5. 在创建快照期间填充 `backendDOMNodeId`（尽力而为）：
   - 通过 CDP 获取 AX 树（`Accessibility.getFullAXTree`）
   - 计算 `(role, name, nth) -> backendDOMNodeId` 并合并到存储的引用映射中
   - 如果映射有歧义或缺失，则保持 id 未定义
6. 更新 `act:evaluate` 路由：
   - 如果没有 `ref`：始终使用 CDP 评估
   - 如果 `ref` 解析为 `backendDOMNodeId`：使用 CDP 元素评估
   - 否则：回退到 Playwright 评估（仍有界限且可中止）
7. 将现有的“最后手段”恢复路径作为回退保留，而非默认路径。
8. 添加测试：
   - 卡住的评估在预算内超时，并且下一次点击/输入成功
   - 中止取消评估（客户端断开连接或超时）并解锁后续操作
   - 映射失败干净地回退到 Playwright
9. 添加可观测性：
   - 评估持续时间和超时计数器
   - terminateExecution 的使用情况
   - 回退率（CDP -> Playwright）及原因

### 验收标准

- 故意挂起的 `act:evaluate` 会在调用方预算内返回，且不会卡住标签页以影响后续操作。
- `timeoutMs` 在 CLI、agent 工具、node 代理和进程内调用中的行为保持一致。
- 如果 `ref` 可以映射到 `backendDOMNodeId`，元素评估将使用 CDP；否则回退路径仍有界限且可恢复。

## 测试计划

- 单元测试：
  - `(role, name, nth)` 角色引用与 AX 树节点之间的匹配逻辑。
  - 预算辅助器的行为（余量、剩余时间计算）。
- 集成测试：
  - CDP 评估超时在预算内返回且不阻塞下一个操作。
  - 中止会取消评估并尽力触发终止。
- 契约测试：
  - 确保 `BrowserActRequest` 和 `BrowserActResponse` 保持兼容。

## 风险与缓解

- 映射不完美：
  - 缓解措施：尽力映射，回退到 Playwright 评估，并添加调试工具。
- `Runtime.terminateExecution` 有副作用：
  - 缓解措施：仅在超时/中止时使用，并在错误中记录该行为。
- 额外开销：
  - 缓解措施：仅在请求快照时获取 AX 树，按目标缓存，并保持 CDP 会话短暂。
- 扩展中继限制：
  - 缓解措施：当每页套接字不可用时，使用浏览器级别的附加 API，并保留当前的 Playwright 路径作为回退。

## 未解决的问题

- 新引擎应配置为 `playwright`、`cdp` 还是 `auto`？
- 我们要为高级用户公开新的“nodeRef”格式，还是仅保留 `ref`？
- 框架快照和选择器限定范围的快照应如何参与 AX 映射？

import zh from "/components/footer/zh.mdx";

<zh />
