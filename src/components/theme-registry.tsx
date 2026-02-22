"use client";

import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useServerInsertedHTML } from "next/navigation";
import { ReactNode, useState } from "react";

import theme from "@/theme";

export function ThemeRegistry({ children }: { children: ReactNode }) {
  const [{ cache, flush }] = useState(() => {
    const c = createCache({ key: "mui", prepend: true });
    c.compat = true;
    const prevInsert = c.insert.bind(c);
    let inserted: string[] = [];
    c.insert = (...args: Parameters<typeof c.insert>) => {
      const serialized = args[1];
      if (c.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flushFn = () => {
      const prev = inserted;
      inserted = [];
      return prev;
    };
    return { cache: c, flush: flushFn };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;
    let styles = "";
    for (const name of names) {
      styles += cache.inserted[name];
    }
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
