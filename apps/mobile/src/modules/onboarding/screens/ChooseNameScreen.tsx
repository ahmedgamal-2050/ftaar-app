import React from 'react';
import { useAuth } from '../../../auth/AuthContext';
import {
  HEADERLESS_EDGES,
  PlaceholderLinks,
  ScreenPlaceholder,
} from '../../../ui';

export function ChooseNameScreen() {
  const { completeOnboarding } = useAuth();

  return (
    <ScreenPlaceholder
      name="ChooseName"
      edges={HEADERLESS_EDGES}
      description="Picking a display name creates the local guest session."
    >
      <PlaceholderLinks
        links={[
          {
            label: 'Continue',
            onPress: () => {
              void completeOnboarding('Guest');
            },
          },
        ]}
      />
    </ScreenPlaceholder>
  );
}
