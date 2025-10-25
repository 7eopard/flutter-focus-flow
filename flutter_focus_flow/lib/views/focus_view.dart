import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_focus_flow/services/focus_service.dart';
import 'package:provider/provider.dart';

class FocusView extends StatefulWidget {
  const FocusView({super.key});

  @override
  State<FocusView> createState() => _FocusViewState();
}

class _FocusViewState extends State<FocusView> with TickerProviderStateMixin {
  late FocusService _focusService;
  late AnimationController _slideController;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOutCubic,
    ));
    
    _slideController.forward();
  }



  @override
  Widget build(BuildContext context) {
    _focusService = Provider.of<FocusService>(context);
    
    return Scaffold(
      // 使用Stack布局，让FAB与底部栏并排
      body: Stack(
        children: [
          // 主要内容区域
          SafeArea(
            child: Stack(
              clipBehavior: Clip.none, // 确保子元素不被剪裁
              children: [
                // 主要内容 - 计时器和进度条
                Column(
                  children: [
                    // Timer display - 使用圆形进度条，类似Kotlin demo的样式
                    Expanded(
                      flex: 2,
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        child: Center(
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              // 背景装饰
                              Container(
                                width: 320,
                                height: 320,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.3),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Theme.of(context).colorScheme.shadow.withOpacity(0.1),
                                      blurRadius: 20,
                                      spreadRadius: 5,
                                    ),
                                  ],
                                ),
                              ),
                              // 圆形进度条 - 使用focusService中的progressValue
                              SizedBox(
                                width: 300,
                                height: 300,
                                child: CircularProgressIndicator(
                                  value: _focusService.progressValue,
                                  strokeWidth: 16,
                                  backgroundColor: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    _focusService.state.mode == FocusMode.work
                                        ? Theme.of(context).colorScheme.primary
                                        : Theme.of(context).colorScheme.tertiary,
                                  ),
                                  strokeCap: StrokeCap.round,
                                ),
                              ),
                              // 时间文本显示在中心
                              Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    _focusService.formattedTime,
                                    style: Theme.of(context).textTheme.displayLarge?.copyWith(
                                      fontWeight: FontWeight.bold,
                                      color: _focusService.state.mode == FocusMode.work
                                          ? Theme.of(context).colorScheme.onPrimaryContainer
                                          : Theme.of(context).colorScheme.onTertiaryContainer,
                                      fontFeatures: const [FontFeature.tabularFigures()], // 确保数字等宽
                                      fontFamily: 'monospace', // 使用等宽字体
                                    ),
                                  ),
                                  // 在时间下方添加小的显示模式指示器，不占用太多空间
                                  Text(
                                    _focusService.state.displayMode == DisplayMode.countdown ? '倒计时' : '正计时',
                                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    // Controls area - 使用新的状态机来构建UI
                    Expanded(
                      child: SlideTransition(
                        position: _slideAnimation,
                        child: Container(
                          padding: const EdgeInsets.all(20),
                          child: _buildControls(_focusService.state.uiState),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // 底部区域，包含底部栏和FAB
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _buildBottomArea(_focusService.state.uiState),
          ),
        ],
      ),
    );
  }

  // 构建浮动操作按钮 - 统一样式，确保视觉一致性
  Widget _buildFab(FocusUiState uiState) {
    // 所有状态下都显示扩展式FAB，保持视觉一致性
    return _getPrimaryButton(uiState);
  }
  
  // 为停靠样式设计的FAB - 统一样式，确保视觉一致性
  Widget _buildFabForDocked(FocusUiState uiState) {
    // 所有状态下都显示扩展式FAB，保持视觉一致性
    return Container(
      margin: const EdgeInsets.only(top: 8), // 添加顶部边距，确保与BottomAppBar对齐
      child: _getPrimaryButton(uiState),
    );
  }
  
  // 通用按钮行组件 - 支持左右两个按钮
  Widget _buildButtonRow(Widget leftButton, Widget rightButton) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        leftButton,
        rightButton,
      ],
    );
  }

  // 通用按钮组件 - 简化按钮创建过程
  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
    Color? backgroundColor,
  }) {
    return ElevatedButton.icon(
      icon: Icon(icon),
      label: Text(label),
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: backgroundColor,
        minimumSize: const Size(120, 56),
      ),
    );
  }

  // 构建辅助控制按钮区域
  Widget _buildControls(FocusUiState uiState) {
    // 对于所有状态，我们现在主要使用浮动操作按钮 (FAB) 和浮动工具栏
    // 这里只保留必要的UI元素，其余操作通过FAB处理
    switch (uiState) {
      case FocusUiState.adjusting:
        return SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 16),
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Text(
                        '调整时间',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${_focusService.deltaAdjustmentInSeconds >= 0 ? '+' : ''}${_focusService.deltaAdjustmentInSeconds}s', 
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onPrimaryContainer,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        '使用浮动工具栏中的按钮调整时间',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );

      case FocusUiState.goalMet:
        return Center(
          child: Card(
            elevation: 4,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.emoji_events,
                    size: 64,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Goal Achieved!',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'You\'ve reached your focus goal',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );

      // 对于其他所有状态，使用空容器，因为操作已完全由FAB和浮动工具栏处理
      default:
        return const SizedBox.shrink();
    }
  }

  void _showSetGoalDialog() {
    int minutes = (_focusService.state.minWorkDuration ~/ 60);
    final controller = TextEditingController(text: minutes.toString());

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Text(
          'Set Focus Goal',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Set your minimum focus time goal',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                hintText: 'Enter minutes',
                labelText: 'Focus Goal (minutes)',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.3),
              ),
            ),
            const SizedBox(height: 16),
            // 快速选择按钮
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [15, 25, 30, 45, 60].map((minutes) {
                return ActionChip(
                  label: Text('$minutes min'),
                  onPressed: () {
                    controller.text = minutes.toString();
                  },
                  backgroundColor: Theme.of(context).colorScheme.surfaceVariant,
                );
              }).toList(),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final value = int.tryParse(controller.text);
              if (value != null && value > 0) {
                _focusService.setMinFocusTime(value * 60); // 转换为秒
              }
              Navigator.pop(context);
            },
            child: const Text('Set Goal'),
          ),
        ],
      ),
    );
  }

  // 构建底部操作按钮 - 使用Material 3 Expressive设计
  Widget _buildBottomActionButtons(FocusUiState uiState) {
    switch (uiState) {
      case FocusUiState.idle:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              FilledButton.icon(
                onPressed: _showSetGoalDialog,
                icon: const Icon(Icons.settings),
                label: const Text('Set Goal'),
                style: FilledButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
                  foregroundColor: Theme.of(context).colorScheme.onSecondaryContainer,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ),
              FilledButton.icon(
                onPressed: _focusService.startFocus,
                icon: const Icon(Icons.play_arrow),
                label: const Text('Start'),
                style: FilledButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  foregroundColor: Theme.of(context).colorScheme.onPrimaryContainer,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ),
            ],
          ),
        );
      case FocusUiState.runningFocus:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 显示模式切换按钮，放在底部操作区上方
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                alignment: Alignment.centerRight,
                child: IconButton(
                  onPressed: _focusService.toggleDisplayMode,
                  icon: Icon(
                    _focusService.state.displayMode == DisplayMode.countdown
                        ? Icons.timer
                        : Icons.timer_off,
                    size: 20,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  tooltip: _focusService.state.displayMode == DisplayMode.countdown
                      ? '切换到正计时'
                      : '切换到倒计时',
                  style: IconButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.surfaceVariant,
                    foregroundColor: Theme.of(context).colorScheme.onSurfaceVariant,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    padding: const EdgeInsets.all(8),
                  ),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  FilledButton.icon(
                    onPressed: _focusService.pauseFocus,
                    icon: _focusService.state.isActive ? const Icon(Icons.pause) : const Icon(Icons.play_arrow),
                    label: Text(_focusService.state.isActive ? 'Pause' : 'Resume'),
                    style: FilledButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
                      foregroundColor: Theme.of(context).colorScheme.onSecondaryContainer,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                  ),
                  // 休息按钮（根据是否解锁显示不同状态）
                  FilledButton.icon(
                    onPressed: _focusService.state.isBreakUnlocked 
                        ? _focusService.startBreak 
                        : null,
                    icon: Icon(
                      _focusService.state.isBreakUnlocked ? Icons.free_breakfast : Icons.lock,
                      color: _focusService.state.isBreakUnlocked 
                          ? null 
                          : Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                    ),
                    label: _focusService.state.isBreakUnlocked 
                        ? Text('Rest (${(_focusService.state.earnedBreakSeconds ~/ 60).toString().padLeft(2, '0')}:${(_focusService.state.earnedBreakSeconds % 60).toString().padLeft(2, '0')})')
                        : const Text('Rest Locked'),
                    style: FilledButton.styleFrom(
                      backgroundColor: _focusService.state.isBreakUnlocked 
                          ? Theme.of(context).colorScheme.primaryContainer 
                          : Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
                      foregroundColor: _focusService.state.isBreakUnlocked
                          ? Theme.of(context).colorScheme.onPrimaryContainer
                          : Theme.of(context).colorScheme.onSurfaceVariant,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      case FocusUiState.runningRest:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              FilledButton.icon(
                onPressed: _focusService.endBreak,
                icon: const Icon(Icons.assignment),
                label: const Text('Back to Focus'),
                style: FilledButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  foregroundColor: Theme.of(context).colorScheme.onPrimaryContainer,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ),
              FilledButton.icon(
                onPressed: () {
                  _focusService.endBreak();
                  _focusService.startFocus();
                },
                icon: const Icon(Icons.fast_forward),
                label: const Text('Skip & Focus'),
                style: FilledButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
                  foregroundColor: Theme.of(context).colorScheme.onSecondaryContainer,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ),
            ],
          ),
        );
      case FocusUiState.adjusting:
        // 调整状态下的底部操作按钮已移至浮动工具栏
        return const SizedBox.shrink();
      case FocusUiState.goalMet:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              FilledButton.icon(
                onPressed: _focusService.startBreak,
                icon: const Icon(Icons.free_breakfast),
                label: const Text('Start Rest'),
                style: FilledButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  foregroundColor: Theme.of(context).colorScheme.onPrimaryContainer,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ),
            ],
          ),
        );
      case FocusUiState.pausedFocus:
        // 不应该出现这个状态，因为我们直接转到调整模式
        return Container(); 
      case FocusUiState.pausedRest:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              OutlinedButton.icon(
                onPressed: _focusService.discardTimeAdjustment,
                icon: const Icon(Icons.close),
                label: const Text('Discard'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ),
              FilledButton.icon(
                onPressed: () {
                  _focusService.resumeRest();
                },
                icon: const Icon(Icons.play_arrow),
                label: const Text('Resume'),
                style: FilledButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  foregroundColor: Theme.of(context).colorScheme.onPrimaryContainer,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ),
            ],
          ),
        );
    }
  }

  @override
  void dispose() {
    _slideController.dispose();
    super.dispose();
  }

  // 构建底部区域，包含底部栏和FAB，使它们并排显示
  Widget _buildBottomArea(FocusUiState uiState) {
    return Container(
      height: 80, // 与之前BottomAppBar的高度相同
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: Theme.of(context).colorScheme.surface,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // 左侧放置次要按钮
          Row(
            mainAxisSize: MainAxisSize.min,
            children: _getSecondaryButtons(uiState),
          ),
          
          // 右侧放置主按钮(FAB)
          _getPrimaryButton(uiState),
        ],
      ),
    );
  }
  
  // 构建BottomAppBar实现 - 在所有状态下都显示，保持视觉一致性
  Widget _buildBottomAppBar(FocusUiState uiState) {
    return BottomAppBar(
      height: 80, // 设置合适的高度
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: Theme.of(context).colorScheme.surface,
      elevation: 0.0, // 移除阴影，避免与FAB阴影冲突
      // 移除notch形状，因为FAB现在是悬浮的
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // 左侧放置次要按钮
          Row(
            mainAxisSize: MainAxisSize.min,
            children: _getSecondaryButtons(uiState),
          ),
          
          // 右侧留空，为悬浮的FAB腾出空间
          const SizedBox(width: 200), // 为FAB留出足够空间
        ],
      ),
    );
  }
  
  // 获取主按钮 - 统一样式，确保视觉一致性
  Widget _getPrimaryButton(FocusUiState uiState) {
    switch (uiState) {
      case FocusUiState.idle:
        return FloatingActionButton.extended(
          onPressed: _focusService.startFocus,
          icon: const Icon(Icons.play_arrow),
          label: const Text('开始专注'),
          backgroundColor: Theme.of(context).colorScheme.primary,
          foregroundColor: Theme.of(context).colorScheme.onPrimary,
          elevation: 2.0, // 降低阴影高度，使其更加自然
          tooltip: '开始专注',
          extendedPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16.0),
          ),
        );
        
      case FocusUiState.goalMet:
        return FloatingActionButton.extended(
          onPressed: _focusService.startBreak,
          icon: const Icon(Icons.free_breakfast),
          label: const Text('开始休息'),
          backgroundColor: Theme.of(context).colorScheme.primary,
          foregroundColor: Theme.of(context).colorScheme.onPrimary,
          elevation: 2.0, // 降低阴影高度，使其更加自然
          tooltip: '开始休息',
          extendedPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16.0),
          ),
        );
        
      case FocusUiState.runningFocus:
        return FloatingActionButton.extended(
          onPressed: _focusService.pauseFocus,
          icon: const Icon(Icons.pause),
          label: const Text('暂停'),
          backgroundColor: Theme.of(context).colorScheme.error,
          foregroundColor: Theme.of(context).colorScheme.onError,
          elevation: 2.0, // 降低阴影高度，使其更加自然
          tooltip: '暂停',
          extendedPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16.0),
          ),
        );
        
      case FocusUiState.runningRest:
        return FloatingActionButton.extended(
          onPressed: _focusService.endBreak,
          icon: const Icon(Icons.assignment_turned_in),
          label: const Text('结束休息'),
          backgroundColor: Theme.of(context).colorScheme.tertiary,
          foregroundColor: Theme.of(context).colorScheme.onTertiary,
          elevation: 2.0, // 降低阴影高度，使其更加自然
          tooltip: '结束休息',
          extendedPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16.0),
          ),
        );
        
      case FocusUiState.adjusting:
        return FloatingActionButton.extended(
          onPressed: _focusService.applyTimeAdjustment,
          icon: const Icon(Icons.check),
          label: const Text('应用'),
          backgroundColor: Theme.of(context).colorScheme.primary,
          foregroundColor: Theme.of(context).colorScheme.onPrimary,
          elevation: 2.0, // 降低阴影高度，使其更加自然
          tooltip: '应用',
          extendedPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16.0),
          ),
        );
        
      case FocusUiState.pausedFocus:
        return FloatingActionButton.extended(
          onPressed: _focusService.startFocus,
          icon: const Icon(Icons.play_arrow),
          label: const Text('继续专注'),
          backgroundColor: Theme.of(context).colorScheme.primary,
          foregroundColor: Theme.of(context).colorScheme.onPrimary,
          elevation: 2.0, // 降低阴影高度，使其更加自然
          tooltip: '继续专注',
          extendedPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16.0),
          ),
        );
        
      case FocusUiState.pausedRest:
        return FloatingActionButton.extended(
          onPressed: _focusService.resumeRest,
          icon: const Icon(Icons.play_arrow),
          label: const Text('继续休息'),
          backgroundColor: Theme.of(context).colorScheme.primary,
          foregroundColor: Theme.of(context).colorScheme.onPrimary,
          elevation: 2.0, // 降低阴影高度，使其更加自然
          tooltip: '继续休息',
          extendedPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16.0),
          ),
        );
        
      default:
        return Container();
    }
  }
  
  // 获取次要按钮列表
  List<Widget> _getSecondaryButtons(FocusUiState uiState) {
    switch (uiState) {
      case FocusUiState.runningFocus:
        return [
          FloatingActionButton.small(
            onPressed: _focusService.resetFocus,
            backgroundColor: Theme.of(context).colorScheme.surfaceVariant,
            foregroundColor: Theme.of(context).colorScheme.onSurfaceVariant,
            elevation: 3.0,
            child: const Icon(Icons.restart_alt),
            tooltip: '重置',
          ),
        ];
        
      case FocusUiState.runningRest:
        return [
          FloatingActionButton.small(
            onPressed: () {
              _focusService.endBreak();
              _focusService.startFocus();
            },
            backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
            foregroundColor: Theme.of(context).colorScheme.onSecondaryContainer,
            elevation: 3.0,
            child: const Icon(Icons.skip_next),
            tooltip: '立即开始下一轮',
          ),
        ];
        
      case FocusUiState.adjusting:
        return [
          FloatingActionButton.small(
            onPressed: _focusService.discardTimeAdjustment,
            backgroundColor: Theme.of(context).colorScheme.surfaceVariant,
            foregroundColor: Theme.of(context).colorScheme.onSurfaceVariant,
            elevation: 3.0,
            child: const Icon(Icons.close),
            tooltip: '取消',
          ),
          const SizedBox(width: 8),
          FloatingActionButton.small(
            onPressed: () => _focusService.adjustTime(-30),
            backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
            foregroundColor: Theme.of(context).colorScheme.onSecondaryContainer,
            elevation: 3.0,
            child: const Icon(Icons.remove),
            tooltip: '-30秒',
          ),
          const SizedBox(width: 8),
          FloatingActionButton.small(
            onPressed: () => _focusService.adjustTime(30),
            backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
            foregroundColor: Theme.of(context).colorScheme.onSecondaryContainer,
            elevation: 3.0,
            child: const Icon(Icons.add),
            tooltip: '+30秒',
          ),
        ];
        
      case FocusUiState.pausedFocus:
      case FocusUiState.pausedRest:
        return [
          FloatingActionButton.small(
            onPressed: _focusService.discardTimeAdjustment,
            backgroundColor: Theme.of(context).colorScheme.surfaceVariant,
            foregroundColor: Theme.of(context).colorScheme.onSurfaceVariant,
            elevation: 3.0,
            child: const Icon(Icons.close),
            tooltip: '取消',
          ),
        ];
        
      default:
        return [];
    }
  }
}