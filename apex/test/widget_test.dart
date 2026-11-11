import 'package:apex_studio/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('APEX STUDIO main application renders', (tester) async {
    await tester.pumpWidget(const ApexStudioApp());

    // The responsive layout intentionally renders the APEX wordmark in
    // more than one place (for example, hero and navigation).
    expect(find.text('APEX').first, findsOneWidget);
    expect(find.text('STUDIO').first, findsOneWidget);
    expect(find.textContaining('INDEPENDENT DIGITAL STUDIO'), findsOneWidget);
    expect(find.byTooltip('AI Chat'), findsOneWidget);
  });
}
