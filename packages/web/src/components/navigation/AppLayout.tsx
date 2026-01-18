'use client';

import { Box } from '@mui/material';
import { useEffect } from 'react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useSettings } from '@/contexts/SettingsContext';
import { NavigationItem } from '@/types/navigation';
import BottomNavBar from './BottomNavBar';
import Sidebar, { DRAWER_WIDTH, MOBILE_DRAWER_WIDTH } from './Sidebar';
import TopTabs from './TopTabs';

interface AppLayoutProps {
  children: React.ReactNode;
  navigationItems: NavigationItem[];
}

export default function AppLayout({ children, navigationItems }: AppLayoutProps) {
  const deviceInfo = useDeviceDetection();
  const { navigationPosition, hideNavigation } = useSettings();

  // 設定に応じてナビゲーションの表示を決定
  let showBottomNav = false;
  let showSidebar = false;
  let showTopTabs = false;

  if (navigationPosition === 'auto') {
    // 自動モード：既存のロジック
    showBottomNav =
      deviceInfo.deviceType === 'mobile-portrait' ||
      deviceInfo.deviceType === 'tablet-portrait';
    showSidebar =
      deviceInfo.deviceType === 'mobile-landscape' ||
      deviceInfo.deviceType === 'tablet-landscape';
    showTopTabs = deviceInfo.deviceType === 'desktop';
  } else if (navigationPosition === 'top') {
    showTopTabs = true;
  } else if (navigationPosition === 'left') {
    showSidebar = true;
  } else if (navigationPosition === 'bottom') {
    showBottomNav = true;
  }

  // ナビゲーション非表示フラグが true の場合、すべて非表示
  if (hideNavigation) {
    showBottomNav = false;
    showSidebar = false;
    showTopTabs = false;
  }

  const isMobileLandscape = deviceInfo.deviceType === 'mobile-landscape';

  // Sidebar幅の決定：自動モードの場合はデバイスに応じて、手動設定の場合は通常幅
  let sidebarWidth = DRAWER_WIDTH;
  if (navigationPosition === 'auto' && isMobileLandscape) {
    sidebarWidth = MOBILE_DRAWER_WIDTH;
  } else if (navigationPosition === 'left') {
    // 手動でleft設定の場合は、モバイルかどうかで判断
    sidebarWidth = deviceInfo.isMobile ? MOBILE_DRAWER_WIDTH : DRAWER_WIDTH;
  }

  // 向き変更時にビューポートをリセット
  useEffect(() => {
    const handleOrientationChange = () => {
      // ビューポートのメタタグをリセット
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
      }

      // 無限ループ防止: resize イベントは発火しない
    };

    // orientationchange のみリッスン（resize は除外して無限ループ防止）
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {showTopTabs && <TopTabs items={navigationItems} />}

      <Box sx={{ display: 'flex', flex: 1 }}>
        {showSidebar && (
          <Sidebar
            items={navigationItems}
            isMobile={false}
            width={sidebarWidth}
          />
        )}

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 0,
            marginLeft: showSidebar ? `calc(${sidebarWidth}px + env(safe-area-inset-left))` : 0,
            marginTop: showTopTabs ? '64px' : 0,
            marginBottom: showBottomNav ? 'calc(56px + env(safe-area-inset-bottom))' : 0,
            overflow: 'auto',
            minWidth: 0,
          }}
        >
          {children}
        </Box>
      </Box>

      {showBottomNav && <BottomNavBar items={navigationItems} />}
    </Box>
  );
}
