import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_focus_flow/services/focus_service.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_focus_flow/services/timer_service.dart';

class FocusView extends StatefulWidget {
  const FocusView({super.key});

  @override
  State<FocusView> createState() => _FocusViewState();
}

class _FocusViewState extends State<FocusView> with TickerProviderStateMixin {
  late FocusService _focusService;
  late AnimationController _progressController;
  late Tween<double> _progressTween;
  late Animation<double> _progressAnimation;
  bool _isSheetOpen = false; // 防止重复打开工作表的标志



  @override
  void initState() {
    super.initState();

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
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _focusService = Provider.of<FocusService>(context, listen: false);
    _focusService.addListener(_onFocusServiceStateChanged);
  }

  void _onFocusServiceStateChanged() async {
    if (kDebugMode) print('[FocusView] State changed to: ${_focusService.state.uiState}');
    // 如果状态变为“调整中”且当前没有打开的工作表，则显示工作表
    if (_focusService.state.uiState == FocusUiState.adjusting && !_isSheetOpen) {
      _isSheetOpen = true; // 设置标志，表示工作表已打开
      final result = await _showAdjustmentSheet(_focusService);
      _isSheetOpen = false; // 重置标志

      // 在异步操作后检查小部件是否仍然挂载
      if (!mounted) return;

      // 根据工作表返回的结果执行操作
      if (result == true) {
        _focusService.applyTimeAdjustment();
      } else {
        // 如果用户取消（通过按钮或滑动），则丢弃调整
        _focusService.discardTimeAdjustment();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<FocusService>(
      builder: (context, focusService, child) {
        _focusService = focusService;
        final currentUiState = focusService.state.uiState;

        // 当进度值变化时，使用动画平滑过渡
        double targetProgress = focusService.progressValue;
        if (_progressTween.end != targetProgress) {
          // 使用帧后回调来安全地启动动画，避免在build方法中直接操作控制器
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              _progressTween.begin = _progressAnimation.value;
              _progressTween.end = targetProgress;
              _progressController
                ..reset()
                ..forward();
            }
          });
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
                                    focusService.state.mode == FocusMode.work
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
                            focusService.formattedTime,
                            style: GoogleFonts.montserrat(
                              fontSize: 72,
                              fontWeight: FontWeight.w900,
                              color: focusService.state.mode == FocusMode.work
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

                // Controls area is now removed and handled by a BottomSheet
                const Spacer(),
              ],
            ),
          ),
          floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
          floatingActionButton: _buildFabToolbar(currentUiState, focusService),
        );
      },
    );
  }

  // 构建统一的FAB Toolbar
  Widget _buildFabToolbar(FocusUiState uiState, FocusService focusService) {
    switch (uiState) {
      case FocusUiState.idle:
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            FloatingActionButton.small(
              heroTag: 'settings_button',
              onPressed: () => _showSetGoalDialog(context, focusService),
              tooltip: 'Set Goal',
              child: const Icon(Icons.settings),
            ),
            const SizedBox(width: 16),
            FloatingActionButton.extended(
              heroTag: 'start_button',
              onPressed: focusService.startFocus,
              icon: const Icon(Icons.play_arrow),
              label: const Text('Start'),
            ),
          ],
        );

      case FocusUiState.runningFocus:
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // "Aside" button
            FloatingActionButton(
              heroTag: 'pause_button',
              onPressed: focusService.pauseFocus,
              tooltip: 'Pause',
              child: const Icon(Icons.pause),
            ),
            const SizedBox(width: 16),
            // Main FAB
            FloatingActionButton.extended(
              heroTag: 'rest_button',
              onPressed: focusService.state.isBreakUnlocked ? focusService.startBreak : null,
              icon: Icon(focusService.state.isBreakUnlocked ? Icons.free_breakfast : Icons.lock),
              label: focusService.state.isBreakUnlocked
                  ? Text('Rest (${(focusService.state.earnedBreakSeconds ~/ 60).toString().padLeft(2, '0')}:${(focusService.state.earnedBreakSeconds % 60).toString().padLeft(2, '0')})')
                  : const Text('Rest Locked'),
              backgroundColor: focusService.state.isBreakUnlocked ? null : Theme.of(context).colorScheme.surfaceVariant,
              foregroundColor: focusService.state.isBreakUnlocked ? null : Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ],
        );

      case FocusUiState.adjusting:
        return const SizedBox.shrink(); // 调整UI现在位于BottomSheet中，FAB工具栏不应显示任何内容

      case FocusUiState.runningRest:
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            FloatingActionButton(
              heroTag: 'back_to_focus_button',
              onPressed: focusService.endBreak,
              tooltip: 'Back to Focus',
              child: const Icon(Icons.assignment),
            ),
            const SizedBox(width: 16),
            FloatingActionButton.extended(
              heroTag: 'skip_and_focus_button',
              onPressed: () {
                focusService.endBreak();
                focusService.startFocus();
              },
              icon: const Icon(Icons.fast_forward),
              label: const Text('Skip & Focus'),
            ),
          ],
        );

      case FocusUiState.goalMet:
        return FloatingActionButton.extended(
          heroTag: 'goal_met_button',
          onPressed: focusService.startBreak,
          icon: const Icon(Icons.free_breakfast),
          label: const Text('Start Rest'),
        );

      case FocusUiState.pausedRest:
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            FloatingActionButton(
              heroTag: 'discard_button_paused',
              onPressed: focusService.discardTimeAdjustment,
              tooltip: 'Discard',
              child: const Icon(Icons.close),
            ),
            const SizedBox(width: 16),
            FloatingActionButton.extended(
              heroTag: 'resume_button',
              onPressed: focusService.resumeRest,
              icon: const Icon(Icons.play_arrow),
              label: const Text('Resume'),
            ),
          ],
        );

      case FocusUiState.pausedFocus:
        return const SizedBox.shrink();
    }
  }

  // 显示调整时间的BottomSheet
  Future<bool?> _showAdjustmentSheet(FocusService focusService) {
    if (kDebugMode) print('[FocusView] _showAdjustmentSheet called.');
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Adjust Time', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  FilledButton.tonal(
                    onPressed: () => focusService.adjustTime(-30),
                    child: const Text('-30s'),
                  ),
                  Text(
                    '${focusService.deltaAdjustmentInSeconds >= 0 ? '+' : ''}${focusService.deltaAdjustmentInSeconds}s',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.onPrimaryContainer,
                        ),
                  ),
                  FilledButton.tonal(
                    onPressed: () => focusService.adjustTime(30),
                    child: const Text('+30s'),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              // "Skip to Rest" button, as it was in the old adjusting UI
              FilledButton.icon(
                onPressed: () {
                  Navigator.of(context).pop();
                  focusService.advancedBreak();
                },
                icon: const Icon(Icons.fast_forward),
                label: const Text('Skip to Rest'),
                style: FilledButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.tertiaryContainer,
                  foregroundColor: Theme.of(context).colorScheme.onTertiaryContainer,
                  minimumSize: const Size.fromHeight(50),
                ),
              ),
              const SizedBox(height: 20),
              // 操作按钮，现在移到工作表内部
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(false), // 返回 false 表示丢弃
                    child: const Text('Discard'),
                  ),
                  const SizedBox(width: 12),
                  FilledButton(
                    onPressed: () => Navigator.of(context).pop(true), // 返回 true 表示应用
                    child: const Text('Apply'),
                  ),
                ],
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  void _showSetGoalDialog(BuildContext context, FocusService focusService) {
    int minutes = (focusService.timerService.state.minWorkDuration ~/ 60);
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
                focusService.setMinFocusTime(value * 60); // 转换为秒
              }
              Navigator.pop(context);
            },
            child: const Text('Set Goal'),
          ),
        ],
      ),
    );
  }


  @override
  void dispose() {
    _focusService.removeListener(_onFocusServiceStateChanged);
    _progressController.dispose();
    super.dispose();
  }
}