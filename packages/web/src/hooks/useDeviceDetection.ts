'use client';

import { useState, useEffect } from 'react';

export type DeviceType = 'mobile-portrait' | 'mobile-landscape' | 'tablet-portrait' | 'tablet-landscape' | 'desktop';

export interface DeviceInfo {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    deviceType: 'desktop',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isPortrait: false,
    isLandscape: true,
  });

  useEffect(() => {
    const detectDevice = () => {
      const ua = navigator.userAgent;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;
      const isLandscape = width >= height;

      // モバイルデバイスの検出
      const isMobileDevice = /iPhone|iPod|Android.*Mobile/i.test(ua);

      // タブレットの検出
      const isTabletDevice = /iPad|Android(?!.*Mobile)/i.test(ua) ||
                            (width >= 768 && width < 1024 && !isMobileDevice);

      // デスクトップの検出
      const isDesktopDevice = !isMobileDevice && !isTabletDevice;

      let deviceType: DeviceType;

      if (isMobileDevice) {
        deviceType = isPortrait ? 'mobile-portrait' : 'mobile-landscape';
      } else if (isTabletDevice) {
        deviceType = isPortrait ? 'tablet-portrait' : 'tablet-landscape';
      } else {
        deviceType = 'desktop';
      }

      const newDeviceInfo = {
        deviceType,
        isMobile: isMobileDevice,
        isTablet: isTabletDevice,
        isDesktop: isDesktopDevice,
        isPortrait,
        isLandscape,
      };

      setDeviceInfo(newDeviceInfo);

      // セッションストレージに記録
      try {
        sessionStorage.setItem('deviceInfo', JSON.stringify({
          deviceType,
          isMobile: isMobileDevice,
          isTablet: isTabletDevice,
          isDesktop: isDesktopDevice,
          isPortrait,
          isLandscape,
          timestamp: new Date().toISOString(),
          userAgent: ua,
          screenSize: `${width}x${height}`,
        }));
      } catch (error) {
        console.error('Failed to save device info to sessionStorage:', error);
      }
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    window.addEventListener('orientationchange', detectDevice);

    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, []);

  return deviceInfo;
}
