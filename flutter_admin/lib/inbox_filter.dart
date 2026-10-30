enum InboxFilter { all, unread, newCustomers, important }

List<Map<String, dynamic>> filterInbox(
  List<Map<String, dynamic>> conversations, {
  String query = '',
  InboxFilter filter = InboxFilter.all,
}) {
  final needle = query.trim().toLowerCase();
  final filtered = conversations.where((item) {
    final unread = (item['unreadCount'] as num?)?.toInt() ?? int.tryParse('${item['unreadCount']}') ?? 0;
    final status = (item['status'] ?? '').toString().toLowerCase();
    final isNew = status == 'new' || item['isNewCustomer'] == true;
    final isImportant = item['important'] == true || status == 'escalated';
    final matchesFilter = switch (filter) {
      InboxFilter.all => true,
      InboxFilter.unread => unread > 0,
      InboxFilter.newCustomers => isNew,
      InboxFilter.important => isImportant,
    };
    if (!matchesFilter) return false;
    if (needle.isEmpty) return true;
    final last = item['lastMessage'];
    final lastMessage = last is Map ? (last['body'] ?? '').toString() : '';
    final searchable = [
      item['clientName'], item['clientEmail'], item['subject'], lastMessage,
    ].whereType<Object>().join(' ').toLowerCase();
    return searchable.contains(needle);
  }).toList();
  filtered.sort((a, b) {
    final aDate = DateTime.tryParse((a['updatedAt'] ?? '').toString()) ?? DateTime.fromMillisecondsSinceEpoch(0);
    final bDate = DateTime.tryParse((b['updatedAt'] ?? '').toString()) ?? DateTime.fromMillisecondsSinceEpoch(0);
    return bDate.compareTo(aDate);
  });
  return filtered;
}
