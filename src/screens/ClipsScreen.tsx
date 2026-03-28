import React, {useState, useEffect, useCallback} from 'react';
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
import {useFocusEffect} from '@react-navigation/native';
import {useAppStore, ClipMetadata} from '../store/useAppStore';
import {loadClips, deleteClip} from '../services/ClipStorageService';
import ClipCard from '../components/ClipCard';
import ClipPlayer from '../components/ClipPlayer';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {useTranslation} from '../i18n/useTranslation';

export default function ClipsScreen(): React.JSX.Element {
  const {t} = useTranslation();
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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        {selectionMode ? (
          <>
            <TouchableOpacity onPress={exitSelectionMode} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>✕ Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.selectionCount}>
              {selectedClips.size} selected
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={allSelected ? exitSelectionMode : selectAll}
                style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>
                  {allSelected ? 'None' : 'All'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={deleteSelected}
                style={[styles.headerBtn, selectedClips.size === 0 && styles.headerBtnDisabled]}
                disabled={selectedClips.size === 0}>
                <Text style={[styles.headerBtnText, styles.headerBtnDelete]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>{t('clips.title')}</Text>
            {clips.length > 0 && (
              <Text style={styles.count}>{clips.length} / 20</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  count: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  // Selection mode header
  selectionCount: {
    color: colors.textPrimary,
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
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  headerBtnDelete: {
    color: '#E53935',
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
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
