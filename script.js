const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbxULMqYGSLb58eVXLsBcrJ8FRNcifPmiJdxQdqEPbi8mg-BnlGU13ApRwGVBQSC2tSH/exec";

let SCHOOL_LAT = -6.200000; 
let SCHOOL_LNG = 106.816666;
let MAX_RADIUS_METERS = 50; 
let WAKTU_MULAI = "00:00";
let WAKTU_SELESAI = "23:59";

let masterSiswaList = [];
let rekapSiswaHasil = [];

const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('current-date').innerText = new Date().toLocaleDateString('id-ID', options);

const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
document.getElementById('tanggal').value = `${year}-${month}-${day}`;

document.getElementById('tanggal').addEventListener('change', filterDataAbsensi);

// ==========================================
// PENANGANAN STATUS LOGIN (SESSION)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    // Mengecek apakah sudah login menggunakan token rahasia
    if (!sessionStorage.getItem('_admin_auth_token')) {
        document.getElementById('login-wrapper').style.display = 'flex';
    } else {
        document.getElementById('login-wrapper').style.display = 'none';
        inisialisasiAplikasiAdmin();
    }
});

function prosesLogin() {
    // 1. CEK KONEKSI INTERNET DULU
    if (!navigator.onLine) {
        Swal.fire('Tidak Ada Internet', 'Pastikan komputer atau perangkat Anda terhubung ke WiFi atau jaringan seluler.', 'error');
        return;
    }

    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    
    if (!user || !pass) {
        Swal.fire('Peringatan', 'Username dan Password wajib diisi!', 'warning');
        return;
    }

    const btn = document.getElementById('btn-login');
    const origText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memeriksa...';

    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "login", username: user, password: pass })
    })
    .then(res => res.json())

.then(response => {
        if (response.result === 'success') {
            // Simpan token acak sebagai penanda login
            sessionStorage.setItem('_admin_auth_token', 'tkn_' + Math.random().toString(36).substr(2, 9));
            document.getElementById('login-wrapper').style.display = 'none';
            Swal.fire({ title: 'Berhasil', text: 'Selamat datang di Panel Admin', icon: 'success', timer: 1500, showConfirmButton: false });
            inisialisasiAplikasiAdmin();
} else {
            // PAKSA LEPAS FOKUS SECARA SPESIFIK
            document.getElementById('login-username').blur();
            document.getElementById('login-password').blur();
            document.getElementById('btn-login').blur();
            
            // 2. NOTIF JIKA USERNAME/PASSWORD SALAH
            Swal.fire({
                title: 'Gagal Login',
                text: 'Username atau Password yang Anda masukkan tidak cocok dengan database!',
                icon: 'error',
                returnFocus: false, // Mencegah SweetAlert berebut fokus
                didClose: () => {
                    // didClose menjamin baris ini HANYA dieksekusi 
                    // SETELAH pop-up hilang 100% dari layar
                    document.getElementById('login-password').value = '';
                    document.getElementById('login-password').focus();
                }
            });
        }
    })

    .catch(err => {
        // 3. JIKA KONEKSI TERPUTUS SAAT LOADING / SERVER GAGAL
        Swal.fire('Koneksi Terputus', 'Gagal menghubungi server database Google Sheets. Periksa stabilitas internet Anda.', 'error');
    })
    .finally(() => { 
        btn.disabled = false; 
        btn.innerHTML = origText; 
    });
}

function logoutAdmin() {
    Swal.fire({
        title: 'Keluar?',
        text: "Sesi Anda akan diakhiri dan akan kembali ke layar login.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Keluar',
        cancelButtonText: 'Batal'
}).then((result) => {
        if (result.isConfirmed) {
            sessionStorage.removeItem('_admin_auth_token');
            location.reload(); // Refresh halaman akan otomatis kembali ke form login
        }
    });
}

function inisialisasiAplikasiAdmin() {
    muatPengaturanLokasi(); 
    muatMasterDataDariDatabase();
    muatLaporanHariIni(); 

    // FITUR REAL-TIME: Perbarui laporan presensi secara otomatis setiap 60 detik
    setInterval(() => {
        if (!document.hidden) {
            muatLaporanHariIni(true); 
        }
    }, 60000);
}


// ==========================================
// KONTROL NAVIGASI MENU & AKORDEON
// ==========================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar) return;
    const isOpen = sidebar.classList.contains('active');
    if (!isOpen) {
        sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
        history.pushState({ sidebarOpen: true }, '');
    } else {
        closeSidebarUI();
        if (history.state && history.state.sidebarOpen) history.back();
    }
}

function closeSidebarUI() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

window.addEventListener('popstate', function (event) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) closeSidebarUI();
});

function switchTab(pageId, element) {
    document.querySelectorAll('.page-section').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));

    const targetPage = document.getElementById(pageId);
    if(targetPage) targetPage.classList.add('active');
    if (element) element.classList.add('active');

    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        closeSidebarUI();
        if (history.state && history.state.sidebarOpen) history.back();
    }
}

function toggleRincianKelas() {
    const content = document.getElementById('rincian-content');
    const icon = document.getElementById('icon-rincian');
    if (!content || !icon) return;
    
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        icon.classList.add('open');
    } else {
        content.style.display = 'none';
        icon.classList.remove('open');
    }
}

// ==========================================
// PENGATURAN KOORDINAT LOKASI & JAM ABSENSI
// ==========================================
function muatPengaturanLokasi() {
    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "get_pengaturan" })
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === 'success') {
            SCHOOL_LAT = response.data.lat;
            SCHOOL_LNG = response.data.lng;
            MAX_RADIUS_METERS = response.data.radius || 50;

            // PERBAIKAN WAKTU: Tambahkan angka 0 di depan jika jam hanya 1 digit
            let wMulai = String(response.data.waktu_mulai || "00:00").trim();
            let wSelesai = String(response.data.waktu_selesai || "23:59").trim();

            if (wMulai.indexOf(':') === 1) wMulai = "0" + wMulai;
            if (wSelesai.indexOf(':') === 1) wSelesai = "0" + wSelesai;

            WAKTU_MULAI = wMulai.substring(0, 5);
            WAKTU_SELESAI = wSelesai.substring(0, 5);

            const latEl = document.getElementById('set-lat');
            const lngEl = document.getElementById('set-lng');
            const radiusEl = document.getElementById('set-radius');
            const mulaiEl = document.getElementById('set-waktu-mulai');
            const selesaiEl = document.getElementById('set-waktu-selesai');
            
            if(latEl) latEl.value = SCHOOL_LAT;
            if(lngEl) lngEl.value = SCHOOL_LNG;
            if(radiusEl) radiusEl.value = MAX_RADIUS_METERS;
            if(mulaiEl) mulaiEl.value = WAKTU_MULAI;
            if(selesaiEl) selesaiEl.value = WAKTU_SELESAI;
        }
    })
    .catch(err => console.error("Gagal memuat pengaturan lokasi", err));
}

function simpanPengaturanLokasi() {
    const latEl = document.getElementById('set-lat');
    const lngEl = document.getElementById('set-lng');
    const radiusEl = document.getElementById('set-radius');
    const mulaiEl = document.getElementById('set-waktu-mulai');
    const selesaiEl = document.getElementById('set-waktu-selesai');
    
    if (!latEl || !lngEl || !radiusEl || !mulaiEl || !selesaiEl) return;

    const lat = parseFloat(latEl.value);
    const lng = parseFloat(lngEl.value);
    const radius = parseInt(radiusEl.value);
    const waktuMulai = mulaiEl.value;
    const waktuSelesai = selesaiEl.value;

    if (isNaN(lat) || isNaN(lng) || isNaN(radius) || !waktuMulai || !waktuSelesai) {
        Swal.fire('Peringatan', 'Harap isi semua kolom pengaturan dengan valid.', 'warning');
        return;
    }

    SCHOOL_LAT = lat;
    SCHOOL_LNG = lng;
    MAX_RADIUS_METERS = radius;
    WAKTU_MULAI = waktuMulai;
    WAKTU_SELESAI = waktuSelesai;

    const btn = document.querySelector('#pengaturan-page .btn-primary');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

    Swal.fire({
        title: 'Menyimpan Pengaturan...',
        text: 'Mohon tunggu, jangan tutup halaman ini.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "simpan_pengaturan", lat: lat, lng: lng, radius: radius, waktu_mulai: waktuMulai, waktu_selesai: waktuSelesai })
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === 'success') {
            Swal.fire('Tersimpan', 'Pengaturan berhasil disimpan ke Database.', 'success');
        } else {
            Swal.fire('Gagal!', response.message, 'error');
        }
    })
    .catch(err => Swal.fire('Error', 'Gagal menyimpan pengaturan ke database.', 'error'))
    .finally(() => { btn.disabled = false; btn.innerHTML = originalText; });
}

function autoFillLokasiSekolah() {
    if (!navigator.geolocation) {
        Swal.fire('Error', 'Browser tidak mendukung GPS.', 'error');
        return;
    }
    
    Swal.fire({
        title: 'Mendeteksi Lokasi...',
        text: 'Mohon tunggu, pastikan GPS Anda aktif.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const latEl = document.getElementById('set-lat');
            const lngEl = document.getElementById('set-lng');
            if(latEl) latEl.value = position.coords.latitude.toFixed(6);
            if(lngEl) lngEl.value = position.coords.longitude.toFixed(6);
            Swal.close();
            Swal.fire('Berhasil', 'Lokasi saat ini berhasil ditarik. Jangan lupa klik "Simpan Pengaturan".', 'info');
        },
        (error) => {
            Swal.close();
            Swal.fire('Gagal', 'Tidak dapat mengambil lokasi. Pastikan izin lokasi (GPS) diaktifkan pada perangkat.', 'error');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// ==========================================
// DATA MASTER SISWA & FILE IMPORT MODERN
// ==========================================
function muatMasterDataDariDatabase() {
    const tbody = document.querySelector('#master-table tbody');
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Sedang menghubungkan & memuat data...</p></div></td></tr>`;

    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "get_master" })
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === 'success' && response.data && response.data.length > 0) {
            masterSiswaList = response.data;
            document.getElementById('db-status-info').innerHTML = `<span style="color: var(--success); font-weight:700;"><i class="fa-solid fa-circle-check"></i> Terhubung!</span> Berhasil memuat ${masterSiswaList.length} data.`;
            updateDashboardUI();
            tampilkanMasterTabel(masterSiswaList);
            updateDropdownKelas();
        } else {
            document.getElementById('db-status-info').innerText = "Belum ada master data siswa. Silakan upload file Excel.";
            tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-file-excel"></i><p>Database kosong. Silakan upload file Excel.</p></div></td></tr>`;
            updateDashboardUI();
            updateDropdownKelas();
        }
    })
    .catch(err => {
        document.getElementById('db-status-info').innerHTML = `<span style="color: var(--danger); font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Gagal Terhubung!</span> Periksa koneksi internet Anda.`;
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p style="color:var(--danger)">Gagal memuat data dari Sheets.</p></div></td></tr>`;
        updateDashboardUI();
    });
}

function simpanMasterSiswa() {
    if (masterSiswaList.length === 0) { Swal.fire('Peringatan', 'Impor file Excel siswa terlebih dahulu!', 'warning'); return; }
    const btn = document.querySelector('#master-page .btn-primary');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

    Swal.fire({
        title: 'Menyimpan Master Data...',
        text: 'Mohon tunggu, jangan tutup halaman ini.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "simpan_master", data: masterSiswaList })
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === 'success') Swal.fire('Berhasil!', `Master data berhasil disimpan.`, 'success');
        else Swal.fire('Gagal!', response.message, 'error');
    })
    .catch(err => Swal.fire('Error', 'Gagal menyimpan. Periksa koneksi.', 'error'))
    .finally(() => { btn.disabled = false; btn.innerHTML = originalText; });
}

function updateDashboardUI() {
    const container = document.getElementById('class-cards-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (masterSiswaList.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1;"><p style="color: var(--text-muted);">Belum ada data siswa.</p></div>';
        document.getElementById('stat-total-siswa').innerText = 0;
        document.getElementById('stat-total-kelas').innerText = 0;
        document.getElementById('stat-total-l').innerText = 0;
        document.getElementById('stat-total-p').innerText = 0;
        return;
    }
    const classMap = {}; let totalL = 0, totalP = 0;
    masterSiswaList.forEach(s => {
        const k = s.kelas || "Tanpa Kelas";
        if (!classMap[k]) classMap[k] = { total: 0, l: 0, p: 0 };
        classMap[k].total++;
        const jkVal = (s.jk || "").toString().trim().toUpperCase();
        if (jkVal === "L" || jkVal === "LAKI-LAKI" || jkVal === "LAKI LAKI") { classMap[k].l++; totalL++; }
        else if (jkVal === "P" || jkVal === "PEREMPUAN") { classMap[k].p++; totalP++; }
    });
    const classNames = Object.keys(classMap).sort();
    document.getElementById('stat-total-siswa').innerText = masterSiswaList.length;
    document.getElementById('stat-total-kelas').innerText = classNames.length;
    document.getElementById('stat-total-l').innerText = totalL;
    document.getElementById('stat-total-p').innerText = totalP;

    classNames.forEach(namaKelas => {
        const info = classMap[namaKelas];
        const card = document.createElement('div');
        card.className = 'class-card';
        card.innerHTML = `<div class="class-card-header"><span class="class-card-title"><i class="fa-solid fa-graduation-cap" style="color: var(--primary);"></i> ${namaKelas}</span><span class="class-card-total">${info.total} <small style="font-size:0.75rem; font-weight:normal; color:var(--text-muted);">Siswa</small></span></div><div class="class-gender-stats"><div class="gender-badge badge-l">L: ${info.l}</div><div class="gender-badge badge-p">P: ${info.p}</div></div>`;
        container.appendChild(card);
    });
}

function tampilkanMasterTabel(data) {
    const tbody = document.querySelector('#master-table tbody');
    tbody.innerHTML = '';
    data.forEach((siswa, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${index + 1}</strong></td><td><code>${siswa.nis}</code></td><td><strong>${siswa.nama}</strong></td><td><span class="chip" style="display:inline-block; padding:4px 10px; border-radius:6px; background:var(--bg-main); border:1px solid var(--border); font-size:0.8rem; font-weight:600;">${siswa.kelas}</span></td><td><strong>${siswa.jk || '-'}</strong></td>`;
        tbody.appendChild(tr);
    });
}

function updateDropdownKelas() {
    const selectKelas = document.getElementById('kelas');
    const selectRekapKelas = document.getElementById('rekap-kelas');
    selectKelas.innerHTML = '<option value="">-- Pilih Kelas / Rombel --</option>';
    selectRekapKelas.innerHTML = '<option value="">-- Pilih Kelas / Rombel --</option>';
    const daftarKelas = [...new Set(masterSiswaList.map(s => s.kelas))].sort();
    if (daftarKelas.length === 0) {
        selectKelas.innerHTML = '<option value="">-- Belum Ada Data Kelas --</option>';
        selectRekapKelas.innerHTML = '<option value="">-- Belum Ada Data Kelas --</option>';
    } else {
        daftarKelas.forEach(k => {
            selectKelas.appendChild(new Option(k, k));
            selectRekapKelas.appendChild(new Option(k, k));
        });
    }
    selectKelas.value = "";
    filterDataAbsensi();
}

document.getElementById('excel-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const fileNameDisplay = document.getElementById('file-name-display');
    
    if (!file) {
        if (fileNameDisplay) fileNameDisplay.innerText = "Belum ada file terpilih...";
        return;
    }
    if (fileNameDisplay) fileNameDisplay.innerText = file.name;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        let siswaBaruDitambahkan = 0, siswaDiperbarui = 0;

        rawData.forEach(item => {
            const nis = String(item.NIS || item.nis || item.Nis || item.NISN || '-').trim();
            const nama = String(item.Nama || item.nama || item.NAMA || '-').trim();
            const kelas = String(item.Kelas || item.kelas || item.KELAS || item.Rombel || 'Tanpa Kelas').trim();
            const jk = String(item.JK || item.jk || item.Jk || item['Jenis Kelamin'] || item['JENIS KELAMIN'] || '-').trim();
            if (nis === '-' || nis === '') return;
            const indexSiswa = masterSiswaList.findIndex(s => String(s.nis) === nis);
            if (indexSiswa === -1) {
                masterSiswaList.push({ nis, nama, kelas, jk });
                siswaBaruDitambahkan++;
            } else {
                masterSiswaList[indexSiswa].nama = nama;
                masterSiswaList[indexSiswa].kelas = kelas;
                masterSiswaList[indexSiswa].jk = jk;
                siswaDiperbarui++;
            }
        });
        if (siswaBaruDitambahkan > 0) Swal.fire({ title: 'Impor Berhasil', html: `Menambahkan <b>${siswaBaruDitambahkan}</b> siswa baru.<br>Data lama tidak digandakan.`, icon: 'success' });
        else Swal.fire({ title: 'Tidak Ada Siswa Baru', html: `Semua NIS sudah ada.<br><b>${siswaDiperbarui}</b> disinkronkan.`, icon: 'info' });
        
        updateDashboardUI();
        tampilkanMasterTabel(masterSiswaList);
        updateDropdownKelas();
        
        document.getElementById('excel-file').value = '';
        if (fileNameDisplay) fileNameDisplay.innerText = "Belum ada file terpilih...";
    };
    reader.readAsArrayBuffer(file);
});

function downloadTemplateExcel() {
    const dataSiswa = []; let count = 0, kelasCurrent = 1;
    for (let i = 1; i <= 100; i++) {
        dataSiswa.push({ "NIS": "2026" + String(i).padStart(3, '0'), "Nama": `Siswa ${i}`, "Kelas": `Kelas ${kelasCurrent} A`, "JK": (i % 2 === 0) ? "L" : "P" });
        count++; if (count >= 17 && kelasCurrent < 6) { kelasCurrent++; count = 0; }
    }
    const ws = XLSX.utils.json_to_sheet(dataSiswa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master_Siswa");
    XLSX.writeFile(wb, "Template_Master_Siswa.xlsx");
}

// ==========================================
// PRESENSI & PEMBATASAN JAM
// ==========================================
function filterDataAbsensi() {
    const kelasTerpilih = document.getElementById('kelas').value;
    const tanggalTerpilih = document.getElementById('tanggal').value;
    const tbody = document.querySelector('#attendance-table tbody');
    tbody.innerHTML = '';
    
    if (!kelasTerpilih) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="fa-solid fa-chalkboard-user" style="font-size: 2.8rem; color: var(--primary);"></i><p>Silakan Pilih Kelas / Rombel Anda</p></div></td></tr>`;
        return;
    }

    const siswaKelas = masterSiswaList.filter(s => s.kelas === kelasTerpilih);
    if (siswaKelas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><p>Tidak ada siswa di kelas ini.</p></div></td></tr>`;
        return;
    }

    // Tampilkan loading saat menarik data lama
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; color:var(--primary); margin-bottom:10px;"></i><p>Mengecek riwayat absensi tanggal ini...</p></div></td></tr>`;

    // Tarik data dari server untuk mengecek apakah sudah diabsen
    const parts = tanggalTerpilih.split("-");
    
    fetch(URL_WEB_APP, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "get_rekap", kelas: kelasTerpilih, bulan: parts[1], tahun: parts[0] })
    })
    .then(res => res.json())
    .then(response => {
        tbody.innerHTML = ''; 
        
        let dataHariIni = [];
        if (response.result === 'success') {
            dataHariIni = response.data.filter(d => d.tanggal === tanggalTerpilih);
        }

        siswaKelas.forEach((siswa, index) => {
            // Cek apakah siswa ini sudah punya status sebelumnya (jika belum, default Hadir)
            let statusTersimpan = "Hadir";
            const savedItem = dataHariIni.find(d => String(d.nis) === String(siswa.nis));
            if (savedItem) {
                statusTersimpan = savedItem.status;
            }

           const tr = document.createElement('tr');
            tr.onclick = function() { document.querySelectorAll('#attendance-table tbody tr').forEach(r => r.classList.remove('selected-row')); tr.classList.add('selected-row'); };
            tr.innerHTML = `<td><strong>${index + 1}</strong></td><td><code>${siswa.nis}</code></td><td><strong>${siswa.nama}</strong></td>
                <td><select class="status-select" name="status_${index}" data-nis="${siswa.nis}" data-nama="${siswa.nama}" onfocus="this.closest('tr').click()" onchange="updateWarnaStatus(this)">
		   
                    <option value="Hadir" ${statusTersimpan==='Hadir'?'selected':''}>Hadir</option>
                    <option value="Sakit" ${statusTersimpan==='Sakit'?'selected':''}>Sakit</option>
                    <option value="Izin" ${statusTersimpan==='Izin'?'selected':''}>Izin</option>
                    <option value="Alpa" ${statusTersimpan==='Alpa'?'selected':''}>Alpa</option>
                </select></td>`;
            tbody.appendChild(tr);
            
            // Set warna box dropdown otomatis sesuai statusnya
            updateWarnaStatus(tr.querySelector('select'));
        });

        // Ganti warna & teks tombol jika ternyata Mode Edit
        const btnSimpan = document.querySelector('#absensi-page .btn-primary');
        if (dataHariIni.length > 0) {
            Swal.fire({title: 'Mode Edit Aktif', text: 'Presensi kelas ini sudah diisi. Anda dapat mengoreksi data yang salah lalu klik Perbarui.', icon: 'info', toast: true, position: 'top-end', showConfirmButton: false, timer: 4500});
            btnSimpan.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Perbarui Data Presensi';
            btnSimpan.style.backgroundColor = '#f59e0b'; // Ubah tombol jadi Oranye agar jelas
        } else {
            btnSimpan.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Presensi Ke Database';
            btnSimpan.style.backgroundColor = 'var(--primary)'; // Kembalikan ke warna default (Biru)
        }
    })
    .catch(err => {
        // Jika internet lambat/gagal, kembalikan tampilan tabel menjadi kosong
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><p style="color:var(--danger)">Gagal terhubung ke database. Silakan Refresh.</p></div></td></tr>`;
    });
}

async function simpanAbsensi() {
    const kelas = document.getElementById('kelas').value;
    const tanggal = document.getElementById('tanggal').value;
    const barisSiswa = document.querySelectorAll('#attendance-table tbody tr');

    if (!kelas || barisSiswa.length === 0 || barisSiswa[0].querySelector('.empty-state')) { 
        Swal.fire('Peringatan', 'Pilih kelas terlebih dahulu!', 'warning'); 
        return; 
    }

    // CEK WAKTU REAL-TIME DARI SERVER INTERNET
    let now = new Date();
    try {
        const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Jakarta');
        if (res.ok) {
            const data = await res.json();
            now = new Date(data.datetime);
        }
    } catch (e) {
        console.warn("Gagal mengecek waktu online, menggunakan jam lokal perangkat.");
    }

    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHours}:${currentMinutes}`;

    if (currentTime < WAKTU_MULAI || currentTime > WAKTU_SELESAI) {
        Swal.fire({
            title: 'Waktu Absensi Ditolak',
            text: `Waktu server menunjukkan jam ${currentTime}. Presensi hanya diizinkan antara pukul ${WAKTU_MULAI} sampai ${WAKTU_SELESAI}.`,
            icon: 'error',
            confirmButtonColor: '#d33'
        });
        return;
    }

    // Mengecek apakah browser mendukung GPS
	
	
	
    if (!navigator.geolocation) {
        Swal.fire('Error', 'Browser tidak mendukung pendeteksian lokasi (GPS).', 'error');
        return;
    }

    const btn = document.querySelector('#absensi-page .btn-primary');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memeriksa Lokasi...';

    Swal.fire({
        title: 'Mendeteksi Lokasi...',
        text: 'Mohon tunggu, pastikan GPS Anda aktif.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    // Mengambil lokasi pengguna saat ini
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            // Hitung jarak pengguna ke koordinat sekolah
            const jarakMeter = hitungJarak(userLat, userLng, SCHOOL_LAT, SCHOOL_LNG);

            // Validasi Radius
            if (jarakMeter > MAX_RADIUS_METERS) {
                Swal.fire({
                    title: 'Di Luar Radius!',
                    text: `Jarak Anda ${Math.round(jarakMeter)} meter dari sekolah. Batas maksimal adalah ${MAX_RADIUS_METERS} meter. Silakan mendekat ke area sekolah.`,
                    icon: 'error',
                    confirmButtonColor: '#d33'
                });
                btn.disabled = false;
                btn.innerHTML = originalText;
                return;
            }

            // Jika lokasi sesuai, kumpulkan data dan simpan
let hasilAbsensi = [];
    barisSiswa.forEach((tr, index) => {
        const selectElement = tr.querySelector(`select[name="status_${index}"]`);
        hasilAbsensi.push({ 
            nis: selectElement.getAttribute('data-nis'), 
            nama: selectElement.getAttribute('data-nama'), 
            status: selectElement.value 
        });
    });

            const koordinatTersimpan = userLat.toFixed(6) + ", " + userLng.toFixed(6);
            const payload = { action: "simpan_absensi", kelas, tanggal, koordinat: koordinatTersimpan, data: hasilAbsensi };

            Swal.fire({
                title: 'Menyimpan Presensi...',
                text: 'Mohon tunggu, jangan tutup halaman ini.',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            fetch(URL_WEB_APP, {
                method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            }).then(res => res.json()).then(response => {
                if (response.result === 'success') {
                    Swal.fire('Berhasil!', `Presensi ${kelas} berhasil disimpan. (Jarak: ${Math.round(jarakMeter)}m)`, 'success');
                    muatLaporanHariIni(true);
                } else {
                    Swal.fire('Gagal!', response.message, 'error');
                }
            }).catch(err => Swal.fire('Error', 'Gagal menyimpan.', 'error'))
            .finally(() => { btn.disabled = false; btn.innerHTML = originalText; });
        },
        (error) => {
            Swal.fire('Gagal Mendapatkan Lokasi', 'Pastikan izin lokasi (GPS) pada browser/HP diaktifkan untuk situs ini.', 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// ==========================================
// REKAP & LAPORAN HARIAN
// ==========================================
function muatLaporanHariIni(isSilent = false) {
    if (!isSilent) {
        document.getElementById('today-summary-container').innerHTML = `<div class="empty-state" style="padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
    }

    fetch(URL_WEB_APP, {
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "get_today_summary", tanggal: document.getElementById('tanggal').value })
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === 'success') {
            renderLaporanHariIni(response.data);
        } else if (!isSilent) {
            document.getElementById('today-summary-container').innerHTML = `<div class="empty-state"><p style="color:var(--danger)">Gagal memuat laporan.</p></div>`;
        }
    })
    .catch(err => {
        if (!isSilent) {
            document.getElementById('today-summary-container').innerHTML = `<div class="empty-state"><p style="color:var(--danger)">Koneksi bermasalah.</p></div>`;
        }
    });
}

function renderLaporanHariIni(dataSummary) {
    const container = document.getElementById('today-summary-container');
    const daftarKelas = [...new Set(masterSiswaList.map(s => s.kelas))].sort();
    if (daftarKelas.length === 0) { container.innerHTML = '<p style="color: var(--text-muted); text-align:center;">Belum ada master kelas.</p>'; return; }

    let html = '<div class="summary-list">';
    daftarKelas.forEach(kelas => {
        const stat = dataSummary[kelas];
        if (stat && stat.submitted) {
            html += `<div class="summary-item"><div class="summary-class-name"><i class="fa-solid fa-chalkboard-user" style="color:var(--primary); margin-right:6px;"></i> ${kelas}</div>
                <div class="summary-badges"><span class="summary-badge s-hadir">Hadir: ${stat.hadir}</span>
                ${stat.sakit > 0 ? `<span class="summary-badge s-sakit">Sakit: ${stat.sakit}</span>` : ''}
                ${stat.izin > 0 ? `<span class="summary-badge s-izin">Izin: ${stat.izin}</span>` : ''}
                ${stat.alpa > 0 ? `<span class="summary-badge s-alpa">Alpa: ${stat.alpa}</span>` : ''}
                </div></div>`;
        } else {
            html += `<div class="summary-item"><div class="summary-class-name"><i class="fa-solid fa-chalkboard-user" style="color:var(--text-muted); margin-right:6px;"></i> ${kelas}</div>
                <div class="summary-badges"><span class="summary-badge s-belum"><i class="fa-solid fa-clock"></i> Belum Absen</span></div></div>`;
        }
    });
    container.innerHTML = html + '</div>';
}

function muatRekapData() {
    const kelas = document.getElementById('rekap-kelas').value;
    const bulan = document.getElementById('rekap-bulan').value;
    const tahun = document.getElementById('rekap-tahun').value;
    if (!kelas) { Swal.fire('Informasi', 'Pilih kelas terlebih dahulu!', 'info'); return; }

    const btn = document.querySelector('#rekap-page .btn-primary');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengambil...';

    fetch(URL_WEB_APP, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "get_rekap", kelas, bulan, tahun })
    }).then(res => res.json()).then(response => {
        if (response.result === 'success') olahDanTampilkanRekap(kelas, response.data);
        else Swal.fire('Gagal!', response.message, 'error');
    }).catch(err => Swal.fire('Error', 'Gagal dari Sheets.', 'error'))
    .finally(() => { btn.disabled = false; btn.innerHTML = originalText; });
}

function olahDanTampilkanRekap(kelasSelected, rawData) {
    const tbody = document.querySelector('#rekap-table tbody');
    tbody.innerHTML = '';
    const siswaDaftar = masterSiswaList.filter(s => s.kelas === kelasSelected);
    
    if (siswaDaftar.length === 0) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p>Tidak ada data siswa kelas ini.</p></div></td></tr>`; return; }
    
    rekapSiswaHasil = siswaDaftar.map(s => {
        const absensiSiswa = rawData.filter(r => String(r.nis) === String(s.nis));
        let hadir = 0, sakit = 0, izin = 0, alpa = 0;
        absensiSiswa.forEach(a => {
            if (a.status === 'Hadir') hadir++; else if (a.status === 'Sakit') sakit++; else if (a.status === 'Izin') izin++; else if (a.status === 'Alpa') alpa++;
        });
        const total = hadir + sakit + izin + alpa;
        return { nis: s.nis, nama: s.nama, kelas: kelasSelected, hadir, sakit, izin, alpa, totalPertemuan: total, persentase: total > 0 ? Math.round((hadir/total)*100) : 0 };
    });

    if (rawData.length === 0) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-calendar-xmark"></i><p>Belum ada rekaman presensi pada periode ini.</p></div></td></tr>`; return; }

    rekapSiswaHasil.forEach((item, idx) => {
        tbody.innerHTML += `<tr><td><strong>${idx + 1}</strong></td><td><code>${item.nis}</code></td><td><strong>${item.nama}</strong></td>
            <td><span class="badge-count badge-hadir">${item.hadir}</span></td><td><span class="badge-count badge-sakit">${item.sakit}</span></td>
            <td><span class="badge-count badge-izin">${item.izin}</span></td><td><span class="badge-count badge-alpa">${item.alpa}</span></td>
            <td><strong>${item.persentase}%</strong></td></tr>`;
    });
}

function cetakRekap() {
    if (rekapSiswaHasil.length === 0) { Swal.fire('Peringatan', 'Tampilkan rekap dulu!', 'warning'); return; }
    const kelas = document.getElementById('rekap-kelas').value;
    const bulanVal = document.getElementById('rekap-bulan').value;
    const periodeTeks = (bulanVal === 'all') ? `Tahun ${document.getElementById('rekap-tahun').value}` : `Bulan ${document.getElementById('rekap-bulan').options[document.getElementById('rekap-bulan').selectedIndex].text} ${document.getElementById('rekap-tahun').value}`;
    
    let tbodyHtml = '';
    rekapSiswaHasil.forEach((item, index) => {
        tbodyHtml += `<tr><td>${index + 1}</td><td>${item.nis}</td><td>${item.nama}</td><td>${item.hadir}</td><td>${item.sakit}</td><td>${item.izin}</td><td>${item.alpa}</td><td><strong>${item.persentase}%</strong></td></tr>`;
    });

    const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const printHtml = `
        <div class="print-kop">
            <img src="asset/logoweb.png" alt="Logo Sekolah" class="print-logo">
            <div class="print-kop-text">
                <h2>SD ISLAM AL-HAYAT</h2>
                <p>Jl. Pacelengan Tagungguh Tanjungbumi Bangkalan 69156</p>
                <p>Telp: +62 812-3060-4433 | Email: sdislamalhayat@gmail.com | Website: alhayat.web.id</p>
            </div>
        </div>

        <div class="print-title">LAPORAN REKAPITULASI PRESENSI SISWA</div>

        <div class="print-info">
            <table>
                <tr><td>Kelas / Rombel</td><td>:</td><td>${kelas}</td></tr>
                <tr><td>Periode Laporan</td><td>:</td><td>${periodeTeks}</td></tr>
            </table>
        </div>

        <table class="print-table">
            <thead>
                <tr>
                    <th width="5%">NO</th>
                    <th width="18%">NIS / NISN</th>
                    <th width="35%">NAMA SISWA / SANTRI</th>
                    <th width="8%">HADIR</th>
                    <th width="8%">SAKIT</th>
                    <th width="8%">IZIN</th>
                    <th width="8%">ALPA</th>
                    <th width="10%">% HADIR</th>
                </tr>
            </thead>
            <tbody>
                ${tbodyHtml}
            </tbody>
        </table>

        <div class="print-ttd">
            <div class="print-ttd-box">
                <p>Mengetahui,</p>
                <p>Kepala Sekolah</p>
                <div class="print-ttd-space"></div>
                <div style="width: 220px; border-bottom: 1.5px solid black; margin: 0 auto;"></div>
                <div style="width: 220px; text-align: left; margin: 5px auto 0; font-size: 11pt;">NIP. </div>
            </div>
            <div class="print-ttd-box">
                <p>................................., ${tanggalCetak}</p>
                <p>Wali Kelas ${kelas}</p>
                <div class="print-ttd-space"></div>
                <div style="width: 220px; border-bottom: 1.5px solid black; margin: 0 auto;"></div>
                <div style="width: 220px; text-align: left; margin: 5px auto 0; font-size: 11pt;">NIP. </div>
            </div>
        </div>
    `;
    
    document.getElementById('print-area').innerHTML = printHtml;
    window.print();
}

function exportRekapExcel() {
    if (rekapSiswaHasil.length === 0) { Swal.fire('Peringatan', 'Tampilkan rekap dulu!', 'warning'); return; }
    const kelas = document.getElementById('rekap-kelas').value;
    const tahun = document.getElementById('rekap-tahun').value;
    let excelRows = [["REKAP PRESENSI"], ["Kelas", ": " + kelas], ["Tahun", ": " + tahun], [], ["NO", "NIS", "NAMA", "KELAS", "HADIR", "SAKIT", "IZIN", "ALPA", "TOTAL", "% HADIR"]];
    rekapSiswaHasil.forEach((item, idx) => excelRows.push([idx + 1, item.nis, item.nama, item.kelas, item.hadir, item.sakit, item.izin, item.alpa, item.totalPertemuan, item.persentase + "%"]));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(excelRows), "Rekap"); XLSX.writeFile(wb, `Rekap_${kelas}_${tahun}.xlsx`);
}

function resetDatabase() {
    Swal.fire({
        title: 'PERINGATAN KRITIS!',
        text: "Apakah Anda yakin ingin MENGHAPUS SELURUH DATA (Master Siswa & Presensi) dari database Google Sheets? Tindakan ini TIDAK BISA dibatalkan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus Semua!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Apakah Anda benar-benar yakin?',
                text: "Semua riwayat absensi akan hilang selamanya.",
                icon: 'error',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yakin 100% Hapus!',
                cancelButtonText: 'Batal'
            }).then((result2) => {
                if (result2.isConfirmed) {
                    const btn = document.querySelector('.btn-danger');
                    const originalText = btn.innerHTML;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menghapus...';

                    Swal.fire({
                        title: 'Menghapus Database...',
                        text: 'Mohon tunggu, jangan tutup halaman ini.',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading(); }
                    });

                    fetch(URL_WEB_APP, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify({ action: "reset_database" })
                    })
                    .then(res => res.json())
                    .then(response => {
                        if (response.result === 'success') {
                            Swal.fire('Berhasil Dihapus!', 'Seluruh data database telah dihapus bersih.', 'success');
                            masterSiswaList = [];
                            updateDashboardUI();
                            tampilkanMasterTabel([]);
                            updateDropdownKelas();
                            document.getElementById('today-summary-container').innerHTML = '<div class="empty-state"><p>Belum ada data laporan hari ini.</p></div>';
                            document.querySelector('#master-table tbody').innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-file-excel"></i><p>Database kosong. Silakan upload file Excel baru.</p></div></td></tr>`;
                            document.getElementById('db-status-info').innerText = "Database kosong. Silakan upload file Excel baru.";
                        } else {
                            Swal.fire('Gagal!', "GAGAL menghapus data: " + response.message, 'error');
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        Swal.fire('Error Jaringan', "Terjadi kesalahan jaringan saat mencoba menghapus data.", 'error');
                    })
                    .finally(() => {
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    });
                }
            });
        }
    });
}

// ==========================================
// PWA
// ==========================================
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
let deferredPrompt; const pwaBanner = document.getElementById('pwa-install-banner');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; setTimeout(() => { if (pwaBanner) pwaBanner.classList.add('show'); }, 2000); });
document.getElementById('btn-install-pwa')?.addEventListener('click', async () => { if (pwaBanner) pwaBanner.classList.remove('show'); if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; } });
document.getElementById('btn-close-pwa')?.addEventListener('click', () => { if (pwaBanner) pwaBanner.classList.remove('show'); });
window.addEventListener('appinstalled', () => { if (pwaBanner) pwaBanner.classList.remove('show'); });

// ==========================================
// FUNGSI SHOW / HIDE PASSWORD
// ==========================================
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('login-password');
    const toggleIcon = document.getElementById('toggle-password');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text'; // Tampilkan password
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash'); // Ganti ke ikon mata dicoret
    } else {
        passwordInput.type = 'password'; // Sembunyikan password
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye'); // Ganti ke ikon mata normal
    }
}

// ==========================================
// FUNGSI UPDATE WARNA DROPDOWN STATUS
// ==========================================
function updateWarnaStatus(selectElement) {
    // Hapus semua warna sebelumnya
    selectElement.classList.remove('status-hadir', 'status-sakit', 'status-izin', 'status-alpa');
    
    // Tambahkan warna baru sesuai pilihan
    const value = selectElement.value;
    if (value === 'Hadir') {
        selectElement.classList.add('status-hadir');
    } else if (value === 'Sakit') {
        selectElement.classList.add('status-sakit');
    } else if (value === 'Izin') {
        selectElement.classList.add('status-izin');
    } else if (value === 'Alpa') {
        selectElement.classList.add('status-alpa');
    }
}



// ==========================================
// RUMUS MENGHITUNG JARAK (HAVERSINE FORMULA)
// ==========================================
function hitungJarak(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radius bumi dalam satuan meter
    const φ1 = lat1 * Math.PI/180; // Konversi ke radian
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Hasil dalam meter
}