import 'flow/flow_workspace.dart';

import 'package:flutter/material.dart';

void main() => runApp(const ApexStudioApp());

class ApexStudioApp extends StatelessWidget {
  const ApexStudioApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'APEX STUDIO',
    theme: ThemeData(brightness: Brightness.dark, scaffoldBackgroundColor: const Color(0xFF050505), colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFD7A83E), brightness: Brightness.dark), useMaterial3: true),
    home: const ApexHome(),
  );
}

class Project {
  final String title, category, description;
  const Project(this.title, this.category, this.description);
}

const projects = <Project>[
  Project('APEX AI Studio', 'AI', 'AI-assisted coding workspace and multi-agent product platform.'),
  Project('APEX FLOW', 'Automation', 'Visual workflow orchestration, execution and monitoring.'),
  Project('Loza & Sokkar', 'Commerce', 'Arabic-first premium commerce experience.'),
  Project('FAMILY STUDIO', 'Web', 'Story-led digital experiences built around memories.'),
  Project('AI Mobility Platform', 'Apps', 'AI-native mobility operating system concept.'),
  Project('SOCIAL AI', 'AI', 'Owner-operated social content, approval and publishing workspace.'),
];

class ApexHome extends StatefulWidget {
  const ApexHome({super.key});
  @override State<ApexHome> createState() => _ApexHomeState();
}

class _ApexHomeState extends State<ApexHome> {
  bool ar = false;
  String filter = 'All';
  final workKey = GlobalKey();
  final servicesKey = GlobalKey();
  final contactKey = GlobalKey();

  void go(GlobalKey key) => Scrollable.ensureVisible(key.currentContext!, duration: const Duration(milliseconds: 600), curve: Curves.easeOutCubic);

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final mobile = width < 760;
    final shown = filter == 'All' ? projects : projects.where((p) => p.category == filter).toList();
    return Directionality(
      textDirection: ar ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: PreferredSize(preferredSize: Size.fromHeight(mobile ? 74 : 86), child: _Nav(mobile: mobile, ar: ar, onLang: () => setState(() => ar = !ar), onWork: () => go(workKey), onServices: () => go(servicesKey), onContact: () => go(contactKey))),
        floatingActionButton: FloatingActionButton.extended(
          tooltip: 'Open APEX FLOW',
          onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const FlowWorkspace())),
          backgroundColor: const Color(0xFFD7A83E),
          foregroundColor: Colors.black,
          icon: const Icon(Icons.account_tree_rounded),
          label: const Text('APEX FLOW', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.1)),
        ),
        body: CustomScrollView(slivers: [
          SliverToBoxAdapter(child: _Hero(mobile: mobile, ar: ar, onWork: () => go(workKey), onContact: () => go(contactKey))),
          SliverToBoxAdapter(child: _Statement(ar: ar)),
          SliverToBoxAdapter(key: servicesKey, child: _Services(ar: ar)),
          SliverToBoxAdapter(key: workKey, child: _Work(ar: ar, filter: filter, shown: shown, onFilter: (v) => setState(() => filter = v))),
          SliverToBoxAdapter(child: _Process(ar: ar)),
          SliverToBoxAdapter(key: contactKey, child: _Contact(ar: ar)),
          SliverToBoxAdapter(child: _Footer(ar: ar)),
        ]),
      ),
    );
  }
}

class _Nav extends StatelessWidget {
  final bool mobile, ar; final VoidCallback onLang, onWork, onServices, onContact;
  const _Nav({required this.mobile, required this.ar, required this.onLang, required this.onWork, required this.onServices, required this.onContact});
  @override Widget build(BuildContext context) => Container(
    padding: EdgeInsets.symmetric(horizontal: mobile ? 18 : 54, vertical: 16),
    decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFF1D1D1D)))),
    child: Row(children: [
      const Text('APEX', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w900, letterSpacing: 3)),
      const SizedBox(width: 8), const Text('STUDIO', style: TextStyle(color: Color(0xFFD7A83E), letterSpacing: 3, fontSize: 12)),
      const Spacer(),
      if (!mobile) ...[
        TextButton(onPressed: onWork, child: Text(ar ? 'الأعمال' : 'WORK')),
        TextButton(onPressed: onServices, child: Text(ar ? 'الخدمات' : 'SERVICES')),
        TextButton(onPressed: onContact, child: Text(ar ? 'تواصل' : 'CONTACT')),
        const SizedBox(width: 8),
      ],
      IconButton(onPressed: onLang, tooltip: ar ? 'English' : 'العربية', icon: const Icon(Icons.language)),
      FilledButton(onPressed: onContact, style: FilledButton.styleFrom(backgroundColor: const Color(0xFFD7A83E), foregroundColor: Colors.black), child: Text(ar ? 'ابدأ مشروعك' : 'START A PROJECT')),
    ]),
  );
}

class _Hero extends StatelessWidget {
  final bool mobile, ar; final VoidCallback onWork, onContact;
  const _Hero({required this.mobile, required this.ar, required this.onWork, required this.onContact});
  @override Widget build(BuildContext context) => Container(
    padding: EdgeInsets.symmetric(horizontal: mobile ? 24 : 80, vertical: mobile ? 75 : 125),
    decoration: const BoxDecoration(gradient: RadialGradient(center: Alignment(0.55, -0.2), radius: 1.15, colors: [Color(0x332B6BFF), Color(0x00050505)])),
    child: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 1160), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(ar ? 'استوديو رقمي مستقل · القاهرة / عن بُعد' : 'INDEPENDENT DIGITAL STUDIO · CAIRO / REMOTE', style: const TextStyle(color: Color(0xFFD7A83E), letterSpacing: 1.8, fontWeight: FontWeight.w700)),
      const SizedBox(height: 24),
      Text(ar ? 'حوّل فكرتك إلى\nواقع رقمي.' : 'TURN YOUR VISION INTO\nDIGITAL REALITY.', style: TextStyle(fontSize: mobile ? 48 : 78, height: .98, fontWeight: FontWeight.w900, letterSpacing: -2)),
      const SizedBox(height: 28),
      SizedBox(width: 720, child: Text(ar ? 'استوديو تقني إبداعي نبني فيه المواقع والتطبيقات وأنظمة الذكاء الاصطناعي والتجارب الرقمية المصممة حول هدف حقيقي.' : 'A creative technology studio building websites, Flutter applications, AI systems and digital experiences around real goals.', style: const TextStyle(fontSize: 18, height: 1.65, color: Color(0xFFB7B7B7)))),
      const SizedBox(height: 36),
      Wrap(spacing: 14, runSpacing: 14, children: [
        FilledButton.icon(onPressed: onContact, icon: const Icon(Icons.arrow_outward), label: Text(ar ? 'ابدأ مشروعك' : 'START A PROJECT'), style: FilledButton.styleFrom(backgroundColor: const Color(0xFFD7A83E), foregroundColor: Colors.black, padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 18))),
        OutlinedButton(onPressed: onWork, style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 18)), child: Text(ar ? 'استكشف الأعمال' : 'EXPLORE WORK')),
      ]),
      const SizedBox(height: 70),
      Container(height: 1, color: const Color(0xFF262626)),
      const SizedBox(height: 18),
      Wrap(spacing: 30, runSpacing: 12, children: [Text(ar ? 'ويب' : 'WEB'), Text(ar ? 'تطبيقات Flutter' : 'FLUTTER APPS'), Text(ar ? 'ذكاء اصطناعي' : 'AI SYSTEMS'), Text(ar ? 'أتمتة' : 'AUTOMATION')].toList()),
    ]))),
  );
}

class _Statement extends StatelessWidget { final bool ar; const _Statement({required this.ar}); @override Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 30), decoration: const BoxDecoration(border: Border.symmetric(horizontal: BorderSide(color: Color(0xFF1D1D1D)))), child: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 1160), child: Row(children: [Text('01', style: const TextStyle(color: Color(0xFFD7A83E))), const SizedBox(width: 30), Expanded(child: Text(ar ? 'لا قوالب جاهزة. لا ضوضاء. فقط عمل رقمي له هدف.' : 'NO TEMPLATES. NO NOISE. JUST PURPOSEFUL DIGITAL WORK.', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: 1.2))), const Text('↘', style: TextStyle(fontSize: 26, color: Color(0xFFD7A83E)))])))); }

class _Services extends StatelessWidget { final bool ar; const _Services({required this.ar}); @override Widget build(BuildContext context) => _Section(eyebrow: ar ? 'ماذا نبني؟' : 'WHAT WE BUILD', title: ar ? 'من أول فكرة إلى منتج حقيقي.' : 'From first thought to something people can use.', child: LayoutBuilder(builder: (context, c) { final cols = c.maxWidth > 850 ? 2 : 1; final data = ar ? const [('01','أنظمة الويب','مواقع، صفحات هبوط، بوابات ولوحات تحكم.'),('02','تطبيقات Flutter','تطبيقات موبايل وويب وديسكتوب من قاعدة Flutter.'),('03','أنظمة AI','مساعدات ووكلاء وأتمتة وسير عمل ذكي.'),('04','الأنظمة الرقمية','Backend وبيانات وتكاملات وأدوات تشغيلية.')] : const [('01','Web Systems','Websites, landing pages, portals and dashboards.'),('02','Flutter Applications','Mobile, web and desktop applications from one Flutter stack.'),('03','AI Systems','Assistants, agents, automation and intelligent workflows.'),('04','Digital Systems','Backend, data, integrations and operational tools.')]; return GridView.builder(shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), itemCount: data.length, gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: cols, mainAxisExtent: 190, crossAxisSpacing: 18, mainAxisSpacing: 18), itemBuilder: (_, i) => _Card(index: data[i].$1, title: data[i].$2, body: data[i].$3)); })); }

class _Work extends StatelessWidget {
  final bool ar;
  final String filter;
  final List<Project> shown;
  final ValueChanged<String> onFilter;

  const _Work({required this.ar, required this.filter, required this.shown, required this.onFilter});

  @override
  Widget build(BuildContext context) => _Section(
    eyebrow: ar ? '02 / الأعمال' : '02 / SELECTED WORK',
    title: ar ? 'مشاريع مصممة لتُتذكر.' : 'Built to be remembered.',
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: ['All', 'Web', 'AI', 'Commerce', 'Apps', 'Automation']
              .map((f) => ChoiceChip(
                    label: Text(f),
                    selected: filter == f,
                    onSelected: (_) => onFilter(f),
                  ))
              .toList(),
        ),
        const SizedBox(height: 22),
        LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth > 850 ? 2 : 1;
            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: shown.length,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                mainAxisExtent: 220,
                crossAxisSpacing: 18,
                mainAxisSpacing: 18,
              ),
              itemBuilder: (context, index) {
                final project = shown[index];
                return InkWell(
                  onTap: () => showDialog<void>(
                    context: context,
                    builder: (dialogContext) => AlertDialog(
                      title: Text(project.title),
                      content: Text(project.description),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(dialogContext),
                          child: const Text('Close'),
                        ),
                      ],
                    ),
                  ),
                  child: Container(
                    padding: const EdgeInsets.all(26),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFF252525)),
                      borderRadius: BorderRadius.circular(22),
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFF111116), Color(0xFF080808)],
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('0${index + 1}', style: const TextStyle(color: Color(0xFFD7A83E))),
                        const Spacer(),
                        Text(project.title, style: const TextStyle(fontSize: 25, fontWeight: FontWeight.w900)),
                        const SizedBox(height: 8),
                        Text(project.description, style: const TextStyle(color: Color(0xFF929292), height: 1.45)),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            Text(project.category.toUpperCase(), style: const TextStyle(fontSize: 11, letterSpacing: 1.5, color: Color(0xFFD7A83E))),
                            const Spacer(),
                            const Icon(Icons.arrow_outward, size: 18, color: Color(0xFFD7A83E)),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            );
          },
        ),
      ],
    ),
  );
}

class _Process extends StatelessWidget {
  final bool ar;
  const _Process({required this.ar});

  @override
  Widget build(BuildContext context) => _Section(
    eyebrow: ar ? '03 / الطريقة' : '03 / PROCESS',
    title: ar ? 'وضوح أولًا. جودة ثانيًا. إطلاق له هدف.' : 'Clarity first. Craft second. Launch with intent.',
    child: Column(
      children: List.generate(5, (index) {
        final english = ['Discover', 'Define', 'Design', 'Build', 'Launch'][index];
        final arabic = ['اكتشاف', 'تحديد', 'تصميم', 'تنفيذ', 'إطلاق'][index];
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 22),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: Color(0xFF222222))),
          ),
          child: Row(
            children: [
              Text('0${index + 1}', style: const TextStyle(color: Color(0xFFD7A83E), fontWeight: FontWeight.w800)),
              const SizedBox(width: 28),
              Text(ar ? arabic : english, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
              const Spacer(),
              Icon(Icons.arrow_outward, color: Colors.white.withValues(alpha: .45)),
            ],
          ),
        );
      }),
    ),
  );
}

class _Contact extends StatelessWidget {
  final bool ar;
  const _Contact({required this.ar});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 100),
    child: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1160),
        child: Container(
          padding: const EdgeInsets.all(40),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            gradient: const LinearGradient(colors: [Color(0xFF16110A), Color(0xFF0B0B0B)]),
            border: Border.all(color: const Color(0xFF3A2B15)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(ar ? '04 / الاستوديو' : '04 / THE STUDIO', style: const TextStyle(color: Color(0xFFD7A83E), letterSpacing: 2)),
              const SizedBox(height: 14),
              Text(ar ? 'عندك فكرة تستحق أن توجد؟' : 'Have an idea that should exist?', style: const TextStyle(fontSize: 42, fontWeight: FontWeight.w900)),
              const SizedBox(height: 14),
              Text(ar ? 'احكِ لنا الفكرة، وسنحوّلها إلى خطوة تالية أوضح.' : 'Tell us what you are trying to make. We will turn the rough thought into a clearer next step.', style: const TextStyle(color: Color(0xFF999999), fontSize: 17)),
              const SizedBox(height: 28),
              FilledButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.arrow_outward),
                label: Text(ar ? 'ابدأ طلب مشروع' : 'BUILD MY BRIEF'),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFD7A83E),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 18),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _Footer extends StatelessWidget { final bool ar; const _Footer({required this.ar}); @override Widget build(BuildContext context) => Padding(padding: const EdgeInsets.fromLTRB(24, 20, 24, 45), child: Center(child: Text('Created by Ansta · APEX STUDIO', style: const TextStyle(color: Color(0xFF6D6D6D), letterSpacing: 1.5)))); }

class _Card extends StatelessWidget { final String index, title, body; const _Card({required this.index, required this.title, required this.body}); @override Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(28), decoration: BoxDecoration(color: const Color(0xFF0D0D0F), border: Border.all(color: const Color(0xFF252525)), borderRadius: BorderRadius.circular(20)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(index, style: const TextStyle(color: Color(0xFFD7A83E), fontWeight: FontWeight.w800)), const Spacer(), Text(title, style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w800)), const SizedBox(height: 8), Text(body, style: const TextStyle(color: Color(0xFF929292), height: 1.45))])); }

class _Section extends StatelessWidget { final String eyebrow, title; final Widget child; const _Section({required this.eyebrow, required this.title, required this.child}); @override Widget build(BuildContext context) => Padding(padding: const EdgeInsets.fromLTRB(24, 90, 24, 30), child: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 1160), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(eyebrow, style: const TextStyle(color: Color(0xFFD7A83E), letterSpacing: 2.2, fontWeight: FontWeight.w700)), const SizedBox(height: 12), Text(title, style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w900)), const SizedBox(height: 30), child])))); }
