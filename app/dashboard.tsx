import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from '../lib/AuthContext';
import { Button, Card, Headline, Screen, Subtext } from '../components/ui';
import { colors, radii, spacing, typography } from '../lib/theme';

export default function Dashboard() {
  const { token, student, logout } = useAuth();
  const openSessions = useQuery(api.courses.getOpenSessionsForStudent, token ? { token } : 'skip');
  const summary = useQuery(api.attendance.getMyAttendanceSummary, token ? { token } : 'skip');

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.marginSide }}>
        <View>
          <Headline>Hi, {student?.fullName?.split(' ')[0] ?? '...'}</Headline>
          <Subtext>{student?.studentId}</Subtext>
        </View>
        <Pressable onPress={async () => { await logout(); router.replace('/login'); }}>
          <Text style={{ color: colors.secondary }}>Log out</Text>
        </Pressable>
      </View>

      {student && !student.faceEnrolled && (
        <Card style={{ marginBottom: spacing.vertical, backgroundColor: '#fef3c7' }}>
          <Text style={{ ...typography.subheader, marginBottom: 4 }}>Face enrollment required</Text>
          <Subtext>Enroll your face before you can mark attendance.</Subtext>
          <View style={{ height: spacing.base }} />
          <Button title="Enroll Now" onPress={() => router.push('/enrollment')} />
        </Card>
      )}

      <Text style={{ ...typography.subheader, marginBottom: spacing.base }}>Open Sessions</Text>
      <FlatList
        data={openSessions ?? []}
        keyExtractor={(item) => item.session._id}
        style={{ marginBottom: spacing.vertical }}
        ListEmptyComponent={
          <Card>
            <Subtext>No open attendance sessions right now.</Subtext>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: spacing.base }}>
              <Text style={{ ...typography.subheader }}>{item.course.code}</Text>
              <Subtext>{item.session.title}</Subtext>
            </View>
            <Pressable
              style={{ backgroundColor: colors.secondaryContainer, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radii.lg }}
              disabled={!student?.faceEnrolled}
              onPress={() =>
                router.push({
                  pathname: '/scanner',
                  params: { classSessionId: item.session._id, courseTitle: item.course.code },
                })
              }
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Check In</Text>
            </Pressable>
          </Card>
        )}
      />

      <Text style={{ ...typography.subheader, marginBottom: spacing.base }}>Attendance Summary</Text>
      <FlatList
        data={summary ?? []}
        keyExtractor={(item) => item.course._id}
        ListEmptyComponent={
          <Card>
            <Subtext>You're not enrolled in any courses yet.</Subtext>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.base }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...typography.body, fontWeight: '600' }}>{item.course.code}</Text>
              <Text style={{ ...typography.body, color: colors.secondary }}>{item.percentage}%</Text>
            </View>
            <Subtext>
              {item.attended} of {item.totalSessions} sessions attended
            </Subtext>
          </Card>
        )}
      />
    </Screen>
  );
}
