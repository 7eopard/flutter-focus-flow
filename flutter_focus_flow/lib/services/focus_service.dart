import 'package:flutter/foundation.dart';
import 'package:flutter_focus_flow/services/timer_service.dart';
import 'package:flutter_focus_flow/services/audio_service.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:meta/meta.dart';
import 'package:flutter_focus_flow/services/notification_service.dart';
import 'package:flutter_focus_flow/services/undo_service.dart';
import 'package:flutter_focus_flow/services/settings_service.dart';



class FocusService extends ChangeNotifier {
  final NotificationService _notificationService;
  final TimerService _timerService;
  final AudioService _audioService;
  final UndoService _undoService;
  final SettingsService _settingsService;
  bool _isDisposed = false;

  FocusService({required NotificationService notificationService, required TimerService timerService, required AudioService audioService, required UndoService undoService, required SettingsService settingsService})
      : _notificationService = notificationService,
        _timerService = timerService,
        _audioService = audioService,
        _undoService = undoService,
        _settingsService = settingsService;

  FocusState get state => _timerService.state;

  double get progressValue => _timerService.progressValue;

  TimerService get timerService => _timerService;


  // 获取格式化的时间显示
  String get formattedTime {
    int displayTime;
    
    if (_timerService.state.displayMode == DisplayMode.countdown) {
      if (_timerService.state.mode == FocusMode.work) {
        displayTime = (_timerService.state.minWorkDuration - _timerService.state.timeInSeconds).clamp(0, _timerService.state.minWorkDuration);
      } else {
        displayTime = _timerService.state.timeInSeconds;
      }
    } else {
      displayTime = _timerService.state.timeInSeconds;
    }
    
    final minutes = (displayTime / 60).floor();
    final seconds = displayTime % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  // 是否达到最小工作目标
  bool get isGoalReached => _timerService.state.timeInSeconds >= _timerService.state.minWorkDuration;

  // 积累的休息时间（每专注5分钟获得1分钟休息时间）
  int get earnedBreakSeconds => (_timerService.state.timeInSeconds / 5).floor();
  
  // 休息是否已解锁（达到最小专注时间后解锁）
  bool get isBreakUnlocked => _timerService.state.timeInSeconds >= _timerService.state.minWorkDuration;
  
  // 获取当前调整后的时间
  int get adjustedTimeInSeconds {
    if (_timerService.state.timeAdjustment != null) {
      return _timerService.state.timeInSeconds + _timerService.state.timeAdjustment!;
    }
    return _timerService.state.timeInSeconds;
  }
  
  // 获取格式化调整后的时间显示（包含delta调整）
  String get formattedAdjustedTime {
    final adjustedTime = _timerService.state.timeAdjustment != null 
        ? _timerService.state.timeInSeconds + _timerService.state.timeAdjustment! 
        : _timerService.state.timeInSeconds;
    final minutes = (adjustedTime / 60).floor();
    final seconds = adjustedTime % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }
  
  // 获取格式化的delta时间显示
  String get formattedDeltaAdjustment {
    if (_timerService.state.deltaAdjustment == null) {
      return '${(_timerService.state.timeInSeconds / 60).floor().toString().padLeft(2, '0')}:${(_timerService.state.timeInSeconds % 60).toString().padLeft(2, '0')}';
    }
    final adjustedTime = _timerService.state.timeInSeconds + _timerService.state.deltaAdjustment!;
    final minutes = (adjustedTime / 60).floor();
    final seconds = adjustedTime % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }
  
  // 获取delta时间调整
  int get deltaAdjustmentInSeconds {
    if (_timerService.state.deltaAdjustment != null) {
      return _timerService.state.deltaAdjustment!;
    }
    return 0;
  }
  
  // 之前的状态是否应用了调整
  bool get hasAppliedAdjustment => _timerService.state.hasAppliedAdjustment;
  
  // 检查调整后是否达到最小工作目标
  bool get isAdjustedGoalReached => adjustedTimeInSeconds >= _timerService.state.minWorkDuration;




  


  void startFocus() {
    // If already running, cancel current timer to avoid multiple timer instances
    if (_timerService.state.isActive) {
      _timerService.pauseTimer();
    }

    // If it's the first start, record start time
    if (_timerService.state.timeInSeconds == 0 && _timerService.state.mode == FocusMode.work) {
      // _sessionStartTime = DateTime.now(); // This will be handled by a separate service later
      _timerService.resetMillisecondCounter();
    }

    // If previously paused, calculate pause duration
    // This will be handled by a separate service later
    // if (_pauseStartTime != null) {
    //   final pauseDuration = DateTime.now().difference(_pauseStartTime!).inSeconds;
    //   _timerService.updateState(sessionTotalPausedTime: _timerService.state.sessionTotalPausedTime + pauseDuration);
    //   _pauseStartTime = null;
    // }

    _timerService.startTimer();
    _timerService.setUiState(FocusUiState.runningFocus);

    // Listen to timer service changes
    _timerService.addListener(_onTimerServiceStateChanged);
  }

  void _onTimerServiceStateChanged() {
    if (_isDisposed) return; // Prevent execution if FocusService is disposed
    final state = _timerService.state;
    // Update notification
    if (state.mode == FocusMode.work) {
      _notificationService.showProgressNotification(
        title: 'Focusing...',
        body: 'Goal in $formattedTime',
        maxProgress: state.minWorkDuration,
        progress: state.timeInSeconds,
      );
    } else {
      _notificationService.showProgressNotification(
        title: 'On a Break',
        body: 'Time remaining: $formattedTime',
        maxProgress: state.breakTotalDuration,
        progress: state.timeInSeconds,
      );
    }

    // Check if goal reached (work mode)
    if (state.mode == FocusMode.work && state.timeInSeconds >= state.minWorkDuration && state.uiState != FocusUiState.goalMet) {
      _timerService.setUiState(FocusUiState.goalMet);
      _notificationService.cancelOngoingNotification();
      _notificationService.showStandardNotification(
        title: 'Goal Achieved!',
        body: 'Congratulations on reaching your goal!',
      );
      _audioService.playNotificationSound();
    }

    // Check if break finished (rest mode)
    if (state.mode == FocusMode.rest && state.timeInSeconds <= 0) {
      _notificationService.showStandardNotification(
        title: 'Break Over',
        body: 'Time to get back to focus!',
      );
            _audioService.playNotificationSound();      endBreak(); // Automatically switch back to work mode
    }

    notifyListeners(); // Notify FocusService listeners about changes
  }

  void pauseFocus() {
    if (kDebugMode) print('[FocusService] pauseFocus called. Setting UI state to adjusting.');
    if (!_timerService.state.isActive) return; // 如果已经暂停，则不执行操作

    _notificationService.cancelOngoingNotification();

    // 在暂停前保存当前状态，以便undo可以恢复到暂停前的运行状态
    _undoService.savePrePauseState(_timerService.state);

    _timerService.pauseTimer();
    // _pauseStartTime = DateTime.now(); // This will be handled by a separate service later
    _timerService.setUiState(FocusUiState.adjusting); // 直接进入调整状态
    _timerService.setDeltaAdjustment(0); // Initialize delta adjustment value
  }
  


  void toggleFocus() {
    if (_timerService.state.isActive) {
      pauseFocus();
    } else {
      startFocus();
    }
  }

  void resetFocus() {
    _timerService.resetTimer();
    // _sessionStartTime = null; // This will be handled by a separate service later
    // _pauseStartTime = null; // This will be handled by a separate service later
    _notificationService.cancelAllNotifications();
    // _updateState( // This will be handled by TimerService
    //   timeInSeconds: _timerService.state.mode == FocusMode.work ? 0 : _timerService.state.breakTotalDuration,
    //   isActive: false,
    //   earnedBreakSeconds: 0,
    //   isBreakUnlocked: false,
    //   timeAdjustment: null,
    //   sessionPauseCount: 0,
    //   sessionTotalPausedTime: 0,
    //   sessionAdjustments: [],
    //   uiState: FocusUiState.idle,
    // );
  }

  void startBreak() {
    if (_timerService.state.mode == FocusMode.work && _timerService.state.isBreakUnlocked) {
      // 如果有临时调整，先应用调整
      if (_timerService.state.timeAdjustment != null) {
        applyTimeAdjustment();
      }
      
      final breakDuration = earnedBreakSeconds; // Use the getter from FocusService
      _timerService.setMode(FocusMode.rest);
      _timerService.setBreakTotalDuration(breakDuration);
      _timerService.setTime(breakDuration);
      _timerService.setUiState(FocusUiState.runningRest); // 新增：更新UI状态为休息中
      startFocus(); // 自动开始休息计时
    }
  }

  void pauseRest() {
    if (_timerService.state.uiState != FocusUiState.runningRest) return;
    _timerService.pauseTimer();
    _notificationService.cancelOngoingNotification();
    _timerService.setUiState(FocusUiState.pausedRest); // 进入暂停休息状态，而不是调整状态
  }

  void resumeRest() {
    if (_timerService.state.uiState != FocusUiState.pausedRest) return;
    _timerService.setUiState(FocusUiState.runningRest); // 恢复到运行休息状态
    startFocus(); // 继续倒计时
  }

  void startNextFocusSession() {
    endBreak();
    startFocus();
  }

  void endBreak() {
    _timerService.resetTimer();
    // _sessionStartTime = null; // This will be handled by a separate service later
    // _pauseStartTime = null; // This will be handled by a separate service later
    _notificationService.cancelAllNotifications();
    _timerService.setMode(FocusMode.work);
    _timerService.setTime(0);
    _timerService.setBreakTotalDuration(0);
    _timerService.setEarnedBreakSeconds(0);
    _timerService.setIsBreakUnlocked(false);
    _timerService.setTimeAdjustment(null);
    _timerService.setSessionPauseCount(0);
    _timerService.setSessionTotalPausedTime(0);
    _timerService.setSessionAdjustments([]);
    _timerService.setUiState(FocusUiState.idle); // 新增：更新UI状态为初始
  }

  // 设置最小专注时间（在设置页面使用）
  void setMinFocusTime(int seconds) {
    _settingsService.setMinWorkDuration(seconds);
  }
  
  // 设置显示模式（倒计时/正计时）
  void setDisplayMode(DisplayMode mode) {
    _settingsService.setDisplayMode(mode);
  }
  


  // 开始时间调整 - 现在不再需要此方法，因为暂停后直接进入调整模式
  // 保留此方法是为了与UI层保持兼容性，但实际已不需要
  void beginTimeAdjustment() {
    if (_timerService.state.uiState != FocusUiState.adjusting) return; // 只能在调整时调整
    _timerService.setDeltaAdjustment(0);
  }

  // 调整时间（在暂停时）
  void adjustTime(int seconds) {
    if (_timerService.state.deltaAdjustment != null) {
      final newDelta = _timerService.state.deltaAdjustment! + seconds;
      _timerService.setDeltaAdjustment(newDelta);
    }
  }

  // 应用时间调整并恢复计时
  void applyTimeAdjustment() {
    if (_timerService.state.deltaAdjustment != null) {
      // 使用deltaAdjustment来调整时间
      final adjustedTime = _timerService.state.timeInSeconds + _timerService.state.deltaAdjustment!;
      final newEarnedBreakSeconds = (adjustedTime / 5).floor();
      final isBreakUnlocked = adjustedTime >= _timerService.state.minWorkDuration;
      
      // 在应用调整前保存当前状态，以便提供撤销功能
      // 这里我们不希望覆盖暂停前的状态，因为undo应该回到暂停前的状态
      _undoService.saveState(_timerService.state);

      _timerService.setTime(adjustedTime);
      _timerService.setTimeAdjustment(null); // 清除临时调整
      _timerService.setDeltaAdjustment(null); // 清除delta调整
      _timerService.setEarnedBreakSeconds(newEarnedBreakSeconds);
      _timerService.setIsBreakUnlocked(isBreakUnlocked);
      _timerService.setHasAppliedAdjustment(_timerService.state.deltaAdjustment != 0); // 设置已应用调整标志
    }
    startFocus(); // 应用后恢复计时
  }

  // 丢弃时间调整并恢复计时
  void discardTimeAdjustment() {
    undo();
  }

  // 高级休息：将当前时间调整到最小专注时间并立即开始休息
  void advancedBreak() {
    if (_timerService.state.uiState != FocusUiState.adjusting || _timerService.state.mode != FocusMode.work) return; // 只能在调整专注时使用

        _undoService.saveState(_timerService.state);
    // 调整当前时间到最小专注时间
    final newEarnedBreakSeconds = (_timerService.state.minWorkDuration / 5).floor();
    _timerService.setTime(_timerService.state.minWorkDuration);
    _timerService.setTimeAdjustment(null); // 清除任何临时调整
    _timerService.setDeltaAdjustment(null); // 清除任何delta调整
    _timerService.setEarnedBreakSeconds(newEarnedBreakSeconds);
    _timerService.setIsBreakUnlocked(true);
    
    // 立即开始休息
    startBreak();
  }

  void setTime(int seconds) {
    _timerService.setTime(seconds);
  }

  // 记录时间调整
  void recordAdjustment(int amount) {
    if (amount == 0) return;
    final newAdjustments = List<TimeAdjustment>.from(_timerService.state.sessionAdjustments);
    newAdjustments.add(TimeAdjustment(amount: amount, timestamp: DateTime.now()));
    _timerService.setSessionAdjustments(newAdjustments);
  }

  // 获取会话统计数据
  int get sessionActualDuration {
    // if (_sessionStartTime == null) return 0;
    // final totalDuration = DateTime.now().difference(_sessionStartTime!).inSeconds;
    // return totalDuration - _timerService.state.sessionTotalPausedTime;
    return 0; // Placeholder for now
  }

  // 撤销上一步操作
  void undo() {
    final stateToRestore = _undoService.restoreState();
    if (stateToRestore == null) return;

    // 关键修复：在进行批量状态更新之前，暂时移除监听器，以防止在状态不一致时触发UI重建。
    // 这是为了避免在多个setter调用期间发生所谓的“通知风暴”。
    _timerService.removeListener(_onTimerServiceStateChanged);

    final wasActive = stateToRestore.isActive;

    // 确保在恢复UI状态之前，先恢复计时器的运行状态
    if (wasActive) {
      _timerService.startTimer();
    }
    
    _timerService.setTime(stateToRestore.timeInSeconds);
    _timerService.setMode(stateToRestore.mode);
    _timerService.setUiState(stateToRestore.uiState);
    _timerService.setBreakTotalDuration(stateToRestore.breakTotalDuration);
    _timerService.setMinWorkDuration(stateToRestore.minWorkDuration);
    _timerService.setSessionPauseCount(stateToRestore.sessionPauseCount);
    _timerService.setSessionTotalPausedTime(stateToRestore.sessionTotalPausedTime);
    _timerService.setSessionAdjustments(stateToRestore.sessionAdjustments);
    _timerService.setTimeAdjustment(stateToRestore.timeAdjustment);
    _timerService.setDeltaAdjustment(stateToRestore.deltaAdjustment);
    _timerService.setHasAppliedAdjustment(false); // 重置已应用调整标志
    
    if (!wasActive) {
      // 如果之前是暂停的，确保计时器已停止
      _timerService.pauseTimer();
    }

    // 状态恢复完成后，重新添加监听器并通知UI进行单次、一致的更新。
    _timerService.addListener(_onTimerServiceStateChanged);
    notifyListeners();
  }



  // 重置计时器
  void resetTimer() {
    _timerService.resetTimer();
  }

  // 跳过当前阶段
  void skipTimer() {
    // 保存当前状态以便撤销
    _undoService.saveState(_timerService.state);

    if (_timerService.state.mode == FocusMode.work) {
      // 如果在专注模式，完成专注并开始休息
      final newEarnedBreakSeconds = (_timerService.state.minWorkDuration / 5).floor();
      _timerService.setTime(_timerService.state.minWorkDuration);
      _timerService.setEarnedBreakSeconds(newEarnedBreakSeconds);
      _timerService.setIsBreakUnlocked(true);
      startBreak(); // 跳过专注直接开始休息
    } else if (_timerService.state.mode == FocusMode.rest) {
      // 如果在休息模式，完成休息并开始下一轮专注
      endBreak();
      startFocus(); // 跳过休息直接开始专注
    }
  }



  @override
  void dispose() {
    _timerService.removeListener(_onTimerServiceStateChanged);
    _isDisposed = true;
    super.dispose();
  }
}