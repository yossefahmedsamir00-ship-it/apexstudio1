import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:apex_studio_admin/cms_page.dart';

void main() {
  testWidgets('shows the CMS workspace in demo mode', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: CmsPage()));

    expect(find.text('Content studio'), findsOneWidget);
    expect(find.textContaining('Demo mode'), findsOneWidget);
    expect(find.text('Homepage hero'), findsOneWidget);
  });

  testWidgets('opens a form to create a content draft', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: CmsPage()));

    await tester.tap(find.text('New content'));
    await tester.pumpAndSettle();

    expect(find.text('Create content'), findsOneWidget);
    expect(find.text('Content title'), findsOneWidget);
    expect(find.text('Save draft'), findsOneWidget);
  });

  testWidgets('opens a preview without publishing', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: CmsPage()));

    await tester.tap(find.byTooltip('Preview Homepage hero'));
    await tester.pumpAndSettle();

    expect(find.text('Preview · Homepage hero'), findsOneWidget);
    expect(find.textContaining('not published'), findsOneWidget);
  });
}
