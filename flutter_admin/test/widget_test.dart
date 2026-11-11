import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:apex_studio_admin/main.dart';

void main() {
  testWidgets('shows clear Supabase configuration guidance', (tester) async {
    await tester.pumpWidget(
      const ApexAdminApp(forceConfigurationMissing: true),
    );

    expect(find.text('APEX STUDIO Admin'), findsOneWidget);
    expect(
      find.textContaining('Supabase configuration is missing.'),
      findsOneWidget,
    );
  });

  testWidgets('uses the APEX electric-blue and cyan owner-app theme', (tester) async {
    await tester.pumpWidget(const ApexAdminApp(forceConfigurationMissing: true));
    final context = tester.element(find.text('APEX STUDIO Admin'));
    final scheme = Theme.of(context).colorScheme;
    expect(scheme.primary, const Color(0xFF1677FF));
    expect(scheme.secondary, const Color(0xFF12D9FF));
  });

  test('only a successful server owner claim opens the owner console', () {
    expect(ownerResponseIsVerified({'configured': true}), isTrue);
    expect(ownerResponseIsVerified({'configured': false}), isFalse);
    expect(ownerResponseIsVerified({'error': 'not allowed'}), isFalse);
    expect(ownerResponseIsVerified(null), isFalse);
  });

  test('unread notification badge totals unread client messages', () {
    expect(
      unreadMessageCount([
        {'unreadCount': 2},
        {'unreadCount': 0},
        {'unreadCount': 3},
      ]),
      5,
    );
    expect(unreadMessageCount(const []), 0);
  });

  testWidgets('lead search filters by client name and project brief', (tester) async {
    await tester.pumpWidget(MaterialApp(
      theme: ThemeData.dark(),
      home: Scaffold(
        body: LeadsPage(
          inquiries: [
            {'id': '1', 'client_name': 'Mona Ali', 'client_email': 'mona@example.com', 'project_type': 'Mobile app', 'brief': 'Flutter booking app', 'status': 'new', 'created_at': '2026-11-01T10:00:00Z'},
            {'id': '2', 'client_name': 'Omar Hassan', 'client_email': 'omar@example.com', 'project_type': 'Website', 'brief': 'Portfolio redesign', 'status': 'contacted', 'created_at': '2026-11-02T10:00:00Z'},
          ],
          onChangeStatus: (_, _) async {},
        ),
      ),
    ));

    expect(find.text('Mona Ali'), findsOneWidget);
    expect(find.text('Omar Hassan'), findsOneWidget);

    await tester.enterText(find.byType(TextField).first, 'Flutter');
    await tester.pumpAndSettle();

    expect(find.text('Mona Ali'), findsOneWidget);
    expect(find.text('Omar Hassan'), findsNothing);

    await tester.tap(find.byTooltip('Clear search'));
    await tester.pumpAndSettle();
    expect(find.text('Mona Ali'), findsOneWidget);
    expect(find.text('Omar Hassan'), findsOneWidget);
  });

  testWidgets('lead status filter shows only matching inquiries', (tester) async {
    await tester.pumpWidget(MaterialApp(
      theme: ThemeData.dark(),
      home: Scaffold(
        body: LeadsPage(
          inquiries: [
            {'id': '1', 'client_name': 'Mona Ali', 'project_type': 'Mobile app', 'brief': 'Flutter app', 'status': 'new', 'created_at': '2026-11-01T10:00:00Z'},
            {'id': '2', 'client_name': 'Omar Hassan', 'project_type': 'Website', 'brief': 'Portfolio', 'status': 'contacted', 'created_at': '2026-11-02T10:00:00Z'},
          ],
          onChangeStatus: (_, _) async {},
        ),
      ),
    ));

    await tester.tap(find.byKey(const ValueKey('lead-filter-contacted')));
    await tester.pumpAndSettle();

    expect(find.text('Omar Hassan'), findsOneWidget);
    expect(find.text('Mona Ali'), findsNothing);
  });


  testWidgets('inbox search and unread filter narrow conversations', (tester) async {
    final client = SupabaseClient(
      'https://example.supabase.co',
      'test-anon-key',
      authOptions: const AuthClientOptions(autoRefreshToken: false),
    );
    addTearDown(client.auth.stopAutoRefresh);
    final repository = AdminRepository(client);
    await tester.pumpWidget(MaterialApp(
      theme: ThemeData.dark(),
      home: Scaffold(
        body: InboxPage(
          repository: repository,
          conversations: [
            {
              'id': '1',
              'clientName': 'Mona Ali',
              'clientEmail': 'mona@example.com',
              'subject': 'Flutter booking app',
              'unreadCount': 2,
              'lastMessage': {'body': 'Need a booking app'},
              'updatedAt': '2026-11-01T10:00:00Z',
            },
            {
              'id': '2',
              'clientName': 'Omar Hassan',
              'clientEmail': 'omar@example.com',
              'subject': 'Portfolio website',
              'unreadCount': 0,
              'lastMessage': {'body': 'Thanks for the update'},
              'updatedAt': '2026-11-02T10:00:00Z',
            },
          ],
          onChanged: () async {},
        ),
      ),
    ));

    expect(find.text('Mona Ali'), findsOneWidget);
    expect(find.text('Omar Hassan'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('inbox-filter-unread')));
    await tester.pumpAndSettle();
    expect(find.text('Mona Ali'), findsOneWidget);
    expect(find.text('Omar Hassan'), findsNothing);

    await tester.tap(find.byKey(const ValueKey('inbox-filter-all')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const ValueKey('inbox-search-field')), 'portfolio');
    await tester.pumpAndSettle();
    expect(find.text('Omar Hassan'), findsOneWidget);
    expect(find.text('Mona Ali'), findsNothing);
  });

}
