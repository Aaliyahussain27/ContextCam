import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../config/colors';

export function WebFilePicker({ onSelect, disabled }) {
  const fileInputRef = useRef(null);

  const handleWebFileSelect = (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        onSelect?.(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <View style={styles.webUploadContainer}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleWebFileSelect}
        style={{ display: 'none' }}
      />
      <Pressable
        style={styles.uploadButton}
        disabled={disabled}
        onPress={() => fileInputRef.current?.click()}
      >
        <Text style={styles.uploadButtonText}>Upload Image File</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  webUploadContainer: {
    marginTop: 4,
    width: '90%',
  },
  uploadButton: {
    backgroundColor: '#333',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  uploadButtonText: {
    color: '#eee',
    fontSize: 13,
    fontWeight: '600',
  },
});
