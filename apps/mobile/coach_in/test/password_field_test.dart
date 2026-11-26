import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:coach_in/widgets/password_field.dart';

void main() {
  testWidgets('password is hidden until the eye icon is tapped',
      (tester) async {
    final controller = TextEditingController(text: 'secret');
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: PasswordField(controller: controller)),
    ));

    EditableText field() =>
        tester.widget<EditableText>(find.byType(EditableText));

    expect(field().obscureText, isTrue);

    await tester.tap(find.byIcon(Icons.visibility));
    await tester.pump();
    expect(field().obscureText, isFalse);

    await tester.tap(find.byIcon(Icons.visibility_off));
    await tester.pump();
    expect(field().obscureText, isTrue);
  });
}
