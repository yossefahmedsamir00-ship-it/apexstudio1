import 'package:apex_studio/main.dart';
import 'package:flutter/material.dart';
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

  test('project preview links accept only HTTP and HTTPS URLs', () {
    expect(
      const Project('Safe preview', 'Web', 'Demo', previewUrl: 'https://example.com').validPreviewUri,
      Uri.parse('https://example.com'),
    );
    expect(
      const Project('Unsafe preview', 'Web', 'Demo', previewUrl: 'javascript:alert(1)').validPreviewUri,
      isNull,
    );
    expect(
      const Project('Relative preview', 'Web', 'Demo', previewUrl: '/preview').validPreviewUri,
      isNull,
    );
  });

  testWidgets('project card clearly marks missing live previews', (tester) async {
    await tester.pumpWidget(const ApexStudioApp());
    await tester.scrollUntilVisible(
      find.text('APEX AI Studio'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('APEX AI Studio'));
    await tester.pumpAndSettle();

    expect(find.text('APEX AI Studio'), findsOneWidget);
    expect(find.text('PREVIEW COMING SOON'), findsOneWidget);
  });
}
