'use client';

import { AppLayout } from './navigation';
import { NavigationItem } from '@/types/navigation';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RateReviewIcon from '@mui/icons-material/RateReview';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import { SettingsProvider } from '@/contexts/SettingsContext';

const navigationItems: NavigationItem[] = [
  {
    label: '基本問題',
    path: '/basic',
    icon: <PlayArrowIcon />,
  },
  {
    label: 'AI選択問題',
    path: '/ai-choice',
    icon: <AutoAwesomeIcon />,
  },
  {
    label: 'AI記述問題',
    path: '/ai-text',
    icon: <RateReviewIcon />,
  },
  {
    label: 'Playground',
    path: '/playground',
    icon: <EditIcon />,
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
