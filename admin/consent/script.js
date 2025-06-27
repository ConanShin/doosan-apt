// === 테이블명 변수로 선언 ===
const PARTICIPATION_TABLE = 'participation';
const PARTICIPATION_CONFIRM_TABLE = 'participation_confirm';

// Supabase 클라이언트 생성 (window.supabase는 CDN으로 로드됨)
const supabase = window.supabase.createClient(
    'https://khsfusfxylokdoibxrbf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtoc2Z1c2Z4eWxva2RvaWJ4cmJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMzc0NjYsImV4cCI6MjA1NzgxMzQ2Nn0.vQ6nKgvvLdtjUU7iyxxqsO_s--V_jYIpEYJMHdXOrfQ'
);

supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) window.location.href = 'admin-login.html';
});

// 아파트 구조 생성 (동, 층, 호수 예외 모두 반영)
function makeRoomNumber(floor, ho) {
    return `${floor < 10 ? '0' : ''}${floor}${ho < 10 ? '0' : ''}${ho}`;
}

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

// 아파트 전체 구조 생성
const structure = {};
Object.entries(aptRules).forEach(([dong, rule]) => {
    structure[dong] = {};
    for (let floor = 1; floor <= rule.floors; floor++) {
        structure[dong][floor] = rule.getHosu(floor).map(
            ho => makeRoomNumber(floor, ho)
        );
    }
});

const TOTAL_UNITS = 150;

// 참여 현황 객체
let participation = {};
let participationConfirm = {};

// Supabase에서 참여 현황을 불러오기
async function fetchParticipation() {
    const { data: participationData, error: participationError } = await supabase
        .from(PARTICIPATION_TABLE)
        .select();

    if (participationError) {
        alert('참여 현황을 불러오는 중 오류가 발생했습니다: ' + participationError.message);
        return;
    }

    const { data: participationConfirmData, error: participationConfirmError } = await supabase
        .from(PARTICIPATION_CONFIRM_TABLE)
        .select();

    if (participationConfirmError) {
        alert('참여 현황을 불러오는 중 오류가 발생했습니다: ' + participationConfirmError.message);
        return;
    }

    participation = {};
    participationConfirm = {};
    participationData.forEach(row => {
        // key: 동-층-호수
        const key = `${row.dong}-${row.floor}-${row.ho}`;
        participation[key] = row;
    });
    participationConfirmData.forEach(row => {
        // key: 동-층-호수
        const key = `${row.dong}-${row.floor}-${row.ho}`;
        participationConfirm[key] = row;
    });

    render();
}

// 호수에서 층수와 호수 분리 함수
function parseHoNumber(hoStr) {
    hoStr = hoStr.replace('호', '').trim();
    if (hoStr.length === 4) {
        return { floor: hoStr.slice(0, 2), ho: hoStr.slice(2) };
    } else if (hoStr.length === 3) {
        return { floor: hoStr.slice(0, 1), ho: hoStr.slice(1) };
    } else {
        return null;
    }
}

// 등록 함수
async function register() {
    const dong = document.getElementById('dong').value.trim();
    const hoInput = document.getElementById('ho').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const status = document.getElementById('status').value;

    // 호수에서 층수와 호수 분리
    const hoInfo = parseHoNumber(hoInput);
    if (!hoInfo) {
        alert('호수를 올바르게 입력해 주세요. (예: 1404호 또는 101호)');
        return;
    }
    const floor = hoInfo.floor;
    const ho = hoInfo.ho;

    // 유효성 검사
    if (!dong || !ho || !phone || !status || !floor) {
        alert('모든 정보를 입력해 주세요.');
        return;
    }
    if (!structure[dong]) {
        alert('존재하지 않는 동입니다.');
        return;
    }
    if (!structure[dong][floor]) {
        alert(`${dong}동에는 ${floor}층이 없습니다.`);
        return;
    }
    const hoNum = makeRoomNumber(Number(floor), Number(ho));
    if (!structure[dong][floor].includes(hoNum)) {
        alert(`${dong}동 ${floor}층에는 ${hoNum}호가 없습니다.`);
        return;
    }
    if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(phone.replace(/-/g, ''))) {
        alert('휴대폰 번호를 올바르게 입력해 주세요.');
        return;
    }

    if (status === '확인') {
        const { data: participationConfirmData, error: participationConfirmError } = await supabase
            .from(PARTICIPATION_CONFIRM_TABLE)
            .upsert([{
                dong,
                floor: Number(floor),
                ho: hoNum,
                phone,
                status_consent: status
            }], {
                onConflict: 'dong,floor,ho' // dong, floor, ho의 조합이 unique constraint여야 함
            });

        if (participationConfirmError) {
            alert('저장 중 오류가 발생했습니다: ' + participationConfirmError.message);
            return;
        }
    } else if (status === '취소') {
        const { data: participationConfirmData, error: participationConfirmError } = await supabase
            .from(PARTICIPATION_CONFIRM_TABLE)
            .delete()
            .match({
                dong,
                floor: Number(floor),
                ho: hoNum
            });

        if (participationConfirmError) {
            alert('삭제 중 오류가 발생했습니다: ' + participationConfirmError.message);
            return;
        }

        const { data, error } = await supabase
            .from(PARTICIPATION_TABLE)
            .delete()
            .match({
                dong,
                floor: Number(floor),
                ho: hoNum
            });

        if (error) {
            alert('삭제 중 오류가 발생했습니다: ' + error.message);
            return;
        }
    } else {
        const { data: participationConfirmData, error: participationConfirmError } = await supabase
            .from(PARTICIPATION_CONFIRM_TABLE)
            .delete()
            .match({
                dong,
                floor: Number(floor),
                ho: hoNum
            });

        if (participationConfirmError) {
            alert('삭제 중 오류가 발생했습니다: ' + participationConfirmError.message);
            return;
        }
        // Supabase에 upsert (insert or update)
        const { data, error } = await supabase
            .from(PARTICIPATION_TABLE)
            .upsert([{
                dong,
                floor: Number(floor),
                ho: hoNum,
                phone,
                status_consent: status
            }], {
                onConflict: 'dong,floor,ho' // dong, floor, ho의 조합이 unique constraint여야 함
            });

        if (error) {
            alert('저장 중 오류가 발생했습니다: ' + error.message);
            return;
        }
    }

    // 저장 후 참여 현황 갱신
    await fetchParticipation();

    // 입력값 초기화
    document.getElementById('dong').value = '';
    document.getElementById('ho').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('status').value = '';
}

// 렌더링 함수
function render() {
    const aptArea = document.getElementById('aptArea');
    aptArea.innerHTML = '';
    let count = 0;
    let confirmedCount = 0;

    Object.entries(structure).forEach(([dong, floors]) => {
        const dongDiv = document.createElement('div');
        dongDiv.className = 'dong-block';
        dongDiv.innerHTML = `<div class="dong-title">${dong}동</div>`;

        // 동 전체 층 중 가장 많은 호수 수 구하기 (그 동의 모든 층 중 최대 호수 번호)
        const maxHosu = Math.max(
            ...Object.values(floors)
                .map(arr => arr.length > 0 ? Math.max(...arr.map(h => Number(h.slice(2)))) : 0)
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

            // 1호부터 maxHosu호까지 반복
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
                        cell.title = `${floor}층 ${ho}호 - 모금 확인`;
                        count++;
                        confirmedCount++;
                    } else {
                        if (info) {
                            if (info.status_consent === '완료') {
                                cell.classList.add('completed');
                                cell.title = `${floor}층 ${ho}호 - 모금 완료`;
                                count++;
                            } else if (info.status_consent === '참여') {
                                cell.classList.add('participated');
                                cell.title = `${floor}층 ${ho}호 - 모금 의사`;
                                count++;
                            }
                        }
                    }
                    cell.textContent = ho < 10 ? '0' + ho : ho;

                    // ho-cell 클릭 시 폼 자동입력
                    cell.style.cursor = 'pointer';
                    cell.addEventListener('click', function() {
                        const dongSelect = document.getElementById('dong');
                        if (dongSelect) dongSelect.value = dong;
                        const hoInput = document.getElementById('ho');
                        if (hoInput) hoInput.value = `${floor}${ho < 10 ? '0' + ho : ho}호`;
                        const phoneInput = document.getElementById('phone');
                        if (phoneInput) phoneInput.value = isConfirmed ? isConfirmed.phone : (info ? info.phone : '');
                        const statusSelect = document.getElementById('status');
                        if (statusSelect) statusSelect.value = isConfirmed ? isConfirmed.status_consent : (info ? info.status_consent : '');

                        const donateSection = document.getElementById('donate');
                        if (donateSection) {
                            donateSection.scrollIntoView({ behavior: 'smooth' });
                        }
                    });

                } else {
                    // 존재하지 않는 호수: 공간만 차지, 셀은 숨김
                    cell.style.visibility = 'hidden';
                }
                floorDiv.appendChild(cell);
            }
            dongDiv.appendChild(floorDiv);
        });
        aptArea.appendChild(dongDiv);
    });

    document.getElementById('countText').textContent = `참여/목표 세대수(1267세대 절반): ${count} / ${TOTAL_UNITS}`;
    document.getElementById('countText2').textContent = `완료: ${confirmedCount} 의사있음: ${count - confirmedCount}`;

    // 진행률 바
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.width = `${(count / TOTAL_UNITS) * 100}%`;
    }
}

document.getElementById('menuBtn').onclick = async function() {
    window.location.href = '../menu.html';
};

document.getElementById('logoutBtn').onclick = async function() {
    await supabase.auth.signOut();
    window.location.href = '../index.html';
};
// 이벤트 연결
window.onload = fetchParticipation;
document.addEventListener('DOMContentLoaded', function() {
    // 폼 등록 버튼에 id가 있다면 아래 코드 사용
    const btn = document.getElementById('registerBtn');
    if (btn) btn.onclick = register;
});
