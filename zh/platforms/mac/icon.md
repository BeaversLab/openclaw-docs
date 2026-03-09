---
summary: "OpenClaw 在 macOS 上的菜单栏图标状态和动画"
read_when:
  - "Changing menu bar icon behavior"
title: "菜单栏图标"
---

# 菜单栏图标状态

作者：steipete · 更新：2025-12-06 · 范围：macOS 应用（`apps/macos`）

- **空闲：** 正常的图标动画（眨眼、偶尔摆动）。
- **已暂停：** 状态项使用 `appearsDisabled`；无动作。
- **语音触发（大耳朵）：** 语音唤醒检测器在听到唤醒词时调用 `AppState.triggerVoiceEars(ttl: nil)`，在捕获语音时保持 `earBoostActive=true`。耳朵放大（1.9 倍），获得圆形耳孔以提高可读性，然后在 1 秒静音后通过 `stopVoiceEars()` 恢复。仅从应用内语音管道触发。
- **工作中（代理运行）：** `AppState.isWorking=true` 驱动”尾巴/腿部快速移动”的微动作：工作进行时腿部摆动更快并有轻微偏移。目前围绕 WebChat 代理运行切换；在连接其他长任务时添加相同的切换。

连接点

- 语音唤醒：runtime/tester 在触发时调用 `AppState.triggerVoiceEars(ttl: nil)`，在 1 秒静音后调用 `stopVoiceEars()` 以匹配捕获窗口。
- 代理活动：在工作跨度周围设置 `AppStateStore.shared.setWorking(true/false)`（已在 WebChat 代理调用中完成）。保持跨度较短并在 `defer` 块中重置以避免动画卡住。

形状和尺寸

- 基本图标在 `CritterIconRenderer.makeIcon(blink:legWiggle:earWiggle:earScale:earHoles:)` 中绘制。
- 耳朵缩放默认为 `1.0`；语音增强设置 `earScale=1.9` 并切换 `earHoles=true` 而不更改整体框架（18×18 pt 模板图像渲染到 36×36 px Retina 支持存储）。
- 快速移动使用高达 ~1.0 的腿部摆动并带有轻微的水平抖动；它叠加到任何现有的空闲摆动上。

行为说明

- 没有用于耳朵/工作的外部 CLI/broker 切换；保持其在应用自身信号内部以避免意外抖动。
- 保持 TTL 较短（<10s），以便在作业挂起时图标快速返回基线。
