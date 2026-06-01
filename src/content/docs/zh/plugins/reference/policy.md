---
summary: "为工作区一致性添加基于策略的 doctor 检查。"
read_when:
  - You are installing, configuring, or auditing the policy plugin
title: "Policy 插件"
---

# Policy 插件

为工作区一致性添加基于策略的 doctor 检查。

## 分发

- 包：`@openclaw/policy`
- 安装路径：包含在 OpenClaw 中

## 暴露层

plugin

{/* openclaw-plugin-reference:manual-start */}

## 行为

Policy 插件为策略管理的 OpenClaw 设置和受管的工作区声明提供 doctor 健康检查。目前，策略涵盖渠道合规性、受管工具元数据、MCP 服务器状态、模型-提供商状态、私有网络访问状态、Gateway(网关) 暴露状态、代理工作区/工具状态、已配置的全局/每代理工具状态、已配置的沙箱运行时状态、入口/渠道访问状态以及 OpenClaw 配置机密提供商/身份验证配置文件状态。

Policy 将编写的要求存储在 `policy.jsonc` 中，将现有的 OpenClaw 设置和工作区声明作为证据进行观察，并通过 `openclaw policy check` 和 `openclaw doctor --lint` 报告偏差。一次干净的策略检查会输出策略、证据、发现和证明哈希，操作员可以记录这些哈希以供审计。

`openclaw policy compare --baseline <file>` 将一个策略文件与另一个策略文件进行比较。这仅限于配置级别的合规性：它使用策略规则元数据来验证受检查的策略不会缺少或弱于编写的基线，并且它不检查运行时状态、凭据或机密值。

工具状态规则可以要求批准的配置文件、仅限工作区的文件系统工具、受限的 exec security/ask/host 设置、禁用的提升模式、确切的 `alsoAllow` 条目以及所需的工具拒绝条目。证据记录会记录增量 `alsoAllow` 条目，因为它们可能会扩大有效的工具状态。这些检查仅观察配置合规性；它们不读取运行时批准状态或添加运行时强制执行。

沙箱状态规则可以要求批准的沙箱模式/后端、拒绝主机容器网络、拒绝加入容器命名空间、要求只读容器挂载、拒绝容器运行时套接字挂载和不受限的容器配置文件，以及要求沙箱浏览器 CDP 源范围。
这些检查仅观察配置合规性；它们不读取运行时批准状态、检查实时容器或添加运行时强制执行。

在 `scopes.<scopeName>` 下的命名策略范围可以为它们列出的选择器添加更严格的常规策略部分。`agentIds` 支持 `tools`、`agents.workspace` 和 `sandbox`；`channelIds` 支持 `ingress.channels`。未在 `agents.list[]` 中明确列出的运行时代理 ID 将根据继承的全局/默认态势进行检查，而不是在没有证据的情况下静默通过。`policy.jsonc` 中存在的每个范围必须对其选择器有效且可执行。覆盖规则是额外的声明，因此它们不会削弱顶层策略，并且当同一观察到的配置违反两个范围时，可以产生自己的发现。

{/* openclaw-plugin-reference:manual-end */}

## 相关文档

- [policy](/zh/cli/policy)
