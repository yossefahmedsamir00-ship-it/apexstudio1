import 'package:flutter_test/flutter_test.dart';

import 'package:apex_studio_app/main.dart';

void main() {
  testWidgets('APEX STUDIO app renders', (tester) async {
    await tester.pumpWidget(const ApexStudioApp());
    expect(find.text('APEX STUDIO'), findsOneWidget);
  });
}
