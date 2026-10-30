import 'package:flutter_test/flutter_test.dart';
import 'package:apex_studio_admin/main.dart';

void main() {
  testWidgets('shows configuration screen without build-time Supabase configuration', (tester) async {
    await tester.pumpWidget(const ApexAdminApp());
    expect(find.textContaining('Supabase configuration is missing.'), findsOneWidget);
  });
}
