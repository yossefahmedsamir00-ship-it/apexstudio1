import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
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

}
