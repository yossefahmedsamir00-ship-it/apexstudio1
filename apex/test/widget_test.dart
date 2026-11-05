import 'package:apex_studio/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('APEX STUDIO main application renders', (tester) async {
    await tester.pumpWidget(const ApexStudioApp());

    expect(find.text('APEX'), findsOneWidget);
    expect(find.text('STUDIO'), findsOneWidget);
    expect(find.textContaining('INDEPENDENT DIGITAL STUDIO'), findsOneWidget);
    expect(find.byTooltip('AI Chat'), findsOneWidget);
  });
}
