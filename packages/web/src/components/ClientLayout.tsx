'use client';

import { AppLayout } from './navigation';
import { NavigationItem } from '@/types/navigation';
import PlaylistPlayOutlinedIcon from '@mui/icons-material/PlaylistPlayOutlined';
import ListOutlinedIcon from '@mui/icons-material/ListOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import InfoIcon from '@mui/icons-material/Info';
import { SettingsProvider } from '@/contexts/SettingsContext';

const navigationItems: NavigationItem[] = [
  {
    label: '基本問題',
    path: '/basic',
    icon: <PlaylistPlayOutlinedIcon />,
  },
  {
    label: 'AI選択問題',
    path: '/ai-choice',
    icon: <ListOutlinedIcon />,
  },
  {
    label: 'AI記述問題',
    path: '/ai-text',
    icon: <EditNoteOutlinedIcon />,
  },
  {
    label: 'Playground',
    path: '/playground',
    icon: <ConstructionOutlinedIcon />,
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
