'use client';

import { AppLayout } from './navigation';
import { NavigationItem } from '@/types/navigation';
import HomeIcon from '@mui/icons-material/Home';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';
import { SettingsProvider } from '@/contexts/SettingsContext';

const navigationItems: NavigationItem[] = [
  {
    label: 'Home',
    path: '/home',
    icon: <HomeIcon />,
  },
  {
    label: 'Test',
    path: '/test',
    icon: <PlayArrowIcon />,
  },
  {
    label: 'Flex Play',
    path: '/flex-play',
    icon: <FlashOnIcon />,
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: <SettingsIcon />,
  },
  {
    label: 'About',
    path: '/about',
    icon: <InfoIcon />,
  },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <AppLayout navigationItems={navigationItems}>{children}</AppLayout>
    </SettingsProvider>
  );
}
