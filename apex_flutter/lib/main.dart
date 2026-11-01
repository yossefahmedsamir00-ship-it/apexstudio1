import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

void main() {
  runApp(const ApexStudioApp());
}

class ApexStudioApp extends StatefulWidget {
  const ApexStudioApp({super.key});

  @override
  State<ApexStudioApp> createState() => _ApexStudioAppState();
}

class _ApexStudioAppState extends State<ApexStudioApp> {
  Locale _locale = const Locale('en');

  void _toggleLocale() {
    setState(() {
      _locale = _locale.languageCode == 'en' ? const Locale('ar') : const Locale('en');
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'APEX STUDIO',
      locale: _locale,
      supportedLocales: const [Locale('en'), Locale('ar')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        brightness: Brightness.dark,
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF080A0D),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFD4AF37),
          secondary: Color(0xFF2388FF),
          error: Color(0xFFE5484D),
          surface: Color(0xFF11151A),
        ),
      ),
      home: ApexHomePage(onToggleLocale: _toggleLocale),
    );
  }
}

class ApexHomePage extends StatefulWidget {
  const ApexHomePage({required this.onToggleLocale, super.key});

  final VoidCallback onToggleLocale;

  @override
  State<ApexHomePage> createState() => _ApexHomePageState();
}

class _ApexHomePageState extends State<ApexHomePage> {
  int _selectedIndex = 0;

  final _pages = const [
    _Section(title: 'Overview', subtitle: 'APEX STUDIO workspace'),
    _Section(title: 'APEX FLOW', subtitle: 'Flutter automation workspace'),
    _Section(title: 'Social AI', subtitle: 'AI content and publishing'),
    _Section(title: 'Settings', subtitle: 'Application settings'),
  ];

  @override
  Widget build(BuildContext context) {
    final page = _pages[_selectedIndex];
    return Scaffold(
      appBar: AppBar(
        title: const Text('APEX STUDIO'),
        actions: [
          IconButton(
            tooltip: 'العربية / English',
            onPressed: widget.onToggleLocale,
            icon: const Icon(Icons.language),
          ),
        ],
      ),
      body: Row(
        children: [
          NavigationRail(
            selectedIndex: _selectedIndex,
            onDestinationSelected: (index) => setState(() => _selectedIndex = index),
            labelType: NavigationRailLabelType.all,
            destinations: const [
              NavigationRailDestination(icon: Icon(Icons.dashboard_outlined), label: Text('Overview')),
              NavigationRailDestination(icon: Icon(Icons.account_tree_outlined), label: Text('APEX FLOW')),
              NavigationRailDestination(icon: Icon(Icons.auto_awesome_outlined), label: Text('Social AI')),
              NavigationRailDestination(icon: Icon(Icons.settings_outlined), label: Text('Settings')),
            ],
          ),
          const VerticalDivider(width: 1),
          Expanded(child: _WorkspacePage(section: page)),
        ],
      ),
    );
  }
}

class _WorkspacePage extends StatelessWidget {
  const _WorkspacePage({required this.section});

  final _Section section;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(section.title, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 8),
          Text(section.subtitle, style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 32),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text('Flutter application surface', style: Theme.of(context).textTheme.titleLarge),
            ),
          ),
        ],
      ),
    );
  }
}

class _Section {
  const _Section({required this.title, required this.subtitle});

  final String title;
  final String subtitle;
}
