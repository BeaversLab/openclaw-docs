---
summary: "Gateway(网关)Gateway(网关) 客户端的操作员角色、作用域以及审批时检查"
read_when:
  - Debugging missing operator scope errors
  - Reviewing device or node pairing approvals
  - Adding or classifying Gateway RPC methods
title: "操作员作用域"
---

操作员作用域定义了 Gateway(网关) 客户端在通过身份验证后可以执行的操作。
它们是一个受信任的 Gateway(网关) 操作员域内的控制平面护栏，
而非针对敌对多租户的隔离机制。如果您需要在
人员、团队或机器之间实现严格的分离，请在不同的操作系统用户或
主机下运行单独的 Gateway(网关)。

相关内容：[安全性](</en/gateway/securityGateway(网关)>)、[Gateway(网关) 协议](</en/gateway/protocolGateway(网关)>)、
[Gateway(网关) 配对](/zh/gateway/pairingCLI)、[设备 CLI](/zh/cli/devices)。

## 角色

Gateway(网关) WebSocket 客户端使用以下一种角色进行连接：

- `operator`CLI：控制平面客户端，例如 CLI、控制 UI、自动化以及
  受信任的辅助进程。
- `node`macOSiOSAndroid：功能主机，例如 macOS、iOS、Android 或无头节点，它们
  通过 `node.invoke` 暴露命令。

操作员 RPC 方法需要 RPC`operator` 角色。节点发起的方法
需要 `node` 角色。

## 作用域级别

| 作用域                  | 含义                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `operator.read`         | 只读状态、列表、目录、日志、会话读取以及其他非变更性控制平面调用。                                                   |
| `operator.write`        | 常规变更性操作员操作，例如发送消息、调用工具、更新通话/语音设置以及节点命令中继。同时也满足 `operator.read`。        |
| `operator.admin`        | 管理级控制平面访问权限。满足每个 `operator.*` 作用域。配置变更、更新、原生挂钩、敏感保留命名空间以及高风险审批所需。 |
| `operator.pairing`      | 设备和节点配对管理，包括列出、批准、拒绝、移除、轮换和吊销配对记录或设备令牌。                                       |
| `operator.approvals`    | Exec 和插件批准 API。                                                                                                |
| `operator.talk.secrets` | 读取包含机密信息的 Talk 配置。                                                                                       |

未知的未来 `operator.*` 范围需要精确匹配，除非调用方拥有
`operator.admin`。

## 方法范围只是第一道关卡

每个 Gateway(网关) RPC 都有一个最小权限方法范围。该方法范围决定
请求是否能到达处理程序。一些处理程序随后会根据被批准或变更的具体对象
应用更严格的批准时检查。

示例：

- 使用 `operator.pairing` 即可访问 `device.pair.approve`，但批准
  操作员设备只能生成或保留调用方已拥有的范围。
- 使用 `operator.pairing` 即可访问 `node.pair.approve`，然后从待处理的节点命令列表
  中派生额外的批准范围。
- `chat.send` 通常是一个具有写入范围的方法，但持久化 `/config set`
  和 `/config unset` 需要在命令级别拥有 `operator.admin`。

这允许范围较低的操作员执行低风险的配对操作，而无需将
所有配对批准设为仅限管理员执行。

## 设备配对批准

设备配对记录是已批准角色和范围的持久来源。
已配对的设备不会在静默中获得更广泛的访问权限：请求
更广泛角色或更广泛范围的重连会创建一个新的待处理升级请求。

批准设备请求时：

- 没有操作员角色的请求不需要操作员令牌范围批准。
- 对于 `operator.read`、`operator.write`、`operator.approvals`、
  `operator.pairing` 或 `operator.talk.secrets` 的请求要求调用方拥有
  这些范围，或者拥有 `operator.admin`。
- 对于 `operator.admin` 的请求需要 `operator.admin`。
- 没有显式作用域的修复请求可以继承现有的操作员令牌作用域。如果该现有令牌具有管理员作用域，则批准仍需要 `operator.admin`。

对于已配对设备的令牌会话，除非调用者也拥有 `operator.admin`，否则管理是自作用域的：非管理员调用者只能看到自己的配对条目，只能批准或拒绝自己的待处理请求，并且只能轮换、撤销或删除自己的设备条目。

## 节点配对批准

传统 `node.pair.*`Gateway(网关) 使用单独的 Gateway(网关) 拥有的节点配对存储。WS 节点使用带有 `role: node` 的设备配对，但适用相同的批准级别词汇。

`node.pair.approve` 使用待处理请求命令列表来派生其他所需作用域：

- 无命令请求：`operator.pairing`
- 非 exec 节点命令：`operator.pairing` + `operator.write`
- `system.run`、`system.run.prepare` 或 `system.which`：
  `operator.pairing` + `operator.admin`

节点配对建立身份和信任。它不取代节点自己的 `system.run` exec 批准策略。

## 共享密钥身份验证

共享 Gateway(网关) 令牌/密码身份验证被视为对该 Gateway(网关) 的受信操作员访问。OpenAI 兼容的 HTTP 表面和 Gateway(网关)OpenAI`/tools/invoke` 会为共享密钥持有者身份验证恢复正常的完整操作员默认作用域集，即使调用者发送了更窄的声明作用域。

承载身份的模式（例如受信代理身份验证或私有入口 `none`）仍然可以遵守显式声明的作用域。请使用单独的 Gateway(网关) 来实现真正的信任边界分离。
