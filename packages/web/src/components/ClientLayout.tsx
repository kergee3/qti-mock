'use client';

import { AppLayout } from './navigation';
import { NavigationItem } from '@/types/navigation';
import PlaylistPlayOutlinedIcon from '@mui/icons-material/PlaylistPlayOutlined';
import ListOutlinedIcon from '@mui/icons-material/ListOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';
import { SettingsProvider } from '@/contexts/SettingsContext';

const navigationItems: NavigationItem[] = [
  {
    label: '基本問題',
    path: '/basic',
    icon: <PlaylistPlayOutlinedIcon />,
  },
  {
    label: 'AI選択式',
    path: '/ai-choice',
    icon: <ListOutlinedIcon />,
  },
  {
    label: 'AI記述式',
    path: '/ai-text',
    icon: <EditNoteOutlinedIcon />,
  },
  {
    label: 'Playground',
    path: '/playground',
    icon: <ConstructionOutlinedIcon />,
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
