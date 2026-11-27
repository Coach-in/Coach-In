import 'package:flutter/material.dart';
import '../config/app_colors.dart';

/// Bottom bar of the main shell. Stateless: the shell owns the selected tab.
class AppBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const AppBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  static const items = <({IconData icon, String label})>[
    (icon: Icons.explore, label: 'Explore'),
    (icon: Icons.people, label: 'Connections'),
    (icon: Icons.chat, label: 'Messages'),
    (icon: Icons.fitness_center, label: 'Programmes'),
    (icon: Icons.person, label: 'Profile'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 60,
      decoration: const BoxDecoration(color: AppColors.accent),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          for (var i = 0; i < items.length; i++)
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => onTap(i),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    items[i].icon,
                    color: i == currentIndex ? Colors.black : Colors.black54,
                  ),
                  Text(
                    items[i].label,
                    style: TextStyle(
                      color: i == currentIndex ? Colors.black : Colors.black54,
                      fontWeight: FontWeight.w600,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
