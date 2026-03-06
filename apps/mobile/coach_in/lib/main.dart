import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_fonts/google_fonts.dart';

import './screens/start_page.dart';
import './screens/explore_page.dart';

void main() {
  runApp(const CoachIn());
}

class CoachIn extends StatelessWidget {
  const CoachIn({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Coach\'In',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        textTheme: TextTheme(
          titleLarge: GoogleFonts.montserrat(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: const Color(0xffffd398)
          ),
          titleMedium: GoogleFonts.montserrat(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: const Color(0xffffd398)
          ),
          bodySmall: GoogleFonts.montserrat(
            fontSize: 12,
            fontWeight: FontWeight.w300,
            color: const Color(0xffd1d5dc)
          ),
          labelSmall: GoogleFonts.montserrat(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: const Color(0xffffd398)
          ),
        ),
        colorScheme: ColorScheme.dark(
          primary: const Color(0xff1c232d),
          primaryContainer: const Color(0xff1c232d),
          secondary: const Color(0xff0c336f),
          secondaryContainer: const Color(0xff0c336f),
        ),
      ),
      home: const SplashScreen(),
    );
  }
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  @override
  void initState() {
    super.initState();
    _checkLoginStatus();
  }

  Future<void> _checkLoginStatus() async {
    await Future.delayed(const Duration(milliseconds: 800));

    final accessToken = await _storage.read(key: 'accessToken');
    final rememberMe = await _storage.read(key: 'rememberMe');

    if (!mounted) return;

    if (accessToken != null && rememberMe == 'true') {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const ExplorePage()),
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const StartPage()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Coach\'In',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            const CircularProgressIndicator(color: Color(0xffd1d5dc)),
          ],
        ),
      ),
    );
  }
}
