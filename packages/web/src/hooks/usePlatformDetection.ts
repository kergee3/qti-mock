'use client';

import { useState, useEffect } from 'react';

export interface PlatformInfo {
  isWindows: boolean;
}

export function usePlatformDetection(): PlatformInfo {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
    isWindows: false,
  });

  useEffect(() => {
    const ua = navigator.userAgent;
    const isWindows = /Windows/.test(ua);
    setPlatformInfo({ isWindows });
  }, []);

  return platformInfo;
}
