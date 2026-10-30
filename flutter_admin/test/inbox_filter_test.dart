import 'package:flutter_test/flutter_test.dart';
import 'package:apex_studio_admin/inbox_filter.dart';

void main() {
  final rows = [
    {
      'id': 'old',
      'clientName': 'Mona',
      'clientEmail': 'mona@example.com',
      'subject': 'Website',
      'unreadCount': 0,
      'status': 'open',
      'updatedAt': '2026-10-28T10:00:00Z',
      'lastMessage': {'body': 'Need a landing page'},
    },
    {
      'id': 'new',
      'clientName': 'Omar',
      'clientEmail': 'omar@example.com',
      'subject': 'Mobile app',
      'unreadCount': 2,
      'status': 'escalated',
      'updatedAt': '2026-10-29T10:00:00Z',
      'lastMessage': {'body': 'Please call me'},
    },
  ];

  test('search matches customer details and message text', () {
    expect(filterInbox(rows, query: 'omar').map((e) => e['id']), ['new']);
    expect(filterInbox(rows, query: 'landing page').map((e) => e['id']), ['old']);
  });

  test('unread and important filters narrow the inbox', () {
    expect(filterInbox(rows, filter: InboxFilter.unread).map((e) => e['id']), ['new']);
    expect(filterInbox(rows, filter: InboxFilter.important).map((e) => e['id']), ['new']);
  });

  test('results are sorted newest first', () {
    expect(filterInbox(rows).map((e) => e['id']), ['new', 'old']);
  });
}
