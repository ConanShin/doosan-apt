// =======================
// 1. 상수 및 환경설정
// =======================

// Supabase 테이블명 상수
const TABLE = {
    PARTICIPATION_PUBLIC: 'participation_public',
    PARTICIPATION_CONFIRM_PUBLIC: 'participation_confirm_public',
    PARTICIPATION: 'participation',
};

// Supabase 클라이언트 생성
const supabase = window.supabase.createClient(
    'https://khsfusfxylokdoibxrbf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtoc2Z1c2Z4eWxva2RvaWJ4cmJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMzc0NjYsImV4cCI6MjA1NzgxMzQ2Nn0.vQ6nKgvvLdtjUU7iyxxqsO_s--V_jYIpEYJMHdXOrfQ'
);

const TOTAL_UNITS = 150;

// =======================
// 2. 아파트 구조 생성
// =======================

const aptRules = {
    101: { floors: 15, getHosu: f => [1,2,3,4,5,6] },
    102: { floors: 15, getHosu: f => [1,2,3,4] },
    103: { floors: 15, getHosu: f => [1,2,3,4,5,6] },
    104: { floors: 15, getHosu: f => (f >= 14 ? [1,2,3] : [1,2,3,4]) },
    105: { floors: 15, getHosu: f => (f >= 14 ? [2,3,4] : [1,2,3,4]) },
    106: { floors: 15, getHosu: f => [1,2,3,4] },
    107: { floors: 15, getHosu: f => (f >= 14 ? [1,2,3,4,5] : [1,2,3,4,5,6,7,8,9]) },
    108: { floors: 15, getHosu: f => (f >= 14 ? [2,3,4] : [1,2,3,4]) },
    109: { floors: 15, getHosu: f => [1,2,3,4] },
    110: { floors: 15, getHosu: f => [1,2,3,4] },
    111: { floors: 15, getHosu: f => [1,2,3,4] },
    112: { floors: 15, getHosu: f => (f === 15 ? [3,4,5,6,7,8] : [1,2,3,4,5,6,7,8]) },
    113: { floors: 15, getHosu: f => [1,2,3,4] },
    114: { floors: 15, getHosu: f => (f === 15 ? [1,2,3] : [1,2,3,4]) },
    115: { floors: 15, getHosu: f => [1,2,3,4,5,6,7,8,9,10] },
    116: { floors: 15, getHosu: f => (f === 15 ? [2,3,4,5,6,7,8] : [1,2,3,4,5,6,7,8]) },
};

// 층, 호수를 4자리 문자열로 변환 (예: 1404)
const makeRoomNumber = (floor, ho) =>
    `${floor < 10 ? '0' : ''}${floor}${ho < 10 ? '0' : ''}${ho}`;

// 아파트 전체 구조 생성
const structure = Object.fromEntries(
    Object.entries(aptRules).map(([dong, rule]) => [
        dong,
        Object.fromEntries(
            Array.from({ length: rule.floors }, (_, i) => {
                const floor = i + 1;
                return [floor, rule.getHosu(floor).map(ho => makeRoomNumber(floor, ho))];
            })
        ),
    ])
);

// =======================
// 3. 유틸 함수
// =======================

// "1404호" 또는 "101호" → { floor: "14", ho: "04" }
function parseHoNumber(hoStr) {
    hoStr = hoStr.replace('호', '').trim();
    if (hoStr.length === 4) return { floor: hoStr.slice(0, 2), ho: hoStr.slice(2) };
    if (hoStr.length === 3) return { floor: hoStr.slice(0, 1), ho: hoStr.slice(1) };
    return null;
}

function isValidPhone(phone) {
    return /^01[016789]-?\d{3,4}-?\d{4}$/.test(phone.replace(/-/g, ''));
}

function clearForm() {
    ['dong', 'ho', 'phone', 'status'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// =======================
// 4. 참여 현황 로딩 및 렌더링
// =======================

let participation = {};
let participationConfirm = {};

// 참여 현황 불러오기
async function fetchParticipation() {
    try {
        const [{ data: participationData, error: participationError },
            { data: participationConfirmData, error: participationConfirmError }] = await Promise.all([
            supabase.from(TABLE.PARTICIPATION_PUBLIC).select(),
            supabase.from(TABLE.PARTICIPATION_CONFIRM_PUBLIC).select()
        ]);

        if (participationError || participationConfirmError) {
            throw new Error((participationError || participationConfirmError).message);
        }

        participation = Object.fromEntries(
            participationData.map(row => [`${row.dong}-${row.floor}-${row.ho}`, row])
        );
        participationConfirm = Object.fromEntries(
            participationConfirmData.map(row => [`${row.dong}-${row.floor}-${row.ho}`, row])
        );

        render();
    } catch (err) {
        alert('참여 현황을 불러오는 중 오류가 발생했습니다: ' + err.message);
    }
}

// =======================
// 5. 등록/취소 처리
// =======================

async function register() {
    const dong = document.getElementById('dong').value.trim();
    const hoInput = document.getElementById('ho').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const status = document.getElementById('status').value;

    // 입력값 검증
    const hoInfo = parseHoNumber(hoInput);
    if (!hoInfo) return alert('호수를 올바르게 입력해 주세요. (예: 1404호 또는 101호)');
    const { floor, ho } = hoInfo;

    if (!dong || !ho || !phone || !status || !floor) return alert('모든 정보를 입력해 주세요.');
    if (!structure[dong]) return alert('존재하지 않는 동입니다.');
    if (!structure[dong][floor]) return alert(`${dong}동에는 ${floor}층이 없습니다.`);
    const hoNum = makeRoomNumber(Number(floor), Number(ho));
    if (!structure[dong][floor].includes(hoNum)) return alert(`${dong}동 ${floor}층에는 ${hoNum}호가 없습니다.`);
    if (!isValidPhone(phone)) return alert('휴대폰 번호를 올바르게 입력해 주세요.');

    try {
        if (status === '취소') {
            const { error } = await supabase
                .from(TABLE.PARTICIPATION)
                .delete()
                .match({ dong, floor: Number(floor), ho: hoNum });
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from(TABLE.PARTICIPATION)
                .upsert([{
                    dong,
                    floor: Number(floor),
                    ho: hoNum,
                    phone,
                    status_consent: status
                }], { onConflict: 'dong,floor,ho' });
            if (error) throw error;
        }
        await fetchParticipation();
        clearForm();
    } catch (err) {
        alert('저장 중 오류가 발생했습니다: ' + err.message);
    }
}

// =======================
// 6. UI 렌더링
// =======================

function render() {
    const aptArea = document.getElementById('aptArea');
    aptArea.innerHTML = '';
    let count = 0;

    Object.entries(structure).forEach(([dong, floors]) => {
        const dongDiv = document.createElement('div');
        dongDiv.className = 'dong-block';
        dongDiv.innerHTML = `<div class="dong-title">${dong}동</div>`;

        // 동 전체 층 중 가장 많은 호수 수 구하기
        const maxHosu = Math.max(
            ...Object.values(floors).map(arr => arr.length ? Math.max(...arr.map(h => Number(h.slice(2)))) : 0)
        );

        Object.keys(floors).sort((a, b) => b - a).forEach(floor => {
            const floorDiv = document.createElement('div');
            floorDiv.className = 'hosu-grid';
            const floorLabel = document.createElement('span');
            floorLabel.style.display = 'inline-block';
            floorLabel.style.width = '28px';
            floorLabel.style.textAlign = 'right';
            floorLabel.style.marginRight = '4px';
            floorLabel.style.fontWeight = 'bold';
            floorLabel.textContent = floor + 'F';
            floorDiv.appendChild(floorLabel);

            for (let ho = 1; ho <= maxHosu; ho++) {
                const hoNum = makeRoomNumber(Number(floor), ho);
                const key = `${dong}-${floor}-${hoNum}`;
                const info = participation[key];
                const isConfirmed = participationConfirm[key];

                const cell = document.createElement('div');
                cell.className = 'ho-cell';

                if (floors[floor].includes(hoNum)) {
                    // 실제 존재하는 호수
                    if (isConfirmed && isConfirmed.status_consent) {
                        cell.classList.add('confirmed');
                        cell.title = `${floor}층 ${ho}호 - 동의서 제출 확인`;
                        count++;
                    } else if (info) {
                        if (info.status_consent === '완료') {
                            cell.classList.add('completed');
                            cell.title = `${floor}층 ${ho}호 - 동의서 제출 완료`;
                            count++;
                        } else if (info.status_consent === '참여') {
                            cell.classList.add('participated');
                            cell.title = `${floor}층 ${ho}호 - 동의서 제출 의사 있음`;
                            count++;
                        }
                    }
                    cell.textContent = ho < 10 ? '0' + ho : ho;

                    // 클릭 시 폼 자동입력
                    cell.style.cursor = 'pointer';
                    cell.addEventListener('click', () => fillForm(dong, floor, ho));
                } else {
                    cell.style.visibility = 'hidden';
                }
                floorDiv.appendChild(cell);
            }
            dongDiv.appendChild(floorDiv);
        });
        aptArea.appendChild(dongDiv);
    });

    document.getElementById('countText').textContent =
        `참여/목표 세대수(${TOTAL_UNITS}): ${count} / ${TOTAL_UNITS}`;

    // 50% 달성 여부에 따른 메시지 표시
    const isHalf = count >= TOTAL_UNITS * 0.5;
    document.getElementById('goalMsg').style.display = isHalf ? 'none' : '';
    document.getElementById('congratsMsg').style.display = isHalf ? '' : 'none';

    // 진행률 바
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.width = `${(count / TOTAL_UNITS) * 100}%`;
    }
}

// 폼 자동입력 및 스크롤
function fillForm(dong, floor, ho) {
    const dongSelect = document.getElementById('dong');
    if (dongSelect) dongSelect.value = dong;
    const hoInput = document.getElementById('ho');
    if (hoInput) hoInput.value = `${floor}${ho < 10 ? '0' + ho : ho}호`;
    const phoneInput = document.getElementById('phone');
    if (phoneInput) phoneInput.value = '';
    const statusSelect = document.getElementById('status');
    if (statusSelect) statusSelect.value = '';

    const donateSection = document.getElementById('consent');
    if (donateSection) {
        donateSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// =======================
// 7. 이벤트 연결
// =======================

window.onload = fetchParticipation;
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('registerBtn');
    if (btn) btn.onclick = register;
});
