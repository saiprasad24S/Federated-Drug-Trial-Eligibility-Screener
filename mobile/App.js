import React, { useMemo, useState } from 'react';
import { NativeModules, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const FALLBACK_URL = 'http://localhost:3000';

function getLanHostFromExpoBundle() {
  const scriptURL = NativeModules?.SourceCode?.scriptURL || '';
  const match = scriptURL.match(/^[a-z]+:\/\/([^/:]+)/i);
  return match?.[1] || '';
}

export default function App() {
  const [loadError, setLoadError] = useState('');
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const webUrlCandidates = useMemo(() => {
    const explicitUrl = (process.env.EXPO_PUBLIC_WEB_APP_URL || '').trim();
    const lanHost = getLanHostFromExpoBundle();
    const autoLanUrl3000 = lanHost ? `http://${lanHost}:3000` : '';
    const autoLanUrl3001 = lanHost ? `http://${lanHost}:3001` : '';
    const autoLanUrl3002 = lanHost ? `http://${lanHost}:3002` : '';

    return [explicitUrl, autoLanUrl3000, autoLanUrl3001, autoLanUrl3002, FALLBACK_URL].filter(Boolean);
  }, []);
  const webUrl = webUrlCandidates[Math.min(currentUrlIndex, webUrlCandidates.length - 1)];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.header}>
        <Text style={styles.title}>Federated Drug Trial Screener</Text>
        <Text style={styles.subtitle}>Expo Go wrapper for your web dashboard</Text>
        <Text style={styles.urlText}>Loading: {webUrl}</Text>
      </View>

      {loadError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Unable to load web app</Text>
          <Text style={styles.errorText}>{loadError}</Text>
          <Text style={styles.errorHint}>
            {currentUrlIndex < webUrlCandidates.length - 1
              ? 'Trying next reachable URL automatically...'
              : 'Set EXPO_PUBLIC_WEB_APP_URL to a reachable LAN/public URL and restart Expo.'}
          </Text>
        </View>
      ) : null}

      <WebView
        source={{ uri: webUrl }}
        style={styles.webview}
        startInLoadingState
        onError={(event) => {
          const description = event?.nativeEvent?.description || 'Unknown network error.';
          setLoadError(description);
          if (currentUrlIndex < webUrlCandidates.length - 1) {
            setCurrentUrlIndex((idx) => idx + 1);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#475569',
  },
  urlText: {
    marginTop: 4,
    fontSize: 11,
    color: '#334155',
  },
  webview: {
    flex: 1,
  },
  errorBox: {
    margin: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
  },
  errorText: {
    marginTop: 4,
    color: '#7f1d1d',
    fontSize: 12,
  },
  errorHint: {
    marginTop: 8,
    color: '#7f1d1d',
    fontSize: 12,
  },
});
