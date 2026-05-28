/* =================================================
   TRLOY js/14-sync.js
   Firestore 동기화 — drafts · history
   ================================================= */

/* -------------------------------------------------
   API 키 — Firestore에서 불러와 자동 설정
   ------------------------------------------------- */
async function fetchAndSetApiKey() {
  if (!window.firebaseDb) return;

  try {
    const doc = await window.firebaseDb
      .collection('settings')
      .doc('config')
      .get();

    if (doc.exists) {
      const key = doc.data().anthropicKey;
      if (key && validateApiKeyFormat(key)) {
        setApiKey(key);
      }
    }
  } catch (err) {
    console.error('[sync] API 키 불러오기 실패:', err);
  }
}

/* -------------------------------------------------
   Drafts — 클라우드 → 로컬 병합
   ------------------------------------------------- */
async function syncDraftsFromCloud() {
  const user = getCurrentUser();
  if (!user || !window.firebaseDb) return;

  try {
    const snapshot = await window.firebaseDb
      .collection('drafts')
      .doc(user.uid)
      .collection('items')
      .orderBy('savedAt', 'desc')
      .limit(DRAFT_MAX_SLOTS)
      .get();

    if (snapshot.empty) return;

    const cloudDrafts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const localDrafts = getDrafts();
    const merged      = _mergeDrafts(localDrafts, cloudDrafts);

    localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(merged));
    renderDraftList();
    showToast('클라우드에서 저장 목록을 불러왔어요.');
  } catch (err) {
    console.error('[sync] 드래프트 불러오기 실패:', err);
  }
}

function _mergeDrafts(local, cloud) {
  const map = new Map();
  // 최신 savedAt 우선
  [...local, ...cloud].forEach(d => {
    const existing = map.get(d.id);
    if (!existing || new Date(d.savedAt) > new Date(existing.savedAt)) {
      map.set(d.id, d);
    }
  });
  return Array.from(map.values())
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
    .slice(0, DRAFT_MAX_SLOTS);
}

/* -------------------------------------------------
   Drafts — 로컬 → 클라우드 push
   ------------------------------------------------- */
async function pushDraftToCloud(draft) {
  const user = getCurrentUser();
  if (!user || !window.firebaseDb) return;

  try {
    await window.firebaseDb
      .collection('drafts')
      .doc(user.uid)
      .collection('items')
      .doc(draft.id)
      .set(draft);
  } catch (err) {
    console.error('[sync] 드래프트 저장 실패:', err);
  }
}

/* -------------------------------------------------
   Drafts — 클라우드에서 삭제
   ------------------------------------------------- */
async function deleteDraftFromCloud(id) {
  const user = getCurrentUser();
  if (!user || !window.firebaseDb) return;

  try {
    await window.firebaseDb
      .collection('drafts')
      .doc(user.uid)
      .collection('items')
      .doc(id)
      .delete();
  } catch (err) {
    console.error('[sync] 드래프트 삭제 실패:', err);
  }
}

/* -------------------------------------------------
   History — 분석 기록 저장
   ------------------------------------------------- */
async function saveHistoryEntry(inputs, result) {
  const user = getCurrentUser();
  if (!user || !window.firebaseDb) return;

  try {
    let id;
    try { id = crypto.randomUUID(); }
    catch { id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

    const entry = {
      id,
      createdAt: new Date().toISOString(),
      urls:             inputs?.urls ?? [],
      naturalLanguage:  inputs?.naturalLanguage || '',
      imageCount:       inputs?.images?.length ?? 0,
      vibeTitle:        result?.visualTheme?.title || '',
      vibeKeywords:     result?.visualTheme?.keywords ?? [],
      primaryColors:    (result?.colorPalette?.colors ?? []).slice(0, 3).map(c => c.hex),
    };

    await window.firebaseDb
      .collection('history')
      .doc(user.uid)
      .collection('items')
      .doc(id)
      .set(entry);
  } catch (err) {
    console.error('[sync] 히스토리 저장 실패:', err);
  }
}
