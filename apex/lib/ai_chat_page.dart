import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const _chatGold = Color(0xFFD7A83E);
const _chatBackground = Color(0xFF070707);
const _chatPanel = Color(0xFF111214);
const _chatMuted = Color(0xFF969696);

class ApexAiChatPage extends StatefulWidget {
  const ApexAiChatPage({super.key});

  @override
  State<ApexAiChatPage> createState() => _ApexAiChatPageState();
}

class _ApexAiChatPageState extends State<ApexAiChatPage> {
  final _email = TextEditingController();
  final _composer = TextEditingController();
  final _scroll = ScrollController();
  late final SupabaseClient _client;
  StreamSubscription<AuthState>? _authSubscription;

  User? _user;
  String? _conversationId;
  List<Map<String, dynamic>> _messages = [];
  bool _opening = false;
  bool _loadingConversation = false;
  bool _sending = false;
  bool _emailSent = false;
  String? _error;
  String? _notice;

  String? get _redirectTo => kIsWeb ? Uri.base.origin : null;

  @override
  void initState() {
    super.initState();
    _client = Supabase.instance.client;
    _user = _client.auth.currentUser;
    _authSubscription = _client.auth.onAuthStateChange.listen((state) {
      if (state.event == AuthChangeEvent.signedIn && state.session != null) {
        _user = state.session!.user;
        _emailSent = false;
        _error = null;
        if (mounted) setState(() {});
        _openConversation();
      } else if (state.event == AuthChangeEvent.signedOut) {
        if (!mounted) return;
        setState(() {
          _user = null;
          _conversationId = null;
          _messages = [];
        });
      }
    });
    if (_user != null) _openConversation();
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    _email.dispose();
    _composer.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Map<String, dynamic> _map(dynamic value) =>
      value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};

  List<Map<String, dynamic>> _rows(dynamic value) => value is List
      ? value.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList()
      : <Map<String, dynamic>>[];

  String _messageFor(Object error) {
    final text = error.toString().replaceFirst('Exception: ', '').trim();
    return text.length > 240 ? text.substring(0, 240) : text;
  }

  Future<void> _signInWithEmail() async {
    final email = _email.text.trim();
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) {
      setState(() => _error = 'Enter a valid email address.');
      return;
    }
    setState(() {
      _opening = true;
      _error = null;
      _notice = null;
    });
    try {
      await _client.auth.signInWithOtp(
        email: email,
        emailRedirectTo: _redirectTo,
        shouldCreateUser: true,
      );
      if (!mounted) return;
      setState(() {
        _emailSent = true;
        _notice = 'Check your email and open the secure sign-in link.';
      });
    } catch (error) {
      if (mounted) setState(() => _error = _messageFor(error));
    } finally {
      if (mounted) setState(() => _opening = false);
    }
  }

  Future<void> _signInWithProvider(OAuthProvider provider) async {
    setState(() {
      _opening = true;
      _error = null;
      _notice = null;
    });
    try {
      await _client.auth.signInWithOAuth(provider, redirectTo: _redirectTo);
    } catch (error) {
      if (mounted) setState(() => _error = _messageFor(error));
    } finally {
      if (mounted) setState(() => _opening = false);
    }
  }

  Future<void> _openConversation() async {
    if (_loadingConversation || _conversationId != null || _user == null) return;
    setState(() {
      _loadingConversation = true;
      _error = null;
      _notice = null;
    });
    try {
      final historyResponse = await _client.functions.invoke(
        'apex-client-chat',
        body: {'action': 'client_list'},
      );
      final historyBody = _map(historyResponse.data);
      if (historyResponse.status < 200 ||
          historyResponse.status >= 300 ||
          historyBody['error'] != null) {
        throw Exception(historyBody['error'] ?? 'Could not load your chat history.');
      }
      final previous = _rows(historyBody['conversations']).where(
        (item) => item['status'] != 'closed',
      );
      final previousId = previous.isEmpty ? null : previous.first['id']?.toString();

      final response = await _client.functions.invoke(
        'apex-client-chat',
        body: {
          'action': 'open',
          'subject': 'APEX AI Chat',
          if (previousId != null) 'conversationId': previousId,
        },
      );
      final body = _map(response.data);
      if (response.status < 200 || response.status >= 300 || body['error'] != null) {
        throw Exception(body['error'] ?? 'Could not open the chat.');
      }
      final conversation = _map(body['conversation']);
      if (conversation['id'] is! String) throw Exception('Chat session was not created.');
      if (!mounted) return;
      setState(() {
        _conversationId = conversation['id'] as String;
        _messages = _rows(body['messages']);
        if (body['aiUnavailable'] == true) {
          _notice = 'AI is temporarily unavailable. Your message is saved for the team.';
        }
      });
      _scrollToLatest();
    } catch (error) {
      if (mounted) setState(() => _error = _messageFor(error));
    } finally {
      if (mounted) setState(() => _loadingConversation = false);
    }
  }

  Future<void> _sendMessage() async {
    final body = _composer.text.trim();
    final conversationId = _conversationId;
    if (_sending || body.isEmpty || conversationId == null) return;
    setState(() {
      _sending = true;
      _error = null;
      _notice = null;
    });
    try {
      final key = 'flutter:${DateTime.now().microsecondsSinceEpoch}';
      final response = await _client.functions.invoke(
        'apex-client-chat',
        body: {
          'action': 'send',
          'conversationId': conversationId,
          'body': body,
          'idempotencyKey': key,
          'agent': 'support',
        },
      );
      final data = _map(response.data);
      if (response.status < 200 || response.status >= 300 || data['error'] != null) {
        throw Exception(data['error'] ?? 'Message could not be sent.');
      }
      if (!mounted) return;
      setState(() {
        _messages = [..._messages, ..._rows(data['messages'])];
        _composer.clear();
        if (data['aiUnavailable'] == true) {
          _notice = 'Your message is saved. The AI assistant is temporarily unavailable.';
        }
      });
      _scrollToLatest();
    } catch (error) {
      if (mounted) setState(() => _error = _messageFor(error));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _scrollToLatest() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 240),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final signedIn = _user != null;
    return Scaffold(
      backgroundColor: _chatBackground,
      appBar: AppBar(
        backgroundColor: _chatBackground,
        leading: IconButton(
          tooltip: 'Back to APEX STUDIO',
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const Icon(Icons.arrow_back_rounded),
        ),
        title: Row(
          children: [
            const Icon(Icons.auto_awesome_rounded, color: _chatGold, size: 21),
            const SizedBox(width: 10),
            const Text('APEX AI', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.2)),
            const SizedBox(width: 9),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _chatGold.withValues(alpha: .12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text('CHAT', style: TextStyle(color: _chatGold, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1)),
            ),
          ],
        ),
        actions: [
          if (signedIn)
            IconButton(
              tooltip: 'Sign out',
              onPressed: () => _client.auth.signOut(),
              icon: const Icon(Icons.logout_rounded),
            ),
        ],
      ),
      body: signedIn ? _buildConversation() : _buildSignIn(),
    );
  }

  Widget _buildSignIn() => Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(22),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                color: _chatPanel,
                borderRadius: BorderRadius.circular(26),
                border: Border.all(color: _chatGold.withValues(alpha: .2)),
                boxShadow: [
                  BoxShadow(color: _chatGold.withValues(alpha: .06), blurRadius: 50, spreadRadius: 2),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.auto_awesome_rounded, color: _chatGold, size: 48),
                  const SizedBox(height: 20),
                  const Text('Your ideas, in motion.', textAlign: TextAlign.center, style: TextStyle(fontSize: 29, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 10),
                  const Text(
                    'Sign in to talk with the APEX AI team, explore solutions and keep your conversation history.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: _chatMuted, height: 1.55),
                  ),
                  const SizedBox(height: 28),
                  OutlinedButton.icon(
                    onPressed: _opening ? null : () => _signInWithProvider(OAuthProvider.google),
                    icon: const Icon(Icons.g_mobiledata_rounded, size: 25),
                    label: const Text('Continue with Google'),
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 15)),
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: _opening ? null : () => _signInWithProvider(OAuthProvider.apple),
                    icon: const Icon(Icons.apple_rounded, size: 22),
                    label: const Text('Continue with Apple'),
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 15)),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 18),
                    child: Row(children: [
                      Expanded(child: Divider(color: Color(0xFF303030))),
                      Padding(padding: EdgeInsets.symmetric(horizontal: 12), child: Text('OR USE EMAIL', style: TextStyle(color: _chatMuted, fontSize: 10, letterSpacing: 1.4))),
                      Expanded(child: Divider(color: Color(0xFF303030))),
                    ]),
                  ),
                  TextField(
                    controller: _email,
                    enabled: !_opening,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(
                      labelText: 'Email address',
                      prefixIcon: Icon(Icons.alternate_email_rounded),
                    ),
                    onSubmitted: (_) => _signInWithEmail(),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _opening ? null : _signInWithEmail,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      child: _opening
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : Text(_emailSent ? 'Send link again' : 'Continue with email'),
                    ),
                  ),
                  if (_notice != null) ...[
                    const SizedBox(height: 14),
                    _ChatNotice(text: _notice!, isError: false),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 14),
                    _ChatNotice(text: _error!, isError: true),
                  ],
                  const SizedBox(height: 18),
                  const Text(
                    'Your account is used to protect your conversations. Never share passwords or verification codes in chat.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: _chatMuted, fontSize: 11, height: 1.5),
                  ),
                ],
              ),
            ),
          ),
        ),
      );

  Widget _buildConversation() => Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFF242424)))),
            child: Row(
              children: [
                const Icon(Icons.circle, color: Color(0xFF58C58A), size: 8),
                const SizedBox(width: 8),
                const Text('APEX assistant', style: TextStyle(fontWeight: FontWeight.w700)),
                const Spacer(),
                Text(_user?.email ?? '', style: const TextStyle(color: _chatMuted, fontSize: 11)),
              ],
            ),
          ),
          Expanded(
            child: _loadingConversation && _conversationId == null
                ? const Center(child: CircularProgressIndicator(color: _chatGold))
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.fromLTRB(18, 22, 18, 22),
                    itemCount: _messages.length + (_messages.isEmpty ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (_messages.isEmpty) {
                        return const Padding(
                          padding: EdgeInsets.only(top: 60),
                          child: Column(children: [
                            Icon(Icons.auto_awesome, color: _chatGold, size: 34),
                            SizedBox(height: 14),
                            Text('What are you building?', style: TextStyle(fontSize: 23, fontWeight: FontWeight.w900)),
                            SizedBox(height: 8),
                            Text('Tell us about your idea and let’s explore the next step.', textAlign: TextAlign.center, style: TextStyle(color: _chatMuted)),
                          ]),
                        );
                      }
                      final message = _messages[index];
                      final isClient = message['sender_type'] == 'client';
                      return Align(
                        alignment: isClient ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          constraints: const BoxConstraints(maxWidth: 680),
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: isClient ? const Color(0xFF332817) : _chatPanel,
                            border: Border.all(color: isClient ? _chatGold.withValues(alpha: .3) : const Color(0xFF282828)),
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: Text(
                            message['body']?.toString() ?? '',
                            style: const TextStyle(fontSize: 14, height: 1.55),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          if (_error != null || _notice != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 8),
              child: _ChatNotice(text: _error ?? _notice!, isError: _error != null),
            ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _composer,
                      minLines: 1,
                      maxLines: 5,
                      maxLength: 8000,
                      enabled: !_sending && _conversationId != null,
                      decoration: const InputDecoration(
                        hintText: 'Message APEX AI…',
                        counterText: '',
                        prefixIcon: Icon(Icons.chat_bubble_outline_rounded),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 9),
                  SizedBox(
                    height: 54,
                    width: 54,
                    child: FilledButton(
                      onPressed: _sending || _conversationId == null ? null : _sendMessage,
                      style: FilledButton.styleFrom(padding: EdgeInsets.zero),
                      child: _sending
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.arrow_upward_rounded),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
}

class _ChatNotice extends StatelessWidget {
  const _ChatNotice({required this.text, required this.isError});
  final String text;
  final bool isError;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: (isError ? const Color(0xFFFF543D) : _chatGold).withValues(alpha: .1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: (isError ? const Color(0xFFFF543D) : _chatGold).withValues(alpha: .25)),
        ),
        child: Text(text, style: TextStyle(color: isError ? const Color(0xFFFF9A8C) : _chatGold, fontSize: 12)),
      );
}
