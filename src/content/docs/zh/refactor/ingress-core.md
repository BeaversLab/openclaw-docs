---
summary: "将重复的渠道入口胶水代码移入核心的删除优先计划。"
read_when:
  - Auditing why the channel ingress refactor added too much code
  - Moving route, command, event, activation, or access-group policy from bundled plugins into core
  - Reviewing whether a channel ingress helper actually deletes bundled plugin code
title: "Ingress 核心删除计划"
sidebarTitle: "Ingress 核心删除"
---

# Ingress 核心删除计划

当入口重构增加了数千行净代码时，它是不健康的。只有当打包插件的成品代码变得更少，且旧的第三方 SDK 兼容性被隔离到 SDK/核心适配层时，核心集中化才有意义。

期望的运行时形态：

```text
bundled plugin event
  -> extract platform facts locally
  -> resolve shared ingress once when facts are available
  -> branch on generic ingress projections/outcomes
  -> perform platform side effects locally

old third-party helper
  -> SDK compatibility shim
  -> shared ingress-compatible projection where possible
  -> old return shape preserved
```

打包插件不应将入口重新转换回本地 `AccessResult`、
`GroupAccessDecision`、`CommandAuthDecision`、`DmCommandAccess` 或
`{ allowed, reasonCode }` 形态，除非该类型是公共插件 API。

## 预算

基于与 `origin/main` 的 PR 合并基线进行测量，包括未跟踪的文件。

```text
merge-base            1671e7532adb

current:
core production       +3,922 / -546    = +3,376
docs                  +601 / -17       = +584
other                 +145 / -2        = +143
plugin production     +4,148 / -5,388  = -1,240
tests                 +2,326 / -2,414  = -88
total                 +11,142 / -8,367 = +2,775

required:
plugin production     <= -1,500
core production       <= +1,500, or paid for by larger plugin deletion
tests                 <= +1,000
total                 <= +2,000

stretch:
plugin production     <= -2,500
core production       <= +1,200
total                 <= 0
```

最低剩余清理量：

```text
plugin production     needs 260 more net deleted lines
total                 needs 775 more net deleted lines
core production       still +1,876 over standalone budget, unless paid down by plugin deletion
```

仅删除注释不算作清理。之前的预算通过过于宽松，因为它包括了恢复的 QQBot 解释性注释；本文档仅跟踪可执行/文档/测试代码的移动。

在每次清理浪潮后重新测量：

```sh
base=$(git merge-base HEAD origin/main)
git diff --shortstat "$base"
git diff --numstat "$base" -- src/channels/message-access src/plugin-sdk extensions | sort -nr -k1 | head -n 80
pnpm lint:extensions:no-deprecated-channel-access
```

## 诊断

第一阶段添加了共享入口内核，然后在旁边留下了过多的插件本地授权：

```text
platform facts
  -> shared ingress state and decision
  -> plugin-local DTO or legacy projection
  -> plugin-local if/else ladder
```

这重复了模型。核心成品代码增加了约 3,376 行，而打包插件成品代码减少了 1,240 行。这比第一阶段要好，但它并未达到最低预算。修复方法仍然是删除优先：

- 删除仅重命名字段的插件 DTO
- 删除仅断言包装器形态的测试
- 仅当同一个补丁删除打包插件代码时才添加核心辅助函数
- 仅将旧的 SDK 兼容性保留在 SDK/核心适配层中
- 在删除包装器暴露出稳定形态后重新打包核心

## 热点

仍然需要缩减的正面打包成品文件：

```text
extensions/telegram/src/ingress.ts                        +126
extensions/discord/src/monitor/dm-command-auth.ts         +101
extensions/signal/src/monitor/access-policy.ts             +92
extensions/feishu/src/policy.ts                            +85
extensions/slack/src/monitor/auth.ts                       +64
extensions/googlechat/src/monitor-access.ts                +59
extensions/nextcloud-talk/src/inbound.ts                   +51
extensions/matrix/src/matrix/monitor/access-state.ts       +49
extensions/irc/src/inbound.ts                              +44
extensions/imessage/src/monitor/inbound-processing.ts      +36
extensions/qa-channel/src/inbound.ts                       +34
extensions/qqbot/src/bridge/sdk-adapter.ts                 +33
extensions/tlon/src/monitor/utils.ts                       +30
extensions/twitch/src/access-control.ts                    +22
extensions/qqbot/src/engine/commands/slash-command-handler.ts +20
extensions/telegram/src/bot-handlers.runtime.ts            +19
```

该分支尚未达到最低预算。剩余的审查相关工作应在添加另一个核心抽象之前，删除重复的授权流程、脚手架或包装器测试。

## 当前代码审查

健康的核心接缝已经存在于 `src/channels/message-access/runtime.ts` 中：它拥有身份适配器、有效允许列表、配对存储读取、路由描述符、命令/事件预设、访问组以及最终解析的 `ResolvedChannelMessageIngress` 投影。

剩余的增长主要是在该接缝之上分层添加的插件胶水代码：

- `extensions/telegram/src/ingress.ts` 将核心决策包装在 Telegram 特定的命令/事件辅助器中，然后调用站点仍然传递预先计算的标准化的允许列表和所有者列表。
- `extensions/discord/src/monitor/dm-command-auth.ts`、`extensions/feishu/src/policy.ts`、`extensions/googlechat/src/monitor-access.ts` 和 `extensions/matrix/src/matrix/monitor/access-state.ts` 仍在入口旁边保留本地策略 DTO 或遗留决策名称。
- `extensions/signal/src/monitor/access-policy.ts` 正确地将 Signal 身份规范化和配对回复保留在本地，但仍然有一个包装接缝，该接缝应该折叠为直接入口消费。
- `extensions/nextcloud-talk/src/inbound.ts`、`extensions/irc/src/inbound.ts`、`extensions/qa-channel/src/inbound.ts`、`extensions/zalo/src/monitor.ts` 和 `extensions/zalouser/src/monitor.ts` 仍然重复路由/信封/轮次组装，这些可以移动到入口内核之外的共享轮次辅助器。

结论：只有当将更多代码移入核心能在同一个补丁中删除这些插件包装层时，才是有用的。在保留包装返回值的同时添加另一个抽象，是重复了这个错误。

## 边界

核心拥有通用策略：

- 允许列表规范化和匹配
- 访问组扩展和诊断
- 配对存储私信允许列表读取
- 路由、发送者、命令、事件和激活门控
- 准入映射：分发、丢弃、跳过、观察、配对
- 编辑状态、决策、诊断和 SDK 兼容性投影
- 可重用的通用描述符，用于身份、路由、命令、事件、激活和结果

插件拥有传输事实和副作用：

- webhook/socket/request 真实性
- 平台身份提取和 API 查找
- 渠道特定的策略默认值
- 配对挑战传递、回复、确认、反应、输入状态、媒体、历史记录、设置、诊断、状态、日志和面向用户的副本

核心必须保持与渠道无关：在 DiscordSlackTelegramMatrixAPI`src/channels/message-access` 中不允许出现 Discord、Slack、Telegram、Matrix、room、guild、space、API 客户端或特定于插件的默认值。

## 验收规则

每个新的核心辅助工具必须立即删除捆绑的插件生产代码。

```text
one bundled caller        reject; keep plugin-local
two bundled callers       accept only if plugin production LOC drops
three or more callers     plugin deletion must be at least 2x new core LOC
compatibility-only helper SDK/core shim only; never bundled hot paths
```

如果出现以下情况，请停止并重新设计：

- 插件生产代码行数增加
- 测试代码的增长速度超过生产代码的缩减速度
- 捆绑的热路径返回一个仅重命名 `ResolvedChannelMessageIngress` 的 DTO
- 核心辅助工具需要渠道 ID、平台对象、API 客户端或特定于渠道的默认值

## 工作包

1. 冻结预算。
   在 PR 中放入代码行数（LOC），保持 deprecated-ingress lint 检查通过，并在清理提交中包含前后的 LOC。

2. 删除单薄的 DTO 接缝。
   直接用 `ResolvedChannelMessageIngress`、
   `senderAccess`、`commandAccess`、`routeAccess` 或 `ingress`TelegramSlackDiscordSignalMatrixiMessageTlon 替换插件本地的包装器返回值。首先从
   QQBot、Telegram、Slack、Discord、Signal、Feishu、Matrix、iMessage 和
   Tlon 开始。删除包装器形状的测试；保留行为测试。

3. 仅在删除代码时添加结果分类。
   通用分类器可以暴露 `dispatch`、`pairing-required`、
   `skip-activation`、`drop-command`、`drop-route`、`drop-sender` 和
   `drop-ingress`。它必须派生自决策图，而不是原因字符串，
   并且必须在同一个补丁中迁移至少三个插件。

4. 仅在删除代码时添加路由描述符构建器。
   只有在通用路由目标和路由发送器辅助工具能够立即缩减路由繁重的插件时才可接受：Google Chat、IRC、Microsoft Teams、
   Nextcloud Talk、Mattermost、Slack、Zalo 和 Zalo Personal。

5. 仅在删除时添加命令/事件预设。
   集中文本命令、原生命令、回调和源主体形状。
   当未运行命令网关时，命令消费者必须默认为未经授权；
   事件不得启动配对。

6. 仅在其能减少样板代码的地方添加身份预设。
   稳定 ID、稳定 ID 加别名、电话/E164 和多标识符辅助函数
   仅在原始值仅进入适配器输入且编辑后的状态保持
   不透明 ID/计数时才被允许。

7. 共享授权轮次组装。
   在入口内核之外，从 QA 渠道、IRC、Nextcloud Talk、Zalo 和 Zalo Personal 中
   移除重复的路由/信封/上下文/回复
   脚手架。核心可以拥有路由/会话/信封/调度排序；插件保留
   传递和特定于渠道的上下文。

8. 隔离兼容性。
   已弃用的 SDK 辅助函数保持源代码兼容，但捆绑的热路径不得
   导入已弃用的入口或命令授权外观。兼容性测试应
   使用假的第三方插件，而不是捆绑插件的内部结构。

9. 重新打包核心。
   删除包装器后，折叠一次性模块，移除未使用的导出，将
   兼容性投影移出热路径，并保留针对身份、
   路由、命令/事件、激活、访问组和兼容性垫片的专注测试。

## 删除阶段

按顺序运行这些操作。每个阶段都必须降低捆绑的生产代码行数。

1. 包装器折叠，预计插件增量：-400 到 -600。
   用直接从 `ResolvedChannelMessageIngress` 读取的方式
   替换插件本地的 `resolveXAccess`、`resolveXCommandAccess` 和
   `accessFromIngress` 结果类型。首要目标：Discord 私信命令授权、
   飞书策略、Matrix 访问状态、Telegram 入口、Signal 访问策略、
   QQBot SDK 适配器。

2. 共享结果辅助函数，预计插件增量：-200 到 -350。
   仅当一个通用分类器能删除至少三个插件中重复的
   `shouldBlockControlCommand`、配对、激活跳过、路由阻塞和发送者
   阻塞阶梯时，才添加它。

3. 路由描述符构建器，预期插件增量：-200 至 -350。
   将重复的路由目标和路由发送器描述符组装移至核心辅助程序。
   首要目标：Google Chat、IRC、Microsoft Teams、Nextcloud Talk、
   Mattermost、Slack、Zalo、Zalo Personal。

4. Turn 组装共享，预期插件增量：-250 至 -450。
   为简单的入站插件使用通用的路由/会话/信封/分发序列。
   首要目标：QA 渠道、IRC、Nextcloud Talk、Zalo、Zalo Personal。

5. 核心重新打包，预期核心增量：-300 至 -700。
   在插件直接使用运行时投影后，删除一次性使用的模块，
   将微小的文件合并回 `runtime.ts` 或专注于同类的文件，
   并将 SDK 兼容性文件与打包的热路径分离。

6. 测试修剪，预期测试增量：-300 至 -600。
   删除仅断言已移除包装器形状的测试。保留针对
   命令拒绝、组回退、源-主题匹配、激活跳过、
   访问组、配对和编辑的行为测试。

这些阶段之后的预期最小落地形态：

```text
plugin production     <= -1,500
core production       about +1,800 to +2,200 before final repack
tests                 <= +500
total                 <= +2,000
```

## 不要移动

不要移动平台配置默认值、设置 UX、doctor/fix 副本、API 查找、
Slack 所有者在线状态检查、Matrix 别名/验证处理、Telegram
回调解析、命令语法解析、原生命令注册、反应
负载解析、配对回复、命令回复、确认、输入、媒体、历史记录
或日志。

## 验证

有针对性的本地循环：

```sh
pnpm lint:extensions:no-deprecated-channel-access
pnpm test src/channels/message-access/message-access.test.ts src/plugin-sdk/channel-ingress-runtime.test.ts src/plugin-sdk/access-groups.test.ts
pnpm test extensions/<changed-plugin>/src/...
pnpm plugin-sdk:api:check
pnpm config:docs:check
pnpm check:docs
git diff --check
```

一旦代码行（LOC）趋势在预算范围内，使用 Testbox 进行广泛的变更门控/全套证明。

每个工作包记录：

- 按类别分类的之前/之后代码行数（LOC）
- 已删除的插件包装器
- 新的核心辅助程序代码行数（如有）
- 运行的目标测试
- 剩余的热点列表

## 退出标准

- 打包的生产代码导入不再包含已弃用的渠道访问或命令认证外观
- 兼容性代码被隔离到 SDK/core 接缝中
- 打包的插件直接消费入口投影或通用结果
- 插件生产代码行数（LOC）相对于 `origin/main` 至少净减少 1,500 行
- 核心生产代码行数 <= +1,500，或者任何超出部分都有对应的抵偿，且总量保持 <= +2,000
- 代表性测试覆盖了编辑、路由、命令/事件、激活、访问组以及渠道特定的回退行为
