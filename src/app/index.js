import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Button, Image, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../config/colors';
import { runOCR } from '../utils/ocrService';
import { processScan } from '../utils/processingService';

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef(null);

  React.useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const picture = await cameraRef.current.takePictureAsync();
        setPhoto(picture.uri);
      } catch (error) {
        console.error('Camera error:', error);
      }
    }
  };

  const processPhoto = async () => {
    if (!photo) return;

    setProcessing(true);
    try {
      // Step 1: Extract text from image
      const ocrResult = await runOCR(photo);

      if (!ocrResult.success || !ocrResult.text || ocrResult.text.trim().length === 0) {
        alert('Could not extract text from image. Try a clearer photo.');
        setProcessing(false);
        return;
      }

      // Step 2: Process through mode detection + Gemini
      const scanResult = await processScan(ocrResult.text);

      setProcessing(false);

      if (!scanResult.success && scanResult.error === 'No internet connection') {
        alert('Analysis requires internet. OCR text only available offline.');
      }

      // Step 3: Navigate to result screen
      navigation.navigate('Result', { result: scanResult });

      // Reset camera
      setPhoto(null);

    } catch (error) {
      console.error('Processing error:', error);
      alert('Error processing image: ' + error.message);
      setProcessing(false);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera permission required</Text>
        <Text style={styles.permissionHint}>Allow camera access to capture and analyze text.</Text>
        <Button
          title="Grant Permission"
          onPress={requestPermission}
          color={COLORS.primary}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {photo ? (
        <>
          <Image source={{ uri: photo }} style={styles.image} />
          {processing ? (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.processingText}>Extracting text...</Text>
              <Text style={styles.processingSubtext}>This usually takes 2-3 seconds</Text>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              <Button
                title="Process"
                onPress={processPhoto}
                color={COLORS.primary}
              />
              <Button
                title="Retake"
                onPress={() => setPhoto(null)}
                color={COLORS.accent}
              />
            </View>
          )}
        </>
      ) : (
        <>
          <CameraView ref={cameraRef} style={styles.camera} />
          <Button title="Capture" onPress={takePicture} color={COLORS.primary} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
    position: 'relative'
  },
  camera: { flex: 1 },
  image: { width: '100%', height: '70%' },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    gap: 10
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingText: {
    color: COLORS.secondary,
    fontWeight: '600',
    marginTop: 12,
    fontSize: 16,
  },
  processingSubtext: {
    color: COLORS.textLight,
    marginTop: 6,
    fontSize: 12,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionHint: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
});