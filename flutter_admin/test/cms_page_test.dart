import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:apex_studio_admin/cms_page.dart';

void main() {
  testWidgets('shows CMS workspace in explicit demo mode', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: CmsPage(demoMode: true))));
    expect(find.text('Content studio'), findsOneWidget);
    expect(find.textContaining('Demo mode'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Homepage hero'), 250, scrollable: find.byType(Scrollable).first);
    expect(find.text('Homepage hero'), findsOneWidget);
  });

  testWidgets('opens editor with a slug field', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: CmsPage(demoMode: true))));
    await tester.tap(find.text('New content')); await tester.pumpAndSettle();
    expect(find.text('Create content'), findsOneWidget);
    expect(find.text('URL slug (lowercase-with-dashes)'), findsOneWidget);
    expect(find.text('Save draft'), findsOneWidget);
  });

  testWidgets('saves a draft in explicit demo mode', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: CmsPage(demoMode: true))));
    await tester.tap(find.text('New content')); await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).at(0), 'Launch announcement');
    await tester.enterText(find.byType(TextField).at(1), 'launch-announcement');
    await tester.enterText(find.byType(TextField).at(2), 'A new studio update.');
    await tester.tap(find.text('Save draft')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Launch announcement'), 250, scrollable: find.byType(Scrollable).first);
    expect(find.text('Launch announcement'), findsOneWidget);
  });

  testWidgets('preview is separate from publishing', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: CmsPage(demoMode: true))));
    await tester.scrollUntilVisible(find.byTooltip('Preview Homepage hero'), 250, scrollable: find.byType(Scrollable).first);
    await tester.tap(find.byTooltip('Preview Homepage hero')); await tester.pumpAndSettle();
    expect(find.text('Preview · Homepage hero'), findsOneWidget);
    expect(find.textContaining('publishing is a separate action'), findsOneWidget);
  });
}
