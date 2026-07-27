import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from '../lib/AuthContext';
import { Button, Headline, Screen, Subtext } from '../components/ui';
import { colors, radii, spacing } from '../lib/theme';

const CAPTURE_DELAY_MS = 2000; // gives the person a moment to get in frame

export default function Enrollment() {
  const { token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const completeFaceEnrollment = useMutation(api.students.completeFaceEnrollment);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!permission?.granted) return;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted]);

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

  const run = async () => {
    if (!token) return;
    setCapturing(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, CAPTURE_DELAY_MS));
      if (cancelledRef.current) return;

      if (!cameraRef.current) throw new Error('Camera not ready.');
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
      if (cancelledRef.current) return;
      router.replace('/dashboard');
    } catch (e: any) {
      if (cancelledRef.current) return;
      setError(e?.message ?? 'Enrollment failed. Please try again.');
    } finally {
      if (!cancelledRef.current) setCapturing(false);
    }
  };

  const retry = () => run();

  return (
    <Screen>
      <Headline>Enroll your face</Headline>
      <Subtext>Center your face in the frame with good lighting — capturing automatically.</Subtext>
      <View style={styles.cameraWrap}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
        <View style={styles.reticle} />
      </View>
      {error && <Text style={{ color: colors.error, marginBottom: spacing.base }}>{error}</Text>}
      {error ? (
        <Button title="Retry" onPress={retry} />
      ) : (
        <Button title={capturing ? 'Capturing…' : 'Preparing…'} onPress={() => {}} loading />
      )}
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
