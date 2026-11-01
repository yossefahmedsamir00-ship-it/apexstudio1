import 'package:apex_studio/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('APEX STUDIO main application renders', (tester) async {
    await tester.pumpWidget(const ApexStudioApp());

    expect(find.text('APEX'), findsOneWidget);
    expect(find.text('STUDIO'), findsOneWidget);
    expect(find.text('INDEPENDENT DIGITAL STUDIO · CAIRO / REMOTE'), findsOneWidget);
    expect(find.text('START A PROJECT'), findsWidgets);
    expect(find.text('APEX FLOW'), findsOneWidget);
  });

  testWidgets('opens APEX FLOW from the main application', (tester) async {
    await tester.pumpWidget(const ApexStudioApp());
    await tester.tap(find.text('APEX FLOW'));
    await tester.pumpAndSettle();

    expect(find.text('Automation Studio'), findsOneWidget);
    expect(find.text('Visual'), findsOneWidget);
    expect(find.text('Simple'), findsOneWidget);
    expect(find.text('Hybrid'), findsOneWidget);
  });
}
