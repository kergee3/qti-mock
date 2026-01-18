'use client';

import { AppBar, Toolbar, Tabs, Tab, Typography } from '@mui/material';
import { ReactElement } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { NavigationItem } from '@/types/navigation';

interface TopTabsProps {
  items: NavigationItem[];
}

export default function TopTabs({ items }: TopTabsProps) {
  const pathname = usePathname();
  const router = useRouter();

  const currentIndex = items.findIndex(item => item.path === pathname);

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
        <Typography variant="h6" component="div" sx={{ mr: 0.5, flexShrink: 0 }}>
          QTI Mock
        </Typography>
        <Tabs
          value={currentIndex !== -1 ? currentIndex : 0}
          textColor="inherit"
          indicatorColor="secondary"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            ml: 0,
            '& .MuiTabs-scrollButtons': {
              color: 'inherit',
              '&.Mui-disabled': {
                display: 'none',
                width: 0,
                opacity: 0,
              },
            },
            '& .MuiTabs-flexContainer': {
              gap: 0,
            },
          }}
        >
          {items.map((item) => (
            <Tab
              key={item.path}
              label={item.label}
              icon={item.icon as ReactElement}
              iconPosition="start"
              onClick={() => {
                if (pathname === item.path) {
                  // 同じページをクリックした場合はリロードして初期状態に戻す
                  window.location.href = item.path;
                } else {
                  router.push(item.path);
                }
              }}
              sx={{
                minHeight: 64,
                minWidth: 'auto',
                px: 1,
              }}
            />
          ))}
        </Tabs>
      </Toolbar>
    </AppBar>
  );
}
