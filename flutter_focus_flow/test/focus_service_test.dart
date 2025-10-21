// flutter_focus_flow/test/focus_service_test.dart

import 'package:flutter_focus_flow/services/focus_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('FocusService Tests', () {
    late FocusService focusService;

    setUp(() {
      focusService = FocusService();
    });

    tearDown(() {
      focusService.dispose();
    });

    test('Initial state should be idle', () {
      expect(focusService.state.uiState, FocusUiState.idle);
      expect(focusService.state.isActive, false);
      expect(focusService.state.mode, FocusMode.work);
      expect(focusService.state.timeInSeconds, 0);
    });

    test('startFocus should change state to runningFocus', () {
      focusService.startFocus();
      
      expect(focusService.state.uiState, FocusUiState.runningFocus);
      expect(focusService.state.isActive, true);
      expect(focusService.state.mode, FocusMode.work);
    });

    test('pauseFocus should save state and change to adjusting', () {
      // First start focusing
      focusService.startFocus();
      // Simulate elapsed time by directly updating state
      focusService.updateStateForTesting(timeInSeconds: 300); // 5 minutes
      expect(focusService.state.uiState, FocusUiState.runningFocus);
      
      // Pause the focus
      FocusState previousState = focusService.state;
      focusService.pauseFocus();
      
      expect(focusService.state.uiState, FocusUiState.adjusting);
      expect(focusService.state.isActive, false);
      expect(focusService.previousState, previousState);
    });

    test('applyTimeAdjustment should update time and save previous state', () {
      focusService.startFocus();
      
      // Use adjustTime to change the deltaAdjustment value
      focusService.updateStateForTesting(
        uiState: FocusUiState.adjusting,
        deltaAdjustment: 120, // +2 minutes
      );
      
      int initialTime = focusService.state.timeInSeconds;
      focusService.applyTimeAdjustment();
      
      expect(focusService.state.timeInSeconds, initialTime + 120);
      expect(focusService.state.deltaAdjustment, null);
      expect(focusService.state.uiState, FocusUiState.runningFocus);
      expect(focusService.previousState, isNotNull);
    });

    test('undo should restore previous state', () {
      // Simulate a state change sequence that would save a previous state
      focusService.startFocus();
      int initialTime = focusService.state.timeInSeconds;
      
      // Manually set some values that will be restored
      FocusState previousState = focusService.state.copyWith(
        timeInSeconds: initialTime + 300, // Add 5 minutes
        isActive: true, 
        uiState: FocusUiState.runningFocus,
      );
      
      // Change state to simulate a different state
      focusService.updateStateForTesting(
        timeInSeconds: initialTime + 600, // Add 10 minutes
        isActive: false,
        uiState: FocusUiState.adjusting,
      );
      
      // Set the previous state for testing
      focusService.previousStateForTesting = previousState;
      focusService.undo();
      
      expect(focusService.state.timeInSeconds, previousState.timeInSeconds);
      expect(focusService.state.isActive, previousState.isActive);
      expect(focusService.state.uiState, previousState.uiState);
      expect(focusService.previousState, null);
    });

    test('earnedBreakSeconds should calculate correctly', () {
      // Update time using the public test method
      focusService.updateStateForTesting(timeInSeconds: 900); // 15 minutes
      
      // Every 5 minutes of work should earn 1 minute of break
      // 15 minutes = 3 * 5 minutes = 3 minutes of break = 180 seconds
      expect(focusService.earnedBreakSeconds, 180);
    });

    test('isBreakUnlocked should return true when time reaches minWorkDuration', () {
      int minDuration = focusService.state.minWorkDuration;
      
      // Test with time below min duration
      focusService.updateStateForTesting(timeInSeconds: minDuration - 1);
      expect(focusService.isBreakUnlocked, false);
      
      // Test with time equal to min duration
      focusService.updateStateForTesting(timeInSeconds: minDuration);
      expect(focusService.isBreakUnlocked, true);
      
      // Test with time above min duration
      focusService.updateStateForTesting(timeInSeconds: minDuration + 1);
      expect(focusService.isBreakUnlocked, true);
    });
    
    test('advancedBreak should save state and start break', () {
      focusService.startFocus();
      int originalTime = focusService.state.timeInSeconds;
      
      // This method should be called when in adjusting state
      focusService.updateStateForTesting(
        timeInSeconds: 300, // 5 minutes of work
        uiState: FocusUiState.adjusting,
        mode: FocusMode.work,
      );
      
      focusService.advancedBreak();
      
      // Should have updated to min work duration (as earned break time)
      expect(focusService.state.timeInSeconds, 
          (focusService.state.minWorkDuration / 5).floor());
      
      // Should have switched to rest mode
      expect(focusService.state.mode, FocusMode.rest);
      expect(focusService.state.uiState, FocusUiState.runningRest);
    });
  });
}