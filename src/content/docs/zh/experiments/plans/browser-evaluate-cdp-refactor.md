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
- 为 evaluate 添加进程隔离（工作进程/线程）。如果在此重构后我们仍然看到难以恢复的卡死状态，那是一个后续的构想。

## 当前架构（卡死的原因）

概括来说：

- 调用者向浏览器控制服务发送 `act:evaluate`。
- 路由处理器调用 Playwright 来执行 JavaScript。
- Playwright 会对页面命令进行序列化，因此一个永不结束的 evaluate 会阻塞队列。
- 队列卡死意味着在该标签页上后续的点击/输入/等待操作看起来会挂起。

## 建议的架构

### 1. 截止时间传播

引入单一预算概念并由此衍生出所有内容：

- 调用者设置 `timeoutMs`（或将来的某个截止时间）。
- 外部请求超时、路由处理逻辑以及页面内的执行预算都使用相同的预算，并在需要序列化开销的地方保留少量余地。
- 中止作为 `AbortSignal` 到处传播，以确保取消操作的一致性。

实施方向：

- 添加一个小型辅助程序（例如 `createBudget({ timeoutMs, signal })`），它返回：
  - `signal`：关联的 AbortSignal
  - `deadlineAtMs`：绝对截止时间
  - `remainingMs()`：子操作的剩余预算
- 在以下位置使用此辅助工具：
  - `src/browser/client-fetch.ts`（HTTP 和进程内调度）
  - `src/node-host/runner.ts`（代理路径）
  - 浏览器操作实现（Playwright 和 CDP）

### 2. 独立的 Evaluate 引擎（CDP 路径）

添加一个基于 CDP 的 evaluate 实现，该实现不共享 Playwright 的每页面命令队列。关键属性是 evaluate 传输是一个单独的 WebSocket 连接和连接到目标的一个单独的 CDP 会话。

实施方向：

- 新模块，例如 `src/browser/cdp-evaluate.ts`，它：
  - 连接到配置的 CDP 端点（浏览器级套接字）。
  - 使用 `Target.attachToTarget({ targetId, flatten: true })` 获取 `sessionId`。
  - 运行以下任一操作：
    - `Runtime.evaluate` 用于页面级评估，或
    - `DOM.resolveNode` 加上 `Runtime.callFunctionOn` 用于元素评估。
  - 超时或中止时：
    - 为会话尽最大努力发送 `Runtime.terminateExecution`。
    - 关闭 WebSocket 并返回明确的错误。

备注：

- 这仍然在页面中执行 JavaScript，因此终止可能会产生副作用。其优势在于它不会阻塞 Playwright 队列，并且可以通过杀死 CDP 会话在传输层取消操作。

### 3. Ref Story（元素定位，无需完全重写）

困难的部分是元素定位。CDP 需要 DOM 句柄或 `backendDOMNodeId`，而目前大多数浏览器操作使用基于快照中引用的 Playwright 定位器。

推荐的方法：保留现有的引用，但附加一个可选的 CDP 可解析 ID。

#### 3.1 扩展存储的引用信息

扩展存储的角色引用元数据以可选地包含 CDP ID：

- 目前：`{ role, name, nth }`
- 建议：`{ role, name, nth, backendDOMNodeId?: number }`

这使所有现有的基于 Playwright 的操作继续工作，并允许 CDP evaluate 在 `backendDOMNodeId` 可用时接受相同的 `ref` 值。

#### 3.2 在快照时填充 backendDOMNodeId

生成角色快照时：

1. 像今天一样生成现有的角色引用映射（role, name, nth）。
2. 通过 CDP (`Accessibility.getFullAXTree`) 获取 AX 树，并使用相同的重复处理规则计算 `(role, name, nth) -> backendDOMNodeId` 的并行映射。
3. 将 ID 合并回当前选项卡的存储引用信息中。

如果引用的映射失败，则保留 `backendDOMNodeId` 为未定义。这使得该功能是尽力而为的，并且可以安全地推出。

#### 3.3 带引用的 Evaluate 行为

在 `act:evaluate` 中：

- 如果 `ref` 存在并且有 `backendDOMNodeId`，则通过 CDP 运行元素评估。
- 如果存在 `ref` 但没有 `backendDOMNodeId`，则回退到 Playwright 路径（连同安全网）。

可选的逃生舱口：

- 扩展请求形状，以便高级调用者（以及调试）可以直接接受 `backendDOMNodeId`，同时保持 `ref` 作为主要接口。

### 4. 保留最后的恢复路径

即使使用 CDP evaluate，也有其他方法会使标签页或连接卡住。请保留现有的恢复机制（终止执行 + 断开 Playwright 连接）作为以下情况的最后手段：

- 旧版调用者
- 阻止 CDP 附加的环境
- 意外的 Playwright 边缘情况

## 实施计划（单次迭代）

### 交付成果

- 一个基于 CDP 的 evaluate 引擎，它在 Playwright 每页命令队列之外运行。
- 一个由调用者和处理程序一致使用的单一端到端超时/中止预算。
- Ref 元数据，可选择为元素 evaluate 携带 `backendDOMNodeId`。
- `act:evaluate` 在可能的情况下首选 CDP 引擎，在不可能时回退到 Playwright。
- 证明卡住的 evaluate 不会导致后续操作卡住的测试。
- 使失败和回退可见的日志/指标。

### 实施清单

1. 添加一个共享的“预算”助手，将 `timeoutMs` + 上游 `AbortSignal` 链接到：
   - 单个 `AbortSignal`
   - 一个绝对截止时间
   - 一个用于下游操作的 `remainingMs()` 助手
2. 更新所有调用者路径以使用该助手，使 `timeoutMs` 在任何地方都意味着相同的事情：
   - `src/browser/client-fetch.ts`（HTTP 和进程内调度）
   - `src/node-host/runner.ts`（节点代理路径）
   - 调用 `/act` 的 CLI 封装（将 `--timeout-ms` 添加到 `browser evaluate`）
3. 实施 `src/browser/cdp-evaluate.ts`：
   - 连接到浏览器级别的 CDP 套接字
   - `Target.attachToTarget` 以获取 `sessionId`
   - 运行 `Runtime.evaluate` 进行页面评估
   - 运行 `DOM.resolveNode` + `Runtime.callFunctionOn` 进行元素评估
   - 在超时/中止时：尽力执行 `Runtime.terminateExecution` 然后关闭套接字
4. 扩展存储的角色引用元数据以可选地包含 `backendDOMNodeId`：
   - 为 Playwright 操作保持现有的 `{ role, name, nth }` 行为
   - 为 CDP 元素定位添加 `backendDOMNodeId?: number`
5. 在创建快照时填充 `backendDOMNodeId`（尽力而为）：
   - 通过 CDP 获取 AX 树（`Accessibility.getFullAXTree`）
   - 计算 `(role, name, nth) -> backendDOMNodeId` 并合并到存储的引用映射中
   - 如果映射不明确或缺失，则保留 id 未定义
6. 更新 `act:evaluate` 路由：
   - 如果没有 `ref`：始终使用 CDP 评估
   - 如果 `ref` 解析为 `backendDOMNodeId`：使用 CDP 元素评估
   - 否则：回退到 Playwright 评估（仍然有界限且可中止）
7. 保留现有的“最后手段”恢复路径作为后备，而不是默认路径。
8. 添加测试：
   - 卡住的评估在预算范围内超时，随后的点击/键入操作成功
   - 中止取消评估（客户端断开连接或超时）并解除后续操作的阻塞
   - 映射失败会干净地回退到 Playwright
9. 添加可观测性：
   - 评估持续时间和超时计数器
   - terminateExecution 使用情况
   - 回退率（CDP -> Playwright）及原因

### 验收标准

- 故意挂起的 `act:evaluate` 在调用者预算范围内返回，并且不会导致
  标签页在后续操作中卡死。
- `timeoutMs` 在 CLI、agent 工具、node 代理和进程内调用中的行为一致。
- 如果 `ref` 可以映射到 `backendDOMNodeId`，元素评估使用 CDP；否则
  后备路径仍然有界限且可恢复。

## 测试计划

- 单元测试：
  - 角色引用和 AX 树节点之间的 `(role, name, nth)` 匹配逻辑。
  - 预算辅助行为（余量、剩余时间计算）。
- 集成测试：
  - CDP evaluate 超时在预算内返回，不会阻塞下一个操作。
  - 中止会取消 evaluate 并尽最大努力触发终止。
- 合约测试：
  - 确保 `BrowserActRequest` 和 `BrowserActResponse` 保持兼容。

## 风险与缓解措施

- 映射并不完美：
  - 缓解措施：尽最大努力映射，回退到 Playwright evaluate，并添加调试工具。
- `Runtime.terminateExecution` 有副作用：
  - 缓解措施：仅在超时/中止时使用，并在错误中记录该行为。
- 额外开销：
  - 缓解措施：仅在请求快照时获取 AX 树，按目标缓存，并保持 CDP 会话短暂。
- 扩展中继限制：
  - 缓解措施：当每页 Socket 不可用时使用浏览器级别的附加 API，并保留当前的 Playwright 路径作为回退。

## 未决问题

- 新引擎应配置为 `playwright`、`cdp` 还是 `auto`？
- 我们要为高级用户公开新的“nodeRef”格式，还是仅保留 `ref`？
- frame 快照和选择器范围快照应如何参与 AX 映射？
