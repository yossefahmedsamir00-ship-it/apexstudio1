import 'package:flutter/material.dart';

void main() {
  runApp(const ApexStudioApp());
}

class ApexStudioApp extends StatelessWidget {
  const ApexStudioApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'APEX STUDIO',
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF050505),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFD7A83E),
          brightness: Brightness.dark,
        ),
        fontFamily: 'Arial',
        useMaterial3: true,
      ),
      home: const ApexHomePage(),
    );
  }
}

class ApexHomePage extends StatelessWidget {
  const ApexHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final compact = width < 760;

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(child: _TopBar(compact: compact)),
            SliverToBoxAdapter(child: _Hero(compact: compact)),
            SliverToBoxAdapter(child: _Services()),
            SliverToBoxAdapter(child: _Projects()),
            SliverToBoxAdapter(child: _Footer()),
          ],
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  final bool compact;
  const _TopBar({required this.compact});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: compact ? 20 : 56, vertical: 22),
      child: Row(
        children: [
          const Text(
            'APEX',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: 3),
          ),
          const SizedBox(width: 8),
          const Text(
            'STUDIO',
            style: TextStyle(fontSize: 13, color: Color(0xFFD7A83E), letterSpacing: 3),
          ),
          const Spacer(),
          if (!compact) ...[
            TextButton(onPressed: () {}, child: const Text('WORK')),
            TextButton(onPressed: () {}, child: const Text('SERVICES')),
            TextButton(onPressed: () {}, child: const Text('CONTACT')),
            const SizedBox(width: 12),
          ],
          FilledButton(
            onPressed: () {},
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFD7A83E), foregroundColor: Colors.black),
            child: const Text('START A PROJECT'),
          ),
        ],
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  final bool compact;
  const _Hero({required this.compact});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 560),
      padding: EdgeInsets.symmetric(horizontal: compact ? 24 : 80, vertical: compact ? 70 : 110),
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment(0.65, -0.2),
          radius: 1.1,
          colors: [Color(0x332C6BFF), Color(0x00050505)],
        ),
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1100),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('DIGITAL STUDIO / TECHNOLOGY', style: TextStyle(color: Color(0xFFD7A83E), letterSpacing: 2.5, fontWeight: FontWeight.w700)),
              const SizedBox(height: 24),
              Text(
                'WE BUILD DIGITAL\nEXPERIENCES THAT MOVE.',
                style: TextStyle(fontSize: compact ? 48 : 78, height: .98, fontWeight: FontWeight.w900, letterSpacing: -2),
              ),
              const SizedBox(height: 28),
              const SizedBox(
                width: 700,
                child: Text(
                  'APEX STUDIO designs and builds premium websites, applications, automation systems, and AI-powered digital products.',
                  style: TextStyle(fontSize: 18, height: 1.65, color: Color(0xFFB7B7B7)),
                ),
              ),
              const SizedBox(height: 34),
              Wrap(
                spacing: 14,
                runSpacing: 14,
                children: [
                  FilledButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.arrow_outward),
                    label: const Text('EXPLORE APEX'),
                    style: FilledButton.styleFrom(backgroundColor: const Color(0xFFD7A83E), foregroundColor: Colors.black, padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 18)),
                  ),
                  OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 18)),
                    child: const Text('VIEW WORK'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Services extends StatelessWidget {
  const _Services();

  @override
  Widget build(BuildContext context) {
    return const _Section(
      eyebrow: 'WHAT WE DO',
      title: 'From idea to launch.',
      child: _ServiceGrid(),
    );
  }
}

class _ServiceGrid extends StatelessWidget {
  const _ServiceGrid();

  @override
  Widget build(BuildContext context) {
    final services = [
      ('01', 'Web Experiences', 'High-end responsive websites and product experiences.'),
      ('02', 'Applications', 'Flutter applications for mobile, web, and desktop.'),
      ('03', 'AI Systems', 'AI assistants, agents, automation, and intelligent workflows.'),
      ('04', 'Digital Systems', 'Backend, data, integrations, dashboards, and operational tools.'),
    ];
    return LayoutBuilder(builder: (context, constraints) {
      final columns = constraints.maxWidth >= 900 ? 2 : 1;
      return GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: services.length,
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: columns, mainAxisExtent: 180, crossAxisSpacing: 18, mainAxisSpacing: 18),
        itemBuilder: (context, index) {
          final item = services[index];
          return Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(color: const Color(0xFF0D0D0F), border: Border.all(color: const Color(0xFF252525)), borderRadius: BorderRadius.circular(20)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(item.$1, style: const TextStyle(color: Color(0xFFD7A83E), fontWeight: FontWeight.w800)),
              const Spacer(),
              Text(item.$2, style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Text(item.$3, style: const TextStyle(color: Color(0xFF929292), height: 1.45)),
            ]),
          );
        },
      );
    });
  }
}

class _Projects extends StatelessWidget {
  const _Projects();

  @override
  Widget build(BuildContext context) {
    return _Section(
      eyebrow: 'SELECTED WORK',
      title: 'Built to be remembered.',
      child: Column(children: [
        for (final project in const [
          ('APEX FLOW', 'Automation and AI workflow engine'),
          ('SOCIAL AI', 'Owner-operated social content workspace'),
          ('APEX MOBILITY', 'AI-native mobility operating system concept'),
        ])
          Container(
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            decoration: BoxDecoration(border: Border.all(color: const Color(0xFF252525)), borderRadius: BorderRadius.circular(18)),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(project.$1, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)), const SizedBox(height: 6), Text(project.$2, style: const TextStyle(color: Color(0xFF888888)))])),
              const Icon(Icons.arrow_outward, color: Color(0xFFD7A83E)),
            ]),
          ),
      ]),
    );
  }
}

class _Section extends StatelessWidget {
  final String eyebrow;
  final String title;
  final Widget child;
  const _Section({required this.eyebrow, required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 90, 24, 30),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1100),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(eyebrow, style: const TextStyle(color: Color(0xFFD7A83E), letterSpacing: 2.2, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            Text(title, style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w900)),
            const SizedBox(height: 30),
            child,
          ]),
        ),
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.fromLTRB(24, 90, 24, 35),
      child: Center(child: Text('APEX STUDIO  •  DIGITAL PRODUCTS / AI / TECHNOLOGY', style: TextStyle(color: Color(0xFF6D6D6D), letterSpacing: 1.5))),
    );
  }
}
