const API_BASE_URL = 'https://raw.githubusercontent.com/sd-rubel/N5JsonBySd/refs/heads/DataStorage/';
const vocabularyBody = document.getElementById('vocabulary-body');
const lessonList = document.getElementById('lesson-list');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const menuIcon = document.getElementById('menu-icon');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const aboutIcon = document.getElementById('about-icon');
const aboutModal = document.getElementById('about-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const closeAboutBtn = document.getElementById('close-about-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const vocabularyModal = document.getElementById('vocabulary-modal');
const modalDetails = document.getElementById('modal-details');
const lessonNumberDisplay = document.getElementById('lesson-number');
const themeButtons = document.querySelectorAll('.theme-button');
const emailLink = document.getElementById('email-link');

const refreshButton = document.getElementById('refresh-button');
// নতুন: শেষ আপডেটের সময় দেখানোর জন্য এলিমেন্ট
const lastUpdatedDisplay = document.getElementById('last-updated-display');

let currentLesson = 1;
const totalLessons = 25;
const CACHE_KEY = 'minna_n5_cache';
const THEME_KEY = 'website_theme';
// নতুন: শেষ আপডেটের সময় সংরক্ষণ করার জন্য কী
const LAST_UPDATED_KEY = 'minna_n5_last_updated';

const themes = {
    theme1: { 
        '--gradient-start': '#0079b7',
        '--gradient-middle': '#00b796',
        '--gradient-end': '#00e0b7',
        '--primary-color': '#00b796',
        '--primary-dark': '#008f7b',
        'night-mode': false
    },
    theme2: { 
        '--gradient-start': '#e74c3c',
        '--gradient-middle': '#f39c12',
        '--gradient-end': '#f1c40f',
        '--primary-color': '#f39c12',
        '--primary-dark': '#d35400',
        'night-mode': false
    },
    theme3: { 
        '--gradient-start': '#34495e',
        '--gradient-middle': '#8e44ad',
        '--gradient-end': '#2c3e50',
        '--primary-color': '#8e44ad',
        '--primary-dark': '#6c3483',
        'night-mode': true
    },
    theme4: { 
        '--gradient-start': '#c0392b',
        '--gradient-middle': '#e74c3c',
        '--gradient-end': '#f1c40f',
        '--primary-color': '#e74c3c',
        '--primary-dark': '#c0392b',
        'night-mode': false
    }
};

function applyTheme(themeName) {
    const theme = themes[themeName];
    if (theme) {
        document.body.style.setProperty('--gradient-start', theme['--gradient-start']);
        document.body.style.setProperty('--gradient-middle', theme['--gradient-middle']);
        document.body.style.setProperty('--gradient-end', theme['--gradient-end']);
        document.body.style.setProperty('--primary-color', theme['--primary-color']);
        document.body.style.setProperty('--primary-dark', theme['--primary-dark']);
        
        if (theme['night-mode']) {
            document.body.classList.add('night-mode');
        } else {
            document.body.classList.remove('night-mode');
        }
        
        localStorage.setItem(THEME_KEY, themeName);
        
        themeButtons.forEach(btn => btn.classList.remove('active'));
        document.getElementById(themeName).classList.add('active');
    }
}

function playTextToSpeech(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        window.speechSynthesis.speak(utterance);
    } else {
        alert('দুঃখিত, আপনার ব্রাউজার Text-to-Speech সমর্থন করে না।');
    }
}

function showToast(message) {
    let toast = document.getElementById("toast-notification");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-notification";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = "show";
    setTimeout(() => {
        toast.className = toast.className.replace("show", "");
    }, 3000); 
}

function saveDataToCache(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        // ডেটা সেভ করার সময় শেষ আপডেটের সময়ও সেভ করা হচ্ছে
        localStorage.setItem(LAST_UPDATED_KEY, new Date().toISOString());
    } catch (e) {
        console.error("Error saving to local storage", e);
    }
}

function getDataFromCache() {
    try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        return cachedData ? JSON.parse(cachedData) : null;
    } catch (e) {
        console.error("Error retrieving from local storage", e);
        return null;
    }
}

// নতুন: শেষ আপডেটের সময়টি ডিসপ্লে করার ফাংশন
function updateLastUpdatedDisplay() {
    const lastUpdated = localStorage.getItem(LAST_UPDATED_KEY);
    if (lastUpdated) {
        const date = new Date(lastUpdated);
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        lastUpdatedDisplay.textContent = `Last Updated: ${date.toLocaleDateString('bn-BD', options)}`;
    } else {
        lastUpdatedDisplay.textContent = 'Last Updated: N/A';
    }
}

async function fetchAndRenderLesson(lessonNumber, forceUpdate = false) {
    vocabularyBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">ডেটা লোড হচ্ছে...</td></tr>';
    
    const cachedLessons = getDataFromCache();
    
    if (!forceUpdate && cachedLessons && cachedLessons[lessonNumber]) {
        console.log("Loading from cache...");
        const data = cachedLessons[lessonNumber];
        renderVocabularyTable(data.vocabulary);
        updateNavigationButtons(lessonNumber);
        updateSidebarActiveState(lessonNumber);
        lessonNumberDisplay.textContent = lessonNumber;
        return;
    } 

    console.log("Fetching from network...");
    try {
        const url = `${API_BASE_URL}lessons${lessonNumber}.json`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Lesson ${lessonNumber} data not found.`);
        }
        const data = await response.json();
        
        const updatedCache = cachedLessons || {};
        updatedCache[lessonNumber] = data;
        saveDataToCache(updatedCache);
        // সফল আপডেটের পর সময়টি ডিসপ্লে করা হচ্ছে
        updateLastUpdatedDisplay();

        renderVocabularyTable(data.vocabulary);
        updateNavigationButtons(lessonNumber);
        updateSidebarActiveState(lessonNumber);
        lessonNumberDisplay.textContent = lessonNumber;
        if (forceUpdate) {
            showToast("ডেটা সফলভাবে আপডেট হয়েছে!");
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        
        if (cachedLessons && cachedLessons[lessonNumber]) {
            console.log("Network fetch failed, loading old data from cache...");
            const data = cachedLessons[lessonNumber];
            renderVocabularyTable(data.vocabulary);
            updateNavigationButtons(lessonNumber);
            updateSidebarActiveState(lessonNumber);
            lessonNumberDisplay.textContent = lessonNumber;
            showToast("ইন্টারনেট সংযোগ নেই। পুরোনো ডেটা দেখানো হচ্ছে।");
        } else {
            vocabularyBody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">ডেটা লোড করা যায়নি। অনুগ্রহ করে ইন্টারনেট সংযোগ পরীক্ষা করুন।</td></tr>';
            showToast("ডেটা লোড করা যায়নি।");
        }
    }
}


function renderVocabularyTable(vocabulary) {
    vocabularyBody.innerHTML = '';
    vocabulary.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="col-id">${item.id}</td>
            <td class="col-emoji">${item.emoji}</td>
            <td class="col-jp">${item.japanese}</td>
            <td class="col-bn">${item.meaning}</td>
            <td class="col-pron">${item.pronunciation}</td>
        `;
        row.addEventListener('click', () => showVocabularyModal(item));
        vocabularyBody.appendChild(row);
    });
}

function showVocabularyModal(item) {
    modalDetails.innerHTML = `
        <div class="modal-title-wrapper">
            <h3><span class="emoji">${item.emoji}</span> <span class="gradient-text">${item.japanese}</span></h3>
            <i class="fa-solid fa-volume-up modal-audio-icon" data-text="${item.japanese}"></i>
        </div>
        <p style="font-style: italic; color: var(--light-text-color); margin-bottom: 5px;"><strong>উচ্চারণ:</strong> ${item.pronunciation}</p>
        <p style="color: var(--text-color); margin-bottom: 15px;"><strong>অর্থ:</strong> ${item.meaning}</p>
        <p style="font-size: 0.9em; color: var(--light-text-color); margin-bottom: 20px;"><strong>মন্তব্য:</strong> ${item.comment}</p>
        <hr style="border: 0; height: 1px; background-image: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0)); margin: 15px 0;">
        <p style="font-weight: bold; margin-bottom: 5px; color: var(--primary-color);">উদাহরণ:</p>
        <p style="margin-bottom: 5px;">${item.sentence.jp}</p>
        <p style="color: var(--text-color); margin-bottom: 5px;"><strong>বাংলা অনুবাদ:</strong> ${item.sentence.bn}</p>
        <p style="font-size: 0.9em; font-style: italic; color: var(--light-text-color);"><strong>উদাহরণ উচ্চারণ:</strong> ${item.sentence.pronunciation}</p>
    `;
    vocabularyModal.style.display = 'flex';

    const audioIcon = document.querySelector('.modal-audio-icon');
    if (audioIcon) {
        audioIcon.addEventListener('click', () => {
            const textToSpeak = audioIcon.dataset.text;
            playTextToSpeech(textToSpeak);
        });
    }
}

function updateNavigationButtons(lessonNumber) {
    prevBtn.style.display = lessonNumber > 1 ? 'inline-block' : 'none';
    nextBtn.style.display = lessonNumber < totalLessons ? 'inline-block' : 'none';
}

function updateSidebarActiveState(lessonNumber) {
    document.querySelectorAll('.lesson-list li').forEach(li => {
        li.classList.remove('active');
        if (parseInt(li.dataset.lesson) === lessonNumber) {
            li.classList.add('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'theme1';
    applyTheme(savedTheme);

    for (let i = 1; i <= totalLessons; i++) {
        const li = document.createElement('li');
        li.textContent = `Vocabulary অধ্যায় নং - ${String(i).padStart(2, '0')}`;
        li.dataset.lesson = i;
        li.addEventListener('click', () => {
            currentLesson = i;
            fetchAndRenderLesson(currentLesson);
            closeSidebar();
        });
        lessonList.appendChild(li);
    }
    fetchAndRenderLesson(currentLesson);
    // পেজ লোড হওয়ার সাথে সাথে শেষ আপডেটের সময় দেখানো হচ্ছে
    updateLastUpdatedDisplay();

    themeButtons.forEach(button => {
        button.addEventListener('click', () => {
            applyTheme(button.id);
        });
    });

    if (emailLink) {
        emailLink.addEventListener('click', (e) => {
            e.preventDefault(); 
            const email = emailLink.getAttribute('data-email');
            navigator.clipboard.writeText(email).then(() => {
                showToast("Email Copied!");
            }).catch(err => {
                console.error('Failed to copy email:', err);
            });
        });
    }

    if(refreshButton) {
        refreshButton.addEventListener('click', () => {
            fetchAndRenderLesson(currentLesson, true); 
        });
    }
});

prevBtn.addEventListener('click', () => {
    if (currentLesson > 1) {
        currentLesson--;
        fetchAndRenderLesson(currentLesson);
    }
});

nextBtn.addEventListener('click', () => {
    if (currentLesson < totalLessons) {
        currentLesson++;
        fetchAndRenderLesson(currentLesson);
    }
});

function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
}

menuIcon.addEventListener('click', openSidebar);
closeSidebarBtn.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

aboutIcon.addEventListener('click', () => {
    aboutModal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', () => {
    vocabularyModal.style.display = 'none';
});

closeAboutBtn.addEventListener('click', () => {
    aboutModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === vocabularyModal) {
        vocabularyModal.style.display = 'none';
    }
    if (event.target === aboutModal) {
        aboutModal.style.display = 'none';
    }
});
