// PASTIKAN URL INI SAMA DENGAN URL DI HALAMAN ADMIN
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbxULMqYGSLb58eVXLsBcrJ8FRNcifPmiJdxQdqEPbi8mg-BnlGU13ApRwGVBQSC2tSH/exec";

let SCHOOL_LAT, SCHOOL_LNG, WAKTU_MULAI, WAKTU_SELESAI, MAX_RADIUS_METERS;
let masterSiswaList = [];

// Memastikan jika tanggal berubah, tabel otomatis me-refresh data
document.getElementById('tanggal').addEventListener('change', filterDataAbsensi);

// ==========================================
// FUNGSI NOTIFIKASI KECIL & PROFESIONAL
// ==========================================
function notifMini(title, text, icon) {
    let color = '#4f46e5'; 
    if (icon === 'error') color = '#d33';     
    if (icon === 'warning') color = '#f59e0b'; 

    Swal.fire({
        title: `<span style="font-size: 1.1rem; font-weight:700;">${title}</span>`,
        html: `<span style="font-size: 0.85rem; color: #64748b; line-height:1.4; display:block;">${text}</span>`,
        icon: icon,
        width: '300px', 
        padding: '1.2em', 
        confirmButtonColor: color,
        confirmButtonText: 'OK',
        customClass: { confirmButton: 'btn-sm' }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Cek apakah guru sudah memasukkan PIN di sesi ini
    if (sessionStorage.getItem('_guru_auth_valid')) {
        inisialisasiAplikasiGuru();
    } else {
        memintaKodeAksesGuru();
    }
});

// ==========================================
// GERBANG KEAMANAN PIN GURU
// ==========================================
function memintaKodeAksesGuru() {
    Swal.fire({
        title: '<i class="fa-solid fa-lock" style="color: #3b82f6; font-size: 2.2rem; margin-bottom: 10px; display: block;"></i><span style="font-size: 1.25rem; font-weight: 700; color: #0f172a;">Akses Terkunci</span>',
        html: '<span style="font-size: 0.85rem; color: #64748b;">Masukkan 6 digit PIN untuk presensi.</span>',
        input: 'password',
        inputPlaceholder: '••••••',
        width: '320px', 
        padding: '1.5em 1em 2em', 
        background: '#ffffff',
        backdrop: 'rgba(15, 23, 42, 0.85)', 
        allowOutsideClick: false,
        allowEscapeKey: false,
        showCancelButton: false,
        confirmButtonText: 'Buka Portal',
        confirmButtonColor: '#3b82f6',
        inputAttributes: {
            maxlength: 6,
            autocapitalize: 'off',
            autocorrect: 'off',
            inputmode: 'numeric', 
            pattern: '[0-9]*', 
            oninput: "this.value = this.value.replace(/[^0-9]/g, '')", 
            style: 'text-align: center; letter-spacing: 12px; font-size: 1.5rem; font-weight: bold; border-radius: 12px; padding: 12px; box-shadow: none;'
        },
        customClass: {
            popup: 'swal-modern-popup',
            confirmButton: 'swal-modern-btn',
            input: 'swal-modern-input'
        },
        inputValidator: (value) => {
            if (!value) return 'PIN tidak boleh kosong!';
            // 'MTEyMjMz' adalah 112233 yang sudah di-enkripsi Base64 agar tidak bisa diintip siswa
            if (btoa(value) !== 'MTEyMjMz') return 'PIN salah! Akses ditolak.';
        }
    }).then((result) => {
        if (result.isConfirmed) {
            sessionStorage.setItem('_guru_auth_valid', 'true');
            inisialisasiAplikasiGuru();
        }
    });
}

// ==========================================
// RUMUS MENGHITUNG JARAK (HAVERSINE)
// ==========================================
function hitungJarak(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// ==========================================
// INISIALISASI & TARIK DATA
// ==========================================
async function inisialisasiAplikasiGuru() {
    // Memunculkan halaman utama yang disembunyikan agar tidak blank/berkedip
    const halamanUtama = document.getElementById('halaman-utama');
    if (halamanUtama) {
        halamanUtama.style.display = 'block';
    }

    Swal.fire({
        title: '<span style="font-size: 1.1rem;">Menyiapkan Data...</span>',
        html: '<span style="font-size: 0.85rem; color: #64748b;">Mengecek waktu & sinkronisasi ke server.</span>',
        allowOutsideClick: false,
        showConfirmButton: false,
        width: '300px', padding: '1.5em',
        didOpen: () => { Swal.showLoading(); }
    });

    // AMBIL TANGGAL ASLI DARI SERVER INTERNET (ANTI-GESER)
    let year, month, day;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); 

        const res = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Asia/Jakarta', { signal: controller.signal });
        
        clearTimeout(timeoutId);
        if (res.ok) {
            const data = await res.json();
            year = data.year;
            month = String(data.month).padStart(2, '0');
            day = String(data.day).padStart(2, '0');
        }
    } catch (e) {
        console.warn("Gagal mengecek waktu online, menggunakan tanggal lokal.");
        const today = new Date();
        year = today.getFullYear();
        month = String(today.getMonth() + 1).padStart(2, '0');
        day = String(today.getDate()).padStart(2, '0');
    }
    
    document.getElementById('tanggal').value = `${year}-${month}-${day}`;

    // Lanjutkan mengambil pengaturan dari Google Sheets (Wajib ada API Key)
    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "get_pengaturan", api_key: "KODE_RAHASIA_ALHAYAT_2026" })
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === 'success') {
            SCHOOL_LAT = response.data.lat;
            SCHOOL_LNG = response.data.lng;
            MAX_RADIUS_METERS = response.data.radius || 50;
            
            let wMulai = String(response.data.waktu_mulai || "00:00").trim();
            let wSelesai = String(response.data.waktu_selesai || "23:59").trim();

            if (wMulai.indexOf(':') === 1) wMulai = "0" + wMulai;
            if (wSelesai.indexOf(':') === 1) wSelesai = "0" + wSelesai;

            WAKTU_MULAI = wMulai.substring(0, 5);
            WAKTU_SELESAI = wSelesai.substring(0, 5);
            
            tarikDataSiswa();
        }
    })
    .catch(err => {
        notifMini('Error Koneksi', 'Gagal terhubung ke database. Periksa internet Anda.', 'error');
    });
}

function tarikDataSiswa() {
    fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "get_master", api_key: "KODE_RAHASIA_ALHAYAT_2026" })
    })
    .then(res => res.json())
    .then(response => {
        if (response.result === 'success' && response.data.length > 0) {
            masterSiswaList = response.data;
            updateDropdownKelas();
            
            Swal.fire({
                title: '<span style="font-size: 1.1rem;">Siap Digunakan!</span>',
                html: '<span style="font-size: 0.85rem; color: #64748b;">Data kelas berhasil dimuat.</span>',
                icon: 'success', timer: 1500, showConfirmButton: false,
                width: '300px', padding: '1.2em'
            });
        } else {
            notifMini('Data Kosong', 'Data siswa belum tersedia. Hubungi Admin.', 'warning');
        }
    })
    .catch(err => {
        notifMini('Error', 'Gagal memuat daftar siswa. Cek koneksi Anda.', 'error');
    });
}

function updateDropdownKelas() {
    const selectKelas = document.getElementById('kelas');
    selectKelas.innerHTML = '<option value="">-- Pilih Kelas Anda --</option>';
    
    const daftarKelas = [...new Set(masterSiswaList.map(s => s.kelas))].sort();
    daftarKelas.forEach(k => { selectKelas.appendChild(new Option(k, k)); });
    selectKelas.disabled = false;
}

function filterDataAbsensi() {
    const kelasTerpilih = document.getElementById('kelas').value;
    const tanggalTerpilih = document.getElementById('tanggal').value;
    const tbody = document.querySelector('#attendance-table tbody');
    const btnSimpan = document.querySelector('.btn-primary'); 

    tbody.innerHTML = '';
    
    if (!kelasTerpilih) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Silakan pilih kelas terlebih dahulu.</td></tr>`;
        if(btnSimpan) {
            btnSimpan.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Presensi Sekarang';
            btnSimpan.style.backgroundColor = 'var(--primary)';
        }
        return;
    }
    
    const siswaKelas = masterSiswaList.filter(s => s.kelas === kelasTerpilih);
    if (siswaKelas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Tidak ada siswa di kelas ini.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = `<tr><td colspan="3" class="text-center"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem; color:var(--primary); margin-bottom:10px;"></i><br><span style="font-size:0.85rem; color:#64748b;">Mengecek riwayat absen hari ini...</span></td></tr>`;

    // Mencegah error jika tanggal dihapus 
    const parts = tanggalTerpilih ? tanggalTerpilih.split("-") : ["", ""];
    
    fetch(URL_WEB_APP, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
            action: "get_rekap", 
            api_key: "KODE_RAHASIA_ALHAYAT_2026", 
            kelas: kelasTerpilih, 
            bulan: parts[1] || "", 
            tahun: parts[0] || "" 
        })
    })
    .then(res => res.json())
    .then(response => {
        tbody.innerHTML = ''; 
        
        let dataHariIni = [];
        if (response.result === 'success') {
            dataHariIni = response.data.filter(d => d.tanggal === tanggalTerpilih);
        }

        siswaKelas.forEach((siswa, index) => {
            let statusTersimpan = "Hadir";
            const savedItem = dataHariIni.find(d => String(d.nis) === String(siswa.nis));
            if (savedItem) {
                statusTersimpan = savedItem.status;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${index + 1}</strong></td>
                <td>
                    <strong>${siswa.nama}</strong><br>
                    <code style="font-size:0.75rem; color:#64748b;">${siswa.nis}</code>
                </td>
               <td>
                    <select class="status-select" name="status_${index}" data-nis="${siswa.nis}" data-nama="${siswa.nama}" onchange="updateWarnaStatus(this)">
                        <option value="Hadir" ${statusTersimpan==='Hadir'?'selected':''}>Hadir</option>
                        <option value="Sakit" ${statusTersimpan==='Sakit'?'selected':''}>Sakit</option>
                        <option value="Izin" ${statusTersimpan==='Izin'?'selected':''}>Izin</option>
                        <option value="Alpa" ${statusTersimpan==='Alpa'?'selected':''}>Alpa</option>
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
            updateWarnaStatus(tr.querySelector('select'));
        });

        if (dataHariIni.length > 0) {
            notifMini('Mode Koreksi', 'Kelas ini sudah diabsen sebelumnya.<br>Silakan perbaiki data yang salah lalu kirim ulang.', 'info');
            if(btnSimpan) {
                btnSimpan.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Perbarui Presensi';
                btnSimpan.style.backgroundColor = '#f59e0b'; 
            }
        } else {
            if(btnSimpan) {
                btnSimpan.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Presensi Sekarang';
                btnSimpan.style.backgroundColor = 'var(--primary)'; 
            }
        }
    })
    .catch(err => {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted" style="color:red;">Gagal terhubung ke database. Silakan pilih kelas kembali.</td></tr>`;
    });
}

// ==========================================
// KIRIM DATA ABSENSI KE GOOGLE SHEETS
// ==========================================
async function simpanAbsensi() {
    const kelas = document.getElementById('kelas').value;
    const tanggal = document.getElementById('tanggal').value;
    const barisSiswa = document.querySelectorAll('#attendance-table tbody tr');

    if (!kelas || barisSiswa.length === 0 || barisSiswa[0].querySelector('.text-center')) { 
        notifMini('Perhatian', 'Pilih kelas Anda terlebih dahulu!', 'warning'); 
        return; 
    }

    Swal.fire({
        title: '<span style="font-size: 1.1rem;">Memproses...</span>',
        html: '<span style="font-size: 0.85rem; color: #64748b;">Mengecek waktu & sinkronisasi lokasi...</span>',
        allowOutsideClick: false, showConfirmButton: false,
        width: '300px', padding: '1.5em',
        didOpen: () => { Swal.showLoading(); }
    });

    let currentTime = "";
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); 
        
        const res = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Asia/Jakarta', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) {
            const data = await res.json();
            currentTime = data.time; 
        }
    } catch (e) {
        console.warn("API lambat/gagal, beralih ke jam lokal.");
        const now = new Date();
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        currentTime = `${currentHours}:${currentMinutes}`;
    }

    if (currentTime < WAKTU_MULAI || currentTime > WAKTU_SELESAI) {
        notifMini('Waktu Ditutup', `Waktu server menunjukkan jam <b>${currentTime}</b>.<br>Presensi hanya bisa dikirim pukul <b>${WAKTU_MULAI}</b> s/d <b>${WAKTU_SELESAI}</b>.`, 'error');
        return;
    }

    if (!navigator.geolocation) {
        notifMini('GPS Tidak Didukung', 'Browser/HP Anda tidak mendukung pendeteksian lokasi.', 'error');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const jarakMeter = hitungJarak(userLat, userLng, SCHOOL_LAT, SCHOOL_LNG);

            if (jarakMeter > MAX_RADIUS_METERS) {
                notifMini('Di Luar Radius!', `Jarak Anda <b>${Math.round(jarakMeter)} meter</b> dari sekolah.<br>Batas maksimal adalah ${MAX_RADIUS_METERS} meter. Silakan mendekat.`, 'warning');
                return;
            }

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
            
            const payload = { 
                action: "simpan_absensi", 
                api_key: "KODE_RAHASIA_ALHAYAT_2026", 
                kelas, 
                tanggal, 
                koordinat: koordinatTersimpan, 
                data: hasilAbsensi 
            };

            fetch(URL_WEB_APP, {
                method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            }).then(res => res.json()).then(response => {
                if (response.result === 'success') {
                    notifMini('Terkirim!', `Presensi ${kelas} berhasil diserahkan.<br><br><b>Jarak Anda: ${Math.round(jarakMeter)} m</b>`, 'success');
                    
                    document.getElementById('kelas').value = "";
                    document.querySelector('#attendance-table tbody').innerHTML = `<tr><td colspan="3" class="text-center text-muted">Silakan pilih kelas terlebih dahulu.</td></tr>`;
                    
                    const btnSimpan = document.querySelector('.btn-primary');
                    if (btnSimpan) {
                        btnSimpan.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Presensi Sekarang';
                        btnSimpan.style.backgroundColor = 'var(--primary)';
                    }
                } else {
                    notifMini('Gagal!', response.message, 'error');
                }
            }).catch(err => notifMini('Error', 'Gagal mengirim data. Cek koneksi internet Anda.', 'error'));
        },
        (error) => {
            notifMini('Lokasi Gagal', 'Gagal mendapatkan lokasi. Pastikan izin GPS aktif.', 'error');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// ==========================================
// PWA (KHUSUS GURU)
// ==========================================
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
let deferredPrompt; const pwaBanner = document.getElementById('pwa-install-banner');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; setTimeout(() => { if (pwaBanner) pwaBanner.classList.add('show'); }, 2000); });
document.getElementById('btn-install-pwa')?.addEventListener('click', async () => { if (pwaBanner) pwaBanner.classList.remove('show'); if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; } });
document.getElementById('btn-close-pwa')?.addEventListener('click', () => { if (pwaBanner) pwaBanner.classList.remove('show'); });
window.addEventListener('appinstalled', () => { if (pwaBanner) pwaBanner.classList.remove('show'); });

// ==========================================
// FUNGSI UPDATE WARNA DROPDOWN STATUS
// ==========================================
function updateWarnaStatus(selectElement) {
    selectElement.classList.remove('status-hadir', 'status-sakit', 'status-izin', 'status-alpa');
    const value = selectElement.value;
    if (value === 'Hadir') selectElement.classList.add('status-hadir');
    else if (value === 'Sakit') selectElement.classList.add('status-sakit');
    else if (value === 'Izin') selectElement.classList.add('status-izin');
    else if (value === 'Alpa') selectElement.classList.add('status-alpa');
}