"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, DemoProvider, ROLES, useDemo } from "@/lib/demo/store";
import { Icon, ICONS } from "@/lib/demo/icons";

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

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (login(email, password)) router.push("/dashboard");
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
          <p className="eyebrow">SafeSignal Escalate</p>
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
            <h2>Đăng nhập</h2>
            <span className="chip demo">Demo</span>
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
          <button type="submit" className="auth-submit">Đăng nhập <Icon d={ICONS.arrow} /></button>

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
