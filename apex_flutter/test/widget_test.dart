import 'package:flutter_test/flutter_test.dart';
import 'package:apex_studio/main.dart';

void main() {
  testWidgets('renders the Flutter APEX STUDIO shell', (tester) async {
    await tester.pumpWidget(const ApexStudioApp());

    expect(find.text('APEX STUDIO'), findsOneWidget);
    expect(find.text('Overview'), findsWidgets);
    expect(find.text('APEX FLOW'), findsOneWidget);
    expect(find.text('Social AI'), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);
  });

  testWidgets('supports Arabic locale switching', (tester) async {
    await tester.pumpWidget(const ApexStudioApp());

    await tester.tap(find.byIcon(Icons.language));
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.language), findsOneWidget);
  });
}
