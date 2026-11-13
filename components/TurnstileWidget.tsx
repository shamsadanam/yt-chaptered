"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import Script from "next/script";

export interface TurnstileWidgetHandle {
  reset: () => void;
}

export interface TurnstileWidgetProps {
  onTokenChange: (token: string | null) => void;
  onError?: (error: string) => void;
  action?: string;
  className?: string;
}

const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const DUMMY_DEV_SITE_KEY = "1x00000000000000000000AA";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          action?: string;
          appearance?: "always" | "execute" | "interaction-only";
          theme?: "auto" | "light" | "dark";
          callback?: (token: string) => void;
          "error-callback"?: (errorCode: string) => void;
          "expired-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ onTokenChange, onError, action, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    const reset = useCallback(() => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
          onTokenChange(null);
        } catch {
          // ignore reset errors
        }
      }
    }, [onTokenChange]);

    useImperativeHandle(ref, () => ({
      reset,
    }), [reset]);

    const renderWidget = useCallback(() => {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) {
        return;
      }

      const sitekey =
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
        (process.env.NODE_ENV !== "production" ? DUMMY_DEV_SITE_KEY : undefined);

      if (!sitekey) {
        onError?.("NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured");
        return;
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey,
          action,
          appearance: "interaction-only",
          theme: "auto",
          callback: (token: string) => {
            onTokenChange(token);
          },
          "expired-callback": () => {
            onTokenChange(null);
          },
          "error-callback": (errorCode: string) => {
            onTokenChange(null);
            onError?.(`Turnstile error: ${errorCode}`);
          },
        });
        widgetIdRef.current = id;
      } catch (err) {
        console.warn("Failed to render Turnstile widget:", err);
        onError?.(err instanceof Error ? err.message : "Failed to render Turnstile widget");
      }
    }, [action, onError, onTokenChange]);

    useEffect(() => {
      if (window.turnstile) {
        renderWidget();
      }

      return () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            /* unmount cleanup */
          }
          widgetIdRef.current = null;
        }
      };
    }, [renderWidget]);

    return (
      <>
        <Script
          src={TURNSTILE_SCRIPT_URL}
          strategy="afterInteractive"
          onLoad={renderWidget}
        />
        <div
          ref={containerRef}
          className={className || "flex justify-start empty:hidden"}
          aria-live="polite"
        />
      </>
    );
  }
);
