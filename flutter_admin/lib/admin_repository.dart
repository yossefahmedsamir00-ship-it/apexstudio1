import 'package:supabase_flutter/supabase_flutter.dart';

class DashboardData {
  const DashboardData({
    required this.inquiries,
    required this.conversations,
    required this.invoices,
    required this.events,
    required this.securityEvents,
    required this.auditLogs,
    required this.runtimeControls,
    required this.lastSync,
  });

  final List<Map<String, dynamic>> inquiries;
  final List<Map<String, dynamic>> conversations;
  final List<Map<String, dynamic>> invoices;
  final List<Map<String, dynamic>> events;
  final List<Map<String, dynamic>> securityEvents;
  final List<Map<String, dynamic>> auditLogs;
  final Map<String, dynamic> runtimeControls;
  final DateTime lastSync;
}

class AdminRepository {
  AdminRepository(this._client);

  final SupabaseClient _client;

  Map<String, dynamic> _map(dynamic value) =>
      value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};

  List<Map<String, dynamic>> _rows(dynamic value) {
    if (value is! List) return <Map<String, dynamic>>[];
    return value.whereType<Map>().map((row) => Map<String, dynamic>.from(row)).toList();
  }

  Future<DashboardData> loadDashboard() async {
    final results = await Future.wait<dynamic>([
      _client.from('project_inquiries').select('*').order('created_at', ascending: false).limit(100),
      _client.functions.invoke('apex-client-chat', body: {'action': 'owner_list'}),
      _client.from('payment_orders').select('*').order('created_at', ascending: false).limit(100),
      _client.from('site_events').select('*').order('created_at', ascending: false).limit(100),
      _client.rpc('get_apex_runtime_controls'),
    ]);

    final chat = _map((results[1] as FunctionResponse).data);
    final conversations = _rows(chat['conversations']);
    final runtime = _map(results[4]);
    return DashboardData(
      inquiries: _rows(results[0]),
      conversations: conversations,
      invoices: _rows(results[2]),
      events: _rows(results[3]),
      securityEvents: _rows(chat['securityEvents']),
      auditLogs: _rows(chat['auditLogs']),
      runtimeControls: runtime,
      lastSync: DateTime.now(),
    );
  }

  Future<void> changeInquiryStatus(String id, String status) async {
    const allowed = {'new', 'contacted', 'in_progress', 'completed', 'cancelled'};
    if (!allowed.contains(status)) throw ArgumentError('Unsupported inquiry status.');
    await _client.from('project_inquiries').update({'status': status}).eq('id', id);
  }

  Future<void> setEmergencyLockdown({required bool enabled, String? reason}) async {
    await _client.rpc('set_apex_emergency_lockdown', params: {
      'p_enabled': enabled,
      'p_reason': enabled ? reason : null,
    });
  }

  Future<List<Map<String, dynamic>>> loadConversation(String id) async {
    final response = await _client.functions.invoke('apex-client-chat', body: {
      'action': 'owner_history',
      'conversationId': id,
    });
    final data = _map(response.data);
    return _rows(data['messages']);
  }

  Future<void> sendReply(String id, String body) async {
    final key = 'owner:${DateTime.now().microsecondsSinceEpoch}';
    await _client.functions.invoke('apex-client-chat', body: {
      'action': 'owner_send',
      'conversationId': id,
      'body': body.trim(),
      'idempotencyKey': key,
    });
  }

  Future<void> changeConversationStatus(String id, String status) async {
    await _client.functions.invoke('apex-client-chat', body: {
      'action': 'owner_status',
      'conversationId': id,
      'status': status,
    });
  }

  Future<Map<String, dynamic>> createInvoice({
    required double amountEgp,
    required String description,
    String? inquiryId,
  }) async {
    // The current server-side Kashier function accepts customer checkout tokens only.
    // It intentionally does not expose invoice creation to clients; creating a fake
    // checkout URL here would be unsafe. Add an owner-authorized server endpoint first.
    throw const AdminFeatureUnavailableException(
      'Invoice creation is not enabled on the server yet. No payment link was created.',
    );
  }
}

class AdminFeatureUnavailableException implements Exception {
  const AdminFeatureUnavailableException(this.message);
  final String message;
  @override
  String toString() => message;
}
