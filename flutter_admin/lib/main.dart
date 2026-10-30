import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const supabaseKey = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (supabaseUrl.isNotEmpty && supabaseKey.isNotEmpty) {
    await Supabase.initialize(url: supabaseUrl, publishableKey: supabaseKey);
  }
  runApp(const ApexAdminApp());
}

class ApexAdminApp extends StatelessWidget {
  const ApexAdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'APEX STUDIO Admin',
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF090A0D),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFD6B56A),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFF111319),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    if (supabaseUrl.isEmpty || supabaseKey.isEmpty) return const ConfigScreen();
    final client = Supabase.instance.client;
    return StreamBuilder<AuthState>(
      stream: client.auth.onAuthStateChange,
      builder: (context, snapshot) {
        final session = client.auth.currentSession;
        return session == null ? const LoginScreen() : const DashboardScreen();
      },
    );
  }
}

class ConfigScreen extends StatelessWidget {
  const ConfigScreen({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(28),
            child: Text(
              'APEX STUDIO Admin\n\nSupabase configuration is missing.\nBuild with SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool loading = false;
  String? error;

  Future<void> login() async {
    setState(() { loading = true; error = null; });
    try {
      final auth = Supabase.instance.client.auth;
      final response = await auth.signInWithPassword(
        email: email.text.trim(),
        password: password.text,
      );
      if (response.user == null) throw const AuthException('Login failed.');
      await Supabase.instance.client.functions.invoke(
        'apex-owner-bootstrap',
        body: {'action': 'login'},
      );
    } catch (e) {
      await Supabase.instance.client.auth.signOut();
      setState(() => error = e.toString().replaceFirst('AuthException: ', ''));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 430),
                child: Card(
                  color: const Color(0xFF0F1117),
                  child: Padding(
                    padding: const EdgeInsets.all(28),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text('APEX STUDIO', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: 2)),
                        const SizedBox(height: 6),
                        const Text('Owner Admin', style: TextStyle(color: Color(0xFFD6B56A))),
                        const SizedBox(height: 28),
                        TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email')),
                        const SizedBox(height: 14),
                        TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
                        if (error != null) ...[
                          const SizedBox(height: 14),
                          Text(error!, style: const TextStyle(color: Colors.redAccent)),
                        ],
                        const SizedBox(height: 22),
                        FilledButton(
                          onPressed: loading ? null : login,
                          child: Padding(padding: const EdgeInsets.all(14), child: Text(loading ? 'Signing in…' : 'Sign in as owner')),
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

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});
  static const modules = [
    ('Projects', Icons.work_outline),
    ('Client Requests', Icons.inbox_outlined),
    ('Messages', Icons.chat_bubble_outline),
    ('Orders & Payments', Icons.payments_outlined),
    ('Files & Media', Icons.folder_outlined),
    ('Notifications', Icons.notifications_none),
    ('Analytics', Icons.insights_outlined),
    ('Audit Log', Icons.security_outlined),
    ('Settings', Icons.settings_outlined),
  ];

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('APEX STUDIO'),
          actions: [
            IconButton(
              tooltip: 'Sign out',
              onPressed: () => Supabase.instance.client.auth.signOut(),
              icon: const Icon(Icons.logout),
            ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text('Owner Dashboard', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            const Text('Control the studio from one secure workspace.', style: TextStyle(color: Colors.white60)),
            const SizedBox(height: 24),
            Wrap(
              spacing: 14,
              runSpacing: 14,
              children: modules.map((m) => SizedBox(
                width: 170,
                height: 125,
                child: Card(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () {},
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Icon(m.$2, color: const Color(0xFFD6B56A), size: 28),
                          Text(m.$1, style: const TextStyle(fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                  ),
                ),
              )).toList(),
            ),
          ],
        ),
      );
}
