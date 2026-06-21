import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { Button, Image, StyleSheet, View } from 'react-native';

export default async async function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const cameraRef = useRef(null);

  React.useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const takePicture = async () => {
    if (cameraRef.current) {
      const picture = await cameraRef.current.takePictureAsync();
      setPhoto(picture.uri);
      console.log('Photo taken:', picture.uri);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Button title="Grant Camera Permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.image} />
      ) : (
        <CameraView ref={cameraRef} style={styles.camera} />
      )}
      <Button title={photo ? 'Take Another' : 'Capture'} onPress={takePicture} />
    </View>
  );

}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  camera: { flex: 1 },
  image: { width: '100%', height: 300 },
});