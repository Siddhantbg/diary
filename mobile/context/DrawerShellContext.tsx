import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type DrawerShellValue = {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

const DrawerShellContext = createContext<DrawerShellValue | null>(null);

export function DrawerShellProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(
    () => ({
      open,
      openDrawer: () => setOpen(true),
      closeDrawer: () => setOpen(false),
      toggleDrawer: () => setOpen((v) => !v),
    }),
    [open]
  );
  return <DrawerShellContext.Provider value={value}>{children}</DrawerShellContext.Provider>;
}

export function useDrawerShell() {
  const ctx = useContext(DrawerShellContext);
  if (!ctx) throw new Error('useDrawerShell must be used within DrawerShellProvider');
  return ctx;
}
