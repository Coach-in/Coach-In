import 'package:flutter/material.dart';

import '../screens/explore_page.dart';
import '../screens/profile_page.dart';
import '../screens/relationships_page.dart';

class AppBottomNav extends StatelessWidget {
  final String currentPage;

  const AppBottomNav({super.key, required this.currentPage});

  Widget _item(
    BuildContext context, {
    required String page,
    required IconData icon,
    required String label,
    required Widget Function() builder,
  }) {
    final color = currentPage == page ? Colors.black : Colors.black54;

    return GestureDetector(
      onTap: () {
        if (currentPage != page) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => builder()),
          );
        }
      },
      child: Row(
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(color: color, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 60,
      decoration: const BoxDecoration(color: Color(0xffffd398)),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _item(
            context,
            page: 'explore',
            icon: Icons.explore,
            label: 'Explore',
            builder: () => const ExplorePage(),
          ),
          _item(
            context,
            page: 'connections',
            icon: Icons.people,
            label: 'Connections',
            builder: () => const RelationshipsPage(),
          ),
          _item(
            context,
            page: 'profile',
            icon: Icons.person,
            label: 'Profile',
            builder: () => const ProfilePage(),
          ),
        ],
      ),
    );
  }
}
