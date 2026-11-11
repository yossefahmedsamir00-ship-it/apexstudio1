import 'package:flutter_test/flutter_test.dart';

import '../lib/main.dart';

void main() {
  testWidgets('renders the workflow canvas without asset loading errors', (tester) async {
    await tester.pumpWidget(const ApexFlowApp());
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
  });

  testWidgets('renders APEX FLOW workspace and builder modes', (tester) async {
    await tester.pumpWidget(const ApexFlowApp());

    expect(find.text('APEX FLOW'), findsNWidgets(2));
    expect(find.text('Automation Studio'), findsOneWidget);
    expect(find.text('Visual'), findsOneWidget);
    expect(find.text('Simple'), findsOneWidget);
    expect(find.text('Hybrid'), findsOneWidget);
    expect(find.text('Test Run'), findsOneWidget);
  });
}
