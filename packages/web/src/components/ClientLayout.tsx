'use client';

import { AppLayout } from './navigation';
import { NavigationItem } from '@/types/navigation';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';
import { SettingsProvider } from '@/contexts/SettingsContext';

const navigationItems: NavigationItem[] = [
  {
    label: '基本問題',
    path: '/basic',
    icon: <PlayArrowIcon />,
  },
  {
    label: 'AI作成問題',
    path: '/ai-choice',
    icon: <AutoAwesomeIcon />,
  },
  {
    label: 'Playground',
    path: '/playground',
    icon: <EditIcon />,
  },
  {
    label: '設定',
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
