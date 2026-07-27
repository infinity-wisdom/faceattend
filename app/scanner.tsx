import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from '../lib/AuthContext';
import { Button, Headline, Screen, Subtext } from '../components/ui';
import { colors, radii, spacing } from '../lib/theme';

type Step = 'positioning' | 'holdStill' | 'turning' | 'verifying' | 'error';

// Timings for the fully-automatic flow (no taps needed)
const POSITION_DELAY_MS = 1800; // let the camera settle + person get in frame
const TURN_DELAY_MS = 2200; // time to actually turn their head after the prompt appears

export default function Scanner() {
  const { token } = useAuth();
  const { classSessionId, courseTitle } = useLocalSearchParams<{
    classSessionId: string;
    courseTitle?: string;
  }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [step, setStep] = useState<Step>('positioning');
  const [error, setError] = useState<string | null>(null);
  const verifyAndMarkAttendance = useAction(api.faceVerification.verifyAndMarkAttendance);

  const [turnDirection] = useState<'left' | 'right'>(() => (Math.random() > 0.5 ? 'left' : 'right'));
  const frame1Ref = useRef<string | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!permission?.granted) return;
    runSequence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted]);

  const runSequence = async () => {
    try {
      // Step 1: give the camera a moment, then auto-capture the frontal shot
      setStep('positioning');
      await sleep(POSITION_DELAY_MS);
      if (cancelledRef.current) return;

      const frame1 = await capture();
      if (!frame1) throw new Error('Could not capture photo. Please retry.');
      frame1Ref.current = frame1;

      // Step 2: prompt the turn, give them time to actually do it, then capture
      setStep('turning');
      await sleep(TURN_DELAY_MS);
      if (cancelledRef.current) return;

      const frame2 = await capture();
      if (!frame2) throw new Error('Could not capture photo. Please retry.');

      // Step 3: verify
      setStep('verifying');
      if (!token || !classSessionId) throw new Error('Missing session info.');

      const result = await verifyAndMarkAttendance({
        token,
        classSessionId: classSessionId as any,
        frame1Base64: frame1Ref.current,
        frame2Base64: frame2,
        turnDirection,
      });

      if (cancelledRef.current) return;

      if (result.verified && result.live) {
        router.replace({ pathname: '/verification-success', params: { confidence: String(result.confidence) } });
      } else {
        router.replace({
          pathname: '/verification-mismatch',
          params: { reason: result.reason ?? 'Face did not match enrolled record.' },
        });
      }
    } catch (e: any) {
      if (cancelledRef.current) return;
      setError(e?.message ?? 'Something went wrong. Please retry.');
      setStep('error');
    }
  };

  const capture = async (): Promise<string | null> => {
    if (!cameraRef.current) return null;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
    return photo?.base64 ?? null;
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const retry = () => {
    setError(null);
    frame1Ref.current = null;
    runSequence();
  };

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

  const prompt =
    step === 'positioning'
      ? 'Hold still, looking straight at the camera…'
      : step === 'turning'
      ? `Now turn your head slightly to the ${turnDirection}…`
      : step === 'verifying'
      ? 'Verifying…'
      : 'Something went wrong';

  return (
    <Screen>
      <Headline>Verify Attendance</Headline>
      <Subtext>{courseTitle ? `${courseTitle} — ${prompt}` : prompt}</Subtext>
      <View style={styles.cameraWrap}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
        <View
          style={[
            styles.reticle,
            step === 'turning' && { borderColor: colors.warning },
            step === 'verifying' && { borderColor: colors.tertiaryContainer },
          ]}
        />
      </View>
      {error && <Text style={{ color: colors.error, marginBottom: spacing.base }}>{error}</Text>}
      {step === 'error' && <Button title="Retry" onPress={retry} />}
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
