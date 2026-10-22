"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { DemoProvider, ROLES, useDemo } from "@/lib/demo/store";
import { Icon, ICONS } from "@/lib/demo/icons";

const NAV = [
  { href: "/dashboard", label: "Tổng quan", icon: ICONS.grid },
  { href: "/dashboard/report", label: "Gửi báo cáo", icon: ICONS.pen },
  { href: "/dashboard/review", label: "Thẩm định", icon: ICONS.eye },
  { href: "/dashboard/admin", label: "Quản trị", icon: ICONS.shield },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DemoProvider>
      <Shell>{children}</Shell>
    </DemoProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, session, role, logout, cases } = useDemo();
  const current = NAV.find((n) => n.href === pathname) ?? NAV[0];
  const pending = cases.filter((c) => c.status === "REFERRED").length;

  useEffect(() => {
    if (ready && !session) router.replace("/login");
  }, [ready, session, router]);

  // Nothing renders until a signed-in session is known, so pages never flash another role's view.
  if (!ready || !session) return <div className="center-screen"><p className="muted">Đang tải…</p></div>;

  const signOut = () => { logout(); router.push("/login"); };

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand"><span className="brand-dot" />Code Cơm</Link>
        <nav className="side-nav" aria-label="Điều hướng chính">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`side-link${n.href === current.href ? " active" : ""}`}>
              <Icon d={n.icon} />
              {n.label}
              {n.href === "/dashboard/review" && role === "reviewer" && pending > 0 && <span className="count">{pending}</span>}
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <span className="avatar">{ROLES[role].initials}</span>
          <div>
            <strong>{ROLES[role].short}</strong>
            <span className="muted">{ROLES[role].cap}</span>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <h1 className="page-title">{current.label}</h1>
          <div className="topbar-actions">
            <span className="chip demo">Demo</span>
            <span className="user-chip">
              <span className="avatar sm">{ROLES[role].initials}</span>
              <span className="user-text">
                <strong>{ROLES[role].label}</strong>
                <span className="muted">{session.email}</span>
              </span>
            </span>
            <button className="secondary" onClick={signOut}>Đăng xuất</button>
          </div>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
