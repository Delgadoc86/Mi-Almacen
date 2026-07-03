import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type Tone = 'primary' | 'success' | 'danger' | 'warning' | 'accent' | 'muted';
