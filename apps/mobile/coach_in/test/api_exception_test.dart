import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:coach_in/services/api_service.dart';

void main() {
  group('ApiException.fromResponse', () {
    test('uses the API message for 400 and joins validation arrays', () {
      final e = ApiException.fromResponse(
          http.Response('{"message":["age must not be less than 0","bad goals"]}', 400));
      expect(e.statusCode, 400);
      expect(e.message, 'age must not be less than 0, bad goals');
    });

    test('maps 429 to the throttle message regardless of body', () {
      final e = ApiException.fromResponse(http.Response('{"message":"ThrottlerException"}', 429));
      expect(e.message, contains('Trop de tentatives'));
    });

    test('falls back to a status based message on an unparsable body', () {
      expect(ApiException.fromResponse(http.Response('<html>', 404)).message,
          'Élément introuvable.');
      expect(ApiException.fromResponse(http.Response('nope', 409)).message,
          'Cette action a déjà été effectuée.');
    });
  });

  group('errorMessage', () {
    test('returns the ApiException message and the fallback otherwise', () {
      expect(errorMessage(ApiException(403, 'Interdit')), 'Interdit');
      expect(errorMessage(Exception('boom'), fallback: 'fallback'), 'fallback');
      expect(errorMessage(SessionExpiredException()), contains('Session expirée'));
    });
  });
}
