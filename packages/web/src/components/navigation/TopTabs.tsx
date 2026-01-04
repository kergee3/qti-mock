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
      <Toolbar sx={{ px: { xs: 1, sm: 2 }, minHeight: { xs: 48, sm: 48 } }}>
        <Typography variant="h6" component="div" sx={{ mr: 0.5, flexShrink: 0 }}>
          QTI Mock
        </Typography>
        <Tabs
          value={currentIndex !== -1 ? currentIndex : 0}
          onChange={(event, newValue) => {
            router.push(items[newValue].path);
          }}
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
              sx={{
                minHeight: 48,
                minWidth: 'auto',
                px: 1,
                py: 0,
              }}
            />
          ))}
        </Tabs>
      </Toolbar>
    </AppBar>
  );
}
