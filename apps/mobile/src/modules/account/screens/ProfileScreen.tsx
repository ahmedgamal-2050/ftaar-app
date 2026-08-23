import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../../navigation/types';
import { useAuth } from '../../../auth/AuthContext';
import { MemberChip, PlaceholderLinks, ScreenPlaceholder } from '../../../ui';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileScreen'>;

export function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const displayName = user?.displayName ?? 'Guest';

  return (
    <ScreenPlaceholder
      name="ProfileScreen"
      description="Account, conversion, and sign-out."
    >
      <MemberChip name={displayName} size="lg" withName />
      <PlaceholderLinks
        links={[
          { label: 'Register', onPress: () => navigation.navigate('Register') },
          { label: 'Login', onPress: () => navigation.navigate('Login') },
          {
            label: 'ForgotPasswordStub',
            onPress: () => navigation.navigate('ForgotPasswordStub'),
          },
          { label: 'Log out', onPress: () => void logout() },
        ]}
      />
    </ScreenPlaceholder>
  );
}
