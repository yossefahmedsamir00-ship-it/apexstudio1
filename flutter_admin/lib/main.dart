import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const supabaseUrl = String.fromEnvironment(
  'SUPABASE_URL',
  defaultValue: 'https://dyoaiszrmfrdxgouzgzq.supabase.co',
);
const supabasePublishableKey = String.fromEnvironment(
  'SUPABASE_PUBLISHABLE_KEY',
  defaultValue: 'sb_publishable_VD3iKy4zbt4pJFfZkO4YFA_rj5sS1Ui',
);

const _gold = Color(0xFFD6B56A);
const _cyan = Color(0xFF64DDF2);
const _surface = Color(0xFF11141B);
const _background = Color(0xFF080A0F);
const _muted = Color(0xFF9AA4B2);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(url: supabaseUrl, publishableKey: supabasePublishableKey);
  runApp(const ApexAdminApp());
}

bool ownerResponseIsVerified(dynamic data) =>
    data is Map && data['configured'] == true;

class ApexAdminApp extends StatelessWidget {
  const ApexAdminApp({super.key, this.forceConfigurationMissing = false});
  final bool forceConfigurationMissing;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: _background,
      colorScheme: ColorScheme.fromSeed(seedColor: _gold, brightness: Brightness.dark, surface: _surface),
      appBarTheme: const AppBarTheme(backgroundColor: _background, foregroundColor: Colors.white),
      cardTheme: CardThemeData(
        color: _surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: Colors.white.withValues(alpha: .07)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF171B23),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(13)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(13),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: .1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(13),
          borderSide: const BorderSide(color: _gold),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF252A34),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
    return MaterialApp(
      title: 'APEX STUDIO Admin',
      debugShowCheckedModeBanner: false,
      theme: theme,
      home: forceConfigurationMissing ? const ConfigScreen() : const OwnerAuthGate(),
    );
  }
}

class ApexBrandMark extends StatelessWidget {
  const ApexBrandMark({super.key, this.size = 56});
  final double size;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: size,
        height: size,
        child: CustomPaint(painter: _ApexBrandPainter()),
      );
}

class _ApexBrandPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 100;
    canvas.save();
    canvas.scale(scale, scale);

    final gold = Paint()
      ..color = _gold
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.2
      ..strokeJoin = StrokeJoin.round
      ..strokeCap = StrokeCap.round;
    final cyan = Paint()
      ..color = _cyan
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.4
      ..strokeCap = StrokeCap.round;

    final frame = Path()
      ..moveTo(50, 5)
      ..lineTo(91, 28)
      ..lineTo(91, 72)
      ..lineTo(50, 95)
      ..lineTo(9, 72)
      ..lineTo(9, 28)
      ..close();
    canvas.drawPath(frame, gold);

    final apex = Path()
      ..moveTo(25, 72)
      ..lineTo(50, 25)
      ..lineTo(75, 72);
    canvas.drawPath(apex, gold);

    final crossbar = Path()
      ..moveTo(37, 57)
      ..lineTo(63, 57);
    canvas.drawPath(crossbar, cyan);

    final core = Paint()
      ..color = _cyan
      ..style = PaintingStyle.fill;
    canvas.drawCircle(const Offset(50, 57), 3.2, core);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class ConfigScreen extends StatelessWidget {
  const ConfigScreen({super.key});

  @override
  Widget build(BuildContext context) => const Scaffold(
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ApexBrandMark(size: 64),
                SizedBox(height: 18),
                Text('APEX STUDIO Admin', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w800)),
                SizedBox(height: 10),
                Text(
                  'Supabase configuration is missing. Rebuild with SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: _muted),
                ),
              ],
            ),
          ),
        ),
      );
}

class OwnerAuthGate extends StatefulWidget {
  const OwnerAuthGate({super.key});

  @override
  State<OwnerAuthGate> createState() => _OwnerAuthGateState();
}

class _OwnerAuthGateState extends State<OwnerAuthGate> {
  late final SupabaseClient _client;
  late final StreamSubscription<AuthState> _subscription;
  bool _checking = true;
  bool _ownerVerified = false;
  String? _gateError;
  int _generation = 0;

  @override
  void initState() {
    super.initState();
    _client = Supabase.instance.client;
    _subscription = _client.auth.onAuthStateChange.listen((state) {
      unawaited(_verifySession(
        state.session,
        recordLogin: state.event == AuthChangeEvent.signedIn,
      ));
    });
    final current = _client.auth.currentSession;
    if (current == null) {
      _checking = false;
    } else {
      unawaited(_verifySession(current));
    }
  }

  Future<void> _verifySession(Session? session, {bool recordLogin = false}) async {
    final generation = ++_generation;
    if (session == null) {
      if (!mounted) return;
      setState(() {
        _checking = false;
        _ownerVerified = false;
      });
      return;
    }

    if (mounted) {
      setState(() {
        _checking = true;
        _ownerVerified = false;
        _gateError = null;
      });
    }

    try {
      final response = await _client.functions.invoke(
        'apex-owner-bootstrap',
        body: {'action': recordLogin ? 'login' : 'verify'},
      );
      if (response.status < 200 ||
          response.status >= 300 ||
          !ownerResponseIsVerified(response.data)) {
        final body = _asMap(response.data);
        throw Exception(_string(body['error'], 'This account is not authorized as the owner.'));
      }
      if (!mounted || generation != _generation) return;
      setState(() {
        _checking = false;
        _ownerVerified = true;
        _gateError = null;
      });
    } catch (error) {
      if (!mounted || generation != _generation) return;
      final message = _cleanError(error);
      try {
        await _client.auth.signOut();
      } catch (_) {
        // Server denial already keeps the private interface closed.
      }
      if (!mounted || _client.auth.currentSession != null) return;
      setState(() {
        _checking = false;
        _ownerVerified = false;
        _gateError = message;
      });
    }
  }

  @override
  void dispose() {
    _generation++;
    _subscription.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return const _LoadingScreen(
        title: 'Verifying owner access',
        subtitle: 'Checking your secure APEX session…',
      );
    }
    if (_client.auth.currentSession == null || !_ownerVerified) {
      return LoginScreen(key: const ValueKey('owner-login'), gateError: _gateError);
    }
    return const AdminShell();
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.gateError});
  final String? gateError;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final email = _email.text.trim();
      if (!_validEmail(email)) throw Exception('Enter a valid owner email.');
      if (_password.text.isEmpty) throw Exception('Enter your password.');
      await Supabase.instance.client.auth.signInWithPassword(
        email: email,
        password: _password.text,
      );
      // OwnerAuthGate verifies the signed-in account with the server.
    } catch (error) {
      if (mounted) setState(() => _error = _cleanError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(22),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(26),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Center(child: ApexBrandMark(size: 76)),
                      const SizedBox(height: 18),
                      const Text(
                        'APEX STUDIO',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 27, fontWeight: FontWeight.w900, letterSpacing: 2),
                      ),
                      const SizedBox(height: 5),
                      const Text(
                        'PRIVATE OWNER CONSOLE',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: _gold, fontSize: 11, letterSpacing: 2, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 28),
                      TextField(
                        controller: _email,
                        enabled: !_busy,
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const [AutofillHints.username],
                        decoration: const InputDecoration(labelText: 'Owner email', prefixIcon: Icon(Icons.alternate_email)),
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        controller: _password,
                        enabled: !_busy,
                        obscureText: true,
                        autofillHints: const [AutofillHints.password],
                        onSubmitted: (_) => _signIn(),
                        decoration: const InputDecoration(labelText: 'Password', prefixIcon: Icon(Icons.lock_outline)),
                      ),
                      if (widget.gateError != null || _error != null) ...[
                        const SizedBox(height: 14),
                        _MessageBanner(text: widget.gateError ?? _error!, isError: true),
                      ],
                      const SizedBox(height: 20),
                      FilledButton.icon(
                        onPressed: _busy ? null : _signIn,
                        icon: _busy
                            ? const SizedBox(width: 17, height: 17, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.login_rounded),
                        label: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: Text(_busy ? 'Please wait…' : 'Sign in securely'),
                        ),
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        'Owner access is granted only after the APEX server verifies your account.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: _muted, fontSize: 11, height: 1.5),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class AdminRepository {
  AdminRepository(this.client);
  final SupabaseClient client;

  Future<DashboardData> loadDashboard() async {
    final results = await Future.wait<dynamic>([
      client
          .from('project_inquiries')
          .select('id,client_name,client_email,client_phone,project_type,budget_range,brief,status,created_at')
          .order('created_at', ascending: false)
          .limit(100),
      client
          .from('payment_orders')
          .select('id,inquiry_id,amount_minor,currency,status,description,provider,provider_reference,created_at,paid_at')
          .order('created_at', ascending: false)
          .limit(100),
      client
          .from('site_events')
          .select('id,event_name,project_id,locale,path,created_at')
          .order('created_at', ascending: false)
          .limit(500),
      client.functions.invoke('apex-client-chat', body: {'action': 'owner_list'}),
      client.rpc('get_apex_runtime_controls'),
    ]);

    final chatResponse = results[3] as FunctionResponse;
    final chat = _asMap(chatResponse.data);
    if (chatResponse.status >= 400 || chat['error'] != null) {
      throw Exception(_string(chat['error'], 'Could not load the owner inbox.'));
    }

    return DashboardData(
      inquiries: _asRows(results[0]),
      invoices: _asRows(results[1]),
      events: _asRows(results[2]),
      conversations: _asRows(chat['conversations']),
      securityEvents: _asRows(chat['securityEvents']),
      auditLogs: _asRows(chat['auditLogs']),
      runtimeControls: _asMap(results[4]),
      lastSync: DateTime.now(),
    );
  }

  Future<List<Map<String, dynamic>>> loadConversation(String id) async {
    final response = await client.functions.invoke(
      'apex-client-chat',
      body: {'action': 'owner_read', 'conversationId': id},
    );
    final data = _asMap(response.data);
    if (response.status >= 400 || data['error'] != null) {
      throw Exception(_string(data['error'], 'Could not open this conversation.'));
    }
    return _asRows(data['messages']);
  }

  Future<void> sendReply(String conversationId, String body) async {
    final key = 'owner_${DateTime.now().microsecondsSinceEpoch}';
    final response = await client.functions.invoke(
      'apex-client-chat',
      body: {
        'action': 'owner_send',
        'conversationId': conversationId,
        'body': body.trim(),
        'idempotencyKey': key,
      },
    );
    final data = _asMap(response.data);
    if (response.status >= 400 || data['error'] != null) {
      throw Exception(_string(data['error'], 'Could not send the reply.'));
    }
  }

  Future<void> changeConversationStatus(String id, String status) async {
    final response = await client.functions.invoke(
      'apex-client-chat',
      body: {'action': 'owner_status', 'conversationId': id, 'status': status},
    );
    final data = _asMap(response.data);
    if (response.status >= 400 || data['error'] != null) {
      throw Exception(_string(data['error'], 'Could not update the conversation.'));
    }
  }

  Future<void> changeInquiryStatus(String id, String status) async {
    await client.from('project_inquiries').update({'status': status}).eq('id', id);
  }

  Future<Map<String, dynamic>> createInvoice({
    required double amountEgp,
    required String description,
    String? inquiryId,
  }) async {
    final response = await client.functions.invoke(
      'kashier-create-invoice',
      body: {'amountEGP': amountEgp, 'description': description.trim(), 'inquiryId': inquiryId},
    );
    final data = _asMap(response.data);
    if (response.status >= 400 || data['error'] != null) {
      throw Exception(_string(data['error'], 'Invoice creation failed.'));
    }
    if (data['checkoutUrl'] == null || data['invoice'] == null) {
      throw Exception('The payment service returned an incomplete response.');
    }
    return data;
  }

  Future<void> setEmergencyLockdown({required bool enabled, String? reason}) async {
    await client.rpc(
      'set_apex_emergency_lockdown',
      params: {'p_enabled': enabled, 'p_reason': reason},
    );
  }
}

class DashboardData {
  const DashboardData({
    required this.inquiries,
    required this.invoices,
    required this.events,
    required this.conversations,
    required this.securityEvents,
    required this.auditLogs,
    required this.runtimeControls,
    required this.lastSync,
  });

  final List<Map<String, dynamic>> inquiries;
  final List<Map<String, dynamic>> invoices;
  final List<Map<String, dynamic>> events;
  final List<Map<String, dynamic>> conversations;
  final List<Map<String, dynamic>> securityEvents;
  final List<Map<String, dynamic>> auditLogs;
  final Map<String, dynamic> runtimeControls;
  final DateTime lastSync;
}

class AdminShell extends StatefulWidget {
  const AdminShell({super.key});

  @override
  State<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends State<AdminShell> {
  static const _destinations = [
    NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Overview'),
    NavigationDestination(icon: Icon(Icons.inbox_outlined), selectedIcon: Icon(Icons.inbox), label: 'Leads'),
    NavigationDestination(icon: Icon(Icons.forum_outlined), selectedIcon: Icon(Icons.forum), label: 'Inbox'),
    NavigationDestination(icon: Icon(Icons.payments_outlined), selectedIcon: Icon(Icons.payments), label: 'Payments'),
    NavigationDestination(icon: Icon(Icons.timeline_outlined), selectedIcon: Icon(Icons.timeline), label: 'Activity'),
    NavigationDestination(icon: Icon(Icons.shield_outlined), selectedIcon: Icon(Icons.shield), label: 'Security'),
    NavigationDestination(icon: Icon(Icons.tune_outlined), selectedIcon: Icon(Icons.tune), label: 'Controls'),
  ];

  late final AdminRepository _repository;
  DashboardData? _data;
  bool _loading = true;
  bool _refreshing = false;
  String? _error;
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    _repository = AdminRepository(Supabase.instance.client);
    unawaited(_refresh(initial: true));
  }

  Future<void> _refresh({bool initial = false}) async {
    if (_refreshing) return;
    setState(() {
      _refreshing = true;
      if (initial) _loading = true;
      _error = null;
    });
    try {
      final data = await _repository.loadDashboard();
      if (!mounted) return;
      setState(() {
        _data = data;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = _cleanError(error);
        _loading = false;
      });
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  Future<void> _changeInquiryStatus(String id, String status) async {
    try {
      await _repository.changeInquiryStatus(id, status);
      await _refresh();
      _toast('Lead status updated.');
    } catch (error) {
      _toast(_cleanError(error), isError: true);
    }
  }

  Future<void> _setLockdown(bool enabled, String? reason) async {
    try {
      await _repository.setEmergencyLockdown(enabled: enabled, reason: reason);
      await _refresh();
      _toast(enabled ? 'Emergency lockdown enabled.' : 'Lockdown disabled.');
    } catch (error) {
      _toast(_cleanError(error), isError: true);
    }
  }

  void _toast(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? const Color(0xFF7C2D2D) : null,
      ),
    );
  }

  Widget _selectedPage(DashboardData data) {
    switch (_selectedIndex) {
      case 1:
        return LeadsPage(inquiries: data.inquiries, onChangeStatus: _changeInquiryStatus);
      case 2:
        return InboxPage(repository: _repository, conversations: data.conversations, onChanged: _refresh);
      case 3:
        return PaymentsPage(repository: _repository, invoices: data.invoices, inquiries: data.inquiries, onCreated: _refresh);
      case 4:
        return ActivityPage(events: data.events);
      case 5:
        return SecurityPage(securityEvents: data.securityEvents, auditLogs: data.auditLogs);
      case 6:
        return ControlsPage(controls: data.runtimeControls, onSetLockdown: _setLockdown, onRefresh: _refresh);
      default:
        return OverviewPage(data: data, repository: _repository, onChanged: _refresh);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _data == null) {
      return const _LoadingScreen(title: 'Loading APEX workspace', subtitle: 'Connecting to your secured project data…');
    }
    if (_data == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('APEX STUDIO')),
        body: _ErrorState(message: _error ?? 'Could not load the dashboard.', onRetry: _refresh),
      );
    }

    final data = _data!;
    final wide = MediaQuery.sizeOf(context).width >= 900;
    return Scaffold(
      appBar: AppBar(
        title: const Text('APEX STUDIO', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.2)),
        actions: [
          IconButton(
            tooltip: 'Refresh data',
            onPressed: _refreshing ? null : _refresh,
            icon: _refreshing
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.refresh),
          ),
          IconButton(tooltip: 'Sign out', onPressed: () => Supabase.instance.client.auth.signOut(), icon: const Icon(Icons.logout)),
          const SizedBox(width: 6),
        ],
      ),
      body: Row(children: [
        if (wide)
          NavigationRail(
            selectedIndex: _selectedIndex,
            onDestinationSelected: (value) => setState(() => _selectedIndex = value),
            labelType: NavigationRailLabelType.all,
            backgroundColor: _background,
            destinations: _destinations.map((item) => NavigationRailDestination(
              icon: item.icon,
              selectedIcon: item.selectedIcon,
              label: Text(item.label),
            )).toList(),
          ),
        if (wide) const VerticalDivider(width: 1),
        Expanded(
          child: Column(children: [
            if (_error != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: _MessageBanner(text: _error!, isError: true),
              ),
            Expanded(child: RefreshIndicator(onRefresh: _refresh, child: _selectedPage(data))),
          ]),
        ),
      ]),
      bottomNavigationBar: wide
          ? null
          : NavigationBar(
              selectedIndex: _selectedIndex,
              onDestinationSelected: (value) => setState(() => _selectedIndex = value),
              destinations: _destinations,
            ),
    );
  }
}

class OverviewPage extends StatelessWidget {
  const OverviewPage({super.key, required this.data, required this.repository, required this.onChanged});

  final DashboardData data;
  final AdminRepository repository;
  final Future<void> Function() onChanged;

  @override
  Widget build(BuildContext context) {
    final paid = data.invoices.where((item) => item['status'] == 'paid').length;
    final unread = data.conversations.fold<int>(0, (total, item) => total + _integer(item['unreadCount']));
    final locked = data.runtimeControls['emergency_lockdown'] == true;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(18),
      children: [
        const _SectionHeading(
          eyebrow: 'PRIVATE OWNER WORKSPACE',
          title: 'Command center',
          subtitle: 'Live visibility across your website and client operations.',
        ),
        if (locked) const _MessageBanner(text: 'Emergency lockdown is currently enabled.', isError: true),
        const SizedBox(height: 18),
        LayoutBuilder(builder: (context, constraints) {
          final columns = constraints.maxWidth > 1000 ? 4 : constraints.maxWidth > 600 ? 3 : 2;
          return GridView.count(
            crossAxisCount: columns,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.7,
            children: [
              _MetricCard(label: 'Client leads', value: data.inquiries.length.toString(), icon: Icons.inbox_outlined, accent: _gold),
              _MetricCard(label: 'Conversations', value: data.conversations.length.toString(), icon: Icons.forum_outlined, accent: _cyan),
              _MetricCard(label: 'Unread messages', value: unread.toString(), icon: Icons.mark_chat_unread_outlined, accent: const Color(0xFF8FE0B4)),
              _MetricCard(label: 'Invoices', value: data.invoices.length.toString(), icon: Icons.receipt_long_outlined, accent: const Color(0xFFB6A0FF)),
              _MetricCard(label: 'Paid invoices', value: paid.toString(), icon: Icons.verified_outlined, accent: const Color(0xFF8FE0B4)),
              _MetricCard(label: 'Tracked events', value: data.events.length.toString(), icon: Icons.insights_outlined, accent: const Color(0xFFFF9D73)),
            ],
          );
        }),
        const SizedBox(height: 24),
        const _SectionHeading(eyebrow: 'CLIENT PIPELINE', title: 'New inquiries'),
        if (data.inquiries.isEmpty)
          const _EmptyState(icon: Icons.inbox_outlined, title: 'No inquiries yet', subtitle: 'New client requests from the website will appear here.')
        else
          ...data.inquiries.take(5).map((item) => _InquiryCard(item: item)),
        const SizedBox(height: 24),
        const _SectionHeading(eyebrow: 'MESSAGING', title: 'Recent conversations'),
        if (data.conversations.isEmpty)
          const _EmptyState(icon: Icons.forum_outlined, title: 'Inbox is clear', subtitle: 'Website conversations will appear here.')
        else
          ...data.conversations.take(5).map((item) => _ConversationCard(
            item: item,
            onTap: () => Navigator.of(context).push(MaterialPageRoute(
              builder: (_) => ConversationDetailPage(repository: repository, conversation: item, onChanged: onChanged),
            )),
          )),
        const SizedBox(height: 16),
        Text('Last synced: ${_dateTime(data.lastSync)}', style: const TextStyle(color: _muted, fontSize: 11), textAlign: TextAlign.end),
      ],
    );
  }
}

class LeadsPage extends StatelessWidget {
  const LeadsPage({super.key, required this.inquiries, required this.onChangeStatus});

  final List<Map<String, dynamic>> inquiries;
  final Future<void> Function(String id, String status) onChangeStatus;
  static const statuses = ['new', 'contacted', 'in_progress', 'completed', 'cancelled'];

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(18),
      children: [
        const _SectionHeading(eyebrow: 'CLIENT PIPELINE', title: 'Project inquiries', subtitle: 'Review requests and keep each lead status up to date.'),
        if (inquiries.isEmpty)
          const _EmptyState(icon: Icons.inbox_outlined, title: 'No client leads', subtitle: 'Website inquiry submissions will show up here.'),
        ...inquiries.map((item) => _InquiryCard(
          item: item,
          statuses: statuses,
          onChangeStatus: (status) => onChangeStatus(_string(item['id'], ''), status),
        )),
      ],
    );
  }
}

class _InquiryCard extends StatelessWidget {
  const _InquiryCard({required this.item, this.statuses, this.onChangeStatus});

  final Map<String, dynamic> item;
  final List<String>? statuses;
  final ValueChanged<String>? onChangeStatus;

  @override
  Widget build(BuildContext context) {
    final phone = _string(item['client_phone'], '');
    final status = _string(item['status'], 'new');
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(_string(item['client_name'], 'Website visitor'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16))),
            _StatusPill(status: status),
          ]),
          const SizedBox(height: 5),
          Text(_string(item['client_email'], 'No email'), style: const TextStyle(color: _muted, fontSize: 12)),
          if (phone.isNotEmpty) Text(phone, style: const TextStyle(color: _muted, fontSize: 12)),
          const SizedBox(height: 12),
          Text(_string(item['project_type'], 'Project inquiry'), style: const TextStyle(color: _gold, fontWeight: FontWeight.w700)),
          if (_string(item['budget_range'], '').isNotEmpty)
            Text('Budget: ${item['budget_range']}', style: const TextStyle(color: _muted, fontSize: 12)),
          const SizedBox(height: 8),
          Text(_string(item['brief'], ''), style: const TextStyle(height: 1.5)),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: Text(_dateTime(item['created_at']), style: const TextStyle(color: _muted, fontSize: 11))),
            if (statuses != null && onChangeStatus != null)
              PopupMenuButton<String>(
                tooltip: 'Change lead status',
                onSelected: onChangeStatus,
                itemBuilder: (context) => statuses!.map((value) => PopupMenuItem(value: value, child: Text(_prettyStatus(value)))).toList(),
                child: const Padding(
                  padding: EdgeInsets.all(8),
                  child: Row(children: [Icon(Icons.edit_outlined, size: 17, color: _gold), SizedBox(width: 5), Text('Update', style: TextStyle(color: _gold))]),
                ),
              ),
          ]),
        ]),
      ),
    );
  }
}

class InboxPage extends StatelessWidget {
  const InboxPage({super.key, required this.repository, required this.conversations, required this.onChanged});

  final AdminRepository repository;
  final List<Map<String, dynamic>> conversations;
  final Future<void> Function() onChanged;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(18),
      children: [
        const _SectionHeading(eyebrow: 'CLIENT COMMUNICATION', title: 'Inbox', subtitle: 'Messages from the website and APEX AI are stored centrally.'),
        if (conversations.isEmpty)
          const _EmptyState(icon: Icons.forum_outlined, title: 'No conversations', subtitle: 'New website chats will appear here automatically.'),
        ...conversations.map((item) => _ConversationCard(
          item: item,
          onTap: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => ConversationDetailPage(repository: repository, conversation: item, onChanged: onChanged),
          )),
        )),
      ],
    );
  }
}

class _ConversationCard extends StatelessWidget {
  const _ConversationCard({required this.item, required this.onTap});

  final Map<String, dynamic> item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final unread = _integer(item['unreadCount']);
    final last = _asMap(item['lastMessage']);
    final sender = _string(last['senderType'], '');
    final senderLabel = sender == 'client' ? 'Client' : sender == 'owner' ? 'You' : sender == 'ai' ? 'APEX AI' : 'Message';
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            CircleAvatar(backgroundColor: _gold.withValues(alpha: .15), child: const Icon(Icons.person_outline, color: _gold)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(_string(item['clientName'], _string(item['clientEmail'], 'Website visitor')), style: const TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text(_string(item['subject'], 'Project inquiry'), style: const TextStyle(color: _gold, fontSize: 12)),
              if (last.isNotEmpty) ...[
                const SizedBox(height: 5),
                Text('$senderLabel: ${_string(last['body'], '')}', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: _muted, fontSize: 12)),
              ],
              const SizedBox(height: 5),
              Text(_dateTime(item['updatedAt']), style: const TextStyle(color: _muted, fontSize: 10)),
            ])),
            const SizedBox(width: 8),
            Column(children: [
              if (unread > 0)
                CircleAvatar(radius: 12, backgroundColor: _cyan, child: Text(unread.toString(), style: const TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.w900))),
              const SizedBox(height: 6),
              const Icon(Icons.chevron_right, color: _muted),
            ]),
          ]),
        ),
      ),
    );
  }
}

class ConversationDetailPage extends StatefulWidget {
  const ConversationDetailPage({super.key, required this.repository, required this.conversation, required this.onChanged});

  final AdminRepository repository;
  final Map<String, dynamic> conversation;
  final Future<void> Function() onChanged;

  @override
  State<ConversationDetailPage> createState() => _ConversationDetailPageState();
}

class _ConversationDetailPageState extends State<ConversationDetailPage> {
  final _reply = TextEditingController();
  List<Map<String, dynamic>> _messages = [];
  bool _loading = true;
  bool _sending = false;
  String? _error;
  String get _id => _string(widget.conversation['id'], '');

  @override
  void initState() {
    super.initState();
    unawaited(_loadMessages());
  }

  @override
  void dispose() {
    _reply.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final messages = await widget.repository.loadConversation(_id);
      if (mounted) setState(() => _messages = messages);
    } catch (error) {
      if (mounted) setState(() => _error = _cleanError(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _send() async {
    if (_sending || _reply.text.trim().isEmpty) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await widget.repository.sendReply(_id, _reply.text);
      _reply.clear();
      await _loadMessages();
      await widget.onChanged();
    } catch (error) {
      if (mounted) setState(() => _error = _cleanError(error));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _changeStatus(String status) async {
    try {
      await widget.repository.changeConversationStatus(_id, status);
      await widget.onChanged();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Conversation status updated.')));
      }
    } catch (error) {
      if (mounted) setState(() => _error = _cleanError(error));
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = _string(widget.conversation['clientName'], _string(widget.conversation['clientEmail'], 'Website visitor'));
    final status = _string(widget.conversation['status'], 'open');
    return Scaffold(
      appBar: AppBar(
        title: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Conversation status',
            onSelected: _changeStatus,
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'open', child: Text('Open')),
              PopupMenuItem(value: 'waiting_owner', child: Text('Waiting owner')),
              PopupMenuItem(value: 'waiting_client', child: Text('Waiting client')),
              PopupMenuItem(value: 'ai_handled', child: Text('AI handled')),
              PopupMenuItem(value: 'escalated', child: Text('Escalated')),
              PopupMenuItem(value: 'closed', child: Text('Closed')),
            ],
            child: Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Center(child: _StatusPill(status: status))),
          ),
        ],
      ),
      body: Column(children: [
        if (_error != null) Padding(padding: const EdgeInsets.all(12), child: _MessageBanner(text: _error!, isError: true)),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _messages.isEmpty
                  ? const _EmptyState(icon: Icons.chat_bubble_outline, title: 'No messages yet', subtitle: 'This conversation does not have messages.')
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
                        final message = _messages[index];
                        final sender = _string(message['sender_type'], '');
                        final mine = sender == 'owner';
                        final ai = sender == 'ai';
                        return Align(
                          alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                          child: ConstrainedBox(
                            constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * .78),
                            child: Card(
                              color: mine ? const Color(0xFF20372F) : ai ? const Color(0xFF102B36) : _surface,
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(mine ? 'YOU' : ai ? 'APEX AI' : sender.toUpperCase(), style: const TextStyle(color: _cyan, fontSize: 9, letterSpacing: 1.2, fontWeight: FontWeight.w800)),
                                  const SizedBox(height: 6),
                                  Text(_string(message['body'], ''), style: const TextStyle(height: 1.45)),
                                  const SizedBox(height: 6),
                                  Text(_dateTime(message['created_at']), style: const TextStyle(color: _muted, fontSize: 9)),
                                ]),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Expanded(
                child: TextField(
                  controller: _reply,
                  minLines: 1,
                  maxLines: 5,
                  maxLength: 8000,
                  decoration: const InputDecoration(hintText: 'Write a client reply…', counterText: ''),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: _sending ? null : _send,
                icon: _sending
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.send_rounded),
                style: IconButton.styleFrom(backgroundColor: _gold, foregroundColor: Colors.black),
              ),
            ]),
          ),
        ),
      ]),
    );
  }
}

class PaymentsPage extends StatelessWidget {
  const PaymentsPage({super.key, required this.repository, required this.invoices, required this.inquiries, required this.onCreated});

  final AdminRepository repository;
  final List<Map<String, dynamic>> invoices;
  final List<Map<String, dynamic>> inquiries;
  final Future<void> Function() onCreated;

  Future<void> _createInvoice(BuildContext context) async {
    final amount = TextEditingController();
    final description = TextEditingController();
    String? inquiryId;
    bool busy = false;
    String? error;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Create secure invoice'),
          content: SizedBox(
            width: 440,
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                TextField(
                  controller: amount,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Amount (EGP)'),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: inquiryId ?? '',
                  decoration: const InputDecoration(labelText: 'Link to client inquiry'),
                  items: [
                    const DropdownMenuItem(value: '', child: Text('No linked inquiry')),
                    ...inquiries.map((item) => DropdownMenuItem(
                      value: _string(item['id'], ''),
                      child: Text(_string(item['client_name'], 'Client'), overflow: TextOverflow.ellipsis),
                    )),
                  ],
                  onChanged: (value) => setDialogState(() => inquiryId = value == null || value.isEmpty ? null : value),
                ),
                const SizedBox(height: 12),
                TextField(controller: description, maxLength: 119, decoration: const InputDecoration(labelText: 'Invoice description')),
                if (error != null) ...[
                  const SizedBox(height: 8),
                  _MessageBanner(text: error!, isError: true),
                ],
              ]),
            ),
          ),
          actions: [
            TextButton(onPressed: busy ? null : () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            FilledButton(
              onPressed: busy ? null : () async {
                final parsed = double.tryParse(amount.text.trim());
                if (parsed == null || parsed < 1 || parsed > 1000000 ||
                    (parsed * 100 - (parsed * 100).round()).abs() > .001) {
                  setDialogState(() => error = 'Enter an amount from EGP 1 to 1,000,000 with up to 2 decimals.');
                  return;
                }
                if (description.text.trim().length < 3) {
                  setDialogState(() => error = 'Enter an invoice description.');
                  return;
                }
                setDialogState(() {
                  busy = true;
                  error = null;
                });
                try {
                  final result = await repository.createInvoice(amountEgp: parsed, description: description.text, inquiryId: inquiryId);
                  if (!dialogContext.mounted) return;
                  Navigator.pop(dialogContext);
                  final checkoutUrl = _string(result['checkoutUrl'], '');
                  await showDialog<void>(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('Invoice created'),
                      content: SelectableText(checkoutUrl),
                      actions: [
                        TextButton(
                          onPressed: () async {
                            await Clipboard.setData(ClipboardData(text: checkoutUrl));
                            if (context.mounted) Navigator.pop(context);
                          },
                          child: const Text('Copy link'),
                        ),
                        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
                      ],
                    ),
                  );
                  await onCreated();
                } catch (failure) {
                  if (dialogContext.mounted) setDialogState(() => error = _cleanError(failure));
                } finally {
                  if (dialogContext.mounted) setDialogState(() => busy = false);
                }
              },
              child: busy
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Create invoice'),
            ),
          ],
        ),
      ),
    );
    amount.dispose();
    description.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final totalMinor = invoices.fold<int>(0, (sum, item) => sum + _integer(item['amount_minor']));
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(18),
      children: [
        _SectionHeading(
          eyebrow: 'KASHIER CHECKOUT',
          title: 'Payments & invoices',
          subtitle: 'Create a fixed EGP payment link. Payment confirmation stays on the server.',
          trailing: FilledButton.icon(onPressed: () => _createInvoice(context), icon: const Icon(Icons.add), label: const Text('New invoice')),
        ),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(17),
            child: Row(children: [
              const Icon(Icons.account_balance_wallet_outlined, color: _gold),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Invoice total', style: TextStyle(color: _muted)),
                const SizedBox(height: 4),
                Text(_egp(totalMinor), style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
              ])),
              Text('${invoices.length} records', style: const TextStyle(color: _muted, fontSize: 11)),
            ]),
          ),
        ),
        const SizedBox(height: 12),
        if (invoices.isEmpty)
          const _EmptyState(icon: Icons.receipt_long_outlined, title: 'No invoices yet', subtitle: 'Create an invoice after agreeing the scope and price.'),
        ...invoices.map((item) => Card(
          margin: const EdgeInsets.only(bottom: 10),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(_string(item['description'], 'APEX service invoice'), style: const TextStyle(fontWeight: FontWeight.w800))),
                _StatusPill(status: _string(item['status'], 'pending')),
              ]),
              const SizedBox(height: 10),
              Text(_egp(_integer(item['amount_minor'])), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22, color: _gold)),
              const SizedBox(height: 4),
              Text('${_string(item['provider'], 'payment').toUpperCase()} · ${_dateTime(item['created_at'])}', style: const TextStyle(color: _muted, fontSize: 10)),
              if (_string(item['provider_reference'], '').isNotEmpty)
                Text('Reference: ${item['provider_reference']}', style: const TextStyle(color: _muted, fontSize: 10)),
            ]),
          ),
        )),
      ],
    );
  }
}

class ActivityPage extends StatelessWidget {
  const ActivityPage({super.key, required this.events});
  final List<Map<String, dynamic>> events;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(18),
      children: [
        const _SectionHeading(eyebrow: 'WEBSITE TELEMETRY', title: 'Site activity', subtitle: 'Recent events captured by your website.'),
        if (events.isEmpty)
          const _EmptyState(icon: Icons.timeline_outlined, title: 'No activity yet', subtitle: 'Website events will appear when visitors use the site.'),
        ...events.map((item) => Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: const CircleAvatar(backgroundColor: Color(0x223CCCE7), child: Icon(Icons.bolt, color: _cyan)),
            title: Text(_string(item['event_name'], 'site_event'), style: const TextStyle(fontWeight: FontWeight.w700)),
            subtitle: Text([
              _string(item['path'], ''),
              _string(item['project_id'], ''),
              _string(item['locale'], ''),
            ].where((part) => part.isNotEmpty).join(' · '), style: const TextStyle(color: _muted, fontSize: 11)),
            trailing: Text(_dateTime(item['created_at']), textAlign: TextAlign.end, style: const TextStyle(color: _muted, fontSize: 9)),
          ),
        )),
      ],
    );
  }
}

class SecurityPage extends StatelessWidget {
  const SecurityPage({super.key, required this.securityEvents, required this.auditLogs});
  final List<Map<String, dynamic>> securityEvents;
  final List<Map<String, dynamic>> auditLogs;

  @override
  Widget build(BuildContext context) => DefaultTabController(
        length: 2,
        child: Column(children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(18, 12, 18, 0),
            child: _SectionHeading(
              eyebrow: 'SECURITY & ACCOUNTABILITY',
              title: 'Security center',
              subtitle: 'Owner access events and server-recorded administrative actions.',
            ),
          ),
          const TabBar(tabs: [Tab(text: 'Security events'), Tab(text: 'Audit trail')]),
          Expanded(child: TabBarView(children: [
            _LogList(rows: securityEvents, isSecurity: true),
            _LogList(rows: auditLogs, isSecurity: false),
          ])),
        ]),
      );
}

class _LogList extends StatelessWidget {
  const _LogList({required this.rows, required this.isSecurity});
  final List<Map<String, dynamic>> rows;
  final bool isSecurity;

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) {
      return _EmptyState(
        icon: isSecurity ? Icons.shield_outlined : Icons.history,
        title: 'Nothing recorded yet',
        subtitle: 'New server events will be listed here.',
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: rows.length,
      itemBuilder: (context, index) {
        final row = rows[index];
        final title = isSecurity ? _string(row['event_type'], 'security_event') : _string(row['action'], 'admin_action');
        final severity = _string(row['severity'], 'info');
        final detail = isSecurity ? _string(row['endpoint'], '') : _string(row['target_type'], '');
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: Icon(
              isSecurity ? Icons.shield_outlined : Icons.receipt_long_outlined,
              color: severity == 'critical' || severity == 'high' ? const Color(0xFFFF8B80) : _gold,
            ),
            title: Text(_prettyStatus(title), style: const TextStyle(fontWeight: FontWeight.w700)),
            subtitle: Text('$detail · ${_dateTime(row['created_at'])}', style: const TextStyle(color: _muted, fontSize: 10)),
            trailing: isSecurity ? _StatusPill(status: severity) : null,
          ),
        );
      },
    );
  }
}

class ControlsPage extends StatefulWidget {
  const ControlsPage({super.key, required this.controls, required this.onSetLockdown, required this.onRefresh});
  final Map<String, dynamic> controls;
  final Future<void> Function(bool enabled, String? reason) onSetLockdown;
  final Future<void> Function() onRefresh;

  @override
  State<ControlsPage> createState() => _ControlsPageState();
}

class _ControlsPageState extends State<ControlsPage> {
  bool _busy = false;

  Future<void> _toggleLockdown(bool enabled) async {
    String? reason;
    if (enabled) {
      reason = await showDialog<String>(
        context: context,
        builder: (context) {
          final controller = TextEditingController();
          return AlertDialog(
            title: const Text('Enable emergency lockdown?'),
            content: TextField(
              controller: controller,
              maxLength: 240,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'Reason (required)', hintText: 'Explain why sensitive actions should be paused.'),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
              FilledButton(
                onPressed: () {
                  if (controller.text.trim().length < 5) return;
                  Navigator.pop(context, controller.text.trim());
                },
                child: const Text('Continue'),
              ),
            ],
          );
        },
      );
      if (reason == null) return;
    }
    setState(() => _busy = true);
    try {
      await widget.onSetLockdown(enabled, reason);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locked = widget.controls['emergency_lockdown'] == true;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(18),
      children: [
        const _SectionHeading(
          eyebrow: 'SERVER OPERATIONS',
          title: 'Control center',
          subtitle: 'Critical actions are validated by database functions and written to the audit log.',
        ),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(locked ? Icons.lock : Icons.lock_open, color: locked ? const Color(0xFFFF8B80) : const Color(0xFF8FE0B4)),
                const SizedBox(width: 10),
                const Expanded(child: Text('Emergency lockdown', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17))),
                _StatusPill(status: locked ? 'locked' : 'active'),
              ]),
              const SizedBox(height: 10),
              const Text(
                'Pause supported sensitive actions during a security incident. Payment webhook reconciliation remains available.',
                style: TextStyle(color: _muted, height: 1.5, fontSize: 12),
              ),
              if (_string(widget.controls['lockdown_reason'], '').isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text('Current reason: ${widget.controls['lockdown_reason']}', style: const TextStyle(color: _gold, fontSize: 12)),
                ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: locked ? const Color(0xFF285A45) : const Color(0xFF7C2D2D)),
                  onPressed: _busy ? null : () => _toggleLockdown(!locked),
                  icon: _busy
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : Icon(locked ? Icons.lock_open : Icons.lock),
                  label: Text(_busy ? 'Applying…' : locked ? 'Disable lockdown' : 'Enable emergency lockdown'),
                ),
              ),
            ]),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: ListTile(
            leading: const Icon(Icons.sync, color: _cyan),
            title: const Text('Refresh server state'),
            subtitle: const Text('Reload inquiries, inbox, payments, activity and controls.', style: TextStyle(color: _muted, fontSize: 11)),
            trailing: const Icon(Icons.chevron_right),
            onTap: widget.onRefresh,
          ),
        ),
        const SizedBox(height: 12),
        const _MessageBanner(
          text: 'This app contains no service-role key. Owner privileges are checked by Supabase for every protected operation.',
          isError: false,
        ),
      ],
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({required this.eyebrow, required this.title, this.subtitle, this.trailing});
  final String eyebrow;
  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(eyebrow, style: const TextStyle(color: _cyan, fontSize: 9, letterSpacing: 2, fontWeight: FontWeight.w800)),
              const SizedBox(height: 5),
              Text(title, style: const TextStyle(fontSize: 25, fontWeight: FontWeight.w900)),
              if (subtitle != null) ...[
                const SizedBox(height: 5),
                Text(subtitle!, style: const TextStyle(color: _muted, fontSize: 12, height: 1.45)),
              ],
            ]),
          ),
          if (trailing != null) ...[const SizedBox(width: 8), trailing!],
        ]),
      );
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.label, required this.value, required this.icon, required this.accent});
  final String label;
  final String value;
  final IconData icon;
  final Color accent;

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(13),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Icon(icon, color: accent, size: 21),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 24)),
            Text(label, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: _muted, fontSize: 10)),
          ]),
        ),
      );
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final normalized = status.toLowerCase();
    final color = normalized == 'paid' || normalized == 'active' || normalized == 'completed'
        ? const Color(0xFF8FE0B4)
        : normalized == 'critical' || normalized == 'high' || normalized == 'failed' || normalized == 'locked' || normalized == 'cancelled'
            ? const Color(0xFFFF8B80)
            : _gold;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: color.withValues(alpha: .35)),
      ),
      child: Text(_prettyStatus(status), style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w800)),
    );
  }
}

class _MessageBanner extends StatelessWidget {
  const _MessageBanner({required this.text, required this.isError});
  final String text;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final color = isError ? const Color(0xFFFF8B80) : _cyan;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .08),
        border: Border.all(color: color.withValues(alpha: .3)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 11, height: 1.4)),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.icon, required this.title, required this.subtitle});
  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 12),
        child: Column(children: [
          Icon(icon, size: 38, color: _muted),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 5),
          Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: _muted, fontSize: 11, height: 1.5)),
        ]),
      );
}

class _LoadingScreen extends StatelessWidget {
  const _LoadingScreen({required this.title, required this.subtitle});
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const CircularProgressIndicator(color: _gold),
              const SizedBox(height: 20),
              Text(title, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
              const SizedBox(height: 7),
              Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: _muted, fontSize: 12)),
            ]),
          ),
        ),
      );
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(26),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.cloud_off_outlined, size: 42, color: _gold),
            const SizedBox(height: 12),
            const Text('Workspace unavailable', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 19)),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: _muted, fontSize: 12)),
            const SizedBox(height: 18),
            FilledButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Try again')),
          ]),
        ),
      );
}

List<Map<String, dynamic>> _asRows(dynamic value) {
  if (value is! List) return [];
  return value.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList();
}

Map<String, dynamic> _asMap(dynamic value) {
  if (value is Map) return Map<String, dynamic>.from(value);
  return {};
}

String _string(dynamic value, String fallback) {
  if (value == null) return fallback;
  final result = value.toString().trim();
  return result.isEmpty ? fallback : result;
}

int _integer(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

String _cleanError(Object error) {
  final value = error.toString().replaceFirst('Exception: ', '');
  return value.length > 420 ? '${value.substring(0, 420)}…' : value;
}

String _prettyStatus(String value) {
  return value.replaceAll('_', ' ').split(' ').map((part) {
    if (part.isEmpty) return part;
    return part[0].toUpperCase() + part.substring(1);
  }).join(' ');
}

String _dateTime(dynamic value) {
  if (value == null) return '—';
  final date = DateTime.tryParse(value.toString())?.toLocal();
  if (date == null) return '—';
  String two(int number) => number.toString().padLeft(2, '0');
  return '${date.year}-${two(date.month)}-${two(date.day)} ${two(date.hour)}:${two(date.minute)}';
}

String _egp(int minorUnits) => 'EGP ${(minorUnits / 100).toStringAsFixed(2)}';

bool _validEmail(String value) => RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value);