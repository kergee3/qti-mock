'use client';

import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { NavigationItem } from '@/types/navigation';

interface SidebarProps {
  items: NavigationItem[];
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  width?: number;
}

const DRAWER_WIDTH = 240;
const MOBILE_DRAWER_WIDTH = 160;

export default function Sidebar({ items, isMobile = false, isOpen = true, onClose, width }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const drawerWidth = width || (isMobile ? MOBILE_DRAWER_WIDTH : DRAWER_WIDTH);

  const handleNavigation = (path: string) => {
    if (pathname === path) {
      // 同じページをクリックした場合はリロードして初期状態に戻す
      window.location.href = path;
    } else {
      router.push(path);
    }
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <Box
      sx={{
        width: `calc(${drawerWidth}px + env(safe-area-inset-left))`,
        flexShrink: 0,
        backgroundColor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'auto',
        zIndex: 1200,
        paddingLeft: 'env(safe-area-inset-left)',
      }}
    >
      <List sx={{ pt: 1, px: 0 }}>
        {items.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={pathname === item.path}
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

export { DRAWER_WIDTH, MOBILE_DRAWER_WIDTH };
