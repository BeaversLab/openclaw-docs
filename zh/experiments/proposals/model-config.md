---
summary: "探索：模型配置、身份验证配置文件和回退行为"
read_when:
  - "Exploring future model selection + auth profile ideas"
title: "模型配置探索"
---

# 模型配置（探索）

本文档捕获了未来模型配置的**想法**。它不是发布的规范。有关当前行为，请参阅：

- [Models](/zh/concepts/models)
- [Model failover](/zh/concepts/model-failover)
- [OAuth + profiles](/zh/concepts/oauth)

## 动机

操作员希望：

- 每个提供商有多个身份验证配置文件（个人 vs 工作）。
- 简单的 `/model` 选择，具有可预测的回退。
- 文本模型和图像模型之间有清晰的分离。

## 可能的方向（高层次）

- 保持模型选择简单：`provider/model` 带可选别名。
- 允许提供商有多个身份验证配置文件，具有明确的顺序。
- 使用全局回退列表，以便所有会话一致地回退。
- 仅在显式配置时才覆盖图像路由。

## 未解决的问题

- 配置文件轮换应该是按提供商还是按模型？
- UI 应该如何为会话显示配置文件选择？
- 从旧配置键迁移的最安全路径是什么？
