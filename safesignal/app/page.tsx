'use client'

import { useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useTideCloak } from '@tidecloak/nextjs'
import { useRouter } from 'next/navigation'
import { Icon, ICONS } from '@/lib/demo/icons'
import rawConfig from '../tidecloak.json'

// tidecloak.json stays "{}" until scripts/init-realm.sh provisions and licenses the realm
// (see docs/RUNBOOK.md). Until then the layout mounts no Tide provider and only the demo is offered.
const configured = Boolean((rawConfig as Record<string, unknown>).realm)

function TideLogin() {
  const { login, authenticated } = useTideCloak()
  const router = useRouter()

  const onLogin = useCallback(() => {
    login()
  }, [login])

  useEffect(() => {
    if (authenticated) {
      router.push('/home')
    }
  }, [authenticated])

  return <button className="secondary" onClick={onLogin}>Đăng nhập bằng Tide</button>
}

const STEPS = [
  { title: 'Báo cáo', body: 'Nhân viên ghi lại sự cố suýt xảy ra ngay khi còn nhớ rõ chi tiết.', icon: ICONS.pen },
  { title: 'Niêm phong', body: 'Nội dung được mã hóa ngay trên trình duyệt trước khi lưu. Nơi lưu trữ chỉ thấy bản mã.', icon: ICONS.lock },
  { title: 'Thẩm định', body: 'Chỉ người thẩm định độc lập mở được nội dung và theo dõi xử lý.', icon: ICONS.eye },
]

const FEATURES = [
  { title: 'Mã hóa tại trình duyệt', body: 'Mỗi báo cáo có khóa AES-256 riêng, được bọc bằng khóa của người thẩm định.', icon: ICONS.lock },
  { title: 'Phân quyền rõ ràng', body: 'Người báo cáo chỉ gửi được, người thẩm định chỉ đọc được, nhân viên khác không thấy gì.', icon: ICONS.users },
  { title: 'Thẩm định độc lập', body: 'Thiết kế cho TideCloak: quyền thẩm định chỉ được cấp khi nhóm quản trị cùng phê duyệt.', icon: ICONS.shield },
  { title: 'Dữ liệu tối thiểu', body: 'Danh sách hồ sơ chỉ gồm mã, thời gian và trạng thái. Không lưu danh tính người báo cáo.', icon: ICONS.list },
]

export default function LandingPage() {
  return (
    <div className="landing">
      <nav className="reveal">
        <strong>Code Cơm</strong>
        <a href="#quy-trinh">Quy trình</a>
        <a href="#tinh-nang">Tính năng</a>
        <Link className="btn" href="/login">Đăng nhập</Link>
      </nav>

      <section className="land-hero">
        <div className="reveal d1">
          <p className="eyebrow">RMIT UNLOCKED 2026</p>
          <h1>
            Lên tiếng về sự cố suýt xảy ra, <span className="accent">an toàn</span>.
          </h1>
          <p className="lede">
            Code Cơm giúp nhân viên y tế chuyển báo cáo sự cố tới người thẩm định độc lập. Nội dung được niêm phong
            ngay trên thiết bị, chỉ đúng người mới mở được.
          </p>
          <div className="cta-row">
            <Link className="btn lg" href="/dashboard">
              Vào ứng dụng <Icon d={ICONS.arrow} />
            </Link>
            <a className="btn lg secondary" href="#quy-trinh">Xem quy trình</a>
            {configured && <TideLogin />}
          </div>
        </div>

        <div className="hero-art reveal d2" aria-hidden="true">
          <div className="art-card plain">
            <p className="art-tag">Báo cáo · Khoa 7</p>
            <p className="art-text">Hai hộp thuốc có nhãn gần giống hệt nhau được để cạnh nhau. Một đồng nghiệp suýt lấy nhầm…</p>
            <div className="art-lines"><span style={{ width: '92%' }} /><span style={{ width: '78%' }} /><span style={{ width: '64%' }} /></div>
          </div>
          <div className="art-lock"><Icon d={ICONS.lock} size={22} /></div>
          <div className="art-card sealed">
            <p className="art-tag sealed-tag">Đã niêm phong · AES-256-GCM</p>
            <p className="mono art-cipher">eyJrIjoiTjVtWkZhcVRxS0xnR0dNQ3VYb2RpUVd0b3BLSm9zN2ZQWkV4ZHB3cUtYb2Z1bmVtQkx2T2lYM2…</p>
          </div>
        </div>
      </section>

      <div className="trust reveal d3">
        <span><strong>AES-256</strong> mã hóa từng báo cáo</span>
        <span><strong>3</strong> vai trò tách biệt</span>
        <span><strong>0</strong> danh tính người báo cáo được lưu</span>
      </div>

      <section className="section" id="quy-trinh">
        <div className="section-head">
          <p className="eyebrow">Quy trình</p>
          <h2>Ba bước, từ lúc lên tiếng tới khi được xem xét.</h2>
        </div>
        <div className="steps-grid">
          {STEPS.map((s, i) => (
            <article key={s.title} className="card step-card">
              <span className="step-num">0{i + 1}</span>
              <span className="role-icon"><Icon d={s.icon} /></span>
              <h3>{s.title}</h3>
              <p className="muted">{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="tinh-nang">
        <div className="section-head">
          <p className="eyebrow">Tính năng</p>
          <h2>Bảo vệ người lên tiếng ngay từ thiết kế.</h2>
        </div>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <article key={f.title} className="card feature">
              <span className="role-icon"><Icon d={f.icon} /></span>
              <div>
                <h3>{f.title}</h3>
                <p className="muted">{f.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <div>
          <h2>Thử ngay luồng báo cáo và thẩm định.</h2>
          <p className="muted">Đổi vai trò trong ứng dụng để thấy mỗi người được làm gì.</p>
        </div>
        <Link className="btn lg" href="/dashboard">
          Vào ứng dụng <Icon d={ICONS.arrow} />
        </Link>
      </section>

      <footer className="land-foot">
        <span>© 2026 Code Cơm · Nguyên mẫu cho RMIT UNLOCKED 2026</span>
        <span>Chỉ dùng dữ liệu giả lập. Không thay thế quy trình báo cáo sự cố bắt buộc.</span>
      </footer>
    </div>
  )
}
