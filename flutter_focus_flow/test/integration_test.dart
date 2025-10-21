// flutter_focus_flow/test/integration_test.dart

import 'package:flutter/material.dart';
import 'package:flutter_focus_flow/services/focus_service.dart';
import 'package:flutter_focus_flow/views/focus_view.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

void main() {
  group('Integration Tests', () {
    testWidgets('Complete focus to rest flow with UI interactions', (WidgetTester tester) async {
      final focusService = FocusService();
      
      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider.value(
            value: focusService,
            child: FocusView(),
          ),
        ),
      );
      
      // Initial state should be idle
      expect(find.text('Set Goal'), findsOneWidget);
      expect(find.text('Start'), findsOneWidget);
      expect(focusService.state.uiState, FocusUiState.idle);
      
      // Start focusing
      await tester.tap(find.text('Start'));
      await tester.pump();
      
      // Should be in runningFocus state
      expect(focusService.state.uiState, FocusUiState.runningFocus);
      expect(focusService.state.isActive, true);
      expect(find.text('Pause'), findsOneWidget);
      
      // Manually set time to reach goal
      focusService.updateStateForTesting(
        timeInSeconds: focusService.state.minWorkDuration,
        uiState: FocusUiState.goalMet,
      );
      await tester.pump();
      
      // Should be in goalMet state
      expect(find.text('Goal Reached!'), findsOneWidget);
      expect(find.text('Start Rest'), findsOneWidget);
      expect(focusService.state.uiState, FocusUiState.goalMet);
      
      // Start rest
      await tester.tap(find.text('Start Rest'));
      await tester.pump();
      
      // Should be in runningRest state
      expect(focusService.state.uiState, FocusUiState.runningRest);
      expect(focusService.state.mode, FocusMode.rest);
      expect(focusService.state.isActive, true);
      expect(find.text('Back to Focus'), findsOneWidget);
      expect(find.text('Skip & Focus'), findsOneWidget);
      
      // Return to focus
      await tester.tap(find.text('Back to Focus'));
      await tester.pump();
      
      // Should be back in idle state (as endBreak resets to idle)
      expect(focusService.state.uiState, FocusUiState.idle);
      expect(focusService.state.mode, FocusMode.work);
      expect(find.text('Set Goal'), findsOneWidget);
    });

    testWidgets('Time adjustment flow with UI interactions', (WidgetTester tester) async {
      final focusService = FocusService();
      
      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider.value(
            value: focusService,
            child: FocusView(),
          ),
        ),
      );
      
      // Start focusing
      focusService.startFocus();
      // Manually advance time for testing
      focusService.updateStateForTesting(timeInSeconds: 300); // 5 minutes
      await tester.pump();
      
      // Pause focusing to enter adjustment mode
      focusService.pauseFocus();
      await tester.pump();
      
      // Should be in adjusting state
      expect(focusService.state.uiState, FocusUiState.adjusting);
      expect(find.byType(OutlinedButton), findsNWidgets(2)); // -30s and +30s buttons
      
      // Update delta adjustment for testing
      focusService.updateStateForTesting(deltaAdjustment: 30); // +30s from state change
      
      // Verify delta adjustment has been applied
      expect(focusService.state.deltaAdjustment, 30);
      
      // Apply the adjustment
      await tester.tap(find.text('Apply'));
      await tester.pump();
      
      // Time should be updated and we should be back in runningFocus
      expect(focusService.state.timeInSeconds, 300 + 30); // original 300 + 30 adjustment
      expect(focusService.state.deltaAdjustment, null);
      expect(focusService.state.uiState, FocusUiState.runningFocus);
      
      // Verify undo is available
      expect(focusService.previousState, isNotNull);
      expect(find.text('Undo'), findsOneWidget);
      
      // Undo the adjustment
      await tester.tap(find.text('Undo'));
      await tester.pump();
      
      // Should be back to original time
      expect(focusService.state.timeInSeconds, 300);
      expect(focusService.previousState, null);
    });

    testWidgets('Complete rest to focus flow with UI interactions', (WidgetTester tester) async {
      final focusService = FocusService();
      
      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider.value(
            value: focusService,
            child: FocusView(),
          ),
        ),
      );
      
      // Set up rest state directly
      focusService.updateStateForTesting(
        timeInSeconds: 300, // 5 minutes of rest remaining
        mode: FocusMode.rest,
        uiState: FocusUiState.runningRest,
        isActive: true,
        breakTotalDuration: 300,
      );
      await tester.pump();
      
      // Should be in runningRest state
      expect(focusService.state.uiState, FocusUiState.runningRest);
      expect(focusService.state.mode, FocusMode.rest);
      expect(find.text('Back to Focus'), findsOneWidget);
      expect(find.text('Skip & Focus'), findsOneWidget);
      
      // Click "Back to Focus" which should end break
      await tester.tap(find.text('Back to Focus'));
      await tester.pump();
      
      // Should be back to idle (endBreak resets to idle)
      expect(focusService.state.uiState, FocusUiState.idle);
      expect(focusService.state.mode, FocusMode.work);
      expect(find.text('Set Goal'), findsOneWidget);
      
      // Now start focusing again
      await tester.tap(find.text('Start'));
      await tester.pump();
      
      expect(focusService.state.uiState, FocusUiState.runningFocus);
      expect(focusService.state.isActive, true);
      expect(find.text('Pause'), findsOneWidget);
    });

    testWidgets('Advanced break (Complete & Rest) flow', (WidgetTester tester) async {
      final focusService = FocusService();
      
      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider.value(
            value: focusService,
            child: FocusView(),
          ),
        ),
      );
      
      // Start focusing
      focusService.startFocus();
      // Manually set initial time
      focusService.updateStateForTesting(timeInSeconds: 300); // 5 minutes
      await tester.pump();
      
      // Pause to enter adjustment mode
      focusService.pauseFocus();
      await tester.pump();
      
      // Should be in adjusting state
      expect(focusService.state.uiState, FocusUiState.adjusting);
      
      // Click "Complete & Rest" (advancedBreak)
      await tester.tap(find.text('Complete & Rest'));
      await tester.pump();
      
      // Should be in runningRest state with time set appropriately
      expect(focusService.state.uiState, FocusUiState.runningRest);
      expect(focusService.state.mode, FocusMode.rest);
    });

    testWidgets('Pause and resume rest functionality', (WidgetTester tester) async {
      final focusService = FocusService();
      
      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider.value(
            value: focusService,
            child: FocusView(),
          ),
        ),
      );
      
      // Set up rest state
      focusService.updateStateForTesting(
        timeInSeconds: 300, // 5 minutes of rest remaining
        mode: FocusMode.rest,
        uiState: FocusUiState.runningRest,
        isActive: true,
        breakTotalDuration: 300,
      );
      await tester.pump();
      
      // Pause rest
      focusService.pauseRest();
      await tester.pump();
      
      // Should be in pausedRest state
      expect(focusService.state.uiState, FocusUiState.pausedRest);
      expect(focusService.state.isActive, false);
      
      // Resume rest
      focusService.resumeRest();
      await tester.pump();
      
      // Should be back in runningRest state
      expect(focusService.state.uiState, FocusUiState.runningRest);
      expect(focusService.state.isActive, true);
    });
  });
}