import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { WebFilePicker } from '../components/web-file-picker';
import { COLORS } from '../config/colors';
import { runOCR } from '../utils/ocrService';
import { processScan } from '../utils/processingService';
import { setCurrentScan } from '../utils/scanResultStore';
import { showToast } from '../utils/toast';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef(null);
  const isMounted = useRef(true);
  const router = useRouter();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission?.granted, permission?.canAskAgain]);

  const takePicture = async () => {
    if (!cameraRef.current || capturing) return;

    try {
      setCapturing(true);
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });

      if (!isMounted.current) return;

      if (picture?.uri && isMounted.current) {
        setPhoto(picture.uri);
      }
    } catch (error) {
      console.error('Camera capture error:', error);
      showToast('Failed to capture photo. Try again.');
    } finally {
      if (isMounted.current) {
        setCapturing(false);
      }
    }
  };

  const processPhoto = async () => {
    if (!photo || processing) return;

    setProcessing(true);
    try {
      // Step 1: Extract text via OCR
      const ocrResult = await runOCR(photo);

      if (!ocrResult?.success || !ocrResult.text || ocrResult.text.trim().length === 0) {
        showToast(ocrResult?.error || 'No readable text found in image');
        if (isMounted.current) setProcessing(false);
        return;
      }

      // Step 2: Process through mode detection + Gemini AI
      const scanResult = await processScan(ocrResult.text);

      if (isMounted.current) {
        setProcessing(false);
        setPhoto(null);
      }

      setCurrentScan(scanResult);
      router.push('/result');
    } catch (error) {
      console.error('Processing error:', error);
      showToast(error.message || 'Error processing image');
      if (isMounted.current) {
        setProcessing(false);
      }
    }
  };

  if (!permission?.granted && Platform.OS !== 'web') {
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
          <Image source={{ uri: photo }} style={styles.image} resizeMode="contain" />
          {processing ? (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.processingText}>Analyzing document...</Text>
              <Text style={styles.processingSubtext}>Extracting text and generating insights</Text>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              <Button title="Process" onPress={processPhoto} color={COLORS.primary} />
              <Button title="Retake" onPress={() => setPhoto(null)} color={COLORS.accent} />
            </View>
          )}
        </>
      ) : (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <View style={styles.captureControls}>
            <Pressable
              style={[styles.captureButton, capturing && styles.captureButtonDisabled]}
              onPress={takePicture}
              disabled={capturing}
            >
              <Text style={styles.captureButtonText}>
                {capturing ? 'Capturing...' : 'Capture Photo'}
              </Text>
            </Pressable>
            <WebFilePicker
              disabled={capturing}
              onSelect={(dataUri) => {
                if (isMounted.current) setPhoto(dataUri);
              }}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000',
    position: 'relative',
  },
  camera: { flex: 1 },
  image: { width: '100%', height: '70%', backgroundColor: '#000' },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    gap: 10,
  },
  captureControls: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    gap: 10,
  },
  captureButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '90%',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonText: {
    color: COLORS.secondary,
    fontWeight: '700',
    fontSize: 15,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
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