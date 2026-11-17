"use client";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  LogOut,
  UserRound,
} from "lucide-react";
import { useDemo } from "./demo-provider";
import { useCart } from "./cart-provider";
import { Button, EmptyState } from "./ui";
import {returnPath} from "@/lib/navigation";
import { phoneValid } from "@/lib/orders";
export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-xs font-medium">
      <span className="mb-2 block">{label}</span>
      <input
        {...props}
        className={`min-h-12 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-brand placeholder:text-muted/60 disabled:bg-paper ${props.className ?? ""}`}
      />
    </label>
  );
}
export function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <p
      role="alert"
      className="my-4 rounded-xl border border-red-100 bg-red-50 p-4 text-xs leading-6 text-red-700"
    >
      {message}
    </p>
  ) : null;
}
export function PrototypeNote() {
  return (
    <p className="mt-6 rounded-xl bg-paper p-4 text-[11px] leading-6 text-muted">
      ใช้บัญชีส่วนตัวของคุณ ระบบจัดเก็บรหัสผ่านแบบแฮชและตรวจสอบสิทธิ์ที่เซิร์ฟเวอร์
    </p>
  );
}
export function AccountGate({ children }: { children: ReactNode }) {
  const { ready, account } = useDemo();
  const router = useRouter();
  const pathname = usePathname();
  const loginPath = pathname.startsWith("/merchant") ? "/merchant/login/" : "/login/";
  const next = pathname + (typeof window !== "undefined" ? window.location.search : "");
  useEffect(() => { if(ready && !account)router.replace(loginPath); }, [ready,account,router,loginPath]);
  if (!ready || !account)
    return (
      <p role="status" className="py-12 text-center text-sm text-muted">
        กำลังโหลดบัญชี…
      </p>
    );
  return children;
}

export function AuthPage({ mode, merchant = false }: { mode: "login" | "register"; merchant?: boolean }) {
  const { login, register } = useDemo();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const target = merchant ? "/merchant/" : "/";
  return (
    <section className="mx-auto w-full max-w-md">
      <span className="mb-6 grid size-14 place-items-center rounded-2xl bg-peach text-brand">
        <UserRound size={26} />
      </span>
      <p className="mb-2 text-[10px] font-semibold tracking-[2px] text-brand">
        {merchant ? "IMJAI MERCHANT" : "สำหรับนักเรียนและครู"}
      </p>
      <h1 className="text-3xl font-bold">
        {merchant ? "เข้าสู่ระบบร้านอาหาร" : mode === "login" ? "ยินดีต้อนรับกลับ" : "เริ่มมื้อดี ๆ กับอิ่มใจ"}
      </h1>
      <p className="mt-3 text-xs leading-6 text-muted">
        {merchant ? "เข้าสู่ระบบเพื่อจัดการออเดอร์ เมนู และเวลารับอาหาร" : mode === "login"
          ? "เข้าสู่ระบบแล้วเริ่มเลือกอาหารจากหน้าแรกได้เลย"
          : "สมัครบัญชีผู้ใช้บริการสำหรับรับอาหารเองที่ร้าน"}
      </p>
      <ErrorNotice message={error} />
      <form
        className="mt-7 space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          const form = new FormData(e.currentTarget);
          const email = String(form.get("email")),
            password = String(form.get("password"));
          setError("");
          if (mode === "register" && password !== form.get("confirm")) {
            setError("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
            return;
          }
          const phone = String(form.get("phone") ?? "");
          if (mode === "register" && !phoneValid(phone)) {
            setError("เบอร์โทรต้องมี 9–10 หลัก และเริ่มต้นด้วย 0");
            return;
          }
          setBusy(true);
          try {
            if (mode === "register")
              await register(String(form.get("name")), email, phone, password);
            else await login(email, password);
            window.location.assign(target);
          } catch (ex) {
            setError((ex as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode === "register" && (
          <Field
            label="ชื่อผู้ใช้บริการ"
            name="name"
            required
            maxLength={80}
            autoComplete="name"
            placeholder="ชื่อ–นามสกุล"
          />
        )}
        <Field
          label="อีเมล"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
        {mode === "register" && (
          <Field
            label="เบอร์โทรติดต่อ"
            name="phone"
            type="tel"
            required
            inputMode="numeric"
            maxLength={10}
            autoComplete="tel"
            placeholder="0891234567"
          />
        )}
        <Field
          label="รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {mode === "register" && (
          <Field
            label="ยืนยันรหัสผ่าน"
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        )}
        {mode === "login" && (
          <div className="text-right">
            <Link className="text-xs text-brand" href="/forgot-password/">
              ลืมรหัสผ่าน?
            </Link>
          </div>
        )}
        <Button className="w-full" type="submit" disabled={busy}>
          {busy
            ? "กำลังดำเนินการ…"
            : mode === "login"
              ? "เข้าสู่ระบบ"
              : "สมัครสมาชิก"}
          <ArrowRight size={16} />
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-muted">
        {mode === "login" ? "ยังไม่มีบัญชี?" : "มีบัญชีแล้ว?"}{" "}
        <Link
          className="font-semibold text-brand"
          href={`${mode === "login" ? "/register/" : "/login/"}?next=${encodeURIComponent(target)}`}
        >
          {mode === "login" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
        </Link>
      </p>
    </section>
  );
}
export function ProfilePageContent() {
  const {
    account,
    updateProfile,
    logout,
    changePassword,
    timeoutMinutes,
    setTimeoutMinutes,
  } = useDemo();
  const { notify } = useCart();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [passwordOpen, setPasswordOpen] = useState(false);
  return (
    <AccountGate>
      {account && (
        <div className="mx-auto max-w-2xl">
          <p className="mb-2 text-[10px] font-semibold tracking-[2px] text-brand">
            MY ACCOUNT
          </p>
          <h1 className="text-3xl font-bold">โปรไฟล์ของฉัน</h1>
          <p className="mt-2 text-xs text-muted">
            ข้อมูลติดต่อสำหรับมื้ออร่อยของคุณ
          </p>
          <ErrorNotice message={error} />
          <form
            key={account.id}
            className="mt-7 space-y-5 rounded-2xl border border-line bg-white p-6"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget),
                phone = String(form.get("phone"));
              setError("");
              if (!phoneValid(phone)) {
                setError("กรุณากรอกเบอร์โทรที่ถูกต้อง 9–10 หลัก");
                return;
              }
              try {
                updateProfile(String(form.get("name")), phone);
                notify("บันทึกโปรไฟล์แล้ว");
              } catch (ex) {
                setError((ex as Error).message);
              }
            }}
          >
            <Field
              label="ชื่อผู้ใช้บริการ"
              name="name"
              defaultValue={account.name}
              required
              maxLength={80}
            />
            <Field
              label="เบอร์โทรติดต่อ"
              name="phone"
              type="tel"
              defaultValue={account.phone}
              maxLength={10}
              required
            />
            <Field label="อีเมล" value={account.email} disabled />
            <Button type="submit">บันทึกข้อมูล</Button>
          </form>
          <div className="mt-5 rounded-2xl border border-line bg-white p-6">
            <button
              className="flex w-full items-center justify-between text-sm font-semibold"
              aria-expanded={passwordOpen}
              onClick={() => setPasswordOpen(!passwordOpen)}
            >
              <span className="flex items-center gap-2">
                <LockKeyhole size={16} />
                เปลี่ยนรหัสผ่าน
              </span>
              <span>{passwordOpen ? "−" : "+"}</span>
            </button>
            {passwordOpen && (
              <form
                className="mt-5 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const element = e.currentTarget,
                    form = new FormData(element);
                  setError("");
                  if (form.get("new") !== form.get("confirm")) {
                    setError("ยืนยันรหัสผ่านใหม่ไม่ตรงกัน");
                    return;
                  }
                  setBusy(true);
                  try {
                    await changePassword(
                      String(form.get("current")),
                      String(form.get("new")),
                    );
                    notify("เปลี่ยนรหัสผ่านทดลองแล้ว");
                    element.reset();
                    setPasswordOpen(false);
                  } catch (ex) {
                    setError((ex as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Field
                  label="รหัสผ่านปัจจุบัน"
                  name="current"
                  type="password"
                  required
                  autoComplete="current-password"
                />
                <Field
                  label="รหัสผ่านใหม่"
                  name="new"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <Field
                  label="ยืนยันรหัสผ่านใหม่"
                  name="confirm"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <Button disabled={busy}>
                  {busy ? "กำลังบันทึก…" : "เปลี่ยนรหัสผ่าน"}
                </Button>
              </form>
            )}
          </div>

          <button
            className="mt-7 flex min-h-11 items-center gap-2 text-xs text-red-600"
            onClick={() => {
              logout();
              notify("ออกจากระบบแล้ว");
            }}
          >
            <LogOut size={16} />
            ออกจากระบบ
          </button>
          <PrototypeNote />
        </div>
      )}
    </AccountGate>
  );
}
export function ForgotPassword() {
  const { requestReset } = useDemo();
  const [result, setResult] = useState<{ token: string | null } | null>(null),
    [error, setError] = useState("");
  return (
    <section className="mx-auto max-w-md rounded-2xl border border-line bg-white p-7">
      <h1 className="text-2xl font-bold">ลืมรหัสผ่าน</h1>
      <p className="mt-3 text-xs leading-6 text-muted">
        กรุณาติดต่อผู้ดูแลเพื่อตั้งรหัสผ่านใหม่ ขณะนี้ยังไม่มีระบบส่งอีเมลรีเซ็ต
      </p>
      <ErrorNotice message={error} />
      <form
        className="mt-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          try {
            setResult({
              token: requestReset(
                String(new FormData(e.currentTarget).get("email")),
              ),
            });
          } catch (ex) {
            setError((ex as Error).message);
          }
        }}
      >
        <Field label="อีเมล" name="email" type="email" required />
        <Button className="w-full">ตรวจสอบการกู้คืนบัญชี</Button>
      </form>
      {result && (
        <div
          role="status"
          className="mt-5 rounded-xl bg-sage-light p-4 text-xs leading-6 text-sage"
        >
          ไม่มีการส่งอีเมลจริงในต้นแบบ
          {result.token ? (
            <>
              <p>ลิงก์ทดลองใช้ได้ 15 นาที และใช้ได้ครั้งเดียวในแท็บนี้</p>
              <Link
                className="mt-3 inline-block font-semibold underline"
                href={`/reset-password/?token=${encodeURIComponent(result.token)}`}
              >
                เปิดหน้าตั้งรหัสผ่านใหม่ →
              </Link>
            </>
          ) : (
            <p>
              ไม่พบบัญชีทดลองนี้
              กรุณาสมัครสมาชิกหรือใช้อีเมลที่เคยสมัครในเครื่องนี้
            </p>
          )}
        </div>
      )}
      <Link
        className="mt-6 inline-flex items-center gap-2 text-xs text-brand"
        href="/login/"
      >
        <ArrowLeft size={14} />
        กลับเข้าสู่ระบบ
      </Link>
      <PrototypeNote />
    </section>
  );
}
export function ResetPassword() {
  const { resetPassword } = useDemo(),
    search = useSearchParams();
  const [done, setDone] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="mx-auto max-w-md rounded-2xl border border-line bg-white p-7">
      <h1 className="text-2xl font-bold">ตั้งรหัสผ่านใหม่</h1>
      <ErrorNotice message={error} />
      {done ? (
        <div role="status" className="mt-5 space-y-5 text-sm">
          <CheckCircle2 className="text-sage" />
          <p>บันทึกรหัสผ่านทดลองใหม่แล้ว</p>
          <Link
            className="inline-block rounded-xl bg-brand px-5 py-3 text-white"
            href="/login/"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      ) : (
        <form
          className="mt-6 space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setError("");
            if (form.get("password") !== form.get("confirm")) {
              setError("ยืนยันรหัสผ่านไม่ตรงกัน");
              return;
            }
            setBusy(true);
            try {
              await resetPassword(
                search.get("token") || "",
                String(form.get("password")),
              );
              setDone(true);
            } catch (ex) {
              setError((ex as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field
            label="รหัสผ่านใหม่"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <Field
            label="ยืนยันรหัสผ่านใหม่"
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <Button className="w-full" disabled={busy}>
            {busy ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}
          </Button>
          <Link className="block text-xs text-brand" href="/forgot-password/">
            ขอลิงก์ทดลองใหม่
          </Link>
        </form>
      )}
      <PrototypeNote />
    </section>
  );
}
