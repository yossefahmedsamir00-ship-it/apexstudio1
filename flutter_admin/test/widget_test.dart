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
}
