/// Category label used for tags that have no category (the API allows it).
const String uncategorizedLabel = 'Other';

/// Groups tags by their category name, keeping insertion order.
/// Tags without a category fall under [uncategorizedLabel].
Map<String, List<Map<String, dynamic>>> groupTagsByCategory(
  Iterable<Map<String, dynamic>> tags,
) {
  final grouped = <String, List<Map<String, dynamic>>>{};
  for (final tag in tags) {
    final category = tag['category']?['name'] as String? ?? uncategorizedLabel;
    grouped.putIfAbsent(category, () => []).add(tag);
  }
  return grouped;
}

/// Keeps coaches that have a tag named [tagName]; `null` keeps everyone.
List<Map<String, dynamic>> filterCoachesByTag(
  List<Map<String, dynamic>> coaches,
  String? tagName,
) {
  if (tagName == null) return coaches;
  return coaches
      .where((c) => (c['tags'] as List? ?? []).any((t) => t['name'] == tagName))
      .toList();
}
