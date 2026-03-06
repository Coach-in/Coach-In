import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import './login.dart';
import './register.dart';

class StartPage extends StatelessWidget {
  const StartPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            const Spacer(),
            Text(
              "Coach\'In",
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge,
            ),

            const SizedBox(height: 70,),

            Semantics(
              label: 'Log in',
              button: true,
              excludeSemantics: true,
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const RegisterPage(),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Color(0xffefd6a2),
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    side: const BorderSide(width: 1.3, color: Color(0xffedf6a2)),
                  ),
                  child: Text(
                    'Log in',
                    style: GoogleFonts.montserrat(
                      fontSize: 14,
                      color: Colors.black,
                    ),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 20),

            Semantics(
              label: 'Register',
              button: true,
              excludeSemantics: true,
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const LoginPage()),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    side: const BorderSide(width: 1.3, color: Color(0xffedf6a2)),
                  ),
                  child: Text(
                    'Register',
                    style: GoogleFonts.montserrat(
                      fontSize: 14,
                      color: Color(0xffd1d5dc),
                    ),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 20),
            const Spacer(),
          ],
        ),
      ),
    );
  }
}
