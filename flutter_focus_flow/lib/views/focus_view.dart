import 'package:flutter/material.dart';
import 'package:flutter_focus_flow/services/focus_service.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

class FocusView extends StatefulWidget {
  const FocusView({super.key});

  @override
  State<FocusView> createState() => _FocusViewState();
}

class _FocusViewState extends State<FocusView> with TickerProviderStateMixin {
  late FocusService _focusService;
  late AnimationController _slideController;
  late Animation<Offset> _slideAnimation;
  late AnimationController _progressController;
  late Tween<double> _progressTween;
  late Animation<double> _progressAnimation;

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
    
    // 初始化进度动画控制器，与服务端100ms的更新频率匹配，确保动画流畅
    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    
    _progressTween = Tween<double>(begin: 0.0, end: 0.0);
    _progressAnimation = _progressTween.animate(
      CurvedAnimation(
        parent: _progressController,
        curve: Curves.easeInOut,
      ),
    );
    
    _slideController.forward();
  }



  @override
  Widget build(BuildContext context) {
    _focusService = Provider.of<FocusService>(context);
    
    // 当进度值变化时，使用动画平滑过渡
    double targetProgress = _focusService.progressValue;
    if (_progressTween.end != targetProgress) {
      _progressTween.begin = _progressAnimation.value;
      _progressTween.end = targetProgress;
      _progressController
        ..reset()
        ..forward();
    }
    
    return Scaffold(
      body: SafeArea(
        child: Column(
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
                      // 圆形进度条 - 使用AnimatedBuilder实现平滑动画
                      SizedBox(
                        width: 300,
                        height: 300,
                        child: AnimatedBuilder(
                          animation: _progressAnimation,
                          builder: (context, child) {
                            return CircularProgressIndicator(
                              value: _progressAnimation.value,
                              strokeWidth: 16,
                              backgroundColor: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
                              valueColor: AlwaysStoppedAnimation<Color>(
                                _focusService.state.mode == FocusMode.work
                                    ? Theme.of(context).colorScheme.primary
                                    : Theme.of(context).colorScheme.tertiary,
                              ),
                              strokeCap: StrokeCap.round,
                            );
                          },
                        ),
                      ),
                      // 时间文本显示在中心
                      Text(
                            _focusService.formattedTime,
                            style: GoogleFonts.montserrat(
                              fontSize: 72,
                              fontWeight: FontWeight.w900,
                              color: _focusService.state.mode == FocusMode.work
                                  ? Theme.of(context).colorScheme.onPrimaryContainer
                                  : Theme.of(context).colorScheme.onTertiaryContainer,
                              fontFeatures: const [FontFeature.tabularFigures()], // 确保数字等宽
                            ),
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
            
            // Bottom action buttons - 类似Google时钟的底部按钮布局
            _buildBottomActionButtons(_focusService.state.uiState),
          ],
        ),
      ),
      // 移除FAB，将所有操作按钮统一到底部操作区
    );
  }

  // 构建主控制按钮（FAB）
  Widget? _buildFab(FocusUiState uiState) {
    switch (uiState) {
      case FocusUiState.idle:
        return FloatingActionButton(
          onPressed: _focusService.startFocus,
          child: const Icon(Icons.play_arrow),
        );
      case FocusUiState.runningFocus:
        // 在运行专注时，显示暂停按钮
        return FloatingActionButton(
          onPressed: _focusService.pauseFocus,
          child: const Icon(Icons.pause),
        );
      case FocusUiState.runningRest:
        return FloatingActionButton(
          onPressed: _focusService.pauseRest,
          child: const Icon(Icons.pause),
        );
      case FocusUiState.pausedFocus:
      case FocusUiState.pausedRest:
        // 不应该出现这个状态，因为我们直接转到调整模式
        return null; 
      case FocusUiState.adjusting:
        return null; // 调整时隐藏主按钮
      case FocusUiState.goalMet:
        // 在目标达成时，显示开始休息按钮
        return FloatingActionButton(
          onPressed: _focusService.startBreak,
          child: const Icon(Icons.free_breakfast),
          backgroundColor: Colors.green,
        );
    }
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
    switch (uiState) {
      case FocusUiState.idle:
        return const SizedBox.shrink(); // 空容器，因为按钮已移动到底部

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
                        'Adjust Time',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          FilledButton.tonal(
                            onPressed: () => _focusService.adjustTime(-30),
                            child: const Text('-30s'),
                          ),
                          const SizedBox(width: 16),
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
                          const SizedBox(width: 16),
                          FilledButton.tonal(
                            onPressed: () => _focusService.adjustTime(30),
                            child: const Text('+30s'),
                          ),
                        ],
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
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    icon: const Icon(Icons.free_breakfast),
                    label: const Text('Start Rest'),
                    onPressed: _focusService.startBreak,
                  ),
                ],
              ),
            ),
          ),
        );

      case FocusUiState.runningFocus:
      case FocusUiState.runningRest:
        // 在计时运行时，使用底部按钮，主区域为空
        return const SizedBox.shrink();
      case FocusUiState.pausedFocus:
        // 不应该出现这个状态，因为我们直接转到调整模式
        return const SizedBox.shrink(); 
      case FocusUiState.pausedRest:
        // 在暂停休息时显示调整控件
        return SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  OutlinedButton(onPressed: () => _focusService.adjustTime(-30), child: const Text('-30s')),
                  const SizedBox(width: 16),
                  Text(
                    '${_focusService.deltaAdjustmentInSeconds >= 0 ? '+' : ''}${_focusService.deltaAdjustmentInSeconds}s', 
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(width: 16),
                  OutlinedButton(onPressed: () => _focusService.adjustTime(30), child: const Text('+30s')),
                ],
              ),
              const SizedBox(height: 16),
              _buildActionButton(
                icon: Icons.check,
                label: 'Apply',
                onPressed: _focusService.applyTimeAdjustment,
                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
              ),
            ],
          ),
        );
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
          child: Row(
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
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 跳过并休息按钮
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                child: FilledButton.icon(
                  onPressed: _focusService.advancedBreak,
                  icon: const Icon(Icons.fast_forward),
                  label: const Text('Skip to Rest'),
                  style: FilledButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.tertiaryContainer,
                    foregroundColor: Theme.of(context).colorScheme.onTertiaryContainer,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ),
              ),
              // 取消和应用按钮行
              Row(
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
                    onPressed: _focusService.applyTimeAdjustment,
                    icon: const Icon(Icons.check),
                    label: const Text('Apply'),
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
            ],
          ),
        );
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
    _progressController.dispose();
    super.dispose();
  }
}