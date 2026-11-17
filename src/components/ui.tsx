"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { ImageOff, Minus, Plus, X } from "lucide-react";

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition disabled:opacity-40 ${variant === "primary" ? "bg-brand text-white hover:bg-brand-dark" : "border border-line bg-white text-ink hover:bg-paper"} ${className}`}
    >
      {children}
    </button>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      aria-describedby={titleId}
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
      className={`fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_32px)] overflow-y-auto rounded-3xl bg-white p-0 text-ink shadow-2xl ${wide ? "max-w-xl" : "max-w-md"}`}
    >
      <span className="sr-only" id={titleId}>
        {title}
      </span>
      <button
        autoFocus
        onClick={onClose}
        aria-label="ปิดหน้าต่าง"
        className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full border border-line bg-white/95 shadow-sm"
      >
        <X size={18} />
      </button>
      {children}
    </dialog>
  );
}
export function FoodImage({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-[#eeeadd] ${className}`}>
      {!loaded && !failed && (
        <div
          aria-label="กำลังโหลดรูปอาหาร"
          className="absolute inset-0 animate-pulse bg-[#e8e3d7]"
        />
      )}
      {failed ? (
        <div className="flex h-full min-h-28 flex-col items-center justify-center gap-2 p-3 text-center text-xs text-muted">
          <ImageOff size={24} />
          <span>ไม่สามารถโหลดรูปอาหาร</span>
          <button
            className="underline underline-offset-4"
            onClick={(e) => {
              e.preventDefault();
              setFailed(false);
              setLoaded(false);
            }}
          >
            ลองใหม่
          </button>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
export function Quantity({
  value,
  onChange,
  max = 99,
  min = 1,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
  min?: number;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={`จำนวน ${label}`}
      className="inline-flex items-center rounded-lg border border-line bg-white"
    >
      <button
        className="grid size-9 place-items-center disabled:opacity-30"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={`ลดจำนวน ${label}`}
      >
        <Minus size={13} />
      </button>
      <span
        className="min-w-5 text-center text-xs tabular-nums"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        className="grid size-9 place-items-center disabled:opacity-30"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`เพิ่มจำนวน ${label}`}
      >
        <Plus size={13} />
      </button>
    </div>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-5 grid size-20 place-items-center rounded-full bg-[#f6f0e5] text-[#b59e78]">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 max-w-64 text-xs leading-7 text-muted">
        {description}
      </p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
