import { useState, useEffect, useCallback } from 'react';

export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(async (element: HTMLElement = document.documentElement) => {
    if (!document.fullscreenElement) {
      try {
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        }
      } catch (err) {
        console.error(`Error attempting to enable full-screen mode: ${err}`);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return { isFullscreen, toggleFullscreen, exitFullscreen };
};
