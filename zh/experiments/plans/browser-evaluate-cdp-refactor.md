---
summary: "计划：使用 CDP 将 browser act:evaluate 与 Playwright 队列隔离，并实现端到端截止时间和更安全的引用解析"
read_when:
  - Working on browser `act:evaluate` timeout, abort, or queue blocking issues
  - Planning CDP based isolation for evaluate execution
owner: "openclaw"
status: "草稿"
last_updated: "2026-02-10"
title: "Browser Evaluate CDP 重构"
---

# 浏览器评估 CDP 重构计划

## 背景

`act:evaluate` 在页面中执行用户提供的 JavaScript。目前它通过 Playwright 运行
(`page.evaluate` 或 `locator.evaluate`)。Playwright 会按页面序列化 CDP 命令，因此
卡住或长时间运行的 evaluate 可能会阻塞页面命令队列，并使该选项卡上的后续操作
看起来像是“卡住”了。

PR #13498 增加了一个务实的保障措施（有界的 evaluate、中止传播以及尽力而为的
恢复）。本文档描述了一个更大的重构，使 `act:evaluate` 本质上
与 Playwright 隔离，因此卡住的 evaluate 不会楔入正常的 Playwright 操作。

## 目标

- `act:evaluate` 不能永久阻塞同一选项卡上的后续浏览器操作。
- 超时是端到端的唯一事实来源，因此调用者可以依赖预算。
- 中止和超时在 HTTP 和进程内调度中被同等对待。
- 支持针对评估的元素定位，而无需将所有内容切换出 Playwright。
- 为现有调用者和有效负载保持向后兼容性。

## 非目标

- 用 CDP 实现替换所有浏览器操作（点击、输入、等待等）。
- 移除 PR #13498 中引入的现有保障措施（它仍然是一个有用的后备方案）。
- 在现有的 `browser.evaluateEnabled` 门控之外引入新的不安全功能。
- 为评估添加进程隔离（工作进程/线程）。如果我们在此重构后仍然看到难以恢复
  的卡住状态，那是后续的想法。

## 当前架构（为什么会卡住）

从宏观上看：

- 调用者向浏览器控制服务发送 `act:evaluate`。
- 路由处理程序调用 Playwright 来执行 JavaScript。
- Playwright 对页面命令进行序列化，因此一个永不结束的评估会阻塞队列。
- 队列卡住意味着标签页上随后的点击/输入/等待操作可能会挂起。

## 建议架构

### 1. 截止时间传播

引入单一预算概念并由此衍生出所有内容：

- 调用者设置 `timeoutMs`（或将截止时间设置在未来）。
- 外部请求超时、路由处理逻辑以及页面内的执行预算
  均使用相同的预算，并在必要时为序列化开销预留少量余地。
- 中止在各处作为 `AbortSignal` 传播，以确保取消操作的一致性。

实施方向：

- 添加一个小辅助函数（例如 `createBudget({ timeoutMs, signal })`），它返回：
  - `signal`：关联的 AbortSignal
  - `deadlineAtMs`：绝对截止时间
  - `remainingMs()`：子操作的剩余预算
- 在以下位置使用此辅助工具：
  - `src/browser/client-fetch.ts`（HTTP 和进程内分派）
  - `src/node-host/runner.ts`（代理路径）
  - 浏览器操作实现（Playwright 和 CDP）

### 2. 独立的评估引擎（CDP 路径）

添加一个基于 CDP 的评估实现，它不共享 Playwright 的每页命令
队列。关键属性在于评估传输是一个单独的 WebSocket 连接
和一个附加到目标的单独 CDP 会话。

实施方向：

- 新模块，例如 `src/browser/cdp-evaluate.ts`，它：
  - 连接到配置的 CDP 端点（浏览器级别的 socket）。
  - 使用 `Target.attachToTarget({ targetId, flatten: true })` 获取 `sessionId`。
  - 运行以下任一操作：
    - 针对页面级别评估运行 `Runtime.evaluate`，或
    - 针对元素评估运行 `DOM.resolveNode` 加上 `Runtime.callFunctionOn`。
  - 发生超时或中止时：
    - 尽最大努力为该会话发送 `Runtime.terminateExecution`。
    - 关闭 WebSocket 并返回明确的错误。

备注：

- 这仍然在页面中执行 JavaScript，因此终止可能会产生副作用。其好处
  在于它不会卡住 Playwright 队列，并且可以通过销毁 CDP 会话在传输
  层级取消。

### 3. Ref Story（无需全面重写的元素定位）

困难的部分是元素定位。CDP 需要 DOM 句柄或 `backendDOMNodeId`，而目前大多数浏览器操作使用的是基于快照引用的 Playwright 定位器。

推荐方法：保留现有引用，但附加一个可选的 CDP 可解析 ID。

#### 3.1 扩展存储的引用信息

扩展存储的角色引用元数据以可选地包含 CDP ID：

- 目前：`{ role, name, nth }`
- 建议：`{ role, name, nth, backendDOMNodeId?: number }`

这保持了所有现有的基于 Playwright 的操作正常工作，并允许 CDP 评估在 `backendDOMNodeId` 可用时接受相同的 `ref` 值。

#### 3.2 在快照时填充 backendDOMNodeId

生成角色快照时：

1. 像现在一样生成现有的角色引用映射（role、name、nth）。
2. 通过 CDP 获取 AX 树 (`Accessibility.getFullAXTree`) 并计算一个并行映射
   `(role, name, nth) -> backendDOMNodeId`，使用相同的重复处理规则。
3. 将该 ID 合并回当前选项卡的存储引用信息中。

如果引用的映射失败，则保留 `backendDOMNodeId` 为未定义。这使得该特性是尽力而为的，并且可以安全地推出。

#### 3.3 使用引用的 Evaluate 行为

在 `act:evaluate` 中：

- 如果 `ref` 存在并且具有 `backendDOMNodeId`，则通过 CDP 运行元素评估。
- 如果 `ref` 存在没有 `backendDOMNodeId`，则回退到 Playwright 路径（并附带
  安全网）。

可选的逃生舱口：

- 扩展请求形状，以允许高级调用者直接接受 `backendDOMNodeId`（并
  用于调试），同时保持 `ref` 作为主要接口。

### 4. 保留最后的恢复路径

即使使用了 CDP evaluate，仍然有其他方法会导致选项卡或连接卡死。保留现有的恢复机制（终止执行 + 断开 Playwright 连接）作为最后的手段，用于：

- 旧版调用者
- 阻止 CDP 附加的环境
- 意外的 Playwright 边缘情况

## 实施计划（单次迭代）

### 交付成果

- 一个基于 CDP 的 evaluate 引擎，它在 Playwright 每页命令队列之外运行。
- 调用者和处理程序一致使用的单一端到端超时/中止预算。
- Ref 元数据，可选择为元素评估携带 `backendDOMNodeId`。
- `act:evaluate` 在可能的情况下优先使用 CDP 引擎，在不可能时回退到 Playwright。
- 证明卡住的评估不会阻塞后续操作的测试。
- 使故障和回退可见的日志/指标。

### 实施清单

1. 添加一个共享的“预算”辅助工具，将 `timeoutMs` + 上游 `AbortSignal` 链接到：
   - 单个 `AbortSignal`
   - 绝对截止时间
   - 用于下游操作的 `remainingMs()` 辅助工具
2. 更新所有调用者路径以使用该辅助工具，以便 `timeoutMs` 在各处含义相同：
   - `src/browser/client-fetch.ts`（HTTP 和进程内调度）
   - `src/node-host/runner.ts`（节点代理路径）
   - 调用 `/act` 的 CLI 包装器（将 `--timeout-ms` 添加到 `browser evaluate`）
3. 实现 `src/browser/cdp-evaluate.ts`：
   - 连接到浏览器级 CDP 套接字
   - `Target.attachToTarget` 以获取 `sessionId`
   - 运行 `Runtime.evaluate` 进行页面评估
   - 运行 `DOM.resolveNode` + `Runtime.callFunctionOn` 进行元素评估
   - 超时/中止时：尽力而为 `Runtime.terminateExecution` 然后关闭套接字
4. 扩展存储的角色引用元数据以可选地包含 `backendDOMNodeId`：
   - 为 Playwright 操作保留现有的 `{ role, name, nth }` 行为
   - 为 CDP 元素定位添加 `backendDOMNodeId?: number`
5. 在快照创建期间填充 `backendDOMNodeId`（尽力而为）：
   - 通过 CDP 获取 AX 树（`Accessibility.getFullAXTree`）
   - 计算 `(role, name, nth) -> backendDOMNodeId` 并合并到存储的引用映射中
   - 如果映射不明确或缺失，则将 id 留空
6. 更新 `act:evaluate` 路由：
   - 如果没有 `ref`：始终使用 CDP 评估
   - 如果 `ref` 解析为 `backendDOMNodeId`：使用 CDP 元素评估
   - 否则：回退到 Playwright 评估（仍然有界且可中止）
7. 将现有的“最后手段”恢复路径保留为回退方案，而不是默认路径。
8. 添加测试：
   - 受阻的 evaluate 在预算内超时，且下一次点击/输入成功
   - 中止取消 evaluate（客户端断开连接或超时）并解除对后续操作的阻塞
   - 映射失败时回退到 Playwright
9. 添加可观测性：
   - evaluate 持续时间和超时计数器
   - terminateExecution 的使用情况
   - 回退率 (CDP -> Playwright) 及原因

### 验收标准

- 故意挂起的 `act:evaluate` 在调用者预算内返回，且不会卡住
  标签页以进行后续操作。
- `timeoutMs` 在 CLI、代理工具、节点代理和进程内调用中的行为一致。
- 如果 `ref` 可以映射到 `backendDOMNodeId`，则元素评估使用 CDP；否则
  回退路径仍然是有界的且可恢复的。

## 测试计划

- 单元测试：
  - `(role, name, nth)` 角色引用与 AX 树节点之间的匹配逻辑。
  - 预算助手行为（剩余空间、剩余时间计算）。
- 集成测试：
  - CDP evaluate 超时在预算内返回且不会阻塞下一个操作。
  - 中止取消 evaluate 并尽力触发终止。
- 契约测试：
  - 确保 `BrowserActRequest` 和 `BrowserActResponse` 保持兼容。

## 风险与缓解措施

- 映射并不完美：
  - 缓解措施：尽力映射，回退到 Playwright evaluate，并添加调试工具。
- `Runtime.terminateExecution` 具有副作用：
  - 缓解措施：仅在超时/中止时使用，并在错误中记录该行为。
- 额外开销：
  - 缓解措施：仅在请求快照时获取 AX 树，按目标缓存，并保持
    CDP 会话短暂。
- 扩展中继限制：
  - 缓解措施：当每页套接字不可用时，使用浏览器级别的附加 API，并
    将当前的 Playwright 路径作为回退。

## 未决问题

- 新引擎是否应该可配置为 `playwright`、`cdp` 或 `auto`？
- 我们要为高级用户公开新的“nodeRef”格式，还是仅保留 `ref`？
- 框架快照和选择器限定快照应如何参与 AX 映射？

import zh from '/components/footer/zh.mdx';

<zh />
