import 'package:flutter/material.dart';

import '../widgets/app_bottom_nav.dart';
import './explore_page.dart';
import './profile_page.dart';
import './programmes_page.dart';
import './relationships_page.dart';

/// Root screen after login: one persistent bottom bar over four tabs.
///
/// Switching tabs only changes the visible child of an [IndexedStack], so there
/// is no route transition and each tab keeps its state. Tabs whose content
/// changes because of other users (connections, programmes) are rebuilt, and
/// therefore reloaded, each time they are selected.
class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  static const _reloadOnSelect = {1, 2};

  int _index = 0;
  final List<int> _reloads = List.filled(AppBottomNav.items.length, 0);

  void _select(int i) {
    if (i == _index) return;
    setState(() {
      _index = i;
      if (_reloadOnSelect.contains(i)) _reloads[i]++;
    });
  }

  Widget _tab(int i, Widget page) =>
      KeyedSubtree(key: ValueKey('tab-$i-${_reloads[i]}'), child: page);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: [
          _tab(0, const ExplorePage()),
          _tab(1, const RelationshipsPage()),
          _tab(2, const ProgrammesPage()),
          _tab(3, const ProfilePage()),
        ],
      ),
      bottomNavigationBar: AppBottomNav(currentIndex: _index, onTap: _select),
    );
  }
}
