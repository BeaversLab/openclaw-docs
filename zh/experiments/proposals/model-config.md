---
summary: "探索：模型配置、auth profiles 与回退行为"
read_when:
  - 探索未来的模型选择 + auth profile 方案
---
# Model Config（探索）

本文记录未来模型配置的**想法**，并非已发布规范。当前行为参见：
- [Models](/zh/concepts/models)
- [Model failover](/zh/concepts/model-failover)
- [OAuth + profiles](/zh/concepts/oauth)

## 动机

运营方希望：
- 每个 provider 多个 auth profiles（个人 vs 工作）。
- 简单的 `/model` 选择与可预测的回退。
- 文本模型与图像能力模型的清晰分离。

## 可能方向（高层）

- 保持模型选择简单：`provider/model` + 可选别名。
- 让 providers 拥有多个 auth profiles，并支持显式排序。
- 使用全局 fallback 列表，让所有会话一致回退。
- 仅在显式配置时覆盖图像路由。

## 未决问题

- Profile 轮换应按 provider 还是按 model？
- UI 应如何呈现会话级 profile 选择？
- 从旧配置 key 迁移的最安全路径是什么？
