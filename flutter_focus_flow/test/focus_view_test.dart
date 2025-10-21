// flutter_focus_flow/test/focus_view_test.dart

import 'package:flutter/material.dart';
import 'package:flutter_focus_flow/services/focus_service.dart';
import 'package:flutter_focus_flow/views/focus_view.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

void main() {
  group('FocusView Tests', () {
    testWidgets('FocusView shows correct UI for idle state', (WidgetTester tester) async {
      final focusService = FocusService();
      
      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider.value(
            value: focusService,
            child: FocusView(),
          ),
        ),
      );
      
      // Verify that the idle state UI elements are present
      expect(find.text('Set Goal'), findsOneWidget);
      expect(find.text('Start'), findsOneWidget);
      expect(find.text('Focus Time'), findsOneWidget);
      expect(find.text('00:00'), findsOneWidget);
    });

    testWidgets('FocusView shows correct UI for runningFocus state', (WidgetTester tester) async {
      final focusService = FocusService();
      // Start the focus timer to trigger the runningFocus state
      focusService.startFocus();
      
      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider.value(
            value: focusService,
            child: FocusView(),
          ),
        ),
      );
      
      // Verify that the runningFocus state UI elements are present
      expect(find.text('Focus Time'), findsOneWidget);
      expect(find.text('00:00'), findsOneWidget); // Initial time
      expect(find.text('Pause'), findsOneWidget);
      expect(find.text('Stop'), findsOneWidget);
    });

    testWidgets('FocusView shows correct UI for runningRest state', (WidgetTester tester) async {
      final focusService = FocusService();
      // Create a new service instance and set it directly to runningRest
      focusService.updateStateForTesting(
        uiState: FocusUiState.runningRest,
        timeInSeconds: 300, // 5 minutes remaining
        mode: FocusMode.rest,
        isActive: true,
      );
      
      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider.value(
            value: focusService,
            child: FocusView(),
          ),
        ),
      );
      
      // Verify that the runningRest state UI elements are present
      expect(find.text('Rest Time'), findsOneWidget);
      expect(find.text('05:00'), findsOneWidget);
      expect(find.text('Back to Focus'), findsOneWidget);
      expect(find.text('Skip & Focus'), findsOneWidget);
    });

    testWidgets('FocusView shows correct UI for adjusting state', (WidgetTester tester) async {
      final focusService = FocusService();
      // Set the state to adjusting with a delta adjustment
      focusService.updateStateForTesting(
        uiState: FocusUiState.adjusting,
        timeInSeconds: 300, // 5 minutes
        deltaAdjustment: 60, // +1 minute
      );
      
      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider.value(
            value: focusService,
            child: FocusView(),
          ),
        ),
      );
      
      // Verify that the adjusting state UI elements are present
      expect(find.text('06:00'), findsOneWidget); // Shows adjusted time
      expect(find.text('-30s'), findsOneWidget);
      expect(find.text('+30s'), findsOneWidget);
      expect(find.text('Complete & Rest'), findsOneWidget);
      expect(find.text('Apply'), findsOneWidget);
    });

    testWidgets('FocusView shows correct UI for goalMet state', (WidgetTester tester) async {
      final focusService = FocusService();
      // Set the state to goalMet
      focusService.updateStateForTesting(
        uiState: FocusUiState.goalMet,
        timeInSeconds: focusService.state.minWorkDuration, // At minimum duration
        mode: FocusMode.work,
        isActive: false,
      );
      
      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider.value(
            value: focusService,
            child: FocusView(),
          ),
        ),
      );
      
      // Verify that the goalMet state UI elements are present
      expect(find.text('Goal Reached!'), findsOneWidget);
      expect(find.text('Start Rest'), findsOneWidget);
    });

    testWidgets('Start button triggers startFocus', (WidgetTester tester) async {
      final focusService = FocusService();
      
      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider.value(
            value: focusService,
            child: FocusView(),
          ),
        ),
      );
      
      await tester.tap(find.text('Start'));
      await tester.pump();
      
      expect(focusService.state.uiState, FocusUiState.runningFocus);
    });

    testWidgets('Pause button triggers pauseFocus', (WidgetTester tester) async {
      final focusService = FocusService();
      // Start and run for a while to get into runningFocus state
      focusService.startFocus();
      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider.value(
            value: focusService,
            child: FocusView(),
          ),
        ),
      );
      
      // Verify initial state
      expect(focusService.state.uiState, FocusUiState.runningFocus);
      
      await tester.tap(find.text('Pause'));
      await tester.pump();
      
      expect(focusService.state.uiState, FocusUiState.adjusting);
    });

    testWidgets('Back to Focus button triggers endBreak', (WidgetTester tester) async {
      final focusService = FocusService();
      // Set initial state to runningRest
      focusService.updateStateForTesting(
        uiState: FocusUiState.runningRest,
        mode: FocusMode.rest,
        isActive: true,
      );
      
      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider.value(
            value: focusService,
            child: FocusView(),
          ),
        ),
      );
      
      await tester.tap(find.text('Back to Focus'));
      await tester.pump();
      
      expect(focusService.state.mode, FocusMode.work);
      expect(focusService.state.uiState, FocusUiState.idle);
    });

    testWidgets('Undo button appears when previousState exists', (WidgetTester tester) async {
      final focusService = FocusService();
      
      // Initially should not show undo button
      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider.value(
            value: focusService,
            child: FocusView(),
          ),
        ),
      );
      
      expect(find.text('Undo'), findsNothing);
      
      // Set a previous state
      FocusState previousState = focusService.state.copyWith(
        timeInSeconds: 600,
        isActive: true,
        uiState: FocusUiState.runningFocus,
      );
      focusService.previousStateForTesting = previousState;
      
      // Rebuild the widget to reflect the state change
      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider.value(
            value: focusService,
            child: FocusView(),
          ),
        ),
      );
      
      // Now the undo button should be visible if the conditions are met
      // The undo button appears when _focusService.previousState != null 
      // and (_focusService.deltaAdjustmentInSeconds != 0 || _focusService.hasAppliedAdjustment)
      expect(find.text('Undo'), findsOneWidget);
    });

    testWidgets('Complete & Rest button triggers advancedBreak', (WidgetTester tester) async {
      final focusService = FocusService();
      // Set initial state to adjusting
      focusService.updateStateForTesting(
        uiState: FocusUiState.adjusting,
        mode: FocusMode.work,
      );
      
      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider.value(
            value: focusService,
            child: FocusView(),
          ),
        ),
      );
      
      await tester.tap(find.text('Complete & Rest'));
      await tester.pump();
      
      // Should be in runningRest state after advancedBreak
      expect(focusService.state.mode, FocusMode.rest);
      expect(focusService.state.uiState, FocusUiState.runningRest);
    });
  });
}