const devices = [
  ["CCTV-004", "CCTV Gudang Barat", "Gudang", "92,67%", "54j 30m", "Gangguan berat", "orange"],
  ["CCTV-009", "CCTV Area Produksi 2", "Area Produksi", "96,84%", "23j 00m", "Perlu ditinjau", "yellow"],
  ["CCTV-002", "CCTV Lobby Utama", "Gedung Utama", "99,53%", "3j 30m", "Gangguan ringan", "yellow"],
  ["CCTV-007", "CCTV Parkir Selatan", "Area Parkir", "100%", "0j 00m", "Normal", "green"],
];

export default function DashboardPage() {
  return <div className="shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">◉</span><span>SUDUT CCTV<small>UPTIME MONITORING</small></span></div>
      <div className="nav-label">MENU UTAMA</div><nav className="nav"><a className="active" href="/dashboard">▦ &nbsp; Dashboard</a><a href="#input">▤ &nbsp; Input Bulanan</a><a href="#downtime">◷ &nbsp; Downtime</a><a href="#laporan">▱ &nbsp; Laporan</a></nav>
      <div className="nav-label">PENGELOLAAN</div><nav className="nav"><a href="#cctv">◉ &nbsp; Data CCTV</a><a href="#pengaturan">⚙ &nbsp; Pengaturan</a></nav>
      <div className="user"><strong>Administrator</strong><span>admin@sudutcctv.local</span></div>
    </aside>
    <main className="content"><header className="topbar"><div><h1>Dashboard Uptime CCTV</h1><p className="sub">Pantau ketersediaan CCTV dan tindak lanjut gangguan.</p></div><select className="period" defaultValue="2026-08"><option value="2026-08">Agustus 2026</option><option>Juli 2026</option></select></header>
      <section className="grid" aria-label="Ringkasan periode"><div className="card"><p className="card-title">CCTV AKTIF</p><div className="value">30</div><div className="hint">dari 32 perangkat terdaftar</div></div><div className="card"><p className="card-title">UPTIME KESELURUHAN</p><div className="value up">96,84%</div><div className="hint warn">↓ 1,25% dari bulan lalu</div></div><div className="card"><p className="card-title">TOTAL DOWNTIME</p><div className="value">127j 45m</div><div className="hint">dari 21.600 jam tersedia</div></div><div className="card"><p className="card-title">KELENGKAPAN DATA</p><div className="value">96,55%</div><div className="hint">840 dari 870 cell terisi</div></div></section>
      <div className="section"><h2>Perlu perhatian</h2><a className="link" href="#downtime">Lihat semua downtime →</a></div><section className="panel"><table><thead><tr><th>Device</th><th>Lokasi</th><th>Uptime</th><th>Downtime</th><th>Status</th><th>Penyebab dominan</th></tr></thead><tbody>{devices.map(([code,name,location,uptime,down,status,tone])=><tr key={code}><td><strong>{name}</strong><br/><span className="hint">{code}</span></td><td>{location}</td><td>{uptime}</td><td>{down}</td><td><span className={`badge ${tone}`}>● {status}</span></td><td>{tone === "orange" ? "Jaringan" : tone === "yellow" ? "Kamera / perangkat" : "—"}</td></tr>)}</tbody></table></section>
      <section className="two"><article className="panel insight"><h2>Kenapa uptime turun?</h2><p>Uptime <strong>Agustus 2026</strong> adalah <strong>96,84%</strong>, turun 1,25% dibanding bulan sebelumnya. <strong>CCTV Gudang Barat</strong> menyumbang downtime terbesar, yaitu 54 jam 30 menit atau 42,6% dari keseluruhan downtime. Gangguan <strong>jaringan</strong> menjadi penyebab dominan.</p><button className="action">Tinjau detail gangguan</button></article><article className="panel bars"><h2>Top downtime device</h2><div className="bar-row"><span>Gudang Barat</span><div className="bar"><i style={{width:"100%"}} /></div><b>54j 30m</b></div><div className="bar-row"><span>Produksi 2</span><div className="bar"><i style={{width:"42%"}} /></div><b>23j 00m</b></div><div className="bar-row"><span>Lobby Utama</span><div className="bar"><i style={{width:"9%"}} /></div><b>3j 30m</b></div></article></section>
    </main></div>;
}
