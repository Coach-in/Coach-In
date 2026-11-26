/// Default exercises offered in the picker when the shared catalogue does not
/// have them yet. Same names and descriptions as the web app
/// (`apps/web/src/app/programation/exercises.json`), so both clients end up
/// with the same catalogue entries instead of duplicates.
const List<Map<String, String>> defaultExercises = [
  {
    'name': 'Squat barre',
    'description':
        'Descendre sous la parallaxe, genoux alignés sur les orteils. Resserrer le haut du dos avant chaque répétition.',
  },
  {
    'name': 'Soulevé de terre',
    'description':
        'Pieds sous les hanches, barre près des tibias, dos gainé. Tirer en extension de hanches et de genoux.',
  },
  {
    'name': 'Développé couché',
    'description':
        'Pieds bien ancrés, omoplates serrées, barre sur la ligne des mamelons. Descendre de manière contrôlée.',
  },
];
