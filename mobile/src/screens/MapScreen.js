import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Platform,
  Linking,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import LayerChips from '../components/LayerChips';
import { SPOTS_FALLBACK, POIS } from '../data/spotsFallback';
import { fetchSpots, submitRoleRequest } from '../lib/supabase';
import { buildMapHtml } from '../lib/leafletMapHtml';

/* ADMIN_EMAIL removido — notifica via Edge Function */

export default function MapScreen() {
  const webRef = useRef(null);
  const [spots, setSpots] = useState(SPOTS_FALLBACK);
  const [layers, setLayers] = useState({ spots: true, hospedagem: true, gastronomia: true });
  const [pickMode, setPickMode] = useState(false);
  const [picked, setPicked] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('role');
  const [whenText, setWhenText] = useState('');
  const [notes, setNotes] = useState('');
  const [contact, setContact] = useState('');
  const [selected, setSelected] = useState(null);
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    (async () => {
      const remote = await fetchSpots();
      if (remote?.length) setSpots(remote);
    })();
  }, []);

  const html = useMemo(
    () =>
      buildMapHtml({
        spots,
        pois: POIS,
        center: [-11.0152, -37.2052],
        zoom: 16,
      }),
    [spots]
  );

  const inject = useCallback((js) => {
    try {
      webRef.current?.injectJavaScript(js + '\ntrue;');
    } catch (_) {}
  }, []);

  const setPickOnMap = useCallback(
    (on) => {
      setPickMode(!!on);
      inject(`window.CricriMap && window.CricriMap.setPickMode(${on ? 'true' : 'false'});`);
    },
    [inject]
  );

  const toggleLayer = useCallback(
    (id) => {
      setLayers((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        inject(`window.CricriMap && window.CricriMap.setLayers(${JSON.stringify(next)});`);
        return next;
      });
    },
    [inject]
  );

  const onMessage = useCallback((event) => {
    let data;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch (_) {
      return;
    }
    if (data.type === 'ready') {
      setMapReady(true);
      return;
    }
    if (data.type === 'pick' && data.lat != null && data.lng != null) {
      setPicked({ latitude: data.lat, longitude: data.lng });
      setPickMode(false);
      setSelected(null);
      setStatusMsg('');
      setSheetOpen(true);
      return;
    }
    if (data.type === 'spot') {
      setSelected(data);
    }
  }, []);

  const startPick = () => {
    setPicked(null);
    setSheetOpen(false);
    setSelected(null);
    setStatusMsg('');
    setPickOnMap(true);
  };

  const cancelPick = () => setPickOnMap(false);

  const centerUser = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setStatusMsg('Permissão de localização negada.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      inject(`window.CricriMap && window.CricriMap.centerOn(${lat}, ${lng}, 17);`);
    } catch (_) {
      setStatusMsg('Não foi possível obter o GPS.');
    }
  };

  const sendRequest = async () => {
    if (!title.trim()) {
      setStatusMsg('Dê um nome pro rolê.');
      return;
    }
    if (!picked) {
      setStatusMsg('Escolha o ponto no mapa.');
      return;
    }
    setSending(true);
    setStatusMsg('Enviando…');
    const payload = {
      title: title.trim(),
      kind,
      when_text: whenText.trim() || null,
      notes: notes.trim() || null,
      contact: contact.trim() || null,
      lat: picked.latitude,
      lng: picked.longitude,
      status: 'pending',
    };
    let saved = false;
    try {
      await submitRoleRequest(payload);
      saved = true;
    } catch (e) {
      console.warn('[role]', e);
    }
    const body = encodeURIComponent(
      [
        `Solicitação CRICRI · ${kind === 'after' ? 'After' : 'Rolê'}`,
        `Título: ${payload.title}`,
        `Quando: ${payload.when_text || '—'}`,
        `Contato: ${payload.contact || '—'}`,
        `Coords: ${payload.lat}, ${payload.lng}`,
        '',
        payload.notes || '',
        saved ? '(salvo no Supabase)' : '',
      ].join('\n')
    );
    try {
      /* notifica admin via Edge Function role-request */ await (async function(){ try { var base = process.env.EXPO_PUBLIC_SUPABASE_URL || ''; var anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''; if (!base) return; await fetch(String(base).replace(/\/$/, '') + '/functions/v1/role-request', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + anon, apikey: anon }, body: JSON.stringify(payload) }); } catch(e) {} })();
    } catch (_) {}
    setSending(false);
    setStatusMsg('Solicitação enviada!');
    setTimeout(() => {
      setSheetOpen(false);
      setTitle('');
      setNotes('');
      setWhenText('');
      setContact('');
      setStatusMsg('');
    }, 1200);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.top}>
        <Text style={styles.logo}>
          CRI<Text style={styles.logoAccent}>CRI</Text>
        </Text>
        <Text style={styles.sub}>Mapa livre · OSM · sem Google</Text>
      </View>

      <LayerChips active={layers} onToggle={toggleLayer} />

      <View style={styles.mapWrap}>
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          onMessage={onMessage}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          androidLayerType="hardware"
          onLoadEnd={() => {
            inject('window.CricriMap && window.CricriMap.invalidate();');
          }}
        />
        {!mapReady && (
          <View style={styles.loading}>
            <ActivityIndicator color="#e33d6b" />
            <Text style={styles.loadingText}>Carregando mapa…</Text>
          </View>
        )}
        {pickMode && (
          <View style={styles.pickBanner}>
            <Text style={styles.pickText}>Toque no mapa · ponto do rolê</Text>
            <Pressable onPress={cancelPick} style={styles.pickCancel} hitSlop={12}>
              <Text style={styles.pickCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.btnGhost} onPress={centerUser}>
          <Text style={styles.btnGhostText}>Minha posição</Text>
        </Pressable>
        <Pressable
          style={[styles.btnPrimary, pickMode && styles.btnPrimaryActive]}
          onPress={startPick}
        >
          <Text style={styles.btnPrimaryText}>
            {pickMode ? 'Toque no mapa…' : 'Marcar Rolê/After'}
          </Text>
        </Pressable>
      </View>

      {selected && !pickMode && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selected.name}</Text>
          <Text style={styles.cardMeta}>{selected.status || 'Spot CRICRI'}</Text>
          <Pressable onPress={() => setSelected(null)}>
            <Text style={styles.cardClose}>Fechar</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={sheetOpen} animationType="slide" transparent onRequestClose={() => setSheetOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalBg}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalDismiss} onPress={() => setSheetOpen(false)} />
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
              <Text style={styles.sheetTitle}>Solicitar Rolê/After</Text>
              <Text style={styles.sheetSub}>
                Ponto marcado. Só entra no mapa público depois do admin aceitar.
              </Text>
              <View style={styles.kindRow}>
                <Pressable
                  style={[styles.kindBtn, kind === 'role' && styles.kindOn]}
                  onPress={() => setKind('role')}
                >
                  <Text style={styles.kindText}>Rolê</Text>
                </Pressable>
                <Pressable
                  style={[styles.kindBtn, kind === 'after' && styles.kindOn]}
                  onPress={() => setKind('after')}
                >
                  <Text style={styles.kindText}>After</Text>
                </Pressable>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Nome do rolê"
                placeholderTextColor="#8c8376"
                value={title}
                onChangeText={setTitle}
              />
              <TextInput
                style={styles.input}
                placeholder="Quando (opcional)"
                placeholderTextColor="#8c8376"
                value={whenText}
                onChangeText={setWhenText}
              />
              <TextInput
                style={[styles.input, styles.area]}
                placeholder="Detalhes"
                placeholderTextColor="#8c8376"
                value={notes}
                onChangeText={setNotes}
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Contato"
                placeholderTextColor="#8c8376"
                value={contact}
                onChangeText={setContact}
                autoCapitalize="none"
              />
              {picked && (
                <Text style={styles.coords}>
                  {picked.latitude.toFixed(5)}, {picked.longitude.toFixed(5)}
                </Text>
              )}
              {!!statusMsg && <Text style={styles.status}>{statusMsg}</Text>}
              <View style={styles.sheetActions}>
                <Pressable style={styles.btnGhost} onPress={() => setSheetOpen(false)}>
                  <Text style={styles.btnGhostText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[styles.btnPrimary, sending && { opacity: 0.6 }]}
                  onPress={sendRequest}
                  disabled={sending}
                >
                  <Text style={styles.btnPrimaryText}>
                    {sending ? 'Enviando…' : 'Solicitar'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c0a08' },
  top: { paddingTop: 54, paddingHorizontal: 16, paddingBottom: 4 },
  logo: { color: '#ebe3cf', fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  logoAccent: { color: '#e33d6b' },
  sub: {
    color: '#d49a2c',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  mapWrap: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(230,220,196,0.12)',
    backgroundColor: '#0c0a08',
  },
  webview: { flex: 1, backgroundColor: '#0c0a08' },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12,10,8,0.85)',
  },
  loadingText: { color: '#cfc5b4', marginTop: 8, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10, padding: 12, paddingBottom: 28 },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#e33d6b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryActive: { backgroundColor: '#d49a2c' },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  btnGhost: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(230,220,196,0.22)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnGhostText: { color: '#ebe3cf', fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },
  pickBanner: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(227,61,107,0.96)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickText: { color: '#fff', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  pickCancel: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pickCancelText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 100,
    backgroundColor: '#14110f',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(230,220,196,0.14)',
  },
  cardTitle: { color: '#ebe3cf', fontWeight: '800', fontSize: 16 },
  cardMeta: { color: '#c4b9a6', marginTop: 4, fontSize: 13 },
  cardClose: { color: '#e33d6b', marginTop: 10, fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  sheet: {
    backgroundColor: '#14110f',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    paddingBottom: 32,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: 'rgba(230,220,196,0.14)',
  },
  sheetTitle: {
    color: '#ebe3cf',
    fontWeight: '800',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sheetSub: { color: '#a89f90', marginTop: 6, marginBottom: 12, fontSize: 13, lineHeight: 18 },
  kindRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kindBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(230,220,196,0.2)',
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  kindOn: { borderColor: '#e33d6b', backgroundColor: 'rgba(227,61,107,0.15)' },
  kindText: { color: '#ebe3cf', fontWeight: '700', textTransform: 'uppercase', fontSize: 12 },
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(230,220,196,0.16)',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 10,
    color: '#ebe3cf',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  area: { minHeight: 72, textAlignVertical: 'top' },
  coords: { color: '#8c8376', fontSize: 12, marginBottom: 10 },
  status: { color: '#7ecf9a', fontSize: 13, marginBottom: 8 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
