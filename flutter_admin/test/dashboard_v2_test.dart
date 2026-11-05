import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:apex_studio_admin/dashboard_v2.dart';

void main() {
  testWidgets('glass metric card displays metric and context', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: GlassStatsCard(
      title: 'Client leads', value: '12', note: 'Project requests', icon: Icons.groups, color: Colors.blue,
    ))));
    expect(find.text('Client leads'), findsOneWidget);
    expect(find.text('12'), findsOneWidget);
    expect(find.text('Project requests'), findsOneWidget);
  });
  testWidgets('charts handle empty values', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: Column(children: [
      SizedBox(height: 180, child: ApexMiniBars(labels: ['Jun','Jul'], values: [0,0])),
      ApexDonut(values: [0,0,0]),
    ]))));
    expect(find.byType(ApexMiniBars), findsOneWidget);
    expect(find.byType(ApexDonut), findsOneWidget);
  });
}
