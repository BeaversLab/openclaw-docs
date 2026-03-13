---
summary: "节点位置命令、权限模式及 Android 前台行为"
read_when:
  - Adding location node support or permissions UI
  - Designing Android location permissions or foreground behavior
title: "位置命令"
---

# 定位命令（节点）

## 太长不看

- `location.get` 是一个节点命令（通过 `node.invoke`）。
- 默认关闭。
- Android 应用设置使用选择器：关闭 / 使用期间。
- 独立开关：精确定位。

## 为什么是选择器（而不仅仅是一个开关）

操作系统权限是多级的。我们可以在应用内展示一个选择器，但操作系统仍然决定实际授予的权限。

- iOS/macOS 可能会在系统提示/设置中显示 **使用期间** 或 **始终**。
- Android 应用目前仅支持前台定位。
- 精确定位是一个单独的授予项（iOS 14+ 的“Precise”，Android 的“fine”与“coarse”之分）。

UI 中的选择器驱动我们请求的模式；实际授予的权限存储在操作系统设置中。

## 设置模型

每个节点设备：

- `location.enabledMode`: `off | whileUsing`
- `location.preciseEnabled`: bool

UI 行为：

- 选择 `whileUsing` 会请求前台权限。
- 如果操作系统拒绝请求的级别，则回退到已授予的最高级别并显示状态。

## 权限映射 (node.permissions)

可选。macOS 节点通过权限映射报告 `location`；iOS/Android 可能会省略它。

## 命令：`location.get`

通过 `node.invoke` 调用。

参数（建议）：

```json
{
  "timeoutMs": 10000,
  "maxAgeMs": 15000,
  "desiredAccuracy": "coarse|balanced|precise"
}
```

响应负载：

```json
{
  "lat": 48.20849,
  "lon": 16.37208,
  "accuracyMeters": 12.5,
  "altitudeMeters": 182.0,
  "speedMps": 0.0,
  "headingDeg": 270.0,
  "timestamp": "2026-01-03T12:34:56.000Z",
  "isPrecise": true,
  "source": "gps|wifi|cell|unknown"
}
```

错误（稳定代码）：

- `LOCATION_DISABLED`: 选择器已关闭。
- `LOCATION_PERMISSION_REQUIRED`: 请求的模式缺少权限。
- `LOCATION_BACKGROUND_UNAVAILABLE`: 应用处于后台，但仅允许“使用时”权限。
- `LOCATION_TIMEOUT`: 未能及时获取定位。
- `LOCATION_UNAVAILABLE`: 系统故障 / 无可用提供程序。

## 后台行为

- Android 应用在后台时会拒绝 `location.get`。
- 在 Android 上请求定位时，请保持 OpenClaw 打开。
- 其他节点平台可能会有所不同。

## 模型/工具集成

- 工具表面：`nodes` 工具添加 `location_get` 操作（需要节点）。
- CLI：`openclaw nodes location get --node <id>`。
- Agent 指南：仅当用户启用了定位并了解其范围时才调用。

## UX 文案（建议）

- 关闭：“位置共享已禁用。”
- 使用期间：“仅在 OpenClaw 打开时。”
- 精确：“使用精确的 GPS 位置。关闭以分享大致位置。”

import zh from '/components/footer/zh.mdx';

<zh />
