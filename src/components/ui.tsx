"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X, LoaderCircle, Check, AlertCircle } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { createContext, useContext, useState, useCallback, useSyncExternalStore } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
const subscribeHydration = () => () => {};
const hydratedSnapshot = () => true;
const serverSnapshot = () => false;
const buttonVariants = cva("btn", {
  variants: {
    variant: {
      default: "btn-primary",
      outline: "btn-outline",
      ghost: "btn-ghost",
      danger: "btn-danger",
    },
  },
  defaultVariants: { variant: "default" },
});
export function Button({
  className,
  variant,
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { loading?: boolean }) {
  const hydrated = useSyncExternalStore(subscribeHydration, hydratedSnapshot, serverSnapshot);
  return (
    <button
      className={cn(buttonVariants({ variant }), className)}
      {...props}
      disabled={!hydrated || loading || props.disabled}
    >
      {loading && <LoaderCircle size={17} className="spin" />}
      {children}
    </button>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content">
          <div className="modal-head">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>
                {description || "Bilgileri kontrol ederek işleminizi tamamlayın."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="icon-btn" aria-label="Kapat">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
const ToastContext = createContext<(message: string, error?: boolean) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; error: boolean }>>([]);
  const toast = useCallback((message: string, error = false) => {
    const id = Date.now();
    setToasts((old) => [...old, { id, message, error }]);
    setTimeout(() => setToasts((old) => old.filter((t) => t.id !== id)), 5000);
  }, []);
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div className={cn("toast", t.error && "toast-error")} key={t.id}>
            {t.error ? <AlertCircle size={19} /> : <Check size={19} />}
            <span>{t.message}</span>
            <button
              className="icon-btn"
              onClick={() => setToasts((old) => old.filter((x) => x.id !== t.id))}
              aria-label="Bildirimi kapat"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
export async function api<T = Record<string, unknown>>(
  path: string,
  data?: unknown,
  method = "POST",
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || "İşlem tamamlanamadı.");
  return value;
}
export function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Badge({ status, children }: { status?: string; children: ReactNode }) {
  return (
    <span className={cn("badge", status && `status-${status.toLowerCase()}`)}>{children}</span>
  );
}
