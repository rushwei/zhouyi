import { Divination } from './core/divination.js';
import { PALACE_ELEMENTS } from './data/constants.js';
import { Solar, Lunar } from 'lunar-javascript';
import { Takashima } from './modules/takashima.js';
import { calcTrueSolarTime, calcSunriseSunset, calcUnequalShichen, findShichen, calcHourGanZhi } from '@shared/true-solar-time';
import { CITIES } from '@shared/cities';

const castingBtn = document.getElementById('cast-btn');
const manualInputBtn = document.getElementById('manual-input-btn');
const manualInputPanel = document.getElementById('manual-input-panel');
const manualSubmitBtn = document.getElementById('manual-submit-btn');
const resetBtn = document.getElementById('reset-btn');
const statusMsg = document.getElementById('status-message');
const dateInfo = document.getElementById('date-info');
const primaryHexContainer = document.getElementById('primary-hexagram');
const variedHexContainer = document.getElementById('varied-hexagram');

const divination = new Divination();
const takashima = new Takashima();

// Initialize Takashima data
takashima.init();

// True solar time state
let currentCity = { name: '北京', lng: 116.41, lat: 39.90, tz: 8 };
let useTrueSolarTime = true;

function initCitySelector() {
    const cityInput = document.getElementById('city-input');
    const cityDropdown = document.getElementById('city-dropdown');
    const cityNameEl = document.getElementById('city-name');
    const tstCheckbox = document.getElementById('tst-checkbox');

    tstCheckbox.addEventListener('change', () => {
        useTrueSolarTime = tstCheckbox.checked;
        refreshDate();
    });

    cityInput.addEventListener('input', () => {
        const q = cityInput.value.trim();
        if (!q) { cityDropdown.style.display = 'none'; return; }
        const qLower = q.toLowerCase();
        const matches = CITIES.filter(c => c.name.includes(q) || c.nameEn.toLowerCase().includes(qLower)).slice(0, 8);
        if (matches.length === 0) { cityDropdown.style.display = 'none'; return; }
        cityDropdown.innerHTML = matches.map(c =>
            `<li data-lng="${c.lng}" data-lat="${c.lat}" data-tz="${c.tz}" data-name="${c.name}">${c.name}<span class="city-extra">${c.province || ''}</span></li>`
        ).join('');
        cityDropdown.style.display = 'block';
    });

    cityInput.addEventListener('focus', () => {
        if (cityInput.value.trim()) cityInput.dispatchEvent(new Event('input'));
    });

    cityDropdown.addEventListener('mousedown', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        e.preventDefault();
        currentCity = {
            name: li.dataset.name,
            lng: parseFloat(li.dataset.lng),
            lat: parseFloat(li.dataset.lat),
            tz: parseFloat(li.dataset.tz)
        };
        cityNameEl.textContent = currentCity.name;
        cityInput.value = '';
        cityDropdown.style.display = 'none';
        refreshDate();
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.city-picker')) cityDropdown.style.display = 'none';
    });
}

function refreshDate() {
    const dateData = initDate();
    const dayGan = dateData.dayStem;
    currentDayStem = STEM_MAP[dayGan] || "Jia";
    currentXunKong = dateData.xunKong || "";
    currentDayBranch = dateData.dayBranch || "";
    currentMonthBranch = dateData.monthBranch || "";
}

function initDate() {
    try {
        const now = new Date();
        const d = Solar.fromDate(now);
        const lunar = d.getLunar();
        const bazi = lunar.getEightChar();

        const ganZhiYear = bazi.getYear();
        const ganZhiMonth = bazi.getMonth();
        const ganZhiDay = bazi.getDay();
        let ganZhiHour = bazi.getTime();
        let tstNote = '';

        if (useTrueSolarTime) {
            const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const tst = calcTrueSolarTime(dateStr, timeStr, currentCity.lng, currentCity.tz);
            const sunData = calcSunriseSunset(dateStr, currentCity.lat, currentCity.lng, currentCity.tz);
            if (sunData) {
                const shichenTable = calcUnequalShichen(sunData.sunrise, sunData.sunset);
                const sc = findShichen(tst.hours, tst.minutes, shichenTable);
                if (sc) {
                    const dayStem = ganZhiDay[0];
                    const isLateZi = sc.subBranch === '晚子';
                    ganZhiHour = calcHourGanZhi(dayStem, sc.branch, isLateZi);
                    const tstTime = `${String(tst.hours).padStart(2,'0')}:${String(tst.minutes).padStart(2,'0')}`;
                    const scStart = `${String(sc.start.h).padStart(2,'0')}:${String(sc.start.m).padStart(2,'0')}`;
                    const scEnd = `${String(sc.end.h).padStart(2,'0')}:${String(sc.end.m).padStart(2,'0')}`;
                    tstNote = ` <span style="font-size:0.85em;color:var(--accent-gold);">(${tstTime}- ${sc.name}(${scStart}~${scEnd}))</span>`;
                }
            }
        }

        dateInfo.innerHTML = `
            ${d.getYear()}年${d.getMonth()}月${d.getDay()}日
            农历:${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}
            <br>
            ${ganZhiYear}年 ${ganZhiMonth}月 ${ganZhiDay}日
            <span class="shichen-highlight">${ganZhiHour}时</span>${tstNote}
            <br>
            <span class="xunkong-info">空亡: ${lunar.getDayXunKong()}</span>
        `;
        return {
            dayStem: bazi.getDay().substring(0, 1),
            xunKong: lunar.getDayXunKong(),
            dayBranch: lunar.getDayZhi(),
            monthBranch: lunar.getMonthZhi()
        };

    } catch (e) {
        console.error(e);
        dateInfo.innerHTML = "错误: 日期库加载失败。";
        return { dayStem: "甲" };
    }
}

const STEM_MAP = {
    "甲": "Jia", "乙": "Yi", "丙": "Bing", "丁": "Ding", "戊": "Wu",
    "己": "Ji", "庚": "Geng", "辛": "Xin", "壬": "Ren", "癸": "Gui"
};

const BRANCH_ELEMENT_CN = {
    "子": "Water", "丑": "Earth", "寅": "Wood", "卯": "Wood",
    "辰": "Earth", "巳": "Fire", "午": "Fire", "未": "Earth",
    "申": "Metal", "酉": "Metal", "戌": "Earth", "亥": "Water"
};

// 五行生克
const GENERATE_MAP = { "Metal": "Water", "Water": "Wood", "Wood": "Fire", "Fire": "Earth", "Earth": "Metal" };
const OVERCOME_MAP = { "Metal": "Wood", "Wood": "Earth", "Earth": "Water", "Water": "Fire", "Fire": "Metal" };

function getElementStrength(monthElement, lineElement) {
    if (monthElement === lineElement) return "旺";           // 同我
    if (GENERATE_MAP[monthElement] === lineElement) return "相"; // 月生爻
    if (GENERATE_MAP[lineElement] === monthElement) return "休"; // 爻生月
    if (OVERCOME_MAP[lineElement] === monthElement) return "囚"; // 爻克月
    if (OVERCOME_MAP[monthElement] === lineElement) return "死"; // 月克爻
    return "";
}

const CLASH_MAP = {
    "子": "午", "午": "子", "丑": "未", "未": "丑",
    "寅": "申", "申": "寅", "卯": "酉", "酉": "卯",
    "辰": "戌", "戌": "辰", "巳": "亥", "亥": "巳"
};

let currentDayStem = "Jia";
let currentXunKong = "";
let currentDayBranch = "";
let currentMonthBranch = "";

document.addEventListener('DOMContentLoaded', () => {
    initCitySelector();
    const dateData = initDate();
    const dayGan = dateData.dayStem;
    currentDayStem = STEM_MAP[dayGan] || "Jia";
    currentXunKong = dateData.xunKong || "";
    currentDayBranch = dateData.dayBranch || "";
    currentMonthBranch = dateData.monthBranch || "";

    renderHistoryList();

    // Initialize UI state
    window.startCasting();

    // Check for test mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('test')) {
        divination.cast();
        castingStep = 6;
        primaryHexContainer.style.display = 'block';
        coinContainer.style.display = 'none';
        castingBtn.style.display = 'none';
        resetBtn.style.display = 'inline-block';
        resetBtn.innerText = "重新起卦";
        statusMsg.innerText = "测试模式：直接生成结果";

        renderResult(divination.castResult);
    }
});

const castingButtonText = [
    "开始起卦 (掷初爻)", "掷二爻", "掷三爻", "掷四爻", "掷五爻", "掷上爻"
];

let castingStep = 0;
const coinContainer = document.getElementById('coin-container');

window.startCasting = () => {
    castingStep = 0;
    divination.reset();
    primaryHexContainer.style.display = 'none';
    primaryHexContainer.querySelector('.hexagram-lines').innerHTML = '';
    primaryHexContainer.querySelector('.hexagram-info').innerHTML = '';
    variedHexContainer.style.display = 'none';
    variedHexContainer.querySelector('.hexagram-lines').innerHTML = '';

    castingBtn.innerText = castingButtonText[0];
    castingBtn.disabled = false;
    castingBtn.style.display = 'inline-block';
    manualInputBtn.style.display = 'inline-block';
    manualInputBtn.innerText = '手动排盘';
    manualInputPanel.style.display = 'none';
    resetBtn.style.display = 'none';
    statusMsg.innerText = "点击按钮开始抛掷铜钱...";
    coinContainer.style.display = 'none';
};

castingBtn.addEventListener('click', () => {
    if (castingStep < 6) {
        performToss();
    }
});

resetBtn.addEventListener('click', () => {
    window.startCasting();
});

manualInputBtn.addEventListener('click', () => {
    const isVisible = manualInputPanel.style.display !== 'none';
    if (isVisible) {
        manualInputPanel.style.display = 'none';
        manualInputBtn.innerText = '手动排盘';
    } else {
        manualInputPanel.style.display = 'block';
        manualInputBtn.innerText = '收起输入';
        coinContainer.style.display = 'none';
    }
});

manualSubmitBtn.addEventListener('click', () => {
    const raw = [];
    for (let i = 0; i < 6; i++) {
        const selected = document.querySelector(`input[name="line${i}"]:checked`);
        raw.push(parseInt(selected.value));
    }

    divination.castResult = raw;
    castingStep = 6;
    primaryHexContainer.style.display = 'block';
    coinContainer.style.display = 'none';
    castingBtn.style.display = 'none';
    manualInputBtn.style.display = 'none';
    manualInputPanel.style.display = 'none';
    resetBtn.style.display = 'inline-block';
    resetBtn.innerText = '重新起卦';
    statusMsg.innerText = '手动排盘完成';

    renderResult(divination.castResult);
});

function performToss() {
    castingBtn.disabled = true;
    manualInputBtn.style.display = 'none';
    manualInputPanel.style.display = 'none';
    statusMsg.innerText = "掷铜钱中...";
    coinContainer.style.display = 'flex';

    // 1. Determine targets (Collision limit)
    const containerW = coinContainer.offsetWidth;
    const containerH = coinContainer.offsetHeight;
    const coinSize = coinContainer.querySelector('.coin').offsetWidth || 64;
    const targets = [];
    let attempts = 0;
    while (targets.length < 3 && attempts < 100) {
        const left = Math.random() * (containerW - coinSize);
        const top = Math.random() * (containerH - coinSize);

        let overlap = false;
        for (const t of targets) {
            const dx = t.left - left;
            const dy = t.top - top;
            if (Math.sqrt(dx * dx + dy * dy) < (coinSize + 10)) {
                overlap = true;
                break;
            }
        }
        if (!overlap) {
            targets.push({ left, top });
        }
        attempts++;
    }
    // Fallback if placement fails
    while (targets.length < 3) {
        targets.push({ left: Math.random() * (containerW - coinSize), top: Math.random() * (containerH - coinSize) });
    }

    // 2. Prepare coins
    const coins = coinContainer.querySelectorAll('.coin');
    const indices = [0, 1, 2];
    // Shuffle indices for stopping order
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // 3. Start Motion
    indices.forEach((coinIdx, i) => {
        const c = coins[coinIdx];
        const target = targets[coinIdx];

        // Random start position (cluster near center for "toss" effect)
        c.style.transition = 'none';
        c.style.left = ((containerW - coinSize) / 2 + (Math.random() - 0.5) * 50) + 'px';
        c.style.top = ((containerH - coinSize) / 2 + (Math.random() - 0.5) * 50) + 'px';
        c.style.transform = `rotate(${Math.random() * 360}deg)`;

        // Trigger reflow
        c.offsetHeight;

        const stopDelay = 800 + (i * 600) + Math.random() * 300;

        // Reset class to start spin
        c.className = 'coin spinning';
        c.innerText = '';

        // spin speed
        c.style.animationDuration = (0.5 + Math.random() * 0.3) + 's';

        // Smooth Roll: Transition to target over the duration of the delay
        c.style.transition = `left ${stopDelay}ms ease-out, top ${stopDelay}ms ease-out`;

        // Set Target Position
        c.style.left = target.left + 'px';
        c.style.top = target.top + 'px';

        // Store delay on the element for retrieval
        c.dataset.stopDelay = stopDelay;
    });

    // 4. Logic & Feedback
    const lineVal = divination.castLine();
    const coinValues = decomposeToCoins(lineVal);
    let completedCount = 0;

    setVibration(3);

    // Visual Flicker Interval (Texture swap only, NO movement - pure texture toggle)
    const flickerInterval = setInterval(() => {
        const spinningCoins = coinContainer.querySelectorAll('.coin.spinning');
        if (spinningCoins.length === 0) {
            clearInterval(flickerInterval);
            return;
        }
        spinningCoins.forEach(c => {
            const isYin = Math.random() > 0.5;
            // Preserve spinning class, just toggle yin/yang class for color
            c.classList.remove('yin', 'yang');
            c.classList.add(isYin ? 'yin' : 'yang');
            c.innerText = isYin ? "阴" : "阳";
        });
    }, 80);

    // 5. Stopping Logic
    indices.forEach((coinIdx, i) => {
        const c = coins[coinIdx];
        const delay = parseFloat(c.dataset.stopDelay);

        setTimeout(() => {
            const val = coinValues[coinIdx];

            // Stop spinning
            c.className = 'coin';
            c.style.animationDuration = '';
            c.style.transition = ''; // Clear transition

            // Set Final Face
            if (val === 2) {
                c.classList.add('yin');
                c.innerText = "阴";
            } else {
                c.classList.add('yang');
                c.innerText = "阳";
            }

            // Final resting rotation (random angle on floor)
            c.style.transform = `rotate(${Math.random() * 360}deg)`;

            completedCount++;
            setVibration(3 - completedCount);

            if (completedCount === 3) {
                clearInterval(flickerInterval);
                finishToss(lineVal);
            }
        }, delay);
    });
}

function setVibration(level) {
    if (window.vibrationTimer) clearInterval(window.vibrationTimer);
    if (!navigator.vibrate) return;
    navigator.vibrate(0); // Stop current

    if (level <= 0) return;

    // Simulate intensity levels using pulse patterns
    const patterns = {
        3: { duration: 80, interval: 100 },
        2: { duration: 50, interval: 150 },
        1: { duration: 30, interval: 300 }
    };

    const p = patterns[level];
    const run = () => navigator.vibrate(p.duration);

    run(); // Start immediately
    window.vibrationTimer = setInterval(run, p.interval);
}

function finishToss(lineVal) {
    castingStep++;

    if (castingStep === 1) {
        primaryHexContainer.style.display = 'block';
    }

    const stepName = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"][castingStep - 1];
    statusMsg.innerText = `${stepName}掷得: ${getLineName(lineVal)}`;

    renderSingleLine(primaryHexContainer, lineVal, castingStep - 1);

    castingBtn.disabled = false;

    if (castingStep < 6) {
        castingBtn.innerText = castingButtonText[castingStep];
    } else {
        statusMsg.innerText = "起卦完成";
        castingBtn.style.display = 'none';
        resetBtn.innerText = "重新起卦";
        resetBtn.style.display = 'inline-block';

        setTimeout(() => {
            const result = divination.castResult;
            renderResult(result);
        }, 500);
    }
}

function decomposeToCoins(sum) {
    let coins;
    if (sum === 6) coins = [2, 2, 2];
    else if (sum === 9) coins = [3, 3, 3];
    else if (sum === 7) coins = [2, 2, 3]; // 2+2+3=7 (Shao Yang) - 1 Yang, 2 Yins
    else if (sum === 8) coins = [2, 3, 3]; // 2+3+3=8 (Shao Yin) - 1 Yin, 2 Yangs
    else coins = [2, 3, 3];

    // Shuffle for visual effect
    for (let i = coins.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [coins[i], coins[j]] = [coins[j], coins[i]];
    }
    return coins;
}

function getLineName(val) {
    if (val === 6) return "老阴 (变)";
    if (val === 7) return "少阳 (静)";
    if (val === 8) return "少阴 (静)";
    if (val === 9) return "老阳 (变)";
    return "";
}

function renderSingleLine(container, val, index) {
    const linesContainer = container.querySelector('.hexagram-lines');
    const lineRow = document.createElement('div');
    lineRow.className = 'line-row';

    const leftDiv = document.createElement('div');
    leftDiv.className = 'line-info-left';
    leftDiv.innerText = `[${index + 1}]`;

    const graphicDiv = document.createElement('div');
    graphicDiv.className = 'line-graphic';

    let isMoving = false;
    let movingSymbol = "";
    if (val === 6) { isMoving = true; movingSymbol = "X"; }
    else if (val === 9) { isMoving = true; movingSymbol = "O"; }
    if (isMoving) graphicDiv.classList.add('moving');

    const lineDiv = document.createElement('div');
    const isYang = (val % 2 !== 0);
    lineDiv.className = isYang ? 'yang-line' : 'yin-line';
    graphicDiv.appendChild(lineDiv);

    const rightDiv = document.createElement('div');
    rightDiv.className = 'line-info-right';
    rightDiv.innerHTML = `${getLineName(val)} ${movingSymbol}`;

    lineRow.appendChild(leftDiv);
    lineRow.appendChild(graphicDiv);
    lineRow.appendChild(rightDiv);

    linesContainer.appendChild(lineRow);
}

function renderResult(castResult) {
    const hexs = divination.getHexagrams();

    // Render Primary
    const primaryChart = divination.chart(hexs.primary, currentDayStem);
    renderHexagram(primaryHexContainer, hexs.primary, primaryChart, hexs.raw, 'Primary');

    // Determine focal element for Takashima explanation
    // Construct binary codes
    const primaryBinary = hexs.primary.join('');
    // Varied might be null if no moving lines. 
    // The calculateFocalElement expects variedCode string for 6-moving case.
    const variedBinary = hexs.varied ? hexs.varied.join('') : "";

    const focal = takashima.calculateFocalElement(hexs.raw, primaryBinary, variedBinary);

    // Add button to Primary container
    addTakashimaButton(primaryHexContainer, focal.hexCode, focal.index, focal.description);
    addStudyLink(primaryHexContainer, primaryBinary, primaryChart.name);
    addAiButton(primaryHexContainer);

    // Render Varied
    let variedName = null;
    if (hexs.varied) {
        variedHexContainer.style.display = 'block';
        const variedChart = divination.chart(hexs.varied, currentDayStem);
        variedName = variedChart.name;
        renderHexagram(variedHexContainer, hexs.varied, variedChart, null, 'Varied');

        // Add Takashima button for varied hexagram (general text, no moving line)
        const variedBinaryCode = hexs.varied.join('');
        addTakashimaButton(variedHexContainer, variedBinaryCode, null, "变卦卦辞");
        addStudyLink(variedHexContainer, variedBinaryCode, variedName);
    } else {
        variedHexContainer.style.display = 'none';
    }

    // Save to history (skip when restoring)
    if (!renderResult._skipSave) {
        saveToHistory(hexs.raw, primaryChart.name, variedName);
    }
}

function renderHexagram(container, binaryLines, chartData, rawLines, type) {
    const linesContainer = container.querySelector('.hexagram-lines');
    linesContainer.innerHTML = '';

    const REL_CN = { "Parents": "父母", "Offspring": "子孙", "Official": "官鬼", "Wealth": "妻财", "Brothers": "兄弟" };
    const BEAST_CN = {
        "Green Dragon": "青龙", "Vermilion Bird": "朱雀", "Hook Snake": "勾陈",
        "Flying Snake": "腾蛇", "White Tiger": "白虎", "Black Tortoise": "玄武"
    };
    const ELEMENT_CN = { "Metal": "金", "Wood": "木", "Water": "水", "Fire": "火", "Earth": "土" };
    const BRANCH_CN = {
        "Zi": "子", "Chou": "丑", "Yin": "寅", "Mao": "卯", "Chen": "辰", "Si": "巳",
        "Wu": "午", "Wei": "未", "Shen": "申", "You": "酉", "Xu": "戌", "Hai": "亥"
    };

    binaryLines.forEach((val, index) => {
        const lineRow = document.createElement('div');
        lineRow.className = 'line-row';

        const relation = chartData.relations[index];
        const beast = chartData.sixBeasts ? chartData.sixBeasts[index] : "";
        const branch = chartData.branches[index];
        const element = chartData.elements[index];
        const shi = (chartData.palace.shi === (index + 1)) ? "世" : "";
        const ying = (chartData.palace.ying === (index + 1)) ? "应" : "";

        let hiddenText = "";
        if (chartData.hiddenSpirits && chartData.hiddenSpirits[index]) {
            const hs = chartData.hiddenSpirits[index];
            const hsRel = REL_CN[hs.relation];
            const hsBranch = BRANCH_CN[hs.branch];
            const hsEl = ELEMENT_CN[hs.element];
            hiddenText = `<span style="color:red; font-size:0.8em; margin-left:5px;">(伏: ${hsRel}${hsBranch}${hsEl})</span>`;
        }

        let isMoving = false;
        let movingSymbol = "";
        if (type === 'Primary' && rawLines) {
            const raw = rawLines[index];
            if (raw === 6) {
                isMoving = true;
                movingSymbol = "X";
            } else if (raw === 9) {
                isMoving = true;
                movingSymbol = "O";
            }
        }

        const relText = REL_CN[relation] || relation;
        const beastText = BEAST_CN[beast] || "";
        const branchText = BRANCH_CN[branch] || branch;
        const elText = ELEMENT_CN[element] || element;

        const leftText = `${beastText} ${relText}`;

        let tags = '';
        if (currentXunKong && currentXunKong.includes(branchText)) {
            tags += '<span class="tag tag-kong">空</span>';
        }
        if (currentDayBranch && CLASH_MAP[branchText] === currentDayBranch) {
            tags += '<span class="tag tag-ripo">日破</span>';
        }
        if (currentMonthBranch && CLASH_MAP[branchText] === currentMonthBranch) {
            tags += '<span class="tag tag-yuepo">月破</span>';
        }
        if (currentMonthBranch) {
            const monthEl = BRANCH_ELEMENT_CN[currentMonthBranch];
            if (monthEl && element) {
                const strength = getElementStrength(monthEl, element);
                if (strength) {
                    const strengthClass = {
                        "旺": "tag-wang", "相": "tag-xiang",
                        "休": "tag-xiu", "囚": "tag-qiu", "死": "tag-si"
                    }[strength] || "";
                    tags += `<span class="tag ${strengthClass}">${strength}</span>`;
                }
            }
        }

        const rightText = `${branchText}${elText} ${shi}${ying} ${movingSymbol} ${tags} ${hiddenText}`;

        const leftDiv = document.createElement('div');
        leftDiv.className = 'line-info-left';
        leftDiv.innerHTML = leftText;

        const graphicDiv = document.createElement('div');
        graphicDiv.className = 'line-graphic';
        if (isMoving) graphicDiv.classList.add('moving');

        const lineDiv = document.createElement('div');
        lineDiv.className = val === 1 ? 'yang-line' : 'yin-line';
        graphicDiv.appendChild(lineDiv);

        const rightDiv = document.createElement('div');
        rightDiv.className = 'line-info-right';
        rightDiv.innerHTML = rightText;

        lineRow.appendChild(leftDiv);
        lineRow.appendChild(graphicDiv);
        lineRow.appendChild(rightDiv);

        linesContainer.appendChild(lineRow);
    });

    const subtitleContainer = container.querySelector('.hexagram-subtitle');
    const PALACE_CN = {
        "Qian": "乾", "Dui": "兑", "Li": "离", "Zhen": "震", "Xun": "巽", "Kan": "坎", "Gen": "艮", "Kun": "坤"
    };
    const pName = PALACE_CN[chartData.palace.palace] || chartData.palace.palace;
    const genText = chartData.palace.generation === 6 ? "六冲" :
        (chartData.palace.generation === "YouHun" ? "游魂" :
            (chartData.palace.generation === "GuiHun" ? "归魂" :
                chartData.palace.generation + "世"));

    subtitleContainer.innerHTML = `
        <div class="hexagram-name">${chartData.name}</div>
        <div class="hexagram-palace">${pName}宫${ELEMENT_CN[PALACE_ELEMENTS[chartData.palace.palace]]} - ${genText}</div>
    `;
}

// Takashima Modal Logic
const modal = document.getElementById("takashima-modal");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const closeBtn = document.querySelector(".close-btn");

function closeModal() {
    modal.style.display = "none";
}

if (closeBtn) {
    closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeModal();
    });
}

modal.addEventListener('click', function (event) {
    if (event.target === modal) {
        closeModal();
    }
});


async function showTakashimaModal(binaryCode, movingLineIndex) {
    modalTitle.innerText = "加载中...";
    modalBody.innerHTML = "正在获取高岛易断解释，请稍候...";
    modal.style.display = "block";

    const result = await takashima.getExplanation(binaryCode, movingLineIndex);

    if (result.error) {
        modalTitle.innerText = result.title;
        modalBody.innerHTML = result.error;
        return;
    }

    renderTakashimaContent(result);
}

let mainSectionIdCounter = 0;

function sectionHtml(title, original, modern, cssClass) {
    if (!original) return '';
    const sid = `main-sec-${mainSectionIdCounter++}`;
    const hasModern = !!modern;
    const toggleBtn = hasModern
        ? `<button class="section-toggle-btn modal-toggle-btn">译文</button>`
        : '';
    const modernBlock = hasModern
        ? `<div class="${cssClass} section-modern" hidden>${escapeHtml(modern)}</div>`
        : '';
    return `<div class="modal-section" id="${sid}" data-nav-title="${title}">` +
        `<div class="modal-section-title">${title}${toggleBtn}</div>` +
        `<div class="${cssClass} section-original">${escapeHtml(original)}</div>` +
        modernBlock +
        `</div>`;
}

function buildModalNav(bodyElement) {
    const sections = bodyElement.querySelectorAll('[data-nav-title]');
    if (sections.length < 3) return;

    const nav = document.createElement('div');
    nav.className = 'modal-nav';
    sections.forEach(sec => {
        const link = document.createElement('a');
        link.className = 'modal-nav-link';
        link.textContent = sec.dataset.navTitle;
        link.href = '#' + sec.id;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        nav.appendChild(link);
    });
    bodyElement.insertBefore(nav, bodyElement.firstChild);
}

function renderTakashimaContent(result) {
    mainSectionIdCounter = 0;
    modalTitle.innerText = result.title;

    let bodyHtml = '';

    bodyHtml += sectionHtml('卦辞', result.guaci, result.modern_guaci, 'modal-classical-text');
    bodyHtml += sectionHtml('总注', result.general_text, result.modern_general_text, 'modal-modern-text');

    if (result.lineText !== undefined) {
        bodyHtml += sectionHtml('爻辞', result.lineText, result.modern_lineText, 'modal-classical-text');
    }

    bodyHtml += sectionHtml('高岛易断', result.takashima, result.modern_takashima, 'modal-takashima-text');

    modalBody.innerHTML = bodyHtml;

    buildModalNav(modalBody);

    // Bind per-section toggle buttons
    modalBody.querySelectorAll('.section-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sec = btn.closest('.modal-section');
            const origEl = sec.querySelector('.section-original');
            const modernEl = sec.querySelector('.section-modern');
            const showingModern = !modernEl.hidden;
            origEl.hidden = !showingModern;
            modernEl.hidden = showingModern;
            btn.textContent = showingModern ? '译文' : '原文';
            btn.classList.toggle('active', !showingModern);
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

// Add button to page dynamically or existing container
function addTakashimaButton(container, binaryCode, movingLineIndex, description) {
    // Check if button already exists to avoid duplicates if re-rendering
    let btn = container.querySelector('.takashima-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.className = 'takashima-btn';
        btn.style.marginTop = '10px';
        btn.style.fontSize = '14px';
        btn.style.padding = '5px 10px';
        btn.style.backgroundColor = '#666'; // Distinct from main action
        container.querySelector('.hexagram-info').appendChild(btn);
    }

    // Update text
    btn.innerText = description ? `查看高岛易断 (${description})` : "查看高岛易断";

    // Update click handler with current context
    btn.onclick = () => {
        showTakashimaModal(binaryCode, movingLineIndex);
    };
}

// ── AI Interpret ──
const aiModal = document.getElementById('ai-modal');
const aiModalTitle = document.getElementById('ai-modal-title');
const aiInputArea = document.getElementById('ai-input-area');
const aiResultArea = document.getElementById('ai-result-area');
const aiQuestion = document.getElementById('ai-question');
const aiSubmitBtn = document.getElementById('ai-submit-btn');
const aiContent = document.getElementById('ai-content');
const aiError = document.getElementById('ai-error');
const aiRetryBtn = document.getElementById('ai-retry-btn');
const aiCloseBtn = document.querySelector('.ai-close-btn');

let currentHexagramInfo = '';

if (aiCloseBtn) {
    aiCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        aiModal.style.display = 'none';
    });
}

aiModal.addEventListener('click', (e) => {
    if (e.target === aiModal) aiModal.style.display = 'none';
});

function collectHexagramInfo() {
    const hexs = divination.getHexagrams();
    const primaryChart = divination.chart(hexs.primary, currentDayStem);

    const REL_CN = { "Parents": "父母", "Offspring": "子孙", "Official": "官鬼", "Wealth": "妻财", "Brothers": "兄弟" };
    const BEAST_CN = {
        "Green Dragon": "青龙", "Vermilion Bird": "朱雀", "Hook Snake": "勾陈",
        "Flying Snake": "腾蛇", "White Tiger": "白虎", "Black Tortoise": "玄武"
    };
    const ELEMENT_CN = { "Metal": "金", "Wood": "木", "Water": "水", "Fire": "火", "Earth": "土" };
    const BRANCH_CN = {
        "Zi": "子", "Chou": "丑", "Yin": "寅", "Mao": "卯", "Chen": "辰", "Si": "巳",
        "Wu": "午", "Wei": "未", "Shen": "申", "You": "酉", "Xu": "戌", "Hai": "亥"
    };
    const PALACE_CN = {
        "Qian": "乾", "Dui": "兑", "Li": "离", "Zhen": "震", "Xun": "巽", "Kan": "坎", "Gen": "艮", "Kun": "坤"
    };

    const pName = PALACE_CN[primaryChart.palace.palace] || primaryChart.palace.palace;
    const palaceEl = ELEMENT_CN[PALACE_ELEMENTS[primaryChart.palace.palace]] || '';
    const genText = primaryChart.palace.generation === 6 ? "六冲" :
        (primaryChart.palace.generation === "YouHun" ? "游魂" :
            (primaryChart.palace.generation === "GuiHun" ? "归魂" :
                primaryChart.palace.generation + "世"));

    let info = `本卦：${primaryChart.name}（${pName}宫${palaceEl} ${genText}）\n`;
    info += `世爻：第${primaryChart.palace.shi}爻  应爻：第${primaryChart.palace.ying}爻\n\n`;

    const lineNames = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];
    info += `六爻详情（从初爻到上爻）：\n`;

    for (let i = 0; i < 6; i++) {
        const rel = REL_CN[primaryChart.relations[i]] || primaryChart.relations[i];
        const branch = BRANCH_CN[primaryChart.branches[i]] || primaryChart.branches[i];
        const element = ELEMENT_CN[primaryChart.elements[i]] || primaryChart.elements[i];
        const beast = BEAST_CN[primaryChart.sixBeasts?.[i]] || '';
        const isMoving = hexs.raw[i] === 6 || hexs.raw[i] === 9;
        const movingText = isMoving ? (hexs.raw[i] === 9 ? "（动爻-老阳）" : "（动爻-老阴）") : "";
        const shiYing = primaryChart.palace.shi === (i + 1) ? " [世]" : (primaryChart.palace.ying === (i + 1) ? " [应]" : "");

        let xunkongTag = '';
        if (currentXunKong && currentXunKong.includes(branch)) xunkongTag = ' [旬空]';
        let ripoTag = '';
        if (currentDayBranch && CLASH_MAP[branch] === currentDayBranch) ripoTag = ' [日破]';

        info += `${lineNames[i]}：${beast} ${rel} ${branch}${element}${shiYing}${movingText}${xunkongTag}${ripoTag}\n`;
    }

    if (hexs.varied) {
        const variedChart = divination.chart(hexs.varied, currentDayStem);
        info += `\n变卦：${variedChart.name}\n`;
    }

    info += `\n日期：${dateInfo.textContent.trim()}\n`;

    return info;
}

function addAiButton(container) {
    let btn = container.querySelector('.ai-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.className = 'ai-btn';
        btn.style.marginTop = '10px';
        container.querySelector('.hexagram-info').appendChild(btn);
    }
    btn.innerText = 'AI 解卦';
    btn.onclick = () => {
        currentHexagramInfo = collectHexagramInfo();
        aiModal.style.display = 'block';
        // Preserve previous result if exists
        if (!aiContent.innerHTML.trim()) {
            aiInputArea.style.display = 'block';
            aiResultArea.style.display = 'none';
            aiQuestion.value = '';
            aiSubmitBtn.disabled = false;
            aiSubmitBtn.innerText = '开始解卦';
        }
    };
}

function simpleMarkdown(text) {
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Headers
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold & italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Unordered list items
    html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');

    // Ordered list items
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Paragraphs: double newline
    html = html.replace(/\n\n+/g, '</p><p>');
    // Single newline to <br>
    html = html.replace(/\n/g, '<br>');

    html = '<p>' + html + '</p>';
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-4]>)/g, '$1');
    html = html.replace(/(<\/h[1-4]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');

    return html;
}

async function startAiInterpret(question) {
    aiInputArea.style.display = 'none';
    aiResultArea.style.display = 'block';
    aiContent.innerHTML = '<div class="ai-loading"><span class="ai-loading-dot"></span><span class="ai-loading-dot"></span><span class="ai-loading-dot"></span><span class="ai-loading-text">正在解卦中，请稍候...</span></div>';
    aiError.style.display = 'none';
    aiRetryBtn.style.display = 'none';

    let fullText = '';

    try {
        const response = await fetch('/api/ai-interpret', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, hexagramInfo: currentHexagramInfo }),
        });

        if (!response.ok) {
            let errorMsg = '网络连接失败，请检查网络后重试';
            try {
                const errData = await response.json();
                if (errData.error) errorMsg = errData.error;
            } catch { }
            showAiError(errorMsg);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        fullText += '\n\n（传输中断，内容可能不完整）';
                        aiContent.innerHTML = simpleMarkdown(fullText);
                        showAiError(parsed.error);
                        return;
                    }
                    if (parsed.text) {
                        fullText += parsed.text;
                        aiContent.innerHTML = simpleMarkdown(fullText) + '<span class="ai-cursor"></span>';
                    }
                } catch { }
            }
        }

        // Render final
        aiContent.innerHTML = simpleMarkdown(fullText);

    } catch (err) {
        if (fullText) {
            fullText += '\n\n（传输中断，内容可能不完整）';
            aiContent.innerHTML = simpleMarkdown(fullText);
        }
        showAiError('网络连接失败，请检查网络后重试');
    }
}

function showAiError(msg) {
    aiError.textContent = msg;
    aiError.style.display = 'block';
    aiRetryBtn.style.display = 'block';
}

aiSubmitBtn.addEventListener('click', () => {
    const q = aiQuestion.value.trim();
    if (!q) return;
    startAiInterpret(q);
});

const aiCopyBtn = document.getElementById('ai-copy-btn');
aiCopyBtn.addEventListener('click', async () => {
    const q = aiQuestion.value.trim();
    let prompt = `你是一位精通六爻占卜的易学大师，请根据以下卦象信息进行专业解读。\n\n解卦顺序（务必按此顺序展开分析）：\n1. 世应分析：先从应爻、世爻入手，解析卦主（求占之人）与所占之事之间的关系与态势（世为己、应为他/事，看其旺衰、生克、动静、比和冲合）\n2. 用神剖判：再根据所占之事取用神（如问财取财爻、问官取官爻、问婚取应爻或官鬼/妻财等），结合日月生克、动变化出，解释求占之事当前的状态与吉凶\n3. 卦象背景：最后回归卦象本身（本卦/变卦的卦名、卦辞、上下卦象意），阐释整件事所处的大环境与背景关系\n\n在以上主线之上，补充六兽参考、动爻与变爻、旬空与日破，并给出综合判断与实际可行的建议。\n\n卦象信息：\n${currentHexagramInfo}`;
    if (q) prompt += `\n\n占卜事件：${q}`;
    try {
        await navigator.clipboard.writeText(prompt);
        aiCopyBtn.innerText = '已复制';
        setTimeout(() => { aiCopyBtn.innerText = '复制提问'; }, 2000);
    } catch {
        aiCopyBtn.innerText = '复制失败';
        setTimeout(() => { aiCopyBtn.innerText = '复制提问'; }, 2000);
    }
});

aiRetryBtn.addEventListener('click', () => {
    const q = aiQuestion.value.trim();
    if (!q) {
        // Show input area again
        aiInputArea.style.display = 'block';
        aiResultArea.style.display = 'none';
        return;
    }
    startAiInterpret(q);
});

function addStudyLink(container, binaryCode, hexName) {
    let link = container.querySelector('.study-link');
    if (!link) {
        link = document.createElement('a');
        link.className = 'study-link';
        link.target = '_blank';
        container.querySelector('.hexagram-info').appendChild(link);
    }
    const hexId = takashima.indexMap ? takashima.indexMap[binaryCode] : null;
    if (hexId) {
        link.href = `study.html?hex=${hexId}`;
        link.textContent = `查看${hexName || '卦象'}完整解释`;
        link.style.display = '';
    } else {
        link.style.display = 'none';
    }
}

// ── History (localStorage) ──
const HISTORY_KEY = 'hexagram_history';
const HISTORY_MAX = 50;

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch { return []; }
}

function saveToHistory(raw, primaryName, variedName) {
    const history = getHistory();
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const d = Solar.fromDate(now);
    const lunar = d.getLunar();
    const bazi = lunar.getEightChar();

    const record = {
        id: Date.now(),
        date: dateStr,
        ganZhiDate: `${bazi.getYear()}年 ${bazi.getMonth()}月 ${bazi.getDay()}日 ${bazi.getTime()}时`,
        raw: raw,
        primaryName: primaryName,
        variedName: variedName,
        dayStem: currentDayStem,
        dayBranch: currentDayBranch,
        monthBranch: currentMonthBranch,
        xunKong: currentXunKong
    };

    history.unshift(record);
    if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistoryList();
}

function renderHistoryList() {
    const section = document.getElementById('history-section');
    const list = document.getElementById('history-list');
    if (!section || !list) return;

    const history = getHistory();
    if (history.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    list.innerHTML = '';

    history.forEach(record => {
        const item = document.createElement('div');
        item.className = 'history-item';
        const variedText = record.variedName ? ` → ${record.variedName}` : '';
        item.innerHTML = `
            <span class="history-date">${record.date}</span>
            <span class="history-name">${record.primaryName}${variedText}</span>
            <span class="history-delete" title="删除">&times;</span>
        `;
        item.querySelector('.history-name').addEventListener('click', () => restoreFromHistory(record));
        item.querySelector('.history-date').addEventListener('click', () => restoreFromHistory(record));
        item.querySelector('.history-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            item.classList.add('fade-out');
            setTimeout(() => {
                deleteHistoryItem(record.id);
            }, 300);
        });
        list.appendChild(item);
    });

    // Clear all button
    let clearBtn = section.querySelector('.history-clear-btn');
    if (!clearBtn) {
        clearBtn = document.createElement('button');
        clearBtn.className = 'history-clear-btn';
        clearBtn.textContent = '清空全部';
        clearBtn.addEventListener('click', clearAllHistory);
        section.appendChild(clearBtn);
    }
}

function deleteHistoryItem(id) {
    const history = getHistory().filter(r => r.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistoryList();
}

function clearAllHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistoryList();
}

function restoreFromHistory(record) {
    // Restore date context
    if (record.dayStem) currentDayStem = record.dayStem;
    if (record.dayBranch) currentDayBranch = record.dayBranch;
    if (record.monthBranch) currentMonthBranch = record.monthBranch;
    if (record.xunKong) currentXunKong = record.xunKong;

    // Update date display to history record time
    if (record.date && record.ganZhiDate) {
        const xkText = record.xunKong || '';
        dateInfo.innerHTML = `${record.date}<br>${record.ganZhiDate}<br><span class="xunkong-info">空亡: ${xkText}</span>`;
    }

    divination.castResult = record.raw;
    castingStep = 6;
    primaryHexContainer.style.display = 'block';
    coinContainer.style.display = 'none';
    castingBtn.style.display = 'none';
    resetBtn.style.display = 'inline-block';
    resetBtn.innerText = "重新起卦";
    statusMsg.innerText = `历史记录: ${record.primaryName}`;

    renderResult._skipSave = true;
    renderResult(record.raw);
    renderResult._skipSave = false;
}

