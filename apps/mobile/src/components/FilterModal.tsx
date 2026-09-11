import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface FilterState {
  minPrice: string;
  maxPrice: string;
  stockOnly: boolean;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  currentFilters: FilterState;
}

const PRESET_RANGES = [
  { label: 'Under ₹10,000', min: '', max: '10000' },
  { label: '₹10,000 – ₹25,000', min: '10000', max: '25000' },
  { label: '₹25,000 – ₹50,000', min: '25000', max: '50000' },
  { label: '₹50,000 – ₹1,00,000', min: '50000', max: '100000' },
  { label: 'Above ₹1,00,000', min: '100000', max: '' },
];

export default function FilterModal({ visible, onClose, onApply, currentFilters }: FilterModalProps) {
  const [minPrice, setMinPrice] = useState(currentFilters.minPrice);
  const [maxPrice, setMaxPrice] = useState(currentFilters.maxPrice);
  const [stockOnly, setStockOnly] = useState(currentFilters.stockOnly);

  useEffect(() => {
    if (visible) {
      setMinPrice(currentFilters.minPrice);
      setMaxPrice(currentFilters.maxPrice);
      setStockOnly(currentFilters.stockOnly);
    }
  }, [visible, currentFilters]);

  const handleApply = () => {
    onApply({ minPrice, maxPrice, stockOnly });
    onClose();
  };

  const handleClear = () => {
    setMinPrice('');
    setMaxPrice('');
    setStockOnly(false);
  };

  const handlePreset = (preset: { min: string; max: string }) => {
    setMinPrice(preset.min);
    setMaxPrice(preset.max);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Price Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Price Range</Text>

              {/* Preset ranges */}
              <View style={styles.presets}>
                {PRESET_RANGES.map((preset) => {
                  const isActive = minPrice === preset.min && maxPrice === preset.max;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      style={[styles.presetChip, isActive && styles.presetChipActive]}
                      onPress={() => handlePreset(preset)}
                    >
                      <Text style={[styles.presetText, isActive && styles.presetTextActive]}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom range */}
              <View style={styles.priceRow}>
                <View style={styles.priceInput}>
                  <Text style={styles.priceLabel}>Min (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="numeric"
                    value={minPrice}
                    onChangeText={setMinPrice}
                  />
                </View>
                <Text style={styles.priceDash}>—</Text>
                <View style={styles.priceInput}>
                  <Text style={styles.priceLabel}>Max (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Any"
                    keyboardType="numeric"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                  />
                </View>
              </View>
            </View>

            {/* Stock filter */}
            <View style={styles.section}>
              <View style={styles.stockRow}>
                <View>
                  <Text style={styles.sectionTitle}>In Stock Only</Text>
                  <Text style={styles.stockHint}>Show only products available for purchase</Text>
                </View>
                <Switch
                  value={stockOnly}
                  onValueChange={setStockOnly}
                  trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                  thumbColor={stockOnly ? '#2563eb' : '#f4f4f5'}
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  presetText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  presetTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  priceInput: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 4,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#fff',
  },
  priceDash: {
    fontSize: 18,
    color: '#94a3b8',
    marginBottom: 12,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  clearButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  applyButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
