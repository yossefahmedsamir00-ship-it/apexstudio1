import 'dart:math';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'flow_engine_api.dart';
import 'flow_engine_models.dart';

const _gold = Color(0xFFD6B56A);
const _surface = Color(0xFF11141B);
const _muted = Color(0xFF9AA4B2);
const _green = Color(0xFF8FE0B4);
const _blue = Color(0xFF8EB8FF);

class FlowEngineScreen extends StatefulWidget {
  const FlowEngineScreen({super.key});

  @override
  State<FlowEngineScreen> createState() => _FlowEngineScreenState();
}

class _FlowEngineScreenState extends State<FlowEngineScreen> {
  late final FlowEngineApi _api;
  final _prompt = TextEditingController();
  bool _loading = true;
  bool _submitting = false;
  String? _error;
  String? _notice;
  List<FlowOperationModel> _operations = [];
  List<FlowVideoProjectModel> _projects = [];
  List<FlowApprovalModel> _approvals = [];
  List<FlowPublishingDraftModel> _drafts = [];
  List<FlowFinancialEntryModel> _entries = [];

  @override
  void initState() {
    super.initState();
    _api = FlowEngineApi(Supabase.instance.client);
    _load();
  }

  @override
  void dispose() {
    _prompt.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final results = await Future.wait<Object>([
        _api.listOperations(),
        _api.listProjects(),
        _api.listApprovals(),
        _api.listPublishingDrafts(),
        _api.listFinancialEntries(),
      ]);
      if (!mounted) return;
      setState(() {
        _operations = results[0] as List<FlowOperationModel>;
        _projects = results[1] as List<FlowVideoProjectModel>;
        _approvals = results[2] as List<FlowApprovalModel>;
        _drafts = results[3] as List<FlowPublishingDraftModel>;
        _entries = results[4] as List<FlowFinancialEntryModel>;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error is FlowEngineException
            ? error.message
            : 'Flow Engine data could not be loaded.';
        _loading = false;
      });
    }
  }

  Future<void> _createRequest() async {
    final text = _prompt.text.trim();
    if (text.isEmpty || _submitting) return;
    setState(() {
      _submitting = true;
      _error = null;
      _notice = null;
    });
    try {
      final key = 'flutter_${DateTime.now().microsecondsSinceEpoch}_${Random.secure().nextInt(1 << 32)}';
      await _api.createRequest(
        prompt: text,
        locale: Localizations.localeOf(context).languageCode == 'ar' ? 'ar' : 'en',
        idempotencyKey: key,
      );
      _prompt.clear();
      if (!mounted) return;
      setState(() => _notice = 'Request saved as a draft. No external action was run.');
      await _load();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error is FlowEngineException
          ? error.message
          : 'The request could not be saved.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _decide(FlowApprovalModel approval, String decision) async {
    try {
      await _api.decideApproval(approvalId: approval.id, decision: decision);
      if (!mounted) return;
      setState(() => _notice = decision == 'approved'
          ? 'Approval recorded.'
          : 'Rejection recorded.');
      await _load();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error is FlowEngineException
          ? error.message
          : 'The approval decision could not be recorded.');
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'approved':
      case 'succeeded':
      case 'confirmed':
      case 'completed':
        return _green;
      case 'waiting_approval':
      case 'pending':
      case 'awaiting_approval':
        return _gold;
      case 'running':
      case 'queued':
      case 'estimated':
        return _blue;
      case 'failed':
      case 'rejected':
        return const Color(0xFFFF8C86);
      default:
        return _muted;
    }
  }

  Widget _panel({required String title, required IconData icon, required Widget child}) {
    return Card(
      color: _surface,
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              Icon(icon, color: _gold, size: 19),
              const SizedBox(width: 9),
              Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w800))),
            ]),
            const SizedBox(height: 14),
            child,
          ],
        ),
      ),
    );
  }

  Widget _metric(String title, int value, IconData icon) {
    return Card(
      color: _surface,
      child: Padding(
        padding: const EdgeInsets.all(13),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, size: 18, color: _gold),
          const SizedBox(height: 10),
          Text('$value', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
          const SizedBox(height: 3),
          Text(title, style: const TextStyle(color: _muted, fontSize: 11)),
        ]),
      ),
    );
  }

  Widget _status(String status) => DecoratedBox(
        decoration: BoxDecoration(
          color: _statusColor(status).withValues(alpha: .10),
          border: Border.all(color: _statusColor(status).withValues(alpha: .3)),
          borderRadius: BorderRadius.circular(99),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
          child: Text(status.replaceAll('_', ' '),
              style: TextStyle(color: _statusColor(status), fontSize: 10, fontWeight: FontWeight.w700)),
        ),
      );

  Widget _operationTile(FlowOperationModel operation) => Container(
        margin: const EdgeInsets.only(bottom: 9),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF0C0F14),
          border: Border.all(color: Colors.white.withValues(alpha: .06)),
          borderRadius: BorderRadius.circular(11),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(operation.title, style: const TextStyle(fontWeight: FontWeight.w700))),
            _status(operation.status),
          ]),
          const SizedBox(height: 6),
          Text(operation.summary, style: const TextStyle(color: _muted, fontSize: 11)),
          const SizedBox(height: 9),
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: LinearProgressIndicator(
              value: operation.progress.clamp(0, 100) / 100,
              minHeight: 4,
              backgroundColor: Colors.white.withValues(alpha: .08),
              valueColor: const AlwaysStoppedAnimation<Color>(_gold),
            ),
          ),
          const SizedBox(height: 5),
          Text('${operation.progress}% · ${operation.status}',
              style: const TextStyle(color: _muted, fontSize: 9)),
        ]),
      );

  Widget _approvalTile(FlowApprovalModel approval) => Container(
        margin: const EdgeInsets.only(bottom: 9),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF0C0F14),
          border: Border.all(color: Colors.white.withValues(alpha: .06)),
          borderRadius: BorderRadius.circular(11),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(approval.action.replaceAll('_', ' '),
                style: const TextStyle(fontWeight: FontWeight.w700))),
            _status(approval.decision),
          ]),
          const SizedBox(height: 6),
          Text(approval.target, style: const TextStyle(color: _muted, fontSize: 11)),
          Text('Revision #${approval.contentRevision}',
              style: const TextStyle(color: _muted, fontSize: 10)),
          if (approval.decision == 'pending') ...[
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: OutlinedButton.icon(
                onPressed: () => _decide(approval, 'approved'),
                icon: const Icon(Icons.check, size: 16),
                label: const Text('Approve'),
              )),
              const SizedBox(width: 8),
              Expanded(child: OutlinedButton.icon(
                onPressed: () => _decide(approval, 'rejected'),
                icon: const Icon(Icons.close, size: 16),
                label: const Text('Reject'),
              )),
            ]),
          ],
        ]),
      );

  Widget _empty(String text) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Text(text, style: const TextStyle(color: _muted, fontSize: 11)),
      );

  @override
  Widget build(BuildContext context) {
    final pending = _approvals.where((row) => row.decision == 'pending').length;
    final active = _operations.where((row) =>
        ['queued', 'running', 'waiting_approval'].contains(row.status)).length;

    if (_loading && _operations.isEmpty && _approvals.isEmpty) {
      return const Center(child: CircularProgressIndicator(color: _gold));
    }

    return RefreshIndicator(
      onRefresh: _load,
      color: _gold,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(children: [
            const Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('APEX FLOW ENGINE', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900, letterSpacing: 1.1)),
                SizedBox(height: 4),
                Text('Shared private operations workspace', style: TextStyle(color: _muted, fontSize: 11)),
              ],
            )),
            IconButton(
              onPressed: _loading ? null : _load,
              icon: const Icon(Icons.refresh),
              tooltip: 'Refresh Flow Engine data',
            ),
          ]),
          const SizedBox(height: 15),
          if (_error != null) _banner(_error!, isError: true),
          if (_notice != null) _banner(_notice!, isError: false),
          GridView.count(
            crossAxisCount: MediaQuery.sizeOf(context).width > 700 ? 4 : 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 9,
            mainAxisSpacing: 9,
            childAspectRatio: 1.48,
            children: [
              _metric('Operations', _operations.length, Icons.timeline),
              _metric('Active', active, Icons.bolt),
              _metric('Approvals', pending, Icons.verified_user_outlined),
              _metric('Video projects', _projects.length, Icons.movie_outlined),
            ],
          ),
          _panel(
            title: 'New command',
            icon: Icons.chat_bubble_outline,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              TextField(
                controller: _prompt,
                minLines: 3,
                maxLines: 6,
                maxLength: 8000,
                decoration: const InputDecoration(
                  hintText: 'Write a request for APEX…',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 8),
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: FilledButton.icon(
                  onPressed: _submitting || _prompt.text.trim().isEmpty ? null : _createRequest,
                  icon: _submitting
                      ? const SizedBox(width: 15, height: 15, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.send, size: 16),
                  label: const Text('Save request as draft'),
                ),
              ),
              const SizedBox(height: 5),
              const Text('Draft intake only. AI execution, video generation and publishing are not enabled.',
                  style: TextStyle(color: _muted, fontSize: 10)),
            ]),
          ),
          _panel(
            title: 'Operations',
            icon: Icons.timeline,
            child: _operations.isEmpty
                ? _empty('No operations yet.')
                : Column(children: _operations.take(12).map(_operationTile).toList()),
          ),
          _panel(
            title: 'Approval queue',
            icon: Icons.verified_user_outlined,
            child: _approvals.isEmpty
                ? _empty('No approval records yet.')
                : Column(children: _approvals.take(12).map(_approvalTile).toList()),
          ),
          _panel(
            title: 'Video projects',
            icon: Icons.movie_outlined,
            child: _projects.isEmpty
                ? _empty('No video projects yet.')
                : Column(children: _projects.take(10).map((project) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(project.title, style: const TextStyle(fontSize: 12)),
                    subtitle: Text(project.status, style: const TextStyle(color: _muted, fontSize: 10)),
                    trailing: const Icon(Icons.movie_outlined, color: _gold),
                  )).toList()),
          ),
          _panel(
            title: 'Publishing drafts',
            icon: Icons.campaign_outlined,
            child: _drafts.isEmpty
                ? _empty('No publishing drafts yet.')
                : Column(children: _drafts.take(10).map((draft) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(draft.title.isEmpty ? draft.platform : draft.title,
                        style: const TextStyle(fontSize: 12)),
                    subtitle: Text('${draft.platform} · revision ${draft.revision}',
                        style: const TextStyle(color: _muted, fontSize: 10)),
                    trailing: _status(draft.status),
                  )).toList()),
          ),
          _panel(
            title: 'Finance records',
            icon: Icons.account_balance_wallet_outlined,
            child: _entries.isEmpty
                ? _empty('No finance records yet. No revenue is assumed.')
                : Column(children: _entries.take(10).map((entry) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('${(entry.amountMinor / 100).toStringAsFixed(2)} ${entry.currency}',
                        style: const TextStyle(fontSize: 12)),
                    subtitle: Text('${entry.entryType} · ${entry.source}',
                        style: const TextStyle(color: _muted, fontSize: 10)),
                    trailing: _status(entry.status),
                  )).toList()),
          ),
        ],
      ),
    );
  }

  Widget _banner(String text, {required bool isError}) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(11),
        decoration: BoxDecoration(
          color: (isError ? const Color(0xFFFF8C86) : _green).withValues(alpha: .08),
          border: Border.all(color: (isError ? const Color(0xFFFF8C86) : _green).withValues(alpha: .25)),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(text, style: TextStyle(
          color: isError ? const Color(0xFFFFAAA4) : _green,
          fontSize: 11,
        )),
      );
}
