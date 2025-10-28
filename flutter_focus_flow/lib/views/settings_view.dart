import 'package:flutter/material.dart';
import 'package:material_symbols_icons/material_symbols_icons.dart';
import 'package:flutter/services.dart';
import 'package:flutter_focus_flow/services/focus_service.dart';
import 'package:flutter_focus_flow/services/timer_service.dart';
import 'package:flutter_focus_flow/utils/theme.dart';
import 'package:flutter_focus_flow/views/dev_view.dart';
import 'package:provider/provider.dart';

class SettingsView extends StatefulWidget {
  const SettingsView({super.key});

  @override
  State<SettingsView> createState() => _SettingsViewState();
}

class _SettingsViewState extends State<SettingsView> with TickerProviderStateMixin {
  late AnimationController _fabAnimationController;
  late AnimationController _borderAnimationController;

  @override
  void initState() {
    super.initState();
    _fabAnimationController = AnimationController(
      duration: AppTheme.shortAnimation,
      vsync: this,
    );
    _borderAnimationController = AnimationController(
      duration: AppTheme.mediumAnimation,
      vsync: this,
    );
    _fabAnimationController.forward();
  }

  @override
  void dispose() {
    _fabAnimationController.dispose();
    _borderAnimationController.dispose();
    super.dispose();
  }
  void _resetAppState(FocusService focusService) {
    focusService.resetFocus();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(
                Symbols.check_circle_outline,
                color: Theme.of(context).colorScheme.onSurface,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Application has been reset to idle state',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ),
            ],
          ),
          backgroundColor: Theme.of(context).colorScheme.surface,
          elevation: 6,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  Widget _buildSettingsCard(
    BuildContext context,
    {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required Widget trailing,
    required VoidCallback onTap,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    
    return AnimatedContainer(
      duration: AppTheme.shortAnimation,
      curve: Curves.easeInOut,
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          splashColor: colorScheme.primary.withOpacity(0.1),
          highlightColor: colorScheme.primary.withOpacity(0.05),
          child: Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceVariant,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    icon,
                    color: iconColor,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: textTheme.titleMedium?.copyWith(
                          color: colorScheme.onSurface,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                trailing,
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final focusService = Provider.of<FocusService>(context);
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Settings',
          style: textTheme.headlineMedium?.copyWith(
            color: colorScheme.onSurface,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
        elevation: 0,
        scrolledUnderElevation: 1,
        backgroundColor: colorScheme.surface,
        surfaceTintColor: colorScheme.surfaceTint,
        shadowColor: Theme.of(context).shadowColor,
        shape: const Border(
          bottom: BorderSide(
            color: Colors.transparent,
            width: 0,
          ),
        ),
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header section with user info
                  Row(
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              colorScheme.primary,
                              colorScheme.tertiary,
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: colorScheme.shadow.withOpacity(0.15),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Icon(
                          Icons.person,
                          color: colorScheme.onPrimary,
                          size: 32,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Focus Flow',
                              style: textTheme.headlineSmall?.copyWith(
                                color: colorScheme.onSurface,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Your productivity companion',
                              style: textTheme.bodyMedium?.copyWith(
                                color: colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  
                  // Preferences section
                  Text(
                    'Preferences',
                    style: textTheme.titleLarge?.copyWith(
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
          
          // Settings cards
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _buildSettingsCard(
                  context,
                  title: 'Notifications',
                  subtitle: 'Manage app notifications',
                  icon: Icons.notifications_outlined,
                  iconColor: colorScheme.primary,
                  trailing: Switch(
                    value: true,
                    onChanged: (bool value) {},
                    activeColor: colorScheme.primary,
                  ),
                  onTap: () {},
                ),
                const SizedBox(height: 12),
                _buildSettingsCard(
                  context,
                  title: 'Focus Goal',
                  subtitle: '${focusService.timerService.state.minWorkDuration ~/ 60} minutes',
                  icon: Icons.timer_outlined,
                  iconColor: colorScheme.tertiary,
                  trailing: Icon(
                    Icons.chevron_right,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  onTap: () => _showGoalTimeDialog(context, focusService),
                ),
                const SizedBox(height: 12),
                _buildSettingsCard(
                  context,
                  title: 'Display Mode',
                  subtitle: focusService.timerService.state.displayMode == DisplayMode.countdown ? 'Countdown' : 'Count Up',
                  icon: Icons.switch_left_outlined,
                  iconColor: colorScheme.primary,
                  trailing: Switch(
                    value: focusService.timerService.state.displayMode == DisplayMode.countdown,
                    onChanged: (bool value) {
                      focusService.setDisplayMode(value ? DisplayMode.countdown : DisplayMode.countup);
                    },
                    activeColor: colorScheme.primary,
                  ),
                  onTap: () {},
                ),
                const SizedBox(height: 12),
                _buildSettingsCard(
                  context,
                  title: 'Theme',
                  subtitle: 'System',
                  icon: Icons.palette_outlined,
                  iconColor: colorScheme.secondary,
                  trailing: Icon(
                    Icons.chevron_right,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  onTap: () {},
                ),
                const SizedBox(height: 12),
                _buildSettingsCard(
                  context,
                  title: 'Language',
                  subtitle: 'English',
                  icon: Icons.language_outlined,
                  iconColor: colorScheme.primary,
                  trailing: Icon(
                    Icons.chevron_right,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  onTap: () {},
                ),
              ]),
            ),
          ),
          
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 8),
                  Text(
                    'System',
                    style: textTheme.titleLarge?.copyWith(
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
          
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _buildSettingsCard(
                  context,
                  title: 'Developer Options',
                  subtitle: 'Debug and test features',
                  icon: Icons.developer_mode,
                  iconColor: colorScheme.secondary,
                  trailing: Icon(
                    Icons.chevron_right,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const DevView()),
                    );
                  },
                ),
                const SizedBox(height: 12),
                _buildSettingsCard(
                  context,
                  title: 'Reset App',
                  subtitle: 'Force reset to idle state',
                  icon: Icons.refresh_outlined,
                  iconColor: colorScheme.error,
                  trailing: Icon(
                    Icons.chevron_right,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  onTap: () => _resetAppState(focusService),
                ),
                const SizedBox(height: 12),
                _buildSettingsCard(
                  context,
                  title: 'About',
                  subtitle: 'App version and information',
                  icon: Icons.info_outline,
                  iconColor: colorScheme.outline,
                  trailing: Icon(
                    Icons.chevron_right,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  onTap: () {},
                ),
                const SizedBox(height: 24),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  void _showGoalTimeDialog(BuildContext context, FocusService focusService) {
    int initialMinutes = (focusService.timerService.state.minWorkDuration ~/ 60);
    int selectedMinutes = initialMinutes;
    
    // 预定义的时间选项
    final timeOptions = [
      {'label': '5 min', 'value': 5},
      {'label': '10 min', 'value': 10},
      {'label': '15 min', 'value': 15},
      {'label': '20 min', 'value': 20},
      {'label': '25 min', 'value': 25},
      {'label': '30 min', 'value': 30},
      {'label': '45 min', 'value': 45},
      {'label': '60 min', 'value': 60},
    ];

    _borderAnimationController.forward();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 12,
        title: Text(
          'Set Focus Goal',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurface,
            fontWeight: FontWeight.w700,
          ),
        ),
        content: StatefulBuilder(
          builder: (context, setState) {
            final colorScheme = Theme.of(context).colorScheme;
            final textTheme = Theme.of(context).textTheme;
            
            return SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 8),
                  Text(
                    'Set how long you want to focus for:',
                    style: textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                  
                  // 时间选择滑块
                  const SizedBox(height: 24),
                  Align(
                    alignment: Alignment.center,
                    child: Text(
                      '${selectedMinutes} minutes',
                      style: textTheme.displayMedium?.copyWith(
                        color: colorScheme.primary,
                        fontWeight: FontWeight.w700,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 16),
                  Slider(
                    value: selectedMinutes.toDouble(),
                    min: 1,
                    max: 120,
                    divisions: 119,
                    activeColor: colorScheme.primary,
                    inactiveColor: colorScheme.surfaceVariant,
                    thumbColor: colorScheme.onPrimary,
                    label: selectedMinutes.round().toString(),
                    onChanged: (value) {
                      _borderAnimationController
                        ..reverse()
                        ..forward();
                      setState(() {
                        selectedMinutes = value.round();
                      });
                    },
                    semanticFormatterCallback: (value) => '${value.round()} minutes',
                  ),
                  
                  // 快速选择按钮
                  const SizedBox(height: 24),
                  Text(
                    'Quick select:',
                    style: textTheme.titleMedium?.copyWith(
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 12.0,
                    runSpacing: 12.0,
                    children: timeOptions.map(
                      (option) => ElevatedButton(
                        onPressed: () {
                          _borderAnimationController
                            ..reverse()
                            ..forward();
                          setState(() {
                            selectedMinutes = option['value'] as int;
                          });
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: selectedMinutes == (option['value'] as int)
                              ? colorScheme.primary
                              : colorScheme.surfaceVariant,
                          foregroundColor: selectedMinutes == (option['value'] as int)
                              ? colorScheme.onPrimary
                              : colorScheme.onSurfaceVariant,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 10,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: selectedMinutes == (option['value'] as int)
                              ? 4
                              : 0,
                          shadowColor: colorScheme.shadow,
                          textStyle: textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        child: Text(option['label'] as String),
                      ),
                    ).toList(),
                  ),
                ],
              ),
            );
          },
        ),
        actionsAlignment: MainAxisAlignment.spaceBetween,
        actionsPadding: const EdgeInsets.only(
          left: 24,
          right: 24,
          bottom: 24,
        ),
        actions: [
          OutlinedButton(
            onPressed: () {
              _borderAnimationController.reverse();
              Navigator.pop(context);
            },
            style: OutlinedButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.onSurfaceVariant,
              padding: const EdgeInsets.symmetric(
                horizontal: 24,
                vertical: 12,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              textStyle: Theme.of(context).textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              _borderAnimationController.reverse();
              focusService.setMinFocusTime(selectedMinutes * 60); // 转换为秒
              Navigator.pop(context);
            },
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Theme.of(context).colorScheme.onPrimary,
              padding: const EdgeInsets.symmetric(
                horizontal: 24,
                vertical: 12,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 4,
              shadowColor: Theme.of(context).colorScheme.shadow,
              textStyle: Theme.of(context).textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            child: const Text('Set Goal'),
          ),
        ],
      ),
    );
  }
}