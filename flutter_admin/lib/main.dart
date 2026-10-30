import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty) {
    await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
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
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFD4AF37), brightness: Brightness.dark),
        useMaterial3: true,
      ),
      home: supabaseUrl.isEmpty || supabaseAnonKey.isEmpty
          ? const ConfigurationScreen()
          : const AuthGate(),
    );
  }
}

class ConfigurationScreen extends StatelessWidget {
  const ConfigurationScreen({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(
    body: Center(child: Padding(
      padding: EdgeInsets.all(28),
      child: Text('APEX STUDIO Admin\n\nBuild configuration is missing Supabase environment values.', textAlign: TextAlign.center),
    )),
  );
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});
  @override
  Widget build(BuildContext context) {
    final session = Supabase.instance.client.auth.currentSession;
    return session == null ? const LoginScreen() : const DashboardScreen();
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool busy = false;
  String? error;

  Future<void> login() async {
    setState(() { busy = true; error = null; });
    try {
      await Supabase.instance.client.auth.signInWithPassword(
        email: email.text.trim(),
        password: password.text,
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const DashboardScreen()));
    } on AuthException catch (e) {
      if (mounted) setState(() => error = e.message);
    } catch (e) {
      if (mounted) setState(() => error = 'Login failed. Please try again.');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(child: Center(child: SingleChildScrollView(padding: const EdgeInsets.all(24), child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 430),
      child: Card(
        color: const Color(0xFF111318),
        child: Padding(padding: const EdgeInsets.all(28), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('APEX STUDIO', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: 2)),
          const SizedBox(height: 6),
          const Text('Owner Admin', style: TextStyle(color: Color(0xFFD4AF37))),
          const SizedBox(height: 28),
          TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined))),
          const SizedBox(height: 14),
          TextField(controller: password, obscureText: true, onSubmitted: (_) => login(), decoration: const InputDecoration(labelText: 'Password', prefixIcon: Icon(Icons.lock_outline))),
          if (error != null) ...[
            const SizedBox(height: 14),
            Text(error!, style: const TextStyle(color: Color(0xFFFF6B6B))),
          ],
          const SizedBox(height: 22),
          FilledButton(onPressed: busy ? null : login, child: Padding(padding: const EdgeInsets.all(12), child: Text(busy ? 'Signing in…' : 'Sign in'))),
          const SizedBox(height: 12),
          const Text('Owner access only. New account creation is intentionally unavailable.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white54, fontSize: 12)),
        ])),
      ),
    )))),
  );
}

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final modules = const [
      ('Projects', Icons.work_outline), ('Clients', Icons.people_outline), ('Requests', Icons.inbox_outlined),
      ('Messages', Icons.chat_bubble_outline), ('Payments', Icons.payments_outlined), ('Files', Icons.folder_outlined),
      ('Notifications', Icons.notifications_none), ('Analytics', Icons.insights_outlined), ('Audit Log', Icons.security_outlined),
      ('Settings', Icons.settings_outlined),
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('APEX STUDIO Admin'), actions: [
        IconButton(onPressed: () async { await Supabase.instance.client.auth.signOut(); if (context.mounted) Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false); }, icon: const Icon(Icons.logout)),
      ]),
      body: ListView(padding: const EdgeInsets.all(18), children: [
        const Text('Control Center', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        const Text('Manage the studio from one secure owner workspace.', style: TextStyle(color: Colors.white60)),
        const SizedBox(height: 20),
        GridView.builder(shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), itemCount: modules.length, gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: 220, mainAxisExtent: 120, crossAxisSpacing: 12, mainAxisSpacing: 12), itemBuilder: (_, i) {
          final item = modules[i];
          return Card(child: InkWell(borderRadius: BorderRadius.circular(12), onTap: () {}, child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(item.$2, color: const Color(0xFFD4AF37)), const Spacer(), Text(item.$1, style: const TextStyle(fontWeight: FontWeight.w700))]))));
        }),
      ]),
    );
  }
}
