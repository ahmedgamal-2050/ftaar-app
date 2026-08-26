import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../../navigation/types';
import { useAuth } from '../../../auth/AuthContext';
import { PlaceholderLinks, ScreenPlaceholder } from '../../../ui';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();

  return (
    <ScreenPlaceholder
      name="Login"
      description="Registered sign-in — local session only in this pass."
    >
      <PlaceholderLinks
        links={[
          {
            label: 'ForgotPasswordStub',
            onPress: () => navigation.navigate('ForgotPasswordStub'),
          },
          {
            label: 'Continue',
            onPress: () => {
              void login();
            },
          },
        ]}
      />
    </ScreenPlaceholder>
  );
}
