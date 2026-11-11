import 'package:flutter/material.dart';

import 'flow_workspace.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ApexFlowApp());
}

class ApexFlowApp extends StatelessWidget {
  const ApexFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF080A0F),
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFD6B56A), brightness: Brightness.dark),
      cardTheme: CardThemeData(
        color: const Color(0xFF11141B),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: Colors.white.withValues(alpha: .07)),
        ),
      ),
      appBarTheme: const AppBarTheme(backgroundColor: Color(0xFF080A0F), foregroundColor: Colors.white),
    );

    return MaterialApp(
      title: 'APEX FLOW ENGINE',
      debugShowCheckedModeBanner: false,
      theme: theme,
      home: const FlowWorkspace(),
    );
  }
}
