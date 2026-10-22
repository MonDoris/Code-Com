"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, DemoProvider, ROLES, useDemo } from "@/lib/demo/store";
import { Icon, ICONS } from "@/lib/demo/icons";
import { SIM_REALM } from "@/lib/demo/tidecloak-sim";

export default function LoginPage() {
  return (
    <DemoProvider>
      <LoginForm />
    </DemoProvider>
  );
}

function LoginForm() {
  const { ready, session, login } = useDemo();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && session) router.replace("/dashboard");
  }, [ready, session, router]);

  const [busy, setBusy] = useState(false);
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await login(email, password);
    setBusy(false);
    if (ok) router.push("/dashboard");
    else setError("Email hoặc mật khẩu không đúng.");
  };

  const pick = (account: string) => {
    setEmail(account); setPassword(DEMO_PASSWORD); setError("");
  };

  return (
    <div className="auth">
      <aside className="auth-aside reveal">
        <Link href="/" className="brand"><span className="brand-dot" />Code Cơm</Link>
        <div>
          <p className="eyebrow">Báo cáo sự cố y khoa</p>
          <h1>Chào mừng trở lại.</h1>
          <p className="lede">Đăng nhập để gửi báo cáo sự cố hoặc thẩm định các hồ sơ được chuyển tới bạn.</p>
        </div>
        <ul className="auth-points">
          <li><Icon d={ICONS.lock} /> Nội dung được mã hóa ngay trên trình duyệt</li>
          <li><Icon d={ICONS.users} /> Mỗi tài khoản chỉ thấy đúng phần việc của mình</li>
          <li><Icon d={ICONS.shield} /> Người thẩm định độc lập với khoa báo cáo</li>
        </ul>
      </aside>

      <main className="auth-main">
        <form className="card auth-card reveal d1" onSubmit={onSubmit}>
          <div className="panel-head">
            <div>
              <p className="eyebrow">TideCloak · realm {SIM_REALM}</p>
              <h2>Đăng nhập bằng Tide</h2>
            </div>
            <span className="chip demo">Mô phỏng</span>
          </div>
          <label className="field">
            <span>Email</span>
            <input type="email" autoComplete="username" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="ten@codecom.demo" required />
          </label>
          <label className="field">
            <span>Mật khẩu</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="••••••••" required />
          </label>
          {error && <p className="bad" role="alert">{error}</p>}
          <button type="submit" className="auth-submit" disabled={busy}>{busy ? "Đang xác thực…" : "Đăng nhập bằng Tide"} <Icon d={ICONS.arrow} /></button>
          <p className="muted form-note">
            Bản mô phỏng TideCloak: sau khi đăng nhập, realm cấp một access token có chữ ký (ES256) mang các vai trò của realm;
            mọi kiểm tra quyền trong ứng dụng đều xác minh token này.
          </p>

          <div className="demo-accounts">
            <p className="muted">Tài khoản demo · mật khẩu <code>{DEMO_PASSWORD}</code></p>
            {DEMO_ACCOUNTS.map((a) => (
              <button type="button" key={a.email} className={`account${email === a.email ? " selected" : ""}`} onClick={() => pick(a.email)}>
                <span className="avatar">{ROLES[a.role].initials}</span>
                <span className="account-text">
                  <strong>{ROLES[a.role].label}</strong>
                  <span className="muted">{a.email}</span>
                </span>
              </button>
            ))}
          </div>
        </form>
      </main>
    </div>
  );
}
