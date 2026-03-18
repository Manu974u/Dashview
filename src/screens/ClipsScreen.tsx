import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  Share,
  SafeAreaView,
} from 'react-native';
import {useAppStore, ClipMetadata} from '../store/useAppStore';
import {loadClips, deleteClip} from '../services/ClipStorageService';
import ClipCard from '../components/ClipCard';
import ClipPlayer from '../components/ClipPlayer';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';

export default function ClipsScreen(): React.JSX.Element {
  const clips = useAppStore(s => s.clips);
  const setClips = useAppStore(s => s.setClips);
  const removeClip = useAppStore(s => s.removeClip);
  const [playingClip, setPlayingClip] = useState<ClipMetadata | null>(null);

  const fetchClips = useCallback(async () => {
    const loaded = await loadClips();
    setClips(loaded);
  }, [setClips]);

  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

  async function handleDelete(clip: ClipMetadata) {
    await deleteClip(clip);
    removeClip(clip.id);
  }

  async function handleShare(clip: ClipMetadata) {
    try {
      await Share.share({
        url: `file://${clip.filepath}`,
        message: `DashView clip — ${clip.timestamp}`,
      });
    } catch {
      // Share cancelled
    }
  }

  function renderEmpty() {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📹</Text>
        <Text style={styles.emptyTitle}>No clips yet.</Text>
        <Text style={styles.emptyBody}>
          Say "Dash" or enable speed detection{'\n'}to auto-save clips.
        </Text>
      </View>
    );
  }

  function renderItem({item, index}: {item: ClipMetadata; index: number}) {
    // Two-column grid: even index = left, odd = right
    // We pair items manually via numColumns
    return (
      <ClipCard
        clip={item}
        onPress={() => setPlayingClip(item)}
        onDelete={() => handleDelete(item)}
        onShare={() => handleShare(item)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clips</Text>
        <Text style={styles.count}>{clips.length} / 20</Text>
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
      />

      {/* Full-screen player modal */}
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
    fontSize: 22,
    fontWeight: '700',
  },
  count: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  grid: {
    padding: spacing.sm,
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
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
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
