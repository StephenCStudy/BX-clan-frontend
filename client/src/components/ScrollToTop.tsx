import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// Force scroll to top helper
const forceScrollToTop = () => {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  // Scroll to top on initial page load
  useLayoutEffect(() => {
    if (isFirstRender.current) {
      forceScrollToTop();
      isFirstRender.current = false;
    }
  }, []);

  // Synchronous scroll on route change
  useLayoutEffect(() => {
    forceScrollToTop();
  }, [pathname]);

  // Single backup scroll with requestAnimationFrame for smoother handling
  useEffect(() => {
    const rafId = requestAnimationFrame(forceScrollToTop);
    return () => cancelAnimationFrame(rafId);
  }, [pathname]);

  // Handle browser history scroll restoration
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  return null;
};

export default ScrollToTop;
