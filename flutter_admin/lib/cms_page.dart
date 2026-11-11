import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const _cmsElectricBlue = Color(0xFF1677FF);
const _cmsCyan = Color(0xFF12D9FF);
const _cmsPanel = Color(0xFF0C1422);
const _cmsMuted = Color(0xFF9AA9BC);

class CmsPage extends StatefulWidget {
  const CmsPage({super.key, this.client, this.demoMode = false});
  final SupabaseClient? client;
  final bool demoMode;
  @override
  State<CmsPage> createState() => _CmsPageState();
}

class _CmsEntry {
  const _CmsEntry({required this.id, required this.slug, required this.title, required this.kind,
    required this.summary, required this.status, this.sortOrder = 0, this.body = const {}});
  final String? id;
  final String slug, title, kind, summary, status;
  final int sortOrder;
  final Map<String, dynamic> body;

  factory _CmsEntry.fromMap(Map<String, dynamic> row) => _CmsEntry(
    id: row['id'] as String?, slug: row['slug'] as String, title: row['title'] as String,
    kind: row['content_type'] as String, summary: (row['summary'] as String?) ?? '',
    status: row['status'] as String, sortOrder: (row['sort_order'] as num?)?.toInt() ?? 0,
    body: row['body'] is Map ? Map<String, dynamic>.from(row['body'] as Map) : const {},
  );

  Map<String, dynamic> toMap({bool includeId = true}) => {
    if (includeId && id != null) 'id': id, 'slug': slug, 'title': title,
    'content_type': kind, 'summary': summary, 'status': status,
    'sort_order': sortOrder, 'body': body,
  };
}

class _CmsPageState extends State<CmsPage> {
  late final SupabaseClient? _client;
  List<_CmsEntry> _entries = [];
  String _filter = 'All';
  String? _error;
  bool _loading = true, _saving = false;

  static const _demoEntries = [
    _CmsEntry(id: 'demo-1', slug: 'homepage-hero', title: 'Homepage hero', kind: 'page_section',
      summary: 'Main headline, supporting copy and primary call to action.', status: 'published'),
    _CmsEntry(id: 'demo-2', slug: 'selected-work', title: 'Selected work', kind: 'project',
      summary: 'Featured projects shown on the public APEX website.', status: 'draft'),
    _CmsEntry(id: 'demo-3', slug: 'services-overview', title: 'Services overview', kind: 'page_section',
      summary: 'The four core service categories and their descriptions.', status: 'published'),
  ];

  @override
  void initState() {
    super.initState();
    _client = widget.client ?? (widget.demoMode ? null : Supabase.instance.client);
    _load();
  }

  Future<void> _load() async {
    if (widget.demoMode) {
      setState(() { _entries = List.of(_demoEntries); _loading = false; _error = null; });
      return;
    }
    try {
      final rows = await _client!.from('apex_site_content')
        .select('id,slug,title,content_type,summary,status,sort_order,body')
        .order('sort_order').order('updated_at', ascending: false);
      if (!mounted) return;
      setState(() {
        _entries = (rows as List).map((row) => _CmsEntry.fromMap(Map<String, dynamic>.from(row as Map))).toList();
        _loading = false; _error = null;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() { _loading = false; _error = 'Could not load saved content. Apply the CMS migration and verify the owner session.'; });
    }
  }

  List<_CmsEntry> get _visibleEntries => _entries.where((e) => _filter == 'All' || e.status == _filter.toLowerCase()).toList();

  Future<void> _editEntry({_CmsEntry? entry}) async {
    final result = await showDialog<_CmsEntry>(context: context, builder: (_) => _CmsEditorDialog(entry: entry));
    if (result == null || !mounted) return;
    setState(() => _saving = true);
    try {
      _CmsEntry saved = result;
      if (widget.demoMode) {
        _entries = [result, ..._entries.where((item) => item.id != result.id)];
      } else if (entry == null) {
        final row = await _client!.from('apex_site_content').insert(result.toMap(includeId: false))
          .select('id,slug,title,content_type,summary,status,sort_order,body').single();
        saved = _CmsEntry.fromMap(row); _entries = [saved, ..._entries];
      } else {
        final row = await _client!.from('apex_site_content').update(result.toMap()).eq('id', entry.id!)
          .select('id,slug,title,content_type,summary,status,sort_order,body').single();
        saved = _CmsEntry.fromMap(row); _entries = _entries.map((item) => item.id == saved.id ? saved : item).toList();
      }
      if (!mounted) return;
      setState(() { _saving = false; _error = null; });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(widget.demoMode ? 'Demo draft updated locally.' : 'Content saved successfully.')));
    } catch (_) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Save failed. Your changes were not marked as saved.')));
    }
  }

  Future<void> _setPublished(_CmsEntry entry, bool publish) async {
    try {
      final status = publish ? 'published' : 'draft';
      var updated = _CmsEntry(id: entry.id, slug: entry.slug, title: entry.title, kind: entry.kind,
        summary: entry.summary, status: status, sortOrder: entry.sortOrder, body: entry.body);
      if (!widget.demoMode) {
        final row = await _client!.from('apex_site_content').update({'status': status}).eq('id', entry.id!)
          .select('id,slug,title,content_type,summary,status,sort_order,body').single();
        updated = _CmsEntry.fromMap(row);
      }
      if (mounted) setState(() => _entries = _entries.map((item) => item.id == entry.id ? updated : item).toList());
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not change publishing status.')));
    }
  }

  Future<void> _preview(_CmsEntry entry) => showDialog<void>(context: context, builder: (context) => AlertDialog(
    backgroundColor: _cmsPanel, title: Text('Preview · ${entry.title}'),
    content: SizedBox(width: 460, child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(entry.kind.toUpperCase(), style: const TextStyle(color: _cmsElectricBlue, letterSpacing: 1.4, fontSize: 11)),
      const SizedBox(height: 16), Text(entry.title, style: const TextStyle(fontSize: 25, fontWeight: FontWeight.w800)),
      const SizedBox(height: 10), Text(entry.summary.isEmpty ? 'Add a summary to complete this content block.' : entry.summary),
      const SizedBox(height: 20), const Text('Preview only · publishing is a separate action', style: TextStyle(color: _cmsMuted, fontSize: 12)),
    ])),
    actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close preview'))],
  ));

  @override
  Widget build(BuildContext context) {
    final published = _entries.where((e) => e.status == 'published').length;
    final drafts = _entries.length - published;
    return ListView(physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.all(18), children: [
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('CONTENT MANAGEMENT', style: TextStyle(color: _cmsElectricBlue, fontSize: 11, letterSpacing: 1.8, fontWeight: FontWeight.w700)),
          SizedBox(height: 7), Text('Content studio', style: TextStyle(fontSize: 27, fontWeight: FontWeight.w900)),
          SizedBox(height: 5), Text('Manage the words and sections that shape the APEX experience.', style: TextStyle(color: _cmsMuted)),
        ])),
        FilledButton.icon(onPressed: _loading || _saving ? null : () => _editEntry(),
          icon: const Icon(Icons.add, size: 18), label: const Text('New content')),
      ]),
      const SizedBox(height: 18),
      if (widget.demoMode) Container(padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(color: const Color(0xFF1A202A), borderRadius: BorderRadius.circular(14),
          border: Border.all(color: _cmsCyan.withValues(alpha: .22))),
        child: const Row(children: [Icon(Icons.science_outlined, color: _cmsCyan), SizedBox(width: 10),
          Expanded(child: Text('Demo mode · changes are local and will not persist. Production uses the secured Supabase CMS.',
            style: TextStyle(fontSize: 12, color: Colors.white70)))])),
      if (_error != null) Container(padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(color: const Color(0xFF321D1D), borderRadius: BorderRadius.circular(14)),
        child: Text(_error!, style: const TextStyle(color: Color(0xFFFFB6AA), fontSize: 12))),
      const SizedBox(height: 16),
      if (_loading) const Center(child: Padding(padding: EdgeInsets.all(30), child: CircularProgressIndicator())),
      if (!_loading) ...[
        LayoutBuilder(builder: (context, constraints) {
          final columns = constraints.maxWidth > 850 ? 3 : 2;
          return GridView.count(crossAxisCount: columns, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 2.3, children: [
              _CmsMetric(label: 'Content items', value: _entries.length.toString(), icon: Icons.article_outlined, color: _cmsElectricBlue),
              _CmsMetric(label: 'Published', value: published.toString(), icon: Icons.public_outlined, color: const Color(0xFF8FE0B4)),
              _CmsMetric(label: 'Drafts', value: drafts.toString(), icon: Icons.edit_note_outlined, color: const Color(0xFFFFB27A)),
            ]);
        }),
        const SizedBox(height: 20),
        Row(children: [
          const Expanded(child: Text('Your content', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800))),
          DropdownButton<String>(value: _filter, underline: const SizedBox.shrink(),
            items: const ['All', 'Published', 'Draft'].map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(),
            onChanged: (v) => setState(() => _filter = v ?? 'All')),
        ]),
        const SizedBox(height: 8),
        if (_visibleEntries.isEmpty) const Padding(padding: EdgeInsets.symmetric(vertical: 34),
          child: Center(child: Text('No content in this filter.', style: TextStyle(color: _cmsMuted)))),
        ..._visibleEntries.map((entry) => Card(color: _cmsPanel, margin: const EdgeInsets.only(bottom: 10),
          child: Padding(padding: const EdgeInsets.all(14), child: Row(children: [
            Container(width: 42, height: 42, decoration: BoxDecoration(color: _cmsElectricBlue.withValues(alpha: .12),
              borderRadius: BorderRadius.circular(12)), child: const Icon(Icons.article_outlined, color: _cmsElectricBlue)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(entry.title, style: const TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 4), Text('${entry.kind.replaceAll('_', ' ')} · ${entry.summary}', maxLines: 2,
                overflow: TextOverflow.ellipsis, style: const TextStyle(color: _cmsMuted, fontSize: 12)),
              const SizedBox(height: 7), Text(entry.status, style: TextStyle(
                color: entry.status == 'published' ? const Color(0xFF8FE0B4) : const Color(0xFFFFB27A),
                fontSize: 11, fontWeight: FontWeight.w700)),
            ])),
            IconButton(tooltip: 'Preview ${entry.title}', onPressed: () => _preview(entry),
              icon: const Icon(Icons.visibility_outlined, color: _cmsCyan)),
            IconButton(tooltip: 'Edit ${entry.title}', onPressed: _saving ? null : () => _editEntry(entry: entry),
              icon: const Icon(Icons.edit_outlined)),
            IconButton(tooltip: entry.status == 'published' ? 'Unpublish' : 'Publish',
              onPressed: _saving ? null : () => _setPublished(entry, entry.status != 'published'),
              icon: Icon(entry.status == 'published' ? Icons.unpublished_outlined : Icons.publish_outlined, color: _cmsElectricBlue)),
          ])))),
      ],
    ]);
  }
}

class _CmsEditorDialog extends StatefulWidget {
  const _CmsEditorDialog({required this.entry});
  final _CmsEntry? entry;
  @override
  State<_CmsEditorDialog> createState() => _CmsEditorDialogState();
}
class _CmsEditorDialogState extends State<_CmsEditorDialog> {
  late final TextEditingController _title, _slug, _summary, _body;
  late String _kind;
  String? _bodyError;
  @override
  void initState() {
    super.initState();
    _title = TextEditingController(text: widget.entry?.title ?? '');
    _slug = TextEditingController(text: widget.entry?.slug ?? '');
    _summary = TextEditingController(text: widget.entry?.summary ?? '');
    _body = TextEditingController(text: jsonEncode(widget.entry?.body ?? const {}));
    _kind = widget.entry?.kind ?? 'page_section';
  }
  @override
  void dispose() { _title.dispose(); _slug.dispose(); _summary.dispose(); _body.dispose(); super.dispose(); }
  void _save() {
    final title = _title.text.trim(), slug = _slug.text.trim().toLowerCase();
    if (title.isEmpty || !RegExp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$').hasMatch(slug)) return;
    final dynamic decodedBody;
    try {
      decodedBody = jsonDecode(_body.text);
    } on FormatException {
      setState(() => _bodyError = 'Body must be a valid JSON object.');
      return;
    }
    if (decodedBody is! Map) {
      setState(() => _bodyError = 'Body must be a valid JSON object.');
      return;
    }
    final old = widget.entry;
    Navigator.pop(context, _CmsEntry(id: old?.id, slug: slug, title: title, kind: _kind,
      summary: _summary.text.trim(), status: old?.status == 'published' ? 'draft' : (old?.status ?? 'draft'),
      sortOrder: old?.sortOrder ?? 0, body: Map<String, dynamic>.from(decodedBody)));
  }
  @override
  Widget build(BuildContext context) => AlertDialog(backgroundColor: _cmsPanel,
    title: Text(widget.entry == null ? 'Create content' : 'Edit content'),
    content: SizedBox(width: 440, child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
      TextField(controller: _title, decoration: const InputDecoration(labelText: 'Content title')),
      const SizedBox(height: 12), TextField(controller: _slug, decoration: const InputDecoration(labelText: 'URL slug (lowercase-with-dashes)')),
      const SizedBox(height: 12), DropdownButtonFormField<String>(initialValue: _kind,
        decoration: const InputDecoration(labelText: 'Content type'),
        items: const [DropdownMenuItem(value: 'page_section', child: Text('Page section')),
          DropdownMenuItem(value: 'project', child: Text('Project')), DropdownMenuItem(value: 'service', child: Text('Service')),
          DropdownMenuItem(value: 'announcement', child: Text('Announcement'))],
        onChanged: (v) { if (v != null) setState(() => _kind = v); }),
      const SizedBox(height: 12), TextField(controller: _summary, minLines: 3, maxLines: 5,
        decoration: const InputDecoration(labelText: 'Summary / content brief')),
      const SizedBox(height: 12), TextField(controller: _body, minLines: 4, maxLines: 8,
        keyboardType: TextInputType.multiline,
        decoration: InputDecoration(labelText: 'Body JSON (object)', errorText: _bodyError,
          helperText: 'Structured fields used by the public website, for example category or project URL.')),
    ]))),
    actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
      FilledButton(onPressed: _save, child: const Text('Save draft'))]);
}

class _CmsMetric extends StatelessWidget {
  const _CmsMetric({required this.label, required this.value, required this.icon, required this.color});
  final String label, value; final IconData icon; final Color color;
  @override
  Widget build(BuildContext context) => Card(color: _cmsPanel, child: Padding(padding: const EdgeInsets.all(13),
    child: Row(children: [Icon(icon, color: color), const SizedBox(width: 10), Expanded(child: Column(
      mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
        Text(label, style: const TextStyle(color: _cmsMuted, fontSize: 11)),
      ]))])));
}
