import 'package:apex_studio/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('APEX STUDIO main application renders', (tester) async {
    await tester.pumpWidget(const ApexStudioApp());

    expect(find.text('APEX').first, findsOneWidget);
    expect(find.text('STUDIO').first, findsOneWidget);
    expect(find.textContaining('INDEPENDENT DIGITAL STUDIO'), findsOneWidget);
    expect(find.byTooltip('AI Chat'), findsOneWidget);
  });

  group('Project preview URL validation', () {
    test('accepts secure HTTP and HTTPS URLs', () {
      expect(
        const Project(
          'Safe preview',
          'Web',
          'Demo',
          previewUrl: 'https://example.com',
        ).validPreviewUri,
        Uri.parse('https://example.com'),
      );
      expect(
        const Project(
          'HTTP preview',
          'Web',
          'Demo',
          previewUrl: 'http://example.com',
        ).validPreviewUri,
        Uri.parse('http://example.com'),
      );
    });

    test('rejects unsafe, relative, and missing URLs', () {
      expect(
        const Project(
          'Unsafe preview',
          'Web',
          'Demo',
          previewUrl: 'javascript:alert(1)',
        ).validPreviewUri,
        isNull,
      );
      expect(
        const Project(
          'Relative preview',
          'Web',
          'Demo',
          previewUrl: '/preview',
        ).validPreviewUri,
        isNull,
      );
      expect(
        const Project('No preview', 'Web', 'Demo').validPreviewUri,
        isNull,
      );
    });
  });
}
