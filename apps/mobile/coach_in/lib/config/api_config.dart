class ApiConfig {
  static const String _defaultIp = '00.00.00.00';
  static const int _port = 0000;

  static const Duration requestTimeout = Duration(seconds: 10);
  static const Duration connectionTimeout = Duration(seconds: 5);

  static String getBaseUrl() {
    return 'http://$_defaultIp:$_port';
  }

  static Map<String, String> get defaultHeaders => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
}
