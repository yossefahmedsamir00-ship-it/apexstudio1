import 'package:flutter_test/flutter_test.dart';

import 'package:apex_studio_admin/main.dart';

void main() {
  testWidgets('configuration screen renders without Supabase settings', (tester) async {
    await tester.pumpWidget(const ApexAdminApp());
    expect(find.text('APEX STUDIO'), findsOneWidget);
  });
}
