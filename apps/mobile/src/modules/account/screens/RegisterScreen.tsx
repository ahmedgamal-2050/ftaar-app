import React from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { PlaceholderLinks, ScreenPlaceholder } from '../../../ui';

export function RegisterScreen() {
  const { register } = useAuth();

  return (
    <ScreenPlaceholder
      name="Register"
      description="Guest-to-registered conversion — local session only in this pass."
    >
      <PlaceholderLinks
        links={[
          {
            label: 'Continue',
            onPress: () => {
              void register();
            },
          },
        ]}
      />
    </ScreenPlaceholder>
  );
}
