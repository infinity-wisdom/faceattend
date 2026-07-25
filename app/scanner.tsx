import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from '../lib/AuthContext';
import { Button, Headline, Screen, Subtext } from '../components/ui';
import { colors, radii, spacing } from '../lib/theme';

type Step = 'frontal' | 'turn' | 'verifying';

export default function Scanner() {
  const { token } = useAuth();
  const { classSessionId, courseTitle } = useLocalSearchParams<{
    classSessionId: string;
    courseTitle?: string;
  }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [step, setStep] = useState<Step>('frontal');
  const [error, setError] = useState<string | null>(null);
  const verifyAndMarkAttendance = useAction(api.faceVerification.verifyAndMarkAttendance);

  // Picked once per screen visit so the challenge isn't predictable
  const [turnDirection] = useState<'left' | 'right'>(() => (Math.random() > 0.5 ? 'left' : 'right'));
  const frame1Ref = useRef<string | null>(null);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Headline>Camera access needed</Headline>
          <Button title="Grant Camera Access" onPress={requestPermission} />
        </View>
      </Screen>
    );
  }

  const captureFrontal = async () => {
    if (!cameraRef.current) return;
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
      if (!photo?.base64) throw new Error('Could not capture photo.');
      frame1Ref.current = photo.base64;
      setStep('turn');
    } catch (e: any) {
      setError(e?.message ?? 'Capture failed. Please try again.');
    }
  };

  const captureTurnAndVerify = async () => {
    if (!cameraRef.current || !token || !classSessionId || !frame1Ref.current) return;
    setStep('verifying');
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
      if (!photo?.base64) throw new Error('Could not capture photo.');

      const result = await verifyAndMarkAttendance({
        token,
        classSessionId: classSessionId as any,
        frame1Base64: frame1Ref.current,
        frame2Base64: photo.base64,
        turnDirection,
      });

      if (result.verified && result.live) {
        router.replace({ pathname: '/verification-success', params: { confidence: String(result.confidence) } });
      } else {
        router.replace({
          pathname: '/verification-mismatch',
          params: { reason: result.reason ?? 'Face did not match enrolled record.' },
        });
      }
    } catch (e: any) {
      setError(e?.message ?? 'Verification failed. Please try again.');
      setStep('turn');
    }
  };

  const prompt =
    step === 'frontal'
      ? 'Look straight at the camera'
      : step === 'turn'
      ? `Now turn your head slightly to the ${turnDirection}`
      : 'Verifying…';

  return (
    <Screen>
      <Headline>Verify Attendance</Headline>
      <Subtext>{courseTitle ? `${courseTitle} — ${prompt}` : prompt}</Subtext>
      <View style={styles.cameraWrap}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
        <View style={styles.reticle} />
      </View>
      {error && <Text style={{ color: colors.error, marginBottom: spacing.base }}>{error}</Text>}

      {step === 'frontal' && <Button title="Capture" onPress={captureFrontal} />}
      {step === 'turn' && <Button title={`Capture (turned ${turnDirection})`} onPress={captureTurnAndVerify} />}
      {step === 'verifying' && <Button title="Verifying…" onPress={() => {}} loading />}
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
