'use client';

import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { NavigationItem } from '@/types/navigation';

interface BottomNavBarProps {
  items: NavigationItem[];
}

export default function BottomNavBar({ items }: BottomNavBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const currentIndex = items.findIndex(item => item.path === pathname);

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        boxShadow: '0 -2px 4px rgba(0,0,0,0.1)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      elevation={0}
    >
      <BottomNavigation
        value={currentIndex !== -1 ? currentIndex : 0}
        showLabels
      >
        {items.map((item) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            icon={item.icon}
            onClick={() => {
              if (pathname === item.path) {
                // 同じページをクリックした場合はリロードして初期状態に戻す
                window.location.href = item.path;
              } else {
                router.push(item.path);
              }
            }}
            sx={{
              minWidth: 'auto',
              px: 0.5,
            }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
