import 'package:flutter/material.dart';

import 'ai_chat_page.dart';

const _gold = Color(0xFFD7A83E);
const _bg = Color(0xFF050505);
const _panel = Color(0xFF101014);
const _muted = Color(0xFF9B9BA2);

enum ApexPage { work, services, about, contact }

class ApexContentPage extends StatelessWidget {
  const ApexContentPage({super.key, required this.page, required this.ar});
  final ApexPage page;
  final bool ar;

  String get _eyebrow => switch (page) {
    ApexPage.work => ar ? 'المشاريع المختارة' : 'SELECTED WORK',
    ApexPage.services => ar ? 'ما الذي نقدمه' : 'WHAT WE DO',
    ApexPage.about => ar ? 'عن الاستوديو' : 'ABOUT THE STUDIO',
    ApexPage.contact => ar ? 'ابدأ من هنا' : 'LET’S TALK',
  };

  String get _heading => switch (page) {
    ApexPage.work => ar ? 'أفكار تتحول إلى تجارب رقمية.' : 'Ideas, shaped into digital experiences.',
    ApexPage.services => ar ? 'نبني الأدوات التي تحرك فكرتك.' : 'We build the tools that move your idea forward.',
    ApexPage.about => ar ? 'استوديو يجمع الإبداع بالهندسة.' : 'Creative thinking. Thoughtful engineering.',
    ApexPage.contact => ar ? 'كل مشروع قوي يبدأ بمحادثة.' : 'Every great project starts with a conversation.',
  };

  String get _description => switch (page) {
    ApexPage.work => ar ? 'استكشف نماذج من المنتجات والأنظمة التي نعمل على تطويرها.' : 'Explore a selection of digital products and systems in our studio.',
    ApexPage.services => ar ? 'من المواقع والتطبيقات إلى الذكاء الاصطناعي والأتمتة، نختار التقنية المناسبة للهدف.' : 'From websites and apps to AI and automation, we choose technology around the goal.',
    ApexPage.about => ar ? 'نحوّل المتطلبات المعقدة إلى منتجات واضحة وسهلة الاستخدام، مع اهتمام بالتفاصيل والأداء.' : 'We turn complex requirements into clear, useful products with care for detail and performance.',
    ApexPage.contact => ar ? 'شاركنا الفكرة أو المشكلة التي تريد حلها، وسنبدأ بتحديد الخطوة التالية.' : 'Tell us what you want to create or solve, and we’ll shape the next step.',
  };

  @override
  Widget build(BuildContext context) {
    final titles = ar
        ? ['أنظمة الويب', 'تطبيقات Flutter', 'أنظمة الذكاء الاصطناعي', 'الأتمتة والتكامل']
        : ['Web experiences', 'Flutter applications', 'AI systems', 'Automation & integrations'];
    final descriptions = ar
        ? ['مواقع تعريفية وتجارية وبوابات ولوحات تحكم.', 'تطبيقات للموبايل والويب بواجهة متناسقة.', 'مساعدات ذكية ووكلاء لسير العمل.', 'ربط الخدمات وتبسيط المهام المتكررة.']
        : ['Brand sites, commerce, portals and dashboards.', 'Consistent mobile and web experiences.', 'Assistants and agents for real workflows.', 'Connect services and simplify repetitive work.'];
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg,
        title: const Text('APEX STUDIO', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 2)),
        actions: [
          IconButton(tooltip: ar ? 'الرئيسية' : 'Home', onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst), icon: const Icon(Icons.home_outlined)),
          IconButton(tooltip: ar ? 'تبديل اللغة' : 'Switch language', onPressed: () => Navigator.of(context).pop(), icon: const Icon(Icons.arrow_back_rounded)),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 46),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1120),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_eyebrow, style: const TextStyle(color: _gold, letterSpacing: 2, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 20),
                  Text(_heading, style: TextStyle(fontSize: MediaQuery.sizeOf(context).width < 600 ? 38 : 58, height: 1.08, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 18),
                  ConstrainedBox(constraints: const BoxConstraints(maxWidth: 760), child: Text(_description, style: const TextStyle(color: _muted, fontSize: 17, height: 1.7))),
                  const SizedBox(height: 42),
                  if (page == ApexPage.work) _projects(context),
                  if (page == ApexPage.services) _services(titles, descriptions),
                  if (page == ApexPage.about) _about(),
                  if (page == ApexPage.contact) _contact(context),
                  const SizedBox(height: 70),
                  const Divider(color: Color(0xFF292929)),
                  const SizedBox(height: 18),
                  const Text('Created by Ansta · APEX STUDIO', style: TextStyle(color: Color(0xFF777777), letterSpacing: 1.2)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _projects(BuildContext context) {
    const items = [
      ('APEX AI Studio', 'AI', 'AI-assisted coding workspace'),
      ('Loza & Sokkar', 'COMMERCE', 'Arabic-first commerce experience'),
      ('FAMILY STUDIO', 'DIGITAL', 'Story-led family experiences'),
      ('AI Mobility Platform', 'APPS', 'AI-native mobility concept'),
      ('APEX FLOW', 'AUTOMATION', 'Workflow orchestration'),
      ('FARIS', 'PLATFORM', 'Event and community operations'),
    ];
    return LayoutBuilder(builder: (context, constraints) {
      final columns = constraints.maxWidth > 760 ? 2 : 1;
      return GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: items.length,
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: columns, mainAxisExtent: 190, crossAxisSpacing: 16, mainAxisSpacing: 16),
        itemBuilder: (context, index) => _PageCard(index: '0${index + 1}', title: items[index].$1, subtitle: items[index].$2, body: items[index].$3),
      );
    });
  }

  Widget _services(List<String> titles, List<String> descriptions) => LayoutBuilder(builder: (context, constraints) {
    final columns = constraints.maxWidth > 760 ? 2 : 1;
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: titles.length,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: columns, mainAxisExtent: 170, crossAxisSpacing: 16, mainAxisSpacing: 16),
      itemBuilder: (context, index) => _PageCard(index: '0${index + 1}', title: titles[index], subtitle: ar ? 'الخدمة' : 'SERVICE', body: descriptions[index]),
    );
  });

  Widget _about() => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(28),
    decoration: BoxDecoration(color: _panel, borderRadius: BorderRadius.circular(24), border: Border.all(color: const Color(0xFF292929))),
    child: Text(
      ar ? 'نؤمن أن التقنية الجيدة لا تستعرض نفسها؛ بل تجعل التجربة أبسط، أسرع، وأكثر فائدة. نبدأ بفهم الهدف، ثم نصمم ونبني ونختبر خطوة بخطوة.' : 'Good technology does not need to show off. It makes an experience simpler, faster and more useful. We start by understanding the goal, then design, build and test one step at a time.',
      style: const TextStyle(fontSize: 20, height: 1.8, color: Color(0xFFD0D0D0)),
    ),
  );

  Widget _contact(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(28),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: _gold.withValues(alpha: .35)),
      gradient: const LinearGradient(colors: [Color(0xFF19140B), Color(0xFF0D0D0F)]),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(ar ? 'احكِ لنا عن مشروعك' : 'Tell us about your project', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
      const SizedBox(height: 12),
      Text(ar ? 'افتح محادثة APEX وشاركنا تفاصيل فكرتك.' : 'Open an APEX conversation and share the details of your idea.', style: const TextStyle(color: _muted, height: 1.6)),
      const SizedBox(height: 24),
      FilledButton.icon(
        onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ApexAiChatPage())),
        icon: const Icon(Icons.arrow_outward_rounded),
        label: Text(ar ? 'تحدث مع APEX AI' : 'Talk to APEX AI'),
        style: FilledButton.styleFrom(backgroundColor: _gold, foregroundColor: Colors.black, padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 18)),
      ),
    ]),
  );
}

class _PageCard extends StatelessWidget {
  const _PageCard({required this.index, required this.title, required this.subtitle, required this.body});
  final String index, title, subtitle, body;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(24),
    decoration: BoxDecoration(
      color: _panel,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: const Color(0xFF292929)),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [Text(index, style: const TextStyle(color: _gold, fontWeight: FontWeight.w800)), const Spacer(), Text(subtitle, style: const TextStyle(color: _gold, fontSize: 10, letterSpacing: 1.2))]),
      const Spacer(),
      Text(title, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
      const SizedBox(height: 8),
      Text(body, style: const TextStyle(color: _muted, height: 1.5)),
    ]),
  );
}
