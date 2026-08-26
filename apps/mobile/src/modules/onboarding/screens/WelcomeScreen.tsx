import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../../navigation/types';
import {
  HEADERLESS_EDGES,
  PlaceholderLinks,
  ScreenPlaceholder,
} from '../../../ui';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <ScreenPlaceholder
      name="Welcome"
      edges={HEADERLESS_EDGES}
      description="Language pick and the first-run pitch land here later."
    >
      <PlaceholderLinks
        links={[
          {
            label: 'ChooseName',
            onPress: () => navigation.navigate('ChooseName'),
          },
        ]}
      />
    </ScreenPlaceholder>
  );
}
