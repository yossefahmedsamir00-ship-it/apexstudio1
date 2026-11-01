import 'package:apex_studio/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('APEX STUDIO main application renders', (tester) async {
    await tester.pumpWidget(const ApexStudioApp());

    expect(find.text('APEX'), findsOneWidget);
    expect(find.text('STUDIO'), findsOneWidget);
    expect(find.text('DIGITAL STUDIO / TECHNOLOGY'), findsOneWidget);
    expect(find.text('START A PROJECT'), findsOneWidget);
  });
}
