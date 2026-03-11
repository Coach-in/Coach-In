export interface TagSeedEntry {
  category: string;
  tags: string[];
}

export const TAG_SEED: TagSeedEntry[] = [
  {
    category: 'Sport',
    tags: [
      'Football',
      'Basketball',
      'Tennis',
      'Swimming',
      'Running',
      'Cycling',
      'Rugby',
      'Volleyball',
      'Boxing',
      'Martial Arts',
    ],
  },
  {
    category: 'Experience level',
    tags: ['Beginner', 'Casual', 'Intermediate', 'Advanced', 'Professional'],
  },
  {
    category: 'Goal',
    tags: [
      'Lose weight',
      'Build muscle',
      'Improve endurance',
      'Improve flexibility',
      'Recover from injury',
      'Compete',
      'Have fun',
    ],
  },
  {
    category: 'Availability',
    tags: ['Morning', 'Afternoon', 'Evening', 'Weekend', 'Full-time'],
  },
];
