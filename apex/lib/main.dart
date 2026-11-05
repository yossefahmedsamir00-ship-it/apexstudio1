import 'dart:math' as math;\n\nimport 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'ai_chat_page.dart';

const _supabaseUrl = String.fromEnvironment(
  'SUPABASE_URL',
  defaultValue: 'https://dyoaiszrmfrdxgouzgzq.supabase.co',
);
const _supabasePublishableKey = String.fromEnvironment(
  'SUPABASE_PUBLISHABLE_KEY',
  defaultValue: 'sb_publishable_VD3iKy4zbt4pJFfZkO4YFA_rj5sS1Ui',
);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: _supabaseUrl,
    publishableKey: _supabasePublishableKey,
  );
  runApp(const ApexStudioApp());
}

class ApexStudioApp extends StatelessWidget {
  const ApexStudioApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'APEX STUDIO',
    theme: ThemeData(brightness: Brightness.dark, scaffoldBackgroundColor: const Color(0xFF050505), colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFD7AA5B), brightness: Brightness.dark), useMaterial3: true),
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
  List<Project> _projects = projects;
  List<(String, String, String)>? _cmsServices;
  final workKey = GlobalKey();
  final servicesKey = GlobalKey();
  final contactKey = GlobalKey();

  void go(GlobalKey key) => Scrollable.ensureVisible(key.currentContext!, duration: const Duration(milliseconds: 600), curve: Curves.easeOutCubic);

  @override
  void initState() {
    super.initState();
    _loadPublishedContent();
  }

  Future<void> _loadPublishedContent() async {
    try {
      final rows = await Supabase.instance.client
          .from('apex_site_content')
          .select('title,summary,content_type,body')
          .eq('status', 'published')
          .inFilter('content_type', ['project', 'service'])
          .order('sort_order');
      final loadedProjects = <Project>[];
      final loadedServices = <(String, String, String)>[];
      for (final raw in rows) {
        final row = Map<String, dynamic>.from(raw);
        final body = row['body'] is Map ? Map<String, dynamic>.from(row['body'] as Map) : <String, dynamic>{};
        final title = (row['title'] ?? '').toString().trim();
        final summary = (row['summary'] ?? '').toString().trim();
        if (title.isEmpty) continue;
        if (row['content_type'] == 'project') {
          final category = (body['category'] ?? 'Web').toString();
          loadedProjects.add(Project(title, category, summary));
        } else if (row['content_type'] == 'service') {
          loadedServices.add(('0${loadedServices.length + 1}'.padLeft(2, '0'), title, summary));
        }
      }
      if (!mounted) return;
      setState(() {
        if (loadedProjects.isNotEmpty) _projects = loadedProjects;
        if (loadedServices.isNotEmpty) _cmsServices = loadedServices;
      });
    } catch (_) {
      // Keep the curated Flutter content visible until the CMS migration is installed.
    }
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final mobile = width < 900;
    final shown = filter == 'All' ? _projects : _projects.where((p) => p.category == filter).toList();
    return Directionality(
      textDirection: ar ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: PreferredSize(preferredSize: Size.fromHeight(mobile ? 74 : 86), child: _Nav(mobile: mobile, ar: ar, onLang: () => setState(() => ar = !ar), onWork: () => go(workKey), onServices: () => go(servicesKey), onContact: () => go(contactKey), onChat: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ApexAiChatPage())))),
        body: CustomScrollView(slivers: [
          SliverToBoxAdapter(child: _Hero(mobile: mobile, ar: ar, onWork: () => go(workKey), onContact: () => go(contactKey))),
          SliverToBoxAdapter(child: _Statement(ar: ar)),
          SliverToBoxAdapter(key: servicesKey, child: _Services(ar: ar, items: _cmsServices)),
          SliverToBoxAdapter(key: workKey, child: _Work(ar: ar, filter: filter, shown: shown, onFilter: (v) => setState(() => filter = v))),
          SliverToBoxAdapter(child: _Process(ar: ar)),
          SliverToBoxAdapter(
            key: contactKey,
            child: _Contact(
              ar: ar,
              onChat: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ApexAiChatPage()),
              ),
            ),
          ),
          SliverToBoxAdapter(child: _Footer(ar: ar)),
        ]),
      ),
    );
  }
}

class _Nav extends StatelessWidget {
  final bool mobile, ar;
  final VoidCallback onLang, onWork, onServices, onContact, onChat;

  const _Nav({
    required this.mobile,
    required this.ar,
    required this.onLang,
    required this.onWork,
    required this.onServices,
    required this.onContact,
    required this.onChat,
  });

  @override
  Widget build(BuildContext context) => Container(
        padding: EdgeInsets.symmetric(horizontal: mobile ? 18 : 54, vertical: 12),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: Color(0xFF1D1D1D))),
        ),
        child: Row(
          children: [
            const Text('APEX', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w900, letterSpacing: 3)),
            const SizedBox(width: 8),
            const Text('STUDIO', style: TextStyle(color: Color(0xFFD7A83E), letterSpacing: 3, fontSize: 12)),
            const Spacer(),
            if (!mobile) ...[
              TextButton(onPressed: onWork, child: Text(ar ? 'الأعمال' : 'WORK')),
              TextButton(onPressed: onServices, child: Text(ar ? 'الخدمات' : 'SERVICES')),
              TextButton(onPressed: onContact, child: Text(ar ? 'تواصل' : 'CONTACT')),
              const SizedBox(width: 8),
            ],
            IconButton(
              onPressed: onChat,
              tooltip: ar ? 'محادثة الذكاء الاصطناعي' : 'AI Chat',
              icon: const Icon(Icons.auto_awesome_rounded, color: Color(0xFFD7A83E)),
            ),
            IconButton(
              onPressed: onLang,
              tooltip: ar ? 'English' : 'العربية',
              icon: const Icon(Icons.language),
            ),
            if (!mobile)
              FilledButton(
                onPressed: onContact,
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFFD7A83E), foregroundColor: Colors.black),
                child: Text(ar ? 'ابدأ مشروعك' : 'START A PROJECT'),
              ),
          ],
        ),
      );
}

class _Hero extends StatelessWidget {
  final bool mobile, ar;
  final VoidCallback onWork, onContact;
  const _Hero({required this.mobile, required this.ar, required this.onWork, required this.onContact});

  @override
  Widget build(BuildContext context) {
    final copy = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(children: [
          Container(width: 7, height: 7, decoration: const BoxDecoration(color: Color(0xFFD7AA5B), shape: BoxShape.circle, boxShadow: [BoxShadow(color: Color(0x99D7AA5B), blurRadius: 12)])),
          const SizedBox(width: 10),
          Flexible(child: Text(ar ? 'استوديو رقمي مستقل · القاهرة / عن بُعد' : 'INDEPENDENT DIGITAL STUDIO · CAIRO / REMOTE', style: const TextStyle(color: Color(0xFFD7AA5B), fontSize: 10, letterSpacing: 1.6, fontWeight: FontWeight.w700))),
        ]),
        const SizedBox(height: 26),
        Text(ar ? 'حوّل فكرتك إلى\nواقع رقمي.' : 'TURN YOUR VISION INTO\nDIGITAL REALITY.', style: TextStyle(fontSize: mobile ? 49 : 68, height: .98, fontWeight: FontWeight.w900, letterSpacing: mobile ? -1.8 : -3.2, color: const Color(0xFFF7F3EA))),
        const SizedBox(height: 22),
        ConstrainedBox(constraints: const BoxConstraints(maxWidth: 560), child: Text(ar ? 'استوديو تقني إبداعي يبني المواقع وتطبيقات الموبايل وحلول الذكاء الاصطناعي وتجارب رقمية تنقل فكرتك للواقع.' : 'A creative technology studio for websites, mobile apps, AI systems and digital experiences built to move your business forward.', style: const TextStyle(fontSize: 15, height: 1.85, color: Color(0xFFA7AAA6)))),
        const SizedBox(height: 30),
        Wrap(spacing: 18, runSpacing: 14, children: [
          _GoldButton(label: ar ? 'ابدأ مشروعك' : 'START A PROJECT', onPressed: onContact),
          TextButton.icon(onPressed: onWork, icon: const Icon(Icons.north_east, size: 17), label: Text(ar ? 'استكشف الأعمال' : 'EXPLORE SELECTED WORK'), style: TextButton.styleFrom(foregroundColor: const Color(0xFFE5E1D8), textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600))),
        ]),
        const SizedBox(height: 42),
        Container(height: 1, color: const Color(0xFF292824)),
        const SizedBox(height: 16),
        Wrap(spacing: 22, runSpacing: 10, children: (ar ? ['أنظمة الويب','تطبيقات Flutter','الذكاء الاصطناعي','الأتمتة'] : ['WEB SYSTEMS','FLUTTER APPS','AI SYSTEMS','AUTOMATION']).map((v) => Text(v, style: const TextStyle(color: Color(0xFF777A77), fontSize: 9, letterSpacing: 1.4, fontWeight: FontWeight.w600))).toList()),
      ],
    );
    return Container(
      padding: EdgeInsets.fromLTRB(mobile ? 22 : 56, mobile ? 58 : 78, mobile ? 22 : 56, mobile ? 56 : 78),
      decoration: const BoxDecoration(
        gradient: RadialGradient(center: Alignment(0.82, -0.35), radius: 1.15, colors: [Color(0x182D6BFF), Color(0x0DFF543D), Color(0x00050505)]),
      ),
      child: Center(child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1280),
        child: mobile
          ? Column(crossAxisAlignment: CrossAxisAlignment.start, children: [copy, const SizedBox(height: 42), const _ImmersiveScene(height: 390)])
          : Row(crossAxisAlignment: CrossAxisAlignment.center, children: [Expanded(flex: 11, child: copy), const SizedBox(width: 42), const Expanded(flex: 9, child: _ImmersiveScene(height: 610))]),
      )),
    );
  }
}


class _Reveal extends StatelessWidget {
  final Widget child;
  const _Reveal({required this.child});
  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    tween: Tween(begin: 0, end: 1),
    duration: const Duration(milliseconds: 850),
    curve: Curves.easeOutCubic,
    child: child,
    builder: (context, value, child) => Opacity(
      opacity: value,
      child: Transform.translate(offset: Offset(0, 24 * (1 - value)), child: child),
    ),
  );
}

class _PressScale extends StatefulWidget {
  final Widget child;
  const _PressScale({required this.child});
  @override State<_PressScale> createState() => _PressScaleState();
}
class _PressScaleState extends State<_PressScale> {
  bool pressed = false;
  @override
  Widget build(BuildContext context) => Listener(
    onPointerDown: (_) => setState(() => pressed = true),
    onPointerUp: (_) => setState(() => pressed = false),
    onPointerCancel: (_) => setState(() => pressed = false),
    child: AnimatedScale(scale: pressed ? .97 : 1, duration: const Duration(milliseconds: 130), curve: Curves.easeOut, child: widget.child),
  );
}

class _GoldButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  const _GoldButton({required this.label, required this.onPressed});
  @override
  Widget build(BuildContext context) => FilledButton.icon(
    onPressed: onPressed,
    icon: const Icon(Icons.north_east, size: 17),
    label: Text(label),
    style: FilledButton.styleFrom(
      backgroundColor: const Color(0xFFD7AA5B),
      foregroundColor: const Color(0xFF100D07),
      padding: const EdgeInsets.symmetric(horizontal: 21, vertical: 19),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero, side: BorderSide(color: Color(0x99FFE2A1))),
      textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: .4),
      elevation: 0,
    ),
  );
}

class _ImmersiveScene extends StatefulWidget {
  final double height;
  const _ImmersiveScene({required this.height});
  @override State<_ImmersiveScene> createState() => _ImmersiveSceneState();
}

class _ImmersiveSceneState extends State<_ImmersiveScene> with SingleTickerProviderStateMixin {
  late final AnimationController _motion = AnimationController(vsync: this, duration: const Duration(seconds: 24))..repeat();
  double _pointerX = 0, _pointerY = 0;

  @override
  void dispose() { _motion.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => MouseRegion(
    onHover: (event) { final box = context.findRenderObject() as RenderBox?; if (box == null) return; final p = box.globalToLocal(event.position); setState(() { _pointerX = (p.dx / box.size.width - .5) * .08; _pointerY = (p.dy / box.size.height - .5) * -.08; }); },
    onExit: (_) => setState(() { _pointerX = 0; _pointerY = 0; }),
    child: AnimatedBuilder(
      animation: _motion,
      builder: (context, _) {
        final phase = _motion.value * math.pi * 2;
        return Transform(
          alignment: Alignment.center,
          transform: Matrix4.identity()..setEntry(3, 2, .001)..rotateX(_pointerY + math.sin(phase) * .018)..rotateY(_pointerX + math.cos(phase) * .025),
          child: Container(
            height: widget.height,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0x55D7AA5B)),
              gradient: const RadialGradient(center: Alignment(.05, -.12), radius: 1.15, colors: [Color(0xFF242016), Color(0xFF101319), Color(0xFF050608)]),
              boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 45, offset: Offset(0, 24)), BoxShadow(color: Color(0x22D7AA5B), blurRadius: 35)],
            ),
            child: Stack(fit: StackFit.expand, children: [
              CustomPaint(painter: _SceneGridPainter()),
              Positioned(right: -55, top: -35, child: Container(width: 190, height: 190, decoration: const BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [Color(0x445C8DFF), Color(0x005C8DFF)])))),
              Positioned(left: -65, bottom: -50, child: Container(width: 220, height: 220, decoration: const BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [Color(0x33FF543D), Color(0x00FF543D)])))),
              Center(child: Transform.rotate(
                angle: phase * .12,
                child: Container(
                  width: widget.height * .55, height: widget.height * .55,
                  decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: const Color(0x66D7AA5B), width: 1.2), boxShadow: const [BoxShadow(color: Color(0x22D7AA5B), blurRadius: 28)]),
                  child: Center(child: Transform.rotate(angle: -phase * .22, child: Container(width: widget.height * .42, height: widget.height * .42, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: const Color(0x665C8DFF)), gradient: const RadialGradient(colors: [Color(0x223B5E9C), Color(0x00050608)]))))),
                ),
              )),
              Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                Transform.translate(offset: Offset(0, math.sin(phase) * 8), child: const Text('A', style: TextStyle(fontSize: 112, height: .9, fontWeight: FontWeight.w900, color: Color(0xFFD7AA5B), shadows: [Shadow(color: Color(0x88D7AA5B), blurRadius: 28)]))),
                const SizedBox(height: 8),
                const Text('APEX', style: TextStyle(fontSize: 36, fontWeight: FontWeight.w900, letterSpacing: 9, color: Color(0xFFF7F3EA))),
                const SizedBox(height: 7),
                const Text('DIGITAL REALITY', style: TextStyle(fontSize: 9, letterSpacing: 4, color: Color(0xFFD7AA5B))),
              ])),
              const Positioned(left: 18, top: 18, child: Text('APEX STUDIO / 001', style: TextStyle(fontSize: 8, letterSpacing: 2, color: Color(0xFF9B9E99)))),
              const Positioned(right: 18, bottom: 18, child: Text('IDEAS → DIGITAL REALITY', style: TextStyle(fontSize: 8, letterSpacing: 1.5, color: Color(0xFF9B9E99)))),
              Positioned(left: 0, right: 0, bottom: 58, child: Center(child: Container(width: 90, height: 1, color: const Color(0x88D7AA5B)))),
            ]),
          ),
        );
      },
    ),
  );
}

class _SceneGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = const Color(0x12D7AA5B)..strokeWidth = .7;
    for (double x = 0; x < size.width; x += 38) { canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint); }
    for (double y = 0; y < size.height; y += 38) { canvas.drawLine(Offset(0, y), Offset(size.width, y), paint); }
  }
  @override bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _Statement extends StatelessWidget { final bool ar; const _Statement({required this.ar}); @override Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 30), decoration: const BoxDecoration(border: Border.symmetric(horizontal: BorderSide(color: Color(0xFF1D1D1D)))), child: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 1160), child: Row(children: [Text('01', style: const TextStyle(color: Color(0xFFD7A83E))), const SizedBox(width: 30), Expanded(child: Text(ar ? 'لا قوالب جاهزة. لا ضوضاء. فقط عمل رقمي له هدف.' : 'NO TEMPLATES. NO NOISE. JUST PURPOSEFUL DIGITAL WORK.', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: 1.2))), const Text('↘', style: TextStyle(fontSize: 26, color: Color(0xFFD7A83E)))])))); }

class _Services extends StatelessWidget {
  final bool ar;
  final List<(String, String, String)>? items;
  const _Services({required this.ar, this.items});
  @override
  Widget build(BuildContext context) => _Section(
    eyebrow: ar ? 'ماذا نبني؟' : 'WHAT WE BUILD',
    title: ar ? 'من أول فكرة إلى منتج حقيقي.' : 'From first thought to something people can use.',
    child: LayoutBuilder(builder: (context, c) {
      final cols = c.maxWidth > 850 ? 2 : 1;
      final fallback = ar
          ? const [('01','أنظمة الويب','مواقع، صفحات هبوط، بوابات ولوحات تحكم.'),('02','تطبيقات Flutter','تطبيقات موبايل وويب وديسكتوب من قاعدة Flutter.'),('03','أنظمة AI','مساعدات ووكلاء وأتمتة وسير عمل ذكي.'),('04','الأنظمة الرقمية','Backend وبيانات وتكاملات وأدوات تشغيلية.')]
          : const [('01','Web Systems','Websites, landing pages, portals and dashboards.'),('02','Flutter Applications','Mobile, web and desktop applications from one Flutter stack.'),('03','AI Systems','Assistants, agents, automation and intelligent workflows.'),('04','Digital Systems','Backend, data, integrations and operational tools.')];
      final data = items?.isNotEmpty == true ? items! : fallback;
      return GridView.builder(
        shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), itemCount: data.length,
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: cols, mainAxisExtent: 190, crossAxisSpacing: 18, mainAxisSpacing: 18),
        itemBuilder: (_, i) => _Card(index: data[i].$1, title: data[i].$2, body: data[i].$3),
      );
    }),
  );
}

class _Work extends StatelessWidget {
  final bool ar;
  final String filter;
  final List<Project> shown;
  final ValueChanged<String> onFilter;

  const _Work({
    required this.ar,
    required this.filter,
    required this.shown,
    required this.onFilter,
  });

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
                  .map((filterValue) => ChoiceChip(
                        label: Text(filterValue),
                        selected: filter == filterValue,
                        onSelected: (_) => onFilter(filterValue),
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
                      onTap: () => showDialog(
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
  final VoidCallback onChat;
  const _Contact({required this.ar, required this.onChat});

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
                  Text(
                    ar ? 'احكِ لنا الفكرة، وسنحوّلها إلى خطوة تالية أوضح.' : 'Tell us what you are trying to make. We will turn the rough thought into a clearer next step.',
                    style: const TextStyle(color: Color(0xFF999999), fontSize: 17),
                  ),
                  const SizedBox(height: 28),
                  FilledButton.icon(
                    onPressed: onChat,
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

class _Card extends StatelessWidget { final String index, title, body; const _Card({required this.index, required this.title, required this.body}); @override Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(28), decoration: BoxDecoration(color: const Color(0xFF0D0D0F), border: Border.all(color: const Color(0xFF252525)), borderRadius: BorderRadius.circular(3)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(index, style: const TextStyle(color: Color(0xFFD7A83E), fontWeight: FontWeight.w800)), const Spacer(), Text(title, style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w800)), const SizedBox(height: 8), Text(body, style: const TextStyle(color: Color(0xFF929292), height: 1.45))])); }

class _Section extends StatelessWidget { final String eyebrow, title; final Widget child; const _Section({required this.eyebrow, required this.title, required this.child}); @override Widget build(BuildContext context) => Padding(padding: const EdgeInsets.fromLTRB(24, 90, 24, 30), child: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 1160), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(eyebrow, style: const TextStyle(color: Color(0xFFD7A83E), letterSpacing: 2.2, fontWeight: FontWeight.w700)), const SizedBox(height: 12), Text(title, style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w900)), const SizedBox(height: 30), child])))); }
