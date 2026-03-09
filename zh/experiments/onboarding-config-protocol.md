---
summary: "入门向导和配置模式的 RPC 协议说明"
read_when: "更改入门向导步骤或配置模式端点"
title: "入门和配置协议"
---

# 入门 + 配置协议

目的：跨 CLI、macOS 应用和 Web UI 的共享入门 + 配置界面。

## 组件

- 向导引擎（共享会话 + 提示 + 入门状态）。
- CLI 入门使用与 UI 客户端相同的向导流程。
- Gateway RPC 暴露向导 + 配置模式端点。
- macOS 入门使用向导步骤模型。
- Web UI 从 JSON Schema + UI 提示渲染配置表单。

## Gateway RPC

- `wizard.start` 参数：`{ mode?: "local"|"remote", workspace?: string }`
- `wizard.next` 参数：`{ sessionId, answer?: { stepId, value? } }`
- `wizard.cancel` 参数：`{ sessionId }`
- `wizard.status` 参数：`{ sessionId }`
- `config.schema` 参数：`{}`

响应（形状）

- 向导：`{ sessionId, done, step?, status?, error? }`
- 配置模式：`{ schema, uiHints, version, generatedAt }`

## UI 提示

- `uiHints` 按路径键控；可选元数据（标签/帮助/分组/顺序/高级/敏感/占位符）。
- 敏感字段呈现为密码输入；无编辑层。
- 不支持的模式节点回退到原始 JSON 编辑器。

## 注意

- 本文档是追踪入门/配置协议重构的唯一位置。
