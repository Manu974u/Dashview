import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  Share,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useAppStore, ClipMetadata} from '../store/useAppStore';
import {loadClips, deleteClip} from '../services/ClipStorageService';
import ClipCard from '../components/ClipCard';
import ClipPlayer from '../components/ClipPlayer';
import {Theme} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {useTranslation} from '../i18n/useTranslation';
import {useTheme} from '../hooks/useTheme';

export default function ClipsScreen(): React.JSX.Element {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const clips = useAppStore(s => s.clips);
  const setClips = useAppStore(s => s.setClips);
  const removeClip = useAppStore(s => s.removeClip);
  const [playingClip, setPlayingClip] = useState<ClipMetadata | null>(null);

  // ── Selection state ───────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());

  const fetchClips = useCallback(async () => {
    const loaded = await loadClips();
    setClips(loaded);
  }, [setClips]);

  // Load on mount
  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

  // Refresh every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      fetchClips();
    }, [fetchClips]),
  );

  // Exit selection mode when clips change (e.g. all deleted)
  useEffect(() => {
    if (clips.length === 0) {
      setSelectionMode(false);
      setSelectedClips(new Set());
    }
  }, [clips.length]);

  // ── Single-clip actions ───────────────────────────────────────────────────

  async function handleDelete(clip: ClipMetadata) {
    await deleteClip(clip);
    removeClip(clip.id);
    setSelectedClips(prev => {
      const next = new Set(prev);
      next.delete(clip.id);
      return next;
    });
  }

  async function handleShare(clip: ClipMetadata) {
    try {
      await Share.share({
        url: `file://${clip.filepath}`,
        message: t('clips.shareMessage', {timestamp: clip.timestamp}),
      });
    } catch {
      // Share cancelled
    }
  }

  // ── Selection actions ─────────────────────────────────────────────────────

  function enterSelectionMode(clip: ClipMetadata) {
    setSelectionMode(true);
    setSelectedClips(new Set([clip.id]));
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedClips(new Set());
  }

  function toggleClipSelection(clipId: string) {
    setSelectedClips(prev => {
      const next = new Set(prev);
      if (next.has(clipId)) {
        next.delete(clipId);
      } else {
        next.add(clipId);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedClips(new Set(clips.map(c => c.id)));
  }

  async function deleteSelected() {
    const count = selectedClips.size;
    if (count === 0) return;
    Alert.alert(
      `Delete ${count} clip${count > 1 ? 's' : ''}?`,
      'This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const toDelete = clips.filter(c => selectedClips.has(c.id));
            for (const clip of toDelete) {
              await deleteClip(clip);
              removeClip(clip.id);
            }
            exitSelectionMode();
          },
        },
      ],
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function renderEmpty() {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIllustration}>📹</Text>
        <Text style={styles.emptyTitle}>{t('clips.emptyTitle')}</Text>
        <Text style={styles.emptyBody}>{t('clips.emptyBody')}</Text>
        <TouchableOpacity
          style={styles.emptyCTA}
          onPress={() => navigation.navigate('Home' as never)}
          activeOpacity={0.85}
          accessibilityLabel="Go to home to record">
          <Text style={styles.emptyCTAText}>{t('clips.emptyAction')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderItem({item}: {item: ClipMetadata}) {
    const isSelected = selectedClips.has(item.id);
    return (
      <ClipCard
        clip={item}
        selectionMode={selectionMode}
        selected={isSelected}
        onPress={() => {
          if (selectionMode) {
            toggleClipSelection(item.id);
          } else {
            setPlayingClip(item);
          }
        }}
        onLongPress={() => enterSelectionMode(item)}
        onDelete={() => handleDelete(item)}
        onShare={() => handleShare(item)}
      />
    );
  }

  const allSelected = clips.length > 0 && selectedClips.size === clips.length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={theme.textPrimary === '#FFFFFF' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      <View style={styles.header}>
        {selectionMode ? (
          <>
            <TouchableOpacity onPress={exitSelectionMode} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>✕ {t('clips.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.selectionCount}>
              {selectedClips.size} selected
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={allSelected ? exitSelectionMode : selectAll}
                style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>
                  {allSelected ? t('clips.none') : t('clips.all')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={deleteSelected}
                style={[styles.headerBtn, selectedClips.size === 0 && styles.headerBtnDisabled]}
                disabled={selectedClips.size === 0}>
                <Text style={[styles.headerBtnText, styles.headerBtnDelete]}>
                  {t('clips.delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>{t('clips.title')}</Text>
            {clips.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{clips.length}/20</Text>
              </View>
            )}
          </>
        )}
      </View>

      <FlatList
        data={clips}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={
          clips.length === 0 ? styles.emptyFlex : styles.grid
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={clips.length > 0 ? styles.columnWrapper : undefined}
      />

      <Modal
        visible={playingClip !== null}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPlayingClip(null)}>
        {playingClip && (
          <ClipPlayer
            uri={playingClip.filepath}
            onClose={() => setPlayingClip(null)}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    title: {
      color: t.textPrimary,
      fontSize: 26,
      fontWeight: '800',
    },
    countBadge: {
      backgroundColor: t.accent,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    countBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    // Selection mode header
    selectionCount: {
      color: t.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    headerActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    headerBtn: {
      paddingVertical: 6,
      paddingHorizontal: spacing.sm,
    },
    headerBtnText: {
      color: t.accent,
      fontSize: 15,
      fontWeight: '600',
    },
    headerBtnDelete: {
      color: t.recordingRed,
    },
    headerBtnDisabled: {
      opacity: 0.4,
    },
    // Grid
    grid: {
      padding: spacing.sm,
    },
    columnWrapper: {
      paddingHorizontal: spacing.xs,
    },
    emptyFlex: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
    },
    emptyIllustration: {
      fontSize: 64,
      marginBottom: spacing.sm,
    },
    emptyTitle: {
      color: t.textPrimary,
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
    },
    emptyBody: {
      color: t.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 22,
    },
    emptyCTA: {
      marginTop: spacing.md,
      backgroundColor: t.accent,
      borderRadius: 12,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      minHeight: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyCTAText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
  });
}
