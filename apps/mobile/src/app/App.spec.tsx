import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import App from './App';

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('a fresh install lands on the Welcome placeholder', async () => {
  render(<App />);

  await waitFor(() => expect(screen.getByTestId('placeholder-Welcome')).toBeTruthy());
});

test('ChooseName continues into the four-tab shell', async () => {
  render(<App />);

  await waitFor(() => expect(screen.getByTestId('placeholder-Welcome')).toBeTruthy());
  fireEvent.press(screen.getByText('ChooseName'));
  fireEvent.press(screen.getByText('Continue'));

  await waitFor(() => expect(screen.getByTestId('placeholder-HomeScreen')).toBeTruthy());
  expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
  expect(screen.getAllByText('History').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Restaurants').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Profile').length).toBeGreaterThan(0);
});
