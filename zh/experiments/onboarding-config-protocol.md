---
summary: "Onboarding 向导与配置 schema 的 RPC 协议说明"
title: "入门和配置协议"
read_when: "修改 onboarding 向导步骤或配置 schema 端点时"
---

# Onboarding + Config Protocol

目的：在 CLI、macOS app 与 Web UI 之间共享 onboarding 与配置界面。

## 组件
- 向导引擎（共享会话 + 提示 + onboarding 状态）。
- CLI onboarding 与 UI 客户端使用同一向导流程。
- Gateway RPC 暴露向导 + 配置 schema 端点。
- macOS onboarding 使用向导步骤模型。
- Web UI 通过 JSON Schema + UI hints 渲染配置表单。

## Gateway RPC
- `wizard.start` params: `{ mode?: "local"|"remote", workspace?: string }`
- `wizard.next` params: `{ sessionId, answer?: { stepId, value? } }`
- `wizard.cancel` params: `{ sessionId }`
- `wizard.status` params: `{ sessionId }`
- `config.schema` params: `{}`

响应（形态）
- Wizard: `{ sessionId, done, step?, status?, error? }`
- Config schema: `{ schema, uiHints, version, generatedAt }`

## UI Hints
- `uiHints` 以 path 为键；可选元数据（label/help/group/order/advanced/sensitive/placeholder）。
- sensitive 字段渲染为密码输入；没有额外的脱敏层。
- 不支持的 schema 节点会回退到原始 JSON 编辑器。

## 注
- 本文是跟踪 onboarding/config 协议重构的唯一位置。
