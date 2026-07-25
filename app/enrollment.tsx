import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from '../lib/AuthContext';
import { Button, Headline, Screen, Subtext } from '../components/ui';
import { colors, radii, spacing } from '../lib/theme';

export default function Enrollment() {
  const { token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const completeFaceEnrollment = useMutation(api.students.completeFaceEnrollment);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Headline>Camera access needed</Headline>
          <Subtext>FaceAttend needs your camera to enroll your face for verification.</Subtext>
          <View style={{ height: spacing.vertical }} />
          <Button title="Grant Camera Access" onPress={requestPermission} />
        </View>
      </Screen>
    );
  }

  const captureAndUpload = async () => {
    if (!cameraRef.current || !token) return;
    setCapturing(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
      if (!photo?.uri) throw new Error('Could not capture photo.');

      const uploadUrl = await generateUploadUrl();
      const fileResponse = await fetch(photo.uri);
      const blob = await fileResponse.blob();
      const uploadResult = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });
      const { storageId } = await uploadResult.json();

      await completeFaceEnrollment({ token, storageId });
      router.replace('/dashboard');
    } catch (e: any) {
      setError(e?.message ?? 'Enrollment failed. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Screen>
      <Headline>Enroll your face</Headline>
      <Subtext>Center your face in the frame with good lighting, then capture.</Subtext>
      <View style={styles.cameraWrap}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
        <View style={styles.reticle} />
      </View>
      {error && <Text style={{ color: colors.error, marginBottom: spacing.base }}>{error}</Text>}
      <Button title="Capture" onPress={captureAndUpload} loading={capturing} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerHigh,
    marginVertical: spacing.marginSide,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticle: {
    position: 'absolute',
    width: '70%',
    aspectRatio: 3 / 4,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.secondaryContainer,
  },
});
