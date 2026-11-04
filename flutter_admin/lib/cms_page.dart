import 'package:flutter/material.dart';

const _cmsGold = Color(0xFFD6B56A);
const _cmsBlue = Color(0xFF64DDF2);
const _cmsPanel = Color(0xFF11141B);
const _cmsMuted = Color(0xFF9AA4B2);

class _CmsEntry {
  const _CmsEntry({
    required this.id,
    required this.title,
    required this.kind,
    required this.summary,
    required this.status,
  });

  final int id;
  final String title;
  final String kind;
  final String summary;
  final String status;

  _CmsEntry copyWith({
    String? title,
    String? kind,
    String? summary,
    String? status,
  }) => _CmsEntry(
    id: id,
    title: title ?? this.title,
    kind: kind ?? this.kind,
    summary: summary ?? this.summary,
    status: status ?? this.status,
  );
}

class CmsPage extends StatefulWidget {
  const CmsPage({super.key});

  @override
  State<CmsPage> createState() => _CmsPageState();
}

class _CmsPageState extends State<CmsPage> {
  final List<_CmsEntry> _entries = [
    const _CmsEntry(
      id: 1,
      title: 'Homepage hero',
      kind: 'Page section',
      summary: 'Main headline, supporting copy and primary call to action.',
      status: 'Published',
    ),
    const _CmsEntry(
      id: 2,
      title: 'Selected work',
      kind: 'Project collection',
      summary: 'Featured projects shown on the public APEX website.',
      status: 'Draft',
    ),
    const _CmsEntry(
      id: 3,
      title: 'Services overview',
      kind: 'Page section',
      summary: 'The four core service categories and their descriptions.',
      status: 'Ready',
    ),
  ];

  int _nextId = 4;
  String _filter = 'All';

  List<_CmsEntry> get _visibleEntries => _filter == 'All'
      ? _entries
      : _entries.where((entry) => entry.status == _filter).toList();

  Future<void> _editEntry({_CmsEntry? entry}) async {
    final result = await showDialog<_CmsEntry>(
      context: context,
      builder: (_) => _CmsEditorDialog(entry: entry, nextId: _nextId),
    );

    if (result == null || !mounted) return;
    setState(() {
      final index = _entries.indexWhere((item) => item.id == result.id);
      if (index >= 0) {
        _entries[index] = result;
      } else {
        _entries.insert(0, result);
        _nextId++;
      }
    });
  }

  Future<void> _preview(_CmsEntry entry) => showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      backgroundColor: _cmsPanel,
      title: Text('Preview · ${entry.title}'),
      content: SizedBox(
        width: 460,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(entry.kind.toUpperCase(), style: const TextStyle(color: _cmsGold, letterSpacing: 1.4, fontSize: 11)),
            const SizedBox(height: 16),
            Text(entry.title, style: const TextStyle(fontSize: 25, fontWeight: FontWeight.w800)),
            const SizedBox(height: 10),
            Text(entry.summary.isEmpty ? 'Add a summary to complete this content block.' : entry.summary),
            const SizedBox(height: 20),
            const Text('Local preview only · not published', style: TextStyle(color: _cmsMuted, fontSize: 12)),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close preview')),
      ],
    ),
  );

  Color _statusColor(String status) => switch (status) {
    'Published' => const Color(0xFF8FE0B4),
    'Ready' => _cmsBlue,
    _ => const Color(0xFFFFB27A),
  };

  @override
  Widget build(BuildContext context) {
    final published = _entries.where((entry) => entry.status == 'Published').length;
    final drafts = _entries.where((entry) => entry.status == 'Draft').length;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(18),
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('CONTENT MANAGEMENT', style: TextStyle(color: _cmsGold, fontSize: 11, letterSpacing: 1.8, fontWeight: FontWeight.w700)),
                  SizedBox(height: 7),
                  Text('Content studio', style: TextStyle(fontSize: 27, fontWeight: FontWeight.w900)),
                  SizedBox(height: 5),
                  Text('Manage the words and sections that shape the APEX experience.', style: TextStyle(color: _cmsMuted)),
                ],
              ),
            ),
            FilledButton.icon(
              onPressed: () => _editEntry(),
              icon: const Icon(Icons.add, size: 18),
              label: const Text('New content'),
            ),
          ],
        ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(13),
          decoration: BoxDecoration(
            color: const Color(0xFF1A202A),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: _cmsBlue.withValues(alpha: .22)),
          ),
          child: const Row(
            children: [
              Icon(Icons.science_outlined, color: _cmsBlue),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Demo mode · edits stay in this session. Secure publishing will be enabled after the CMS backend is configured.',
                  style: TextStyle(fontSize: 12, color: Colors.white70),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth > 850 ? 3 : 2;
            return GridView.count(
              crossAxisCount: columns,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 2.3,
              children: [
                _CmsMetric(label: 'Content items', value: _entries.length.toString(), icon: Icons.article_outlined, color: _cmsGold),
                _CmsMetric(label: 'Published', value: published.toString(), icon: Icons.public_outlined, color: const Color(0xFF8FE0B4)),
                _CmsMetric(label: 'Drafts', value: drafts.toString(), icon: Icons.edit_note_outlined, color: const Color(0xFFFFB27A)),
              ],
            );
          },
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            const Expanded(child: Text('Your content', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800))),
            DropdownButton<String>(
              value: _filter,
              underline: const SizedBox.shrink(),
              items: const ['All', 'Published', 'Ready', 'Draft']
                  .map((status) => DropdownMenuItem(value: status, child: Text(status)))
                  .toList(),
              onChanged: (value) => setState(() => _filter = value ?? 'All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_visibleEntries.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 34),
            child: Center(child: Text('No content in this filter.', style: TextStyle(color: _cmsMuted))),
          )
        else
          ..._visibleEntries.map((entry) => Card(
            color: _cmsPanel,
            margin: const EdgeInsets.only(bottom: 10),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(color: _cmsGold.withValues(alpha: .12), borderRadius: BorderRadius.circular(12)),
                    child: const Icon(Icons.article_outlined, color: _cmsGold),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(entry.title, style: const TextStyle(fontWeight: FontWeight.w800)),
                        const SizedBox(height: 4),
                        Text('${entry.kind} · ${entry.summary}', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: _cmsMuted, fontSize: 12)),
                        const SizedBox(height: 7),
                        Text(entry.status, style: TextStyle(color: _statusColor(entry.status), fontSize: 11, fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Preview ${entry.title}',
                    onPressed: () => _preview(entry),
                    icon: const Icon(Icons.visibility_outlined, color: _cmsBlue),
                  ),
                  IconButton(
                    tooltip: 'Edit ${entry.title}',
                    onPressed: () => _editEntry(entry: entry),
                    icon: const Icon(Icons.edit_outlined),
                  ),
                  Tooltip(
                    message: 'Publishing will be enabled after backend setup',
                    child: IconButton(
                      onPressed: null,
                      icon: const Icon(Icons.publish_outlined),
                    ),
                  ),
                ],
              ),
            ),
          )),
      ],
    );
  }
}

class _CmsEditorDialog extends StatefulWidget {
  const _CmsEditorDialog({required this.entry, required this.nextId});

  final _CmsEntry? entry;
  final int nextId;

  @override
  State<_CmsEditorDialog> createState() => _CmsEditorDialogState();
}

class _CmsEditorDialogState extends State<_CmsEditorDialog> {
  late final TextEditingController _title;
  late final TextEditingController _summary;
  late String _kind;

  @override
  void initState() {
    super.initState();
    _title = TextEditingController(text: widget.entry?.title ?? '');
    _summary = TextEditingController(text: widget.entry?.summary ?? '');
    _kind = widget.entry?.kind ?? 'Page section';
  }

  @override
  void dispose() {
    _title.dispose();
    _summary.dispose();
    super.dispose();
  }

  void _save() {
    final cleanTitle = _title.text.trim();
    if (cleanTitle.isEmpty) return;
    final existing = widget.entry;
    Navigator.pop(
      context,
      _CmsEntry(
        id: existing?.id ?? widget.nextId,
        title: cleanTitle,
        kind: _kind,
        summary: _summary.text.trim(),
        status: existing?.status == 'Published' ? 'Draft' : (existing?.status ?? 'Draft'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    backgroundColor: _cmsPanel,
    title: Text(widget.entry == null ? 'Create content' : 'Edit content'),
    content: SizedBox(
      width: 440,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _title,
              decoration: const InputDecoration(labelText: 'Content title'),
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: _kind,
              decoration: const InputDecoration(labelText: 'Content type'),
              items: const [
                DropdownMenuItem(value: 'Page section', child: Text('Page section')),
                DropdownMenuItem(value: 'Project', child: Text('Project')),
                DropdownMenuItem(value: 'Service', child: Text('Service')),
                DropdownMenuItem(value: 'Announcement', child: Text('Announcement')),
              ],
              onChanged: (value) {
                if (value != null) setState(() => _kind = value);
              },
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _summary,
              minLines: 3,
              maxLines: 5,
              decoration: const InputDecoration(labelText: 'Summary / content brief'),
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: 12),
            const Text(
              'This draft is stored in this preview session only. No server data is changed.',
              style: TextStyle(color: _cmsMuted, fontSize: 12),
            ),
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: _save,
        child: const Text('Save draft'),
      ),
    ],
  );
}

class _CmsMetric extends StatelessWidget {
  const _CmsMetric({required this.label, required this.value, required this.icon, required this.color});

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => Card(
    color: _cmsPanel,
    child: Padding(
      padding: const EdgeInsets.all(13),
      child: Row(
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                Text(label, style: const TextStyle(color: _cmsMuted, fontSize: 11)),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}
