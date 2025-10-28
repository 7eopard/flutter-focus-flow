import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dynamic_color/dynamic_color.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:material_symbols_icons/material_symbols_icons.dart';
import 'package:flutter_focus_flow/utils/theme.dart';
import 'package:flutter_focus_flow/services/focus_service.dart';
import 'package:flutter_focus_flow/views/focus_view.dart';
import 'package:flutter_focus_flow/views/tasks_view.dart';
import 'package:flutter_focus_flow/views/stats_view.dart';
import 'package:flutter_focus_flow/views/settings_view.dart';

import 'package:flutter_focus_flow/services/notification_service.dart';
import 'package:flutter_focus_flow/services/timer_service.dart';
import 'package:flutter_focus_flow/services/audio_service.dart';
import 'package:flutter_focus_flow/services/undo_service.dart';
import 'package:flutter_focus_flow/services/settings_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NotificationService().init();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<NotificationService>(create: (_) => NotificationService()),
        ChangeNotifierProvider<TimerService>(create: (_) => TimerService()),
        ChangeNotifierProvider<AudioService>(create: (_) => AudioService()),
        ChangeNotifierProvider<UndoService>(create: (_) => UndoService()),
        ChangeNotifierProvider<SettingsService>(create: (_) => SettingsService()),
        ChangeNotifierProxyProvider5<
            NotificationService,
            TimerService,
            AudioService,
            UndoService,
            SettingsService,
            FocusService>(
          create: (context) => FocusService(
            notificationService: Provider.of<NotificationService>(context, listen: false),
            timerService: Provider.of<TimerService>(context, listen: false),
            audioService: Provider.of<AudioService>(context, listen: false),
            undoService: Provider.of<UndoService>(context, listen: false),
            settingsService: Provider.of<SettingsService>(context, listen: false),
          ),
          update: (context, notificationService, timerService, audioService, undoService, settingsService, previousFocusService) =>
              FocusService(
            notificationService: notificationService,
            timerService: timerService,
            audioService: audioService,
            undoService: undoService,
            settingsService: settingsService,
          ),
        ),
      ],
      child: DynamicColorBuilder(
        builder: (lightColorScheme, darkColorScheme) {
          return MaterialApp(
            title: 'Focus Flow',
            theme: ThemeData(
              useMaterial3: true,
              colorScheme: lightColorScheme ?? AppTheme.lightTheme.colorScheme,
              textTheme: AppTheme.lightTheme.textTheme,
              navigationBarTheme: AppTheme.lightTheme.navigationBarTheme,
              navigationRailTheme: AppTheme.lightTheme.navigationRailTheme,
              cardTheme: AppTheme.lightTheme.cardTheme,
              elevatedButtonTheme: AppTheme.lightTheme.elevatedButtonTheme,
              floatingActionButtonTheme: AppTheme.lightTheme.floatingActionButtonTheme,
              progressIndicatorTheme: AppTheme.lightTheme.progressIndicatorTheme,
              pageTransitionsTheme: AppTheme.lightTheme.pageTransitionsTheme,
            ),
            darkTheme: ThemeData(
              useMaterial3: true,
              colorScheme: darkColorScheme ?? AppTheme.darkTheme.colorScheme,
              textTheme: AppTheme.darkTheme.textTheme,
              navigationBarTheme: AppTheme.darkTheme.navigationBarTheme,
              navigationRailTheme: AppTheme.darkTheme.navigationRailTheme,
              cardTheme: AppTheme.darkTheme.cardTheme,
              elevatedButtonTheme: AppTheme.darkTheme.elevatedButtonTheme,
              floatingActionButtonTheme: AppTheme.darkTheme.floatingActionButtonTheme,
              progressIndicatorTheme: AppTheme.darkTheme.progressIndicatorTheme,
              pageTransitionsTheme: AppTheme.darkTheme.pageTransitionsTheme,
            ),
            themeMode: ThemeMode.system,
            home: const HomePage(),
            debugShowCheckedModeBanner: false,
          );
        },
      ),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _selectedIndex = 0;

  static const List<Widget> _pages = <Widget>[
    FocusView(),
    TasksView(),
    StatsView(),
    SettingsView(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: _pages,
      ),
      bottomNavigationBar: NavigationBar(
        onDestinationSelected: (int index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        selectedIndex: _selectedIndex,
        destinations: [
          NavigationDestination(
            icon: Icon(
              Symbols.timelapse,
              size: 24,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.74),
            ),
            selectedIcon: Icon(
              Symbols.timelapse,
              size: 24,
              fill: 1,
              color: Theme.of(context).colorScheme.onSurface,
            ),
            label: 'Focus',
          ),
          NavigationDestination(
            icon: Icon(Icons.check_box_outlined),
            selectedIcon: Icon(Icons.check_box),
            label: 'Tasks',
          ),
          NavigationDestination(
            icon: Icon(Icons.insert_chart_outlined),
            selectedIcon: Icon(Icons.insert_chart),
            label: 'Stats',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}
