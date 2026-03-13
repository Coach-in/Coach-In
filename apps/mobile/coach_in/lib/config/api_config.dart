class ApiConfig {
  static const String _defaultIp = '192.168.1.220';
  static const int _port = 3000;

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
