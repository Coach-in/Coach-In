import 'package:flutter/material.dart';

/// Searchable bottom-sheet content listing the exercise catalogue; pops with
/// the chosen exercise map.
class ExercisePicker extends StatefulWidget {
  final List<Map<String, dynamic>> catalogue;

  const ExercisePicker({super.key, required this.catalogue});

  @override
  State<ExercisePicker> createState() => _ExercisePickerState();
}

class _ExercisePickerState extends State<ExercisePicker> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final matches = widget.catalogue
        .where((e) =>
            (e['name'] as String).toLowerCase().contains(_query.toLowerCase()))
        .toList();

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 16,
        right: 16,
        top: 16,
      ),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.6,
        child: Column(
          children: [
            TextField(
              autofocus: true,
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Rechercher un exercice',
              ),
              onChanged: (v) => setState(() => _query = v),
            ),
            Expanded(
              child: matches.isEmpty
                  ? const Center(child: Text('Aucun exercice trouvé.'))
                  : ListView(
                      children: [
                        for (final e in matches)
                          ListTile(
                            title: Text(e['name']),
                            subtitle: e['description'] == null
                                ? null
                                : Text(
                                    e['description'],
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                            onTap: () => Navigator.pop(context, e),
                          ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
