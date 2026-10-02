import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/tokens';
import Button from './ui/Button';

export interface FilterState {
  minPrice: string;
  maxPrice: string;
  stockOnly: boolean;
  brand?: string | undefined;
  ram?: string | undefined;
  storage?: string | undefined;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  currentFilters: FilterState;
  brandCounts?: Record<string, number>;
  ramCounts?: Record<string, number>;
  storageCounts?: Record<string, number>;
}

const PRESET_RANGES = [
  { label: 'Under ₹20,000', min: '', max: '20000' },
  { label: '₹20,000 – ₹35,000', min: '20000', max: '35000' },
  { label: '₹35,000 – ₹50,000', min: '35000', max: '50000' },
  { label: 'Above ₹50,000', min: '50000', max: '' },
];

const BRANDS = ['Dell', 'HP', 'Lenovo', 'Apple', 'Asus', 'Acer'];
const RAM_OPTIONS = ['8GB', '16GB', '32GB', '64GB'];
const STORAGE_OPTIONS = ['128GB SSD', '256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD'];

export default function FilterModal({
  visible,
  onClose,
  onApply,
  currentFilters,
  brandCounts = {},
  ramCounts = {},
  storageCounts = {},
}: FilterModalProps) {
  const [minPrice, setMinPrice] = useState(currentFilters.minPrice);
  const [maxPrice, setMaxPrice] = useState(currentFilters.maxPrice);
  const [stockOnly, setStockOnly] = useState(currentFilters.stockOnly);
  const [brand, setBrand] = useState(currentFilters.brand || '');
  const [ram, setRam] = useState(currentFilters.ram || '');
  const [storage, setStorage] = useState(currentFilters.storage || '');

  useEffect(() => {
    if (visible) {
      setMinPrice(currentFilters.minPrice);
      setMaxPrice(currentFilters.maxPrice);
      setStockOnly(currentFilters.stockOnly);
      setBrand(currentFilters.brand || '');
      setRam(currentFilters.ram || '');
      setStorage(currentFilters.storage || '');
    }
  }, [visible, currentFilters]);

  const handleApply = () => {
    onApply({
      minPrice,
      maxPrice,
      stockOnly,
      brand: brand || undefined,
      ram: ram || undefined,
      storage: storage || undefined,
    });
    onClose();
  };

  const handleClear = () => {
    setMinPrice('');
    setMaxPrice('');
    setStockOnly(false);
    setBrand('');
    setRam('');
    setStorage('');
  };

  const handlePreset = (preset: { min: string; max: string }) => {
    if (minPrice === preset.min && maxPrice === preset.max) {
      setMinPrice('');
      setMaxPrice('');
    } else {
      setMinPrice(preset.min);
      setMaxPrice(preset.max);
    }
  };

  const activeFilterCount =
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (stockOnly ? 1 : 0) +
    (brand ? 1 : 0) +
    (ram ? 1 : 0) +
    (storage ? 1 : 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Filter Products</Text>
              {activeFilterCount > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </View>
            <View style={styles.headerActions}>
              {activeFilterCount > 0 && (
                <TouchableOpacity onPress={handleClear} style={styles.resetButton}>
                  <Text style={styles.resetText}>Reset All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Price Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Price Range</Text>
              <View style={styles.presets}>
                {PRESET_RANGES.map((preset) => {
                  const isActive = minPrice === preset.min && maxPrice === preset.max;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      style={[styles.presetChip, isActive && styles.presetChipActive]}
                      onPress={() => handlePreset(preset)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.presetText, isActive && styles.presetTextActive]}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom min/max inputs */}
              <View style={styles.priceRow}>
                <View style={styles.priceInputWrap}>
                  <Text style={styles.priceLabel}>Min Price (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={minPrice}
                    onChangeText={setMinPrice}
                  />
                </View>
                <Text style={styles.priceDash}>—</Text>
                <View style={styles.priceInputWrap}>
                  <Text style={styles.priceLabel}>Max Price (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Any"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                  />
                </View>
              </View>
            </View>

            {/* Brand */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Brand</Text>
              <View style={styles.pillsGrid}>
                {BRANDS.map((b) => {
                  const isActive = brand.toLowerCase() === b.toLowerCase();
                  const count = brandCounts[b.toLowerCase()];
                  return (
                    <TouchableOpacity
                      key={b}
                      style={[styles.pill, isActive && styles.pillActive]}
                      onPress={() => setBrand(isActive ? '' : b)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                        {b}
                      </Text>
                      {count !== undefined && count > 0 && (
                        <Text style={[styles.pillCount, isActive && styles.pillCountActive]}>
                          ({count})
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* RAM */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>RAM</Text>
              <View style={styles.pillsGrid}>
                {RAM_OPTIONS.map((r) => {
                  const isActive = ram.toLowerCase() === r.toLowerCase();
                  const count = ramCounts[r.toLowerCase()];
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.pill, isActive && styles.pillActive]}
                      onPress={() => setRam(isActive ? '' : r)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                        {r}
                      </Text>
                      {count !== undefined && count > 0 && (
                        <Text style={[styles.pillCount, isActive && styles.pillCountActive]}>
                          ({count})
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Storage */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Storage</Text>
              <View style={styles.pillsGrid}>
                {STORAGE_OPTIONS.map((s) => {
                  const isActive = storage.toLowerCase() === s.toLowerCase();
                  const count = storageCounts[s.toLowerCase()];
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.pill, isActive && styles.pillActive]}
                      onPress={() => setStorage(isActive ? '' : s)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                        {s}
                      </Text>
                      {count !== undefined && count > 0 && (
                        <Text style={[styles.pillCount, isActive && styles.pillCountActive]}>
                          ({count})
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* In Stock Only Switch */}
            <View style={[styles.section, styles.stockSection]}>
              <View style={styles.stockInfo}>
                <Text style={styles.stockTitle}>In Stock Only</Text>
                <Text style={styles.stockSubtitle}>Hide units currently out of inventory</Text>
              </View>
              <Switch
                value={stockOnly}
                onValueChange={setStockOnly}
                trackColor={{ false: '#E2E8F0', true: '#93C5FD' }}
                thumbColor={stockOnly ? colors.primary : '#FFFFFF'}
              />
            </View>
          </ScrollView>

          {/* Sticky Footer */}
          <View style={styles.footer}>
            <Button
              title="Apply Filters"
              onPress={handleApply}
              variant="primary"
              size="lg"
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 31, 75, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.navy,
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: {
    color: colors.textWhite,
    fontSize: 11,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  resetButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resetText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  presetChip: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  presetChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priceInputWrap: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.cardBg,
  },
  priceDash: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 18,
  },
  pillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  pillCount: {
    fontSize: 11,
    color: colors.textMuted,
  },
  pillCountActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  stockSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.xxl,
  },
  stockInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  stockTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  stockSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorderLight,
    backgroundColor: colors.cardBg,
  },
});
