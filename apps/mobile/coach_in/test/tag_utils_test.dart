import 'package:flutter_test/flutter_test.dart';

import 'package:coach_in/utils/tag_utils.dart';

void main() {
  group('groupTagsByCategory', () {
    test('groups by category name and falls back for missing category', () {
      final grouped = groupTagsByCategory([
        {'name': 'Tennis', 'category': {'name': 'Sport'}},
        {'name': 'Golf', 'category': {'name': 'Sport'}},
        {'name': 'Advanced', 'category': null},
        {'name': 'Loose'},
      ]);

      expect(grouped['Sport']!.map((t) => t['name']), ['Tennis', 'Golf']);
      expect(grouped[uncategorizedLabel]!.length, 2);
    });
  });

  group('filterCoachesByTag', () {
    final coaches = <Map<String, dynamic>>[
      {'id': '1', 'tags': [{'name': 'Tennis'}]},
      {'id': '2', 'tags': [{'name': 'Golf'}]},
      {'id': '3'},
    ];

    test('null keeps everyone', () {
      expect(filterCoachesByTag(coaches, null).length, 3);
    });

    test('keeps only coaches with the tag, tolerating missing tags', () {
      expect(filterCoachesByTag(coaches, 'Golf').map((c) => c['id']), ['2']);
    });
  });
}
