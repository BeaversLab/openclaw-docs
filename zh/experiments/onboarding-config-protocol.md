---
summary: "RPC 协议说明，用于入职向导和配置架构"
read_when: "更改入职向导步骤或配置架构端点"
title: "入职与配置协议"
---

# 入职与配置协议

目的：在 CLI、macOS 应用和 Web UI 之间共享入职和配置界面。

## 组件

- 向导引擎（共享会话 + 提示符 + 入职状态）。
- CLI 入职使用与 UI 客户端相同的向导流程。
- Gateway 网关 RPC 暴露了向导 + 配置架构端点。
- macOS 入职使用向导步骤模型。
- Web UI 根据 JSON 架构 + UI 提示渲染配置表单。

## Gateway 网关 RPC

- `wizard.start` 参数： `{ mode?: "local"|"remote", workspace?: string }`
- `wizard.next` 参数： `{ sessionId, answer?: { stepId, value? } }`
- `wizard.cancel` 参数： `{ sessionId }`
- `wizard.status` 参数： `{ sessionId }`
- `config.schema` 参数： `{}`
- `config.schema.lookup` 参数： `{ path }`
  - `path` 接受标准配置段以及以斜杠分隔的插件 ID，例如 `plugins.entries.pack/one.config`。

响应（形状）

- 向导： `{ sessionId, done, step?, status?, error? }`
- 配置架构： `{ schema, uiHints, version, generatedAt }`
- 配置架构查找： `{ path, schema, hint?, hintPath?, children[] }`

## UI 提示

- `uiHints` 按路径键控；可选元数据（标签/帮助/分组/顺序/高级/敏感/占位符）。
- 敏感字段呈现为密码输入框；无编辑层。
- 不支持的架构节点回退到原始 JSON 编辑器。

## 说明

- 本文档是跟踪入职/配置协议重构的唯一位置。

import zh from '/components/footer/zh.mdx';

<zh />
