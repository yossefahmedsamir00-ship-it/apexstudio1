import 'package:flutter/material.dart';

import 'flow_models.dart';

class FlowWorkspace extends StatefulWidget {
  const FlowWorkspace({super.key});

  @override
  State<FlowWorkspace> createState() => _FlowWorkspaceState();
}

class _FlowWorkspaceState extends State<FlowWorkspace> {
  FlowBuilderMode _mode = FlowBuilderMode.visual;
  FlowExecutionMode _executionMode = FlowExecutionMode.manual;
  int _section = 0;
  bool _arabic = false;
  late FlowWorkflow _workflow;

  @override
  void initState() {
    super.initState();
    _workflow = FlowWorkflow(
      id: 'draft-001',
      name: 'New Automation',
      version: 1,
      builderMode: _mode,
      executionMode: _executionMode,
      nodes: [
        FlowNodeInstance(id: 'trigger-1', definition: flowStarterNodes[0]),
        FlowNodeInstance(id: 'ai-1', definition: flowStarterNodes[1]),
      ],
      edges: const [FlowEdge(from: 'trigger-1', to: 'ai-1')],
    );
  }

  String _label(String en, String ar) => _arabic ? ar : en;

  void _setMode(FlowBuilderMode mode) {
    setState(() {
      _mode = mode;
      _workflow = _workflow.copyWith(builderMode: mode);
    });
  }

  void _addNode(FlowNodeDefinition definition) {
    final id = '${definition.type.replaceAll('.', '-')}-${_workflow.nodes.length + 1}';
    final node = FlowNodeInstance(id: id, definition: definition);
    setState(() {
      final nodes = [..._workflow.nodes, node];
      final edges = nodes.length > 1 ? [..._workflow.edges, FlowEdge(from: nodes[nodes.length - 2].id, to: node.id)] : _workflow.edges;
      _workflow = _workflow.copyWith(nodes: nodes, edges: edges, version: _workflow.version + 1);
    });
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final compact = MediaQuery.sizeOf(context).width < 850;
    return Directionality(
      textDirection: _arabic ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        backgroundColor: const Color(0xFF080A0F),
        appBar: AppBar(
          backgroundColor: const Color(0xFF080A0F),
          titleSpacing: 18,
          title: Row(
            children: [
              const Icon(Icons.account_tree_rounded, color: Color(0xFFD6B56A)),
              const SizedBox(width: 10),
              Text(_label('APEX FLOW', 'APEX FLOW'), style: const TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.2)),
              if (!compact) ...[
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                  decoration: BoxDecoration(color: const Color(0xFFD6B56A).withValues(alpha: .12), borderRadius: BorderRadius.circular(99)),
                  child: Text(_label('OWNER WORKSPACE', 'مساحة المالك'), style: const TextStyle(color: Color(0xFFD6B56A), fontSize: 10, fontWeight: FontWeight.w800)),
                ),
              ],
            ],
          ),
          actions: [
            IconButton(onPressed: () => setState(() => _arabic = !_arabic), tooltip: 'Language', icon: const Icon(Icons.translate)),
            if (!compact) IconButton(onPressed: () {}, tooltip: _label('Save draft', 'حفظ المسودة'), icon: const Icon(Icons.save_outlined)),
            const SizedBox(width: 8),
          ],
        ),
        drawer: compact
            ? Drawer(
                backgroundColor: const Color(0xFF080A0F),
                child: SafeArea(
                  child: _Sidebar(
                    section: _section,
                    arabic: _arabic,
                    onSelect: (value) {
                      setState(() => _section = value);
                      Navigator.of(context).pop();
                    },
                  ),
                ),
              )
            : null,
        body: compact
            ? _content(scheme)
            : Row(
                children: [
                  _Sidebar(section: _section, arabic: _arabic, onSelect: (value) => setState(() => _section = value)),
                  Expanded(child: _content(scheme)),
                ],
              ),
      ),
    );
  }

  Widget _content(ColorScheme scheme) {
    switch (_section) {
      case 1:
        return _RunsPanel(arabic: _arabic);
      case 2:
        return _SimpleBuilder(
          arabic: _arabic,
          workflow: _workflow,
          onMode: _setMode,
          onExecutionMode: (mode) => setState(() {
            _executionMode = mode;
            _workflow = _workflow.copyWith(executionMode: mode);
          }),
        );
      case 3:
        return _LibraryPanel(arabic: _arabic, onAdd: _addNode);
      default:
        return _BuilderPanel(
          arabic: _arabic,
          mode: _mode,
          workflow: _workflow,
          onMode: _setMode,
          onAdd: _addNode,
          onExecutionMode: (mode) => setState(() {
            _executionMode = mode;
            _workflow = _workflow.copyWith(executionMode: mode);
          }),
        );
    }
  }
}

class _Sidebar extends StatelessWidget {
  const _Sidebar({required this.section, required this.arabic, required this.onSelect});
  final int section;
  final bool arabic;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final items = [
      ('Automation Studio', 'استوديو الأتمتة', Icons.account_tree_outlined),
      ('Runs & Monitor', 'التشغيل والمراقبة', Icons.monitor_heart_outlined),
      ('Simple Builder', 'البناء البسيط', Icons.view_list_outlined),
      ('Node Library', 'مكتبة العقد', Icons.extension_outlined),
      ('Templates', 'القوالب', Icons.layers_outlined),
      ('APEX Vault', 'APEX Vault', Icons.lock_outline),
      ('Integrations', 'التكاملات', Icons.hub_outlined),
      ('Versions', 'الإصدارات', Icons.history),
      ('Settings', 'الإعدادات', Icons.settings_outlined),
    ];
    return Container(
      width: 230,
      decoration: BoxDecoration(border: Border(right: BorderSide(color: Colors.white.withValues(alpha: .06)))),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(12, 14, 12, 18),
        children: [
          Padding(padding: const EdgeInsets.fromLTRB(12, 8, 12, 12), child: Text(arabic ? 'APEX FLOW' : 'APEX FLOW', style: const TextStyle(color: Color(0xFF8F98A8), fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.3))),
          for (var i = 0; i < items.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: ListTile(
                dense: true,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                selected: section == i || (section == 0 && i == 0),
                selectedTileColor: const Color(0xFFD6B56A).withValues(alpha: .1),
                leading: Icon(items[i].$3, size: 19, color: section == i ? const Color(0xFFD6B56A) : const Color(0xFF8F98A8)),
                title: Text(arabic ? items[i].$2 : items[i].$1, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                onTap: i < 4 ? () => onSelect(i) : null,
              ),
            ),
        ],
      ),
    );
  }
}

class _BuilderPanel extends StatelessWidget {
  const _BuilderPanel({required this.arabic, required this.mode, required this.workflow, required this.onMode, required this.onAdd, required this.onExecutionMode});
  final bool arabic;
  final FlowBuilderMode mode;
  final FlowWorkflow workflow;
  final ValueChanged<FlowBuilderMode> onMode;
  final ValueChanged<FlowNodeDefinition> onAdd;
  final ValueChanged<FlowExecutionMode> onExecutionMode;

  String l(String en, String ar) => arabic ? ar : en;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 20, 14, 14),
          child: Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            runSpacing: 12,
            children: [
              Text(l('Automation Studio', 'استوديو الأتمتة'), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
              SegmentedButton<FlowBuilderMode>(
                segments: [
                  ButtonSegment(value: FlowBuilderMode.visual, label: Text(l('Visual', 'مرئي')), icon: const Icon(Icons.account_tree, size: 16)),
                  ButtonSegment(value: FlowBuilderMode.simple, label: Text(l('Simple', 'بسيط')), icon: const Icon(Icons.view_list, size: 16)),
                  ButtonSegment(value: FlowBuilderMode.hybrid, label: Text(l('Hybrid', 'هجين')), icon: const Icon(Icons.merge_type, size: 16)),
                ],
                selected: {mode},
                onSelectionChanged: (values) => onMode(values.first),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 22),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final cardWidth = constraints.maxWidth < 650
                  ? (constraints.maxWidth - 10) / 2
                  : (constraints.maxWidth - 20) / 3;
              return Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  SizedBox(width: cardWidth, child: _FieldCard(title: l('Workflow', 'سير العمل'), value: workflow.name, icon: Icons.bolt_outlined)),
                  SizedBox(width: cardWidth, child: _FieldCard(title: l('Version', 'الإصدار'), value: 'v${workflow.version}', icon: Icons.history)),
                  SizedBox(width: cardWidth, child: _ExecutionCard(mode: workflow.executionMode, onChanged: onExecutionMode, arabic: arabic)),
                ],
              );
            },
          ),
        ),
        const SizedBox(height: 14),
        Expanded(
          child: LayoutBuilder(
            builder: (context, constraints) {
              if (constraints.maxWidth < 900) {
                return ListView(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 18),
                  children: [
                    SizedBox(height: 190, child: _NodePalette(arabic: arabic, onAdd: onAdd, compact: true)),
                    const SizedBox(height: 12),
                    SizedBox(height: 330, child: _Canvas(arabic: arabic, workflow: workflow, compact: true)),
                    const SizedBox(height: 12),
                    SizedBox(height: 220, child: _Inspector(arabic: arabic, workflow: workflow)),
                  ],
                );
              }
              return Row(
                children: [
                  SizedBox(width: 220, child: _NodePalette(arabic: arabic, onAdd: onAdd)),
                  Expanded(child: _Canvas(arabic: arabic, workflow: workflow)),
                  SizedBox(width: 230, child: _Inspector(arabic: arabic, workflow: workflow)),
                ],
              );
            },
          ),
        ),
      ],
    );
  }
}

class _NodePalette extends StatelessWidget {
  const _NodePalette({required this.arabic, required this.onAdd, this.compact = false});
  final bool arabic;
  final ValueChanged<FlowNodeDefinition> onAdd;
  final bool compact;

  @override
  Widget build(BuildContext context) => Container(
        margin: EdgeInsets.only(left: compact ? 0 : 18, bottom: compact ? 0 : 18),
        padding: const EdgeInsets.all(12),
        decoration: _panelDecoration(),
        child: ListView(
          children: [
            Text(arabic ? 'العقد' : 'Nodes', style: const TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            for (final node in flowStarterNodes)
              Padding(
                padding: const EdgeInsets.only(bottom: 7),
                child: OutlinedButton.icon(
                  onPressed: () => onAdd(node),
                  icon: const Icon(Icons.add, size: 15),
                  label: Text(node.title),
                  style: OutlinedButton.styleFrom(alignment: Alignment.centerLeft, padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12)),
                ),
              ),
          ],
        ),
      );
}

class _Canvas extends StatelessWidget {
  const _Canvas({required this.arabic, required this.workflow, this.compact = false});
  final bool arabic;
  final FlowWorkflow workflow;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: compact ? 0 : 10, vertical: 0),
      decoration: BoxDecoration(
        color: const Color(0xFF0C1017),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: .06)),
      ),
      child: CustomPaint(
        painter: _GridPainter(),
        child: Padding(
          padding: EdgeInsets.all(compact ? 16 : 28),
          child: ListView.separated(
            itemCount: workflow.nodes.length,
            separatorBuilder: (_, __) => const SizedBox(height: 16),
            itemBuilder: (context, index) {
              final node = workflow.nodes[index];
              return Center(
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 390),
                  padding: const EdgeInsets.all(15),
                  decoration: BoxDecoration(
                    color: const Color(0xFF171C25),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: index == 0 ? const Color(0xFFD6B56A).withValues(alpha: .55) : Colors.white.withValues(alpha: .08)),
                    boxShadow: const [BoxShadow(blurRadius: 20, spreadRadius: -14, offset: Offset(0, 10))],
                  ),
                  child: Row(
                    children: [
                      Container(width: 8, height: 42, decoration: BoxDecoration(color: index == 0 ? const Color(0xFFD6B56A) : const Color(0xFF64DDF2), borderRadius: BorderRadius.circular(8))),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(node.definition.category.toUpperCase(), style: const TextStyle(color: Color(0xFF8F98A8), fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 1.2)), const SizedBox(height: 3), Text(node.definition.title, style: const TextStyle(fontWeight: FontWeight.w800)), const SizedBox(height: 3), Text(node.id, style: const TextStyle(color: Color(0xFF6E7786), fontSize: 10))])),
                      const Icon(Icons.drag_indicator, color: Color(0xFF6E7786)),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _Inspector extends StatelessWidget {
  const _Inspector({required this.arabic, required this.workflow});
  final bool arabic;
  final FlowWorkflow workflow;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(right: 18, bottom: 18),
        padding: const EdgeInsets.all(15),
        decoration: _panelDecoration(),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(arabic ? 'التحقق' : 'Validation', style: const TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          _StatusRow(icon: Icons.check_circle, title: arabic ? 'المحفز موجود' : 'Trigger present'),
          _StatusRow(icon: Icons.check_circle, title: arabic ? 'الإصدار ثابت' : 'Version bound'),
          _StatusRow(icon: Icons.shield_outlined, title: arabic ? 'النشر يحتاج موافقة' : 'Publishing needs approval'),
          const Spacer(),
          FilledButton.icon(onPressed: () {}, icon: const Icon(Icons.science_outlined), label: Text(arabic ? 'Test Run' : 'Test Run')),
          const SizedBox(height: 8),
          OutlinedButton.icon(onPressed: () {}, icon: const Icon(Icons.play_arrow), label: Text(arabic ? 'تفعيل' : 'Activate')),
        ]),
      );
}

class _SimpleBuilder extends StatelessWidget {
  const _SimpleBuilder({required this.arabic, required this.workflow, required this.onMode, required this.onExecutionMode});
  final bool arabic;
  final FlowWorkflow workflow;
  final ValueChanged<FlowBuilderMode> onMode;
  final ValueChanged<FlowExecutionMode> onExecutionMode;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(22),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(arabic ? 'البناء بخطوات' : 'Step Builder', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          Text(arabic ? 'نفس الـ Workflow، بطريقة أبسط.' : 'The same workflow definition, presented as an ordered sequence.', style: const TextStyle(color: Color(0xFF8F98A8))),
          const SizedBox(height: 18),
          for (var i = 0; i < workflow.nodes.length; i++)
            Card(child: ListTile(leading: CircleAvatar(radius: 14, child: Text('${i + 1}')), title: Text(workflow.nodes[i].definition.title), subtitle: Text(workflow.nodes[i].definition.category))),
          const Spacer(),
          Row(children: [
            OutlinedButton(onPressed: () => onMode(FlowBuilderMode.hybrid), child: Text(arabic ? 'التبديل للهجين' : 'Switch to Hybrid')),
            const SizedBox(width: 10),
            DropdownButton<FlowExecutionMode>(value: workflow.executionMode, items: FlowExecutionMode.values.map((mode) => DropdownMenuItem(value: mode, child: Text(mode.name))).toList(), onChanged: (value) { if (value != null) onExecutionMode(value); }),
          ]),
        ]),
      );
}

class _RunsPanel extends StatelessWidget {
  const _RunsPanel({required this.arabic});
  final bool arabic;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(22),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(arabic ? 'التشغيل والمراقبة' : 'Runs & Live Monitor', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 16),
          _RunCard(status: FlowRunStatus.completed, title: arabic ? 'تجربة المحتوى الاجتماعي' : 'Social content test', duration: '00:12'),
          _RunCard(status: FlowRunStatus.waitingApproval, title: arabic ? 'حملة أسبوعية' : 'Weekly campaign', duration: '04:31'),
          _RunCard(status: FlowRunStatus.paused, title: arabic ? 'مزامنة التحليلات' : 'Analytics sync', duration: '01:09'),
        ]),
      );
}

class _RunCard extends StatelessWidget {
  const _RunCard({required this.status, required this.title, required this.duration});
  final FlowRunStatus status;
  final String title;
  final String duration;

  @override
  Widget build(BuildContext context) => Card(child: ListTile(leading: Icon(_icon, color: _color), title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)), subtitle: Text('${status.name} · $duration'), trailing: PopupMenuButton<String>(itemBuilder: (_) => const [PopupMenuItem(value: 'pause', child: Text('Pause')), PopupMenuItem(value: 'stop', child: Text('Stop'))])));

  IconData get _icon => switch (status) { FlowRunStatus.completed => Icons.check_circle, FlowRunStatus.waitingApproval => Icons.pending_actions, FlowRunStatus.paused => Icons.pause_circle, _ => Icons.circle_outlined };
  Color get _color => switch (status) { FlowRunStatus.completed => const Color(0xFF6FD69B), FlowRunStatus.waitingApproval => const Color(0xFFD6B56A), FlowRunStatus.paused => const Color(0xFF64DDF2), _ => Colors.white };
}

class _LibraryPanel extends StatelessWidget {
  const _LibraryPanel({required this.arabic, required this.onAdd});
  final bool arabic;
  final ValueChanged<FlowNodeDefinition> onAdd;

  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.all(22), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(arabic ? 'مكتبة العقد' : 'Node Library', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)), const SizedBox(height: 14), Expanded(child: GridView.extent(maxCrossAxisExtent: 280, crossAxisSpacing: 12, mainAxisSpacing: 12, children: [for (final node in flowStarterNodes) Card(child: InkWell(onTap: () => onAdd(node), borderRadius: BorderRadius.circular(18), child: Padding(padding: const EdgeInsets.all(18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Icon(Icons.extension_outlined, color: Color(0xFF64DDF2)), const Spacer(), Text(node.category.toUpperCase(), style: const TextStyle(fontSize: 9, color: Color(0xFF8F98A8), fontWeight: FontWeight.w800)), const SizedBox(height: 4), Text(node.title, style: const TextStyle(fontWeight: FontWeight.w800))]))))]))]));
}

class _FieldCard extends StatelessWidget {
  const _FieldCard({required this.title, required this.value, required this.icon});
  final String title;
  final String value;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Card(child: Padding(padding: const EdgeInsets.all(12), child: Row(children: [Icon(icon, color: const Color(0xFFD6B56A), size: 18), const SizedBox(width: 9), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(color: Color(0xFF8F98A8), fontSize: 9)), const SizedBox(height: 2), Text(value, style: const TextStyle(fontWeight: FontWeight.w800))]))])));
}

class _ExecutionCard extends StatelessWidget {
  const _ExecutionCard({required this.mode, required this.onChanged, required this.arabic});
  final FlowExecutionMode mode;
  final ValueChanged<FlowExecutionMode> onChanged;
  final bool arabic;
  @override
  Widget build(BuildContext context) => Card(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7), child: DropdownButtonHideUnderline(child: DropdownButton<FlowExecutionMode>(isExpanded: true, value: mode, items: FlowExecutionMode.values.map((value) => DropdownMenuItem(value: value, child: Text('${arabic ? 'الوضع' : 'Mode'}: ${value.name}'))).toList(), onChanged: (value) { if (value != null) onChanged(value); }))));
}

class _StatusRow extends StatelessWidget {
  const _StatusRow({required this.icon, required this.title});
  final IconData icon;
  final String title;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 10), child: Row(children: [Icon(icon, size: 17, color: const Color(0xFF6FD69B)), const SizedBox(width: 8), Expanded(child: Text(title, style: const TextStyle(fontSize: 11)))]));
}

BoxDecoration _panelDecoration() => BoxDecoration(color: const Color(0xFF11141B), borderRadius: BorderRadius.circular(18), border: Border.all(color: Colors.white.withValues(alpha: .07)));

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = const Color(0xFF202633).withValues(alpha: .45)..strokeWidth = .6;
    const step = 28.0;
    for (double x = 0; x < size.width; x += step) canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    for (double y = 0; y < size.height; y += step) canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
