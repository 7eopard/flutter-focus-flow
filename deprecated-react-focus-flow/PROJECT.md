# Angular 迁移方案 (MVP驱动版)

本文档旨在为将 Pomodoro Productivity Hub 从 React 迁移至 Angular 提供一个清晰、可实施、且以用户价值为核心的战略方案。

## 1. 核心原则

1.  **用户体验优先 (User Experience First):** 迁移的每一步都必须保证端到端的**用户体验无缝衔接**。用户不应该感知到应用底层正在发生框架更迭。视觉、交互和性能的对等是最高优先级。

2.  **MVP驱动的垂直切片 (MVP-Driven Vertical Slicing):** 我们将采用“垂直切片”的策略，优先迁移一个**最小可行产品 (MVP)**——即应用最核心、最高频的**专注计时功能**。

3.  **无缝混合与平滑过渡 (Seamless Hybrid & Smooth Transition):** 在整个迁移周期中，应用将是一个React与Angular的混合体。我们将建立一个稳健的桥接机制，确保体验的完整性。

## 2. 文件对文件迁移方案图

下图详细展示了从现有React文件/逻辑到目标Angular架构的迁移路径，包括一对多、多对一的映射关系。

```mermaid
graph TD
    subgraph React Source (Current)
        direction LR
        
        subgraph "Logic Layer (Hooks)"
            h_useTimer["useTimer.ts"]
            h_useInteractions["useInteractions.ts"]
            h_useSettings["useSettings.ts"]
            h_useTasks["useTasks.ts"]
        end

        subgraph "View Layer (Components)"
            c_App["App.tsx"]
            c_Nav["NavTray.tsx<br/>Header.tsx"]
            c_TimerView["TimerView.tsx<br/>+ sub-components"]
            c_TasksView["TasksView.tsx<br/>+ TaskItem.tsx"]
            c_StatsView["StatsView.tsx"]
            c_SettingsView["SettingsView.tsx"]
        end
    end

    subgraph Angular Target (New)
        direction LR

        subgraph "Core Services (中间层)"
            s_timer["timer.service.ts"]
            s_settings["settings.service.ts"]
            s_tasks["task.service.ts"]
            s_stats["stats.service.ts"]
        end
        
        subgraph "Feature Components (视图)"
            comp_app["app.component.ts (Shell)"]
            comp_focus["focus.component.ts"]
            comp_tasks["tasks.component.ts"]
            comp_stats["stats.component.ts"]
            comp_settings["settings.component.ts"]
        end
    end

    %% Logic Layer Migration (多对一)
    h_useTimer -- "合并核心计时逻辑" --> s_timer
    h_useInteractions -- "合并交互逻辑" --> s_timer

    %% Logic Layer Migration (一对一)
    h_useSettings -- "设置状态管理" --> s_settings
    h_useTasks -- "任务状态管理" --> s_tasks
    h_useTimer -- "会话(Session)逻辑" --> s_stats
    
    %% View Layer Migration
    c_TimerView -- "复刻视觉与交互" --> comp_focus
    c_TasksView -- "复刻视觉与交互" --> comp_tasks
    c_StatsView -- "复刻视觉与交互" --> comp_stats
    c_SettingsView -- "复刻视觉与交互" --> comp_settings
    
    %% App Shell Migration (多对一)
    c_App -- "合并应用外壳" --> comp_app
    c_Nav -- "合并导航" --> comp_app
```
