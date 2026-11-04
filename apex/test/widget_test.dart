import 'package:apex_studio/main.dart';
import 'package:apex_studio/flow/flow_workspace.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('APEX STUDIO main application renders', (tester) async {
    await tester.pumpWidget(const ApexStudioApp());

    expect(find.text('APEX'), findsOneWidget);
    expect(find.text('STUDIO'), findsOneWidget);
    expect(find.text('INDEPENDENT DIGITAL STUDIO · CAIRO / REMOTE'), findsOneWidget);
    expect(find.text('START A PROJECT'), findsWidgets);
    expect(find.text('APEX FLOW'), findsWidgets);
  });

  testWidgets('opens APEX FLOW from the main application', (tester) async {
    await tester.pumpWidget(const ApexStudioApp());
    await tester.tap(find.byTooltip('Open APEX FLOW'));
    await tester.pumpAndSettle();

    expect(find.text('Automation Studio'), findsOneWidget);
    expect(find.text('Visual'), findsOneWidget);
    expect(find.text('Simple'), findsOneWidget);
    expect(find.text('Hybrid'), findsOneWidget);
  });
  testWidgets('FLOW workspace renders without overflow on a phone viewport', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: FlowWorkspace()));
    await tester.pumpAndSettle();

    final exception = tester.takeException();
    final flexDiagnostics = find.byType(Row).evaluate().map((element) {
      final renderObject = element.renderObject;
      if (renderObject is! RenderFlex) return '';
      final childSizes = <String>[];
      RenderBox? child = renderObject.firstChild;
      while (child != null) {
        childSizes.add('${child.runtimeType}=${child.size}');
        child = (child.parentData! as FlexParentData).nextSibling;
      }
      final ancestors = <String>[];
      element.visitAncestorElements((ancestor) {
        ancestors.add(ancestor.widget.runtimeType.toString());
        return true;
      });
      return 'Row size=${renderObject.size}, constraints=${renderObject.constraints}, children=${childSizes.join(', ')}, ancestors=${ancestors.join(' > ')}';
    }).where((line) => line.isNotEmpty).join('\\n');
    expect(
      exception,
      isNull,
      reason: '${exception is FlutterError ? exception.toStringDeep() : exception}\\n$flexDiagnostics',
    );
  });
}
